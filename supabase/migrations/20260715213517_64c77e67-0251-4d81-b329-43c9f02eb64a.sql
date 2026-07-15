CREATE TABLE public.merchant_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  actor_user_id uuid,
  actor_label text,
  tipo text NOT NULL,
  titulo text NOT NULL,
  mensagem text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_merchant_notifications_store_created ON public.merchant_notifications(store_id, created_at DESC);
CREATE INDEX idx_merchant_notifications_store_unread ON public.merchant_notifications(store_id) WHERE read_at IS NULL;

GRANT SELECT, UPDATE ON public.merchant_notifications TO authenticated;
GRANT ALL ON public.merchant_notifications TO service_role;

ALTER TABLE public.merchant_notifications ENABLE ROW LEVEL SECURITY;

-- Only store owner can read/update their notifications
CREATE POLICY "owner reads merchant notifications" ON public.merchant_notifications
FOR SELECT TO authenticated
USING (public.is_store_owner(auth.uid(), store_id));

CREATE POLICY "owner marks read merchant notifications" ON public.merchant_notifications
FOR UPDATE TO authenticated
USING (public.is_store_owner(auth.uid(), store_id))
WITH CHECK (public.is_store_owner(auth.uid(), store_id));