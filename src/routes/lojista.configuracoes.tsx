import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useEffect, useState, lazy, Suspense } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery } from "@/lib/queries";
import { atualizarLoja } from "@/lib/qsf.functions";
import type { Modalidade } from "@/lib/qsf-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Store as StoreIcon,
  Palette,
  Gift,
  Plug,
  MessageCircle,
  Bell,
  Sparkles,
  Timer,
} from "lucide-react";
import {
  LivePreview,
  AssetUploader,
  ColorPresets,
  SuggestedBanners,
} from "@/components/lojista/personalizacao-shared";

// Below-the-fold cards ship in a separate chunk (~1200 lines) and load after first paint.
const CardsModule = () => import("@/components/lojista/config-cards");
const IntegracoesCard = lazy(() => CardsModule().then((m) => ({ default: m.IntegracoesCard })));
const WhatsappCard = lazy(() => CardsModule().then((m) => ({ default: m.WhatsappCard })));
const NotificacoesCard = lazy(() => CardsModule().then((m) => ({ default: m.NotificacoesCard })));
const IndicacaoCard = lazy(() => CardsModule().then((m) => ({ default: m.IndicacaoCard })));
const NpsCard = lazy(() => CardsModule().then((m) => ({ default: m.NpsCard })));
const InstagramCard = lazy(() => CardsModule().then((m) => ({ default: m.InstagramCard })));
const ValidadePontosCard = lazy(() =>
  CardsModule().then((m) => ({ default: m.ValidadePontosCard })),
);

function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-6 shadow-sm">
      <div className="h-4 w-40 animate-pulse rounded bg-[#F1F5F9]" />
      <div className="mt-3 h-3 w-3/4 animate-pulse rounded bg-[#F1F5F9]" />
      <div className="mt-6 h-32 animate-pulse rounded-xl bg-[#F8FAFC]" />
    </div>
  );
}

type SectionId =
  | "loja"
  | "aparencia"
  | "recompensas"
  | "integracoes"
  | "whatsapp"
  | "notificacoes"
  | "engajamento"
  | "avancado";

const SECTIONS: { id: SectionId; label: string; icon: typeof StoreIcon; hint: string }[] = [
  { id: "loja", label: "Dados da loja", icon: StoreIcon, hint: "Nome, telefone" },
  { id: "aparencia", label: "Aparência", icon: Palette, hint: "Logo, banner, cores" },
  { id: "recompensas", label: "Recompensas", icon: Gift, hint: "Pontos, cashback, voucher" },
  { id: "integracoes", label: "Integrações", icon: Plug, hint: "Webhook" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, hint: "Evolution API" },
  { id: "notificacoes", label: "Notificações", icon: Bell, hint: "Mensagens automáticas" },
  { id: "engajamento", label: "Engajamento", icon: Sparkles, hint: "Indicação, NPS, Instagram" },
  { id: "avancado", label: "Avançado", icon: Timer, hint: "Validade de pontos" },
];

