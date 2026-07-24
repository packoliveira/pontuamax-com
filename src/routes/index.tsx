import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  Coins,
  Gift,
  ArrowRight,
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
import { SiteShell } from "@/components/site-chrome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PontuaMax | Programa de Fidelidade para Empresas" },
      {
        name: "description",
        content:
          "Fidelize clientes com pontos, cashback, campanhas e benefícios. Aumente a recorrência e faça seu negócio crescer com a PontuaMax.",
      },
      { property: "og:title", content: "PontuaMax | Programa de Fidelidade para Empresas" },
      {
        property: "og:description",
        content:
          "Fidelize clientes com pontos, cashback, campanhas e benefícios. Aumente a recorrência e faça seu negócio crescer com a PontuaMax.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <SiteShell>
      {/* HERO — editorial, split assimétrico. Mockup do celular preservado. */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]"
          style={{
            background:
              "radial-gradient(60% 60% at 15% 20%, rgba(37,99,235,0.08), transparent 60%), radial-gradient(50% 50% at 85% 10%, rgba(20,203,168,0.10), transparent 60%)",
          }}
        />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-5 pb-16 pt-14 sm:px-8 md:grid-cols-[1.15fr_1fr] md:gap-8 md:pt-20 lg:pt-28">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-1 text-[11px] font-medium tracking-wide text-[#0B0F1A]/70">
              <span className="h-1.5 w-1.5 rounded-full bg-[#14CBA8]" />
              Fidelização brasileira — nova temporada 2026
            </div>
            <h1 className="mt-6 text-[42px] leading-[0.98] tracking-[-0.03em] sm:text-[56px] md:text-[72px] lg:text-[88px]">
              <span className="font-bold">Faça o cliente</span>
              <br />
              <span className="font-display italic text-[#0B0F1A]/85">voltar</span>
              <span className="font-bold"> —</span>
              <br />
              <span className="font-bold">sem depender</span>
              <br />
              <span className="font-bold">de desconto.</span>
            </h1>
            <p className="mt-8 max-w-md text-[15px] leading-relaxed text-[#0B0F1A]/60 sm:text-base">
              PontuaMax é o programa de pontos, cashback e campanhas que
              lojistas brasileiros usam para transformar clientes ocasionais em
              clientes de recorrência — em uma página com a sua marca.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                to="/lojista/onboarding"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0B0F1A] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-[1px]"
              >
                Criar minha loja grátis
                <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/como-funciona"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-semibold text-[#0B0F1A] hover:border-black/40"
              >
                Ver como funciona
              </Link>
            </div>
            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-black/10 pt-6">
              {[
                { k: "+2.400", v: "lojas ativas" },
                { k: "R$ 38M", v: "movimentados" },
                { k: "4,9/5", v: "satisfação lojista" },
              ].map((s) => (
                <div key={s.v}>
                  <dt className="font-display text-2xl leading-none text-[#0B0F1A] sm:text-3xl">
                    {s.k}
                  </dt>
                  <dd className="mt-1.5 text-[11px] uppercase tracking-wider text-[#0B0F1A]/50">
                    {s.v}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-center md:justify-end">
            <PhoneMockup />
          </div>
        </div>
      </section>

      {/* LOGOS — prova social discreta */}
      <section className="border-y border-black/5 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-6 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
          <p className="max-w-[220px] text-xs uppercase tracking-[0.18em] text-[#0B0F1A]/40">
            Marcas que já rodam PontuaMax
          </p>
          <div className="flex flex-1 flex-wrap items-center gap-x-10 gap-y-3">
            {["Quero Ser Fit", "Café Norte", "Ateliê Rosa", "Empório Bom", "Studio Vitta", "Loja Real"].map((n) => (
              <span
                key={n}
                className="font-display text-lg tracking-tight text-[#0B0F1A]/55 sm:text-xl"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* MANIFESTO editorial — bloco escuro, sem cards genéricos */}
      <section className="bg-[#0B0F1A] text-white">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-14 px-5 py-20 sm:px-8 md:grid-cols-[1fr_1.3fr] md:py-28">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-white/40">
              Manifesto
            </div>
            <h2 className="mt-4 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl">
              Desconto <br />
              <em className="text-[#14CBA8]">gasta caro</em>.<br />
              Fidelidade <br />
              <em className="text-white/70">rende sempre</em>.
            </h2>
          </div>
          <div className="grid gap-10 self-end text-white/75 sm:grid-cols-2">
            <p className="text-base leading-relaxed">
              A maioria das lojas brasileiras dá desconto no impulso e nunca
              mais vê o cliente. A gente inverte a conta: o cliente ganha um
              motivo pra voltar e a loja recupera margem.
            </p>
            <p className="text-base leading-relaxed">
              Pontos, cashback, vale-presente e campanhas segmentadas
              rodando na sua página, com sua marca, no seu WhatsApp — sem
              precisar de agência, sem contrato longo.
            </p>
            <div className="col-span-full grid grid-cols-3 gap-8 border-t border-white/10 pt-8">
              {[
                { k: "+42%", v: "aumento na recorrência" },
                { k: "3,2×", v: "ticket médio do cliente fiel" },
                { k: "12 min", v: "para ir ao ar" },
              ].map((m) => (
                <div key={m.v}>
                  <div className="font-display text-3xl leading-none sm:text-4xl">
                    {m.k}
                  </div>
                  <div className="mt-2 text-[11px] uppercase tracking-wider text-white/45">
                    {m.v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* PILARES — grid alternado, sem cards simétricos com ícones */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid gap-x-14 gap-y-6 md:grid-cols-[1fr_2fr]">
          <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
            Três formas de reter
          </div>
          <h2 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            Um kit completo — pra loja pequena e pra rede que já cresceu.
          </h2>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-6 md:grid-rows-2">
          <Pillar
            className="md:col-span-4 md:row-span-2 bg-[#0B0F1A] text-white"
            num="01"
            title="Pontos com identidade da sua loja"
            body="O cliente ganha pontos a cada compra e resgata no seu catálogo próprio — produtos, serviços, cupons e níveis (Bronze → Diamante). Nada de página branca com seu logo colado."
            visual={
              <div className="mt-8 flex items-end gap-6">
                <div className="rounded-2xl bg-white/5 p-5 backdrop-blur">
                  <div className="text-[11px] uppercase tracking-wider text-white/50">Saldo</div>
                  <div className="mt-1 font-display text-5xl">2.480</div>
                  <div className="text-xs text-white/50">pontos</div>
                </div>
                <div className="rounded-2xl border border-white/10 p-5">
                  <div className="text-[11px] uppercase tracking-wider text-white/50">Nível</div>
                  <div className="mt-1 flex items-center gap-2 font-display text-2xl">
                    <Crown className="h-5 w-5 text-[#14CBA8]" /> Prata
                  </div>
                  <div className="mt-1 text-xs text-white/50">520 pts p/ Ouro</div>
                </div>
              </div>
            }
          />
          <Pillar
            className="md:col-span-2 bg-[#F1EFE8]"
            num="02"
            title="Cashback automático"
            body="Devolve % em crédito na hora — usável apenas na sua loja."
          />
          <Pillar
            className="md:col-span-2 bg-[#E7F5F2]"
            num="03"
            title="Campanhas & WhatsApp"
            body="Segmenta clientes inativos, dispara promoções e mede resultado."
          />
        </div>
      </section>

      {/* DEPOIMENTO editorial — largo, único, com identidade */}
      <section className="border-y border-black/5 bg-[#F5F2EA]">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-[1fr_1.6fr] md:items-center md:py-28">
          <img
            src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=700&q=70"
            alt="Rafaela, dona da Quero Ser Fit"
            className="aspect-[4/5] w-full rounded-2xl object-cover shadow-[0_30px_60px_-30px_rgba(11,15,26,0.4)]"
          />
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
              História de lojista
            </div>
            <blockquote className="mt-5 font-display text-3xl leading-[1.15] tracking-tight text-[#0B0F1A] sm:text-4xl md:text-[44px]">
              “A gente parou de queimar margem em desconto. Hoje 68% do
              faturamento vem de cliente <em>recorrente</em>. O PontuaMax
              pagou o ano inteiro no primeiro mês.”
            </blockquote>
            <div className="mt-6 flex items-center gap-3 text-sm">
              <div>
                <div className="font-semibold">Rafaela Andrade</div>
                <div className="text-[#0B0F1A]/50">Sócia · Quero Ser Fit · 3 lojas</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final — texto grande, sem card */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-32">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
          <h2 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl md:text-7xl">
            Comece hoje.<br />
            <em className="text-[#0B0F1A]/60">A recorrência é amanhã.</em>
          </h2>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <Link
              to="/lojista/onboarding"
              className="inline-flex items-center gap-2 rounded-full bg-[#0B0F1A] px-6 py-3.5 text-sm font-semibold text-white hover:-translate-y-[1px] transition-transform"
            >
              Criar minha loja grátis <ArrowUpRight className="h-4 w-4" />
            </Link>
            <p className="max-w-xs text-sm text-[#0B0F1A]/55 md:text-right">
              Grátis para começar. Sem cartão. Cancela quando quiser.
            </p>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function Pillar({
  num,
  title,
  body,
  visual,
  className = "",
}: {
  num: string;
  title: string;
  body: string;
  visual?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl p-8 md:p-10 ${className}`}>
      <div className="text-xs uppercase tracking-[0.22em] opacity-40">{num}</div>
      <h3 className="mt-3 font-display text-3xl leading-[1.05] tracking-tight md:text-4xl">
        {title}
      </h3>
      <p className="mt-4 max-w-md text-sm leading-relaxed opacity-70">{body}</p>
      {visual}
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
          background: "linear-gradient(135deg, #6D28D9 0%, #2563EB 55%, #14CBA8 100%)",
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
                background: "linear-gradient(90deg, #ffffff 0%, #E0F2FE 40%, #14CBA8 100%)",
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
            <div className="text-[9px] font-semibold uppercase tracking-wider text-[#92400E]">
              Streak
            </div>
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
            {
              i: <Gift className="h-3 w-3" />,
              t: "Voucher resgatado",
              v: "-500 pts",
              c: "#6D28D9",
            },
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
              i === 0 ? "bg-[#0F172A] text-white" : "bg-white text-[#64748B] ring-1 ring-[#E2E8F0]"
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
              <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
              <span className="absolute left-1.5 top-1.5 rounded-full bg-white/95 px-1.5 py-0.5 text-[8px] font-bold text-[#0F172A] backdrop-blur">
                {p.tag}
              </span>
            </div>
            <div className="p-2">
              <div className="truncate text-[10px] font-semibold text-[#0F172A]">{p.name}</div>
              <div className="mt-0.5 flex items-center gap-1 text-[9px] text-[#64748B]">
                <Coins className="h-2.5 w-2.5 text-[#F59E0B]" />
                <span className="font-semibold text-[#0F172A]">
                  {p.pts.toLocaleString("pt-BR")}
                </span>{" "}
                pts
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
          background: "linear-gradient(135deg, #F59E0B 0%, #EF4444 55%, #6D28D9 100%)",
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
            <div className="text-[10px] font-semibold text-[#0F172A]">
              R$ 25 OFF na próxima compra
            </div>
            <Percent className="h-3 w-3 text-[#2563EB]" />
          </div>
          <div className="mt-0.5 text-[9px] text-[#64748B]">
            Válido até 30/nov · código FIDELI25
          </div>
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
                    background: "linear-gradient(135deg, #6D28D9, #2563EB, #14CBA8)",
                  }}
                >
                  <ShoppingBag className="h-3 w-3" />
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-[#0F172A]">{x.loja}</div>
                  <div className="text-[9px] text-[#64748B]">
                    {x.d} · {x.v}
                  </div>
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
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-[#14CBA8]" /> 1.5× pontos em compras
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-[#14CBA8]" /> Vouchers exclusivos
          </li>
          <li className="flex items-center gap-1.5">
            <Check className="h-3 w-3 text-[#14CBA8]" /> Acesso antecipado a promos
          </li>
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
                  isActive ? "text-white shadow-md" : "text-[#64748B]"
                }`}
                style={
                  isActive
                    ? {
                        background: "linear-gradient(135deg, #6D28D9, #2563EB, #14CBA8)",
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

