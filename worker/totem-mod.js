// ══════════════════════════════════════════════════════════════════════
// v312 · TOTEM DE ATENDIMENTO — o tablet do balcão vira um atendente (/totem?k=TOKEN)
// Tela de descanso com fotos dos trabalhos e das pedras; o cliente toca e escolhe: fazer orçamento (ambiente → pedra →
// cuba → medidas → nome e WhatsApp), ver pedras, ver modelos, falar com a Helena (voz e texto) ou chamar alguém da equipe.
// O orçamento vira um "projeto do site" (protocolo LOJA-…): o dono é avisado e a Helena já chama o cliente no WhatsApp.
// Link: comando do dono "link do totem" ou o app (Configurações → Totem da loja).
// ══════════════════════════════════════════════════════════════════════
const TOTEM_VER = 'v312.1';
async function totemToken(env, novo) {
  let t = novo ? '' : await env.HR_KV.get('totem:tok');
  if (!t) { t = Array.from(crypto.getRandomValues(new Uint8Array(12))).map(x => x.toString(36).padStart(2, '0')).join('').slice(0, 18); await env.HR_KV.put('totem:tok', t); }
  return t;
}
async function totemLink(env, novo) { return (await urlPublica(env)) + '/totem?k=' + await totemToken(env, novo); }
async function totemStatusTxt(env) {
  let p = null; try { p = JSON.parse((await env.HR_KV.get('totem:ping')) || 'null'); } catch (_) {}
  if (!p) return 'O totem ainda não foi aberto no tablet.';
  const min = Math.round((Date.now() - p.em) / 60000);
  return min <= 6 ? 'O totem está ligado agora.' : `O totem foi visto ligado pela última vez há ${min < 120 ? min + ' min' : Math.round(min / 60) + ' h'}.`;
}
async function totemComandoDono(env, from, msg) {
  const n = normaliza(msg);
  if (!/\btotem\b/.test(n) || n.length > 80) return false;
  if (/\b(novo|trocar|troca|outro) link\b/.test(n)) { await enviar(env, from, `Link novo do totem (o antigo parou de funcionar):\n${await totemLink(env, true)}\n\nAbra no tablet, no Chrome, e toque em "Adicionar à tela inicial".`); return true; }
  if (/\b(link|abrir|abre|endereco|status|ligado|como esta)\b/.test(n)) {
    await enviar(env, from, `🖥️ *Totem da loja*\n${await totemLink(env)}\n\n${await totemStatusTxt(env)}\n\nNo tablet: abra o link no Chrome → menu ⋮ → "Adicionar à tela inicial" e abra pelo ícone (fica em tela cheia). Para trocar o link: "novo link do totem".`);
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
async function rotaTotem(req, env, ctx, url) {
  const p = url.pathname.replace(/\/+$/, '');
  if (p !== '/totem' && !p.startsWith('/totem/')) return null;
  const json = (o, st) => new Response(JSON.stringify(o), { status: st || 200, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  const k = String(url.searchParams.get('k') || '');
  if (!k || k !== await totemToken(env)) return p === '/totem' ? new Response('Link do totem inválido. Peça o link novo no WhatsApp da Helena: "link do totem".', { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }) : json({ erro: 'link inválido' }, 403);
  if (p === '/totem') return new Response(TOTEM_HTML.split('__EMP__').join(String(env.EMPRESA || 'HR Mármores e Granitos')).split('__VER__').join(TOTEM_VER), { headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' } });
  if (p === '/totem/manifest.json') return new Response(JSON.stringify({ name: 'Atendimento ' + (env.EMPRESA || 'HR'), short_name: 'Totem HR', start_url: '/totem?k=' + k, display: 'fullscreen', orientation: 'landscape', background_color: '#0b0b0e', theme_color: '#0b0b0e', icons: [] }), { headers: { 'Content-Type': 'application/manifest+json' } });
  if (p === '/totem/galeria') { const g = await telaGalMontar(env, String(url.searchParams.get('cat') || 'trabalhos')); return json({ titulo: g.titulo, itens: (g.itens || []).slice(0, 60) }); }
  if (req.method !== 'POST') return json({ erro: 'método' }, 405);
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
