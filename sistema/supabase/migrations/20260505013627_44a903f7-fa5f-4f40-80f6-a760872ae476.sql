-- Fix search_path for critical functions
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.log_activity(p_action text, p_entity_type text, p_entity_id text, p_details jsonb) SET search_path = public;
ALTER FUNCTION public.log_activity(p_action text, p_entity_type text, p_entity_id uuid, p_details jsonb) SET search_path = public;
ALTER FUNCTION public.get_withdrawal_total(p_user_id uuid, p_start_date timestamptz, p_end_date timestamptz) SET search_path = public;

-- Ensure client_view_token is always set
CREATE OR REPLACE FUNCTION public.ensure_quote_client_view_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_view_token IS NULL THEN
    NEW.client_view_token := encode(gen_random_bytes(16), 'hex');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_ensure_quote_client_view_token ON public.quotes;
CREATE TRIGGER tr_ensure_quote_client_view_token
BEFORE INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.ensure_quote_client_view_token();

-- Robust RLS for public access
DROP POLICY IF EXISTS "Anyone can view quotes with token" ON public.quotes;
CREATE POLICY "Anyone can view quotes with token" 
ON public.quotes 
FOR SELECT 
USING (
  client_view_token IS NOT NULL 
  OR auth.uid() = user_id
);
