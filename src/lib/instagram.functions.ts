import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel } from "./qsf-shared";

const IG_URL_RE = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[A-Za-z0-9_-]+/i;

// -------- CLIENTE: enviar link do post do Instagram --------
export const submitInstagramPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        post_url: z
          .string()
          .url()
          .max(500)
          .refine((u) => IG_URL_RE.test(u), "Link precisa ser de um post/reel do Instagram."),
        client_note: z.string().max(500).optional().nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await supabaseAdmin
      .from("stores")
      .select("id, instagram_program_active, instagram_min_days_live")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!store.data) throw new Error("Loja não encontrada.");
    if (!store.data.instagram_program_active)
      throw new Error("Esta loja não está com o programa do Instagram ativo.");

    // Antifraude: máximo 1 envio por dia por cliente/loja
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const today = await supabaseAdmin
      .from("instagram_submissions")
      .select("id")
      .eq("store_id", data.store_id)
      .eq("client_user_id", context.userId)
      .gte("created_at", start.toISOString())
      .maybeSingle();
    if (today.data) throw new Error("Você já enviou um post hoje. Tente novamente amanhã.");

    // URL duplicada?
    const dup = await supabaseAdmin
      .from("instagram_submissions")
      .select("id")
      .eq("store_id", data.store_id)
      .eq("post_url", data.post_url)
      .maybeSingle();
    if (dup.data) throw new Error("Esse link de post já foi enviado.");

    const verifyAfter = new Date();
    verifyAfter.setDate(verifyAfter.getDate() + (store.data.instagram_min_days_live ?? 7));

    const { data: ins, error } = await supabaseAdmin
      .from("instagram_submissions")
      .insert({
        store_id: data.store_id,
        client_user_id: context.userId,
        post_url: data.post_url,
        status: "pendente",
        points_awarded: 0,
        verify_after: verifyAfter.toISOString(),
        client_note: data.client_note ?? null,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: ins.id };
  });

// -------- CLIENTE: minhas submissões numa loja --------
export const listMyInstagramSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ store_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const r = await supabaseAdmin
      .from("instagram_submissions")
      .select(
        "id, post_url, status, points_awarded, rejection_reason, created_at, reviewed_at, verify_after, client_note, transaction_id",
      )
      .eq("store_id", data.store_id)
      .eq("client_user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (r.error) throw new Error(r.error.message);
    const rows = r.data ?? [];
    const txIds = rows.map((r) => r.transaction_id).filter((x): x is string => !!x);
    let cashbackMap = new Map<string, number>();
    if (txIds.length > 0) {
      const txs = await supabaseAdmin
        .from("transactions")
        .select("id, cashback_delta")
        .in("id", txIds);
      for (const t of txs.data ?? []) cashbackMap.set(t.id, Number(t.cashback_delta ?? 0));
    }
    return rows.map((r) => ({
      ...r,
      cashback_awarded: r.transaction_id ? (cashbackMap.get(r.transaction_id) ?? 0) : 0,
    }));
  });

// -------- LOJISTA: fila de submissões --------
export const listStoreInstagramSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        status: z
          .enum(["pendente", "aprovado", "rejeitado", "estornado", "todos"])
          .default("pendente"),
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
    let q = supabaseAdmin
      .from("instagram_submissions")
      .select(
        "id, post_url, status, points_awarded, rejection_reason, verify_after, reviewed_at, created_at, client_user_id",
      )
      .eq("store_id", store.data.id)
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "todos") q = q.eq("status", data.status);
    const r = await q;
    if (r.error) throw new Error(r.error.message);
    const rows = r.data ?? [];
    if (rows.length === 0) return [];
    const ids = Array.from(new Set(rows.map((x) => x.client_user_id)));
    const profs = await supabaseAdmin.from("profiles").select("id, full_name, phone").in("id", ids);
    const map = new Map<string, { full_name: string | null; phone: string | null }>();
    for (const p of profs.data ?? []) map.set(p.id, { full_name: p.full_name, phone: p.phone });
    return rows.map((r) => ({ ...r, profiles: map.get(r.client_user_id) ?? null }));
  });

