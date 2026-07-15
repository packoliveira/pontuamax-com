-- Remove duplicate public read policy on store-assets bucket
DROP POLICY IF EXISTS "store-assets read anyone" ON storage.objects;

-- Add explicit owner-scoped write policies on erp_credentials to defend-in-depth
-- (writes today happen via service_role which bypasses RLS; these policies
-- ensure no future client-side write path can bypass owner scoping).
CREATE POLICY "erp_credentials owner insert"
  ON public.erp_credentials FOR INSERT TO authenticated
  WITH CHECK (public.is_store_owner(auth.uid(), store_id));

CREATE POLICY "erp_credentials owner update"
  ON public.erp_credentials FOR UPDATE TO authenticated
  USING (public.is_store_owner(auth.uid(), store_id))
  WITH CHECK (public.is_store_owner(auth.uid(), store_id));

CREATE POLICY "erp_credentials owner delete"
  ON public.erp_credentials FOR DELETE TO authenticated
  USING (public.is_store_owner(auth.uid(), store_id));