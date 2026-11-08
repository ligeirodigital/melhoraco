-- Adicionar colunas na tabela de orçamentos
ALTER TABLE public.quotes 
ADD COLUMN customer_signature_url TEXT,
ADD COLUMN payment_receipt_url TEXT,
ADD COLUMN signed_at TIMESTAMP WITH TIME ZONE;

-- Criar bucket para assinaturas e comprovantes se não existir
INSERT INTO storage.buckets (id, name, public) 
VALUES ('customer_assets', 'customer_assets', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso para o bucket
CREATE POLICY "Arquivos de clientes são públicos para leitura" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'customer_assets');

CREATE POLICY "Clientes podem fazer upload de assinaturas e comprovantes" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'customer_assets');
