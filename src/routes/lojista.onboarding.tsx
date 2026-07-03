import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, type Modalidade } from "@/lib/mock-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BrandPreview } from "@/components/brand-preview";
import { Check, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lojista/onboarding")({
  ssr: false,
  component: Onboarding,
});

function slugify(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 30) || "loja";
}

function Onboarding() {
  const navigate = useNavigate();
  const criarLoja = useStore((s) => s.criarLoja);
  const loginLojista = useStore((s) => s.loginLojista);

  const [step, setStep] = useState(1);
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [logo, setLogo] = useState("");
  const [cor1, setCor1] = useState("#7c3aed");
  const [cor2, setCor2] = useState("#f97316");
  const [modalidade, setModalidade] = useState<Modalidade>("ambos");
  const [regraP, setRegraP] = useState("1");
  const [pctC, setPctC] = useState("5");
  const [slug, setSlug] = useState("");

  const finalizar = () => {
    const s = slugify(nome);
    const loja = criarLoja({
      nome, telefone, slug: s, logo_url: logo, cor_primaria: cor1, cor_secundaria: cor2,
      modalidade, regra_pontos: parseFloat(regraP) || 1,
      percentual_cashback: parseFloat(pctC) || 0, niveis_ativos: true,
    });
    setSlug(s);
    loginLojista(loja.id);
    setStep(4);
  };

  const inclPontos = modalidade !== "cashback";
  const inclCashback = modalidade !== "pontos";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-orange-50 p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Criar sua loja no QSF Club</h1>
          <p className="text-sm text-muted-foreground mt-2">Passo {Math.min(step, 4)} de 4</p>
          <div className="flex justify-center gap-1 mt-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className={`h-1.5 w-12 rounded-full ${step >= n ? "bg-violet-600" : "bg-violet-100"}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <Card><CardHeader><CardTitle>Dados da loja</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><Label>Nome da loja</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Café da Esquina" /></div>
            <div><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" /></div>
            <Button onClick={() => setStep(2)} disabled={!nome} className="w-full">Próximo <ArrowRight className="h-4 w-4" /></Button>
          </CardContent></Card>
        )}

        {step === 2 && (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <Card><CardHeader><CardTitle>Identidade visual</CardTitle></CardHeader><CardContent className="space-y-4">
              <div><Label>URL do logo</Label><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cor primária</Label><div className="flex gap-2"><Input type="color" value={cor1} onChange={(e) => setCor1(e.target.value)} className="w-16 h-10 p-1" /><Input value={cor1} onChange={(e) => setCor1(e.target.value)} /></div></div>
                <div><Label>Cor secundária</Label><div className="flex gap-2"><Input type="color" value={cor2} onChange={(e) => setCor2(e.target.value)} className="w-16 h-10 p-1" /><Input value={cor2} onChange={(e) => setCor2(e.target.value)} /></div></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Próximo</Button>
              </div>
            </CardContent></Card>
            <div>
              <div className="text-sm font-semibold mb-2 text-muted-foreground">Prévia ao vivo</div>
              <BrandPreview nome={nome} logo={logo} cor1={cor1} cor2={cor2} modalidade={modalidade} />
            </div>
          </div>
        )}

        {step === 3 && (
          <Card><CardHeader><CardTitle>Modalidade</CardTitle></CardHeader><CardContent className="space-y-4">
            <RadioGroup value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
              {[
                { v: "pontos", d: "Cliente acumula pontos e troca por produtos" },
                { v: "cashback", d: "Cliente recebe % de volta em reais" },
                { v: "ambos", d: "As duas modalidades funcionando juntas" },
              ].map(({ v, d }) => (
                <label key={v} className="flex items-start gap-3 rounded-lg border p-3 cursor-pointer hover:bg-accent">
                  <RadioGroupItem value={v} className="mt-0.5" />
                  <div>
                    <div className="font-medium capitalize">{v}</div>
                    <div className="text-sm text-muted-foreground">{d}</div>
                  </div>
                </label>
              ))}
            </RadioGroup>
            {inclPontos && <div><Label>Pontos por R$1 gasto</Label><Input type="number" step="0.1" value={regraP} onChange={(e) => setRegraP(e.target.value)} /></div>}
            {inclCashback && <div><Label>% de cashback</Label><Input type="number" step="0.1" value={pctC} onChange={(e) => setPctC(e.target.value)} /></div>}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
              <Button onClick={finalizar} className="flex-1">Criar minha loja</Button>
            </div>
          </CardContent></Card>
        )}

        {step === 4 && (
          <Card><CardContent className="pt-6 text-center space-y-4">
            <div className="mx-auto h-14 w-14 rounded-full bg-green-100 flex items-center justify-center">
              <Check className="h-7 w-7 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Sua loja está pronta!</h2>
            <p className="text-sm text-muted-foreground">Divulgue este link para seus clientes:</p>
            <div className="flex items-center gap-2 max-w-md mx-auto rounded-md border bg-muted p-2">
              <code className="flex-1 text-sm text-left truncate">qsfclub.com/{slug}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`qsfclub.com/${slug}`); toast.success("Copiado!"); }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button onClick={() => navigate({ to: "/lojista" })} className="w-full max-w-xs">Ir para o painel <ArrowRight className="h-4 w-4" /></Button>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}