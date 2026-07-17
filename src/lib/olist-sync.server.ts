// Server-only: polling da API V3 do Olist. Puxa pedidos alterados desde o
// último sync e processa via `processarPedidoOlist`. Chamado por:
//  - cron a cada 5min (rota /api/public/hooks/olist-sync)
//  - server-fn manual `sincronizarOlistAgora`

import {
  classificarSituacao,
  processarPedidoOlist,
  ensureFreshOlistToken,
} from "@/lib/olist-processor.server";

export type SyncStoreResult = {
  storeId: string;
  accountId: string | null;
  totalPedidos: number;
  processados: number;
  duplicados: number;
  ignorados: number;
  erros: number;
  error?: string;
  detalhes: Array<{ resourceId: string; status: string; error?: string }>;
};

// Guardrail: mesmo que o Olist devolva um monte de pedidos antigos, processa no máx X por ciclo.
const MAX_PEDIDOS_POR_CICLO = 50;

// Cutoff: só processamos pedidos alterados a partir do início do dia de HOJE
// (America/Sao_Paulo). Pedidos históricos são ignorados para manter o histórico
// da loja limpo — nada anterior a hoje entra na pontuação.
function inicioDoDiaSaoPauloIso(): string {
  const now = new Date();
  // America/Sao_Paulo = UTC-3 (sem horário de verão desde 2019).
  const utcMs = now.getTime();
  const spMs = utcMs - 3 * 60 * 60_000;
  const spDay = new Date(spMs);
  spDay.setUTCHours(0, 0, 0, 0);
  // Volta pro UTC: 00:00 em SP = 03:00 UTC.
  return new Date(spDay.getTime() + 3 * 60 * 60_000).toISOString();
}

