import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { storeBySlugQuery, myFiscalNotesQuery } from "@/lib/queries";
import { submitNotaFiscal } from "@/lib/loyalty.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload } from "lucide-react";

export const Route = createFileRoute("/nota/$slug")({
  ssr: false,
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data: loja } = useQuery(storeBySlugQuery(slug));
  const { data: minhasNotas = [] } = useQuery(myFiscalNotesQuery(loja?.id));
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
  }, []);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const submit = useMutation({
    mutationFn: submitNotaFiscal,
    onSuccess: () => {
      toast.success("Nota enviada! Aguarde aprovação do lojista.");
      qc.invalidateQueries({ queryKey: ["my-fiscal-notes"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const onFile = async (f: File | null) => {
    if (!f || !loja || !uid) return;
    setBusy(true);
    try {
      const path = `${uid}/${loja.id}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9.]/g, "_")}`;
      const up = await supabase.storage.from("notas").upload(path, f, { contentType: f.type });
      if (up.error) throw new Error(up.error.message);
      const buf = await f.arrayBuffer();
      let bin = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.byteLength; i++) bin += String.fromCharCode(bytes[i]);
      const b64 = btoa(bin);
      await submit.mutateAsync({
        data: {
          store_id: loja.id,
          image_path: path,
          image_base64: b64,
          mime: f.type || "image/jpeg",
        },
      });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (!loja)
    return (
      <div className="min-h-dvh grid place-items-center text-sm text-muted-foreground">
        Carregando...
      </div>
    );
  if (!uid)
    return (
      <div className="min-h-dvh grid place-items-center p-6 text-center">
        <div>
          <p>Você precisa entrar na sua conta primeiro.</p>
          <Button className="mt-4" onClick={() => nav({ to: "/$slug", params: { slug } })}>
            Ir para {loja.nome_fantasia}
          </Button>
        </div>
      </div>
    );

  return (
    <div className="min-h-dvh bg-slate-50 p-6">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Enviar nota fiscal · {loja.nome_fantasia}</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tire uma foto legível da nota</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              capture="environment"
              hidden
              onChange={(e) => onFile(e.target.files?.[0] ?? null)}
            />
            <Button
              className="w-full"
              disabled={busy || submit.isPending}
              onClick={() => inputRef.current?.click()}
            >
              <Upload className="h-4 w-4 mr-2" />
              {busy || submit.isPending ? "Enviando..." : "Escolher foto"}
            </Button>
            <p className="text-xs text-muted-foreground">
              A IA extrai valor e CNPJ automaticamente. O lojista aprova e os pontos caem na sua
              conta.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Suas notas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {minhasNotas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ainda.</p>
            ) : (
              minhasNotas.map((n) => (
                <div
                  key={n.id}
                  className="flex items-center justify-between text-sm border rounded-md p-2"
                >
                  <span>
                    R$ {n.valor?.toFixed(2) ?? "?"} ·{" "}
                    {new Date(n.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <Badge
                    variant={
                      n.status === "aprovada"
                        ? "default"
                        : n.status === "rejeitada"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {n.status}
                    {n.pontos_creditados ? ` · +${n.pontos_creditados}` : ""}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
