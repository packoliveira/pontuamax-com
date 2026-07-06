import { createFileRoute } from "@tanstack/react-router";
import { useEmployeeContext } from "@/hooks/use-employee-context";
import { Card, CardContent } from "@/components/ui/card";
import { Coins, ShieldOff } from "lucide-react";

export const Route = createFileRoute("/funcionario/pontuar")({
  ssr: false,
  component: Pontuar,
});

function Pontuar() {
  const { hasPermission } = useEmployeeContext();
  if (!hasPermission("pontos.adicionar")) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-red-50 text-red-600 grid place-items-center"><ShieldOff className="h-6 w-6" /></div>
        <h2 className="text-lg font-semibold">Sem permissão</h2>
      </div>
    );
  }
  return (
    <div className="max-w-xl space-y-4">
      <h1 className="text-2xl font-bold text-[#0F172A]">Pontuar cliente</h1>
      <Card className="rounded-2xl border-[#E5E7EB]">
        <CardContent className="p-6 space-y-3 text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-[#6D28D9] via-[#2563EB] to-[#14CBA8] text-white grid place-items-center">
            <Coins className="h-6 w-6" />
          </div>
          <p className="text-sm text-[#64748B]">
            Você tem permissão para adicionar pontos. O fluxo dedicado de lançamento estará disponível em breve neste painel.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}