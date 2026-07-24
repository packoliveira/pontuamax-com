import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Check } from "lucide-react";
import { SiteShell } from "@/components/site-chrome";

export const Route = createFileRoute("/lojistas")({
  head: () => ({
    meta: [
      { title: "Para lojistas | PontuaMax" },
      {
        name: "description",
        content:
          "Programa de fidelidade completo para lojistas brasileiros: pontos, cashback, campanhas e página exclusiva. Integrações com Olist, Shopify e frente de caixa.",
      },
      { property: "og:title", content: "Para lojistas | PontuaMax" },
      {
        property: "og:description",
        content:
          "Pontos, cashback, campanhas e página com sua marca para lojistas do Brasil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LojistasPage,
});

function LojistasPage() {
  return (
    <SiteShell>
      {/* HERO editorial */}
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-20 sm:px-8 md:pt-24">
        <div className="grid gap-x-14 gap-y-8 md:grid-cols-[1.1fr_1fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
              Para lojistas
            </div>
            <h1 className="mt-5 text-[46px] leading-[0.98] tracking-[-0.03em] sm:text-[64px] md:text-[80px]">
              <span className="font-bold">Fidelidade</span>{" "}
              <span className="font-display italic">sob medida</span>{" "}
              <span className="font-bold">pra loja brasileira.</span>
            </h1>
          </div>
          <div className="self-end">
            <p className="text-lg leading-relaxed text-[#0B0F1A]/70">
              Sua loja tem CNPJ pequeno, físico, e-commerce, atendimento por
              WhatsApp e cliente que compra por indicação. A gente montou o
              PontuaMax pensando nesse Brasil — não em SaaS gringo copiado.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/lojista/onboarding"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#0B0F1A] px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[1px] transition-transform"
              >
                Abrir minha loja <ArrowUpRight className="h-4 w-4" />
              </Link>
              <Link
                to="/planos"
                className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-semibold hover:border-black/40"
              >
                Ver planos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Split image + list */}
      <section className="border-y border-black/5 bg-white/50">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-2 md:items-center md:py-24">
          <img
            src="https://images.unsplash.com/photo-1556740738-b6a63e27c4df?auto=format&fit=crop&w=900&q=70"
            alt="Lojista atendendo cliente"
            className="aspect-[4/5] w-full rounded-2xl object-cover shadow-[0_30px_60px_-30px_rgba(11,15,26,0.35)]"
          />
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
              O que muda no seu balcão
            </div>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              Menos “dá um descontinho”. Mais “volta semana que vem”.
            </h2>
            <ul className="mt-8 space-y-5 text-[15px] text-[#0B0F1A]/80">
              {[
                ["Página própria", "URL curta pontuamax.com/sualoja com sua marca, catálogo e cupons."],
                ["Vendedor no PDV", "Aplicativo separado com QR Code — pontua venda em 3 toques."],
                ["Integrações reais", "Olist, Shopify, notas fiscais e WhatsApp — sem depender de TI."],
                ["Segmentação de clientes", "Filtra inativos, VIPs e aniversariantes. Dispara campanha."],
                ["Cashback com regra sua", "Você define percentual, validade e valor mínimo pra usar."],
                ["Sorteios & vale-presente", "Ferramentas que o cliente ama e o seu concorrente não tem."],
              ].map(([t, d]) => (
                <li key={t} className="flex gap-4 border-b border-black/5 pb-4 last:border-none">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0B0F1A] text-white">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                  <div>
                    <div className="font-semibold text-[#0B0F1A]">{t}</div>
                    <div className="mt-0.5 text-sm text-[#0B0F1A]/60">{d}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Métricas em faixa clara */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-x-14 gap-y-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
              Números reais
            </div>
            <h2 className="mt-3 font-display text-3xl leading-[1.05] tracking-tight sm:text-4xl">
              Resultado que o balcão sente.
            </h2>
          </div>
          {[
            { k: "+42%", v: "recorrência de compra em 90 dias" },
            { k: "3,2×", v: "ticket médio de cliente fiel vs. novo" },
            { k: "R$ 2,80", v: "custo médio por cliente retido / mês" },
          ].map((m) => (
            <div key={m.v} className="border-t border-black/10 pt-6">
              <div className="font-display text-5xl leading-none">{m.k}</div>
              <div className="mt-3 text-sm text-[#0B0F1A]/60">{m.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Depoimentos alternados — 2 histórias */}
      <section className="bg-[#F5F2EA]">
        <div className="mx-auto grid max-w-7xl gap-16 px-5 py-20 sm:px-8 md:py-24">
          <TestimonialRow
            side="left"
            img="https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=700&q=70"
            quote="No terceiro mês metade da minha agenda era cliente que voltou pelo cashback. Parou de doer no bolso o custo de atrair.”"
            name="Camila Prado"
            role="Studio Vitta · Curitiba"
          />
          <TestimonialRow
            side="right"
            img="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=700&q=70"
            quote="Meu vendedor sênior não gostava de sistema. Hoje ele pergunta o CPF antes do preço. Isso mudou o balcão."
            name="Diego Marques"
            role="Empório Bom · São Paulo"
          />
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="rounded-3xl bg-[#0B0F1A] p-10 text-white md:p-16">
          <div className="grid gap-8 md:grid-cols-[1.4fr_1fr] md:items-end">
            <h2 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
              Abra sua página em 12 minutos.<br />
              <em className="text-white/60">Pra ontem, na verdade.</em>
            </h2>
            <div className="flex flex-col items-start gap-4 md:items-end">
              <Link
                to="/lojista/onboarding"
                className="inline-flex items-center gap-1.5 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-[#0B0F1A] hover:-translate-y-[1px] transition-transform"
              >
                Criar minha loja grátis <ArrowUpRight className="h-4 w-4" />
              </Link>
              <p className="max-w-xs text-sm text-white/60 md:text-right">
                Grátis para começar. Você só paga quando começar a lucrar mais.
              </p>
            </div>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}

function TestimonialRow({
  side,
  img,
  quote,
  name,
  role,
}: {
  side: "left" | "right";
  img: string;
  quote: string;
  name: string;
  role: string;
}) {
  return (
    <div className={`grid gap-8 md:grid-cols-[1fr_1.6fr] md:items-center ${side === "right" ? "md:[&>img]:order-2" : ""}`}>
      <img
        src={img}
        alt={name}
        className="aspect-square w-full max-w-xs rounded-2xl object-cover shadow-[0_20px_40px_-20px_rgba(11,15,26,0.35)]"
      />
      <div>
        <blockquote className="font-display text-3xl leading-[1.15] tracking-tight text-[#0B0F1A] sm:text-4xl">
          “{quote}
        </blockquote>
        <div className="mt-5 text-sm">
          <div className="font-semibold">{name}</div>
          <div className="text-[#0B0F1A]/50">{role}</div>
        </div>
      </div>
    </div>
  );
}