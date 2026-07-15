CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo transaction_tipo NOT NULL,
  valor NUMERIC NOT NULL DEFAULT 0,
  pontos_delta INTEGER NOT NULL DEFAULT 0,
  cashback_delta NUMERIC NOT NULL DEFAULT 0,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  voucher_code TEXT,
  voucher_expires_at TIMESTAMPTZ,
  status transaction_status NOT NULL DEFAULT 'pendente',
  id_venda_externa TEXT,
  origem TEXT,
  delivered_at TIMESTAMPTZ,
  redeemed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_self_select" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = client_user_id);
CREATE POLICY "transactions_owner_all" ON public.transactions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_transactions_store ON public.transactions(store_id, created_at DESC);
CREATE INDEX idx_transactions_client ON public.transactions(client_user_id, created_at DESC);
CREATE UNIQUE INDEX transactions_store_venda_externa_key ON public.transactions(store_id, id_venda_externa) WHERE id_venda_externa IS NOT NULL;
CREATE INDEX idx_transactions_voucher_code ON public.transactions(voucher_code) WHERE voucher_code IS NOT NULL;
CREATE INDEX idx_transactions_expires_pending ON public.transactions(voucher_expires_at) WHERE status = 'pendente' AND voucher_expires_at IS NOT NULL;

ALTER TABLE public.store_clients ADD CONSTRAINT store_clients_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_client_user_id_profiles_fkey FOREIGN KEY (client_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- integration_logs
CREATE TABLE public.integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  origem TEXT NOT NULL,
  payload_recebido JSONB,
  status TEXT NOT NULL,
  mensagem_erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_logs TO authenticated;
GRANT ALL ON public.integration_logs TO service_role;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "integration_logs owner select" ON public.integration_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE INDEX integration_logs_store_created_idx ON public.integration_logs(store_id, created_at DESC);

-- updated_at trigger fn
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- campaigns
CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  segmento TEXT NOT NULL DEFAULT 'todos',
  segmento_param TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho',
  total_destinatarios INT NOT NULL DEFAULT 0,
  total_enviados INT NOT NULL DEFAULT 0,
  total_falhas INT NOT NULL DEFAULT 0,
  agendada_para TIMESTAMPTZ,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaigns owner all" ON public.campaigns FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = campaigns.store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = campaigns.store_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_campaigns_store ON public.campaigns(store_id, created_at DESC);
CREATE INDEX idx_campaigns_agendada ON public.campaigns(agendada_para) WHERE status = 'agendada';
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL,
  telefone TEXT,
  mensagem_render TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  erro TEXT,
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaign_recipients TO authenticated;
GRANT ALL ON public.campaign_recipients TO service_role;
ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "campaign_recipients owner all" ON public.campaign_recipients FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.campaigns c JOIN public.stores s ON s.id = c.store_id WHERE c.id = campaign_recipients.campaign_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns c JOIN public.stores s ON s.id = c.store_id WHERE c.id = campaign_recipients.campaign_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);

-- promotions
CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  multiplicador NUMERIC(4,2) NOT NULL DEFAULT 2 CHECK (multiplicador >= 1 AND multiplicador <= 10),
  dias_semana SMALLINT[] NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  hora_inicio TIME NOT NULL DEFAULT '00:00',
  hora_fim TIME NOT NULL DEFAULT '23:59',
  data_inicio DATE,
  data_fim DATE,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions owner all" ON public.promotions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = promotions.store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = promotions.store_id AND s.owner_id = auth.uid()));
CREATE POLICY "promotions authenticated view active" ON public.promotions FOR SELECT TO authenticated USING (ativo = true);
CREATE INDEX idx_promotions_store ON public.promotions(store_id) WHERE ativo = true;
CREATE TRIGGER promotions_updated_at BEFORE UPDATE ON public.promotions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- profiles birthdate
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthdate DATE;
CREATE UNIQUE INDEX profiles_cpf_unique ON public.profiles(cpf) WHERE cpf IS NOT NULL;

-- Trigger para criar profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, cpf)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'phone', NEW.raw_user_meta_data->>'cpf')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- last_purchase_at trigger
CREATE OR REPLACE FUNCTION public.update_last_purchase_at()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tipo = 'venda' THEN
    UPDATE public.store_clients SET last_purchase_at = NEW.created_at
      WHERE store_id = NEW.store_id AND user_id = NEW.client_user_id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.update_last_purchase_at() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_update_last_purchase_at AFTER INSERT ON public.transactions FOR EACH ROW EXECUTE FUNCTION public.update_last_purchase_at();

-- notification_logs
CREATE TABLE public.notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  status TEXT NOT NULL,
  mensagem_erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notification_logs TO authenticated;
GRANT ALL ON public.notification_logs TO service_role;
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_logs owner select" ON public.notification_logs FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = notification_logs.store_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_notif_logs_store ON public.notification_logs(store_id, created_at DESC);

-- nps_responses (server-side inserts only)
CREATE TABLE public.nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE UNIQUE,
  client_user_id UUID NOT NULL,
  score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 10),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.nps_responses TO authenticated;
GRANT ALL ON public.nps_responses TO service_role;
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "nps owner select" ON public.nps_responses FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_nps_store_created ON public.nps_responses(store_id, created_at DESC);

