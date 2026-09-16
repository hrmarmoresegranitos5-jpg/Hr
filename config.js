// src/config.js
// ─────────────────────────────────────────────────────────────
//  Configuração central — lida de .env com validação
// ─────────────────────────────────────────────────────────────

import 'dotenv/config';

function obrigatorio(chave) {
  const valor = process.env[chave];
  if (!valor || valor.includes('COLOQUE')) {
    console.error(`\n❌  Variável "${chave}" não configurada no arquivo .env\n`);
    process.exit(1);
  }
  return valor;
}

function opcional(chave, padrao = '') {
  return process.env[chave] || padrao;
}

// ── Exporta configuração validada ──────────────────────────────
export const CONFIG = {
  // Identidade
  dono: {
    nome: opcional('DONO_NOME', 'Dono'),
  },
  assistente: {
    nome: opcional('ASSISTENTE_NOME', 'Assistente'),
  },

  // Autenticação da API
  anthropic: {
    apiKey: obrigatorio('ANTHROPIC_API_KEY'),
    modelo: 'claude-sonnet-4-20250514',
    maxTokens: 1024,
  },

  // Banco de dados dos gastos
  supabase: {
    url: obrigatorio('SUPABASE_URL'),
    serviceKey: obrigatorio('SUPABASE_SERVICE_KEY'),
  },

  // Controle de acesso
  acesso: {
    // Números no formato internacional sem + (ex: 5573999887766)
    numerosAutorizados: opcional('NUMEROS_AUTORIZADOS', '')
      .split(',')
      .map(n => n.trim())
      .filter(Boolean),
  },

  // Sistema
  debug: opcional('DEBUG', 'false') === 'true',
  sessaoDiretorio: './auth_info_baileys',
};

// ── Valida lista de números ────────────────────────────────────
if (CONFIG.acesso.numerosAutorizados.length === 0) {
  console.warn('⚠️  Nenhum número autorizado definido — o bot responderá a qualquer um.');
}
