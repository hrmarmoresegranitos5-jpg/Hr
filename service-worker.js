// service-worker.js — Ceará Planejados
const CACHE_NAME = 'cear-v57';
// IMPORTANTE: c.addAll() falha por inteiro se QUALQUER item aqui der 404 —
// isso fazia o SW nunca instalar/ativar e o app ficar servindo cache velho
// (inclusive assets do HR Mármores, quando os dois apps dividiam pasta).
// Assim que os módulos abaixo marcados forem restaurados, adicione-os de volta.
const ASSETS = [
  './',
  './index.html',
  './manifest-cear.json',
  './icon-192-cear.png',
  './icon-512-cear.png',
  './apple-touch-icon-cear.png',
  './favicon-32x32-cear.png',
  './favicon-16x16-cear.png',
  './cear-logo.js',
  './cear-dados.js',
  './cear-helpers.js',
  './cear-orc.js',
  './cear-historico.js',
  './cear-modais.js',
  './cear-app.js',
  // ainda faltando no repo — re-adicionar aqui quando existirem:
  // './cear-db.js',
  // './cear-home.js',
  // './cear-cad.js',
  // './cear-financeiro.js',
  // './cear-clientes.js',
  // './cear-config.js',
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ASSETS)));
});

self.addEventListener('message', e => { if (e.data === 'skipWaiting') self.skipWaiting(); });

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        if (!resp || resp.status !== 200 || resp.type !== 'basic') return resp;
        const clone = resp.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
