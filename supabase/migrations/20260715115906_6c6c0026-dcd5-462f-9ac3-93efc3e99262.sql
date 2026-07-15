
DROP POLICY IF EXISTS "stores_public_view_read" ON public.stores;
DROP POLICY IF EXISTS "store-assets owner write" ON storage.objects;
DROP POLICY IF EXISTS "product-images owner write" ON storage.objects;
