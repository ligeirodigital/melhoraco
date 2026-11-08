ALTER TABLE public.landing_pages 
ADD COLUMN meta_pixel_id TEXT,
ADD COLUMN google_tag_id TEXT;

ALTER TABLE public.product_landing_pages 
ADD COLUMN meta_pixel_id TEXT,
ADD COLUMN google_tag_id TEXT;
