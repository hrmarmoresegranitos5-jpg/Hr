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
// v4: NUNCA recarrega enquanto o senhor está usando (antes recarregava depois de 8 s sem tocar = "o app reinicia sozinho").
// Versão nova → só atualiza sozinho: logo ao abrir (antes de mexer) ou quando o app vai para o segundo plano.
// Enquanto isso aparece um aviso discreto "Nova versão · Atualizar" no topo, para tocar quando quiser.
// v5 (28/11/2026): NÃO recarrega mais quando o app vai para o segundo plano — sair por segundos e voltar fazia o app
//   "reiniciar" (perdia a tela e o que estava sendo feito). Versão nova agora só entra: logo ao abrir (antes de mexer),
//   ao tocar no aviso "Nova versão · Atualizar", ou ao voltar depois de 30 min ou mais fora do app.
// v6 (28/11/2026): atualiza SOZINHO quando o senhor não está usando, SEM parecer que reiniciou:
//   • a tela em que o senhor estava (e a rolagem) fica guardada; depois de recarregar, o app volta exatamente nela;
//   • versão nova entra quando o app fica 2 min ou mais em segundo plano (ou ao voltar depois disso);
//   • se o Android fechar o app para liberar memória, ao abrir ele também volta para a mesma tela (até 30 min).
(function () {
  'use strict';
  var abriuEm = Date.now(), saiuEm = 0;
  var K = 'hr_tela_salva';
  function telaAtual() {
    var pg = document.querySelector('.pg.on'); if (!pg) return null;
    var id = String(pg.id || '').replace(/^pg/, ''), n = id === '2b' ? 7 : +id;
    if (!(n >= 0)) return null;
    return { n: n, top: pg.scrollTop || 0, cfg: (typeof cfgTab !== 'undefined' ? cfgTab : null), em: Date.now() };
  }
  function salvarTela() { try { var t = telaAtual(); if (t) localStorage.setItem(K, JSON.stringify(t)); } catch (e) {} }
  function restaurarTela() {
    var t = null; try { t = JSON.parse(localStorage.getItem(K) || 'null'); } catch (e) {}
    if (!t || Date.now() - t.em > 30 * 60000 || typeof go !== 'function') return;
    if ((t.n === 5 || t.n === 6) && !(typeof _adOn !== 'undefined' && _adOn)) return; // área do proprietário: pede o PIN como sempre
    var tentativas = 0;
    (function tentar() {
      tentativas++;
      if (!document.querySelector('.pg') && tentativas < 20) return setTimeout(tentar, 300);
      try {
        if (t.n === 6 && t.cfg != null) { go(6); cfgTab = t.cfg; document.querySelectorAll('.cfgtab').forEach(function (x) { x.classList.toggle('on', String(x.dataset.cftab) === String(t.cfg)); }); if (typeof buildCfg === 'function') buildCfg(); }
        else go(t.n);
        setTimeout(function () { var pg = document.querySelector('.pg.on'); if (pg && t.top) pg.scrollTop = t.top; }, 350);
      } catch (e) {}
    })();
  }
  // volta para a tela guardada depois de uma atualização (ou de o Android ter fechado o app)
  setTimeout(restaurarTela, 1200);
  setInterval(function () { if (!document.hidden) salvarTela(); }, 4000);
  var digitouAoSair = false;
  var mostrado = false, conferindo = false, ultima = 0, mexeu = 0, indo = false; // ao abrir, ainda não mexeu: atualiza direto
  ['pointerdown', 'keydown', 'input', 'wheel', 'touchmove'].forEach(function (ev) { document.addEventListener(ev, function () { mexeu = Date.now(); }, { passive: true, capture: true }); });
  function digitando() { var a = document.activeElement; return !!(a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable) && String(a.value || a.textContent || '').length); }
  function podeSozinho() { return (!document.hidden && !mexeu && Date.now() - abriuEm < 30000 && !digitando()) || (document.hidden && saiuEm && Date.now() - saiuEm > 2 * 60000 && !digitouAoSair); } // v6: ao abrir, ou 2 min em segundo plano
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

  function mostrar() { // v4: aviso discreto; atualiza ao tocar ou quando o app for para o segundo plano
    mostrado = true;
    if (document.getElementById('hrAtuAviso')) return;
    try { var b = document.createElement('button'); b.id = 'hrAtuAviso'; b.type = 'button'; b.textContent = '⬆️ Nova versão · Atualizar';
      b.style.cssText = 'position:fixed;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);z-index:99999;padding:7px 14px;border-radius:20px;border:1px solid rgba(201,168,76,.5);background:rgba(20,17,12,.94);color:#f0d78c;font-size:.75rem;font-weight:700;box-shadow:0 4px 14px rgba(0,0,0,.4)';
      b.addEventListener('click', function () { atualizar(); }); document.body.appendChild(b); } catch (e) {}
  }

  function atualizar() {
    if (indo) return; indo = true; salvarTela();
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
  setInterval(function () { if (mostrado && podeSozinho()) atualizar(); else if (document.hidden && saiuEm && Date.now() - saiuEm > 2 * 60000) conferir(); }, 30000); // v6: em segundo plano também confere e atualiza // v4: podeSozinho só vale em segundo plano / ao abrir
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { saiuEm = Date.now(); digitouAoSair = digitando(); salvarTela(); return; } // v6: guarda a tela; só atualiza depois de 2 min fora
    var longe = saiuEm && Date.now() - saiuEm > 2 * 60000 && !digitouAoSair; saiuEm = 0;
    if (mostrado && longe && !digitando()) { atualizar(); return; } // ficou 30 min ou mais fora: pode trazer a versão nova
    ultima = 0; conferir();
  });
  window.addEventListener('online', conferir);
  window.HRAtualizar = { conferir: conferir, mostrar: mostrar, atualizar: atualizar };
})();
