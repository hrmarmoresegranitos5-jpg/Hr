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
  if (!ativo()) { // fora do modo balcão: em tela larga (tablet deitado/PC) o menu ganha "Modo balcão" para ligar neste aparelho
    var t0 = 0;
    (function botao() {
      var nav = document.getElementById('nav');
      if (!nav) { if (t0++ < 40) setTimeout(botao, 500); return; }
      if (window.innerWidth < 900 || nav.querySelector('.bl-liga')) return;
      var ni = document.createElement('div'); ni.className = 'ni bl-liga';
      ni.innerHTML = '<span class="ni-i">🏪</span><span class="ni-l">Modo balcão</span>';
      ni.addEventListener('click', function (e) { e.stopPropagation(); if (!confirm('Deixar este aparelho no modo balcão? Ele vai mostrar só Orçamento, Histórico e TV. Para sair depois: 🔒 Sair (pede a senha).')) return; try { localStorage.setItem(LS, '1'); } catch (x) {} location.reload(); }, true);
      nav.appendChild(ni);
    })();
    return;
  }

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
  var WK = 'https://tiny-sunset-e26ahr-whatzapp.hrmarmoresegranitos5.workers.dev';
  function aviso(t) { try { toast(t); } catch (e) { alert(t); } }

  // TV: janela própria com o link do controle (link de verdade: o Android não bloqueia como bloqueia janela aberta por script)
  function abrirTv() {
    var ov = document.getElementById('blTv'); if (ov) ov.remove();
    ov = document.createElement('div'); ov.id = 'blTv';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.82);display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif';
    ov.innerHTML = '<div style="background:#15151b;border:1px solid rgba(201,168,76,.35);border-radius:18px;padding:26px;width:min(460px,92vw);text-align:center;color:#efe9dc">' +
      '<div style="font-size:2.2rem">📺</div><b style="display:block;font-size:1.3rem;color:#ecd27c;margin:6px 0 4px">Controle da TV</b>' +
      '<div id="blTvMsg" style="font-size:.9rem;color:#a99c80;margin-bottom:16px">Buscando o link…</div>' +
      '<a id="blTvLnk" target="_blank" rel="noopener" style="display:none;padding:15px;border-radius:12px;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:700;text-decoration:none;font-size:1.05rem">Abrir o controle da TV</a>' +
      '<button id="blTvX" style="margin-top:12px;width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.15);background:none;color:#efe9dc;font:600 .95rem Outfit,sans-serif">Fechar</button></div>';
    document.body.appendChild(ov);
    ov.querySelector('#blTvX').onclick = function () { ov.remove(); };
    ov.querySelector('#blTvLnk').onclick = function () { setTimeout(function () { ov.remove(); }, 300); };
    var msg = ov.querySelector('#blTvMsg'), b = base(), a = ov.querySelector('#blTvLnk');
    var salvo = ''; try { salvo = localStorage.getItem('hr_tv_link') || ''; } catch (e) {}
    var mostra = function (u, txt) { a.href = u; a.style.display = 'block'; msg.innerHTML = txt || 'Abre numa janela separada. Para voltar ao orçamento, use o botão 💰 Orçamento de lá.'; };
    if (salvo) { mostra(salvo, 'Abre numa janela separada. <a href="#" id="blTvNovo" style="color:#ecd27c">Parear de novo</a>'); var nv = ov.querySelector('#blTvNovo'); if (nv) nv.onclick = function (e) { e.preventDefault(); try { localStorage.removeItem('hr_tv_link'); } catch (x) {} abrirTv(); }; return; }
    if (!b) { // sem a chave do bot neste aparelho: pareia pelo WhatsApp com um código
      msg.textContent = 'Gerando o código para ligar este tablet…';
      fetch(WK + '/balcao/codigo', { method: 'POST' }).then(function (r) { return r.json(); }).then(function (j) {
        if (!j.codigo) throw new Error(j.erro || 'sem código');
        msg.innerHTML = 'Mande no WhatsApp da Helena (do seu celular):<div style="font-size:2rem;font-weight:700;color:#f3d982;letter-spacing:.12em;margin:10px 0">parear ' + j.codigo + '</div>Vale 10 minutos. Assim que você mandar, o botão aparece aqui.';
        var n = 0, t = setInterval(function () {
          if (!document.getElementById('blTv') || n++ > 200) { clearInterval(t); return; }
          fetch(WK + '/balcao/par?c=' + j.codigo).then(function (r) { return r.json(); }).then(function (p) {
            if (p.link) { clearInterval(t); try { localStorage.setItem('hr_tv_link', p.link); } catch (x) {} mostra(p.link, '✅ Tablet ligado. Toque para abrir o controle da TV.'); }
            else if (p.expirou) { clearInterval(t); msg.textContent = 'O código venceu. Feche e toque em 📺 TV de novo.'; }
          }).catch(function () {});
        }, 3000);
      }).catch(function (e) { msg.textContent = 'Não consegui gerar o código (' + e.message + '). Confira a internet.'; });
      return;
    }
    fetch(b + '/bot/totem/link', { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) {
      if (!j || !j.url) throw new Error((j && j.error) || 'sem link');
      try { localStorage.setItem('hr_tv_link', j.url); } catch (x) {} mostra(j.url, j.status);
    }).catch(function (e) { msg.textContent = 'Não consegui falar com o bot (' + e.message + '). Confira a internet.'; });
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
    ni.setAttribute('data-bl', nome);
    return ni;
  }
  document.addEventListener('click', function (e) { var n = e.target && e.target.closest && e.target.closest('.bl-ni'); if (!n) return; e.stopPropagation(); e.preventDefault(); if (n.getAttribute('data-bl') === 'TV') abrirTv(); else sair(); }, true);
  var tent = 0;
  (function iniciar() {
    var nav = document.getElementById('nav');
    if (!nav) { if (tent++ < 40) setTimeout(iniciar, 250); return; }
    if (!nav.querySelector('.bl-ni')) { nav.appendChild(item('📺', 'TV', abrirTv)); nav.appendChild(item('🔒', 'Sair', sair)); }
    // abre direto no orçamento (se o app ainda estiver na tela de abertura, entra por ela)
    setTimeout(function () { try { var a = document.getElementById('sApp'); if (a && !a.classList.contains('on') && typeof openApp === 'function') openApp(0); else if (typeof go === 'function') go(0); } catch (e) {} }, 1200);
  })();
})();
