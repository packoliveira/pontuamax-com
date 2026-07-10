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
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { RotateCcw } from "lucide-react";
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
    toast.info("Valores restaurados. Clique em Salvar para aplicar.");
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
          />
          <p className="mt-2 text-[11px] text-[#64748B]">
            Atualiza em tempo real conforme você ajusta cores, banner e logo.
          </p>
        </div>
      </div>
    </div>
  );
}