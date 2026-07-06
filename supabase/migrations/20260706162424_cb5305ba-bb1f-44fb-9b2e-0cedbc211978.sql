
-- ============ CATÁLOGO DE CARGOS ============
CREATE TABLE public.team_roles (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text,
  is_system boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_roles TO authenticated;
GRANT ALL ON public.team_roles TO service_role;
ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read roles" ON public.team_roles FOR SELECT TO authenticated USING (true);

-- ============ CATÁLOGO DE PERMISSÕES ============
CREATE TABLE public.team_permissions (
  key text PRIMARY KEY,
  label text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'geral',
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_permissions TO authenticated;
GRANT ALL ON public.team_permissions TO service_role;
ALTER TABLE public.team_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read permissions" ON public.team_permissions FOR SELECT TO authenticated USING (true);

-- ============ CARGO x PERMISSÕES (defaults) ============
CREATE TABLE public.team_role_permissions (
  role_key text NOT NULL REFERENCES public.team_roles(key) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.team_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_key, permission_key)
);
GRANT SELECT ON public.team_role_permissions TO authenticated;
GRANT ALL ON public.team_role_permissions TO service_role;
ALTER TABLE public.team_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read role perms" ON public.team_role_permissions FOR SELECT TO authenticated USING (true);

-- ============ FUNCIONÁRIOS DA LOJA ============
CREATE TABLE public.store_employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  nome text NOT NULL,
  cpf text,
  email text NOT NULL,
  phone text,
  role_key text NOT NULL REFERENCES public.team_roles(key),
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_employees TO authenticated;
GRANT ALL ON public.store_employees TO service_role;
CREATE INDEX ON public.store_employees(store_id);
CREATE INDEX ON public.store_employees(user_id);

CREATE TRIGGER trg_store_employees_updated_at
BEFORE UPDATE ON public.store_employees
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ PERMISSÕES OVERRIDE POR FUNCIONÁRIO ============
CREATE TABLE public.store_employee_permissions (
  employee_id uuid NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  permission_key text NOT NULL REFERENCES public.team_permissions(key) ON DELETE CASCADE,
  granted boolean NOT NULL DEFAULT true, -- true = concede além do cargo; false = revoga do cargo
  PRIMARY KEY (employee_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_employee_permissions TO authenticated;
GRANT ALL ON public.store_employee_permissions TO service_role;

-- ============ LOGS DE AÇÃO ============
CREATE TABLE public.employee_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id),
  employee_id uuid REFERENCES public.store_employees(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_label text,
  ip text,
  user_agent text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.employee_audit_logs TO authenticated;
GRANT ALL ON public.employee_audit_logs TO service_role;
CREATE INDEX ON public.employee_audit_logs(store_id, created_at DESC);

-- ============ HELPER: dono da loja ============
CREATE OR REPLACE FUNCTION public.is_store_owner(_user_id uuid, _store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = _user_id)
$$;

-- ============ HELPER: employee vinculado ao user (retorna employee row) ============
CREATE OR REPLACE FUNCTION public.get_employee_link(_user_id uuid, _store_id uuid)
RETURNS TABLE (employee_id uuid, role_key text, status text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, role_key, status FROM public.store_employees
  WHERE user_id = _user_id AND store_id = _store_id
  LIMIT 1
$$;

-- ============ HELPER: has permission ============
CREATE OR REPLACE FUNCTION public.employee_has_permission(_user_id uuid, _store_id uuid, _perm text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_emp record;
  v_from_role boolean;
  v_override_granted boolean;
  v_override_exists boolean;
BEGIN
  -- Owner tem tudo
  IF public.is_store_owner(_user_id, _store_id) THEN
    RETURN true;
  END IF;

  SELECT id, role_key, status INTO v_emp
    FROM public.store_employees
    WHERE user_id = _user_id AND store_id = _store_id
    LIMIT 1;
  IF v_emp.id IS NULL OR v_emp.status <> 'ativo' THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.team_role_permissions
    WHERE role_key = v_emp.role_key AND permission_key = _perm
  ) INTO v_from_role;

  SELECT granted, true INTO v_override_granted, v_override_exists
    FROM public.store_employee_permissions
    WHERE employee_id = v_emp.id AND permission_key = _perm;

  IF v_override_exists THEN
    RETURN v_override_granted;
  END IF;
  RETURN v_from_role;
END;
$$;

-- ============ RLS: store_employees ============
ALTER TABLE public.store_employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages employees"
  ON public.store_employees FOR ALL TO authenticated
  USING (public.is_store_owner(auth.uid(), store_id))
  WITH CHECK (public.is_store_owner(auth.uid(), store_id));
CREATE POLICY "employee reads own link"
  ON public.store_employees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ============ RLS: store_employee_permissions ============
ALTER TABLE public.store_employee_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner manages employee perms"
  ON public.store_employee_permissions FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_employees e
    WHERE e.id = employee_id AND public.is_store_owner(auth.uid(), e.store_id)
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.store_employees e
    WHERE e.id = employee_id AND public.is_store_owner(auth.uid(), e.store_id)
  ));
CREATE POLICY "employee reads own perms"
  ON public.store_employee_permissions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_employees e
    WHERE e.id = employee_id AND e.user_id = auth.uid()
  ));

