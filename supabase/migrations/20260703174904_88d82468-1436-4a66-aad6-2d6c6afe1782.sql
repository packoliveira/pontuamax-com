
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'indicacao';

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS indicacao_ativa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS bonus_indicador integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS bonus_indicado integer NOT NULL DEFAULT 20;

ALTER TABLE public.store_clients
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid,
  ADD COLUMN IF NOT EXISTS referral_bonus_paid boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_store_clients_referrer ON public.store_clients (store_id, referrer_user_id);
