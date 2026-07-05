import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel, cpfToEmail, gerarVoucher, isValidCPF } from "./qsf-shared";

// -------- LOJISTA: sincronizar clientes órfãos --------
// Reprocessa cadastros da página pública: para toda transação/nota fiscal desta
// loja cujo cliente ainda não tem link em store_clients, cria o vínculo.
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
    for (const r of tx.data ?? []) if (r.client_user_id && !linked.has(r.client_user_id)) candidates.add(r.client_user_id);
    for (const r of notas.data ?? []) if (r.client_user_id && !linked.has(r.client_user_id)) candidates.add(r.client_user_id);

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


// -------- Promoções: multiplicador ativo agora --------
function getActiveMultiplier(
  promos: Array<{
    multiplicador: number | string;
    dias_semana: number[];
    hora_inicio: string;
    hora_fim: string;
    data_inicio: string | null;
    data_fim: string | null;
  }>,
): number {
  // Hora de Brasília
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = map[parts.weekday] ?? 0;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const hm = `${parts.hour}:${parts.minute}`;
  let mult = 1;
  for (const p of promos) {
    if (!p.dias_semana.includes(dow)) continue;
    if (p.data_inicio && date < p.data_inicio) continue;
    if (p.data_fim && date > p.data_fim) continue;
    const hi = p.hora_inicio.slice(0, 5);
    const hf = p.hora_fim.slice(0, 5);
    if (hm < hi || hm > hf) continue;
    const m = Number(p.multiplicador);
    if (m > mult) mult = m;
  }
  return mult;
}

// -------- LOJISTA: create store after signup --------
export const criarLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        slug: z.string().min(2).max(30),
        nome_fantasia: z.string().min(1).max(100),
        cnpj: z.string().max(20).optional().nullable(),
        telefone: z.string().max(30).optional().nullable(),
        modalidade: z.enum(["pontos", "cashback", "ambos"]),
        regra_pontos: z.number().min(0).max(100),
        percentual_cashback: z.number().min(0).max(100),
        brand_primary: z.string().max(20),
        brand_secondary: z.string().max(20),
        logo_url: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing = await supabaseAdmin.from("stores").select("id").eq("slug", data.slug).maybeSingle();
    if (existing.data) throw new Error("Este slug já está em uso, escolha outro.");
    const ownerCheck = await supabaseAdmin.from("stores").select("id").eq("owner_id", context.userId).maybeSingle();
    if (ownerCheck.data) throw new Error("Este usuário já possui uma loja.");
    const { data: loja, error } = await supabaseAdmin
      .from("stores")
      .insert({ ...data, owner_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("user_roles").upsert({ user_id: context.userId, role: "lojista" }, { onConflict: "user_id,role" });
    return loja;
  });

export const atualizarLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        nome_fantasia: z.string().min(1).max(100).optional(),
        cnpj: z.string().max(20).optional().nullable(),
        telefone: z.string().max(30).optional().nullable(),
        modalidade: z.enum(["pontos", "cashback", "ambos"]).optional(),
        regra_pontos: z.number().min(0).max(100).optional(),
        percentual_cashback: z.number().min(0).max(100).optional(),
        brand_primary: z.string().max(20).optional(),
        brand_secondary: z.string().max(20).optional(),
        logo_url: z.string().max(500).optional().nullable(),
        banner_url: z.string().max(500).optional().nullable(),
        banner_url_mobile: z.string().max(500).optional().nullable(),
        indicacao_ativa: z.boolean().optional(),
        bonus_indicador: z.number().int().min(0).max(10000).optional(),
        bonus_indicado: z.number().int().min(0).max(10000).optional(),
        nps_enabled: z.boolean().optional(),
        nps_ask_comment: z.boolean().optional(),
        nps_template: z.string().min(1).max(2000).optional(),
        voucher_validade_dias: z.number().int().min(1).max(365).optional(),
        voucher_visivel_apos_uso: z.boolean().optional(),
        voucher_mostrar_expirados: z.boolean().optional(),
        instagram_program_active: z.boolean().optional(),
        instagram_handle: z.string().max(60).optional().nullable(),
        instagram_points_per_post: z.number().int().min(1).max(100_000).optional(),
        instagram_min_days_live: z.number().int().min(0).max(365).optional(),
        instagram_instructions: z.string().max(2000).optional().nullable(),
        pontos_expiracao_modo: z.enum(["nenhum", "validade", "decaimento"]).optional(),
        pontos_validade_dias: z.number().int().min(1).max(3650).optional(),
        pontos_decaimento_dias: z.number().int().min(1).max(365).optional(),
        pontos_decaimento_valor: z.number().int().min(1).max(100_000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stores").update(data).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- CLIENTE: link authenticated user to a store --------
export const vincularClienteALoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      store_id: z.string().uuid(),
      referrer_phone: z.string().max(20).optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").upsert({ user_id: context.userId, role: "cliente" }, { onConflict: "user_id,role" });

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

    // Verifica se já existe link (para não sobrescrever referrer)
    const existing = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", data.store_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing.data) {
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
        const prof = await supabaseAdmin.from("profiles").select("id").eq("phone", digits).maybeSingle();
        if (prof.data && prof.data.id !== context.userId) {
          // indicador precisa ser cliente da mesma loja
          const refLink = await supabaseAdmin
            .from("store_clients").select("id")
            .eq("store_id", data.store_id).eq("user_id", prof.data.id).maybeSingle();
          if (refLink.data) referrer_user_id = prof.data.id;
        }
      }
    }
    const { data: link, error } = await supabaseAdmin
      .from("store_clients")
      .insert({ store_id: data.store_id, user_id: context.userId, referrer_user_id })
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
      .select("id, store_id, user_id, pontos, cashback_saldo, profiles:user_id(full_name, cpf, phone)")
      .eq("id", link.id)
      .maybeSingle();

    const verifyOk =
      !!verify.data &&
      verify.data.store_id === data.store_id &&
      verify.data.user_id === context.userId;

    await logVinculo(verifyOk ? "sucesso" : "erro", verifyOk ? null : (verify.error?.message ?? "verificação pós-insert falhou"), {
      user_id: context.userId,
      store_slug: lojaCheck.data.slug,
      link_id: link.id,
      profile_encontrado: !!verify.data?.profiles,
      profile_nome: (verify.data?.profiles as { full_name?: string } | null)?.full_name ?? null,
    });

    if (!verifyOk) {
      throw new Error("Cliente foi criado mas não pôde ser confirmado no painel — tente novamente.");
    }
    return link;
  });

