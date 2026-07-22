DROP POLICY IF EXISTS "product-images read scoped" ON storage.objects;

CREATE POLICY "product-images owner or employee read"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.stores s
    WHERE s.id::text = split_part(objects.name, '/', 1)
      AND (
        s.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.store_employees se
          WHERE se.store_id = s.id
            AND se.user_id = auth.uid()
            AND se.status = 'ativo'
        )
      )
  )
);