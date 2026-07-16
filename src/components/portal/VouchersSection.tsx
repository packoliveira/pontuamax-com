import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Wallet,
  Ticket,
  Gift,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  X,
  Printer,
} from "lucide-react";
import { formatBRL } from "@/lib/qsf-shared";
import type { StorePublic } from "@/lib/queries";
import { type VoucherTx, formatDateTime } from "./portal-types";

type Loja = StorePublic;

function VoucherStatusBadge({ status }: { status: string }) {
  if (status === "pendente")
    return (
      <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white">
        <Clock className="h-3 w-3 mr-1" /> Pendente
      </Badge>
    );
  if (status === "entregue")
    return (
      <Badge className="bg-blue-600 hover:bg-blue-600 text-white">
        <CheckCircle2 className="h-3 w-3 mr-1" /> Utilizado
      </Badge>
    );
  if (status === "expirado")
    return (
      <Badge className="bg-orange-500 hover:bg-orange-500 text-white">
        <AlertTriangle className="h-3 w-3 mr-1" /> Expirado
      </Badge>
    );
  if (status === "cancelado")
    return (
      <Badge className="bg-red-600 hover:bg-red-600 text-white">
        <X className="h-3 w-3 mr-1" /> Cancelado
      </Badge>
    );
  return <Badge variant="secondary">{status}</Badge>;
}

function VoucherRow({ t, onOpen }: { t: VoucherTx; onOpen: () => void }) {
  const isProduto = t.tipo === "resgate_produto";
  const detalhe = isProduto
    ? `${t.products?.nome ?? "Produto"} • ${Math.abs(t.pontos_delta)} pts`
    : `Cashback • ${formatBRL(Math.abs(Number(t.cashback_delta)))}`;
  const status = t.status ?? "pendente";
  return (
    <div className="flex items-start justify-between gap-3 p-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {isProduto ? (
            <Gift className="h-4 w-4 text-violet-600 shrink-0" />
          ) : (
            <Wallet className="h-4 w-4 text-green-600 shrink-0" />
          )}
          <div className="text-sm font-medium truncate">{detalhe}</div>
        </div>
        {t.voucher_code && (
          <div className="mt-1 inline-block select-all rounded-md bg-slate-900 text-white border border-slate-700 px-2 py-0.5 text-sm font-mono font-bold tracking-widest">
            {t.voucher_code}
          </div>
        )}
        <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap gap-x-2">
          <span>{formatDateTime(t.created_at)}</span>
          {status === "pendente" && t.voucher_expires_at && (
            <span>Válido até {formatDateTime(t.voucher_expires_at)}</span>
          )}
          {status === "entregue" && t.delivered_at && (
            <span className="text-green-700">Utilizado em {formatDateTime(t.delivered_at)}</span>
          )}
          {status === "expirado" && t.voucher_expires_at && (
            <span className="text-orange-700">
              Expirou em {formatDateTime(t.voucher_expires_at)}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2 shrink-0">
        <VoucherStatusBadge status={status} />
        <Button size="sm" variant="outline" onClick={onOpen}>
          {status === "entregue" ? "Comprovante" : "Ver"}
        </Button>
      </div>
    </div>
  );
}

