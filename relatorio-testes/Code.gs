/**
 * Backend em Google Apps Script para a aplicacao "Relatorio de Testes".
 *
 * O que faz:
 *  - doGet(e)  -> serve o ficheiro Index.html, ou, se receber ?action=listarEsquemas,
 *                 devolve em JSON a lista de esquemas ja guardados para um Grupo/Tipo.
 *  - doPost(e) -> recebe os dados do formulario em JSON, guarda as fotos no Google Drive,
 *                 reutiliza esquemas ja guardados quando indicado, guarda esquemas novos
 *                 quando pedido, e envia um e-mail com todas as fotos em anexo.
 *
 * CONFIGURACAO OBRIGATORIA:
 *  1. Substituir FOLDER_ID pelo ID da pasta do Google Drive onde as fotos devem ficar guardadas.
 *     (o ID e a parte final do URL da pasta, depois de /folders/)
 */

var FOLDER_ID = '18H0wf27uzxFdDqdTOQ2f-9P6-zjwbGqO';

// Nome da empresa, mostrado no formulario e usado no assunto/corpo do e-mail.
var EMPRESA = 'Cablotec';

// Nomes das categorias de fotos aceites, e respetivos rotulos usados no e-mail/nome de ficheiro.
var CATEGORIAS = {
  responsavel: 'Fotografia do responsavel',
  eletrico: 'Teste eletrico',
  pressao: 'Pressao',
  especificacao: 'Especificacao da maquina',
  controlador: 'Controlador do compressor',
  deposito: 'Deposito de refrigeracao',
  vacuo: 'Teste de vacuo',
  esquemaEletrico: 'Esquema eletrico',
  esquemaFrio: 'Esquema de frio',
  ventilador: 'Ventilador'
};

// Categorias que suportam reutilizar/guardar um esquema por Grupo + Tipo de valvula.
var CATEGORIAS_ESQUEMA = ['esquemaEletrico', 'esquemaFrio'];

// Listas iniciais de sugestoes (codigos de esquema e gases). Ficam guardadas
// nas Propriedades do Script e crescem sozinhas quando alguem escreve um
// valor novo no formulario - nao e preciso voltar a mexer no codigo.
var LISTAS_PADRAO = {
  esquemasEletrico: [
    'DCE-SWE-WALKIN-P-PH-MAIN-F',
    'DCE-SWE-WALKIN-P-PL-PH-PLH-MAIN-G',
    'DCE-SWE-300-500-50-MAIN-B'
  ],
  esquemasFrio: [
    'DCR-SWE-030-EEV-MAIN-A',
    'DCR-SWE-030-R513A-MAIN-A',
    'DCR-SWE-033-MAIN-C',
    'DCR-SWE-033-EEV-MAIN-B',
    'DCR-SWE-046-EEV-MAIN-C',
    'DCR-SWE-046-R513A-MAIN-A',
    'DCR-SWE-068-R513A-MAIN-A',
    'DCR-SWE-068-EEV-MAIN-A',
    'DCR-SWE-067-MAIN-A',
    'DCR-SWE-067-MAIN-B',
    'DCR-SWE-108-R513A-MAIN-A',
    'DCR-SWE-108-EEV-MAIN-D',
    'DCR-SWE-2895K5E-TFD-B',
    'DCR-SWE-Ciclo-PH-R513A-00-MAIN-A',
    'DCR-SWE-Ciclo-PLH-R513A-01_07_04-MAIN-A',
    'DCR-SWE-Ciclo-PH-EEV09-MAIN-A',
    'DCR-SWE-Ciclo-PLH-EEV11_14-MAIN-A'
  ],
  gases: [
    'R449A',
    'R513A',
    'R404A',
    'R407C',
    'R410A',
    'R452A',
    'R134a',
    'R290',
    'CO2 (R744)',
    'Azoto (N2)'
  ]
};