// -------- CLIENTE: normalizar login legado para CPF --------
// Clientes criados pelo lojista em versões antigas podiam estar com e-mail
// sintético por telefone. Se o cliente entra com CPF + senha inicial CPF,
// normalizamos a conta existente vinculada à loja para o e-mail por CPF.
export const prepararLoginClientePorCpf = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({
      store_id: z.string().uuid(),
      cpf: z.string().min(11).max(20),
      senha: z.string().min(6).max(72),
    }).parse(input),
  )
  .handler(async ({ data }) => {
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (!isValidCPF(cpfDigits) || data.senha !== cpfDigits) return { normalized: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profile = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone, cpf")
      .eq("cpf", cpfDigits)
      .maybeSingle();
    if (!profile.data) return { normalized: false };

    const link = await supabaseAdmin
      .from("store_clients")
      .select("id")
      .eq("store_id", data.store_id)
      .eq("user_id", profile.data.id)
      .maybeSingle();
    if (!link.data) return { normalized: false };

    const current = await supabaseAdmin.auth.admin.getUserById(profile.data.id);
    const currentEmail = current.data.user?.email ?? "";
    const cpfEmail = cpfToEmail(cpfDigits);
    if (
      !current.data.user ||
      currentEmail === cpfEmail ||
      !currentEmail.endsWith("@cliente.qsfclub.local") ||
      current.data.user.last_sign_in_at
    ) {
      return { normalized: false };
    }

    const updated = await supabaseAdmin.auth.admin.updateUserById(profile.data.id, {
      email: cpfEmail,
      password: cpfDigits,
      email_confirm: true,
      user_metadata: {
        ...(current.data.user.user_metadata ?? {}),
        full_name: profile.data.full_name,
        phone: profile.data.phone,
        cpf: cpfDigits,
      },
    });
    if (updated.error) return { normalized: false };
    return { normalized: true };
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
        cpf: z.string().max(20).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // owner check
    const owner = await supabaseAdmin.from("stores").select("id").eq("id", data.store_id).eq("owner_id", context.userId).maybeSingle();
    if (!owner.data) throw new Error("Você não é dono desta loja.");
    const digits = data.phone.replace(/\D/g, "");
    const cpfDigits = (data.cpf ?? "").replace(/\D/g, "");
    if (digits.length < 8) throw new Error("Telefone inválido.");
    if (cpfDigits && cpfDigits.length !== 11) throw new Error("CPF deve conter 11 dígitos.");

    // Bloquear duplicidade nesta loja: CPF é a chave única; telefone é complementar.
    const orClauses = [`phone.eq.${digits}`];
    if (cpfDigits) orClauses.push(`cpf.eq.${cpfDigits}`);
    const dup = await supabaseAdmin
      .from("profiles")
      .select("id, phone, cpf")
      .or(orClauses.join(","));
    const dupIds = (dup.data ?? []).map((p) => p.id);
    if (dupIds.length > 0) {
      const links = await supabaseAdmin
        .from("store_clients")
        .select("user_id")
        .eq("store_id", data.store_id)
        .in("user_id", dupIds);
      if ((links.data ?? []).length > 0) {
        const conflict = dup.data!.find((p) => links.data!.some((l) => l.user_id === p.id));
        if (conflict?.phone === digits) {
          throw new Error("Já existe um cliente cadastrado nesta loja com este telefone.");
        }
        if (cpfDigits && conflict?.cpf === cpfDigits) {
          throw new Error("Já existe um cliente cadastrado nesta loja com este CPF.");
        }
        throw new Error("Já existe um cliente cadastrado nesta loja com este telefone ou CPF.");
      }
    }

    // Login do cliente é SEMPRE pelo CPF.
    const email = cpfToEmail(cpfDigits);
    // Reaproveita cliente existente: procura primeiro por CPF; depois por telefone (legado) quando informado.
    let userId: string | undefined;
    const byCpf = await supabaseAdmin.from("profiles").select("id").eq("cpf", cpfDigits).maybeSingle();
    const existing = byCpf.data
      ? byCpf
      : await supabaseAdmin.from("profiles").select("id").eq("phone", digits).maybeSingle();
    if (existing.data) {
      userId = existing.data.id;
      const patch: { phone: string; cpf?: string } = { phone: digits };
      if (cpfDigits) patch.cpf = cpfDigits;
      await supabaseAdmin.from("profiles").update(patch).eq("id", userId);
      const normalized = await supabaseAdmin.auth.admin.updateUserById(userId, {
        email,
        password: cpfDigits,
        email_confirm: true,
        user_metadata: { full_name: data.nome, phone: digits, cpf: cpfDigits },
      });
      if (normalized.error && !/already|exists|registered/i.test(normalized.error.message)) {
        throw new Error(normalized.error.message);
      }
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: cpfDigits,
        email_confirm: true,
        user_metadata: { full_name: data.nome, phone: digits, cpf: cpfDigits || null },
      });
      if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Falha ao criar cliente");
      userId = created.data.user.id;
      // Ensure profile exists (trigger handles it, but idempotent)
      await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: data.nome, phone: digits, cpf: cpfDigits || null });
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "cliente" }, { onConflict: "user_id,role" });
    const { data: link, error } = await supabaseAdmin
      .from("store_clients")
      .upsert({ store_id: data.store_id, user_id: userId }, { onConflict: "store_id,user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { user_id: userId, link, senha_temporaria: cpfDigits };
  });

// -------- Lançar venda (lojista) --------
export const lancarVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        client_user_id: z.string().uuid(),
        valor: z.number().positive().max(1_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, owner_id, modalidade, regra_pontos, percentual_cashback, indicacao_ativa, bonus_indicador, bonus_indicado, nome_fantasia")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data || loja.data.owner_id !== context.userId) throw new Error("Loja inválida.");
    const link = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", data.store_id)
      .eq("user_id", data.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    const inclP = loja.data.modalidade !== "cashback";
    const inclC = loja.data.modalidade !== "pontos";
    // Buscar promoções ativas da loja e aplicar multiplicador
    const promosRes = await supabaseAdmin
      .from("promotions")
      .select("multiplicador, dias_semana, hora_inicio, hora_fim, data_inicio, data_fim")
      .eq("store_id", data.store_id)
      .eq("ativo", true);
    const multiplicador = getActiveMultiplier(promosRes.data ?? []);
    const pontosBase = inclP ? Math.floor(data.valor * Number(loja.data.regra_pontos) * multiplicador) : 0;
    const cashback = inclC ? +(data.valor * (Number(loja.data.percentual_cashback) / 100)).toFixed(2) : 0;

    // -------- Bônus de indicação (só na 1ª compra) --------
    let bonusIndicado = 0;
    let bonusIndicador = 0;
    const pagarIndicacao =
      loja.data.indicacao_ativa &&
      !link.data.referral_bonus_paid &&
      link.data.referrer_user_id;
    if (pagarIndicacao) {
      bonusIndicado = Number(loja.data.bonus_indicado) || 0;
      bonusIndicador = Number(loja.data.bonus_indicador) || 0;
    }

    const pontos = pontosBase + bonusIndicado;
    const novoPontos = link.data.pontos + pontos;
    const novoCashback = +(Number(link.data.cashback_saldo) + cashback).toFixed(2);
    const { data: txRow, error: txErr } = await supabaseAdmin.from("transactions").insert({
      store_id: data.store_id,
      client_user_id: data.client_user_id,
      tipo: "venda",
      valor: data.valor,
      pontos_delta: pontos,
      cashback_delta: cashback,
      status: "entregue",
    }).select("id").single();
    if (txErr) throw new Error(txErr.message);
    const { error: updErr } = await supabaseAdmin
      .from("store_clients")
      .update({
        pontos: novoPontos,
        cashback_saldo: novoCashback,
        nivel: calcularNivel(novoPontos),
        ...(pagarIndicacao ? { referral_bonus_paid: true } : {}),
      })
      .eq("id", link.data.id);
    if (updErr) throw new Error(updErr.message);

    // Creditar indicador
    if (pagarIndicacao && bonusIndicador > 0 && link.data.referrer_user_id) {
      const refLink = await supabaseAdmin
        .from("store_clients").select("id, pontos")
        .eq("store_id", data.store_id).eq("user_id", link.data.referrer_user_id).maybeSingle();
      if (refLink.data) {
        const novoRef = refLink.data.pontos + bonusIndicador;
        await supabaseAdmin.from("store_clients")
          .update({ pontos: novoRef, nivel: calcularNivel(novoRef) })
          .eq("id", refLink.data.id);
        await supabaseAdmin.from("transactions").insert({
          store_id: data.store_id,
          client_user_id: link.data.referrer_user_id,
          tipo: "indicacao",
          pontos_delta: bonusIndicador,
          status: "entregue",
        });
        const { notifyClient } = await import("./notify.server");
        await notifyClient({
          event: "pontos_ganhos",
          storeId: data.store_id,
          clientUserId: link.data.referrer_user_id,
          pontosGanhos: bonusIndicador,
        });
      }
    }

    if (pontos > 0) {
      const { notifyClient } = await import("./notify.server");
      await notifyClient({
        event: "pontos_ganhos",
        storeId: data.store_id,
        clientUserId: data.client_user_id,
        pontosGanhos: pontos,
      });
    }
    // Envia pedido de NPS (só se lojista ativou)
    if (txRow?.id) {
      const { notifyClient } = await import("./notify.server");
      await notifyClient({
        event: "nps_request",
        storeId: data.store_id,
        clientUserId: data.client_user_id,
        transactionId: txRow.id,
      });
    }
    return { pontos, cashback, multiplicador, bonusIndicado, bonusIndicador };
  });

