ALTER TABLE public.store_clients
  ADD COLUMN IF NOT EXISTS pending_registration boolean NOT NULL DEFAULT false;

-- Backfill: marca como pendente quem tem email sintético gerado pelo webhook
UPDATE public.store_clients sc
SET pending_registration = true
FROM auth.users u
WHERE sc.user_id = u.id
  AND (
    u.email LIKE '%@cliente.qsfclub.local'
    OR u.email LIKE '%@cpf.qsfclub.local'
  );

CREATE INDEX IF NOT EXISTS store_clients_pending_idx
  ON public.store_clients (store_id) WHERE pending_registration = true;