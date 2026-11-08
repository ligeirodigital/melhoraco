ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS document_settings jsonb NOT NULL DEFAULT '{}'::jsonb;
COMMENT ON COLUMN public.business_settings.document_settings IS 'Editable company header and commercial terms used by quote/receipt PDFs; empty keys fall back to app defaults.';
