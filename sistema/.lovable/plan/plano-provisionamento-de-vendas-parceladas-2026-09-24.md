# Plano — Provisionamento de vendas parceladas

## Resultado esperado
Ao aprovar uma venda em boleto parcelado, o sistema criará automaticamente uma conta a receber por parcela. Uma venda de R$ 1.000 em 4x gerará quatro parcelas de R$ 250, com vencimentos no intervalo definido no orçamento.

## Implementação
1. Criar uma operação segura no banco para provisionar ou atualizar as parcelas da venda, com identificação única por venda e número da parcela.
2. Preservar lançamentos já pagos e impedir duplicidade em duplo clique ou nova aprovação.
3. Acionar o provisionamento ao aprovar uma venda parcelada e oferecer uma ação na venda para provisionar pedidos antigos que ainda não possuem parcelas.
4. Exibir na venda o resumo das parcelas, vencimentos e situação; permitir marcar cada parcela como recebida ou pendente.
5. Fazer o calendário financeiro usar as parcelas provisionadas pela data de vencimento, sem somar novamente o valor integral da venda.
6. Manter a DRE reconhecendo somente parcelas recebidas como receita realizada; parcelas pendentes aparecem como contas a receber, não como caixa.

## Regras
- A primeira parcela vencerá após o intervalo configurado no boleto; as seguintes repetirão esse intervalo.
- O arredondamento ficará na última parcela para que a soma seja exatamente igual ao total da venda.
- Reprocessar o provisionamento será idempotente: não criará parcelas repetidas.
- Parcelas pagas não serão apagadas nem terão valor/vencimento alterados automaticamente.
- Não alterar InfinityPay, cálculos comerciais, documentos, RLS existentes ou outros módulos.

## Validação
- Testar divisão exata e com centavos, datas, idempotência e preservação de parcelas pagas.
- Validar o caso real de R$ 1.000 em 4x.
- Executar todos os testes, verificação de tipos e build.
