import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, Store } from "lucide-react";

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
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-orange-50">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-600 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-lg font-semibold">QSF Club</span>
        </div>
        <Link to="/lojista/login">
          <Button variant="ghost" size="sm">Entrar como lojista</Button>
        </Link>
      </header>
      <section className="mx-auto max-w-4xl px-6 py-16 text-center md:py-24">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-medium text-violet-700">
          Pontos • Cashback • Sua marca
        </div>
        <h1 className="mt-6 text-4xl font-bold tracking-tight md:text-6xl">
          Fidelize seus clientes<br />com a cara da sua loja
        </h1>
        <p className="mt-6 text-lg text-muted-foreground md:text-xl">
          Cada loja tem sua própria página personalizada. Escolha pontos, cashback ou ambos.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/lojista/onboarding">
            <Button size="lg" className="w-full sm:w-auto">
              <Store className="h-4 w-4" /> Criar minha loja
            </Button>
          </Link>
          <Link to="/lojista/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Já sou lojista, entrar
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Cada loja terá seu próprio link: qsfclub.com/<span className="font-mono">nomedaloja</span>
        </p>
      </section>
    </div>
  );
}