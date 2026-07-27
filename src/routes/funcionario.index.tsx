import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import { formatBRL } from "@/lib/qsf-shared";
import { storeClientsQuery, storeTransactionsQuery } from "@/lib/queries";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  Coins,
  Gift,
  Sparkles,
  LayoutDashboard,
  ShoppingCart,
  Ticket,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/funcionario/")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery(myEmployeeContextQuery());
  const storeId = data?.store?.id;
  const { data: clientes = [] } = useQuery(storeClientsQuery(storeId));
  const { data: txs = [] } = useQuery(storeTransactionsQuery(storeId));
  if (!data) return null;
  const firstLoginAt = (data.employee as { first_login_at?: string | null }).first_login_at;
  const showWelcome = firstLoginAt
    ? Date.now() - new Date(firstLoginAt).getTime() < 24 * 3600 * 1000
    : false;

  const inicioMes = new Date();
  inicioMes.setDate(1);
  inicioMes.setHours(0, 0, 0, 0);
  const txsMes = (txs as any[]).filter(
    (t) => new Date(t.created_at) >= inicioMes && t.tipo === "venda",
  );
  const pontosMes = txsMes.reduce((a, t) => a + (t.pontos_delta ?? 0), 0);
  const cashbackMes = txsMes.reduce((a, t) => a + Number(t.cashback_delta ?? 0), 0);
  const pendentes = (txs as any[]).filter(
    (t) => t.tipo !== "venda" && t.status === "pendente",
  ).length;
  const perms = new Set(data.permissions);
  const inclP = data.store?.modalidade !== "cashback";
  const inclC = data.store?.modalidade !== "pontos";

  const stats: {
    label: string;
    value: string | number;
    icon: LucideIcon;
    show: boolean;
    hint: string;
  }[] = [
    {
      label: "Clientes",
      value: clientes.length.toLocaleString("pt-BR"),
      icon: Users,
      show: perms.has("clientes.consultar"),
      hint: "Total cadastrados",
    },
    {
      label: "Pontos no mês",
      value: pontosMes.toLocaleString("pt-BR"),
      icon: Coins,
      show: inclP && perms.has("historico.consultar"),
      hint: "Distribuídos",
    },
    {
      label: "Cashback do mês",
      value: formatBRL(cashbackMes),
      icon: Wallet,
      show: inclC && perms.has("historico.consultar"),
      hint: "Devolvido a clientes",
    },
    {
      label: "Resgates pendentes",
      value: pendentes,
      icon: Gift,
      show: perms.has("vouchers.validar") || perms.has("resgates.produtos"),
      hint: "Aguardando validação",
    },
  ].filter((s) => s.show);

  const quickActions: { to: string; label: string; icon: LucideIcon; show: boolean }[] = [
    {
      to: "/funcionario/clientes",
      label: "Clientes",
      icon: Users,
      show: perms.has("clientes.consultar"),
    },
    {
      to: "/funcionario/pontuar",
      label: "Lançar venda",
      icon: ShoppingCart,
      show: perms.has("pontos.adicionar"),
    },
    {
      to: "/funcionario/resgates",
      label: "Resgates",
      icon: Gift,
      show: perms.has("resgates.produtos") || perms.has("vouchers.validar"),
    },
    {
      to: "/funcionario/vouchers",
      label: "Vouchers",
      icon: Ticket,
      show: perms.has("vouchers.validar") || perms.has("vouchers.criar"),
    },
  ].filter((a) => a.show);

  return (
    <div className="space-y-8">
      {showWelcome && (
        <div className="rounded-2xl border border-[#14CBA8]/30 bg-gradient-to-r from-[#14CBA8]/10 via-[#2563EB]/10 to-[#6D28D9]/10 p-4 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-card text-[#14CBA8] shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="text-sm text-foreground">
            <div className="font-semibold">Bem-vindo(a) ao painel!</div>
            <div className="text-muted-foreground">
              Use os atalhos abaixo para atender clientes. Comece por <strong>Lançar venda</strong>{" "}
              para pontuar uma compra.
            </div>
          </div>
        </div>
      )}
      <PageHeader
        eyebrow="Dashboard"
        title={`Olá, ${data.employee.nome.split(" ")[0]}!`}
        description={`${data.store?.nome_fantasia ?? ""} · Cargo: ${data.employee.role_key}`}
        actions={
          perms.has("pontos.adicionar") ? (
            <Link to="/funcionario/pontuar" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full rounded-xl bg-primary text-white shadow-sm hover:bg-primary/90 sm:w-auto"
              >
                <ShoppingCart className="h-4 w-4" /> Lançar venda
              </Button>
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card
              key={s.label}
              className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {s.label}
                  </div>
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-sm">
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                <div className="mt-3 text-2xl font-bold text-foreground">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div>
        <div className="mb-3 text-sm font-semibold text-foreground">Ações rápidas</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.to}
                to={a.to as "/funcionario"}
                className="group flex items-center gap-3 rounded-2xl border border-border bg-card p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-primary transition group-hover:bg-primary/10">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-sm font-medium text-foreground">{a.label}</div>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
              </Link>
            );
          })}
        </div>
      </div>

      <Card className="rounded-2xl border border-border bg-card shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm font-semibold text-foreground">Últimas transações</div>
            <Badge variant="secondary" className="rounded-full text-[11px]">
              {data.permissions.length} permissões
            </Badge>
          </div>
          {(txs as any[]).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/40 p-8 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-card text-muted-foreground shadow-sm">
                <LayoutDashboard className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma transação ainda.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {(txs as any[]).slice(0, 8).map((t) => {
                const nomeCli = t.profiles?.full_name ?? "—";
                const tipoLabel =
                  t.tipo === "venda"
                    ? "Compra"
                    : t.tipo === "resgate_produto"
                      ? "Resgate de produto"
                      : t.tipo === "resgate_cashback"
                        ? "Voucher de cashback"
                        : "Ajuste";
                const initials =
                  nomeCli
                    .split(" ")
                    .map((p: string) => p[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "—";
                return (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-foreground">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{nomeCli}</div>
                        <div className="text-xs text-muted-foreground">{tipoLabel}</div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {t.tipo === "venda" && (
                        <div className="font-semibold text-foreground">
                          {formatBRL(Number(t.valor ?? 0))}
                        </div>
                      )}
                      {t.pontos_delta ? (
                        <div
                          className={`text-xs font-medium ${t.pontos_delta > 0 ? "text-[#16A34A]" : "text-destructive"}`}
                        >
                          {t.pontos_delta > 0 ? "+" : ""}
                          {t.pontos_delta} pts
                        </div>
                      ) : null}
                      {Number(t.cashback_delta) ? (
                        <div
                          className={`text-xs font-medium ${Number(t.cashback_delta) > 0 ? "text-[#16A34A]" : "text-destructive"}`}
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
