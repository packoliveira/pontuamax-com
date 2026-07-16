import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, integrationLogsQuery } from "@/lib/queries";
import {
  atualizarLoja,
  rotacionarWebhookSecret,
  testarWebhook,
  salvarWhatsapp,
  enviarWhatsappTeste,
  conectarWhatsappQR,
  statusWhatsapp,
  desconectarWhatsapp,
  salvarNotificacoes,
  dispararNotificacoesAgora,
} from "@/lib/qsf.functions";
import type { Modalidade } from "@/lib/qsf-shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Copy,
  RefreshCw,
  Send,
  CheckCircle2,
  XCircle,
  MessageCircle,
  QrCode,
  Loader2,
  Power,
  Bell,
  Cake,
  Clock,
  TimerReset,
  Gift,
  Star,
  Instagram,
} from "lucide-react";
import { Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { iniciarConexaoOlist, getStatusOlist, desconectarOlist } from "@/lib/olist.functions";
import { Link as LinkIcon, Unplug } from "lucide-react";
import {
  LivePreview,
  AssetUploader,
  ColorPresets,
  SuggestedBanners,
} from "@/components/lojista/personalizacao-shared";

export const Route = createFileRoute("/lojista/configuracoes")({
  ssr: false,
  component: ConfigPage,
});

function ConfigPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());

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

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="space-y-1">
        <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
          Ajustes
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-[#0F172A]">Configurações</h1>
        <p className="text-sm text-[#64748B]">
          Personalize a página do cliente, regras de recompensa e integrações
        </p>
      </div>
      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
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

          <Button
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending}
            size="lg"
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white shadow-sm transition-all duration-200"
          >
            {salvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>

          <IntegracoesCard
            storeId={loja.id}
            slug={loja.slug}
            secret={loja.webhook_secret}
            lastAt={loja.webhook_last_at}
          />
          <OlistOAuthCard storeId={loja.id} />
          <WhatsappCard loja={loja} />
          <NotificacoesCard loja={loja} />
          <IndicacaoCard loja={loja} />
          <NpsCard loja={loja} />
          <InstagramCard loja={loja} />
          <ValidadePontosCard loja={loja} />
        </div>
        <div className="lg:sticky lg:top-8 lg:self-start">
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
    </div>
  );
}

