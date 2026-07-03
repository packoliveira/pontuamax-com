
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

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
  enviado_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.campaigns TO authenticated;
GRANT ALL ON public.campaigns TO service_role;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Dono da loja gerencia campanhas" ON public.campaigns FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = campaigns.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.stores s WHERE s.id = campaigns.store_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_campaigns_store ON public.campaigns(store_id, created_at DESC);
CREATE TRIGGER trg_campaigns_updated_at BEFORE UPDATE ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

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
CREATE POLICY "Dono acessa destinatarios" ON public.campaign_recipients FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.campaigns c JOIN public.stores s ON s.id = c.store_id WHERE c.id = campaign_recipients.campaign_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.campaigns c JOIN public.stores s ON s.id = c.store_id WHERE c.id = campaign_recipients.campaign_id AND s.owner_id = auth.uid()));
CREATE INDEX idx_campaign_recipients_campaign ON public.campaign_recipients(campaign_id);
