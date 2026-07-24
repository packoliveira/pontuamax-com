import { Link, useRouterState } from "@tanstack/react-router";
import { PontuaMaxMark } from "@/components/pontuamax-logo";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

const NAV = [
  { to: "/", label: "Início" },
  { to: "/lojistas", label: "Para lojistas" },
  { to: "/como-funciona", label: "Como funciona" },
  { to: "/planos", label: "Planos" },
] as const;

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-[#FAFAF7]/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 sm:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label="PontuaMax">
          <PontuaMaxMark size={30} />
        </Link>
        <nav className="hidden flex-1 items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-[#0B0F1A] text-white"
                    : "text-[#0B0F1A]/70 hover:bg-black/5 hover:text-[#0B0F1A]",
                )}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/lojista/login"
            className="hidden text-[13px] font-medium text-[#0B0F1A]/70 hover:text-[#0B0F1A] sm:inline-block"
          >
            Entrar
          </Link>
          <Link
            to="/lojista/onboarding"
            className="group inline-flex items-center gap-1.5 rounded-full bg-[#0B0F1A] px-4 py-2 text-[13px] font-semibold text-white transition-transform hover:-translate-y-[1px]"
          >
            Criar loja grátis
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
        </div>
      </div>
      {/* Mobile nav row */}
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto border-t border-black/5 px-5 py-2 md:hidden">
        {NAV.map((n) => {
          const active = n.to === "/" ? pathname === "/" : pathname.startsWith(n.to);
          return (
            <Link
              key={n.to}
              to={n.to}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-[#0B0F1A] text-white"
                  : "text-[#0B0F1A]/70 hover:bg-black/5",
              )}
            >
              {n.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-black/10 bg-[#0B0F1A] text-white/80">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-white p-1.5">
              <PontuaMaxMark size={22} />
            </div>
          </div>
          <p className="mt-5 max-w-sm font-display text-2xl leading-[1.15] text-white">
            Fidelidade brasileira, feita com carinho para quem vive de recorrência.
          </p>
          <p className="mt-6 text-xs text-white/50">
            © {new Date().getFullYear()} PontuaMax. CNPJ 00.000.000/0001-00 · São Paulo, BR.
          </p>
        </div>
        <FooterCol title="Produto" items={[
          { label: "Para lojistas", to: "/lojistas" },
          { label: "Como funciona", to: "/como-funciona" },
          { label: "Planos", to: "/planos" },
        ]} />
        <FooterCol title="Acesso" items={[
          { label: "Entrar lojista", to: "/lojista/login" },
          { label: "Portal do vendedor", to: "/funcionario/login" },
          { label: "Criar loja grátis", to: "/lojista/onboarding" },
        ]} />
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
            Fale conosco
          </div>
          <a
            href="mailto:oi@pontuamax.com"
            className="mt-4 block font-display text-xl text-white hover:underline"
          >
            oi@pontuamax.com
          </a>
          <a
            href="https://wa.me/5511000000000"
            className="mt-1 block text-sm text-white/60 hover:text-white"
          >
            WhatsApp comercial
          </a>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  items,
}: {
  title: string;
  items: { label: string; to: string }[];
}) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-white/50">
        {title}
      </div>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((i) => (
          <li key={i.to}>
            <Link to={i.to} className="text-white/80 hover:text-white">
              {i.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#FAFAF7] text-[#0B0F1A] antialiased">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}