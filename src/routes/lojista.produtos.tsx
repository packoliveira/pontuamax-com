import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeProductsQuery } from "@/lib/queries";
import { salvarProduto, removerProduto } from "@/lib/qsf.functions";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, PackageX } from "lucide-react";
import { toast } from "sonner";

type Produto = Tables<"products">;

export const Route = createFileRoute("/lojista/produtos")({
  ssr: false,
  component: ProdutosPage,
});

function ProdutosPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: produtos = [] } = useQuery(storeProductsQuery(loja?.id));

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Produto | null>(null);

  const salvar = useMutation({
    mutationFn: (input: { id?: string; store_id: string; nome: string; descricao?: string | null; custo_pontos: number; ativo: boolean }) =>
      salvarProduto({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", loja?.id] }),
  });
  const remover = useMutation({
    mutationFn: (id: string) => removerProduto({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", loja?.id] }),
  });

  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  if (loja.modalidade === "cashback") {
    return (
      <div className="max-w-lg mx-auto text-center py-16 space-y-3">
        <PackageX className="h-10 w-10 text-muted-foreground mx-auto" />
        <h2 className="text-lg font-semibold">Produtos indisponíveis</h2>
        <p className="text-sm text-muted-foreground">Sua loja está no modo cashback. Ative pontos em Configurações para cadastrar produtos.</p>
      </div>
    );
  }

  const openNew = () => { setEditing(null); setOpen(true); };
  const openEdit = (p: Produto) => { setEditing(p); setOpen(true); };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Produtos para resgate</h1>
          <p className="text-sm text-muted-foreground">Produtos que seus clientes trocam por pontos</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> Novo produto</Button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {produtos.map((p) => (
          <Card key={p.id}>
            <CardContent className="p-4 space-y-2">
              <div>
                <div className="font-semibold">{p.nome}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-violet-600">{p.custo_pontos} pts</span>
                <span className={`text-xs ${p.ativo ? "text-green-700" : "text-muted-foreground"}`}>{p.ativo ? "Ativo" : "Inativo"}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /> Editar</Button>
                <Button size="sm" variant="outline" onClick={() => remover.mutate(p.id, { onSuccess: () => toast.success("Removido") })}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {produtos.length === 0 && <p className="text-sm text-muted-foreground col-span-full">Nenhum produto cadastrado.</p>}
      </div>

      <ProdutoDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        onSave={(data) => {
          salvar.mutate(
            { id: editing?.id, store_id: loja.id, ...data },
            {
              onSuccess: () => { toast.success(editing ? "Atualizado" : "Criado"); setOpen(false); },
              onError: (e) => toast.error((e as Error).message),
            },
          );
        }}
      />
    </div>
  );
}

function ProdutoDialog({ open, onOpenChange, editing, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Produto | null;
  onSave: (data: { nome: string; descricao: string | null; custo_pontos: number; ativo: boolean }) => void;
}) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [descricao, setDescricao] = useState(editing?.descricao ?? "");
  const [pontos, setPontos] = useState(String(editing?.custo_pontos ?? 100));
  const [ativo, setAtivo] = useState(editing?.ativo ?? true);

  const key = editing?.id ?? "new";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={key}>
        <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={descricao ?? ""} onChange={(e) => setDescricao(e.target.value)} rows={2} /></div>
          <div><Label>Custo em pontos</Label><Input type="number" value={pontos} onChange={(e) => setPontos(e.target.value)} /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo</label>
        </div>
        <DialogFooter>
          <Button onClick={() => onSave({ nome, descricao: descricao || null, custo_pontos: parseInt(pontos || "0"), ativo })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}