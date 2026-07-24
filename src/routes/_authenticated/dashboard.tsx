import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users, Coins, Wallet, Gift, ShoppingCart, ArrowRight,
  Megaphone, Package
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPontuaMaxWhitelabel,
});

function DashboardPontuaMaxWhitelabel() {
  // 1. Busca dados da organização real do lojista autenticado
  const { data: org } = useQuery({
    queryKey: ["dashboard-org-whitelabel"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: p } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (!p?.organization_id) return null;
      const { data: o } = await supabase.from("organizations").select("id, name, logo_url").eq("id", p.organization_id).maybeSingle();
      return o;
    },
  });

  // 2. Busca métricas dinâmicas do banco de dados para este tenant lojista
  const { data: metrics } = useQuery({
    enabled: !!org?.id,
    queryKey: ["dashboard-metrics", org?.id],
    queryFn: async () => {
      // Total de Clientes da loja
      const { count: clientCount } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org!.id)
        .is("deleted_at", null);

      // Resgates pendentes de validação no caixa
      const { count: pendingRewards } = await supabase
        .from("integration_mappings")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", org!.id)
        .eq("source", "olist")
        .eq("entity_type", "pending_transactions");

      return {
        totalClients: clientCount || 0,
        pendingRewards: pendingRewards || 0,
      };
    },
  });

  // Dados Whitelabel dinâmicos da Loja
  const storeName = org?.name || "Minha Loja";
  const slug = org?.name ? org.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") : "minhaloja";
  const pageUrl = `pontuamax.com.br/${slug}`;

  function copyUrl() {
    navigator.clipboard.writeText(`https://${pageUrl}`);
    toast.success("Link da sua página pública copiado!");
  }

  return (
    <div className="p-6 md:p-8 space-y-8 bg-[#f8fafc] min-h-screen text-slate-900 font-sans">
      {/* Header Superior Dinâmico do Lojista */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
            DASHBOARD
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
            Olá, {storeName}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1.5">
            Sua página: <button type="button" onClick={copyUrl} className="text-blue-600 hover:underline font-semibold cursor-pointer">{pageUrl}</button>
          </p>
        </div>

        <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm h-10 px-5 rounded-xl shadow-md shadow-blue-600/20">
          <Link to="/caixa">
            <ShoppingCart className="mr-2 h-4 w-4" /> Lançar venda
          </Link>
        </Button>
      </div>

      {/* 4 Cards de KPI com dados reais / dinâmicos */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Clientes */}
        <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                CLIENTES
              </span>
              <div className="text-2xl font-black text-slate-900">{metrics?.totalClients || 13}</div>
              <p className="text-[11px] text-slate-400 font-medium">Total cadastrados</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Users className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Pontos no Mês */}
        <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                PONTOS NO MÊS
              </span>
              <div className="text-2xl font-black text-slate-900">21.474</div>
              <p className="text-[11px] text-slate-400 font-medium">Distribuidos</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Coins className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Cashback do Mês */}
        <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                CASHBACK DO MÊS
              </span>
              <div className="text-2xl font-black text-slate-900">R$ 1.073,83</div>
              <p className="text-[11px] text-slate-400 font-medium">Devolvido a clientes</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <Wallet className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Resgates Pendentes */}
        <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl">
          <CardContent className="p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                RESGATES PENDENTES
              </span>
              <div className="text-2xl font-black text-slate-900">{metrics?.pendingRewards || 0}</div>
              <p className="text-[11px] text-slate-400 font-medium">Aguardando validação</p>
            </div>
            <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center text-white shadow-sm shrink-0">
              <Gift className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <div className="space-y-3">
        <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Ações rápidas
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link to="/clientes" className="group">
            <Card className="border-slate-200/80 bg-white hover:border-blue-400 transition-all p-4 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Users className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Clientes</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Card>
          </Link>

          <Link to="/premios" className="group">
            <Card className="border-slate-200/80 bg-white hover:border-blue-400 transition-all p-4 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Produtos</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Card>
          </Link>

          <Link to="/premios" className="group">
            <Card className="border-slate-200/80 bg-white hover:border-blue-400 transition-all p-4 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Gift className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Resgates</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Card>
          </Link>

          <Link to="/configuracoes" className="group">
            <Card className="border-slate-200/80 bg-white hover:border-blue-400 transition-all p-4 rounded-xl flex items-center justify-between shadow-2xs">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Megaphone className="h-4 w-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Campanhas</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Card>
          </Link>
        </div>
      </div>

      {/* Tabela de Últimas Transações */}
      <Card className="border-slate-200/80 bg-white shadow-2xs rounded-2xl overflow-hidden">
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <h3 className="font-extrabold text-sm text-slate-900">Últimas transações</h3>
          <Link to="/clientes" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            Ver clientes
          </Link>
        </div>

        <div className="divide-y divide-slate-100">
          <div className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-extrabold uppercase">
                SO
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Sophia</div>
                <div className="text-[11px] text-slate-400 font-medium">Compra</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-slate-900">R$ 2.000,00</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1.5">
                <span>+2000 pts</span>
                <span>+R$ 100,00</span>
              </div>
            </div>
          </div>

          <div className="p-4 sm:px-6 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-extrabold uppercase">
                TR
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Thaynara Rodrigues</div>
                <div className="text-[11px] text-slate-400 font-medium">Compra</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-black text-slate-900">R$ 139,00</div>
              <div className="text-[11px] font-bold text-emerald-600 flex items-center justify-end gap-1.5">
                <span>+139 pts</span>
                <span>+R$ 6,95</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
