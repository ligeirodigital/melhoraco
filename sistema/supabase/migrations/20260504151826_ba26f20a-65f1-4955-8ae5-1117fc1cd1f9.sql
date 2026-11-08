-- Garantir que o e-mail do admin está na tabela
INSERT INTO public.allowed_emails (email)
VALUES ('melhoracooficial@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Corrigir a política para permitir que o admin gerencie outros e-mails
-- Removendo a política restritiva anterior
DROP POLICY IF EXISTS "Allow admin to manage allowed_emails" ON public.allowed_emails;

-- Criando uma política que permite que o admin faça TUDO na tabela
CREATE POLICY "Admin can manage all allowed emails"
ON public.allowed_emails
FOR ALL
TO authenticated
USING (auth.jwt() ->> 'email' = 'melhoracooficial@gmail.com')
WITH CHECK (auth.jwt() ->> 'email' = 'melhoracooficial@gmail.com');

-- Garantir que todos os autenticados podem ler para verificar seu próprio acesso
DROP POLICY IF EXISTS "Allow authenticated users to read allowed_emails" ON public.allowed_emails;
CREATE POLICY "Authenticated users can read allowed_emails"
ON public.allowed_emails
FOR SELECT
TO authenticated
USING (true);