function doGet(e) {
  var acao = e && e.parameter ? e.parameter.action : '';

  if (acao === 'listarEsquemas') {
    return listarEsquemasSalvos(e.parameter);
  }

  if (acao === 'carregarRascunho') {
    return carregarRascunho(e.parameter);
  }

  var tipoParametro = e && e.parameter ? e.parameter.tipo : '';
  var tipoRelatorio = tipoParametro === 'ciclos' ? 'ciclos' : 'testes';
  var tituloPagina = tipoRelatorio === 'ciclos' ? 'Relatorio de Ciclos' : 'Relatorio de Testes';

  var listas = {
    esquemasEletrico: obterLista('esquemasEletrico'),
    esquemasFrio: obterLista('esquemasFrio'),
    gases: obterLista('gases')
  };

  var template = HtmlService.createTemplateFromFile('Index');
  template.appsScriptUrl = ScriptApp.getService().getUrl();
  template.tipoRelatorio = tipoRelatorio;
  template.listasJson = JSON.stringify(listas);
  var saida = template.evaluate();
  saida.setTitle(EMPRESA + ' - ' + tituloPagina);
  saida.addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
  return saida;
}

/**
 * Devolve a lista guardada nas Propriedades do Script para o nome dado
 * (esquemasEletrico, esquemasFrio ou gases), semeando com a lista padrao
 * na primeira vez que for pedida.
 */
function obterLista(nomePropriedade) {
  var propriedades = PropertiesService.getScriptProperties();
  var valorGuardado = propriedades.getProperty(nomePropriedade);
  if (valorGuardado) {
    return JSON.parse(valorGuardado);
  }
  var padrao = LISTAS_PADRAO[nomePropriedade] || [];
  propriedades.setProperty(nomePropriedade, JSON.stringify(padrao));
  return padrao;
}

/**
 * Acrescenta um valor novo a uma lista guardada (se ainda nao existir),
 * para ficar disponivel como sugestao nos proximos envios.
 */
function adicionarValorNaLista(nomePropriedade, valor) {
  if (!valor) return;
  var lista = obterLista(nomePropriedade);
  if (lista.indexOf(valor) !== -1) return;
  lista.push(valor);
  var propriedades = PropertiesService.getScriptProperties();
  propriedades.setProperty(nomePropriedade, JSON.stringify(lista));
}

