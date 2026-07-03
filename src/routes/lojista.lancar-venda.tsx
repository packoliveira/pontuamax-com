import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, formatBRL } from "@/lib/mock-store";
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
  const lojaId = useStore((s) => s.authedLojaId)!;
  const loja = useStore((s) => s.lojas.find((l) => l.id === lojaId))!;
  const buscar = useStore((s) => s.buscarClientePorContato);
  const criarCliente = useStore((s) => s.criarCliente);
  const lancar = useStore((s) => s.lancarVenda);

  const [contato, setContato] = useState("");
  const [valor, setValor] = useState("");
  const [nomeNovo, setNomeNovo] = useState("");
  const [precisaCadastro, setPrecisaCadastro] = useState(false);
  const [ultimo, setUltimo] = useState<{ pontos: number; cashback: number; cliente: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const v = parseFloat(valor.replace(",", "."));
    if (!contato || !v || v <= 0) return;

    let cli = buscar(lojaId, contato);
    if (!cli) {
      if (!precisaCadastro) { setPrecisaCadastro(true); return; }
      if (!nomeNovo.trim()) { toast.error("Informe o nome do cliente"); return; }
      const soDigitos = contato.replace(/\D/g, "");
      cli = criarCliente({
        loja_id: lojaId,
        nome: nomeNovo.trim(),
        telefone: soDigitos,
      });
    }

    const r = lancar({ loja, cliente: cli, valor: v });
    setUltimo({ pontos: r.pontos, cashback: r.cashback, cliente: cli.nome });
    setContato(""); setValor(""); setNomeNovo(""); setPrecisaCadastro(false);
    toast.success("Venda lançada!");
  };

  const inclPontos = loja.modalidade !== "cashback";
  const inclCashback = loja.modalidade !== "pontos";
  const valorNum = parseFloat(valor.replace(",", ".") || "0");

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
              <Label htmlFor="contato">Telefone ou CPF do cliente</Label>
              <Input id="contato" placeholder="11987654321" value={contato} onChange={(e) => { setContato(e.target.value); setPrecisaCadastro(false); }} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="valor">Valor da compra (R$)</Label>
              <Input id="valor" type="number" step="0.01" min="0" placeholder="100.00" value={valor} onChange={(e) => setValor(e.target.value)} required />
            </div>
            {precisaCadastro && (
              <div className="space-y-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-900">Cliente novo — informe o nome:</p>
                <Input placeholder="Nome do cliente" value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} />
              </div>
            )}
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-medium mb-1">Prévia:</div>
              {inclPontos && valor && <div>+{Math.floor(valorNum * loja.regra_pontos)} pontos</div>}
              {inclCashback && valor && <div>+{formatBRL(valorNum * loja.percentual_cashback / 100)} cashback</div>}
              {!valor && <div className="text-muted-foreground">Digite o valor para ver a prévia</div>}
            </div>
            <Button type="submit" className="w-full">Lançar venda</Button>
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