/**
 * MIGRAÇÃO — Corrige a tag `tipoExtra` de registros de ponto salvos antes da
 * correção do bug de HE tudo-ou-nada (app-import-relatorio.js / app-relatorio-ponto.js).
 *
 * O BUG QUE ISSO CORRIGE:
 *   Antes, se um funcionário chegasse alguns minutos antes das 7h (ou saísse
 *   depois das 18h), o dia INTEIRO de hora extra era gravado com
 *   tipoExtra='especial' (triplicada ×3) — mesmo que só alguns minutos
 *   tivessem realmente passado do limite. Isso superpagava bastante.
 *   A classificação ao vivo (_classificarHE) já foi corrigida pra dividir
 *   proporcionalmente (só o excedente é ×3, o resto continua ×2), mas
 *   registros JÁ SALVOS ficaram com a tag antiga 'especial' gravada — e
 *   essa tag é usada como atalho tudo-ou-nada em alguns lugares (ex:
 *   calcSaldoHE, o total de "HE triplicada" em app-funcionarios.js, e o PDF
 *   de horas extras), então continuam superpagando até serem re-tageados.
 *
 * O QUE FAZ:
 *   1. Percorre todo hr_registros.
 *   2. Reclassifica cada um com o HR_IMPORT._classificarHE já corrigido,
 *      usando entrada/saída salvos (sem mexer nas horas trabalhadas/extra
 *      em si — só a TAG tipoExtra).
 *   3. Se o dia é misto (parte ×2 + parte ×3) e estava gravado como
 *      'especial'/'feriado', rebaixa pra 'normal' — quem reclassifica esse
 *      caso corretamente por minuto depois é o próprio motor ao vivo
 *      (calcSaldoHE / calcExtraPeriodo), então só precisa parar de mentir
 *      que o dia inteiro é triplicada.
 *   4. Por padrão roda em modo DRY-RUN (só mostra o que mudaria). Rode de
 *      novo com aplicar=true pra gravar de verdade.
 *
 * COMO USAR:
 *   1. Publique as correções de app-import-relatorio.js e
 *      app-relatorio-ponto.js (a da HE proporcional) antes de rodar isto.
 *   2. Abra o app no navegador, abra o Console (F12).
 *   3. Cole este script inteiro e aperte Enter → roda em modo DRY-RUN,
 *      mostra uma tabela com todos os registros que seriam alterados.
 *   4. Confira a tabela. Se estiver correta, rode:
 *         migrarTipoExtraMisto(true)
 *      pra aplicar de verdade (grava em hr_registros e cria backup).
 *
 * SEGURANÇA:
 *   - Não muda `extra` (horas), `entrada`, `saida` nem valores financeiros
 *     diretamente — só a tag tipoExtra, que é reclassificada ao vivo mesmo
 *     em outros lugares. O efeito prático é o pagamento recalculado ficar
 *     menor nos dias mistos (a parte ×2 deixa de ser cobrada como ×3).
 *   - Antes de gravar, salva uma cópia do hr_registros original em
 *     hr_registros_backup_<timestamp>, pra permitir reverter manualmente
 *     se algo sair errado (basta copiar esse backup de volta pra
 *     'hr_registros' no localStorage).
 */
