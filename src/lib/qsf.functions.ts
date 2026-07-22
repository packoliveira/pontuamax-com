import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel, cpfToEmail, isValidCPF } from "./qsf-shared";
import { gerarVoucher } from "./voucher.server";
import {
  getActiveMultiplier,
  promoSchema,
  formatVoucherJaUsado,
  randomGiftCode,
  sha256Hex,
  renderMsg as _renderMsg,
  selecionarDestinatarios,
  processarEnvioCampanha,
} from "./qsf-helpers.server";

// Rate limit helper para server functions sensíveis (público ou por usuário).
// Dinamicamente carrega os módulos server-only para não vazar no client bundle.
async function rateLimitByIp(scope: string, max: number, windowSec: number) {
  const { getRequest } = await import("@tanstack/react-start/server");
  const { checkRateLimit, getClientIp } = await import("./rate-limit.server");
  const req = getRequest();
  const ip = getClientIp(req as unknown as Request);
  const ok = await checkRateLimit(`sfn:${scope}:${ip}`, max, windowSec);
  if (!ok) {
    throw new Error("Muitas tentativas em pouco tempo. Aguarde alguns segundos e tente novamente.");
  }
}

// re-export para o cron `/api/public/hooks/campanhas-agendadas`
export { processarEnvioCampanha as _processarEnvioCampanhaInternal };
// evita "unused import" (renderMsg é usado apenas dentro do helper server)
void _renderMsg;

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
    const existing = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (existing.data) throw new Error("Este slug já está em uso, escolha outro.");
    const ownerCheck = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (ownerCheck.data) throw new Error("Este usuário já possui uma loja.");
    const { data: loja, error } = await supabaseAdmin
      .from("stores")
      .insert({ ...data, owner_id: context.userId })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "lojista" }, { onConflict: "user_id,role" });
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
        cashback_valor_minimo: z.number().min(0).max(1_000_000).optional(),
        cashback_compra_minima: z.number().min(0).max(1_000_000).optional(),
        brand_primary: z.string().max(20).optional(),
        brand_secondary: z.string().max(20).optional(),
        logo_url: z.string().max(2000).optional().nullable(),
        banner_url: z.string().max(2000).optional().nullable(),
        banner_url_mobile: z.string().max(2000).optional().nullable(),
        banner_mobile_fit: z.enum(["cover", "contain"]).optional(),
        banner_mobile_position_x: z.number().int().min(0).max(100).optional(),
        banner_mobile_position_y: z.number().int().min(0).max(100).optional(),
        banner_mobile_zoom: z.number().int().min(100).max(300).optional(),
        bg_mode: z.enum(["dark", "light", "custom"]).optional(),
        bg_color_1: z.string().max(20).optional().nullable(),
        bg_color_2: z.string().max(20).optional().nullable(),
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
        // Personalização estendida da página pública do cliente
        brand_accent_points: z.string().max(20).optional().nullable(),
        brand_accent_cashback: z.string().max(20).optional().nullable(),
        brand_cta: z.string().max(20).optional().nullable(),
        brand_vip: z.string().max(20).optional().nullable(),
        brand_price: z.string().max(20).optional().nullable(),
        text_on_dark: z.string().max(20).optional().nullable(),
        header_title_size: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional(),
        header_title_weight: z.enum(["normal", "semibold", "bold", "black"]).optional(),
        header_kicker_text: z.string().max(40).optional(),
        header_kicker_show: z.boolean().optional(),
        header_kicker_size: z.enum(["xs", "sm", "md"]).optional().nullable(),
        header_title_size_mobile: z.enum(["sm", "md", "lg", "xl", "2xl"]).optional().nullable(),
        header_kicker_size_mobile: z.enum(["xs", "sm", "md"]).optional().nullable(),
        reward_rain_enabled: z.boolean().optional(),
        reward_rain_colors: z.array(z.string().max(20)).max(12).optional(),
        reward_rain_opacity: z.number().min(0.1).max(1).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("stores")
      .update(data)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- CLIENTE: link authenticated user to a store --------
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

// -------- CLIENTE: normalizar login legado para CPF --------
// Clientes criados pelo lojista em versões antigas podiam estar com e-mail
// sintético por telefone. Se o cliente entra com CPF + senha inicial CPF,
// normalizamos a conta existente vinculada à loja para o e-mail por CPF.
export const prepararLoginClientePorCpf = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        cpf: z.string().min(11).max(20),
        senha: z.string().min(6).max(72),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    await rateLimitByIp("prep-login-cpf", 10, 60);
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

