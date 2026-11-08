CREATE POLICY "Users can check their own allowed email" ON public.allowed_emails FOR SELECT TO authenticated USING (lower(email) = lower((auth.jwt() ->> 'email')));
