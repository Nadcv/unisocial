/**
 * Backend em Google Apps Script para o "Controlo de Producao" da Cablotec.
 *
 * E um script LIGADO A UMA GOOGLE SHEET (script vinculado ao ficheiro, nao
 * standalone): abra uma Google Sheet nova e vazia, va a
 * Extensoes -> Apps Script, e cole este ficheiro la. Os dados ficam todos
 * na propria folha de calculo (uma aba "Grupos" e uma aba "Ciclos"), o que
 * permite ver/editar tudo diretamente na folha, e tambem usar o formulario
 * movel (Index.html) para atualizacoes rapidas.
 *
 * Liga-se ao script de "Relatorio de Testes" de forma solta: usa o mesmo
 * numero de serie como identificador comum, e pode apontar para a mesma
 * pasta do Drive (FOLDER_ID_RELATORIOS) so para mostrar um atalho "Ver
 * fotos deste numero de serie".
 */

// Nome da empresa, mostrado no formulario e nos e-mails.
var EMPRESA = 'Cablotec';

// ID da pasta do Drive onde o script de "Relatorio de Testes" guarda as
// fotos (opcional). Se preenchido, mostra um atalho no formulario para
// abrir o Drive e procurar as fotos desse numero de serie. Deixe vazio
// ('') se nao quiser este atalho.
var FOLDER_ID_RELATORIOS = '18H0wf27uzxFdDqdTOQ2f-9P6-zjwbGqO';

// Nomes das abas na Google Sheet, uma para cada tipo de producao.
var ABAS = {
  grupos: 'Grupos',
  ciclos: 'Ciclos'
};

// Colunas fixas (antes das etapas), pela ordem em que aparecem na folha.
var COLUNAS_BASE = [
  'Numero de serie',
  'Grupo/Tipo',
  'Estado geral',
  'Em atraso',
  'Previsao de saida',
  'Data de entrega',
  'Materiais em falta',
  'Materiais entregues',
  'Numeros de serie anteriores',
  'Criado em',
  'Atualizado em'
];

// Etapas de producao, pela ordem indicada. "chave" e o identificador usado
// no JSON (sem acentos), "rotulo" e o texto mostrado ao utilizador/na folha.
var ETAPAS = [
  { chave: 'preparacao', rotulo: 'Preparacao' },
  { chave: 'embalamento', rotulo: 'Embalamento' },
  { chave: 'desmontagem', rotulo: 'Desmontagem' },
  { chave: 'montagem', rotulo: 'Montagem' },
  { chave: 'intervencaoExtra', rotulo: 'Intervencao extra' },
  { chave: 'corteTubo', rotulo: 'Corte de tubo' },
  { chave: 'soldaduraHvac', rotulo: 'Montagem e soldadura HVAC' },
  { chave: 'eletrificacaoGrupo', rotulo: 'Eletrificacao do grupo' },
  { chave: 'eletrificacaoQuadro', rotulo: 'Eletrificacao do quadro' },
  { chave: 'isolamento', rotulo: 'Isolamento' },
  { chave: 'testeEletrico', rotulo: 'Teste eletrico' },
  { chave: 'testePressao', rotulo: 'Teste de pressao' },
  { chave: 'testeVacuo', rotulo: 'Teste de vacuo' }
];

// Indices das colunas fixas (1-based, como o Apps Script espera nos Ranges).
var COL = {
  SERIAL: 1,
  GRUPO: 2,
  ESTADO: 3,
  ATRASO: 4,
  PREVISAO: 5,
  ENTREGA: 6,
  MAT_FALTA: 7,
  MAT_ENTREGUE: 8,
  HISTORICO: 9,
  CRIADO: 10,
  ATUALIZADO: 11
};

var TOTAL_COLUNAS_BASE = COLUNAS_BASE.length; // 11
var COL_PRIMEIRA_ETAPA = TOTAL_COLUNAS_BASE + 1; // 12

