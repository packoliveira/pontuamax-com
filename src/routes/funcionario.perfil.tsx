import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/funcionario/perfil")({
  ssr: false,
  component: Perfil,
});

function Perfil() {
  const { data } = useQuery(myEmployeeContextQuery());
  if (!data) return null;
  const e = data.employee;
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-2xl font-bold text-[#0F172A]">Meu perfil</h1>
      <Card className="rounded-2xl border-[#E5E7EB]">
        <CardContent className="p-5 grid gap-3 text-sm">
          <Row label="Nome" value={e.nome} />
          <Row label="E-mail" value={e.email} />
          <Row label="CPF" value={e.cpf ?? "—"} />
          <Row label="Telefone" value={e.phone ?? "—"} />
          <Row label="Cargo" value={e.role_key} />
          <Row label="Status" value={e.status} />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-2 last:border-0">
      <span className="text-[#64748B]">{label}</span>
      <span className="font-medium text-[#0F172A]">{value}</span>
    </div>
  );
}
