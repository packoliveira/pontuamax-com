-- Agenda anonimização diária de PII em logs antigos
-- 04:00 BRT = 07:00 UTC, 1x/dia
SELECT cron.schedule(
  'anonimizar-logs-antigos',
  '0 7 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pontuamax-com.lovable.app/api/public/hooks/anonimizar-logs-antigos',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRmbWxveWhtZW1rZmhrd2hva3BoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNjA0ODIsImV4cCI6MjA5OTYzNjQ4Mn0.iUC_JvPsJwLAO4vbOxVzZTasQySkN-aL4899gig13xA"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);