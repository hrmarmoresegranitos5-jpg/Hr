// ═══════════════════════════════════════════════════════
// HR Mármores e Granitos — Service Worker
// ═══════════════════════════════════════════════════════

var CACHE_VERSION = 'hr-app-v15';

// Arquivos do app shell — cacheados para funcionar offline
var APP_SHELL = [
  '/Aplicativo-/index.html',
  '/Aplicativo-/styles.css',
  '/Aplicativo-/manifest.json',
  '/Aplicativo-/icon-192.png',
  '/Aplicativo-/icon-512.png',
  '/Aplicativo-/data-cuba-imgs.js',
  '/Aplicativo-/data-defaults.js',
  '/Aplicativo-/app-init.js',
  '/Aplicativo-/app-orcamento.js',
  '/Aplicativo-/app-financas.js',
  '/Aplicativo-/app-catalogos.js',
  '/Aplicativo-/app-config.js',
  '/Aplicativo-/app-contrato.js',
  '/Aplicativo-/fechamento.js',
  '/Aplicativo-/app-boletos.js',
  '/Aplicativo-/app-ai-utils.js',
  '/Aplicativo-/pwa.js'
];

// ── INSTALL: pré-cacheia o app shell ──
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function(cache) {
      // Cacheia cada arquivo individualmente para não falhar tudo se um file falhar
      return Promise.all(
        APP_SHELL.map(function(url) {
          return fetch(url, { cache: 'no-store' })
            .then(function(res) {
              if (res.ok) return cache.put(url, res);
            })
            .catch(function() {
              // Ignora falha individual — não bloqueia instalação
            });
        })
      );
    }).then(function() {
      // Ativa imediatamente sem esperar abas fecharem
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE: remove caches de versões antigas ──
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_VERSION) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      // Avisa todas as abas que o SW novo assumiu controle
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_VERSION });
        });
      });
    })
  );
});

// ── MESSAGE: força atualização imediata quando solicitado ──
self.addEventListener('message', function(e) {
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── FETCH: Network-first com fallback para cache ──
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // Só intercepta GET — deixa POST/PUT/DELETE passar direto
  if (req.method !== 'GET') return;

  // Não intercepta requests de extensões do browser ou chrome-extension
  if (req.url.startsWith('chrome-extension://')) return;

  // Fontes externas (Google Fonts, CDN): cache-first, sem expirar
  var isExternal = req.url.startsWith('https://fonts.') ||
                   req.url.startsWith('https://cdnjs.') ||
                   req.url.indexOf('googleapis.com') > -1 ||
                   req.url.indexOf('gstatic.com') > -1;

  if (isExternal) {
    e.respondWith(
      caches.match(req).then(function(cached) {
        if (cached) return cached;
        return fetch(req).then(function(res) {
          if (res && res.ok) {
            var clone = res.clone();
            caches.open(CACHE_VERSION).then(function(c) { c.put(req, clone); });
          }
          return res;
        }).catch(function() {
          return new Response('', { status: 408 });
        });
      })
    );
    return;
  }

  // Arquivos do app: Network-first → se rede falhar, usa cache → se cache vazio, mostra fallback
  e.respondWith(
    fetch(req, { cache: 'no-store' })
      .then(function(res) {
        // Atualiza cache com versão nova da rede
        if (res && res.ok) {
          var clone = res.clone();
          caches.open(CACHE_VERSION).then(function(c) { c.put(req, clone); });
        }
        return res;
      })
      .catch(function() {
        // Rede falhou — tenta cache
        return caches.match(req).then(function(cached) {
          if (cached) return cached;

          // Sem cache: retorna página de offline amigável para navegação HTML
          var accept = req.headers.get('accept') || '';
          if (accept.indexOf('text/html') > -1) {
            return new Response(OFFLINE_HTML, {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }

          // Para outros recursos (JS, CSS, imagens): 503 simples
          return new Response('', { status: 503 });
        });
      })
  );
});

// ── OFFLINE FALLBACK HTML ──
var OFFLINE_HTML = '<!DOCTYPE html><html lang="pt-BR"><head>' +
  '<meta charset="UTF-8">' +
  '<meta name="viewport" content="width=device-width,initial-scale=1">' +
  '<meta name="theme-color" content="#C9A84C">' +
  '<meta name="apple-mobile-web-app-capable" content="yes">' +
  '<title>HR Mármores</title>' +
  '<style>' +
  '*{box-sizing:border-box;margin:0;padding:0}' +
  'body{background:#070709;color:#F4EFE8;font-family:Outfit,sans-serif;' +
  '  display:flex;align-items:center;justify-content:center;' +
  '  min-height:100vh;padding:24px;text-align:center}' +
  '.card{background:#0f0c00;border:1px solid rgba(201,168,76,0.3);' +
  '  border-radius:20px;padding:40px 32px;max-width:360px;width:100%}' +
  '.logo{font-size:2rem;font-weight:900;color:#C9A84C;margin-bottom:6px}' +
  '.sub{font-size:.7rem;letter-spacing:3px;text-transform:uppercase;' +
  '  color:rgba(201,168,76,0.4);margin-bottom:32px}' +
  '.icon{font-size:3rem;margin-bottom:16px}' +
  'h2{font-size:1.1rem;font-weight:700;margin-bottom:10px}' +
  'p{font-size:.85rem;color:rgba(244,239,232,0.55);line-height:1.6;margin-bottom:28px}' +
  'button{background:#C9A84C;color:#000;border:none;border-radius:12px;' +
  '  padding:14px 28px;font-size:.9rem;font-weight:700;cursor:pointer;width:100%;' +
  '  font-family:Outfit,sans-serif;letter-spacing:.5px}' +
  'button:active{opacity:.85}' +
  '</style></head><body>' +
  '<div class="card">' +
  '  <div class="logo">HR Mármores</div>' +
  '  <div class="sub">Mármores · Granitos · Quartzito</div>' +
  '  <div class="icon">📡</div>' +
  '  <h2>Sem conexão</h2>' +
  '  <p>O aplicativo precisa de internet para carregar.<br>' +
  '     Verifique sua conexão e tente novamente.</p>' +
  '  <button onclick="window.location.reload()">Tentar novamente</button>' +
  '</div>' +
  '</body></html>';
