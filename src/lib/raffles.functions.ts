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
  selecionarDestinatarios,
  processarEnvioCampanha,
} from "./qsf-helpers.server";
import { rateLimitByIp } from "./sfn-rate-limit.server";

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
