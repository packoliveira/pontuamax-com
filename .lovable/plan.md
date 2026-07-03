# QSF Club — MVP com dados mock

Primeira versão 100% frontend com dados em memória (mock store compartilhado). Isso valida o fluxo completo antes de plugar Supabase. Assim que aprovar, ativo Lovable Cloud e migro tabelas + auth.

## Escopo desta rodada

Loja demo já cadastrada com modalidade **ambos** (pontos + cashback), níveis ativos, alguns clientes, produtos de resgate e histórico, para você abrir e ver funcionando.

### Rotas

```
/                                → landing simples + botões "Sou lojista" / "Ver loja demo"
/lojista/login                   → login mock (qualquer email/senha entra na loja demo)
/lojista/onboarding              → wizard 4 passos (dados, marca, modalidade, link)
/lojista                         → dashboard
/lojista/lancar-venda            → registra venda por telefone/CPF
/lojista/clientes                → lista + busca
/lojista/produtos                → CRUD de produtos de resgate (só se modalidade inclui pontos)
/lojista/resgates                → fila de resgates pendentes + confirmar entrega
/lojista/configuracoes           → editar marca, modalidade, regras, níveis
/$slug                           → página pública do cliente (ex: /lojademo)
   • login por telefone (mock, sem senha)
   • saldo pontos + barra de nível (se aplicável)
   • saldo cashback em R$ (se aplicável)
   • catálogo de produtos de resgate
   • botão "usar cashback no próximo pagamento" → gera voucher
   • histórico de compras e ganhos
```

Uso rota TanStack `/$slug` (dinâmica) para a página do cliente. Reservo `/lojista` como prefixo para não conflitar.

### Regras de negócio

- **Pontos**: `floor(valor_compra * regra_pontos)` — default 1 ponto por R$1
- **Cashback**: `valor_compra * percentual_cashback / 100` — default 5%
- **Níveis** (se `niveis_ativos`): Bronze 0–100, Prata 101–300, Ouro 301+ (já aplico o refinamento 1)
- **Validações** (refinamento 3): bloqueia resgate de produto sem pontos suficientes, bloqueia uso de cashback maior que saldo, decrementa estoque
- **Preview ao vivo** no onboarding (refinamento 2): card lateral mostra logo + cores aplicadas em tempo real
- **Detecção de loja pela URL** (refinamento 4): página `/$slug` carrega marca antes do login

### Personalização visual da página do cliente

A página `/$slug` injeta `--brand-primary` e `--brand-secondary` como CSS vars no root do container, e usa `<img src={logo_url}>` no header. Todo componente da página do cliente usa `bg-[var(--brand-primary)]` etc., então trocar de loja troca toda a identidade automaticamente.

### Design

Mobile-first, moderno. Painel do lojista: shell com sidebar colapsável (sheet no mobile), cards limpos, tabelas responsivas. Página do cliente: hero com logo + saldo em destaque, cards de pontos/cashback lado a lado no desktop / empilhados no mobile, barra de progresso animada para nível, catálogo em grid.

Não vou gerar variações de design — a spec já é específica (mobile-first, gamificação visível, cores dinâmicas por loja). Se quiser explorar direções visuais depois, peça e eu abro opções.

### Mock data store

`src/lib/mock-store.ts` — singleton em memória com `lojas`, `clientes`, `transacoes`, `produtos_resgate`, `resgates`. Zustand para reatividade. Seed inicial:

- 1 loja "Loja Demo" (slug `lojademo`, modalidade `ambos`, cores roxo/laranja, níveis ativos)
- 3 clientes com saldos variados
- 4 produtos de resgate
- ~6 transações no histórico
- 1 resgate pendente

### Fora desta rodada

- Supabase / auth real / RLS / multi-tenant real (entra depois com Lovable Cloud)
- Upload real de logo (uso URL/data-url no mock)
- WhatsApp, Bling/Olist, cobrança de assinatura

## Detalhes técnicos

- TanStack Start file-based routing sob `src/routes/`
- Estado: Zustand para o mock store; `useSyncExternalStore` via zustand cobre reatividade sem precisar de rede
- UI: shadcn (já instalado) + Tailwind v4 tokens existentes; adiciono tokens `--brand-*` scoped na página do cliente
- Sem server functions nem loaders com fetch — tudo cliente por enquanto (evita SSR quebrar com store em memória; rotas do cliente usam `ssr: false` onde necessário)
- Formatação BRL via `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`
- Voucher: string tipo `QSF-XXXX-XXXX` gerada por random

## Fluxo de teste que você vai conseguir rodar

1. Abrir `/lojista/lancar-venda` → digitar telefone de cliente existente + R$ 200 → sistema credita 200 pontos e R$ 10 cashback
2. Abrir `/lojademo` em outra aba → logar com o telefone daquele cliente → ver pontos + cashback atualizados
3. Resgatar um produto por pontos → recebe voucher, saldo decrementa
4. Clicar "usar cashback" → recebe voucher de desconto
5. Voltar em `/lojista/resgates` → confirmar os dois → marca como entregue

Ao aprovar, começo pela estrutura de rotas + mock store, depois telas do lojista, depois página do cliente.
