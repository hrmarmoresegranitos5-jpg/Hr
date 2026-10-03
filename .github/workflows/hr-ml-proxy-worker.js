// ══════════════════════════════════════════════════════════════
// hr-ml-proxy — Cloudflare Worker
// HR Mármores e Granitos
// ──────────────────────────────────────────────────────────────
// O que faz:
//  - Recebe  GET /?url=<URL alvo>  (chamado pelo app-ml-import.js)
//  - Se o alvo é api.mercadolibre.com: busca (e cacheia em memória)
//    um token de app via OAuth client_credentials, e anexa
//    "Authorization: Bearer <token>" antes de repassar. Isso é
//    necessário porque o ML hoje bloqueia /items/{id} sem token,
//    mesmo pra anúncios públicos.
//  - Pra qualquer outro domínio (ex.: páginas HTML do ML, usadas
//    só pra resolver link curto / scraping leve): repassa direto,
//    sem autenticação — não precisa e não tem token de usuário mesmo.
//  - Sempre devolve com CORS liberado (Access-Control-Allow-Origin: *)
//    e trata o preflight OPTIONS.
//
// CONFIGURAR NO CLOUDFLARE (Worker → Settings → Variables):
//   ML_CLIENT_ID      (texto)      → do seu app em developers.mercadolivre.com.br
//   ML_CLIENT_SECRET  (Encrypt!)   → idem — marcar como "Encrypt" / secret
//
// Ou via wrangler:
//   wrangler secret put ML_CLIENT_ID
//   wrangler secret put ML_CLIENT_SECRET
// ══════════════════════════════════════════════════════════════

// Token cacheado no escopo do módulo — sobrevive enquanto o isolate
// ficar "quente"; quando expira (ou o isolate é reciclado), busca de novo.
let _tokenCache = { value: '', exp: 0 };

async function getAppToken(env) {
  const agora = Date.now();
  if (_tokenCache.value && agora < _tokenCache.exp) return _tokenCache.value;

  if (!env.ML_CLIENT_ID || !env.ML_CLIENT_SECRET) {
    console.warn('ML_CLIENT_ID/ML_CLIENT_SECRET não configurados — seguindo sem token.');
    return '';
  }

  const resp = await fetch('https://api.mercadolibre.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: env.ML_CLIENT_ID,
      client_secret: env.ML_CLIENT_SECRET
    })
  });

  const data = await resp.json().catch(() => null);
  if (!resp.ok || !data || !data.access_token) {
    console.error('Falha ao obter token ML:', resp.status, JSON.stringify(data).slice(0, 300));
    _tokenCache = { value: '', exp: 0 };
    return '';
  }

  // expires_in vem em segundos (normalmente 21600 = 6h); renova 2min antes de vencer
  const ttlMs = Math.max(60, (Number(data.expires_in) || 21600) - 120) * 1000;
  _tokenCache = { value: data.access_token, exp: agora + ttlMs };
  return _tokenCache.value;
}

function comCors(resp) {
  const h = new Headers(resp.headers);
  h.set('Access-Control-Allow-Origin', '*');
  h.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
  h.set('Access-Control-Allow-Headers', '*');
  return new Response(resp.body, { status: resp.status, statusText: resp.statusText, headers: h });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return comCors(new Response(null, { status: 204 }));
    }

    const reqUrl = new URL(request.url);
    const alvoRaw = reqUrl.searchParams.get('url');
    if (!alvoRaw) {
      return comCors(new Response(JSON.stringify({ error: 'parâmetro ?url= ausente' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      }));
    }

    let alvo;
    try { alvo = new URL(alvoRaw); }
    catch (e) {
      return comCors(new Response(JSON.stringify({ error: 'URL inválida' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      }));
    }

    // Só repassa pra domínios do Mercado Livre/Mercado Libre — evita virar
    // proxy aberto pra qualquer site.
    const host = alvo.hostname.toLowerCase();
    const ehML = /(^|\.)mercadolivre\.com(\.br)?$/.test(host) ||
                 /(^|\.)mercadolibre\.com$/.test(host) ||
                 /(^|\.)mlstatic\.com$/.test(host);
    if (!ehML) {
      return comCors(new Response(JSON.stringify({ error: 'domínio não permitido: ' + host }), {
        status: 403, headers: { 'Content-Type': 'application/json' }
      }));
    }

    const headers = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (compatible; HRProxy/1.0)' };

    // Autentica só as chamadas à API — páginas HTML (scraping/resolução de
    // link curto) seguem sem token, que é como já funcionavam.
    if (host === 'api.mercadolibre.com') {
      const token = await getAppToken(env);
      if (token) headers.Authorization = 'Bearer ' + token;
    }

    try {
      const resp = await fetch(alvo.toString(), { headers, redirect: 'follow' });
      return comCors(resp);
    } catch (e) {
      return comCors(new Response(JSON.stringify({ error: 'falha ao buscar: ' + e.message }), {
        status: 502, headers: { 'Content-Type': 'application/json' }
      }));
    }
  }
};
