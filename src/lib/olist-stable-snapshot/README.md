# Snapshot estável — Integração Olist (webhook + sync)

Data: 2026-07-23
Status: FUNCIONANDO — vendas chegando, enriquecimento via API Tiny/Olist V2 ativo, HTTP 200 garantido, sem risco de a Olist desativar a URL.

## Arquivos congelados
- `webhook-origem.stable.ts.txt` — cópia fiel de `src/routes/api/public/webhook/$origem.ts`
- `olist-vendas.stable.ts.txt` — cópia fiel de `src/routes/api/public/olist-vendas.ts`

## Regras invioláveis (NÃO REMOVER)
1. Toda resposta ao Olist é HTTP 200. Erros de negócio só no corpo JSON (`status: "erro"`). Evita "erros consecutivos" que desativam a URL.
2. `try/catch` de topo no POST — nenhuma exceção pode escapar como 5xx.
3. `OPTIONS`, `HEAD`, `GET` também respondem 2xx (Olist faz probe).
4. Enriquecimento via API Tiny V2 usando `OLIST_API_TOKEN`: tenta `pedido.obter.php` (id) e `pedidos.pesquisa.php` (número).
5. Plano B — quando o payload chega vazio (`{}`) ou como evento de estoque/produto, dispara `sincronizarPedidosRecentesOlist` (últimas 36h).
6. Eventos de estoque/produto/preço são ignorados silenciosamente — sem gerar `integration_logs.status="erro"` nem notificação `webhook_erro`.
7. URL exibida no painel: sempre `https://pontuamax.com/api/public/olist-vendas?store=<slug>&secret=<secret>`. Nunca a de preview.

## Restaurar em caso de regressão
```bash
cp src/lib/olist-stable-snapshot/webhook-origem.stable.ts.txt src/routes/api/public/webhook/\$origem.ts
cp src/lib/olist-stable-snapshot/olist-vendas.stable.ts.txt src/routes/api/public/olist-vendas.ts
```
Depois valide:
```bash
curl -i -X POST 'https://pontuamax.com/api/public/olist-vendas?store=queroserfitloja&secret=SECRET' \
  -H 'Content-Type: application/json' -d '{}'
# HTTP/1.1 200
```

## Config no Olist ERP
- URL: `https://pontuamax.com/api/public/olist-vendas?store=queroserfitloja&secret=<secret_da_loja>`
- Eventos: `inclusao_pedido`, `alteracao_pedido`, `faturamento_pedido` (estoque tolerado — ignorado)
- Secret API Tiny V2 armazenado em `OLIST_API_TOKEN`

## Regressões proibidas
- Devolver 4xx/5xx à Olist em qualquer caminho do POST
- Remover o try/catch de topo
- Remover o fallback `sincronizarPedidosRecentesOlist`
- Mostrar URL de preview no painel do lojista
- Tratar evento de estoque como erro
