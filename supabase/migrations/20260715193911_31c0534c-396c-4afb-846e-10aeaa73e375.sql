
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS brand_accent_points text,
  ADD COLUMN IF NOT EXISTS brand_accent_cashback text,
  ADD COLUMN IF NOT EXISTS brand_cta text,
  ADD COLUMN IF NOT EXISTS brand_vip text,
  ADD COLUMN IF NOT EXISTS brand_price text,
  ADD COLUMN IF NOT EXISTS text_on_dark text,
  ADD COLUMN IF NOT EXISTS header_title_size text NOT NULL DEFAULT 'md',
  ADD COLUMN IF NOT EXISTS header_title_weight text NOT NULL DEFAULT 'bold',
  ADD COLUMN IF NOT EXISTS header_kicker_text text NOT NULL DEFAULT 'Fidelidade',
  ADD COLUMN IF NOT EXISTS header_kicker_show boolean NOT NULL DEFAULT true;
