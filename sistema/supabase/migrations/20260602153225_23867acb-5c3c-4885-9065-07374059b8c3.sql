-- Fix remaining search_path issues
ALTER FUNCTION public.get_default_pipeline_stage() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.increment_product_stock(uuid, numeric) SET search_path = public;

-- Revoke public execution on is_allowed_user
REVOKE EXECUTE ON FUNCTION public.is_allowed_user(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_allowed_user(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_allowed_user(text) TO authenticated;

-- Ensure all SECURITY DEFINER functions in public have search_path = public (redundancy check)
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' 
        AND p.prosecdef = true
    LOOP
        EXECUTE format('ALTER FUNCTION %I.%I(%s) SET search_path = public', 
                       func_record.nspname, func_record.proname, func_record.args);
    END LOOP;
END $$;
