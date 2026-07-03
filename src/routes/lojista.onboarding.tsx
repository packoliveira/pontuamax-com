import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { criarLoja } from "@/lib/qsf.functions";
import { slugify, type Modalidade } from "@/lib/qsf-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { traduzirErroAuth } from "@/lib/auth-errors";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BrandPreview } from "@/components/brand-preview";
import { Check, ArrowRight, Copy } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lojista/onboarding")({
  ssr: false,
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  // Auth
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [respName, setRespName] = useState("");
  // Loja
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [logo, setLogo] = useState("");
  const [cor1, setCor1] = useState("#7c3aed");
  const [cor2, setCor2] = useState("#f97316");
  const [modalidade, setModalidade] = useState<Modalidade>("ambos");
  const [regraP, setRegraP] = useState("1");
  const [pctC, setPctC] = useState("5");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  const finalizar = async () => {
    setLoading(true);
    try {
      // 1. Signup
      const { data: signup, error: sErr } = await supabase.auth.signUp({
        email,
        password: senha,
        options: { data: { full_name: respName, phone: telefone } },
      });
      if (sErr) throw sErr;
      // If autoconfirm is on, session is set; otherwise sign in explicitly
      if (!signup.session) {
        const { error: liErr } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (liErr) throw liErr;
      }
      const s = slugify(nome);
      await criarLoja({
        data: {
          slug: s,
          nome_fantasia: nome,
          cnpj: cnpj || null,
          telefone: telefone || null,
          logo_url: logo || null,
          brand_primary: cor1,
          brand_secondary: cor2,
          modalidade,
          regra_pontos: parseFloat(regraP) || 1,
          percentual_cashback: parseFloat(pctC) || 0,
        },
      });
      setSlug(s);
      setStep(5);
    } catch (e) {
      toast.error(traduzirErroAuth(e));
    } finally {
      setLoading(false);
    }
  };

  const inclPontos = modalidade !== "cashback";
  const inclCashback = modalidade !== "pontos";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-orange-50 p-4 py-8">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Passo {step} de 4</span>
        </div>

        {step === 1 && (
          <Card><CardHeader><CardTitle>Sua conta de lojista</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><Label>Seu nome</Label><Input value={respName} onChange={(e) => setRespName(e.target.value)} placeholder="Como quer ser chamado" /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" /></div>
            <div><Label>Senha</Label><PasswordInput value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} /></div>
            <Button onClick={() => setStep(2)} disabled={!respName || !email || senha.length < 6} className="w-full">Próximo <ArrowRight className="h-4 w-4" /></Button>
          </CardContent></Card>
        )}

        {step === 2 && (
          <Card><CardHeader><CardTitle>Sua loja</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><Label>Nome fantasia</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Café da Esquina" /></div>
            <div><Label>CNPJ (opcional)</Label><Input value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" /></div>
            <div><Label>Telefone de contato</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="(11) 90000-0000" /></div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button onClick={() => setStep(3)} disabled={!nome} className="flex-1">Próximo <ArrowRight className="h-4 w-4" /></Button>
            </div>
          </CardContent></Card>
        )}

        {step === 3 && (
          <div className="grid gap-6 md:grid-cols-[1fr_320px]">
            <Card><CardHeader><CardTitle>Identidade visual</CardTitle></CardHeader><CardContent className="space-y-4">
              <div><Label>URL do logo</Label><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cor primária</Label><div className="flex gap-2"><Input type="color" value={cor1} onChange={(e) => setCor1(e.target.value)} className="w-16 h-10 p-1" /><Input value={cor1} onChange={(e) => setCor1(e.target.value)} /></div></div>
                <div><Label>Cor secundária</Label><div className="flex gap-2"><Input type="color" value={cor2} onChange={(e) => setCor2(e.target.value)} className="w-16 h-10 p-1" /><Input value={cor2} onChange={(e) => setCor2(e.target.value)} /></div></div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => setStep(2)}>Voltar</Button>
                <Button onClick={() => setStep(4)} className="flex-1">Próximo</Button>
              </div>
            </CardContent></Card>
            <div>
              <div className="text-sm font-semibold mb-2 text-muted-foreground">Prévia ao vivo</div>
              <BrandPreview nome={nome} logo={logo} cor1={cor1} cor2={cor2} modalidade={modalidade} />
            </div>
          </div>
        )}

        {step === 4 && (
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
              <Button variant="outline" onClick={() => setStep(3)}>Voltar</Button>
              <Button onClick={finalizar} disabled={loading} className="flex-1">{loading ? "Criando..." : "Criar minha loja"}</Button>
            </div>
          </CardContent></Card>
        )}

        {step === 5 && (
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
            <div className="rounded-lg border bg-amber-50 border-amber-200 p-3 text-sm text-amber-900 text-left">
              <p className="font-medium">Próximo passo: liberação de acesso</p>
              <p className="text-xs mt-1">Sua loja foi criada mas o painel só é liberado após o pagamento da implementação. Nossa equipe entrará em contato.</p>
            </div>
            <Button onClick={() => navigate({ to: "/lojista/aguardando" })} className="w-full max-w-xs">Continuar <ArrowRight className="h-4 w-4" /></Button>
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}