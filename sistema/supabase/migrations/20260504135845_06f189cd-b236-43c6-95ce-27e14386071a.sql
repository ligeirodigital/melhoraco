CREATE TABLE public.sales_targets (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    target_amount NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(user_id, month, year)
);

-- Enable Row Level Security
ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own sales targets"
ON public.sales_targets
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_sales_targets_updated_at
BEFORE UPDATE ON public.sales_targets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
