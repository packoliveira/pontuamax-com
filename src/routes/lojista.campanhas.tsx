import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { myStoreQuery } from "@/lib/queries";
import { criarCampanha, enviarCampanha, excluirCampanha, previewDestinatarios } from "@/lib/qsf.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Send, Trash2, Users, Loader2, Clock } from "lucide-react";

export const Route = createFileRoute("/lojista/campanhas")({
  ssr: false,
  component: CampanhasPage,
});

const SEG_OPTIONS = [
  { v: "todos", label: "Todos os clientes" },
  { v: "bronze", label: "Nível Bronze" },
  { v: "prata", label: "Nível Prata" },
  { v: "ouro", label: "Nível Ouro" },
  { v: "inativos_30", label: "Inativos há 30+ dias" },
  { v: "inativos_60", label: "Inativos há 60+ dias" },
  { v: "inativos_90", label: "Inativos há 90+ dias" },
  { v: "aniversariantes", label: "Aniversariantes do mês" },
] as const;

const TEMPLATE_PADRAO =
  "Olá {nome}! Você tem {pontos} pontos acumulados na {loja}. Aproveite para trocar por prêmios! 🎁";

function CampanhasPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const [nome, setNome] = useState("");
  const [mensagem, setMensagem] = useState(TEMPLATE_PADRAO);
  const [segmento, setSegmento] = useState<(typeof SEG_OPTIONS)[number]["v"]>("todos");
  const [agendar, setAgendar] = useState(false);
  const [agendaLocal, setAgendaLocal] = useState<string>(""); // datetime-local value (fuso do navegador)
  const [preview, setPreview] = useState<{ total: number; amostra: Array<{ nome: string | null; telefone: string | null }> } | null>(null);

  const listQuery = useQuery({
    queryKey: ["campaigns", loja?.id],
    enabled: !!loja?.id,
    queryFn: async () => {
      if (!loja?.id) return [];
      const { data, error } = await supabase.from("campaigns").select("*").eq("store_id", loja.id).order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const previewFn = useServerFn(previewDestinatarios);
  const criarFn = useServerFn(criarCampanha);
  const enviarFn = useServerFn(enviarCampanha);
  const excluirFn = useServerFn(excluirCampanha);

  const previewMut = useMutation({
    mutationFn: async () => previewFn({ data: { segmento } }),
    onSuccess: (r) => setPreview(r),
    onError: (e) => toast.error((e as Error).message),
  });

  const criarMut = useMutation({
    mutationFn: async () => {
      let agendada_para: string | null = null;
      if (agendar && agendaLocal) {
        const d = new Date(agendaLocal);
        if (isNaN(d.getTime())) throw new Error("Data/hora inválida.");
        if (d.getTime() <= Date.now() + 60_000) throw new Error("A data precisa ser pelo menos 1 minuto no futuro.");
        agendada_para = d.toISOString();
      }
      return criarFn({ data: { nome, mensagem, segmento, agendada_para } });
    },
    onSuccess: (r) => {
      toast.success(
        r.agendada
          ? `Campanha agendada — ${r.total} destinatários`
          : `Campanha criada — ${r.total} destinatários`,
      );
      setNome("");
      setMensagem(TEMPLATE_PADRAO);
      setAgendar(false);
      setAgendaLocal("");
      setPreview(null);
      qc.invalidateQueries({ queryKey: ["campaigns", loja?.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const enviarMut = useMutation({
    mutationFn: async (id: string) => enviarFn({ data: { campaign_id: id } }),
    onSuccess: (r) => {
      toast.success(`Envio concluído: ${r.enviados} enviadas, ${r.falhas} falhas`);
      qc.invalidateQueries({ queryKey: ["campaigns", loja?.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const excluirMut = useMutation({
    mutationFn: async (id: string) => excluirFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Campanha excluída");
      qc.invalidateQueries({ queryKey: ["campaigns", loja?.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-semibold">Campanhas WhatsApp</h1>
        <p className="text-sm text-muted-foreground">Envie mensagens em massa segmentadas para seus clientes.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova campanha</CardTitle>
          <CardDescription>
            Variáveis disponíveis: <code>{"{nome}"}</code>, <code>{"{pontos}"}</code>, <code>{"{nivel}"}</code>, <code>{"{loja}"}</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Nome interno</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Promo dia dos pais" />
            </div>
            <div>
              <Label>Segmentação</Label>
              <Select value={segmento} onValueChange={(v) => { setSegmento(v as typeof segmento); setPreview(null); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEG_OPTIONS.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Mensagem</Label>
            <Textarea rows={5} value={mensagem} onChange={(e) => setMensagem(e.target.value)} />
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={agendar}
                onChange={(e) => setAgendar(e.target.checked)}
                className="h-4 w-4"
              />
              <Clock className="h-4 w-4" /> Agendar envio para depois
            </label>
            {agendar && (
              <div className="space-y-1">
                <Input
                  type="datetime-local"
                  value={agendaLocal}
                  onChange={(e) => setAgendaLocal(e.target.value)}
                  min={new Date(Date.now() + 5 * 60_000).toISOString().slice(0, 16)}
                />
                <p className="text-xs text-muted-foreground">
                  Envia automaticamente nesse horário (fuso do seu navegador).
                </p>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <Button variant="outline" onClick={() => previewMut.mutate()} disabled={previewMut.isPending}>
              <Users className="h-4 w-4" /> Ver destinatários
            </Button>
            <Button onClick={() => criarMut.mutate()} disabled={criarMut.isPending || !nome || !mensagem}>
              {agendar ? "Agendar campanha" : "Criar campanha"}
            </Button>
            {preview && (
              <span className="text-sm text-muted-foreground">
                {preview.total} cliente(s) receberão. {preview.amostra.length > 0 && `Ex: ${preview.amostra.map((a) => a.nome ?? a.telefone).join(", ")}`}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Histórico</h2>
        {(listQuery.data ?? []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma campanha criada ainda.</p>
        )}
        {(listQuery.data ?? []).map((c) => (
          <Card key={c.id}>
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{c.nome}</span>
                  <Badge
                    variant={
                      c.status === "concluida"
                        ? "default"
                        : c.status === "enviando"
                          ? "secondary"
                          : c.status === "falhou"
                            ? "destructive"
                            : "outline"
                    }
                  >
                    {c.status}
                  </Badge>
                  <Badge variant="outline">{SEG_OPTIONS.find((s) => s.v === c.segmento)?.label ?? c.segmento}</Badge>
                  {c.status === "agendada" && c.agendada_para && (
                    <Badge variant="outline" className="text-blue-700 border-blue-300 gap-1">
                      <Clock className="h-3 w-3" /> {new Date(c.agendada_para).toLocaleString("pt-BR")}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{c.mensagem}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {c.total_destinatarios} destinatários · {c.total_enviados} enviados · {c.total_falhas} falhas
                </p>
              </div>
              <div className="flex gap-2">
                {(c.status === "rascunho" || c.status === "agendada" || c.status === "falhou") && (
                  <Button size="sm" onClick={() => enviarMut.mutate(c.id)} disabled={enviarMut.isPending}>
                    {enviarMut.isPending && enviarMut.variables === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {c.status === "agendada" ? "Enviar agora" : "Enviar"}
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => {
                  if (confirm("Excluir esta campanha?")) excluirMut.mutate(c.id);
                }}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}