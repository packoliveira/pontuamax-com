import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { memo, useCallback, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeTransactionsQuery } from "@/lib/queries";
import { confirmarResgate, validarVoucher, cancelarVoucher } from "@/lib/qsf.functions";
import { formatBRL, formatDate } from "@/lib/qsf-shared";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Gift,
  Wallet,
  ScanLine,
  Clock,
  AlertTriangle,
  Printer,
  XCircle,
  Ticket,
  type LucideIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type TxRow = Tables<"transactions"> & {
  profiles: { full_name: string | null } | null;
  products: { nome: string | null } | null;
};

type Comprovante = {
  transaction_id: string;
  voucher_code: string | null;
  tipo: string;
  delivered_at: string;
  loja: string | null;
  cliente: string;
  cliente_telefone: string | null;
  produto: string | null;
  pontos_usados: number;
  cashback_aplicado: number;
};

function tempoRestante(iso: string | null): { label: string; danger: boolean } | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { label: "expirado", danger: true };
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return { label: `${h}h restantes`, danger: h < 12 };
  const d = Math.floor(h / 24);
  return { label: `${d}d restantes`, danger: d < 2 };
}

const StatusBadge = memo(function StatusBadge({ status }: { status: string }) {
  if (status === "pendente")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#F97316] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
        <Clock className="h-3 w-3" /> Pendente
      </span>
    );
  if (status === "entregue")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#2563EB] to-[#14CBA8] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
        <CheckCircle2 className="h-3 w-3" /> Utilizado
      </span>
    );
  if (status === "expirado")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F59E0B] to-[#EF4444] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
        <AlertTriangle className="h-3 w-3" /> Expirado
      </span>
    );
  if (status === "cancelado")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#EF4444] to-[#B91C1C] px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
        <XCircle className="h-3 w-3" /> Cancelado
      </span>
    );
  return null;
});

const StatCard = memo(function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: "pending" | "used" | "expired" | "cancelled";
}) {
  const gradient = {
    pending: "from-[#F59E0B] to-[#F97316]",
    used: "from-[#2563EB] to-[#14CBA8]",
    expired: "from-[#F59E0B] to-[#EF4444]",
    cancelled: "from-[#EF4444] to-[#B91C1C]",
  }[tone];
  return (
    <Card className="rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-sm`}
          >
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-3 text-2xl font-bold text-foreground">
          {value.toLocaleString("pt-BR")}
        </div>
      </CardContent>
    </Card>
  );
});

const Row = memo(function Row({
  r,
  onConfirm,
  onCancel,
  confirming,
  cancelling,
}: {
  r: TxRow;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  confirming: boolean;
  cancelling: boolean;
}) {
  const nomeCli = r.profiles?.full_name ?? "—";
  const isProduto = r.tipo === "resgate_produto";
  const tr = tempoRestante(r.voucher_expires_at);
  const initials =
    nomeCli
      .split(" ")
      .map((s) => s[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "—";
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5 transition duration-200 hover:bg-muted/40">
      <div className="flex min-w-0 items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-xs font-semibold text-white shadow-sm">
            {initials}
          </div>
          <div
            className={`absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-white ${isProduto ? "bg-[#6D28D9]" : "bg-[#14CBA8]"} text-white`}
          >
            {isProduto ? <Gift className="h-2.5 w-2.5" /> : <Wallet className="h-2.5 w-2.5" />}
          </div>
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-foreground">{nomeCli}</span>
            <StatusBadge status={r.status ?? "pendente"} />
          </div>
          <div className="mt-0.5 text-sm text-muted-foreground">
            {isProduto
              ? `${r.products?.nome ?? "Produto"} • ${Math.abs(r.pontos_delta)} pts`
              : `Voucher de cashback • ${formatBRL(Math.abs(Number(r.cashback_delta)))}`}
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 shadow-sm">
            <Ticket className="h-3.5 w-3.5 text-[#14CBA8]" />
            <span className="select-all font-mono text-base font-black tracking-widest text-white">
              {r.voucher_code}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{formatDate(r.created_at)}</span>
            {tr && r.status === "pendente" && (
              <span
                className={`inline-flex items-center gap-1 ${tr.danger ? "font-semibold text-[#F97316]" : "text-muted-foreground"}`}
              >
                <Clock className="h-3 w-3" /> {tr.label}
              </span>
            )}
          </div>
        </div>
      </div>
      {r.status === "pendente" && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <Button
            size="sm"
            disabled={confirming}
            onClick={() => onConfirm(r.id)}
            className="rounded-xl bg-primary text-white shadow-sm hover:bg-primary/90"
          >
            <CheckCircle2 className="mr-1 h-4 w-4" /> Confirmar entrega
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="rounded-xl text-destructive hover:bg-destructive/5"
            disabled={cancelling}
            onClick={() => {
              if (confirm("Cancelar este voucher e devolver o saldo ao cliente?")) onCancel(r.id);
            }}
          >
            <XCircle className="mr-1 h-3.5 w-3.5" /> Cancelar
          </Button>
        </div>
      )}
    </div>
  );
});

