// src/acesso.js
// ─────────────────────────────────────────────────────────────
//  Controle de quem pode usar a assistente
// ─────────────────────────────────────────────────────────────

import { CONFIG } from './config.js';

// ── Extrai número limpo de um JID do WhatsApp ────────────────
// JID formato: "5573999887766@s.whatsapp.net" (privado)
//              "5573999887766-1234567@g.us"   (grupo)
function extrairNumero(jid) {
  return jid.split('@')[0].split(':')[0];
}

// ── Verifica se o remetente tem autorização ──────────────────
export function isAutorizado(jid) {
  // Se nenhum número configurado, permite todos
  if (CONFIG.acesso.numerosAutorizados.length === 0) return true;

  const numero = extrairNumero(jid);
  return CONFIG.acesso.numerosAutorizados.includes(numero);
}

// ── Verifica se é uma mensagem de grupo ──────────────────────
export function isGrupo(jid) {
  return jid.endsWith('@g.us');
}

// ── Verifica se é mensagem do próprio bot ────────────────────
export function isMeuProprioMensagem(msg) {
  return msg.key?.fromMe === true;
}
