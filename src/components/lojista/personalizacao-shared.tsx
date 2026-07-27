import { useState } from "react";
import { Coins, Wallet, Sparkles, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { Modalidade } from "@/lib/qsf-shared";

export function isLightHex(hex: string): boolean {
  const m = hex.trim().match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!m) return false;
  let h = m[1];
  if (h.length === 3)
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}

export function LivePreview({
  nome,
  logo,
  banner,
  bannerMobile,
  cor1,
  cor2,
  modalidade,
  mobileFit = "cover",
  mobilePositionX = 50,
  mobilePositionY = 50,
  mobileZoom = 100,
  showSafeArea = false,
  bgMode = "dark",
  bgColor1 = null,
  bgColor2 = null,
}: {
  nome: string;
  logo: string;
  banner: string;
  bannerMobile: string;
  cor1: string;
  cor2: string;
  modalidade: Modalidade;
  mobileFit?: "cover" | "contain";
  mobilePositionX?: number;
  mobilePositionY?: number;
  mobileZoom?: number;
  showSafeArea?: boolean;
  bgMode?: "dark" | "light" | "custom";
  bgColor1?: string | null;
  bgColor2?: string | null;
}) {
  const [device, setDevice] = useState<"mobile" | "desktop">("mobile");
  const inclP = modalidade !== "cashback";
  const inclC = modalidade !== "pontos";
  const isDesktop = device === "desktop";
  const bannerSrc = isDesktop ? banner || bannerMobile : bannerMobile || banner;
  const gradient = `linear-gradient(135deg, ${cor1}, ${cor2})`;
  const glow = `0 12px 40px -12px ${cor1}80`;
  const zoom = isDesktop ? 1 : mobileZoom / 100;
  const fit = isDesktop ? "cover" : mobileFit;
  const posX = isDesktop ? 50 : mobilePositionX;
  const posY = isDesktop ? 50 : mobilePositionY;
  const bgBase =
    bgMode === "light" ? "#f8fafc" : bgMode === "custom" ? bgColor1 || "#0B1020" : "#0B1020";
  const bgAccent = bgMode === "custom" ? bgColor2 || cor1 : bgMode === "light" ? cor1 : cor1;
  const isLightBg = bgMode === "light" || (bgMode === "custom" && isLightHex(bgBase));
  const textPrimary = isLightBg ? "#0f172a" : "#ffffff";
  const textMuted = isLightBg ? "rgba(15,23,42,0.65)" : "rgba(255,255,255,0.7)";
  const chipBg = isLightBg ? "rgba(15,23,42,0.05)" : "rgba(255,255,255,0.05)";
  const chipBorder = isLightBg ? "rgba(15,23,42,0.1)" : "rgba(255,255,255,0.1)";
  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-lg border border-border bg-card p-0.5 text-xs">
        <button
          type="button"
          onClick={() => setDevice("mobile")}
          className={`px-3 py-1 rounded-md transition ${device === "mobile" ? "bg-[#0F172A] text-white" : "text-muted-foreground"}`}
        >
          📱 Celular
        </button>
        <button
          type="button"
          onClick={() => setDevice("desktop")}
          className={`px-3 py-1 rounded-md transition ${device === "desktop" ? "bg-[#0F172A] text-white" : "text-muted-foreground"}`}
        >
          🖥️ Desktop
        </button>
      </div>
      <div
        className="rounded-2xl border border-border shadow-sm overflow-hidden relative"
        style={{
          background: `radial-gradient(120% 80% at 0% 0%, ${bgAccent}22, transparent 60%), radial-gradient(120% 80% at 100% 100%, ${cor2}22, transparent 60%), ${bgBase}`,
        }}
      >
        <div className="h-1" style={{ background: gradient }} />
        {bannerSrc ? (
          <div
            className={`w-full overflow-hidden relative ${isDesktop ? "aspect-[4/1]" : "aspect-[2/1]"}`}
            style={{
              background:
                fit === "contain" ? `color-mix(in oklab, ${cor1} 15%, ${bgBase})` : undefined,
            }}
          >
            <img
              src={bannerSrc}
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full"
              style={{
                objectFit: fit,
                objectPosition: `${posX}% ${posY}%`,
                transform: zoom !== 1 ? `scale(${zoom})` : undefined,
                transformOrigin: `${posX}% ${posY}%`,
              }}
            />
            {showSafeArea && bannerMobile && !isDesktop && (
              <div className="pointer-events-none absolute inset-0">
                <div
                  className="absolute rounded-md border-2 border-dashed"
                  style={{
                    left: "15%",
                    right: "15%",
                    top: "15%",
                    bottom: "15%",
                    borderColor: "rgba(255,255,255,0.85)",
                    boxShadow: "0 0 0 9999px rgba(0,0,0,0.15) inset",
                  }}
                />
                <div className="absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                  Área segura
                </div>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`w-full ${isDesktop ? "aspect-[4/1]" : "aspect-[2/1]"}`}
            style={{ background: gradient, opacity: 0.85 }}
          />
        )}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            {logo ? (
              <img
                src={logo}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-10 w-10 rounded-xl object-contain p-1 ring-1"
                style={{ boxShadow: glow, borderColor: cor1, background: chipBg }}
              />
            ) : (
              <div
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold"
                style={{ background: gradient, boxShadow: glow }}
              >
                {(nome || "L").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="text-sm font-semibold truncate" style={{ color: textPrimary }}>
                {nome || "Sua loja"}
              </div>
              <div className="text-[10px] uppercase tracking-wider" style={{ color: textMuted }}>
                Programa fidelidade
              </div>
            </div>
          </div>

          <div
            className="rounded-xl p-3 space-y-2"
            style={{ background: chipBg, border: `1px solid ${chipBorder}` }}
          >
            <div
              className="flex items-center justify-between text-[11px]"
              style={{ color: textMuted }}
            >
              <span>Nível Prata</span>
              <span>240 / 300 pts</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: chipBg }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: "80%",
                  background: gradient,
                  boxShadow: `0 0 12px ${cor1}99`,
                }}
              />
            </div>
          </div>

          {inclP && (
            <div
              className="flex items-center gap-2 rounded-lg p-2"
              style={{ background: `${cor1}22` }}
            >
              <Coins className="h-4 w-4" style={{ color: cor1 }} />
              <div className="text-xs" style={{ color: textPrimary }}>
                <strong>240</strong> pontos
              </div>
            </div>
          )}
          {inclC && (
            <div
              className="flex items-center gap-2 rounded-lg p-2"
              style={{ background: `${cor2}22` }}
            >
              <Wallet className="h-4 w-4" style={{ color: cor2 }} />
              <div className="text-xs" style={{ color: textPrimary }}>
                <strong>R$ 32,50</strong> de cashback
              </div>
            </div>
          )}

          <button
            type="button"
            className="w-full py-2 rounded-xl text-sm font-semibold text-white inline-flex items-center justify-center gap-1"
            style={{ background: gradient, boxShadow: glow }}
          >
            <Sparkles className="h-4 w-4" />
            Resgatar recompensa
          </button>
        </div>
      </div>
    </div>
  );
}

