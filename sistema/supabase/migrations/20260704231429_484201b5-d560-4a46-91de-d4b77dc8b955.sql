
CREATE OR REPLACE FUNCTION public.get_upsell_suggestions(p_quote_id uuid, p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_current_ids uuid[];
  v_result jsonb;
BEGIN
  SELECT user_id INTO v_owner
  FROM public.quotes
  WHERE id = p_quote_id AND client_view_token = p_token;

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

  -- Fallback: if no co-purchase history, show top 3 approved products of the owner not already in the quote
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
$$;

GRANT EXECUTE ON FUNCTION public.get_upsell_suggestions(uuid, text) TO anon, authenticated;
