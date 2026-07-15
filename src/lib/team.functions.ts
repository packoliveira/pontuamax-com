import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function getOwnedStoreId(ctx: { supabase: any; userId: string }): Promise<string> {
  const { data, error } = await ctx.supabase
    .from("stores")
    .select("id")
    .eq("owner_id", ctx.userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Loja não encontrada");
  return data.id as string;
}

async function writeAudit(storeId: string, actorId: string, action: string, opts?: {
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

// ============== Catálogos ==============

export const listRolesAndPermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [roles, perms, rolePerms] = await Promise.all([
      context.supabase.from("team_roles").select("*").order("sort_order"),
      context.supabase.from("team_permissions").select("*").order("sort_order"),
      context.supabase.from("team_role_permissions").select("*"),
    ]);
    if (roles.error) throw new Error(roles.error.message);
    if (perms.error) throw new Error(perms.error.message);
    if (rolePerms.error) throw new Error(rolePerms.error.message);
    return {
      roles: roles.data ?? [],
      permissions: perms.data ?? [],
      rolePermissions: rolePerms.data ?? [],
    };
  });

// ============== Listagem de funcionários ==============

export const listEmployees = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const storeId = await getOwnedStoreId(context);
    const { data, error } = await context.supabase
      .from("store_employees")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getEmployeePermissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ employee_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await getOwnedStoreId(context); // apenas garante que é dono de alguma loja; RLS bloqueia demais
    const { data: rows, error } = await context.supabase
      .from("store_employee_permissions")
      .select("*")
      .eq("employee_id", data.employee_id);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ============== Criar funcionário ==============

const cpfSchema = z.string().trim().min(11).max(20).optional().nullable();
const emailSchema = z.string().trim().toLowerCase().email().max(255);
const nomeSchema = z.string().trim().min(2).max(120);
const phoneSchema = z.string().trim().max(30).optional().nullable();
const roleSchema = z.string().trim().min(1).max(60);
const passwordSchema = z.string().min(8, "Mínimo 8 caracteres").max(72);

export const createEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    nome: nomeSchema,
    cpf: cpfSchema,
    email: emailSchema,
    phone: phoneSchema,
    role_key: roleSchema,
    password: passwordSchema,
    overrides: z.array(z.object({
      permission_key: z.string(),
      granted: z.boolean(),
    })).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const storeId = await getOwnedStoreId(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1) confere se cargo existe
    const { data: role, error: rErr } = await supabaseAdmin
      .from("team_roles").select("key").eq("key", data.role_key).maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!role) throw new Error("Cargo inválido.");

    // 2) cria (ou reaproveita) o auth user
    let userId: string | null = null;
    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      // NÃO enviar CPF/telefone no user_metadata para evitar conflito com a trigger
      // handle_new_user (profiles.cpf tem unique index parcial). CPF do funcionário
      // fica registrado apenas na tabela store_employees.
      user_metadata: { full_name: data.nome },
    });
    if (cErr) {
      // e-mail já existe → localiza usuário e reaproveita
      let page = 1;
      while (page <= 10 && !userId) {
        const { data: list, error: lErr } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 200 });
        if (lErr) throw new Error(lErr.message);
        const found = list?.users?.find((u) => (u.email ?? "").toLowerCase() === data.email);
        if (found) userId = found.id;
        if (!list?.users || list.users.length < 200) break;
        page++;
      }
      if (!userId) throw new Error(cErr.message);
      // atualiza senha (owner acabou de definir credenciais)
      await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password });
    } else {
      userId = created.user?.id ?? null;
    }
    if (!userId) throw new Error("Não foi possível criar/localizar a conta.");

    // 3) cria vínculo (RLS: owner)
    const { data: emp, error: eErr } = await context.supabase
      .from("store_employees")
      .insert({
        store_id: storeId,
        user_id: userId,
        nome: data.nome,
        cpf: data.cpf ?? null,
        email: data.email,
        phone: data.phone ?? null,
        role_key: data.role_key,
        status: "ativo",
        created_by: context.userId,
      })
      .select()
      .single();
    if (eErr) throw new Error(eErr.message);

    await writeAudit(storeId, context.userId, "employee.created", {
      employeeId: emp.id, targetLabel: data.email, meta: { role_key: data.role_key },
    });

    // 4) aplica overrides de permissão iniciais (se informados)
    if (data.overrides && data.overrides.length) {
      const ins = await context.supabase
        .from("store_employee_permissions")
        .insert(data.overrides.map((o) => ({
          employee_id: emp.id,
          permission_key: o.permission_key,
          granted: o.granted,
        })));
      if (ins.error) throw new Error(ins.error.message);
    }
    return emp;
  });

// ============== Editar dados básicos ==============

