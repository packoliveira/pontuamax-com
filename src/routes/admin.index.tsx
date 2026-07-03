import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listAllStores,
  updateStoreSubscription,
  bootstrapFirstAdmin,
  isCurrentUserAdmin,
} from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Store, DollarSign, TrendingUp, Users, Ban, CheckCircle2, Pause, Settings2, Search, UserPlus, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/")({
  ssr: false,
  component: AdminDashboard,
});

type StoreRow = {
  id: string;
  slug: string;
  nome_fantasia: string;
  telefone: string | null;
  owner_id: string;
  subscription_status: "pending_payment" | "active" | "suspended" | "cancelled";
  plan: "starter" | "pro" | "premium";
  mrr_amount: number;
  setup_paid_at: string | null;
  activated_at: string | null;
  cancelled_at: string | null;
  admin_notes: string | null;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
  owner_phone: string | null;
};

const STATUS_LABEL: Record<StoreRow["subscription_status"], string> = {
  pending_payment: "Aguardando",
  active: "Ativa",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};
const STATUS_VARIANT: Record<StoreRow["subscription_status"], "default" | "secondary" | "outline" | "destructive"> = {
  pending_payment: "secondary",
  active: "default",
  suspended: "outline",
  cancelled: "destructive",
};

function AdminDashboard() {
  const qc = useQueryClient();
  const checkAdmin = useServerFn(isCurrentUserAdmin);
  const fetchStores = useServerFn(listAllStores);
  const bootstrap = useServerFn(bootstrapFirstAdmin);

  const { data: adminCheck, isLoading: loadingAdmin, refetch: refetchAdmin } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
  });

  const { data: stores, isLoading, error } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => fetchStores() as Promise<StoreRow[]>,
    enabled: adminCheck?.isAdmin === true,
  });

  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | StoreRow["subscription_status"]>("all");

  if (loadingAdmin) return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  if (!adminCheck?.isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Área administrativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você não tem permissão de administrador. Se esta é uma instalação nova e ainda não existe nenhum admin, você pode se promover:
            </p>
            <Button
              className="w-full"
              onClick={async () => {
                try {
                  const r = await bootstrap();
                  if (r.promoted) {
                    toast.success("Você agora é administrador!");
                    refetchAdmin();
                  } else {
                    toast.error("Já existe um administrador. Peça a ele para te promover.");
                  }
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
            >
              Promover-me a admin (só funciona se não houver nenhum)
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const list = stores ?? [];
  const mrrTotal = list.filter((s) => s.subscription_status === "active").reduce((a, s) => a + Number(s.mrr_amount || 0), 0);
  const mrrPotencial = list.filter((s) => s.subscription_status === "pending_payment").reduce((a, s) => a + Number(s.mrr_amount || 0), 0);
  const ativas = list.filter((s) => s.subscription_status === "active").length;
  const aguardando = list.filter((s) => s.subscription_status === "pending_payment").length;
  const suspensas = list.filter((s) => s.subscription_status === "suspended").length;
  const canceladas = list.filter((s) => s.subscription_status === "cancelled").length;

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const novasMes = list.filter((s) => new Date(s.created_at).getTime() >= inicioMes).length;
  const churnMes = list.filter((s) => s.cancelled_at && new Date(s.cancelled_at).getTime() >= inicioMes).length;
  const arr = mrrTotal * 12;
  const ticketMedio = ativas > 0 ? mrrTotal / ativas : 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return list.filter((s) => {
      if (filter !== "all" && s.subscription_status !== filter) return false;
      if (!q) return true;
      return (
        s.nome_fantasia.toLowerCase().includes(q) ||
        s.slug.toLowerCase().includes(q) ||
        (s.owner_name ?? "").toLowerCase().includes(q) ||
        (s.owner_email ?? "").toLowerCase().includes(q) ||
        (s.owner_phone ?? s.telefone ?? "").toLowerCase().includes(q)
      );
    });
  }, [list, search, filter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das lojas e assinaturas</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="MRR" value={`R$ ${mrrTotal.toFixed(2)}`} accent="text-green-600" />
        <StatCard icon={<TrendingUp className="h-5 w-5" />} label="ARR projetado" value={`R$ ${arr.toFixed(0)}`} accent="text-emerald-600" />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="Ticket médio" value={`R$ ${ticketMedio.toFixed(2)}`} />
        <StatCard icon={<DollarSign className="h-5 w-5" />} label="MRR potencial (aguard.)" value={`R$ ${mrrPotencial.toFixed(2)}`} accent="text-amber-600" />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Store className="h-5 w-5" />} label="Lojas totais" value={list.length} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Ativas" value={ativas} accent="text-green-600" />
        <StatCard icon={<UserPlus className="h-5 w-5" />} label="Novas este mês" value={novasMes} accent="text-blue-600" />
        <StatCard icon={<TrendingDown className="h-5 w-5" />} label="Churn este mês" value={churnMes} accent={churnMes > 0 ? "text-red-600" : undefined} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2 text-base"><Users className="h-4 w-4" /> Lojas ({filtered.length}{filtered.length !== list.length ? ` de ${list.length}` : ""})</CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-8" placeholder="Buscar por nome, slug, e-mail, telefone..." value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <div className="flex flex-wrap gap-1">
                {(["all","active","pending_payment","suspended","cancelled"] as const).map((k) => (
                  <Button key={k} size="sm" variant={filter === k ? "default" : "outline"} onClick={() => setFilter(k)}>
                    {k === "all" ? `Todas (${list.length})`
                      : k === "active" ? `Ativas (${ativas})`
                      : k === "pending_payment" ? `Aguard. (${aguardando})`
                      : k === "suspended" ? `Susp. (${suspensas})`
                      : `Canc. (${canceladas})`}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <div className="p-6 text-center text-muted-foreground">Carregando lojas...</div>}
          {error && <div className="p-6 text-center text-destructive">{(error as Error).message}</div>}
          {!isLoading && list.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma loja cadastrada ainda.</div>
          )}
          {!isLoading && list.length > 0 && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">Nenhuma loja corresponde ao filtro.</div>
          )}
          <div className="divide-y">
            {filtered.map((s) => (
              <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{s.nome_fantasia}</span>
                    <Badge variant={STATUS_VARIANT[s.subscription_status]}>{STATUS_LABEL[s.subscription_status]}</Badge>
                    <Badge variant="outline" className="capitalize">{s.plan}</Badge>
                    {s.setup_paid_at && <Badge variant="outline" className="text-green-700 border-green-300">Setup pago</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    /{s.slug} · {s.owner_name ?? "sem nome"} · {s.owner_email ?? "-"} · {s.owner_phone ?? s.telefone ?? "sem telefone"}
                  </div>
                  {s.mrr_amount > 0 && (
                    <div className="text-xs mt-0.5 text-green-700">R$ {Number(s.mrr_amount).toFixed(2)}/mês</div>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Criada em {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    {s.activated_at && ` · Ativada ${new Date(s.activated_at).toLocaleDateString("pt-BR")}`}
                    {s.cancelled_at && ` · Cancelada ${new Date(s.cancelled_at).toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" variant="outline" onClick={() => setEditing(s)}>
                    <Settings2 className="h-4 w-4" /> Gerenciar
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <EditDialog store={editing} onClose={() => setEditing(null)} onSaved={() => qc.invalidateQueries({ queryKey: ["admin-stores"] })} />
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string | number; accent?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}<span>{label}</span></div>
        <div className={`mt-1 text-2xl font-bold ${accent ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function EditDialog({ store, onClose, onSaved }: { store: StoreRow | null; onClose: () => void; onSaved: () => void }) {
  const update = useServerFn(updateStoreSubscription);
  const [status, setStatus] = useState<StoreRow["subscription_status"]>("pending_payment");
  const [plan, setPlan] = useState<StoreRow["plan"]>("starter");
  const [mrr, setMrr] = useState("0");
  const [setupPago, setSetupPago] = useState(false);
  const [notes, setNotes] = useState("");

  const initialized = useState({ id: "" })[0];
  if (store && initialized.id !== store.id) {
    initialized.id = store.id;
    setStatus(store.subscription_status);
    setPlan(store.plan);
    setMrr(String(store.mrr_amount ?? 0));
    setSetupPago(!!store.setup_paid_at);
    setNotes(store.admin_notes ?? "");
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!store) return;
      await update({
        data: {
          store_id: store.id,
          subscription_status: status,
          plan,
          mrr_amount: parseFloat(mrr) || 0,
          setup_paid: setupPago,
          admin_notes: notes || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Loja atualizada");
      onSaved();
      onClose();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Dialog open={!!store} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerenciar loja</DialogTitle>
        </DialogHeader>
        {store && (
          <div className="space-y-4">
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="font-semibold">{store.nome_fantasia}</div>
              <div className="text-xs text-muted-foreground">/{store.slug} · {store.owner_email}</div>
            </div>

            <div className="space-y-2">
              <Label>Status da assinatura</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StoreRow["subscription_status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending_payment">Aguardando pagamento</SelectItem>
                  <SelectItem value="active">Ativa</SelectItem>
                  <SelectItem value="suspended">Suspensa</SelectItem>
                  <SelectItem value="cancelled">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Plano</Label>
                <Select value={plan} onValueChange={(v) => setPlan(v as StoreRow["plan"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mensalidade (R$)</Label>
                <Input type="number" step="0.01" value={mrr} onChange={(e) => setMrr(e.target.value)} />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={setupPago} onChange={(e) => setSetupPago(e.target.checked)} />
              Setup / implementação pago
            </label>

            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Observações sobre este cliente" />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setStatus("suspended"); }}
              >
                <Pause className="h-4 w-4" /> Suspender
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => { setStatus("cancelled"); }}
              >
                <Ban className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}