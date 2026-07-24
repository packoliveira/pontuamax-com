/**
 * ClientCreditPanel — PontuaMax
 * Exibe o saldo de cashback e pontos do cliente.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Wallet } from "lucide-react";

interface Props {
  clientId: string;
}

export function ClientCreditPanel({ clientId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["client-balance", clientId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clients")
        .select("points_balance, cashback_balance")
        .eq("id", clientId)
        .maybeSingle() as any;
      return data;
    },
  });

  if (isLoading) return <div className="p-4 text-sm text-muted-foreground">Carregando saldo…</div>;

  return (
    <div className="grid gap-4 sm:grid-cols-2 mt-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Coins className="h-4 w-4 text-indigo-400" />
            Pontos Acumulados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-indigo-400">{data?.points_balance ?? 0}</p>
          <p className="text-xs text-muted-foreground mt-1">pontos disponíveis para resgate</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Wallet className="h-4 w-4 text-emerald-400" />
            Cashback Disponível
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold text-emerald-400">
            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              data?.cashback_balance ?? 0
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">saldo de cashback em conta</p>
        </CardContent>
      </Card>
    </div>
  );
}
