import { formatDate } from "@/lib/loyalty-shared";

export type TxRow = {
  id: string;
  tipo: string;
  valor: number | string;
  pontos_delta: number;
  cashback_delta: number | string;
  created_at: string;
  origem: string | null;
  products?: { nome: string | null } | null;
};

export type VoucherTx = TxRow & {
  status?: string | null;
  voucher_code?: string | null;
  voucher_expires_at?: string | null;
  delivered_at?: string | null;
};

export type IgSub = {
  id: string;
  post_url: string;
  status: string;
  points_awarded: number;
  cashback_awarded?: number;
  rejection_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
  verify_after: string | null;
  client_note: string | null;
};

export function describeTx(t: TxRow) {
  const prd = t.products?.nome;
  const ajusteMotivo =
    t.tipo === "ajuste" && t.origem?.startsWith("ajuste_manual:")
      ? t.origem.slice("ajuste_manual:".length)
      : null;
  switch (t.tipo) {
    case "venda":
      return "Compra na loja";
    case "resgate_produto":
      return `Resgate: ${prd ?? "produto"}`;
    case "resgate_cashback":
      return "Voucher de cashback";
    case "vale_presente":
      return "Vale-presente";
    case "nota_fiscal":
      return "Nota fiscal aprovada";
    case "indicacao":
      return "Bônus de indicação";
    case "expiracao":
      return t.origem?.startsWith("expiracao_decaimento")
        ? "Decaimento periódico de pontos"
        : "Pontos expirados";
    case "ajuste":
      return ajusteMotivo
        ? `Ajuste da loja: ${ajusteMotivo}`
        : t.pontos_delta >= 0
          ? "Ajuste da loja (crédito)"
          : "Ajuste da loja (estorno)";
    default:
      return "Movimentação";
  }
}

export function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return formatDate(iso);
  }
}
