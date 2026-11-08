-- Garantir que o e-mail está na tabela em minúsculo
DELETE FROM public.allowed_emails WHERE LOWER(email) = 'melhoracooficial@gmail.com';
INSERT INTO public.allowed_emails (email) VALUES ('melhoracooficial@gmail.com');

-- Atualizar política para ser insensível a maiúsculas/minúsculas (case-insensitive)
DROP POLICY IF EXISTS "Admin can manage all allowed emails" ON public.allowed_emails;

CREATE POLICY "Admin can manage all allowed emails"
ON public.allowed_emails
FOR ALL
TO authenticated
USING (LOWER(auth.jwt() ->> 'email') = 'melhoracooficial@gmail.com')
WITH CHECK (LOWER(auth.jwt() ->> 'email') = 'melhoracooficial@gmail.com');

-- Garantir que a leitura também considere o e-mail correto no hook useAuth
DROP POLICY IF EXISTS "Authenticated users can read allowed_emails" ON public.allowed_emails;
CREATE POLICY "Authenticated users can read allowed_emails"
ON public.allowed_emails
FOR SELECT
TO authenticated
USING (true);
