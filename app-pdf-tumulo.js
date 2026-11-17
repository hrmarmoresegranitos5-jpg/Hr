// ═══════════════════════════════════════════════════════════════════
// ── APP-PDF-TUMULO.JS — MÓDULO DE PDF DE TÚMULOS ──
// ═══════════════════════════════════════════════════════════════════
//
// O gerador principal de PDF de túmulos (gerarPDFTumulo) está
// definido em app-core.js — é um PDF de 6 páginas em formato A4
// com design premium dourado/escuro.
//
// Este arquivo contém funções auxiliares de PDF usadas
// pelo sistema de histórico e orçamentos de túmulos.
// ═══════════════════════════════════════════════════════════════════

// ── Alias de segurança: garante que gerarPDFTumulo existe antes de chamar ──
function _chamarPDFTumulo(q) {
  if (typeof gerarPDFTumulo === 'function') {
    gerarPDFTumulo(q);
  } else {
    if (typeof toast === 'function') toast('⚠️ Carregando módulo PDF...');
    // Aguarda app-core.js carregar e tenta de novo
    setTimeout(function() {
      if (typeof gerarPDFTumulo === 'function') {
        gerarPDFTumulo(q);
      } else {
        if (typeof toast === 'function') toast('❌ Erro: módulo PDF não carregado');
        console.error('[app-pdf-tumulo] gerarPDFTumulo não encontrada em app-core.js');
      }
    }, 800);
  }
}
