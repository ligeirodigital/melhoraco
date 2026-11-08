-- Create storage bucket for business assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-assets', 'business-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to assets
CREATE POLICY "Business assets are public"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-assets');

-- Policy to allow authenticated users to upload their own assets
CREATE POLICY "Authenticated users can upload business assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'business-assets');

-- Policy to allow authenticated users to update their own assets
CREATE POLICY "Authenticated users can update business assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'business-assets');

-- Policy to allow authenticated users to delete their own assets
CREATE POLICY "Authenticated users can delete business assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'business-assets');
