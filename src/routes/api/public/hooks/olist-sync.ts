import { createFileRoute } from "@tanstack/react-router";

// Polling da API V3 do Olist. Chamado pelo pg_cron a cada 5 min.
// GET público apenas para health-check; POST executa a sincronização de todas
// as lojas com `provider=olist_v3`, `status=connected` e `sync_enabled=true`.

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/public/hooks/olist-sync")({
  server: {
    handlers: {
      GET: async () => json({ status: "ok", endpoint: "olist polling" }),
      POST: async () => {
        try {
          const { sincronizarTodasLojasOlist } = await import("@/lib/olist-sync.server");
          const results = await sincronizarTodasLojasOlist();
          const total = results.reduce(
            (acc, r) => ({
              lojas: acc.lojas + 1,
              processados: acc.processados + r.processados,
              duplicados: acc.duplicados + r.duplicados,
              ignorados: acc.ignorados + r.ignorados,
              erros: acc.erros + r.erros,
            }),
            { lojas: 0, processados: 0, duplicados: 0, ignorados: 0, erros: 0 },
          );
          return json({ ok: true, total, results });
        } catch (e) {
          return json({ ok: false, error: (e as Error).message }, 500);
        }
      },
    },
  },
});