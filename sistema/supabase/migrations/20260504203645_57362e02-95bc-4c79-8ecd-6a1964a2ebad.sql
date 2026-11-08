-- Security hardening for the new functions

REVOKE EXECUTE ON FUNCTION public.increment_product_stock(UUID, INTEGER) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(UUID, INTEGER) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.seed_default_products(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.seed_default_products(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_follow_up(UUID) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.mark_follow_up(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_dre_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_dre_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated;

-- Set search_path for all functions for extra security
ALTER FUNCTION public.increment_product_stock(UUID, INTEGER) SET search_path = public;
ALTER FUNCTION public.seed_default_products(UUID) SET search_path = public;
ALTER FUNCTION public.mark_follow_up(UUID) SET search_path = public;
ALTER FUNCTION public.get_dre_metrics(UUID, TIMESTAMPTZ, TIMESTAMPTZ) SET search_path = public;
ALTER FUNCTION public.handle_allowed_emails_normalization() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
