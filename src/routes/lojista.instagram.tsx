import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Instagram, Check, X, RotateCcw, ExternalLink } from "lucide-react";
import { myStoreQuery } from "@/lib/queries";
import {
  listStoreInstagramSubmissions,
  approveInstagramSubmission,
  rejectInstagramSubmission,
  revokeInstagramSubmission,
} from "@/lib/instagram.functions";

export const Route = createFileRoute("/lojista/instagram")({
  ssr: false,
  component: InstagramPage,
});

type Status = "pendente" | "aprovado" | "rejeitado" | "estornado";
type Sub = {
  id: string;
  post_url: string;
  status: Status;
  points_awarded: number;
  rejection_reason: string | null;
  verify_after: string | null;
  reviewed_at: string | null;
  created_at: string;
  client_user_id: string;
  profiles: { full_name: string | null; phone: string | null } | null;
};

function InstagramPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const [tab, setTab] = useState<Status>("pendente");

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["ig-subs", tab],
    queryFn: async () => (await listStoreInstagramSubmissions({ data: { status: tab } })) as Sub[],
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["ig-subs"] });
  };

  const [rejectFor, setRejectFor] = useState<Sub | null>(null);
  const [revokeFor, setRevokeFor] = useState<Sub | null>(null);
  const [reason, setReason] = useState("");
  const [pointsOverride, setPointsOverride] = useState<Record<string, string>>({});

  const approve = useMutation({
    mutationFn: (s: Sub) => {
      const raw = pointsOverride[s.id];
      const n = raw ? parseInt(raw, 10) : undefined;
      return approveInstagramSubmission({
        data: { id: s.id, ...(n && n > 0 ? { pontos_override: n } : {}) },
      });
    },
    onSuccess: (r) => {
      toast.success(`Aprovado (+${r.pontos} pts)`);
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const reject = useMutation({
    mutationFn: () => rejectInstagramSubmission({ data: { id: rejectFor!.id, reason } }),
    onSuccess: () => {
      toast.success("Submissão rejeitada");
      setRejectFor(null);
      setReason("");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const revoke = useMutation({
    mutationFn: () => revokeInstagramSubmission({ data: { id: revokeFor!.id, reason } }),
    onSuccess: () => {
      toast.success("Pontos estornados");
      setRevokeFor(null);
      setReason("");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const active = loja.instagram_program_active;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Instagram className="h-6 w-6" /> Posts do Instagram
          </h1>
          <p className="text-sm text-muted-foreground">
            Aprove os posts em que seus clientes marcam{" "}
            <span className="font-semibold">@{loja.instagram_handle || "sua_loja"}</span> e credite
            pontos.
          </p>
        </div>
      </div>

      {!active && (
        <Card className="border-dashed">
          <CardContent className="pt-6 text-sm">
            <p>
              O programa está <strong>desativado</strong>. Ative em{" "}
              <a href="/lojista/configuracoes" className="underline">
                Configurações
              </a>{" "}
              para começar a receber submissões.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs value={tab} onValueChange={(v) => setTab(v as Status)}>
        <TabsList className="w-full">
          <TabsTrigger value="pendente" className="flex-1">
            Pendentes
          </TabsTrigger>
          <TabsTrigger value="aprovado" className="flex-1">
            Aprovados
          </TabsTrigger>
          <TabsTrigger value="rejeitado" className="flex-1">
            Rejeitados
          </TabsTrigger>
          <TabsTrigger value="estornado" className="flex-1">
            Estornados
          </TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : subs.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma submissão nesta aba.</p>
          ) : (
            subs.map((s) => (
              <Card key={s.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="font-medium">{s.profiles?.full_name ?? "Cliente"}</div>
                      <div className="text-xs text-muted-foreground">
                        {s.profiles?.phone ?? "—"} · enviado em{" "}
                        {new Date(s.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <a
                      href={s.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      Abrir post <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <div className="text-xs text-muted-foreground break-all font-mono">
                    {s.post_url}
                  </div>

                  {s.status === "pendente" && s.verify_after && (
                    <div className="text-xs text-muted-foreground">
                      Verificar novamente após:{" "}
                      {new Date(s.verify_after).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  {s.status === "aprovado" && (
                    <div className="text-xs">
                      ✅ +{s.points_awarded} pts · em{" "}
                      {s.reviewed_at ? new Date(s.reviewed_at).toLocaleString("pt-BR") : ""}
                    </div>
                  )}
                  {s.status === "rejeitado" && s.rejection_reason && (
                    <div className="text-xs text-destructive">Motivo: {s.rejection_reason}</div>
                  )}
                  {s.status === "estornado" && s.rejection_reason && (
                    <div className="text-xs text-destructive">Estornado — {s.rejection_reason}</div>
                  )}

                  {s.status === "pendente" && (
                    <div className="flex flex-wrap items-end gap-2 pt-2">
                      <div className="w-32">
                        <Label className="text-xs">Pontos</Label>
                        <Input
                          type="number"
                          min={1}
                          placeholder={String(loja.instagram_points_per_post)}
                          value={pointsOverride[s.id] ?? ""}
                          onChange={(e) =>
                            setPointsOverride((p) => ({ ...p, [s.id]: e.target.value }))
                          }
                        />
                      </div>
                      <Button
                        size="sm"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate(s)}
                      >
                        <Check className="h-4 w-4" /> Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRejectFor(s);
                          setReason("");
                        }}
                      >
                        <X className="h-4 w-4" /> Rejeitar
                      </Button>
                    </div>
                  )}
                  {s.status === "aprovado" && (
                    <div className="pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setRevokeFor(s);
                          setReason("");
                        }}
                      >
                        <RotateCcw className="h-4 w-4" /> Estornar (post sumiu)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectFor} onOpenChange={(v) => !v && setRejectFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar submissão</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">O cliente vai ver esse motivo.</p>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: post não menciona nossa loja, perfil privado, foto irrelevante..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectFor(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => reject.mutate()}
              disabled={reason.trim().length < 3 || reject.isPending}
            >
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!revokeFor} onOpenChange={(v) => !v && setRevokeFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Estornar pontos</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Vai remover <strong>{revokeFor?.points_awarded ?? 0} pts</strong> do saldo do cliente e
            registrar o motivo.
          </p>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: post apagado antes dos 7 dias, perfil trocado para privado..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeFor(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => revoke.mutate()}
              disabled={reason.trim().length < 3 || revoke.isPending}
            >
              Estornar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
