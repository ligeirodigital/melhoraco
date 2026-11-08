ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS approved_at timestamptz;
CREATE OR REPLACE FUNCTION public.capture_quote_approval_time() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.status='aprovado' AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'aprovado') THEN NEW.approved_at=now(); END IF;
 RETURN NEW;
END;
$$;
CREATE TRIGGER capture_quote_approval_time BEFORE INSERT OR UPDATE OF status ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.capture_quote_approval_time();
COMMENT ON COLUMN public.quotes.approved_at IS 'Approval transition timestamp for new approvals; historical rows are not backfilled.';
