// ═══════════════════════════════════════════════════════════════════
//  HR MÁRMORES — RELATÓRIO DE HORAS EXTRAS + PDF  v2.1 (CORRIGIDO)
//  Arquivo: app-horas-extras-pdf.js
//  Depende de: app-funcionarios.js (HR_FUNC), jsPDF (carregado via CDN)
//
//  CORREÇÕES v2.1:
//  ✔ Bug 1: Horas com destinoExtra='banco' excluídas do total a pagar
//  ✔ Bug 2: tipoExtra='domingo' agora usa multiplicador ×2.0 (HE100)
//           em vez de cair no ×1.5 incorretamente
//  ✔ Bug 3: Delega para HR_IMPORT.calcSaldoHE (motor unificado) quando
//           disponível; fallback interno corrigido se não estiver
//  ✔ Melhoria: banco de horas exibido separado (informativo) na tabela
//              e no PDF, sem entrar no valor a pagar
// ═══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Constantes de estilo ────────────────────────────────────────
  var GOLD   = '#C9A84C';
  var BG     = 'var(--bg,#111)';
  var S2     = 'var(--s2,#1a1a1a)';
  var BD     = 'var(--bd,#2a2a2a)';
  var T1     = 'var(--t1,#eee)';
  var T2     = 'var(--t2,#bbb)';
  var T3     = 'var(--t3,#888)';
  var BLUE   = '#8ec8f0';

  // ── Helpers ─────────────────────────────────────────────────────
  function _toast(msg) {
    if (typeof toast === 'function') toast(msg);
    else console.log('[HE-PDF]', msg);
  }

  function _fmtMoeda(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function _fmtData(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function _fmtHoje() {
    return _fmtData(new Date().toISOString().slice(0, 10));
  }

  function _mesAtual() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var y = d.getFullYear();
    return y + '-' + (m < 10 ? '0' + m : m);
  }

  function _closeOverlay(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  }

  function _overlay(id, html) {
    _closeOverlay(id);
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:99999;',
      'background:rgba(10,8,0,.96);',
      'display:flex;flex-direction:column;align-items:center;',
      'overflow-y:auto;font-family:Outfit,sans-serif;',
      'padding:20px 0 80px;'
    ].join('');
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  }

  // ── Acesso aos dados ─────────────────────────────────────────────
  function _getFuncionarios() {
    try { return JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); }
    catch (e) { return {}; }
  }

  function _getRegistros() {
    try { return JSON.parse(localStorage.getItem('hr_registros') || '{}'); }
    catch (e) { return {}; }
  }

  function _getPagamentos() {
    try { return JSON.parse(localStorage.getItem('hr_pagamentos') || '{}'); }
    catch (e) { return {}; }
  }

  // ── Multiplicadores de hora extra (lê de CFG ou usa padrão CLT) ──
  function _getMultiplicadores() {
    var def = { normal: 1.5, domingo: 2.0, feriado: 2.0, especial: 3.0 };
    try {
      if (typeof CFG !== 'undefined' && CFG && CFG.he) {
        // Garante que o campo 'domingo' exista (pode faltar em CFGs antigas)
        var he = CFG.he;
        return {
          normal:   parseFloat(he.normal)   || def.normal,
          domingo:  parseFloat(he.domingo)  || def.domingo,
          feriado:  parseFloat(he.feriado)  || def.feriado,
          especial: parseFloat(he.especial) || def.especial
        };
      }
      var stored = JSON.parse(localStorage.getItem('cfg') || '{}');
      if (stored.he) {
        return {
          normal:   parseFloat(stored.he.normal)   || def.normal,
          domingo:  parseFloat(stored.he.domingo)  || def.domingo,
          feriado:  parseFloat(stored.he.feriado)  || def.feriado,
          especial: parseFloat(stored.he.especial) || def.especial
        };
      }
    } catch (e) {}
    return def;
  }

  // ── Rótulo legível do tipo de HE ─────────────────────────────────
  function _labelTipoHE(tipo, destinoExtra) {
    if (destinoExtra === 'banco') return '🏦 Banco';
    switch ((tipo || 'normal').toLowerCase()) {
      case 'feriado':  return '🗓️ Feriado (×2)';
      case 'especial': return '⭐ Especial (×3)';
      case 'domingo':  return '☀️ Domingo (×2)';
      default:         return '⚡ Normal (×1,5)';
    }
  }

  // ════════════════════════════════════════════════════════════════
  //  CÁLCULO PRINCIPAL — _calcularHorasExtras
  //
  //  Delega para HR_IMPORT.calcSaldoHE (motor unificado) quando
  //  disponível. Caso contrário usa fallback interno CORRIGIDO.
  //
  //  Retorna:
  //   {
  //     func, salario, valorHoraBase, valorHoraNormal,
  //     registrosPagar   — registros a pagar (destinoExtra !== 'banco')
  //     registrosBanco   — registros do banco (apenas informativos)
  //     totalHorasExtra  — horas a PAGAR (banco excluído)
  //     totalHorasBanco  — horas no banco (informativo)
  //     totalValorExtra  — valor total a pagar (banco excluído)
  //     totalPago        — pagamentos já efetuados no período
  //     saldo            — totalValorExtra − totalPago
  //     // Breakdown por faixa (disponível quando HR_IMPORT presente)
  //     totalHE50h, valorHE50,
  //     totalHE100h, valorHE100,
  //     totalHE200h, valorHE200
  //   }
  // ════════════════════════════════════════════════════════════════
  function _calcularHorasExtras(funcId, inicio, fim) {
    var funcs = _getFuncionarios();
    var regs  = _getRegistros();
    var pags  = _getPagamentos();
    var mult  = _getMultiplicadores();

    var f = funcs[funcId] || {};
    var salario = parseFloat(f.salario) || 0;

    // Valor/hora real (considera jornada configurada do funcionário)
    var refMes = (inicio || new Date().toISOString()).slice(0, 7);
    var valorHoraBase;
    if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcValorHoraReal === 'function') {
      valorHoraBase = HR_IMPORT.calcValorHoraReal(f, refMes);
    } else {
      valorHoraBase = salario / 220; // fallback CLT 220h
    }

    // ── Separar registros: a pagar × banco ──────────────────────
    var todosComExtra = Object.values(regs).filter(function (r) {
      if (r.funcionarioId !== funcId) return false;
      if (inicio && r.data < inicio) return false;
      if (fim    && r.data > fim)    return false;
      return parseFloat(r.extra) > 0;
    }).sort(function (a, b) { return a.data.localeCompare(b.data); });

    // BUG 1 CORRIGIDO: separa banco de horas antes de calcular valores
    var registrosPagar = todosComExtra.filter(function (r) {
      return r.destinoExtra !== 'banco';
    });
    var registrosBanco = todosComExtra.filter(function (r) {
      return r.destinoExtra === 'banco';
    });

    var totalHorasBanco = registrosBanco.reduce(function (s, r) {
      return s + (parseFloat(r.extra) || 0);
    }, 0);

    // ── Motor de cálculo financeiro ──────────────────────────────
    var totalHorasExtra = 0;
    var totalValorExtra = 0;
    var totalHE50h = 0, valorHE50 = 0;
    var totalHE100h = 0, valorHE100 = 0;
    var totalHE200h = 0, valorHE200 = 0;

    if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcSaldoHE === 'function') {
      // ── Caminho principal: motor unificado (mais preciso) ──────
      var heResult = HR_IMPORT.calcSaldoHE(registrosPagar, f, refMes);
      totalHE50h  = heResult.totalExtra50Min  / 60;
      totalHE100h = heResult.totalExtra100Min / 60;
      totalHE200h = heResult.totalExtra200Min / 60;
      valorHE50   = heResult.valorExtra50;
      valorHE100  = heResult.valorExtra100;
      valorHE200  = heResult.valorExtra200;
      totalHorasExtra = heResult.totalExtraHoras;
      totalValorExtra = heResult.valorTotalExtras;

      // Anota em cada registro o valor calculado (para a tabela/PDF)
      registrosPagar.forEach(function (r) {
        var hExtra = parseFloat(r.extra) || 0;
        var tipo   = (r.tipoExtra || 'normal').toLowerCase();
        var multR  = tipo === 'especial'              ? mult.especial
                   : (tipo === 'feriado' || tipo === 'domingo') ? mult.feriado
                   : mult.normal;
        r._valorHoraUsado    = valorHoraBase * multR;
        r._valorTotalExtra   = hExtra * r._valorHoraUsado;
      });

    } else {
      // ── Fallback interno CORRIGIDO ────────────────────────────
      var valorHoraNormal   = valorHoraBase * mult.normal;   // ×1.5
      var valorHoraDomingo  = valorHoraBase * mult.domingo;  // ×2.0
      var valorHoraFeriado  = valorHoraBase * mult.feriado;  // ×2.0
      var valorHoraEspecial = valorHoraBase * mult.especial; // ×3.0

      registrosPagar.forEach(function (r) {
        var hExtra = parseFloat(r.extra) || 0;
        var tipo   = (r.tipoExtra || 'normal').toLowerCase();

        // BUG 2 CORRIGIDO: 'domingo' usa ×2.0 (HE100), não ×1.5
        var valorH;
        if      (tipo === 'especial') valorH = valorHoraEspecial;
        else if (tipo === 'feriado')  valorH = valorHoraFeriado;
        else if (tipo === 'domingo')  valorH = valorHoraDomingo; // ← CORRIGIDO
        else                          valorH = valorHoraNormal;

        r._valorHoraUsado  = valorH;
        r._valorTotalExtra = hExtra * valorH;
        totalHorasExtra   += hExtra;
        totalValorExtra   += r._valorTotalExtra;

        // Acumula breakdown por faixa
        if (tipo === 'especial') {
          totalHE200h += hExtra; valorHE200 += r._valorTotalExtra;
        } else if (tipo === 'feriado' || tipo === 'domingo') {
          totalHE100h += hExtra; valorHE100 += r._valorTotalExtra;
        } else {
          totalHE50h  += hExtra; valorHE50  += r._valorTotalExtra;
        }
      });
    }

    // ── Pagamentos já efetuados no período ───────────────────────
    var totalPago = Object.values(pags).filter(function (p) {
      if (p.funcionarioId !== funcId) return false;
      if (inicio && p.data < inicio) return false;
      if (fim    && p.data > fim)    return false;
      return true;
    }).reduce(function (s, p) { return s + (parseFloat(p.valor) || 0); }, 0);

    return {
      func:             f,
      salario:          salario,
      valorHoraBase:    valorHoraBase,
      valorHoraNormal:  valorHoraBase * mult.normal,
      // Registros separados por destino
      registrosPagar:   registrosPagar,
      registrosBanco:   registrosBanco,
      // Totais a PAGAR (banco excluído — BUG 1 corrigido)
      totalHorasExtra:  totalHorasExtra,
      totalValorExtra:  totalValorExtra,
      // Banco (apenas informativo)
      totalHorasBanco:  totalHorasBanco,
      // Breakdown por faixa
      totalHE50h: totalHE50h, valorHE50: valorHE50,
      totalHE100h: totalHE100h, valorHE100: valorHE100,
      totalHE200h: totalHE200h, valorHE200: valorHE200,
      // Pagamentos
      totalPago:        totalPago,
      saldo:            totalValorExtra - totalPago
    };
  }

  // ── Calcular resumo de TODOS os funcionários ────────────────────
  function _calcularTodos(inicio, fim) {
    var funcs = _getFuncionarios();
    return Object.values(funcs)
      .filter(function (f) { return f.ativo !== false; })
      .map(function (f) { return _calcularHorasExtras(f.id, inicio, fim); })
      .filter(function (r) { return r.totalHorasExtra > 0 || r.totalHorasBanco > 0; })
      .sort(function (a, b) { return a.func.nome.localeCompare(b.func.nome); });
  }

  // ── Estado do overlay ───────────────────────────────────────────
  var _estado = {
    inicio: _mesAtual() + '-01',
    fim:    new Date().toISOString().slice(0, 10),
    funcId: null
  };

  // ── Abrir relatório ─────────────────────────────────────────────
  function abrirRelatorioHorasExtras() {
    _renderOverlay();
  }

  function _renderOverlay() {
    var funcs = _getFuncionarios();
    var lista = Object.values(funcs).filter(function (f) { return f.ativo !== false; });
    var opsFuncs = [{ v: '', l: 'Todos os funcionários' }].concat(
      lista.sort(function (a, b) { return a.nome.localeCompare(b.nome); })
        .map(function (f) { return { v: f.id, l: f.nome }; })
    );

    var optsHtml = opsFuncs.map(function (o) {
      return '<option value="' + o.v + '"' +
        (o.v === (_estado.funcId || '') ? ' selected' : '') + '>' + o.l + '</option>';
    }).join('');

    var INP = [
      'width:100%;box-sizing:border-box;padding:10px 12px;',
      'border-radius:9px;border:1px solid rgba(201,168,76,.25);',
      'background:rgba(255,255,255,.04);color:var(--t1,#eee);',
      'font-size:.88rem;font-family:Outfit,sans-serif;outline:none;'
    ].join('');

    var resultados = _calcularTodos(_estado.inicio, _estado.fim);
    var totalGeralHoras = resultados.reduce(function (s, r) { return s + r.totalHorasExtra; }, 0);
    var totalGeralValor = resultados.reduce(function (s, r) { return s + r.totalValorExtra; }, 0);
    var totalGeralBanco = resultados.reduce(function (s, r) { return s + r.totalHorasBanco; }, 0);

    // Filtra por funcionário se selecionado
    var exibir = _estado.funcId
      ? resultados.filter(function (r) { return r.func.id === _estado.funcId; })
      : resultados;

    var tabelaHtml = '';
    if (exibir.length === 0) {
      tabelaHtml = '<div style="text-align:center;padding:32px 0;color:' + T3 + ';font-size:.85rem;">Nenhuma hora extra registrada no período.</div>';
    } else {
      tabelaHtml = '<div style="overflow-x:auto;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:.78rem;">' +
          '<thead>' +
            '<tr style="color:' + GOLD + ';font-size:.68rem;letter-spacing:.06em;text-transform:uppercase;">' +
              '<th style="text-align:left;padding:7px 8px;border-bottom:1px solid rgba(201,168,76,.2);">Funcionário</th>' +
              '<th style="text-align:right;padding:7px 8px;border-bottom:1px solid rgba(201,168,76,.2);">Salário Base</th>' +
              '<th style="text-align:right;padding:7px 8px;border-bottom:1px solid rgba(201,168,76,.2);">Valor/h</th>' +
              '<th style="text-align:right;padding:7px 8px;border-bottom:1px solid rgba(201,168,76,.2);">H. a Pagar</th>' +
              '<th style="text-align:right;padding:7px 8px;border-bottom:1px solid rgba(201,168,76,.2);">🏦 Banco</th>' +
              '<th style="text-align:right;padding:7px 8px;border-bottom:1px solid rgba(201,168,76,.2);">Total Extra</th>' +
              '<th style="text-align:center;padding:7px 8px;border-bottom:1px solid rgba(201,168,76,.2);">PDF</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
        exibir.map(function (r) {
          return '<tr style="border-bottom:1px solid rgba(255,255,255,.05);">' +
            '<td style="padding:9px 8px;color:' + T1 + ';font-weight:600;">' + (r.func.nome || '—') + '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:' + T2 + ';">' + _fmtMoeda(r.salario) + '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:' + T3 + ';">' +
              'R$ ' + r.valorHoraNormal.toFixed(2).replace('.', ',') + '/h' +
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;font-weight:700;color:' + GOLD + ';font-size:.9rem;">' +
              r.totalHorasExtra.toFixed(2) + 'h' +
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:' + BLUE + ';font-size:.82rem;">' +
              (r.totalHorasBanco > 0 ? r.totalHorasBanco.toFixed(2) + 'h' : '—') +
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;font-weight:800;color:' + GOLD + ';font-size:.92rem;">' +
              _fmtMoeda(r.totalValorExtra) +
            '</td>' +
            '<td style="padding:9px 8px;text-align:center;">' +
              '<button onclick="window._heGerarPDFFuncionario(\'' + r.func.id + '\',\'' + _estado.inicio + '\',\'' + _estado.fim + '\')" ' +
                'style="background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.4);color:' + GOLD + ';' +
                'border-radius:6px;padding:5px 10px;cursor:pointer;font-size:.72rem;font-family:Outfit,sans-serif;">📄 PDF</button>' +
            '</td>' +
          '</tr>';
        }).join('') +
          '</tbody>' +
          '<tfoot>' +
            '<tr style="background:rgba(201,168,76,.06);">' +
              '<td colspan="3" style="padding:10px 8px;font-size:.72rem;color:' + T3 + ';font-weight:700;text-transform:uppercase;letter-spacing:.06em;">Total Geral</td>' +
              '<td style="padding:10px 8px;text-align:right;font-weight:800;color:' + GOLD + ';font-size:.95rem;">' + totalGeralHoras.toFixed(2) + 'h</td>' +
              '<td style="padding:10px 8px;text-align:right;color:' + BLUE + ';font-size:.85rem;">' + (totalGeralBanco > 0 ? totalGeralBanco.toFixed(2) + 'h' : '—') + '</td>' +
              '<td style="padding:10px 8px;text-align:right;font-weight:800;color:' + GOLD + ';font-size:.95rem;">' + _fmtMoeda(totalGeralValor) + '</td>' +
              '<td></td>' +
            '</tr>' +
          '</tfoot>' +
        '</table>' +
      '</div>';
    }

    // Aviso sobre banco de horas (se houver)
    var avisobancoHtml = totalGeralBanco > 0
      ? '<div style="background:rgba(142,200,240,.06);border:1px solid rgba(142,200,240,.25);border-radius:9px;' +
          'padding:10px 13px;margin-bottom:12px;font-size:.74rem;color:' + BLUE + ';">' +
          '🏦 <strong>' + totalGeralBanco.toFixed(2) + 'h</strong> registradas no banco de horas ' +
          '<span style="color:' + T3 + ';">— não entram no valor a pagar</span>' +
        '</div>'
      : '';

    var html =
      '<div style="width:100%;max-width:640px;padding:0 16px;">' +
        // Cabeçalho
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
          '<div>' +
            '<div style="font-size:.62rem;color:' + GOLD + ';letter-spacing:.14em;text-transform:uppercase;">Horas Extras</div>' +
            '<div style="font-size:1.15rem;font-weight:800;color:' + T1 + ';line-height:1.1;">Relatório de Pagamento</div>' +
          '</div>' +
          '<button onclick="window._heFecharRelatorio()" ' +
            'style="background:none;border:1px solid rgba(201,168,76,.3);color:' + GOLD + ';' +
            'border-radius:6px;padding:7px 14px;cursor:pointer;font-size:.78rem;">✕ Fechar</button>' +
        '</div>' +

        // Filtros
        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:14px;margin-bottom:14px;">' +
          '<div style="font-size:.62rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Filtros</div>' +
          '<div style="margin-bottom:10px;">' +
            '<label style="display:block;font-size:.7rem;color:' + GOLD + ';letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px;">Funcionário</label>' +
            '<select id="heRelFunc" style="' + INP + '">' + optsHtml + '</select>' +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px;">' +
            '<div>' +
              '<label style="display:block;font-size:.7rem;color:' + GOLD + ';letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px;">De</label>' +
              '<input id="heRelInicio" type="date" value="' + (_estado.inicio || '') + '" style="' + INP + '">' +
            '</div>' +
            '<div>' +
              '<label style="display:block;font-size:.7rem;color:' + GOLD + ';letter-spacing:.07em;text-transform:uppercase;margin-bottom:5px;">Até</label>' +
              '<input id="heRelFim" type="date" value="' + (_estado.fim || '') + '" style="' + INP + '">' +
            '</div>' +
          '</div>' +
          '<button onclick="window._heAplicarFiltro()" ' +
            'style="width:100%;padding:11px;border-radius:9px;' +
            'background:linear-gradient(135deg,#1e1800,#0f0c00);' +
            'border:1.5px solid rgba(201,168,76,.5);color:' + GOLD + ';' +
            'font-family:Outfit,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer;">🔍 Filtrar</button>' +
        '</div>' +

        // Aviso banco de horas
        avisobancoHtml +

        // Tabela
        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:14px;margin-bottom:14px;">' +
          '<div style="font-size:.62rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Resultado</div>' +
          tabelaHtml +
        '</div>' +

        // Botão gerar todos
        (exibir.filter(function(r){ return r.totalHorasExtra > 0; }).length > 1
          ? '<button onclick="window._heGerarTodosPDFs(\'' + _estado.inicio + '\',\'' + _estado.fim + '\')" ' +
              'style="width:100%;padding:14px;background:rgba(201,168,76,.1);' +
              'border:1.5px solid rgba(201,168,76,.4);color:' + GOLD + ';' +
              'border-radius:12px;font-family:Outfit,sans-serif;font-size:.9rem;' +
              'font-weight:700;cursor:pointer;letter-spacing:.02em;">' +
              '📋 Gerar PDFs de Todos os Funcionários' +
            '</button>'
          : '') +
      '</div>';

    _overlay('heRelatorio', html);
  }

  // ── Aplicar filtro ───────────────────────────────────────────────
  window._heAplicarFiltro = function () {
    _estado.inicio = (document.getElementById('heRelInicio') || {}).value || '';
    _estado.fim    = (document.getElementById('heRelFim')    || {}).value || '';
    _estado.funcId = (document.getElementById('heRelFunc')   || {}).value || null;
    _closeOverlay('heRelatorio');
    _renderOverlay();
  };

  window._heFecharRelatorio = function () {
    _closeOverlay('heRelatorio');
  };

  // ── Carregar jsPDF dinamicamente ────────────────────────────────
  function _carregarJsPDF(callback) {
    if (window.jspdf && window.jspdf.jsPDF) { callback(window.jspdf.jsPDF); return; }
    if (window.jsPDF) { callback(window.jsPDF); return; }
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    script.onload = function () {
      var JsPDF = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : window.jsPDF;
      callback(JsPDF);
    };
    script.onerror = function () {
      _toast('❌ Erro ao carregar biblioteca PDF. Verifique a internet.');
    };
    document.head.appendChild(script);
  }

  // ── Gerar PDF de um funcionário ─────────────────────────────────
  window._heGerarPDFFuncionario = function (funcId, inicio, fim) {
    _toast('⏳ Gerando PDF...');
    _carregarJsPDF(function (JsPDF) {
      var dados = _calcularHorasExtras(funcId, inicio, fim);
      if (!dados.func || !dados.func.nome) {
        _toast('❌ Funcionário não encontrado.');
        return;
      }
      _gerarPDFComDados(JsPDF, dados, inicio, fim);
    });
  };

  function _gerarPDFComDados(JsPDF, dados, inicio, fim) {
    var doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var f = dados.func;
    var empNome = (typeof CFG !== 'undefined' && CFG && CFG.emp) ? (CFG.emp.nome || 'HR Mármores e Granitos') : 'HR Mármores e Granitos';
    var empTel  = (typeof CFG !== 'undefined' && CFG && CFG.emp) ? (CFG.emp.tel  || '') : '';

    var pW = 210;
    var mL = 14;
    var mR = 14;
    var cW = pW - mL - mR;
    var y  = 18;

    // ─── Cabeçalho ───────────────────────────────────────────────
    doc.setFillColor(15, 12, 0);
    doc.rect(0, 0, pW, 36, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(201, 168, 76);
    doc.text(empNome, mL, y);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(170, 160, 140);
    if (empTel) doc.text(empTel, mL, y + 5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(220, 210, 190);
    doc.text('RELATÓRIO DE HORAS EXTRAS', pW - mR, y, { align: 'right' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(150, 140, 120);
    var periodoLabel = 'Período: ' + _fmtData(inicio) + ' a ' + _fmtData(fim);
    doc.text(periodoLabel, pW - mR, y + 5, { align: 'right' });
    doc.text('Emitido em: ' + _fmtHoje(), pW - mR, y + 9, { align: 'right' });

    y = 44;

    // ─── Dados do Funcionário ────────────────────────────────────
    doc.setFillColor(30, 25, 5);
    doc.roundedRect(mL, y, cW, 26, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(201, 168, 76);
    doc.text(f.nome || '—', mL + 5, y + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(180, 170, 150);
    doc.text(f.cargo || 'Funcionário', mL + 5, y + 14);

    doc.setFontSize(8);
    doc.setTextColor(150, 140, 120);
    doc.setFont('helvetica', 'bold');
    doc.text('Salário base: ' + _fmtMoeda(f.salario), mL + 5, y + 20);
    doc.text('Valor/h extra (50%): ' + _fmtMoeda(dados.valorHoraNormal), mL + cW / 2, y + 20);

    y += 34;

    // ─── Tabela de registros a pagar ──────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(201, 168, 76);
    doc.text('HORAS EXTRAS A PAGAR', mL, y);
    y += 5;

    var cols = [
      { label: 'Data',        x: mL,       w: 28 },
      { label: 'Entrada',     x: mL + 28,  w: 22 },
      { label: 'Saída',       x: mL + 50,  w: 22 },
      { label: 'H. Extra',    x: mL + 72,  w: 22 },
      { label: 'Tipo',        x: mL + 94,  w: 36 },
      { label: 'Valor Extra', x: mL + 130, w: 52 }
    ];

    doc.setFillColor(25, 20, 3);
    doc.rect(mL, y, cW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(201, 168, 76);
    cols.forEach(function (c) { doc.text(c.label, c.x + 2, y + 5.5); });
    y += 8;

    if (dados.registrosPagar.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 140, 120);
      doc.text('Nenhuma hora extra a pagar no período.', mL + 5, y + 7);
      y += 14;
    } else {
      var linhaAlt = false;
      dados.registrosPagar.forEach(function (r) {
        if (y > 255) { doc.addPage(); y = 18; }
        if (linhaAlt) {
          doc.setFillColor(18, 15, 2);
          doc.rect(mL, y, cW, 7, 'F');
        }
        linhaAlt = !linhaAlt;

        var hExtra     = parseFloat(r.extra) || 0;
        var labelTipo  = _labelTipoHE(r.tipoExtra, r.destinoExtra);
        var valorLinha = r._valorTotalExtra || (hExtra * dados.valorHoraNormal);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(220, 215, 200);
        doc.text(_fmtData(r.data),    cols[0].x + 2, y + 5);
        doc.text(r.entrada || '—',    cols[1].x + 2, y + 5);
        doc.text(r.saida   || '—',    cols[2].x + 2, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(201, 168, 76);
        doc.text(hExtra.toFixed(2) + 'h', cols[3].x + 2, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 170, 150);
        doc.text(labelTipo, cols[4].x + 2, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(201, 168, 76);
        doc.text(_fmtMoeda(valorLinha), cols[5].x + cols[5].w - 3, y + 5, { align: 'right' });

        y += 7;

        if (r.producao || r.observacao) {
          var sub = (r.producao ? '📦 ' + r.producao : '') +
                    (r.producao && r.observacao ? '  ' : '') +
                    (r.observacao ? '💬 ' + r.observacao : '');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.5);
          doc.setTextColor(130, 120, 100);
          doc.splitTextToSize(sub, cW - 6).slice(0, 2).forEach(function (line) {
            doc.text(line, mL + 4, y + 3);
            y += 4;
          });
        }
      });
    }

    // ─── Banco de horas (informativo) ────────────────────────────
    if (dados.registrosBanco.length > 0) {
      y += 4;
      if (y > 250) { doc.addPage(); y = 18; }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(142, 200, 240);
      doc.text('🏦 BANCO DE HORAS (INFORMATIVO — NÃO ENTRA NO PAGAMENTO)', mL, y);
      y += 5;

      doc.setFillColor(10, 20, 30);
      doc.rect(mL, y, cW, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(142, 200, 240);
      doc.text('Data', mL + 2, y + 5);
      doc.text('H. no Banco', mL + 60, y + 5);
      y += 7;

      dados.registrosBanco.forEach(function (r) {
        if (y > 255) { doc.addPage(); y = 18; }
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(142, 200, 240, 0.7);
        doc.text(_fmtData(r.data), mL + 2, y + 5);
        doc.text((parseFloat(r.extra) || 0).toFixed(2) + 'h', mL + 60, y + 5);
        y += 6;
      });

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(142, 200, 240);
      doc.text('Total no banco: ' + dados.totalHorasBanco.toFixed(2) + 'h', mL + 2, y + 5);
      y += 10;
    }

    // ─── Linha separadora ─────────────────────────────────────────
    y += 4;
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pW - mR, y);
    y += 6;

    // ─── Resumo financeiro ────────────────────────────────────────
    function _resumoLinha(label, valor, isTotal, cor) {
      if (y > 265) { doc.addPage(); y = 18; }
      if (isTotal) {
        doc.setFillColor(30, 25, 3);
        doc.rect(mL, y - 4, cW, 10, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(201, 168, 76);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        if (cor) {
          var rgb = cor === 'blue' ? [142, 200, 240] : [170, 160, 140];
          doc.setTextColor(rgb[0], rgb[1], rgb[2]);
        } else {
          doc.setTextColor(170, 160, 140);
        }
      }
      doc.text(label, mL + 5, y + 2);
      doc.text(valor, pW - mR - 5, y + 2, { align: 'right' });
      y += isTotal ? 12 : 7;
    }

    // Breakdown por faixa (quando disponível)
    if (dados.totalHE50h > 0)  _resumoLinha('HE Normal (×1,5) — ' + dados.totalHE50h.toFixed(2) + 'h',  _fmtMoeda(dados.valorHE50));
    if (dados.totalHE100h > 0) _resumoLinha('HE Dom/Feriado (×2,0) — ' + dados.totalHE100h.toFixed(2) + 'h', _fmtMoeda(dados.valorHE100));
    if (dados.totalHE200h > 0) _resumoLinha('HE Especial (×3,0) — ' + dados.totalHE200h.toFixed(2) + 'h',    _fmtMoeda(dados.valorHE200));

    _resumoLinha('Total de Horas Extras a Pagar', dados.totalHorasExtra.toFixed(2) + ' h');
    if (dados.totalHorasBanco > 0) {
      _resumoLinha('🏦 Banco de Horas (não pago)', dados.totalHorasBanco.toFixed(2) + ' h', false, 'blue');
    }
    _resumoLinha('Valor das Horas Extras', _fmtMoeda(dados.totalValorExtra));
    if (dados.totalPago > 0) {
      _resumoLinha('Já Pago', '− ' + _fmtMoeda(dados.totalPago));
    }
    _resumoLinha('SALDO A PAGAR', _fmtMoeda(Math.max(0, dados.saldo)), true);

    // ─── Rodapé ───────────────────────────────────────────────────
    var pageCount = doc.internal.getNumberOfPages();
    for (var i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 90, 70);
      doc.text(empNome + ' · Relatório de Horas Extras · ' + _fmtHoje(), mL, 290);
      doc.text('Página ' + i + ' / ' + pageCount, pW - mR, 290, { align: 'right' });
    }

    // ─── Salvar ───────────────────────────────────────────────────
    var nomeArq = 'HorasExtras_' + (f.nome || 'Funcionario').replace(/\s+/g, '_') +
                  '_' + (inicio || '').replace(/-/g, '') +
                  '_' + (fim    || '').replace(/-/g, '') + '.pdf';
    doc.save(nomeArq);
    _toast('✓ PDF gerado: ' + nomeArq);
  }

  // ── Gerar PDFs de todos os funcionários (sequencial) ────────────
  window._heGerarTodosPDFs = function (inicio, fim) {
    _toast('⏳ Gerando PDFs de todos os funcionários...');
    _carregarJsPDF(function (JsPDF) {
      var resultados = _calcularTodos(inicio, fim).filter(function(r){
        return r.totalHorasExtra > 0;
      });
      if (resultados.length === 0) {
        _toast('Nenhum funcionário com horas extras a pagar no período.');
        return;
      }
      var idx = 0;
      function _proximo() {
        if (idx >= resultados.length) {
          _toast('✓ ' + resultados.length + ' PDF(s) gerado(s)!');
          return;
        }
        var r = resultados[idx++];
        setTimeout(function () {
          _gerarPDFComDados(JsPDF, r, inicio, fim);
          _proximo();
        }, 600);
      }
      _proximo();
    });
  };

  // ── Expõe a função principal globalmente ────────────────────────
  window.abrirRelatorioHorasExtras = abrirRelatorioHorasExtras;

  console.log('[app-horas-extras-pdf.js v2.1] ✓ Carregado — Bugs 1/2/3 corrigidos');

})();