// -------- CLIENTE: reivindicar cadastro pendente criado por venda --------
// Quando o lojista lança uma venda (ou o webhook recebe uma venda) para um CPF
// que ainda não tem conta, criamos um profile "pendente" — sem senha real
// definida pelo cliente. Quando esse cliente se auto-cadastra pela página
// pública com o mesmo CPF, esta função REAPROVEITA a conta existente (mesmo
// user_id, mesmo saldo de pontos/cashback), apenas definindo a senha e o nome
// escolhidos por ele. Assim NUNCA cria uma segunda conta com o mesmo CPF.
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
    const cpfDigits = data.cpf.replace(/\D/g, "");
    if (!isValidCPF(cpfDigits)) return { claimed: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const profile = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, phone")
      .eq("cpf", cpfDigits)
      .maybeSingle();
    if (!profile.data) return { claimed: false as const };

    const current = await supabaseAdmin.auth.admin.getUserById(profile.data.id);
    const user = current.data.user;
    // Só reivindica se a conta nunca foi usada de fato pelo cliente. Se ela
    // já tem last_sign_in_at, o cadastro foi completado antes — nesse caso
    // devolve claimed:false e o frontend segue para o fluxo normal, que vai
    // detectar "usuário já cadastrado" e sugerir login.
    if (!user || user.last_sign_in_at) return { claimed: false as const };

    const phoneDigits = (data.phone ?? "").replace(/\D/g, "") || profile.data.phone || null;
    const email = cpfToEmail(cpfDigits);
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

    return { claimed: true as const, email };
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
    const email = cpfToEmail(cpfDigits);
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

    // Login do cliente é SEMPRE pelo CPF.
    const email = cpfToEmail(cpfDigits);
    let userId: string | undefined;
    const existing = existingByCpf
      ? { data: { id: existingByCpf.id } }
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
      .select(
        "id, owner_id, modalidade, regra_pontos, percentual_cashback, indicacao_ativa, bonus_indicador, bonus_indicado, nome_fantasia",
      )
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja inválida.");
    if (loja.data.owner_id !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: data.store_id,
        _perm: "pontos.adicionar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para lançar vendas nesta loja.");
    }
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
    const pontosBase = inclP
      ? Math.floor(data.valor * Number(loja.data.regra_pontos) * multiplicador)
      : 0;
    const cashback = inclC
      ? +(data.valor * (Number(loja.data.percentual_cashback) / 100)).toFixed(2)
      : 0;

    // -------- Bônus de indicação (só na 1ª compra) --------
    let bonusIndicado = 0;
    let bonusIndicador = 0;
    const pagarIndicacao =
      loja.data.indicacao_ativa && !link.data.referral_bonus_paid && link.data.referrer_user_id;
    if (pagarIndicacao) {
      bonusIndicado = Number(loja.data.bonus_indicado) || 0;
      bonusIndicador = Number(loja.data.bonus_indicador) || 0;
    }

    const pontos = pontosBase + bonusIndicado;
    const novoPontos = link.data.pontos + pontos;
    const novoCashback = +(Number(link.data.cashback_saldo) + cashback).toFixed(2);
    const { data: txRow, error: txErr } = await supabaseAdmin
      .from("transactions")
      .insert({
        store_id: data.store_id,
        client_user_id: data.client_user_id,
        tipo: "venda",
        valor: data.valor,
        pontos_delta: pontos,
        cashback_delta: cashback,
        status: "entregue",
      })
      .select("id")
      .single();
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
        .from("store_clients")
        .select("id, pontos")
        .eq("store_id", data.store_id)
        .eq("user_id", link.data.referrer_user_id)
        .maybeSingle();
      if (refLink.data) {
        const novoRef = refLink.data.pontos + bonusIndicador;
        await supabaseAdmin
          .from("store_clients")
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
export const salvarPromocao = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => promoSchema.parse(input))
  .handler(async ({ data, context }) => {
    const loja = await context.supabase
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
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
    const { error } = await context.supabase
      .from("stores")
      .update(data)
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- Aniversário do cliente (lojista edita) --------
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
export const ajustarPontosCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        client_user_id: z.string().uuid(),
        // positivo = adicionar; negativo = estornar
        delta: z
          .number()
          .int()
          .min(-1_000_000)
          .max(1_000_000)
          .refine((n) => n !== 0, "Informe uma quantidade diferente de zero."),
        motivo: z.string().max(200).optional(),
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
      const requiredPerm = data.delta > 0 ? "pontos.adicionar" : "pontos.estornar";
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: data.store_id,
        _perm: requiredPerm,
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para ajustar pontos nesta loja.");
    }
    const link = await supabaseAdmin
      .from("store_clients")
      .select("id, pontos")
      .eq("store_id", data.store_id)
      .eq("user_id", data.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    const novoPontos = link.data.pontos + data.delta;
    if (novoPontos < 0)
      throw new Error(`Estorno maior que o saldo atual (${link.data.pontos} pts).`);
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
    z
      .object({
        transaction_id: z.string().uuid(),
        motivo: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tx = await supabaseAdmin
      .from("transactions")
      .select(
        "id, store_id, client_user_id, tipo, valor, pontos_delta, cashback_delta, origem, stores:store_id(owner_id)",
      )
      .eq("id", data.transaction_id)
      .maybeSingle();
    if (!tx.data) throw new Error("Venda não encontrada.");
    const owner = (tx.data.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (owner !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: tx.data.store_id,
        _perm: "pontos.estornar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para estornar esta venda.");
    }
    if (tx.data.tipo !== "venda")
      throw new Error("Só é possível estornar transações do tipo venda.");
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
      .from("store_clients")
      .select("id, pontos, cashback_saldo")
      .eq("store_id", tx.data.store_id)
      .eq("user_id", tx.data.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");

    const deltaPontos = -Number(tx.data.pontos_delta || 0);
    const deltaCashback = -Number(tx.data.cashback_delta || 0);
    const novoPontos = Math.max(0, link.data.pontos + deltaPontos);
    const novoCashback = Math.max(
      0,
      +(Number(link.data.cashback_saldo) + deltaCashback).toFixed(2),
    );

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
      .update({
        pontos: novoPontos,
        cashback_saldo: novoCashback,
        nivel: calcularNivel(novoPontos),
      })
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
    const store = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) throw new Error("Sem loja.");
    const url =
      process.env.VITE_APP_URL ||
      "https://project--62bd2a63-6908-43c2-9917-f4ddac34c65f.lovable.app";
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
    z
      .object({ store_id: z.string().uuid(), valor: z.number().positive().max(1_000_000) })
      .parse(input),
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
      .select(
        "id, store_id, status, tipo, voucher_code, voucher_expires_at, delivered_at, pontos_delta, cashback_delta, product_id, client_user_id, products:product_id(nome), profiles:client_user_id(full_name, phone), stores:store_id(owner_id, nome_fantasia)",
      )
      .eq("id", data.transaction_id)
      .maybeSingle();
    const ownerId = (tx.data?.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (!tx.data) throw new Error("Não autorizado.");
    if (ownerId !== context.userId) {
      const canValidate = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: tx.data.store_id,
        _perm: "vouchers.validar",
      });
      if (canValidate.error) throw new Error(canValidate.error.message);
      const canRedeem = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: tx.data.store_id,
        _perm: "resgates.produtos",
      });
      if (canRedeem.error) throw new Error(canRedeem.error.message);
      if (!canValidate.data && !canRedeem.data) throw new Error("Não autorizado.");
    }
    if (tx.data.status === "entregue") {
      throw new Error(formatVoucherJaUsado(tx.data.delivered_at));
    }
    if (tx.data.status === "expirado")
      throw new Error("Voucher expirado — os pontos/cashback já foram devolvidos ao cliente.");
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
      if (recheck.data?.status === "entregue")
        throw new Error(formatVoucherJaUsado(recheck.data.delivered_at));
      if (recheck.data?.status === "expirado")
        throw new Error("Voucher expirado — os pontos/cashback já foram devolvidos ao cliente.");
      if (recheck.data?.status === "cancelado") throw new Error("Voucher cancelado.");
      throw new Error("Não foi possível confirmar o voucher. Atualize a página e tente novamente.");
    }
    const store = tx.data.stores as unknown as { nome_fantasia: string | null } | null;
    const profile = tx.data.profiles as { full_name: string | null; phone: string | null } | null;
    const product = tx.data.products as { nome: string | null } | null;
    // Trilha de auditoria
    try {
      const { logEmployeeAction } = await import("@/lib/team.functions");
      await logEmployeeAction({
        storeId: tx.data.store_id,
        actorUserId: context.userId,
        action: "resgate.confirmado",
        targetLabel: tx.data.voucher_code,
        meta: {
          transaction_id: tx.data.id,
          tipo: tx.data.tipo,
          cliente: profile?.full_name ?? null,
          produto: product?.nome ?? null,
          pontos_usados: Math.abs(Number(tx.data.pontos_delta ?? 0)),
          cashback_aplicado: Math.abs(Number(tx.data.cashback_delta ?? 0)),
          delivered_at: deliveredAt,
        },
      });
    } catch {
      /* ignore */
    }
    try {
      const { notifyMerchant, resolveActorLabel } = await import("@/lib/team.functions");
      const actor = await resolveActorLabel(context.userId, tx.data.store_id);
      const pts = Math.abs(Number(tx.data.pontos_delta ?? 0));
      const cb = Math.abs(Number(tx.data.cashback_delta ?? 0));
      const partes = [pts ? `${pts} pts` : null, cb ? `R$ ${cb.toFixed(2)} cashback` : null]
        .filter(Boolean)
        .join(" • ");
      await notifyMerchant({
        storeId: tx.data.store_id,
        actorUserId: context.userId,
        actorLabel: actor,
        tipo: "resgate.confirmado",
        titulo: `Resgate confirmado${actor ? ` por ${actor}` : ""}`,
        mensagem: `${profile?.full_name ?? "Cliente"} — ${product?.nome ?? tx.data.tipo}${partes ? " • " + partes : ""}`,
        metadata: {
          transaction_id: tx.data.id,
          voucher: tx.data.voucher_code,
          pontos: pts,
          cashback: cb,
        },
      });
    } catch {
      /* ignore */
    }
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
    await rateLimitByIp(`validar-voucher:${context.userId}`, 30, 60);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let store = await supabaseAdmin
      .from("stores")
      .select("id, nome_fantasia")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) {
      const emp = await supabaseAdmin
        .from("store_employees")
        .select("store_id")
        .eq("user_id", context.userId)
        .eq("status", "ativo")
        .limit(10);
      for (const row of emp.data ?? []) {
        const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
          _user_id: context.userId,
          _store_id: row.store_id,
          _perm: "vouchers.validar",
        });
        if (perm.error) throw new Error(perm.error.message);
        if (perm.data) {
          store = await supabaseAdmin
            .from("stores")
            .select("id, nome_fantasia")
            .eq("id", row.store_id)
            .maybeSingle();
          break;
        }
      }
    }
    if (!store.data) throw new Error("Loja não encontrada ou sem permissão para validar vouchers.");
    const code = data.voucher_code.trim().toUpperCase();
    const tx = await supabaseAdmin
      .from("transactions")
      .select(
        "id, tipo, status, valor, pontos_delta, cashback_delta, voucher_code, voucher_expires_at, delivered_at, product_id, client_user_id, products:product_id(nome), profiles:client_user_id(full_name, phone)",
      )
      .eq("store_id", store.data.id)
      .eq("voucher_code", code)
      .maybeSingle();
    if (!tx.data) throw new Error("Voucher não encontrado nesta loja.");
    if (tx.data.status === "entregue") {
      throw new Error(formatVoucherJaUsado(tx.data.delivered_at));
    }
    if (tx.data.status === "expirado")
      throw new Error("Voucher expirado — saldo já devolvido ao cliente.");
    if (tx.data.voucher_expires_at && new Date(tx.data.voucher_expires_at).getTime() < Date.now()) {
      throw new Error("Voucher expirado — saldo já devolvido ao cliente.");
    }
    // Update condicional idempotente: previne dupla entrega em corrida.
    const upd = await supabaseAdmin
      .from("transactions")
      .update({
        status: "entregue",
        delivered_at: new Date().toISOString(),
        redeemed_by: context.userId,
      })
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
      if (recheck.data?.status === "entregue")
        throw new Error(formatVoucherJaUsado(recheck.data.delivered_at));
      if (recheck.data?.status === "cancelado") throw new Error("Voucher cancelado.");
      throw new Error("Voucher indisponível para entrega.");
    }
    try {
      const { logEmployeeAction } = await import("@/lib/team.functions");
      await logEmployeeAction({
        storeId: store.data.id,
        actorUserId: context.userId,
        action: "voucher.validado",
        targetLabel: tx.data.voucher_code,
        meta: {
          transaction_id: tx.data.id,
          tipo: tx.data.tipo,
          pontos: Math.abs(Number(tx.data.pontos_delta || 0)),
          cashback: Math.abs(Number(tx.data.cashback_delta || 0)),
        },
      });
    } catch {
      /* ignore */
    }
    try {
      const { notifyMerchant, resolveActorLabel } = await import("@/lib/team.functions");
      const actor = await resolveActorLabel(context.userId, store.data.id);
      const pts = Math.abs(Number(tx.data.pontos_delta || 0));
      const cb = Math.abs(Number(tx.data.cashback_delta || 0));
      const partes = [pts ? `${pts} pts` : null, cb ? `R$ ${cb.toFixed(2)} cashback` : null]
        .filter(Boolean)
        .join(" • ");
      const clienteNome =
        (tx.data.profiles as { full_name: string | null } | null)?.full_name ?? "Cliente";
      await notifyMerchant({
        storeId: store.data.id,
        actorUserId: context.userId,
        actorLabel: actor,
        tipo: "voucher.validado",
        titulo: `Voucher validado${actor ? ` por ${actor}` : ""}`,
        mensagem: `${clienteNome} — ${tx.data.voucher_code}${partes ? " • " + partes : ""}`,
        metadata: {
          transaction_id: tx.data.id,
          voucher: tx.data.voucher_code,
          pontos: pts,
          cashback: cb,
        },
      });
    } catch {
      /* ignore */
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
      .select(
        "id, store_id, status, tipo, pontos_delta, cashback_delta, client_user_id, stores:store_id(owner_id)",
      )
      .eq("id", data.transaction_id)
      .maybeSingle();
    const ownerId = (tx.data?.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (!tx.data) throw new Error("Não autorizado.");
    if (ownerId !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: tx.data.store_id,
        _perm: "vouchers.validar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Não autorizado.");
    }
    if (tx.data.status !== "pendente")
      throw new Error("Só é possível cancelar vouchers pendentes.");
    const upd = await supabaseAdmin
      .from("transactions")
      .update({ status: "cancelado", redeemed_by: context.userId })
      .eq("id", tx.data.id)
      .eq("status", "pendente")
      .select("id");
    if (upd.error) throw new Error(upd.error.message);
    if (!upd.data || upd.data.length === 0)
      throw new Error("Voucher já foi entregue ou cancelado.");
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
        const novoCashback = Math.max(
          0,
          +(Number(link.data.cashback_saldo) + cashbackDevolver).toFixed(2),
        );
        await supabaseAdmin
          .from("store_clients")
          .update({
            pontos: novoPontos,
            cashback_saldo: novoCashback,
            nivel: calcularNivel(novoPontos),
          })
          .eq("id", link.data.id);
      }
    }
    try {
      const { logEmployeeAction } = await import("@/lib/team.functions");
      await logEmployeeAction({
        storeId: tx.data.store_id,
        actorUserId: context.userId,
        action: "voucher.cancelado",
        meta: {
          transaction_id: tx.data.id,
          tipo: tx.data.tipo,
          pontos_devolvidos: -Number(tx.data.pontos_delta || 0),
          cashback_devolvido: -Number(tx.data.cashback_delta || 0),
        },
      });
    } catch {
      /* ignore */
    }
    try {
      const { notifyMerchant, resolveActorLabel } = await import("@/lib/team.functions");
      const actor = await resolveActorLabel(context.userId, tx.data.store_id);
      const pts = -Number(tx.data.pontos_delta || 0);
      const cb = -Number(tx.data.cashback_delta || 0);
      const partes = [
        pts ? `${pts} pts devolvidos` : null,
        cb ? `R$ ${cb.toFixed(2)} cashback devolvido` : null,
      ]
        .filter(Boolean)
        .join(" • ");
      await notifyMerchant({
        storeId: tx.data.store_id,
        actorUserId: context.userId,
        actorLabel: actor,
        tipo: "voucher.cancelado",
        titulo: `Voucher cancelado${actor ? ` por ${actor}` : ""}`,
        mensagem: `${tx.data.tipo}${partes ? " • " + partes : ""}`,
        metadata: { transaction_id: tx.data.id, pontos: pts, cashback: cb },
      });
    } catch {
      /* ignore */
    }
    return { ok: true };
  });

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
    const check = await context.supabase
      .from("stores")
      .select("id")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!check.data) throw new Error("Loja não encontrada.");
    if (data.id) {
      const { error } = await context.supabase
        .from("products")
        .update({
          nome: data.nome,
          descricao: data.descricao,
          custo_pontos: data.custo_pontos,
          ativo: data.ativo,
          foto_url: data.foto_url ?? null,
        })
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
    const store = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) throw new Error("Loja não encontrada.");
    const { saveStoreSecrets } = await import("./store-secrets.server");
    await saveStoreSecrets(store.data.id, { webhook_secret: secret });
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
      .select("id, slug")
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) throw new Error("Loja não encontrada.");
    const { error } = await context.supabase
      .from("stores")
      .update({
        whatsapp_enabled: data.whatsapp_enabled,
        whatsapp_template_pontos: data.whatsapp_template_pontos,
      })
      .eq("owner_id", context.userId);
    if (error) throw new Error(error.message);
    const { saveStoreSecrets } = await import("./store-secrets.server");
    await saveStoreSecrets(store.data.id, {
      evolution_url: data.evolution_url ?? null,
      evolution_apikey: data.evolution_apikey ?? null,
      evolution_instance: data.evolution_instance ?? null,
    });
    return { ok: true };
  });

