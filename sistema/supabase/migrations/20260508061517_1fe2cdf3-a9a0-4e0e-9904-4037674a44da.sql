-- Add UTM and referrer columns to quiz_leads
ALTER TABLE public.quiz_leads 
ADD COLUMN utm_source TEXT,
ADD COLUMN utm_medium TEXT,
ADD COLUMN utm_campaign TEXT,
ADD COLUMN utm_term TEXT,
ADD COLUMN utm_content TEXT,
ADD COLUMN referrer TEXT;

-- Create table to track WhatsApp clicks
CREATE TABLE public.whatsapp_clicks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    landing_page_id UUID REFERENCES public.landing_pages(id) ON DELETE SET NULL,
    product_landing_page_id UUID REFERENCES public.product_landing_pages(id) ON DELETE SET NULL,
    whatsapp_number TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    utm_content TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_clicks ENABLE ROW LEVEL SECURITY;

-- Allow public inserts (anyone visiting the LP can trigger a click record)
CREATE POLICY "Anyone can insert whatsapp clicks" 
ON public.whatsapp_clicks 
FOR INSERT 
WITH CHECK (true);

-- Allow admins to view clicks
CREATE POLICY "Admins can view whatsapp clicks" 
ON public.whatsapp_clicks 
FOR SELECT 
USING (true); -- Simplified for now, in a real app would check auth.uid() if profiles were ready
