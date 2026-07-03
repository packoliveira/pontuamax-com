import { createFileRoute } from "@tanstack/react-router";

// Public webhook endpoint for external POS/ERP integrations (Bling, Olist).
// URL: /api/public/webhook/{bling|olist}
// Auth: header `x-qsf-secret` MUST match the store's `webhook_secret`.
//       The store is identified by header `x-qsf-store` (loja slug OR uuid)
//       or by field `store_slug` / `store_id` in the JSON body.
//
// Expected JSON body (kept intentionally simple):
// {
//   "id_venda_externa": "12345",     // required, used for idempotency
//   "valor": 199.90,                  // required, valor total da venda em BRL
//   "telefone_cliente": "11999999999",// required (ou cpf_cliente)
//   "cpf_cliente": "12345678900",     // opcional
//   "nome_cliente": "Fulano"          // opcional (usado ao criar cliente novo)
// }

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

        const storeHeader =
          request.headers.get("x-qsf-store") ??
          (payload.store_slug as string | undefined) ??
          (payload.store_id as string | undefined) ??
          "";
        const secret = request.headers.get("x-qsf-secret") ?? "";

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

        const idVenda = String(payload.id_venda_externa ?? "").trim();
        const valor = Number(payload.valor);
        const telefone = String(payload.telefone_cliente ?? "").replace(/\D/g, "");
        const cpf = String(payload.cpf_cliente ?? "").replace(/\D/g, "");
        const nome = String(payload.nome_cliente ?? "").trim() || "Cliente";

        if (!idVenda) return logAndRespond("erro", "id_venda_externa é obrigatório", 400);
        if (!Number.isFinite(valor) || valor <= 0) return logAndRespond("erro", "valor inválido", 400);
        if (!cpf || cpf.length !== 11) return logAndRespond("erro", "cpf_cliente é obrigatório (11 dígitos)", 400);

        // Idempotência: mesma venda já processada?
        const dup = await supabaseAdmin
          .from("transactions")
          .select("id")
          .eq("store_id", loja.id)
          .eq("id_venda_externa", idVenda)
          .maybeSingle();
        if (dup.data) return logAndRespond("sucesso", "venda já processada (idempotente)", 200, { duplicated: true });

        // Busca ou cria cliente por telefone/CPF
        let clientProfile: { id: string } | null = null;
        {
          const p = await supabaseAdmin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
          if (p.data) clientProfile = p.data;
        }
        if (!clientProfile && telefone) {
          const p = await supabaseAdmin.from("profiles").select("id").eq("phone", telefone).maybeSingle();
          if (p.data) clientProfile = p.data;
        }
        if (!clientProfile) {
          const email = `${cpf}@cpf.qsfclub.local`;
          const created = await supabaseAdmin.auth.admin.createUser({
            email,
            password: cpf,
            email_confirm: true,
            user_metadata: { full_name: nome, phone: telefone || null, cpf },
          });
          if (created.error || !created.data.user) {
            return logAndRespond("erro", `falha criando cliente: ${created.error?.message ?? "?"}`, 500);
          }
          clientProfile = { id: created.data.user.id };
          await supabaseAdmin.from("profiles").upsert({
            id: clientProfile.id,
            full_name: nome,
            phone: telefone || null,
            cpf,
          });
          await supabaseAdmin.from("user_roles").upsert(
            { user_id: clientProfile.id, role: "cliente" as const },
            { onConflict: "user_id,role" },
          );
        }

        // Vincula à loja (upsert)
        const linkRes = await supabaseAdmin
          .from("store_clients")
          .upsert({ store_id: loja.id, user_id: clientProfile.id }, { onConflict: "store_id,user_id" })
          .select("*")
          .single();
        if (linkRes.error) return logAndRespond("erro", linkRes.error.message, 500);
        const link = linkRes.data;

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