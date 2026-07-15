
DROP POLICY IF EXISTS "notas owner read" ON storage.objects;
DROP POLICY IF EXISTS "notas owner write" ON storage.objects;
DROP POLICY IF EXISTS "notas owner update" ON storage.objects;
DROP POLICY IF EXISTS "notas owner delete" ON storage.objects;

DROP POLICY IF EXISTS "promotions authenticated view active" ON public.promotions;
DROP POLICY IF EXISTS "Authenticated can view active promotions" ON public.promotions;

CREATE POLICY "promotions client view active"
  ON public.promotions FOR SELECT TO authenticated
  USING (
    ativo = true AND (
      EXISTS (
        SELECT 1 FROM public.store_clients sc
        WHERE sc.store_id = promotions.store_id
          AND sc.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM public.store_employees se
        WHERE se.store_id = promotions.store_id
          AND se.user_id = auth.uid()
          AND se.status = 'ativo'
      )
      OR EXISTS (
        SELECT 1 FROM public.stores s
        WHERE s.id = promotions.store_id
          AND s.owner_id = auth.uid()
      )
    )
  );
