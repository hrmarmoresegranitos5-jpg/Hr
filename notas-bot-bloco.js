// ══════════════════════════════════════════════════════════════════════
// ANOTAÇÕES DE VISITA (medidas de soleiras etc.) — bloco para o worker-whatsapp.js
//
// COMO INSTALAR (3 ganchos de 1 linha + colar este bloco):
//
//  1) Cole TODO este bloco no worker, logo ANTES da linha:
//       // ── Processa uma mensagem recebida ───────────────────────────────
//
//  2) Em tratarBotao(), logo depois de:   if (!id) return false;
//       if (await tratarBotaoNota(env, from, id)) return true;
//
//  3) Em tratarMensagemBase(), no bloco "if (dono) {", logo ANTES de:
//       if (await tratarDescPendente(env, from, bruto, msg, F)) return;
//     coloque:
//       if (await tratarNotas(env, from, bruto, msg)) return;
//
//  4) Em rotaBot(), logo ANTES de:
//       return jsonR({ error: 'Rota não encontrada.' }, 404);
//     coloque:
//       const rn = await rotaNotas(req, env, p); if (rn) return rn;
//
// Usa só funções que o worker já tem: enviar, enviarComBotoes, normaliza, jsonR, FIN_TTL.
// Não usa emoji (o worker já remove) e fala no tom formal do restante do bot.
// ══════════════════════════════════════════════════════════════════════

// ── Anotações de visita → área "Anotações" do app ──
// "anotar Maria: soleira 0,90 x 0,15" (texto ou áudio) fica guardada no KV (prefixo nota:).
// O app busca em /bot/notas, grava em DB.n e confirma em /bot/notas/confirmar.
const NOTA_TRIGGER = /^\s*(anotações|anotação|anotacoes|anotacao|anotar|anota|nota|medidas|medida|visita)(?=[\s:,\-–]|$)\s*[:,\-–]?\s*/i;
const TIPOS_NOTA = { medidas: 'Medidas', visita: 'Visita', geral: 'Geral' };

function interpretarNota(bruto) {
  const original = String(bruto || '').trim();
  const m = original.match(NOTA_TRIGGER);
  if (!m) return null;
  const gatilho = normaliza(m[1]);
  // "medidas..." e "visita..." são palavras comuns: com "?" é pergunta, não anotação
  if (/^(medida|visita)/.test(gatilho) && /\?/.test(original)) return null;

  let resto = original.slice(m[0].length).trim();
  resto = resto.replace(/^(?:cliente|para)\s+/i, '');
  let cliente = '';
  let texto = resto;

  const dp = resto.match(/^([^\n:]{2,40}?)\s*:\s*([\s\S]+)$/);
  if (dp && !/\d/.test(dp[1]) && dp[1].trim().split(/\s+/).length <= 5) {
    cliente = dp[1].trim();
    texto = dp[2].trim();
  } else {
    // "anotar Maria Silva" + quebra de linha + anotação
    const nl = resto.match(/^([^\n:]{2,40})\n+([\s\S]+)$/);
    if (nl && !/\d/.test(nl[1]) && nl[1].trim().split(/\s+/).length <= 5) {
      cliente = nl[1].trim();
      texto = nl[2].trim();
    }
  }

  // Fala/áudio: "Maria Silva, soleira porta..." ou "Maria Silva soleira porta..." (sem dois-pontos)
  if (!cliente && resto) {
    const KW = /\b(soleiras?|peitoril|peitoris|bancadas?|escadas?|medidas?)\b/;
    if (/\d/.test(resto) || KW.test(normaliza(resto))) {
      const vg = resto.match(/^([^\n,:.\d]{2,40}?)\s*[,.]\s*([\s\S]+)$/);
      if (vg && vg[1].trim().split(/\s+/).length <= 4 && !KW.test(normaliza(vg[1]))) {
        cliente = vg[1].trim();
        texto = vg[2].trim();
      } else {
        const kw = resto.match(/^((?:[^\s\d,:.]+\s+){1,4}?)(?=(?:soleiras?|peitoril|peitoris|bancadas?|escadas?)(?![a-zA-Z]))/i);
        if (kw) {
          cliente = kw[1].trim();
          texto = resto.slice(kw[1].length).trim();
        }
      }
    }
  }
  if (!texto) return { vazio: true };

  // "noventa por quinze" transcrito como "90 por 15" → "90 x 15" (o app lê o "x")
  texto = texto.replace(/(\d)\s+por\s+(\d)/gi, '$1 x $2');

  const n = normaliza(texto);
  let tipo = 'geral';
  if (gatilho.startsWith('medida')) tipo = 'medidas';
  else if (gatilho === 'visita') tipo = 'visita';
  else if (/\d+(?:[.,]\d+)?\s*[x*]\s*\d/.test(n) || /\b(soleiras?|peitoril|peitoris|bancadas?|medidas?)\b/.test(n)) tipo = 'medidas';
  else if (/\b(visita|endereco|rua|bairro|casa)\b/.test(n)) tipo = 'visita';

  cliente = cliente.replace(/\s+/g, ' ');
  if (cliente) cliente = cliente.split(' ').map(p => p ? p.charAt(0).toUpperCase() + p.slice(1) : p).join(' ');
  return { cliente, texto: texto.slice(0, 3000), tipo };
}

async function registrarNota(env, nota) {
  const base = Date.now();
  const rand = Math.floor(Math.random() * 900 + 100);
  const k = 'nota:' + String(base).padStart(13, '0') + '-' + rand;
  const rec = { k, waId: 'wn' + base + rand, id: base, cliente: nota.cliente, texto: nota.texto, tipo: nota.tipo, importado: false };
  await env.HR_KV.put(k, JSON.stringify(rec), { expirationTtl: FIN_TTL });
  await env.HR_KV.put('ultimo:nota', k, { expirationTtl: FIN_TTL });
  return rec;
}

