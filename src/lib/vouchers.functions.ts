import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

import { gerarVoucher } from "./voucher.server";
import { formatVoucherJaUsado } from "./loyalty-helpers.server";
import { rateLimitByIp } from "./sfn-rate-limit.server";

export const resgatarProduto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
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

// -------- Cliente: resgatar cashback --------

export const resgatarCashback = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({ store_id: z.string().uuid(), valor: z.number().positive().max(1_000_000) })
      .parse(input),
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
    // resgates concorrentes e impede uso duplo do mesmo saldo de cashback.
    const { error: rpcErr } = await supabaseAdmin.rpc("resgatar_cashback_atomico", {
      p_store_id: data.store_id,
      p_user_id: context.userId,
      p_valor: data.valor,
      p_voucher_code: voucher,
      p_expires_at: expiresAt,
    });
    if (rpcErr) throw new Error(rpcErr.message);
    return { voucher, expires_at: expiresAt };
  });

// -------- Lojista: confirmar entrega de resgate --------

export const confirmarResgate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ transaction_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tx = await supabaseAdmin
      .from("transactions")
      .select(
        "id, store_id, status, tipo, voucher_code, voucher_expires_at, delivered_at, pontos_delta, cashback_delta, product_id, client_user_id, products:product_id(nome), profiles:client_user_id(full_name, phone), stores:store_id(owner_id, nome_fantasia)",
      )
      .eq("id", data.transaction_id)
      .maybeSingle();
    const ownerId = (tx.data?.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (!tx.data) throw new Error("Não autorizado.");
    if (ownerId !== context.userId) {
      const canValidate = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: tx.data.store_id,
        _perm: "vouchers.validar",
      });
      if (canValidate.error) throw new Error(canValidate.error.message);
      const canRedeem = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: tx.data.store_id,
        _perm: "resgates.produtos",
      });
      if (canRedeem.error) throw new Error(canRedeem.error.message);
      if (!canValidate.data && !canRedeem.data) throw new Error("Não autorizado.");
    }
    if (tx.data.status === "entregue") {
      throw new Error(formatVoucherJaUsado(tx.data.delivered_at));
    }
    if (tx.data.status === "expirado")
      throw new Error("Voucher expirado — os pontos/cashback já foram devolvidos ao cliente.");
    if (tx.data.voucher_expires_at && new Date(tx.data.voucher_expires_at).getTime() < Date.now()) {
      throw new Error("Voucher expirado — os pontos/cashback já foram devolvidos ao cliente.");
    }
    const deliveredAt = new Date().toISOString();
    // Update condicional: só marca como entregue se ainda estiver pendente.
    // Impede corrida entre lojista clicando duas vezes / dois caixas simultâneos.
    const upd = await supabaseAdmin
      .from("transactions")
      .update({ status: "entregue", delivered_at: deliveredAt, redeemed_by: context.userId })
      .eq("id", data.transaction_id)
      .eq("status", "pendente")
      .select("id");
    if (upd.error) throw new Error(upd.error.message);
    if (!upd.data || upd.data.length === 0) {
      // Alguém já entregou/expirou/cancelou entre a leitura e o update.
      const recheck = await supabaseAdmin
        .from("transactions")
        .select("status, delivered_at")
        .eq("id", data.transaction_id)
        .maybeSingle();
      if (recheck.data?.status === "entregue")
        throw new Error(formatVoucherJaUsado(recheck.data.delivered_at));
      if (recheck.data?.status === "expirado")
        throw new Error("Voucher expirado — os pontos/cashback já foram devolvidos ao cliente.");
      if (recheck.data?.status === "cancelado") throw new Error("Voucher cancelado.");
      throw new Error("Não foi possível confirmar o voucher. Atualize a página e tente novamente.");
    }
    const store = tx.data.stores as unknown as { nome_fantasia: string | null } | null;
    const profile = tx.data.profiles as { full_name: string | null; phone: string | null } | null;
    const product = tx.data.products as { nome: string | null } | null;
    // Trilha de auditoria
    try {
      const { logEmployeeAction } = await import("@/lib/team.functions");
      await logEmployeeAction({
        storeId: tx.data.store_id,
        actorUserId: context.userId,
        action: "resgate.confirmado",
        targetLabel: tx.data.voucher_code,
        meta: {
          transaction_id: tx.data.id,
          tipo: tx.data.tipo,
          cliente: profile?.full_name ?? null,
          produto: product?.nome ?? null,
          pontos_usados: Math.abs(Number(tx.data.pontos_delta ?? 0)),
          cashback_aplicado: Math.abs(Number(tx.data.cashback_delta ?? 0)),
          delivered_at: deliveredAt,
        },
      });
    } catch {
      /* ignore */
    }
    try {
      const { notifyMerchant, resolveActorLabel } = await import("@/lib/team.functions");
      const actor = await resolveActorLabel(context.userId, tx.data.store_id);
      const pts = Math.abs(Number(tx.data.pontos_delta ?? 0));
      const cb = Math.abs(Number(tx.data.cashback_delta ?? 0));
      const partes = [pts ? `${pts} pts` : null, cb ? `R$ ${cb.toFixed(2)} cashback` : null]
        .filter(Boolean)
        .join(" • ");
      await notifyMerchant({
        storeId: tx.data.store_id,
        actorUserId: context.userId,
        actorLabel: actor,
        tipo: "resgate.confirmado",
        titulo: `Resgate confirmado${actor ? ` por ${actor}` : ""}`,
        mensagem: `${profile?.full_name ?? "Cliente"} — ${product?.nome ?? tx.data.tipo}${partes ? " • " + partes : ""}`,
        metadata: {
          transaction_id: tx.data.id,
          voucher: tx.data.voucher_code,
          pontos: pts,
          cashback: cb,
        },
      });
    } catch {
      /* ignore */
    }
    return {
      ok: true,
      comprovante: {
        transaction_id: tx.data.id,
        voucher_code: tx.data.voucher_code,
        tipo: tx.data.tipo,
        delivered_at: deliveredAt,
        loja: store?.nome_fantasia ?? null,
        cliente: profile?.full_name ?? "Cliente",
        cliente_telefone: profile?.phone ?? null,
        produto: product?.nome ?? null,
        pontos_usados: Math.abs(Number(tx.data.pontos_delta ?? 0)),
        cashback_aplicado: Math.abs(Number(tx.data.cashback_delta ?? 0)),
      },
    };
  });

