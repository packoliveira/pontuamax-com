import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { criarLoja, atualizarLoja } from "@/lib/qsf.functions";
import { slugify, type Modalidade } from "@/lib/qsf-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { traduzirErroAuth } from "@/lib/auth-errors";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { BrandPreview } from "@/components/brand-preview";
import { Check, ArrowRight, Copy, Upload, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lojista/onboarding")({
  ssr: false,
  beforeLoad: async () => {
    // Se já está logado E já tem loja, não faz sentido cair no onboarding —
    // manda direto pro painel para evitar o ciclo login → onboarding → login.
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    const { data: store } = await supabase
      .from("stores")
      .select("id, subscription_status")
      .eq("owner_id", uid)
      .maybeSingle();
    if (store) {
      if (store.subscription_status !== "active") throw redirect({ to: "/lojista/aguardando" });
      throw redirect({ to: "/lojista" });
    }
  },
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  // Se o usuário chega aqui já autenticado (ex.: veio do login sem loja),
  // pré-preenchemos o email e pulamos direto para o passo da loja.
  const [alreadyAuthed, setAlreadyAuthed] = useState(false);
  // Auth
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [senha2, setSenha2] = useState("");
  const [respName, setRespName] = useState("");
  // Loja
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [bannerMobile, setBannerMobile] = useState("");
  // Arquivos escolhidos no passo 3 são enviados só depois que a loja for criada
  // (o upload precisa do storeId como pasta no bucket).
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerMobileFile, setBannerMobileFile] = useState<File | null>(null);
  const [cor1, setCor1] = useState("#7c3aed");
  const [cor2, setCor2] = useState("#f97316");
  const [modalidade, setModalidade] = useState<Modalidade>("ambos");
  const [regraP, setRegraP] = useState("1");
  const [pctC, setPctC] = useState("5");
  const [slug, setSlug] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let prefill: string | null = null;
      try { prefill = sessionStorage.getItem("onboarding_prefill_email"); } catch { /* ignore */ }
      const { data } = await supabase.auth.getSession();
      const sessEmail = data.session?.user.email ?? null;
      const meta = (data.session?.user.user_metadata ?? {}) as { full_name?: string; phone?: string };
      if (cancelled) return;
      if (sessEmail) {
        setEmail(sessEmail);
        if (meta.full_name) setRespName(meta.full_name);
        if (meta.phone) setTelefone(meta.phone);
        setAlreadyAuthed(true);
        setStep(2);
      } else if (prefill) {
        setEmail(prefill);
      }
      try { sessionStorage.removeItem("onboarding_prefill_email"); } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const finalizar = async () => {
    if (!alreadyAuthed && senha !== senha2) {
      toast.error("As senhas não coincidem");
      setStep(1);
      return;
    }
    setLoading(true);
    try {
      if (!alreadyAuthed) {
        // 1. Signup — só se não veio já logado do fluxo de login.
        const { data: signup, error: sErr } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { full_name: respName, phone: telefone } },
        });
        if (sErr) throw sErr;
        if (!signup.session) {
          const { error: liErr } = await supabase.auth.signInWithPassword({ email, password: senha });
          if (liErr) throw liErr;
        }
      }
      const s = slugify(nome);
      const loja = await criarLoja({
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
      // 2. Upload das imagens escolhidas (agora que temos storeId)
      const uploadedUrls: { logo_url?: string | null; banner_url?: string | null; banner_url_mobile?: string | null } = {};
      const doUpload = async (file: File, kind: "logo" | "banner" | "banner-mobile") => {
        const ext = (file.name.split(".").pop() || "png").toLowerCase();
        const path = `${loja.id}/${kind}-${Date.now()}.${ext}`;
        const up = await supabase.storage.from("store-assets").upload(path, file, {
          upsert: true,
          contentType: file.type || undefined,
        });
        if (up.error) throw up.error;
        const signed = await supabase.storage
          .from("store-assets")
          .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
        if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Falha ao gerar URL");
        return signed.data.signedUrl;
      };
      try {
        if (logoFile) uploadedUrls.logo_url = await doUpload(logoFile, "logo");
        if (bannerFile) uploadedUrls.banner_url = await doUpload(bannerFile, "banner");
        if (bannerMobileFile) uploadedUrls.banner_url_mobile = await doUpload(bannerMobileFile, "banner-mobile");
        if (Object.keys(uploadedUrls).length > 0) {
          await atualizarLoja({ data: uploadedUrls });
        }
      } catch (upErr) {
        // Loja criada; só falhou o upload de imagem — segue o fluxo e avisa.
        toast.warning("Loja criada, mas houve um problema no upload das imagens. Você pode enviá-las depois em Configurações.");
        console.error(upErr);
      }
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
          <span>Passo {alreadyAuthed ? step - 1 : step} de {alreadyAuthed ? 3 : 4}</span>
          {alreadyAuthed && email && (
            <span className="text-xs">• conectado como <strong>{email}</strong></span>
          )}
        </div>

        {step === 1 && !alreadyAuthed && (
          <Card><CardHeader><CardTitle>Sua conta de lojista</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><Label>Seu nome</Label><Input value={respName} onChange={(e) => setRespName(e.target.value)} placeholder="Como quer ser chamado" /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@empresa.com" /></div>
            <div><Label>Senha</Label><PasswordInput value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} /></div>
            <div>
              <Label>Confirmar senha</Label>
              <PasswordInput value={senha2} onChange={(e) => setSenha2(e.target.value)} placeholder="Repita a senha" minLength={6} />
              {senha2.length > 0 && senha !== senha2 && (
                <p className="mt-1 text-[11px] text-destructive">As senhas não coincidem</p>
              )}
            </div>
            <Button
              onClick={() => setStep(2)}
              disabled={!respName || !email || senha.length < 6 || senha !== senha2}
              className="w-full"
            >
              Próximo <ArrowRight className="h-4 w-4" />
            </Button>
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
              <OnboardingImagePicker
                label="Logo"
                hint="Recomendado: 512 × 512 px. PNG com fundo transparente até 5 MB."
                file={logoFile}
                previewUrl={logo}
                onChange={(f, url) => { setLogoFile(f); setLogo(url); }}
                square
              />
              <OnboardingImagePicker
                label="Banner (desktop)"
                hint="Recomendado: 1920 × 480 px. JPG ou PNG até 5 MB."
                file={bannerFile}
                previewUrl={banner}
                onChange={(f, url) => { setBannerFile(f); setBanner(url); }}
              />
              <OnboardingImagePicker
                label="Banner (celular)"
                hint="Recomendado: 1080 × 720 px (vertical). JPG ou PNG até 5 MB."
                file={bannerMobileFile}
                previewUrl={bannerMobile}
                onChange={(f, url) => { setBannerMobileFile(f); setBannerMobile(url); }}
              />
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
              <code className="flex-1 text-sm text-left truncate">pontuamax.com.br/{slug}</code>
              <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(`pontuamax.com.br/${slug}`); toast.success("Copiado!"); }}>
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

function OnboardingImagePicker({
  label,
  hint,
  file,
  previewUrl,
  onChange,
  square,
}: {
  label: string;
  hint: string;
  file: File | null;
  previewUrl: string;
  onChange: (file: File | null, previewUrl: string) => void;
  square?: boolean;
}) {
  // Preview local (blob URL) enquanto o upload real acontece só depois de criar a loja.
  const localUrl = file ? URL.createObjectURL(file) : previewUrl;
  const cls = square ? "h-20 w-20 object-contain bg-muted" : "w-full h-24 object-cover";
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {localUrl ? (
          <img src={localUrl} alt={label} className={`${cls} rounded-md border`} />
        ) : (
          <div className={`${cls} rounded-md border border-dashed flex items-center justify-center text-xs text-muted-foreground`}>
            <ImageIcon className="h-4 w-4 mr-1" /> sem imagem
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 5 * 1024 * 1024) {
                  toast.error("Arquivo acima de 5 MB");
                  e.currentTarget.value = "";
                  return;
                }
                onChange(f, "");
                e.currentTarget.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                <Upload className="h-3 w-3 mr-1" />
                {file || previewUrl ? "Trocar imagem" : "Enviar imagem"}
              </span>
            </Button>
          </label>
          {(file || previewUrl) && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null, "")}>
              Remover
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// Silencia warning caso Loader2 fique sem uso em alguma branch.
void Loader2;