export const updateEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    nome: nomeSchema.optional(),
    cpf: cpfSchema,
    phone: phoneSchema,
    role_key: roleSchema.optional(),
    status: z.enum(["ativo", "inativo"]).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const storeId = await getOwnedStoreId(context);
    const patch: {
      nome?: string; cpf?: string | null; phone?: string | null;
      role_key?: string; status?: "ativo" | "inativo";
    } = {};
    if (data.nome !== undefined) patch.nome = data.nome;
    if (data.cpf !== undefined) patch.cpf = data.cpf ?? null;
    if (data.phone !== undefined) patch.phone = data.phone ?? null;
    if (data.role_key !== undefined) patch.role_key = data.role_key;
    if (data.status !== undefined) patch.status = data.status;
    const { data: emp, error } = await context.supabase
      .from("store_employees")
      .update(patch)
      .eq("id", data.id)
      .eq("store_id", storeId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(storeId, context.userId, "employee.updated", {
      employeeId: emp.id, targetLabel: emp.email, meta: patch as Record<string, unknown>,
    });
    return emp;
  });

// ============== Toggle status ==============

export const setEmployeeStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    status: z.enum(["ativo", "inativo"]),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const storeId = await getOwnedStoreId(context);
    const { data: emp, error } = await context.supabase
      .from("store_employees")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("store_id", storeId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    await writeAudit(storeId, context.userId,
      data.status === "ativo" ? "employee.activated" : "employee.deactivated",
      { employeeId: emp.id, targetLabel: emp.email });
    return emp;
  });

// ============== Excluir ==============

export const deleteEmployee = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const storeId = await getOwnedStoreId(context);
    const { data: emp, error: gErr } = await context.supabase
      .from("store_employees")
      .select("id, email, user_id")
      .eq("id", data.id)
      .eq("store_id", storeId)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!emp) throw new Error("Funcionário não encontrado.");
    const { error } = await context.supabase
      .from("store_employees").delete().eq("id", data.id).eq("store_id", storeId);
    if (error) throw new Error(error.message);
    await writeAudit(storeId, context.userId, "employee.deleted", {
      targetLabel: emp.email, meta: { employee_id: emp.id },
    });
    return { ok: true };
  });

// ============== Redefinir senha ==============

export const resetEmployeePassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    id: z.string().uuid(),
    new_password: passwordSchema,
  }).parse(i))
  .handler(async ({ data, context }) => {
    const storeId = await getOwnedStoreId(context);
    const { data: emp, error: gErr } = await context.supabase
      .from("store_employees")
      .select("id, email, user_id")
      .eq("id", data.id)
      .eq("store_id", storeId)
      .maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!emp || !emp.user_id) throw new Error("Funcionário sem conta vinculada.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(emp.user_id, {
      password: data.new_password,
    });
    if (error) throw new Error(error.message);
    // força troca no próximo acesso
    await supabaseAdmin.from("store_employees")
      .update({ must_change_password: true })
      .eq("id", emp.id);
    await writeAudit(storeId, context.userId, "employee.password_reset", {
      employeeId: emp.id, targetLabel: emp.email,
    });
    return { ok: true };
  });

// ============== Permissões por funcionário ==============

export const setEmployeePermissionOverrides = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({
    employee_id: z.string().uuid(),
    overrides: z.array(z.object({
      permission_key: z.string(),
      granted: z.boolean(),
    })),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const storeId = await getOwnedStoreId(context);
    // sanity check — o employee pertence à loja
    const { data: emp, error: gErr } = await context.supabase
      .from("store_employees").select("id, email")
      .eq("id", data.employee_id).eq("store_id", storeId).maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!emp) throw new Error("Funcionário não encontrado.");

    // wipe + reinsert
    const del = await context.supabase
      .from("store_employee_permissions").delete().eq("employee_id", data.employee_id);
    if (del.error) throw new Error(del.error.message);
    if (data.overrides.length) {
      const ins = await context.supabase
        .from("store_employee_permissions")
        .insert(data.overrides.map((o) => ({
          employee_id: data.employee_id,
          permission_key: o.permission_key,
          granted: o.granted,
        })));
      if (ins.error) throw new Error(ins.error.message);
    }
    await writeAudit(storeId, context.userId, "employee.permissions_updated", {
      employeeId: emp.id, targetLabel: emp.email, meta: { count: data.overrides.length },
    });
    return { ok: true };
  });

// ============== Logs ==============

export const listEmployeeAuditLogs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const storeId = await getOwnedStoreId(context);
    const { data, error } = await context.supabase
      .from("employee_audit_logs")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ============== Contexto do funcionário logado ==============

/** Retorna o vínculo ativo do usuário logado (se existir) + permissões efetivas + loja. */
export const getMyEmployeeContext = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: emp, error } = await context.supabase
      .from("store_employees")
      .select("*")
      .eq("user_id", context.userId)
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!emp) return null;

    // permissões do cargo
    const rp = await context.supabase
      .from("team_role_permissions").select("permission_key").eq("role_key", emp.role_key);
    if (rp.error) throw new Error(rp.error.message);

    const ov = await context.supabase
      .from("store_employee_permissions").select("permission_key, granted").eq("employee_id", emp.id);
    if (ov.error) throw new Error(ov.error.message);

    const effective = new Set<string>((rp.data ?? []).map((r: any) => r.permission_key));
    for (const o of ov.data ?? []) {
      if (o.granted) effective.add(o.permission_key);
      else effective.delete(o.permission_key);
    }

    // loja (dados públicos básicos)
    const st = await context.supabase
      .from("stores")
      .select("id, slug, nome_fantasia, logo_url, brand_primary, brand_secondary, modalidade, regra_pontos, percentual_cashback, voucher_validade_dias")
      .eq("id", emp.store_id).maybeSingle();
    if (st.error) throw new Error(st.error.message);

    return {
      employee: emp,
      permissions: Array.from(effective),
      store: st.data,
    };
  });

