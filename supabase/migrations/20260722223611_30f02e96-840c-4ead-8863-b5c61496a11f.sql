SELECT cron.unschedule('olist-polling-5min');
DROP TABLE IF EXISTS public.erp_credentials CASCADE;
DROP TABLE IF EXISTS public.oauth_states CASCADE;
DROP TABLE IF EXISTS public.erp_webhook_events CASCADE;