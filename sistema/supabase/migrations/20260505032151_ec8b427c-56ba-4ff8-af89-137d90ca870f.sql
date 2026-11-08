-- 1. Create table for client feedback (NPS)
CREATE TABLE IF NOT EXISTS public.client_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 10),
    comment TEXT,
    project_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add post-sale tracking to quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS delivery_confirmed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS installation_photo_url TEXT;

-- 3. Enable RLS
ALTER TABLE public.client_feedbacks ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Public can insert feedback with valid token" ON public.client_feedbacks
FOR INSERT WITH CHECK (true); -- We'll validate via quote_id/token in the UI

CREATE POLICY "Authenticated users can view feedback" ON public.client_feedbacks
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 5. Index for performance
CREATE INDEX IF NOT EXISTS idx_feedback_quote_id ON public.client_feedbacks(quote_id);
