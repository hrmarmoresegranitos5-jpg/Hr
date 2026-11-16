// app-cliente-bot.js — v1: na ficha do cliente (app-cliente-ficha.js), a seção "🤖 No WhatsApp com o bot":
//  • última conversa com o bot (abre e fecha), se o cliente está quente, retomada enviada/respondida,
//    código de indicação e quantos amigos chegaram/fecharam, se veio indicado e se o atendimento está com o dono;
//  • botões: 🤖 Retomar com IA (prévia no WhatsApp do dono), 🎁 Convite de indicação, 🙋 Assumir / Devolver ao bot.
// Lê GET /bot/cliente?tel=… e age por POST /bot/vendas/acao. Não mexe no app-cliente-ficha.js: entra depois que a ficha é desenhada.
(function () {
  if (window.__hrCliBot) return; window.__hrCliBot = true;
  var CACHE = {}, ABERTO = {};
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function api(path, opts) { var b = base(); if (!b) return Promise.reject(new Error('Bot não configurado')); opts = opts || {}; opts.headers = _botHeaders(); return fetch(b + path, opts).then(function (r) { return r.json(); }); }
  function dig(s) { var d = String(s || '').replace(/\D/g, ''); if (d.length === 10 || d.length === 11) d = '55' + d; return /^55\d{10,11}$/.test(d) ? d : ''; }
  function quando(ms) { if (!ms) return ''; var m = Math.round((Date.now() - ms) / 60000); if (m < 60) return 'há ' + Math.max(1, m) + ' min'; var h = Math.round(m / 60); if (h < 24) return 'há ' + h + ' h'; var d = Math.round(h / 24); return d === 1 ? 'ontem' : 'há ' + d + ' dias'; }
  function aviso(t) { try { if (typeof toast === 'function') return toast(t); } catch (e) {} alert(t); }
  var ST_RT = { enviado: 'enviada, sem resposta ainda', respondeu: 'respondeu', sim: 'respondeu com interesse', nao: 'disse que não tem interesse', encerrado: 'encerrada' };

  function html(num, nome, d) {
    var L = [];
    if (d.quente) L.push('<div class="hc-cb-tag" style="color:#5dbf7a;">🔥 Cliente quente ' + quando(d.quente.em) + ': "' + esc(d.quente.t) + '"</div>');
    if (d.indicadoPor) L.push('<div class="hc-cb-l">🎁 Chegou por indicação de <b>' + esc(d.indicadoPor) + '</b></div>');
    if (d.ultimaMsg) L.push('<div class="hc-cb-l">💬 Última mensagem com o bot: ' + quando(d.ultimaMsg) + '</div>');
    if (d.retomada) L.push('<div class="hc-cb-l">🤖 Retomada ' + quando(d.retomada.em) + ': ' + esc(ST_RT[d.retomada.status] || d.retomada.status) + (d.retomada.motivo ? ' ("' + esc(d.retomada.motivo) + '")' : '') + '</div>');
    if (d.indicacao) L.push('<div class="hc-cb-l">🎟️ Código de indicação <b>' + esc(d.indicacao.cod) + '</b>: ' + d.indicacao.chegaram + ' chegaram, ' + d.indicacao.fecharam + ' fecharam</div>');
    if (d.assumido) L.push('<div class="hc-cb-l" style="color:#f0b45a;">🙋 O senhor está atendendo (o bot não responde esse cliente)</div>');
    if (!L.length) L.push('<div class="hc-cb-l" style="opacity:.7;">O bot ainda não conversou com esse número.</div>');
    var conv = '';
    if ((d.conversa || []).length) {
      conv = '<div class="hc-cb-conv-t" data-cb-conv="' + num + '">' + (ABERTO[num] ? '▾ Esconder conversa' : '▸ Ver conversa com o bot (' + d.conversa.length + ')') + '</div>';
      if (ABERTO[num]) conv += '<div class="hc-cb-conv">' + d.conversa.map(function (f) { return '<div class="hc-cb-m ' + (f.q === 'c' ? 'c' : 'b') + '"><span>' + esc(f.x) + '</span><small>' + new Date(f.t).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) + '</small></div>'; }).join('') + '</div>';
    }
    var bt = '<div class="hc-cb-bts"><button class="hc-btn gold" data-cb-acao="retomar">🤖 Retomar com IA</button>'
      + '<button class="hc-btn" data-cb-acao="convite_ind">🎁 Convite de indicação</button>'
      + '<button class="hc-btn" data-cb-acao="' + (d.assumido ? 'devolver' : 'assumir') + '">' + (d.assumido ? '↩︎ Devolver ao bot' : '🙋 Assumir conversa') + '</button></div>';
    return '<div class="hc-sec" id="hcBotSec" data-num="' + num + '" data-nome="' + esc(nome) + '"><div class="hc-sec-t">🤖 No WhatsApp com o bot</div><div class="hc-cb">' + L.join('') + conv + bt + '<div class="hc-cb-obs">As ações chegam no seu WhatsApp para o senhor aprovar.</div></div></div>';
  }
  function css() {
    if (document.getElementById('hcCbCss')) return;
    var s = document.createElement('style'); s.id = 'hcCbCss';
    s.textContent = '.hc-cb{background:var(--s2,rgba(255,255,255,.04));border:1px solid var(--bd,rgba(255,255,255,.08));border-radius:12px;padding:10px 12px;font-size:.8rem;line-height:1.5}'
      + '.hc-cb-l,.hc-cb-tag{margin:3px 0}.hc-cb-tag{font-weight:700}.hc-cb-conv-t{margin-top:8px;color:var(--gold2,#c9a84c);font-weight:700;cursor:pointer}'
      + '.hc-cb-conv{margin-top:6px;max-height:340px;overflow:auto;display:flex;flex-direction:column;gap:5px}.hc-cb-m{max-width:85%;padding:6px 9px;border-radius:10px;font-size:.76rem;white-space:pre-wrap}'
      + '.hc-cb-m small{display:block;opacity:.55;font-size:.62rem;margin-top:2px}.hc-cb-m.c{background:rgba(255,255,255,.07);align-self:flex-start}.hc-cb-m.b{background:rgba(201,168,76,.16);align-self:flex-end}'
      + '.hc-cb-bts{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.hc-cb-bts .hc-btn{flex:1 1 auto;font-size:.74rem}.hc-cb-obs{font-size:.66rem;opacity:.6;margin-top:6px}';
    document.head.appendChild(s);
  }
  function encaixar() {
    var wrap = document.querySelector('#pg40 .hc-wrap'); if (!wrap || !base()) return;
    var sub = wrap.querySelector('.hc-sub'), tiles = wrap.querySelector('.hc-tiles'); if (!tiles) return;
    var a = wrap.querySelector('.hc-acoes a.hc-btn.wa'); var num = a ? dig((a.getAttribute('href') || '').replace(/^.*wa\.me\//, '').split('?')[0]) : '';
    if (!num && sub) num = dig(sub.textContent);
    var nome = (wrap.querySelector('.hc-h1') || {}).textContent || '';
    if (!num) return;
    var atual = document.getElementById('hcBotSec');
    if (atual && atual.getAttribute('data-num') === num && !atual.__velho) return;
    css();
    var put = function (d) { var x = document.getElementById('hcBotSec'); var h = html(num, nome, d); if (x) x.outerHTML = h; else tiles.insertAdjacentHTML('afterend', h); };
    if (CACHE[num]) put(CACHE[num].d);
    if (!CACHE[num] || Date.now() - CACHE[num].em > 60000) api('/bot/cliente?tel=' + num).then(function (d) { if (d && d.ok) { CACHE[num] = { d: d, em: Date.now() }; var w2 = document.querySelector('#pg40 .hc-wrap'); if (w2 && w2.contains(tiles)) put(d); } }).catch(function () {});
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target; if (!t.closest) return;
    var cv = t.closest('[data-cb-conv]'); if (cv) { ev.stopPropagation(); var n = cv.getAttribute('data-cb-conv'); ABERTO[n] = !ABERTO[n]; if (CACHE[n]) { var x = document.getElementById('hcBotSec'); if (x) x.outerHTML = html(n, x.getAttribute('data-nome'), CACHE[n].d); } return; }
    var b = t.closest('[data-cb-acao]'); if (!b) return; ev.stopPropagation(); ev.preventDefault();
    var sec = document.getElementById('hcBotSec'); if (!sec) return;
    var num = sec.getAttribute('data-num'), nome = sec.getAttribute('data-nome'), ac = b.getAttribute('data-cb-acao');
    var pergunta = { retomar: 'O bot vai ler a conversa e o orçamento de ' + nome + ' e mandar a PRÉVIA da mensagem no seu WhatsApp. Continuar?', convite_ind: 'Mandar para ' + nome + ' o convite de indicação com o código dele?', assumir: 'Assumir a conversa de ' + nome + '? O bot para de responder esse cliente até o senhor devolver.', devolver: 'Devolver ' + nome + ' para o bot atender?' }[ac];
    if (pergunta && !confirm(pergunta)) return;
    var txt = b.textContent; b.disabled = true; b.textContent = '…';
    api('/bot/vendas/acao', { method: 'POST', body: JSON.stringify({ acao: ac, num: num, nome: nome }) }).then(function (j) {
      if (j && j.ok) { b.textContent = '✓ Feito'; aviso(ac === 'retomar' ? '🤖 A prévia chegou no seu WhatsApp.' : ac === 'convite_ind' ? '🎁 Convite enviado' + (j.cod ? ' (código ' + j.cod + ')' : '') + '.' : '✓ Pronto.'); delete CACHE[num]; setTimeout(function () { var x = document.getElementById('hcBotSec'); if (x) x.__velho = true; encaixar(); }, 1500); }
      else { b.disabled = false; b.textContent = txt; aviso('⚠️ ' + ((j && (j.erro || j.error)) || 'Não deu agora.')); }
    }).catch(function (e) { b.disabled = false; b.textContent = txt; aviso('⚠️ ' + e.message); });
  }, true);
  var pg = null;
  function observar() {
    pg = document.getElementById('pg40'); if (!pg) { setTimeout(observar, 1500); return; }
    new MutationObserver(function () { clearTimeout(observar.t); observar.t = setTimeout(encaixar, 120); }).observe(pg, { childList: true, subtree: false });
    encaixar();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', observar); else observar();
})();
