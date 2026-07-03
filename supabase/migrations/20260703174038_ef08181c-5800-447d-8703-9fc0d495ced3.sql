
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  nome text NOT NULL,
  multiplicador numeric(4,2) NOT NULL DEFAULT 2 CHECK (multiplicador >= 1 AND multiplicador <= 10),
  dias_semana smallint[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  hora_inicio time NOT NULL DEFAULT '00:00',
  hora_fim time NOT NULL DEFAULT '23:59',
  data_inicio date,
  data_fim date,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages promotions"
  ON public.promotions FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = promotions.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = promotions.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "Authenticated can view active promotions"
  ON public.promotions FOR SELECT
  TO authenticated
  USING (ativo = true);

CREATE INDEX idx_promotions_store ON public.promotions(store_id) WHERE ativo = true;

CREATE TRIGGER promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
