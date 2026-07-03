import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { myStoreQuery, storeClientsQuery, storePromotionsQuery } from "@/lib/queries";
import { lancarVenda, cadastrarClientePorTelefone } from "@/lib/qsf.functions";
import { formatBRL, onlyDigits, isValidCPF, formatCPF } from "@/lib/qsf-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/lojista/lancar-venda")({
  ssr: false,
  component: LancarVenda,
});

function LancarVenda() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: clientes = [] } = useQuery(storeClientsQuery(loja?.id));
  const { data: promos = [] } = useQuery(storePromotionsQuery(loja?.id));

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
              <Label htmlFor="contato">CPF do cliente</Label>
              <Input id="contato" placeholder="000.000.000-00" value={contato} onChange={(e) => { setContato(e.target.value); setPrecisaCadastro(false); }} inputMode="numeric" required />
              <p className="text-xs text-muted-foreground">Também aceita telefone para localizar clientes já cadastrados.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor da compra (R$)</Label>
              <Input id="valor" type="number" step="0.01" min="0" placeholder="100.00" value={valor} onChange={(e) => setValor(e.target.value)} required />
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
    </div>
  );
}