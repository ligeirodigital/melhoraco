
CREATE OR REPLACE FUNCTION public.approve_public_quote(p_quote_id uuid, p_token text, p_signature_url text DEFAULT NULL::text, p_receipt_url text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_ok int; v_token uuid;
BEGIN
  IF p_quote_id IS NULL OR p_token IS NULL THEN RETURN false; END IF;
  BEGIN v_token := p_token::uuid; EXCEPTION WHEN OTHERS THEN RETURN false; END;
  UPDATE public.quotes
     SET customer_signature_url = COALESCE(p_signature_url, customer_signature_url),
         payment_receipt_url    = COALESCE(p_receipt_url, payment_receipt_url),
         signed_at              = CASE WHEN p_signature_url IS NOT NULL THEN now() ELSE signed_at END,
         status                 = CASE WHEN p_signature_url IS NOT NULL THEN 'aprovado' ELSE status END,
         updated_at             = now()
   WHERE id = p_quote_id AND client_view_token = v_token;
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok > 0;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_public_feedback(p_quote_id uuid, p_token text, p_rating integer, p_comment text DEFAULT NULL::text, p_project_photo_url text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_exists boolean; v_token uuid;
BEGIN
  BEGIN v_token := p_token::uuid; EXCEPTION WHEN OTHERS THEN RETURN false; END;
  SELECT EXISTS(SELECT 1 FROM quotes WHERE id = p_quote_id AND client_view_token = v_token)
    INTO v_exists;
  IF NOT v_exists THEN RETURN false; END IF;
  INSERT INTO public.client_feedbacks (quote_id, rating, comment, project_photo_url)
  VALUES (p_quote_id, p_rating, p_comment, p_project_photo_url);
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_referral_code(p_quote_id uuid, p_token text, p_code text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quote_ok boolean;
  v_referral public.referrals%ROWTYPE;
  v_client_id uuid;
  v_owner uuid;
  v_token uuid;
BEGIN
  BEGIN v_token := p_token::uuid; EXCEPTION WHEN OTHERS THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_quote'); END;
  SELECT EXISTS(SELECT 1 FROM public.quotes WHERE id = p_quote_id AND client_view_token = v_token)
    INTO v_quote_ok;
  IF NOT v_quote_ok THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_quote');
  END IF;

  SELECT * INTO v_referral FROM public.referrals
   WHERE referral_code = trim(p_code) AND status = 'ativo'
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  SELECT client_id, user_id INTO v_client_id, v_owner FROM public.quotes WHERE id = p_quote_id;

  UPDATE public.referrals
     SET status = 'usado',
         referred_client_id = v_client_id,
         used_quote_id = p_quote_id,
         used_at = now(),
         updated_at = now()
   WHERE id = v_referral.id;

  UPDATE public.quotes
     SET referral_code = trim(p_code),
         discount_type = 'percent',
         discount_amount = GREATEST(COALESCE(discount_amount, 0), COALESCE(v_referral.discount_pct, 0)),
         updated_at = now()
   WHERE id = p_quote_id;

  IF COALESCE(v_referral.reward_amount, 0) > 0 THEN
    INSERT INTO public.cash_flow_transactions
      (user_id, description, amount, type, category, transaction_date, status, quote_id)
    VALUES
      (v_owner,
       'Recompensa indicação ' || v_referral.referral_code,
       v_referral.reward_amount,
       'expense',
       'Indicações',
       now(),
       'pending',
       p_quote_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'reward_amount', v_referral.reward_amount, 'discount_pct', v_referral.discount_pct);
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_upsell_suggestions(p_quote_id uuid, p_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_current_ids uuid[];
  v_result jsonb;
  v_token uuid;
BEGIN
  BEGIN v_token := p_token::uuid; EXCEPTION WHEN OTHERS THEN RETURN '[]'::jsonb; END;

  SELECT user_id INTO v_owner
  FROM public.quotes
  WHERE id = p_quote_id AND client_view_token = v_token;

  IF v_owner IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(array_agg(product_id), ARRAY[]::uuid[])
    INTO v_current_ids
  FROM public.quote_items
  WHERE quote_id = p_quote_id AND product_id IS NOT NULL;

  WITH companion_counts AS (
    SELECT qi2.product_id, COUNT(DISTINCT qi2.quote_id) AS freq
    FROM public.quote_items qi1
    JOIN public.quotes q ON q.id = qi1.quote_id
    JOIN public.quote_items qi2 ON qi2.quote_id = qi1.quote_id
    WHERE q.user_id = v_owner
      AND q.status = 'aprovado'
      AND qi1.product_id = ANY(v_current_ids)
      AND qi2.product_id IS NOT NULL
      AND NOT (qi2.product_id = ANY(v_current_ids))
    GROUP BY qi2.product_id
    ORDER BY freq DESC
    LIMIT 3
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'price', p.price,
    'image_url', p.image_url,
    'description', p.description,
    'freq', cc.freq
  )), '[]'::jsonb)
  INTO v_result
  FROM companion_counts cc
  JOIN public.products p ON p.id = cc.product_id;

  IF v_result = '[]'::jsonb THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'price', p.price,
      'image_url', p.image_url, 'description', p.description, 'freq', 0
    )), '[]'::jsonb)
    INTO v_result
    FROM (
      SELECT p.*
      FROM public.products p
      WHERE p.user_id = v_owner
        AND NOT (p.id = ANY(v_current_ids))
      ORDER BY p.sort_order ASC NULLS LAST, p.created_at DESC
      LIMIT 3
    ) p;
  END IF;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_public_quote(p_slug text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_quote jsonb;
  v_quote_id uuid;
  v_token uuid;
  v_parts text[];
BEGIN
  IF p_slug IS NULL OR length(p_slug) = 0 THEN RETURN NULL; END IF;

  IF position('q_' in p_slug) = 1 THEN
    v_parts := string_to_array(p_slug, '_');
    IF array_length(v_parts, 1) >= 2 THEN
      BEGIN v_quote_id := v_parts[2]::uuid; EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
    END IF;
    IF array_length(v_parts, 1) >= 3 THEN
      BEGIN v_token := v_parts[3]::uuid; EXCEPTION WHEN OTHERS THEN v_token := NULL; END;
    END IF;

    SELECT to_jsonb(q.*)
      || jsonb_build_object(
        'clients',     (SELECT to_jsonb(c.*) FROM clients c WHERE c.id = q.client_id),
        'quote_items', COALESCE((
          SELECT jsonb_agg(to_jsonb(qi.*) || jsonb_build_object(
            'products', (SELECT to_jsonb(p.*) FROM products p WHERE p.id = qi.product_id)
          ))
          FROM quote_items qi WHERE qi.quote_id = q.id
        ), '[]'::jsonb)
      )
    INTO v_quote
    FROM quotes q
    WHERE q.id = v_quote_id
      AND (v_token IS NULL OR q.client_view_token = v_token);
  ELSE
    SELECT to_jsonb(q.*)
      || jsonb_build_object(
        'clients',     (SELECT to_jsonb(c.*) FROM clients c WHERE c.id = q.client_id),
        'quote_items', COALESCE((
          SELECT jsonb_agg(to_jsonb(qi.*) || jsonb_build_object(
            'products', (SELECT to_jsonb(p.*) FROM products p WHERE p.id = qi.product_id)
          ))
          FROM quote_items qi WHERE qi.quote_id = q.id
        ), '[]'::jsonb)
      )
    INTO v_quote
    FROM quotes q
    WHERE q.order_token = p_slug;
  END IF;

  RETURN v_quote;
END;
$function$;
