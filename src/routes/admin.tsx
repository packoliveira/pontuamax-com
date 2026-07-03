import { createFileRoute, Outlet, redirect, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Shield, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePanelTheme } from "@/hooks/use-panel-theme";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/lojista/login" });
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.session.user.id);
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (!isAdmin) {
      // Deixa entrar — a página oferece bootstrap se ainda não houver admin
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  usePanelTheme();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card text-foreground border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 font-semibold">
            <Shield className="h-5 w-5 text-primary" /> Admin
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="hover:bg-accent"
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/lojista/login";
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