// Listas iniciais de sugestoes para o campo "Grupo/Tipo", uma por tipo.
var LISTAS_PADRAO = {
  gruposProducao: ['30', '46', '67', '68', '107', '108'],
  ciclosProducao: ['PH', 'PLH']
};

function doGet(e) {
  var acao = e && e.parameter ? e.parameter.action : '';

  if (acao === 'listar') {
    return respostaJson(listarRegistos(e.parameter.tipo, e.parameter.filtro));
  }

  if (acao === 'obter') {
    return respostaJson(obterRegisto(e.parameter.tipo, e.parameter.serial));
  }

  var listas = {
    gruposProducao: obterLista('gruposProducao'),
    ciclosProducao: obterLista('ciclosProducao')
  };

  var template = HtmlService.createTemplateFromFile('Index');
  template.appsScriptUrl = ScriptApp.getService().getUrl();
  template.listasJson = JSON.stringify(listas);
  template.folderIdRelatorios = FOLDER_ID_RELATORIOS || '';
  var saida = template.evaluate();
  saida.setTitle(EMPRESA + ' - Controlo de Producao');
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

    if (dados.acao === 'guardarRegisto') {
      resposta = guardarRegisto(dados);
    } else if (dados.acao === 'mudarNumeroSerie') {
      resposta = mudarNumeroSerie(dados);
    } else if (dados.acao === 'enviarResumo') {
      resposta = enviarResumoProducao(dados);
    } else {
      throw new Error('Acao desconhecida.');
    }
  } catch (erro) {
    resposta = { status: 'erro', msg: erro && erro.message ? erro.message : String(erro) };
  }

  return respostaJson(resposta);
}

function respostaJson(objeto) {
  var saida = ContentService.createTextOutput(JSON.stringify(objeto));
  saida.setMimeType(ContentService.MimeType.JSON);
  return saida;
}

/**
 * Devolve a aba (Sheet) correta para o tipo pedido ("grupos" ou "ciclos"),
 * criando-a com os cabecalhos corretos se ainda nao existir.
 */
function obterAba(tipo) {
  var nomeAba = ABAS[tipo];
  if (!nomeAba) {
    throw new Error('Tipo invalido: ' + tipo + ' (use "grupos" ou "ciclos").');
  }

  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.getSheetByName(nomeAba);
  if (aba) {
    return aba;
  }

  aba = folha.insertSheet(nomeAba);
  var cabecalhos = COLUNAS_BASE.concat(ETAPAS.map(function (et) { return et.rotulo; }));
  aba.getRange(1, 1, 1, cabecalhos.length).setValues([cabecalhos]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, cabecalhos.length).setFontWeight('bold');

  // Formata como texto simples as colunas com datas/horas escritas por nos,
  // para o Sheets nao as reinterpretar/reformatar sozinho.
  var colunasTexto = [COL.PREVISAO, COL.ENTREGA, COL.CRIADO, COL.ATUALIZADO];
  colunasTexto.forEach(function (c) {
    aba.getRange(2, c, 1000, 1).setNumberFormat('@');
  });
  aba.getRange(2, COL_PRIMEIRA_ETAPA, 1000, ETAPAS.length).setNumberFormat('@');

  return aba;
}

/**
 * Devolve o numero da linha (1-based, incluindo o cabecalho) onde esta o
 * numero de serie indicado, ou -1 se nao existir.
 */
function encontrarLinha(aba, serial) {
  var alvo = serial.toString().trim().toLowerCase();
  if (!alvo) return -1;

  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return -1;

  var valores = aba.getRange(2, COL.SERIAL, ultimaLinha - 1, 1).getValues();
  for (var i = 0; i < valores.length; i++) {
    if (valores[i][0].toString().trim().toLowerCase() === alvo) {
      return i + 2;
    }
  }
  return -1;
}

