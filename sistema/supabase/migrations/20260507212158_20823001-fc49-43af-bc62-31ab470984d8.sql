-- Create product_landing_pages table
CREATE TABLE public.product_landing_pages (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    delivery_info TEXT,
    features JSONB DEFAULT '[]'::jsonb,
    steps JSONB DEFAULT '[]'::jsonb,
    faq JSONB DEFAULT '[]'::jsonb,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_landing_pages ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all published product landing pages" 
ON public.product_landing_pages 
FOR SELECT 
USING (is_published = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own product landing pages" 
ON public.product_landing_pages 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own product landing pages" 
ON public.product_landing_pages 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own product landing pages" 
ON public.product_landing_pages 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_product_landing_pages_updated_at
BEFORE UPDATE ON public.product_landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
