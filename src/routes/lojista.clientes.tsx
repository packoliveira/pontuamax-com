import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeClientsQuery, clientTagsQuery } from "@/lib/queries";
import { atualizarAniversarioCliente, addClientTag, removeClientTag, cadastrarClientePorTelefone, atualizarClienteInfo, ajustarPontosCliente, sincronizarClientesDaLoja } from "@/lib/qsf.functions";
import { formatBRL, formatDate, progressoNivel } from "@/lib/qsf-shared";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy } from "lucide-react";
import { Search, Cake, X, Plus, UserPlus, Pencil, Coins, Minus, RefreshCw } from "lucide-react";
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

type FiltroCampo = "todos" | "nome" | "telefone" | "cpf";
type FiltroNivel = "todos" | "bronze" | "prata" | "ouro";

function NivelBadge({ pontos, nivel }: { pontos: number; nivel: string }) {
  const prog = progressoNivel(pontos);
  return (
    <div className="flex flex-col items-end gap-1">
      <Badge className={NIVEL_COR[nivel] ?? ""} variant="secondary">
        <Trophy className="mr-1 h-3 w-3" /> {nivel}
      </Badge>
      {prog.proximo ? (
        <div className="w-32">
          <div className="mb-0.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>→ {prog.proximo}</span>
            <span>{Math.max(0, Math.min(prog.alvo, prog.alvo - prog.atual))} pts</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, prog.pct))}%` }}
            />
          </div>
        </div>
      ) : (
        <span className="text-[10px] text-muted-foreground">nível máximo</span>
      )}
    </div>
  );
}

// --- helpers de formatação/validação
function onlyDigits(v: string) {
  return (v ?? "").replace(/\D/g, "");
}
function formatCPF(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function formatPhone(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  if (d.length <= 10) {
    return d.replace(/(\d{2})(\d{4})(\d{0,4}).*/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : b ? `(${a}) ${b}` : a ? `(${a}` : ""));
  }
  return d.replace(/(\d{2})(\d{5})(\d{0,4}).*/, (_, a, b, c) => (c ? `(${a}) ${b}-${c}` : `(${a}) ${b}`));
}
function isValidCPF(cpf: string): boolean {
  const d = onlyDigits(cpf);
  if (d.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(d)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (const c of base) sum += Number(c) * factor--;
    const r = (sum * 10) % 11;
    return r === 10 ? 0 : r;
  };
  const d1 = calc(d.slice(0, 9), 10);
  const d2 = calc(d.slice(0, 10), 11);
  return d1 === Number(d[9]) && d2 === Number(d[10]);
}

type ClienteProfile = { full_name: string | null; phone: string | null; cpf: string | null; birthdate: string | null };

function ClientesPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: clientes = [] } = useQuery(storeClientsQuery(loja?.id));
  const { data: tags = [] } = useQuery(clientTagsQuery(loja?.id));
  const [q, setQ] = useState("");
  const [filtroCampo, setFiltroCampo] = useState<FiltroCampo>("todos");
  const [filtroNivel, setFiltroNivel] = useState<FiltroNivel>("todos");
  const [editing, setEditing] = useState<{ userId: string; value: string } | null>(null);
  const [tagInput, setTagInput] = useState<Record<string, string>>({});
  const [openNew, setOpenNew] = useState(false);
  const [novo, setNovo] = useState({ nome: "", phone: "", cpf: "" });
  const [editInfo, setEditInfo] = useState<{ user_id: string; full_name: string; phone: string; cpf: string } | null>(null);
  const [pontosDlg, setPontosDlg] = useState<{ user_id: string; nome: string; saldo: number; delta: string; motivo: string; op: "add" | "estorno" } | null>(null);

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
    if (filtroNivel !== "todos" && c.nivel !== filtroNivel) return false;
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
      nome.includes(s) ||
      (digits.length > 0 && (tel.includes(digits) || cpf.includes(digits)))
    );
  });
  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {filtered.length} de {clientes.length} cliente(s)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncClientsButton storeId={loja.id} />
          <Button onClick={() => setOpenNew(true)}>
            <UserPlus className="h-4 w-4" /> Cadastrar cliente
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={
              filtroCampo === "nome" ? "Buscar por nome" :
              filtroCampo === "telefone" ? "Buscar por telefone (só dígitos)" :
              filtroCampo === "cpf" ? "Buscar por CPF (só dígitos)" :
              "Buscar por nome, telefone ou CPF"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroCampo} onValueChange={(v) => setFiltroCampo(v as FiltroCampo)}>
          <SelectTrigger className="w-[150px]">
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
            <SelectTrigger className="w-[140px]">
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
        {(q || filtroCampo !== "todos" || filtroNivel !== "todos") && (
          <Button variant="ghost" size="sm" onClick={() => { setQ(""); setFiltroCampo("todos"); setFiltroNivel("todos"); }}>
            Limpar
          </Button>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((c) => {
              const p = c.profiles as unknown as ClienteProfile | null;
              const isEditing = editing?.userId === c.user_id;
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p?.full_name ?? "—"}</span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
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
                    <div className="text-xs text-muted-foreground">
                      {p?.phone ? <>Tel: {formatPhone(p.phone)}</> : <>Sem telefone</>}
                      {" · "}
                      {p?.cpf ? <>CPF: {formatCPF(p.cpf)}</> : <>Sem CPF</>}
                    </div>
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
                  <div className="flex flex-col items-end gap-2 text-sm">
                    {inclP && (
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Saldo</div>
                          <div className="text-lg font-bold">{c.pontos} <span className="text-xs font-normal text-muted-foreground">pts</span></div>
                        </div>
                        <NivelBadge pontos={c.pontos} nivel={c.nivel} />
                      </div>
                    )}
                    {inclC && <div className="text-green-700 font-semibold">{formatBRL(Number(c.cashback_saldo))}</div>}
                    {inclP && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => setPontosDlg({ user_id: c.user_id, nome: p?.full_name ?? "—", saldo: c.pontos, delta: "", motivo: "", op: "add" })}
                        >
                          <Plus className="h-3 w-3" /> Pontos
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          disabled={c.pontos <= 0}
                          onClick={() => setPontosDlg({ user_id: c.user_id, nome: p?.full_name ?? "—", saldo: c.pontos, delta: "", motivo: "", op: "estorno" })}
                        >
                          <Minus className="h-3 w-3" /> Estornar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</div>}
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
              <Input id="novo-nome" value={novo.nome} onChange={(e) => setNovo((s) => ({ ...s, nome: e.target.value }))} placeholder="Nome do cliente" />
            </div>
            <div>
              <Label htmlFor="novo-tel">Telefone (com DDD)</Label>
              <Input id="novo-tel" value={novo.phone} onChange={(e) => setNovo((s) => ({ ...s, phone: formatPhone(e.target.value) }))} placeholder="(11) 99999-9999" inputMode="tel" />
            </div>
            <div>
              <Label htmlFor="novo-cpf">CPF (obrigatório)</Label>
              <Input id="novo-cpf" value={novo.cpf} onChange={(e) => setNovo((s) => ({ ...s, cpf: formatCPF(e.target.value) }))} placeholder="000.000.000-00" inputMode="numeric" />
              {novo.cpf.trim() && !isValidCPF(novo.cpf) && (
                <p className="mt-1 text-xs text-red-600">CPF inválido</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              O cliente entra sempre pelo CPF. A senha inicial é o próprio CPF (só números) e pode ser alterada depois na página pública da loja.
            </p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpenNew(false)}>Cancelar</Button>
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
              {inclP && (() => {
                const c = clientes.find((x) => x.user_id === editInfo.user_id);
                if (!c) return null;
                return (
                  <div className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                    <div>
                      <div className="text-xs text-muted-foreground">Saldo</div>
                      <div className="text-lg font-bold">
                        {c.pontos} <span className="text-xs font-normal text-muted-foreground">pts</span>
                      </div>
                    </div>
                    <NivelBadge pontos={c.pontos} nivel={c.nivel} />
                  </div>
                );
              })()}
              <div>
                <Label htmlFor="edit-nome">Nome</Label>
                <Input id="edit-nome" value={editInfo.full_name} onChange={(e) => setEditInfo({ ...editInfo, full_name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="edit-tel">Telefone (com DDD)</Label>
                <Input id="edit-tel" value={editInfo.phone} onChange={(e) => setEditInfo({ ...editInfo, phone: formatPhone(e.target.value) })} inputMode="tel" />
              </div>
              <div>
                <Label htmlFor="edit-cpf">CPF (obrigatório)</Label>
                <Input id="edit-cpf" value={editInfo.cpf} onChange={(e) => setEditInfo({ ...editInfo, cpf: formatCPF(e.target.value) })} inputMode="numeric" placeholder="000.000.000-00" />
                {editInfo.cpf.trim() && !isValidCPF(editInfo.cpf) && (
                  <p className="mt-1 text-xs text-red-600">CPF inválido</p>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditInfo(null)}>Cancelar</Button>
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
            <DialogTitle>{pontosDlg?.op === "add" ? "Adicionar pontos" : "Estornar pontos"}</DialogTitle>
          </DialogHeader>
          {pontosDlg && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted p-3 text-sm">
                <div className="font-medium">{pontosDlg.nome}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3 w-3" /> Saldo atual: <span className="font-semibold text-foreground">{pontosDlg.saldo} pts</span>
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
                  <p className="mt-1 text-xs text-red-600">Não pode estornar mais que o saldo atual.</p>
                )}
              </div>
              <div>
                <Label htmlFor="pts-motivo">Motivo (opcional)</Label>
                <Input id="pts-motivo" value={pontosDlg.motivo} onChange={(e) => setPontosDlg({ ...pontosDlg, motivo: e.target.value })} placeholder="Ex.: correção de venda #123" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPontosDlg(null)}>Cancelar</Button>
            <Button
              onClick={() => ajustarPts.mutate()}
              disabled={
                ajustarPts.isPending ||
                !pontosDlg ||
                !(Number(pontosDlg.delta) > 0) ||
                (pontosDlg.op === "estorno" && Number(pontosDlg.delta) > pontosDlg.saldo)
              }
            >
              {ajustarPts.isPending ? "Salvando..." : pontosDlg?.op === "add" ? "Adicionar" : "Estornar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}