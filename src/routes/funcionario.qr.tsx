import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useQuery } from "@tanstack/react-query";
import { myEmployeeContextQuery } from "@/lib/team-queries";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QRCodeImage } from "@/components/qr-code";
import { QrCode, Copy, Printer } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/funcionario/qr")({
  ssr: false,
  component: MeuQR,
});

function MeuQR() {
  const { data } = useQuery(myEmployeeContextQuery());
  const slug = (data?.store as { slug?: string } | undefined)?.slug;
  const nomeLoja = data?.store?.nome_fantasia ?? "";
  const nomeVend = data?.employee?.nome ?? "";

  if (!slug) {
    return <div className="text-sm text-muted-foreground">Carregando…</div>;
  }

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/${slug}`;

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <PageHeader
        eyebrow="Atalho"
        title="Meu QR Code"
        description="O cliente escaneia esse QR pra abrir a página da loja e acumular/resgatar direto pelo celular dele."
      />
      <Card className="rounded-2xl border-[#E5E7EB]">
        <CardContent className="p-6 flex flex-col items-center gap-4" id="qr-print">
          <div className="text-center">
            <div className="text-base font-bold text-[#0F172A]">{nomeLoja}</div>
            <div className="text-xs text-[#64748B]">Escaneie e ganhe pontos</div>
          </div>
          <div className="rounded-2xl bg-white p-3 ring-1 ring-[#E5E7EB]">
            <QRCodeImage value={url} size={260} />
          </div>
          <code className="text-xs text-[#64748B] break-all">{url}</code>
          {nomeVend && (
            <div className="text-xs text-[#94A3B8]">Atendido por {nomeVend}</div>
          )}
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2 justify-center">
        <Button
          variant="outline"
          onClick={() => {
            navigator.clipboard?.writeText(url);
            toast.success("Link copiado!");
          }}
          className="rounded-xl"
        >
          <Copy className="h-4 w-4" /> Copiar link
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="rounded-xl">
          <Printer className="h-4 w-4" /> Imprimir
        </Button>
      </div>
      <div className="text-center text-xs text-[#94A3B8] flex items-center justify-center gap-1">
        <QrCode className="h-3.5 w-3.5" /> Dica: cole na vitrine, no balcão ou embale no pacote.
      </div>
    </div>
  );
}