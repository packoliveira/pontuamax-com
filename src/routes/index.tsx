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
      {/* ============================================================
          HERO — dark editorial. Celular flutua ao centro-direita,
          headline serif enorme à esquerda. Preserva PhoneMockup.
         ============================================================ */}
      <section className="relative isolate overflow-hidden bg-[#0A0A0A] text-white">
        {/* Grão + spotlight */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.35]"
          style={{
            background:
              "radial-gradient(70% 55% at 72% 35%, rgba(20,203,168,0.18), transparent 60%), radial-gradient(50% 45% at 18% 15%, rgba(109,40,217,0.22), transparent 65%)",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 mix-blend-overlay opacity-[0.06]"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='140' height='140'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-5 pb-24 pt-10 sm:px-8 md:grid-cols-12 md:gap-6 md:pb-32 md:pt-16">
          {/* Coluna texto */}
          <div className="md:col-span-7">
            <h1 className="font-display text-[54px] leading-[0.92] tracking-[-0.035em] sm:text-[76px] md:text-[92px] lg:text-[108px]">
              Fidelize clientes
              <br />
              <span className="italic text-white/70">e venda mais</span>
              <br />
              <span className="relative inline-block">
                todos os meses.
                <span
                  aria-hidden
                  className="absolute -bottom-2 left-0 h-[3px] w-[62%] bg-[#14CBA8]"
                />
              </span>
            </h1>

            <p className="mt-8 max-w-lg text-[15px] leading-relaxed text-white/60 sm:text-[17px]">
              Crie um programa de fidelidade com pontos, cashback e campanhas
              para aumentar a recorrência da sua loja.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                to="/lojista/onboarding"
                className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#0A0A0A] transition-all hover:-translate-y-[1px] hover:shadow-[0_20px_40px_-15px_rgba(20,203,168,0.6)]"
              >
                Criar minha loja grátis
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0A0A0A] text-white transition-transform group-hover:translate-x-0.5">
                  <ArrowUpRight className="h-3 w-3" />
                </span>
              </Link>
              <Link
                to="/como-funciona"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white/80 transition-colors hover:border-white/50 hover:text-white"
              >
                Ver como funciona
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-12 flex items-start gap-4 border-t border-white/10 pt-6">
              <div className="mt-1 h-8 w-[2px] bg-[#14CBA8]" />
              <p className="max-w-md text-[13px] leading-relaxed text-white/55 sm:text-[14px]">
                Feito pra quem cansou de dar desconto e ver o cliente sumir.
                <span className="text-white/85"> Recorrência de verdade — no seu caixa, todo mês.</span>
              </p>
            </div>
          </div>

          {/* Coluna celular — inalterado */}
          <div className="relative md:col-span-5">
            {/* Ambient spotlight atrás do celular */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-10"
              style={{
                background:
                  "radial-gradient(60% 55% at 55% 45%, rgba(20,203,168,0.18), transparent 65%)",
              }}
            />
            {/* Legenda editorial ao redor do celular */}
            <div className="pointer-events-none absolute -left-2 top-8 hidden rotate-[-90deg] origin-top-left text-[10px] uppercase tracking-[0.32em] text-white/30 md:block">
              Cliente · saldo · resgate
            </div>
            <div className="flex justify-center md:justify-end">
              <PhoneMockup />
            </div>
          </div>
        </div>

        {/* Faixa editorial — frase única de posicionamento */}
        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between md:py-12">
            <p className="font-display text-2xl italic leading-tight text-white/85 sm:text-3xl md:text-[34px]">
              "A gente parou de dar desconto — e faturou mais."
            </p>
            <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-white/40">
              <span className="h-[1px] w-8 bg-white/30" />
              Lojistas PontuaMax · Brasil
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MARQUEE — logos rolando sobre fundo cru, com nome editorial
         ============================================================ */}
      <section className="border-b border-black/10 bg-[#F5F2EA]">
        <div className="mx-auto flex max-w-7xl items-center gap-10 px-5 py-6 sm:px-8">
          <p className="hidden shrink-0 max-w-[180px] text-[10px] uppercase tracking-[0.28em] text-[#0B0F1A]/45 md:block">
            Rodam PontuaMax
          </p>
          <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(90deg,transparent,black_10%,black_90%,transparent)]">
            <div className="flex min-w-max animate-[marquee_28s_linear_infinite] gap-12">
              {[...Array(2)].flatMap((_, r) =>
                [
                  "Quero Ser Fit",
                  "Café Norte",
                  "Ateliê Rosa",
                  "Empório Bom",
                  "Studio Vitta",
                  "Loja Real",
                  "Casa Vinho",
                  "Bella Moda",
                ].map((n) => (
                  <span
                    key={`${r}-${n}`}
                    className="font-display text-2xl italic tracking-tight text-[#0B0F1A]/55"
                  >
                    {n}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          MANIFESTO editorial — tipografia dominante, sem cards
         ============================================================ */}
      <section className="relative bg-[#FAF8F2]">
        <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 md:py-36">
          <div className="grid gap-12 md:grid-cols-12 md:gap-6">
            <div className="md:col-span-3">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[#0B0F1A]/45">
                — Ensaio 01
              </div>
              <div className="mt-4 text-sm text-[#0B0F1A]/60">
                Por que desconto não fideliza mais ninguém.
              </div>
            </div>
            <div className="md:col-span-9">
              <h2 className="font-display text-[44px] leading-[1.02] tracking-[-0.02em] text-[#0B0F1A] sm:text-6xl md:text-[80px]">
                Desconto <em className="text-[#0B0F1A]/50">gasta</em> caro.<br />
                Fidelidade <em className="text-[#14CBA8]">rende</em> sempre.
              </h2>
              <div className="mt-10 grid gap-8 border-t border-black/10 pt-8 text-[15px] leading-relaxed text-[#0B0F1A]/70 sm:grid-cols-2 md:text-base">
                <p>
                  A maioria das lojas brasileiras dá desconto no impulso e
                  nunca mais vê o cliente. Queima margem, treina o consumidor
                  a esperar promoção e vira refém do preço.
                </p>
                <p>
                  A gente inverte a conta. O cliente ganha um motivo pra
                  voltar. A loja recupera margem, ticket médio e recorrência
                  — sem depender de agência ou contrato longo.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          CAPÍTULOS — 3 blocos alternados, tipografia forte, imagem
          real. Nada de card com ícone azul.
         ============================================================ */}
      <section className="bg-white">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <Chapter
            index="01"
            eyebrow="Programa"
            title="Pontos com a identidade da sua loja"
            body="O cliente ganha pontos a cada compra e resgata no seu catálogo próprio — produtos, serviços, cupons e níveis Bronze → Diamante. Nada de página branca com seu logo colado por cima."
            image="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1200&q=70"
            imageAlt="Vitrine de loja com produtos"
            side="right"
            highlight="+42% recorrência"
          />
          <Chapter
            index="02"
            eyebrow="Retorno"
            title="Cashback automático — dinheiro que só volta pra você"
            body="Devolve uma % em crédito na hora, usável apenas na sua loja. Cliente compra hoje, volta amanhã pra queimar o saldo — e leva mais do que pretendia."
            image="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=1200&q=70"
            imageAlt="Cliente pagando no caixa"
            side="left"
            highlight="R$ 47,80 saldo médio"
          />
          <Chapter
            index="03"
            eyebrow="Comunicação"
            title="Campanhas e WhatsApp que puxam cliente inativo"
            body="Segmenta quem sumiu há 30, 60, 90 dias e dispara promoções segmentadas. Você mede quem abriu, quem comprou e quanto voltou pra sua receita."
            image="https://images.unsplash.com/photo-1611746872915-64382b5c76da?auto=format&fit=crop&w=1200&q=70"
            imageAlt="Comerciante enviando mensagem no celular"
            side="right"
            highlight="3,2× ticket médio"
          />
        </div>
      </section>

      {/* ============================================================
          CASE — depoimento largo, imagem editorial, número gigante
         ============================================================ */}
      {/* ============================================================
          CTA FINAL — tipografia enorme, cru, sem card
         ============================================================ */}
      <section className="relative overflow-hidden bg-[#FAF8F2]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(50% 60% at 80% 30%, rgba(20,203,168,0.10), transparent 60%)",
          }}
        />
        <div className="mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-40">
          <div className="grid gap-12 md:grid-cols-12 md:items-end md:gap-6">
            <div className="md:col-span-8">
              <div className="text-[11px] uppercase tracking-[0.28em] text-[#0B0F1A]/45">
                — Última página
              </div>
              <h2 className="mt-5 font-display text-[52px] leading-[0.98] tracking-[-0.03em] text-[#0B0F1A] sm:text-7xl md:text-[104px]">
                Comece <em className="text-[#0B0F1A]/50">hoje</em>.
                <br />
                Recorrência <em className="text-[#14CBA8]">amanhã</em>.
              </h2>
            </div>
            <div className="md:col-span-4 md:pb-4">
              <div className="flex flex-col items-start gap-5">
                <Link
                  to="/lojista/onboarding"
                  className="group inline-flex items-center gap-2 rounded-full bg-[#0A0A0A] px-7 py-4 text-sm font-semibold text-white transition-all hover:-translate-y-[1px] hover:shadow-[0_20px_40px_-15px_rgba(10,10,10,0.4)]"
                >
                  Criar minha loja grátis
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#0A0A0A] transition-transform group-hover:translate-x-0.5">
                    <ArrowUpRight className="h-3 w-3" />
                  </span>
                </Link>
                <p className="max-w-xs text-sm text-[#0B0F1A]/55">
                  Grátis pra começar. Sem cartão. Cancela quando quiser — mas
                  ninguém cancela.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

/* ---------- Chapter block: numero editorial + imagem alternada ---------- */
function Chapter({
  index,
  eyebrow,
  title,
  body,
  image,
  imageAlt,
  side,
  highlight,
}: {
  index: string;
  eyebrow: string;
  title: string;
  body: string;
  image: string;
  imageAlt: string;
  side: "left" | "right";
  highlight: string;
}) {
  const imgFirst = side === "left";
  return (
    <article className="grid grid-cols-1 items-center gap-10 border-b border-black/10 py-24 last:border-b-0 md:grid-cols-12 md:gap-8 md:py-32">
      <div
        className={`relative md:col-span-6 ${imgFirst ? "md:order-1" : "md:order-2"}`}
      >
        <div className="relative overflow-hidden rounded-[28px] bg-[#F5F2EA]">
          <img
            src={image}
            alt={imageAlt}
            loading="lazy"
            className="aspect-[4/5] w-full object-cover md:aspect-[5/6]"
          />
          <div className="absolute left-5 top-5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold tracking-wide text-[#0A0A0A] shadow-sm backdrop-blur">
            {highlight}
          </div>
        </div>
      </div>
      <div
        className={`md:col-span-6 ${imgFirst ? "md:order-2 md:pl-6" : "md:order-1 md:pr-6"}`}
      >
        <div className="flex items-baseline gap-6">
          <div className="font-display text-6xl leading-none tracking-tight text-[#0B0F1A]/15 sm:text-7xl md:text-[96px]">
            {index}
          </div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-[#0B0F1A]/45">
            {eyebrow}
          </div>
        </div>
        <h3 className="mt-6 font-display text-[36px] leading-[1.05] tracking-[-0.015em] text-[#0B0F1A] sm:text-5xl md:text-[56px]">
          {title}
        </h3>
        <p className="mt-6 max-w-lg text-[15px] leading-relaxed text-[#0B0F1A]/65 md:text-base">
          {body}
        </p>
        <Link
          to="/como-funciona"
          className="mt-8 inline-flex items-center gap-2 border-b border-[#0B0F1A]/40 pb-1 text-sm font-semibold text-[#0B0F1A] transition-colors hover:border-[#14CBA8] hover:text-[#0B0F1A]"
        >
          Ver detalhes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </article>
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

