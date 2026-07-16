# Plano de otimização profunda — PontuaMax

## Diagnóstico

Rodei uma varredura completa sem alterar nada. Principais gargalos hoje:

**1. Roteador com preload agressivo desligado**
- `router.tsx` usa `defaultPreloadStaleTime: 0` (correto p/ React Query), mas **não define `defaultPreload`**. Sem `"intent"`, cada clique em `<Link>` faz waterfall completo (código do chunk → loader → query). Isso é o principal motivo da sensação de "delay entre rotas".

**2. Rotas gigantes (não fatiadas)**
- `lojista.configuracoes.tsx` **2094 linhas**, `personalizacao.tsx` **1368**, `clientes.tsx` **844**, `equipe.tsx` **872**, `funcionario.clientes.tsx` **784**, `funcionario.pontuar.tsx` **603**, `index.tsx` (landing) **819**, `qsf.functions.ts` **2724**. Cada uma vira 1 chunk enorme carregado inteiro no primeiro clique.
- Componentes usados só em modais (dialogs de edição, wizards) sobem no chunk principal da rota.

**3. Queries Supabase sem `staleTime` nem chaves bem escopadas**
- `myTransactionsAtStoreQuery`, `activeStoreProductsQuery`, `storeBySlugQuery` etc. usam `staleTime` padrão do template (SWR reprocessa a cada volta de rota). Painéis do lojista refazem lista de clientes/produtos toda vez que troca de aba.
- Não há prefetch nas listas → detalhe (ex: cliente na lista → cliente aberto).
- Vários `useQuery` em série no mesmo componente onde daria pra usar `useQueries` paralelo.

**4. Realtime + subscriptions não instrumentados**
- Poucas subs mas uma delas está fora de `useEffect` (risco de reconnect loop e conta Realtime).

**5. Bundle / assets**
- Nenhum asset em `src/assets/` (bom), mas `<link>` de fontes é feito por CSS `@import` em vez de `<link rel="preconnect"+preload>` no `__root`. Isso atrasa LCP.
- `sonner` + `radix-*` + `lucide-react` no shell — `lucide` precisa de barrel-import controlado (já usa named import, ok), mas várias rotas re-importam mesmos ícones (não custa, é tree-shaken).
- Sem `vite-imagetools` nem `<img loading="lazy" decoding="async">` nas listas de produtos/clientes.

**6. Re-renderizações**
- Muitos `onChange` em forms grandes com estado no topo → cada tecla re-renderiza todo o card (visível em `lojista.configuracoes.tsx` e `personalizacao.tsx`).
- Listas grandes (clientes, transações) renderizam sem `key` estável em alguns pontos e sem `React.memo` nos rows.

**7. CSS / animações**
- `reward-rain` roda animação JS mesmo quando off-screen; falta `prefers-reduced-motion` real e `visibilitychange` pause.
- Vários `backdrop-blur` + `shadow-2xl` empilhados no portal do cliente (compositing pesado em mobile).

**8. SSR / hidratação**
- Alguns componentes leem `window`/`localStorage` no corpo do render (não em `useEffect`) — causa mismatch e "flash" no primeiro paint.

---

## Priorização (impacto × risco)

| # | Onda | Impacto | Risco | O que muda |
|---|------|---------|-------|------------|
| 1 | Router & Query defaults | 🔥🔥🔥 | baixo | 1 arquivo |
| 2 | Prefetch + staleTime nas queries | 🔥🔥🔥 | baixo | `src/lib/queries.ts` + hooks |
| 3 | Code-split de rotas grandes (dialogs → lazy) | 🔥🔥 | médio | 4-6 rotas |
| 4 | Fontes/preconnect + `<img>` lazy + memo de rows | 🔥🔥 | baixo | `__root` + listas |
| 5 | Animações/hidratação/mobile polish | 🔥 | baixo | `reward-rain`, portal |

---

## Ondas

### Onda 1 — Router & Query (aplicar imediato)
- `router.tsx`: adicionar `defaultPreload: "intent"`, `defaultPreloadDelay: 40`, `defaultPendingMs: 200`, `defaultPendingMinMs: 300`, `defaultStructuralSharing: true`.
- Novo `QueryClient` com `staleTime: 30_000`, `gcTime: 5*60_000`, `refetchOnWindowFocus: false` (mantendo `refetchOnReconnect: true`).
- **Ganho esperado:** navegação praticamente instantânea entre rotas já visitadas, sem refetch a cada foco de janela.

### Onda 2 — Queries Supabase
- Anotar `staleTime` por natureza do dado em `src/lib/queries.ts` (produtos: 60s; transações: 15s; loja: 5min; roles: 5min).
- Adicionar helpers `prefetchClienteQuery`, `prefetchLojaBySlug` chamados em `onMouseEnter`/loader de listas.
- Trocar `useQuery` em série por `useQueries` onde possível (portal do cliente, dashboard lojista).
- Auditar `select('*')` → especificar colunas nas queries mais quentes (`store_clients`, `transactions`, `profiles`).

### Onda 3 — Code-split cirúrgico
- Extrair dialogs pesados (`EditClienteDialog`, `ImportarClientesDialog`, wizards de configuração) para `React.lazy` + `Suspense`.
- Fatiar `lojista.configuracoes.tsx` (2k linhas) em subcomponentes por seção — só carrega quando a aba é aberta.
- Mover `qsf.functions.ts` restante que não é `createServerFn` para `qsf-helpers.server.ts` (encolhe o chunk client).

### Onda 4 — Assets/CSS
- `<link rel="preconnect">` para Supabase e fontes no `__root.tsx`.
- `<img loading="lazy" decoding="async" fetchpriority="low">` em todas as listas; `fetchpriority="high"` só na hero/logo do portal.
- Remover `backdrop-blur` duplicado no portal, consolidar em 1 camada.
- `content-visibility: auto` em cards fora da viewport (listas longas).

### Onda 5 — Animações, hidratação, mobile
- `reward-rain`: pausar em `document.hidden` e usar `IntersectionObserver`; respeitar `prefers-reduced-motion` de verdade.
- Migrar leituras de `localStorage` no corpo do render p/ `useEffect` (evita mismatch).
- `React.memo` em `TxRowItem`, `ClienteRow`, `ProdutoRow`.
- Ajustar sombra/blur pesados no mobile (`md:` prefix nas classes de blur).

---

## Como vou executar
Vou aplicar **Onda 1 e 2 já** (baixo risco, impacto grande e mensurável). Depois pergunto se sigo direto para as ondas 3-5 (que mexem em mais arquivos) ou se você quer conferir antes.

Sem quebrar nenhuma funcionalidade, sem mudar design.
