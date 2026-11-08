CREATE TABLE public.investors (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    share_percentage DECIMAL(5,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investors TO authenticated;
GRANT ALL ON public.investors TO service_role;
ALTER TABLE public.investors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage investors" ON public.investors FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.investor_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    investor_id UUID NOT NULL REFERENCES public.investors(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal')),
    description TEXT,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_transactions TO authenticated;
GRANT ALL ON public.investor_transactions TO service_role;
ALTER TABLE public.investor_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage investor transactions" ON public.investor_transactions FOR ALL USING (true) WITH CHECK (true);

INSERT INTO public.investors (name, share_percentage) VALUES 
('Thales', 40.00),
('Thiago', 40.00);

-- Note: The user mentioned 40% for each, which leaves 20% elsewhere, but I will stick to what was requested.
