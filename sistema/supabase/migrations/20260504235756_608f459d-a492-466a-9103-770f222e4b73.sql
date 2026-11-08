-- Add commission rate to allowed_emails/profiles context if needed, 
-- but for now let's simplify and use a per-user setting or fixed rate for the employee logic.
ALTER TABLE public.allowed_emails ADD COLUMN IF NOT EXISTS commission_rate NUMERIC DEFAULT 0;

-- Table for partner withdrawals (Pró-labore)
CREATE TABLE IF NOT EXISTS public.profit_withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    amount NUMERIC NOT NULL,
    description TEXT,
    withdrawal_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on withdrawals
ALTER TABLE public.profit_withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own withdrawals" ON public.profit_withdrawals
    FOR ALL USING (auth.uid() = user_id);

-- Fix search path for potential new metrics functions
CREATE OR REPLACE FUNCTION public.get_withdrawal_total(p_user_id UUID, p_start_date TIMESTAMP WITH TIME ZONE, p_end_date TIMESTAMP WITH TIME ZONE)
RETURNS NUMERIC AS $$
DECLARE
    v_total NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0) INTO v_total
    FROM public.profit_withdrawals
    WHERE user_id = p_user_id 
      AND withdrawal_date >= p_start_date 
      AND withdrawal_date <= p_end_date;
    RETURN v_total;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
