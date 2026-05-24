// ═══════════════════════════════════════════════════════════════════
//  HR MÁRMORES — RELATÓRIO DE HORAS EXTRAS + PDF  v2.0
//  Arquivo: app-horas-extras-pdf.js
//  Depende de: app-funcionarios.js (HR_FUNC), jsPDF (carregado via CDN)
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

  // ── Acesso aos dados via HR_FUNC ou localStorage direto ─────────
  function _getFuncionarios() {
    if (typeof HR_FUNC !== 'undefined') {
      // Acessa via localStorage diretamente (HR_FUNC não expõe getter público)
    }
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

  // ── Multiplicadores de hora extra (lê de CFG ou usa padrão) ────
  function _getMultiplicadores() {
    var def = { normal: 1.5, feriado: 2.0, especial: 3.0 };
    try {
      if (typeof CFG !== 'undefined' && CFG && CFG.he) return CFG.he;
      var stored = JSON.parse(localStorage.getItem('cfg') || '{}');
      if (stored.he) return stored.he;
    } catch (e) {}
    return def;
  }

  // ── Cálculo de horas extras por funcionário num período ─────────
  function _calcularHorasExtras(funcId, inicio, fim) {
    var funcs = _getFuncionarios();
    var regs  = _getRegistros();
    var pags  = _getPagamentos();
    var mult  = _getMultiplicadores();

    var f = funcs[funcId] || {};
    var salario = parseFloat(f.salario) || 0;
    var valorHoraBase    =  salario / 220;                // R$/h sem adicional
    var valorHoraNormal  = valorHoraBase * mult.normal;   // ex: ×1.5
    var valorHoraFeriado = valorHoraBase * mult.feriado;  // ex: ×2.0
    var valorHoraEspecial= valorHoraBase * mult.especial; // ex: ×3.0

    var lista = Object.values(regs).filter(function (r) {
      if (r.funcionarioId !== funcId) return false;
      if (inicio && r.data < inicio) return false;
      if (fim    && r.data > fim)    return false;
      return parseFloat(r.extra) > 0;
    }).sort(function (a, b) { return a.data.localeCompare(b.data); });

    var totalHorasExtra = 0;
    var totalValorExtra = 0;

    lista.forEach(function (r) {
      var hExtra = parseFloat(r.extra) || 0;
      var tipo   = (r.tipoExtra || 'normal').toLowerCase();
      var valorH = tipo === 'feriado'  ? valorHoraFeriado
                 : tipo === 'especial' ? valorHoraEspecial
                 : valorHoraNormal;
      r._valorHoraUsado = valorH;
      r._valorTotalExtra = hExtra * valorH;
      totalHorasExtra += hExtra;
      totalValorExtra += r._valorTotalExtra;
    });

    // Pagamentos já efetuados no período
    var totalPago = Object.values(pags).filter(function (p) {
      if (p.funcionarioId !== funcId) return false;
      if (inicio && p.data < inicio) return false;
      if (fim    && p.data > fim)    return false;
      return true;
    }).reduce(function (s, p) { return s + (parseFloat(p.valor) || 0); }, 0);

    return {
      func:            f,
      salario:         salario,
      valorHoraNormal: valorHoraNormal,
      registros:       lista,
      totalHorasExtra: totalHorasExtra,
      totalValorExtra: totalValorExtra,
      totalPago:       totalPago,
      saldo:           totalValorExtra - totalPago
    };
  }

  // ── Calcular resumo de TODOS os funcionários ────────────────────
  function _calcularTodos(inicio, fim) {
    var funcs = _getFuncionarios();
    return Object.values(funcs)
      .filter(function (f) { return f.ativo !== false; })
      .map(function (f) { return _calcularHorasExtras(f.id, inicio, fim); })
      .filter(function (r) { return r.totalHorasExtra > 0; })
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
              '<th style="text-align:right;padding:7px 8px;border-bottom:1px solid rgba(201,168,76,.2);">H. Extras</th>' +
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
              '<td style="padding:10px 8px;text-align:right;font-weight:800;color:' + GOLD + ';font-size:.95rem;">' + _fmtMoeda(totalGeralValor) + '</td>' +
              '<td></td>' +
            '</tr>' +
          '</tfoot>' +
        '</table>' +
      '</div>';
    }

    var html =
      '<div style="width:100%;max-width:600px;padding:0 16px;">' +
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

        // Tabela
        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:14px;margin-bottom:14px;">' +
          '<div style="font-size:.62rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Resultado</div>' +
          tabelaHtml +
        '</div>' +

        // Botão gerar todos
        (exibir.length > 1
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

    var pW = 210;  // largura A4
    var mL = 14;   // margem esquerda
    var mR = 14;   // margem direita
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
    var cargo = f.cargo || 'Funcionário';
    doc.text(cargo, mL + 5, y + 14);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(150, 140, 120);
    doc.text('Salário base: ' + _fmtMoeda(f.salario), mL + 5, y + 20);
    doc.text('Valor/h extra: ' + _fmtMoeda(dados.valorHoraNormal), mL + cW / 2, y + 20);

    y += 34;

    // ─── Título da tabela ─────────────────────────────────────────
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(201, 168, 76);
    doc.text('REGISTROS DE HORAS EXTRAS', mL, y);
    y += 5;

    // ─── Header da tabela ─────────────────────────────────────────
    var cols = [
      { label: 'Data',       x: mL,      w: 28 },
      { label: 'Entrada',    x: mL + 28, w: 22 },
      { label: 'Saída',      x: mL + 50, w: 22 },
      { label: 'H. Extra',   x: mL + 72, w: 22 },
      { label: 'Tipo',       x: mL + 94, w: 28 },
      { label: 'Valor Extra',x: mL + 122,w: 60 }
    ];

    doc.setFillColor(25, 20, 3);
    doc.rect(mL, y, cW, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(201, 168, 76);
    cols.forEach(function (c) {
      doc.text(c.label, c.x + 2, y + 5.5);
    });
    y += 8;

    // ─── Linhas da tabela ─────────────────────────────────────────
    if (dados.registros.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 140, 120);
      doc.text('Nenhuma hora extra registrada no período.', mL + 5, y + 7);
      y += 14;
    } else {
      var linhaAlt = false;
      dados.registros.forEach(function (r) {
        if (y > 255) {
          doc.addPage();
          y = 18;
        }
        if (linhaAlt) {
          doc.setFillColor(18, 15, 2);
          doc.rect(mL, y, cW, 7, 'F');
        }
        linhaAlt = !linhaAlt;

        var hExtra = parseFloat(r.extra) || 0;
        var tipo   = r.tipoExtra || 'Normal';
        var valorLinha = r._valorTotalExtra || (hExtra * dados.valorHoraNormal);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(220, 215, 200);

        doc.text(_fmtData(r.data),           cols[0].x + 2, y + 5);
        doc.text(r.entrada || '—',           cols[1].x + 2, y + 5);
        doc.text(r.saida   || '—',           cols[2].x + 2, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(201, 168, 76);
        doc.text(hExtra.toFixed(2) + 'h',   cols[3].x + 2, y + 5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(180, 170, 150);
        doc.text(tipo,                        cols[4].x + 2, y + 5);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(201, 168, 76);
        doc.text(_fmtMoeda(valorLinha),       cols[5].x + cols[5].w - 3, y + 5, { align: 'right' });

        y += 7;

        // Produção / obs como sub-linha
        if (r.producao || r.observacao) {
          var sub = (r.producao ? '📦 ' + r.producao : '') +
                    (r.producao && r.observacao ? '  ' : '') +
                    (r.observacao ? '💬 ' + r.observacao : '');
          doc.setFont('helvetica', 'italic');
          doc.setFontSize(6.5);
          doc.setTextColor(130, 120, 100);
          var subLines = doc.splitTextToSize(sub, cW - 6);
          subLines.slice(0, 2).forEach(function (line) {
            doc.text(line, mL + 4, y + 3);
            y += 4;
          });
        }
      });
    }

    // ─── Linha separadora ─────────────────────────────────────────
    y += 4;
    doc.setDrawColor(201, 168, 76);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pW - mR, y);
    y += 6;

    // ─── Resumo financeiro ────────────────────────────────────────
    function _resumoLinha(label, valor, isTotal) {
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
        doc.setTextColor(170, 160, 140);
      }
      doc.text(label, mL + 5, y + 2);
      if (isTotal) {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(201, 168, 76);
      }
      doc.text(valor, pW - mR - 5, y + 2, { align: 'right' });
      y += isTotal ? 12 : 7;
    }

    _resumoLinha('Total de Horas Extras', dados.totalHorasExtra.toFixed(2) + ' h');
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
      var resultados = _calcularTodos(inicio, fim);
      if (resultados.length === 0) {
        _toast('Nenhum funcionário com horas extras no período.');
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

  console.log('[app-horas-extras-pdf.js v2] ✓ Relatório de Horas Extras carregado');

})();
