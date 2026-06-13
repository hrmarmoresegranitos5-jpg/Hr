/**
 * app-relatorio-ponto.js
 * Gerador de Relatório de Ponto — HR Mármores e Granitos
 *
 * Gera um PDF idêntico ao modelo físico da empresa:
 *   • Cabeçalho: funcionário, departamento, salário, escala
 *   • Tabela dia a dia: data | dia | entrada | saída almoço | volta almoço | saída |
 *                       trabalhado | esperado | saldo | valor extra
 *   • Rodapé: resumo financeiro + total a pagar
 *
 * Integração: botão "📄 Relatório de Ponto" no modal de pagamento
 * (app-funcionarios.js — função abrirFormPagamento)
 *
 * Depende de: jsPDF (já carregado como window.jspdf.jsPDF no projeto)
 *             HR_IMPORT.calcSaldoHE
 *             HR_FUNC.getFuncionarios / getRegistros / getPagamentos
 */

var HR_RELATORIO_PONTO = (function () {
  'use strict';

  // ─── Helpers ────────────────────────────────────────────────────────────────

  function _fmtMoeda(v) {
    return 'R$ ' + parseFloat(v || 0).toFixed(2).replace('.', ',');
  }

  function _fmtMin(min) {
    var neg = min < 0;
    var abs = Math.abs(Math.round(min));
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    return (neg ? '-' : '') + String(h).padStart(2, '0') + 'h' + String(m).padStart(2, '0') + 'm';
  }

  function _fmtHoras(h) {
    var min = Math.round(Math.abs(parseFloat(h) || 0) * 60);
    var hh = Math.floor(min / 60);
    var mm = min % 60;
    return String(hh).padStart(2, '0') + 'h' + String(mm).padStart(2, '0') + 'm';
  }

  var DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  var DIAS_NUM    = ['1ª',  '2ª',  '3ª',  '4ª',  '5ª',  '6ª',  'Sáb'];
  var MESES_PT    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                     'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function _dow(dataISO) {
    return new Date(dataISO + 'T12:00:00').getDay(); // 0=dom
  }

  function _labelDia(dow) {
    // Retorna "2ª", "Sáb", "Dom" etc
    if (dow === 0) return 'Dom';
    if (dow === 6) return 'Sáb';
    return dow + 'ª';
  }

  function _mesExtenso(di, df) {
    var d = new Date(di + 'T12:00:00');
    return MESES_PT[d.getMonth()] + ' / ' + d.getFullYear();
  }

  function _fmtData(iso) {
    // "2026-06-01" → "01/06"
    return iso.slice(8, 10) + '/' + iso.slice(5, 7);
  }

  function _hhmm2min(s) {
    if (!s || s === '—' || s === '-') return null;
    var p = (s || '').split(':').map(Number);
    if (p.length < 2 || isNaN(p[0]) || isNaN(p[1])) return null;
    return p[0] * 60 + p[1];
  }

  // ─── Monta linhas da tabela ──────────────────────────────────────────────────

  function _montarLinhas(meusRegs, f, di, df) {
    // Jornada esperada: configurável via f.jornadaDiariaMin ou padrão 8h/dia-útil, 4h/sáb
    var jornDia = f.jornadaDiariaMin ? parseInt(f.jornadaDiariaMin) : 480;
    var jornSab = 240; // 4h sábado — padrão marmoraria

    // Indexa registros por data para acesso O(1)
    var regPorData = {};
    meusRegs.forEach(function (r) { regPorData[r.data] = r; });

    // Percorre todos os dias do período
    var linhas = [];
    var dAtual = new Date(di + 'T12:00:00');
    var dFim   = new Date(df + 'T12:00:00');

    while (dAtual <= dFim) {
      var iso = dAtual.toISOString().slice(0, 10);
      var dow = dAtual.getDay();
      var r   = regPorData[iso] || null;

      // Jornada esperada para esse dia
      var esperadoMin;
      if (dow === 0) {
        esperadoMin = 0; // domingo = folga
      } else if (dow === 6) {
        esperadoMin = jornSab;
      } else {
        esperadoMin = jornDia;
      }

      if (r) {
        var trabMin     = Math.round((parseFloat(r.horas) || 0) * 60);
        var extraMin    = Math.round((parseFloat(r.extra) || 0) * 60);
        var saldoMin    = trabMin - esperadoMin;

        // Valor extra financeiro do dia
        var salario     = parseFloat(f.salario) || 0;
        var hMes        = 192; // padrão
        var valorHora   = salario / hMes;

        var valorExtra  = 0;
        if (extraMin > 0 && r.destinoExtra !== 'banco') {
          // Tipo: dobrada (×2) ou triplicada (×3)
          var tipoHE = r.tipoExtra || 'normal';
          var mult   = (tipoHE === 'especial' || tipoHE === 'feriado' || tipoHE === 'domingo')
                       ? 3.0 : 2.0;
          valorExtra = (extraMin / 60) * mult * valorHora;
        }

        // Observação do dia
        var obs = '';
        if (r.tipo === 'feriado')      obs = 'feriado';
        else if (r.tipo === 'acordo')  obs = 'acordo';
        else if (r.autoCompletado)     obs = 'incompleto';
        else if (r.tipo === 'folga_banco') obs = 'folga banco';

        linhas.push({
          data:       iso,
          diaTxt:     _labelDia(dow),
          entrada:    r.entrada    || '—',
          saidaAlm:   r.saidaAlmoco  || '—',
          voltaAlm:   r.voltaAlmoco  || '—',
          saida:      r.saida      || '—',
          trabMin:    trabMin,
          esperadoMin:esperadoMin,
          saldoMin:   saldoMin,
          valorExtra: valorExtra,
          extraMin:   extraMin,
          tipoHE:     r.tipoExtra  || 'normal',
          obs:        obs,
          tipo:       r.tipo       || 'normal',
          autoComp:   !!r.autoCompletado,
          destinoBanco: r.destinoExtra === 'banco',
        });
      } else if (dow !== 0) {
        // Dia sem registro (ausência) — só inclui se dia útil
        linhas.push({
          data:       iso,
          diaTxt:     _labelDia(dow),
          entrada:    '—',
          saidaAlm:   '—',
          voltaAlm:   '—',
          saida:      '—',
          trabMin:    0,
          esperadoMin:esperadoMin,
          saldoMin:   -esperadoMin,
          valorExtra: 0,
          extraMin:   0,
          tipoHE:     'normal',
          obs:        '',
          tipo:       'ausente',
          autoComp:   false,
          destinoBanco: false,
        });
      }

      dAtual.setDate(dAtual.getDate() + 1);
    }

    return linhas;
  }

  // ─── Gerador PDF principal ───────────────────────────────────────────────────

  function gerarPDF(funcId, di, df) {
    // Coleta dados
    var funcs  = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getFuncionarios() : {};
    var regs   = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getRegistros()    : {};
    var pags   = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getPagamentos()   : {};
    var f      = funcs[funcId] || {};

    if (!f.nome) { alert('Funcionário não encontrado.'); return; }

    var salario    = parseFloat(f.salario) || 0;
    var hMes       = 192;
    var valorHora  = salario / hMes;

    // Registros do período
    var meusRegs = Object.values(regs).filter(function (r) {
      return r.funcionarioId === funcId && r.data >= di && r.data <= df;
    });

    // Pagamentos do período
    var meusPags = Object.values(pags).filter(function (p) {
      return p.funcionarioId === funcId && p.data >= di && p.data <= df;
    });

    // Linhas da tabela
    var linhas = _montarLinhas(meusRegs, f, di, df);

    // Totais
    var totalTrabMin  = 0, totalEsperadoMin = 0, totalSaldoMin = 0;
    var totalExtraMin50 = 0, totalExtraMin200 = 0;
    var totalValorExtra = 0, totalDeficitMin = 0;

    linhas.forEach(function (l) {
      totalTrabMin      += l.trabMin;
      totalEsperadoMin  += l.esperadoMin;
      totalSaldoMin     += l.saldoMin;
      totalValorExtra   += l.valorExtra;
      if (l.saldoMin < 0) totalDeficitMin += l.saldoMin;
      if (l.extraMin > 0 && !l.destinoBanco) {
        var isTrip = (l.tipoHE === 'especial' || l.tipoHE === 'feriado' || l.tipoHE === 'domingo');
        if (isTrip) totalExtraMin200 += l.extraMin;
        else        totalExtraMin50  += l.extraMin;
      }
    });

    var totalExtraMin  = totalExtraMin50 + totalExtraMin200;
    var totalPago      = meusPags.reduce(function(s, p){ return s + (parseFloat(p.valor)||0); }, 0);
    var saldoLiqExtra  = totalValorExtra; // extras do período
    var totalAPagar    = salario + saldoLiqExtra - totalPago;

    // ── jsPDF ──
    var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDF) { alert('jsPDF não carregado. Verifique se a biblioteca está incluída.'); return; }

    var doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pW = 210, pH = 297;
    var mL = 12, mR = 12;
    var cW = pW - mL - mR; // 186mm

    // ── Fontes e cores ──
    var COR_HEADER   = [26, 54, 93];    // azul escuro
    var COR_GOLD     = [185, 140, 50];
    var COR_VERDE    = [50, 140, 80];
    var COR_VERM     = [180, 60, 60];
    var COR_CINZA    = [180, 180, 180];
    var COR_TH_BG    = [235, 240, 248];
    var COR_LINHA_AL = [240, 248, 240]; // verde claro — horas extras
    var COR_LINHA_VM = [255, 242, 242]; // vermelho claro — déficit
    var COR_LINHA_AM = [255, 252, 230]; // amarelo — incompleto

    var y = 0;

    // ── CABEÇALHO ────────────────────────────────────────────────────────────
    // Faixa título
    doc.setFillColor.apply(doc, COR_HEADER);
    doc.rect(0, 0, pW, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('RELATÓRIO DE PONTO', pW / 2, 11, { align: 'center' });

    // Período
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 215, 240);
    doc.text('Mês de Referência: ' + _mesExtenso(di, df), pW / 2, 16, { align: 'center' });

    y = 22;

    // Linha dados do funcionário
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('Funcionário: ' + (f.nome || ''), mL, y);

    doc.setFont('helvetica', 'normal');
    var depto = f.equipe || f.cargo || 'Marmoraria';
    doc.text('Departamento: ' + depto, pW / 2 - 10, y);
    doc.text('Salário: ' + _fmtMoeda(salario) + ' mensais', pW - mR, y, { align: 'right' });

    y += 4.5;
    // Escala
    var hrEnt = f.horarioEntrada || '07:00';
    var hrSai = f.horarioSaida   || '17:00';
    var escalaTxt = 'Escala: Seg-Sex ' + hrEnt + '-12:00 / 14:00-' + hrSai + ' | Sáb 07:00-11:00';
    doc.setFontSize(7.5);
    doc.setTextColor(80, 80, 80);
    doc.text(escalaTxt, mL, y);

    var pagForma = (meusPags.length > 0 && meusPags[0].forma)
      ? meusPags[0].forma : 'semanal';
    doc.text('Pagamentos: ' + pagForma + ' — pagamento toda sexta', pW / 2, y);

    y += 3;
    // Linha separadora
    doc.setDrawColor.apply(doc, COR_HEADER);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pW - mR, y);

    y += 4;

    // ── TABELA ───────────────────────────────────────────────────────────────
    // Colunas: Data | Dia | Entrada | Saída Alm. | Volta Alm. | Saída | Trabalhado | Esperado | Saldo | Valor Extra
    var cols = [
      { header: 'Data',        w: 13, align: 'center' },
      { header: 'Dia',         w: 9,  align: 'center' },
      { header: 'Entrada',     w: 17, align: 'center' },
      { header: 'Saída\nAlmoço', w: 17, align: 'center' },
      { header: 'Volta\nAlmoço', w: 17, align: 'center' },
      { header: 'Saída',       w: 17, align: 'center' },
      { header: 'Trabalhado',  w: 22, align: 'center' },
      { header: 'Esperado',    w: 20, align: 'center' },
      { header: 'Saldo',       w: 20, align: 'center' },
      { header: 'Valor Extra', w: 28, align: 'right'  },
    ];

    // Ajusta larguras para preencher cW exato
    var totalW = cols.reduce(function(s, c){ return s + c.w; }, 0);
    var diff   = cW - totalW;
    cols[cols.length - 1].w += diff; // distribui no último

    // Xs de cada coluna
    var colX = [];
    var cx = mL;
    cols.forEach(function(c){ colX.push(cx); cx += c.w; });

    var rowH  = 5.2;   // altura linha de dado
    var thH   = 7.5;   // altura cabeçalho (2 linhas)

    // Cabeçalho da tabela
    doc.setFillColor.apply(doc, COR_TH_BG);
    doc.rect(mL, y, cW, thH, 'F');
    doc.setDrawColor(180, 190, 210);
    doc.setLineWidth(0.2);
    doc.rect(mL, y, cW, thH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(30, 50, 90);

    cols.forEach(function(c, i) {
      var lines = c.header.split('\n');
      var tx = colX[i] + (c.align === 'right' ? c.w - 1.5 : c.align === 'center' ? c.w / 2 : 1.5);
      var baseY = y + (lines.length === 2 ? 3 : 4.8);
      lines.forEach(function(line, li) {
        doc.text(line, tx, baseY + li * 3, { align: c.align === 'right' ? 'right' : c.align });
      });
    });

    y += thH;

    // Linhas de dados
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);

    linhas.forEach(function (l, idx) {
      // Quebra de página
      if (y + rowH > pH - 55) {
        doc.addPage();
        y = 12;
        // Repete cabeçalho da tabela
        doc.setFillColor.apply(doc, COR_TH_BG);
        doc.rect(mL, y, cW, thH, 'F');
        doc.setDrawColor(180, 190, 210);
        doc.rect(mL, y, cW, thH, 'S');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(30, 50, 90);
        cols.forEach(function(c, i) {
          var lines = c.header.split('\n');
          var tx = colX[i] + (c.align === 'right' ? c.w - 1.5 : c.align === 'center' ? c.w / 2 : 1.5);
          var baseY = y + (lines.length === 2 ? 3 : 4.8);
          lines.forEach(function(line, li) {
            doc.text(line, tx, baseY + li * 3, { align: c.align === 'right' ? 'right' : c.align });
          });
        });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        y += thH;
      }

      // Cor de fundo da linha
      if (l.extraMin > 0 && !l.destinoBanco) {
        doc.setFillColor.apply(doc, COR_LINHA_AL);
        doc.rect(mL, y, cW, rowH, 'F');
      } else if (l.saldoMin < -5) {
        doc.setFillColor.apply(doc, COR_LINHA_VM);
        doc.rect(mL, y, cW, rowH, 'F');
      } else if (l.autoComp) {
        doc.setFillColor.apply(doc, COR_LINHA_AM);
        doc.rect(mL, y, cW, rowH, 'F');
      } else if (idx % 2 === 0) {
        doc.setFillColor(252, 252, 252);
        doc.rect(mL, y, cW, rowH, 'F');
      }

      // Borda linha
      doc.setDrawColor(210, 215, 220);
      doc.setLineWidth(0.1);
      doc.line(mL, y + rowH, mL + cW, y + rowH);

      var cy = y + rowH - 1.5;

      // Cor do texto por status
      var corTexto = [40, 40, 40];
      if (l.tipo === 'ausente')           corTexto = [180, 60,  60];
      else if (l.autoComp)                corTexto = [160, 120, 20];
      doc.setTextColor.apply(doc, corTexto);

      // Células de texto
      var cells = [
        _fmtData(l.data),
        l.diaTxt,
        l.entrada,
        l.saidaAlm,
        l.voltaAlm,
        l.saida,
        _fmtMin(l.trabMin),
        l.esperadoMin > 0 ? _fmtMin(l.esperadoMin) : '—',
        l.saldoMin !== 0 ? _fmtMin(l.saldoMin) : '00h00m',
        l.valorExtra > 0 ? _fmtMoeda(l.valorExtra) : (l.saldoMin < 0 ? ('R$ ' + Math.abs(l.saldoMin/60 * valorHora).toFixed(2).replace('.',',') + ' *') : '—'),
      ];

      cells.forEach(function (txt, i) {
        var c = cols[i];
        var tx = colX[i] + (c.align === 'right' ? c.w - 1.5 : c.align === 'center' ? c.w / 2 : 1.5);

        // Cor especial para saldo positivo/negativo
        if (i === 8) {
          if (l.saldoMin > 0)      doc.setTextColor(40, 130, 70);
          else if (l.saldoMin < 0) doc.setTextColor(180, 60, 60);
          else                     doc.setTextColor(130, 130, 130);
        }
        if (i === 9 && l.valorExtra > 0) {
          doc.setTextColor(40, 130, 70);
        }

        doc.text(txt, tx, cy, { align: c.align === 'right' ? 'right' : c.align });
        doc.setTextColor.apply(doc, corTexto);
      });

      y += rowH;
    });

    // ── OBSERVAÇÕES ──────────────────────────────────────────────────────────
    y += 2;
    var obsLinhas = [];
    linhas.forEach(function(l) {
      if (l.tipo === 'feriado')          obsLinhas.push('•' + _fmtData(l.data) + ': feriado');
      else if (l.tipo === 'acordo')      obsLinhas.push('•' + _fmtData(l.data) + ': acordo — não trabalhado');
      else if (l.autoComp)               obsLinhas.push('•' + _fmtData(l.data) + ': horário incompleto (autocomplete)');
    });

    if (obsLinhas.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      doc.text('Observações: ' + obsLinhas.join(' | '), mL, y);
      y += 4;
    }

    // ── RODAPÉ FINANCEIRO ────────────────────────────────────────────────────
    if (y + 45 > pH - 10) { doc.addPage(); y = 15; }

    y += 2;
    doc.setDrawColor.apply(doc, COR_CINZA);
    doc.setLineWidth(0.3);
    doc.line(mL, y, pW - mR, y);
    y += 4;

    // Resumo em duas colunas
    var col1X = mL + 2, col2X = pW / 2 + 5;
    var ry = y;

    // Coluna esquerda — taxas
    function _rfLinha(label, valor, cor) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor.apply(doc, cor || [30, 30, 30]);
      doc.text(label, col1X, ry);
      doc.setFont('helvetica', 'normal');
      doc.text(valor, col1X + 75, ry, { align: 'right' });
      ry += 5;
    }
    _rfLinha('Valor hora normal:',
      _fmtMoeda(valorHora) + '/hora', [60, 60, 60]);
    if (totalExtraMin200 > 0) {
      _rfLinha('Valor hora extra (3x):',
        _fmtMoeda(valorHora * 3) + '/hora (3x)', [60, 60, 60]);
    }
    _rfLinha('Total déficit:',
      totalDeficitMin < 0 ? _fmtMin(totalDeficitMin) : '—', [160, 60, 60]);

    // Coluna direita — totais
    var ry2 = y;
    function _rfDir(label, valor, cor) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor.apply(doc, [60, 60, 60]);
      doc.text(label, col2X, ry2);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor.apply(doc, cor || [30, 30, 30]);
      doc.text(valor, pW - mR, ry2, { align: 'right' });
      ry2 += 5;
    }
    var totalExtraHMin = (totalExtraMin50 + totalExtraMin200);
    _rfDir('Total horas extras:', _fmtMin(totalExtraHMin));
    _rfDir('Valor total extras:',  _fmtMoeda(totalValorExtra), COR_VERDE);
    _rfDir('Saldo líquido extras:', _fmtMoeda(saldoLiqExtra),  COR_VERDE);

    y = Math.max(ry, ry2) + 3;

    // Linha separadora
    doc.setDrawColor.apply(doc, COR_CINZA);
    doc.line(mL, y, pW - mR, y);
    y += 5;

    // Blocos de resumo final
    function _blocoFim(label, valor, fundo, corTxt, destaque) {
      var bH = destaque ? 9 : 7;
      doc.setFillColor.apply(doc, fundo);
      doc.rect(mL, y, cW, bH, 'F');
      doc.setFont('helvetica', destaque ? 'bold' : 'normal');
      doc.setFontSize(destaque ? 9.5 : 8);
      doc.setTextColor.apply(doc, corTxt);
      doc.text(label, mL + 3, y + bH - 2);
      doc.text(valor, pW - mR, y + bH - 2, { align: 'right' });
      y += bH + 1;
    }

    _blocoFim('Salário (' + _fmtData(df) + '):', _fmtMoeda(salario),
      [245, 248, 250], [30, 30, 30], false);
    if (saldoLiqExtra > 0) {
      _blocoFim('Saldo líquido extras (' + _mesExtenso(di, df).split('/')[0].trim() + '):', _fmtMoeda(saldoLiqExtra),
        [240, 250, 240], [30, 100, 50], false);
    }
    if (totalPago > 0) {
      _blocoFim('Já pago no período:', '- ' + _fmtMoeda(totalPago),
        [250, 242, 242], [140, 50, 50], false);
    }

    // Total destacado
    doc.setFillColor.apply(doc, COR_HEADER);
    var tH = 10;
    doc.rect(mL, y, cW, tH, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('TOTAL A PAGAR HOJE — ' + _fmtData(df) + '/' + di.slice(0, 4),
      mL + 3, y + tH - 3);
    doc.text(_fmtMoeda(Math.max(0, totalAPagar)), pW - mR, y + tH - 3, { align: 'right' });
    y += tH + 5;

    // Legenda de cores
    function _legItem(cor, txt) { return { cor: cor, txt: txt }; }
    var legItems = [
      { cor: COR_HEADER,   txt: 'Fundo azul = período do pagamento atual' },
      { cor: [200, 180, 80], txt: 'Amarelo = ponto incompleto' },
      { cor: [50, 150, 70],  txt: 'Verde = horas extras' },
      { cor: [180, 60, 60],  txt: 'Vermelho = déficit (nao descontado)' },
    ];
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    var lx = mL;
    legItems.forEach(function(item) {
      doc.setFillColor.apply(doc, item.cor);
      doc.rect(lx, y, 3, 3, 'F');
      doc.setTextColor(60, 60, 60);
      doc.text(item.txt, lx + 4.5, y + 2.5);
      lx += 48;
    });

    y += 8;

    // Rodapé
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(6);
    var agora = new Date();
    var dtGer = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    doc.text('Documento gerado em ' + dtGer + ' · HR Mármores e Granitos',
      pW / 2, y, { align: 'center' });

    // ── Download ──────────────────────────────────────────────────────────────
    var nomeFmt = (f.nome || 'func').replace(/\s+/g, '_').toLowerCase();
    var mesFmt  = di.slice(0, 7).replace('-', '');
    doc.save('relatorio_ponto_' + nomeFmt + '_' + mesFmt + '.pdf');
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  return {
    gerarPDF: gerarPDF,
  };

})();
