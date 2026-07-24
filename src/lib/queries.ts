import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  getMyStoreFull,
  lookupGiftCardByCodigo,
  lookupPublicStoreById,
  lookupPublicStoreBySlug,
} from "./loyalty.functions";

// Escalas de frescor por natureza do dado (evita refetch desnecessário
// e mantém navegação instantânea entre abas do painel).
const FRESH = {
  VOLATILE: 15_000, // transações/listas quentes
  SHORT: 60_000, // produtos, promos, listas gerais
  MEDIUM: 5 * 60_000, // loja, tags, papéis, config estática
  LONG: 10 * 60_000, // lookups de vale-presente, storefronts públicas
} as const;

export type StorePublic = Pick<
  Tables<"stores">,
  | "id"
  | "slug"
  | "nome_fantasia"
  | "logo_url"
  | "banner_url"
  | "banner_url_mobile"
  | "banner_mobile_fit"
  | "banner_mobile_position_x"
  | "banner_mobile_position_y"
  | "banner_mobile_zoom"
  | "brand_primary"
  | "brand_secondary"
  | "bg_mode"
  | "bg_color_1"
  | "bg_color_2"
  | "modalidade"
  | "regra_pontos"
  | "percentual_cashback"
  | "cashback_valor_minimo"
  | "cashback_compra_minima"
  | "indicacao_ativa"
  | "bonus_indicador"
  | "bonus_indicado"
  | "whatsapp_enabled"
  | "nps_enabled"
  | "created_at"
  | "instagram_program_active"
  | "instagram_handle"
  | "instagram_points_per_post"
  | "instagram_min_days_live"
  | "instagram_instructions"
  | "pontos_expiracao_modo"
  | "pontos_validade_dias"
  | "pontos_decaimento_dias"
  | "pontos_decaimento_valor"
  | "voucher_visivel_apos_uso"
  | "voucher_mostrar_expirados"
  | "brand_accent_points"
  | "brand_accent_cashback"
  | "brand_cta"
  | "brand_vip"
  | "brand_price"
  | "text_on_dark"
  | "header_title_size"
  | "header_title_weight"
  | "header_kicker_text"
  | "header_kicker_show"
  | "header_kicker_size"
  | "header_title_size_mobile"
  | "header_kicker_size_mobile"
  | "reward_rain_enabled"
  | "reward_rain_colors"
  | "reward_rain_opacity"
>;

export const myStoreQuery = () =>
  queryOptions({
    queryKey: ["my-store"],
    staleTime: FRESH.MEDIUM,
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;
      // Sensitive columns (webhook_secret, evolution_apikey, cnpj, etc.)
      // are not readable via the client — fetch through an authenticated server fn.
      return await getMyStoreFull();
    },
  });

export const storeBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["store", slug],
    staleTime: FRESH.LONG,
    queryFn: async () => {
      return await lookupPublicStoreBySlug({ data: { slug } });
    },
  });

export const publicStoreByIdQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["public-store", storeId],
    enabled: !!storeId,
    staleTime: FRESH.LONG,
    queryFn: async () => {
      if (!storeId) return null;
      return await lookupPublicStoreById({ data: { id: storeId } });
    },
  });

export const storeProductsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["products", storeId],
    enabled: !!storeId,
    staleTime: FRESH.SHORT,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const storeClientsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["store-clients", storeId],
    enabled: !!storeId,
    staleTime: FRESH.SHORT,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("store_clients")
        .select("*, profiles:user_id(full_name, phone, cpf, birthdate)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const storeTransactionsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["transactions", storeId],
    enabled: !!storeId,
    staleTime: FRESH.VOLATILE,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*, profiles:client_user_id(full_name, phone), products:product_id(nome)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const myLinkAtStoreQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["my-link", storeId],
    enabled: !!storeId,
    staleTime: FRESH.SHORT,
    queryFn: async () => {
      if (!storeId) return null;
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;
      const { data, error } = await supabase
        .from("store_clients")
        .select("*")
        .eq("store_id", storeId)
        .eq("user_id", session.session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const myTransactionsAtStoreQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["my-transactions", storeId],
    enabled: !!storeId,
    staleTime: FRESH.VOLATILE,
    queryFn: async () => {
      if (!storeId) return [];
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return [];
      const { data, error } = await supabase
        .from("transactions")
        .select("*, products:product_id(nome)")
        .eq("store_id", storeId)
        .eq("client_user_id", session.session.user.id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const activeStoreProductsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["active-products", storeId],
    enabled: !!storeId,
    staleTime: FRESH.SHORT,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("store_id", storeId)
        .eq("ativo", true)
        .order("custo_pontos", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

export const integrationLogsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["integration-logs", storeId],
    enabled: !!storeId,
    staleTime: FRESH.VOLATILE,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("integration_logs")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

export const storePromotionsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["promotions", storeId],
    enabled: !!storeId,
    staleTime: FRESH.SHORT,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
// ============ Novas queries (vale-presente, notas, tags, sorteios) ============

export const storeGiftCardsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["gift-cards", storeId],
    enabled: !!storeId,
    staleTime: FRESH.SHORT,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("gift_cards")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const giftCardByCodeQuery = (codigo: string | undefined) =>
  queryOptions({
    queryKey: ["gift-card", codigo],
    enabled: !!codigo,
    staleTime: FRESH.VOLATILE,
    queryFn: async () => {
      if (!codigo) return null;
      return await lookupGiftCardByCodigo({ data: { codigo } });
    },
  });

export const storeFiscalNotesQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["fiscal-notes", storeId],
    enabled: !!storeId,
    staleTime: FRESH.VOLATILE,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("fiscal_notes")
        .select("*, profiles:client_user_id(full_name, phone)")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });

export const myFiscalNotesQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["my-fiscal-notes", storeId],
    enabled: !!storeId,
    staleTime: FRESH.VOLATILE,
    queryFn: async () => {
      if (!storeId) return [];
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return [];
      const { data, error } = await supabase
        .from("fiscal_notes")
        .select("*")
        .eq("store_id", storeId)
        .eq("client_user_id", sess.session.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const clientTagsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["client-tags", storeId],
    enabled: !!storeId,
    staleTime: FRESH.MEDIUM,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("client_tags")
        .select("*")
        .eq("store_id", storeId);
      if (error) throw error;
      return data ?? [];
    },
  });

export const storeRafflesQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["raffles", storeId],
    enabled: !!storeId,
    staleTime: FRESH.SHORT,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("raffles")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

export const storeNpsResponsesQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["nps-responses", storeId],
    enabled: !!storeId,
    staleTime: FRESH.VOLATILE,
    queryFn: async () => {
      if (!storeId) return [];
      const { data, error } = await supabase
        .from("nps_responses")
        .select("id, score, comment, created_at, client_user_id, transaction_id")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });
