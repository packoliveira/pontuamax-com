-- Tabela apartada para secrets, acessível apenas via service_role
CREATE TABLE public.store_secrets (
  store_id uuid PRIMARY KEY REFERENCES public.stores(id) ON DELETE CASCADE,
  webhook_secret text,
  evolution_url text,
  evolution_apikey text,
  evolution_instance text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- SEM grants para authenticated/anon — só service_role
GRANT ALL ON public.store_secrets TO service_role;

ALTER TABLE public.store_secrets ENABLE ROW LEVEL SECURITY;

-- Policy explícita de negação para clients (deny-all auditável)
CREATE POLICY "store_secrets client deny" ON public.store_secrets
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- Copiar dados existentes de stores → store_secrets
INSERT INTO public.store_secrets (store_id, webhook_secret, evolution_url, evolution_apikey, evolution_instance)
SELECT id, webhook_secret, evolution_url, evolution_apikey, evolution_instance
FROM public.stores
WHERE webhook_secret IS NOT NULL
   OR evolution_url IS NOT NULL
   OR evolution_apikey IS NOT NULL
   OR evolution_instance IS NOT NULL
ON CONFLICT (store_id) DO NOTHING;

-- Trigger para updated_at
CREATE TRIGGER store_secrets_set_updated_at
  BEFORE UPDATE ON public.store_secrets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();