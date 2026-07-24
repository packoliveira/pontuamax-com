import { createFileRoute } from "@tanstack/react-router";

// Cron hook: processa campanhas cujo horário de envio já chegou (status="agendada").
// Autenticado por x-cron-secret ou Authorization: Bearer <CRON_SECRET>.
// Roda campanhas em série, com timeout defensivo, para não estourar o Worker.
export const Route = createFileRoute("/api/public/hooks/campanhas-agendadas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { authorizeCronRequest } = await import("@/lib/cron-auth.server");
        const auth = authorizeCronRequest(request);
        if (!auth.ok) return auth.response;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { _processarEnvioCampanhaInternal } = await import("@/lib/loyalty.functions");

        const nowIso = new Date().toISOString();
        const pend = await supabaseAdmin
          .from("campaigns")
          .select("id, agendada_para")
          .eq("status", "agendada")
          .not("agendada_para", "is", null)
          .lte("agendada_para", nowIso)
          .order("agendada_para", { ascending: true })
          .limit(5); // no máximo 5 campanhas por rodada

        const results: Array<{
          id: string;
          enviados?: number;
          falhas?: number;
          total?: number;
          erro?: string;
        }> = [];
        for (const c of pend.data ?? []) {
          try {
            const r = await _processarEnvioCampanhaInternal(c.id);
            results.push({ id: c.id, ...r });
          } catch (e) {
            results.push({ id: c.id, erro: (e as Error).message });
            await supabaseAdmin.from("campaigns").update({ status: "falhou" }).eq("id", c.id);
          }
        }

        return new Response(JSON.stringify({ processadas: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
