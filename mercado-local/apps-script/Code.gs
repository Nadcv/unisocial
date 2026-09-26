// GERADO por build-apps-script.mjs a partir de data.js, core.js e servidor.gs — não editar aqui.

// ===== data.js =====
// Produtos e alugueres iniciais. No navegador são usados na primeira visita
// (modo demonstração); no Apps Script (incluídos em apps-script/Code.gs) preenchem a
// Google Sheet quando ela é criada.
var SEED = {
  produtos: [
    { id: 'p1', nome: 'Mel de rosmaninho', categoria: 'Mercearia', preco: 7.5, unidade: 'frasco 500 g', stock: 24, produtor: 'Apicultura Serra Verde', local: 'Serra da Estrela', emoji: '🍯', descricao: 'Mel cru, extraído a frio, da colheita da primavera.' },
    { id: 'p2', nome: 'Queijo de ovelha curado', categoria: 'Laticínios', preco: 12.9, unidade: 'peça ~600 g', stock: 10, produtor: 'Queijaria do Vale', local: 'Castelo Branco', emoji: '🧀', descricao: 'Curado 60 dias, leite cru de ovelha.' },
    { id: 'p3', nome: 'Azeite virgem extra', categoria: 'Mercearia', preco: 9.8, unidade: 'garrafa 750 ml', stock: 40, produtor: 'Lagar da Ribeira', local: 'Trás-os-Montes', emoji: '🫒', descricao: 'Acidez inferior a 0,3%, prensagem a frio.' },
    { id: 'p4', nome: 'Cabaz de legumes da época', categoria: 'Hortícolas', preco: 15, unidade: 'cabaz ~5 kg', stock: 12, produtor: 'Horta da Quinta Nova', local: 'Oeste', emoji: '🥬', descricao: 'Seleção semanal de legumes biológicos colhidos na véspera.' },
    { id: 'p5', nome: 'Pão de centeio', categoria: 'Padaria', preco: 3.2, unidade: 'pão 800 g', stock: 30, produtor: 'Forno de Lenha da Aldeia', local: 'Minho', emoji: '🍞', descricao: 'Massa-mãe, fermentação lenta, cozido em forno de lenha.' },
    { id: 'p6', nome: 'Compota de figo', categoria: 'Mercearia', preco: 4.5, unidade: 'frasco 300 g', stock: 18, produtor: 'Doces da Avó Rosa', local: 'Algarve', emoji: '🫙', descricao: 'Sem conservantes, 60% fruta.' },
    { id: 'p7', nome: 'Ovos caseiros', categoria: 'Laticínios', preco: 3.6, unidade: 'dúzia', stock: 25, produtor: 'Quinta das Galinhas Felizes', local: 'Ribatejo', emoji: '🥚', descricao: 'Galinhas criadas ao ar livre.' },
    { id: 'p8', nome: 'Maçã Bravo de Esmolfe', categoria: 'Fruta', preco: 2.4, unidade: 'kg', stock: 60, produtor: 'Pomar do Dão', local: 'Viseu', emoji: '🍎', descricao: 'Variedade DOP, aroma intenso.' },
    { id: 'p9', nome: 'Vinho tinto regional', categoria: 'Bebidas', preco: 8.9, unidade: 'garrafa 750 ml', stock: 36, produtor: 'Adega Cooperativa', local: 'Alentejo', emoji: '🍷', descricao: 'Aragonez e Trincadeira, estagiado em barrica.' },
    { id: 'p10', nome: 'Cesto de vime artesanal', categoria: 'Artesanato', preco: 22, unidade: 'unidade', stock: 6, produtor: 'Cestaria Tradicional', local: 'Gonçalo', emoji: '🧺', descricao: 'Feito à mão, ideal para compras e piqueniques.' }
  ],
  alugueres: [
    { id: 'a1', nome: 'Casa de campo com piscina', tipo: 'Alojamento', precoDia: 120, caucao: 200, capacidade: '6 pessoas', local: 'Monsaraz', emoji: '🏡', proprietario: 'Joana M.', descricao: '3 quartos, piscina, churrasqueira e vista para o lago.' },
    { id: 'a2', nome: 'Salão de festas da junta', tipo: 'Espaço', precoDia: 90, caucao: 100, capacidade: '80 pessoas', local: 'Centro', emoji: '🎉', proprietario: 'Junta de Freguesia', descricao: 'Mesas, cadeiras, cozinha de apoio e som básico incluídos.' },
    { id: 'a3', nome: 'Betoneira 160 L', tipo: 'Equipamento', precoDia: 18, caucao: 50, capacidade: '160 L', local: 'Zona Industrial', emoji: '🏗️', proprietario: 'Obras Silva', descricao: 'Motor elétrico 230 V, ideal para pequenas obras.' },
    { id: 'a4', nome: 'Motosserra a gasolina', tipo: 'Equipamento', precoDia: 25, caucao: 80, capacidade: 'Sabre 45 cm', local: 'Aldeia Nova', emoji: '🪚', proprietario: 'Rui P.', descricao: 'Inclui óleo de corrente e viseira de proteção.' },
    { id: 'a5', nome: 'Bicicleta elétrica', tipo: 'Transporte', precoDia: 22, caucao: 100, capacidade: 'Autonomia 60 km', local: 'Centro', emoji: '🚲', proprietario: 'Pedala Local', descricao: 'Capacete e cadeado incluídos.' },
    { id: 'a6', nome: 'Tenda para eventos 6×4 m', tipo: 'Equipamento', precoDia: 45, caucao: 100, capacidade: '40 pessoas', local: 'Vila', emoji: '⛺', proprietario: 'Festas & Cia', descricao: 'Montagem não incluída (serviço opcional).' },
    { id: 'a7', nome: 'Máquina de lavar a alta pressão', tipo: 'Equipamento', precoDia: 15, caucao: 40, capacidade: '140 bar', local: 'Zona Industrial', emoji: '💦', proprietario: 'Obras Silva', descricao: 'Ideal para pátios, muros e viaturas.' },
    { id: 'a8', nome: 'Carrinha de 9 lugares', tipo: 'Transporte', precoDia: 75, caucao: 300, capacidade: '9 lugares', local: 'Vila', emoji: '🚐', proprietario: 'Transportes Costa', descricao: 'Quilometragem ilimitada, seguro incluído.' }
  ]
};

