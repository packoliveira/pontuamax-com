import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, type Modalidade } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BrandPreview } from "@/components/brand-preview";
import { toast } from "sonner";

export const Route = createFileRoute("/lojista/configuracoes")({
  ssr: false,
  component: ConfigPage,
});

function ConfigPage() {
  const lojaId = useStore((s) => s.authedLojaId)!;
  const loja = useStore((s) => s.lojas.find((l) => l.id === lojaId))!;
  const atualizar = useStore((s) => s.atualizarLoja);

  const [nome, setNome] = useState(loja.nome);
  const [telefone, setTelefone] = useState(loja.telefone);
  const [logo, setLogo] = useState(loja.logo_url);
  const [cor1, setCor1] = useState(loja.cor_primaria);
  const [cor2, setCor2] = useState(loja.cor_secundaria);
  const [modalidade, setModalidade] = useState<Modalidade>(loja.modalidade);
  const [regraP, setRegraP] = useState(String(loja.regra_pontos));
  const [pctC, setPctC] = useState(String(loja.percentual_cashback));
  const [niveis, setNiveis] = useState(loja.niveis_ativos);

  const salvar = () => {
    atualizar(lojaId, {
      nome, telefone, logo_url: logo, cor_primaria: cor1, cor_secundaria: cor2,
      modalidade, regra_pontos: parseFloat(regraP) || 1,
      percentual_cashback: parseFloat(pctC) || 0, niveis_ativos: niveis,
    });
    toast.success("Configurações salvas");
  };

  const inclPontos = modalidade !== "cashback";
  const inclCashback = modalidade !== "pontos";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize a página do cliente e as regras de recompensa</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base">Dados da loja</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Identidade visual</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>URL do logo</Label><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cor primária</Label><div className="flex gap-2"><Input type="color" value={cor1} onChange={(e) => setCor1(e.target.value)} className="w-16 h-10 p-1" /><Input value={cor1} onChange={(e) => setCor1(e.target.value)} /></div></div>
              <div><Label>Cor secundária</Label><div className="flex gap-2"><Input type="color" value={cor2} onChange={(e) => setCor2(e.target.value)} className="w-16 h-10 p-1" /><Input value={cor2} onChange={(e) => setCor2(e.target.value)} /></div></div>
            </div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Modalidade de recompensa</CardTitle></CardHeader><CardContent className="space-y-4">
            <RadioGroup value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
              {(["pontos", "cashback", "ambos"] as const).map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <RadioGroupItem value={m} id={m} />
                  <Label htmlFor={m} className="capitalize">{m}</Label>
                </div>
              ))}
            </RadioGroup>
            {inclPontos && (
              <div><Label>Pontos por R$1 gasto</Label><Input type="number" step="0.1" value={regraP} onChange={(e) => setRegraP(e.target.value)} /></div>
            )}
            {inclCashback && (
              <div><Label>% de cashback</Label><Input type="number" step="0.1" value={pctC} onChange={(e) => setPctC(e.target.value)} /></div>
            )}
            {inclPontos && (
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Níveis (Bronze/Prata/Ouro)</div>
                  <div className="text-xs text-muted-foreground">Bronze 0-100 • Prata 101-300 • Ouro 301+</div>
                </div>
                <Switch checked={niveis} onCheckedChange={setNiveis} />
              </div>
            )}
          </CardContent></Card>

          <Button onClick={salvar} size="lg">Salvar alterações</Button>
        </div>
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="text-sm font-semibold mb-2 text-muted-foreground">Prévia ao vivo</div>
          <BrandPreview nome={nome} logo={logo} cor1={cor1} cor2={cor2} modalidade={modalidade} />
        </div>
      </div>
    </div>
  );
}