// -------- Lojista: validar voucher pelo código --------

export const validarVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ voucher_code: z.string().min(4).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    await rateLimitByIp(`validar-voucher:${context.userId}`, 30, 60);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let store = await supabaseAdmin
      .from("stores")
      .select("id, nome_fantasia")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) {
      const emp = await supabaseAdmin
        .from("store_employees")
        .select("store_id")
        .eq("user_id", context.userId)
        .eq("status", "ativo")
        .limit(10);
      for (const row of emp.data ?? []) {
        const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
          _user_id: context.userId,
          _store_id: row.store_id,
          _perm: "vouchers.validar",
        });
        if (perm.error) throw new Error(perm.error.message);
        if (perm.data) {
          store = await supabaseAdmin
            .from("stores")
            .select("id, nome_fantasia")
            .eq("id", row.store_id)
            .maybeSingle();
          break;
        }
      }
    }
    if (!store.data) throw new Error("Loja não encontrada ou sem permissão para validar vouchers.");
    const code = data.voucher_code.trim().toUpperCase();
    const tx = await supabaseAdmin
      .from("transactions")
      .select(
        "id, tipo, status, valor, pontos_delta, cashback_delta, voucher_code, voucher_expires_at, delivered_at, product_id, client_user_id, products:product_id(nome), profiles:client_user_id(full_name, phone)",
      )
      .eq("store_id", store.data.id)
      .eq("voucher_code", code)
      .maybeSingle();
    if (!tx.data) throw new Error("Voucher não encontrado nesta loja.");
    if (tx.data.status === "entregue") {
      throw new Error(formatVoucherJaUsado(tx.data.delivered_at));
    }
    if (tx.data.status === "expirado")
      throw new Error("Voucher expirado — saldo já devolvido ao cliente.");
    if (tx.data.voucher_expires_at && new Date(tx.data.voucher_expires_at).getTime() < Date.now()) {
      throw new Error("Voucher expirado — saldo já devolvido ao cliente.");
    }
    // Update condicional idempotente: previne dupla entrega em corrida.
    const upd = await supabaseAdmin
      .from("transactions")
      .update({
        status: "entregue",
        delivered_at: new Date().toISOString(),
        redeemed_by: context.userId,
      })
      .eq("id", tx.data.id)
      .eq("status", "pendente")
      .select("id");
    if (upd.error) throw new Error(upd.error.message);
    if (!upd.data || upd.data.length === 0) {
      const recheck = await supabaseAdmin
        .from("transactions")
        .select("status, delivered_at")
        .eq("id", tx.data.id)
        .maybeSingle();
      if (recheck.data?.status === "entregue")
        throw new Error(formatVoucherJaUsado(recheck.data.delivered_at));
      if (recheck.data?.status === "cancelado") throw new Error("Voucher cancelado.");
      throw new Error("Voucher indisponível para entrega.");
    }
    try {
      const { logEmployeeAction } = await import("@/lib/team.functions");
      await logEmployeeAction({
        storeId: store.data.id,
        actorUserId: context.userId,
        action: "voucher.validado",
        targetLabel: tx.data.voucher_code,
        meta: {
          transaction_id: tx.data.id,
          tipo: tx.data.tipo,
          pontos: Math.abs(Number(tx.data.pontos_delta || 0)),
          cashback: Math.abs(Number(tx.data.cashback_delta || 0)),
        },
      });
    } catch {
      /* ignore */
    }
    try {
      const { notifyMerchant, resolveActorLabel } = await import("@/lib/team.functions");
      const actor = await resolveActorLabel(context.userId, store.data.id);
      const pts = Math.abs(Number(tx.data.pontos_delta || 0));
      const cb = Math.abs(Number(tx.data.cashback_delta || 0));
      const partes = [pts ? `${pts} pts` : null, cb ? `R$ ${cb.toFixed(2)} cashback` : null]
        .filter(Boolean)
        .join(" • ");
      const clienteNome =
        (tx.data.profiles as { full_name: string | null } | null)?.full_name ?? "Cliente";
      await notifyMerchant({
        storeId: store.data.id,
        actorUserId: context.userId,
        actorLabel: actor,
        tipo: "voucher.validado",
        titulo: `Voucher validado${actor ? ` por ${actor}` : ""}`,
        mensagem: `${clienteNome} — ${tx.data.voucher_code}${partes ? " • " + partes : ""}`,
        metadata: {
          transaction_id: tx.data.id,
          voucher: tx.data.voucher_code,
          pontos: pts,
          cashback: cb,
        },
      });
    } catch {
      /* ignore */
    }
    return {
      ok: true,
      voucher: tx.data.voucher_code,
      tipo: tx.data.tipo,
      cliente: (tx.data.profiles as { full_name: string | null } | null)?.full_name ?? "Cliente",
      produto: (tx.data.products as { nome: string | null } | null)?.nome ?? null,
      pontos: Math.abs(Number(tx.data.pontos_delta || 0)),
      cashback: Math.abs(Number(tx.data.cashback_delta || 0)),
    };
  });

