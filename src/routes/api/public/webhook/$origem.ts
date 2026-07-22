import { createFileRoute } from "@tanstack/react-router";
import { cpfToEmail } from "@/lib/qsf-shared";
import { timingSafeEqual, randomBytes } from "crypto";
import {
  extractOlistPayload,
  shouldProcessOlistEvent,
  computeRewards,
} from "@/lib/olist-webhook";

// Public webhook endpoint for external POS/ERP integrations (Bling, Olist).
// URL: /api/public/webhook/{bling|olist}
// Auth: header `x-qsf-secret` MUST match the store's `webhook_secret`.
//       The store is identified by header `x-qsf-store` (loja slug OR uuid)
//       or by field `store_slug` / `store_id` in the JSON body.
//
// Aceita 2 formatos de payload:
//
// 1) Formato simples (nosso, para testes/integrações custom):
// {
//   "id_venda_externa": "12345",
//   "valor": 199.90,
//   "cpf_cliente": "12345678900",     // CPF OU telefone (pelo menos um)
//   "telefone_cliente": "11999999999",
//   "nome_cliente": "Fulano"
// }
//
// 2) Formato nativo Olist ERP (pedido de venda):
//    { "pedido": { "numero", "total", "cliente": { "nome", "documento", "fones":[{"fone"}] } } }
//    ou com envelope { "data": { ... } } / { "resource": "...", "data": {...} }

