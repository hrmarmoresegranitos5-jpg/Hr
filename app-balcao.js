/* ═══════════════════════════════════════════════════════════════════
   app-balcao.js — Modo balcão (tablet de atendimento)  v1
   HR Mármores e Granitos

   O tablet do balcão abre o app com ?balcao=1 (fica guardado).
   Mostra só: 💰 Orçamento · 📋 Histórico · 👥 Clientes · 📺 TV.
   • O orçamento feito no tablet vai sozinho para a TV (Tela do cliente ligada).
   • Aba TV: o controle da TV (modelos, pedras, fotos e vídeos, Pix) com o
     espelho do que está passando na TV agora e se a TV está no ar.
   • Esconde o que é só do dono (imposto, sobra, finanças, RH, configurações).
   • Para sair: aba TV → "Sair do modo balcão" (pede a senha de proprietário).
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var LS = 'hr_balcao', PG = 78, PERMIT = [0, 7, 40, 78, 2, 8, 9, 20]; // 2/8/9/20: telas de apoio do orçamento (cubas, acabamentos, túmulos, capelas)
  try {
    var q = new URLSearchParams(location.search).get('balcao');
    if (q === '1') localStorage.setItem(LS, '1'); else if (q === '0') localStorage.removeItem(LS);
  } catch (e) {}
  function ativo() { try { return localStorage.getItem(LS) === '1'; } catch (e) { return false; } }
  if (!ativo()) return;

  document.documentElement.classList.add('balcao');
  var st = document.createElement('style');
  st.textContent = [
    'html.balcao #nav .ni{display:none!important}',
    'html.balcao #nav .ni-sep{display:none!important}',
    'html.balcao #nav .ni[data-pg="0"],html.balcao #nav .ni[data-pg="7"],html.balcao #nav .ni[data-pg="78"]{display:flex!important}',
    'html.balcao .so-dono{display:none!important}',
    'html.balcao body:has(#pg78.on) #fabPlus{display:none!important}',
    'html.balcao #pg78{padding:0!important;margin:0!important;overflow:hidden!important;position:relative}',
    'html.balcao #pg78:not(.on){display:none!important}',
    '#pg78 .bl-wrap{position:relative;height:calc(100dvh - 150px);min-height:420px;display:flex;flex-direction:column;background:#0b0a08}',
    '#pg78 iframe{flex:1;width:100%;border:0;background:#0b0a08}',
    '#pg78 .bl-bar{display:flex;gap:8px;align-items:center;justify-content:flex-end;padding:6px 10px;font-size:.72rem;color:#9a8f78;border-top:1px solid rgba(201,168,76,.15)}',
    '#pg78 .bl-bar button{background:none;border:1px solid rgba(201,168,76,.3);color:#c8bb9c;border-radius:8px;padding:5px 10px;font:inherit}',
    '#pg78 .bl-msg{margin:auto;max-width:420px;text-align:center;color:#c8bb9c;padding:30px;line-height:1.5}'
  ].join('\n');
  document.head.appendChild(st);

  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }

  function montar() {
    var nav = document.getElementById('nav'), pages = document.getElementById('pages');
    if (!nav || !pages) return false;
    if (!nav.querySelector('[data-pg="78"]')) {
      var ni = document.createElement('div'); ni.className = 'ni'; ni.setAttribute('data-pg', String(PG));
      ni.innerHTML = '<span class="ni-i">📺</span><span class="ni-l">TV</span>';
      ni.addEventListener('click', function (e) { e.stopPropagation(); go(PG); });
      nav.appendChild(ni);
    }
    if (!document.getElementById('pg78')) { var pg = document.createElement('div'); pg.className = 'pg'; pg.id = 'pg78'; pages.appendChild(pg); }
    return true;
  }
  var linkTv = '';
  function abrirTv() {
    var el = document.getElementById('pg78'); if (!el) return;
    if (el.querySelector('iframe') && linkTv) return; // já aberto: mantém (espelho ao vivo)
    el.innerHTML = '<div class="bl-wrap"><div class="bl-msg">Abrindo o controle da TV…</div></div>';
    var b = base();
    if (!b) { el.innerHTML = '<div class="bl-wrap"><div class="bl-msg">O bot não está configurado neste tablet.<br>Entre com a conta Google da HR no app para sincronizar as configurações.</div>' + barra() + '</div>'; return; }
    fetch(b + '/bot/totem/link', { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.url) throw new Error('sem link');
      linkTv = j.url;
      el.innerHTML = '<div class="bl-wrap"><iframe src="' + linkTv.replace(/"/g, '&quot;') + '" allow="fullscreen; screen-wake-lock" title="Controle da TV"></iframe>' + barra() + '</div>';
    }).catch(function () { el.innerHTML = '<div class="bl-wrap"><div class="bl-msg">Não consegui abrir o controle da TV. Confira a internet do tablet.</div>' + barra() + '</div>'; });
  }
  function barra() { return '<div class="bl-bar"><span>Modo balcão</span><button onclick="HR_BALCAO.recarregar()">↻ Recarregar</button><button onclick="HR_BALCAO.sair()">Sair do modo balcão</button></div>'; }

  function instalarGo() {
    if (typeof window.go !== 'function' || window.go._balcao) return false;
    var o = window.go;
    window.go = function (n) {
      n = +n;
      if (PERMIT.indexOf(n) < 0) n = 0; // tudo que é do dono volta para o orçamento
      var r = o.call(this, n);
      if (n === PG) abrirTv();
      return r;
    };
    window.go._balcao = true; return true;
  }
  function sair() {
    var fim = function () { try { localStorage.removeItem(LS); } catch (e) {} location.href = location.pathname; };
    if (typeof _adOn !== 'undefined' && _adOn) return fim();
    if (typeof openAdminPin === 'function') { openAdminPin(); var t = setInterval(function () { if (typeof _adOn !== 'undefined' && _adOn) { clearInterval(t); fim(); } }, 500); setTimeout(function () { clearInterval(t); }, 120000); }
    else if (confirm('Sair do modo balcão?')) fim();
  }
  // v319: o botão "Orçamento" do controle da TV (dentro da aba TV) volta para a tela de orçamento
  window.addEventListener('message', function (e) { try { if (e.data && e.data.hr === 'go' && typeof go === 'function') { go(+e.data.pg || 0); if (e.source) e.source.postMessage({ hr: 'go-ok' }, '*'); } } catch (x) {} });
  window.HR_BALCAO = { sair: sair, recarregar: function () { linkTv = ''; abrirTv(); }, abrirTv: abrirTv };

  var tent = 0;
  (function iniciar() {
    var ok = montar() && instalarGo();
    if (!ok && tent++ < 60) return setTimeout(iniciar, 250);
    try { if (window.HRTelaCli) window.HRTelaCli.ligar(); } catch (e) {} // o orçamento do tablet vai direto para a TV
    setTimeout(function () { var cur = document.querySelector('#nav .ni.on'); var n = cur ? +cur.getAttribute('data-pg') : -1; if (PERMIT.indexOf(n) < 0) go(0); }, 1500);
  })();
})();
