-- Resolve linter warning caused by the public view and tighten direct grants.
DROP VIEW IF EXISTS public.stores_public;

-- Stores: no anonymous direct table access. Authenticated users rely on owner/admin RLS policies.
REVOKE ALL ON public.stores FROM anon;
REVOKE ALL ON public.stores FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;

-- Gift cards: no anonymous direct access. Store owners can manage their own gift cards through RLS.
REVOKE ALL ON public.gift_cards FROM anon;
REVOKE ALL ON public.gift_cards FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_cards TO service_role;

-- NPS responses: backend-only creation; owners can still read their store's responses via RLS.
REVOKE ALL ON public.nps_responses FROM anon;
REVOKE ALL ON public.nps_responses FROM authenticated;
GRANT SELECT ON public.nps_responses TO authenticated;
GRANT ALL ON public.nps_responses TO service_role;