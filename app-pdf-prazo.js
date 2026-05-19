// ══════════════════════════════════════════════════════════════
// PRAZO NO PDF — Intercepta gerarPDF para perguntar os dias
// antes de gerar, calcula a estimativa com base na agenda e
// injeta os dados no template via window._pdfPrazoData.
// ══════════════════════════════════════════════════════════════

(function () {
  // Aguarda o DOM estar pronto para sobrescrever gerarPDF
  var _originalGerarPDF = null;

  function _instalar() {
    _originalGerarPDF = window.gerarPDF;
    window.gerarPDF = function () {
      if (!pendQ) { toast('Calcule um orçamento primeiro'); return; }

      // Se o prazo já foi confirmado, vai direto (chamada interna)
      if (window._pdfPrazoData) {
        _originalGerarPDF();
        return;
      }

      // Preenche info da agenda no modal
      var last = lastEnd();
      var hoje = td();
      var isUrg = (window._urgPct || 0) > 0;
      var infoEl = document.getElementById('pdfPrazoInfo');
      if (infoEl) {
        if (isUrg) {
          infoEl.innerHTML = '🚨 <strong style="color:#ff9060;">Serviço urgente</strong> — entra na frente da fila.<br>Estimativa conta a partir de <strong>hoje</strong>.';
        } else if (last && last > hoje) {
          infoEl.innerHTML = '📋 Agenda ocupada até <strong>' + fd(last) + '</strong>.<br>A estimativa começa a partir dessa data.';
        } else {
          infoEl.innerHTML = '📋 Agenda livre — a estimativa começa a partir de hoje.';
        }
      }

      document.getElementById('pdfPrazoDias').value = '';
      showMd('pdfPrazoMd');
    };
  }

  // Confirmar prazo no modal
  window.pdfConfirmPrazo = function () {
    var dias = parseInt(document.getElementById('pdfPrazoDias').value, 10);
    if (!dias || dias < 1) { toast('Informe os dias de produção'); return; }

    var hoje = td();
    var last = lastEnd();
    var isUrgent = (window._urgPct || 0) > 0;
    // Urgente: projeto fura a fila — base é HOJE, não o fim da fila
    var base = isUrgent ? hoje : ((last && last > hoje) ? last : hoje);
    var dataEst = addD(base, dias);

    var emProd = (DB.j || []).filter(function (j) { return !j.done; }).length;

    window._pdfPrazoData = {
      dias: dias, base: base, dataEst: dataEst,
      lastEnd: last, emProd: emProd, hoje: hoje, isUrgent: isUrgent
    };

    closeAll();
    setTimeout(function () { _originalGerarPDF(); }, 150);
  };

  // Limpa após uso (chamado dentro do template)
  window._pdfClearPrazo = function () {
    delete window._pdfPrazoData;
  };

  // Instala depois que app-core.js já definiu gerarPDF
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _instalar);
  } else {
    _instalar();
  }
})();
