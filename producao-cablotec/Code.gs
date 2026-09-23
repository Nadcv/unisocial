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

// URL /exec do script de "Relatorio de Testes" (opcional). Se preenchido,
// o formulario pergunta a esse script quantas fotos/relatorios ja existem
// para o numero de serie aberto, e mostra isso junto ao atalho do Drive.
// Deixe vazio ('') se nao quiser esta ligacao.
var APPS_SCRIPT_URL_RELATORIOS = 'https://script.google.com/macros/s/AKfycbzx4t4wIfK958QDR4wCwxp-mWNyJf-ZRLsxj1zRhkMKY15hgwKxrlbNPCb8RGIGhrdeYA/exec';

// Separador usado dentro da celula de cada etapa, para guardar a data de
// conclusao e uma nota curta opcional na mesma celula (ex.: "2026-09-22
// 10:00::falta um parafuso").
var SEPARADOR_NOTA = '::';

// Chave usada nas Propriedades do Script para guardar a configuracao do
// envio automatico de resumos (e-mails, se esta ativo, e a frequencia).
var CONFIG_ENVIO_KEY = 'configEnvioAutomatico';

// Nome da funcao chamada pelo gatilho (trigger) de envio automatico.
var NOME_FUNCAO_TRIGGER = 'enviarResumosAutomaticos';

// Nomes das abas na Google Sheet, uma para cada tipo de producao.
var ABAS = {
  grupos: 'Grupos',
  ciclos: 'Ciclos'
};

// Aba onde fica guardada a estrutura permanente de materiais (eletrica e
// frio) de cada modelo (Grupo ou Ciclo). E a mesma aba para os dois tipos,
// distinguida pela coluna "Tipo".
var ABA_MATERIAIS = 'MateriaisPadrao';

var CABECALHOS_MATERIAIS = ['Tipo', 'Modelo', 'Categoria', 'Codigo', 'Descricao', 'Quantidade', 'Criado em'];

var COL_MAT = {
  TIPO: 1,
  MODELO: 2,
  CATEGORIA: 3,
  CODIGO: 4,
  DESCRICAO: 5,
  QUANTIDADE: 6,
  CRIADO: 7
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

  if (acao === 'resumo') {
    return respostaJson(obterResumoGeral());
  }

  if (acao === 'configEnvio') {
    return respostaJson(obterConfigEnvioAutomatico());
  }

  if (acao === 'materiaisPadrao') {
    return respostaJson(listarMateriaisPadrao(e.parameter.tipo, e.parameter.modelo));
  }

  if (acao === 'baixarMateriais') {
    return baixarMateriais(e.parameter);
  }

  var listas = {
    gruposProducao: obterLista('gruposProducao'),
    ciclosProducao: obterLista('ciclosProducao')
  };

  var template = HtmlService.createTemplateFromFile('Index');
  template.appsScriptUrl = ScriptApp.getService().getUrl();
  template.listasJson = JSON.stringify(listas);
  template.folderIdRelatorios = FOLDER_ID_RELATORIOS || '';
  template.appsScriptUrlRelatorios = APPS_SCRIPT_URL_RELATORIOS || '';
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
    } else if (dados.acao === 'configurarEnvioAutomatico') {
      resposta = configurarEnvioAutomatico(dados);
    } else if (dados.acao === 'adicionarMaterialPadrao') {
      resposta = adicionarMaterialPadrao(dados);
    } else if (dados.acao === 'removerMaterialPadrao') {
      resposta = removerMaterialPadrao(dados);
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
 * Devolve (criando se necessario) a aba onde fica a estrutura permanente
 * de materiais por modelo.
 */
function obterAbaMateriais() {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.getSheetByName(ABA_MATERIAIS);
  if (aba) return aba;

  aba = folha.insertSheet(ABA_MATERIAIS);
  aba.getRange(1, 1, 1, CABECALHOS_MATERIAIS.length).setValues([CABECALHOS_MATERIAIS]);
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, CABECALHOS_MATERIAIS.length).setFontWeight('bold');
  aba.getRange(2, COL_MAT.CRIADO, 2000, 1).setNumberFormat('@');
  return aba;
}

