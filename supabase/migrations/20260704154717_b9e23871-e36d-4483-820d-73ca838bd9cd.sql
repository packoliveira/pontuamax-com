
CREATE OR REPLACE FUNCTION public.resgatar_produto_atomico(
  p_store_id uuid,
  p_user_id uuid,
  p_product_id uuid,
  p_voucher_code text,
  p_expires_at timestamptz
) RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.store_clients%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_tx public.transactions%ROWTYPE;
  v_novo_pontos int;
  v_novo_nivel public.nivel_cliente;
BEGIN
  -- Trava a linha do cliente na loja para serializar resgates concorrentes.
  SELECT * INTO v_link FROM public.store_clients
    WHERE store_id = p_store_id AND user_id = p_user_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não vinculado à loja.';
  END IF;

  SELECT * INTO v_product FROM public.products
    WHERE id = p_product_id AND store_id = p_store_id AND ativo = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Produto indisponível.';
  END IF;

  IF v_link.pontos < v_product.custo_pontos THEN
    RAISE EXCEPTION 'Pontos insuficientes. Necessário: % pts. Saldo: % pts.',
      v_product.custo_pontos, v_link.pontos;
  END IF;

  v_novo_pontos := v_link.pontos - v_product.custo_pontos;
  v_novo_nivel := CASE
    WHEN v_novo_pontos <= 100 THEN 'bronze'::public.nivel_cliente
    WHEN v_novo_pontos <= 300 THEN 'prata'::public.nivel_cliente
    ELSE 'ouro'::public.nivel_cliente
  END;

  INSERT INTO public.transactions (
    store_id, client_user_id, tipo, pontos_delta, product_id,
    voucher_code, status, voucher_expires_at
  ) VALUES (
    p_store_id, p_user_id, 'resgate_produto', -v_product.custo_pontos, p_product_id,
    p_voucher_code, 'pendente', p_expires_at
  ) RETURNING * INTO v_tx;

  UPDATE public.store_clients
    SET pontos = v_novo_pontos, nivel = v_novo_nivel
    WHERE id = v_link.id;

  RETURN v_tx;
END;
$$;

CREATE OR REPLACE FUNCTION public.resgatar_cashback_atomico(
  p_store_id uuid,
  p_user_id uuid,
  p_valor numeric,
  p_voucher_code text,
  p_expires_at timestamptz
) RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link public.store_clients%ROWTYPE;
  v_tx public.transactions%ROWTYPE;
  v_novo_saldo numeric;
BEGIN
  IF p_valor <= 0 THEN
    RAISE EXCEPTION 'Valor de cashback inválido.';
  END IF;

  SELECT * INTO v_link FROM public.store_clients
    WHERE store_id = p_store_id AND user_id = p_user_id
    FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cliente não vinculado à loja.';
  END IF;

  IF v_link.cashback_saldo < p_valor THEN
    RAISE EXCEPTION 'Cashback insuficiente. Solicitado: %. Saldo: %.',
      p_valor, v_link.cashback_saldo;
  END IF;

  v_novo_saldo := round((v_link.cashback_saldo - p_valor)::numeric, 2);

  INSERT INTO public.transactions (
    store_id, client_user_id, tipo, cashback_delta,
    voucher_code, status, voucher_expires_at
  ) VALUES (
    p_store_id, p_user_id, 'resgate_cashback', -p_valor,
    p_voucher_code, 'pendente', p_expires_at
  ) RETURNING * INTO v_tx;

  UPDATE public.store_clients
    SET cashback_saldo = v_novo_saldo
    WHERE id = v_link.id;

  RETURN v_tx;
END;
$$;

REVOKE ALL ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resgatar_produto_atomico(uuid, uuid, uuid, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.resgatar_cashback_atomico(uuid, uuid, numeric, text, timestamptz) TO service_role;
