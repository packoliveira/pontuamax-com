import { z } from "zod";

// -------- Promoções: multiplicador ativo agora --------
export function getActiveMultiplier(
  promos: Array<{
    multiplicador: number | string;
    dias_semana: number[];
    hora_inicio: string;
    hora_fim: string;
    data_inicio: string | null;
    data_fim: string | null;
  }>,
): number {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(new Date()).map((p) => [p.type, p.value]));
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = map[parts.weekday] ?? 0;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const hm = `${parts.hour}:${parts.minute}`;
  let mult = 1;
  for (const p of promos) {
    if (!p.dias_semana.includes(dow)) continue;
    if (p.data_inicio && date < p.data_inicio) continue;
    if (p.data_fim && date > p.data_fim) continue;
    const hi = p.hora_inicio.slice(0, 5);
    const hf = p.hora_fim.slice(0, 5);
    if (hm < hi || hm > hf) continue;
    const m = Number(p.multiplicador);
    if (m > mult) mult = m;
  }
  return mult;
}

export const promoSchema = z.object({
  id: z.string().uuid().optional(),
  nome: z.string().min(1).max(100),
  multiplicador: z.number().min(1).max(10),
  dias_semana: z.array(z.number().int().min(0).max(6)).min(1),
  hora_inicio: z.string().regex(/^\d{2}:\d{2}$/),
  hora_fim: z.string().regex(/^\d{2}:\d{2}$/),
  data_inicio: z.string().nullable().optional(),
  data_fim: z.string().nullable().optional(),
  ativo: z.boolean().default(true),
});

export function formatVoucherJaUsado(delivered_at: string | null | undefined): string {
  if (!delivered_at) {
    return "Este voucher já foi utilizado anteriormente. Cada voucher só pode ser entregue uma vez.";
  }
  const d = new Date(delivered_at);
  const fmt = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
  return `Este voucher já foi utilizado em ${fmt}. Cada voucher só pode ser entregue uma vez.`;
}

export function randomGiftCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = new Uint8Array(8);
  crypto.getRandomValues(random);
  let out = "";
  for (const value of random) out += alphabet[value % alphabet.length];
  return out;
}

export async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// -------- Campanhas WhatsApp --------
export type SegmentoTipo =
  | "todos"
  | "bronze"
  | "prata"
  | "ouro"
  | "inativos_30"
  | "inativos_60"
  | "inativos_90"
  | "aniversariantes";

export function renderMsg(tpl: string, vars: Record<string, string | number | null>): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => {
    const v = vars[k];
    return v === null || v === undefined ? "" : String(v);
  });
}

export async function selecionarDestinatarios(
  storeId: string,
  segmento: SegmentoTipo,
): Promise<
  Array<{
    user_id: string;
    pontos: number;
    nivel: string;
    full_name: string | null;
    phone: string | null;
    birthdate: string | null;
  }>
> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  let q = supabaseAdmin
    .from("store_clients")
    .select("user_id, pontos, nivel, profiles:user_id(full_name, phone, birthdate)")
    .eq("store_id", storeId);
  if (segmento === "bronze" || segmento === "prata" || segmento === "ouro") {
    q = q.eq("nivel", segmento);
  }
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  let rows = (data ?? [])
    .map((r) => {
      const p = r.profiles as unknown as {
        full_name: string | null;
        phone: string | null;
        birthdate: string | null;
      } | null;
      return {
        user_id: r.user_id,
        pontos: r.pontos,
        nivel: String(r.nivel),
        full_name: p?.full_name ?? null,
        phone: p?.phone ?? null,
        birthdate: p?.birthdate ?? null,
      };
    })
    .filter((r) => !!r.phone);

  if (segmento.startsWith("inativos_")) {
    const dias = Number(segmento.split("_")[1]);
    const cutoff = new Date(Date.now() - dias * 86400_000).toISOString();
    const { data: tx } = await supabaseAdmin
      .from("transactions")
      .select("client_user_id, created_at")
      .eq("store_id", storeId)
      .eq("tipo", "venda")
      .gte("created_at", cutoff);
    const ativos = new Set((tx ?? []).map((t) => t.client_user_id));
    rows = rows.filter((r) => !ativos.has(r.user_id));
  }

  if (segmento === "aniversariantes") {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
      month: "2-digit",
    });
    const mesAtual = fmt.format(new Date());
    rows = rows.filter((r) => r.birthdate && r.birthdate.slice(5, 7) === mesAtual);
  }

  // (usado, campo birthdate volta como opcional; ok manter na saída)
  return rows as Array<{
    user_id: string;
    pontos: number;
    nivel: string;
    full_name: string | null;
    phone: string | null;
    birthdate: string | null;
  }>;
}

