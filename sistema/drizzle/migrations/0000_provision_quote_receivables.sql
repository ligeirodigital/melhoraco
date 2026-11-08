ALTER TABLE public.cash_flow_transactions
  ADD COLUMN IF NOT EXISTS installment_number integer,
  ADD COLUMN IF NOT EXISTS total_installments integer,
  ADD COLUMN IF NOT EXISTS paid_at timestamp with time zone;

COMMENT ON COLUMN public.cash_flow_transactions.installment_number IS 'Número da parcela provisionada para uma venda.';
COMMENT ON COLUMN public.cash_flow_transactions.total_installments IS 'Quantidade total de parcelas provisionadas para a venda.';
COMMENT ON COLUMN public.cash_flow_transactions.paid_at IS 'Data efetiva do recebimento; nula enquanto pendente.';

CREATE UNIQUE INDEX IF NOT EXISTS uq_cash_flow_quote_installment
  ON public.cash_flow_transactions (quote_id, installment_number)
  WHERE quote_id IS NOT NULL AND installment_number IS NOT NULL AND type = 'income';

CREATE INDEX IF NOT EXISTS idx_cash_flow_receivables_due
  ON public.cash_flow_transactions (user_id, status, due_date)
  WHERE type = 'income' AND installment_number IS NOT NULL;

