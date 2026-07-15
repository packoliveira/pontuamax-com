ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS reward_rain_colors text[] NOT NULL DEFAULT ARRAY['#F59E0B','#F97316','#FBBF24','#FB7185','#FFFFFF','#FCD34D'],
  ADD COLUMN IF NOT EXISTS reward_rain_opacity numeric NOT NULL DEFAULT 0.75 CHECK (reward_rain_opacity >= 0.1 AND reward_rain_opacity <= 1);