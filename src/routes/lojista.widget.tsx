import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import { myStoreQuery } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Code, Copy } from "lucide-react";

export const Route = createFileRoute("/lojista/widget")({
  ssr: false,
  component: Page,
});

function Page() {
  const { data: loja } = useQuery(myStoreQuery());
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const snippet = loja?.slug
    ? `<script src="${origin}/api/public/widget/${loja.slug}" defer></script>`
    : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      toast.success("Copiado!");
    } catch {
      /* noop */
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Code className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Widget para site</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Cole este código em qualquer site (WordPress, Wix, HTML puro). Um botão flutuante "Ganhe
        pontos" aparece e abre a página do cliente.
      </p>
      <Card>
        <CardHeader>
          <CardTitle>Código de incorporação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <pre className="bg-slate-900 text-slate-100 p-3 rounded-md text-xs overflow-auto">
            {snippet || "Configure o slug da loja primeiro."}
          </pre>
          <Button onClick={copy} disabled={!snippet}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {loja?.slug ? (
            <a
              href={`/${loja.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-white font-semibold shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${loja.brand_primary}, ${loja.brand_secondary})`,
              }}
            >
              🎁 Ganhe pontos em {loja.nome_fantasia}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Configure a loja primeiro.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
