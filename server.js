// ══════════════════════════════════════════════════════════════════════
// HR Mármores e Granitos — Servidor + Bot WhatsApp (Baileys)
// Versão 5.0 — Pairing Code robusto para Render
// ══════════════════════════════════════════════════════════════════════

import http                   from 'http';
import fs                     from 'fs';
import path                   from 'path';
import { fileURLToPath }      from 'url';
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  isJidBroadcast,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import pino   from 'pino';
import qrcode from 'qrcode';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const logger    = pino({ level: 'silent' });

// ── Configuração ─────────────────────────────────────────────────────
const CFG = {
  DONO:     (process.env.DONO_NUMERO || '74991484460').replace(/\D/g, ''),
  EMPRESA:  process.env.EMPRESA      || 'HR Mármores e Granitos',
  PORT:     process.env.PORT         || 3000,
  AUTH_DIR: './baileys_auth',
  TESTES:   ['5574988356878', '5574991484460'],
};

// ── MIME types ───────────────────────────────────────────────────────
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

// ══════════════════════════════════════════════════════════════════════
// ESTADO GLOBAL DO BOT
// ══════════════════════════════════════════════════════════════════════

const bot = {
  sock:        null,
  status:      'disconnected',
  conectado:   false,
  numero:      null,
  pairingCode: null,
  phoneTarget: null,
  tentativas:  0,
  iniciando:   false,
  qrDataUrl:   null,
};

// ══════════════════════════════════════════════════════════════════════
// LÓGICA DE ATENDIMENTO — MÁQUINA DE ESTADOS
// ══════════════════════════════════════════════════════════════════════

const sessoes        = {};
const TIMEOUT_SESSAO = 2 * 60 * 60 * 1000;

const PROJETOS = [
  'Cozinha', 'Banheiro', 'Lavabo', 'Varanda/Churrasqueira',
  'Escada', 'Piso', 'Túmulo/Jazigo', 'Outro',
];

const E = {
  INICIO: 0, NOME: 1, PROJETO: 2, DETALHE: 3,
  MEDIDAS: 4, MEDIDAS2: 5, VISITA_SN: 6,
  VISITA_END: 7, HORARIO: 8, FIM: 9,
};

