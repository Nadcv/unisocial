/**
 * Backend em Google Apps Script para a app "Gestão de Manutenção".
 *
 * Área: eletrificação (quadros/grupos), ciclos e refrigeração de uma
 * linha de produção, com uma equipa de 4 técnicos.
 *
 * Guarda tudo numa Google Sheet criada automaticamente na primeira
 * execução (o ID fica guardado nas Propriedades do Script, não é
 * preciso configurar nada à mão).
 *
 * doGet  -> serve o Index.html.
 * Todas as operações de dados são feitas por funções chamadas a partir
 * do frontend via google.script.run (sem fetch/CORS).
 */

function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Gestão de Manutenção')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1');
}

var SHEETS = {
  Tecnicos: ['id', 'nome'],
  Equipamentos: ['id', 'nome', 'tipo', 'local', 'notas', 'dataCriacao'],
  Tarefas: ['id', 'dataCriacao', 'equipamentoId', 'equipamentoNome', 'tipo', 'descricao', 'responsavel', 'estado', 'dataConclusao'],
  Temperaturas: ['id', 'dataHora', 'equipamentoId', 'equipamentoNome', 'temperatura', 'alarme', 'observacoes', 'responsavel'],
  Materiais: ['id', 'nome', 'categoria', 'unidade', 'stockAtual', 'stockMinimo', 'notas', 'dataCriacao'],
  Movimentos: ['id', 'dataHora', 'materialId', 'materialNome', 'tipo', 'operacao', 'quantidade', 'responsavel', 'notas']
};

var OPERACOES_STOCK = ['Corte de tubo de cobre', 'Dobra de tubo de cobre', 'Soldadura', 'Reposição de stock', 'Outro'];

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  var ss = null;

  if (id) {
    try {
      ss = SpreadsheetApp.openById(id);
    } catch (e) {
      ss = null;
    }
  }

  if (!ss) {
    ss = SpreadsheetApp.create('Gestão de Manutenção - Dados');
    props.setProperty('SPREADSHEET_ID', ss.getId());
  }

  setupSheets_(ss);
  return ss;
}

function setupSheets_(ss) {
  Object.keys(SHEETS).forEach(function (nome) {
    var sheet = ss.getSheetByName(nome);
    if (!sheet) {
      sheet = ss.insertSheet(nome);
    }
    var headers = SHEETS[nome];
    var primeiraLinha = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
    var precisaCabecalho = headers.some(function (h, i) { return primeiraLinha[i] !== h; });
    if (precisaCabecalho) {
      sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  });

  // Remove a folha "Sheet1"/"Folha1" por defeito se estiver vazia e não for uma das nossas.
  var defeito = ss.getSheetByName('Sheet1') || ss.getSheetByName('Folha1');
  if (defeito && defeito.getLastRow() === 0 && ss.getSheets().length > 1) {
    ss.deleteSheet(defeito);
  }
}

function readSheet_(ss, nome) {
  var sheet = ss.getSheetByName(nome);
  var headers = SHEETS[nome];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  var valores = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return valores
    .map(function (linha, indice) {
      var obj = {};
      headers.forEach(function (h, i) { obj[h] = linha[i]; });
      obj._row = indice + 2;
      return obj;
    })
    .filter(function (obj) { return obj.id; });
}

function generateId_() {
  return Utilities.getUuid();
}

function agora_() {
  return new Date().toISOString();
}

function encontrarLinhaPorId_(sheet, headers, id) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  var idColuna = headers.indexOf('id') + 1;
  var ids = sheet.getRange(2, idColuna, lastRow - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === id) return i + 2;
  }
  return -1;
}

