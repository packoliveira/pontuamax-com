import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { formatBRL } from "@/lib/qsf-shared";
import { myStoreQuery, storeClientsQuery, storeTransactionsQuery } from "@/lib/queries";
import {
  Users,
  Coins,
  Wallet,
  Gift,
  ShoppingCart,
  Package,
  Megaphone,
  TrendingUp,
  MoreVertical,
  UserPlus,
  QrCode,
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

  type Stat = {
    label: string;
    value: string | number;
    icon: LucideIcon;
    show: boolean;
    hint?: string;
    hintTone?: "growth" | "warn" | "muted";
    iconBg: string;
    iconColor: string;
    suffix?: string;
  };
  const stats: Stat[] = ([
    {
      label: "Clientes",
      value: clientes.length.toLocaleString("pt-BR"),
      icon: Users,
      show: true,
      hint: "Total cadastrados",
      hintTone: "muted",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-600",
    },
    {
      label: "Pontos no mês",
      value: pontosMes.toLocaleString("pt-BR"),
      icon: Coins,
      show: inclP,
      hint: "Distribuídos",
      hintTone: "growth",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-600",
      suffix: "pts",
    },
    {
      label: "Cashback do mês",
      value: formatBRL(cashbackMes),
      icon: Wallet,
      show: inclC,
      hint: "Devolvido a clientes",
      hintTone: "muted",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
    },
    {
      label: "Resgates pendentes",
      value: pendentes,
      icon: Gift,
      show: true,
      hint: "Aguardando validação",
      hintTone: "warn",
      iconBg: "bg-orange-50",
      iconColor: "text-orange-600",
      suffix: "vouchers",
    },
  ] as Stat[]).filter((s) => s.show);

  const quickActions: {
    to: string;
    label: string;
    icon: LucideIcon;
    iconBg: string;
    iconColor: string;
  }[] = [
    {
      to: "/lojista/clientes",
      label: "Novo Cliente",
      icon: UserPlus,
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      to: "/lojista/produtos",
      label: "Gerenciar Produtos",
      icon: Package,
      iconBg: "bg-purple-100",
      iconColor: "text-purple-600",
    },
    {
      to: "/lojista/resgates",
      label: "Validar Resgate",
      icon: QrCode,
      iconBg: "bg-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      to: "/lojista/campanhas",
      label: "Criar Campanha",
      icon: Megaphone,
      iconBg: "bg-orange-100",
      iconColor: "text-orange-600",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
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
        <Link to="/lojista/lancar-venda" className="w-full sm:w-auto">
          <Button
            size="lg"
            className="w-full shrink-0 rounded-xl bg-[#2563EB] text-white shadow-sm hover:bg-[#1D4ED8] sm:w-auto"
          >
            <ShoppingCart className="h-4 w-4" /> Lançar venda
          </Button>
        </Link>
      </div>

      {/* Métricas */}
      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          const hintColor =
            s.hintTone === "growth"
              ? "text-emerald-600"
              : s.hintTone === "warn"
                ? "text-amber-600"
                : "text-[#64748B]";
          return (
            <div
              key={s.label}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
                  {s.label}
                </span>
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${s.iconBg} ${s.iconColor}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="flex flex-col">
                <h3 className="text-3xl font-bold tracking-tight text-[#0F172A]">
                  {s.value}
                  {s.suffix && (
                    <span className="ml-1 text-lg font-medium opacity-50">{s.suffix}</span>
                  )}
                </h3>
                {s.hint && (
                  <p className={`mt-1 flex items-center gap-1 text-xs font-bold ${hintColor}`}>
                    {s.hintTone === "growth" && <TrendingUp className="h-3 w-3" />}
                    {s.hint}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* Ações rápidas */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-[#0F172A]">Ações Rápidas</h3>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to as "/lojista/clientes"}
                className="group flex flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white p-6 text-center transition-colors hover:bg-slate-50 active:scale-[0.98]"
              >
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${a.iconBg} ${a.iconColor} transition-transform group-hover:scale-110`}>
                  <Icon className="h-6 w-6" />
                </div>
                <span className="text-sm font-bold text-[#0F172A]">{a.label}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Últimas transações */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h3 className="text-xl font-bold text-[#0F172A]">Últimas Transações</h3>
          <Link to="/lojista/clientes" className="text-sm font-bold text-[#2563EB] hover:underline">
            Ver todas
          </Link>
        </div>
        {txs.length === 0 ? (
          <div className="p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-[#94A3B8]">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-[#64748B]">Cliente</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-[#64748B]">Valor Venda</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-[#64748B]">Pontos</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-[#64748B]">Cashback</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-[#64748B]">Data</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
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
                  const data = new Date(t.created_at).toLocaleString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <tr key={t.id} className="group transition-colors hover:bg-slate-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-[#0F172A]">
                            {initials}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[#0F172A]">{nomeCli}</span>
                            <span className="text-xs text-[#64748B]">{tipoLabel}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-[#0F172A]">
                        {t.tipo === "venda" ? formatBRL(Number(t.valor)) : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {t.pontos_delta ? (
                          <span className={`text-sm font-bold ${t.pontos_delta > 0 ? "text-purple-600" : "text-[#EF4444]"}`}>
                            {t.pontos_delta > 0 ? "+" : ""}
                            {t.pontos_delta} pts
                          </span>
                        ) : (
                          <span className="text-sm text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {Number(t.cashback_delta) ? (
                          <span className={`text-sm font-bold ${Number(t.cashback_delta) > 0 ? "text-emerald-600" : "text-[#EF4444]"}`}>
                            {Number(t.cashback_delta) > 0 ? "+" : ""}
                            {formatBRL(Number(t.cashback_delta))}
                          </span>
                        ) : (
                          <span className="text-sm text-[#94A3B8]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#64748B]">{data}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="rounded-lg p-2 opacity-0 transition-all hover:bg-slate-100 group-hover:opacity-100">
                          <MoreVertical className="h-4 w-4 text-[#64748B]" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
