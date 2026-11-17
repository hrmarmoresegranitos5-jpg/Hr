// ══════════════════════════════════════════════════════════════
// PATCH: corrige jornadaDiariaMin incorreto do Fabrício e recalcula
// a hora extra já salva nos registros dele no período afetado.
//
// BUG: em app-funcionarios.js (~linha 2065) e em
// app-import-relatorio.js (_jornadaEsperada), quando o funcionário
// tem `jornadaDiariaMin` cadastrado (>0), esse valor substitui o
// padrão de 8h/dia útil — mesmo quando o valor cadastrado é MAIOR
// que 8h. O cadastro do Fabrício ficou com um valor alto demais,
// zerando a hora extra dele em todos os dias.
//
// O QUE ESTE PATCH FAZ (uma única vez, sozinho, ao abrir o app):
//   1. Localiza "fabricio" em hr_funcionarios.
//   2. Se jornadaDiariaMin > 480 (maior que o padrão de 8h),
//      zera o campo (volta ao padrão 8h dia útil / 4h sábado).
//   3. Recalcula o campo `extra` dos registros dele em hr_registros
//      usando a jornada padrão, sem tocar em entrada/saída/almoço.
//   4. Salva backup antes de gravar.
//   5. Marca como concluído (localStorage) pra não rodar de novo.
//
// Roda automaticamente ao carregar a página — não precisa abrir
// console nem digitar nada. Pode ser removido do index.html (e o
// arquivo apagado) depois de confirmar que rodou em produção.
// ══════════════════════════════════════════════════════════════
(function () {
  var FLAG = 'hr_patch_jornada_fabricio_done';
  try {
    if (localStorage.getItem(FLAG)) return; // já rodou neste navegador
  } catch (e) { return; }

  try {
    var funcs = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}');
    var funcId = Object.keys(funcs).find(function (id) {
      var nome = (funcs[id] && funcs[id].nome || '').toLowerCase();
      return nome.indexOf('fabric') >= 0;
    });

    if (!funcId) {
      console.log('[PATCH jornada-fabricio] Funcionário "fabricio" não encontrado — nada a fazer.');
      localStorage.setItem(FLAG, new Date().toISOString());
      return;
    }

    var func = funcs[funcId];
    var jornadaAtual = parseInt(func.jornadaDiariaMin) || 0;

    if (jornadaAtual <= 480) {
      console.log('[PATCH jornada-fabricio] jornadaDiariaMin do ' + func.nome + ' já é <= 8h (' + jornadaAtual + 'min) — nada a corrigir.');
      localStorage.setItem(FLAG, new Date().toISOString());
      return;
    }

    // ── Backup antes de qualquer gravação ──────────────────────────────
    var ts = Date.now();
    localStorage.setItem('hr_funcionarios_backup_' + ts, JSON.stringify(funcs));
    var regsRaw = localStorage.getItem('hr_registros') || '{}';
    localStorage.setItem('hr_registros_backup_' + ts, regsRaw);

    // ── Corrige o cadastro ──────────────────────────────────────────────
    funcs[funcId].jornadaDiariaMin = 0;
    localStorage.setItem('hr_funcionarios', JSON.stringify(funcs));
    console.log('[PATCH jornada-fabricio] jornadaDiariaMin do ' + func.nome + ' era ' + jornadaAtual + 'min — corrigido para 0 (padrão 8h/4h).');

    // ── Recalcula os registros já salvos dele ───────────────────────────
    var regs = JSON.parse(regsRaw);
    var corrigidos = 0;
    Object.keys(regs).forEach(function (id) {
      var r = regs[id];
      if (!r || r.funcionarioId !== funcId) return;

      var dow = new Date(r.data + 'T12:00:00').getDay();
      if (dow === 0) return; // domingo, folga

      var trabMin = Math.round((parseFloat(r.horas) || 0) * 60);
      var jornadaPadrao = (dow === 6) ? 240 : 480;
      var extraNovoHoras = parseFloat((Math.max(0, trabMin - jornadaPadrao) / 60).toFixed(2));

      if (Math.abs(extraNovoHoras - (parseFloat(r.extra) || 0)) < 0.01) return;

      r.extra = extraNovoHoras;
      r.atualizadoEm = new Date().toISOString();
      r.observacao = (r.observacao ? r.observacao + ' · ' : '') + '[patch jornada-fabricio ' + new Date().toISOString().slice(0, 10) + ']';
      corrigidos++;
    });
    localStorage.setItem('hr_registros', JSON.stringify(regs));

    console.log('[PATCH jornada-fabricio] ' + corrigidos + ' registro(s) do ' + func.nome + ' recalculado(s).');
    console.log('[PATCH jornada-fabricio] Backup salvo em hr_funcionarios_backup_' + ts + ' e hr_registros_backup_' + ts + '.');

    localStorage.setItem(FLAG, new Date().toISOString());
  } catch (e) {
    console.error('[PATCH jornada-fabricio] Falhou, não marcado como concluído — vai tentar de novo no próximo carregamento:', e);
  }
})();
