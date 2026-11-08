-- Create profit withdrawals table
CREATE TABLE public.profit_withdrawals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    partner_name TEXT NOT NULL CHECK (partner_name IN ('Caixa', 'Thales', 'Thiago')),
    amount NUMERIC NOT NULL,
    withdrawal_date DATE NOT NULL DEFAULT CURRENT_DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profit_withdrawals ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own profit withdrawals" 
ON public.profit_withdrawals FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profit withdrawals" 
ON public.profit_withdrawals FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profit withdrawals" 
ON public.profit_withdrawals FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profit withdrawals" 
ON public.profit_withdrawals FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_profit_withdrawals_updated_at
BEFORE UPDATE ON public.profit_withdrawals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add is_fixed column to direct_expenses
ALTER TABLE public.direct_expenses 
ADD COLUMN is_fixed BOOLEAN DEFAULT false;
