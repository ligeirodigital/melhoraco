-- Missing RPC functions for the system

-- 1. increment_product_stock
CREATE OR REPLACE FUNCTION public.increment_product_stock(p_product_id UUID, p_amount INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.products
    SET stock_quantity = COALESCE(stock_quantity, 0) + p_amount,
        updated_at = now()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. seed_default_products
CREATE OR REPLACE FUNCTION public.seed_default_products(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO public.products (user_id, name, description, price, cost, editable, sort_order, category, stock_quantity, min_stock_level)
    VALUES 
    (p_user_id, 'Portão Basculante Padrão', 'Portão em aço galvanizado 3x2.40m', 2850.00, 1400.00, true, 0, 'Portões', 5, 2),
    (p_user_id, 'Grade de Proteção', 'Grade em metalon 20x20 por m2', 350.00, 150.00, true, 1, 'Grades', 10, 5),
    (p_user_id, 'Motor de Portão 1/3HP', 'Automatizador para portões basculantes', 750.00, 420.00, false, 2, 'Motores', 8, 3),
    (p_user_id, 'Corrimão de Inox', 'Corrimão em aço inox 304 polido por metro', 480.00, 220.00, true, 3, 'Inox', 15, 5);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. mark_follow_up
CREATE OR REPLACE FUNCTION public.mark_follow_up(p_quote_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.quotes
    SET last_follow_up = now(),
        updated_at = now()
    WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. get_dre_metrics
CREATE OR REPLACE FUNCTION public.get_dre_metrics(
    p_user_id UUID,
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB AS $$
DECLARE
    v_receita_produtos NUMERIC := 0;
    v_receita_servicos NUMERIC := 0;
    v_custo_mercadoria NUMERIC := 0;
    v_despesas_variaveis NUMERIC := 0;
    v_despesas_fixas NUMERIC := 0;
    v_impostos NUMERIC := 0;
    v_tax_rate NUMERIC := 0;
    v_pipeline NUMERIC := 0;
    v_vendas_count INTEGER := 0;
BEGIN
    -- Get tax rate from settings
    SELECT COALESCE(tax_rate, 0) / 100.0 INTO v_tax_rate
    FROM public.business_settings
    WHERE user_id = p_user_id;

    -- Get Revenue and Cost from approved quotes
    SELECT 
        COALESCE(SUM(qi.quantity * qi.unit_price), 0),
        COALESCE(SUM(q.delivery_fee + q.installation_fee), 0),
        COALESCE(SUM(qi.quantity * COALESCE(p.cost, 0)), 0),
        COUNT(DISTINCT q.id)
    INTO v_receita_produtos, v_receita_servicos, v_custo_mercadoria, v_vendas_count
    FROM public.quotes q
    JOIN public.quote_items qi ON q.id = qi.quote_id
    LEFT JOIN public.products p ON qi.product_id = p.id
    WHERE q.user_id = p_user_id 
      AND q.status = 'aprovado'
      AND q.created_at BETWEEN p_start_date AND p_end_date;

    -- Get Pipeline (Pending quotes)
    SELECT COALESCE(SUM(qi.quantity * qi.unit_price) + SUM(q.delivery_fee + q.installation_fee), 0)
    INTO v_pipeline
    FROM public.quotes q
    JOIN public.quote_items qi ON q.id = qi.quote_id
    WHERE q.user_id = p_user_id 
      AND q.status = 'pendente'
      AND q.created_at BETWEEN p_start_date AND p_end_date;

    -- Get Variable Expenses
    SELECT COALESCE(SUM(amount), 0)
    INTO v_despesas_variaveis
    FROM public.direct_expenses
    WHERE user_id = p_user_id 
      AND is_fixed = false
      AND expense_date BETWEEN p_start_date AND p_end_date;

    -- Get Fixed Expenses
    SELECT COALESCE(SUM(amount), 0)
    INTO v_despesas_fixas
    FROM public.direct_expenses
    WHERE user_id = p_user_id 
      AND is_fixed = true
      AND expense_date BETWEEN p_start_date AND p_end_date;

    v_impostos := (v_receita_produtos + v_receita_servicos) * v_tax_rate;

    RETURN jsonb_build_object(
        'receita_bruta', v_receita_produtos + v_receita_servicos,
        'receita_produtos', v_receita_produtos,
        'receita_servicos', v_receita_servicos,
        'impostos', v_impostos,
        'receita_liquida', (v_receita_produtos + v_receita_servicos) - v_impostos,
        'custo_mercadoria', v_custo_mercadoria,
        'lucro_bruto', (v_receita_produtos + v_receita_servicos) - v_impostos - v_custo_mercadoria,
        'despesas_variaveis', v_despesas_variaveis,
        'despesas_fixas', v_despesas_fixas,
        'resultado_liquido', (v_receita_produtos + v_receita_servicos) - v_impostos - v_custo_mercadoria - v_despesas_variaveis - v_despesas_fixas,
        'pipeline', v_pipeline,
        'vendas_count', v_vendas_count,
        'margem_liquida', CASE WHEN (v_receita_produtos + v_receita_servicos) > 0 
            THEN (((v_receita_produtos + v_receita_servicos) - v_impostos - v_custo_mercadoria - v_despesas_variaveis - v_despesas_fixas) / (v_receita_produtos + v_receita_servicos)) * 100 
            ELSE 0 END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_user_status ON public.quotes(user_id, status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_direct_expenses_user_date ON public.direct_expenses(user_id, expense_date);