// -------- Promoções: CRUD --------
const promoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(100),
  multiplicador: z.number().min(1).max(10),
  dias_semana: z.array(z.number().int().min(0).max(6)).min(1),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/),
  data_inicio: z.string().nullable().optional(),
  data_fim: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
});

export const salvarPromocao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => promoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const loja = await context.supabase.from("stores").select("id").eq("owner_id", context.userId).maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const payload = {
      store_id: loja.data.id,
      nome: data.nome,
      multiplicador: data.multiplicador,
      dias_semana: data.dias_semana,
      hora_inicio: data.hora_inicio,
      hora_fim: data.hora_fim,
      data_inicio: data.data_inicio || null,
      data_fim: data.data_fim || null,
      ativo: data.ativo,
    };
    if (data.id) {
      const { error } = await context.supabase.from("promotions").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("promotions").insert(payload);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const removerPromocao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("promotions").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Notificações automáticas: salvar config --------
export const salvarNotificacoes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        notif_birthday_enabled: z.boolean(),
        notif_birthday_bonus_points: z.number().int().min(0).max(10000),
        notif_birthday_template: z.string().min(1).max(2000),
        notif_inactivity_enabled: z.boolean(),
        notif_inactivity_days: z.number().int().min(1).max(365),
        notif_inactivity_template: z.string().min(1).max(2000),
        notif_expiry_enabled: z.boolean(),
        notif_expiry_days: z.number().int().min(1).max(3650),
        notif_expiry_warn_days: z.number().int().min(1).max(90),
        notif_expiry_template: z.string().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stores").update(data).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Aniversário do cliente (lojista edita) --------
export const atualizarAniversarioCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      client_user_id: z.string().uuid(),
      store_id: z.string().uuid(),
      birthdate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = await supabaseAdmin.from("stores").select("id").eq("id", data.store_id).eq("owner_id", context.userId).maybeSingle();
    if (!owner.data) throw new Error("Loja inválida.");
    const link = await supabaseAdmin.from("store_clients").select("id").eq("store_id", data.store_id).eq("user_id", data.client_user_id).maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    const { error } = await supabaseAdmin.from("profiles").update({ birthdate: data.birthdate }).eq("id", data.client_user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- LOJISTA: atualizar dados básicos do cliente (nome / telefone / CPF) --------
export const atualizarClienteInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      store_id: z.string().uuid(),
      client_user_id: z.string().uuid(),
      full_name: z.string().min(1).max(120),
      phone: z.string().min(8).max(20),
      cpf: z.string().min(11).max(20),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = await supabaseAdmin
      .from("stores").select("id").eq("id", data.store_id).eq("owner_id", context.userId).maybeSingle();
    if (!owner.data) throw new Error("Loja inválida.");
    const link = await supabaseAdmin
      .from("store_clients").select("id").eq("store_id", data.store_id).eq("user_id", data.client_user_id).maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");

    const phoneDigits = data.phone.replace(/\D/g, "");
    if (phoneDigits.length < 8) throw new Error("Telefone inválido.");
    const cpfDigits = (data.cpf ?? "").replace(/\D/g, "");
    if (cpfDigits.length !== 11) throw new Error("CPF é obrigatório e deve conter 11 dígitos.");

    // Duplicidade dentro da mesma loja (outros clientes com mesmo telefone/CPF)
    const orClauses = [`phone.eq.${phoneDigits}`, `cpf.eq.${cpfDigits}`];
    const dup = await supabaseAdmin
      .from("profiles").select("id, phone, cpf").or(orClauses.join(","))
      .neq("id", data.client_user_id);
    const dupIds = (dup.data ?? []).map((p) => p.id);
    if (dupIds.length > 0) {
      const links = await supabaseAdmin
        .from("store_clients").select("user_id").eq("store_id", data.store_id).in("user_id", dupIds);
      if ((links.data ?? []).length > 0) {
        const conflict = dup.data!.find((p) => links.data!.some((l) => l.user_id === p.id));
        if (conflict?.phone === phoneDigits) throw new Error("Já existe outro cliente nesta loja com este telefone.");
        if (conflict?.cpf === cpfDigits) throw new Error("Já existe outro cliente nesta loja com este CPF.");
        throw new Error("Já existe outro cliente nesta loja com este telefone ou CPF.");
      }
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ full_name: data.full_name.trim(), phone: phoneDigits, cpf: cpfDigits })
      .eq("id", data.client_user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- LOJISTA: ajustar pontos do cliente (adicionar ou estornar) --------
export const ajustarPontosCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      store_id: z.string().uuid(),
      client_user_id: z.string().uuid(),
      // positivo = adicionar; negativo = estornar
      delta: z.number().int().min(-1_000_000).max(1_000_000).refine((n) => n !== 0, "Informe uma quantidade diferente de zero."),
      motivo: z.string().max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = await supabaseAdmin
      .from("stores").select("id").eq("id", data.store_id).eq("owner_id", context.userId).maybeSingle();
    if (!owner.data) throw new Error("Loja inválida.");
    const link = await supabaseAdmin
      .from("store_clients").select("id, pontos")
      .eq("store_id", data.store_id).eq("user_id", data.client_user_id).maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    const novoPontos = link.data.pontos + data.delta;
    if (novoPontos < 0) throw new Error(`Estorno maior que o saldo atual (${link.data.pontos} pts).`);
    const { error: eIns } = await supabaseAdmin.from("transactions").insert({
      store_id: data.store_id,
      client_user_id: data.client_user_id,
      tipo: "ajuste",
      valor: 0,
      pontos_delta: data.delta,
      cashback_delta: 0,
      status: "entregue",
      origem: data.motivo ? `ajuste_manual:${data.motivo.slice(0, 180)}` : "ajuste_manual",
    });
    if (eIns) throw new Error(eIns.message);
    const { error: eUp } = await supabaseAdmin
      .from("store_clients")
      .update({ pontos: novoPontos, nivel: calcularNivel(novoPontos) })
      .eq("id", link.data.id);
    if (eUp) throw new Error(eUp.message);
    return { ok: true, novo_saldo: novoPontos };
  });

// -------- LOJISTA: estornar uma venda lançada --------
export const estornarVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      transaction_id: z.string().uuid(),
      motivo: z.string().max(200).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tx = await supabaseAdmin
      .from("transactions")
      .select("id, store_id, client_user_id, tipo, valor, pontos_delta, cashback_delta, origem, stores:store_id(owner_id)")
      .eq("id", data.transaction_id)
      .maybeSingle();
    if (!tx.data) throw new Error("Venda não encontrada.");
    const owner = (tx.data.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (owner !== context.userId) throw new Error("Sem permissão para estornar esta venda.");
    if (tx.data.tipo !== "venda") throw new Error("Só é possível estornar transações do tipo venda.");
    if (typeof tx.data.origem === "string" && tx.data.origem.startsWith("estornada:")) {
      throw new Error("Esta venda já foi estornada.");
    }
    // Verifica se já existe um estorno para essa transação
    const jaEstornada = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("store_id", tx.data.store_id)
      .eq("client_user_id", tx.data.client_user_id)
      .eq("origem", `estorno:${tx.data.id}`)
      .maybeSingle();
    if (jaEstornada.data) throw new Error("Esta venda já foi estornada.");

    const link = await supabaseAdmin
      .from("store_clients").select("id, pontos, cashback_saldo")
      .eq("store_id", tx.data.store_id).eq("user_id", tx.data.client_user_id).maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");

    const deltaPontos = -Number(tx.data.pontos_delta || 0);
    const deltaCashback = -Number(tx.data.cashback_delta || 0);
    const novoPontos = Math.max(0, link.data.pontos + deltaPontos);
    const novoCashback = Math.max(0, +(Number(link.data.cashback_saldo) + deltaCashback).toFixed(2));

    const ins = await supabaseAdmin.from("transactions").insert({
      store_id: tx.data.store_id,
      client_user_id: tx.data.client_user_id,
      tipo: "ajuste",
      valor: 0,
      pontos_delta: deltaPontos,
      cashback_delta: deltaCashback,
      status: "entregue",
      origem: `estorno:${tx.data.id}${data.motivo ? `:${data.motivo.slice(0, 120)}` : ""}`,
    });
    if (ins.error) throw new Error(ins.error.message);

    const upd = await supabaseAdmin
      .from("store_clients")
      .update({ pontos: novoPontos, cashback_saldo: novoCashback, nivel: calcularNivel(novoPontos) })
      .eq("id", link.data.id);
    if (upd.error) throw new Error(upd.error.message);

    // Marca a venda original como estornada (origem prefixada)
    await supabaseAdmin
      .from("transactions")
      .update({ origem: `estornada:${tx.data.origem ?? "manual"}` })
      .eq("id", tx.data.id);

    return { ok: true, pontos_revertidos: -deltaPontos, cashback_revertido: -deltaCashback };
  });

