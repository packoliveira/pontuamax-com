
CREATE POLICY store_clients_employee_select ON public.store_clients
  FOR SELECT TO authenticated
  USING (public.employee_has_permission(auth.uid(), store_id, 'clientes.consultar'));

CREATE POLICY profiles_employee_select ON public.profiles
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_clients sc
    JOIN public.store_employees se ON se.store_id = sc.store_id
    WHERE sc.user_id = profiles.id
      AND se.user_id = auth.uid()
      AND se.status = 'ativo'
      AND public.employee_has_permission(auth.uid(), sc.store_id, 'clientes.consultar')
  ));
