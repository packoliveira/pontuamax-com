import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Award,
  Coins,
  Gift,
  QrCode,
  Sparkles,
  Users,
  Check,
  ShieldCheck,
  Zap,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  LayoutDashboard,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/")({
  component: LandingPontuaMax,
  head: () => ({
    meta: [
      { title: "PontuaMax · Sistema de Fidelidade e Cashback para Lojas" },
      {
        name: "description",
        content:
          "Plataforma whitelabel de fidelidade e cashback para lojas físicas e e-commerce. Pontuação por CPF, recompensas, campanhas e relacionamento em um só lugar.",
      },
      { property: "og:title", content: "PontuaMax · Fidelidade & Cashback Whitelabel" },
      { property: "og:type", content: "website" },
    ],
  }),
});

function LandingPontuaMax() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Header da Landing */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0f19]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 font-black text-white shadow-lg">
              PM
            </div>
            <span className="font-extrabold text-xl tracking-tight text-white">
              Pontua<span className="text-indigo-400">Max</span>
            </span>
            <Badge
              variant="outline"
              className="ml-2 border-indigo-500/30 text-indigo-300 bg-indigo-500/10 text-[10px]"
            >
              SaaS Whitelabel
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="ghost"
              asChild
              className="text-xs text-slate-300 hover:text-white"
            >
              <Link to="/lojista/login">Entrar</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold shadow-lg shadow-indigo-600/20"
            >
              <Link to="/lojista">
                Acessar Painel <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-32">
        <div className="absolute inset-0 opacity-30 pointer-events-none">
          <div className="absolute left-1/2 top-10 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-tr from-indigo-600/30 to-purple-600/30 blur-[120px] rounded-full"></div>
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-300">
            <Sparkles className="h-4 w-4 text-indigo-400" /> Transforme Compras em Fidelidade e
            Vendas Recorrentes
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight max-w-4xl mx-auto leading-tight">
            Programa de{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
              Fidelidade & Cashback
            </span>{" "}
            para sua Loja
          </h1>

          <p className="text-base sm:text-xl text-slate-300 max-w-2xl mx-auto font-normal">
            Substitua o cartão de papel por uma experiência digital 100% Whitelabel. O cliente
            compra na loja física ou no e-commerce, acumula pontos e cashback por CPF e troca por
            recompensas.
          </p>

          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Button
              size="lg"
              asChild
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm h-12 px-8 shadow-xl shadow-indigo-600/30"
            >
              <Link to="/lojista/onboarding">
                <LayoutDashboard className="mr-2 h-5 w-5" /> Criar minha loja
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white/15 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm h-12 px-8"
            >
              <a href="#recursos">
                <Sparkles className="mr-2 h-5 w-5 text-indigo-400" /> Conhecer recursos
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* Módulos Principais */}
      <section id="recursos" className="py-16 bg-slate-950/60 border-y border-white/5">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center space-y-3">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              Recursos do PontuaMax
            </h2>
            <p className="text-sm text-slate-400 max-w-xl mx-auto">
              Gerencie pontuação, recompensas, equipe e a experiência pública dos seus clientes.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Caixa */}
            <Card className="border-white/10 bg-slate-900/60 hover:border-indigo-500/40 transition-all group">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 group-hover:scale-110 transition-transform">
                  <CreditCard className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-white">Lançar venda</h3>
                  <p className="text-xs text-slate-400">
                    Pontue clientes por CPF no balcão e dê baixa em vouchers com efeito sonoro.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="w-full justify-between text-xs text-emerald-400 hover:text-emerald-300"
                >
                  <Link to="/lojista/lancar-venda">
                    Lançar venda <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Card 2: Recompensas */}
            <Card className="border-white/10 bg-slate-900/60 hover:border-indigo-500/40 transition-all group">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-110 transition-transform">
                  <Gift className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-white">Catálogo de recompensas</h3>
                  <p className="text-xs text-slate-400">
                    Cadastre cupons de desconto, brindes e recompensas na moeda da sua loja.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="w-full justify-between text-xs text-purple-400 hover:text-purple-300"
                >
                  <Link to="/lojista/produtos">
                    Gerenciar prêmios <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Card 3: Dashboard */}
            <Card className="border-white/10 bg-slate-900/60 hover:border-indigo-500/40 transition-all group">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-white">Dashboard do lojista</h3>
                  <p className="text-xs text-slate-400">
                    Acompanhe KPIs de retenção, receita de fidelizados e ranking VIP.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="w-full justify-between text-xs text-indigo-400 hover:text-indigo-300"
                >
                  <Link to="/lojista">
                    Ver indicadores <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            {/* Card 4: Vitrine */}
            <Card className="border-white/10 bg-slate-900/60 hover:border-indigo-500/40 transition-all group">
              <CardContent className="p-6 space-y-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 group-hover:scale-110 transition-transform">
                  <Store className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-lg text-white">Vitrine personalizada</h3>
                  <p className="text-xs text-slate-400">
                    Página whitelabel do cliente para resgate de prêmios com PWA e confetes.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  asChild
                  className="w-full justify-between text-xs text-amber-400 hover:text-amber-300"
                >
                  <Link to="/lojista/personalizacao">
                    Personalizar vitrine <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}
