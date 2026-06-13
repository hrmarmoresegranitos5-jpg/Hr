// ══════════════════════════════════════════════════════════════
// PATCH: corrige _gerarRelatorioPonto para período decendial
// Aplicar DEPOIS de app-funcionarios.js no index.html
// ══════════════════════════════════════════════════════════════

(function() {
  // Aguarda HR_FUNC estar disponível
  function _aplicar() {
    if (typeof HR_FUNC === 'undefined') {
      setTimeout(_aplicar, 100); return;
    }

    HR_FUNC._gerarRelatorioPonto = function() {
      var selFunc = document.getElementById('pag_func');
      var funcId  = selFunc ? selFunc.value : null;
      if (!funcId) {
        if (typeof toast === 'function') toast('⚠ Selecione um funcionário primeiro.');
        return;
      }

      // Calcula o decêndio atual (1-10, 11-20, 21-fim do mês)
      var hoje = new Date();
      var d    = hoje.getDate();
      var ano  = hoje.getFullYear();
      var mes  = hoje.getMonth(); // 0-based

      var di, df;
      if (d <= 10) {
        // 1º decêndio: 01 ao 10
        di = new Date(ano, mes, 1);
        df = new Date(ano, mes, 10);
      } else if (d <= 20) {
        // 2º decêndio: 11 ao 20
        di = new Date(ano, mes, 11);
        df = new Date(ano, mes, 20);
      } else {
        // 3º decêndio: 21 ao último dia do mês
        di = new Date(ano, mes, 21);
        df = new Date(ano, mes + 1, 0); // último dia do mês
      }

      var fmt = function(dt) {
        return dt.getFullYear() + '-' +
          String(dt.getMonth() + 1).padStart(2, '0') + '-' +
          String(dt.getDate()).padStart(2, '0');
      };

      var diStr = fmt(di);
      var dfStr = fmt(df);

      if (typeof HR_RELATORIO_PONTO === 'undefined' || !HR_RELATORIO_PONTO.gerarPDF) {
        if (typeof toast === 'function') toast('⚠ Módulo de relatório não carregado (app-relatorio-ponto.js).');
        return;
      }

      HR_RELATORIO_PONTO.gerarPDF(funcId, diStr, dfStr);
    };

    console.log('[PATCH] _gerarRelatorioPonto corrigido para período decendial.');
  }

  _aplicar();
})();