export async function processarEnvioCampanha(
  campaignId: string,
): Promise<{ enviados: number; falhas: number; total: number }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { formatBrazilPhone, sendWhatsappRaw } = await import("./notify.server");
  const camp = await supabaseAdmin
    .from("campaigns")
    .select("*, stores:store_id(nome_fantasia, whatsapp_enabled)")
    .eq("id", campaignId)
    .maybeSingle();
  if (!camp.data) throw new Error("Campanha não encontrada.");
  const loja = camp.data.stores as unknown as {
    nome_fantasia: string;
    whatsapp_enabled: boolean;
  };
  const { getStoreSecrets } = await import("./store-secrets.server");
  const secrets = await getStoreSecrets(camp.data.store_id);
  if (!secrets.evolution_url || !secrets.evolution_apikey || !secrets.evolution_instance) {
    await supabaseAdmin.from("campaigns").update({ status: "falhou" }).eq("id", camp.data.id);
    throw new Error("Evolution API não configurada nesta loja.");
  }

  await supabaseAdmin.from("campaigns").update({ status: "enviando" }).eq("id", camp.data.id);
  const destinatarios = await selecionarDestinatarios(
    camp.data.store_id,
    camp.data.segmento as SegmentoTipo,
  );

  let enviados = 0;
  let falhas = 0;
  for (const d of destinatarios) {
    const numero = formatBrazilPhone(d.phone);
    const texto = renderMsg(camp.data.mensagem, {
      nome: d.full_name ?? "cliente",
      pontos: d.pontos,
      nivel: d.nivel,
      loja: loja.nome_fantasia,
    });
    if (!numero) {
      await supabaseAdmin.from("campaign_recipients").insert({
        campaign_id: camp.data.id,
        client_user_id: d.user_id,
        telefone: d.phone,
        mensagem_render: texto,
        status: "falha",
        erro: "telefone inválido",
      });
      falhas++;
      continue;
    }
    const res = await sendWhatsappRaw({
      storeId: camp.data.store_id,
      url: secrets.evolution_url,
      apikey: secrets.evolution_apikey,
      instance: secrets.evolution_instance,
      number: numero,
      text: texto,
    });
    if (res.ok) {
      enviados++;
      await supabaseAdmin.from("campaign_recipients").insert({
        campaign_id: camp.data.id,
        client_user_id: d.user_id,
        telefone: numero,
        mensagem_render: texto,
        status: "enviado",
        enviado_em: new Date().toISOString(),
      });
    } else {
      falhas++;
      await supabaseAdmin.from("campaign_recipients").insert({
        campaign_id: camp.data.id,
        client_user_id: d.user_id,
        telefone: numero,
        mensagem_render: texto,
        status: "falha",
        erro: res.error ?? "erro",
      });
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  await supabaseAdmin
    .from("campaigns")
    .update({
      status: "concluida",
      total_enviados: enviados,
      total_falhas: falhas,
      total_destinatarios: destinatarios.length,
      enviado_em: new Date().toISOString(),
    })
    .eq("id", camp.data.id);

  return { enviados, falhas, total: destinatarios.length };
}
