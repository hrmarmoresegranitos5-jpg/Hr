// src/logger.js
// ─────────────────────────────────────────────────────────────
//  Logger leve com cores e timestamps no console
// ─────────────────────────────────────────────────────────────

import { CONFIG } from './config.js';

const cores = {
  reset: '\x1b[0m',
  cinza:  '\x1b[90m',
  verde:  '\x1b[32m',
  amarelo:'\x1b[33m',
  vermelho:'\x1b[31m',
  ciano:  '\x1b[36m',
  magenta:'\x1b[35m',
};

function timestamp() {
  return new Date().toLocaleTimeString('pt-BR', { timeZone: 'America/Bahia' });
}

function formatar(nivel, cor, ...args) {
  const ts = `${cores.cinza}[${timestamp()}]${cores.reset}`;
  const lv = `${cor}[${nivel}]${cores.reset}`;
  console.log(ts, lv, ...args);
}

export const log = {
  info:    (...a) => formatar('INFO ', cores.ciano,    ...a),
  ok:      (...a) => formatar('OK   ', cores.verde,    ...a),
  aviso:   (...a) => formatar('AVISO', cores.amarelo,  ...a),
  erro:    (...a) => formatar('ERRO ', cores.vermelho,  ...a),
  msg:     (...a) => formatar('MSG  ', cores.magenta,  ...a),
  debug:   (...a) => { if (CONFIG.debug) formatar('DEBUG', cores.cinza, ...a); },
};