function normaliza(t) {
  return (t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s\d,./:;-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extrairNome(msg) {
  const limpo = msg
    .replace(/^(oi|ola|bom dia|boa tarde|boa noite|me chamo|meu nome e|meu nome é|sou o|sou a|aqui e|aqui é)[,\s]*/i, '')
    .trim();
  if (limpo.length < 2) return null;
  return limpo
    .split(' ')
    .slice(0, 4)
    .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(' ');
}

function idProjeto(msg) {
  const mapa = {
    '1':'Cozinha',     'cozinha':'Cozinha',     'pia':'Cozinha',    'bancada':'Cozinha',
    '2':'Banheiro',    'banheiro':'Banheiro',
    '3':'Lavabo',      'lavabo':'Lavabo',
    '4':'Varanda/Churrasqueira', 'varanda':'Varanda/Churrasqueira', 'churrasqueira':'Varanda/Churrasqueira',
    '5':'Escada',      'escada':'Escada',        'degrau':'Escada',
    '6':'Piso',        'piso':'Piso',
    '7':'Túmulo/Jazigo','tumulo':'Túmulo/Jazigo','jazigo':'Túmulo/Jazigo','cemiterio':'Túmulo/Jazigo',
    '8':'Outro',       'outro':'Outro',
  };
  for (const [k, v] of Object.entries(mapa)) {
    if (msg.includes(k)) return v;
  }
  return null;
}

let enviarMsg = async (jid, texto) => {
  console.log(`[BOT→SIM ${jid}]: ${texto.slice(0, 80)}`);
};

async function processarMsg(numero, texto) {
  if (!numero || !texto) return;
  const msg = normaliza(texto);
  if (!msg) return;

  const agora = Date.now();
  let s = sessoes[numero];

  if (!s || (agora - (s.ts || 0)) > TIMEOUT_SESSAO) {
    s = { e: E.INICIO, d: {}, ts: agora };
  }
  s.ts = agora;

  const OI = ['oi', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'opa', 'ei', 'menu', 'inicio', 'orcamento'];
  if (s.e === E.FIM && OI.some(p => msg === p || msg.startsWith(p + ' '))) {
    s = { e: E.INICIO, d: {}, ts: agora };
  }

  const resp = await fsm(s, msg, numero);
  sessoes[numero] = s;
  if (resp) {
    await enviarMsg(numero + '@s.whatsapp.net', resp).catch(err =>
      console.error('[BOT] Erro ao enviar:', err.message)
    );
  }
}

async function fsm(s, msg, numero) {
  switch (s.e) {
    case E.INICIO:
      s.e = E.NOME;
      return `Olá! 👋 Seja bem-vindo(a) à *${CFG.EMPRESA}* 🪨✨\n\nSou a *secretária virtual* e vou te ajudar com seu orçamento!\n\nPor favor, qual é o seu *nome completo*? 😊`;

    case E.NOME: {
      const nome = extrairNome(msg);
      if (!nome) return `Não consegui identificar seu nome 😅\nPode digitar seu *nome completo*, por favor?`;
      s.d.nome = nome;
      s.e = E.PROJETO;
      return `Prazer, *${nome}*! 😊\n\nQual *tipo de projeto* você quer orçar?\n\n${PROJETOS.map((p, i) => `*${i + 1}.* ${p}`).join('\n')}\n\n_Digite o número ou o nome_`;
    }

    case E.PROJETO: {
      const proj = idProjeto(msg);
      if (!proj) return `Não entendi 😅 Digite o *número* ou *nome*:\n\n${PROJETOS.map((p, i) => `*${i + 1}.* ${p}`).join('\n')}`;
      s.d.projeto = proj;
      s.e = E.DETALHE;
      return `Ótimo! *${proj}* 🏠\n\nÉ *reforma* ou *obra nova*?\n_Descreva brevemente o que precisa (ex: bancada nova, pia do banheiro...)_`;
    }

    case E.DETALHE:
      s.d.detalhe = msg;
      s.e = E.MEDIDAS;
      return `Anotei! 📝\n\nVocê já tem as *medidas* aproximadas?\n\n*1.* ✅ Sim, tenho\n*2.* ❌ Não tenho ainda`;

    case E.MEDIDAS: {
      const tem = /\b(1|sim|tenho|sei)\b/.test(msg);
      if (tem) {
        s.e = E.MEDIDAS2;
        return `Me informe as medidas 📏\n_Ex: "bancada 2,50 x 0,60" ou "piso 20m²"_`;
      } else {
        s.d.medidas = 'Sem medidas — precisa de visita técnica';
        s.e = E.VISITA_END;
        return `Sem problema! Fazemos *visita técnica gratuita* 📐\n\nQual o *endereço completo* para a visita?`;
      }
    }

    case E.MEDIDAS2:
      s.d.medidas = msg;
      s.e = E.VISITA_SN;
      return `Medidas anotadas ✅\n\nDeseja agendar uma *visita técnica gratuita*?\n\n*1.* ✅ Sim, quero\n*2.* ❌ Não precisa`;

    case E.VISITA_SN: {
      const quer = /\b(1|sim|quero|pode|agendar)\b/.test(msg);
      if (quer) {
        s.d.querVisita = true;
        s.e = E.VISITA_END;
        return `Ótimo! 📅\n\nQual o *endereço completo*?`;
      } else {
        s.d.querVisita = false;
        return await finalizar(s, numero);
      }
    }

    case E.VISITA_END:
      s.d.endereco = msg;
      s.e = E.HORARIO;
      return `Endereço anotado! 📍\n\nQual o melhor *dia e horário* para a visita?\n_Ex: "segunda de manhã", "sexta às 14h"_`;

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
  const d    = s.d;
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' });

  const notif = [
    `🔔 *NOVO LEAD — WHATSAPP*`, ``,
    `👤 *Cliente:* ${d.nome || '---'}`,
    `📱 *Número:* wa.me/55${numero}`,
    `🏗 *Projeto:* ${d.projeto || '---'}`,
    `📝 *Detalhes:* ${d.detalhe || '---'}`,
    `📏 *Medidas:* ${d.medidas || 'Não informado'}`,
    d.endereco ? `📍 *Endereço:* ${d.endereco}` : null,
    d.horario  ? `🕐 *Horário:* ${d.horario}`   : null,
    ``, `⏰ _${hora}_`,
  ].filter(Boolean).join('\n');

  enviarMsg(CFG.DONO + '@s.whatsapp.net', notif).catch(() => {});

  return [
    `✅ *${d.nome}, recebi tudo!* 🙌`, ``,
    `*Resumo do seu pedido:*`,
    `• Projeto: ${d.projeto}`,
    `• Detalhes: ${d.detalhe}`,
    d.medidas !== 'Sem medidas — precisa de visita técnica'
      ? `• Medidas: ${d.medidas}`
      : `• Visita técnica necessária`,
    d.endereco ? `• Endereço: ${d.endereco}` : null,
    d.horario  ? `• Horário preferido: ${d.horario}` : null,
    ``,
    `📞 Nossa equipe entrará em contato em breve para confirmar!`,
    ``,
    `_${CFG.EMPRESA}_ 🪨✨`,
    `_Para novo orçamento, basta digitar "oi"_`,
  ].filter(Boolean).join('\n');
}

// ══════════════════════════════════════════════════════════════════════
// BAILEYS — Conexão WhatsApp
// ══════════════════════════════════════════════════════════════════════

// Destrói socket atual sem reconectar automaticamente
async function destruirSock() {
  const s = bot.sock;
  bot.sock      = null;
  bot.iniciando = false;
  if (s) {
    try { s.ev.removeAllListeners(); } catch (_) {}
    try { await s.logout(); } catch (_) {}
    try { s.end(); } catch (_) {}
  }
}

// Limpa sessão salva em disco
function limparAuth() {
  try { fs.rmSync(CFG.AUTH_DIR, { recursive: true, force: true }); } catch (_) {}
  try { fs.mkdirSync(CFG.AUTH_DIR, { recursive: true }); } catch (_) {}
}

async function iniciarBaileys() {
  if (bot.iniciando || bot.conectado) return;
  bot.iniciando   = true;
  bot.status      = 'connecting';
  bot.pairingCode = null;

  try {
    if (!fs.existsSync(CFG.AUTH_DIR)) {
      fs.mkdirSync(CFG.AUTH_DIR, { recursive: true });
    }

    const { state, saveCreds } = await useMultiFileAuthState(CFG.AUTH_DIR);
    const { version }          = await fetchLatestBaileysVersion();

    console.log(`[BOT] Baileys v${version.join('.')} | phone: ${bot.phoneTarget || 'não definido'}`);

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys:  makeCacheableSignalKeyStore(state.keys, logger),
      },
      logger,
      printQRInTerminal:   false,
      // IMPORTANTE: mobile:false força pairing code em vez de QR
      // browser correto para pairing code
      browser:             ['Ubuntu', 'Chrome', '120.0.0'],
      markOnlineOnConnect: false,
      syncFullHistory:     false,
      connectTimeoutMs:    60_000,
      keepAliveIntervalMs: 25_000,
      getMessage:          async () => ({ conversation: '' }),
    });

    bot.sock = sock;
    bot.iniciando = false; // libera para que /bot/start possa checar pairingCode

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

      // QR gerado — significa que NÃO pedimos pairing code ainda
      // ou o número está errado. Armazena o QR mas também tenta pairing code.
      if (qr) {
        bot.qrDataUrl = await qrcode.toDataURL(qr, { scale: 8 });
        bot.status    = 'connecting';
        console.log('[BOT] QR gerado. Se quiser código de texto, chame /bot/start com número correto.');

        // Tenta pedir pairing code se tiver número configurado e ainda não conectado
        if (bot.phoneTarget && !bot.pairingCode && !bot.conectado) {
          try {
            const code = await sock.requestPairingCode(bot.phoneTarget);
            bot.pairingCode = code?.replace(/(.{4})(.{4})/, '$1-$2') || code;
            console.log(`[BOT] Pairing code gerado no QR handler: ${bot.pairingCode}`);
          } catch (e) {
            console.error('[BOT] Erro pairing code no QR handler:', e.message);
          }
        }
      }

      if (connection === 'open') {
        bot.conectado   = true;
        bot.qrDataUrl   = null;
        bot.pairingCode = null;
        bot.status      = 'connected';
        bot.tentativas  = 0;
        bot.iniciando   = false;
        bot.numero      = sock.user?.id?.split(':')[0] || CFG.DONO;
        console.log(`✅ WhatsApp CONECTADO! Número: ${bot.numero}`);

        // Religa enviarMsg
        enviarMsg = async (jid, texto) => {
          if (!bot.sock || !bot.conectado) throw new Error('Bot desconectado');
          await bot.sock.sendMessage(jid, { text: texto });
        };
      }

      if (connection === 'close') {
        bot.conectado  = false;
        bot.sock       = null;
        bot.status     = 'disconnected';
        bot.iniciando  = false;
        const code      = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = code === DisconnectReason.loggedOut;
        console.log(`[BOT] Conexão encerrada. Código: ${code}`);
        if (loggedOut) {
          limparAuth();
          setTimeout(iniciarBaileys, 3000);
        } else {
          bot.tentativas++;
          const delay = Math.min(5000 * bot.tentativas, 30000);
          console.log(`[BOT] Reconectando em ${delay / 1000}s...`);
          setTimeout(iniciarBaileys, delay);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        try {
          if (!m.message)                             continue;
          if (isJidBroadcast(m.key.remoteJid || '')) continue;
          if (m.key.remoteJid?.endsWith('@g.us'))     continue;

          const numero  = m.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
          const ehTeste = CFG.TESTES.some(t => t === numero || t === '55' + numero);

          if (m.key.fromMe && !ehTeste) continue;

          const texto =
            m.message?.conversation ||
            m.message?.extendedTextMessage?.text ||
            m.message?.imageMessage?.caption ||
            m.message?.videoMessage?.caption || '';

          if (!numero || !texto) continue;
          console.log(`[MSG] De ${numero}: ${texto.slice(0, 60)}`);
          await processarMsg(numero, texto);
        } catch (err) {
          console.error('[BOT] Erro ao processar:', err.message);
        }
      }
    });

    enviarMsg = async (jid, texto) => {
      if (!bot.sock || !bot.conectado) throw new Error('Bot desconectado');
      await bot.sock.sendMessage(jid, { text: texto });
    };

  } catch (err) {
    bot.iniciando = false;
    bot.status    = 'disconnected';
    console.error('[BOT] Erro ao iniciar:', err.message);
    bot.tentativas++;
    setTimeout(iniciarBaileys, Math.min(10000 * bot.tentativas, 60000));
  }
}

