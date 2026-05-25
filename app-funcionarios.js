// ══════════════════════════════════════════════════════════════
// APP-FUNCIONARIOS v4 — HR Mármores e Granitos
// Design Premium + Novas Funcionalidades:
//   • Dashboard com gráfico de produtividade mensal
//   • Aniversariantes e datas comemorativas
//   • Registro rápido de ponto (1 toque)
//   • Perfil expandido com foto por câmera/galeria
//   • Folha de pagamento consolidada
//   • Busca rápida de funcionários
//   • Calendário de ponto visual
//   • Aviso de férias / vencimento de contrato
// ══════════════════════════════════════════════════════════════

var HR_FUNC = (function () {

  // ─────────────────────────────────────────────────────────────
  // 1. PERSISTÊNCIA
  // ─────────────────────────────────────────────────────────────
  var KEYS = { func:'hr_funcionarios', reg:'hr_registros', pag:'hr_pagamentos', ocor:'hr_ocorrencias' };

  function _load(key) { try { return JSON.parse(localStorage.getItem(key)||'{}'); } catch(e){ return {}; } }
  function _save(key,data) { try { localStorage.setItem(key,JSON.stringify(data)); } catch(e){ console.error('[HR]',e); } }

  function getFuncionarios() { return _load(KEYS.func); }
  function getRegistros()    { return _load(KEYS.reg);  }
  function getPagamentos()   { return _load(KEYS.pag);  }
  function getOcorrencias()  { return _load(KEYS.ocor); }
  function saveFuncionarios(d){ _save(KEYS.func,d); }
  function saveRegistros(d)   { _save(KEYS.reg,d);  }
  function savePagamentos(d)  { _save(KEYS.pag,d);  }
  function saveOcorrencias(d) { _save(KEYS.ocor,d); }
  function genId() { return Date.now().toString(36)+Math.random().toString(36).slice(2,6); }

  // ─────────────────────────────────────────────────────────────
  // 2. DESIGN TOKENS
  // ─────────────────────────────────────────────────────────────
  var GOLD='#C9A84C', GOLD2='rgba(201,168,76,.15)', GOLDB='rgba(201,168,76,.35)';
  var BG='var(--bg,#0d0c09)', S2='var(--s2,#161410)', S3='rgba(255,255,255,.03)';
  var BD='rgba(201,168,76,.12)', BD2='rgba(255,255,255,.07)';
  var T1='var(--t1,#f0ece4)', T2='var(--t2,#b8b0a0)', T3='var(--t3,#7a7268)';
  var GREEN='#5cb85c', RED='#c85c5c', BLUE='#5c8ec8';

  var CSS_INP = 'width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;'+
    'border:1px solid '+BD+';background:rgba(255,255,255,.03);color:'+T1+';'+
    'font-size:.88rem;font-family:Outfit,sans-serif;outline:none;transition:border-color .2s;';
  var CSS_BTN_GOLD = 'width:100%;padding:14px;border-radius:11px;'+
    'background:linear-gradient(135deg,#1c1600,#0d0b00);'+
    'border:1.5px solid '+GOLDB+';color:'+GOLD+';'+
    'font-family:Outfit,sans-serif;font-size:.92rem;font-weight:700;'+
    'cursor:pointer;margin-bottom:8px;letter-spacing:.04em;transition:opacity .15s;';
  var CSS_BTN_GREEN = 'width:100%;padding:13px;border-radius:11px;'+
    'background:linear-gradient(135deg,#091a09,#040d04);'+
    'border:1.5px solid rgba(92,184,92,.4);color:'+GREEN+';'+
    'font-family:Outfit,sans-serif;font-size:.9rem;font-weight:700;'+
    'cursor:pointer;margin-bottom:8px;letter-spacing:.03em;';
  var CSS_BTN_GHOST = 'width:100%;padding:12px;border-radius:11px;'+
    'background:transparent;border:1px solid '+BD2+';'+
    'color:'+T2+';font-family:Outfit,sans-serif;font-size:.85rem;cursor:pointer;margin-bottom:6px;';

  // ─────────────────────────────────────────────────────────────
  // 3. UTILITÁRIOS
  // ─────────────────────────────────────────────────────────────
  function _toast(m){ if(typeof toast==='function')toast(m); else console.log('[HR]',m); }
  function _esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _fmtData(iso){ if(!iso)return '—'; var p=iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
  function _fmtMoeda(v){ return 'R$ '+parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function _hoje(){ return new Date().toISOString().slice(0,10); }
  function _mesAno(offset){ var d=new Date(); d.setMonth(d.getMonth()+(offset||0)); return d.toISOString().slice(0,7); }
  function _diaSemana(iso){ var d=new Date(iso+'T12:00:00'); return ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][d.getDay()]; }
  function _tempoEmpresa(admissao){
    if(!admissao)return '';
    var d1=new Date(admissao+'T12:00:00'), d2=new Date();
    var meses=Math.floor((d2-d1)/(30.44*86400000));
    if(meses<1)return 'Recém admitido';
    if(meses<12)return meses+' mes'+(meses>1?'es':'');
    var anos=Math.floor(meses/12), m2=meses%12;
    return anos+'a'+(m2>0?' '+m2+'m':'');
  }
  function _closeOverlay(id){ var e=document.getElementById(id); if(e)e.remove(); }
  function _overlay(id,html){
    _closeOverlay(id);
    var ov=document.createElement('div');
    ov.id=id;
    ov.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(8,7,4,.97);'+
      'display:flex;flex-direction:column;align-items:center;overflow-y:auto;'+
      'font-family:Outfit,sans-serif;padding:24px 0 100px;';
    ov.innerHTML=html;
    document.body.appendChild(ov);
    return ov;
  }
  function _overlayHeader(titulo, subtitulo, onClose){
    return '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;width:100%;">'+
      '<div>'+
        '<div style="font-size:.55rem;color:'+GOLD+';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>'+
        '<div style="font-size:1.3rem;font-weight:800;color:'+T1+';letter-spacing:-.02em;">'+titulo+'</div>'+
        '<div style="font-size:.72rem;color:'+T3+';margin-top:3px;">'+subtitulo+'</div>'+
      '</div>'+
      '<button onclick="'+onClose+'" style="background:none;border:none;color:'+T3+';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>'+
    '</div>';
  }

  // ── Construtores de formulário ──
  function _campo(label, inputHtml){
    return '<div style="margin-bottom:12px;">'+
      '<div style="font-size:.72rem;color:'+T3+';font-weight:600;letter-spacing:.04em;margin-bottom:5px;">'+label+'</div>'+
      inputHtml+
    '</div>';
  }
  function _inp(id, type, placeholder, value, extra){
    value = value != null ? value : '';
    extra = extra || '';
    return '<input id="'+id+'" type="'+type+'" placeholder="'+_esc(placeholder)+'" value="'+_esc(String(value))+'" '+extra+
      ' style="'+CSS_INP+'">';
  }
  function _ta(id, placeholder, value, rows){
    value = value != null ? value : '';
    rows  = rows  || 3;
    return '<textarea id="'+id+'" placeholder="'+_esc(placeholder)+'" rows="'+rows+
      '" style="'+CSS_INP+'resize:vertical;">'+_esc(String(value))+'</textarea>';
  }
  function _sel(id, opts, selected){
    selected = selected != null ? String(selected) : '';
    var ops = opts.map(function(o){
      var sel = (String(o.v) === selected) ? ' selected' : '';
      return '<option value="'+_esc(String(o.v))+'"'+sel+'>'+_esc(o.l)+'</option>';
    }).join('');
    return '<select id="'+id+'" style="'+CSS_INP+'">'+ops+'</select>';
  }
  function _secao(titulo, conteudo){
    var header = titulo
      ? '<div style="font-size:.6rem;color:'+GOLD+';letter-spacing:.15em;text-transform:uppercase;'+
          'margin-bottom:12px;padding-bottom:6px;border-bottom:1px solid '+BD+';">'+titulo+'</div>'
      : '';
    return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;'+
      'padding:14px 16px;margin-bottom:12px;">'+header+conteudo+'</div>';
  }
  function _grid2(a, b){
    return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'+a+b+'</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // 4. CÁLCULO FINANCEIRO
  // ─────────────────────────────────────────────────────────────
  function _getMultNormal(){
    try{
      if(typeof CFG!=='undefined'&&CFG&&CFG.he&&CFG.he.normal)return CFG.he.normal;
      var s=JSON.parse(localStorage.getItem('cfg')||'{}');
      if(s.he&&s.he.normal)return s.he.normal;
    }catch(e){}
    return 2.0;
  }

  // Retorna o nº de dias úteis (seg–sáb) em um intervalo ISO yyyy-mm-dd (inclusivo).
  // Sábado é dia útil nesta marmoraria (turnos de produção confirmados no XLS).
  function _diasUteisNoIntervalo(di, df){
    var a=new Date(di+'T12:00:00'), b=new Date(df+'T12:00:00');
    var count=0;
    for(var d=new Date(a);d<=b;d.setDate(d.getDate()+1)){
      if(d.getDay()!==0) count++; // exclui apenas domingo
    }
    return count||1;
  }

  // Retorna o nº de dias úteis do mês da data ISO fornecida.
  function _diasUteisMes(anoMesISO){
    // anoMesISO pode ser 'yyyy-mm' ou uma data 'yyyy-mm-dd' — usa só yyyy-mm
    var ym=anoMesISO.slice(0,7);
    var ano=parseInt(ym.slice(0,4)), mes=parseInt(ym.slice(5,7));
    var ultimo=new Date(ano,mes,0).getDate();
    return _diasUteisNoIntervalo(ym+'-01', ym+'-'+String(ultimo).padStart(2,'0'));
  }

  // ══════════════════════════════════════════════════════════════════════════
  // Item 4 — BANCO DE HORAS (separado do financeiro HE paga)
  //
  // Regras:
  //  destinoExtra === 'banco'  → entra no saldo de banco, NÃO no financeiro
  //  destinoExtra === 'pagar'  → entra no financeiro, NÃO no banco
  //
  // calcSaldoBancoHoras retorna:
  //  acumuladoMin   — total de minutos creditados no banco (destinoExtra='banco')
  //  utilizadoMin   — total de minutos usados como folga (registros com tipo='folga_banco')
  //  saldoMin       — crédito disponível
  //  registros      — array dos registros que compõem o banco
  // ══════════════════════════════════════════════════════════════════════════

  function calcSaldoBancoHoras(funcId, di, df) {
    var regs = getRegistros();
    var acumuladoMin = 0, utilizadoMin = 0;
    var registrosBanco = [];

    Object.values(regs).forEach(function(r) {
      if (r.funcionarioId !== funcId) return;
      if (di && r.data < di) return;
      if (df && r.data > df) return;

      // Crédito: extras com destino=banco
      if (r.destinoExtra === 'banco') {
        var min = Math.round((parseFloat(r.extra) || 0) * 60);
        if (min > 0) {
          acumuladoMin += min;
          registrosBanco.push({ data: r.data, tipo: 'credito', min: min });
        }
      }

      // Débito: folgas compensadas — registros com tipo='folga_banco' criados ao lançar folga
      // (campo `tipo` no registro, distinto de `tipoExtra` que é 'normal'/'feriado'/'especial')
      if (r.tipo === 'folga_banco') {
        var dMin = Math.round(Math.abs(parseFloat(r.horas) || 0) * 60);
        if (dMin > 0) {
          utilizadoMin += dMin;
          registrosBanco.push({ data: r.data, tipo: 'debito', min: dMin });
        }
      }
    });

    return {
      acumuladoMin:    acumuladoMin,
      utilizadoMin:    utilizadoMin,
      saldoMin:        acumuladoMin - utilizadoMin,
      registros:       registrosBanco.sort(function(a,b){ return a.data.localeCompare(b.data); })
    };
  }

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
      totalSalario  = (salario / (duPeriodo || 1)) * dias;
    } else {
      var porMes = {};
      meusRegs.forEach(function(r){
        var m = r.data.slice(0, 7);
        if (!porMes[m]) porMes[m] = 0;
        porMes[m]++;
      });
      Object.keys(porMes).forEach(function(m){
        var duMes = _diasUteisMes(m);
        totalSalario += (salario / (duMes || 1)) * porMes[m];
      });
    }

    // ── Motor financeiro de HE — delegado ao HR_IMPORT (Bug 1 + Bug 2) ──
    // Mês de referência: início do período ou mês do registro mais antigo.
    var refMes = (di
      ? di
      : (meusRegs.length > 0
          ? meusRegs.slice().sort(function(a,b){ return a.data.localeCompare(b.data); })[0].data
          : new Date().toISOString())
    ).slice(0, 7);

    var heResult;
    if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcSaldoHE === 'function') {
      // Caminho principal: usa motor unificado com HE50/100/200 corretos
      heResult = HR_IMPORT.calcSaldoHE(meusRegs, f, refMes);
    } else {
      // Fallback seguro: comportamento anterior (sem quebrar se HR_IMPORT
      // não estiver carregado, ex: testes isolados)
      var mult          = _getMultNormal();
      var valorHoraFb   = salario / 220;
      var totalExtraFb  = meusRegs.reduce(function(s, r){
        return s + (r.destinoExtra === 'banco' ? 0 : (parseFloat(r.extra) || 0));
      }, 0);
      heResult = {
        valorHoraBase:    valorHoraFb,
        valorTotalExtras: totalExtraFb * valorHoraFb * mult,
        totalExtra50Min:  0, totalExtra100Min: 0, totalExtra200Min: 0,
        valorExtra50:     0, valorExtra100:    0, valorExtra200:    0,
        totalExtraHoras:  totalExtraFb
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

    // valorHoraExtra de referência (HE50 — mantido para exibição na UI)
    var valorHoraExtra = heResult.valorHoraBase * _getMultNormal();

    return {
      // Campos clássicos — mantidos para compatibilidade total com UI existente
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
      // Campos novos — breakdown por faixa (disponíveis para UI/relatórios futuros)
      valorExtra50:     heResult.valorExtra50,
      valorExtra100:    heResult.valorExtra100,
      valorExtra200:    heResult.valorExtra200,
      totalExtra50Min:  heResult.totalExtra50Min,
      totalExtra100Min: heResult.totalExtra100Min,
      totalExtra200Min: heResult.totalExtra200Min,
      // Item 4 — Banco de horas (separado do financeiro)
      banco:            calcSaldoBancoHoras(funcId, di, df)
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 5. DETECÇÃO DE GAPS
  // ─────────────────────────────────────────────────────────────
  function analisarGaps(funcId){
    var regs=getRegistros();
    var meusRegs=Object.values(regs)
      .filter(function(r){return r.funcionarioId===funcId;})
      .sort(function(a,b){return a.data.localeCompare(b.data);});
    if(meusRegs.length<2)return[];
    var alertas=[];
    var dataSet={};
    meusRegs.forEach(function(r){
      if(dataSet[r.data])alertas.push({tipo:'duplicata',descricao:'Data duplicada: '+_fmtData(r.data),data:r.data});
      dataSet[r.data]=true;
    });
    var datasUnicas=meusRegs.map(function(r){return r.data;}).filter(function(d,i,a){return a.indexOf(d)===i;});
    for(var i=0;i<datasUnicas.length-1;i++){
      var a=new Date(datasUnicas[i]+'T12:00:00'), b=new Date(datasUnicas[i+1]+'T12:00:00');
      var diff=Math.round((b-a)/86400000);
      if(diff<=1)continue;
      var faltando=[];
      for(var dd=1;dd<diff;dd++){
        var df2=new Date(a); df2.setDate(df2.getDate()+dd);
        var dow=df2.getDay();
        if(dow!==0) // ignora apenas domingo (sábado é dia útil nesta empresa)
          faltando.push(df2.toISOString().slice(0,10));
      }
      if(faltando.length>0){
        faltando.forEach(function(data){
          alertas.push({tipo:'gap',descricao:'Faltam 1 dia(s): '+_fmtData(data),diasFaltando:[data]});
        });
      }
    }
    return alertas;
  }

  // ─────────────────────────────────────────────────────────────
  // 5b. SISTEMA DE PENALIDADES — FALHA DE REGISTRO DE PONTO
  // Regra: registro incompleto de dia passado → auto-completa
  // com horário padrão e aplica desconto progressivo:
  //   1ª ocorrência consecutiva → −10 min
  //   2ª consecutiva            → −20 min
  //   nª consecutiva            → −(n×10) min
  // Sequência é reiniciada quando o funcionário registra
  // corretamente (sem auto-completamento).
  // ─────────────────────────────────────────────────────────────

  // Conta ocorrências consecutivas de falha imediatamente anteriores a dataRef
  function _contarOcorrenciasConsecutivas(funcId, dataRef) {
    var regs = getRegistros();
    var anteriores = Object.values(regs)
      .filter(function(r){ return r.funcionarioId === funcId && r.data < dataRef; })
      .sort(function(a,b){ return b.data.localeCompare(a.data); }); // mais recente primeiro
    var count = 0;
    for (var i = 0; i < anteriores.length; i++) {
      if (anteriores[i].autoCompletado) { count++; }
      else { break; } // dia limpo interrompe a sequência
    }
    return count;
  }

  // Auto-completa um registro incompleto de dia passado e aplica penalidade
  function _autoCompletarRegistro(funcId, reg) {
    if (!reg || reg.data >= _hoje()) return null; // apenas dias passados
    if (reg.autoCompletado) return null;          // já processado
    var faltaEntrada = !reg.entrada;
    var faltaSaida   = !reg.saida;
    if (!faltaEntrada && !faltaSaida) return null; // completo

    var funcs = getFuncionarios();
    var f = funcs[funcId] || {};
    var regs = getRegistros();

    // Horários padrão (usam horario do cadastro se disponível)
    var hrEnt = f.horarioEntrada || '07:00';
    var hrSai = f.horarioSaida   || '17:00';
    if (faltaEntrada) reg.entrada = hrEnt;
    if (faltaSaida)   reg.saida   = hrSai;

    // Recalcula horas a partir dos horários completos
    var ep = reg.entrada.split(':').map(Number);
    var sp = reg.saida.split(':').map(Number);
    var diff = (sp[0]*60+sp[1]) - (ep[0]*60+ep[1]);
    if (diff < 0) diff += 1440;
    // CORREÇÃO: não desconta almoço automaticamente no auto-completamento.
    // O registro foi auto-completado com horário padrão — já é uma situação
    // de exceção; subtrair mais 1h seria dupla penalidade injusta.
    var horasBrutas = diff / 60;
    reg.horas = parseFloat(horasBrutas.toFixed(2));

    // Calcula penalidade progressiva
    var nConsec = _contarOcorrenciasConsecutivas(funcId, reg.data);
    var penMin  = (nConsec + 1) * 10;           // 10, 20, 30...

    // Aplica desconto nas horas
    reg.horas        = Math.max(0, parseFloat((reg.horas - penMin / 60).toFixed(2)));
    reg.penalidade   = penMin;                   // minutos descontados (para exibição)
    reg.autoCompletado = true;
    reg.tipoFalha    = faltaEntrada ? 'sem_entrada' : (faltaSaida ? 'sem_saida' : 'ambos');
    reg.atualizadoEm = new Date().toISOString();

    regs[reg.id] = reg;
    saveRegistros(regs);

    // Registra ocorrência para auditoria
    var ocors = getOcorrencias();
    var oid = genId();
    ocors[oid] = {
      id: oid,
      funcionarioId: funcId,
      data: reg.data,
      registroId: reg.id,
      tipoFalha: reg.tipoFalha,
      horaAutoCompletada: faltaEntrada ? hrEnt : hrSai,
      penalidade: penMin,
      ocorrenciaNumero: nConsec + 1,
      criadoEm: new Date().toISOString()
    };
    saveOcorrencias(ocors);

    return { penMin: penMin, numero: nConsec + 1, data: reg.data };
  }

  // Varre registros incompletos de dias passados e aplica penalidades
  // Retorna array das penalidades aplicadas nesta chamada
  function _verificarRegistrosIncompletos(funcId) {
    var regs = getRegistros();
    var hoje = _hoje();
    var aplicadas = [];
    Object.values(regs)
      .filter(function(r){
        return r.funcionarioId === funcId
            && r.data < hoje
            && !r.autoCompletado
            && (!r.entrada || !r.saida);
      })
      .sort(function(a,b){ return a.data.localeCompare(b.data); })
      .forEach(function(r){
        var res = _autoCompletarRegistro(funcId, r);
        if (res) aplicadas.push(res);
      });
    return aplicadas;
  }

  // Retorna ocorrências de um funcionário ordenadas por data desc
  function getOcorrenciasFuncionario(funcId) {
    var ocors = getOcorrencias();
    return Object.values(ocors)
      .filter(function(o){ return o.funcionarioId === funcId; })
      .sort(function(a,b){ return b.data.localeCompare(a.data); });
  }

  // Bloco HTML resumido de penalidades para exibir no perfil
  function _blocoPenalidades(funcId) {
    var ocors = getOcorrenciasFuncionario(funcId);
    if (!ocors.length) return '';
    var totalMin = ocors.reduce(function(s,o){ return s + (o.penalidade||0); }, 0);
    var tipoLabel = { sem_entrada:'sem entrada', sem_saida:'sem saída', ambos:'sem entrada/saída' };
    var itens = ocors.slice(0,5).map(function(o){
      return '<div style="display:flex;justify-content:space-between;align-items:center;'+
        'padding:7px 0;border-bottom:1px solid rgba(255,255,255,.05);">' +
        '<div>' +
          '<span style="font-size:.78rem;font-weight:700;color:'+T1+';">'+_fmtData(o.data)+'</span>' +
          '<span style="font-size:.65rem;color:'+T3+';margin-left:7px;">'+_esc(tipoLabel[o.tipoFalha]||o.tipoFalha)+'</span>' +
          '<span style="font-size:.62rem;color:'+T3+';margin-left:5px;">(#'+o.ocorrenciaNumero+')</span>'+
        '</div>' +
        '<span style="font-size:.75rem;font-weight:700;color:'+RED+';white-space:nowrap;">−'+o.penalidade+' min</span>' +
      '</div>';
    }).join('');
    var mais = ocors.length > 5 ? '<div style="font-size:.65rem;color:'+T3+';text-align:center;padding:6px 0;">+' + (ocors.length-5) + ' ocorrência(s) anteriores</div>' : '';
    return '<div style="background:rgba(200,92,92,.06);border:1px solid rgba(200,92,92,.2);'+
      'border-radius:12px;padding:12px 14px;margin-bottom:12px;">' +
      '<div style="font-size:.68rem;font-weight:700;color:'+RED+';margin-bottom:8px;display:flex;justify-content:space-between;">' +
        '<span>⚠️ OCORRÊNCIAS DE PONTO</span>' +
        '<span>Total: −'+totalMin+' min</span>' +
      '</div>' +
      itens + mais +
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // 6. PÁGINA PRINCIPAL — DESIGN PREMIUM
  // ─────────────────────────────────────────────────────────────
  function renderPaginaFuncionarios(){
    var pg=document.getElementById('pg30'); if(!pg)return;
    var funcs=getFuncionarios();
    var regs=getRegistros();
    var lista=Object.values(funcs).sort(function(a,b){return a.nome.localeCompare(b.nome);});
    var ativos=lista.filter(function(f){return f.ativo!==false;});
    var allRegs=Object.values(regs);
    var hoje=_hoje();
    var mesAtual=_mesAno(0);

    // Stats do mês atual
    var regsDoMes=allRegs.filter(function(r){return r.data&&r.data.startsWith(mesAtual);});
    var totHorasMes=regsDoMes.reduce(function(s,r){return s+(parseFloat(r.horas)||0);},0);
    // totExtrasMes: apenas extras a PAGAR (alinhado com cálculo financeiro)
    var totExtrasMes=regsDoMes.reduce(function(s,r){return s+(r.destinoExtra==='banco'?0:(parseFloat(r.extra)||0));},0);
    // totBancoMes: extras que foram para o banco de horas (separado, para exibição)
    var totBancoMes=regsDoMes.reduce(function(s,r){return s+(r.destinoExtra==='banco'?(parseFloat(r.extra)||0):0);},0);
    var totalFolha=ativos.reduce(function(s,f){return s+(parseFloat(f.salario)||0);},0);

    // Aniversariantes do mês
    var mesHoje=hoje.slice(5,7);
    var aniversariantes=lista.filter(function(f){
      return f.nascimento&&f.nascimento.slice(5,7)===mesHoje&&f.ativo!==false;
    });

    // Funcionários que registraram ponto hoje
    var pontoHoje=lista.filter(function(f){
      return allRegs.some(function(r){return r.funcionarioId===f.id&&r.data===hoje;});
    });
    var semPontoHoje=ativos.filter(function(f){
      return !allRegs.some(function(r){return r.funcionarioId===f.id&&r.data===hoje;});
    });

    // Saldo total da folha (extras pendentes)
    var totalExtrasDevidos=0;
    ativos.forEach(function(f){
      var s=calcSaldoFuncionario(f.id,null,null);
      if(s.saldo>0)totalExtrasDevidos+=s.saldo;
    });

    // ── Chips de alerta rápido ──
    var alertChips='';
    if(semPontoHoje.length>0){
      alertChips+='<div style="background:#1a1200;border:1px solid rgba(201,168,76,.3);border-radius:8px;'+
        'padding:8px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;cursor:pointer;" '+
        'onclick="HR_FUNC._mostrarSemPonto()">' +
        '<span style="font-size:.9rem;">⏰</span>'+
        '<div><div style="font-size:.75rem;font-weight:700;color:'+GOLD+';">'+semPontoHoje.length+' sem ponto hoje</div>'+
        '<div style="font-size:.65rem;color:'+T3+';">Toque para ver quem falta</div></div>'+
        '<span style="margin-left:auto;font-size:.75rem;color:'+T3+';">→</span></div>';
    }
    if(aniversariantes.length>0){
      alertChips+='<div style="background:#1a1500;border:1px solid rgba(201,168,76,.25);border-radius:8px;'+
        'padding:8px 12px;margin-bottom:8px;display:flex;align-items:center;gap:8px;">' +
        '<span style="font-size:.9rem;">🎂</span>'+
        '<div style="font-size:.75rem;font-weight:700;color:'+GOLD+';">'+
        aniversariantes.map(function(f){return f.nome.split(' ')[0];}).join(', ')+' faz aniversário!</div></div>';
    }

    // ── Cards da equipe ──
    var busca=(window._hrBusca||'').toLowerCase();
    var listaFiltrada=busca?lista.filter(function(f){
      return f.nome.toLowerCase().indexOf(busca)!==-1||(f.cargo||'').toLowerCase().indexOf(busca)!==-1;
    }):lista;

    var cardsHtml=listaFiltrada.length===0
      ?'<div style="text-align:center;padding:40px 20px;color:'+T3+';font-size:.84rem;">'+
        (busca?'Nenhum resultado para "'+_esc(busca)+'"':'Nenhum funcionário cadastrado.<br><br>'+
        '<button onclick="HR_FUNC.abrirFormFuncionario(null)" style="'+CSS_BTN_GOLD+'width:auto;padding:10px 24px;">+ Cadastrar primeiro funcionário</button>')+'</div>'
      :listaFiltrada.map(function(f){return _cardFuncionario(f,pontoHoje);}).join('');

    pg.innerHTML=
      // ── Header ──
      '<div style="background:linear-gradient(180deg,rgba(201,168,76,.07) 0%,transparent 100%);'+
        'padding:20px 16px 14px;border-bottom:1px solid '+BD+';">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;">' +
          '<div>' +
            '<div style="font-size:.58rem;color:'+GOLD+';letter-spacing:.18em;text-transform:uppercase;margin-bottom:2px;">HR MÁRMORES</div>' +
            '<div style="font-size:1.4rem;font-weight:800;color:'+T1+';line-height:1;letter-spacing:-.02em;">Recursos Humanos</div>' +
            '<div style="font-size:.72rem;color:'+T3+';margin-top:4px;">'+_fmtData(hoje)+' · '+ativos.length+' ativo'+(ativos.length!==1?'s':'')+'</div>' +
          '</div>' +
          '<button onclick="HR_FUNC.abrirFormFuncionario(null)" '+
            'style="background:'+GOLD+';border:none;border-radius:10px;padding:10px 16px;'+
            'color:#000;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:800;cursor:pointer;white-space:nowrap;">+ Cadastrar</button>' +
        '</div>' +

        // Stats row
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;">' +
          _statKpi('👷','Equipe',ativos.length+'/'+lista.length,'ativos') +
          _statKpi('💵','Folha',_fmtMoeda(totalFolha),'mensal') +
          _statKpi('⏱','Horas/mês',totHorasMes.toFixed(0)+'h','registradas') +
          _statKpi('⚡','Extras/mês',totExtrasMes.toFixed(1)+'h'+(totBancoMes>0?' + 🏦'+totBancoMes.toFixed(1)+'h':''),'a pagar'+(totBancoMes>0?' · banco':' · acumuladas')) +
        '</div>' +
      '</div>' +

      // ── Alertas ──
      (alertChips?'<div style="padding:12px 16px 0;">'+alertChips+'</div>':'')+

      // ── Ações Rápidas ──
      '<div style="padding:14px 16px 0;">' +
        '<div style="font-size:.58rem;color:'+GOLD+';letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px;">Ações Rápidas</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">' +
          _btnAcao('📋','Histórico','Registros e ponto','HR_FUNC.abrirHistorico(null)','gold') +
          _btnAcao('💳','Pagamentos','Registrar pagamento','HR_FUNC.abrirFormPagamento(null)','green') +
        '</div>' +
        '<button onclick="HR_FUNC.abrirRegistroRapido()" '+
          'style="width:100%;padding:12px 16px;background:rgba(92,142,200,.07);'+
          'border:1.5px solid rgba(92,142,200,.3);border-radius:11px;color:'+BLUE+';'+
          'font-family:Outfit,sans-serif;font-size:.84rem;font-weight:700;cursor:pointer;'+
          'display:flex;align-items:center;justify-content:center;gap:9px;margin-bottom:8px;">' +
          '<span>⚡</span><span>Registro Rápido de Ponto</span>' +
        '</button>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
          '<button onclick="if(typeof abrirRelatorioHorasExtras===\'function\')abrirRelatorioHorasExtras();" '+
            'style="padding:11px;background:rgba(201,168,76,.05);border:1px solid '+BD+';'+
            'border-radius:11px;color:'+GOLD+';font-family:Outfit,sans-serif;font-size:.78rem;'+
            'font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">' +
            '<span>📊</span><span>H. Extras</span></button>' +
          '<button onclick="HR_FUNC.abrirFolhaPagamento()" '+
            'style="padding:11px;background:rgba(201,168,76,.05);border:1px solid '+BD+';'+
            'border-radius:11px;color:'+GOLD+';font-family:Outfit,sans-serif;font-size:.78rem;'+
            'font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">' +
            '<span>📑</span><span>Folha</span></button>' +
          '<button onclick="if(typeof abrirBancoHoras===\'function\')abrirBancoHoras();" '+
            'style="padding:11px;background:rgba(201,168,76,.05);border:1px solid '+BD+';'+
            'border-radius:11px;color:'+GOLD+';font-family:Outfit,sans-serif;font-size:.78rem;'+
            'font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">' +
            '<span>🏦</span><span>Banco</span></button>' +
        '</div>' +
        '<button onclick="if(typeof HR_IMPORT!==\'undefined\')HR_IMPORT.abrirImportacao();" '+
          'style="width:100%;margin-top:8px;padding:12px 16px;background:rgba(92,184,92,.06);'+
          'border:1.5px solid rgba(92,184,92,.28);border-radius:11px;color:'+GREEN+';'+
          'font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;'+
          'display:flex;align-items:center;justify-content:center;gap:9px;">'+
          '<span>📥</span><span>Importar Relatório de Presença</span>'+
        '</button>' +
        '<button onclick="HR_FUNC.abrirDashboardRisco()" '+
          'style="width:100%;margin-top:8px;padding:12px 16px;background:rgba(200,92,92,.06);'+
          'border:1.5px solid rgba(200,92,92,.28);border-radius:11px;color:'+RED+';'+
          'font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;'+
          'display:flex;align-items:center;justify-content:center;gap:9px;">'+
          '<span>⚠️</span><span>Dashboard de Risco</span>'+
        '</button>' +
      '</div>' +

      // ── Separador + Busca ──
      '<div style="padding:14px 16px 0;">' +
        '<div style="height:1px;background:'+BD+';margin-bottom:14px;"></div>' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">' +
          '<div style="font-size:.58rem;color:'+GOLD+';letter-spacing:.16em;text-transform:uppercase;">Equipe — '+lista.length+' funcionário'+(lista.length!==1?'s':'')+'</div>' +
          '<button onclick="HR_FUNC._toggleBusca()" style="background:none;border:none;color:'+T3+';cursor:pointer;font-size:.85rem;padding:4px;">🔍</button>' +
        '</div>' +
        '<div id="hrBuscaWrap" style="display:'+(busca?'block':'none')+';margin-bottom:10px;">' +
          '<input id="hrBuscaInp" type="search" placeholder="Buscar por nome ou cargo..." '+
            'value="'+_esc(window._hrBusca||'')+'" '+
            'oninput="window._hrBusca=this.value;HR_FUNC.renderPaginaFuncionarios();" '+
            'style="'+CSS_INP+'">' +
        '</div>' +
      '</div>' +

      // ── Lista da equipe ──
      '<div style="padding:0 16px 20px;">'+cardsHtml+'</div>';

    // Focus na busca se aberta
    if(busca||(document.getElementById('hrBuscaWrap')||{}).style){
      var inp=document.getElementById('hrBuscaInp');
      if(inp&&busca)setTimeout(function(){inp.focus();inp.setSelectionRange(999,999);},80);
    }
  }

  // ── KPI stat ──
  function _statKpi(ico,label,valor,sub){
    return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:10px 8px;text-align:center;">' +
      '<div style="font-size:.95rem;margin-bottom:2px;">'+ico+'</div>' +
      '<div style="font-size:.6rem;color:'+T3+';text-transform:uppercase;letter-spacing:.06em;">'+label+'</div>' +
      '<div style="font-size:.85rem;font-weight:800;color:'+GOLD+';margin-top:2px;line-height:1.1;">'+valor+'</div>' +
      '<div style="font-size:.58rem;color:'+T3+';">'+sub+'</div>' +
    '</div>';
  }

  // ── Botão de ação ──
  function _btnAcao(ico,titulo,sub,onclick,cor){
    var c=cor==='green'?GREEN:GOLD;
    var bg=cor==='green'?'rgba(92,184,92,.07)':'rgba(201,168,76,.07)';
    var bd=cor==='green'?'rgba(92,184,92,.3)':'rgba(201,168,76,.3)';
    return '<button onclick="'+onclick+'" style="background:'+bg+';border:1.5px solid '+bd+';'+
      'border-radius:11px;padding:12px 10px;text-align:left;cursor:pointer;font-family:Outfit,sans-serif;">' +
      '<div style="font-size:1.1rem;margin-bottom:4px;">'+ico+'</div>' +
      '<div style="font-size:.82rem;font-weight:700;color:'+c+';">'+titulo+'</div>' +
      '<div style="font-size:.67rem;color:'+T3+';margin-top:2px;">'+sub+'</div>' +
    '</button>';
  }

  // ── Card do funcionário ──
  function _cardFuncionario(f, pontoHoje){
    var temPonto=pontoHoje&&pontoHoje.some(function(p){return p.id===f.id;});
    var alertas=analisarGaps(f.id);
    var saldo=calcSaldoFuncionario(f.id,null,null);

    var badges='';
    if(temPonto) badges+='<span style="font-size:.6rem;background:#0d1f0d;border:1px solid rgba(92,184,92,.5);color:'+GREEN+';border-radius:4px;padding:2px 7px;margin-right:4px;">✓ ponto</span>';
    if(alertas.length>0) badges+='<span style="font-size:.6rem;background:#1f1500;border:1px solid rgba(201,168,76,.4);color:#c8a060;border-radius:4px;padding:2px 7px;margin-right:4px;">⚠ '+alertas.length+' alerta'+(alertas.length>1?'s':'')+'</span>';

    var saldoBadge='';
    if(saldo.saldo>0.5) saldoBadge='<span style="font-size:.62rem;color:'+GOLD+';">💰 a receber '+_fmtMoeda(saldo.saldo)+'</span>';
    else if(saldo.temCredito) saldoBadge='<span style="font-size:.62rem;color:'+GREEN+';">💳 crédito '+_fmtMoeda(Math.abs(saldo.saldo))+'</span>';

    // Linha de progresso tempo de empresa
    var tempoStr=_tempoEmpresa(f.admissao);

    return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:14px;'+
      'padding:14px 16px;margin-bottom:9px;cursor:pointer;'+
      'transition:border-color .2s;active:opacity:.9;" '+
      'onclick="HR_FUNC.abrirDetalhesFuncionario(\''+f.id+'\')">' +
      '<div style="display:flex;align-items:center;gap:13px;">' +
        _avatarCircle(f,50) +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
            '<div style="font-weight:700;color:'+T1+';font-size:.97rem;">'+_esc(f.nome)+'</div>' +
            _statusPill(f.ativo) +
          '</div>' +
          '<div style="font-size:.73rem;color:'+T3+';margin-top:1px;">'+
            _esc(f.cargo||'—')+(f.equipe?' · '+_esc(f.equipe):'')+
            (tempoStr?' · <span style="color:'+GOLD+'.7;">'+tempoStr+'</span>':'') +
          '</div>' +
          (badges?'<div style="margin-top:5px;">'+badges+'</div>':'')+
          (saldoBadge?'<div style="margin-top:3px;">'+saldoBadge+'</div>':'')+
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;">' +
          '<div style="font-size:.82rem;font-weight:700;color:'+GOLD+';">'+_fmtMoeda(f.salario)+'</div>' +
          '<div style="font-size:.62rem;color:'+T3+';margin-top:2px;">base mensal</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function _avatarCircle(f,sz){
    sz=sz||44;
    if(f.foto){
      return '<img src="'+f.foto+'" style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;object-fit:cover;'+
        'border:2px solid '+GOLDB+';flex-shrink:0;">';
    }
    var ini=(f.nome||'?').charAt(0).toUpperCase();
    var colors=['#8B6914','#6B4E9A','#2E7D6B','#7D2E2E','#1A6B7D'];
    var bg=colors[(f.nome||'').charCodeAt(0)%colors.length];
    return '<div style="width:'+sz+'px;height:'+sz+'px;border-radius:50%;'+
      'background:'+bg+';border:2px solid '+GOLDB+';'+
      'display:flex;align-items:center;justify-content:center;flex-shrink:0;'+
      'font-size:'+(sz*0.44)+'px;font-weight:800;color:#fff;letter-spacing:-.02em;">'+ini+'</div>';
  }

  function _statusPill(ativo){
    return ativo!==false
      ?'<span style="font-size:.6rem;background:#0d2010;border:1px solid rgba(92,184,92,.45);color:'+GREEN+';'+
        'border-radius:20px;padding:2px 8px;">● Ativo</span>'
      :'<span style="font-size:.6rem;background:#200d0d;border:1px solid rgba(200,92,92,.45);color:'+RED+';'+
        'border-radius:20px;padding:2px 8px;">○ Inativo</span>';
  }

  // Toggle busca
  window._hrBusca=window._hrBusca||'';
  function _toggleBusca(){
    var w=document.getElementById('hrBuscaWrap');
    if(!w)return;
    var show=w.style.display==='none';
    w.style.display=show?'block':'none';
    if(!show){window._hrBusca='';renderPaginaFuncionarios();}
    else{var i=document.getElementById('hrBuscaInp');if(i)setTimeout(function(){i.focus();},80);}
  }

  // Mostrar quem está sem ponto hoje
  function _mostrarSemPonto(){
    var hoje=_hoje();
    var regs=getRegistros();
    var funcs=getFuncionarios();
    var ativos=Object.values(funcs).filter(function(f){return f.ativo!==false;});
    var semPonto=ativos.filter(function(f){
      return !Object.values(regs).some(function(r){return r.funcionarioId===f.id&&r.data===hoje;});
    });
    var html='<div style="width:100%;max-width:480px;padding:0 16px;">'+
      _overlayHeader('Sem Ponto Hoje','⏰ '+_fmtData(hoje),'window._hrFecharSemPonto()')+
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:12px;">'+
      semPonto.map(function(f){
        return '<div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid '+BD+';">'+
          _avatarCircle(f,38)+
          '<div style="flex:1;">'+
            '<div style="font-weight:600;color:'+T1+';font-size:.9rem;">'+_esc(f.nome)+'</div>'+
            '<div style="font-size:.72rem;color:'+T3+';">'+_esc(f.cargo||'—')+'</div>'+
          '</div>'+
          '<button onclick="HR_FUNC.abrirFormRegistro(\''+f.id+'\');window._hrFecharSemPonto();" '+
            'style="background:'+GOLD2+';border:1px solid '+GOLDB+';color:'+GOLD+';border-radius:8px;padding:6px 12px;cursor:pointer;font-size:.75rem;font-family:Outfit,sans-serif;font-weight:700;">+ Ponto</button>'+
        '</div>';
      }).join('')+
      '</div>'+
      '<button onclick="window._hrFecharSemPonto()" style="'+CSS_BTN_GHOST+'">Fechar</button>'+
    '</div>';
    _overlay('hrSemPonto',html);
  }
  window._hrFecharSemPonto=function(){_closeOverlay('hrSemPonto');};

  // ─────────────────────────────────────────────────────────────
  // 7. FORMULÁRIO CADASTRO/EDIÇÃO — APRIMORADO
  // ─────────────────────────────────────────────────────────────
  function abrirFormFuncionario(id){
    var funcs=getFuncionarios();
    var f=id?(funcs[id]||{}):{};
    var isEdit=!!id;

    var html='<div style="width:100%;max-width:500px;padding:0 16px;">'+
      _overlayHeader(isEdit?'Editar Funcionário':'Novo Funcionário','RH · Equipe','HR_FUNC._closeForm()')+

      // Avatar preview + upload
      '<div style="text-align:center;margin-bottom:16px;">'+
        '<div id="ffAvatarPreview" style="width:72px;height:72px;border-radius:50%;'+
          'background:rgba(201,168,76,.15);border:2px dashed '+GOLDB+';'+
          'display:flex;align-items:center;justify-content:center;margin:0 auto 8px;'+
          'font-size:1.6rem;cursor:pointer;overflow:hidden;" '+
          'onclick="document.getElementById(\'ffFotoInp\').click()">'+
          (f.foto?'<img src="'+f.foto+'" style="width:100%;height:100%;object-fit:cover;">':'📷')+
        '</div>'+
        '<input type="file" id="ffFotoInp" accept="image/*" style="display:none;" onchange="HR_FUNC._previewFoto(this)">'+
        '<div style="font-size:.68rem;color:'+T3+';">Toque para adicionar foto</div>'+
      '</div>'+

      _secao('Dados Pessoais',
        _campo('Nome completo *',_inp('ff_nome','text','João da Silva',f.nome))+
        _campo('Telefone / WhatsApp',_inp('ff_tel','tel','(74) 9xxxx-xxxx',f.telefone))+
        _grid2(
          _campo('Data de Nascimento',_inp('ff_nasc','date','',f.nascimento)),
          _campo('CPF',_inp('ff_cpf','text','000.000.000-00',f.cpf))
        )
      )+

      _secao('Dados Profissionais',
        _campo('Cargo',_inp('ff_cargo','text','Ex: Marmorista, Ajudante...',f.cargo))+
        _grid2(
          _campo('Equipe',_sel('ff_equipe',[
            {v:'producao',l:'🏭 Produção'},{v:'instalacao',l:'🔧 Instalação'},
            {v:'escritorio',l:'🖥 Escritório'},{v:'geral',l:'🏢 Geral'}
          ],f.equipe||'producao')),
          _campo('Status',_sel('ff_ativo',[{v:'true',l:'✓ Ativo'},{v:'false',l:'✗ Inativo'}],f.ativo===false?'false':'true'))
        )+
        _grid2(
          _campo('Salário Mensal (R$)',_inp('ff_salario','number','0,00',f.salario,'min="0" step="0.01"')),
          _campo('Data de Admissão',_inp('ff_admissao','date','',f.admissao))
        )+
        _grid2(
          _campo('Banco',_inp('ff_banco','text','Ex: Bradesco',f.banco)),
          _campo('Chave PIX',_inp('ff_pix','text','CPF, tel ou e-mail',f.pix))
        )+
        _campo('Jornada diária (horas) — deixe 0 para padrão (8h seg-sex / 4h sáb)',
          _inp('ff_jornada','number','Ex: 4 para jovem aprendiz',
            f.jornadaDiariaMin ? (f.jornadaDiariaMin/60) : '',
            'min="0" max="12" step="0.5"')
        )
      )+

      _secao('Observações',
        _campo('Obs. interna (opcional)',_ta('ff_obs','Informações adicionais, restrições, metas...',f.obs,3))
      )+

      '<input type="hidden" id="ff_foto_val" value="'+_esc(f.foto||'')+'">'+
      '<button onclick="HR_FUNC._salvarFuncionario(\''+( id||'')+'\');" style="'+CSS_BTN_GOLD+'">💾 Salvar Funcionário</button>'+
      (isEdit?'<button onclick="HR_FUNC._excluirFuncionario(\''+id+'\')" style="'+CSS_BTN_GHOST+'color:'+RED+';border-color:rgba(200,92,92,.25);">🗑 Excluir Funcionário</button>':'')+
      '<button onclick="HR_FUNC._closeForm()" style="'+CSS_BTN_GHOST+'">Cancelar</button>'+
    '</div>';

    _overlay('hrFuncForm',html);
  }

  function _previewFoto(input){
    var file=input&&input.files&&input.files[0]; if(!file)return;
    var r=new FileReader();
    r.onload=function(e){
      var prev=document.getElementById('ffAvatarPreview');
      if(prev)prev.innerHTML='<img src="'+e.target.result+'" style="width:100%;height:100%;object-fit:cover;">';
      var hid=document.getElementById('ff_foto_val');
      if(hid)hid.value=e.target.result;
    };
    r.readAsDataURL(file);
  }

  function _closeForm(){ _closeOverlay('hrFuncForm'); }

  function _salvarFuncionario(id){
    var nome=(document.getElementById('ff_nome')||{}).value||'';
    if(!nome.trim()){_toast('Informe o nome');return;}
    var funcs=getFuncionarios();
    var funcId=id||genId(); var isNew=!id;
    var foto=(document.getElementById('ff_foto_val')||{}).value||
             (document.getElementById('ff_foto')||{}).value||
             (funcs[funcId]&&funcs[funcId].foto)||'';
    funcs[funcId]={
      id:funcId,nome:nome.trim(),
      telefone:(document.getElementById('ff_tel')||{}).value||'',
      foto:foto,
      nascimento:(document.getElementById('ff_nasc')||{}).value||'',
      cpf:(document.getElementById('ff_cpf')||{}).value||'',
      cargo:(document.getElementById('ff_cargo')||{}).value||'',
      equipe:(document.getElementById('ff_equipe')||{}).value||'producao',
      salario:parseFloat((document.getElementById('ff_salario')||{}).value)||0,
      admissao:(document.getElementById('ff_admissao')||{}).value||'',
      banco:(document.getElementById('ff_banco')||{}).value||'',
      pix:(document.getElementById('ff_pix')||{}).value||'',
      ativo:(document.getElementById('ff_ativo')||{}).value!=='false',
      jornadaDiariaMin:(function(){var v=parseFloat((document.getElementById('ff_jornada')||{}).value);return(!isNaN(v)&&v>0)?Math.round(v*60):0;}()),
      obs:(document.getElementById('ff_obs')||{}).value||'',
      criadoEm:(funcs[funcId]&&funcs[funcId].criadoEm)||new Date().toISOString(),
      atualizadoEm:new Date().toISOString()
    };
    saveFuncionarios(funcs); _closeForm(); renderPaginaFuncionarios();
    _toast(isNew?'✓ Funcionário cadastrado!':'✓ Funcionário atualizado!');
  }

  function _excluirFuncionario(id){
    var funcs=getFuncionarios(); var nome=(funcs[id]||{}).nome||'funcionário';
    if(!confirm('Excluir '+nome+'? Registros e pagamentos também serão apagados.'))return;
    delete funcs[id]; saveFuncionarios(funcs);
    var regs=getRegistros(); Object.keys(regs).forEach(function(k){if(regs[k].funcionarioId===id)delete regs[k];}); saveRegistros(regs);
    var pags=getPagamentos(); Object.keys(pags).forEach(function(k){if(pags[k].funcionarioId===id)delete pags[k];}); savePagamentos(pags);
    _closeForm(); renderPaginaFuncionarios(); _toast('Funcionário excluído.');
  }

  // ─────────────────────────────────────────────────────────────
  // 8. PERFIL COMPLETO DO FUNCIONÁRIO — NOVO DESIGN
  // ─────────────────────────────────────────────────────────────
  function abrirDetalhesFuncionario(id){
    var funcs=getFuncionarios(); var f=funcs[id]; if(!f)return;
    // Verifica e auto-completa registros incompletos de dias passados antes de calcular
    _verificarRegistrosIncompletos(id);
    var regs=getRegistros();
    var meusRegs=Object.values(regs).filter(function(r){return r.funcionarioId===id;})
      .sort(function(a,b){return b.data.localeCompare(a.data);});
    var hoje=_hoje();
    var mesAtual=_mesAno(0);
    var regsMes=meusRegs.filter(function(r){return r.data.startsWith(mesAtual);});

    var totalHoras=meusRegs.reduce(function(s,r){return s+(parseFloat(r.horas)||0);},0);
    // totalExtra: apenas extras a pagar (alinhado com calcSaldoFuncionario → calcSaldoHE)
    var totalExtra=meusRegs.reduce(function(s,r){return s+(r.destinoExtra==='banco'?0:(parseFloat(r.extra)||0));},0);
    var totalExtraBanco=meusRegs.reduce(function(s,r){return s+(r.destinoExtra==='banco'?(parseFloat(r.extra)||0):0);},0);
    var horasMes=regsMes.reduce(function(s,r){return s+(parseFloat(r.horas)||0);},0);
    // extraMes: apenas extras a pagar este mês (alinhado com financeiro)
    var extraMes=regsMes.reduce(function(s,r){return s+(r.destinoExtra==='banco'?0:(parseFloat(r.extra)||0));},0);
    var extraMesBanco=regsMes.reduce(function(s,r){return s+(r.destinoExtra==='banco'?(parseFloat(r.extra)||0):0);},0);
    var saldo=calcSaldoFuncionario(id,null,null);
    var alertas=analisarGaps(id);
    var temPontoHoje=meusRegs.some(function(r){return r.data===hoje;});

    var saldoColor=saldo.temCredito?GREEN:(saldo.saldo>0.01?GOLD:GREEN);
    var saldoLabel=saldo.temCredito?'💳 Crédito (overpago)':(saldo.saldo>0.01?'💰 A Receber':'✓ Quitado');

    // Calendário do mês atual (últimos 28 dias como grid)
    var calHtml=_calendarioMini(id,regs);

    // Alertas
    var alertasHtml='';
    if(alertas.length>0){
      alertasHtml='<div style="background:#16100a;border:1px solid rgba(201,168,76,.3);border-radius:12px;padding:12px 14px;margin-bottom:12px;">'+
        '<div style="font-size:.62rem;color:#c8a060;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">⚠️ Alertas</div>'+
        alertas.map(function(a){
          return '<div style="font-size:.75rem;color:#e0b870;padding:4px 0;border-bottom:1px solid rgba(200,160,60,.1);">'+_esc(a.descricao)+'</div>';
        }).join('')+
      '</div>';
    }
    // Bloco de ocorrências de falha de registro (penalidades)
    var penHtml=_blocoPenalidades(id);

    var html='<div style="width:100%;max-width:520px;padding:0 16px;">'+

      // Hero card
      '<div style="background:linear-gradient(135deg,'+S2+' 0%,rgba(201,168,76,.06) 100%);'+
        'border:1px solid '+BD+';border-radius:16px;padding:20px;margin-bottom:14px;'+
        'display:flex;align-items:center;gap:16px;">' +
        _avatarCircle(f,62)+
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-size:1.1rem;font-weight:800;color:'+T1+';letter-spacing:-.01em;">'+_esc(f.nome)+'</div>' +
          '<div style="font-size:.75rem;color:'+T3+';margin-top:2px;">'+_esc(f.cargo||'—')+'</div>' +
          '<div style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap;">'+
            _statusPill(f.ativo)+
            (f.equipe?'<span style="font-size:.6rem;background:'+GOLD2+';border:1px solid '+GOLDB+';color:'+GOLD+';border-radius:20px;padding:2px 8px;">'+_esc(f.equipe)+'</span>':'')+
            (temPontoHoje?'<span style="font-size:.6rem;background:#0d2010;border:1px solid rgba(92,184,92,.5);color:'+GREEN+';border-radius:20px;padding:2px 8px;">✓ ponto hoje</span>':'')+
            (typeof window.BH!=='undefined'?window.BH.badgeSaldo(id):'')+
          '</div>'+
          (_tempoEmpresa(f.admissao)?'<div style="font-size:.67rem;color:'+T3+';margin-top:4px;">⏳ '+_tempoEmpresa(f.admissao)+' na empresa</div>':'')+
        '</div>'+
        '<button onclick="HR_FUNC._closeDetalhes()" style="background:none;border:none;color:'+T3+';cursor:pointer;font-size:1.1rem;align-self:flex-start;padding:0;">✕</button>'+
      '</div>'+

      // Stats do mês vs geral
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">'+
        _statCard2('📅 Este mês','Dias: '+regsMes.length+' · '+horasMes.toFixed(0)+'h'+
          (extraMes>0?' · <span style="color:'+GOLD+';">+'+extraMes.toFixed(1)+'h extra</span>':'')+
          (extraMesBanco>0?' · <span style="color:#8ec8f0;">🏦 '+extraMesBanco.toFixed(1)+'h banco</span>':''))+
        _statCard2('📊 Total geral',totalHoras.toFixed(0)+'h trabalhadas · '+totalExtra.toFixed(1)+'h extra'+
          (totalExtraBanco>0?' · <span style="color:#8ec8f0;">🏦 '+totalExtraBanco.toFixed(1)+'h banco</span>':''))+
      '</div>'+

      // Financeiro
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:14px;">'+
        '<div style="font-size:.62rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:12px;">💰 Financeiro</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">'+
          _miniKpi('Salário base',_fmtMoeda(f.salario),GOLD)+
          _miniKpi('H. Extras R$',_fmtMoeda(saldo.valorExtra),saldo.valorExtra>0?GOLD:T3)+
          _miniKpi('Já pago',_fmtMoeda(saldo.totalPago),GREEN)+
        '</div>'+
        // Banco de horas — exibe linha separada quando há horas no banco (não entram no financeiro pago)
        (saldo.banco&&saldo.banco.acumuladoMin>0?
          '<div style="background:rgba(92,150,200,.08);border:1px solid rgba(92,150,200,.25);border-radius:9px;padding:9px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;">'+
            '<div>'+
              '<div style="font-size:.65rem;color:#8ec8f0;font-weight:700;margin-bottom:1px;">🏦 Banco de Horas</div>'+
              '<div style="font-size:.62rem;color:'+T3+';">Extras direcionadas para folga futura — não entram no pagamento</div>'+
            '</div>'+
            '<div style="text-align:right;white-space:nowrap;margin-left:12px;">'+
              '<div style="font-size:.88rem;font-weight:800;color:#8ec8f0;">'+
                (saldo.banco.saldoMin>=0?'+':'')+Math.floor(Math.abs(saldo.banco.saldoMin)/60)+'h'+
                (saldo.banco.saldoMin%60!==0?String(Math.abs(saldo.banco.saldoMin%60)).padStart(2,'0')+'m':'')+
              '</div>'+
              (saldo.banco.utilizadoMin>0?'<div style="font-size:.6rem;color:'+T3+';">usado: '+Math.floor(saldo.banco.utilizadoMin/60)+'h'+
                (saldo.banco.utilizadoMin%60!==0?String(saldo.banco.utilizadoMin%60).padStart(2,'0')+'m':'')+'</div>':'')+
            '</div>'+
          '</div>':'')+
        // Breakdown por faixa — exibe apenas quando há HE em múltiplas faixas
        ((saldo.valorExtra100>0||saldo.valorExtra200>0)?
          '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px;">'+
            (saldo.valorExtra50 >0?_miniKpi('HE 50%', _fmtMoeda(saldo.valorExtra50), GOLD)       :'')+
            (saldo.valorExtra100>0?_miniKpi('HE 100%',_fmtMoeda(saldo.valorExtra100),'#8ec8c8')  :'')+
            (saldo.valorExtra200>0?_miniKpi('HE 200%',_fmtMoeda(saldo.valorExtra200),'#c88e5c')  :'')+
          '</div>':'')+
        '<div style="font-size:.65rem;color:'+T3+';margin-bottom:10px;padding:6px 10px;background:rgba(0,0,0,.2);border-radius:8px;">'+
          '📐 Valor/h base: '+_fmtMoeda(saldo.valorHoraBase)+
          ' · Valor/h extra: '+_fmtMoeda(saldo.valorHoraExtra)+
        '</div>'+
        '<div style="background:rgba(0,0,0,.3);border-radius:10px;padding:12px;text-align:center;">'+
          '<div style="font-size:.67rem;color:'+T3+';margin-bottom:4px;">'+saldoLabel+'</div>'+
          '<div style="font-size:1.4rem;font-weight:800;color:'+saldoColor+';">'+_fmtMoeda(Math.abs(saldo.saldo))+'</div>'+
          (saldo.temCredito?'<div style="font-size:.65rem;color:'+GREEN+';margin-top:2px;">Desconta no próximo pagamento</div>':'')+
        '</div>'+
      '</div>'+

      penHtml+
      alertasHtml+

      // Calendário mini
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:14px;">'+
        '<div style="font-size:.62rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">📅 Ponto — Mês Atual</div>'+
        calHtml+
      '</div>'+

      // Informações adicionais
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:14px;">'+
        '<div style="font-size:.62rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">📋 Informações</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.78rem;">'+
          _infoRow2('Admissão',_fmtData(f.admissao))+
          _infoRow2('Telefone',f.telefone||'—')+
          _infoRow2('CPF',f.cpf||'—')+
          _infoRow2('Banco/PIX',f.banco?f.banco+(f.pix?' · '+f.pix:''):(f.pix||'—'))+
        '</div>'+
        (f.obs?'<div style="margin-top:10px;font-size:.73rem;color:'+T3+';border-top:1px solid '+BD+';padding-top:10px;">'+_esc(f.obs)+'</div>':'')+
      '</div>'+

      // Ações
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'+
        '<button onclick="HR_FUNC.abrirFormRegistro(\''+id+'\')" style="padding:13px;background:'+GOLD2+';border:1.5px solid '+GOLDB+';color:'+GOLD+';border-radius:11px;font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;">📝 Novo Registro</button>'+
        '<button onclick="HR_FUNC.abrirFormPagamento(\''+id+'\')" style="padding:13px;background:rgba(92,184,92,.07);border:1.5px solid rgba(92,184,92,.4);color:'+GREEN+';border-radius:11px;font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;">💳 Pagamento</button>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'+
        '<button onclick="HR_FUNC.abrirHistorico(\''+id+'\')" style="padding:11px;background:'+S3+';border:1px solid '+BD2+';color:'+T2+';border-radius:11px;font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">📋 Histórico</button>'+
        '<button onclick="HR_FUNC.abrirExtratoPagamentos(\''+id+'\')" style="padding:11px;background:'+S3+';border:1px solid '+BD2+';color:'+T2+';border-radius:11px;font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">📊 Extrato</button>'+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">'+
        '<button onclick="HR_FUNC.abrirFormFuncionario(\''+id+'\');HR_FUNC._closeDetalhes();" style="padding:11px;background:'+S3+';border:1px solid '+BD2+';color:'+T2+';border-radius:11px;font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">✏️ Editar</button>'+
        '<button onclick="HR_FUNC._whatsappFunc(\''+id+'\')" style="padding:11px;background:rgba(37,211,102,.06);border:1px solid rgba(37,211,102,.3);color:#25d366;border-radius:11px;font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">💬 WhatsApp</button>'+
      '</div>'+

      // Últimos registros
      (meusRegs.length>0?
        '<div style="font-size:.62rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;">Últimos Registros</div>'+
        meusRegs.slice(0,5).map(function(r){return _miniCardRegistro(r);}).join('')+
        (meusRegs.length>5?'<div style="text-align:center;padding:6px 0;font-size:.72rem;color:'+T3+';">+ '+(meusRegs.length-5)+' no histórico completo</div>':'')
      :'')+

      '<button onclick="HR_FUNC._closeDetalhes()" style="'+CSS_BTN_GHOST+'margin-top:8px;">Fechar</button>'+
    '</div>';

    _overlay('hrFuncDetalhes',html);
  }

  function _closeDetalhes(){ _closeOverlay('hrFuncDetalhes'); }

  // WhatsApp link
  function _whatsappFunc(id){
    var f=(getFuncionarios()[id]||{});
    if(!f.telefone){_toast('Funcionário sem telefone cadastrado.');return;}
    var tel=f.telefone.replace(/\D/g,'');
    if(tel.length<10){_toast('Número de telefone inválido.');return;}
    var url='https://wa.me/55'+tel+'?text='+encodeURIComponent('Olá '+f.nome.split(' ')[0]+', aqui é HR Mármores.');
    window.open(url,'_blank');
  }

  // Calendário mini do mês
  function _calendarioMini(funcId,regs){
    var hoje=_hoje();
    var ano=parseInt(hoje.slice(0,4)), mes=parseInt(hoje.slice(5,7));
    var diasNoMes=new Date(ano,mes,0).getDate();
    var primeroDia=new Date(ano+'-'+String(mes).padStart(2,'0')+'-01T12:00:00').getDay();

    // Pega registros do mês
    var mesStr=hoje.slice(0,7);
    var regsMes={};
    Object.values(regs).filter(function(r){return r.funcionarioId===funcId&&r.data.startsWith(mesStr);})
      .forEach(function(r){regsMes[r.data]=r;});

    var dias=['D','S','T','Q','Q','S','S'];
    var h='<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px;">';
    // Cabeçalho
    dias.forEach(function(d){
      h+='<div style="text-align:center;font-size:.55rem;color:'+T3+';padding:3px 0;font-weight:600;">'+d+'</div>';
    });
    // Dias vazios antes do mês
    for(var i=0;i<primeroDia;i++) h+='<div></div>';
    // Dias do mês
    for(var d=1;d<=diasNoMes;d++){
      var dStr=ano+'-'+String(mes).padStart(2,'0')+'-'+String(d).padStart(2,'0');
      var reg=regsMes[dStr];
      var isHoje=dStr===hoje;
      var dow=new Date(dStr+'T12:00:00').getDay();
      var isFDS=dow===0||dow===6;
      var bg='transparent', cor=T3, brd='transparent';
      if(isHoje){bg='rgba(201,168,76,.2)';cor=GOLD;brd=GOLDB;}
      if(reg){
        if(reg.autoCompletado){bg='rgba(200,92,92,.18)';cor=RED;brd='rgba(200,92,92,.3)';}
        else if(parseFloat(reg.extra)>0){bg='rgba(201,168,76,.25)';cor=GOLD;brd='transparent';}
        else{bg='rgba(92,184,92,.2)';cor=GREEN;brd='transparent';}
      }
      if(isFDS&&!reg){cor='rgba(122,114,104,.4)';}
      h+='<div style="text-align:center;padding:4px 2px;border-radius:6px;border:1px solid '+brd+';background:'+bg+';'+
        'font-size:.65rem;font-weight:'+(isHoje?'800':'600')+';color:'+cor+';cursor:'+(reg?'pointer':'default')+';" '+
        (reg?'onclick="HR_FUNC.abrirDetalhesRegistro(\''+reg.id+'\')" title="'+reg.horas+'h'+(parseFloat(reg.extra)>0?' +'+reg.extra+'h extra':'')+(reg.autoCompletado?' ⚠️ −'+reg.penalidade+'min':'')+'">':'>')+
        d+'</div>';
    }
    h+='</div>';
    // Legenda
    h+='<div style="display:flex;gap:12px;margin-top:8px;justify-content:center;">' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(92,184,92,.25);"></div>Ponto normal</div>' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(200,92,92,.2);border:1px solid rgba(200,92,92,.4);"></div>Auto-completado ⚠️</div>' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(201,168,76,.3);"></div>Com hora extra</div>' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(201,168,76,.2);border:1px solid '+GOLDB+';"></div>Hoje</div>' +
    '</div>';
    return h;
  }

  // Helpers de UI
  function _statCard2(titulo,corpo){
    return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:12px 14px;">' +
      '<div style="font-size:.65rem;font-weight:700;color:'+GOLD+';margin-bottom:5px;">'+titulo+'</div>' +
      '<div style="font-size:.78rem;color:'+T2+';line-height:1.5;">'+corpo+'</div>' +
    '</div>';
  }
  function _miniKpi(label,valor,cor){
    return '<div style="text-align:center;background:rgba(0,0,0,.2);border-radius:9px;padding:8px 6px;">' +
      '<div style="font-size:.6rem;color:'+T3+';margin-bottom:3px;">'+label+'</div>' +
      '<div style="font-size:.82rem;font-weight:700;color:'+(cor||GOLD)+';">'+valor+'</div>' +
    '</div>';
  }
  function _infoRow2(label,valor){
    return '<div>' +
      '<div style="font-size:.6rem;color:'+T3+';margin-bottom:2px;text-transform:uppercase;letter-spacing:.06em;">'+label+'</div>' +
      '<div style="font-size:.8rem;font-weight:600;color:'+T1+';">'+_esc(valor)+'</div>' +
    '</div>';
  }
  function _miniStat(label,valor){
    return '<div style="background:'+GOLD2+';border:1px solid '+GOLDB+';border-radius:9px;padding:9px 8px;text-align:center;">' +
      '<div style="font-size:.6rem;color:'+T3+';margin-bottom:3px;">'+label+'</div>' +
      '<div style="font-size:.85rem;font-weight:700;color:'+GOLD+';">'+valor+'</div>' +
    '</div>';
  }
  function _miniCardRegistro(r){
    return '<div style="background:rgba(201,168,76,.04);border:1px solid '+BD+';'+
      'border-radius:10px;padding:10px 13px;margin-bottom:7px;cursor:pointer;" '+
      'onclick="HR_FUNC.abrirDetalhesRegistro(\''+r.id+'\')">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div>' +
          '<span style="font-size:.82rem;font-weight:700;color:'+T1+';">'+_fmtData(r.data)+'</span>' +
          '<span style="font-size:.68rem;color:'+T3+';margin-left:6px;">'+_diaSemana(r.data)+'</span>' +
          (r.entrada&&r.saida?'<span style="font-size:.68rem;color:'+T3+';margin-left:6px;">'+r.entrada+'→'+r.saida+'</span>':'')+
        '</div>' +
        '<div style="display:flex;gap:6px;align-items:center;">' +
          (parseFloat(r.extra)>0?'<span style="font-size:.68rem;background:'+(r.destinoExtra==='banco'?'rgba(92,150,200,.18)':GOLD2)+';color:'+(r.destinoExtra==='banco'?'#8ec8f0':GOLD)+';border-radius:4px;padding:2px 7px;">'+(r.destinoExtra==='banco'?'🏦 ':'+')+(r.destinoExtra==='banco'?parseFloat(r.extra).toFixed(2)+'h banco':parseFloat(r.extra).toFixed(2)+'h')+'</span>':'')+
          '<span style="font-size:.78rem;font-weight:700;color:'+T1+';">'+(parseFloat(r.horas)||0).toFixed(1)+'h</span>' +
        '</div>' +
      '</div>' +
      (r.producao?'<div style="font-size:.68rem;color:'+T3+';margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">📦 '+_esc(r.producao)+'</div>':'')+
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // 9. REGISTRO RÁPIDO DE PONTO (nova feature)
  // ─────────────────────────────────────────────────────────────
  function abrirRegistroRapido(){
    var funcs=getFuncionarios();
    var regs=getRegistros();
    var hoje=_hoje();
    var ativos=Object.values(funcs).filter(function(f){return f.ativo!==false;})
      .sort(function(a,b){return a.nome.localeCompare(b.nome);});

    if(ativos.length===0){_toast('Nenhum funcionário ativo cadastrado.');return;}

    var agora=new Date();
    var horaAtual=agora.getHours().toString().padStart(2,'0')+':'+agora.getMinutes().toString().padStart(2,'0');

    var html='<div style="width:100%;max-width:480px;padding:0 16px;">'+
      _overlayHeader('Registro Rápido','⚡ '+_fmtData(hoje)+' · '+horaAtual,'window._hrFecharRapido()')+
      '<div style="font-size:.75rem;color:'+T3+';margin-bottom:14px;text-align:center;">'+
        'Marque a entrada ou saída de cada funcionário rapidamente' +
      '</div>'+
      '<div id="hrRapidoLista">'+
      ativos.map(function(f){
        var regHoje=Object.values(regs).find(function(r){return r.funcionarioId===f.id&&r.data===hoje;});
        var statusCor=regHoje?GREEN:T3;
        var statusTxt=regHoje?(regHoje.entrada&&regHoje.saida?'✓ Completo':'⏱ '+regHoje.entrada):'Sem ponto';
        return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;">'+
          _avatarCircle(f,40)+
          '<div style="flex:1;min-width:0;">'+
            '<div style="font-weight:700;color:'+T1+';font-size:.88rem;">'+_esc(f.nome.split(' ')[0])+'</div>'+
            '<div style="font-size:.68rem;color:'+statusCor+';">'+statusTxt+'</div>'+
          '</div>'+
          (regHoje&&regHoje.entrada&&!regHoje.saida
            ?'<button onclick="HR_FUNC._registrarSaida(\''+f.id+'\',\''+regHoje.id+'\')" '+
               'style="background:rgba(200,92,92,.1);border:1px solid rgba(200,92,92,.4);color:'+RED+';'+
               'border-radius:8px;padding:7px 13px;font-size:.75rem;font-family:Outfit,sans-serif;font-weight:700;cursor:pointer;">Saída</button>'
            :(!regHoje
              ?'<button onclick="HR_FUNC._registrarEntrada(\''+f.id+'\')" '+
                'style="background:rgba(92,184,92,.1);border:1px solid rgba(92,184,92,.4);color:'+GREEN+';'+
                'border-radius:8px;padding:7px 13px;font-size:.75rem;font-family:Outfit,sans-serif;font-weight:700;cursor:pointer;">Entrada</button>'
              :'<span style="font-size:.68rem;color:'+GREEN+';font-weight:700;padding:7px 10px;">✓</span>'
            )
          )+
        '</div>';
      }).join('')+
      '</div>'+
      '<button onclick="window._hrFecharRapido()" style="'+CSS_BTN_GHOST+'margin-top:8px;">Fechar</button>'+
    '</div>';

    _overlay('hrRegistroRapido',html);
  }
  window._hrFecharRapido=function(){_closeOverlay('hrRegistroRapido');};

  function _registrarEntrada(funcId){
    // Verifica e auto-completa registros incompletos de dias anteriores
    var penalidades = _verificarRegistrosIncompletos(funcId);
    if (penalidades.length > 0) {
      penalidades.forEach(function(p){
        _toast('⚠️ Ocorrência #'+p.numero+' em '+_fmtData(p.data)+': −'+p.penMin+' min');
      });
    }
    var agora=new Date();
    var hora=agora.getHours().toString().padStart(2,'0')+':'+agora.getMinutes().toString().padStart(2,'0');
    var regs=getRegistros();
    var id=genId();
    regs[id]={id:id,funcionarioId:funcId,data:_hoje(),entrada:hora,saida:'',horas:0,extra:0,
      producao:'',instalacao:'',ieo:'',observacao:'',criadoEm:new Date().toISOString(),atualizadoEm:new Date().toISOString()};
    saveRegistros(regs);
    abrirRegistroRapido();
    _toast('✓ Entrada registrada: '+hora);
  }

  function _registrarSaida(funcId,regId){
    var agora=new Date();
    var hora=agora.getHours().toString().padStart(2,'0')+':'+agora.getMinutes().toString().padStart(2,'0');
    var regs=getRegistros();
    var r=regs[regId]; if(!r)return;

    // Validação: saída não pode ser igual à entrada (registro impossível)
    if(r.entrada && r.entrada === hora){
      _toast('⛔ Horário de saída igual ao de entrada. Verifique o relógio.');
      return;
    }

    r.saida=hora;
    if(r.entrada){
      var ep=r.entrada.split(':').map(Number), sp=hora.split(':').map(Number);
      var diffMin=(sp[0]*60+sp[1])-(ep[0]*60+ep[1]);
      if(diffMin<0)diffMin+=1440;

      // CORREÇÃO: não desconta almoço automaticamente.
      // O relógio de ponto registra TRABALHO DIRETO quando não há batida de intervalo.
      // Descontar 1h sem registro real prejudica o funcionário.
      // O desconto só ocorre se houver intervalo registrado explicitamente (r.intervaloMin).
      var intervaloMin = r.intervaloMin || 0;
      r.horas = parseFloat(Math.max(0, (diffMin - intervaloMin) / 60).toFixed(2));

      // CORREÇÃO: calcula horas extras em relação à jornada esperada do funcionário
      var funcs = getFuncionarios();
      var f2 = funcs[funcId] || {};
      var dow = new Date(r.data+'T12:00:00').getDay();
      var jornadaEsperadaMin;
      if(f2.jornadaDiariaMin && f2.jornadaDiariaMin > 0){
        jornadaEsperadaMin = f2.jornadaDiariaMin;
      } else {
        // Padrão marmoraria: sábado = 4h, demais dias úteis = 8h
        jornadaEsperadaMin = (dow === 6) ? 240 : 480;
      }
      var extraMin = (diffMin - intervaloMin) - jornadaEsperadaMin;
      r.extra = extraMin > 0 ? parseFloat((extraMin / 60).toFixed(2)) : 0;
    }
    r.atualizadoEm=new Date().toISOString();
    saveRegistros(regs);
    abrirRegistroRapido();
    _toast('✓ Saída registrada: '+hora+(r.horas?' · '+r.horas+'h'+(r.extra>0?' +'+r.extra+'h extra':''):''));
  }

  // ─────────────────────────────────────────────────────────────
  // 10. FOLHA DE PAGAMENTO CONSOLIDADA (nova feature)
  // ─────────────────────────────────────────────────────────────
  function abrirFolhaPagamento(){
    var funcs=getFuncionarios();
    var mesAtual=_mesAno(0);
    var mesAnterior=_mesAno(-1);
    var periodoAtivo=window._folhaMes||mesAtual;

    var ativos=Object.values(funcs).filter(function(f){return f.ativo!==false;})
      .sort(function(a,b){return a.nome.localeCompare(b.nome);});

    var di=periodoAtivo+'-01';
    var ultimo=new Date(parseInt(periodoAtivo.slice(0,4)),parseInt(periodoAtivo.slice(5,7)),0);
    var df=periodoAtivo+'-'+String(ultimo.getDate()).padStart(2,'0');

    var totalFolha=0, totalExtras=0, totalPago=0;
    var linhas=ativos.map(function(f){
      var s=calcSaldoFuncionario(f.id,di,df);
      totalFolha+=s.totalSalario;
      totalExtras+=s.valorExtra;
      totalPago+=s.totalPago;
      return {f:f,s:s};
    });

    var fmtMes=function(m){var p=m.split('-');var nomes=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];return nomes[parseInt(p[1])]+'/'+p[0];};

    var html='<div style="width:100%;max-width:580px;padding:0 16px;">'+
      _overlayHeader('Folha de Pagamento','📑 '+fmtMes(periodoAtivo),'HR_FUNC._closeFolha()')+

      // Seletor de mês
      '<div style="display:flex;gap:8px;margin-bottom:14px;">'+
        [mesAnterior,mesAtual].map(function(m){
          var on=m===periodoAtivo;
          return '<button onclick="window._folhaMes=\''+m+'\';HR_FUNC.abrirFolhaPagamento();" '+
            'style="flex:1;padding:9px;border-radius:9px;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;'+
            (on?'background:'+GOLD2+';border:1.5px solid '+GOLDB+';color:'+GOLD+';':'background:'+S2+';border:1px solid '+BD+';color:'+T3+';"')+
            '>'+fmtMes(m)+'</button>';
        }).join('')+
      '</div>'+

      // Resumo
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:14px;">'+
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:10px;">'+
          _miniKpi('Salários',_fmtMoeda(totalFolha),GOLD)+
          _miniKpi('Extras',_fmtMoeda(totalExtras),GOLD)+
          _miniKpi('Pago',_fmtMoeda(totalPago),GREEN)+
        '</div>'+
        '<div style="background:rgba(0,0,0,.3);border-radius:9px;padding:10px;display:flex;justify-content:space-between;align-items:center;">'+
          '<span style="font-size:.75rem;color:'+T3+';">Total a pagar</span>'+
          '<span style="font-size:1rem;font-weight:800;color:'+GOLD+';">'+_fmtMoeda(Math.max(0,totalFolha+totalExtras-totalPago))+'</span>'+
        '</div>'+
      '</div>'+

      // Tabela
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;overflow:hidden;margin-bottom:14px;">'+
        '<div style="display:grid;grid-template-columns:1fr 80px 80px 90px 40px;gap:0;'+
          'padding:8px 14px;background:rgba(201,168,76,.06);'+
          'font-size:.6rem;color:'+GOLD+';letter-spacing:.08em;text-transform:uppercase;">'+
          '<span>Funcionário</span><span style="text-align:right;">Salário</span>'+
          '<span style="text-align:right;">Extras</span><span style="text-align:right;">Saldo</span><span></span>'+
        '</div>'+
        linhas.map(function(l,idx){
          var sc=l.s.temCredito?GREEN:(l.s.saldo>0.01?RED:T3);
          return '<div style="display:grid;grid-template-columns:1fr 80px 80px 90px 40px;gap:0;'+
            'padding:10px 14px;border-top:1px solid '+BD+';'+
            (idx%2===1?'background:rgba(255,255,255,.015);':'')+'align-items:center;">'+
            '<div>'+
              '<div style="font-size:.82rem;font-weight:600;color:'+T1+';">'+_esc(l.f.nome.split(' ')[0])+'</div>'+
              '<div style="font-size:.65rem;color:'+T3+';">'+l.s.diasTrabalhados+'d · '+l.s.totalHoras.toFixed(0)+'h</div>'+
            '</div>'+
            '<div style="text-align:right;font-size:.75rem;color:'+T2+';">'+_fmtMoeda(l.s.totalSalario)+'</div>'+
            '<div style="text-align:right;font-size:.75rem;color:'+(l.s.valorExtra>0?GOLD:T3)+';font-weight:'+(l.s.valorExtra>0?'700':'400')+';">'+_fmtMoeda(l.s.valorExtra)+'</div>'+
            '<div style="text-align:right;font-size:.8rem;font-weight:700;color:'+sc+';">'+_fmtMoeda(Math.abs(l.s.saldo))+'</div>'+
            '<div style="text-align:center;">'+
              '<button onclick="HR_FUNC.abrirFormPagamento(\''+l.f.id+'\');HR_FUNC._closeFolha();" '+
                'style="background:none;border:none;color:'+GREEN+';cursor:pointer;font-size:.9rem;padding:2px;" title="Registrar pagamento">💳</button>'+
            '</div>'+
          '</div>';
        }).join('')+
      '</div>'+
      '<button onclick="HR_FUNC._closeFolha()" style="'+CSS_BTN_GHOST+'">Fechar</button>'+
    '</div>';

    _overlay('hrFolha',html);
  }
  function _closeFolha(){ _closeOverlay('hrFolha'); }

  // ─────────────────────────────────────────────────────────────
  // 11. FORMULÁRIO REGISTRO OPERACIONAL
  // ─────────────────────────────────────────────────────────────
  function abrirFormRegistro(funcionarioId,registroId){
    var funcs=getFuncionarios(); var f=funcs[funcionarioId];
    if(!f){_toast('Funcionário não encontrado');return;}
    var regs=getRegistros(); var r=registroId?(regs[registroId]||{}):{};
    var hoje=_hoje();
    var alertas=!registroId?analisarGaps(funcionarioId):[];

    var alertasHtml=alertas.length>0?
      '<div style="background:#16100a;border:1px solid rgba(201,168,76,.3);border-radius:11px;padding:11px 13px;margin-bottom:12px;">'+
        '<div style="font-size:.62rem;color:#c8a060;font-weight:700;margin-bottom:5px;">⚠️ Gaps detectados:</div>'+
        alertas.map(function(a){return '<div style="font-size:.72rem;color:#e0b870;padding:2px 0;">'+_esc(a.descricao)+'</div>';}).join('')+
      '</div>':'';

    var html='<div style="width:100%;max-width:500px;padding:0 16px;">'+
      _overlayHeader((registroId?'Editar':'Novo Registro')+' · '+_esc(f.nome.split(' ')[0]),'📝 Ponto do Dia','HR_FUNC._closeRegistro()')+
      alertasHtml+

      _secao('Ponto',
        _campo('Data',_inp('fr_data','date','',r.data||hoje))+
        _grid2(
          _campo('Entrada',_inp('fr_entrada','time','07:00',r.entrada)),
          _campo('Saída',_inp('fr_saida','time','17:00',r.saida))
        )+
        _grid2(
          _campo('Horas trabalhadas',_inp('fr_horas','number','8',r.horas,'min="0" step="0.25"')),
          _campo('Horas extras',_inp('fr_extra','number','0',r.extra,'min="0" step="0.25"'))
        )+
        _campo('Tipo de hora extra',_sel('fr_tipoExtra',[
          {v:'normal',l:'Normal (×1.5)'},{v:'feriado',l:'Feriado (×2.0)'},{v:'especial',l:'Especial (×3.0)'}
        ],r.tipoExtra||'normal'))+
        _campo('Destino das H. Extras',_sel('fr_destinoExtra',[
          {v:'pagar',l:'💵 Pagar em dinheiro'},
          {v:'banco',l:'🏦 Banco de horas (folga futura)'}
        ],r.destinoExtra||'pagar'))
      )+

      _secao('Atividades',
        _campo('Produção executada',_ta('fr_producao','Ex: 3 bancadas, cuba cozinha...',r.producao,2))+
        _campo('Instalação',_ta('fr_instalacao','Ex: Banheiro cliente João...',r.instalacao,2))+
        _campo('IEO (Incidente / Evento / Obs.)',_ta('fr_ieo','Ex: atraso por chuva, acidente leve...',r.ieo,2))+
        _campo('Obs. gerais',_ta('fr_obs','',r.observacao,2))
      )+

      '<button onclick="HR_FUNC._salvarRegistro(\''+funcionarioId+'\',\''+(registroId||'')+'\')\" style="'+CSS_BTN_GOLD+'">💾 Salvar Registro</button>'+
      (registroId?'<button onclick="HR_FUNC._excluirRegistro(\''+registroId+'\',\''+funcionarioId+'\')" style="'+CSS_BTN_GHOST+'color:'+RED+';border-color:rgba(200,92,92,.25);">🗑 Excluir</button>':'')+
      '<button onclick="HR_FUNC._closeRegistro()" style="'+CSS_BTN_GHOST+'">Cancelar</button>'+
    '</div>';

    _overlay('hrFuncRegistro',html);

    setTimeout(function(){
      var ent=document.getElementById('fr_entrada'),sai=document.getElementById('fr_saida');
      if(ent&&sai){
        function calc(){
          if(!ent.value||!sai.value)return;
          if(ent.value===sai.value){
            _toast('⚠️ Entrada e saída iguais — verifique os horários.');
            return;
          }
          var e=ent.value.split(':').map(Number),s=sai.value.split(':').map(Number);
          var diffMin=(s[0]*60+s[1])-(e[0]*60+e[1]); if(diffMin<0)diffMin+=1440;
          // CORREÇÃO: não desconta almoço automaticamente.
          // O desconto só ocorre se houver intervalo registrado explicitamente.
          // O usuário pode ajustar o campo "Horas trabalhadas" manualmente se houver pausa.
          var hr=document.getElementById('fr_horas');
          if(hr&&!hr._edited)hr.value=(diffMin/60).toFixed(2);
        }
        ent.addEventListener('change',calc); sai.addEventListener('change',calc);
        var hr=document.getElementById('fr_horas');
        if(hr)hr.addEventListener('input',function(){hr._edited=true;});
      }
    },80);
  }

  function _closeRegistro(){ _closeOverlay('hrFuncRegistro'); }

  function _salvarRegistro(funcionarioId,registroId){
    var data=(document.getElementById('fr_data')||{}).value||'';
    if(!data){_toast('Informe a data');return;}

    // ── Validações básicas de jornada ────────────────────────────────────
    var entStr=(document.getElementById('fr_entrada')||{}).value||'';
    var saiStr=(document.getElementById('fr_saida')||{}).value||'';
    if(entStr&&saiStr){
      // CORREÇÃO: bloqueia registro com entrada = saída (ex: 17:30→17:30)
      if(entStr===saiStr){
        _toast('⛔ Entrada e saída não podem ser iguais. Verifique os horários.');
        return;
      }
      var epMin=entStr.split(':').map(Number); var spMin=saiStr.split(':').map(Number);
      var eM=epMin[0]*60+(epMin[1]||0), sM=spMin[0]*60+(spMin[1]||0);
      var diffTotalMin=sM-eM; if(diffTotalMin<0)diffTotalMin+=1440;
      // Bloqueia jornadas impossíveis (> 16h brutas)
      if(diffTotalMin>960){
        _toast('⛔ Jornada de '+Math.round(diffTotalMin/60)+'h parece incorreta. Verifique entrada e saída.');
        return;
      }
      // Integração com HR_IMPORT se disponível
      if(typeof HR_IMPORT!=='undefined'&&HR_IMPORT._validarJornada){
        var almocoInputVal=parseFloat((document.getElementById('fr_almoco')||{}).value)||0;
        var trava=HR_IMPORT._validarJornada(eM,sM,Math.round(almocoInputVal*60));
        if(!trava.valido){_toast('⛔ '+trava.motivo);return;}
      }
    }
    var regs=getRegistros(); var regId=registroId||genId(); var isNew=!registroId;
    var dup=Object.values(regs).find(function(r){return r.funcionarioId===funcionarioId&&r.data===data&&r.id!==regId;});
    if(dup&&!confirm('⚠️ Já existe registro em '+_fmtData(data)+'. Continuar?'))return;
    regs[regId]={id:regId,funcionarioId,data,
      entrada:(document.getElementById('fr_entrada')||{}).value||'',
      saida:(document.getElementById('fr_saida')||{}).value||'',
      horas:parseFloat((document.getElementById('fr_horas')||{}).value)||0,
      extra:parseFloat((document.getElementById('fr_extra')||{}).value)||0,
      tipoExtra:(document.getElementById('fr_tipoExtra')||{}).value||'normal',
      destinoExtra:(document.getElementById('fr_destinoExtra')||{}).value||'pagar',
      producao:(document.getElementById('fr_producao')||{}).value||'',
      instalacao:(document.getElementById('fr_instalacao')||{}).value||'',
      ieo:(document.getElementById('fr_ieo')||{}).value||'',
      observacao:(document.getElementById('fr_obs')||{}).value||'',
      criadoEm:(regs[regId]&&regs[regId].criadoEm)||new Date().toISOString(),
      atualizadoEm:new Date().toISOString()
    };
    saveRegistros(regs); _closeRegistro();
    var novosAlertas=analisarGaps(funcionarioId);
    _toast(isNew?'✓ Registro salvo!'+(novosAlertas.length?' ⚠️ '+novosAlertas.length+' alerta(s)':''):'✓ Registro atualizado!');
    if(document.getElementById('hrFuncDetalhes'))abrirDetalhesFuncionario(funcionarioId);
  }

  function _excluirRegistro(registroId,funcionarioId){
    if(!confirm('Excluir este registro?'))return;
    var regs=getRegistros(); delete regs[registroId]; saveRegistros(regs);
    _closeRegistro(); if(document.getElementById('hrFuncDetalhes'))abrirDetalhesFuncionario(funcionarioId);
    _toast('Registro excluído.');
  }

  function abrirDetalhesRegistro(registroId){
    var regs=getRegistros(); var r=regs[registroId]; if(!r)return;
    abrirFormRegistro(r.funcionarioId,registroId);
  }

  // ─────────────────────────────────────────────────────────────
  // 12. PAGAMENTOS
  // ─────────────────────────────────────────────────────────────
  function abrirFormPagamento(funcIdInicial){
    var funcs=getFuncionarios();
    var lista=Object.values(funcs).filter(function(f){return f.ativo!==false;}).sort(function(a,b){return a.nome.localeCompare(b.nome);});
    var opsFuncs=[{v:'',l:'— Selecione —'}].concat(lista.map(function(f){return{v:f.id,l:f.nome};}));
    var hoje=_hoje();
    var saldo=funcIdInicial?calcSaldoFuncionario(funcIdInicial,null,null):null;
    var f=funcIdInicial?(funcs[funcIdInicial]||{}):{};

    var html='<div style="width:100%;max-width:500px;padding:0 16px;">'+
      _overlayHeader('Registrar Pagamento','💳 RH · Financeiro','HR_FUNC._closePagamento()')+

      _secao('',
        _campo('Funcionário',_sel('pag_func',opsFuncs,funcIdInicial||''))+
        _grid2(
          _campo('Data',_inp('pag_data','date','',hoje)),
          _campo('Valor (R$)',_inp('pag_valor','number','0,00','','min="0.01" step="0.01"'))
        )+
        _campo('Forma',_sel('pag_forma',[{v:'dinheiro',l:'💵 Dinheiro'},{v:'pix',l:'📱 Pix'},{v:'ted',l:'🏦 TED/DOC'},{v:'cheque',l:'📋 Cheque'},{v:'outro',l:'Outro'}],'dinheiro'))+
        _campo('Observação (opcional)',_inp('pag_obs','text','adiantamento, salário...',''))
      )+

      '<div id="pag_saldo_info">'+(funcIdInicial&&saldo?_blocoSaldo(saldo,f):'')+'</div>'+

      '<button onclick="HR_FUNC._salvarPagamento()" style="'+CSS_BTN_GREEN+'">💳 Confirmar Pagamento</button>'+
      '<button onclick="HR_FUNC._closePagamento()" style="'+CSS_BTN_GHOST+'">Cancelar</button>'+
    '</div>';

    _overlay('hrPagamento',html);

    setTimeout(function(){
      var sel=document.getElementById('pag_func'); if(!sel)return;
      sel.addEventListener('change',function(){
        var fid=sel.value; var info=document.getElementById('pag_saldo_info');
        if(!info)return;
        if(!fid){info.innerHTML='';return;}
        var f2=getFuncionarios()[fid]||{};
        info.innerHTML=_blocoSaldo(calcSaldoFuncionario(fid,null,null),f2);
      });
    },80);
  }

  function _blocoSaldo(s,f){
    if(!s)return'';
    var sc=s.temCredito?GREEN:(s.saldo>0.01?RED:GOLD);
    var sl=s.temCredito?'💳 Crédito de '+_fmtMoeda(Math.abs(s.saldo)):(s.saldo>0.01?'💰 A Receber '+_fmtMoeda(s.saldo):'✓ Quitado');
    return'<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:13px;margin-bottom:12px;">'+
      '<div style="font-size:.62rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">💰 Saldo do Funcionário</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">'+
        _miniKpi('Salário',_fmtMoeda(f&&f.salario?f.salario:0),GOLD)+
        _miniKpi('H. Extras',_fmtMoeda(s.valorExtra),GOLD)+
        _miniKpi('Já pago',_fmtMoeda(s.totalPago),GREEN)+
      '</div>'+
      '<div style="background:rgba(0,0,0,.3);border-radius:9px;padding:10px;text-align:center;">'+
        '<div style="font-size:.67rem;color:'+T3+';margin-bottom:3px;">'+sl+'</div>'+
        '<div style="font-size:1.3rem;font-weight:800;color:'+sc+';">'+_fmtMoeda(Math.abs(s.saldo))+'</div>'+
        (s.temCredito?'<div style="font-size:.63rem;color:'+GREEN+';margin-top:3px;">Desconta no próximo pagamento</div>':'')+
      '</div>'+
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // 13. SALVAR / FECHAR PAGAMENTO
  // ─────────────────────────────────────────────────────────────
  function _closePagamento(){ _closeOverlay('hrPagamento'); }

  function _salvarPagamento(){
    var funcId=(document.getElementById('pag_func')||{}).value;
    var data=(document.getElementById('pag_data')||{}).value;
    var valor=parseFloat((document.getElementById('pag_valor')||{}).value);
    var forma=(document.getElementById('pag_forma')||{}).value||'dinheiro';
    var obs=(document.getElementById('pag_obs')||{}).value||'';
    if(!funcId){_toast('Selecione um funcionário');return;}
    if(!data){_toast('Informe a data');return;}
    if(!valor||valor<=0){_toast('Valor inválido');return;}
    var funcs=getFuncionarios();
    if(!funcs[funcId]){_toast('Funcionário não encontrado');return;}
    var pags=getPagamentos();
    var id=genId();
    pags[id]={id:id,funcionarioId:funcId,data:data,valor:valor,forma:forma,obs:obs,criadoEm:new Date().toISOString()};
    savePagamentos(pags);
    _toast('Pagamento de '+_fmtMoeda(valor)+' registrado!');
    _closePagamento();
    renderPaginaFuncionarios();
  }

  // ─────────────────────────────────────────────────────────────
  // 14. HISTÓRICO DE REGISTROS
  // ─────────────────────────────────────────────────────────────
  function abrirHistorico(funcId){
    var funcs=getFuncionarios();
    var lista=Object.values(funcs).filter(function(f){return f.ativo!==false;}).sort(function(a,b){return a.nome.localeCompare(b.nome);});
    var regs=getRegistros();
    var meusRegs=Object.values(regs).filter(function(r){return!funcId||r.funcionarioId===funcId;}).sort(function(a,b){return b.data.localeCompare(a.data);});

    var html='<div style="width:100%;max-width:540px;padding:0 16px;">'+
      _overlayHeader('Histórico de Registros','📋 RH · Ponto','HR_FUNC._closeHistorico()')+
      (lista.length>0?
        '<div style="margin-bottom:12px;">'+
          '<select id="hist_func" onchange="HR_FUNC._filtrarHistorico(this.value)" style="width:100%;padding:10px 14px;background:#1a1006;border:1px solid '+BD+';border-radius:10px;color:'+T1+';font-family:Outfit,sans-serif;font-size:.85rem;">'+
            '<option value="">— Todos os funcionários —</option>'+
            lista.map(function(fx){return'<option value="'+fx.id+'"'+(funcId===fx.id?' selected':'')+'>'+_esc(fx.nome)+'</option>';}).join('')+
          '</select>'+
        '</div>':'')+
      // Abas: Registros / Lotes importados
      '<div style="display:flex;gap:8px;margin-bottom:12px;">'+
        '<button id="hist_tab_regs" onclick="HR_FUNC._histTab(\'regs\')" style="flex:1;padding:9px;border-radius:9px;background:rgba(201,168,76,.18);border:1.5px solid '+GOLD+';color:'+GOLD+';font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;">📋 Registros</button>'+
        '<button id="hist_tab_lotes" onclick="HR_FUNC._histTab(\'lotes\')" style="flex:1;padding:9px;border-radius:9px;background:transparent;border:1px solid rgba(255,255,255,.1);color:'+T2+';font-family:Outfit,sans-serif;font-size:.8rem;cursor:pointer;">📦 Lotes importados</button>'+
      '</div>'+
      '<div id="hist_lista">'+_renderListaRegs(meusRegs,funcs,!!funcId)+'</div>'+
      '<div id="hist_lotes" style="display:none;">'+_renderListaLotes(funcId)+'</div>'+
      // Botão nuclear — apaga TODOS os registros de ponto (útil para reimportar do zero)
      '<button onclick="HR_FUNC._apagarTodosRegistros()" '+
        'style="width:100%;padding:11px;border-radius:11px;background:rgba(200,92,92,.08);'+
        'border:1px solid rgba(200,92,92,.25);color:'+RED+';font-family:Outfit,sans-serif;'+
        'font-size:.8rem;cursor:pointer;margin-top:4px;margin-bottom:4px;">'+
        '⚠️ Apagar TODOS os registros de ponto'+
      '</button>'+
      '<button onclick="HR_FUNC._closeHistorico()" style="'+CSS_BTN_GHOST+'margin-top:0;">Fechar</button>'+
    '</div>';

    _overlay('hrHistorico',html);
  }

  function _histTab(aba){
    var elRegs=document.getElementById('hist_lista');
    var elLotes=document.getElementById('hist_lotes');
    var btnRegs=document.getElementById('hist_tab_regs');
    var btnLotes=document.getElementById('hist_tab_lotes');
    if(!elRegs||!elLotes)return;
    var ativo='flex:1;padding:9px;border-radius:9px;background:rgba(201,168,76,.18);border:1.5px solid '+GOLD+';color:'+GOLD+';font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;';
    var inativo='flex:1;padding:9px;border-radius:9px;background:transparent;border:1px solid rgba(255,255,255,.1);color:'+T2+';font-family:Outfit,sans-serif;font-size:.8rem;cursor:pointer;';
    if(aba==='regs'){
      elRegs.style.display=''; elLotes.style.display='none';
      if(btnRegs)btnRegs.style.cssText=ativo; if(btnLotes)btnLotes.style.cssText=inativo;
    } else {
      elRegs.style.display='none'; elLotes.style.display='';
      if(btnRegs)btnRegs.style.cssText=inativo; if(btnLotes)btnLotes.style.cssText=ativo;
      // Atualiza a lista de lotes com o filtro atual de funcionário
      var funcId=(document.getElementById('hist_func')||{}).value||'';
      elLotes.innerHTML=_renderListaLotes(funcId||null);
    }
  }

  function _renderListaLotes(funcId){
    var regs=getRegistros(); var funcs=getFuncionarios();
    // Agrupa registros por loteId
    var lotes={};
    Object.values(regs).forEach(function(r){
      if(!r.loteId)return;
      if(funcId&&r.funcionarioId!==funcId)return;
      if(!lotes[r.loteId])lotes[r.loteId]={loteId:r.loteId,regs:[],datas:[],funcsSet:{}};
      lotes[r.loteId].regs.push(r);
      lotes[r.loteId].datas.push(r.data);
      lotes[r.loteId].funcsSet[r.funcionarioId]=true;
    });
    var lista=Object.values(lotes).sort(function(a,b){
      // ordena pelo registro mais recente de cada lote
      var ma=a.regs.map(function(r){return r.criadoEm||'';}).sort().pop()||'';
      var mb=b.regs.map(function(r){return r.criadoEm||'';}).sort().pop()||'';
      return mb.localeCompare(ma);
    });
    if(lista.length===0)return'<div style="text-align:center;color:'+T3+';padding:32px 0;font-size:.82rem;">Nenhum lote importado encontrado</div>';
    return lista.map(function(l){
      var datasSort=l.datas.slice().sort();
      var di=datasSort[0],df=datasSort[datasSort.length-1];
      var nFuncs=Object.keys(l.funcsSet).length;
      var nRegs=l.regs.length;
      // Data de importação = criadoEm do primeiro registro do lote
      var criadoEm=l.regs.map(function(r){return r.criadoEm||'';}).sort()[0]||'';
      var dtImp=criadoEm?new Date(criadoEm).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):'?';
      return'<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:13px;margin-bottom:10px;">'+
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">'+
          '<div style="flex:1;min-width:0;">'+
            '<div style="font-size:.82rem;font-weight:700;color:'+T1+';margin-bottom:2px;">'+
              '📅 '+_fmtData(di)+(di!==df?' → '+_fmtData(df):'')+
            '</div>'+
            '<div style="font-size:.7rem;color:'+T3+';">'+
              nRegs+' registro'+(nRegs!==1?'s':'')+' · '+nFuncs+' funcionário'+(nFuncs!==1?'s':'')+
            '</div>'+
            '<div style="font-size:.65rem;color:'+T3+';margin-top:2px;">Importado em '+dtImp+'</div>'+
          '</div>'+
          '<button onclick="HR_FUNC._apagarLote(\''+l.loteId+'\')" '+
            'style="padding:7px 12px;border-radius:8px;background:rgba(200,92,92,.12);'+
            'border:1px solid rgba(200,92,92,.3);color:'+RED+';font-family:Outfit,sans-serif;'+
            'font-size:.75rem;font-weight:600;cursor:pointer;white-space:nowrap;flex-shrink:0;">'+
            '🗑 Apagar lote'+
          '</button>'+
        '</div>'+
      '</div>';
    }).join('');
  }

  function _apagarLote(loteId){
    var regs=getRegistros();
    var count=Object.values(regs).filter(function(r){return r.loteId===loteId;}).length;
    if(!confirm('Apagar este lote?\n\n'+count+' registro(s) serão removidos permanentemente.\nEsta ação não pode ser desfeita.'))return;
    Object.keys(regs).forEach(function(k){if(regs[k].loteId===loteId)delete regs[k];});
    saveRegistros(regs);
    // Atualiza a lista de lotes na tela
    var funcId=(document.getElementById('hist_func')||{}).value||'';
    var elLotes=document.getElementById('hist_lotes');
    if(elLotes)elLotes.innerHTML=_renderListaLotes(funcId||null);
    renderPaginaFuncionarios();
    _toast('🗑 Lote apagado — '+count+' registro(s) removido(s).');
  }

  function _apagarTodosRegistros(){
    var regs=getRegistros();
    var total=Object.keys(regs).length;
    if(total===0){_toast('Nenhum registro para apagar.');return;}
    if(!confirm('⚠️ ATENÇÃO\n\nIsso apagará TODOS os '+total+' registros de ponto de todos os funcionários.\n\nUse para reimportar do zero com o relatório correto.\n\nEsta ação NÃO pode ser desfeita.\n\nConfirmar?'))return;
    saveRegistros({});
    // Fecha o histórico e recarrega a tela principal
    _closeHistorico();
    renderPaginaFuncionarios();
    _toast('🗑 Todos os '+total+' registros foram apagados. Reimporte o relatório.');
  }

  function _renderListaRegs(meusRegs,funcs,soUm){
    if(meusRegs.length===0)return'<div style="text-align:center;color:'+T3+';padding:32px 0;font-size:.82rem;">Nenhum registro encontrado</div>';
    return meusRegs.slice(0,60).map(function(r){
      var fx=funcs[r.funcionarioId]||{nome:'?'};
      return'<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:12px;margin-bottom:8px;cursor:pointer;" onclick="HR_FUNC.abrirFormRegistro(\''+r.funcionarioId+'\',\''+r.id+'\');HR_FUNC._closeHistorico();">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;">'+
          '<div style="font-size:.82rem;font-weight:700;color:'+T1+';">'+_fmtData(r.data)+' · '+_diaSemana(r.data)+'</div>'+
          '<div style="font-size:.78rem;color:'+GOLD+';">'+parseFloat(r.horas||0).toFixed(1)+'h'+(parseFloat(r.extra||0)>0?' <span style="color:'+(r.destinoExtra==='banco'?'#8ec8f0':GREEN)+';">'+(r.destinoExtra==='banco'?'🏦 ':'+')+(parseFloat(r.extra)).toFixed(1)+'h'+(r.destinoExtra==='banco'?' banco':'')+'</span>':'')+'</div>'+
        '</div>'+
        (!soUm?'<div style="font-size:.72rem;color:'+T3+';margin-top:2px;">'+_esc(fx.nome)+'</div>':'')+
        (r.producao?'<div style="font-size:.72rem;color:'+T2+';margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_esc(r.producao)+'</div>':'')+
      '</div>';
    }).join('');
  }

  function _closeHistorico(){ _closeOverlay('hrHistorico'); }

  function _filtrarHistorico(funcId){
    var regs=getRegistros(); var funcs=getFuncionarios();
    var meusRegs=Object.values(regs).filter(function(r){return!funcId||r.funcionarioId===funcId;}).sort(function(a,b){return b.data.localeCompare(a.data);});
    var el=document.getElementById('hist_lista'); if(!el)return;
    el.innerHTML=_renderListaRegs(meusRegs,funcs,!!funcId);
  }

  // ─────────────────────────────────────────────────────────────
  // 15. EXTRATO DE PAGAMENTOS
  // ─────────────────────────────────────────────────────────────
  function abrirExtratoPagamentos(funcId){
    var funcs=getFuncionarios();
    var f=funcs[funcId]||{nome:'?'};
    var pags=getPagamentos();
    var meusPags=Object.values(pags).filter(function(p){return p.funcionarioId===funcId;}).sort(function(a,b){return b.data.localeCompare(a.data);});
    var total=meusPags.reduce(function(s,p){return s+(parseFloat(p.valor)||0);},0);
    var iconForma={dinheiro:'💵',pix:'📱',ted:'🏦',cheque:'📋',outro:'💳'};

    var html='<div style="width:100%;max-width:500px;padding:0 16px;">'+
      _overlayHeader('Extrato de Pagamentos','📊 '+_esc(f.nome.split(' ')[0]),'HR_FUNC._closeExtrato()')+
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:12px;margin-bottom:14px;text-align:center;">'+
        '<div style="font-size:.62rem;color:'+T3+';text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Total pago</div>'+
        '<div style="font-size:1.4rem;font-weight:800;color:'+GREEN+';">'+_fmtMoeda(total)+'</div>'+
        '<div style="font-size:.7rem;color:'+T3+';margin-top:2px;">'+meusPags.length+' pagamento'+(meusPags.length!==1?'s':'')+'</div>'+
      '</div>'+
      (meusPags.length===0?
        '<div style="text-align:center;color:'+T3+';padding:32px 0;font-size:.82rem;">Nenhum pagamento registrado</div>':
        meusPags.map(function(p){
          return'<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:12px;margin-bottom:8px;">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">'+
              '<div style="flex:1;min-width:0;">'+
                '<div style="font-size:.82rem;font-weight:700;color:'+T1+';">'+(iconForma[p.forma]||'💳')+' '+_fmtData(p.data)+'</div>'+
                (p.obs?'<div style="font-size:.72rem;color:'+T3+';margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_esc(p.obs)+'</div>':'')+
              '</div>'+
              '<div style="font-size:.9rem;font-weight:700;color:'+GREEN+';white-space:nowrap;">'+_fmtMoeda(p.valor)+'</div>'+
            '</div>'+
          '</div>';
        }).join(''))+
      '<button onclick="HR_FUNC._closeExtrato()" style="'+CSS_BTN_GHOST+'margin-top:4px;">Fechar</button>'+
    '</div>';

    _overlay('hrExtrato',html);
  }

  function _closeExtrato(){ _closeOverlay('hrExtrato'); }

  // ─────────────────────────────────────────────────────────────
  // ITEM 6 — DASHBOARD DE RISCO
  // Indicadores operacionais: quem tem mais atraso, mais HE100,
  // mais banco, mais inconsistências, jornadas suspeitas recorrentes.
  // ─────────────────────────────────────────────────────────────
  function abrirDashboardRisco(){
    var funcs=getFuncionarios();
    var regs=getRegistros();
    var ativos=Object.values(funcs).filter(function(f){return f.ativo!==false;});
    var allRegs=Object.values(regs);

    // Agrega indicadores por funcionário
    var indicadores=ativos.map(function(f){
      var meusRegs=allRegs.filter(function(r){return r.funcionarioId===f.id;});

      // Atraso total (minutos)
      var totalAtrasoMin=0;
      meusRegs.forEach(function(r){
        var ent=r.entrada,sai=r.saida;
        if(ent&&sai&&typeof HR_IMPORT!=='undefined'&&HR_IMPORT._calcDia){
          var ep=ent.split(':').map(Number),sp=sai.split(':').map(Number);
          var eM=ep[0]*60+(ep[1]||0),sM=sp[0]*60+(sp[1]||0);
          if(sM>eM){
            // CORREÇÃO: passa o intervalo real do registro (r.intervaloMin) em vez de 0 fixo
            var almocoMin=r.intervaloMin||0;
            var res=HR_IMPORT._calcDia(eM,sM,r.data,almocoMin,f.id);
            totalAtrasoMin+=res.atraso||0;
          }
        }
      });

      // HE100 total (minutos)
      var totalHE100Min=meusRegs.reduce(function(s,r){
        return s+(r.tipoExtra==='domingo'||r.tipoExtra==='feriado'?Math.round((parseFloat(r.extra)||0)*60):0);
      },0);

      // Banco de horas (saldo)
      var saldoBanco=calcSaldoBancoHoras(f.id,null,null);

      // Inconsistências (gaps + badges de auditoria)
      var alertas=analisarGaps(f.id).length;
      var jornadas_suspeitas=0;
      meusRegs.forEach(function(r){
        if(typeof HR_IMPORT!=='undefined'&&HR_IMPORT._auditoriaBadges){
          var entMin=r.entrada?(r.entrada.split(':').map(Number)):[];
          var saiMin=r.saida?(r.saida.split(':').map(Number)):[];
          if(entMin.length===2&&saiMin.length===2){
            var eM=entMin[0]*60+entMin[1],sM=saiMin[0]*60+saiMin[1];
            if(sM>eM){
              // CORREÇÃO: passa intervalo real — era sempre 0, causando TRABALHO DIRETO em todos os dias
              var almocoMin2=r.intervaloMin||0;
              var res2=HR_IMPORT._calcDia(eM,sM,r.data,almocoMin2,f.id);
              var lc={r:r,valido:true,res:Object.assign({},res2,{incompleto:false,bruto:res2.bruto||sM-eM,almoco:almocoMin2})};
              var badges=HR_IMPORT._auditoriaBadges(lc);
              if(badges.some(function(b){return b.label.indexOf('JORNADA SUSPEITA')>=0;}))jornadas_suspeitas++;
            }
          }
        }
      });

      var saldo=calcSaldoFuncionario(f.id,null,null);

      return{
        f:f,
        totalAtrasoMin:totalAtrasoMin,
        totalHE100Min:totalHE100Min,
        saldoBancoMin:saldoBanco.saldoMin,
        alertas:alertas,
        jornadasSuspeitas:jornadas_suspeitas,
        saldo:saldo
      };
    });

    // Rankings (top 5 por categoria)
    function _top(arr,key,asc){
      return arr.slice().sort(function(a,b){return asc?(a[key]-b[key]):(b[key]-a[key]);}).slice(0,5);
    }

    var topAtraso=_top(indicadores,'totalAtrasoMin');
    var topHE100=_top(indicadores,'totalHE100Min');
    var topBanco=_top(indicadores,'saldoBancoMin');
    var topInconsistencias=_top(indicadores,'alertas');
    var topSuspeitas=_top(indicadores,'jornadasSuspeitas').filter(function(i){return i.jornadasSuspeitas>0;});

    function _rankCard(titulo,cor,lista,key,fmt,emoji){
      if(lista.every(function(i){return i[key]<=0;}))return'';
      return'<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:12px;">'+
        '<div style="font-size:.6rem;color:'+cor+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:10px;">'+emoji+' '+titulo+'</div>'+
        lista.filter(function(i){return i[key]>0;}).map(function(i,idx){
          var pct=lista[0][key]>0?Math.round(i[key]/lista[0][key]*100):0;
          return'<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">'+
            '<div style="font-size:.68rem;color:'+T3+';width:16px;text-align:right;">'+(idx+1)+'</div>'+
            '<div style="flex:1;min-width:0;">'+
              '<div style="font-size:.75rem;font-weight:700;color:'+T1+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+_esc(i.f.nome.split(' ').slice(0,2).join(' '))+'</div>'+
              '<div style="height:4px;background:rgba(255,255,255,.05);border-radius:2px;margin-top:3px;">'+
                '<div style="height:4px;background:'+cor+';border-radius:2px;width:'+pct+'%;opacity:.8;"></div>'+
              '</div>'+
            '</div>'+
            '<div style="font-size:.72rem;font-weight:700;color:'+cor+';white-space:nowrap;">'+fmt(i[key])+'</div>'+
          '</div>';
        }).join('')+
      '</div>';
    }

    function _fmtMin(m){
      var h=Math.floor(m/60),mn=Math.round(m%60);
      return h+'h'+(mn>0?mn+'m':'');
    }

    var html='<div style="width:100%;max-width:560px;padding:0 16px;">'+
      _overlayHeader('Dashboard de Risco','⚠️ Indicadores Operacionais','window._hrFecharRisco()')+

      // KPI resumo
      '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:14px;">'+
        _statKpi('⏰','Atrasados',indicadores.filter(function(i){return i.totalAtrasoMin>0;}).length,'func.')+
        _statKpi('⚡','Com HE100',indicadores.filter(function(i){return i.totalHE100Min>0;}).length,'func.')+
        _statKpi('🏦','Banco ativo',indicadores.filter(function(i){return i.saldoBancoMin>0;}).length,'func.')+
      '</div>'+

      _rankCard('Mais Atrasos Acumulados',RED,topAtraso,'totalAtrasoMin',_fmtMin,'⏰')+
      _rankCard('Mais HE100 (Dom/Feriado)',BLUE,topHE100,'totalHE100Min',_fmtMin,'⚡')+
      _rankCard('Maior Saldo Banco de Horas',GOLD,topBanco,'saldoBancoMin',_fmtMin,'🏦')+
      _rankCard('Mais Inconsistências (Gaps)',RED,topInconsistencias,'alertas',function(v){return v+' alerta'+(v!==1?'s':'');},  '⚠️')+
      (topSuspeitas.length>0?_rankCard('Jornadas Suspeitas Recorrentes',RED,topSuspeitas,'jornadasSuspeitas',function(v){return v+'×';}, '🚨'):'<div style="text-align:center;color:'+T3+';font-size:.78rem;padding:12px;">✅ Nenhuma jornada suspeita recorrente</div>')+

      '<button onclick="window._hrFecharRisco()" style="'+CSS_BTN_GHOST+'margin-top:8px;">Fechar</button>'+
    '</div>';

    _overlay('hrRisco',html);
  }
  window._hrFecharRisco=function(){_closeOverlay('hrRisco');};

  return{
    renderPaginaFuncionarios: renderPaginaFuncionarios,
    abrirFormFuncionario:     abrirFormFuncionario,
    abrirDetalhesFuncionario: abrirDetalhesFuncionario,
    abrirRegistroRapido:      abrirRegistroRapido,
    abrirFolhaPagamento:      abrirFolhaPagamento,
    abrirFormRegistro:        abrirFormRegistro,
    abrirDetalhesRegistro:    abrirDetalhesRegistro,
    abrirHistorico:           abrirHistorico,
    abrirFormPagamento:       abrirFormPagamento,
    abrirExtratoPagamentos:   abrirExtratoPagamentos,
    _toggleBusca:             _toggleBusca,
    _mostrarSemPonto:         _mostrarSemPonto,
    _closeForm:               _closeForm,
    _previewFoto:             _previewFoto,
    _salvarFuncionario:       _salvarFuncionario,
    _excluirFuncionario:      _excluirFuncionario,
    _closeDetalhes:           _closeDetalhes,
    _whatsappFunc:            _whatsappFunc,
    _closeRegistro:           _closeRegistro,
    _salvarRegistro:          _salvarRegistro,
    _excluirRegistro:         _excluirRegistro,
    _registrarEntrada:        _registrarEntrada,
    _registrarSaida:          _registrarSaida,
    _closeFolha:              _closeFolha,
    _closePagamento:          _closePagamento,
    _salvarPagamento:         _salvarPagamento,
    _closeHistorico:          _closeHistorico,
    _filtrarHistorico:        _filtrarHistorico,
    _histTab:                 _histTab,
    _apagarLote:              _apagarLote,
    _apagarTodosRegistros:    _apagarTodosRegistros,
    _closeExtrato:            _closeExtrato,
    // Item 4 — Banco de horas
    calcSaldoBancoHoras:      calcSaldoBancoHoras,
    // Item 6 — Dashboard de risco
    abrirDashboardRisco:      abrirDashboardRisco,
    // Sistema de penalidades
    getOcorrenciasFuncionario: getOcorrenciasFuncionario,
    _verificarRegistrosIncompletos: _verificarRegistrosIncompletos
  };
})();
