import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useStore, formatBRL, formatDate, calcularNivel } from "@/lib/mock-store";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";

export const Route = createFileRoute("/lojista/clientes")({
  ssr: false,
  component: ClientesPage,
});

const NIVEL_COR: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-800",
  prata: "bg-slate-200 text-slate-800",
  ouro: "bg-yellow-100 text-yellow-800",
};

function ClientesPage() {
  const lojaId = useStore((s) => s.authedLojaId)!;
  const loja = useStore((s) => s.lojas.find((l) => l.id === lojaId))!;
  const clientes = useStore((s) => s.clientes.filter((c) => c.loja_id === lojaId));
  const [q, setQ] = useState("");

  const filtered = clientes.filter((c) => {
    const s = q.toLowerCase();
    return !s || c.nome.toLowerCase().includes(s) || c.telefone.includes(s) || (c.cpf ?? "").includes(s);
  });
  const inclPontos = loja.modalidade !== "cashback";
  const inclCashback = loja.modalidade !== "pontos";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">{clientes.length} cliente(s) cadastrado(s)</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, telefone ou CPF" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((c) => {
              const nivel = calcularNivel(c.pontos_saldo);
              return (
                <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{c.nome}</span>
                      {loja.niveis_ativos && inclPontos && (
                        <Badge className={NIVEL_COR[nivel]} variant="secondary">{nivel}</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{c.telefone || c.cpf}</div>
                    {c.ultima_compra && <div className="text-xs text-muted-foreground">Última compra: {formatDate(c.ultima_compra)}</div>}
                  </div>
                  <div className="text-right text-sm">
                    {inclPontos && <div><span className="font-semibold">{c.pontos_saldo}</span> pts</div>}
                    {inclCashback && <div className="text-green-700 font-semibold">{formatBRL(c.cashback_saldo)}</div>}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <div className="p-6 text-center text-sm text-muted-foreground">Nenhum cliente encontrado</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}