// -------- WhatsApp: enviar mensagem de teste --------
export const enviarWhatsappTeste = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        telefone: z.string().min(8).max(20),
        texto: z.string().min(1).max(1000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, nome_fantasia")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const { getStoreSecrets } = await import("./store-secrets.server");
    const secrets = await getStoreSecrets(loja.data.id);
    if (!secrets.evolution_url || !secrets.evolution_apikey || !secrets.evolution_instance) {
      throw new Error("Configure URL, API key e instância da Evolution API antes de testar.");
    }
    const { formatBrazilPhone, sendWhatsappRaw } = await import("./notify.server");
    const numero = formatBrazilPhone(data.telefone);
    if (!numero) throw new Error("Telefone inválido.");
    const texto =
      data.texto ??
      `✅ Teste PontuaMax — ${loja.data.nome_fantasia}. Integração WhatsApp funcionando!`;
    const res = await sendWhatsappRaw({
      storeId: loja.data.id,
      url: secrets.evolution_url,
      apikey: secrets.evolution_apikey,
      instance: secrets.evolution_instance,
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
      .select("id, slug")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const { getStoreSecrets, saveStoreSecrets } = await import("./store-secrets.server");
    const secrets = await getStoreSecrets(loja.data.id);
    if (!secrets.evolution_url || !secrets.evolution_apikey) {
      throw new Error("Configure URL e API Key da Evolution API antes de conectar.");
    }
    const base = secrets.evolution_url.replace(/\/$/, "");
    const instance = secrets.evolution_instance || `qsf-${loja.data.slug}`;
    const headers = { "Content-Type": "application/json", apikey: secrets.evolution_apikey };
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
      const connRes = await fetch(`${base}/instance/connect/${encodeURIComponent(instance)}`, {
        headers,
      });
      if (!connRes.ok) {
        const body = await connRes.text();
        throw new Error(`Evolution API [${connRes.status}]: ${body.slice(0, 200)}`);
      }
      const j = (await connRes.json()) as { base64?: string; qrcode?: { base64?: string } };
      qr = j?.base64 ?? j?.qrcode?.base64 ?? null;
    }
    if (secrets.evolution_instance !== instance) {
      await saveStoreSecrets(loja.data.id, { evolution_instance: instance });
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
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) return { state: "unconfigured" as string };
    const { getStoreSecrets } = await import("./store-secrets.server");
    const d = await getStoreSecrets(loja.data.id);
    if (!d?.evolution_url || !d?.evolution_apikey || !d?.evolution_instance) {
      return { state: "unconfigured" as string };
    }
    const base = d.evolution_url.replace(/\/$/, "");
    try {
      const res = await fetch(
        `${base}/instance/connectionState/${encodeURIComponent(d.evolution_instance)}`,
        {
          headers: { apikey: d.evolution_apikey },
        },
      );
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
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) return { ok: true };
    const { getStoreSecrets } = await import("./store-secrets.server");
    const d = await getStoreSecrets(loja.data.id);
    if (!d?.evolution_url || !d?.evolution_apikey || !d?.evolution_instance) return { ok: true };
    const base = d.evolution_url.replace(/\/$/, "");
    await fetch(`${base}/instance/logout/${encodeURIComponent(d.evolution_instance)}`, {
      method: "DELETE",
      headers: { apikey: d.evolution_apikey },
    }).catch(() => null);
    return { ok: true };
  });

