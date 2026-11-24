/* ═══════════════════════════════════════════════════════════════════
   app-impressao.js — Impressão automática na térmica do PC  v1
   HR Mármores e Granitos

   • Qualquer aparelho (celular ou PC) que lança um recebimento de cliente
     manda o recibo para a fila do bot.
   • O bot também põe na fila: ficha de produção, tarefas do dia (7h),
     orçamento aprovado e recibo de Pix confirmado.
   • O PC com "Impressão automática" ligada busca a fila a cada 30 s e
     imprime direto na térmica (modo USB / Porta serial / Bluetooth do
     app-termica.js). Só imprime o que chegou nas últimas 24 h.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var KEY = 'hr_imp_auto', LOG = 'hr_imp_log', INTERVALO = 30000;
  var TIPOS = [['recibo', 'Recibos'], ['ficha', 'Fichas de produção'], ['tarefas', 'Tarefas do dia'], ['orcamento', 'Orçamentos aprovados']];
  var cfgSrv = null, ocupado = false, erro = '', timer = null;

  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function ligado() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function termOk() { return !!(window.HR_TERMICA && HR_TERMICA.modoDireto && HR_TERMICA.modoDireto()); }
  function log() { try { return JSON.parse(localStorage.getItem(LOG) || '[]'); } catch (e) { return []; } }
  function addLog(j, ok) { var l = log(); l.unshift({ t: j.titulo || j.tipo, s: j.sub || '', em: Date.now(), ok: ok }); try { localStorage.setItem(LOG, JSON.stringify(l.slice(0, 12))); } catch (e) {} }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function redesenha() { try { var c = document.getElementById('impCard'); if (c) c.outerHTML = cardHtml(); } catch (e) {} }
  function prim(t) { return ((String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').match(/[a-z]{3,}/)) || [''])[0]; }
  function hoje() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }

  // ── 1) recibo de todo recebimento de cliente vai para a fila (de qualquer aparelho) ──
  function enviarRecibo(trId) {
    var b = base(); if (!b || typeof gerarComprovante !== 'function') return;
    var d = null; try { d = gerarComprovante(trId, '58', 'fila'); } catch (e) {}
    if (!d || !(+d.valor > 0)) return;
    d = JSON.parse(JSON.stringify(d)); delete d.logo; // o PC usa a própria logo (não manda imagem pela fila)
    fetch(b + '/bot/imprimir', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()),
      body: JSON.stringify({ tipo: 'recibo', ref: 'rec:' + prim(d.cli) + '|' + Math.round(+d.valor * 100) + '|' + hoje(), titulo: 'RECIBO', sub: d.cli || '', dados: d }) }).catch(function () {});
  }
  if (typeof window.addTr === 'function') {
    var _addTr = window.addTr;
    window.addTr = function (type, desc, value, date, jId) {
      var tr = _addTr.apply(this, arguments);
      try { if (type === 'in' && jId && tr && tr.id) setTimeout(function () { enviarRecibo(tr.id); }, 1200); } catch (e) {}
      return tr;
    };
  }

  // ── 2) o PC imprime a fila ──
  async function ciclo() {
    if (!ligado() || ocupado) return;
    var b = base(); if (!b) { erro = 'Bot não configurado neste computador.'; return; }
    if (!termOk()) { erro = 'Escolha a impressora (USB, Porta serial ou Bluetooth).'; redesenha(); return; }
    ocupado = true;
    try {
      var r = await fetch(b + '/bot/imprimir/fila', { headers: hdr() }); var j = await r.json();
      cfgSrv = j.cfg || cfgSrv;
      var feitos = [];
      for (var i = 0; i < (j.fila || []).length; i++) {
        var job = j.fila[i];
        try {
          if (job.tipo === 'recibo' && job.dados) {
            var d = job.dados; try { if (CFG && CFG.emp && CFG.emp.logoUrl) d.logo = CFG.emp.logoUrl; } catch (e) {}
            await new Promise(function (ok, no) { var falhou = false; HR_TERMICA.imprimirRecibo(d, HR_TERMICA.cfg().larg, function () { falhou = true; no(new Error('a impressora não respondeu')); }).then(function () { setTimeout(function () { if (!falhou) ok(); }, 1800); }); });
          } else await HR_TERMICA.imprimirTexto(job);
          feitos.push(job.id); addLog(job, true); erro = '';
        } catch (e) { erro = 'Não consegui imprimir: ' + ((e && e.message) || e) + '. Confira se a impressora está ligada.'; addLog(job, false); break; }
      }
      if (feitos.length) await fetch(b + '/bot/imprimir/ok', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify({ ids: feitos }) });
    } catch (e) { erro = 'Sem conexão com o bot.'; }
    ocupado = false; redesenha();
  }
  function iniciar() { if (timer) clearInterval(timer); timer = null; if (ligado()) { timer = setInterval(ciclo, INTERVALO); setTimeout(ciclo, 3000); } }

  // ── 3) cartão na Central HR ──
  function cardHtml() {
    var on = ligado(), t = window.HR_TERMICA ? HR_TERMICA.cfg() : {}, c = cfgSrv || { recibo: true, ficha: true, tarefas: true, orcamento: true };
    var st = !on ? 'Desligada neste computador.' : !termOk() ? '⚠️ Falta escolher a impressora.' : erro ? '⚠️ ' + erro : '🟢 Ligada · ' + (t.nome || ({ serial: 'Porta serial', usb: 'USB', bt: 'Bluetooth', rawbt: 'RawBT' })[t.modo] || t.modo) + ' · imprime sozinha o que chegar.';
    var l = log().slice(0, 5);
    return '<div class="pp-c s4" id="impCard"><h3>Impressora térmica<a data-imp="cfg">Configurar →</a></h3>' +
      '<div style="font-size:.82rem;color:#c8bb9c;margin-bottom:8px;">' + esc(st) + '</div>' +
      '<div class="pp-btns" style="margin-bottom:8px;">' + TIPOS.map(function (x) { return '<button data-imp="t:' + x[0] + '" style="' + (c[x[0]] === false ? 'opacity:.45;text-decoration:line-through;' : '') + '">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<div class="pp-btns"><button data-imp="liga">' + (on ? '⏸ Desligar automático' : '▶ Ligar impressão automática') + '</button><button data-imp="teste">🧪 Teste</button></div>' +
      (l.length ? '<div style="margin-top:8px;font-size:.74rem;color:#9a8f78;">' + l.map(function (x) { return (x.ok ? '✓ ' : '✕ ') + esc(x.t) + (x.s ? ' · ' + esc(x.s) : '') + ' <small>' + new Date(x.em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) + '</small>'; }).join('<br>') + '</div>' : '') +
      '</div>';
  }
  function clique(a) {
    var v = a.getAttribute('data-imp');
    if (v === 'cfg') { if (window.HR_TERMICA) HR_TERMICA.configurar(); return; }
    if (v === 'teste') { if (window.HR_TERMICA) HR_TERMICA.imprimirTexto({ titulo: 'TESTE', sub: 'Impressão automática', linhas: ['Se saiu este papel,', 'a impressora está pronta.', '---', 'Acentos|ã õ ç é'] }).then(function () { erro = ''; redesenha(); }).catch(function (e) { erro = (e && e.message) || 'falhou'; redesenha(); }); return; }
    if (v === 'liga') {
      var on = !ligado(); try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (e) {}
      if (on && !termOk() && window.HR_TERMICA) { if (typeof toast === 'function') toast('Escolha "Porta serial" ou "USB direto" e pareie a impressora'); HR_TERMICA.configurar(); }
      iniciar(); redesenha(); return;
    }
    if (v.indexOf('t:') === 0) {
      var k = v.slice(2), c = cfgSrv || { recibo: true, ficha: true, tarefas: true, orcamento: true }, body = {}; body[k] = c[k] === false;
      var b = base(); if (!b) return;
      fetch(b + '/bot/imprimir/cfg', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr()), body: JSON.stringify(body) }).then(function (r) { return r.json(); }).then(function (j) { if (j && j.cfg) { cfgSrv = j.cfg; redesenha(); } }).catch(function () {});
    }
  }

  window.HR_IMP = { cardHtml: cardHtml, clique: clique, ciclo: ciclo, enviarRecibo: enviarRecibo };
  iniciar();
})();
