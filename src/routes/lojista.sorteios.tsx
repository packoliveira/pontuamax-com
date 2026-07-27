import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeRafflesQuery, clientTagsQuery } from "@/lib/queries";
import { salvarSorteio, sortearGanhador, cancelarSorteio } from "@/lib/qsf.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Trophy, Sparkles } from "lucide-react";

export const Route = createFileRoute("/lojista/sorteios")({
  ssr: false,
  component: Page,
});

function Page() {
  const { data: loja } = useQuery(myStoreQuery());
  const { data: raffles = [] } = useQuery(storeRafflesQuery(loja?.id));
  const { data: tags = [] } = useQuery(clientTagsQuery(loja?.id));
  const qc = useQueryClient();
  const [form, setForm] = useState({
    titulo: "",
    premio: "",
    filtro_tag: "",
    filtro_nivel_min: "",
  });

  const tagOptions = Array.from(new Set(tags.map((t) => t.tag))).sort();

  const criar = useMutation({
    mutationFn: () =>
      salvarSorteio({
        data: {
          titulo: form.titulo,
          premio: form.premio,
          filtro_tag: form.filtro_tag || null,
          filtro_nivel_min: (form.filtro_nivel_min as "bronze" | "prata" | "ouro") || null,
        },
      }),
    onSuccess: () => {
      toast.success("Sorteio criado");
      qc.invalidateQueries({ queryKey: ["raffles"] });
      setForm({ titulo: "", premio: "", filtro_tag: "", filtro_nivel_min: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const sortear = useMutation({
    mutationFn: (id: string) => sortearGanhador({ data: { id } }),
    onSuccess: (r) => {
      toast.success(`Ganhador: ${r.winner_name ?? "Cliente"} (${r.total_elegiveis} elegíveis)`);
      qc.invalidateQueries({ queryKey: ["raffles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarSorteio({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["raffles"] }),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Sorteios</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Novo sorteio</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <Label>Título</Label>
            <Input
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            />
          </div>
          <div>
            <Label>Prêmio</Label>
            <Input
              value={form.premio}
              onChange={(e) => setForm({ ...form, premio: e.target.value })}
            />
          </div>
          <div>
            <Label>Filtrar por etiqueta (opcional)</Label>
            <Select
              value={form.filtro_tag || "__all__"}
              onValueChange={(v) => setForm({ ...form, filtro_tag: v === "__all__" ? "" : v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sem filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Sem filtro</SelectItem>
                {tagOptions.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nível mínimo</Label>
            <Select
              value={form.filtro_nivel_min || "__all__"}
              onValueChange={(v) =>
                setForm({ ...form, filtro_nivel_min: v === "__all__" ? "" : v })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Todos</SelectItem>
                <SelectItem value="bronze">Bronze+</SelectItem>
                <SelectItem value="prata">Prata+</SelectItem>
                <SelectItem value="ouro">Ouro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Button
              disabled={criar.isPending || !form.titulo || !form.premio}
              onClick={() => criar.mutate()}
            >
              Criar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sorteios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {raffles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum sorteio ainda.</p>
          ) : (
            raffles.map((r) => (
              <div key={r.id} className="border rounded-md p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <div className="font-semibold">{r.titulo}</div>
                    <div className="text-sm text-muted-foreground">Prêmio: {r.premio}</div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {r.filtro_tag && <Badge variant="outline">#{r.filtro_tag}</Badge>}
                      {r.filtro_nivel_min && <Badge variant="outline">{r.filtro_nivel_min}+</Badge>}
                    </div>
                  </div>
                  <Badge
                    variant={
                      r.status === "sorteado"
                        ? "default"
                        : r.status === "cancelado"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {r.status}
                  </Badge>
                </div>
                {r.status === "sorteado" && (
                  <div className="text-sm">
                    🏆 <strong>{r.ganhador_nome ?? "Cliente"}</strong>
                  </div>
                )}
                {r.status === "aberto" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      disabled={sortear.isPending}
                      onClick={() => sortear.mutate(r.id)}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Sortear
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => cancelar.mutate(r.id)}>
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
