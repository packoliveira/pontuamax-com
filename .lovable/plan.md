# Análise e Plano — Integração Olist (PontuaMax)

## 1. Situação atual (o que existe)

Dois webhooks públicos coexistindo, com sobreposição parcial:

| Rota | Autenticação | Identidade do cliente | Chave idempotência | Origem gravada |
|---|---|---|---|---|
| `POST /api/public/webhook/$origem` (`olist`, `bling`, `teste`) | `?secret=` (query) OU header `x-qsf-secret`; loja por `?store=` / `x-qsf-store` / body | CPF-first, telefone fallback | `id_venda_externa = numero` puro | `"olist"` |
| `POST /api/public/webhook/olist-erp/$slug` | `?secret=` (query) | Telefone-first, CPF fallback | `id_venda_externa = "olist:<id>"` | `"olist-erp"` |

`OLIST_API_TOKEN` é um secret **global** apontando para `api.tiny.com.br/api2/pedido.obter.php` (Tiny **API V2 legada**). A tela `lojista.configuracoes.tsx` só expõe a URL antiga `/api/public/webhook/olist` + secret + slug.

## 2. Inconsistências e riscos identificados

**Duplicação funcional**
- As duas rotas resolvem o mesmo problema com estratégias divergentes de identidade e de chave idempotente. Mesma venda enviada aos dois endpoints é lançada duas vezes (`"12345"` ≠ `"olist:12345"`).
- Regras de crédito/estorno só existem em `olist-erp.$slug`; a outra credita em qualquer POST autenticado sem olhar `situacao`.
- A tela do lojista mostra apenas a URL antiga, então a rota nova (`olist-erp/$slug`) nunca é usada pelos lojistas reais.

**Segurança**
- `webhook_secret` viaja em **query string** (é logado em access logs, Referer, histórico de proxy). Não há HMAC do body — qualquer POST com o secret vazado é aceito.
- Comparação de segredo com `!==` (não é timing-safe).
- CORS `*` + `Access-Control-Allow-Headers: x-qsf-secret` num endpoint que não deveria ser chamado por browsers — expõe o webhook a CSRF de fetch cross-origin.
- Criação de usuário no Auth com `password = telefone || cpf` (senha adivinhável). Qualquer pessoa com o CPF loga como o cliente.
- `x-qsf-store` / `store=` aceitos como UUID → enumeração de loja.
- `OLIST_API_TOKEN` global: **quebra multi-tenant**. Um token pertence a UMA conta Tiny/Olist; buscar pedido de outra loja retorna vazio ou pedido errado.

**Compatibilidade com o payload oficial**
- O extrator aceita mistura de nomes (`total`, `valor_total`, `totalPedido`, `cpfCnpj`, `documento`, `fones[0].fone`, `cliente.telefone`). Isso é "melhor esforço", não conforme:
  - Olist ERP nativo (v2 legado) envia envelope `{ evento, pedidos:[{ id, situacao_atual, cliente:{cpf_cnpj,telefone}, valor_total }] }` — só `olist-erp.$slug` trata `situacao_atual`.
  - Tiny **API V3** manda payloads mínimos (`{ id, tipo }`) e exige buscar detalhe via REST autenticado — o código atual tenta isso, mas via **V2** (`/api2/pedido.obter.php`) que está sendo descontinuada.
- Cancelamentos/estornos só existem em uma das rotas.

**Modelo multi-tenant**
- Não há tabela de credenciais por loja (`access_token`, `refresh_token`, `expires_at`, `account_id`, `scopes`). Não há `client_id`/`client_secret` do app OAuth do PontuaMax registrado como partner Olist.
- Não há callback OAuth (`/api/public/oauth/olist/callback`) nem fluxo Authorization Code por loja.
- Não há job de refresh proativo do token (Tiny V3: access_token expira em 4h, refresh em 24h se não usado).

**API V3 OAuth2 (Tiny/Olist) — o que muda**
- Base: `https://api.tiny.com.br/public-api/v3`
- Auth: `Authorization: Bearer <access_token>` (não mais `?token=` na query).
- Grant: Authorization Code (`https://accounts.tiny.com.br/realms/tiny/protocol/openid-connect/auth`), Token exchange (`.../token`), Refresh Token.
- Webhook V3: assinado (payload + header) e traz apenas `{ id, tipo, dataHoraFatoGerador }` — obrigatório re-consultar `GET /pedidos/{id}` para obter valores, cliente e situação.
- Sem OAuth por loja, integração **não funciona** de forma legítima em produção multi-tenant.

## 3. Plano técnico proposto

### 3.1 Banco (uma migration)

- `public.erp_credentials` (1 linha por loja + provider)
  - `store_id uuid` FK stores, `provider text check in ('olist_v3','bling')`, `account_id text`, `access_token text`, `refresh_token text`, `expires_at timestamptz`, `scopes text[]`, `status text ('connected'|'expired'|'revoked')`, `last_refresh_at`, timestamps. UNIQUE `(store_id, provider)`.
  - RLS: leitura só para owner/admin/`has_role('admin')`; escrita apenas via service role.
  - GRANTs: `SELECT` para authenticated (filtrado por RLS), `ALL` para service_role.
- `public.erp_webhook_events` (idempotência + auditoria)
  - `id uuid pk`, `store_id`, `provider`, `evento text`, `resource_id text` (ex: pedido id), `signature text`, `received_at`, `processed_at`, `status`, `payload jsonb`, UNIQUE `(store_id, provider, evento, resource_id)`.
