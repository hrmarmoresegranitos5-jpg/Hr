/**
 * MIGRAÇÃO — Corrige registros de ponto salvos com jornada esperada errada
 * em feriados de meio período (bug em _jornadaEsperada, corrigido em
 * app-import-relatorio.js).
 *
 * O QUE FAZ:
 *   1. Lê hr_excecoes e encontra todas as datas marcadas como
 *      tipo='feriado' + meioperiodo=true.
 *   2. Para cada registro em hr_registros nessas datas, recalcula o
 *      "extra" usando a jornada esperada correta (já corrigida em
 *      HR_IMPORT._jornadaEsperada) — sem mexer em entrada/saída/almoço,
 *      que já estavam certos.
 *   3. Por padrão roda em modo DRY-RUN (só mostra o que mudaria, não
 *      grava nada). Rode de novo com aplicar=true pra gravar de verdade.
 *
 * COMO USAR:
 *   1. Publique a correção de app-import-relatorio.js (a de _jornadaEsperada)
 *      antes de rodar este script — ele depende de HR_IMPORT já corrigido.
 *   2. Abra o app no navegador, abra o Console (F12).
 *   3. Cole este script inteiro e aperte Enter → roda em modo DRY-RUN,
 *      mostra uma tabela com todos os registros que seriam alterados.
 *   4. Confira a tabela. Se estiver correta, rode:
 *         migrarFeriadoMeioPeriodo(true)
 *      pra aplicar de verdade (grava em hr_registros e cria backup).
 *
 * SEGURANÇA:
 *   - Antes de gravar, salva uma cópia do hr_registros original em
 *     hr_registros_backup_<timestamp>, pra permitir reverter manualmente
 *     se algo sair errado (basta copiar esse backup de volta pra
 *     'hr_registros' no localStorage).
 */
function migrarFeriadoMeioPeriodo(aplicar) {
  aplicar = !!aplicar;

  if (typeof HR_IMPORT === 'undefined' || typeof HR_IMPORT._jornadaEsperada !== 'function') {
    console.error('❌ HR_IMPORT não encontrado ou desatualizado. Publique a correção de app-import-relatorio.js antes de rodar esta migração.');
    return;
  }

  var excs = {};
  try { excs = JSON.parse(localStorage.getItem('hr_excecoes') || '{}'); } catch(e) {}

  var datasMeioPeriodo = {};
  Object.values(excs).forEach(function(e) {
    if (e && e.tipo === 'feriado' && e.meioperiodo && e.data) {
      datasMeioPeriodo[e.data] = true;
    }
  });

  var datasAfetadas = Object.keys(datasMeioPeriodo);
  if (datasAfetadas.length === 0) {
    console.log('ℹ️ Nenhuma exceção de feriado meio-período encontrada em hr_excecoes. Nada a migrar.');
    return;
  }
  console.log('📅 Datas de feriado meio-período encontradas:', datasAfetadas.join(', '));

  var regs = {};
  try { regs = JSON.parse(localStorage.getItem('hr_registros') || '{}'); } catch(e) {
    console.error('❌ Não foi possível ler hr_registros:', e);
    return;
  }

  var funcs = {};
  try { funcs = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch(e) {}

  var alteracoes = [];

  Object.keys(regs).forEach(function(id) {
    var r = regs[id];
    if (!r || !datasMeioPeriodo[r.data]) return;

    var trabMin = Math.round((parseFloat(r.horas) || 0) * 60);
    var jornadaNova = HR_IMPORT._jornadaEsperada(r.data, r.funcionarioId || null);
    var saldoNovo = trabMin - jornadaNova;
    var extraNovoMin = Math.max(0, saldoNovo);
    var extraNovoHoras = parseFloat((extraNovoMin / 60).toFixed(4));
    var extraAntigoHoras = parseFloat(r.extra) || 0;

    // Diferença insignificante (arredondamento) → ignora
    if (Math.abs(extraNovoHoras - extraAntigoHoras) < 0.01) return;

    var tipoExtraNovo = 'normal';
    if (typeof HR_IMPORT._classificarHE === 'function') {
      var cls = HR_IMPORT._classificarHE({
        data: r.data, extra: extraNovoMin, funcId: r.funcionarioId || null,
        entrada: r.entrada || '', saida: r.saida || ''
      });
      if (cls.extra200 > 0) {
        var CFG = HR_IMPORT.CFG || {};
        if (CFG.diasEspeciais && CFG.diasEspeciais.indexOf(r.data) >= 0) tipoExtraNovo = 'especial';
        else if (CFG.feriados && CFG.feriados.indexOf(r.data) >= 0) tipoExtraNovo = 'feriado';
        else tipoExtraNovo = 'especial';
      }
    }

    var nomeFunc = (funcs[r.funcionarioId] && funcs[r.funcionarioId].nome) || r.funcionarioId || '?';

    alteracoes.push({
      id: id,
      funcionario: nomeFunc,
      data: r.data,
      jornadaAntiga_min: 'desconhecida (não salva)',
      jornadaNova_min: jornadaNova,
      extra_antigo_h: extraAntigoHoras,
      extra_novo_h: extraNovoHoras,
      diferenca_h: parseFloat((extraNovoHoras - extraAntigoHoras).toFixed(4)),
      tipoExtra_antigo: r.tipoExtra || 'normal',
      tipoExtra_novo: tipoExtraNovo
    });
  });

  if (alteracoes.length === 0) {
    console.log('✅ Nenhum registro precisa de correção — todos já estão com o valor de extra correto para essas datas.');
    return;
  }

  console.log('🔍 ' + alteracoes.length + ' registro(s) seriam alterados:');
  console.table(alteracoes);

  var horasTotal = alteracoes.reduce(function(s, a){ return s + a.diferenca_h; }, 0);
  console.log('➕ Total de horas extras que seriam ADICIONADAS: ' + horasTotal.toFixed(2) + 'h');

  if (!aplicar) {
    console.log('%c🟡 DRY-RUN — nada foi gravado. Confira a tabela acima e rode migrarFeriadoMeioPeriodo(true) pra aplicar de verdade.', 'color:#c9a84c;font-weight:bold;');
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
    r.extra = a.extra_novo_h;
    r.tipoExtra = a.tipoExtra_novo;
    r.atualizadoEm = new Date().toISOString();
    r.observacao = (r.observacao ? r.observacao + ' · ' : '') + '[migração feriado meio-período ' + new Date().toISOString().slice(0,10) + ']';
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
migrarFeriadoMeioPeriodo(false);
