ALTER TABLE products ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
