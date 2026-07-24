import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Instagram, ArrowUpRight, Clock, Check, X } from "lucide-react";
import { formatBRL } from "@/lib/qsf-shared";
import type { StorePublic } from "@/lib/queries";
import {
  submitInstagramPost,
  listMyInstagramSubmissions,
} from "@/lib/instagram.functions";
import { type IgSub, formatDateTime } from "./portal-types";

type Loja = StorePublic;

function StatusBadge({ status }: { status: string }) {
  if (status === "pendente")
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-yellow-100 text-yellow-800 px-2 py-0.5 text-[11px]">
        <Clock className="h-3 w-3" /> Em análise
      </span>
    );
  if (status === "aprovado")
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-green-100 text-green-800 px-2 py-0.5 text-[11px]">
        <Check className="h-3 w-3" /> Aprovado
      </span>
    );
  if (status === "rejeitado")
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[11px]">
        <X className="h-3 w-3" /> Rejeitado
      </span>
    );
  if (status === "estornado")
    return (
      <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-red-100 text-red-800 px-2 py-0.5 text-[11px]">
        <X className="h-3 w-3" /> Estornado
      </span>
    );
  return null;
}

function PostSubmissionRow({ s }: { s: IgSub }) {
  const cb = Number(s.cashback_awarded ?? 0);
  return (
    <Card>
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <a
            href={s.post_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline truncate flex-1 min-w-0"
          >
            {s.post_url}
          </a>
          <StatusBadge status={s.status} />
        </div>
        <div className="text-[11px] text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
          <span>Enviado em {formatDateTime(s.created_at)}</span>
          {s.reviewed_at && <span>Revisado em {formatDateTime(s.reviewed_at)}</span>}
          {s.status === "pendente" && s.verify_after && (
            <span>
              Verificação a partir de {new Date(s.verify_after).toLocaleDateString("pt-BR")}
            </span>
          )}
        </div>
        {s.status === "aprovado" && (s.points_awarded > 0 || cb > 0) && (
          <div className="flex items-center gap-2 text-xs font-semibold text-green-700">
            <ArrowUpRight className="h-3 w-3" />
            Creditado:
            {s.points_awarded > 0 && <span>+{s.points_awarded} pts</span>}
            {cb > 0 && <span>+{formatBRL(cb)} cashback</span>}
          </div>
        )}
        {(s.status === "rejeitado" || s.status === "estornado") && s.rejection_reason && (
          <div className="text-xs text-destructive">
            <strong>Motivo:</strong> {s.rejection_reason}
          </div>
        )}
        {s.client_note && (
          <div className="text-[11px] text-muted-foreground italic">"{s.client_note}"</div>
        )}
      </CardContent>
    </Card>
  );
}

export function InstagramCard({ loja }: { loja: Loja }) {
  const qc = useQueryClient();
  const [url, setUrl] = useState("");
  const [nota, setNota] = useState("");
  const enviar = useMutation({
    mutationFn: () =>
      submitInstagramPost({
        data: { store_id: loja.id, post_url: url.trim(), client_note: nota.trim() || null },
      }),
    onSuccess: () => {
      toast.success("Post enviado! A loja vai revisar em breve.");
      setUrl("");
      setNota("");
      qc.invalidateQueries({ queryKey: ["my-ig-subs", loja.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const pts = loja.instagram_points_per_post ?? 50;
  const handle = loja.instagram_handle;
  const instrucoesDefault = `1. Poste uma foto ou reel usando a loja\n2. Marque @${handle} no post\n3. Mantenha o post no ar pelo menos ${loja.instagram_min_days_live ?? 7} dias\n4. Seu perfil precisa estar público`;

  return (
    <section>
      <Card className="overflow-hidden">
        <div
          className="p-5 text-white"
          style={{ background: "linear-gradient(135deg, #833AB4 0%, #E1306C 50%, #F77737 100%)" }}
        >
          <div className="flex items-center gap-2 text-sm opacity-95">
            <Instagram className="h-4 w-4" /> Poste no Instagram e ganhe pontos
          </div>
          <div className="text-3xl font-bold mt-2">+{pts} pts por post</div>
          <div className="text-sm opacity-95 mt-1">
            Marque <strong>@{handle}</strong> no post e envie o link aqui.
          </div>
        </div>
        <CardContent className="pt-4 space-y-3">
          <details className="text-sm">
            <summary className="cursor-pointer font-medium">Como funciona</summary>
            <pre className="whitespace-pre-wrap text-xs text-muted-foreground mt-2 font-sans">
              {loja.instagram_instructions || instrucoesDefault}
            </pre>
          </details>
          <div>
            <Label className="text-xs">Link do seu post no Instagram</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/p/XXXXXXX/"
            />
          </div>
          <div>
            <Label className="text-xs">Observação (opcional)</Label>
            <Input
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Alguma info extra pra loja"
            />
          </div>
          <Button
            onClick={() => enviar.mutate()}
            disabled={!url.trim() || enviar.isPending}
            className="text-white w-full"
            style={{ backgroundColor: "var(--brand-primary)" }}
          >
            {enviar.isPending ? "Enviando..." : "Enviar para aprovação"}
          </Button>
        </CardContent>
      </Card>
    </section>
  );
}

export function MeusPostsInstagram({ loja }: { loja: Loja }) {
  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["my-ig-subs", loja.id],
    queryFn: () => listMyInstagramSubmissions({ data: { store_id: loja.id } }),
  });

  const pendentes = subs.filter((s) => s.status === "pendente");
  const aprovados = subs.filter((s) => s.status === "aprovado");
  const rejeitados = subs.filter((s) => s.status === "rejeitado" || s.status === "estornado");

  const totalPts = aprovados.reduce((acc, s) => acc + (s.points_awarded ?? 0), 0);
  const totalCb = aprovados.reduce((acc, s) => acc + Number(s.cashback_awarded ?? 0), 0);

  const renderList = (arr: typeof subs) => {
    if (arr.length === 0) {
      return (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Nenhum post por aqui ainda.
          </CardContent>
        </Card>
      );
    }
    return (
      <div className="space-y-2">
        {arr.map((s) => (
          <PostSubmissionRow key={s.id} s={s} />
        ))}
      </div>
    );
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <Instagram className="h-4 w-4 text-indigo-400" />
        <h2 className="font-semibold text-slate-100">Meus posts no Instagram</h2>
        <span className="text-xs text-slate-500">acompanhe o status</span>
      </div>

      {aprovados.length > 0 && (
        <Card className="mb-3">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-xs text-muted-foreground">Já creditado no Instagram</div>
              <div className="text-lg font-bold">
                {totalPts > 0 && <span className="text-green-700">+{totalPts} pts</span>}
                {totalPts > 0 && totalCb > 0 && <span className="text-muted-foreground"> · </span>}
                {totalCb > 0 && (
                  <span className="text-green-700">+{formatBRL(totalCb)} cashback</span>
                )}
              </div>
            </div>
            <div className="text-xs text-right text-muted-foreground">
              <div>{aprovados.length} post(s)</div>
              <div>aprovado(s)</div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="todos">
        <TabsList className="w-full">
          <TabsTrigger value="todos" className="flex-1">
            Todos ({subs.length})
          </TabsTrigger>
          <TabsTrigger value="pendentes" className="flex-1">
            Em análise ({pendentes.length})
          </TabsTrigger>
          <TabsTrigger value="aprovados" className="flex-1">
            Aprovados ({aprovados.length})
          </TabsTrigger>
          <TabsTrigger value="rejeitados" className="flex-1">
            Rejeitados ({rejeitados.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="todos" className="mt-3">
          {isLoading ? (
            <div className="text-center text-sm text-muted-foreground p-4">Carregando...</div>
          ) : (
            renderList(subs)
          )}
        </TabsContent>
        <TabsContent value="pendentes" className="mt-3">
          {renderList(pendentes)}
        </TabsContent>
        <TabsContent value="aprovados" className="mt-3">
          {renderList(aprovados)}
        </TabsContent>
        <TabsContent value="rejeitados" className="mt-3">
          {renderList(rejeitados)}
        </TabsContent>
      </Tabs>
    </section>
  );
}