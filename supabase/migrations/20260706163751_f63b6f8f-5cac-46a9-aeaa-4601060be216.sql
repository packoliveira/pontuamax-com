
-- 1) Fix audit log INSERT policy tautology
DROP POLICY IF EXISTS "insert logs when acting on own store" ON public.employee_audit_logs;
CREATE POLICY "insert logs when acting on own store"
ON public.employee_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  actor_user_id = auth.uid()
  AND (
    public.is_store_owner(auth.uid(), store_id)
    OR EXISTS (
      SELECT 1 FROM public.store_employees e
      WHERE e.user_id = auth.uid()
        AND e.store_id = employee_audit_logs.store_id
        AND e.status = 'ativo'
    )
  )
);

-- 2) Revoke public/anon execute on SECURITY DEFINER functions; keep authenticated + service_role
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_employee_link(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.employee_has_permission(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_employee_link(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.employee_has_permission(uuid, uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) TO authenticated, service_role;

-- handle_new_user and update_last_purchase_at are trigger functions; revoke public execute too
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_last_purchase_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
