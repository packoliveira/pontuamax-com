ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'expirado';

ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS voucher_validade_dias integer NOT NULL DEFAULT 7;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS voucher_expires_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_transactions_voucher_code
  ON public.transactions (voucher_code) WHERE voucher_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_transactions_expires_pending
  ON public.transactions (voucher_expires_at) WHERE status = 'pendente' AND voucher_expires_at IS NOT NULL;