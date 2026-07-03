import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LogOut, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePanelTheme } from "@/hooks/use-panel-theme";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // /admin/login é público
    if (location.pathname === "/admin/login") return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/admin/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      // Se ainda não existe NENHUM admin no sistema, deixa entrar
      // para permitir bootstrap do primeiro admin.
      const { count } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) > 0) {
        return { accessDenied: true as const };
      }
    }
    return { accessDenied: false as const };
  },
  component: AdminLayout,
});

function AdminLayout() {
  usePanelTheme();
  const ctx = Route.useRouteContext();
  // A rota /admin/login usa layout próprio (dark) — não renderiza este shell.
  if (typeof window !== "undefined" && window.location.pathname === "/admin/login") {
    return <Outlet />;
  }
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-red-600 text-white text-center text-[11px] uppercase tracking-widest py-1 flex items-center justify-center gap-1.5">
        <ShieldAlert className="h-3.5 w-3.5" />
        Painel Administrativo Master — Acesso Restrito
      </div>
      <header className="bg-slate-900 text-slate-100 border-b border-red-500/40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-red-400" />
            <span>Admin Master</span>
            <span className="ml-2 rounded bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white">
              ADMIN
            </span>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-100 hover:bg-slate-800"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/admin/login";
            }}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        {ctx?.accessDenied ? <AccessDenied /> : <Outlet />}
      </main>
    </div>
  );
}

function AccessDenied() {
  return (
    <div className="max-w-lg mx-auto mt-12">
      <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-8 text-center space-y-4">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold">Acesso negado</h1>
        <p className="text-sm text-muted-foreground">
          Esta área é exclusiva do <strong>Administrador Master</strong> do QSF Club.
          Sua conta não tem essa permissão.
        </p>
        <p className="text-xs text-muted-foreground">
          Se você é lojista, use o painel do lojista. Se acredita que deveria ter
          acesso, peça a um admin master que te adicione.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button asChild variant="outline">
            <a href="/lojista">Ir para o painel do lojista</a>
          </Button>
          <Button
            variant="destructive"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/admin/login";
            }}
          >
            Sair e entrar com outra conta
          </Button>
        </div>
      </div>
    </div>
  );
}