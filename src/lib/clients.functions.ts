import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  cpfToEmail,
  isValidCPF,
} from "./qsf-shared";
import { rateLimitByIp } from "./sfn-rate-limit.server";

const SYNTHETIC_EMAIL_DOMAIN = "@cliente.qsfclub.local";

/** E-mail sintético (derivado do CPF) usado quando o cliente não informou e-mail real. */
function isSyntheticEmail(email: string | null | undefined): boolean {
  return !email || email.toLowerCase().endsWith(SYNTHETIC_EMAIL_DOMAIN);
}

/**
 * Envia o link de definição de senha pelo e-mail nativo do Supabase (grátis).
 * Usado quando o lojista/vendedor informa o e-mail real do cliente: nenhuma
 * senha provisória previsível é criada — o cliente define a própria senha.
 */
async function enviarLinkDefinirSenha(email: string): Promise<boolean> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const base = (process.env.PUBLIC_APP_URL ?? "https://pontuamax.com").replace(/\/+$/, "");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(email, {
      redirectTo: `${base}/redefinir-senha`,
    });
    if (error) {
      console.error("[clientes] falha ao enviar link de senha:", error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error("[clientes] falha ao enviar link de senha:", (e as Error).message);
    return false;
  }
}

/**
 * Resolve o e-mail de login a partir do CPF. O cliente sempre digita o CPF;
 * internamente a conta pode ter e-mail real (informado pela loja) ou o
 * e-mail sintético. Rate-limited para evitar enumeração em massa.
 */
export const resolveClienteEmailByCpf = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ cpf: z.string().min(11).max(20) }).parse(input))
  .handler(async ({ data }) => {
    const cpfDigits = data.cpf.replace(/\D/g, "");
    const fallback = cpfToEmail(cpfDigits);
    if (!isValidCPF(cpfDigits)) return { email: fallback };
    await rateLimitByIp("resolve-cliente-email", 20, 300);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profile = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("cpf", cpfDigits)
      .maybeSingle();
    if (!profile.data) return { email: fallback };
    const user = await supabaseAdmin.auth.admin.getUserById(profile.data.id);
    return { email: user.data.user?.email ?? fallback };
  });

export const sincronizarClientesDaLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) throw new Error("Loja não encontrada.");
    const storeId = store.data.id;

    const [tx, notas, links] = await Promise.all([
      supabaseAdmin.from("transactions").select("client_user_id").eq("store_id", storeId),
      supabaseAdmin.from("fiscal_notes").select("client_user_id").eq("store_id", storeId),
      supabaseAdmin.from("store_clients").select("user_id").eq("store_id", storeId),
    ]);

    const linked = new Set((links.data ?? []).map((r) => r.user_id));
    const candidates = new Set<string>();
    for (const r of tx.data ?? [])
      if (r.client_user_id && !linked.has(r.client_user_id)) candidates.add(r.client_user_id);
    for (const r of notas.data ?? [])
      if (r.client_user_id && !linked.has(r.client_user_id)) candidates.add(r.client_user_id);

    let criados = 0;
    if (candidates.size > 0) {
      const rows = Array.from(candidates).map((user_id) => ({ store_id: storeId, user_id }));
      const ins = await supabaseAdmin
        .from("store_clients")
        .upsert(rows, { onConflict: "store_id,user_id", ignoreDuplicates: true })
        .select("id");
      criados = ins.data?.length ?? 0;
    }
    return { criados, ja_vinculados: linked.size, total: linked.size + criados };
  });

// -------- LOJISTA: create store after signup --------

