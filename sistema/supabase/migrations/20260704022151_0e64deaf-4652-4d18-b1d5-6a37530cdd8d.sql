
-- 1. Estender quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS confirmed_source text,
  ADD COLUMN IF NOT EXISTS payment_amount numeric,
  ADD COLUMN IF NOT EXISTS payment_installments integer,
  ADD COLUMN IF NOT EXISTS payment_transaction_nsu text,
  ADD COLUMN IF NOT EXISTS payment_invoice_slug text,
  ADD COLUMN IF NOT EXISTS payment_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_nsu text;

CREATE INDEX IF NOT EXISTS idx_quotes_order_nsu ON public.quotes(order_nsu);

-- 2. Estender payment_transactions
ALTER TABLE public.payment_transactions
  ADD COLUMN IF NOT EXISTS transaction_nsu text,
  ADD COLUMN IF NOT EXISTS invoice_slug text,
  ADD COLUMN IF NOT EXISTS checkout_url text,
  ADD COLUMN IF NOT EXISTS capture_method text,
  ADD COLUMN IF NOT EXISTS confirmed_source text,
  ADD COLUMN IF NOT EXISTS paid_amount numeric,
  ADD COLUMN IF NOT EXISTS webhook_received_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS order_nsu text;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_tx_provider_invoice
  ON public.payment_transactions(provider, invoice_slug)
  WHERE invoice_slug IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_tx_order_nsu ON public.payment_transactions(order_nsu);

-- 3. Tabela payment_events (auditoria)
CREATE TABLE IF NOT EXISTS public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid REFERENCES public.quotes(id) ON DELETE CASCADE,
  event text NOT NULL,
  source text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view payment events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = payment_events.quote_id AND q.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_payment_events_quote ON public.payment_events(quote_id, created_at DESC);
