
-- Add 'admin' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'admin';

DO $$ BEGIN
  CREATE TYPE public.subscription_status AS ENUM ('pending_payment', 'active', 'suspended', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.plan_tier AS ENUM ('starter', 'pro', 'premium');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS subscription_status public.subscription_status NOT NULL DEFAULT 'pending_payment',
  ADD COLUMN IF NOT EXISTS plan public.plan_tier NOT NULL DEFAULT 'starter',
  ADD COLUMN IF NOT EXISTS mrr_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS setup_paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS cancelled_at timestamptz,
  ADD COLUMN IF NOT EXISTS admin_notes text;
