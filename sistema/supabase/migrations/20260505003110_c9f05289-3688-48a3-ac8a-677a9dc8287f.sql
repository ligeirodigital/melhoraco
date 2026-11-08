ALTER TABLE public.allowed_emails ADD COLUMN IF NOT EXISTS signature_url TEXT;
ALTER TABLE public.allowed_emails ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS signature_url TEXT;
