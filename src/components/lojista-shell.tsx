import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ShoppingCart, Users, Package, Gift, Settings, LogOut, Menu, Sparkles, Megaphone, Zap } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { myStoreQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/lojista", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/lojista/lancar-venda", label: "Lançar venda", icon: ShoppingCart },
  { to: "/lojista/clientes", label: "Clientes", icon: Users },
  { to: "/lojista/produtos", label: "Produtos", icon: Package },
  { to: "/lojista/resgates", label: "Resgates", icon: Gift },
  { to: "/lojista/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/lojista/promocoes", label: "Promoções", icon: Zap },
  { to: "/lojista/configuracoes", label: "Configurações", icon: Settings },
];

export function LojistaShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());

  const doLogout = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/lojista/login", replace: true });
  };

  const NavList = ({ onClick }: { onClick?: () => void }) => (
    <nav className="flex flex-col gap-1 p-3">
      {nav.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to as "/lojista"}
            onClick={onClick}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-2 px-4 py-4 border-b">
      <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
        <Sparkles className="h-4 w-4" />
      </div>
      <div>
        <div className="text-sm font-semibold">QSF Club</div>
        <div className="text-xs text-muted-foreground truncate max-w-[140px]">{loja?.nome_fantasia ?? "—"}</div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-background">
        <Brand />
        <div className="flex-1"><NavList /></div>
        <div className="p-3 border-t">
          <Button variant="ghost" size="sm" className="w-full justify-start" onClick={doLogout}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold">QSF Club</span>
          </div>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Brand />
              <NavList onClick={() => setOpen(false)} />
              <div className="p-3 border-t">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setOpen(false); doLogout(); }}>
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}