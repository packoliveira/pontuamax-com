// Server-only: processa um pedido Olist (crédito ou estorno) para uma loja.
// Reutilizado pelo webhook V3 e pelo polling da API V3. Não importar em
// código de cliente (arquivo `.server.ts` bloqueado pelo import protection).

import { randomBytes } from "crypto";
import { cpfToEmail } from "@/lib/qsf-shared";

export type SituacaoAcao = "credito" | "estorno" | "ignorar";

export function classificarSituacao(s: string): SituacaoAcao {
  const v = (s ?? "").toLowerCase().trim();
  if (v === "faturado" || v === "aprovado" || v === "concluido" || v === "entregue")
    return "credito";
  if (v === "cancelado") return "estorno";
  return "ignorar";
}

export type LojaMin = {
  id: string;
  modalidade: string;
  regra_pontos: number;
  percentual_cashback: number;
};

export type ProcessResult =
  | { status: "ignorado"; motivo: string }
  | { status: "duplicado" }
  | { status: "processado"; pontos: number; cashback: number; novo_saldo_pontos: number }
  | { status: "estornado"; pontos: number; cashback: number }
  | { status: "erro"; error: string };

// pedidoData = objeto do pedido já extraído (aceita `{ pedido: {...} }` ou o próprio pedido).
export async function processarPedidoOlist(input: {
  loja: LojaMin;
  resourceId: string;
  pedidoRaw: Record<string, unknown>;
  origem?: string; // "olist" | "olist-polling"
}): Promise<ProcessResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { loja, resourceId } = input;
  const origem = input.origem ?? "olist";
  const pedidoData =
    (input.pedidoRaw.pedido as Record<string, unknown>) ?? input.pedidoRaw;

  const situacaoRaw = String(
    (pedidoData.situacao as string | undefined) ??
      ((pedidoData.situacao as Record<string, unknown> | undefined)?.descricao as
        | string
        | undefined) ??
      "",
  );
  const acao = classificarSituacao(situacaoRaw);
  if (acao === "ignorar") return { status: "ignorado", motivo: `situacao=${situacaoRaw}` };

  const valor = Number(
    (pedidoData.valor as number | undefined) ??
      (pedidoData.total as number | undefined) ??
      (pedidoData.totalPedido as number | undefined) ??
      0,
  );
  const cliente = (pedidoData.cliente as Record<string, unknown>) ?? {};
  const cpf = String(
    (cliente.cpfCnpj as string | undefined) ?? (cliente.cpf_cnpj as string | undefined) ?? "",
  ).replace(/\D/g, "");
  const telefone = String(
    (cliente.telefone as string | undefined) ?? (cliente.fone as string | undefined) ?? "",
  ).replace(/\D/g, "");
  const nome = String((cliente.nome as string | undefined) ?? "").trim() || "Cliente";

  const idExterno = `olist:${resourceId}`;

  // ---------- ESTORNO ----------
  if (acao === "estorno") {
    const idEstorno = `${idExterno}:estorno`;
    const jaEst = await supabaseAdmin
      .from("transactions")
      .select("id")
      .eq("store_id", loja.id)
      .eq("id_venda_externa", idEstorno)
      .maybeSingle();
    if (jaEst.data) return { status: "duplicado" };

    const vOrig = await supabaseAdmin
      .from("transactions")
      .select("*")
      .eq("store_id", loja.id)
      .eq("id_venda_externa", idExterno)
      .eq("tipo", "venda")
      .maybeSingle();
    if (!vOrig.data) return { status: "erro", error: "venda original não encontrada" };

    const lOrig = await supabaseAdmin
      .from("store_clients")
      .select("*")
      .eq("store_id", loja.id)
      .eq("user_id", vOrig.data.client_user_id)
      .maybeSingle();
    if (!lOrig.data) return { status: "erro", error: "cliente não vinculado" };

    const pE = -Number(vOrig.data.pontos_delta ?? 0);
    const cE = -Number(vOrig.data.cashback_delta ?? 0);
    const novoP = Math.max(0, lOrig.data.pontos + pE);
    const novoC = Math.max(0, Math.round((Number(lOrig.data.cashback_saldo) + cE) * 100) / 100);
    const nivel = novoP <= 100 ? "bronze" : novoP <= 300 ? "prata" : "ouro";
    await supabaseAdmin.from("transactions").insert({
      store_id: loja.id,
      client_user_id: vOrig.data.client_user_id,
      tipo: "ajuste",
      valor: -Number(vOrig.data.valor ?? 0),
      pontos_delta: pE,
      cashback_delta: cE,
      status: "entregue",
      id_venda_externa: idEstorno,
      origem,
    });
    await supabaseAdmin
      .from("store_clients")
      .update({ pontos: novoP, cashback_saldo: novoC, nivel })
      .eq("id", lOrig.data.id);
    return { status: "estornado", pontos: pE, cashback: cE };
  }

  // ---------- CRÉDITO ----------
  if (!Number.isFinite(valor) || valor <= 0)
    return { status: "erro", error: "valor inválido" };
  if (!cpf || cpf.length !== 11) return { status: "erro", error: "cpf ausente/inválido" };

  const dup = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("store_id", loja.id)
    .eq("id_venda_externa", idExterno)
    .maybeSingle();
  if (dup.data) return { status: "duplicado" };

  let clientProfile: { id: string } | null = null;
  {
    const p = await supabaseAdmin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
    if (p.data) clientProfile = p.data;
  }
  let justCreated = false;
  if (!clientProfile) {
    const email = cpfToEmail(cpf);
    const password = randomBytes(24).toString("hex");
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nome, phone: telefone || null, cpf },
    });
    if (created.error || !created.data.user)
      return { status: "erro", error: `criar cliente: ${created.error?.message}` };
    clientProfile = { id: created.data.user.id };
    justCreated = true;
    await supabaseAdmin.from("profiles").upsert({
      id: clientProfile.id,
      full_name: nome,
      phone: telefone || null,
      cpf,
    });
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: clientProfile.id, role: "cliente" as const },
        { onConflict: "user_id,role" },
      );
  }

  const linkRes = await supabaseAdmin
    .from("store_clients")
    .upsert(
      {
        store_id: loja.id,
        user_id: clientProfile.id,
        ...(justCreated ? { pending_registration: true } : {}),
      },
      { onConflict: "store_id,user_id" },
    )
    .select("*")
    .single();
  if (linkRes.error) return { status: "erro", error: linkRes.error.message };
  const link = linkRes.data;

  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";
  const pontos = inclP ? Math.floor(valor * Number(loja.regra_pontos)) : 0;
  const cashback = inclC ? Math.round(valor * Number(loja.percentual_cashback)) / 100 : 0;
  const novoP = link.pontos + pontos;
  const novoC = Math.round((Number(link.cashback_saldo) + cashback) * 100) / 100;
  const nivel = novoP <= 100 ? "bronze" : novoP <= 300 ? "prata" : "ouro";

  const tx = await supabaseAdmin.from("transactions").insert({
    store_id: loja.id,
    client_user_id: clientProfile.id,
    tipo: "venda",
    valor,
    pontos_delta: pontos,
    cashback_delta: cashback,
    status: "entregue",
    id_venda_externa: idExterno,
    origem,
  });
  if (tx.error) {
    if (tx.error.code === "23505") return { status: "duplicado" };
    return { status: "erro", error: tx.error.message };
  }
  await supabaseAdmin
    .from("store_clients")
    .update({ pontos: novoP, cashback_saldo: novoC, nivel })
    .eq("id", link.id);

  if (pontos > 0) {
    try {
      const { notifyClient } = await import("@/lib/notify.server");
      await notifyClient({
        event: "pontos_ganhos",
        storeId: loja.id,
        clientUserId: clientProfile.id,
        pontosGanhos: pontos,
      });
    } catch {
      /* notificação é best-effort */
    }
  }

  return { status: "processado", pontos, cashback, novo_saldo_pontos: novoP };
}

// Garante token válido (refresh se necessário) e devolve access_token pronto pra uso.
export async function ensureFreshOlistToken(cred: {
  id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { refreshAccessToken } = await import("@/lib/olist.server");
  const expiresAtMs = new Date(cred.expires_at).getTime();
  if (Date.now() < expiresAtMs - 60_000) return cred.access_token;
  try {
    const refreshed = await refreshAccessToken(cred.refresh_token);
    await supabaseAdmin
      .from("erp_credentials")
      .update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
        last_refresh_at: new Date().toISOString(),
        status: "connected",
      })
      .eq("id", cred.id);
    return refreshed.access_token;
  } catch (e) {
    await supabaseAdmin
      .from("erp_credentials")
      .update({ status: "expired" })
      .eq("id", cred.id);
    throw e;
  }
}