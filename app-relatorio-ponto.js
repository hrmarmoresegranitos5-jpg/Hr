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

  /**
   * Rótulo do saldo do dia — agora um dia pode ter parte dobrada e parte
   * triplicada ao mesmo tempo (ex: chegou alguns minutos antes das 7h: só
   * esses minutos são ×3, o resto do dia continua ×2). Mostra o detalhe
   * quando misto, em vez de rotular o dia inteiro como se fosse uma coisa só.
   */
  function _rotuloHE(l) {
    var e200 = l.extra200Min || 0, e50 = l.extra50Min || 0;
    if (e200 > 0 && e50 > 0) return ' (' + _fmtMin(e50) + ' ×2 + ' + _fmtMin(e200) + ' ×3)';
    if (e200 > 0) return ' (triplicado)';
    return ' (dobrado)';
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
    // CORREÇÃO: alerta (não bloqueia) se a jornada cadastrada for maior
    // que o padrão de 8h — isso zera a hora extra silenciosamente no
    // relatório (bug encontrado no cadastro do Fabrício).
    if (jornDia > 480 && typeof console !== 'undefined') {
      console.warn('[HR] ' + (f.nome || '?') + ' tem jornadaDiariaMin=' + jornDia + 'min (>8h) — relatório só conta extra acima disso.');
    }

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

      // Falta justificada (atestado) aprovada pelo dono no ponto pelo celular: dia sem jornada, não desconta
      if (r && r.tipo === 'abonado') {
        esperadoMin = 0; compensarMin = 0;
        obsExcecao = 'falta abonada' + (r.motivoAbono ? ' — ' + r.motivoAbono : '');
      }
      if (r) {
        var trabMin       = Math.round((parseFloat(r.horas) || 0) * 60);

        // ── Janela noturna 00:00–07:00: sempre triplicada, pra todo mundo ──
        // Minutos trabalhados nesse horário (madrugada ou virada de turno)
        // são tirados do cálculo de jornada esperada e sempre viram HE ×3,
        // mesmo em um dia que fecharia no negativo sem eles — não fica
        // "escondido" dentro de um déficit do dia.
        var minNoturno = (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.minutosNoturnos === 'function')
          ? HR_IMPORT.minutosNoturnos(r.entrada || '', r.saida || '') : 0;
        var trabDiurno = Math.max(0, trabMin - minNoturno);

        // Extra/déficit agora SEMPRE vêm do saldo real do dia (trabalhado −
        // esperado), calculado aqui — não mais do campo r.extra salvo na
        // importação. Aquele valor foi calculado ANTES de qualquer exceção
        // (feriado meio período, acordo, "Direto confirmado") ser lançada
        // na tela de correção, então ficava desatualizado sempre que o
        // esperado do dia mudava depois do import — fazendo o relatório
        // mostrar "—" (sem HE) em dias que na verdade tiveram extra real.
        var brutoExtraDia = Math.max(0, trabDiurno - esperadoMin);
        // Desconta a compensação ANTES de classificar/multiplicar — as horas
        // descontadas não são pagas nem triplicadas, só abatem a folga devida.
        compensarMin      = Math.min(brutoExtraDia, compensarMin);
        var saldoMin      = (trabDiurno - esperadoMin - compensarMin) + minNoturno;
        var extraMin      = Math.max(0, saldoMin);
        if (compensarMin > 0) {
          obsExcecao += (obsExcecao ? ' — ' : '') + 'descontadas ' + _fmtMin(compensarMin) + ' (compensação)';
        }
        if (minNoturno > 0) {
          obsExcecao += (obsExcecao ? ' — ' : '') + _fmtMin(minNoturno) + ' em horário noturno (00h–07h), triplicado';
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
        var temNoturno = minNoturno > 0;
        if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT._classificarHE === 'function') {
          var classeHE = HR_IMPORT._classificarHE({
            data: iso, extra: extraMin,
            entrada: r.entrada || '', saida: r.saida || '',
            funcId: funcId || null
          });
          if (feriadoLocalForcaTriplo) {
            classeHE = { extra50: 0, extra100: 0, extra200: extraMin };
          }
          // Não força mais o dia inteiro pra triplicada só por ter minutos
          // noturnos (antes de 07h) ou depois das 18h — _classificarHE já
          // calcula isso PROPORCIONALMENTE internamente (só o excedente ao
          // limite vira ×3, o resto continua ×2). Antes, um funcionário que
          // chegasse alguns minutos antes das 7h tinha o dia inteiro de HE
          // pago como triplicada, o que superpagava bastante.
          if (extraMin > 0 && r.destinoExtra !== 'banco') {
            valorExtra = (classeHE.extra200 / 60) * 3.0 * valorHora +
                         (classeHE.extra100 / 60) * 3.0 * valorHora +
                         (classeHE.extra50  / 60) * 2.0 * valorHora;
          }
          if (classeHE.extra200 > 0 || classeHE.extra100 > 0) tipoHE = 'especial';
        } else {
          // Fallback (HR_IMPORT indisponível) — mantém regra antiga só como rede de segurança
          var _ehTriplado = (dow === 0) || feriadoLocalForcaTriplo || temNoturno;
          tipoHE = _ehTriplado ? 'especial' : 'normal';
          if (extraMin > 0 && r.destinoExtra !== 'banco') {
            valorExtra = (extraMin / 60) * (_ehTriplado ? 3.0 : 2.0) * valorHora;
          }
          var classeHE = _ehTriplado ? { extra50: 0, extra100: 0, extra200: extraMin } : { extra50: extraMin, extra100: 0, extra200: 0 };
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
          // Minutos de HE por faixa (proporcional — um dia pode ter parte
          // dobrada e parte triplicada ao mesmo tempo, ex: chegou 6min antes
          // das 7h). Usado na agregação do período e no rótulo do dia.
          extra50Min:  classeHE.extra50  || 0,
          extra200Min: (classeHE.extra100 || 0) + (classeHE.extra200 || 0),
          obs:        obs,
          tipo:       tipoLinha,
          autoComp:   !!r.autoCompletado,
          destinoBanco: r.destinoExtra === 'banco',
          excDescricao: exc ? (exc.descricao || '') : '',
          minNoturno: minNoturno,
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
    var _quinz = !!(f && !f.socio && f.periodicidade === 'quinzenal');
    var decNum = _quinz ? (parseInt(diaIni, 10) >= 16 ? 2 : 1) : (diaIni === '01' ? 1 : (diaIni === '11' ? 2 : 3));
    var mesRef = di.slice(0, 7);

    var salario  = parseFloat(f.salario) || 0;
    var decValor = parseFloat(f['dec' + decNum]) || (salario / (_quinz ? 2 : 3));

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
    // Crédito de OVERPAGO (empresa pagou a mais antes) desconta, igual adiantamento:
    // entra na mesma lista para aparecer como linha de desconto no relatório.
    var _overpagos = (typeof HR_FUNC !== 'undefined' && HR_FUNC._creditosAlvoDecendio)
      ? HR_FUNC._creditosAlvoDecendio(funcId, decNum, mesRef) : [];
    adiantamentosAlvo = adiantamentosAlvo.concat(_overpagos.map(function (c) {
      return { id: c.id, data: c.data, valor: c.valor, obs: 'Crédito de overpago' + (c.obs ? ' — ' + c.obs : '') };
    }));
    var totalAdiantamentos = adiantamentosAlvo.reduce(function (s, a) { return s + (parseFloat(a.valor) || 0); }, 0);

    // Outros adiantamentos em aberto do funcionário (apontados p/ outros decêndios) — informativo
    var todosAbertos = (typeof HR_FUNC !== 'undefined' && HR_FUNC._adiantamentosEmAberto)
      ? HR_FUNC._adiantamentosEmAberto(funcId) : [];
    var idsAlvo = {};
    adiantamentosAlvo.forEach(function (a) { idsAlvo[a.id] = true; });
    var outrosAdiantamentos = todosAbertos.filter(function (a) { return !idsAlvo[a.id]; });

    // Créditos (overpago em decêndio anterior) apontados especificamente para este —
    // mesmo padrão dos adiantamentos, só que somam ao invés de descontar.
    var creditosAlvo = (typeof HR_FUNC !== 'undefined' && HR_FUNC._creditosHEDecendio)
      ? HR_FUNC._creditosHEDecendio(funcId, decNum, mesRef) : [];
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

    // Restante deste decêndio que foi passado pro decêndio seguinte (não é mais devido aqui)
    var pendSai = (typeof HR_FUNC !== 'undefined' && HR_FUNC._pendSaiDecendio)
      ? HR_FUNC._pendSaiDecendio(funcId, decNum, mesRef) : [];
    var totalPendSai = pendSai.reduce(function (s, c) { return s + (parseFloat(c.valor) || 0); }, 0);

    var totalDevido  = decValor + totalValorExtra - totalDeficitValor;
    var totalLiquido = totalDevido - totalAdiantamentos + totalCreditos - totalPendSai;
    var saldoFinal    = totalLiquido - totalPago;
    var status = saldoFinal <= 0.5 ? 'pago' : 'pendente';

    // Status resumido dos outros 2 decêndios do mês (para a faixinha de contexto)
    var pagsTodoMes = {};
    try { pagsTodoMes = HR_FUNC ? HR_FUNC.getPagamentos() : {}; } catch (e) {}
    function _statusOutroDecendio(num) {
      if (num === decNum) return null;
      var per = (typeof HR_FUNC !== 'undefined' && HR_FUNC._periodoDecendio)
        ? HR_FUNC._periodoDecendio(num, mesRef, f) : null;
      if (!per) return null;
      var valorDec = parseFloat(f['dec' + num]) || (salario / (_quinz ? 2 : 3));
      var pago = Object.values(pagsTodoMes).filter(function (p) {
        return p.funcionarioId == funcId && p.tipo === 'decendio' && p.data >= per.di && p.data <= per.df;
      }).reduce(function (s, p) { return s + (parseFloat(p.valor) || 0); }, 0);
      return { num: num, di: per.di, df: per.df, valor: valorDec, pago: pago, quitado: pago >= valorDec - 0.5 };
    }
    var outrosDecendios = (_quinz ? [1, 2] : [1, 2, 3]).map(_statusOutroDecendio).filter(function (x) { return x; });

    return {
      decNum: decNum, mesRef: mesRef, decValor: decValor,
      totalDeficitValor: totalDeficitValor,
      totalPagoDecendio: totalPagoDecendio, totalPagoOutros: totalPagoOutros, totalPago: totalPago,
      adiantamentosAlvo: adiantamentosAlvo, totalAdiantamentos: totalAdiantamentos,
      outrosAdiantamentos: outrosAdiantamentos,
      creditosAlvo: creditosAlvo, totalCreditos: totalCreditos, outrosCreditos: outrosCreditos,
      pendSai: pendSai, totalPendSai: totalPendSai,
      totalDevido: totalDevido, totalLiquido: totalLiquido, saldoFinal: saldoFinal,
      status: status, outrosDecendios: outrosDecendios
    };
  }

  // ─── Resumo financeiro (usado no PDF e na pré-visualização) ──────────────────
  // Só o que entra na conta do período, explicado em linguagem simples:
  // horas dobradas (×2), triplicadas (×3), horas negativas e o quanto
  // elas tiraram do valor. Nada de outros períodos nem adiantamentos de
  // outras datas: isso confunde o funcionário.
  // info: { extraBrutoMin, deficitBrutoMin, deficitAbatidoMin, e50Min, e200Min,
  //         v50, v200 (BRUTOS, antes de abater as negativas), valorExtraLiq, totalDeficitMin }
  function _linhasResumoFin(fin, info) {
    var VERDE = [42, 130, 70], VERM = [180, 60, 60], LARANJA = [200, 120, 40], NEUTRO = [30, 30, 30];
    var horas = [];

    var rows = [];
    rows.push({ label: 'Salário do período', valor: fin.decValor, sinal: '', cor: NEUTRO });
    if ((info.e50Min + info.e200Min) > 0) {
      rows.push({ label: 'Horas extras (' + _hmC(info.e50Min + info.e200Min) + ')', valor: info.v50 + info.v200, sinal: '+', cor: VERDE });
      if (info.e50Min > 0)  rows.push({ sub: true, label: _hmC(info.e50Min) + ' em dobro (×2)',   valor: info.v50 });
      if (info.e200Min > 0) rows.push({ sub: true, label: _hmC(info.e200Min) + ' em triplo (×3)', valor: info.v200 });
    }
    // Quanto as horas negativas tiraram do valor: a parte que abateu as extras
    // (extras brutas − extras líquidas) + a parte que sobrou e saiu do salário.
    var valorNegativas = Math.max(0, (info.v50 + info.v200) - info.valorExtraLiq) + (fin.totalDeficitValor || 0);
    if (info.deficitBrutoMin > 0 && valorNegativas > 0.005) {
      rows.push({ label: 'Horas faltando (' + _hmC(info.deficitBrutoMin) + ')', valor: valorNegativas, sinal: '-', cor: VERM });
      var nota = 'As horas negativas são descontadas primeiro das horas extras dobradas (×2); as triplicadas (×3) só entram se as dobradas não bastarem.';
      if ((fin.totalDeficitValor || 0) > 0.005) nota += ' O que as extras não cobriram foi descontado do salário.';
      rows.push({ nota: nota });
    }
    fin.creditosAlvo.forEach(function (c) {
      var ehPend = c.tipo === 'pend';
      rows.push({ label: ehPend ? 'Restante não pago de período anterior' : 'Horas extras acumuladas (' + _fmtData(c.data) + ')', valor: parseFloat(c.valor) || 0, sinal: '+', cor: VERDE });
    });
    if ((fin.totalPendSai || 0) > 0.005) {
      rows.push({ label: 'Restante passado pro próximo período', valor: fin.totalPendSai, sinal: '-', cor: LARANJA });
    }
    fin.adiantamentosAlvo.forEach(function (a) {
      var ehOverpago = a.obs && String(a.obs).indexOf('Crédito de overpago') === 0;
      rows.push({ label: ehOverpago ? 'Desconto de valor pago a mais' : 'Adiantamento de ' + _fmtData(a.data),
        valor: parseFloat(a.valor) || 0, sinal: '-', cor: LARANJA });
      if (ehOverpago) { // de onde veio: o período anterior em que se pagou mais do que o devido
        var orig = String(a.obs).replace(/^Crédito de overpago\s*(—\s*)?/, '').replace(/\s*\(parcial:.*$/, '').replace(/ overpago — /, ': ').trim();
        rows.push({ nota: orig ? 'Vem de um pagamento anterior que passou do valor devido — ' + orig + '.' : 'Vem de um pagamento anterior que passou do valor devido.' });
      }
    });
    if (fin.totalPago > 0) {
      rows.push({ label: 'Já pago neste período', valor: fin.totalPago, sinal: '-', cor: VERM });
    }
    return { horas: horas, rows: rows };
  }

  // ─── Gerador PDF principal ───────────────────────────────────────────────────

  function gerarPDF(funcId, di, df) {
    _loadLibs(function() {
      var jsPDFClass = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
      if (!jsPDFClass) { if(typeof toast==='function') toast('jsPDF não carregado'); return; }
      _executarGeracao(jsPDFClass, funcId, di, df);
    });
  }

  function _executarGeracao(jsPDFClass, funcId, di, df, opts) {
    opts = opts || {};
    // Coleta dados
    var funcs  = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getFuncionarios() : {};
    var regs   = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getRegistros()    : {};
    var pags   = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getPagamentos()   : {};
    var f      = funcs[funcId] || {};

    if (!f.nome) { if (opts.erro) { opts.erro('Funcionário não encontrado.'); return; } alert('Funcionário não encontrado.'); return; }

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
        // Proporcional por faixa real do dia, não binário (ver _rotuloHE)
        var e200b = l.extra200Min || 0, e50b = l.extra50Min || 0;
        totalExtraMin200 += e200b;
        totalExtraMin50  += e50b;
        if (l.extraMin > 0) {
          totalValorExtra200 += l.valorExtra * (e200b / l.extraMin);
          totalValorExtra50  += l.valorExtra * (e50b  / l.extraMin);
        }
      }
    });

    // ── Abate horas negativas/faltantes CONTRA as horas extras do período ──
    // Regra: a falta é descontada primeiro da HE ×2 (dobrada). A HE ×3
    // (triplicada — domingo/feriado/especial) é protegida e só é usada pra
    // cobrir a falta se a ×2 sozinha não bastar (ou seja, se o total de
    // horas extras ×2 for MENOR que as horas negativas do período). O que
    // sobrar de falta sem nenhuma HE pra cobrir continua descontado à parte,
    // ao valor cheio (1×) — é jornada não cumprida, não tem adicional.
    //
    // Guarda os brutos (antes de abater) só para exibição — o funcionário
    // precisa ver que trabalhou hora extra e que ela foi usada pra cobrir
    // a falta, não simplesmente "sumir" do relatório.
    var extraBrutoMin       = totalExtraMin50 + totalExtraMin200;
    var valorExtraBrutoTotal = totalValorExtra50 + totalValorExtra200;
    var deficitBrutoMin     = Math.abs(totalDeficitMin);
    var deficitAbatidoMin   = 0; // quanto da falta foi coberto pelas horas extras
    var e50Bruto = totalExtraMin50, e200Bruto = totalExtraMin200;       // para o resumo do relatório
    var v50Bruto = totalValorExtra50, v200Bruto = totalValorExtra200;

    if (totalDeficitMin < 0) {
      var _deficitAbs    = Math.abs(totalDeficitMin);
      var _extra50Orig   = totalExtraMin50;
      var _extra200Orig  = totalExtraMin200;

      var _novoExtraMin50  = Math.max(0, _extra50Orig - _deficitAbs);
      var _restanteDeficit = Math.max(0, _deficitAbs - _extra50Orig);

      var _novoExtraMin200  = Math.max(0, _extra200Orig - _restanteDeficit);
      var _faltaRestanteMin = Math.max(0, _restanteDeficit - _extra200Orig);

      totalValorExtra50  = (_extra50Orig  > 0) ? totalValorExtra50  * (_novoExtraMin50  / _extra50Orig)  : 0;
      totalValorExtra200 = (_extra200Orig > 0) ? totalValorExtra200 * (_novoExtraMin200 / _extra200Orig) : 0;
      totalExtraMin50  = _novoExtraMin50;
      totalExtraMin200 = _novoExtraMin200;
      totalValorExtra  = totalValorExtra50 + totalValorExtra200;
      totalDeficitMin  = -_faltaRestanteMin;

      deficitAbatidoMin = _deficitAbs - _faltaRestanteMin;
    }

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

    // ── v14: layout limpo — nome, valor com a conta, 3 números, tabela de 3 colunas ──
    var resumo = _linhasResumoFin(fin, {
      extraBrutoMin: extraBrutoMin, deficitBrutoMin: deficitBrutoMin, deficitAbatidoMin: deficitAbatidoMin,
      e50Min: e50Bruto, e200Min: e200Bruto, v50: v50Bruto, v200: v200Bruto,
      valorExtraLiq: totalValorExtra, totalDeficitMin: totalDeficitMin
    });
    var pago = fin.status === 'pago', corP = pago ? COR_VERDE : COR_HEADER;
    var y = 14;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(140, 140, 140);
    doc.text('RELATÓRIO DE PONTO', mL, y);
    doc.text(_fmtData(di) + ' a ' + _fmtData(df), pW - mR, y, { align: 'right' });
    y += 7;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor.apply(doc, COR_HEADER);
    doc.text(f.nome || '', mL, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(150, 150, 150);
    doc.text(_mesExtenso(di, df), pW - mR, y, { align: 'right' });
    y += 3; doc.setDrawColor.apply(doc, COR_HEADER); doc.setLineWidth(0.8); doc.line(mL, y, pW - mR, y);
    y += 6;
    // cartão do valor + a conta
    var contaRows = resumo.rows.filter(function (r) { return !r.nota; });
    var notaRows = resumo.rows.filter(function (r) { return r.nota; });
    doc.setFontSize(7.5);
    notaRows.forEach(function (r) { r.ls = doc.splitTextToSize(r.nota, cW - 12); });
    var cardH = 22 + contaRows.reduce(function (t, r) { return t + (r.sub ? 4.8 : 6.4); }, 0) + notaRows.reduce(function (t, r) { return t + r.ls.length * 3.4 + 1; }, 0) + 2;
    doc.setDrawColor.apply(doc, corP); doc.setLineWidth(0.6); doc.setFillColor(255, 255, 255);
    doc.roundedRect(mL, y, cW, cardH, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(120, 120, 120);
    doc.text(pago ? 'Já recebido · quitado' : 'Você vai receber', mL + 6, y + 7);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor.apply(doc, corP);
    doc.text(_fmtMoeda(pago && fin.totalPago > 0 ? fin.totalPago : Math.abs(fin.saldoFinal)), mL + 6, y + 17);
    var fy = y + 22;
    contaRows.forEach(function (r) {
      if (r.sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(110, 110, 110); doc.text(r.label, mL + 11, fy + 3.4); doc.text(_fmtMoeda(r.valor), pW - mR - 6, fy + 3.4, { align: 'right' }); fy += 4.8; return; }
      doc.setDrawColor(230, 230, 230); doc.setLineWidth(0.2); doc.line(mL + 6, fy, pW - mR - 6, fy);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(70, 70, 70);
      doc.text(r.label, mL + 6, fy + 4.6);
      doc.setFont('helvetica', 'bold'); doc.setTextColor.apply(doc, r.cor || [30, 30, 30]);
      doc.text((r.sinal ? r.sinal + ' ' : '') + _fmtMoeda(r.valor), pW - mR - 6, fy + 4.6, { align: 'right' });
      fy += 6.4;
    });
    notaRows.forEach(function (r) { doc.setFont('helvetica', 'italic'); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130); fy += 1; r.ls.forEach(function (t) { fy += 3.4; doc.text(t, mL + 6, fy); }); });
    y += cardH + 4;
    // três números
    var conta = _contaRelatorio(linhas), tw = (cW - 8) / 3;
    [[String(conta.dias), conta.dias === 1 ? 'dia trabalhado' : 'dias trabalhados', COR_HEADER], [conta.extra ? '+' + _hmC(conta.extra) : '0h00', 'horas extras', COR_VERDE], [conta.falta ? _hmC(conta.falta) : '0h00', 'horas faltando', conta.falta ? COR_VERM : [150, 150, 150]]].forEach(function (t, i) {
      var tx = mL + i * (tw + 4);
      doc.setFillColor(245, 247, 250); doc.roundedRect(tx, y, tw, 15, 2, 2, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor.apply(doc, t[2]); doc.text(t[0], tx + tw / 2, y + 7.5, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(110, 110, 110); doc.text(t[1], tx + tw / 2, y + 12.3, { align: 'center' });
    });
    y += 20;

    // ── TABELA (3 colunas) ──
    var cols = [{ header: 'Dia', w: 40, align: 'left' }, { header: 'Horário', w: 100, align: 'left' }, { header: 'Resultado', w: 0, align: 'right' }];
    cols[2].w = cW - cols[0].w - cols[1].w;
    var colX = [mL, mL + cols[0].w, mL + cols[0].w + cols[1].w];
    var rowH = 10.4, thH = 7;
    function _tx(i, txt, yy) { var c = cols[i]; var x = c.align === 'left' ? colX[i] + 2.5 : colX[i] + c.w - 2.5; doc.text(txt, x, yy, { align: c.align }); }
    function _headerTabela() {
      doc.setFillColor(238, 242, 248); doc.rect(mL, y, cW, thH, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor.apply(doc, COR_HEADER);
      cols.forEach(function (c, i) { _tx(i, c.header, y + 4.8); });
      y += thH;
    }
    _headerTabela();
    linhas.forEach(function (l) {
      if (y + rowH > pH - 22) { doc.addPage(); y = 12; _headerTabela(); }
      var v = _linhaVisual(l);
      if (v.bg) { doc.setFillColor.apply(doc, v.bg); doc.rect(mL, y, cW, rowH, 'F'); }
      doc.setDrawColor(225, 229, 236); doc.setLineWidth(0.15); doc.line(mL, y + rowH, mL + cW, y + rowH);
      var y1 = y + 4.7, y2 = y + 8.6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(35, 35, 35); _tx(0, v.dia, y1);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(130, 130, 130); _tx(0, v.sem + (v.marca ? ' · ' + v.marca : ''), y2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(35, 35, 35); _tx(1, v.horario || '—', y1);
      if (v.detalhe) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(130, 130, 130); _tx(1, v.detalhe, y2); }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor.apply(doc, v.cor); _tx(2, v.res, v.res2 ? y1 : y + 6.2);
      if (v.res2) { doc.setFont('helvetica', 'normal'); doc.setFontSize(7.8); doc.setTextColor(130, 130, 130); _tx(2, v.res2, y2); }
      y += rowH;
    });
    y += 5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(130, 130, 130);
    doc.text('Hora extra paga em dobro; em triplo no domingo, feriado, sábado depois das 12h e antes das 7h ou depois das 18h.', mL, y, { maxWidth: cW });
    y += 8;

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(6);
    var agora = new Date();
    var dtGer = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    doc.text('Documento gerado em ' + dtGer + ' · HR Mármores e Granitos', pW / 2, y, { align: 'center' });

    var _wppRH = opts.wppContato || WPP_CONTATO_RH; // relatório mandado pelo bot: a dúvida vai para a secretária
    if (_wppRH) {
      y += 6;
      var msgContest = 'Olá! Sobre meu relatório de ponto (' + (f.nome || '') + ', ' + _mesExtenso(di, df) + '): tenho uma dúvida ou algo não bate.';
      var urlContest = 'https://wa.me/' + (String(_wppRH).length > 11 ? '' : '55') + _wppRH + '?text=' + encodeURIComponent(msgContest);
      doc.setFillColor(230, 246, 234);
      doc.setDrawColor(120, 190, 140);
      doc.setLineWidth(0.4);
      doc.roundedRect(mL + 20, y - 5, cW - 40, 8, 1.5, 1.5, 'FD');
      doc.setTextColor(20, 110, 55);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.textWithLink('Dúvida ou algo não bate? Toque aqui e fale com o RH', pW / 2, y, { align: 'center', url: urlContest });
    }

    // ── Prepara dados de saída ────────────────────────────────────────────────
    var nomeFmt = (f.nome || 'func').replace(/\s+/g, '_').toLowerCase();
    var mesFmt  = di.slice(0, 7).replace('-', '') + '_' + di.slice(8,10) + '_' + df.slice(8,10);
    var fileName = 'relatorio_ponto_' + nomeFmt + '_' + mesFmt + '.pdf';
    var mesRef   = _mesExtenso(di, df) + ' (' + di.slice(8,10) + '-' + df.slice(8,10) + ')';
    var telFunc  = f.telefone || f.tel || '';

    var htmlPreview = _gerarHtmlRelatorio(f, linhas, di, df, totalExtraMin50, totalExtraMin200,
      totalValorExtra, totalDeficitMin, meusPags, salario, valorHora, fin, totalValorExtra50, totalValorExtra200,
      extraBrutoMin, deficitBrutoMin, deficitAbatidoMin, resumo);

    var pdfBlobFn = function() { return doc.output('blob'); };

    // Relatório para o bot mandar no WhatsApp: devolve o PDF e os números, sem abrir a tela
    if (opts.paraBot) {
      opts.paraBot({
        blob: doc.output('blob'), fileName: fileName, nome: f.nome || '', di: di, df: df, mesRef: mesRef,
        valor: Math.abs(fin.saldoFinal), status: fin.status,
        fin: (resumo && resumo.rows || []).filter(function (r) { return !r.nota; }).map(function (r) { return { label: r.label, valor: Math.round((r.valor || 0) * 100) / 100, sinal: r.sinal || '', sub: !!r.sub }; }),
        dias: linhas.map(function (l) { return { data: l.data, e: l.entrada, ai: l.saidaAlm, af: l.voltaAlm, s: l.saida, trab: l.trabMin, esp: l.esperadoMin, saldo: l.saldoMin, tipo: l.tipo || '', obs: l.obs || '' }; })
      });
      return;
    }

    var valorMsg = (fin.status === 'pago' ? 'já quitado' : _fmtMoeda(Math.abs(fin.saldoFinal)));
    _abrirOverlayPonto(htmlPreview, pdfBlobFn, fileName, f.nome || 'Funcionário', mesRef, telFunc, valorMsg, fin.status === 'pago');
  }


  // ─── v14: visual único do relatório (tela e PDF) — 3 colunas, frases curtas ──
  var _SEMANA = { '2ª': 'seg', '3ª': 'ter', '4ª': 'qua', '5ª': 'qui', '6ª': 'sex', 'Sáb': 'sáb', 'Dom': 'dom' };
  function _hmC(min) { var abs = Math.abs(Math.round(min || 0)); return Math.floor(abs / 60) + 'h' + String(abs % 60).padStart(2, '0'); }
  function _linhaVisual(l) {
    var v = { dia: l.data.slice(8, 10) + '/' + l.data.slice(5, 7), sem: _SEMANA[l.diaTxt] || l.diaTxt || '', marca: '', horario: '', detalhe: '', res: '', cor: [120, 120, 120], bg: null };
    var meio = l.esperadoMin > 0 && l.esperadoMin < 480 && l.diaTxt !== 'Sáb';
    if (l.tipo === 'feriado') v.marca = meio ? 'meio feriado' : 'feriado'; else if (l.tipo === 'acordo') v.marca = 'acordo'; else if (meio) v.marca = 'meio período';
    var temHora = l.entrada && l.entrada !== '—';
    if (temHora) {
      v.horario = l.entrada + ' às ' + (l.saida && l.saida !== '—' ? l.saida : '?');
      var alm = l.almocoDireta ? 'sem batida do almoço' : (l.almocoDiretoConf ? 'sem almoço' : (l.saidaAlm && l.saidaAlm !== '—' ? 'almoço ' + l.saidaAlm + '–' + l.voltaAlm : ''));
      v.detalhe = [alm, l.trabMin ? 'trabalhou ' + _hmC(l.trabMin) : ''].filter(Boolean).join(' · ');
    }
    var semPonto = (!l.trabMin && l.esperadoMin > 0 && l.tipo !== 'abonado');
    if (l.tipo === 'abonado' || /abonad/.test(l.obs || '')) { v.res = 'atestado'; v.cor = [70, 110, 160]; v.bg = [238, 244, 251]; }
    else if (semPonto) { v.res = 'faltou ' + _hmC(l.esperadoMin); v.cor = [180, 50, 50]; v.bg = [255, 240, 240]; v.horario = v.horario || 'sem ponto'; }
    else if (l.extraMin > 0 && !l.destinoBanco) { v.res = '+' + _hmC(l.extraMin) + ' extra'; v.cor = [30, 130, 60]; var x3 = Math.round(l.extra200Min || 0), x2 = Math.round(l.extraMin) - x3; v.res2 = x3 <= 0 ? 'em dobro' : x2 <= 0 ? 'em triplo' : _hmC(x2) + ' dobro · ' + _hmC(x3) + ' triplo'; }
    else if (l.saldoMin < -5) { v.res = 'faltou ' + _hmC(l.saldoMin); v.cor = [180, 50, 50]; v.bg = [255, 244, 244]; }
    else if (l.trabMin) { v.res = 'completo'; v.cor = [120, 120, 120]; }
    if ((l.tipo === 'feriado' || l.tipo === 'acordo' || !l.esperadoMin) && !l.trabMin && !semPonto) { v.res = 'folga'; v.cor = [70, 110, 160]; v.bg = [244, 247, 252]; v.horario = v.horario || '—'; }
    if (l.autoComp) v.detalhe = (v.detalhe ? v.detalhe + ' · ' : '') + 'horário incompleto';
    return v;
  }
  function _contaRelatorio(linhas) {
    var c = { dias: 0, extra: 0, falta: 0 };
    linhas.forEach(function (l) { if (l.trabMin > 0) c.dias++; if (l.extraMin > 0 && !l.destinoBanco) c.extra += l.extraMin; if (l.tipo !== 'abonado') { if (!l.trabMin && l.esperadoMin > 0) c.falta += l.esperadoMin; else if (l.saldoMin < -5) c.falta += -l.saldoMin; } });
    return c;
  }

  // ─── Gerador HTML do relatório (para preview via html2canvas) ────────────────

  function _gerarHtmlRelatorio(f, linhas, di, df, totalExtraMin50, totalExtraMin200,
    totalValorExtra, totalDeficitMin, meusPags, salario, valorHora, fin, totalValorExtra50, totalValorExtra200,
    extraBrutoMin, deficitBrutoMin, deficitAbatidoMin, resumo) {

    extraBrutoMin     = extraBrutoMin     || 0;
    deficitBrutoMin   = deficitBrutoMin   || 0;
    deficitAbatidoMin = deficitAbatidoMin || 0;

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

    var conta = _contaRelatorio(linhas);
    var rgbC = function (c) { return 'rgb(' + c.join(',') + ')'; };
    var rowsHtml = linhas.map(function (l) {
      var v = _linhaVisual(l);
      return '<tr style="background:' + (v.bg ? rgbC(v.bg) : '#fff') + ';border-bottom:1px solid #e6eaf0;">' +
        '<td style="padding:10px 8px;width:118px;vertical-align:top;"><div style="font-size:17px;font-weight:700;color:#222;">' + v.dia + '</div><div style="font-size:12.5px;color:#888;">' + v.sem + (v.marca ? ' · <span style="color:#3d6aa0;">' + v.marca + '</span>' : '') + '</div></td>' +
        '<td style="padding:10px 8px;vertical-align:top;"><div style="font-size:17px;font-weight:700;color:#222;">' + _esc(v.horario || '—') + '</div>' + (v.detalhe ? '<div style="font-size:12.5px;color:#888;margin-top:2px;">' + _esc(v.detalhe) + '</div>' : '') + '</td>' +
        '<td style="padding:10px 8px;text-align:right;vertical-align:top;font-size:16px;font-weight:700;color:' + rgbC(v.cor) + ';white-space:nowrap;">' + _esc(v.res) + (v.res2 ? '<div style="font-size:12px;font-weight:400;color:#888;margin-top:2px;">' + _esc(v.res2) + '</div>' : '') + '</td></tr>';
    }).join('');

    var conta1 = resumo.rows.filter(function (r) { return !r.nota; }).map(function (r) {
      if (r.sub) return '<div style="display:flex;justify-content:space-between;padding:0 0 6px 18px;font-size:13.5px;color:#666;"><span>' + _esc(r.label) + '</span><span>' + fmtMoeda(r.valor) + '</span></div>';
      return '<div style="display:flex;justify-content:space-between;padding:7px 0;font-size:15.5px;border-top:1px solid rgba(0,0,0,.07);"><span style="color:#444;">' + _esc(r.label) + '</span><span style="font-weight:700;color:' + rgbC(r.cor || [30, 30, 30]) + ';">' + (r.sinal ? r.sinal + ' ' : '') + fmtMoeda(r.valor) + '</span></div>';
    }).join('');
    var notas = resumo.rows.filter(function (r) { return r.nota; }).map(function (r) { return '<div style="font-size:12px;color:#888;margin-top:6px;">' + _esc(r.nota) + '</div>'; }).join('');

    var agora = new Date();
    var dtGer = agora.toLocaleDateString('pt-BR') + ' ' + agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    var pago = fin.status === 'pago', cor = pago ? '#2a8a46' : '#1a3660';
    var valorGrande = pago && fin.totalPago > 0 ? fin.totalPago : Math.abs(fin.saldoFinal);
    var tile = function (n, t, c) { return '<div style="flex:1;background:#f5f7fa;border-radius:8px;padding:10px 8px;text-align:center;"><div style="font-size:22px;font-weight:800;color:' + c + ';">' + n + '</div><div style="font-size:12.5px;color:#666;margin-top:2px;">' + t + '</div></div>'; };

    return '<div style="font-family:Arial,sans-serif;background:#fff;padding:18px 22px;color:#111;width:754px;box-sizing:border-box;">' +
      '<div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:3px solid #1a3660;padding-bottom:10px;">' +
        '<div><div style="font-size:13px;color:#888;letter-spacing:1px;">RELATÓRIO DE PONTO</div><div style="font-size:24px;font-weight:800;color:#1a3660;">' + _esc(f.nome || '') + '</div></div>' +
        '<div style="text-align:right;font-size:14px;color:#555;">' + fmtData(di) + ' a ' + fmtData(df) + '<br><span style="font-size:12px;color:#999;">' + mesRef + '</span></div>' +
      '</div>' +
      '<div style="border:2px solid ' + cor + ';border-radius:10px;padding:14px 18px;margin-top:14px;">' +
        '<div style="font-size:14px;color:#777;">' + (pago ? 'Já recebido · quitado' : 'Você vai receber') + '</div>' +
        '<div style="font-size:34px;font-weight:800;color:' + cor + ';margin-bottom:6px;">' + fmtMoeda(valorGrande) + '</div>' +
        conta1 + notas +
      '</div>' +
      '<div style="display:flex;gap:10px;margin-top:12px;">' +
        tile(conta.dias, conta.dias === 1 ? 'dia trabalhado' : 'dias trabalhados', '#1a3660') +
        tile(conta.extra ? '+' + _hmC(conta.extra) : '0h00', 'horas extras', '#2a8a46') +
        tile(conta.falta ? _hmC(conta.falta) : '0h00', 'horas faltando', conta.falta ? '#b43232' : '#999') +
      '</div>' +
      '<table style="width:100%;border-collapse:collapse;margin-top:14px;">' +
        '<thead><tr style="background:#eef2f8;color:#1a3660;font-size:13px;"><th style="padding:8px;text-align:left;">Dia</th><th style="padding:8px;text-align:left;">Horário</th><th style="padding:8px;text-align:right;">Resultado</th></tr></thead>' +
        '<tbody>' + rowsHtml + '</tbody></table>' +
      '<div style="font-size:12px;color:#888;margin-top:8px;">Hora extra paga em dobro; em triplo no domingo, feriado, sábado depois das 12h e antes das 7h ou depois das 18h.</div>' +
      '<div style="text-align:center;font-size:9px;color:#aaa;margin-top:12px;">Gerado em ' + dtGer + ' · HR Mármores e Granitos</div>' +
      (WPP_CONTATO_RH ? '<div style="text-align:center;margin-top:10px;"><a href="https://wa.me/55' + WPP_CONTATO_RH + '?text=' + encodeURIComponent('Olá! Sobre meu relatório de ponto (' + (f.nome || '') + ', ' + mesRef + '): tenho uma dúvida ou algo não bate.') + '" style="display:inline-block;background:#e6f6ea;border:1px solid #78be8c;border-radius:6px;padding:8px 14px;font-size:13px;color:#146e37;font-weight:700;text-decoration:none;">Dúvida ou algo não bate? Fale com o RH</a></div>' : '') +
    '</div>';
  }

  // ─── Deficit de um período, exposto pra outros módulos (ex: painel de ────────
  // pagamento em app-funcionarios.js) reaproveitarem o mesmo cálculo de
  // jornada esperada/saldo diário usado neste relatório, em vez de duplicar
  // a lógica de _montarLinhas em outro arquivo.
  // Retorna minutos de falta no período, sempre >= 0 (valor absoluto).
  function calcDeficitPeriodo(funcId, di, df) {
    if (!funcId || !di || !df) return 0;
    var funcs = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getFuncionarios() : {};
    var regs  = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getRegistros()    : {};
    var f = funcs[funcId] || {};
    var meusRegs = Object.values(regs).filter(function (r) {
      return r.funcionarioId != null && r.funcionarioId == funcId && r.data >= di && r.data <= df;
    });
    // Sem NENHUM registro no período inteiro = ponto ainda não foi importado/
    // lançado, não é o funcionário "faltando todos os dias". Não gera déficit
    // fantasma (ver calcExtraPeriodo, mesma regra e motivo detalhado lá).
    if (meusRegs.length === 0) return 0;
    var linhas = _montarLinhas(meusRegs, f, di, df, funcId);
    var totalDeficitMin = 0;
    linhas.forEach(function (l) { if (l.saldoMin < 0) totalDeficitMin += l.saldoMin; });
    return Math.abs(totalDeficitMin);
  }

  // ─── Extras + déficit de um período, calculado 100% ao vivo a partir de ──────
  // _montarLinhas — mesma fonte usada pelo Relatório de Ponto (classificação
  // ×2/×3, janela noturna 00h-07h, abatimento de negativas contra extras).
  // Existe pra o painel de pagamento (app-funcionarios.js) parar de usar o
  // motor antigo baseado em r.extra "congelado" na importação, que diverge
  // do relatório sempre que a classificação muda depois (feriado declarado,
  // correção manual, janela noturna, etc). Uma única fonte de verdade.
  function calcExtraPeriodo(funcId, di, df) {
    if (!funcId || !di || !df) return null;
    var funcs = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getFuncionarios() : {};
    var regs  = (typeof HR_FUNC !== 'undefined') ? HR_FUNC.getRegistros()    : {};
    var f = funcs[funcId] || {};
    var meusRegs = Object.values(regs).filter(function (r) {
      return r.funcionarioId != null && r.funcionarioId == funcId && r.data >= di && r.data <= df;
    });

    // Sem NENHUM registro no período inteiro: o ponto desse período ainda
    // não foi importado/lançado no sistema — não dá pra saber se a pessoa
    // faltou ou se é só falta de dado. _montarLinhas trata todo dia sem
    // batida como falta total (saldoMin = -esperadoMin), então rodar ele
    // aqui geraria um "déficit" do tamanho da jornada inteira do período
    // (ex: 56h num decêndio de 10 dias) mesmo quando a pessoa trabalhou
    // normal e só falta importar. Detecta esse caso e devolve zerado com
    // um aviso, em vez de descontar dinheiro de um período sem dado nenhum.
    if (meusRegs.length === 0) {
      return {
        totalExtra50Min: 0, totalExtra100Min: 0, totalExtra200Min: 0,
        valorExtra50: 0, valorExtra100: 0, valorExtra200: 0,
        valorTotalExtras: 0, totalExtraHoras: 0,
        extraBrutoMin: 0, deficitBrutoMin: 0, deficitAbatidoMin: 0,
        deficitRestanteMin: 0, deficitRestanteValor: 0, valorHoraBase: 0,
        semRegistrosPeriodo: true
      };
    }

    var linhas = _montarLinhas(meusRegs, f, di, df, funcId);

    var extra50Min = 0, extra200Min = 0, valorExtra50 = 0, valorExtra200 = 0;
    var deficitMin = 0;
    linhas.forEach(function (l) {
      if (l.saldoMin < 0) deficitMin += l.saldoMin;
      if (l.extraMin > 0 && !l.destinoBanco) {
        // Divide o valor financeiro do dia proporcionalmente entre as faixas
        // reais (extra50Min/extra200Min) em vez de jogar o dia inteiro numa
        // faixa só — um dia pode ter parte dobrada e parte triplicada.
        var e200 = l.extra200Min || 0, e50 = l.extra50Min || 0;
        extra200Min += e200;
        extra50Min  += e50;
        if (l.extraMin > 0) {
          valorExtra200 += l.valorExtra * (e200 / l.extraMin);
          valorExtra50  += l.valorExtra * (e50  / l.extraMin);
        }
      }
    });

    // Mesmo abatimento de negativas contra extras usado no Relatório de
    // Ponto: desconta primeiro da ×2, só mexe na ×3 se a ×2 não bastar.
    var extraBrutoMin  = extra50Min + extra200Min;
    var deficitBrutoMin = Math.abs(deficitMin);
    var deficitAbatidoMin = 0, deficitRestanteMin = 0;
    if (deficitBrutoMin > 0) {
      var novo50    = Math.max(0, extra50Min - deficitBrutoMin);
      var restante  = Math.max(0, deficitBrutoMin - extra50Min);
      var novo200   = Math.max(0, extra200Min - restante);
      deficitRestanteMin = Math.max(0, restante - extra200Min);
      deficitAbatidoMin  = deficitBrutoMin - deficitRestanteMin;
      valorExtra50  = (extra50Min  > 0) ? valorExtra50  * (novo50  / extra50Min)  : 0;
      valorExtra200 = (extra200Min > 0) ? valorExtra200 * (novo200 / extra200Min) : 0;
      extra50Min  = novo50;
      extra200Min = novo200;
    }

    var valorHora = (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcValorHoraReal === 'function')
      ? HR_IMPORT.calcValorHoraReal(f, di.slice(0, 7)) : 0;

    return {
      totalExtra50Min:  extra50Min,
      totalExtra100Min: 0, // não distinguido aqui — domingo/especial já somam junto em extra200 (mesma alíquota ×3)
      totalExtra200Min: extra200Min,
      valorExtra50:     valorExtra50,
      valorExtra100:    0,
      valorExtra200:    valorExtra200,
      valorTotalExtras: valorExtra50 + valorExtra200,
      totalExtraHoras:  (extra50Min + extra200Min) / 60,
      extraBrutoMin:        extraBrutoMin,
      deficitBrutoMin:      deficitBrutoMin,
      deficitAbatidoMin:    deficitAbatidoMin,
      deficitRestanteMin:   deficitRestanteMin,
      deficitRestanteValor: (deficitRestanteMin / 60) * valorHora,
      valorHoraBase:        valorHora
    };
  }

  // ─── API pública ─────────────────────────────────────────────────────────────

  return {
    gerarPDF: gerarPDF,
    // Gera o relatório do período sem abrir tela (para o bot mandar no WhatsApp). Promise com {blob, fileName, valor, fin, dias...}
    gerarParaBot: function (funcId, di, df, wppContato) {
      return new Promise(function (ok, erro) {
        _loadLibs(function () {
          var J = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
          if (!J) { erro(new Error('jsPDF não carregou')); return; }
          try { _executarGeracao(J, funcId, di, df, { paraBot: ok, erro: function (m) { erro(new Error(m)); }, wppContato: wppContato }); } catch (e) { erro(e); }
        });
      });
    },
    calcDeficitPeriodo: calcDeficitPeriodo,
    calcExtraPeriodo:   calcExtraPeriodo,
  };

})();
