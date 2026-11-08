# Análise financeira com IA

## Objetivo
Adicionar ao módulo Financeiro uma área onde o gestor descreve uma situação e recebe uma análise clara do impacto das parcelas provisionadas no fluxo de caixa, com ações sugeridas.

## O que será criado
- Uma nova aba **Análise IA** no Financeiro, acessível no celular e no computador.
- Campo para descrever a situação, exemplos rápidos, botão de análise, carregamento, cancelamento, resultado e mensagens de erro claras.
- Resumo objetivo das parcelas: pendentes, vencidas, recebidas e valores previstos por período.
- Resposta estruturada em impacto, riscos, prioridades e ações recomendadas, sempre apresentada como apoio gerencial.

## Segurança e confiabilidade
- Criar uma função protegida que valide a sessão do gestor antes de consultar dados.
- Consultar somente os lançamentos financeiros pertencentes ao usuário autenticado.
- Enviar ao modelo apenas valores agregados e datas; não enviar nomes de clientes ou outros dados pessoais.
- Manter a chave da IA exclusivamente no ambiente protegido.
- Usar o modelo padrão `openai/gpt-6-astra` via AI Gateway, com resposta progressiva e tratamento correto dos erros do serviço.
- A análise será somente leitura: não criará, editará ou excluirá parcelas e lançamentos.

## Implementação técnica
- Criar um componente isolado para a experiência de análise e conectá-lo à aba do Financeiro.
- Criar uma função protegida para montar o panorama financeiro, construir as instruções e transmitir a resposta do AI Gateway.
- Limitar e validar o texto informado para evitar requisições vazias ou excessivas.
- Adicionar configuração da função e testes focados na interface, validação e interpretação do fluxo de resposta.
- Atualizar o roadmap sem interferir na pendência existente da Onda 4.

## Validação
- Executar testes relevantes e verificação de tipos.
- Confirmar o funcionamento real da chamada ao AI Gateway.
- Validar visualmente no Financeiro em desktop e celular, incluindo texto longo, carregamento e falha.
