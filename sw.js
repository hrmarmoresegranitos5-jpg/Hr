// ═══════════════════════════════════════════════════════
// HR Mármores e Granitos — Service Worker v7
// Cache de arquivos versionados (?v=N) + rede primeiro para index.html + app abre offline
// ═══════════════════════════════════════════════════════

var CACHE_NAME = 'hr-shell-v78';
// Apenas o shell mínimo para não quebrar offline
var SHELL_FILES = [
  './',
  './index.html'
];
// Leitor de PDF do extrato bancário: guardado para funcionar sem internet
var PDFJS_FILES = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  // gerar PDF (orçamento/contrato) e ler/gerar planilhas também funcionam sem internet
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

// INSTALL: pré-cacheia o shell mínimo e ativa imediatamente
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // pdf.js é opcional: se falhar (sem rede), não impede a instalação
      var extras = Promise.all(PDFJS_FILES.map(function(u) { return cache.add(u).catch(function() {}); }));
      // guarda também cada script/estilo do index.html, para o app abrir sem internet já na primeira vez
      var assets = fetch('./index.html', { cache: 'no-store' }).then(function(r) { return r.text(); }).then(function(html) {
        var urls = [], re = /<(?:script[^>]+src|link[^>]+href)="([^"]+)"/g, m;
        while ((m = re.exec(html))) {
          var u = m[1];
          if (/^(https?:)?\/\//.test(u) || u.indexOf('data:') === 0) continue;                        // só arquivos do próprio app
          if (/\.(js|css|json|png)(\?|$)/.test(u)) urls.push(new URL(u, self.location.href).href);
        }
        return Promise.all(urls.map(function(u) { return cache.add(u).catch(function() {}); }));
      }).catch(function() {});
      return cache.addAll(SHELL_FILES).then(function() { return Promise.all([extras, assets]); });
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// ACTIVATE: apaga caches ANTIGOS (mantém o atual) e assume controle
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// FETCH
//  • index.html / navegação  → rede primeiro (pega versão nova); sem rede, usa a cópia guardada
//  • .js/.css com ?v=N       → cache primeiro (a URL muda quando você sobe a versão): abre rápido e funciona sem internet
//  • demais arquivos do app  → rede primeiro, guarda cópia para quando estiver sem sinal
//  Nunca devolve index.html no lugar de um .js/.css (isso quebrava o app offline).
function _hrIgnorar(url) {
  return url.indexOf('googleapis.com') !== -1 ||
         url.indexOf('anthropic.com') !== -1 ||
         url.indexOf('groq.com') !== -1 ||
         url.indexOf('supabase.co') !== -1 ||
         url.indexOf('mercadolibre.com') !== -1 ||
         url.indexOf('mercadolivre.com') !== -1 ||
         url.indexOf('allorigins.win') !== -1 ||
         url.indexOf('corsproxy.io') !== -1 ||
         url.indexOf('mlstatic.com') !== -1;
}
function _hrGuardar(req, res) {
  if (!res || res.status !== 200) return Promise.resolve();
  var copia = res.clone();
  return caches.open(CACHE_NAME).then(function(cache) {
    return cache.put(req, copia).then(function() {
      // mantém só a versão mais nova de cada arquivo (?v=N antigos saem do cache)
      var u = new URL(req.url);
      if (!u.search) return;
      return cache.keys().then(function(keys) {
        return Promise.all(keys.map(function(k) {
          var ku = new URL(k.url);
          if (ku.pathname === u.pathname && ku.search !== u.search) return cache.delete(k);
        }));
      });
    });
  }).catch(function() {});
}
self.addEventListener('fetch', function(e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  if (req.url.indexOf('http') !== 0) return;          // chrome-extension:// etc.
  if (_hrIgnorar(req.url)) return;                    // APIs externas: só rede
  var u = new URL(req.url);

  // Bibliotecas com versão na URL (cdnjs: jsPDF, html2canvas, xlsx, pdf.js | gstatic: SDK do Firebase):
  // cache primeiro; guarda na primeira vez que usar com internet e depois funciona offline
  if (u.hostname === 'cdnjs.cloudflare.com' || (u.hostname === 'www.gstatic.com' && u.pathname.indexOf('/firebasejs/') === 0)) {
    e.respondWith(caches.match(req).then(function(c) {
      if (c) return c;
      return fetch(req).then(function(res) { _hrGuardar(req, res); return res; });
    }).catch(function() { return Response.error(); }));
    return;
  }
  if (u.origin !== self.location.origin) return;      // outros domínios: o navegador cuida

  var ehNavegacao = req.mode === 'navigate' || u.pathname === '/' || /\/index\.html$/.test(u.pathname) || /\/$/.test(u.pathname);
  var ehVersionado = /\.(js|css)$/.test(u.pathname) && /[?&]v=/.test(u.search);

  if (ehNavegacao) {
    e.respondWith(
      fetch(req, { cache: 'no-store' }).then(function(res) {
        _hrGuardar(new Request(new URL('./index.html', self.location.href).href), res.clone());
        return res;
      }).catch(function() {
        return caches.match('./index.html').then(function(c) { return c || Response.error(); });
      })
    );
    return;
  }

  if (ehVersionado) {
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(res) { _hrGuardar(req, res); return res; });
      }).catch(function() { return Response.error(); })
    );
    return;
  }

  e.respondWith(
    fetch(req, { cache: 'no-store' }).then(function(res) { _hrGuardar(req, res); return res; })
      .catch(function() {
        return caches.match(req).then(function(c) { return c || Response.error(); });
      })
  );
});

// MESSAGE: compatibilidade com pwa.js + consulta de versão (Config → Empresa)
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (e.data && e.data.type === 'GET_VERSION' && e.ports && e.ports[0]) {
    e.ports[0].postMessage({ cacheName: CACHE_NAME });
  }
});

// NOTIFICATIONCLICK: trata os botões "Abrir app"/"Dispensar" das notificações
// disparadas via reg.showNotification() (app-secretaria.js, app-boletos.js)
self.addEventListener('notificationclick', function(e) {
  e.notification.close();
  if (e.action === 'dispensar') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list) {
      for (var i = 0; i < list.length; i++) {
        if ('focus' in list[i]) return list[i].focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
