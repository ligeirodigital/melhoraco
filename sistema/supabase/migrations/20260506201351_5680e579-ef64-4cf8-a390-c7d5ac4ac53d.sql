-- Create financial categories table
CREATE TABLE public.financial_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own categories" 
ON public.financial_categories 
USING (auth.uid() = user_id);

-- Update cash_flow_transactions to support editing and better filtering
ALTER TABLE public.cash_flow_transactions 
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.financial_categories(id) ON DELETE SET NULL;

-- Insert default categories for existing users or new ones
-- This can be done via application logic too, but let's provide a few defaults