/** Devolve todos os dados iniciais da app numa única chamada. */
function getInitialData() {
  var ss = getSpreadsheet_();
  return {
    tecnicos: readSheet_(ss, 'Tecnicos'),
    equipamentos: readSheet_(ss, 'Equipamentos'),
    tarefas: readSheet_(ss, 'Tarefas'),
    temperaturas: readSheet_(ss, 'Temperaturas'),
    materiais: readSheet_(ss, 'Materiais'),
    movimentos: readSheet_(ss, 'Movimentos'),
    operacoesStock: OPERACOES_STOCK
  };
}

function addTecnico(nome) {
  nome = (nome || '').toString().trim();
  if (!nome) throw new Error('Indique o nome do técnico.');

  var ss = getSpreadsheet_();
  ss.getSheetByName('Tecnicos').appendRow([generateId_(), nome]);
  return readSheet_(ss, 'Tecnicos');
}

function removerTecnico(id) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Tecnicos');
  var linha = encontrarLinhaPorId_(sheet, SHEETS.Tecnicos, id);
  if (linha > 0) sheet.deleteRow(linha);
  return readSheet_(ss, 'Tecnicos');
}

function addEquipamento(dados) {
  dados = dados || {};
  var nome = (dados.nome || '').toString().trim();
  var tipo = (dados.tipo || '').toString().trim();
  if (!nome) throw new Error('Indique o nome/identificação do equipamento.');
  if (['Elétrico', 'Refrigeração'].indexOf(tipo) === -1) throw new Error('Tipo de equipamento inválido.');

  var ss = getSpreadsheet_();
  ss.getSheetByName('Equipamentos').appendRow([
    generateId_(),
    nome,
    tipo,
    (dados.local || '').toString().trim(),
    (dados.notas || '').toString().trim(),
    agora_()
  ]);
  return readSheet_(ss, 'Equipamentos');
}

function addTarefa(dados) {
  dados = dados || {};
  var equipamentoId = (dados.equipamentoId || '').toString();
  var tipo = (dados.tipo || '').toString().trim();
  var descricao = (dados.descricao || '').toString().trim();
  var responsavel = (dados.responsavel || '').toString().trim();
  if (!equipamentoId) throw new Error('Selecione o equipamento.');
  if (!tipo) throw new Error('Selecione o tipo de tarefa.');
  if (!descricao) throw new Error('Descreva a tarefa.');
  if (!responsavel) throw new Error('Selecione o responsável.');

  var ss = getSpreadsheet_();
  var equipamentos = readSheet_(ss, 'Equipamentos');
  var equipamento = equipamentos.filter(function (e) { return e.id === equipamentoId; })[0];
  if (!equipamento) throw new Error('Equipamento não encontrado.');

  ss.getSheetByName('Tarefas').appendRow([
    generateId_(),
    agora_(),
    equipamentoId,
    equipamento.nome,
    tipo,
    descricao,
    responsavel,
    'Pendente',
    ''
  ]);
  return readSheet_(ss, 'Tarefas');
}

function atualizarEstadoTarefa(id, estado) {
  if (['Pendente', 'Em curso', 'Concluída'].indexOf(estado) === -1) {
    throw new Error('Estado inválido.');
  }
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('Tarefas');
  var headers = SHEETS.Tarefas;
  var linha = encontrarLinhaPorId_(sheet, headers, id);
  if (linha < 0) throw new Error('Tarefa não encontrada.');

  sheet.getRange(linha, headers.indexOf('estado') + 1).setValue(estado);
  sheet.getRange(linha, headers.indexOf('dataConclusao') + 1)
    .setValue(estado === 'Concluída' ? agora_() : '');

  return readSheet_(ss, 'Tarefas');
}

