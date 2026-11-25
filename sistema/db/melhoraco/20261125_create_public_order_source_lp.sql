-- LP do quiz passa a criar orçamento pelo create_public_order.
-- Permite que o chamador informe a origem ('store' ou 'lp'); qualquer outro
-- valor (ou ausência) continua gravando 'store', como antes.
DO $mig$
DECLARE
  v_def text := pg_get_functiondef('melhoraco.create_public_order(jsonb)'::regprocedure);
  v_new text;
BEGIN
  v_new := replace(v_def,
    E'NULLIF(v_customer->>''notes'',''''),\n          ''store'',',
    E'NULLIF(v_customer->>''notes'',''''),\n          CASE WHEN payload->>''source'' IN (''store'',''lp'') THEN payload->>''source'' ELSE ''store'' END,');
  IF v_new = v_def THEN
    RAISE EXCEPTION 'create_public_order: trecho da origem não encontrado';
  END IF;
  EXECUTE v_new;
END
$mig$;
