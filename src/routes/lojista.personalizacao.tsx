import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery } from "@/lib/queries";
import { atualizarLoja } from "@/lib/qsf.functions";
import type { Modalidade } from "@/lib/qsf-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { RewardRain } from "@/components/reward-rain";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RotateCcw } from "lucide-react";
import { Download, Upload, Smartphone, Monitor, Wallet, Coins, Gift, Sparkles } from "lucide-react";
import {
  AssetUploader,
  ColorPresets,
  SuggestedBanners,
  LivePreview,
} from "./lojista.configuracoes";

export const Route = createFileRoute("/lojista/personalizacao")({
  ssr: false,
  component: PersonalizacaoPage,
});

const DEFAULT_COR1 = "#7c3aed";
const DEFAULT_COR2 = "#f97316";
const DEFAULT_FIT: "cover" | "contain" = "cover";
const DEFAULT_POS = 50;
const DEFAULT_ZOOM = 100;
const DEFAULT_BG_MODE: "dark" | "light" | "custom" = "dark";
const DEFAULT_BG1 = "#0B1020";
const DEFAULT_BG2 = "#1e1b4b";

const DEFAULT_ACCENT_POINTS = "#818cf8";
const DEFAULT_ACCENT_CASHBACK = "#22c55e";
const DEFAULT_VIP = "#a78bfa";
const DEFAULT_PRICE = "#22c55e";
const DEFAULT_TEXT_ON_DARK = "#ffffff";
const DEFAULT_KICKER_TEXT = "Fidelidade";
const DEFAULT_TITLE_SIZE: "sm" | "md" | "lg" | "xl" | "2xl" = "md";
const DEFAULT_TITLE_WEIGHT: "normal" | "semibold" | "bold" | "black" = "bold";
const DEFAULT_KICKER_SIZE: "xs" | "sm" | "md" = "sm";

const BG_PRESETS: Array<{ label: string; mode: "dark" | "light" | "custom"; c1: string; c2: string }> = [
  { label: "Midnight (padrão)", mode: "dark", c1: "#0B1020", c2: "#1e1b4b" },
  { label: "Claro suave", mode: "light", c1: "#f8fafc", c2: "#e2e8f0" },
  { label: "Grafite", mode: "custom", c1: "#111827", c2: "#1f2937" },
  { label: "Sépia", mode: "custom", c1: "#f5efe6", c2: "#e8dcc4" },
];

