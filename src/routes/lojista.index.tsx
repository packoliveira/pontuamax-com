import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { formatBRL } from "@/lib/qsf-shared";
import { myStoreQuery, storeClientsQuery, storeTransactionsQuery } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Coins, Wallet, Gift, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/lojista/")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const { data: loja, isLoading } = useQuery(myStoreQuery());
  const { data: clientes = [] } = useQuery(storeClientsQuery(loja?.id));
  const { data: txs = [] } = useQuery(storeTransactionsQuery(loja?.id));

  useEffect(() => {
    if (!isLoading && !loja) navigate({ to: "/lojista/onboarding" });
  }, [isLoading, loja, navigate]);

  if (isLoading) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;
  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Redirecionando para o onboarding...</div>;

  const inicioMes = new Date();
  inicioMes.setDate(1); inicioMes.setHours(0, 0, 0, 0);
  const txsMes = txs.filter((t) => new Date(t.created_at) >= inicioMes && t.tipo === "venda");
  const pontosMes = txsMes.reduce((a, t) => a + (t.pontos_delta ?? 0), 0);
  const cashbackMes = txsMes.reduce((a, t) => a + Number(t.cashback_delta ?? 0), 0);
  const pendentes = txs.filter((t) => t.tipo !== "venda" && t.status === "pendente").length;

  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";

  const stats = [
    { label: "Clientes", value: clientes.length, icon: Users, show: true },
    { label: "Pontos no mês", value: pontosMes.toLocaleString("pt-BR"), icon: Coins, show: inclP },
    { label: "Cashback do mês", value: formatBRL(cashbackMes), icon: Wallet, show: inclC },
    { label: "Resgates pendentes", value: pendentes, icon: Gift, show: true },
  ].filter((s) => s.show);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Olá, {loja.nome_fantasia}</h1>
          <p className="text-sm text-muted-foreground">Sua página: <span className="font-mono">qsfclub.com/{loja.slug}</span></p>
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
                const nomeCli = (t.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "—";
                return (
                  <li key={t.id} className="flex items-center justify-between py-3 text-sm">
                    <div>
                      <div className="font-medium">{nomeCli}</div>
                      <div className="text-xs text-muted-foreground">
                        {t.tipo === "venda" ? "Compra" : t.tipo === "resgate_produto" ? "Resgate de produto" : "Voucher de cashback"}
                      </div>
                    </div>
                    <div className="text-right">
                      {t.tipo === "venda" && <div className="font-semibold">{formatBRL(Number(t.valor))}</div>}
                      {t.pontos_delta ? <div className={`text-xs ${t.pontos_delta > 0 ? "text-muted-foreground" : "text-destructive"}`}>{t.pontos_delta > 0 ? "+" : ""}{t.pontos_delta} pts</div> : null}
                      {Number(t.cashback_delta) ? <div className={`text-xs ${Number(t.cashback_delta) > 0 ? "text-muted-foreground" : "text-destructive"}`}>{Number(t.cashback_delta) > 0 ? "+" : ""}{formatBRL(Number(t.cashback_delta))}</div> : null}
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