
-- gift_cards: split owner ALL into SELECT/INSERT/DELETE (no UPDATE via RLS)
DROP POLICY IF EXISTS "gift_cards owner all" ON public.gift_cards;

CREATE POLICY "gift_cards owner select" ON public.gift_cards
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = gift_cards.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "gift_cards owner insert" ON public.gift_cards
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = gift_cards.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "gift_cards owner delete" ON public.gift_cards
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = gift_cards.store_id AND s.owner_id = auth.uid()));

-- store_clients: split owner ALL into SELECT/INSERT/DELETE (no UPDATE via RLS)
DROP POLICY IF EXISTS "store_clients_owner_all" ON public.store_clients;

CREATE POLICY "store_clients_owner_select" ON public.store_clients
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_clients.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "store_clients_owner_insert" ON public.store_clients
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_clients.store_id AND s.owner_id = auth.uid()));

CREATE POLICY "store_clients_owner_delete" ON public.store_clients
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_clients.store_id AND s.owner_id = auth.uid()));
