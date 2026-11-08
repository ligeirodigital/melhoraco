-- Add status and due_date to cash_flow_transactions
ALTER TABLE public.cash_flow_transactions 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pago',
ADD COLUMN IF NOT EXISTS due_date TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Update existing records to have a due_date if null
UPDATE public.cash_flow_transactions 
SET due_date = transaction_date 
WHERE due_date IS NULL;

-- Create an index for faster filtering by date and status
CREATE INDEX IF NOT EXISTS idx_cash_flow_status_date ON public.cash_flow_transactions(status, due_date);

-- Ensure we have some basic industrial financial categories if they don't exist
-- Note: This is idempotent as we'll use DO blocks or handle in application logic if needed, 
-- but SQL here is simpler for structure.
COMMENT ON COLUMN public.cash_flow_transactions.status IS 'Can be "pendente" or "pago"';
