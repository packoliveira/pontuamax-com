ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'instagram_bonus';

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS instagram_program_active boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_handle text,
  ADD COLUMN IF NOT EXISTS instagram_points_per_post integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS instagram_min_days_live integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS instagram_instructions text;

DO $$ BEGIN
  CREATE TYPE public.instagram_submission_status AS ENUM ('pendente','aprovado','rejeitado','estornado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.instagram_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_url text NOT NULL,
  status public.instagram_submission_status NOT NULL DEFAULT 'pendente',
  points_awarded integer NOT NULL DEFAULT 0,
  rejection_reason text,
  verify_after timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  client_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT instagram_submissions_url_shape CHECK (post_url ~* '^https?://(www\.)?instagram\.com/')
);

CREATE INDEX IF NOT EXISTS idx_instagram_submissions_store_status
  ON public.instagram_submissions (store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_submissions_client
  ON public.instagram_submissions (client_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_instagram_submissions_daily_check
  ON public.instagram_submissions (store_id, client_user_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_instagram_submissions_updated_at ON public.instagram_submissions;
CREATE TRIGGER trg_instagram_submissions_updated_at
  BEFORE UPDATE ON public.instagram_submissions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_submissions TO authenticated;
GRANT ALL ON public.instagram_submissions TO service_role;

ALTER TABLE public.instagram_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ig_submissions_self_select" ON public.instagram_submissions
  FOR SELECT TO authenticated
  USING (auth.uid() = client_user_id);

CREATE POLICY "ig_submissions_self_insert" ON public.instagram_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = client_user_id
    AND status = 'pendente'
    AND points_awarded = 0
    AND EXISTS (
      SELECT 1 FROM public.stores s
      WHERE s.id = store_id AND s.instagram_program_active = true
    )
  );

CREATE POLICY "ig_submissions_owner_select" ON public.instagram_submissions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE POLICY "ig_submissions_owner_update" ON public.instagram_submissions
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE POLICY "ig_submissions_admin_all" ON public.instagram_submissions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));