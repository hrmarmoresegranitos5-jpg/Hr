// ══════════════════════════════════════════════════════════════════════
// SERVIDOR ÚNICO — HR Mármores e Granitos
// Serve o app estático (index.html) + roda o bot de WhatsApp
// Tudo num único processo no Railway
// ══════════════════════════════════════════════════════════════════════

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');

// ─── CONFIGURAÇÃO (variáveis de ambiente no Railway) ──────────────────
const CFG = {
  DONO:     process.env.DONO_NUMERO       || '74991484460',
  EMPRESA:  process.env.EMPRESA           || 'HR Mármores e Granitos',
  EVO_URL:  process.env.EVOLUTION_URL     || '',
  EVO_KEY:  process.env.EVOLUTION_KEY     || '',
  EVO_INST: process.env.EVOLUTION_INSTANCE|| 'hr-secretaria',
  PORT:     process.env.PORT              || 3000,
};

// ─── MIME TYPES ───────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.webp': 'image/webp',
};

// ═════════════════════════════════════════════════════════════════════
// BOT DE WHATSAPP
// ═════════════════════════════════════════════════════════════════════

const sessoes = new Map();
const E = { INICIO:0, NOME:1, PROJETO:2, DETALHE:3, MEDIDAS:4, VISITA_SN:5, VISITA_END:6, HORARIO:7, FIM:8 };
const PROJETOS = ['Cozinha','Banheiro','Lavabo','Varanda/Churrasqueira','Escada','Piso','Túmulo/Jazigo','Outro'];

async function processarMsg(payload) {
  if (!payload?.data) return;
  if (payload.data?.key?.fromMe) return;

  const numero = (payload.data?.key?.remoteJid || '').replace('@s.whatsapp.net','').replace('@g.us','');
  if (!numero || numero.includes('-')) return; // ignora grupos

  const msg = normaliza(
    payload.data?.message?.conversation ||
    payload.data?.message?.extendedTextMessage?.text ||
    payload.data?.message?.audioMessage?.caption || ''
  );
  if (!msg) return;

  let s = sessoes.get(numero);
  const agora = Date.now();
  if (!s || (agora - (s.ts||0)) > 7200000) s = { e: E.INICIO, d: {}, ts: agora };
  s.ts = agora;

  const OI = ['oi','ola','olá','bom dia','boa tarde','boa noite','opa','ei','menu','inicio','ínicio'];
  if (s.e === E.FIM && OI.some(p => msg.startsWith(p))) s = { e: E.INICIO, d: {}, ts: agora };

  const resp = await fsm(s, msg, numero);
  sessoes.set(numero, s);
  if (resp) await enviarMsg(numero, resp);
}

