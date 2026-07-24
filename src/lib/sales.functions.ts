import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel } from "./loyalty-shared";
import { getActiveMultiplier } from "./loyalty-helpers.server";

export const lancarVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        client_user_id: z.string().uuid(),
        valor: z.number().positive().max(1_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const loja = await supabaseAdmin
      .from("stores")
      .select(
        "id, owner_id, modalidade, regra_pontos, percentual_cashback, indicacao_ativa, bonus_indicador, bonus_indicado, nome_fantasia",
      )
      .eq("id", data.store_id)
      .maybeSingle();
    if (!loja.data) throw new Error("Loja inválida.");
    if (loja.data.owner_id !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: data.store_id,
        _perm: "pontos.adicionar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para lançar vendas nesta loja.");
    }
    const link = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", data.store_id)
      .eq("user_id", data.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    const inclP = loja.data.modalidade !== "cashback";
    const inclC = loja.data.modalidade !== "pontos";
    // Buscar promoções ativas da loja e aplicar multiplicador
    const promosRes = await supabaseAdmin
      .from("promotions")
      .select("multiplicador, dias_semana, hora_inicio, hora_fim, data_inicio, data_fim")
      .eq("store_id", data.store_id)
      .eq("ativo", true);
    const multiplicador = getActiveMultiplier(promosRes.data ?? []);
    const pontosBase = inclP
      ? Math.floor(data.valor * Number(loja.data.regra_pontos) * multiplicador)
      : 0;
    const cashback = inclC
      ? +(data.valor * (Number(loja.data.percentual_cashback) / 100)).toFixed(2)
      : 0;

    // -------- Bônus de indicação (só na 1ª compra) --------
    let bonusIndicado = 0;
    let bonusIndicador = 0;
    const pagarIndicacao =
      loja.data.indicacao_ativa && !link.data.referral_bonus_paid && link.data.referrer_user_id;
    if (pagarIndicacao) {
      bonusIndicado = Number(loja.data.bonus_indicado) || 0;
      bonusIndicador = Number(loja.data.bonus_indicador) || 0;
    }

    const pontos = pontosBase + bonusIndicado;
    const novoPontos = link.data.pontos + pontos;
    const novoCashback = +(Number(link.data.cashback_saldo) + cashback).toFixed(2);
    const { data: txRow, error: txErr } = await supabaseAdmin
      .from("transactions")
      .insert({
        store_id: data.store_id,
        client_user_id: data.client_user_id,
        tipo: "venda",
        valor: data.valor,
        pontos_delta: pontos,
        cashback_delta: cashback,
        status: "entregue",
      })
      .select("id")
      .single();
    if (txErr) throw new Error(txErr.message);
    const { error: updErr } = await supabaseAdmin
      .from("store_clients")
      .update({
        pontos: novoPontos,
        cashback_saldo: novoCashback,
        nivel: calcularNivel(novoPontos),
        ...(pagarIndicacao ? { referral_bonus_paid: true } : {}),
      })
      .eq("id", link.data.id);
    if (updErr) throw new Error(updErr.message);

    // Creditar indicador
    if (pagarIndicacao && bonusIndicador > 0 && link.data.referrer_user_id) {
      const refLink = await supabaseAdmin
        .from("store_clients")
        .select("id, pontos")
        .eq("store_id", data.store_id)
        .eq("user_id", link.data.referrer_user_id)
        .maybeSingle();
      if (refLink.data) {
        const novoRef = refLink.data.pontos + bonusIndicador;
        await supabaseAdmin
          .from("store_clients")
          .update({ pontos: novoRef, nivel: calcularNivel(novoRef) })
          .eq("id", refLink.data.id);
        await supabaseAdmin.from("transactions").insert({
          store_id: data.store_id,
          client_user_id: link.data.referrer_user_id,
          tipo: "indicacao",
          pontos_delta: bonusIndicador,
          status: "entregue",
        });
        const { notifyClient } = await import("./notify.server");
        await notifyClient({
          event: "pontos_ganhos",
          storeId: data.store_id,
          clientUserId: link.data.referrer_user_id,
          pontosGanhos: bonusIndicador,
        });
      }
    }

    if (pontos > 0) {
      const { notifyClient } = await import("./notify.server");
      await notifyClient({
        event: "pontos_ganhos",
        storeId: data.store_id,
        clientUserId: data.client_user_id,
        pontosGanhos: pontos,
      });
    }
    // Envia pedido de NPS (só se lojista ativou)
    if (txRow?.id) {
      const { notifyClient } = await import("./notify.server");
      await notifyClient({
        event: "nps_request",
        storeId: data.store_id,
        clientUserId: data.client_user_id,
        transactionId: txRow.id,
      });
    }
    return { pontos, cashback, multiplicador, bonusIndicado, bonusIndicador };
  });

// -------- Promoções: CRUD --------

