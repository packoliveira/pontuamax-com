alter policy "gift_cards owner select" on public.gift_cards to authenticated;
alter policy "gift_cards owner insert" on public.gift_cards to authenticated;
alter policy "gift_cards owner delete" on public.gift_cards to authenticated;
alter policy "store_clients_owner_select" on public.store_clients to authenticated;
alter policy "store_clients_owner_insert" on public.store_clients to authenticated;
alter policy "store_clients_owner_delete" on public.store_clients to authenticated;