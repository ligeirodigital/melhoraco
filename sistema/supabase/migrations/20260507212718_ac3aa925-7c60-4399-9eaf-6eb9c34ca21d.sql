-- Create landing pages table
DROP TABLE IF EXISTS public.landing_pages;

CREATE TABLE public.landing_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    headline TEXT NOT NULL,
    subheadline TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    whatsapp_number TEXT NOT NULL,
    hero_image_url TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    testimonials JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Create storage bucket for LP images if it doesn't exist
-- Note: Usually buckets are created via API or SQL in some environments
-- We'll try to insert and ignore conflict
INSERT INTO storage.buckets (id, name, public) 
VALUES ('lp_images', 'lp_images', true)
ON CONFLICT (id) DO NOTHING;

-- Policies for landing_pages
CREATE POLICY "Users can view any active landing page" ON public.landing_pages
    FOR SELECT USING (is_active = true);

CREATE POLICY "Users can manage their own landing pages" ON public.landing_pages
    FOR ALL USING (auth.uid() = user_id);

-- Storage policies
CREATE POLICY "LP images are public" ON storage.objects
    FOR SELECT USING (bucket_id = 'lp_images');

CREATE POLICY "Users can upload LP images" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'lp_images' AND auth.uid() IS NOT NULL);

-- Create function to update updated_at if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_landing_pages_updated_at ON public.landing_pages;
CREATE TRIGGER update_landing_pages_updated_at
    BEFORE UPDATE ON public.landing_pages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
