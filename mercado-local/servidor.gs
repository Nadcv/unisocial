/**
 * Backend em Google Apps Script para o "Mercado Local".
 *
 * Guarda produtos, alugueres, reservas e encomendas numa Google Sheet
 * criada automaticamente na primeira execução (o ID fica guardado nas
 * Propriedades do Script). As regras de negócio (stock, preços,
 * sobreposição de reservas) estão em core.js, o mesmo código que o site
 * usa em modo demonstração.
 *
 * doGet -> serve o Index.html.
 * O frontend chama as funções api* via google.script.run (sem fetch/CORS).
 *
 * A área de Gestão exige a palavra-passe definida na propriedade do
 * script ADMIN_PASSWORD (Definições do projeto → Propriedades do script).
 *
 * Pagamento online (opcional): com a propriedade STRIPE_SECRET_KEY, o
 * cliente pode pagar com cartão, MB WAY, Multibanco, etc. no Stripe
 * Checkout. O estado do pagamento é sempre confirmado consultando a API
 * do Stripe (nunca com dados vindos do navegador).
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
    cols: ['id', 'criadaEm', 'itemId', 'itemNome', 'inicio', 'fim', 'dias', 'total', 'caucao', 'nome', 'email', 'telefone', 'notas', 'estado',
      'pagamento', 'pagamentoId', 'pagamentoRef', 'pagamentoUrl'],
    num: ['dias', 'total', 'caucao']
  },
  Encomendas: {
    chave: 'encomendas',
    cols: ['id', 'criadaEm', 'nome', 'email', 'telefone', 'entrega', 'morada', 'resumo', 'subtotal', 'taxa', 'total', 'estado', 'linhas',
      'pagamento', 'pagamentoId', 'pagamentoRef', 'pagamentoUrl'],
    num: ['subtotal', 'taxa', 'total'],
    json: ['linhas']
  }
};

var MAX_FALHAS_LOGIN = 10;
var MINUTOS_PARA_PAGAR = 31; // o Stripe exige pelo menos 30 minutos

function pagamentoOnlineAtivo_() {
  return !!PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');
}

function publico_(db) {
  var p = Core.publico(db);
  p.pagamentoOnline = pagamentoOnlineAtivo_();
  return p;
}

// ---------- API chamada pelo frontend ----------

function apiPublico() {
  return comDados_(function (db) {
    return { value: publico_(db) };
  });
}

function apiCriarEncomenda(dados) {
  return criarComPagamento_(dados, Core.criarEncomenda);
}

function apiCriarReserva(dados) {
  return criarComPagamento_(dados, Core.criarReserva);
}

// Cria a encomenda/reserva e, se o cliente escolheu pagar online, o checkout
// do Stripe. Se o Stripe falhar, nada é gravado.
function criarComPagamento_(dados, criar) {
  dados = dados || {};
  if (dados.pagamento === 'Online' && !pagamentoOnlineAtivo_()) throw new Error('O pagamento online não está disponível.');
  return comDados_(function (db) {
    var r = criar(db, dados);
    var checkoutUrl = null;
    if (r.result.estado === Core.AGUARDA) {
      var s = criarCheckout_(r.result);
      Core.registarCheckout(db, r.result.id, s.id, s.url);
      checkoutUrl = s.url;
    }
    return { value: { result: r.result, publico: publico_(db), checkoutUrl: checkoutUrl }, changed: r.changed };
  });
}

/** Chamado quando o cliente volta do Stripe (ou abre a conta). */
function apiVerificarPagamento(ref) {
  return comDados_(function (db) {
    var out = verificarPagamento_(db, Core.findRef(db, String(ref || '')).item.id);
    return { value: Core.estadoPagamento(out.result), changed: out.changed };
  });
}