CREATE OR REPLACE FUNCTION public.sync_quote_receivables_internal(
  p_quote_id uuid,
  p_base_date date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.cash_flow_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote public.quotes%ROWTYPE;
  v_method text;
  v_installments integer;
  v_interval_days integer;
  v_subtotal numeric(14,2);
  v_base numeric(14,2);
  v_discount numeric(14,2);
  v_total numeric(14,2);
  v_total_cents bigint;
  v_regular_cents bigint;
  v_amount numeric(12,2);
  v_due timestamptz;
  v_client_name text;
  i integer;
BEGIN
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Venda não encontrada';
  END IF;

  v_method := COALESCE(v_quote.payment_method_type, '');
  IF v_method !~ '^boleto:[1-9][0-9]*x:[1-9][0-9]*d$' THEN
    RETURN;
  END IF;

  v_installments := ((regexp_match(v_method, '^boleto:([1-9][0-9]*)x:([1-9][0-9]*)d$'))[1])::integer;
  v_interval_days := ((regexp_match(v_method, '^boleto:([1-9][0-9]*)x:([1-9][0-9]*)d$'))[2])::integer;

  SELECT COALESCE(SUM(qi.unit_price * qi.quantity), 0)
    INTO v_subtotal
    FROM public.quote_items qi
   WHERE qi.quote_id = p_quote_id;

  v_base := ROUND(v_subtotal + COALESCE(v_quote.delivery_fee, 0) + COALESCE(v_quote.installation_fee, 0), 2);
  IF COALESCE(v_quote.discount_type, 'fixed') = 'percent' THEN
    v_discount := ROUND(v_base * LEAST(100, GREATEST(0, COALESCE(v_quote.discount_amount, 0))) / 100, 2);
  ELSE
    v_discount := LEAST(v_base, GREATEST(0, COALESCE(v_quote.discount_amount, 0)));
  END IF;
  v_total := GREATEST(0, ROUND(v_base - v_discount, 2));
  v_total_cents := ROUND(v_total * 100)::bigint;
  v_regular_cents := v_total_cents / v_installments;

  SELECT c.name INTO v_client_name FROM public.clients c WHERE c.id = v_quote.client_id;

  FOR i IN 1..v_installments LOOP
    v_amount := CASE
      WHEN i = v_installments THEN (v_total_cents - (v_regular_cents * (v_installments - 1)))::numeric / 100
      ELSE v_regular_cents::numeric / 100
    END;
    v_due := ((COALESCE(p_base_date, CURRENT_DATE) + (v_interval_days * i))::date + time '12:00') AT TIME ZONE 'America/Fortaleza';

    INSERT INTO public.cash_flow_transactions (
      user_id, description, amount, type, category, transaction_date,
      status, due_date, payment_method, quote_id, installment_number,
      total_installments, paid_at
    ) VALUES (
      v_quote.user_id,
      'Parcela ' || i || '/' || v_installments || ' — Venda #' || left(v_quote.id::text, 8) ||
        CASE WHEN COALESCE(v_client_name, '') <> '' THEN ' — ' || v_client_name ELSE '' END,
      v_amount, 'income', 'Vendas', v_due, 'pendente', v_due, 'boleto',
      v_quote.id, i, v_installments, NULL
    )
    ON CONFLICT (quote_id, installment_number)
      WHERE quote_id IS NOT NULL AND installment_number IS NOT NULL AND type = 'income'
    DO UPDATE SET
      description = EXCLUDED.description,
      amount = CASE WHEN cash_flow_transactions.status = 'pago' THEN cash_flow_transactions.amount ELSE EXCLUDED.amount END,
      due_date = CASE WHEN cash_flow_transactions.status = 'pago' THEN cash_flow_transactions.due_date ELSE EXCLUDED.due_date END,
      transaction_date = CASE WHEN cash_flow_transactions.status = 'pago' THEN cash_flow_transactions.transaction_date ELSE EXCLUDED.transaction_date END,
      payment_method = EXCLUDED.payment_method,
      total_installments = EXCLUDED.total_installments,
      updated_at = now();
  END LOOP;

  DELETE FROM public.cash_flow_transactions
   WHERE quote_id = p_quote_id
     AND type = 'income'
     AND installment_number IS NOT NULL
     AND installment_number > v_installments
     AND status <> 'pago';

  RETURN QUERY
    SELECT cf.*
      FROM public.cash_flow_transactions cf
     WHERE cf.quote_id = p_quote_id
       AND cf.type = 'income'
       AND cf.installment_number IS NOT NULL
     ORDER BY cf.installment_number;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_quote_receivables_internal(uuid, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_quote_receivables_internal(uuid, date) TO service_role;

CREATE OR REPLACE FUNCTION public.provision_quote_receivables(
  p_quote_id uuid,
  p_base_date date DEFAULT CURRENT_DATE
)
RETURNS SETOF public.cash_flow_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  SELECT user_id INTO v_owner FROM public.quotes WHERE id = p_quote_id;
  IF v_owner IS NULL OR auth.uid() IS NULL OR (auth.uid() <> v_owner AND NOT public.has_role(auth.uid(), 'admin')) THEN
    RAISE EXCEPTION 'Sem permissão para provisionar esta venda';
  END IF;
  RETURN QUERY SELECT * FROM public.sync_quote_receivables_internal(p_quote_id, p_base_date);
END;
$$;

REVOKE ALL ON FUNCTION public.provision_quote_receivables(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.provision_quote_receivables(uuid, date) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_quote_receivable_status(
  p_receivable_id uuid,
  p_status text,
  p_paid_at timestamp with time zone DEFAULT now()
)
RETURNS public.cash_flow_transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.cash_flow_transactions;
BEGIN
  IF p_status NOT IN ('pendente', 'pago') THEN
    RAISE EXCEPTION 'Status inválido';
  END IF;

  UPDATE public.cash_flow_transactions cf
     SET status = p_status,
         paid_at = CASE WHEN p_status = 'pago' THEN COALESCE(p_paid_at, now()) ELSE NULL END,
         transaction_date = CASE WHEN p_status = 'pago' THEN COALESCE(p_paid_at, now()) ELSE COALESCE(cf.due_date, cf.transaction_date) END,
         updated_at = now()
   WHERE cf.id = p_receivable_id
     AND cf.user_id = auth.uid()
     AND cf.type = 'income'
     AND cf.installment_number IS NOT NULL
  RETURNING cf.* INTO v_row;

  IF v_row.id IS NULL THEN
    RAISE EXCEPTION 'Parcela não encontrada ou sem permissão';
  END IF;
  RETURN v_row;
END;
$$;

REVOKE ALL ON FUNCTION public.set_quote_receivable_status(uuid, text, timestamp with time zone) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_quote_receivable_status(uuid, text, timestamp with time zone) TO authenticated;

CREATE OR REPLACE FUNCTION public.provision_receivables_on_quote_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'aprovado'
     AND OLD.status IS DISTINCT FROM 'aprovado'
     AND COALESCE(NEW.payment_method_type, '') ~ '^boleto:[1-9][0-9]*x:[1-9][0-9]*d$' THEN
    PERFORM public.sync_quote_receivables_internal(NEW.id, CURRENT_DATE);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provision_receivables_after_quote_approval ON public.quotes;
CREATE TRIGGER provision_receivables_after_quote_approval
AFTER UPDATE OF status ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.provision_receivables_on_quote_approval();

INSERT INTO public.cash_flow_transactions (
  user_id, description, amount, type, category, transaction_date, status,
  due_date, payment_method, quote_id, installment_number, total_installments, paid_at
)
SELECT
  q.user_id,
  'Parcela ' || gs.n || '/' || parsed.installments || ' — Venda #' || left(q.id::text, 8) ||
    CASE WHEN COALESCE(c.name, '') <> '' THEN ' — ' || c.name ELSE '' END,
  CASE WHEN gs.n = parsed.installments
    THEN (totals.total_cents - totals.regular_cents * (parsed.installments - 1))::numeric / 100
    ELSE totals.regular_cents::numeric / 100 END,
  'income', 'Vendas', due_data.due_at, 'pendente', due_data.due_at,
  'boleto', q.id, gs.n, parsed.installments, NULL
FROM public.quotes q
JOIN public.clients c ON c.id = q.client_id
CROSS JOIN LATERAL (
  SELECT
    ((regexp_match(q.payment_method_type, '^boleto:([1-9][0-9]*)x:([1-9][0-9]*)d$'))[1])::integer AS installments,
    ((regexp_match(q.payment_method_type, '^boleto:([1-9][0-9]*)x:([1-9][0-9]*)d$'))[2])::integer AS interval_days
) parsed
CROSS JOIN LATERAL (
  SELECT ROUND(COALESCE(SUM(qi.unit_price * qi.quantity), 0) + COALESCE(q.delivery_fee, 0) + COALESCE(q.installation_fee, 0), 2) AS base
  FROM public.quote_items qi WHERE qi.quote_id = q.id
) subtotal
CROSS JOIN LATERAL (
  SELECT ROUND(GREATEST(0, subtotal.base - CASE
    WHEN COALESCE(q.discount_type, 'fixed') = 'percent'
      THEN ROUND(subtotal.base * LEAST(100, GREATEST(0, COALESCE(q.discount_amount, 0))) / 100, 2)
    ELSE LEAST(subtotal.base, GREATEST(0, COALESCE(q.discount_amount, 0)))
  END) * 100)::bigint AS total_cents
) cents
CROSS JOIN LATERAL (
  SELECT cents.total_cents, cents.total_cents / parsed.installments AS regular_cents
) totals
CROSS JOIN LATERAL generate_series(1, parsed.installments) AS gs(n)
CROSS JOIN LATERAL (
  SELECT (((q.created_at AT TIME ZONE 'America/Fortaleza')::date + (parsed.interval_days * gs.n))::date + time '12:00') AT TIME ZONE 'America/Fortaleza' AS due_at
) due_data
WHERE q.status = 'aprovado'
  AND q.payment_method_type ~ '^boleto:[1-9][0-9]*x:[1-9][0-9]*d$'
ON CONFLICT (quote_id, installment_number)
  WHERE quote_id IS NOT NULL AND installment_number IS NOT NULL AND type = 'income'
DO NOTHING;