/**
 * Converte uma linha da folha (array de valores) num objeto JSON amigavel
 * para o frontend, incluindo o estado de cada etapa.
 */
function linhaParaObjeto(valores) {
  var etapas = {};
  ETAPAS.forEach(function (et, indice) {
    etapas[et.chave] = (valores[COL_PRIMEIRA_ETAPA - 1 + indice] || '').toString();
  });

  return {
    serial: (valores[COL.SERIAL - 1] || '').toString(),
    grupo: (valores[COL.GRUPO - 1] || '').toString(),
    estado: (valores[COL.ESTADO - 1] || 'Em curso').toString(),
    emAtraso: (valores[COL.ATRASO - 1] || 'Nao').toString(),
    previsaoSaida: (valores[COL.PREVISAO - 1] || '').toString(),
    dataEntrega: (valores[COL.ENTREGA - 1] || '').toString(),
    materiaisEmFalta: (valores[COL.MAT_FALTA - 1] || '').toString(),
    materiaisEntregues: (valores[COL.MAT_ENTREGUE - 1] || '').toString(),
    serialAnteriores: (valores[COL.HISTORICO - 1] || '').toString(),
    criadoEm: (valores[COL.CRIADO - 1] || '').toString(),
    atualizadoEm: (valores[COL.ATUALIZADO - 1] || '').toString(),
    etapas: etapas
  };
}

/**
 * Responde com a lista de registos de um tipo, filtrada por estado
 * ("todos", "emCurso", "terminados" ou "atraso").
 */
