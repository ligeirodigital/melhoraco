ALTER TABLE public.cash_flow_transactions ADD COLUMN IF NOT EXISTS payment_method TEXT;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_transactions TO authenticated;
GRANT ALL ON public.cash_flow_transactions TO service_role;
