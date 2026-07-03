import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { traduzirErroAuth, isCredenciaisInvalidas } from "@/lib/auth-errors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles, Loader2, Store, AlertCircle } from "lucide-react";
import { toast } from "sonner";

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-orange-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Sparkles className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4">Painel do lojista</CardTitle>
          <CardDescription>Entre com o email cadastrado</CardDescription>
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Verificando credenciais e loja...</>) : "Entrar"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Ainda não tem loja?{" "}
              <Link to="/lojista/onboarding" className="underline text-violet-700">Criar minha loja</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}