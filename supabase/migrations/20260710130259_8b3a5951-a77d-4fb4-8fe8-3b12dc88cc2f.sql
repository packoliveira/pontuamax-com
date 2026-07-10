CREATE POLICY "stores_employee_select" ON public.stores
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.store_employees se
    WHERE se.store_id = stores.id
      AND se.user_id = auth.uid()
      AND se.status = 'ativo'
  )
);

CREATE POLICY "client_tags_employee_select" ON public.client_tags
FOR SELECT TO authenticated
USING (
  public.employee_has_permission(auth.uid(), store_id, 'clientes.consultar')
);
