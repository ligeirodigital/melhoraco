-- Adicionar colunas de desconto na tabela de orçamentos
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS discount_type TEXT DEFAULT 'fixed' CHECK (discount_type IN ('fixed', 'percent'));

-- Adicionar colunas de desconto na tabela de itens de orçamento
ALTER TABLE public.quote_items
ADD COLUMN IF NOT EXISTS unit_discount NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS unit_discount_type TEXT DEFAULT 'fixed' CHECK (unit_discount_type IN ('fixed', 'percent'));