// -------- Disparar notificações agora (teste manual) --------
export const dispararNotificacoesAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Só permite se for dono de alguma loja (evita endpoint público via serverFn)
    const store = await supabaseAdmin.from("stores").select("id").eq("owner_id", context.userId).maybeSingle();
    if (!store.data) throw new Error("Sem loja.");
    const url = process.env.VITE_APP_URL || "https://project--62bd2a63-6908-43c2-9917-f4ddac34c65f.lovable.app";
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${url}/api/public/hooks/notifications-daily`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key ?? "" },
      body: "{}",
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Falha: ${res.status} ${body.slice(0, 200)}`);
    return JSON.parse(body);
  });

// -------- Cliente: resgatar produto --------
export const resgatarProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ store_id: z.string().uuid(), product_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, voucher_validade_dias")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const voucher = gerarVoucher();
    const validade = Math.max(1, Number(loja.data.voucher_validade_dias) || 7);
    const expiresAt = new Date(Date.now() + validade * 24 * 60 * 60 * 1000).toISOString();
    // Trava transacional: SELECT ... FOR UPDATE dentro da RPC serializa
    // resgates concorrentes e impede uso duplo do mesmo saldo de pontos.
    const { error: rpcErr } = await supabaseAdmin.rpc("resgatar_produto_atomico", {
      p_store_id: data.store_id,
      p_user_id: context.userId,
      p_product_id: data.product_id,
      p_voucher_code: voucher,
      p_expires_at: expiresAt,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    return { voucher, expires_at: expiresAt };
  });

// -------- Cliente: resgatar cashback --------
export const resgatarCashback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ store_id: z.string().uuid(), valor: z.number().positive().max(1_000_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, voucher_validade_dias")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const voucher = gerarVoucher();
    const validade = Math.max(1, Number(loja.data.voucher_validade_dias) || 7);
    const expiresAt = new Date(Date.now() + validade * 24 * 60 * 60 * 1000).toISOString();
    // Trava transacional: SELECT ... FOR UPDATE dentro da RPC serializa
    // resgates concorrentes e impede uso duplo do mesmo saldo de cashback.
    const { error: rpcErr } = await supabaseAdmin.rpc("resgatar_cashback_atomico", {
      p_store_id: data.store_id,
      p_user_id: context.userId,
      p_valor: data.valor,
      p_voucher_code: voucher,
      p_expires_at: expiresAt,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    return { voucher, expires_at: expiresAt };
  });

// -------- Lojista: confirmar entrega de resgate --------
export const confirmarResgate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ transaction_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tx = await supabaseAdmin
      .from("transactions")
      .select("id, store_id, status, tipo, voucher_code, voucher_expires_at, delivered_at, pontos_delta, cashback_delta, product_id, client_user_id, products:product_id(nome), profiles:client_user_id(full_name, phone), stores:store_id(owner_id, nome_fantasia)")
      .eq("id", data.transaction_id)
      .maybeSingle();
    const ownerId = (tx.data?.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (!tx.data || ownerId !== context.userId) throw new Error("Não autorizado.");
    if (tx.data.status === "entregue") {
      throw new Error(formatVoucherJaUsado(tx.data.delivered_at));
    }
    if (tx.data.status === "expirado") throw new Error("Voucher expirado — os pontos/cashback já foram devolvidos ao cliente.");
    if (tx.data.voucher_expires_at && new Date(tx.data.voucher_expires_at).getTime() < Date.now()) {
      throw new Error("Voucher expirado — os pontos/cashback já foram devolvidos ao cliente.");
    }
    const deliveredAt = new Date().toISOString();
    // Update condicional: só marca como entregue se ainda estiver pendente.
    // Impede corrida entre lojista clicando duas vezes / dois caixas simultâneos.
    const upd = await supabaseAdmin
      .from("transactions")
      .update({ status: "entregue", delivered_at: deliveredAt, redeemed_by: context.userId })
      .eq("id", data.transaction_id)
      .eq("status", "pendente")
      .select("id");
    if (upd.error) throw new Error(upd.error.message);
    if (!upd.data || upd.data.length === 0) {
      // Alguém já entregou/expirou/cancelou entre a leitura e o update.
      const recheck = await supabaseAdmin
        .from("transactions")
        .select("status, delivered_at")
        .eq("id", data.transaction_id)
        .maybeSingle();
      if (recheck.data?.status === "entregue") throw new Error(formatVoucherJaUsado(recheck.data.delivered_at));
      if (recheck.data?.status === "expirado") throw new Error("Voucher expirado — os pontos/cashback já foram devolvidos ao cliente.");
      if (recheck.data?.status === "cancelado") throw new Error("Voucher cancelado.");
      throw new Error("Não foi possível confirmar o voucher. Atualize a página e tente novamente.");
    }
    const store = tx.data.stores as unknown as { nome_fantasia: string | null } | null;
    const profile = tx.data.profiles as { full_name: string | null; phone: string | null } | null;
    const product = tx.data.products as { nome: string | null } | null;
    return {
      ok: true,
      comprovante: {
        transaction_id: tx.data.id,
        voucher_code: tx.data.voucher_code,
        tipo: tx.data.tipo,
        delivered_at: deliveredAt,
        loja: store?.nome_fantasia ?? null,
        cliente: profile?.full_name ?? "Cliente",
        cliente_telefone: profile?.phone ?? null,
        produto: product?.nome ?? null,
        pontos_usados: Math.abs(Number(tx.data.pontos_delta ?? 0)),
        cashback_aplicado: Math.abs(Number(tx.data.cashback_delta ?? 0)),
      },
    };
  });

// -------- Lojista: validar voucher pelo código --------
export const validarVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ voucher_code: z.string().min(4).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await supabaseAdmin
      .from("stores").select("id, nome_fantasia").eq("owner_id", context.userId).maybeSingle();
    if (!store.data) throw new Error("Loja não encontrada.");
    const code = data.voucher_code.trim().toUpperCase();
    const tx = await supabaseAdmin
      .from("transactions")
      .select("id, tipo, status, valor, pontos_delta, cashback_delta, voucher_code, voucher_expires_at, delivered_at, product_id, client_user_id, products:product_id(nome), profiles:client_user_id(full_name, phone)")
      .eq("store_id", store.data.id)
      .eq("voucher_code", code)
      .maybeSingle();
    if (!tx.data) throw new Error("Voucher não encontrado nesta loja.");
    if (tx.data.status === "entregue") {
      throw new Error(formatVoucherJaUsado(tx.data.delivered_at));
    }
    if (tx.data.status === "expirado") throw new Error("Voucher expirado — saldo já devolvido ao cliente.");
    if (tx.data.voucher_expires_at && new Date(tx.data.voucher_expires_at).getTime() < Date.now()) {
      throw new Error("Voucher expirado — saldo já devolvido ao cliente.");
    }
    // Update condicional idempotente: previne dupla entrega em corrida.
    const upd = await supabaseAdmin
      .from("transactions")
      .update({ status: "entregue", delivered_at: new Date().toISOString(), redeemed_by: context.userId })
      .eq("id", tx.data.id)
      .eq("status", "pendente")
      .select("id");
    if (upd.error) throw new Error(upd.error.message);
    if (!upd.data || upd.data.length === 0) {
      const recheck = await supabaseAdmin
        .from("transactions")
        .select("status, delivered_at")
        .eq("id", tx.data.id)
        .maybeSingle();
      if (recheck.data?.status === "entregue") throw new Error(formatVoucherJaUsado(recheck.data.delivered_at));
      if (recheck.data?.status === "cancelado") throw new Error("Voucher cancelado.");
      throw new Error("Voucher indisponível para entrega.");
    }
    return {
      ok: true,
      voucher: tx.data.voucher_code,
      tipo: tx.data.tipo,
      cliente: (tx.data.profiles as { full_name: string | null } | null)?.full_name ?? "Cliente",
      produto: (tx.data.products as { nome: string | null } | null)?.nome ?? null,
      pontos: Math.abs(Number(tx.data.pontos_delta || 0)),
      cashback: Math.abs(Number(tx.data.cashback_delta || 0)),
    };
  });

