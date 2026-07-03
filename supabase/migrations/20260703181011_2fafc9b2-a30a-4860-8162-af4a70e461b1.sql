
-- Extend transaction types
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'vale_presente';
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'nota_fiscal';

-- =============== GIFT CARDS ===============
CREATE TABLE public.gift_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  codigo text NOT NULL UNIQUE,
  pontos int NOT NULL CHECK (pontos > 0),
  redeemed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX gift_cards_store_idx ON public.gift_cards(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT SELECT ON public.gift_cards TO anon;
GRANT ALL ON public.gift_cards TO service_role;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gift_cards owner all" ON public.gift_cards FOR ALL
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "gift_cards public read by code" ON public.gift_cards FOR SELECT TO anon, authenticated USING (true);

-- =============== FISCAL NOTES (OCR) ===============
CREATE TABLE public.fiscal_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path text NOT NULL,
  image_hash text NOT NULL,
  valor numeric(12,2),
  cnpj_extraido text,
  status text NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','rejeitada')),
  pontos_creditados int DEFAULT 0,
  motivo_rejeicao text,
  ocr_raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, image_hash)
);
CREATE INDEX fiscal_notes_store_status_idx ON public.fiscal_notes(store_id, status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_notes TO authenticated;
GRANT ALL ON public.fiscal_notes TO service_role;
ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_notes client own" ON public.fiscal_notes FOR SELECT TO authenticated
  USING (client_user_id = auth.uid());
CREATE POLICY "fiscal_notes client insert" ON public.fiscal_notes FOR INSERT TO authenticated
  WITH CHECK (client_user_id = auth.uid());
CREATE POLICY "fiscal_notes owner all" ON public.fiscal_notes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE TRIGGER fiscal_notes_updated BEFORE UPDATE ON public.fiscal_notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============== CLIENT TAGS ===============
CREATE TABLE public.client_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, client_user_id, tag)
);
CREATE INDEX client_tags_store_idx ON public.client_tags(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tags TO authenticated;
GRANT ALL ON public.client_tags TO service_role;
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_tags owner all" ON public.client_tags FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

-- =============== RAFFLES ===============
CREATE TABLE public.raffles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  premio text NOT NULL,
  filtro_tag text,
  filtro_nivel_min text,
  ganhador_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ganhador_nome text,
  status text NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','sorteado','cancelado')),
  sorted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX raffles_store_idx ON public.raffles(store_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffles TO authenticated;
GRANT ALL ON public.raffles TO service_role;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raffles owner all" ON public.raffles FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE TRIGGER raffles_updated BEFORE UPDATE ON public.raffles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
