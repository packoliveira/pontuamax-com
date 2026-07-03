import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeClientsQuery, clientTagsQuery } from "@/lib/queries";
import { atualizarAniversarioCliente, addClientTag, removeClientTag } from "@/lib/qsf.functions";
import { formatBRL, formatDate } from "@/lib/qsf-shared";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, Cake, X, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lojista/clientes")({
  ssr: false,
  component: ClientesPage,
});

const NIVEL_COR: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  prata: "bg-slate-200 text-slate-800",
  ouro: "bg-yellow-100 text-yellow-800",
};

function ClientesPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: clientes = [] } = useQuery(storeClientsQuery(loja?.id));
  const { data: tags = [] } = useQuery(clientTagsQuery(loja?.id));
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ userId: string; value: string } | null>(null);
  const [tagInput, setTagInput] = useState<Record<string, string>>({});

  const addTag = useMutation({
    mutationFn: (v: { user_id: string; tag: string }) => addClientTag({ data: { store_id: loja!.id, client_user_id: v.user_id, tag: v.tag } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-tags"] }),
    onError: (e) => toast.error((e as Error).message),
  });
  const rmTag = useMutation({
    mutationFn: (id: string) => removeClientTag({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["client-tags"] }),
  });

  const salvarBirth = useMutation({
    mutationFn: (input: { user_id: string; birthdate: string | null }) =>
      atualizarAniversarioCliente({
        data: { store_id: loja!.id, client_user_id: input.user_id, birthdate: input.birthdate },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      setEditing(null);
      toast.success("Aniversário salvo");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  const filtered = clientes.filter((c) => {
    if (!q) return true;
    const s = q.toLowerCase();
    const p = c.profiles as unknown as { full_name: string | null; phone: string | null; cpf: string | null } | null;
    return (p?.full_name ?? "").toLowerCase().includes(s) || (p?.phone ?? "").includes(s) || (p?.cpf ?? "").includes(s);
  });
  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">{clientes.length} cliente(s) cadastrado(s)</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone ou CPF" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((c) => {
              const p = c.profiles as unknown as { full_name: string | null; phone: string | null; cpf: string | null; birthdate: string | null } | null;
              const isEditing = editing?.userId === c.user_id;
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p?.full_name ?? "—"}</span>
                      {inclP && (
                        <Badge className={NIVEL_COR[c.nivel]} variant="secondary">{c.nivel}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{p?.phone || p?.cpf}</div>
                    <div className="text-xs text-muted-foreground">Cadastrado: {formatDate(c.created_at)}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2 mt-1">
                      <Cake className="h-3 w-3" />
                      {isEditing ? (
                        <>
                          <Input type="date" value={editing.value} onChange={(e) => setEditing({ ...editing, value: e.target.value })} className="h-7 w-40" />
                          <Button size="sm" className="h-7 px-2" onClick={() => salvarBirth.mutate({ user_id: c.user_id, birthdate: editing.value || null })}>Salvar</Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditing(null)}>Cancelar</Button>
                        </>
                      ) : (
                        <>
                          {p?.birthdate ? new Date(p.birthdate + "T00:00").toLocaleDateString("pt-BR") : "sem aniversário"}
                          <button className="underline" onClick={() => setEditing({ userId: c.user_id, value: p?.birthdate ?? "" })}>editar</button>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-wrap mt-2">
                      {tags.filter((t) => t.client_user_id === c.user_id).map((t) => (
                        <Badge key={t.id} variant="outline" className="gap-1">
                          #{t.tag}
                          <button onClick={() => rmTag.mutate(t.id)} className="hover:text-red-600"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                      <div className="flex items-center gap-1">
                        <Input value={tagInput[c.user_id] ?? ""} onChange={(e) => setTagInput((s) => ({ ...s, [c.user_id]: e.target.value }))}
                          placeholder="nova tag" className="h-6 w-24 text-xs" />
                        <Button size="sm" variant="ghost" className="h-6 px-1" disabled={!(tagInput[c.user_id] ?? "").trim()}
                          onClick={() => { addTag.mutate({ user_id: c.user_id, tag: tagInput[c.user_id] }); setTagInput((s) => ({ ...s, [c.user_id]: "" })); }}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    {inclP && <div><span className="font-semibold">{c.pontos}</span> pts</div>}
                    {inclC && <div className="text-green-700 font-semibold">{formatBRL(Number(c.cashback_saldo))}</div>}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}