/**
 * Responde com a estrutura de materiais (eletrica + frio) permanente de um
 * modelo (Grupo ou Ciclo). Usado para preencher a tabela automaticamente
 * assim que o Grupo/Tipo e identificado no formulario.
 */
function listarMateriaisPadrao(tipo, modelo) {
  var modeloLimpo = (modelo || '').toString().trim();
  if (!modeloLimpo) {
    return { status: 'ok', itens: [] };
  }

  var aba = obterAbaMateriais();
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) return { status: 'ok', itens: [] };

  var valores = aba.getRange(2, 1, ultimaLinha - 1, CABECALHOS_MATERIAIS.length).getValues();
  var itens = [];

  for (var i = 0; i < valores.length; i++) {
    var linha = valores[i];
    if ((linha[COL_MAT.TIPO - 1] || '') !== tipo) continue;
    if ((linha[COL_MAT.MODELO - 1] || '').toString().trim().toLowerCase() !== modeloLimpo.toLowerCase()) continue;

    itens.push({
      categoria: (linha[COL_MAT.CATEGORIA - 1] || '').toString(),
      codigo: (linha[COL_MAT.CODIGO - 1] || '').toString(),
      descricao: (linha[COL_MAT.DESCRICAO - 1] || '').toString(),
      quantidade: (linha[COL_MAT.QUANTIDADE - 1] || '').toString()
    });
  }

  itens.sort(function (a, b) {
    if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
    return a.codigo.localeCompare(b.codigo);
  });

  return { status: 'ok', itens: itens };
}

/**
 * Acrescenta (ou atualiza, se o codigo ja existir para o mesmo
 * modelo+categoria) um material na estrutura permanente de um modelo.
 */
function adicionarMaterialPadrao(dados) {
  var tipo = (dados.tipo || '').toString().trim();
  var modelo = (dados.modelo || '').toString().trim();
  var categoria = (dados.categoria || '').toString().trim();
  var codigo = (dados.codigo || '').toString().trim();
  var descricao = (dados.descricao || '').toString().trim();
  var quantidade = (dados.quantidade || '').toString().trim();

  if (!tipo || !modelo || !categoria || !codigo) {
    throw new Error('Indique modelo, categoria e codigo do material.');
  }

  var aba = obterAbaMateriais();
  var ultimaLinha = aba.getLastRow();

  if (ultimaLinha >= 2) {
    var valores = aba.getRange(2, 1, ultimaLinha - 1, CABECALHOS_MATERIAIS.length).getValues();
    for (var i = 0; i < valores.length; i++) {
      var linha = valores[i];
      var mesmoTipo = (linha[COL_MAT.TIPO - 1] || '') === tipo;
      var mesmoModelo = (linha[COL_MAT.MODELO - 1] || '').toString().trim().toLowerCase() === modelo.toLowerCase();
      var mesmaCategoria = (linha[COL_MAT.CATEGORIA - 1] || '') === categoria;
      var mesmoCodigo = (linha[COL_MAT.CODIGO - 1] || '').toString().trim().toLowerCase() === codigo.toLowerCase();

      if (mesmoTipo && mesmoModelo && mesmaCategoria && mesmoCodigo) {
        var linhaFolha = i + 2;
        aba.getRange(linhaFolha, COL_MAT.DESCRICAO).setValue(descricao);
        aba.getRange(linhaFolha, COL_MAT.QUANTIDADE).setValue(quantidade);
        return { status: 'ok', mensagem: 'Material atualizado.' };
      }
    }
  }

  var agora = Utilities.formatDate(new Date(), Session.getScriptTimeZone() || 'GMT', 'yyyy-MM-dd HH:mm');
  var novaLinha = [tipo, modelo, categoria, codigo, descricao, quantidade, agora];
  aba.getRange(aba.getLastRow() + 1, 1, 1, novaLinha.length).setValues([novaLinha]);

  return { status: 'ok', mensagem: 'Material adicionado.' };
}

/**
 * Remove um material da estrutura permanente de um modelo, pelo codigo.
 */
