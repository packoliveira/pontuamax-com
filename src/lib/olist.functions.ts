import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ensureOlistStoreOwner } from "@/lib/olist-auth.server";

// Retorna a URL de autorização Olist para o lojista abrir/redirecionar.
export const iniciarConexaoOlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureOlistStoreOwner(context, data.storeId);
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
    // O redirect_uri precisa bater exatamente com o cadastrado na Olist.
    const redirectUri = olistRedirectUri();
    return { url: buildAuthorizeUrl(state, redirectUri) };
  });

// Lê o status da conexão do lojista.
export const getStatusOlist = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureOlistStoreOwner(context, data.storeId);
    const { data: row, error } = await context.supabase
      .from("erp_credentials")
      .select(
        "provider, account_id, status, expires_at, last_refresh_at, scopes, created_at, last_sync_at, last_sync_status, last_sync_error, sync_enabled",
      )
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
    await ensureOlistStoreOwner(context, data.storeId);
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

// Executa polling manual imediato para a loja do lojista logado.
export const sincronizarOlistAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ storeId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureOlistStoreOwner(context, data.storeId);
    const { sincronizarLojaOlist } = await import("@/lib/olist-sync.server");
    return await sincronizarLojaOlist(data.storeId);
  });

// Liga/desliga polling automático.
export const alternarSyncOlist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ storeId: z.string().uuid(), enabled: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureOlistStoreOwner(context, data.storeId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("erp_credentials")
      .update({ sync_enabled: data.enabled })
      .eq("store_id", data.storeId)
      .eq("provider", "olist_v3");
    if (error) throw new Error(error.message);
    return { ok: true, enabled: data.enabled };
  });