function addTemperatura(dados) {
  dados = dados || {};
  var equipamentoId = (dados.equipamentoId || '').toString();
  var temperatura = Number(dados.temperatura);
  var responsavel = (dados.responsavel || '').toString().trim();
  if (!equipamentoId) throw new Error('Selecione o equipamento de refrigeração.');
  if (isNaN(temperatura)) throw new Error('Indique a temperatura (número).');
  if (!responsavel) throw new Error('Selecione o responsável pela leitura.');

  var ss = getSpreadsheet_();
  var equipamentos = readSheet_(ss, 'Equipamentos');
  var equipamento = equipamentos.filter(function (e) { return e.id === equipamentoId; })[0];
  if (!equipamento) throw new Error('Equipamento não encontrado.');

  ss.getSheetByName('Temperaturas').appendRow([
    generateId_(),
    agora_(),
    equipamentoId,
    equipamento.nome,
    temperatura,
    !!dados.alarme,
    (dados.observacoes || '').toString().trim(),
    responsavel
  ]);
  return readSheet_(ss, 'Temperaturas');
}

/** Novo material no armazém (elétrico, refrigeração ou consumível). */
function addMaterial(dados) {
  dados = dados || {};
  var nome = (dados.nome || '').toString().trim();
  var categoria = (dados.categoria || '').toString().trim();
  var unidade = (dados.unidade || 'un').toString().trim() || 'un';
  var stockAtual = Number(dados.stockAtual);
  var stockMinimo = Number(dados.stockMinimo);
  if (!nome) throw new Error('Indique o nome do material.');
  if (['Elétrico', 'Refrigeração', 'Consumível'].indexOf(categoria) === -1) {
    throw new Error('Categoria de material inválida.');
  }
  if (isNaN(stockAtual) || stockAtual < 0) stockAtual = 0;
  if (isNaN(stockMinimo) || stockMinimo < 0) stockMinimo = 0;

  var ss = getSpreadsheet_();
  ss.getSheetByName('Materiais').appendRow([
    generateId_(),
    nome,
    categoria,
    unidade,
    stockAtual,
    stockMinimo,
    (dados.notas || '').toString().trim(),
    agora_()
  ]);
  return readSheet_(ss, 'Materiais');
}

/**
 * Regista uma entrada ou saída de stock de um material (ex.: consumo em
 * corte/dobra de tubo de cobre, soldadura, ou reposição) e atualiza o
 * stock atual desse material.
 */
function addMovimento(dados) {
  dados = dados || {};
  var materialId = (dados.materialId || '').toString();
  var tipo = (dados.tipo || '').toString().trim();
  var operacao = (dados.operacao || '').toString().trim();
  var quantidade = Number(dados.quantidade);
  var responsavel = (dados.responsavel || '').toString().trim();

  if (!materialId) throw new Error('Selecione o material.');
  if (['Entrada', 'Saída'].indexOf(tipo) === -1) throw new Error('Tipo de movimento inválido.');
  if (OPERACOES_STOCK.indexOf(operacao) === -1) throw new Error('Operação inválida.');
  if (isNaN(quantidade) || quantidade <= 0) throw new Error('Indique uma quantidade válida (maior que zero).');
  if (!responsavel) throw new Error('Selecione o responsável.');

  var ss = getSpreadsheet_();
  var materiaisSheet = ss.getSheetByName('Materiais');
  var headers = SHEETS.Materiais;
  var linha = encontrarLinhaPorId_(materiaisSheet, headers, materialId);
  if (linha < 0) throw new Error('Material não encontrado.');

  var stockColuna = headers.indexOf('stockAtual') + 1;
  var stockAtual = Number(materiaisSheet.getRange(linha, stockColuna).getValue()) || 0;
  var novoStock = tipo === 'Entrada' ? stockAtual + quantidade : stockAtual - quantidade;
  materiaisSheet.getRange(linha, stockColuna).setValue(novoStock);

  var materialNome = materiaisSheet.getRange(linha, headers.indexOf('nome') + 1).getValue();

  ss.getSheetByName('Movimentos').appendRow([
    generateId_(),
    agora_(),
    materialId,
    materialNome,
    tipo,
    operacao,
    quantidade,
    responsavel,
    (dados.notas || '').toString().trim()
  ]);

  return {
    materiais: readSheet_(ss, 'Materiais'),
    movimentos: readSheet_(ss, 'Movimentos')
  };
}
