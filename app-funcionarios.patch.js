// ══════════════════════════════════════════════════════════════════════════
// PATCH — app-funcionarios.js
// Correções aplicadas:
//
//   BUG 1 — Divisor de valor/hora usa jornada real (via HR_IMPORT)
//   BUG 2 — calcSaldoFuncionario usa motor HE unificado do HR_IMPORT
//            em vez do multiplicador único fixo (×1.5 para tudo)
//
// PRÉ-REQUISITO:
//   Aplicar primeiro o patch do app-import-relatorio.js que expõe:
//     HR_IMPORT.calcSaldoHE(registros, func, mesISO)
//     HR_IMPORT.calcValorHoraReal(func, mesISO)
//
// COMO APLICAR:
//   Substitua a função calcSaldoFuncionario() inteira no app-funcionarios.js
//   pelo bloco abaixo. A assinatura é idêntica — nenhum chamador externo
//   precisa ser alterado.
// ══════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════
// PATCH E — Substituição completa de calcSaldoFuncionario()
// Arquivo: app-funcionarios.js
// Localizar: function calcSaldoFuncionario(funcId, di, df){ ... }
// Substituir a função inteira pelo bloco abaixo.
// ══════════════════════════════════════════════════════════════════════════

/*
  function calcSaldoFuncionario(funcId, di, df){
    var funcs  = getFuncionarios();
    var regs   = getRegistros();
    var pags   = getPagamentos();
    var f      = funcs[funcId] || {};
    var salario = parseFloat(f.salario) || 0;

    // ── Filtra registros do funcionário no período ──────────────────────
    var meusRegs = Object.values(regs).filter(function(r){
      if (r.funcionarioId !== funcId) return false;
      if (di && r.data < di) return false;
      if (df && r.data > df) return false;
      return true;
    });

    var totalHoras = meusRegs.reduce(function(s, r){ return s + (parseFloat(r.horas) || 0); }, 0);
    var dias       = meusRegs.length;

    // ── Cálculo de salário proporcional (inalterado) ────────────────────
    var totalSalario = 0;
    if (di && df) {
      var duPeriodo = _diasUteisNoIntervalo(di, df);
      totalSalario  = (salario / duPeriodo) * dias;
    } else {
      var porMes = {};
      meusRegs.forEach(function(r){
        var m = r.data.slice(0, 7);
        if (!porMes[m]) porMes[m] = 0;
        porMes[m]++;
      });
      Object.keys(porMes).forEach(function(m){
        var duMes   = _diasUteisMes(m);
        totalSalario += (salario / duMes) * porMes[m];
      });
    }

    // ── Motor financeiro de HE — delegado ao HR_IMPORT (Bug 1 + Bug 2) ──
    // Mês de referência: primeiro mês do período filtrado ou mês atual.
    var refMes = (di ? di : (meusRegs.length > 0
      ? meusRegs.slice().sort(function(a,b){ return a.data.localeCompare(b.data); })[0].data
      : new Date().toISOString())).slice(0, 7);

    var heResult;
    if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcSaldoHE === 'function') {
      // Caminho principal: usa motor unificado do HR_IMPORT
      heResult = HR_IMPORT.calcSaldoHE(meusRegs, f, refMes);
    } else {
      // Fallback seguro se HR_IMPORT não estiver disponível:
      // mantém comportamento anterior (multiplicador único, divisor 220h)
      // para não quebrar em ambientes sem o módulo de importação carregado.
      var mult          = _getMultNormal();
      var valorHoraBase = salario / 220;
      var totalExtraFb  = meusRegs.reduce(function(s, r){
        return s + (r.destinoExtra === 'banco' ? 0 : (parseFloat(r.extra) || 0));
      }, 0);
      heResult = {
        valorHoraBase:    valorHoraBase,
        valorTotalExtras: totalExtraFb * (valorHoraBase * mult),
        totalExtra50Min:  0, totalExtra100Min: 0, totalExtra200Min: 0,
        valorExtra50: 0, valorExtra100: 0, valorExtra200: 0,
        totalExtraHoras: totalExtraFb
      };
    }

    var valorExtra  = heResult.valorTotalExtras;
    var totalDevido = totalSalario + valorExtra;

    // ── Pagamentos realizados ────────────────────────────────────────────
    var meusPags = Object.values(pags).filter(function(p){
      if (p.funcionarioId !== funcId) return false;
      if (di && p.data < di) return false;
      if (df && p.data > df) return false;
      return true;
    });
    var totalPago = meusPags.reduce(function(s, p){ return s + (parseFloat(p.valor) || 0); }, 0);
    var saldo     = totalDevido - totalPago;

    // ── Retrocompatibilidade: mantém os campos que o restante da UI usa ──
    // valorHoraExtra agora reflete a faixa HE50 (caso mais comum),
    // mas o valor real está distribuído em valorExtra50/100/200.
    var valorHoraExtra = heResult.valorHoraBase * _getMultNormal();

    return {
      // campos clássicos (mantidos para compatibilidade com UI existente)
      totalHoras:       totalHoras,
      totalExtra:       heResult.totalExtraHoras,
      valorExtra:       valorExtra,
      totalSalario:     totalSalario,
      totalDevido:      totalDevido,
      totalPago:        totalPago,
      saldo:            saldo,
      temCredito:       saldo < -0.01,
      diasTrabalhados:  dias,
      valorHoraBase:    heResult.valorHoraBase,
      valorHoraExtra:   valorHoraExtra,
      // campos novos — breakdown por faixa (disponíveis para UI futura)
      valorExtra50:     heResult.valorExtra50,
      valorExtra100:    heResult.valorExtra100,
      valorExtra200:    heResult.valorExtra200,
      totalExtra50Min:  heResult.totalExtra50Min,
      totalExtra100Min: heResult.totalExtra100Min,
      totalExtra200Min: heResult.totalExtra200Min
    };
  }
*/


