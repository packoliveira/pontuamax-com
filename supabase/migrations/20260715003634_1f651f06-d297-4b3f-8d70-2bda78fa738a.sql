-- ===== STORES =====
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  nome_fantasia TEXT NOT NULL,
  cnpj TEXT,
  telefone TEXT,
  modalidade modalidade NOT NULL DEFAULT 'ambos',
  regra_pontos NUMERIC NOT NULL DEFAULT 1,
  percentual_cashback NUMERIC NOT NULL DEFAULT 5,
  brand_primary TEXT NOT NULL DEFAULT '#7C3AED',
  brand_secondary TEXT NOT NULL DEFAULT '#F59E0B',
  logo_url TEXT,
  banner_url TEXT,
  banner_url_mobile TEXT,
  banner_mobile_fit TEXT NOT NULL DEFAULT 'cover' CHECK (banner_mobile_fit IN ('cover','contain')),
  banner_mobile_position_x INTEGER NOT NULL DEFAULT 50 CHECK (banner_mobile_position_x BETWEEN 0 AND 100),
  banner_mobile_position_y INTEGER NOT NULL DEFAULT 50 CHECK (banner_mobile_position_y BETWEEN 0 AND 100),
  banner_mobile_zoom INTEGER NOT NULL DEFAULT 100 CHECK (banner_mobile_zoom BETWEEN 100 AND 300),
  bg_mode TEXT NOT NULL DEFAULT 'dark' CHECK (bg_mode IN ('dark','light','custom')),
  bg_color_1 TEXT,
  bg_color_2 TEXT,
  webhook_secret TEXT NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'),
  webhook_last_at TIMESTAMPTZ,
  evolution_url TEXT,
  evolution_apikey TEXT,
  evolution_instance TEXT,
  whatsapp_enabled BOOLEAN NOT NULL DEFAULT false,
  whatsapp_template_pontos TEXT NOT NULL DEFAULT 'Oi {nome_cliente}! 🎉 Você ganhou {pontos_ganhos} pontos na {nome_loja}. Saldo: {pontos_saldo} pontos.',
  subscription_status TEXT NOT NULL DEFAULT 'pending_payment',
  plan TEXT NOT NULL DEFAULT 'starter',
  mrr_amount NUMERIC NOT NULL DEFAULT 0,
  setup_paid_at TIMESTAMPTZ,
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  admin_notes TEXT,
  notif_birthday_enabled BOOLEAN NOT NULL DEFAULT false,
  notif_birthday_bonus_points INTEGER NOT NULL DEFAULT 50,
  notif_birthday_template TEXT NOT NULL DEFAULT 'Feliz aniversário, {nome}! 🎉 Presente da {loja}: {bonus} pontos.',
  notif_inactivity_enabled BOOLEAN NOT NULL DEFAULT false,
  notif_inactivity_days INTEGER NOT NULL DEFAULT 60,
  notif_inactivity_template TEXT NOT NULL DEFAULT 'Oi {nome}, sentimos sua falta! Você tem {pontos} pontos.',
  notif_expiry_enabled BOOLEAN NOT NULL DEFAULT false,
  notif_expiry_days INTEGER NOT NULL DEFAULT 180,
  notif_expiry_warn_days INTEGER NOT NULL DEFAULT 7,
  notif_expiry_template TEXT NOT NULL DEFAULT 'Atenção {nome}! Seus {pontos} pontos expiram em {dias} dias.',
  indicacao_ativa BOOLEAN NOT NULL DEFAULT false,
  bonus_indicador INTEGER NOT NULL DEFAULT 50,
  bonus_indicado INTEGER NOT NULL DEFAULT 20,
  nps_enabled BOOLEAN NOT NULL DEFAULT false,
  nps_ask_comment BOOLEAN NOT NULL DEFAULT true,
  nps_template TEXT NOT NULL DEFAULT 'Oi {nome_cliente}! Obrigado por comprar. Numa escala de 0 a 10, quanto recomenda? {link_nps}',
  voucher_visivel_apos_uso BOOLEAN NOT NULL DEFAULT false,
  voucher_mostrar_expirados BOOLEAN NOT NULL DEFAULT true,
  voucher_validade_dias INTEGER NOT NULL DEFAULT 7,
  pontos_expiracao_modo TEXT NOT NULL DEFAULT 'nenhum' CHECK (pontos_expiracao_modo IN ('nenhum','validade','decaimento')),
  pontos_validade_dias INTEGER NOT NULL DEFAULT 365,
  pontos_decaimento_dias INTEGER NOT NULL DEFAULT 30,
  pontos_decaimento_valor INTEGER NOT NULL DEFAULT 10,
  pontos_expiracao_last_run_at TIMESTAMPTZ,
  instagram_program_active BOOLEAN NOT NULL DEFAULT false,
  instagram_handle TEXT,
  instagram_points_per_post INTEGER NOT NULL DEFAULT 50,
  instagram_min_days_live INTEGER NOT NULL DEFAULT 7,
  instagram_instructions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores_owner_select" ON public.stores FOR SELECT TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "stores_owner_insert" ON public.stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "stores_owner_update" ON public.stores FOR UPDATE TO authenticated USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "stores_owner_delete" ON public.stores FOR DELETE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "stores_admin_select" ON public.stores FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "stores_admin_update" ON public.stores FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX idx_stores_slug ON public.stores(slug);

