// ══════════════════════════════════════════════════════════════
// HR MÁRMORES — WhatsApp Bot Server
// Baseado em @whiskeysockets/baileys
//
// INSTALAÇÃO:
//   npm install @whiskeysockets/baileys express cors pino
//
// RODAR:
//   node bot-server.js
//
// O servidor fica em http://localhost:3001
// Configure a URL no app na aba Secretária
// ══════════════════════════════════════════════════════════════

const {
  default: makeWASocket,
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  isJidBroadcast,
} = require('@whiskeysockets/baileys');
const express = require('express');
const cors    = require('cors');
const P       = require('pino');
const path    = require('path');
const fs      = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// ── Estado global ──
let sock           = null;
let botStatus      = 'disconnected'; // 'disconnected' | 'connecting' | 'connected'
let pairingCode    = null;
let botPhone       = null;
let reconnectTimer = null;

// ── Mensagens recebidas (últimas 50) ──
let mensagens = [];

// ── Inicia o bot e solicita código de pareamento ──
async function iniciarBot(phone) {
  try {
    clearTimeout(reconnectTimer);

    const { state, saveCreds } = await useMultiFileAuthState(
      path.join(__dirname, 'auth_hr_bot')
    );
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      printQRInTerminal: false,
      logger: P({ level: 'silent' }),
      browser: ['HR Mármores Bot', 'Chrome', '3.0.0'],
      markOnlineOnConnect: false,
    });

    botStatus  = 'connecting';
    botPhone   = phone;
    pairingCode = null;

    // Solicita o código de pareamento se ainda não autenticado
    if (!state.creds.registered) {
      await new Promise(r => setTimeout(r, 2500));
      try {
        const code = await sock.requestPairingCode(phone);
        // formata como XXXX-XXXX para facilitar leitura
        pairingCode = code?.replace(/(.{4})(.{4})/, '$1-$2') || code;
        console.log(`\n📱 CÓDIGO DE PAREAMENTO: ${pairingCode}\n`);
      } catch (e) {
        console.error('Erro ao gerar código:', e.message);
      }
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect }) => {
      if (connection === 'close') {
        botStatus = 'disconnected';
        const code = lastDisconnect?.error?.output?.statusCode;
        const deslogado = code === DisconnectReason.loggedOut;
        console.log(`Conexão encerrada. Código: ${code}. Deslogado: ${deslogado}`);
        if (!deslogado) {
          console.log('Reconectando em 5s...');
          reconnectTimer = setTimeout(() => iniciarBot(phone), 5000);
        }
      } else if (connection === 'open') {
        botStatus   = 'connected';
        pairingCode = null;
        console.log('✅ Bot conectado ao WhatsApp!');
      }
    });

    // ── Responde mensagens automaticamente ──
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const msg of messages) {
        if (msg.key.fromMe || isJidBroadcast(msg.key.remoteJid)) continue;

        const texto = msg.message?.conversation
          || msg.message?.extendedTextMessage?.text
          || '';
        const de = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || '';
        const ts = new Date().toISOString();

        // Armazena (máx 50)
        mensagens.unshift({ de, texto, ts });
        if (mensagens.length > 50) mensagens.pop();

        console.log(`Msg de ${de}: ${texto}`);

        // Auto-resposta se mencionar orçamento
        const low = texto.toLowerCase();
        if (low.includes('orçamento') || low.includes('orcamento') || low.includes('pedra')
          || low.includes('granito') || low.includes('mármore') || low.includes('marmore')) {
          await sock.sendMessage(msg.key.remoteJid, {
            text: '👋 Olá! Obrigado pelo interesse na *HR Mármores e Granitos*.\n\n'
              + 'Para um orçamento personalizado, me diga:\n'
              + '• Qual ambiente? (Cozinha, Banheiro, etc.)\n'
              + '• Medidas aproximadas (ex: 2,50 × 0,60 m)\n'
              + '• Material de preferência?\n\n'
              + 'Nosso atendente entrará em contato em breve! 🪨'
          });
        }
      }
    });

    return pairingCode;
  } catch (err) {
    botStatus = 'disconnected';
    console.error('Erro ao iniciar bot:', err);
    throw err;
  }
}

// ── Desconecta e limpa sessão ──
async function desconectarBot(limparSessao = false) {
  clearTimeout(reconnectTimer);
  if (sock) {
    try { await sock.logout(); } catch (_) {}
    sock = null;
  }
  botStatus   = 'disconnected';
  pairingCode = null;
  if (limparSessao) {
    const dir = path.join(__dirname, 'auth_hr_bot');
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
    console.log('Sessão removida.');
  }
}

// ────────────────────────────────────────────
// ROTAS
// ────────────────────────────────────────────

// Iniciar / gerar código
app.post('/bot/start', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: 'Número obrigatório' });
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 12) return res.status(400).json({ error: 'Número inválido — use DDI+DDD+número (ex: 5574999990000)' });
    const code = await iniciarBot(clean);
    res.json({ ok: true, code, status: botStatus });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Status
app.get('/bot/status', (req, res) => {
  res.json({ status: botStatus, code: pairingCode, phone: botPhone });
});

// Desconectar
app.post('/bot/disconnect', async (req, res) => {
  await desconectarBot(!!req.body?.limparSessao);
  res.json({ ok: true });
});

// Enviar mensagem
app.post('/bot/send', async (req, res) => {
  try {
    const { to, message } = req.body;
    if (!sock || botStatus !== 'connected')
      return res.status(400).json({ error: 'Bot desconectado' });
    const jid = to.replace(/\D/g, '') + '@s.whatsapp.net';
    await sock.sendMessage(jid, { text: message });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Últimas mensagens recebidas
app.get('/bot/messages', (req, res) => {
  res.json({ messages: mensagens });
});

// ────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('\n🤖 HR Bot Server iniciado!');
  console.log(`📡 Porta: ${PORT}`);
  console.log(`🌐 URL:   http://localhost:${PORT}`);
  console.log('\nConfigure a URL no app → aba Secretária → WhatsApp Bot\n');
});
