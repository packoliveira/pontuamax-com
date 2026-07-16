
-- Wave 1: Segurança e banco (gatilhos, índices, revogações)

-- 1) Gatilho para manter store_clients.last_purchase_at atualizado
DROP TRIGGER IF EXISTS trg_transactions_last_purchase ON public.transactions;
CREATE TRIGGER trg_transactions_last_purchase
AFTER INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.update_last_purchase_at();

-- 2) Gatilhos updated_at nas tabelas que possuem a coluna
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['campaigns','erp_credentials','fiscal_notes','instagram_submissions','promotions','raffles','store_employees']
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_set_updated_at ON public.%1$s;', t);
    EXECUTE format('CREATE TRIGGER trg_%1$s_set_updated_at BEFORE UPDATE ON public.%1$s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();', t);
  END LOOP;
END $$;

-- 3) Índices compostos que faltam
CREATE INDEX IF NOT EXISTS idx_transactions_store_created
  ON public.transactions (store_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_client_created
  ON public.transactions (client_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_store_clients_store_pending
  ON public.store_clients (store_id) WHERE pending_registration = true;

CREATE INDEX IF NOT EXISTS idx_employee_audit_logs_employee_created
  ON public.employee_audit_logs (employee_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_merchant_notif_store_unread_created
  ON public.merchant_notifications (store_id, created_at DESC) WHERE read_at IS NULL;

-- 4) Defesa em profundidade: revogar EXECUTE do PUBLIC nas funções sensíveis
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_store_owner(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_store_owner_or_employee(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.employee_has_permission(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_store_for_employee(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_employee_link(uuid, uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) FROM PUBLIC;
