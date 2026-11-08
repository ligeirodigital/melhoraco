-- Adicionar campos para gestão de leads manuais
ALTER TABLE public.quotes 
ADD COLUMN IF NOT EXISTS is_lead BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS expected_buy_date DATE;

-- Garantir que a etapa 'Aguardando Contato' ou similar exista para leads
-- Buscando o ID da primeira etapa para usar como padrão
DO $$
DECLARE
    first_stage_id UUID;
BEGIN
    SELECT id INTO first_stage_id FROM pipeline_stages ORDER BY sort_order LIMIT 1;
    -- Se não houver etapas, você pode criar uma aqui se necessário, 
    -- mas o sistema já parece ter etapas configuradas.
END $$;
