
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS nps_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nps_ask_comment boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS nps_template text NOT NULL DEFAULT 'Oi {nome_cliente}! 👋 Obrigado por comprar na {nome_loja}. Numa escala de 0 a 10, o quanto você recomendaria a gente? Responde aqui: {link_nps}';

CREATE TABLE IF NOT EXISTS public.nps_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  transaction_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE UNIQUE,
  client_user_id uuid NOT NULL,
  score smallint NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.nps_responses TO authenticated;
GRANT ALL ON public.nps_responses TO service_role;

ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners read nps"
  ON public.nps_responses FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_nps_store_created ON public.nps_responses (store_id, created_at DESC);
