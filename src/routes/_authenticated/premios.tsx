import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Gift, Plus, Edit2, Trash2, Loader2, Sparkles, Image, Check, Eye } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/premios")({
  component: PremiosPage,
});

export type LoyaltyReward = {
  id: string;
  title: string;
  description: string;
  category: "desconto" | "brinde" | "cashback" | "servico";
  points_cost: number;
  stock: number; // -1 = ilimitado
  image_url: string;
  badge: string;
  active: boolean;
  created_at: string;
};

const DEFAULT_INITIAL_REWARDS: LoyaltyReward[] = [
  {
    id: "r1",
    title: "Voucher R$ 20,00 de Desconto",
    description: "Válido para qualquer compra na loja física ou e-commerce acima de R$ 100",
    category: "desconto",
    points_cost: 200,
    stock: -1,
    image_url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80",
    badge: "Mais Resgatado",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "r2",
    title: "Camiseta Exclusiva da Loja",
    description: "Edição limitada do programa de fidelidade. Retire no balcão da loja",
    category: "brinde",
    points_cost: 500,
    stock: 25,
    image_url: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    badge: "Exclusivo VIP",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "r3",
    title: "Squeeze Térmica Inox 750ml",
    description: "Mantenha sua bebida gelada por até 24h durante o dia a dia",
    category: "brinde",
    points_cost: 350,
    stock: 10,
    image_url: "https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=600&auto=format&fit=crop&q=80",
    badge: "Popular",
    active: true,
    created_at: new Date().toISOString(),
  },
  {
    id: "r4",
    title: "Voucher R$ 50,00 de Cashback Extra",
    description: "Crédito direto no seu saldo para usar como quiser na próxima compra",
    category: "cashback",
    points_cost: 450,
    stock: -1,
    image_url: "https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=600&auto=format&fit=crop&q=80",
    badge: "Super Benefício",
    active: true,
    created_at: new Date().toISOString(),
  },
];

