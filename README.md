# PontuaMax

SaaS multiempresa de fidelização para lojas e prestadores de serviço. A plataforma oferece
pontos, cashback, recompensas, vouchers, campanhas, NPS e painéis separados para administrador,
lojista, funcionário e cliente.

## Escopo

O PontuaMax não é um ERP. PDV completo, estoque, recebimento, expedição, fornecedores, trocas
operacionais e emissão de etiquetas pertencem ao FitGestor e não devem ser adicionados aqui.

## Stack

- React 19 e TanStack Start/Router/Query
- Supabase Postgres, Auth, Storage e RLS
- Tailwind CSS
- Zod

## Desenvolvimento

```bash
cp .env.example .env
npm ci
npm run dev
```

Validações:

```bash
npm run typecheck
npm run test
npm run build
npm run preview
```

## Rotas principais

- `/admin`: administração master do SaaS
- `/lojista`: painel da loja assinante
- `/funcionario`: portal da equipe
- `/{slug}`: portal público do cliente

## Segurança

- Nunca use a publishable key do Supabase como segredo.
- Jobs em `/api/public/hooks/*` exigem `CRON_SECRET`.
- Credenciais privadas devem existir apenas nos segredos do ambiente.
- Operações multiempresa devem ser vinculadas a `store_id` e protegidas por RLS.

## Banco de dados

As migrations históricas são preservadas para não quebrar ambientes já implantados. Qualquer
limpeza de tabelas legadas deve ser feita por uma migration nova, após backup e auditoria dos
dados existentes.
