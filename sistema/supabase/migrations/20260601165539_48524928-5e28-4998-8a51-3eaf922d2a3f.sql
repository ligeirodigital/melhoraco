-- 1. allowed_emails: Restringir exposição pública
DROP POLICY IF EXISTS "Anyone can view allowed emails" ON public.allowed_emails;
CREATE POLICY "Authenticated users can view allowed emails" 
ON public.allowed_emails FOR SELECT 
TO authenticated 
USING (true);

-- 2. clients: Remover política que permite qualquer autenticado ver tudo
DROP POLICY IF EXISTS "Authenticated users manage clients" ON public.clients;

-- 3. interactions: Restringir acesso
DROP POLICY IF EXISTS "Authenticated users manage interactions" ON public.interactions;
CREATE POLICY "Users manage own client interactions" 
ON public.interactions FOR ALL 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND user_id = auth.uid()));

-- 4. inventory & inventory_logs: Adicionar user_id e políticas (Hardening)
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.inventory_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

DROP POLICY IF EXISTS "Authenticated users manage inventory" ON public.inventory;
CREATE POLICY "Users manage own inventory" 
ON public.inventory FOR ALL 
TO authenticated 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users manage inventory logs" ON public.inventory_logs;
CREATE POLICY "Users manage own inventory logs" 
ON public.inventory_logs FOR ALL 
TO authenticated 
USING (auth.uid() = user_id);

-- 5. profiles: Restringir leitura de emails e cargos
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Users can view their own profile" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (auth.uid() = id);

-- 6. quote_items: Remover acesso público irrestrito
DROP POLICY IF EXISTS "Public can view quote items" ON public.quote_items;
CREATE POLICY "Quote items viewable via quote token" 
ON public.quote_items FOR SELECT 
TO anon, authenticated 
USING (EXISTS (SELECT 1 FROM public.quotes WHERE id = quote_id AND client_view_token IS NOT NULL));

-- 7. quotes: Remover política permissiva
DROP POLICY IF EXISTS "Authenticated users manage quotes" ON public.quotes;
DROP POLICY IF EXISTS "Clients can view their own quotes via token" ON public.quotes;

-- 8. webhook_logs: Restringir a admins (usando a tabela profiles)
DROP POLICY IF EXISTS "Admins can view logs" ON public.webhook_logs;
CREATE POLICY "Only admins can view webhook logs" 
ON public.webhook_logs FOR SELECT 
TO authenticated 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 9. storage: business-assets isolation
DROP POLICY IF EXISTS "Anyone can view business assets" ON storage.objects;
CREATE POLICY "Anyone can view business assets" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'business-assets');

DROP POLICY IF EXISTS "Authenticated users can upload business assets" ON storage.objects;
CREATE POLICY "Users can upload own business assets" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can update business assets" ON storage.objects;
CREATE POLICY "Users can update own business assets" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can delete business assets" ON storage.objects;
CREATE POLICY "Users can delete own business assets" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (bucket_id = 'business-assets' AND (storage.foldername(name))[1] = auth.uid()::text);
