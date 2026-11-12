// app-site-pedidos.js — v1: projetos que o cliente montou no site (/portfolio) chegam aqui, na tela de Orçamento.
// "Montar orçamento" preenche cliente, ambiente, pedra, cuba, acessórios e as medidas que ele deixou; o dono completa as peças e gera o PDF.
// Carregar DEPOIS de app-core.js e app-secretaria.js (usa _getBotCfg, _botHeaders, ambientes, renderAmbientes, novoOrcamento, pickCuba).
(function () {
  if (window.__hrSitePed) return; window.__hrSitePed = true;
  var LEADS = [], aberto = false;
  var TIPO = { cozinha: 'Cozinha', banheiro: 'Banheiro', lavabo: 'Lavabo', area_servico: 'Área de Serviço', escada: 'Escada', soleira: 'Soleira', varanda: 'Outro', piso: 'Outro', outro: 'Outro' };
  var AMB = { cozinha: 'Cozinha', banheiro: 'Banheiro', lavabo: 'Lavabo', area_servico: 'Área de serviço', varanda: 'Churrasqueira / varanda', escada: 'Escada', soleira: 'Soleira / peitoril', piso: 'Piso / revestimento', outro: 'Outro' };
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function quando(ms) { var d = new Date(ms), h = new Date(); var dia = d.toDateString() === h.toDateString() ? 'hoje' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }); return dia + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); }

  function api(path, opts) {
    var b = base(); if (!b) return Promise.resolve({});
    opts = opts || {}; opts.headers = _botHeaders();
    return fetch(b + path, opts).then(function (r) { return r.json().catch(function () { return {}; }); });
  }
  function carregar() {
    if (!base() || document.hidden) return;
    api('/bot/site/leads').then(function (j) { if (j && Array.isArray(j.leads)) { LEADS = j.leads; desenhar(); } }).catch(function () {});
  }
  function caixa() {
    var el = document.getElementById('sitePedBox');
    if (el) return el;
    var pg = document.getElementById('pg0'); if (!pg) return null;
    el = document.createElement('div'); el.id = 'sitePedBox';
    var hero = pg.querySelector('.hero');
    if (hero && hero.nextSibling) pg.insertBefore(el, hero.nextSibling); else pg.insertBefore(el, pg.firstChild);
    return el;
  }
  function desenhar() {
    var el = caixa(); if (!el) return;
    var ativos = LEADS.filter(function (l) { return l.status !== 'feito'; });
    if (!ativos.length) { el.innerHTML = ''; return; }
    var novos = ativos.filter(function (l) { return (l.status || 'novo') === 'novo'; }).length;
    var h = '<div style="margin:10px 14px 4px;background:linear-gradient(135deg,rgba(201,168,76,.14),rgba(201,168,76,.04));border:1px solid rgba(201,168,76,.4);border-radius:12px;overflow:hidden;">'
      + '<div data-sp="tog" style="display:flex;align-items:center;gap:10px;padding:11px 13px;cursor:pointer;">'
      + '<span style="font-size:1.1rem;">🌐</span><div style="flex:1;"><div style="font-size:.8rem;font-weight:700;color:var(--gold2);">Projetos do site</div>'
      + '<div style="font-size:.62rem;color:var(--t3);">' + ativos.length + ' projeto' + (ativos.length > 1 ? 's' : '') + (novos ? ' · <b style="color:var(--gold);">' + novos + ' novo' + (novos > 1 ? 's' : '') + '</b>' : '') + '</div></div>'
      + '<span style="color:var(--gold);font-size:.8rem;">' + (aberto ? '▲' : '▼') + '</span></div>';
    if (aberto) {
      ativos.forEach(function (l) {
        var it = [l.pedra && l.pedra.nm, l.cuba ? (/^cuba/i.test(l.cuba.nm) ? '' : 'Cuba ') + l.cuba.nm : (l.cubaOp || ''), (l.acessorios || []).length ? (l.acessorios.length + ' acessório' + (l.acessorios.length > 1 ? 's' : '')) : ''].filter(Boolean).join(' · ');
        h += '<div style="border-top:1px solid rgba(201,168,76,.15);padding:10px 13px;">'
          + '<div style="display:flex;justify-content:space-between;gap:8px;"><div style="font-size:.78rem;font-weight:700;color:var(--tx);">' + ((l.status || 'novo') === 'novo' ? '<span style="color:var(--gold);">● </span>' : '') + esc(l.nome) + '</div><div style="font-size:.58rem;color:var(--t4);white-space:nowrap;">' + quando(l.em) + '</div></div>'
          + '<div style="font-size:.66rem;color:var(--gold2);margin-top:2px;">' + esc(AMB[l.ambiente] || 'Outro') + (l.cidade ? ' · ' + esc(l.cidade) : '') + '</div>'
          + (it ? '<div style="font-size:.64rem;color:var(--t3);margin-top:2px;">' + esc(it) + '</div>' : '')
          + (l.medidas ? '<div style="font-size:.62rem;color:var(--t3);margin-top:2px;">📐 ' + esc(l.medidas) + '</div>' : '')
          + (l.obs ? '<div style="font-size:.62rem;color:var(--t3);margin-top:2px;">💬 ' + esc(l.obs) + '</div>' : '')
          + '<div style="display:flex;gap:6px;margin-top:8px;">'
          + '<button data-sp="montar" data-p="' + esc(l.protocolo) + '" style="flex:1;padding:9px;border-radius:9px;border:1px solid var(--gold);background:rgba(201,168,76,.16);color:var(--gold);font-weight:700;font-size:.7rem;font-family:Outfit,sans-serif;cursor:pointer;">✦ Montar orçamento</button>'
          + '<a href="https://wa.me/' + esc(l.tel) + '" target="_blank" style="padding:9px 11px;border-radius:9px;border:1px solid rgba(37,211,102,.4);color:#25D366;font-size:.7rem;text-decoration:none;">WhatsApp</a>'
          + '<button data-sp="feito" data-p="' + esc(l.protocolo) + '" title="Tirar da lista" style="padding:9px 11px;border-radius:9px;border:1px solid var(--bd);background:transparent;color:var(--t3);font-size:.7rem;cursor:pointer;">✓</button>'
          + '</div></div>';
      });
    }
    el.innerHTML = h + '</div>';
  }
  function status(p, st) {
    LEADS.forEach(function (l) { if (l.protocolo === p) l.status = st; });
    desenhar();
    return api('/bot/site/leads/status', { method: 'POST', body: JSON.stringify({ protocolo: p, status: st }) }).catch(function () {});
  }
  function acha(lista, id, nome) {
    lista = lista || [];
    var x = id ? lista.filter(function (s) { return String(s.id) === String(id); })[0] : null;
    if (!x && nome) { var n = norm(nome); x = lista.filter(function (s) { return norm(s.nm) === n; })[0] || null; }
    return x || null;
  }
  function montar(p) {
    var l = LEADS.filter(function (x) { return x.protocolo === p; })[0]; if (!l) return;
    // começa um orçamento novo (pergunta antes se já houver algo digitado)
    var antes = (document.getElementById('oCliente') || {}).value;
    novoOrcamento();
    if (antes && document.getElementById('oCliente').value === antes) return; // o dono cancelou
    if (ambientes.length !== 1 || (ambientes[0].pecas || []).some(function (x) { return x.w || x.h || x.desc; })) return;
    var set = function (id, v) { var e = document.getElementById(id); if (e) e.value = v || ''; };
    set('oCliente', l.nome); set('oTel', String(l.tel || '').replace(/^55/, '')); set('oCidade', l.cidade);
    set('oObs', ['Projeto do site ' + l.protocolo, l.medidas ? 'Medidas: ' + l.medidas : '', l.obs || ''].filter(Boolean).join(' · ').slice(0, 300));
    var a = ambientes[0];
    a.tipo = TIPO[l.ambiente] || 'Outro';
    var st = acha(CFG.stones, l.pedraId, l.pedra && l.pedra.nm);
    if (st) { a.selMat = st.id; try { selMat = st.id; } catch (e) {} }
    var falta = [];
    if (l.pedra && !st) falta.push('pedra "' + l.pedra.nm + '"');
    (l.acessIds || []).forEach(function (id, i) {
      var ac = acha(CFG.ac, id, l.acessorios && l.acessorios[i] && l.acessorios[i].nm);
      if (ac) a.acState['ac_cat_' + ac.id] = 1; else falta.push('acessório ' + ((l.acessorios[i] || {}).nm || id));
    });
    // medidas do site viram a primeira peça (o dono confere)
    var m = String(l.medidas || '').match(/comprimento\s+([\d.,]+)\s*m.*?largura\s+([\d.,]+)\s*cm/i);
    if (m && a.pecas && a.pecas[0]) {
      var c = parseFloat(m[1].replace(',', '.')), w = parseFloat(m[2].replace(',', '.'));
      if (c > 0 && w > 0) { a.pecas[0].w = Math.round((c > 20 ? c : c * 100) * 10) / 10; a.pecas[0].h = w; a.pecas[0].desc = 'Bancada (medida do cliente)'; }
    }
    renderAmbientes();
    if (l.cubaId || (l.cuba && l.cuba.nm)) {
      var lista = l.cubaG === 'lav' ? CFG.lav : CFG.coz, cb = acha(lista, l.cubaId, l.cuba && l.cuba.nm);
      if (cb) { _cubaPickAmbId = a.id; try { pickCuba(cb.id, l.cubaG === 'lav' ? 'lav' : 'coz'); } catch (e) { falta.push('cuba ' + l.cuba.nm); } }
      else falta.push('cuba ' + (l.cuba ? l.cuba.nm : ''));
    } else if (/ja tenho/.test(norm(l.cubaOp))) { _cubaPickAmbId = a.id; try { pickCuba('__cli__', l.cubaG === 'lav' ? 'lav' : 'coz'); } catch (e) {} }
    status(p, 'aberto');
    aberto = false; desenhar();
    try { go(0); } catch (e) {}
    toast('✦ Projeto de ' + l.nome + ' no orçamento' + (falta.length ? ' — confira: ' + falta.join(', ') : '. Complete as peças.'));
  }
  document.addEventListener('click', function (ev) {
    var b = ev.target.closest && ev.target.closest('[data-sp]'); if (!b) return;
    var a = b.getAttribute('data-sp');
    if (a === 'tog') { aberto = !aberto; desenhar(); }
    else if (a === 'montar') montar(b.getAttribute('data-p'));
    else if (a === 'feito') status(b.getAttribute('data-p'), 'feito');
  });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) carregar(); });
  setTimeout(carregar, 2500);
  setInterval(carregar, 60000);
})();
