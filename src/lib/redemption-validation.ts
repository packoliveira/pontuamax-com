// Validações puras de resgate — reutilizadas pelo cliente para feedback
// imediato. O backend também valida atomicamente via RPC no Postgres.

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validarResgateProduto(params: {
  saldoPontos: number;
  custoPontos: number;
  produtoNome?: string;
  produtoAtivo?: boolean;
}): ValidationResult {
  if (params.produtoAtivo === false) return { ok: false, error: "Produto indisponível." };
  if (params.custoPontos <= 0) return { ok: false, error: "Custo do produto inválido." };
  if (params.saldoPontos < params.custoPontos) {
    const falta = params.custoPontos - params.saldoPontos;
    const nome = params.produtoNome ? ` para trocar por "${params.produtoNome}"` : "";
    return {
      ok: false,
      error: `Pontos insuficientes${nome}. Necessário: ${params.custoPontos} pts. Saldo atual: ${params.saldoPontos} pts. Faltam ${falta} pts.`,
    };
  }
  return { ok: true };
}

export function validarResgateCashback(params: {
  saldoCashback: number;
  valor: number;
  minimoResgate?: number;
}): ValidationResult {
  if (params.valor <= 0) return { ok: false, error: "Valor de cashback inválido." };
  const minimo = params.minimoResgate ?? 0;
  if (minimo > 0 && params.saldoCashback < minimo) {
    return {
      ok: false,
      error: `É preciso acumular pelo menos R$ ${minimo.toFixed(2)} de cashback para resgatar. Saldo atual: R$ ${params.saldoCashback.toFixed(2)}.`,
    };
  }
  if (params.valor > params.saldoCashback) {
    return {
      ok: false,
      error: `Cashback insuficiente. Solicitado: R$ ${params.valor.toFixed(2)}. Saldo disponível: R$ ${params.saldoCashback.toFixed(2)}.`,
    };
  }
  return { ok: true };
}

// Compra combinada: cliente troca por um produto (pontos) e ao mesmo tempo
// usa cashback como desconto. Ambos os saldos precisam cobrir suas parcelas.
export function validarResgateCombinado(params: {
  saldoPontos: number;
  custoPontos: number;
  saldoCashback: number;
  valorCashback: number;
  produtoNome?: string;
  produtoAtivo?: boolean;
}): ValidationResult {
  const p = validarResgateProduto({
    saldoPontos: params.saldoPontos,
    custoPontos: params.custoPontos,
    produtoNome: params.produtoNome,
    produtoAtivo: params.produtoAtivo,
  });
  if (!p.ok) return p;
  const c = validarResgateCashback({
    saldoCashback: params.saldoCashback,
    valor: params.valorCashback,
  });
  if (!c.ok) return c;
  return { ok: true };
}
