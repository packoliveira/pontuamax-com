import { createFileRoute, Link } from "@tanstack/react-router";
import { useStore, formatBRL } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Coins, Wallet, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lojista/")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const lojaId = useStore((s) => s.authedLojaId);
  const loja = useStore((s) => s.lojas.find((l) => l.id === lojaId));
  const clientes = useStore((s) => s.clientes.filter((c) => c.loja_id === lojaId));
  const txs = useStore((s) => s.transacoes.filter((t) => t.loja_id === lojaId));
  const resgates = useStore((s) => s.resgates.filter((r) => r.loja_id === lojaId));

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const txsMes = txs.filter((t) => new Date(t.created_at) >= inicioMes);
  const pontosMes = txsMes.reduce((a, t) => a + (t.pontos_gerados ?? 0), 0);
  const cashbackMes = txsMes.reduce((a, t) => a + (t.cashback_gerado ?? 0), 0);
  const pendentes = resgates.filter((r) => r.status === "pendente").length;

  const inclPontos = loja?.modalidade === "pontos" || loja?.modalidade === "ambos";
  const inclCashback = loja?.modalidade === "cashback" || loja?.modalidade === "ambos";

  const stats = [
    { label: "Clientes", value: clientes.length, icon: Users, show: true },
    { label: "Pontos no mês", value: pontosMes.toLocaleString("pt-BR"), icon: Coins, show: inclPontos },
    { label: "Cashback do mês", value: formatBRL(cashbackMes), icon: Wallet, show: inclCashback },
    { label: "Resgates pendentes", value: pendentes, icon: Gift, show: true },
  ].filter((s) => s.show);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Olá, {loja?.nome}</h1>
          <p className="text-sm text-muted-foreground">Sua página: <span className="font-mono">qsfclub.com/{loja?.slug}</span></p>
        </div>
        <Link to="/lojista/lancar-venda">
          <Button>Lançar venda <ArrowRight className="h-4 w-4" /></Button>
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{s.value}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Últimas transações</CardTitle></CardHeader>
        <CardContent>
          {txs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma transação ainda.</p>
          ) : (
            <ul className="divide-y">
              {txs.slice(0, 8).map((t) => {
                const cli = clientes.find((c) => c.id === t.cliente_id);
                return (
                  <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-medium">{cli?.nome ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{t.descricao}</div>
                    </div>
                    <div className="text-right">
                      {t.valor_compra != null && <div className="font-semibold">{formatBRL(t.valor_compra)}</div>}
                      {(t.pontos_gerados || t.cashback_gerado) ? (
                        <div className="text-xs text-muted-foreground">
                          {t.pontos_gerados ? `+${t.pontos_gerados} pts` : ""}
                          {t.pontos_gerados && t.cashback_gerado ? " • " : ""}
                          {t.cashback_gerado ? `+${formatBRL(t.cashback_gerado)}` : ""}
                        </div>
                      ) : null}
                      {t.pontos_usados ? <div className="text-xs text-destructive">-{t.pontos_usados} pts</div> : null}
                      {t.cashback_usado ? <div className="text-xs text-destructive">-{formatBRL(t.cashback_usado)}</div> : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}