function removerMaterialPadrao(dados) {
  var tipo = (dados.tipo || '').toString().trim();
  var modelo = (dados.modelo || '').toString().trim();
  var categoria = (dados.categoria || '').toString().trim();
  var codigo = (dados.codigo || '').toString().trim();

  if (!tipo || !modelo || !categoria || !codigo) {
    throw new Error('Indique modelo, categoria e codigo do material.');
  }

  var aba = obterAbaMateriais();
  var ultimaLinha = aba.getLastRow();
  if (ultimaLinha < 2) {
    throw new Error('Material nao encontrado.');
  }

  var valores = aba.getRange(2, 1, ultimaLinha - 1, CABECALHOS_MATERIAIS.length).getValues();
  for (var i = 0; i < valores.length; i++) {
    var linha = valores[i];
    var mesmoTipo = (linha[COL_MAT.TIPO - 1] || '') === tipo;
    var mesmoModelo = (linha[COL_MAT.MODELO - 1] || '').toString().trim().toLowerCase() === modelo.toLowerCase();
    var mesmaCategoria = (linha[COL_MAT.CATEGORIA - 1] || '') === categoria;
    var mesmoCodigo = (linha[COL_MAT.CODIGO - 1] || '').toString().trim().toLowerCase() === codigo.toLowerCase();

    if (mesmoTipo && mesmoModelo && mesmaCategoria && mesmoCodigo) {
      aba.deleteRow(i + 2);
      return { status: 'ok', mensagem: 'Material removido.' };
    }
  }

  throw new Error('Material nao encontrado.');
}

/**
 * Gera a tabela de materiais (eletrica + frio) de um modelo em Excel ou
 * PDF, e devolve uma pagina HTML que despoleta logo o download no
 * telemovel/computador do operador (sem deixar ficheiros no Drive).
 */
function baixarMateriais(parametros) {
  var tipo = (parametros.tipo || '').toString().trim();
  var modelo = (parametros.modelo || '').toString().trim();
  var formato = parametros.formato === 'pdf' ? 'pdf' : 'xlsx';

  if (!modelo) {
    return HtmlService.createHtmlOutput('<p>Numero de modelo em falta.</p>');
  }

  var abaTemp = null;
  try {
    var nomeTipo = tipo === 'ciclos' ? 'Ciclos' : 'Grupos';
    var itens = listarMateriaisPadrao(tipo, modelo).itens;
    abaTemp = criarAbaTemporariaMateriais(itens, nomeTipo, modelo);

    var blob = exportarAbaComoBlob(abaTemp, formato);
    var base64 = Utilities.base64Encode(blob.getBytes());
    var mimeType = formato === 'pdf'
      ? 'application/pdf'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    var nomeFicheiro = 'Materiais_' + nomeTipo + '_' + sanitizeNomeFicheiro(modelo) + '.' + formato;

    var html = '<html><body onload="document.getElementById(\'l\').click();">' +
      '<a id="l" href="data:' + mimeType + ';base64,' + base64 + '" download="' + nomeFicheiro + '">A transferir...</a>' +
      '<p>Se o download nao comecar sozinho, toque no link acima. Pode fechar esta janela depois.</p>' +
      '</body></html>';
    return HtmlService.createHtmlOutput(html);
  } catch (erro) {
    var mensagem = erro && erro.message ? erro.message : String(erro);
    return HtmlService.createHtmlOutput('<p>Erro ao gerar o ficheiro: ' + mensagem + '</p>');
  } finally {
    if (abaTemp) {
      SpreadsheetApp.getActiveSpreadsheet().deleteSheet(abaTemp);
    }
  }
}

function criarAbaTemporariaMateriais(itens, nomeTipo, modelo) {
  var folha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = folha.insertSheet('_tmp_materiais_' + new Date().getTime());

  aba.getRange(1, 1, 1, 4).merge().setValue('Materiais - ' + nomeTipo + ' ' + modelo).setFontWeight('bold').setFontSize(12);
  aba.getRange(2, 1, 1, 4).setValues([['Categoria', 'Codigo', 'Descricao', 'Quantidade']]).setFontWeight('bold');

  if (itens.length) {
    var linhas = itens.map(function (item) {
      return [item.categoria, item.codigo, item.descricao, item.quantidade];
    });
    aba.getRange(3, 1, linhas.length, 4).setValues(linhas);
  }

  aba.autoResizeColumns(1, 4);
  return aba;
}

