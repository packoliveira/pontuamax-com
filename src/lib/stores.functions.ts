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