/** Verifica se o usuário atual tem determinada permissão em sua loja de funcionário. */
export const checkMyPermission = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ permission: z.string() }).parse(i))
  .handler(async ({ data, context }) => {
    const { data: emp } = await context.supabase
      .from("store_employees").select("store_id, status")
      .eq("user_id", context.userId).eq("status", "ativo").maybeSingle();
    if (!emp) return { allowed: false };
    const { data: allowed, error } = await context.supabase
      .rpc("employee_has_permission", {
        _user_id: context.userId, _store_id: emp.store_id, _perm: data.permission,
      });
    if (error) throw new Error(error.message);
    return { allowed: allowed === true };
  });

// ============== Login por CPF (público) ==============

/** Resolve o e-mail interno do funcionário a partir do CPF, para o formulário de login. */
export const resolveFuncionarioEmailByCpf = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({ cpf: z.string().trim().min(11).max(20) }).parse(i))
  .handler(async ({ data }) => {
    const digits = data.cpf.replace(/\D+/g, "");
    if (digits.length < 11) throw new Error("CPF inválido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: emp, error } = await supabaseAdmin
      .from("store_employees")
      .select("email, status")
      .eq("cpf", digits)
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!emp) throw new Error("Funcionário não encontrado ou inativo.");
    return { email: emp.email as string };
  });

/** Troca a senha do funcionário logado e conclui o onboarding. */
export const trocarSenhaFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ password: passwordSchema }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const upd = await supabaseAdmin.auth.admin.updateUserById(context.userId, { password: data.password });
    if (upd.error) throw new Error(upd.error.message);
    const { data: emp, error } = await context.supabase
      .from("store_employees")
      .update({ must_change_password: false, first_login_at: new Date().toISOString() })
      .eq("user_id", context.userId)
      .eq("status", "ativo")
      .select("id, store_id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (emp) {
      await writeAudit(emp.store_id, context.userId, "employee.password_changed", {
        employeeId: emp.id,
      });
    }
    return { ok: true };
  });

// ============== Auditoria de login ==============

/** Registra o login bem-sucedido do funcionário. */
export const registrarLoginFuncionario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: emp } = await context.supabase
      .from("store_employees")
      .select("id, store_id, email, nome")
      .eq("user_id", context.userId).eq("status", "ativo").maybeSingle();
    if (!emp) return { ok: false };
    await logEmployeeAction({
      storeId: emp.store_id,
      actorUserId: context.userId,
      action: "employee.login",
      employeeId: emp.id,
      targetLabel: emp.email,
      meta: { nome: emp.nome, at: new Date().toISOString() },
    });
    return { ok: true };
  });

// ============== Recuperação de senha (CPF + telefone) ==============

/** Solicita ao gerente da loja a redefinição de senha; registra pedido na trilha de auditoria. */
export const solicitarRecuperacaoSenhaFuncionario = createServerFn({ method: "POST" })
  .inputValidator((i) => z.object({
    cpf: z.string().trim().min(11).max(20),
    phone: z.string().trim().min(8).max(30),
  }).parse(i))
  .handler(async ({ data }) => {
    const cpfDigits = data.cpf.replace(/\D+/g, "");
    const phoneDigits = data.phone.replace(/\D+/g, "");
    if (cpfDigits.length < 11) throw new Error("CPF inválido.");
    if (phoneDigits.length < 8) throw new Error("Telefone inválido.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: emp } = await supabaseAdmin
      .from("store_employees")
      .select("id, store_id, email, nome, phone, user_id")
      .eq("cpf", cpfDigits).eq("status", "ativo")
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    // Resposta genérica: nunca revelamos se o CPF existe ou se o telefone confere.
    if (!emp) return { ok: true };
    const empPhone = (emp.phone ?? "").replace(/\D+/g, "");
    if (empPhone && empPhone.slice(-8) !== phoneDigits.slice(-8)) return { ok: true };
    // Registra pedido no log para o gerente aprovar em "Equipe → Redefinir senha".
    await supabaseAdmin.from("employee_audit_logs").insert({
      store_id: emp.store_id,
      actor_user_id: emp.user_id,
      employee_id: emp.id,
      action: "employee.password_recovery_requested",
      target_label: emp.email,
      meta: { nome: emp.nome, phone_last4: phoneDigits.slice(-4), at: new Date().toISOString() } as never,
    });
    return { ok: true };
  });