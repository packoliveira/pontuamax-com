import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { giftCardByCodeQuery } from "@/lib/queries";
import { resgatarGiftCard } from "@/lib/qsf.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Ticket } from "lucide-react";

export const Route = createFileRoute("/vale/$codigo")({
  ssr: false,
  component: Page,
});

function Page() {
  const { codigo } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: card, isLoading } = useQuery(giftCardByCodeQuery(codigo));
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => { supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null)); }, []);

  const { data: loja } = useQuery({
    queryKey: ["store-by-id", card?.store_id],
    enabled: !!card?.store_id,
    queryFn: async () => {
      if (!card?.store_id) return null;
      const { data } = await supabase.from("stores").select("*").eq("id", card.store_id).maybeSingle();
      return data;
    },
  });

  const resgatar = useMutation({
    mutationFn: () => resgatarGiftCard({ data: { codigo } }),
    onSuccess: (r) => {
      toast.success(`+${r.pontos} pontos creditados!`);
      qc.invalidateQueries();
      if (loja?.slug) nav({ to: "/$slug", params: { slug: loja.slug } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">Carregando...</div>;
  if (!card) return <div className="min-h-screen grid place-items-center p-6 text-center"><div><h1 className="text-2xl font-bold">Vale não encontrado</h1></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2"><Ticket className="h-5 w-5 text-primary" /><CardTitle>Vale-presente</CardTitle></div>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-muted-foreground">{loja?.nome_fantasia ?? ""}</p>
          <div className="text-5xl font-black text-primary">{card.pontos}</div>
          <div className="text-sm text-muted-foreground">pontos</div>
          <code className="block font-mono text-lg tracking-wider">{card.codigo}</code>
          {card.redeemed_at ? (
            <p className="text-sm text-red-600">Este vale já foi resgatado.</p>
          ) : uid ? (
            <Button className="w-full" disabled={resgatar.isPending} onClick={() => resgatar.mutate()}>
              {resgatar.isPending ? "Resgatando..." : "Resgatar agora"}
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm">Entre na sua conta para resgatar:</p>
              {loja?.slug && (
                <Link to="/$slug" params={{ slug: loja.slug }} className="text-primary underline text-sm">
                  Ir para {loja.nome_fantasia}
                </Link>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}