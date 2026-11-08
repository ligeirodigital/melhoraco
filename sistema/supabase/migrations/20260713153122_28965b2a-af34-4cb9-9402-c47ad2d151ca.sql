
CREATE OR REPLACE FUNCTION public.update_public_quote_items(
  p_quote_id uuid,
  p_token text,
  p_items jsonb
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
  v_owner uuid;
  v_pay_status text;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty int;
  v_count int := 0;
BEGIN
  BEGIN v_token := p_token::uuid; EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_token');
  END;

  SELECT user_id, payment_status INTO v_owner, v_pay_status
  FROM public.quotes
  WHERE id = p_quote_id AND client_view_token = v_token;

  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF v_pay_status = 'paid' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_paid');
  END IF;

  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_cart');
  END IF;

  DELETE FROM public.quote_items WHERE quote_id = p_quote_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, 1));
    SELECT * INTO v_product FROM public.products
      WHERE id = (v_item->>'product_id')::uuid
        AND user_id = v_owner
        AND COALESCE(hidden, false) = false;
    IF FOUND THEN
      INSERT INTO public.quote_items (quote_id, product_id, quantity, unit_price)
      VALUES (p_quote_id, v_product.id, v_qty, v_product.price);
      v_count := v_count + 1;
    END IF;
  END LOOP;

  UPDATE public.quotes
    SET updated_at = now(),
        payment_status = CASE WHEN payment_status IN ('paid') THEN payment_status ELSE NULL END
    WHERE id = p_quote_id;

  RETURN jsonb_build_object('ok', true, 'items', v_count);
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_public_quote_items(uuid, text, jsonb) TO anon, authenticated;
