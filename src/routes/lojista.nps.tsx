import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { myStoreQuery, storeNpsResponsesQuery, storeClientsQuery } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/lojista/nps")({
  ssr: false,
  component: Page,
});

function Page() {
  const { data: loja } = useQuery(myStoreQuery());
  const { data: responses = [] } = useQuery(storeNpsResponsesQuery(loja?.id));
  const { data: clientes = [] } = useQuery(storeClientsQuery(loja?.id));

  const nameByUser = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of clientes) {
      const p = (c as { profiles?: { full_name?: string | null; phone?: string | null } | null })
        .profiles;
      m.set(c.user_id, p?.full_name ?? p?.phone ?? "Cliente");
    }
    return m;
  }, [clientes]);

  const stats = useMemo(() => {
    const total = responses.length;
    if (total === 0)
      return { total: 0, promoters: 0, passives: 0, detractors: 0, nps: 0, media: 0 };
    let promoters = 0,
      passives = 0,
      detractors = 0,
      soma = 0;
    for (const r of responses) {
      soma += r.score;
      if (r.score >= 9) promoters++;
      else if (r.score >= 7) passives++;
      else detractors++;
    }
    const nps = Math.round(((promoters - detractors) / total) * 100);
    return { total, promoters, passives, detractors, nps, media: soma / total };
  }, [responses]);

  const comentarios = responses.filter((r) => r.comment && r.comment.trim().length > 0);

  const scoreColor = (n: number) =>
    n >= 9 ? "bg-green-600" : n >= 7 ? "bg-yellow-500" : "bg-red-500";
  const scoreLabel = (n: number) => (n >= 9 ? "Promotor" : n >= 7 ? "Neutro" : "Detrator");

  return (
    <div className="space-y-6">
      <PageHeader
        title="NPS · Satisfação"
        icon={<Star className="h-6 w-6 text-primary" />}
        description="Acompanhe a satisfação dos clientes após cada venda."
      />

      {!loja?.nps_enabled && (
        <Card className="border-yellow-400 bg-yellow-50">
          <CardContent className="py-4 text-sm">
            O envio automático de NPS está desativado. Ative em <strong>Configurações → NPS</strong>{" "}
            para começar a coletar respostas após cada venda.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              NPS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total === 0 ? "—" : stats.nps}</div>
            <p className="text-xs text-muted-foreground">de -100 a 100</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Média</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {stats.total === 0 ? "—" : stats.media.toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">nota 0–10</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Respostas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">total coletado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Distribuição</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-green-600">Promotores</span>
              <strong>{stats.promoters}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-yellow-600">Neutros</span>
              <strong>{stats.passives}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-red-600">Detratores</span>
              <strong>{stats.detractors}</strong>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Comentários ({comentarios.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {comentarios.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum comentário ainda.</p>
          ) : (
            comentarios.slice(0, 20).map((r) => (
              <div key={r.id} className="border rounded-md p-3">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <Badge className={`${scoreColor(r.score)} text-white`}>{r.score}</Badge>
                  <span className="text-xs text-muted-foreground">{scoreLabel(r.score)}</span>
                  <span className="text-xs text-muted-foreground">
                    · {nameByUser.get(r.client_user_id) ?? "Cliente"}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(r.created_at).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-sm">{r.comment}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Todas as respostas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma resposta ainda. As pesquisas são enviadas após cada venda quando o NPS está
              ativo.
            </p>
          ) : (
            responses.map((r) => (
              <div key={r.id} className="flex items-center gap-2 text-sm border-b py-2">
                <Badge className={`${scoreColor(r.score)} text-white w-8 justify-center`}>
                  {r.score}
                </Badge>
                <span className="truncate">{nameByUser.get(r.client_user_id) ?? "Cliente"}</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {new Date(r.created_at).toLocaleDateString("pt-BR")}
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
