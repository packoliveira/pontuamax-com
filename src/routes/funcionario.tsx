import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEmployeeContext } from "@/hooks/use-employee-context";
import { EMPLOYEE_MENU } from "@/lib/team-shared";
import { PontuaMaxMark, PontuaMaxWordmark } from "@/components/pontuamax-logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { LogOut, Menu, LayoutDashboard, Users, Coins, Gift, Ticket, History, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePanelTheme } from "@/hooks/use-panel-theme";

const ICONS: Record<string, any> = {
  dashboard: LayoutDashboard, clientes: Users, pontuacao: Coins,
  resgates: Gift, vouchers: Ticket, historico: History, perfil: User,
};

export const Route = createFileRoute("/funcionario")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    // rotas públicas dentro do painel do funcionário
    const publicPaths = ["/funcionario/login", "/funcionario/esqueci-senha"];
    if (publicPaths.includes(location.pathname)) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw redirect({ to: "/funcionario/login" });
    const { data: emp } = await supabase
      .from("store_employees").select("id, status, must_change_password")
      .eq("user_id", data.session.user.id).eq("status", "ativo").maybeSingle();
    if (!emp) throw redirect({ to: "/funcionario/login" });
    if (emp.must_change_password && location.pathname !== "/funcionario/trocar-senha") {
      throw redirect({ to: "/funcionario/trocar-senha" });
    }
  },
  component: FuncionarioLayout,
});

function FuncionarioLayout() {
  usePanelTheme();
  const [open, setOpen] = useState(false);
  const { data, hasAny, loading } = useEmployeeContext();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  // rotas públicas renderizam sem o chrome do painel
  if (pathname === "/funcionario/login" || pathname === "/funcionario/esqueci-senha") {
    return <Outlet />;
  }

  const visible = EMPLOYEE_MENU.filter((m) => hasAny(m.requires));

  const doLogout = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/funcionario/login", replace: true });
  };

  const Brand = () => (
    <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
      <PontuaMaxMark size={32} />
      <div className="min-w-0">
        <PontuaMaxWordmark variant="dark" size={15} />
        <div className="text-xs text-white/50 truncate max-w-[140px]">
          {data?.store?.nome_fantasia ?? "Painel do funcionário"}
        </div>
      </div>
    </div>
  );

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-0.5 p-3">
      {visible.map((item) => {
        const active = item.to === "/funcionario" ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = ICONS[item.key] ?? LayoutDashboard;
        return (
          <Link
            key={item.key}
            to={item.to as "/funcionario"}
            onClick={onClick}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-white/[0.08] text-white shadow-[inset_2px_0_0_0_#14CBA8]"
                : "text-white/70 hover:bg-white/5 hover:text-white hover:translate-x-0.5",
            )}
          >
            <Icon className={cn("h-4 w-4 transition-colors", active ? "text-[#14CBA8]" : "text-white/60 group-hover:text-white/90")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="hidden md:flex md:w-64 md:flex-col bg-[#0B132B] text-white">
        <Brand />
        <div className="flex-1"><NavList /></div>
        <div className="p-3 border-t border-white/10">
          <Button variant="ghost" size="sm" className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white" onClick={doLogout}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur px-3 py-2">
          <div className="flex items-center gap-2">
            <PontuaMaxMark size={28} />
            <PontuaMaxWordmark variant="light" size={16} />
          </div>
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-11 w-11" onClick={doLogout} aria-label="Sair"><LogOut className="h-5 w-5" /></Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Menu"><Menu className="h-5 w-5" /></Button></SheetTrigger>
              <SheetContent side="left" className="p-0 w-[85vw] max-w-xs bg-[#0B132B] text-white border-r-0 overflow-y-auto">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Brand />
                <NavList onClick={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main key={pathname} className="flex-1 p-3 sm:p-4 md:p-8 min-w-0 animate-panel-in">
          {loading ? <div className="text-sm text-muted-foreground">Carregando…</div> : <Outlet />}
        </main>
      </div>
    </div>
  );
}