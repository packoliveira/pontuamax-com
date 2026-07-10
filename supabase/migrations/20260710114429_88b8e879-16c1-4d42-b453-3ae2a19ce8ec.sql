
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS bg_mode text NOT NULL DEFAULT 'dark',
  ADD COLUMN IF NOT EXISTS bg_color_1 text,
  ADD COLUMN IF NOT EXISTS bg_color_2 text;

ALTER TABLE public.stores
  DROP CONSTRAINT IF EXISTS stores_bg_mode_check;
ALTER TABLE public.stores
  ADD CONSTRAINT stores_bg_mode_check CHECK (bg_mode IN ('dark','light','custom'));
