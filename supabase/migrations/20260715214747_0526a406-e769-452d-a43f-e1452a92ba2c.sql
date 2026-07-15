DROP POLICY IF EXISTS "stores_employee_select" ON public.stores;

CREATE OR REPLACE FUNCTION public.get_store_for_employee(_store_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_row public.stores%ROWTYPE; v_json jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT * INTO v_row FROM public.stores WHERE id = _store_id;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NOT (
    public.is_store_owner(auth.uid(), _store_id)
    OR EXISTS (SELECT 1 FROM public.store_employees se WHERE se.store_id = _store_id AND se.user_id = auth.uid() AND se.status = 'ativo')
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  ) THEN
    RETURN NULL;
  END IF;
  v_json := to_jsonb(v_row)
    - 'webhook_secret'
    - 'evolution_apikey'
    - 'evolution_url'
    - 'evolution_instance'
    - 'olist_client_id'
    - 'olist_client_secret'
    - 'olist_access_token'
    - 'olist_refresh_token';
  RETURN v_json;
END; $$;

DROP POLICY IF EXISTS "product-images read public" ON storage.objects;
CREATE POLICY "product-images read scoped"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'product-images'
  AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id::text = split_part(objects.name, '/', 1))
);

REVOKE EXECUTE ON FUNCTION public.employee_has_permission(uuid, uuid, text) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_employee_link(uuid, uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_store_owner_or_employee(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_store_for_employee(uuid) FROM anon, PUBLIC;

GRANT EXECUTE ON FUNCTION public.employee_has_permission(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_link(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_store_owner_or_employee(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_store_for_employee(uuid) TO authenticated;
