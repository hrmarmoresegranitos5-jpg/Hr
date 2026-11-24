/* ═══════════════════════════════════════════════════════════════════
   app-balcao.js — Modo balcão (tablet de atendimento)  v2 (24/11/2026)
   HR Mármores e Granitos

   O tablet do balcão abre o app com ?balcao=1 (fica guardado; ?balcao=0 desliga).
   v2: versão leve. Não mexe mais na navegação do app (só esconde os botões do menu)
   e não abre a TV dentro do app (o controle da TV abre na janela dele) — a v1
   deixava a tela preta e travava o tablet.
   Menu no balcão: 💰 Orçamento · 📋 Histórico · 📺 TV · 🔒 Sair.
   ═══════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  var LS = 'hr_balcao';
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
    'html.balcao #nav .ni[data-pg="0"],html.balcao #nav .ni[data-pg="7"],html.balcao #nav .ni.bl-ni{display:flex!important}',
    'html.balcao body #nav .ni[data-pg="77"]{display:none!important}',
    'html.balcao .so-dono{display:none!important}'
  ].join('\n');
  document.head.appendChild(st);

  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function aviso(t) { try { toast(t); } catch (e) { alert(t); } }

  function abrirTv() {
    var b = base();
    if (!b) { aviso('Entre com a conta Google da HR para ligar o controle da TV.'); return; }
    var w = window.open('about:blank', '_blank');
    fetch(b + '/bot/totem/link', { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.url) throw new Error('sem link');
      if (w) w.location.href = j.url; else location.href = j.url;
    }).catch(function () { if (w) w.close(); aviso('Não consegui abrir o controle da TV. Confira a internet.'); });
  }
  function sair() {
    var fim = function () { try { localStorage.removeItem(LS); } catch (e) {} location.href = location.pathname; };
    if (typeof _adOn !== 'undefined' && _adOn) return fim();
    if (typeof openAdminPin === 'function') {
      openAdminPin();
      var t = setInterval(function () { if (typeof _adOn !== 'undefined' && _adOn) { clearInterval(t); fim(); } }, 500);
      setTimeout(function () { clearInterval(t); }, 60000);
    } else if (confirm('Sair do modo balcão?')) fim();
  }
  window.HR_BALCAO = { sair: sair, abrirTv: abrirTv };
  // o botão "Orçamento" do controle da TV (quando ele estiver dentro do app)
  window.addEventListener('message', function (e) { try { if (e.data && e.data.hr === 'go' && typeof go === 'function') { go(+e.data.pg || 0); if (e.source) e.source.postMessage({ hr: 'go-ok' }, '*'); } } catch (x) {} });

  function item(ic, nome, fn) {
    var ni = document.createElement('div'); ni.className = 'ni bl-ni';
    ni.innerHTML = '<span class="ni-i">' + ic + '</span><span class="ni-l">' + nome + '</span>';
    ni.addEventListener('click', function (e) { e.stopPropagation(); fn(); });
    return ni;
  }
  var tent = 0;
  (function iniciar() {
    var nav = document.getElementById('nav');
    if (!nav) { if (tent++ < 40) setTimeout(iniciar, 250); return; }
    if (!nav.querySelector('.bl-ni')) { nav.appendChild(item('📺', 'TV', abrirTv)); nav.appendChild(item('🔒', 'Sair', sair)); }
    // abre direto no orçamento (se o app ainda estiver na tela de abertura, entra por ela)
    setTimeout(function () { try { var a = document.getElementById('sApp'); if (a && !a.classList.contains('on') && typeof openApp === 'function') openApp(0); else if (typeof go === 'function') go(0); } catch (e) {} }, 1200);
  })();
})();
