import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { SiteShell } from "@/components/site-chrome";

export const Route = createFileRoute("/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona | PontuaMax" },
      {
        name: "description",
        content:
          "Do cadastro à primeira venda pontuada em poucos minutos. Entenda como o PontuaMax roda no seu balcão e no seu e-commerce.",
      },
      { property: "og:title", content: "Como funciona | PontuaMax" },
      {
        property: "og:description",
        content:
          "Fluxo do PontuaMax: cadastro, personalização, integração e recorrência.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ComoFuncionaPage,
});

const STEPS = [
  {
    n: "01",
    title: "Você cria sua loja",
    body:
      "Cadastro em minutos com CNPJ. Escolhe uma URL curta — pontuamax.com/sualoja — e define o percentual de pontos e cashback.",
    tone: "light" as const,
    aside: {
      k: "12 min",
      v: "média do onboarding",
    },
  },
  {
    n: "02",
    title: "Personaliza com sua marca",
    body:
      "Sobe logo, define cor primária, banner e catálogo de recompensas. Sua página fica indistinguível do resto da sua identidade.",
    tone: "dark" as const,
    aside: {
      k: "0",
      v: "linhas de código exigidas",
    },
  },
  {
    n: "03",
    title: "Conecta com o seu jeito de vender",
    body:
      "Frente de caixa (PDV), Olist, Shopify, notas fiscais, WhatsApp ou lançamento manual pelo vendedor. Cada venda vira ponto e cashback automático.",
    tone: "light" as const,
    aside: {
      k: "6+",
      v: "integrações nativas",
    },
  },
  {
    n: "04",
    title: "O cliente volta — e volta de novo",
    body:
      "Ele acompanha saldo pelo celular, resgata prêmios, ganha nível e recebe campanhas segmentadas. Você acompanha tudo no painel.",
    tone: "dark" as const,
    aside: {
      k: "+42%",
      v: "recorrência em 90 dias",
    },
  },
];

function ComoFuncionaPage() {
  return (
    <SiteShell>
      {/* Hero */}
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-14 sm:px-8 md:pt-24">
        <div className="grid gap-x-14 md:grid-cols-[1fr_1.2fr]">
          <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
            Como funciona
          </div>
          <h1 className="text-[42px] leading-[0.98] tracking-[-0.03em] sm:text-[60px] md:text-[78px]">
            <span className="font-bold">Quatro passos.</span>{" "}
            <span className="font-display italic text-[#0B0F1A]/70">
              Um cliente que sempre volta.
            </span>
          </h1>
        </div>
      </section>

      {/* Passos alternando claro/escuro, sem cards simétricos */}
      <section>
        {STEPS.map((s, i) => (
          <div
            key={s.n}
            className={
              s.tone === "dark"
                ? "border-y border-black/5 bg-[#0B0F1A] text-white"
                : "bg-[#FAFAF7]"
            }
          >
            <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 sm:px-8 md:grid-cols-[auto_1.4fr_1fr] md:items-start md:py-28">
              <div
                className={`font-display text-[120px] leading-[0.85] tracking-tighter sm:text-[160px] ${
                  s.tone === "dark" ? "text-white/15" : "text-[#0B0F1A]/10"
                }`}
              >
                {s.n}
              </div>
              <div>
                <div
                  className={`text-xs uppercase tracking-[0.22em] ${
                    s.tone === "dark" ? "text-white/40" : "text-[#0B0F1A]/40"
                  }`}
                >
                  Passo {i + 1} de 4
                </div>
                <h2 className="mt-3 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
                  {s.title}
                </h2>
                <p
                  className={`mt-5 max-w-xl text-base leading-relaxed ${
                    s.tone === "dark" ? "text-white/70" : "text-[#0B0F1A]/65"
                  }`}
                >
                  {s.body}
                </p>
              </div>
              <div
                className={`self-end border-t pt-5 ${
                  s.tone === "dark" ? "border-white/15" : "border-black/10"
                }`}
              >
                <div className="font-display text-5xl leading-none">{s.aside.k}</div>
                <div
                  className={`mt-2 text-xs uppercase tracking-wider ${
                    s.tone === "dark" ? "text-white/50" : "text-[#0B0F1A]/50"
                  }`}
                >
                  {s.aside.v}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* FAQ editorial */}
      <section className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="grid gap-x-14 gap-y-8 md:grid-cols-[1fr_2fr]">
          <div>
            <div className="text-xs uppercase tracking-[0.22em] text-[#0B0F1A]/40">
              Perguntas honestas
            </div>
            <h2 className="mt-4 font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
              O que a gente mais responde no WhatsApp.
            </h2>
          </div>
          <dl className="divide-y divide-black/10">
            {[
              [
                "Preciso trocar meu sistema de vendas?",
                "Não. O PontuaMax roda ao lado do que você já usa — Olist, Shopify, PDV ou lançamento manual pelo vendedor.",
              ],
              [
                "Cliente sem cadastro consegue acumular pontos?",
                "Sim. Cadastra o CPF na venda e ele vira “pendente”. Quando ele criar a conta, o saldo continua lá, intacto.",
              ],
              [
                "Posso mudar o percentual de pontos e cashback?",
                "Sempre. As regras são suas e podem ser diferentes por produto, categoria ou nível VIP.",
              ],
              [
                "E se eu quiser cancelar?",
                "Sem multa, sem contrato longo. Você exporta seus clientes num clique e sai limpo.",
              ],
            ].map(([q, a]) => (
              <div key={q} className="grid gap-2 py-6 md:grid-cols-[1fr_2fr] md:gap-10">
                <dt className="font-display text-2xl leading-tight">{q}</dt>
                <dd className="text-base leading-relaxed text-[#0B0F1A]/70">{a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-5 pb-24 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 border-t border-black/10 pt-10 md:flex-row md:items-end">
          <h3 className="font-display text-4xl leading-[1.05] tracking-tight sm:text-5xl">
            Pronto pra começar?
          </h3>
          <div className="flex gap-3">
            <Link
              to="/lojista/onboarding"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#0B0F1A] px-5 py-3 text-sm font-semibold text-white hover:-translate-y-[1px] transition-transform"
            >
              Criar loja grátis <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              to="/planos"
              className="inline-flex items-center gap-1.5 rounded-full border border-black/15 bg-white px-5 py-3 text-sm font-semibold hover:border-black/40"
            >
              Ver planos
            </Link>
          </div>
        </div>
      </section>
    </SiteShell>
  );
}