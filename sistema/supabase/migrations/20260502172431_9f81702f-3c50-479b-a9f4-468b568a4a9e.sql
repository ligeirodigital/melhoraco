-- Create direct_expenses table for DRE tracking
CREATE TABLE public.direct_expenses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10,2) NOT NULL DEFAULT 0,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.direct_expenses ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own expenses"
ON public.direct_expenses
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_direct_expenses_updated_at
BEFORE UPDATE ON public.direct_expenses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for date filtering
CREATE INDEX idx_expenses_date ON public.direct_expenses(expense_date);
CREATE INDEX idx_expenses_user_date ON public.direct_expenses(user_id, expense_date);
