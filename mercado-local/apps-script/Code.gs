/**
 * Backend em Google Apps Script para o "Mercado Local".
 *
 * Guarda produtos, alugueres, reservas e encomendas numa Google Sheet
 * criada automaticamente na primeira execução (o ID fica guardado nas
 * Propriedades do Script). As regras de negócio (stock, preços,
 * sobreposição de reservas) estão em Core.gs, o mesmo código que o site
 * usa em modo demonstração.
 *
 * doGet -> serve o Index.html.
 * O frontend chama as funções api* via google.script.run (sem fetch/CORS).
 *
 * A área de Gestão exige a palavra-passe definida na propriedade do
 * script ADMIN_PASSWORD (Definições do projeto → Propriedades do script).
 */

function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Mercado Local')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Colunas de cada folha. `num` são convertidas para número e `json`
// guardadas como texto JSON; as restantes são texto.
var TABELAS = {
  Produtos: {
    chave: 'produtos',
    cols: ['id', 'nome', 'categoria', 'preco', 'unidade', 'stock', 'produtor', 'local', 'emoji', 'descricao'],
    num: ['preco', 'stock']
  },
  Alugueres: {
    chave: 'alugueres',
    cols: ['id', 'nome', 'tipo', 'precoDia', 'caucao', 'capacidade', 'local', 'emoji', 'proprietario', 'descricao'],
    num: ['precoDia', 'caucao']
  },
  Reservas: {
    chave: 'reservas',
    cols: ['id', 'criadaEm', 'itemId', 'itemNome', 'inicio', 'fim', 'dias', 'total', 'caucao', 'nome', 'email', 'telefone', 'notas', 'estado'],
    num: ['dias', 'total', 'caucao']
  },
  Encomendas: {
    chave: 'encomendas',
    cols: ['id', 'criadaEm', 'nome', 'email', 'telefone', 'entrega', 'morada', 'resumo', 'subtotal', 'taxa', 'total', 'estado', 'linhas'],
    num: ['subtotal', 'taxa', 'total'],
    json: ['linhas']
  }
};

var MAX_FALHAS_LOGIN = 10;

// ---------- API chamada pelo frontend ----------

function apiPublico() {
  return comDados_(function (db) {
    return { value: Core.publico(db) };
  });
}

function apiCriarEncomenda(dados) {
  return comDados_(function (db) {
    var r = Core.criarEncomenda(db, dados);
    return { value: { result: r.result, publico: Core.publico(db) }, changed: r.changed };
  });
}

function apiCriarReserva(dados) {
  return comDados_(function (db) {
    var r = Core.criarReserva(db, dados);
    return { value: { result: r.result, publico: Core.publico(db) }, changed: r.changed };
  });
}

function apiMinhaConta(email, ref) {
  return comDados_(function (db) {
    return { value: Core.minhaConta(db, email, ref).result };
  });
}

function apiCancelarReserva(email, ref, id) {
  return comDados_(function (db) {
    var r = Core.cancelarReserva(db, email, ref, id);
    return { value: { result: r.result, publico: Core.publico(db) }, changed: r.changed };
  });
}

/** Sem `acao` devolve apenas os dados de gestão (serve também de login). */
function apiAdmin(password, acao, args) {
  verificarAdmin_(password);
  return comDados_(function (db) {
    var changed = acao ? Core.admin(db, acao, args).changed : [];
    return {
      value: { encomendas: db.encomendas, reservas: db.reservas, publico: Core.publico(db) },
      changed: changed
    };
  });
}

/**
 * Executar uma vez a partir do editor (▶ Executar) para autorizar o
 * script e criar a Google Sheet. O URL da folha aparece no registo.
 */
function configurar() {
  var ss = getSpreadsheet_();
  Logger.log('Folha de dados: ' + ss.getUrl());
  if (!PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD')) {
    Logger.log('Falta definir ADMIN_PASSWORD em Definições do projeto → Propriedades do script.');
  }
}

// ---------- Autenticação da gestão ----------

function verificarAdmin_(password) {
  var esperada = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!esperada) {
    throw new Error('A gestão ainda não está configurada: defina ADMIN_PASSWORD nas Propriedades do script.');
  }
  var cache = CacheService.getScriptCache();
  var falhas = Number(cache.get('adminFalhas') || 0);
  if (falhas >= MAX_FALHAS_LOGIN) {
    throw new Error('Demasiadas tentativas falhadas. Tente novamente daqui a 15 minutos.');
  }
  if (String(password || '') !== esperada) {
    cache.put('adminFalhas', String(falhas + 1), 15 * 60);
    throw new Error('Palavra-passe incorreta.');
  }
}