function sanitizeNomeFicheiro(texto) {
  return texto.toString().replace(/[^a-zA-Z0-9_-]+/g, '_');
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
    var bruto = (valores[COL_PRIMEIRA_ETAPA - 1 + indice] || '').toString();
    var partes = bruto.split(SEPARADOR_NOTA);
    etapas[et.chave] = { data: partes[0] || '', nota: partes[1] || '' };
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
      var brutoAtual = (valoresAtuais[coluna - 1] || '').toString().trim();
      var dataAtual = brutoAtual.split(SEPARADOR_NOTA)[0];
      var etapaPedida = (dados.etapas && dados.etapas[et.chave]) || {};
      var marcadoAgora = etapaPedida.marcado === true;
      var notaAgora = (etapaPedida.nota || '').toString().trim();

      if (marcadoAgora) {
        var dataFinal = dataAtual || agora;
        var valorFinal = notaAgora ? dataFinal + SEPARADOR_NOTA + notaAgora : dataFinal;
        aba.getRange(linha, coluna).setValue(valorFinal);
      } else {
        aba.getRange(linha, coluna).setValue('');
      }
    });
  }

  adicionarValorNaLista(tipo === 'ciclos' ? 'ciclosProducao' : 'gruposProducao', (dados.grupo || '').toString().trim());

  return { status: 'ok', mensagem: 'Registo guardado.' };
}

function aplicarEtapasNovoRegisto(etapasPedidas, agora) {
  return ETAPAS.map(function (et) {
    var etapaPedida = (etapasPedidas && etapasPedidas[et.chave]) || {};
    if (etapaPedida.marcado !== true) return '';
    var nota = (etapaPedida.nota || '').toString().trim();
    return nota ? agora + SEPARADOR_NOTA + nota : agora;
  });
}

/**
 * Conta, para "Grupos" e para "Ciclos", quantos registos estao em curso,
 * terminados, e em atraso. Usado pelo painel-resumo no topo do formulario.
 */
