import { createFileRoute } from "@tanstack/react-router";
import { cpfToEmail } from "@/lib/qsf-shared";
import { randomBytes } from "crypto";

// Webhook oficial Olist Tiny API V3.
// URL a registrar no aplicativo Olist:
//   https://pontuamax.com/api/public/webhook/olist/v3
// A assinatura HMAC-SHA256 do body cru deve vir no header `X-Olist-Signature`.
// A rota identifica a loja pela credencial OAuth cujo `account_id` corresponde
// ao contido no payload.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type SituacaoAcao = "credito" | "estorno" | "ignorar";
function classificarSituacao(s: string): SituacaoAcao {
  const v = s.toLowerCase();
  if (v === "faturado" || v === "aprovado" || v === "concluido") return "credito";
  if (v === "cancelado") return "estorno";
  return "ignorar";
}

export const Route = createFileRoute("/api/public/webhook/olist/v3")({
  server: {
    handlers: {
      GET: async () => json({ status: "ok", endpoint: "olist v3" }),
      POST: async ({ request }) => {
        // Rate limit: 60 req/min por IP.
        const { checkRateLimit, getClientIp } = await import("@/lib/rate-limit.server");
        const ip = getClientIp(request);
        const allowed = await checkRateLimit(`webhook-v3:${ip}`, 60, 60);
        if (!allowed) return json({ error: "rate_limited" }, 429);

        const raw = await request.text();
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // 1) Assinatura
        const sigHeader =
          request.headers.get("x-olist-signature") ?? request.headers.get("x-signature") ?? null;
        const { verifyWebhookSignature, refreshAccessToken, fetchPedido } =
          await import("@/lib/olist.server");
        const valid = verifyWebhookSignature(raw, sigHeader);
        if (!valid) {
          await supabaseAdmin.from("erp_webhook_events").insert({
            provider: "olist_v3",
            evento: "unknown",
            resource_id: "unknown",
            signature: sigHeader,
            signature_valid: false,
            status: "rejected",
            payload: raw
              ? (() => {
                  try {
                    return JSON.parse(raw);
                  } catch {
                    return { raw };
                  }
                })()
              : null,
            error_message: "assinatura inválida",
          });
          return json({ error: "assinatura inválida" }, 401);
        }

        // 2) Parse
        let payload: Record<string, unknown> = {};
        try {
          payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        const evento = String(payload.tipo ?? payload.evento ?? "").trim() || "unknown";
        const dados = (payload.dados as Record<string, unknown>) ?? payload;
        const resourceId = String(
          (dados.id as string | number | undefined) ??
            (dados.pedidoId as string | number | undefined) ??
            (payload.id as string | number | undefined) ??
            "",
        ).trim();
        const accountId = String(
          (payload.accountId as string | undefined) ??
            (payload.account_id as string | undefined) ??
            (dados.accountId as string | undefined) ??
            "",
        ).trim();

        if (!resourceId) return json({ error: "resource_id ausente" }, 400);
        if (!accountId) return json({ error: "accountId ausente" }, 400);

        // 3) Loja pela credencial (account_id)
        const credRes = await supabaseAdmin
          .from("erp_credentials")
          .select("*, stores(*)")
          .eq("provider", "olist_v3")
          .eq("account_id", accountId)
          .maybeSingle();
        if (!credRes.data) return json({ error: "loja não conectada" }, 404);
        const cred = credRes.data as Record<string, unknown> & { stores: Record<string, unknown> };
        const loja = cred.stores as Record<string, unknown> & {
          id: string;
          modalidade: string;
          regra_pontos: number;
          percentual_cashback: number;
        };

        // 4) Idempotência
        const eventInsert = await supabaseAdmin
          .from("erp_webhook_events")
          .insert({
            store_id: loja.id,
            provider: "olist_v3",
            evento,
            resource_id: resourceId,
            signature: sigHeader,
            signature_valid: true,
            status: "received",
            payload: payload as never,
          })
          .select("id")
          .maybeSingle();
        if (eventInsert.error) {
          if (eventInsert.error.code === "23505") {
            return json({ status: "duplicado", message: "evento já processado" });
          }
          return json({ error: eventInsert.error.message }, 500);
        }

        // 5) Refresh se necessário
        let accessToken = cred.access_token as string;
        const expiresAt = new Date(cred.expires_at as string).getTime();
        if (Date.now() > expiresAt - 60_000) {
          try {
            const refreshed = await refreshAccessToken(cred.refresh_token as string);
            accessToken = refreshed.access_token;
            await supabaseAdmin
              .from("erp_credentials")
              .update({
                access_token: refreshed.access_token,
                refresh_token: refreshed.refresh_token,
                expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
                last_refresh_at: new Date().toISOString(),
                status: "connected",
              })
              .eq("id", cred.id as string);
          } catch (e) {
            await supabaseAdmin
              .from("erp_credentials")
              .update({ status: "expired" })
              .eq("id", cred.id as string);
            return json({ error: `refresh falhou: ${(e as Error).message}` }, 500);
          }
        }

        // 6) Buscar pedido completo
        let pedido: Record<string, unknown>;
        try {
          pedido = await fetchPedido(accessToken, resourceId);
        } catch (e) {
          await supabaseAdmin
            .from("erp_webhook_events")
            .update({
              status: "error",
              error_message: (e as Error).message,
            })
            .eq("id", eventInsert.data!.id);
          return json({ error: (e as Error).message }, 502);
        }

        const pedidoData = (pedido.pedido as Record<string, unknown>) ?? pedido;
        const situacao = String(
          (pedidoData.situacao as string | undefined) ??
            ((pedidoData.situacao as Record<string, unknown> | undefined)?.descricao as
              | string
              | undefined) ??
            "",
        )
          .trim()
          .toLowerCase();
        const acao = classificarSituacao(situacao);

        if (acao === "ignorar") {
          await supabaseAdmin
            .from("erp_webhook_events")
            .update({
              status: "ignored",
              processed_at: new Date().toISOString(),
            })
            .eq("id", eventInsert.data!.id);
          return json({ status: "ignorado", situacao });
        }

        const valor = Number(
          (pedidoData.valor as number | undefined) ?? (pedidoData.total as number | undefined) ?? 0,
        );
        const cliente = (pedidoData.cliente as Record<string, unknown>) ?? {};
        const cpf = String(
          (cliente.cpfCnpj as string | undefined) ?? (cliente.cpf_cnpj as string | undefined) ?? "",
        ).replace(/\D/g, "");
        const telefone = String(
          (cliente.telefone as string | undefined) ?? (cliente.fone as string | undefined) ?? "",
        ).replace(/\D/g, "");
        const nome = String((cliente.nome as string | undefined) ?? "").trim() || "Cliente";

        const idExterno = `olist:${resourceId}`;

        // ---------- ESTORNO ----------
        if (acao === "estorno") {
          const idEstorno = `${idExterno}:estorno`;
          const jaEst = await supabaseAdmin
            .from("transactions")
            .select("id")
            .eq("store_id", loja.id)
            .eq("id_venda_externa", idEstorno)
            .maybeSingle();
          if (jaEst.data) {
            await supabaseAdmin
              .from("erp_webhook_events")
              .update({
                status: "duplicated",
                processed_at: new Date().toISOString(),
              })
              .eq("id", eventInsert.data!.id);
            return json({ status: "já estornado" });
          }
          const vOrig = await supabaseAdmin
            .from("transactions")
            .select("*")
            .eq("store_id", loja.id)
            .eq("id_venda_externa", idExterno)
            .eq("tipo", "venda")
            .maybeSingle();
          if (!vOrig.data) return json({ error: "venda original não encontrada" }, 404);
          const lOrig = await supabaseAdmin
            .from("store_clients")
            .select("*")
            .eq("store_id", loja.id)
            .eq("user_id", vOrig.data.client_user_id)
            .maybeSingle();
          if (!lOrig.data) return json({ error: "cliente não vinculado" }, 404);
          const pE = -Number(vOrig.data.pontos_delta ?? 0);
          const cE = -Number(vOrig.data.cashback_delta ?? 0);
          const novoP = Math.max(0, lOrig.data.pontos + pE);
          const novoC = Math.max(
            0,
            Math.round((Number(lOrig.data.cashback_saldo) + cE) * 100) / 100,
          );
          const nivel = novoP <= 100 ? "bronze" : novoP <= 300 ? "prata" : "ouro";
          await supabaseAdmin.from("transactions").insert({
            store_id: loja.id,
            client_user_id: vOrig.data.client_user_id,
            tipo: "ajuste",
            valor: -Number(vOrig.data.valor ?? 0),
            pontos_delta: pE,
            cashback_delta: cE,
            status: "entregue",
            id_venda_externa: idEstorno,
            origem: "olist",
          });
          await supabaseAdmin
            .from("store_clients")
            .update({ pontos: novoP, cashback_saldo: novoC, nivel })
            .eq("id", lOrig.data.id);
          await supabaseAdmin
            .from("erp_webhook_events")
            .update({
              status: "processed",
              processed_at: new Date().toISOString(),
            })
            .eq("id", eventInsert.data!.id);
          return json({ status: "estornado", pontos: pE, cashback: cE });
        }

        // ---------- CRÉDITO ----------
        if (!Number.isFinite(valor) || valor <= 0) return json({ error: "valor inválido" }, 400);
        if (!cpf || cpf.length !== 11) return json({ error: "cpf ausente/ inválido" }, 400);

        // idempotência por venda
        const dup = await supabaseAdmin
          .from("transactions")
          .select("id")
          .eq("store_id", loja.id)
          .eq("id_venda_externa", idExterno)
          .maybeSingle();
        if (dup.data) {
          await supabaseAdmin
            .from("erp_webhook_events")
            .update({
              status: "duplicated",
              processed_at: new Date().toISOString(),
            })
            .eq("id", eventInsert.data!.id);
          return json({ status: "duplicado" });
        }

        // cliente por CPF; senão cria com senha aleatória (não previsível)
        let clientProfile: { id: string } | null = null;
        {
          const p = await supabaseAdmin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
          if (p.data) clientProfile = p.data;
        }
        let justCreated = false;
        if (!clientProfile) {
          const email = cpfToEmail(cpf);
          const password = randomBytes(24).toString("hex");
          const created = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: nome, phone: telefone || null, cpf },
          });
          if (created.error || !created.data.user)
            return json({ error: `criar cliente: ${created.error?.message}` }, 500);
          clientProfile = { id: created.data.user.id };
          justCreated = true;
          await supabaseAdmin.from("profiles").upsert({
            id: clientProfile.id,
            full_name: nome,
            phone: telefone || null,
            cpf,
          });
          await supabaseAdmin
            .from("user_roles")
            .upsert(
              { user_id: clientProfile.id, role: "cliente" as const },
              { onConflict: "user_id,role" },
            );
        }

        const linkRes = await supabaseAdmin
          .from("store_clients")
          .upsert(
            {
              store_id: loja.id,
              user_id: clientProfile.id,
              ...(justCreated ? { pending_registration: true } : {}),
            },
            { onConflict: "store_id,user_id" },
          )
          .select("*")
          .single();
        if (linkRes.error) return json({ error: linkRes.error.message }, 500);
        const link = linkRes.data;

        const inclP = loja.modalidade !== "cashback";
        const inclC = loja.modalidade !== "pontos";
        const pontos = inclP ? Math.floor(valor * Number(loja.regra_pontos)) : 0;
        const cashback = inclC ? Math.round(valor * Number(loja.percentual_cashback)) / 100 : 0;
        const novoP = link.pontos + pontos;
        const novoC = Math.round((Number(link.cashback_saldo) + cashback) * 100) / 100;
        const nivel = novoP <= 100 ? "bronze" : novoP <= 300 ? "prata" : "ouro";

        const tx = await supabaseAdmin.from("transactions").insert({
          store_id: loja.id,
          client_user_id: clientProfile.id,
          tipo: "venda",
          valor,
          pontos_delta: pontos,
          cashback_delta: cashback,
          status: "entregue",
          id_venda_externa: idExterno,
          origem: "olist",
        });
        if (tx.error) {
          if (tx.error.code === "23505") return json({ status: "duplicado" });
          return json({ error: tx.error.message }, 500);
        }
        await supabaseAdmin
          .from("store_clients")
          .update({ pontos: novoP, cashback_saldo: novoC, nivel })
          .eq("id", link.id);
        await supabaseAdmin
          .from("stores")
          .update({ webhook_last_at: new Date().toISOString() })
          .eq("id", loja.id);

        if (pontos > 0) {
          const { notifyClient } = await import("@/lib/notify.server");
          await notifyClient({
            event: "pontos_ganhos",
            storeId: loja.id,
            clientUserId: clientProfile.id,
            pontosGanhos: pontos,
          });
        }

        await supabaseAdmin
          .from("erp_webhook_events")
          .update({
            status: "processed",
            processed_at: new Date().toISOString(),
          })
          .eq("id", eventInsert.data!.id);

        return json({ status: "processado", pontos, cashback, novo_saldo_pontos: novoP });
      },
    },
  },
});
