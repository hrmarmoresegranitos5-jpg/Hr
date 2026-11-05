// ═══════════════════════════════════════════════════════════════════
// ENTREGA E ACEITE — ficha no card do Histórico + livro compartilhado com o bot
// Mostra (e deixa editar) o que foi informado ao marcar Aceito / Entregue / Concluído:
// data do aceite, entrada, forma, data da entrega, telefone, combinado de pagamento, observações.
// Tudo é enviado ao Worker em POST /bot/livro (o mesmo "livro" que o bot lê para cobrar),
// e o que o bot registrar sozinho (Pix baixado etc.) volta por GET /bot/livro e aparece aqui.
// Carregar DEPOIS de app-core.js e app-secretaria.js.
// ═══════════════════════════════════════════════════════════════════
(function () {
  if (window.__hrLivro) return;
  window.__hrLivro = true;

  var LIV = {};            // id do livro -> registro vindo do bot
  var livEm = 0;           // quando buscou pela última vez
  var buscando = false;
  var HASH_KEY = 'hr_livro_hash';
  var STS = { aceito: 1, entregue: 1, concluido: 1 };

  function stDe(q) { return q.status === 'aprovado' ? 'aceito' : (q.status || 'pendente'); }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function money(v) { return typeof fm === 'function' ? fm(v) : (Number(v) || 0).toFixed(2).replace('.', ','); }
  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function brData(d) { var m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function hoje() { return typeof td === 'function' ? td() : new Date().toISOString().slice(0, 10); }
  function num(v) { // aceita "1.234,56", "1234,56" e "1234.56"
    var s = String(v == null ? '' : v).trim();
    if (!s) return 0;
    if (s.indexOf(',') >= 0) s = s.replace(/\./g, '').replace(',', '.');
    var n = parseFloat(s.replace(/[^\d.\-]/g, ''));
    return isFinite(n) ? n : 0;
  }
  function achaQ(id) { return ((typeof DB !== 'undefined' && DB.q) || []).find(function (q) { return String(q.id) === String(id); }); }
  function livId(q) { return q._livId || ('q' + String(q.id).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 38)); }
  function nomeKey(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }

  function telDe(q) {
    if (q._tel) return q._tel;
    try {
      var n = nomeKey(q.cli);
      var c = ((typeof CLDB !== 'undefined' && CLDB.get && CLDB.get()) || []).find(function (c) { return c && c.nome && nomeKey(c.nome) === n; });
      return c && c.tel ? String(c.tel) : '';
    } catch (e) { return ''; }
  }
  function entregaDe(q) { return q._entregueEm || (stDe(q) === 'entregue' ? (q._statusDate || '') : ''); }

  // Pagamentos que o app conhece (aceite, final e os lançados à mão aqui)
  function pagsApp(q) {
    var id = livId(q), L = [];
    if (q._aceitoValor > 0) L.push({ data: q._aceitoData || '', valor: r2(q._aceitoValor), forma: q._aceitoForma || '', obs: 'Entrada (aceite)', ref: 'app:' + id + ':aceite', fixo: true });
    if (q._concluidoValor > 0) L.push({ data: q._concluidoData || '', valor: r2(q._concluidoValor), forma: q._concluidoForma || '', obs: 'Pagamento final', ref: 'app:' + id + ':final', fixo: true });
    (q._pags || []).forEach(function (p, i) {
      if (p && num(p.valor) > 0) L.push({ data: p.data || '', valor: r2(num(p.valor)), forma: p.forma || '', obs: p.obs || '', ref: 'app:' + id + ':m' + (p.id || i), manual: true, idx: i });
    });
    var soma = L.reduce(function (t, p) { return t + p.valor; }, 0);
    var rec = r2(q._valorRecebido || 0);
    if (rec > soma + 0.009) L.push({ data: q._statusDate || '', valor: r2(rec - soma), forma: 'Outro', obs: 'Outros recebimentos (A Receber)', ref: 'app:' + id + ':outros', fixo: true });
    return L;
  }
  // Pagamentos que só o bot conhece (Pix baixado, dinheiro avisado no WhatsApp…)
  function pagsBot(q) {
    var r = LIV[livId(q)];
    if (!r || !Array.isArray(r.pagamentos)) return [];
    return r.pagamentos.filter(function (p) { return !(p.ref && String(p.ref).indexOf('app:' + livId(q)) === 0); })
      .map(function (p) { return { data: p.data, valor: r2(p.valor), forma: p.forma || '', obs: p.obs || '', bot: true }; });
  }
  function todosPags(q) { return pagsApp(q).concat(pagsBot(q)).sort(function (a, b) { return String(a.data).localeCompare(String(b.data)); }); }

  // ── Ficha dentro do card ──
  function blocoHtml(q) {
    var pags = todosPags(q);
    var pago = pags.reduce(function (t, p) { return t + p.valor; }, 0);
    var falta = r2((q.vista || 0) - pago);
    var tel = telDe(q), ent = entregaDe(q);
    var linha = function (k, v) { return '<div class="qdr"><span class="k">' + k + '</span><span class="v" style="font-size:.74rem;text-align:right;max-width:210px;">' + v + '</span></div>'; };
    var h = '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;"><b style="color:var(--gold);font-size:.8rem;">📦 Entrega e aceite</b>' +
      '<button class="btn btn-o" style="padding:4px 10px;font-size:.72rem;" onclick="event.stopPropagation();hrLivroEditar(\'' + esc(q.id) + '\')">✏️ Editar</button></div>';
    h += linha('Aceito em', (q._aceitoData ? brData(q._aceitoData) : '—') + (q._aceitoValor > 0 ? ' · R$ ' + money(q._aceitoValor) + (q._aceitoForma ? ' (' + esc(q._aceitoForma) + ')' : '') : ''));
    h += linha('Entregue em', ent ? brData(ent) : '—');
    h += linha('Telefone', tel ? esc(tel) : '<span style="color:#f59e0b;">sem telefone — o bot não consegue cobrar</span>');
    if (q._pgForma || q._pgData) h += linha('Combinado', esc(q._pgForma || '') + (q._pgData ? ' até ' + brData(q._pgData) : ''));
    if (pags.length) {
      h += '<div style="margin-top:4px;font-size:.72rem;color:var(--tx2,#aaa);">Pagamentos</div>';
      pags.forEach(function (p) {
        h += '<div style="display:flex;justify-content:space-between;font-size:.74rem;padding:2px 0;"><span>' + (p.data ? brData(p.data) : '—') + ' · ' + esc(p.forma || 'Outro') + (p.obs ? ' · <i>' + esc(p.obs) + '</i>' : '') + (p.bot ? ' 🤖' : '') + '</span><b>R$ ' + money(p.valor) + '</b></div>';
      });
    } else h += linha('Pagamentos', 'nenhum registrado');
    h += linha('Pago / falta', '<b style="color:#4ade80;">R$ ' + money(pago) + '</b> / ' + (falta > 0.009 ? '<b style="color:#f59e0b;">R$ ' + money(falta) + '</b>' : '<b style="color:#4ade80;">quitado</b>'));
    if (q._entregaObs) h += linha('Obs. da entrega', esc(q._entregaObs));
    return h;
  }
  window.hrLivroCardHtml = function (q) {
    try {
      if (!q || !STS[stDe(q)]) return '';
      buscarLivro(false);
      return '<div class="hr-liv" data-hr-liv="' + esc(q.id) + '" style="margin:8px 0;padding:10px 12px;border:1px solid rgba(212,175,55,.35);border-radius:12px;background:rgba(212,175,55,.06);">' + blocoHtml(q) + '</div>';
    } catch (e) { console.warn('[livro] card:', e); return ''; }
  };
  function repinta() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-hr-liv]'), function (el) {
      var q = achaQ(el.getAttribute('data-hr-liv'));
      if (q) el.innerHTML = blocoHtml(q);
    });
  }

  // ── Livro do bot (GET) ──
  function cfg() { try { var c = _getBotCfg(); return c && c.url && c.key ? c : null; } catch (e) { return null; } }
  function buscarLivro(forcar) {
    var c = cfg();
    if (!c || buscando || (!forcar && Date.now() - livEm < 60000)) return Promise.resolve();
    buscando = true; livEm = Date.now();
    return fetch(String(c.url).replace(/\/+$/, '') + '/bot/livro', { headers: _botHeaders() })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        buscando = false;
        if (!j || !Array.isArray(j.registros)) return;
        LIV = {}; j.registros.forEach(function (r) { LIV[r.id] = r; });
        // junta com registro que o bot já criou antes (mesmo cliente, ainda sem id do app)
        ((typeof DB !== 'undefined' && DB.q) || []).forEach(function (q) {
          if (!q || !STS[stDe(q)] || q._livId) return;
          var mesmo = j.registros.filter(function (r) { return !/^q/.test(String(r.id)) && nomeKey(r.cliente) === nomeKey(q.cli) && (!(r.valor > 0) || Math.abs(r.valor - (q.vista || 0)) < 0.01); });
          if (mesmo.length === 1) { q._livId = mesmo[0].id; try { DB.sv(); } catch (e) {} }
        });
        repinta();
      }).catch(function () { buscando = false; });
  }

  // ── Envio (POST) ──
  function registro(q) {
    var obs = [];
    if (q._pgForma || q._pgData) obs.push('Combinado: ' + (q._pgForma || '') + (q._pgData ? ' até ' + brData(q._pgData) : ''));
    if (q._entregaObs) obs.push(q._entregaObs);
    return {
      id: livId(q), cliente: String(q.cli || '').slice(0, 60), tel: telDe(q),
      desc: ((q.tipo || '') + (q.mat ? ' — ' + q.mat : '')).slice(0, 80), valor: r2(q.vista || 0),
      entregaEm: entregaDe(q) || undefined, obs: obs.join(' · ').slice(0, 120),
      pagamentos: pagsApp(q).map(function (p) { return { valor: p.valor, forma: p.forma, data: p.data || undefined, obs: p.obs, ref: p.ref }; })
    };
  }
  var timer = null;
  function sync(q) {
    var c = cfg();
    if (!c || !q || !STS[stDe(q)] || !q.cli) return;
    clearTimeout(timer);
    timer = setTimeout(function () { enviarTodos(false); }, 1500);
  }
  function enviarTodos(forcar) {
    var c = cfg(); if (!c) return Promise.resolve();
    var map = {}; try { map = JSON.parse(localStorage.getItem(HASH_KEY) || '{}'); } catch (e) {}
    var lote = [], novos = {};
    ((typeof DB !== 'undefined' && DB.q) || []).forEach(function (q) {
      if (!q || !q.cli || !STS[stDe(q)] || q._arquivado) return;
      var r = registro(q), h = JSON.stringify(r);
      novos[r.id] = h;
      if (forcar || map[r.id] !== h) lote.push(r);
    });
    if (!lote.length) return Promise.resolve();
    return fetch(String(c.url).replace(/\/+$/, '') + '/bot/livro', { method: 'POST', headers: _botHeaders(), body: JSON.stringify({ registros: lote.slice(0, 400) }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) {
        if (r.ok && j.ok) {
          lote.forEach(function (x) { map[x.id] = novos[x.id]; });
          localStorage.setItem(HASH_KEY, JSON.stringify(map));
          if (j.erros && j.erros.length) console.warn('[livro] avisos:', j.erros);
          buscarLivro(true);
        } else console.warn('[livro] recusado:', r.status, j.error || '');
      }); }).catch(function (e) { console.warn('[livro] falha:', e); });
  }
  window.hrLivroSync = enviarTodos; // console: hrLivroSync(true)

  // ── Ganchos: data da entrega + envio ao mudar o status ──
  var origAplicar = window._aplicarStatusOrc;
  if (typeof origAplicar === 'function') {
    window._aplicarStatusOrc = function (q, novo) {
      if (q && novo === 'entregue' && !q._entregueEm) q._entregueEm = hoje();
      var r = origAplicar.apply(this, arguments);
      try { sync(q); } catch (e) {}
      return r;
    };
  }

  // ── Editor ──
  window.hrLivroEditar = function (id) {
    var q = achaQ(id); if (!q) return;
    var old = document.getElementById('hrLivModal'); if (old) old.remove();
    var manuais = (q._pags || []).map(function (p) { return { id: p.id, data: p.data || '', valor: p.valor, forma: p.forma || 'Pix', obs: p.obs || '' }; });
    var fixos = pagsApp(q).filter(function (p) { return p.fixo; });
    var formas = ['Pix', 'Dinheiro', 'Cartão', 'Boleto', 'Transferência', 'Cheque', 'Outro'];
    var optF = function (sel) { return formas.map(function (f) { return '<option' + (f === sel ? ' selected' : '') + '>' + f + '</option>'; }).join(''); };
    var inp = 'width:100%;padding:9px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:#14141c;color:#fff;font-size:.85rem;box-sizing:border-box;';
    var lbl = 'display:block;font-size:.72rem;color:#aaa;margin:10px 0 3px;';
    var m = document.createElement('div');
    m.id = 'hrLivModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.75);display:flex;align-items:flex-end;justify-content:center;';
    function linhasPag() {
      return manuais.map(function (p, i) {
        return '<div style="display:grid;grid-template-columns:1fr 1fr 1fr auto;gap:6px;margin-top:6px;">' +
          '<input data-k="valor" data-i="' + i + '" value="' + esc(p.valor || '') + '" placeholder="Valor" inputmode="decimal" style="' + inp + '">' +
          '<select data-k="forma" data-i="' + i + '" style="' + inp + '">' + optF(p.forma) + '</select>' +
          '<input data-k="data" data-i="' + i + '" type="date" value="' + esc(p.data || '') + '" style="' + inp + '">' +
          '<button data-del="' + i + '" style="padding:0 10px;border-radius:8px;border:1px solid #7f1d1d;background:#2a0f0f;color:#f87171;">✕</button></div>';
      }).join('');
    }
    function desenha() {
      m.innerHTML = '<div style="width:100%;max-width:520px;max-height:92vh;overflow:auto;background:#0d0d14;border:1px solid rgba(212,175,55,.4);border-radius:18px 18px 0 0;padding:16px;color:#fff;">' +
        '<div style="font-weight:700;color:var(--gold,#d4af37);">📦 Entrega e aceite — ' + esc(q.cli) + '</div>' +
        '<div style="font-size:.72rem;color:#aaa;margin-top:2px;">O bot lê estas informações para cobrar e responder.</div>' +
        '<label style="' + lbl + '">Data do aceite</label><input id="hlAcData" type="date" value="' + esc(q._aceitoData || '') + '" style="' + inp + '">' +
        '<label style="' + lbl + '">Data da entrega</label><input id="hlEnt" type="date" value="' + esc(entregaDe(q)) + '" style="' + inp + '">' +
        '<label style="' + lbl + '">Telefone do cliente (com DDD)</label><input id="hlTel" value="' + esc(telDe(q)) + '" inputmode="tel" placeholder="74 99999-9999" style="' + inp + '">' +
        '<label style="' + lbl + '">Combinado: forma de pagamento / até quando</label>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;"><select id="hlPgF" style="' + inp + '"><option value="">—</option>' + optF(q._pgForma || '') + '</select><input id="hlPgD" type="date" value="' + esc(q._pgData || '') + '" style="' + inp + '"></div>' +
        '<label style="' + lbl + '">Observações</label><textarea id="hlObs" rows="2" style="' + inp + '">' + esc(q._entregaObs || '') + '</textarea>' +
        '<label style="' + lbl + '">Pagamentos já lançados (Aceito / Concluído / A Receber)</label>' +
        (fixos.length ? fixos.map(function (p) { return '<div style="font-size:.76rem;padding:2px 0;">' + (p.data ? brData(p.data) : '—') + ' · ' + esc(p.forma || 'Outro') + ' · <b>R$ ' + money(p.valor) + '</b> <i style="color:#888;">' + esc(p.obs) + '</i></div>'; }).join('') : '<div style="font-size:.76rem;color:#888;">nenhum</div>') +
        '<label style="' + lbl + '">Outros pagamentos (só informativo — não lança em Finanças)</label>' +
        '<div id="hlPags">' + linhasPag() + '</div>' +
        '<button id="hlAdd" style="margin-top:8px;padding:7px 12px;border-radius:8px;border:1px dashed rgba(212,175,55,.5);background:none;color:var(--gold,#d4af37);">+ pagamento</button>' +
        '<div style="display:flex;gap:8px;margin-top:16px;"><button id="hlCan" style="flex:1;padding:12px;border-radius:10px;border:1px solid rgba(255,255,255,.2);background:none;color:#fff;">Cancelar</button><button id="hlOk" style="flex:2;padding:12px;border-radius:10px;border:0;background:linear-gradient(135deg,#d4af37,#b8912b);color:#111;font-weight:700;">Salvar</button></div></div>';
      m.querySelector('#hlCan').onclick = function () { m.remove(); };
      m.querySelector('#hlAdd').onclick = function () { lePags(); manuais.push({ id: Date.now(), data: hoje(), valor: '', forma: 'Pix', obs: '' }); desenha(); };
      Array.prototype.forEach.call(m.querySelectorAll('[data-del]'), function (b) { b.onclick = function () { lePags(); manuais.splice(Number(b.getAttribute('data-del')), 1); desenha(); }; });
      m.querySelector('#hlOk').onclick = salvar;
    }
    function lePags() {
      Array.prototype.forEach.call(m.querySelectorAll('[data-k]'), function (el) { var p = manuais[Number(el.getAttribute('data-i'))]; if (p) p[el.getAttribute('data-k')] = el.value; });
      var o = m.querySelector('#hlObs'); if (o) q._entregaObs = o.value; // preserva ao redesenhar
    }
    function salvar() {
      lePags();
      var g = function (i) { return m.querySelector(i).value; };
      q._aceitoData = g('#hlAcData') || q._aceitoData || '';
      q._entregueEm = g('#hlEnt') || '';
      q._tel = g('#hlTel').trim();
      q._pgForma = g('#hlPgF'); q._pgData = g('#hlPgD');
      q._entregaObs = g('#hlObs').trim().slice(0, 100);
      q._pags = manuais.filter(function (p) { return num(p.valor) > 0; }).map(function (p) { return { id: p.id || Date.now(), data: p.data || hoje(), valor: r2(num(p.valor)), forma: p.forma || 'Outro', obs: p.obs || '' }; });
      try { DB.sv(); } catch (e) {}
      m.remove();
      try { renderOrc(); } catch (e) {}
      sync(q);
      if (typeof toast === 'function') toast('✓ Entrega e aceite salvos — o bot já recebe');
    }
    desenha();
    document.body.appendChild(m);
  };

  // Envio inicial (dá tempo do app carregar) e a cada 5 min se algo mudou
  setTimeout(function () { enviarTodos(false); buscarLivro(true); }, 20000);
  setInterval(function () { enviarTodos(false); }, 300000);
})();
