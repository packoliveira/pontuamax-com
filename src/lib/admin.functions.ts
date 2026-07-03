import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", { _user_id: ctx.userId, _role: "admin" });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
}

async function writeAudit(params: {
  actorId: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  targetLabel?: string | null;
  details?: Record<string, unknown>;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let actorEmail: string | null = null;
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(params.actorId);
    actorEmail = data?.user?.email ?? null;
  } catch { /* ignore */ }
  await supabaseAdmin.from("admin_audit_logs").insert({
    actor_id: params.actorId,
    actor_email: actorEmail,
    action: params.action,
    target_type: params.targetType ?? null,
    target_id: params.targetId ?? null,
    target_label: params.targetLabel ?? null,
    details: (params.details ?? {}) as never,
  });
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
    const { data: storeInfo } = await supabaseAdmin
      .from("stores").select("nome_fantasia").eq("id", data.store_id).maybeSingle();
    await writeAudit({
      actorId: context.userId,
      action: "store.subscription_updated",
      targetType: "store",
      targetId: data.store_id,
      targetLabel: storeInfo?.nome_fantasia ?? null,
      details: patch as Record<string, unknown>,
    });
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

export const listAdmins = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    const ids = Array.from(new Set((roles ?? []).map((r) => r.user_id)));
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("id, full_name").in("id", ids)
      : { data: [] as { id: string; full_name: string | null }[] };
    const profMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    const rows: { user_id: string; email: string | null; full_name: string | null; is_me: boolean }[] = [];
    for (const uid of ids) {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(uid);
      rows.push({
        user_id: uid,
        email: u?.user?.email ?? null,
        full_name: profMap.get(uid) ?? null,
        is_me: uid === context.userId,
      });
    }
    return rows;
  });

export const addAdminByEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ email: z.string().email() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Busca usuário por email (paginando pela lista do auth)
    const emailLower = data.email.trim().toLowerCase();
    let targetId: string | null = null;
    let page = 1;
    // até 10 páginas de 200 usuários (2000). suficiente pra este projeto.
    while (page <= 10 && !targetId) {
      const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
      if (error) throw new Error(error.message);
      const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === emailLower);
      if (found) targetId = found.id;
      if (!list?.users || list.users.length < 200) break;
      page++;
    }
    if (!targetId) throw new Error("Nenhuma conta encontrada com este e-mail.");
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: targetId, role: "admin" });
    if (insErr && !/duplicate|unique/i.test(insErr.message)) throw new Error(insErr.message);
    await writeAudit({
      actorId: context.userId,
      action: "admin.added",
      targetType: "user",
      targetId: targetId,
      targetLabel: emailLower,
      details: { email: emailLower },
    });
    return { ok: true, user_id: targetId };
  });

export const removeAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ user_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    if (data.user_id === context.userId) {
      throw new Error("Você não pode remover o próprio acesso de admin.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count, error: cErr } = await supabaseAdmin
      .from("user_roles")
      .select("*", { count: "exact", head: true })
      .eq("role", "admin");
    if (cErr) throw new Error(cErr.message);
    if ((count ?? 0) <= 1) throw new Error("Não é possível remover o único admin do sistema.");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", data.user_id)
      .eq("role", "admin");
    if (error) throw new Error(error.message);
    let targetEmail: string | null = null;
    try {
      const { data: u } = await supabaseAdmin.auth.admin.getUserById(data.user_id);
      targetEmail = u?.user?.email ?? null;
    } catch { /* ignore */ }
    await writeAudit({
      actorId: context.userId,
      action: "admin.removed",
      targetType: "user",
      targetId: data.user_id,
      targetLabel: targetEmail,
      details: { email: targetEmail },
    });
    return { ok: true };
  });

export const listAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("admin_audit_logs")
      .select("id, actor_id, actor_email, action, target_type, target_id, target_label, details, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        current_password: z.string().min(1),
        new_password: z.string().min(8, "Mínimo 8 caracteres"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: userInfo, error: uErr } = await supabaseAdmin.auth.admin.getUserById(context.userId);
    if (uErr || !userInfo?.user?.email) throw new Error("Não foi possível localizar sua conta.");
    const email = userInfo.user.email;
    // Verifica senha atual usando client publishable, sem persistir sessão
    const { createClient } = await import("@supabase/supabase-js");
    const checker = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
    );
    const { error: signErr } = await checker.auth.signInWithPassword({
      email,
      password: data.current_password,
    });
    if (signErr) throw new Error("Senha atual incorreta.");
    const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(context.userId, {
      password: data.new_password,
    });
    if (updErr) throw new Error(updErr.message);
    await writeAudit({
      actorId: context.userId,
      action: "admin.password_changed",
      targetType: "user",
      targetId: context.userId,
      targetLabel: email,
      details: {},
    });
    return { ok: true };
  });