// { achou, jaNoApp, rec }
async function desfazerNotaPorChave(env, k) {
  const rec = JSON.parse((await env.HR_KV.get(k)) || 'null');
  if (!rec) return { achou: false };
  if (rec.importado) return { achou: true, jaNoApp: true, rec };
  await env.HR_KV.delete(k);
  if ((await env.HR_KV.get('ultimo:nota')) === k) await env.HR_KV.delete('ultimo:nota');
  return { achou: true, jaNoApp: false, rec };
}
async function desfazerUltimaNota(env) {
  const k = await env.HR_KV.get('ultimo:nota');
  if (!k) return { achou: false };
  return desfazerNotaPorChave(env, k);
}

async function ultimasNotas(env, max = 5) {
  const lista = await env.HR_KV.list({ prefix: 'nota:' });
  const out = [];
  for (const k of lista.keys.slice(-max).reverse()) {
    const r = JSON.parse((await env.HR_KV.get(k.name)) || 'null');
    if (r) out.push(r);
  }
  return out;
}

function previaNota(t, n = 220) {
  const x = String(t || '').trim();
  return x.length > n ? x.slice(0, n - 1) + '…' : x;
}

async function responderNotaDesfeita(env, from, r) {
  if (!r.achou) await enviar(env, from, 'Sr. Hangel, não há nenhuma anotação recente para desfazer.');
  else if (r.jaNoApp) await enviar(env, from, 'Essa anotação já foi sincronizada com o aplicativo. Exclua-a por lá, em Anotações.');
  else await enviar(env, from, `Anotação removida, Sr. Hangel${r.rec.cliente ? ' (' + r.rec.cliente + ')' : ''}.`);
}

// Botão "Desfazer anotação" (id: ndesf|<chave>)
async function tratarBotaoNota(env, from, id) {
  if (!id || !id.startsWith('ndesf|')) return false;
  await responderNotaDesfeita(env, from, await desfazerNotaPorChave(env, id.slice(6)));
  return true;
}

// true = a mensagem era uma anotação ou um comando de anotações e já foi respondida
async function tratarNotas(env, from, bruto, msg) {
  if (['notas', 'minhas notas', 'anotacoes', 'minhas anotacoes', 'ultimas notas', 'ver notas'].includes(msg)) {
    const rs = await ultimasNotas(env, 5);
    if (!rs.length) {
      await enviar(env, from, 'Sr. Hangel, não há anotações recentes no bot.\n_As que já foram sincronizadas ficam em Anotações, no aplicativo._');
      return true;
    }
    const linhas = rs.map(r => {
      const q = new Date(r.id).toLocaleString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
      return `*${r.cliente || 'Sem cliente'}* (${q})\n${previaNota(r.texto, 160)}`;
    });
    await enviar(env, from, `*Últimas anotações, Sr. Hangel*\n\n${linhas.join('\n\n')}`);
    return true;
  }
  if (['desfazer nota', 'apagar nota', 'cancelar nota', 'desfazer anotacao', 'apagar ultima nota'].includes(msg)) {
    await responderNotaDesfeita(env, from, await desfazerUltimaNota(env));
    return true;
  }

  const n = interpretarNota(bruto);
  if (!n) return false;
  if (n.vazio) {
    await enviar(env, from, 'Sr. Hangel, o que deseja anotar?\n\n_Exemplo: anotar Maria Silva: soleira porta 0,90 x 0,15_\n_Pode enviar várias linhas na mesma mensagem, por texto ou áudio._');
    return true;
  }
  const rec = await registrarNota(env, n);
  await enviarComBotoes(env, from, [
    '*Anotação registrada, Sr. Hangel.*',
    '',
    `*Cliente:* ${n.cliente || 'Sem cliente'}`,
    `*Tipo:* ${TIPOS_NOTA[n.tipo] || TIPOS_NOTA.geral}`,
    `*Anotação:* ${previaNota(n.texto)}`,
    '',
    '_Será incluída em Anotações no aplicativo na próxima sincronização._',
  ].join('\n'), [{ id: 'ndesf|' + rec.k, titulo: 'Desfazer anotação' }]);
  return true;
}

// Rotas do app (já protegidas pela BOT_KEY dentro do rotaBot). Devolve Response ou null.
async function rotaNotas(req, env, p) {
  if (p === '/bot/notas' && req.method === 'GET') {
    const lista = await env.HR_KV.list({ prefix: 'nota:' });
    const notas = [];
    for (const k of lista.keys) {
      const rec = JSON.parse((await env.HR_KV.get(k.name)) || 'null');
      if (rec && !rec.importado) notas.push(rec);
    }
    return jsonR({ notas });
  }
  if (p === '/bot/notas/confirmar' && req.method === 'POST') {
    let body = {};
    try { body = await req.json(); } catch (_) { return jsonR({ error: 'JSON inválido.' }, 400); }
    const ids = new Set(Array.isArray(body.waIds) ? body.waIds.map(String) : []);
    let n = 0;
    if (ids.size) {
      const lista = await env.HR_KV.list({ prefix: 'nota:' });
      for (const k of lista.keys) {
        const rec = JSON.parse((await env.HR_KV.get(k.name)) || 'null');
        if (rec && ids.has(rec.waId) && !rec.importado) {
          rec.importado = true;
          await env.HR_KV.put(k.name, JSON.stringify(rec), { expirationTtl: 30 * 24 * 60 * 60 });
          n++;
        }
      }
    }
    return jsonR({ ok: true, confirmados: n });
  }
  return null;
}