// -------- Lojista: cancelar voucher pendente (devolve saldo/pontos) --------
export const cancelarVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ transaction_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tx = await supabaseAdmin
      .from("transactions")
      .select("id, store_id, status, tipo, pontos_delta, cashback_delta, client_user_id, stores:store_id(owner_id)")
      .eq("id", data.transaction_id)
      .maybeSingle();
    const ownerId = (tx.data?.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (!tx.data || ownerId !== context.userId) throw new Error("Não autorizado.");
    if (tx.data.status !== "pendente") throw new Error("Só é possível cancelar vouchers pendentes.");
    const upd = await supabaseAdmin
      .from("transactions")
      .update({ status: "cancelado", redeemed_by: context.userId })
      .eq("id", tx.data.id)
      .eq("status", "pendente")
      .select("id");
    if (upd.error) throw new Error(upd.error.message);
    if (!upd.data || upd.data.length === 0) throw new Error("Voucher já foi entregue ou cancelado.");
    // Devolve pontos/cashback ao cliente.
    if (tx.data.client_user_id) {
      const { calcularNivel } = await import("@/lib/qsf-shared");
      const link = await supabaseAdmin
        .from("store_clients")
        .select("id, pontos, cashback_saldo")
        .eq("store_id", tx.data.store_id)
        .eq("user_id", tx.data.client_user_id)
        .maybeSingle();
      if (link.data) {
        const pontosDevolver = -Number(tx.data.pontos_delta || 0);
        const cashbackDevolver = -Number(tx.data.cashback_delta || 0);
        const novoPontos = Math.max(0, link.data.pontos + pontosDevolver);
        const novoCashback = Math.max(0, +(Number(link.data.cashback_saldo) + cashbackDevolver).toFixed(2));
        await supabaseAdmin
          .from("store_clients")
          .update({ pontos: novoPontos, cashback_saldo: novoCashback, nivel: calcularNivel(novoPontos) })
          .eq("id", link.data.id);
      }
    }
    return { ok: true };
  });

function formatVoucherJaUsado(delivered_at: string | null | undefined): string {
  if (!delivered_at) {
    return "Este voucher já foi utilizado anteriormente. Cada voucher só pode ser entregue uma vez.";
  }
  const d = new Date(delivered_at);
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  }).format(d);
  return `Este voucher já foi utilizado em ${fmt}. Cada voucher só pode ser entregue uma vez.`;
}


// -------- Produtos CRUD (lojista) --------
export const salvarProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid().optional(),
        store_id: z.string().uuid(),
        nome: z.string().min(1).max(100),
        descricao: z.string().max(500).optional().nullable(),
        custo_pontos: z.number().int().min(0),
        ativo: z.boolean().default(true),
        foto_url: z.string().max(1000).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const check = await context.supabase.from("stores").select("id").eq("id", data.store_id).maybeSingle();
    if (!check.data) throw new Error("Loja não encontrada.");
    if (data.id) {
      const { error } = await context.supabase
        .from("products")
        .update({ nome: data.nome, descricao: data.descricao, custo_pontos: data.custo_pontos, ativo: data.ativo, foto_url: data.foto_url ?? null })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("products").insert({
        store_id: data.store_id,
        nome: data.nome,
        descricao: data.descricao,
        custo_pontos: data.custo_pontos,
        ativo: data.ativo,
        foto_url: data.foto_url ?? null,
      });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const removerProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Integrações: rotacionar segredo do webhook --------
export const rotacionarWebhookSecret = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { error } = await supabaseAdmin
      .from("stores")
      .update({ webhook_secret: secret })
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { webhook_secret: secret };
  });

// -------- Integrações: enviar webhook de teste (simula Bling/Olist) --------
export const testarWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ origem: z.enum(["bling", "olist", "teste"]).default("teste") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, slug, webhook_secret")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    await supabaseAdmin.from("integration_logs").insert({
      store_id: loja.data.id,
      origem: data.origem,
      payload_recebido: {
        id_venda_externa: `TESTE-${Date.now()}`,
        valor: 100,
        telefone_cliente: "(teste)",
        nome_cliente: "Cliente de Teste",
        _meta: "evento simulado a partir do painel",
      } as never,
      status: "sucesso",
      mensagem_erro: null,
    });
    await supabaseAdmin
      .from("stores")
      .update({ webhook_last_at: new Date().toISOString() })
      .eq("id", loja.data.id);
    return { ok: true };
  });

// -------- WhatsApp: salvar config da Evolution API + template + toggle --------
export const salvarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        evolution_url: z.string().max(300).optional().nullable(),
        evolution_apikey: z.string().max(300).optional().nullable(),
        evolution_instance: z.string().max(100).optional().nullable(),
        whatsapp_enabled: z.boolean(),
        whatsapp_template_pontos: z.string().min(1).max(2000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("stores").update(data).eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- WhatsApp: enviar mensagem de teste --------
export const enviarWhatsappTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ telefone: z.string().min(8).max(20), texto: z.string().min(1).max(1000).optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, nome_fantasia, evolution_url, evolution_apikey, evolution_instance")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    if (!loja.data.evolution_url || !loja.data.evolution_apikey || !loja.data.evolution_instance) {
      throw new Error("Configure URL, API key e instância da Evolution API antes de testar.");
    }
    const { formatBrazilPhone, sendWhatsappRaw } = await import("./notify.server");
    const numero = formatBrazilPhone(data.telefone);
    if (!numero) throw new Error("Telefone inválido.");
    const texto = data.texto ?? `✅ Teste PontoaMax — ${loja.data.nome_fantasia}. Integração WhatsApp funcionando!`;
    const res = await sendWhatsappRaw({
      storeId: loja.data.id,
      url: loja.data.evolution_url,
      apikey: loja.data.evolution_apikey,
      instance: loja.data.evolution_instance,
      number: numero,
      text: texto,
    });
    if (!res.ok) throw new Error(res.error ?? "Falha ao enviar");
    return { ok: true, numero };
  });

// -------- WhatsApp: conectar via QR Code (Evolution API) --------
export const conectarWhatsappQR = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, slug, evolution_url, evolution_apikey, evolution_instance")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    if (!loja.data.evolution_url || !loja.data.evolution_apikey) {
      throw new Error("Configure URL e API Key da Evolution API antes de conectar.");
    }
    const base = loja.data.evolution_url.replace(/\/$/, "");
    const instance = loja.data.evolution_instance || `qsf-${loja.data.slug}`;
    const headers = { "Content-Type": "application/json", apikey: loja.data.evolution_apikey };
    let qr: string | null = null;
    // Tenta criar (idempotente na maioria das versões — se já existe, cai no connect)
    try {
      const createRes = await fetch(`${base}/instance/create`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          instanceName: instance,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS",
        }),
      });
      if (createRes.ok) {
        const j = (await createRes.json()) as { qrcode?: { base64?: string }; base64?: string };
        qr = j?.qrcode?.base64 ?? j?.base64 ?? null;
      }
    } catch {
      /* segue pro connect */
    }
    if (!qr) {
      const connRes = await fetch(`${base}/instance/connect/${encodeURIComponent(instance)}`, { headers });
      if (!connRes.ok) {
        const body = await connRes.text();
        throw new Error(`Evolution API [${connRes.status}]: ${body.slice(0, 200)}`);
      }
      const j = (await connRes.json()) as { base64?: string; qrcode?: { base64?: string } };
      qr = j?.base64 ?? j?.qrcode?.base64 ?? null;
    }
    if (loja.data.evolution_instance !== instance) {
      await supabaseAdmin.from("stores").update({ evolution_instance: instance }).eq("id", loja.data.id);
    }
    if (!qr) throw new Error("Instância já conectada ou QR indisponível.");
    return { instance, qr };
  });

