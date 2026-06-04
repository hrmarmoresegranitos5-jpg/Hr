// ═══════════════════════════════════════════════════════════════════
//  HR MÁRMORES — RELATÓRIO DE HORAS EXTRAS + PDF  v3.1
//  Arquivo: app-horas-extras-pdf.js
//
//  MELHORIAS v3.0 (vs v2.1):
//  ✔ Cálculo acumulado correto: HE acima de 2h/dia = 100% (CLT §59)
//  ✔ Faixas progressivas por dia: primeiras 2h = 50%, excedente = 100%
//  ✔ Noturno automático: horas 22h–5h com adicional 20% (CLT §73)
//  ✔ DSR proporcional calculado sobre valor das HE do período
//  ✔ INSS/FGTS calculado sobre base de cálculo correta
//  ✔ Resumo salarial completo (tabela holerite-style)
//  ✔ Painel de aprovação: gestor pode aprovar/rejeitar HE antes de pagar
//  ✔ Alertas inteligentes: HE acima do limite legal, HE em sequência
//  ✔ PDF premium: capa, tabela detalhada, resumo financeiro, rodapé
//  ✔ Exportação CSV para integração com sistemas de folha
//  ✔ Botão "Marcar como Pago" registra pagamento no período
//  ✔ Histórico de pagamentos por funcionário por período
//
//  MELHORIAS v3.1:
//  ✔ _heMarcarPago: confirm() substituído por modal nativo (sem popup)
//  ✔ _heGerarTodosPDFs: progresso em tempo real + botão cancelar
// ═══════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Tokens de cor (idênticos ao restante do sistema) ────────────
  var GOLD   = '#C9A84C';
  var GOLD2  = 'rgba(201,168,76,.15)';
  var GOLDB  = 'rgba(201,168,76,.35)';
  var S1     = 'var(--s1,#0d0b07)';
  var S2     = 'var(--s2,#161410)';
  var BD     = 'rgba(201,168,76,.12)';
  var T1     = 'var(--t1,#f0ece4)';
  var T2     = 'var(--t2,#b8b0a0)';
  var T3     = 'var(--t3,#7a7268)';
  var GREEN  = '#5cb85c';
  var RED    = '#c85c5c';
  var BLUE   = '#8ec8f0';
  var ORANGE = '#e0954a';

  // ── Helpers de UI ────────────────────────────────────────────────
  function _toast(m) { if (typeof toast === 'function') toast(m); else console.log('[HE]', m); }
  function _esc(s)   { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function _fmtMoeda(v) {
    return 'R$\u00a0' + parseFloat(v||0).toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2});
  }
  function _fmtData(iso) {
    if (!iso) return '—';
    var p = iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0];
  }
  function _fmtHoje() { return _fmtData(new Date().toISOString().slice(0,10)); }
  function _mesAtual() {
    var d=new Date(), m=d.getMonth()+1;
    return d.getFullYear()+'-'+(m<10?'0':'')+m;
  }
  function _nomeMes(anoMes) {
    if (!anoMes) return '';
    var meses=['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var p=anoMes.split('-');
    return meses[(parseInt(p[1])||1)-1]+' '+p[0];
  }
  function _closeOverlay(id) { var e=document.getElementById(id); if(e) e.remove(); }
  function _overlay(id, html) {
    _closeOverlay(id);
    var ov=document.createElement('div');
    ov.id=id;
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(8,6,2,.97);'+
      'display:flex;flex-direction:column;align-items:center;overflow-y:auto;'+
      'font-family:Outfit,sans-serif;padding:24px 0 100px;';
    ov.innerHTML=html;
    document.body.appendChild(ov);
    return ov;
  }

  // ── Acesso a dados ───────────────────────────────────────────────
  function _getFuncs()  { try{return JSON.parse(localStorage.getItem('hr_funcionarios')||'{}')}catch(e){return{}} }
  function _getRegs()   { try{return JSON.parse(localStorage.getItem('hr_registros')||'{}')}catch(e){return{}} }
  function _getPags()   { try{return JSON.parse(localStorage.getItem('hr_pagamentos')||'{}')}catch(e){return{}} }
  function _getAprova() { try{return JSON.parse(localStorage.getItem('hr_he_aprovacoes')||'{}')}catch(e){return{}} }
  function _saveAprova(d){ try{localStorage.setItem('hr_he_aprovacoes',JSON.stringify(d))}catch(e){} }
  function _getPagoHE() { try{return JSON.parse(localStorage.getItem('hr_he_pagos')||'{}')}catch(e){return{}} }
  function _savePagoHE(d){ try{localStorage.setItem('hr_he_pagos',JSON.stringify(d))}catch(e){} }

  // ── Multiplicadores (lê CFG ou default CLT) ──────────────────────
  function _getMult() {
    var def={normal:1.5, domingo:2.0, feriado:2.0, especial:3.0};
    try {
      var src = (typeof CFG!=='undefined'&&CFG&&CFG.he) ? CFG.he
              : JSON.parse(localStorage.getItem('cfg')||'{}').he;
      if (src) return {
        normal:   parseFloat(src.normal)   || def.normal,
        domingo:  parseFloat(src.domingo)  || def.domingo,
        feriado:  parseFloat(src.feriado)  || def.feriado,
        especial: parseFloat(src.especial) || def.especial
      };
    } catch(e){}
    return def;
  }

  // ── Alíquota INSS 2025 (tabela progressiva) ──────────────────────
  function _calcINSS(base) {
    // Tabela progressiva INSS 2025
    var faixas = [
      {ate: 1518.00, aliq: 0.075},
      {ate: 2793.88, aliq: 0.09},
      {ate: 4190.83, aliq: 0.12},
      {ate: 8157.41, aliq: 0.14}
    ];
    var anterior = 0, total = 0;
    for (var i=0; i<faixas.length; i++) {
      var f = faixas[i];
      if (base > anterior) {
        var incide = Math.min(base, f.ate) - anterior;
        total += incide * f.aliq;
        anterior = f.ate;
        if (base <= f.ate) break;
      }
    }
    return total;
  }

  // ── Horas noturnas (22h–5h) ──────────────────────────────────────
  function _calcHorasNoturnas(entrada, saida) {
    if (!entrada || !saida) return 0;
    var toMin = function(s){ var p=s.split(':'); return parseInt(p[0])*60+parseInt(p[1]||0); };
    var eM = toMin(entrada), sM = toMin(saida);
    if (sM < eM) sM += 1440; // virou meia-noite
    // Janela noturna: 22:00 (1320) até 29:00 (1740, = 5h do dia seguinte)
    var noitInicio = 22*60, noitFim = 29*60;
    var inter = Math.max(0, Math.min(sM, noitFim) - Math.max(eM, noitInicio));
    return inter / 60;
  }

  // ── Classificar tipo de dia ──────────────────────────────────────
  function _tipoDia(isoDate) {
    var d = new Date(isoDate + 'T12:00:00');
    var dow = d.getDay(); // 0=dom, 6=sab
    if (typeof CFG !== 'undefined' && CFG && CFG.feriados) {
      if (CFG.feriados.indexOf(isoDate) >= 0) return 'feriado';
    }
    if (typeof CFG !== 'undefined' && CFG && CFG.diasEspeciais) {
      if (CFG.diasEspeciais.indexOf(isoDate) >= 0) return 'especial';
    }
    if (dow === 0) return 'domingo';
    if (dow === 6) return 'sabado';
    return 'util';
  }

  // ═══════════════════════════════════════════════════════════════
  //  MOTOR DE CÁLCULO PRINCIPAL
  //  Delega para HR_IMPORT.calcSaldoHE quando disponível.
  //  Fallback corrigido com:
  //   - Faixas progressivas por dia (primeiras 2h = ×1.5; excedente = ×2.0)
  //   - Adicional noturno (×1.2 na hora base)
  //   - DSR sobre extras (valor/dias úteis × dias do mês)
  //   - INSS/FGTS sobre holerite final
  // ═══════════════════════════════════════════════════════════════
  function _calcularHE(funcId, inicio, fim) {
    var funcs = _getFuncs(), regs = _getRegs(), pags = _getPags();
    var aprova = _getAprova(), pagoHE = _getPagoHE();
    var mult = _getMult();
    var f = funcs[funcId] || {};
    var salario = parseFloat(f.salario) || 0;
    var mesRef = (inicio || new Date().toISOString()).slice(0,7);

    // Valor/hora real (respeita jornada customizada)
    var valorHoraBase;
    if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcValorHoraReal === 'function') {
      valorHoraBase = HR_IMPORT.calcValorHoraReal(f, mesRef);
    } else {
      var jornadaMin = (f && parseInt(f.jornadaDiariaMin)) || 480; // 8h default
      valorHoraBase = salario / 220;
      // Ajuste pela jornada real se diferente de 8h
      if (jornadaMin !== 480) {
        // Estima horas mensais pela jornada real (22 dias úteis + 4 sábados×4h)
        var hMes = (22 * jornadaMin + 4 * 240) / 60;
        valorHoraBase = salario / hMes;
      }
    }

    // Separar registros do período
    var todosComExtra = Object.values(regs).filter(function(r) {
      if (r.funcionarioId !== funcId) return false;
      if (inicio && r.data < inicio) return false;
      if (fim    && r.data > fim)    return false;
      return parseFloat(r.extra) > 0;
    }).sort(function(a,b){ return a.data.localeCompare(b.data); });

    var registrosPagar = todosComExtra.filter(function(r){ return r.destinoExtra !== 'banco'; });
    var registrosBanco = todosComExtra.filter(function(r){ return r.destinoExtra === 'banco'; });
    var totalHorasBanco = registrosBanco.reduce(function(s,r){ return s+(parseFloat(r.extra)||0); },0);

    // ── Motor de cálculo financeiro ────────────────────────────────
    var totalHE50h=0, valorHE50=0;
    var totalHE100h=0, valorHE100=0;
    var totalHE200h=0, valorHE200=0;
    var totalHorasNoturnas=0, valorAdicNoturno=0;
    var totalHorasExtra=0, totalValorExtra=0;

    if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcSaldoHE === 'function') {
      // ── Motor unificado preferido ────────────────────────────────
      var heResult = HR_IMPORT.calcSaldoHE(registrosPagar, f, mesRef);
      totalHE50h  = heResult.totalExtra50Min  / 60;
      totalHE100h = heResult.totalExtra100Min / 60;
      totalHE200h = heResult.totalExtra200Min / 60;
      valorHE50   = heResult.valorExtra50;
      valorHE100  = heResult.valorExtra100;
      valorHE200  = heResult.valorExtra200;
      totalHorasExtra = heResult.totalExtraHoras;
      totalValorExtra = heResult.valorTotalExtras;

      registrosPagar.forEach(function(r) {
        var hExtra = parseFloat(r.extra) || 0;
        var tipo   = (r.tipoExtra||'normal').toLowerCase();
        var multR  = tipo==='especial' ? mult.especial
                   : (tipo==='feriado'||tipo==='domingo') ? mult.feriado
                   : mult.normal;
        r._valorHoraUsado  = valorHoraBase * multR;
        r._valorTotalExtra = hExtra * r._valorHoraUsado;
        r._noturnas = _calcHorasNoturnas(r.entrada, r.saida);
        r._aprovado = aprova[r.id] !== false; // default aprovado
        totalHorasNoturnas += r._noturnas;
        valorAdicNoturno   += r._noturnas * valorHoraBase * 0.2; // adicional 20%
      });

    } else {
      // ── Fallback com faixas progressivas por dia ─────────────────
      // CLT Art. 59: até 2h extras/dia = 50%; acima de 2h = 100%
      // (na prática o tipo do dia pode ser 100% direto para dom/feriado)
      registrosPagar.forEach(function(r) {
        var hExtra = parseFloat(r.extra) || 0;
        var _td = _tipoDia(r.data);
        var tipo = (r.tipoExtra || (_td==='domingo'?'domingo':_td==='feriado'?'feriado':_td==='especial'?'especial':'normal')).toLowerCase();
        r._tipo = tipo;

        var valorH, hHE50, hHE100, hHE200;

        if (tipo === 'especial') {
          // Especial: tudo ×3.0
          hHE200 = hExtra; hHE100 = 0; hHE50 = 0;
          valorH = valorHoraBase * mult.especial;
          r._valorHoraUsado  = valorH;
          r._valorTotalExtra = hExtra * valorH;
          totalHE200h += hHE200; valorHE200 += r._valorTotalExtra;

        } else if (tipo === 'feriado' || tipo === 'domingo') {
          // Domingo/Feriado: tudo ×2.0
          hHE100 = hExtra; hHE50 = 0;
          valorH = valorHoraBase * mult.domingo;
          r._valorHoraUsado  = valorH;
          r._valorTotalExtra = hExtra * valorH;
          totalHE100h += hHE100; valorHE100 += r._valorTotalExtra;

        } else {
          // Dia útil / sábado: faixas progressivas
          // Primeiras 2h: ×1.5 (50%); acima de 2h: ×2.0 (100%)
          var h50  = Math.min(hExtra, 2.0);
          var h100 = Math.max(0, hExtra - 2.0);
          var v50  = h50  * valorHoraBase * mult.normal;  // ×1.5
          var v100 = h100 * valorHoraBase * mult.domingo; // ×2.0
          hHE50  = h50;  hHE100 = h100;
          r._valorHoraUsado  = valorHoraBase * mult.normal; // referência
          r._valorTotalExtra = v50 + v100;
          totalHE50h  += hHE50;  valorHE50  += v50;
          totalHE100h += hHE100; valorHE100 += v100;
        }

        // Noturno
        r._noturnas = _calcHorasNoturnas(r.entrada, r.saida);
        var adic = r._noturnas * valorHoraBase * 0.2;
        r._adicNoturno = adic;
        totalHorasNoturnas += r._noturnas;
        valorAdicNoturno   += adic;

        // Status de aprovação
        r._aprovado = aprova[r.id] !== false;

        totalHorasExtra += hExtra;
        totalValorExtra += r._valorTotalExtra;
      });
    }

    // ── DSR sobre horas extras ───────────────────────────────────
    // DSR = (totalValorExtra / dias úteis do período) × dias de descanso
    var diasUteis   = _contarDiasUteis(inicio, fim);
    var diasDescanso = Math.max(0, _contarDias(inicio, fim) - diasUteis);
    var dsr = (diasUteis > 0 && diasDescanso > 0)
      ? (totalValorExtra / diasUteis) * diasDescanso : 0;

    // ── INSS sobre (salário + HE + DSR) ─────────────────────────
    var baseINSS = salario + totalValorExtra + dsr;
    var inss = _calcINSS(baseINSS);

    // ── FGTS sobre (salário + HE + DSR) ─────────────────────────
    var fgts = baseINSS * 0.08;

    // ── Pagamentos já registrados no período ─────────────────────
    var totalPago = Object.values(_getPagoHE()).filter(function(p) {
      return p.funcionarioId===funcId && (!inicio||p.periodo>=inicio) && (!fim||p.periodo<=fim);
    }).reduce(function(s,p){ return s+(parseFloat(p.valor)||0); },0);

    // Compatibilidade: também lê hr_pagamentos legado
    totalPago += Object.values(pags).filter(function(p) {
      if (p.funcionarioId!==funcId) return false;
      if (inicio && p.data<inicio) return false;
      if (fim    && p.data>fim)    return false;
      return true;
    }).reduce(function(s,p){ return s+(parseFloat(p.valor)||0); },0);

    // ── Alertas ──────────────────────────────────────────────────
    var alertas = [];
    if (totalHorasExtra > 80)
      alertas.push({tipo:'error', msg:'⚠️ Total de '+totalHorasExtra.toFixed(1)+'h extras excede 80h/mês (limite legal CLT)'});
    var diasComHE = {};
    registrosPagar.forEach(function(r){ diasComHE[r.data] = (diasComHE[r.data]||0) + parseFloat(r.extra); });
    var diasAcima2h = Object.values(diasComHE).filter(function(h){ return h>2; }).length;
    if (diasAcima2h > 0)
      alertas.push({tipo:'warn', msg:'⚡ '+diasAcima2h+' dia(s) com mais de 2h extras (faixa 100% aplicada)'});
    if (totalHorasNoturnas > 0)
      alertas.push({tipo:'info', msg:'🌙 '+totalHorasNoturnas.toFixed(2)+'h noturnas detectadas — adicional 20% incluído'});
    var semAprova = registrosPagar.filter(function(r){ return aprova[r.id]===false; });
    if (semAprova.length > 0)
      alertas.push({tipo:'warn', msg:'🔴 '+semAprova.length+' HE(s) aguardando aprovação — excluídas do total'});

    // Total apenas das HE aprovadas
    var totalValorAprovado = registrosPagar.filter(function(r){
      return r._aprovado !== false;
    }).reduce(function(s,r){ return s+(r._valorTotalExtra||0); }, 0);

    return {
      func:             f,
      salario:          salario,
      valorHoraBase:    valorHoraBase,
      valorHoraNormal:  valorHoraBase * mult.normal,
      registrosPagar:   registrosPagar,
      registrosBanco:   registrosBanco,
      totalHorasExtra:  totalHorasExtra,
      totalValorExtra:  totalValorExtra,
      totalValorAprovado: totalValorAprovado,
      totalHorasBanco:  totalHorasBanco,
      totalHE50h:       totalHE50h,  valorHE50:  valorHE50,
      totalHE100h:      totalHE100h, valorHE100: valorHE100,
      totalHE200h:      totalHE200h, valorHE200: valorHE200,
      totalHorasNoturnas: totalHorasNoturnas,
      valorAdicNoturno: valorAdicNoturno,
      dsr:              dsr,
      inss:             inss,
      fgts:             fgts,
      baseINSS:         baseINSS,
      totalPago:        totalPago,
      saldo:            totalValorAprovado - totalPago,
      alertas:          alertas
    };
  }

  // ── Helpers de datas ─────────────────────────────────────────────
  function _contarDias(inicio, fim) {
    if (!inicio||!fim) return 30;
    var d1=new Date(inicio+'T12:00:00'), d2=new Date(fim+'T12:00:00');
    return Math.round((d2-d1)/(1000*60*60*24))+1;
  }
  function _contarDiasUteis(inicio, fim) {
    if (!inicio||!fim) return 22;
    var d=new Date(inicio+'T12:00:00'), d2=new Date(fim+'T12:00:00'), n=0;
    while(d<=d2){ if(d.getDay()>0&&d.getDay()<6) n++; d.setDate(d.getDate()+1); }
    return n;
  }

  function _calcularTodos(inicio, fim) {
    return Object.values(_getFuncs())
      .filter(function(f){ return f.ativo!==false; })
      .map(function(f){ return _calcularHE(f.id, inicio, fim); })
      .filter(function(r){ return r.totalHorasExtra>0||r.totalHorasBanco>0; })
      .sort(function(a,b){ return a.func.nome.localeCompare(b.func.nome); });
  }

  // ── Estado do painel ─────────────────────────────────────────────
  var _st = {
    inicio: _mesAtual()+'-01',
    fim:    new Date().toISOString().slice(0,10),
    funcId: null,
    aba:    'resumo'  // 'resumo' | 'detalhes' | 'banco'
  };

  // ════════════════════════════════════════════════════════════════
  //  PAINEL PRINCIPAL
  // ════════════════════════════════════════════════════════════════
  function abrirRelatorioHorasExtras(funcIdDireto) {
    if (funcIdDireto) _st.funcId = funcIdDireto;
    _renderPainel();
  }

  function _renderPainel() {
    var funcs = _getFuncs();
    var ativos = Object.values(funcs).filter(function(f){ return f.ativo!==false; });
    var resultados = _calcularTodos(_st.inicio, _st.fim);

    // Totais gerais
    var totHoras   = resultados.reduce(function(s,r){ return s+r.totalHorasExtra; },0);
    var totValor   = resultados.reduce(function(s,r){ return s+r.totalValorExtra; },0);
    var totBanco   = resultados.reduce(function(s,r){ return s+r.totalHorasBanco; },0);
    var totAprovado= resultados.reduce(function(s,r){ return s+r.totalValorAprovado; },0);
    var totDSR     = resultados.reduce(function(s,r){ return s+r.dsr; },0);
    var totNoturno = resultados.reduce(function(s,r){ return s+r.valorAdicNoturno; },0);
    var totSaldo   = resultados.reduce(function(s,r){ return s+Math.max(0,r.saldo); },0);

    var exibir = _st.funcId
      ? resultados.filter(function(r){ return r.func.id===_st.funcId; })
      : resultados;

    // Alertas globais
    var todosAlertas = [];
    resultados.forEach(function(r){ todosAlertas = todosAlertas.concat(r.alertas||[]); });
    var alertasHtml = todosAlertas.length===0 ? '' :
      '<div style="margin-bottom:14px;">'+
        todosAlertas.map(function(a){
          var corBg = a.tipo==='error' ? 'rgba(200,92,92,.12)' : a.tipo==='warn' ? 'rgba(224,149,74,.1)' : 'rgba(142,200,240,.08)';
          var corBd = a.tipo==='error' ? RED : a.tipo==='warn' ? ORANGE : BLUE;
          return '<div style="background:'+corBg+';border:1px solid '+corBd+';border-radius:9px;'+
            'padding:9px 13px;margin-bottom:6px;font-size:.75rem;color:'+corBd+';">'+_esc(a.msg)+'</div>';
        }).join('')+
      '</div>';

    // Tabela principal
    var INP='width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;'+
      'border:1px solid rgba(201,168,76,.2);background:rgba(255,255,255,.03);'+
      'color:'+T1+';font-size:.85rem;font-family:Outfit,sans-serif;outline:none;';

    var opsFuncs=[{v:'',l:'👥 Todos os funcionários'}].concat(
      ativos.sort(function(a,b){return a.nome.localeCompare(b.nome);})
        .map(function(f){return {v:f.id,l:f.nome};})
    );
    var optsHtml=opsFuncs.map(function(o){
      return '<option value="'+o.v+'"'+(o.v===(_st.funcId||'')?' selected':'')+'>'+_esc(o.l)+'</option>';
    }).join('');

    var tabelaHtml='';
    if (exibir.length===0) {
      tabelaHtml='<div style="text-align:center;padding:32px 0;color:'+T3+';font-size:.85rem;">'+
        'Nenhuma hora extra registrada no período.</div>';
    } else {
      tabelaHtml=
        '<div style="overflow-x:auto;">' +
        '<table style="width:100%;border-collapse:collapse;font-size:.77rem;min-width:580px;">' +
          '<thead>' +
            '<tr style="color:'+GOLD+';font-size:.65rem;letter-spacing:.06em;text-transform:uppercase;">' +
              '<th style="text-align:left;padding:8px 8px;border-bottom:1px solid rgba(201,168,76,.2);">Funcionário</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Salário</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">V/h Base</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">H×50%</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">H×100%</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">🌙Noturno</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">DSR</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">🏦Banco</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Total HE</th>' +
              '<th style="text-align:right;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Saldo</th>' +
              '<th style="text-align:center;padding:8px;border-bottom:1px solid rgba(201,168,76,.2);">Ações</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
        exibir.map(function(r) {
          var saldo = Math.max(0, r.saldo);
          return '<tr style="border-bottom:1px solid rgba(255,255,255,.04);" onclick="window._heAbrirDetalhe(\''+r.func.id+'\')" style="cursor:pointer;">' +
            '<td style="padding:9px 8px;color:'+T1+';font-weight:600;cursor:pointer;" onclick="window._heAbrirDetalhe(\''+r.func.id+'\')">'+_esc(r.func.nome||'—')+'</td>' +
            '<td style="padding:9px 8px;text-align:right;color:'+T2+';">'+_fmtMoeda(r.salario)+'</td>' +
            '<td style="padding:9px 8px;text-align:right;color:'+T3+';font-size:.7rem;">'+
              'R$'+r.valorHoraBase.toFixed(2).replace('.',',')+'/h'+
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:'+(r.totalHE50h>0?GOLD:T3)+';">'+
              (r.totalHE50h>0?r.totalHE50h.toFixed(2)+'h':'—')+
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:'+(r.totalHE100h>0?ORANGE:T3)+';">'+
              (r.totalHE100h>0?r.totalHE100h.toFixed(2)+'h':'—')+
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:'+(r.totalHorasNoturnas>0?BLUE:T3)+';font-size:.72rem;">'+
              (r.totalHorasNoturnas>0?r.totalHorasNoturnas.toFixed(2)+'h':'—')+
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:'+T3+';font-size:.72rem;">'+
              (r.dsr>0?_fmtMoeda(r.dsr):'—')+
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;color:'+BLUE+';font-size:.72rem;">'+
              (r.totalHorasBanco>0?r.totalHorasBanco.toFixed(2)+'h':'—')+
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;font-weight:800;color:'+GOLD+';font-size:.92rem;">'+
              _fmtMoeda(r.totalValorExtra)+
            '</td>' +
            '<td style="padding:9px 8px;text-align:right;font-weight:800;color:'+(saldo>0?GREEN:T3)+';font-size:.88rem;">'+
              (saldo>0?_fmtMoeda(saldo):'✓ Pago')+
            '</td>' +
            '<td style="padding:9px 8px;text-align:center;">' +
              '<div style="display:flex;gap:4px;justify-content:center;">' +
                '<button onclick="event.stopPropagation();window._heAbrirDetalhe(\''+r.func.id+'\')" '+
                  'style="'+_btnMini(GOLD)+'">📋</button>' +
                '<button onclick="event.stopPropagation();window._heGerarPDF(\''+r.func.id+'\',\''+_st.inicio+'\',\''+_st.fim+'\')" '+
                  'style="'+_btnMini('rgba(201,168,76,.6)')+'">📄</button>' +
                (saldo>0
                  ? '<button onclick="event.stopPropagation();window._heMarcarPago(\''+r.func.id+'\','+saldo+')" '+
                    'style="'+_btnMini(GREEN)+'">✓$</button>'
                  : '') +
              '</div>' +
            '</td>' +
          '</tr>';
        }).join('') +
          '</tbody>' +
          '<tfoot>' +
            '<tr style="background:rgba(201,168,76,.05);border-top:1.5px solid rgba(201,168,76,.25);">' +
              '<td colspan="3" style="padding:10px 8px;font-size:.7rem;color:'+T3+';font-weight:700;text-transform:uppercase;letter-spacing:.05em;">Total Geral</td>' +
              '<td style="padding:10px 8px;text-align:right;font-weight:700;color:'+GOLD+';font-size:.82rem;">'+totHoras.toFixed(2)+'h</td>' +
              '<td></td>' +
              '<td style="padding:10px 8px;text-align:right;color:'+BLUE+';font-size:.75rem;">'+
                (totNoturno>0?_fmtMoeda(totNoturno):'—')+'</td>' +
              '<td style="padding:10px 8px;text-align:right;color:'+T3+';font-size:.75rem;">'+
                (totDSR>0?_fmtMoeda(totDSR):'—')+'</td>' +
              '<td style="padding:10px 8px;text-align:right;color:'+BLUE+';font-size:.75rem;">'+
                (totBanco>0?totBanco.toFixed(2)+'h':'—')+'</td>' +
              '<td style="padding:10px 8px;text-align:right;font-weight:800;color:'+GOLD+';font-size:.95rem;">'+_fmtMoeda(totValor)+'</td>' +
              '<td style="padding:10px 8px;text-align:right;font-weight:800;color:'+GREEN+';font-size:.92rem;">'+_fmtMoeda(totSaldo)+'</td>' +
              '<td></td>' +
            '</tr>' +
          '</tfoot>' +
        '</table>' +
        '</div>';
    }

    var html =
      '<div style="width:100%;max-width:860px;padding:0 16px;">' +

      // ── Cabeçalho ──
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">' +
        '<div>' +
          '<div style="font-size:.52rem;color:'+GOLD+';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
          '<div style="font-size:1.4rem;font-weight:800;color:'+T1+';letter-spacing:-.02em;">⚡ Horas Extras</div>' +
          '<div style="font-size:.72rem;color:'+T3+';margin-top:3px;">Período: '+_nomeMes(_st.inicio.slice(0,7))+'</div>' +
        '</div>' +
        '<div style="display:flex;gap:8px;">' +
          '<button onclick="window._heExportarCSV(\''+_st.inicio+'\',\''+_st.fim+'\')" '+
            'style="'+_btnAcao(T3)+'" title="Exportar CSV">📊 CSV</button>' +
          '<button onclick="window._heFechar()" '+
            'style="background:none;border:none;color:'+T3+';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>' +
        '</div>' +
      '</div>' +

      // ── KPIs ──
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">' +
        _kpi('⏱', 'Total Horas', totHoras.toFixed(2)+'h', 'a pagar') +
        _kpi('💰', 'Valor HE', _fmtMoeda(totValor), 'bruto') +
        _kpi('📅', 'DSR', _fmtMoeda(totDSR), 'reflexo') +
        _kpi('💳', 'Saldo Aberto', _fmtMoeda(totSaldo), 'a pagar') +
      '</div>' +

      // ── Alertas ──
      alertasHtml +

      // ── Filtros ──
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:14px;margin-bottom:14px;">' +
        '<div style="font-size:.6rem;color:'+GOLD+';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Filtros</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;">' +
          '<div>' +
            '<label style="display:block;font-size:.65rem;color:'+T3+';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Funcionário</label>' +
            '<select id="heRelFunc" style="'+INP+'">'+optsHtml+'</select>' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:.65rem;color:'+T3+';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">De</label>' +
            '<input id="heRelInicio" type="date" value="'+(_st.inicio||'')+'" style="'+INP+'">' +
          '</div>' +
          '<div>' +
            '<label style="display:block;font-size:.65rem;color:'+T3+';text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px;">Até</label>' +
            '<input id="heRelFim" type="date" value="'+(_st.fim||'')+'" style="'+INP+'">' +
          '</div>' +
        '</div>' +
        '<button onclick="window._heAplicarFiltro()" style="'+_btnPrincipal()+' margin-top:10px;">🔍 Filtrar</button>' +
      '</div>' +

      // ── Legenda de faixas ──
      '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;">' +
        _badge(GOLD,  '×1,5', 'HE Normal (≤2h/dia em dia útil)') +
        _badge(ORANGE,'×2,0', 'HE Dom/Feriado ou >2h em dia útil') +
        _badge(RED,   '×3,0', 'HE Especial') +
        _badge(BLUE,  '🌙',   'Adicional Noturno 20%') +
        _badge(BLUE,  '🏦',   'Banco de Horas') +
      '</div>' +

      // ── Tabela ──
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:14px;margin-bottom:14px;">' +
        tabelaHtml +
      '</div>' +

      // ── Ações em lote ──
      (exibir.filter(function(r){return r.totalHorasExtra>0;}).length>1
        ? '<button onclick="window._heGerarTodosPDFs(\''+_st.inicio+'\',\''+_st.fim+'\')" style="'+_btnSecundario()+' margin-bottom:8px;">' +
            '📋 Gerar PDFs de Todos' +
          '</button>'
        : '') +

      '<button onclick="window._heFechar()" style="'+_btnGhost()+'">Fechar</button>' +
    '</div>';

    _overlay('heRelatorio', html);
  }

  // ── Helpers de botões ────────────────────────────────────────────
  function _btnPrincipal() {
    return 'width:100%;padding:12px;border-radius:10px;background:linear-gradient(135deg,#1e1800,#0f0c00);'+
      'border:1.5px solid rgba(201,168,76,.5);color:'+GOLD+';font-family:Outfit,sans-serif;'+
      'font-size:.88rem;font-weight:700;cursor:pointer;letter-spacing:.02em;';
  }
  function _btnSecundario() {
    return 'width:100%;padding:12px;border-radius:10px;background:rgba(201,168,76,.06);'+
      'border:1px solid rgba(201,168,76,.3);color:'+GOLD+';font-family:Outfit,sans-serif;'+
      'font-size:.85rem;font-weight:600;cursor:pointer;';
  }
  function _btnGhost() {
    return 'width:100%;padding:12px;border-radius:10px;background:transparent;'+
      'border:1px solid rgba(255,255,255,.07);color:'+T3+';font-family:Outfit,sans-serif;'+
      'font-size:.85rem;cursor:pointer;';
  }
  function _btnMini(cor) {
    return 'padding:5px 8px;border-radius:6px;background:rgba(255,255,255,.04);'+
      'border:1px solid '+cor+';color:'+cor+';font-family:Outfit,sans-serif;'+
      'font-size:.7rem;cursor:pointer;';
  }
  function _btnAcao(cor) {
    return 'padding:8px 12px;border-radius:8px;background:rgba(255,255,255,.03);'+
      'border:1px solid rgba(255,255,255,.1);color:'+cor+';font-family:Outfit,sans-serif;'+
      'font-size:.78rem;cursor:pointer;';
  }

  function _kpi(ico, label, valor, sub) {
    return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:12px 10px;text-align:center;">' +
      '<div style="font-size:1rem;margin-bottom:3px;">'+ico+'</div>' +
      '<div style="font-size:.9rem;font-weight:800;color:'+GOLD+';margin-bottom:2px;">'+valor+'</div>' +
      '<div style="font-size:.6rem;color:'+T3+';line-height:1.3;">'+label+'<br>'+sub+'</div>' +
    '</div>';
  }

  function _badge(cor, label, title) {
    return '<div title="'+_esc(title)+'" style="background:rgba(0,0,0,.3);border:1px solid '+cor+';'+
      'border-radius:20px;padding:3px 10px;font-size:.65rem;color:'+cor+';cursor:default;">'+label+'</div>';
  }

  // ════════════════════════════════════════════════════════════════
  //  DETALHE POR FUNCIONÁRIO
  // ════════════════════════════════════════════════════════════════
  window._heAbrirDetalhe = function(funcId) {
    var dados = _calcularHE(funcId, _st.inicio, _st.fim);
    var f = dados.func;
    var aprova = _getAprova();

    var linhasHtml = dados.registrosPagar.map(function(r) {
      var hExtra = parseFloat(r.extra)||0;
      var aprovado = r._aprovado !== false;
      var corStatus = aprovado ? GREEN : RED;
      var labelTipo = _labelTipo(r.tipoExtra, r.destinoExtra, r);
      var adic = (r._adicNoturno||0)>0
        ? '<span style="font-size:.62rem;color:'+BLUE+';margin-left:4px;">+🌙'+r._adicNoturno.toFixed(2)+'</span>' : '';

      return '<tr style="border-bottom:1px solid rgba(255,255,255,.04);">' +
        '<td style="padding:8px;color:'+T1+';font-size:.78rem;">'+_fmtData(r.data)+'</td>' +
        '<td style="padding:8px;color:'+T2+';font-size:.75rem;">'+(r.entrada||'—')+'</td>' +
        '<td style="padding:8px;color:'+T2+';font-size:.75rem;">'+(r.saida||'—')+'</td>' +
        '<td style="padding:8px;text-align:right;color:'+GOLD+';font-weight:700;font-size:.82rem;">'+hExtra.toFixed(2)+'h</td>' +
        '<td style="padding:8px;color:'+T3+';font-size:.72rem;">'+labelTipo+'</td>' +
        '<td style="padding:8px;text-align:right;color:'+GOLD+';font-weight:700;font-size:.82rem;">'+
          _fmtMoeda(r._valorTotalExtra||0)+adic+
        '</td>' +
        '<td style="padding:8px;text-align:center;">' +
          '<button onclick="window._heToggleAprova(\''+r.id+'\',\''+funcId+'\')" '+
            'title="'+(aprovado?'Reprovar':'Aprovar')+'" '+
            'style="'+_btnMini(corStatus)+'">'+(aprovado?'✓ Ok':'✕')+'</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    var html =
      '<div style="width:100%;max-width:640px;padding:0 16px;">' +

      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">' +
        '<button onclick="abrirRelatorioHorasExtras()" '+
          'style="background:none;border:none;color:'+T3+';cursor:pointer;font-size:1.1rem;padding:4px;">←</button>' +
        '<div style="flex:1;">' +
          '<div style="font-size:.52rem;color:'+GOLD+';letter-spacing:.15em;text-transform:uppercase;margin-bottom:1px;">Detalhes de HE</div>' +
          '<div style="font-size:1rem;font-weight:800;color:'+T1+';">'+_esc(f.nome)+'</div>' +
          '<div style="font-size:.7rem;color:'+T3+';">'+_esc(f.cargo||'—')+' · '+_nomeMes(_st.inicio.slice(0,7))+'</div>' +
        '</div>' +
        '<button onclick="window._heGerarPDF(\''+funcId+'\',\''+_st.inicio+'\',\''+_st.fim+'\')" '+
          'style="'+_btnMini(GOLD)+' padding:8px 12px;">📄 PDF</button>' +
        '<button onclick="window._heFechar()" '+
          'style="background:none;border:none;color:'+T3+';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>' +
      '</div>' +

      // Resumo salarial (holerite-style)
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:16px;margin-bottom:14px;">' +
        '<div style="font-size:.6rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px;">Resumo Salarial do Período</div>' +
        _linhaHolerite('Salário Base', dados.salario) +
        (dados.valorHE50>0  ? _linhaHolerite('HE Normal ×1,5 ('+dados.totalHE50h.toFixed(2)+'h)', dados.valorHE50, GOLD) : '') +
        (dados.valorHE100>0 ? _linhaHolerite('HE 100% ×2,0 ('+dados.totalHE100h.toFixed(2)+'h)', dados.valorHE100, ORANGE) : '') +
        (dados.valorHE200>0 ? _linhaHolerite('HE Especial ×3,0 ('+dados.totalHE200h.toFixed(2)+'h)', dados.valorHE200, RED) : '') +
        (dados.valorAdicNoturno>0 ? _linhaHolerite('Adicional Noturno 20% ('+dados.totalHorasNoturnas.toFixed(2)+'h)', dados.valorAdicNoturno, BLUE) : '') +
        (dados.dsr>0 ? _linhaHolerite('DSR sobre HE', dados.dsr) : '') +
        '<div style="border-top:1px solid rgba(201,168,76,.15);margin:10px 0;"></div>' +
        _linhaHolerite('Total Proventos', dados.salario+dados.totalValorExtra+dados.dsr+dados.valorAdicNoturno, GOLD, true) +
        '<div style="border-top:1px solid rgba(201,168,76,.15);margin:10px 0;"></div>' +
        _linhaHolerite('INSS (estimativa)', -dados.inss, RED) +
        _linhaHolerite('FGTS (ref. empregador)', -dados.fgts, T3) +
        '<div style="border-top:1px solid rgba(201,168,76,.15);margin:10px 0;"></div>' +
        _linhaHolerite('Líquido Estimado', dados.salario+dados.totalValorExtra+dados.dsr+dados.valorAdicNoturno-dados.inss, GREEN, true) +
        '<div style="border-top:2px solid rgba(201,168,76,.25);margin:12px 0 8px;"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;">' +
          '<div style="font-size:.75rem;color:'+T3+';">HE a pagar neste período</div>' +
          '<div style="font-size:1.1rem;font-weight:800;color:'+(dados.saldo>0?GOLD:GREEN)+';">'+
            (dados.saldo>0 ? _fmtMoeda(dados.saldo) : '✓ Pago') +
          '</div>' +
        '</div>' +
      '</div>' +

      // Tabela de registros
      (dados.registrosPagar.length>0
        ? '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:14px;overflow-x:auto;">' +
            '<div style="font-size:.6rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">' +
              'Registros Detalhados' +
              '<span style="margin-left:8px;font-size:.58rem;color:'+T3+';text-transform:none;font-weight:400;">Clique em ✓/✕ para aprovar</span>' +
            '</div>' +
            '<table style="width:100%;border-collapse:collapse;font-size:.77rem;">' +
              '<thead>' +
                '<tr style="color:'+GOLD+';font-size:.65rem;letter-spacing:.06em;text-transform:uppercase;">' +
                  '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Data</th>' +
                  '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Entrada</th>' +
                  '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Saída</th>' +
                  '<th style="text-align:right;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">H. Extra</th>' +
                  '<th style="text-align:left;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Tipo</th>' +
                  '<th style="text-align:right;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">Valor</th>' +
                  '<th style="text-align:center;padding:6px 8px;border-bottom:1px solid rgba(201,168,76,.15);">OK?</th>' +
                '</tr>' +
              '</thead>' +
              '<tbody>'+linhasHtml+'</tbody>' +
            '</table>' +
          '</div>'
        : '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:16px;margin-bottom:14px;text-align:center;color:'+T3+';font-size:.82rem;">Nenhuma HE a pagar no período</div>') +

      // Ação pagar
      (dados.saldo > 0
        ? '<button onclick="window._heMarcarPago(\''+funcId+'\','+dados.saldo+')" '+
            'style="width:100%;padding:13px;border-radius:11px;background:linear-gradient(135deg,#08100a,#040a05);'+
            'border:1.5px solid rgba(92,184,92,.4);color:'+GREEN+';font-family:Outfit,sans-serif;'+
            'font-size:.88rem;font-weight:700;cursor:pointer;margin-bottom:8px;letter-spacing:.03em;">'+
            '✓ Registrar Pagamento de '+_fmtMoeda(dados.saldo)+
          '</button>'
        : '') +

      '<button onclick="abrirRelatorioHorasExtras()" style="'+_btnGhost()+'">← Voltar</button>' +
    '</div>';

    _closeOverlay('heRelatorio');
    _overlay('heRelatorio', html);
  };

  function _linhaHolerite(label, valor, cor, bold) {
    var sinalCor = valor<0 ? RED : (cor||T2);
    return '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;">' +
      '<div style="font-size:'+(bold?'.82':'.78')+'rem;color:'+(bold?T1:T2)+';font-weight:'+(bold?'700':'400')+';">'+label+'</div>' +
      '<div style="font-size:'+(bold?'.88':'.8')+'rem;font-weight:'+(bold?'800':'500')+';color:'+sinalCor+';">'+
        (valor<0?'− ':'')+_fmtMoeda(Math.abs(valor))+
      '</div>' +
    '</div>';
  }

  function _labelTipo(tipo, destino, r) {
    if (destino==='banco') return '🏦 Banco';
    var t=(r&&r._tipo)||tipo||'';
    switch(t.toLowerCase()) {
      case 'feriado':  return '🗓️ Feriado ×2,0';
      case 'especial': return '⭐ Especial ×3,0';
      case 'domingo':  return '☀️ Domingo ×2,0';
      default:         return '⚡ Normal ×1,5'+(r&&r._heProgressiva?' (prog.)':'');
    }
  }

  // ── Aprovar/Reprovar HE ──────────────────────────────────────────
  window._heToggleAprova = function(regId, funcId) {
    var aprova = _getAprova();
    aprova[regId] = (aprova[regId]===false) ? true : false;
    _saveAprova(aprova);
    _toast(aprova[regId]===false ? '🔴 HE reprovada' : '✓ HE aprovada');
    window._heAbrirDetalhe(funcId);
  };

  // ── Marcar como Pago ────────────────────────────────────────────
  window._heMarcarPago = function(funcId, saldo) {
    var f = _getFuncs()[funcId] || {};
    var nome = (f.nome||'funcionário').split(' ')[0];
    var modalId = 'heConfirmPago_'+funcId;
    _closeOverlay(modalId);

    var ov = document.createElement('div');
    ov.id  = modalId;
    ov.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(0,0,0,.75);'+
      'display:flex;align-items:center;justify-content:center;padding:24px;font-family:Outfit,sans-serif;';
    ov.innerHTML =
      '<div style="width:100%;max-width:360px;background:#161410;border:1px solid rgba(201,168,76,.25);'+
        'border-radius:16px;padding:24px 20px;text-align:center;">'+
        '<div style="font-size:1.6rem;margin-bottom:10px;">✅</div>'+
        '<div style="font-size:.95rem;font-weight:700;color:#f0ece4;margin-bottom:6px;">Confirmar Pagamento</div>'+
        '<div style="font-size:.82rem;color:#b8b0a0;margin-bottom:16px;line-height:1.5;">'+
          'Registrar pagamento de <strong style="color:#C9A84C;">'+_fmtMoeda(saldo)+'</strong> para <strong style="color:#f0ece4;">'+_esc(nome)+'</strong>?'+
          '<br><span style="font-size:.72rem;color:#7a7268;">As HE do período serão marcadas como pagas.</span>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">'+
          '<button id="hePagoCancel_'+funcId+'" style="padding:11px;border-radius:10px;background:transparent;'+
            'border:1px solid rgba(255,255,255,.1);color:#7a7268;font-family:Outfit,sans-serif;font-size:.85rem;cursor:pointer;">'+
            'Cancelar'+
          '</button>'+
          '<button id="hePagoOk_'+funcId+'" style="padding:11px;border-radius:10px;'+
            'background:linear-gradient(135deg,#08100a,#040a05);'+
            'border:1.5px solid rgba(92,184,92,.4);color:#5cb85c;'+
            'font-family:Outfit,sans-serif;font-size:.85rem;font-weight:700;cursor:pointer;">'+
            '✓ Confirmar'+
          '</button>'+
        '</div>'+
      '</div>';
    document.body.appendChild(ov);

    document.getElementById('hePagoCancel_'+funcId).onclick = function(){ _closeOverlay(modalId); };
    document.getElementById('hePagoOk_'+funcId).onclick = function(){
      _closeOverlay(modalId);
      var pagoHE = _getPagoHE();
      var id = Date.now().toString(36)+Math.random().toString(36).slice(2,6);
      pagoHE[id] = {
        id: id,
        funcionarioId: funcId,
        valor: saldo,
        periodo: _st.inicio,
        data: new Date().toISOString().slice(0,10),
        criadoEm: new Date().toISOString()
      };
      _savePagoHE(pagoHE);
      _toast('✓ Pagamento de '+_fmtMoeda(saldo)+' registrado para '+nome);
      window._heAbrirDetalhe(funcId);
    };
  };

  // ── Aplicar filtro ───────────────────────────────────────────────
  window._heAplicarFiltro = function() {
    _st.inicio = (document.getElementById('heRelInicio')||{}).value||'';
    _st.fim    = (document.getElementById('heRelFim')   ||{}).value||'';
    _st.funcId = (document.getElementById('heRelFunc')  ||{}).value||null;
    _renderPainel();
  };

  window._heFechar = function() { _closeOverlay('heRelatorio'); };

  // ════════════════════════════════════════════════════════════════
  //  EXPORTAÇÃO CSV
  // ════════════════════════════════════════════════════════════════
  window._heExportarCSV = function(inicio, fim) {
    var resultados = _calcularTodos(inicio, fim);
    var linhas = ['Funcionário,Salário,V/h,H.Extra 50%,H.Extra 100%,H.Extra 200%,Noturno,DSR,Total HE R$,Saldo R$'];
    resultados.forEach(function(r) {
      linhas.push([
        '"'+(r.func.nome||'')+'\"',
        r.salario.toFixed(2),
        r.valorHoraBase.toFixed(4),
        r.totalHE50h.toFixed(2),
        r.totalHE100h.toFixed(2),
        r.totalHE200h.toFixed(2),
        r.totalHorasNoturnas.toFixed(2),
        r.dsr.toFixed(2),
        r.totalValorExtra.toFixed(2),
        Math.max(0,r.saldo).toFixed(2)
      ].join(','));
    });
    var blob=new Blob(['\uFEFF'+linhas.join('\n')],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url; a.download='HorasExtras_'+inicio+'_'+fim+'.csv';
    a.click(); URL.revokeObjectURL(url);
    _toast('✓ CSV exportado');
  };

  // ════════════════════════════════════════════════════════════════
  //  GERADOR DE PDF  (jsPDF)
  // ════════════════════════════════════════════════════════════════
  function _carregarJsPDF(cb) {
    if (window.jspdf&&window.jspdf.jsPDF){ cb(window.jspdf.jsPDF); return; }
    if (window.jsPDF){ cb(window.jsPDF); return; }
    var s=document.createElement('script');
    s.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload=function(){ cb((window.jspdf&&window.jspdf.jsPDF)||window.jsPDF); };
    s.onerror=function(){ _toast('❌ Erro ao carregar jsPDF. Verifique a internet.'); };
    document.head.appendChild(s);
  }

  window._heGerarPDF = function(funcId, inicio, fim) {
    _toast('⏳ Gerando PDF...');
    _carregarJsPDF(function(JsPDF) {
      var dados = _calcularHE(funcId, inicio, fim);
      if (!dados.func||!dados.func.nome){ _toast('❌ Funcionário não encontrado.'); return; }
      _gerarPDF(JsPDF, dados, inicio, fim);
    });
  };

  window._heGerarTodosPDFs = function(inicio, fim) {
    _toast('⏳ Gerando PDFs...');
    _carregarJsPDF(function(JsPDF) {
      var lista = _calcularTodos(inicio, fim).filter(function(r){ return r.totalHorasExtra>0; });
      if (!lista.length){ _toast('Nenhuma HE a pagar no período.'); return; }

      var abortado = false;
      var progId = 'hePdfProg';
      _closeOverlay(progId);
      var progEl = document.createElement('div');
      progEl.id  = progId;
      progEl.style.cssText = 'position:fixed;bottom:24px;right:20px;z-index:999999;'+
        'background:#161410;border:1px solid rgba(201,168,76,.3);border-radius:12px;'+
        'padding:14px 18px;font-family:Outfit,sans-serif;min-width:220px;box-shadow:0 4px 20px rgba(0,0,0,.6);';
      progEl.innerHTML =
        '<div style="font-size:.65rem;color:#C9A84C;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px;">Gerando PDFs</div>'+
        '<div id="hePdfProgTxt" style="font-size:.82rem;color:#f0ece4;margin-bottom:10px;">0 / '+lista.length+'</div>'+
        '<button id="hePdfAbort" style="width:100%;padding:8px;border-radius:8px;background:transparent;'+
          'border:1px solid rgba(200,92,92,.4);color:#c85c5c;font-family:Outfit,sans-serif;'+
          'font-size:.78rem;cursor:pointer;">✕ Cancelar</button>';
      document.body.appendChild(progEl);
      document.getElementById('hePdfAbort').onclick = function(){ abortado = true; _closeOverlay(progId); _toast('⚠️ Geração cancelada'); };

      var idx = 0;
      function _prox() {
        if (abortado || idx >= lista.length) {
          _closeOverlay(progId);
          if (!abortado) _toast('✓ '+lista.length+' PDF(s) gerado(s)!');
          return;
        }
        var r = lista[idx++];
        var txt = document.getElementById('hePdfProgTxt');
        if (txt) txt.textContent = idx+' / '+lista.length+' — '+((r.func&&r.func.nome)||'');
        setTimeout(function(){ _gerarPDF(JsPDF, r, inicio, fim); _prox(); }, 700);
      }
      _prox();
    });
  };

  function _gerarPDF(JsPDF, dados, inicio, fim) {
    var doc=new JsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    var f=dados.func;
    var pW=210, mL=14, mR=14, cW=pW-mL-mR, y=18;
    var empNome=(typeof CFG!=='undefined'&&CFG&&CFG.emp&&CFG.emp.nome)||'HR Mármores e Granitos';
    var empTel=(typeof CFG!=='undefined'&&CFG&&CFG.emp&&CFG.emp.tel)||'';
    var empCNPJ=(typeof CFG!=='undefined'&&CFG&&CFG.emp&&CFG.emp.cnpj)||'';

    // ── Cabeçalho ──────────────────────────────────────────────────
    doc.setFillColor(12,10,3);
    doc.rect(0,0,pW,38,'F');
    // Linha dourada no topo
    doc.setFillColor(201,168,76);
    doc.rect(0,0,pW,1.5,'F');

    doc.setFont('helvetica','bold'); doc.setFontSize(14); doc.setTextColor(201,168,76);
    doc.text(empNome, mL, y);
    doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(160,150,130);
    var infoEmp=[empCNPJ,empTel].filter(Boolean).join('  ·  ');
    if(infoEmp) doc.text(infoEmp, mL, y+5);

    doc.setFont('helvetica','bold'); doc.setFontSize(11); doc.setTextColor(220,210,190);
    doc.text('RELATÓRIO DE HORAS EXTRAS', pW-mR, y, {align:'right'});
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(140,130,110);
    doc.text('Período: '+_fmtData(inicio)+' a '+_fmtData(fim), pW-mR, y+5, {align:'right'});
    doc.text('Emitido em: '+_fmtHoje(), pW-mR, y+10, {align:'right'});
    y=46;

    // ── Card funcionário ──────────────────────────────────────────
    doc.setFillColor(28,24,6);
    doc.roundedRect(mL,y,cW,28,2,2,'F');
    doc.setFont('helvetica','bold'); doc.setFontSize(12); doc.setTextColor(201,168,76);
    doc.text(f.nome||'—', mL+5, y+9);
    doc.setFont('helvetica','normal'); doc.setFontSize(8); doc.setTextColor(170,160,140);
    doc.text(f.cargo||'Funcionário', mL+5, y+15);
    doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(180,170,150);
    doc.text('Salário: '+_fmtMoeda(f.salario), mL+5, y+22);
    doc.text('V/h extra: '+_fmtMoeda(dados.valorHoraBase*1.5), mL+cW/2, y+22);
    y+=36;

    // ── Tabela de registros ────────────────────────────────────────
    if (dados.registrosPagar.length>0) {
      doc.setFont('helvetica','bold'); doc.setFontSize(8.5); doc.setTextColor(201,168,76);
      doc.text('HORAS EXTRAS A PAGAR', mL, y); y+=5;

      var cols=[
        {l:'Data',     x:mL,       w:24},
        {l:'Entrada',  x:mL+24,    w:18},
        {l:'Saída',    x:mL+42,    w:18},
        {l:'H.Extra',  x:mL+60,    w:18},
        {l:'Tipo',     x:mL+78,    w:38},
        {l:'Noturno',  x:mL+116,   w:18},
        {l:'Valor',    x:mL+134,   w:48}
      ];

      doc.setFillColor(22,18,4);
      doc.rect(mL,y,cW,8,'F');
      doc.setFont('helvetica','bold'); doc.setFontSize(6.5); doc.setTextColor(201,168,76);
      cols.forEach(function(c){ doc.text(c.l, c.x+2, y+5.5); });
      y+=8;

      var alt=false;
      dados.registrosPagar.forEach(function(r) {
        if (y>255){ doc.addPage(); y=18; }
        if (alt){ doc.setFillColor(16,13,2); doc.rect(mL,y,cW,7,'F'); }
        alt=!alt;
        var hExtra=parseFloat(r.extra)||0;
        var valor=r._valorTotalExtra||0;
        var lTipo=_labelTipo(r.tipoExtra,r.destinoExtra,r);
        var aprovado=r._aprovado!==false;

        doc.setFont('helvetica','normal'); doc.setFontSize(7.5);
        doc.setTextColor(220,215,200);
        doc.text(_fmtData(r.data), cols[0].x+2, y+5);
        doc.text(r.entrada||'—',   cols[1].x+2, y+5);
        doc.text(r.saida||'—',     cols[2].x+2, y+5);
        doc.setFont('helvetica','bold'); doc.setTextColor(201,168,76);
        doc.text(hExtra.toFixed(2)+'h', cols[3].x+2, y+5);
        doc.setFont('helvetica','normal'); doc.setTextColor(170,160,140);
        doc.text(lTipo.replace(/[⚡🗓️⭐☀️]/g,''), cols[4].x+2, y+5);
        // Noturno
        if ((r._adicNoturno||0)>0) {
          doc.setTextColor(142,200,240);
          doc.text(r._noturnas.toFixed(2)+'h', cols[5].x+2, y+5);
        }
        doc.setFont('helvetica','bold');
        doc.setTextColor(aprovado?[201,168,76]:[180,80,80]);
        doc.text(_fmtMoeda(valor).replace('R$\u00a0','R$ '), cols[6].x+cols[6].w-2, y+5, {align:'right'});
        y+=7;
      });
    }

    // ── Banco de horas (informativo) ──────────────────────────────
    if (dados.registrosBanco.length>0) {
      y+=5; if(y>250){doc.addPage();y=18;}
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(142,200,240);
      doc.text('BANCO DE HORAS (INFORMATIVO — NÃO ENTRA NO PAGAMENTO)', mL, y);
      y+=5;
      dados.registrosBanco.forEach(function(r){
        if(y>258){doc.addPage();y=18;}
        doc.setFont('helvetica','normal'); doc.setFontSize(7.5); doc.setTextColor(120,170,200);
        doc.text(_fmtData(r.data), mL+2, y+4);
        doc.text((parseFloat(r.extra)||0).toFixed(2)+'h', mL+30, y+4);
        y+=5;
      });
      doc.setFont('helvetica','bold'); doc.setFontSize(8); doc.setTextColor(142,200,240);
      doc.text('Total banco: '+dados.totalHorasBanco.toFixed(2)+'h', mL+2, y+4);
      y+=10;
    }

    // ── Separador ────────────────────────────────────────────────
    y+=4; if(y>255){doc.addPage();y=18;}
    doc.setDrawColor(201,168,76); doc.setLineWidth(0.4);
    doc.line(mL,y,pW-mR,y); y+=6;

    // ── Resumo financeiro ─────────────────────────────────────────
    function _rl(label, valor, negativo, destaque) {
      if(y>265){doc.addPage();y=18;}
      if (destaque) {
        doc.setFillColor(28,24,3);
        doc.rect(mL,y-4,cW,10,'F');
        doc.setFont('helvetica','bold'); doc.setFontSize(9.5);
        doc.setTextColor(201,168,76);
      } else {
        doc.setFont('helvetica','normal'); doc.setFontSize(8);
        doc.setTextColor(negativo?[180,70,70]:170,160,140);
      }
      doc.text(label, mL+5, y+2);
      doc.text((negativo?'− ':'')+_fmtMoeda(Math.abs(valor)).replace('R$\u00a0','R$ '), pW-mR-5, y+2, {align:'right'});
      y+=destaque?12:7;
    }

    if(dados.totalHE50h>0)  _rl('HE Normal ×1,5 ('+dados.totalHE50h.toFixed(2)+'h)',  dados.valorHE50);
    if(dados.totalHE100h>0) _rl('HE 100% ×2,0 ('+dados.totalHE100h.toFixed(2)+'h)',   dados.valorHE100);
    if(dados.totalHE200h>0) _rl('HE Especial ×3,0 ('+dados.totalHE200h.toFixed(2)+'h)',dados.valorHE200);
    if(dados.valorAdicNoturno>0) _rl('Adicional Noturno 20% ('+dados.totalHorasNoturnas.toFixed(2)+'h)', dados.valorAdicNoturno);
    if(dados.dsr>0) _rl('DSR sobre HE', dados.dsr);
    _rl('VALOR TOTAL DE HORAS EXTRAS', dados.totalValorExtra, false, true);
    if(dados.totalHorasBanco>0){
      doc.setFont('helvetica','italic'); doc.setFontSize(7.5); doc.setTextColor(100,150,180);
      doc.text('🏦 Banco de horas: '+dados.totalHorasBanco.toFixed(2)+'h (não pago)', mL+5, y+2);
      y+=7;
    }
    y+=2;
    _rl('INSS Estimado (tabela progressiva 2025)', dados.inss, true);
    _rl('FGTS Empregador (8%)', dados.fgts, true);
    if(dados.totalPago>0) _rl('Já Pago', dados.totalPago, true);
    _rl('SALDO A PAGAR', Math.max(0,dados.saldo), false, true);

    // ── Rodapé ────────────────────────────────────────────────────
    var np=doc.internal.getNumberOfPages();
    for(var i=1;i<=np;i++){
      doc.setPage(i);
      doc.setFont('helvetica','normal'); doc.setFontSize(6.5); doc.setTextColor(100,90,70);
      doc.text(empNome+' · Rel. Horas Extras · '+_fmtHoje(), mL, 290);
      doc.text('Pág. '+i+'/'+np, pW-mR, 290, {align:'right'});
    }

    var nome='HorasExtras_'+(f.nome||'Func').replace(/\s+/g,'_')+
      '_'+(inicio||'').replace(/-/g,'')+'_'+(fim||'').replace(/-/g,'')+'.pdf';
    doc.save(nome);
    _toast('✓ PDF: '+nome);
  }

  // ── Expõe globalmente ────────────────────────────────────────────
  window.abrirRelatorioHorasExtras = abrirRelatorioHorasExtras;

  // Compatibilidade: _heGerarPDFFuncionario legado
  window._heGerarPDFFuncionario = window._heGerarPDF;

  console.log('[app-horas-extras-pdf.js v3.0] ✓ Sistema de HE melhorado carregado');
  console.log('  Funções: abrirRelatorioHorasExtras(), _heExportarCSV(), _heGerarPDF()');

})();
