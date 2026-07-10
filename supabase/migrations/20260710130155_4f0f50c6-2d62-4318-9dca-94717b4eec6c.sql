CREATE POLICY "transactions_employee_select" ON public.transactions
FOR SELECT TO authenticated
USING (
  public.employee_has_permission(auth.uid(), store_id, 'historico.consultar')
  OR public.employee_has_permission(auth.uid(), store_id, 'pontos.adicionar')
  OR public.employee_has_permission(auth.uid(), store_id, 'pontos.estornar')
  OR public.employee_has_permission(auth.uid(), store_id, 'resgates.produtos')
  OR public.employee_has_permission(auth.uid(), store_id, 'vouchers.validar')
  OR public.employee_has_permission(auth.uid(), store_id, 'vouchers.criar')
);

CREATE POLICY "profiles_employee_operations_select" ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_clients sc
    WHERE sc.user_id = profiles.id
      AND (
        public.employee_has_permission(auth.uid(), sc.store_id, 'clientes.consultar')
        OR public.employee_has_permission(auth.uid(), sc.store_id, 'historico.consultar')
        OR public.employee_has_permission(auth.uid(), sc.store_id, 'pontos.adicionar')
        OR public.employee_has_permission(auth.uid(), sc.store_id, 'resgates.produtos')
        OR public.employee_has_permission(auth.uid(), sc.store_id, 'vouchers.validar')
        OR public.employee_has_permission(auth.uid(), sc.store_id, 'vouchers.criar')
      )
  )
);

CREATE POLICY "products_employee_select" ON public.products
FOR SELECT TO authenticated
USING (
  public.employee_has_permission(auth.uid(), store_id, 'catalogo.gerenciar')
  OR public.employee_has_permission(auth.uid(), store_id, 'resgates.produtos')
  OR public.employee_has_permission(auth.uid(), store_id, 'vouchers.validar')
  OR public.employee_has_permission(auth.uid(), store_id, 'vouchers.criar')
);

CREATE POLICY "promotions_employee_select" ON public.promotions
FOR SELECT TO authenticated
USING (
  public.employee_has_permission(auth.uid(), store_id, 'pontos.adicionar')
  OR public.employee_has_permission(auth.uid(), store_id, 'historico.consultar')
);
