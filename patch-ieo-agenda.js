// ═══════════════════════════════════════════════════════════════════
// PATCH IEO — Simulação preventiva em confirmarAgenda()
//
// SUBSTITUI a função confirmarAgenda() existente em app-core.js.
//
// Localizar o trecho atual:
//   function confirmarAgenda(){...}
// e substituir pelo código abaixo inteiro.
//
// O que muda:
//   1. Estima o IEO do job que vai ser criado via estimaIEO()
//   2. Chama calcSemana() simulando a semana já com o job incluído
//   3. Se a carga resultante for 'pesada' ou 'critica' em qualquer
//      dimensão (total / oficina / campo), mostra um aviso via showCB
//      e deixa o usuário decidir (Continuar vs Cancelar)
//   4. Se carga for 'leve' ou 'normal': salva diretamente (sem interrupção)
//   5. Nenhum job já salvo é alterado. Zero migração.
// ═══════════════════════════════════════════════════════════════════

function confirmarAgenda() {
  var d = +document.getElementById('diasIn').value;
  if (!d || !pendQ) { toast('Informe os dias'); return; }

  var s   = lastEnd() || td();
  var end = addD(s, d);
  var q   = pendQ;

  // ── Monta o job (ainda não salvo) ───────────────────────────────
  var novoJob = {
    id    : Date.now(),
    cli   : q.cli,
    desc  : q.tipo + ' — ' + q.mat,
    start : s,
    end   : end,
    value : q.vista,
    pago  : 0,
    obs   : '',
    done  : false,
    qId   : q.id,
    m2    : q.m2    || 0,
    matPr : q.matPr || 0,
    custoPedraEpoca : q.matCusto || q.custo || 0,
    cat   : q.tipo  || 'Outro'
  };

  // ── Estima IEO e simula a semana COM o job ───────────────────────
  var ieoEstimado = estimaIEO(novoJob);
  novoJob.ieo    = ieoEstimado.ieo;
  novoJob.ieo_of = ieoEstimado.ieo_of;
  novoJob.ieo_ca = ieoEstimado.ieo_ca;
  novoJob.ieo_ge = ieoEstimado.ieo_ge;

  var semanaInicio = _inicioSemana(s);

  // Simula: adiciona o job temporariamente ao DB para calcSemana ler
  DB.j.unshift(novoJob);
  var simul = calcSemana(semanaInicio);
  DB.j.shift(); // remove o job temporário — sem efeito colateral

  // ── Avalia se há alerta ──────────────────────────────────────────
  var alertas = [];

  function _label(faixa) {
    if (faixa === 'pesada')  return '⚠️ Pesada';
    if (faixa === 'critica') return '🔴 Crítica';
    return null;
  }

  var lTotal = _label(simul.faixa);
  var lOf    = _label(simul.faixa_of);
  var lCa    = _label(simul.faixa_ca);

  if (lTotal) alertas.push('Produção geral: ' + lTotal
    + ' (' + Math.round(simul.pct_total * 100) + '% da capacidade)');
  if (lOf && simul.ieo_of > 0) alertas.push('Oficina: ' + lOf
    + ' (' + Math.round(simul.pct_oficina * 100) + '% da capacidade)');
  if (lCa && simul.ieo_ca > 0) alertas.push('Campo: ' + lCa
    + ' (' + Math.round(simul.pct_campo * 100) + '% da capacidade)');

  // ── Função que efetiva o salvamento ─────────────────────────────
  function _salvar() {
    DB.j.unshift(novoJob);
    DB.sv();
    closeAll();
    updUrgDot();
    toast('✓ ' + q.cli + ' agendado para ' + fd(end));
    setTimeout(function () {
      showCB(
        q.cli + ' já pagou os 50% de entrada (R$ ' + fm(q.ent) + ')?',
        function () {
          addTr('in', 'Entrada 50% — ' + q.cli, q.ent);
          var j = DB.j.find(function (x) { return x.id === novoJob.id; });
          if (j) { j.pago = q.ent; DB.sv(); }
          hideCB();
          toast('✓ Entrada registrada!');
        },
        function () { hideCB(); }
      );
    }, 600);
  }

  // ── Se há alerta: pede confirmação; senão salva direto ───────────
  if (alertas.length > 0) {
    var msg = 'Atenção: ao incluir ' + q.cli
      + ', a semana de ' + fd(s) + ' ficará:\n\n'
      + alertas.join('\n')
      + '\n\nDeseja continuar assim mesmo?';

    showCB(msg, function () {
      hideCB();
      _salvar();
    }, function () {
      hideCB();
      toast('Agendamento cancelado.');
    });

  } else {
    _salvar();
  }
}
