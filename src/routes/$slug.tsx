import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import {
  storeBySlugQuery,
  activeStoreProductsQuery,
  myLinkAtStoreQuery,
  myTransactionsAtStoreQuery,
} from "@/lib/queries";
import {
  vincularClienteALoja,
  resgatarProduto,
  resgatarCashback,
} from "@/lib/qsf.functions";
import { formatBRL, formatDate, calcularNivel, progressoNivel, phoneToEmail, onlyDigits } from "@/lib/qsf-shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Coins, Wallet, LogOut, Trophy, Ticket } from "lucide-react";

type Loja = Tables<"stores">;
type Link = Tables<"store_clients">;

export const Route = createFileRoute("/$slug")({
  ssr: false,
  component: ClientePage,
});

function ClientePage() {
  const { slug } = Route.useParams();
  const { data: loja, isLoading } = useQuery(storeBySlugQuery(slug));

  const style = useMemo(
    () =>
      loja
        ? ({ ["--brand-primary" as string]: loja.brand_primary, ["--brand-secondary" as string]: loja.brand_secondary } as React.CSSProperties)
        : {},
    [loja],
  );

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Carregando...</div>;

  if (!loja) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <h1 className="text-2xl font-bold">Loja não encontrada</h1>
          <p className="text-sm text-muted-foreground mt-2">Verifique o endereço com o lojista.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={style} className="min-h-screen bg-slate-50">
      <ClienteFlow loja={loja} />
    </div>
  );
}

function ClienteFlow({ loja }: { loja: Loja }) {
  const qc = useQueryClient();
  const { data: link, isLoading } = useQuery(myLinkAtStoreQuery(loja.id));
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSessionUserId(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSessionUserId(s?.user.id ?? null);
      qc.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [qc]);

  return (
    <>
      <Header loja={loja} showLogout={!!sessionUserId} />
      {isLoading ? (
        <div className="p-8 text-center text-sm text-muted-foreground">Carregando...</div>
      ) : sessionUserId && link ? (
        <ClienteLogado loja={loja} link={link} />
      ) : sessionUserId && !link ? (
        <VincularStore loja={loja} />
      ) : (
        <Auth loja={loja} />
      )}
    </>
  );
}

