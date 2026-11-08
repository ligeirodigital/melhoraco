ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS next_follow_up_at date, ADD COLUMN IF NOT EXISTS lost_reason text;

CREATE OR REPLACE FUNCTION public.record_quote_whatsapp_contact(p_quote_id uuid, p_content text, p_type text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = public AS $$
DECLARE v_client_id uuid;
BEGIN
 IF auth.uid() IS NULL OR p_type NOT IN ('follow_up_whatsapp','cobranca_pagamento') OR nullif(trim(p_content),'') IS NULL THEN
  RAISE EXCEPTION 'Contato inválido ou sem autenticação';
 END IF;
 SELECT client_id INTO v_client_id FROM public.quotes WHERE id=p_quote_id AND user_id=auth.uid()
 AND ((p_type='follow_up_whatsapp' AND status='pendente') OR (p_type='cobranca_pagamento' AND status='aprovado' AND payment_status='pending')) FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Orçamento indisponível para este contato'; END IF;
 INSERT INTO public.interactions(client_id,type,content,created_by) VALUES(v_client_id,p_type,p_content,auth.uid());
 IF p_type='follow_up_whatsapp' THEN
  UPDATE public.quotes SET last_follow_up=now() WHERE id=p_quote_id AND user_id=auth.uid();
 END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.record_quote_whatsapp_contact(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_quote_whatsapp_contact(uuid,text,text) TO authenticated;