async function requireOwnerOfSubmission(userId: string, submissionId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sub = await supabaseAdmin
    .from("instagram_submissions")
    .select(
      "id, store_id, client_user_id, status, points_awarded, transaction_id, stores!inner(owner_id, instagram_points_per_post)",
    )
    .eq("id", submissionId)
    .maybeSingle();
  if (!sub.data) throw new Error("Submissão não encontrada.");
  // biome-ignore lint/suspicious/noExplicitAny: join
  const stores = sub.data.stores as any;
  if (stores.owner_id !== userId) throw new Error("Sem permissão.");
  return {
    supabaseAdmin,
    sub: sub.data,
    storeConfig: stores as { owner_id: string; instagram_points_per_post: number },
  };
}

// -------- LOJISTA: aprovar --------
export const approveInstagramSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        pontos_override: z.number().int().min(1).max(100_000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, sub, storeConfig } = await requireOwnerOfSubmission(
      context.userId,
      data.id,
    );
    if (sub.status !== "pendente") throw new Error("Esta submissão já foi processada.");
    const pontos = data.pontos_override ?? storeConfig.instagram_points_per_post ?? 0;
    if (pontos <= 0) throw new Error("Configure os pontos por post nas configurações do programa.");

    const link = await supabaseAdmin
      .from("store_clients")
      .select("id, pontos")
      .eq("store_id", sub.store_id)
      .eq("user_id", sub.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não está vinculado à loja.");

    const { data: tx, error: eTx } = await supabaseAdmin
      .from("transactions")
      .insert({
        store_id: sub.store_id,
        client_user_id: sub.client_user_id,
        tipo: "instagram_bonus",
        valor: 0,
        pontos_delta: pontos,
        cashback_delta: 0,
        status: "entregue",
        origem: `instagram_post:${sub.id}`,
      })
      .select("id")
      .single();
    if (eTx) throw new Error(eTx.message);

    const novo = link.data.pontos + pontos;
    const { error: eLink } = await supabaseAdmin
      .from("store_clients")
      .update({ pontos: novo, nivel: calcularNivel(novo) })
      .eq("id", link.data.id);
    if (eLink) throw new Error(eLink.message);

    const { error: eUp } = await supabaseAdmin
      .from("instagram_submissions")
      .update({
        status: "aprovado",
        points_awarded: pontos,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
        transaction_id: tx.id,
        rejection_reason: null,
      })
      .eq("id", sub.id);
    if (eUp) throw new Error(eUp.message);
    return { ok: true, pontos, novo_saldo: novo };
  });

// -------- LOJISTA: rejeitar --------
export const rejectInstagramSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        reason: z.string().min(3).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, sub } = await requireOwnerOfSubmission(context.userId, data.id);
    if (sub.status !== "pendente") throw new Error("Esta submissão já foi processada.");
    const { error } = await supabaseAdmin
      .from("instagram_submissions")
      .update({
        status: "rejeitado",
        rejection_reason: data.reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", sub.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// -------- LOJISTA: estornar (cliente apagou o post) --------
export const revokeInstagramSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        reason: z.string().min(3).max(300),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin, sub } = await requireOwnerOfSubmission(context.userId, data.id);
    if (sub.status !== "aprovado") throw new Error("Só é possível estornar submissões aprovadas.");
    const pontos = sub.points_awarded;

    const link = await supabaseAdmin
      .from("store_clients")
      .select("id, pontos")
      .eq("store_id", sub.store_id)
      .eq("user_id", sub.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não está vinculado à loja.");
    const novo = Math.max(0, link.data.pontos - pontos);

    const { error: eTx } = await supabaseAdmin.from("transactions").insert({
      store_id: sub.store_id,
      client_user_id: sub.client_user_id,
      tipo: "instagram_bonus",
      valor: 0,
      pontos_delta: -pontos,
      cashback_delta: 0,
      status: "entregue",
      origem: `instagram_estorno:${sub.id}:${data.reason.slice(0, 120)}`,
    });
    if (eTx) throw new Error(eTx.message);

    const { error: eLink } = await supabaseAdmin
      .from("store_clients")
      .update({ pontos: novo, nivel: calcularNivel(novo) })
      .eq("id", link.data.id);
    if (eLink) throw new Error(eLink.message);

    const { error: eUp } = await supabaseAdmin
      .from("instagram_submissions")
      .update({
        status: "estornado",
        rejection_reason: data.reason,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", sub.id);
    if (eUp) throw new Error(eUp.message);
    return { ok: true, novo_saldo: novo };
  });
