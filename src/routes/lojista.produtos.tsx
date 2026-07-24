import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeProductsQuery } from "@/lib/queries";
import { salvarProduto, removerProduto } from "@/lib/loyalty.functions";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, PackageX, ImageIcon, Upload, X, Package } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
    mutationFn: (input: {
      id?: string;
      store_id: string;
      nome: string;
      descricao?: string | null;
      custo_pontos: number;
      ativo: boolean;
      foto_url?: string | null;
    }) => salvarProduto({ data: input }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", loja?.id] }),
  });
  const remover = useMutation({
    mutationFn: (id: string) => removerProduto({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products", loja?.id] }),
  });

  if (!loja) return <div className="p-6 text-sm text-muted-foreground">Carregando...</div>;

  if (loja.modalidade === "cashback") {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-[#E5E7EB] bg-white p-10 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#64748B]">
          <PackageX className="h-5 w-5" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-[#0F172A]">Produtos indisponíveis</h2>
        <p className="mt-2 text-sm text-[#64748B]">
          Sua loja está no modo cashback. Ative pontos em Configurações para cadastrar produtos.
        </p>
      </div>
    );
  }

  const openNew = () => {
    setEditing(null);
    setOpen(true);
  };
  const openEdit = (p: Produto) => {
    setEditing(p);
    setOpen(true);
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Catálogo
          </div>
          <h1 className="mt-1 text-2xl font-bold text-[#0F172A] md:text-3xl">
            Produtos para resgate
          </h1>
          <p className="mt-1 text-sm text-[#64748B]">
            Produtos que seus clientes trocam por pontos.
          </p>
        </div>
        <Button
          onClick={openNew}
          size="lg"
          className="shrink-0 rounded-xl bg-[#2563EB] text-white shadow-sm hover:bg-[#1D4ED8]"
        >
          <Plus className="h-4 w-4" /> Novo produto
        </Button>
      </div>

      {produtos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E5E7EB] bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-sm">
            <Package className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-[#0F172A]">Nenhum produto cadastrado</h3>
          <p className="mt-1 text-sm text-[#64748B]">
            Adicione seu primeiro produto para que os clientes possam resgatar com pontos.
          </p>
          <Button
            onClick={openNew}
            className="mt-5 rounded-xl bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
          >
            <Plus className="h-4 w-4" /> Criar produto
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {produtos.map((p) => (
            <Card
              key={p.id}
              className="group overflow-hidden rounded-2xl border border-[#E5E7EB] bg-white p-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative aspect-video w-full overflow-hidden bg-[#F1F5F9]">
                {p.foto_url ? (
                  <img
                    src={p.foto_url}
                    alt={p.nome}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[#94A3B8]">
                    <ImageIcon className="h-8 w-8" />
                  </div>
                )}
                <span
                  className={
                    "absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold shadow-sm " +
                    (p.ativo
                      ? "bg-[#22C55E]/15 text-[#15803D] ring-1 ring-inset ring-[#22C55E]/30"
                      : "bg-[#F1F5F9] text-[#64748B] ring-1 ring-inset ring-[#E5E7EB]")
                  }
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${p.ativo ? "bg-[#22C55E]" : "bg-[#94A3B8]"}`}
                  />
                  {p.ativo ? "Ativo" : "Inativo"}
                </span>
              </div>
              <CardContent className="space-y-3 p-5">
                <div>
                  <div className="truncate text-base font-semibold text-[#0F172A]">{p.nome}</div>
                  <div className="mt-1 line-clamp-2 min-h-[2rem] text-xs text-[#64748B]">
                    {p.descricao || "Sem descrição"}
                  </div>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] bg-clip-text text-lg font-bold text-transparent">
                    {p.custo_pontos.toLocaleString("pt-BR")}
                  </span>
                  <span className="text-xs font-medium text-[#64748B]">pts</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 rounded-xl border-[#E5E7EB] text-[#0F172A] hover:bg-[#F1F5F9]"
                    onClick={() => openEdit(p)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl border-[#E5E7EB] text-[#EF4444] hover:border-[#EF4444]/40 hover:bg-[#EF4444]/5"
                    onClick={() =>
                      remover.mutate(p.id, { onSuccess: () => toast.success("Removido") })
                    }
                    aria-label="Remover produto"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ProdutoDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        storeId={loja.id}
        onSave={(data) => {
          salvar.mutate(
            { id: editing?.id, store_id: loja.id, ...data },
            {
              onSuccess: () => {
                toast.success(editing ? "Atualizado" : "Criado");
                setOpen(false);
              },
              onError: (e) => toast.error((e as Error).message),
            },
          );
        }}
      />
    </div>
  );
}

function ProdutoDialog({
  open,
  onOpenChange,
  editing,
  storeId,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Produto | null;
  storeId: string;
  onSave: (data: {
    nome: string;
    descricao: string | null;
    custo_pontos: number;
    ativo: boolean;
    foto_url: string | null;
  }) => void;
}) {
  const [nome, setNome] = useState(editing?.nome ?? "");
  const [descricao, setDescricao] = useState(editing?.descricao ?? "");
  const [pontos, setPontos] = useState(String(editing?.custo_pontos ?? 100));
  const [ativo, setAtivo] = useState(editing?.ativo ?? true);
  const [fotoUrl, setFotoUrl] = useState<string | null>(editing?.foto_url ?? null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return toast.error("Imagem acima de 5 MB");
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${storeId}/${Date.now()}.${ext}`;
      const up = await supabase.storage.from("product-images").upload(path, file, {
        upsert: true,
        contentType: file.type || undefined,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage
        .from("product-images")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data?.signedUrl)
        throw signed.error ?? new Error("Falha ao gerar URL");
      setFotoUrl(signed.data.signedUrl);
      toast.success("Imagem enviada");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const key = editing?.id ?? "new";
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={key}>
        <DialogHeader>
          <DialogTitle>{editing ? "Editar produto" : "Novo produto"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Imagem</Label>
            <div className="mt-1 flex items-center gap-3">
              <div className="h-20 w-20 rounded-md bg-muted overflow-hidden flex items-center justify-center shrink-0">
                {fotoUrl ? (
                  <img src={fotoUrl} alt="Prévia" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-6 w-6 text-muted-foreground/40" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-sm border rounded-md px-3 py-1.5 cursor-pointer hover:bg-accent">
                  <Upload className="h-3.5 w-3.5" />
                  {uploading ? "Enviando..." : fotoUrl ? "Trocar imagem" : "Enviar imagem"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFile(f);
                    }}
                  />
                </label>
                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl(null)}
                    className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3" /> Remover imagem
                  </button>
                )}
              </div>
            </div>
          </div>
          <div>
            <Label>Nome</Label>
            <Input value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea
              value={descricao ?? ""}
              onChange={(e) => setDescricao(e.target.value)}
              rows={2}
            />
          </div>
          <div>
            <Label>Custo em pontos</Label>
            <Input type="number" value={pontos} onChange={(e) => setPontos(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />{" "}
            Ativo
          </label>
        </div>
        <DialogFooter>
          <Button
            disabled={uploading}
            onClick={() =>
              onSave({
                nome,
                descricao: descricao || null,
                custo_pontos: parseInt(pontos || "0"),
                ativo,
                foto_url: fotoUrl,
              })
            }
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