export const Route = createFileRoute("/lojista/configuracoes")({
  ssr: false,
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());

  const [section, setSection] = useState<SectionId>("loja");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [bannerMobile, setBannerMobile] = useState("");
  const [cor1, setCor1] = useState("#7c3aed");
  const [cor2, setCor2] = useState("#f97316");
  const [modalidade, setModalidade] = useState<Modalidade>("ambos");
  const [regraP, setRegraP] = useState("1");
  const [pctC, setPctC] = useState("5");
  const [minCashback, setMinCashback] = useState("0");
  const [compraMinCashback, setCompraMinCashback] = useState("0");
  const [validadeVoucher, setValidadeVoucher] = useState("7");
  const [voucherVisivelAposUso, setVoucherVisivelAposUso] = useState(false);
  const [voucherMostrarExpirados, setVoucherMostrarExpirados] = useState(true);

  useEffect(() => {
    if (loja) {
      setNome(loja.nome_fantasia);
      setTelefone(loja.telefone ?? "");
      setLogo(loja.logo_url ?? "");
      setBanner(loja.banner_url ?? "");
      setBannerMobile(loja.banner_url_mobile ?? "");
      setCor1(loja.brand_primary);
      setCor2(loja.brand_secondary);
      setModalidade(loja.modalidade as Modalidade);
      setRegraP(String(loja.regra_pontos));
      setPctC(String(loja.percentual_cashback));
      setMinCashback(String(loja.cashback_valor_minimo ?? 0));
      setCompraMinCashback(String(loja.cashback_compra_minima ?? 0));
      setValidadeVoucher(String(loja.voucher_validade_dias ?? 7));
      setVoucherVisivelAposUso(loja.voucher_visivel_apos_uso ?? false);
      setVoucherMostrarExpirados(loja.voucher_mostrar_expirados ?? true);
    }
  }, [loja]);

  const salvar = useMutation({
    mutationFn: () =>
      atualizarLoja({
        data: {
          nome_fantasia: nome,
          telefone: telefone || null,
          logo_url: logo || null,
          banner_url: banner || null,
          banner_url_mobile: bannerMobile || null,
          brand_primary: cor1,
          brand_secondary: cor2,
          modalidade,
          regra_pontos: parseFloat(regraP) || 1,
          percentual_cashback: parseFloat(pctC) || 0,
          cashback_valor_minimo: Math.max(0, parseFloat(minCashback.replace(",", ".")) || 0),
          cashback_compra_minima: Math.max(0, parseFloat(compraMinCashback.replace(",", ".")) || 0),
          voucher_validade_dias: Math.max(1, Math.min(365, parseInt(validadeVoucher, 10) || 7)),
          voucher_visivel_apos_uso: voucherVisivelAposUso,
          voucher_mostrar_expirados: voucherMostrarExpirados,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Configurações salvas");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!loja) return <div className="p-6 text-sm text-[#64748B]">Carregando...</div>;

  const inclP = modalidade !== "cashback";
  const inclC = modalidade !== "pontos";
  const showSave = ["loja", "aparencia", "recompensas"].includes(section);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
          Ajustes
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Configurações</h1>
        <p className="text-sm text-[#64748B]">
          Personalize a página do cliente, regras de recompensa e integrações
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Sidebar de categorias */}
        <nav className="lg:sticky lg:top-6 lg:self-start">
          {/* Mobile: chips horizontais */}
          <div className="flex gap-2 overflow-x-auto pb-2 lg:hidden -mx-1 px-1">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`shrink-0 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                    active
                      ? "border-[#2563EB] bg-[#2563EB] text-white"
                      : "border-[#E5E7EB] bg-white text-[#334155] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
          {/* Desktop: lista vertical */}
          <div className="hidden lg:block rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-sm">
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSection(s.id)}
                  className={`w-full text-left flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                    active
                      ? "bg-[#EEF2FF] text-[#1D4ED8]"
                      : "text-[#334155] hover:bg-[#F8FAFC]"
                  }`}
                >
                  <span
                    className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                      active ? "bg-white text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold leading-tight truncate">
                      {s.label}
                    </span>
                    <span className="block text-[11px] text-[#64748B] truncate">{s.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Painel da categoria selecionada */}
        <div className="min-w-0 space-y-6">
        {section === "loja" && (
          <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
            <CardHeader>
              <CardTitle className="text-base text-[#0F172A]">Dados da loja</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label>Nome fantasia</Label>
                <Input value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(e.target.value)} />
              </div>
            </CardContent>
          </Card>
        )}

        {section === "aparencia" && (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
            <CardHeader>
              <CardTitle className="text-base text-[#0F172A]">Identidade visual</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AssetUploader
                storeId={loja.id}
                kind="logo"
                label="Logo da loja"
                hint="Recomendado: 512 × 512 px (quadrado), PNG com fundo transparente. Até 2 MB."
                value={logo}
                onChange={setLogo}
              />
              <AssetUploader
                storeId={loja.id}
                kind="banner"
                label="Banner (desktop)"
                hint="Recomendado: 1920 × 480 px. JPG ou PNG até 5 MB."
                value={banner}
                onChange={setBanner}
                aspect="banner"
              />
              <AssetUploader
                storeId={loja.id}
                kind="banner-mobile"
                label="Banner (celular)"
                hint="Recomendado: 1200 × 600 px (proporção 2:1, horizontal). JPG ou PNG até 5 MB."
                value={bannerMobile}
                onChange={setBannerMobile}
                aspect="banner-mobile"
              />
              <SuggestedBanners
                onPick={(url) => {
                  setBanner(url);
                  setBannerMobile(url);
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cor primária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={cor1}
                      onChange={(e) => setCor1(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input value={cor1} onChange={(e) => setCor1(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Cor secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={cor2}
                      onChange={(e) => setCor2(e.target.value)}
                      className="w-16 h-10 p-1"
                    />
                    <Input value={cor2} onChange={(e) => setCor2(e.target.value)} />
                  </div>
                </div>
              </div>
              <ColorPresets
                onPick={(a, b) => {
                  setCor1(a);
                  setCor2(b);
                }}
              />
              <p className="text-xs text-[#64748B]">
                As cores da sua marca pintam a aura de fundo, o logo, a barra de progresso e o botão
                de resgate na página do cliente.
                <a
                  href={`/${loja.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-1 underline text-[#2563EB]"
                >
                  Ver como o cliente vê →
                </a>
              </p>
            </CardContent>
          </Card>
          <div className="xl:sticky xl:top-6 xl:self-start">
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB] mb-2">
              Prévia ao vivo
            </div>
            <LivePreview
              nome={nome}
              logo={logo}
              banner={banner}
              bannerMobile={bannerMobile}
              cor1={cor1}
              cor2={cor2}
              modalidade={modalidade}
            />
            <p className="mt-2 text-[11px] text-[#64748B]">
              Atualiza em tempo real conforme você ajusta cores, banner e logo.
            </p>
          </div>
          </div>
        )}

        {section === "recompensas" && (
          <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
            <CardHeader>
              <CardTitle className="text-base text-[#0F172A]">Modalidade de recompensa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
                {(["pontos", "cashback", "ambos"] as const).map((m) => (
                  <div
                    key={m}
                    className="flex items-center gap-2 rounded-xl border border-[#E5E7EB] px-3 py-2 hover:bg-[#F8FAFC] transition-colors duration-200"
                  >
                    <RadioGroupItem value={m} id={m} />
                    <Label htmlFor={m} className="capitalize text-[#0F172A] cursor-pointer">
                      {m}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              {inclP && (
                <div>
                  <Label>Pontos por R$1 gasto</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={regraP}
                    onChange={(e) => setRegraP(e.target.value)}
                  />
                </div>
              )}
              {inclC && (
                <div>
                  <Label>% de cashback</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={pctC}
                    onChange={(e) => setPctC(e.target.value)}
                  />
                </div>
              )}
              {inclC && (
                <div>
                  <Label>Valor mínimo de compra para usar o cashback (R$)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={compraMinCashback}
                    onChange={(e) => setCompraMinCashback(e.target.value)}
                  />
                  <p className="text-xs text-[#64748B] mt-1">
                    O cliente só poderá usar o voucher de cashback em compras a partir desse valor.
                    Deixe em <strong>0</strong> para permitir uso em qualquer compra.
                  </p>
                </div>
              )}
              <div>
                <Label>Validade do voucher de resgate (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  max="365"
                  value={validadeVoucher}
                  onChange={(e) => setValidadeVoucher(e.target.value)}
                />
                <p className="text-xs text-[#64748B] mt-1">
                  Após esse prazo o voucher expira e os pontos/cashback voltam pro cliente. Isso
                  incentiva o cliente a voltar na loja logo.
                </p>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 space-y-3">
                <div className="text-sm font-semibold text-[#0F172A]">
                  Visibilidade dos vouchers para o cliente
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-[#64748B]">
                    <div className="font-medium text-[#0F172A] text-sm">
                      Manter voucher visível após utilização
                    </div>
                    Se ligado, o cliente continua vendo o voucher como "Utilizado" na lista dele. Se
                    desligado (padrão), o voucher some assim que você confirma a entrega.
                  </div>
                  <Switch
                    checked={voucherVisivelAposUso}
                    onCheckedChange={setVoucherVisivelAposUso}
                  />
                </div>
                <div className="flex items-start justify-between gap-3">
                  <div className="text-xs text-[#64748B]">
                    <div className="font-medium text-[#0F172A] text-sm">
                      Mostrar vouchers expirados no histórico
                    </div>
                    Se ligado (padrão), o cliente vê os vouchers expirados como aviso. Desligue para
                    escondê-los.
                  </div>
                  <Switch
                    checked={voucherMostrarExpirados}
                    onCheckedChange={setVoucherMostrarExpirados}
                  />
                </div>
              </div>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 text-xs text-[#64748B]">
                Níveis Bronze (0-100), Prata (101-300), Ouro (301+) são aplicados automaticamente
                com base nos pontos.
              </div>
            </CardContent>
          </Card>
        )}

        {showSave && (
          <Button
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending}
            size="lg"
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all duration-200"
          >
            {salvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        )}

        {section === "integracoes" && (
          <Suspense fallback={<CardSkeleton />}>
            <div className="space-y-6">
              <IntegracoesCard
                storeId={loja.id}
                slug={loja.slug}
                secret={loja.webhook_secret}
                lastAt={loja.webhook_last_at}
                gatilho={
                  (loja as { olist_gatilho_pontuacao?: "aprovado" | "faturado" | "ambos" })
                    .olist_gatilho_pontuacao ?? "ambos"
                }
              />
            </div>
          </Suspense>
        )}

        {section === "whatsapp" && (
          <Suspense fallback={<CardSkeleton />}>
            <WhatsappCard loja={loja} />
          </Suspense>
        )}

        {section === "notificacoes" && (
          <Suspense fallback={<CardSkeleton />}>
            <NotificacoesCard loja={loja} />
          </Suspense>
        )}

        {section === "engajamento" && (
          <Suspense fallback={<CardSkeleton />}>
            <div className="space-y-6">
              <IndicacaoCard loja={loja} />
              <NpsCard loja={loja} />
              <InstagramCard loja={loja} />
            </div>
          </Suspense>
        )}

        {section === "avancado" && (
          <Suspense fallback={<CardSkeleton />}>
            <ValidadePontosCard loja={loja} />
          </Suspense>
        )}
        </div>
      </div>
    </div>
  );
}
