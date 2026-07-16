// Servidor-only: dispatcher de notificações WhatsApp via Evolution API.
// Desenhado para receber novos gatilhos no futuro (aniversário, inatividade,
// resgate confirmado) — basta adicionar um novo `event` e uma função que
// monte as variáveis do template.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export type NotifyEvent = "pontos_ganhos" | "nps_request";

export function formatBrazilPhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;
  // Se já vem com 55 e tamanho razoável, mantém. Senão prefixa 55.
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}

// Fallbacks por variável — garantem que a mensagem nunca saia com "{algo}" cru
// nem com string vazia. Aplicam-se quando a variável está ausente OU vazia.
const VAR_FALLBACKS: Record<string, string> = {
  nome_cliente: "cliente",
  pontos_ganhos: "0",
  nome_loja: "nossa loja",
  pontos_saldo: "0",
  pontos_faltantes: "alguns",
  proximo_premio: "novos prêmios em breve",
  link_portal_cliente: "",
  link_nps: "",
};

function renderTemplate(
  tpl: string,
  vars: Record<string, string | number | null | undefined>,
): string {
  const rendered = tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
    const raw = vars[k];
    const value = raw === undefined || raw === null ? "" : String(raw).trim();
    if (value !== "") return value;
    return VAR_FALLBACKS[k] ?? "";
  });
  // Higienização final: colapsa espaços duplicados e linhas vazias que sobraram
  // por conta de fallbacks vazios (ex.: link_portal_cliente sem slug).
  return rendered
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .filter((line, idx, arr) => !(line === "" && arr[idx - 1] === ""))
    .join("\n")
    .trim();
}

async function logIntegration(
  storeId: string,
  status: "sucesso" | "erro",
  message: string,
  payload: unknown,
) {
  await supabaseAdmin.from("integration_logs").insert({
    store_id: storeId,
    origem: "whatsapp",
    payload_recebido: payload as never,
    status,
    mensagem_erro: status === "erro" ? message : null,
  });
}

export async function sendWhatsappRaw(opts: {
  storeId: string;
  url: string;
  apikey: string;
  instance: string;
  number: string;
  text: string;
}): Promise<{ ok: boolean; error?: string }> {
  const { storeId, url, apikey, instance, number, text } = opts;
  const base = url.replace(/\/$/, "");
  const endpoint = `${base}/message/sendText/${encodeURIComponent(instance)}`;
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey },
      body: JSON.stringify({ number, text, textMessage: { text } }),
    });
    const body = await res.text();
    if (!res.ok) {
      const msg = `HTTP ${res.status}: ${body.slice(0, 400)}`;
      await logIntegration(storeId, "erro", msg, { endpoint, number });
      return { ok: false, error: msg };
    }
    await logIntegration(storeId, "sucesso", "mensagem enviada", {
      endpoint,
      number,
      preview: text.slice(0, 120),
    });
    return { ok: true };
  } catch (e) {
    const msg = (e as Error).message ?? "erro desconhecido";
    await logIntegration(storeId, "erro", msg, { endpoint, number });
    return { ok: false, error: msg };
  }
}

// Dispatcher: fire-and-forget. NUNCA lança — falhas são só logadas.
export async function notifyClient(params: {
  event: NotifyEvent;
  storeId: string;
  clientUserId: string;
  // contexto específico do evento
  pontosGanhos?: number;
  transactionId?: string;
}): Promise<void> {
  try {
    const { data: loja } = await supabaseAdmin
      .from("stores")
      .select(
        "id, slug, nome_fantasia, whatsapp_enabled, whatsapp_template_pontos, evolution_url, evolution_apikey, evolution_instance, nps_enabled, nps_template",
      )
      .eq("id", params.storeId)
      .maybeSingle();
    if (!loja) return;
    if (!loja.whatsapp_enabled) return;
    if (params.event === "nps_request" && !loja.nps_enabled) return;
    if (!loja.evolution_url || !loja.evolution_apikey || !loja.evolution_instance) {
      await logIntegration(loja.id, "erro", "WhatsApp ativado mas Evolution API não configurada", {
        event: params.event,
      });
      return;
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, phone")
      .eq("id", params.clientUserId)
      .maybeSingle();
    const numero = formatBrazilPhone(profile?.phone);
    if (!numero) {
      await logIntegration(loja.id, "erro", "cliente sem telefone válido", {
        user_id: params.clientUserId,
      });
      return;
    }

    const { data: link } = await supabaseAdmin
      .from("store_clients")
      .select("pontos, cashback_saldo")
      .eq("store_id", loja.id)
      .eq("user_id", params.clientUserId)
      .maybeSingle();
    const saldo = link?.pontos ?? 0;

    // próximo prêmio: produto ativo mais barato que ele ainda não pode resgatar
    const { data: prox } = await supabaseAdmin
      .from("products")
      .select("nome, custo_pontos")
      .eq("store_id", loja.id)
      .eq("ativo", true)
      .gt("custo_pontos", saldo)
      .order("custo_pontos", { ascending: true })
      .limit(1)
      .maybeSingle();

    const proximoPremio = prox?.nome?.trim() || VAR_FALLBACKS.proximo_premio;
    const pontosFaltantes = prox ? Math.max(0, prox.custo_pontos - saldo) : 0;
    const linkPortal = loja.slug ? `https://qsfclub.com/${loja.slug}` : "";
    const linkNps = params.transactionId ? `https://qsfclub.com/nps/${params.transactionId}` : "";

    let text: string;
    if (params.event === "pontos_ganhos") {
      text = renderTemplate(loja.whatsapp_template_pontos, {
        nome_cliente: profile?.full_name?.trim(),
        pontos_ganhos: params.pontosGanhos,
        nome_loja: loja.nome_fantasia?.trim(),
        pontos_saldo: saldo,
        pontos_faltantes: pontosFaltantes,
        proximo_premio: proximoPremio,
        link_portal_cliente: linkPortal,
      });
    } else if (params.event === "nps_request") {
      if (!linkNps) return;
      text = renderTemplate(loja.nps_template, {
        nome_cliente: profile?.full_name?.trim(),
        nome_loja: loja.nome_fantasia?.trim(),
        link_nps: linkNps,
      });
    } else {
      return;
    }

    await sendWhatsappRaw({
      storeId: loja.id,
      url: loja.evolution_url,
      apikey: loja.evolution_apikey,
      instance: loja.evolution_instance,
      number: numero,
      text,
    });
  } catch (e) {
    // último recurso — não deixa vazar erro pro caller
    try {
      await logIntegration(params.storeId, "erro", `notifyClient falhou: ${(e as Error).message}`, {
        event: params.event,
      });
    } catch {
      /* noop */
    }
  }
}
