// Pure helpers for the Olist/Bling/Tiny public webhook.
// Extraídos do route handler para permitir testes unitários sem mockar
// Supabase. Nenhuma dependência de I/O aqui.

export type OlistExtracted = {
  idVenda: string;
  valor: number;
  cpf: string;
  telefone: string;
  nome: string;
  tipoEvento: string;
};

export function extractOlistPayload(p: Record<string, unknown>): OlistExtracted {
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

// Só creditamos pontos/cashback para "faturamento_pedido" da Olist —
// as demais notificações (inclusao_pedido, alteracao_pedido, etc.) chegam
// antes do pedido virar venda efetivada e não devem gerar transação.
// Payloads sem tipoEvento (nosso formato simples, Bling, Tiny, testes)
// seguem processando normalmente.
export const OLIST_PROCESSABLE_EVENT = "faturamento_pedido";

export function shouldProcessOlistEvent(
  origem: string,
  tipoEvento: string,
): { process: boolean; reason?: string } {
  if (origem !== "olist") return { process: true };
  if (!tipoEvento) return { process: true };
  if (tipoEvento === OLIST_PROCESSABLE_EVENT) return { process: true };
  return {
    process: false,
    reason: `Notificação Olist "${tipoEvento}" ignorada — só processamos "${OLIST_PROCESSABLE_EVENT}".`,
  };
}

export type RewardStoreConfig = {
  modalidade: "pontos" | "cashback" | "ambos" | string;
  regra_pontos: number | string;
  percentual_cashback: number | string;
};

export type RewardResult = {
  pontos: number;
  cashback: number;
  nivel: "bronze" | "prata" | "ouro";
  novoPontos: number;
  novoCashback: number;
};

// Fórmula idêntica à usada no handler — pontos truncam via floor, cashback
// arredonda 2 casas (base em centavos para evitar erro de ponto flutuante).
export function computeRewards(
  valor: number,
  loja: RewardStoreConfig,
  saldoAtualPontos: number,
  saldoAtualCashback: number,
): RewardResult {
  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";
  const pontos = inclP ? Math.floor(valor * Number(loja.regra_pontos)) : 0;
  const cashback = inclC ? Math.round(valor * Number(loja.percentual_cashback)) / 100 : 0;
  const novoPontos = saldoAtualPontos + pontos;
  const novoCashback = Math.round((Number(saldoAtualCashback) + cashback) * 100) / 100;
  const nivel = novoPontos <= 100 ? "bronze" : novoPontos <= 300 ? "prata" : "ouro";
  return { pontos, cashback, nivel, novoPontos, novoCashback };
}