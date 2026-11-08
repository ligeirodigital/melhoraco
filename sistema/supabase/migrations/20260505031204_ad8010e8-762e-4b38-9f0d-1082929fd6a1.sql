-- 1. Enable Extension for fast search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Secure all tables with RLS
DO $$ 
BEGIN
    ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.business_settings ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.direct_expenses ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.profit_withdrawals ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.sales_targets ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;
EXCEPTION WHEN OTHERS THEN 
    NULL;
END $$;

-- 3. Core RLS Policies (Shared Environment)
DROP POLICY IF EXISTS "Authenticated users manage clients" ON public.clients;
CREATE POLICY "Authenticated users manage clients" ON public.clients 
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users manage quotes" ON public.quotes;
CREATE POLICY "Authenticated users manage quotes" ON public.quotes 
FOR ALL USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users manage items" ON public.quote_items;
CREATE POLICY "Authenticated users manage items" ON public.quote_items 
FOR ALL USING (auth.uid() IS NOT NULL);

-- 4. High Performance Indexes
CREATE INDEX IF NOT EXISTS idx_quotes_dates_composite ON public.quotes(created_at DESC, status);
CREATE INDEX IF NOT EXISTS idx_clients_name_search ON public.clients USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_quote_items_lookup ON public.quote_items(quote_id);

-- 5. Optimized DRE Logic
CREATE OR REPLACE FUNCTION public.get_dre_metrics(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSONB;
BEGIN
  WITH REVENUE AS (
    SELECT 
      COALESCE(SUM(qi.unit_price * qi.quantity), 0) as prod_rev,
      COALESCE(SUM(q.delivery_fee + q.installation_fee), 0) as serv_rev,
      COUNT(DISTINCT q.id) as sales_count
    FROM quotes q
    LEFT JOIN quote_items qi ON q.id = qi.quote_id
    WHERE q.status = 'aprovado'
      AND q.created_at BETWEEN p_start_date AND p_end_date
  ),
  COSTS AS (
    SELECT COALESCE(SUM(p.cost * qi.quantity), 0) as cogs
    FROM quotes q
    JOIN quote_items qi ON q.id = qi.quote_id
    JOIN products p ON qi.product_id = p.id
    WHERE q.status = 'aprovado'
      AND q.created_at BETWEEN p_start_date AND p_end_date
  ),
  EXPENSES AS (
    SELECT 
      COALESCE(SUM(CASE WHEN category = 'fixa' THEN amount ELSE 0 END), 0) as fixed_extra,
      COALESCE(SUM(CASE WHEN category = 'variavel' THEN amount ELSE 0 END), 0) as variable
    FROM direct_expenses
    WHERE expense_date BETWEEN p_start_date AND p_end_date
  ),
  SETTINGS AS (
    SELECT COALESCE(tax_rate, 0) as tax_pct, COALESCE(monthly_expenses, 0) as fixed_base
    FROM business_settings 
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'receita_bruta', r.prod_rev + r.serv_rev,
    'receita_produtos', r.prod_rev,
    'receita_servicos', r.serv_rev,
    'impostos', (r.prod_rev + r.serv_rev) * (s.tax_pct / 100),
    'receita_liquida', (r.prod_rev + r.serv_rev) * (1 - s.tax_pct / 100),
    'custo_mercadoria', c.cogs,
    'lucro_bruto', ((r.prod_rev + r.serv_rev) * (1 - s.tax_pct / 100)) - c.cogs,
    'despesas_fixas', s.fixed_base + e.fixed_extra,
    'despesas_variaveis', e.variable,
    'resultado_liquido', (((r.prod_rev + r.serv_rev) * (1 - s.tax_pct / 100)) - c.cogs) - (s.fixed_base + e.fixed_extra) - e.variable,
    'vendas_count', r.sales_count
  ) INTO v_result
  FROM REVENUE r, COSTS c, EXPENSES e, SETTINGS s;

  RETURN v_result;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_dre_metrics TO authenticated;