// -------- Lojista: cancelar voucher pendente (devolve saldo/pontos) --------

export const cancelarVoucher = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => z.object({ transaction_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tx = await supabaseAdmin
      .from("transactions")
      .select(
        "id, store_id, status, tipo, pontos_delta, cashback_delta, client_user_id, stores:store_id(owner_id)",
      )
      .eq("id", data.transaction_id)
      .maybeSingle();
    const ownerId = (tx.data?.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (!tx.data) throw new Error("Não autorizado.");
    if (ownerId !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: tx.data.store_id,
        _perm: "vouchers.validar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Não autorizado.");
    }
    if (tx.data.status !== "pendente")
      throw new Error("Só é possível cancelar vouchers pendentes.");
    const upd = await supabaseAdmin
      .from("transactions")
      .update({ status: "cancelado", redeemed_by: context.userId })
      .eq("id", tx.data.id)
      .eq("status", "pendente")
      .select("id");
    if (upd.error) throw new Error(upd.error.message);
    if (!upd.data || upd.data.length === 0)
      throw new Error("Voucher já foi entregue ou cancelado.");
    // Devolve pontos/cashback ao cliente.
    if (tx.data.client_user_id) {
      const { calcularNivel } = await import("@/lib/loyalty-shared");
      const link = await supabaseAdmin
        .from("store_clients")
        .select("id, pontos, cashback_saldo")
        .eq("store_id", tx.data.store_id)
        .eq("user_id", tx.data.client_user_id)
        .maybeSingle();
      if (link.data) {
        const pontosDevolver = -Number(tx.data.pontos_delta || 0);
        const cashbackDevolver = -Number(tx.data.cashback_delta || 0);
        const novoPontos = Math.max(0, link.data.pontos + pontosDevolver);
        const novoCashback = Math.max(
          0,
          +(Number(link.data.cashback_saldo) + cashbackDevolver).toFixed(2),
        );
        await supabaseAdmin
          .from("store_clients")
          .update({
            pontos: novoPontos,
            cashback_saldo: novoCashback,
            nivel: calcularNivel(novoPontos),
          })
          .eq("id", link.data.id);
      }
    }
    try {
      const { logEmployeeAction } = await import("@/lib/team.functions");
      await logEmployeeAction({
        storeId: tx.data.store_id,
        actorUserId: context.userId,
        action: "voucher.cancelado",
        meta: {
          transaction_id: tx.data.id,
          tipo: tx.data.tipo,
          pontos_devolvidos: -Number(tx.data.pontos_delta || 0),
          cashback_devolvido: -Number(tx.data.cashback_delta || 0),
        },
      });
    } catch {
      /* ignore */
    }
    try {
      const { notifyMerchant, resolveActorLabel } = await import("@/lib/team.functions");
      const actor = await resolveActorLabel(context.userId, tx.data.store_id);
      const pts = -Number(tx.data.pontos_delta || 0);
      const cb = -Number(tx.data.cashback_delta || 0);
      const partes = [
        pts ? `${pts} pts devolvidos` : null,
        cb ? `R$ ${cb.toFixed(2)} cashback devolvido` : null,
      ]
        .filter(Boolean)
        .join(" • ");
      await notifyMerchant({
        storeId: tx.data.store_id,
        actorUserId: context.userId,
        actorLabel: actor,
        tipo: "voucher.cancelado",
        titulo: `Voucher cancelado${actor ? ` por ${actor}` : ""}`,
        mensagem: `${tx.data.tipo}${partes ? " • " + partes : ""}`,
        metadata: { transaction_id: tx.data.id, pontos: pts, cashback: cb },
      });
    } catch {
      /* ignore */
    }
    return { ok: true };
  });