function doPost(e) {
  var resposta;
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('Pedido sem dados (postData.contents em falta).');
    }

    var dados = JSON.parse(e.postData.contents);

    if (dados.guardarComoRascunho === true) {
      return guardarProgresso(dados);
    }

    var serial = (dados.serial || '').toString().trim();
    var emailsInput = (dados.emails || '').toString().trim();
    var grupo = (dados.grupo || '').toString().trim();
    var tipoValvula = (dados.tipoValvula || '').toString().trim();
    var fotos = dados.fotos || {};
    var esquemasExistentes = dados.esquemasExistentes || {};
    var guardarEsquema = dados.guardarEsquema || {};
    var descricoesEsquema = dados.descricoesEsquema || {};
    var observacoes = (dados.observacoes || '').toString().trim();
    var gas = (dados.gas || '').toString().trim();
    var phPlh = (dados.phPlh || '').toString().trim();
    var tipoRelatorio = dados.tipoRelatorio === 'ciclos' ? 'ciclos' : 'testes';
    var nomeRelatorio = tipoRelatorio === 'ciclos' ? 'Relatorio de Ciclos' : 'Relatorio de Testes';
    var prefixoPasta = tipoRelatorio === 'ciclos' ? 'CICLO_' : 'SN_';

    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }
    if (!emailsInput) {
      throw new Error('Pelo menos um e-mail de destinatario e obrigatorio.');
    }
    if (!grupo) {
      throw new Error('Selecione o Grupo da maquina.');
    }
    if (!tipoValvula) {
      throw new Error('Selecione o Tipo de valvula.');
    }

    var emails = limparListaEmails(emailsInput);

    var folder = DriveApp.getFolderById(FOLDER_ID);

    var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmmss');
    var nomeSubpasta = prefixoPasta + sanitizeNome(serial) + '_Grupo' + sanitizeNome(grupo) + '_' + timestamp;
    var subfolder = folder.createFolder(nomeSubpasta);

    var pastaRascunhoExistente = obterPastaRascunho(serial, false);

    var anexos = [];
    var totalBytes = 0;
    var totalFotos = 0;

    var chaves = Object.keys(CATEGORIAS);
    for (var i = 0; i < chaves.length; i++) {
      var chave = chaves[i];
      var ehEsquema = ehCategoriaEsquema(chave);

      var fotosRascunho = anexarFotosDoRascunho(pastaRascunhoExistente, chave, CATEGORIAS[chave], subfolder);
      for (var k = 0; k < fotosRascunho.length; k++) {
        anexos.push(fotosRascunho[k]);
        totalBytes = totalBytes + fotosRascunho[k].getBytes().length;
        totalFotos = totalFotos + 1;
      }

      var fileIdExistente = ehEsquema ? esquemasExistentes[chave] : null;

      if (fileIdExistente) {
        var resultado = anexarEsquemaExistente(fileIdExistente, CATEGORIAS[chave], subfolder);
        if (resultado) {
          anexos.push(resultado.blob);
          totalBytes = totalBytes + resultado.blob.getBytes().length;
          totalFotos = totalFotos + 1;
        }
        continue;
      }

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

        if (ehEsquema && guardarEsquema[chave] === true) {
          guardarEsquemaNaBiblioteca(blob, chave, grupo, tipoValvula);
        }
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

    var corpo = EMPRESA + ' - ' + nomeRelatorio + ' da maquina.';
    corpo = corpo + '\n\n';
    corpo = corpo + 'Numero de serie: ' + serial + '\n';
    corpo = corpo + 'Grupo: ' + grupo + '\n';
    corpo = corpo + 'Tipo de valvula: ' + tipoValvula + '\n';
    if (phPlh) {
      corpo = corpo + 'Ciclo: ' + phPlh + '\n';
    }
    if (gas) {
      corpo = corpo + 'Gas: ' + gas + '\n';
    }
    corpo = corpo + 'Total de fotografias em anexo: ' + totalFotos + '\n';
    corpo = corpo + montarTextoDescricoesEsquema(descricoesEsquema);
    corpo = corpo + '\n';

    if (observacoes) {
      corpo = corpo + '\nObservacoes:\n' + observacoes + '\n';
    }

    corpo = corpo + '\nEste e-mail foi gerado automaticamente pela aplicacao de recolha de fotos de testes.';

    MailApp.sendEmail({
      to: emails,
      subject: EMPRESA + ' - ' + nomeRelatorio + ' - S/N: ' + serial + ' - Grupo ' + grupo,
      body: corpo,
      attachments: anexos
    });

    adicionarValorNaLista('esquemasEletrico', (descricoesEsquema.esquemaEletrico || '').toString().trim());
    adicionarValorNaLista('esquemasFrio', (descricoesEsquema.esquemaFrio || '').toString().trim());
    adicionarValorNaLista('gases', gas);

    if (pastaRascunhoExistente) {
      pastaRascunhoExistente.setTrashed(true);
    }

    resposta = { status: 'ok', mensagem: 'Enviado com sucesso.', fotos: totalFotos };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Constroi o texto com as descricoes dos esquemas (sugeridas pela Aralab),
 * uma linha por categoria de esquema que tenha descricao preenchida.
 */
function montarTextoDescricoesEsquema(descricoesEsquema) {
  var texto = '';
  for (var i = 0; i < CATEGORIAS_ESQUEMA.length; i++) {
    var chave = CATEGORIAS_ESQUEMA[i];
    var descricao = (descricoesEsquema[chave] || '').toString().trim();
    if (descricao) {
      texto = texto + '\n' + CATEGORIAS[chave] + ' - Descricao: ' + descricao;
    }
  }
  return texto;
}

/**
 * Guarda o progresso de um envio ainda incompleto (fotos + campos do
 * formulario) numa pasta de rascunho no Drive, identificada pelo numero
 * de serie. Nao envia e-mail nenhum. Usado quando um teste demora horas
 * (ex.: vacuo, pressao) e as fotos nao podem ficar so no telemovel.
 */
function guardarProgresso(dados) {
  var resposta;
  try {
    var serial = (dados.serial || '').toString().trim();
    if (!serial) {
      throw new Error('Numero de serie em falta para guardar o progresso.');
    }

    var pastaRascunho = obterPastaRascunho(serial, true);
    var fotos = dados.fotos || {};
    var chaves = Object.keys(CATEGORIAS);
    var totalNovas = 0;

    for (var i = 0; i < chaves.length; i++) {
      var chave = chaves[i];
      var lista = fotos[chave];
      if (!lista || !lista.length) continue;

      var pastaCategoria = obterOuCriarSubpasta(pastaRascunho, chave, true);
      for (var j = 0; j < lista.length; j++) {
        var dataUrl = lista[j];
        if (!dataUrl) continue;

        var blob = base64ParaBlob(dataUrl, CATEGORIAS[chave] + '_' + (j + 1));
        if (!blob) continue;

        pastaCategoria.createFile(blob);
        totalNovas = totalNovas + 1;
      }
    }

    var camposGuardados = {
      emails: dados.emails || '',
      grupo: dados.grupo || '',
      tipoValvula: dados.tipoValvula || '',
      tipoRelatorio: dados.tipoRelatorio || 'testes',
      phPlh: dados.phPlh || '',
      gas: dados.gas || '',
      observacoes: dados.observacoes || '',
      descricoesEsquema: dados.descricoesEsquema || {}
    };
    guardarDadosRascunho(pastaRascunho, camposGuardados);

    resposta = { status: 'ok', mensagem: 'Progresso guardado.', fotosGuardadas: totalNovas };
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Responde em JSON com os campos e as fotos ja guardadas num rascunho
 * para o numero de serie indicado (usado para retomar um envio).
 */
function carregarRascunho(parametros) {
  var resposta;
  try {
    var serial = (parametros.serial || '').toString().trim();
    if (!serial) {
      throw new Error('Numero de serie em falta.');
    }

    var pastaRascunho = obterPastaRascunho(serial, false);
    if (!pastaRascunho) {
      resposta = { status: 'ok', existe: false };
    } else {
      var dadosGuardados = lerDadosRascunho(pastaRascunho);
      var fotos = {};
      var chaves = Object.keys(CATEGORIAS);

      for (var i = 0; i < chaves.length; i++) {
        var chave = chaves[i];
        var pastaCategoria = obterOuCriarSubpasta(pastaRascunho, chave, false);
        var itens = [];

        if (pastaCategoria) {
          var ficheiros = pastaCategoria.getFiles();
          while (ficheiros.hasNext()) {
            var ficheiro = ficheiros.next();
            itens.push({ id: ficheiro.getId(), nome: ficheiro.getName() });
          }
        }

        fotos[chave] = itens;
      }

      resposta = { status: 'ok', existe: true, dados: dadosGuardados, fotos: fotos };
    }
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  var saida = ContentService.createTextOutput(JSON.stringify(resposta));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Devolve (ou cria) a pasta de rascunho para um numero de serie.
 */
function obterPastaRascunho(serial, criarSeNaoExistir) {
  if (!serial) return null;
  var raiz = DriveApp.getFolderById(FOLDER_ID);
  var pastaRascunhos = obterOuCriarSubpasta(raiz, 'Rascunhos', criarSeNaoExistir);
  if (!pastaRascunhos) return null;
  var nomePasta = 'RASCUNHO_' + sanitizeNome(serial);
  return obterOuCriarSubpasta(pastaRascunhos, nomePasta, criarSeNaoExistir);
}

function guardarDadosRascunho(pastaRascunho, dadosCampos) {
  var conteudo = JSON.stringify(dadosCampos);
  var existentes = pastaRascunho.getFilesByName('dados.json');
  if (existentes.hasNext()) {
    existentes.next().setTrashed(true);
  }
  var blob = Utilities.newBlob(conteudo, 'application/json', 'dados.json');
  pastaRascunho.createFile(blob);
}

function lerDadosRascunho(pastaRascunho) {
  var existentes = pastaRascunho.getFilesByName('dados.json');
  if (!existentes.hasNext()) return {};
  var conteudo = existentes.next().getBlob().getDataAsString();
  return JSON.parse(conteudo);
}

/**
 * Copia todas as fotos ja guardadas num rascunho, para uma dada
 * categoria, para a subpasta deste envio, devolvendo os blobs para
 * serem anexados ao e-mail.
 */
function anexarFotosDoRascunho(pastaRascunho, chave, nomeBase, subfolder) {
  var anexosRascunho = [];
  if (!pastaRascunho) return anexosRascunho;

  var pastaCategoria = obterOuCriarSubpasta(pastaRascunho, chave, false);
  if (!pastaCategoria) return anexosRascunho;

  var ficheiros = pastaCategoria.getFiles();
  var indice = 0;
  while (ficheiros.hasNext()) {
    var ficheiroOriginal = ficheiros.next();
    indice = indice + 1;
    var blob = ficheiroOriginal.getBlob();
    var extensao = obterExtensao(ficheiroOriginal.getName());
    var nomeFicheiro = sanitizeNome(nomeBase) + '_rascunho_' + indice + '.' + extensao;
    var blobRenomeado = blob.setName(nomeFicheiro);
    subfolder.createFile(blobRenomeado);
    anexosRascunho.push(blobRenomeado);
  }

  return anexosRascunho;
}

function ehCategoriaEsquema(chave) {
  for (var i = 0; i < CATEGORIAS_ESQUEMA.length; i++) {
    if (CATEGORIAS_ESQUEMA[i] === chave) {
      return true;
    }
  }
  return false;
}

/**
 * Copia um esquema ja guardado na biblioteca para a subpasta deste envio,
 * e devolve o blob para ser anexado ao e-mail.
 */
function anexarEsquemaExistente(fileId, nomeBase, subfolder) {
  var ficheiroOriginal = DriveApp.getFileById(fileId);
  var blob = ficheiroOriginal.getBlob();
  var extensao = obterExtensao(ficheiroOriginal.getName());
  var nomeFicheiro = sanitizeNome(nomeBase) + '_reutilizado.' + extensao;
  var blobRenomeado = blob.setName(nomeFicheiro);
  subfolder.createFile(blobRenomeado);
  return { blob: blobRenomeado };
}

function obterExtensao(nomeFicheiro) {
  var partes = nomeFicheiro.split('.');
  if (partes.length > 1) {
    return partes[partes.length - 1];
  }
  return 'jpg';
}

/**
 * Guarda uma copia do esquema na biblioteca permanente (organizada por
 * Grupo + Tipo de valvula), para poder ser reutilizado em maquinas futuras.
 */
function guardarEsquemaNaBiblioteca(blob, categoria, grupo, tipoValvula) {
  var pastaCategoria = obterPastaEsquemas(categoria, grupo, tipoValvula, true);
  var timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmmss');
  var nomeFicheiro = sanitizeNome(categoria) + '_' + timestamp + '.' + obterExtensao(blob.getName());
  var copia = blob.copyBlob();
  copia.setName(nomeFicheiro);
  pastaCategoria.createFile(copia);
}

/**
 * Devolve (ou cria) a pasta da biblioteca de esquemas para uma
 * categoria + Grupo + Tipo de valvula especifica.
 */
function obterPastaEsquemas(categoria, grupo, tipoValvula, criarSeNaoExistir) {
  var raiz = DriveApp.getFolderById(FOLDER_ID);
  var nomePastaGrupo = 'Esquemas_Guardados_Grupo' + sanitizeNome(grupo) + '_' + sanitizeNome(tipoValvula);
  var pastaGrupo = obterOuCriarSubpasta(raiz, nomePastaGrupo, criarSeNaoExistir);
  if (!pastaGrupo) {
    return null;
  }
  var pastaCategoria = obterOuCriarSubpasta(pastaGrupo, sanitizeNome(categoria), criarSeNaoExistir);
  return pastaCategoria;
}

function obterOuCriarSubpasta(pastaPai, nome, criarSeNaoExistir) {
  var existentes = pastaPai.getFoldersByName(nome);
  if (existentes.hasNext()) {
    return existentes.next();
  }
  if (criarSeNaoExistir) {
    return pastaPai.createFolder(nome);
  }
  return null;
}

/**
 * Responde em JSON a lista de esquemas ja guardados para uma
 * categoria + Grupo + Tipo de valvula (usado pelo frontend para
 * preencher o menu "usar esquema ja guardado").
 */
function listarEsquemasSalvos(parametros) {
  var resposta;
  try {
    var categoria = (parametros.categoria || '').toString().trim();
    var grupo = (parametros.grupo || '').toString().trim();
    var tipoValvula = (parametros.tipoValvula || '').toString().trim();

    if (!categoria || !grupo || !tipoValvula) {
      throw new Error('Parametros em falta (categoria, grupo, tipoValvula).');
    }

    var pastaCategoria = obterPastaEsquemas(categoria, grupo, tipoValvula, false);
    var itens = [];

    if (pastaCategoria) {
      var ficheiros = pastaCategoria.getFiles();
      while (ficheiros.hasNext()) {
        var ficheiro = ficheiros.next();
        itens.push({ id: ficheiro.getId(), nome: ficheiro.getName() });
      }
    }

    resposta = { status: 'ok', itens: itens };
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