/** O cliente desistiu no Stripe: fecha o checkout e liberta stock/datas. */
function apiCancelarPagamento(ref) {
  return comDados_(function (db) {
    var it = Core.findRef(db, String(ref || '')).item;
    var out = verificarPagamento_(db, it.id); // pode já ter sido pago entretanto
    if (out.result.estado === Core.AGUARDA) {
      var f = Core.pagamentoFalhado(db, it.id);
      aplicarEfeitos_(f.efeitos);
      out = { result: f.result, changed: out.changed.concat(f.changed) };
    }
    return { value: Core.estadoPagamento(out.result), changed: out.changed };
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
    aplicarEfeitos_(r.efeitos);
    return { value: { result: r.result, publico: publico_(db) }, changed: r.changed };
  });
}

/** Sem `acao` devolve apenas os dados de gestão (serve também de login). */
function apiAdmin(password, acao, args) {
  verificarAdmin_(password);
  return comDados_(function (db) {
    var changed = [];
    if (acao) {
      var r = Core.admin(db, acao, args);
      aplicarEfeitos_(r.efeitos);
      changed = r.changed;
    }
    return {
      value: { encomendas: db.encomendas, reservas: db.reservas, publico: publico_(db) },
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
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_PASSWORD')) {
    Logger.log('Falta definir ADMIN_PASSWORD em Definições do projeto → Propriedades do script.');
  }
  if (props.getProperty('STRIPE_SECRET_KEY')) {
    stripe_('get', '/balance'); // confirma que a chave é válida
    var existe = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'verificarPagamentosPendentes'; });
    if (!existe) ScriptApp.newTrigger('verificarPagamentosPendentes').timeBased().everyMinutes(10).create();
    Logger.log('Pagamento online ativo. Pagamentos pendentes verificados a cada 10 minutos.');
  } else {
    Logger.log('Pagamento online desligado (defina STRIPE_SECRET_KEY para o ativar).');
  }
}

/**
 * Acionador de 10 em 10 minutos (criado por configurar): confirma
 * pagamentos que chegaram mais tarde (ex.: Multibanco) e cancela os que
 * expiraram, libertando stock e datas.
 */
function verificarPagamentosPendentes() {
  if (!pagamentoOnlineAtivo_()) return;
  comDados_(function (db) {
    var changed = [];
    db.encomendas.concat(db.reservas)
      .filter(function (it) { return it.estado === Core.AGUARDA && it.pagamentoId; })
      .forEach(function (it) {
        try { changed = changed.concat(verificarPagamento_(db, it.id).changed); } catch (e) { Logger.log(it.id + ': ' + e.message); }
      });
    return { value: null, changed: changed.filter(function (t, i) { return changed.indexOf(t) === i; }) };
  });
}

// ---------- Stripe ----------

function stripe_(metodo, caminho, payload, idempotencia) {
  var chave = PropertiesService.getScriptProperties().getProperty('STRIPE_SECRET_KEY');
  if (!chave) throw new Error('O pagamento online não está configurado.');
  var opcoes = { method: metodo, headers: { Authorization: 'Bearer ' + chave }, muteHttpExceptions: true };
  if (idempotencia) opcoes.headers['Idempotency-Key'] = idempotencia;
  if (payload) opcoes.payload = payload;
  var res = UrlFetchApp.fetch('https://api.stripe.com/v1' + caminho, opcoes);
  var corpo = JSON.parse(res.getContentText() || '{}');
  if (res.getResponseCode() >= 400) {
    throw new Error('Pagamento: ' + ((corpo.error && corpo.error.message) || ('erro ' + res.getResponseCode())));
  }
  return corpo;
}

function urlApp_() {
  return PropertiesService.getScriptProperties().getProperty('APP_URL') || ScriptApp.getService().getUrl();
}

