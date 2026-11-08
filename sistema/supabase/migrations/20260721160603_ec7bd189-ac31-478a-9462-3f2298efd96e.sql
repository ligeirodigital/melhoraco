
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cash_flow_transactions TO authenticated;
GRANT ALL ON public.cash_flow_transactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories TO authenticated;
GRANT ALL ON public.financial_categories TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.direct_expenses TO authenticated;
GRANT ALL ON public.direct_expenses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profit_withdrawals TO authenticated;
GRANT ALL ON public.profit_withdrawals TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investors TO authenticated;
GRANT ALL ON public.investors TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_transactions TO authenticated;
GRANT ALL ON public.investor_transactions TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_targets TO authenticated;
GRANT ALL ON public.sales_targets TO service_role;
