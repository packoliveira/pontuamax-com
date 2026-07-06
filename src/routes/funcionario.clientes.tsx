import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { storeClientsQuery } from "@/lib/queries";
import { useEmployeeContext } from "@/hooks/use-employee-context";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, ShieldOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/funcionario/clientes")({
  ssr: false,
  component: FuncClientes,
});

function FuncClientes() {
  const { hasPermission } = useEmployeeContext();
  const { data: ctx } = useQuery(myEmployeeContextQuery());
  const storeId = ctx?.store?.id;
  const { data: clients = [] } = useQuery(storeClientsQuery(storeId ?? undefined));
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return clients as any[];
    return (clients as any[]).filter((c) =>
      (c.profiles?.full_name ?? "").toLowerCase().includes(s) ||
      (c.profiles?.phone ?? "").toLowerCase().includes(s) ||
      (c.profiles?.cpf ?? "").toLowerCase().includes(s));
  }, [clients, q]);

  if (!hasPermission("clientes.consultar")) return <NoAccess />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-[#0F172A]">Clientes</h1>
      <Card className="rounded-2xl border-[#E5E7EB]">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#94A3B8]" />
            <Input className="pl-9 rounded-xl" placeholder="Buscar por nome, telefone ou CPF" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-[#E5E7EB]">
        <CardContent className="p-0">
          <div className="divide-y divide-[#F1F5F9]">
            {filtered.length === 0 ? (
              <div className="p-10 text-center text-sm text-[#64748B]">Nenhum cliente encontrado.</div>
            ) : filtered.map((c: any) => (
              <div key={c.id} className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white grid place-items-center font-semibold">
                  {(c.profiles?.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#0F172A] truncate">{c.profiles?.full_name ?? "Sem nome"}</div>
                  <div className="text-xs text-[#64748B] truncate">{c.profiles?.phone ?? "—"}</div>
                </div>
                <div className="text-right">
                  <Badge variant="secondary" className="rounded-full">{c.pontos ?? 0} pts</Badge>
                  <div className="text-xs text-[#64748B] mt-1">R$ {(Number(c.cashback_saldo ?? 0)).toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NoAccess() {
  return (
    <div className="max-w-md mx-auto text-center py-16 space-y-3">
      <div className="mx-auto h-12 w-12 rounded-full bg-red-50 text-red-600 grid place-items-center"><ShieldOff className="h-6 w-6" /></div>
      <h2 className="text-lg font-semibold">Sem permissão</h2>
      <p className="text-sm text-muted-foreground">Você não tem acesso a esta área. Fale com o proprietário da loja.</p>
    </div>
  );
}