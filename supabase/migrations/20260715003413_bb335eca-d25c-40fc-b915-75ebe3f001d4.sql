-- Reset public schema
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname='public') LOOP
    EXECUTE 'DROP TABLE IF EXISTS public.'||quote_ident(r.tablename)||' CASCADE';
  END LOOP;
  FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' AND t.typtype='e') LOOP
    EXECUTE 'DROP TYPE IF EXISTS public.'||quote_ident(r.typname)||' CASCADE';
  END LOOP;
  FOR r IN (SELECT p.proname, pg_get_function_identity_arguments(p.oid) AS args FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public') LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS public.'||quote_ident(r.proname)||'('||r.args||') CASCADE';
  END LOOP;
END $$;