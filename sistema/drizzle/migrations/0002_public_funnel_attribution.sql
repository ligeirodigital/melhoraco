ALTER TABLE public.quotes
 ADD COLUMN IF NOT EXISTS utm_source text, ADD COLUMN IF NOT EXISTS utm_medium text,
 ADD COLUMN IF NOT EXISTS utm_campaign text, ADD COLUMN IF NOT EXISTS utm_content text,
 ADD COLUMN IF NOT EXISTS utm_term text, ADD COLUMN IF NOT EXISTS fbclid text,
 ADD COLUMN IF NOT EXISTS gclid text, ADD COLUMN IF NOT EXISTS referrer text,
 ADD COLUMN IF NOT EXISTS lead_origin text;
ALTER TABLE public.quiz_leads
 ADD COLUMN IF NOT EXISTS fbclid text, ADD COLUMN IF NOT EXISTS gclid text,
 ADD COLUMN IF NOT EXISTS event_id text, ADD COLUMN IF NOT EXISTS page_path text,
 ADD COLUMN IF NOT EXISTS product_landing_page_id uuid REFERENCES public.product_landing_pages(id);
ALTER TABLE public.whatsapp_clicks
 ADD COLUMN IF NOT EXISTS fbclid text, ADD COLUMN IF NOT EXISTS gclid text,
 ADD COLUMN IF NOT EXISTS event_id text, ADD COLUMN IF NOT EXISTS page_path text;
CREATE UNIQUE INDEX IF NOT EXISTS quiz_leads_event_id_unique ON public.quiz_leads(event_id) WHERE event_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_clicks_event_id_unique ON public.whatsapp_clicks(event_id) WHERE event_id IS NOT NULL;
DO $migration$
DECLARE definition text; original text; columns_old text; columns_new text; values_old text; values_new text;
BEGIN
 original := pg_get_functiondef('public.create_public_order(jsonb)'::regprocedure);
 columns_old := 'delivery_fee, referral_code, discount_type, discount_amount)';
 columns_new := 'delivery_fee, referral_code, discount_type, discount_amount, utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbclid, gclid, referrer)';
 values_old := 'CASE WHEN v_discount_pct > 0 THEN v_discount_pct ELSE 0 END)';
 values_new := 'CASE WHEN v_discount_pct > 0 THEN v_discount_pct ELSE 0 END,
 NULLIF(left(payload->''attribution''->>''utm_source'',1000),''''),
 NULLIF(left(payload->''attribution''->>''utm_medium'',1000),''''),
 NULLIF(left(payload->''attribution''->>''utm_campaign'',1000),''''),
 NULLIF(left(payload->''attribution''->>''utm_content'',1000),''''),
 NULLIF(left(payload->''attribution''->>''utm_term'',1000),''''),
 NULLIF(left(payload->''attribution''->>''fbclid'',1000),''''),
 NULLIF(left(payload->''attribution''->>''gclid'',1000),''''),
 NULLIF(left(payload->''attribution''->>''referrer'',1000),''''))';
 IF position(columns_old in original)=0 OR position(values_old in original)=0 THEN RAISE EXCEPTION 'Order INSERT differs from audited definition'; END IF;
 definition := replace(replace(original, columns_old, columns_new), values_old, values_new);
 EXECUTE definition;
END;
$migration$;