function listarRegistos(tipo, filtro) {
  var aba = obterAba(tipo);
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return { status: 'ok', itens: [] };

  var todasAsLinhas = aba.getRange(2, 1, ultimaLinha - 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues();
  var itens = [];

  for (var i = 0; i < todasAsLinhas.length; i++) {
    var linha = todasAsLinhas[i];
    if (!linha[COL.SERIAL - 1]) continue;
    var item = linhaParaObjeto(linha);

    if (filtro === 'emCurso' && item.estado !== 'Em curso') continue;
    if (filtro === 'terminados' && item.estado !== 'Terminado') continue;
    if (filtro === 'atraso' && item.emAtraso !== 'Sim') continue;

    itens.push(item);
  }

  itens.sort(function (a, b) { return b.atualizadoEm.localeCompare(a.atualizadoEm); });
  return { status: 'ok', itens: itens };
}

/**
 * Responde com um unico registo pelo numero de serie, ou existe:false se
 * ainda nao existir nenhum registo com esse numero.
 */
function obterRegisto(tipo, serial) {
  var serialLimpo = (serial || '').toString().trim();
  if (!serialLimpo) {
    throw new Error('Numero de serie em falta.');
  }

  var aba = obterAba(tipo);
  var linha = encontrarLinha(aba, serialLimpo);
  if (linha === -1) {
    return { status: 'ok', existe: false };
  }

  var valores = aba.getRange(linha, 1, 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues()[0];
  return { status: 'ok', existe: true, dados: linhaParaObjeto(valores) };
}

/**
 * Cria ou atualiza (upsert, pelo numero de serie) um registo de producao.
 */
function guardarRegisto(dados) {
  var tipo = dados.tipo;
  var serial = (dados.serial || '').toString().trim();
  if (!serial) {
    throw new Error('Numero de serie em falta.');
  }

  var aba = obterAba(tipo);
  var linha = encontrarLinha(aba, serial);
  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm');

  var previsaoSaida = (dados.previsaoSaida || '').toString().trim();
  var estado = (dados.estado || 'Em curso').toString().trim();
  var emAtraso = calcularEmAtraso(estado, previsaoSaida);

  if (linha === -1) {
    var novaLinha = [
      serial,
      (dados.grupo || '').toString().trim(),
      estado,
      emAtraso,
      previsaoSaida,
      (dados.dataEntrega || '').toString().trim(),
      (dados.materiaisEmFalta || '').toString().trim(),
      (dados.materiaisEntregues || '').toString().trim(),
      '',
      agora,
      agora
    ].concat(aplicarEtapasNovoRegisto(dados.etapas, agora));

    aba.getRange(aba.getLastRow() + 1, 1, 1, novaLinha.length).setValues([novaLinha]);
  } else {
    var valoresAtuais = aba.getRange(linha, 1, 1, COL_PRIMEIRA_ETAPA - 1 + ETAPAS.length).getValues()[0];

    aba.getRange(linha, COL.GRUPO).setValue((dados.grupo || '').toString().trim());
    aba.getRange(linha, COL.ESTADO).setValue(estado);
    aba.getRange(linha, COL.ATRASO).setValue(emAtraso);
    aba.getRange(linha, COL.PREVISAO).setValue(previsaoSaida);
    aba.getRange(linha, COL.ENTREGA).setValue((dados.dataEntrega || '').toString().trim());
    aba.getRange(linha, COL.MAT_FALTA).setValue((dados.materiaisEmFalta || '').toString().trim());
    aba.getRange(linha, COL.MAT_ENTREGUE).setValue((dados.materiaisEntregues || '').toString().trim());
    aba.getRange(linha, COL.ATUALIZADO).setValue(agora);

    ETAPAS.forEach(function (et, indice) {
      var coluna = COL_PRIMEIRA_ETAPA + indice;
      var jaTinhaData = (valoresAtuais[coluna - 1] || '').toString().trim();
      var marcadoAgora = dados.etapas && dados.etapas[et.chave] === true;

      if (marcadoAgora && !jaTinhaData) {
        aba.getRange(linha, coluna).setValue(agora);
      } else if (!marcadoAgora) {
        aba.getRange(linha, coluna).setValue('');
      }
      // Se marcadoAgora && jaTinhaData, mantem a data original (nao mexe).
    });
  }

  adicionarValorNaLista(tipo === 'ciclos' ? 'ciclosProducao' : 'gruposProducao', (dados.grupo || '').toString().trim());

  return { status: 'ok', mensagem: 'Registo guardado.' };
}

function aplicarEtapasNovoRegisto(etapasPedidas, agora) {
  return ETAPAS.map(function (et) {
    return etapasPedidas && etapasPedidas[et.chave] === true ? agora : '';
  });
}

function calcularEmAtraso(estado, previsaoSaida) {
  if (estado === 'Terminado' || !previsaoSaida) return 'Nao';
  var dataPrevista = new Date(previsaoSaida + 'T23:59:59');
  if (isNaN(dataPrevista.getTime())) return 'Nao';
  var hoje = new Date();
  return dataPrevista.getTime() < hoje.getTime() ? 'Sim' : 'Nao';
}

/**
 * Muda o numero de serie de um registo existente (usar so em ultimo caso,
 * ex.: engano na etiquetagem da maquina). Guarda o numero antigo na coluna
 * de historico, para nao se perder o rasto.
 */
function mudarNumeroSerie(dados) {
  var tipo = dados.tipo;
  var serialAtual = (dados.serialAtual || '').toString().trim();
  var serialNovo = (dados.serialNovo || '').toString().trim();

  if (!serialAtual || !serialNovo) {
    throw new Error('Indique o numero de serie atual e o novo.');
  }
  if (serialAtual.toLowerCase() === serialNovo.toLowerCase()) {
    throw new Error('O novo numero de serie tem de ser diferente do atual.');
  }

  var aba = obterAba(tipo);
  var linha = encontrarLinha(aba, serialAtual);
  if (linha === -1) {
    throw new Error('Nao foi encontrado nenhum registo com o numero de serie ' + serialAtual + '.');
  }
  if (encontrarLinha(aba, serialNovo) !== -1) {
    throw new Error('Ja existe um registo com o numero de serie ' + serialNovo + '.');
  }

  var historicoAtual = aba.getRange(linha, COL.HISTORICO).getValue().toString().trim();
  var novoHistorico = historicoAtual ? historicoAtual + ', ' + serialAtual : serialAtual;

  aba.getRange(linha, COL.SERIAL).setValue(serialNovo);
  aba.getRange(linha, COL.HISTORICO).setValue(novoHistorico);
  aba.getRange(linha, COL.ATUALIZADO).setValue(
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm')
  );

  return { status: 'ok', mensagem: 'Numero de serie atualizado.' };
}

/**
 * Gera um Excel (.xlsx) e um PDF a partir da aba pedida (estado atual
 * completo de "Grupos" ou "Ciclos") e envia-os por e-mail.
 */
function enviarResumoProducao(dados) {
  var tipo = dados.tipo;
  var emailsInput = (dados.emails || '').toString().trim();
  if (!emailsInput) {
    throw new Error('Indique pelo menos um e-mail de destinatario.');
  }

  var aba = obterAba(tipo);
  if (aba.getLastRow() < 2) {
    throw new Error('Ainda nao ha nenhum registo de producao nesta aba.');
  }

  var emails = limparListaEmails(emailsInput);
  var excelBlob = exportarAbaComoBlob(aba, 'xlsx');
  var pdfBlob = exportarAbaComoBlob(aba, 'pdf');

  var nomeTipo = tipo === 'ciclos' ? 'Ciclos' : 'Grupos';
  var corpo = EMPRESA + ' - Resumo de producao (' + nomeTipo + ').\n\n';
  corpo = corpo + 'Em anexo: o estado atual de todos os numeros de serie em producao (' + nomeTipo + '), em Excel e PDF.\n';
  corpo = corpo + '\nEste e-mail foi gerado automaticamente pela aplicacao de Controlo de Producao.';

  MailApp.sendEmail({
    to: emails,
    subject: EMPRESA + ' - Resumo de producao - ' + nomeTipo + ' - ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'dd/MM/yyyy'),
    body: corpo,
    attachments: [excelBlob, pdfBlob]
  });

  return { status: 'ok', mensagem: 'Resumo enviado por e-mail.' };
}

function exportarAbaComoBlob(aba, formato) {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var url = 'https://docs.google.com/spreadsheets/d/' + folha.getId() + '/export' +
    '?format=' + formato +
    '&gid=' + aba.getSheetId() +
    '&portrait=false&fitw=true&gridlines=true&printtitle=false&sheetnames=false';

  var opcoes = {
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    muteHttpExceptions: true
  };

  var resposta = UrlFetchApp.fetch(url, opcoes);
  if (resposta.getResponseCode() !== 200) {
    throw new Error('Falha ao exportar a folha como ' + formato + ' (codigo ' + resposta.getResponseCode() + ').');
  }

  var nomeFicheiro = aba.getName() + '_' +
    Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyyMMdd_HHmm') + '.' + formato;
  return resposta.getBlob().setName(nomeFicheiro);
}

function limparListaEmails(texto) {
  var partes = texto.split(',');
  var limpas = [];
  for (var i = 0; i < partes.length; i++) {
    var parte = partes[i].trim();
    if (parte.length > 0) limpas.push(parte);
  }
  return limpas.join(',');
}

/**
 * Listas de sugestoes (valores do campo "Grupo/Tipo"), guardadas nas
 * Propriedades do Script e que crescem sozinhas, tal como no script de
 * Relatorio de Testes.
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

function adicionarValorNaLista(nomePropriedade, valor) {
  if (!valor) return;
  var lista = obterLista(nomePropriedade);
  if (lista.indexOf(valor) !== -1) return;
  lista.push(valor);
  var propriedades = PropertiesService.getScriptProperties();
  propriedades.setProperty(nomePropriedade, JSON.stringify(lista));
}
