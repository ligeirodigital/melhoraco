
-- 1. Fix products public exposure (remove public SELECT)
DROP POLICY IF EXISTS "Public can view products for quotes" ON public.products;

-- 2. Fix client_feedbacks: only quote owner can read
DROP POLICY IF EXISTS "Authenticated users can view feedback" ON public.client_feedbacks;
CREATE POLICY "Quote owner can view feedback"
  ON public.client_feedbacks FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.quotes q
    WHERE q.id = client_feedbacks.quote_id AND q.user_id = auth.uid()
  ));

-- 3. Fix whatsapp_clicks: admins only for read; allow anon inserts (landing pages)
DROP POLICY IF EXISTS "Admins can view whatsapp clicks" ON public.whatsapp_clicks;
CREATE POLICY "Admins can view whatsapp clicks"
  ON public.whatsapp_clicks FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Authenticated users can insert whatsapp clicks" ON public.whatsapp_clicks;
CREATE POLICY "Anyone can insert whatsapp clicks"
  ON public.whatsapp_clicks FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
GRANT INSERT ON public.whatsapp_clicks TO anon;

-- 4. Fix quiz_leads: allow anon inserts (public quiz visitors)
DROP POLICY IF EXISTS "Authenticated users can insert quiz leads" ON public.quiz_leads;
CREATE POLICY "Anyone can insert quiz leads"
  ON public.quiz_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
GRANT INSERT ON public.quiz_leads TO anon;

-- 5. customer_assets storage: fix ownership-based SELECT via quote join
DROP POLICY IF EXISTS "Users can view own customer assets" ON storage.objects;
CREATE POLICY "Quote owners can view own customer assets"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'customer_assets'
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE (q.id)::text = (storage.foldername(name))[1]
        AND q.user_id = auth.uid()
    )
  );

-- 6. Function search_path: fix increment_variant_stock
CREATE OR REPLACE FUNCTION public.increment_variant_stock(p_variant_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.product_variants
  SET stock_quantity = COALESCE(stock_quantity, 0) + p_amount
  WHERE id = p_variant_id;
END;
$function$;

-- 7. Revoke EXECUTE on SECURITY DEFINER helpers that shouldn't be callable by clients
-- Trigger functions: not meant to be called directly
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_quote_client_view_token() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_allowed_emails_normalization() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, PUBLIC;

-- Admin/internal helpers: not for client calls
REVOKE EXECUTE ON FUNCTION public.is_allowed_user(text) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_products(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_variant_stock(uuid, integer) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) FROM anon, authenticated, PUBLIC;

-- Keep anon EXECUTE only on truly public entrypoints:
--   get_public_quote, save_public_feedback, approve_public_quote
-- Revoke anon on the rest of the SECURITY DEFINER surface
REVOKE EXECUTE ON FUNCTION public.get_dre_metrics(uuid, timestamptz, timestamptz) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_withdrawal_total(uuid, timestamptz, timestamptz) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, uuid, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_follow_up(uuid) FROM anon, PUBLIC;