// -------- WhatsApp: status da conexão --------
export const statusWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("evolution_url, evolution_apikey, evolution_instance")
      .eq("owner_id", context.userId)
      .maybeSingle();
    const d = loja.data;
    if (!d?.evolution_url || !d?.evolution_apikey || !d?.evolution_instance) {
      return { state: "unconfigured" as string };
    }
    const base = d.evolution_url.replace(/\/$/, "");
    try {
      const res = await fetch(`${base}/instance/connectionState/${encodeURIComponent(d.evolution_instance)}`, {
        headers: { apikey: d.evolution_apikey },
      });
      if (!res.ok) return { state: "error" };
      const j = (await res.json()) as { instance?: { state?: string }; state?: string };
      return { state: j?.instance?.state ?? j?.state ?? "unknown" };
    } catch {
      return { state: "error" };
    }
  });

// -------- WhatsApp: desconectar (logout) --------
export const desconectarWhatsapp = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("evolution_url, evolution_apikey, evolution_instance")
      .eq("owner_id", context.userId)
      .maybeSingle();
    const d = loja.data;
    if (!d?.evolution_url || !d?.evolution_apikey || !d?.evolution_instance) return { ok: true };
    const base = d.evolution_url.replace(/\/$/, "");
    await fetch(`${base}/instance/logout/${encodeURIComponent(d.evolution_instance)}`, {
      method: "DELETE",
      headers: { apikey: d.evolution_apikey },
    }).catch(() => null);
    return { ok: true };
  });

// -------- Campanhas WhatsApp em massa --------

type SegmentoTipo = "todos" | "bronze" | "prata" | "ouro" | "inativos_30" | "inativos_60" | "inativos_90" | "aniversariantes";

function renderMsg(tpl: string, vars: Record<string, string | number | null>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    return v === null || v === undefined ? "" : String(v);
  });
}

async function selecionarDestinatarios(
  storeId: string,
  segmento: SegmentoTipo,
): Promise<Array<{ user_id: string; pontos: number; nivel: string; full_name: string | null; phone: string | null }>> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin
    .from("store_clients")
    .select("user_id, pontos, nivel, profiles:user_id(full_name, phone, birthdate)")
    .eq("store_id", storeId);
  if (segmento === "bronze" || segmento === "prata" || segmento === "ouro") {
    q = q.eq("nivel", segmento);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (data ?? []).map((r) => {
    const p = r.profiles as unknown as { full_name: string | null; phone: string | null; birthdate: string | null } | null;
    return {
      user_id: r.user_id,
      pontos: r.pontos,
      nivel: String(r.nivel),
      full_name: p?.full_name ?? null,
      phone: p?.phone ?? null,
      birthdate: p?.birthdate ?? null,
    };
  }).filter((r) => !!r.phone);

  if (segmento.startsWith("inativos_")) {
    const dias = Number(segmento.split("_")[1]);
    const cutoff = new Date(Date.now() - dias * 86400_000).toISOString();
    // últimos venda por cliente
    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("client_user_id, created_at")
      .eq("store_id", storeId)
      .eq("tipo", "venda")
      .gte("created_at", cutoff);
    const ativos = new Set((tx ?? []).map((t) => t.client_user_id));
    rows = rows.filter((r) => !ativos.has(r.user_id));
  }

  if (segmento === "aniversariantes") {
    // Aniversariantes do mês atual (Brasília)
    const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", month: "2-digit" });
    const mesAtual = fmt.format(new Date()); // "MM"
    rows = rows.filter((r) => r.birthdate && r.birthdate.slice(5, 7) === mesAtual);
  }

  return rows;
}

// Envia uma campanha (usado tanto pelo botão manual quanto pelo cron de agendamento).
// Não valida ownership — quem chama garante autorização.
async function processarEnvioCampanha(campaignId: string): Promise<{ enviados: number; falhas: number; total: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { formatBrazilPhone, sendWhatsappRaw } = await import("./notify.server");
  const camp = await supabaseAdmin
    .from("campaigns")
    .select("*, stores:store_id(nome_fantasia, evolution_url, evolution_apikey, evolution_instance, whatsapp_enabled)")
    .eq("id", campaignId)
    .maybeSingle();
  if (!camp.data) throw new Error("Campanha não encontrada.");
  const loja = camp.data.stores as unknown as {
    nome_fantasia: string;
    evolution_url: string | null;
    evolution_apikey: string | null;
    evolution_instance: string | null;
    whatsapp_enabled: boolean;
  };
  if (!loja.evolution_url || !loja.evolution_apikey || !loja.evolution_instance) {
    await supabaseAdmin.from("campaigns")
      .update({ status: "falhou" })
      .eq("id", camp.data.id);
    throw new Error("Evolution API não configurada nesta loja.");
  }

  await supabaseAdmin.from("campaigns").update({ status: "enviando" }).eq("id", camp.data.id);
  const destinatarios = await selecionarDestinatarios(camp.data.store_id, camp.data.segmento as SegmentoTipo);

  let enviados = 0;
  let falhas = 0;
  for (const d of destinatarios) {
    const numero = formatBrazilPhone(d.phone);
    const texto = renderMsg(camp.data.mensagem, {
      nome: d.full_name ?? "cliente",
      pontos: d.pontos,
      nivel: d.nivel,
      loja: loja.nome_fantasia,
    });
    if (!numero) {
      await supabaseAdmin.from("campaign_recipients").insert({
        campaign_id: camp.data.id, client_user_id: d.user_id, telefone: d.phone,
        mensagem_render: texto, status: "falha", erro: "telefone inválido",
      });
      falhas++;
      continue;
    }
    const res = await sendWhatsappRaw({
      storeId: camp.data.store_id,
      url: loja.evolution_url,
      apikey: loja.evolution_apikey,
      instance: loja.evolution_instance,
      number: numero,
      text: texto,
    });
    if (res.ok) {
      enviados++;
      await supabaseAdmin.from("campaign_recipients").insert({
        campaign_id: camp.data.id, client_user_id: d.user_id, telefone: numero,
        mensagem_render: texto, status: "enviado", enviado_em: new Date().toISOString(),
      });
    } else {
      falhas++;
      await supabaseAdmin.from("campaign_recipients").insert({
        campaign_id: camp.data.id, client_user_id: d.user_id, telefone: numero,
        mensagem_render: texto, status: "falha", erro: res.error ?? "erro",
      });
    }
    // pequeno delay para evitar rate-limit da Evolution
    await new Promise((r) => setTimeout(r, 400));
  }

  await supabaseAdmin.from("campaigns").update({
    status: "concluida",
    total_enviados: enviados,
    total_falhas: falhas,
    total_destinatarios: destinatarios.length,
    enviado_em: new Date().toISOString(),
  }).eq("id", camp.data.id);

  return { enviados, falhas, total: destinatarios.length };
}

// Exposto para uso pelo cron `/api/public/hooks/campanhas-agendadas`
export { processarEnvioCampanha as _processarEnvioCampanhaInternal };

export const criarCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      nome: z.string().min(1).max(100),
      mensagem: z.string().min(1).max(2000),
      segmento: z.enum(["todos", "bronze", "prata", "ouro", "inativos_30", "inativos_60", "inativos_90", "aniversariantes"]),
      agendada_para: z.string().datetime().optional().nullable(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin.from("stores").select("id").eq("owner_id", context.userId).maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const destinatarios = await selecionarDestinatarios(loja.data.id, data.segmento);
    const agendada = data.agendada_para && new Date(data.agendada_para).getTime() > Date.now() ? data.agendada_para : null;
    const { data: camp, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        store_id: loja.data.id,
        nome: data.nome,
        mensagem: data.mensagem,
        segmento: data.segmento,
        total_destinatarios: destinatarios.length,
        status: agendada ? "agendada" : "rascunho",
        agendada_para: agendada,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: camp.id, total: destinatarios.length, agendada };
  });

