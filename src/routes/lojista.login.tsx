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
import { PontoaMaxMark, PontoaMaxWordmark } from "@/components/pontoamax-logo";
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
    <div className="min-h-dvh grid lg:grid-cols-2 bg-[#F8FAFC]">
      {/* Lado esquerdo — ilustração abstrata com degradê da marca */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden p-12 text-white bg-[#0B132B]">
        {/* Blobs em degradê roxo → azul → verde-água */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs>
            <linearGradient id="pm-blob-a" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#6D28D9" />
              <stop offset="55%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#14CBA8" />
            </linearGradient>
            <radialGradient id="pm-blob-b" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#14CBA8" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#14CBA8" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="pm-blob-c" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#6D28D9" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#6D28D9" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="600" height="800" fill="#0B132B" />
          <circle cx="120" cy="180" r="260" fill="url(#pm-blob-c)" />
          <circle cx="520" cy="640" r="300" fill="url(#pm-blob-b)" />
          <g opacity="0.85">
            <rect x="380" y="120" width="180" height="180" rx="40" fill="url(#pm-blob-a)" transform="rotate(18 470 210)" opacity="0.35" />
            <rect x="60" y="480" width="220" height="220" rx="60" fill="url(#pm-blob-a)" transform="rotate(-14 170 590)" opacity="0.3" />
            <circle cx="480" cy="360" r="70" fill="none" stroke="url(#pm-blob-a)" strokeWidth="2" opacity="0.5" />
            <circle cx="280" cy="260" r="120" fill="none" stroke="url(#pm-blob-a)" strokeWidth="2" opacity="0.4" />
            <circle cx="200" cy="720" r="90" fill="none" stroke="url(#pm-blob-a)" strokeWidth="2" opacity="0.35" />
          </g>
          {/* Grid sutil */}
          <g stroke="#FFFFFF" strokeOpacity="0.04" strokeWidth="1">
            {Array.from({ length: 12 }).map((_, i) => (
              <line key={`v${i}`} x1={i * 55} y1="0" x2={i * 55} y2="800" />
            ))}
            {Array.from({ length: 16 }).map((_, i) => (
              <line key={`h${i}`} x1="0" y1={i * 55} x2="600" y2={i * 55} />
            ))}
          </g>
        </svg>

        <div className="relative z-10 flex items-center gap-3">
          <PontoaMaxMark size={36} />
          <PontoaMaxWordmark variant="dark" size={22} />
        </div>

        <div className="relative z-10 max-w-md space-y-4">
          <h2 className="text-3xl font-bold leading-tight tracking-tight">
            A plataforma completa de fidelização, cashback e CRM.
          </h2>
          <p className="text-white/70">
            Confiança, inteligência e crescimento em uma experiência SaaS moderna.
          </p>
          <div className="flex gap-8 pt-4 text-sm">
            <div>
              <div className="text-2xl font-bold">+30%</div>
              <div className="text-white/60">Recompra</div>
            </div>
            <div>
              <div className="text-2xl font-bold">-40%</div>
              <div className="text-white/60">Churn</div>
            </div>
            <div>
              <div className="text-2xl font-bold">2x</div>
              <div className="text-white/60">Ticket médio</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Lado direito — card de login */}
      <div className="flex items-center justify-center p-6 md:p-10">
        <Card className="w-full max-w-md rounded-2xl border-[#E5E7EB] shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto lg:hidden flex flex-col items-center gap-2">
              <PontoaMaxMark size={44} />
              <PontoaMaxWordmark variant="light" size={18} />
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
              className="w-full rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8] shadow-sm transition-all duration-200"
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
              <Link to="/lojista/onboarding" className="underline text-[#2563EB]">Criar minha loja</Link>
            </p>
          </form>
        </CardContent>
        </Card>
        <EsqueciSenhaDialog open={forgotOpen} onOpenChange={setForgotOpen} defaultEmail={email} />
      </div>
    </div>
  );
}