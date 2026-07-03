import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isCurrentUserAdmin, bootstrapFirstAdmin } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldAlert, Lock } from "lucide-react";
import { toast } from "sonner";
import { traduzirErroAuth } from "@/lib/auth-errors";

export const Route = createFileRoute("/admin/login")({
  ssr: false,
  beforeLoad: async () => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return; // não logado: mostra a tela de login normalmente
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (isAdmin) throw redirect({ to: "/admin" });
    // Logado mas não é admin → bloqueia ANTES de qualquer signOut e redireciona.
    try {
      sessionStorage.setItem(
        "auth_flash",
        "Esta área é exclusiva do admin master. Use o login do lojista.",
      );
    } catch { /* ignore */ }
    const { data: store } = await supabase
      .from("stores")
      .select("id")
      .eq("owner_id", uid)
      .maybeSingle();
    throw redirect({ to: store ? "/lojista" : "/lojista/login" });
  },
  component: AdminLogin,
});

function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);
  const [showBootstrap, setShowBootstrap] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowBootstrap(false);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
      if (error) throw error;
      const check = await isCurrentUserAdmin();
      if (check.isAdmin) {
        navigate({ to: "/admin" });
        return;
      }
      // Não é admin. Tenta bootstrap (só funciona se não houver NENHUM admin ainda).
      const boot = await bootstrapFirstAdmin();
      if (boot.promoted) {
        toast.success("Você foi promovido a administrador master.");
        navigate({ to: "/admin" });
        return;
      }
      // Não é admin e já existe admin no sistema.
      // Se o usuário for lojista (dono de loja), NÃO desloga — só o manda pro painel dele.
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (uid) {
        const { data: store } = await supabase
          .from("stores")
          .select("id")
          .eq("owner_id", uid)
          .maybeSingle();
        if (store) {
          toast.info("Esta área é do admin master. Redirecionando para o painel do lojista...");
          navigate({ to: "/lojista" });
          return;
        }
      }
      // Usuário sem loja e sem role admin: nega acesso e desloga.
      await supabase.auth.signOut();
      toast.error("Acesso negado: esta área é exclusiva do administrador master do sistema.");
    } catch (err) {
      toast.error(traduzirErroAuth(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-red-950 p-4 flex items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-center text-xs uppercase tracking-widest text-red-200 flex items-center justify-center gap-2">
          <ShieldAlert className="h-4 w-4" />
          Painel Administrativo — Acesso Restrito
        </div>
        <Card className="border-red-500/30 bg-slate-900/80 text-slate-100 shadow-2xl backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-red-600 text-white shadow-lg shadow-red-900/50">
              <Lock className="h-7 w-7" />
            </div>
            <CardTitle className="mt-4 text-slate-50">Login do Admin Master</CardTitle>
            <CardDescription className="text-slate-400">
              Somente usuários com permissão de administrador podem entrar aqui.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-slate-200">Email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-senha" className="text-slate-200">Senha</Label>
                <PasswordInput
                  id="admin-senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-500 text-white"
              >
                {loading ? "Verificando..." : "Entrar no painel master"}
              </Button>
              {showBootstrap && (
                <p className="text-[11px] text-center text-slate-400">
                  Se este é o primeiro admin do sistema, o acesso é liberado automaticamente após o login.
                </p>
              )}
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-500">
          É lojista?{" "}
          <a href="/lojista/login" className="underline hover:text-slate-300">Ir para o login do lojista</a>
        </p>
      </div>
    </div>
  );
}