export const vincularClienteALoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        referrer_phone: z.string().max(20).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "cliente" }, { onConflict: "user_id,role" });

    // Helper: registra tentativa/resultado do vínculo no integration_logs
    // para o lojista conseguir auditar cadastros vindos da página pública.
    const logVinculo = async (
      status: "sucesso" | "erro",
      mensagem: string | null,
      payload: Record<string, unknown>,
    ) => {
      try {
        await supabaseAdmin.from("integration_logs").insert({
          store_id: data.store_id,
          origem: "pagina_publica",
          status,
          mensagem_erro: status === "erro" ? mensagem : null,
          payload_recebido: payload as never,
        });
      } catch {
        // log é best-effort, nunca deve derrubar o vínculo
      }
    };

    // Valida existência da loja antes de qualquer coisa
    const lojaCheck = await supabaseAdmin
      .from("stores")
      .select("id, slug, owner_id")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!lojaCheck.data) {
      await logVinculo("erro", "loja não encontrada", { user_id: context.userId });
      throw new Error("Loja não encontrada.");
    }

    // MERGE de "cadastro pendente" por CPF: se o webhook (Olist/Bling) já
    // criou um perfil sintético com o mesmo CPF do usuário que acabou de se
    // autenticar, transferimos pontos/cashback/transações para a conta real
    // e removemos o perfil pendente. Isso evita duplicatas visíveis no
    // painel do lojista com o mesmo CPF.
    const meuProfile = await supabaseAdmin
      .from("profiles")
      .select("id, cpf")
      .eq("id", context.userId)
      .maybeSingle();
    const cpfMeu = (meuProfile.data?.cpf ?? "").replace(/\D/g, "");
    if (cpfMeu && cpfMeu.length === 11) {
      const pendentes = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("cpf", cpfMeu)
        .neq("id", context.userId);
      for (const p of pendentes.data ?? []) {
        try {
          // Transferir vínculos da loja atual
          const linkPend = await supabaseAdmin
            .from("store_clients")
            .select("*")
            .eq("user_id", p.id);
          for (const linkOld of linkPend.data ?? []) {
            const linkNew = await supabaseAdmin
              .from("store_clients")
              .select("*")
              .eq("store_id", linkOld.store_id)
              .eq("user_id", context.userId)
              .maybeSingle();
            if (linkNew.data) {
              // já existe → soma saldos
              const novoPontos = (linkNew.data.pontos ?? 0) + (linkOld.pontos ?? 0);
              const novoCash =
                Math.round(
                  ((Number(linkNew.data.cashback_saldo) || 0) +
                    (Number(linkOld.cashback_saldo) || 0)) *
                    100,
                ) / 100;
              await supabaseAdmin
                .from("store_clients")
                .update({
                  pontos: novoPontos,
                  cashback_saldo: novoCash,
                  pending_registration: false,
                })
                .eq("id", linkNew.data.id);
              await supabaseAdmin.from("store_clients").delete().eq("id", linkOld.id);
            } else {
              // transferir para o usuário atual
              await supabaseAdmin
                .from("store_clients")
                .update({ user_id: context.userId, pending_registration: false })
                .eq("id", linkOld.id);
            }
          }
          // Reapontar transações e notas fiscais
          await supabaseAdmin
            .from("transactions")
            .update({ client_user_id: context.userId })
            .eq("client_user_id", p.id);
          await supabaseAdmin
            .from("fiscal_notes")
            .update({ client_user_id: context.userId })
            .eq("client_user_id", p.id);
          // Remover roles/profile e auth user pendente
          await supabaseAdmin.from("user_roles").delete().eq("user_id", p.id);
          await supabaseAdmin.from("profiles").delete().eq("id", p.id);
          await supabaseAdmin.auth.admin.deleteUser(p.id);
        } catch (mergeErr) {
          await logVinculo("erro", `merge pendente falhou: ${(mergeErr as Error).message}`, {
            user_id: context.userId,
            pending_id: p.id,
          });
        }
      }
    }

    // Verifica se já existe link (para não sobrescrever referrer)
    const existing = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", data.store_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing.data) {
      // Se o cliente estava marcado como "cadastro pendente" (criado por
      // venda antes do auto-cadastro), agora que ele autenticou o cadastro
      // está completo — zera a flag para o badge sumir no painel do lojista.
      if (existing.data.pending_registration) {
        await supabaseAdmin
          .from("store_clients")
          .update({ pending_registration: false })
          .eq("id", existing.data.id);
        existing.data.pending_registration = false;
      }
      await logVinculo("sucesso", null, {
        user_id: context.userId,
        store_slug: lojaCheck.data.slug,
        ja_vinculado: true,
        link_id: existing.data.id,
      });
      return existing.data;
    }

    // Resolve referrer pelo telefone
    let referrer_user_id: string | null = null;
    if (data.referrer_phone) {
      const digits = data.referrer_phone.replace(/\D/g, "");
      if (digits.length >= 8) {
        const prof = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("phone", digits)
          .maybeSingle();
        if (prof.data && prof.data.id !== context.userId) {
          // indicador precisa ser cliente da mesma loja
          const refLink = await supabaseAdmin
            .from("store_clients")
            .select("id")
            .eq("store_id", data.store_id)
            .eq("user_id", prof.data.id)
            .maybeSingle();
          if (refLink.data) referrer_user_id = prof.data.id;
        }
      }
    }
    const { data: link, error } = await supabaseAdmin
      .from("store_clients")
      .upsert(
        {
          store_id: data.store_id,
          user_id: context.userId,
          referrer_user_id,
          pending_registration: false,
        },
        { onConflict: "store_id,user_id", ignoreDuplicates: false },
      )
      .select("*")
      .single();
    if (error) {
      await logVinculo("erro", error.message, {
        user_id: context.userId,
        store_slug: lojaCheck.data.slug,
        referrer_user_id,
      });
      throw new Error(error.message);
    }

    // Validação pós-insert: re-lê a linha exatamente como o painel do lojista lê,
    // garantindo que store_id/user_id foram gravados corretamente e que o join
    // com profiles está resolvendo. Se algo estiver inconsistente, registramos.
    const verify = await supabaseAdmin
      .from("store_clients")
      .select(
        "id, store_id, user_id, pontos, cashback_saldo, profiles:user_id(full_name, cpf, phone)",
      )
      .eq("id", link.id)
      .maybeSingle();

    const verifyOk =
      !!verify.data &&
      verify.data.store_id === data.store_id &&
      verify.data.user_id === context.userId;

    await logVinculo(
      verifyOk ? "sucesso" : "erro",
      verifyOk ? null : (verify.error?.message ?? "verificação pós-insert falhou"),
      {
        user_id: context.userId,
        store_slug: lojaCheck.data.slug,
        link_id: link.id,
        profile_encontrado: !!verify.data?.profiles,
        profile_nome: (verify.data?.profiles as { full_name?: string } | null)?.full_name ?? null,
      },
    );

    if (!verifyOk) {
      throw new Error(
        "Cliente foi criado mas não pôde ser confirmado no painel — tente novamente.",
      );
    }
    return link;
  });

