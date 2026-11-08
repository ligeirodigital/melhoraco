ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS installation_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS installation_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS delivery_required BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_value DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS signature_data TEXT,
ADD COLUMN IF NOT EXISTS employee_signature_data TEXT,
ADD COLUMN IF NOT EXISTS order_token TEXT;

-- Gerar tokens curtos para orçamentos existentes que não possuem
UPDATE public.quotes 
SET order_token = upper(substring(gen_random_uuid()::text from 1 for 6))
WHERE order_token IS NULL;
