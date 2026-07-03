import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getMyStoreFull, lookupGiftCardByCodigo } from "./qsf.functions";

// Safe public columns of `stores` accessible from the browser
const STORE_PUBLIC_COLS =
  "id, slug, nome_fantasia, logo_url, banner_url, brand_primary, brand_secondary, modalidade, regra_pontos, percentual_cashback, indicacao_ativa, bonus_indicador, bonus_indicado, whatsapp_enabled, nps_enabled, subscription_status, plan, created_at";

export const myStoreQuery = () =>
  queryOptions({
    queryKey: ["my-store"],
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
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select(STORE_PUBLIC_COLS).eq("slug", slug).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const storeProductsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["products", storeId],
    enabled: !!storeId,
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
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });

export const activeStoreProductsQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["active-products", storeId],
    enabled: !!storeId,
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
    queryFn: async () => {
      if (!codigo) return null;
      return await lookupGiftCardByCodigo({ data: { codigo } });
    },
  });

export const storeFiscalNotesQuery = (storeId: string | undefined) =>
  queryOptions({
    queryKey: ["fiscal-notes", storeId],
    enabled: !!storeId,
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
