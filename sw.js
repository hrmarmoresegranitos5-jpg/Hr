// ═══════════════════════════════════════════════════════
// HR Mármores e Granitos — Service Worker v2
// Sempre busca da rede — sem cache de arquivos do app
// ═══════════════════════════════════════════════════════

var CACHE_NAME = 'hr-nocache-v2';

// INSTALL: skipWaiting imediato
self.addEventListener('install', function(e) {
  e.waitUntil(self.skipWaiting());
});

// ACTIVATE: apaga TODOS os caches antigos e assume controle
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(key) {
        return caches.delete(key);
      }));
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// FETCH: sempre vai à rede — sem servir do cache
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.startsWith('chrome-extension://')) return;

  e.respondWith(
    fetch(e.request, { cache: 'no-store' })
      .catch(function() {
        // Offline: tenta cache como fallback de emergência
        return caches.match(e.request);
      })
  );
});

// MESSAGE: compatibilidade
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
