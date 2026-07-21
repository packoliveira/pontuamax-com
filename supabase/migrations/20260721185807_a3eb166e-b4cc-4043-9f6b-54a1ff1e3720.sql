
ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS cashback_valor_minimo NUMERIC(12,2) NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.resgatar_cashback_atomico(
  p_store_id UUID, p_user_id UUID, p_valor NUMERIC, p_voucher_code TEXT, p_expires_at TIMESTAMPTZ
) RETURNS public.transactions LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link public.store_clients%ROWTYPE;
  v_tx public.transactions%ROWTYPE;
  v_novo_saldo NUMERIC;
  v_minimo NUMERIC;
BEGIN
  IF p_valor <= 0 THEN RAISE EXCEPTION 'Valor inválido.'; END IF;

  SELECT COALESCE(cashback_valor_minimo, 0) INTO v_minimo
    FROM public.stores WHERE id = p_store_id;

  SELECT * INTO v_link FROM public.store_clients
    WHERE store_id = p_store_id AND user_id = p_user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cliente não vinculado à loja.'; END IF;

  IF v_minimo > 0 AND v_link.cashback_saldo < v_minimo THEN
    RAISE EXCEPTION 'Saldo mínimo para resgate de cashback é R$ %.', to_char(v_minimo, 'FM999999990.00');
  END IF;

  IF v_link.cashback_saldo < p_valor THEN RAISE EXCEPTION 'Cashback insuficiente.'; END IF;

  v_novo_saldo := round((v_link.cashback_saldo - p_valor)::numeric, 2);
  INSERT INTO public.transactions (store_id, client_user_id, tipo, cashback_delta, voucher_code, status, voucher_expires_at)
    VALUES (p_store_id, p_user_id, 'resgate_cashback', -p_valor, p_voucher_code, 'pendente', p_expires_at)
    RETURNING * INTO v_tx;
  UPDATE public.store_clients SET cashback_saldo = v_novo_saldo WHERE id = v_link.id;
  RETURN v_tx;
END; $$;
