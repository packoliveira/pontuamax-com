import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { formatBRL } from "@/lib/qsf-shared";
import { myStoreQuery, storeClientsQuery, storeTransactionsQuery } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  Coins,
  Wallet,
  Gift,
  ArrowRight,
  ShoppingCart,
  Package,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
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
  if (!loja)
    return (
      <div className="p-6 text-sm text-muted-foreground">Redirecionando para o onboarding...</div>
    );

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const txsMes = txs.filter((t) => new Date(t.created_at) >= inicioMes && t.tipo === "venda");
  const pontosMes = txsMes.reduce((a, t) => a + (t.pontos_delta ?? 0), 0);
  const cashbackMes = txsMes.reduce((a, t) => a + Number(t.cashback_delta ?? 0), 0);
  const pendentes = txs.filter((t) => t.tipo !== "venda" && t.status === "pendente").length;

  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";

  const stats: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    show: boolean;
    hint?: string;
  }[] = [
    {
      label: "Clientes",
      value: clientes.length.toLocaleString("pt-BR"),
      icon: Users,
      show: true,
      hint: "Total cadastrados",
    },
    {
      label: "Pontos no mês",
      value: pontosMes.toLocaleString("pt-BR"),
      icon: Coins,
      show: inclP,
      hint: "Distribuídos",
    },
    {
      label: "Cashback do mês",
      value: formatBRL(cashbackMes),
      icon: Wallet,
      show: inclC,
      hint: "Devolvido a clientes",
    },
    {
      label: "Resgates pendentes",
      value: pendentes,
      icon: Gift,
      show: true,
      hint: "Aguardando validação",
    },
  ].filter((s) => s.show);

  const quickActions: { to: string; label: string; icon: LucideIcon }[] = [
    { to: "/lojista/clientes", label: "Clientes", icon: Users },
    { to: "/lojista/produtos", label: "Produtos", icon: Package },
    { to: "/lojista/resgates", label: "Resgates", icon: Gift },
    { to: "/lojista/campanhas", label: "Campanhas", icon: Megaphone },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Dashboard
          </div>
          <h1 className="mt-1 truncate text-2xl font-bold text-[#0F172A] md:text-3xl">
            Olá, {loja.nome_fantasia}
          </h1>
          <p className="mt-1 truncate text-sm text-[#64748B]">
            Sua página:{" "}
            <span className="font-mono text-[#0F172A]">pontuamax.com.br/{loja.slug}</span>
          </p>
        </div>
        <Link to="/lojista/lancar-venda">
          <Button
            size="lg"
            className="shrink-0 rounded-xl bg-[#2563EB] text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            <ShoppingCart className="h-4 w-4" /> Lançar venda
          </Button>
        </Link>
      </div>

      {/* Métricas */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    {s.label}
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-[#0F172A]">{s.value}</div>
                {s.hint && <div className="mt-1 text-xs text-[#64748B]">{s.hint}</div>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Ações rápidas */}
      <div>
        <div className="mb-3 text-sm font-semibold text-[#0F172A]">Ações rápidas</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to as "/lojista/clientes"}
                className="group flex items-center gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-4 transition duration-200 hover:-translate-y-0.5 hover:border-[#2563EB]/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#2563EB] transition group-hover:bg-[#2563EB]/10">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-sm font-medium text-[#0F172A]">{a.label}</div>
                <ArrowRight className="h-4 w-4 text-[#94A3B8] transition group-hover:translate-x-0.5 group-hover:text-[#2563EB]" />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Últimas transações */}
      <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-[#0F172A]">Últimas transações</div>
            <Link
              to="/lojista/clientes"
              className="text-xs font-medium text-[#2563EB] hover:underline"
            >
              Ver clientes
            </Link>
          </div>
          {txs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#94A3B8] shadow-sm">
                <Coins className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm text-[#64748B]">Nenhuma transação ainda.</p>
              <Link to="/lojista/lancar-venda">
                <Button
                  variant="outline"
                  className="mt-4 rounded-xl border-[#E5E7EB] text-[#2563EB] hover:bg-[#2563EB]/5"
                >
                  Lançar primeira venda
                </Button>
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-[#F1F5F9]">
              {txs.slice(0, 8).map((t) => {
                const nomeCli =
                  (t.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "—";
                const tipoLabel =
                  t.tipo === "venda"
                    ? "Compra"
                    : t.tipo === "resgate_produto"
                      ? "Resgate de produto"
                      : "Voucher de cashback";
                const initials =
                  nomeCli
                    .split(" ")
                    .map((p) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "—";
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#0F172A]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-[#0F172A]">{nomeCli}</div>
                        <div className="text-xs text-[#64748B]">{tipoLabel}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {t.tipo === "venda" && (
                        <div className="font-semibold text-[#0F172A]">
                          {formatBRL(Number(t.valor))}
                        </div>
                      )}
                      {t.pontos_delta ? (
                        <div
                          className={`text-xs font-medium ${t.pontos_delta > 0 ? "text-[#16A34A]" : "text-[#EF4444]"}`}
                        >
                          {t.pontos_delta > 0 ? "+" : ""}
                          {t.pontos_delta} pts
                        </div>
                      ) : null}
                      {Number(t.cashback_delta) ? (
                        <div
                          className={`text-xs font-medium ${Number(t.cashback_delta) > 0 ? "text-[#16A34A]" : "text-[#EF4444]"}`}
                        >
                          {Number(t.cashback_delta) > 0 ? "+" : ""}
                          {formatBRL(Number(t.cashback_delta))}
                        </div>
                      ) : null}
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
