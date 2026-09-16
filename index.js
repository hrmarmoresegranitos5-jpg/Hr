// src/index.js
// ─────────────────────────────────────────────────────────────
//  Assistente Virtual via WhatsApp + Registro de Gastos
//  QR Code exibido no navegador via servidor HTTP
// ─────────────────────────────────────────────────────────────

import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  isJidBroadcast,
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import { CONFIG } from './config.js';
import { log } from './logger.js';
import { consultarIA } from './ia.js';
import { processarComando } from './comandos.js';
import { tentarProcessarGasto } from './gastos.js';
import { isAutorizado, isGrupo, isMeuProprioMensagem } from './acesso.js';
import { iniciarServidor, estado } from './servidor.js';

// ── Estado global ─────────────────────────────────────────────
let sock = null;
let tentativasReconexao = 0;
const MAX_RECONEXOES = 10;

// ── Extrai texto de qualquer tipo de mensagem ─────────────────
function extrairTexto(msg) {
  const m = msg.message;
  if (!m) return null;

  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    m.buttonsResponseMessage?.selectedButtonId ||
    m.listResponseMessage?.singleSelectReply?.selectedRowId ||
    null
  );
}

// ── Handler de mensagens recebidas ───────────────────────────
async function onMensagem({ messages, type }) {
  if (type !== 'notify') return;

  for (const msg of messages) {
    try {
      if (isMeuProprioMensagem(msg)) continue;
      if (isJidBroadcast(msg.key.remoteJid)) continue;
      if (isGrupo(msg.key.remoteJid)) continue;

      const jid = msg.key.remoteJid;
      const texto = extrairTexto(msg);

      if (!texto || texto.trim().length === 0) continue;

      log.msg(`📩 De ${jid}: "${texto.substring(0, 60)}${texto.length > 60 ? '...' : ''}"`);

      // Verifica autorização
      if (!isAutorizado(jid)) {
        log.aviso(`Acesso negado para: ${jid}`);
        await sock.sendMessage(jid, {
          text: '⛔ Você não tem autorização para usar esta assistente.',
        });
        continue;
      }

      await sock.readMessages([msg.key]);
      await sock.sendPresenceUpdate('composing', jid);

      let resposta;

      // 1) É um comando (!ajuda, !gastos hoje, etc.)?
      const respostaComando = await processarComando(texto, jid);

      if (respostaComando !== null) {
        resposta = respostaComando;
      } else {
        // 2) Não é comando — tenta reconhecer como lançamento de gasto
        const respostaGasto = await tentarProcessarGasto(jid, texto);

        if (respostaGasto !== null) {
          resposta = respostaGasto;
        } else {
          // 3) Não é gasto — conversa normal com a IA
          resposta = await consultarIA(jid, texto);
        }
      }

      await sock.sendPresenceUpdate('paused', jid);
      await sock.sendMessage(jid, { text: resposta });

      log.ok(`✅ Respondido para ${jid}`);

    } catch (erro) {
      log.erro('Erro ao processar mensagem:', erro.message);
      log.debug(erro.stack);
    }
  }
}

// ── Inicializa o bot ──────────────────────────────────────────
async function iniciar() {
  const { state, saveCreds } = await useMultiFileAuthState(CONFIG.sessaoDiretorio);
  const { version } = await fetchLatestBaileysVersion();

  log.info(`Iniciando ${CONFIG.assistente.nome} com Baileys v${version.join('.')}`);

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    markOnlineOnConnect: true,
    syncFullHistory: false,
    generateHighQualityLinkPreview: false,
  });

  // ── Eventos de conexão ──────────────────────────────────────
  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {

    // Novo QR Code gerado → converte para imagem e disponibiliza no servidor
    if (qr) {
      try {
        estado.qrCode = await QRCode.toDataURL(qr, {
          errorCorrectionLevel: 'H',
          margin: 2,
          width: 300,
        });
        estado.conectado = false;
        log.info('QR Code atualizado — abra o link do Railway para escanear');
      } catch (e) {
        log.erro('Erro ao gerar QR Code:', e.message);
      }
    }

    if (connection === 'open') {
      tentativasReconexao = 0;
      estado.conectado = true;
      estado.qrCode = null;

      log.ok(`✨ ${CONFIG.assistente.nome} conectada com sucesso!`);
      log.info(`Dono: ${CONFIG.dono.nome} | Modelo: ${CONFIG.anthropic.modelo}`);

      const autorizados = CONFIG.acesso.numerosAutorizados;
      if (autorizados.length > 0) {
        log.info(`Números autorizados: ${autorizados.join(', ')}`);
      } else {
        log.aviso('Modo aberto: respondendo a qualquer número');
      }
      log.info('Aguardando mensagens...\n');
    }

    if (connection === 'close') {
      estado.conectado = false;
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const deveReconectar = statusCode !== DisconnectReason.loggedOut;

      if (deveReconectar && tentativasReconexao < MAX_RECONEXOES) {
        tentativasReconexao++;
        const espera = Math.min(1000 * 2 ** tentativasReconexao, 30000);
        log.aviso(`Conexão encerrada. Reconectando em ${espera / 1000}s... (${tentativasReconexao}/${MAX_RECONEXOES})`);
        setTimeout(iniciar, espera);
      } else if (statusCode === DisconnectReason.loggedOut) {
        log.erro('Sessão encerrada. Delete a pasta "auth_info_baileys/" e reinicie.');
        process.exit(1);
      } else {
        log.erro(`Não foi possível reconectar após ${MAX_RECONEXOES} tentativas.`);
        process.exit(1);
      }
    }
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('messages.upsert', onMensagem);
}

// ── Tratamento de erros globais ───────────────────────────────
process.on('uncaughtException', (erro) => {
  log.erro('Exceção não capturada:', erro.message);
  log.debug(erro.stack);
});

process.on('unhandledRejection', (motivo) => {
  log.erro('Promise rejeitada:', motivo);
});

process.on('SIGINT', () => {
  log.info('Encerrando bot...');
  sock?.end();
  process.exit(0);
});

// ── Boot ──────────────────────────────────────────────────────
iniciarServidor(); // sobe o servidor web na porta 3000
iniciar();         // conecta ao WhatsApp
