import { supabase } from "@/integrations/supabase/client";

/**
 * Engine Agnóstica de Pontos Pendentes por CPF para Múltiplos ERPs
 * (Olist, Bling, Tiny, Shopify, Webhooks Genéricos, etc.)
 */

export type PendingOrderPayload = {
  organizationId: string;
  cpf: string;
  sourceErp: "olist" | "bling" | "tiny" | "shopify" | "generic_webhook";
  externalOrderId: string;
  amount: number;
  pointsEarned?: number;
  cashbackEarned?: number;
  clientName?: string;
  clientEmail?: string;
};

export async function processOrderForFidelity(payload: PendingOrderPayload) {
  const cleanCpf = payload.cpf.replace(/\D+/g, "");
  if (!cleanCpf) return { status: "ignored", reason: "CPF inválido" };

  // 1. Verifica se o cliente já possui cadastro ativo no banco de dados da loja
  const { data: existingClient } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", payload.organizationId)
    .eq("cpf", cleanCpf)
    .is("deleted_at", null)
    .maybeSingle();

  // 2. Buscar configurações de fidelidade da loja para taxa de pontos e cashback
  const { data: rulesRow } = await supabase
    .from("integration_mappings")
    .select("metadata")
    .eq("organization_id", payload.organizationId)
    .eq("source", "olist")
    .eq("entity_type", "loyalty_settings")
    .maybeSingle();

  const rulesMeta = (rulesRow?.metadata as any) ?? {};
  const cashbackPercent = Number(rulesMeta.cashback_percent ?? 5);
  const pointsRate = Number(rulesMeta.points_per_currency ?? 1);

  const pointsToCredit = payload.pointsEarned ?? Math.floor(payload.amount * pointsRate);
  const cashbackToCredit = payload.cashbackEarned ?? Math.round(payload.amount * (cashbackPercent / 100) * 100) / 100;

  if (existingClient?.id) {
    // Cliente já existe -> Credita o saldo imediatamente!
    const { data: sca } = await supabase
      .from("store_credit_accounts")
      .select("id, balance")
      .eq("organization_id", payload.organizationId)
      .eq("client_id", existingClient.id)
      .maybeSingle();

    let scaId = sca?.id;
    const currentBal = Number(sca?.balance || 0);
    const newBal = currentBal + cashbackToCredit;

    if (!scaId) {
      const { data: newSca } = await supabase
        .from("store_credit_accounts")
        .insert({
          organization_id: payload.organizationId,
          client_id: existingClient.id,
          balance: cashbackToCredit,
        })
        .select("id")
        .single();
      scaId = newSca?.id;
    } else {
      await supabase
        .from("store_credit_accounts")
        .update({ balance: newBal })
        .eq("id", scaId);
    }

    if (scaId) {
      await supabase.from("store_credit_transactions").insert({
        organization_id: payload.organizationId,
        account_id: scaId,
        client_id: existingClient.id,
        type: "credit",
        amount: cashbackToCredit,
        balance_before: currentBal,
        balance_after: newBal,
        reference_type: "sale",
        reference_id: payload.externalOrderId,
        reason: `Venda via ${payload.sourceErp.toUpperCase()} #${payload.externalOrderId} (+${pointsToCredit} pontos)`,
      });
    }

    return { status: "credited_immediately", clientId: existingClient.id, pointsToCredit, cashbackToCredit };
  }

  // 3. Cliente ainda NÃO existe na loja -> Grava como PONTOS PENDENTES POR CPF!
  const pendingId = `pend-${cleanCpf}-${payload.externalOrderId}`;
  const pendingData = {
    cpf: cleanCpf,
    source_erp: payload.sourceErp,
    external_order_id: payload.externalOrderId,
    amount: payload.amount,
    points_earned: pointsToCredit,
    cashback_earned: cashbackToCredit,
    client_name: payload.clientName || null,
    client_email: payload.clientEmail || null,
    status: "pendente",
    created_at: new Date().toISOString(),
  };

  await supabase.from("integration_mappings").upsert(
    {
      organization_id: payload.organizationId,
      source: payload.sourceErp as any,
      entity_type: "pending_points",
      external_id: pendingId,
      internal_id: payload.organizationId,
      metadata: pendingData as any,
    },
    { onConflict: "organization_id,source,entity_type,external_id" }
  );

  return { status: "saved_as_pending", cpf: cleanCpf, pointsToCredit, cashbackToCredit };
}

