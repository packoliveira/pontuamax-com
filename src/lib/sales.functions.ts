import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calcularNivel } from "./qsf-shared";
import { getActiveMultiplier } from "./qsf-helpers.server";

export const lancarVenda = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
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
