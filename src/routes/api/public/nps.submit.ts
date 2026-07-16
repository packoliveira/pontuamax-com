import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const bodySchema = z.object({
  transaction_id: z.string().uuid(),
  score: z.number().int().min(0).max(10),
  comment: z.string().max(1000).optional().nullable(),
});

export const Route = createFileRoute("/api/public/nps/submit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }
        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) return Response.json({ error: parsed.error.message }, { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const tx = await supabaseAdmin
          .from("transactions")
          .select("id, store_id, client_user_id, tipo")
          .eq("id", parsed.data.transaction_id)
          .maybeSingle();
        if (!tx.data || tx.data.tipo !== "venda") {
          return Response.json({ error: "Venda não encontrada." }, { status: 404 });
        }

        const existing = await supabaseAdmin
          .from("nps_responses")
          .select("id")
          .eq("transaction_id", tx.data.id)
          .maybeSingle();
        if (existing.data)
          return Response.json({ error: "Você já respondeu esta pesquisa." }, { status: 409 });

        const { error } = await supabaseAdmin.from("nps_responses").insert({
          store_id: tx.data.store_id,
          transaction_id: tx.data.id,
          client_user_id: tx.data.client_user_id,
          score: parsed.data.score,
          comment: parsed.data.comment || null,
        });
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
