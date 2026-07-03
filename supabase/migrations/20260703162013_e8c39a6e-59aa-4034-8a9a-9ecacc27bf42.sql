-- Add webhook fields to stores
ALTER TABLE public.stores 
  ADD COLUMN IF NOT EXISTS webhook_secret text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  ADD COLUMN IF NOT EXISTS webhook_last_at timestamptz;

-- Add external sale id to transactions for idempotency
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS id_venda_externa text,
  ADD COLUMN IF NOT EXISTS origem text;

CREATE UNIQUE INDEX IF NOT EXISTS transactions_store_venda_externa_key
  ON public.transactions(store_id, id_venda_externa)
  WHERE id_venda_externa IS NOT NULL;

-- Integration logs table
CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  origem text NOT NULL,
  payload_recebido jsonb,
  status text NOT NULL,
  mensagem_erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;

ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own integration logs"
ON public.integration_logs FOR SELECT
TO authenticated
USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = integration_logs.store_id AND s.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS integration_logs_store_created_idx
  ON public.integration_logs(store_id, created_at DESC);