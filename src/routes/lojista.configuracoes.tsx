import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, integrationLogsQuery } from "@/lib/queries";
import { atualizarLoja, rotacionarWebhookSecret, testarWebhook, salvarWhatsapp, enviarWhatsappTeste } from "@/lib/qsf.functions";
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
import { Copy, RefreshCw, Send, CheckCircle2, XCircle, MessageCircle } from "lucide-react";

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

          <Card><CardHeader><CardTitle className="text-base">Identidade visual</CardTitle></CardHeader><CardContent className="space-y-3">
            <div><Label>URL do logo</Label><Input value={logo} onChange={(e) => setLogo(e.target.value)} placeholder="https://..." /></div>
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