import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useStore, formatBRL, formatDate, calcularNivel, progressoNivel, type Loja, type Cliente } from "@/lib/mock-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Coins, Wallet, LogOut, Trophy, Ticket } from "lucide-react";

export const Route = createFileRoute("/$slug")({
  ssr: false,
  component: ClientePage,
});

function ClientePage() {
  const { slug } = Route.useParams();
  const loja = useStore((s) => s.lojas.find((l) => l.slug === slug));
  const authedClienteId = useStore((s) => (loja ? s.authedClienteByLoja[loja.id] : undefined));
  const cliente = useStore((s) => s.clientes.find((c) => c.id === authedClienteId));

  const style = useMemo(
    () =>
      loja
        ? ({ ["--brand-primary" as string]: loja.cor_primaria, ["--brand-secondary" as string]: loja.cor_secundaria } as React.CSSProperties)
        : {},
    [loja],
  );

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
      <Header loja={loja} cliente={cliente} />
      {cliente ? <ClienteLogado loja={loja} cliente={cliente} /> : <Login lojaId={loja.id} />}
    </div>
  );
}

function Header({ loja, cliente }: { loja: Loja; cliente?: Cliente }) {
  const logout = useStore((s) => s.logoutCliente);
  return (
    <header
      className="px-4 py-6 text-white"
      style={{ background: "linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))" }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {loja.logo_url ? (
            <img src={loja.logo_url} alt={loja.nome} className="h-11 w-11 rounded-lg bg-white/20 object-contain p-1" />
          ) : (
            <div className="h-11 w-11 rounded-lg bg-white/20 flex items-center justify-center font-bold">
              {loja.nome.charAt(0)}
            </div>
          )}
          <div>
            <div className="text-xs uppercase tracking-wider opacity-80">Fidelidade</div>
            <div className="font-bold text-lg leading-tight">{loja.nome}</div>
          </div>
        </div>
        {cliente && (
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => logout(loja.id)}>
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>
    </header>
  );
}

function Login({ lojaId }: { lojaId: string }) {
  const buscar = useStore((s) => s.buscarClientePorContato);
  const criar = useStore((s) => s.criarCliente);
  const loginCliente = useStore((s) => s.loginCliente);
  const [telefone, setTelefone] = useState("");
  const [nome, setNome] = useState("");
  const [precisaCadastro, setPrecisaCadastro] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = telefone.replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Telefone inválido"); return; }
    let cli = buscar(lojaId, digits);
    if (!cli) {
      if (!precisaCadastro) { setPrecisaCadastro(true); return; }
      if (!nome.trim()) { toast.error("Informe seu nome"); return; }
      cli = criar({ loja_id: lojaId, nome: nome.trim(), telefone: digits });
    }
    loginCliente(lojaId, cli.id);
    toast.success(`Olá, ${cli.nome}!`);
  };

  return (
    <div className="max-w-md mx-auto p-4 -mt-6">
      <Card>
        <CardHeader><CardTitle>Entre com seu telefone</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label>Telefone</Label>
              <Input value={telefone} onChange={(e) => { setTelefone(e.target.value); setPrecisaCadastro(false); }} placeholder="11987654321" inputMode="numeric" />
            </div>
            {precisaCadastro && (
              <div className="space-y-2 rounded-md bg-amber-50 border border-amber-200 p-3">
                <p className="text-sm text-amber-900">Não encontramos você. Cadastre-se rapidinho:</p>
                <Input placeholder="Seu nome" value={nome} onChange={(e) => setNome(e.target.value)} />
              </div>
            )}
            <Button type="submit" className="w-full text-white" style={{ backgroundColor: "var(--brand-primary)" }}>
              Entrar
            </Button>
          </form>
        </CardContent>
      </Card>
      <p className="text-xs text-center mt-4 text-muted-foreground">
        Dica demo: use <strong>11987654321</strong> (Ana), <strong>11912345678</strong> (Bruno) ou <strong>11955554444</strong> (Carla).
      </p>
    </div>
  );
}

function ClienteLogado({ loja, cliente }: { loja: Loja; cliente: Cliente }) {
  const produtos = useStore((s) => s.produtos.filter((p) => p.loja_id === loja.id && p.ativo && p.estoque > 0));
  const txs = useStore((s) => s.transacoes.filter((t) => t.cliente_id === cliente.id));
  const resgatarProduto = useStore((s) => s.resgatarProduto);
  const resgatarCashback = useStore((s) => s.resgatarCashback);

  const [voucher, setVoucher] = useState<string | null>(null);
  const [cashbackModal, setCashbackModal] = useState(false);
  const [cashbackValor, setCashbackValor] = useState("");

  const inclPontos = loja.modalidade !== "cashback";
  const inclCashback = loja.modalidade !== "pontos";
  const nivel = calcularNivel(cliente.pontos_saldo);
  const prog = progressoNivel(cliente.pontos_saldo);

  const resgatar = (produtoId: string) => {
    try {
      const r = resgatarProduto(loja.id, cliente.id, produtoId);
      setVoucher(r.codigo_voucher);
    } catch (e) { toast.error((e as Error).message); }
  };

  const usarCashback = () => {
    const v = parseFloat(cashbackValor.replace(",", "."));
    if (!v || v <= 0) { toast.error("Valor inválido"); return; }
    try {
      const r = resgatarCashback(loja.id, cliente.id, v);
      setCashbackModal(false);
      setCashbackValor("");
      setVoucher(r.codigo_voucher);
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 -mt-4">
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground">Olá,</div>
          <div className="text-xl font-bold">{cliente.nome}</div>
        </CardContent>
      </Card>

      <div className={`grid gap-4 ${inclPontos && inclCashback ? "sm:grid-cols-2" : ""}`}>
        {inclPontos && (
          <Card className="overflow-hidden">
            <div className="p-5 text-white" style={{ background: "var(--brand-primary)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm opacity-90"><Coins className="h-4 w-4" /> Seus pontos</div>
                {loja.niveis_ativos && (
                  <div className="text-xs uppercase tracking-wide font-semibold flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5">
                    <Trophy className="h-3 w-3" /> {nivel}
                  </div>
                )}
              </div>
              <div className="text-4xl font-bold mt-2">{cliente.pontos_saldo}</div>
              {loja.niveis_ativos && prog.proximo && (
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
        {inclCashback && (
          <Card className="overflow-hidden">
            <div className="p-5 text-white" style={{ background: "var(--brand-secondary)" }}>
              <div className="flex items-center gap-2 text-sm opacity-90"><Wallet className="h-4 w-4" /> Seu cashback</div>
              <div className="text-4xl font-bold mt-2">{formatBRL(cliente.cashback_saldo)}</div>
              <Button
                size="sm" variant="secondary" className="mt-4"
                disabled={cliente.cashback_saldo <= 0}
                onClick={() => setCashbackModal(true)}
              >
                Usar no próximo pagamento
              </Button>
            </div>
          </Card>
        )}
      </div>

      {inclPontos && produtos.length > 0 && (
        <section>
          <h2 className="font-semibold mb-3">Trocar pontos por produtos</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {produtos.map((p) => {
              const podeResgatar = cliente.pontos_saldo >= p.pontos_necessarios;
              return (
                <Card key={p.id} className="overflow-hidden">
                  <div className="aspect-video bg-muted"><img src={p.foto_url} alt={p.nome} className="h-full w-full object-cover" /></div>
                  <CardContent className="p-3 space-y-2">
                    <div className="font-medium text-sm">{p.nome}</div>
                    <div className="text-xs text-muted-foreground line-clamp-2">{p.descricao}</div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-bold text-sm" style={{ color: "var(--brand-primary)" }}>{p.pontos_necessarios} pts</span>
                      <Button
                        size="sm" disabled={!podeResgatar}
                        onClick={() => resgatar(p.id)}
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
          {txs.map((t) => (
            <div key={t.id} className="flex items-center justify-between p-3 text-sm">
              <div>
                <div className="font-medium">{t.descricao}</div>
                <div className="text-xs text-muted-foreground">{formatDate(t.created_at)}</div>
              </div>
              <div className="text-right text-xs">
                {t.valor_compra != null && <div className="text-muted-foreground">{formatBRL(t.valor_compra)}</div>}
                {t.pontos_gerados ? <div className="text-green-700">+{t.pontos_gerados} pts</div> : null}
                {t.cashback_gerado ? <div className="text-green-700">+{formatBRL(t.cashback_gerado)}</div> : null}
                {t.pontos_usados ? <div className="text-destructive">-{t.pontos_usados} pts</div> : null}
                {t.cashback_usado ? <div className="text-destructive">-{formatBRL(t.cashback_usado)}</div> : null}
              </div>
            </div>
          ))}
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
          <p className="text-sm text-muted-foreground">Você tem <strong>{formatBRL(cliente.cashback_saldo)}</strong> disponível.</p>
          <div>
            <Label>Quanto usar (R$)</Label>
            <Input type="number" step="0.01" min="0" max={cliente.cashback_saldo} value={cashbackValor} onChange={(e) => setCashbackValor(e.target.value)} />
          </div>
          <Button onClick={usarCashback} className="text-white" style={{ backgroundColor: "var(--brand-secondary)" }}>Gerar voucher</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}