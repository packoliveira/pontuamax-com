ALTER TABLE public.stores ADD COLUMN IF NOT EXISTS reward_rain_enabled BOOLEAN NOT NULL DEFAULT false;
UPDATE public.stores SET reward_rain_enabled = true WHERE slug = 'queroserfitloja';