function migrarTipoExtraMisto(aplicar) {
  aplicar = !!aplicar;

  if (typeof HR_IMPORT === 'undefined' || typeof HR_IMPORT._classificarHE !== 'function') {
    console.error('❌ HR_IMPORT não encontrado ou desatualizado. Publique a correção de app-import-relatorio.js (HE proporcional) antes de rodar esta migração.');
    return;
  }

  var regs = {};
  try { regs = JSON.parse(localStorage.getItem('hr_registros') || '{}'); } catch(e) {
    console.error('❌ Não foi possível ler hr_registros:', e);
    return;
  }

  var funcs = {};
  try { funcs = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch(e) {}

  var CFG = HR_IMPORT.CFG || {};
  var alteracoes = [];

  Object.keys(regs).forEach(function(id) {
    var r = regs[id];
    if (!r) return;

    var tipoAntigo = r.tipoExtra || 'normal';
    // Só nos interessa quem estava marcado como "tudo ×3" — 'normal' já é
    // reclassificado ao vivo em todo lugar, não precisa mexer.
    if (tipoAntigo !== 'especial' && tipoAntigo !== 'feriado') return;

    var extraMin = Math.round((parseFloat(r.extra) || 0) * 60);
    if (extraMin <= 0) return;

    var cls = HR_IMPORT._classificarHE({
      data: r.data, extra: extraMin, funcId: r.funcionarioId || null,
      entrada: r.entrada || '', saida: r.saida || ''
    });

    // Só é DE VERDADE 'especial'/'feriado' (tudo ×3) quando não sobra nada
    // de ×2. Se sobrar (dia misto), a tag antiga estava inflando o dia
    // inteiro pra ×3 — rebaixa pra 'normal'.
    var deveriaSerMisto = cls.extra50 > 0 && cls.extra200 > 0;
    if (!deveriaSerMisto) return;

    var nomeFunc = (funcs[r.funcionarioId] && funcs[r.funcionarioId].nome) || r.funcionarioId || '?';

    alteracoes.push({
      id: id,
      funcionario: nomeFunc,
      data: r.data,
      entrada: r.entrada || '—',
      saida: r.saida || '—',
      extra_total_min: extraMin,
      dobrada_min_correto: cls.extra50,
      triplicada_min_correto: cls.extra200,
      tipoExtra_antigo: tipoAntigo,
      tipoExtra_novo: 'normal'
    });
  });

  if (alteracoes.length === 0) {
    console.log('✅ Nenhum registro precisa de correção — nenhum dia misto encontrado com a tag antiga tudo-ou-nada.');
    return;
  }

  console.log('🔍 ' + alteracoes.length + ' registro(s) seriam re-tageados (deixam de contar o dia inteiro como triplicada):');
  console.table(alteracoes);

  var minTotalRebaixado = alteracoes.reduce(function(s, a){ return s + a.dobrada_min_correto; }, 0);
  console.log('➖ Total de minutos que deixam de ser cobrados como ×3 e passam a ×2: ' + minTotalRebaixado + 'min (~' + (minTotalRebaixado/60).toFixed(2) + 'h)');

  if (!aplicar) {
    console.log('%c🟡 DRY-RUN — nada foi gravado. Confira a tabela acima e rode migrarTipoExtraMisto(true) pra aplicar de verdade.', 'color:#c9a84c;font-weight:bold;');
    return alteracoes;
  }

  // ── Aplica de verdade ────────────────────────────────────────────────
  var backupKey = 'hr_registros_backup_' + Date.now();
  try {
    localStorage.setItem(backupKey, localStorage.getItem('hr_registros'));
    console.log('💾 Backup salvo em localStorage[\'' + backupKey + '\'] — copie esse valor de volta pra \'hr_registros\' se precisar reverter.');
  } catch(e) {
    console.error('❌ Não foi possível criar backup, abortando aplicação por segurança:', e);
    return;
  }

  alteracoes.forEach(function(a) {
    var r = regs[a.id];
    if (!r) return;
    r.tipoExtra = a.tipoExtra_novo;
    r.atualizadoEm = new Date().toISOString();
    r.observacao = (r.observacao ? r.observacao + ' · ' : '') + '[migração HE proporcional (dia misto) ' + new Date().toISOString().slice(0,10) + ']';
  });

  try {
    localStorage.setItem('hr_registros', JSON.stringify(regs));
    console.log('%c✅ ' + alteracoes.length + ' registro(s) corrigido(s) e gravado(s) em hr_registros.', 'color:#5fbf5f;font-weight:bold;');
    console.log('🔄 Recarregue a página / re-renderize o painel do funcionário e a tela de pagamento pra ver os novos valores.');
  } catch(e) {
    console.error('❌ Erro ao gravar hr_registros:', e);
  }

  return alteracoes;
}

// Roda automaticamente em modo DRY-RUN ao colar o script
migrarTipoExtraMisto(false);