/**
 * Consulta e resgata pontos pendentes vinculados ao CPF quando o cliente se cadastra na Vitrine Pública
 */
export async function claimPendingPointsForCpf(organizationId: string, cpf: string, clientId: string) {
  const cleanCpf = cpf.replace(/\D+/g, "");
  if (!cleanCpf) return { claimedPoints: 0, claimedCashback: 0, ordersCount: 0 };

  // 1. Tenta executar via RPC Postgres nativa se a migration tiver sido executada no Supabase
  try {
    const { data: rpcData, error: rpcErr } = await supabase.rpc("claim_pending_points" as any, {
      p_organization_id: organizationId,
      p_cpf: cleanCpf,
      p_profile_id: clientId,
    });
    if (!rpcErr && rpcData && (rpcData as any[]).length > 0) {
      const res = (rpcData as any[])[0];
      if (Number(res.claimed_count || 0) > 0) {
        return {
          claimedPoints: Number(res.total_points_claimed || 0),
          claimedCashback: Number(res.total_cashback_claimed || 0),
          ordersCount: Number(res.claimed_count || 0),
        };
      }
    }
  } catch (e) {
    // Fallback gracioso caso o RPC ainda não tenha sido rodado no banco
  }

  // Busca todas as transações pendentes no integration_mappings
  const { data: rows } = await supabase
    .from("integration_mappings")
    .select("id, external_id, source, metadata")
    .eq("organization_id", organizationId)
    .eq("entity_type", "pending_points");

  if (!rows || rows.length === 0) {
    return { claimedPoints: 0, claimedCashback: 0, ordersCount: 0 };
  }

  // Filtra as pendentes deste CPF específico
  const pendingItems = rows.filter((r: any) => {
    const meta = r.metadata as any;
    return meta?.cpf === cleanCpf && meta?.status === "pendente";
  });

  if (pendingItems.length === 0) {
    return { claimedPoints: 0, claimedCashback: 0, ordersCount: 0 };
  }

  let totalPoints = 0;
  let totalCashback = 0;

  for (const item of pendingItems) {
    const meta = item.metadata as any;
    totalPoints += Number(meta?.points_earned || 0);
    totalCashback += Number(meta?.cashback_earned || 0);
  }

  // Credita o saldo acumulado na conta do cliente
  const { data: sca } = await supabase
    .from("store_credit_accounts")
    .select("id, balance")
    .eq("organization_id", organizationId)
    .eq("client_id", clientId)
    .maybeSingle();

  let scaId = sca?.id;
  const currentBal = Number(sca?.balance || 0);
  const newBal = currentBal + totalCashback;

  if (!scaId) {
    const { data: newSca } = await supabase
      .from("store_credit_accounts")
      .insert({
        organization_id: organizationId,
        client_id: clientId,
        balance: totalCashback,
      })
      .select("id")
      .single();
    scaId = newSca?.id;
  } else {
    await supabase.from("store_credit_accounts").update({ balance: newBal }).eq("id", scaId);
  }

  if (scaId) {
    await supabase.from("store_credit_transactions").insert({
      organization_id: organizationId,
      account_id: scaId,
      client_id: clientId,
      type: "credit",
      amount: totalCashback,
      balance_before: currentBal,
      balance_after: newBal,
      reference_type: "pending_claim",
      reference_id: clientId,
      reason: `Resgate automático de ${pendingItems.length} compra(s) anterior(es) (+${totalPoints} pontos)`,
    });
  }

  // Atualiza os registros pendentes para 'creditado'
  for (const item of pendingItems) {
    const meta = item.metadata as any;
    await supabase.from("integration_mappings").update({
      metadata: {
        ...meta,
        status: "creditado",
        claimed_at: new Date().toISOString(),
        claimed_by_client_id: clientId,
      } as any,
    }).eq("id", item.id);
  }

  return {
    claimedPoints: totalPoints,
    claimedCashback: totalCashback,
    ordersCount: pendingItems.length,
  };
}