function IntegracoesCard({
  storeId,
  slug,
  secret,
  lastAt,
}: {
  storeId: string;
  slug: string;
  secret: string;
  lastAt: string | null;
}) {
  const qc = useQueryClient();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://pontuamax-com.lovable.app";
  const webhookOrigin =
    origin.includes("localhost") || origin.includes("id-preview--")
      ? "https://pontuamax-com.lovable.app"
      : origin;
  const query = `store=${encodeURIComponent(slug)}&secret=${encodeURIComponent(secret)}`;
  const urlBling = `${webhookOrigin}/api/public/webhook/bling?${query}`;
  const urlOlist = `${webhookOrigin}/api/public/webhook/olist?${query}`;
  const headerUrlBling = `${webhookOrigin}/api/public/webhook/bling`;
  const headerUrlOlist = `${webhookOrigin}/api/public/webhook/olist`;

  const conectada = !!lastAt && Date.now() - new Date(lastAt).getTime() < 30 * 24 * 60 * 60 * 1000;

  const { data: logs } = useQuery(integrationLogsQuery(storeId));

  const rotate = useMutation({
    mutationFn: () => rotacionarWebhookSecret({}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Novo segredo gerado. Atualize no Bling/Olist.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const test = useMutation({
    mutationFn: () => testarWebhook({ data: { origem: "teste" } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      qc.invalidateQueries({ queryKey: ["integration-logs", storeId] });
      toast.success("Webhook de teste registrado.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const copy = (v: string, label: string) => {
    navigator.clipboard.writeText(v).then(() => toast.success(`${label} copiado`));
  };

  return (
    <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between text-[#0F172A]">
          <span>Integrações (Bling / Olist)</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              conectada ? "bg-[#22C55E]/10 text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"
            }`}
          >
            {conectada ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {conectada ? "Conectada" : "Nunca conectada"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-[#64748B]">
          Configure a URL completa abaixo no painel do Bling ou Olist. Cada venda enviada será
          lançada automaticamente no PontuaMax, creditando pontos/cashback para o cliente sem
          precisar digitar em <em>Lançar Venda</em>.
        </p>

        <div>
          <Label>URL completa do webhook (Bling)</Label>
          <div className="flex gap-2">
            <Input readOnly value={urlBling} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(urlBling, "URL")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <Label>URL completa do webhook (Olist)</Label>
          <div className="flex gap-2">
            <Input readOnly value={urlOlist} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(urlOlist, "URL")}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label>Identificador da loja</Label>
          <div className="flex gap-2">
            <Input readOnly value={slug} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(slug, "Slug")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label>Chave secreta</Label>
          <div className="flex gap-2">
            <Input readOnly value={secret} className="font-mono text-xs" />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => copy(secret, "Segredo")}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (
                  confirm("Gerar novo segredo? A chave atual deixará de funcionar imediatamente.")
                )
                  rotate.mutate();
              }}
              disabled={rotate.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Gerar novo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Para Olist/Tiny, use a URL completa acima. Se a integração permitir headers, use{" "}
            <code>{headerUrlOlist}</code> ou <code>{headerUrlBling}</code> com{" "}
            <code>x-qsf-store</code> e <code>x-qsf-secret</code>. Payload esperado:
            <code className="ml-1">{`{ id_venda_externa, valor, telefone_cliente, nome_cliente? }`}</code>
            .
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => test.mutate()}
            disabled={test.isPending}
            className="rounded-xl"
          >
            <Send className="h-4 w-4 mr-1" />
            {test.isPending ? "Enviando..." : "Testar integração"}
          </Button>
          {lastAt && (
            <span className="text-xs text-[#64748B]">
              Último evento: {new Date(lastAt).toLocaleString("pt-BR")}
            </span>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold mb-2 text-[#0F172A]">Últimos 20 eventos</div>
          {!logs || logs.length === 0 ? (
            <div className="text-xs text-[#64748B] rounded-xl border border-dashed border-[#E5E7EB] bg-[#F8FAFC] p-4">
              Nenhum evento recebido ainda.
            </div>
          ) : (
            <div className="rounded-xl border border-[#E5E7EB] divide-y divide-[#E5E7EB] bg-white">
              {logs.map((log) => (
                <div key={log.id} className="p-2 text-xs flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                      log.status === "sucesso" ? "bg-[#22C55E]" : "bg-[#EF4444]"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium uppercase text-[#0F172A]">{log.origem}</span>
                      <span className="text-[#64748B]">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {log.mensagem_erro && <div className="text-[#EF4444]">{log.mensagem_erro}</div>}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[#64748B]">Payload</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all bg-[#F1F5F9] p-2 rounded-lg text-[#0F172A]">
                        {JSON.stringify(log.payload_recebido, null, 2)}
                      </pre>
                    </details>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

type IgLoja = {
  id: string;
  instagram_program_active: boolean;
  instagram_handle: string | null;
  instagram_points_per_post: number;
  instagram_min_days_live: number;
  instagram_instructions: string | null;
};

function InstagramCard({ loja }: { loja: IgLoja }) {
  const qc = useQueryClient();
  const [on, setOn] = useState(loja.instagram_program_active);
  const [handle, setHandle] = useState(loja.instagram_handle ?? "");
  const [pontos, setPontos] = useState(String(loja.instagram_points_per_post ?? 50));
  const [dias, setDias] = useState(String(loja.instagram_min_days_live ?? 7));
  const [instrucoes, setInstrucoes] = useState(loja.instagram_instructions ?? "");

  useEffect(() => {
    setOn(loja.instagram_program_active);
    setHandle(loja.instagram_handle ?? "");
    setPontos(String(loja.instagram_points_per_post ?? 50));
    setDias(String(loja.instagram_min_days_live ?? 7));
    setInstrucoes(loja.instagram_instructions ?? "");
  }, [loja]);

  const salvar = useMutation({
    mutationFn: () =>
      atualizarLoja({
        data: {
          instagram_program_active: on,
          instagram_handle: handle.trim().replace(/^@/, "") || null,
          instagram_points_per_post: Math.max(1, parseInt(pontos, 10) || 50),
          instagram_min_days_live: Math.max(0, parseInt(dias, 10) || 0),
          instagram_instructions: instrucoes.trim() || null,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Configurações do Instagram salvas");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-[#0F172A]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white">
            <Instagram className="h-4 w-4" />
          </span>
          Poste no Instagram e ganhe pontos
          <span className="ml-auto">
            <Switch checked={on} onCheckedChange={setOn} />
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-[#64748B]">
          Quando ativo, os clientes enviam o link do post do Instagram pela página de vocês e você
          aprova em{" "}
          <a href="/lojista/instagram" className="text-[#2563EB] hover:underline">
            Posts do Instagram
          </a>{" "}
          para creditar os pontos.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label>@ do Instagram da loja</Label>
            <Input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="sua_loja"
              disabled={!on}
            />
          </div>
          <div>
            <Label>Pontos por post aprovado</Label>
            <Input
              type="number"
              min={1}
              value={pontos}
              onChange={(e) => setPontos(e.target.value)}
              disabled={!on}
            />
          </div>
          <div>
            <Label>Post deve ficar no ar (dias)</Label>
            <Input
              type="number"
              min={0}
              value={dias}
              onChange={(e) => setDias(e.target.value)}
              disabled={!on}
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Se o cliente apagar antes disso, você pode estornar os pontos.
            </p>
          </div>
        </div>
        <div>
          <Label>Instruções para o cliente</Label>
          <Textarea
            rows={4}
            value={instrucoes}
            onChange={(e) => setInstrucoes(e.target.value)}
            disabled={!on}
            placeholder={`Ex:\n1. Poste uma foto ou reel usando nossos produtos\n2. Marque @${handle || "sua_loja"} na foto\n3. Use a #suahashtag\n4. Perfil precisa estar público`}
          />
        </div>
        <Button
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending}
          className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
        >
          {salvar.isPending ? "Salvando..." : "Salvar configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}

type ValidadeLoja = {
  id: string;
  pontos_expiracao_modo: string;
  pontos_validade_dias: number;
  pontos_decaimento_dias: number;
  pontos_decaimento_valor: number;
  pontos_expiracao_last_run_at: string | null;
};

function ValidadePontosCard({ loja }: { loja: ValidadeLoja }) {
  const qc = useQueryClient();
  const [modo, setModo] = useState<"nenhum" | "validade" | "decaimento">(
    (loja.pontos_expiracao_modo as never) ?? "nenhum",
  );
  const [validadeDias, setValidadeDias] = useState(String(loja.pontos_validade_dias ?? 365));
  const [decaiDias, setDecaiDias] = useState(String(loja.pontos_decaimento_dias ?? 30));
  const [decaiValor, setDecaiValor] = useState(String(loja.pontos_decaimento_valor ?? 10));

  useEffect(() => {
    setModo((loja.pontos_expiracao_modo as never) ?? "nenhum");
    setValidadeDias(String(loja.pontos_validade_dias ?? 365));
    setDecaiDias(String(loja.pontos_decaimento_dias ?? 30));
    setDecaiValor(String(loja.pontos_decaimento_valor ?? 10));
  }, [loja]);

  const salvar = useMutation({
    mutationFn: () =>
      atualizarLoja({
        data: {
          pontos_expiracao_modo: modo,
          pontos_validade_dias: Math.max(1, parseInt(validadeDias, 10) || 365),
          pontos_decaimento_dias: Math.max(1, parseInt(decaiDias, 10) || 30),
          pontos_decaimento_valor: Math.max(1, parseInt(decaiValor, 10) || 10),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Regras de validade salvas");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-[#0F172A]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white">
            <Hourglass className="h-4 w-4" />
          </span>
          Validade dos pontos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-[#64748B]">
          Defina se e como os pontos dos clientes expiram. A execução é automática (todo dia) e cria
          uma movimentação de "expiração" no histórico.
        </p>

        <RadioGroup value={modo} onValueChange={(v) => setModo(v as never)} className="space-y-2">
          <label className="flex items-start gap-2 rounded-xl border border-[#E5E7EB] p-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors duration-200">
            <RadioGroupItem value="nenhum" id="mp-nenhum" className="mt-0.5" />
            <div>
              <div className="text-sm font-medium text-[#0F172A]">Sem expiração</div>
              <div className="text-xs text-[#64748B]">Os pontos nunca expiram.</div>
            </div>
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-[#E5E7EB] p-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors duration-200">
            <RadioGroupItem value="validade" id="mp-validade" className="mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[#0F172A]">Validade por data</div>
              <div className="text-xs text-[#64748B]">
                Cada ponto ganho expira depois de N dias.
              </div>
              {modo === "validade" && (
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    className="w-28"
                    value={validadeDias}
                    onChange={(e) => setValidadeDias(e.target.value)}
                  />
                  <span className="text-xs text-[#64748B]">dias de validade</span>
                </div>
              )}
            </div>
          </label>
          <label className="flex items-start gap-2 rounded-xl border border-[#E5E7EB] p-3 cursor-pointer hover:bg-[#F8FAFC] transition-colors duration-200">
            <RadioGroupItem value="decaimento" id="mp-decai" className="mt-0.5" />
            <div className="flex-1">
              <div className="text-sm font-medium text-[#0F172A]">Decaimento periódico</div>
              <div className="text-xs text-[#64748B]">Cliente perde X pontos a cada N dias.</div>
              {modo === "decaimento" && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Pontos a remover</Label>
                    <Input
                      type="number"
                      min={1}
                      value={decaiValor}
                      onChange={(e) => setDecaiValor(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">A cada (dias)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={decaiDias}
                      onChange={(e) => setDecaiDias(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </label>
        </RadioGroup>

        {loja.pontos_expiracao_last_run_at && (
          <p className="text-[11px] text-[#64748B]">
            Última execução: {new Date(loja.pontos_expiracao_last_run_at).toLocaleString("pt-BR")}
          </p>
        )}

        <Button
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending}
          className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
        >
          {salvar.isPending ? "Salvando..." : "Salvar validade"}
        </Button>
      </CardContent>
    </Card>
  );
}

function IndicacaoCard({
  loja,
}: {
  loja: {
    id: string;
    slug: string;
    indicacao_ativa: boolean;
    bonus_indicador: number;
    bonus_indicado: number;
  };
}) {
  const qc = useQueryClient();
  const [ativa, setAtiva] = useState(loja.indicacao_ativa);
  const [bIndicador, setBIndicador] = useState(String(loja.bonus_indicador));
  const [bIndicado, setBIndicado] = useState(String(loja.bonus_indicado));
  useEffect(() => {
    setAtiva(loja.indicacao_ativa);
    setBIndicador(String(loja.bonus_indicador));
    setBIndicado(String(loja.bonus_indicado));
  }, [loja]);
  const salvar = useMutation({
    mutationFn: () =>
      atualizarLoja({
        data: {
          indicacao_ativa: ativa,
          bonus_indicador: parseInt(bIndicador) || 0,
          bonus_indicado: parseInt(bIndicado) || 0,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Indicação salva");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  const link =
    typeof window !== "undefined" ? `${window.location.origin}/${loja.slug}?indicou=TELEFONE` : "";
  return (
    <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-[#0F172A]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white">
            <Gift className="h-4 w-4" />
          </span>
          Indicação amigo → amigo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-[#64748B]">
          Cada cliente ganha um link único (com o telefone dele) para compartilhar. Quando o amigo
          se cadastrar por esse link e fizer a 1ª compra, os dois recebem pontos.
        </p>
        <div className="flex items-center gap-2">
          <Switch checked={ativa} onCheckedChange={setAtiva} />
          <span className="text-sm text-[#0F172A]">Ativar programa de indicação</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Bônus para o indicador (pts)</Label>
            <Input
              type="number"
              min={0}
              value={bIndicador}
              onChange={(e) => setBIndicador(e.target.value)}
              disabled={!ativa}
            />
          </div>
          <div>
            <Label>Bônus para o indicado (pts)</Label>
            <Input
              type="number"
              min={0}
              value={bIndicado}
              onChange={(e) => setBIndicado(e.target.value)}
              disabled={!ativa}
            />
          </div>
        </div>
        <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 text-xs text-[#64748B] break-all">
          Formato do link: <code className="text-[#0F172A]">{link}</code>
        </div>
        <Button
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending}
          className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
        >
          {salvar.isPending ? "Salvando..." : "Salvar indicação"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NpsCard({
  loja,
}: {
  loja: { id: string; nps_enabled: boolean; nps_ask_comment: boolean; nps_template: string };
}) {
  const qc = useQueryClient();
  const [on, setOn] = useState(loja.nps_enabled);
  const [askC, setAskC] = useState(loja.nps_ask_comment);
  const [tpl, setTpl] = useState(loja.nps_template);
  useEffect(() => {
    setOn(loja.nps_enabled);
    setAskC(loja.nps_ask_comment);
    setTpl(loja.nps_template);
  }, [loja]);
  const salvar = useMutation({
    mutationFn: () =>
      atualizarLoja({ data: { nps_enabled: on, nps_ask_comment: askC, nps_template: tpl } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("NPS salvo");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-[#0F172A]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white">
            <Star className="h-4 w-4" />
          </span>
          Pesquisa de satisfação (NPS)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[#64748B]">
          Após cada venda lançada, o cliente recebe um link no WhatsApp para dar uma nota de 0 a 10.
          Requer WhatsApp ativo.
        </p>
        <div className="flex items-center gap-2">
          <Switch checked={on} onCheckedChange={setOn} />
          <span className="text-sm text-[#0F172A]">Ativar pesquisa NPS pós-venda</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={askC} onCheckedChange={setAskC} disabled={!on} />
          <span className="text-sm text-[#0F172A]">Pedir comentário opcional</span>
        </div>
        <div>
          <Label>Mensagem enviada</Label>
          <Textarea rows={4} value={tpl} onChange={(e) => setTpl(e.target.value)} disabled={!on} />
          <p className="text-[11px] text-[#64748B] mt-1">
            Variáveis: <code>{"{nome_cliente}"}</code>, <code>{"{nome_loja}"}</code>,{" "}
            <code>{"{link_nps}"}</code>
          </p>
        </div>
        <Button
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending}
          className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
        >
          {salvar.isPending ? "Salvando..." : "Salvar NPS"}
        </Button>
      </CardContent>
    </Card>
  );
}

function WhatsappQRConnect({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const [qr, setQr] = useState<string | null>(null);
  const [state, setState] = useState<string>("unknown");
  const [loading, setLoading] = useState(false);

  async function checkStatus() {
    try {
      const r = await statusWhatsapp({});
      setState(r.state);
      if (r.state === "open") setQr(null);
    } catch {
      setState("error");
    }
  }

  useEffect(() => {
    checkStatus();
    const id = setInterval(checkStatus, 5000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  async function conectar() {
    setLoading(true);
    try {
      const r = await conectarWhatsappQR({});
      setQr(r.qr);
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Escaneie o QR Code no WhatsApp do celular");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function desconectar() {
    setLoading(true);
    try {
      await desconectarWhatsapp({});
      setQr(null);
      await checkStatus();
      toast.success("WhatsApp desconectado");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const badge =
    state === "open"
      ? { text: "Conectado", cls: "bg-[#22C55E]/10 text-[#15803D]" }
      : state === "connecting"
        ? { text: "Aguardando leitura do QR", cls: "bg-[#F59E0B]/10 text-[#B45309]" }
        : state === "unconfigured"
          ? { text: "Não configurado", cls: "bg-[#F1F5F9] text-[#64748B]" }
          : { text: "Desconectado", cls: "bg-[#EF4444]/10 text-[#B91C1C]" };

  return (
    <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4 text-[#2563EB]" />
          <span className="text-sm font-medium text-[#0F172A]">Conexão WhatsApp</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}
          >
            {badge.text}
          </span>
        </div>
        {state === "open" ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={desconectar}
            disabled={loading}
            className="rounded-xl border-[#E5E7EB]"
          >
            <Power className="h-3 w-3 mr-1" />
            Desconectar
          </Button>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={conectar}
            disabled={loading}
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <QrCode className="h-3 w-3 mr-1" />
            )}
            Gerar QR Code
          </Button>
        )}
      </div>
      {qr && state !== "open" && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <img
            src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code do WhatsApp"
            className="w-56 h-56 border border-[#E5E7EB] rounded-xl bg-white p-2"
          />
          <p className="text-xs text-[#64748B] text-center max-w-xs">
            Abra o WhatsApp no celular → <strong>Aparelhos conectados</strong> →{" "}
            <strong>Conectar aparelho</strong> e aponte a câmera para este QR.
          </p>
        </div>
      )}
      <p className="text-xs text-[#64748B]">
        Salve a URL, API Key e nome da instância acima antes de gerar o QR. A conexão fica ativa até
        você desconectar ou o WhatsApp derrubar a sessão.
      </p>
    </div>
  );
}

type LojaRow = {
  id: string;
  evolution_url: string | null;
  evolution_apikey: string | null;
  evolution_instance: string | null;
  whatsapp_enabled: boolean;
  whatsapp_template_pontos: string;
};

const DEFAULT_TEMPLATE = `Oi {nome_cliente}! 🎉
Você acabou de ganhar {pontos_ganhos} pontos na {nome_loja}!
Seu saldo atual: {pontos_saldo} pontos.
Faltam {pontos_faltantes} pontos para você trocar por: {proximo_premio}.
Confira tudo aqui: {link_portal_cliente}`;

function WhatsappCard({ loja }: { loja: LojaRow }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState(loja.evolution_url ?? "");
  const [apikey, setApikey] = useState(loja.evolution_apikey ?? "");
  const [instance, setInstance] = useState(loja.evolution_instance ?? "");
  const [enabled, setEnabled] = useState(loja.whatsapp_enabled);
  const [template, setTemplate] = useState(loja.whatsapp_template_pontos || DEFAULT_TEMPLATE);
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    setUrl(loja.evolution_url ?? "");
    setApikey(loja.evolution_apikey ?? "");
    setInstance(loja.evolution_instance ?? "");
    setEnabled(loja.whatsapp_enabled);
    setTemplate(loja.whatsapp_template_pontos || DEFAULT_TEMPLATE);
  }, [loja]);

  const salvar = useMutation({
    mutationFn: () =>
      salvarWhatsapp({
        data: {
          evolution_url: url || null,
          evolution_apikey: apikey || null,
          evolution_instance: instance || null,
          whatsapp_enabled: enabled,
          whatsapp_template_pontos: template,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Configurações de WhatsApp salvas");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const testar = useMutation({
    mutationFn: () => enviarWhatsappTeste({ data: { telefone: testPhone } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["integration-logs", loja.id] });
      toast.success(`Mensagem enviada para ${r.numero}`);
    },
    onError: (e) => {
      qc.invalidateQueries({ queryKey: ["integration-logs", loja.id] });
      toast.error((e as Error).message);
    },
  });

  const vars = [
    "{nome_cliente}",
    "{pontos_ganhos}",
    "{nome_loja}",
    "{pontos_saldo}",
    "{pontos_faltantes}",
    "{proximo_premio}",
    "{link_portal_cliente}",
  ];

  return (
    <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-[#0F172A]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white">
            <MessageCircle className="h-4 w-4" />
          </span>
          WhatsApp (Evolution API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
          <div>
            <div className="text-sm font-medium text-[#0F172A]">
              Envio automático de "pontos ganhos"
            </div>
            <div className="text-xs text-[#64748B]">
              Dispara toda vez que o cliente ganha pontos (manual ou via Bling/Olist).
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>URL da instância Evolution</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://evolution.seu-dominio.com"
            />
          </div>
          <div>
            <Label>Nome da instância</Label>
            <Input
              value={instance}
              onChange={(e) => setInstance(e.target.value)}
              placeholder="minha-loja"
            />
          </div>
        </div>
        <div>
          <Label>API Key (header apikey)</Label>
          <Input
            type="password"
            value={apikey}
            onChange={(e) => setApikey(e.target.value)}
            placeholder="••••••••"
          />
          <p className="text-xs text-[#64748B] mt-1">
            A chave fica armazenada com segurança no banco e nunca é exposta ao navegador do cliente
            final.
          </p>
        </div>

        <WhatsappQRConnect storeId={loja.id} />

        <div>
          <Label>Template da mensagem "pontos ganhos"</Label>
          <Textarea
            rows={7}
            value={template}
            onChange={(e) => setTemplate(e.target.value)}
            className="font-mono text-xs"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {vars.map((v) => (
              <button
                key={v}
                type="button"
                className="text-[10px] px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#0F172A] hover:bg-[#E5E7EB] font-mono transition-colors duration-200"
                onClick={() => setTemplate((t) => `${t}${v}`)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => salvar.mutate()}
          disabled={salvar.isPending}
          className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
        >
          {salvar.isPending ? "Salvando..." : "Salvar WhatsApp"}
        </Button>

        <div className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4 space-y-2">
          <Label>Enviar mensagem de teste</Label>
          <div className="flex gap-2">
            <Input
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="11 91234-5678"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={() => testar.mutate()}
              disabled={testar.isPending || !testPhone}
              className="rounded-xl"
            >
              <Send className="h-4 w-4 mr-1" />
              {testar.isPending ? "Enviando..." : "Testar"}
            </Button>
          </div>
          <p className="text-xs text-[#64748B]">
            Prefixo 55 é adicionado automaticamente. Sucessos e erros aparecem em "Últimos 20
            eventos" acima.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

type LojaLite = {
  notif_birthday_enabled: boolean;
  notif_birthday_bonus_points: number;
  notif_birthday_template: string;
  notif_inactivity_enabled: boolean;
  notif_inactivity_days: number;
  notif_inactivity_template: string;
  notif_expiry_enabled: boolean;
  notif_expiry_days: number;
  notif_expiry_warn_days: number;
  notif_expiry_template: string;
};

function NotificacoesCard({ loja }: { loja: LojaLite }) {
  const [bDayOn, setBDayOn] = useState(loja.notif_birthday_enabled);
  const [bDayBonus, setBDayBonus] = useState(String(loja.notif_birthday_bonus_points));
  const [bDayTpl, setBDayTpl] = useState(loja.notif_birthday_template);
  const [inatOn, setInatOn] = useState(loja.notif_inactivity_enabled);
  const [inatDias, setInatDias] = useState(String(loja.notif_inactivity_days));
  const [inatTpl, setInatTpl] = useState(loja.notif_inactivity_template);
  const [expOn, setExpOn] = useState(loja.notif_expiry_enabled);
  const [expDias, setExpDias] = useState(String(loja.notif_expiry_days));
  const [expWarn, setExpWarn] = useState(String(loja.notif_expiry_warn_days));
  const [expTpl, setExpTpl] = useState(loja.notif_expiry_template);

  useEffect(() => {
    setBDayOn(loja.notif_birthday_enabled);
    setBDayBonus(String(loja.notif_birthday_bonus_points));
    setBDayTpl(loja.notif_birthday_template);
    setInatOn(loja.notif_inactivity_enabled);
    setInatDias(String(loja.notif_inactivity_days));
    setInatTpl(loja.notif_inactivity_template);
    setExpOn(loja.notif_expiry_enabled);
    setExpDias(String(loja.notif_expiry_days));
    setExpWarn(String(loja.notif_expiry_warn_days));
    setExpTpl(loja.notif_expiry_template);
  }, [loja]);

  const salvar = useMutation({
    mutationFn: () =>
      salvarNotificacoes({
        data: {
          notif_birthday_enabled: bDayOn,
          notif_birthday_bonus_points: parseInt(bDayBonus) || 0,
          notif_birthday_template: bDayTpl,
          notif_inactivity_enabled: inatOn,
          notif_inactivity_days: parseInt(inatDias) || 60,
          notif_inactivity_template: inatTpl,
          notif_expiry_enabled: expOn,
          notif_expiry_days: parseInt(expDias) || 180,
          notif_expiry_warn_days: parseInt(expWarn) || 7,
          notif_expiry_template: expTpl,
        },
      }),
    onSuccess: () => toast.success("Notificações salvas"),
    onError: (e) => toast.error((e as Error).message),
  });

  const disparar = useMutation({
    mutationFn: () => dispararNotificacoesAgora({}),
    onSuccess: (r: unknown) => {
      const s = r as { aniversario: number; inatividade: number; expiracao: number; erros: number };
      toast.success(
        `Enviadas: 🎂${s.aniversario} · 💤${s.inatividade} · ⏳${s.expiracao} · ⚠️${s.erros} erros`,
      );
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2 text-[#0F172A]">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white">
            <Bell className="h-4 w-4" />
          </span>
          Notificações automáticas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-[#64748B]">
          Cron diário (09:00 Brasília) envia estas mensagens via WhatsApp. Requer WhatsApp ativado e
          Evolution API conectada acima.
        </p>

        {/* Aniversário */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#0F172A]">
              <Cake className="h-4 w-4 text-[#EC4899]" /> Aniversário
            </div>
            <Switch checked={bDayOn} onCheckedChange={setBDayOn} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bônus em pontos</Label>
              <Input
                type="number"
                min={0}
                value={bDayBonus}
                onChange={(e) => setBDayBonus(e.target.value)}
                disabled={!bDayOn}
              />
            </div>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea
              rows={3}
              value={bDayTpl}
              onChange={(e) => setBDayTpl(e.target.value)}
              disabled={!bDayOn}
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              Variáveis: {"{nome}"} {"{loja}"} {"{bonus}"} {"{pontos}"}
            </p>
          </div>
        </div>

        {/* Inatividade */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#0F172A]">
              <Clock className="h-4 w-4 text-[#F59E0B]" /> Cliente sumido
            </div>
            <Switch checked={inatOn} onCheckedChange={setInatOn} />
          </div>
          <div>
            <Label>Enviar após quantos dias sem comprar</Label>
            <Input
              type="number"
              min={1}
              value={inatDias}
              onChange={(e) => setInatDias(e.target.value)}
              disabled={!inatOn}
            />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea
              rows={3}
              value={inatTpl}
              onChange={(e) => setInatTpl(e.target.value)}
              disabled={!inatOn}
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              Variáveis: {"{nome}"} {"{loja}"} {"{pontos}"}
            </p>
          </div>
        </div>

        {/* Expiração */}
        <div className="rounded-xl border border-[#E5E7EB] bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm text-[#0F172A]">
              <TimerReset className="h-4 w-4 text-[#EF4444]" /> Pontos a expirar
            </div>
            <Switch checked={expOn} onCheckedChange={setExpOn} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pontos expiram em (dias)</Label>
              <Input
                type="number"
                min={1}
                value={expDias}
                onChange={(e) => setExpDias(e.target.value)}
                disabled={!expOn}
              />
            </div>
            <div>
              <Label>Avisar quantos dias antes</Label>
              <Input
                type="number"
                min={1}
                value={expWarn}
                onChange={(e) => setExpWarn(e.target.value)}
                disabled={!expOn}
              />
            </div>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea
              rows={3}
              value={expTpl}
              onChange={(e) => setExpTpl(e.target.value)}
              disabled={!expOn}
            />
            <p className="text-[10px] text-[#64748B] mt-1">
              Variáveis: {"{nome}"} {"{loja}"} {"{pontos}"} {"{dias}"}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => salvar.mutate()}
            disabled={salvar.isPending}
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          >
            {salvar.isPending ? "Salvando..." : "Salvar notificações"}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => disparar.mutate()}
            disabled={disparar.isPending}
            className="rounded-xl"
          >
            <Send className="h-4 w-4 mr-1" />
            {disparar.isPending ? "Disparando..." : "Disparar agora (teste)"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
function OlistOAuthCard({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const { data: status } = useQuery({
    queryKey: ["olist-status", storeId],
    queryFn: () => getStatusOlist({ data: { storeId } }),
  });

  const conectar = useMutation({
    mutationFn: () => iniciarConexaoOlist({ data: { storeId } }),
    onSuccess: (r) => {
      if (r?.url) window.location.href = r.url;
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const desconectar = useMutation({
    mutationFn: () => desconectarOlist({ data: { storeId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["olist-status", storeId] });
      toast.success("Desconectado do Olist");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const conectado = status?.status === "connected";

  return (
    <Card className="rounded-2xl border-[#E5E7EB] shadow-sm overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-[#14CBA8] via-[#2563EB] to-[#6D28D9]" />
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between text-[#0F172A]">
          <span>Olist ERP (OAuth2 — API V3)</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
              conectado ? "bg-[#22C55E]/10 text-[#15803D]" : "bg-[#F1F5F9] text-[#64748B]"
            }`}
          >
            {conectado ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {conectado ? "Conectada" : "Não conectada"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-[#64748B]">
          Conexão oficial via OAuth2. As vendas são recebidas por webhook assinado e consultadas em
          tempo real pela API V3 do Olist — sem colar URL nem segredo.
        </p>
        {conectado ? (
          <>
            <div className="text-xs text-[#334155] space-y-1">
              <div>
                <b>Conta Olist:</b> {status?.account_id ?? "—"}
              </div>
              <div>
                <b>Renovado em:</b>{" "}
                {status?.last_refresh_at
                  ? new Date(status.last_refresh_at).toLocaleString("pt-BR")
                  : "—"}
              </div>
              <div>
                <b>Expira em:</b>{" "}
                {status?.expires_at ? new Date(status.expires_at).toLocaleString("pt-BR") : "—"}
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => desconectar.mutate()}
              disabled={desconectar.isPending}
              className="rounded-xl"
            >
              <Unplug className="h-4 w-4 mr-1" />
              {desconectar.isPending ? "Desconectando..." : "Desconectar Olist"}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onClick={() => conectar.mutate()}
            disabled={conectar.isPending}
            className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white"
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            {conectar.isPending ? "Redirecionando..." : "Conectar com Olist"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
