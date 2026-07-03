import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeClientsQuery, storePromotionsQuery, storeTransactionsQuery } from "@/lib/queries";
import { lancarVenda, cadastrarClientePorTelefone, estornarVenda } from "@/lib/qsf.functions";
import { formatBRL, onlyDigits, isValidCPF, formatCPF } from "@/lib/qsf-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { CheckCircle2, Undo2, User } from "lucide-react";

export const Route = createFileRoute("/lojista/lancar-venda")({
  ssr: false,
  component: LancarVenda,
});

function LancarVenda() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: clientes = [] } = useQuery(storeClientsQuery(loja?.id));
  const { data: promos = [] } = useQuery(storePromotionsQuery(loja?.id));
  const { data: transacoes = [] } = useQuery(storeTransactionsQuery(loja?.id));

  const [contato, setContato] = useState("");
  const [valor, setValor] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [telefoneNovo, setTelefoneNovo] = useState("");
  const [cpfNovo, setCpfNovo] = useState("");
  const [precisaCadastro, setPrecisaCadastro] = useState(false);
  const [ultimo, setUltimo] = useState<{ pontos: number; cashback: number; cliente: string } | null>(null);

  const cadastrar = useMutation({
    mutationFn: (input: { phone: string; nome: string; store_id: string; cpf: string }) => cadastrarClientePorTelefone({ data: input }),
  });

  const lancar = useMutation({
    mutationFn: (input: { store_id: string; client_user_id: string; valor: number }) => lancarVenda({ data: input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
    },
  });

  const estornar = useMutation({
    mutationFn: (input: { transaction_id: string }) => estornarVenda({ data: input }),
    onSuccess: (r) => {
      toast.success(`Venda estornada. Revertidos: ${r.pontos_revertidos} pts / ${formatBRL(r.cashback_revertido)}`);
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";
  const valorNum = parseFloat(valor.replace(",", ".") || "0");

  // Calcula multiplicador ativo agora (Brasília)
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", weekday: "short", hour12: false });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  const dowMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const dow = dowMap[parts.weekday] ?? 0;
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  const hm = `${parts.hour}:${parts.minute}`;
  const multiplicador = promos.reduce((max, p) => {
    if (!p.ativo) return max;
    if (!(p.dias_semana as number[]).includes(dow)) return max;
    if (p.data_inicio && date < p.data_inicio) return max;
    if (p.data_fim && date > p.data_fim) return max;
    const hi = p.hora_inicio.slice(0, 5);
    const hf = p.hora_fim.slice(0, 5);
    if (hm < hi || hm > hf) return max;
    return Math.max(max, Number(p.multiplicador));
  }, 1);
  const promoAtiva = multiplicador > 1;

  const findClient = () => {
    const norm = onlyDigits(contato);
    return clientes.find((c) => {
      const p = c.profiles as unknown as { phone: string | null; cpf: string | null } | null;
      return p && (onlyDigits(p.phone ?? "") === norm || onlyDigits(p.cpf ?? "") === norm);
    });
  };

  // Sugestões enquanto o lojista digita (por CPF, telefone ou nome)
  const sugestoes = useMemo(() => {
    const q = contato.trim().toLowerCase();
    if (q.length < 2) return [] as typeof clientes;
    const norm = onlyDigits(contato);
    return clientes
      .filter((c) => {
        const p = c.profiles as unknown as { full_name: string | null; phone: string | null; cpf: string | null } | null;
        if (!p) return false;
        const nome = (p.full_name ?? "").toLowerCase();
        const tel = onlyDigits(p.phone ?? "");
        const cpf = onlyDigits(p.cpf ?? "");
        if (norm && (tel.includes(norm) || cpf.includes(norm))) return true;
        if (nome.includes(q)) return true;
        return false;
      })
      .slice(0, 6);
  }, [contato, clientes]);

  const clienteSelecionado = findClient();

  // Últimas 5 vendas (tipo=venda)
  const ultimasVendas = useMemo(
    () => (transacoes ?? []).filter((t) => t.tipo === "venda").slice(0, 5),
    [transacoes],
  );
  const estornosIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of transacoes ?? []) {
      if (typeof t.origem === "string" && t.origem.startsWith("estorno:")) {
        const id = t.origem.split(":")[1];
        if (id) set.add(id);
      }
    }
    return set;
  }, [transacoes]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contato || !valorNum || valorNum <= 0) return;

    let cli = findClient();
    let userId = cli?.user_id;
    let nomeCli = (cli?.profiles as unknown as { full_name: string | null } | null)?.full_name ?? "";

    if (!cli) {
      if (!precisaCadastro) { setPrecisaCadastro(true); return; }
      if (!nomeNovo.trim()) { toast.error("Informe o nome do cliente"); return; }
      if (onlyDigits(telefoneNovo).length < 10) { toast.error("Informe um telefone válido"); return; }
      if (!isValidCPF(cpfNovo)) { toast.error("CPF inválido"); return; }
      try {
        const r = await cadastrar.mutateAsync({
          phone: onlyDigits(telefoneNovo),
          nome: nomeNovo.trim(),
          store_id: loja.id,
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
      const r = await lancar.mutateAsync({ store_id: loja.id, client_user_id: userId!, valor: valorNum });
      setUltimo({ pontos: r.pontos, cashback: r.cashback, cliente: nomeCli });
      setContato(""); setValor(""); setNomeNovo(""); setTelefoneNovo(""); setCpfNovo(""); setPrecisaCadastro(false);
      toast.success("Venda lançada!");
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const loading = cadastrar.isPending || lancar.isPending;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Lançar venda</h1>
        <p className="text-sm text-muted-foreground">Credite pontos e/ou cashback para um cliente</p>
      </div>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="contato">Cliente (CPF, telefone ou nome)</Label>
              <Input id="contato" placeholder="CPF, telefone ou nome" value={contato} onChange={(e) => { setContato(e.target.value); setPrecisaCadastro(false); }} inputMode="search" autoComplete="off" required />
              {sugestoes.length > 0 && !clienteSelecionado && (
                <div className="rounded-md border bg-card divide-y max-h-56 overflow-auto">
                  {sugestoes.map((c) => {
                    const p = c.profiles as unknown as { full_name: string | null; phone: string | null; cpf: string | null } | null;
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => setContato(onlyDigits(p?.cpf ?? "") || onlyDigits(p?.phone ?? "") || p?.full_name || "")}
                        className="w-full text-left px-3 py-2 hover:bg-muted flex items-center gap-2"
                      >
                        <User className="h-4 w-4 text-muted-foreground shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{p?.full_name ?? "Cliente"}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {p?.cpf ? formatCPF(p.cpf) : ""}{p?.cpf && p?.phone ? " · " : ""}{p?.phone ?? ""}
                          </div>
                        </div>
                        <div className="ml-auto text-xs text-muted-foreground shrink-0">{c.pontos} pts</div>
                      </button>
                    );
                  })}
                </div>
              )}
              {clienteSelecionado && (
                <div className="rounded-md border bg-green-50 border-green-200 px-3 py-2 text-sm text-green-900 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    <strong>{(clienteSelecionado.profiles as { full_name: string | null } | null)?.full_name ?? "Cliente"}</strong>
                    <span className="text-green-800/80"> · {clienteSelecionado.pontos} pts · {formatBRL(Number(clienteSelecionado.cashback_saldo))}</span>
                  </span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor da compra (R$)</Label>
              <Input id="valor" type="number" step="0.01" min="0" placeholder="100.00" value={valor} onChange={(e) => setValor(e.target.value)} inputMode="decimal" required />
            </div>
            {precisaCadastro && (
              <div className="space-y-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-900">Cliente novo — preencha os dados (login e senha inicial = CPF):</p>
                <Input placeholder="Nome do cliente" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} />
                <Input placeholder="Telefone (com DDD)" value={telefoneNovo} onChange={(e) => setTelefoneNovo(e.target.value)} inputMode="tel" />
                <Input placeholder="CPF (000.000.000-00)" value={cpfNovo} onChange={(e) => setCpfNovo(formatCPF(e.target.value))} inputMode="numeric" />
                {cpfNovo.trim() && !isValidCPF(cpfNovo) && (
                  <p className="text-xs text-red-600">CPF inválido</p>
                )}
              </div>
            )}
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium mb-1">Prévia:</div>
              {promoAtiva && <div className="mb-1 text-orange-700 font-semibold">⚡ Promoção ativa: {multiplicador}x pontos</div>}
              {inclP && valor && <div>+{Math.floor(valorNum * Number(loja.regra_pontos) * multiplicador)} pontos {promoAtiva && <span className="text-muted-foreground text-xs">({multiplicador}x)</span>}</div>}
              {inclC && valor && <div>+{formatBRL(valorNum * Number(loja.percentual_cashback) / 100)} cashback</div>}
              {!valor && <div className="text-muted-foreground">Digite o valor para ver a prévia</div>}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Enviando..." : "Lançar venda"}</Button>
          </form>
        </CardContent>
      </Card>
      {ultimo && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2 text-green-800"><CheckCircle2 className="h-5 w-5" /> Venda registrada</CardTitle></CardHeader>
          <CardContent className="text-sm text-green-900">
            <div><strong>{ultimo.cliente}</strong> ganhou:</div>
            {ultimo.pontos > 0 && <div>• {ultimo.pontos} pontos</div>}
            {ultimo.cashback > 0 && <div>• {formatBRL(ultimo.cashback)} de cashback</div>}
          </CardContent>
        </Card>
      )}

      {ultimasVendas.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Últimas vendas</CardTitle></CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {ultimasVendas.map((t) => {
                const p = t.profiles as unknown as { full_name: string | null; phone: string | null } | null;
                const jaEstornada = estornosIds.has(t.id) || (typeof t.origem === "string" && t.origem.startsWith("estornada:"));
                return (
                  <li key={t.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{p?.full_name ?? "Cliente"}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(t.created_at).toLocaleString("pt-BR")} · {formatBRL(Number(t.valor ?? 0))}
                        {t.pontos_delta ? ` · +${t.pontos_delta} pts` : ""}
                        {Number(t.cashback_delta) ? ` · +${formatBRL(Number(t.cashback_delta))}` : ""}
                        {jaEstornada && <span className="ml-1 text-red-600 font-medium">· estornada</span>}
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button type="button" size="sm" variant="outline" disabled={jaEstornada || estornar.isPending}>
                          <Undo2 className="h-3.5 w-3.5 mr-1" /> Estornar
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Estornar esta venda?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Vamos reverter <strong>{t.pontos_delta} pts</strong>
                            {Number(t.cashback_delta) ? <> e <strong>{formatBRL(Number(t.cashback_delta))}</strong> de cashback</> : null}
                            {" "}do saldo de <strong>{p?.full_name ?? "cliente"}</strong>. Essa ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => estornar.mutate({ transaction_id: t.id })}>
                            Confirmar estorno
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
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