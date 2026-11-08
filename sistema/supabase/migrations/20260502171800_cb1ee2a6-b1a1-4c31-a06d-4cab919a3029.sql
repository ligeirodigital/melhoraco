-- Add checkout and pricing columns to landing_pages
ALTER TABLE public.landing_pages 
ADD COLUMN IF NOT EXISTS checkout_settings JSONB DEFAULT '{"provider": "none", "mercadopago": {}, "infinitepay": {}, "nubank": {}}'::jsonb,
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS product_name TEXT;

-- Update type definition for better visibility
COMMENT ON COLUMN public.landing_pages.checkout_settings IS 'Stores payment provider settings (Mercado Pago, InfinitePay, Nubank)';
