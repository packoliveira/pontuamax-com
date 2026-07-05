import { createFileRoute } from "@tanstack/react-router";
import { cpfToEmail, phoneToEmail } from "@/lib/qsf-shared";

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

function extractOlistPayload(p: Record<string, unknown>): {
  idVenda: string;
  valor: number;
  cpf: string;
  telefone: string;
  nome: string;
  tipoEvento: string;
} {
  // Desembrulha envelopes comuns
  const root =
    (p.pedido as Record<string, unknown>) ??
    (p.dados as Record<string, unknown>) ??
    (p.data as Record<string, unknown>) ??
    (p.venda as Record<string, unknown>) ??
    p;
  const cliente = (root.cliente as Record<string, unknown>) ?? {};
  const fones = (cliente.fones as Array<Record<string, unknown>>) ?? [];
  const fonePrincipal =
    (cliente.fone as string | undefined) ??
    (cliente.celular as string | undefined) ??
    (cliente.telefone as string | undefined) ??
    (fones[0]?.fone as string | undefined) ??
    (fones[0]?.numero as string | undefined) ??
    "";

  const idVenda = String(
    p.id_venda_externa ??
      root.id ??
      root.numero ??
      root.numero_pedido ??
      root.codigo ??
      "",
  ).trim();

  const valorRaw =
    p.valor ??
    root.total ??
    root.valor_total ??
    root.total_pedido ??
    root.valor ??
    root.totalPedido ??
    root.valorTotal ??
    0;
  const valor = typeof valorRaw === "string" ? Number(valorRaw.replace(",", ".")) : Number(valorRaw);

  const cpfRaw = String(
    p.cpf_cliente ??
      cliente.cpfCnpj ??
      cliente.cpf_cnpj ??
      cliente.documento ??
      cliente.cpf ??
      "",
  );
  const cpf = cpfRaw.replace(/\D/g, "");

  const telRaw = String(p.telefone_cliente ?? fonePrincipal ?? "");
  const telefone = telRaw.replace(/\D/g, "");

  const nome = String(p.nome_cliente ?? cliente.nome ?? cliente.razao_social ?? "").trim() || "Cliente";

  const tipoEvento = String(p.tipo ?? p.event ?? p.evento ?? "").trim().toLowerCase();

  return { idVenda, valor, cpf, telefone, nome, tipoEvento };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-qsf-secret, x-qsf-store",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export const Route = createFileRoute("/api/public/webhook/$origem")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => json({ status: "ok", message: "PontoaMax webhook endpoint ativo" }, 200),
      HEAD: async () => new Response(null, { status: 200, headers: CORS }),
      POST: async ({ request, params }) => {
        const origem = String(params.origem).toLowerCase();
        if (!["bling", "olist", "teste"].includes(origem)) {
          return json({ error: "origem inválida (use bling|olist)" }, 404);
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
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeHeader);
        const q = supabaseAdmin.from("stores").select("*");
        const storeRes = await (isUuid ? q.eq("id", storeHeader) : q.eq("slug", storeHeader)).maybeSingle();
        const loja = storeRes.data;
        if (!loja) return json({ error: "loja não encontrada" }, 404);

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
            await supabaseAdmin.from("stores").update({ webhook_last_at: new Date().toISOString() }).eq("id", loja.id);
          }
          return json({ status, message, ...extra }, httpStatus);
        };

        if (!secret || secret !== loja.webhook_secret) {
          return logAndRespond("erro", "segredo inválido", 401);
        }

        // Some ERP panels validate the webhook by sending a POST without a sale body.
        // Treat an authenticated empty POST as a successful connectivity test.
        if (!raw || Object.keys(payload).length === 0) {
          return logAndRespond("sucesso", "webhook validado", 200, { validation: true });
        }

        let { idVenda, valor, cpf, telefone, nome, tipoEvento } =
          extractOlistPayload(payload);

        if (!idVenda) return logAndRespond("erro", "id do pedido é obrigatório (numero/id_venda_externa)", 400);

        // Se a Olist mandou só notificação (sem valor total), tenta buscar
        // o pedido completo via API Tiny/Olist usando OLIST_API_TOKEN.
        if ((!Number.isFinite(valor) || valor <= 0) && origem === "olist") {
          const token = process.env.OLIST_API_TOKEN;
          if (token) {
            try {
              const apiUrl = `https://api.tiny.com.br/api2/pedido.obter.php?token=${encodeURIComponent(token)}&id=${encodeURIComponent(idVenda)}&formato=json`;
              const resp = await fetch(apiUrl);
              const dataJson = (await resp.json()) as {
                retorno?: {
                  status?: string;
                  pedido?: Record<string, unknown>;
                  registros?: Array<{ pedido?: Record<string, unknown> }>;
                };
              };
              const pedido =
                dataJson.retorno?.pedido ??
                dataJson.retorno?.registros?.[0]?.pedido ??
                null;
              if (pedido) {
                const full = extractOlistPayload({ pedido });
                if (Number.isFinite(full.valor) && full.valor > 0) valor = full.valor;
                if (!cpf && full.cpf) cpf = full.cpf;
                if (!telefone && full.telefone) telefone = full.telefone;
                if (!nome || nome === "Cliente") nome = full.nome;
              }
            } catch {
              // segue com validação abaixo
            }
          }
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
        if (dup.data) return logAndRespond("sucesso", "venda já processada (idempotente)", 200, { duplicated: true });

        // Busca cliente: 1º por CPF (mais confiável), depois por telefone.
        let clientProfile: { id: string } | null = null;
        let clientJustCreated = false;
        if (cpf) {
          const p = await supabaseAdmin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
          if (p.data) clientProfile = p.data;
        }
        if (!clientProfile && telefone) {
          const p = await supabaseAdmin.from("profiles").select("id").eq("phone", telefone).maybeSingle();
          if (p.data) clientProfile = p.data;
        }
        if (!clientProfile) {
          // Email sintético SEMPRE derivado do CPF (fonte única de identidade).
          // Usar cpfToEmail garante o mesmo domínio de todos os outros fluxos
          // (auto-cadastro do cliente, login por CPF, lançamento manual),
          // evitando que o mesmo CPF vire duas contas diferentes.
          const email = cpfToEmail(cpf);
          const password = telefone || cpf;
          const created = await supabaseAdmin.auth.admin.createUser({
            email,
              password,
            email_confirm: true,
              user_metadata: { full_name: nome, phone: telefone || null, cpf: cpf || null },
          });
          if (created.error || !created.data.user) {
            return logAndRespond("erro", `falha criando cliente: ${created.error?.message ?? "?"}`, 500);
          }
          clientProfile = { id: created.data.user.id };
          clientJustCreated = true;
          await supabaseAdmin.from("profiles").upsert({
            id: clientProfile.id,
            full_name: nome,
              phone: telefone || null,
            cpf: cpf || null,
          });
          await supabaseAdmin.from("user_roles").upsert(
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
          // que podem conter CPF/nome antes do total do pedido estar disponível.
          // Nesses casos, já puxamos o cliente para o painel como cadastro
          // pendente e só deixamos de pontuar/cashback até receber o valor.
          return logAndRespond(
            "erro",
            `Cliente vinculado como pendente, mas a notificação Olist "${tipoEvento || "sem tipo"}" do pedido ${idVenda} ainda não trouxe valor total para pontuar.`,
            200,
            { cliente_vinculado: true },
          );
        }

        // Calcula pontos + cashback conforme modalidade
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
          id_venda_externa: idVenda,
          origem,
        });
        if (tx.error) {
          // race → duplicate
          if (tx.error.code === "23505") {
            return logAndRespond("sucesso", "venda já processada (idempotente)", 200, { duplicated: true });
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