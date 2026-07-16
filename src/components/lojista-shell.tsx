import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Gift,
  Settings,
  LogOut,
  Menu,
  Megaphone,
  Zap,
  Ticket,
  FileText,
  Trophy,
  Code,
  ExternalLink,
  Copy,
  Check,
  Star,
  Instagram,
  UserCog,
  Palette,
} from "lucide-react";
import { PontuaMaxMark, PontuaMaxWordmark } from "@/components/pontuamax-logo";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { myStoreQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsBell } from "@/components/notifications-bell";

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
  { to: "/lojista/equipe", label: "Equipe", icon: UserCog },
  { to: "/lojista/personalizacao", label: "Personalização", icon: Palette },
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
      <div className="mx-3 my-2 rounded-lg border border-white/10 bg-white/5 p-2 text-xs">
        <div className="mb-1 text-white/60">Sua página pública</div>
        <div className="flex items-center gap-1">
          <a
            href={`/${loja.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate font-mono text-white hover:underline"
            title={publicUrl ?? ""}
          >
            /{loja.slug}
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/80 hover:bg-white/10 hover:text-white"
            onClick={copyLink}
            title="Copiar link"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-white/80 hover:bg-white/10 hover:text-white"
            asChild
            title="Abrir"
          >
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
    <nav className="flex flex-col gap-0.5 p-3">
      {nav.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        const Icon = item.icon;
        return (
          <Link
            key={item.to}
            to={item.to as "/lojista"}
            onClick={onClick}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "bg-white/[0.08] text-white shadow-[inset_2px_0_0_0_#14CBA8]"
                : "text-white/70 hover:bg-white/5 hover:text-white hover:translate-x-0.5",
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 transition-colors",
                active ? "text-[#14CBA8]" : "text-white/60 group-hover:text-white/90",
              )}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div className="flex items-center gap-2 px-4 py-4 border-b border-white/10">
      <PontuaMaxMark size={32} />
      <div className="min-w-0">
        <PontuaMaxWordmark variant="dark" size={15} />
        <div className="text-xs text-white/50 truncate max-w-[140px]">
          {loja?.nome_fantasia ?? "—"}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <aside className="hidden md:flex md:w-64 md:flex-col bg-[#0B132B] text-white">
        <Brand />
        <PublicLinkCard />
        <div className="flex-1">
          <NavList />
        </div>
        <div className="p-3 border-t border-white/10 flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex-1 justify-start text-white/80 hover:bg-white/10 hover:text-white"
            onClick={doLogout}
          >
            <LogOut className="h-4 w-4" /> Sair
          </Button>
          <NotificationsBell variant="dark" />
          <ThemeToggle />
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden sticky top-0 z-30 flex items-center justify-between border-b bg-background/95 backdrop-blur px-3 py-2">
          <div className="flex items-center gap-2">
            <PontuaMaxMark size={28} />
            <PontuaMaxWordmark variant="light" size={16} />
          </div>
          <div className="flex items-center gap-0.5">
            <NotificationsBell />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11"
              onClick={doLogout}
              title="Sair"
              aria-label="Sair"
            >
              <LogOut className="h-5 w-5" />
            </Button>
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-11 w-11" aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="p-0 w-[85vw] max-w-xs bg-[#0B132B] text-white border-r-0 overflow-y-auto"
              >
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <Brand />
                <PublicLinkCard />
                <NavList onClick={() => setOpen(false)} />
                <div className="p-3 border-t border-white/10">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
                    onClick={() => {
                      setOpen(false);
                      doLogout();
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Sair
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>
        <main key={pathname} className="flex-1 p-3 sm:p-4 md:p-8 min-w-0 animate-panel-in">
          {children}
        </main>
      </div>
    </div>
  );
}
