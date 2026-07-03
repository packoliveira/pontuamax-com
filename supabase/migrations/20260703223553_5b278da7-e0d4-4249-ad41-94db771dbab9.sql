
-- 1) Zerar todos os dados públicos (não afeta esquema)
TRUNCATE TABLE
  public.campaign_recipients,
  public.campaigns,
  public.client_tags,
  public.fiscal_notes,
  public.gift_cards,
  public.integration_logs,
  public.notification_logs,
  public.nps_responses,
  public.products,
  public.promotions,
  public.raffles,
  public.store_clients,
  public.transactions,
  public.user_roles,
  public.stores,
  public.profiles
RESTART IDENTITY CASCADE;

-- 2) Apagar todos os usuários de auth (perfis/roles caem pelo cascade acima e trigger)
DELETE FROM auth.users;

-- 3) Novos campos: banner mobile e (garantia) banner desktop
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS banner_url_mobile text;
