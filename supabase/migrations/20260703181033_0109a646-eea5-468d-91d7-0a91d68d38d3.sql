
CREATE POLICY "notas client upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'notas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "notas client read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'notas' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "notas client delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'notas' AND (storage.foldername(name))[1] = auth.uid()::text);
