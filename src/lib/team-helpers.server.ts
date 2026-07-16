import { z } from "zod";

export async function getOwnedStoreId(ctx: { supabase: any; userId: string }): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("stores")
    .select("id")
    .eq("owner_id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Loja não encontrada");
  return data.id as string;
}

export async function writeAudit(storeId: string, actorId: string, action: string, opts?: {
  employeeId?: string | null;
  targetLabel?: string | null;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
}) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin.from("employee_audit_logs").insert({
    store_id: storeId,
    actor_user_id: actorId,
    employee_id: opts?.employeeId ?? null,
    action,
    target_label: opts?.targetLabel ?? null,
    ip: opts?.ip ?? null,
    user_agent: opts?.userAgent ?? null,
    meta: (opts?.meta ?? {}) as never,
  });
}

/** Escreve um log de auditoria de qualquer módulo. Não lança em erro. */
export async function logEmployeeAction(params: {
  storeId: string;
  actorUserId: string;
  action: string;
  employeeId?: string | null;
  targetLabel?: string | null;
  meta?: Record<string, unknown>;
}) {
  try {
    await writeAudit(params.storeId, params.actorUserId, params.action, {
      employeeId: params.employeeId ?? null,
      targetLabel: params.targetLabel ?? null,
      meta: params.meta ?? {},
    });
  } catch (e) {
    console.warn("[audit] falha ao registrar", params.action, (e as Error).message);
  }
}

/** Cria uma notificação para o lojista. Não lança em erro. */
export async function notifyMerchant(params: {
  storeId: string;
  actorUserId?: string | null;
  actorLabel?: string | null;
  tipo: string;
  titulo: string;
  mensagem?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("merchant_notifications").insert({
      store_id: params.storeId,
      actor_user_id: params.actorUserId ?? null,
      actor_label: params.actorLabel ?? null,
      tipo: params.tipo,
      titulo: params.titulo,
      mensagem: params.mensagem ?? null,
      metadata: (params.metadata ?? {}) as never,
    });
  } catch (e) {
    console.warn("[notify] falha", params.tipo, (e as Error).message);
  }
}

/** Resolve rótulo do funcionário (nome/email) para exibição em notificações. */
export async function resolveActorLabel(userId: string, storeId: string): Promise<string | null> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("store_employees")
      .select("nome, email")
      .eq("user_id", userId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (data) return data.nome || data.email || null;
  } catch { /* ignore */ }
  return null;
}

// ============== Schemas Zod compartilhados ==============
export const cpfSchema = z.string().trim().min(11).max(20).optional().nullable();
export const emailSchema = z.string().trim().toLowerCase().email().max(255);
export const nomeSchema = z.string().trim().min(2).max(120);
export const phoneSchema = z.string().trim().max(30).optional().nullable();
export const roleSchema = z.string().trim().min(1).max(60);
export const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);