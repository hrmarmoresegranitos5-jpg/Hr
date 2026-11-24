// ══════════════════════════════════════════════════════════════════════
// v312 · CONTROLE DA TV (tablet do balcão) — /totem?k=TOKEN
// v313: virou o controle da TV para o Sr. Hangel explicar ao cliente: explicações ilustradas (rebaixo americano, cubas,
// acabamentos...), fotos e modelos, pedras, fotos e vídeos do próprio tablet e o Pix com QR code na TV. O tablet mostra o espelho da TV.
// (Abaixo ficam também as rotas do atendimento sozinho da v312, que a página nova não usa.)
// Tela de descanso com fotos dos trabalhos e das pedras; o cliente toca e escolhe: fazer orçamento (ambiente → pedra →
// cuba → medidas → nome e WhatsApp), ver pedras, ver modelos, falar com a Helena (voz e texto) ou chamar alguém da equipe.
// O orçamento vira um "projeto do site" (protocolo LOJA-…): o dono é avisado e a Helena já chama o cliente no WhatsApp.
// Link: comando do dono "link do totem" ou o app (Configurações → Totem da loja).
// ══════════════════════════════════════════════════════════════════════
const TOTEM_VER = 'v316';
const TOTEM_IC = { 192: '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', 512: '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' };
const TOTEM_SW = "self.addEventListener('install',e=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>{if(e.request.method!=='GET')return;e.respondWith(fetch(e.request).catch(()=>new Response('<html><body style=\"background:#0b0b0e;color:#ecd27c;font:24px sans-serif;display:grid;place-items:center;height:100vh;margin:0\">Sem internet no tablet. Confira o Wi-Fi.</body></html>',{headers:{'Content-Type':'text/html; charset=utf-8'}})));});";
async function totemToken(env, novo) {
  let t = novo ? '' : await env.HR_KV.get('totem:tok');
  if (!t) { t = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 18); await env.HR_KV.put('totem:tok', t); }
  return t;
}
async function totemLink(env, novo) { return (await urlPublica(env)) + '/totem?k=' + await totemToken(env, novo); }
async function totemStatusTxt(env) {
  let p = null; try { p = JSON.parse((await env.HR_KV.get('totem:ping')) || 'null'); } catch (_) {}
  if (!p) return 'O controle da TV ainda não foi aberto no tablet.';
  const min = Math.round((Date.now() - p.em) / 60000);
  return min <= 6 ? 'O controle da TV está aberto no tablet agora.' : `O controle da TV foi visto ligado pela última vez há ${min < 120 ? min + ' min' : Math.round(min / 60) + ' h'}.`;
}
async function totemComandoDono(env, from, msg) {
  const n = normaliza(msg);
  if (!(/\btotem\b/.test(n) || /\bcontrole d[ae] (tv|televisao)\b/.test(n)) || n.length > 80) return false;
  if (/\b(novo|trocar|troca|outro) link\b/.test(n)) { await enviar(env, from, `Link novo do controle da TV (o antigo parou de funcionar):\n${await totemLink(env, true)}\n\nAbra no tablet, no Chrome, e toque em ⋮ → "Adicionar à tela inicial" → Instalar.`); return true; }
  if (/\b(link|abrir|abre|endereco|status|ligado|como esta)\b/.test(n)) {
    await enviar(env, from, `📺 *Tablet do balcão*\nApp no modo balcão (orçamento, histórico e controle da TV): https://hrmarmoresegranitos5-jpg.github.io/Hr/?balcao=1\nEntre com a conta Google da HR para sincronizar.\n\nSó o controle da TV:\n${await totemLink(env)}\n\n${await totemStatusTxt(env)}\n\nNo tablet: abra o link no Chrome → ⋮ → "Adicionar à tela inicial" → Instalar, e abra pelo ícone. Para trocar o link: "novo link do totem".`);
    return true;
  }
  return false;
}
// mensagem do cliente que fez o pedido no balcão: dentro das 24 h vai direto; fora, pelo modelo aprovado
async function totemChamarCliente(env, tel, nome, oque) {
  const pn = nomeDeTratamento(nome) || '';
  const txt = `${pn ? 'Oi, ' + pn + '! ' : 'Oi! '}Aqui é a Helena, da ${env.EMPRESA || 'HR Mármores e Granitos'}. Recebi o seu pedido de orçamento feito aqui na loja (${oque}). Vou continuar o seu atendimento por aqui, tudo bem?`;
  env._ctx = env._ctx || {}; env._recebidoEm = Date.now() - 60000; const pend = []; env._waitUntil = x => pend.push(x);
  if (await janela24h(env, tel).catch(() => false)) await enviar(env, tel, txt);
  else await postarMsg(env, tel, { type: 'template', template: { name: env.TEMPLATE_RESPOSTA || String(env.TEMPLATE_RESPOSTA_PADRAO || 'resposta_cliente'), language: { code: env.TEMPLATE_RESPOSTA_IDIOMA || env.TEMPLATE_IDIOMA || 'pt_BR' }, components: [{ type: 'body', parameters: [{ type: 'text', text: semEmoji(txt).slice(0, 200) }] }] } });
  await Promise.allSettled(pend);
  await semearConversaProativa(env, tel, txt).catch(() => {});
  return true;
}
let _totemCtx = null, _totemCtxEm = 0;
async function totemContexto(env) {
  if (_totemCtx && Date.now() - _totemCtxEm < 10 * 60000) return _totemCtx;
  const cat = await siteLerCatalogo(env), preco = String(env.PORTFOLIO_PRECO ?? '1') !== '0';
  const pedras = [];
  if (cat) for (const x of cat.pedras || []) { if (x && x.nm && !x.oculto) pedras.push([String(x.nm).trim(), x.cat || '', preco && Number(x.pr) > 0 ? Number(x.pr) : 0]); }
  else for (const i of await lerPortfolio(env)) if (i && i.tipo === 'pedra' && i.nome && !pedras.some(p => normaliza(p[0]) === normaliza(i.nome))) pedras.push([i.nome, i.tp || '', preco && Number(i.preco) > 0 ? Number(i.preco) : 0]);
  const e = (cat && cat.emp) || {};
  _totemCtx = {
    loja: [e.end && 'Endereço: ' + e.end, e.cidade && 'Cidade: ' + e.cidade, e.horario && 'Horário: ' + e.horario, e.ig && 'Instagram: ' + e.ig].filter(Boolean).join('\n'),
    pedras: pedras.slice(0, 120).map(p => `${p[0]}${p[1] ? ' · ' + p[1] : ''}${p[2] ? ' · R$ ' + reais(p[2]) + '/m²' : ''}`).join('\n'),
    cubas: cat ? ((cat.cubas_coz || []).length + (cat.cubas_lav || []).length) : 0,
  };
  _totemCtxEm = Date.now(); return _totemCtx;
}
async function totemConversa(env, b) {
  const dia = 'totem:ia:' + dataBahia(), q = +(await env.HR_KV.get(dia)) || 0;
  if (q >= (+env.TOTEM_IA_DIA || 500)) return { fala: 'Agora eu não consigo conversar por aqui. Toque em "Chamar atendente" que alguém da equipe já vem te atender.', abrir: 'atendente' };
  await env.HR_KV.put(dia, String(q + 1), { expirationTtl: 3 * 86400 });
  const texto = String(b.texto || '').replace(/\s+/g, ' ').trim().slice(0, 500);
  if (!texto) return { fala: 'Não entendi. Pode repetir?' };
  const c = await totemContexto(env), emp = env.EMPRESA || 'HR Mármores e Granitos';
  const sis = `Você é a Helena, atendente virtual da ${emp} (marmoraria). Agora você está falando com um cliente PESSOALMENTE, pelo totem (tablet) no balcão da loja. Sua resposta é FALADA em voz alta e aparece escrita na tela.
COMO FALAR:
- 1 a 3 frases curtas, português falado da Bahia, simpática e natural ("tá", "pra", "a gente", "olha"), sem emoji, sem listas, sem markdown, sem asteriscos.
- Pergunta termina com "?". Não se apresente de novo se já se apresentou.
O QUE VOCÊ FAZ:
- Tira dúvidas sobre pedras (granito, mármore, quartzo, quartzito, ultracompacto), acabamentos (reto, boleado, meia-esquadria 45°, rebaixo), cubas, nichos, soleiras, peitoris, bancadas, escadas, túmulos, cuidados e limpeza.
- Preço: pode dizer o valor do m² das pedras da lista abaixo como referência ("o m² do X tá R$ Y"), deixando claro que o valor final depende das medidas, recortes, acabamento e instalação. NUNCA invente preço, prazo, desconto ou pedra que não está na lista. Prazo e forma de pagamento: a equipe confirma no orçamento.
- Para orçamento: convide a tocar em "Fazer orçamento" (abrir="orcamento"): lá a pessoa escolhe o ambiente e a pedra e deixa o WhatsApp, e você continua o atendimento pelo WhatsApp com o orçamento completo.
- Para ver pedras: abrir="pedras" ou com cor: "pedras:pretas", "pedras:brancas", "pedras:cinzas", "pedras:bege", "pedras:verdes", "pedras:azuis".
- Para ver fotos de trabalhos: "modelos:cozinha" (também banheiro, lavabo, escada, soleira, nicho, gourmet, servico, mesa, tumulo, varanda, piso).
- Quer falar com uma pessoa, pagar, retirar ou buscar pedido, reclamar, ou é algo que você não resolve: abrir="atendente" e diga que já chamou alguém da equipe pra atender no balcão.
- Situação de pedido ou pagamento: por privacidade você não consulta aqui no totem; chame o atendente.
- Nunca peça CPF, documento, senha ou cartão. Assunto fora da marmoraria: responda curto e gentil e volte ao atendimento.
Responda SOMENTE com JSON: {"fala":"...","abrir":null}
${c.loja ? '\nDADOS DA LOJA:\n' + c.loja : ''}
\nPEDRAS DISPONÍVEIS (nome · tipo · valor do m²):\n${c.pedras || '(lista indisponível agora: não cite valores)'}
${c.cubas ? '\nTemos ' + c.cubas + ' modelos de cuba para escolher no orçamento.' : ''}
Hoje: ${dataBahia()}.`;
  const hist = [];
  for (const h of (Array.isArray(b.hist) ? b.hist : []).slice(-10)) {
    const role = h && h.r === 'h' ? 'assistant' : 'user', content = String((h && h.t) || '').slice(0, 600);
    if (!content || (!hist.length && role === 'assistant')) continue;
    if (hist.length && hist[hist.length - 1].role === role) hist[hist.length - 1].content += '\n' + content; else hist.push({ role, content });
  }
  if (hist.length && hist[hist.length - 1].role === 'user') hist.pop();
  let out = '';
  try { out = await chamarIA(env, sis, hist, texto, { maxTokens: 350, timeoutMs: 20000, cat: 'totem' }); }
  catch (e) { console.log('[TOTEM] IA:', e.message); return { fala: 'Deu uma falha aqui na minha conexão. Pode perguntar de novo?' }; }
  let j = null; try { j = lerJsonIA(out); } catch (_) {}
  let fala = String((j && j.fala) || out || '').replace(/[*_#`]/g, '').replace(/^\s*\{[\s\S]*$/, '').trim().slice(0, 600);
  if (!fala) fala = 'Pode repetir, por favor?';
  const abrir = j && typeof j.abrir === 'string' && /^(orcamento|pedras(:[a-z]+)?|modelos:[a-z_]+|atendente)$/.test(j.abrir) ? j.abrir : null;
  if (abrir === 'atendente') await totemAtendente(env, { motivo: texto }).catch(() => {});
  return { fala, abrir };
}
async function totemAtendente(env, b) {
  if (await env.HR_KV.get('totem:atend')) return { ok: true, ja: true };
  await env.HR_KV.put('totem:atend', '1', { expirationTtl: 90 });
  const motivo = String((b && b.motivo) || '').replace(/\s+/g, ' ').trim().slice(0, 200);
  await notificarDono(env, Date.now(), `🖥️ *Cliente no balcão* pediu atendimento pelo totem.${motivo ? '\nDisse: “' + motivo + '”' : ''}`);
  return { ok: true };
}
async function totemOuvir(env, req) {
  const chave = chaveVoz(env); if (!chave) return { erro: 'sem voz' };
  const tipo = String(req.headers.get('content-type') || 'audio/webm').split(';')[0];
  const buf = await req.arrayBuffer();
  if (!buf.byteLength || buf.byteLength > 3 * 1024 * 1024) return { erro: 'áudio inválido' };
  const ext = /mp4|m4a|aac/.test(tipo) ? 'm4a' : /ogg/.test(tipo) ? 'ogg' : /wav/.test(tipo) ? 'wav' : 'webm';
  const fd = new FormData();
  fd.append('file', new Blob([buf], { type: tipo }), 'fala.' + ext);
  fd.append('model', env.STT_MODEL || 'gpt-4o-transcribe'); fd.append('language', 'pt');
  fd.append('prompt', 'Cliente falando no balcão de uma marmoraria da Bahia: granito, mármore, quartzo, soleira, peitoril, bancada, cozinha, banheiro, cuba, nicho, metro quadrado, orçamento.');
  const r = await fetch('https://api.openai.com/v1/audio/transcriptions', { method: 'POST', headers: { Authorization: `Bearer ${chave}` }, body: fd });
  const j = await r.json().catch(() => null);
  if (!r.ok) return { erro: (j && j.error && j.error.message) || 'falha' };
  const texto = String((j && j.text) || '').trim();
  return { texto: /[Ѐ-ӿ֐-ۿ぀-ヿ一-鿿]/.test(texto) ? '' : texto };
}
// ── v313: o que o tablet coloca na TV (fica acima da galeria; o Pix fica acima de tudo) ──
async function telaShowLer(env) { try { const s = JSON.parse((await env.HR_KV.get('tela:show')) || 'null'); return s && Date.now() < (s.exp || 0) ? s : null; } catch (_) { return null; } }
function telaShowLimpo(b) {
  const t = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f]+/g, ' ').trim().slice(0, n);
  const tipo = ['expl', 'foto', 'video'].includes(b && b.tipo) ? b.tipo : '';
  if (!tipo) return null;
  const s = { tipo, tit: t(b.tit, 90), sub: t(b.sub, 160), num: b.num ? 1 : 0, etapa: t(b.etapa, 24) };
  if (tipo === 'expl') {
    s.pontos = (Array.isArray(b.pontos) ? b.pontos : []).slice(0, 8).map(x => t(x, 220)).filter(Boolean);
    const svg = String(b.svg || '');
    if (svg.length > 80000 || !/^<svg[\s>]/.test(svg) || /<script|<foreignobject|\bon[a-z]+\s*=|javascript:|<iframe|<image[^>]+href\s*=\s*"(?!\/)/i.test(svg)) return null;
    s.svg = svg;
  } else {
    const ok = u => /^\/(portfolio|tela)\/[\w\-.:%/]+$/.test(String(u || ''));
    s.itens = (Array.isArray(b.itens) ? b.itens : []).slice(0, 150).filter(x => x && ok(x.u)).map(x => ({ u: String(x.u), tit: t(x.tit, 90), leg: t(x.leg, 200), v: tipo === 'video' || !!x.v }));
    if (!s.itens.length) return null;
    s.i = Math.max(0, Math.min(s.itens.length - 1, Math.floor(+b.i || 0)));
  }
  return s;
}
async function telaArqLista(env) { try { return JSON.parse((await env.HR_KV.get('tela:arqs')) || '[]') || []; } catch (_) { return []; } }
// v316: a TV (página /tela no computador) avisa que está no ar; o tablet vê se ela está ligada e pode "acordar" (Cache da Cloudflare: sem gastar escrita do KV)
const TVHB = 'https://hr-interno/tv-hb', TVACORDA = 'https://hr-interno/tv-acorda';
let _tvHbUlt = 0;
async function tvBater(info) { if (Date.now() - _tvHbUlt < 8000) return; _tvHbUlt = Date.now(); try { await caches.default.put(TVHB, new Response(JSON.stringify({ em: Date.now(), ...info }), { headers: { 'Cache-Control': 'max-age=86400' } })); } catch (_) {} }
async function tvLerCache(k) { try { const r = await caches.default.match(k); return r ? await r.json() : null; } catch (_) { return null; } }
async function totemEstado(env) {
  const show = await telaShowLer(env), gal = await telaGalLer(env).catch(() => null);
  let pix = null; try { const px = await telaPixEstado(env); if (px) pix = { valor: px.valor, cli: px.cli, tipo: px.tipo, png: px.png, copia: px.copia, venceEm: px.venceEm, status: px.status }; } catch (_) {}
  return { ver: TOTEM_VER, show: show ? { id: show.id, tipo: show.tipo, tit: show.tit || (show.itens && show.itens[show.i || 0] ? show.itens[show.i || 0].tit : ''), i: show.i || 0, n: show.itens ? show.itens.length : 0, pontos: show.pontos || [] } : null,
    gal: gal ? { titulo: gal.titulo, n: (gal.itens || []).length } : null, pix, mp: mpAtivo(env), tela: (await urlPublica(env)) + '/tela?k=' + await telaToken(env) + '&mudo=1', tv: await tvLerCache(TVHB) };
}
async function totemTv(env, p, b, req) {
  if (p === '/totem/mostrar') {
    if (!b || b.limpar) { await env.HR_KV.delete('tela:show'); await env.HR_KV.delete('tela:gal'); return { ok: true }; }
    const s = telaShowLimpo(b); if (!s) return { ok: false, erro: 'Conteúdo inválido.' };
    s.id = Date.now().toString(36); s.exp = Date.now() + 3 * 3600000;
    await env.HR_KV.put('tela:show', JSON.stringify(s), { expirationTtl: 86400 }); await env.HR_KV.delete('tela:gal');
    return { ok: true };
  }
  if (p === '/totem/passo') {
    const s = await telaShowLer(env); if (!s || !s.itens) return { ok: false };
    s.i = ((Math.floor(+b.i || 0) % s.itens.length) + s.itens.length) % s.itens.length; s.exp = Date.now() + 3 * 3600000;
    await env.HR_KV.put('tela:show', JSON.stringify(s), { expirationTtl: 86400 }); return { ok: true, i: s.i };
  }
  if (p === '/totem/galeria-tv') {
    const gal = await telaGalMontar(env, String(b.q || 'trabalhos')); if (!gal.itens.length) return { ok: false, erro: 'Sem fotos dessa categoria.' };
    await env.HR_KV.delete('tela:show'); await telaGalMostrar(env, gal, 60); return { ok: true, n: gal.itens.length, titulo: gal.titulo };
  }
  if (p === '/totem/pix') {
    if (b.cancelar) { await env.HR_KV.delete('tela:pix'); return { ok: true }; }
    try { const px = await telaPixCriar(env, { valor: b.valor, cli: b.cli, tipo: b.tipo }); return { ok: true, valor: px.valor }; } catch (e) { return { ok: false, erro: e.message }; }
  }
  if (p === '/totem/acordar') { try { await caches.default.put(TVACORDA, new Response(JSON.stringify({ em: Date.now() }), { headers: { 'Cache-Control': 'max-age=3600' } })); } catch (_) {} return { ok: true, tv: await tvLerCache(TVHB) }; } // v316
  if (p === '/totem/apagar') {
    const id = String(b.id || '').replace(/[^a-z0-9]/gi, ''); const l = (await telaArqLista(env)).filter(x => x.id !== id);
    await env.HR_KV.put('tela:arqs', JSON.stringify(l)); await env.HR_KV.delete('tela:arq:' + id); return { ok: true, arqs: l };
  }
  return null;
}
async function totemArquivo(env, req) {
  const mime = String(req.headers.get('content-type') || '').split(';')[0];
  if (!/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime|3gpp))$/.test(mime)) return { ok: false, erro: 'Só fotos e vídeos (JPG, PNG, MP4, WEBM).' };
  const buf = await req.arrayBuffer();
  if (!buf.byteLength) return { ok: false, erro: 'Arquivo vazio.' };
  if (buf.byteLength > 24 * 1024 * 1024) return { ok: false, erro: 'Arquivo passa de 24 MB. Grave um vídeo mais curto.' };
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  await env.HR_KV.put('tela:arq:' + id, buf, { metadata: { mime } });
  const nome = decodeURIComponent(String(req.headers.get('x-nome') || '')).replace(/[\u0000-\u001f]+/g, ' ').slice(0, 60);
  const l = await telaArqLista(env); l.unshift({ id, mime, nome, em: Date.now(), tam: buf.byteLength, v: mime.startsWith('video/') });
  await env.HR_KV.put('tela:arqs', JSON.stringify(l.slice(0, 300)));
  return { ok: true, arqs: l.slice(0, 300) };
}
// v315: vídeos animados das explicações (ficam no GitHub, pasta videos/; o Worker repassa com cache e pedaços para o vídeo pular)
async function telaVidServir(req, env, url) {
  const nome = url.pathname.slice('/tela/vid/'.length).replace(/[^a-z0-9\-.]/gi, '');
  if (!/^[a-z0-9-]+\.mp4$/i.test(nome)) return new Response('Vídeo inválido', { status: 404 });
  const base = String(env.VIDEOS_URL || 'https://raw.githubusercontent.com/hrmarmoresegranitos5-jpg/Hr/main/videos/').replace(/\/?$/, '/');
  const h = {}; const rg = req.headers.get('range'); if (rg) h.Range = rg;
  const r = await fetch(base + nome, { headers: h, cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!r.ok && r.status !== 206) return new Response('Vídeo não encontrado', { status: 404 });
  const cab = new Headers({ 'Content-Type': 'video/mp4', 'Accept-Ranges': 'bytes', 'Cache-Control': 'public, max-age=86400' });
  for (const k of ['content-length', 'content-range']) { const v = r.headers.get(k); if (v) cab.set(k, v); }
  return new Response(r.body, { status: r.status, headers: cab });
}
async function telaArqServir(req, env, url) {
  const id = url.pathname.slice('/tela/arq/'.length).replace(/[^a-z0-9]/gi, '');
  const { value, metadata } = await env.HR_KV.getWithMetadata('tela:arq:' + id, 'arrayBuffer');
  if (!value) return new Response('Sem arquivo', { status: 404 });
  const mime = (metadata && metadata.mime) || 'application/octet-stream', tot = value.byteLength;
  const rg = String(req.headers.get('range') || '').match(/bytes=(\d*)-(\d*)/);
  if (rg && (rg[1] || rg[2])) {
    let a = rg[1] ? +rg[1] : tot - +rg[2], z = rg[1] && rg[2] ? Math.min(+rg[2], tot - 1) : tot - 1; if (!rg[1]) z = tot - 1;
    if (a >= tot || a < 0) return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + tot } });
    return new Response(value.slice(a, z + 1), { status: 206, headers: { 'Content-Type': mime, 'Content-Range': `bytes ${a}-${z}/${tot}`, 'Accept-Ranges': 'bytes', 'Content-Length': String(z - a + 1), 'Cache-Control': 'public, max-age=604800' } });
  }
  return new Response(value, { headers: { 'Content-Type': mime, 'Accept-Ranges': 'bytes', 'Content-Length': String(tot), 'Cache-Control': 'public, max-age=604800' } });
}
async function rotaTotem(req, env, ctx, url) {
  const p = url.pathname.replace(/\/+$/, '');
  if (p !== '/totem' && !p.startsWith('/totem/')) return null;
  const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  const ic = p.match(/^\/totem\/icone-(192|512)\.png$/); // v312.2: ícones do app instalável (sem token)
  if (ic) return new Response(Uint8Array.from(atob(TOTEM_IC[ic[1]]), c => c.charCodeAt(0)), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=604800' } });
  const k = String(url.searchParams.get('k') || '');
  if (!k || k !== await totemToken(env)) return p === '/totem' ? new Response('Link inválido. Peça o link novo no WhatsApp da Helena: "link do totem".', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }) : json({ erro: 'link inválido' }, 403);
  if (p === '/totem') return new Response(TOTEM_HTML.split('__EMP__').join(String(env.EMPRESA || 'HR Mármores e Granitos')).split('__VER__').join(TOTEM_VER).split('__K__').join(encodeURIComponent(k)), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  if (p === '/totem/manifest.json') return new Response(JSON.stringify({ id: '/totem', name: 'Controle da TV · ' + (env.EMPRESA || 'HR Mármores e Granitos'), short_name: 'TV HR', start_url: '/totem?k=' + k, scope: '/totem', display: 'fullscreen', orientation: 'landscape', background_color: '#0b0b0e', theme_color: '#0b0b0e',
    icons: [{ src: '/totem/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/totem/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/totem/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }), { headers: { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-store' } });
  if (p === '/totem/sw.js') return new Response(TOTEM_SW, { headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Service-Worker-Allowed': '/totem', 'Cache-Control': 'no-store' } });
  if (p === '/totem/galeria') { const g = await telaGalMontar(env, String(url.searchParams.get('cat') || 'trabalhos')); return json({ titulo: g.titulo, itens: (g.itens || []).slice(0, 60) }); }
  if (p === '/totem/estado') return json(await totemEstado(env));
  if (p === '/totem/arquivos') return json({ arqs: await telaArqLista(env) });
  if (p === '/totem/busca') { // v314: fotos de obras que combinam com a explicação (pela legenda)
    const termos = String(url.searchParams.get('q') || '').split('|').map(x => normaliza(x).trim()).filter(x => x.length >= 2).slice(0, 6);
    if (!termos.length) return json({ itens: [] });
    const itens = (await lerPortfolio(env)).filter(i => i && i.tipo === 'trabalho' && termos.some(x => normaliza(i.legenda || '').includes(x))).sort((a, b) => (b.em || 0) - (a.em || 0)).slice(0, 40)
      .map(i => ({ u: '/portfolio/img/obra/' + i.id, leg: String(i.legenda || '').replace(/\s+/g, ' ').slice(0, 120) }));
    return json({ itens });
  }
  if (p === '/totem/expl-edit' && req.method === 'GET') { let o = {}; try { o = JSON.parse((await env.HR_KV.get('tela:expl:ed')) || '{}') || {}; } catch (_) {} return json({ ed: o }); }
  if (req.method !== 'POST') return json({ erro: 'método' }, 405);
  if (p === '/totem/arquivo') return json(await totemArquivo(env, req));
  if (p === '/totem/expl-edit') { // v314: o Sr. Hangel ajusta o texto de uma tela de explicação do jeito dele
    let b = {}; try { b = await req.json(); } catch (_) {}
    let o = {}; try { o = JSON.parse((await env.HR_KV.get('tela:expl:ed')) || '{}') || {}; } catch (_) {}
    const id = String(b.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 30), i = Math.max(0, Math.min(20, Math.floor(+b.i || 0)));
    if (!id) return json({ ok: false });
    o[id] = o[id] || {};
    if (b.restaurar) delete o[id][i]; else o[id][i] = { tit: String(b.tit || '').slice(0, 90), pontos: (Array.isArray(b.pontos) ? b.pontos : []).map(x => String(x).slice(0, 220)).filter(Boolean).slice(0, 8) };
    await env.HR_KV.put('tela:expl:ed', JSON.stringify(o)); return json({ ok: true, ed: o });
  }
  if (['/totem/mostrar', '/totem/passo', '/totem/galeria-tv', '/totem/pix', '/totem/apagar', '/totem/acordar'].includes(p)) { let b = {}; try { b = await req.json(); } catch (_) {} return json(await totemTv(env, p, b, req)); }
  if (p === '/totem/ping') { let b = {}; try { b = await req.json(); } catch (_) {} await env.HR_KV.put('totem:ping', JSON.stringify({ em: Date.now(), tela: String(b.tela || '').slice(0, 20) }), { expirationTtl: 30 * 86400 }); return json({ ok: true, ver: TOTEM_VER }); }
  if (p === '/totem/pedido') return sitePedido(req, env, ctx, { totem: true });
  if (p === '/totem/conversa') { let b = {}; try { b = await req.json(); } catch (_) {} return json(await totemConversa(env, b)); }
  if (p === '/totem/atendente') { let b = {}; try { b = await req.json(); } catch (_) {} return json(await totemAtendente(env, b)); }
  if (p === '/totem/ouvir') return json(await totemOuvir(env, req));
  if (p === '/totem/voz') {
    let b = {}; try { b = await req.json(); } catch (_) {}
    const texto = String(b.texto || '').trim().slice(0, 700); if (!texto) return json({ erro: 'sem texto' }, 400);
    try {
      const cfg = { ...(await vozCfg(env)) };
      const fala = await vozPrepararFala(env, texto, cfg, true);
      const r = await vozSpeech(env, fala, cfg, 'mp3');
      ctx.waitUntil(vozUso(env, r.via, fala.length).catch(() => {}));
      return new Response(r.audio, { headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' } });
    } catch (e) { console.log('[TOTEM] voz:', e.message); return json({ erro: 'voz indisponível' }, 502); }
  }
  return json({ erro: 'não encontrado' }, 404);
}
