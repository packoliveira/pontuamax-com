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
import { BrandPreview } from "@/components/brand-preview";
import { toast } from "sonner";
import { Copy, RefreshCw, Send, CheckCircle2, XCircle, MessageCircle, Upload, QrCode, Loader2, Power, Bell, Cake, Clock, TimerReset, Gift, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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
  const [cor1, setCor1] = useState("#7c3aed");
  const [cor2, setCor2] = useState("#f97316");
  const [modalidade, setModalidade] = useState<Modalidade>("ambos");
  const [regraP, setRegraP] = useState("1");
  const [pctC, setPctC] = useState("5");

  useEffect(() => {
    if (loja) {
      setNome(loja.nome_fantasia);
      setTelefone(loja.telefone ?? "");
      setLogo(loja.logo_url ?? "");
      setBanner(loja.banner_url ?? "");
      setCor1(loja.brand_primary);
      setCor2(loja.brand_secondary);
      setModalidade(loja.modalidade as Modalidade);
      setRegraP(String(loja.regra_pontos));
      setPctC(String(loja.percentual_cashback));
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
          brand_primary: cor1,
          brand_secondary: cor2,
          modalidade,
          regra_pontos: parseFloat(regraP) || 1,
          percentual_cashback: parseFloat(pctC) || 0,
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("Configurações salvas");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const inclP = modalidade !== "cashback";
  const inclC = modalidade !== "pontos";

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Personalize a página do cliente e as regras de recompensa</p>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="text-base">Dados da loja</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>Nome fantasia</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div><Label>Telefone</Label><Input value={telefone} onChange={(e) => setTelefone(e.target.value)} /></div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Identidade visual</CardTitle></CardHeader><CardContent className="space-y-4">
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
              label="Banner da página do cliente"
              hint="Desktop: 1920 × 480 px · Mobile: 1080 × 720 px. JPG ou PNG até 3 MB."
              value={banner}
              onChange={setBanner}
              aspect="banner"
            />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Cor primária</Label><div className="flex gap-2"><Input type="color" value={cor1} onChange={(e) => setCor1(e.target.value)} className="w-16 h-10 p-1" /><Input value={cor1} onChange={(e) => setCor1(e.target.value)} /></div></div>
              <div><Label>Cor secundária</Label><div className="flex gap-2"><Input type="color" value={cor2} onChange={(e) => setCor2(e.target.value)} className="w-16 h-10 p-1" /><Input value={cor2} onChange={(e) => setCor2(e.target.value)} /></div></div>
            </div>
          </CardContent></Card>

          <Card><CardHeader><CardTitle className="text-base">Modalidade de recompensa</CardTitle></CardHeader><CardContent className="space-y-4">
            <RadioGroup value={modalidade} onValueChange={(v) => setModalidade(v as Modalidade)}>
              {(["pontos", "cashback", "ambos"] as const).map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <RadioGroupItem value={m} id={m} />
                  <Label htmlFor={m} className="capitalize">{m}</Label>
                </div>
              ))}
            </RadioGroup>
            {inclP && (
              <div><Label>Pontos por R$1 gasto</Label><Input type="number" step="0.1" value={regraP} onChange={(e) => setRegraP(e.target.value)} /></div>
            )}
            {inclC && (
              <div><Label>% de cashback</Label><Input type="number" step="0.1" value={pctC} onChange={(e) => setPctC(e.target.value)} /></div>
            )}
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              Níveis Bronze (0-100), Prata (101-300), Ouro (301+) são aplicados automaticamente com base nos pontos.
            </div>
          </CardContent></Card>

          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending} size="lg">
            {salvar.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>

          <IntegracoesCard storeId={loja.id} slug={loja.slug} secret={loja.webhook_secret} lastAt={loja.webhook_last_at} />
          <WhatsappCard loja={loja} />
          <NotificacoesCard loja={loja} />
          <IndicacaoCard loja={loja} />
          <NpsCard loja={loja} />
        </div>
        <div className="lg:sticky lg:top-8 lg:self-start">
          <div className="text-sm font-semibold mb-2 text-muted-foreground">Prévia ao vivo</div>
          <BrandPreview nome={nome} logo={logo} cor1={cor1} cor2={cor2} modalidade={modalidade} />
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
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const urlBling = `${origin}/api/public/webhook/bling`;
  const urlOlist = `${origin}/api/public/webhook/olist`;

  const conectada =
    !!lastAt && Date.now() - new Date(lastAt).getTime() < 30 * 24 * 60 * 60 * 1000;

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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          <span>Integrações (Bling / Olist)</span>
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              conectada ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
            }`}
          >
            {conectada ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
            {conectada ? "Conectada" : "Nunca conectada"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Configure a URL abaixo no painel do Bling ou Olist. Cada venda enviada será lançada automaticamente
          no QSF Club, creditando pontos/cashback para o cliente sem precisar digitar em <em>Lançar Venda</em>.
        </p>

        <div>
          <Label>URL do webhook (Bling)</Label>
          <div className="flex gap-2">
            <Input readOnly value={urlBling} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(urlBling, "URL")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div>
          <Label>URL do webhook (Olist)</Label>
          <div className="flex gap-2">
            <Input readOnly value={urlOlist} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(urlOlist, "URL")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label>Identificador da loja (header x-qsf-store)</Label>
          <div className="flex gap-2">
            <Input readOnly value={slug} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(slug, "Slug")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <Label>Chave secreta (header x-qsf-secret)</Label>
          <div className="flex gap-2">
            <Input readOnly value={secret} className="font-mono text-xs" />
            <Button type="button" variant="outline" size="icon" onClick={() => copy(secret, "Segredo")}>
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (confirm("Gerar novo segredo? A chave atual deixará de funcionar imediatamente.")) rotate.mutate();
              }}
              disabled={rotate.isPending}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Gerar novo
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Envie sempre nos headers <code>x-qsf-store</code> e <code>x-qsf-secret</code>. Payload esperado:
            <code className="ml-1">{`{ id_venda_externa, valor, telefone_cliente, nome_cliente? }`}</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="secondary" onClick={() => test.mutate()} disabled={test.isPending}>
            <Send className="h-4 w-4 mr-1" />
            {test.isPending ? "Enviando..." : "Testar integração"}
          </Button>
          {lastAt && (
            <span className="text-xs text-muted-foreground">
              Último evento: {new Date(lastAt).toLocaleString("pt-BR")}
            </span>
          )}
        </div>

        <div>
          <div className="text-sm font-semibold mb-2">Últimos 20 eventos</div>
          {!logs || logs.length === 0 ? (
            <div className="text-xs text-muted-foreground rounded-md border border-dashed p-4">
              Nenhum evento recebido ainda.
            </div>
          ) : (
            <div className="rounded-md border divide-y">
              {logs.map((log) => (
                <div key={log.id} className="p-2 text-xs flex items-start gap-2">
                  <span
                    className={`mt-0.5 inline-block h-2 w-2 rounded-full ${
                      log.status === "sucesso" ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium uppercase">{log.origem}</span>
                      <span className="text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("pt-BR")}
                      </span>
                    </div>
                    {log.mensagem_erro && <div className="text-red-600">{log.mensagem_erro}</div>}
                    <details className="mt-1">
                      <summary className="cursor-pointer text-muted-foreground">Payload</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all bg-muted/50 p-2 rounded">
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

function IndicacaoCard({ loja }: { loja: { id: string; slug: string; indicacao_ativa: boolean; bonus_indicador: number; bonus_indicado: number } }) {
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
  const link = typeof window !== "undefined" ? `${window.location.origin}/${loja.slug}?indicou=TELEFONE` : "";
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Gift className="h-4 w-4" /> Indicação amigo → amigo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Cada cliente ganha um link único (com o telefone dele) para compartilhar. Quando o amigo se cadastrar por esse link e fizer a 1ª compra, os dois recebem pontos.
        </p>
        <div className="flex items-center gap-2">
          <Switch checked={ativa} onCheckedChange={setAtiva} />
          <span className="text-sm">Ativar programa de indicação</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Bônus para o indicador (pts)</Label>
            <Input type="number" min={0} value={bIndicador} onChange={(e) => setBIndicador(e.target.value)} disabled={!ativa} />
          </div>
          <div>
            <Label>Bônus para o indicado (pts)</Label>
            <Input type="number" min={0} value={bIndicado} onChange={(e) => setBIndicado(e.target.value)} disabled={!ativa} />
          </div>
        </div>
        <div className="rounded-md border p-3 text-xs text-muted-foreground break-all">
          Formato do link: <code>{link}</code>
        </div>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar indicação"}
        </Button>
      </CardContent>
    </Card>
  );
}

function NpsCard({ loja }: { loja: { id: string; nps_enabled: boolean; nps_ask_comment: boolean; nps_template: string } }) {
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
    mutationFn: () => atualizarLoja({ data: { nps_enabled: on, nps_ask_comment: askC, nps_template: tpl } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-store"] });
      toast.success("NPS salvo");
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4" /> Pesquisa de satisfação (NPS)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Após cada venda lançada, o cliente recebe um link no WhatsApp para dar uma nota de 0 a 10. Requer WhatsApp ativo.
        </p>
        <div className="flex items-center gap-2">
          <Switch checked={on} onCheckedChange={setOn} />
          <span className="text-sm">Ativar pesquisa NPS pós-venda</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={askC} onCheckedChange={setAskC} disabled={!on} />
          <span className="text-sm">Pedir comentário opcional</span>
        </div>
        <div>
          <Label>Mensagem enviada</Label>
          <Textarea rows={4} value={tpl} onChange={(e) => setTpl(e.target.value)} disabled={!on} />
          <p className="text-[11px] text-muted-foreground mt-1">
            Variáveis: <code>{"{nome_cliente}"}</code>, <code>{"{nome_loja}"}</code>, <code>{"{link_nps}"}</code>
          </p>
        </div>
        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar NPS"}
        </Button>
      </CardContent>
    </Card>
  );
}

function AssetUploader({
  storeId,
  kind,
  label,
  hint,
  value,
  onChange,
  aspect,
}: {
  storeId: string;
  kind: "logo" | "banner";
  label: string;
  hint: string;
  value: string;
  onChange: (url: string) => void;
  aspect?: "banner";
}) {
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo acima de 5 MB");
      return;
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
      const signed = await supabase.storage.from("store-assets").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data?.signedUrl) throw signed.error ?? new Error("Falha ao gerar URL");
      onChange(signed.data.signedUrl);
      toast.success("Imagem enviada — não esqueça de salvar as alterações.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  const previewClass = aspect === "banner" ? "w-full h-24 object-cover" : "h-20 w-20 object-contain bg-muted";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt={label} className={`${previewClass} rounded-md border`} />
        ) : (
          <div className={`${previewClass} rounded-md border border-dashed flex items-center justify-center text-xs text-muted-foreground`}>
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
                {uploading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
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
      ? { text: "Conectado", cls: "bg-emerald-100 text-emerald-700" }
      : state === "connecting"
        ? { text: "Aguardando leitura do QR", cls: "bg-amber-100 text-amber-700" }
        : state === "unconfigured"
          ? { text: "Não configurado", cls: "bg-muted text-muted-foreground" }
          : { text: "Desconectado", cls: "bg-red-100 text-red-700" };

  return (
    <div className="rounded-md border p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="h-4 w-4" />
          <span className="text-sm font-medium">Conexão WhatsApp</span>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
            {badge.text}
          </span>
        </div>
        {state === "open" ? (
          <Button type="button" variant="outline" size="sm" onClick={desconectar} disabled={loading}>
            <Power className="h-3 w-3 mr-1" />
            Desconectar
          </Button>
        ) : (
          <Button type="button" size="sm" onClick={conectar} disabled={loading}>
            {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <QrCode className="h-3 w-3 mr-1" />}
            Gerar QR Code
          </Button>
        )}
      </div>
      {qr && state !== "open" && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <img
            src={qr.startsWith("data:") ? qr : `data:image/png;base64,${qr}`}
            alt="QR Code do WhatsApp"
            className="w-56 h-56 border rounded-md"
          />
          <p className="text-xs text-muted-foreground text-center max-w-xs">
            Abra o WhatsApp no celular → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong> e aponte a câmera para este QR.
          </p>
        </div>
      )}
      <p className="text-xs text-muted-foreground">
        Salve a URL, API Key e nome da instância acima antes de gerar o QR. A conexão fica ativa até você desconectar ou o WhatsApp derrubar a sessão.
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          WhatsApp (Evolution API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <div className="text-sm font-medium">Envio automático de "pontos ganhos"</div>
            <div className="text-xs text-muted-foreground">
              Dispara toda vez que o cliente ganha pontos (manual ou via Bling/Olist).
            </div>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>URL da instância Evolution</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://evolution.seu-dominio.com" />
          </div>
          <div>
            <Label>Nome da instância</Label>
            <Input value={instance} onChange={(e) => setInstance(e.target.value)} placeholder="minha-loja" />
          </div>
        </div>
        <div>
          <Label>API Key (header apikey)</Label>
          <Input type="password" value={apikey} onChange={(e) => setApikey(e.target.value)} placeholder="••••••••" />
          <p className="text-xs text-muted-foreground mt-1">
            A chave fica armazenada com segurança no banco e nunca é exposta ao navegador do cliente final.
          </p>
        </div>

        <WhatsappQRConnect storeId={loja.id} />

        <div>
          <Label>Template da mensagem "pontos ganhos"</Label>
          <Textarea rows={7} value={template} onChange={(e) => setTemplate(e.target.value)} className="font-mono text-xs" />
          <div className="mt-2 flex flex-wrap gap-1">
            {vars.map((v) => (
              <button
                key={v}
                type="button"
                className="text-[10px] px-1.5 py-0.5 rounded bg-muted hover:bg-muted-foreground/20 font-mono"
                onClick={() => setTemplate((t) => `${t}${v}`)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
          {salvar.isPending ? "Salvando..." : "Salvar WhatsApp"}
        </Button>

        <div className="rounded-md border p-3 space-y-2">
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
            >
              <Send className="h-4 w-4 mr-1" />
              {testar.isPending ? "Enviando..." : "Testar"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Prefixo 55 é adicionado automaticamente. Sucessos e erros aparecem em "Últimos 20 eventos" acima.
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
      toast.success(`Enviadas: 🎂${s.aniversario} · 💤${s.inatividade} · ⏳${s.expiracao} · ⚠️${s.erros} erros`);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Notificações automáticas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-muted-foreground">
          Cron diário (09:00 Brasília) envia estas mensagens via WhatsApp. Requer WhatsApp ativado e Evolution API conectada acima.
        </p>

        {/* Aniversário */}
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm"><Cake className="h-4 w-4 text-pink-500" /> Aniversário</div>
            <Switch checked={bDayOn} onCheckedChange={setBDayOn} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Bônus em pontos</Label>
              <Input type="number" min={0} value={bDayBonus} onChange={(e) => setBDayBonus(e.target.value)} disabled={!bDayOn} />
            </div>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={3} value={bDayTpl} onChange={(e) => setBDayTpl(e.target.value)} disabled={!bDayOn} />
            <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {"{nome}"} {"{loja}"} {"{bonus}"} {"{pontos}"}</p>
          </div>
        </div>

        {/* Inatividade */}
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm"><Clock className="h-4 w-4 text-amber-500" /> Cliente sumido</div>
            <Switch checked={inatOn} onCheckedChange={setInatOn} />
          </div>
          <div>
            <Label>Enviar após quantos dias sem comprar</Label>
            <Input type="number" min={1} value={inatDias} onChange={(e) => setInatDias(e.target.value)} disabled={!inatOn} />
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={3} value={inatTpl} onChange={(e) => setInatTpl(e.target.value)} disabled={!inatOn} />
            <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {"{nome}"} {"{loja}"} {"{pontos}"}</p>
          </div>
        </div>

        {/* Expiração */}
        <div className="rounded-md border p-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-sm"><TimerReset className="h-4 w-4 text-red-500" /> Pontos a expirar</div>
            <Switch checked={expOn} onCheckedChange={setExpOn} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pontos expiram em (dias)</Label>
              <Input type="number" min={1} value={expDias} onChange={(e) => setExpDias(e.target.value)} disabled={!expOn} />
            </div>
            <div>
              <Label>Avisar quantos dias antes</Label>
              <Input type="number" min={1} value={expWarn} onChange={(e) => setExpWarn(e.target.value)} disabled={!expOn} />
            </div>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={3} value={expTpl} onChange={(e) => setExpTpl(e.target.value)} disabled={!expOn} />
            <p className="text-[10px] text-muted-foreground mt-1">Variáveis: {"{nome}"} {"{loja}"} {"{pontos}"} {"{dias}"}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => salvar.mutate()} disabled={salvar.isPending}>
            {salvar.isPending ? "Salvando..." : "Salvar notificações"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => disparar.mutate()} disabled={disparar.isPending}>
            <Send className="h-4 w-4 mr-1" />
            {disparar.isPending ? "Disparando..." : "Disparar agora (teste)"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}