export async function sincronizarLojaOlist(storeId: string): Promise<SyncStoreResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { listPedidosAlterados, fetchPedido } = await import("@/lib/olist.server");

  const credRes = await supabaseAdmin
    .from("erp_credentials")
    .select("*, stores(id, modalidade, regra_pontos, percentual_cashback)")
    .eq("provider", "olist_v3")
    .eq("store_id", storeId)
    .maybeSingle();
  const cred = credRes.data as (Record<string, unknown> & {
    id: string;
    access_token: string;
    refresh_token: string;
    expires_at: string;
    account_id: string | null;
    last_sync_at: string | null;
    sync_enabled: boolean;
    stores: { id: string; modalidade: string; regra_pontos: number; percentual_cashback: number };
  }) | null;

  const base: SyncStoreResult = {
    storeId,
    accountId: cred?.account_id ?? null,
    totalPedidos: 0,
    processados: 0,
    duplicados: 0,
    ignorados: 0,
    erros: 0,
    detalhes: [],
  };

  if (!cred) return { ...base, error: "loja não conectada ao Olist" };
  if (cred.sync_enabled === false) return { ...base, error: "sync desabilitado" };

  const now = new Date();
  const cutoffIso = inicioDoDiaSaoPauloIso();
  // Nunca voltar antes do início de hoje, mesmo que last_sync_at seja mais antigo.
  const lastIso = cred.last_sync_at ?? cutoffIso;
  const sinceIso = lastIso > cutoffIso ? lastIso : cutoffIso;

  let accessToken: string;
  try {
    accessToken = await ensureFreshOlistToken(cred);
  } catch (e) {
    const err = (e as Error).message;
    await supabaseAdmin
      .from("erp_credentials")
      .update({ last_sync_status: "erro", last_sync_error: err })
      .eq("id", cred.id);
    return { ...base, error: `refresh: ${err}` };
  }

  let items: Array<Record<string, unknown>> = [];
  try {
    items = await listPedidosAlterados(accessToken, sinceIso, { limit: MAX_PEDIDOS_POR_CICLO });
  } catch (e) {
    const err = (e as Error).message;
    await supabaseAdmin
      .from("erp_credentials")
      .update({ last_sync_status: "erro", last_sync_error: err })
      .eq("id", cred.id);
    await supabaseAdmin.from("integration_logs").insert({
      store_id: storeId,
      origem: "olist-polling",
      status: "erro",
      mensagem_erro: `list /pedidos falhou: ${err}`,
    });
    return { ...base, error: err };
  }

  base.totalPedidos = items.length;

  // Throttle: ~2 req/s pra ficar bem abaixo do limite (Olist ~120/min).
  const THROTTLE_MS = 500;
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (i > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
    const rid = String(
      (item.id as string | number | undefined) ??
        (item.pedidoId as string | number | undefined) ??
        "",
    ).trim();
    if (!rid) {
      base.ignorados++;
      continue;
    }

    const situacaoLista =
      item.situacao ?? item.codigoSituacao ?? item.descricaoSituacao ?? item.status;
    const temSituacaoNaLista = situacaoLista !== undefined && situacaoLista !== null && situacaoLista !== "";
    const acaoLista = temSituacaoNaLista ? classificarSituacao(situacaoLista) : null;

    // A listagem do Olist pode devolver dezenas de cancelamentos antigos. Se a
    // venda original nunca entrou no PontuaMax, não há nada a estornar — e não
    // precisamos gastar uma chamada extra em /pedidos/{id}, evitando 429.
    if (acaoLista === "estorno") {
      const original = await supabaseAdmin
        .from("transactions")
        .select("id")
        .eq("store_id", cred.stores.id)
        .eq("id_venda_externa", `olist:${rid}`)
        .eq("tipo", "venda")
        .maybeSingle();
      if (!original.data) {
        base.ignorados++;
        base.detalhes.push({
          resourceId: rid,
          status: "ignorado",
          error: "cancelamento sem venda original registrada",
        });
        continue;
      }
    } else if (acaoLista === "ignorar") {
      base.ignorados++;
      base.detalhes.push({
        resourceId: rid,
        status: "ignorado",
        error: `situacao=${JSON.stringify(situacaoLista)}`,
      });
      continue;
    }

    let pedidoRaw: Record<string, unknown>;
    try {
      pedidoRaw = acaoLista === "estorno" ? item : await fetchPedido(accessToken, rid);
    } catch (e) {
      base.erros++;
      base.detalhes.push({ resourceId: rid, status: "erro", error: (e as Error).message });
      continue;
    }
    const result = await processarPedidoOlist({
      loja: cred.stores,
      resourceId: rid,
      pedidoRaw,
      origem: "olist-polling",
    });
    if (result.status === "processado" || result.status === "estornado") base.processados++;
    else if (result.status === "duplicado") base.duplicados++;
    else if (result.status === "ignorado") base.ignorados++;
    else if (result.status === "erro") base.erros++;
    base.detalhes.push({
      resourceId: rid,
      status: result.status,
      error:
        result.status === "erro"
          ? result.error
          : result.status === "ignorado"
            ? result.motivo
            : undefined,
    });
  }

  const status = base.erros > 0 ? "erro" : base.processados > 0 ? "ok" : "sem_novidades";
  await supabaseAdmin
    .from("erp_credentials")
    .update({
      last_sync_at: now.toISOString(),
      last_sync_status: status,
      last_sync_error:
        base.erros > 0
          ? base.detalhes.find((d) => d.status === "erro" && d.error)?.error ?? null
          : null,
    })
    .eq("id", cred.id);

  const detalhesComErro = base.detalhes.filter((d) => d.status === "erro" && d.error);
  const detalhesIgnorados = base.detalhes.filter((d) => d.status === "ignorado" && d.error);

  await supabaseAdmin.from("integration_logs").insert({
    store_id: storeId,
    origem: "olist-polling",
    status: status === "erro" ? "erro" : "sucesso",
    mensagem_erro:
      status === "erro"
        ? `polling: ${base.erros} erros de ${base.totalPedidos}`
        : null,
    payload_recebido: {
      processados: base.processados,
      duplicados: base.duplicados,
      ignorados: base.ignorados,
      erros: base.erros,
      total: base.totalPedidos,
      amostra_erros: detalhesComErro.slice(0, 5),
      amostra_ignorados: detalhesIgnorados.slice(0, 5),
      amostra: base.detalhes.slice(0, 5),
    } as never,
  });

  return base;
}

export async function sincronizarTodasLojasOlist(): Promise<SyncStoreResult[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: creds } = await supabaseAdmin
    .from("erp_credentials")
    .select("store_id")
    .eq("provider", "olist_v3")
    .eq("status", "connected")
    .eq("sync_enabled", true);
  const rows = (creds ?? []) as Array<{ store_id: string }>;
  const results: SyncStoreResult[] = [];
  for (const r of rows) {
    try {
      results.push(await sincronizarLojaOlist(r.store_id));
    } catch (e) {
      results.push({
        storeId: r.store_id,
        accountId: null,
        totalPedidos: 0,
        processados: 0,
        duplicados: 0,
        ignorados: 0,
        erros: 1,
        error: (e as Error).message,
        detalhes: [],
      });
    }
  }
  return results;
}