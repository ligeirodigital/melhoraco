ALTER TABLE public.cash_flow_transactions ADD COLUMN quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL;
COMMENT ON COLUMN public.cash_flow_transactions.quote_id IS 'Vincula um lançamento manual (ex: Uber/Frete) a um orçamento específico.';