const Section = memo(function Section({
  title,
  icon: Icon,
  tone,
  items,
  limit,
  onConfirm,
  onCancel,
  confirming,
  cancelling,
}: {
  title: string;
  icon: LucideIcon;
  tone: string;
  items: TxRow[];
  limit?: number;
  onConfirm: (id: string) => void;
  onCancel: (id: string) => void;
  confirming: boolean;
  cancelling: boolean;
}) {
  if (items.length === 0) return null;
  const shown = limit ? items.slice(0, limit) : items;
  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <div className={`flex h-6 w-6 items-center justify-center rounded-lg ${tone}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
        <h2 className="text-sm font-semibold text-foreground">
          {title} <span className="ml-1 font-medium text-muted-foreground">({items.length})</span>
        </h2>
      </div>
      <Card className="rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {shown.map((r) => (
              <Row
                key={r.id}
                r={r}
                onConfirm={onConfirm}
                onCancel={onCancel}
                confirming={confirming}
                cancelling={cancelling}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  );
});

export const Route = createFileRoute("/lojista/resgates")({
  ssr: false,
  component: ResgatesPage,
});

function ResgatesPage() {
  const qc = useQueryClient();
  const { data: loja } = useQuery(myStoreQuery());
  const { data: txs = [] } = useQuery(storeTransactionsQuery(loja?.id));
  const [codigo, setCodigo] = useState("");
  const [comprovante, setComprovante] = useState<Comprovante | null>(null);

  const confirmar = useMutation({
    mutationFn: (id: string) => confirmarResgate({ data: { transaction_id: id } }),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      if (r?.comprovante) setComprovante(r.comprovante as Comprovante);
    },
  });

  const cancelar = useMutation({
    mutationFn: (id: string) => cancelarVoucher({ data: { transaction_id: id } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
      toast.success("Voucher cancelado — saldo devolvido ao cliente.");
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const validar = useMutation({
    mutationFn: (code: string) => validarVoucher({ data: { voucher_code: code } }),
    onSuccess: (r) => {
      const detalhe =
        r.produto ?? (r.cashback ? `Cashback ${formatBRL(r.cashback)}` : `${r.pontos} pts`);
      toast.success(`Voucher válido — ${r.cliente} · ${detalhe}`);
      setCodigo("");
      qc.invalidateQueries({ queryKey: ["transactions", loja?.id] });
      qc.invalidateQueries({ queryKey: ["store-clients", loja?.id] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const { pendentes, utilizados, expirados, cancelados } = useMemo(() => {
    const resgates = txs.filter(
      (t) => t.tipo === "resgate_produto" || t.tipo === "resgate_cashback",
    ) as unknown as TxRow[];
    return {
      pendentes: resgates.filter((r) => r.status === "pendente"),
      utilizados: resgates.filter((r) => r.status === "entregue"),
      expirados: resgates.filter((r) => r.status === "expirado"),
      cancelados: resgates.filter((r) => r.status === "cancelado"),
    };
  }, [txs]);

  const handleConfirm = useCallback(
    (id: string) => {
      confirmar.mutate(id, {
        onSuccess: () => toast.success("Voucher utilizado — comprovante gerado"),
      });
    },
    [confirmar],
  );
  const handleCancel = useCallback((id: string) => cancelar.mutate(id), [cancelar]);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Operação"
        title="Resgates"
        description="Valide o voucher do cliente pelo código ou pela lista abaixo."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Pendentes" value={pendentes.length} icon={Clock} tone="pending" />
        <StatCard label="Utilizados" value={utilizados.length} icon={CheckCircle2} tone="used" />
        <StatCard label="Expirados" value={expirados.length} icon={AlertTriangle} tone="expired" />
        <StatCard label="Cancelados" value={cancelados.length} icon={XCircle} tone="cancelled" />
      </div>

      <Card className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#F1F5F9] bg-gradient-to-r from-[#6D28D9]/5 via-[#2563EB]/5 to-[#14CBA8]/5 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-sm">
              <ScanLine className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Validar voucher</div>
              <div className="text-xs text-muted-foreground">
                Cole ou digite o código apresentado pelo cliente.
              </div>
            </div>
          </div>
        </div>
        <CardContent className="p-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!codigo.trim()) return;
              validar.mutate(codigo.trim().toUpperCase());
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <Input
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.toUpperCase())}
              placeholder="QSF-XXXXXX"
              className="h-11 rounded-xl border-border bg-white font-mono uppercase tracking-widest focus-visible:ring-primary/30"
              autoComplete="off"
            />
            <Button
              type="submit"
              disabled={validar.isPending || !codigo.trim()}
              className="h-11 shrink-0 rounded-xl bg-primary px-6 text-white shadow-sm hover:bg-primary/90"
            >
              {validar.isPending ? "Validando..." : "Validar e entregar"}
            </Button>
          </form>
          <p className="mt-3 text-xs text-muted-foreground">
            Vouchers vencem em{" "}
            <span className="font-semibold text-foreground">
              {loja?.voucher_validade_dias ?? 7} dias
            </span>{" "}
            — depois disso o saldo volta pro cliente automaticamente.
          </p>
        </CardContent>
      </Card>

      {pendentes.length > 0 ? (
        <Section
          title="Pendentes"
          icon={Clock}
          tone="bg-gradient-to-br from-[#F59E0B] to-[#F97316]"
          items={pendentes}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirming={confirmar.isPending}
          cancelling={cancelar.isPending}
        />
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-white p-10 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white shadow-sm">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-base font-semibold text-foreground">Nenhum resgate pendente</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Assim que um cliente gerar um voucher ele aparece aqui.
          </p>
        </div>
      )}
      <Section
        title="Expirados"
        icon={AlertTriangle}
        tone="bg-gradient-to-br from-[#F59E0B] to-[#EF4444]"
        items={expirados}
        limit={20}
        onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirming={confirmar.isPending}
          cancelling={cancelar.isPending}
        />
      <Section
        title="Utilizados"
        icon={CheckCircle2}
        tone="bg-gradient-to-br from-[#2563EB] to-[#14CBA8]"
        items={utilizados}
        limit={30}
        onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirming={confirmar.isPending}
          cancelling={cancelar.isPending}
        />
      <Section
        title="Cancelados"
        icon={XCircle}
        tone="bg-gradient-to-br from-[#EF4444] to-[#B91C1C]"
        items={cancelados}
        limit={20}
        onConfirm={handleConfirm}
          onCancel={handleCancel}
          confirming={confirmar.isPending}
          cancelling={cancelar.isPending}
        />

      <Dialog
        open={!!comprovante}
        onOpenChange={(o) => {
          if (!o) setComprovante(null);
        }}
      >
        <DialogContent className="max-w-md rounded-[20px] border border-border p-0 shadow-xl">
          <div className="rounded-t-[20px] bg-gradient-to-r from-[#6D28D9] via-[#2563EB] to-[#14CBA8] p-6 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-white">
                <CheckCircle2 className="h-5 w-5" /> Comprovante de resgate
              </DialogTitle>
            </DialogHeader>
            <p className="mt-1 text-xs text-white/80">Voucher entregue com sucesso.</p>
          </div>
          <div className="space-y-4 p-6">
            {comprovante && (
              <div
                id="comprovante-print"
                className="space-y-3 rounded-2xl border border-border bg-white p-5 text-sm"
              >
                <div className="text-center">
                  <div className="text-base font-bold text-foreground">
                    {comprovante.loja ?? "Loja"}
                  </div>
                  <div className="text-xs text-muted-foreground">Comprovante de entrega</div>
                </div>
                <div className="grid grid-cols-[110px_1fr] gap-y-1.5 border-t border-[#F1F5F9] pt-3">
                  <span className="text-muted-foreground">Cliente</span>
                  <span className="font-medium text-foreground">{comprovante.cliente}</span>
                  {comprovante.cliente_telefone && (
                    <>
                      <span className="text-muted-foreground">Telefone</span>
                      <span className="text-foreground">{comprovante.cliente_telefone}</span>
                    </>
                  )}
                  <span className="text-muted-foreground">Voucher</span>
                  <span className="font-mono font-bold text-foreground">
                    {comprovante.voucher_code ?? "—"}
                  </span>
                  <span className="text-muted-foreground">Entregue em</span>
                  <span className="text-foreground">
                    {new Date(comprovante.delivered_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <div className="space-y-1.5 border-t border-[#F1F5F9] pt-3">
                  {comprovante.produto && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Produto resgatado</span>
                      <span className="font-medium text-foreground">{comprovante.produto}</span>
                    </div>
                  )}
                  {comprovante.pontos_usados > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Pontos usados</span>
                      <span className="font-semibold text-foreground">
                        {comprovante.pontos_usados} pts
                      </span>
                    </div>
                  )}
                  {comprovante.cashback_aplicado > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cashback aplicado</span>
                      <span className="font-semibold text-[#15803D]">
                        {formatBRL(comprovante.cashback_aplicado)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="rounded-xl border-border text-foreground hover:bg-muted"
              >
                <Printer className="mr-1 h-4 w-4" /> Imprimir
              </Button>
              <Button
                onClick={() => setComprovante(null)}
                className="rounded-xl bg-primary text-white hover:bg-primary/90"
              >
                Fechar
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