export const ajustarPontosCliente = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        store_id: z.string().uuid(),
        client_user_id: z.string().uuid(),
        // positivo = adicionar; negativo = estornar
        delta: z
          .number()
          .int()
          .min(-1_000_000)
          .max(1_000_000)
          .refine((n) => n !== 0, "Informe uma quantidade diferente de zero."),
        motivo: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const storePerm = await supabaseAdmin
      .from("stores")
      .select("id, owner_id")
      .eq("id", data.store_id)
      .maybeSingle();
    if (!storePerm.data) throw new Error("Loja inválida.");
    if (storePerm.data.owner_id !== context.userId) {
      const requiredPerm = data.delta > 0 ? "pontos.adicionar" : "pontos.estornar";
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: data.store_id,
        _perm: requiredPerm,
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para ajustar pontos nesta loja.");
    }
    const link = await supabaseAdmin
      .from("store_clients")
      .select("id, pontos")
      .eq("store_id", data.store_id)
      .eq("user_id", data.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");
    const novoPontos = link.data.pontos + data.delta;
    if (novoPontos < 0)
      throw new Error(`Estorno maior que o saldo atual (${link.data.pontos} pts).`);
    const { error: eIns } = await supabaseAdmin.from("transactions").insert({
      store_id: data.store_id,
      client_user_id: data.client_user_id,
      tipo: "ajuste",
      valor: 0,
      pontos_delta: data.delta,
      cashback_delta: 0,
      status: "entregue",
      origem: data.motivo ? `ajuste_manual:${data.motivo.slice(0, 180)}` : "ajuste_manual",
    });
    if (eIns) throw new Error(eIns.message);
    const { error: eUp } = await supabaseAdmin
      .from("store_clients")
      .update({ pontos: novoPontos, nivel: calcularNivel(novoPontos) })
      .eq("id", link.data.id);
    if (eUp) throw new Error(eUp.message);
    return { ok: true, novo_saldo: novoPontos };
  });

// -------- LOJISTA: estornar uma venda lançada --------

export const estornarVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) =>
    z
      .object({
        transaction_id: z.string().uuid(),
        motivo: z.string().max(200).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const tx = await supabaseAdmin
      .from("transactions")
      .select(
        "id, store_id, client_user_id, tipo, valor, pontos_delta, cashback_delta, origem, stores:store_id(owner_id)",
      )
      .eq("id", data.transaction_id)
      .maybeSingle();
    if (!tx.data) throw new Error("Venda não encontrada.");
    const owner = (tx.data.stores as unknown as { owner_id: string } | null)?.owner_id;
    if (owner !== context.userId) {
      const perm = await (supabaseAdmin as any).rpc("employee_has_permission", {
        _user_id: context.userId,
        _store_id: tx.data.store_id,
        _perm: "pontos.estornar",
      });
      if (perm.error) throw new Error(perm.error.message);
      if (!perm.data) throw new Error("Sem permissão para estornar esta venda.");
    }
    if (tx.data.tipo !== "venda")
      throw new Error("Só é possível estornar transações do tipo venda.");
    if (typeof tx.data.origem === "string" && tx.data.origem.startsWith("estornada:")) {
      throw new Error("Esta venda já foi estornada.");
    }
    // Verifica se já existe um estorno para essa transação
    const jaEstornada = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("store_id", tx.data.store_id)
      .eq("client_user_id", tx.data.client_user_id)
      .eq("origem", `estorno:${tx.data.id}`)
      .maybeSingle();
    if (jaEstornada.data) throw new Error("Esta venda já foi estornada.");

    const link = await supabaseAdmin
      .from("store_clients")
      .select("id, pontos, cashback_saldo")
      .eq("store_id", tx.data.store_id)
      .eq("user_id", tx.data.client_user_id)
      .maybeSingle();
    if (!link.data) throw new Error("Cliente não vinculado à loja.");

    const deltaPontos = -Number(tx.data.pontos_delta || 0);
    const deltaCashback = -Number(tx.data.cashback_delta || 0);
    const novoPontos = Math.max(0, link.data.pontos + deltaPontos);
    const novoCashback = Math.max(
      0,
      +(Number(link.data.cashback_saldo) + deltaCashback).toFixed(2),
    );

    const ins = await supabaseAdmin.from("transactions").insert({
      store_id: tx.data.store_id,
      client_user_id: tx.data.client_user_id,
      tipo: "ajuste",
      valor: 0,
      pontos_delta: deltaPontos,
      cashback_delta: deltaCashback,
      status: "entregue",
      origem: `estorno:${tx.data.id}${data.motivo ? `:${data.motivo.slice(0, 120)}` : ""}`,
    });
    if (ins.error) throw new Error(ins.error.message);

    const upd = await supabaseAdmin
      .from("store_clients")
      .update({
        pontos: novoPontos,
        cashback_saldo: novoCashback,
        nivel: calcularNivel(novoPontos),
      })
      .eq("id", link.data.id);
    if (upd.error) throw new Error(upd.error.message);

    // Marca a venda original como estornada (origem prefixada)
    await supabaseAdmin
      .from("transactions")
      .update({ origem: `estornada:${tx.data.origem ?? "manual"}` })
      .eq("id", tx.data.id);

    return { ok: true, pontos_revertidos: -deltaPontos, cashback_revertido: -deltaCashback };
  });

// -------- Disparar notificações agora (teste manual) --------

export const dispararNotificacoesAgora = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Só permite se for dono de alguma loja (evita endpoint público via serverFn)
    const store = await supabaseAdmin
      .from("stores")
      .select("id")
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!store.data) throw new Error("Sem loja.");
    const url =
      process.env.VITE_APP_URL ||
      "https://project--62bd2a63-6908-43c2-9917-f4ddac34c65f.lovable.app";
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    const res = await fetch(`${url}/api/public/hooks/notifications-daily`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: key ?? "" },
      body: "{}",
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Falha: ${res.status} ${body.slice(0, 200)}`);
    return JSON.parse(body);
  });
