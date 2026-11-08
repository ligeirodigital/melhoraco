ALTER TABLE public.quotes 
ADD COLUMN down_payment_paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN final_payment_paid_at TIMESTAMP WITH TIME ZONE;

-- Grant permissions (standard procedure)
GRANT SELECT, UPDATE ON public.quotes TO authenticated;
GRANT ALL ON public.quotes TO service_role;