// -------- CLIENTE: reivindicar cadastro pendente criado por venda --------
// Quando o lojista lança uma venda (ou o webhook recebe uma venda) para um CPF
// que ainda não tem conta, criamos um profile "pendente" — sem senha real
// definida pelo cliente. Quando esse cliente se auto-cadastra pela página
// pública com o mesmo CPF, esta função REAPROVEITA a conta existente (mesmo
// user_id, mesmo saldo de pontos/cashback), apenas definindo a senha e o nome
// escolhidos por ele. Assim NUNCA cria uma segunda conta com o mesmo CPF.
//
// SEGURANÇA: conhecer o CPF não é prova de posse. Quando o cadastro pendente
// já tem telefone registrado (caso do cadastro feito pelo lojista/vendedor),
// exigimos que o telefone informado confira. Só é possível reivindicar contas
// que NUNCA fizeram login.

export const reivindicarCadastroPendente = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        cpf: z.string().min(11).max(20),
        senha: z.string().min(6).max(72),
        nome: z.string().min(1).max(100),
        phone: z.string().max(20).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await rateLimitByIp("claim-cadastro-pendente", 5, 300);
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (!isValidCPF(cpfDigits)) return { claimed: false as const, reason: "invalid" as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profile = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .eq("cpf", cpfDigits)
      .maybeSingle();
    if (!profile.data) return { claimed: false as const, reason: "not_found" as const };

    const current = await supabaseAdmin.auth.admin.getUserById(profile.data.id);
    const user = current.data.user;
    // Só reivindica se a conta nunca foi usada de fato pelo cliente. Se ela
    // já tem last_sign_in_at, o cadastro foi completado antes — nesse caso
    // devolve claimed:false e o frontend segue para o fluxo normal, que vai
    // detectar "usuário já cadastrado" e sugerir login.
    if (!user || user.last_sign_in_at)
      return { claimed: false as const, reason: "already_active" as const };

    const informado = (data.phone ?? "").replace(/\D/g, "");
    const registrado = (profile.data.phone ?? "").replace(/\D/g, "");
    // Prova de posse: se a loja registrou telefone, ele precisa bater
    // (comparação pelos últimos 8 dígitos, ignorando DDI/DDD divergentes).
    if (registrado.length >= 8) {
      const tail = (v: string) => v.slice(-8);
      if (informado.length < 8 || tail(informado) !== tail(registrado)) {
        return { claimed: false as const, reason: "phone_mismatch" as const };
      }
    }
    const phoneDigits = informado || registrado || null;
    // Preserva e-mail real informado pela loja; só normaliza para o sintético
    // quando a conta ainda não tem e-mail de verdade.
    const email = isSyntheticEmail(user.email) ? cpfToEmail(cpfDigits) : user.email!;
    const updated = await supabaseAdmin.auth.admin.updateUserById(profile.data.id, {
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: {
        ...(user.user_metadata ?? {}),
        full_name: data.nome,
        phone: phoneDigits,
        cpf: cpfDigits,
      },
    });
    if (updated.error) throw new Error(updated.error.message);

    await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.nome, phone: phoneDigits, cpf: cpfDigits })
      .eq("id", profile.data.id);

    // Marca como cadastro completo em TODAS as lojas onde este CPF estava
    // pendente (pode ter comprado em mais de uma loja antes de se cadastrar).
    await supabaseAdmin
      .from("store_clients")
      .update({ pending_registration: false })
      .eq("user_id", profile.data.id)
      .eq("pending_registration", true);

    return { claimed: true as const, reason: "ok" as const, email };
  });

