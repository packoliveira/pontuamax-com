import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel, gerarVoucher } from "./qsf-shared";

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
        indicacao_ativa: z.boolean().optional(),
        bonus_indicador: z.number().int().min(0).max(10000).optional(),
        bonus_indicado: z.number().int().min(0).max(10000).optional(),
        nps_enabled: z.boolean().optional(),
        nps_ask_comment: z.boolean().optional(),
        nps_template: z.string().min(1).max(2000).optional(),
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
    // Verifica se já existe link (para não sobrescrever referrer)
    const existing = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", data.store_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (existing.data) return existing.data;

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
    if (error) throw new Error(error.message);
    return link;
  });

// -------- LOJISTA: cadastrar novo cliente pelo telefone (durante lançar venda) --------
// Cria auth user com email sintético e senha temporária = telefone
export const cadastrarClientePorTelefone = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        phone: z.string().min(8).max(20),
        nome: z.string().min(1).max(100),
        store_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // owner check
    const owner = await supabaseAdmin.from("stores").select("id").eq("id", data.store_id).eq("owner_id", context.userId).maybeSingle();
    if (!owner.data) throw new Error("Você não é dono desta loja.");
    const digits = data.phone.replace(/\D/g, "");
    const email = `${digits}@cliente.qsfclub.local`;
    // Try to find existing user
    let userId: string | undefined;
    const existing = await supabaseAdmin.from("profiles").select("id").eq("phone", digits).maybeSingle();
    if (existing.data) {
      userId = existing.data.id;
    } else {
      const created = await supabaseAdmin.auth.admin.createUser({
        email,
        password: digits,
        email_confirm: true,
        user_metadata: { full_name: data.nome, phone: digits },
      });
      if (created.error || !created.data.user) throw new Error(created.error?.message ?? "Falha ao criar cliente");
      userId = created.data.user.id;
      // Ensure profile exists (trigger handles it, but idempotent)
      await supabaseAdmin.from("profiles").upsert({ id: userId, full_name: data.nome, phone: digits });
    }
    await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "cliente" }, { onConflict: "user_id,role" });
    const { data: link, error } = await supabaseAdmin
      .from("store_clients")
      .upsert({ store_id: data.store_id, user_id: userId }, { onConflict: "store_id,user_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { user_id: userId, link, senha_temporaria: digits };
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
    const link = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", data.store_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    const prd = await supabaseAdmin
      .from("products")
      .select("id, store_id, nome, custo_pontos, ativo")
      .eq("id", data.product_id)
      .maybeSingle();
    if (!prd.data || prd.data.store_id !== data.store_id || !prd.data.ativo) throw new Error("Produto indisponível.");
    if (link.data.pontos < prd.data.custo_pontos) throw new Error("Pontos insuficientes.");
    const voucher = gerarVoucher();
    const novoPontos = link.data.pontos - prd.data.custo_pontos;
    const { error: txErr } = await supabaseAdmin.from("transactions").insert({
      store_id: data.store_id,
      client_user_id: context.userId,
      tipo: "resgate_produto",
      pontos_delta: -prd.data.custo_pontos,
      product_id: prd.data.id,
      voucher_code: voucher,
      status: "pendente",
    });
    if (txErr) throw new Error(txErr.message);
    await supabaseAdmin
      .from("store_clients")
      .update({ pontos: novoPontos, nivel: calcularNivel(novoPontos) })
      .eq("id", link.data.id);
    return { voucher };
  });

// -------- Cliente: resgatar cashback --------
export const resgatarCashback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ store_id: z.string().uuid(), valor: z.number().positive().max(1_000_000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const link = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", data.store_id)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    if (data.valor > Number(link.data.cashback_saldo)) throw new Error("Cashback insuficiente.");
    const voucher = gerarVoucher();
    const novoSaldo = +(Number(link.data.cashback_saldo) - data.valor).toFixed(2);
    const { error: txErr } = await supabaseAdmin.from("transactions").insert({
      store_id: data.store_id,
      client_user_id: context.userId,
      tipo: "resgate_cashback",
      cashback_delta: -data.valor,
      voucher_code: voucher,
      status: "pendente",
    });
    if (txErr) throw new Error(txErr.message);
    await supabaseAdmin.from("store_clients").update({ cashback_saldo: novoSaldo }).eq("id", link.data.id);
    return { voucher };
  });

