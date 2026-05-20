// ══════════════════════════════════════════════════════════════════════
// HR Mármores e Granitos — Servidor + Bot WhatsApp (Baileys)
// Sem Evolution API. Sem Docker. Só GitHub + Railway.
// QR Code aparece nos logs do Railway — escaneie pelo celular.
// ══════════════════════════════════════════════════════════════════════

import http from 'http';
import fs   from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion }
  from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CFG = {
  DONO:    process.env.DONO_NUMERO || '74991484460',
  EMPRESA: process.env.EMPRESA     || 'HR Mármores e Granitos',
  PORT:    process.env.PORT        || 3000,
};

const MIME = {
  '.html':'text/html; charset=utf-8',
  '.js':'application/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8',
  '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg',
  '.ico':'image/x-icon', '.svg':'image/svg+xml', '.webp':'image/webp',
};

// ═══════════════════════════════════════════════════════════════════
// BOT — lógica de atendimento
// ═══════════════════════════════════════════════════════════════════

const sessoes = {};
const PROJETOS = ['Cozinha','Banheiro','Lavabo','Varanda/Churrasqueira','Escada','Piso','Túmulo/Jazigo','Outro'];
const E = { INICIO:0, NOME:1, PROJETO:2, DETALHE:3, MEDIDAS:4, MEDIDAS2:4.5, VISITA_SN:5, VISITA_END:6, HORARIO:7, FIM:8 };

function normaliza(t) {
  return (t||'').toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^\w\s\d,./:;-]/g,' ')
    .replace(/\s+/g,' ').trim();
}
function extrairNome(msg) {
  const limpo = msg
    .replace(/^(oi|ola|bom dia|boa tarde|boa noite|me chamo|meu nome e|sou o|sou a|aqui e)[,\s]*/i,'')
    .trim();
  if (limpo.length < 2) return null;
  return limpo.split(' ').map(p => p.charAt(0).toUpperCase()+p.slice(1).toLowerCase()).join(' ');
}
function idProjeto(msg) {
  const mapa = {
    '1':'Cozinha','cozinha':'Cozinha','pia':'Cozinha','bancada':'Cozinha',
    '2':'Banheiro','banheiro':'Banheiro',
    '3':'Lavabo','lavabo':'Lavabo',
    '4':'Varanda/Churrasqueira','varanda':'Varanda/Churrasqueira','churrasqueira':'Varanda/Churrasqueira',
    '5':'Escada','escada':'Escada','degrau':'Escada',
    '6':'Piso','piso':'Piso',
    '7':'Túmulo/Jazigo','tumulo':'Túmulo/Jazigo','jazigo':'Túmulo/Jazigo','cemiterio':'Túmulo/Jazigo',
    '8':'Outro','outro':'Outro',
  };
  for (const [k,v] of Object.entries(mapa)) if (msg.includes(k)) return v;
  return null;
}

let enviarMsg = async (jid, texto) => {
  console.log(`[BOT→${jid}]: ${texto.slice(0,80)}`);
};

