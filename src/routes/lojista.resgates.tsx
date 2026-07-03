import { createFileRoute } from "@tanstack/react-router";
import { useStore, formatBRL, formatDate, type Resgate } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Gift, Wallet } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lojista/resgates")({
  ssr: false,
  component: ResgatesPage,
});

function ResgatesPage() {
  const lojaId = useStore((s) => s.authedLojaId)!;
  const resgates = useStore((s) => s.resgates.filter((r) => r.loja_id === lojaId));
  const clientes = useStore((s) => s.clientes);
  const produtos = useStore((s) => s.produtos);
  const confirmar = useStore((s) => s.confirmarResgate);

  const pendentes = resgates.filter((r) => r.status === "pendente");
  const entregues = resgates.filter((r) => r.status === "entregue");

  const Row = ({ r }: { r: Resgate }) => {
    const cli = clientes.find((c) => c.id === r.cliente_id);
    const prd = r.produto_id ? produtos.find((p) => p.id === r.produto_id) : null;
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-start gap-3">
          <div className={`flex h-9 w-9 items-center justify-center rounded-md ${r.tipo === "produto" ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}>
            {r.tipo === "produto" ? <Gift className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
          </div>
          <div>
            <div className="font-medium">{cli?.nome ?? "—"}</div>
            <div className="text-sm text-muted-foreground">
              {r.tipo === "produto" ? `${prd?.nome ?? "Produto"} • ${r.valor_usado} pts` : `Voucher de cashback • ${formatBRL(r.valor_usado)}`}
            </div>
            <div className="text-xs font-mono mt-1">{r.codigo_voucher}</div>
            <div className="text-xs text-muted-foreground">{formatDate(r.created_at)}</div>
          </div>
        </div>
        {r.status === "pendente" ? (
          <Button size="sm" onClick={() => { confirmar(r.id); toast.success("Confirmado"); }}>
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