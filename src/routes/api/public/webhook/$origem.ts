import { createFileRoute } from "@tanstack/react-router";

// Endpoint legado desativado. Toda a integração Olist agora usa apenas o
// webhook oficial v3 (`/api/public/webhook/olist/v3`) com OAuth v3 + HMAC.
// Mantemos esta rota apenas para responder 410 Gone caso a Olist ainda
// tenha o endpoint antigo configurado, evitando ruído silencioso.

function gone() {
  return new Response(
    JSON.stringify({
      ok: false,
      error: "endpoint_desativado",
      message:
        "Este webhook foi desativado. Use o webhook v3 do Olist em /api/public/webhook/olist/v3.",
    }),
    { status: 410, headers: { "content-type": "application/json" } },
  );
}

export const Route = createFileRoute("/api/public/webhook/$origem")({
  server: {
    handlers: {
      GET: async () => gone(),
      POST: async () => gone(),
    },
  },
});