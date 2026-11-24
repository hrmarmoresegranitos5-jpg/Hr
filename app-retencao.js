// app-retencao.js — v2: 🧱 Pedra de retenção é uma opção de acabamento dentro do ambiente Soleira (sem botão flutuante)
// v1: Pedra de retenção nas soleiras (tela de Orçamento)
// Quando o orçamento tem Soleira, aparece o botão "+ Pedra de retenção": para cada soleira entra uma peça
// "Pedra de retenção" com o MESMO comprimento e a largura configurada (⚙). O app calcula o preço como as outras peças
// e o bot reconhece a peça na produção (corte e acabamento contam). A largura fica salva no app e no bot.
(function () {
  'use strict';
  if (window.__hrRet) return; window.__hrRet = true;
  var KEY = 'hr_retencao_larg';
  function larg() { var v = parseFloat(localStorage.getItem(KEY)); return v > 0 ? v : 4; }
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { var h = {}; try { h = _botHeaders() || {}; } catch (e) {} h['Content-Type'] = 'application/json'; return h; }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }
  function ambs() { try { return Array.isArray(ambientes) ? ambientes : []; } catch (e) { return []; } }
  function ehSoleira(a) { return /soleira/i.test(String(a && a.tipo || '')); }
  function ehRet(p) { return /reten/i.test(String(p && p.desc || '')); }
  function temRet() { return ambs().some(function (a) { return ehSoleira(a) && (a.pecas || []).some(ehRet); }); }
  function refazer() {
    try { renderAmbientes(); } catch (e) {}
    var res = document.getElementById('resArea');
    if (res && res.style.display !== 'none') { try { calcular(); } catch (e) {} }
  }
  function alternar() {
    var l = larg(), n = 0;
    if (temRet()) { ambs().forEach(function (a) { if (ehSoleira(a)) a.pecas = (a.pecas || []).filter(function (p) { return !ehRet(p); }); }); refazer(); aviso('Pedra de retenção retirada'); return; }
    ambs().forEach(function (a) {
      if (!ehSoleira(a)) return; var t = Date.now();
      (a.pecas || []).slice().forEach(function (p, i) { if (ehRet(p) || !(+p.w > 0)) return; a.pecas.push({ id: t + 500 + i, desc: 'Pedra de retenção', w: +p.w, h: l, q: +p.q || 1 }); n++; });
    });
    refazer(); aviso(n ? '🧱 ' + n + ' pedra(s) de retenção de ' + String(l).replace('.', ',') + ' cm adicionadas' : 'Nenhuma soleira com medida para receber a retenção');
  }
  function configurar() {
    var v = prompt('Largura da pedra de retenção (cm). O comprimento é o da soleira.', String(larg()).replace('.', ','));
    if (v == null) return; var n = parseFloat(String(v).replace(',', '.')); if (!(n > 0 && n < 30)) { aviso('Largura inválida'); return; }
    localStorage.setItem(KEY, String(n));
    if (base()) fetch(base() + '/bot/retencao', { method: 'POST', headers: hdr(), body: JSON.stringify({ larg: n }) }).catch(function () {});
    aviso('Retenção: ' + String(n).replace('.', ',') + ' cm'); ambs().forEach(function (a) { if (ehSoleira(a) && temRetAmb(a)) a.pecas.forEach(function (p) { if (ehRet(p)) p.h = n; }); }); refazer(); setTimeout(atualizar, 50);
  }
  // v2: virou um tipo de acabamento dentro do ambiente Soleira (sem botão flutuante)
  function ambPorId(id) { return ambs().filter(function (a) { return String(a.id) === String(id); })[0]; }
  function temRetAmb(a) { return (a.pecas || []).some(ehRet); }
  function alternarAmb(a) {
    if (temRetAmb(a)) { a.pecas = (a.pecas || []).filter(function (p) { return !ehRet(p); }); refazer(); aviso('Pedra de retenção retirada'); return; }
    var l = larg(), t = Date.now(), n = 0;
    (a.pecas || []).slice().forEach(function (p, i) { if (ehRet(p) || !(+p.w > 0)) return; a.pecas.push({ id: t + 500 + i, desc: 'Pedra de retenção', w: +p.w, h: l, q: +p.q || 1 }); n++; });
    refazer(); aviso(n ? '🧱 ' + n + ' pedra(s) de retenção de ' + String(l).replace('.', ',') + ' cm' : 'Coloque a medida da soleira primeiro');
  }
  function bloco(a) {
    var on = temRetAmb(a), l = String(larg()).replace('.', ',');
    return '<div class="hr-ret" data-ret-amb="' + a.id + '" style="padding:0 12px 10px">'
      + '<div style="font-size:.52rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold,#c9a84c);font-weight:600;margin:2px 0 6px">Pedra de retenção</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
      + [[false, 'Sem retenção', 'sem custo'], [true, '🧱 Com retenção', l + ' cm × comprimento da soleira']].map(function (o) { var at = on === o[0]; return '<div data-ret="' + (o[0] ? 'sim' : 'nao') + '" style="cursor:pointer;text-align:center;padding:9px 8px;border-radius:10px;border:1.5px solid ' + (at ? 'var(--gold,#c9a84c)' : 'var(--bd2,rgba(255,255,255,.12))') + ';background:' + (at ? 'rgba(201,168,76,.12)' : 'var(--s2,#16130e)') + '"><div style="font-size:.78rem;font-weight:' + (at ? 700 : 500) + ';color:' + (at ? 'var(--gold,#c9a84c)' : 'var(--t2,#c9bfa6)') + '">' + o[1] + '</div><div style="font-size:.6rem;color:var(--t4,#9a917e);margin-top:2px">' + o[2] + '</div></div>'; }).join('')
      + '</div><div data-ret="cfg" style="font-size:.62rem;color:var(--t4,#9a917e);margin-top:6px;cursor:pointer;text-decoration:underline">Mudar a largura da retenção (' + l + ' cm)</div></div>';
  }
  function atualizar() {
    var box0 = document.getElementById('hrRetBox'); if (box0) box0.remove(); // botão flutuante antigo
    document.querySelectorAll('[data-rm-amb]').forEach(function (rm) {
      var a = ambPorId(rm.getAttribute('data-rm-amb')), card = rm.closest('.ambiente') || rm.parentNode && rm.parentNode.parentNode; if (!card) return;
      var velho = card.querySelector('.hr-ret');
      if (!a || !ehSoleira(a)) { if (velho) velho.remove(); return; }
      var html = bloco(a); if (velho && velho.outerHTML === html) return;
      var tmp = document.createElement('div'); tmp.innerHTML = html; var novo = tmp.firstChild;
      if (velho) { velho.replaceWith(novo); return; }
      var acb = Array.prototype.filter.call(card.querySelectorAll('.svhd'), function (x) { return /acabamento/i.test(x.textContent); })[0], blk = acb && acb.closest('.svblk');
      if (blk) blk.appendChild(novo); else (card.querySelector('.amb-body') || card).appendChild(novo);
    });
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-ret]'); if (!b) return; var w = b.closest('[data-ret-amb]'), a = w && ambPorId(w.getAttribute('data-ret-amb')); if (!a) return;
    var o = b.getAttribute('data-ret');
    if (o === 'cfg') { configurar(); return; }
    if ((o === 'sim') !== temRetAmb(a)) alternarAmb(a);
    setTimeout(atualizar, 50);
  });
  // a largura do bot vale também aqui (se foi mudada pelo WhatsApp)
  function sincronizar() { if (!base()) return; fetch(base() + '/bot/retencao', { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) { if (j && +j.larg > 0) localStorage.setItem(KEY, String(j.larg)); }).catch(function () {}); }
  setTimeout(sincronizar, 4000);
  setInterval(function () { try { atualizar(); } catch (e) {} }, 800);
})();