// Solicita pairing code — pode ser chamado a qualquer momento se sock existir
async function solicitarPairingCode(phone) {
  if (!phone || phone.length < 12) {
    throw new Error('Número inválido. Use DDI+DDD+número, ex: 5574991484460');
  }
  bot.phoneTarget = phone;
  bot.pairingCode = null;

  // Se não tem socket ainda, inicia o bot e aguarda
  if (!bot.sock) {
    await iniciarBaileys();
    // Aguarda socket estar pronto (máx 15s)
    for (let i = 0; i < 30; i++) {
      if (bot.sock) break;
      await new Promise(r => setTimeout(r, 500));
    }
    if (!bot.sock) throw new Error('Não foi possível iniciar o socket. Tente novamente.');
  }

  // Aguarda um pouco para o socket se estabilizar
  await new Promise(r => setTimeout(r, 1500));

  // Pede o código
  const code = await bot.sock.requestPairingCode(phone);
  bot.pairingCode = code?.replace(/(.{4})(.{4})/, '$1-$2') || code;
  console.log(`[BOT] Pairing code: ${bot.pairingCode}`);
  return bot.pairingCode;
}

// ══════════════════════════════════════════════════════════════════════
// PÁGINA /qr
// ══════════════════════════════════════════════════════════════════════

