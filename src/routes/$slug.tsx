import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/pos";
import { formatDateTime } from "@/lib/erp";
import {
  Award, Coins, Gift, QrCode, Share2, Sparkles, UserCheck,
  CheckCircle2, ArrowRight, Copy, ShoppingBag, LogOut,
  HeartHandshake, RotateCcw, Download, Bell
} from "lucide-react";
import { toast } from "sonner";
import { triggerConfetti, playSuccessChime } from "@/lib/effects";
import { subscribeUserToPush } from "@/lib/push";
import { claimPendingPointsForCpf } from "@/services/pending-points-service";

export const Route = createFileRoute("/$slug")({
  component: VitrineClienteFinal,
});

// Mock de recompensas padrão (serão adaptadas dinamicamente com o nome da moeda do lojista)
const DEFAULT_REWARDS = [
  {
    id: "r1",
    title: "Voucher R$ 20,00 de Desconto",
    description: "Válido para qualquer compra na loja física ou e-commerce acima de R$ 100",
    points_cost: 200,
    cashback_cost: 0,
    category: "desconto",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80",
    badge: "Mais Resgatado",
  },
  {
    id: "r2",
    title: "Camiseta Exclusiva da Loja",
    description: "Edição limitada do programa de fidelidade. Retire no balcão da loja",
    points_cost: 500,
    cashback_cost: 0,
    category: "brinde",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    badge: "Exclusivo VIP",
  },
  {
    id: "r3",
    title: "Squeeze Térmica Inox 750ml",
    description: "Mantenha sua bebida gelada por até 24h durante o dia a dia",
    points_cost: 350,
    cashback_cost: 0,
    category: "brinde",
    image: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
    badge: "Popular",
  },
  {
    id: "r4",
    title: "Voucher R$ 50,00 de Cashback Extra",
    description: "Crédito direto no seu saldo para usar como quiser na próxima compra",
    points_cost: 450,
    cashback_cost: 0,
    category: "cashback",
    image: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80",
    badge: "Super Benefício",
  },
];

