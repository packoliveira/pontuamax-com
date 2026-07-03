
-- Drop the security-definer view; replace with column-level grants on the table.
DROP VIEW IF EXISTS public.stores_public;

REVOKE SELECT ON public.stores FROM anon;
REVOKE SELECT ON public.stores FROM authenticated;

-- Safe public columns
GRANT SELECT (
  id, slug, nome_fantasia, logo_url, banner_url,
  brand_primary, brand_secondary,
  modalidade, regra_pontos, percentual_cashback,
  indicacao_ativa, bonus_indicador, bonus_indicado,
  whatsapp_enabled, nps_enabled,
  created_at
) ON public.stores TO anon, authenticated;

-- Public rows visible for the safe columns
CREATE POLICY "stores_public_safe_select" ON public.stores
  FOR SELECT TO anon, authenticated
  USING (true);
