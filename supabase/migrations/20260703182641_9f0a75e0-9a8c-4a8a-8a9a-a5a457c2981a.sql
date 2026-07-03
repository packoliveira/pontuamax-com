
-- 1) STORES: remove blanket public SELECT policy, add owner SELECT policy, expose safe cols via a view
DROP POLICY IF EXISTS "stores_public_select" ON public.stores;

CREATE POLICY "stores_owner_select" ON public.stores
  FOR SELECT TO authenticated
  USING (auth.uid() = owner_id);

-- Safe public projection of stores
CREATE OR REPLACE VIEW public.stores_public AS
SELECT
  id, slug, nome_fantasia, logo_url, banner_url,
  brand_primary, brand_secondary,
  modalidade, regra_pontos, percentual_cashback,
  indicacao_ativa, bonus_indicador, bonus_indicado,
  whatsapp_enabled, nps_enabled,
  created_at
FROM public.stores;

ALTER VIEW public.stores_public SET (security_invoker = off);

GRANT SELECT ON public.stores_public TO anon, authenticated;

-- 2) GIFT CARDS: remove public read; lookup now goes through a server function
DROP POLICY IF EXISTS "gift_cards public read by code" ON public.gift_cards;