export const enviarCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ campaign_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const camp = await supabaseAdmin
      .from("campaigns")
      .select("id, status, stores:store_id(owner_id)")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (!camp.data) throw new Error("Campanha não encontrada.");
    const ownerId = (camp.data.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (ownerId !== context.userId) throw new Error("Não autorizado.");
    if (camp.data.status === "enviando" || camp.data.status === "concluida") {
      throw new Error("Esta campanha já foi enviada.");
    }
    return processarEnvioCampanha(camp.data.id);
  });

export const excluirCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("campaigns").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const previewDestinatarios = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      segmento: z.enum(["todos", "bronze", "prata", "ouro", "inativos_30", "inativos_60", "inativos_90", "aniversariantes"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin.from("stores").select("id").eq("owner_id", context.userId).maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const destinatarios = await selecionarDestinatarios(loja.data.id, data.segmento);
    return { total: destinatarios.length, amostra: destinatarios.slice(0, 5).map((d) => ({ nome: d.full_name, telefone: d.phone })) };
  });
// ============================================================
// VALE-PRESENTE / GIFT CARDS
// ============================================================
function randomGiftCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export const criarGiftCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      pontos: z.number().int().positive().max(100000),
      quantidade: z.number().int().min(1).max(100),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin.from("stores").select("id").eq("owner_id", context.userId).maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const rows = Array.from({ length: data.quantidade }, () => ({
      store_id: loja.data!.id,
      codigo: randomGiftCode(),
      pontos: data.pontos,
    }));
    const { data: inserted, error } = await supabaseAdmin.from("gift_cards").insert(rows).select();
    if (error) throw new Error(error.message);
    return inserted ?? [];
  });

export const removerGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const gc = await supabaseAdmin.from("gift_cards").select("id, store_id, redeemed_at, stores!inner(owner_id)").eq("id", data.id).maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join shape
    if (!gc.data || (gc.data as any).stores.owner_id !== context.userId) throw new Error("Vale não encontrado.");
    if (gc.data.redeemed_at) throw new Error("Vale já resgatado, não pode remover.");
    const { error } = await supabaseAdmin.from("gift_cards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resgatarGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ codigo: z.string().min(4).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const gc = await supabaseAdmin.from("gift_cards").select("*").eq("codigo", data.codigo).maybeSingle();
    if (!gc.data) throw new Error("Código inválido.");
    if (gc.data.redeemed_at) throw new Error("Vale já resgatado.");
    // vincula cliente à loja se ainda não estiver
    const linkExisting = await supabaseAdmin
      .from("store_clients").select("*")
      .eq("store_id", gc.data.store_id).eq("user_id", context.userId).maybeSingle();
    let link = linkExisting.data;
    if (!link) {
      const ins = await supabaseAdmin.from("store_clients").insert({
        store_id: gc.data.store_id, user_id: context.userId, pontos: 0, cashback_saldo: 0, nivel: "bronze",
      }).select("*").single();
      if (ins.error) throw new Error(ins.error.message);
      link = ins.data;
    }
    const novoPontos = link.pontos + gc.data.pontos;
    const upd = await supabaseAdmin.from("store_clients").update({
      pontos: novoPontos, nivel: calcularNivel(novoPontos),
    }).eq("id", link.id);
    if (upd.error) throw new Error(upd.error.message);
    const mark = await supabaseAdmin.from("gift_cards").update({
      redeemed_by: context.userId, redeemed_at: new Date().toISOString(),
    }).eq("id", gc.data.id).is("redeemed_at", null).select("id").single();
    if (mark.error) {
      // rollback pontos
      await supabaseAdmin.from("store_clients").update({ pontos: link.pontos, nivel: calcularNivel(link.pontos) }).eq("id", link.id);
      throw new Error("Falha no resgate (concorrência).");
    }
    await supabaseAdmin.from("transactions").insert({
      store_id: gc.data.store_id, client_user_id: context.userId,
      tipo: "vale_presente", pontos_delta: gc.data.pontos, status: "entregue",
    });
    return { pontos: gc.data.pontos };
  });

// ============================================================
// NOTA FISCAL — OCR via Lovable AI Gateway
// ============================================================
async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const submitNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      store_id: z.string().uuid(),
      image_path: z.string().min(1),
      image_base64: z.string().min(100), // data URL sem prefix
      mime: z.string().default("image/jpeg"),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin.from("stores").select("id, cnpj, regra_pontos, modalidade").eq("id", data.store_id).maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");

    const hash = await sha256Hex(data.image_base64);
    const dup = await supabaseAdmin.from("fiscal_notes").select("id").eq("store_id", data.store_id).eq("image_hash", hash).maybeSingle();
    if (dup.data) throw new Error("Esta nota já foi enviada.");

    // Chama Lovable AI
    const apiKey = process.env.LOVABLE_API_KEY;
    let valor: number | null = null;
    let cnpj: string | null = null;
    let ocrRaw: unknown = null;
    if (apiKey) {
      try {
        const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": apiKey,
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "user",
                content: [
                  {
                    type: "text",
                    text: 'Extraia o VALOR TOTAL (em reais, número) e o CNPJ do estabelecimento desta nota fiscal. Responda APENAS um JSON no formato: {"valor": 12.34, "cnpj": "00.000.000/0000-00"}. Se não conseguir ler algum campo, use null. Sem comentários.',
                  },
                  { type: "image_url", image_url: { url: `data:${data.mime};base64,${data.image_base64}` } },
                ],
              },
            ],
          }),
        });
        const j = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
        ocrRaw = j;
        const raw = j.choices?.[0]?.message?.content ?? "";
        const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
        const parsed = JSON.parse(jsonStr);
        valor = typeof parsed.valor === "number" ? parsed.valor : parsed.valor ? Number(String(parsed.valor).replace(/[^\d.,]/g, "").replace(",", ".")) : null;
        cnpj = parsed.cnpj ? String(parsed.cnpj).replace(/\D/g, "") : null;
      } catch (e) {
        ocrRaw = { error: (e as Error).message };
      }
    }

    // Status inicial: pendente (lojista revisa)
    const { data: inserted, error } = await supabaseAdmin.from("fiscal_notes").insert({
      store_id: data.store_id,
      client_user_id: context.userId,
      image_path: data.image_path,
      image_hash: hash,
      valor,
      cnpj_extraido: cnpj,
      ocr_raw: ocrRaw as never,
      status: "pendente",
    }).select("*").single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const aprovarNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      valor_final: z.number().positive(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nota = await supabaseAdmin.from("fiscal_notes").select("*, stores!inner(owner_id, regra_pontos, modalidade)").eq("id", data.id).maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    const n: any = nota.data;
    if (!n || n.stores.owner_id !== context.userId) throw new Error("Nota não encontrada.");
    if (n.status !== "pendente") throw new Error("Nota já processada.");

    const inclP = n.stores.modalidade !== "cashback";
    const pontos = inclP ? Math.floor(data.valor_final * Number(n.stores.regra_pontos)) : 0;

    // credita
    const link = await supabaseAdmin.from("store_clients").select("*")
      .eq("store_id", n.store_id).eq("user_id", n.client_user_id).maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado.");
    const novoPontos = link.data.pontos + pontos;
    await supabaseAdmin.from("store_clients").update({
      pontos: novoPontos, nivel: calcularNivel(novoPontos),
    }).eq("id", link.data.id);
    await supabaseAdmin.from("transactions").insert({
      store_id: n.store_id, client_user_id: n.client_user_id,
      tipo: "nota_fiscal", valor: data.valor_final, pontos_delta: pontos, status: "entregue",
    });
    await supabaseAdmin.from("fiscal_notes").update({
      status: "aprovada", valor: data.valor_final, pontos_creditados: pontos,
    }).eq("id", data.id);

    const { notifyClient } = await import("./notify.server");
    await notifyClient({ event: "pontos_ganhos", storeId: n.store_id, clientUserId: n.client_user_id, pontosGanhos: pontos });
    return { pontos };
  });

