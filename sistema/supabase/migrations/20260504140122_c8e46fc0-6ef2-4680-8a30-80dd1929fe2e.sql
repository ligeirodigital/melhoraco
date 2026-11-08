-- Update get_dre_metrics
ALTER FUNCTION public.get_dre_metrics(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone) 
SET search_path = public;

-- Update seed_default_products (need to find its exact signature)
-- I'll use a generic approach to find and update
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'seed_default_products') THEN
        EXECUTE 'ALTER FUNCTION public.seed_default_products(p_user_id uuid) SET search_path = public';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_product_stock') THEN
        EXECUTE 'ALTER FUNCTION public.increment_product_stock(p_product_id uuid, p_amount integer) SET search_path = public';
    END IF;
END $$;