async function processarMsg(numero, texto) {
  if (!numero || !texto) return;
  const msg = normaliza(texto);
  if (!msg) return;

  let s = sessoes[numero];
  const agora = Date.now();
  if (!s || (agora - (s.ts||0)) > 7200000) s = { e: E.INICIO, d: {}, ts: agora };
  s.ts = agora;

  const OI = ['oi','ola','bom dia','boa tarde','boa noite','opa','ei','menu','inicio'];
  if (s.e === E.FIM && OI.some(p => msg === p || msg.startsWith(p+' '))) s = { e: E.INICIO, d: {}, ts: agora };

  const resp = await fsm(s, msg, numero);
  sessoes[numero] = s;
  if (resp) await enviarMsg(numero+'@s.whatsapp.net', resp);
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
      return `Ótimo! *${proj}* 🏠\n\nMe conta mais: é *reforma* ou *obra nova*?\n_Ex: bancada nova, pia do banheiro, escada de granito..._`;
    }

    case E.DETALHE:
      s.d.detalhe = msg;
      s.e = E.MEDIDAS;
      return `Anotei! 📝\n\nVocê já tem as *medidas* aproximadas?\n\n*1.* ✅ Sim, tenho\n*2.* ❌ Não tenho`;

    case E.MEDIDAS: {
      const tem = /\b(1|sim|tenho|sei)\b/.test(msg);
      if (tem) {
        s.e = E.MEDIDAS2;
        return `Ótimo! Me informe as medidas como souber 📏\n_Ex: "bancada 2,50 x 0,60"_`;
      } else {
        s.d.medidas = 'Sem medidas — precisa de visita técnica';
        s.e = E.VISITA_END;
        return `Sem problema! Fazemos *visita técnica gratuita* 📐\n\nQual o *endereço completo*?`;
      }
    }

    case E.MEDIDAS2:
      s.d.medidas = msg;
      s.e = E.VISITA_SN;
      return `Medidas anotadas ✅\n\nQuer agendar uma *visita técnica gratuita*?\n\n*1.* ✅ Sim\n*2.* ❌ Não, só o orçamento`;

    case E.VISITA_SN: {
      const quer = /\b(1|sim|quero|pode|agendar)\b/.test(msg);
      if (quer) {
        s.d.querVisita = true;
        s.e = E.VISITA_END;
        return `Ótimo! 📅\n\nQual o *endereço completo* para a visita?`;
      } else {
        s.d.querVisita = false;
        return await finalizar(s, numero);
      }
    }

    case E.VISITA_END:
      s.d.endereco = msg;
      s.e = E.HORARIO;
      return `Endereço anotado! 📍\n\nQual o melhor *horário*?\n_Ex: "manhã", "tarde", "segunda às 14h"_`;

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
  const hora = new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' });

  const notif = [
    `🔔 *NOVO LEAD — WHATSAPP*`, ``,
    `👤 *Cliente:* ${d.nome||'---'}`,
    `📱 *Número:* wa.me/55${numero}`,
    `🏗 *Projeto:* ${d.projeto||'---'}`,
    `📝 *Detalhes:* ${d.detalhe||'---'}`,
    `📏 *Medidas:* ${d.medidas||'Não informado'}`,
    d.endereco ? `📍 *Endereço:* ${d.endereco}` : null,
    d.horario  ? `🕐 *Horário:* ${d.horario}` : null,
    ``, `⏰ ${hora}`,
  ].filter(Boolean).join('\n');

  enviarMsg(CFG.DONO+'@s.whatsapp.net', notif).catch(()=>{});

  return [
    `✅ *${d.nome}, recebi tudo!* 🙌`, ``,
    `*Resumo:*`,
    `• Projeto: ${d.projeto}`,
    d.medidas !== 'Sem medidas — precisa de visita técnica'
      ? `• Medidas: ${d.medidas}` : `• Visita técnica necessária`,
    d.endereco ? `• Endereço: ${d.endereco}` : null,
    d.horario  ? `• Horário: ${d.horario}` : null,
    ``,
    `📞 Nossa equipe entra em contato em breve!`,
    ``, `*${CFG.EMPRESA}* 🪨✨`,
  ].filter(Boolean).join('\n');
}

// ═══════════════════════════════════════════════════════════════════
// BAILEYS — conexão WhatsApp
// ═══════════════════════════════════════════════════════════════════

async function iniciarBaileys() {
  try {
    const AUTH_DIR = '/tmp/baileys_auth';
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      browser: ['HR Mármores', 'Chrome', '1.0'],
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
      if (qr) {
        console.log('\n══════════════════════════════════════════════');
        console.log('📱 ESCANEIE O QR CODE ACIMA COM O WHATSAPP');
        console.log('WhatsApp → Configurações → Aparelhos conectados → Conectar aparelho');
        console.log('══════════════════════════════════════════════\n');
      }
      if (connection === 'open') {
        console.log('\n✅ WhatsApp CONECTADO! Bot ativo e respondendo.\n');
      }
      if (connection === 'close') {
        const code = (lastDisconnect?.error)?.output?.statusCode;
        const reconectar = code !== DisconnectReason.loggedOut;
        if (reconectar) {
          console.log(`[BOT] Reconectando em 5s...`);
          setTimeout(iniciarBaileys, 5000);
        } else {
          console.log('[BOT] Sessão encerrada. Escaneie o QR novamente reiniciando o serviço.');
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      for (const m of messages) {
        if (m.key.fromMe) continue;
        if (m.key.remoteJid?.endsWith('@g.us')) continue;
        const numero = m.key.remoteJid.replace('@s.whatsapp.net','');
        const texto =
          m.message?.conversation ||
          m.message?.extendedTextMessage?.text ||
          m.message?.audioMessage?.caption || '';
        if (texto) await processarMsg(numero, texto);
      }
    });

    enviarMsg = async (jid, texto) => {
      await sock.sendMessage(jid, { text: texto });
    };

  } catch(e) {
    console.error('[BOT] Erro:', e.message);
    setTimeout(iniciarBaileys, 10000);
  }
}

// ═══════════════════════════════════════════════════════════════════
// SERVIDOR HTTP
// ═══════════════════════════════════════════════════════════════════

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, {'Content-Type':'application/json'});
    res.end(JSON.stringify({ ok:true, sessoes: Object.keys(sessoes).length, ts: new Date().toISOString() }));
    return;
  }

  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  if (!filePath.startsWith(__dirname)) { res.writeHead(403); res.end('Forbidden'); return; }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(__dirname, 'index.html'), (err2, data2) => {
        if (err2) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
        res.end(data2);
      });
      return;
    }
    const ext  = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(CFG.PORT, '0.0.0.0', () => {
  console.log(`\n✅ HR Mármores — porta ${CFG.PORT}`);
  console.log(`📱 Dono: ${CFG.DONO}`);
  console.log(`🤖 Iniciando bot WhatsApp...\n`);
  iniciarBaileys();
});
