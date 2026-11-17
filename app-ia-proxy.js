// ═══════════════════════════════════════════════════════════════════
// IA DO APP: Gemini grátis primeiro; quando a cota acaba, pelo BOT (v1)
// Todas as funções de IA do app chamam o Gemini (generateContent). A cota grátis
// é de ~20 por dia. Este arquivo intercepta essas chamadas: se o Gemini
// responder 429 (cota) — ou se a cota já acabou hoje — o mesmo pedido vai para
// POST /bot/ia, que responde no MESMO formato do Gemini usando a IA do bot.
// Nenhuma tela precisa mudar. Carregar ANTES dos outros scripts do app.
// ═══════════════════════════════════════════════════════════════════
(function () {
  if (window.__hrIaProxy || typeof window.fetch !== 'function') return;
  window.__hrIaProxy = true;
  var orig = window.fetch.bind(window);
  var KEY = 'hr_ia_cota_ate';
  function botCfg() {
    try {
      var c = typeof _getBotCfg === 'function' ? _getBotCfg() : null;
      if (c && c.url && c.key && typeof _botHeaders === 'function') return { base: String(c.url).replace(/\/+$/, ''), headers: _botHeaders() };
    } catch (e) {}
    return null;
  }
  function cotaAcabou() { try { return Date.now() < (+localStorage.getItem(KEY) || 0); } catch (e) { return false; } }
  function marcarCota(txt) {
    var m = String(txt || '').match(/retry in (?:(\d+)h)?(?:(\d+)m)?/i);
    var ms = m ? ((+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + 60) * 1000 : 6 * 3600 * 1000;
    try { localStorage.setItem(KEY, String(Date.now() + ms)); } catch (e) {}
  }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (!/generativelanguage\.googleapis\.com\/.*:generateContent/.test(url) || !init || !init.body) return orig(input, init);
    var bot = botCfg();
    var viaBot = function () {
      return orig(bot.base + '/bot/ia', { method: 'POST', headers: bot.headers, body: init.body, signal: init.signal });
    };
    if (bot && cotaAcabou()) return viaBot();
    return orig(input, init).then(function (r) {
      if (r.status !== 429 || !bot) return r;
      return r.clone().text().then(function (t) { marcarCota(t); console.log('[IA] cota grátis do Gemini acabou — usando a IA do bot'); return viaBot(); });
    }, function (e) {
      if (bot && !(e && e.name === 'AbortError')) return viaBot();
      throw e;
    });
  };
})();
