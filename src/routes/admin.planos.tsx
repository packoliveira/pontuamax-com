import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listAllPlans, upsertPlan, deletePlan } from "@/lib/plans.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Star, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/admin/planos")({
  ssr: false,
  component: AdminPlanos,
});

type Plan = {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number;
  setup_fee: number;
  max_clientes: number | null;
  max_funcionarios: number | null;
  max_lojas: number | null;
  integracao_erp: boolean;
  campanhas_whatsapp: boolean;
  campanhas_sms: boolean;
  nps_ativo: boolean;
  sorteios_ativo: boolean;
  vale_presente_ativo: boolean;
  instagram_ativo: boolean;
  suporte_prioritario: boolean;
  destaque: boolean;
  ativo: boolean;
  ordem: number;
};

const EMPTY: Plan = {
  id: "",
  slug: "",
  nome: "",
  descricao: "",
  preco_mensal: 0,
  preco_anual: 0,
  setup_fee: 0,
  max_clientes: null,
  max_funcionarios: null,
  max_lojas: 1,
  integracao_erp: false,
  campanhas_whatsapp: false,
  campanhas_sms: false,
  nps_ativo: false,
  sorteios_ativo: false,
  vale_presente_ativo: false,
  instagram_ativo: false,
  suporte_prioritario: false,
  destaque: false,
  ativo: true,
  ordem: 0,
};

const FEATURE_KEYS: Array<{ key: keyof Plan; label: string }> = [
  { key: "integracao_erp", label: "Integração Olist / Shopify" },
  { key: "campanhas_whatsapp", label: "Campanhas WhatsApp" },
  { key: "campanhas_sms", label: "Campanhas SMS" },
  { key: "nps_ativo", label: "NPS / Pesquisa de satisfação" },
  { key: "sorteios_ativo", label: "Sorteios" },
  { key: "vale_presente_ativo", label: "Vale-presente" },
  { key: "instagram_ativo", label: "Programa Instagram" },
  { key: "suporte_prioritario", label: "Suporte prioritário" },
];

function AdminPlanos() {
  const qc = useQueryClient();
  const listFn = useServerFn(listAllPlans);
  const upsertFn = useServerFn(upsertPlan);
  const deleteFn = useServerFn(deletePlan);

  const plans = useQuery({ queryKey: ["admin", "plans"], queryFn: () => listFn() });

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Plan>(EMPTY);

  const saveMut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...draft };
      if (!draft.id) delete (payload as { id?: string }).id;
      return upsertFn({ data: payload as never });
    },
    onSuccess: () => {
      toast.success("Plano salvo");
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
      setOpen(false);
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao salvar plano"),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Plano removido");
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erro ao remover plano"),
  });

  const openNew = () => {
    setDraft({ ...EMPTY, ordem: (plans.data?.length ?? 0) + 1 });
    setOpen(true);
  };
  const openEdit = (p: Plan) => {
    setDraft({ ...p, descricao: p.descricao ?? "" });
    setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
            <Link to="/admin">
              <ArrowLeft className="h-4 w-4" /> Voltar ao painel
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Planos de assinatura</h1>
          <p className="text-sm text-muted-foreground">
            Configure preços, limites e recursos de cada plano da PontuaMax.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo plano
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.data?.map((p) => (
          <Card key={p.id} className={p.destaque ? "border-primary shadow-lg" : ""}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {p.nome}
                    {p.destaque && <Star className="h-4 w-4 fill-primary text-primary" />}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{p.slug}</p>
                </div>
                <Badge variant={p.ativo ? "default" : "secondary"}>
                  {p.ativo ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-2xl font-bold">
                  {p.preco_mensal > 0 ? `R$ ${p.preco_mensal.toFixed(2)}` : "Sob consulta"}
                  <span className="text-xs font-normal text-muted-foreground">/mês</span>
                </div>
                {p.preco_anual > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Anual: R$ {p.preco_anual.toFixed(2)}
                  </div>
                )}
                {p.setup_fee > 0 && (
                  <div className="text-xs text-muted-foreground">
                    Setup: R$ {p.setup_fee.toFixed(2)}
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <div>Clientes: {p.max_clientes ?? "ilimitado"}</div>
                <div>Vendedores: {p.max_funcionarios ?? "ilimitado"}</div>
                <div>Lojas: {p.max_lojas ?? "ilimitado"}</div>
              </div>
              <div className="flex flex-wrap gap-1">
                {FEATURE_KEYS.filter((f) => p[f.key]).map((f) => (
                  <Badge key={f.key} variant="outline" className="text-[10px]">
                    {f.label}
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => openEdit(p)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Remover o plano "${p.nome}"?`)) deleteMut.mutate(p.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{draft.id ? "Editar plano" : "Novo plano"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome</Label>
                <Input
                  value={draft.nome}
                  onChange={(e) => setDraft({ ...draft, nome: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug (id técnico)</Label>
                <Input
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  placeholder="pro"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea
                rows={2}
                value={draft.descricao ?? ""}
                onChange={(e) => setDraft({ ...draft, descricao: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Preço mensal (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.preco_mensal}
                  onChange={(e) => setDraft({ ...draft, preco_mensal: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Preço anual (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.preco_anual}
                  onChange={(e) => setDraft({ ...draft, preco_anual: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Taxa de setup (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={draft.setup_fee}
                  onChange={(e) => setDraft({ ...draft, setup_fee: Number(e.target.value) })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Máx. clientes (vazio = ilimitado)</Label>
                <Input
                  type="number"
                  value={draft.max_clientes ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      max_clientes: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. vendedores</Label>
                <Input
                  type="number"
                  value={draft.max_funcionarios ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      max_funcionarios: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label>Máx. lojas</Label>
                <Input
                  type="number"
                  value={draft.max_lojas ?? ""}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      max_lojas: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recursos incluídos</Label>
              <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
                {FEATURE_KEYS.map((f) => (
                  <label key={f.key} className="flex items-center justify-between gap-2 text-sm">
                    <span>{f.label}</span>
                    <Switch
                      checked={Boolean(draft[f.key])}
                      onCheckedChange={(v) => setDraft({ ...draft, [f.key]: v })}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  value={draft.ordem}
                  onChange={(e) => setDraft({ ...draft, ordem: Number(e.target.value) })}
                />
              </div>
              <label className="flex items-end gap-2 pb-2">
                <Switch
                  checked={draft.destaque}
                  onCheckedChange={(v) => setDraft({ ...draft, destaque: v })}
                />
                <span className="text-sm">Destacar (mais popular)</span>
              </label>
              <label className="flex items-end gap-2 pb-2">
                <Switch
                  checked={draft.ativo}
                  onCheckedChange={(v) => setDraft({ ...draft, ativo: v })}
                />
                <span className="text-sm">Ativo</span>
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
              Salvar plano
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