export function AssetUploader({
  storeId,
  kind,
  label,
  hint,
  value,
  onChange,
  aspect,
}: {
  storeId: string;
  kind: "logo" | "banner" | "banner-mobile";
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "banner" | "banner-mobile";
}) {
  const [uploading, setUploading] = useState(false);

  function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = (e) => {
        URL.revokeObjectURL(url);
        reject(e);
      };
      img.src = url;
    });
  }

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo acima de 5 MB");
      return;
    }
    if (
      kind === "banner-mobile" &&
      file.type.startsWith("image/") &&
      file.type !== "image/svg+xml"
    ) {
      try {
        const dims = await readImageDimensions(file);
        const ratio = dims.width / dims.height;
        const targetRatio = 2;
        const ratioOff = Math.abs(ratio - targetRatio) / targetRatio;
        const tooSmall = dims.width < 900 || dims.height < 450;
        const problems: string[] = [];
        if (ratioOff > 0.1) {
          problems.push(`proporção ${ratio.toFixed(2)}:1 (recomendado 2:1)`);
        }
        if (tooSmall) {
          problems.push(`${dims.width}×${dims.height}px (mínimo 1200×600)`);
        }
        if (problems.length > 0) {
          toast.warning("Banner celular fora do recomendado", {
            description:
              `Detectamos: ${problems.join(" e ")}. ` +
              `Para não cortar em celulares pequenos, use 1200×600 px na horizontal e mantenha o logo dentro da área segura central.`,
            duration: 8000,
          });
        }
      } catch {
        // silencioso
      }
    }
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${storeId}/${kind}-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("store-assets").upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("store-assets")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data?.signedUrl)
        throw signed.error ?? new Error("Falha ao gerar URL");
      onChange(signed.data.signedUrl);
      toast.success("Imagem enviada — não esqueça de salvar as alterações.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const previewClass =
    aspect === "banner"
      ? "w-full h-24 object-cover"
      : aspect === "banner-mobile"
        ? "w-full max-w-[220px] aspect-[2/1] object-contain bg-muted/40"
        : "h-20 w-20 object-contain bg-muted";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img
            src={value}
            alt={label}
            loading="lazy"
            decoding="async"
            className={`${previewClass} rounded-md border`}
          />
        ) : (
          <div
            className={`${previewClass} rounded-md border border-dashed flex items-center justify-center text-xs text-muted-foreground`}
          >
            sem imagem
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="inline-flex">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.currentTarget.value = "";
              }}
            />
            <Button type="button" variant="outline" size="sm" asChild>
              <span>
                {uploading ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Upload className="h-3 w-3 mr-1" />
                )}
                {uploading ? "Enviando..." : value ? "Trocar imagem" : "Enviar imagem"}
              </span>
            </Button>
          </label>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")}>
              Remover
            </Button>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

