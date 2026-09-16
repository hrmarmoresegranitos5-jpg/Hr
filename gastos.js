// src/gastos.js
// ─────────────────────────────────────────────────────────────
//  Detecta e extrai lançamentos de gasto de uma mensagem livre
//  (ex: "hoje gastei 100 reais de combustível") usando Claude,
//  e grava no Supabase.
// ─────────────────────────────────────────────────────────────

import fetch from 'node-fetch';
import { CONFIG } from './config.js';
import { inserirGasto } from './supabase.js';

const CATEGORIAS = [
  'combustível', 'material', 'alimentação', 'manutenção',
  'transporte', 'mão de obra', 'ferramentas', 'outros',
];

function promptExtracao() {
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Bahia' }); // YYYY-MM-DD

  return `Você identifica se uma mensagem de WhatsApp descreve um GASTO (dinheiro que a pessoa pagou/gastou) e extrai os dados.

Data de hoje: ${hoje} (fuso America/Bahia)
Categorias possíveis: ${CATEGORIAS.join(', ')}

Regras:
- Se a mensagem descreve um gasto, responda APENAS com este JSON, sem nenhum texto antes ou depois:
{"e_gasto":true,"data":"YYYY-MM-DD","valor":123.45,"descricao":"texto curto","categoria":"uma das categorias listadas"}
- "data": resolva termos relativos ("hoje", "ontem", "anteontem") com base na data de hoje acima. Se não houver menção de data, use hoje.
- "valor": só o número, com ponto decimal, sem "R$" e sem separador de milhar.
- "descricao": curta, no que foi gasto (ex: "combustível", "almoço com cliente"), sem repetir o valor.
- "categoria": escolha a mais próxima da lista; se nenhuma encaixar bem, use "outros".
- Se a mensagem NÃO for um gasto (pergunta, conversa, pedido, saudação etc.), responda APENAS: {"e_gasto":false}
- Nunca invente um gasto que não foi mencionado.`;
}

function extrairJSON(texto) {
  const limpo = texto.replace(/```json|```/g, '').trim();
  const inicio = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (inicio === -1 || fim === -1) return null;
  try {
    return JSON.parse(limpo.slice(inicio, fim + 1));
  } catch {
    return null;
  }
}

// ── Consulta a IA só para classificar/extrair (sem histórico de chat) ──
async function classificarMensagem(texto) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CONFIG.anthropic.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: CONFIG.anthropic.modelo,
      max_tokens: 300,
      system: promptExtracao(),
      messages: [{ role: 'user', content: texto }],
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) throw new Error(`API ${res.status}`);
  const dados = await res.json();
  const resposta = dados.content?.[0]?.text ?? '';
  return extrairJSON(resposta);
}

function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatarData(dataISO) {
  const [ano, mes, dia] = dataISO.split('-');
  return `${dia}/${mes}/${ano}`;
}

// ── Ponto de entrada: tenta processar a mensagem como gasto.
//     Retorna uma string de resposta se era um gasto, ou null se não era. ──
export async function tentarProcessarGasto(jid, texto) {
  const extraido = await classificarMensagem(texto);
  if (!extraido || extraido.e_gasto !== true) return null;

  const { data, valor, descricao, categoria } = extraido;
  if (typeof valor !== 'number' || !data || !descricao) return null;

  const registro = await inserirGasto({
    data,
    valor,
    descricao,
    categoria: CATEGORIAS.includes(categoria) ? categoria : 'outros',
    jid,
  });

  return `💸 Gasto registrado\n\n`
    + `📅 ${formatarData(registro.data)}\n`
    + `💰 ${formatarMoeda(registro.valor)}\n`
    + `📝 ${registro.descricao}\n`
    + `🏷 ${registro.categoria}\n\n`
    + `_Errou algo? Manda *!desfazer* que eu apago esse último lançamento._`;
}

// ── Formata o resumo usado pelos comandos !gastos hoje/semana/mes ──
export function formatarResumoGastos(linhas, tituloPeriodo) {
  if (linhas.length === 0) {
    return `📊 *Gastos — ${tituloPeriodo}*\n\nNenhum gasto lançado nesse período.`;
  }

  const total = linhas.reduce((soma, g) => soma + Number(g.valor), 0);

  const porCategoria = {};
  for (const g of linhas) {
    porCategoria[g.categoria] = (porCategoria[g.categoria] || 0) + Number(g.valor);
  }
  const linhasCategoria = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, val]) => `• ${cat}: ${formatarMoeda(val)}`)
    .join('\n');

  const ultimosLancamentos = linhas
    .slice(-5)
    .reverse()
    .map(g => `${formatarData(g.data)} — ${formatarMoeda(Number(g.valor))} — ${g.descricao}`)
    .join('\n');

  return `📊 *Gastos — ${tituloPeriodo}*\n\n`
    + `💰 Total: *${formatarMoeda(total)}* (${linhas.length} lançamento${linhas.length > 1 ? 's' : ''})\n\n`
    + `*Por categoria:*\n${linhasCategoria}\n\n`
    + `*Últimos lançamentos:*\n${ultimosLancamentos}`;
}
