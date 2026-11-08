-- 1. Limpar estágios antigos (mantendo integridade referencial)
UPDATE public.quotes SET pipeline_stage_id = NULL;
DELETE FROM public.pipeline_stages;

-- 2. Inserir os novos estágios personalizados
INSERT INTO public.pipeline_stages (name, color, sort_order) VALUES
('Orçamento enviado', '#3b82f6', 1),         -- Azul
('Pagou, aguardando envio', '#10b981', 2),   -- Verde
('Vai pagar na entrega', '#f59e0b', 3),      -- Laranja
('Pós venda', '#8b5cf6', 4)                   -- Roxo
ON CONFLICT DO NOTHING;

-- 3. Mapear orçamentos existentes para os novos estágios baseados no status real
-- Pendentes -> Orçamento enviado
UPDATE public.quotes 
SET pipeline_stage_id = (SELECT id FROM public.pipeline_stages WHERE name = 'Orçamento enviado')
WHERE status = 'pendente';

-- Aprovados (que já pagaram ou vão pagar) -> Pagou, aguardando envio (como padrão de segurança)
UPDATE public.quotes 
SET pipeline_stage_id = (SELECT id FROM public.pipeline_stages WHERE name = 'Pagou, aguardando envio')
WHERE status = 'aprovado';
