ALTER TABLE public.financial_categories ADD COLUMN IF NOT EXISTS dre_group TEXT;

-- Update existing categories with default groups
UPDATE public.financial_categories SET dre_group = 'revenue' WHERE name ILIKE '%venda%';
UPDATE public.financial_categories SET dre_group = 'marketing' WHERE name ILIKE '%marketing%';
UPDATE public.financial_categories SET dre_group = 'logistics' WHERE name ILIKE '%logística%' OR name ILIKE '%logistica%' OR name ILIKE '%frete%' OR name ILIKE '%entrega%';
UPDATE public.financial_categories SET dre_group = 'fees' WHERE name ILIKE '%taxa de cartão%' OR name ILIKE '%taxa%';
UPDATE public.financial_categories SET dre_group = 'deduction' WHERE name ILIKE '%devolução%' OR name ILIKE '%desconto%';
UPDATE public.financial_categories SET dre_group = 'cmv' WHERE name ILIKE '%fabricação%' OR name ILIKE '%produção%';
UPDATE public.financial_categories SET dre_group = 'operating' WHERE dre_group IS NULL AND type = 'expense';
UPDATE public.financial_categories SET dre_group = 'revenue' WHERE dre_group IS NULL AND type = 'income';
