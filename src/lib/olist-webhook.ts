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

// Aceitamos qualquer tipo de evento — o gate real é o valor total.
// Se a notificação vier com valor > 0, credita pontos/cashback.
// Se não vier, o cliente entra como "pendente" (sem transação) e a
// próxima notificação do mesmo pedido que trouxer o total credita.
// Idempotência por id_venda_externa evita crédito duplicado.
export function shouldProcessOlistEvent(
  _origem: string,
  _tipoEvento: string,
): { process: boolean; reason?: string } {
  return { process: true };
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