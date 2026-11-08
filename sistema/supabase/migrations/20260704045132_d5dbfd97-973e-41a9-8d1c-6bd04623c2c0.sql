CREATE OR REPLACE FUNCTION public.consume_referral_code(p_quote_id uuid, p_token text, p_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_quote_ok boolean;
  v_referral public.referrals%ROWTYPE;
  v_client_id uuid;
  v_owner uuid;
BEGIN
  SELECT EXISTS(SELECT 1 FROM public.quotes WHERE id = p_quote_id AND client_view_token = p_token)
    INTO v_quote_ok;
  IF NOT v_quote_ok THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_quote');
  END IF;

  SELECT * INTO v_referral FROM public.referrals
   WHERE referral_code = trim(p_code) AND status = 'ativo'
   LIMIT 1;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code');
  END IF;

  SELECT client_id, user_id INTO v_client_id, v_owner FROM public.quotes WHERE id = p_quote_id;

  UPDATE public.referrals
     SET status = 'usado',
         referred_client_id = v_client_id,
         used_quote_id = p_quote_id,
         used_at = now(),
         updated_at = now()
   WHERE id = v_referral.id;

  -- Aplica desconto percentual no orçamento (não sobrescreve desconto maior já existente)
  UPDATE public.quotes
     SET referral_code = trim(p_code),
         discount_type = 'percent',
         discount_amount = GREATEST(COALESCE(discount_amount, 0), COALESCE(v_referral.discount_pct, 0)),
         updated_at = now()
   WHERE id = p_quote_id;

  -- Credita a recompensa como despesa (comissão de indicação) no fluxo de caixa do dono
  IF COALESCE(v_referral.reward_amount, 0) > 0 THEN
    INSERT INTO public.cash_flow_transactions
      (user_id, description, amount, type, category, transaction_date, status, quote_id)
    VALUES
      (v_owner,
       'Recompensa indicação ' || v_referral.referral_code,
       v_referral.reward_amount,
       'expense',
       'Indicações',
       now(),
       'pending',
       p_quote_id);
  END IF;

  RETURN jsonb_build_object('ok', true, 'reward_amount', v_referral.reward_amount, 'discount_pct', v_referral.discount_pct);
END;
$$;
