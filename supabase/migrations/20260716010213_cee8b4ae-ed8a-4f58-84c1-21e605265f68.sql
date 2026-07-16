-- H1: fechar backdoor de escalação a admin
REVOKE EXECUTE ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO service_role;

-- M1: policy explícita de negação em oauth_states (server escreve via service_role, bypassa RLS)
CREATE POLICY "oauth_states client deny" ON public.oauth_states
  FOR ALL TO authenticated, anon
  USING (false) WITH CHECK (false);

-- M3: índices em FKs sem suporte (delete cascade e joins)
CREATE INDEX IF NOT EXISTS idx_products_store ON public.products(store_id);
CREATE INDEX IF NOT EXISTS idx_store_clients_user ON public.store_clients(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_product ON public.transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_transactions_redeemed_by ON public.transactions(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_fiscal_notes_client ON public.fiscal_notes(client_user_id);
CREATE INDEX IF NOT EXISTS idx_client_tags_client ON public.client_tags(client_user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_client ON public.notification_logs(client_user_id);
CREATE INDEX IF NOT EXISTS idx_gift_cards_redeemed_by ON public.gift_cards(redeemed_by);
CREATE INDEX IF NOT EXISTS idx_raffles_ganhador ON public.raffles(ganhador_user_id);
CREATE INDEX IF NOT EXISTS idx_store_employees_role ON public.store_employees(role_key);
CREATE INDEX IF NOT EXISTS idx_store_employees_created_by ON public.store_employees(created_by);
CREATE INDEX IF NOT EXISTS idx_store_employee_perms_perm ON public.store_employee_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_team_role_perms_perm ON public.team_role_permissions(permission_key);
CREATE INDEX IF NOT EXISTS idx_instagram_reviewed_by ON public.instagram_submissions(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_instagram_transaction ON public.instagram_submissions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_employee_audit_actor ON public.employee_audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_states_store ON public.oauth_states(store_id);