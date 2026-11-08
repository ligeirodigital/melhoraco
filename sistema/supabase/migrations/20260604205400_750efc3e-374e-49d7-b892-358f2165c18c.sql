CREATE OR REPLACE FUNCTION public.increment_variant_stock(p_variant_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.product_variants
  SET stock_quantity = COALESCE(stock_quantity, 0) + p_amount
  WHERE id = p_variant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.increment_variant_stock(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_variant_stock(UUID, INTEGER) TO service_role;
