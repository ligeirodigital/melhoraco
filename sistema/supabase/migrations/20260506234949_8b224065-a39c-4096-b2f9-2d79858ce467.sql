-- Create product variants table
CREATE TABLE public.product_variants (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    price_adjustment NUMERIC DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    min_stock_level INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

-- Create policies for product variants
CREATE POLICY "Users can view their own product variants" 
ON public.product_variants 
FOR SELECT 
USING (EXISTS (
    SELECT 1 FROM public.products 
    WHERE public.products.id = product_id 
    AND public.products.user_id = auth.uid()
));

CREATE POLICY "Users can create their own product variants" 
ON public.product_variants 
FOR INSERT 
WITH CHECK (EXISTS (
    SELECT 1 FROM public.products 
    WHERE public.products.id = product_id 
    AND public.products.user_id = auth.uid()
));

CREATE POLICY "Users can update their own product variants" 
ON public.product_variants 
FOR UPDATE 
USING (EXISTS (
    SELECT 1 FROM public.products 
    WHERE public.products.id = product_id 
    AND public.products.user_id = auth.uid()
));

CREATE POLICY "Users can delete their own product variants" 
ON public.product_variants 
FOR DELETE 
USING (EXISTS (
    SELECT 1 FROM public.products 
    WHERE public.products.id = product_id 
    AND public.products.user_id = auth.uid()
));

-- Add variant_id to quote_items to track which variant was sold
ALTER TABLE public.quote_items 
ADD COLUMN variant_id UUID REFERENCES public.product_variants(id) ON DELETE SET NULL;

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_variants_updated_at
BEFORE UPDATE ON public.product_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
