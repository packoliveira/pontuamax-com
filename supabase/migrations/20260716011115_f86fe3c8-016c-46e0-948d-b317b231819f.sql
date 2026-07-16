ALTER TABLE public.stores
  DROP COLUMN IF EXISTS webhook_secret,
  DROP COLUMN IF EXISTS evolution_url,
  DROP COLUMN IF EXISTS evolution_apikey,
  DROP COLUMN IF EXISTS evolution_instance;

-- Atualiza a função que serve stores para funcionários — a lista de colunas
-- excluídas fica obsoleta mas continua válida (o "-" em jsonb ignora chaves ausentes).
-- Nada mais a alterar.