// -------- Campanhas WhatsApp em massa --------
export const criarCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        nome: z.string().min(1).max(100),
        mensagem: z.string().min(1).max(2000),
        segmento: z.enum([
          "todos",
          "bronze",
          "prata",
          "ouro",
          "inativos_30",
          "inativos_60",
          "inativos_90",
          "aniversariantes",
        ]),
        agendada_para: z.string().datetime().optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const destinatarios = await selecionarDestinatarios(loja.data.id, data.segmento);
    const agendada =
      data.agendada_para && new Date(data.agendada_para).getTime() > Date.now()
        ? data.agendada_para
        : null;
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
    z
      .object({
        segmento: z.enum([
          "todos",
          "bronze",
          "prata",
          "ouro",
          "inativos_30",
          "inativos_60",
          "inativos_90",
          "aniversariantes",
        ]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const destinatarios = await selecionarDestinatarios(loja.data.id, data.segmento);
    return {
      total: destinatarios.length,
      amostra: destinatarios.slice(0, 5).map((d) => ({ nome: d.full_name, telefone: d.phone })),
    };
  });
// ============================================================
// VALE-PRESENTE / GIFT CARDS
// ============================================================
export const criarGiftCards = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        pontos: z.number().int().positive().max(100000),
        quantidade: z.number().int().min(1).max(100),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
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
    const gc = await supabaseAdmin
      .from("gift_cards")
      .select("id, store_id, redeemed_at, stores!inner(owner_id)")
      .eq("id", data.id)
      .maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join shape
    if (!gc.data || (gc.data as any).stores.owner_id !== context.userId)
      throw new Error("Vale não encontrado.");
    if (gc.data.redeemed_at) throw new Error("Vale já resgatado, não pode remover.");
    const { error } = await supabaseAdmin.from("gift_cards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resgatarGiftCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ codigo: z.string().min(4).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    await rateLimitByIp(`gift-card:${context.userId}`, 10, 60);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const gc = await supabaseAdmin
      .from("gift_cards")
      .select("*")
      .eq("codigo", data.codigo)
      .maybeSingle();
    if (!gc.data) throw new Error("Código inválido.");
    if (gc.data.redeemed_at) throw new Error("Vale já resgatado.");
    // vincula cliente à loja se ainda não estiver
    const linkExisting = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", gc.data.store_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    let link = linkExisting.data;
    if (!link) {
      const ins = await supabaseAdmin
        .from("store_clients")
        .insert({
          store_id: gc.data.store_id,
          user_id: context.userId,
          pontos: 0,
          cashback_saldo: 0,
          nivel: "bronze",
        })
        .select("*")
        .single();
      if (ins.error) throw new Error(ins.error.message);
      link = ins.data;
    }
    const novoPontos = link.pontos + gc.data.pontos;
    const upd = await supabaseAdmin
      .from("store_clients")
      .update({
        pontos: novoPontos,
        nivel: calcularNivel(novoPontos),
      })
      .eq("id", link.id);
    if (upd.error) throw new Error(upd.error.message);
    const mark = await supabaseAdmin
      .from("gift_cards")
      .update({
        redeemed_by: context.userId,
        redeemed_at: new Date().toISOString(),
      })
      .eq("id", gc.data.id)
      .is("redeemed_at", null)
      .select("id")
      .single();
    if (mark.error) {
      // rollback pontos
      await supabaseAdmin
        .from("store_clients")
        .update({ pontos: link.pontos, nivel: calcularNivel(link.pontos) })
        .eq("id", link.id);
      throw new Error("Falha no resgate (concorrência).");
    }
    await supabaseAdmin.from("transactions").insert({
      store_id: gc.data.store_id,
      client_user_id: context.userId,
      tipo: "vale_presente",
      pontos_delta: gc.data.pontos,
      status: "entregue",
    });
    return { pontos: gc.data.pontos };
  });

