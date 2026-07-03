import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
}

export const bootstrapFirstAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("bootstrap_first_admin");
    if (error) throw new Error(error.message);
    return { promoted: data === true };
  });

export const isCurrentUserAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    if (error) throw new Error(error.message);
    return { isAdmin: data === true };
  });

export const listAllStores = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("stores")
      .select("id, slug, nome_fantasia, telefone, owner_id, subscription_status, plan, mrr_amount, setup_paid_at, activated_at, cancelled_at, admin_notes, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ownerIds = Array.from(new Set((data ?? []).map((s) => s.owner_id)));
    let owners: Record<string, { full_name: string | null; phone: string | null }> = {};
    if (ownerIds.length) {
      const { data: profs } = await supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", ownerIds);
      for (const p of profs ?? []) owners[p.id] = { full_name: p.full_name, phone: p.phone };
    }
    // emails
    const emails: Record<string, string | undefined> = {};
    for (const uid of ownerIds) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      if (u?.user) emails[uid] = u.user.email ?? undefined;
    }
    return (data ?? []).map((s) => ({
      ...s,
      owner_name: owners[s.owner_id]?.full_name ?? null,
      owner_phone: owners[s.owner_id]?.phone ?? null,
      owner_email: emails[s.owner_id] ?? null,
    }));
  });

export const updateStoreSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        subscription_status: z.enum(["pending_payment", "active", "suspended", "cancelled"]).optional(),
        plan: z.enum(["starter", "pro", "premium"]).optional(),
        mrr_amount: z.number().min(0).max(100000).optional(),
        setup_paid: z.boolean().optional(),
        admin_notes: z.string().max(2000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const patch: {
      subscription_status?: "pending_payment" | "active" | "suspended" | "cancelled";
      plan?: "starter" | "pro" | "premium";
      mrr_amount?: number;
      setup_paid_at?: string | null;
      activated_at?: string;
      cancelled_at?: string;
      admin_notes?: string | null;
    } = {};
    if (data.subscription_status !== undefined) {
      patch.subscription_status = data.subscription_status;
      if (data.subscription_status === "active") patch.activated_at = new Date().toISOString();
      if (data.subscription_status === "cancelled") patch.cancelled_at = new Date().toISOString();
    }
    if (data.plan !== undefined) patch.plan = data.plan;
    if (data.mrr_amount !== undefined) patch.mrr_amount = data.mrr_amount;
    if (data.setup_paid !== undefined) patch.setup_paid_at = data.setup_paid ? new Date().toISOString() : null;
    if (data.admin_notes !== undefined) patch.admin_notes = data.admin_notes;
    const { error } = await supabaseAdmin.from("stores").update(patch).eq("id", data.store_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getMyStoreSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("stores")
      .select("id, slug, nome_fantasia, subscription_status, plan, mrr_amount, setup_paid_at, activated_at")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  });