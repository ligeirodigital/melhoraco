-- Revoke public execute
REVOKE EXECUTE ON FUNCTION public.seed_default_products(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) FROM public;
REVOKE EXECUTE ON FUNCTION public.mark_follow_up(uuid) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_dre_metrics(uuid, timestamp with time zone, timestamp with time zone) FROM public;

-- Grant to authenticated users
GRANT EXECUTE ON FUNCTION public.seed_default_products(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_product_stock(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_follow_up(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dre_metrics(uuid, timestamp with time zone, timestamp with time zone) TO authenticated;
