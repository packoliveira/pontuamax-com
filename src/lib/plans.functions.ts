import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(v: string) {
  return v.startsWith("sb_publishable_") || v.startsWith("sb_secret_");
}

function serverPublicClient() {
  const url = process.env.SUPABASE_URL!;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (isNewSupabaseApiKey(key) && h.get("Authorization") === `Bearer ${key}`) {
          h.delete("Authorization");
        }
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Acesso negado");
}

// Listagem pública (landing/onboarding) — apenas planos ativos.
export const listPublicPlans = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = serverPublicClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .eq("ativo", true)
    .order("ordem", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

// Listagem completa para o admin (inclui inativos).
export const listAllPlans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    const { data, error } = await context.supabase
      .from("subscription_plans")
      .select("*")
      .order("ordem", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

const planSchema = z.object({
  id: z.string().uuid().optional(),
  slug: z.string().min(2).max(40),
  nome: z.string().min(2).max(60),
  descricao: z.string().max(400).nullable().optional(),
  preco_mensal: z.number().min(0),
  preco_anual: z.number().min(0),
  setup_fee: z.number().min(0),
  max_clientes: z.number().int().min(0).nullable(),
  max_funcionarios: z.number().int().min(0).nullable(),
  max_lojas: z.number().int().min(0).nullable(),
  integracao_erp: z.boolean(),
  campanhas_whatsapp: z.boolean(),
  campanhas_sms: z.boolean(),
  nps_ativo: z.boolean(),
  sorteios_ativo: z.boolean(),
  vale_presente_ativo: z.boolean(),
  instagram_ativo: z.boolean(),
  suporte_prioritario: z.boolean(),
  destaque: z.boolean(),
  ativo: z.boolean(),
  ordem: z.number().int().min(0),
});

export const upsertPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => planSchema.parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { data: row, error } = await context.supabase
      .from("subscription_plans")
      .upsert(data, { onConflict: "slug" })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deletePlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    const { error } = await context.supabase
      .from("subscription_plans")
      .delete()
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });