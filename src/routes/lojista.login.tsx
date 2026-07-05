import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { traduzirErroAuth, isCredenciaisInvalidas } from "@/lib/auth-errors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Store, AlertCircle } from "lucide-react";
import { PontoaMaxMark } from "@/components/pontoamax-logo";
import { toast } from "sonner";
import { EsqueciSenhaDialog } from "@/components/esqueci-senha-dialog";

export const Route = createFileRoute("/lojista/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    // Já logado: só redireciona pro painel se realmente tem loja.
    // Se não tem loja, mostra o form de login (com opção de sair) —
    // não força onboarding, senão quem só queria trocar de conta fica preso.
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", uid)
      .maybeSingle();
    if (store) throw redirect({ to: "/lojista" });
  },
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<"cred" | "store" | "other" | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  useEffect(() => {
    try {
      const msg = sessionStorage.getItem("auth_flash");
      if (msg) {
        toast.info(msg);
        sessionStorage.removeItem("auth_flash");
      }
    } catch { /* ignore */ }
    supabase.auth.getSession().then(({ data }) => {
      setSessionEmail(data.session?.user.email ?? null);
    });
  }, []);

  const goCriarLoja = (prefillEmail?: string | null) => {
    try {
      if (prefillEmail) sessionStorage.setItem("onboarding_prefill_email", prefillEmail);
    } catch { /* ignore */ }
    navigate({ to: "/lojista/onboarding" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setErrorKind(null);
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      setLoading(false);
      const cred = isCredenciaisInvalidas(error);
      const msg = cred ? "Email ou senha incorretos. Confira os dados e tente de novo." : traduzirErroAuth(error);
      setErrorKind(cred ? "cred" : "other");
      setErrorMsg(msg);
      return;
    }
    // Login OK — confirma que existe loja para essa conta antes de redirecionar.
    const uid = data.session?.user.id;
    if (!uid) {
      setLoading(false);
      setErrorKind("other");
      setErrorMsg("Não foi possível iniciar sua sessão. Tente novamente.");
      return;
    }
    const { data: store, error: sErr } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", uid)
      .maybeSingle();
    setLoading(false);
    if (sErr) {
      setErrorKind("other");
      setErrorMsg("Login feito, mas não conseguimos carregar sua loja. Recarregue a página.");
      return;
    }
    if (!store) {
      setSessionEmail(email);
      setErrorKind("store");
      setErrorMsg("Login válido, mas essa conta ainda não tem loja cadastrada.");
      return;
    }
    navigate({ to: "/lojista" });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[#F8FAFC]">
      {/* Lado esquerdo — ilustração abstrata */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white"
        style={{ background: "linear-gradient(135deg, #0F4CD7 0%, #155EEF 50%, #1E40AF 100%)" }}>
        <div className="relative z-10 flex items-center gap-3">
          <div className="rounded-lg bg-white/10 p-1.5 backdrop-blur">
            <PontoaMaxMark size={28} />
          </div>
          <span className="text-xl font-semibold tracking-tight">
            <span className="text-white">Pontoa</span>
            <span style={{ color: "#4ADE80" }}>Max</span>
          </span>
        </div>

        {/* Ilustração: nós conectados representando relacionamento e crescimento */}
        <svg className="absolute inset-0 h-full w-full opacity-40" viewBox="0 0 600 800" fill="none" aria-hidden="true">
          <defs>
            <radialGradient id="glow" cx="50%" cy="30%" r="70%">
              <stop offset="0%" stopColor="#22C55E" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#155EEF" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="600" height="800" fill="url(#glow)" />
          <g stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="1.5" fill="none">
            <path d="M60 620 Q 200 420 340 500 T 560 260" />
            <path d="M80 700 Q 240 560 380 600 T 580 380" />
            <path d="M40 500 Q 180 320 300 380 T 540 160" />
          </g>
          <g fill="#FFFFFF">
            <circle cx="60" cy="620" r="6" />
            <circle cx="340" cy="500" r="6" />
            <circle cx="560" cy="260" r="6" />
            <circle cx="80" cy="700" r="5" />
            <circle cx="380" cy="600" r="5" />
            <circle cx="300" cy="380" r="5" />
          </g>
          <g fill="#22C55E">
            <circle cx="540" cy="160" r="9" />
            <circle cx="580" cy="380" r="7" />
          </g>
        </svg>

        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            Fidelize, engaje e faça seu negócio crescer.
          </h2>
          <p className="text-white/80">
            Pontos, cashback, CRM e campanhas em uma única plataforma moderna e minimalista.
          </p>
          <div className="flex gap-6 pt-4 text-sm">
            <div>
              <div className="text-2xl font-bold">+30%</div>
              <div className="text-white/70">Recompra</div>
            </div>
            <div>
              <div className="text-2xl font-bold">-40%</div>
              <div className="text-white/70">Churn</div>
            </div>
            <div>
              <div className="text-2xl font-bold">2x</div>
              <div className="text-white/70">Ticket médio</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Lado direito — card de login */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md rounded-2xl border-[#E2E8F0] shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto lg:hidden">
              <PontoaMaxMark size={44} />
            </div>
            <CardTitle className="mt-2 text-2xl">Bem-vindo de volta</CardTitle>
            <CardDescription>Entre no painel do lojista PontoaMax</CardDescription>
          </CardHeader>
        <CardContent>
          {sessionEmail && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-2">
              <p>
                Você está conectado como <strong>{sessionEmail}</strong>, mas essa conta ainda não tem loja.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="h-8"
                  onClick={() => goCriarLoja(sessionEmail)}
                >
                  <Store className="h-3.5 w-3.5" /> Criar minha loja com esta conta
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    setSessionEmail(null);
                    setErrorMsg(null);
                    setErrorKind(null);
                  }}
                >
                  Sair desta conta
                </Button>
              </div>
            </div>
          )}
          {errorMsg && errorKind !== "store" && (
            <div className="mb-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <PasswordInput id="senha" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button
              type="submit"
              className="w-full rounded-xl bg-[#155EEF] text-white hover:bg-[#0F4CD7] transition-all duration-200"
              disabled={loading}
            >
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Verificando credenciais e loja...</>) : "Entrar"}
            </Button>
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="block mx-auto text-xs text-muted-foreground hover:text-foreground underline"
            >
              Esqueci minha senha
            </button>
            <p className="text-xs text-center text-muted-foreground">
              Ainda não tem loja?{" "}
              <Link to="/lojista/onboarding" className="underline text-[#155EEF]">Criar minha loja</Link>
            </p>
          </form>
        </CardContent>
        </Card>
        <EsqueciSenhaDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={email} />
      </div>
    </div>
  );
}