-- gift_cards
CREATE TABLE public.gift_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE,
  pontos INT NOT NULL CHECK (pontos > 0),
  redeemed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  redeemed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gift_cards TO authenticated;
GRANT ALL ON public.gift_cards TO service_role;
ALTER TABLE public.gift_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "gift_cards owner all" ON public.gift_cards FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "gift_cards clients own redemptions" ON public.gift_cards FOR SELECT TO authenticated USING (redeemed_by = auth.uid());
CREATE INDEX gift_cards_store_idx ON public.gift_cards(store_id);

-- fiscal_notes
CREATE TABLE public.fiscal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  image_hash TEXT NOT NULL,
  valor NUMERIC(12,2),
  cnpj_extraido TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','rejeitada')),
  pontos_creditados INT DEFAULT 0,
  motivo_rejeicao TEXT,
  ocr_raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, image_hash)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fiscal_notes TO authenticated;
GRANT ALL ON public.fiscal_notes TO service_role;
ALTER TABLE public.fiscal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fiscal_notes client own" ON public.fiscal_notes FOR SELECT TO authenticated USING (client_user_id = auth.uid());
CREATE POLICY "fiscal_notes client insert" ON public.fiscal_notes FOR INSERT TO authenticated WITH CHECK (client_user_id = auth.uid());
CREATE POLICY "fiscal_notes owner all" ON public.fiscal_notes FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE INDEX fiscal_notes_store_status_idx ON public.fiscal_notes(store_id, status);
CREATE TRIGGER fiscal_notes_updated BEFORE UPDATE ON public.fiscal_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- client_tags
CREATE TABLE public.client_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tag TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, client_user_id, tag)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_tags TO authenticated;
GRANT ALL ON public.client_tags TO service_role;
ALTER TABLE public.client_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "client_tags owner all" ON public.client_tags FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE INDEX client_tags_store_idx ON public.client_tags(store_id);

-- raffles
CREATE TABLE public.raffles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  premio TEXT NOT NULL,
  filtro_tag TEXT,
  filtro_nivel_min TEXT,
  ganhador_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ganhador_nome TEXT,
  status TEXT NOT NULL DEFAULT 'aberto' CHECK (status IN ('aberto','sorteado','cancelado')),
  sorted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.raffles TO authenticated;
GRANT ALL ON public.raffles TO service_role;
ALTER TABLE public.raffles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "raffles owner all" ON public.raffles FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE INDEX raffles_store_idx ON public.raffles(store_id);
CREATE TRIGGER raffles_updated BEFORE UPDATE ON public.raffles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- admin_audit_logs
CREATE TABLE public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL,
  actor_email TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  target_label TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_audit_logs TO authenticated;
GRANT ALL ON public.admin_audit_logs TO service_role;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_audit_logs admin select" ON public.admin_audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin_audit_logs admin insert" ON public.admin_audit_logs FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE INDEX admin_audit_logs_created_at_idx ON public.admin_audit_logs(created_at DESC);
CREATE INDEX admin_audit_logs_action_idx ON public.admin_audit_logs(action);

-- instagram_submissions
DO $$ BEGIN
  CREATE TYPE public.instagram_submission_status AS ENUM ('pendente','aprovado','rejeitado','estornado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.instagram_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  client_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_url TEXT NOT NULL,
  status public.instagram_submission_status NOT NULL DEFAULT 'pendente',
  points_awarded INTEGER NOT NULL DEFAULT 0,
  rejection_reason TEXT,
  verify_after TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  transaction_id UUID REFERENCES public.transactions(id) ON DELETE SET NULL,
  client_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT instagram_submissions_url_shape CHECK (post_url ~* '^https?://(www\.)?instagram\.com/')
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.instagram_submissions TO authenticated;
GRANT ALL ON public.instagram_submissions TO service_role;
ALTER TABLE public.instagram_submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ig_self_select" ON public.instagram_submissions FOR SELECT TO authenticated USING (auth.uid() = client_user_id);
CREATE POLICY "ig_self_insert" ON public.instagram_submissions FOR INSERT TO authenticated WITH CHECK (auth.uid() = client_user_id AND status = 'pendente' AND points_awarded = 0 AND EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.instagram_program_active = true));
CREATE POLICY "ig_owner_all" ON public.instagram_submissions FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_instagram_submissions_store_status ON public.instagram_submissions(store_id, status, created_at DESC);
CREATE INDEX idx_instagram_submissions_client ON public.instagram_submissions(client_user_id, created_at DESC);
CREATE TRIGGER trg_instagram_submissions_updated_at BEFORE UPDATE ON public.instagram_submissions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- profiles: owner reads clients' profiles
CREATE POLICY "profiles_store_owner_select" ON public.profiles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.store_clients sc JOIN public.stores s ON s.id = sc.store_id WHERE sc.user_id = profiles.id AND s.owner_id = auth.uid()));

-- admin policies for user_roles and profiles
CREATE POLICY "user_roles_admin_all" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "profiles_admin_select" ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- bootstrap admin
CREATE OR REPLACE FUNCTION public.bootstrap_first_admin()
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE admin_count INT; current_uid UUID;
BEGIN
  current_uid := auth.uid();
  IF current_uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT count(*) INTO admin_count FROM public.user_roles WHERE role = 'admin';
  IF admin_count > 0 THEN RETURN false; END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (current_uid, 'admin') ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.bootstrap_first_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bootstrap_first_admin() TO authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