function paginaQR() {
  const css = `
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
      background:#0a0a0a;color:#eee;display:flex;align-items:center;
      justify-content:center;min-height:100vh;padding:20px}
    .card{background:#141414;border:1px solid #222;border-radius:24px;
      padding:40px 32px;max-width:420px;width:100%;text-align:center}
    h1{font-size:22px;font-weight:700;margin-bottom:8px}
    p{color:#888;font-size:14px;line-height:1.7;margin:8px 0}
    .badge{display:inline-block;padding:6px 16px;border-radius:99px;
      font-size:12px;font-weight:600;margin:12px 0}
    .green{background:#052e16;color:#22c55e;border:1px solid #166534}
    .yellow{background:#1a1200;color:#facc15;border:1px solid #854d0e}
    .num{color:#C9A84C;font-size:20px;font-weight:700;margin:12px 0}
    img{border-radius:16px;background:#fff;padding:14px;
      max-width:260px;width:100%;margin:20px auto;display:block}
    .spin{width:44px;height:44px;border:4px solid #222;border-top-color:#C9A84C;
      border-radius:50%;animation:spin 1s linear infinite;margin:24px auto}
    @keyframes spin{to{transform:rotate(360deg)}}
    a{color:#C9A84C;text-decoration:none;font-size:14px}
    .footer{margin-top:24px;padding-top:20px;border-top:1px solid #1f1f1f}
  `;

  if (bot.conectado) {
    return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Bot Conectado</title><style>${css}</style></head><body><div class="card">
<div style="font-size:56px;margin-bottom:16px">✅</div>
<h1>Bot Conectado!</h1>
<span class="badge green">● ONLINE</span>
${bot.numero ? `<div class="num">📱 +${bot.numero}</div>` : ''}
<p>O bot está ativo e respondendo clientes.</p>
<div class="footer"><a href="/">← Voltar ao app</a></div>
</div></body></html>`;
  }

  if (bot.qrDataUrl) {
    return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="20">
<title>Conectar WhatsApp</title><style>${css}</style></head><body><div class="card">
<div style="font-size:56px;margin-bottom:16px">📱</div>
<h1>Escanear QR Code</h1>
<span class="badge yellow">● AGUARDANDO</span>
<img src="${bot.qrDataUrl}" alt="QR Code">
<p>Atualiza a cada 20s</p>
<div class="footer"><a href="/">← Voltar ao app</a></div>
</div></body></html>`;
  }

  return `<!DOCTYPE html><html lang="pt-BR"><head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="5">
<title>Iniciando Bot</title><style>${css}</style></head><body><div class="card">
<h1>🤖 Iniciando...</h1><div class="spin"></div>
<p>Aguarde, preparando conexão.</p>
<div class="footer"><a href="/">← Voltar ao app</a></div>
</div></body></html>`;
}

