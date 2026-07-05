import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  Check,
  Home,
  ShoppingBag,
  Sparkles,
  User,
  Ticket,
  Zap,
  ChevronRight,
  Bell,
  Signal,
  Wifi,
  BatteryFull,
  Percent,
  Crown,
  Flame,
  ArrowUpRight,
} from "lucide-react";
import { PontoaMaxMark, PontoaMaxWordmark } from "@/components/pontoamax-logo";

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
          <PontoaMaxWordmark variant="light" size={18} />
        </div>
        <Link to="/lojista/login">
          <Button variant="ghost" size="sm" className="text-[#0F172A] hover:bg-[#2563EB]/5">Entrar como lojista</Button>
        </Link>
      </header>

      {/* HERO */}
      <section className="mx-auto flex min-h-[calc(100dvh-96px)] max-w-6xl items-center px-4 sm:px-6 py-12 sm:py-16 md:py-28">
        <div className="grid w-full items-center gap-16 md:grid-cols-2">
          <div className="text-center md:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E2E8F0] bg-white px-3 py-1 text-xs font-medium text-[#0F172A] shadow-sm">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" />
              Fidelização • Cashback • Campanhas
            </div>
            <h1 className="mt-6 text-3xl font-bold tracking-tight [text-wrap:balance] sm:text-4xl md:text-5xl lg:text-6xl">
              Fidelize clientes e faça{" "}
              <span className="bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] bg-clip-text text-transparent">
                seu negócio crescer
              </span>
              .
            </h1>
            <p className="mt-5 text-base sm:text-lg text-[#64748B] md:text-xl [text-wrap:pretty]">
              Programa de fidelidade com pontos, cashback e campanhas para aumentar a recorrência dos seus clientes e vender mais todos os meses.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row md:justify-start">
              <Link to="/lojista/onboarding">
                <Button size="lg" className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-xl sm:w-auto">
                  <Store className="h-4 w-4" /> Criar minha loja gratuitamente
                </Button>
              </Link>
              <Link to="/lojista/login">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full border-[#2563EB]/30 text-[#2563EB] hover:bg-[#2563EB]/5 rounded-xl sm:w-auto"
                >
                  Entrar como lojista
                </Button>
              </Link>
            </div>
            <ul className="mt-6 flex flex-col items-center gap-2 text-sm text-[#475569] sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2 md:justify-start">
              {[
                "Implantação em poucos minutos",
                "Link personalizado para sua empresa",
                "Sem limite de clientes cadastrados",
              ].map((item) => (
                <li key={item} className="inline-flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#22C55E]/15 text-[#16A34A]">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
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
            <Button size="lg" className="w-full bg-[#2563EB] text-white hover:bg-[#1D4ED8] rounded-xl sm:w-auto">
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
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#2563EB] text-white">
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-[#64748B]">{desc}</p>
    </div>
  );
}

function PhoneMockup() {
  const [screen, setScreen] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setScreen((s) => (s + 1) % 3), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative">
      {/* soft ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 rounded-[4rem] opacity-60 blur-3xl"
        style={{
          background:
            "radial-gradient(60% 60% at 50% 40%, rgba(109,40,217,0.25), transparent 60%), radial-gradient(50% 50% at 70% 70%, rgba(20,203,168,0.25), transparent 60%)",
        }}
      />

      <div className="relative animate-[float_6s_ease-in-out_infinite]">
        {/* Phone bezel */}
        <div
          className="relative w-[320px] rounded-[3rem] p-[3px] shadow-[0_40px_80px_-20px_rgba(15,23,42,0.55)]"
          style={{
            background:
              "linear-gradient(160deg, #1e293b 0%, #334155 30%, #0f172a 60%, #1e293b 100%)",
          }}
        >
          <div className="rounded-[calc(3rem-3px)] bg-[#0F172A] p-[2px]">
            <div className="relative overflow-hidden rounded-[calc(3rem-5px)] bg-[#F8FAFC]">
              {/* Dynamic Island */}
              <div className="absolute left-1/2 top-2.5 z-30 flex h-6 w-24 -translate-x-1/2 items-center justify-center rounded-full bg-black">
                <div className="h-1.5 w-1.5 rounded-full bg-[#334155]" />
              </div>

              {/* Status bar */}
              <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10px] font-semibold text-[#0F172A]">
                <span>9:41</span>
                <span className="flex items-center gap-1 text-[#0F172A]">
                  <Signal className="h-3 w-3" />
                  <Wifi className="h-3 w-3" />
                  <BatteryFull className="h-3.5 w-3.5" />
                </span>
              </div>

              {/* Screen viewport */}
              <div className="relative h-[560px] overflow-hidden">
                <AppScreen1 active={screen === 0} />
                <AppScreen2 active={screen === 1} />
                <AppScreen3 active={screen === 2} />
              </div>

              {/* Bottom nav */}
              <BottomNav active={screen} />
            </div>
          </div>

          {/* Side buttons */}
          <div className="absolute -left-[3px] top-24 h-8 w-[3px] rounded-l-md bg-[#0f172a]" />
          <div className="absolute -left-[3px] top-36 h-14 w-[3px] rounded-l-md bg-[#0f172a]" />
          <div className="absolute -left-[3px] top-52 h-14 w-[3px] rounded-l-md bg-[#0f172a]" />
          <div className="absolute -right-[3px] top-32 h-20 w-[3px] rounded-r-md bg-[#0f172a]" />
        </div>

        {/* Screen indicator dots */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`Tela ${i + 1}`}
              onClick={() => setScreen(i)}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                screen === i
                  ? "w-6 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]"
                  : "w-1.5 bg-[#CBD5E1] hover:bg-[#94A3B8]"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ScreenWrapper({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <div
      className={`absolute inset-0 overflow-y-auto px-5 pt-3 pb-4 transition-all duration-700 ease-out ${
        active ? "opacity-100 translate-x-0" : "pointer-events-none opacity-0 translate-x-4"
      }`}
      style={{ scrollbarWidth: "none" }}
    >
      {children}
    </div>
  );
}

/* ---------- SCREEN 1: HOME ---------- */
function AppScreen1({ active }: { active: boolean }) {
  return (
    <ScreenWrapper active={active}>
      {/* Greeting */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-sm font-bold text-white shadow-md">
            M
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#22C55E]" />
        </div>
        <div className="flex-1">
          <div className="text-[11px] text-[#64748B]">Boa tarde,</div>
          <div className="text-sm font-semibold text-[#0F172A]">Maria Silva ✨</div>
        </div>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-[#E2E8F0]">
          <Bell className="h-4 w-4 text-[#0F172A]" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-[#EF4444]" />
        </button>
      </div>

      {/* Points balance card */}
      <div
        className="relative mt-4 overflow-hidden rounded-3xl p-5 text-white shadow-xl"
        style={{
          background:
            "linear-gradient(135deg, #6D28D9 0%, #2563EB 55%, #14CBA8 100%)",
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full opacity-30"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-6 -bottom-10 h-28 w-28 rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
        />
        <div className="flex items-center justify-between text-[10px] font-medium uppercase tracking-[0.14em] text-white/80">
          <span className="inline-flex items-center gap-1.5">
            <Coins className="h-3 w-3" /> Saldo de pontos
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] backdrop-blur">
            <Crown className="h-2.5 w-2.5" /> Prata
          </span>
        </div>
        <div className="mt-2 flex items-baseline gap-1.5">
          <div className="text-4xl font-bold tracking-tight tabular-nums">2.480</div>
          <div className="text-xs font-medium text-white/80">pts</div>
        </div>
        <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-white/80">
          <ArrowUpRight className="h-3 w-3" /> +180 pts esta semana
        </div>

        {/* Progress */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between text-[10px] text-white/85">
            <span className="font-medium">Nível Prata</span>
            <span>520 pts p/ Ouro</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.6)]"
              style={{
                width: "72%",
                background:
                  "linear-gradient(90deg, #ffffff 0%, #E0F2FE 40%, #14CBA8 100%)",
              }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[9px] font-medium text-white/70">
            <span>Bronze</span>
            <span>Prata</span>
            <span>Ouro</span>
            <span>Diamante</span>
          </div>
        </div>
      </div>

      {/* Cashback + Ações rápidas */}
      <div className="mt-3 grid grid-cols-5 gap-2">
        <div className="col-span-3 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-[#64748B]">
            <Wallet className="h-3 w-3 text-[#14CBA8]" /> Cashback
          </div>
          <div className="mt-1 text-lg font-bold text-[#0F172A]">R$ 47,80</div>
          <button
            className="mt-1.5 inline-flex w-full items-center justify-center gap-1 rounded-lg py-1 text-[10px] font-semibold text-white shadow-sm"
            style={{ background: "linear-gradient(90deg, #14CBA8, #2563EB)" }}
          >
            Usar agora <ChevronRight className="h-3 w-3" />
          </button>
        </div>
        <div className="col-span-2 flex flex-col items-start justify-between rounded-2xl border border-[#F59E0B]/30 bg-gradient-to-br from-[#FEF3C7] to-[#FDE68A] p-3 shadow-sm">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#F59E0B] text-white">
            <Flame className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#92400E]">Streak</div>
            <div className="text-sm font-bold text-[#78350F]">7 dias 🔥</div>
          </div>
        </div>
      </div>

      {/* Atividade recente mini */}
      <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-[#0F172A]">Últimas atividades</div>
          <button className="text-[9px] font-medium text-[#2563EB]">Ver tudo</button>
        </div>
        <div className="mt-2 space-y-2">
          {[
            { i: <Coins className="h-3 w-3" />, t: "Compra em loja", v: "+180 pts", c: "#22C55E" },
            { i: <Gift className="h-3 w-3" />, t: "Voucher resgatado", v: "-500 pts", c: "#6D28D9" },
          ].map((x, i) => (
            <div key={i} className="flex items-center gap-2">
              <div
                className="flex h-6 w-6 items-center justify-center rounded-full text-white"
                style={{ background: x.c }}
              >
                {x.i}
              </div>
              <div className="flex-1 text-[10px] text-[#0F172A]">{x.t}</div>
              <div className="text-[10px] font-semibold text-[#0F172A]">{x.v}</div>
            </div>
          ))}
        </div>
      </div>
    </ScreenWrapper>
  );
}

/* ---------- SCREEN 2: CATÁLOGO ---------- */
const PRODUCTS = [
  {
    name: "Fone Bluetooth",
    pts: 1200,
    tag: "Popular",
    img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=70",
  },
  {
    name: "Café Especial",
    pts: 450,
    tag: "Novo",
    img: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=400&q=70",
  },
  {
    name: "Tênis Runner",
    pts: 2800,
    tag: "Top",
    img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=400&q=70",
  },
  {
    name: "Perfume 50ml",
    pts: 1850,
    tag: "-20%",
    img: "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=400&q=70",
  },
];

function AppScreen2({ active }: { active: boolean }) {
  return (
    <ScreenWrapper active={active}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] text-[#64748B]">Recompensas</div>
          <div className="text-lg font-bold text-[#0F172A]">Catálogo</div>
        </div>
        <div className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#6D28D9]/10 to-[#14CBA8]/10 px-2.5 py-1 text-[10px] font-semibold text-[#0F172A] ring-1 ring-[#E2E8F0]">
          <Coins className="h-3 w-3 text-[#F59E0B]" /> 2.480
        </div>
      </div>

      {/* Search bar */}
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-[#E2E8F0]">
        <div className="h-3.5 w-3.5 rounded-full border-2 border-[#94A3B8]" />
        <div className="text-[10px] text-[#94A3B8]">Buscar recompensas...</div>
      </div>

      {/* Filters */}
      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {["Todos", "Descontos", "Produtos", "Serviços", "Cupons"].map((f, i) => (
          <span
            key={f}
            className={`whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold ${
              i === 0
                ? "bg-[#0F172A] text-white"
                : "bg-white text-[#64748B] ring-1 ring-[#E2E8F0]"
            }`}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        {PRODUCTS.map((p) => (
          <div
            key={p.name}
            className="group overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5"
          >
            <div className="relative h-24 w-full overflow-hidden bg-[#F1F5F9]">
              <img
                src={p.img}
                alt={p.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-0.5 text-[8px] font-bold text-[#0F172A] backdrop-blur">
                {p.tag}
              </span>
            </div>
            <div className="p-2">
              <div className="truncate text-[10px] font-semibold text-[#0F172A]">{p.name}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[9px] text-[#64748B]">
                <Coins className="h-2.5 w-2.5 text-[#F59E0B]" />
                <span className="font-semibold text-[#0F172A]">{p.pts.toLocaleString("pt-BR")}</span> pts
              </div>
              <button
                className="mt-1.5 w-full rounded-lg py-1 text-[9px] font-bold text-white shadow-sm"
                style={{ background: "linear-gradient(90deg, #6D28D9, #2563EB)" }}
              >
                Resgatar
              </button>
            </div>
          </div>
        ))}
      </div>
    </ScreenWrapper>
  );
}

/* ---------- SCREEN 3: CAMPANHAS ---------- */
function AppScreen3({ active }: { active: boolean }) {
  return (
    <ScreenWrapper active={active}>
      <div>
        <div className="text-[11px] text-[#64748B]">Para você</div>
        <div className="text-lg font-bold text-[#0F172A]">Campanhas ativas</div>
      </div>

      {/* Promoção da semana */}
      <div
        className="relative mt-3 overflow-hidden rounded-2xl p-4 text-white shadow-lg"
        style={{
          background:
            "linear-gradient(135deg, #F59E0B 0%, #EF4444 55%, #6D28D9 100%)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider backdrop-blur">
            <Zap className="h-2.5 w-2.5" /> Promo da semana
          </div>
          <span className="text-[9px] text-white/85">2d restantes</span>
        </div>
        <div className="mt-2 text-xl font-bold leading-tight">Ganhe 3× pontos</div>
        <div className="text-[11px] text-white/90">em toda compra acima de R$ 100</div>
        <button className="mt-3 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold text-[#0F172A]">
          Participar <ArrowRight className="h-3 w-3" />
        </button>
      </div>

      {/* Voucher */}
      <div className="mt-3 flex items-stretch overflow-hidden rounded-2xl border border-dashed border-[#2563EB]/40 bg-gradient-to-r from-white to-[#EFF6FF] shadow-sm">
        <div className="flex flex-col items-center justify-center bg-[#2563EB] px-3 text-white">
          <Ticket className="h-4 w-4" />
          <div className="mt-1 text-[8px] font-bold uppercase tracking-wider">Ativo</div>
        </div>
        <div className="flex-1 p-2.5">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-semibold text-[#0F172A]">R$ 25 OFF na próxima compra</div>
            <Percent className="h-3 w-3 text-[#2563EB]" />
          </div>
          <div className="mt-0.5 text-[9px] text-[#64748B]">Válido até 30/nov · código FIDELI25</div>
        </div>
      </div>

      {/* Histórico */}
      <div className="mt-3 rounded-2xl border border-[#E2E8F0] bg-white p-3 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-[11px] font-semibold text-[#0F172A]">Últimas compras</div>
          <button className="text-[9px] font-medium text-[#2563EB]">Ver histórico</button>
        </div>
        <div className="divide-y divide-[#F1F5F9]">
          {[
            { d: "Hoje", loja: "Café da Manhã", v: "R$ 42,00", p: "+42" },
            { d: "Ontem", loja: "Loja Fashion", v: "R$ 189,90", p: "+190" },
            { d: "3 dias", loja: "Mercado Bom", v: "R$ 76,50", p: "+77" },
          ].map((x, i) => (
            <div key={i} className="flex items-center justify-between py-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-white"
                  style={{
                    background:
                      "linear-gradient(135deg, #6D28D9, #2563EB, #14CBA8)",
                  }}
                >
                  <ShoppingBag className="h-3 w-3" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[#0F172A]">{x.loja}</div>
                  <div className="text-[9px] text-[#64748B]">{x.d} · {x.v}</div>
                </div>
              </div>
              <span className="rounded-full bg-[#22C55E]/10 px-2 py-0.5 text-[9px] font-bold text-[#15803D]">
                {x.p} pts
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Benefícios do nível */}
      <div className="mt-3 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-3 text-white shadow-sm">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#E5E7EB] to-[#94A3B8] text-[#0F172A]">
            <Crown className="h-3.5 w-3.5" />
          </div>
          <div className="text-[11px] font-semibold">Benefícios Prata</div>
        </div>
        <ul className="mt-2 space-y-1 text-[10px] text-white/85">
          <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#14CBA8]" /> 1.5× pontos em compras</li>
          <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#14CBA8]" /> Vouchers exclusivos</li>
          <li className="flex items-center gap-1.5"><Check className="h-3 w-3 text-[#14CBA8]" /> Acesso antecipado a promos</li>
        </ul>
      </div>
    </ScreenWrapper>
  );
}

/* ---------- BOTTOM NAV ---------- */
function BottomNav({ active }: { active: number }) {
  // Map screen → active tab index. Perfil never auto-active.
  const activeMap = [0, 1, 3];
  const current = activeMap[active];
  const items = [
    { icon: Home, label: "Home" },
    { icon: Sparkles, label: "Recompensas" },
    { icon: Wallet, label: "Cashback" },
    { icon: Zap, label: "Campanhas" },
    { icon: User, label: "Perfil" },
  ];
  return (
    <div className="border-t border-[#E2E8F0] bg-white/95 px-2 pt-2 pb-3 backdrop-blur">
      <div className="flex items-center justify-around">
        {items.map((it, i) => {
          const Icon = it.icon;
          const isActive = i === current;
          return (
            <div key={it.label} className="flex flex-1 flex-col items-center gap-0.5">
              <div
                className={`flex h-8 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                  isActive
                    ? "text-white shadow-md"
                    : "text-[#64748B]"
                }`}
                style={
                  isActive
                    ? {
                        background:
                          "linear-gradient(135deg, #6D28D9, #2563EB, #14CBA8)",
                      }
                    : undefined
                }
              >
                <Icon className="h-3.5 w-3.5" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                className={`text-[8px] font-semibold ${
                  isActive ? "text-[#0F172A]" : "text-[#94A3B8]"
                }`}
              >
                {it.label}
              </span>
            </div>
          );
        })}
      </div>
      {/* Home indicator */}
      <div className="mx-auto mt-2 h-1 w-24 rounded-full bg-[#0F172A]" />
    </div>
  );
}

function DashboardMockup() {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#0F172A]/10 bg-white shadow-xl">
      {/* browser bar */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        </div>
        <div className="mx-auto rounded-md bg-white px-3 py-1 text-[10px] text-[#0F172A]/60">
          pontoamax.app/lojista
        </div>
      </div>

      <div className="flex">
        {/* sidebar */}
        <aside className="hidden w-52 shrink-0 border-r border-slate-100 bg-white p-3 md:block">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <PontoaMaxMark size={22} />
            <PontoaMaxWordmark variant="light" size={14} />
          </div>
          <nav className="mt-3 space-y-1 text-xs">
            <div className="flex items-center gap-2 rounded-md bg-[#0F172A] px-2.5 py-2 font-medium text-white">
              <Users className="h-3.5 w-3.5" /> Dashboard
            </div>
            {["Lançar venda", "Clientes", "Produtos", "Resgates", "Configurações"].map((l) => (
              <div key={l} className="flex items-center gap-2 rounded-md px-2.5 py-2 text-[#0F172A]/70 hover:bg-slate-50">
                <div className="h-3.5 w-3.5 rounded bg-[#0F172A]/10" /> {l}
              </div>
            ))}
          </nav>
        </aside>

        {/* main */}
        <div className="flex-1 space-y-4 bg-slate-50 p-4 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-[#0F172A]">Olá, Loja Exemplo</h3>
              <div className="text-xs text-[#64748B]">Sua página: <span className="font-mono">pontoamax.app/loja-exemplo</span></div>
            </div>
            <div className="rounded-md bg-[#0F172A] px-3 py-1.5 text-xs font-medium text-white">
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
            <div className="mb-3 text-xs font-semibold text-[#0F172A]">Últimas transações</div>
            <ul className="divide-y divide-slate-100 text-xs">
              {[
                ["Maria S.", "Compra", "+120 pts"],
                ["João P.", "Resgate de produto", "-500 pts"],
                ["Ana L.", "Compra", "+80 pts"],
                ["Carla M.", "Voucher cashback", "-R$ 25"],
              ].map(([nome, tipo, valor], i) => (
                <li key={i} className="flex items-center justify-between py-2">
                  <div>
                    <div className="font-medium text-[#0F172A]">{nome}</div>
                    <div className="text-[10px] text-[#0F172A]/50">{tipo}</div>
                  </div>
                  <div className="font-semibold text-[#0F172A]">{valor}</div>
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
      <div className="flex items-center justify-between text-[10px] font-medium text-[#0F172A]/60">
        <span>{label}</span>
        <span className="text-[#0F172A]/40">{icon}</span>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <div className="text-lg font-bold text-[#0F172A]">{value}</div>
        {highlight && (
          <span className="rounded bg-[#14CBA8] px-1.5 py-0.5 text-[9px] font-bold text-[#0F172A]">novo</span>
        )}
      </div>
    </div>
  );
}