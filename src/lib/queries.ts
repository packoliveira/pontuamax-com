import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const myStoreQuery = () =>
  queryOptions({
    queryKey: ["my-store"],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) return null;
      const { data, error } = await supabase
        .from("stores")
        .select("*")
        .eq("owner_id", session.session.user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

export const storeBySlugQuery = (slug: string) =>
  queryOptions({
    queryKey: ["store", slug],
    queryFn: async () => {
      const { data, error } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
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