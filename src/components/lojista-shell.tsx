import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, ShoppingCart, Users, Package, Gift, Settings, LogOut, Menu, Megaphone, Zap, Ticket, FileText, Trophy, Code, ExternalLink, Copy, Check, Star, Instagram } from "lucide-react";
import { PontoaMaxMark } from "@/components/pontoamax-logo";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { myStoreQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; exact?: boolean };
const nav: NavItem[] = [
  { to: "/lojista", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/lojista/lancar-venda", label: "Lançar venda", icon: ShoppingCart },
  { to: "/lojista/clientes", label: "Clientes", icon: Users },
  { to: "/lojista/produtos", label: "Produtos", icon: Package },
  { to: "/lojista/resgates", label: "Resgates", icon: Gift },
  { to: "/lojista/campanhas", label: "Campanhas", icon: Megaphone },
  { to: "/lojista/promocoes", label: "Promoções", icon: Zap },
  { to: "/lojista/vale-presente", label: "Vale-presente", icon: Ticket },
  { to: "/lojista/notas", label: "Notas fiscais", icon: FileText },
  { to: "/lojista/sorteios", label: "Sorteios", icon: Trophy },
  { to: "/lojista/instagram", label: "Posts do Instagram", icon: Instagram },
  { to: "/lojista/nps", label: "NPS", icon: Star },
  { to: "/lojista/widget", label: "Widget", icon: Code },
  { to: "/lojista/configuracoes", label: "Configurações", icon: Settings },
];

export function LojistaShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const [copied, setCopied] = useState(false);

  const publicUrl = loja?.slug
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/${loja.slug}`
    : null;

  const copyLink = async () => {
    if (!publicUrl) return;
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const PublicLinkCard = () =>
    loja?.slug ? (
      <div className="mx-3 my-2 rounded-md border bg-muted/40 p-2 text-xs">
        <div className="mb-1 text-muted-foreground">Sua página pública</div>
        <div className="flex items-center gap-1">
          <a
            href={`/${loja.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate font-mono text-foreground hover:underline"
            title={publicUrl ?? ""}
          >
            /{loja.slug}
          </a>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copyLink} title="Copiar link">
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" asChild title="Abrir">
            <a href={`/${loja.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>
    ) : null;

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
      <PontoaMaxMark size={32} />
      <div>
        <div className="text-sm font-semibold tracking-tight">
          <span className="text-primary">Pontoa</span>
          <span style={{ color: "#22C55E" }}>Max</span>
        </div>
        <div className="text-xs text-muted-foreground truncate max-w-[140px]">{loja?.nome_fantasia ?? "—"}</div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden md:flex md:w-64 md:flex-col border-r bg-background">
        <Brand />
        <PublicLinkCard />
        <div className="flex-1"><NavList /></div>
        <div className="p-3 border-t flex items-center gap-2">
          <Button variant="ghost" size="sm" className="flex-1 justify-start" onClick={doLogout}>
            <LogOut className="h-4 w-4" /> Sair
          </Button>
          <ThemeToggle />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between border-b bg-background px-4 py-3">
          <div className="flex items-center gap-2">
            <PontoaMaxMark size={28} />
            <span className="font-semibold tracking-tight">
              <span className="text-primary">Pontoa</span>
              <span style={{ color: "#22C55E" }}>Max</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={doLogout} title="Sair" aria-label="Sair">
              <LogOut className="h-5 w-5" />
            </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <Brand />
              <PublicLinkCard />
              <NavList onClick={() => setOpen(false)} />
              <div className="p-3 border-t">
                <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => { setOpen(false); doLogout(); }}>
                  <LogOut className="h-4 w-4" /> Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}