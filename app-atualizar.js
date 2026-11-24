// ═══════════════════════════════════════════════════════════════════
// HR — Atualização automática (app-atualizar.js v3)
// v3: SEM botão. Versão nova → atualiza sozinho: na hora se o app estiver parado/em segundo plano;
// se estiver mexendo, espera 8 s sem tocar na tela (e sem nada digitado num campo) e atualiza.
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
  function podeSozinho() { return document.hidden || (Date.now() - mexeu > 8000 && !digitando()); }
  function recentes() { try { return JSON.parse(sessionStorage.getItem('hr_atu_auto') || '[]').filter(function (t) { return Date.now() - t < 10 * 60000; }); } catch (e) { return []; } }
  function novaVersao() { // até 2 atualizações sozinhas em 10 min (se o GitHub ainda não terminou de publicar, não fica recarregando)
    var r = recentes();
    if (podeSozinho() && r.length < 2) { r.push(Date.now()); try { sessionStorage.setItem('hr_atu_auto', JSON.stringify(r)); } catch (e) {} atualizar(); }
    else if (r.length < 2) mostrar(); // v3: só marca pendente (sem botão); atualiza assim que parar de mexer
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

  function mostrar() { mostrado = true; } // v3: nada aparece na tela; o intervalo abaixo atualiza quando puder

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
  setInterval(conferir, 2 * 60000);
  setInterval(function () { if (mostrado && podeSozinho()) atualizar(); }, 3000);
  document.addEventListener('visibilitychange', function () { if (document.hidden) { if (mostrado) atualizar(); } else { ultima = 0; conferir(); } }); // saiu do app com o botão na tela → atualiza enquanto está fora
  window.addEventListener('online', conferir);
  window.HRAtualizar = { conferir: conferir, mostrar: mostrar, atualizar: atualizar };
})();
