import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeTransactionsQuery } from "@/lib/queries";
import { confirmarResgate, validarVoucher } from "@/lib/qsf.functions";
import { formatBRL, formatDate } from "@/lib/qsf-shared";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Gift, Wallet, ScanLine, Clock, AlertTriangle } from "lucide-react";
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
  const [codigo, setCodigo] = useState("");

  const confirmar = useMutation({
    mutationFn: (id: string) => confirmarResgate({ data: { transaction_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
    },
  });

  const validar = useMutation({
    mutationFn: (code: string) => validarVoucher({ data: { voucher_code: code } }),
    onSuccess: (r) => {
      const detalhe = r.produto ?? (r.cashback ? `Cashback ${formatBRL(r.cashback)}` : `${r.pontos} pts`);
      toast.success(`Voucher válido — ${r.cliente} · ${detalhe}`);
      setCodigo("");
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const resgates = txs.filter(
    (t) => t.tipo === "resgate_produto" || t.tipo === "resgate_cashback",
  ) as unknown as TxRow[];
  const pendentes = resgates.filter((r) => r.status === "pendente");
  const entregues = resgates.filter((r) => r.status === "entregue");
  const expirados = resgates.filter((r) => r.status === "expirado");

  const tempoRestante = (iso: string | null): { label: string; danger: boolean } | null => {
    if (!iso) return null;
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return { label: "expirado", danger: true };
    const h = Math.floor(ms / 3_600_000);
    if (h < 24) return { label: `${h}h restantes`, danger: h < 12 };
    const d = Math.floor(h / 24);
    return { label: `${d}d restantes`, danger: d < 2 };
  };

  const Row = ({ r }: { r: TxRow }) => {
    const nomeCli = r.profiles?.full_name ?? "—";
    const isProduto = r.tipo === "resgate_produto";
    const tr = tempoRestante(r.voucher_expires_at);
    return (
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`flex h-9 w-9 items-center justify-center rounded-md ${isProduto ? "bg-violet-100 text-violet-700" : "bg-green-100 text-green-700"}`}>
            {isProduto ? <Gift className="h-4 w-4" /> : <Wallet className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <div className="font-medium truncate">{nomeCli}</div>
            <div className="text-sm text-muted-foreground">
              {isProduto
                ? `${r.products?.nome ?? "Produto"} • ${Math.abs(r.pontos_delta)} pts`
                : `Voucher de cashback • ${formatBRL(Math.abs(Number(r.cashback_delta)))}`}
            </div>
            <div className="mt-1 inline-block rounded-md bg-primary/10 border border-primary/30 px-2 py-1 text-base sm:text-lg font-mono font-bold tracking-widest text-primary">
              {r.voucher_code}
            </div>
            <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-2">
              <span>{formatDate(r.created_at)}</span>
              {tr && r.status === "pendente" && (
                <span className={`inline-flex items-center gap-1 ${tr.danger ? "text-orange-600 font-medium" : ""}`}>
                  <Clock className="h-3 w-3" /> {tr.label}
                </span>
              )}
            </div>
          </div>
        </div>
        {r.status === "pendente" && (
          <Button size="sm" disabled={confirmar.isPending} onClick={() => confirmar.mutate(r.id, { onSuccess: () => toast.success("Voucher entregue") })}>
            <CheckCircle2 className="h-4 w-4 mr-1" /> Entregar
          </Button>
        )}
        {r.status === "entregue" && <Badge variant="secondary">Entregue</Badge>}
        {r.status === "expirado" && <Badge variant="outline" className="text-orange-600 border-orange-300">Expirado</Badge>}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Resgates</h1>
        <p className="text-sm text-muted-foreground">Valide o voucher do cliente pelo código ou pela lista abaixo</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><ScanLine className="h-4 w-4" /> Validar voucher</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!codigo.trim()) return;
              validar.mutate(codigo.trim().toUpperCase());
            }}
            className="flex flex-col sm:flex-row gap-2"
          >
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="QSF-XXXX-XXXX"
              className="font-mono uppercase"
              autoComplete="off"
            />
            <Button type="submit" disabled={validar.isPending || !codigo.trim()}>
              {validar.isPending ? "Validando..." : "Validar e entregar"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            Digite o código do voucher apresentado pelo cliente. Vouchers vencem em {loja?.voucher_validade_dias ?? 7} dias — depois disso o saldo volta pro cliente automaticamente.
          </p>
        </CardContent>
      </Card>

      <section>
        <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Pendentes ({pendentes.length})</h2>
        <Card><CardContent className="p-0"><div className="divide-y">
          {pendentes.map((r) => <Row key={r.id} r={r} />)}
          {pendentes.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem resgates pendentes</div>}
        </div></CardContent></Card>
      </section>
      {expirados.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground flex items-center gap-1">
            <AlertTriangle className="h-3.5 w-3.5 text-orange-600" /> Expirados ({expirados.length})
          </h2>
          <Card><CardContent className="p-0"><div className="divide-y">
            {expirados.slice(0, 20).map((r) => <Row key={r.id} r={r} />)}
          </div></CardContent></Card>
        </section>
      )}
      {entregues.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Histórico</h2>
          <Card><CardContent className="p-0"><div className="divide-y">
            {entregues.slice(0, 30).map((r) => <Row key={r.id} r={r} />)}
          </div></CardContent></Card>
        </section>
      )}
    </div>
  );
}