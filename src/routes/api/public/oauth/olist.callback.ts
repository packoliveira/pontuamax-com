import { createFileRoute } from "@tanstack/react-router";

// Callback público do OAuth2 Olist V3.
// URL: https://<origin>/api/public/oauth/olist/callback

export const Route = createFileRoute("/api/public/oauth/olist/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const errorParam = url.searchParams.get("error");

        const back = (msg: string, ok = false) => {
          const origin = process.env.PUBLIC_APP_ORIGIN ?? process.env.VITE_APP_ORIGIN ?? url.origin;
          const target = new URL(`${origin}/lojista/configuracoes`);
          target.searchParams.set("olist", ok ? "connected" : "error");
          target.searchParams.set("msg", msg);
          return Response.redirect(target.toString(), 302);
        };

        if (errorParam) return back(errorParam);
        if (!code || !state) return back("parâmetros ausentes");

        const { verifyState, exchangeCodeForToken, olistRedirectUri } =
          await import("@/lib/olist.server");
        const parsed = verifyState(state);
        if (!parsed) return back("state inválido");

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Consome o nonce (single-use, e valida expiração).
        const stateRow = await supabaseAdmin
          .from("oauth_states")
          .select("*")
          .eq("state", state)
          .maybeSingle();
        if (!stateRow.data) return back("state expirado ou desconhecido");
        if (new Date(stateRow.data.expires_at).getTime() < Date.now()) {
          await supabaseAdmin.from("oauth_states").delete().eq("state", state);
          return back("state expirado");
        }
        if (stateRow.data.store_id !== parsed.storeId) return back("state divergente");

        try {
          const token = await exchangeCodeForToken(code, olistRedirectUri(request));
          const expiresAt = new Date(Date.now() + token.expires_in * 1000).toISOString();

          const up = await supabaseAdmin.from("erp_credentials").upsert(
            {
              store_id: parsed.storeId,
              provider: "olist_v3",
              access_token: token.access_token,
              refresh_token: token.refresh_token,
              expires_at: expiresAt,
              scopes: token.scope ? token.scope.split(" ") : null,
              status: "connected",
              last_refresh_at: new Date().toISOString(),
            },
            { onConflict: "store_id,provider" },
          );
          if (up.error) throw new Error(up.error.message);

          await supabaseAdmin
            .from("stores")
            .update({ erp_provider: "olist_v3" })
            .eq("id", parsed.storeId);

          await supabaseAdmin.from("oauth_states").delete().eq("state", state);

          return back("conexão realizada", true);
        } catch (e) {
          return back((e as Error).message.slice(0, 200));
        }
      },
    },
  },
});
