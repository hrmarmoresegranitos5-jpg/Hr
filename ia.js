// src/ia.js
// ─────────────────────────────────────────────────────────────
//  Integração com Claude (Anthropic) para respostas inteligentes
// ─────────────────────────────────────────────────────────────

import fetch from 'node-fetch';
import { CONFIG } from './config.js';
import { obterHistorico, adicionarMensagem } from './memoria.js';

// ── Prompt de sistema da assistente ──────────────────────────
function promptSistema() {
  const agora = new Date().toLocaleString('pt-BR', {
    timeZone: 'America/Bahia',
    dateStyle: 'full',
    timeStyle: 'short',
  });

  return `Você é ${CONFIG.assistente.nome}, assistente virtual pessoal de ${CONFIG.dono.nome}.

Personalidade:
- Prestativa, inteligente e direta ao ponto
- Usa linguagem natural, amigável e em português brasileiro
- Respostas curtas e objetivas no WhatsApp (máximo 3 parágrafos)
- Usa emojis com moderação para deixar a conversa mais leve
- Quando não souber algo, diz claramente em vez de inventar

Contexto atual:
- Data e hora: ${agora}
- Você está respondendo via WhatsApp

Capacidades:
- Responder perguntas gerais e específicas
- Ajudar com tarefas, cálculos, traduções e resumos
- Redigir textos, e-mails e mensagens
- Dar sugestões e fazer pesquisas gerais
- Ajudar com gestão de tempo e organização

Comandos especiais que o usuário pode usar:
- !ajuda → lista de comandos
- !esquecer → apaga o histórico da conversa
- !status → mostra status do bot

Seja sempre útil, concisa e use o nome do usuário quando souber.`;
}

// ── Envia mensagem para a API e retorna resposta ──────────────
export async function consultarIA(jid, mensagemUsuario) {
  const historico = obterHistorico(jid);

  // Adiciona mensagem do usuário ao histórico
  adicionarMensagem(jid, 'user', mensagemUsuario);

  const payload = {
    model: CONFIG.anthropic.modelo,
    max_tokens: CONFIG.anthropic.maxTokens,
    system: promptSistema(),
    messages: [...historico, { role: 'user', content: mensagemUsuario }],
  };

  let tentativas = 0;
  const MAX_TENTATIVAS = 3;

  while (tentativas < MAX_TENTATIVAS) {
    tentativas++;
    try {
      const resposta = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.anthropic.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30_000), // 30s timeout
      });

      if (!resposta.ok) {
        const erro = await resposta.json().catch(() => ({}));
        throw new Error(`API ${resposta.status}: ${erro?.error?.message ?? resposta.statusText}`);
      }

      const dados = await resposta.json();
      const textoResposta = dados.content?.[0]?.text ?? '⚠️ Resposta vazia da API.';

      // Salva resposta no histórico
      adicionarMensagem(jid, 'assistant', textoResposta);

      return textoResposta;

    } catch (erro) {
      if (tentativas >= MAX_TENTATIVAS) {
        console.error(`[IA] Erro após ${MAX_TENTATIVAS} tentativas:`, erro.message);
        return `⚠️ Não consegui processar sua mensagem agora. Tente novamente em alguns instantes.\n\n_Erro: ${erro.message}_`;
      }
      // Aguarda antes de tentar de novo (backoff exponencial)
      await new Promise(r => setTimeout(r, 1000 * tentativas));
    }
  }
}
