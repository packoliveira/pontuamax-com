import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storePromotionsQuery } from "@/lib/queries";
import { salvarPromocao, removerPromocao } from "@/lib/qsf.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Zap, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/lojista/promocoes")({
  ssr: false,
  component: Promocoes,
});

const DIAS = [
  { v: 0, l: "Dom" },
  { v: 1, l: "Seg" },
  { v: 2, l: "Ter" },
  { v: 3, l: "Qua" },
  { v: 4, l: "Qui" },
  { v: 5, l: "Sex" },
  { v: 6, l: "Sáb" },
];

type PromoForm = {
  id?: string;
  nome: string;
  multiplicador: number;
  dias_semana: number[];
  hora_inicio: string;
  hora_fim: string;
  data_inicio: string;
  data_fim: string;
  ativo: boolean;
};

const empty: PromoForm = {
  nome: "",
  multiplicador: 2,
  dias_semana: [5, 6, 0],
  hora_inicio: "00:00",
  hora_fim: "23:59",
  data_inicio: "",
  data_fim: "",
  ativo: true,
};

function Promocoes() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: promos = [] } = useQuery(storePromotionsQuery(loja?.id));
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<PromoForm>(empty);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["promotions", loja?.id] });
  };

  const salvar = useMutation({
    mutationFn: (input: PromoForm) =>
      salvarPromocao({
        data: {
          id: input.id,
          nome: input.nome,
          multiplicador: input.multiplicador,
          dias_semana: input.dias_semana,
          hora_inicio: input.hora_inicio,
          hora_fim: input.hora_fim,
          data_inicio: input.data_inicio || null,
          data_fim: input.data_fim || null,
          ativo: input.ativo,
        },
      }),
    onSuccess: () => {
      invalidate();
      setOpen(false);
      toast.success("Promoção salva!");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remover = useMutation({
    mutationFn: (id: string) => removerPromocao({ data: { id } }),
    onSuccess: () => {
      invalidate();
      toast.success("Promoção removida");
    },
  });

  const abrirNovo = () => {
    setForm(empty);
    setOpen(true);
  };
  const abrirEditar = (p: (typeof promos)[number]) => {
    setForm({
      id: p.id,
      nome: p.nome,
      multiplicador: Number(p.multiplicador),
      dias_semana: p.dias_semana as number[],
      hora_inicio: p.hora_inicio.slice(0, 5),
      hora_fim: p.hora_fim.slice(0, 5),
      data_inicio: p.data_inicio ?? "",
      data_fim: p.data_fim ?? "",
      ativo: p.ativo,
    });
    setOpen(true);
  };

  const toggleDia = (v: number) => {
    setForm((f) => ({
      ...f,
      dias_semana: f.dias_semana.includes(v)
        ? f.dias_semana.filter((d) => d !== v)
        : [...f.dias_semana, v].sort(),
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) return toast.error("Informe o nome da promoção");
    if (form.dias_semana.length === 0) return toast.error("Selecione ao menos um dia");
    salvar.mutate(form);
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-orange-500" /> Promoções
          </h1>
          <p className="text-sm text-muted-foreground">
            Multiplique os pontos ganhos em dias e horários específicos
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={abrirNovo}>
              <Plus className="h-4 w-4" /> Nova promoção
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.id ? "Editar promoção" : "Nova promoção"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Dobro de pontos no fim de semana"
                />
              </div>
              <div className="space-y-2">
                <Label>Multiplicador de pontos ({form.multiplicador}x)</Label>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step={0.5}
                  value={form.multiplicador}
                  onChange={(e) => setForm({ ...form, multiplicador: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Dias da semana</Label>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map((d) => (
                    <button
                      type="button"
                      key={d.v}
                      onClick={() => toggleDia(d.v)}
                      className={`px-3 py-1 rounded-md text-sm border ${form.dias_semana.includes(d.v) ? "bg-primary text-primary-foreground border-primary" : "bg-background"}`}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Hora início</Label>
                  <Input
                    type="time"
                    value={form.hora_inicio}
                    onChange={(e) => setForm({ ...form, hora_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora fim</Label>
                  <Input
                    type="time"
                    value={form.hora_fim}
                    onChange={(e) => setForm({ ...form, hora_fim: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Data início (opcional)</Label>
                  <Input
                    type="date"
                    value={form.data_inicio}
                    onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data fim (opcional)</Label>
                  <Input
                    type="date"
                    value={form.data_fim}
                    onChange={(e) => setForm({ ...form, data_fim: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.ativo}
                  onCheckedChange={(v) => setForm({ ...form, ativo: v })}
                />
                <Label>Ativa</Label>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={salvar.isPending}>
                  {salvar.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {promos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Nenhuma promoção cadastrada. Crie uma para multiplicar pontos em períodos específicos.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {promos.map((p) => (
            <Card key={p.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-base">
                      {p.nome}
                      <Badge variant={p.ativo ? "default" : "secondary"}>
                        {p.ativo ? "Ativa" : "Pausada"}
                      </Badge>
                      <Badge className="bg-orange-500 hover:bg-orange-600">
                        {Number(p.multiplicador)}x
                      </Badge>
                    </CardTitle>
                    <div className="text-sm text-muted-foreground mt-1">
                      {(p.dias_semana as number[]).map((d) => DIAS[d].l).join(", ")} ·{" "}
                      {p.hora_inicio.slice(0, 5)} às {p.hora_fim.slice(0, 5)}
                      {p.data_inicio && ` · de ${p.data_inicio}`}
                      {p.data_fim && ` até ${p.data_fim}`}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => abrirEditar(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        if (confirm("Remover esta promoção?")) remover.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
