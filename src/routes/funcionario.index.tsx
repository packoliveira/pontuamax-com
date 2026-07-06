import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Store } from "lucide-react";

export const Route = createFileRoute("/funcionario/")({
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const { data } = useQuery(myEmployeeContextQuery());
  if (!data) return null;
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-[#0F172A]">Olá, {data.employee.nome.split(" ")[0]}!</h1>
        <p className="text-sm text-[#64748B]">Bem-vindo(a) ao painel de funcionário PontuaMax.</p>
      </div>
      <Card className="rounded-2xl border-[#E5E7EB]">
        <CardContent className="p-5 flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white grid place-items-center">
            <Store className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs uppercase tracking-wider text-[#64748B]">Loja</div>
            <div className="font-semibold text-[#0F172A] truncate">{data.store?.nome_fantasia}</div>
            <div className="text-xs text-[#64748B]">Cargo: {data.employee.role_key}</div>
          </div>
        </CardContent>
      </Card>
      <Card className="rounded-2xl border-[#E5E7EB]">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#0F172A]">
            <ShieldCheck className="h-4 w-4 text-[#14CBA8]" /> Suas permissões
          </div>
          <div className="flex flex-wrap gap-1.5">
            {data.permissions.length === 0
              ? <span className="text-xs text-[#64748B]">Nenhuma permissão atribuída ainda. Fale com o proprietário.</span>
              : data.permissions.map((p) => (
                <Badge key={p} variant="secondary" className="rounded-full text-[11px]">{p}</Badge>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}