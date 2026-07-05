CREATE POLICY "gift_cards clients can view own redemptions"
ON public.gift_cards
FOR SELECT
TO authenticated
USING (redeemed_by = auth.uid());