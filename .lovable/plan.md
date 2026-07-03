## Objetivo
Substituir o mock store por Supabase Auth + Postgres, mantendo o comportamento atual do MVP (fluxos de lançar venda, resgate, catálogo, saldo).

## Autenticação

**Lojista** — Supabase email/senha
- Cadastro em `/lojista/onboarding` cria o user, o `profile` (nome, telefone), e a `store` (nome fantasia, CNPJ, slug, modalidade, branding)
- Login em `/lojista/login` com email/senha
- Rota `/lojista/*` protegida via `_authenticated` layout gerenciado + checagem de role `lojista`

**Cliente final** — telefone/CPF + senha (Supabase custom flow)
- Cliente é `auth.users` com email sintético `<phone>@qsf.local` internamente; formulário mostra só telefone e senha
- Cadastro na primeira visita a `/:slug` (pede telefone, CPF, nome, senha)
- Login subsequente: telefone + senha
- Um mesmo cliente pode ter contas em várias lojas — vínculo via tabela `store_clients (store_id, user_id)`

## Schema

```text
profiles          (id=auth.users.id, full_name, phone, cpf?, created_at)
user_roles        (user_id, role: 'lojista'|'cliente')  -- padrão de segurança
stores            (id, owner_id, slug UNIQUE, nome_fantasia, cnpj, modalidade,
                   regra_pontos, percentual_cashback, brand_primary, brand_secondary,
                   logo_url, telefone, created_at)
store_clients     (id, store_id, user_id, pontos, cashback_saldo, nivel, created_at,
                   UNIQUE(store_id, user_id))
products          (id, store_id, nome, custo_pontos, descricao, ativo, created_at)
transactions      (id, store_id, client_id, tipo: 'venda'|'resgate_produto'|'resgate_cashback',
                   valor, pontos_delta, cashback_delta, product_id?, voucher_code?,
                   status: 'pendente'|'entregue', created_at)
```

RLS resumida:
- `stores`: SELECT público (para página `/:slug` carregar branding); INSERT/UPDATE só owner
- `products`: SELECT público por store; write só owner
- `store_clients`: SELECT/UPDATE o próprio user OU owner da store
- `transactions`: SELECT o próprio client OU owner da store; INSERT via server function (regras de negócio)

Funções server (`createServerFn` com `requireSupabaseAuth`):
- `registerClient(slug, phone, cpf, nome, senha)` — cria auth user + profile + role + store_clients
- `lancarVenda(client_id, valor)` — calcula pontos/cashback, aplica nível, insere transaction, atualiza store_clients
- `resgatarProduto(product_id)` / `resgatarCashback(valor)` — valida saldo, gera voucher `QSF-XXXX-XXXX`
- `entregarResgate(transaction_id)` — muda status

Trigger `handle_new_user` cria profile automaticamente.

## Migração de código
- Deletar `src/lib/mock-store.ts`
- Reescrever telas de `/lojista/*` e `/:slug` para usar TanStack Query + server functions
- `/lojista/onboarding` vira signup completo (email/senha + dados da loja)
- Página `/:slug` carrega store via server fn pública (SELECT anon) e injeta branding antes do login
- Manter formatação BRL, cálculo de nível (Bronze/Prata/Ouro), validações

## Ordem de execução
1. Habilitar Lovable Cloud
2. Migração SQL (tabelas + RLS + grants + trigger + função `has_role`)
3. Server functions (`.functions.ts`) + middleware bearer
4. Reescrever telas lojista e página cliente
5. Deletar mock, atualizar `__root.tsx` (auth listener)
6. Verificar build

## Nota de segurança
Cliente com telefone/senha simples é ok pra MVP. Vale documentar que reset de senha por WhatsApp/SMS entra junto com a integração Evolution API mais adiante.