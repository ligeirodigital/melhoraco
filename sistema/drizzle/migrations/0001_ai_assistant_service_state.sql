CREATE TABLE public.ai_assistant_service_state (
  service text PRIMARY KEY,
  status_code integer NOT NULL,
  safe_message text NOT NULL,
  block_type text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.ai_assistant_service_state TO service_role;
ALTER TABLE public.ai_assistant_service_state ENABLE ROW LEVEL SECURITY;
COMMENT ON TABLE public.ai_assistant_service_state IS 'Server-only persisted AI access blocks; contains no financial records or credentials.';
