// Server-only: polling da API V3 do Olist. Puxa pedidos alterados desde o
// último sync e processa via `processarPedidoOlist`. Chamado por:
//  - cron a cada 5min (rota /api/public/hooks/olist-sync)
//  - server-fn manual `sincronizarOlistAgora`

import { processarPedidoOlist, ensureFreshOlistToken } from "@/lib/olist-processor.server";

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

// Janela mínima quando não há last_sync_at (primeira execução): 1h atrás.
const FALLBACK_LOOKBACK_MS = 60 * 60_000;
// Guardrail: mesmo que o Olist devolva um monte de pedidos antigos, processa no máx X por ciclo.
const MAX_PEDIDOS_POR_CICLO = 50;

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
  const sinceIso = cred.last_sync_at ?? new Date(now.getTime() - FALLBACK_LOOKBACK_MS).toISOString();

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

  for (const item of items) {
    const rid = String(
      (item.id as string | number | undefined) ??
        (item.pedidoId as string | number | undefined) ??
        "",
    ).trim();
    if (!rid) {
      base.ignorados++;
      continue;
    }
    let pedidoRaw: Record<string, unknown>;
    try {
      pedidoRaw = await fetchPedido(accessToken, rid);
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
      error: result.status === "erro" ? result.error : undefined,
    });
  }

  const status = base.erros > 0 ? "erro" : base.processados > 0 ? "ok" : "sem_novidades";
  await supabaseAdmin
    .from("erp_credentials")
    .update({
      last_sync_at: now.toISOString(),
      last_sync_status: status,
      last_sync_error: base.erros > 0 ? base.detalhes.find((d) => d.error)?.error ?? null : null,
    })
    .eq("id", cred.id);

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