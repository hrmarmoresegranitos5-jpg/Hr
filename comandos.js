// src/comandos.js
// ─────────────────────────────────────────────────────────────
//  Processa comandos especiais que começam com !
// ─────────────────────────────────────────────────────────────

import { limparHistorico, estatisticas } from './memoria.js';
import { CONFIG } from './config.js';
import { listarGastos, removerUltimoGasto } from './supabase.js';
import { formatarResumoGastos } from './gastos.js';

// ── Datas auxiliares (fuso America/Bahia) ──────────────────────
function hojeISO() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' });
}
function inicioSemanaISO() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
  const diaSemana = d.getDay(); // 0 = domingo
  d.setDate(d.getDate() - diaSemana);
  return d.toLocaleDateString('sv-SE');
}
function inicioMesISO() {
  const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Bahia' }));
  d.setDate(1);
  return d.toLocaleDateString('sv-SE');
}

// ── Mapa de comandos disponíveis (todos async) ───────────────
const COMANDOS = {
  '!ajuda': cmdAjuda,
  '!esquecer': cmdEsquecer,
  '!status': cmdStatus,
  '!ping': cmdPing,
  '!gastos': cmdGastos,
  '!desfazer': cmdDesfazer,
};

// ── Roteador principal ───────────────────────────────────────
export async function processarComando(texto, jid) {
  const cmd = texto.trim().toLowerCase().split(' ')[0];
  const handler = COMANDOS[cmd];
  if (!handler) return null; // não é um comando reconhecido
  return handler(jid, texto);
}

// ── Handlers ─────────────────────────────────────────────────

function cmdAjuda() {
  return `🤖 *${CONFIG.assistente.nome} — Comandos disponíveis*\n\n`
    + `!ajuda → exibe esta mensagem\n`
    + `!esquecer → apaga o histórico da nossa conversa\n`
    + `!status → mostra informações do bot\n`
    + `!ping → verifica se o bot está online\n`
    + `!gastos hoje | semana | mes → resumo dos gastos lançados\n`
    + `!desfazer → apaga o último gasto que você lançou\n\n`
    + `💬 Pra registrar um gasto é só escrever normalmente, tipo:\n`
    + `_"hoje gastei 100 reais de combustível"_\n\n`
    + `💬 Qualquer outra coisa vai direto pra IA!`;
}

function cmdEsquecer(jid) {
  limparHistorico(jid);
  return `🧹 Histórico apagado! Começamos do zero. Como posso te ajudar?`;
}

function cmdStatus() {
  const stats = estatisticas();
  const uptime = process.uptime();
  const horas = Math.floor(uptime / 3600);
  const minutos = Math.floor((uptime % 3600) / 60);
  const memoria = process.memoryUsage();
  const mbUsados = (memoria.rss / 1024 / 1024).toFixed(1);

  return `📊 *Status de ${CONFIG.assistente.nome}*\n\n`
    + `✅ Online e funcionando\n`
    + `⏱ Uptime: ${horas}h ${minutos}min\n`
    + `💬 Conversas ativas: ${stats.conversas}\n`
    + `📨 Mensagens em memória: ${stats.mensagens}\n`
    + `🧠 Memória RAM: ${mbUsados} MB\n`
    + `🤖 Modelo: ${CONFIG.anthropic.modelo}`;
}

function cmdPing() {
  return `🏓 Pong! ${CONFIG.assistente.nome} está online.`;
}

async function cmdGastos(jid, texto) {
  const partes = texto.trim().toLowerCase().split(' ');
  const periodo = partes[1] || 'hoje';
  const hoje = hojeISO();

  let inicio, titulo;
  if (periodo === 'semana') {
    inicio = inicioSemanaISO();
    titulo = 'esta semana';
  } else if (periodo === 'mes' || periodo === 'mês') {
    inicio = inicioMesISO();
    titulo = 'este mês';
  } else {
    inicio = hoje;
    titulo = 'hoje';
  }

  try {
    const linhas = await listarGastos(inicio, hoje);
    return formatarResumoGastos(linhas, titulo);
  } catch (e) {
    return `⚠️ Não consegui consultar os gastos agora.\n_${e.message}_`;
  }
}

async function cmdDesfazer(jid) {
  try {
    const removido = await removerUltimoGasto(jid);
    if (!removido) return '🤷 Não encontrei nenhum gasto seu pra desfazer.';
    return `🗑 Removido: ${removido.descricao} — R$ ${Number(removido.valor).toFixed(2).replace('.', ',')}`;
  } catch (e) {
    return `⚠️ Não consegui desfazer agora.\n_${e.message}_`;
  }
}
