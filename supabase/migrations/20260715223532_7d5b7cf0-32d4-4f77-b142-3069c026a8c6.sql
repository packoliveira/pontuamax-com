
-- 1) Lock down oauth_states: only service_role may touch it
REVOKE ALL ON public.oauth_states FROM anon, authenticated, PUBLIC;
GRANT ALL ON public.oauth_states TO service_role;
COMMENT ON TABLE public.oauth_states IS 'CSRF/OAuth state tokens. Server-only (service_role). RLS enabled with no policies => no client access.';

-- 2) Narrow profiles employee PII exposure to the single permission intended for PII lookups
DROP POLICY IF EXISTS profiles_employee_select ON public.profiles;
CREATE POLICY profiles_employee_select ON public.profiles
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.store_clients sc
    WHERE sc.user_id = profiles.id
      AND public.employee_has_permission(auth.uid(), sc.store_id, 'clientes.consultar')
  )
);
COMMENT ON POLICY profiles_employee_select ON public.profiles IS
  'Only employees with the explicit clientes.consultar permission may read client PII. Voucher/redemption flows must join minimally without pulling full profile rows.';

-- 3) Harden employee_has_permission: require the employee to be active AND the store to still own them at check time
CREATE OR REPLACE FUNCTION public.employee_has_permission(_user_id uuid, _store_id uuid, _perm text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_emp RECORD;
  v_from_role BOOLEAN := false;
  v_override_granted BOOLEAN;
  v_override_exists BOOLEAN := false;
BEGIN
  IF _user_id IS NULL OR _store_id IS NULL OR _perm IS NULL OR length(_perm) = 0 THEN
    RETURN false;
  END IF;

  IF public.is_store_owner(_user_id, _store_id) THEN
    RETURN true;
  END IF;

  SELECT id, role_key, status
    INTO v_emp
    FROM public.store_employees
   WHERE user_id = _user_id
     AND store_id = _store_id
     AND status = 'ativo'
   LIMIT 1;

  IF v_emp.id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.team_role_permissions
     WHERE role_key = v_emp.role_key
       AND permission_key = _perm
  ) INTO v_from_role;

  SELECT granted, true
    INTO v_override_granted, v_override_exists
    FROM public.store_employee_permissions
   WHERE employee_id = v_emp.id
     AND permission_key = _perm;

  IF v_override_exists THEN
    RETURN COALESCE(v_override_granted, false);
  END IF;

  RETURN COALESCE(v_from_role, false);
END;
$function$;