function VitrineClienteFinal() {
  const params = Route.useParams() as { slug?: string };
  const slug = params.slug || "loja";

  // 1. Busca dados públicos da loja pelo slug
  const { data: org } = useQuery({
    queryKey: ["public-org", slug],
    queryFn: async () => {
      const { data } = await supabase
        .from("organizations")
        .select("id, name, logo_url, currency")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data ?? { id: "demo-org", name: slug.toUpperCase().replace(/-/g, " "), logo_url: null };
    },
  });

  // 2. Busca configurações de branding e regras dinâmicas salvas pelo lojista (Whitelabel)
  const { data: storeConfig } = useQuery({
    enabled: !!org?.id,
    queryKey: ["store-branding-public", org?.id],
    queryFn: async () => {
      // Branding (logo, cores, nome da moeda, banner)
      const { data: brandingRow } = await supabase
        .from("integration_mappings")
        .select("metadata")
        .eq("organization_id", org!.id)
        .eq("source", "olist")
        .eq("entity_type", "store_branding")
        .maybeSingle();

      // Regras de fidelidade (cashback %, conversão de pontos)
      const { data: rulesRow } = await supabase
        .from("integration_mappings")
        .select("metadata")
        .eq("organization_id", org!.id)
        .eq("source", "olist")
        .eq("entity_type", "loyalty_settings")
        .maybeSingle();

      const brandingMeta = (brandingRow?.metadata as any) ?? {};
      const rulesMeta = (rulesRow?.metadata as any) ?? {};

      const defaultTiers = [
        { name: "Bronze 🥉", min: 0, nextMin: 500, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
        { name: "Prata 🥈", min: 500, nextMin: 1000, color: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
        { name: "Ouro 🥇", min: 1000, nextMin: 2000, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
        { name: "Diamante 💎", min: 2000, nextMin: 5000, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
      ];

      return {
        logoUrl: brandingMeta.logo_url ?? org?.logo_url ?? null,
        bannerUrl: brandingMeta.banner_url ?? null,
        primaryColor: brandingMeta.primary_color ?? "#6366f1", // Cor primária do lojista
        currencyName: brandingMeta.currency_name ?? "Pontos", // Nome dinâmico da moeda de troca
        cashbackPercent: Number(rulesMeta.cashback_percent ?? 5),
        pointsRate: Number(rulesMeta.points_per_currency ?? 1),
        vipTiers: (brandingMeta.vip_tiers as typeof defaultTiers) ?? defaultTiers,
      };
    },
  });

  const currencyName = storeConfig?.currencyName ?? "Pontos";
  const primaryColor = storeConfig?.primaryColor ?? "#6366f1";

  // 3. Busca prêmios dinâmicos ativos cadastrados pelo lojista no painel (/premios)
  const { data: publicRewards } = useQuery({
    enabled: !!org?.id,
    queryKey: ["public-store-rewards", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("integration_mappings")
        .select("external_id, metadata")
        .eq("organization_id", org!.id)
        .eq("source", "olist")
        .eq("entity_type", "loyalty_rewards");

      if (!data || data.length === 0) {
        return DEFAULT_REWARDS;
      }

      const activeRewards = data
        .map((row: any) => ({
          id: row.external_id,
          image: row.metadata?.image_url ?? row.metadata?.image ?? "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80",
          ...(row.metadata as any),
        }))
        .filter((r: any) => r.active !== false && (r.stock === undefined || r.stock === -1 || r.stock > 0));

      return activeRewards.length > 0 ? activeRewards : DEFAULT_REWARDS;
    },
  });

  const rewards = publicRewards ?? DEFAULT_REWARDS;

  // Estado de Login / Identificação do Cliente Final
  const [cpfInput, setCpfInput] = useState("");
  const [identifiedCpf, setIdentifiedCpf] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(`pm_client_cpf_${slug}`) || null;
    }
    return null;
  });

  // 4. Estado de Instalação do PWA & Web Push
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [pushSubscribed, setPushSubscribed] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    if (typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches) {
      setIsAppInstalled(true);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) {
      toast.info("Para instalar no iPhone/iPad: Toque em Compartilhar e 'Adicionar à Tela de Início'.");
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsAppInstalled(true);
      toast.success("App adicionado à Tela de Início!");
    }
    setDeferredPrompt(null);
  };

  const handleTogglePush = async () => {
    const ok = await subscribeUserToPush(org?.id, identifiedCpf || undefined);
    if (ok) {
      setPushSubscribed(true);
    }
  };

  // Consulta saldo e dados do cliente identificado
  const { data: clientData, refetch: refetchClient } = useQuery({
    enabled: !!identifiedCpf && !!org?.id,
    queryKey: ["public-client", org?.id, identifiedCpf, storeConfig?.pointsRate],
    queryFn: async () => {
      const cleanCpf = identifiedCpf!.replace(/\D+/g, "");
      const { data: existingClient } = await supabase
        .from("clients")
        .select("*")
        .eq("organization_id", org!.id)
        .eq("cpf", cleanCpf)
        .is("deleted_at", null)
        .maybeSingle();

      let client = existingClient;
      if (!client) {
        // Auto-cria o cadastro do cliente para resgate de pontos pendentes por CPF
        const { data: newClient } = await supabase
          .from("clients")
          .insert({
            organization_id: org!.id,
            cpf: cleanCpf,
            full_name: "Cliente Fidelidade",
          })
          .select("*")
          .single();
        client = newClient;
      }

      if (!client) return null;

      // Resgata automaticamente os pontos/cashback pendentes vinculados ao CPF (gerados por Olist, Bling, Tiny, etc.)
      const claimResult = await claimPendingPointsForCpf(org!.id, cleanCpf, client.id);
      if (claimResult.claimedPoints > 0 || claimResult.claimedCashback > 0) {
        triggerConfetti();
        playSuccessChime();
        toast.success(`🎉 Encontramos ${claimResult.claimedPoints} pontos e ${money(claimResult.claimedCashback)} de ${claimResult.ordersCount} compra(s) anterior(es) te esperando!`);
      }

      // Busca conta de saldo / cashback
      const { data: sca } = await supabase
        .from("store_credit_accounts")
        .select("balance")
        .eq("organization_id", org!.id)
        .eq("client_id", client.id)
        .maybeSingle();

      // Busca histórico de compras / vendas
      const { data: sales } = await supabase
        .from("sales")
        .select("id, total, created_at, sale_number")
        .eq("organization_id", org!.id)
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(10);

      // Busca histórico de cashback / movimentações
      const { data: creditTxs } = await supabase
        .from("store_credit_transactions")
        .select("*")
        .eq("organization_id", org!.id)
        .eq("client_id", client.id)
        .order("created_at", { ascending: false })
        .limit(10);

      const totalSpent = (sales ?? []).reduce((acc, s) => acc + Number(s.total || 0), 0);
      const pointsRate = storeConfig?.pointsRate ?? 1;
      const pointsBalance = Math.floor(totalSpent * pointsRate); // Dinâmico por lojista
      const cashbackBalance = Number(sca?.balance ?? 0);

      // Determinar Nível VIP dinamicamente pelas regras salvas pelo lojista
      const vipTiers = storeConfig?.vipTiers ?? [
        { name: "Bronze 🥉", min: 0, nextMin: 500, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
        { name: "Prata 🥈", min: 500, nextMin: 1000, color: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
        { name: "Ouro 🥇", min: 1000, nextMin: 2000, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
        { name: "Diamante 💎", min: 2000, nextMin: 5000, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
      ];

      let tier = vipTiers[0];
      for (let i = vipTiers.length - 1; i >= 0; i--) {
        if (totalSpent >= vipTiers[i].min) {
          tier = vipTiers[i];
          break;
        }
      }

      return {
        client,
        cashbackBalance,
        pointsBalance,
        totalSpent,
        tier,
        sales: sales ?? [],
        transactions: creditTxs ?? [],
      };
    },
  });

  // Modal de Voucher Gerado
  const [selectedReward, setSelectedReward] = useState<any | null>(null);
  const [generatedVoucher, setGeneratedVoucher] = useState<{ code: string; reward: any } | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = cpfInput.replace(/\D+/g, "");
    if (clean.length !== 11) {
      toast.error("Por favor, digite um CPF válido com 11 dígitos.");
      return;
    }
    setIdentifiedCpf(clean);
    if (typeof window !== "undefined") {
      localStorage.setItem(`pm_client_cpf_${slug}`, clean);
    }
    toast.success("CPF identificado com sucesso!");
  };

  const handleLogout = () => {
    setIdentifiedCpf(null);
    setCpfInput("");
    if (typeof window !== "undefined") {
      localStorage.removeItem(`pm_client_cpf_${slug}`);
    }
    toast.info("Você saiu da sua conta.");
  };

  const handleRedeemReward = (reward: any) => {
    if (!identifiedCpf || !clientData?.client) {
      toast.error(`Identifique-se com seu CPF para resgatar este prêmio.`);
      return;
    }
    if ((clientData.pointsBalance ?? 0) < reward.points_cost) {
      toast.error(`Saldo insuficiente. Você precisa de ${reward.points_cost} ${currencyName.toLowerCase()} para este prêmio.`);
      return;
    }
    // Gerar código único de Voucher
    const code = `PM-${Math.floor(1000 + Math.random() * 9000)}-${slug.slice(0, 3).toUpperCase()}`;
    setGeneratedVoucher({ code, reward });
    setSelectedReward(null);
    triggerConfetti();
    playSuccessChime();
    toast.success("Prêmio resgatado com sucesso! Apresente o QR Code no caixa da loja.");
  };

  const storeName = org?.name ?? "Nossa Loja";

  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-100 antialiased pb-12 selection:bg-primary selection:text-primary-foreground">
      {/* Dynamic Background Glow baseada na Cor Primária do Lojista */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 h-96 w-96 rounded-full opacity-20 blur-[120px]"
          style={{ backgroundColor: primaryColor }}
        />
        <div className="absolute top-1/3 -right-40 h-96 w-96 rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>

      {/* Top Header / Brand Bar Dinâmica */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#0d0f14]/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            {storeConfig?.logoUrl ? (
              <img src={storeConfig.logoUrl} alt={storeName} className="h-10 w-10 rounded-xl object-cover border border-white/10" />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white font-bold text-lg shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {storeName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                {storeName}
                <Badge variant="outline" className="text-[10px] font-medium border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                  Clube de Fidelidade
                </Badge>
              </h1>
              <p className="text-[11px] text-slate-400">Programa de {currencyName} & Cashback</p>
            </div>
          </div>

          {identifiedCpf ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-xs text-slate-400 hover:text-white">
              <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sair
            </Button>
          ) : (
            <Badge variant="outline" className="text-xs border-white/10 bg-white/5 text-slate-300">
              <UserCheck className="mr-1 h-3.5 w-3.5 text-emerald-400" /> Acesso Seguro
            </Badge>
          )}
        </div>
      </header>

      <main className="relative mx-auto max-w-4xl px-4 pt-6 sm:px-6 space-y-6">
        {/* Banner PWA de Instalação do App */}
        {!isAppInstalled && (
          <Card className="border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/40 p-4 flex flex-row items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary border border-primary/30">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  Instalar App da {storeName}
                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-300 bg-emerald-500/10">PWA</Badge>
                </div>
                <div className="text-xs text-slate-300">Instale na Tela de Início para acessar seu saldo em 1-clique sem digitar URL.</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleInstallPWA} className="bg-primary hover:bg-primary/90 text-xs font-semibold whitespace-nowrap shadow">
                Instalar App
              </Button>
            </div>
          </Card>
        )}

        {/* Banner de Boas-Vindas & Status de Login */}
        {!identifiedCpf ? (
          <Card className="border-white/10 bg-gradient-to-br from-slate-900 via-[#131722] to-[#181e2e] shadow-2xl overflow-hidden relative">
            {storeConfig?.bannerUrl && (
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <img src={storeConfig.bannerUrl} alt="Banner" className="w-full h-full object-cover" />
              </div>
            )}
            <CardContent className="p-6 sm:p-8 space-y-6 relative">
              <div className="space-y-2 max-w-xl">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{ borderColor: `${primaryColor}40`, backgroundColor: `${primaryColor}15`, color: primaryColor }}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Ganhe {currencyName} e Cashback em cada compra!
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Bem-vindo ao Clube da <span style={{ color: primaryColor }}>{storeName}</span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-300">
                  Consulte seu saldo de {currencyName.toLowerCase()}, cashback acumulado e resgate prêmios exclusivos digitando apenas o seu CPF.
                </p>
              </div>

              {/* Form de Identificação */}
              <form onSubmit={handleLogin} className="flex flex-col sm:flex-row gap-3 max-w-md">
                <div className="relative flex-1">
                  <UserCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    value={cpfInput}
                    onChange={(e) => setCpfInput(e.target.value)}
                    placeholder="Digite seu CPF (ex: 000.000.000-00)"
                    className="pl-9 bg-black/40 border-white/15 text-white placeholder:text-slate-500 h-11 text-sm rounded-xl"
                  />
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="h-11 rounded-xl text-white font-semibold shadow-lg hover:opacity-95"
                  style={{ backgroundColor: primaryColor }}
                >
                  Ver Meu Saldo <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="grid grid-cols-3 gap-3 pt-2 border-t border-white/10 text-center text-xs text-slate-400">
                <div className="flex items-center justify-center gap-1.5">
                  <Coins className="h-4 w-4 text-emerald-400" /> Cashback em R$
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Award className="h-4 w-4" style={{ color: primaryColor }} /> {currencyName} no Caixa
                </div>
                <div className="flex items-center justify-center gap-1.5">
                  <Gift className="h-4 w-4 text-purple-400" /> Prêmios Exclusivos
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* PAINEL DO CLIENTE LOGADO */
          <div className="space-y-6">
            {/* Header do Cliente & Cards de Saldo */}
            <Card className="border-white/10 bg-gradient-to-r from-slate-900 to-[#131726] shadow-xl overflow-hidden relative">
              <CardContent className="p-6 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="h-12 w-12 rounded-full border flex items-center justify-center font-extrabold text-xl"
                      style={{ backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}40`, color: primaryColor }}
                    >
                      {clientData?.client?.full_name?.slice(0, 1) ?? "C"}
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        Olá, {clientData?.client?.full_name ?? "Cliente VIP"}!
                        {clientData?.tier && (
                          <Badge variant="outline" className={`text-xs ${clientData.tier.color}`}>
                            {clientData.tier.name}
                          </Badge>
                        )}
                      </h2>
                      <p className="text-xs text-slate-400">CPF: ***.***.{(identifiedCpf || "").slice(-4)}-**</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center">
                    <Button variant="outline" size="sm" onClick={handleTogglePush} className="border-white/10 text-xs text-slate-300">
                      <Bell className="mr-1.5 h-3.5 w-3.5 text-amber-400" />
                      {pushSubscribed ? "Push Ativo" : "Ativar Alertas Push"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => refetchClient()} className="border-white/10 text-xs">
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Atualizar Saldo
                    </Button>
                  </div>
                </div>

                {/* Duplo Card de Saldo */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Card de Cashback */}
                  <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/40 via-emerald-900/20 to-slate-900 p-5 space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Coins className="h-4 w-4" /> Saldo de Cashback
                      </span>
                      <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px]">
                        Dinheiro de Volta
                      </Badge>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-white">
                      {money(clientData?.cashbackBalance ?? 0)}
                    </div>
                    <p className="text-[11px] text-emerald-300/80">
                      Disponível para abater nas suas próximas compras na loja.
                    </p>
                  </div>

                  {/* Card de Moeda Dinâmica (ex: Pontos, FitCoins, Estrelas) */}
                  <div
                    className="rounded-2xl border p-5 space-y-2 relative overflow-hidden"
                    style={{ borderColor: `${primaryColor}40`, background: `linear-gradient(to bottom right, ${primaryColor}15, rgba(15, 23, 42, 0.9))` }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5" style={{ color: primaryColor }}>
                        <Award className="h-4 w-4" /> Saldo de {currencyName}
                      </span>
                      <Badge className="border text-[10px]" style={{ backgroundColor: `${primaryColor}20`, borderColor: `${primaryColor}40`, color: primaryColor }}>
                        Clube VIP
                      </Badge>
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-white">
                      {(clientData?.pointsBalance ?? 0).toLocaleString("pt-BR")} <span className="text-lg font-normal opacity-80" style={{ color: primaryColor }}>{currencyName.toLowerCase()}</span>
                    </div>
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Progresso Nível {clientData?.tier?.name}</span>
                        <span>{clientData?.totalSpent ? money(clientData.totalSpent) : "R$ 0"} / {money(clientData?.tier?.nextMin ?? 1000)}</span>
                      </div>
                      <Progress
                        value={Math.min(100, Math.round(((clientData?.totalSpent ?? 0) / (clientData?.tier?.nextMin ?? 1000)) * 100))}
                        className="h-1.5 bg-slate-800"
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Navegação por Abas da Vitrine */}
            <Tabs defaultValue="rewards" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto bg-slate-900/80 p-1 border border-white/10 rounded-xl">
                <TabsTrigger value="rewards" className="text-xs flex items-center gap-1.5">
                  <Gift className="h-3.5 w-3.5" /> Prêmios
                </TabsTrigger>
                <TabsTrigger value="history" className="text-xs flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5" /> Histórico
                </TabsTrigger>
                <TabsTrigger value="referral" className="text-xs flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5" /> Indicar Amigo
                </TabsTrigger>
              </TabsList>

              {/* ABA 1: CATÁLOGO DE PRÊMIOS */}
              <TabsContent value="rewards" className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Gift className="h-4 w-4" style={{ color: primaryColor }} /> Catálogo de Prêmios & Vouchers
                    </h3>
                    <p className="text-xs text-slate-400">Troque seus {currencyName.toLowerCase()} acumulados por cupons de desconto e brindes na loja.</p>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {rewards.map((item) => {
                    const canAfford = (clientData?.pointsBalance ?? 0) >= item.points_cost;
                    return (
                      <Card key={item.id} className="border-white/10 bg-slate-900/60 overflow-hidden hover:border-white/20 transition-all flex flex-col justify-between group">
                        <div className="relative h-44 w-full overflow-hidden bg-slate-800">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <Badge className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white border-white/20 text-[10px]">
                            {item.badge}
                          </Badge>
                        </div>
                        <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          <div>
                            <h4 className="text-base font-bold text-white leading-snug">{item.title}</h4>
                            <p className="text-xs text-slate-400 mt-1">{item.description}</p>
                          </div>

                          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Custo em {currencyName}</span>
                              <span className="text-lg font-black" style={{ color: primaryColor }}>{item.points_cost} {currencyName.toLowerCase()}</span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setSelectedReward(item)}
                              className="rounded-lg text-xs font-semibold text-white"
                              style={{ backgroundColor: canAfford ? primaryColor : "#334155" }}
                            >
                              {canAfford ? "Resgatar Prêmio" : `Faltam ${currencyName}`}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>

              {/* ABA 2: HISTÓRICO DE COMPRAS E EXTRATO */}
              <TabsContent value="history" className="space-y-4">
                <Card className="border-white/10 bg-slate-900/60">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4 text-emerald-400" /> Histórico de Compras e Movimentações
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-white/5 text-xs">
                      {clientData?.sales?.length === 0 && clientData?.transactions?.length === 0 ? (
                        <div className="p-6 text-center text-slate-400">Nenhuma compra ou movimentação registrada ainda.</div>
                      ) : (
                        (clientData?.sales ?? []).map((s: any) => (
                          <div key={s.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                            <div className="space-y-1">
                              <div className="font-semibold text-white">Venda #{s.sale_number}</div>
                              <div className="text-slate-400 text-[11px]">{formatDateTime(s.created_at)}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-white">{money(s.total)}</div>
                              <div className="text-emerald-400 text-[11px] font-medium">+ {Math.floor(Number(s.total) * (storeConfig?.pointsRate ?? 1))} {currencyName.toLowerCase()}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ABA 3: INDIQUE E GANHE */}
              <TabsContent value="referral" className="space-y-4">
                <Card className="border-white/10 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-900">
                  <CardContent className="p-6 space-y-5">
                    <div className="space-y-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                        <HeartHandshake className="h-3.5 w-3.5" /> Programa Indique & Ganhe
                      </span>
                      <h3 className="text-xl font-bold text-white">Convide amigos e ganhe bônus!</h3>
                      <p className="text-xs text-slate-300">
                        Compartilhe seu código exclusivo. Quando seu amigo fizer a primeira compra na loja, vocês dois ganham <strong>+50 {currencyName} de Bônus</strong>!
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/10 bg-black/40 p-4 space-y-3">
                      <span className="text-xs text-slate-400 block font-medium">Seu Link de Indicação Pessoal</span>
                      <div className="flex items-center gap-2">
                        <Input
                          readOnly
                          value={`https://pontuamax.com/${slug}?ref=${(identifiedCpf || "").slice(-6)}`}
                          className="bg-slate-900 border-white/15 text-xs font-mono text-white h-10"
                        />
                        <Button
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(`https://pontuamax.com/${slug}?ref=${(identifiedCpf || "").slice(-6)}`);
                            toast.success("Link de indicação copiado!");
                          }}
                          className="h-10 text-xs text-white"
                          style={{ backgroundColor: primaryColor }}
                        >
                          <Copy className="h-3.5 w-3.5 mr-1" /> Copiar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Modal de Confirmação de Resgate */}
        <Dialog open={!!selectedReward} onOpenChange={(o) => !o && setSelectedReward(null)}>
          <DialogContent className="max-w-md border-white/10 bg-slate-900 text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Confirmar Resgate do Prêmio</DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Você está prestes a utilizar seus {currencyName.toLowerCase()} para resgatar este voucher.
              </DialogDescription>
            </DialogHeader>
            {selectedReward && (
              <div className="space-y-4 text-sm pt-2">
                <div className="rounded-xl border border-white/10 bg-slate-800/50 p-4 space-y-2">
                  <div className="font-bold text-white text-base">{selectedReward.title}</div>
                  <div className="text-xs text-slate-300">{selectedReward.description}</div>
                  <div className="pt-2 flex justify-between items-center text-xs font-semibold">
                    <span className="text-slate-400">Custo:</span>
                    <span className="font-bold" style={{ color: primaryColor }}>{selectedReward.points_cost} {currencyName}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => setSelectedReward(null)} className="border-white/10 text-xs">
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleRedeemReward(selectedReward)}
                    className="text-xs font-semibold text-white"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Confirmar e Gerar Voucher
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal de Voucher com QR Code Gerado */}
        <Dialog open={!!generatedVoucher} onOpenChange={(o) => !o && setGeneratedVoucher(null)}>
          <DialogContent className="max-w-md border-emerald-500/30 bg-gradient-to-br from-slate-900 via-[#111625] to-[#0f1b1a] text-white">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5" /> Voucher Gerado com Sucesso!
              </DialogTitle>
            </DialogHeader>
            {generatedVoucher && (
              <div className="space-y-5 text-sm text-center pt-2">
                <div className="rounded-2xl border border-emerald-500/30 bg-black/60 p-6 space-y-4">
                  <div className="text-xs text-emerald-300 font-semibold uppercase tracking-wider">
                    {generatedVoucher.reward.title}
                  </div>

                  {/* QR Code Simulado com Design Elegante */}
                  <div className="mx-auto h-44 w-44 rounded-xl bg-white p-3 shadow-xl flex items-center justify-center">
                    <QrCode className="h-36 w-36 text-slate-900" />
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase tracking-widest block">Código do Voucher</span>
                    <div className="font-mono text-xl font-black text-white tracking-widest bg-white/10 py-1.5 px-3 rounded-lg border border-white/15 inline-block">
                      {generatedVoucher.code}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-300">
                  Apresente este QR Code no caixa da <strong>{storeName}</strong> no momento da compra para receber o benefício.
                </p>

                <Button onClick={() => setGeneratedVoucher(null)} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold">
                  Concluído
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
