
-- Remove duplicate product-images public read policy
DROP POLICY IF EXISTS "product-images public read" ON storage.objects;

-- Restrict store-assets public read to files under a valid store folder
DROP POLICY IF EXISTS "store-assets read public" ON storage.objects;
CREATE POLICY "store-assets read scoped public"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE (s.id)::text = (storage.foldername(objects.name))[1]
  )
);

-- Explicit INSERT policy for erp_webhook_events (service role only; defense in depth)
CREATE POLICY "service role inserts erp webhook events"
ON public.erp_webhook_events FOR INSERT
TO service_role
WITH CHECK (true);
