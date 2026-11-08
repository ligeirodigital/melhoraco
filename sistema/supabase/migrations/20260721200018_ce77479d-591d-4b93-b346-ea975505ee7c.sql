
-- Enriched public catalog listing with rating aggregates
CREATE OR REPLACE FUNCTION public.get_public_store_products()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_result jsonb;
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE role='admin' ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'price', p.price,
    'image_url', p.image_url,
    'category', p.category,
    'stock_quantity', p.stock_quantity,
    'created_at', p.created_at,
    'sort_order', p.sort_order,
    'has_variants', EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id = p.id),
    'rating_avg', COALESCE((
       SELECT ROUND(AVG(cf.rating)::numeric, 1)
       FROM client_feedbacks cf
       JOIN quote_items qi ON qi.quote_id = cf.quote_id
       WHERE qi.product_id = p.id
    ), 0),
    'rating_count', COALESCE((
       SELECT COUNT(DISTINCT cf.id)
       FROM client_feedbacks cf
       JOIN quote_items qi ON qi.quote_id = cf.quote_id
       WHERE qi.product_id = p.id
    ), 0),
    'sales_count', COALESCE((
       SELECT COALESCE(SUM(qi.quantity),0)
       FROM quote_items qi
       JOIN quotes q ON q.id = qi.quote_id
       WHERE qi.product_id = p.id AND q.status = 'aprovado'
    ), 0)
  ) ORDER BY p.sort_order NULLS LAST, p.created_at DESC), '[]'::jsonb)
  INTO v_result
  FROM public.products p
  WHERE p.user_id = v_owner AND COALESCE(p.hidden,false) = false;

  RETURN v_result;
END;
$$;

-- Single product detail (with variants, reviews, related)
CREATE OR REPLACE FUNCTION public.get_public_store_product(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_product jsonb;
  v_variants jsonb;
  v_reviews jsonb;
  v_related jsonb;
  v_cat text;
BEGIN
  SELECT id INTO v_owner FROM public.profiles WHERE role='admin' ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN RETURN NULL; END IF;

  SELECT to_jsonb(x), x.category INTO v_product, v_cat FROM (
    SELECT id, name, description, price, image_url, category, stock_quantity, sku, created_at
    FROM products WHERE id = p_id AND user_id = v_owner AND COALESCE(hidden,false)=false
  ) x;
  IF v_product IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', v.id, 'name', v.name, 'sku', v.sku,
    'price_adjustment', COALESCE(v.price_adjustment,0),
    'stock_quantity', v.stock_quantity
  ) ORDER BY v.name), '[]'::jsonb)
  INTO v_variants FROM product_variants v WHERE v.product_id = p_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'rating', cf.rating, 'comment', cf.comment,
    'photo', cf.project_photo_url, 'created_at', cf.created_at,
    'client_name', COALESCE(c.name, 'Cliente')
  ) ORDER BY cf.created_at DESC), '[]'::jsonb)
  INTO v_reviews
  FROM client_feedbacks cf
  JOIN quote_items qi ON qi.quote_id = cf.quote_id
  JOIN quotes q ON q.id = cf.quote_id
  LEFT JOIN clients c ON c.id = q.client_id
  WHERE qi.product_id = p_id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'price', p.price, 'image_url', p.image_url,
    'category', p.category
  )), '[]'::jsonb)
  INTO v_related FROM (
    SELECT * FROM products
    WHERE user_id = v_owner AND COALESCE(hidden,false)=false AND id <> p_id
      AND (v_cat IS NULL OR category = v_cat)
    ORDER BY sort_order NULLS LAST, created_at DESC LIMIT 4
  ) p;

  RETURN v_product
    || jsonb_build_object('variants', v_variants, 'reviews', v_reviews, 'related', v_related);
END;
$$;

-- Extended create_public_order: variant per item, coupon, shipping
CREATE OR REPLACE FUNCTION public.create_public_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_customer jsonb := payload->'customer';
  v_items jsonb := payload->'items';
  v_name text := NULLIF(trim(v_customer->>'name'), '');
  v_phone text := NULLIF(trim(v_customer->>'phone'), '');
  v_coupon text := NULLIF(trim(payload->>'coupon_code'), '');
  v_shipping numeric := GREATEST(0, COALESCE((payload->>'shipping_fee')::numeric, 0));
  v_client_id uuid;
  v_quote_id uuid;
  v_item jsonb;
  v_product public.products%ROWTYPE;
  v_variant public.product_variants%ROWTYPE;
  v_qty int;
  v_unit numeric;
  v_referral public.referrals%ROWTYPE;
  v_discount_pct numeric := 0;
BEGIN
  IF v_name IS NULL OR v_phone IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'missing_customer');
  END IF;
  IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty_cart');
  END IF;

  SELECT id INTO v_owner FROM public.profiles WHERE role='admin' ORDER BY created_at ASC LIMIT 1;
  IF v_owner IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_store_owner'); END IF;

  IF v_coupon IS NOT NULL THEN
    SELECT * INTO v_referral FROM public.referrals
     WHERE referral_code = v_coupon AND status = 'ativo'
     LIMIT 1;
    IF FOUND THEN v_discount_pct := COALESCE(v_referral.discount_pct, 0); END IF;
  END IF;

  SELECT id INTO v_client_id FROM public.clients
   WHERE user_id = v_owner AND phone = v_phone LIMIT 1;

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

  INSERT INTO public.quotes (user_id, client_id, status, deadline, notes, source,
                             delivery_fee, referral_code, discount_type, discount_amount)
  VALUES (v_owner, v_client_id, 'pendente',
          (now() + interval '7 days')::date,
          NULLIF(v_customer->>'notes',''),
          'store',
          v_shipping,
          v_coupon,
          CASE WHEN v_discount_pct > 0 THEN 'percent' ELSE NULL END,
          CASE WHEN v_discount_pct > 0 THEN v_discount_pct ELSE 0 END)
  RETURNING id INTO v_quote_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(v_items) LOOP
    v_qty := GREATEST(1, COALESCE((v_item->>'quantity')::int, 1));
    SELECT * INTO v_product FROM public.products
     WHERE id = (v_item->>'product_id')::uuid AND user_id = v_owner AND COALESCE(hidden,false)=false;
    IF FOUND THEN
      v_unit := v_product.price;
      v_variant := NULL;
      IF (v_item ? 'variant_id') AND NULLIF(v_item->>'variant_id','') IS NOT NULL THEN
        SELECT * INTO v_variant FROM public.product_variants
         WHERE id = (v_item->>'variant_id')::uuid AND product_id = v_product.id;
        IF FOUND THEN v_unit := v_product.price + COALESCE(v_variant.price_adjustment, 0); END IF;
      END IF;
      INSERT INTO public.quote_items (quote_id, product_id, variant_id, quantity, unit_price, product_name)
      VALUES (v_quote_id, v_product.id, CASE WHEN v_variant.id IS NOT NULL THEN v_variant.id ELSE NULL END,
              v_qty, v_unit,
              v_product.name || CASE WHEN v_variant.name IS NOT NULL THEN ' — ' || v_variant.name ELSE '' END);
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'quote_id', v_quote_id,
    'token', (SELECT client_view_token FROM public.quotes WHERE id = v_quote_id),
    'discount_pct', v_discount_pct
  );
END;
$$;
