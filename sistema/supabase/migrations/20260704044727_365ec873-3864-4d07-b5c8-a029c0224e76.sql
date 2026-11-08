CREATE OR REPLACE FUNCTION public.consume_referral_code(
  p_quote_id UUID,
  p_token TEXT,
  p_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_ok BOOLEAN;
  v_referral public.referrals%ROWTYPE;
  v_client_id UUID;
BEGIN
  -- Valida token do orçamento
  SELECT EXISTS(SELECT 1 FROM public.quotes WHERE id = p_quote_id AND client_view_token = p_token)
    INTO v_quote_ok;
  IF NOT v_quote_ok THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_quote');
  END IF;

  -- Busca código
  SELECT * INTO v_referral FROM public.referrals
  WHERE referral_code = trim(p_code) AND status = 'ativo'
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  -- Pega o cliente do orçamento
  SELECT client_id INTO v_client_id FROM public.quotes WHERE id = p_quote_id;

  -- Marca como usado
  UPDATE public.referrals
     SET status = 'usado',
         referred_client_id = v_client_id,
         used_quote_id = p_quote_id,
         used_at = now(),
         updated_at = now()
   WHERE id = v_referral.id;

  -- Grava o código no orçamento
  UPDATE public.quotes SET referral_code = trim(p_code), updated_at = now()
   WHERE id = p_quote_id;

  RETURN jsonb_build_object('ok', true, 'reward_amount', v_referral.reward_amount);
END;
$$;

GRANT EXECUTE ON FUNCTION public.consume_referral_code(UUID, TEXT, TEXT) TO anon, authenticated;