function criarCheckout_(item) {
  var linhas = item.linhas
    ? item.linhas.map(function (l) { return { nome: l.nome, preco: l.preco, qtd: l.qtd }; })
    : [{ nome: 'Aluguer: ' + item.itemNome + ' (' + item.inicio + ' a ' + item.fim + ')', preco: item.total, qtd: 1 }];
  if (item.taxa) linhas.push({ nome: 'Entrega ao domicílio', preco: item.taxa, qtd: 1 });

  var base = urlApp_();
  var p = {
    mode: 'payment',
    locale: 'pt',
    customer_email: item.email,
    client_reference_id: item.id,
    'metadata[ref]': item.id,
    'payment_intent_data[metadata][ref]': item.id,
    success_url: base + '?pagamento=' + item.id,
    cancel_url: base + '?pagamento=' + item.id + '&cancelado=1',
    expires_at: String(Math.floor(Date.now() / 1000) + MINUTOS_PARA_PAGAR * 60)
  };
  linhas.forEach(function (l, i) {
    var k = 'line_items[' + i + ']';
    p[k + '[quantity]'] = String(l.qtd);
    p[k + '[price_data][currency]'] = 'eur';
    p[k + '[price_data][unit_amount]'] = String(Math.round(l.preco * 100));
    p[k + '[price_data][product_data][name]'] = l.nome;
  });
  return stripe_('post', '/checkout/sessions', p, 'checkout-' + item.id);
}

// Consulta o Stripe e atualiza o item conforme o estado real do pagamento.
function verificarPagamento_(db, ref) {
  var it = Core.findRef(db, ref).item;
  if (it.pagamento !== Core.PAG.PENDENTE || !it.pagamentoId) return { result: it, changed: [] };
  var s = stripe_('get', '/checkout/sessions/' + encodeURIComponent(it.pagamentoId) + '?expand%5B%5D=payment_intent');
  var pi = s.payment_intent || {};
  var out = null;
  if (s.payment_status === 'paid') {
    out = Core.pagamentoConfirmado(db, ref, pi.id || '');
  } else if (s.status === 'expired' || (s.status === 'complete' && (pi.status === 'canceled' || pi.status === 'requires_payment_method'))) {
    out = Core.pagamentoFalhado(db, ref);
  }
  if (!out) return { result: it, changed: [] };
  aplicarEfeitos_(out.efeitos);
  return { result: out.result, changed: out.changed };
}

// Reembolsos têm de ser feitos antes de gravar (se falharem, nada muda);
// fechar checkouts pendentes é só uma arrumação e pode falhar sem problema.
function aplicarEfeitos_(efeitos) {
  if (!efeitos) return;
  efeitos.reembolsar.forEach(function (it) {
    if (!it.pagamentoRef) throw new Error('Não encontrei o pagamento de ' + it.id + ' para reembolsar; faça-o no painel do Stripe.');
    stripe_('post', '/refunds', { payment_intent: it.pagamentoRef, 'metadata[ref]': it.id }, 'reembolso-' + it.id);
  });
  efeitos.expirar.forEach(function (it) {
    if (!it.pagamentoId) return;
    try { fecharCheckout_(it); } catch (e) { Logger.log('Fechar pagamento de ' + it.id + ': ' + e.message); }
  });
}

// Garante que um pagamento de algo já cancelado não fica a cobrar o cliente.
function fecharCheckout_(it) {
  var id = encodeURIComponent(it.pagamentoId);
  try { stripe_('post', '/checkout/sessions/' + id + '/expire'); return; } catch (e) { /* já não está aberto: ver porquê */ }
  var s = stripe_('get', '/checkout/sessions/' + id + '?expand%5B%5D=payment_intent');
  var pi = s.payment_intent;
  if (!pi) return;
  if (s.payment_status === 'paid' || pi.status === 'succeeded') {
    stripe_('post', '/refunds', { payment_intent: pi.id, 'metadata[ref]': it.id }, 'reembolso-' + it.id);
    it.pagamento = Core.PAG.REEMBOLSADO;
    it.pagamentoRef = pi.id;
  } else if (pi.status !== 'canceled') {
    // Ex.: referência Multibanco já emitida mas ainda não paga.
    stripe_('post', '/payment_intents/' + encodeURIComponent(pi.id) + '/cancel');
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
