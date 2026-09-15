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
  // Preenche o URL da própria implantação automaticamente, para não ser
  // preciso copiar/colar o URL /exec à mão dentro do ficheiro Index.
  template.appsScriptUrl = ScriptApp.getService().getUrl();
  return template.evaluate()
    .setTitle('Relatório de Testes')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
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
      throw new Error('Número de série em falta.');
    }
    if (!emailsInput) {
      throw new Error('Pelo menos um e-mail de destinatário é obrigatório.');
    }

    var emails = emailsInput
      .split(',')
      .map(function (s) { return s.trim(); })
      .filter(function (s) { return s.length > 0; })
      .join(',');

    var folder = DriveApp.getFolderById(FOLDER_ID);

    // Subpasta por envio: "S/N - <serial> - <timestamp>"
    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmmss');
    var subfolder = folder.createFolder('SN_' + sanitizeNome(serial) + '_' + timestamp);

    var anexos = [];
    var totalBytes = 0;
    var totalFotos = 0;

    Object.keys(CATEGORIAS).forEach(function (chave) {
      var lista = fotos[chave];
      if (!lista || !lista.length) return;

      lista.forEach(function (dataUrl, indice) {
        if (!dataUrl) return;

        var blobInfo = base64ParaBlob(dataUrl, CATEGORIAS[chave] + '_' + (indice + 1));
        if (!blobInfo) return;

        subfolder.createFile(blobInfo.blob);
        anexos.push(blobInfo.blob);
        totalBytes += blobInfo.blob.getBytes().length;
        totalFotos++;
      });
    });

    if (totalFotos === 0) {
      throw new Error('Nenhuma fotografia foi recebida.');
    }

    // Aviso preventivo: o Gmail aceita cerca de 25 MB de anexos no total.
    if (totalBytes > 25 * 1024 * 1024) {
      throw new Error(
        'O total de anexos (' + Math.round(totalBytes / 1024 / 1024) +
        ' MB) excede o limite de ~25 MB do Gmail. Reduza o número ou o tamanho das fotos.'
      );
    }

    var corpo =
      'Relatório de testes da máquina.\n\n' +
      'Número de série: ' + serial + '\n' +
      'Total de fotografias em anexo: ' + totalFotos + '\n\n' +
      'Este e-mail foi gerado automaticamente pela aplicação de recolha de fotos de testes.';

    MailApp.sendEmail({
      to: emails,
      subject: 'Relatório de Testes - S/N: ' + serial,
      body: corpo,
      attachments: anexos
    });

    resposta = { status: 'ok', mensagem: 'Enviado com sucesso.', fotos: totalFotos };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  return ContentService
    .createTextOutput(JSON.stringify(resposta))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Converte uma string "data:image/jpeg;base64,...." num Blob do Apps Script.
 */
function base64ParaBlob(dataUrl, nomeBase) {
  var match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/.exec(dataUrl);
  if (!match) return null;

  var mimeType = match[1];
  var base64 = match[2];
  var extensao = mimeType.split('/')[1] || 'jpg';

  var bytes = Utilities.base64Decode(base64);
  var blob = Utilities.newBlob(bytes, mimeType, sanitizeNome(nomeBase) + '.' + extensao);
  return { blob: blob };
}

function sanitizeNome(texto) {
  return texto.toString().replace(/[^a-zA-Z0-9_-]+/g, '_');
}