// -------- CLIENTE: criar conta via CPF (sem confirmação de email) --------

export const criarClienteViaCpf = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        cpf: z.string().min(11).max(20),
        senha: z.string().min(6).max(72),
        nome: z.string().min(1).max(100),
        phone: z.string().max(20).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await rateLimitByIp("criar-cliente-cpf", 5, 60);
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (!isValidCPF(cpfDigits)) throw new Error("CPF inválido.");
    const phoneDigits = (data.phone ?? "").replace(/\D/g, "") || null;
    let email = cpfToEmail(cpfDigits);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("cpf", cpfDigits)
      .maybeSingle();
    if (existing.data) {
      const cur = await supabaseAdmin.auth.admin.getUserById(existing.data.id);
      if (cur.data.user && cur.data.user.last_sign_in_at) {
        throw new Error("Já existe uma conta com este CPF. Faça login.");
      }
      // Preserva e-mail real cadastrado pela loja.
      if (!isSyntheticEmail(cur.data.user?.email)) email = cur.data.user!.email!;
      const upd = await supabaseAdmin.auth.admin.updateUserById(existing.data.id, {
        email,
        password: data.senha,
        email_confirm: true,
        user_metadata: {
          ...(cur.data.user?.user_metadata ?? {}),
          full_name: data.nome,
          phone: phoneDigits,
          cpf: cpfDigits,
        },
      });
      if (upd.error) throw new Error(upd.error.message);
      await supabaseAdmin
        .from("profiles")
        .update({ full_name: data.nome, phone: phoneDigits, cpf: cpfDigits })
        .eq("id", existing.data.id);
      await supabaseAdmin
        .from("store_clients")
        .update({ pending_registration: false })
        .eq("user_id", existing.data.id)
        .eq("pending_registration", true);
      return { email };
    }
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { full_name: data.nome, phone: phoneDigits, cpf: cpfDigits },
    });
    if (created.error || !created.data.user) {
      throw new Error(created.error?.message ?? "Falha ao criar conta.");
    }
    await supabaseAdmin.from("profiles").upsert({
      id: created.data.user.id,
      full_name: data.nome,
      phone: phoneDigits,
      cpf: cpfDigits,
    });
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: created.data.user.id, role: "cliente" as const },
        { onConflict: "user_id,role" },
      );
    return { email };
  });

