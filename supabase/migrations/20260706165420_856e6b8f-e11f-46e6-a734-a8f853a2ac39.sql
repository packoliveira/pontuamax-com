-- profiles: exige que a linha continue pertencendo ao próprio usuário após o UPDATE
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- stores: exige que o owner_id continue sendo o próprio usuário após o UPDATE
DROP POLICY IF EXISTS stores_owner_update ON public.stores;
CREATE POLICY stores_owner_update
  ON public.stores
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);