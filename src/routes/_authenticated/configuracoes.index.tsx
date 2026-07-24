import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2, Upload, Palette, Coins, Award, Crown, Store,
  Save, RefreshCw, Sparkles, Eye, ShieldCheck, Clock
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useQueryClient, useQuery, useMutation } from "@tanstack/react-query";
import { getLoyaltySettingsFn, updateLoyaltySettingsFn } from "@/lib/olist-sync.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/configuracoes/")({
  component: Config,
});

const DEFAULT_TIERS = [
  { name: "Bronze 🥉", min: 0, nextMin: 500, color: "text-amber-500 bg-amber-500/10 border-amber-500/30" },
  { name: "Prata 🥈", min: 500, nextMin: 1000, color: "text-slate-300 bg-slate-500/10 border-slate-500/30" },
  { name: "Ouro 🥇", min: 1000, nextMin: 2000, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  { name: "Diamante 💎", min: 2000, nextMin: 5000, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" },
];

function Config() {
  const qc = useQueryClient();
  const getLoyalty = useServerFn(getLoyaltySettingsFn);
  const updateLoyalty = useServerFn(updateLoyaltySettingsFn);

  const [loading, setLoading] = useState(false);
  const [orgId, setOrgId] = useState<string | null>(null);

  // Estados dos Dados da Loja
  const [storeName, setStoreName] = useState("");
  const [document, setDocument] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pdvRequireCpf, setPdvRequireCpf] = useState(false);
  const [pdvSaving, setPdvSaving] = useState(false);

  // Estados do Branding Whitelabel
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#6366f1");
  const [currencyName, setCurrencyName] = useState("Pontos");

  // Estados de Fidelidade
  const [cashbackPercent, setCashbackPercent] = useState<number>(5);
  const [pointsRate, setPointsRate] = useState<number>(1);
  const [expirationDays, setExpirationDays] = useState<number>(90);

  // Estados de Níveis VIP
  const [vipTiers, setVipTiers] = useState(DEFAULT_TIERS);

  // Carrega dados iniciais da organização
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: p } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (!p?.organization_id) return;
      setOrgId(p.organization_id);

      const { data: o } = await supabase.from("organizations").select("*").eq("id", p.organization_id).maybeSingle();
      if (o) {
        setStoreName(o.name ?? "");
        setDocument(o.document ?? "");
        setPhone(o.phone ?? "");
        setEmail(o.email ?? "");
        setLogoUrl(o.logo_url ?? "");
        setPdvRequireCpf(!!(o as any).pdv_require_cpf);
      }

      // Busca configurações de branding whitelabel salvas
      const { data: brandingRow } = await supabase
        .from("integration_mappings")
        .select("metadata")
        .eq("organization_id", p.organization_id)
        .eq("source", "olist")
        .eq("entity_type", "store_branding")
        .maybeSingle();

      if (brandingRow?.metadata) {
        const meta = brandingRow.metadata as any;
        if (meta.logo_url) setLogoUrl(meta.logo_url);
        if (meta.banner_url) setBannerUrl(meta.banner_url);
        if (meta.primary_color) setPrimaryColor(meta.primary_color);
        if (meta.currency_name) setCurrencyName(meta.currency_name);
        if (meta.vip_tiers && Array.isArray(meta.vip_tiers)) setVipTiers(meta.vip_tiers);
        if (meta.expiration_days) setExpirationDays(Number(meta.expiration_days));
      }
    })();
  }, []);

  // Busca configurações dinâmicas de fidelidade
  const loyaltyQuery = useQuery({
    enabled: !!orgId,
    queryKey: ["loyalty-settings-config", orgId],
    queryFn: () => getLoyalty(),
  });

  useEffect(() => {
    if (loyaltyQuery.data) {
      setCashbackPercent(loyaltyQuery.data.cashback_percent ?? 5);
      setPointsRate(loyaltyQuery.data.points_per_currency ?? 1);
    }
  }, [loyaltyQuery.data]);

  // Salvar Geral (Loja, Branding Whitelabel, Fidelidade e Níveis VIP)
  async function saveAllSettings() {
    if (!orgId) return;
    setLoading(true);

    try {
      // 1. Atualiza dados da tabela organizations
      const { error: orgErr } = await supabase
        .from("organizations")
        .update({
          name: storeName,
          document,
          phone,
          email,
          logo_url: logoUrl || null,
        })
        .eq("id", orgId);

      if (orgErr) throw new Error(orgErr.message);

      // 2. Salva regras dinâmicas de Cashback e Pontos
      await updateLoyalty({
        data: {
          cashback_percent: Number(cashbackPercent) || 0,
          points_per_currency: Number(pointsRate) || 0,
        },
      });

      // 3. Salva branding e moeda customizada em integration_mappings
      const brandingMetadata = {
        logo_url: logoUrl,
        banner_url: bannerUrl,
        primary_color: primaryColor,
        currency_name: currencyName,
        expiration_days: expirationDays,
        vip_tiers: vipTiers,
      };

      const { error: brandingErr } = await supabase.from("integration_mappings").upsert(
        {
          organization_id: orgId,
          source: "olist",
          entity_type: "store_branding",
          external_id: "global",
          internal_id: orgId,
          metadata: brandingMetadata,
        },
        { onConflict: "organization_id,source,entity_type,external_id" }
      );

      if (brandingErr) throw new Error(brandingErr.message);

      toast.success("Configurações Whitelabel da loja salvas com sucesso!");
      qc.invalidateQueries({ queryKey: ["store-branding-public"] });
      qc.invalidateQueries({ queryKey: ["public-org"] });
      qc.invalidateQueries({ queryKey: ["loyalty-settings"] });
    } catch (err: any) {
      toast.error(err?.message ?? "Falha ao salvar configurações.");
    } finally {
      setLoading(false);
    }
  }

  async function saveRequireCpf(next: boolean) {
    if (!orgId) return;
    setPdvRequireCpf(next);
    setPdvSaving(true);
    const { error } = await supabase.from("organizations").update({ pdv_require_cpf: next } as any).eq("id", orgId);
    setPdvSaving(false);
    if (error) {
      setPdvRequireCpf(!next);
      toast.error(error.message);
    } else {
      toast.success("Configuração do PDV salva");
      qc.invalidateQueries({ queryKey: ["pdv-org-settings"] });
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Painel de Configurações da Loja (Whitelabel)"
        description="Personalize a marca, a moeda de troca, o cashback e as regras de pontuação da sua loja."
        actions={
          <Button onClick={saveAllSettings} disabled={loading} className="bg-primary hover:bg-primary/90">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Salvar Alterações
          </Button>
        }
      />

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 max-w-2xl">
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" /> Branding & Marca
          </TabsTrigger>
          <TabsTrigger value="loyalty" className="flex items-center gap-2">
            <Coins className="h-4 w-4" /> Pontos & Cashback
          </TabsTrigger>
          <TabsTrigger value="vip" className="flex items-center gap-2">
            <Crown className="h-4 w-4" /> Níveis VIP
          </TabsTrigger>
          <TabsTrigger value="store" className="flex items-center gap-2">
            <Store className="h-4 w-4" /> Dados Gerais & PDV
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: BRANDING & IDENTIDADE VISUAL */}
        <TabsContent value="branding" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-12">
            <Card className="md:col-span-7">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" /> Identidade Visual da Vitrine Pública (/$slug)
                </CardTitle>
                <CardDescription className="text-xs">
                  Estes parâmetros alteram dinamicamente a aparência do portal do cliente final.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="logoUrl" className="text-xs font-semibold">URL da Logo da Loja</Label>
                  <Input
                    id="logoUrl"
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://exemplo.com/sua-logo.png"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bannerUrl" className="text-xs font-semibold">URL do Banner de Destaque / Capa</Label>
                  <Input
                    id="bannerUrl"
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    placeholder="https://exemplo.com/seu-banner.jpg"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor" className="text-xs font-semibold">Cor Primária do Tema (HEX)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="h-10 w-12 rounded border cursor-pointer bg-transparent p-1"
                      />
                      <Input
                        id="primaryColor"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        placeholder="#6366f1"
                        className="font-mono text-xs uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currencyName" className="text-xs font-semibold">Nome da Moeda de Troca</Label>
                    <Input
                      id="currencyName"
                      value={currencyName}
                      onChange={(e) => setCurrencyName(e.target.value)}
                      placeholder="Ex: Pontos, FitCoins, Estrelas, Créditos"
                    />
                    <p className="text-[10px] text-muted-foreground">Nome exibido nas mensagens e saldo dos clientes.</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* PREVIEW EM TEMPO REAL */}
            <Card className="md:col-span-5 bg-slate-950 text-white overflow-hidden border-slate-800">
              <CardHeader className="py-3 border-b border-white/10 flex flex-row items-center justify-between">
                <CardTitle className="text-xs font-bold flex items-center gap-1.5 text-slate-300">
                  <Eye className="h-4 w-4 text-emerald-400" /> Preview da Vitrine
                </CardTitle>
                <Badge variant="outline" className="text-[10px] border-white/20 text-slate-400">Tempo Real</Badge>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="rounded-xl border border-white/10 p-4 space-y-3 relative overflow-hidden bg-slate-900">
                  <div className="flex items-center gap-2.5">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo" className="h-9 w-9 rounded-lg object-cover border border-white/20" />
                    ) : (
                      <div className="h-9 w-9 rounded-lg flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: primaryColor }}>
                        {storeName.slice(0, 2).toUpperCase() || "PS"}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-bold text-white">{storeName || "Nome da Sua Loja"}</div>
                      <div className="text-[10px] text-slate-400">Programa de {currencyName}</div>
                    </div>
                  </div>

                  <div className="rounded-lg p-3 space-y-1 text-xs border border-white/10" style={{ backgroundColor: `${primaryColor}20` }}>
                    <div className="text-[10px] text-slate-300">Seu Saldo de {currencyName}</div>
                    <div className="text-xl font-extrabold text-white">1.250 <span className="text-xs font-normal" style={{ color: primaryColor }}>{currencyName.toLowerCase()}</span></div>
                  </div>

                  <button
                    className="w-full py-2 rounded-lg text-xs font-semibold text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                  >
                    Resgatar Prêmios com {currencyName}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ABA 2: REGRAS DE FIDELIDADE & CASHBACK */}
        <TabsContent value="loyalty" className="space-y-6">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-500" /> Regras de Pontuação & Cashback
              </CardTitle>
              <CardDescription className="text-xs">
                Defina o percentual de cashback em dinheiro e a taxa de conversão da moeda da sua loja.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="cashbackPercent" className="text-xs font-semibold">Porcentagem de Cashback em R$ (%)</Label>
                  <div className="relative">
                    <Input
                      id="cashbackPercent"
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      value={cashbackPercent}
                      onChange={(e) => setCashbackPercent(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">%</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Em uma compra de R$ 100,00, o cliente ganha R$ {((100 * cashbackPercent) / 100).toFixed(2)} em cashback.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pointsRate" className="text-xs font-semibold">Conversão de {currencyName} por R$ 1,00</Label>
                  <div className="relative">
                    <Input
                      id="pointsRate"
                      type="number"
                      step="0.5"
                      min="0"
                      value={pointsRate}
                      onChange={(e) => setPointsRate(Number(e.target.value))}
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-muted-foreground">{currencyName.toLowerCase()}/R$</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Em uma compra de R$ 100,00, o cliente acumula Math.floor(100 * {pointsRate}) {currencyName.toLowerCase()}.</p>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                <Label htmlFor="expirationDays" className="text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-amber-500" /> Prazo de Expiração do Saldo (em Dias)
                </Label>
                <Input
                  id="expirationDays"
                  type="number"
                  min="1"
                  max="365"
                  value={expirationDays}
                  onChange={(e) => setExpirationDays(Number(e.target.value))}
                  className="max-w-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Pontos e Cashback inativos após este número de dias serão expirados automaticamente pela rotina agendada.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 3: NÍVEIS VIP (TIERS) */}
        <TabsContent value="vip" className="space-y-6">
          <Card className="max-w-3xl">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" /> Faixas e Níveis VIP dos Clientes
              </CardTitle>
              <CardDescription className="text-xs">
                Configure os nomes e os valores mínimos acumulados em compras para desbloquear cada nível.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                {vipTiers.map((tier, idx) => (
                  <div key={idx} className="flex items-center gap-3 rounded-xl border p-3 bg-muted/20">
                    <Badge variant="outline" className={`w-28 text-center justify-center font-bold text-xs ${tier.color}`}>
                      {tier.name}
                    </Badge>
                    <div className="flex-1 grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <Label className="text-[10px] text-muted-foreground block mb-1">Nome da Categoria</Label>
                        <Input
                          value={tier.name}
                          onChange={(e) => {
                            const copy = [...vipTiers];
                            copy[idx].name = e.target.value;
                            setVipTiers(copy);
                          }}
                          className="h-8 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground block mb-1">Gasto Mínimo Acumulado (R$)</Label>
                        <Input
                          type="number"
                          value={tier.min}
                          onChange={(e) => {
                            const copy = [...vipTiers];
                            copy[idx].min = Number(e.target.value);
                            setVipTiers(copy);
                          }}
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA 4: DADOS GERAIS & PDV */}
        <TabsContent value="store" className="space-y-6">
          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="text-base font-semibold">Dados Cadastrais da Loja</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Nome Comercial da Loja</Label>
                <Input value={storeName} onChange={(e) => setStoreName(e.target.value)} />
              </div>
              <div className="space-y-2"><Label>CNPJ / Documento</Label><Input value={document} onChange={(e) => setDocument(e.target.value)} /></div>
              <div className="space-y-2"><Label>Telefone de Contato</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
              <div className="sm:col-span-2 space-y-2"><Label>E-mail Corporativo</Label><Input value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            </CardContent>
          </Card>

          <Card className="max-w-2xl">
            <CardHeader><CardTitle className="text-base font-semibold">Configuração do Caixa / PDV</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <Label htmlFor="require-cpf" className="text-sm font-medium">
                    Exigir CPF ao cadastrar clientes pelo PDV
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Quando ativado, o cadastro rápido e completo dentro do PDV só é concluído com um CPF válido.
                  </p>
                </div>
                <Switch
                  id="require-cpf"
                  checked={pdvRequireCpf}
                  onCheckedChange={saveRequireCpf}
                  disabled={pdvSaving || !orgId}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
