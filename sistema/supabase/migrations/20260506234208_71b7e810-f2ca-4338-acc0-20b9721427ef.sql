-- Add product_id to inventory_logs to support product stock movements
ALTER TABLE public.inventory_logs 
ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE CASCADE;

-- Allow inventory_id to be NULL so we can have logs for either inventory items OR products
ALTER TABLE public.inventory_logs 
ALTER COLUMN inventory_id DROP NOT NULL;

-- Create function to safely increment/decrement product stock if it doesn't exist
CREATE OR REPLACE FUNCTION public.increment_product_stock(p_product_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.products
  SET stock_quantity = COALESCE(stock_quantity, 0) + p_amount,
      updated_at = now()
  WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
