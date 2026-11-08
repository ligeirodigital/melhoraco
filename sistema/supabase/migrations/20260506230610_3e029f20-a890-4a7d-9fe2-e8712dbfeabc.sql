-- Tabela de Estoque / Insumos
CREATE TABLE public.inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL DEFAULT 'un', -- un, kg, m, etc
    quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    min_quantity DECIMAL(12,2) NOT NULL DEFAULT 0,
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Histórico de Movimentação de Estoque
CREATE TABLE public.inventory_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    inventory_id UUID REFERENCES public.inventory(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')), -- entrada ou saída
    quantity DECIMAL(12,2) NOT NULL,
    reason TEXT, -- 'compra', 'venda', 'perda', 'ajuste'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Histórico de CRM (Interações com Clientes)
CREATE TABLE public.interactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'note', -- 'call', 'email', 'meeting', 'note'
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    created_by UUID REFERENCES auth.users(id)
);

-- Habilitar RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions ENABLE ROW LEVEL SECURITY;

-- Políticas Simples (Acesso Total para Autenticados - Padrão do Projeto)
CREATE POLICY "Acesso total ao estoque para autenticados" ON public.inventory FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total aos logs de estoque para autenticados" ON public.inventory_logs FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acesso total às interações para autenticados" ON public.interactions FOR ALL USING (auth.role() = 'authenticated');

-- Triggers para updated_at
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
