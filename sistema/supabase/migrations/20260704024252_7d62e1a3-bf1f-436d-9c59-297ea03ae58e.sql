
ALTER TABLE public.business_settings
  ADD COLUMN IF NOT EXISTS infinitypay_handle text,
  ADD COLUMN IF NOT EXISTS infinitypay_sandbox boolean NOT NULL DEFAULT false;
