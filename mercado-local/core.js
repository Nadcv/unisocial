// Regras de negócio do Mercado Local, partilhadas entre o navegador
// (modo demonstração, dados no localStorage) e o Google Apps Script
// (modo real, dados numa Google Sheet — este ficheiro é copiado como Core.gs).
//
// Todas as funções recebem `db` = { produtos, alugueres, reservas, encomendas },
// alteram-no quando é caso disso e devolvem { result, changed }, em que
// `changed` lista as tabelas que têm de ser gravadas.

var Core = (function () {
  var TAXA_ENTREGA = 3.5;
  var ENTREGA_GRATIS_A_PARTIR = 40;
  var MAX_DIAS_RESERVA = 90;
  var ESTADOS_ENCOMENDA = ['Recebida', 'Preparada', 'Entregue', 'Cancelada'];
  var ESTADOS_RESERVA = ['Pendente', 'Confirmada', 'Concluída', 'Cancelada'];

  // ---------- Datas (sempre 'AAAA-MM-DD' no fuso horário local) ----------
  function toISO(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function fromISO(s) { var p = s.split('-').map(Number); return new Date(p[0], p[1] - 1, p[2]); }
  function addDays(d, n) { var x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function daysBetweenInclusive(a, b) { return Math.round((fromISO(b) - fromISO(a)) / 86400000) + 1; }
  function todayISO() { return toISO(new Date()); }
  function isISODate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(fromISO(s)) === s; }

  function uid(prefix) {
    return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  }
  function str(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 200); }
  function num(v) { var n = Number(v); return isFinite(n) ? n : NaN; }
  function round2(n) { return Math.round(n * 100) / 100; }
  function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
  function fail(msg) { throw new Error(msg); }
  function find(list, id) { for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i]; return null; }

  // Reserva que ocupa dias no calendário.
  function ocupa(r) { return r.estado !== 'Cancelada'; }

  function busyDays(ocupacoes, itemId, ignoreId) {
    var set = {};
    ocupacoes.forEach(function (r) {
      if (r.itemId !== itemId || r.id === ignoreId) return;
      for (var d = fromISO(r.inicio); toISO(d) <= r.fim; d = addDays(d, 1)) set[toISO(d)] = true;
    });
    return set;
  }
  function rangeIsFree(ocupacoes, itemId, ini, fim, ignoreId) {
    var busy = busyDays(ocupacoes, itemId, ignoreId);
    for (var d = fromISO(ini); toISO(d) <= fim; d = addDays(d, 1)) if (busy[toISO(d)]) return false;
    return true;
  }
  function ocupacoes(db) {
    return db.reservas.filter(ocupa).map(function (r) { return { id: r.id, itemId: r.itemId, inicio: r.inicio, fim: r.fim }; });
  }

  // Dados que qualquer visitante pode ver (sem dados pessoais).
  function publico(db) {
    return { produtos: db.produtos, alugueres: db.alugueres, ocupacoes: ocupacoes(db) };
  }

  function cliente(d) {
    var c = { nome: str(d.nome, 100), email: str(d.email, 120).toLowerCase(), telefone: str(d.telefone, 30) };
    if (!c.nome) fail('Indique o nome.');
    if (!validEmail(c.email)) fail('Email inválido.');
    return c;
  }

  // ---------- Cliente ----------
  function criarEncomenda(db, d) {
    d = d || {};
    var c = cliente(d);
    var entrega = d.entrega === 'Entrega' ? 'Entrega' : 'Recolha';
    var morada = str(d.morada, 300);
    if (entrega === 'Entrega' && !morada) fail('Indique a morada de entrega.');
    var pedido = Array.isArray(d.linhas) ? d.linhas : [];
    if (!pedido.length) fail('O carrinho está vazio.');

    // Preços e stock vêm sempre da base de dados, nunca do navegador.
    var linhas = pedido.map(function (l) {
      var p = find(db.produtos, l.id);
      var qtd = Math.floor(num(l.qtd));
      if (!p) fail('Um dos produtos já não está disponível.');
      if (!(qtd > 0)) fail('Quantidade inválida.');
      if (qtd > p.stock) fail('Stock insuficiente de ' + p.nome + ' (restam ' + p.stock + ').');
      return { id: p.id, nome: p.nome, emoji: p.emoji, preco: p.preco, qtd: qtd };
    });
    var subtotal = round2(linhas.reduce(function (s, l) { return s + l.preco * l.qtd; }, 0));
    var taxa = entrega === 'Entrega' && subtotal < ENTREGA_GRATIS_A_PARTIR ? TAXA_ENTREGA : 0;
    linhas.forEach(function (l) { find(db.produtos, l.id).stock -= l.qtd; });

    var enc = {
      id: uid('E'), criadaEm: new Date().toISOString(),
      nome: c.nome, email: c.email, telefone: c.telefone, entrega: entrega, morada: entrega === 'Entrega' ? morada : '',
      linhas: linhas, resumo: resumoLinhas(linhas),
      subtotal: subtotal, taxa: taxa, total: round2(subtotal + taxa), estado: 'Recebida'
    };
    db.encomendas.unshift(enc);
    return { result: enc, changed: ['Encomendas', 'Produtos'] };
  }
  function resumoLinhas(linhas) { return linhas.map(function (l) { return l.qtd + '× ' + l.nome; }).join(', '); }

  function criarReserva(db, d) {
    d = d || {};
    var c = cliente(d);
    var a = find(db.alugueres, d.itemId);
    if (!a) fail('Aluguer não encontrado.');
    var ini = str(d.inicio, 10), fim = str(d.fim || d.inicio, 10);
    if (!isISODate(ini) || !isISODate(fim)) fail('Escolha as datas no calendário.');
    if (ini < todayISO()) fail('A data de início já passou.');
    if (fim < ini) fail('A data de fim é anterior à de início.');
    var dias = daysBetweenInclusive(ini, fim);
    if (dias > MAX_DIAS_RESERVA) fail('Máximo de ' + MAX_DIAS_RESERVA + ' dias por reserva.');
    if (!rangeIsFree(ocupacoes(db), a.id, ini, fim)) fail('O período escolhido inclui dias já reservados.');

    var r = {
      id: uid('R'), itemId: a.id, itemNome: a.nome, inicio: ini, fim: fim, dias: dias,
      total: round2(a.precoDia * dias), caucao: a.caucao,
      nome: c.nome, email: c.email, telefone: c.telefone, notas: str(d.notas, 500),
      estado: 'Pendente', criadaEm: new Date().toISOString()
    };
    db.reservas.unshift(r);
    return { result: r, changed: ['Reservas'] };
  }

  // O cliente identifica-se com o email e a referência de uma das suas
  // encomendas/reservas, para que ninguém veja dados alheios só com um email.
  function autenticarCliente(db, email, ref) {
    email = str(email, 120).toLowerCase();
    ref = str(ref, 40).toUpperCase();
    var ok = db.encomendas.concat(db.reservas).some(function (x) { return x.id === ref && x.email === email; });
    if (!email || !ref || !ok) fail('Email ou referência incorretos.');
    return email;
  }
  function minhaConta(db, email, ref) {
    email = autenticarCliente(db, email, ref);
    return {
      result: {
        encomendas: db.encomendas.filter(function (e) { return e.email === email; }),
        reservas: db.reservas.filter(function (r) { return r.email === email; })
      },
      changed: []
    };
  }
  function cancelarReserva(db, email, ref, id) {
    email = autenticarCliente(db, email, ref);
    var r = find(db.reservas, id);
    if (!r || r.email !== email) fail('Reserva não encontrada.');
    if (r.estado === 'Cancelada' || r.estado === 'Concluída') fail('Esta reserva já não pode ser cancelada.');
    if (r.fim < todayISO()) fail('Esta reserva já terminou.');
    r.estado = 'Cancelada';
    return { result: r, changed: ['Reservas'] };
  }

  // ---------- Gestão ----------
  function admin(db, acao, args) {
    args = args || {};
    var fn = ADMIN[acao];
    if (!fn) fail('Ação desconhecida.');
    return fn(db, args);
  }

  var ADMIN = {
    estadoEncomenda: function (db, a) {
      var e = find(db.encomendas, a.id);
      if (!e) fail('Encomenda não encontrada.');
      if (ESTADOS_ENCOMENDA.indexOf(a.estado) === -1) fail('Estado inválido.');
      if (e.estado === 'Cancelada') fail('Uma encomenda cancelada não pode ser reaberta.');
      var changed = ['Encomendas'];
      if (a.estado === 'Cancelada') {
        e.linhas.forEach(function (l) { var p = find(db.produtos, l.id); if (p) p.stock += l.qtd; });
        changed.push('Produtos');
      }
      e.estado = a.estado;
      return { result: e, changed: changed };
    },
    estadoReserva: function (db, a) {
      var r = find(db.reservas, a.id);
      if (!r) fail('Reserva não encontrada.');
      if (ESTADOS_RESERVA.indexOf(a.estado) === -1) fail('Estado inválido.');
      if (r.estado === 'Cancelada' && a.estado !== 'Cancelada' && !rangeIsFree(ocupacoes(db), r.itemId, r.inicio, r.fim, r.id)) {
        fail('As datas já estão ocupadas por outra reserva.');
      }
      r.estado = a.estado;
      return { result: r, changed: ['Reservas'] };
    },
    guardarProduto: function (db, a) {
      var p = {
        nome: str(a.nome, 100), categoria: str(a.categoria, 50), unidade: str(a.unidade, 50) || 'unidade',
        preco: round2(num(a.preco)), stock: Math.floor(num(a.stock)),
        produtor: str(a.produtor, 100), local: str(a.local, 100), emoji: str(a.emoji, 8) || '📦', descricao: str(a.descricao, 500)
      };
      if (!p.nome || !p.categoria || !p.produtor) fail('Preencha nome, categoria e produtor.');
      if (!(p.preco >= 0) || !(p.stock >= 0)) fail('Preço e stock têm de ser números positivos.');
      var existente = a.id ? find(db.produtos, a.id) : null;
      if (a.id && !existente) fail('Produto não encontrado.');
      if (existente) Object.keys(p).forEach(function (k) { existente[k] = p[k]; });
      else { p.id = uid('P'); db.produtos.push(p); }
      return { result: existente || p, changed: ['Produtos'] };
    },
    apagarProduto: function (db, a) {
      db.produtos = db.produtos.filter(function (p) { return p.id !== a.id; });
      return { result: null, changed: ['Produtos'] };
    },
    guardarAluguer: function (db, a) {
      var x = {
        nome: str(a.nome, 100), tipo: str(a.tipo, 50) || 'Equipamento', capacidade: str(a.capacidade, 100),
        precoDia: round2(num(a.precoDia)), caucao: round2(num(a.caucao) || 0),
        proprietario: str(a.proprietario, 100), local: str(a.local, 100), emoji: str(a.emoji, 8) || '📦', descricao: str(a.descricao, 500)
      };
      if (!x.nome || !x.proprietario) fail('Preencha nome e proprietário.');
      if (!(x.precoDia >= 0) || !(x.caucao >= 0)) fail('Preço e caução têm de ser números positivos.');
      var existente = a.id ? find(db.alugueres, a.id) : null;
      if (a.id && !existente) fail('Aluguer não encontrado.');
      if (existente) Object.keys(x).forEach(function (k) { existente[k] = x[k]; });
      else { x.id = uid('A'); db.alugueres.push(x); }
      return { result: existente || x, changed: ['Alugueres'] };
    },
    apagarAluguer: function (db, a) {
      var hoje = todayISO();
      if (db.reservas.some(function (r) { return r.itemId === a.id && ocupa(r) && r.fim >= hoje; })) {
        fail('Não é possível apagar: tem reservas futuras.');
      }
      db.alugueres = db.alugueres.filter(function (x) { return x.id !== a.id; });
      return { result: null, changed: ['Alugueres'] };
    }
  };

  // Base de dados inicial a partir de SEED (data.js / Dados.gs).
  function seed(comReservasExemplo) {
    var db = {
      produtos: JSON.parse(JSON.stringify(SEED.produtos)),
      alugueres: JSON.parse(JSON.stringify(SEED.alugueres)),
      reservas: [],
      encomendas: []
    };
    if (comReservasExemplo) {
      var hoje = new Date();
      [['a1', 5, 3], ['a1', 14, 4], ['a3', 2, 2], ['a6', 7, 1], ['a8', 10, 3]].forEach(function (x) {
        var a = find(db.alugueres, x[0]);
        var ini = addDays(hoje, x[1]);
        db.reservas.push({
          id: uid('R'), itemId: a.id, itemNome: a.nome, inicio: toISO(ini), fim: toISO(addDays(ini, x[2] - 1)), dias: x[2],
          total: a.precoDia * x[2], caucao: a.caucao, nome: 'Reserva de exemplo', email: 'exemplo@mercadolocal.pt',
          telefone: '', notas: '', estado: 'Confirmada', criadaEm: new Date().toISOString()
        });
      });
    }
    return db;
  }

  return {
    TAXA_ENTREGA: TAXA_ENTREGA, ENTREGA_GRATIS_A_PARTIR: ENTREGA_GRATIS_A_PARTIR,
    ESTADOS_ENCOMENDA: ESTADOS_ENCOMENDA, ESTADOS_RESERVA: ESTADOS_RESERVA,
    toISO: toISO, fromISO: fromISO, addDays: addDays, daysBetweenInclusive: daysBetweenInclusive, todayISO: todayISO,
    validEmail: validEmail, busyDays: busyDays, rangeIsFree: rangeIsFree,
    publico: publico, criarEncomenda: criarEncomenda, criarReserva: criarReserva,
    minhaConta: minhaConta, cancelarReserva: cancelarReserva, admin: admin, seed: seed
  };
})();