-- ============ RLS: employee_audit_logs ============
ALTER TABLE public.employee_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner reads store logs"
  ON public.employee_audit_logs FOR SELECT TO authenticated
  USING (public.is_store_owner(auth.uid(), store_id));
CREATE POLICY "actor reads own logs"
  ON public.employee_audit_logs FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());
CREATE POLICY "insert logs when acting on own store"
  ON public.employee_audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    actor_user_id = auth.uid()
    AND (
      public.is_store_owner(auth.uid(), store_id)
      OR EXISTS (
        SELECT 1 FROM public.store_employees e
        WHERE e.user_id = auth.uid() AND e.store_id = store_id AND e.status = 'ativo'
      )
    )
  );

-- ============ SEED: CARGOS ============
INSERT INTO public.team_roles (key, label, description, is_system, sort_order) VALUES
  ('proprietario', 'Proprietário', 'Acesso total ao painel e à empresa.', true, 10),
  ('gerente', 'Gerente', 'Gerencia operações da loja, equipe e relatórios.', true, 20),
  ('funcionario', 'Funcionário', 'Executa operações de atendimento e pontuação.', true, 30);

-- ============ SEED: PERMISSÕES ============
INSERT INTO public.team_permissions (key, label, description, category, sort_order) VALUES
  ('clientes.consultar',    'Consultar clientes',    'Ver lista e detalhes de clientes.', 'clientes', 10),
  ('clientes.cadastrar',    'Cadastrar clientes',    'Criar novos cadastros de clientes.', 'clientes', 20),
  ('clientes.editar',       'Editar clientes',       'Alterar dados cadastrais de clientes.', 'clientes', 30),
  ('pontos.adicionar',      'Adicionar pontos',      'Lançar pontos manualmente para clientes.', 'pontuacao', 40),
  ('pontos.estornar',       'Estornar pontos',       'Estornar/anular pontos lançados.', 'pontuacao', 50),
  ('saldo.consultar',       'Consultar saldo',       'Ver saldo de pontos e cashback do cliente.', 'pontuacao', 60),
  ('resgates.produtos',     'Resgatar produtos',     'Realizar resgates de produtos para clientes.', 'resgates', 70),
  ('vouchers.validar',      'Validar vouchers',      'Validar vouchers apresentados por clientes.', 'vouchers', 80),
  ('vouchers.criar',        'Criar vouchers',        'Emitir novos vouchers/vales.', 'vouchers', 90),
  ('historico.consultar',   'Consultar histórico',   'Ver histórico de transações da loja.', 'historico', 100),
  ('catalogo.gerenciar',    'Gerenciar catálogo',    'Cadastrar/editar produtos e recompensas.', 'catalogo', 110),
  ('campanhas.gerenciar',   'Gerenciar campanhas',   'Criar e disparar campanhas de marketing.', 'marketing', 120),
  ('relatorios.visualizar', 'Visualizar relatórios', 'Acessar relatórios e dashboards.', 'relatorios', 130),
  ('relatorios.exportar',   'Exportar relatórios',   'Exportar dados e relatórios.', 'relatorios', 140),
  ('fidelidade.configurar', 'Configurar programa de fidelidade', 'Definir regras do programa de pontos/cashback.', 'configuracao', 150),
  ('integracoes.gerenciar', 'Gerenciar integrações', 'Configurar integrações externas (ERP, webhooks).', 'configuracao', 160),
  ('equipe.gerenciar',      'Gerenciar equipe',      'Cadastrar e gerenciar funcionários e permissões.', 'equipe', 170),
  ('plano.alterar',         'Alterar plano',         'Fazer upgrade/downgrade do plano.', 'assinatura', 180),
  ('faturamento.visualizar','Visualizar faturamento','Consultar faturas e histórico financeiro.', 'assinatura', 190),
  ('empresa.configurar',    'Configurações da empresa','Editar dados da empresa e identidade visual.', 'configuracao', 200);

-- ============ SEED: DEFAULT PERMS ============
-- Gerente: tudo exceto plano e faturamento
INSERT INTO public.team_role_permissions (role_key, permission_key)
SELECT 'gerente', key FROM public.team_permissions
WHERE key NOT IN ('plano.alterar','faturamento.visualizar');

-- Funcionário: operação de atendimento
INSERT INTO public.team_role_permissions (role_key, permission_key) VALUES
  ('funcionario','clientes.consultar'),
  ('funcionario','clientes.cadastrar'),
  ('funcionario','clientes.editar'),
  ('funcionario','pontos.adicionar'),
  ('funcionario','saldo.consultar'),
  ('funcionario','resgates.produtos'),
  ('funcionario','vouchers.validar'),
  ('funcionario','historico.consultar');

-- Proprietário: tudo (por convenção do helper is_store_owner, mas registramos também)
INSERT INTO public.team_role_permissions (role_key, permission_key)
SELECT 'proprietario', key FROM public.team_permissions;