// ============================================================
// NOTA FISCAL — OCR via Lovable AI Gateway
// ============================================================
export const submitNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        image_path: z.string().min(1),
        image_base64: z.string().min(100), // data URL sem prefix
        mime: z.string().default("image/jpeg"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, cnpj, regra_pontos, modalidade")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");

    const hash = await sha256Hex(data.image_base64);
    const dup = await supabaseAdmin
      .from("fiscal_notes")
      .select("id")
      .eq("store_id", data.store_id)
      .eq("image_hash", hash)
      .maybeSingle();
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
                  {
                    type: "image_url",
                    image_url: { url: `data:${data.mime};base64,${data.image_base64}` },
                  },
                ],
              },
            ],
          }),
        });
        const j = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        ocrRaw = j;
        const raw = j.choices?.[0]?.message?.content ?? "";
        const jsonStr = raw.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
        const parsed = JSON.parse(jsonStr);
        valor =
          typeof parsed.valor === "number"
            ? parsed.valor
            : parsed.valor
              ? Number(
                  String(parsed.valor)
                    .replace(/[^\d.,]/g, "")
                    .replace(",", "."),
                )
              : null;
        cnpj = parsed.cnpj ? String(parsed.cnpj).replace(/\D/g, "") : null;
      } catch (e) {
        ocrRaw = { error: (e as Error).message };
      }
    }

    // Status inicial: pendente (lojista revisa)
    const { data: inserted, error } = await supabaseAdmin
      .from("fiscal_notes")
      .insert({
        store_id: data.store_id,
        client_user_id: context.userId,
        image_path: data.image_path,
        image_hash: hash,
        valor,
        cnpj_extraido: cnpj,
        ocr_raw: ocrRaw as never,
        status: "pendente",
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const aprovarNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        valor_final: z.number().positive(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nota = await supabaseAdmin
      .from("fiscal_notes")
      .select("*, stores!inner(owner_id, regra_pontos, modalidade)")
      .eq("id", data.id)
      .maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    const n: any = nota.data;
    if (!n || n.stores.owner_id !== context.userId) throw new Error("Nota não encontrada.");
    if (n.status !== "pendente") throw new Error("Nota já processada.");

    const inclP = n.stores.modalidade !== "cashback";
    const pontos = inclP ? Math.floor(data.valor_final * Number(n.stores.regra_pontos)) : 0;

    // credita
    const link = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", n.store_id)
      .eq("user_id", n.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado.");
    const novoPontos = link.data.pontos + pontos;
    await supabaseAdmin
      .from("store_clients")
      .update({
        pontos: novoPontos,
        nivel: calcularNivel(novoPontos),
      })
      .eq("id", link.data.id);
    await supabaseAdmin.from("transactions").insert({
      store_id: n.store_id,
      client_user_id: n.client_user_id,
      tipo: "nota_fiscal",
      valor: data.valor_final,
      pontos_delta: pontos,
      status: "entregue",
    });
    await supabaseAdmin
      .from("fiscal_notes")
      .update({
        status: "aprovada",
        valor: data.valor_final,
        pontos_creditados: pontos,
      })
      .eq("id", data.id);

    const { notifyClient } = await import("./notify.server");
    await notifyClient({
      event: "pontos_ganhos",
      storeId: n.store_id,
      clientUserId: n.client_user_id,
      pontosGanhos: pontos,
    });
    return { pontos };
  });

export const rejeitarNotaFiscal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), motivo: z.string().max(300) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nota = await supabaseAdmin
      .from("fiscal_notes")
      .select("id, stores!inner(owner_id)")
      .eq("id", data.id)
      .maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    if (!nota.data || (nota.data as any).stores.owner_id !== context.userId)
      throw new Error("Nota não encontrada.");
    await supabaseAdmin
      .from("fiscal_notes")
      .update({ status: "rejeitada", motivo_rejeicao: data.motivo })
      .eq("id", data.id);
    return { ok: true };
  });

