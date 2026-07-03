-- Lock down SECURITY DEFINER functions exposed via the API.
-- Trigger functions run as the table owner regardless of grants, so revoke all API access.
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_last_purchase_at() FROM PUBLIC, anon, authenticated;

-- RPC functions: revoke from anon, keep authenticated only.
-- has_role is also used inside RLS policies; authenticated must retain EXECUTE.
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;