function hexLuminance(hex: string): number {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return 0;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Relative luminance para WCAG (0..1). */
function relLuminance(hex: string): number {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return 0;
  let h = m[1];
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  const toLin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = toLin(parseInt(h.slice(0, 2), 16));
  const g = toLin(parseInt(h.slice(2, 4), 16));
  const b = toLin(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrastRatio(a: string, b: string): number {
  const la = relLuminance(a);
  const lb = relLuminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** Extrai o path interno do bucket "store-assets" a partir de uma URL assinada.
 *  Retorna null quando a URL não pertence ao bucket (ex.: banner sugerido do Unsplash). */
function extractStoreAssetPath(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/\/store-assets\/([^?#]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function PersonalizacaoPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());

  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [bannerMobile, setBannerMobile] = useState("");
  const [cor1, setCor1] = useState(DEFAULT_COR1);
  const [cor2, setCor2] = useState(DEFAULT_COR2);
  const [mobileFit, setMobileFit] = useState<"cover" | "contain">(DEFAULT_FIT);
  const [mobilePosX, setMobilePosX] = useState(DEFAULT_POS);
  const [mobilePosY, setMobilePosY] = useState(DEFAULT_POS);
  const [mobileZoom, setMobileZoom] = useState(DEFAULT_ZOOM);
  const [bgMode, setBgMode] = useState<"dark" | "light" | "custom">(DEFAULT_BG_MODE);
  const [bgColor1, setBgColor1] = useState<string>(DEFAULT_BG1);
  const [bgColor2, setBgColor2] = useState<string>(DEFAULT_BG2);

  // Cores de apoio + cabeçalho personalizável da página do cliente
  const [accentPoints, setAccentPoints] = useState(DEFAULT_ACCENT_POINTS);
  const [accentCashback, setAccentCashback] = useState(DEFAULT_ACCENT_CASHBACK);
  const [brandCta, setBrandCta] = useState<string>("");
  const [brandVip, setBrandVip] = useState(DEFAULT_VIP);
  const [brandPrice, setBrandPrice] = useState(DEFAULT_PRICE);
  const [textOnDark, setTextOnDark] = useState(DEFAULT_TEXT_ON_DARK);
  const [kickerText, setKickerText] = useState(DEFAULT_KICKER_TEXT);
  const [kickerShow, setKickerShow] = useState(true);
  const [titleSize, setTitleSize] = useState<"sm" | "md" | "lg" | "xl" | "2xl">(DEFAULT_TITLE_SIZE);
  const [titleWeight, setTitleWeight] = useState<"normal" | "semibold" | "bold" | "black">(DEFAULT_TITLE_WEIGHT);
  const [kickerSize, setKickerSize] = useState<"xs" | "sm" | "md">(DEFAULT_KICKER_SIZE);
  const [previewDevice, setPreviewDevice] = useState<"mobile" | "desktop">("desktop");
  const [rewardRain, setRewardRain] = useState(false);
  const [rainPreviewOpen, setRainPreviewOpen] = useState(false);

  // Guardamos as URLs originais para saber quais arquivos apagar no Save.
  const [initial, setInitial] = useState<{ logo: string; banner: string; bannerMobile: string }>({
    logo: "",
    banner: "",
    bannerMobile: "",
  });

  useEffect(() => {
    if (loja) {
      const l = loja.logo_url ?? "";
      const b = loja.banner_url ?? "";
      const bm = loja.banner_url_mobile ?? "";
      setLogo(l);
      setBanner(b);
      setBannerMobile(bm);
      setInitial({ logo: l, banner: b, bannerMobile: bm });
      setCor1(loja.brand_primary);
      setCor2(loja.brand_secondary);
      setMobileFit((loja.banner_mobile_fit as "cover" | "contain") ?? DEFAULT_FIT);
      setMobilePosX(loja.banner_mobile_position_x ?? DEFAULT_POS);
      setMobilePosY(loja.banner_mobile_position_y ?? DEFAULT_POS);
      setMobileZoom(loja.banner_mobile_zoom ?? DEFAULT_ZOOM);
      setBgMode(((loja as { bg_mode?: string }).bg_mode as "dark" | "light" | "custom") ?? DEFAULT_BG_MODE);
      setBgColor1((loja as { bg_color_1?: string | null }).bg_color_1 ?? DEFAULT_BG1);
      setBgColor2((loja as { bg_color_2?: string | null }).bg_color_2 ?? DEFAULT_BG2);
      const raw = loja as Record<string, unknown>;
      setAccentPoints((raw.brand_accent_points as string) || DEFAULT_ACCENT_POINTS);
      setAccentCashback((raw.brand_accent_cashback as string) || DEFAULT_ACCENT_CASHBACK);
      setBrandCta((raw.brand_cta as string) || "");
      setBrandVip((raw.brand_vip as string) || DEFAULT_VIP);
      setBrandPrice((raw.brand_price as string) || DEFAULT_PRICE);
      setTextOnDark((raw.text_on_dark as string) || DEFAULT_TEXT_ON_DARK);
      setKickerText((raw.header_kicker_text as string) ?? DEFAULT_KICKER_TEXT);
      setKickerShow((raw.header_kicker_show as boolean) ?? true);
      setTitleSize(((raw.header_title_size as "sm" | "md" | "lg" | "xl" | "2xl") ?? DEFAULT_TITLE_SIZE));
      setTitleWeight(((raw.header_title_weight as "normal" | "semibold" | "bold" | "black") ?? DEFAULT_TITLE_WEIGHT));
      setKickerSize(((raw.header_kicker_size as "xs" | "sm" | "md") ?? DEFAULT_KICKER_SIZE));
      setRewardRain(Boolean(raw.reward_rain_enabled));
    }
  }, [loja]);

  const salvar = useMutation({
    mutationFn: async () => {
      // Coleta os arquivos antigos que devem sair do bucket:
      // (a) campos esvaziados via "Restaurar padrão"
      // (b) campos substituídos por novo upload
      const pathsParaRemover = new Set<string>();
      const par = (curr: string, prev: string) => {
        if (prev && prev !== curr) {
          const p = extractStoreAssetPath(prev);
          if (p) pathsParaRemover.add(p);
        }
      };
      par(logo, initial.logo);
      par(banner, initial.banner);
      par(bannerMobile, initial.bannerMobile);

      await atualizarLoja({
        data: {
          logo_url: logo || null,
          banner_url: banner || null,
          banner_url_mobile: bannerMobile || null,
          brand_primary: cor1,
          brand_secondary: cor2,
          banner_mobile_fit: mobileFit,
          banner_mobile_position_x: mobilePosX,
          banner_mobile_position_y: mobilePosY,
          banner_mobile_zoom: mobileZoom,
          bg_mode: bgMode,
          bg_color_1: bgMode === "custom" ? bgColor1 : null,
          bg_color_2: bgMode === "custom" ? bgColor2 : null,
          brand_accent_points: accentPoints || null,
          brand_accent_cashback: accentCashback || null,
          brand_cta: brandCta || null,
          brand_vip: brandVip || null,
          brand_price: brandPrice || null,
          text_on_dark: textOnDark || null,
          header_title_size: titleSize,
          header_title_weight: titleWeight,
          header_kicker_text: kickerText,
          header_kicker_show: kickerShow,
          header_kicker_size: kickerSize,
          reward_rain_enabled: rewardRain,
        },
      });

      if (pathsParaRemover.size > 0) {
        const { error } = await supabase.storage
          .from("store-assets")
          .remove(Array.from(pathsParaRemover));
        if (error) {
          // Não falha o Save: dados já foram persistidos. Só avisa.
          console.warn("Não foi possível remover arquivos antigos:", error.message);
          toast.warning("Personalização salva, mas arquivos antigos podem não ter sido apagados.");
        }
      }
      return { ok: true };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Personalização salva");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const resetAll = () => {
    setLogo("");
    setBanner("");
    setBannerMobile("");
    setCor1(DEFAULT_COR1);
    setCor2(DEFAULT_COR2);
    setMobileFit(DEFAULT_FIT);
    setMobilePosX(DEFAULT_POS);
    setMobilePosY(DEFAULT_POS);
    setMobileZoom(DEFAULT_ZOOM);
    setBgMode(DEFAULT_BG_MODE);
    setBgColor1(DEFAULT_BG1);
    setBgColor2(DEFAULT_BG2);
    setAccentPoints(DEFAULT_ACCENT_POINTS);
    setAccentCashback(DEFAULT_ACCENT_CASHBACK);
    setBrandCta("");
    setBrandVip(DEFAULT_VIP);
    setBrandPrice(DEFAULT_PRICE);
    setTextOnDark(DEFAULT_TEXT_ON_DARK);
    setKickerText(DEFAULT_KICKER_TEXT);
    setKickerShow(true);
    setTitleSize(DEFAULT_TITLE_SIZE);
    setTitleWeight(DEFAULT_TITLE_WEIGHT);
    setKickerSize(DEFAULT_KICKER_SIZE);
    toast.info("Valores restaurados. Clique em Salvar para aplicar.");
  };

  // Aviso simples de contraste quando o cliente escolhe cores customizadas
  const contrastWarning = (() => {
    if (bgMode !== "custom") return null;
    const lum = hexLuminance(bgColor1);
    const textLum = lum > 0.6 ? 0.05 : 0.95; // texto que a página vai usar
    const ratio = (Math.max(lum, textLum) + 0.05) / (Math.min(lum, textLum) + 0.05);
    if (ratio < 4.5) {
      return "Contraste baixo entre fundo e texto. Escolha uma cor mais escura ou mais clara para melhorar a leitura.";
    }
    return null;
  })();

  // Avisos de contraste extras para texto sobre fundo escuro e CTA
  const pageBg = bgMode === "custom" ? bgColor1 : bgMode === "light" ? "#f8fafc" : "#0B1020";
  const contrastTextOnDark = contrastRatio(textOnDark || "#ffffff", pageBg);
  const ctaBg = brandCta || cor1;
  const contrastCta = contrastRatio(textOnDark || "#ffffff", ctaBg);
  const contrastAlerts = [
    contrastTextOnDark < 4.5
      ? `Texto sobre fundo escuro tem contraste ${contrastTextOnDark.toFixed(2)}:1 (mínimo recomendado 4.5:1).`
      : null,
    contrastCta < 3
      ? `Botão Resgatar (CTA) tem contraste ${contrastCta.toFixed(2)}:1 com o texto (mínimo 3:1 para textos grandes).`
      : null,
  ].filter(Boolean) as string[];

  // Exportar / importar tema
  const exportTheme = () => {
    const theme = {
      version: 1,
      brand_primary: cor1,
      brand_secondary: cor2,
      bg_mode: bgMode,
      bg_color_1: bgColor1,
      bg_color_2: bgColor2,
      brand_accent_points: accentPoints,
      brand_accent_cashback: accentCashback,
      brand_cta: brandCta,
      brand_vip: brandVip,
      brand_price: brandPrice,
      text_on_dark: textOnDark,
      header_title_size: titleSize,
      header_title_weight: titleWeight,
      header_kicker_text: kickerText,
      header_kicker_show: kickerShow,
      header_kicker_size: kickerSize,
    };
    const blob = new Blob([JSON.stringify(theme, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tema-${loja?.slug || "loja"}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Tema exportado");
  };
  const importTheme = async (file: File) => {
    try {
      const text = await file.text();
      const t = JSON.parse(text) as Record<string, unknown>;
      const s = (k: string, fb: string) => (typeof t[k] === "string" ? (t[k] as string) : fb);
      const b = (k: string, fb: boolean) => (typeof t[k] === "boolean" ? (t[k] as boolean) : fb);
      setCor1(s("brand_primary", cor1));
      setCor2(s("brand_secondary", cor2));
      setBgMode((s("bg_mode", bgMode) as "dark" | "light" | "custom"));
      setBgColor1(s("bg_color_1", bgColor1));
      setBgColor2(s("bg_color_2", bgColor2));
      setAccentPoints(s("brand_accent_points", accentPoints));
      setAccentCashback(s("brand_accent_cashback", accentCashback));
      setBrandCta(s("brand_cta", brandCta));
      setBrandVip(s("brand_vip", brandVip));
      setBrandPrice(s("brand_price", brandPrice));
      setTextOnDark(s("text_on_dark", textOnDark));
      setTitleSize(s("header_title_size", titleSize) as typeof titleSize);
      setTitleWeight(s("header_title_weight", titleWeight) as typeof titleWeight);
      setKickerText(s("header_kicker_text", kickerText));
      setKickerShow(b("header_kicker_show", kickerShow));
      setKickerSize(s("header_kicker_size", kickerSize) as typeof kickerSize);
      toast.success("Tema importado. Clique em Salvar para aplicar.");
    } catch {
      toast.error("Arquivo de tema inválido.");
    }
  };

  const ResetButton = ({ onReset, disabled }: { onReset: () => void; disabled?: boolean }) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onReset}
      disabled={disabled}
      className="h-8 text-xs text-[#64748B] hover:text-[#0F172A]"
    >
      <RotateCcw className="h-3 w-3 mr-1" />
      Restaurar padrão
    </Button>
  );

  if (!loja) return <div className="p-6 text-sm text-[#64748B]">Carregando...</div>;

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB]">Aparência</div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Personalização da loja</h1>
        <p className="text-sm text-[#64748B]">
          Ajuste o logo, banners e cores da sua marca — tudo o que o cliente vê na página pública.
          <a href={`/${loja.slug}`} target="_blank" rel="noreferrer" className="ml-1 underline text-[#2563EB]">Ver como o cliente vê →</a>
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base text-[#0F172A]">Logo e banners</CardTitle>
              <ResetButton
                onReset={() => { setLogo(""); setBanner(""); setBannerMobile(""); }}
                disabled={!logo && !banner && !bannerMobile}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <AssetUploader
                  storeId={loja.id}
                  kind="logo"
                  label="Logo da loja"
                  hint="Recomendado: 512 × 512 px (quadrado), PNG com fundo transparente. Até 2 MB."
                  value={logo}
                  onChange={setLogo}
                />
                {logo && <ResetButton onReset={() => setLogo("")} />}
              </div>
              <div className="space-y-1">
                <AssetUploader
                  storeId={loja.id}
                  kind="banner"
                  label="Banner (desktop)"
                  hint="Recomendado: 1920 × 480 px. JPG ou PNG até 5 MB."
                  value={banner}
                  onChange={setBanner}
                  aspect="banner"
                />
                {banner && <ResetButton onReset={() => setBanner("")} />}
              </div>
              <div className="space-y-1">
                <AssetUploader
                  storeId={loja.id}
                  kind="banner-mobile"
                  label="Banner (celular)"
                  hint="Recomendado: 1200 × 600 px (proporção 2:1, horizontal). JPG ou PNG até 5 MB. Deixe o conteúdo importante no centro."
                  value={bannerMobile}
                  onChange={setBannerMobile}
                  aspect="banner-mobile"
                />
                {bannerMobile && <ResetButton onReset={() => setBannerMobile("")} />}
              </div>
              {bannerMobile && (
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-[#0F172A]">Encaixe do banner celular</div>
                      <div className="text-xs text-[#64748B]">Como sua imagem se encaixa na tela do celular.</div>
                    </div>
                    <ResetButton
                      onReset={() => {
                        setMobileFit(DEFAULT_FIT);
                        setMobilePosX(DEFAULT_POS);
                        setMobilePosY(DEFAULT_POS);
                        setMobileZoom(DEFAULT_ZOOM);
                      }}
                    />
                  </div>

                  <div>
                    <Label className="text-xs">Modo de encaixe</Label>
                    <RadioGroup
                      value={mobileFit}
                      onValueChange={(v) => setMobileFit(v as "cover" | "contain")}
                      className="mt-2 grid grid-cols-2 gap-2"
                    >
                      <label
                        className={`flex cursor-pointer flex-col rounded-lg border p-3 text-xs transition ${
                          mobileFit === "cover" ? "border-[#2563EB] bg-[#EFF6FF]" : "border-[#E5E7EB] bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="cover" />
                          <span className="font-semibold text-[#0F172A]">Preencher</span>
                        </div>
                        <span className="mt-1 text-[#64748B]">Ocupa todo o espaço, pode cortar bordas.</span>
                      </label>
                      <label
                        className={`flex cursor-pointer flex-col rounded-lg border p-3 text-xs transition ${
                          mobileFit === "contain" ? "border-[#2563EB] bg-[#EFF6FF]" : "border-[#E5E7EB] bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="contain" />
                          <span className="font-semibold text-[#0F172A]">Mostrar tudo</span>
                        </div>
                        <span className="mt-1 text-[#64748B]">Mostra a imagem inteira, com margens.</span>
                      </label>
                    </RadioGroup>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Posição horizontal</Label>
                        <span className="text-xs text-[#64748B]">{mobilePosX}%</span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[mobilePosX]}
                        onValueChange={(v) => setMobilePosX(v[0] ?? 50)}
                        className="mt-2"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Posição vertical</Label>
                        <span className="text-xs text-[#64748B]">{mobilePosY}%</span>
                      </div>
                      <Slider
                        min={0}
                        max={100}
                        step={1}
                        value={[mobilePosY]}
                        onValueChange={(v) => setMobilePosY(v[0] ?? 50)}
                        className="mt-2"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Zoom</Label>
                        <span className="text-xs text-[#64748B]">{mobileZoom}%</span>
                      </div>
                      <Slider
                        min={100}
                        max={300}
                        step={5}
                        value={[mobileZoom]}
                        onValueChange={(v) => setMobileZoom(v[0] ?? 100)}
                        className="mt-2"
                        disabled={mobileFit === "contain"}
                      />
                      {mobileFit === "contain" && (
                        <p className="mt-1 text-[11px] text-[#94A3B8]">Zoom só se aplica no modo Preencher.</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              <SuggestedBanners onPick={(url) => { setBanner(url); setBannerMobile(url); }} />
              <p className="text-xs text-[#64748B]">
                Ao clicar em Salvar, os arquivos removidos ou substituídos são apagados do armazenamento.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base text-[#0F172A]">Cores da marca</CardTitle>
              <ResetButton onReset={() => { setCor1(DEFAULT_COR1); setCor2(DEFAULT_COR2); }} />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cor primária</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={cor1} onChange={(e) => setCor1(e.target.value)} className="w-16 h-10 p-1" />
                    <Input value={cor1} onChange={(e) => setCor1(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Cor secundária</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={cor2} onChange={(e) => setCor2(e.target.value)} className="w-16 h-10 p-1" />
                    <Input value={cor2} onChange={(e) => setCor2(e.target.value)} />
                  </div>
                </div>
              </div>
              <ColorPresets onPick={(a, b) => { setCor1(a); setCor2(b); }} />
              <p className="text-xs text-[#64748B]">
                As cores pintam a aura de fundo, o logo, a barra de progresso e o botão de resgate na página do cliente.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#22C55E] via-[#F59E0B] to-[#6D28D9]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base text-[#0F172A]">Cores de apoio & cabeçalho</CardTitle>
              <ResetButton
                onReset={() => {
                  setAccentPoints(DEFAULT_ACCENT_POINTS);
                  setAccentCashback(DEFAULT_ACCENT_CASHBACK);
                  setBrandCta("");
                  setBrandVip(DEFAULT_VIP);
                  setBrandPrice(DEFAULT_PRICE);
                  setTextOnDark(DEFAULT_TEXT_ON_DARK);
                  setKickerText(DEFAULT_KICKER_TEXT);
                  setKickerShow(true);
                  setTitleSize(DEFAULT_TITLE_SIZE);
                  setTitleWeight(DEFAULT_TITLE_WEIGHT);
                }}
              />
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {([
                  { label: "Saldo de pontos", val: accentPoints, set: setAccentPoints, def: DEFAULT_ACCENT_POINTS, hint: "Cor do ícone e do 'pts'" },
                  { label: "Saldo de cashback", val: accentCashback, set: setAccentCashback, def: DEFAULT_ACCENT_CASHBACK, hint: "Ícone e botão de cashback" },
                  { label: "Botão Resgatar (CTA)", val: brandCta, set: setBrandCta, def: "", hint: "Vazio = gradiente das cores da marca" },
                  { label: "Selo VIP / nível", val: brandVip, set: setBrandVip, def: DEFAULT_VIP, hint: "Chip do nível (Bronze/Prata/Ouro)" },
                  { label: "Preço / valor R$", val: brandPrice, set: setBrandPrice, def: DEFAULT_PRICE, hint: "Realce em valores monetários" },
                  { label: "Texto sobre fundo escuro", val: textOnDark, set: setTextOnDark, def: DEFAULT_TEXT_ON_DARK, hint: "Nome da loja, saldos, títulos" },
                ] as const).map((c) => (
                  <div key={c.label} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">{c.label}</Label>
                      {c.val !== c.def && (
                        <button
                          type="button"
                          onClick={() => c.set(c.def)}
                          className="text-[10px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1"
                          title="Restaurar padrão desta cor"
                        >
                          <RotateCcw className="h-3 w-3" /> reset
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={c.val || "#000000"}
                        onChange={(e) => c.set(e.target.value)}
                        className="w-14 h-10 p-1"
                      />
                      <Input
                        placeholder="#RRGGBB"
                        value={c.val}
                        onChange={(e) => c.set(e.target.value)}
                      />
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">{c.hint}</div>
                  </div>
                ))}
              </div>

              {contrastAlerts.length > 0 && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 space-y-1">
                  {contrastAlerts.map((msg) => (
                    <div key={msg}>⚠ {msg}</div>
                  ))}
                </div>
              )}

              <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 space-y-4">
                <div className="text-sm font-semibold text-[#0F172A]">Cabeçalho da página do cliente</div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Texto acima do nome</Label>
                      {kickerText !== DEFAULT_KICKER_TEXT && (
                        <button type="button" onClick={() => setKickerText(DEFAULT_KICKER_TEXT)} className="text-[10px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> reset
                        </button>
                      )}
                    </div>
                    <Input
                      placeholder="Ex.: Fidelidade, Clube VIP, Recompensas..."
                      value={kickerText}
                      onChange={(e) => setKickerText(e.target.value.slice(0, 40))}
                      maxLength={40}
                    />
                    <label className="flex items-center gap-2 text-xs text-[#475569] mt-1">
                      <input
                        type="checkbox"
                        checked={kickerShow}
                        onChange={(e) => setKickerShow(e.target.checked)}
                      />
                      Mostrar este texto
                    </label>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Tamanho do nome da loja</Label>
                      {titleSize !== DEFAULT_TITLE_SIZE && (
                        <button type="button" onClick={() => setTitleSize(DEFAULT_TITLE_SIZE)} className="text-[10px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> reset
                        </button>
                      )}
                    </div>
                    <select
                      value={titleSize}
                      onChange={(e) => setTitleSize(e.target.value as typeof titleSize)}
                      className="w-full h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
                    >
                      <option value="sm">Pequeno</option>
                      <option value="md">Médio (padrão)</option>
                      <option value="lg">Grande</option>
                      <option value="xl">Muito grande</option>
                      <option value="2xl">Máximo</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Peso do nome da loja</Label>
                      {titleWeight !== DEFAULT_TITLE_WEIGHT && (
                        <button type="button" onClick={() => setTitleWeight(DEFAULT_TITLE_WEIGHT)} className="text-[10px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> reset
                        </button>
                      )}
                    </div>
                    <select
                      value={titleWeight}
                      onChange={(e) => setTitleWeight(e.target.value as typeof titleWeight)}
                      className="w-full h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
                    >
                      <option value="normal">Normal</option>
                      <option value="semibold">Semi-negrito</option>
                      <option value="bold">Negrito (padrão)</option>
                      <option value="black">Extra-negrito</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Tamanho do texto acima (kicker)</Label>
                      {kickerSize !== DEFAULT_KICKER_SIZE && (
                        <button type="button" onClick={() => setKickerSize(DEFAULT_KICKER_SIZE)} className="text-[10px] text-[#64748B] hover:text-[#0F172A] flex items-center gap-1">
                          <RotateCcw className="h-3 w-3" /> reset
                        </button>
                      )}
                    </div>
                    <select
                      value={kickerSize}
                      onChange={(e) => setKickerSize(e.target.value as typeof kickerSize)}
                      className="w-full h-10 rounded-md border border-[#E5E7EB] bg-white px-3 text-sm"
                    >
                      <option value="xs">Muito pequeno</option>
                      <option value="sm">Pequeno (padrão)</option>
                      <option value="md">Médio</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-lg bg-[#0a0a1a] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[11px] text-[#94A3B8]">Prévia do cabeçalho</div>
                    <div className="flex items-center gap-1 rounded-md bg-white/5 p-0.5">
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("mobile")}
                        className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 ${previewDevice === "mobile" ? "bg-white/15 text-white" : "text-white/50"}`}
                      >
                        <Smartphone className="h-3 w-3" /> Mobile
                      </button>
                      <button
                        type="button"
                        onClick={() => setPreviewDevice("desktop")}
                        className={`px-2 py-1 rounded text-[10px] flex items-center gap-1 ${previewDevice === "desktop" ? "bg-white/15 text-white" : "text-white/50"}`}
                      >
                        <Monitor className="h-3 w-3" /> Desktop
                      </button>
                    </div>
                  </div>
                  <div
                    className="mx-auto transition-all"
                    style={{ maxWidth: previewDevice === "mobile" ? 320 : "100%" }}
                  >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${cor1}, ${cor2})` }}
                    >
                      {(loja.nome_fantasia || "L").charAt(0)}
                    </div>
                    <div className="min-w-0">
                      {kickerShow && (
                        <div
                          className="uppercase tracking-[0.2em] font-semibold"
                          style={{
                            color: `color-mix(in oklab, ${cor1} 60%, #cbd5e1)`,
                            fontSize: { xs: "9px", sm: "10px", md: "12px" }[kickerSize],
                          }}
                        >
                          {kickerText || "Fidelidade"}
                        </div>
                      )}
                      <div
                        className={`leading-tight truncate ${
                          previewDevice === "mobile"
                            ? { sm: "text-sm", md: "text-base", lg: "text-lg", xl: "text-xl", "2xl": "text-2xl" }[titleSize]
                            : { sm: "text-sm", md: "text-lg", lg: "text-xl", xl: "text-2xl", "2xl": "text-3xl" }[titleSize]
                        } ${
                          { normal: "font-normal", semibold: "font-semibold", bold: "font-bold", black: "font-black" }[titleWeight]
                        }`}
                        style={{ color: textOnDark || "#ffffff" }}
                      >
                        {loja.nome_fantasia}
                      </div>
                    </div>
                  </div>
                  </div>
                </div>

                {/* Prévia ao vivo da página de pontos */}
                <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 space-y-3">
                  <div className="text-sm font-semibold text-[#0F172A]">Prévia — página de pontos</div>
                  <div
                    className="mx-auto rounded-2xl p-4 space-y-3 transition-all"
                    style={{
                      maxWidth: previewDevice === "mobile" ? 320 : "100%",
                      background:
                        bgMode === "custom"
                          ? `linear-gradient(135deg, ${bgColor1}, ${bgColor2})`
                          : bgMode === "light"
                            ? "linear-gradient(135deg, #f8fafc, #e2e8f0)"
                            : "linear-gradient(135deg, #0B1020, #1e1b4b)",
                    }}
                  >
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                        <div className="flex items-center gap-1 text-[10px]" style={{ color: textOnDark, opacity: 0.7 }}>
                          <Coins className="h-3 w-3" style={{ color: accentPoints }} /> Seus pontos
                        </div>
                        <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: textOnDark }}>
                          1.240 <span className="text-xs font-semibold" style={{ color: accentPoints }}>pts</span>
                        </div>
                        <div
                          className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-semibold border"
                          style={{
                            background: `color-mix(in oklab, ${brandVip} 18%, transparent)`,
                            borderColor: `color-mix(in oklab, ${brandVip} 40%, transparent)`,
                            color: `color-mix(in oklab, ${brandVip} 30%, #f1f5f9)`,
                          }}
                        >
                          <Sparkles className="h-2.5 w-2.5" /> VIP Ouro
                        </div>
                      </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                        <div className="flex items-center gap-1 text-[10px]" style={{ color: textOnDark, opacity: 0.7 }}>
                          <Wallet className="h-3 w-3" style={{ color: accentCashback }} /> Seu cashback
                        </div>
                        <div className="mt-1 text-2xl font-bold tabular-nums" style={{ color: brandPrice || textOnDark }}>
                          R$ 47,90
                        </div>
                        <div
                          className="mt-2 inline-block rounded-full px-2 py-0.5 text-[9px] font-semibold border"
                          style={{
                            background: `color-mix(in oklab, ${accentCashback} 18%, transparent)`,
                            borderColor: `color-mix(in oklab, ${accentCashback} 40%, transparent)`,
                            color: `color-mix(in oklab, ${accentCashback} 25%, #ecfeff)`,
                          }}
                        >
                          disponível
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="w-full rounded-xl py-2.5 text-sm font-semibold flex items-center justify-center gap-2"
                      style={{
                        background: brandCta || `linear-gradient(135deg, ${cor1}, ${cor2})`,
                        color: textOnDark,
                        boxShadow: `0 6px 16px -6px color-mix(in oklab, ${brandCta || cor1} 60%, transparent)`,
                      }}
                    >
                      <Gift className="h-4 w-4" /> Resgatar recompensa
                    </button>
                  </div>
                </div>
              </div>

              <p className="text-xs text-[#64748B]">
                Essas cores aparecem na página que seus clientes veem — saldo de pontos, cashback, botão de resgatar, selo VIP, preços em R$ e o cabeçalho com o nome da sua loja.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#0F172A] via-[#334155] to-[#F8FAFC]" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base text-[#0F172A]">Fundo da página do cliente</CardTitle>
              <ResetButton
                onReset={() => { setBgMode(DEFAULT_BG_MODE); setBgColor1(DEFAULT_BG1); setBgColor2(DEFAULT_BG2); }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs">Modo do fundo</Label>
                <RadioGroup
                  value={bgMode}
                  onValueChange={(v) => setBgMode(v as "dark" | "light" | "custom")}
                  className="mt-2 grid grid-cols-3 gap-2"
                >
                  {[
                    { v: "dark", label: "Escuro", desc: "Midnight Indigo (padrão)" },
                    { v: "light", label: "Claro", desc: "Fundo branco suave" },
                    { v: "custom", label: "Personalizado", desc: "Suas 2 cores" },
                  ].map((opt) => (
                    <label
                      key={opt.v}
                      className={`flex cursor-pointer flex-col rounded-lg border p-3 text-xs transition ${
                        bgMode === opt.v ? "border-[#2563EB] bg-[#EFF6FF]" : "border-[#E5E7EB] bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value={opt.v} />
                        <span className="font-semibold text-[#0F172A]">{opt.label}</span>
                      </div>
                      <span className="mt-1 text-[#64748B]">{opt.desc}</span>
                    </label>
                  ))}
                </RadioGroup>
              </div>

              {bgMode === "custom" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Cor de fundo principal</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={bgColor1} onChange={(e) => setBgColor1(e.target.value)} className="w-16 h-10 p-1" />
                      <Input value={bgColor1} onChange={(e) => setBgColor1(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Label>Cor de fundo secundária</Label>
                    <div className="flex gap-2">
                      <Input type="color" value={bgColor2} onChange={(e) => setBgColor2(e.target.value)} className="w-16 h-10 p-1" />
                      <Input value={bgColor2} onChange={(e) => setBgColor2(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="text-xs text-[#64748B] mb-2">Presets</div>
                <div className="flex flex-wrap gap-2">
                  {BG_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => { setBgMode(p.mode); setBgColor1(p.c1); setBgColor2(p.c2); }}
                      className="flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-xs hover:border-[#2563EB]"
                    >
                      <span className="h-4 w-8 rounded" style={{ background: `linear-gradient(135deg, ${p.c1}, ${p.c2})` }} />
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {contrastWarning && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
                  {contrastWarning}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} size="lg" className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all duration-200">
              {salvar.isPending ? "Salvando..." : "Salvar personalização"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={resetAll}
              disabled={salvar.isPending}
              className="rounded-xl"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Restaurar tudo
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={exportTheme}
              className="rounded-xl"
            >
              <Download className="h-4 w-4 mr-1" />
              Exportar tema
            </Button>
            <label className="inline-flex">
              <input
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void importTheme(f);
                  e.currentTarget.value = "";
                }}
              />
              <span className="inline-flex items-center gap-1 rounded-xl border border-[#E5E7EB] bg-white px-4 h-11 text-sm font-medium cursor-pointer hover:bg-[#F8FAFC]">
                <Upload className="h-4 w-4" /> Importar tema
              </span>
            </label>
          </div>
        </div>

        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB] mb-2">Prévia ao vivo</div>
          <LivePreview
            nome={loja.nome_fantasia}
            logo={logo}
            banner={banner}
            bannerMobile={bannerMobile}
            cor1={cor1}
            cor2={cor2}
            modalidade={loja.modalidade as Modalidade}
            mobileFit={mobileFit}
            mobilePositionX={mobilePosX}
            mobilePositionY={mobilePosY}
            mobileZoom={mobileZoom}
            showSafeArea
            bgMode={bgMode}
            bgColor1={bgColor1}
            bgColor2={bgColor2}
          />
          <p className="mt-2 text-[11px] text-[#64748B]">
            Atualiza em tempo real. A área tracejada mostra a "zona segura" — mantenha logo e textos dentro dela para não cortar em celulares pequenos.
          </p>
        </div>
      </div>
    </div>
  );
}