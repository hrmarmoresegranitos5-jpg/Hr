// app-totem.js — v2 (24/11/2026): CONTROLE DA TV (tablet do balcão)
// Cartão nas Configurações: mostra o link do totem do balcão (tablet), se está ligado, e permite copiar, abrir ou trocar o link.
(function () {
  'use strict';
  function base() { try { return String(_getBotCfg().url || '').replace(/\/+$/, ''); } catch (e) { return ''; } }
  function hdr() { try { return _botHeaders(); } catch (e) { return {}; } }
  function aviso(t) { try { toast(t); } catch (e) { alert(t); } }
  function link(novo) {
    var b = base(); if (!b) return Promise.reject(new Error('Bot não configurado no app.'));
    return fetch(b + '/bot/totem/link' + (novo ? '?novo=1' : ''), { headers: hdr() }).then(function (r) { return r.json(); });
  }
  function abrir() {
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,6,9,.96);color:#efe9dc;font-family:Outfit,sans-serif;display:flex;align-items:center;justify-content:center;padding:18px';
    ov.innerHTML = '<div style="max-width:520px;width:100%;background:#14141a;border:1px solid rgba(201,168,76,.3);border-radius:16px;padding:18px">' +
      '<div style="font-family:Cormorant Garamond,serif;color:#ecd27c;font-size:1.6rem">📺 Controle da TV</div>' +
      '<div style="color:#a99c80;font-size:.8rem;margin:4px 0 12px">O tablet do balcão controla a TV: explicações ilustradas (rebaixo americano, cubas, bordas…), modelos, pedras, suas fotos e vídeos e o Pix com QR code. O tablet mostra o espelho da TV.</div>' +
      '<div id="ttSt" style="font-size:.85rem;margin-bottom:8px">Carregando…</div>' +
      '<input id="ttUrl" readonly style="width:100%;box-sizing:border-box;background:#0b0b0e;color:#f3ecdb;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:10px;font-size:.8rem">' +
      '<div style="font-size:.75rem;color:#a99c80;margin:10px 0">No tablet: abra o link no Chrome → menu ⋮ → “Adicionar à tela inicial” e abra pelo ícone.</div>' +
      '<div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button id="ttCop" style="flex:1;padding:11px;border:none;border-radius:10px;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#1a1408;font-weight:700">Copiar link</button>' +
      '<button id="ttAbr" style="flex:1;padding:11px;border:none;border-radius:10px;background:rgba(255,255,255,.08);color:#efe9dc;font-weight:700">Abrir</button>' +
      '<button id="ttNov" style="flex:1;padding:11px;border:none;border-radius:10px;background:rgba(255,255,255,.08);color:#efe9dc;font-weight:700">Trocar link</button>' +
      '<button id="ttFec" style="flex:1;padding:11px;border:none;border-radius:10px;background:rgba(255,255,255,.08);color:#efe9dc;font-weight:700">Fechar</button></div></div>';
    document.body.appendChild(ov);
    var mostra = function (j) { ov.querySelector('#ttUrl').value = j.url || ''; ov.querySelector('#ttSt').textContent = j.status || ''; };
    link(false).then(mostra).catch(function (e) { ov.querySelector('#ttSt').textContent = e.message; });
    ov.querySelector('#ttFec').onclick = function () { ov.remove(); };
    ov.querySelector('#ttAbr').onclick = function () { var u = ov.querySelector('#ttUrl').value; if (u) window.open(u, '_blank'); };
    ov.querySelector('#ttCop').onclick = function () { var u = ov.querySelector('#ttUrl').value; if (!u) return; (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { aviso('Link copiado'); }).catch(function () { ov.querySelector('#ttUrl').select(); document.execCommand('copy'); aviso('Link copiado'); }); };
    ov.querySelector('#ttNov').onclick = function () { if (!confirm('Trocar o link? O tablet vai precisar abrir o link novo.')) return; link(true).then(function (j) { mostra(j); aviso('Link novo gerado'); }).catch(function (e) { aviso(e.message); }); };
  }
  window.abrirTotemLoja = abrir;
  function cartao() {
    var cb = document.getElementById('cfgBody'); if (!cb || cb.querySelector('.tt-card')) return;
    var d = document.createElement('div'); d.className = 'vz-card tt-card';
    d.innerHTML = '<span style="font-size:1.5rem">🖥️</span><span><b>Controle da TV</b><small>Link do tablet que controla a TV do balcão</small></span>';
    d.onclick = abrir; var v = cb.querySelector('.vz-card'); cb.insertBefore(d, v ? v.nextSibling : cb.firstChild);
  }
  setInterval(cartao, 1000);
})();
