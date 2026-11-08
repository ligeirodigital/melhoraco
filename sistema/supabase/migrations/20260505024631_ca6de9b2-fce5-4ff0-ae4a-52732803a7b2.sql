CREATE OR REPLACE FUNCTION public.get_dre_metrics(p_user_id uuid, p_start_date timestamp with time zone, p_end_date timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_receita_produtos DECIMAL := 0;
  v_receita_servicos DECIMAL := 0;
  v_receita_bruta DECIMAL := 0;
  v_impostos_pct DECIMAL := 0;
  v_impostos_valor DECIMAL := 0;
  v_receita_liquida DECIMAL := 0;
  v_custo_mercadoria DECIMAL := 0;
  v_lucro_bruto DECIMAL := 0;
  v_despesas_fixas_bs DECIMAL := 0;
  v_despesas_fixas_extra DECIMAL := 0;
  v_despesas_fixas_total DECIMAL := 0;
  v_despesas_variaveis DECIMAL := 0;
  v_resultado_liquido DECIMAL := 0;
  v_margem_liquida DECIMAL := 0;
  v_vendas_count INT := 0;
  v_pipeline DECIMAL := 0;
BEGIN
  -- 1. Get business settings (tax and fixed expenses) with COALESCE to avoid NULL propagation
  SELECT COALESCE(tax_rate, 0), COALESCE(monthly_expenses, 0)
  INTO v_impostos_pct, v_despesas_fixas_bs
  FROM business_settings 
  WHERE user_id = p_user_id;

  -- 2. Calculate Revenue from approved quotes within period
  SELECT 
    COALESCE(SUM(qi.unit_price * qi.quantity), 0),
    COALESCE(COUNT(DISTINCT q.id), 0)
  INTO v_receita_produtos, v_vendas_count
  FROM quotes q
  JOIN quote_items qi ON q.id = qi.quote_id
  WHERE q.user_id = p_user_id 
    AND q.status = 'aprovado'
    AND q.created_at BETWEEN p_start_date AND p_end_date;

  SELECT 
    COALESCE(SUM(delivery_fee + installation_fee), 0)
  INTO v_receita_servicos
  FROM quotes
  WHERE user_id = p_user_id 
    AND status = 'aprovado'
    AND created_at BETWEEN p_start_date AND p_end_date;

  v_receita_bruta := v_receita_produtos + v_receita_servicos;

  -- 3. Calculate COGS (Cost of Goods Sold)
  SELECT COALESCE(SUM(p.cost * qi.quantity), 0)
  INTO v_custo_mercadoria
  FROM quotes q
  JOIN quote_items qi ON q.id = qi.quote_id
  JOIN products p ON qi.product_id = p.id
  WHERE q.user_id = p_user_id 
    AND q.status = 'aprovado'
    AND q.created_at BETWEEN p_start_date AND p_end_date;

  -- 4. Calculate Pipeline (Pending quotes)
  SELECT COALESCE(SUM(qi.unit_price * qi.quantity) + SUM(q.delivery_fee + q.installation_fee), 0)
  INTO v_pipeline
  FROM quotes q
  JOIN quote_items qi ON q.id = qi.quote_id
  WHERE q.user_id = p_user_id 
    AND q.status = 'pendente';

  -- 5. Calculate Extra Expenses
  SELECT 
    COALESCE(SUM(CASE WHEN category = 'fixa' THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN category = 'variavel' THEN amount ELSE 0 END), 0)
  INTO v_despesas_fixas_extra, v_despesas_variaveis
  FROM direct_expenses
  WHERE user_id = p_user_id 
    AND expense_date BETWEEN p_start_date AND p_end_date;

  -- Logic: Add budgeted fixed expenses to any extra fixed expenses found
  v_despesas_fixas_total := COALESCE(v_despesas_fixas_bs, 0) + COALESCE(v_despesas_fixas_extra, 0);

  -- 6. Final calculations with COALESCE security
  v_impostos_valor := v_receita_bruta * (COALESCE(v_impostos_pct, 0) / 100);
  v_receita_liquida := v_receita_bruta - v_impostos_valor;
  v_lucro_bruto := v_receita_liquida - v_custo_mercadoria;
  v_resultado_liquido := v_lucro_bruto - v_despesas_fixas_total - v_despesas_variaveis;

  IF v_receita_bruta > 0 THEN
    v_margem_liquida := (v_resultado_liquido / v_receita_bruta) * 100;
  ELSE
    v_margem_liquida := 0;
  END IF;

  RETURN jsonb_build_object(
    'receita_bruta', COALESCE(v_receita_bruta, 0),
    'receita_produtos', COALESCE(v_receita_produtos, 0),
    'receita_servicos', COALESCE(v_receita_servicos, 0),
    'impostos', COALESCE(v_impostos_valor, 0),
    'receita_liquida', COALESCE(v_receita_liquida, 0),
    'custo_mercadoria', COALESCE(v_custo_mercadoria, 0),
    'lucro_bruto', COALESCE(v_lucro_bruto, 0),
    'despesas_fixas', COALESCE(v_despesas_fixas_total, 0),
    'despesas_variaveis', COALESCE(v_despesas_variaveis, 0),
    'resultado_liquido', COALESCE(v_resultado_liquido, 0),
    'margem_liquida', COALESCE(v_margem_liquida, 0),
    'vendas_count', COALESCE(v_vendas_count, 0),
    'pipeline', COALESCE(v_pipeline, 0)
  );
END;
$function$;
