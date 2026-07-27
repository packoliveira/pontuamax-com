import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  listAllStores,
  updateStoreSubscription,
  bootstrapFirstAdmin,
  isCurrentUserAdmin,
  listAdmins,
  addAdminByEmail,
  removeAdmin,
  listAuditLogs,
  changeMyPassword,
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
import {
  Store,
  DollarSign,
  TrendingUp,
  Users,
  Ban,
  CheckCircle2,
  Pause,
  Settings2,
  Search,
  UserPlus,
  TrendingDown,
  ShieldCheck,
  Trash2,
  KeyRound,
  ScrollText,
  Tags,
} from "lucide-react";
import { Copy, ExternalLink, Link2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
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
const STATUS_VARIANT: Record<
  StoreRow["subscription_status"],
  "default" | "secondary" | "outline" | "destructive"
> = {
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

  const {
    data: adminCheck,
    isLoading: loadingAdmin,
    refetch: refetchAdmin,
  } = useQuery({
    queryKey: ["is-admin"],
    queryFn: () => checkAdmin(),
  });

  const {
    data: stores,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-stores"],
    queryFn: () => fetchStores() as Promise<StoreRow[]>,
    enabled: adminCheck?.isAdmin === true,
  });

  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | StoreRow["subscription_status"]>("all");

  const list = stores ?? [];
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

  if (loadingAdmin)
    return <div className="text-center py-12 text-muted-foreground">Carregando...</div>;

  if (!adminCheck?.isAdmin) {
    return (
      <div className="max-w-md mx-auto mt-12">
        <Card>
          <CardHeader>
            <CardTitle>Área administrativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Você não tem permissão de administrador. Se esta é uma instalação nova e ainda não
              existe nenhum admin, você pode se promover:
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

  const mrrTotal = list
    .filter((s) => s.subscription_status === "active")
    .reduce((a, s) => a + Number(s.mrr_amount || 0), 0);
  const mrrPotencial = list
    .filter((s) => s.subscription_status === "pending_payment")
    .reduce((a, s) => a + Number(s.mrr_amount || 0), 0);
  const ativas = list.filter((s) => s.subscription_status === "active").length;
  const aguardando = list.filter((s) => s.subscription_status === "pending_payment").length;
  const suspensas = list.filter((s) => s.subscription_status === "suspended").length;
  const canceladas = list.filter((s) => s.subscription_status === "cancelled").length;

  const now = new Date();
  const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const novasMes = list.filter((s) => new Date(s.created_at).getTime() >= inicioMes).length;
  const churnMes = list.filter(
    (s) => s.cancelled_at && new Date(s.cancelled_at).getTime() >= inicioMes,
  ).length;
  const arr = mrrTotal * 12;
  const ticketMedio = ativas > 0 ? mrrTotal / ativas : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das lojas e assinaturas</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="MRR"
          value={`R$ ${mrrTotal.toFixed(2)}`}
          accent="text-green-600"
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          label="ARR projetado"
          value={`R$ ${arr.toFixed(0)}`}
          accent="text-emerald-600"
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="Ticket médio"
          value={`R$ ${ticketMedio.toFixed(2)}`}
        />
        <StatCard
          icon={<DollarSign className="h-5 w-5" />}
          label="MRR potencial (aguard.)"
          value={`R$ ${mrrPotencial.toFixed(2)}`}
          accent="text-amber-600"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={<Store className="h-5 w-5" />} label="Lojas totais" value={list.length} />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5" />}
          label="Ativas"
          value={ativas}
          accent="text-green-600"
        />
        <StatCard
          icon={<UserPlus className="h-5 w-5" />}
          label="Novas este mês"
          value={novasMes}
          accent="text-blue-600"
        />
        <StatCard
          icon={<TrendingDown className="h-5 w-5" />}
          label="Churn este mês"
          value={churnMes}
          accent={churnMes > 0 ? "text-red-600" : undefined}
        />
      </div>

      <QuickLinksSection />

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="flex items-center gap-2 text-base">
              <Tags className="h-4 w-4 text-primary" /> Planos de assinatura
            </CardTitle>
            <Button asChild size="sm">
              <Link to="/admin/planos">Gerenciar planos</Link>
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Configure preços, limites e recursos comercializados aos lojistas.
          </p>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Lojas ({filtered.length}
              {filtered.length !== list.length ? ` de ${list.length}` : ""})
            </CardTitle>
            <div className="flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Buscar por nome, slug, e-mail, telefone..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {(["all", "active", "pending_payment", "suspended", "cancelled"] as const).map(
                  (k) => (
                    <Button
                      key={k}
                      size="sm"
                      variant={filter === k ? "default" : "outline"}
                      onClick={() => setFilter(k)}
                    >
                      {k === "all"
                        ? `Todas (${list.length})`
                        : k === "active"
                          ? `Ativas (${ativas})`
                          : k === "pending_payment"
                            ? `Aguard. (${aguardando})`
                            : k === "suspended"
                              ? `Susp. (${suspensas})`
                              : `Canc. (${canceladas})`}
                    </Button>
                  ),
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && (
            <div className="p-6 text-center text-muted-foreground">Carregando lojas...</div>
          )}
          {error && (
            <div className="p-6 text-center text-destructive">{(error as Error).message}</div>
          )}
          {!isLoading && list.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma loja cadastrada ainda.
            </div>
          )}
          {!isLoading && list.length > 0 && filtered.length === 0 && (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma loja corresponde ao filtro.
            </div>
          )}
          <div className="divide-y">
            {filtered.map((s) => (
              <div key={s.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{s.nome_fantasia}</span>
                    <Badge variant={STATUS_VARIANT[s.subscription_status]}>
                      {STATUS_LABEL[s.subscription_status]}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {s.plan}
                    </Badge>
                    {s.setup_paid_at && (
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        Setup pago
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 truncate">
                    /{s.slug} · {s.owner_name ?? "sem nome"} · {s.owner_email ?? "-"} ·{" "}
                    {s.owner_phone ?? s.telefone ?? "sem telefone"}
                  </div>
                  {s.mrr_amount > 0 && (
                    <div className="text-xs mt-0.5 text-green-700">
                      R$ {Number(s.mrr_amount).toFixed(2)}/mês
                    </div>
                  )}
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Criada em {new Date(s.created_at).toLocaleDateString("pt-BR")}
                    {s.activated_at &&
                      ` · Ativada ${new Date(s.activated_at).toLocaleDateString("pt-BR")}`}
                    {s.cancelled_at &&
                      ` · Cancelada ${new Date(s.cancelled_at).toLocaleDateString("pt-BR")}`}
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

      <EditDialog
        store={editing}
        onClose={() => setEditing(null)}
        onSaved={() => qc.invalidateQueries({ queryKey: ["admin-stores"] })}
      />

      <AdminsSection />
      <ChangePasswordSection />
      <AuditLogSection />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {icon}
          <span>{label}</span>
        </div>
        <div className={`mt-1 text-2xl font-bold ${accent ?? ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function QuickLinksSection() {
  const base = typeof window !== "undefined" ? window.location.origin : "https://pontuamax.com";
  const groups: Array<{
    title: string;
    color: string;
    items: Array<{ label: string; path: string; desc: string }>;
  }> = [
    {
      title: "Admin Master",
      color: "text-red-600",
      items: [
        { label: "Login Admin", path: "/admin/login", desc: "Acesso do dono do sistema (você)" },
        { label: "Painel Admin", path: "/admin", desc: "Dashboard global" },
      ],
    },
    {
      title: "Lojista",
      color: "text-blue-600",
      items: [
        { label: "Login Lojista", path: "/lojista/login", desc: "Donos de loja assinantes" },
        { label: "Painel Lojista", path: "/lojista", desc: "Dashboard da loja" },
        { label: "Cadastro Lojista", path: "/lojista/cadastro", desc: "Nova loja / assinar plano" },
      ],
    },
    {
      title: "Vendedor",
      color: "text-purple-600",
      items: [
        { label: "Login do Vendedor", path: "/funcionario/login", desc: "Vendedores da loja" },
        {
          label: "Painel do Vendedor",
          path: "/funcionario",
          desc: "Operação de caixa/atendimento",
        },
      ],
    },
    {
      title: "Cliente Final",
      color: "text-emerald-600",
      items: [
        { label: "Login / Cadastro Cliente", path: "/auth", desc: "Consumidor acumula pontos" },
        { label: "Painel Cliente", path: "/cliente", desc: "Extrato e resgates" },
      ],
    },
  ];

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copiado!"),
      () => toast.error("Não foi possível copiar"),
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4 text-red-600" /> Links de acesso da plataforma
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {groups.map((g) => (
          <div key={g.title} className="rounded-lg border p-3 space-y-2">
            <div className={`font-semibold text-sm ${g.color}`}>{g.title}</div>
            <div className="space-y-1.5">
              {g.items.map((it) => {
                const url = `${base}${it.path}`;
                return (
                  <div key={it.path} className="rounded-md bg-muted/50 p-2 space-y-1">
                    <div className="text-xs font-medium">{it.label}</div>
                    <div className="text-[10px] text-muted-foreground leading-tight">{it.desc}</div>
                    <code className="block text-[10px] break-all bg-background rounded px-1.5 py-1 border">
                      {url}
                    </code>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] flex-1"
                        onClick={() => copy(url)}
                      >
                        <Copy className="h-3 w-3" /> Copiar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2 text-[10px] flex-1"
                        asChild
                      >
                        <a href={it.path} target="_blank" rel="noreferrer">
                          <ExternalLink className="h-3 w-3" /> Abrir
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AdminsSection() {
  const qc = useQueryClient();
  const fetchAdmins = useServerFn(listAdmins);
  const addAdmin = useServerFn(addAdminByEmail);
  const rmAdmin = useServerFn(removeAdmin);
  const [email, setEmail] = useState("");

  const { data: admins, isLoading } = useQuery({
    queryKey: ["admins-list"],
    queryFn: () =>
      fetchAdmins() as Promise<
        Array<{ user_id: string; email: string | null; full_name: string | null; is_me: boolean }>
      >,
  });

  const add = useMutation({
    mutationFn: async () => addAdmin({ data: { email: email.trim() } }),
    onSuccess: () => {
      toast.success("Admin adicionado com sucesso.");
      setEmail("");
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const remove = useMutation({
    mutationFn: async (user_id: string) => rmAdmin({ data: { user_id } }),
    onSuccess: () => {
      toast.success("Admin removido.");
      qc.invalidateQueries({ queryKey: ["admins-list"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-red-600" /> Administradores Master
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            add.mutate();
          }}
        >
          <Input
            type="email"
            placeholder="email@dominio.com da conta a promover"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" disabled={add.isPending}>
            <UserPlus className="h-4 w-4" />
            {add.isPending ? "Adicionando..." : "Adicionar admin"}
          </Button>
        </form>
        <p className="text-[11px] text-muted-foreground">
          A pessoa precisa já ter uma conta criada no sistema. O papel de admin é concedido
          imediatamente e ela poderá acessar em <code>/admin/login</code>.
        </p>

        <div className="divide-y rounded-md border">
          {isLoading && (
            <div className="p-4 text-sm text-muted-foreground text-center">Carregando...</div>
          )}
          {!isLoading && (admins ?? []).length === 0 && (
            <div className="p-4 text-sm text-muted-foreground text-center">
              Nenhum admin cadastrado.
            </div>
          )}
          {(admins ?? []).map((a) => (
            <div key={a.user_id} className="p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate flex items-center gap-2">
                  {a.full_name ?? a.email ?? a.user_id}
                  {a.is_me && (
                    <Badge variant="outline" className="text-[10px]">
                      você
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {a.email ?? "sem email"}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={a.is_me || remove.isPending}
                onClick={() => {
                  if (confirm(`Remover acesso admin de ${a.email ?? a.user_id}?`)) {
                    remove.mutate(a.user_id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4" />
                Remover
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EditDialog({
  store,
  onClose,
  onSaved,
}: {
  store: StoreRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
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
              <div className="text-xs text-muted-foreground">
                /{store.slug} · {store.owner_email}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Status da assinatura</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as StoreRow["subscription_status"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
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
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mensalidade (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={mrr}
                  onChange={(e) => setMrr(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={setupPago}
                onChange={(e) => setSetupPago(e.target.checked)}
              />
              Setup / implementação pago
            </label>

            <div className="space-y-2">
              <Label>Notas internas</Label>
              <Textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Observações sobre este cliente"
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setStatus("suspended");
                }}
              >
                <Pause className="h-4 w-4" /> Suspender
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  setStatus("cancelled");
                }}
              >
                <Ban className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Fechar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ChangePasswordSection() {
  const change = useServerFn(changeMyPassword);
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const mut = useMutation({
    mutationFn: async () => change({ data: { current_password: cur, new_password: next } }),
    onSuccess: () => {
      toast.success("Senha alterada com sucesso.");
      setCur("");
      setNext("");
      setConfirm("");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <KeyRound className="h-4 w-4 text-red-600" /> Alterar minha senha
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3 sm:grid-cols-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (next.length < 8)
              return toast.error("A nova senha precisa ter no mínimo 8 caracteres.");
            if (next !== confirm) return toast.error("A confirmação não confere.");
            mut.mutate();
          }}
        >
          <div className="space-y-1">
            <Label>Senha atual</Label>
            <Input
              type="password"
              value={cur}
              onChange={(e) => setCur(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1">
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <Label>Confirmar nova</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={mut.isPending}>
              {mut.isPending ? "Alterando..." : "Alterar senha"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

const ACTION_LABEL: Record<string, string> = {
  "admin.added": "Adicionou admin",
  "admin.removed": "Removeu admin",
  "admin.password_changed": "Alterou própria senha",
  "store.subscription_updated": "Atualizou assinatura de loja",
};

function AuditLogSection() {
  const fetchLogs = useServerFn(listAuditLogs);
  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: () =>
      fetchLogs() as Promise<
        Array<{
          id: string;
          actor_id: string;
          actor_email: string | null;
          action: string;
          target_type: string | null;
          target_id: string | null;
          target_label: string | null;
          details: Record<string, unknown>;
          created_at: string;
        }>
      >,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ScrollText className="h-4 w-4 text-red-600" /> Log de auditoria
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading && (
          <div className="p-6 text-center text-sm text-muted-foreground">Carregando...</div>
        )}
        {!isLoading && (data ?? []).length === 0 && (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nenhum evento registrado ainda.
          </div>
        )}
        <div className="divide-y max-h-[500px] overflow-y-auto">
          {(data ?? []).map((log) => (
            <div key={log.id} className="p-3 text-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {ACTION_LABEL[log.action] ?? log.action}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(log.created_at).toLocaleString("pt-BR")}
                </span>
              </div>
              <div className="mt-1 text-xs">
                <span className="text-muted-foreground">Por:</span>{" "}
                <span className="font-medium">{log.actor_email ?? log.actor_id}</span>
                {log.target_label && (
                  <>
                    <span className="text-muted-foreground"> · Alvo:</span>{" "}
                    <span className="font-medium">{log.target_label}</span>
                  </>
                )}
              </div>
              {log.details && Object.keys(log.details).length > 0 && (
                <pre className="mt-1 text-[10px] bg-muted rounded p-2 overflow-x-auto">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
