-- Adicionar campos de CRM à tabela de clientes
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS last_purchase_at TIMESTAMP WITH TIME ZONE;

-- Adicionar controle de follow-up à tabela de orçamentos
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS last_follow_up TIMESTAMP WITH TIME ZONE;

-- Adicionar flag de produto digital/serviço (que não consome estoque)
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT false;

-- View para insights de clientes (CRM)
CREATE OR REPLACE VIEW public.v_client_insights AS
SELECT 
    c.id as client_id,
    c.name as client_name,
    c.phone as client_phone,
    COUNT(q.id) as total_quotes,
    COUNT(CASE WHEN q.status = 'aprovado' THEN 1 END) as approved_quotes,
    COALESCE(SUM(CASE WHEN q.status = 'aprovado' THEN 
        (SELECT SUM(qi.quantity * qi.unit_price) FROM public.quote_items qi WHERE qi.quote_id = q.id) 
    ELSE 0 END), 0) as total_revenue,
    CASE 
        WHEN COUNT(CASE WHEN q.status = 'aprovado' THEN 1 END) > 0 THEN 
            COALESCE(SUM(CASE WHEN q.status = 'aprovado' THEN 
                (SELECT SUM(qi.quantity * qi.unit_price) FROM public.quote_items qi WHERE qi.quote_id = q.id) 
            ELSE 0 END), 0) / COUNT(CASE WHEN q.status = 'aprovado' THEN 1 END)
        ELSE 0 
    END as average_ticket,
    MAX(CASE WHEN q.status = 'aprovado' THEN q.created_at END) as last_order_date,
    c.user_id
FROM 
    public.clients c
LEFT JOIN 
    public.quotes q ON c.id = q.client_id
GROUP BY 
    c.id, c.name, c.phone, c.user_id;

-- Garantir que a view respeite o RLS
ALTER VIEW public.v_client_insights SET (security_invoker = on);

-- Função para registrar follow-up
CREATE OR REPLACE FUNCTION public.mark_follow_up(p_quote_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE public.quotes 
    SET last_follow_up = now() 
    WHERE id = p_quote_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
