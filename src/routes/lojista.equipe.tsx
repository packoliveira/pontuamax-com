import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useHasSession } from "@/hooks/use-has-session";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  rolesAndPermsQuery,
  employeesQuery,
  employeePermsQuery,
  teamAuditLogsQuery,
} from "@/lib/team-queries";
import {
  createEmployee,
  updateEmployee,
  setEmployeeStatus,
  deleteEmployee,
  resetEmployeePassword,
  setEmployeePermissionOverrides,
} from "@/lib/team.functions";
import type { Employee, TeamPermission, EmployeePermissionOverride } from "@/lib/team-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PasswordInput } from "@/components/ui/password-input";
import {
  UserPlus,
  Search,
  ShieldCheck,
  KeyRound,
  Trash2,
  Power,
  Pencil,
  Users,
  Filter,
  ScrollText,
  LogIn,
  Copy,
} from "lucide-react";

export const Route = createFileRoute("/lojista/equipe")({
  ssr: false,
  component: EquipePage,
});

function EquipePage() {
  const qc = useQueryClient();
  const hasSession = useHasSession() === true;
  const { data: catalog } = useQuery(rolesAndPermsQuery(hasSession));
  const { data: employees = [] } = useQuery(employeesQuery(hasSession));
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("todos");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [openCreate, setOpenCreate] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [managingPerms, setManagingPerms] = useState<Employee | null>(null);
  const [resetting, setResetting] = useState<Employee | null>(null);

  const roles = catalog?.roles ?? [];
  const perms = (catalog?.permissions ?? []) as TeamPermission[];
  const rolePerms = catalog?.rolePermissions ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (employees as Employee[]).filter((e) => {
      if (roleFilter !== "todos" && e.role_key !== roleFilter) return false;
      if (statusFilter !== "todos" && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.nome.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.cpf ?? "").toLowerCase().includes(q) ||
        (e.phone ?? "").toLowerCase().includes(q)
      );
    });
  }, [employees, search, roleFilter, statusFilter]);

  const mDelete = useMutation({
    mutationFn: (id: string) => deleteEmployee({ data: { id } }),
    onSuccess: () => {
      toast.success("Vendedor removido.");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mToggle = useMutation({
    mutationFn: (v: { id: string; status: "ativo" | "inativo" }) => setEmployeeStatus({ data: v }),
    onSuccess: () => {
      toast.success("Status atualizado.");
      qc.invalidateQueries({ queryKey: ["team"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Equipe"
        icon={<Users className="h-6 w-6 text-primary" />}
        description="Gerencie vendedores, cargos e permissões da sua loja."
        actions={
          <>
          <Button
            asChild
            variant="outline"
            className="rounded-xl border-border text-foreground hover:bg-muted/40"
          >
            <a href="/funcionario/login" target="_blank" rel="noreferrer">
              <LogIn className="h-4 w-4" /> Acesso do vendedor
            </a>
          </Button>
          <Button
            variant="outline"
            className="rounded-xl border-border text-foreground hover:bg-muted/40"
            onClick={() => {
              const url = `${window.location.origin}/funcionario/login`;
              navigator.clipboard?.writeText(url);
              toast.success("Link copiado: " + url);
            }}
          >
            <Copy className="h-4 w-4" /> Copiar link
          </Button>
          <Button
            onClick={() => setOpenCreate(true)}
            className="rounded-xl bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-md hover:opacity-95"
          >
            <UserPlus className="h-4 w-4" /> Cadastrar vendedor
          </Button>
          </>
        }
      />

      <Tabs defaultValue="lista" className="space-y-4">
        <TabsList>
          <TabsTrigger value="lista">
            <Users className="h-4 w-4" /> Vendedores
          </TabsTrigger>
          <TabsTrigger value="logs">
            <ScrollText className="h-4 w-4" /> Logs de acesso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="space-y-4">
          <Card className="rounded-2xl border-border">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9 rounded-xl"
                    placeholder="Buscar por nome, e-mail, CPF ou telefone…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-44 rounded-xl">
                      <Filter className="h-3.5 w-3.5" />
                      <SelectValue placeholder="Cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os cargos</SelectItem>
                      {roles.map((r) => (
                        <SelectItem key={r.key} value={r.key}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-36 rounded-xl">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos</SelectItem>
                      <SelectItem value="ativo">Ativos</SelectItem>
                      <SelectItem value="inativo">Inativos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-border">
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                {filtered.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    Nenhum vendedor encontrado. Clique em <strong>Cadastrar vendedor</strong>{" "}
                    para começar.
                  </div>
                ) : (
                  filtered.map((emp) => {
                    const role = roles.find((r) => r.key === emp.role_key);
                    return (
                      <div
                        key={emp.id}
                        className="flex flex-col md:flex-row md:items-center gap-3 p-4"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white grid place-items-center font-semibold">
                            {emp.nome.slice(0, 1).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-foreground truncate">{emp.nome}</div>
                            <div className="text-xs text-muted-foreground truncate">
                              {emp.email}
                              {emp.phone ? ` • ${emp.phone}` : ""}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="rounded-full">
                            {role?.label ?? emp.role_key}
                          </Badge>
                          <Badge
                            className={
                              emp.status === "ativo"
                                ? "rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                                : "rounded-full bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                            }
                            variant="secondary"
                          >
                            {emp.status === "ativo" ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => setManagingPerms(emp)}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Permissões
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => setEditing(emp)}
                          >
                            <Pencil className="h-3.5 w-3.5" /> Editar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() => setResetting(emp)}
                          >
                            <KeyRound className="h-3.5 w-3.5" /> Senha
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            onClick={() =>
                              mToggle.mutate({
                                id: emp.id,
                                status: emp.status === "ativo" ? "inativo" : "ativo",
                              })
                            }
                          >
                            <Power className="h-3.5 w-3.5" />{" "}
                            {emp.status === "ativo" ? "Desativar" : "Ativar"}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg text-red-600 hover:bg-red-50"
                            onClick={() => {
                              if (confirm(`Excluir ${emp.nome}? Esta ação não pode ser desfeita.`))
                                mDelete.mutate(emp.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs">
          <AuditLogsPanel />
        </TabsContent>
      </Tabs>

      <CreateOrEditDialog
        open={openCreate || !!editing}
        onOpenChange={(v) => {
          if (!v) {
            setOpenCreate(false);
            setEditing(null);
          }
        }}
        employee={editing}
        roles={roles}
      />

      <PermissionsDialog
        employee={managingPerms}
        permissions={perms}
        rolePermissions={rolePerms}
        onOpenChange={(v) => {
          if (!v) setManagingPerms(null);
        }}
      />

      <ResetPasswordDialog
        employee={resetting}
        onOpenChange={(v) => {
          if (!v) setResetting(null);
        }}
      />
    </div>
  );
}

function CreateOrEditDialog({
  open,
  onOpenChange,
  employee,
  roles,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: Employee | null;
  roles: { key: string; label: string }[];
}) {
  const qc = useQueryClient();
  const { data: catalog } = useQuery(rolesAndPermsQuery());
  const permissions = (catalog?.permissions ?? []) as TeamPermission[];
  const rolePermissions = catalog?.rolePermissions ?? [];
  const [form, setForm] = useState({
    nome: "",
    cpf: "",
    email: "",
    phone: "",
    role_key: "funcionario",
    password: "",
  });
  // permissões efetivas escolhidas no cadastro (permission_key -> granted)
  const [permState, setPermState] = useState<Map<string, boolean>>(new Map());
  const isEdit = !!employee;

  const roleDefault = useMemo(
    () =>
      new Set(
        rolePermissions
          .filter((rp) => rp.role_key === form.role_key)
          .map((rp) => rp.permission_key),
      ),
    [rolePermissions, form.role_key],
  );

  // Ao trocar de cargo (ou abrir), reinicializa checklist com o padrão do cargo
  useEffect(() => {
    if (!open || isEdit) return;
    const m = new Map<string, boolean>();
    for (const p of permissions) m.set(p.key, roleDefault.has(p.key));
    setPermState(m);
  }, [open, isEdit, form.role_key, permissions, roleDefault]);

  const groupedPerms = useMemo(() => {
    const g = new Map<string, TeamPermission[]>();
    for (const p of permissions) {
      if (!g.has(p.category)) g.set(p.category, []);
      g.get(p.category)!.push(p);
    }
    return Array.from(g.entries());
  }, [permissions]);

  useEffect(() => {
    if (!open) return;
    if (employee) {
      setForm({
        nome: employee.nome,
        cpf: employee.cpf ?? "",
        email: employee.email,
        phone: employee.phone ?? "",
        role_key: employee.role_key,
        password: "",
      });
    } else {
      setForm({ nome: "", cpf: "", email: "", phone: "", role_key: "funcionario", password: "" });
    }
  }, [open, employee]);

  const mCreate = useMutation({
    mutationFn: () => {
      // apenas overrides = diferenças em relação ao padrão do cargo
      const overrides: { permission_key: string; granted: boolean }[] = [];
      for (const p of permissions) {
        const chosen = permState.get(p.key) === true;
        const def = roleDefault.has(p.key);
        if (chosen !== def) overrides.push({ permission_key: p.key, granted: chosen });
      }
      return createEmployee({
        data: {
          nome: form.nome,
          cpf: form.cpf || null,
          email: form.email,
          phone: form.phone || null,
          role_key: form.role_key,
          password: form.password,
          overrides,
        },
      });
    },
    onSuccess: () => {
      toast.success("Vendedor cadastrado.");
      qc.invalidateQueries({ queryKey: ["team"] });
      onOpenChange(false);
      setForm({ nome: "", cpf: "", email: "", phone: "", role_key: "funcionario", password: "" });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const mUpdate = useMutation({
    mutationFn: () =>
      updateEmployee({
        data: {
          id: employee!.id,
          nome: form.nome,
          cpf: form.cpf || null,
          phone: form.phone || null,
          role_key: form.role_key,
        },
      }),
    onSuccess: () => {
      toast.success("Vendedor atualizado.");
      qc.invalidateQueries({ queryKey: ["team"] });
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v)
          setForm({
            nome: "",
            cpf: "",
            email: "",
            phone: "",
            role_key: "funcionario",
            password: "",
          });
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar vendedor" : "Cadastrar vendedor"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Atualize os dados do vendedor."
              : "O vendedor receberá acesso ao painel reduzido."}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label>Nome completo *</Label>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>CPF</Label>
              <Input
                value={form.cpf}
                onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Telefone</Label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>
              E-mail *{" "}
              {isEdit && (
                <span className="text-xs text-muted-foreground">(não pode ser alterado)</span>
              )}
            </Label>
            <Input
              type="email"
              value={form.email}
              disabled={isEdit}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Cargo *</Label>
            <Select value={form.role_key} onValueChange={(v) => setForm({ ...form, role_key: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles
                  .filter((r) => r.key !== "proprietario")
                  .map((r) => (
                    <SelectItem key={r.key} value={r.key}>
                      {r.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          {!isEdit && (
            <div className="grid gap-1.5">
              <Label>
                Senha inicial *{" "}
                <span className="text-xs text-muted-foreground">(mín. 8 caracteres)</span>
              </Label>
              <PasswordInput
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          )}
          {!isEdit && permissions.length > 0 && (
            <div className="grid gap-2 pt-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm">
                  Permissões do cargo{" "}
                  <span className="text-xs text-muted-foreground">
                    ({roles.find((r) => r.key === form.role_key)?.label ?? form.role_key})
                  </span>
                </Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    const m = new Map<string, boolean>();
                    for (const p of permissions) m.set(p.key, roleDefault.has(p.key));
                    setPermState(m);
                  }}
                >
                  Restaurar padrão do cargo
                </button>
              </div>
              <div className="text-xs text-muted-foreground">
                Marque ou desmarque o que este vendedor poderá acessar. Você pode ajustar depois
                em "Permissões".
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto rounded-xl border border-border p-3">
                {groupedPerms.map(([cat, list]) => (
                  <div key={cat}>
                    <div className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {cat}
                    </div>
                    <div className="grid sm:grid-cols-2 gap-1.5">
                      {list.map((p) => {
                        const on = permState.get(p.key) === true;
                        const def = roleDefault.has(p.key);
                        return (
                          <label
                            key={p.key}
                            className="flex items-start gap-2 text-sm p-2 rounded-lg hover:bg-muted/40 cursor-pointer"
                            title={p.description}
                          >
                            <input
                              type="checkbox"
                              className="mt-0.5 h-4 w-4 rounded border-[#CBD5E1] text-primary"
                              checked={on}
                              onChange={(e) => {
                                const next = new Map(permState);
                                next.set(p.key, e.target.checked);
                                setPermState(next);
                              }}
                            />
                            <span className="flex-1">
                              <span className="text-foreground">{p.label}</span>
                              {on !== def && (
                                <span className="ml-1 text-[10px] text-amber-700">(alterado)</span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => (isEdit ? mUpdate.mutate() : mCreate.mutate())}
            disabled={mCreate.isPending || mUpdate.isPending}
            className="bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white"
          >
            {isEdit ? "Salvar alterações" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResetPasswordDialog({
  employee,
  onOpenChange,
}: {
  employee: Employee | null;
  onOpenChange: (v: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const m = useMutation({
    mutationFn: () => resetEmployeePassword({ data: { id: employee!.id, new_password: password } }),
    onSuccess: () => {
      toast.success("Senha redefinida.");
      setPassword("");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog
      open={!!employee}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setPassword("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Redefinir senha</DialogTitle>
          <DialogDescription>
            Nova senha para <strong>{employee?.nome}</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label>Nova senha (mín. 8 caracteres)</Label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => m.mutate()} disabled={m.isPending || password.length < 8}>
            Redefinir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PermissionsDialog({
  employee,
  permissions,
  rolePermissions,
  onOpenChange,
}: {
  employee: Employee | null;
  permissions: TeamPermission[];
  rolePermissions: { role_key: string; permission_key: string }[];
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const { data: overrides = [] } = useQuery(employeePermsQuery(employee?.id ?? null));
  const roleDefault = useMemo(
    () =>
      new Set(
        employee
          ? rolePermissions
              .filter((rp) => rp.role_key === employee.role_key)
              .map((rp) => rp.permission_key)
          : [],
      ),
    [rolePermissions, employee],
  );
  const overrideMap = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const o of overrides as EmployeePermissionOverride[]) m.set(o.permission_key, o.granted);
    return m;
  }, [overrides]);

  // effective state (permission → granted)
  const [state, setState] = useState<Map<string, boolean> | null>(null);
  const initial = useMemo(() => {
    const m = new Map<string, boolean>();
    for (const p of permissions) {
      const ov = overrideMap.get(p.key);
      m.set(p.key, ov !== undefined ? ov : roleDefault.has(p.key));
    }
    return m;
  }, [permissions, overrideMap, roleDefault]);
  const eff = state ?? initial;

  const grouped = useMemo(() => {
    const g = new Map<string, TeamPermission[]>();
    for (const p of permissions) {
      if (!g.has(p.category)) g.set(p.category, []);
      g.get(p.category)!.push(p);
    }
    return Array.from(g.entries());
  }, [permissions]);

  const mSave = useMutation({
    mutationFn: () => {
      const overridesPayload: { permission_key: string; granted: boolean }[] = [];
      for (const p of permissions) {
        const current = eff.get(p.key) === true;
        const roleHas = roleDefault.has(p.key);
        if (current !== roleHas) overridesPayload.push({ permission_key: p.key, granted: current });
      }
      return setEmployeePermissionOverrides({
        data: { employee_id: employee!.id, overrides: overridesPayload },
      });
    },
    onSuccess: () => {
      toast.success("Permissões atualizadas.");
      qc.invalidateQueries({ queryKey: ["team"] });
      onOpenChange(false);
      setState(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog
      open={!!employee}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setState(null);
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Permissões de {employee?.nome}</DialogTitle>
          <DialogDescription>
            Ative ou desative permissões individuais. O padrão vem do cargo — alterações aqui
            sobrepõem o cargo.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {grouped.map(([cat, list]) => (
            <div key={cat}>
              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                {cat}
              </div>
              <div className="rounded-xl border border-border divide-y divide-border">
                {list.map((p) => {
                  const on = eff.get(p.key) === true;
                  const isDefault = roleDefault.has(p.key);
                  return (
                    <div key={p.key} className="flex items-start gap-3 p-3">
                      <Switch
                        checked={on}
                        onCheckedChange={(v) => {
                          const next = new Map(eff);
                          next.set(p.key, v);
                          setState(next);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm text-foreground">{p.label}</span>
                          {isDefault && (
                            <Badge variant="secondary" className="text-[10px]">
                              padrão do cargo
                            </Badge>
                          )}
                          {on !== isDefault && (
                            <Badge className="text-[10px] bg-amber-100 text-amber-800">
                              override
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">{p.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setState(null);
              onOpenChange(false);
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => mSave.mutate()}
            disabled={mSave.isPending}
            className="bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white"
          >
            Salvar permissões
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AuditLogsPanel() {
  const hasSession = useHasSession() === true;
  const { data: logs = [] } = useQuery(teamAuditLogsQuery(hasSession));
  return (
    <Card className="rounded-2xl border-border">
      <CardContent className="p-0">
        <div className="divide-y divide-border">
          {logs.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">Sem registros ainda.</div>
          ) : (
            logs.map((l: any) => (
              <div
                key={l.id}
                className="p-3 text-sm flex flex-col md:flex-row md:items-center gap-2"
              >
                <div className="text-[11px] text-muted-foreground w-40 shrink-0">
                  {new Date(l.created_at).toLocaleString("pt-BR")}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-semibold text-foreground">{l.action}</span>
                  {l.target_label && <span className="text-muted-foreground"> — {l.target_label}</span>}
                </div>
                <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                  {l.ip ?? ""} {l.user_agent ? `• ${String(l.user_agent).slice(0, 40)}…` : ""}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
