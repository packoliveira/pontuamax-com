import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEmployeeContext } from "@/hooks/use-employee-context";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { storeClientsQuery, storePromotionsQuery, storeTransactionsQuery } from "@/lib/queries";
import { cadastrarClientePorTelefone, estornarVenda, lancarVenda } from "@/lib/qsf.functions";
import { formatBRL, formatCPF, isValidCPF, onlyDigits } from "@/lib/qsf-shared";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  CheckCircle2,
  Coins,
  ShoppingCart,
  ShieldOff,
  Sparkles,
  Undo2,
  User,
  Wallet,
  Zap,
} from "lucide-react";

export const Route = createFileRoute("/funcionario/pontuar")({
  ssr: false,
  component: Pontuar,
});

function Pontuar() {
  const qc = useQueryClient();
  const { hasPermission } = useEmployeeContext();
  const { data: ctx } = useQuery(myEmployeeContextQuery());
  const loja = ctx?.store as any;
  const storeId = loja?.id as string | undefined;
  const { data: clientes = [] } = useQuery(storeClientsQuery(storeId));
  const { data: promos = [] } = useQuery(storePromotionsQuery(storeId));
  const { data: transacoes = [] } = useQuery(storeTransactionsQuery(storeId));
  const [contato, setContato] = useState("");
  const [valor, setValor] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [telefoneNovo, setTelefoneNovo] = useState("");
  const [cpfNovo, setCpfNovo] = useState("");
  const [precisaCadastro, setPrecisaCadastro] = useState(false);
  const [ultimo, setUltimo] = useState<{
    pontos: number;
    cashback: number;
    cliente: string;
  } | null>(null);

  const cadastrar = useMutation({
    mutationFn: (input: { phone: string; nome: string; store_id: string; cpf: string }) =>
      cadastrarClientePorTelefone({ data: input }),
  });
  const lancar = useMutation({
    mutationFn: (input: { store_id: string; client_user_id: string; valor: number }) =>
      lancarVenda({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-clients", storeId] });
      qc.invalidateQueries({ queryKey: ["transactions", storeId] });
    },
  });
  const estornar = useMutation({
    mutationFn: (input: { transaction_id: string }) => estornarVenda({ data: input }),
    onSuccess: (r) => {
      toast.success(
        `Venda estornada. Revertidos: ${r.pontos_revertidos} pts / ${formatBRL(r.cashback_revertido)}`,
      );
      qc.invalidateQueries({ queryKey: ["store-clients", storeId] });
      qc.invalidateQueries({ queryKey: ["transactions", storeId] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!hasPermission("pontos.adicionar")) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 text-red-600 grid place-items-center">
          <ShieldOff className="h-6 w-6" />
        </div>
        <h2 className="text-lg font-semibold">Sem permissão</h2>
      </div>
    );
  }
  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";
  const valorNum = parseFloat(valor.replace(",", ".") || "0");
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[parts.weekday] ?? 0;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const hm = `${parts.hour}:${parts.minute}`;
  const multiplicador = (promos as any[]).reduce((max, p) => {
    if (!p.ativo || !(p.dias_semana as number[]).includes(dow)) return max;
    if (p.data_inicio && date < p.data_inicio) return max;
    if (p.data_fim && date > p.data_fim) return max;
    if (hm < p.hora_inicio.slice(0, 5) || hm > p.hora_fim.slice(0, 5)) return max;
    return Math.max(max, Number(p.multiplicador));
  }, 1);
  const promoAtiva = multiplicador > 1;

  const findClient = () => {
    const norm = onlyDigits(contato);
    return (clientes as any[]).find((c) => {
      const p = c.profiles as { phone: string | null; cpf: string | null } | null;
      return p && (onlyDigits(p.phone ?? "") === norm || onlyDigits(p.cpf ?? "") === norm);
    });
  };
  const sugestoes = useMemo(() => {
    const q = contato.trim().toLowerCase();
    if (q.length < 2) return [] as any[];
    const norm = onlyDigits(contato);
    return (clientes as any[])
      .filter((c) => {
        const p = c.profiles as {
          full_name: string | null;
          phone: string | null;
          cpf: string | null;
        } | null;
        if (!p) return false;
        return (
          (norm &&
            (onlyDigits(p.phone ?? "").includes(norm) || onlyDigits(p.cpf ?? "").includes(norm))) ||
          (p.full_name ?? "").toLowerCase().includes(q)
        );
      })
      .slice(0, 6);
  }, [contato, clientes]);
  const clienteSelecionado = findClient();
  const ultimasVendas = useMemo(
    () => (transacoes as any[]).filter((t) => t.tipo === "venda").slice(0, 5),
    [transacoes],
  );
  const estornosIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of transacoes as any[])
      if (typeof t.origem === "string" && t.origem.startsWith("estorno:"))
        set.add(t.origem.split(":")[1]);
    return set;
  }, [transacoes]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeId || !contato || !valorNum || valorNum <= 0) return;
    let cli = findClient();
    let userId = cli?.user_id;
    let nomeCli = (cli?.profiles as { full_name: string | null } | null)?.full_name ?? "";
    if (!cli) {
      if (!hasPermission("clientes.cadastrar")) {
        toast.error("Você não tem permissão para cadastrar novos clientes.");
        return;
      }
      if (!precisaCadastro) {
        setPrecisaCadastro(true);
        return;
      }
      if (!nomeNovo.trim()) {
        toast.error("Informe o nome do cliente");
        return;
      }
      if (onlyDigits(telefoneNovo).length < 10) {
        toast.error("Informe um telefone válido");
        return;
      }
      if (!isValidCPF(cpfNovo)) {
        toast.error("CPF inválido");
        return;
      }
      try {
        const r = await cadastrar.mutateAsync({
          phone: onlyDigits(telefoneNovo),
          nome: nomeNovo.trim(),
          store_id: storeId,
          cpf: onlyDigits(cpfNovo),
        });
        userId = r.user_id;
        nomeCli = nomeNovo.trim();
        toast.success(`Cliente cadastrado. Senha inicial (CPF): ${r.senha_temporaria}`);
      } catch (err) {
        toast.error((err as Error).message);
        return;
      }
    }
    try {
      const r = await lancar.mutateAsync({
        store_id: storeId,
        client_user_id: userId!,
        valor: valorNum,
      });
      setUltimo({ pontos: r.pontos, cashback: r.cashback, cliente: nomeCli });
      setContato("");
      setValor("");
      setNomeNovo("");
      setTelefoneNovo("");
      setCpfNovo("");
      setPrecisaCadastro(false);
      toast.success("Venda lançada!");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const loading = cadastrar.isPending || lancar.isPending;
  const pontosPreview =
    inclP && valor ? Math.floor(valorNum * Number(loja.regra_pontos) * multiplicador) : 0;
  const cashbackPreview = inclC && valor ? (valorNum * Number(loja.percentual_cashback)) / 100 : 0;

  return (
    <div className="max-w-3xl space-y-8">
      <div>
        <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">Operação</div>
        <h1 className="mt-1 text-2xl font-bold text-[#0F172A] md:text-3xl">Lançar venda</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Credite pontos e/ou cashback para um cliente em poucos segundos.
        </p>
      </div>

      <Card className="overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="flex items-center gap-3 border-b border-[#F1F5F9] bg-gradient-to-r from-[#6D28D9]/5 via-[#2563EB]/5 to-[#14CBA8]/5 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-sm">
            <ShoppingCart className="h-4 w-4" />
          </div>
          <div>
            <div className="text-sm font-semibold text-[#0F172A]">Nova venda</div>
            <div className="text-xs text-[#64748B]">
              Busque o cliente e informe o valor da compra.
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="contato" className="text-sm font-medium text-[#0F172A]">
                Cliente
              </Label>
              <Input
                id="contato"
                placeholder="Busque por CPF, telefone ou nome"
                value={contato}
                onChange={(e) => {
                  setContato(e.target.value);
                  setPrecisaCadastro(false);
                }}
                inputMode="search"
                autoComplete="off"
                className="h-11 rounded-xl border-[#E5E7EB] bg-white focus-visible:ring-[#2563EB]/30"
                required
              />
              {sugestoes.length > 0 && !clienteSelecionado && (
                <div className="mt-1 max-h-56 divide-y divide-[#F1F5F9] overflow-auto rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
                  {sugestoes.map((c: any) => {
                    const p = c.profiles as {
                      full_name: string | null;
                      phone: string | null;
                      cpf: string | null;
                    } | null;
                    const initials = (p?.full_name ?? "?")
                      .split(" ")
                      .map((s) => s[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() =>
                          setContato(
                            onlyDigits(p?.cpf ?? "") ||
                              onlyDigits(p?.phone ?? "") ||
                              p?.full_name ||
                              "",
                          )
                        }
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-[#F8FAFC]"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-[10px] font-semibold text-white">
                          {initials || <User className="h-4 w-4" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-[#0F172A]">
                            {p?.full_name ?? "Cliente"}
                          </div>
                          <div className="truncate text-xs text-[#64748B]">
                            {p?.cpf ? formatCPF(p.cpf) : ""}
                            {p?.cpf && p?.phone ? " · " : ""}
                            {p?.phone ?? ""}
                          </div>
                        </div>
                        <div className="shrink-0 text-xs font-semibold text-[#2563EB]">
                          {c.pontos} pts
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {clienteSelecionado && (
                <div className="mt-1 flex items-center gap-3 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/5 px-3 py-2.5 text-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#22C55E] text-white">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 truncate">
                    <div className="truncate font-semibold text-[#0F172A]">
                      {(clienteSelecionado.profiles as { full_name: string | null } | null)
                        ?.full_name ?? "Cliente"}
                    </div>
                    <div className="text-xs text-[#15803D]">
                      {clienteSelecionado.pontos} pts ·{" "}
                      {formatBRL(Number(clienteSelecionado.cashback_saldo))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="valor" className="text-sm font-medium text-[#0F172A]">
                Valor da compra (R$)
              </Label>
              <Input
                id="valor"
                type="number"
                step="0.01"
                min="0"
                placeholder="100,00"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                inputMode="decimal"
                className="h-11 rounded-xl border-[#E5E7EB] bg-white text-lg font-semibold focus-visible:ring-[#2563EB]/30"
                required
              />
            </div>

            {precisaCadastro && (
              <div className="space-y-2.5 rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/5 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[#B45309]">
                  <Sparkles className="h-4 w-4" /> Cliente novo — preencha os dados
                </div>
                <p className="text-xs text-[#92400E]">Login e senha inicial = CPF.</p>
                <Input
                  placeholder="Nome do cliente"
                  value={nomeNovo}
                  onChange={(e) => setNomeNovo(e.target.value)}
                  className="h-11 rounded-xl border-[#E5E7EB] bg-white focus-visible:ring-[#2563EB]/30"
                />
                <Input
                  placeholder="Telefone (com DDD)"
                  value={telefoneNovo}
                  onChange={(e) => setTelefoneNovo(e.target.value)}
                  inputMode="tel"
                  className="h-11 rounded-xl border-[#E5E7EB] bg-white focus-visible:ring-[#2563EB]/30"
                />
                <Input
                  placeholder="CPF (000.000.000-00)"
                  value={cpfNovo}
                  onChange={(e) => setCpfNovo(formatCPF(e.target.value))}
                  inputMode="numeric"
                  className="h-11 rounded-xl border-[#E5E7EB] bg-white focus-visible:ring-[#2563EB]/30"
                />
                {cpfNovo.trim() && !isValidCPF(cpfNovo) && (
                  <p className="text-xs font-medium text-[#EF4444]">CPF inválido</p>
                )}
              </div>
            )}

            <div className="rounded-2xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                  Prévia do crédito
                </div>
                {promoAtiva && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#F97316] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                    <Zap className="h-3 w-3" /> Promo {multiplicador}x
                  </span>
                )}
              </div>
              {!valor ? (
                <p className="text-sm text-[#64748B]">
                  Digite o valor para ver quanto o cliente vai ganhar.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {inclP && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#2563EB] text-white">
                        <Coins className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
                          Pontos
                        </div>
                        <div className="text-lg font-bold text-[#0F172A]">
                          +{pontosPreview.toLocaleString("pt-BR")}
                        </div>
                      </div>
                    </div>
                  )}
                  {inclC && (
                    <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#14CBA8] text-white">
                        <Wallet className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
                          Cashback
                        </div>
                        <div className="text-lg font-bold text-[#0F172A]">
                          +{formatBRL(cashbackPreview)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full rounded-xl bg-[#2563EB] text-white shadow-sm transition hover:bg-[#1D4ED8]"
              disabled={loading}
            >
              <ShoppingCart className="h-4 w-4" /> {loading ? "Enviando..." : "Lançar venda"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {ultimo && (
        <Card className="overflow-hidden rounded-2xl border border-[#22C55E]/30 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 bg-gradient-to-r from-[#22C55E]/10 to-[#14CBA8]/10 px-6 py-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#22C55E] to-[#14CBA8] text-white shadow-sm">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[#0F172A]">Venda registrada</div>
              <div className="text-xs text-[#15803D]">{ultimo.cliente} recebeu o crédito.</div>
            </div>
          </div>
          <CardContent className="grid gap-3 p-6 sm:grid-cols-2">
            {ultimo.pontos > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] to-[#2563EB] text-white">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
                    Pontos
                  </div>
                  <div className="text-lg font-bold text-[#0F172A]">
                    +{ultimo.pontos.toLocaleString("pt-BR")}
                  </div>
                </div>
              </div>
            )}
            {ultimo.cashback > 0 && (
              <div className="flex items-center gap-3 rounded-xl border border-[#E5E7EB] bg-white p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#2563EB] to-[#14CBA8] text-white">
                  <Wallet className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
                    Cashback
                  </div>
                  <div className="text-lg font-bold text-[#0F172A]">
                    +{formatBRL(ultimo.cashback)}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {ultimasVendas.length > 0 && (
        <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-sm font-semibold text-[#0F172A]">Últimas vendas</div>
              <span className="text-xs text-[#64748B]">{ultimasVendas.length} recentes</span>
            </div>
            <ul className="divide-y divide-[#F1F5F9]">
              {ultimasVendas.map((t: any) => {
                const p = t.profiles as { full_name: string | null; phone: string | null } | null;
                const nome = p?.full_name ?? "Cliente";
                const initials =
                  nome
                    .split(" ")
                    .map((s) => s[0])
                    .filter(Boolean)
                    .slice(0, 2)
                    .join("")
                    .toUpperCase() || "—";
                const jaEstornada =
                  estornosIds.has(t.id) ||
                  (typeof t.origem === "string" && t.origem.startsWith("estornada:"));
                return (
                  <li
                    key={t.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#F1F5F9] text-[11px] font-semibold text-[#0F172A]">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-[#0F172A]">
                            {nome}
                          </span>
                          {jaEstornada && (
                            <span className="inline-flex items-center rounded-full bg-[#EF4444]/10 px-2 py-0.5 text-[10px] font-semibold text-[#B91C1C] ring-1 ring-inset ring-[#EF4444]/20">
                              Estornada
                            </span>
                          )}
                        </div>
                        <div className="truncate text-xs text-[#64748B]">
                          {new Date(t.created_at).toLocaleString("pt-BR")} ·{" "}
                          {formatBRL(Number(t.valor ?? 0))}
                          {t.pontos_delta ? ` · +${t.pontos_delta} pts` : ""}
                          {Number(t.cashback_delta)
                            ? ` · +${formatBRL(Number(t.cashback_delta))}`
                            : ""}
                        </div>
                      </div>
                    </div>
                    {hasPermission("pontos.estornar") && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={jaEstornada || estornar.isPending}
                            className="rounded-xl border-[#E5E7EB] text-[#0F172A] hover:bg-[#F1F5F9]"
                          >
                            <Undo2 className="mr-1 h-3.5 w-3.5" /> Estornar
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-[20px]">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Estornar esta venda?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Vamos reverter <strong>{t.pontos_delta} pts</strong>
                              {Number(t.cashback_delta) ? (
                                <>
                                  {" "}
                                  e <strong>{formatBRL(Number(t.cashback_delta))}</strong> de
                                  cashback
                                </>
                              ) : null}{" "}
                              do saldo de <strong>{p?.full_name ?? "cliente"}</strong>.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-xl bg-[#EF4444] hover:bg-[#DC2626]"
                              onClick={() => estornar.mutate({ transaction_id: t.id })}
                            >
                              Confirmar estorno
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
