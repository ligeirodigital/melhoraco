CREATE TABLE public.quiz_leads (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    quantity INTEGER,
    total_value DECIMAL(10,2),
    first_name TEXT,
    last_name TEXT,
    whatsapp TEXT,
    desired_number TEXT,
    cep TEXT,
    street TEXT,
    number TEXT,
    neighborhood TEXT,
    city TEXT,
    complement TEXT,
    landing_page_id UUID REFERENCES public.landing_pages(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz leads"
ON public.quiz_leads
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated users can view quiz leads"
ON public.quiz_leads
FOR SELECT
TO authenticated
USING (true);