- Padronizar `transactions.id_venda_externa` para `"<provider>:<resource_id>"` (backfill dos registros antigos que gravaram só o número).
- Adicionar `stores.erp_provider text` (`'olist_v3'|null`) para a UI saber o estado.
- Remover uso do secret `OLIST_API_TOKEN` global (marcar como legado; não deletar até migrar dados).

### 3.2 Secrets

- `OLIST_CLIENT_ID` e `OLIST_CLIENT_SECRET` (app OAuth registrado no portal do desenvolvedor Olist) — via `add_secret`.
- `OLIST_WEBHOOK_SIGNING_SECRET` (se o Olist V3 assinar via segredo compartilhado registrado no app).
- Remover dependência de `OLIST_API_TOKEN` após migração.

### 3.3 Backend — rotas novas

Servidor: TanStack server routes (`src/routes/api/public/...`) e server functions (`src/lib/olist.functions.ts` + `olist.server.ts`).

1. **Início do fluxo OAuth (lojista logado)**
   - Server fn `iniciarConexaoOlist()` com `requireSupabaseAuth` → gera `state` (HMAC assinado do `store_id` + nonce), grava nonce em `erp_credentials` temporária ou tabela `oauth_states`, retorna URL de autorização Olist com `redirect_uri = https://pontuamax.com/api/public/oauth/olist/callback`.
2. **Callback OAuth**
   - `GET /api/public/oauth/olist/callback` (público, mas valida `state` assinado).
   - Troca `code` por `access_token`+`refresh_token` (server-side, usando `OLIST_CLIENT_SECRET`).
   - Upsert em `erp_credentials` com `store_id` recuperado do state.
   - Redireciona para `/lojista/configuracoes?olist=connected`.
3. **Refresh proativo**
   - Helper `getOlistAccessToken(storeId)` que checa `expires_at` e chama refresh quando faltar <10 min. Usado por toda chamada REST.
4. **Webhook V3 unificado**
   - Nova rota `POST /api/public/webhook/olist/v3` — **única** rota Olist oficial.
   - Identifica loja via `account_id` retornado no payload (não via slug na URL).
   - Verifica assinatura (HMAC-SHA256 do body cru contra `OLIST_WEBHOOK_SIGNING_SECRET`) com `timingSafeEqual`.
   - Insere em `erp_webhook_events` (idempotente por UNIQUE). Se já existe → 200 e sai.
   - Busca detalhe do pedido via `GET /pedidos/{id}` com Bearer do lojista dono da account.
   - Aplica a mesma lógica de crédito/estorno de `olist-erp.$slug` (que é a correta), padronizando `id_venda_externa = "olist:<id>"` e `origem = "olist"`.
   - Identidade do cliente: **CPF primeiro** (mais estável), telefone fallback — alinhar com `$origem` e com o resto do sistema.
5. **Deprecação controlada**
   - Manter `/api/public/webhook/$origem` para `bling` e `teste` apenas; remover branch `olist` (responder 410 Gone com instrução para migrar).
   - Remover `/api/public/webhook/olist-erp/$slug` após 30 dias de log zero.

### 3.4 Correções de segurança aplicáveis a `$origem` (bling + teste)

- Comparação de secret com `timingSafeEqual`.
- CORS: sem `Access-Control-Allow-Origin: *`; remover permissão a headers custom (webhooks não são chamados por browser).
- Parar de criar usuário Auth com senha = CPF/telefone. Criar com senha aleatória (`crypto.randomUUID()`) e marcar `pending_registration = true`; ativação real acontece quando o cliente faz signup pelo `/cadastro`.
- Parar de aceitar `store_id` via body/query — só slug (não enumerável) + secret HMAC.

### 3.5 UI do lojista (`lojista.configuracoes.tsx`)

- Substituir o card "Integrações (Bling/Olist)" por dois cards separados:
  - **Bling**: mantém URL + secret + botão de teste (fluxo webhook legado).
  - **Olist**: botão `Conectar com Olist` → dispara `iniciarConexaoOlist`. Após conectado, mostra `account_id`, status, `last_refresh_at`, botão "Desconectar" (revoga token + limpa credenciais), e link para logs. Sem URL/secret expostos — tudo OAuth.
- Card lê `erp_credentials` via server fn autenticada.

### 3.6 Observabilidade

- `integration_logs` continua para os dois provedores; adicionar `provider_event_id` e `signature_valid boolean`.
- Painel admin (`/admin`) ganha contadores por `erp_credentials.status`.

## 4. Ordem de execução sugerida

1. Migration (`erp_credentials`, `erp_webhook_events`, backfill de `id_venda_externa`).
2. Secrets OAuth + client Olist registrado no portal deles.
3. Server fns + rota de callback + refresh helper.
4. Rota webhook V3 unificada + testes com payload real.
5. UI de conexão OAuth no `lojista.configuracoes`.
6. Correções de segurança em `$origem` (senha aleatória, timing-safe, CORS).
7. Deprecação das rotas antigas (410 + comunicação aos lojistas ativos).

## 5. Suposições (confirmar antes de implementar)

- PontuaMax se registrará como **aplicativo parceiro** no portal Tiny/Olist para obter `client_id`/`client_secret` OAuth2 V3. Sem isso, o fluxo OAuth por lojista é impossível.
- Bling continua com o fluxo webhook + secret compartilhado atual (não faz parte deste plano).
- Não há necessidade de sincronizar catálogo/produtos — apenas eventos de venda para pontuação/cashback.
