// checar-cubas-ml.cjs (raiz do repositório)
// Roda 1x/dia via GitHub Actions (mesmo esquema do checar-boletos.js).
//
// O que faz:
//  1. Lê as cubas (cfg.coz e cfg.lav) de cada código de sincronização em /hr
//  2. Pra cada cuba que tem link/ID do Mercado Livre, consulta o anúncio
//     (status, estoque, preço)
//  3. Grava o resultado em hr/<codigo>/mlStatus/<idDaCuba>  — NÓ SEPARADO,
//     nunca mexe no cfg (evita conflito com o sync do app)
//  4. Manda push (FCM) quando: esgotou / pausou / voltou ao estoque / preço mudou
//
// Secrets do GitHub:
//   FIREBASE_SERVICE_ACCOUNT  (obrigatório — o mesmo do checar-boletos)
//   ML_CLIENT_ID, ML_CLIENT_SECRET  (recomendado — app criado em developers.mercadolivre.com.br;
//                                    usado só pra ler anúncios públicos)
//   ML_PROXY  (opcional — URL do seu Cloudflare Worker, ex.: https://hr-ml-proxy.hrproplay.workers.dev/
//              usado como plano B se o ML bloquear o IP do GitHub)

const admin = require('firebase-admin');

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://orcamento-hr-marmoraria-default-rtdb.firebaseio.com'
});

const ML_API = 'https://api.mercadolibre.com';
const CLIENT_ID = process.env.ML_CLIENT_ID || '';
const CLIENT_SECRET = process.env.ML_CLIENT_SECRET || '';
const PROXY = process.env.ML_PROXY || '';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fmtBRL = (n) => 'R$ ' + Number(n || 0).toFixed(2).replace('.', ',');
const chaveFb = (id) => String(id).replace(/[.#$\[\]\/]/g, '_'); // TEM que ser igual ao mlKey() do app

// ───────────── Acesso ao ML ─────────────
let _token = null;
async function getToken() {
  if (_token !== null) return _token;
  if (!CLIENT_ID || !CLIENT_SECRET) { _token = ''; return _token; }
  try {
    const r = await fetch(ML_API + '/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ grant_type: 'client_credentials', client_id: CLIENT_ID, client_secret: CLIENT_SECRET })
    });
    const j = await r.json();
    _token = j.access_token || '';
    if (!_token) console.warn('Token ML não veio:', JSON.stringify(j).slice(0, 200));
  } catch (e) {
    console.warn('Falha ao obter token ML:', e.message);
    _token = '';
  }
  return _token;
}

// Uma tentativa de fetch, com timeout — uma rede lenta no runner do
// GitHub não pode travar a checagem inteira.
async function fetchComTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms || 10000);
  try { return await fetch(url, { ...opts, signal: ctrl.signal }); }
  finally { clearTimeout(timer); }
}

// Devolve { http, json } ou lança erro de rede. Tenta direto (com token) e
// depois pelo proxy; cada canal tem 1 nova tentativa antes de desistir dele —
// falhas de rede transitórias (comuns em runners compartilhados) não devem
// virar "erro" pra uma cuba que na verdade está tudo bem.
async function mlGet(path) {
  const url = ML_API + path;
  const tentativas = [];
  const tk = await getToken();
  tentativas.push({ label: 'direto', url, headers: tk ? { Authorization: 'Bearer ' + tk } : {} });
  if (PROXY) tentativas.push({ label: 'proxy', url: PROXY + '?url=' + encodeURIComponent(url), headers: {} });

  let ultimoErro = null;
  for (const t of tentativas) {
    for (let tentativa = 1; tentativa <= 2; tentativa++) {
      try {
        const r = await fetchComTimeout(t.url, { headers: { Accept: 'application/json', ...t.headers } }, 10000);
        if (r.status === 404 || r.status === 410) return { http: r.status, json: null };
        if (!r.ok) { ultimoErro = new Error('HTTP ' + r.status + ' (' + t.label + ')'); break; } // erro do servidor: repetir não ajuda
        const txt = await r.text();
        try { return { http: 200, json: JSON.parse(txt) }; }
        catch (_) { ultimoErro = new Error('resposta não-JSON (' + t.label + ')'); break; }
      } catch (e) {
        ultimoErro = new Error((e.name === 'AbortError' ? 'timeout' : e.message) + ' (' + t.label + ', tentativa ' + tentativa + ')');
        if (tentativa === 1) await sleep(500); // rede transitória: espera um instante e tenta de novo antes de trocar de canal
      }
    }
  }
  throw ultimoErro || new Error('falha desconhecida');
}

