ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS evolution_url text,
  ADD COLUMN IF NOT EXISTS evolution_apikey text,
  ADD COLUMN IF NOT EXISTS evolution_instance text,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_template_pontos text NOT NULL DEFAULT
    'Oi {nome_cliente}! 🎉' || E'\n' ||
    'Você acabou de ganhar {pontos_ganhos} pontos na {nome_loja}!' || E'\n' ||
    'Seu saldo atual: {pontos_saldo} pontos.' || E'\n' ||
    'Faltam {pontos_faltantes} pontos para você trocar por: {proximo_premio}.' || E'\n' ||
    'Confira tudo aqui: {link_portal_cliente}';