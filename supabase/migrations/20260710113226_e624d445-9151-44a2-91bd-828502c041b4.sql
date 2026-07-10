
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS banner_mobile_fit TEXT NOT NULL DEFAULT 'cover' CHECK (banner_mobile_fit IN ('cover','contain')),
  ADD COLUMN IF NOT EXISTS banner_mobile_position_x INTEGER NOT NULL DEFAULT 50 CHECK (banner_mobile_position_x BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS banner_mobile_position_y INTEGER NOT NULL DEFAULT 50 CHECK (banner_mobile_position_y BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS banner_mobile_zoom INTEGER NOT NULL DEFAULT 100 CHECK (banner_mobile_zoom BETWEEN 100 AND 300);
