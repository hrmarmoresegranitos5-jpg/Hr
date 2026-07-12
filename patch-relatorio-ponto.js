// ══════════════════════════════════════════════════════════════
// PATCH: corrige _gerarRelatorioPonto para período decendial
// Aplicar DEPOIS de app-funcionarios.js no index.html
//
// v3 — CORREÇÃO + CONFIGURABILIDADE + TRANSPARÊNCIA
//
// Problema original: se hoje é dia 12, o sistema sempre sugeria
// o 2º decêndio (11-20), mesmo que só existissem registros
// importados do 1º decêndio (01-10) — resultando num relatório
// vazio, dando a falsa impressão de bug/dados perdidos.
//
// Solução (v2): antes de usar o decêndio da data de hoje, verifica
// se há registros de ponto (hr_registros) do funcionário dentro
// desse período. Se não houver, recua decêndio a decêndio até
// achar o mais recente que tenha dado. Se nenhum tiver, cai no
// comportamento antigo (decêndio de hoje) como último recurso.
//
// v3 — melhorias de coerência/configuração:
//   • Bloco HR_RELATORIO_PONTO_CFG no topo — datas de corte do
//     decêndio (10/20) e profundidade da busca ficam configuráveis
//     sem mexer na lógica. Segue o mesmo padrão de guard usado em
//     CFG no app-import-relatorio.js (não sobrescreve se já existir).
//   • hr_registros é lido UMA VEZ por chamada (antes era lido de
//     novo a cada decêndio testado no loop).
//   • Comparação de funcionarioId tolerante a string vs number.
//   • Toast SEMPRE informa qual período foi escolhido e por quê
//     (não só no fallback) — elimina a sensação de "sumiço de dado".
// ══════════════════════════════════════════════════════════════