function PremiosPage() {
  const qc = useQueryClient();

  // 1. Busca dados da organização
  const { data: org } = useQuery({
    queryKey: ["premios-org"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: p } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (!p?.organization_id) return null;
      const { data: o } = await supabase.from("organizations").select("id, name").eq("id", p.organization_id).maybeSingle();
      return o;
    },
  });

  // 2. Busca o nome da moeda configurada pelo lojista
  const { data: storeConfig } = useQuery({
    enabled: !!org?.id,
    queryKey: ["store-branding-premios", org?.id],
    queryFn: async () => {
      const { data: brandingRow } = await supabase
        .from("integration_mappings")
        .select("metadata")
        .eq("organization_id", org!.id)
        .eq("source", "olist")
        .eq("entity_type", "store_branding")
        .maybeSingle();

      const brandingMeta = (brandingRow?.metadata as any) ?? {};
      return {
        currencyName: brandingMeta.currency_name ?? "Pontos",
        primaryColor: brandingMeta.primary_color ?? "#6366f1",
      };
    },
  });

  const currencyName = storeConfig?.currencyName ?? "Pontos";
  const primaryColor = storeConfig?.primaryColor ?? "#6366f1";

  // 3. Busca lista de prêmios cadastrados da loja
  const { data: rewardsList, isLoading } = useQuery({
    enabled: !!org?.id,
    queryKey: ["loyalty-rewards-list", org?.id],
    queryFn: async (): Promise<LoyaltyReward[]> => {
      const { data } = await supabase
        .from("integration_mappings")
        .select("id, external_id, metadata")
        .eq("organization_id", org!.id)
        .eq("source", "olist")
        .eq("entity_type", "loyalty_rewards");

      if (!data || data.length === 0) {
        return DEFAULT_INITIAL_REWARDS;
      }

      return data.map((row: any) => ({
        id: row.external_id,
        ...(row.metadata as any),
      }));
    },
  });

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<"desconto" | "brinde" | "cashback" | "servico">("brinde");
  const [pointsCost, setPointsCost] = useState<number>(200);
  const [stock, setStock] = useState<number>(-1);
  const [imageUrl, setImageUrl] = useState("");
  const [badge, setBadge] = useState("Popular");
  const [active, setActive] = useState(true);

  const openCreateModal = () => {
    setEditingReward(null);
    setTitle("");
    setDescription("");
    setCategory("brinde");
    setPointsCost(200);
    setStock(-1);
    setImageUrl("https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80");
    setBadge("Destaque");
    setActive(true);
    setModalOpen(true);
  };

  const openEditModal = (r: LoyaltyReward) => {
    setEditingReward(r);
    setTitle(r.title);
    setDescription(r.description);
    setCategory(r.category);
    setPointsCost(r.points_cost);
    setStock(r.stock);
    setImageUrl(r.image_url);
    setBadge(r.badge);
    setActive(r.active);
    setModalOpen(true);
  };

  // Mutation para Salvar (Criar / Editar)
  const saveRewardMut = useMutation({
    mutationFn: async () => {
      if (!org?.id) throw new Error("Organização não encontrada.");
      if (!title.trim()) throw new Error("Informe o nome da recompensa.");

      const rewardId = editingReward ? editingReward.id : `rew-${Date.now()}`;
      const rewardData: LoyaltyReward = {
        id: rewardId,
        title: title.trim(),
        description: description.trim(),
        category,
        points_cost: Number(pointsCost) || 0,
        stock: Number(stock),
        image_url: imageUrl.trim() || "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&auto=format&fit=crop&q=80",
        badge: badge.trim() || "Popular",
        active,
        created_at: editingReward ? editingReward.created_at : new Date().toISOString(),
      };

      const { error } = await supabase.from("integration_mappings").upsert(
        {
          organization_id: org.id,
          source: "olist",
          entity_type: "loyalty_rewards",
          external_id: rewardId,
          internal_id: org.id,
          metadata: rewardData as any,
        },
        { onConflict: "organization_id,source,entity_type,external_id" }
      );

      if (error) throw error;
      return rewardData;
    },
    onSuccess: () => {
      toast.success(editingReward ? "Recompensa atualizada!" : "Nova recompensa cadastrada!");
      setModalOpen(false);
      qc.invalidateQueries({ queryKey: ["loyalty-rewards-list"] });
      qc.invalidateQueries({ queryKey: ["public-store-rewards"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao salvar recompensa."),
  });

  // Mutation para Deletar
  const deleteRewardMut = useMutation({
    mutationFn: async (id: string) => {
      if (!org?.id) throw new Error("Organização não encontrada.");
      const { error } = await supabase
        .from("integration_mappings")
        .delete()
        .eq("organization_id", org.id)
        .eq("source", "olist")
        .eq("entity_type", "loyalty_rewards")
        .eq("external_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recompensa removida com sucesso!");
      qc.invalidateQueries({ queryKey: ["loyalty-rewards-list"] });
      qc.invalidateQueries({ queryKey: ["public-store-rewards"] });
    },
    onError: (err: any) => toast.error(err?.message ?? "Falha ao remover recompensa."),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Catálogo de Prêmios e Recompensas"
        description={`Cadastre os cupons e brindes resgatáveis pelos clientes na Vitrine Pública usando ${currencyName}.`}
        actions={
          <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/90">
            <Plus className="mr-2 h-4 w-4" /> Cadastrar Nova Recompensa
          </Button>
        }
      />

      <Card>
        <CardHeader className="py-4 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" /> Recompensas Disponíveis para Troca
            </CardTitle>
            <CardDescription className="text-xs">
              Os prêmios marcados como <strong>Ativo</strong> aparecem instantaneamente na Vitrine do Cliente (/$slug).
            </CardDescription>
          </div>
          <Badge variant="outline" className="text-xs">
            Moeda da Loja: <strong className="ml-1 text-primary">{currencyName}</strong>
          </Badge>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">Imagem</TableHead>
                <TableHead>Nome do Prêmio</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead className="text-right">Custo ({currencyName})</TableHead>
                <TableHead className="text-center">Estoque</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Carregando catálogo de prêmios...
                  </TableCell>
                </TableRow>
              ) : (rewardsList ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum prêmio cadastrado ainda. Clique em "Cadastrar Nova Recompensa"!
                  </TableCell>
                </TableRow>
              ) : (
                (rewardsList ?? []).map((r) => (
                  <TableRow key={r.id} className="hover:bg-muted/40">
                    <TableCell>
                      <img
                        src={r.image_url}
                        alt={r.title}
                        className="h-10 w-10 rounded-lg object-cover border"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-sm">{r.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1">{r.description}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs uppercase font-mono">
                        {r.category}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-black text-sm text-primary">
                      {r.points_cost} <span className="text-xs font-normal text-muted-foreground">{currencyName.toLowerCase()}</span>
                    </TableCell>
                    <TableCell className="text-center text-xs">
                      {r.stock === -1 ? (
                        <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Ilimitado
                        </Badge>
                      ) : (
                        <span className="font-mono font-bold">{r.stock} un</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={r.active ? "default" : "outline"} className={r.active ? "bg-emerald-600" : "opacity-60"}>
                        {r.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEditModal(r)}>
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteRewardMut.mutate(r.id)} className="text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal de Cadastro / Edição de Recompensa */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingReward ? "Editar Recompensa" : "Cadastrar Nova Recompensa"}</DialogTitle>
            <DialogDescription className="text-xs">
              Preencha os detalhes do prêmio que ficará disponível para resgate na Vitrine Pública.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 text-sm pt-2">
            <div className="space-y-2">
              <Label htmlFor="rewTitle" className="text-xs font-semibold">Nome da Recompensa *</Label>
              <Input
                id="rewTitle"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Cupom de R$ 20 Off ou Shaker Exclusivo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rewDesc" className="text-xs font-semibold">Descrição e Regras de Uso</Label>
              <Textarea
                id="rewDesc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalhes de como e onde o cliente pode utilizar o prêmio..."
                rows={2}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Categoria do Prêmio</Label>
                <Select value={category} onValueChange={(v: any) => setCategory(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="desconto">Cupom de Desconto</SelectItem>
                    <SelectItem value="brinde">Brinde Físico</SelectItem>
                    <SelectItem value="cashback">Cashback Extra</SelectItem>
                    <SelectItem value="servico">Serviço / Voucher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pointsCost" className="text-xs font-semibold">Custo em {currencyName} *</Label>
                <Input
                  id="pointsCost"
                  type="number"
                  min="1"
                  value={pointsCost}
                  onChange={(e) => setPointsCost(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rewStock" className="text-xs font-semibold">Estoque Disponível</Label>
                <Input
                  id="rewStock"
                  type="number"
                  value={stock}
                  onChange={(e) => setStock(Number(e.target.value))}
                  placeholder="-1 para ilimitado"
                />
                <span className="text-[10px] text-muted-foreground block">Digite -1 para estoque ilimitado.</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rewBadge" className="text-xs font-semibold">Selo do Card (Badge)</Label>
                <Input
                  id="rewBadge"
                  value={badge}
                  onChange={(e) => setBadge(e.target.value)}
                  placeholder="Ex: Mais Resgatado, Popular, VIP"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="rewImg" className="text-xs font-semibold">URL da Foto / Imagem do Prêmio</Label>
              <Input
                id="rewImg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem-do-premio.jpg"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <div className="space-y-0.5">
                <Label className="text-xs font-semibold">Status de Exibição na Vitrine</Label>
                <p className="text-[10px] text-muted-foreground">Quando ativo, o prêmio fica visível para resgate imediato.</p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={() => saveRewardMut.mutate()} disabled={saveRewardMut.isPending} className="bg-primary hover:bg-primary/90">
              {saveRewardMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingReward ? "Salvar Alterações" : "Cadastrar Recompensa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
