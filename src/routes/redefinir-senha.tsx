import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { traduzirErroAuth } from "@/lib/auth-errors";

export const Route = createFileRoute("/redefinir-senha")({
  ssr: false,
  component: Page,
  head: () => ({
    meta: [
      { title: "Redefinir senha · PontuaMax" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
});

function Page() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validSession, setValidSession] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [role, setRole] = useState<"admin" | "lojista" | "cliente" | null>(null);

  useEffect(() => {
    // Supabase coloca o token no hash (#access_token=...&type=recovery).
    // O client detecta e cria a sessão automaticamente via detectSessionInUrl.
    let cancelled = false;

    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setValidSession(true);
        // Descobre o papel para redirecionar depois.
        const uid = data.session.user.id;
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", uid);
        const list = (roles ?? []).map((r) => r.role);
        if (list.includes("admin")) setRole("admin");
        else if (list.includes("lojista")) setRole("lojista");
        else setRole("cliente");
      } else {
        setValidSession(false);
      }
      setReady(true);
    };

    // Escuta o evento PASSWORD_RECOVERY, disparado quando o link chega com token válido.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") checkSession();
    });

    // Chama uma vez pra cobrir o caso em que a sessão já existe quando o componente monta.
    checkSession();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (senha.length < 8) return setErro("A senha precisa ter no mínimo 8 caracteres.");
    if (senha !== confirma) return setErro("As senhas não coincidem.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setLoading(false);
    if (error) {
      setErro(traduzirErroAuth(error));
      return;
    }
    setDone(true);
    toast.success("Senha redefinida!");
    setTimeout(() => {
      if (role === "admin") navigate({ to: "/admin" });
      else if (role === "lojista") navigate({ to: "/lojista" });
      else navigate({ to: "/" });
    }, 1500);
  };

  return (
    <div className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-slate-100 to-violet-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-600 text-white">
            <Lock className="h-6 w-6" />
          </div>
          <CardTitle className="mt-4">Redefinir senha</CardTitle>
          <CardDescription>Escolha uma nova senha para sua conta</CardDescription>
        </CardHeader>
        <CardContent>
          {!ready && (
            <div className="flex items-center justify-center py-6 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" /> Validando link...
            </div>
          )}

          {ready && !validSession && (
            <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive space-y-2">
              <div className="flex items-center gap-2 font-medium"><AlertCircle className="h-4 w-4" /> Link inválido ou expirado</div>
              <p>Peça um novo link em "Esqueci minha senha".</p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/lojista/login" })}>Login lojista</Button>
                <Button size="sm" variant="outline" onClick={() => navigate({ to: "/admin/login" })}>Login admin</Button>
              </div>
            </div>
          )}

          {ready && validSession && done && (
            <div className="rounded-md border border-green-300 bg-green-50 p-4 text-sm text-green-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Senha atualizada! Redirecionando...
            </div>
          )}

          {ready && validSession && !done && (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="nova">Nova senha</Label>
                <PasswordInput id="nova" value={senha} onChange={(e) => setSenha(e.target.value)} required autoComplete="new-password" minLength={8} />
                <p className="text-[11px] text-muted-foreground">Mínimo 8 caracteres.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="conf">Confirmar nova senha</Label>
                <PasswordInput id="conf" value={confirma} onChange={(e) => setConfirma(e.target.value)} required autoComplete="new-password" minLength={8} />
              </div>
              {erro && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{erro}</span>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (<><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</>) : "Redefinir senha"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}