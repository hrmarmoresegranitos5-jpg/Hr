// ═══════════════════════════════════════════════════════
// HR Mármores — Pós-venda automático (v2)
// v2: usa a DATA REAL DA ENTREGA (marcada como "Entregue" no orçamento / livro de entregas) e quem manda é o BOT,
//     pelo WhatsApp oficial da HR, 30 dias depois da entrega. A home mostra o que está agendado e o que já foi.
//     O botão "Abrir no meu WhatsApp" continua como alternativa manual.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';

  var DIAS = 30;          // quando o aviso aparece
  var JANELA_MAX = 60;    // depois disso o aviso some sozinho (não vira lista eterna)
  var MIG_KEY = 'hr_pv_mig_v1';

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function diasDesde(iso) {
    try {
      var d = new Date(iso + 'T00:00:00'), n = new Date();
      n.setHours(0, 0, 0, 0);
      return Math.round((n - d) / 86400000);
    } catch (e) { return -1; }
  }

  // ── Carimbo da data de conclusão ─────────────────────────────────────
  // O app marca "concluído" em vários lugares. Em vez de mexer em cada um,
  // carimbamos no salvamento: todo serviço done sem doneAt ganha a data de hoje.
  function carimbar() {
    try {
      var hoje = td();
      (DB.j || []).forEach(function (j) {
        if (j.done && !j.doneAt) j.doneAt = hoje;
        if (!j.done && j.doneAt) { delete j.doneAt; delete j.posVendaFeito; delete j.posVendaDispensado; } // reaberto
      });
    } catch (e) {}
  }

  // Migração única: serviços que JÁ estavam concluídos antes desta atualização
  // usam a data de entrega prevista (end) como referência — não "hoje".
  function migrar() {
    try {
      if (localStorage.getItem(MIG_KEY)) return;
      var mudou = false;
      (DB.j || []).forEach(function (j) {
        if (j.done && !j.doneAt) {
          var ref = j.end || j.start;
          if (ref) { j.doneAt = ref; mudou = true; }
        }
      });
      localStorage.setItem(MIG_KEY, '1');
      if (mudou) DB.sv();
    } catch (e) {}
  }

  function telDe(j) {
    var q = (DB.q || []).find(function (x) { return String(x.id) === String(j.qId); });
    var tel = q && q.tel;
    if (!tel) {
      var mesmo = (DB.q || []).filter(function (x) { return x.cli === j.cli && x.tel; })
        .sort(function (a, b) { return (b.id || 0) - (a.id || 0); })[0];
      tel = mesmo && mesmo.tel;
    }
    return String(tel || '').replace(/\D/g, '');
  }

  function primeiroNome(cli) {
    var n = String(cli || '').trim().split(/\s+/)[0] || '';
    return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : '';
  }

  function itemDe(j) {
    var t = String(j.cat || j.desc || '').toLowerCase();
    var mapa = [
      ['soleira', 'da soleira'], ['peitoril', 'do peitoril'], ['túmulo', 'do túmulo'], ['tumulo', 'do túmulo'],
      ['capela', 'da capela'], ['nicho', 'do nicho'], ['escada', 'da escada'], ['cozinha', 'da bancada da cozinha'],
      ['banheiro', 'da bancada do banheiro'], ['lavabo', 'da bancada do lavabo'], ['gourmet', 'da área gourmet'],
      ['piscina', 'da borda da piscina'], ['fachada', 'da fachada'], ['plaquinha', 'da plaquinha']
    ];
    for (var i = 0; i < mapa.length; i++) if (t.indexOf(mapa[i][0]) >= 0) return mapa[i][1];
    return 'do serviço';
  }

  function textoPadrao(j) {
    var nome = primeiroNome(j.cli);
    var link = '';
    try { link = String((CFG && CFG.emp && CFG.emp.maps) || '').trim(); } catch (e) {}
    return 'Oi' + (nome ? ', ' + nome : '') + '! Faz um mês da ' + (j.instala ? 'instalação ' : 'entrega ') + itemDe(j)
      + '. Tudo certo com o serviço? Se estiver satisfeito, você poderia nos avaliar no Google Maps? Isso ajuda muito a nossa empresa.'
      + (link ? '\n' + link : '');
  }

  // data real da entrega: "Entregue" no orçamento (_entregueEm / data do status) → senão a conclusão na agenda
  function quoteDe(j) { return (DB.q || []).find(function (x) { return String(x.id) === String(j.qId); }) || null; }
  function dataReal(j) {
    var q = quoteDe(j), d = q && (q._entregueEm || (q.status === 'entregue' && q._statusDate) || (q.status === 'concluido' && q._concluidoData));
    return /^\d{4}-\d{2}-\d{2}/.test(String(d || '')) ? String(d).slice(0, 10) : (j.doneAt || '');
  }
  function soEntrega(j) { var t = String(j.cat || j.desc || '').toLowerCase(); return /soleira|peitoril/.test(t) && !/cozinha|banheiro|lavabo|bancada|t[uú]mulo|pia/.test(t); }

  // ── Lista: entregas dos últimos 60 dias (o bot manda no dia 30) ──────
  function pendentes() {
    return (DB.j || []).filter(function (j) {
      if (!j.done || j.posVendaDispensado || soEntrega(j)) return false;
      var dr = dataReal(j); if (!dr) return false;
      var d = diasDesde(dr);
      return d >= 0 && d <= JANELA_MAX && !(j.posVendaFeito && diasDesde(j.posVendaFeito) > 3);
    }).sort(function (a, b) { return String(dataReal(a)).localeCompare(String(dataReal(b))); });
  }

  // ── Bot: agenda/consulta (o bot escreve sozinho no dia 30) ───────────
  var botEst = {}, botEm = 0;
  function botCfg() { try { var c = _getBotCfg(); return c && c.url ? String(c.url).replace(/\/+$/, '') : ''; } catch (e) { return ''; } }
  function sincBot(forcar) {
    var b = botCfg(); if (!b || (!forcar && Date.now() - botEm < 5 * 60000)) return;
    botEm = Date.now();
    var lista = pendentes(), itens = lista.filter(function (j) { return !j.posVendaFeito; }).map(function (j) { return { id: 'app' + j.id, cli: j.cli, tel: telDe(j), serv: String(j.cat || j.desc || ''), entrega: dataReal(j) }; });
    fetch(b + '/bot/posvenda1', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, _botHeaders()), body: JSON.stringify({ itens: itens, consultar: lista.map(function (j) { return 'app' + j.id; }) }) })
      .then(function (r) { return r.json(); }).then(function (j) {
        botEst = (j && j.itens) || {}; var mudou = false;
        lista.forEach(function (x) { var e = botEst['app' + x.id]; if (e && e.enviadoEm && !x.posVendaFeito) { x.posVendaFeito = td(); x.posVendaBot = 1; mudou = true; } });
        if (mudou) DB.sv(); render();
      }).catch(function () {});
  }
  function brData(iso) { var p = String(iso || '').split('-'); return p.length === 3 ? p[2] + '/' + p[1] : iso; }
  function somaDias(iso, n) { var d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

  // ── Home ─────────────────────────────────────────────────────────────
  function render() {
    var el = document.getElementById('homePosVenda');
    if (!el) return;
    try {
      var lista = pendentes();
      if (!lista.length) { el.innerHTML = ''; return; }
      var bot = !!botCfg();
      var linhas = lista.map(function (j) {
        var dr = dataReal(j), d = diasDesde(dr), e = botEst['app' + j.id] || {}, tel = telDe(j);
        var st, cor = '201,168,76', ic = '⏳';
        if (j.posVendaFeito || e.enviadoEm) { st = j.posVendaBot || e.enviadoEm ? 'Enviado pelo bot ✓' : 'Mensagem enviada ✓'; cor = '61,220,132'; ic = '✅'; }
        else if (e.status === 'sem_tel' || (!tel && bot && d >= DIAS)) { st = 'Sem telefone: toque para resolver'; cor = '248,113,113'; ic = '📵'; }
        else if (!bot) { st = d >= DIAS ? 'Toque para mandar' : 'Mensagem no dia ' + brData(somaDias(dr, DIAS)); }
        else if (d >= DIAS) { st = 'O bot manda hoje (até 10h–18h)'; ic = '🤖'; }
        else { st = 'O bot manda dia ' + brData(somaDias(dr, DIAS)); ic = '🤖'; }
        return '<button type="button" onclick="_pvAbrir(' + JSON.stringify(String(j.id)).replace(/"/g, '&quot;') + ')" '
          + 'style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;margin-top:7px;border-radius:13px;'
          + 'border:1px solid rgba(' + cor + ',.35);background:linear-gradient(135deg,rgba(' + cor + ',.12),rgba(' + cor + ',.03));color:inherit;font:inherit;cursor:pointer;">'
          + '<span style="font-size:1.25rem;">' + ic + '</span><span style="flex:1;min-width:0;"><b style="font-size:.84rem;">' + esc(j.cli || 'Cliente') + '</b>'
          + '<span style="display:block;font-size:.7rem;color:var(--t3,#999);margin-top:1px;">Entregue ' + brData(dr) + ' · ' + esc(itemDe(j).replace(/^d[aoe] /, '')) + '</span>'
          + '<span style="display:block;font-size:.72rem;font-weight:700;color:rgb(' + cor + ');margin-top:2px;">' + st + '</span></span><span style="color:var(--t3,#999);">›</span></button>';
      }).join('');
      el.innerHTML = '<div style="margin:10px 12px 0;padding:12px;border-radius:16px;border:1px solid rgba(201,168,76,.35);background:linear-gradient(135deg,rgba(201,168,76,.08),rgba(20,20,30,.6));">'
        + '<div style="display:flex;justify-content:space-between;align-items:center;"><span style="font-size:.6rem;letter-spacing:1.6px;font-weight:800;color:var(--gold2,#C9A84C);">💬 PÓS-VENDA · 30 DIAS APÓS A ENTREGA</span></div>'
        + linhas + '</div>';
    } catch (e) { el.innerHTML = ''; }
  }

  // ── Modal: texto editável + abrir WhatsApp ───────────────────────────
  window._pvAbrir = function (id) {
    var j = (DB.j || []).find(function (x) { return String(x.id) === String(id); });
    if (!j) return;
    var tel = telDe(j);
    var m = document.createElement('div');
    m.id = '_pvModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div style="width:100%;max-width:480px;background:var(--s1,#14110a);border-radius:20px 20px 0 0;padding:22px 20px 26px;border-top:2px solid var(--gold,#C9A84C);color:var(--tx,#eee);font-family:Outfit,sans-serif;max-height:90vh;overflow:auto;">'
      + '<div style="font-size:1.05rem;font-weight:800;margin-bottom:6px;">💬 Pós-venda — ' + esc(j.cli) + '</div>'
      + '<div style="font-size:.78rem;color:var(--t3,#999);margin-bottom:10px;">'
      + 'Entregue em <b>' + brData(dataReal(j)) + '</b>. ' + (botCfg() ? 'O bot manda sozinho no dia ' + brData(somaDias(dataReal(j), DIAS)) + ', com os botões <i>Ficou ótimo ⭐</i> (pede a avaliação no Google) e <i>Tive um problema</i> (te avisa).' : '') + '</div>'
      + '<div style="display:flex;gap:8px;align-items:center;margin-bottom:10px;"><span style="font-size:.75rem;color:var(--t3,#999);">WhatsApp:</span><input id="_pvTel" inputmode="tel" placeholder="(74) 9 9999-9999" style="flex:1;padding:10px;border-radius:10px;border:1px solid var(--bd2,#444);background:var(--s2,#1c1810);color:inherit;font:inherit;font-size:.9rem;"></div>'
      + '<textarea id="_pvTxt" rows="7" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--bd2,#444);background:var(--s2,#1c1810);color:inherit;font:inherit;font-size:.9rem;line-height:1.5;resize:vertical;"></textarea>'
      + '<button type="button" id="_pvZap" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:#25D366;color:#000;font-weight:800;font-size:.95rem;cursor:pointer;font-family:Outfit,sans-serif;">💬 Abrir WhatsApp</button>'
      + '<button type="button" id="_pvNao" style="width:100%;margin-top:8px;padding:12px;border-radius:12px;border:1px solid var(--bd2,#444);background:transparent;color:inherit;font-weight:700;font-size:.85rem;cursor:pointer;font-family:Outfit,sans-serif;">Não mandar para este cliente</button>'
      + '<button type="button" id="_pvFechar" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3,#999);font-size:.8rem;cursor:pointer;font-family:Outfit,sans-serif;">Voltar (decidir depois)</button>'
      + '</div>';
    document.body.appendChild(m);
    document.getElementById('_pvTxt').value = textoPadrao(j);
    document.getElementById('_pvTel').value = tel ? tel.replace(/^55(?=\d{10,11}$)/, '') : '';
    if (botCfg()) {
      var bb = document.createElement('button'); bb.type = 'button';
      bb.style.cssText = 'width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:800;font-size:.95rem;cursor:pointer;font-family:Outfit,sans-serif;';
      bb.textContent = '🤖 O bot manda agora';
      var zp = document.getElementById('_pvZap'); zp.parentNode.insertBefore(bb, zp);
      zp.textContent = '💬 Abrir no meu WhatsApp'; zp.style.background = 'transparent'; zp.style.color = '#25D366'; zp.style.border = '1px solid #25D36688';
      bb.onclick = function () {
        var t = document.getElementById('_pvTel').value.replace(/\D/g, '');
        if (t.length < 10) { if (typeof toast === 'function') toast('⚠️ Coloque o WhatsApp do cliente (DDD + número)'); return; }
        guardarTel(j, t);
        bb.disabled = true; bb.textContent = 'Agendando…';
        fetch(botCfg() + '/bot/posvenda1', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, _botHeaders()), body: JSON.stringify({ itens: [{ id: 'app' + j.id, cli: j.cli, tel: t, serv: String(j.cat || j.desc || ''), entrega: dataReal(j) || td(), agora: true }] }) })
          .then(function (r) { return r.json(); }).then(function () { fechar(); botEm = 0; sincBot(true); if (typeof toast === 'function') toast('✓ O bot vai mandar a mensagem a ' + primeiroNome(j.cli) + ' em instantes'); })
          .catch(function (e) { bb.disabled = false; bb.textContent = '🤖 O bot manda agora'; if (typeof toast === 'function') toast('⚠️ ' + e.message); });
      };
    }
    var fechar = function () { var e = document.getElementById('_pvModal'); if (e) e.remove(); };

    document.getElementById('_pvZap').onclick = function () {
      var txt = document.getElementById('_pvTxt').value, t2 = document.getElementById('_pvTel').value.replace(/\D/g, '');
      if (t2.length >= 10) { tel = t2; guardarTel(j, t2); }
      var num = tel.length <= 11 ? '55' + tel : tel;   // DDD+número → põe o 55 do Brasil
      var url = tel ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(txt)
                    : 'https://wa.me/?text=' + encodeURIComponent(txt);
      window.open(url, '_blank');
      j.posVendaFeito = td();          // marcado como feito; some da lista
      DB.sv();
      fechar(); render();
      if (typeof toast === 'function') toast('✓ Pós-venda de ' + primeiroNome(j.cli) + ' marcado como feito');
    };
    document.getElementById('_pvNao').onclick = function () {
      j.posVendaDispensado = td();
      DB.sv();
      fechar(); render();
    };
    document.getElementById('_pvFechar').onclick = fechar;
  };

  function guardarTel(j, t) { try { var q = quoteDe(j); if (q && !q.tel) { q.tel = t; DB.sv(); } } catch (e) {} }

  // ── Início ───────────────────────────────────────────────────────────
  function ini() {
    try {
      if (typeof DB === 'undefined' || !DB.sv) return setTimeout(ini, 500);
      var svOrig = DB.sv;
      DB.sv = function () { carimbar(); return svOrig.apply(this, arguments); };
      migrar();
      carimbar();
      render();
      setInterval(render, 5000);
      setTimeout(function () { sincBot(true); }, 8000);
      setInterval(function () { if (!document.hidden) sincBot(false); }, 5 * 60000);
    } catch (e) { console.error('posvenda:', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(ini, 900); });
  else setTimeout(ini, 900);

  window._pvPendentes = pendentes; // para diagnóstico
})();