// -------- Lojista: confirmar entrega de resgate --------
export const confirmarResgate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ transaction_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tx = await supabaseAdmin.from("transactions").select("id, store_id, stores:store_id(owner_id)").eq("id", data.transaction_id).maybeSingle();
    const ownerId = (tx.data?.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (!tx.data || ownerId !== context.userId) throw new Error("Não autorizado.");
    const { error } = await supabaseAdmin.from("transactions").update({ status: "entregue" }).eq("id", data.transaction_id);
    if (error) throw new Error(error.message);
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
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const check = await context.supabase.from("stores").select("id").eq("id", data.store_id).maybeSingle();
    if (!check.data) throw new Error("Loja não encontrada.");
    if (data.id) {
      const { error } = await context.supabase
        .from("products")
        .update({ nome: data.nome, descricao: data.descricao, custo_pontos: data.custo_pontos, ativo: data.ativo })
        .eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await context.supabase.from("products").insert({
        store_id: data.store_id,
        nome: data.nome,
        descricao: data.descricao,
        custo_pontos: data.custo_pontos,
        ativo: data.ativo,
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
    const texto = data.texto ?? `✅ Teste QSF Club — ${loja.data.nome_fantasia}. Integração WhatsApp funcionando!`;
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
    .select("user_id, pontos, nivel, profiles:user_id(full_name, phone)")
    .eq("store_id", storeId);
  if (segmento === "bronze" || segmento === "prata" || segmento === "ouro") {
    q = q.eq("nivel", segmento);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (data ?? []).map((r) => {
    const p = r.profiles as unknown as { full_name: string | null; phone: string | null } | null;
    return { user_id: r.user_id, pontos: r.pontos, nivel: String(r.nivel), full_name: p?.full_name ?? null, phone: p?.phone ?? null };
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

  return rows;
}

export const criarCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      nome: z.string().min(1).max(100),
      mensagem: z.string().min(1).max(2000),
      segmento: z.enum(["todos", "bronze", "prata", "ouro", "inativos_30", "inativos_60", "inativos_90", "aniversariantes"]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin.from("stores").select("id").eq("owner_id", context.userId).maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const destinatarios = await selecionarDestinatarios(loja.data.id, data.segmento);
    const { data: camp, error } = await supabaseAdmin
      .from("campaigns")
      .insert({
        store_id: loja.data.id,
        nome: data.nome,
        mensagem: data.mensagem,
        segmento: data.segmento,
        total_destinatarios: destinatarios.length,
        status: "rascunho",
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: camp.id, total: destinatarios.length };
  });

export const enviarCampanha = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ campaign_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { formatBrazilPhone, sendWhatsappRaw } = await import("./notify.server");
    const camp = await supabaseAdmin
      .from("campaigns")
      .select("*, stores:store_id(owner_id, nome_fantasia, slug, evolution_url, evolution_apikey, evolution_instance, whatsapp_enabled)")
      .eq("id", data.campaign_id)
      .maybeSingle();
    if (!camp.data) throw new Error("Campanha não encontrada.");
    const loja = camp.data.stores as unknown as {
      owner_id: string; nome_fantasia: string; slug: string;
      evolution_url: string | null; evolution_apikey: string | null; evolution_instance: string | null;
      whatsapp_enabled: boolean;
    };
    if (loja.owner_id !== context.userId) throw new Error("Não autorizado.");
    if (!loja.evolution_url || !loja.evolution_apikey || !loja.evolution_instance) {
      throw new Error("Configure a Evolution API e conecte o WhatsApp antes de enviar.");
    }
    if (camp.data.status === "enviando" || camp.data.status === "concluida") {
      throw new Error("Esta campanha já foi enviada.");
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