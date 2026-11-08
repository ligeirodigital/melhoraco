-- Create the allowed_emails table
CREATE TABLE IF NOT EXISTS public.allowed_emails (
    email TEXT PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read (needed for the access check)
CREATE POLICY "Allow authenticated users to read allowed_emails"
ON public.allowed_emails
FOR SELECT
TO authenticated
USING (true);

-- Allow the initial user to manage the table (assuming the first user is the admin)
-- In a real scenario, we might want a 'role' column in a profiles table, 
-- but for now we'll allow the first user to insert/delete if we have their email.
CREATE POLICY "Allow admin to manage allowed_emails"
ON public.allowed_emails
FOR ALL
TO authenticated
USING (email = 'melhoracooficial@gmail.com');

-- Insert the initial allowed email
INSERT INTO public.allowed_emails (email)
VALUES ('melhoracooficial@gmail.com')
ON CONFLICT (email) DO NOTHING;
