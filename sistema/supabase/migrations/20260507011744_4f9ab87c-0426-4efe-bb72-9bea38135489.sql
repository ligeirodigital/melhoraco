-- Add payment_date to quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE;

-- Add profits_distribution to business_settings
ALTER TABLE public.business_settings ADD COLUMN IF NOT EXISTS profits_distribution NUMERIC DEFAULT 0;

-- Comment for clarity
COMMENT ON COLUMN public.quotes.payment_date IS 'Date when the quote was marked as paid/received';
COMMENT ON COLUMN public.business_settings.profits_distribution IS 'Percentage of profit to be distributed as dividends';
