CREATE OR REPLACE FUNCTION public.get_dre_metrics(
    p_user_id UUID,
    p_start_date TIMESTAMP WITH TIME ZONE,
    p_end_date TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_receita_produtos NUMERIC := 0;
    v_receita_servicos NUMERIC := 0;
    v_receita_bruta NUMERIC := 0;
    v_impostos NUMERIC := 0;
    v_tax_rate NUMERIC := 0;
    v_custo_mercadoria NUMERIC := 0;
    v_despesas_variaveis NUMERIC := 0;
    v_despesas_fixas_estimadas NUMERIC := 0;
    v_monthly_expenses NUMERIC := 0;
    v_months_count NUMERIC;
    v_resultado_liquido NUMERIC := 0;
    v_resultado_operacional NUMERIC := 0;
    v_lucro_bruto NUMERIC := 0;
    v_pipeline NUMERIC := 0;
    v_vendas_count INTEGER := 0;
BEGIN
    -- 1. Obter configurações do negócio
    SELECT tax_rate, monthly_expenses 
    INTO v_tax_rate, v_monthly_expenses
    FROM public.business_settings 
    WHERE user_id = p_user_id;

    v_tax_rate := COALESCE(v_tax_rate, 0);
    v_monthly_expenses := COALESCE(v_monthly_expenses, 0);

    -- 2. Calcular Receitas e Pipeline
    -- Receita de produtos (Aprovados)
    SELECT COALESCE(SUM(qi.quantity * qi.unit_price), 0)
    INTO v_receita_produtos
    FROM public.quotes q
    JOIN public.quote_items qi ON q.id = qi.quote_id
    WHERE q.user_id = p_user_id 
      AND q.status = 'aprovado'
      AND q.created_at BETWEEN p_start_date AND p_end_date;

    -- Receita de serviços (Aprovados)
    SELECT COALESCE(SUM(delivery_fee + installation_fee), 0), COUNT(*)
    INTO v_receita_servicos, v_vendas_count
    FROM public.quotes
    WHERE user_id = p_user_id 
      AND status = 'aprovado'
      AND created_at BETWEEN p_start_date AND p_end_date;

    v_receita_bruta := v_receita_produtos + v_receita_servicos;

    -- Pipeline (Pendentes)
    SELECT COALESCE(SUM(qi.quantity * qi.unit_price + q.delivery_fee + q.installation_fee), 0)
    INTO v_pipeline
    FROM public.quotes q
    JOIN public.quote_items qi ON q.id = qi.quote_id
    WHERE q.user_id = p_user_id 
      AND q.status = 'pendente'
      AND q.created_at BETWEEN p_start_date AND p_end_date;

    -- 3. Calcular Deduções e Custos
    v_impostos := v_receita_bruta * (v_tax_rate / 100);

    -- Custo de Mercadoria Vendida (CPV)
    -- Tenta pegar o custo do item ou o custo atual do produto
    SELECT COALESCE(SUM(qi.quantity * COALESCE(p.cost, 0)), 0)
    INTO v_custo_mercadoria
    FROM public.quotes q
    JOIN public.quote_items qi ON q.id = qi.quote_id
    LEFT JOIN public.products p ON qi.product_id = p.id
    WHERE q.user_id = p_user_id 
      AND q.status = 'aprovado'
      AND q.created_at BETWEEN p_start_date AND p_end_date;

    -- 4. Calcular Despesas
    -- Despesas variáveis (Lançadas manualmente)
    SELECT COALESCE(SUM(amount), 0)
    INTO v_despesas_variaveis
    FROM public.direct_expenses
    WHERE user_id = p_user_id 
      AND expense_date BETWEEN p_start_date::date AND p_end_date::date;

    -- Despesas fixas proporcionais
    v_months_count := EXTRACT(YEAR FROM p_end_date) * 12 + EXTRACT(MONTH FROM p_end_date) - 
                      (EXTRACT(YEAR FROM p_start_date) * 12 + EXTRACT(MONTH FROM p_start_date)) + 1;
    v_despesas_fixas_estimadas := v_monthly_expenses * v_months_count;

    -- 5. Totais Finais
    v_lucro_bruto := (v_receita_bruta - v_impostos) - v_custo_mercadoria;
    v_resultado_operacional := v_lucro_bruto - (v_despesas_variaveis + v_despesas_fixas_estimadas);
    v_resultado_liquido := v_resultado_operacional;

    RETURN jsonb_build_object(
        'receita_bruta', v_receita_bruta,
        'receita_produtos', v_receita_produtos,
        'receita_servicos', v_receita_servicos,
        'impostos', v_impostos,
        'receita_liquida', v_receita_bruta - v_impostos,
        'custo_mercadoria', v_custo_mercadoria,
        'lucro_bruto', v_lucro_bruto,
        'despesas_variaveis', v_despesas_variaveis,
        'despesas_fixas', v_despesas_fixas_estimadas,
        'resultado_liquido', v_resultado_liquido,
        'pipeline', v_pipeline,
        'vendas_count', v_vendas_count,
        'margem_liquida', CASE WHEN v_receita_bruta > 0 THEN (v_resultado_liquido / v_receita_bruta) * 100 ELSE 0 END
    );
END;
$$;
