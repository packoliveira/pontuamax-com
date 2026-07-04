
-- 1) Novo tipo de transação para expiração
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'expiracao';

-- 2) Configurações de expiração na loja
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS pontos_expiracao_modo text NOT NULL DEFAULT 'nenhum',
  ADD COLUMN IF NOT EXISTS pontos_validade_dias integer NOT NULL DEFAULT 365,
  ADD COLUMN IF NOT EXISTS pontos_decaimento_dias integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS pontos_decaimento_valor integer NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS pontos_expiracao_last_run_at timestamptz;

-- Regra do modo aceito
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'stores_pontos_expiracao_modo_chk'
  ) THEN
    ALTER TABLE public.stores
      ADD CONSTRAINT stores_pontos_expiracao_modo_chk
      CHECK (pontos_expiracao_modo IN ('nenhum','validade','decaimento'));
  END IF;
END $$;

-- Marca a última decaimento aplicada por cliente/loja
ALTER TABLE public.store_clients
  ADD COLUMN IF NOT EXISTS pontos_decaimento_last_at timestamptz;
