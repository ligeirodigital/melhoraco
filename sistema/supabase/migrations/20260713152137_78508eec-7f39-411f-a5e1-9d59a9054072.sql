
-- Public store: list visible products from the admin owner
CREATE OR REPLACE FUNCTION public.get_public_store_products()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'price', p.price,
    'image_url', p.image_url,
    'category', p.category,
    'stock_quantity', p.stock_quantity
  ) ORDER BY p.sort_order NULLS LAST, p.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM public.products p
  WHERE p.user_id = v_owner
    AND COALESCE(p.hidden, false) = false;

  RETURN v_result;
END;
$$;

-- Create a public order (quote) from a customer-built cart
CREATE OR REPLACE FUNCTION public.create_public_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_customer jsonb := payload->'customer';
  v_items jsonb := payload->'items';
  v_name text := NULLIF(trim(v_customer->>'name'), '');
  v_phone text := NULLIF(trim(v_customer->>'phone'), '');
  v_client_id uuid;
  v_quote_id uuid;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_qty int;
  v_full_address text;
BEGIN
  IF v_name IS NULL OR v_phone IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_customer');
  END IF;
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_cart');
  END IF;

  SELECT id INTO v_owner FROM public.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_store_owner');
  END IF;

  v_full_address := trim(concat_ws(', ',
    NULLIF(v_customer->>'address',''),
    NULLIF(v_customer->>'address_number',''),
    NULLIF(v_customer->>'address_complement','')
  ));

  -- Reuse existing client by phone or create new
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE user_id = v_owner AND phone = v_phone
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, address, address_number, address_complement, cep)
    VALUES (v_owner, v_name, v_phone,
            NULLIF(v_customer->>'address',''),
            NULLIF(v_customer->>'address_number',''),
            NULLIF(v_customer->>'address_complement',''),
            NULLIF(v_customer->>'cep',''))
    RETURNING id INTO v_client_id;
  ELSE
    UPDATE public.clients SET
      name = v_name,
      address = COALESCE(NULLIF(v_customer->>'address',''), address),
      address_number = COALESCE(NULLIF(v_customer->>'address_number',''), address_number),
      address_complement = COALESCE(NULLIF(v_customer->>'address_complement',''), address_complement),
      cep = COALESCE(NULLIF(v_customer->>'cep',''), cep)
    WHERE id = v_client_id;
  END IF;

  INSERT INTO public.quotes (user_id, client_id, status, deadline, notes)
  VALUES (v_owner, v_client_id, 'pendente',
          (now() + interval '7 days')::date,
          NULLIF(v_customer->>'notes',''))
  RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, 1));
    SELECT * INTO v_product FROM public.products
     WHERE id = (v_item->>'product_id')::uuid AND user_id = v_owner AND COALESCE(hidden,false) = false;
    IF FOUND THEN
      INSERT INTO public.quote_items (quote_id, product_id, quantity, unit_price)
      VALUES (v_quote_id, v_product.id, v_qty, v_product.price);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'quote_id', v_quote_id,
    'token', (SELECT client_view_token FROM public.quotes WHERE id = v_quote_id)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_store_products() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_order(jsonb) TO anon, authenticated;