// ---------- Acesso à Google Sheet ----------

/**
 * Lê todas as tabelas, corre `fn(db)` e grava as tabelas indicadas em
 * `changed`. Corre dentro de um lock para que duas encomendas ou reservas
 * em simultâneo não vendam o mesmo stock nem reservem os mesmos dias.
 * Se `fn` lançar um erro, nada é gravado.
 */
function comDados_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) throw new Error('O servidor está ocupado. Tente novamente.');
  try {
    var ss = getSpreadsheet_();
    var db = lerDados_(ss);
    var out = fn(db);
    (out.changed || []).forEach(function (nome) { gravarTabela_(ss, nome, db[TABELAS[nome].chave]); });
    return out.value;
  } finally {
    lock.releaseLock();
  }
}

function getSpreadsheet_() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  var ss = null;
  if (id) {
    try { ss = SpreadsheetApp.openById(id); } catch (e) { ss = null; }
  }
  if (!ss) {
    ss = SpreadsheetApp.create('Mercado Local - Dados');
    props.setProperty('SPREADSHEET_ID', ss.getId());
    prepararFolhas_(ss);
    var inicial = Core.seed(false);
    gravarTabela_(ss, 'Produtos', inicial.produtos);
    gravarTabela_(ss, 'Alugueres', inicial.alugueres);
  } else {
    prepararFolhas_(ss);
  }
  return ss;
}

function prepararFolhas_(ss) {
  Object.keys(TABELAS).forEach(function (nome) {
    var sheet = ss.getSheetByName(nome) || ss.insertSheet(nome);
    var cols = TABELAS[nome].cols;
    var atual = sheet.getRange(1, 1, 1, cols.length).getValues()[0];
    if (cols.some(function (c, i) { return atual[i] !== c; })) {
      sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });
  var defeito = ss.getSheetByName('Sheet1') || ss.getSheetByName('Folha1') || ss.getSheetByName('Página1');
  if (defeito && defeito.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(defeito);
}

function lerDados_(ss) {
  var db = {};
  Object.keys(TABELAS).forEach(function (nome) { db[TABELAS[nome].chave] = lerTabela_(ss, nome); });
  return db;
}

function lerTabela_(ss, nome) {
  var t = TABELAS[nome];
  var sheet = ss.getSheetByName(nome);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var tz = Session.getScriptTimeZone();
  return sheet.getRange(2, 1, last - 1, t.cols.length).getValues()
    .filter(function (linha) { return linha[0] !== '' && linha[0] != null; })
    .map(function (linha) {
      var obj = {};
      t.cols.forEach(function (c, i) {
        var v = linha[i];
        if (t.num.indexOf(c) !== -1) {
          obj[c] = Number(v) || 0;
        } else if (t.json && t.json.indexOf(c) !== -1) {
          try { obj[c] = JSON.parse(v || '[]'); } catch (e) { obj[c] = []; }
        } else if (v instanceof Date) {
          // Datas editadas à mão na folha voltam como Date.
          obj[c] = c === 'criadaEm' ? v.toISOString() : Utilities.formatDate(v, tz, 'yyyy-MM-dd');
        } else {
          obj[c] = String(v);
        }
      });
      return obj;
    });
}

function gravarTabela_(ss, nome, lista) {
  var t = TABELAS[nome];
  var sheet = ss.getSheetByName(nome);
  var last = sheet.getLastRow();
  if (last > 1) sheet.getRange(2, 1, last - 1, t.cols.length).clearContent();
  if (!lista.length) return;
  var linhas = lista.map(function (obj) {
    return t.cols.map(function (c) {
      var v = obj[c];
      if (t.json && t.json.indexOf(c) !== -1) return JSON.stringify(v || []);
      if (t.num.indexOf(c) !== -1) return Number(v) || 0;
      v = v == null ? '' : String(v);
      // Impede que texto introduzido por visitantes seja interpretado como fórmula.
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    });
  });
  var range = sheet.getRange(2, 1, linhas.length, t.cols.length);
  // Texto simples, para que datas ('2026-10-01') e telefones não sejam convertidos.
  range.setNumberFormat('@');
  range.setValues(linhas);
}