// -------- LOJISTA: cadastrar novo cliente pelo CPF (durante lançar venda) --------
// Identidade única do cliente = CPF. Cria/normaliza auth user com email sintético
// baseado no CPF (fonte da verdade) e senha temporária = CPF (só dígitos).

export const cadastrarClientePorTelefone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        phone: z.string().min(8).max(20),
        nome: z.string().min(1).max(100),
        store_id: z.string().uuid(),
        // CPF é a chave única de identidade do cliente — obrigatório
        // para evitar cadastros incompletos que colidem depois com o
        // auto-cadastro do cliente pelo mesmo CPF.
        cpf: z.string().min(11).max(20),
        // E-mail real (opcional). Se informado, o cliente recebe por e-mail
        // o link para definir a própria senha — nenhuma senha previsível.
        email: z.string().email().max(120).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storePerm = await supabaseAdmin
      .from("stores")
      .select("id, owner_id")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!storePerm.data) throw new Error("Loja inválida.");
    if (storePerm.data.owner_id !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: data.store_id,
        _perm: "clientes.cadastrar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para cadastrar clientes nesta loja.");
    }
    const digits = data.phone.replace(/\D/g, "");
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (digits.length < 8) throw new Error("Telefone inválido.");
    if (cpfDigits.length !== 11) throw new Error("CPF deve conter 11 dígitos.");
    if (!isValidCPF(cpfDigits)) throw new Error("CPF inválido.");

    // Estratégia: CPF é a chave única do cliente. Se existir perfil com este
    // CPF (mesmo que criado por webhook como "cadastro pendente"), REUSA e
    // completa os dados. Só bloqueia se outro cliente da loja tiver o mesmo
    // telefone mas CPF diferente (colisão real).
    let existingByCpf: { id: string; phone: string | null; cpf: string | null } | null = null;
    if (cpfDigits) {
      const byCpfAll = await supabaseAdmin
        .from("profiles")
        .select("id, phone, cpf")
        .eq("cpf", cpfDigits);
      existingByCpf = (byCpfAll.data ?? [])[0] ?? null;
    }

    // Colisão de telefone com outro CPF já cadastrado nesta loja.
    if (digits) {
      const byPhone = await supabaseAdmin.from("profiles").select("id, cpf").eq("phone", digits);
      const phoneOwners = (byPhone.data ?? []).filter(
        (p) => p.id !== existingByCpf?.id && (!cpfDigits || p.cpf !== cpfDigits),
      );
      if (phoneOwners.length > 0) {
        const otherIds = phoneOwners.map((p) => p.id);
        const links = await supabaseAdmin
          .from("store_clients")
          .select("user_id")
          .eq("store_id", data.store_id)
          .in("user_id", otherIds);
        if ((links.data ?? []).length > 0) {
          throw new Error("Já existe outro cliente nesta loja com este telefone (CPF diferente).");
        }
      }
    }

    // Cliente sempre digita o CPF para entrar. O e-mail da conta é o real
    // (quando informado) ou o sintético derivado do CPF.
    const emailReal = (data.email ?? "").trim().toLowerCase() || null;
    let email = emailReal ?? cpfToEmail(cpfDigits);
    let userId: string | undefined;
    const existing = existingByCpf
      ? { data: { id: existingByCpf.id } }
      : await supabaseAdmin.from("profiles").select("id").eq("phone", digits).maybeSingle();
    if (existing.data) {
      userId = existing.data.id;
      if (!emailReal) {
        const cur = await supabaseAdmin.auth.admin.getUserById(userId);
        if (!isSyntheticEmail(cur.data.user?.email)) email = cur.data.user!.email!;
      }
      const patch: { phone: string; cpf?: string } = { phone: digits };
      if (cpfDigits) patch.cpf = cpfDigits;
      await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
      // SEGURANÇA: não definimos senha aqui. O cliente define a própria senha
      // ao ativar a conta na página da loja (CPF + telefone conferem).
      const normalized = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        email_confirm: true,
        user_metadata: { full_name: data.nome, phone: digits, cpf: cpfDigits },
      });
      if (normalized.error && !/already|exists|registered/i.test(normalized.error.message)) {
        throw new Error(normalized.error.message);
      }
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: data.nome, phone: digits, cpf: cpfDigits || null },
      });
      if (created.error || !created.data.user)
        throw new Error(created.error?.message ?? "Falha ao criar cliente");
      userId = created.data.user.id;
      // Ensure profile exists (trigger handles it, but idempotent)
      await supabaseAdmin
        .from("profiles")
        .upsert({ id: userId, full_name: data.nome, phone: digits, cpf: cpfDigits || null });
    }
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: "cliente" }, { onConflict: "user_id,role" });
    const { data: link, error } = await supabaseAdmin
      .from("store_clients")
      .upsert(
        { store_id: data.store_id, user_id: userId, pending_registration: false },
        { onConflict: "store_id,user_id" },
      )
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    const emailEnviado = emailReal ? await enviarLinkDefinirSenha(emailReal) : false;
    return { user_id: userId, link, login_email: email, email_enviado: emailEnviado };
  });

