// src/memoria.js
// ─────────────────────────────────────────────────────────────
//  Gerencia o histórico de conversa por número
//  Mantém contexto em memória RAM (reinicia com o processo)
// ─────────────────────────────────────────────────────────────

const historicos = new Map(); // jid → [{ role, content }]

const MAX_MENSAGENS = 30; // máximo de pares de mensagens por conversa

// ── Retorna histórico de um contato ──────────────────────────
export function obterHistorico(jid) {
  return historicos.get(jid) ?? [];
}

// ── Adiciona mensagem ao histórico ───────────────────────────
export function adicionarMensagem(jid, role, content) {
  if (!historicos.has(jid)) {
    historicos.set(jid, []);
  }
  const hist = historicos.get(jid);
  hist.push({ role, content });

  // Remove as mais antigas se passar do limite (mantém pares)
  while (hist.length > MAX_MENSAGENS) {
    hist.splice(0, 2);
  }
}

// ── Limpa histórico (comando !esquecer) ──────────────────────
export function limparHistorico(jid) {
  historicos.delete(jid);
}

// ── Estatísticas ─────────────────────────────────────────────
export function estatisticas() {
  let total = 0;
  for (const hist of historicos.values()) total += hist.length;
  return { conversas: historicos.size, mensagens: total };
}
