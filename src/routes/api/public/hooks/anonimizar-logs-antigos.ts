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

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;
        async function anonimizarTabela(tabela: string, coluna: string): Promise<number> {
          let total = 0;
          let lastId: string | null = null;
          // Paginação por cursor em `id` para não reprocessar sempre a mesma
          // janela: o filtro por conteúdo continuaria batendo em linhas já
          // mascaradas (a chave "cpf" segue presente após o mascaramento).
          for (let i = 0; i < 50; i++) {
            let query = db
              .from(tabela)
              .select(`id, ${coluna}`)
              .lt("created_at", cutoff)
              .not(coluna, "is", null)
              .order("id", { ascending: true })
              .limit(200);
            if (lastId) query = query.gt("id", lastId);
            const rows = await query;
            if (rows.error) throw new Error(`${tabela}: ${rows.error.message}`);
            const data: Array<Record<string, unknown>> = rows.data ?? [];
            if (data.length === 0) break;
            lastId = data[data.length - 1].id as string;
            const toUpdate = data.filter((r) => {
              const j = JSON.stringify(r[coluna] ?? {});
              // pula linhas já mascaradas (contêm o marcador "***")
              if (j.includes('"***')) return false;
              return [...PII_KEYS].some((k) => j.includes(`"${k}"`));
            });
            for (const r of toUpdate) {
              const cleaned = anonymize((r[coluna] ?? null) as Json);
              const upd = await db
                .from(tabela)
                .update({ [coluna]: cleaned })
                .eq("id", r.id as string);
              if (!upd.error) total += 1;
            }
            if (data.length < 200) break;
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