function obterResumoGeral() {
  var resultado = {};

  ['grupos', 'ciclos'].forEach(function (tipo) {
    var aba = obterAba(tipo);
    var ultimaLinha = aba.getLastRow();
    var emCurso = 0;
    var terminados = 0;
    var atraso = 0;

    if (ultimaLinha >= 2) {
      var linhas = aba.getRange(2, 1, ultimaLinha - 1, 4).getValues();
      linhas.forEach(function (linha) {
        var serial = (linha[0] || '').toString().trim();
        if (!serial) return;
        var estado = (linha[2] || '').toString();
        var emAtraso = (linha[3] || '').toString();

        if (estado === 'Terminado') {
          terminados = terminados + 1;
        } else {
          emCurso = emCurso + 1;
        }
        if (emAtraso === 'Sim') atraso = atraso + 1;
      });
    }

    resultado[tipo] = { emCurso: emCurso, terminados: terminados, atraso: atraso, total: emCurso + terminados };
  });

  return { status: 'ok', resumo: resultado };
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

/**
 * Ativa ou desativa o envio automatico do resumo de producao por e-mail.
 * Suporta tres tipos de agendamento, escolhidos livremente:
 *  - "diario": todos os dias, a uma hora/minuto escolhidos.
 *  - "semanal": um dia da semana escolhido, a uma hora/minuto escolhidos.
 *  - "unico": uma unica vez, numa data e hora exatas escolhidas.
 * Guarda a configuracao nas Propriedades do Script e cria/remove o
 * gatilho (trigger) correspondente.
 */
function configurarEnvioAutomatico(dados) {
  var emails = (dados.emails || '').toString().trim();
  var ativo = dados.ativo === true;
  var frequencia = ['diario', 'semanal', 'unico'].indexOf(dados.frequencia) !== -1 ? dados.frequencia : 'diario';
  var hora = Math.min(23, Math.max(0, parseInt(dados.hora, 10) || 0));
  var minuto = Math.min(59, Math.max(0, parseInt(dados.minuto, 10) || 0));
  var diaSemana = (dados.diaSemana || 'MONDAY').toString().trim();
  var dataHora = (dados.dataHora || '').toString().trim();

  if (ativo && !emails) {
    throw new Error('Indique pelo menos um e-mail para o envio automatico.');
  }
  if (ativo && frequencia === 'unico') {
    if (!dataHora) {
      throw new Error('Escolha a data e a hora para o envio unico.');
    }
    var dataAlvo = new Date(dataHora);
    if (isNaN(dataAlvo.getTime())) {
      throw new Error('Data/hora invalida.');
    }
    if (dataAlvo.getTime() <= new Date().getTime()) {
      throw new Error('Escolha uma data/hora no futuro.');
    }
  }
  if (ativo && frequencia === 'semanal' && !ScriptApp.WeekDay[diaSemana]) {
    throw new Error('Dia da semana invalido.');
  }

  removerTriggersExistentes(NOME_FUNCAO_TRIGGER);

  if (ativo) {
    if (frequencia === 'unico') {
      ScriptApp.newTrigger(NOME_FUNCAO_TRIGGER).timeBased().at(new Date(dataHora)).create();
    } else if (frequencia === 'semanal') {
      ScriptApp.newTrigger(NOME_FUNCAO_TRIGGER).timeBased()
        .atHour(hora).nearMinute(minuto)
        .onWeekDay(ScriptApp.WeekDay[diaSemana]).everyWeeks(1)
        .create();
    } else {
      ScriptApp.newTrigger(NOME_FUNCAO_TRIGGER).timeBased()
        .atHour(hora).nearMinute(minuto)
        .everyDays(1)
        .create();
    }
  }

  guardarConfigEnvioAutomatico({
    ativo: ativo,
    emails: limparListaEmails(emails),
    frequencia: frequencia,
    hora: hora,
    minuto: minuto,
    diaSemana: diaSemana,
    dataHora: dataHora
  });

  return { status: 'ok', mensagem: ativo ? 'Envio automatico ativado.' : 'Envio automatico desativado.' };
}

function removerTriggersExistentes(nomeFuncao) {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === nomeFuncao) {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
}

function obterConfigEnvioAutomatico() {
  var propriedades = PropertiesService.getScriptProperties();
  var guardado = propriedades.getProperty(CONFIG_ENVIO_KEY);
  var padrao = { status: 'ok', ativo: false, emails: '', frequencia: 'diario', hora: 8, minuto: 0, diaSemana: 'MONDAY', dataHora: '' };
  if (!guardado) return padrao;

  var config = JSON.parse(guardado);
  return {
    status: 'ok',
    ativo: !!config.ativo,
    emails: config.emails || '',
    frequencia: config.frequencia || 'diario',
    hora: typeof config.hora === 'number' ? config.hora : 8,
    minuto: typeof config.minuto === 'number' ? config.minuto : 0,
    diaSemana: config.diaSemana || 'MONDAY',
    dataHora: config.dataHora || ''
  };
}

function guardarConfigEnvioAutomatico(config) {
  var propriedades = PropertiesService.getScriptProperties();
  propriedades.setProperty(CONFIG_ENVIO_KEY, JSON.stringify(config));
}

/**
 * Chamada automaticamente pelo gatilho (diario, semanal ou unico), nunca
 * diretamente pelo formulario. Os gatilhos do Apps Script nao recebem
 * argumentos, por isso le a configuracao guardada nas Propriedades do
 * Script. Um envio "unico" desativa-se sozinho depois de disparar.
 */
function enviarResumosAutomaticos() {
  var propriedades = PropertiesService.getScriptProperties();
  var guardado = propriedades.getProperty(CONFIG_ENVIO_KEY);
  if (!guardado) return;

  var config = JSON.parse(guardado);
  if (!config.ativo || !config.emails) return;

  ['grupos', 'ciclos'].forEach(function (tipo) {
    try {
      var aba = obterAba(tipo);
      if (aba.getLastRow() < 2) return;
      enviarResumoProducao({ tipo: tipo, emails: config.emails });
    } catch (erroEnvio) {
      // Nao interrompe o envio do outro tipo se um deles falhar.
    }
  });

  if (config.frequencia === 'unico') {
    config.ativo = false;
    guardarConfigEnvioAutomatico(config);
  }
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
