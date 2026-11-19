// app-retencao.js — v1: 🧱 Pedra de retenção nas soleiras (tela de Orçamento)
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
    aviso('Retenção: ' + String(n).replace('.', ',') + ' cm'); atualizar(true);
  }
  var box = null;
  function atualizar(forca) {
    var cli = document.getElementById('oCliente'), visivel = !!(cli && cli.offsetParent) && ambs().some(ehSoleira);
    if (!visivel) { if (box) box.style.display = 'none'; return; }
    if (!box) {
      box = document.createElement('div'); box.id = 'hrRetBox';
      box.style.cssText = 'position:fixed;left:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:9000;display:flex;gap:6px;font-family:Outfit,inherit';
      box.innerHTML = '<button type="button" data-r="a" style="border:1px solid rgba(201,168,76,.45);background:linear-gradient(135deg,#2a2213,#16120a);color:#f0d78c;border-radius:14px;padding:10px 13px;font-weight:700;font-size:.82rem;box-shadow:0 6px 18px rgba(0,0,0,.45)"></button><button type="button" data-r="c" title="Largura" style="border:1px solid rgba(201,168,76,.3);background:#16120a;color:#c9a84c;border-radius:14px;width:40px;font-size:1rem">⚙</button>';
      box.addEventListener('click', function (e) { var b = e.target.closest('[data-r]'); if (!b) return; if (b.getAttribute('data-r') === 'a') alternar(); else configurar(); atualizar(true); });
      document.body.appendChild(box);
    }
    box.style.display = 'flex';
    var b = box.querySelector('[data-r="a"]'), t = temRet() ? '✓ Retenção · tirar' : '🧱 + Pedra de retenção (' + String(larg()).replace('.', ',') + ' cm)';
    if (forca || b.textContent !== t) b.textContent = t;
  }
  // a largura do bot vale também aqui (se foi mudada pelo WhatsApp)
  function sincronizar() { if (!base()) return; fetch(base() + '/bot/retencao', { headers: hdr() }).then(function (r) { return r.json(); }).then(function (j) { if (j && +j.larg > 0) localStorage.setItem(KEY, String(j.larg)); }).catch(function () {}); }
  setTimeout(sincronizar, 4000);
  setInterval(function () { try { atualizar(false); } catch (e) {} }, 1500);
})();
