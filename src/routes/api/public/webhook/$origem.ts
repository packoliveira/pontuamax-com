import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual, randomBytes } from "crypto";
import { cpfToEmail } from "@/lib/loyalty-shared";

// =====================================================================
// Webhook público de integração com ERPs (Olist, Tiny, Bling, teste)
// URL: /api/public/webhook/{olist|tiny|bling|teste}
//
// Autenticação: query `?store=<slug|uuid>&secret=<webhook_secret>`
//   (headers atuais: `x-pontuamax-store` / `x-pontuamax-secret`).
//   Os headers legados continuam aceitos para não interromper integrações existentes.
//
// Fluxo:
//   1. Valida origem, rate limit e segredo da loja.
//   2. Extrai id do pedido, valor total, CPF e dados do cliente do payload.
//   3. Se a notificação corresponde ao gatilho configurado pelo lojista
//      (`stores.olist_gatilho_pontuacao` = aprovado | faturado | ambos),
//      prossegue; caso contrário responde 200 e ignora.
//   4. Cria/localiza o perfil do cliente pelo CPF (email sintético).
//      Vincula à loja marcando como `pending_registration` se for novo.
//   5. Se o payload trouxer valor > 0, credita pontos/cashback (idempotente
//      por `id_venda_externa`). Sem valor, cliente fica só vinculado.
// =====================================================================

// ---------- Tipos de gatilho ----------
type Gatilho = "aprovado" | "faturado" | "ambos";

// Mapeia o `tipo`/`evento` da notificação Olist para o gatilho equivalente.
// Retorna null se o evento não é relevante para pontuação (ex.: cancelamento).
function classificarEvento(tipo: string): Gatilho | null {
  const t = tipo.toLowerCase();
  if (!t) return "aprovado"; // payloads sem tipo (nossos testes) → tratamos como aprovado
  // Eventos de estoque/produto/cadastro não são vendas — ignorar silenciosamente.
  if (
    t.includes("estoque") ||
    t.includes("produto") ||
    t.includes("preco") ||
    t.includes("preço") ||
    t.startsWith("cadastro_")
  )
    return null;
  if (
    t.includes("faturamento") ||
    t.includes("faturad") ||
    t.includes("nota_fiscal") ||
    t.includes("nfe")
  )
    return "faturado";
  if (
    t.includes("inclusao") ||
    t.includes("aprovad") ||
    t.includes("alteracao_situacao") ||
    t.includes("alteracao_pedido")
  )
    return "aprovado";
  if (t.includes("cancel") || t.includes("devolucao") || t.includes("estorno")) return null;
  // Qualquer outro tipo desconhecido: tratamos como "aprovado" (não bloqueia).
  return "aprovado";
}

function eventoAtendeGatilho(evento: Gatilho | null, gatilho: Gatilho): boolean {
  if (!evento) return false;
  if (gatilho === "ambos") return true;
  return evento === gatilho;
}

// ---------- Extração de payload ----------
type Extraido = {
  idVenda: string;
  numeroPedido: string;
  valor: number;
  cpf: string;
  telefone: string;
  nome: string;
  tipoEvento: string;
};

