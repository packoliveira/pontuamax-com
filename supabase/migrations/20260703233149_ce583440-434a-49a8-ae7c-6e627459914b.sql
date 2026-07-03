ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS agendada_para timestamptz;

CREATE INDEX IF NOT EXISTS idx_campaigns_agendada
  ON public.campaigns (agendada_para) WHERE status = 'agendada';