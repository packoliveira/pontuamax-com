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
      // Deixa entrar — a página oferece bootstrap se ainda não houver admin.
      // Se já existir admin, admin.index bloqueia normalmente.
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  usePanelTheme();
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
        <Outlet />
      </main>
    </div>
  );
}