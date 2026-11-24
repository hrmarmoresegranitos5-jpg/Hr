// ═══════════════════════════════════════════════════════════════════
// HR — Atualização automática (app-atualizar.js v2)
// v2: atualiza SOZINHO quando o app está parado ou em segundo plano; o botão só aparece se o
// senhor estiver mexendo no app naquela hora — e mesmo assim atualiza sozinho ao parar de mexer.
// O app instalado no celular volta do segundo plano sem recarregar, então ficava
// na versão velha. Aqui ele confere sozinho: ao abrir, ao voltar para o app e a
// cada 10 minutos, busca o index.html do GitHub (sem cache) e confere se algum
// arquivo dele (?v=N) não é o que está rodando. Mudou → aparece o botão Atualizar.
// Não precisa mexer em nada ao publicar: basta subir os arquivos como sempre.
// ═══════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var mostrado = false, conferindo = false, ultima = 0, mexeu = 0, indo = false; // ao abrir, ainda não mexeu: atualiza direto
  ['pointerdown', 'keydown', 'input', 'wheel', 'touchmove'].forEach(function (ev) { document.addEventListener(ev, function () { mexeu = Date.now(); }, { passive: true, capture: true }); });
  function digitando() { var a = document.activeElement; return !!(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && String(a.value || a.textContent || '').length); }
  function podeSozinho() { return document.hidden || (Date.now() - mexeu > 45000 && !digitando()); }
  function recentes() { try { return JSON.parse(sessionStorage.getItem('hr_atu_auto') || '[]').filter(function (t) { return Date.now() - t < 10 * 60000; }); } catch (e) { return []; } }
  function novaVersao() { // até 2 atualizações sozinhas em 10 min (se o GitHub ainda não terminou de publicar, não fica recarregando)
    var r = recentes();
    if (podeSozinho() && r.length < 2) { r.push(Date.now()); try { sessionStorage.setItem('hr_atu_auto', JSON.stringify(r)); } catch (e) {} atualizar(); }
    else if (r.length < 2) mostrar();
  }

  function lista(html) {
    var out = [], re = /<script[^>]+src="([^"]+)"/g, m;
    while ((m = re.exec(html))) if (!/^(https?:)?\/\//.test(m[1])) out.push(m[1].replace(/^\.\//, ''));
    return out;
  }
  function atual() {
    var out = {};
    document.querySelectorAll('script[src]').forEach(function (s) { out[(s.getAttribute('src') || '').replace(/^\.\//, '')] = 1; });
    return out;
  }

  function conferir() {
    if (indo || conferindo || !navigator.onLine) return;
    if (mostrado) { if (podeSozinho()) atualizar(); return; }
    if (recentes().length >= 2) return; // botão na tela e o senhor parou de mexer → atualiza
    if (Date.now() - ultima < 60000) return;
    conferindo = true; ultima = Date.now();
    fetch('./index.html?nv=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (html) {
        if (!html || html.indexOf('<script') < 0) return;
        // algum arquivo do index novo (ex.: app-core.js?v=75) não está rodando aqui → tem versão nova
        var novo = lista(html), agora = atual();
        if (novo.length && novo.some(function (u) { return !agora[u]; })) novaVersao();
      })
      .catch(function () {})
      .then(function () { conferindo = false; });
    try { navigator.serviceWorker && navigator.serviceWorker.getRegistration().then(function (r) { r && r.update().catch(function () {}); }); } catch (e) {}
  }

  function mostrar() {
    if (mostrado) return; mostrado = true;
    var b = document.createElement('div');
    b.id = 'hrAtualizar';
    b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:calc(84px + env(safe-area-inset-bottom));z-index:99999;display:flex;align-items:center;gap:10px;padding:12px 12px 12px 16px;border-radius:16px;background:#1a1712;border:1.5px solid #c9a84c;box-shadow:0 10px 30px rgba(0,0,0,.6);font-family:Outfit,sans-serif;color:#fff;';
    b.innerHTML = '<div style="flex:1;font-size:.86rem;line-height:1.3;"><b style="color:#e8c96a;">Nova versão do app</b><br><span style="color:#aaa;font-size:.76rem;">Toque em Atualizar para usar agora</span></div>'
      + '<button id="hrAtualizarBt" style="padding:11px 16px;border-radius:11px;border:none;background:linear-gradient(135deg,#e8c96a,#c9a84c);color:#000;font-weight:800;font-size:.86rem;cursor:pointer;font-family:inherit;">Atualizar</button>';
    document.body.appendChild(b);
    document.getElementById('hrAtualizarBt').onclick = atualizar;
  }

  function atualizar() {
    if (indo) return; indo = true;
    var bt = document.getElementById('hrAtualizarBt');
    if (bt) { bt.disabled = true; bt.textContent = 'Atualizando…'; }
    var limpar = Promise.resolve();
    try {
      if (window.caches) limpar = caches.keys().then(function (k) {
        // tira só a cópia guardada do index.html; os arquivos ?v=N novos vêm da internet
        return Promise.all(k.map(function (n) { return caches.open(n).then(function (c) { return Promise.all([c.delete('./index.html'), c.delete('./')]); }); }));
      });
    } catch (e) {}
    var sw = Promise.resolve();
    try { if (navigator.serviceWorker) sw = navigator.serviceWorker.getRegistration().then(function (r) { return r && r.update().catch(function () {}); }); } catch (e) {}
    Promise.all([limpar, sw]).catch(function () {}).then(function () {
      var u = location.pathname + '?atualizado=' + Date.now() + location.hash;
      location.replace(u);
    });
  }

  // limpa o ?atualizado=… da barra depois de abrir a versão nova
  if (/[?&]atualizado=/.test(location.search)) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {}
  }

  setTimeout(conferir, 8000);
  setInterval(conferir, 3 * 60000);
  setInterval(function () { if (mostrado && podeSozinho()) atualizar(); }, 15000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (mostrado) atualizar(); } else { ultima = 0; conferir(); } }); // saiu do app com o botão na tela → atualiza enquanto está fora
  window.addEventListener('online', conferir);
  window.HRAtualizar = { conferir: conferir, mostrar: mostrar, atualizar: atualizar };
})();
