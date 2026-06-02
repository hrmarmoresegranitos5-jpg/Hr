// ═══════════════════════════════════════════════════════
// HR Mármores e Granitos — Service Worker v3
// Network-first com fallback offline para index.html
// ═══════════════════════════════════════════════════════

var CACHE_NAME = 'hr-shell-v5';
// Apenas o shell mínimo para não quebrar offline
var SHELL_FILES = [
  './',
  './index.html'
];

// INSTALL: pré-cacheia o shell mínimo e ativa imediatamente
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_FILES);
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

// FETCH: sempre tenta rede primeiro (sem cache de resposta)
// Se offline: fallback para index.html (evita tela preta "falha de conexão")
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension://')) return;

  // Requisições de API/externas: só rede, sem fallback
  var url = e.request.url;
  var isExternal = url.indexOf('googleapis.com') !== -1 ||
                   url.indexOf('anthropic.com') !== -1 ||
                   url.indexOf('groq.com') !== -1 ||
                   url.indexOf('supabase.co') !== -1;
  if (isExternal) return; // deixa o browser lidar normalmente

  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .catch(function() {
        // Offline: tenta o arquivo em cache, senão retorna index.html
        return caches.match(e.request).then(function(cached) {
          if (cached) return cached;
          // Fallback final: index.html — evita Response undefined (tela preta)
          return caches.match('./index.html');
        });
      })
  );
});

// MESSAGE: compatibilidade com pwa.js
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
