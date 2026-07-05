import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Store,
  Star,
  Wallet,
  Palette,
  Coins,
  Gift,
  Users,
  ArrowRight,
  Trophy,
} from "lucide-react";
import { PontoaMaxMark } from "@/components/pontoamax-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PontoaMax — Fidelize seus clientes com pontos, cashback e CRM" },
      { name: "description", content: "Plataforma SaaS premium de fidelização, cashback, CRM e relacionamento com clientes, com página personalizada por loja." },
      { property: "og:title", content: "PontoaMax" },
      { property: "og:description", content: "Fidelização, cashback e CRM em uma plataforma moderna." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <PontoaMaxMark size={36} />
          <span className="text-lg font-semibold tracking-tight">
            <span style={{ color: "#155EEF" }}>Pontoa</span>
            <span style={{ color: "#22C55E" }}>Max</span>
          </span>
        </div>
        <Link to="/lojista/login">
          <Button variant="ghost" size="sm" className="text-[#0F172A] hover:bg-[#155EEF]/5">Entrar como lojista</Button>
        </Link>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-[#0F172A] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              Fidelização • Cashback • CRM
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Fidelize e faça<br />
              <span style={{ color: "#155EEF" }}>seu negócio crescer</span>
            </h1>
            <p className="mt-6 text-lg text-[#64748B] md:text-xl">
              Plataforma SaaS premium de pontos, cashback, CRM e campanhas — com uma página personalizada por loja.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
              <Link to="/lojista/onboarding">
                <Button size="lg" className="w-full bg-[#155EEF] text-white hover:bg-[#0F4CD7] rounded-xl sm:w-auto">
                  <Store className="h-4 w-4" /> Criar minha loja
                </Button>
              </Link>
              <Link to="/lojista/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-[#155EEF]/30 text-[#155EEF] hover:bg-[#155EEF]/5 rounded-xl sm:w-auto"
                >
                  Já sou lojista, entrar
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-[#64748B]">
              Cada loja terá seu próprio link: pontoamax.app/<span className="font-mono">nomedaloja</span>
            </p>
          </div>

          <div className="flex justify-center md:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 md:grid-cols-3">
          <FeatureCard
            icon={<Star className="h-5 w-5" />}
            title="Pontos por compra"
            desc="Cliente acumula a cada compra e troca por prêmios no seu catálogo."
          />
          <FeatureCard
            icon={<Wallet className="h-5 w-5" />}
            title="Cashback automático"
            desc="Devolva uma % em crédito e traga o cliente de volta pra gastar."
          />
          <FeatureCard
            icon={<Palette className="h-5 w-5" />}
            title="Página com sua marca"
            desc="Logo, cores e catálogo próprios num link exclusivo da sua loja."
          />
        </div>
      </section>

      {/* MOCKUP DASHBOARD */}
      <section className="mx-auto max-w-6xl px-6 py-16 md:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Um painel completo pro lojista
          </h2>
          <p className="mt-4 text-[#64748B] md:text-lg">
            Acompanhe clientes, pontos distribuídos e resgates em tempo real.
          </p>
        </div>
        <div className="mt-12">
          <DashboardMockup />
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/lojista/onboarding">
            <Button size="lg" className="w-full bg-[#155EEF] text-white hover:bg-[#0F4CD7] rounded-xl sm:w-auto">
              Criar minha loja grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-[#64748B]">
        © {new Date().getFullYear()} PontoaMax. Fidelização, cashback e CRM em uma plataforma só.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-sm transition duration-200 hover:shadow-md hover:-translate-y-0.5">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#155EEF] text-white">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#64748B]">{desc}</p>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[310px] rounded-[2.5rem] border-[10px] border-[#0A2540] bg-[#0A2540] shadow-2xl">
      <div className="absolute left-1/2 top-2 z-10 h-4 w-24 -translate-x-1/2 rounded-full bg-[#0A2540]" />
      <div className="max-h-[600px] overflow-hidden rounded-[1.9rem] bg-slate-50">
        {/* header loja */}
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A2540] text-xs font-bold text-white">
            LE
          </div>
          <div className="flex-1">
            <div className="text-xs font-semibold text-[#0A2540]">Loja Exemplo</div>
            <div className="text-[10px] text-[#0A2540]/60">Olá, Maria</div>
          </div>
          <Trophy className="h-3.5 w-3.5 text-[#0A2540]/40" />
        </div>

        {/* saldo pontos */}
        <div className="space-y-2.5 px-4 pt-3">
          <div className="rounded-2xl bg-[#0A2540] p-4 text-white">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/70">
              <Coins className="h-3 w-3" /> Seu saldo
            </div>
            <div className="mt-1.5 text-2xl font-bold">180 <span className="text-xs font-normal text-white/70">pts</span></div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-white/80">
              <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3 text-[#C4E135]" /> Nível Prata</span>
              <span>120 pts p/ Ouro</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-3/5 rounded-full bg-[#C4E135]" />
            </div>
          </div>
          {/* cashback */}
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#C4E135]/30 text-[#0A2540]">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-[#0A2540]/60">Cashback</div>
                <div className="text-sm font-bold text-[#0A2540]">R$ 24,50</div>
              </div>
            </div>
            <button className="rounded-md bg-[#0A2540] px-2.5 py-1 text-[10px] font-semibold text-white">
              Usar
            </button>
          </div>
        </div>

        {/* catálogo */}
        <div className="px-4 pt-3 pb-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-[#0A2540]">Catálogo de resgate</div>
            <div className="text-[10px] text-[#0A2540]/50">Ver todos</div>
          </div>
          <div className="space-y-2">
            <MiniPrize label="Desconto de R$20" pts="150" available />
            <MiniPrize label="Camiseta Fitness" pts="800" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPrize({ label, pts, available }: { label: string; pts: string; available?: boolean }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100">
        <Gift className="h-4 w-4 text-[#0A2540]/60" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] font-semibold text-[#0A2540]">{label}</div>
        <div className="text-[10px] text-[#0A2540]/60">{pts} pts</div>
      </div>
      <button
        className={
          "rounded-md px-2 py-1 text-[10px] font-semibold " +
          (available
            ? "bg-[#C4E135] text-[#0A2540]"
            : "bg-slate-100 text-[#0A2540]/50")
        }
      >
        Resgatar
      </button>
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#0A2540]/10 bg-white shadow-xl">
      {/* browser bar */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="mx-auto rounded-md bg-white px-3 py-1 text-[10px] text-[#0A2540]/60">
          qsfclub.com/lojista
        </div>
      </div>

      <div className="flex">
        {/* sidebar */}
        <aside className="hidden w-52 shrink-0 border-r border-slate-100 bg-white p-3 md:block">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PontoaMaxMark size={22} />
            <span className="text-sm font-semibold tracking-tight">
              <span style={{ color: "#155EEF" }}>Pontoa</span>
              <span style={{ color: "#22C55E" }}>Max</span>
            </span>
          </div>
          <nav className="mt-3 space-y-1 text-xs">
            <div className="flex items-center gap-2 rounded-md bg-[#0A2540] px-2.5 py-2 font-medium text-white">
              <Users className="h-3.5 w-3.5" /> Dashboard
            </div>
            {["Lançar venda", "Clientes", "Produtos", "Resgates", "Configurações"].map((l) => (
              <div key={l} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[#0A2540]/70 hover:bg-slate-50">
                <div className="h-3.5 w-3.5 rounded bg-[#0A2540]/10" /> {l}
              </div>
            ))}
          </nav>
        </aside>

        {/* main */}
        <div className="flex-1 space-y-4 bg-slate-50 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#0A2540]">Olá, Loja Exemplo</h3>
              <div className="text-xs text-[#0A2540]/60">Sua página: <span className="font-mono">qsfclub.com/loja-exemplo</span></div>
            </div>
            <div className="rounded-md bg-[#0A2540] px-3 py-1.5 text-xs font-medium text-white">
              Lançar venda →
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <MetricCard icon={<Users className="h-3.5 w-3.5" />} label="Clientes" value="284" />
            <MetricCard icon={<Coins className="h-3.5 w-3.5" />} label="Pontos no mês" value="12.480" />
            <MetricCard icon={<Wallet className="h-3.5 w-3.5" />} label="Cashback do mês" value="R$ 1.230" />
            <MetricCard icon={<Gift className="h-3.5 w-3.5" />} label="Resgates pendentes" value="7" highlight />
          </div>

          <div className="rounded-xl border border-slate-100 bg-white p-4">
            <div className="mb-3 text-xs font-semibold text-[#0A2540]">Últimas transações</div>
            <ul className="divide-y divide-slate-100 text-xs">
              {[
                ["Maria S.", "Compra", "+120 pts"],
                ["João P.", "Resgate de produto", "-500 pts"],
                ["Ana L.", "Compra", "+80 pts"],
                ["Carla M.", "Voucher cashback", "-R$ 25"],
              ].map(([nome, tipo, valor], i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium text-[#0A2540]">{nome}</div>
                    <div className="text-[10px] text-[#0A2540]/50">{tipo}</div>
                  </div>
                  <div className="font-semibold text-[#0A2540]">{valor}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-3">
      <div className="flex items-center justify-between text-[10px] font-medium text-[#0A2540]/60">
        <span>{label}</span>
        <span className="text-[#0A2540]/40">{icon}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="text-lg font-bold text-[#0A2540]">{value}</div>
        {highlight && (
          <span className="rounded bg-[#C4E135] px-1.5 py-0.5 text-[9px] font-bold text-[#0A2540]">novo</span>
        )}
      </div>
    </div>
  );
}