// ══════════════════════════════════════════════════════════════════════════
// PATCH F — Atualização do painel financeiro em abrirDetalhesFuncionario()
// Arquivo: app-funcionarios.js
// Localizar: o bloco HTML do card '💰 Financeiro' dentro de abrirDetalhesFuncionario()
//
// O bloco atual mostra só "H. Extras R$" como total único.
// Com o patch, os campos valorExtra50/100/200 estão disponíveis em `saldo`.
// Substitua as 3 linhas de _miniKpi por esta versão expandida que mostra
// o breakdown quando há HE em faixas distintas.
// ══════════════════════════════════════════════════════════════════════════

// ── PATCH F — substituição do bloco de KPIs financeiros ──────────────────

/*
  // ANTES (3 _miniKpi simples):
  //   _miniKpi('Salário base', _fmtMoeda(f.salario), GOLD)+
  //   _miniKpi('H. Extras R$', _fmtMoeda(saldo.valorExtra), GOLD)+
  //   _miniKpi('Já pago',      _fmtMoeda(saldo.totalPago), GREEN)+
  //
  // DEPOIS:
        _miniKpi('Salário base', _fmtMoeda(f.salario), GOLD)+
        _miniKpi('H. Extras R$', _fmtMoeda(saldo.valorExtra),
          saldo.valorExtra > 0 ? GOLD : T3)+
        _miniKpi('Já pago', _fmtMoeda(saldo.totalPago), GREEN)+
      '</div>'+
      // Breakdown HE por faixa (exibe somente quando há extras em >1 faixa)
      ((saldo.valorExtra100 > 0 || saldo.valorExtra200 > 0) ?
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">'+
          (saldo.valorExtra50  > 0 ? _miniKpi('HE 50%',  _fmtMoeda(saldo.valorExtra50),  GOLD)  : '')+
          (saldo.valorExtra100 > 0 ? _miniKpi('HE 100%', _fmtMoeda(saldo.valorExtra100), '#8ec8c8') : '')+
          (saldo.valorExtra200 > 0 ? _miniKpi('HE 200%', _fmtMoeda(saldo.valorExtra200), '#c88e5c') : '')+
        '</div>'+
      '' : '')+
      '<div style="display:none;"><!-- placeholder para fechar o grid anterior -->
*/

// Nota: o PATCH F é opcional mas recomendado para consistência visual.
// O painel já mostrará os valores corretos sem ele — a diferença é que
// sem o patch o usuário não vê o breakdown por faixa no perfil.


// ══════════════════════════════════════════════════════════════════════════
// TAMBÉM REMOVA (ou comente) esta linha em calcSaldoFuncionario():
//
//   var mult = _getMultNormal();         ← linha 175 no original
//   var valorHoraBase = salario / 220;   ← linha 177
//   var valorHoraExtra = valorHoraBase * mult;  ← linha 178
//
// Elas são substituídas pelo heResult retornado por HR_IMPORT.calcSaldoHE().
// A função _getMultNormal() pode ser MANTIDA — ainda é usada no fallback
// e para exibir o valorHoraExtra de referência no return.
// ══════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════════
// RESUMO FINAL DE APLICAÇÃO
//
// Ordem de aplicação:
//   1. app-import-relatorio.patch.js (Patches A, B, C, D)
//   2. app-funcionarios.patch.js     (Patches E, F)
//
// O que NÃO muda:
//   • Assinatura de calcSaldoFuncionario(funcId, di, df) — idêntica
//   • Campos clássicos do return — todos mantidos (compatibilidade total)
//   • _diasUteisNoIntervalo, _diasUteisMes — inalterados
//   • _getMultNormal — mantido (fallback + valorHoraExtra de referência)
//   • Toda a UI de formulários, pagamentos, histórico — zero alterações
//
// O que muda:
//   • Bug 1: valorHoraBase deriva da jornada real, não de 220h fixo
//   • Bug 2: extras em dom/feriado/especial pagam ×2.0 e ×3.0, não ×1.5
//   • Bug 3: tipoExtra gravado corretamente em cada importação nova
//   • Novos campos no return de calcSaldoFuncionario:
//       valorExtra50, valorExtra100, valorExtra200
//       totalExtra50Min, totalExtra100Min, totalExtra200Min
//     (usados pelo PATCH F para breakdown visual no perfil)
//
// Registros já importados (antes do patch):
//   • tipoExtra = 'normal' → calcSaldoHE recalcula pela data automaticamente
//   • Sem perda de dados históricos
// ══════════════════════════════════════════════════════════════════════════
