import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeTransactionsQuery } from "@/lib/queries";
import { confirmarResgate } from "@/lib/qsf.functions";
import { formatBRL, formatDate } from "@/lib/qsf-shared";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Gift, Wallet } from "lucide-react";
import { toast } from "sonner";

type TxRow = Tables<"transactions"> & {
  profiles: { full_name: string | null } | null;
  products: { nome: string | null } | null;
};

export const Route = createFileRoute("/lojista/resgates")({
  ssr: false,
  component: ResgatesPage,
});

function ResgatesPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: txs = [] } = useQuery(storeTransactionsQuery(loja?.id));

  const confirmar = useMutation({
    mutationFn: (id: string) => confirmarResgate({ data: { transaction_id: id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["transactions", loja?.id] }),
  });

  const resgates = txs.filter((t) => t.tipo !== "venda") as unknown as TxRow[];
  const pendentes = resgates.filter((r) => r.status === "pendente");
  const entregues = resgates.filter((r) => r.status === "entregue");

  const Row = ({ r }: { r: TxRow }) => {
    const nomeCli = r.profiles?.full_name ?? "—";
    const isProduto = r.tipo === "resgate_produto";
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-md ${isProduto ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}>
            {isProduto ? <Gift className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
          </div>
          <div>
            <div className="font-medium">{nomeCli}</div>
            <div className="text-sm text-muted-foreground">
              {isProduto
                ? `${r.products?.nome ?? "Produto"} • ${Math.abs(r.pontos_delta)} pts`
                : `Voucher de cashback • ${formatBRL(Math.abs(Number(r.cashback_delta)))}`}
            </div>
            <div className="text-xs font-mono mt-1">{r.voucher_code}</div>
            <div className="text-xs text-muted-foreground">{formatDate(r.created_at)}</div>
          </div>
        </div>
        {r.status === "pendente" ? (
          <Button size="sm" onClick={() => confirmar.mutate(r.id, { onSuccess: () => toast.success("Confirmado") })}>
            <CheckCircle2 className="h-4 w-4" /> Confirmar entrega
          </Button>
        ) : (
          <Badge variant="secondary">Entregue</Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resgates</h1>
        <p className="text-sm text-muted-foreground">Confirme a entrega dos vouchers apresentados</p>
      </div>
      <section>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Pendentes ({pendentes.length})</h2>
        <Card><CardContent className="p-0"><div className="divide-y">
          {pendentes.map((r) => <Row key={r.id} r={r} />)}
          {pendentes.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem resgates pendentes</div>}
        </div></CardContent></Card>
      </section>
      {entregues.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Histórico</h2>
          <Card><CardContent className="p-0"><div className="divide-y">
            {entregues.map((r) => <Row key={r.id} r={r} />)}
          </div></CardContent></Card>
        </section>
      )}
    </div>
  );
}