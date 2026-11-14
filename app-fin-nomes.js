// ═══════════════════════════════════════════════════════════════════════════
// app-fin-nomes.js — NOMES CERTOS NAS MOVIMENTAÇÕES (v1)
//   • Pix do Mercado Pago: o nome do BANCO (Caixa, Stone, Nubank…) não aparece mais como se fosse o cliente.
//   • Entrada sem nome mostra "Quem pagou?": toque → lista de clientes com SUGESTÕES pelo valor
//     (orçamento à vista/entrada, serviço da agenda, conta a receber) e busca. Ao escolher, o nome fica no lançamento
//     e o bot aprende a conta de quem pagou (os próximos Pix dessa pessoa já chegam com o nome).
//   • Ao abrir Finanças, pergunta ao bot o nome dos Pix que estão sem nome (POST /bot/mp/quem).
//   • Linha da lista: nome do cliente em destaque (até 2 linhas), e embaixo "Recebido · Pix Mercado Pago".
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var RE_BANCO = /\b(institui|pagamentos?|banco|bank|caixa econ|nu ?pag|nubank|picpay|mercado ?pago|stone|pagseguro|pagbank|inter\b|c6|sicoob|sicredi|bradesco|ita[uú]|santander|cooperativa|cr[eé]dito|financeira|neon|original|safra|btg|cora\b|asaas|unicred|banrisul|digio|recargapay|s\.?\s?a\.?$)/i;
  var RE_GENERICO = /^(cliente|payment|pagamento|mercado pago|recebimento|pix|entrada)$/i;
  function esc(t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brl(v) { return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function norm(s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(); }
  function tituloCaso(s) { return String(s || '').toLowerCase().replace(/(^|\s)(\S)/g, function (m, a, b) { return a + b.toUpperCase(); }).replace(/\b(De|Da|Do|Dos|Das|E)\b/g, function (x) { return x.toLowerCase(); }); }

  // "Recebido de STONE INSTITUICAO (Mercado Pago)" → { op:'Recebido', nome:'', fonte:'Pix Mercado Pago', semNome:true }
  function ler(t) {
    var d = String(t.desc || '').trim();
    var fonte = '';
    var mf = d.match(/\s*\((Pix Mercado Pago|Mercado Pago|cobran[cç]a Pix|dinheiro|pix|cart[aã]o|boleto|transfer[eê]ncia)\)\s*$/i);
    if (mf) { fonte = /mercado/i.test(mf[1]) ? 'Pix Mercado Pago' : mf[1].charAt(0).toUpperCase() + mf[1].slice(1); d = d.slice(0, mf.index).trim(); }
    var m = d.match(/^(Recebido de|Sinal de|Pagamento de|Pago por)\s+(.+)$/i);
    if (!m) return null;
    var nome = m[2].trim();
    var semNome = RE_GENERICO.test(nome) || RE_BANCO.test(nome);
    return { op: /^sinal/i.test(m[1]) ? 'Sinal' : 'Recebido', nome: semNome ? '' : tituloCaso(nome), banco: semNome && RE_BANCO.test(nome) ? nome : '', fonte: fonte, semNome: semNome };
  }
  window.finNomeLer = ler;
  function bancoCurto(b) { var x = String(b || '').replace(/\b(institui[cç][aã]o( de)?( pagamentos?)?|pagamentos?|s\.?\s?a\.?|ltda|ip|banco|econ[oô]mica federal|financeira)\b/gi, ' ').replace(/[.,]/g, ' ').replace(/\s+/g, ' ').trim(); return tituloCaso(x.split(' ').slice(0, 2).join(' ')) || 'banco'; }

  // ── linha da lista (substitui _finRow só para entradas "Recebido de …") ──
  var rowOriginal = window._finRow;
  if (typeof rowOriginal === 'function') {
    window._finRow = function (t, hoje, forceAtrasado) {
      var p = t && t.type === 'in' ? ler(t) : null;
      if (!p) return rowOriginal.apply(this, arguments);
      var h = '<div class="fin-row fnm-row">';
      h += '<div class="fin-dot fin-dot-in">📈</div>';
      h += '<div class="fin-row-body">';
      if (p.semNome) h += '<div class="fin-row-cli fnm-nome fnm-vazio">Cliente não identificado</div>';
      else h += '<div class="fin-row-cli fnm-nome">' + esc(p.nome) + '</div>';
      h += '<div class="fin-row-sub">' + p.op + (p.fonte ? ' · ' + esc(p.fonte) : '') + (p.banco ? ' <span class="fnm-banco">· via ' + esc(bancoCurto(p.banco)) + '</span>' : '') + '</div>';
      h += '<div class="fin-row-dt">' + (t.date ? fd(t.date) : '');
      if (p.semNome) h += ' <button class="fnm-quem" data-fnmquem="' + t.id + '">👤 Quem pagou?</button>';
      h += '</div></div>';
      h += '<div class="fin-row-right"><div class="fin-row-val fin-val-in">+' + 'R$ ' + fm(t.value || 0) + '</div>';
      h += '<button class="fin-edit" data-edittr="' + t.id + '">✏️</button></div>';
      h += '</div>';
      return h;
    };
  }

  // ── sugestões pelo valor ──
  function sugestoes(t) {
    var v = Number(t.value) || 0, out = [], visto = {};
    function add(nome, motivo) { var k = norm(nome); if (!k || visto[k]) return; visto[k] = 1; out.push({ nome: tituloCaso(nome), motivo: motivo }); }
    var perto = function (a) { return a > 0 && Math.abs(a - v) < 0.02; };
    (DB.t || []).forEach(function (x) { if (x.type === 'pend' && perto(x.value)) { var pr = ler({ desc: String(x.desc || '').replace(/^.*?—\s*/, 'Recebido de ') }); add(pr && pr.nome ? pr.nome : String(x.desc || '').replace(/^.*?—\s*/, '').replace(/\s*\(.*$/, ''), 'conta a receber de ' + brl(x.value)); } });
    (DB.j || []).forEach(function (j) { if (!j || !j.cli) return; var falta = (Number(j.value) || 0) - (Number(j.pago) || 0); if (perto(j.value) || perto(falta) || perto((Number(j.value) || 0) / 2)) add(j.cli, 'serviço da agenda: ' + (j.desc || '').slice(0, 30)); });
    (DB.q || []).forEach(function (q) { if (!q || !q.cli) return; if (perto(q.vista)) add(q.cli, 'orçamento à vista ' + brl(q.vista)); else if (perto(q.ent)) add(q.cli, 'entrada do orçamento ' + brl(q.ent)); });
    return out.slice(0, 5);
  }
  function todosClientes() {
    var l = [], visto = {};
    function add(n) { var k = norm(n); if (!k || k.length < 2 || visto[k]) return; visto[k] = 1; l.push(tituloCaso(n)); }
    try { if (typeof CLDB !== 'undefined') CLDB.get().forEach(function (c) { add(c.nome || c.nm || c.name); }); } catch (e) {}
    (DB.q || []).forEach(function (q) { add(q.cli); });
    (DB.j || []).forEach(function (j) { add(j.cli); });
    return l.sort(function (a, b) { return a.localeCompare(b, 'pt-BR'); });
  }

  // ── modal "Quem pagou?" ──
  function abrir(id) {
    var t = (DB.t || []).find(function (x) { return x.id == id; }); if (!t) return;
    fechar();
    var sug = sugestoes(t);
    var ov = document.createElement('div'); ov.id = 'fnmModal'; ov.className = 'fnm-ov';
    ov.innerHTML = '<div class="fnm-box">'
      + '<div class="fnm-hd"><div><div class="fnm-tit">Quem pagou?</div><div class="fnm-sub">' + brl(t.value) + ' · ' + (t.date ? fd(t.date) : '') + '</div></div><button class="fnm-x" data-fnmfechar="1">✕</button></div>'
      + (sug.length ? '<div class="fnm-sec">Sugestões pelo valor</div>' + sug.map(function (s) { return '<button class="fnm-op fnm-sug" data-fnmnome="' + esc(s.nome) + '"><b>' + esc(s.nome) + '</b><span>' + esc(s.motivo) + '</span></button>'; }).join('') : '')
      + '<div class="fnm-sec">Todos os clientes</div>'
      + '<input class="fnm-busca" id="fnmBusca" placeholder="Buscar ou digitar um nome novo..." autocomplete="off">'
      + '<div class="fnm-lista" id="fnmLista"></div>'
      + '</div>';
    ov.dataset.tid = id;
    document.body.appendChild(ov);
    var todos = todosClientes();
    function filtrar() {
      var q = norm(document.getElementById('fnmBusca').value);
      var l = todos.filter(function (n) { return !q || norm(n).indexOf(q) >= 0; }).slice(0, 60);
      var html = l.map(function (n) { return '<button class="fnm-op" data-fnmnome="' + esc(n) + '"><b>' + esc(n) + '</b></button>'; }).join('');
      var dig = document.getElementById('fnmBusca').value.trim();
      if (dig.length >= 3 && !l.some(function (n) { return norm(n) === norm(dig); })) html = '<button class="fnm-op fnm-novo" data-fnmnome="' + esc(tituloCaso(dig)) + '">➕ Usar "<b>' + esc(tituloCaso(dig)) + '</b>"</button>' + html;
      document.getElementById('fnmLista').innerHTML = html || '<div class="fnm-vaz">Nenhum cliente com esse nome.</div>';
    }
    document.getElementById('fnmBusca').addEventListener('input', filtrar);
    filtrar();
  }
  function fechar() { var o = document.getElementById('fnmModal'); if (o) o.remove(); }
  function aplicar(id, nome) {
    var t = (DB.t || []).find(function (x) { return x.id == id; }); if (!t) return;
    var p = ler(t) || { op: 'Recebido', fonte: '' };
    t.desc = (p.op === 'Sinal' ? 'Sinal de ' : 'Recebido de ') + nome + (p.fonte ? ' (' + p.fonte + ')' : '');
    t.cli = nome;
    try { DB.sv(); } catch (e) {}
    fechar();
    try { if (typeof renderFin === 'function') renderFin(); } catch (e) {}
    if (typeof toast === 'function') toast('✅ ' + nome);
    if (t.mpId) bot('/bot/mp/nomear', { mpId: t.mpId, nome: nome }).then(function (r) { if (r && r.aprendeu && typeof toast === 'function') toast('🤖 O bot aprendeu: os próximos Pix de ' + nome.split(' ')[0] + ' já vêm com o nome'); }).catch(function () {});
  }
  function bot(path, corpo) {
    var b = ''; try { b = String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) {}
    if (!b) return Promise.reject(new Error('sem bot'));
    return fetch(b + path, { method: 'POST', headers: _botHeaders(), body: JSON.stringify(corpo) }).then(function (r) { return r.json(); });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-fnmquem]'); if (b) { e.preventDefault(); e.stopPropagation(); abrir(b.dataset.fnmquem); return; }
    if (e.target.closest('[data-fnmfechar]') || e.target.id === 'fnmModal') { fechar(); return; }
    var n = e.target.closest('[data-fnmnome]'); if (n) { var ov = document.getElementById('fnmModal'); if (ov) aplicar(ov.dataset.tid, n.dataset.fnmnome); }
  }, true);

  // ── ao abrir Finanças: pergunta ao bot o nome dos Pix sem nome (uma vez por lançamento) ──
  var perguntando = false;
  function completar() {
    if (perguntando) return;
    var feitos = {}; try { feitos = JSON.parse(localStorage.getItem('hr_fnm_feitos') || '{}'); } catch (e) {}
    var alvos = (DB.t || []).filter(function (t) { if (t.type !== 'in' || !t.mpId || feitos[t.mpId]) return false; var p = ler(t); return p && p.semNome; }).slice(0, 15);
    if (!alvos.length) return;
    perguntando = true;
    bot('/bot/mp/quem', { ids: alvos.map(function (t) { return String(t.mpId); }) }).then(function (r) {
      var mudou = 0;
      alvos.forEach(function (t) {
        var q = r && r.quem && r.quem[t.mpId]; if (!q || q.erro) return;
        feitos[t.mpId] = 1;
        if (q.nome && !RE_BANCO.test(q.nome)) { var p = ler(t); t.desc = (p.op === 'Sinal' ? 'Sinal de ' : 'Recebido de ') + tituloCaso(q.nome) + (p.fonte ? ' (' + p.fonte + ')' : ''); t.cli = tituloCaso(q.nome); mudou++; }
        else if (q.banco && !/via /.test(t.desc)) { /* fica sem nome; o banco aparece como "via" */ }
      });
      localStorage.setItem('hr_fnm_feitos', JSON.stringify(feitos));
      if (mudou) { try { DB.sv(); } catch (e) {} try { renderFin(); } catch (e) {} if (typeof toast === 'function') toast('🤖 ' + mudou + ' Pix ganharam o nome de quem pagou'); }
    }).catch(function () {}).then(function () { perguntando = false; });
  }
  var renderOriginal = window.renderFin;
  if (typeof renderOriginal === 'function') {
    window.renderFin = function () { var r = renderOriginal.apply(this, arguments); setTimeout(completar, 800); return r; };
  }
})();