// ───────────── Descobrir o ID do anúncio ─────────────
function extrairId(raw) {
  const full = String(raw || '').trim();
  if (!full) return null;
  const url = full.split('#')[0];
  let m;
  m = full.match(/[?&#]wid=(MLB\d+)/i);            if (m) return { id: m[1].toUpperCase(), catalogo: false };
  m = full.match(/item_id:(MLB\d+)/i);             if (m) return { id: m[1].toUpperCase(), catalogo: false };
  m = url.match(/\/p\/(MLB\d+)/i);                 if (m) return { id: m[1].toUpperCase(), catalogo: true };
  m = url.match(/MLB-?(\d{7,})/i);                 if (m) return { id: 'MLB' + m[1], catalogo: false };
  m = full.match(/^(MLB\d+)$/i);                   if (m) return { id: m[1].toUpperCase(), catalogo: false };
  return null;
}

async function resolverLinkCurto(url) {
  const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HRBot/1.0)' } });
  const finalUrl = r.url || '';
  let info = extrairId(finalUrl);
  if (info) return info;
  const html = await r.text();
  const m = html.match(/MLB-?(\d{8,})/);
  if (m) return { id: 'MLB' + m[1], catalogo: /\/p\/MLB/i.test(html) };
  return null;
}

const _cacheCatalogo = {};
async function itemDoCatalogo(catalogId) {
  if (_cacheCatalogo[catalogId]) return _cacheCatalogo[catalogId];
  const r = await mlGet('/products/' + catalogId);
  const id = r.json && ((r.json.buy_box_winner && r.json.buy_box_winner.item_id) || null);
  if (id) _cacheCatalogo[catalogId] = id;
  return id;
}

async function descobrirItemId(cuba) {
  if (cuba._ml_id && /^MLB\d+$/i.test(cuba._ml_id)) return String(cuba._ml_id).toUpperCase();
  const url = cuba._ml_url || '';
  let info = extrairId(url);
  if (!info && /mercadoli[bv]re|\/sec\//i.test(url)) info = await resolverLinkCurto(url);
  if (!info) return null;
  if (info.catalogo) return await itemDoCatalogo(info.id);
  return info.id;
}

// ───────────── Consulta de uma cuba ─────────────
async function consultarCuba(cuba) {
  const itemId = await descobrirItemId(cuba);
  if (!itemId) return { erro: 'não consegui identificar o anúncio a partir do link' };
  const r = await mlGet('/items/' + itemId);
  if (r.http === 404 || r.http === 410 || !r.json) {
    return { itemId, status: 'removido', qtd: 0, preco: null, checkedAt: Date.now() };
  }
  const it = r.json;
  // Descrição (plain_text). Se falhar, segue sem ela — não derruba a checagem.
  let desc = '', descHash = '';
  try {
    const d = await mlGet('/items/' + itemId + '/description');
    desc = String((d.json && d.json.plain_text) || '').trim().slice(0, 1000);
    if (desc) { let h = 5381; for (let i = 0; i < desc.length; i++) h = ((h * 33) ^ desc.charCodeAt(i)) >>> 0; descHash = String(h); }
  } catch (_) { /* ignora */ }
  return {
    itemId,
    status: it.status || 'desconhecido',          // active | paused | closed | under_review ...
    subStatus: Array.isArray(it.sub_status) ? it.sub_status.join(',') : '',
    qtd: Number(it.available_quantity || 0),
    preco: Number(it.price || 0),
    titulo: it.title || '',
    desc,
    descHash,
    checkedAt: Date.now()
  };
}

const disponivel = (s) => s && s.status === 'active' && s.qtd > 0;

// ───────────── Main ─────────────
async function main() {
  const db = admin.database();
  const raiz = await db.ref('hr').get();
  if (!raiz.exists()) { console.log('Nenhum dado em /hr.'); return; }
  const dados = raiz.val();

  for (const codigo of Object.keys(dados)) {
    const reg = dados[codigo] || {};
    const cfg = reg.cfg || {};
    const cubas = []
      .concat(Object.values(cfg.coz || {}), Object.values(cfg.lav || {}))
      .filter((c) => c && c.id && (c._ml_url || c._ml_id));
    if (!cubas.length) { console.log('Código ' + codigo + ': nenhuma cuba com link do ML.'); continue; }

    const anterior = reg.mlStatus || {};
    const notif = reg.mlNotifState || {};
    const notifNovo = JSON.parse(JSON.stringify(notif));
    const novo = {};
    const eventos = [];

    console.log('Código ' + codigo + ': checando ' + cubas.length + ' cuba(s)…');

    for (const c of cubas) {
      const k = chaveFb(c.id);
      const nome = ((c.brand ? c.brand + ' ' : '') + (c.nm || 'Cuba')).trim();
      let res;
      try {
        res = await consultarCuba(c);
      } catch (e) {
        res = { erro: e.message };
      }
      await sleep(350); // educado com a API do ML

      if (res.erro) {
        // Não sobrescreve o último resultado bom — só anota o erro
        novo[k] = { ...(anterior[k] || {}), erro: res.erro, erroEm: Date.now() };
        console.warn('  ! ' + nome + ': ' + res.erro);
        continue;
      }
      if (!res.desc && anterior[k] && anterior[k].desc) { res.desc = anterior[k].desc; res.descHash = anterior[k].descHash || ''; }
      novo[k] = res;

      const prev = anterior[k];
      const nEst = notifNovo[k] || (notifNovo[k] = {});
      const ok = disponivel(res);

      // Esgotou / pausou
      if (!ok && !nEst.indisp) {
        const motivo = res.status === 'removido' ? 'anúncio removido'
          : res.status === 'active' ? 'sem estoque'
          : res.status === 'paused' ? 'anúncio pausado' : 'anúncio ' + res.status;
        eventos.push({ titulo: '🔴 Cuba indisponível no ML', corpo: nome + ' — ' + motivo, tag: 'ml-indisp-' + k });
        nEst.indisp = true;
      }
      // Voltou
      if (ok && nEst.indisp) {
        eventos.push({ titulo: '🟢 Cuba voltou ao estoque', corpo: nome + ' — ' + fmtBRL(res.preco), tag: 'ml-volta-' + k });
        nEst.indisp = false;
      }
      // Preço mudou (compara com o custo que o app tem registrado; se não tiver, com a checagem anterior)
      if (res.preco > 0) {
        const base = Number(c._ml_preco_custo) > 0 ? Number(c._ml_preco_custo) : (prev && prev.preco > 0 ? prev.preco : 0);
        if (base > 0 && Math.abs(res.preco - base) >= 0.5 && nEst.preco !== res.preco) {
          eventos.push({
            titulo: '🟡 Preço mudou no ML',
            corpo: nome + ': ' + fmtBRL(base) + ' → ' + fmtBRL(res.preco) + ' (abra a cuba pra aprovar)',
            tag: 'ml-preco-' + k
          });
          nEst.preco = res.preco;
        }
      }
    }

    // Grava o resultado (só as cubas checadas; remove entradas de cubas que perderam o link)
    const idsAtuais = new Set(cubas.map((c) => chaveFb(c.id)));
    const atualizacao = {};
    Object.keys(novo).forEach((k) => { atualizacao[k] = novo[k]; });
    Object.keys(anterior).forEach((k) => { if (!idsAtuais.has(k)) atualizacao[k] = null; });
    await db.ref('hr/' + codigo + '/mlStatus').update(atualizacao);
    await db.ref('hr/' + codigo + '/mlNotifState').set(notifNovo);

    // Push
    const tokens = reg.fcmTokens ? Object.keys(reg.fcmTokens) : [];
    if (!eventos.length) { console.log('  nada novo pra avisar.'); continue; }
    if (!tokens.length) { console.log('  ' + eventos.length + ' evento(s), mas nenhum dispositivo com push.'); continue; }

    const msgs = eventos.length <= 3 ? eventos : [{
      titulo: '🛒 ' + eventos.length + ' mudanças nas cubas (ML)',
      corpo: eventos.slice(0, 3).map((e) => e.corpo).join(' • ') + ' …',
      tag: 'ml-resumo'
    }];
    for (const m of msgs) {
      try {
        const r = await admin.messaging().sendEachForMulticast({
          tokens,
          notification: { title: m.titulo, body: m.corpo },
          data: { tag: m.tag }
        });
        console.log('  push: ' + m.titulo + ' — ' + r.successCount + '/' + tokens.length);
      } catch (e) {
        console.error('  erro no push:', e.message);
      }
    }
  }
}

main()
  .then(() => { console.log('Checagem das cubas concluída.'); process.exit(0); })
  .catch((e) => { console.error('Erro geral:', e); process.exit(1); });
