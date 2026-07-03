
-- Limpeza dos cadastros de teste do telefone 65993312743 / CPF 04986013157.
-- Remove vínculos (não há), perfis e contas de autenticação, liberando o CPF/telefone para novo cadastro.
DO $$
DECLARE
  uid uuid;
BEGIN
  FOR uid IN
    SELECT id FROM public.profiles WHERE phone = '65993312743' OR cpf = '04986013157'
  LOOP
    DELETE FROM public.client_tags WHERE client_user_id = uid;
    DELETE FROM public.transactions WHERE client_user_id = uid;
    DELETE FROM public.fiscal_notes WHERE client_user_id = uid;
    DELETE FROM public.nps_responses WHERE client_user_id = uid;
    DELETE FROM public.notification_logs WHERE client_user_id = uid;
    DELETE FROM public.campaign_recipients WHERE client_user_id = uid;
    UPDATE public.gift_cards SET redeemed_by = NULL, redeemed_at = NULL WHERE redeemed_by = uid;
    DELETE FROM public.store_clients WHERE user_id = uid;
    DELETE FROM public.profiles WHERE id = uid;
    DELETE FROM auth.users WHERE id = uid;
  END LOOP;
END $$;
