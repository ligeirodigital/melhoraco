/**
 * Recebe as vendas pagas do site (melhoraco.vercel.app) e lança na aba "Vendas".
 *
 * Como instalar (uma vez):
 * 1. Na planilha, abra Extensões > Apps Script, apague o que houver e cole este código.
 * 2. Em Configurações do projeto (engrenagem): fuso horário "(GMT-03:00) Fortaleza".
 *    Em "Propriedades do script", adicione SECRET com uma senha longa qualquer
 *    (a mesma que vai no SHEETS_SECRET da Vercel).
 * 3. Implantar > Nova implantação > tipo "App da Web"
 *    Executar como: Eu · Quem pode acessar: Qualquer pessoa.
 *    Autorize e copie a URL do app da Web (termina em /exec) para o SHEETS_WEBHOOK_URL da Vercel.
 */

var PLANILHA_ID = '1ShJpsASXjHgd5vNbOvb4fZGMMfqglXfAc3-BYzf8pAA';

function doPost(e) {
  var v;
  try {
    v = JSON.parse(e.postData.contents);
  } catch (err) {
    return resposta({ ok: false, erro: 'json invalido' });
  }

  var segredo = PropertiesService.getScriptProperties().getProperty('SECRET');
  if (!segredo || v.secret !== segredo) return resposta({ ok: false, erro: 'nao autorizado' });

  var trava = LockService.getScriptLock();
  trava.waitLock(20000);
  try {
    var aba = SpreadsheetApp.openById(PLANILHA_ID).getSheetByName('Vendas');
    var marca = 'MP #' + v.payment_id;

    // Ignora o mesmo pagamento avisado mais de uma vez pelo Mercado Pago.
    var obs = aba.getRange('I2:I').getValues();
    for (var i = 0; i < obs.length; i++) {
      if (String(obs[i][0]).indexOf(marca) >= 0) return resposta({ ok: true, duplicate: true });
    }

    // Primeira linha vazia na coluna Data (as colunas M:P têm fórmulas que ocupam a aba toda).
    var datas = aba.getRange('A2:A').getValues();
    var linha = 2;
    while (linha - 2 < datas.length && datas[linha - 2][0] !== '') linha++;

    var agora = new Date();
    var hoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate());

    var observacao = [
      'Site', marca, v.pedido_id,
      'Nº ' + v.numero_casa + ' · ' + v.tamanho + ' cm',
      'Tel ' + v.telefone,
      v.endereco + ' - ' + v.cidade + ' - CEP ' + v.cep,
      v.parcelas > 1 ? v.parcelas + 'x' : '',
      v.observacao ? 'Obs: ' + v.observacao : ''
    ].filter(String).join(' | ');

    aba.getRange(linha, 1, 1, 12).setValues([[
      hoje,                              // A Data
      v.nome,                            // B Cliente
      v.bairro,                          // C Bairro
      'Site',                            // D Canal de origem
      Number(v.digitos),                 // E Dígitos
      Number(v.total),                   // F Valor (R$), entrega inclusa
      v.pagamento,                       // G Pagamento
      v.instalacao ? 'Sim' : 'Não',      // H Instalação
      observacao,                        // I Observações
      '',                                // J Custo de entrega (você preenche)
      '',                                // K Custo de instalação (você preenche)
      Number(v.taxa_pct) || 0            // L Taxa do Mercado Pago (%)
    ]]);

    return resposta({ ok: true, linha: linha });
  } finally {
    trava.releaseLock();
  }
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
