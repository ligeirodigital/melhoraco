-- 1. Fix app_secrets RLS
GRANT SELECT ON public.app_secrets TO authenticated;
GRANT ALL ON public.app_secrets TO service_role;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'app_secrets' AND policyname = 'Authenticated users can view app secrets') THEN
        CREATE POLICY "Authenticated users can view app secrets"
        ON public.app_secrets
        FOR SELECT
        USING (auth.uid() IS NOT NULL);
    END IF;
END $$;

-- 2. Fix functions search_path and execution rights
-- increment_product_stock had no search_path
ALTER FUNCTION public.increment_product_stock(uuid, integer) SET search_path = public;

-- Revoke public execution for SECURITY DEFINER functions with correct signatures
REVOKE EXECUTE ON FUNCTION public.get_withdrawal_total(uuid, timestamp with time zone, timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_withdrawal_total(uuid, timestamp with time zone, timestamp with time zone) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_withdrawal_total(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_follow_up(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_follow_up(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_follow_up(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.seed_default_products(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.seed_default_products(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.seed_default_products(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_dre_metrics(uuid, timestamp with time zone, timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_dre_metrics(uuid, timestamp with time zone, timestamp with time zone) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_dre_metrics(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, uuid, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, uuid, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, uuid, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.log_activity(text, text, text, jsonb) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

REVOKE EXECUTE ON FUNCTION public.ensure_quote_client_view_token() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_quote_client_view_token() FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_quote_client_view_token() TO authenticated;

-- 3. Move extension to extensions schema
CREATE SCHEMA IF NOT EXISTS extensions;
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm' AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        ALTER EXTENSION pg_trgm SET SCHEMA extensions;
    END IF;
END $$;

-- 4. Harden permissive RLS policies
-- allowed_emails
DROP POLICY IF EXISTS "Allowed emails are readable by everyone" ON public.allowed_emails;
DROP POLICY IF EXISTS "Authenticated users can read allowed_emails" ON public.allowed_emails;
DROP POLICY IF EXISTS "Authenticated users can view allowed emails" ON public.allowed_emails;

CREATE POLICY "Authenticated users can view allowed emails"
ON public.allowed_emails
FOR SELECT
USING (auth.role() = 'authenticated');

-- inventory
DROP POLICY IF EXISTS "Acesso total ao estoque para autenticados" ON public.inventory;

-- profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');

-- quote_items
DROP POLICY IF EXISTS "Authenticated users manage items" ON public.quote_items;

-- 5. Harden permissive INSERT policies
-- client_feedbacks
DROP POLICY IF EXISTS "Public can insert feedback with valid token" ON public.client_feedbacks;
CREATE POLICY "Authenticated users can insert feedback"
ON public.client_feedbacks
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- quiz_leads
DROP POLICY IF EXISTS "Anyone can insert quiz leads" ON public.quiz_leads;
CREATE POLICY "Authenticated users can insert quiz leads"
ON public.quiz_leads
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- whatsapp_clicks
DROP POLICY IF EXISTS "Anyone can insert whatsapp clicks" ON public.whatsapp_clicks;
CREATE POLICY "Authenticated users can insert whatsapp clicks"
ON public.whatsapp_clicks
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 6. Storage hardening
-- Restrict business-assets to owner
DROP POLICY IF EXISTS "Anyone can view business assets" ON storage.objects;
DROP POLICY IF EXISTS "Business assets are public" ON storage.objects;

CREATE POLICY "Users can view own business assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- customer_assets
DROP POLICY IF EXISTS "Arquivos de clientes são públicos para leitura" ON storage.objects;
CREATE POLICY "Users can view own customer assets"
ON storage.objects
FOR SELECT
USING (bucket_id = 'customer_assets' AND (storage.foldername(name))[1] = auth.uid()::text);

-- lp_images
DROP POLICY IF EXISTS "LP images are public" ON storage.objects;
CREATE POLICY "Authenticated users can view LP images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lp_images' AND auth.role() = 'authenticated');
