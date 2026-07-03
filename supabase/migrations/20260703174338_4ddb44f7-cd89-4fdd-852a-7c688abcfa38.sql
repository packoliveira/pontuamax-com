
-- profiles: aniversário
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthdate date;

-- store_clients: rastreamento de notificações + última compra
ALTER TABLE public.store_clients
  ADD COLUMN IF NOT EXISTS last_purchase_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_notified_birthday date,
  ADD COLUMN IF NOT EXISTS last_notified_inactivity date,
  ADD COLUMN IF NOT EXISTS last_notified_expiry date;

-- Permite que o dono da loja veja o aniversário dos clientes vinculados
DROP POLICY IF EXISTS profiles_store_owner_select ON public.profiles;
CREATE POLICY profiles_store_owner_select ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.store_clients sc
    JOIN public.stores s ON s.id = sc.store_id
    WHERE sc.user_id = profiles.id AND s.owner_id = auth.uid()
  ));

-- Backfill last_purchase_at a partir de transactions
UPDATE public.store_clients sc
SET last_purchase_at = t.last_at
FROM (
  SELECT store_id, client_user_id, MAX(created_at) AS last_at
  FROM public.transactions WHERE tipo = 'venda' GROUP BY store_id, client_user_id
) t
WHERE sc.store_id = t.store_id AND sc.user_id = t.client_user_id;

-- Trigger para atualizar last_purchase_at automaticamente
CREATE OR REPLACE FUNCTION public.update_last_purchase_at()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'venda' THEN
    UPDATE public.store_clients
      SET last_purchase_at = NEW.created_at
      WHERE store_id = NEW.store_id AND user_id = NEW.client_user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.update_last_purchase_at() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_update_last_purchase_at ON public.transactions;
CREATE TRIGGER trg_update_last_purchase_at
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_last_purchase_at();

-- stores: configurações de notificações automáticas
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS notif_birthday_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_birthday_bonus_points integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS notif_birthday_template text NOT NULL DEFAULT
    'Feliz aniversário, {nome}! 🎉 Presente da {loja}: {bonus} pontos extras já estão na sua conta. Aproveite!',
  ADD COLUMN IF NOT EXISTS notif_inactivity_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_inactivity_days integer NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS notif_inactivity_template text NOT NULL DEFAULT
    'Oi {nome}, sentimos sua falta na {loja}! Você tem {pontos} pontos esperando. Que tal passar por aqui?',
  ADD COLUMN IF NOT EXISTS notif_expiry_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notif_expiry_days integer NOT NULL DEFAULT 180,
  ADD COLUMN IF NOT EXISTS notif_expiry_warn_days integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS notif_expiry_template text NOT NULL DEFAULT
    'Atenção {nome}! Seus {pontos} pontos na {loja} expiram em {dias} dias. Aproveite antes que sumam!';

-- notification_logs: auditoria dos envios
CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo text NOT NULL, -- 'aniversario' | 'inatividade' | 'expiracao'
  status text NOT NULL, -- 'enviado' | 'erro'
  mensagem_erro text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;

ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY notification_logs_owner_select ON public.notification_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = notification_logs.store_id AND s.owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_notif_logs_store ON public.notification_logs(store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_store_clients_last_purchase ON public.store_clients(store_id, last_purchase_at);
