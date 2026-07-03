import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyStoreSubscription } from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, MessageCircle, LogOut, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/lojista/aguardando")({
  ssr: false,
  component: Aguardando,
});

const WHATSAPP_SUPORTE = "5511999999999"; // ajuste com seu número

function Aguardando() {
  const navigate = useNavigate();
  const fetchSub = useServerFn(getMyStoreSubscription);
  const { data: store, isLoading, refetch } = useQuery({
    queryKey: ["my-store-sub"],
    queryFn: () => fetchSub(),
    refetchInterval: 15_000,
  });

  if (!isLoading && store?.subscription_status === "active") {
    navigate({ to: "/lojista" });
    return null;
  }

  const status = store?.subscription_status ?? "pending_payment";
  const titulo =
    status === "suspended"
      ? "Sua loja está suspensa"
      : status === "cancelled"
      ? "Sua loja foi cancelada"
      : "Aguardando liberação";

  const mensagemWa = encodeURIComponent(
    `Olá! Sou ${store?.nome_fantasia ?? "novo lojista"} e quero liberar meu acesso à plataforma de fidelidade.`,
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 to-orange-50 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-100">
            <Clock className="h-7 w-7 text-amber-600" />
          </div>
          <CardTitle className="mt-4 text-xl">{titulo}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Loja</span><span className="font-medium">{store?.nome_fantasia ?? "-"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Plano</span><span className="font-medium capitalize">{store?.plan ?? "starter"}</span></div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Setup</span>
              <span className="font-medium flex items-center gap-1">
                {store?.setup_paid_at ? (<><CheckCircle2 className="h-4 w-4 text-green-600" /> Pago</>) : "Pendente"}
              </span>
            </div>
          </div>

          <p className="text-sm text-muted-foreground text-center">
            {status === "pending_payment"
              ? "Assim que confirmarmos o pagamento da implementação, seu acesso será liberado."
              : status === "suspended"
              ? "Sua assinatura está suspensa. Regularize para reativar."
              : "Fale conosco se quiser reabrir sua loja."}
          </p>

          <a
            href={`https://wa.me/${WHATSAPP_SUPORTE}?text=${mensagemWa}`}
            target="_blank"
            rel="noreferrer"
            className="block"
          >
            <Button className="w-full bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4" /> Falar com o time no WhatsApp
            </Button>
          </a>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => refetch()}>Já paguei, atualizar</Button>
            <Button
              variant="ghost"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/lojista/login" });
              }}
            >
              <LogOut className="h-4 w-4" /> Sair
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}