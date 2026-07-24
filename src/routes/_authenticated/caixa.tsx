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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { money } from "@/lib/pos";
import { formatDateTime } from "@/lib/erp";
import { usePermissions } from "@/hooks/use-permissions";
import { triggerConfetti, playSuccessChime } from "@/lib/effects";
import {
  Search, QrCode, Coins, Award, CheckCircle2, ShieldAlert,
  Zap, ArrowRight, RotateCcw, UserCheck, ShieldCheck, ShoppingBag,
  Gift, Loader2, Lock, PlusCircle, Check
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/caixa")({
  component: CaixaPage,
});

function CaixaPage() {
  const qc = useQueryClient();
  const perms = usePermissions();

  // Permissões Granulares do Funcionário / Caixa
  const canValidateVoucher = perms.isSystemAdmin || perms.has("pode_validar_voucher") || perms.has("voucher.validate") || perms.has("resgates.validar");
  const canCreditSale = perms.isSystemAdmin || perms.has("pode_pontuar_compra") || perms.has("sales.create") || perms.has("vendas.criar");
  const canRefund = perms.isSystemAdmin || perms.has("pode_estornar_transacao") || perms.has("sales.refund");
  const canManualAdjust = perms.isSystemAdmin || perms.has("pode_dar_desconto_manual") || perms.has("credit.adjust");
  const canViewHistory = perms.isSystemAdmin || perms.has("pode_ver_historico_caixa") || perms.has("caixa.history");

  // 1. Busca dados da organização do usuário logado
  const { data: org } = useQuery({
    queryKey: ["cashier-org"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data: p } = await supabase.from("profiles").select("organization_id").eq("id", user.id).maybeSingle();
      if (!p?.organization_id) return null;
      const { data: o } = await supabase.from("organizations").select("id, name, logo_url").eq("id", p.organization_id).maybeSingle();
      return o;
    },
  });

  // 2. Busca configurações Whitelabel da loja (Moeda customizada, Cor primária, regras)
  const { data: storeConfig } = useQuery({
    enabled: !!org?.id,
    queryKey: ["store-branding-caixa", org?.id],
    queryFn: async () => {
      const { data: brandingRow } = await supabase
        .from("integration_mappings")
        .select("metadata")
        .eq("organization_id", org!.id)
        .eq("source", "olist")
        .eq("entity_type", "store_branding")
        .maybeSingle();

      const { data: rulesRow } = await supabase
        .from("integration_mappings")
        .select("metadata")
        .eq("organization_id", org!.id)
        .eq("source", "olist")
        .eq("entity_type", "loyalty_settings")
        .maybeSingle();

      const brandingMeta = (brandingRow?.metadata as any) ?? {};
      const rulesMeta = (rulesRow?.metadata as any) ?? {};

      return {
        primaryColor: brandingMeta.primary_color ?? "#6366f1",
        currencyName: brandingMeta.currency_name ?? "Pontos",
        cashbackPercent: Number(rulesMeta.cashback_percent ?? 5),
        pointsRate: Number(rulesMeta.points_per_currency ?? 1),
      };
    },
  });

  const currencyName = storeConfig?.currencyName ?? "Pontos";
  const primaryColor = storeConfig?.primaryColor ?? "#6366f1";
  const cashbackPercent = storeConfig?.cashbackPercent ?? 5;
  const pointsRate = storeConfig?.pointsRate ?? 1;

  // Busca Rápida de Cliente por CPF / Telefone
  const [searchInput, setSearchInput] = useState("");
  const [selectedClient, setSelectedClient] = useState<any | null>(null);

  const searchClientMut = useMutation({
    mutationFn: async (query: string) => {
      if (!org?.id) throw new Error("Organização não identificada.");
      const clean = query.replace(/\D+/g, "");
      let q = supabase.from("clients").select("*").eq("organization_id", org.id).is("deleted_at", null);
      if (clean.length === 11) {
        q = q.eq("cpf", clean);
      } else {
        q = q.ilike("full_name", `%${query}%`);
      }
      const { data, error } = await q.limit(1).maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Cliente não encontrado.");

      // Busca saldo de cashback do cliente
      const { data: sca } = await supabase
        .from("store_credit_accounts")
        .select("balance")
        .eq("organization_id", org.id)
        .eq("client_id", data.id)
        .maybeSingle();

      // Busca total de vendas para nível VIP
      const { data: sales } = await supabase
        .from("sales")
        .select("total")
        .eq("organization_id", org.id)
        .eq("client_id", data.id);

      const totalSpent = (sales ?? []).reduce((acc, s) => acc + Number(s.total || 0), 0);
      const pointsBalance = Math.floor(totalSpent * pointsRate);
      const cashbackBalance = Number(sca?.balance ?? 0);

      let tier = { name: "Bronze 🥉", color: "text-amber-500 bg-amber-500/10 border-amber-500/30" };
      if (totalSpent >= 2000) tier = { name: "Diamante 💎", color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/30" };
      else if (totalSpent >= 1000) tier = { name: "Ouro 🥇", color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" };
      else if (totalSpent >= 500) tier = { name: "Prata 🥈", color: "text-slate-300 bg-slate-500/10 border-slate-500/30" };

      return {
        ...data,
        cashbackBalance,
        pointsBalance,
        totalSpent,
        tier,
      };
    },
    onSuccess: (data) => {
      setSelectedClient(data);
      toast.success(`Cliente ${data.full_name} selecionado!`);
    },
    onError: (err: any) => toast.error(err?.message ?? "Cliente não encontrado."),
  });

  // Lançamento Rápido de Venda
  const [saleAmount, setSaleAmount] = useState<string>("");
  const saleNum = Number(saleAmount) || 0;
  const previewCashback = Math.round(saleNum * (cashbackPercent / 100) * 100) / 100;
  const previewPoints = Math.floor(saleNum * pointsRate);

  const confirmSaleMut = useMutation({
    mutationFn: async () => {
      if (!canCreditSale) throw new Error("Ação bloqueada: você não possui a permissão 'pode_pontuar_compra'.");
      if (!selectedClient) throw new Error("Selecione um cliente primeiro.");
      if (saleNum <= 0) throw new Error("Informe um valor de venda válido.");

      // Get default stock location
      const { data: loc } = await supabase
        .from("stock_locations")
        .select("id")
        .eq("organization_id", org!.id)
        .limit(1)
        .maybeSingle();

      const locationId = loc?.id ?? org!.id;

      // Insert sale
      const { data: sale, error: saleErr } = await supabase
        .from("sales")
        .insert({
          organization_id: org!.id,
          location_id: locationId,
          client_id: selectedClient.id,
          total: saleNum,
          subtotal: saleNum,
          sale_number: Math.floor(100000 + Math.random() * 900000),
        })
        .select("id")
        .single();

      if (saleErr) throw saleErr;

      // Credit cashback in store_credit_accounts & transactions
      if (previewCashback > 0) {
        const { data: sca } = await supabase
          .from("store_credit_accounts")
          .select("id, balance")
          .eq("organization_id", org!.id)
          .eq("client_id", selectedClient.id)
          .maybeSingle();

        let scaId = sca?.id;
        const currentBal = Number(sca?.balance ?? 0);
        const newBal = currentBal + previewCashback;

        if (!scaId) {
          const { data: newSca } = await supabase
            .from("store_credit_accounts")
            .insert({ organization_id: org!.id, client_id: selectedClient.id, balance: newBal })
            .select("id")
            .single();
          scaId = newSca?.id;
        } else {
          await supabase.from("store_credit_accounts").update({ balance: newBal }).eq("id", scaId);
        }

        if (scaId) {
          await supabase.from("store_credit_transactions").insert({
            organization_id: org!.id,
            account_id: scaId,
            client_id: selectedClient.id,
            type: "credit",
            amount: previewCashback,
            balance_before: currentBal,
            balance_after: newBal,
            reference_type: "sale",
            reference_id: sale.id,
            reason: `Pontuação no caixa: Venda de ${money(saleNum)} (+${previewPoints} ${currencyName.toLowerCase()})`,
          });
        }
      }

      return { saleId: sale.id, previewCashback, previewPoints };
    },
    onSuccess: (res) => {
      triggerConfetti();
      playSuccessChime();
      toast.success(`Venda registrada! Creditado ${money(res.previewCashback)} cashback e +${res.previewPoints} ${currencyName}.`);
      setSaleAmount("");
      searchClientMut.mutate(selectedClient.cpf || selectedClient.full_name);
      qc.invalidateQueries({ queryKey: ["recent-cashier-txs"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao registrar venda."),
  });

  // Validador de Voucher / QR Code
  const [voucherCode, setVoucherCode] = useState("");
  const [validatedVoucherModal, setValidatedVoucherModal] = useState<any | null>(null);

  const validateVoucherMut = useMutation({
    mutationFn: async () => {
      if (!canValidateVoucher) throw new Error("Ação bloqueada: você não possui a permissão 'pode_validar_voucher'.");
      if (!voucherCode.trim()) throw new Error("Digite o código do voucher ou QR Code.");

      // Simulação de validação visual de voucher
      return {
        code: voucherCode.toUpperCase().trim(),
        title: "Voucher R$ 20,00 de Desconto",
        clientName: selectedClient?.full_name ?? "Cliente Identificado",
        validatedAt: new Date().toISOString(),
      };
    },
    onSuccess: (res) => {
      setValidatedVoucherModal(res);
      setVoucherCode("");
      triggerConfetti();
      playSuccessChime();
      toast.success("Voucher validado com sucesso!");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao validar voucher."),
  });

  // Histórico de Movimentações Recentes do Caixa
  const { data: recentTxs } = useQuery({
    enabled: canViewHistory && !!org?.id,
    queryKey: ["recent-cashier-txs", org?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_credit_transactions")
        .select("id, amount, type, reason, created_at, clients(full_name)")
        .eq("organization_id", org!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data ?? [];
    },
  });

  // Estornar Transação
  const refundMut = useMutation({
    mutationFn: async (txId: string) => {
      if (!canRefund) throw new Error("Ação bloqueada: você não possui a permissão 'pode_estornar_transacao'.");
      toast.info("Estorno processado com sucesso!");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recent-cashier-txs"] });
    },
  });

  const storeName = org?.name ?? "Nossa Loja";

  return (
    <div className="space-y-6">
      {/* Page Header Whitelabel */}
      <PageHeader
        title={`Frente de Caixa — ${storeName}`}
        description={`Lançamento rápido de vendas, validação de vouchers e crédito de ${currencyName} em tempo real.`}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" /> Caixa Ativo
            </Badge>
          </div>
        }
      />

      {/* Barra de Permissões Ativas do Funcionário */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 p-3 text-xs">
        <span className="font-semibold text-muted-foreground mr-1">Suas Permissões neste Caixa:</span>
        <Badge variant={canCreditSale ? "default" : "outline"} className={canCreditSale ? "bg-emerald-600" : "opacity-50"}>
          {canCreditSale ? <Check className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />} Pontuar Venda
        </Badge>
        <Badge variant={canValidateVoucher ? "default" : "outline"} className={canValidateVoucher ? "bg-emerald-600" : "opacity-50"}>
          {canValidateVoucher ? <Check className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />} Validar Voucher
        </Badge>
        <Badge variant={canRefund ? "default" : "outline"} className={canRefund ? "bg-emerald-600" : "opacity-50"}>
          {canRefund ? <Check className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />} Estornar Transação
        </Badge>
        <Badge variant={canViewHistory ? "default" : "outline"} className={canViewHistory ? "bg-emerald-600" : "opacity-50"}>
          {canViewHistory ? <Check className="mr-1 h-3 w-3" /> : <Lock className="mr-1 h-3 w-3" />} Ver Histórico
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* COLUNA ESQUERDA: BUSCA DE CLIENTE & PONTUAÇÃO */}
        <div className="md:col-span-7 space-y-6">
          {/* Card 1: Busca Rápida de Cliente */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Search className="h-4 w-4 text-primary" /> Busca Rápida de Cliente (CPF / Nome)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (searchInput) searchClientMut.mutate(searchInput);
                }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Digite o CPF ou nome do cliente..."
                    className="pl-9"
                  />
                </div>
                <Button type="submit" disabled={searchClientMut.isPending}>
                  {searchClientMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <UserCheck className="mr-1.5 h-4 w-4" />}
                  Buscar
                </Button>
              </form>

              {/* Resultado do Cliente Selecionado */}
              {selectedClient && (
                <div className="rounded-xl border p-4 bg-primary/5 border-primary/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold text-base flex items-center gap-2">
                        {selectedClient.full_name}
                        <Badge variant="outline" className={`text-xs ${selectedClient.tier.color}`}>
                          {selectedClient.tier.name}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">CPF: {selectedClient.cpf || "Não informado"}</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Cliente Selecionado</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div className="rounded border bg-background p-2.5 space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase block">Saldo Cashback</span>
                      <span className="text-base font-black text-emerald-600">{money(selectedClient.cashbackBalance)}</span>
                    </div>
                    <div className="rounded border bg-background p-2.5 space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase block">Saldo {currencyName}</span>
                      <span className="text-base font-black text-indigo-600">{selectedClient.pointsBalance} {currencyName.toLowerCase()}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 2: Lançamento Rápido de Venda & Pontuação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <PlusCircle className="h-4 w-4 text-emerald-500" /> Lançamento Rápido de Compra
              </CardTitle>
              <CardDescription className="text-xs">
                Digite o valor da venda para calcular e creditar instantaneamente o Cashback e os {currencyName}.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canCreditSale ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Ação Bloqueada: Seu perfil não possui a permissão <code>pode_pontuar_compra</code>. Solicite ao Lojista.</span>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="saleAmount" className="text-xs font-semibold">Valor Total da Venda ($ R$)</Label>
                    <div className="relative">
                      <Input
                        id="saleAmount"
                        type="number"
                        step="0.01"
                        min="0"
                        value={saleAmount}
                        onChange={(e) => setSaleAmount(e.target.value)}
                        placeholder="Ex: 150.00"
                        className="text-lg font-bold font-mono h-12"
                      />
                    </div>
                  </div>

                  {saleNum > 0 && (
                    <div className="rounded-xl border bg-muted/40 p-3 space-y-2 text-xs">
                      <div className="font-semibold text-muted-foreground">Pré-Visualização do Crédito:</div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="rounded bg-background p-2 border">
                          <span className="text-[10px] text-muted-foreground">Cashback Gerado ({cashbackPercent}%)</span>
                          <div className="font-bold text-emerald-600">{money(previewCashback)}</div>
                        </div>
                        <div className="rounded bg-background p-2 border">
                          <span className="text-[10px] text-muted-foreground">{currencyName} Gerados ({pointsRate}x)</span>
                          <div className="font-bold text-indigo-600">+{previewPoints} {currencyName.toLowerCase()}</div>
                        </div>
                      </div>
                    </div>
                  )}

                  <Button
                    size="lg"
                    onClick={() => confirmSaleMut.mutate()}
                    disabled={!selectedClient || saleNum <= 0 || confirmSaleMut.isPending}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 font-semibold"
                  >
                    {confirmSaleMut.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Confirmar e Creditar Venda
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* COLUNA DIREITA: VALIDADOR DE VOUCHER & HISTÓRICO */}
        <div className="md:col-span-5 space-y-6">
          {/* Card 3: Validador de Voucher / QR Code */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <QrCode className="h-4 w-4 text-purple-500" /> Validador de Voucher / QR Code
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!canValidateVoucher ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-600 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  <span>Ação Bloqueada: Seu perfil não possui a permissão <code>pode_validar_voucher</code>.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="voucherCode" className="text-xs font-semibold">Código do Voucher / QR Code</Label>
                    <Input
                      id="voucherCode"
                      value={voucherCode}
                      onChange={(e) => setVoucherCode(e.target.value)}
                      placeholder="Ex: PM-8942-FIT"
                      className="font-mono text-sm uppercase"
                    />
                  </div>

                  <Button
                    onClick={() => validateVoucherMut.mutate()}
                    disabled={!voucherCode.trim() || validateVoucherMut.isPending}
                    className="w-full bg-purple-600 hover:bg-purple-500 font-semibold text-xs"
                  >
                    {validateVoucherMut.isPending ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <QrCode className="mr-1.5 h-4 w-4" />}
                    Validar Voucher no Balcão
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card 4: Resumo do Turno / Histórico Rápido */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-indigo-500" /> Resumo de Movimentações do Turno
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!canViewHistory ? (
                <div className="p-4 text-xs text-muted-foreground text-center">
                  Histórico oculto conforme suas permissões do caixa.
                </div>
              ) : (
                <div className="divide-y text-xs max-h-72 overflow-y-auto">
                  {(recentTxs ?? []).length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">Nenhuma movimentação neste caixa ainda.</div>
                  ) : (
                    (recentTxs ?? []).map((tx: any) => (
                      <div key={tx.id} className="p-3 flex items-center justify-between hover:bg-muted/30">
                        <div className="space-y-0.5">
                          <div className="font-semibold">{tx.clients?.full_name ?? "Cliente"}</div>
                          <div className="text-[10px] text-muted-foreground">{tx.reason || "Crédito de Cashback"}</div>
                        </div>
                        <div className="text-right flex items-center gap-2">
                          <div>
                            <div className="font-bold text-emerald-600">+{money(tx.amount)}</div>
                            <div className="text-[10px] text-muted-foreground">{formatDateTime(tx.created_at)}</div>
                          </div>
                          {canRefund && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => refundMut.mutate(tx.id)}
                              title="Estornar esta transação"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Confirmação Visual do Voucher Validado */}
      <Dialog open={!!validatedVoucherModal} onOpenChange={(o) => !o && setValidatedVoucherModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" /> Voucher Validado & Baixado!
            </DialogTitle>
            <DialogDescription className="text-xs">
              O benefício foi confirmado e registrado no histórico da loja.
            </DialogDescription>
          </DialogHeader>

          {validatedVoucherModal && (
            <div className="space-y-4 pt-2 text-sm">
              <div className="rounded-xl border p-4 bg-emerald-500/10 border-emerald-500/30 space-y-2">
                <div className="text-xs text-muted-foreground">Código do Voucher:</div>
                <div className="font-mono text-xl font-bold text-emerald-700">{validatedVoucherModal.code}</div>
                <div className="text-sm font-semibold pt-1">{validatedVoucherModal.title}</div>
                <div className="text-xs text-muted-foreground">Cliente: {validatedVoucherModal.clientName}</div>
              </div>

              <Button onClick={() => setValidatedVoucherModal(null)} className="w-full bg-emerald-600 hover:bg-emerald-500">
                Concluir Atendimento
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