function parseValor(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const normalized =
    typeof raw === "string" && raw.includes(",") ? raw.replace(/\./g, "").replace(",", ".") : raw;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function extrair(p: Record<string, unknown>): Extraido {
  const root =
    (p.pedido as Record<string, unknown>) ??
    (p.dados as Record<string, unknown>) ??
    (p.data as Record<string, unknown>) ??
    (p.venda as Record<string, unknown>) ??
    p;
  const cliente = (root.cliente as Record<string, unknown>) ?? {};
  const fones = (cliente.fones as Array<Record<string, unknown>>) ?? [];
  const fonePrincipal =
    (cliente.fone as string | undefined) ??
    (cliente.celular as string | undefined) ??
    (cliente.telefone as string | undefined) ??
    (fones[0]?.fone as string | undefined) ??
    (fones[0]?.numero as string | undefined) ??
    "";

  const idVenda = String(
    p.id_venda_externa ??
      root.id ??
      root.idPedido ??
      root.numero ??
      root.numero_pedido ??
      root.codigo ??
      "",
  ).trim();

  const numeroPedido = String(
    p.numero_pedido ?? root.numero ?? root.numeroPedido ?? root.numero_pedido ?? root.codigo ?? "",
  ).trim();

  const valorRaw =
    p.valor ??
    root.total ??
    root.valor_total ??
    root.total_pedido ??
    root.valor ??
    root.totalPedido ??
    root.valorTotal ??
    0;
  const valor = parseValor(valorRaw) ?? 0;

  const cpfRaw = String(
    p.cpf_cliente ?? cliente.cpfCnpj ?? cliente.cpf_cnpj ?? cliente.documento ?? cliente.cpf ?? "",
  );
  const cpf = cpfRaw.replace(/\D/g, "");

  const telRaw = String(p.telefone_cliente ?? fonePrincipal ?? "");
  const telefone = telRaw.replace(/\D/g, "");

  const nome =
    String(p.nome_cliente ?? cliente.nome ?? cliente.razao_social ?? "").trim() || "Cliente";

  const tipoEvento = String(p.tipo ?? p.event ?? p.evento ?? "")
    .trim()
    .toLowerCase();

  // Situação atual do pedido (Olist envia em `dados.codigoSituacao` / `descricaoSituacao`).
  const situacao = String(
    root.codigoSituacao ??
      root.codigo_situacao ??
      root.descricaoSituacao ??
      root.descricao_situacao ??
      root.situacao ??
      "",
  )
    .trim()
    .toLowerCase();

  // Se a situação for mais específica que o `tipo`, usamos ela para classificar.
  const tipoFinal = situacao ? `${tipoEvento}|${situacao}` : tipoEvento;

  return { idVenda, numeroPedido, valor, cpf, telefone, nome, tipoEvento: tipoFinal };
}

// ---------- Enriquecimento via API Tiny/Olist V2 ----------
// Quando o webhook chega sem valor total, tentamos buscar o pedido completo
// via API pública da Tiny (https://api.tiny.com.br/api2/pedido.obter.php).
// Requer o secret `OLIST_API_TOKEN` configurado.
type TinyPedido = Record<string, unknown>;
type EnriquecimentoApi = { valor: number | null; fonte?: string; motivo?: string };

function totalDoPedidoTiny(pedido: TinyPedido | undefined): number | null {
  if (!pedido) return null;
  return parseValor(
    pedido.total_pedido ??
      pedido.totalPedido ??
      pedido.valor_total ??
      pedido.valorTotal ??
      pedido.total ??
      pedido.valor,
  );
}

function motivoTiny(retorno: Record<string, unknown> | undefined, fallback: string): string {
  if (!retorno) return fallback;
  const status = typeof retorno.status === "string" ? retorno.status : "";
  const codigo = retorno.codigo_erro ? `código ${String(retorno.codigo_erro)}` : "";
  const erros = Array.isArray(retorno.erros)
    ? retorno.erros
        .map((item) => {
          if (typeof item === "string") return item;
          if (item && typeof item === "object") {
            const obj = item as Record<string, unknown>;
            return String(obj.erro ?? obj.message ?? obj.mensagem ?? "").trim();
          }
          return "";
        })
        .filter(Boolean)
        .join("; ")
    : "";
  return [status, codigo, erros].filter(Boolean).join(" — ") || fallback;
}

async function tinyPost(
  endpoint: string,
  params: URLSearchParams,
): Promise<Record<string, unknown> | null> {
  const res = await fetch(`https://api.tiny.com.br/api2/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!res.ok) return { _http_error: res.status };
  return (await res.json()) as Record<string, unknown>;
}

async function buscarPedidoPorId(token: string, idPedido: string): Promise<EnriquecimentoApi> {
  const json = await tinyPost(
    "pedido.obter.php",
    new URLSearchParams({ token, id: idPedido, formato: "json" }),
  );
  if (json?._http_error) return { valor: null, motivo: `pedido.obter HTTP ${json._http_error}` };
  const retorno = json?.retorno as Record<string, unknown> | undefined;
  const pedido = retorno?.pedido as TinyPedido | undefined;
  const valor = totalDoPedidoTiny(pedido);
  if (valor) return { valor, fonte: "pedido.obter" };
  return { valor: null, motivo: `pedido.obter: ${motivoTiny(retorno, "pedido sem total")}` };
}

async function pesquisarPedido(
  token: string,
  termo: string,
  numeroPedido: string,
): Promise<EnriquecimentoApi> {
  const json = await tinyPost(
    "pedidos.pesquisa.php",
    new URLSearchParams({ token, pesquisa: termo, formato: "json" }),
  );
  if (json?._http_error)
    return { valor: null, motivo: `pedidos.pesquisa HTTP ${json._http_error}` };
  const retorno = json?.retorno as Record<string, unknown> | undefined;
  const pedidosRaw = retorno?.pedidos as Array<{ pedido?: TinyPedido }> | undefined;
  const pedidos = (pedidosRaw ?? []).map((item) => item.pedido).filter(Boolean) as TinyPedido[];
  const escolhido =
    pedidos.find((pedido) => {
      const id = String(pedido.id ?? "").trim();
      const numero = String(pedido.numero ?? "").trim();
      const ecommerce = String(pedido.numero_ecommerce ?? pedido.numeroEcommerce ?? "").trim();
      return id === termo || numero === termo || numero === numeroPedido || ecommerce === termo;
    }) ?? (pedidos.length === 1 ? pedidos[0] : undefined);
  const valor = totalDoPedidoTiny(escolhido);
  if (valor) return { valor, fonte: "pedidos.pesquisa" };
  return {
    valor: null,
    motivo: `pedidos.pesquisa(${termo}): ${motivoTiny(retorno, "pedido não encontrado ou sem total")}`,
  };
}

async function buscarTotalPedidoOlist(
  idPedido: string,
  numeroPedido = "",
): Promise<EnriquecimentoApi> {
  const token = process.env.OLIST_API_TOKEN;
  if (!token) return { valor: null, motivo: "OLIST_API_TOKEN não configurado" };
  const tentativas: string[] = [];
  try {
    const porId = await buscarPedidoPorId(token, idPedido);
    if (porId.valor) return porId;
    if (porId.motivo) tentativas.push(porId.motivo);

    const termos = [numeroPedido, idPedido].filter(
      (termo, index, all) => termo && all.indexOf(termo) === index,
    );
    for (const termo of termos) {
      const pesquisado = await pesquisarPedido(token, termo, numeroPedido);
      if (pesquisado.valor) return pesquisado;
      if (pesquisado.motivo) tentativas.push(pesquisado.motivo);
    }

    return { valor: null, motivo: tentativas.join(" | ") || "API não retornou total" };
  } catch {
    return { valor: null, motivo: "falha de comunicação com a API da Olist/Tiny" };
  }
}

function dataTiny(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

async function obterPedidoCompletoTiny(
  token: string,
  idPedido: string,
): Promise<TinyPedido | null> {
  const json = await tinyPost(
    "pedido.obter.php",
    new URLSearchParams({ token, id: idPedido, formato: "json" }),
  );
  const retorno = json?.retorno as Record<string, unknown> | undefined;
  return (retorno?.pedido as TinyPedido | undefined) ?? null;
}

async function buscarPedidosRecentesOlist(): Promise<{ pedidos: TinyPedido[]; motivo?: string }> {
  const token = process.env.OLIST_API_TOKEN;
  if (!token) return { pedidos: [], motivo: "OLIST_API_TOKEN não configurado" };

  const agora = new Date();
  const inicio = new Date(agora.getTime() - 36 * 60 * 60 * 1000);
  const json = await tinyPost(
    "pedidos.pesquisa.php",
    new URLSearchParams({
      token,
      formato: "json",
      dataInicial: dataTiny(inicio),
      dataFinal: dataTiny(agora),
    }),
  );
  if (json?._http_error)
    return { pedidos: [], motivo: `pedidos.pesquisa HTTP ${json._http_error}` };

  const retorno = json?.retorno as Record<string, unknown> | undefined;
  const pedidosRaw = retorno?.pedidos as Array<{ pedido?: TinyPedido }> | undefined;
  const ids = (pedidosRaw ?? [])
    .map((item) => String(item.pedido?.id ?? "").trim())
    .filter(Boolean)
    .filter((id, index, all) => all.indexOf(id) === index)
    .slice(0, 25);

  const pedidos: TinyPedido[] = [];
  for (const id of ids) {
    const pedido = await obterPedidoCompletoTiny(token, id);
    if (pedido) pedidos.push(pedido);
  }

  return {
    pedidos,
    motivo: pedidos.length
      ? undefined
      : motivoTiny(retorno, "nenhum pedido recente encontrado na API"),
  };
}

function eventoPodeSinalizarVenda(tipoEvento: string): boolean {
  const t = tipoEvento.toLowerCase();
  return (
    t.includes("estoque") || t.includes("produto") || t.includes("preco") || t.includes("preço")
  );
}

async function sincronizarPedidosRecentesOlist(request: Request) {
  const { pedidos, motivo } = await buscarPedidosRecentesOlist();
  let processadas = 0;
  let duplicadas = 0;
  let erros = 0;

  for (const pedido of pedidos) {
    const syncRequest = new Request(request.url, {
      method: "POST",
      headers: new Headers(request.headers),
      body: JSON.stringify({ tipo: "sincronizacao_api", pedido }),
    });
    const response = await handlePost({ request: syncRequest, params: { origem: "olist" } });
    const body = (await response.json().catch(() => ({}))) as Record<string, unknown>;
    if (body.status === "sucesso" && body.duplicated) duplicadas += 1;
    else if (body.status === "sucesso" && body.message === "venda processada") processadas += 1;
    else if (body.status === "erro") erros += 1;
  }

  return { encontrados: pedidos.length, processadas, duplicadas, erros, motivo };
}

// ---------- Cálculo de recompensas ----------

function calcularRecompensa(
  valor: number,
  loja: { modalidade: string; regra_pontos: number | string; percentual_cashback: number | string },
  saldoPontos: number,
  saldoCashback: number,
) {
  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";
  const pontos = inclP ? Math.floor(valor * Number(loja.regra_pontos)) : 0;
  const cashback = inclC ? Math.round(valor * Number(loja.percentual_cashback)) / 100 : 0;
  const novoPontos = saldoPontos + pontos;
  const novoCashback = Math.round((Number(saldoCashback) + cashback) * 100) / 100;
  const nivel: "bronze" | "prata" | "ouro" =
    novoPontos <= 100 ? "bronze" : novoPontos <= 300 ? "prata" : "ouro";
  return { pontos, cashback, novoPontos, novoCashback, nivel };
}

// ---------- Utilitários HTTP ----------
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Requested-With, Accept, Origin, x-pontuamax-secret, x-pontuamax-store, x-qsf-secret, x-qsf-store",
  "Access-Control-Max-Age": "86400",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

// ---------- Handler ----------
export const Route = createFileRoute("/api/public/webhook/$origem")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      HEAD: async () => new Response(null, { status: 200, headers: CORS }),
      GET: async () => json({ status: "ok", message: "PontuaMax webhook endpoint ativo" }, 200),

      POST: async ({ request, params }) => {
        // Guardião externo: qualquer exceção inesperada retorna 200 vazio
        // para o ERP (Olist/Tiny/Bling) — nunca deixar vazar 5xx, senão
        // eles desativam o webhook por "erros consecutivos".
        try {
          return await handlePost({ request, params });
        } catch (e) {
          console.error("[webhook] exceção não tratada:", (e as Error).message);
          return json({ status: "erro", message: "erro interno — registrado para análise" }, 200);
        }
      },
    },
  },
});

export async function handleOlistWebhookAlias(request: Request) {
  try {
    return await handlePost({ request, params: { origem: "olist" } });
  } catch (e) {
    console.error("[olist-vendas] exceção não tratada:", (e as Error).message);
    return json({ status: "erro", message: "erro interno — registrado para análise" }, 200);
  }
}

async function handlePost({ request, params }: { request: Request; params: { origem: string } }) {
  // IMPORTANTE: sempre respondemos HTTP 200 para o ERP (Olist/Tiny/Bling).
  // A Olist desativa o webhook após poucos erros consecutivos (não-2xx),
  // então erros de negócio ficam no corpo (`status: "erro"`) e no
  // `integration_logs` — nunca no código HTTP.
  const ok = (body: unknown) => json(body, 200);
  const origem = String(params.origem).toLowerCase();
  if (!["olist", "tiny", "bling", "teste"].includes(origem)) {
    return ok({ status: "erro", message: "origem inválida (use olist|tiny|bling|teste)" });
  }

  // 1) Rate limit: 60 req/min por IP.
  const { checkRateLimit, getClientIp } = await import("@/lib/rate-limit.server");
  const ip = getClientIp(request);
  const allowed = await checkRateLimit(`webhook:${origem}:${ip}`, 60, 60);
  if (!allowed) {
    return ok({ status: "erro", message: "rate limit — aguarde um minuto" });
  }

  // 2) Corpo (aceita vazio como "ping de conectividade").
  const raw = await request.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    return ok({ status: "erro", message: "JSON inválido" });
  }

  // 3) Identificação da loja + segredo (via query ou header).
  const url = new URL(request.url);
  const storeRef =
    request.headers.get("x-pontuamax-store") ??
    request.headers.get("x-qsf-store") ??
    url.searchParams.get("store") ??
    url.searchParams.get("loja") ??
    (payload.store_slug as string | undefined) ??
    (payload.store_id as string | undefined) ??
    "";
  const secret =
    request.headers.get("x-pontuamax-secret") ??
    request.headers.get("x-qsf-secret") ??
    url.searchParams.get("secret") ??
    url.searchParams.get("token") ??
    "";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(storeRef);
  const q = supabaseAdmin.from("stores").select("*");
  const storeRes = await (isUuid ? q.eq("id", storeRef) : q.eq("slug", storeRef)).maybeSingle();
  const loja = storeRes.data;
  if (!loja) return ok({ status: "erro", message: "loja não encontrada" });

  const { getStoreSecrets } = await import("@/lib/store-secrets.server");
  const storeSecrets = await getStoreSecrets(loja.id);

  // Helper para logar e responder em uma única linha.
  const logAndRespond = async (
    status: "sucesso" | "erro",
    message: string,
    _httpStatus: number,
    extra: Record<string, unknown> = {},
  ) => {
    await supabaseAdmin.from("integration_logs").insert({
      store_id: loja.id,
      origem,
      payload_recebido: payload as never,
      status,
      mensagem_erro: status === "erro" ? message : null,
    });
    if (status === "sucesso") {
      await supabaseAdmin
        .from("stores")
        .update({ webhook_last_at: new Date().toISOString() })
        .eq("id", loja.id);
    } else {
      // Alerta o lojista no painel — throttled 1x a cada 30 min
      // por loja+origem para não gerar avalanche de notificações.
      try {
        const { checkRateLimit } = await import("@/lib/rate-limit.server");
        const podeNotificar = await checkRateLimit(`webhook_alert:${loja.id}:${origem}`, 1, 1800);
        if (podeNotificar) {
          const { notifyMerchant } = await import("@/lib/team-helpers.server");
          await notifyMerchant({
            storeId: loja.id,
            tipo: "webhook_erro",
            titulo: `Erro no webhook (${origem})`,
            mensagem: message,
            metadata: { origem, ...extra },
          });
        }
      } catch (e) {
        console.warn("[webhook] falha ao criar alerta:", (e as Error).message);
      }
    }
    // Sempre HTTP 200 para o ERP não desativar o webhook por
    // "erros consecutivos". O status real vai no corpo.
    void _httpStatus;
    return json({ status, message, ...extra }, 200);
  };

  if (!secret || !safeEqual(secret, storeSecrets.webhook_secret ?? "")) {
    return logAndRespond("erro", "segredo inválido", 401);
  }

  // Ping de conectividade (Olist às vezes envia POST vazio na configuração).
  if (!raw || Object.keys(payload).length === 0) {
    if (origem === "olist") {
      const sync = await sincronizarPedidosRecentesOlist(request);
      return logAndRespond("sucesso", "webhook validado e pedidos recentes verificados", 200, {
        validation: true,
        sync,
      });
    }
    return logAndRespond("sucesso", "webhook validado", 200, { validation: true });
  }

  // 4) Extração + gatilho configurado.
  const { idVenda, numeroPedido, valor, cpf, telefone, nome, tipoEvento } = extrair(payload);
  const gatilhoLoja = ((loja as { olist_gatilho_pontuacao?: string }).olist_gatilho_pontuacao ??
    "ambos") as Gatilho;
  const evento = classificarEvento(tipoEvento);
  if (!eventoAtendeGatilho(evento, gatilhoLoja)) {
    if (origem === "olist" && eventoPodeSinalizarVenda(tipoEvento)) {
      const sync = await sincronizarPedidosRecentesOlist(request);
      return logAndRespond(
        "sucesso",
        `evento "${tipoEvento || "sem tipo"}" ignorado, pedidos recentes verificados pela API`,
        200,
        { ignored_event: tipoEvento, gatilho: gatilhoLoja, sync },
      );
    }
    return logAndRespond(
      "sucesso",
      `evento "${tipoEvento || "sem tipo"}" ignorado — gatilho da loja é "${gatilhoLoja}"`,
      200,
      { ignored_event: tipoEvento, gatilho: gatilhoLoja },
    );
  }

  if (!idVenda) {
    return logAndRespond("erro", "id do pedido é obrigatório (numero/id_venda_externa)", 400);
  }

  if (!cpf || cpf.length !== 11) {
    return logAndRespond(
      "erro",
      "CPF do cliente é obrigatório (11 dígitos) — configure a Olist para enviar o documento do comprador",
      400,
    );
  }
  if (telefone && telefone.length < 8) {
    return logAndRespond("erro", "telefone inválido", 400);
  }

  // 5) Idempotência.
  const dup = await supabaseAdmin
    .from("transactions")
    .select("id")
    .eq("store_id", loja.id)
    .eq("id_venda_externa", idVenda)
    .maybeSingle();
  if (dup.data) {
    return logAndRespond("sucesso", "venda já processada (idempotente)", 200, {
      duplicated: true,
    });
  }

  // 6) Cliente: busca por CPF, cria se necessário.
  let clientProfile: { id: string } | null = null;
  let clientJustCreated = false;
  {
    const p = await supabaseAdmin.from("profiles").select("id").eq("cpf", cpf).maybeSingle();
    if (p.data) clientProfile = p.data;
  }
  if (!clientProfile && telefone) {
    const p = await supabaseAdmin.from("profiles").select("id").eq("phone", telefone).maybeSingle();
    if (p.data) clientProfile = p.data;
  }
  if (!clientProfile) {
    const email = cpfToEmail(cpf);
    const password = randomBytes(24).toString("hex");
    const created = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: nome, phone: telefone || null, cpf },
    });
    if (created.error || !created.data.user) {
      return logAndRespond("erro", `falha criando cliente: ${created.error?.message ?? "?"}`, 500);
    }
    clientProfile = { id: created.data.user.id };
    clientJustCreated = true;
    await supabaseAdmin
      .from("profiles")
      .upsert({ id: clientProfile.id, full_name: nome, phone: telefone || null, cpf });
    await supabaseAdmin
      .from("user_roles")
      .upsert(
        { user_id: clientProfile.id, role: "cliente" as const },
        { onConflict: "user_id,role" },
      );
  }

  // 7) Vínculo com a loja (marca "cadastro pendente" se cliente novo).
  const linkRes = await supabaseAdmin
    .from("store_clients")
    .upsert(
      {
        store_id: loja.id,
        user_id: clientProfile.id,
        ...(clientJustCreated ? { pending_registration: true } : {}),
      },
      { onConflict: "store_id,user_id", ignoreDuplicates: false },
    )
    .select("*")
    .single();
  if (linkRes.error) return logAndRespond("erro", linkRes.error.message, 500);
  const link = linkRes.data;

  // 8) Sem valor no payload → tenta enriquecer via API Tiny/Olist V2.
  let valorFinal = valor;
  let enriquecido = false;
  let motivoApi = "";
  if (!Number.isFinite(valorFinal) || valorFinal <= 0) {
    const totalApi = await buscarTotalPedidoOlist(idVenda, numeroPedido);
    if (totalApi.valor && totalApi.valor > 0) {
      valorFinal = totalApi.valor;
      enriquecido = true;
    } else {
      motivoApi = totalApi.motivo ?? "sem detalhe da API";
    }
  }

  if (!Number.isFinite(valorFinal) || valorFinal <= 0) {
    return logAndRespond(
      "erro",
      `Cliente vinculado como pendente. Notificação "${tipoEvento || "sem tipo"}" do pedido ${idVenda} chegou sem valor total e a API da Olist não retornou o total. Motivo: ${motivoApi || "não informado"}.`,
      200,
      { cliente_vinculado: true, aguardando_valor: true },
    );
  }

  // 9) Calcula e credita.
  const { pontos, cashback, novoPontos, novoCashback, nivel } = calcularRecompensa(
    valorFinal,
    loja,
    link.pontos,
    Number(link.cashback_saldo),
  );

  const tx = await supabaseAdmin.from("transactions").insert({
    store_id: loja.id,
    client_user_id: clientProfile.id,
    tipo: "venda",
    valor: valorFinal,
    pontos_delta: pontos,
    cashback_delta: cashback,
    status: "entregue",
    id_venda_externa: idVenda,
    origem: enriquecido ? `${origem}:api_enriched` : origem,
  });
  if (tx.error) {
    if (tx.error.code === "23505") {
      return logAndRespond("sucesso", "venda já processada (idempotente)", 200, {
        duplicated: true,
      });
    }
    return logAndRespond("erro", tx.error.message, 500);
  }
  const upd = await supabaseAdmin
    .from("store_clients")
    .update({ pontos: novoPontos, cashback_saldo: novoCashback, nivel })
    .eq("id", link.id);
  if (upd.error) return logAndRespond("erro", upd.error.message, 500);

  if (pontos > 0) {
    const { notifyClient } = await import("@/lib/notify.server");
    await notifyClient({
      event: "pontos_ganhos",
      storeId: loja.id,
      clientUserId: clientProfile.id,
      pontosGanhos: pontos,
    });
  }

  return logAndRespond("sucesso", "venda processada", 200, {
    pontos_creditados: pontos,
    cashback_creditado: cashback,
    novo_saldo_pontos: novoPontos,
    novo_saldo_cashback: novoCashback,
  });
}
