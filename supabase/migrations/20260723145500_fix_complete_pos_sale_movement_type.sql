-- Fix complete_pos_sale RPC to use correct Postgres enum 'venda' instead of invalid 'saida'
-- and support shipping_amount / freight_amount in the payload.

CREATE OR REPLACE FUNCTION public.complete_pos_sale(_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user uuid := auth.uid();
  _org uuid := public.current_org_id();
  _sale_id uuid;
  _sale_number bigint;
  _client_req uuid;
  _location_id uuid;
  _cash_session_id uuid;
  _client_id uuid;
  _seller_id uuid;
  _order_discount_type text;
  _order_discount_value numeric(12,2);
  _shipping_amount numeric(12,2);
  _item jsonb;
  _payment jsonb;
  _subtotal numeric(12,2) := 0;
  _discount numeric(12,2) := 0;
  _total numeric(12,2) := 0;
  _unit_price numeric(12,2);
  _qty numeric(12,4);
  _item_total numeric(12,2);
BEGIN
  IF _user IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado.'; END IF;
  IF _org IS NULL THEN RAISE EXCEPTION 'Organização não encontrada.'; END IF;

  _client_req := NULLIF(_payload->>'client_request_id', '')::uuid;
  _location_id := NULLIF(_payload->>'location_id', '')::uuid;
  _cash_session_id := NULLIF(_payload->>'cash_session_id', '')::uuid;
  _client_id := NULLIF(_payload->>'client_id', '')::uuid;
  _seller_id := NULLIF(_payload->>'seller_id', '')::uuid;
  _order_discount_type := NULLIF(_payload->>'order_discount_type', '');
  _order_discount_value := COALESCE((_payload->>'order_discount_value')::numeric, 0);
  _shipping_amount := COALESCE((_payload->>'shipping_amount')::numeric, COALESCE((_payload->>'freight_amount')::numeric, 0));

  IF _location_id IS NULL THEN RAISE EXCEPTION 'Local de estoque não informado.'; END IF;

  -- Idempotência por client_request_id
  IF _client_req IS NOT NULL THEN
    SELECT id, sale_number INTO _sale_id, _sale_number FROM public.sales
     WHERE organization_id = _org AND client_request_id = _client_req;
    IF FOUND THEN
      RETURN jsonb_build_object('sale_id', _sale_id, 'sale_number', _sale_number, 'idempotent', true);
    END IF;
  END IF;

  -- Calcular subtotal
  FOR _item IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'items', '[]'::jsonb)) LOOP
    _qty := (_item->>'quantity')::numeric;
    _unit_price := (_item->>'unit_price')::numeric;
    _subtotal := _subtotal + (_qty * _unit_price);
  END LOOP;

  IF _order_discount_type = 'percent' THEN
    _discount := LEAST(_subtotal * _order_discount_value / 100, _subtotal);
  ELSIF _order_discount_type = 'value' THEN
    _discount := LEAST(_order_discount_value, _subtotal);
  END IF;

  _total := GREATEST(_subtotal - _discount + _shipping_amount, 0);

  -- Gerar número incremental da venda
  SELECT COALESCE(MAX(sale_number), 0) + 1 INTO _sale_number
    FROM public.sales WHERE organization_id = _org;

  -- Criar registro de Venda
  INSERT INTO public.sales (
    organization_id, sale_number, location_id, cash_session_id, client_id, seller_id,
    subtotal, discount_amount, shipping_amount, total, status, client_request_id, created_by
  ) VALUES (
    _org, _sale_number, _location_id, _cash_session_id, _client_id, _seller_id,
    _subtotal, _discount, _shipping_amount, _total, 'completed', _client_req, _user
  ) RETURNING id INTO _sale_id;

  -- Inserir Itens + Atualizar Saldo e Inserir Movimentação de Estoque
  FOR _item IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'items', '[]'::jsonb)) LOOP
    _qty := (_item->>'quantity')::numeric;
    _unit_price := (_item->>'unit_price')::numeric;
    _item_total := _qty * _unit_price;

    INSERT INTO public.sale_items (
      organization_id, sale_id, variant_id, quantity, unit_price, total_price
    ) VALUES (
      _org, _sale_id, (_item->>'variant_id')::uuid, _qty, _unit_price, _item_total
    );

    -- Baixar estoque físico
    INSERT INTO public.inventory_balances (
      organization_id, location_id, variant_id, physical_quantity
    ) VALUES (
      _org, _location_id, (_item->>'variant_id')::uuid, -_qty
    )
    ON CONFLICT (location_id, variant_id) DO UPDATE
      SET physical_quantity = public.inventory_balances.physical_quantity - EXCLUDED.physical_quantity,
          updated_at = now();

    -- Registrar movimentação com o Enum correto 'venda'
    INSERT INTO public.stock_movements (
      organization_id, location_id, variant_id, movement_type, quantity,
      reference_id, reference_type, created_by
    ) VALUES (
      _org, _location_id, (_item->>'variant_id')::uuid, 'venda'::public.movement_type, -_qty,
      _sale_id, 'sale', _user
    );
  END LOOP;

  -- Inserir Pagamentos e Movimentações Financeiras de Caixa
  FOR _payment IN SELECT * FROM jsonb_array_elements(COALESCE(_payload->'payments', '[]'::jsonb)) LOOP
    INSERT INTO public.sale_payments (
      organization_id, sale_id, payment_method, amount, installments, reference, status
    ) VALUES (
      _org, _sale_id, _payment->>'payment_method', (_payment->>'amount')::numeric,
      COALESCE((_payment->>'installments')::integer, 1), NULLIF(_payment->>'reference', ''), 'approved'
    );

    IF _cash_session_id IS NOT NULL THEN
      INSERT INTO public.cash_movements (
        organization_id, cash_session_id, sale_id, user_id, type, amount, payment_method, reason
      ) VALUES (
        _org, _cash_session_id, _sale_id, _user, 'sale', (_payment->>'amount')::numeric,
        _payment->>'payment_method', 'Venda #' || _sale_number
      );
    END IF;
  END LOOP;

  RETURN jsonb_build_object('sale_id', _sale_id, 'sale_number', _sale_number, 'idempotent', false);
END;
$$;

GRANT EXECUTE ON FUNCTION public.complete_pos_sale(jsonb) TO authenticated, service_role;
