-- =========================
-- 1) CONTRACTS
-- =========================
CREATE TABLE public.contracts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  pdf_url TEXT,
  signature_url TEXT,
  signed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'rascunho',
  terms_snapshot JSONB,
  service_order_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, contract_number)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contracts TO authenticated;
GRANT ALL ON public.contracts TO service_role;

ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own contracts" ON public.contracts
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX contracts_quote_idx ON public.contracts(quote_id);

CREATE TRIGGER contracts_updated_at
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 2) INSTALLATION SCHEDULE
-- =========================
CREATE TABLE public.installation_schedule (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  duration_hours NUMERIC(4,2) DEFAULT 2,
  address TEXT,
  installer_name TEXT,
  installer_phone TEXT,
  status TEXT NOT NULL DEFAULT 'agendado',
  notes TEXT,
  client_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_schedule TO authenticated;
GRANT ALL ON public.installation_schedule TO service_role;

ALTER TABLE public.installation_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own installations" ON public.installation_schedule
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX installation_schedule_user_date_idx
  ON public.installation_schedule(user_id, scheduled_date);

CREATE TRIGGER installation_schedule_updated_at
  BEFORE UPDATE ON public.installation_schedule
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 3) REFERRALS
-- =========================
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  referral_code TEXT NOT NULL UNIQUE,
  referred_client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 5,
  reward_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ativo',
  used_quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own referrals" ON public.referrals
  FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX referrals_user_idx ON public.referrals(user_id);
CREATE INDEX referrals_code_idx ON public.referrals(referral_code);

CREATE TRIGGER referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- 4) QUOTES.referral_code
-- =========================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS referral_code TEXT;

-- =========================
-- 5) Public function: validate referral by code (SECURITY DEFINER)
--    devolve apenas dados mínimos, não expõe user_id
-- =========================
CREATE OR REPLACE FUNCTION public.validate_referral_code(p_code TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row public.referrals%ROWTYPE;
BEGIN
  IF p_code IS NULL OR length(trim(p_code)) = 0 THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'empty');
  END IF;

  SELECT * INTO v_row FROM public.referrals
  WHERE referral_code = trim(p_code)
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_found');
  END IF;

  IF v_row.status <> 'ativo' THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'not_active');
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  RETURN jsonb_build_object(
    'valid', true,
    'discount_pct', v_row.discount_pct,
    'code', v_row.referral_code
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.validate_referral_code(TEXT) TO anon, authenticated;
