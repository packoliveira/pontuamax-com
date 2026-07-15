
-- 1) erp_credentials
CREATE TABLE public.erp_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN ('olist_v3','bling')),
  account_id text,
  access_token text,
  refresh_token text,
  expires_at timestamptz,
  scopes text[],
  status text NOT NULL DEFAULT 'connected' CHECK (status IN ('connected','expired','revoked','pending')),
  last_refresh_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, provider)
);
GRANT SELECT ON public.erp_credentials TO authenticated;
GRANT ALL ON public.erp_credentials TO service_role;
ALTER TABLE public.erp_credentials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or admin can read erp_credentials"
  ON public.erp_credentials FOR SELECT TO authenticated
  USING (public.is_store_owner(auth.uid(), store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_erp_credentials_updated
  BEFORE UPDATE ON public.erp_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2) erp_webhook_events (idempotência)
CREATE TABLE public.erp_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE SET NULL,
  provider text NOT NULL,
  evento text NOT NULL,
  resource_id text NOT NULL,
  signature text,
  signature_valid boolean,
  status text NOT NULL DEFAULT 'received',
  payload jsonb,
  error_message text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  UNIQUE (store_id, provider, evento, resource_id)
);
GRANT SELECT ON public.erp_webhook_events TO authenticated;
GRANT ALL ON public.erp_webhook_events TO service_role;
ALTER TABLE public.erp_webhook_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner or admin can read erp_webhook_events"
  ON public.erp_webhook_events FOR SELECT TO authenticated
  USING (public.is_store_owner(auth.uid(), store_id) OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_erp_webhook_events_store ON public.erp_webhook_events (store_id, provider, received_at DESC);

-- 3) oauth_states (nonces temporários)
CREATE TABLE public.oauth_states (
  state text PRIMARY KEY,
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  provider text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '15 minutes')
);
GRANT ALL ON public.oauth_states TO service_role;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
-- sem policies: apenas service_role acessa

-- 4) stores.erp_provider
ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS erp_provider text;