-- View pública com colunas seguras
CREATE OR REPLACE VIEW public.stores_public AS
SELECT id, slug, nome_fantasia, logo_url, banner_url, banner_url_mobile,
  banner_mobile_fit, banner_mobile_position_x, banner_mobile_position_y, banner_mobile_zoom,
  bg_mode, bg_color_1, bg_color_2,
  brand_primary, brand_secondary, modalidade, regra_pontos, percentual_cashback,
  indicacao_ativa, bonus_indicador, bonus_indicado, whatsapp_enabled, nps_enabled,
  instagram_program_active, instagram_handle, instagram_points_per_post,
  created_at
FROM public.stores;
GRANT SELECT ON public.stores_public TO anon, authenticated, service_role;

-- ===== PRODUCTS =====
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  custo_pontos INTEGER NOT NULL CHECK (custo_pontos >= 0),
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_select" ON public.products FOR SELECT TO anon, authenticated USING (ativo = true OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "products_owner_all" ON public.products FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

-- ===== STORE_CLIENTS =====
CREATE TABLE public.store_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pontos INTEGER NOT NULL DEFAULT 0,
  cashback_saldo NUMERIC NOT NULL DEFAULT 0,
  nivel nivel_cliente NOT NULL DEFAULT 'bronze',
  last_purchase_at TIMESTAMPTZ,
  last_notified_birthday DATE,
  last_notified_inactivity DATE,
  last_notified_expiry DATE,
  referrer_user_id UUID,
  referral_bonus_paid BOOLEAN NOT NULL DEFAULT false,
  pontos_decaimento_last_at TIMESTAMPTZ,
  pending_registration BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_clients TO authenticated;
GRANT ALL ON public.store_clients TO service_role;
ALTER TABLE public.store_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_clients_self_select" ON public.store_clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "store_clients_owner_all" ON public.store_clients FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_store_clients_store_user ON public.store_clients(store_id, user_id);
CREATE INDEX idx_store_clients_last_purchase ON public.store_clients(store_id, last_purchase_at);
CREATE INDEX idx_store_clients_referrer ON public.store_clients(store_id, referrer_user_id);
CREATE INDEX store_clients_pending_idx ON public.store_clients(store_id) WHERE pending_registration = true;

-- ===== TRANSACTIONS =====
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'indicacao';
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'vale_presente';
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'nota_fiscal';
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'ajuste';
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'instagram_bonus';
ALTER TYPE public.transaction_tipo ADD VALUE IF NOT EXISTS 'expiracao';
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'cancelado';
ALTER TYPE public.transaction_status ADD VALUE IF NOT EXISTS 'expirado';