// ============================================================
// CLIENT TAGS
// ============================================================
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

// ============================================================
// SORTEIOS
// ============================================================
export const salvarSorteio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        titulo: z.string().min(1).max(80),
        premio: z.string().min(1).max(160),
        filtro_tag: z.string().max(30).nullable().optional(),
        filtro_nivel_min: z.enum(["bronze", "prata", "ouro"]).nullable().optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const { data: inserted, error } = await supabaseAdmin
      .from("raffles")
      .insert({
        store_id: loja.data.id,
        titulo: data.titulo,
        premio: data.premio,
        filtro_tag: data.filtro_tag ?? null,
        filtro_nivel_min: data.filtro_nivel_min ?? null,
        status: "aberto",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const sortearGanhador = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const raffle = await supabaseAdmin
      .from("raffles")
      .select("*, stores!inner(owner_id, nome_fantasia)")
      .eq("id", data.id)
      .maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    const r: any = raffle.data;
    if (!r || r.stores.owner_id !== context.userId) throw new Error("Sorteio não encontrado.");
    if (r.status !== "aberto") throw new Error("Sorteio já finalizado.");

    // elegíveis: busca clientes vinculados e (se houver) tags, e delega a
    // filtragem/seleção à lógica pura em raffle-logic.ts (testada em unit).
    const { elegiveisSorteio, escolherVencedor } = await import("./raffle-logic");
    const linkRes = await supabaseAdmin
      .from("store_clients")
      .select("user_id, nivel")
      .eq("store_id", r.store_id);
    if (linkRes.error) throw new Error(linkRes.error.message);
    const tagRes = r.filtro_tag
      ? await supabaseAdmin
          .from("client_tags")
          .select("client_user_id, tag")
          .eq("store_id", r.store_id)
          .eq("tag", r.filtro_tag)
      : { data: [] as { client_user_id: string; tag: string }[], error: null };
    // biome-ignore lint/suspicious/noExplicitAny: linhas do Supabase
    const userIds = elegiveisSorteio((linkRes.data ?? []) as any, (tagRes.data ?? []) as any, {
      filtro_tag: r.filtro_tag,
      filtro_nivel_min: r.filtro_nivel_min,
    });
    const winner = escolherVencedor(userIds);
    const prof = await supabaseAdmin
      .from("profiles")
      .select("full_name")
      .eq("id", winner)
      .maybeSingle();
    await supabaseAdmin
      .from("raffles")
      .update({
        ganhador_user_id: winner,
        ganhador_nome: prof.data?.full_name ?? null,
        status: "sorteado",
        sorted_at: new Date().toISOString(),
      })
      .eq("id", r.id);
    return {
      winner_user_id: winner,
      winner_name: prof.data?.full_name ?? null,
      total_elegiveis: userIds.length,
    };
  });

