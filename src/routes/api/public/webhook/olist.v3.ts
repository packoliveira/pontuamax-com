import { createFileRoute } from "@tanstack/react-router";

// Webhook v3 desativado a pedido do lojista.
// Só o endpoint legado `/api/public/webhook/olist` está ativo.

const gone = () =>
  new Response(
    JSON.stringify({
      ok: false,
      error: "endpoint_desativado",
      message:
        "Webhook v3 desativado. Use /api/public/webhook/olist?store=<slug>&secret=<...>.",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } },
  );

export const Route = createFileRoute("/api/public/webhook/olist/v3")({
  server: {
    handlers: {
      GET: async () => gone(),
      POST: async () => gone(),
    },
  },
});
