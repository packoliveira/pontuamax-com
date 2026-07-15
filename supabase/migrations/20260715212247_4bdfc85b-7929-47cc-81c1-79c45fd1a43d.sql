
-- Novos cargos: Frente de Caixa e Sócio
insert into public.team_roles (key, label, description, is_system, sort_order)
values
  ('caixa', 'Frente de Caixa', 'Perfil mínimo de balcão: identificar cliente, pontuar e validar voucher.', true, 25),
  ('socio', 'Sócio / Dono', 'Acesso ampliado equivalente ao gerente, com relatórios e faturamento.', true, 15)
on conflict (key) do update set label = excluded.label, description = excluded.description, sort_order = excluded.sort_order;

-- Permissões padrão do Caixa
insert into public.team_role_permissions (role_key, permission_key)
select 'caixa', p from unnest(array[
  'clientes.consultar', 'clientes.cadastrar',
  'pontos.adicionar',
  'saldo.consultar',
  'vouchers.validar',
  'resgates.produtos'
]) as p
on conflict do nothing;

-- Permissões padrão do Sócio: mesmas do proprietário exceto plano/faturamento/equipe
insert into public.team_role_permissions (role_key, permission_key)
select 'socio', permission_key from public.team_role_permissions
where role_key = 'proprietario'
  and permission_key not in ('plano.alterar', 'faturamento.visualizar', 'equipe.gerenciar')
on conflict do nothing;

-- Onboarding: obrigar troca de senha no 1º acesso
alter table public.store_employees
  add column if not exists must_change_password boolean not null default true,
  add column if not exists first_login_at timestamptz;

-- Funcionários existentes já operam: não precisam trocar
update public.store_employees set must_change_password = false where must_change_password is null or created_at < now() - interval '1 minute';
