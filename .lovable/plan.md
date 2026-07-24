## Diagnóstico

**Situação atual (o que já está bom, para o usuário saber):**
- ✅ 0 findings em todos os scanners de segurança (Supabase, supply-chain, MCP, conectores)
- ✅ RLS ativo em todas as **29 tabelas públicas**
- ✅ Policies escopadas por `owner_id`/`store_id`/`auth.uid()` + sistema RBAC via `employee_has_permission()`
- ✅ Segredos apenas em server (`SUPABASE_SERVICE_ROLE_KEY`, `OLIST_API_TOKEN`, `OAUTH_STATE_SECRET`)
- ✅ Storage privado com policies escopadas por loja
- ✅ Trigger `handle_new_user` cria profile no signup
- ✅ Webhook Olist valida HMAC via `OAUTH_STATE_SECRET` + `webhook_secret` por loja
- ✅ Client `supabase.auth` usa apenas publishable key
- ✅ Todas `SECURITY DEFINER` functions têm `SET search_path = public`

## Falhas encontradas — em ordem de risco

### 🔴 ALTO

**H1 — Escalação latente via `bootstrap_first_admin()`**  
Qualquer usuário autenticado pode chamar. A função só concede admin se `user_roles` estiver vazio, mas isso é uma **backdoor**: um restore acidental, migração ruim, ou operador excluindo o admin master faz o próximo login virar admin. Deve ser revogado de `authenticated` (executa só via service_role no bootstrap inicial).

**H2 — Secrets sensíveis expostos ao owner autenticado**  
`stores` tem 82 colunas — inclui `webhook_secret`, `evolution_apikey`, `olist_client_secret`, `olist_access_token`, `olist_refresh_token`. Policy `stores_owner_select` retorna **tudo** ao owner. Consequências:
- Qualquer `SELECT *` do front carrega secrets pro browser (memória, DevTools, extensões)
- Uma XSS futura vaza todas as credenciais de ERP/WhatsApp
- Employees com role de admin veem tudo via join
Solução: mover essas 9 colunas sensíveis para tabela apartada `store_secrets` acessível **só por service_role**, e substituir o acesso do front por uma server function `getStoreForOwner()` que projeta apenas colunas seguras.

### 🟡 MÉDIO

**M1 — `oauth_states` tem RLS ativo mas 0 policies** (linter warn)  
Comportamento atual: nega tudo ao client. Correto em intenção, mas implícito. Fix: policy explícita `FOR ALL USING (false)` para tornar a intenção auditável.

**M2 — Leaked password protection desabilitada** (Supabase Auth)  
Requer clique no Dashboard do Supabase — te passo o link. Sem código.

**M3 — FKs sem índice** — 17 colunas de foreign key sem suporte. Causa deletes/joins lentos e degrada em escala. Principais:
- `products.store_id`, `store_clients.user_id`, `transactions.product_id`
- `fiscal_notes.client_user_id`, `client_tags.client_user_id`, `notification_logs.client_user_id`
- `gift_cards.redeemed_by`, `raffles.ganhador_user_id`
- `store_employees.role_key`, `store_employees.created_by`
- `store_employee_permissions.permission_key`, `team_role_permissions.permission_key`
- `instagram_submissions.reviewed_by`, `instagram_submissions.transaction_id`
- `employee_audit_logs.actor_user_id`, `oauth_states.store_id`

### 🟢 BAIXO (revisado, sem ação necessária)

- `SECURITY DEFINER` warnings (9): todas legítimas — `has_role`, `is_store_owner`, `employee_has_permission`, `get_store_for_employee`, `resgatar_*_atomico`. Manter.
- `products_public_select` com `TO anon`: intencional para catálogo público das lojas.
- Zod validation nos server functions: verificado, coberto.
- Input sanitization: shadcn Input + Zod cobrem forms; nenhum `dangerouslySetInnerHTML` em conteúdo de usuário.

## Ondas de execução

**Onda 1 — Corrigir H1, M1 e M3 (migração única, sem tocar código)**
1. `REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM authenticated, anon, PUBLIC` (mantém para `service_role` apenas)
2. `CREATE POLICY "oauth_states client deny" ON public.oauth_states FOR ALL TO authenticated, anon USING (false) WITH CHECK (false)`
3. `CREATE INDEX` em cada uma das 17 FKs identificadas

**Onda 2 — H2: isolamento de secrets sensíveis (migração + código)**
1. Migração:
   - `CREATE TABLE public.store_secrets (store_id uuid PK REFERENCES stores, webhook_secret text, evolution_apikey text, evolution_url text, evolution_instance text, olist_client_id text, olist_client_secret text, olist_access_token text, olist_refresh_token text, olist_token_expires_at timestamptz)`
   - `GRANT ALL ON public.store_secrets TO service_role` (sem grants para authenticated/anon)
   - `ALTER TABLE store_secrets ENABLE ROW LEVEL SECURITY` (deny-all implícito)
   - Copiar valores existentes de `stores` → `store_secrets`
   - `ALTER TABLE stores DROP COLUMN` para as 9 colunas sensíveis
2. Código:
   - Todas as leituras/escritas dos secrets (em `olist.server.ts`, webhook handlers, `qsf.functions.ts`) já rodam via `supabaseAdmin` — só trocar a tabela alvo
   - `myStoreQuery` no client já não seleciona essas colunas via `get_store_for_employee`; verificar chamadas diretas em `admin.*` e ajustar
   - Nenhuma UI perde funcionalidade — secrets seguem editáveis pelo owner via server function

**Onda 3 — Verificação final**
- Rerun linter + security scan
- Typecheck + smoke test do webhook Olist
- Confirmar que owner ainda edita credenciais via UI (server function atualiza `store_secrets`)

## Fora do escopo (registrado para depois)

- Rate limiting nos endpoints públicos (`/api/public/webhook/olist`) — requer infra externa
- Audit trail completo de mudanças em `stores` — feature adicional, não vulnerabilidade

## Impacto

- **Zero regressão de UX** — todas as funcionalidades permanecem
- **Superfície de ataque reduzida**: secrets de ERP fora do bundle do browser
- **Backdoor de admin fechada**
- **Deletes/joins mais rápidos** com os 17 índices
- **Postura auditável**: policies explícitas em `oauth_states`

Aprovar Onda 1 já é vitória grande, baixo risco. Onda 2 é a mais impactante — requer aprovação separada porque mexe em schema em produção com dados existentes.