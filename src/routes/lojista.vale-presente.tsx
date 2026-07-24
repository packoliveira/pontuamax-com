import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { myStoreQuery, storeGiftCardsQuery } from "@/lib/queries";
import { criarGiftCards, removerGiftCard } from "@/lib/loyalty.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Ticket, Copy, Trash2 } from "lucide-react";

export const Route = createFileRoute("/lojista/vale-presente")({
  ssr: false,
  component: Page,
});

function Page() {
  const { data: loja } = useQuery(myStoreQuery());
  const { data: cards = [] } = useQuery(storeGiftCardsQuery(loja?.id));
  const qc = useQueryClient();
  const [pontos, setPontos] = useState(100);
  const [qty, setQty] = useState(5);

  const criar = useMutation({
    mutationFn: () => criarGiftCards({ data: { pontos, quantidade: qty } }),
    onSuccess: () => {
      toast.success("Vales gerados!");
      qc.invalidateQueries({ queryKey: ["gift-cards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remover = useMutation({
    mutationFn: (id: string) => removerGiftCard({ data: { id } }),
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: ["gift-cards"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const linkFor = (codigo: string) =>
    typeof window === "undefined" ? codigo : `${window.location.origin}/vale/${codigo}`;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copiado!");
    } catch {
      /* noop */
    }
  };

  const ativos = cards.filter((c) => !c.redeemed_at);
  const resgatados = cards.filter((c) => c.redeemed_at);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Ticket className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Vale-presente</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Gere códigos que valem pontos. O cliente resgata pelo link e recebe os pontos
        automaticamente.
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Gerar novos códigos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label>Pontos por vale</Label>
            <Input
              type="number"
              min={1}
              value={pontos}
              onChange={(e) => setPontos(Number(e.target.value) || 0)}
            />
          </div>
          <div>
            <Label>Quantidade</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={qty}
              onChange={(e) => setQty(Number(e.target.value) || 1)}
            />
          </div>
          <div className="flex items-end">
            <Button
              className="w-full"
              disabled={criar.isPending || pontos < 1 || qty < 1}
              onClick={() => criar.mutate()}
            >
              {criar.isPending ? "Gerando..." : "Gerar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ativos ({ativos.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {ativos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum vale ativo.</p>
          ) : (
            ativos.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between border rounded-md p-3 gap-2 flex-wrap"
              >
                <div className="flex items-center gap-3">
                  <code className="font-mono text-lg font-bold">{c.codigo}</code>
                  <Badge variant="secondary">{c.pontos} pts</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => copy(c.codigo)}>
                    <Copy className="h-3 w-3 mr-1" />
                    Código
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => copy(linkFor(c.codigo))}>
                    <Copy className="h-3 w-3 mr-1" />
                    Link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => remover.mutate(c.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resgatados ({resgatados.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {resgatados.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum ainda.</p>
          ) : (
            resgatados.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between text-sm border rounded-md p-2 text-muted-foreground"
              >
                <code className="font-mono">{c.codigo}</code>
                <span>
                  {c.pontos} pts ·{" "}
                  {c.redeemed_at ? new Date(c.redeemed_at).toLocaleString("pt-BR") : ""}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