export function VouchersSection({
  loja,
  txs,
  nome,
  telefone,
}: {
  loja: Loja;
  txs: unknown[];
  nome: string;
  telefone: string | null;
}) {
  const mostrarUsados = loja.voucher_visivel_apos_uso ?? false;
  const mostrarExpirados = loja.voucher_mostrar_expirados ?? true;
  const list = (txs as VoucherTx[])
    .filter((t) => t.tipo === "resgate_produto" || t.tipo === "resgate_cashback")
    .filter((t) => {
      const s = t.status ?? "pendente";
      if (s === "entregue" && !mostrarUsados) return false;
      if (s === "expirado" && !mostrarExpirados) return false;
      return true;
    });
  const [selected, setSelected] = useState<VoucherTx | null>(null);

  if (list.length === 0) return null;

  const pendentes = list.filter((t) => t.status === "pendente");
  const utilizados = list.filter((t) => t.status === "entregue");
  const expirados = list.filter((t) => t.status === "expirado");
  const cancelados = list.filter((t) => t.status === "cancelado");

  const renderList = (arr: VoucherTx[]) => (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {arr.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Nenhum voucher aqui</div>
          ) : (
            arr.map((t) => <VoucherRow key={t.id} t={t} onOpen={() => setSelected(t)} />)
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Receipt className="h-4 w-4 text-indigo-400" />
        <h2 className="font-semibold text-slate-100">Meus vouchers</h2>
        <span className="text-xs text-slate-500">códigos e comprovantes</span>
      </div>
      <Tabs defaultValue="todos">
        <TabsList className="w-full">
          <TabsTrigger value="todos" className="flex-1">
            Todos ({list.length})
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="flex-1">
            Pendentes ({pendentes.length})
          </TabsTrigger>
          {utilizados.length > 0 && (
            <TabsTrigger value="utilizados" className="flex-1">
              Utilizados ({utilizados.length})
            </TabsTrigger>
          )}
          {expirados.length > 0 && (
            <TabsTrigger value="expirados" className="flex-1">
              Expirados ({expirados.length})
            </TabsTrigger>
          )}
          {cancelados.length > 0 && (
            <TabsTrigger value="cancelados" className="flex-1">
              Cancelados ({cancelados.length})
            </TabsTrigger>
          )}
        </TabsList>
        <TabsContent value="todos" className="mt-3">
          {renderList(list)}
        </TabsContent>
        <TabsContent value="pendentes" className="mt-3">
          {renderList(pendentes)}
        </TabsContent>
        <TabsContent value="utilizados" className="mt-3">
          {renderList(utilizados)}
        </TabsContent>
        <TabsContent value="expirados" className="mt-3">
          {renderList(expirados)}
        </TabsContent>
        <TabsContent value="cancelados" className="mt-3">
          {renderList(cancelados)}
        </TabsContent>
      </Tabs>

      <Dialog
        open={!!selected}
        onOpenChange={(o) => {
          if (!o) setSelected(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selected?.status === "entregue" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-600" /> Comprovante de resgate
                </>
              ) : (
                <>
                  <Ticket className="h-5 w-5" /> Detalhes do voucher
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div
              id="voucher-print"
              className="space-y-3 text-sm border rounded-md p-4 bg-background"
            >
              <div className="text-center">
                <div className="font-bold text-base">{loja.nome_fantasia}</div>
                <div className="text-xs text-muted-foreground">
                  {selected.status === "entregue" ? "Comprovante de entrega" : "Voucher de resgate"}
                </div>
              </div>
              {selected.voucher_code && (
                <div
                  className="select-all text-center text-2xl font-mono font-black tracking-widest py-3 px-2 rounded-md break-all bg-slate-900 text-white border-2 border-slate-700"
                  aria-label="Código do voucher"
                >
                  {selected.voucher_code}
                </div>
              )}
              <div className="border-t pt-2 grid grid-cols-[110px_1fr] gap-y-1">
                <span className="text-muted-foreground">Cliente</span>
                <span className="font-medium">{nome}</span>
                {telefone && (
                  <>
                    <span className="text-muted-foreground">Telefone</span>
                    <span>{telefone}</span>
                  </>
                )}
                <span className="text-muted-foreground">Gerado em</span>
                <span>{formatDateTime(selected.created_at)}</span>
                {selected.status === "entregue" && selected.delivered_at && (
                  <>
                    <span className="text-muted-foreground">Entregue em</span>
                    <span>{formatDateTime(selected.delivered_at)}</span>
                  </>
                )}
                {selected.status === "pendente" && selected.voucher_expires_at && (
                  <>
                    <span className="text-muted-foreground">Válido até</span>
                    <span>{formatDateTime(selected.voucher_expires_at)}</span>
                  </>
                )}
                {selected.status === "expirado" && selected.voucher_expires_at && (
                  <>
                    <span className="text-muted-foreground">Expirou em</span>
                    <span>{formatDateTime(selected.voucher_expires_at)}</span>
                  </>
                )}
              </div>
              <div className="border-t pt-2">
                {selected.tipo === "resgate_produto" && (
                  <>
                    <div className="flex justify-between">
                      <span>Produto</span>
                      <span className="font-medium">{selected.products?.nome ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Pontos usados</span>
                      <span className="font-medium">{Math.abs(selected.pontos_delta)} pts</span>
                    </div>
                  </>
                )}
                {selected.tipo === "resgate_cashback" && (
                  <div className="flex justify-between">
                    <span>Cashback aplicado</span>
                    <span className="font-medium">
                      {formatBRL(Math.abs(Number(selected.cashback_delta)))}
                    </span>
                  </div>
                )}
              </div>
              {selected.status === "pendente" && (
                <div className="text-xs text-center text-muted-foreground border-t pt-2">
                  Apresente este código no caixa da loja para retirar seu resgate.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="h-4 w-4 mr-1" /> Imprimir
            </Button>
            <Button onClick={() => setSelected(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}