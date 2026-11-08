
DROP FUNCTION IF EXISTS public.approve_public_quote(uuid, text, text, text);

CREATE OR REPLACE FUNCTION public.approve_public_quote(
  p_quote_id uuid,
  p_token text,
  p_signature_url text DEFAULT NULL,
  p_receipt_url text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok int;
BEGIN
  IF p_quote_id IS NULL OR p_token IS NULL THEN RETURN false; END IF;
  UPDATE public.quotes
     SET customer_signature_url = COALESCE(p_signature_url, customer_signature_url),
         payment_receipt_url    = COALESCE(p_receipt_url, payment_receipt_url),
         signed_at              = CASE WHEN p_signature_url IS NOT NULL THEN now() ELSE signed_at END,
         status                 = CASE WHEN p_signature_url IS NOT NULL THEN 'aprovado' ELSE status END,
         updated_at             = now()
   WHERE id = p_quote_id AND client_view_token = p_token;
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok > 0;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.approve_public_quote(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_public_quote(uuid,text,text,text) TO anon, authenticated;
