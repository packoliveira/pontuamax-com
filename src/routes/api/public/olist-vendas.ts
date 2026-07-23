import { createFileRoute } from "@tanstack/react-router";
import { handleOlistWebhookAlias } from "./webhook/$origem";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin, x-qsf-secret, x-qsf-store",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export const Route = createFileRoute("/api/public/olist-vendas")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      HEAD: async () => new Response(null, { status: 200, headers: CORS }),
      GET: async () =>
        json({
          status: "ok",
          message: "PontuaMax Olist vendas endpoint ativo",
        }),
      POST: async ({ request }) => handleOlistWebhookAlias(request),
    },
  },
});