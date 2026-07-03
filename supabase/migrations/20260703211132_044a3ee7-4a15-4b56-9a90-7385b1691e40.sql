-- Add explicit FK so PostgREST can embed profiles from store_clients and transactions
ALTER TABLE public.store_clients
  ADD CONSTRAINT store_clients_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_client_user_id_profiles_fkey
  FOREIGN KEY (client_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
