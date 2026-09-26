(function () {
  'use strict';

  // ---------- Estado e persistência ----------
  const STORAGE_KEY = 'mercadoLocal.v1';
  const TAXA_ENTREGA = 3.5;
  const ENTREGA_GRATIS_A_PARTIR = 40;

  function seedState() {
    return {
      produtos: JSON.parse(JSON.stringify(window.SEED.produtos)),
      alugueres: JSON.parse(JSON.stringify(window.SEED.alugueres)),
      reservas: demoReservas(),
      encomendas: [],
      carrinho: [],
      email: ''
    };
  }

  // Algumas reservas de exemplo para que o calendário mostre dias ocupados.
  function demoReservas() {
    const hoje = new Date();
    const r = (itemId, offset, dias) => {
      const ini = addDays(hoje, offset);
      return {
        id: uid('R'), itemId, inicio: toISO(ini), fim: toISO(addDays(ini, dias - 1)),
        dias, total: 0, caucao: 0, nome: 'Reserva de exemplo', email: 'exemplo@mercadolocal.pt',
        telefone: '', notas: '', estado: 'Confirmada', criadaEm: new Date().toISOString()
      };
    };
    return [r('a1', 5, 3), r('a1', 14, 4), r('a3', 2, 2), r('a6', 7, 1), r('a8', 10, 3)];
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (s && Array.isArray(s.produtos)) return s;
      }
    } catch (e) { /* armazenamento indisponível: usa dados de demonstração */ }
    return seedState();
  }
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* ignora */ }
  }

  let state = load();

  // ---------- Utilitários ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
  const money = (v) => eur.format(v || 0);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function uid(prefix) {
    return prefix + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  }
  function toISO(d) {
    const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  function fromISO(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); }
  function addDays(d, n) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; }
  function daysBetweenInclusive(a, b) { return Math.round((fromISO(b) - fromISO(a)) / 86400000) + 1; }
  function fmtDate(s) { return fromISO(s).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' }); }
  function fmtDateTime(s) { return new Date(s).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' }); }
  const todayISO = () => toISO(new Date());
  const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  // Dias ocupados de um item (reservas não canceladas), como Set de ISO.
  function busyDays(itemId, ignoreId) {
    const set = new Set();
    state.reservas.forEach((r) => {
      if (r.itemId !== itemId || r.estado === 'Cancelada' || r.id === ignoreId) return;
      for (let d = fromISO(r.inicio); toISO(d) <= r.fim; d = addDays(d, 1)) set.add(toISO(d));
    });
    return set;
  }
  function rangeIsFree(itemId, ini, fim) {
    const busy = busyDays(itemId);
    for (let d = fromISO(ini); toISO(d) <= fim; d = addDays(d, 1)) if (busy.has(toISO(d))) return false;
    return true;
  }

  // ---------- Carrinho ----------
  function cartLines() {
    return state.carrinho
      .map((l) => ({ ...l, produto: state.produtos.find((p) => p.id === l.id) }))
      .filter((l) => l.produto);
  }
  function cartSubtotal() { return cartLines().reduce((s, l) => s + l.produto.preco * l.qtd, 0); }
  function addToCart(id, qtd = 1) {
    const p = state.produtos.find((x) => x.id === id);
    if (!p) return;
    const line = state.carrinho.find((l) => l.id === id);
    const atual = line ? line.qtd : 0;
    if (atual + qtd > p.stock) { toast(`Só há ${p.stock} em stock.`); return; }
    if (line) line.qtd += qtd; else state.carrinho.push({ id, qtd });
    save(); updateCartBadge(); renderCart();
    toast(`${p.nome} adicionado ao carrinho`);
  }
  function setQty(id, qtd) {
    const p = state.produtos.find((x) => x.id === id);
    const line = state.carrinho.find((l) => l.id === id);
    if (!line) return;
    if (qtd <= 0) state.carrinho = state.carrinho.filter((l) => l.id !== id);
    else line.qtd = Math.min(qtd, p ? p.stock : qtd);
    save(); updateCartBadge(); renderCart();
  }
  function updateCartBadge() {
    $('#cartCount').textContent = state.carrinho.reduce((s, l) => s + l.qtd, 0);
  }
  function openCart() { renderCart(); $('#cartDrawer').classList.add('open'); $('#cartDrawer').setAttribute('aria-hidden', 'false'); }
  function closeCart() { $('#cartDrawer').classList.remove('open'); $('#cartDrawer').setAttribute('aria-hidden', 'true'); }

  function renderCart() {
    const body = $('#cartBody');
    const lines = cartLines();
    if (!lines.length) {
      body.innerHTML = `<div class="empty">O carrinho está vazio.<br><br><a class="btn" href="#/produtos" data-close-drawer>Ver produtos</a></div>`;
      return;
    }
    const sub = cartSubtotal();
    body.innerHTML = lines.map((l) => `
      <div class="cart-line">
        <div class="e">${l.produto.emoji}</div>
        <div>
          <div><strong>${esc(l.produto.nome)}</strong></div>
          <div class="small muted">${money(l.produto.preco)} / ${esc(l.produto.unidade)}</div>
          <div class="qty">
            <button data-qty="${l.id}" data-d="-1" aria-label="Menos">−</button>
            <span>${l.qtd}</span>
            <button data-qty="${l.id}" data-d="1" aria-label="Mais">+</button>
          </div>
        </div>
        <div class="price">${money(l.produto.preco * l.qtd)}</div>
      </div>`).join('') + `
      <div class="summary">
        <span>Subtotal</span><span>${money(sub)}</span>
      </div>
      <p class="small muted">Entrega ao domicílio: ${money(TAXA_ENTREGA)} (grátis acima de ${money(ENTREGA_GRATIS_A_PARTIR)}). Recolha no mercado é grátis.</p>
      <button class="btn primary" style="width:100%" id="checkoutBtn">Finalizar encomenda</button>`;
  }

  function openCheckout() {
    const lines = cartLines();
    if (!lines.length) return;
    closeCart();
    const sub = cartSubtotal();
    openModal(`
      <h2>Finalizar encomenda</h2>
      <form id="checkoutForm">
        <div class="field"><label for="c-nome">Nome</label><input id="c-nome" name="nome" required></div>
        <div class="row">
          <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" required value="${esc(state.email)}"></div>
          <div class="field"><label for="c-tel">Telefone</label><input id="c-tel" name="telefone" type="tel"></div>
        </div>
        <div class="field"><label for="c-entrega">Entrega</label>
          <select id="c-entrega" name="entrega">
            <option value="Recolha">Recolha no mercado (grátis)</option>
            <option value="Entrega">Entrega ao domicílio</option>
          </select>
        </div>
        <div class="field" id="moradaField" hidden><label for="c-morada">Morada</label><textarea id="c-morada" name="morada" rows="2"></textarea></div>
        <div class="summary" id="checkoutSummary"></div>
        <div id="checkoutErr"></div>
        <button class="btn primary" style="width:100%" type="submit">Confirmar encomenda</button>
        <p class="small muted">Pagamento na entrega ou recolha (MB Way, multibanco ou numerário).</p>
      </form>`);
    const form = $('#checkoutForm');
    const upd = () => {
      const entrega = form.entrega.value === 'Entrega';
      $('#moradaField').hidden = !entrega;
      const taxa = entrega && sub < ENTREGA_GRATIS_A_PARTIR ? TAXA_ENTREGA : 0;
      $('#checkoutSummary').innerHTML = `
        <span>Subtotal (${lines.reduce((s, l) => s + l.qtd, 0)} artigos)</span><span>${money(sub)}</span>
        <span>Entrega</span><span>${money(taxa)}</span>
        <span class="total">Total</span><span class="total">${money(sub + taxa)}</span>`;
      return taxa;
    };
    upd();
    form.entrega.addEventListener('change', upd);
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const errs = [];
      if (!f.nome.trim()) errs.push('Indique o nome.');
      if (!validEmail(f.email)) errs.push('Email inválido.');
      if (f.entrega === 'Entrega' && !f.morada.trim()) errs.push('Indique a morada de entrega.');
      // Revalida stock no momento da compra.
      cartLines().forEach((l) => { if (l.qtd > l.produto.stock) errs.push(`Stock insuficiente de ${l.produto.nome}.`); });
      if (errs.length) { $('#checkoutErr').innerHTML = `<div class="alert err">${errs.map(esc).join('<br>')}</div>`; return; }
      const taxa = upd();
      const enc = {
        id: uid('E'),
        linhas: cartLines().map((l) => ({ id: l.id, nome: l.produto.nome, emoji: l.produto.emoji, preco: l.produto.preco, qtd: l.qtd })),
        subtotal: sub, taxa, total: sub + taxa,
        nome: f.nome.trim(), email: f.email.trim().toLowerCase(), telefone: f.telefone.trim(),
        entrega: f.entrega, morada: (f.morada || '').trim(),
        estado: 'Recebida', criadaEm: new Date().toISOString()
      };
      enc.linhas.forEach((l) => { const p = state.produtos.find((x) => x.id === l.id); if (p) p.stock -= l.qtd; });
      state.encomendas.unshift(enc);
      state.carrinho = [];
      state.email = enc.email;
      save(); updateCartBadge();
      openModal(`
        <h2>✅ Encomenda recebida</h2>
        <p>Obrigado, ${esc(enc.nome)}! A sua encomenda <strong>${enc.id}</strong> no valor de <strong>${money(enc.total)}</strong> foi registada.</p>
        <p class="muted">${enc.entrega === 'Entrega' ? 'Será entregue na morada indicada.' : 'Pode recolhê-la no mercado assim que estiver preparada.'}</p>
        <a class="btn primary" href="#/conta" data-close-modal>Ver as minhas encomendas</a>`);
      render();
    });
  }

  // ---------- Modal ----------
  function openModal(html) {
    $('#modalBody').innerHTML = html;
    $('#modal').classList.add('open');
    $('#modal').setAttribute('aria-hidden', 'false');
    const first = $('#modalBody input, #modalBody select, #modalBody button, #modalBody a');
    if (first) first.focus();
  }
  function closeModal() { $('#modal').classList.remove('open'); $('#modal').setAttribute('aria-hidden', 'true'); }

  // ---------- Router ----------
  const routes = {
    '': viewHome,
    produtos: viewProdutos,
    produto: viewProduto,
    alugueres: viewAlugueres,
    aluguer: viewAluguer,
    conta: viewConta,
    gestao: viewGestao
  };
  const ui = { catProduto: 'Todas', qProduto: '', ordProduto: 'nome', tipoAluguer: 'Todos', qAluguer: '', tabGestao: 'resumo' };

  function render() {
    const [route, param] = location.hash.replace(/^#\/?/, '').split('/');
    const view = routes[route] || viewHome;
    $$('#mainnav a').forEach((a) => a.classList.toggle('active', a.dataset.route === (route === 'produto' ? 'produtos' : route === 'aluguer' ? 'alugueres' : route || '')));
    $('#app').innerHTML = '';
    view($('#app'), param);
  }

  // ---------- Vistas ----------
  function productCard(p) {
    const stockTag = p.stock <= 0 ? '<span class="tag danger">Esgotado</span>' : p.stock <= 5 ? `<span class="tag warn">Últimas ${p.stock}</span>` : '';
    return `
      <article class="card">
        <a class="card-media" href="#/produto/${p.id}" style="text-decoration:none">${p.emoji}</a>
        <div class="card-body">
          <div><span class="tag">${esc(p.categoria)}</span> ${stockTag}</div>
          <h3 class="card-title"><a href="#/produto/${p.id}" style="color:inherit;text-decoration:none">${esc(p.nome)}</a></h3>
          <div class="card-meta">${esc(p.produtor)} · ${esc(p.local)}</div>
          <div class="card-foot">
            <div class="price">${money(p.preco)} <small>/ ${esc(p.unidade)}</small></div>
            <button class="btn primary sm" data-add="${p.id}" ${p.stock <= 0 ? 'disabled' : ''}>Adicionar</button>
          </div>
        </div>
      </article>`;
  }
  function rentalCard(a) {
    return `
      <article class="card">
        <a class="card-media" href="#/aluguer/${a.id}" style="text-decoration:none">${a.emoji}</a>
        <div class="card-body">
          <div><span class="tag">${esc(a.tipo)}</span></div>
          <h3 class="card-title"><a href="#/aluguer/${a.id}" style="color:inherit;text-decoration:none">${esc(a.nome)}</a></h3>
          <div class="card-meta">${esc(a.local)} · ${esc(a.capacidade)}</div>
          <div class="card-foot">
            <div class="price">${money(a.precoDia)} <small>/ dia</small></div>
            <a class="btn primary sm" href="#/aluguer/${a.id}">Reservar</a>
          </div>
        </div>
      </article>`;
  }

  function viewHome(el) {
    const destaquesP = state.produtos.filter((p) => p.stock > 0).slice(0, 4);
    const destaquesA = state.alugueres.slice(0, 4);
    el.innerHTML = `
      <section class="hero">
        <h1>Compre local. Alugue perto de si.</h1>
        <p>Produtos frescos e artesanais diretamente dos produtores da região, e alojamentos, espaços e equipamento para alugar à vizinhança — tudo num só lugar.</p>
        <div class="hero-actions">
          <a class="btn primary" href="#/produtos">🧺 Ver produtos</a>
          <a class="btn" href="#/alugueres">📅 Reservar um aluguer</a>
        </div>
      </section>
      <section class="section features">
        <div class="feature"><div class="ico">🚜</div><h3>Do produtor para si</h3><p class="muted small">Sem intermediários: o valor fica na economia local.</p></div>
        <div class="feature"><div class="ico">📆</div><h3>Reservas com calendário</h3><p class="muted small">Veja a disponibilidade em tempo real e reserve por dias.</p></div>
        <div class="feature"><div class="ico">🚲</div><h3>Recolha ou entrega</h3><p class="muted small">Recolha grátis no mercado ou entrega ao domicílio.</p></div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Produtos em destaque</h2><a href="#/produtos">Ver todos →</a></div>
        <div class="grid">${destaquesP.map(productCard).join('')}</div>
      </section>
      <section class="section">
        <div class="section-head"><h2>Alugueres e equipamento</h2><a href="#/alugueres">Ver todos →</a></div>
        <div class="grid">${destaquesA.map(rentalCard).join('')}</div>
      </section>`;
  }

  function viewProdutos(el) {
    const cats = ['Todas', ...new Set(state.produtos.map((p) => p.categoria))];
    el.innerHTML = `
      <h1>Produtos locais</h1>
      <div class="filters">
        <input type="search" id="qProd" placeholder="Pesquisar produto, produtor ou região…" value="${esc(ui.qProduto)}">
        <select id="ordProd" aria-label="Ordenar">
          <option value="nome">Nome (A–Z)</option>
          <option value="precoAsc">Preço: mais baixo</option>
          <option value="precoDesc">Preço: mais alto</option>
        </select>
      </div>
      <div class="chips" id="catChips">${cats.map((c) => `<button class="chip ${c === ui.catProduto ? 'active' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      <div class="section" id="prodGrid" style="margin-top:16px"></div>`;
    $('#ordProd').value = ui.ordProduto;
    const draw = () => {
      const q = ui.qProduto.trim().toLowerCase();
      let list = state.produtos.filter((p) =>
        (ui.catProduto === 'Todas' || p.categoria === ui.catProduto) &&
        (!q || [p.nome, p.produtor, p.local, p.categoria].join(' ').toLowerCase().includes(q)));
      list.sort(ui.ordProduto === 'precoAsc' ? (a, b) => a.preco - b.preco
        : ui.ordProduto === 'precoDesc' ? (a, b) => b.preco - a.preco
        : (a, b) => a.nome.localeCompare(b.nome, 'pt'));
      $('#prodGrid').innerHTML = list.length ? `<div class="grid">${list.map(productCard).join('')}</div>` : '<div class="empty">Nenhum produto encontrado.</div>';
    };
    draw();
    $('#qProd').addEventListener('input', (e) => { ui.qProduto = e.target.value; draw(); });
    $('#ordProd').addEventListener('change', (e) => { ui.ordProduto = e.target.value; draw(); });
    $('#catChips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      ui.catProduto = b.dataset.cat;
      $$('#catChips .chip').forEach((c) => c.classList.toggle('active', c === b));
      draw();
    });
  }

  function viewProduto(el, id) {
    const p = state.produtos.find((x) => x.id === id);
    if (!p) { el.innerHTML = '<div class="empty">Produto não encontrado. <a href="#/produtos">Voltar</a></div>'; return; }
    el.innerHTML = `
      <p><a href="#/produtos">← Produtos</a></p>
      <div class="detail">
        <div class="detail-media">${p.emoji}</div>
        <div>
          <span class="tag">${esc(p.categoria)}</span>
          <h1 style="margin-top:8px">${esc(p.nome)}</h1>
          <p class="muted">${esc(p.produtor)} · ${esc(p.local)}</p>
          <p>${esc(p.descricao)}</p>
          <div class="panel">
            <div class="price" style="font-size:1.5rem">${money(p.preco)} <small>/ ${esc(p.unidade)}</small></div>
            <p class="small muted">${p.stock > 0 ? `${p.stock} disponíveis` : 'Esgotado'}</p>
            <div style="display:flex;gap:8px;align-items:center">
              <input type="number" id="qtdProd" min="1" max="${p.stock}" value="1" style="width:90px" ${p.stock <= 0 ? 'disabled' : ''} aria-label="Quantidade">
              <button class="btn primary" id="addProd" ${p.stock <= 0 ? 'disabled' : ''}>Adicionar ao carrinho</button>
            </div>
          </div>
        </div>
      </div>`;
    const btn = $('#addProd');
    if (btn) btn.addEventListener('click', () => addToCart(p.id, Math.max(1, parseInt($('#qtdProd').value, 10) || 1)));
  }

  function viewAlugueres(el) {
    const tipos = ['Todos', ...new Set(state.alugueres.map((a) => a.tipo))];
    el.innerHTML = `
      <h1>Alugueres e equipamento</h1>
      <p class="muted">Alojamentos, espaços para eventos, transporte e ferramentas. Escolha as datas e reserve.</p>
      <div class="filters">
        <input type="search" id="qAlu" placeholder="Pesquisar…" value="${esc(ui.qAluguer)}">
      </div>
      <div class="chips" id="tipoChips">${tipos.map((t) => `<button class="chip ${t === ui.tipoAluguer ? 'active' : ''}" data-tipo="${esc(t)}">${esc(t)}</button>`).join('')}</div>
      <div id="aluGrid" style="margin-top:16px"></div>`;
    const draw = () => {
      const q = ui.qAluguer.trim().toLowerCase();
      const list = state.alugueres.filter((a) =>
        (ui.tipoAluguer === 'Todos' || a.tipo === ui.tipoAluguer) &&
        (!q || [a.nome, a.local, a.tipo, a.proprietario].join(' ').toLowerCase().includes(q)));
      $('#aluGrid').innerHTML = list.length ? `<div class="grid">${list.map(rentalCard).join('')}</div>` : '<div class="empty">Nenhum aluguer encontrado.</div>';
    };
    draw();
    $('#qAlu').addEventListener('input', (e) => { ui.qAluguer = e.target.value; draw(); });
    $('#tipoChips').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tipo]'); if (!b) return;
      ui.tipoAluguer = b.dataset.tipo;
      $$('#tipoChips .chip').forEach((c) => c.classList.toggle('active', c === b));
      draw();
    });
  }

  function viewAluguer(el, id) {
    const a = state.alugueres.find((x) => x.id === id);
    if (!a) { el.innerHTML = '<div class="empty">Aluguer não encontrado. <a href="#/alugueres">Voltar</a></div>'; return; }
    const sel = { inicio: null, fim: null };
    let mes = new Date(); mes.setDate(1);

    el.innerHTML = `
      <p><a href="#/alugueres">← Alugueres</a></p>
      <div class="detail">
        <div>
          <div class="detail-media">${a.emoji}</div>
          <h1 style="margin-top:16px">${esc(a.nome)}</h1>
          <p><span class="tag">${esc(a.tipo)}</span></p>
          <p>${esc(a.descricao)}</p>
          <table>
            <tr><th>Local</th><td>${esc(a.local)}</td></tr>
            <tr><th>Capacidade</th><td>${esc(a.capacidade)}</td></tr>
            <tr><th>Proprietário</th><td>${esc(a.proprietario)}</td></tr>
            <tr><th>Preço</th><td>${money(a.precoDia)} / dia</td></tr>
            <tr><th>Caução</th><td>${money(a.caucao)} (devolvida no fim)</td></tr>
          </table>
        </div>
        <div class="panel">
          <h2>Reservar</h2>
          <p class="small muted">Clique no dia de início e depois no dia de fim.</p>
          <div class="cal" id="cal"></div>
          <div class="row" style="margin-top:12px">
            <div class="field"><label for="dIni">Início</label><input type="date" id="dIni" min="${todayISO()}"></div>
            <div class="field"><label for="dFim">Fim</label><input type="date" id="dFim" min="${todayISO()}"></div>
          </div>
          <div id="bookSummary"></div>
          <form id="bookForm">
            <div class="field"><label for="b-nome">Nome</label><input id="b-nome" name="nome" required></div>
            <div class="row">
              <div class="field"><label for="b-email">Email</label><input id="b-email" name="email" type="email" required value="${esc(state.email)}"></div>
              <div class="field"><label for="b-tel">Telefone</label><input id="b-tel" name="telefone" type="tel"></div>
            </div>
            <div class="field"><label for="b-notas">Notas (opcional)</label><textarea id="b-notas" name="notas" rows="2" placeholder="Hora de levantamento, pedidos especiais…"></textarea></div>
            <div id="bookErr"></div>
            <button class="btn primary" style="width:100%" type="submit">Pedir reserva</button>
          </form>
        </div>
      </div>`;

    const drawCal = () => {
      const busy = busyDays(a.id);
      const y = mes.getFullYear(), m = mes.getMonth();
      const primeiroDow = (new Date(y, m, 1).getDay() + 6) % 7; // segunda = 0
      const nDias = new Date(y, m + 1, 0).getDate();
      const hoje = todayISO();
      const podeRecuar = toISO(new Date(y, m, 1)) > hoje.slice(0, 8) + '01';
      let cells = '';
      for (let i = 0; i < primeiroDow; i++) cells += '<div class="cal-day out"></div>';
      for (let d = 1; d <= nDias; d++) {
        const iso = toISO(new Date(y, m, d));
        const cls = ['cal-day'];
        if (iso < hoje) cls.push('past');
        else if (busy.has(iso)) cls.push('busy');
        if (iso === sel.inicio || iso === sel.fim) cls.push('sel');
        else if (sel.inicio && sel.fim && iso > sel.inicio && iso < sel.fim) cls.push('range');
        cells += `<button type="button" class="${cls.join(' ')}" data-day="${iso}" ${iso < hoje || busy.has(iso) ? 'disabled' : ''} aria-label="${fmtDate(iso)}${busy.has(iso) ? ' (ocupado)' : ''}">${d}</button>`;
      }
      $('#cal').innerHTML = `
        <div class="cal-head">
          <button type="button" class="icon-btn" id="calPrev" ${podeRecuar ? '' : 'disabled'} aria-label="Mês anterior">‹</button>
          <strong>${mes.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}</strong>
          <button type="button" class="icon-btn" id="calNext" aria-label="Mês seguinte">›</button>
        </div>
        <div class="cal-grid">
          ${['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d) => `<div class="cal-dow">${d}</div>`).join('')}
          ${cells}
        </div>
        <div class="cal-legend"><span class="l-free">Livre</span><span class="l-busy">Ocupado</span><span class="l-sel">Selecionado</span></div>`;
      $('#calPrev').onclick = () => { mes = new Date(y, m - 1, 1); drawCal(); };
      $('#calNext').onclick = () => { mes = new Date(y, m + 1, 1); drawCal(); };
    };

    const drawSummary = () => {
      $('#dIni').value = sel.inicio || '';
      $('#dFim').value = sel.fim || '';
      const box = $('#bookSummary');
      if (!sel.inicio) { box.innerHTML = ''; return; }
      const fim = sel.fim || sel.inicio;
      if (!rangeIsFree(a.id, sel.inicio, fim)) {
        box.innerHTML = '<div class="alert err">O período escolhido inclui dias já reservados.</div>';
        return;
      }
      const dias = daysBetweenInclusive(sel.inicio, fim);
      box.innerHTML = `
        <div class="summary">
          <span>${fmtDate(sel.inicio)} → ${fmtDate(fim)}</span><span></span>
          <span>${money(a.precoDia)} × ${dias} ${dias === 1 ? 'dia' : 'dias'}</span><span>${money(a.precoDia * dias)}</span>
          <span>Caução (reembolsável)</span><span>${money(a.caucao)}</span>
          <span class="total">Total a pagar</span><span class="total">${money(a.precoDia * dias + a.caucao)}</span>
        </div>`;
    };

    $('#cal').addEventListener('click', (e) => {
      const b = e.target.closest('[data-day]'); if (!b || b.disabled) return;
      const d = b.dataset.day;
      if (!sel.inicio || sel.fim || d < sel.inicio) { sel.inicio = d; sel.fim = null; }
      else sel.fim = d;
      drawCal(); drawSummary();
    });
    const onDateInput = () => {
      const ini = $('#dIni').value, fim = $('#dFim').value;
      sel.inicio = ini || null;
      sel.fim = ini && fim && fim >= ini ? fim : null;
      if (sel.inicio) { const d = fromISO(sel.inicio); mes = new Date(d.getFullYear(), d.getMonth(), 1); }
      drawCal(); drawSummary();
    };
    $('#dIni').addEventListener('change', onDateInput);
    $('#dFim').addEventListener('change', onDateInput);

    $('#bookForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      const errs = [];
      const fim = sel.fim || sel.inicio;
      if (!sel.inicio) errs.push('Escolha as datas no calendário.');
      else if (sel.inicio < todayISO()) errs.push('A data de início já passou.');
      else if (!rangeIsFree(a.id, sel.inicio, fim)) errs.push('O período escolhido inclui dias já reservados.');
      if (!f.nome.trim()) errs.push('Indique o nome.');
      if (!validEmail(f.email)) errs.push('Email inválido.');
      if (errs.length) { $('#bookErr').innerHTML = `<div class="alert err">${errs.map(esc).join('<br>')}</div>`; return; }
      const dias = daysBetweenInclusive(sel.inicio, fim);
      const r = {
        id: uid('R'), itemId: a.id, inicio: sel.inicio, fim, dias,
        total: a.precoDia * dias, caucao: a.caucao,
        nome: f.nome.trim(), email: f.email.trim().toLowerCase(), telefone: f.telefone.trim(), notas: f.notas.trim(),
        estado: 'Pendente', criadaEm: new Date().toISOString()
      };
      state.reservas.unshift(r);
      state.email = r.email;
      save();
      openModal(`
        <h2>📅 Pedido de reserva enviado</h2>
        <p>Reserva <strong>${r.id}</strong> — ${esc(a.nome)}</p>
        <p>${fmtDate(r.inicio)} → ${fmtDate(r.fim)} (${dias} ${dias === 1 ? 'dia' : 'dias'})<br>
        Total: <strong>${money(r.total + r.caucao)}</strong> (inclui caução de ${money(r.caucao)})</p>
        <p class="muted">O proprietário irá confirmar a reserva. Pode acompanhar o estado em “A minha conta”.</p>
        <a class="btn primary" href="#/conta" data-close-modal>Ver as minhas reservas</a>`);
      sel.inicio = sel.fim = null;
      ev.target.reset();
      $('#b-email').value = state.email;
      $('#bookErr').innerHTML = '';
      drawCal(); drawSummary();
    });

    drawCal(); drawSummary();
  }

  function estadoTag(e) {
    const cls = { Cancelada: 'danger', Pendente: 'warn', Recebida: 'warn' }[e] || '';
    return `<span class="tag ${cls}">${esc(e)}</span>`;
  }
  const itemNome = (id) => { const a = state.alugueres.find((x) => x.id === id); return a ? `${a.emoji} ${esc(a.nome)}` : '(removido)'; };

  function viewConta(el) {
    el.innerHTML = `
      <h1>A minha conta</h1>
      <form class="filters" id="emailForm">
        <input type="email" id="contaEmail" placeholder="O seu email" value="${esc(state.email)}" required style="flex:1 1 240px;width:auto">
        <button class="btn primary" type="submit">Ver</button>
      </form>
      <div id="contaBody"></div>`;
    const draw = () => {
      const email = state.email;
      if (!email) { $('#contaBody').innerHTML = '<div class="empty">Indique o email usado nas encomendas e reservas.</div>'; return; }
      const encs = state.encomendas.filter((e) => e.email === email);
      const ress = state.reservas.filter((r) => r.email === email);
      $('#contaBody').innerHTML = `
        <section class="section">
          <h2>Reservas</h2>
          ${ress.length ? `<div class="table-wrap"><table>
            <tr><th>Ref.</th><th>Aluguer</th><th>Datas</th><th>Total</th><th>Estado</th><th></th></tr>
            ${ress.map((r) => `<tr>
              <td>${r.id}</td><td>${itemNome(r.itemId)}</td>
              <td>${fmtDate(r.inicio)} → ${fmtDate(r.fim)}</td>
              <td>${money(r.total)}<div class="small muted">+ caução ${money(r.caucao)}</div></td>
              <td>${estadoTag(r.estado)}</td>
              <td>${r.estado !== 'Cancelada' && r.fim >= todayISO() ? `<button class="btn sm danger" data-cancel-res="${r.id}">Cancelar</button>` : ''}</td>
            </tr>`).join('')}
          </table></div>` : '<div class="empty">Sem reservas. <a href="#/alugueres">Reservar agora</a></div>'}
        </section>
        <section class="section">
          <h2>Encomendas</h2>
          ${encs.length ? `<div class="table-wrap"><table>
            <tr><th>Ref.</th><th>Data</th><th>Artigos</th><th>Entrega</th><th>Total</th><th>Estado</th></tr>
            ${encs.map((e) => `<tr>
              <td>${e.id}</td><td>${fmtDateTime(e.criadaEm)}</td>
              <td>${e.linhas.map((l) => `${l.qtd}× ${esc(l.nome)}`).join('<br>')}</td>
              <td>${esc(e.entrega)}</td><td>${money(e.total)}</td><td>${estadoTag(e.estado)}</td>
            </tr>`).join('')}
          </table></div>` : '<div class="empty">Sem encomendas. <a href="#/produtos">Ver produtos</a></div>'}
        </section>`;
    };
    $('#emailForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      state.email = $('#contaEmail').value.trim().toLowerCase();
      save(); draw();
    });
    $('#contaBody').addEventListener('click', (e) => {
      const b = e.target.closest('[data-cancel-res]'); if (!b) return;
      if (!confirm('Cancelar esta reserva?')) return;
      const r = state.reservas.find((x) => x.id === b.dataset.cancelRes);
      if (r) { r.estado = 'Cancelada'; save(); draw(); toast('Reserva cancelada'); }
    });
    draw();
  }

  // ---------- Gestão ----------
  function viewGestao(el) {
    const tabs = [['resumo', 'Resumo'], ['encomendas', 'Encomendas'], ['reservas', 'Reservas'], ['produtos', 'Produtos'], ['alugueres', 'Alugueres']];
    el.innerHTML = `
      <div class="section-head"><h1>Gestão</h1>
        <button class="btn sm danger" id="resetData">Repor dados de demonstração</button></div>
      <div class="tabs" id="gTabs">${tabs.map(([k, v]) => `<button data-tab="${k}" class="${ui.tabGestao === k ? 'active' : ''}">${v}</button>`).join('')}</div>
      <div id="gBody"></div>`;
    const body = $('#gBody');
    const draw = () => { body.onclick = body.onchange = null; ({ resumo: gResumo, encomendas: gEncomendas, reservas: gReservas, produtos: gProdutos, alugueres: gAlugueres })[ui.tabGestao](body, draw); };
    $('#gTabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]'); if (!b) return;
      ui.tabGestao = b.dataset.tab;
      $$('#gTabs button').forEach((x) => x.classList.toggle('active', x === b));
      draw();
    });
    $('#resetData').addEventListener('click', () => {
      if (!confirm('Apagar todos os dados e repor a demonstração?')) return;
      state = seedState(); save(); updateCartBadge(); render(); toast('Dados repostos');
    });
    draw();
  }

  function gResumo(body) {
    const encAtivas = state.encomendas.filter((e) => e.estado !== 'Cancelada');
    const resAtivas = state.reservas.filter((r) => r.estado !== 'Cancelada');
    const vendas = encAtivas.reduce((s, e) => s + e.total, 0);
    const alug = resAtivas.reduce((s, r) => s + r.total, 0);
    const pend = state.reservas.filter((r) => r.estado === 'Pendente').length;
    const hoje = todayISO();
    const proximas = resAtivas.filter((r) => r.fim >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 6);
    const baixo = state.produtos.filter((p) => p.stock <= 5);
    body.innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${money(vendas)}</div><div class="k">Vendas de produtos</div></div>
        <div class="stat"><div class="v">${money(alug)}</div><div class="k">Receita de alugueres</div></div>
        <div class="stat"><div class="v">${encAtivas.filter((e) => e.estado === 'Recebida').length}</div><div class="k">Encomendas por preparar</div></div>
        <div class="stat"><div class="v">${pend}</div><div class="k">Reservas por confirmar</div></div>
      </div>
      <div class="detail">
        <div class="panel"><h3>Próximas reservas</h3>
          ${proximas.length ? `<table>${proximas.map((r) => `<tr><td>${itemNome(r.itemId)}</td><td class="small">${fmtDate(r.inicio)} → ${fmtDate(r.fim)}</td><td>${estadoTag(r.estado)}</td></tr>`).join('')}</table>` : '<p class="muted">Nenhuma.</p>'}
        </div>
        <div class="panel"><h3>Stock baixo</h3>
          ${baixo.length ? `<table>${baixo.map((p) => `<tr><td>${p.emoji} ${esc(p.nome)}</td><td>${p.stock <= 0 ? '<span class="tag danger">Esgotado</span>' : `<span class="tag warn">${p.stock}</span>`}</td></tr>`).join('')}</table>` : '<p class="muted">Todo o stock está acima do mínimo.</p>'}
        </div>
      </div>`;
  }

  function gEncomendas(body, redraw) {
    const estados = ['Recebida', 'Preparada', 'Entregue', 'Cancelada'];
    body.innerHTML = state.encomendas.length ? `<div class="table-wrap"><table>
      <tr><th>Ref.</th><th>Cliente</th><th>Artigos</th><th>Entrega</th><th>Total</th><th>Estado</th></tr>
      ${state.encomendas.map((e) => `<tr>
        <td>${e.id}<div class="small muted">${fmtDateTime(e.criadaEm)}</div></td>
        <td>${esc(e.nome)}<div class="small muted">${esc(e.email)}${e.telefone ? '<br>' + esc(e.telefone) : ''}</div></td>
        <td>${e.linhas.map((l) => `${l.qtd}× ${esc(l.nome)}`).join('<br>')}</td>
        <td>${esc(e.entrega)}${e.morada ? `<div class="small muted">${esc(e.morada)}</div>` : ''}</td>
        <td>${money(e.total)}</td>
        <td><select data-enc="${e.id}" aria-label="Estado" ${e.estado === 'Cancelada' ? 'disabled' : ''}>${estados.map((s) => `<option ${s === e.estado ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      </tr>`).join('')}
    </table></div>` : '<div class="empty">Ainda não há encomendas.</div>';
    body.onchange = (ev) => {
      const s = ev.target.closest('[data-enc]'); if (!s) return;
      const e = state.encomendas.find((x) => x.id === s.dataset.enc);
      if (!e) return;
      if (s.value === 'Cancelada') {
        if (!confirm('Cancelar a encomenda? O stock será reposto.')) { s.value = e.estado; return; }
        e.linhas.forEach((l) => { const p = state.produtos.find((x) => x.id === l.id); if (p) p.stock += l.qtd; });
      }
      e.estado = s.value; save(); redraw(); toast('Estado atualizado');
    };
  }

  function gReservas(body, redraw) {
    const estados = ['Pendente', 'Confirmada', 'Concluída', 'Cancelada'];
    const list = [...state.reservas].sort((a, b) => a.inicio.localeCompare(b.inicio));
    body.innerHTML = list.length ? `<div class="table-wrap"><table>
      <tr><th>Ref.</th><th>Aluguer</th><th>Cliente</th><th>Datas</th><th>Total</th><th>Estado</th></tr>
      ${list.map((r) => `<tr>
        <td>${r.id}</td><td>${itemNome(r.itemId)}</td>
        <td>${esc(r.nome)}<div class="small muted">${esc(r.email)}${r.telefone ? '<br>' + esc(r.telefone) : ''}</div>${r.notas ? `<div class="small">“${esc(r.notas)}”</div>` : ''}</td>
        <td>${fmtDate(r.inicio)} → ${fmtDate(r.fim)}<div class="small muted">${r.dias} ${r.dias === 1 ? 'dia' : 'dias'}</div></td>
        <td>${money(r.total)}<div class="small muted">caução ${money(r.caucao)}</div></td>
        <td><select data-res="${r.id}" aria-label="Estado">${estados.map((s) => `<option ${s === r.estado ? 'selected' : ''}>${s}</option>`).join('')}</select></td>
      </tr>`).join('')}
    </table></div>` : '<div class="empty">Ainda não há reservas.</div>';
    body.onchange = (ev) => {
      const s = ev.target.closest('[data-res]'); if (!s) return;
      const r = state.reservas.find((x) => x.id === s.dataset.res);
      if (!r) return;
      // Reativar uma reserva cancelada só é possível se as datas continuarem livres.
      if (r.estado === 'Cancelada' && s.value !== 'Cancelada') {
        const busy = busyDays(r.itemId, r.id);
        for (let d = fromISO(r.inicio); toISO(d) <= r.fim; d = addDays(d, 1)) {
          if (busy.has(toISO(d))) { toast('As datas já estão ocupadas por outra reserva.'); s.value = r.estado; return; }
        }
      }
      r.estado = s.value; save(); redraw(); toast('Estado atualizado');
    };
  }

  function gProdutos(body, redraw) {
    body.innerHTML = `
      <p><button class="btn primary" id="novoProd">+ Novo produto</button></p>
      <div class="table-wrap"><table>
        <tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Stock</th><th></th></tr>
        ${state.produtos.map((p) => `<tr>
          <td>${p.emoji}</td><td>${esc(p.nome)}<div class="small muted">${esc(p.produtor)}</div></td>
          <td>${esc(p.categoria)}</td><td>${money(p.preco)}<div class="small muted">${esc(p.unidade)}</div></td><td>${p.stock}</td>
          <td style="white-space:nowrap"><button class="btn sm" data-edit-prod="${p.id}">Editar</button> <button class="btn sm danger" data-del-prod="${p.id}">Apagar</button></td>
        </tr>`).join('')}
      </table></div>`;
    body.onclick = (e) => {
      if (e.target.closest('#novoProd')) return editProduto(null, redraw);
      const ed = e.target.closest('[data-edit-prod]'); if (ed) return editProduto(ed.dataset.editProd, redraw);
      const del = e.target.closest('[data-del-prod]');
      if (del && confirm('Apagar este produto?')) {
        state.produtos = state.produtos.filter((p) => p.id !== del.dataset.delProd);
        state.carrinho = state.carrinho.filter((l) => l.id !== del.dataset.delProd);
        save(); updateCartBadge(); redraw(); toast('Produto apagado');
      }
    };
  }

  function editProduto(id, redraw) {
    const p = state.produtos.find((x) => x.id === id) || { nome: '', categoria: '', preco: '', unidade: 'unidade', stock: 0, produtor: '', local: '', emoji: '🥕', descricao: '' };
    openModal(`
      <h2>${id ? 'Editar produto' : 'Novo produto'}</h2>
      <form id="prodForm">
        <div class="row">
          <div class="field" style="max-width:90px"><label>Ícone</label><input name="emoji" value="${esc(p.emoji)}" maxlength="4"></div>
          <div class="field"><label>Nome</label><input name="nome" required value="${esc(p.nome)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Categoria</label><input name="categoria" required value="${esc(p.categoria)}" list="catList"></div>
          <div class="field"><label>Unidade</label><input name="unidade" required value="${esc(p.unidade)}"></div>
        </div>
        <datalist id="catList">${[...new Set(state.produtos.map((x) => x.categoria))].map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <div class="row">
          <div class="field"><label>Preço (€)</label><input name="preco" type="number" step="0.01" min="0" required value="${p.preco}"></div>
          <div class="field"><label>Stock</label><input name="stock" type="number" step="1" min="0" required value="${p.stock}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Produtor</label><input name="produtor" required value="${esc(p.produtor)}"></div>
          <div class="field"><label>Região</label><input name="local" value="${esc(p.local)}"></div>
        </div>
        <div class="field"><label>Descrição</label><textarea name="descricao" rows="2">${esc(p.descricao)}</textarea></div>
        <button class="btn primary" type="submit">Guardar</button>
      </form>`);
    $('#prodForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      const data = { ...f, preco: parseFloat(f.preco) || 0, stock: parseInt(f.stock, 10) || 0, emoji: f.emoji.trim() || '📦' };
      if (id) Object.assign(state.produtos.find((x) => x.id === id), data);
      else state.produtos.push({ id: uid('P'), ...data });
      save(); closeModal(); redraw(); toast('Produto guardado');
    });
  }

  function gAlugueres(body, redraw) {
    body.innerHTML = `
      <p><button class="btn primary" id="novoAlu">+ Novo aluguer</button></p>
      <div class="table-wrap"><table>
        <tr><th></th><th>Aluguer</th><th>Tipo</th><th>Preço/dia</th><th>Caução</th><th>Reservas ativas</th><th></th></tr>
        ${state.alugueres.map((a) => `<tr>
          <td>${a.emoji}</td><td>${esc(a.nome)}<div class="small muted">${esc(a.local)}</div></td><td>${esc(a.tipo)}</td>
          <td>${money(a.precoDia)}</td><td>${money(a.caucao)}</td>
          <td>${state.reservas.filter((r) => r.itemId === a.id && r.estado !== 'Cancelada' && r.fim >= todayISO()).length}</td>
          <td style="white-space:nowrap"><button class="btn sm" data-edit-alu="${a.id}">Editar</button> <button class="btn sm danger" data-del-alu="${a.id}">Apagar</button></td>
        </tr>`).join('')}
      </table></div>`;
    body.onclick = (e) => {
      if (e.target.closest('#novoAlu')) return editAluguer(null, redraw);
      const ed = e.target.closest('[data-edit-alu]'); if (ed) return editAluguer(ed.dataset.editAlu, redraw);
      const del = e.target.closest('[data-del-alu]');
      if (del) {
        const ativas = state.reservas.some((r) => r.itemId === del.dataset.delAlu && r.estado !== 'Cancelada' && r.fim >= todayISO());
        if (ativas) { toast('Não é possível apagar: tem reservas futuras.'); return; }
        if (!confirm('Apagar este aluguer?')) return;
        state.alugueres = state.alugueres.filter((a) => a.id !== del.dataset.delAlu);
        save(); redraw(); toast('Aluguer apagado');
      }
    };
  }

  function editAluguer(id, redraw) {
    const a = state.alugueres.find((x) => x.id === id) || { nome: '', tipo: 'Equipamento', precoDia: '', caucao: 0, capacidade: '', local: '', emoji: '🔧', proprietario: '', descricao: '' };
    const tipos = [...new Set(['Alojamento', 'Espaço', 'Equipamento', 'Transporte', ...state.alugueres.map((x) => x.tipo)])];
    openModal(`
      <h2>${id ? 'Editar aluguer' : 'Novo aluguer'}</h2>
      <form id="aluForm">
        <div class="row">
          <div class="field" style="max-width:90px"><label>Ícone</label><input name="emoji" value="${esc(a.emoji)}" maxlength="4"></div>
          <div class="field"><label>Nome</label><input name="nome" required value="${esc(a.nome)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Tipo</label><select name="tipo">${tipos.map((t) => `<option ${t === a.tipo ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          <div class="field"><label>Capacidade / detalhe</label><input name="capacidade" value="${esc(a.capacidade)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Preço por dia (€)</label><input name="precoDia" type="number" step="0.01" min="0" required value="${a.precoDia}"></div>
          <div class="field"><label>Caução (€)</label><input name="caucao" type="number" step="0.01" min="0" value="${a.caucao}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Proprietário</label><input name="proprietario" required value="${esc(a.proprietario)}"></div>
          <div class="field"><label>Local</label><input name="local" value="${esc(a.local)}"></div>
        </div>
        <div class="field"><label>Descrição</label><textarea name="descricao" rows="2">${esc(a.descricao)}</textarea></div>
        <button class="btn primary" type="submit">Guardar</button>
      </form>`);
    $('#aluForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      const data = { ...f, precoDia: parseFloat(f.precoDia) || 0, caucao: parseFloat(f.caucao) || 0, emoji: f.emoji.trim() || '📦' };
      if (id) Object.assign(state.alugueres.find((x) => x.id === id), data);
      else state.alugueres.push({ id: uid('A'), ...data });
      save(); closeModal(); redraw(); toast('Aluguer guardado');
    });
  }

  // ---------- Eventos globais ----------
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { addToCart(add.dataset.add); return; }
    const q = e.target.closest('[data-qty]');
    if (q) { const l = state.carrinho.find((x) => x.id === q.dataset.qty); if (l) setQty(l.id, l.qtd + Number(q.dataset.d)); return; }
    if (e.target.closest('#checkoutBtn')) { openCheckout(); return; }
    if (e.target.closest('[data-close-drawer]')) closeCart();
    if (e.target.closest('[data-close-modal]')) closeModal();
  });
  $('#cartBtn').addEventListener('click', openCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeCart(); } });
  window.addEventListener('hashchange', () => { closeModal(); closeCart(); render(); window.scrollTo(0, 0); });

  updateCartBadge();
  render();
})();
