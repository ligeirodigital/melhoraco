-- Adicionar a coluna employee_name à tabela quotes
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS employee_name TEXT;

-- Garantir que as permissões RLS permitam o acesso à nova coluna (já habilitado pelo uso de *)
COMMENT ON COLUMN public.quotes.employee_name IS 'Nome do colaborador que gerou o orçamento';
