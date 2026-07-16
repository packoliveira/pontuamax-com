import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureOwner(ctx: { supabase: any; userId: string }, storeId: string) {
  const { data, error } = await ctx.supabase
    .from("stores")
    .select("id, owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data || data.owner_id !== ctx.userId) throw new Error("Acesso negado");
}

// Retorna a URL de autorização Olist para o lojista abrir/redirecionar.
export const iniciarConexaoOlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureOwner(context, data.storeId);
    const { newNonce, signState, buildAuthorizeUrl, olistRedirectUri } =
      await import("@/lib/olist.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nonce = newNonce();
    const state = signState({ storeId: data.storeId, nonce });
    const { error } = await supabaseAdmin.from("oauth_states").insert({
      state,
      store_id: data.storeId,
      provider: "olist_v3",
    });
    if (error) throw new Error(error.message);
    // A rota do TSS não expõe Request aqui; usamos origin do próprio app via env.
    const origin =
      process.env.PUBLIC_APP_ORIGIN ?? process.env.VITE_APP_ORIGIN ?? "https://pontuamax.com";
    const redirectUri = `${origin}/api/public/oauth/olist/callback`;
    return { url: buildAuthorizeUrl(state, redirectUri) };
  });

// Lê o status da conexão do lojista.
export const getStatusOlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureOwner(context, data.storeId);
    const { data: row, error } = await context.supabase
      .from("erp_credentials")
      .select("provider, account_id, status, expires_at, last_refresh_at, scopes, created_at")
      .eq("store_id", data.storeId)
      .eq("provider", "olist_v3")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// Revoga a conexão (remove credenciais localmente).
export const desconectarOlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureOwner(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("erp_credentials")
      .delete()
      .eq("store_id", data.storeId)
      .eq("provider", "olist_v3");
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("stores").update({ erp_provider: null }).eq("id", data.storeId);
    return { ok: true };
  });
