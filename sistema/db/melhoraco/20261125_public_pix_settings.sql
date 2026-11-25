-- Chave Pix da loja para a página pública do orçamento. Expõe só chave e nome
-- do recebedor (já exibidos ao cliente), nada mais de business_settings.
CREATE OR REPLACE FUNCTION melhoraco.get_public_pix_settings()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'melhoraco', 'public'
AS $$
  SELECT jsonb_build_object('pix_key', s.nubank_pix_key, 'pix_name', s.nubank_pix_name)
  FROM melhoraco.business_settings s
  WHERE s.user_id = (SELECT id FROM melhoraco.profiles WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1)
  LIMIT 1;
$$;
REVOKE ALL ON FUNCTION melhoraco.get_public_pix_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION melhoraco.get_public_pix_settings() TO anon, authenticated;
-- Dado: chave de celular gravada como +5585992753337 (sem +55 os bancos leem como CPF).
