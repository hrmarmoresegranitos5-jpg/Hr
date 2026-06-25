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

    // ── Carrega exceções globais (feriados, acordos, declarados) ──────────────
    var excPorData = {};
    try {
      var excsRaw = JSON.parse(localStorage.getItem('hr_excecoes') || '{}');
      Object.values(excsRaw).forEach(function(e) {
        if (e.data >= di && e.data <= df) excPorData[e.data] = e;
      });
    } catch(e) {}

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
      var exc = excPorData[iso] || null;

      // Jornada esperada para esse dia
      var esperadoMin;
      if (dow === 0) {
        esperadoMin = 0; // domingo = folga
      } else if (dow === 6) {
        esperadoMin = jornSab;
      } else {
        esperadoMin = jornDia;
      }

      // ── Aplica exceção ao esperado ─────────────────────────────────────────
      // Feriado dia todo → jornada = 0 (não é falta, não conta déficit)
      // Feriado meio período → jornada = metade (trabalhou só de manhã)
      // Acordo → jornada = 0 (saldo livre pelos horários reais)
      var tipoLinha = r ? (r.tipo || 'normal') : 'ausente';
      var obsExcecao = '';
      if (exc) {
        if (exc.tipo === 'feriado') {
          if (exc.meioperiodo) {
            // Meio período: desconta metade da jornada esperada
            esperadoMin = Math.round(esperadoMin / 2);
            obsExcecao = 'feriado meio período' + (exc.descricao ? ' — ' + exc.descricao : '');
          } else {
            // Dia todo: jornada zero, não é falta
            esperadoMin = 0;
            obsExcecao = 'feriado' + (exc.descricao ? ' — ' + exc.descricao : '');
          }
          tipoLinha = 'feriado';
        } else if (exc.tipo === 'acordo') {
          esperadoMin = 0;
          tipoLinha = 'acordo';
          obsExcecao = 'acordo' + (exc.descricao ? ' — ' + exc.descricao : '');
        } else if (exc.tipo === 'declarado') {
          // Declarado: jornada normal, mas usa horários da exceção se não há registro
          obsExcecao = 'declarado' + (exc.descricao ? ' — ' + exc.descricao : '');
        }
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
        // Detecta automaticamente o multiplicador:
        // ×3 → sábado, domingo ou feriado  |  ×2 → dia útil normal
        var _ehTriplado = (dow === 0 || dow === 6) || (exc && exc.tipo === 'feriado');
        var tipoHE = _ehTriplado ? 'especial' : 'normal';
        if (extraMin > 0 && r.destinoExtra !== 'banco') {
          var mult = _ehTriplado ? 3.0 : 2.0;
          valorExtra = (extraMin / 60) * mult * valorHora;
        }

        // Observação do dia (prioriza exceção, depois dados do registro)
        var obs = obsExcecao;
        if (!obs) {
          if (r.tipo === 'feriado')         obs = 'feriado';
          else if (r.tipo === 'acordo')     obs = 'acordo';
          else if (r.autoCompletado)        obs = 'incompleto';
          else if (r.tipo === 'folga_banco') obs = 'folga banco';
        }

        linhas.push({
          data:       iso,
          diaTxt:     _labelDia(dow),
          entrada:    r.entrada       || '—',
          saidaAlm:   r.saidaAlmoco  || '—',
          voltaAlm:   r.voltaAlmoco  || '—',
          saida:      r.saida        || '—',
          trabMin:    trabMin,
          esperadoMin:esperadoMin,
          saldoMin:   saldoMin,
          valorExtra: valorExtra,
          extraMin:   extraMin,
          tipoHE:     tipoHE,
          obs:        obs,
          tipo:       tipoLinha,
          autoComp:   !!r.autoCompletado,
          destinoBanco: r.destinoExtra === 'banco',
          excDescricao: exc ? (exc.descricao || '') : '',
        });
      } else if (dow !== 0) {
        // Dia sem registro
        // Se feriado dia todo ou acordo → não conta como ausência
        var ehFolga = exc && (
          (exc.tipo === 'feriado' && !exc.meioperiodo) ||
          exc.tipo === 'acordo'
        );
        // Se declarado sem registro → usa horários da exceção (opcional)
        var entDecl = (exc && exc.tipo === 'declarado' && exc.horEntrada) ? exc.horEntrada : '—';
        var saiDecl = (exc && exc.tipo === 'declarado' && exc.horSaida)   ? exc.horSaida  : '—';

        linhas.push({
          data:       iso,
          diaTxt:     _labelDia(dow),
          entrada:    entDecl,
          saidaAlm:   '—',
          voltaAlm:   '—',
          saida:      saiDecl,
          trabMin:    0,
          esperadoMin:esperadoMin,
          // Feriado/acordo sem registro → saldo 0 (não é déficit)
          saldoMin:   ehFolga ? 0 : -esperadoMin,
          valorExtra: 0,
          extraMin:   0,
          tipoHE:     'normal',
          obs:        obsExcecao,
          tipo:       tipoLinha,
          autoComp:   false,
          destinoBanco: false,
          excDescricao: exc ? (exc.descricao || '') : '',
        });
      }

      dAtual.setDate(dAtual.getDate() + 1);
    }

    return linhas;
  }

  // ─── Carregamento dinâmico das libs ─────────────────────────────────────────

  function _loadLibs(cb) {
    // Garante html2canvas + jsPDF
    function loadJsPDF(next) {
      if ((window.jspdf && window.jspdf.jsPDF) || window.jsPDF) { next(); return; }
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = next;
      s.onerror = function(){ if(typeof toast==='function') toast('Erro ao carregar jsPDF'); };
      document.head.appendChild(s);
    }
    if (typeof html2canvas !== 'undefined') { loadJsPDF(cb); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = function(){ loadJsPDF(cb); };
    s.onerror = function(){ if(typeof toast==='function') toast('Erro ao carregar html2canvas'); };
    document.head.appendChild(s);
  }

  function _loadJsPDF(cb) {
    var J = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (J) { cb(J); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = function () {
      var J2 = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (J2) cb(J2);
      else { if (typeof toast === 'function') toast('Erro ao carregar jsPDF'); }
    };
    s.onerror = function () { if (typeof toast === 'function') toast('Erro ao carregar jsPDF'); };
    document.head.appendChild(s);
  }

  // ─── Overlay de preview (html2canvas → imagem, igual ao contrato) ────────────

  function _abrirOverlayPonto(htmlRelatorio, pdfBlobFn, fileName, nomeFunc, mesRef, telFunc) {
    var GOLD = '#C9A84C', GOLDB = 'rgba(201,168,76,.55)';

    var old = document.getElementById('hrPontoPDFOverlay');
    if (old) old.remove();

    var ov = document.createElement('div');
    ov.id = 'hrPontoPDFOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#111;display:flex;flex-direction:column;';

    var temShare = !!navigator.share;
    var bar = document.createElement('div');
    bar.style.cssText = 'display:flex;align-items:center;gap:8px;padding:10px 13px;background:#0f0c00;border-bottom:1px solid '+GOLDB+';flex-shrink:0;flex-wrap:wrap;';
    bar.innerHTML =
      '<span style="flex:1;font-size:.73rem;color:'+GOLD+';font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📋 '+nomeFunc+' · '+mesRef+'</span>'+
      '<button id="hrPontoClose" style="background:transparent;border:1px solid rgba(201,168,76,.35);color:rgba(201,168,76,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">✕</button>'+
      '<button id="hrPontoDown" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">⏳ PDF...</button>'+
      (temShare ? '<button id="hrPontoWpp" disabled style="background:#0d1f12;border:1px solid rgba(37,211,102,.25);color:rgba(37,211,102,.4);padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">💬 WhatsApp</button>' : '');

    var preview = document.createElement('div');
    preview.style.cssText = 'flex:1;overflow-y:auto;background:#444;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
    preview.innerHTML = '<div style="text-align:center;color:#C9A84C;padding:60px 20px;font-family:Outfit,sans-serif;font-size:.85rem;letter-spacing:.5px;">⏳ Gerando visualização, aguarde...</div>';

    ov.appendChild(bar);
    ov.appendChild(preview);
    document.body.appendChild(ov);

    document.getElementById('hrPontoClose').onclick = function(){ ov.remove(); };

    // Render off-screen HTML → canvas → imagem
    var offscreen = document.createElement('div');
    offscreen.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:#fff;z-index:-1;';
    offscreen.innerHTML = htmlRelatorio;
    document.body.appendChild(offscreen);

    var pdfBlobRef = null;

    function _enableButtons() {
      var btnDown = document.getElementById('hrPontoDown');
      var btnWpp  = document.getElementById('hrPontoWpp');
      if (btnDown) {
        btnDown.innerHTML = '⬇ Salvar PDF';
        btnDown.disabled = false;
        btnDown.style.color = GOLD;
        btnDown.style.borderColor = GOLDB;
        btnDown.onclick = function(){
          if (!pdfBlobRef) { if(typeof toast==='function') toast('PDF ainda gerando...'); return; }
          var url = URL.createObjectURL(pdfBlobRef);
          var a = document.createElement('a'); a.href = url; a.download = fileName;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          setTimeout(function(){ URL.revokeObjectURL(url); }, 30000);
          if(typeof toast==='function') toast('✓ PDF salvo: '+fileName);
        };
      }
      if (btnWpp && temShare) {
        btnWpp.innerHTML = '💬 WhatsApp';
        btnWpp.disabled = false;
        btnWpp.style.color = '#25d366';
        btnWpp.style.borderColor = 'rgba(37,211,102,.5)';
        btnWpp.onclick = function(){
          if (!pdfBlobRef) { if(typeof toast==='function') toast('PDF ainda gerando...'); return; }
          var pdfFile = new File([pdfBlobRef], fileName, {type:'application/pdf'});
          var sd = { title:'Relatório de Ponto — '+nomeFunc, text:'Relatório de ponto — '+mesRef+'\n_HR Mármores e Granitos_' };
          if (navigator.canShare && navigator.canShare({files:[pdfFile]})) sd.files = [pdfFile];
          navigator.share(sd).catch(function(e){
            if (e && e.name !== 'AbortError') _fallbackWpp(pdfBlobRef, fileName, nomeFunc, mesRef, telFunc);
          });
        };
      }
    }

    setTimeout(function(){
      html2canvas(offscreen, { scale:2, useCORS:true, backgroundColor:'#ffffff', logging:false, width:794, windowWidth:794 })
      .then(function(canvas){
        document.body.removeChild(offscreen);

        // Mostra preview como imagem
        preview.innerHTML = '';
        var wrap = document.createElement('div');
        wrap.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:12px;width:100%;max-width:794px;';
        var img = document.createElement('img');
        img.src = canvas.toDataURL('image/jpeg', 0.90);
        img.style.cssText = 'width:100%;display:block;box-shadow:0 4px 24px rgba(0,0,0,.7);border:1px solid rgba(201,168,76,.15);';
        wrap.appendChild(img);
        preview.appendChild(wrap);

        // Gera PDF em background
        pdfBlobRef = pdfBlobFn();
        _enableButtons();
        if(typeof toast==='function') toast('✓ Relatório pronto — '+nomeFunc+' · '+mesRef);
      })
      .catch(function(){
        if(document.body.contains(offscreen)) document.body.removeChild(offscreen);
        preview.innerHTML = '<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;color:#b8b0a0;font-family:Outfit,sans-serif;font-size:.85rem;text-align:center;padding:32px;"><div style="font-size:2.5rem;">📄</div><div>Erro ao gerar preview.</div></div>';
        // Tenta gerar PDF mesmo assim
        try { pdfBlobRef = pdfBlobFn(); _enableButtons(); } catch(e2){}
      });
    }, 200);
  }

  function _fallbackWpp(blob, fileName, nomeFunc, mesRef, telFunc) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    var tel = (telFunc || '').replace(/\D/g, '');
    var msg = 'Olá '+nomeFunc+',\n\nSegue o relatório de ponto referente a '+mesRef+'.\n\n_HR Mármores e Granitos_';
    setTimeout(function(){
      window.open('https://wa.me/'+(tel?'55'+tel:'')+'?text='+encodeURIComponent(msg),'_blank');
    }, 700);
  }

  // ─── Gerador PDF principal ───────────────────────────────────────────────────

  function gerarPDF(funcId, di, df) {
    _loadLibs(function() {
      var jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPDFClass) { if(typeof toast==='function') toast('jsPDF não carregado'); return; }
      _executarGeracao(jsPDFClass, funcId, di, df);
    });
  }

  function _executarGeracao(jsPDFClass, funcId, di, df) {
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

    var doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
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
    var COR_LINHA_AZ = [230, 242, 255]; // azul claro — feriado

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
      { header: 'H. Extras',   w: 24, align: 'center' },
      { header: 'H. Negativas',w: 24, align: 'center' },
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
      if (l.tipo === 'feriado' || l.tipo === 'acordo') {
        doc.setFillColor.apply(doc, COR_LINHA_AZ);
        doc.rect(mL, y, cW, rowH, 'F');
      } else if (l.extraMin > 0 && !l.destinoBanco) {
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
        (l.extraMin > 0 && !l.destinoBanco) ? ('+' + _fmtMin(l.extraMin) + (l.tipoHE==='especial'||l.tipoHE==='feriado'||l.tipoHE==='domingo' ? ' x3' : ' x2')) : '—',
        l.saldoMin < 0 ? _fmtMin(l.saldoMin) : '—',
      ];

      cells.forEach(function (txt, i) {
        var c = cols[i];
        var tx = colX[i] + (c.align === 'right' ? c.w - 1.5 : c.align === 'center' ? c.w / 2 : 1.5);

        // Cor especial para H. extras / H. negativas
        if (i === 8 && l.extraMin > 0 && !l.destinoBanco) {
          doc.setTextColor(40, 130, 70);
        }
        if (i === 9 && l.saldoMin < 0) {
          doc.setTextColor(180, 60, 60);
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
      if (l.tipo === 'feriado') {
        var descF = l.excDescricao ? ' (' + l.excDescricao + ')' : '';
        var isMeio = l.obs && l.obs.indexOf('meio') !== -1;
        obsLinhas.push('•' + _fmtData(l.data) + ': feriado' + (isMeio ? ' meio período' : '') + descF);
      } else if (l.tipo === 'acordo') {
        var descA = l.excDescricao ? ' (' + l.excDescricao + ')' : '';
        obsLinhas.push('•' + _fmtData(l.data) + ': acordo' + descA);
      } else if (l.autoComp) {
        obsLinhas.push('•' + _fmtData(l.data) + ': horário incompleto (autocomplete)');
      }
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
    var vHe2x = (totalExtraMin50 / 60)  * valorHora * 2;
    var vHe3x = (totalExtraMin200 / 60) * valorHora * 3;
    _rfDir('Total horas extras:', _fmtMin(totalExtraHMin));
    if (totalExtraMin50  > 0) _rfDir('HE semana (x2): ' + _fmtMin(totalExtraMin50),  _fmtMoeda(vHe2x),  COR_VERDE);
    if (totalExtraMin200 > 0) _rfDir('HE fds/feriado (x3): ' + _fmtMin(totalExtraMin200), _fmtMoeda(vHe3x), COR_VERDE);
    _rfDir('Total extras:', _fmtMoeda(totalValorExtra), COR_VERDE);

    y = Math.max(ry, ry2) + 3;

    // Linha separadora
    doc.setDrawColor.apply(doc, COR_CINZA);
    doc.line(mL, y, pW - mR, y);
    y += 5;

    // Decêndios de pagamento
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

    // Título bloco decêndios
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor.apply(doc, COR_HEADER);
    doc.text('Pagamentos Decendiais', mL + 3, y + 4);
    y += 7;

    var anoMesDec = di.slice(0,7);
    var ultimoDiaDec = new Date(parseInt(di.slice(0,4)), parseInt(di.slice(5,7)), 0).getDate();
    var funcsRawPDF = {};
    try { funcsRawPDF = JSON.parse(localStorage.getItem('hr_funcionarios')||'{}'); } catch(e) {}
    var fDataPDF = funcsRawPDF[f.id] || f;
    var decendios = [
      { num:1, label:'1º Decêndio — dia 10/', data: anoMesDec+'-10' },
      { num:2, label:'2º Decêndio — dia 20/', data: anoMesDec+'-20' },
      { num:3, label:'3º Decêndio — dia '+ultimoDiaDec+'/', data: anoMesDec+'-'+String(ultimoDiaDec).padStart(2,'0') }
    ];
    decendios.forEach(function(d){
      var val = parseFloat(fDataPDF['dec'+d.num]) || (salario/3);
      var isAtual = (d.data >= di && d.data <= df);
      _blocoFim(d.label + d.data.slice(5,7) + '/' + d.data.slice(0,4) + ':',
        _fmtMoeda(val),
        isAtual ? [230, 240, 255] : [245, 248, 250],
        [30, 30, 30], false);
    });

    if (totalValorExtra > 0) {
      _blocoFim('+ H. Extras do período:', _fmtMoeda(totalValorExtra), [240, 250, 240], [30, 100, 50], false);
    }
    if (totalPago > 0) {
      _blocoFim('Já pago no período:', '- ' + _fmtMoeda(totalPago), [250, 242, 242], [140, 50, 50], false);
    }
    y += 5;

    // Legenda de cores
    function _legItem(cor, txt) { return { cor: cor, txt: txt }; }
    var legItems = [
      { cor: COR_HEADER,    txt: 'Fundo azul = período do pagamento atual' },
      { cor: [200, 180, 80], txt: 'Amarelo = ponto incompleto' },
      { cor: [50, 150, 70],  txt: 'Verde = horas extras' },
      { cor: [180, 60, 60],  txt: 'Vermelho = déficit (nao descontado)' },
      { cor: [80, 140, 210], txt: 'Azul claro = feriado / acordo' },
    ];
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    var lx = mL;
    legItems.forEach(function(item) {
      doc.setFillColor.apply(doc, item.cor);
      doc.rect(lx, y, 3, 3, 'F');
      doc.setTextColor(60, 60, 60);
      doc.text(item.txt, lx + 4.5, y + 2.5);
      lx += 38;
    });

    y += 8;

    // Rodapé
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(6);
    var agora = new Date();
    var dtGer = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    doc.text('Documento gerado em ' + dtGer + ' · HR Mármores e Granitos',
      pW / 2, y, { align: 'center' });

    // ── Prepara dados de saída ────────────────────────────────────────────────
    var nomeFmt = (f.nome || 'func').replace(/\s+/g, '_').toLowerCase();
    var mesFmt  = di.slice(0, 7).replace('-', '') +
                  '_' + di.slice(8,10) + '_' + df.slice(8,10);
    var fileName = 'relatorio_ponto_' + nomeFmt + '_' + mesFmt + '.pdf';
    var mesRef   = _mesExtenso(di, df) + ' (' + di.slice(8,10) + '-' + df.slice(8,10) + ')';
    var telFunc  = f.telefone || f.tel || '';

    // Gera o HTML do relatório para preview (html2canvas)
    var htmlPreview = _gerarHtmlRelatorio(f, linhas, di, df, totalTrabMin, totalDeficitMin,
      totalExtraMin50, totalExtraMin200, totalValorExtra, saldoLiqExtra, totalAPagar,
      totalPago, meusPags, salario, valorHora);

    // Função lazy que retorna o blob PDF (doc já está finalizado)
    var pdfBlobFn = function() {
      return doc.output('blob');
    };

    _abrirOverlayPonto(htmlPreview, pdfBlobFn, fileName, f.nome || 'Funcionário', mesRef, telFunc);
  }

  // ─── Gerador HTML do relatório (para preview via html2canvas) ────────────────

  function _gerarHtmlRelatorio(f, linhas, di, df, totalTrabMin, totalDeficitMin,
    totalExtraMin50, totalExtraMin200, totalValorExtra, saldoLiqExtra, totalAPagar,
    totalPago, meusPags, salario, valorHora) {

    var mesRef = _mesExtenso(di, df);
    var depto  = f.departamento || f.setor || '—';
    var hrEnt  = f.horarioEntrada || '07:00';
    var hrSai  = f.horarioSaida   || '17:00';
    var pagForma = (meusPags && meusPags.length > 0 && meusPags[0].forma) ? meusPags[0].forma : 'semanal';
    var totalExtraHMin = totalExtraMin50 + totalExtraMin200;

    function fmtMin(min) {
      var neg = min < 0, abs = Math.abs(Math.round(min));
      return (neg?'-':'')+String(Math.floor(abs/60)).padStart(2,'0')+'h'+String(abs%60).padStart(2,'0')+'m';
    }
    function fmtData(iso) { return iso.slice(8,10)+'/'+iso.slice(5,7); }
    function fmtMoeda(v) { return 'R$ '+parseFloat(v||0).toFixed(2).replace('.',','); }

    var rowsHtml = '';
    linhas.forEach(function(l, idx) {
      var bg = idx%2===0?'#fff':'#fafafa';
      if (l.tipo==='feriado'||l.tipo==='acordo') bg='#e6f2ff';
      else if (l.extraMin>0&&!l.destinoBanco)    bg='#f0fff0';
      else if (l.saldoMin<-5)                    bg='#fff2f2';
      else if (l.autoComp)                       bg='#fffce6';

      var heExtraCell = (l.extraMin>0 && !l.destinoBanco)
        ? '<span style="color:#2a8a46;font-weight:600;">+'+fmtMin(l.extraMin)+(l.tipoHE==='especial'||l.tipoHE==='feriado'||l.tipoHE==='domingo'?' ×3':' ×2')+'</span>'
        : '—';
      var heNegCell = l.saldoMin<0
        ? '<span style="color:#b43c3c;font-weight:600;">'+fmtMin(l.saldoMin)+'</span>'
        : '—';

      rowsHtml +=
        '<tr style="background:'+bg+';">'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+fmtData(l.data)+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+l.diaTxt+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+l.entrada+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+l.saidaAlm+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+l.voltaAlm+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+l.saida+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+fmtMin(l.trabMin)+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+(l.esperadoMin>0?fmtMin(l.esperadoMin):'—')+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+heExtraCell+'</td>'+
        '<td style="text-align:center;padding:3px 4px;font-size:10px;">'+heNegCell+'</td>'+
        '</tr>';
    });

    // Observações
    var obsHtml = '';
    linhas.forEach(function(l){
      if (l.tipo==='feriado') {
        var isMeio = l.obs&&l.obs.indexOf('meio')!==-1;
        obsHtml += '•'+fmtData(l.data)+': feriado'+(isMeio?' meio período':'')+(l.excDescricao?' ('+l.excDescricao+')':'')+' ';
      } else if (l.tipo==='acordo') {
        obsHtml += '•'+fmtData(l.data)+': acordo'+(l.excDescricao?' ('+l.excDescricao+')':'')+' ';
      } else if (l.autoComp) {
        obsHtml += '•'+fmtData(l.data)+': horário incompleto ';
      }
    });

    var agora = new Date();
    var dtGer = agora.toLocaleDateString('pt-BR')+' '+agora.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});

    return '<div style="font-family:Arial,sans-serif;background:#fff;padding:16px 20px;color:#111;width:754px;box-sizing:border-box;">'+

      // Cabeçalho
      '<div style="background:#1a3660;color:#fff;text-align:center;padding:10px 0 6px;border-radius:4px 4px 0 0;">'+
        '<div style="font-size:15px;font-weight:700;letter-spacing:1px;">RELATÓRIO DE PONTO</div>'+
        '<div style="font-size:10px;opacity:.8;margin-top:2px;">Mês de Referência: '+mesRef+'</div>'+
      '</div>'+

      // Info funcionário
      '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 4px;border-bottom:1px solid #ddd;font-size:10px;">'+
        '<div><b>Funcionário: '+f.nome+'</b></div>'+
        '<div>Departamento: '+depto+'</div>'+
        '<div>Salário: '+fmtMoeda(salario)+' mensais</div>'+
      '</div>'+
      '<div style="display:flex;justify-content:space-between;padding:4px 4px 8px;border-bottom:2px solid #1a3660;font-size:9px;color:#555;">'+
        '<div>Escala: Seg-Sex '+hrEnt+'-12:00 / 14:00-'+hrSai+' | Sáb 07:00-11:00</div>'+
        '<div>Pagamentos: '+pagForma+' — pagamento toda sexta</div>'+
      '</div>'+

      // Tabela
      '<table style="width:100%;border-collapse:collapse;margin-top:8px;">'+
        '<thead><tr style="background:#eaf0f8;color:#1a3660;">'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">Data</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">Dia</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">Entrada</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">Saída<br>Almoço</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">Volta<br>Almoço</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">Saída</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">Trabalhado</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">Esperado</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">H. Extras</th>'+
          '<th style="padding:5px 4px;font-size:9.5px;text-align:center;border:1px solid #ccd6e0;">H. Negativas</th>'+
        '</tr></thead>'+
        '<tbody>'+rowsHtml+'</tbody>'+
      '</table>'+

      // Observações
      (obsHtml ? '<div style="font-size:9px;color:#555;font-style:italic;margin-top:6px;">Observações: '+obsHtml+'</div>' : '')+

      // Linha separadora
      '<hr style="border:none;border-top:1px solid #ccc;margin:10px 0 6px;">'+

      // Resumo horas extras
      (function(){
        var totalHE = totalExtraMin50 + totalExtraMin200;
        var vHe2x = (totalExtraMin50/60)  * valorHora * 2;
        var vHe3x = (totalExtraMin200/60) * valorHora * 3;
        return '<div style="display:flex;justify-content:space-between;font-size:10px;padding:0 4px;">'+
          '<div>'+
            '<div><b>Valor hora normal:</b> '+fmtMoeda(valorHora)+'/hora</div>'+
            '<div><b>HE semana (×2):</b> '+fmtMin(totalExtraMin50)+'</div>'+
            (totalExtraMin200>0?'<div><b>HE fds/feriado (×3):</b> '+fmtMin(totalExtraMin200)+'</div>':'')+
            '<div style="color:#b43c3c;"><b>Total déficit:</b> '+(totalDeficitMin<0?fmtMin(totalDeficitMin):'—')+'</div>'+
          '</div>'+
          '<div style="text-align:right;">'+
            '<div><b>Total horas extras:</b> '+fmtMin(totalHE)+'</div>'+
            (totalExtraMin50>0?'<div style="color:#2a8a46;">Valor HE semana (×2): '+fmtMoeda(vHe2x)+'</div>':'')+
            (totalExtraMin200>0?'<div style="color:#2a8a46;">Valor HE fds/feriado (×3): '+fmtMoeda(vHe3x)+'</div>':'')+
            '<div style="color:#2a8a46;font-weight:700;"><b>Total extras: '+fmtMoeda(totalValorExtra)+'</b></div>'+
          '</div>'+
        '</div>';
      })()+

      '<hr style="border:none;border-top:1px solid #eee;margin:10px 0 6px;">'+

      // Decêndios de pagamento
      (function(){
        var anoMes = di.slice(0,7);
        var ultimoDia = new Date(parseInt(di.slice(0,4)), parseInt(di.slice(5,7)), 0).getDate();
        var dec = [
          { num:1, label:'1º Decêndio (dia 10)', data: anoMes+'-10' },
          { num:2, label:'2º Decêndio (dia 20)', data: anoMes+'-20' },
          { num:3, label:'3º Decêndio (dia '+ultimoDia+')', data: anoMes+'-'+String(ultimoDia).padStart(2,'0') }
        ];
        var funcsRaw = {};
        try { funcsRaw = JSON.parse(localStorage.getItem('hr_funcionarios')||'{}'); } catch(e){}
        var fData = funcsRaw[f.id] || f;
        var html = '<div style="font-size:10px;padding:0 4px;margin-bottom:6px;">'+
          '<div style="font-weight:700;color:#1a3660;margin-bottom:5px;">📅 Pagamentos Decendiais</div>';
        dec.forEach(function(d){
          var val = parseFloat(fData['dec'+d.num]) || (salario/3);
          html += '<div style="display:flex;justify-content:space-between;padding:4px 6px;margin-bottom:3px;'+
            'background:'+(d.data>=di&&d.data<=df?'#eaf0f8':'#f8f8f8')+';border-radius:4px;border:1px solid #ddd;">'+
            '<span style="color:#555;">'+d.label+'</span>'+
            '<span style="font-weight:700;">'+fmtMoeda(val)+'</span>'+
          '</div>';
        });
        html += (totalValorExtra>0?'<div style="display:flex;justify-content:space-between;padding:4px 6px;background:#f0fff0;border-radius:4px;border:1px solid #c3e6c3;color:#2a8a46;">'+
          '<span>+ H. Extras do período</span><span style="font-weight:700;">'+fmtMoeda(totalValorExtra)+'</span></div>':'');
        html += '</div>';
        return html;
      })()+

      // Legenda
      '<div style="display:flex;gap:16px;margin-top:8px;flex-wrap:wrap;font-size:8px;color:#555;padding:0 4px;">'+
        '<span><span style="display:inline-block;width:10px;height:10px;background:#1a3660;margin-right:3px;vertical-align:middle;"></span>Fundo azul = período atual</span>'+
        '<span><span style="display:inline-block;width:10px;height:10px;background:#fffce6;border:1px solid #ccc;margin-right:3px;vertical-align:middle;"></span>Amarelo = incompleto</span>'+
        '<span><span style="display:inline-block;width:10px;height:10px;background:#f0fff0;border:1px solid #ccc;margin-right:3px;vertical-align:middle;"></span>Verde = horas extras</span>'+
        '<span><span style="display:inline-block;width:10px;height:10px;background:#fff2f2;border:1px solid #ccc;margin-right:3px;vertical-align:middle;"></span>Vermelho = déficit</span>'+
        '<span><span style="display:inline-block;width:10px;height:10px;background:#e6f2ff;border:1px solid #ccc;margin-right:3px;vertical-align:middle;"></span>Azul claro = feriado/acordo</span>'+
      '</div>'+

      '<div style="text-align:center;font-size:8px;color:#aaa;margin-top:10px;">Documento gerado em '+dtGer+' · HR Mármores e Granitos</div>'+
    '</div>';
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  return {
    gerarPDF: gerarPDF,
  };

})();
