// ═══════════════════════════════════════════════════════════════════
//  HR MÁRMORES — RELATÓRIO DE HORAS EXTRAS  v5.0
//  Arquivo: app-horas-extras-pdf.js
//
//  LÓGICA DE MULTIPLICADORES (prioridade em cascata):
//  1. Período de Bonificação por funcionário (maior prioridade)
//  2. Período de Bonificação geral (todos os funcionários)
//  3. Tipo do dia automático: sábado/domingo/feriado = 2×, resto = 2×
//     (configurável em CFG.he)
//  • Períodos de bonificação salvos em hr_he_bonificacoes
//  • SEM INSS, SEM FGTS, SEM DSR
//  • PDF detalhado com coluna "Motivo" mostrando origem do multiplicador
// ═══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Tokens de cor ────────────────────────────────────────────────
  var GOLD   = '#C9A84C';
  var GOLD2  = 'rgba(201,168,76,.15)';
  var GOLDB  = 'rgba(201,168,76,.35)';
  var S2     = 'var(--s2,#161410)';
  var BD     = 'rgba(201,168,76,.12)';
  var T1     = 'var(--t1,#f0ece4)';
  var T2     = 'var(--t2,#b8b0a0)';
  var T3     = 'var(--t3,#7a7268)';
  var GREEN  = '#5cb85c';
  var RED    = '#c85c5c';
  var ORANGE = '#e0954a';
  var BLUE   = '#8ec8f0';

  // ── Formatação ───────────────────────────────────────────────────
  function _fmtMoeda(v) {
    return 'R$\u00a0' + parseFloat(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function _fmtData(iso) {
    if (!iso) return '—';
    var p = iso.split('-'); return p[2] + '/' + p[1] + '/' + p[0];
  }
  function _fmtHoje() { return _fmtData(new Date().toISOString().slice(0, 10)); }
  function _mesAtual() {
    var d = new Date(), m = d.getMonth() + 1;
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m;
  }
  function _nomeMes(anoMes) {
    if (!anoMes) return '';
    var meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    var p = anoMes.split('-');
    return meses[(parseInt(p[1]) || 1) - 1] + ' ' + p[0];
  }
  function _esc(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
  function _closeOverlay(id) { var e = document.getElementById(id); if (e) e.remove(); }
  function _toast(m) { if (typeof toast === 'function') toast(m); else console.log('[HE]', m); }
  function _overlay(id, html) {
    _closeOverlay(id);
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,6,2,.97);' +
      'display:flex;flex-direction:column;align-items:center;overflow-y:auto;' +
      'font-family:Outfit,sans-serif;padding:24px 0 100px;';
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  }

  // ── Storage ──────────────────────────────────────────────────────
  function _getFuncs()      { try { return JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch (e) { return {}; } }
  function _getRegs()       { try { return JSON.parse(localStorage.getItem('hr_registros') || '{}'); } catch (e) { return {}; } }
  function _getAprova()     { try { return JSON.parse(localStorage.getItem('hr_he_aprovacoes') || '{}'); } catch (e) { return {}; } }
  function _saveAprova(d)   { try { localStorage.setItem('hr_he_aprovacoes', JSON.stringify(d)); } catch (e) {} }
  function _getPagoHE()     { try { return JSON.parse(localStorage.getItem('hr_he_pagos') || '{}'); } catch (e) { return {}; } }
  function _savePagoHE(d)   { try { localStorage.setItem('hr_he_pagos', JSON.stringify(d)); } catch (e) {} }
  function _getBonifs()     { try { return JSON.parse(localStorage.getItem('hr_he_bonificacoes') || '[]'); } catch (e) { return []; } }
  function _saveBonifs(d)   { try { localStorage.setItem('hr_he_bonificacoes', JSON.stringify(d)); } catch (e) {} }

  // ── Feriados nacionais fixos (YYYY-MM-DD) ────────────────────────
  var _FERIADOS_FIXOS = [
    '01-01','04-21','05-01','09-07','10-12','11-02','11-15','11-20','12-25'
  ]; // formato MM-DD (vale qualquer ano)

  function _isFeriado(dataISO) {
    // Checa feriados nacionais fixos + feriados cadastrados no sistema (hr_excecoes tipo feriado)
    var mmdd = dataISO.slice(5);
    if (_FERIADOS_FIXOS.indexOf(mmdd) !== -1) return true;
    try {
      var exc = JSON.parse(localStorage.getItem('hr_excecoes') || '{}');
      return Object.values(exc).some(function(e){ return e.data === dataISO && e.tipo === 'feriado'; });
    } catch(e) { return false; }
  }

  function _diaSemana(dataISO) {
    // 0=Dom,1=Seg,...,6=Sáb
    return new Date(dataISO + 'T12:00:00').getDay();
  }

  // ── Multiplicadores (lê CFG ou usa padrão) ───────────────────────
  function _getMult() {
    var def = { normal: 2.0, sabado: 2.0, domingo: 3.0, feriado: 3.0, especial: 3.0 };
    try {
      var src = (typeof CFG !== 'undefined' && CFG && CFG.he) ? CFG.he
        : JSON.parse(localStorage.getItem('cfg') || '{}').he;
      if (src) return {
        normal:   parseFloat(src.normal)   || def.normal,
        sabado:   parseFloat(src.sabado)   || def.sabado,
        domingo:  parseFloat(src.domingo)  || def.domingo,
        feriado:  parseFloat(src.feriado)  || def.feriado,
        especial: parseFloat(src.especial) || def.especial
      };
    } catch (e) {}
    return def;
  }

  // ── Motor de multiplicador com cascata de prioridades ────────────
  //  Prioridade: bonificação por funcionário > bonificação geral > tipo do dia
  function _resolverMultiplicador(dataISO, funcId, mult) {
    var bonifs = _getBonifs();
    var hoje = dataISO;

    // 1) Busca bonificação específica para este funcionário nesta data
    var bonifFunc = null;
    bonifs.forEach(function(b) {
      if (!b.ativo) return;
      if (b.funcId && b.funcId !== funcId) return; // é de outro funcionário
      if (!b.funcId) return; // é geral, pula nesse loop
      if (hoje >= b.inicio && hoje <= b.fim) {
        if (!bonifFunc || parseFloat(b.multiplicador) > parseFloat(bonifFunc.multiplicador)) {
          bonifFunc = b;
        }
      }
    });
    if (bonifFunc) return { mult: parseFloat(bonifFunc.multiplicador), origem: 'bonif_func', label: bonifFunc.nome };

    // 2) Busca bonificação geral (sem funcId específico) nesta data
    var bonifGeral = null;
    bonifs.forEach(function(b) {
      if (!b.ativo) return;
      if (b.funcId) return; // é específico de funcionário, pula
      if (hoje >= b.inicio && hoje <= b.fim) {
        if (!bonifGeral || parseFloat(b.multiplicador) > parseFloat(bonifGeral.multiplicador)) {
          bonifGeral = b;
        }
      }
    });
    if (bonifGeral) return { mult: parseFloat(bonifGeral.multiplicador), origem: 'bonif_geral', label: bonifGeral.nome };

    // 3) Tipo do dia automático
    if (_isFeriado(dataISO)) return { mult: mult.feriado, origem: 'feriado', label: 'Feriado ×' + mult.feriado.toFixed(1) };
    var ds = _diaSemana(dataISO);
    if (ds === 0) return { mult: mult.domingo, origem: 'domingo', label: 'Domingo ×' + mult.domingo.toFixed(1) };
    if (ds === 6) return { mult: mult.sabado,  origem: 'sabado',  label: 'Sábado ×'  + mult.sabado.toFixed(1)  };
    return { mult: mult.normal, origem: 'normal', label: 'Normal ×' + mult.normal.toFixed(1) };
  }

  // ─────────────────────────────────────────────────────────────────
  //  MOTOR DE CÁLCULO
  //  Valor HE = hExtra × (salário/220) × multiplicador resolvido
  // ─────────────────────────────────────────────────────────────────
  function _calcularHE(funcId, inicio, fim) {
    var funcs = _getFuncs(), regs = _getRegs();
    var aprova = _getAprova();
    var mult = _getMult();
    var f = funcs[funcId] || {};
    var salario = parseFloat(f.salario) || 0;

    // Valor hora base: salário ÷ 220h mensais
    var valorHoraBase = salario / 220;

    // Filtrar registros do período com hora extra
    var todosComExtra = Object.values(regs).filter(function (r) {
      if (r.funcionarioId !== funcId) return false;
      if (inicio && r.data < inicio) return false;
      if (fim && r.data > fim) return false;
      return parseFloat(r.extra) > 0;
    }).sort(function (a, b) { return a.data.localeCompare(b.data); });

    var registrosPagar = todosComExtra.filter(function (r) { return r.destinoExtra !== 'banco'; });
    var registrosBanco = todosComExtra.filter(function (r) { return r.destinoExtra === 'banco'; });
    var totalHorasBanco = registrosBanco.reduce(function (s, r) { return s + (parseFloat(r.extra) || 0); }, 0);

    // Calcular cada registro com multiplicador resolvido por cascata
    var totalHorasExtra = 0;
    var totalValorExtra = 0;

    registrosPagar.forEach(function (r) {
      var hExtra = parseFloat(r.extra) || 0;

      // Resolve multiplicador: bonificação por func > bonificação geral > tipo do dia
      var res = _resolverMultiplicador(r.data, funcId, mult);

      // Se o registro tem tipoExtra='especial' E não há bonificação ativa, usa o especial
      // (cobre: sáb tarde, horário extremo, dias marcados manualmente como especial)
      // Também aplica para origem='sabado' pois o sábado tarde deve ser ×3 (especial)
      if ((res.origem === 'normal' || res.origem === 'sabado') && r.tipoExtra && r.tipoExtra !== 'normal') {
        var tipoM = (r.tipoExtra || '').toLowerCase();
        if (tipoM === 'feriado')  res = { mult: mult.feriado, origem: 'feriado',  label: 'Feriado ×' + mult.feriado.toFixed(1)  };
        if (tipoM === 'domingo')  res = { mult: mult.domingo, origem: 'domingo',  label: 'Domingo ×' + mult.domingo.toFixed(1)  };
        if (tipoM === 'especial') res = { mult: mult.especial || 3.0, origem: 'especial', label: 'Triplicada ×' + (mult.especial || 3.0).toFixed(1).replace('.',',') };
      }

      r._multUsado       = res.mult;
      r._multOrigem      = res.origem;
      r._multLabel       = res.label;
      r._valorHoraExtra  = valorHoraBase * res.mult;
      r._valorTotalExtra = hExtra * r._valorHoraExtra;
      r._aprovado        = aprova[r.id] !== false;

      totalHorasExtra += hExtra;
      totalValorExtra += r._aprovado ? r._valorTotalExtra : 0;
    });

    // Total aprovado (igual ao total, pois já filtrado acima)
    var totalValorAprovado = totalValorExtra;

    // Pagamentos já registrados no período
    var totalPago = Object.values(_getPagoHE()).filter(function (p) {
      return p.funcionarioId === funcId &&
        (!inicio || p.periodo >= inicio) &&
        (!fim    || p.periodo <= fim);
    }).reduce(function (s, p) { return s + (parseFloat(p.valor) || 0); }, 0);

    return {
      func:               f,
      salario:            salario,
      valorHoraBase:      valorHoraBase,
      registrosPagar:     registrosPagar,
      registrosBanco:     registrosBanco,
      totalHorasExtra:    totalHorasExtra,
      totalValorExtra:    totalValorExtra,
      totalValorAprovado: totalValorAprovado,
      totalHorasBanco:    totalHorasBanco,
      totalPago:          totalPago,
      saldo:              Math.max(0, totalValorAprovado - totalPago),
      mult:               mult
    };
  }

  function _calcularTodos(inicio, fim) {
    return Object.values(_getFuncs())
      .filter(function (f) { return f.ativo !== false; })
      .map(function (f) { return _calcularHE(f.id, inicio, fim); })
      .filter(function (r) { return r.totalHorasExtra > 0 || r.totalHorasBanco > 0; })
      .sort(function (a, b) { return (a.func.nome || '').localeCompare(b.func.nome || ''); });
  }

  // ── Estado do painel ─────────────────────────────────────────────
  var _st = {
    inicio: _mesAtual() + '-01',
    fim:    new Date().toISOString().slice(0, 10),
    funcId: null,
    aba:    'he' // 'he' | 'bonif'
  };

  // ════════════════════════════════════════════════════════════════
  //  PAINEL PRINCIPAL
  // ════════════════════════════════════════════════════════════════
  function abrirRelatorioHorasExtras(funcIdDireto) {
    if (funcIdDireto) _st.funcId = funcIdDireto;
    if (_st.aba === 'bonif') _renderBonificacoes();
    else _renderPainel();
  }

  function _renderPainel() {
    var funcs = _getFuncs();
    var ativos = Object.values(funcs).filter(function (f) { return f.ativo !== false; });
    var resultados = _calcularTodos(_st.inicio, _st.fim);

    // Totais
    var totHoras  = resultados.reduce(function (s, r) { return s + r.totalHorasExtra; }, 0);
    var totValor  = resultados.reduce(function (s, r) { return s + r.totalValorExtra; }, 0);
    var totBanco  = resultados.reduce(function (s, r) { return s + r.totalHorasBanco; }, 0);
    var totSaldo  = resultados.reduce(function (s, r) { return s + r.saldo; }, 0);

    var exibir = _st.funcId
      ? resultados.filter(function (r) { return r.func.id === _st.funcId; })
      : resultados;

    var INP = 'width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;' +
      'border:1px solid rgba(201,168,76,.2);background:rgba(255,255,255,.03);' +
      'color:' + T1 + ';font-size:.85rem;font-family:Outfit,sans-serif;outline:none;';

    var opsFuncs = [{ v: '', l: '👥 Todos os funcionários' }].concat(
      ativos.sort(function (a, b) { return (a.nome || '').localeCompare(b.nome || ''); })
        .map(function (f) { return { v: f.id, l: f.nome }; })
    );
    var optsHtml = opsFuncs.map(function (o) {
      return '<option value="' + o.v + '"' + (o.v === (_st.funcId || '') ? ' selected' : '') + '>' + _esc(o.l) + '</option>';
    }).join('');

    // ── Tabela ──────────────────────────────────────────────────────
    var tabelaHtml = '';
    if (exibir.length === 0) {
      tabelaHtml = '<div style="text-align:center;padding:32px 0;color:' + T3 + ';font-size:.85rem;">Nenhuma hora extra registrada no período.</div>';
    } else {
      tabelaHtml =
        '<div style="overflow-x:auto;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:.77rem;min-width:500px;">' +
          '<thead>' +
            '<tr style="color:' + GOLD + ';font-size:.65rem;letter-spacing:.06em;text-transform:uppercase;">' +
              '<th style="text-align:left;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Funcionário</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Salário</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">V/h extra</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">H. Extras</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Total HE R$</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Já Pago</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Saldo</th>' +
              '<th style="text-align:center;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Ações</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
        exibir.map(function (r) {
          return '<tr style="border-bottom:1px solid rgba(255,255,255,.04);cursor:pointer;" onclick="window._heAbrirDetalhe(\'' + r.func.id + '\')">' +
            '<td style="padding:9px 8px;color:' + T1 + ';font-weight:600;">' + _esc(r.func.nome || '—') + '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:' + T2 + ';">' + _fmtMoeda(r.salario) + '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:' + T3 + ';font-size:.72rem;">' +
              _fmtMoeda(r.valorHoraBase * r.mult.normal) + '/h' +
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:' + GOLD + ';font-weight:700;">' +
              r.totalHorasExtra.toFixed(2) + 'h' +
              (r.totalHorasBanco > 0 ? '<br><span style="font-size:.65rem;color:' + BLUE + ';">+' + r.totalHorasBanco.toFixed(2) + 'h banco</span>' : '') +
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;font-weight:800;color:' + GOLD + ';font-size:.92rem;">' +
              _fmtMoeda(r.totalValorExtra) +
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:' + (r.totalPago > 0 ? GREEN : T3) + ';font-size:.82rem;">' +
              (r.totalPago > 0 ? _fmtMoeda(r.totalPago) : '—') +
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;font-weight:800;color:' + (r.saldo > 0 ? GREEN : T3) + ';font-size:.88rem;">' +
              (r.saldo > 0 ? _fmtMoeda(r.saldo) : '✓ Pago') +
            '</td>' +
            '<td style="padding:9px 8px;text-align:center;">' +
              '<div style="display:flex;gap:4px;justify-content:center;">' +
                '<button onclick="event.stopPropagation();window._heAbrirDetalhe(\'' + r.func.id + '\')" style="' + _btnMini(GOLD) + '" title="Ver detalhes">📋</button>' +
                '<button onclick="event.stopPropagation();window._heGerarPDF(\'' + r.func.id + '\',\'' + _st.inicio + '\',\'' + _st.fim + '\')" style="' + _btnMini('rgba(201,168,76,.6)') + '" title="Gerar PDF">📄</button>' +
                (r.saldo > 0
                  ? '<button onclick="event.stopPropagation();window._heMarcarPago(\'' + r.func.id + '\',' + r.saldo + ')" style="' + _btnMini(GREEN) + '" title="Registrar pagamento">✓$</button>'
                  : '') +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('') +
          '</tbody>' +
          '<tfoot>' +
            '<tr style="background:rgba(201,168,76,.05);border-top:1.5px solid rgba(201,168,76,.25);">' +
              '<td colspan="3" style="padding:10px 8px;font-size:.7rem;color:' + T3 + ';font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Total</td>' +
              '<td style="padding:10px 8px;text-align:right;font-weight:700;color:' + GOLD + ';font-size:.85rem;">' + totHoras.toFixed(2) + 'h</td>' +
              '<td style="padding:10px 8px;text-align:right;font-weight:800;color:' + GOLD + ';font-size:.95rem;">' + _fmtMoeda(totValor) + '</td>' +
              '<td></td>' +
              '<td style="padding:10px 8px;text-align:right;font-weight:800;color:' + GREEN + ';font-size:.92rem;">' + _fmtMoeda(totSaldo) + '</td>' +
              '<td></td>' +
            '</tr>' +
          '</tfoot>' +
        '</table>' +
        '</div>';
    }

    var html =
      '<div style="width:100%;max-width:820px;padding:0 16px;">' +

      // Cabeçalho
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">' +
        '<div>' +
          '<div style="font-size:.52rem;color:' + GOLD + ';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
          '<div style="font-size:1.4rem;font-weight:800;color:' + T1 + ';letter-spacing:-.02em;">⚡ Horas Extras</div>' +
          '<div style="font-size:.72rem;color:' + T3 + ';margin-top:3px;">' + _nomeMes(_st.inicio.slice(0, 7)) + '</div>' +
        '</div>' +
        '<button onclick="window._heFechar()" style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.3rem;padding:4px;">✕</button>' +
      '</div>' +

      // Abas
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;">' +
        '<button onclick="window._heAba(\'he\')" style="padding:10px;border-radius:10px;font-family:Outfit,sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;' + (_st.aba==='he' ? 'background:linear-gradient(135deg,#1e1800,#0f0c00);border:1.5px solid rgba(201,168,76,.5);color:'+GOLD+';' : 'background:transparent;border:1px solid rgba(201,168,76,.15);color:'+T3+';') + '">⚡ Horas Extras</button>' +
        '<button onclick="window._heAba(\'bonif\')" style="padding:10px;border-radius:10px;font-family:Outfit,sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;' + (_st.aba==='bonif' ? 'background:linear-gradient(135deg,#051805,#030e03);border:1.5px solid rgba(92,184,92,.5);color:'+GREEN+';' : 'background:transparent;border:1px solid rgba(92,184,92,.15);color:'+T3+';') + '">🏆 Bonificações</button>' +
      '</div>' +

      // KPIs
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">' +
        _kpi('⏱', 'Total Horas', totHoras.toFixed(2) + 'h', 'no período') +
        _kpi('💰', 'Total HE', _fmtMoeda(totValor), 'a pagar') +
        _kpi('✅', 'Saldo Aberto', _fmtMoeda(totSaldo), 'ainda não pago') +
      '</div>' +

      // Bonificações ativas agora
      (function() {
        var hoje = new Date().toISOString().slice(0,10);
        var ativas = _getBonifs().filter(function(b){ return b.ativo && hoje >= b.inicio && hoje <= b.fim; });
        if (!ativas.length) return '';
        var funcs2 = _getFuncs();
        return '<div style="background:rgba(92,184,92,.05);border:1.5px solid rgba(92,184,92,.3);border-radius:12px;padding:12px 14px;margin-bottom:14px;">' +
          '<div style="font-size:.6rem;color:' + GREEN + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">🏆 Bonificações Ativas Agora</div>' +
          ativas.map(function(b) {
            var fn = b.funcId ? ((funcs2[b.funcId]||{}).nome||b.funcId) : 'Todos';
            return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid rgba(92,184,92,.08);">' +
              '<div><span style="font-size:.82rem;font-weight:700;color:' + T1 + ';">' + _esc(b.nome) + '</span>' +
              '<span style="font-size:.7rem;color:' + T3 + ';margin-left:8px;">' + _esc(fn) + '</span></div>' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<span style="font-size:.72rem;color:' + T3 + ';">' + _fmtData(b.inicio) + ' – ' + _fmtData(b.fim) + '</span>' +
                '<span style="font-size:.9rem;font-weight:800;color:' + GREEN + ';">×' + parseFloat(b.multiplicador).toFixed(1).replace('.',',') + '</span>' +
              '</div>' +
            '</div>';
          }).join('') +
        '</div>';
      })() +

      // Filtros
      '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:14px;margin-bottom:14px;">' +
        '<div style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Filtros</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">' +
          '<div>' +
            '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Funcionário</label>' +
            '<select id="heRelFunc" style="' + INP + '">' + optsHtml + '</select>' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">De</label>' +
            '<input id="heRelInicio" type="date" value="' + (_st.inicio||'') + '" style="' + INP + '">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Até</label>' +
            '<input id="heRelFim" type="date" value="' + (_st.fim||'') + '" style="' + INP + '">' +
          '</div>' +
        '</div>' +
        '<button onclick="window._heAplicarFiltro()" style="' + _btnPrincipal() + ' margin-top:10px;">🔍 Filtrar</button>' +
      '</div>' +

      // Legenda multiplicadores automáticos
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
        _badge(T3,     '×' + _getMult().normal.toFixed(1).replace('.',','),  'Dia útil / Sáb manhã (dobrada)') +
        _badge(RED,    '×' + _getMult().domingo.toFixed(1).replace('.',','), 'Dom / Feriado / Sáb tarde / Ext (triplicada)') +
        _badge(GREEN,  '× Bonif.', 'Período de Bonificação') +
        (totBanco > 0 ? _badge(BLUE, '🏦 '+totBanco.toFixed(2)+'h', 'No banco de horas') : '') +
      '</div>' +

      // Tabela
      '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:14px;margin-bottom:14px;">' +
        tabelaHtml +
      '</div>' +

      (exibir.filter(function(r){ return r.totalHorasExtra > 0; }).length > 1
        ? '<button onclick="window._heGerarTodosPDFs(\'' + _st.inicio + '\',\'' + _st.fim + '\')" style="' + _btnSecundario() + ' margin-bottom:8px;">📋 Gerar PDFs de Todos</button>'
        : '') +

      '<button onclick="window._heFechar()" style="' + _btnGhost() + '">Fechar</button>' +
    '</div>';

    _overlay('heRelatorio', html);
  }

  // ── Helpers de botões ────────────────────────────────────────────
  function _btnPrincipal() {
    return 'width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#1e1800,#0f0c00);' +
      'border:1.5px solid rgba(201,168,76,.5);color:' + GOLD + ';font-family:Outfit,sans-serif;' +
      'font-size:.88rem;font-weight:700;cursor:pointer;letter-spacing:.02em;';
  }
  function _btnSecundario() {
    return 'width:100%;padding:12px;border-radius:10px;background:rgba(201,168,76,.06);' +
      'border:1px solid rgba(201,168,76,.3);color:' + GOLD + ';font-family:Outfit,sans-serif;' +
      'font-size:.85rem;font-weight:600;cursor:pointer;';
  }
  function _btnGhost() {
    return 'width:100%;padding:12px;border-radius:10px;background:transparent;' +
      'border:1px solid rgba(255,255,255,.07);color:' + T3 + ';font-family:Outfit,sans-serif;' +
      'font-size:.85rem;cursor:pointer;';
  }
  function _btnMini(cor) {
    return 'padding:5px 8px;border-radius:6px;background:rgba(255,255,255,.04);' +
      'border:1px solid ' + cor + ';color:' + cor + ';font-family:Outfit,sans-serif;' +
      'font-size:.7rem;cursor:pointer;';
  }
  function _kpi(ico, label, valor, sub) {
    return '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:12px 10px;text-align:center;">' +
      '<div style="font-size:1rem;margin-bottom:3px;">' + ico + '</div>' +
      '<div style="font-size:.9rem;font-weight:800;color:' + GOLD + ';margin-bottom:2px;">' + valor + '</div>' +
      '<div style="font-size:.6rem;color:' + T3 + ';line-height:1.3;">' + label + '<br>' + sub + '</div>' +
    '</div>';
  }
  function _badge(cor, label, title) {
    return '<div title="' + _esc(title) + '" style="background:rgba(0,0,0,.3);border:1px solid ' + cor + ';' +
      'border-radius:20px;padding:3px 10px;font-size:.65rem;color:' + cor + ';cursor:default;">' + label + '</div>';
  }

  // ════════════════════════════════════════════════════════════════
  //  DETALHE POR FUNCIONÁRIO
  // ════════════════════════════════════════════════════════════════
  window._heAbrirDetalhe = function (funcId) {
    var dados = _calcularHE(funcId, _st.inicio, _st.fim);
    var f = dados.func;

    var linhasHtml = dados.registrosPagar.map(function (r) {
      var hExtra = parseFloat(r.extra) || 0;
      var aprovado = r._aprovado !== false;
      var corStatus = aprovado ? GREEN : RED;
      var labelTipo = r._multLabel || _labelTipo(r.tipoExtra, r._multUsado);
      var corLabel  = (r._multOrigem === 'bonif_func' || r._multOrigem === 'bonif_geral') ? GREEN
                    : (r._multOrigem === 'feriado')  ? RED
                    : (r._multOrigem === 'domingo')  ? RED
                    : (r._multOrigem === 'sabado')   ? ORANGE
                    : T3;

      return '<tr style="border-bottom:1px solid rgba(255,255,255,.04);">' +
        '<td style="padding:8px;color:' + T1 + ';font-size:.78rem;">' + _fmtData(r.data) + '</td>' +
        '<td style="padding:8px;color:' + T2 + ';font-size:.75rem;">' + (r.entrada || '—') + '</td>' +
        '<td style="padding:8px;color:' + T2 + ';font-size:.75rem;">' + (r.saida || '—') + '</td>' +
        '<td style="padding:8px;text-align:right;color:' + GOLD + ';font-weight:700;font-size:.82rem;">' + hExtra.toFixed(2) + 'h</td>' +
        '<td style="padding:8px;color:' + corLabel + ';font-size:.72rem;font-weight:600;">' + labelTipo + '</td>' +
        '<td style="padding:8px;text-align:right;color:' + GOLD + ';font-weight:700;font-size:.82rem;">' +
          _fmtMoeda(aprovado ? (r._valorTotalExtra || 0) : 0) +
        '</td>' +
        '<td style="padding:8px;text-align:center;">' +
          '<button onclick="window._heToggleAprova(\'' + r.id + '\',\'' + funcId + '\')" ' +
            'title="' + (aprovado ? 'Reprovar' : 'Aprovar') + '" ' +
            'style="' + _btnMini(corStatus) + '">' + (aprovado ? '✓ Ok' : '✕') + '</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    var html =
      '<div style="width:100%;max-width:620px;padding:0 16px;">' +

      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">' +
        '<button onclick="abrirRelatorioHorasExtras()" style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px;">←</button>' +
        '<div style="flex:1;">' +
          '<div style="font-size:.52rem;color:' + GOLD + ';letter-spacing:.15em;text-transform:uppercase;margin-bottom:1px;">Detalhes de HE</div>' +
          '<div style="font-size:1rem;font-weight:800;color:' + T1 + ';">' + _esc(f.nome) + '</div>' +
          '<div style="font-size:.7rem;color:' + T3 + ';">' + _esc(f.cargo || '—') + ' · ' + _nomeMes(_st.inicio.slice(0, 7)) + '</div>' +
        '</div>' +
        '<button onclick="window._heGerarPDF(\'' + funcId + '\',\'' + _st.inicio + '\',\'' + _st.fim + '\')" style="' + _btnMini(GOLD) + ' padding:8px 12px;">📄 PDF</button>' +
        '<button onclick="window._heFechar()" style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>' +
      '</div>' +

      // Resumo — apenas o que importa: HE e valor
      '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:13px;padding:16px;margin-bottom:14px;">' +
        '<div style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px;">Resumo do Período</div>' +

        _linhaResumo('Salário Base', dados.salario, T2) +
        _linhaResumo('Valor hora extra (×' + dados.mult.normal.toFixed(1).replace('.', ',') + ')', dados.valorHoraBase * dados.mult.normal, T2, '/h') +

        '<div style="border-top:1px solid rgba(201,168,76,.15);margin:10px 0;"></div>' +

        // Resumo dinâmico: agrupa registros por _multLabel (inclui bonificações)
        (function() {
          var grupos = {};
          dados.registrosPagar.forEach(function(r) {
            var lbl = r._multLabel || ('×' + (r._multUsado||1).toFixed(1));
            var ori = r._multOrigem || 'normal';
            if (!grupos[lbl]) grupos[lbl] = { total: 0, origem: ori };
            if (r._aprovado !== false) grupos[lbl].total += (r._valorTotalExtra||0);
          });
          return Object.keys(grupos).map(function(lbl) {
            var g = grupos[lbl];
            var cor = (g.origem==='bonif_func'||g.origem==='bonif_geral') ? GREEN
                    : (g.origem==='feriado')  ? RED
                    : (g.origem==='domingo')  ? RED
                    : (g.origem==='sabado')   ? ORANGE
                    : GOLD;
            return g.total > 0 ? _linhaResumo(lbl, g.total, cor) : '';
          }).join('');
        })() +

        '<div style="border-top:2px solid rgba(201,168,76,.25);margin:12px 0 8px;"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">' +
          '<div style="font-size:.88rem;font-weight:700;color:' + T1 + ';">Total Horas Extras</div>' +
          '<div style="font-size:1rem;font-weight:800;color:' + GOLD + ';">' + dados.totalHorasExtra.toFixed(2) + 'h · ' + _fmtMoeda(dados.totalValorExtra) + '</div>' +
        '</div>' +

        (dados.totalPago > 0
          ? '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">' +
              '<div style="font-size:.78rem;color:' + T3 + ';">Já Pago</div>' +
              '<div style="font-size:.88rem;color:' + T3 + ';">− ' + _fmtMoeda(dados.totalPago) + '</div>' +
            '</div>'
          : '') +

        '<div style="border-top:1px solid rgba(201,168,76,.15);margin:10px 0;"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<div style="font-size:.78rem;color:' + T3 + ';">HE a pagar neste período</div>' +
          '<div style="font-size:1.15rem;font-weight:800;color:' + (dados.saldo > 0 ? GOLD : GREEN) + ';">' +
            (dados.saldo > 0 ? _fmtMoeda(dados.saldo) : '✓ Pago') +
          '</div>' +
        '</div>' +
      '</div>' +

      // Tabela de registros
      (dados.registrosPagar.length > 0
        ? '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:13px;padding:14px;margin-bottom:14px;overflow-x:auto;">' +
            '<div style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">' +
              'Registros Detalhados' +
              '<span style="margin-left:8px;font-size:.58rem;color:' + T3 + ';text-transform:none;font-weight:400;">Clique em ✓/✕ para aprovar</span>' +
            '</div>' +
            '<table style="width:100%;border-collapse:collapse;font-size:.77rem;">' +
              '<thead>' +
                '<tr style="color:' + GOLD + ';font-size:.65rem;letter-spacing:.06em;text-transform:uppercase;">' +
                  '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Data</th>' +
                  '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Entrada</th>' +
                  '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Saída</th>' +
                  '<th style="text-align:right;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">H. Extra</th>' +
                  '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Tipo</th>' +
                  '<th style="text-align:right;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Valor</th>' +
                  '<th style="text-align:center;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">OK?</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>' + linhasHtml + '</tbody>' +
            '</table>' +
          '</div>'
        : '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:13px;padding:16px;margin-bottom:14px;text-align:center;color:' + T3 + ';font-size:.82rem;">Nenhuma HE a pagar no período</div>') +

      // Banco de horas (informativo)
      (dados.registrosBanco.length > 0
        ? '<div style="background:rgba(142,200,240,.05);border:1px solid rgba(142,200,240,.15);border-radius:10px;padding:12px;margin-bottom:14px;">' +
            '<div style="font-size:.65rem;color:' + BLUE + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;">🏦 Banco de Horas (não pago)</div>' +
            '<div style="font-size:.82rem;color:' + T2 + ';">' + dados.totalHorasBanco.toFixed(2) + 'h acumuladas no banco</div>' +
          '</div>'
        : '') +

      // Botão pagar
      (dados.saldo > 0
        ? '<button onclick="window._heMarcarPago(\'' + funcId + '\',' + dados.saldo + ')" ' +
            'style="width:100%;padding:13px;border-radius:11px;background:linear-gradient(135deg,#08100a,#040a05);' +
            'border:1.5px solid rgba(92,184,92,.4);color:' + GREEN + ';font-family:Outfit,sans-serif;' +
            'font-size:.88rem;font-weight:700;cursor:pointer;margin-bottom:8px;letter-spacing:.03em;">' +
            '✓ Registrar Pagamento de ' + _fmtMoeda(dados.saldo) +
          '</button>'
        : '') +

      '<button onclick="abrirRelatorioHorasExtras()" style="' + _btnGhost() + '">← Voltar</button>' +
    '</div>';

    _closeOverlay('heRelatorio');
    _overlay('heRelatorio', html);
  };

  function _linhaResumo(label, valor, cor, sufixo) {
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;">' +
      '<div style="font-size:.78rem;color:' + T2 + ';">' + label + '</div>' +
      '<div style="font-size:.82rem;font-weight:600;color:' + (cor || T2) + ';">' +
        (sufixo ? _fmtMoeda(valor) + sufixo : _fmtMoeda(valor)) +
      '</div>' +
    '</div>';
  }

  function _labelTipo(tipo, mult) {
    var t = (tipo || 'normal').toLowerCase();
    var m = mult ? ' ×' + mult.toFixed(1).replace('.', ',') : '';
    switch (t) {
      case 'feriado':  return '🗓️ Feriado (×3)' + m;
      case 'especial': return '⭐ Triplicada (dom/sáb tarde/ext)' + m;
      case 'domingo':  return '☀️ Domingo (×3)' + m;
      default:         return '⚡ Dobrada (dia útil)' + m;
    }
  }

  // ── Aprovar/Reprovar ─────────────────────────────────────────────
  window._heToggleAprova = function (regId, funcId) {
    var aprova = _getAprova();
    aprova[regId] = (aprova[regId] === false) ? true : false;
    _saveAprova(aprova);
    _toast(aprova[regId] === false ? '🔴 HE reprovada' : '✓ HE aprovada');
    window._heAbrirDetalhe(funcId);
  };

  // ── Marcar como Pago ─────────────────────────────────────────────
  window._heMarcarPago = function (funcId, saldo) {
    var f = _getFuncs()[funcId] || {};
    var nome = (f.nome || 'funcionário').split(' ')[0];
    var modalId = 'heConfirmPago_' + funcId;
    _closeOverlay(modalId);

    var ov = document.createElement('div');
    ov.id = modalId;
    ov.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.75);' +
      'display:flex;align-items:center;justify-content:center;padding:24px;font-family:Outfit,sans-serif;';
    ov.innerHTML =
      '<div style="width:100%;max-width:360px;background:#161410;border:1px solid rgba(201,168,76,.25);' +
        'border-radius:16px;padding:24px 20px;text-align:center;">' +
        '<div style="font-size:1.6rem;margin-bottom:10px;">✅</div>' +
        '<div style="font-size:.95rem;font-weight:700;color:#f0ece4;margin-bottom:6px;">Confirmar Pagamento</div>' +
        '<div style="font-size:.82rem;color:#b8b0a0;margin-bottom:16px;line-height:1.5;">' +
          'Registrar pagamento de <strong style="color:#C9A84C;">' + _fmtMoeda(saldo) + '</strong> para <strong style="color:#f0ece4;">' + _esc(nome) + '</strong>?' +
          '<br><span style="font-size:.72rem;color:#7a7268;">As HE do período serão marcadas como pagas.</span>' +
        '</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          '<button id="hePagoCancel_' + funcId + '" style="padding:11px;border-radius:10px;background:transparent;' +
            'border:1px solid rgba(255,255,255,.1);color:#7a7268;font-family:Outfit,sans-serif;font-size:.85rem;cursor:pointer;">Cancelar</button>' +
          '<button id="hePagoOk_' + funcId + '" style="padding:11px;border-radius:10px;' +
            'background:linear-gradient(135deg,#08100a,#040a05);' +
            'border:1.5px solid rgba(92,184,92,.4);color:#5cb85c;' +
            'font-family:Outfit,sans-serif;font-size:.85rem;font-weight:700;cursor:pointer;">✓ Confirmar</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);

    document.getElementById('hePagoCancel_' + funcId).onclick = function () { _closeOverlay(modalId); };
    document.getElementById('hePagoOk_' + funcId).onclick = function () {
      _closeOverlay(modalId);
      var pagoHE = _getPagoHE();
      var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      pagoHE[id] = {
        id:            id,
        funcionarioId: funcId,
        valor:         saldo,
        periodo:       _st.inicio,
        data:          new Date().toISOString().slice(0, 10),
        criadoEm:      new Date().toISOString()
      };
      _savePagoHE(pagoHE);
      _toast('✓ Pagamento de ' + _fmtMoeda(saldo) + ' registrado para ' + nome);
      window._heAbrirDetalhe(funcId);
    };
  };

  // ── Filtro ───────────────────────────────────────────────────────
  window._heAplicarFiltro = function () {
    _st.inicio = (document.getElementById('heRelInicio') || {}).value || '';
    _st.fim    = (document.getElementById('heRelFim')    || {}).value || '';
    _st.funcId = (document.getElementById('heRelFunc')   || {}).value || null;
    _renderPainel();
  };

  window._heFechar = function () { _closeOverlay('heRelatorio'); };

  window._heAba = function(aba) {
    _st.aba = aba;
    if (aba === 'bonif') _renderBonificacoes();
    else _renderPainel();
  };

  // ════════════════════════════════════════════════════════════════
  //  TELA DE BONIFICAÇÕES
  // ════════════════════════════════════════════════════════════════
  function _renderBonificacoes() {
    var bonifs  = _getBonifs();
    var funcs   = _getFuncs();
    var ativos  = Object.values(funcs).filter(function(f){ return f.ativo !== false; });
    var hoje    = new Date().toISOString().slice(0,10);

    var INP = 'width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;' +
      'border:1px solid rgba(201,168,76,.2);background:rgba(255,255,255,.03);' +
      'color:' + T1 + ';font-size:.85rem;font-family:Outfit,sans-serif;outline:none;';

    // Lista de bonificações ordenada por data desc
    var listaBonif = bonifs.slice().sort(function(a,b){ return b.inicio.localeCompare(a.inicio); });

    var listaHtml = listaBonif.length === 0
      ? '<div style="text-align:center;padding:28px 0;color:' + T3 + ';font-size:.85rem;">Nenhuma bonificação cadastrada ainda.</div>'
      : listaBonif.map(function(b, idx) {
          var ativa = b.ativo && hoje >= b.inicio && hoje <= b.fim;
          var passada = b.fim < hoje;
          var funcNome = b.funcId ? ((funcs[b.funcId]||{}).nome || b.funcId) : '👥 Todos';
          var cor = ativa ? GREEN : (passada ? T3 : GOLD);
          var status = ativa ? '● Ativa' : (passada ? '○ Encerrada' : '◷ Futura');
          return '<div style="background:' + S2 + ';border:1px solid ' + (ativa ? 'rgba(92,184,92,.3)' : BD) + ';' +
            'border-radius:12px;padding:14px;margin-bottom:10px;">' +
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
              '<div style="flex:1;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">' +
                  '<span style="font-size:.85rem;font-weight:700;color:' + T1 + ';">' + _esc(b.nome) + '</span>' +
                  '<span style="font-size:.65rem;font-weight:700;color:' + cor + ';padding:2px 7px;border-radius:20px;' +
                    'background:' + cor + '22;border:1px solid ' + cor + '55;">' + status + '</span>' +
                '</div>' +
                '<div style="display:flex;gap:12px;flex-wrap:wrap;">' +
                  '<span style="font-size:.75rem;color:' + T3 + ';">📅 ' + _fmtData(b.inicio) + ' – ' + _fmtData(b.fim) + '</span>' +
                  '<span style="font-size:.75rem;color:' + T3 + ';">👤 ' + _esc(funcNome) + '</span>' +
                '</div>' +
                (b.obs ? '<div style="font-size:.72rem;color:' + T3 + ';margin-top:4px;font-style:italic;">' + _esc(b.obs) + '</div>' : '') +
              '</div>' +
              '<div style="display:flex;align-items:center;gap:8px;">' +
                '<div style="font-size:1.3rem;font-weight:800;color:' + GREEN + ';min-width:44px;text-align:right;">×' +
                  parseFloat(b.multiplicador).toFixed(1).replace('.',',') +
                '</div>' +
                '<div style="display:flex;flex-direction:column;gap:4px;">' +
                  '<button onclick="window._heBonifToggle(' + idx + ')" style="' + _btnMini(b.ativo ? RED : GREEN) + '">' +
                    (b.ativo ? '⏸ Pausar' : '▶ Ativar') +
                  '</button>' +
                  '<button onclick="window._heBonifExcluir(' + idx + ')" style="' + _btnMini(RED) + '">🗑</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>';
        }).join('');

    // Form de nova bonificação
    var opsFuncs = [{ v: '', l: '👥 Todos os funcionários' }].concat(
      ativos.sort(function(a,b){ return (a.nome||'').localeCompare(b.nome||''); })
        .map(function(f){ return { v: f.id, l: f.nome }; })
    );
    var optsHtml = opsFuncs.map(function(o){
      return '<option value="' + o.v + '">' + _esc(o.l) + '</option>';
    }).join('');

    var html =
      '<div style="width:100%;max-width:600px;padding:0 16px;">' +

      // Cabeçalho
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">' +
        '<div>' +
          '<div style="font-size:.52rem;color:' + GOLD + ';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
          '<div style="font-size:1.4rem;font-weight:800;color:' + T1 + ';letter-spacing:-.02em;">🏆 Bonificações de HE</div>' +
          '<div style="font-size:.72rem;color:' + T3 + ';margin-top:3px;">Multiplicadores por período</div>' +
        '</div>' +
        '<button onclick="window._heFechar()" style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.3rem;padding:4px;">✕</button>' +
      '</div>' +

      // Abas
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:16px;">' +
        '<button onclick="window._heAba(\'he\')" style="padding:10px;border-radius:10px;font-family:Outfit,sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;background:transparent;border:1px solid rgba(201,168,76,.15);color:' + T3 + ';">⚡ Horas Extras</button>' +
        '<button onclick="window._heAba(\'bonif\')" style="padding:10px;border-radius:10px;font-family:Outfit,sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;background:linear-gradient(135deg,#051805,#030e03);border:1.5px solid rgba(92,184,92,.5);color:' + GREEN + ';">🏆 Bonificações</button>' +
      '</div>' +

      // Explicação
      '<div style="background:rgba(92,184,92,.04);border:1px solid rgba(92,184,92,.2);border-radius:10px;padding:12px 14px;margin-bottom:16px;">' +
        '<div style="font-size:.78rem;color:' + T2 + ';line-height:1.6;">' +
          '🏆 <strong style="color:' + GREEN + ';">Bonificação</strong> = período onde as HE valem mais. ' +
          'Prioridade: <strong>por funcionário</strong> > <strong>geral</strong> > <strong>tipo do dia</strong> (sáb/dom/feriado). ' +
          'Se uma data cair dentro de uma bonificação, ela usa o multiplicador da bonificação.' +
        '</div>' +
      '</div>' +

      // Form nova bonificação
      '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:16px;margin-bottom:16px;">' +
        '<div style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;">+ Nova Bonificação</div>' +
        '<div style="display:grid;gap:10px;">' +
          '<div>' +
            '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Nome / Motivo</label>' +
            '<input id="heBonNome" type="text" placeholder="Ex: Serviço corrido junho, Obra urgente..." style="' + INP + '">' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
            '<div>' +
              '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">De</label>' +
              '<input id="heBonInicio" type="date" value="' + hoje + '" style="' + INP + '">' +
            '</div>' +
            '<div>' +
              '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Até</label>' +
              '<input id="heBonFim" type="date" value="' + hoje + '" style="' + INP + '">' +
            '</div>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
            '<div>' +
              '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Multiplicador</label>' +
              '<select id="heBonMult" style="' + INP + '">' +
                '<option value="2.0">×2,0 — Duplicado</option>' +
                '<option value="2.5">×2,5 — Especial</option>' +
                '<option value="3.0" selected>×3,0 — Triplicado</option>' +
                '<option value="4.0">×4,0 — Quadruplicado</option>' +
              '</select>' +
            '</div>' +
            '<div>' +
              '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Funcionário</label>' +
              '<select id="heBonFunc" style="' + INP + '">' + optsHtml + '</select>' +
            '</div>' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:.65rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Observação (opcional)</label>' +
            '<input id="heBonObs" type="text" placeholder="Detalhe ou motivo..." style="' + INP + '">' +
          '</div>' +
        '</div>' +
        '<button onclick="window._heBonifSalvar()" style="' + _btnPrincipal().replace('width:100%','width:100%') + ' margin-top:12px;">✅ Salvar Bonificação</button>' +
      '</div>' +

      // Lista
      '<div style="font-size:.6rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Bonificações Cadastradas</div>' +
      listaHtml +

      '<button onclick="window._heFechar()" style="' + _btnGhost() + ' margin-top:8px;">Fechar</button>' +
    '</div>';

    _overlay('heRelatorio', html);
  }

  window._heBonifSalvar = function() {
    var nome  = (document.getElementById('heBonNome')   || {}).value || '';
    var ini   = (document.getElementById('heBonInicio') || {}).value || '';
    var fim   = (document.getElementById('heBonFim')    || {}).value || '';
    var mult  = (document.getElementById('heBonMult')   || {}).value || '2.0';
    var funcId= (document.getElementById('heBonFunc')   || {}).value || '';
    var obs   = (document.getElementById('heBonObs')    || {}).value || '';

    if (!nome.trim()) { _toast('⚠️ Informe o nome da bonificação'); return; }
    if (!ini || !fim)  { _toast('⚠️ Informe as datas'); return; }
    if (ini > fim)     { _toast('⚠️ Data inicial deve ser antes da final'); return; }

    var bonifs = _getBonifs();
    bonifs.push({
      id:           Date.now().toString(36) + Math.random().toString(36).slice(2,5),
      nome:         nome.trim(),
      inicio:       ini,
      fim:          fim,
      multiplicador: parseFloat(mult),
      funcId:       funcId || null,
      obs:          obs.trim(),
      ativo:        true,
      criadoEm:     new Date().toISOString()
    });
    _saveBonifs(bonifs);
    _toast('🏆 Bonificação salva: ' + nome);
    _renderBonificacoes();
  };

  window._heBonifToggle = function(idx) {
    var bonifs = _getBonifs();
    if (!bonifs[idx]) return;
    bonifs[idx].ativo = !bonifs[idx].ativo;
    _saveBonifs(bonifs);
    _toast(bonifs[idx].ativo ? '▶ Bonificação ativada' : '⏸ Bonificação pausada');
    _renderBonificacoes();
  };

  window._heBonifExcluir = function(idx) {
    var bonifs = _getBonifs();
    if (!bonifs[idx]) return;
    var nome = bonifs[idx].nome;
    bonifs.splice(idx, 1);
    _saveBonifs(bonifs);
    _toast('🗑 Removida: ' + nome);
    _renderBonificacoes();
  };

  // ════════════════════════════════════════════════════════════════
  //  GERAR PDF  (jsPDF)
  // ════════════════════════════════════════════════════════════════
  function _carregarJsPDF(cb) {
    if (window.jspdf && window.jspdf.jsPDF) { cb(window.jspdf.jsPDF); return; }
    if (window.jsPDF) { cb(window.jsPDF); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = function () { cb((window.jspdf && window.jspdf.jsPDF) || window.jsPDF); };
    s.onerror = function () { _toast('❌ Erro ao carregar jsPDF.'); };
    document.head.appendChild(s);
  }

  window._heGerarPDF = function (funcId, inicio, fim) {
    _toast('⏳ Gerando PDF...');
    _carregarJsPDF(function (JsPDF) {
      var dados = _calcularHE(funcId, inicio, fim);
      if (!dados.func || !dados.func.nome) { _toast('❌ Funcionário não encontrado.'); return; }
      _gerarPDF(JsPDF, dados, inicio, fim);
    });
  };

  window._heGerarTodosPDFs = function (inicio, fim) {
    _toast('⏳ Gerando PDFs...');
    _carregarJsPDF(function (JsPDF) {
      var lista = _calcularTodos(inicio, fim).filter(function (r) { return r.totalHorasExtra > 0; });
      if (!lista.length) { _toast('Nenhuma HE a pagar no período.'); return; }

      var abortado = false;
      var progId = 'hePdfProg';
      _closeOverlay(progId);
      var progEl = document.createElement('div');
      progEl.id = progId;
      progEl.style.cssText = 'position:fixed;bottom:24px;right:20px;z-index:999999;' +
        'background:#161410;border:1px solid rgba(201,168,76,.3);border-radius:12px;' +
        'padding:14px 18px;font-family:Outfit,sans-serif;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,.6);';
      progEl.innerHTML =
        '<div style="font-size:.65rem;color:#C9A84C;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;">Gerando PDFs</div>' +
        '<div id="hePdfProgTxt" style="font-size:.82rem;color:#f0ece4;margin-bottom:10px;">0 / ' + lista.length + '</div>' +
        '<button id="hePdfAbort" style="width:100%;padding:8px;border-radius:8px;background:transparent;' +
          'border:1px solid rgba(200,92,92,.4);color:#c85c5c;font-family:Outfit,sans-serif;' +
          'font-size:.78rem;cursor:pointer;">✕ Cancelar</button>';
      document.body.appendChild(progEl);
      document.getElementById('hePdfAbort').onclick = function () {
        abortado = true; _closeOverlay(progId); _toast('⚠️ Cancelado');
      };

      var idx = 0;
      function _prox() {
        if (abortado || idx >= lista.length) {
          _closeOverlay(progId);
          if (!abortado) _toast('✓ ' + lista.length + ' PDF(s) gerado(s)!');
          return;
        }
        var r = lista[idx++];
        var txt = document.getElementById('hePdfProgTxt');
        if (txt) txt.textContent = idx + ' / ' + lista.length + ' — ' + ((r.func && r.func.nome) || '');
        setTimeout(function () { _gerarPDF(JsPDF, r, inicio, fim); _prox(); }, 700);
      }
      _prox();
    });
  };

  function _gerarPDF(JsPDF, dados, inicio, fim) {
    var doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var f = dados.func;
    var pW = 210, mL = 14, mR = 14, cW = pW - mL - mR, y = 18;
    var empNome = (typeof CFG !== 'undefined' && CFG && CFG.emp && CFG.emp.nome) || 'HR Mármores e Granitos';
    var empTel  = (typeof CFG !== 'undefined' && CFG && CFG.emp && CFG.emp.tel)  || '';
    var empCNPJ = (typeof CFG !== 'undefined' && CFG && CFG.emp && CFG.emp.cnpj) || '';

    // Cabeçalho
    doc.setFillColor(12, 10, 3);
    doc.rect(0, 0, pW, 38, 'F');
    doc.setFillColor(201, 168, 76);
    doc.rect(0, 0, pW, 1.5, 'F');

    doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(201, 168, 76);
    doc.text(empNome, mL, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(160, 150, 130);
    var infoEmp = [empCNPJ, empTel].filter(Boolean).join('  ·  ');
    if (infoEmp) doc.text(infoEmp, mL, y + 5);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(220, 210, 190);
    doc.text('RELATÓRIO DE HORAS EXTRAS', pW - mR, y, { align: 'right' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140, 130, 110);
    doc.text('Período: ' + _fmtData(inicio) + ' a ' + _fmtData(fim), pW - mR, y + 5, { align: 'right' });
    doc.text('Emitido em: ' + _fmtHoje(), pW - mR, y + 10, { align: 'right' });
    y = 46;

    // Card funcionário
    doc.setFillColor(28, 24, 6);
    doc.roundedRect(mL, y, cW, 22, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(201, 168, 76);
    doc.text(f.nome || '—', mL + 5, y + 8);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(170, 160, 140);
    doc.text(f.cargo || 'Funcionário', mL + 5, y + 14);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(180, 170, 150);
    doc.text('Salário: ' + _fmtMoeda(f.salario).replace('R$\u00a0', 'R$ '), mL + 5, y + 19);
    doc.text('V/h extra (×' + dados.mult.normal.toFixed(1) + '): ' + _fmtMoeda(dados.valorHoraBase * dados.mult.normal).replace('R$\u00a0', 'R$ '), mL + cW / 2, y + 19);
    y += 30;

    // Tabela de registros
    if (dados.registrosPagar.length > 0) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(201, 168, 76);
      doc.text('HORAS EXTRAS A PAGAR', mL, y); y += 5;

      var cols = [
        { l: 'Data',    x: mL,       w: 24 },
        { l: 'Entrada', x: mL + 24,  w: 18 },
        { l: 'Saída',   x: mL + 42,  w: 18 },
        { l: 'H.Extra', x: mL + 60,  w: 20 },
        { l: 'Tipo',    x: mL + 80,  w: 50 },
        { l: 'Valor',   x: mL + 130, w: 52 }
      ];

      doc.setFillColor(22, 18, 4);
      doc.rect(mL, y, cW, 8, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(201, 168, 76);
      cols.forEach(function (c) { doc.text(c.l, c.x + 2, y + 5.5); });
      y += 8;

      var alt = false;
      dados.registrosPagar.forEach(function (r) {
        if (y > 255) { doc.addPage(); y = 18; }
        if (alt) { doc.setFillColor(16, 13, 2); doc.rect(mL, y, cW, 7, 'F'); }
        alt = !alt;
        var hExtra = parseFloat(r.extra) || 0;
        var aprovado = r._aprovado !== false;

        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
        doc.setTextColor(aprovado ? [220, 215, 200] : [160, 80, 80]);
        doc.text(_fmtData(r.data),  cols[0].x + 2, y + 5);
        doc.text(r.entrada || '—',  cols[1].x + 2, y + 5);
        doc.text(r.saida   || '—',  cols[2].x + 2, y + 5);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(aprovado ? [201, 168, 76] : [160, 80, 80]);
        doc.text(hExtra.toFixed(2) + 'h', cols[3].x + 2, y + 5);
        doc.setFont('helvetica', 'normal'); doc.setTextColor(170, 160, 140);
        doc.text((r._multLabel || _labelTipo(r.tipoExtra, r._multUsado)).replace(/[⚡🗓️⭐☀️🏆]/gu, '').trim(), cols[4].x + 2, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(aprovado ? [201, 168, 76] : [160, 80, 80]);
        doc.text(_fmtMoeda(aprovado ? (r._valorTotalExtra || 0) : 0).replace('R$\u00a0', 'R$ '),
          cols[5].x + cols[5].w - 2, y + 5, { align: 'right' });
        y += 7;
      });
    }

    // Banco de horas
    if (dados.registrosBanco.length > 0) {
      y += 5; if (y > 250) { doc.addPage(); y = 18; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(142, 200, 240);
      doc.text('BANCO DE HORAS — ' + dados.totalHorasBanco.toFixed(2) + 'h (não pago)', mL, y);
      y += 8;
    }

    // Separador
    y += 4; if (y > 255) { doc.addPage(); y = 18; }
    doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.4);
    doc.line(mL, y, pW - mR, y); y += 8;

    // Resumo financeiro — limpo
    function _rl(label, valor, destaque) {
      if (y > 265) { doc.addPage(); y = 18; }
      if (destaque) {
        doc.setFillColor(28, 24, 3);
        doc.rect(mL, y - 4, cW, 10, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
        doc.setTextColor(201, 168, 76);
      } else {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
        doc.setTextColor(170, 160, 140);
      }
      doc.text(label, mL + 5, y + 2);
      doc.text(_fmtMoeda(valor).replace('R$\u00a0', 'R$ '), pW - mR - 5, y + 2, { align: 'right' });
      y += destaque ? 12 : 7;
    }

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(201, 168, 76);
    doc.text('RESUMO FINANCEIRO', mL, y); y += 7;

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(140, 130, 110);
    doc.text('Valor hora base: ' + _fmtMoeda(dados.valorHoraBase).replace('R$\u00a0', 'R$ ') +
      ' · Valor hora extra (×' + dados.mult.normal.toFixed(1) + '): ' +
      _fmtMoeda(dados.valorHoraBase * dados.mult.normal).replace('R$\u00a0', 'R$ '), mL + 5, y);
    y += 8;

    _rl('Total de ' + dados.totalHorasExtra.toFixed(2) + 'h extras no período', dados.totalValorExtra);
    if (dados.totalPago > 0) _rl('Já pago', dados.totalPago);
    _rl('SALDO A PAGAR', Math.max(0, dados.saldo), true);

    // Rodapé
    var np = doc.internal.getNumberOfPages();
    for (var i = 1; i <= np; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(100, 90, 70);
      doc.text(empNome + ' · Horas Extras · ' + _fmtHoje(), mL, 290);
      doc.text('Pág. ' + i + '/' + np, pW - mR, 290, { align: 'right' });
    }

    var nomeArq = 'HorasExtras_' + (f.nome || 'Func').replace(/\s+/g, '_') +
      '_' + (inicio || '').replace(/-/g, '') + '_' + (fim || '').replace(/-/g, '') + '.pdf';
    doc.save(nomeArq);
    _toast('✓ PDF: ' + nomeArq);
  }

  // ── Expõe globalmente ────────────────────────────────────────────
  window.abrirRelatorioHorasExtras = abrirRelatorioHorasExtras;
  window._heGerarPDFFuncionario = window._heGerarPDF; // compatibilidade legado

  console.log('[app-horas-extras-pdf.js v4.0] ✓ Módulo de HE simplificado — sem INSS/FGTS/DSR');

})();
