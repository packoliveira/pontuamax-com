import { createFileRoute } from "@tanstack/react-router";
import { handleOlistWebhookAlias } from "./webhook/$origem";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, x-pontuamax-secret, x-pontuamax-store, x-qsf-secret, x-qsf-store",
  "Access-Control-Max-Age": "86400",
};

const json = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json", ...CORS },
  });

const ok = (body: unknown = { status: "ok" }) => json(body);

async function forceHttp200(response: Response): Promise<Response> {
  if (response.status === 200) return response;
  const body = await response.text().catch(() => "");
  return new Response(body || JSON.stringify({ status: "ok" }), {
    status: 200,
    headers: {
      "Content-Type": response.headers.get("Content-Type") ?? "application/json",
      ...CORS,
    },
  });
}

export const Route = createFileRoute("/api/public/olist-vendas")({
  server: {
    handlers: {
      OPTIONS: async () => ok({ status: "ok", message: "preflight liberado" }),
      HEAD: async () => new Response(null, { status: 200, headers: CORS }),
      GET: async () =>
        ok({
          status: "ok",
          message: "PontuaMax Olist vendas endpoint ativo",
        }),
      POST: async ({ request }) => {
        try {
          return await forceHttp200(await handleOlistWebhookAlias(request));
        } catch (e) {
          console.error("[olist-vendas] falha isolada na URL dedicada:", (e as Error).message);
          return ok({ status: "erro", message: "erro interno registrado" });
        }
      },
    },
  },
});
