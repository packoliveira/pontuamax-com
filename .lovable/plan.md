# Refatoração Estrutural — Plano em Ondas

Objetivo: melhorar organização, reduzir duplicação e diminuir o tamanho de arquivos gigantes **sem** mudar comportamento visível. Vamos em ondas curtas e verificáveis, cada uma isolada — assim conseguimos parar/reverter caso algo quebre.

## Diagnóstico dos pontos críticos

Arquivos mais problemáticos hoje:

| Arquivo | Linhas | Problema |
|---|---|---|
| `src/lib/qsf.functions.ts` | 2464 | Múltiplos domínios (auth cliente, vendas, resgates, gift cards, NPS, campanhas…) num único módulo |
| `src/routes/lojista.configuracoes.tsx` | 1625 | Rota-monstro: dados da loja, Olist OAuth, webhook, WhatsApp, integrações |
| `src/routes/$slug.tsx` | 1542 | Portal do cliente: hero, auth, extrato, resgates, gift card, tudo numa rota |
| `src/routes/lojista.personalizacao.tsx` | 1160 | Preview + editor + contraste + import/export num só arquivo |
| `src/routes/index.tsx` | 765 | Landing com muitas seções inline |
| `src/routes/admin.index.tsx` | 717 | Painel admin com widgets diversos |
| `src/routes/lojista.clientes.tsx` | 700 | Tabela + filtros + drawer detalhe |
| `src/lib/team.functions.ts` | 622 | Notificações + roles + auditoria juntas |

Além disso: imports desorganizados em rotas grandes, algumas funções puras (formatação de CPF, telefone, moeda) duplicadas entre rotas, e regras de negócio (níveis, cálculo de pontos) inline em componentes.

## Ondas propostas

### Onda A — Utilitários compartilhados (baixo risco)
- Criar `src/lib/format.ts`: `formatCpf`, `formatCnpj`, `formatTelefone`, `formatMoeda`, `formatData`, `timeAgo`.
- Criar `src/lib/validators.ts`: `isCpfValido`, `sanitizeCpf`, `sanitizeTelefone`.
- Substituir implementações inline nas rotas por imports desses helpers.

### Onda B — Fatiar `qsf.functions.ts` em domínios
Dividir por área mantendo os re-exports (barrel) para não quebrar imports existentes:
```
src/lib/qsf/
  client-auth.functions.ts     (login/cadastro cliente, criarClienteViaCpf, reivindicarCadastroPendente)
  vendas.functions.ts          (lançar venda, calcular pontos)
  resgates.functions.ts        (resgatar produto/cashback, validar voucher)
  gift-cards.functions.ts
  nps.functions.ts
  campanhas.functions.ts
  shared.ts                    (níveis, cálculo de pontos, constantes)
```
`src/lib/qsf.functions.ts` vira apenas `export * from "./qsf/…"` — todos os call sites continuam funcionando.

### Onda C — Fatiar `team.functions.ts`
```
src/lib/team/
  notifications.functions.ts
  roles.functions.ts
  audit.functions.ts
  employees.functions.ts
```
Mesmo padrão barrel.

### Onda D — Componentizar rotas grandes
- `$slug.tsx` → extrair `PortalHeader`, `PortalAuthCard`, `PortalPontosCard`, `PortalExtrato`, `PortalResgates` em `src/components/portal/`.
- `lojista.configuracoes.tsx` → seções em `src/components/lojista/config/` (`DadosLojaSection`, `OlistSection`, `WebhookSection`, `WhatsAppSection`).
- `lojista.personalizacao.tsx` → `PersonalizacaoPreview`, `PersonalizacaoColorForm`, `PersonalizacaoThemeIO` em `src/components/lojista/personalizacao/`.
- `lojista.clientes.tsx` → `ClientesTable`, `ClienteDetailDrawer`, `ClientesFilters`.

Rotas ficam como composição fina + `useQuery`/mutations.

### Onda E — Padronização final
- Ordenação de imports (Node → externos → aliases `@/` → relativos).
- Remover `console.log` de debug remanescentes.
- Unificar `toast` para sempre usar `sonner` (já é padrão; conferir se sobra algum `useToast`).
- Padronizar nomes: PascalCase para componentes, camelCase para funções, kebab-case para nomes de arquivo novos.

## Diretrizes de segurança da refatoração
- Cada onda em um turno próprio, com typecheck automático entre elas.
- Barrels preservam a API pública — nenhum import externo muda.
- Zero alteração em SQL, RLS, edge/server-fn semântica, roteamento, textos e classes de UI.
- Sem renomear função exportada usada por outra rota antes de fazer o barrel/aliased re-export.

## Fora de escopo
- Redesign visual, mudanças de UX, novas features.
- Otimização de queries Supabase (fica para uma onda de performance separada).
- Reescrever `src/routes/api/public/webhook/$origem.ts` (é orquestração externa; risco alto x ganho baixo agora).

## Ordem sugerida
A → B → C → D (uma rota por turno) → E.

Confirma a ordem e eu começo pela **Onda A**? Se preferir focar em algo (ex.: só fatiar `$slug` ou só `qsf.functions.ts`), me diz.