// -------- Lançar venda (lojista) --------

export const atualizarAniversarioCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        client_user_id: z.string().uuid(),
        store_id: z.string().uuid(),
        birthdate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storePerm = await supabaseAdmin
      .from("stores")
      .select("id, owner_id")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!storePerm.data) throw new Error("Loja inválida.");
    if (storePerm.data.owner_id !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: data.store_id,
        _perm: "clientes.editar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para editar clientes nesta loja.");
    }
    const link = await supabaseAdmin
      .from("store_clients")
      .select("id")
      .eq("store_id", data.store_id)
      .eq("user_id", data.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ birthdate: data.birthdate })
      .eq("id", data.client_user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- LOJISTA: atualizar dados básicos do cliente (nome / telefone / CPF) --------

export const atualizarClienteInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        client_user_id: z.string().uuid(),
        full_name: z.string().min(1).max(120),
        phone: z.string().min(8).max(20),
        cpf: z.string().min(11).max(20),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storePerm = await supabaseAdmin
      .from("stores")
      .select("id, owner_id")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!storePerm.data) throw new Error("Loja inválida.");
    if (storePerm.data.owner_id !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: data.store_id,
        _perm: "clientes.editar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para editar clientes nesta loja.");
    }
    const link = await supabaseAdmin
      .from("store_clients")
      .select("id")
      .eq("store_id", data.store_id)
      .eq("user_id", data.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");

    const phoneDigits = data.phone.replace(/\D/g, "");
    if (phoneDigits.length < 8) throw new Error("Telefone inválido.");
    const cpfDigits = (data.cpf ?? "").replace(/\D/g, "");
    if (cpfDigits.length !== 11) throw new Error("CPF é obrigatório e deve conter 11 dígitos.");

    // Duplicidade dentro da mesma loja (outros clientes com mesmo telefone/CPF)
    const orClauses = [`phone.eq.${phoneDigits}`, `cpf.eq.${cpfDigits}`];
    const dup = await supabaseAdmin
      .from("profiles")
      .select("id, phone, cpf")
      .or(orClauses.join(","))
      .neq("id", data.client_user_id);
    const dupIds = (dup.data ?? []).map((p) => p.id);
    if (dupIds.length > 0) {
      const links = await supabaseAdmin
        .from("store_clients")
        .select("user_id")
        .eq("store_id", data.store_id)
        .in("user_id", dupIds);
      if ((links.data ?? []).length > 0) {
        const conflict = dup.data!.find((p) => links.data!.some((l) => l.user_id === p.id));
        if (conflict?.phone === phoneDigits)
          throw new Error("Já existe outro cliente nesta loja com este telefone.");
        if (conflict?.cpf === cpfDigits)
          throw new Error("Já existe outro cliente nesta loja com este CPF.");
        throw new Error("Já existe outro cliente nesta loja com este telefone ou CPF.");
      }
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name.trim(), phone: phoneDigits, cpf: cpfDigits })
      .eq("id", data.client_user_id);
    if (error) throw new Error(error.message);
    // Cadastro completo pelo lojista → tira o status "pendente" nesta loja.
    await supabaseAdmin
      .from("store_clients")
      .update({ pending_registration: false })
      .eq("store_id", data.store_id)
      .eq("user_id", data.client_user_id);
    return { ok: true };
  });