const COLOR_PRESETS: { name: string; a: string; b: string }[] = [
  { name: "Midnight", a: "#6366F1", b: "#A855F7" },
  { name: "Sunset", a: "#7C3AED", b: "#F97316" },
  { name: "Esmeralda", a: "#10B981", b: "#F59E0B" },
  { name: "Rosé", a: "#EC4899", b: "#DB2777" },
  { name: "Oceano", a: "#2563EB", b: "#06B6D4" },
  { name: "Café", a: "#7C4A2E", b: "#D97706" },
  { name: "Ônix & Ouro", a: "#111827", b: "#D4AF37" },
  { name: "Rubi", a: "#DC2626", b: "#1F2937" },
];

export function ColorPresets({ onPick }: { onPick: (a: string, b: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">Paletas prontas</Label>
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onPick(p.a, p.b)}
            className="group flex items-center gap-2 rounded-full border border-border pl-1 pr-3 py-1 text-xs font-medium text-foreground hover:border-primary hover:shadow-sm transition-all"
            title={`${p.a} + ${p.b}`}
          >
            <span
              className="h-6 w-6 rounded-full border border-white shadow-sm"
              style={{ background: `linear-gradient(135deg, ${p.a}, ${p.b})` }}
            />
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}

const SUGGESTED_BANNERS: { label: string; url: string }[] = [
  {
    label: "Café",
    url: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1920&h=560&q=80",
  },
  {
    label: "Restaurante",
    url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&h=560&q=80",
  },
  {
    label: "Varejo",
    url: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1920&h=560&q=80",
  },
  {
    label: "Beleza",
    url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1920&h=560&q=80",
  },
  {
    label: "Fitness",
    url: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1920&h=560&q=80",
  },
  {
    label: "Abstrato",
    url: "https://images.unsplash.com/photo-1557682250-33bd709cbe85?auto=format&fit=crop&w=1920&h=560&q=80",
  },
];

export function SuggestedBanners({ onPick }: { onPick: (url: string) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">
        Ou escolha um banner sugerido
      </Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {SUGGESTED_BANNERS.map((b) => (
          <button
            key={b.url}
            type="button"
            onClick={() => {
              onPick(b.url);
              toast.success(`Banner "${b.label}" aplicado — salve para publicar.`);
            }}
            className="group relative rounded-lg overflow-hidden border border-border hover:border-primary hover:shadow-md transition-all"
          >
            <img
              src={b.url}
              alt={b.label}
              loading="lazy"
              decoding="async"
              className="w-full h-16 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1">
              <span className="text-[10px] font-medium text-white">{b.label}</span>
            </div>
          </button>
        ))}
      </div>
      <p className="text-[11px] text-muted-foreground">
        Aplica em desktop e celular. Você pode substituir por uma imagem própria a qualquer momento.
      </p>
    </div>
  );
}