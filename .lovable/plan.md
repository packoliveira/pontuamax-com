## O que você vai ter

1. **Página de login dedicada** em `/funcionario/login` — CPF + senha, com marca da loja e link "esqueci minha senha" (avisa o lojista).
2. **Onboarding pós-convite** — no 1º acesso o funcionário é obrigado a trocar a senha inicial antes de entrar no painel.
3. **Dashboard inicial guiado** — banner de boas-vindas com os 3 próximos passos baseados nas permissões (identificar cliente → pontuar → validar voucher). Os cards já existentes continuam.
4. **Wizard de operação diária** já coberto pelo fluxo atual em `/funcionario/pontuar` e `/funcionario/resgates` — apenas adiciono um atalho "Novo atendimento" no dashboard que abre o passo a passo.
5. **Novos cargos disponíveis** para o lojista escolher ao cadastrar funcionário: além de Proprietário/Gerente/Funcionário, adiciono **Frente de Caixa** (permissões mínimas de operação) e **Sócio/Dono** (equivalente a Gerente com acesso a relatórios). Lojista continua podendo marcar/desmarcar permissões individuais por funcionário na tela `/lojista/equipe` (fluxo já existe).

## Detalhes técnicos

### Banco (uma migration)
- `team_roles`: inserir `caixa` (Frente de Caixa) e `socio` (Sócio) com `sort_order` adequado.
- `team_role_permissions`: preencher padrões:
  - `caixa`: `clientes.consultar`, `pontos.adicionar`, `vouchers.validar`, `resgates.produtos`.
  - `socio`: mesmas de `gerente` + `relatorios.consultar` (se existir; caso contrário, todas exceto `equipe.gerenciar`).
- `store_employees`: adicionar coluna `must_change_password boolean not null default true` e `first_login_at timestamptz`.
- Na função `createEmployee` (server) marcar `must_change_password=true`; ao trocar senha, marcar `false` e setar `first_login_at`.

### Rotas novas
- `src/routes/funcionario.login.tsx` (ssr:false, pública): formulário com CPF + senha. Chama nova server fn `resolveFuncionarioEmailByCpf` que, sem exigir sessão, procura em `store_employees` (via `supabaseAdmin`) o email vinculado ao CPF **ativo** e retorna o email. Cliente faz `supabase.auth.signInWithPassword({ email, password })` e navega para `/funcionario`.
- `src/routes/funcionario.trocar-senha.tsx`: formulário de nova senha (mín. 8). Server fn `trocarSenhaFuncionario` chama `supabase.auth.updateUser` do próprio usuário e marca `must_change_password=false`, grava `first_login_at`.
- `src/routes/funcionario.tsx` (layout): após checar sessão + vínculo ativo, se `must_change_password` estiver `true` e a rota atual **não** for `/funcionario/trocar-senha`, redireciona para lá.

### UI
- Login com card e marca PontuaMax (mesmo padrão visual do `/lojista/login`).
- Banner de boas-vindas no dashboard só aparece se `first_login_at` for recente (< 24h).
- Atalho "Novo atendimento" no dashboard leva direto para `/funcionario/pontuar`.
- Botão "Copiar link" e "Acesso do vendedor" já existentes em `/lojista/equipe` continuam apontando para `/funcionario/login`.

### Escopo fora
- Não altero o fluxo de resgates/vouchers já finalizado.
- Não mudo permissões dos cargos `proprietario`/`gerente`/`funcionario` existentes.
- Não altero autenticação do lojista.
