-- Table for activity logs
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    user_email TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL, -- 'quote', 'client', 'product', 'setting'
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can see all logs, regular users see none or only their own (depending on business rule)
-- For Melhoraço, only the master admin sees logs
CREATE POLICY "Admins can view all logs" ON public.activity_logs
    FOR SELECT USING (auth.jwt() ->> 'email' = 'melhoracooficial@gmail.com');

-- Function to record activity (can be called via RPC or internal triggers)
CREATE OR REPLACE FUNCTION public.log_activity(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_details JSONB DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO public.activity_logs (user_id, user_email, action, entity_type, entity_id, details)
    VALUES (
        auth.uid(),
        auth.jwt() ->> 'email',
        p_action,
        p_entity_type,
        p_entity_id,
        p_details
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revoke public execution
REVOKE EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_activity(TEXT, TEXT, TEXT, JSONB) TO authenticated;
