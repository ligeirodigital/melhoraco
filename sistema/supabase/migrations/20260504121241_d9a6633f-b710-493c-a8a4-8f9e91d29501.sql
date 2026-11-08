-- Adicionar status de pagamento aos orçamentos se não existir
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'payment_status') THEN
        ALTER TABLE public.quotes ADD COLUMN payment_status TEXT DEFAULT 'pending';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'payment_method') THEN
        ALTER TABLE public.quotes ADD COLUMN payment_method TEXT;
    END IF;
END $$;

-- Tabela de Transações de Pagamento
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'mercadopago', 'nubank', 'infinitypay'
    external_id TEXT, -- ID na plataforma de pagamento
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'refunded'
    payment_link TEXT,
    qr_code TEXT,
    qr_code_base64 TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "Users can view their own transactions" 
ON public.payment_transactions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own transactions" 
ON public.payment_transactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own transactions" 
ON public.payment_transactions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger para updated_at
CREATE TRIGGER update_payment_transactions_updated_at
BEFORE UPDATE ON public.payment_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