// ===== core.js =====
// Regras de negócio do Mercado Local, partilhadas entre o navegador
// (modo demonstração, dados no localStorage) e o Google Apps Script
// (modo real, dados numa Google Sheet — incluído em apps-script/Code.gs).
//
// Todas as funções recebem `db` = { produtos, alugueres, reservas, encomendas },
// alteram-no quando é caso disso e devolvem { result, changed, efeitos }:
//   changed  — tabelas que têm de ser gravadas;
//   efeitos  — { reembolsar: [itens], expirar: [itens] }, pagamentos online que
//              o servidor tem de reembolsar ou cujo checkout tem de fechar.

var Core = (function () {
  var TAXA_ENTREGA = 3.5;
  var ENTREGA_GRATIS_A_PARTIR = 40;
  var MAX_DIAS_RESERVA = 90;
  var AGUARDA = 'Aguarda pagamento';
  var ESTADOS_ENCOMENDA = [AGUARDA, 'Recebida', 'Preparada', 'Entregue', 'Cancelada'];
  var ESTADOS_RESERVA = [AGUARDA, 'Pendente', 'Confirmada', 'Concluída', 'Cancelada'];
  // Campo `pagamento` de encomendas e reservas.
  var PAG = { ENTREGA: 'Na entrega', PENDENTE: 'Pendente', PAGO: 'Pago', NAO_PAGO: 'Não pago', REEMBOLSADO: 'Reembolsado' };

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
    var online = d.pagamento === 'Online';
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
      subtotal: subtotal, taxa: taxa, total: round2(subtotal + taxa),
      estado: online ? AGUARDA : 'Recebida', pagamento: online ? PAG.PENDENTE : PAG.ENTREGA,
      pagamentoId: '', pagamentoRef: '', pagamentoUrl: ''
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

    var online = d.pagamento === 'Online';
    var r = {
      id: uid('R'), itemId: a.id, itemNome: a.nome, inicio: ini, fim: fim, dias: dias,
      total: round2(a.precoDia * dias), caucao: a.caucao,
      nome: c.nome, email: c.email, telefone: c.telefone, notas: str(d.notas, 500),
      estado: online ? AGUARDA : 'Pendente', criadaEm: new Date().toISOString(),
      pagamento: online ? PAG.PENDENTE : PAG.ENTREGA, pagamentoId: '', pagamentoRef: '', pagamentoUrl: ''
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
    return { result: r, changed: ['Reservas'], efeitos: cancelar(db, r) };
  }

  // Cancela uma encomenda ou reserva: repõe o stock (encomendas) e indica
  // o que fazer ao pagamento online (reembolsar se pago, fechar se pendente).
  function cancelar(db, item) {
    var efeitos = { reembolsar: [], expirar: [] };
    if (item.estado === 'Cancelada') return efeitos;
    if (item.linhas) {
      item.linhas.forEach(function (l) { var p = find(db.produtos, l.id); if (p) p.stock += l.qtd; });
    }
    item.estado = 'Cancelada';
    if (item.pagamento === PAG.PAGO) { item.pagamento = PAG.REEMBOLSADO; efeitos.reembolsar.push(item); }
    else if (item.pagamento === PAG.PENDENTE) { item.pagamento = PAG.NAO_PAGO; efeitos.expirar.push(item); }
    return efeitos;
  }

  // ---------- Pagamento online ----------
  function findRef(db, ref) {
    var e = find(db.encomendas, ref);
    if (e) return { item: e, tabela: 'Encomendas' };
    var r = find(db.reservas, ref);
    if (r) return { item: r, tabela: 'Reservas' };
    fail('Referência não encontrada.');
  }
  function tabelas(t) { return t === 'Encomendas' ? ['Encomendas', 'Produtos'] : ['Reservas']; }

  // Estado visível a quem tem a referência (sem dados pessoais).
  function estadoPagamento(item) {
    return { id: item.id, tipo: item.linhas ? 'encomenda' : 'reserva', estado: item.estado, pagamento: item.pagamento, total: item.total, pagamentoUrl: item.estado === AGUARDA ? item.pagamentoUrl : '' };
  }

  // Guarda os dados do checkout criado no fornecedor de pagamentos.
  function registarCheckout(db, ref, id, url) {
    var f = findRef(db, ref);
    f.item.pagamentoId = str(id, 200);
    f.item.pagamentoUrl = str(url, 1000);
    return { result: f.item, changed: [f.tabela] };
  }

  function pagamentoConfirmado(db, ref, pagamentoRef) {
    var f = findRef(db, ref), it = f.item;
    var efeitos = { reembolsar: [], expirar: [] };
    if (it.pagamento === PAG.PAGO || it.pagamento === PAG.REEMBOLSADO) return { result: it, changed: [] };
    it.pagamentoRef = str(pagamentoRef, 200);
    it.pagamentoUrl = '';
    if (it.estado === 'Cancelada') {
      // Pago depois de cancelado (ex.: Multibanco pago fora de prazo): devolve o dinheiro.
      it.pagamento = PAG.REEMBOLSADO;
      efeitos.reembolsar.push(it);
    } else {
      it.pagamento = PAG.PAGO;
      if (it.estado === AGUARDA) it.estado = it.linhas ? 'Recebida' : 'Pendente';
    }
    return { result: it, changed: [f.tabela], efeitos: efeitos };
  }

  function pagamentoFalhado(db, ref) {
    var f = findRef(db, ref), it = f.item;
    if (it.estado !== AGUARDA) return { result: it, changed: [] };
    var efeitos = cancelar(db, it);
    it.pagamentoUrl = '';
    return { result: it, changed: tabelas(f.tabela), efeitos: efeitos };
  }

  // ---------- Gestão ----------
  function admin(db, acao, args) {
    args = args || {};
    var fn = ADMIN[acao];
    if (!fn) fail('Ação desconhecida.');
    return fn(db, args);
  }

  // "Aguarda pagamento" só muda com o pagamento (ou com o cancelamento).
  function validarEstado(item, novo, estados) {
    if (estados.indexOf(novo) === -1 || novo === AGUARDA) fail('Estado inválido.');
    if (item.estado === AGUARDA && novo !== 'Cancelada') fail('Aguarda o pagamento online; só pode ser cancelada.');
  }

  var ADMIN = {
    estadoEncomenda: function (db, a) {
      var e = find(db.encomendas, a.id);
      if (!e) fail('Encomenda não encontrada.');
      validarEstado(e, a.estado, ESTADOS_ENCOMENDA);
      if (e.estado === 'Cancelada') fail('Uma encomenda cancelada não pode ser reaberta.');
      if (a.estado === 'Cancelada') return { result: e, changed: ['Encomendas', 'Produtos'], efeitos: cancelar(db, e) };
      e.estado = a.estado;
      return { result: e, changed: ['Encomendas'] };
    },
    estadoReserva: function (db, a) {
      var r = find(db.reservas, a.id);
      if (!r) fail('Reserva não encontrada.');
      validarEstado(r, a.estado, ESTADOS_RESERVA);
      if (r.estado === 'Cancelada' && a.estado !== 'Cancelada') {
        if (r.pagamento === PAG.REEMBOLSADO || r.pagamento === PAG.NAO_PAGO) fail('O pagamento online desta reserva foi anulado; peça ao cliente uma nova reserva.');
        if (!rangeIsFree(ocupacoes(db), r.itemId, r.inicio, r.fim, r.id)) fail('As datas já estão ocupadas por outra reserva.');
      }
      if (a.estado === 'Cancelada') return { result: r, changed: ['Reservas'], efeitos: cancelar(db, r) };
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

  // Base de dados inicial a partir de SEED (data.js).
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
          telefone: '', notas: '', estado: 'Confirmada', criadaEm: new Date().toISOString(),
          pagamento: PAG.ENTREGA, pagamentoId: '', pagamentoRef: '', pagamentoUrl: ''
        });
      });
    }
    return db;
  }

  return {
    TAXA_ENTREGA: TAXA_ENTREGA, ENTREGA_GRATIS_A_PARTIR: ENTREGA_GRATIS_A_PARTIR,
    ESTADOS_ENCOMENDA: ESTADOS_ENCOMENDA, ESTADOS_RESERVA: ESTADOS_RESERVA, AGUARDA: AGUARDA, PAG: PAG,
    toISO: toISO, fromISO: fromISO, addDays: addDays, daysBetweenInclusive: daysBetweenInclusive, todayISO: todayISO,
    validEmail: validEmail, busyDays: busyDays, rangeIsFree: rangeIsFree,
    publico: publico, criarEncomenda: criarEncomenda, criarReserva: criarReserva,
    minhaConta: minhaConta, cancelarReserva: cancelarReserva, admin: admin, seed: seed,
    findRef: findRef, estadoPagamento: estadoPagamento, registarCheckout: registarCheckout,
    pagamentoConfirmado: pagamentoConfirmado, pagamentoFalhado: pagamentoFalhado
  };
})();

// ===== servidor.gs =====
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
