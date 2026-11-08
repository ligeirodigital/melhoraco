-- Add production stage and notes to quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS stage TEXT DEFAULT 'pendente';
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS production_notes TEXT;

-- Add Nubank PIX key to business settings
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS nubank_pix_key TEXT;

-- Create an index for faster filtering by stage
CREATE INDEX IF NOT EXISTS idx_quotes_stage ON public.quotes(stage);
