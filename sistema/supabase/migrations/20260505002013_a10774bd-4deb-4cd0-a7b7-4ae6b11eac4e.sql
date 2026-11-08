-- Add columns for delivery type and label metadata
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS delivery_type TEXT DEFAULT 'entrega';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS shipping_label_data JSONB;

-- Comment on columns for clarity
COMMENT ON COLUMN public.quotes.delivery_type IS 'pode ser entrega, correios, ou retirada';
COMMENT ON COLUMN public.quotes.shipping_label_data IS 'armazenar dados especificos para a etiqueta robusta';
