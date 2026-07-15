-- Drop storage policies that may exist from prior state
DROP POLICY IF EXISTS "store-assets read anyone" ON storage.objects;
DROP POLICY IF EXISTS "store-assets owner insert" ON storage.objects;
DROP POLICY IF EXISTS "store-assets owner update" ON storage.objects;
DROP POLICY IF EXISTS "store-assets owner delete" ON storage.objects;
DROP POLICY IF EXISTS "notas client upload own" ON storage.objects;
DROP POLICY IF EXISTS "notas client read own" ON storage.objects;
DROP POLICY IF EXISTS "notas client delete own" ON storage.objects;
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;
DROP POLICY IF EXISTS "product-images owner insert" ON storage.objects;
DROP POLICY IF EXISTS "product-images owner update" ON storage.objects;
DROP POLICY IF EXISTS "product-images owner delete" ON storage.objects;

DROP VIEW IF EXISTS public.stores_public;
CREATE VIEW public.stores_public WITH (security_invoker = true) AS
SELECT id, slug, nome_fantasia, logo_url, banner_url, banner_url_mobile,
  banner_mobile_fit, banner_mobile_position_x, banner_mobile_position_y, banner_mobile_zoom,
  bg_mode, bg_color_1, bg_color_2,
  brand_primary, brand_secondary, modalidade, regra_pontos, percentual_cashback,
  indicacao_ativa, bonus_indicador, bonus_indicado, whatsapp_enabled, nps_enabled,
  instagram_program_active, instagram_handle, instagram_points_per_post, created_at
