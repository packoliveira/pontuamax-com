-- Lock down direct table access for sensitive tables and expose only safe store fields via a public view.

-- Stores: public users should not read the base table directly.
DROP POLICY IF EXISTS "stores_public_safe_select" ON public.stores;
REVOKE SELECT ON public.stores FROM anon;
REVOKE SELECT ON public.stores FROM authenticated;

-- Remove any previous column-level public store grants, then grant only owner/admin write access via table grants.
REVOKE SELECT (
  id,
  slug,
  nome_fantasia,
  logo_url,
  banner_url,
  brand_primary,
  brand_secondary,
  modalidade,
  regra_pontos,
  percentual_cashback,
  indicacao_ativa,
  bonus_indicador,
  bonus_indicado,
  whatsapp_enabled,
  nps_enabled,
  subscription_status,
  plan,
  created_at
) ON public.stores FROM anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

CREATE OR REPLACE VIEW public.stores_public AS
SELECT
  id,
  slug,
  nome_fantasia,
  logo_url,
  banner_url,
  brand_primary,
  brand_secondary,
  modalidade,
  regra_pontos,
  percentual_cashback,
  indicacao_ativa,
  bonus_indicador,
  bonus_indicado,
  whatsapp_enabled,
  nps_enabled,
  created_at
FROM public.stores;

GRANT SELECT ON public.stores_public TO anon;
GRANT SELECT ON public.stores_public TO authenticated;
GRANT SELECT ON public.stores_public TO service_role;

COMMENT ON VIEW public.stores_public IS 'Safe public store profile fields only. Never add credentials, webhook secrets, contact/private billing fields, subscription status, plan, or admin notes here.';

-- Gift cards: no direct public/client table reads or writes. Lookups and redemption happen through backend functions.
DROP POLICY IF EXISTS "gift_cards owner all" ON public.gift_cards;
REVOKE ALL ON public.gift_cards FROM anon;
REVOKE ALL ON public.gift_cards FROM authenticated;
GRANT ALL ON public.gift_cards TO service_role;

CREATE POLICY "gift_cards owners can manage"
ON public.gift_cards
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = gift_cards.store_id
      AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.stores s
    WHERE s.id = gift_cards.store_id
      AND s.owner_id = auth.uid()
  )
);

-- NPS responses: no direct public/client inserts. Public NPS route validates the transaction and writes server-side.
REVOKE INSERT ON public.nps_responses FROM anon;
REVOKE INSERT ON public.nps_responses FROM authenticated;
REVOKE UPDATE, DELETE ON public.nps_responses FROM anon;
REVOKE UPDATE, DELETE ON public.nps_responses FROM authenticated;
GRANT SELECT ON public.nps_responses TO authenticated;
GRANT ALL ON public.nps_responses TO service_role;

COMMENT ON TABLE public.nps_responses IS 'NPS responses are inserted only by the backend route after validating a sale transaction; do not add direct anon/authenticated insert policies.';
COMMENT ON TABLE public.gift_cards IS 'Gift card codes are never listed through public/client database access. Public lookup and authenticated redemption use backend functions.';