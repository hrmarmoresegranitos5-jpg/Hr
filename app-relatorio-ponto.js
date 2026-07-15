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

  // ─── Config ─────────────────────────────────────────────────────────────────
  // Número de WhatsApp do RH/dono, usado no link "dúvidas ou contestação" do
  // rodapé do PDF. Formato: DDD + número, sem +55 (o link já adiciona o 55).
  // Deixe vazio ('') para não mostrar o link.
  // OBS: preenchido com o WhatsApp da empresa (74991484460). Se Hangel quiser
  // um número diferente pra contestação de ponto, é só trocar aqui.
  var WPP_CONTATO_RH = '74991484460';

  // Acima deste número de minutos de hora extra NUM ÚNICO DIA, o sistema pede
  // confirmação antes de gerar o relatório (evita pagar valor errado por
  // erro de digitação/importação do ponto). 240min = 4h.
  var LIMIAR_HE_ANOMALA_MIN = 240;

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
    // Retorna "2ª", "Sáb", "Dom" etc — usa DIAS_NUM (já corrigido, indexado por getDay())
    if (dow === 0) return 'Dom';
    return DIAS_NUM[dow];
  }

  function _mesExtenso(di, df) {
    var d = new Date(di + 'T12:00:00');
    return MESES_PT[d.getMonth()] + ' / ' + d.getFullYear();
  }

  function _fmtData(iso) {
    // "2026-06-01" → "01/06"
    return iso.slice(8, 10) + '/' + iso.slice(5, 7);
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function _hhmm2min(s) {
    if (!s || s === '—' || s === '-') return null;
    var p = (s || '').split(':').map(Number);
    if (p.length < 2 || isNaN(p[0]) || isNaN(p[1])) return null;
    return p[0] * 60 + p[1];
  }

  // ─── Monta linhas da tabela ──────────────────────────────────────────────────

  function _montarLinhas(meusRegs, f, di, df, funcId) {
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
      // Horas a descontar da HE deste dia porque compensam falta/folga em outro
      // dia (ex: trabalhou o feriado pra folgar no sábado — as horas do sábado
      // não viram HE, só o que sobrar depois do desconto).
      var compensarMin = 0;
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
        compensarMin = Math.round((parseFloat(exc.compensacaoHoras) || 0) * 60);
      }

      if (r) {
        var trabMin       = Math.round((parseFloat(r.horas) || 0) * 60);
        // Extra/déficit agora SEMPRE vêm do saldo real do dia (trabalhado −
        // esperado), calculado aqui — não mais do campo r.extra salvo na
        // importação. Aquele valor foi calculado ANTES de qualquer exceção
        // (feriado meio período, acordo, "Direto confirmado") ser lançada
        // na tela de correção, então ficava desatualizado sempre que o
        // esperado do dia mudava depois do import — fazendo o relatório
        // mostrar "—" (sem HE) em dias que na verdade tiveram extra real.
        var brutoExtraDia = Math.max(0, trabMin - esperadoMin);
        // Desconta a compensação ANTES de classificar/multiplicar — as horas
        // descontadas não são pagas nem triplicadas, só abatem a folga devida.
        compensarMin      = Math.min(brutoExtraDia, compensarMin);
        var saldoMin      = trabMin - esperadoMin - compensarMin;
        var extraMin      = Math.max(0, saldoMin);
        if (compensarMin > 0) {
          obsExcecao += (obsExcecao ? ' — ' : '') + 'descontadas ' + _fmtMin(compensarMin) + ' (compensação)';
        }

        // Valor extra financeiro do dia
        // (usa o motor unificado HR_IMPORT.calcValorHoraReal — mesma jornada
        // real usada em calcSaldoFuncionario/app-funcionarios.js — em vez de
        // um divisor fixo de 192h que dava valor de hora diferente daqui
        // pra lá dependendo de qual relatório era gerado)
        var salario     = parseFloat(f.salario) || 0;
        var valorHora   = (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcValorHoraReal === 'function')
          ? HR_IMPORT.calcValorHoraReal(f, iso.slice(0, 7))
          : salario / 192; // fallback se HR_IMPORT não estiver carregado

        var valorExtra  = 0;
        // Multiplicador correto vem do motor unificado HR_IMPORT._classificarHE
        // (mesma regra usada na tela de correção de ponto): sábado só triplica
        // se a saída for depois de 12:00 ("sábado tarde") — sábado de manhã,
        // mesmo com exceção de acordo/feriado meio período, é dobrado (×2).
        // Antes, este arquivo tinha sua própria regra simplificada
        // (`dow===0 || dow===6` → sempre ×3), que triplicava indevidamente
        // qualquer sábado, mesmo terminando de manhã.
        var tipoHE = 'normal';
        // Feriado declarado na tela de correção (exceção local, salva em
        // hr_excecoes) NÃO é a mesma lista que HR_IMPORT._classificarHE usa
        // pra decidir ×3 — aquele só olha o array global CFG.feriados. Então
        // um feriado marcado aqui (dia todo ou meio período) sem estar
        // também no CFG.feriados global caía na regra padrão de dia útil
        // (×2) em vez da regra de feriado (×3). Sábado fica de fora dessa
        // correção porque já tem regra própria e deliberada (só triplica se
        // a saída for depois de 12:00 — sábado de manhã com feriado/acordo
        // continua ×2).
        var feriadoLocalForcaTriplo = !!(exc && exc.tipo === 'feriado' && dow !== 6);
        if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT._classificarHE === 'function') {
          var classeHE = HR_IMPORT._classificarHE({
            data: iso, extra: extraMin,
            entrada: r.entrada || '', saida: r.saida || '',
            funcId: funcId || null
          });
          if (feriadoLocalForcaTriplo) {
            classeHE = { extra50: 0, extra100: 0, extra200: extraMin };
          }
          if (extraMin > 0 && r.destinoExtra !== 'banco') {
            valorExtra = (classeHE.extra200 / 60) * 3.0 * valorHora +
                         (classeHE.extra100 / 60) * 3.0 * valorHora +
                         (classeHE.extra50  / 60) * 2.0 * valorHora;
          }
          if (classeHE.extra200 > 0 || classeHE.extra100 > 0) tipoHE = 'especial';
        } else {
          // Fallback (HR_IMPORT indisponível) — mantém regra antiga só como rede de segurança
          var _ehTriplado = (dow === 0) || feriadoLocalForcaTriplo;
          tipoHE = _ehTriplado ? 'especial' : 'normal';
          if (extraMin > 0 && r.destinoExtra !== 'banco') {
            valorExtra = (extraMin / 60) * (_ehTriplado ? 3.0 : 2.0) * valorHora;
          }
        }

        // Observação do dia (prioriza exceção, depois dados do registro)
        var obs = obsExcecao;
        if (!obs) {
          if (r.tipo === 'feriado')         obs = 'feriado';
          else if (r.tipo === 'acordo')     obs = 'acordo';
          else if (r.autoCompletado)        obs = 'incompleto';
          else if (r.tipo === 'folga_banco') obs = 'folga banco';
        }

        // Dia trabalhado (entrada + saída registradas) mas sem batida de
        // almoço no ponto → aqui na HR todo mundo bate o ponto do almoço,
        // mesmo almoçando na empresa, então isso não é "sem almoço", é
        // batida direta faltando no relógio/importação. Sinaliza em vez de
        // esconder, pra não passar a impressão de jornada contínua real.
        // Se já foi revisado e confirmado na tela de correção do import
        // (semAlmocoConfirmado), mostra neutro em vez de alerta — já foi
        // uma decisão consciente, não uma pendência.
        var temEntSai    = r.entrada && r.saida;
        var almocoDireta = !!(temEntSai && !r.saidaAlmoco && !r.voltaAlmoco && !r.semAlmocoConfirmado);
        var almocoDiretoConf = !!(temEntSai && !r.saidaAlmoco && !r.voltaAlmoco && r.semAlmocoConfirmado);

        linhas.push({
          data:       iso,
          diaTxt:     _labelDia(dow),
          entrada:    r.entrada       || '—',
          saidaAlm:   r.saidaAlmoco  || '—',
          voltaAlm:   r.voltaAlmoco  || '—',
          saida:      r.saida        || '—',
          almocoDireta: almocoDireta,
          almocoDiretoConf: almocoDiretoConf,
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

  function _abrirOverlayPonto(htmlRelatorio, pdfBlobFn, fileName, nomeFunc, mesRef, telFunc, valorMsg, jaQuitado) {
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
      '<button id="hrPontoZoom" disabled style="background:transparent;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">🔍</button>'+
      '<button id="hrPontoClose" style="background:transparent;border:1px solid rgba(201,168,76,.35);color:rgba(201,168,76,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">✕</button>'+
      '<button id="hrPontoDown" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">⏳ PDF...</button>'+
      (temShare ? '<button id="hrPontoWpp" disabled style="background:#0d1f12;border:1px solid rgba(37,211,102,.25);color:rgba(37,211,102,.4);padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">💬 WhatsApp</button>' : '');

    var preview = document.createElement('div');
    preview.style.cssText = 'flex:1;overflow:auto;background:#444;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;-webkit-overflow-scrolling:touch;';
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
          var textoWpp = jaQuitado
            ? 'Relatório de ponto — '+mesRef+'\nStatus: já quitado ✅\n_HR Mármores e Granitos_'
            : 'Relatório de ponto — '+mesRef+'\nVocê vai receber: '+valorMsg+'\n_HR Mármores e Granitos_';
          var sd = { title:'Relatório de Ponto — '+nomeFunc, text: textoWpp };
          if (navigator.canShare && navigator.canShare({files:[pdfFile]})) sd.files = [pdfFile];
          navigator.share(sd).catch(function(e){
            if (e && e.name !== 'AbortError') _fallbackWpp(pdfBlobRef, fileName, nomeFunc, mesRef, telFunc, valorMsg, jaQuitado);
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
        img.style.cssText = 'width:100%;display:block;box-shadow:0 4px 24px rgba(0,0,0,.7);border:1px solid rgba(201,168,76,.15);transition:width .15s ease;';
        wrap.appendChild(img);
        preview.appendChild(wrap);

        // Zoom: tap na imagem ou botão 🔍 alterna entre ajustar-à-tela e tamanho ampliado (rolagem)
        var zoomed = false;
        function _setZoom(on){
          zoomed = on;
          if (zoomed) {
            wrap.style.maxWidth = 'none';
            img.style.width = '210%';
            preview.style.justifyContent = 'flex-start';
            preview.style.alignItems = 'flex-start';
          } else {
            wrap.style.maxWidth = '794px';
            img.style.width = '100%';
            preview.style.justifyContent = 'center';
            preview.style.alignItems = 'flex-start';
          }
          var btnZoom = document.getElementById('hrPontoZoom');
          if (btnZoom) btnZoom.style.color = zoomed ? GOLD : 'rgba(201,168,76,.7)';
        }
        img.onclick = function(){ _setZoom(!zoomed); };
        var btnZoomEl = document.getElementById('hrPontoZoom');
        if (btnZoomEl) {
          btnZoomEl.disabled = false;
          btnZoomEl.style.color = 'rgba(201,168,76,.7)';
          btnZoomEl.style.borderColor = GOLDB;
          btnZoomEl.onclick = function(){ _setZoom(!zoomed); };
        }

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

  function _fallbackWpp(blob, fileName, nomeFunc, mesRef, telFunc, valorMsg, jaQuitado) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    var tel = (telFunc || '').replace(/\D/g, '');
    var msg = jaQuitado
      ? 'Olá '+nomeFunc+',\n\nSegue o relatório de ponto referente a '+mesRef+'.\nStatus: já quitado ✅\n\n_HR Mármores e Granitos_'
      : 'Olá '+nomeFunc+',\n\nSegue o relatório de ponto referente a '+mesRef+'.\nVocê vai receber: '+(valorMsg||'')+'\n\n_HR Mármores e Granitos_';
    setTimeout(function(){
      window.open('https://wa.me/'+(tel?'55'+tel:'')+'?text='+encodeURIComponent(msg),'_blank');
    }, 700);
  }

  // ─── Motor financeiro do decêndio (usado por jsPDF e pelo preview HTML) ──────
  // Centraliza toda a conta: salário fixo do decêndio + HE do período
  // − adiantamentos apontados para este decêndio − já pago = líquido a pagar.
  function _calcularFinanceiroDecendio(funcId, f, di, df, totalValorExtra, totalDeficitMin, valorHora, meusPagsPeriodo) {
    var diaIni = di.slice(8, 10);
    var decNum = diaIni === '01' ? 1 : (diaIni === '11' ? 2 : 3);
    var mesRef = di.slice(0, 7);

    var salario  = parseFloat(f.salario) || 0;
    var decValor = parseFloat(f['dec' + decNum]) || (salario / 3);

    // Pagamentos do decêndio propriamente dito (tipo='decendio') feitos neste período
    var pagsDecendio = meusPagsPeriodo.filter(function (p) { return p.tipo === 'decendio'; });
    var totalPagoDecendio = pagsDecendio.reduce(function (s, p) { return s + (parseFloat(p.valor) || 0); }, 0);

    // Outros pagamentos (bônus, HE avulsa etc) — não inclui vale/adiantamento,
    // que agora são tratados separadamente pelo desconto direcionado.
    var pagsOutros = meusPagsPeriodo.filter(function (p) {
      return p.tipo !== 'decendio' && p.tipo !== 'vale' && p.tipo !== 'adiantamento';
    });
    var totalPagoOutros = pagsOutros.reduce(function (s, p) { return s + (parseFloat(p.valor) || 0); }, 0);
    var totalPago = totalPagoDecendio + totalPagoOutros;

    // Adiantamentos/vales apontados especificamente para este decêndio
    var adiantamentosAlvo = (typeof HR_FUNC !== 'undefined' && HR_FUNC._adiantamentosAlvoDecendio)
      ? HR_FUNC._adiantamentosAlvoDecendio(funcId, decNum, mesRef) : [];
    var totalAdiantamentos = adiantamentosAlvo.reduce(function (s, a) { return s + (parseFloat(a.valor) || 0); }, 0);

    // Outros adiantamentos em aberto do funcionário (apontados p/ outros decêndios) — informativo
    var todosAbertos = (typeof HR_FUNC !== 'undefined' && HR_FUNC._adiantamentosEmAberto)
      ? HR_FUNC._adiantamentosEmAberto(funcId) : [];
    var idsAlvo = {};
    adiantamentosAlvo.forEach(function (a) { idsAlvo[a.id] = true; });
    var outrosAdiantamentos = todosAbertos.filter(function (a) { return !idsAlvo[a.id]; });

    // Créditos (overpago em decêndio anterior) apontados especificamente para este —
    // mesmo padrão dos adiantamentos, só que somam ao invés de descontar.
    var creditosAlvo = (typeof HR_FUNC !== 'undefined' && HR_FUNC._creditosAlvoDecendio)
      ? HR_FUNC._creditosAlvoDecendio(funcId, decNum, mesRef) : [];
    var totalCreditos = creditosAlvo.reduce(function (s, c) { return s + (parseFloat(c.valor) || 0); }, 0);

    // Outros créditos em aberto do funcionário (ainda sem decêndio de destino escolhido)
    var creditosTodos = (typeof HR_FUNC !== 'undefined' && HR_FUNC._creditosEmAberto)
      ? HR_FUNC._creditosEmAberto(funcId) : [];
    var idsCredAlvo = {};
    creditosAlvo.forEach(function (c) { idsCredAlvo[c.id] = true; });
    var outrosCreditos = creditosTodos.filter(function (c) { return !idsCredAlvo[c.id]; });

    // Desconta os minutos a menos (déficit) à hora normal (1×, sem adicional —
    // hora extra é paga com adicional porque é trabalho a mais fora da jornada;
    // hora faltante é só jornada não cumprida, então desconta ao valor cheio).
    var totalDeficitValor = (Math.abs(totalDeficitMin || 0) / 60) * (valorHora || 0);

    var totalDevido  = decValor + totalValorExtra - totalDeficitValor;
    var totalLiquido = totalDevido - totalAdiantamentos + totalCreditos;
    var saldoFinal    = totalLiquido - totalPago;
    var status = saldoFinal <= 0.5 ? 'pago' : 'pendente';

    // Status resumido dos outros 2 decêndios do mês (para a faixinha de contexto)
    var pagsTodoMes = {};
    try { pagsTodoMes = HR_FUNC ? HR_FUNC.getPagamentos() : {}; } catch (e) {}
    function _statusOutroDecendio(num) {
      if (num === decNum) return null;
      var per = (typeof HR_FUNC !== 'undefined' && HR_FUNC._periodoDecendio)
        ? HR_FUNC._periodoDecendio(num, mesRef) : null;
      if (!per) return null;
      var valorDec = parseFloat(f['dec' + num]) || (salario / 3);
      var pago = Object.values(pagsTodoMes).filter(function (p) {
        return p.funcionarioId == funcId && p.tipo === 'decendio' && p.data >= per.di && p.data <= per.df;
      }).reduce(function (s, p) { return s + (parseFloat(p.valor) || 0); }, 0);
      return { num: num, di: per.di, df: per.df, valor: valorDec, pago: pago, quitado: pago >= valorDec - 0.5 };
    }
    var outrosDecendios = [1, 2, 3].map(_statusOutroDecendio).filter(function (x) { return x; });

    return {
      decNum: decNum, mesRef: mesRef, decValor: decValor,
      totalDeficitValor: totalDeficitValor,
      totalPagoDecendio: totalPagoDecendio, totalPagoOutros: totalPagoOutros, totalPago: totalPago,
      adiantamentosAlvo: adiantamentosAlvo, totalAdiantamentos: totalAdiantamentos,
      outrosAdiantamentos: outrosAdiantamentos,
      creditosAlvo: creditosAlvo, totalCreditos: totalCreditos, outrosCreditos: outrosCreditos,
      totalDevido: totalDevido, totalLiquido: totalLiquido, saldoFinal: saldoFinal,
      status: status, outrosDecendios: outrosDecendios
    };
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
    var valorHora  = (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcValorHoraReal === 'function')
      ? HR_IMPORT.calcValorHoraReal(f, di.slice(0, 7))
      : salario / 192;

    var meusRegs = Object.values(regs).filter(function (r) {
      return r.funcionarioId != null && r.funcionarioId == funcId && r.data >= di && r.data <= df;
    });
    var meusPags = Object.values(pags).filter(function (p) {
      return p.funcionarioId != null && p.funcionarioId == funcId && p.data >= di && p.data <= df;
    });

    var linhas = _montarLinhas(meusRegs, f, di, df, funcId);

    var totalTrabMin  = 0, totalEsperadoMin = 0, totalSaldoMin = 0;
    var totalExtraMin50 = 0, totalExtraMin200 = 0;
    var totalValorExtra50 = 0, totalValorExtra200 = 0;
    var totalValorExtra = 0, totalDeficitMin = 0;

    linhas.forEach(function (l) {
      totalTrabMin      += l.trabMin;
      totalEsperadoMin  += l.esperadoMin;
      totalSaldoMin     += l.saldoMin;
      totalValorExtra   += l.valorExtra;
      if (l.saldoMin < 0) totalDeficitMin += l.saldoMin;
      if (l.extraMin > 0 && !l.destinoBanco) {
        var isTrip = (l.tipoHE === 'especial' || l.tipoHE === 'feriado' || l.tipoHE === 'domingo');
        if (isTrip) { totalExtraMin200 += l.extraMin; totalValorExtra200 += l.valorExtra; }
        else        { totalExtraMin50  += l.extraMin; totalValorExtra50  += l.valorExtra; }
      }
    });

    // ── Resumo visual: quantos dias com jornada esperada foram batidos "completos" ──
    var diasEsperados = linhas.filter(function (l) { return l.esperadoMin > 0; }).length;
    var diasCompletos = linhas.filter(function (l) { return l.esperadoMin > 0 && l.trabMin >= l.esperadoMin - 5; }).length;
    var diasComAjuste = diasEsperados - diasCompletos;

    // ── Alerta de anomalia: HE muito alta num único dia (possível erro de ponto) ──
    var diaAnomalo = null;
    linhas.forEach(function (l) {
      if (l.extraMin >= LIMIAR_HE_ANOMALA_MIN && (!diaAnomalo || l.extraMin > diaAnomalo.extraMin)) diaAnomalo = l;
    });
    if (diaAnomalo && typeof window !== 'undefined' && window.confirm) {
      var confirmou = window.confirm(
        '⚠️ ' + (f.nome || 'Funcionário') + ' tem ' + _fmtMin(diaAnomalo.extraMin) +
        ' de hora extra no dia ' + _fmtData(diaAnomalo.data) + '.\n\n' +
        'Isso é bem mais que o normal — pode ser erro de importação/edição do ponto.\n\n' +
        'Confirma que está certo e quer gerar o relatório mesmo assim?'
      );
      if (!confirmou) return null;
    }

    var fin = _calcularFinanceiroDecendio(funcId, f, di, df, totalValorExtra, totalDeficitMin, valorHora, meusPags);

    var doc = new jsPDFClass({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    var pW = 210, pH = 297;
    var mL = 12, mR = 12;
    var cW = pW - mL - mR;

    var COR_HEADER   = [26, 54, 93];
    var COR_GOLD     = [185, 140, 50];
    var COR_VERDE    = [42, 130, 70];
    var COR_VERM     = [180, 60, 60];
    var COR_LARANJA  = [200, 120, 40];
    var COR_CINZA    = [180, 180, 180];
    var COR_TH_BG    = [235, 240, 248];
    var COR_LINHA_AL = [240, 248, 240];
    var COR_LINHA_VM = [255, 242, 242];
    var COR_LINHA_AM = [255, 252, 230];
    var COR_LINHA_AZ = [230, 242, 255];

    var y = 0;

    // ── CABEÇALHO ────────────────────────────────────────────────────────────
    doc.setFillColor.apply(doc, COR_HEADER);
    doc.rect(0, 0, pW, 20, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text('RELATÓRIO DE PONTO', pW / 2, 9, { align: 'center' });
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.text(f.nome || '', pW / 2, 15.5, { align: 'center' });
    doc.setFontSize(7.5);
    doc.setTextColor(200, 215, 240);
    doc.text(_mesExtenso(di, df) + '  ·  ' + fin.decNum + 'º período (' + _fmtData(di) + ' a ' + _fmtData(df) + ')', pW / 2, 19, { align: 'center' });

    y = 25;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    var depto = f.equipe || f.cargo || 'Marmoraria';
    doc.text('Departamento: ' + depto, mL, y);
    doc.text('Salário mensal: ' + _fmtMoeda(salario), pW - mR, y, { align: 'right' });

    y += 4;
    doc.setDrawColor.apply(doc, COR_HEADER);
    doc.setLineWidth(0.4);
    doc.line(mL, y, pW - mR, y);
    y += 5;

    // ── DE RELANCE — 3 linhas grandes, sem jargão, antes de qualquer detalhe ──
    var diasTrabalhados = linhas.filter(function (l) { return l.trabMin > 0; }).length;
    var totalExtraMinRelance = totalExtraMin50 + totalExtraMin200;
    var relanceH = 24;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor.apply(doc, COR_HEADER);
    doc.setLineWidth(0.5);
    doc.roundedRect(mL, y, cW, relanceH, 2, 2, 'FD');
    var ry = y + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(140, 140, 140);
    doc.text('DE RELANCE', mL + 4, ry - 2.5);
    ry += 3;
    doc.setFontSize(12.5);
    doc.setTextColor.apply(doc, fin.status === 'pago' ? COR_VERDE : COR_HEADER);
    doc.text((fin.status === 'pago' ? 'Já recebido: ' : 'Você vai receber: ') + _fmtMoeda(Math.abs(fin.saldoFinal)), mL + 4, ry);
    ry += 6.5;
    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text('Trabalhou ' + diasTrabalhados + (diasTrabalhados === 1 ? ' dia' : ' dias'), mL + 4, ry);
    if (totalExtraMinRelance > 0) {
      doc.setTextColor.apply(doc, COR_VERDE);
      doc.text('Tem ' + _fmtMin(totalExtraMinRelance) + ' de hora extra', mL + 65, ry);
    }
    y += relanceH + 4;

    // ── RESUMO FINANCEIRO — bloco em destaque, primeiro que tudo ──────────────
    // Créditos ganham um mini-card por registro (origem + obs explicada +
    // nota "a favor do funcionário"), então a altura precisa ser calculada
    // a partir do texto real (obs pode quebrar em mais de uma linha).
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    var creditosWrap = fin.creditosAlvo.map(function (c) {
      var obsLinhas = c.obs ? doc.splitTextToSize(c.obs, cW - 16) : [];
      return { c: c, obsLinhas: obsLinhas };
    });
    var creditosBoxH = creditosWrap.reduce(function (s, cw) {
      return s + 4.2 + cw.obsLinhas.length * 3.4 + 4.5;
    }, 0);

    var boxH = 8 + 6 + (totalValorExtra > 0 ? 6 : 0) +
               (totalExtraMin50  > 0 ? 4.2 : 0) +
               (totalExtraMin200 > 0 ? 4.2 : 0) +
               (fin.totalDeficitValor > 0 ? 6 : 0) +
               (fin.creditosAlvo.length > 0 ? 6 + creditosBoxH + 1.5 : 0) +
               (fin.adiantamentosAlvo.length > 0 ? 6 + fin.adiantamentosAlvo.length * 5 : 0) +
               (fin.totalPago > 0 ? 6 : 0) + 12;

    var corStatus = fin.status === 'pago' ? COR_VERDE : COR_GOLD;
    doc.setFillColor(fin.status === 'pago' ? 236 : 250, fin.status === 'pago' ? 246 : 244, fin.status === 'pago' ? 238 : 224);
    doc.setDrawColor.apply(doc, corStatus);
    doc.setLineWidth(0.5);
    doc.roundedRect(mL, y, cW, boxH, 2, 2, 'FD');

    var fy = y + 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor.apply(doc, COR_HEADER);
    doc.text('Resumo do ' + fin.decNum + 'º Período', mL + 4, fy);
    if (diasEsperados > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      if (diasComAjuste === 0) doc.setTextColor(42, 130, 70);
      else doc.setTextColor(190, 130, 40);
      doc.text(diasCompletos + ' de ' + diasEsperados + ' dias completos', pW - mR - 4, fy, { align: 'right' });
    }
    fy += 6;

    function _lin(label, valor, cor, negativo) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(60, 60, 60);
      doc.text(label, mL + 5, fy);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor.apply(doc, cor || [30, 30, 30]);
      doc.text((negativo ? '- ' : '') + _fmtMoeda(valor), pW - mR - 4, fy, { align: 'right' });
      fy += 5;
    }

    // Linha de detalhe menor, indentada — usada pra abrir o cálculo de
    // horas extras dobradas/triplicadas (quantidade × valor da hora).
    function _linSub(label, valor, cor) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(110, 110, 110);
      doc.text(label, mL + 8, fy);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor.apply(doc, cor || [110, 110, 110]);
      doc.text(_fmtMoeda(valor), pW - mR - 4, fy, { align: 'right' });
      fy += 4.2;
    }

    _lin('Salário fixo do período', fin.decValor, [30, 30, 30]);
    if (totalValorExtra > 0) _lin('+ Horas extras deste período (' + _fmtMin(totalExtraMin50 + totalExtraMin200) + ')', totalValorExtra, COR_VERDE);
    if (totalExtraMin50  > 0) _linSub('  · Dobrada ×2: ' + _fmtMin(totalExtraMin50)  + ' × ' + _fmtMoeda(valorHora * 2), totalValorExtra50,  COR_VERDE);
    if (totalExtraMin200 > 0) _linSub('  · Triplicada ×3: ' + _fmtMin(totalExtraMin200) + ' × ' + _fmtMoeda(valorHora * 3), totalValorExtra200, COR_VERDE);
    if (fin.totalDeficitValor > 0) _lin('- Horas negativas / faltantes (' + _fmtMin(Math.abs(totalDeficitMin)) + ')', fin.totalDeficitValor, COR_VERM, true);
    if (fin.creditosAlvo.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(40, 130, 90);
      doc.text('Créditos de período(s) anterior(es):', mL + 5, fy);
      fy += 4.2;
      creditosWrap.forEach(function (cw) {
        var c = cw.c;
        var origemLbl = (c.decNumOrigem ? c.decNumOrigem + 'º período' : 'Período anterior') +
          (c.mesRefOrigem ? ' de ' + _mesExtenso(c.mesRefOrigem + '-01', c.mesRefOrigem + '-01') : '');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(40, 130, 90);
        doc.text('  • ' + origemLbl + ' — ' + _fmtData(c.data), mL + 6, fy);
        doc.text('+ ' + _fmtMoeda(c.valor), pW - mR - 4, fy, { align: 'right' });
        fy += 4;
        if (cw.obsLinhas.length > 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(90, 90, 90);
          cw.obsLinhas.forEach(function (linha) {
            doc.text(linha, mL + 8, fy);
            fy += 3.4;
          });
        }
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.3);
        doc.setTextColor(90, 160, 110);
        doc.text('Esse valor é seu, não é desconto. Já está somado no total abaixo.', mL + 8, fy);
        fy += 4.5;
      });
      fy += 1.5;
    }
    if (fin.adiantamentosAlvo.length > 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(150, 110, 40);
      doc.text('Adiantamentos a descontar:', mL + 5, fy);
      fy += 4.2;
      fin.adiantamentosAlvo.forEach(function (a) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(90, 90, 90);
        doc.text('  • ' + _fmtData(a.data) + (a.obs ? ' — ' + a.obs : ''), mL + 6, fy);
        doc.setTextColor.apply(doc, COR_LARANJA);
        doc.text('- ' + _fmtMoeda(a.valor), pW - mR - 4, fy, { align: 'right' });
        fy += 4.2;
      });
      fy += 1.5;
    }
    if (fin.totalPago > 0) _lin('Já pago neste período', fin.totalPago, COR_VERM, true);

    fy += 1;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(mL + 4, fy, pW - mR - 4, fy);
    fy += 5.5;

    doc.setFillColor(fin.status === 'pago' ? 42 : 26, fin.status === 'pago' ? 130 : 54, fin.status === 'pago' ? 70 : 93);
    doc.roundedRect(mL + 3, fy - 4.5, cW - 6, 9, 1.5, 1.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(fin.status === 'pago' ? 'QUITADO' : 'TOTAL LÍQUIDO A PAGAR', mL + 6, fy + 1);
    doc.setFontSize(11);
    doc.text(_fmtMoeda(Math.abs(fin.saldoFinal)), pW - mR - 6, fy + 1.2, { align: 'right' });

    y += boxH + 4;

    // Faixinha de contexto: status dos outros 2 decêndios do mês
    if (fin.outrosDecendios.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      var lx2 = mL;
      fin.outrosDecendios.forEach(function (od) {
        var txt = od.num + 'º período: ' + (od.quitado ? '✅ pago' : '⏳ pendente') + ' (' + _fmtMoeda(od.valor) + ')';
        doc.setTextColor(od.quitado ? 42 : 190, od.quitado ? 130 : 130, od.quitado ? 70 : 40);
        doc.text(txt, lx2, y);
        lx2 += doc.getTextWidth(txt) + 8;
      });
      y += 5;
    }

    // Créditos em aberto ainda sem decêndio de destino — visibilidade geral
    if (fin.outrosCreditos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(40, 106, 62);
      doc.text('Créditos em aberto (sem destino escolhido)', mL, y);
      y += 4.2;
      fin.outrosCreditos.forEach(function (c) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(50, 50, 50);
        doc.text('• ' + _fmtData(c.data) + ' — ' + _fmtMoeda(c.valor), mL + 2, y);
        y += 3.8;
        if (c.obs) {
          doc.setFontSize(7);
          doc.setTextColor(110, 110, 110);
          var obsLinhas = doc.splitTextToSize(c.obs, cW - 10);
          obsLinhas.forEach(function (linha) { doc.text(linha, mL + 6, y); y += 3.4; });
        }
      });
      y += 1.5;
    }

    // Adiantamentos em aberto para OUTROS decêndios — visibilidade geral
    if (fin.outrosAdiantamentos.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(130, 130, 130);
      doc.text('Outros adiantamentos em aberto', mL, y);
      y += 4.2;
      fin.outrosAdiantamentos.forEach(function (a) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.8);
        doc.setTextColor(90, 90, 90);
        doc.text('• ' + _fmtData(a.data) + ' — ' + _fmtMoeda(a.valor) + ' (p/ ' + a.descontarDecendio + 'º período)', mL + 2, y);
        y += 3.8;
      });
      y += 1.5;
    }

    y += 2;

    // Colunas de almoço sempre aparecem — aqui na HR todo mundo bate o
    // ponto do almoço (mesmo comendo na empresa), então esconder a coluna
    // quando um dia vem sem essa batida passaria a impressão errada de
    // jornada contínua. Dias sem a batida mostram "Batida direta" (ver
    // cells abaixo) em vez de sumir a coluna inteira.
    var temAlmoco = true;

    // ── TABELA DE PONTO ─────────────────────────────────────────────────────
    var cols = [
      { header: 'Data',        w: 15, align: 'center' },
      { header: 'Dia',         w: 11, align: 'center' },
      { header: 'Entrada',     w: 19, align: 'center' },
      { header: 'Saída\nAlmoço', w: 19, align: 'center' },
      { header: 'Volta\nAlmoço', w: 19, align: 'center' },
      { header: 'Saída',       w: 19, align: 'center' },
      { header: 'Trabalhado',  w: 24, align: 'center' },
      { header: 'Esperado',    w: 22, align: 'center' },
      { header: 'Trabalhou a\nmais / Faltou',w: 38, align: 'center' },
    ];
    var totalW = cols.reduce(function(s, c){ return s + c.w; }, 0);
    var diff   = cW - totalW;
    cols[cols.length - 1].w += diff;

    var colX = [];
    var cx = mL;
    cols.forEach(function(c){ colX.push(cx); cx += c.w; });

    var rowH  = 6.3;
    var thH   = 8.6;

    function _headerTabela() {
      doc.setFillColor.apply(doc, COR_TH_BG);
      doc.rect(mL, y, cW, thH, 'F');
      doc.setDrawColor(180, 190, 210);
      doc.setLineWidth(0.2);
      doc.rect(mL, y, cW, thH, 'S');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.4);
      doc.setTextColor(30, 50, 90);
      cols.forEach(function(c, i) {
        var lines = c.header.split('\n');
        var tx = colX[i] + c.w / 2;
        var baseY = y + (lines.length === 2 ? 3.4 : 5.6);
        lines.forEach(function(line, li) {
          doc.text(line, tx, baseY + li * 3.3, { align: 'center' });
        });
      });
      y += thH;
    }

    _headerTabela();

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.6);

    var saldoIdx = cols.length - 1;

    linhas.forEach(function (l, idx) {
      if (y + rowH > pH - 18) {
        doc.addPage();
        y = 12;
        _headerTabela();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.6);
      }

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

      doc.setDrawColor(210, 215, 220);
      doc.setLineWidth(0.1);
      doc.line(mL, y + rowH, mL + cW, y + rowH);

      var cy = y + rowH - 1.9;
      var corTexto = [40, 40, 40];
      if (l.tipo === 'ausente') corTexto = [180, 60, 60];
      else if (l.autoComp)      corTexto = [160, 120, 20];
      doc.setTextColor.apply(doc, corTexto);

      var cells = [
        _fmtData(l.data), l.diaTxt, l.entrada, l.saidaAlm, l.voltaAlm, l.saida,
        _fmtMin(l.trabMin), l.esperadoMin > 0 ? _fmtMin(l.esperadoMin) : '—',
      ];
      cells.forEach(function (txt, i) {
        // Colunas 3 e 4 (Saída/Volta Almoço) — dia trabalhado sem batida de
        // almoço vira uma célula mesclada: "Batida direta" (itálico, cinza
        // de alerta) se ainda não foi revisado, ou "Direto" (neutro) se o
        // dono já confirmou na tela de correção que foi intencional.
        if ((l.almocoDireta || l.almocoDiretoConf) && i === 3) {
          doc.setFont('helvetica', 'italic');
          doc.setTextColor.apply(doc, l.almocoDireta ? [140, 140, 140] : [130, 150, 140]);
          doc.setFontSize(7.4);
          var wSpan = cols[3].w + cols[4].w;
          doc.text(l.almocoDireta ? 'Batida direta' : 'Direto (confirmado)', colX[3] + wSpan / 2, cy, { align: 'center' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.6);
          doc.setTextColor.apply(doc, corTexto);
          return;
        }
        if ((l.almocoDireta || l.almocoDiretoConf) && i === 4) return; // já desenhado mesclado acima
        var c = cols[i];
        doc.text(txt, colX[i] + c.w / 2, cy, { align: 'center' });
      });

      // Coluna final "Saldo do Dia" — uma célula só, colorida
      var saldoTxt, saldoCor;
      if (l.extraMin > 0 && !l.destinoBanco) {
        saldoTxt = '+' + _fmtMin(l.extraMin) + (l.tipoHE === 'especial' || l.tipoHE === 'feriado' || l.tipoHE === 'domingo' ? ' (triplicado)' : ' (dobrado)');
        saldoCor = [40, 130, 70];
      } else if (l.saldoMin < -5) {
        saldoTxt = _fmtMin(l.saldoMin);
        saldoCor = [180, 60, 60];
      } else {
        saldoTxt = '—';
        saldoCor = [150, 150, 150];
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.6);
      doc.setTextColor.apply(doc, saldoCor);
      doc.text(saldoTxt, colX[saldoIdx] + cols[saldoIdx].w / 2, cy, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.6);

      y += rowH;
    });

    // Observações
    y += 2;
    var obsLinhas = [];
    linhas.forEach(function(l) {
      if (l.tipo === 'feriado') {
        obsLinhas.push('•' + _fmtData(l.data) + ': feriado' + (l.obs && l.obs.indexOf('meio') !== -1 ? ' meio período' : '') + (l.excDescricao ? ' (' + l.excDescricao + ')' : ''));
      } else if (l.tipo === 'acordo') {
        obsLinhas.push('•' + _fmtData(l.data) + ': acordo' + (l.excDescricao ? ' (' + l.excDescricao + ')' : ''));
      } else if (l.autoComp) {
        obsLinhas.push('•' + _fmtData(l.data) + ': horário incompleto');
      }
    });
    if (obsLinhas.length > 0) {
      if (y + 6 > pH - 15) { doc.addPage(); y = 15; }
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(80, 80, 80);
      doc.text('Observações: ' + obsLinhas.join(' | '), mL, y, { maxWidth: cW });
      y += 5;
    }

    // Aviso de déficit, se houver — o resto (valor hora, ×2, ×3) já está
    // explicado no card de resumo do topo, então não repete aqui.
    if (totalDeficitMin < 0) {
      if (y + 8 > pH - 15) { doc.addPage(); y = 15; }
      y += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(180, 60, 60);
      doc.text('Atenção: faltaram ' + _fmtMin(Math.abs(totalDeficitMin)) + ' no período (já descontado do total acima).', mL, y, { maxWidth: cW });
      y += 6;
    }
    y += 2;

    // Legenda de cores
    var legItems = [
      { cor: COR_HEADER,    txt: 'Azul = feriado/acordo' },
      { cor: [200, 180, 80], txt: 'Amarelo = incompleto' },
      { cor: [50, 150, 70],  txt: 'Verde = horas extras' },
      { cor: [180, 60, 60],  txt: 'Vermelho = déficit' },
    ];
    if (y + 6 > pH - 12) { doc.addPage(); y = 15; }
    doc.setFontSize(6);
    var lx = mL;
    legItems.forEach(function(item) {
      doc.setFillColor.apply(doc, item.cor);
      doc.rect(lx, y, 3, 3, 'F');
      doc.setTextColor(60, 60, 60);
      doc.text(item.txt, lx + 4.5, y + 2.5);
      lx += 42;
    });
    y += 7;

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(6);
    var agora = new Date();
    var dtGer = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    doc.text('Documento gerado em ' + dtGer + ' · HR Mármores e Granitos', pW / 2, y, { align: 'center' });

    if (WPP_CONTATO_RH) {
      y += 6;
      var msgContest = 'Olá! Sobre meu relatório de ponto (' + (f.nome || '') + ', ' + _mesExtenso(di, df) + '): tenho uma dúvida ou algo não bate.';
      var urlContest = 'https://wa.me/55' + WPP_CONTATO_RH + '?text=' + encodeURIComponent(msgContest);
      doc.setFillColor(230, 246, 234);
      doc.setDrawColor(120, 190, 140);
      doc.setLineWidth(0.4);
      doc.roundedRect(mL + 20, y - 5, cW - 40, 8, 1.5, 1.5, 'FD');
      doc.setTextColor(20, 110, 55);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.textWithLink('📩 Dúvida ou algo não bate? Toque aqui e fale com o RH', pW / 2, y, { align: 'center', url: urlContest });
    }

    // ── Prepara dados de saída ────────────────────────────────────────────────
    var nomeFmt = (f.nome || 'func').replace(/\s+/g, '_').toLowerCase();
    var mesFmt  = di.slice(0, 7).replace('-', '') + '_' + di.slice(8,10) + '_' + df.slice(8,10);
    var fileName = 'relatorio_ponto_' + nomeFmt + '_' + mesFmt + '.pdf';
    var mesRef   = _mesExtenso(di, df) + ' (' + di.slice(8,10) + '-' + df.slice(8,10) + ')';
    var telFunc  = f.telefone || f.tel || '';

    var htmlPreview = _gerarHtmlRelatorio(f, linhas, di, df, totalExtraMin50, totalExtraMin200,
      totalValorExtra, totalDeficitMin, meusPags, salario, valorHora, fin, totalValorExtra50, totalValorExtra200);

    var pdfBlobFn = function() { return doc.output('blob'); };

    var valorMsg = (fin.status === 'pago' ? 'já quitado' : _fmtMoeda(Math.abs(fin.saldoFinal)));
    _abrirOverlayPonto(htmlPreview, pdfBlobFn, fileName, f.nome || 'Funcionário', mesRef, telFunc, valorMsg, fin.status === 'pago');
  }

  // ─── Gerador HTML do relatório (para preview via html2canvas) ────────────────

  function _gerarHtmlRelatorio(f, linhas, di, df, totalExtraMin50, totalExtraMin200,
    totalValorExtra, totalDeficitMin, meusPags, salario, valorHora, fin, totalValorExtra50, totalValorExtra200) {

    var mesRef = _mesExtenso(di, df);
    var depto  = f.equipe || f.cargo || 'Marmoraria';
    var diasEsperados = linhas.filter(function (l) { return l.esperadoMin > 0; }).length;
    var diasCompletos = linhas.filter(function (l) { return l.esperadoMin > 0 && l.trabMin >= l.esperadoMin - 5; }).length;
    var diasComAjuste = diasEsperados - diasCompletos;
    var diasTrabalhados = linhas.filter(function (l) { return l.trabMin > 0; }).length;
    var totalExtraMinRelance = totalExtraMin50 + totalExtraMin200;

    // Colunas de almoço sempre aparecem — todo mundo na HR bate o ponto do
    // almoço (mesmo comendo na empresa). Dias sem essa batida não somem a
    // coluna; mostram "Batida direta" (ver rowsHtml) pra deixar claro que
    // é uma falta de registro, não jornada contínua sem intervalo.
    var temAlmoco = true;

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

      var saldoDiaHtml;
      if (l.extraMin>0 && !l.destinoBanco) {
        saldoDiaHtml = '<span style="color:#2a8a46;font-weight:700;">+'+fmtMin(l.extraMin)+(l.tipoHE==='especial'||l.tipoHE==='feriado'||l.tipoHE==='domingo'?' (triplicado)':' (dobrado)')+'</span>';
      } else if (l.saldoMin<-5) {
        saldoDiaHtml = '<span style="color:#b43c3c;font-weight:700;">'+fmtMin(l.saldoMin)+'</span>';
      } else {
        saldoDiaHtml = '<span style="color:#aaa;">—</span>';
      }

      rowsHtml +=
        '<tr style="background:'+bg+';">'+
        '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+fmtData(l.data)+'</td>'+
        '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+l.diaTxt+'</td>'+
        '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+l.entrada+'</td>'+
        (l.almocoDireta
          ? '<td colspan="2" style="text-align:center;padding:7px 5px;font-size:12px;font-style:italic;color:#999;">Batida direta</td>'
          : (l.almocoDiretoConf
              ? '<td colspan="2" style="text-align:center;padding:7px 5px;font-size:12px;font-style:italic;color:#7a9a85;">Direto (confirmado)</td>'
              : '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+l.saidaAlm+'</td>'+
                '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+l.voltaAlm+'</td>'
            )
        )+
        '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+l.saida+'</td>'+
        '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+fmtMin(l.trabMin)+'</td>'+
        '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+(l.esperadoMin>0?fmtMin(l.esperadoMin):'—')+'</td>'+
        '<td style="text-align:center;padding:7px 5px;font-size:13.5px;">'+saldoDiaHtml+'</td>'+
        '</tr>';
    });

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

    // ── Bloco de resumo financeiro — a peça central do novo design ────────────
    var statusCorBg  = fin.status === 'pago' ? '#eaf7ee' : '#fdf7e6';
    var statusCorBd  = fin.status === 'pago' ? '#8fcf9f' : '#e8c877';
    var faixaCor     = fin.status === 'pago' ? '#2a8a46' : '#1a3660';

    var linhasResumo = '';
    linhasResumo += '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:17px;">'+
      '<span style="color:#444;">Salário fixo do período</span>'+
      '<span style="font-weight:700;color:#222;">'+fmtMoeda(fin.decValor)+'</span></div>';

    if (totalValorExtra > 0) {
      linhasResumo += '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:17px;">'+
        '<span style="color:#2a8a46;">+ Horas extras deste período ('+fmtMin(totalExtraMin50+totalExtraMin200)+')</span>'+
        '<span style="font-weight:700;color:#2a8a46;">'+fmtMoeda(totalValorExtra)+'</span></div>';
    }
    if (totalExtraMin50 > 0) {
      linhasResumo += '<div style="display:flex;justify-content:space-between;padding:2px 0 2px 14px;font-size:13px;">'+
        '<span style="color:#5a8a68;">· Dobrada ×2: '+_esc(fmtMin(totalExtraMin50))+' × '+fmtMoeda(valorHora*2)+'</span>'+
        '<span style="color:#5a8a68;">'+fmtMoeda(totalValorExtra50)+'</span></div>';
    }
    if (totalExtraMin200 > 0) {
      linhasResumo += '<div style="display:flex;justify-content:space-between;padding:2px 0 6px 14px;font-size:13px;">'+
        '<span style="color:#5a8a68;">· Triplicada ×3: '+_esc(fmtMin(totalExtraMin200))+' × '+fmtMoeda(valorHora*3)+'</span>'+
        '<span style="color:#5a8a68;">'+fmtMoeda(totalValorExtra200)+'</span></div>';
    }

    if (fin.totalDeficitValor > 0) {
      linhasResumo += '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:17px;">'+
        '<span style="color:#b43c3c;">− Horas negativas / faltantes ('+_esc(fmtMin(Math.abs(totalDeficitMin)))+')</span>'+
        '<span style="font-weight:700;color:#b43c3c;">− '+fmtMoeda(fin.totalDeficitValor)+'</span></div>';
    }

    if (fin.creditosAlvo.length > 0) {
      linhasResumo += '<div style="font-size:15px;color:#2a8a5a;font-weight:700;padding:8px 0 4px;">+ Horas extras acumuladas de período(s) anterior(es):</div>';
      fin.creditosAlvo.forEach(function(c){
        var origemLbl = (c.decNumOrigem ? c.decNumOrigem+'º período' : 'Período anterior') +
          (c.mesRefOrigem ? ' de '+_mesExtenso(c.mesRefOrigem+'-01', c.mesRefOrigem+'-01') : '');
        // c.obs já vem pronto explicando os dias (ex: "Horas extras de 01 a 10/07 (3.0h) acumuladas...")
        linhasResumo +=
          '<div style="margin:5px 0 5px 6px;padding:10px 12px;background:#f2faf4;border:1px solid #cfe9d6;border-radius:6px;">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;">'+
              '<span style="font-size:15px;color:#2a6a3e;font-weight:700;">💳 '+origemLbl+'</span>'+
              '<span style="color:#2a8a5a;font-weight:800;font-size:17px;">+ '+fmtMoeda(c.valor)+'</span>'+
            '</div>'+
            (c.obs ? '<div style="font-size:14px;color:#3a3a3a;margin-top:5px;line-height:1.45;">'+_esc(c.obs)+'</div>' : '')+
          '</div>';
      });
    }

    if (fin.adiantamentosAlvo.length > 0) {
      linhasResumo += '<div style="font-size:15px;color:#a67a2a;font-weight:700;padding:8px 0 4px;">− Adiantamentos a descontar:</div>';
      fin.adiantamentosAlvo.forEach(function(a){
        linhasResumo += '<div style="display:flex;justify-content:space-between;padding:4px 0 4px 10px;font-size:15.5px;">'+
          '<span style="color:#666;">• '+fmtData(a.data)+(a.obs?' — '+_esc(a.obs):'')+'</span>'+
          '<span style="color:#c07a2a;font-weight:700;">− '+fmtMoeda(a.valor)+'</span></div>';
      });
    }

    if (fin.totalPago > 0) {
      linhasResumo += '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:17px;border-top:1px dashed #ddd;margin-top:6px;">'+
        '<span style="color:#b43c3c;">Já pago neste período</span>'+
        '<span style="font-weight:700;color:#b43c3c;">− '+fmtMoeda(fin.totalPago)+'</span></div>';
    }

    var outrosDecendiosHtml = '';
    if (fin.outrosDecendios.length > 0) {
      outrosDecendiosHtml = '<div style="display:flex;gap:14px;margin-top:10px;font-size:14.5px;color:#777;flex-wrap:wrap;">'+
        fin.outrosDecendios.map(function(od){
          return (od.quitado ? '<span style="color:#2a8a46;">✅ '+od.num+'º período pago ('+fmtMoeda(od.valor)+')</span>'
                              : '<span style="color:#a67a2a;">⏳ '+od.num+'º período pendente ('+fmtMoeda(od.valor)+')</span>');
        }).join('')+
      '</div>';
    }

    var outrosCreditosHtml = '';
    if (fin.outrosCreditos.length > 0) {
      outrosCreditosHtml = '<div style="margin-top:8px;padding:10px 12px;background:#eef8f0;border:1px solid #cfe9d6;border-radius:6px;">'+
        '<div style="font-size:14.5px;color:#2a6a3e;font-weight:700;margin-bottom:5px;">Créditos em aberto (ainda sem período definido)</div>'+
        fin.outrosCreditos.map(function(c){
          return '<div style="font-size:14.5px;color:#333;line-height:1.5;margin-bottom:3px;">'+
            '• '+fmtData(c.data)+' — <b style="color:#2a8a5a;">'+fmtMoeda(c.valor)+'</b>'+
            (c.obs?'<div style="font-size:13.5px;color:#666;margin:2px 0 4px 10px;">'+_esc(c.obs)+'</div>':'')+
          '</div>';
        }).join('')+
      '</div>';
    }

    var outrosAdiantamentosHtml = '';
    if (fin.outrosAdiantamentos.length > 0) {
      outrosAdiantamentosHtml = '<div style="margin-top:8px;padding:10px 12px;background:#f7f7f7;border:1px solid #e2e2e2;border-radius:6px;">'+
        '<div style="font-size:14.5px;color:#777;font-weight:700;margin-bottom:5px;">Outros adiantamentos em aberto</div>'+
        fin.outrosAdiantamentos.map(function(a){
          return '<div style="font-size:14.5px;color:#555;line-height:1.5;margin-bottom:3px;">'+
            '• '+fmtData(a.data)+' — '+fmtMoeda(a.valor)+' <span style="color:#999;">(p/ '+a.descontarDecendio+'º período)</span>'+
          '</div>';
        }).join('')+
      '</div>';
    }

    // Colunas da tabela — Saída/Volta Almoço só entram se alguém realmente bate almoço
    var colsHead =
      '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Data</th>'+
      '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Dia</th>'+
      '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Entrada</th>'+
      (temAlmoco ? '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Saída<br>Almoço</th>' : '')+
      (temAlmoco ? '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Volta<br>Almoço</th>' : '')+
      '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Saída</th>'+
      '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Trabalhado</th>'+
      '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Esperado</th>'+
      '<th style="padding:8px 5px;font-size:12.5px;text-align:center;border:1px solid #ccd6e0;">Trabalhou a mais<br>/ Faltou</th>';

    // Rodapé técnico — só o essencial (déficit, se houver), sem jargão.
    // O resto (valor hora, ×2, ×3) já está explicado no card do topo.
    var rodapeTecnico = totalDeficitMin < 0
      ? '<div style="font-size:13px;color:#b43c3c;margin-top:8px;">⚠️ Faltaram '+fmtMin(Math.abs(totalDeficitMin))+' no período (já descontado do total acima).</div>'
      : '';

    return '<div style="font-family:Arial,sans-serif;background:#fff;padding:16px 20px;color:#111;width:754px;box-sizing:border-box;">'+

      // Cabeçalho
      '<div style="background:#1a3660;color:#fff;text-align:center;padding:12px 0 8px;border-radius:6px 6px 0 0;">'+
        '<div style="font-size:18px;font-weight:700;letter-spacing:1px;">RELATÓRIO DE PONTO</div>'+
        '<div style="font-size:13px;margin-top:3px;">'+_esc(f.nome||'')+'</div>'+
        '<div style="font-size:11px;opacity:.85;margin-top:2px;">'+mesRef+' · '+fin.decNum+'º período ('+fmtData(di)+' a '+fmtData(df)+')</div>'+
      '</div>'+

      '<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 4px;border-bottom:2px solid #1a3660;font-size:14px;">'+
        '<div>Departamento: '+_esc(depto)+'</div>'+
        '<div><b>Salário mensal: '+fmtMoeda(salario)+'</b></div>'+
      '</div>'+

      // ── DE RELANCE — 3 linhas grandes, sem jargão, sem tabela ──────────────
      '<div style="background:#fff;border:2px solid #1a3660;border-radius:8px;padding:14px 16px;margin-top:12px;">'+
        '<div style="font-size:11px;color:#999;font-weight:700;letter-spacing:.5px;margin-bottom:6px;">DE RELANCE</div>'+
        '<div style="font-size:21px;font-weight:800;color:'+(fin.status==='pago'?'#2a8a46':'#1a3660')+';margin-bottom:5px;">'+(fin.status==='pago'?'✅ Já recebido: ':'💰 Você vai receber: ')+fmtMoeda(Math.abs(fin.saldoFinal))+'</div>'+
        '<div style="display:flex;gap:22px;flex-wrap:wrap;">'+
          '<div style="font-size:16px;color:#333;">📅 Trabalhou '+diasTrabalhados+(diasTrabalhados===1?' dia':' dias')+'</div>'+
          (totalExtraMinRelance>0 ? '<div style="font-size:16px;color:#2a8a46;font-weight:700;">⏱ Tem '+fmtMin(totalExtraMinRelance)+' de hora extra</div>' : '<div style="font-size:14px;color:#999;">Sem hora extra neste período</div>')+
        '</div>'+
      '</div>'+

      // ── RESUMO FINANCEIRO — bloco principal, logo no topo ──────────────────
      '<div style="background:'+statusCorBg+';border:1.5px solid '+statusCorBd+';border-radius:8px;padding:14px 16px;margin-top:12px;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'+
          '<div style="font-size:17px;font-weight:700;color:#1a3660;">💰 Resumo do '+fin.decNum+'º Período</div>'+
          (diasEsperados>0 ? '<div style="font-size:13.5px;font-weight:700;color:'+(diasComAjuste===0?'#2a8246':'#be8228')+';">'+(diasComAjuste===0?'✅ ':'⏳ ')+diasCompletos+' de '+diasEsperados+' dias completos</div>' : '')+
        '</div>'+
        linhasResumo+
        '<div style="background:'+faixaCor+';border-radius:6px;padding:12px 16px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;">'+
          '<span style="color:#fff;font-size:16px;font-weight:700;">'+(fin.status==='pago'?'✅ QUITADO':'💰 TOTAL LÍQUIDO A PAGAR')+'</span>'+
          '<span style="color:#fff;font-size:22px;font-weight:800;">'+fmtMoeda(Math.abs(fin.saldoFinal))+'</span>'+
        '</div>'+
        outrosDecendiosHtml+
        outrosCreditosHtml+
        outrosAdiantamentosHtml+
      '</div>'+

      // Tabela — só o ponto, limpo
      '<div style="font-size:14px;font-weight:700;color:#1a3660;margin-top:16px;margin-bottom:6px;">🕐 Relatório de Ponto</div>'+
      '<table style="width:100%;border-collapse:collapse;">'+
        '<thead><tr style="background:#eaf0f8;color:#1a3660;">'+colsHead+'</tr></thead>'+
        '<tbody>'+rowsHtml+'</tbody>'+
      '</table>'+

      (obsHtml ? '<div style="font-size:11.5px;color:#555;font-style:italic;margin-top:8px;">Observações: '+obsHtml+'</div>' : '')+

      rodapeTecnico+

      // Legenda
      '<div style="display:flex;gap:16px;margin-top:12px;flex-wrap:wrap;font-size:12px;color:#555;">'+
        '<span><span style="display:inline-block;width:11px;height:11px;background:#e6f2ff;border:1px solid #ccc;margin-right:3px;vertical-align:middle;"></span>Azul = feriado/acordo</span>'+
        '<span><span style="display:inline-block;width:11px;height:11px;background:#fffce6;border:1px solid #ccc;margin-right:3px;vertical-align:middle;"></span>Amarelo = incompleto</span>'+
        '<span><span style="display:inline-block;width:11px;height:11px;background:#f0fff0;border:1px solid #ccc;margin-right:3px;vertical-align:middle;"></span>Verde = horas extras</span>'+
        '<span><span style="display:inline-block;width:11px;height:11px;background:#fff2f2;border:1px solid #ccc;margin-right:3px;vertical-align:middle;"></span>Vermelho = déficit</span>'+
      '</div>'+

      '<div style="text-align:center;font-size:9px;color:#aaa;margin-top:12px;">Documento gerado em '+dtGer+' · HR Mármores e Granitos</div>'+
      (WPP_CONTATO_RH ? '<div style="text-align:center;margin-top:10px;"><a href="https://wa.me/55'+WPP_CONTATO_RH+'?text='+encodeURIComponent('Olá! Sobre meu relatório de ponto ('+(f.nome||'')+', '+mesRef+'): tenho uma dúvida ou algo não bate.')+'" style="display:inline-block;background:#e6f6ea;border:1px solid #78be8c;border-radius:6px;padding:8px 14px;font-size:13px;color:#146e37;font-weight:700;text-decoration:none;">📩 Dúvida ou algo não bate? Toque aqui e fale com o RH</a></div>' : '')+
    '</div>';
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  return {
    gerarPDF: gerarPDF,
  };

})();
