import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeTransactionsQuery } from "@/lib/queries";
import { confirmarResgate, validarVoucher, cancelarVoucher } from "@/lib/qsf.functions";
import { formatBRL, formatDate } from "@/lib/qsf-shared";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Gift, Wallet, ScanLine, Clock, AlertTriangle, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

type TxRow = Tables<"transactions"> & {
  profiles: { full_name: string | null } | null;
  products: { nome: string | null } | null;
};

type Comprovante = {
  transaction_id: string;
  voucher_code: string | null;
  tipo: string;
  delivered_at: string;
  loja: string | null;
  cliente: string;
  cliente_telefone: string | null;
  produto: string | null;
  pontos_usados: number;
  cashback_aplicado: number;
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
  const [comprovante, setComprovante] = useState<Comprovante | null>(null);

  const confirmar = useMutation({
    mutationFn: (id: string) => confirmarResgate({ data: { transaction_id: id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      if (r?.comprovante) setComprovante(r.comprovante as Comprovante);
    },
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarVoucher({ data: { transaction_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      toast.success("Voucher cancelado — saldo devolvido ao cliente.");
    },
    onError: (e) => toast.error((e as Error).message),
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
  const utilizados = resgates.filter((r) => r.status === "entregue");
  const expirados = resgates.filter((r) => r.status === "expirado");
  const cancelados = resgates.filter((r) => r.status === "cancelado");

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
            <div className="mt-1 inline-block select-all rounded-md bg-slate-900 text-white border border-slate-700 px-2 py-1 text-base sm:text-lg font-mono font-bold tracking-widest">
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
          <div className="flex flex-col gap-1">
            <Button size="sm" disabled={confirmar.isPending} onClick={() => confirmar.mutate(r.id, { onSuccess: () => toast.success("Voucher utilizado — comprovante gerado") })}>
              <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar entrega
            </Button>
            <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700" disabled={cancelar.isPending}
              onClick={() => { if (confirm("Cancelar este voucher e devolver o saldo ao cliente?")) cancelar.mutate(r.id); }}>
              Cancelar
            </Button>
          </div>
        )}
        {r.status === "entregue" && <Badge className="bg-blue-600 hover:bg-blue-600 text-white">Utilizado</Badge>}
        {r.status === "expirado" && <Badge className="bg-orange-500 hover:bg-orange-500 text-white">Expirado</Badge>}
        {r.status === "cancelado" && <Badge className="bg-red-600 hover:bg-red-600 text-white">Cancelado</Badge>}
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
      {utilizados.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Utilizados ({utilizados.length})</h2>
          <Card><CardContent className="p-0"><div className="divide-y">
            {utilizados.slice(0, 30).map((r) => <Row key={r.id} r={r} />)}
          </div></CardContent></Card>
        </section>
      )}
      {cancelados.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-2 text-muted-foreground">Cancelados ({cancelados.length})</h2>
          <Card><CardContent className="p-0"><div className="divide-y">
            {cancelados.slice(0, 20).map((r) => <Row key={r.id} r={r} />)}
          </div></CardContent></Card>
        </section>
      )}

      <Dialog open={!!comprovante} onOpenChange={(o) => { if (!o) setComprovante(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" /> Comprovante de resgate
            </DialogTitle>
          </DialogHeader>
          {comprovante && (
            <div id="comprovante-print" className="space-y-3 text-sm border rounded-md p-4 bg-background">
              <div className="text-center">
                <div className="font-bold text-base">{comprovante.loja ?? "Loja"}</div>
                <div className="text-xs text-muted-foreground">Comprovante de entrega</div>
              </div>
              <div className="border-t pt-2 grid grid-cols-[110px_1fr] gap-y-1">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{comprovante.cliente}</span>
                {comprovante.cliente_telefone && (<>
                  <span className="text-muted-foreground">Telefone</span>
                  <span>{comprovante.cliente_telefone}</span>
                </>)}
                <span className="text-muted-foreground">Voucher</span>
                <span className="font-mono font-bold">{comprovante.voucher_code ?? "—"}</span>
                <span className="text-muted-foreground">Entregue em</span>
                <span>{new Date(comprovante.delivered_at).toLocaleString("pt-BR")}</span>
              </div>
              <div className="border-t pt-2">
                {comprovante.produto && (
                  <div className="flex justify-between">
                    <span>Produto resgatado</span>
                    <span className="font-medium">{comprovante.produto}</span>
                  </div>
                )}
                {comprovante.pontos_usados > 0 && (
                  <div className="flex justify-between">
                    <span>Pontos usados</span>
                    <span className="font-medium">{comprovante.pontos_usados} pts</span>
                  </div>
                )}
                {comprovante.cashback_aplicado > 0 && (
                  <div className="flex justify-between">
                    <span>Cashback aplicado</span>
                    <span className="font-medium">{formatBRL(comprovante.cashback_aplicado)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button onClick={() => setComprovante(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}