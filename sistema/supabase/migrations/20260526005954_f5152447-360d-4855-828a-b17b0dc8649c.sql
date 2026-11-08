-- Adicionar coluna de custo fixo nos itens do orçamento
ALTER TABLE public.quote_items 
ADD COLUMN IF NOT EXISTS fixed_cost DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN public.quote_items.fixed_cost IS 'Custo fixo de produção alocado para este item no momento da venda';
