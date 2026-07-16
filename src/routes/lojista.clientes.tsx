import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeClientsQuery, clientTagsQuery } from "@/lib/queries";
import {
  atualizarAniversarioCliente,
  addClientTag,
  removeClientTag,
  cadastrarClientePorTelefone,
  atualizarClienteInfo,
  ajustarPontosCliente,
  sincronizarClientesDaLoja,
  excluirClienteDaLoja,
} from "@/lib/qsf.functions";
import {
  formatBRL,
  formatDate,
  formatCPF,
  formatPhone,
  isValidCPF,
  onlyDigits,
} from "@/lib/qsf-shared";
import { NivelBadge } from "@/components/nivel-badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Cake,
  X,
  Plus,
  UserPlus,
  Pencil,
  Coins,
  Minus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/lojista/clientes")({
  ssr: false,
  component: ClientesPage,
});

type FiltroCampo = "todos" | "nome" | "telefone" | "cpf";
type FiltroNivel = "todos" | "bronze" | "prata" | "ouro";
type FiltroStatus = "todos" | "pendentes" | "cadastrados";

function SyncClientsButton({ storeId }: { storeId: string }) {
  const qc = useQueryClient();
  const m = useMutation({
    mutationFn: () => sincronizarClientesDaLoja(),
    onSuccess: (r: { criados: number }) => {
      toast.success(
        r.criados > 0
          ? `${r.criados} cliente(s) sincronizado(s).`
          : "Nenhum cliente novo para sincronizar.",
      );
      qc.invalidateQueries({ queryKey: ["store-clients", storeId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Button
      variant="outline"
      onClick={() => m.mutate()}
      disabled={m.isPending}
      className="rounded-xl border-[#E5E7EB] text-[#0F172A] hover:bg-[#F1F5F9]"
    >
      <RefreshCw className={`h-4 w-4 ${m.isPending ? "animate-spin" : ""}`} />
      Sincronizar clientes
    </Button>
  );
}

type ClienteProfile = {
  full_name: string | null;
  phone: string | null;
  cpf: string | null;
  birthdate: string | null;
};

function ClientesPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: clientes = [] } = useQuery(storeClientsQuery(loja?.id));
  const { data: tags = [] } = useQuery(clientTagsQuery(loja?.id));
  const [q, setQ] = useState("");
  const [filtroCampo, setFiltroCampo] = useState<FiltroCampo>("todos");
  const [filtroNivel, setFiltroNivel] = useState<FiltroNivel>("todos");
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>("todos");
  const [editing, setEditing] = useState<{ userId: string; value: string } | null>(null);
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const [openNew, setOpenNew] = useState(false);
  const [novo, setNovo] = useState({ nome: "", phone: "", cpf: "" });
  const [editInfo, setEditInfo] = useState<{
    user_id: string;
    full_name: string;
    phone: string;
    cpf: string;
  } | null>(null);
  const [pontosDlg, setPontosDlg] = useState<{
    user_id: string;
    nome: string;
    saldo: number;
    delta: string;
    motivo: string;
    op: "add" | "estorno";
  } | null>(null);
  const [excluirDlg, setExcluirDlg] = useState<{ user_id: string; nome: string } | null>(null);

  const criar = useMutation({
    mutationFn: () => {
      if (!novo.cpf.trim() || !isValidCPF(novo.cpf)) {
        throw new Error("CPF inválido. Verifique os dígitos informados.");
      }
      return cadastrarClientePorTelefone({
        data: {
          store_id: loja!.id,
          nome: novo.nome.trim(),
          phone: novo.phone.trim(),
          cpf: novo.cpf.trim(),
        },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      toast.success(`Cliente cadastrado. Senha inicial (CPF): ${res.senha_temporaria}`);
      setNovo({ nome: "", phone: "", cpf: "" });
      setOpenNew(false);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const salvarInfo = useMutation({
    mutationFn: () => {
      if (!editInfo) throw new Error("Sem cliente selecionado.");
      if (!editInfo.cpf.trim() || !isValidCPF(editInfo.cpf)) {
        throw new Error("CPF inválido. Verifique os dígitos informados.");
      }
      return atualizarClienteInfo({
        data: {
          store_id: loja!.id,
          client_user_id: editInfo.user_id,
          full_name: editInfo.full_name.trim(),
          phone: editInfo.phone.trim(),
          cpf: editInfo.cpf.trim(),
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      toast.success("Cadastro atualizado");
      setEditInfo(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const ajustarPts = useMutation({
    mutationFn: () => {
      if (!pontosDlg) throw new Error("Sem cliente selecionado.");
      const qtd = Math.floor(Number(pontosDlg.delta));
      if (!Number.isFinite(qtd) || qtd <= 0) throw new Error("Informe uma quantidade válida.");
      const delta = pontosDlg.op === "add" ? qtd : -qtd;
      return ajustarPontosCliente({
        data: {
          store_id: loja!.id,
          client_user_id: pontosDlg.user_id,
          delta,
          motivo: pontosDlg.motivo.trim() || undefined,
        },
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      toast.success(`Saldo atualizado: ${res.novo_saldo} pts`);
      setPontosDlg(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const excluir = useMutation({
    mutationFn: () => {
      if (!excluirDlg) throw new Error("Sem cliente selecionado.");
      return excluirClienteDaLoja({
        data: { store_id: loja!.id, client_user_id: excluirDlg.user_id },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      qc.invalidateQueries({ queryKey: ["client-tags"] });
      toast.success("Cliente removido desta loja.");
      setExcluirDlg(null);
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const addTag = useMutation({
    mutationFn: (v: { user_id: string; tag: string }) =>
      addClientTag({ data: { store_id: loja!.id, client_user_id: v.user_id, tag: v.tag } }),
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
    if (filtroNivel !== "todos" && c.nivel !== filtroNivel) return false;
    if (filtroStatus === "pendentes" && !c.pending_registration) return false;
    if (filtroStatus === "cadastrados" && c.pending_registration) return false;
    if (!q) return true;
    const s = q.toLowerCase().trim();
    const digits = q.replace(/\D/g, "");
    const p = c.profiles as unknown as ClienteProfile | null;
    const nome = (p?.full_name ?? "").toLowerCase();
    const tel = p?.phone ?? "";
    const cpf = p?.cpf ?? "";
    if (filtroCampo === "nome") return nome.includes(s);
    if (filtroCampo === "telefone") return digits.length > 0 && tel.includes(digits);
    if (filtroCampo === "cpf") return digits.length > 0 && cpf.includes(digits);
    return (
      nome.includes(s) || (digits.length > 0 && (tel.includes(digits) || cpf.includes(digits)))
    );
  });
  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";
  const pendentesCount = clientes.filter((c) => c.pending_registration).length;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-xs font-medium uppercase tracking-wider text-[#64748B]">
            Relacionamento
          </div>
          <h1 className="mt-1 text-2xl font-bold text-[#0F172A] md:text-3xl">Clientes</h1>
          <p className="mt-1 text-sm text-[#64748B]">
            {filtered.length} de {clientes.length} cliente(s)
            {pendentesCount > 0 && (
              <>
                {" · "}
                <button
                  type="button"
                  onClick={() => setFiltroStatus("pendentes")}
                  className="font-semibold text-[#B45309] hover:underline"
                >
                  {pendentesCount} pendente(s) de cadastro
                </button>
              </>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncClientsButton storeId={loja.id} />
          <Button
            size="lg"
            onClick={() => setOpenNew(true)}
            className="rounded-xl bg-[#2563EB] text-white shadow-sm hover:bg-[#1D4ED8]"
          >
            <UserPlus className="h-4 w-4" /> Cadastrar cliente
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94A3B8]" />
          <Input
            placeholder={
              filtroCampo === "nome"
                ? "Buscar por nome"
                : filtroCampo === "telefone"
                  ? "Buscar por telefone (só dígitos)"
                  : filtroCampo === "cpf"
                    ? "Buscar por CPF (só dígitos)"
                    : "Buscar por nome, telefone ou CPF"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 rounded-xl border-[#E5E7EB] bg-white pl-9 text-sm focus-visible:ring-[#2563EB]/30"
          />
        </div>
        <Select value={filtroCampo} onValueChange={(v) => setFiltroCampo(v as FiltroCampo)}>
          <SelectTrigger className="h-10 w-[150px] rounded-xl border-[#E5E7EB]">
            <SelectValue placeholder="Campo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os campos</SelectItem>
            <SelectItem value="nome">Nome</SelectItem>
            <SelectItem value="telefone">Telefone</SelectItem>
            <SelectItem value="cpf">CPF</SelectItem>
          </SelectContent>
        </Select>
        {inclP && (
          <Select value={filtroNivel} onValueChange={(v) => setFiltroNivel(v as FiltroNivel)}>
            <SelectTrigger className="h-10 w-[140px] rounded-xl border-[#E5E7EB]">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os níveis</SelectItem>
              <SelectItem value="bronze">Bronze</SelectItem>
              <SelectItem value="prata">Prata</SelectItem>
              <SelectItem value="ouro">Ouro</SelectItem>
            </SelectContent>
          </Select>
        )}
        <Select value={filtroStatus} onValueChange={(v) => setFiltroStatus(v as FiltroStatus)}>
          <SelectTrigger className="h-10 w-[170px] rounded-xl border-[#E5E7EB]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            <SelectItem value="pendentes">Cadastro pendente</SelectItem>
            <SelectItem value="cadastrados">Cadastro completo</SelectItem>
          </SelectContent>
        </Select>
        {(q || filtroCampo !== "todos" || filtroNivel !== "todos" || filtroStatus !== "todos") && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              setFiltroCampo("todos");
              setFiltroNivel("todos");
              setFiltroStatus("todos");
            }}
            className="rounded-xl text-[#2563EB] hover:bg-[#2563EB]/5"
          >
            Limpar
          </Button>
        )}
      </div>

      <Card className="rounded-2xl border border-[#E5E7EB] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.map((c) => {
              const p = c.profiles as unknown as ClienteProfile | null;
              const isEditing = editing?.userId === c.user_id;
              const nome = p?.full_name ?? "—";
              const initials =
                nome
                  .split(" ")
                  .map((s) => s[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "—";
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-4 p-5 transition duration-200 hover:bg-[#F8FAFC]"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-xs font-semibold text-white shadow-sm">
                      {initials}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="truncate font-semibold text-[#0F172A]">{nome}</span>
                        {c.pending_registration && (
                          <Badge
                            variant="secondary"
                            className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-200"
                            title="Cliente criado por venda automática (PDV/site). Ainda não completou o próprio cadastro."
                          >
                            Cadastro pendente
                          </Badge>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 rounded-md px-2 text-xs text-[#2563EB] hover:bg-[#2563EB]/5"
                          onClick={() =>
                            setEditInfo({
                              user_id: c.user_id,
                              full_name: p?.full_name ?? "",
                              phone: formatPhone(p?.phone ?? ""),
                              cpf: formatCPF(p?.cpf ?? ""),
                            })
                          }
                        >
                          <Pencil className="h-3 w-3" /> editar
                        </Button>
                      </div>
                      <div className="mt-0.5 text-xs text-[#64748B]">
                        {p?.phone ? <>Tel: {formatPhone(p.phone)}</> : <>Sem telefone</>}
                        {" · "}
                        {p?.cpf ? <>CPF: {formatCPF(p.cpf)}</> : <>Sem CPF</>}
                      </div>
                      <div className="text-xs text-[#94A3B8]">
                        Cadastrado: {formatDate(c.created_at)}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#64748B]">
                        <Cake className="h-3 w-3" />
                        {isEditing ? (
                          <>
                            <Input
                              type="date"
                              value={editing.value}
                              onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                              className="h-7 w-40 rounded-lg border-[#E5E7EB]"
                            />
                            <Button
                              size="sm"
                              className="h-7 rounded-lg bg-[#2563EB] px-2 text-white hover:bg-[#1D4ED8]"
                              onClick={() =>
                                salvarBirth.mutate({
                                  user_id: c.user_id,
                                  birthdate: editing.value || null,
                                })
                              }
                            >
                              Salvar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 rounded-lg px-2"
                              onClick={() => setEditing(null)}
                            >
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            {p?.birthdate
                              ? new Date(p.birthdate + "T00:00").toLocaleDateString("pt-BR")
                              : "sem aniversário"}
                            <button
                              className="font-medium text-[#2563EB] hover:underline"
                              onClick={() =>
                                setEditing({ userId: c.user_id, value: p?.birthdate ?? "" })
                              }
                            >
                              editar
                            </button>
                          </>
                        )}
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        {tags
                          .filter((t) => t.client_user_id === c.user_id)
                          .map((t) => (
                            <Badge
                              key={t.id}
                              variant="outline"
                              className="gap-1 rounded-full border-[#E5E7EB] bg-[#F8FAFC] px-2 py-0.5 text-[11px] font-medium text-[#0F172A]"
                            >
                              #{t.tag}
                              <button
                                onClick={() => rmTag.mutate(t.id)}
                                className="text-[#94A3B8] hover:text-[#EF4444]"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        <div className="flex items-center gap-1">
                          <Input
                            value={tagInput[c.user_id] ?? ""}
                            onChange={(e) =>
                              setTagInput((s) => ({ ...s, [c.user_id]: e.target.value }))
                            }
                            placeholder="nova tag"
                            className="h-7 w-28 rounded-lg border-[#E5E7EB] text-xs"
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 rounded-lg px-1.5 text-[#2563EB] hover:bg-[#2563EB]/5"
                            disabled={!(tagInput[c.user_id] ?? "").trim()}
                            onClick={() => {
                              addTag.mutate({ user_id: c.user_id, tag: tagInput[c.user_id] });
                              setTagInput((s) => ({ ...s, [c.user_id]: "" }));
                            }}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 text-sm">
                    {inclP && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-[10px] font-medium uppercase tracking-wider text-[#64748B]">
                            Saldo
                          </div>
                          <div className="text-lg font-bold text-[#0F172A]">
                            {c.pontos.toLocaleString("pt-BR")}{" "}
                            <span className="text-xs font-normal text-[#64748B]">pts</span>
                          </div>
                        </div>
                        <NivelBadge pontos={c.pontos} nivel={c.nivel} />
                      </div>
                    )}
                    {inclC && (
                      <div className="rounded-lg bg-[#22C55E]/10 px-2.5 py-1 text-xs font-semibold text-[#15803D] ring-1 ring-inset ring-[#22C55E]/20">
                        {formatBRL(Number(c.cashback_saldo))}
                      </div>
                    )}
                    {inclP && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg border-[#E5E7EB] px-2.5 text-xs text-[#0F172A] hover:bg-[#F1F5F9]"
                          onClick={() =>
                            setPontosDlg({
                              user_id: c.user_id,
                              nome: p?.full_name ?? "—",
                              saldo: c.pontos,
                              delta: "",
                              motivo: "",
                              op: "add",
                            })
                          }
                        >
                          <Plus className="h-3 w-3" /> Pontos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg border-[#E5E7EB] px-2.5 text-xs text-[#0F172A] hover:bg-[#F1F5F9]"
                          disabled={c.pontos <= 0}
                          onClick={() =>
                            setPontosDlg({
                              user_id: c.user_id,
                              nome: p?.full_name ?? "—",
                              saldo: c.pontos,
                              delta: "",
                              motivo: "",
                              op: "estorno",
                            })
                          }
                        >
                          <Minus className="h-3 w-3" /> Estornar
                        </Button>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-lg px-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/5 hover:text-[#EF4444]"
                      onClick={() =>
                        setExcluirDlg({ user_id: c.user_id, nome: p?.full_name ?? "—" })
                      }
                    >
                      <Trash2 className="h-3 w-3" /> Excluir
                    </Button>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="p-12 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-[#F1F5F9] text-[#94A3B8]">
                  <Search className="h-5 w-5" />
                </div>
                <p className="mt-3 text-sm text-[#64748B]">Nenhum cliente encontrado.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={openNew} onOpenChange={setOpenNew}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cadastrar cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="novo-nome">Nome</Label>
              <Input
                id="novo-nome"
                value={novo.nome}
                onChange={(e) => setNovo((s) => ({ ...s, nome: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            <div>
              <Label htmlFor="novo-tel">Telefone (com DDD)</Label>
              <Input
                id="novo-tel"
                value={novo.phone}
                onChange={(e) => setNovo((s) => ({ ...s, phone: formatPhone(e.target.value) }))}
                placeholder="(11) 99999-9999"
                inputMode="tel"
              />
            </div>
            <div>
              <Label htmlFor="novo-cpf">CPF (obrigatório)</Label>
              <Input
                id="novo-cpf"
                value={novo.cpf}
                onChange={(e) => setNovo((s) => ({ ...s, cpf: formatCPF(e.target.value) }))}
                placeholder="000.000.000-00"
                inputMode="numeric"
              />
              {novo.cpf.trim() && !isValidCPF(novo.cpf) && (
                <p className="mt-1 text-xs text-red-600">CPF inválido</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              O cliente entra sempre pelo CPF. A senha inicial é o próprio CPF (só números) e pode
              ser alterada depois na página pública da loja.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => criar.mutate()}
              disabled={
                criar.isPending ||
                !novo.nome.trim() ||
                novo.phone.replace(/\D/g, "").length < 8 ||
                !isValidCPF(novo.cpf)
              }
            >
              {criar.isPending ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Editar cadastro */}
      <Dialog open={!!editInfo} onOpenChange={(o) => !o && setEditInfo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar cliente</DialogTitle>
          </DialogHeader>
          {editInfo && (
            <div className="space-y-3">
              {inclP &&
                (() => {
                  const c = clientes.find((x) => x.user_id === editInfo.user_id);
                  if (!c) return null;
                  return (
                    <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                      <div>
                        <div className="text-xs text-muted-foreground">Saldo</div>
                        <div className="text-lg font-bold">
                          {c.pontos}{" "}
                          <span className="text-xs font-normal text-muted-foreground">pts</span>
                        </div>
                      </div>
                      <NivelBadge pontos={c.pontos} nivel={c.nivel} />
                    </div>
                  );
                })()}
              <div>
                <Label htmlFor="edit-nome">Nome</Label>
                <Input
                  id="edit-nome"
                  value={editInfo.full_name}
                  onChange={(e) => setEditInfo({ ...editInfo, full_name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-tel">Telefone (com DDD)</Label>
                <Input
                  id="edit-tel"
                  value={editInfo.phone}
                  onChange={(e) => setEditInfo({ ...editInfo, phone: formatPhone(e.target.value) })}
                  inputMode="tel"
                />
              </div>
              <div>
                <Label htmlFor="edit-cpf">CPF (obrigatório)</Label>
                <Input
                  id="edit-cpf"
                  value={editInfo.cpf}
                  onChange={(e) => setEditInfo({ ...editInfo, cpf: formatCPF(e.target.value) })}
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                />
                {editInfo.cpf.trim() && !isValidCPF(editInfo.cpf) && (
                  <p className="mt-1 text-xs text-red-600">CPF inválido</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditInfo(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => salvarInfo.mutate()}
              disabled={
                salvarInfo.isPending ||
                !editInfo ||
                !editInfo.full_name.trim() ||
                editInfo.phone.replace(/\D/g, "").length < 8 ||
                !isValidCPF(editInfo.cpf)
              }
            >
              {salvarInfo.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ajuste de pontos */}
      <Dialog open={!!pontosDlg} onOpenChange={(o) => !o && setPontosDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pontosDlg?.op === "add" ? "Adicionar pontos" : "Estornar pontos"}
            </DialogTitle>
          </DialogHeader>
          {pontosDlg && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="font-medium">{pontosDlg.nome}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3" /> Saldo atual:{" "}
                  <span className="font-semibold text-foreground">{pontosDlg.saldo} pts</span>
                </div>
              </div>
              <div>
                <Label htmlFor="pts-qtd">Quantidade de pontos</Label>
                <Input
                  id="pts-qtd"
                  type="number"
                  min={1}
                  max={pontosDlg.op === "estorno" ? pontosDlg.saldo : undefined}
                  value={pontosDlg.delta}
                  onChange={(e) => setPontosDlg({ ...pontosDlg, delta: e.target.value })}
                  placeholder="Ex.: 100"
                />
                {pontosDlg.op === "estorno" && Number(pontosDlg.delta) > pontosDlg.saldo && (
                  <p className="mt-1 text-xs text-red-600">
                    Não pode estornar mais que o saldo atual.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="pts-motivo">Motivo (opcional)</Label>
                <Input
                  id="pts-motivo"
                  value={pontosDlg.motivo}
                  onChange={(e) => setPontosDlg({ ...pontosDlg, motivo: e.target.value })}
                  placeholder="Ex.: correção de venda #123"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPontosDlg(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => ajustarPts.mutate()}
              disabled={
                ajustarPts.isPending ||
                !pontosDlg ||
                !(Number(pontosDlg.delta) > 0) ||
                (pontosDlg.op === "estorno" && Number(pontosDlg.delta) > pontosDlg.saldo)
              }
            >
              {ajustarPts.isPending
                ? "Salvando..."
                : pontosDlg?.op === "add"
                  ? "Adicionar"
                  : "Estornar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <Dialog open={!!excluirDlg} onOpenChange={(o) => !o && setExcluirDlg(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir cliente</DialogTitle>
          </DialogHeader>
          {excluirDlg && (
            <div className="space-y-2 text-sm">
              <p>
                Tem certeza que deseja remover <strong>{excluirDlg.nome}</strong> da sua loja?
              </p>
              <p className="text-xs text-muted-foreground">
                O saldo de pontos, cashback e as tags desta loja serão apagados. O histórico de
                vendas continua no relatório. O cliente pode se cadastrar novamente pela página
                pública.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setExcluirDlg(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => excluir.mutate()}
              disabled={excluir.isPending}
            >
              {excluir.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
