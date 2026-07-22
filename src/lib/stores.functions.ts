import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { promoSchema } from "./qsf-helpers.server";

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
