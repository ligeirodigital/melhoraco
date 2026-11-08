-- Fix search_path for the security definer function
ALTER FUNCTION public.is_allowed_user(p_email TEXT) SET search_path = public;

-- Revoke public execution to ensure only authenticated users (or specific roles) can call it if needed,
-- but since it's used during the login flow check, we need to be careful.
-- Actually, the best practice is to set the search path and ensure SECURITY DEFINER is handled correctly.

-- Fix other possible functions mentioned by the linter if I created them earlier
-- Based on the warnings, there are 4-5 other functions that need similar fixes.
-- Let's apply to common project functions:

ALTER FUNCTION public.get_dre_metrics(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) SET search_path = public;
ALTER FUNCTION public.increment_product_stock(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.seed_default_products(UUID) SET search_path = public;
ALTER FUNCTION public.mark_follow_up(UUID) SET search_path = public;

-- Ensure execute is revoked from public for security definer functions where appropriate
REVOKE EXECUTE ON FUNCTION public.is_allowed_user(p_email TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_allowed_user(p_email TEXT) TO authenticated, service_role;
