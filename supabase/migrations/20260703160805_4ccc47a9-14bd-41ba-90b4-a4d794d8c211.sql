
-- Enums
CREATE TYPE public.app_role AS ENUM ('lojista', 'cliente');
CREATE TYPE public.modalidade AS ENUM ('pontos', 'cashback', 'ambos');
CREATE TYPE public.transaction_tipo AS ENUM ('venda', 'resgate_produto', 'resgate_cashback');
CREATE TYPE public.transaction_status AS ENUM ('pendente', 'entregue');
CREATE TYPE public.nivel_cliente AS ENUM ('bronze', 'prata', 'ouro');

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  cpf TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_self_select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_self_insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- User roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_self_select" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Stores
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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "stores_public_select" ON public.stores FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "stores_owner_insert" ON public.stores FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "stores_owner_update" ON public.stores FOR UPDATE TO authenticated USING (auth.uid() = owner_id);
CREATE POLICY "stores_owner_delete" ON public.stores FOR DELETE TO authenticated USING (auth.uid() = owner_id);

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  custo_pontos INTEGER NOT NULL CHECK (custo_pontos >= 0),
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products_public_select" ON public.products FOR SELECT TO anon, authenticated USING (ativo = true OR EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));
CREATE POLICY "products_owner_all" ON public.products FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid())) WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

-- Store clients (relacionamento cliente x loja)
CREATE TABLE public.store_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pontos INTEGER NOT NULL DEFAULT 0,
  cashback_saldo NUMERIC NOT NULL DEFAULT 0,
  nivel nivel_cliente NOT NULL DEFAULT 'bronze',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(store_id, user_id)
);
GRANT SELECT ON public.store_clients TO authenticated;
GRANT ALL ON public.store_clients TO service_role;
ALTER TABLE public.store_clients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "store_clients_self_select" ON public.store_clients FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "store_clients_owner_select" ON public.store_clients FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

-- Transactions
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
  status transaction_status NOT NULL DEFAULT 'pendente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions_self_select" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = client_user_id);
CREATE POLICY "transactions_owner_select" ON public.transactions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = store_id AND s.owner_id = auth.uid()));

-- Trigger para criar profile automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, cpf)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cpf'
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE INDEX idx_stores_slug ON public.stores(slug);
CREATE INDEX idx_store_clients_store_user ON public.store_clients(store_id, user_id);
CREATE INDEX idx_transactions_store ON public.transactions(store_id, created_at DESC);
CREATE INDEX idx_transactions_client ON public.transactions(client_user_id, created_at DESC);
