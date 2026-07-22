import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  cpfToEmail,
  isValidCPF,
} from "./qsf-shared";
import { rateLimitByIp } from "./sfn-rate-limit.server";

export const sincronizarClientesDaLoja = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const store = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) throw new Error("Loja não encontrada.");
    const storeId = store.data.id;

    const [tx, notas, links] = await Promise.all([
      supabaseAdmin.from("transactions").select("client_user_id").eq("store_id", storeId),
      supabaseAdmin.from("fiscal_notes").select("client_user_id").eq("store_id", storeId),
      supabaseAdmin.from("store_clients").select("user_id").eq("store_id", storeId),
    ]);

    const linked = new Set((links.data ?? []).map((r) => r.user_id));
    const candidates = new Set<string>();
    for (const r of tx.data ?? [])
      if (r.client_user_id && !linked.has(r.client_user_id)) candidates.add(r.client_user_id);
    for (const r of notas.data ?? [])
      if (r.client_user_id && !linked.has(r.client_user_id)) candidates.add(r.client_user_id);

    let criados = 0;
    if (candidates.size > 0) {
      const rows = Array.from(candidates).map((user_id) => ({ store_id: storeId, user_id }));
      const ins = await supabaseAdmin
        .from("store_clients")
        .upsert(rows, { onConflict: "store_id,user_id", ignoreDuplicates: true })
        .select("id");
      criados = ins.data?.length ?? 0;
    }
    return { criados, ja_vinculados: linked.size, total: linked.size + criados };
  });
