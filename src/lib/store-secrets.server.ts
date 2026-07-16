// Server-only helpers for reading/writing sensitive store credentials
// (webhook_secret + Evolution API config) from the isolated `store_secrets`
// table. NEVER import this file from client code — it uses supabaseAdmin.

export type StoreSecretsRow = {
  webhook_secret: string | null;
  evolution_url: string | null;
  evolution_apikey: string | null;
  evolution_instance: string | null;
};

const EMPTY: StoreSecretsRow = {
  webhook_secret: null,
  evolution_url: null,
  evolution_apikey: null,
  evolution_instance: null,
};

export async function getStoreSecrets(storeId: string): Promise<StoreSecretsRow> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("store_secrets")
    .select("webhook_secret, evolution_url, evolution_apikey, evolution_instance")
    .eq("store_id", storeId)
    .maybeSingle();
  return data ?? EMPTY;
}

export async function saveStoreSecrets(
  storeId: string,
  patch: Partial<StoreSecretsRow>,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("store_secrets")
    .upsert({ store_id: storeId, ...patch }, { onConflict: "store_id" });
  if (error) throw new Error(error.message);
}