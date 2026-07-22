import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual, randomBytes } from "crypto";
import { cpfToEmail } from "@/lib/qsf-shared";

// =====================================================================
// Webhook público de integração com ERPs (Olist, Tiny, Bling, teste)
// URL: /api/public/webhook/{olist|tiny|bling|teste}
//
// Autenticação: query `?store=<slug|uuid>&secret=<webhook_secret>`
//   (também aceita headers `x-qsf-store` / `x-qsf-secret`).
//
// Fluxo (só webhook, sem chamada de API):
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
  if (t.includes("faturamento") || t.includes("nota_fiscal") || t.includes("nfe")) return "faturado";
  if (t.includes("inclusao") || t.includes("aprovad") || t.includes("alteracao_situacao") || t.includes("alteracao_pedido"))
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
  valor: number;
  cpf: string;
  telefone: string;
  nome: string;
  tipoEvento: string;
};

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
    p.id_venda_externa ?? root.id ?? root.numero ?? root.numero_pedido ?? root.codigo ?? "",
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
  const valor =
    typeof valorRaw === "string" ? Number(valorRaw.replace(",", ".")) : Number(valorRaw);

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

  return { idVenda, valor, cpf, telefone, nome, tipoEvento };
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
  const nivel = novoPontos <= 100 ? "bronze" : novoPontos <= 300 ? "prata" : "ouro";
  return { pontos, cashback, novoPontos, novoCashback, nivel };
}

// ---------- Utilitários HTTP ----------
const CORS = {
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-qsf-secret, x-qsf-store",
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
      GET: async () =>
        json({ status: "ok", message: "PontuaMax webhook endpoint ativo" }, 200),

      POST: async ({ request, params }) => {
        const origem = String(params.origem).toLowerCase();
        if (!["olist", "tiny", "bling", "teste"].includes(origem)) {
          return json({ error: "origem inválida (use olist|tiny|bling|teste)" }, 404);
        }

        // 1) Rate limit: 60 req/min por IP.
        const { checkRateLimit, getClientIp } = await import("@/lib/rate-limit.server");
        const ip = getClientIp(request);
        const allowed = await checkRateLimit(`webhook:${origem}:${ip}`, 60, 60);
        if (!allowed) {
          return json(
            { error: "Muitas tentativas, aguarde um minuto e tente novamente." },
            429,
          );
        }

        // 2) Corpo (aceita vazio como "ping de conectividade").
        const raw = await request.text();
        let payload: Record<string, unknown> = {};
        try {
          payload = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
        } catch {
          return json({ error: "JSON inválido" }, 400);
        }

        // 3) Identificação da loja + segredo (via query ou header).
        const url = new URL(request.url);
        const storeRef =
          request.headers.get("x-qsf-store") ??
          url.searchParams.get("store") ??
          url.searchParams.get("loja") ??
          (payload.store_slug as string | undefined) ??
          (payload.store_id as string | undefined) ??
          "";
        const secret =
          request.headers.get("x-qsf-secret") ??
          url.searchParams.get("secret") ??
          url.searchParams.get("token") ??
          "";

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          storeRef,
        );
        const q = supabaseAdmin.from("stores").select("*");
        const storeRes = await (isUuid ? q.eq("id", storeRef) : q.eq("slug", storeRef)).maybeSingle();
        const loja = storeRes.data;
        if (!loja) return json({ error: "loja não encontrada" }, 404);

        const { getStoreSecrets } = await import("@/lib/store-secrets.server");
        const storeSecrets = await getStoreSecrets(loja.id);

        // Helper para logar e responder em uma única linha.
        const logAndRespond = async (
          status: "sucesso" | "erro",
          message: string,
          httpStatus: number,
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
          }
          return json({ status, message, ...extra }, httpStatus);
        };

        if (!secret || !safeEqual(secret, storeSecrets.webhook_secret ?? "")) {
          return logAndRespond("erro", "segredo inválido", 401);
        }

        // Ping de conectividade (Olist às vezes envia POST vazio na configuração).
        if (!raw || Object.keys(payload).length === 0) {
          return logAndRespond("sucesso", "webhook validado", 200, { validation: true });
        }

        // 4) Extração + gatilho configurado.
        const { idVenda, valor, cpf, telefone, nome, tipoEvento } = extrair(payload);
        if (!idVenda) {
          return logAndRespond("erro", "id do pedido é obrigatório (numero/id_venda_externa)", 400);
        }

        const gatilhoLoja = ((loja as { olist_gatilho_pontuacao?: string })
          .olist_gatilho_pontuacao ?? "ambos") as Gatilho;
        const evento = classificarEvento(tipoEvento);
        if (!eventoAtendeGatilho(evento, gatilhoLoja)) {
          return logAndRespond(
            "sucesso",
            `evento "${tipoEvento || "sem tipo"}" ignorado — gatilho da loja é "${gatilhoLoja}"`,
            200,
            { ignored_event: tipoEvento, gatilho: gatilhoLoja },
          );
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
          const p = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("phone", telefone)
            .maybeSingle();
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
            return logAndRespond(
              "erro",
              `falha criando cliente: ${created.error?.message ?? "?"}`,
              500,
            );
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

        // 8) Sem valor no payload → só vincula, aguarda próxima notificação.
        if (!Number.isFinite(valor) || valor <= 0) {
          return logAndRespond(
            "sucesso",
            `Cliente vinculado como pendente. Notificação "${tipoEvento || "sem tipo"}" do pedido ${idVenda} chegou sem valor total — quando a Olist enviar o evento com o total, os pontos serão creditados automaticamente.`,
            200,
            { cliente_vinculado: true, aguardando_valor: true },
          );
        }

        // 9) Calcula e credita.
        const { pontos, cashback, novoPontos, novoCashback, nivel } = calcularRecompensa(
          valor,
          loja,
          link.pontos,
          Number(link.cashback_saldo),
        );

        const tx = await supabaseAdmin.from("transactions").insert({
          store_id: loja.id,
          client_user_id: clientProfile.id,
          tipo: "venda",
          valor,
          pontos_delta: pontos,
          cashback_delta: cashback,
          status: "entregue",
          id_venda_externa: idVenda,
          origem,
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
      },
    },
  },
});