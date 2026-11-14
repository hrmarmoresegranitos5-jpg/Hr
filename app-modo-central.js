// ═══════════════════════════════════════════════════════════════════════════
// app-modo-central.js — MODO CENTRAL (computador sempre ligado)
//   Abra o app no computador com  ?central=1  no endereço (o atalho "abrir-central-hr.bat" já faz isso).
//   • O app continua trabalhando para o bot mesmo minimizado ou atrás de outras janelas
//     (pedidos de orçamento → PDF, conferência do extrato, cadastros de clientes, comandos).
//   • Mostra uma faixa no topo com a situação: bot configurado, sincronização com o celular e último contato.
//   • Recarrega sozinho de madrugada (pega as versões novas do app).
//   Para desligar: abra com ?central=0 ou toque em "Desligar" na faixa.
// ═══════════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  try {
    var q = new URLSearchParams(location.search);
    if (q.get('central') === '1') localStorage.setItem('hr_central', '1');
    if (q.get('central') === '0') localStorage.removeItem('hr_central');
  } catch (e) {}
  var ligado = false; try { ligado = localStorage.getItem('hr_central') === '1'; } catch (e) {}
  window.HR_CENTRAL = ligado;
  if (!ligado) return;

  // 1) "Sempre visível": os módulos que conversam com o bot param quando a janela some (document.hidden).
  //    No modo central eles continuam (o Chrome ainda reduz a frequência em segundo plano, mas não para).
  try {
    Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: function () { return false; } });
    Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: function () { return 'visible'; } });
  } catch (e) { console.warn('[central] visibilidade:', e); }

  // 2) Tela/computador acordados enquanto a janela está à frente (o Windows também precisa estar sem suspensão).
  var trava = null;
  function pedirTrava() { try { if (navigator.wakeLock && !trava) navigator.wakeLock.request('screen').then(function (t) { trava = t; t.addEventListener('release', function () { trava = null; }); }).catch(function () {}); } catch (e) {} }
  setInterval(pedirTrava, 60000); setTimeout(pedirTrava, 3000);

  // 3) Faixa de situação
  function el(tag, css, html) { var e = document.createElement(tag); e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }
  var faixa = el('div', 'position:fixed;left:8px;right:8px;bottom:8px;z-index:99998;background:rgba(14,12,9,.94);border:1px solid rgba(201,168,76,.45);border-radius:12px;padding:7px 10px;font:600 12px system-ui,sans-serif;color:#e8dcc0;display:flex;gap:10px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.5)');
  var txt = el('div', 'flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis', '🖥️ Central ligada');
  var btMin = el('button', 'background:none;border:1px solid rgba(255,255,255,.18);color:#bbb;border-radius:8px;padding:3px 8px;cursor:pointer;font-size:11px', '—');
  var btOff = el('button', 'background:none;border:1px solid rgba(224,112,112,.4);color:#ec8585;border-radius:8px;padding:3px 8px;cursor:pointer;font-size:11px', 'Desligar');
  btMin.onclick = function () { faixa.style.display = 'none'; setTimeout(function () { faixa.style.display = 'flex'; }, 10 * 60000); };
  btOff.onclick = function () { if (confirm('Desligar o modo central neste computador?')) { localStorage.removeItem('hr_central'); location.href = location.pathname; } };
  faixa.appendChild(txt); faixa.appendChild(btMin); faixa.appendChild(btOff);
  var ultimoOk = 0;
  var _fetch = window.fetch;
  window.fetch = function (u) { var p = _fetch.apply(this, arguments); try { if (String(u).indexOf('/bot/') >= 0) p.then(function (r) { if (r && r.ok) ultimoOk = Date.now(); }).catch(function () {}); } catch (e) {} return p; };
  function situacao() {
    var cfg = {}; try { cfg = (typeof _getBotCfg === 'function') ? _getBotCfg() : JSON.parse(localStorage.getItem('hr_bot_cfg') || '{}'); } catch (e) {}
    var partes = ['🖥️ <b>Central ligada</b>'];
    if (!cfg.url) partes.push('<span style="color:#ec8585">⚠️ Bot não configurado (Config → Secretária)</span>');
    else partes.push(ultimoOk ? (Date.now() - ultimoOk < 3 * 60000 ? '<span style="color:#6fd29b">● bot conectado</span>' : '<span style="color:#e9b35a">● bot sem resposta há ' + Math.round((Date.now() - ultimoOk) / 60000) + ' min</span>') : '● conectando ao bot…');
    var sync = (typeof SYNC !== 'undefined' && SYNC && SYNC.code && SYNC.user);
    partes.push(sync ? '<span style="color:#6fd29b">● sincronizado com o celular</span>' : '<span style="color:#e9b35a">⚠️ sincronização desligada (Config → Sincronização)</span>');
    txt.innerHTML = partes.join(' &nbsp;·&nbsp; ');
  }
  function montar() { if (!document.body) return setTimeout(montar, 300); document.body.appendChild(faixa); situacao(); setInterval(situacao, 15000); }
  montar();

  // 4) Recarrega de madrugada (3h) para pegar a versão nova, se não houver PDF em andamento
  setInterval(function () {
    var d = new Date();
    if (d.getHours() === 3 && d.getMinutes() < 10 && !window._botPdfHook && Date.now() - (window._centralCarregado || 0) > 3600000) location.reload();
  }, 5 * 60000);
  window._centralCarregado = Date.now();
  document.title = '🖥️ ' + document.title;
})();
