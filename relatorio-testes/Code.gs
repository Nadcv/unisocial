/**
 * Backend em Google Apps Script para a aplicação "Relatório de Testes".
 *
 * O que faz:
 *  - doGet(e)  -> serve o ficheiro Index.html (para usar o Apps Script também como alojamento do frontend).
 *  - doPost(e) -> recebe { serial, emails, fotos } em JSON, guarda as fotos no Google Drive
 *                 e envia um e-mail com todas as fotos em anexo.
 *
 * CONFIGURAÇÃO OBRIGATÓRIA:
 *  1. Substituir FOLDER_ID pelo ID da pasta do Google Drive onde as fotos devem ficar guardadas.
 *     (o ID é a parte final do URL da pasta, depois de /folders/)
 */

var FOLDER_ID = '18H0wf27uzxFdDqdTOQ2f-9P6-zjwbGqO';

// Nomes das categorias de fotos aceites, e respetivos rótulos usados no e-mail/nome de ficheiro.
var CATEGORIAS = {
  responsavel: 'Fotografia do responsavel',
  eletrico: 'Teste eletrico',
  pressao: 'Pressao',
  especificacao: 'Especificacao da maquina',
  controlador: 'Controlador do compressor',
  deposito: 'Deposito de refrigeracao',
  vacuo: 'Teste de vacuo'
};

function doGet(e) {
  var template = HtmlService.createTemplateFromFile('Index');
  template.appsScriptUrl = ScriptApp.getService().getUrl();
  var saida = template.evaluate();
  saida.setTitle('Relatorio de Testes');
  saida.addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
  return saida;
}

function doPost(e) {
  var resposta;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Pedido sem dados (postData.contents em falta).');
    }

    var dados = JSON.parse(e.postData.contents);
    var serial = (dados.serial || '').toString().trim();
    var emailsInput = (dados.emails || '').toString().trim();
    var fotos = dados.fotos || {};

    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }
    if (!emailsInput) {
      throw new Error('Pelo menos um e-mail de destinatario e obrigatorio.');
    }

    var emails = limparListaEmails(emailsInput);

    var folder = DriveApp.getFolderById(FOLDER_ID);

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmmss');
    var nomeSubpasta = 'SN_' + sanitizeNome(serial) + '_' + timestamp;
    var subfolder = folder.createFolder(nomeSubpasta);

    var anexos = [];
    var totalBytes = 0;
    var totalFotos = 0;

    var chaves = Object.keys(CATEGORIAS);
    for (var i = 0; i < chaves.length; i++) {
      var chave = chaves[i];
      var lista = fotos[chave];
      if (!lista || !lista.length) continue;

      for (var j = 0; j < lista.length; j++) {
        var dataUrl = lista[j];
        if (!dataUrl) continue;

        var blob = base64ParaBlob(dataUrl, CATEGORIAS[chave] + '_' + (j + 1));
        if (!blob) continue;

        subfolder.createFile(blob);
        anexos.push(blob);
        totalBytes = totalBytes + blob.getBytes().length;
        totalFotos = totalFotos + 1;
      }
    }

    if (totalFotos === 0) {
      throw new Error('Nenhuma fotografia foi recebida.');
    }

    var limiteBytes = 25 * 1024 * 1024;
    if (totalBytes > limiteBytes) {
      var totalMB = Math.round(totalBytes / 1024 / 1024);
      throw new Error('O total de anexos (' + totalMB + ' MB) excede o limite de ~25 MB do Gmail. Reduza o numero ou o tamanho das fotos.');
    }

    var corpo = 'Relatorio de testes da maquina.';
    corpo = corpo + '\n\n';
    corpo = corpo + 'Numero de serie: ' + serial + '\n';
    corpo = corpo + 'Total de fotografias em anexo: ' + totalFotos + '\n\n';
    corpo = corpo + 'Este e-mail foi gerado automaticamente pela aplicacao de recolha de fotos de testes.';

    MailApp.sendEmail({
      to: emails,
      subject: 'Relatorio de Testes - S/N: ' + serial,
      body: corpo,
      attachments: anexos
    });

    resposta = { status: 'ok', mensagem: 'Enviado com sucesso.', fotos: totalFotos };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

function limparListaEmails(texto) {
  var partes = texto.split(',');
  var limpas = [];
  for (var i = 0; i < partes.length; i++) {
    var parte = partes[i].trim();
    if (parte.length > 0) {
      limpas.push(parte);
    }
  }
  return limpas.join(',');
}

/**
 * Converte uma string "data:image/jpeg;base64,...." num Blob do Apps Script.
 */
function base64ParaBlob(dataUrl, nomeBase) {
  var match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) {
    return null;
  }

  var mimeType = match[1];
  var base64 = match[2];
  var extensao = mimeType.split('/')[1] || 'jpg';

  var bytes = Utilities.base64Decode(base64);
  var nomeFicheiro = sanitizeNome(nomeBase) + '.' + extensao;
  var blob = Utilities.newBlob(bytes, mimeType, nomeFicheiro);
  return blob;
}

function sanitizeNome(texto) {
  return texto.toString().replace(/[^a-zA-Z0-9_-]+/g, '_');
}
