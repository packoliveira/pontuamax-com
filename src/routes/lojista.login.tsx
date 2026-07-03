import { createFileRoute, useNavigate, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { traduzirErroAuth } from "@/lib/auth-errors";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Sparkles } from "lucide-react";
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) return toast.error(traduzirErroAuth(error));
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
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              Você está conectado como <strong>{sessionEmail}</strong>, mas essa conta ainda não tem loja.
              <button
                type="button"
                className="ml-2 underline"
                onClick={async () => {
                  await supabase.auth.signOut();
                  setSessionEmail(null);
                }}
              >
                Sair
              </button>
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
            <Button type="submit" className="w-full" disabled={loading}>{loading ? "Entrando..." : "Entrar"}</Button>
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