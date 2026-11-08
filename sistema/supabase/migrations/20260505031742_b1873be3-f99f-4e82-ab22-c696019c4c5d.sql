-- 1. Create pipeline stages table
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    color TEXT NOT NULL,
    sort_order INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Insert default stages
INSERT INTO public.pipeline_stages (name, color, sort_order) VALUES
('Novo Contato', '#3b82f6', 1),
('Proposta Enviada', '#8b5cf6', 2),
('Follow-up', '#f59e0b', 3),
('Negociação', '#ec4899', 4),
('Fechado (Aprovado)', '#10b981', 5),
('Perdido', '#ef4444', 6)
ON CONFLICT DO NOTHING;

-- 3. Add stage_id to quotes to track pipeline position
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS pipeline_stage_id UUID REFERENCES public.pipeline_stages(id);

-- 4. Enable RLS on pipeline stages
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view stages" ON public.pipeline_stages FOR SELECT USING (true);

-- 5. Helper function to get default stage
CREATE OR REPLACE FUNCTION get_default_pipeline_stage() 
RETURNS UUID AS $$
    SELECT id FROM public.pipeline_stages ORDER BY sort_order ASC LIMIT 1;
$$ LANGUAGE sql STABLE;

-- 6. Update existing quotes to a stage based on their status
UPDATE public.quotes 
SET pipeline_stage_id = (SELECT id FROM public.pipeline_stages WHERE name = 'Fechado (Aprovado)')
WHERE status = 'aprovado' AND pipeline_stage_id IS NULL;

UPDATE public.quotes 
SET pipeline_stage_id = (SELECT id FROM public.pipeline_stages WHERE name = 'Perdido')
WHERE status = 'recusado' AND pipeline_stage_id IS NULL;

UPDATE public.quotes 
SET pipeline_stage_id = get_default_pipeline_stage()
WHERE status = 'pendente' AND pipeline_stage_id IS NULL;

-- 7. Index for performance
CREATE INDEX IF NOT EXISTS idx_quotes_pipeline_stage ON public.quotes(pipeline_stage_id);
