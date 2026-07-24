import { createFileRoute } from "@tanstack/react-router";

// Cron hook: expira vouchers de resgate vencidos e devolve pontos/cashback ao cliente.
// Chamado por pg_cron. Autenticado por header apikey = SUPABASE_PUBLISHABLE_KEY.
export const Route = createFileRoute("/api/public/hooks/expirar-vouchers")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!key || key !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { calcularNivel } = await import("@/lib/qsf-shared");

        const nowIso = new Date().toISOString();
        const pend = await supabaseAdmin
          .from("transactions")
          .select("id, store_id, client_user_id, tipo, pontos_delta, cashback_delta")
          .eq("status", "pendente")
          .not("voucher_expires_at", "is", null)
          .lt("voucher_expires_at", nowIso)
          .limit(500);

        let expired = 0;
        let refunded = 0;
        for (const t of pend.data ?? []) {
          if (!t.client_user_id) continue;
          const link = await supabaseAdmin
            .from("store_clients")
            .select("id, pontos, cashback_saldo")
            .eq("store_id", t.store_id)
            .eq("user_id", t.client_user_id)
            .maybeSingle();
          const pontosDevolver = -Number(t.pontos_delta || 0);
          const cashbackDevolver = -Number(t.cashback_delta || 0);
          if (link.data) {
            const novoPontos = Math.max(0, link.data.pontos + pontosDevolver);
            const novoCashback = Math.max(
              0,
              +(Number(link.data.cashback_saldo) + cashbackDevolver).toFixed(2),
            );
            await supabaseAdmin
              .from("store_clients")
              .update({
                pontos: novoPontos,
                cashback_saldo: novoCashback,
                nivel: calcularNivel(novoPontos),
              })
              .eq("id", link.data.id);
            refunded++;
          }
          await supabaseAdmin.from("transactions").update({ status: "expirado" }).eq("id", t.id);
          expired++;
        }

        return new Response(JSON.stringify({ expired, refunded }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
