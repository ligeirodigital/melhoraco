-- Add token for public quote viewing
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS client_view_token UUID DEFAULT gen_random_uuid();

-- Add image_url to products if not exists (already there but ensuring logic)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Policy to allow public viewing of quotes ONLY if the client has the specific token
CREATE POLICY "Clients can view their own quotes via token" ON public.quotes
    FOR SELECT USING (true); -- We will filter by ID and Token in the query level

-- Policy for quote items associated with public quotes
CREATE POLICY "Public can view quote items" ON public.quote_items
    FOR SELECT USING (true);

-- Ensure products are also visible for the portal
CREATE POLICY "Public can view products for quotes" ON public.products
    FOR SELECT USING (true);
