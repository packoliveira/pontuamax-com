
-- 1) Novo status "cancelado" para vouchers/resgates
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'cancelado';

-- 2) Configurações por loja sobre visibilidade dos vouchers
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS voucher_visivel_apos_uso boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS voucher_mostrar_expirados boolean NOT NULL DEFAULT true;

-- 3) Auditoria de quem confirmou o voucher
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS redeemed_by uuid REFERENCES auth.users(id);
