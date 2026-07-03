import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/nps/$id")({
  ssr: false,
  component: NpsPage,
  head: () => ({
    meta: [
      { title: "Sua opinião · QSF Club" },
      { name: "description", content: "Avalie sua experiência de compra." },
    ],
  }),
});

function NpsPage() {
  const { id } = Route.useParams();
  const [score, setScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    if (score === null) return toast.error("Escolha uma nota de 0 a 10");
    setLoading(true);
    try {
      const res = await fetch("/api/public/nps/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transaction_id: id, score, comment: comment || null }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Erro ${res.status}`);
      setDone(true);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
            <h1 className="text-xl font-bold">Obrigado!</h1>
            <p className="text-sm text-muted-foreground">Sua avaliação foi registrada.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const colorFor = (n: number) =>
    n <= 6 ? "bg-red-500 hover:bg-red-600" : n <= 8 ? "bg-yellow-500 hover:bg-yellow-600" : "bg-green-600 hover:bg-green-700";

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle className="text-lg">Como foi sua experiência?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Numa escala de 0 a 10, o quanto você recomendaria essa loja para um amigo?
          </p>
          <div className="grid grid-cols-11 gap-1">
            {Array.from({ length: 11 }).map((_, n) => (
              <button
                key={n}
                type="button"
                onClick={() => setScore(n)}
                className={`aspect-square rounded text-xs font-bold text-white transition ${colorFor(n)} ${score === n ? "ring-2 ring-offset-1 ring-slate-900 scale-110" : "opacity-80"}`}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Nada provável</span>
            <span>Muito provável</span>
          </div>
          <div>
            <label className="text-sm font-medium">Quer contar mais? (opcional)</label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="O que fez diferença?" rows={3} />
          </div>
          <Button onClick={submit} disabled={loading || score === null} className="w-full">
            {loading ? "Enviando..." : "Enviar avaliação"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}