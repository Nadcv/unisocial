(function () {
  'use strict';

  // ---------- Backend ----------
  // Se a página for servida pelo Google Apps Script, os dados vêm da Google
  // Sheet (google.script.run). Caso contrário, funciona em modo demonstração
  // com os dados no localStorage deste navegador. Ambos usam as mesmas regras
  // de core.js e devolvem Promises com a mesma forma.
  const REMOTO = typeof google !== 'undefined' && google.script && google.script.run;

  function remoteBackend() {
    const call = (fn, ...args) => new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((e) => reject(new Error((e && e.message) || String(e))))[fn](...args);
    });
    return {
      remoto: true,
      init: () => call('apiPublico'),
      criarEncomenda: (d) => call('apiCriarEncomenda', d),
      criarReserva: (d) => call('apiCriarReserva', d),
      minhaConta: (email, ref) => call('apiMinhaConta', email, ref),
      cancelarReserva: (email, ref, id) => call('apiCancelarReserva', email, ref, id),
      verificarPagamento: (ref) => call('apiVerificarPagamento', ref),
      cancelarPagamento: (ref) => call('apiCancelarPagamento', ref),
      admin: (pass, acao, args) => call('apiAdmin', pass, acao || null, args || null)
    };
  }

  function localBackend() {
    const KEY = 'mercadoLocal.db.v2';
    let db = null;
    try { db = JSON.parse(localStorage.getItem(KEY)); } catch (e) { db = null; }
    if (!db || !Array.isArray(db.produtos)) db = Core.seed(true);
    const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(db)); } catch (e) { /* ignora */ } };
    persist();
    // Corre a operação numa cópia: se falhar, os dados ficam como estavam.
    const run = (fn) => new Promise((resolve, reject) => {
      const copia = JSON.parse(JSON.stringify(db));
      try {
        const out = fn(copia);
        db = copia; persist();
        resolve(JSON.parse(JSON.stringify(out)));
      } catch (e) { reject(e); }
    });
    // Na demonstração o pagamento online é simulado (sem Stripe).
    const publico = (d) => ({ ...Core.publico(d), pagamentoOnline: true });
    const adminData = (d) => ({ encomendas: d.encomendas, reservas: d.reservas, publico: publico(d) });
    const estado = (d, ref) => Core.estadoPagamento(Core.findRef(d, ref).item);
    return {
      remoto: false,
      init: () => run((d) => publico(d)),
      criarEncomenda: (x) => run((d) => ({ result: Core.criarEncomenda(d, x).result, publico: publico(d) })),
      criarReserva: (x) => run((d) => ({ result: Core.criarReserva(d, x).result, publico: publico(d) })),
      minhaConta: (email, ref) => run((d) => Core.minhaConta(d, email, ref).result),
      cancelarReserva: (email, ref, id) => run((d) => ({ result: Core.cancelarReserva(d, email, ref, id).result, publico: publico(d) })),
      verificarPagamento: (ref) => run((d) => estado(d, ref)),
      cancelarPagamento: (ref) => run((d) => { Core.pagamentoFalhado(d, ref); return estado(d, ref); }),
      simularPagamento: (ref) => run((d) => { Core.pagamentoConfirmado(d, ref, 'demo'); return estado(d, ref); }),
      admin: (pass, acao, args) => run((d) => { if (acao) Core.admin(d, acao, args); return adminData(d); }),
      repor: () => { db = Core.seed(true); persist(); return Promise.resolve(); }
    };
  }

  const api = REMOTO ? remoteBackend() : localBackend();
  if (REMOTO) document.getElementById('modoDemo')?.remove();

  // ---------- Estado da interface ----------
  let pub = { produtos: [], alugueres: [], ocupacoes: [] };
  let gestao = null; // { encomendas, reservas } depois de entrar na Gestão

  const CLI_KEY = 'mercadoLocal.cliente';
  const cli = (() => {
    try { const c = JSON.parse(localStorage.getItem(CLI_KEY)); if (c && Array.isArray(c.carrinho)) return c; } catch (e) { /* ignora */ }
    return { carrinho: [], email: '', ref: '' };
  })();
  const saveCli = () => { try { localStorage.setItem(CLI_KEY, JSON.stringify(cli)); } catch (e) { /* ignora */ } };

  const PASS_KEY = 'mercadoLocal.admin';
  const getPass = () => { try { return sessionStorage.getItem(PASS_KEY) || ''; } catch (e) { return ''; } };
  const setPass = (p) => { try { if (p) sessionStorage.setItem(PASS_KEY, p); else sessionStorage.removeItem(PASS_KEY); } catch (e) { /* ignora */ } };

  // ---------- Utilitários ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const eur = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
  const money = (v) => eur.format(v || 0);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const { toISO, fromISO, todayISO } = Core;
  const fmtDate = (s) => fromISO(s).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
  const fmtDateTime = (s) => new Date(s).toLocaleString('pt-PT', { dateStyle: 'short', timeStyle: 'short' });
  const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  const errBox = (e) => `<div class="alert err">${esc(e.message || e)}</div>`;

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => t.classList.remove('show'), 2800);
  }

  // Desativa o botão enquanto o pedido está em curso.
  async function busy(btn, fn) {
    const txt = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'A enviar…'; }
    try { return await fn(); } finally { if (btn) { btn.disabled = false; btn.textContent = txt; } }
  }

  // ---------- Carrinho ----------
  function cartLines() {
    return cli.carrinho
      .map((l) => ({ ...l, produto: pub.produtos.find((p) => p.id === l.id) }))
      .filter((l) => l.produto);
  }
  const cartSubtotal = () => cartLines().reduce((s, l) => s + l.produto.preco * l.qtd, 0);

  function addToCart(id, qtd = 1) {
    const p = pub.produtos.find((x) => x.id === id);
    if (!p) return;
    const line = cli.carrinho.find((l) => l.id === id);
    const atual = line ? line.qtd : 0;
    if (atual + qtd > p.stock) { toast(`Só há ${p.stock} em stock.`); return; }
    if (line) line.qtd += qtd; else cli.carrinho.push({ id, qtd });
    saveCli(); updateCartBadge(); renderCart();
    toast(`${p.nome} adicionado ao carrinho`);
  }
  function setQty(id, qtd) {
    const p = pub.produtos.find((x) => x.id === id);
    const line = cli.carrinho.find((l) => l.id === id);
    if (!line) return;
    if (qtd <= 0) cli.carrinho = cli.carrinho.filter((l) => l.id !== id);
    else line.qtd = Math.min(qtd, p ? p.stock : qtd);
    saveCli(); updateCartBadge(); renderCart();
  }
  function updateCartBadge() {
    $('#cartCount').textContent = cartLines().reduce((s, l) => s + l.qtd, 0);
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
    body.innerHTML = lines.map((l) => `
      <div class="cart-line">
        <div class="e">${esc(l.produto.emoji)}</div>
        <div>
          <div><strong>${esc(l.produto.nome)}</strong></div>
          <div class="small muted">${money(l.produto.preco)} / ${esc(l.produto.unidade)}</div>
          <div class="qty">
            <button data-qty="${esc(l.id)}" data-d="-1" aria-label="Menos">−</button>
            <span>${l.qtd}</span>
            <button data-qty="${esc(l.id)}" data-d="1" aria-label="Mais">+</button>
          </div>
        </div>
        <div class="price">${money(l.produto.preco * l.qtd)}</div>
      </div>`).join('') + `
      <div class="summary"><span>Subtotal</span><span>${money(cartSubtotal())}</span></div>
      <p class="small muted">Entrega ao domicílio: ${money(Core.TAXA_ENTREGA)} (grátis acima de ${money(Core.ENTREGA_GRATIS_A_PARTIR)}). Recolha no mercado é grátis.</p>
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
          <div class="field"><label for="c-email">Email</label><input id="c-email" name="email" type="email" required value="${esc(cli.email)}"></div>
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
        ${pagamentoField('Pagar na entrega ou recolha', 'MB WAY, Multibanco ou numerário')}
        <div id="checkoutErr"></div>
        <button class="btn primary" style="width:100%" type="submit">Confirmar encomenda</button>
      </form>`);
    const form = $('#checkoutForm');
    const upd = () => {
      const entrega = form.entrega.value === 'Entrega';
      $('#moradaField').hidden = !entrega;
      const taxa = entrega && sub < Core.ENTREGA_GRATIS_A_PARTIR ? Core.TAXA_ENTREGA : 0;
      $('#checkoutSummary').innerHTML = `
        <span>Subtotal (${plural(lines.reduce((s, l) => s + l.qtd, 0), 'artigo', 'artigos')})</span><span>${money(sub)}</span>
        <span>Entrega</span><span>${money(taxa)}</span>
        <span class="total">Total</span><span class="total">${money(sub + taxa)}</span>`;
    };
    upd();
    form.entrega.addEventListener('change', upd);
    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      const pedido = { ...f, linhas: cli.carrinho.map((l) => ({ id: l.id, qtd: l.qtd })) };
      try {
        const res = await busy(form.querySelector('[type=submit]'), () => api.criarEncomenda(pedido));
        const enc = res.result;
        pub = res.publico;
        cli.email = enc.email; cli.ref = enc.id;
        // Com pagamento online, o carrinho só é esvaziado quando o pagamento for confirmado.
        if (enc.estado === Core.AGUARDA) { saveCli(); pedirPagamento(enc, res.checkoutUrl); render(); return; }
        cli.carrinho = []; saveCli();
        updateCartBadge();
        openModal(`
          <h2>✅ Encomenda recebida</h2>
          <p>Obrigado, ${esc(enc.nome)}! A sua encomenda no valor de <strong>${money(enc.total)}</strong> foi registada.</p>
          <p>Referência: <strong>${esc(enc.id)}</strong><br><span class="small muted">Guarde-a: é pedida, com o seu email, em “A minha conta”.</span></p>
          <p class="muted">${enc.entrega === 'Entrega' ? 'Será entregue na morada indicada.' : 'Pode recolhê-la no mercado assim que estiver preparada.'}</p>
          <a class="btn primary" href="#/conta" data-close-modal>Ver as minhas encomendas</a>`);
        render();
      } catch (e) {
        $('#checkoutErr').innerHTML = errBox(e);
        refreshPublic();
      }
    });
  }

  // ---------- Pagamento online ----------
  function pagamentoField(offline, offlineNota) {
    if (!pub.pagamentoOnline) return `<p class="small muted">Pagamento: ${esc(offline.toLowerCase())} (${esc(offlineNota)}).</p>`;
    return `
      <fieldset class="field pay-choice">
        <legend>Pagamento</legend>
        <label><input type="radio" name="pagamento" value="Online" checked>
          <span><strong>Pagar agora online</strong><br><span class="small muted">Cartão, MB WAY, Multibanco, Apple Pay ou Google Pay</span></span></label>
        <label><input type="radio" name="pagamento" value="Na entrega">
          <span><strong>${esc(offline)}</strong><br><span class="small muted">${esc(offlineNota)}</span></span></label>
      </fieldset>`;
  }

  function botaoPagar(item, url) {
    if (url) return `<a class="btn primary" href="${esc(url)}" target="_top" rel="noopener">Pagar ${money(item.total)}</a>`;
    if (!api.remoto) return `<button class="btn primary" data-simular-pag="${esc(item.id)}">Pagar ${money(item.total)} (simulação)</button>`;
    return '';
  }

  // Depois de criar uma encomenda/reserva com pagamento online.
  function pedirPagamento(item, url) {
    const tipo = item.linhas ? 'encomenda' : 'reserva';
    openModal(`
      <h2>💳 Falta o pagamento</h2>
      <p>A sua ${tipo} <strong>${esc(item.id)}</strong> fica guardada durante 30 minutos enquanto conclui o pagamento de <strong>${money(item.total)}</strong>.</p>
      ${item.caucao ? `<p class="small muted">A caução de ${money(item.caucao)} é paga no levantamento.</p>` : ''}
      <p>${botaoPagar(item, url)}</p>
      ${url ? `<p class="small muted">Vai ser encaminhado para a página segura do Stripe. Se não abrir, <a href="${esc(url)}" target="_blank" rel="noopener">abra numa nova janela</a>.</p>` : ''}
      ${api.remoto ? '' : `<p class="small muted">Modo demonstração: nenhum pagamento real é feito. <button class="btn sm" data-cancelar-pag="${esc(item.id)}">Simular desistência</button></p>`}`);
  }

  // Mostra o resultado de um pagamento (ao voltar do Stripe ou na simulação).
  function mostrarPagamento(st) {
    const tipo = st.tipo === 'encomenda' ? 'encomenda' : 'reserva';
    if (st.pagamento === Core.PAG.PAGO && tipo === 'encomenda' && cli.ref === st.id) {
      cli.carrinho = []; saveCli(); updateCartBadge();
    }
    const msgs = {
      [Core.PAG.PAGO]: `<h2>✅ Pagamento confirmado</h2><p>Recebemos ${money(st.total)}. A sua ${tipo} <strong>${esc(st.id)}</strong> está ${tipo === 'encomenda' ? 'a ser preparada' : 'a aguardar a confirmação do proprietário'}.</p>`,
      [Core.PAG.PENDENTE]: `<h2>⏳ A aguardar o pagamento</h2><p>Ainda não recebemos o pagamento da ${tipo} <strong>${esc(st.id)}</strong>. Se escolheu Multibanco, pague a referência indicada: a confirmação chega automaticamente.</p><p>${botaoPagar(st, st.pagamentoUrl)}</p>`,
      [Core.PAG.NAO_PAGO]: `<h2>Pagamento não concluído</h2><p>A ${tipo} <strong>${esc(st.id)}</strong> foi anulada e nada foi cobrado.${tipo === 'encomenda' ? ' Os artigos continuam no carrinho.' : ''}</p>`,
      [Core.PAG.REEMBOLSADO]: `<h2>Pagamento reembolsado</h2><p>A ${tipo} <strong>${esc(st.id)}</strong> foi cancelada e o valor foi devolvido.</p>`
    };
    openModal(`${msgs[st.pagamento] || `<h2>${esc(st.estado)}</h2>`}<p><a class="btn" href="#/conta" data-close-modal>A minha conta</a></p>`);
  }

  async function acaoPagamento(fn, ref) {
    try {
      const st = await fn(ref);
      await refreshPublic();
      mostrarPagamento(st);
      render();
    } catch (e) { openModal(errBox(e)); }
  }

  // O Stripe devolve o cliente a ...?pagamento=REF (ou &cancelado=1).
  function verificarRetornoPagamento() {
    if (!REMOTO || !google.script.url) return;
    google.script.url.getLocation((loc) => {
      const ref = loc.parameter && loc.parameter.pagamento;
      if (!ref) return;
      openModal('<p>A confirmar o pagamento…</p>');
      acaoPagamento(loc.parameter.cancelado === '1' ? api.cancelarPagamento : api.verificarPagamento, ref);
    });
  }

  // Atualiza produtos/stock/ocupações sem recarregar a página.
  async function refreshPublic() {
    try { pub = await api.init(); updateCartBadge(); } catch (e) { /* mantém os dados atuais */ }
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
    const ativa = route === 'produto' ? 'produtos' : route === 'aluguer' ? 'alugueres' : route || '';
    $$('#mainnav a').forEach((a) => a.classList.toggle('active', a.dataset.route === ativa));
    $('#app').innerHTML = '';
    view($('#app'), param && decodeURIComponent(param));
  }

  // ---------- Vistas ----------
  function productCard(p) {
    const stockTag = p.stock <= 0 ? '<span class="tag danger">Esgotado</span>' : p.stock <= 5 ? `<span class="tag warn">Últimas ${p.stock}</span>` : '';
    const href = `#/produto/${encodeURIComponent(p.id)}`;
    return `
      <article class="card">
        <a class="card-media" href="${href}" style="text-decoration:none">${esc(p.emoji)}</a>
        <div class="card-body">
          <div><span class="tag">${esc(p.categoria)}</span> ${stockTag}</div>
          <h3 class="card-title"><a href="${href}" style="color:inherit;text-decoration:none">${esc(p.nome)}</a></h3>
          <div class="card-meta">${esc(p.produtor)} · ${esc(p.local)}</div>
          <div class="card-foot">
            <div class="price">${money(p.preco)} <small>/ ${esc(p.unidade)}</small></div>
            <button class="btn primary sm" data-add="${esc(p.id)}" ${p.stock <= 0 ? 'disabled' : ''}>Adicionar</button>
          </div>
        </div>
      </article>`;
  }
  function rentalCard(a) {
    const href = `#/aluguer/${encodeURIComponent(a.id)}`;
    return `
      <article class="card">
        <a class="card-media" href="${href}" style="text-decoration:none">${esc(a.emoji)}</a>
        <div class="card-body">
          <div><span class="tag">${esc(a.tipo)}</span></div>
          <h3 class="card-title"><a href="${href}" style="color:inherit;text-decoration:none">${esc(a.nome)}</a></h3>
          <div class="card-meta">${esc(a.local)} · ${esc(a.capacidade)}</div>
          <div class="card-foot">
            <div class="price">${money(a.precoDia)} <small>/ dia</small></div>
            <a class="btn primary sm" href="${href}">Reservar</a>
          </div>
        </div>
      </article>`;
  }

  function viewHome(el) {
    const destaquesP = pub.produtos.filter((p) => p.stock > 0).slice(0, 4);
    const destaquesA = pub.alugueres.slice(0, 4);
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
        ${destaquesP.length ? `<div class="grid">${destaquesP.map(productCard).join('')}</div>` : '<div class="empty">Ainda não há produtos.</div>'}
      </section>
      <section class="section">
        <div class="section-head"><h2>Alugueres e equipamento</h2><a href="#/alugueres">Ver todos →</a></div>
        ${destaquesA.length ? `<div class="grid">${destaquesA.map(rentalCard).join('')}</div>` : '<div class="empty">Ainda não há alugueres.</div>'}
      </section>`;
  }

  function viewProdutos(el) {
    const cats = ['Todas', ...new Set(pub.produtos.map((p) => p.categoria))];
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
      const list = pub.produtos.filter((p) =>
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
    const p = pub.produtos.find((x) => x.id === id);
    if (!p) { el.innerHTML = '<div class="empty">Produto não encontrado. <a href="#/produtos">Voltar</a></div>'; return; }
    el.innerHTML = `
      <p><a href="#/produtos">← Produtos</a></p>
      <div class="detail">
        <div class="detail-media">${esc(p.emoji)}</div>
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
    $('#addProd').addEventListener('click', () => addToCart(p.id, Math.max(1, parseInt($('#qtdProd').value, 10) || 1)));
  }

  function viewAlugueres(el) {
    const tipos = ['Todos', ...new Set(pub.alugueres.map((a) => a.tipo))];
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
      const list = pub.alugueres.filter((a) =>
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
    const a = pub.alugueres.find((x) => x.id === id);
    if (!a) { el.innerHTML = '<div class="empty">Aluguer não encontrado. <a href="#/alugueres">Voltar</a></div>'; return; }
    const sel = { inicio: null, fim: null };
    let mes = new Date(); mes.setDate(1);

    el.innerHTML = `
      <p><a href="#/alugueres">← Alugueres</a></p>
      <div class="detail">
        <div>
          <div class="detail-media">${esc(a.emoji)}</div>
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
              <div class="field"><label for="b-email">Email</label><input id="b-email" name="email" type="email" required value="${esc(cli.email)}"></div>
              <div class="field"><label for="b-tel">Telefone</label><input id="b-tel" name="telefone" type="tel"></div>
            </div>
            <div class="field"><label for="b-notas">Notas (opcional)</label><textarea id="b-notas" name="notas" rows="2" placeholder="Hora de levantamento, pedidos especiais…"></textarea></div>
            ${pagamentoField('Pagar no levantamento', 'MB WAY, Multibanco ou numerário')}
            <div id="bookErr"></div>
            <button class="btn primary" style="width:100%" type="submit">Pedir reserva</button>
          </form>
        </div>
      </div>`;

    const drawCal = () => {
      const busyMap = Core.busyDays(pub.ocupacoes, a.id);
      const y = mes.getFullYear(), m = mes.getMonth();
      const primeiroDow = (new Date(y, m, 1).getDay() + 6) % 7; // segunda = 0
      const nDias = new Date(y, m + 1, 0).getDate();
      const hoje = todayISO();
      const podeRecuar = toISO(new Date(y, m, 1)) > hoje.slice(0, 8) + '01';
      let cells = '';
      for (let i = 0; i < primeiroDow; i++) cells += '<div class="cal-day out"></div>';
      for (let d = 1; d <= nDias; d++) {
        const iso = toISO(new Date(y, m, d));
        const ocupado = !!busyMap[iso];
        const cls = ['cal-day'];
        if (iso < hoje) cls.push('past');
        else if (ocupado) cls.push('busy');
        if (iso === sel.inicio || iso === sel.fim) cls.push('sel');
        else if (sel.inicio && sel.fim && iso > sel.inicio && iso < sel.fim) cls.push('range');
        cells += `<button type="button" class="${cls.join(' ')}" data-day="${iso}" ${iso < hoje || ocupado ? 'disabled' : ''} aria-label="${fmtDate(iso)}${ocupado ? ' (ocupado)' : ''}">${d}</button>`;
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
      if (!Core.rangeIsFree(pub.ocupacoes, a.id, sel.inicio, fim)) {
        box.innerHTML = '<div class="alert err">O período escolhido inclui dias já reservados.</div>';
        return;
      }
      const dias = Core.daysBetweenInclusive(sel.inicio, fim);
      box.innerHTML = `
        <div class="summary">
          <span>${fmtDate(sel.inicio)} → ${fmtDate(fim)}</span><span></span>
          <span>${money(a.precoDia)} × ${plural(dias, 'dia', 'dias')}</span><span>${money(a.precoDia * dias)}</span>
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

    $('#bookForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const form = ev.target;
      const f = Object.fromEntries(new FormData(form));
      try {
        const res = await busy(form.querySelector('[type=submit]'),
          () => api.criarReserva({ ...f, itemId: a.id, inicio: sel.inicio, fim: sel.fim || sel.inicio }));
        const r = res.result;
        pub = res.publico;
        cli.email = r.email; cli.ref = r.id; saveCli();
        if (r.estado === Core.AGUARDA) pedirPagamento(r, res.checkoutUrl);
        else openModal(`
          <h2>📅 Pedido de reserva enviado</h2>
          <p>${esc(a.nome)}<br>${fmtDate(r.inicio)} → ${fmtDate(r.fim)} (${plural(r.dias, 'dia', 'dias')})<br>
          Total: <strong>${money(r.total + r.caucao)}</strong> (inclui caução de ${money(r.caucao)})</p>
          <p>Referência: <strong>${esc(r.id)}</strong><br><span class="small muted">Guarde-a: é pedida, com o seu email, em “A minha conta”.</span></p>
          <p class="muted">O proprietário irá confirmar a reserva.</p>
          <a class="btn primary" href="#/conta" data-close-modal>Ver as minhas reservas</a>`);
        sel.inicio = sel.fim = null;
        form.reset();
        $('#b-email').value = cli.email;
        $('#bookErr').innerHTML = '';
      } catch (e) {
        $('#bookErr').innerHTML = errBox(e);
        await refreshPublic();
      }
      drawCal(); drawSummary();
    });

    drawCal(); drawSummary();
  }

  function estadoTag(e) {
    const cls = { Cancelada: 'danger', Pendente: 'warn', Recebida: 'warn', [Core.AGUARDA]: 'warn' }[e] || '';
    return `<span class="tag ${cls}">${esc(e)}</span>`;
  }
  function pagTag(p) {
    if (!p || p === Core.PAG.ENTREGA) return `<div class="small muted">${esc(p || Core.PAG.ENTREGA)}</div>`;
    const cls = { [Core.PAG.PAGO]: '', [Core.PAG.PENDENTE]: 'warn', [Core.PAG.NAO_PAGO]: 'danger', [Core.PAG.REEMBOLSADO]: 'danger' }[p] ?? '';
    return `<div><span class="tag ${cls}">💳 ${esc(p)}</span></div>`;
  }
  // Uma encomenda/reserva a aguardar pagamento só pode ser cancelada.
  const opcoesEstado = (estados, atual) => (atual === Core.AGUARDA ? [Core.AGUARDA, 'Cancelada'] : estados.filter((s) => s !== Core.AGUARDA))
    .map((s) => `<option ${s === atual ? 'selected' : ''}>${s}</option>`).join('');
  function itemNome(r) {
    const a = pub.alugueres.find((x) => x.id === r.itemId);
    return a ? `${esc(a.emoji)} ${esc(a.nome)}` : esc(r.itemNome || '(removido)');
  }

  function viewConta(el) {
    el.innerHTML = `
      <h1>A minha conta</h1>
      <p class="muted">Indique o seu email e a referência de uma encomenda ou reserva (ex.: E… ou R…).</p>
      <form class="filters" id="contaForm">
        <input type="email" name="email" placeholder="Email" value="${esc(cli.email)}" required style="flex:1 1 220px;width:auto">
        <input name="ref" placeholder="Referência" value="${esc(cli.ref)}" required style="flex:0 1 200px;width:auto">
        <button class="btn primary" type="submit">Ver</button>
      </form>
      <div id="contaBody"></div>`;
    const body = $('#contaBody');
    const draw = (dados) => {
      const { encomendas: encs, reservas: ress } = dados;
      const hoje = todayISO();
      body.innerHTML = `
        <section class="section">
          <h2>Reservas</h2>
          ${ress.length ? `<div class="table-wrap"><table>
            <tr><th>Ref.</th><th>Aluguer</th><th>Datas</th><th>Total</th><th>Estado</th><th></th></tr>
            ${ress.map((r) => `<tr>
              <td>${esc(r.id)}</td><td>${itemNome(r)}</td>
              <td>${fmtDate(r.inicio)} → ${fmtDate(r.fim)}</td>
              <td>${money(r.total)}<div class="small muted">+ caução ${money(r.caucao)}</div>${pagTag(r.pagamento)}</td>
              <td>${estadoTag(r.estado)}</td>
              <td style="white-space:nowrap">${r.estado === Core.AGUARDA ? botaoPagar(r, r.pagamentoUrl) + ' ' : ''}${[Core.AGUARDA, 'Pendente', 'Confirmada'].includes(r.estado) && r.fim >= hoje ? `<button class="btn sm danger" data-cancel-res="${esc(r.id)}">Cancelar</button>` : ''}</td>
            </tr>`).join('')}
          </table></div>` : '<div class="empty">Sem reservas. <a href="#/alugueres">Reservar agora</a></div>'}
        </section>
        <section class="section">
          <h2>Encomendas</h2>
          ${encs.length ? `<div class="table-wrap"><table>
            <tr><th>Ref.</th><th>Data</th><th>Artigos</th><th>Entrega</th><th>Total</th><th>Estado</th></tr>
            ${encs.map((e) => `<tr>
              <td>${esc(e.id)}</td><td>${fmtDateTime(e.criadaEm)}</td>
              <td>${e.linhas.map((l) => `${l.qtd}× ${esc(l.nome)}`).join('<br>')}</td>
              <td>${esc(e.entrega)}</td><td>${money(e.total)}${pagTag(e.pagamento)}</td>
              <td>${estadoTag(e.estado)}${e.estado === Core.AGUARDA ? `<div style="margin-top:6px">${botaoPagar(e, e.pagamentoUrl)}</div>` : ''}</td>
            </tr>`).join('')}
          </table></div>` : '<div class="empty">Sem encomendas. <a href="#/produtos">Ver produtos</a></div>'}
        </section>`;
    };
    const load = async (btn) => {
      try {
        body.innerHTML = '<p class="muted">A carregar…</p>';
        draw(await busy(btn, () => api.minhaConta(cli.email, cli.ref)));
      } catch (e) { body.innerHTML = errBox(e); }
    };
    $('#contaForm').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      cli.email = f.email.trim().toLowerCase(); cli.ref = f.ref.trim().toUpperCase(); saveCli();
      load(ev.target.querySelector('[type=submit]'));
    });
    body.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-cancel-res]'); if (!b) return;
      if (!confirm('Cancelar esta reserva? Se já a pagou online, o valor é reembolsado.')) return;
      try {
        const res = await busy(b, () => api.cancelarReserva(cli.email, cli.ref, b.dataset.cancelRes));
        pub = res.publico;
        toast('Reserva cancelada');
        load();
      } catch (err) { toast(err.message); }
    });
    if (cli.email && cli.ref) load();
    else body.innerHTML = '<div class="empty">A referência aparece no fim de cada encomenda ou reserva.</div>';
  }

  // ---------- Gestão ----------
  async function adminCall(nome, args) {
    const res = await api.admin(getPass(), nome, args);
    gestao = { encomendas: res.encomendas, reservas: res.reservas };
    pub = res.publico;
    updateCartBadge();
    return res;
  }

  function viewGestao(el) {
    if (!gestao) {
      if (!api.remoto) {
        el.innerHTML = '<p class="muted">A carregar…</p>';
        adminCall().then(() => viewGestao(el), (e) => { el.innerHTML = errBox(e); });
        return;
      }
      el.innerHTML = `
        <h1>Gestão</h1>
        <form class="panel" id="loginForm" style="max-width:380px">
          <div class="field"><label for="g-pass">Palavra-passe de gestão</label><input id="g-pass" type="password" required autocomplete="current-password"></div>
          <div id="loginErr"></div>
          <button class="btn primary" type="submit">Entrar</button>
        </form>`;
      const tentar = async (btn) => {
        try { await busy(btn, () => adminCall()); viewGestao(el); } catch (e) {
          setPass('');
          $('#loginErr').innerHTML = errBox(e);
        }
      };
      $('#loginForm').addEventListener('submit', (ev) => {
        ev.preventDefault();
        setPass($('#g-pass').value);
        tentar(ev.target.querySelector('[type=submit]'));
      });
      if (getPass()) tentar($('#loginForm [type=submit]'));
      return;
    }

    const tabs = [['resumo', 'Resumo'], ['encomendas', 'Encomendas'], ['reservas', 'Reservas'], ['produtos', 'Produtos'], ['alugueres', 'Alugueres']];
    el.innerHTML = `
      <div class="section-head"><h1>Gestão</h1>
        <div style="display:flex;gap:8px">
          <button class="btn sm" id="gRefresh">↻ Atualizar</button>
          ${api.remoto ? '<button class="btn sm" id="gLogout">Sair</button>' : '<button class="btn sm danger" id="resetData">Repor dados de demonstração</button>'}
        </div></div>
      ${api.remoto ? '' : '<p class="small muted">Modo demonstração: os dados estão só neste navegador. Publique no Google Apps Script para os guardar numa Google Sheet (ver README).</p>'}
      <div class="tabs" id="gTabs">${tabs.map(([k, v]) => `<button data-tab="${k}" class="${ui.tabGestao === k ? 'active' : ''}">${v}</button>`).join('')}</div>
      <div id="gBody"></div>`;
    const body = $('#gBody');
    const draw = () => {
      body.onclick = body.onchange = null;
      ({ resumo: gResumo, encomendas: gEncomendas, reservas: gReservas, produtos: gProdutos, alugueres: gAlugueres })[ui.tabGestao](body, draw);
    };
    $('#gTabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]'); if (!b) return;
      ui.tabGestao = b.dataset.tab;
      $$('#gTabs button').forEach((x) => x.classList.toggle('active', x === b));
      draw();
    });
    $('#gRefresh').addEventListener('click', async (e) => {
      try { await busy(e.currentTarget, () => adminCall()); draw(); toast('Dados atualizados'); } catch (err) { toast(err.message); }
    });
    if (api.remoto) {
      $('#gLogout').addEventListener('click', () => { setPass(''); gestao = null; viewGestao(el); });
    } else {
      $('#resetData').addEventListener('click', async () => {
        if (!confirm('Apagar todos os dados e repor a demonstração?')) return;
        await api.repor();
        cli.carrinho = []; saveCli();
        await adminCall();
        render(); toast('Dados repostos');
      });
    }
    draw();
  }

  // Executa uma ação de gestão e redesenha; mostra o erro se falhar.
  async function acao(nome, args, redraw, msg) {
    try { await adminCall(nome, args); if (msg) toast(msg); } catch (e) { toast(e.message); }
    redraw();
  }

  function gResumo(body) {
    // Encomendas/reservas por pagar online não contam como receita.
    const conta = (x) => x.estado !== 'Cancelada' && x.estado !== Core.AGUARDA;
    const encAtivas = gestao.encomendas.filter(conta);
    const resAtivas = gestao.reservas.filter(conta);
    const vendas = encAtivas.reduce((s, e) => s + e.total, 0);
    const alug = resAtivas.reduce((s, r) => s + r.total, 0);
    const pend = gestao.reservas.filter((r) => r.estado === 'Pendente').length;
    const hoje = todayISO();
    const proximas = resAtivas.filter((r) => r.fim >= hoje).sort((a, b) => a.inicio.localeCompare(b.inicio)).slice(0, 6);
    const baixo = pub.produtos.filter((p) => p.stock <= 5);
    body.innerHTML = `
      <div class="stats">
        <div class="stat"><div class="v">${money(vendas)}</div><div class="k">Vendas de produtos</div></div>
        <div class="stat"><div class="v">${money(alug)}</div><div class="k">Receita de alugueres</div></div>
        <div class="stat"><div class="v">${encAtivas.filter((e) => e.estado === 'Recebida').length}</div><div class="k">Encomendas por preparar</div></div>
        <div class="stat"><div class="v">${pend}</div><div class="k">Reservas por confirmar</div></div>
      </div>
      <div class="detail">
        <div class="panel"><h3>Próximas reservas</h3>
          ${proximas.length ? `<table>${proximas.map((r) => `<tr><td>${itemNome(r)}</td><td class="small">${fmtDate(r.inicio)} → ${fmtDate(r.fim)}</td><td>${estadoTag(r.estado)}</td></tr>`).join('')}</table>` : '<p class="muted">Nenhuma.</p>'}
        </div>
        <div class="panel"><h3>Stock baixo</h3>
          ${baixo.length ? `<table>${baixo.map((p) => `<tr><td>${esc(p.emoji)} ${esc(p.nome)}</td><td>${p.stock <= 0 ? '<span class="tag danger">Esgotado</span>' : `<span class="tag warn">${p.stock}</span>`}</td></tr>`).join('')}</table>` : '<p class="muted">Todo o stock está acima do mínimo.</p>'}
        </div>
      </div>`;
  }

  function gEncomendas(body, redraw) {
    body.innerHTML = gestao.encomendas.length ? `<div class="table-wrap"><table>
      <tr><th>Ref.</th><th>Cliente</th><th>Artigos</th><th>Entrega</th><th>Total</th><th>Estado</th></tr>
      ${gestao.encomendas.map((e) => `<tr>
        <td>${esc(e.id)}<div class="small muted">${fmtDateTime(e.criadaEm)}</div></td>
        <td>${esc(e.nome)}<div class="small muted">${esc(e.email)}${e.telefone ? '<br>' + esc(e.telefone) : ''}</div></td>
        <td>${e.linhas.map((l) => `${l.qtd}× ${esc(l.nome)}`).join('<br>')}</td>
        <td>${esc(e.entrega)}${e.morada ? `<div class="small muted">${esc(e.morada)}</div>` : ''}</td>
        <td>${money(e.total)}${pagTag(e.pagamento)}</td>
        <td><select data-enc="${esc(e.id)}" aria-label="Estado" ${e.estado === 'Cancelada' ? 'disabled' : ''}>${opcoesEstado(Core.ESTADOS_ENCOMENDA, e.estado)}</select></td>
      </tr>`).join('')}
    </table></div>` : '<div class="empty">Ainda não há encomendas.</div>';
    body.onchange = (ev) => {
      const s = ev.target.closest('[data-enc]'); if (!s) return;
      if (s.value === 'Cancelada' && !confirm('Cancelar a encomenda? O stock será reposto e, se foi paga online, o valor é reembolsado.')) { redraw(); return; }
      s.disabled = true;
      acao('estadoEncomenda', { id: s.dataset.enc, estado: s.value }, redraw, 'Estado atualizado');
    };
  }

  function gReservas(body, redraw) {
    const list = [...gestao.reservas].sort((a, b) => a.inicio.localeCompare(b.inicio));
    body.innerHTML = list.length ? `<div class="table-wrap"><table>
      <tr><th>Ref.</th><th>Aluguer</th><th>Cliente</th><th>Datas</th><th>Total</th><th>Estado</th></tr>
      ${list.map((r) => `<tr>
        <td>${esc(r.id)}</td><td>${itemNome(r)}</td>
        <td>${esc(r.nome)}<div class="small muted">${esc(r.email)}${r.telefone ? '<br>' + esc(r.telefone) : ''}</div>${r.notas ? `<div class="small">“${esc(r.notas)}”</div>` : ''}</td>
        <td>${fmtDate(r.inicio)} → ${fmtDate(r.fim)}<div class="small muted">${plural(r.dias, 'dia', 'dias')}</div></td>
        <td>${money(r.total)}<div class="small muted">caução ${money(r.caucao)}</div>${pagTag(r.pagamento)}</td>
        <td><select data-res="${esc(r.id)}" aria-label="Estado">${opcoesEstado(Core.ESTADOS_RESERVA, r.estado)}</select></td>
      </tr>`).join('')}
    </table></div>` : '<div class="empty">Ainda não há reservas.</div>';
    body.onchange = (ev) => {
      const s = ev.target.closest('[data-res]'); if (!s) return;
      if (s.value === 'Cancelada' && !confirm('Cancelar a reserva? Se foi paga online, o valor é reembolsado.')) { redraw(); return; }
      s.disabled = true;
      acao('estadoReserva', { id: s.dataset.res, estado: s.value }, redraw, 'Estado atualizado');
    };
  }

  function gProdutos(body, redraw) {
    body.innerHTML = `
      <p><button class="btn primary" id="novoProd">+ Novo produto</button></p>
      <div class="table-wrap"><table>
        <tr><th></th><th>Produto</th><th>Categoria</th><th>Preço</th><th>Stock</th><th></th></tr>
        ${pub.produtos.map((p) => `<tr>
          <td>${esc(p.emoji)}</td><td>${esc(p.nome)}<div class="small muted">${esc(p.produtor)}</div></td>
          <td>${esc(p.categoria)}</td><td>${money(p.preco)}<div class="small muted">${esc(p.unidade)}</div></td><td>${p.stock}</td>
          <td style="white-space:nowrap"><button class="btn sm" data-edit-prod="${esc(p.id)}">Editar</button> <button class="btn sm danger" data-del-prod="${esc(p.id)}">Apagar</button></td>
        </tr>`).join('')}
      </table></div>`;
    body.onclick = (e) => {
      if (e.target.closest('#novoProd')) return editProduto(null, redraw);
      const ed = e.target.closest('[data-edit-prod]'); if (ed) return editProduto(ed.dataset.editProd, redraw);
      const del = e.target.closest('[data-del-prod]');
      if (del && confirm('Apagar este produto?')) acao('apagarProduto', { id: del.dataset.delProd }, redraw, 'Produto apagado');
    };
  }

  function editProduto(id, redraw) {
    const p = pub.produtos.find((x) => x.id === id) || { nome: '', categoria: '', preco: '', unidade: 'unidade', stock: 0, produtor: '', local: '', emoji: '🥕', descricao: '' };
    openModal(`
      <h2>${id ? 'Editar produto' : 'Novo produto'}</h2>
      <form id="prodForm">
        <div class="row">
          <div class="field" style="max-width:90px"><label>Ícone</label><input name="emoji" value="${esc(p.emoji)}" maxlength="8"></div>
          <div class="field"><label>Nome</label><input name="nome" required value="${esc(p.nome)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Categoria</label><input name="categoria" required value="${esc(p.categoria)}" list="catList"></div>
          <div class="field"><label>Unidade</label><input name="unidade" required value="${esc(p.unidade)}"></div>
        </div>
        <datalist id="catList">${[...new Set(pub.produtos.map((x) => x.categoria))].map((c) => `<option value="${esc(c)}">`).join('')}</datalist>
        <div class="row">
          <div class="field"><label>Preço (€)</label><input name="preco" type="number" step="0.01" min="0" required value="${esc(p.preco)}"></div>
          <div class="field"><label>Stock</label><input name="stock" type="number" step="1" min="0" required value="${esc(p.stock)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Produtor</label><input name="produtor" required value="${esc(p.produtor)}"></div>
          <div class="field"><label>Região</label><input name="local" value="${esc(p.local)}"></div>
        </div>
        <div class="field"><label>Descrição</label><textarea name="descricao" rows="2">${esc(p.descricao)}</textarea></div>
        <div id="prodErr"></div>
        <button class="btn primary" type="submit">Guardar</button>
      </form>`);
    $('#prodForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      try {
        await busy(ev.target.querySelector('[type=submit]'), () => adminCall('guardarProduto', { ...f, id }));
        closeModal(); redraw(); toast('Produto guardado');
      } catch (e) { $('#prodErr').innerHTML = errBox(e); }
    });
  }

  function gAlugueres(body, redraw) {
    const hoje = todayISO();
    body.innerHTML = `
      <p><button class="btn primary" id="novoAlu">+ Novo aluguer</button></p>
      <div class="table-wrap"><table>
        <tr><th></th><th>Aluguer</th><th>Tipo</th><th>Preço/dia</th><th>Caução</th><th>Reservas futuras</th><th></th></tr>
        ${pub.alugueres.map((a) => `<tr>
          <td>${esc(a.emoji)}</td><td>${esc(a.nome)}<div class="small muted">${esc(a.local)}</div></td><td>${esc(a.tipo)}</td>
          <td>${money(a.precoDia)}</td><td>${money(a.caucao)}</td>
          <td>${pub.ocupacoes.filter((r) => r.itemId === a.id && r.fim >= hoje).length}</td>
          <td style="white-space:nowrap"><button class="btn sm" data-edit-alu="${esc(a.id)}">Editar</button> <button class="btn sm danger" data-del-alu="${esc(a.id)}">Apagar</button></td>
        </tr>`).join('')}
      </table></div>`;
    body.onclick = (e) => {
      if (e.target.closest('#novoAlu')) return editAluguer(null, redraw);
      const ed = e.target.closest('[data-edit-alu]'); if (ed) return editAluguer(ed.dataset.editAlu, redraw);
      const del = e.target.closest('[data-del-alu]');
      if (del && confirm('Apagar este aluguer?')) acao('apagarAluguer', { id: del.dataset.delAlu }, redraw, 'Aluguer apagado');
    };
  }

  function editAluguer(id, redraw) {
    const a = pub.alugueres.find((x) => x.id === id) || { nome: '', tipo: 'Equipamento', precoDia: '', caucao: 0, capacidade: '', local: '', emoji: '🔧', proprietario: '', descricao: '' };
    const tipos = [...new Set(['Alojamento', 'Espaço', 'Equipamento', 'Transporte', ...pub.alugueres.map((x) => x.tipo)])];
    openModal(`
      <h2>${id ? 'Editar aluguer' : 'Novo aluguer'}</h2>
      <form id="aluForm">
        <div class="row">
          <div class="field" style="max-width:90px"><label>Ícone</label><input name="emoji" value="${esc(a.emoji)}" maxlength="8"></div>
          <div class="field"><label>Nome</label><input name="nome" required value="${esc(a.nome)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Tipo</label><select name="tipo">${tipos.map((t) => `<option ${t === a.tipo ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select></div>
          <div class="field"><label>Capacidade / detalhe</label><input name="capacidade" value="${esc(a.capacidade)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Preço por dia (€)</label><input name="precoDia" type="number" step="0.01" min="0" required value="${esc(a.precoDia)}"></div>
          <div class="field"><label>Caução (€)</label><input name="caucao" type="number" step="0.01" min="0" value="${esc(a.caucao)}"></div>
        </div>
        <div class="row">
          <div class="field"><label>Proprietário</label><input name="proprietario" required value="${esc(a.proprietario)}"></div>
          <div class="field"><label>Local</label><input name="local" value="${esc(a.local)}"></div>
        </div>
        <div class="field"><label>Descrição</label><textarea name="descricao" rows="2">${esc(a.descricao)}</textarea></div>
        <div id="aluErr"></div>
        <button class="btn primary" type="submit">Guardar</button>
      </form>`);
    $('#aluForm').addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const f = Object.fromEntries(new FormData(ev.target));
      try {
        await busy(ev.target.querySelector('[type=submit]'), () => adminCall('guardarAluguer', { ...f, id }));
        closeModal(); redraw(); toast('Aluguer guardado');
      } catch (e) { $('#aluErr').innerHTML = errBox(e); }
    });
  }

  // ---------- Eventos globais ----------
  document.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { addToCart(add.dataset.add); return; }
    const q = e.target.closest('[data-qty]');
    if (q) { const l = cli.carrinho.find((x) => x.id === q.dataset.qty); if (l) setQty(l.id, l.qtd + Number(q.dataset.d)); return; }
    if (e.target.closest('#checkoutBtn')) { openCheckout(); return; }
    const sim = e.target.closest('[data-simular-pag]');
    if (sim) { acaoPagamento(api.simularPagamento, sim.dataset.simularPag); return; }
    const desist = e.target.closest('[data-cancelar-pag]');
    if (desist) { acaoPagamento(api.cancelarPagamento, desist.dataset.cancelarPag); return; }
    if (e.target.closest('[data-close-drawer]')) closeCart();
    if (e.target.closest('[data-close-modal]')) closeModal();
  });
  $('#cartBtn').addEventListener('click', openCart);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeModal(); closeCart(); } });
  window.addEventListener('hashchange', () => { closeModal(); closeCart(); render(); window.scrollTo(0, 0); });

  $('#app').innerHTML = '<p class="muted">A carregar…</p>';
  api.init().then((d) => {
    pub = d;
    // Remove do carrinho produtos que já não existem.
    cli.carrinho = cli.carrinho.filter((l) => pub.produtos.some((p) => p.id === l.id));
    saveCli(); updateCartBadge(); render();
    verificarRetornoPagamento();
  }, (e) => {
    $('#app').innerHTML = `${errBox(e)}<p><button class="btn" onclick="location.reload()">Tentar novamente</button></p>`;
  });
})();
