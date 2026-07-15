-- Restrict SELECT on team role/permission reference tables to users who are store owners or employees
DROP POLICY IF EXISTS "team_roles_select_all" ON public.team_roles;
DROP POLICY IF EXISTS "Anyone authenticated can read team roles" ON public.team_roles;
DROP POLICY IF EXISTS "team_roles read" ON public.team_roles;
DROP POLICY IF EXISTS "team_permissions_select_all" ON public.team_permissions;
DROP POLICY IF EXISTS "Anyone authenticated can read team permissions" ON public.team_permissions;
DROP POLICY IF EXISTS "team_permissions read" ON public.team_permissions;
DROP POLICY IF EXISTS "team_role_permissions_select_all" ON public.team_role_permissions;
DROP POLICY IF EXISTS "Anyone authenticated can read team role permissions" ON public.team_role_permissions;
DROP POLICY IF EXISTS "team_role_permissions read" ON public.team_role_permissions;

CREATE OR REPLACE FUNCTION public.is_store_owner_or_employee(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.stores WHERE owner_id = _user_id)
      OR EXISTS (SELECT 1 FROM public.store_employees WHERE user_id = _user_id AND status = 'ativo')
      OR public.has_role(_user_id, 'admin'::public.app_role)
$$;

CREATE POLICY "team_roles_select_staff" ON public.team_roles
  FOR SELECT TO authenticated
  USING (public.is_store_owner_or_employee(auth.uid()));

CREATE POLICY "team_permissions_select_staff" ON public.team_permissions
  FOR SELECT TO authenticated
  USING (public.is_store_owner_or_employee(auth.uid()));

CREATE POLICY "team_role_permissions_select_staff" ON public.team_role_permissions
  FOR SELECT TO authenticated
  USING (public.is_store_owner_or_employee(auth.uid()));
