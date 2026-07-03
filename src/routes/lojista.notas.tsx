import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { myStoreQuery, storeFiscalNotesQuery } from "@/lib/queries";
import { aprovarNotaFiscal, rejeitarNotaFiscal } from "@/lib/qsf.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileText, Check, X, Eye } from "lucide-react";

export const Route = createFileRoute("/lojista/notas")({
  ssr: false,
  component: Page,
});

function Page() {
  const { data: loja } = useQuery(myStoreQuery());
  const { data: notas = [] } = useQuery(storeFiscalNotesQuery(loja?.id));
  const qc = useQueryClient();
  const [valores, setValores] = useState<Record<string, string>>({});

  const openImage = async (path: string) => {
    const { data } = await supabase.storage.from("notas").createSignedUrl(path, 60);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const aprovar = useMutation({
    mutationFn: (v: { id: string; valor_final: number }) => aprovarNotaFiscal({ data: v }),
    onSuccess: () => { toast.success("Aprovada e pontos creditados!"); qc.invalidateQueries({ queryKey: ["fiscal-notes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
  const rejeitar = useMutation({
    mutationFn: (v: { id: string; motivo: string }) => rejeitarNotaFiscal({ data: v }),
    onSuccess: () => { toast.success("Rejeitada"); qc.invalidateQueries({ queryKey: ["fiscal-notes"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pendentes = notas.filter((n) => n.status === "pendente");
  const historico = notas.filter((n) => n.status !== "pendente");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Notas fiscais</h1>
      </div>
      <p className="text-sm text-muted-foreground">Clientes enviam foto da nota; a IA extrai valor e CNPJ. Você aprova ou rejeita.</p>

      <Card>
        <CardHeader><CardTitle>Pendentes ({pendentes.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {pendentes.length === 0 ? <p className="text-sm text-muted-foreground">Nada por aqui.</p> : pendentes.map((n) => {
            // biome-ignore lint/suspicious/noExplicitAny: join
            const nome = (n as any).profiles?.full_name ?? "Cliente";
            const valorFinal = valores[n.id] ?? (n.valor?.toString() ?? "");
            return (
              <div key={n.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-medium">{nome}</div>
                    <div className="text-xs text-muted-foreground">
                      OCR: R$ {n.valor?.toFixed(2) ?? "?"} · CNPJ {n.cnpj_extraido ?? "?"}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => openImage(n.image_path)}><Eye className="h-3 w-3 mr-1" />Ver</Button>
                </div>
                <div className="flex items-end gap-2 flex-wrap">
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xs text-muted-foreground">Valor final (R$)</label>
                    <Input type="number" step="0.01" value={valorFinal}
                      onChange={(e) => setValores((s) => ({ ...s, [n.id]: e.target.value }))} />
                  </div>
                  <Button size="sm" disabled={aprovar.isPending || !valorFinal}
                    onClick={() => aprovar.mutate({ id: n.id, valor_final: Number(valorFinal) })}>
                    <Check className="h-3 w-3 mr-1" />Aprovar
                  </Button>
                  <Button size="sm" variant="destructive" disabled={rejeitar.isPending}
                    onClick={() => rejeitar.mutate({ id: n.id, motivo: "Rejeitada pelo lojista" })}>
                    <X className="h-3 w-3 mr-1" />Rejeitar
                  </Button>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Histórico</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {historico.length === 0 ? <p className="text-sm text-muted-foreground">Vazio.</p> : historico.slice(0, 50).map((n) => (
            <div key={n.id} className="flex items-center justify-between text-sm border rounded-md p-2">
              <div>
                {/* biome-ignore lint/suspicious/noExplicitAny: join */}
                <span>{(n as any).profiles?.full_name ?? "Cliente"}</span>
                <span className="text-muted-foreground"> · R$ {n.valor?.toFixed(2) ?? "?"}</span>
              </div>
              <Badge variant={n.status === "aprovada" ? "default" : "destructive"}>{n.status}{n.pontos_creditados ? ` · +${n.pontos_creditados} pts` : ""}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}