export const cancelarSorteio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin
      .from("raffles")
      .select("id, stores!inner(owner_id)")
      .eq("id", data.id)
      .maybeSingle();
    // biome-ignore lint/suspicious/noExplicitAny: join
    if (!r.data || (r.data as any).stores.owner_id !== context.userId)
      throw new Error("Sorteio não encontrado.");
    await supabaseAdmin.from("raffles").update({ status: "cancelado" }).eq("id", data.id);
    return { ok: true };
  });

// -------- Public lookups (no auth) with safe fields only --------
const PUBLIC_STORE_SELECT =
  "id, slug, nome_fantasia, logo_url, banner_url, banner_url_mobile, banner_mobile_fit, banner_mobile_position_x, banner_mobile_position_y, banner_mobile_zoom, brand_primary, brand_secondary, bg_mode, bg_color_1, bg_color_2, modalidade, regra_pontos, percentual_cashback, cashback_valor_minimo, cashback_compra_minima, indicacao_ativa, bonus_indicador, bonus_indicado, whatsapp_enabled, nps_enabled, created_at, instagram_program_active, instagram_handle, instagram_points_per_post, instagram_min_days_live, instagram_instructions, pontos_expiracao_modo, pontos_validade_dias, pontos_decaimento_dias, pontos_decaimento_valor, voucher_visivel_apos_uso, voucher_mostrar_expirados, brand_accent_points, brand_accent_cashback, brand_cta, brand_vip, brand_price, text_on_dark, header_title_size, header_title_weight, header_kicker_text, header_kicker_show, header_kicker_size, header_title_size_mobile, header_kicker_size_mobile, reward_rain_enabled, reward_rain_colors, reward_rain_opacity";

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
    if (!r.data) return null;
    // Merge sensitive secrets (kept in a separate service-role-only table)
    // so the merchant dashboard shape stays unchanged.
    const { getStoreSecrets } = await import("./store-secrets.server");
    const s = await getStoreSecrets(r.data.id);
    return { ...r.data, ...s } as typeof r.data & {
      webhook_secret: string | null;
      evolution_url: string | null;
      evolution_apikey: string | null;
      evolution_instance: string | null;
    };
  });
