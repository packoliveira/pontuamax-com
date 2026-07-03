# Roadmap "Fidelimax-like" — implementação em 4 fases

Você listou 10 features grandes. Fazer tudo de uma vez seria caro (muitos créditos) e arriscado (bugs interligados). Vou entregar em **4 fases**, cada uma testável sozinha. Você aprova cada fase antes de começar a próxima.

---

## FASE 1 — Comercial + Admin (essencial pra vender)
**Objetivo: você conseguir cadastrar clientes na sua plataforma essa semana.**

1. **`/cadastro`** — lojista cria conta (email + senha + nome + telefone + nome da loja)
2. Novo campo `stores.subscription_status` (`pending_payment`, `active`, `suspended`, `cancelled`) + `plan` (`starter`, `pro`, `premium`) + `setup_paid_at`
3. Após cadastro → redireciona pra **`/lojista/aguardando`** — tela bloqueada: "Aguardando liberação. Fale com nosso time no WhatsApp: [link]"
4. **Middleware**: se `subscription_status != 'active'`, TODO acesso ao `/lojista/*` cai em `/lojista/aguardando` (exceto o próprio aguardando)
5. **Painel admin** em `/admin` (role `admin` na `user_roles`):
   - Lista todas as lojas + status + plano + MRR calculado
   - Ações: liberar (`active`), suspender, cancelar, mudar plano
   - Dashboard: total de lojas, MRR total, lojas por status, novas lojas no mês
6. Rota `/admin` protegida por `has_role(admin)`

**Entregável testável:** você cria conta em `/cadastro`, entra como admin, libera, o lojista consegue usar.

---

## FASE 2 — Engajamento (o que vende contra Fidelimax)
**Objetivo: dar ao lojista as ferramentas de marketing que geram retorno.**

1. **Campanhas WhatsApp em massa** (`/lojista/campanhas`)
   - Criar campanha: nome, mensagem (com variáveis `{{nome}}`, `{{pontos}}`, `{{loja}}`)
   - Segmentar: nível (Bronze/Prata/Ouro), inativos (30/60/90d), aniversariantes do mês, todos
   - Preview + envio (via Evolution API já integrada)
   - Log de disparos + status por cliente
2. **Cupons/promoções** (`/lojista/promocoes`)
   - Multiplicador de pontos por período (ex: "2x pontos de sex a dom")
   - Aplicado automaticamente no `/lojista/lancar-venda` dentro do período
3. **Notificações automáticas** (cron pg_cron chamando route TanStack):
   - Aniversário: WhatsApp automático no dia com bônus configurável
   - Inatividade 30/60/90d: mensagem "sentimos sua falta"
   - Pontos expirando em 7d (se lojista habilitar expiração)
4. **Indicação amigo→amigo**
   - Cliente compartilha link `/{slug}?indicou={phone}`
   - Novo cliente ganha X pontos, quem indicou ganha Y na primeira compra do indicado

---

## FASE 3 — Profissionalização (retenção de lojistas)
**Objetivo: lojista sentir que vale o valor da mensalidade.**

1. **Relatórios/Dashboard do lojista** (`/lojista/relatorios`)
   - Faturamento por período, ticket médio, nº vendas, nº novos clientes
   - Taxa de retorno (clientes que voltaram)
   - Top 10 clientes por gasto e por pontos
   - Gráficos (recharts): vendas por dia/semana/mês
2. **Exportação CSV**
   - Clientes: nome, telefone, pontos, cashback, nível, última compra
   - Transações: data, cliente, valor, pontos gerados/resgatados
3. **Multi-usuário por loja** (`/lojista/equipe`)
   - Nova tabela `store_users` (store_id, user_id, role: `owner` | `manager` | `cashier`)
   - `owner`: tudo. `manager`: sem financeiro/equipe. `cashier`: só lançar venda + consultar cliente
   - Convite por email
4. **PWA instalável** pro cliente final em `/{slug}`
   - Manifest + ícones + service worker (via vite-plugin-pwa, guardado contra preview)
   - Cliente adiciona à tela inicial, abre como app

---

## FASE 4 — Legal + polimento (destravar cobrança)
**Objetivo: poder cobrar sem risco jurídico.**

1. **Termos de Uso** (`/termos`) — texto template LGPD/CDC adaptado
2. **Política de Privacidade** (`/privacidade`) — LGPD compliant (dados coletados, finalidade, retenção, direitos do titular, DPO)
3. **Checkbox obrigatório** no cadastro (lojista) e no cadastro do cliente final aceitando termos
4. **Export/delete de dados** do cliente (direito LGPD) na tela do cliente

---

## Detalhes técnicos (só pra referência)

**Novas tabelas:**
- `store_users` (multi-usuário)
- `campaigns` + `campaign_recipients` (WhatsApp em massa)
- `promotions` (multiplicadores por período)
- `referrals` (indicações)
- `notification_logs` (auditoria de envios automáticos)
- Colunas em `stores`: `subscription_status`, `plan`, `setup_paid_at`, `mrr_amount`, `birthday_bonus_points`

**Novas rotas:**
- Público: `/cadastro`, `/termos`, `/privacidade`
- Lojista: `/lojista/aguardando`, `/lojista/campanhas`, `/lojista/promocoes`, `/lojista/relatorios`, `/lojista/equipe`
- Admin: `/admin`, `/admin/lojas`, `/admin/financeiro`
- API pública: `/api/public/hooks/notifications-cron`

**Segurança:**
- `admin` role via `user_roles` (já existe) + `has_role` (já existe)
- RLS: `store_users` gate em cima de todas as tabelas de loja
- Middleware TanStack: bloqueio por `subscription_status`

---

## Recomendação

Começar por **Fase 1 agora** (é a que destrava você começar a vender). São ~5-8 arquivos + 1 migration. Depois de aprovada e testada por você, seguimos pra Fase 2.

**Confirma que posso começar a Fase 1?** Se quiser reordenar (ex: PWA antes de campanhas), me fala antes.
