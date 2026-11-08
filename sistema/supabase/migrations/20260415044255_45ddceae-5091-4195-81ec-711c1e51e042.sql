
-- Add cost column to products
ALTER TABLE public.products ADD COLUMN cost numeric NOT NULL DEFAULT 0;

-- Business settings table
CREATE TABLE public.business_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  tax_rate numeric NOT NULL DEFAULT 0,
  monthly_expenses numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own settings"
ON public.business_settings FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_business_settings_updated_at
BEFORE UPDATE ON public.business_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