export const rejeitarNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), motivo: z.string().max(300) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nota = await supabaseAdmin.from("fiscal_notes").select("id, stores!inner(owner_id)").eq("id", data.id).maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    if (!nota.data || (nota.data as any).stores.owner_id !== context.userId) throw new Error("Nota não encontrada.");
    await supabaseAdmin.from("fiscal_notes").update({ status: "rejeitada", motivo_rejeicao: data.motivo }).eq("id", data.id);
    return { ok: true };
  });

// ============================================================
// CLIENT TAGS
// ============================================================
export const addClientTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    store_id: z.string().uuid(), client_user_id: z.string().uuid(), tag: z.string().min(1).max(30),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin.from("stores").select("owner_id").eq("id", data.store_id).maybeSingle();
    if (!loja.data || loja.data.owner_id !== context.userId) throw new Error("Loja inválida.");
    const { error } = await supabaseAdmin.from("client_tags").insert({
      store_id: data.store_id, client_user_id: data.client_user_id, tag: data.tag.trim().toLowerCase(),
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const removeClientTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = await supabaseAdmin.from("client_tags").select("id, stores:store_id(owner_id)").eq("id", data.id).maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    if (!t.data || (t.data as any).stores.owner_id !== context.userId) throw new Error("Tag não encontrada.");
    await supabaseAdmin.from("client_tags").delete().eq("id", data.id);
    return { ok: true };
  });

// -------- LOJISTA: excluir vínculo de um cliente da sua loja --------
// Remove somente o vínculo (store_clients) — não apaga o usuário do auth,
// pois ele pode ser cliente de outras lojas. Remove também tags específicas
// deste cliente nesta loja.
export const excluirClienteDaLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    store_id: z.string().uuid(),
    client_user_id: z.string().uuid(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const owner = await supabaseAdmin.from("stores").select("id").eq("id", data.store_id).eq("owner_id", context.userId).maybeSingle();
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
    await supabaseAdmin.from("nps_responses").delete().eq("store_id", sid).eq("client_user_id", uid);
    // 5) Logs de notificação
    await supabaseAdmin.from("notification_logs").delete().eq("store_id", sid).eq("client_user_id", uid);
    // 6) Destinatários de campanhas (apaga por campanhas desta loja)
    const camps = await supabaseAdmin.from("campaigns").select("id").eq("store_id", sid);
    const campIds = (camps.data ?? []).map((c) => c.id);
    if (campIds.length) {
      await supabaseAdmin.from("campaign_recipients").delete().eq("client_user_id", uid).in("campaign_id", campIds);
    }
    // 7) Vales-presente resgatados por este cliente nesta loja: soltar o resgate
    await supabaseAdmin.from("gift_cards").update({ redeemed_by: null, redeemed_at: null }).eq("store_id", sid).eq("redeemed_by", uid);

    // 8) Vínculo com a loja (por último)
    const del = await supabaseAdmin
      .from("store_clients")
      .delete()
      .eq("store_id", sid)
      .eq("user_id", uid)
      .select("id");
    if (del.error) throw new Error(del.error.message);
    if (!del.data || del.data.length === 0) throw new Error("Cliente não estava vinculado a esta loja.");

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

// ============================================================
// SORTEIOS
// ============================================================
export const salvarSorteio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({
    titulo: z.string().min(1).max(80),
    premio: z.string().min(1).max(160),
    filtro_tag: z.string().max(30).nullable().optional(),
    filtro_nivel_min: z.enum(["bronze","prata","ouro"]).nullable().optional(),
  }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin.from("stores").select("id").eq("owner_id", context.userId).maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const { data: inserted, error } = await supabaseAdmin.from("raffles").insert({
      store_id: loja.data.id,
      titulo: data.titulo, premio: data.premio,
      filtro_tag: data.filtro_tag ?? null,
      filtro_nivel_min: data.filtro_nivel_min ?? null,
      status: "aberto",
    }).select().single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const sortearGanhador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raffle = await supabaseAdmin.from("raffles").select("*, stores!inner(owner_id, nome_fantasia)").eq("id", data.id).maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    const r: any = raffle.data;
    if (!r || r.stores.owner_id !== context.userId) throw new Error("Sorteio não encontrado.");
    if (r.status !== "aberto") throw new Error("Sorteio já finalizado.");

    // elegíveis: busca clientes vinculados e (se houver) tags, e delega a
    // filtragem/seleção à lógica pura em raffle-logic.ts (testada em unit).
    const { elegiveisSorteio, escolherVencedor } = await import("./raffle-logic");
    const linkRes = await supabaseAdmin
      .from("store_clients").select("user_id, nivel").eq("store_id", r.store_id);
    if (linkRes.error) throw new Error(linkRes.error.message);
    const tagRes = r.filtro_tag
      ? await supabaseAdmin.from("client_tags")
          .select("client_user_id, tag").eq("store_id", r.store_id).eq("tag", r.filtro_tag)
      : { data: [] as { client_user_id: string; tag: string }[], error: null };
    // biome-ignore lint/suspicious/noExplicitAny: linhas do Supabase
    const userIds = elegiveisSorteio(
      (linkRes.data ?? []) as any,
      (tagRes.data ?? []) as any,
      { filtro_tag: r.filtro_tag, filtro_nivel_min: r.filtro_nivel_min },
    );
    const winner = escolherVencedor(userIds);
    const prof = await supabaseAdmin.from("profiles").select("full_name").eq("id", winner).maybeSingle();
    await supabaseAdmin.from("raffles").update({
      ganhador_user_id: winner,
      ganhador_nome: prof.data?.full_name ?? null,
      status: "sorteado",
      sorted_at: new Date().toISOString(),
    }).eq("id", r.id);
    return { winner_user_id: winner, winner_name: prof.data?.full_name ?? null, total_elegiveis: userIds.length };
  });

export const cancelarSorteio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin.from("raffles").select("id, stores!inner(owner_id)").eq("id", data.id).maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    if (!r.data || (r.data as any).stores.owner_id !== context.userId) throw new Error("Sorteio não encontrado.");
    await supabaseAdmin.from("raffles").update({ status: "cancelado" }).eq("id", data.id);
    return { ok: true };
  });

// -------- Public lookups (no auth) with safe fields only --------
const PUBLIC_STORE_SELECT =
  "id, slug, nome_fantasia, logo_url, banner_url, banner_url_mobile, brand_primary, brand_secondary, modalidade, regra_pontos, percentual_cashback, indicacao_ativa, bonus_indicador, bonus_indicado, whatsapp_enabled, nps_enabled, created_at, instagram_program_active, instagram_handle, instagram_points_per_post, instagram_min_days_live, instagram_instructions, pontos_expiracao_modo, pontos_validade_dias, pontos_decaimento_dias, pontos_decaimento_valor, voucher_visivel_apos_uso, voucher_mostrar_expirados";

export const lookupPublicStoreBySlug = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ slug: z.string().min(2).max(80) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin
      .from("stores")
      .select(PUBLIC_STORE_SELECT)
      .eq("slug", data.slug)
      .maybeSingle();
    if (r.error) throw new Error(r.error.message);
    return r.data;
  });

export const lookupPublicStoreById = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin
      .from("stores")
      .select(PUBLIC_STORE_SELECT)
      .eq("id", data.id)
      .maybeSingle();
    if (r.error) throw new Error(r.error.message);
    return r.data;
  });

export const lookupGiftCardByCodigo = createServerFn({ method: "GET" })
  .inputValidator((input) => z.object({ codigo: z.string().min(4).max(40) }).parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin
      .from("gift_cards")
      .select("id, store_id, pontos, redeemed_at")
      .eq("codigo", data.codigo)
      .maybeSingle();
    if (r.error) throw new Error(r.error.message);
    return r.data;
  });

// -------- Full store row for the authenticated owner --------
export const getMyStoreFull = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin
      .from("stores")
      .select("*")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (r.error) throw new Error(r.error.message);
    return r.data;
  });
