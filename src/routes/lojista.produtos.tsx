import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, type ProdutoResgate } from "@/lib/mock-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, PackageX } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lojista/produtos")({
  ssr: false,
  component: ProdutosPage,
});

function ProdutosPage() {
  const lojaId = useStore((s) => s.authedLojaId)!;
  const loja = useStore((s) => s.lojas.find((l) => l.id === lojaId))!;
  const produtos = useStore((s) => s.produtos.filter((p) => p.loja_id === lojaId));
  const criar = useStore((s) => s.criarProduto);
  const atualizar = useStore((s) => s.atualizarProduto);
  const remover = useStore((s) => s.removerProduto);

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProdutoResgate | null>(null);

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
  const openEdit = (p: ProdutoResgate) => { setEditing(p); setOpen(true); };

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
          <Card key={p.id} className="overflow-hidden">
            <div className="aspect-video bg-muted overflow-hidden">
              {p.foto_url ? <img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" /> : null}
            </div>
            <CardContent className="p-4 space-y-2">
              <div>
                <div className="font-semibold">{p.nome}</div>
                <div className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="font-bold text-violet-600">{p.pontos_necessarios} pts</span>
                <span className="text-muted-foreground">Estoque: {p.estoque}</span>
              </div>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => openEdit(p)}><Pencil className="h-3 w-3" /> Editar</Button>
                <Button size="sm" variant="outline" onClick={() => { remover(p.id); toast.success("Removido"); }}><Trash2 className="h-3 w-3" /></Button>
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
          if (editing) { atualizar(editing.id, data); toast.success("Atualizado"); }
          else { criar({ ...data, loja_id: lojaId, ativo: true }); toast.success("Criado"); }
          setOpen(false);
        }}
      />
    </div>
  );
}

function ProdutoDialog({ open, onOpenChange, editing, onSave }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: ProdutoResgate | null;
  onSave: (data: Omit<ProdutoResgate, "id" | "loja_id" | "ativo">) => void;
}) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [descricao, setDescricao] = useState(editing?.descricao ?? "");
  const [foto, setFoto] = useState(editing?.foto_url ?? "");
  const [pontos, setPontos] = useState(String(editing?.pontos_necessarios ?? 100));
  const [estoque, setEstoque] = useState(String(editing?.estoque ?? 10));

  const key = editing?.id ?? "new";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={key}>
        <DialogHeader><DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} /></div>
          <div><Label>Descrição</Label><Textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} rows={2} /></div>
          <div><Label>URL da foto</Label><Input value={foto} onChange={(e) => setFoto(e.target.value)} placeholder="https://..." /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Pontos</Label><Input type="number" value={pontos} onChange={(e) => setPontos(e.target.value)} /></div>
            <div><Label>Estoque</Label><Input type="number" value={estoque} onChange={(e) => setEstoque(e.target.value)} /></div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onSave({ nome, descricao, foto_url: foto, pontos_necessarios: parseInt(pontos || "0"), estoque: parseInt(estoque || "0") })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}