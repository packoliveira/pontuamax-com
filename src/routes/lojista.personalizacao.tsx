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

function PersonalizacaoPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());

  const [logo, setLogo] = useState("");
  const [banner, setBanner] = useState("");
  const [bannerMobile, setBannerMobile] = useState("");
  const [cor1, setCor1] = useState("#7c3aed");
  const [cor2, setCor2] = useState("#f97316");

  useEffect(() => {
    if (loja) {
      setLogo(loja.logo_url ?? "");
      setBanner(loja.banner_url ?? "");
      setBannerMobile(loja.banner_url_mobile ?? "");
      setCor1(loja.brand_primary);
      setCor2(loja.brand_secondary);
    }
  }, [loja]);

  const salvar = useMutation({
    mutationFn: () =>
      atualizarLoja({
        data: {
          logo_url: logo || null,
          banner_url: banner || null,
          banner_url_mobile: bannerMobile || null,
          brand_primary: cor1,
          brand_secondary: cor2,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Personalização salva");
    },
    onError: (e) => toast.error((e as Error).message),
  });

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
            <CardHeader><CardTitle className="text-base text-[#0F172A]">Logo e banners</CardTitle></CardHeader>
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
                hint="Recomendado: 1080 × 720 px (vertical). JPG ou PNG até 5 MB."
                value={bannerMobile}
                onChange={setBannerMobile}
                aspect="banner"
              />
              <SuggestedBanners onPick={(url) => { setBanner(url); setBannerMobile(url); }} />
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
            <CardHeader><CardTitle className="text-base text-[#0F172A]">Cores da marca</CardTitle></CardHeader>
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

          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} size="lg" className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all duration-200">
            {salvar.isPending ? "Salvando..." : "Salvar personalização"}
          </Button>
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