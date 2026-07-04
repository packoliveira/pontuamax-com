
-- Leitura pública das imagens de produtos (bucket privado, mas objetos legíveis por anon)
CREATE POLICY "product-images public read"
  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'product-images');

-- Lojista pode gerenciar imagens dentro da pasta da sua loja: product-images/<store_id>/...
CREATE POLICY "product-images owner insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.owner_id = auth.uid()
        AND s.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "product-images owner update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.owner_id = auth.uid()
        AND s.id::text = split_part(name, '/', 1)
    )
  );

CREATE POLICY "product-images owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.owner_id = auth.uid()
        AND s.id::text = split_part(name, '/', 1)
    )
  );
