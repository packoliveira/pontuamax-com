
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS banner_url text;

-- storage.objects policies for bucket store-assets
-- Path convention: {store_id}/logo.<ext> or {store_id}/banner.<ext>

CREATE POLICY "store-assets read anyone"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'store-assets');

CREATE POLICY "store-assets owner insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.owner_id = auth.uid()
  )
);

CREATE POLICY "store-assets owner update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.owner_id = auth.uid()
  )
);

CREATE POLICY "store-assets owner delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'store-assets'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = (storage.foldername(name))[1]
      AND s.owner_id = auth.uid()
  )
);
