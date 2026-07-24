import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel } from "./qsf-shared";
import { randomGiftCode } from "./qsf-helpers.server";
import { rateLimitByIp } from "./sfn-rate-limit.server";

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

