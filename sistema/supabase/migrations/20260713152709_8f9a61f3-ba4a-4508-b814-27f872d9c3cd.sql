
CREATE OR REPLACE FUNCTION public.get_public_quote_by_id(p_quote_id uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_token uuid;
  v_result jsonb;
BEGIN
  BEGIN v_token := p_token::uuid; EXCEPTION WHEN OTHERS THEN RETURN NULL; END;

  SELECT to_jsonb(q.*)
    || jsonb_build_object(
      'client', (SELECT to_jsonb(c.*) FROM clients c WHERE c.id = q.client_id),
      'items', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', qi.id,
          'quantity', qi.quantity,
          'unit_price', qi.unit_price,
          'product_id', qi.product_id,
          'product_name', COALESCE((SELECT name FROM products WHERE id = qi.product_id), ''),
          'product', (SELECT to_jsonb(p.*) FROM products p WHERE p.id = qi.product_id)
        ))
        FROM quote_items qi WHERE qi.quote_id = q.id
      ), '[]'::jsonb)
    )
  INTO v_result
  FROM quotes q
  WHERE q.id = p_quote_id AND q.client_view_token = v_token;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_client_orders(p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_phone_digits text;
  v_result jsonb;
BEGIN
  v_phone_digits := regexp_replace(COALESCE(p_phone, ''), '\D', '', 'g');
  IF length(v_phone_digits) < 10 THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT id INTO v_owner FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'created_at') DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', q.id,
      'created_at', q.created_at,
      'status', q.status,
      'payment_status', q.payment_status,
      'order_nsu', q.order_nsu,
      'token', q.client_view_token,
      'client_name', c.name,
      'total', (
        COALESCE((SELECT SUM(unit_price * quantity) FROM quote_items WHERE quote_id = q.id), 0)
        + COALESCE(q.delivery_fee, 0) + COALESCE(q.installation_fee, 0)
        - COALESCE(q.discount_amount, 0)
      ),
      'items_summary', (
        SELECT string_agg(qi.quantity || 'x ' || COALESCE(p.name,''), ', ')
        FROM quote_items qi LEFT JOIN products p ON p.id = qi.product_id
        WHERE qi.quote_id = q.id
      )
    ) AS row
    FROM quotes q
    JOIN clients c ON c.id = q.client_id
    WHERE q.user_id = v_owner
      AND regexp_replace(COALESCE(c.phone,''), '\D', '', 'g') = v_phone_digits
    ORDER BY q.created_at DESC
    LIMIT 50
  ) sub;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_quote_by_id(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_client_orders(text) TO anon, authenticated;
