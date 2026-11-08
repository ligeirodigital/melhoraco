ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS payment_method_type TEXT;
COMMENT ON COLUMN public.quotes.payment_method_type IS 'Tipo de pagamento escolhido: avista_pedido, avista_entrega, cartao_pedido, cartao_entrega, retirada, sinal_entrega, sinal_retirada';