async function fsm(s, msg, numero) {
  switch(s.e) {

    case E.INICIO:
      s.e = E.NOME;
      return `Olá! 👋 Seja bem-vindo à *${CFG.EMPRESA}* 🪨✨\n\nSou a secretária virtual e vou te ajudar com seu orçamento!\n\nPrimeiro, qual é o seu *nome completo*? 😊`;

    case E.NOME: {
      const nome = extrairNome(msg);
      if (!nome) return `Não consegui identificar seu nome 😅\nPode digitar seu *nome completo*, por favor?`;
      s.d.nome = nome;
      s.e = E.PROJETO;
      return `Prazer, *${nome}*! 😊\n\nQual *tipo de projeto* você quer orçar?\n\n${PROJETOS.map((p,i)=>`*${i+1}.* ${p}`).join('\n')}\n\n_Digite o número ou o nome_`;
    }

    case E.PROJETO: {
      const proj = idProjeto(msg);
      if (!proj) return `Não entendi qual projeto 😅\nDigite o *número* ou *nome*:\n\n${PROJETOS.map((p,i)=>`*${i+1}.* ${p}`).join('\n')}`;
      s.d.projeto = proj;
      s.e = E.DETALHE;
      return `Ótimo! *${proj}* 🏠\n\nMe conta um pouco mais: é *reforma* ou *obra nova*?\n_Ex: bancada nova da cozinha, pia do banheiro, escada de granito..._`;
    }

    case E.DETALHE:
      s.d.detalhe = msg;
      s.e = E.MEDIDAS;
      return `Anotei! 📝\n\nVocê já tem as *medidas* aproximadas?\n\n*1.* ✅ Sim, tenho as medidas\n*2.* ❌ Não tenho, preciso de visita`;

    case E.MEDIDAS: {
      const tem = /\b(1|sim|tenho|sei|medida|metro|cm)\b/.test(msg);
      if (tem) {
        s.d.temMedidas = true;
        s.e = 5.5;
        return `Ótimo! Me informe as medidas como souber 📏\n\n_Ex: "bancada 2,50 x 0,60" ou "pia 1,20 x 0,60"_\n\n_Não precisa ser exato, é só para a estimativa inicial_ 😊`;
      } else {
        s.d.medidas = 'Sem medidas — precisa de visita técnica';
        s.e = E.VISITA_END;
        return `Sem problema! 📐 Fazemos *visita técnica gratuita* para medir tudo!\n\nQual o *endereço completo* para a visita?\n_Ex: Rua das Flores, 123, Centro, Pilão Arcado_`;
      }
    }

    case 5.5:
      s.d.medidas = msg;
      s.e = E.VISITA_SN;
      return `Medidas anotadas ✅\n\nGostaria de agendar uma *visita técnica gratuita* para ver o local e escolher a pedra pessoalmente?\n\n*1.* ✅ Sim, quero agendar\n*2.* ❌ Não, só o orçamento por enquanto`;

    case E.VISITA_SN: {
      const quer = /\b(1|sim|quero|pode|agendar)\b/.test(msg);
      if (quer) {
        s.d.querVisita = true;
        s.e = E.VISITA_END;
        return `Ótimo! 📅\n\nQual o *endereço completo* para a visita?\n_Ex: Rua das Flores, 123, Centro, Pilão Arcado_`;
      } else {
        s.d.querVisita = false;
        return await finalizar(s, numero);
      }
    }

    case E.VISITA_END:
      s.d.endereco = msg;
      s.e = E.HORARIO;
      return `Endereço anotado! 📍\n\nQual o melhor *horário* para a visita?\n_Ex: "manhã", "tarde", "segunda às 14h", "qualquer dia"_`;

    case E.HORARIO:
      s.d.horario = msg;
      return await finalizar(s, numero);

    default:
      s.e = E.INICIO;
      return null;
  }
}

async function finalizar(s, numero) {
  s.e = E.FIM;
  const d = s.d;

  const linhasResumo = [
    `🔔 *NOVO LEAD — WHATSAPP*`, ``,
    `👤 *Cliente:* ${d.nome || '---'}`,
    `📱 *Número:* wa.me/55${numero}`,
    `🏗 *Projeto:* ${d.projeto || '---'}`,
    `📝 *Detalhes:* ${d.detalhe || '---'}`,
    `📏 *Medidas:* ${d.medidas || 'Não informado'}`,
    d.endereco ? `📍 *Endereço:* ${d.endereco}` : null,
    d.horario  ? `🕐 *Horário pref:* ${d.horario}` : null,
    ``, `⏰ ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}`,
  ].filter(l => l !== null).join('\n');

  enviarMsg(CFG.DONO, linhasResumo).catch(() => {});

  return [
    `✅ *${d.nome}, recebi tudo!* 🙌`, ``,
    `*Resumo do seu pedido:*`,
    `• Projeto: ${d.projeto}`,
    d.medidas !== 'Sem medidas — precisa de visita técnica'
      ? `• Medidas: ${d.medidas}` : `• Visita técnica necessária`,
    d.endereco ? `• Endereço: ${d.endereco}` : null,
    d.horario  ? `• Horário: ${d.horario}`   : null,
    ``,
    `📞 Nossa equipe vai entrar em contato em breve para confirmar ${d.querVisita ? 'a visita e ' : ''}o orçamento!`,
    ``, `_Qualquer dúvida é só chamar aqui_ 😊`,
    `*${CFG.EMPRESA}* 🪨✨`,
  ].filter(l => l !== null).join('\n');
}

