-- Create a table for allowed emails (employees)
CREATE TABLE IF NOT EXISTS public.allowed_emails (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read (needed for the check during login)
CREATE POLICY "Allowed emails are readable by everyone" ON public.allowed_emails
    FOR SELECT USING (true);

-- Only allow adding/deleting via direct SQL or a future admin panel (no RLS policy for insert/update for now to keep it secure)

-- Add the main owner email as the first allowed entry
INSERT INTO public.allowed_emails (email) 
VALUES ('melhoracooficial@gmail.com')
ON CONFLICT (email) DO NOTHING;

-- Update RLS on other tables to include an "allowed email" check
-- This is a secondary layer of security

CREATE OR REPLACE FUNCTION public.is_allowed_user(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (SELECT 1 FROM public.allowed_emails WHERE email = p_email);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