(function() {
  // ── Configuração (pode ser sobrescrita externamente antes deste patch) ──
  // Ex.: window.HR_RELATORIO_PONTO_CFG = { corteDecendio1: 15, ... };
  var HR_RELATORIO_PONTO_CFG = (typeof window.HR_RELATORIO_PONTO_CFG !== 'undefined' && window.HR_RELATORIO_PONTO_CFG)
    ? window.HR_RELATORIO_PONTO_CFG
    : {};
  if (HR_RELATORIO_PONTO_CFG.corteDecendio1     === undefined) HR_RELATORIO_PONTO_CFG.corteDecendio1     = 10;  // 1º decêndio: 01 até este dia
  if (HR_RELATORIO_PONTO_CFG.corteDecendio2     === undefined) HR_RELATORIO_PONTO_CFG.corteDecendio2     = 20;  // 2º decêndio: (corte1+1) até este dia
  if (HR_RELATORIO_PONTO_CFG.maxDecendiosRecuar === undefined) HR_RELATORIO_PONTO_CFG.maxDecendiosRecuar = 6;   // ~2 meses de busca pra trás
  if (HR_RELATORIO_PONTO_CFG.avisarPeriodoEscolhido === undefined) HR_RELATORIO_PONTO_CFG.avisarPeriodoEscolhido = true;
  window.HR_RELATORIO_PONTO_CFG = HR_RELATORIO_PONTO_CFG;

  // Aguarda HR_FUNC estar disponível
  function _aplicar() {
    if (typeof HR_FUNC === 'undefined') {
      setTimeout(_aplicar, 100); return;
    }

    // ── Utilitários de data/decêndio ────────────────────────────
    function _fmt(dt) {
      return dt.getFullYear() + '-' +
        String(dt.getMonth() + 1).padStart(2, '0') + '-' +
        String(dt.getDate()).padStart(2, '0');
    }
    function _fmtBR(iso) {
      var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0];
    }

    /**
     * Retorna { di, df } (objetos Date) do decêndio que contém a data informada.
     * Usa os cortes configuráveis em HR_RELATORIO_PONTO_CFG.
     */
    function _decendioDe(dataRef) {
      var ano = dataRef.getFullYear();
      var mes = dataRef.getMonth();
      var d   = dataRef.getDate();
      var c1  = HR_RELATORIO_PONTO_CFG.corteDecendio1;
      var c2  = HR_RELATORIO_PONTO_CFG.corteDecendio2;

      if (d <= c1) {
        return { di: new Date(ano, mes, 1),      df: new Date(ano, mes, c1),      num: 1 };
      } else if (d <= c2) {
        return { di: new Date(ano, mes, c1 + 1), df: new Date(ano, mes, c2),      num: 2 };
      } else {
        return { di: new Date(ano, mes, c2 + 1), df: new Date(ano, mes + 1, 0),   num: 3 };
      }
    }

    /** Retorna o decêndio imediatamente anterior ao informado. */
    function _decendioAnterior(per) {
      var diAnterior = new Date(per.di);
      diAnterior.setDate(diAnterior.getDate() - 1); // um dia antes do início atual → cai no decêndio anterior
      return _decendioDe(diAnterior);
    }

    /** Lê hr_registros do localStorage uma única vez (evita reparse repetido no loop). */
    function _lerRegistros() {
      try { return JSON.parse(localStorage.getItem('hr_registros') || '{}'); }
      catch (e) { return {}; }
    }

    /**
     * Verifica se existe algum registro do funcionário dentro do período,
     * a partir de um objeto de registros já carregado (evita I/O repetido).
     * Comparação de funcId tolerante a string vs number.
     */
    function _temDadosNoPeriodo(regsObj, funcId, diStr, dfStr) {
      return Object.values(regsObj).some(function(r) {
        return r && r.funcionarioId != null && r.funcionarioId == funcId &&
          r.data >= diStr && r.data <= dfStr;
      });
    }

    /**
     * Procura, a partir de hoje, o decêndio mais recente com dados importados.
     * Recua até HR_RELATORIO_PONTO_CFG.maxDecendiosRecuar decêndios.
     * Retorna { di, df, num } (strings ISO + número do decêndio) ou null
     * se nenhum período recente tiver dado.
     */
    function _sugerirPeriodoComDados(funcId) {
      var regsObj = _lerRegistros();
      var per = _decendioDe(new Date());
      for (var i = 0; i < HR_RELATORIO_PONTO_CFG.maxDecendiosRecuar; i++) {
        var diStr = _fmt(per.di), dfStr = _fmt(per.df);
        if (_temDadosNoPeriodo(regsObj, funcId, diStr, dfStr)) {
          return { di: diStr, df: dfStr, num: per.num };
        }
        per = _decendioAnterior(per);
      }
      return null;
    }

    HR_FUNC._gerarRelatorioPonto = function() {
      var selFunc = document.getElementById('pag_func');
      var funcId  = selFunc ? selFunc.value : null;
      if (!funcId) {
        if (typeof toast === 'function') toast('⚠ Selecione um funcionário primeiro.');
        return;
      }

      // 1) Tenta achar o decêndio mais recente que realmente tem dado importado
      var achado = _sugerirPeriodoComDados(funcId);

      var diStr, dfStr, numDecendio, usouFallback;
      if (achado) {
        diStr = achado.di; dfStr = achado.df; numDecendio = achado.num; usouFallback = false;
      } else {
        // 2) Fallback: nenhum decêndio recente tem dado — usa o decêndio de hoje
        //    (comportamento antigo), só pra garantir que a função nunca trave.
        var perHoje = _decendioDe(new Date());
        diStr = _fmt(perHoje.di); dfStr = _fmt(perHoje.df);
        numDecendio = perHoje.num; usouFallback = true;
      }

      // Transparência: sempre avisa qual período está sendo mostrado e por quê
      if (HR_RELATORIO_PONTO_CFG.avisarPeriodoEscolhido && typeof toast === 'function') {
        var ordinal = ['1º', '2º', '3º'][numDecendio - 1] || (numDecendio + 'º');
        if (usouFallback) {
          toast('ℹ Nenhum período recente com dados encontrado — mostrando ' + ordinal + ' decêndio atual (' + _fmtBR(diStr) + ' a ' + _fmtBR(dfStr) + ').');
        } else {
          toast('📄 Mostrando ' + ordinal + ' decêndio (' + _fmtBR(diStr) + ' a ' + _fmtBR(dfStr) + ') — período mais recente com dados importados.');
        }
      }

      if (typeof HR_RELATORIO_PONTO === 'undefined' || !HR_RELATORIO_PONTO.gerarPDF) {
        if (typeof toast === 'function') toast('⚠ Módulo de relatório não carregado (app-relatorio-ponto.js).');
        return;
      }

      HR_RELATORIO_PONTO.gerarPDF(funcId, diStr, dfStr);
    };

    console.log('[PATCH v3] _gerarRelatorioPonto: decêndio configurável, transparente e com fallback seguro.');
  }

  _aplicar();
})();