// ─── HELPERS ──────────────────────────────────────────────────────────
function normaliza(t) {
  return (t||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\w\s\d,./:;-]/g,' ')
    .replace(/\s+/g,' ').trim();
}
function extrairNome(msg) {
  const limpo = msg
    .replace(/^(oi|ola|olá|bom dia|boa tarde|boa noite|me chamo|meu nome é|meu nome e|sou o|sou a|aqui é|aqui e)[,\s]*/i,'')
    .trim();
  if (limpo.length < 2) return null;
  return limpo.split(' ').map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join(' ');
}
function idProjeto(msg) {
  const mapa = {
    '1':'Cozinha','cozinha':'Cozinha','pia':'Cozinha','bancada':'Cozinha',
    '2':'Banheiro','banheiro':'Banheiro',
    '3':'Lavabo','lavabo':'Lavabo',
    '4':'Varanda/Churrasqueira','varanda':'Varanda/Churrasqueira','churrasco':'Varanda/Churrasqueira',
    '5':'Escada','escada':'Escada','degrau':'Escada',
    '6':'Piso','piso':'Piso',
    '7':'Túmulo/Jazigo','tumulo':'Túmulo/Jazigo','jazigo':'Túmulo/Jazigo','cemiterio':'Túmulo/Jazigo',
    '8':'Outro','outro':'Outro',
  };
  for (const [k,v] of Object.entries(mapa)) if (msg.includes(k)) return v;
  return null;
}
function enviarMsg(numero, texto) {
  if (!CFG.EVO_URL || !CFG.EVO_KEY) {
    console.log(`[BOT→${numero}]: ${texto.slice(0,60)}...`);
    return Promise.resolve();
  }
  return new Promise(ok => {
    const body = JSON.stringify({
      number: numero.includes('@') ? numero : `${numero}@s.whatsapp.net`,
      textMessage: { text: texto },
      options: { delay: 1200 },
    });
    const url = new URL(`${CFG.EVO_URL}/message/sendText/${CFG.EVO_INST}`);
    const mod = url.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: url.hostname, port: url.port || (url.protocol==='https:'?443:80),
      path: url.pathname, method: 'POST',
      headers: { 'Content-Type':'application/json', 'Content-Length':Buffer.byteLength(body), 'apikey':CFG.EVO_KEY },
    }, res => { res.resume(); res.on('end', ok); });
    req.on('error', e => { console.error('Envio falhou:', e.message); ok(); });
    req.write(body); req.end();
  });
}

// ═════════════════════════════════════════════════════════════════════
// SERVIDOR HTTP — serve o app E recebe o webhook do bot
// ═════════════════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {

  // ── WEBHOOK DO BOT ──────────────────────────────────────────────────
  if (req.method === 'POST' && req.url === '/webhook') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      try {
        const p = JSON.parse(body);
        if (p.event === 'messages.upsert') await processarMsg(p);
      } catch(e) { console.error('Webhook error:', e.message); }
      res.writeHead(200); res.end('ok');
    });
    return;
  }

  // ── HEALTH CHECK ────────────────────────────────────────────────────
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ ok:true, sessoes:sessoes.size, ts:new Date().toISOString() }));
    return;
  }

  // ── ARQUIVOS ESTÁTICOS (o app HR) ───────────────────────────────────
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

  // Segurança: impede path traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      // Se não achar o arquivo, serve o index.html (SPA fallback)
      fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        res.end(data2);
      });
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400',
    });
    res.end(data);
  });
});

server.listen(CFG.PORT, '0.0.0.0', () => {
  console.log(`\n✅ HR Mármores — Servidor rodando na porta ${CFG.PORT}`);
  console.log(`🌐 App: http://localhost:${CFG.PORT}`);
  console.log(`📡 Webhook: http://localhost:${CFG.PORT}/webhook`);
  console.log(`🤖 Bot: ${CFG.EVO_URL ? 'ATIVO' : 'aguardando EVOLUTION_URL nas variáveis'}`);
  console.log(`📱 Notificações → ${CFG.DONO}\n`);
});
