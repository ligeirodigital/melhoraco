-- Create landing_pages table
CREATE TYPE public.page_type AS ENUM ('landing', 'linkbio');

CREATE TABLE public.landing_pages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    content JSONB NOT NULL DEFAULT '[]'::jsonb,
    type public.page_type NOT NULL DEFAULT 'landing',
    theme JSONB DEFAULT '{"primaryColor": "#9b87f5", "backgroundColor": "#ffffff", "textColor": "#000000"}'::jsonb,
    is_published BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can manage their own landing pages"
ON public.landing_pages
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can view published landing pages"
ON public.landing_pages
FOR SELECT
USING (is_published = true);

-- Trigger for updated_at
CREATE TRIGGER update_landing_pages_updated_at
BEFORE UPDATE ON public.landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
