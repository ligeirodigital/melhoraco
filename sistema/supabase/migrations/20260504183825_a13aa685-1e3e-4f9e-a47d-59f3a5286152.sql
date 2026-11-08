-- Set search_path and security for seed_default_products
ALTER FUNCTION public.seed_default_products(p_user_id uuid) SET search_path = public;

-- Set search_path and security for increment_product_stock
ALTER FUNCTION public.increment_product_stock(p_product_id uuid, p_amount integer) SET search_path = public;

-- Set search_path and security for mark_follow_up
ALTER FUNCTION public.mark_follow_up(p_quote_id uuid) SET search_path = public;

-- Set search_path and security for get_dre_metrics
ALTER FUNCTION public.get_dre_metrics(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) SET search_path = public;

-- Ensure allowed_emails is always lowercased
CREATE OR REPLACE FUNCTION public.handle_allowed_emails_normalization()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = LOWER(TRIM(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_normalize_allowed_email ON public.allowed_emails;
CREATE TRIGGER tr_normalize_allowed_email
BEFORE INSERT OR UPDATE ON public.allowed_emails
FOR EACH ROW
EXECUTE FUNCTION public.handle_allowed_emails_normalization();

-- Normalize existing emails
UPDATE public.allowed_emails SET email = LOWER(TRIM(email));