FROM public.stores;
GRANT SELECT ON public.stores_public TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "stores_public_view_read" ON public.stores;
CREATE POLICY "stores_public_view_read" ON public.stores FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.team_roles (
  key TEXT PRIMARY KEY, label TEXT NOT NULL, description TEXT,
  is_system BOOLEAN NOT NULL DEFAULT false, sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_roles TO authenticated; GRANT ALL ON public.team_roles TO service_role;
ALTER TABLE public.team_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_roles read" ON public.team_roles FOR SELECT TO authenticated USING (true);

CREATE TABLE public.team_permissions (
  key TEXT PRIMARY KEY, label TEXT NOT NULL, description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'geral', sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_permissions TO authenticated; GRANT ALL ON public.team_permissions TO service_role;
ALTER TABLE public.team_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_permissions read" ON public.team_permissions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.team_role_permissions (
  role_key TEXT NOT NULL REFERENCES public.team_roles(key) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.team_permissions(key) ON DELETE CASCADE,
  PRIMARY KEY (role_key, permission_key)
);
GRANT SELECT ON public.team_role_permissions TO authenticated; GRANT ALL ON public.team_role_permissions TO service_role;
ALTER TABLE public.team_role_permissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team_role_permissions read" ON public.team_role_permissions FOR SELECT TO authenticated USING (true);

CREATE TABLE public.store_employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nome TEXT NOT NULL, cpf TEXT, email TEXT NOT NULL, phone TEXT,
  role_key TEXT NOT NULL REFERENCES public.team_roles(key),
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','inativo')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, email)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_employees TO authenticated;
GRANT ALL ON public.store_employees TO service_role;
CREATE INDEX ON public.store_employees(store_id);
CREATE INDEX ON public.store_employees(user_id);
CREATE TRIGGER trg_store_employees_updated_at BEFORE UPDATE ON public.store_employees FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
ALTER TABLE public.store_employees ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.store_employee_permissions (
  employee_id UUID NOT NULL REFERENCES public.store_employees(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES public.team_permissions(key) ON DELETE CASCADE,
  granted BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (employee_id, permission_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_employee_permissions TO authenticated;
GRANT ALL ON public.store_employee_permissions TO service_role;
ALTER TABLE public.store_employee_permissions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.employee_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id),
  employee_id UUID REFERENCES public.store_employees(id) ON DELETE SET NULL,
  action TEXT NOT NULL, target_label TEXT, ip TEXT, user_agent TEXT,
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.employee_audit_logs TO authenticated;
GRANT ALL ON public.employee_audit_logs TO service_role;
CREATE INDEX ON public.employee_audit_logs(store_id, created_at DESC);
ALTER TABLE public.employee_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_store_owner(_user_id UUID, _store_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores WHERE id = _store_id AND owner_id = _user_id)
$$;
REVOKE ALL ON FUNCTION public.is_store_owner(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_employee_link(_user_id UUID, _store_id UUID)
RETURNS TABLE (employee_id UUID, role_key TEXT, status TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, role_key, status FROM public.store_employees WHERE user_id = _user_id AND store_id = _store_id LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.get_employee_link(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_employee_link(uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.employee_has_permission(_user_id UUID, _store_id UUID, _perm TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_emp RECORD; v_from_role BOOLEAN; v_override_granted BOOLEAN; v_override_exists BOOLEAN;
BEGIN
  IF public.is_store_owner(_user_id, _store_id) THEN RETURN true; END IF;
  SELECT id, role_key, status INTO v_emp FROM public.store_employees WHERE user_id = _user_id AND store_id = _store_id LIMIT 1;
  IF v_emp.id IS NULL OR v_emp.status <> 'ativo' THEN RETURN false; END IF;
  SELECT EXISTS (SELECT 1 FROM public.team_role_permissions WHERE role_key = v_emp.role_key AND permission_key = _perm) INTO v_from_role;
  SELECT granted, true INTO v_override_granted, v_override_exists FROM public.store_employee_permissions WHERE employee_id = v_emp.id AND permission_key = _perm;
  IF v_override_exists THEN RETURN v_override_granted; END IF;
  RETURN v_from_role;
END; $$;
REVOKE ALL ON FUNCTION public.employee_has_permission(uuid, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.employee_has_permission(uuid, uuid, text) TO authenticated, service_role;

CREATE POLICY "employees owner all" ON public.store_employees FOR ALL TO authenticated USING (public.is_store_owner(auth.uid(), store_id)) WITH CHECK (public.is_store_owner(auth.uid(), store_id));
CREATE POLICY "employees self read" ON public.store_employees FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "emp_perms owner all" ON public.store_employee_permissions FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_employees e WHERE e.id = employee_id AND public.is_store_owner(auth.uid(), e.store_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_employees e WHERE e.id = employee_id AND public.is_store_owner(auth.uid(), e.store_id)));
CREATE POLICY "emp_perms self read" ON public.store_employee_permissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_employees e WHERE e.id = employee_id AND e.user_id = auth.uid()));
CREATE POLICY "audit owner read" ON public.employee_audit_logs FOR SELECT TO authenticated USING (public.is_store_owner(auth.uid(), store_id));
CREATE POLICY "audit actor read" ON public.employee_audit_logs FOR SELECT TO authenticated USING (actor_user_id = auth.uid());
CREATE POLICY "audit insert" ON public.employee_audit_logs FOR INSERT TO authenticated WITH CHECK (
  actor_user_id = auth.uid() AND (public.is_store_owner(auth.uid(), store_id)
    OR EXISTS (SELECT 1 FROM public.store_employees e WHERE e.user_id = auth.uid() AND e.store_id = employee_audit_logs.store_id AND e.status = 'ativo'))
);

CREATE POLICY "store_clients_employee_select" ON public.store_clients FOR SELECT TO authenticated
  USING (public.employee_has_permission(auth.uid(), store_id, 'clientes.consultar'));
CREATE POLICY "transactions_employee_select" ON public.transactions FOR SELECT TO authenticated
  USING (public.employee_has_permission(auth.uid(), store_id, 'historico.consultar')
    OR public.employee_has_permission(auth.uid(), store_id, 'pontos.adicionar')
    OR public.employee_has_permission(auth.uid(), store_id, 'resgates.produtos')
    OR public.employee_has_permission(auth.uid(), store_id, 'vouchers.validar'));
CREATE POLICY "profiles_employee_select" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_clients sc WHERE sc.user_id = profiles.id AND (
    public.employee_has_permission(auth.uid(), sc.store_id, 'clientes.consultar')
    OR public.employee_has_permission(auth.uid(), sc.store_id, 'historico.consultar')
    OR public.employee_has_permission(auth.uid(), sc.store_id, 'resgates.produtos')
    OR public.employee_has_permission(auth.uid(), sc.store_id, 'vouchers.validar'))));
CREATE POLICY "products_employee_select" ON public.products FOR SELECT TO authenticated
  USING (public.employee_has_permission(auth.uid(), store_id, 'catalogo.gerenciar')
    OR public.employee_has_permission(auth.uid(), store_id, 'resgates.produtos')
    OR public.employee_has_permission(auth.uid(), store_id, 'vouchers.validar'));
CREATE POLICY "promotions_employee_select" ON public.promotions FOR SELECT TO authenticated
  USING (public.employee_has_permission(auth.uid(), store_id, 'pontos.adicionar')
    OR public.employee_has_permission(auth.uid(), store_id, 'historico.consultar'));
CREATE POLICY "stores_employee_select" ON public.stores FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_employees se WHERE se.store_id = stores.id AND se.user_id = auth.uid() AND se.status = 'ativo'));
CREATE POLICY "client_tags_employee_select" ON public.client_tags FOR SELECT TO authenticated
  USING (public.employee_has_permission(auth.uid(), store_id, 'clientes.consultar'));

INSERT INTO public.team_roles (key, label, description, is_system, sort_order) VALUES
  ('proprietario', 'Proprietário', 'Acesso total.', true, 10),
  ('gerente', 'Gerente', 'Gerencia operações, equipe e relatórios.', true, 20),
  ('funcionario', 'Funcionário', 'Executa atendimento e pontuação.', true, 30);

INSERT INTO public.team_permissions (key, label, description, category, sort_order) VALUES
  ('clientes.consultar','Consultar clientes','Ver lista e detalhes.','clientes',10),
  ('clientes.cadastrar','Cadastrar clientes','Criar novos cadastros.','clientes',20),
  ('clientes.editar','Editar clientes','Alterar dados.','clientes',30),
  ('pontos.adicionar','Adicionar pontos','Lançar pontos manualmente.','pontuacao',40),
  ('pontos.estornar','Estornar pontos','Estornar/anular pontos.','pontuacao',50),
  ('saldo.consultar','Consultar saldo','Ver saldo do cliente.','pontuacao',60),
  ('resgates.produtos','Resgatar produtos','Realizar resgates.','resgates',70),
  ('vouchers.validar','Validar vouchers','Validar vouchers apresentados.','vouchers',80),
  ('vouchers.criar','Criar vouchers','Emitir novos vouchers.','vouchers',90),
  ('historico.consultar','Consultar histórico','Ver histórico de transações.','historico',100),
  ('catalogo.gerenciar','Gerenciar catálogo','Cadastrar/editar produtos.','catalogo',110),
  ('campanhas.gerenciar','Gerenciar campanhas','Criar campanhas.','marketing',120),
  ('relatorios.visualizar','Visualizar relatórios','Acessar dashboards.','relatorios',130),
  ('relatorios.exportar','Exportar relatórios','Exportar dados.','relatorios',140),
  ('fidelidade.configurar','Configurar fidelidade','Definir regras de pontos.','configuracao',150),
  ('integracoes.gerenciar','Gerenciar integrações','Configurar ERP/webhooks.','configuracao',160),
  ('equipe.gerenciar','Gerenciar equipe','Cadastrar funcionários.','equipe',170),
  ('plano.alterar','Alterar plano','Upgrade/downgrade.','assinatura',180),
  ('faturamento.visualizar','Visualizar faturamento','Consultar faturas.','assinatura',190),
  ('empresa.configurar','Configurações da empresa','Editar dados da empresa.','configuracao',200);

INSERT INTO public.team_role_permissions (role_key, permission_key)
SELECT 'gerente', key FROM public.team_permissions WHERE key NOT IN ('plano.alterar','faturamento.visualizar');
INSERT INTO public.team_role_permissions (role_key, permission_key) VALUES
  ('funcionario','clientes.consultar'),('funcionario','clientes.cadastrar'),('funcionario','clientes.editar'),
  ('funcionario','pontos.adicionar'),('funcionario','saldo.consultar'),('funcionario','resgates.produtos'),
  ('funcionario','vouchers.validar'),('funcionario','historico.consultar');
INSERT INTO public.team_role_permissions (role_key, permission_key)
SELECT 'proprietario', key FROM public.team_permissions;

CREATE POLICY "store-assets read anyone" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'store-assets');
CREATE POLICY "store-assets owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'store-assets' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()));
CREATE POLICY "store-assets owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'store-assets' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()));
CREATE POLICY "store-assets owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'store-assets' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = (storage.foldername(name))[1] AND s.owner_id = auth.uid()));
CREATE POLICY "notas client upload own" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'notas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "notas client read own" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'notas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "notas client delete own" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'notas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "product-images public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
CREATE POLICY "product-images owner insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = auth.uid() AND s.id::text = split_part(name, '/', 1)));
CREATE POLICY "product-images owner update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = auth.uid() AND s.id::text = split_part(name, '/', 1)));
CREATE POLICY "product-images owner delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND EXISTS (SELECT 1 FROM public.stores s WHERE s.owner_id = auth.uid() AND s.id::text = split_part(name, '/', 1)));

CREATE OR REPLACE FUNCTION public.resgatar_produto_atomico(
  p_store_id UUID, p_user_id UUID, p_product_id UUID, p_voucher_code TEXT, p_expires_at TIMESTAMPTZ
) RETURNS public.transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link public.store_clients%ROWTYPE; v_product public.products%ROWTYPE; v_tx public.transactions%ROWTYPE; v_novo_pontos INT; v_novo_nivel public.nivel_cliente;
BEGIN
  SELECT * INTO v_link FROM public.store_clients WHERE store_id = p_store_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não vinculado à loja.'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id AND store_id = p_store_id AND ativo = true;
  IF NOT FOUND THEN RAISE EXCEPTION 'Produto indisponível.'; END IF;
  IF v_link.pontos < v_product.custo_pontos THEN RAISE EXCEPTION 'Pontos insuficientes.'; END IF;
  v_novo_pontos := v_link.pontos - v_product.custo_pontos;
  v_novo_nivel := CASE WHEN v_novo_pontos <= 100 THEN 'bronze'::public.nivel_cliente WHEN v_novo_pontos <= 300 THEN 'prata'::public.nivel_cliente ELSE 'ouro'::public.nivel_cliente END;
  INSERT INTO public.transactions (store_id, client_user_id, tipo, pontos_delta, product_id, voucher_code, status, voucher_expires_at)
    VALUES (p_store_id, p_user_id, 'resgate_produto', -v_product.custo_pontos, p_product_id, p_voucher_code, 'pendente', p_expires_at) RETURNING * INTO v_tx;
  UPDATE public.store_clients SET pontos = v_novo_pontos, nivel = v_novo_nivel WHERE id = v_link.id;
  RETURN v_tx;
END; $$;
REVOKE ALL ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.resgatar_cashback_atomico(
  p_store_id UUID, p_user_id UUID, p_valor NUMERIC, p_voucher_code TEXT, p_expires_at TIMESTAMPTZ
) RETURNS public.transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_link public.store_clients%ROWTYPE; v_tx public.transactions%ROWTYPE; v_novo_saldo NUMERIC;
BEGIN
  IF p_valor <= 0 THEN RAISE EXCEPTION 'Valor inválido.'; END IF;
  SELECT * INTO v_link FROM public.store_clients WHERE store_id = p_store_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não vinculado à loja.'; END IF;
  IF v_link.cashback_saldo < p_valor THEN RAISE EXCEPTION 'Cashback insuficiente.'; END IF;
  v_novo_saldo := round((v_link.cashback_saldo - p_valor)::numeric, 2);
  INSERT INTO public.transactions (store_id, client_user_id, tipo, cashback_delta, voucher_code, status, voucher_expires_at)
    VALUES (p_store_id, p_user_id, 'resgate_cashback', -p_valor, p_voucher_code, 'pendente', p_expires_at) RETURNING * INTO v_tx;
  UPDATE public.store_clients SET cashback_saldo = v_novo_saldo WHERE id = v_link.id;
  RETURN v_tx;
END; $$;
REVOKE ALL ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) TO authenticated, service_role;