export async function ensureOlistStoreOwner(
  ctx: { supabase: any; userId: string },
  storeId: string,
) {
  const { data, error } = await ctx.supabase
    .from("stores")
    .select("id, owner_id")
    .eq("id", storeId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data || data.owner_id !== ctx.userId) throw new Error("Acesso negado");
}