// -------- LOJISTA: ajustar pontos do cliente (adicionar ou estornar) --------

export const addClientTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        client_user_id: z.string().uuid(),
        tag: z.string().min(1).max(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("owner_id")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja inválida.");
    if (loja.data.owner_id !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: data.store_id,
        _perm: "clientes.editar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para editar etiquetas de clientes.");
    }
    const { error } = await supabaseAdmin.from("client_tags").insert({
      store_id: data.store_id,
      client_user_id: data.client_user_id,
      tag: data.tag.trim().toLowerCase(),
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const removeClientTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = await supabaseAdmin
      .from("client_tags")
      .select("id, store_id, stores:store_id(owner_id)")
      .eq("id", data.id)
      .maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    if (!t.data) throw new Error("Tag não encontrada.");
    if ((t.data as any).stores.owner_id !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: (t.data as any).store_id,
        _perm: "clientes.editar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Tag não encontrada.");
    }
    await supabaseAdmin.from("client_tags").delete().eq("id", data.id);
    return { ok: true };
  });

// -------- LOJISTA: excluir vínculo de um cliente da sua loja --------
// Remove somente o vínculo (store_clients) — não apaga o usuário do auth,
// pois ele pode ser cliente de outras lojas. Remove também tags específicas
// deste cliente nesta loja.

export const excluirClienteDaLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        client_user_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("id", data.store_id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!owner.data) throw new Error("Você não é dono desta loja.");

    // Apaga TUDO deste cliente nesta loja (fidelidade zerada nesta loja)
    const sid = data.store_id;
    const uid = data.client_user_id;

    // 1) Tags
    await supabaseAdmin.from("client_tags").delete().eq("store_id", sid).eq("client_user_id", uid);
    // 2) Transações (pontos, cashback, estornos, resgates)
    await supabaseAdmin.from("transactions").delete().eq("store_id", sid).eq("client_user_id", uid);
    // 3) Notas fiscais enviadas
    await supabaseAdmin.from("fiscal_notes").delete().eq("store_id", sid).eq("client_user_id", uid);
    // 4) Respostas de NPS
    await supabaseAdmin
      .from("nps_responses")
      .delete()
      .eq("store_id", sid)
      .eq("client_user_id", uid);
    // 5) Logs de notificação
    await supabaseAdmin
      .from("notification_logs")
      .delete()
      .eq("store_id", sid)
      .eq("client_user_id", uid);
    // 6) Destinatários de campanhas (apaga por campanhas desta loja)
    const camps = await supabaseAdmin.from("campaigns").select("id").eq("store_id", sid);
    const campIds = (camps.data ?? []).map((c) => c.id);
    if (campIds.length) {
      await supabaseAdmin
        .from("campaign_recipients")
        .delete()
        .eq("client_user_id", uid)
        .in("campaign_id", campIds);
    }
    // 7) Vales-presente resgatados por este cliente nesta loja: soltar o resgate
    await supabaseAdmin
      .from("gift_cards")
      .update({ redeemed_by: null, redeemed_at: null })
      .eq("store_id", sid)
      .eq("redeemed_by", uid);

    // 8) Vínculo com a loja (por último)
    const del = await supabaseAdmin
      .from("store_clients")
      .delete()
      .eq("store_id", sid)
      .eq("user_id", uid)
      .select("id");
    if (del.error) throw new Error(del.error.message);
    if (!del.data || del.data.length === 0)
      throw new Error("Cliente não estava vinculado a esta loja.");

    // 9) Se o cliente não pertence a nenhuma outra loja, remover profile e conta de auth
    // (libera CPF/telefone para novo cadastro do zero).
    const outros = await supabaseAdmin
      .from("store_clients")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid);
    const restantes = outros.count ?? 0;
    let auth_removido = false;
    if (restantes === 0) {
      // profile
      await supabaseAdmin.from("profiles").delete().eq("id", uid);
      // auth user
      const authDel = await supabaseAdmin.auth.admin.deleteUser(uid);
      if (!authDel.error) auth_removido = true;
    }
    return { ok: true, auth_removido };
  });

