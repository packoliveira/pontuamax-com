import { createFileRoute } from "@tanstack/react-router";

// Cron hook: anonimiza PII em `integration_logs` mais antigos que 90 dias.
// Autenticado por header apikey = SUPABASE_PUBLISHABLE_KEY.
// Registrar em pg_cron para rodar diariamente.

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

const PII_KEYS = new Set([
  "cpf",
  "cpf_cliente",
  "cpfCnpj",
  "cpf_cnpj",
  "documento",
  "telefone",
  "telefone_cliente",
  "fone",
  "celular",
  "email",
  "nome",
  "nome_cliente",
  "razao_social",
]);

function mask(value: unknown): unknown {
  if (typeof value !== "string") return "***";
  const s = value.replace(/\D/g, "");
  if (s.length >= 4) return `***${s.slice(-2)}`;
  return "***";
}

function anonymize(input: Json): Json {
  if (Array.isArray(input)) return input.map((v) => anonymize(v as Json));
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (PII_KEYS.has(k)) out[k] = mask(v);
      else out[k] = anonymize(v as Json);
    }
    return out;
  }
  return input;
}

export const Route = createFileRoute("/api/public/hooks/anonimizar-logs-antigos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey") ?? request.headers.get("x-api-key");
        if (!key || key !== process.env.SUPABASE_PUBLISHABLE_KEY) {
          return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401 });
        }
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

        async function anonimizarTabela(
          tabela: "integration_logs" | "erp_webhook_events",
          coluna: "payload_recebido" | "payload",
        ): Promise<number> {
          let total = 0;
          for (let i = 0; i < 20; i++) {
            const rows = await supabaseAdmin
              .from(tabela)
              .select(`id, ${coluna}`)
              .lt("created_at", cutoff)
              .not(coluna, "is", null)
              .limit(200);
            if (rows.error) throw new Error(`${tabela}: ${rows.error.message}`);
            if (!rows.data || rows.data.length === 0) break;
            const toUpdate = rows.data.filter((r: Record<string, unknown>) => {
              const p = r[coluna];
              const j = JSON.stringify(p ?? {});
              return [...PII_KEYS].some((k) => j.includes(`"${k}"`));
            });
            if (toUpdate.length === 0) break;
            for (const r of toUpdate) {
              const cleaned = anonymize(((r as Record<string, unknown>)[coluna] ?? null) as Json);
              const upd = await supabaseAdmin
                .from(tabela)
                .update({ [coluna]: cleaned as never } as never)
                .eq("id", (r as { id: string }).id);
              if (!upd.error) total += 1;
            }
            if (toUpdate.length < 200) break;
          }
          return total;
        }

        try {
          const integration = await anonimizarTabela("integration_logs", "payload_recebido");
          const webhookEvents = await anonimizarTabela("erp_webhook_events", "payload");
          return new Response(
            JSON.stringify({
              ok: true,
              anonimizados: integration + webhookEvents,
              integration_logs: integration,
              erp_webhook_events: webhookEvents,
              cutoff,
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        } catch (e) {
          return new Response(
            JSON.stringify({ error: (e as Error).message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});