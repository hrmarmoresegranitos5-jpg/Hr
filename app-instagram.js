// ═══════════════════════════════════════════════════════════════════
// INSTAGRAM NO BOT (v1) — cartão na Secretária (painel do bot conectado):
// guarda o token e a chave secreta do app do Instagram no bot (POST /bot/instagram),
// mostra a conta ligada, quantas conversas do Direct o bot já atendeu e o endereço do webhook.
// ═══════════════════════════════════════════════════════════════════
(function () {
  if (window.__hrInsta) return; window.__hrInsta = true;
  function cfg() { try { var c = typeof _getBotCfg === 'function' ? _getBotCfg() : {}; return c && c.url && c.key ? c : null; } catch (e) { return null; } }
  function api(m, path, body) {
    var c = cfg(); if (!c) return Promise.reject(new Error('bot não conectado'));
    return fetch(String(c.url).replace(/\/+$/, '') + path, { method: m, headers: _botHeaders(), body: body ? JSON.stringify(body) : undefined }).then(function (r) { return r.json(); });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var estado = null, aberto = false;
  function html() {
    var e = estado || {};
    var lig = e.ligado && e.conta && e.conta.username;
    var h = '<div id="igCard" style="margin-top:12px;background:linear-gradient(135deg,rgba(225,48,108,.12),rgba(131,58,180,.10));border:1px solid rgba(225,48,108,.35);border-radius:12px;padding:10px 12px;">';
    h += '<div data-ig="abrir" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;"><div style="font-size:13px;font-weight:800;color:#fff;">📸 Instagram ' + (lig ? '<span style="color:#4ade80;font-size:11px;">● @' + esc(e.conta.username) + '</span>' : '<span style="color:rgba(255,255,255,.5);font-size:11px;">não ligado</span>') + '</div><span style="color:rgba(255,255,255,.5);">' + (aberto ? '▴' : '▾') + '</span></div>';
    if (lig) h += '<div style="font-size:11px;color:rgba(255,255,255,.6);margin-top:4px;">O bot responde o Direct e os comentários de interesse. Conversas atendidas: <b>' + (e.conversas || 0) + '</b>' + (e.segredo ? '' : ' · <span style="color:#f87171;">falta a chave secreta</span>') + '</div>';
    if (aberto) {
      h += '<div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.65);line-height:1.5;">Cole aqui o <b>token</b> da conta (Meta for Developers → seu app → Instagram → Gerar token) e a <b>chave secreta do app do Instagram</b>. Ficam guardados só no bot.</div>';
      h += '<input id="igTok" placeholder="Token do Instagram (começa com IG…)" style="width:100%;margin-top:8px;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;font-size:12px;box-sizing:border-box;">';
      h += '<input id="igSeg" placeholder="Chave secreta do app do Instagram" style="width:100%;margin-top:6px;padding:9px;border-radius:9px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;font-size:12px;box-sizing:border-box;">';
      h += '<button data-ig="salvar" style="width:100%;margin-top:8px;padding:10px;border-radius:10px;border:none;background:linear-gradient(135deg,#e1306c,#833ab4);color:#fff;font-weight:800;font-size:12px;cursor:pointer;">Ligar / conferir Instagram</button>';
      if (e.webhook) h += '<div style="margin-top:10px;font-size:11px;color:rgba(255,255,255,.65);line-height:1.6;">No site da Meta, passo <b>3. Configurar webhooks</b>:<br>URL de callback: <b style="color:#fff;word-break:break-all;">' + esc(e.webhook) + '</b> <button data-ig-copia="' + esc(e.webhook) + '" style="font-size:10px;padding:2px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;">copiar</button>'
        + (e.verifyToken ? '<br>Verificar token: <b style="color:#fff;word-break:break-all;">' + esc(e.verifyToken) + '</b> <button data-ig-copia="' + esc(e.verifyToken) + '" style="font-size:10px;padding:2px 8px;border-radius:6px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;">copiar</button>' : '')
        + '<br>Depois de "Verificar e salvar", ligue <b>messages</b> e <b>comments</b>.</div>';
      if (e.passos) h += '<div style="margin-top:8px;font-size:11px;color:#fff;background:rgba(0,0,0,.25);border-radius:8px;padding:8px;">' + e.passos.map(function (p) { return '• ' + esc(p); }).join('<br>') + '</div>';
    }
    return h + '</div>';
  }
  function por() {
    var alvo = document.getElementById('botConnectedArea'); if (!alvo || !cfg()) return;
    var c = document.getElementById('igCard'); var novo = html();
    if (c) c.outerHTML = novo; else alvo.insertAdjacentHTML('beforeend', novo);
  }
  function carregar() { api('GET', '/bot/instagram').then(function (d) { if (d && d.ok) { var p = estado && estado.passos; estado = d; if (p) estado.passos = p; por(); } }).catch(function () {}); }
  document.addEventListener('click', function (ev) {
    var cp = ev.target.closest && ev.target.closest('[data-ig-copia]');
    if (cp) { var v = cp.getAttribute('data-ig-copia'); (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(function () { if (typeof toast === 'function') toast('Copiado ✓'); }).catch(function () { prompt('Copie:', v); }); return; }
    var t = ev.target.closest && ev.target.closest('[data-ig]'); if (!t) return;
    var a = t.getAttribute('data-ig');
    if (a === 'abrir') { aberto = !aberto; por(); return; }
    if (a === 'salvar') {
      var tk = (document.getElementById('igTok') || {}).value || '', sg = (document.getElementById('igSeg') || {}).value || '';
      t.disabled = true; t.textContent = '⏳ Conferindo…';
      api('POST', '/bot/instagram', { token: tk.trim() || undefined, segredo: sg.trim() || undefined }).then(function (d) {
        estado = Object.assign(estado || {}, { passos: (d && d.passos) || ['Sem resposta do bot'] , webhook: d && d.webhook });
        if (d && d.ok && typeof toast === 'function') toast('📸 Instagram ligado: @' + (d.conta || ''));
        carregar();
      }).catch(function (e) { estado = Object.assign(estado || {}, { passos: ['Falhou: ' + e.message] }); por(); });
    }
  });
  setInterval(function () { if (document.getElementById('botConnectedArea') && !document.getElementById('igCard')) { por(); if (!estado) carregar(); } }, 2000);
})();
