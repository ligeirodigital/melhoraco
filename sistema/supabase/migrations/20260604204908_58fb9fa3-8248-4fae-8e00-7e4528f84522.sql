ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS down_payment NUMERIC DEFAULT 0;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS remaining_balance NUMERIC DEFAULT 0;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
