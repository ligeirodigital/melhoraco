
-- =========================================================
-- 1. Helper: is_admin() — SECURITY DEFINER, search_path fixo
-- =========================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- =========================================================
-- 2. QUOTES + QUOTE_ITEMS — remove leitura anônima ampla
-- =========================================================
DROP POLICY IF EXISTS "Anyone can view quotes with token" ON public.quotes;
DROP POLICY IF EXISTS "Quote items viewable via quote token" ON public.quote_items;

-- Owners keep their existing ALL policy ("Users manage own quotes" / "Users manage own quote items"). 
-- Public access now only via SECURITY DEFINER RPCs below.

-- get_public_quote(p_slug text) — anon-callable
-- Accepts slug formats: "q_<id>_<token>", "q_<id>" (legacy), or "<order_token>"
CREATE OR REPLACE FUNCTION public.get_public_quote(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote jsonb;
  v_quote_id uuid;
  v_token text;
  v_parts text[];
BEGIN
  IF p_slug IS NULL OR length(p_slug) = 0 THEN RETURN NULL; END IF;

  IF position('q_' in p_slug) = 1 THEN
    v_parts := string_to_array(p_slug, '_');
    IF array_length(v_parts, 1) >= 2 THEN
      BEGIN v_quote_id := v_parts[2]::uuid; EXCEPTION WHEN OTHERS THEN RETURN NULL; END;
    END IF;
    IF array_length(v_parts, 1) >= 3 THEN v_token := v_parts[3]; END IF;

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
    -- short link via order_token
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
$$;
REVOKE EXECUTE ON FUNCTION public.get_public_quote(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quote(text) TO anon, authenticated;

-- approve_public_quote — anon writes signature/payment proof gated by token
CREATE OR REPLACE FUNCTION public.approve_public_quote(
  p_quote_id uuid,
  p_token text,
  p_signature_url text DEFAULT NULL,
  p_payment_proof_url text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_ok boolean;
BEGIN
  IF p_quote_id IS NULL OR p_token IS NULL THEN RETURN false; END IF;
  UPDATE public.quotes
     SET customer_signature_url = COALESCE(p_signature_url, customer_signature_url),
         payment_proof_url      = COALESCE(p_payment_proof_url, payment_proof_url),
         signed_at              = CASE WHEN p_signature_url IS NOT NULL THEN now() ELSE signed_at END,
         status                 = CASE WHEN p_signature_url IS NOT NULL THEN 'aprovado' ELSE status END,
         updated_at             = now()
   WHERE id = p_quote_id AND client_view_token = p_token;
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  RETURN v_ok;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.approve_public_quote(uuid,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.approve_public_quote(uuid,text,text,text) TO anon, authenticated;

-- save_public_feedback — anon insert gated by token
CREATE OR REPLACE FUNCTION public.save_public_feedback(
  p_quote_id uuid,
  p_token text,
  p_rating int,
  p_comment text DEFAULT NULL,
  p_project_photo_url text DEFAULT NULL
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM quotes WHERE id = p_quote_id AND client_view_token = p_token)
    INTO v_exists;
  IF NOT v_exists THEN RETURN false; END IF;
  INSERT INTO public.client_feedbacks (quote_id, rating, comment, project_photo_url)
  VALUES (p_quote_id, p_rating, p_comment, p_project_photo_url);
  RETURN true;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.save_public_feedback(uuid,text,int,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_public_feedback(uuid,text,int,text,text) TO anon, authenticated;

-- =========================================================
-- 3. APP_SECRETS — admin only
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view app secrets" ON public.app_secrets;
CREATE POLICY "Admins manage app secrets" ON public.app_secrets
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 4. ALLOWED_EMAILS — admin only (já existe policy admin, remover ampla)
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view allowed emails" ON public.allowed_emails;

-- =========================================================
-- 5. PROFILES — apenas próprio perfil (admin via is_admin)
-- =========================================================
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users" ON public.profiles;
-- mantém "Users can view their own profile" e "Users can update their own profile"
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.is_admin());

-- =========================================================
-- 6. INTERACTIONS / INVENTORY_LOGS — remover policies amplas
-- =========================================================
DROP POLICY IF EXISTS "Acesso total às interações para autenticados" ON public.interactions;
DROP POLICY IF EXISTS "Acesso total aos logs de estoque para autenticados" ON public.inventory_logs;

-- =========================================================
-- 7. QUIZ_LEADS — só dono da landing page (ou admin)
-- =========================================================
DROP POLICY IF EXISTS "Authenticated users can view quiz leads" ON public.quiz_leads;
CREATE POLICY "Owners can view their quiz leads" ON public.quiz_leads
  FOR SELECT TO authenticated
  USING (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public.landing_pages lp
      WHERE lp.id = quiz_leads.landing_page_id AND lp.user_id = auth.uid()
    )
  );

-- =========================================================
-- 8. INVESTORS / INVESTOR_TRANSACTIONS — admin only
-- =========================================================
DROP POLICY IF EXISTS "Users can manage investors" ON public.investors;
DROP POLICY IF EXISTS "Users can manage investor transactions" ON public.investor_transactions;
CREATE POLICY "Admins manage investors" ON public.investors
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "Admins manage investor transactions" ON public.investor_transactions
  FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- =========================================================
-- 9. STORAGE customer_assets — upload anônimo só em pasta de quote válida
-- =========================================================
DROP POLICY IF EXISTS "Clientes podem fazer upload de assinaturas e comprovantes" ON storage.objects;
CREATE POLICY "Upload customer_assets gated by valid quote folder"
  ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'customer_assets'
    AND (storage.foldername(name))[1] IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id::text = (storage.foldername(name))[1]
    )
  );
