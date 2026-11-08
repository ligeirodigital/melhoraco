
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual';
CREATE INDEX IF NOT EXISTS quotes_source_idx ON public.quotes(source);

CREATE OR REPLACE FUNCTION public.create_public_order(payload jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  INSERT INTO public.quotes (user_id, client_id, status, deadline, notes, source)
  VALUES (v_owner, v_client_id, 'pendente',
          (now() + interval '7 days')::date,
          NULLIF(v_customer->>'notes',''),
          'store')
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
$function$;
