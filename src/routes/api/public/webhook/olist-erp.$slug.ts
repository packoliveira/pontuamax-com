import { createFileRoute } from "@tanstack/react-router";

// Webhook nativo do Olist ERP (app "Webhooks" -> "Receber notificações de vendas").
// URL a colar no painel do Olist ERP:
//   https://retail-rewards.lovable.app/api/public/webhook/olist-erp/{slug}?secret={webhook_secret}
//
// O Olist ERP só permite configurar a URL (sem headers/secret extra),
// por isso a autenticação vai via query param `?secret=` e a loja é
// identificada pelo `{slug}` na URL.
//
// Payload esperado (formato nativo do Olist ERP):
// {
//   "evento": "atualizacao_situacao_pedido",
//   "pedidos": [{
//     "id": 789456,
//     "numero": "12345",
//     "situacao_anterior": "aprovado",
//     "situacao_atual": "faturado" | "cancelado" | ...,
//     "cliente": { "nome": "...", "cpf_cnpj": "...", "telefone": "..." },
//     "valor_total": 1599.90
//   }]
// }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const isCredito = (situacao: string) =>
  situacao === "faturado" || situacao === "aprovado";
const isCancelado = (situacao: string) => situacao === "cancelado";

export const Route = createFileRoute("/api/public/webhook/olist-erp/$slug")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request, params }) => {
        const slug = String(params.slug ?? "").toLowerCase();
        const url = new URL(request.url);
        const secret = url.searchParams.get("secret") ?? "";

        const raw = await request.text();
        let payload: Record<string, unknown> = {};
        try {
          payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const storeRes = await supabaseAdmin.from("stores").select("*").eq("slug", slug).maybeSingle();
        const loja = storeRes.data;
        if (!loja) return json({ error: "loja não encontrada" }, 404);
        if (!secret || secret !== loja.webhook_secret) {
          await supabaseAdmin.from("integration_logs").insert({
            store_id: loja.id,
            origem: "olist-erp",
            payload_recebido: payload as never,
            status: "erro",
            mensagem_erro: "segredo inválido",
          });
          return json({ error: "segredo inválido" }, 401);
        }

        const pedidos = Array.isArray(payload.pedidos) ? (payload.pedidos as Array<Record<string, unknown>>) : [];
        if (pedidos.length === 0) {
          // Muitos webhooks do Olist ERP podem chegar sem pedidos (ex: teste). Responde 200 mesmo assim.
          return json({ status: "sucesso", message: "sem pedidos no payload", processados: 0 });
        }

        const resultados: Array<Record<string, unknown>> = [];

        for (const pedido of pedidos) {
          const idPedido = String(pedido.id ?? pedido.numero ?? "").trim();
          const situacao = String(pedido.situacao_atual ?? "").toLowerCase().trim();
          const valor = Number(pedido.valor_total ?? 0);
          const cliente = (pedido.cliente ?? {}) as Record<string, unknown>;
          const telefone = String(cliente.telefone ?? "").replace(/\D/g, "");
          const cpf = String(cliente.cpf_cnpj ?? "").replace(/\D/g, "");
          const nome = String(cliente.nome ?? "").trim() || "Cliente";

          const skipLog = async (mensagem: string) => {
            await supabaseAdmin.from("integration_logs").insert({
              store_id: loja.id,
              origem: "olist-erp",
              payload_recebido: pedido as never,
              status: "erro",
              mensagem_erro: mensagem,
            });
            resultados.push({ id_pedido: idPedido, situacao, skipped: mensagem });
          };

          if (!idPedido) { await skipLog("pedido sem id"); continue; }

          // ============= CANCELAMENTO / ESTORNO =============
          if (isCancelado(situacao)) {
            const idExterno = `olist:${idPedido}`;
            const idEstorno = `${idExterno}:estorno`;

            // Já estornado?
            const jaEstornado = await supabaseAdmin
              .from("transactions")
              .select("id")
              .eq("store_id", loja.id)
              .eq("id_venda_externa", idEstorno)
              .maybeSingle();
            if (jaEstornado.data) {
              resultados.push({ id_pedido: idPedido, situacao, message: "já estornado" });
              continue;
            }

            // Busca a venda original
            const vendaOrig = await supabaseAdmin
              .from("transactions")
              .select("*")
              .eq("store_id", loja.id)
              .eq("id_venda_externa", idExterno)
              .eq("tipo", "venda")
              .maybeSingle();
            if (!vendaOrig.data) {
              await skipLog(`venda ${idExterno} não encontrada para estorno`);
              continue;
            }

            const linkOrig = await supabaseAdmin
              .from("store_clients")
              .select("*")
              .eq("store_id", loja.id)
              .eq("user_id", vendaOrig.data.client_user_id)
              .maybeSingle();
            if (!linkOrig.data) { await skipLog("cliente da venda não vinculado à loja"); continue; }

            const pontosEstorno = -Number(vendaOrig.data.pontos_delta ?? 0);
            const cashbackEstorno = -Number(vendaOrig.data.cashback_delta ?? 0);
            const novoPontos = Math.max(0, linkOrig.data.pontos + pontosEstorno);
            const novoCashback = Math.max(0, Math.round((Number(linkOrig.data.cashback_saldo) + cashbackEstorno) * 100) / 100);
            const nivel = novoPontos <= 100 ? "bronze" : novoPontos <= 300 ? "prata" : "ouro";

            const tx = await supabaseAdmin.from("transactions").insert({
              store_id: loja.id,
              client_user_id: vendaOrig.data.client_user_id,
              tipo: "ajuste",
              valor: -Number(vendaOrig.data.valor ?? 0),
              pontos_delta: pontosEstorno,
              cashback_delta: cashbackEstorno,
              status: "entregue",
              id_venda_externa: idEstorno,
              origem: "olist-erp",
            });
            if (tx.error) { await skipLog(`falha ao inserir estorno: ${tx.error.message}`); continue; }

            const upd = await supabaseAdmin
              .from("store_clients")
              .update({ pontos: novoPontos, cashback_saldo: novoCashback, nivel })
              .eq("id", linkOrig.data.id);
            if (upd.error) { await skipLog(`falha ao atualizar saldo no estorno: ${upd.error.message}`); continue; }

            await supabaseAdmin.from("integration_logs").insert({
              store_id: loja.id,
              origem: "olist-erp",
              payload_recebido: pedido as never,
              status: "sucesso",
              mensagem_erro: null,
            });
            resultados.push({
              id_pedido: idPedido,
              situacao,
              pontos_estornados: pontosEstorno,
              cashback_estornado: cashbackEstorno,
              novo_saldo_pontos: novoPontos,
            });
            continue;
          }

          // ============= CRÉDITO (venda concluída) =============
          if (!isCredito(situacao)) {
            // Situações intermediárias (aberto, em separação, enviado, etc.) — ignoradas silenciosamente
            resultados.push({ id_pedido: idPedido, situacao, message: "situação ignorada" });
            continue;
          }

          if (!Number.isFinite(valor) || valor <= 0) { await skipLog("valor_total inválido"); continue; }
          if (!telefone || telefone.length < 8) { await skipLog("telefone do cliente ausente"); continue; }
          if (cpf && cpf.length !== 11 && cpf.length !== 14) { await skipLog("cpf_cnpj inválido"); continue; }

          const idExterno = `olist:${idPedido}`;

          const dup = await supabaseAdmin
            .from("transactions")
            .select("id")
            .eq("store_id", loja.id)
            .eq("id_venda_externa", idExterno)
            .maybeSingle();
          if (dup.data) {
            resultados.push({ id_pedido: idPedido, situacao, message: "já processado" });
            continue;
          }

          // Busca/cria cliente pela identidade telefone; fallback CPF
          let clientProfile: { id: string } | null = null;
          {
            const p = await supabaseAdmin.from("profiles").select("id").eq("phone", telefone).maybeSingle();
            if (p.data) clientProfile = p.data;
          }
          if (!clientProfile && cpf && cpf.length === 11) {
            const p = await supabaseAdmin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
            if (p.data) clientProfile = p.data;
          }
          if (!clientProfile) {
            // Este fluxo (Olist ERP polling) usa telefone como identidade
            // porque nem sempre o CPF vem no pedido. Delega a montagem do
            // e-mail sintético para o helper compartilhado (mesmo domínio
            // de cpfToEmail) — nunca reconstruir a string aqui.
            const email = phoneToEmail(telefone);
            const created = await supabaseAdmin.auth.admin.createUser({
              email,
              password: telefone,
              email_confirm: true,
              user_metadata: { full_name: nome, phone: telefone, cpf: cpf && cpf.length === 11 ? cpf : null },
            });
            if (created.error || !created.data.user) {
              await skipLog(`falha criando cliente: ${created.error?.message ?? "?"}`);
              continue;
            }
            clientProfile = { id: created.data.user.id };
            await supabaseAdmin.from("profiles").upsert({
              id: clientProfile.id,
              full_name: nome,
              phone: telefone,
              cpf: cpf && cpf.length === 11 ? cpf : null,
            });
            await supabaseAdmin
              .from("user_roles")
              .upsert({ user_id: clientProfile.id, role: "cliente" as const }, { onConflict: "user_id,role" });
          }

          const linkRes = await supabaseAdmin
            .from("store_clients")
            .upsert({ store_id: loja.id, user_id: clientProfile.id }, { onConflict: "store_id,user_id" })
            .select("*")
            .single();
          if (linkRes.error) { await skipLog(linkRes.error.message); continue; }
          const link = linkRes.data;

          const inclP = loja.modalidade !== "cashback";
          const inclC = loja.modalidade !== "pontos";
          const pontos = inclP ? Math.floor(valor * Number(loja.regra_pontos)) : 0;
          const cashback = inclC ? Math.round(valor * Number(loja.percentual_cashback)) / 100 : 0;
          const novoPontos = link.pontos + pontos;
          const novoCashback = Math.round((Number(link.cashback_saldo) + cashback) * 100) / 100;
          const nivel = novoPontos <= 100 ? "bronze" : novoPontos <= 300 ? "prata" : "ouro";

          const tx = await supabaseAdmin.from("transactions").insert({
            store_id: loja.id,
            client_user_id: clientProfile.id,
            tipo: "venda",
            valor,
            pontos_delta: pontos,
            cashback_delta: cashback,
            status: "entregue",
            id_venda_externa: idExterno,
            origem: "olist-erp",
          });
          if (tx.error) { await skipLog(tx.error.message); continue; }

          const upd = await supabaseAdmin
            .from("store_clients")
            .update({ pontos: novoPontos, cashback_saldo: novoCashback, nivel })
            .eq("id", link.id);
          if (upd.error) { await skipLog(upd.error.message); continue; }

          if (pontos > 0) {
            const { notifyClient } = await import("@/lib/notify.server");
            await notifyClient({
              event: "pontos_ganhos",
              storeId: loja.id,
              clientUserId: clientProfile.id,
              pontosGanhos: pontos,
            });
          }

          await supabaseAdmin.from("integration_logs").insert({
            store_id: loja.id,
            origem: "olist-erp",
            payload_recebido: pedido as never,
            status: "sucesso",
            mensagem_erro: null,
          });
          await supabaseAdmin.from("stores").update({ webhook_last_at: new Date().toISOString() }).eq("id", loja.id);

          resultados.push({
            id_pedido: idPedido,
            situacao,
            pontos_creditados: pontos,
            cashback_creditado: cashback,
            novo_saldo_pontos: novoPontos,
          });
        }

        return json({ status: "sucesso", processados: resultados.length, resultados });
      },
    },
  },
});