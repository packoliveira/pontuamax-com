import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";
import { SiteShell } from "@/components/site-chrome";

export const Route = createFileRoute("/planos")({
  head: () => ({
    meta: [
      { title: "Planos e preços | PontuaMax" },
      {
        name: "description",
        content:
          "Planos honestos, feitos pra loja brasileira. Comece grátis e cresça sem pagar por cliente cadastrado. Do balcão à rede.",
      },
      { property: "og:title", content: "Planos e preços | PontuaMax" },
      {
        property: "og:description",
        content:
          "Planos do PontuaMax: grátis para começar, sem taxa por cliente cadastrado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PlanosPage,
});

type Plan = {
  name: string;
  tag?: string;
  price: string;
  priceSub: string;
  desc: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Começo",
    price: "R$ 0",
    priceSub: "por mês, para sempre",
    desc: "Pra loja que quer sair do desconto e testar recorrência com risco zero.",
    features: [
      "Até 300 clientes ativos",
      "Pontos e cashback básicos",
      "Página com sua marca",
      "Vendedor no PDV (1 usuário)",
    ],
    cta: "Começar grátis",
  },
  {
    name: "Crescimento",
    tag: "Mais escolhido",
    price: "R$ 149",
    priceSub: "por mês, sem limite de clientes",
    desc: "Pra loja que já vende bem e quer transformar cliente novo em cliente fiel.",
    features: [
      "Clientes ilimitados",
      "Campanhas + WhatsApp automatizado",
      "Integrações Olist, Shopify e nota fiscal",
      "Vendedores ilimitados",
      "Vale-presente e sorteios",
    ],
    cta: "Assinar Crescimento",
    featured: true,
  },
  {
    name: "Rede",
    price: "R$ 349",
    priceSub: "por mês + multi-loja",
    desc: "Pra franqueadora ou rede com mais de uma unidade brigando por padrão.",
    features: [
      "Multi-loja com consolidação",
      "Painel administrativo e permissões",
      "Relatórios executivos",
      "Onboarding assistido e SLA de suporte",
    ],
    cta: "Falar com vendas",
  },
];

function PlanosPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-14 sm:px-8 md:pt-24">
        <div className="grid gap-x-14 gap-y-6 md:grid-cols-[1fr_1.3fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
              Planos e preços
            </div>
            <h1 className="mt-5 text-[46px] leading-[0.98] tracking-[-0.03em] sm:text-[64px] md:text-[80px]">
              <span className="font-bold">Preço honesto,</span>{" "}
              <span className="font-display italic">sem letrinha miúda.</span>
            </h1>
          </div>
          <div className="self-end">
            <p className="text-lg leading-relaxed text-[#0B0F1A]/65">
              A gente não cobra por cliente cadastrado nem por transação
              pontuada. Você paga uma mensalidade previsível e escala sem
              medo de conta chegando maior.
            </p>
          </div>
        </div>
      </section>

      {/* Grid de planos — coluna do meio dominante */}
      <section className="mx-auto max-w-7xl px-5 pb-16 sm:px-8">
        <div className="grid gap-5 md:grid-cols-3 md:items-stretch">
          {PLANS.map((p) => (
            <PlanCard key={p.name} plan={p} />
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-[#0B0F1A]/50">
          Preços em reais, impostos inclusos. Cancelamento a qualquer momento, sem multa.
        </p>
      </section>

      {/* Comparativo editorial */}
      <section className="border-t border-black/10 bg-[#F5F2EA]">
        <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
          <div className="grid gap-x-14 gap-y-6 md:grid-cols-[1fr_2fr]">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
                O que está incluso
              </div>
              <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                Recursos por plano.
              </h2>
            </div>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-black/15 text-xs uppercase tracking-wider text-[#0B0F1A]/55">
                  <th className="pb-4 font-medium">Recurso</th>
                  <th className="pb-4 text-center font-medium">Começo</th>
                  <th className="pb-4 text-center font-medium">Crescimento</th>
                  <th className="pb-4 text-center font-medium">Rede</th>
                </tr>
              </thead>
              <tbody className="[&_td]:py-4 [&_tr]:border-b [&_tr]:border-black/10">
                {[
                  ["Página pública com sua marca", true, true, true],
                  ["Pontos e cashback", true, true, true],
                  ["Vendedores no PDV", "1", "Ilimitados", "Ilimitados"],
                  ["Campanhas + WhatsApp", false, true, true],
                  ["Integrações Olist / Shopify", false, true, true],
                  ["Multi-loja consolidada", false, false, true],
                  ["Onboarding assistido", false, false, true],
                ].map((row) => (
                  <tr key={row[0] as string}>
                    <td className="font-medium">{row[0]}</td>
                    {row.slice(1).map((v, i) => (
                      <td key={i} className="text-center text-[#0B0F1A]/75">
                        {typeof v === "boolean" ? (
                          v ? (
                            <Check className="mx-auto h-4 w-4 text-[#0B0F1A]" strokeWidth={3} />
                          ) : (
                            <span className="text-[#0B0F1A]/25">—</span>
                          )
                        ) : (
                          v
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:items-end">
          <h2 className="font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl">
            Ainda em dúvida?<br />
            <em className="text-[#0B0F1A]/55">Testa grátis, sem cartão.</em>
          </h2>
          <div className="flex flex-col items-start gap-4 md:items-end">
            <Link
              to="/lojista/onboarding"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0B0F1A] px-6 py-3.5 text-sm font-semibold text-white hover:-translate-y-[1px] transition-transform"
            >
              Abrir minha loja <ArrowUpRight className="h-4 w-4" />
            </Link>
            <a
              href="https://wa.me/5511000000000"
              className="text-sm font-medium text-[#0B0F1A]/70 hover:text-[#0B0F1A]"
            >
              Ou fala com a gente no WhatsApp →
            </a>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const featured = plan.featured;
  return (
    <div
      className={
        featured
          ? "relative flex flex-col justify-between rounded-3xl bg-[#0B0F1A] p-8 text-white md:-my-4 md:p-10"
          : "flex flex-col justify-between rounded-3xl border border-black/10 bg-white p-8 md:p-10"
      }
    >
      {plan.tag && (
        <span className="absolute -top-3 left-8 rounded-full bg-[#14CBA8] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0B0F1A]">
          {plan.tag}
        </span>
      )}
      <div>
        <div className={`text-xs uppercase tracking-[0.22em] ${featured ? "text-white/50" : "text-[#0B0F1A]/45"}`}>
          {plan.name}
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <div className="font-display text-5xl leading-none tracking-tight sm:text-6xl">
            {plan.price}
          </div>
        </div>
        <div className={`mt-2 text-xs ${featured ? "text-white/60" : "text-[#0B0F1A]/55"}`}>
          {plan.priceSub}
        </div>
        <p className={`mt-6 text-sm leading-relaxed ${featured ? "text-white/75" : "text-[#0B0F1A]/70"}`}>
          {plan.desc}
        </p>
        <ul className="mt-6 space-y-3 text-sm">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <Check
                className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-[#14CBA8]" : "text-[#0B0F1A]"}`}
                strokeWidth={3}
              />
              <span className={featured ? "text-white/85" : "text-[#0B0F1A]/80"}>{f}</span>
            </li>
          ))}
        </ul>
      </div>
      <Link
        to="/lojista/onboarding"
        className={
          featured
            ? "mt-8 inline-flex items-center justify-center gap-1.5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0B0F1A] hover:-translate-y-[1px] transition-transform"
            : "mt-8 inline-flex items-center justify-center gap-1.5 rounded-full bg-[#0B0F1A] px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[1px] transition-transform"
        }
      >
        {plan.cta} <ArrowUpRight className="h-4 w-4" />
      </Link>
    </div>
  );
}