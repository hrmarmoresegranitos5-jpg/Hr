// app-lucro-obra.js — v1 (28/11/2026): LUCRO POR OBRA
// Cartão nas Configurações: para cada orçamento fechado (aceito, entregue ou concluído) mostra o valor fechado,
// o custo estimado no orçamento (pedra pelo custo real + mão de obra) e os gastos lançados nas finanças para aquela obra
// (lançamentos com o nome do cliente ou marcados pela própria obra), o lucro e a margem. Também mostra quais tipos de
// serviço dão mais lucro. "+ Gasto desta obra" lança uma saída nas finanças já ligada à obra.
(function () {
  'use strict';
  function fmv(v) { return (+v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function nrm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function hoje() { try { return td(); } catch (e) { return new Date().toISOString().slice(0, 10); } }
  function tipoDe(q) { var t = String(q.tipo || 'Outro').split('+')[0].replace(/^[^A-Za-zÀ-ú]+/, '').trim(); return t || 'Outro'; }
  function receitaDe(q) { return q.formaPag === 'parcelado' && +q.parc > 0 ? +q.parc : (+q.vista || +q.parc || 0); }
  function chaveNome(q) { var w = nrm(q.cli).split(/\s+/).filter(function (x) { return x.length > 2 && ['dos', 'das', 'de', 'da', 'do'].indexOf(x) < 0; }); return w.length >= 2 ? [w[0], w[w.length - 1]] : w.slice(0, 1); }
  function gastosDe(q) {
    var k = chaveNome(q);
    return (DB.t || []).filter(function (t) {
      if (!t || t.type !== 'out' || t.isProLabore) return false;
      if (t.qId != null) return String(t.qId) === String(q.id);
      if (k.length < 2) return false;
      var d = nrm(t.desc); return k.every(function (w) { return d.indexOf(w) >= 0; }) && (!q.date || !t.date || t.date >= q.date);
    });
  }
  function dados(meses) {
    var lim = meses ? new Date(Date.now() - meses * 30.5 * 864e5).toISOString().slice(0, 10) : '';
    return (DB.q || []).filter(function (q) { return q && /aceito|entregue|concluido/.test(String(q.status || '')) && (!lim || String(q._statusDate || q.date || '') >= lim); }).map(function (q) {
      var rec = receitaDe(q), est = +q._custoPainel || +q.matCusto || 0, gs = gastosDe(q), ext = gs.reduce(function (s, t) { return s + (+t.value || 0); }, 0), luc = rec - est - ext;
      return { q: q, rec: rec, est: est, gs: gs, ext: ext, luc: luc, mg: rec > 0 ? luc / rec * 100 : 0, tipo: tipoDe(q) };
    }).sort(function (a, b) { return String(b.q._statusDate || b.q.date || '').localeCompare(String(a.q._statusDate || a.q.date || '')); });
  }
  function cor(mg) { return mg >= 35 ? '#5dbf7a' : mg >= 20 ? '#e0c068' : mg >= 0 ? '#e0a050' : '#e05151'; }
  function abrir() {
    var meses = 3, ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,6,9,.97);color:#efe9dc;font-family:Outfit,sans-serif;overflow:auto;padding:16px';
    document.body.appendChild(ov);
    function desenhar() {
      var L = dados(meses), tot = L.reduce(function (s, x) { s.rec += x.rec; s.luc += x.luc; return s; }, { rec: 0, luc: 0 }), mgT = tot.rec ? tot.luc / tot.rec * 100 : 0, g = {};
      L.forEach(function (x) { var o = g[x.tipo] = g[x.tipo] || { n: 0, rec: 0, luc: 0 }; o.n++; o.rec += x.rec; o.luc += x.luc; });
      var tipos = Object.keys(g).map(function (k) { var o = g[k]; o.k = k; o.mg = o.rec ? o.luc / o.rec * 100 : 0; return o; }).sort(function (a, b) { return b.mg - a.mg; });
      var mx = Math.max.apply(null, tipos.map(function (t) { return Math.abs(t.mg); }).concat([1]));
      ov.innerHTML = '<div style="max-width:560px;margin:0 auto">' +
        '<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-family:Cormorant Garamond,serif;color:#ecd27c;font-size:1.7rem">📈 Lucro por obra</div><button id="lcX" style="background:rgba(255,255,255,.08);border:none;color:#efe9dc;border-radius:10px;padding:8px 12px;font-weight:700">Fechar</button></div>' +
        '<div style="color:#a99c80;font-size:.76rem;margin:4px 0 12px">Valor fechado − custo estimado no orçamento (pedra pelo custo + mão de obra) − gastos lançados nas finanças com o nome do cliente. Use <b>+ Gasto desta obra</b> para lançar frete, argamassa, cuba etc. ligados à obra.</div>' +
        '<div style="display:flex;gap:6px;margin-bottom:12px">' + [[1, '1 mês'], [3, '3 meses'], [6, '6 meses'], [12, '1 ano'], [0, 'Tudo']].map(function (p) { return '<button data-m="' + p[0] + '" class="lcM" style="flex:1;padding:8px 4px;border-radius:10px;border:1px solid ' + (p[0] === meses ? '#c9a84c' : 'rgba(255,255,255,.12)') + ';background:' + (p[0] === meses ? 'rgba(201,168,76,.18)' : 'rgba(255,255,255,.04)') + ';color:#efe9dc;font-weight:700;font-size:.78rem">' + p[1] + '</button>'; }).join('') + '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">' +
          [['Obras', String(L.length), '#efe9dc'], ['Faturado', 'R$ ' + fmv(tot.rec), '#efe9dc'], ['Lucro', 'R$ ' + fmv(tot.luc) + '<br><small style="font-size:.72rem">' + mgT.toFixed(0) + '% de margem</small>', cor(mgT)]].map(function (c) { return '<div style="background:#14141a;border:1px solid rgba(201,168,76,.18);border-radius:12px;padding:10px"><div style="font-size:.68rem;color:#a99c80;text-transform:uppercase;letter-spacing:.06em">' + c[0] + '</div><div style="font-weight:800;color:' + c[2] + ';font-size:.95rem;margin-top:3px">' + c[1] + '</div></div>'; }).join('') + '</div>' +
        (tipos.length ? '<div style="background:#14141a;border:1px solid rgba(201,168,76,.18);border-radius:12px;padding:12px;margin-bottom:14px"><b style="color:#ecd27c">Que serviço dá mais lucro</b>' + tipos.map(function (t) { return '<div style="margin-top:9px"><div style="display:flex;justify-content:space-between;font-size:.82rem"><span>' + esc(t.k) + ' <span style="color:#a99c80">· ' + t.n + ' obra' + (t.n > 1 ? 's' : '') + '</span></span><b style="color:' + cor(t.mg) + '">' + t.mg.toFixed(0) + '% · R$ ' + fmv(t.luc) + '</b></div><div style="height:7px;background:rgba(255,255,255,.06);border-radius:99px;margin-top:4px;overflow:hidden"><div style="height:100%;width:' + Math.max(3, Math.abs(t.mg) / mx * 100) + '%;background:' + cor(t.mg) + ';border-radius:99px"></div></div></div>'; }).join('') + '</div>' : '') +
        (L.length ? L.map(function (x, i) { var q = x.q; return '<div class="lcO" data-i="' + i + '" style="background:#14141a;border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:11px 12px;margin-bottom:8px">' +
          '<div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline"><div style="min-width:0"><b style="font-size:.9rem">' + esc(q.cli || 'Cliente') + '</b><div style="font-size:.72rem;color:#a99c80;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + esc(String(q.tipo || '').replace(/\+/g, ' + ')) + ' · ' + esc(q.mat || '') + '</div></div><div style="text-align:right;flex:none"><b style="color:' + cor(x.mg) + '">R$ ' + fmv(x.luc) + '</b><div style="font-size:.72rem;color:' + cor(x.mg) + '">' + x.mg.toFixed(0) + '%</div></div></div>' +
          '<div class="lcD" style="display:none;margin-top:9px;font-size:.8rem;line-height:1.7;border-top:1px dashed rgba(255,255,255,.1);padding-top:8px">' +
            '<div style="display:flex;justify-content:space-between"><span>Valor fechado</span><b>R$ ' + fmv(x.rec) + '</b></div>' +
            '<div style="display:flex;justify-content:space-between"><span>Custo estimado (pedra + mão de obra)</span><b>− R$ ' + fmv(x.est) + '</b></div>' +
            x.gs.map(function (t) { return '<div style="display:flex;justify-content:space-between;color:#d8b88a"><span>' + esc(String(t.desc || 'Gasto').slice(0, 42)) + ' <small style="color:#a99c80">' + esc(String(t.date || '').split('-').reverse().join('/')) + '</small></span><b>− R$ ' + fmv(t.value) + '</b></div>'; }).join('') +
            '<div style="display:flex;justify-content:space-between;border-top:1px solid rgba(255,255,255,.1);margin-top:4px;padding-top:4px"><span>Lucro</span><b style="color:' + cor(x.mg) + '">R$ ' + fmv(x.luc) + '</b></div>' +
            '<button class="lcG" data-i="' + i + '" style="margin-top:8px;width:100%;padding:9px;border:none;border-radius:9px;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:800">+ Gasto desta obra</button></div></div>'; }).join('')
        : '<div style="text-align:center;color:#a99c80;padding:30px 0">Nenhuma obra fechada neste período.</div>') + '</div>';
      ov.querySelector('#lcX').onclick = function () { ov.remove(); };
      [].forEach.call(ov.querySelectorAll('.lcM'), function (b) { b.onclick = function () { meses = +b.getAttribute('data-m'); desenhar(); }; });
      [].forEach.call(ov.querySelectorAll('.lcO'), function (c) { c.onclick = function (ev) { if (ev.target.classList.contains('lcG')) return; var d = c.querySelector('.lcD'); d.style.display = d.style.display === 'none' ? 'block' : 'none'; }; });
      [].forEach.call(ov.querySelectorAll('.lcG'), function (b) { b.onclick = function () {
        var x = L[+b.getAttribute('data-i')]; if (!x) return;
        var desc = prompt('Gasto da obra de ' + (x.q.cli || 'cliente') + '\nO que foi? (ex.: frete, argamassa, cuba)'); if (!desc) return;
        var v = parseFloat(String(prompt('Valor em R$:') || '').replace(/\./g, '').replace(',', '.')); if (!(v > 0)) return;
        DB.t.unshift({ id: Date.now(), type: 'out', desc: 'Obra ' + (x.q.cli || '') + ': ' + desc.trim(), value: Math.round(v * 100) / 100, date: hoje(), qId: x.q.id });
        try { DB.sv(); } catch (e) {} try { if (typeof toast === 'function') toast('Gasto lançado nas finanças e ligado à obra'); } catch (e) {}
        desenhar();
      }; });
    }
    desenhar();
  }
  window.abrirLucroObra = abrir;
  function cartao() {
    var cb = document.getElementById('cfgBody'); if (!cb || cb.querySelector('.lc-card')) return;
    var d = document.createElement('div'); d.className = 'vz-card lc-card';
    d.innerHTML = '<span style="font-size:1.5rem">📈</span><span><b>Lucro por obra</b><small>Quanto sobrou em cada obra e que serviço dá mais lucro</small></span>';
    d.onclick = abrir; var v = cb.querySelector('.gs-card') || cb.querySelector('.vz-card'); cb.insertBefore(d, v ? v.nextSibling : cb.firstChild);
  }
  setInterval(cartao, 1000);
})();