function Header({ loja, showLogout }: { loja: Loja; showLogout: boolean }) {
  const qc = useQueryClient();
  const doLogout = async () => {
    await supabase.auth.signOut();
    qc.clear();
  };
  return (
    <header className="px-4 py-6 text-white" style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" }}>
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loja.logo_url ? (
            <img src={loja.logo_url} alt={loja.nome_fantasia} className="h-11 w-11 rounded-lg bg-white/20 object-contain p-1" />
          ) : (
            <div className="h-11 w-11 rounded-lg bg-white/20 flex items-center justify-center font-bold">
              {loja.nome_fantasia.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Fidelidade</div>
            <div className="font-bold text-lg leading-tight">{loja.nome_fantasia}</div>
          </div>
        </div>
        {showLogout && (
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={doLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}

function Auth({ loja }: { loja: Loja }) {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [phone, setPhone] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);

  const qc = useQueryClient();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = onlyDigits(phone);
    if (digits.length < 10) return toast.error("Telefone inválido");
    if (senha.length < 6) return toast.error("Senha deve ter 6+ caracteres");
    setLoading(true);
    try {
      const email = phoneToEmail(digits);
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password: senha,
          options: { data: { full_name: nome.trim(), phone: digits, cpf: onlyDigits(cpf) || null } },
        });
        if (error) throw error;
        // If session not returned (email confirm), sign in
        const { data: s2 } = await supabase.auth.getSession();
        if (!s2.session) {
          const { error: liErr } = await supabase.auth.signInWithPassword({ email, password: senha });
          if (liErr) throw liErr;
        }
        await vincularClienteALoja({ data: { store_id: loja.id } });
        toast.success(`Bem-vindo(a), ${nome}!`);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
        // Ensure link exists
        await vincularClienteALoja({ data: { store_id: loja.id } });
        toast.success("Bem-vindo(a) de volta!");
      }
      qc.invalidateQueries();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-4 -mt-6">
      <Card>
        <CardHeader>
          <CardTitle>{mode === "signup" ? "Criar minha conta" : "Entrar com meu telefone"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <div>
              <Label>Telefone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="11987654321" inputMode="numeric" />
            </div>
            {mode === "signup" && (
              <>
                <div>
                  <Label>Nome</Label>
                  <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Como quer ser chamado" />
                </div>
                <div>
                  <Label>CPF (opcional)</Label>
                  <Input value={cpf} onChange={(e) => setCpf(e.target.value)} placeholder="000.000.000-00" />
                </div>
              </>
            )}
            <div>
              <Label>Senha</Label>
              <Input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder={mode === "signup" ? "Mínimo 6 caracteres" : "Sua senha"} />
            </div>
            <Button type="submit" disabled={loading} className="w-full text-white" style={{ backgroundColor: "var(--brand-primary)" }}>
              {loading ? "Aguarde..." : mode === "signup" ? "Criar conta" : "Entrar"}
            </Button>
            <button type="button" onClick={() => setMode(mode === "login" ? "signup" : "login")} className="text-xs text-center w-full underline text-muted-foreground">
              {mode === "login" ? "Ainda não tenho conta" : "Já tenho conta, entrar"}
            </button>
            {mode === "login" && (
              <p className="text-[11px] text-center text-muted-foreground">
                Se a loja cadastrou você, sua senha inicial é o seu próprio telefone (só números).
              </p>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function VincularStore({ loja }: { loja: Loja }) {
  const qc = useQueryClient();
  const vincular = useMutation({
    mutationFn: () => vincularClienteALoja({ data: { store_id: loja.id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-link", loja.id] }),
  });
  useEffect(() => { vincular.mutate(); }, []); // eslint-disable-line
  return <div className="p-8 text-center text-sm text-muted-foreground">Preparando sua conta nesta loja...</div>;
}

function ClienteLogado({ loja, link }: { loja: Loja; link: Link }) {
  const qc = useQueryClient();
  const { data: produtos = [] } = useQuery(activeStoreProductsQuery(loja.id));
  const { data: txs = [] } = useQuery(myTransactionsAtStoreQuery(loja.id));

  const [voucher, setVoucher] = useState<string | null>(null);
  const [cashbackModal, setCashbackModal] = useState(false);
  const [cashbackValor, setCashbackValor] = useState("");

  const inclP = loja.modalidade !== "cashback";
  const inclC = loja.modalidade !== "pontos";
  const nivel = calcularNivel(link.pontos);
  const prog = progressoNivel(link.pontos);

  const nomeCliente = useMemo(async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.user_metadata?.full_name ?? "Cliente";
  }, []);
  const [nome, setNome] = useState("Cliente");
  useEffect(() => { nomeCliente.then(setNome); }, [nomeCliente]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["my-link", loja.id] });
    qc.invalidateQueries({ queryKey: ["my-transactions", loja.id] });
  };

  const resgatarP = useMutation({
    mutationFn: (product_id: string) => resgatarProduto({ data: { store_id: loja.id, product_id } }),
    onSuccess: (r) => { setVoucher(r.voucher); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const resgatarC = useMutation({
    mutationFn: (valor: number) => resgatarCashback({ data: { store_id: loja.id, valor } }),
    onSuccess: (r) => { setVoucher(r.voucher); setCashbackModal(false); setCashbackValor(""); invalidate(); },
    onError: (e) => toast.error((e as Error).message),
  });

  const usarCashback = () => {
    const v = parseFloat(cashbackValor.replace(",", "."));
    if (!v || v <= 0) return toast.error("Valor inválido");
    resgatarC.mutate(+v.toFixed(2));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 -mt-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Olá,</div>
          <div className="text-xl font-bold">{nome}</div>
        </CardContent>
      </Card>

      <div className={`grid gap-4 ${inclP && inclC ? "sm:grid-cols-2" : ""}`}>
        {inclP && (
          <Card className="overflow-hidden">
            <div className="p-5 text-white" style={{ background: "var(--brand-primary)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm opacity-90"><Coins className="h-4 w-4" /> Seus pontos</div>
                <div className="text-xs uppercase tracking-wide font-semibold flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                  <Trophy className="h-3 w-3" /> {nivel}
                </div>
              </div>
              <div className="text-4xl font-bold mt-2">{link.pontos}</div>
              {prog.proximo && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs opacity-90 mb-1">
                    <span>Próximo: {prog.proximo}</span>
                    <span>{Math.round(prog.pct)}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full bg-white transition-all" style={{ width: `${Math.min(100, prog.pct)}%` }} />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
        {inclC && (
          <Card className="overflow-hidden">
            <div className="p-5 text-white" style={{ background: "var(--brand-secondary)" }}>
              <div className="flex items-center gap-2 text-sm opacity-90"><Wallet className="h-4 w-4" /> Seu cashback</div>
              <div className="text-4xl font-bold mt-2">{formatBRL(Number(link.cashback_saldo))}</div>
              <Button
                size="sm" variant="secondary" className="mt-4"
                disabled={Number(link.cashback_saldo) <= 0}
                onClick={() => setCashbackModal(true)}
              >
                Usar no próximo pagamento
              </Button>
            </div>
          </Card>
        )}
      </div>

      {inclP && produtos.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Trocar pontos por produtos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {produtos.map((p) => {
              const podeResgatar = link.pontos >= p.custo_pontos;
              return (
                <Card key={p.id}>
                  <CardContent className="p-3 space-y-2">
                    <div className="font-medium text-sm">{p.nome}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-sm" style={{ color: "var(--brand-primary)" }}>{p.custo_pontos} pts</span>
                      <Button
                        size="sm" disabled={!podeResgatar || resgatarP.isPending}
                        onClick={() => resgatarP.mutate(p.id)}
                        style={podeResgatar ? { backgroundColor: "var(--brand-primary)" } : {}}
                        className="text-white"
                      >
                        {podeResgatar ? "Resgatar" : "Faltam pontos"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-3">Histórico</h2>
        <Card><CardContent className="p-0"><div className="divide-y">
          {txs.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Sem movimentações ainda</div>}
          {txs.map((t) => {
            const prd = (t.products as unknown as { nome: string | null } | null)?.nome;
            const descr = t.tipo === "venda" ? "Compra na loja" : t.tipo === "resgate_produto" ? `Resgate: ${prd ?? "produto"}` : `Voucher de cashback`;
            return (
              <div key={t.id} className="flex items-center justify-between p-3 text-sm">
                <div>
                  <div className="font-medium">{descr}</div>
                  <div className="text-xs text-muted-foreground">{formatDate(t.created_at)}</div>
                </div>
                <div className="text-right text-xs">
                  {t.tipo === "venda" && <div className="text-muted-foreground">{formatBRL(Number(t.valor))}</div>}
                  {t.pontos_delta ? <div className={t.pontos_delta > 0 ? "text-green-700" : "text-destructive"}>{t.pontos_delta > 0 ? "+" : ""}{t.pontos_delta} pts</div> : null}
                  {Number(t.cashback_delta) ? <div className={Number(t.cashback_delta) > 0 ? "text-green-700" : "text-destructive"}>{Number(t.cashback_delta) > 0 ? "+" : ""}{formatBRL(Number(t.cashback_delta))}</div> : null}
                </div>
              </div>
            );
          })}
        </div></CardContent></Card>
      </section>

      <Dialog open={!!voucher} onOpenChange={(v) => !v && setVoucher(null)}>
        <DialogContent className="text-center">
          <DialogHeader><DialogTitle className="flex items-center justify-center gap-2"><Ticket className="h-5 w-5" /> Seu voucher</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Apresente este código no caixa:</p>
          <div className="text-2xl font-mono font-bold tracking-widest py-4 rounded-lg" style={{ backgroundColor: "var(--brand-primary)", color: "white" }}>{voucher}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={cashbackModal} onOpenChange={setCashbackModal}>
        <DialogContent>
          <DialogHeader><DialogTitle>Usar cashback</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Você tem <strong>{formatBRL(Number(link.cashback_saldo))}</strong> disponível.</p>
          <div>
            <Label>Quanto usar (R$)</Label>
            <Input type="number" step="0.01" min="0" max={Number(link.cashback_saldo)} value={cashbackValor} onChange={(e) => setCashbackValor(e.target.value)} />
          </div>
          <Button onClick={usarCashback} disabled={resgatarC.isPending} className="text-white" style={{ backgroundColor: "var(--brand-secondary)" }}>Gerar voucher</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}