// ══════════════════════════════════════════════════════════════════════
// HELPERS HTTP
// ══════════════════════════════════════════════════════════════════════

function jsonRes(res, data, status = 200) {
  res.writeHead(status, {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (_) { resolve({}); }
    });
    req.on('error', reject);
  });
}

// ══════════════════════════════════════════════════════════════════════
// SERVIDOR HTTP
// ══════════════════════════════════════════════════════════════════════

const server = http.createServer(async (req, res) => {
  const url    = req.url?.split('?')[0] || '/';
  const method = req.method?.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods':'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers':'Content-Type',
    });
    res.end();
    return;
  }

  // /qr — Painel visual
  if (url === '/qr') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    res.end(paginaQR());
    return;
  }

  // /health — Status geral
  if (url === '/health') {
    return jsonRes(res, {
      ok:        true,
      bot:       bot.conectado,
      status:    bot.status,
      numero:    bot.numero,
      sessoes:   Object.keys(sessoes).length,
      ts:        new Date().toISOString(),
    });
  }

  // ── GET /bot/status ──
  if (url === '/bot/status' && method === 'GET') {
    return jsonRes(res, {
      status: bot.status,
      phone:  bot.numero,
      code:   bot.pairingCode || null,
    });
  }

  // ── POST /bot/start ──
  // Gera código de pareamento para o número informado
  if (url === '/bot/start' && method === 'POST') {
    const body  = await readBody(req);
    const phone = (body.phone || '').replace(/\D/g, '');

    if (!phone || phone.length < 12) {
      return jsonRes(res, { error: 'Número inválido. Use DDI+DDD+número (ex: 5574991484460)' }, 400);
    }

    // Se já conectado com outro número, informa
    if (bot.conectado) {
      return jsonRes(res, { ok: true, status: 'connected', code: null, msg: 'Bot já conectado!' });
    }

    // Se número mudou em relação ao que está tentando, destrói e recomeça
    if (bot.phoneTarget && bot.phoneTarget !== phone) {
      console.log(`[BOT] Número mudou de ${bot.phoneTarget} para ${phone}. Reiniciando...`);
      await destruirSock();
      limparAuth();
      await new Promise(r => setTimeout(r, 1000));
    }

    try {
      const code = await solicitarPairingCode(phone);
      return jsonRes(res, {
        ok:     true,
        status: 'connecting',
        code:   code,
        msg:    'Código gerado! Vá em WhatsApp → ⋮ → Aparelhos conectados → Conectar com número de telefone → Digite o código.',
      });
    } catch (err) {
      console.error('[BOT] Erro ao gerar pairing code:', err.message);
      return jsonRes(res, {
        ok:     false,
        status: bot.status,
        code:   null,
        error:  err.message,
        msg:    'Erro ao gerar código. Tente novamente em 10 segundos.',
      });
    }
  }

  // ── POST /bot/disconnect ──
  if (url === '/bot/disconnect' && method === 'POST') {
    const body = await readBody(req);
    await destruirSock();
    bot.status      = 'disconnected';
    bot.conectado   = false;
    bot.pairingCode = null;
    if (body.limparSessao) limparAuth();
    return jsonRes(res, { ok: true });
  }

  // ── POST /bot/send ──
  if (url === '/bot/send' && method === 'POST') {
    const body = await readBody(req);
    if (!bot.conectado) return jsonRes(res, { error: 'Bot desconectado' }, 400);
    try {
      const jid = body.to?.replace(/\D/g, '') + '@s.whatsapp.net';
      await enviarMsg(jid, body.message || '');
      return jsonRes(res, { ok: true });
    } catch (err) {
      return jsonRes(res, { error: err.message }, 500);
    }
  }

  // ── GET /bot/messages ──
  if (url === '/bot/messages' && method === 'GET') {
    return jsonRes(res, { messages: [] });
  }

  // ── Arquivos estáticos ──
  let filePath = path.join(__dirname, url === '/' ? 'index.html' : url);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(data2);
      });
      return;
    }
    const mime = MIME[path.extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

// ── Inicia servidor ──────────────────────────────────────────────────
server.listen(CFG.PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  HR Mármores e Granitos — Bot v5.0  ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`📡 Porta:  ${CFG.PORT}`);
  console.log(`📱 Dono:   ${CFG.DONO}`);
  console.log(`🔗 Health: /health\n`);
  // NÃO inicia Baileys automaticamente — espera /bot/start com número
});

process.on('SIGTERM', () => { server.close(() => process.exit(0)); });
