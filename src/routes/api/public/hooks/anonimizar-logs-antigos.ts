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

        let anonimizados = 0;
        // Processa em lotes pequenos para não estourar tempo/limite de linha.
        for (let i = 0; i < 20; i++) {
          const rows = await supabaseAdmin
            .from("integration_logs")
            .select("id, payload_recebido")
            .lt("created_at", cutoff)
            .not("payload_recebido", "is", null)
            .limit(200);
          if (rows.error) {
            return new Response(JSON.stringify({ error: rows.error.message }), { status: 500 });
          }
          if (!rows.data || rows.data.length === 0) break;

          // Filtra os que ainda contêm alguma chave de PII no payload.
          const toUpdate = rows.data.filter((r) => {
            const p = r.payload_recebido as unknown;
            const json = JSON.stringify(p ?? {});
            return [...PII_KEYS].some((k) => json.includes(`"${k}"`));
          });
          if (toUpdate.length === 0) break;

          for (const r of toUpdate) {
            const cleaned = anonymize((r.payload_recebido ?? null) as Json);
            const upd = await supabaseAdmin
              .from("integration_logs")
              .update({ payload_recebido: cleaned as never })
              .eq("id", r.id);
            if (!upd.error) anonimizados += 1;
          }
          if (toUpdate.length < 200) break;
        }

        return new Response(
          JSON.stringify({ ok: true, anonimizados, cutoff }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});