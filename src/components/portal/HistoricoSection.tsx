import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import { formatBRL } from "@/lib/loyalty-shared";
import { type TxRow, describeTx, formatDateTime } from "./portal-types";

function TxRowItem({ t }: { t: TxRow }) {
  const isCredit = t.pontos_delta > 0 || Number(t.cashback_delta) > 0;
  return (
    <div className="flex items-start justify-between gap-3 p-3 text-sm hover:bg-indigo-500/5 transition-colors">
      <div className="flex items-start gap-2 min-w-0">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${isCredit ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"}`}
        >
          {isCredit ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
        </div>
        <div className="min-w-0">
          <div className="font-medium truncate text-slate-100">{describeTx(t)}</div>
          <div className="text-xs text-slate-500">{formatDateTime(t.created_at)}</div>
          {t.tipo === "venda" && Number(t.valor) > 0 && (
            <div className="text-xs text-slate-500">Compra de {formatBRL(Number(t.valor))}</div>
          )}
        </div>
      </div>
      <div className="text-right text-xs shrink-0">
        {t.pontos_delta ? (
          <div
            className={
              t.pontos_delta > 0 ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"
            }
          >
            {t.pontos_delta > 0 ? "+" : ""}
            {t.pontos_delta} pts
          </div>
        ) : null}
        {Number(t.cashback_delta) ? (
          <div
            className={
              Number(t.cashback_delta) > 0
                ? "text-emerald-400 font-semibold"
                : "text-rose-400 font-semibold"
            }
          >
            {Number(t.cashback_delta) > 0 ? "+" : ""}
            {formatBRL(Number(t.cashback_delta))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function HistoricoSection({
  txs,
  inclP,
  inclC,
}: {
  txs: unknown[];
  inclP: boolean;
  inclC: boolean;
}) {
  const list = txs as TxRow[];
  const ganhos = list.filter((t) => t.pontos_delta > 0 || Number(t.cashback_delta) > 0);
  const resgates = list.filter(
    (t) =>
      t.tipo === "resgate_produto" || t.tipo === "resgate_cashback" || t.tipo === "vale_presente",
  );
  const ajustes = list.filter((t) => t.tipo === "ajuste");

  const renderList = (arr: TxRow[]) => (
    <Card className="border-indigo-500/15 bg-[#141432]/60">
      <CardContent className="p-0">
        <div className="divide-y divide-indigo-500/10">
          {arr.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500">Sem movimentações</div>
          ) : (
            arr.map((t) => <TxRowItem key={t.id} t={t} />)
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="h-4 w-4 text-indigo-400" />
        <h2 className="font-semibold text-slate-100">Histórico</h2>
        <span className="text-xs text-slate-500">acompanhe seu saldo</span>
      </div>
      <Tabs defaultValue="todos">
        <TabsList className="w-full">
          <TabsTrigger value="todos" className="flex-1">
            Tudo
          </TabsTrigger>
          {(inclP || inclC) && (
            <TabsTrigger value="ganhos" className="flex-1">
              Ganhos
            </TabsTrigger>
          )}
          <TabsTrigger value="resgates" className="flex-1">
            Resgates
          </TabsTrigger>
          <TabsTrigger value="ajustes" className="flex-1">
            Ajustes
          </TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="mt-3">
          {renderList(list)}
        </TabsContent>
        <TabsContent value="ganhos" className="mt-3">
          {renderList(ganhos)}
        </TabsContent>
        <TabsContent value="resgates" className="mt-3">
          {renderList(resgates)}
        </TabsContent>
        <TabsContent value="ajustes" className="mt-3">
          {renderList(ajustes)}
        </TabsContent>
      </Tabs>
    </section>
  );
}
