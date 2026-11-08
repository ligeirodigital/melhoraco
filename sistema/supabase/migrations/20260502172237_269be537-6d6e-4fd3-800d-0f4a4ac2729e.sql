-- Function to safely increment or decrement product stock
CREATE OR REPLACE FUNCTION public.increment_product_stock(p_product_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.products
    SET stock_quantity = stock_quantity + p_amount,
        updated_at = now()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
