import { createFileRoute } from "@tanstack/react-router";

// Cron hook: aplica validade / decaimento de pontos configurados por cada loja.
// Autenticado por header apikey = SUPABASE_PUBLISHABLE_KEY.
export const Route = createFileRoute("/api/public/hooks/expirar-pontos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!key || key !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { calcularNivel } = await import("@/lib/qsf-shared");

        const stores = await supabaseAdmin
          .from("stores")
          .select(
            "id, pontos_expiracao_modo, pontos_validade_dias, pontos_decaimento_dias, pontos_decaimento_valor, pontos_expiracao_last_run_at",
          )
          .in("pontos_expiracao_modo", ["validade", "decaimento"]);

        const results: Array<{
          store_id: string;
          modo: string;
          afetados: number;
          pontos_removidos: number;
        }> = [];

        for (const s of stores.data ?? []) {
          let afetados = 0;
          let removidos = 0;

          if (s.pontos_expiracao_modo === "validade") {
            const dias = Math.max(1, s.pontos_validade_dias ?? 365);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - dias);
            const lastRun = s.pontos_expiracao_last_run_at
              ? new Date(s.pontos_expiracao_last_run_at)
              : null;
            // Janela: transações que "amadureceram" desde a última execução.
            const fromIso = lastRun
              ? new Date(
                  Math.min(lastRun.getTime() - dias * 86400000, cutoff.getTime()),
                ).toISOString()
              : "1970-01-01T00:00:00Z";
            const toIso = cutoff.toISOString();

            const txs = await supabaseAdmin
              .from("transactions")
              .select("id, client_user_id, pontos_delta, created_at")
              .eq("store_id", s.id)
              .gt("pontos_delta", 0)
              .neq("tipo", "expiracao")
              .gte("created_at", fromIso)
              .lt("created_at", toIso)
              .limit(5000);

            // Agrega pontos vencidos por cliente
            const porCliente = new Map<string, number>();
            for (const t of txs.data ?? []) {
              if (!t.client_user_id) continue;
              porCliente.set(
                t.client_user_id,
                (porCliente.get(t.client_user_id) ?? 0) + (t.pontos_delta ?? 0),
              );
            }

            for (const [uid, ptsVenc] of porCliente) {
              const link = await supabaseAdmin
                .from("store_clients")
                .select("id, pontos")
                .eq("store_id", s.id)
                .eq("user_id", uid)
                .maybeSingle();
              if (!link.data) continue;
              const remove = Math.min(link.data.pontos, ptsVenc);
              if (remove <= 0) continue;
              const novo = link.data.pontos - remove;
              await supabaseAdmin.from("transactions").insert({
                store_id: s.id,
                client_user_id: uid,
                tipo: "expiracao",
                valor: 0,
                pontos_delta: -remove,
                cashback_delta: 0,
                status: "entregue",
                origem: `expiracao_validade:${dias}d`,
              });
              await supabaseAdmin
                .from("store_clients")
                .update({ pontos: novo, nivel: calcularNivel(novo) })
                .eq("id", link.data.id);
              afetados++;
              removidos += remove;
            }
          } else if (s.pontos_expiracao_modo === "decaimento") {
            const dias = Math.max(1, s.pontos_decaimento_dias ?? 30);
            const valor = Math.max(1, s.pontos_decaimento_valor ?? 10);
            const cutoff = new Date();
            cutoff.setDate(cutoff.getDate() - dias);
            const cutoffIso = cutoff.toISOString();

            const links = await supabaseAdmin
              .from("store_clients")
              .select("id, user_id, pontos, pontos_decaimento_last_at, created_at")
              .eq("store_id", s.id)
              .gt("pontos", 0)
              .or(`pontos_decaimento_last_at.is.null,pontos_decaimento_last_at.lte.${cutoffIso}`)
              .limit(5000);

            const nowIso = new Date().toISOString();
            for (const l of links.data ?? []) {
              const baseIso = l.pontos_decaimento_last_at ?? l.created_at;
              const base = new Date(baseIso as string);
              const diffDias = Math.floor((Date.now() - base.getTime()) / 86400000);
              const periodos = Math.floor(diffDias / dias);
              if (periodos <= 0) continue;
              const remove = Math.min(l.pontos, valor * periodos);
              if (remove <= 0) continue;
              const novo = l.pontos - remove;
              await supabaseAdmin.from("transactions").insert({
                store_id: s.id,
                client_user_id: l.user_id,
                tipo: "expiracao",
                valor: 0,
                pontos_delta: -remove,
                cashback_delta: 0,
                status: "entregue",
                origem: `expiracao_decaimento:${valor}pts/${dias}d`,
              });
              await supabaseAdmin
                .from("store_clients")
                .update({
                  pontos: novo,
                  nivel: calcularNivel(novo),
                  pontos_decaimento_last_at: nowIso,
                })
                .eq("id", l.id);
              afetados++;
              removidos += remove;
            }
          }

          await supabaseAdmin
            .from("stores")
            .update({ pontos_expiracao_last_run_at: new Date().toISOString() })
            .eq("id", s.id);

          results.push({
            store_id: s.id,
            modo: s.pontos_expiracao_modo,
            afetados,
            pontos_removidos: removidos,
          });
        }

        return new Response(JSON.stringify({ lojas: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
