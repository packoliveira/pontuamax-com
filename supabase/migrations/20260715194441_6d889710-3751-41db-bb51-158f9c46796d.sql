ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS header_kicker_size TEXT DEFAULT 'sm',
  ADD COLUMN IF NOT EXISTS header_title_size_mobile TEXT,
  ADD COLUMN IF NOT EXISTS header_kicker_size_mobile TEXT;