const CORS = {
  // Webhooks não são chamados por browsers; mantemos apenas o mínimo para
  // ferramentas de teste (curl/Postman não precisam de CORS).
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-qsf-secret, x-qsf-store",
};
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export const Route = createFileRoute("/api/public/webhook/$origem")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => json({ status: "ok", message: "PontuaMax webhook endpoint ativo" }, 200),
      HEAD: async () => new Response(null, { status: 200, headers: CORS }),
      POST: async ({ request, params }) => {
        const origem = String(params.origem).toLowerCase();
        if (!["olist", "tiny", "bling", "teste"].includes(origem)) {
          return json({ error: "origem inválida (use olist|tiny|bling|teste)" }, 404);
        }

        // Rate limit: 60 req/min por IP nesta rota pública.
        const { checkRateLimit, getClientIp } = await import("@/lib/rate-limit.server");
        const ip = getClientIp(request);
        const allowed = await checkRateLimit(`webhook:${origem}:${ip}`, 60, 60);
        if (!allowed) {
          return json(
            { error: "Muitas tentativas, aguarde um minuto e tente novamente." },
            429,
          );
        }

        const raw = await request.text();
        let payload: Record<string, unknown> = {};
        try {
          payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        // Olist ERP only accepts a URL (no custom headers), so we also accept
        // store/secret via query string: ?store=<slug>&secret=<key>
        const url = new URL(request.url);
        const storeHeader =
          request.headers.get("x-qsf-store") ??
          url.searchParams.get("store") ??
          url.searchParams.get("loja") ??
          (payload.store_slug as string | undefined) ??
          (payload.store_id as string | undefined) ??
          "";
        const secret =
          request.headers.get("x-qsf-secret") ??
          url.searchParams.get("secret") ??
          url.searchParams.get("token") ??
          "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Locate store by uuid or slug
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          storeHeader,
        );
        const q = supabaseAdmin.from("stores").select("*");
        const storeRes = await (
          isUuid ? q.eq("id", storeHeader) : q.eq("slug", storeHeader)
        ).maybeSingle();
        const loja = storeRes.data;
        if (!loja) return json({ error: "loja não encontrada" }, 404);

        // Fetch webhook secret from the isolated secrets table.
        const { getStoreSecrets } = await import("@/lib/store-secrets.server");
        const storeSecrets = await getStoreSecrets(loja.id);

        const logAndRespond = async (
          status: "sucesso" | "erro",
          message: string,
          httpStatus: number,
          extra: Record<string, unknown> = {},
        ) => {
          await supabaseAdmin.from("integration_logs").insert({
            store_id: loja.id,
            origem,
            payload_recebido: payload as never,
            status,
            mensagem_erro: status === "erro" ? message : null,
          });
          if (status === "sucesso") {
            await supabaseAdmin
              .from("stores")
              .update({ webhook_last_at: new Date().toISOString() })
              .eq("id", loja.id);
          }
          return json({ status, message, ...extra }, httpStatus);
        };

        if (!secret || !safeEqual(secret, storeSecrets.webhook_secret ?? "")) {
          return logAndRespond("erro", "segredo inválido", 401);
        }

        // Some ERP panels validate the webhook by sending a POST without a sale body.
        // Treat an authenticated empty POST as a successful connectivity test.
        if (!raw || Object.keys(payload).length === 0) {
          return logAndRespond("sucesso", "webhook validado", 200, { validation: true });
        }

        const extracted = extractOlistPayload(payload);
        const { idVenda, cpf, telefone, nome, tipoEvento } = extracted;
        let valor = extracted.valor;

        if (!idVenda)
          return logAndRespond("erro", "id do pedido é obrigatório (numero/id_venda_externa)", 400);

        // Filtro por tipo de evento: só creditamos em "faturamento_pedido".
        // Notificações leves (inclusao_pedido, alteracao_pedido) chegam antes
        // do pedido virar venda efetiva — respondemos 200 e não pontuamos.
        const gate = shouldProcessOlistEvent(origem, tipoEvento);
        if (!gate.process) {
          return logAndRespond("sucesso", gate.reason ?? "evento ignorado", 200, {
            ignored_event: tipoEvento,
          });
        }

        if (!cpf) {
          return logAndRespond(
            "erro",
            "cpf_cliente é obrigatório (11 dígitos) — a integração deve enviar sempre o CPF do comprador para evitar cadastros duplicados",
            400,
          );
        }
        if (cpf.length !== 11) return logAndRespond("erro", "CPF deve ter 11 dígitos", 400);
        if (telefone && telefone.length < 8) return logAndRespond("erro", "telefone inválido", 400);

        // Idempotência: mesma venda já processada?
        const dup = await supabaseAdmin
          .from("transactions")
          .select("id")
          .eq("store_id", loja.id)
          .eq("id_venda_externa", idVenda)
          .maybeSingle();
        if (dup.data)
          return logAndRespond("sucesso", "venda já processada (idempotente)", 200, {
            duplicated: true,
          });

        // Busca cliente: 1º por CPF (mais confiável), depois por telefone.
        let clientProfile: { id: string } | null = null;
        let clientJustCreated = false;
        if (cpf) {
          const p = await supabaseAdmin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
          if (p.data) clientProfile = p.data;
        }
        if (!clientProfile && telefone) {
          const p = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("phone", telefone)
            .maybeSingle();
          if (p.data) clientProfile = p.data;
        }
        if (!clientProfile) {
          // Email sintético SEMPRE derivado do CPF (fonte única de identidade).
          // Usar cpfToEmail garante o mesmo domínio de todos os outros fluxos
          // (auto-cadastro do cliente, login por CPF, lançamento manual),
          // evitando que o mesmo CPF vire duas contas diferentes.
          const email = cpfToEmail(cpf);
          // Senha aleatória — o cliente completa cadastro pelo /cadastro
          // e define a própria senha via signup. Nunca deixe a senha
          // ser derivada de CPF/telefone (facilmente adivinhável).
          const password = randomBytes(24).toString("hex");
          const created = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: nome, phone: telefone || null, cpf: cpf || null },
          });
          if (created.error || !created.data.user) {
            return logAndRespond(
              "erro",
              `falha criando cliente: ${created.error?.message ?? "?"}`,
              500,
            );
          }
          clientProfile = { id: created.data.user.id };
          clientJustCreated = true;
          await supabaseAdmin.from("profiles").upsert({
            id: clientProfile.id,
            full_name: nome,
            phone: telefone || null,
            cpf: cpf || null,
          });
          await supabaseAdmin
            .from("user_roles")
            .upsert(
              { user_id: clientProfile.id, role: "cliente" as const },
              { onConflict: "user_id,role" },
            );
        }

        // Vincula à loja (upsert)
        const linkRes = await supabaseAdmin
          .from("store_clients")
          .upsert(
            {
              store_id: loja.id,
              user_id: clientProfile.id,
              // Marca como "cadastro pendente" só quando é vínculo/cliente novo,
              // para o lojista visualizar quem entrou por venda automática e
              // ainda não completou o próprio cadastro. Vendas subsequentes do
              // mesmo cliente não devem reabrir esse status.
              ...(clientJustCreated ? { pending_registration: true } : {}),
            },
            { onConflict: "store_id,user_id", ignoreDuplicates: false },
          )
          .select("*")
          .single();
        if (linkRes.error) return logAndRespond("erro", linkRes.error.message, 500);
        const link = linkRes.data;

        if (!Number.isFinite(valor) || valor <= 0) {
          // Olist envia notificações leves (inclusao_pedido, alteracao_pedido)
          // sem o total no payload. Como o lojista NÃO emite NF-e, não vai
          // vir um faturamento_pedido depois — precisamos buscar o total via
          // API Tiny/Olist V2 usando o token global OLIST_API_TOKEN.
          const token = process.env.OLIST_API_TOKEN;
          let valorApi = 0;
          let apiErr = "";
          if (token && idVenda) {
            try {
              const form = new URLSearchParams({
                token,
                id: idVenda,
                formato: "json",
              });
              const resp = await fetch("https://api.tiny.com.br/api2/pedido.obter.php", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: form.toString(),
              });
              const j = (await resp.json()) as {
                retorno?: {
                  status?: string;
                  pedido?: {
                    total_pedido?: string | number;
                    valor?: string | number;
                  };
                  erros?: Array<{ erro?: string }>;
                };
              };
              const ped = j.retorno?.pedido;
              const raw = ped?.total_pedido ?? ped?.valor ?? 0;
              valorApi = typeof raw === "string" ? Number(raw.replace(",", ".")) : Number(raw);
              if (!Number.isFinite(valorApi) || valorApi <= 0) {
                apiErr =
                  j.retorno?.erros?.map((e) => e.erro).filter(Boolean).join("; ") ||
                  `retorno sem total (status=${j.retorno?.status ?? "?"})`;
              }
            } catch (e) {
              apiErr = e instanceof Error ? e.message : String(e);
            }
          } else if (!token) {
            apiErr = "OLIST_API_TOKEN não configurado";
          }

          if (!Number.isFinite(valorApi) || valorApi <= 0) {
            return logAndRespond(
              "erro",
              `Cliente vinculado como pendente. Notificação "${tipoEvento || "sem tipo"}" do pedido ${idVenda} sem total no payload e API Tiny não retornou valor (${apiErr || "sem detalhes"}).`,
              200,
              { cliente_vinculado: true },
            );
          }
          valor = valorApi;
        }

        // Calcula pontos + cashback conforme modalidade (função pura testada)
        const { pontos, cashback, novoPontos, novoCashback, nivel } = computeRewards(
          valor,
          loja,
          link.pontos,
          Number(link.cashback_saldo),
        );

        const tx = await supabaseAdmin.from("transactions").insert({
          store_id: loja.id,
          client_user_id: clientProfile.id,
          tipo: "venda",
          valor,
          pontos_delta: pontos,
          cashback_delta: cashback,
          status: "entregue",
          id_venda_externa: idVenda,
          origem,
        });
        if (tx.error) {
          // race → duplicate
          if (tx.error.code === "23505") {
            return logAndRespond("sucesso", "venda já processada (idempotente)", 200, {
              duplicated: true,
            });
          }
          return logAndRespond("erro", tx.error.message, 500);
        }
        const upd = await supabaseAdmin
          .from("store_clients")
          .update({ pontos: novoPontos, cashback_saldo: novoCashback, nivel })
          .eq("id", link.id);
        if (upd.error) return logAndRespond("erro", upd.error.message, 500);

        if (pontos > 0) {
          const { notifyClient } = await import("@/lib/notify.server");
          await notifyClient({
            event: "pontos_ganhos",
            storeId: loja.id,
            clientUserId: clientProfile.id,
            pontosGanhos: pontos,
          });
        }

        return logAndRespond("sucesso", "venda processada", 200, {
          pontos_creditados: pontos,
          cashback_creditado: cashback,
          novo_saldo_pontos: novoPontos,
          novo_saldo_cashback: novoCashback,
        });
      },
    },
  },
});
