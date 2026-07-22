import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel } from "./qsf-shared";
import { gerarVoucher } from "./voucher.server";
import { formatVoucherJaUsado } from "./qsf-helpers.server";
import { rateLimitByIp } from "./sfn-rate-limit.server";

export const resgatarProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ store_id: z.string().uuid(), product_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select("id, voucher_validade_dias")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja não encontrada.");
    const voucher = gerarVoucher();
    const validade = Math.max(1, Number(loja.data.voucher_validade_dias) || 7);
    const expiresAt = new Date(Date.now() + validade * 24 * 60 * 60 * 1000).toISOString();
    // Trava transacional: SELECT ... FOR UPDATE dentro da RPC serializa
    // resgates concorrentes e impede uso duplo do mesmo saldo de pontos.
    const { error: rpcErr } = await supabaseAdmin.rpc("resgatar_produto_atomico", {
      p_store_id: data.store_id,
      p_user_id: context.userId,
      p_product_id: data.product_id,
      p_voucher_code: voucher,
      p_expires_at: expiresAt,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    return { voucher, expires_at: expiresAt };
  });
