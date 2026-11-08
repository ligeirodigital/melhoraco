-- Convert column to UUID if it's text, or just ensure it exists with the right type
ALTER TABLE public.quotes 
ALTER COLUMN client_view_token TYPE UUID USING (client_view_token::uuid),
ALTER COLUMN client_view_token SET DEFAULT gen_random_uuid();

-- Update existing quotes that might not have a token
UPDATE public.quotes SET client_view_token = gen_random_uuid() WHERE client_view_token IS NULL;

-- Function to ensure token is generated on insert
CREATE OR REPLACE FUNCTION public.ensure_quote_client_view_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.client_view_token IS NULL THEN
    NEW.client_view_token := gen_random_uuid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to handle the generation
DROP TRIGGER IF EXISTS tr_ensure_quote_client_view_token ON public.quotes;
CREATE TRIGGER tr_ensure_quote_client_view_token
BEFORE INSERT ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.ensure_quote_client_view_token();
