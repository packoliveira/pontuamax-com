import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { storeTransactionsQuery } from "@/lib/queries";
import { useEmployeeContext } from "@/hooks/use-employee-context";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldOff } from "lucide-react";

export const Route = createFileRoute("/funcionario/historico")({
  ssr: false,
  component: Historico,
});

function Historico() {
  const { hasPermission } = useEmployeeContext();
  const { data: ctx } = useQuery(myEmployeeContextQuery());
  const { data: txs = [] } = useQuery(storeTransactionsQuery(ctx?.store?.id));
  if (!hasPermission("historico.consultar")) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 text-red-600 grid place-items-center">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">Sem permissão</h2>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <PageHeader title="Histórico" />
      <Card className="rounded-2xl border-border">
        <CardContent className="p-0">
          <div className="divide-y divide-border">
            {(txs as any[]).length === 0 ? (
              <div className="p-10 text-center text-sm text-muted-foreground">Sem transações ainda.</div>
            ) : (
              (txs as any[]).map((t) => (
                <div key={t.id} className="p-3 flex items-center gap-3 text-sm">
                  <div className="text-[11px] text-muted-foreground w-32 shrink-0">
                    {new Date(t.created_at).toLocaleString("pt-BR")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-foreground">{t.tipo}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {t.profiles?.full_name ?? "—"}
                    </div>
                  </div>
                  <Badge variant="secondary" className="rounded-full">
                    {t.pontos_delta ? `${t.pontos_delta > 0 ? "+" : ""}${t.pontos_delta} pts` : ""}
                    {t.cashback_delta
                      ? ` ${Number(t.cashback_delta) > 0 ? "+" : ""}R$ ${Number(t.cashback_delta).toFixed(2)}`
                      : ""}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
