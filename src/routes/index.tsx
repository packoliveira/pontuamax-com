import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
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

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QSF Club — Fidelize seus clientes com pontos e cashback" },
      { name: "description", content: "Plataforma de fidelização com pontos, cashback e página personalizada por loja." },
      { property: "og:title", content: "QSF Club" },
      { property: "og:description", content: "Fidelização de clientes com pontos e cashback." },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0A2540]">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#0A2540] text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">QSF Club</span>
        </div>
        <Link to="/lojista/login">
          <Button variant="ghost" size="sm" className="text-[#0A2540] hover:bg-[#0A2540]/5">Entrar como lojista</Button>
        </Link>
      </header>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 py-12 md:py-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#0A2540]/10 bg-white px-3 py-1 text-xs font-medium text-[#0A2540] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#C4E135]" />
              Pontos • Cashback • Sua marca
            </div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
              Fidelize seus clientes<br />
              <span className="text-[#0A2540]">com a cara da sua loja</span>
            </h1>
            <p className="mt-6 text-lg text-[#0A2540]/70 md:text-xl">
              Cada loja tem sua própria página personalizada. Escolha pontos, cashback ou ambos.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
              <Link to="/lojista/onboarding">
                <Button size="lg" className="w-full bg-[#0A2540] text-white hover:bg-[#0A2540]/90 sm:w-auto">
                  <Store className="h-4 w-4" /> Criar minha loja
                </Button>
              </Link>
              <Link to="/lojista/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-[#0A2540]/20 text-[#0A2540] hover:bg-[#0A2540]/5 sm:w-auto"
                >
                  Já sou lojista, entrar
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-xs text-[#0A2540]/60">
              Cada loja terá seu próprio link: qsfclub.com/<span className="font-mono">nomedaloja</span>
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
          <p className="mt-4 text-[#0A2540]/70 md:text-lg">
            Acompanhe clientes, pontos distribuídos e resgates em tempo real.
          </p>
        </div>
        <div className="mt-12">
          <DashboardMockup />
        </div>

        <div className="mt-16 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/lojista/onboarding">
            <Button size="lg" className="w-full bg-[#0A2540] text-white hover:bg-[#0A2540]/90 sm:w-auto">
              Criar minha loja grátis <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-10 text-center text-xs text-[#0A2540]/50">
        © {new Date().getFullYear()} QSF Club. Fidelize com a cara da sua loja.
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-2xl border border-[#0A2540]/10 bg-white p-6 shadow-sm transition hover:shadow-md">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0A2540] text-white">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#0A2540]/70">{desc}</p>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[300px] rounded-[2.5rem] border-[10px] border-[#0A2540] bg-[#0A2540] shadow-2xl">
      <div className="absolute left-1/2 top-2 z-10 h-4 w-24 -translate-x-1/2 rounded-full bg-[#0A2540]" />
      <div className="overflow-hidden rounded-[1.9rem] bg-white">
        {/* header loja */}
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A2540] text-xs font-bold text-white">
            LE
          </div>
          <div>
            <div className="text-xs font-semibold text-[#0A2540]">Loja Exemplo</div>
            <div className="text-[10px] text-[#0A2540]/60">Olá, Maria</div>
          </div>
        </div>

        {/* saldo */}
        <div className="space-y-3 px-4 pt-4">
          <div className="rounded-2xl bg-[#0A2540] p-4 text-white">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-white/70">
              <Coins className="h-3 w-3" /> Seu saldo
            </div>
            <div className="mt-2 text-2xl font-bold">1.240 <span className="text-xs font-normal text-white/70">pts</span></div>
            <div className="mt-3 flex items-center justify-between text-[10px] text-white/80">
              <span className="inline-flex items-center gap-1"><Trophy className="h-3 w-3 text-[#C4E135]" /> Nível Prata</span>
              <span>760 pts p/ Ouro</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/15">
              <div className="h-full w-3/5 rounded-full bg-[#C4E135]" />
            </div>
          </div>
        </div>

        {/* catálogo */}
        <div className="px-4 pt-4 pb-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold text-[#0A2540]">Prêmios</div>
            <div className="text-[10px] text-[#0A2540]/50">Ver todos</div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <MiniPrize label="Café grátis" pts="200" />
            <MiniPrize label="Desc. 20%" pts="500" />
            <MiniPrize label="Brinde loja" pts="800" />
            <MiniPrize label="Vale R$50" pts="1.200" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniPrize({ label, pts }: { label: string; pts: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-white p-2">
      <div className="flex h-10 items-center justify-center rounded-md bg-slate-50">
        <Gift className="h-4 w-4 text-[#0A2540]/60" />
      </div>
      <div className="mt-1.5 text-[10px] font-semibold text-[#0A2540]">{label}</div>
      <div className="text-[9px] text-[#0A2540]/60">{pts} pts</div>
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
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#0A2540] text-white">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold text-[#0A2540]">QSF Club</span>
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