
CREATE TABLE public.subscription_plans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  nome TEXT NOT NULL,
  descricao TEXT,
  preco_mensal NUMERIC(10,2) NOT NULL DEFAULT 0,
  preco_anual NUMERIC(10,2) NOT NULL DEFAULT 0,
  setup_fee NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_clientes INTEGER,
  max_funcionarios INTEGER,
  max_lojas INTEGER,
  integracao_erp BOOLEAN NOT NULL DEFAULT false,
  campanhas_whatsapp BOOLEAN NOT NULL DEFAULT false,
  campanhas_sms BOOLEAN NOT NULL DEFAULT false,
  nps_ativo BOOLEAN NOT NULL DEFAULT false,
  sorteios_ativo BOOLEAN NOT NULL DEFAULT false,
  vale_presente_ativo BOOLEAN NOT NULL DEFAULT false,
  instagram_ativo BOOLEAN NOT NULL DEFAULT false,
  suporte_prioritario BOOLEAN NOT NULL DEFAULT false,
  destaque BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  ordem INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_plans TO anon, authenticated;
GRANT ALL ON public.subscription_plans TO service_role;

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Planos ativos visíveis para todos"
  ON public.subscription_plans FOR SELECT
  USING (ativo = true);

CREATE POLICY "Admin gerencia planos"
  ON public.subscription_plans FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.subscription_plans
  (slug, nome, descricao, preco_mensal, preco_anual, setup_fee,
   max_clientes, max_funcionarios, max_lojas,
   integracao_erp, campanhas_whatsapp, campanhas_sms, nps_ativo,
   sorteios_ativo, vale_presente_ativo, instagram_ativo, suporte_prioritario,
   destaque, ordem)
VALUES
  ('starter', 'Starter', 'Ideal para lojas que estão começando a fidelizar clientes.',
    97.00, 970.00, 297.00,
    500, 1, 1,
    false, false, false, false,
    false, false, false, false,
    false, 1),
  ('pro', 'Pro', 'Para lojas consolidadas que querem escalar retenção e recompra.',
    197.00, 1970.00, 297.00,
    3000, 5, 1,
    true, true, false, true,
    true, true, true, false,
    true, 2),
  ('premium', 'Premium', 'Alto volume, recursos completos e suporte prioritário.',
    397.00, 3970.00, 497.00,
    NULL, NULL, 3,
    true, true, true, true,
    true, true, true, true,
    false, 3),
  ('enterprise', 'Enterprise', 'Redes e franquias — multi-loja ilimitado, API e SLA dedicado.',
    0.00, 0.00, 0.00,
    NULL, NULL, NULL,
    true, true, true, true,
    true, true, true, true,
    false, 4);
