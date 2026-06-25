// ══════════════════════════════════════════════════════════════
// APP-FUNCIONARIOS v4.1 — HR Mármores e Granitos
// Design Premium + Novas Funcionalidades:
//   • Dashboard com gráfico de produtividade mensal
//   • Aniversariantes e datas comemorativas
//   • Registro rápido de ponto (1 toque)
//   • Perfil expandido com foto por câmera/galeria
//   • Folha de pagamento consolidada
//   • Busca rápida de funcionários
//   • Calendário de ponto visual
//   • Aviso de férias / vencimento de contrato
// ── v4.1 ──────────────────────────────────────────────────────
//   • _pagarDecendioRapido implementado (atalho pré-preenchido)
//   • _TIPOS_PAG: bonificacao_he3x e he_duplicada_2x adicionados
//   • Folha: saldo total usa soma de s.saldo individuais (mais preciso)
// ══════════════════════════════════════════════════════════════

var HR_FUNC = (function () {

  // ─────────────────────────────────────────────────────────────
  // 1. PERSISTÊNCIA
  // ─────────────────────────────────────────────────────────────
  var KEYS = { func:'hr_funcionarios', reg:'hr_registros', pag:'hr_pagamentos', ocor:'hr_ocorrencias', exc:'hr_excecoes', adv:'hr_advertencias', acr:'hr_he_acrescimos' };

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
  function getExcecoes()  { return _load(KEYS.exc);  }
  function saveExcecoes(d){ _save(KEYS.exc,d); }
  function getAdvertencias()  { return _load(KEYS.adv); }
  function saveAdvertencias(d){ _save(KEYS.adv,d); }
  function getAcrescimos()    { return _load(KEYS.acr); }
  function saveAcrescimos(d)  { _save(KEYS.acr,d); }
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

  // ─────────────────────────────────────────────────────────────
  // HELPERS DE DECENDIO
  // ─────────────────────────────────────────────────────────────
  function _proximoDecendio(){
    var hoje = new Date();
    var d    = hoje.getDate();
    var ano  = hoje.getFullYear();
    var mes  = hoje.getMonth();
    var alvo, label;
    if (d < 10)      { alvo = new Date(ano, mes,   10); label = '1º decendio'; }
    else if (d < 20) { alvo = new Date(ano, mes,   20); label = '2º decendio'; }
    else             { alvo = new Date(ano, mes+1,   0); label = '3º decendio'; }
    var diff = Math.round((alvo - hoje) / (1000*60*60*24));
    return { label: label, diasRestantes: diff };
  }
  // Retorna o valor fixo do decendio atual (1º/2º/3º) para um funcionário.
  // Se não configurado, retorna salario÷3 como fallback.
  // Retorna o valor fixo do decendio atual (1º/2º/3º) para um funcionário,
  // já somando os acréscimos HE pendentes (2× e 3×).
  // Se não configurado, retorna salario÷3 como fallback.
  function _decendioBase(f){
    var d = new Date().getDate();
    var num = d <= 10 ? 1 : d <= 20 ? 2 : 3;
    return _decendioValorNum(f, num);
  }
  // Retorna o valor fixo do decêndio num (1/2/3) para um funcionário.
  function _decendioValorNum(f, num){
    var dec;
    if      (num === 1) dec = parseFloat(f.dec1) || 0;
    else if (num === 2) dec = parseFloat(f.dec2) || 0;
    else                dec = parseFloat(f.dec3) || 0;
    if (!dec) dec = (parseFloat(f.salario) || 0) / 3;
    return dec;
  }
  function _valorDecendioAtual(f){
    var dec = _decendioBase(f);

    // Soma acréscimos HE pendentes deste funcionário
    var acrsMap = getAcrescimos();
    var pendentes = Object.values(acrsMap).filter(function(a){
      return a.funcionarioId === f.id && a.status === 'pendente';
    }).reduce(function(s,a){ return s + (parseFloat(a.valor)||0); }, 0);

    return dec + pendentes;
  }
  function _labelDecendio(){
    var nd = _proximoDecendio();
    if (nd.diasRestantes === 0) return { txt:'📆 '+nd.label+' HOJE',    urgente:true };
    if (nd.diasRestantes === 1) return { txt:'📆 '+nd.label+' amanhã',  urgente:true };
    return                             { txt:'📆 '+nd.label+' em '+nd.diasRestantes+'d', urgente:false };
  }
  // Retorna {di, df, label} do decêndio em que "hoje" se encontra.
  // 1º dec: dias 1–10 | 2º dec: dias 11–20 | 3º dec: dias 21–fim do mês
  function _periodoDecendioAtual(){
    var hoje = new Date();
    var d = hoje.getDate();
    var num = d <= 10 ? 1 : d <= 20 ? 2 : 3;
    return _periodoDecendio(num);
  }
  // Retorna {di, df, label, num} para o decêndio num (1, 2 ou 3) do mês atual.
  function _periodoDecendio(num){
    var hoje = new Date();
    var ano = hoje.getFullYear(), mes = hoje.getMonth();
    var pad = function(n){ return String(n).padStart(2,'0'); };
    var mesStr = ano+'-'+pad(mes+1);
    var ultimoDia = new Date(ano, mes+1, 0).getDate();
    if (num === 1) return { num:1, di: mesStr+'-01', df: mesStr+'-10', label: '1º decêndio' };
    if (num === 2) return { num:2, di: mesStr+'-11', df: mesStr+'-20', label: '2º decêndio' };
                   return { num:3, di: mesStr+'-21', df: mesStr+'-'+pad(ultimoDia), label: '3º decêndio' };
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
    return 2.0; // HE dobrada — mínimo da empresa (todo minuto além da jornada = 2×)
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

    // ── Cálculo de salário: usa decêndios fixos se configurados ────────────
    // Regra: soma os valores fixos dos decêndios cujo vencimento já passou
    // dentro do período di–df. Se não houver dec1/dec2/dec3 configurados,
    // cai no proporcional (comportamento anterior).
    var totalSalario = 0;
    var temDec = (parseFloat(f.dec1)||0) > 0 || (parseFloat(f.dec2)||0) > 0 || (parseFloat(f.dec3)||0) > 0;

    if (temDec && di && df) {
      // Identifica quais decêndios vencem dentro do período di–df
      var ano  = parseInt(di.slice(0,4));
      var mesN = parseInt(di.slice(5,7));
      // último dia do mês do período
      var ultimoDia = new Date(ano, mesN, 0).getDate();
      var d10  = di.slice(0,8) + '10';
      var d20  = di.slice(0,8) + '20';
      var dFim = di.slice(0,8) + String(ultimoDia).padStart(2,'0');

      if (d10 >= di && d10 <= df)  totalSalario += parseFloat(f.dec1) || 0;
      if (d20 >= di && d20 <= df)  totalSalario += parseFloat(f.dec2) || 0;
      if (dFim >= di && dFim <= df) totalSalario += parseFloat(f.dec3) || 0;

      // Se nenhum decêndio venceu ainda no período (mês em curso, antes do dia 10),
      // usa zero — o saldo será zerado e o pagamento ainda não é devido.
    } else if (di && df) {
      // Proporcional (comportamento anterior — sem dec configurado)
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
        valorTotalExtras: totalExtraFb * valorHoraFb * mult, // mult = _getMultNormal() = 2.0 (dobrada)
        totalExtra50Min:  0, totalExtra100Min: 0, totalExtra200Min: 0,
        valorExtra50:     0, valorExtra100:    0, valorExtra200:    0,
        totalExtraHoras:  totalExtraFb
      };
    }

    var valorExtra  = heResult.valorTotalExtras;

    // ── Acréscimos HE pendentes (2× e 3×) ───────────────────────────────
    // Ficam em hr_he_acrescimos com status='pendente' até o decêndio ser pago.
    var acrsMap = getAcrescimos();
    var totalAcrescimos = Object.values(acrsMap).filter(function(a){
      if (a.funcionarioId !== funcId) return false;
      if (a.status !== 'pendente') return false;
      // Filtra pelo período de referência do acréscimo (a.periodo = "yyyy-mm"),
      // não pela data de criação. Isso evita que acréscimos de meses anteriores
      // apareçam no mês atual e que acréscimos do mês correto sejam excluídos
      // por terem sido confirmados fora do intervalo di–df.
      if (a.periodo) {
        var periodoAcr = a.periodo; // "yyyy-mm"
        if (di && periodoAcr < di.slice(0, 7)) return false;
        if (df && periodoAcr > df.slice(0, 7)) return false;
      } else {
        // fallback para acréscimos sem campo periodo (legado)
        if (di && a.data < di) return false;
        if (df && a.data > df) return false;
      }
      return true;
    }).reduce(function(s,a){ return s + (parseFloat(a.valor)||0); }, 0);

    var totalDevido = totalSalario + valorExtra + totalAcrescimos;

    // ── Pagamentos realizados ────────────────────────────────────────────
    var meusPags = Object.values(pags).filter(function(p){
      if (p.funcionarioId !== funcId) return false;
      if (di && p.data < di) return false;
      if (df && p.data > df) return false;
      return true;
    });
    var totalPago = meusPags.reduce(function(s, p){ return s + (parseFloat(p.valor) || 0); }, 0);
    var saldo     = totalDevido - totalPago;

    // valorHoraExtra de referência (dobrada ×2 — mantido para exibição na UI)
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

    // ── Guarda o contexto ANTES de modificar ──────────────────────────────
    // Salva o que existia para o gerente ver o que o sistema encontrou
    reg.entradaOriginal = reg.entrada || null; // null = não existia
    reg.saidaOriginal   = reg.saida   || null;

    // Monta texto explicativo do contexto de batidas disponíveis
    // Ex: "Havia saída almoço 12:14, volta almoço 14:14 e saída 17:00 — faltou a entrada"
    var contexto = '';
    if (faltaEntrada && faltaSaida) {
      contexto = 'Nenhuma batida registrada no sistema para este dia.';
    } else if (faltaEntrada) {
      // Tem saída — pode ter almoço também (campos saidaAlmoco / voltaAlmoco)
      var partes = [];
      if (reg.saidaAlmoco)  partes.push('saída almoço ' + reg.saidaAlmoco);
      if (reg.voltaAlmoco)  partes.push('volta almoço ' + reg.voltaAlmoco);
      partes.push('saída ' + reg.saida);
      contexto = 'Havia ' + partes.join(', ') + ' — faltou o registro de entrada.';
    } else {
      // Tem entrada — falta saída
      var partes2 = ['entrada ' + reg.entrada];
      if (reg.saidaAlmoco)  partes2.push('saída almoço ' + reg.saidaAlmoco);
      if (reg.voltaAlmoco)  partes2.push('volta almoço ' + reg.voltaAlmoco);
      contexto = 'Havia ' + partes2.join(', ') + ' — faltou o registro de saída.';
    }

    // Aplica horário padrão
    if (faltaEntrada) reg.entrada = hrEnt;
    if (faltaSaida)   reg.saida   = hrSai;

    // Recalcula horas a partir dos horários completos
    var ep = reg.entrada.split(':').map(Number);
    var sp = reg.saida.split(':').map(Number);
    var diff = (sp[0]*60+sp[1]) - (ep[0]*60+ep[1]);
    if (diff < 0) diff += 1440;

    // Descontar almoço se havia batidas intermediárias (saidaAlmoco + voltaAlmoco)
    // Sem batidas intermediárias = trabalho direto (Regra 2 do guia: não descontar)
    var almocoReal = 0;
    if (reg.saidaAlmoco && reg.voltaAlmoco) {
      var sa = reg.saidaAlmoco.split(':').map(Number);
      var va = reg.voltaAlmoco.split(':').map(Number);
      almocoReal = (va[0]*60+va[1]) - (sa[0]*60+sa[1]);
      if (almocoReal < 0) almocoReal = 0;
    }
    var trabMin = diff - almocoReal;
    reg.horas = parseFloat(Math.max(0, trabMin / 60).toFixed(2));

    // Calcula penalidade progressiva
    var nConsec = _contarOcorrenciasConsecutivas(funcId, reg.data);
    var penMin  = (nConsec + 1) * 10;           // 10, 20, 30...

    // Aplica desconto nas horas
    reg.horas         = Math.max(0, parseFloat((reg.horas - penMin / 60).toFixed(2)));
    reg.penalidade    = penMin;
    reg.autoCompletado = true;
    reg.tipoFalha     = faltaEntrada ? 'sem_entrada' : (faltaSaida ? 'sem_saida' : 'ambos');
    reg.penMotivo     = contexto; // explicação textual para exibição
    reg.penHoraInferida = faltaEntrada ? hrEnt : hrSai; // horário que foi assumido
    reg.penOcorrencia = nConsec + 1; // número da ocorrência consecutiva
    reg.atualizadoEm  = new Date().toISOString();

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
      horaOriginal: faltaEntrada ? reg.entradaOriginal : reg.saidaOriginal,
      contexto: contexto,
      penalidade: penMin,
      ocorrenciaNumero: nConsec + 1,
      criadoEm: new Date().toISOString()
    };
    saveOcorrencias(ocors);

    return { penMin: penMin, numero: nConsec + 1, data: reg.data, tipoFalha: reg.tipoFalha, contexto: contexto };
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

    var TIPO_ICONE  = { sem_entrada:'🚪⬇️', sem_saida:'🚪⬆️', ambos:'🚪❌' };
    var TIPO_TEXTO  = { sem_entrada:'entrada não registrada', sem_saida:'saída não registrada', ambos:'entrada e saída não registradas' };

    var itens = ocors.slice(0,5).map(function(o){
      var icone = TIPO_ICONE[o.tipoFalha] || '⚠️';
      var txtFalha = TIPO_TEXTO[o.tipoFalha] || o.tipoFalha;
      var horInferido = o.horaAutoCompletada || '—';

      return '<div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);">' +
        // Linha 1: data + tipo falha + penalidade
        '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;">' +
          '<div style="flex:1;min-width:0;">' +
            '<span style="font-size:.78rem;font-weight:700;color:'+T1+';">'+_fmtData(o.data)+'</span>' +
            '<span style="font-size:.62rem;color:'+T3+';margin-left:6px;">'+icone+' '+_esc(txtFalha)+'</span>' +
            '<span style="font-size:.6rem;color:'+T3+';margin-left:5px;">(ocorrência #'+o.ocorrenciaNumero+')</span>'+
          '</div>' +
          '<span style="font-size:.78rem;font-weight:800;color:'+RED+';white-space:nowrap;flex-shrink:0;">−'+o.penalidade+' min</span>' +
        '</div>' +
        // Linha 2: horário assumido
        '<div style="margin-top:4px;background:rgba(200,92,92,.07);border-radius:7px;padding:6px 9px;">' +
          '<div style="font-size:.68rem;color:'+RED+';font-weight:700;margin-bottom:2px;">⏰ Horário assumido: '+_esc(horInferido)+'</div>' +
          (o.contexto
            ? '<div style="font-size:.65rem;color:'+T3+';line-height:1.5;">'+_esc(o.contexto)+'</div>'
            : ''
          ) +
          '<div style="font-size:.63rem;color:rgba(200,92,92,.7);margin-top:3px;">'+
            'Penalidade de −'+o.penalidade+' min aplicada automaticamente por ausência de registro. '+
            'Para corrigir, abra o registro e ajuste manualmente o horário real.'+
          '</div>'+
        '</div>' +
      '</div>';
    }).join('');

    var mais = ocors.length > 5
      ? '<div style="font-size:.65rem;color:'+T3+';text-align:center;padding:8px 0;">+' + (ocors.length-5) + ' ocorrência(s) anteriores</div>'
      : '';

    return '<div style="background:rgba(200,92,92,.06);border:1px solid rgba(200,92,92,.22);'+
      'border-radius:12px;padding:12px 14px;margin-bottom:12px;">' +
      '<div style="font-size:.68rem;font-weight:700;color:'+RED+';margin-bottom:4px;display:flex;justify-content:space-between;">' +
        '<span>⚠️ OCORRÊNCIAS DE PONTO</span>' +
        '<span>Total descontado: −'+totalMin+' min</span>' +
      '</div>' +
      '<div style="font-size:.63rem;color:rgba(200,92,92,.65);margin-bottom:10px;">'+
        'Dias com ponto incompleto detectados automaticamente. '+
        'Horário padrão assumido + penalidade de 10 min por ocorrência (+10 a cada reincidência consecutiva).'+
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

    // Chip decendio
    var decInfo = _labelDecendio();
    alertChips += '<div style="background:'+(decInfo.urgente?'rgba(201,168,76,.1)':'rgba(201,168,76,.04)')+
      ';border:1px solid rgba(201,168,76,'+(decInfo.urgente?'.45':'.18')+');border-radius:8px;'+
      'padding:8px 12px;margin-bottom:8px;display:flex;align-items:center;gap:10px;cursor:pointer;" '+
      'onclick="HR_FUNC.abrirFolhaPagamento()">'+
      '<span style="font-size:.9rem;">📆</span>'+
      '<div style="flex:1;">'+
        '<div style="font-size:.75rem;font-weight:700;color:'+GOLD+';">'+decInfo.txt+'</div>'+
        '<div style="font-size:.63rem;color:'+T3+';">Toque para ver a folha</div>'+
      '</div>'+
      '<span style="font-size:.75rem;color:'+T3+';">→</span>'+
    '</div>';

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
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px;">' +
          '<button onclick="HR_FUNC.abrirHorasExtrasDuplicadas(null)" '+
            'style="padding:11px;background:rgba(92,150,220,.07);border:1.5px solid rgba(92,150,220,.3);'+
            'border-radius:11px;color:'+BLUE+';font-family:Outfit,sans-serif;font-size:.78rem;'+
            'font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">' +
            '<span>⚡⚡</span><span>H. Duplas (2×)</span></button>' +
          '<button onclick="HR_FUNC.abrirBonificacaoHE3x(null)" '+
            'style="padding:11px;background:rgba(92,184,92,.07);border:1.5px solid rgba(92,184,92,.3);'+
            'border-radius:11px;color:'+GREEN+';font-family:Outfit,sans-serif;font-size:.78rem;'+
            'font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">' +
            '<span>🏆</span><span>Bonificação (3×)</span></button>' +
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
        '<button onclick="HR_FUNC.abrirGestaoExcecoes()" '+
          'style="width:100%;margin-top:8px;padding:12px 16px;background:rgba(92,150,220,.06);'+
          'border:1.5px solid rgba(92,150,220,.28);border-radius:11px;color:'+BLUE+';'+
          'font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;'+
          'display:flex;align-items:center;justify-content:center;gap:9px;">'+
          '<span>📅</span><span>Feriados, Folgas e Dias Declarados</span>'+
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
    var temPonto = pontoHoje && pontoHoje.some(function(p){ return p.id === f.id; });
    var alertas  = analisarGaps(f.id);
    // Saldo do mês atual — do dia 1 até hoje (captura decêndios vencidos não pagos)
    var _mr  = _mesAno(0);
    var _di  = _mr + '-01';
    var _df  = _hoje();
    var saldo    = calcSaldoFuncionario(f.id, _di, _df);
    var pags     = getPagamentos();

    // Último pagamento deste funcionário
    var ultPags = Object.values(pags)
      .filter(function(p){ return p.funcionarioId === f.id; })
      .sort(function(a,b){ return b.data.localeCompare(a.data); });
    var ultPag   = ultPags[0];
    var diasSemPag = ultPag
      ? Math.round((new Date() - new Date(ultPag.data + 'T12:00:00')) / (1000*60*60*24))
      : null;

    // Funcionário em férias: não exibe alerta de pagamento
    var emFerias = f.feriasInicio && f.feriasFim &&
      _hoje() >= f.feriasInicio && _hoje() <= f.feriasFim;

    var badges = '';
    if (temPonto) badges += '<span style="font-size:.6rem;background:#0d1f0d;border:1px solid rgba(92,184,92,.5);'+
      'color:'+GREEN+';border-radius:4px;padding:2px 7px;margin-right:4px;">✓ ponto</span>';
    if (alertas.length > 0) badges += '<span style="font-size:.6rem;background:#1f1500;border:1px solid rgba(201,168,76,.4);'+
      'color:#c8a060;border-radius:4px;padding:2px 7px;margin-right:4px;">⚠ '+alertas.length+' alerta'+(alertas.length>1?'s':'')+'</span>';
    if (!emFerias && diasSemPag !== null && diasSemPag > 12) badges += '<span style="font-size:.6rem;background:rgba(200,92,92,.1);'+
      'border:1px solid rgba(200,92,92,.35);color:'+RED+';border-radius:4px;padding:2px 7px;margin-right:4px;">'+
      '⏳ '+diasSemPag+'d sem pagamento</span>';

    var saldoBadge = '';
    if (saldo.saldo > 0.5) saldoBadge = '<span style="font-size:.62rem;color:'+GOLD+';">💰 a receber '+_fmtMoeda(saldo.saldo)+'</span>';
    else if (saldo.temCredito) saldoBadge = '<span style="font-size:.62rem;color:'+GREEN+';">💳 crédito '+_fmtMoeda(Math.abs(saldo.saldo))+'</span>';

    var tempoStr = _tempoEmpresa(f.admissao);

    // Linha de último pagamento
    var ultPagLine = '';
    if (ultPag) {
      var t = _TIPOS_PAG[ultPag.tipo] || _TIPOS_PAG.outro;
      ultPagLine = '<div style="font-size:.62rem;color:'+T3+';margin-top:2px;">'+
        t.icon+' Último: '+_fmtMoeda(ultPag.valor)+' em '+_fmtData(ultPag.data)+
      '</div>';
    }

    return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:14px;'+
        'padding:14px 16px;margin-bottom:9px;cursor:pointer;transition:border-color .2s;" '+
        'onclick="HR_FUNC.abrirDetalhesFuncionario(\''+f.id+'\')">' +
      '<div style="display:flex;align-items:center;gap:13px;">' +
        _avatarCircle(f, 50) +
        '<div style="flex:1;min-width:0;">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">' +
            '<div style="font-weight:700;color:'+T1+';font-size:.97rem;">'+_esc(f.nome)+'</div>' +
            _statusPill(f.ativo) +
          '</div>' +
          '<div style="font-size:.73rem;color:'+T3+';margin-top:1px;">'+
            _esc(f.cargo||'—')+(f.equipe?' · '+_esc(f.equipe):'')+
            (tempoStr?' · <span style="color:'+GOLD+'80">'+tempoStr+'</span>':'') +
          '</div>' +
          (badges    ? '<div style="margin-top:5px;">'+badges+'</div>' : '')+
          (saldoBadge? '<div style="margin-top:3px;">'+saldoBadge+'</div>' : '')+
          ultPagLine+
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;">' +
          '<div style="font-size:.82rem;font-weight:700;color:'+GOLD+';">'+_fmtMoeda(f.salario)+'</div>' +
          '<div style="font-size:.58rem;color:'+T3+';margin-top:1px;">'+_fmtMoeda(_decendioBase(f))+'</div>' +
          '<div style="font-size:.55rem;color:'+T3+';">por decêndio</div>' +
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
    if (ativo === 'ferias')
      return '<span style="font-size:.6rem;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.4);color:#34d399;'+
        'border-radius:20px;padding:2px 8px;">🌴 Férias</span>';
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
        _campo('Status',_sel('ff_ativo',[
          {v:'true',  l:'✓ Ativo'},
          {v:'ferias',l:'🌴 Férias'},
          {v:'false', l:'✗ Inativo'}
        ],f.ativo===false?'false':(f.ativo==='ferias'?'ferias':'true')))+
        _grid2(
          _campo('Início das Férias',_inp('ff_ferias_ini','date','',f.feriasInicio||'')),
          _campo('Fim das Férias',   _inp('ff_ferias_fim','date','',f.feriasFim||''))
        )
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

      _secao('Decêndios (valores fixos a pagar)',
        '<div style="font-size:.68rem;color:'+T3+';margin-bottom:10px;line-height:1.5;">'+
          'Informe o valor fixo de cada parcela de 10 dias. '+
          'Só desconta se o funcionário tiver déficit de horas.'+
        '</div>'+
        _grid2(
          _campo('1º Decêndio — dia 10 (R$)',_inp('ff_dec1','number','0,00',f.dec1!=null?f.dec1:'','min="0" step="0.01"')),
          _campo('2º Decêndio — dia 20 (R$)',_inp('ff_dec2','number','0,00',f.dec2!=null?f.dec2:'','min="0" step="0.01"'))
        )+
        _campo('3º Decêndio — último dia (R$)',_inp('ff_dec3','number','0,00',f.dec3!=null?f.dec3:'','min="0" step="0.01"'))
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
      ativo:(function(){var v=(document.getElementById('ff_ativo')||{}).value;return v==='false'?false:(v==='ferias'?'ferias':true);}()),
      feriasInicio:(document.getElementById('ff_ferias_ini')||{}).value||'',
      feriasFim:   (document.getElementById('ff_ferias_fim')||{}).value||'',
      jornadaDiariaMin:(function(){var v=parseFloat((document.getElementById('ff_jornada')||{}).value);return(!isNaN(v)&&v>0)?Math.round(v*60):0;}()),
      dec1:(function(){var v=parseFloat((document.getElementById('ff_dec1')||{}).value);return(!isNaN(v)&&v>0)?v:0;}()),
      dec2:(function(){var v=parseFloat((document.getElementById('ff_dec2')||{}).value);return(!isNaN(v)&&v>0)?v:0;}()),
      dec3:(function(){var v=parseFloat((document.getElementById('ff_dec3')||{}).value);return(!isNaN(v)&&v>0)?v:0;}()),
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
    // Saldo do decêndio atual (1–10, 11–20, 21–fim)
    var _dpModal = _periodoDecendioAtual();
    var _diMes   = _dpModal.di;
    var _dfMes   = _dpModal.df;
    var saldo=calcSaldoFuncionario(id, _diMes, _dfMes);
    var alertas=analisarGaps(id);
    var temPontoHoje=meusRegs.some(function(r){return r.data===hoje;});

    var saldoColor=saldo.temCredito?GREEN:(saldo.saldo>0.01?GOLD:GREEN);
    var saldoLabel=saldo.temCredito?'💳 Crédito (overpago este mês)':(saldo.saldo>0.01?'💰 A Receber (mês atual)':'✓ Quitado (mês atual)');

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

      // ── Financeiro: conta-corrente visual ───────────────────────────────────
      (function(){
        var sal2    = saldo.totalSalario || 0;
        var he2     = saldo.valorExtra   || 0;
        var acr2    = (saldo.totalDevido - sal2 - he2) || 0;
        var pago2   = saldo.totalPago    || 0;
        var saldoV  = saldo.saldo;
        var saldoCo = saldo.temCredito ? GREEN : (saldoV > 0.01 ? GOLD : GREEN);
        var saldoLb = saldo.temCredito ? '💳 Crédito — desconta no próximo' : (saldoV > 0.01 ? '💰 A pagar neste decêndio' : '✅ Quitado');

        // Helper: linha da conta
        function lc(label, valor, cor, sub) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;'+
            'padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.04);">'+
            '<div>'+
              '<div style="font-size:.78rem;color:'+T2+';">'+label+'</div>'+
              (sub?'<div style="font-size:.6rem;color:'+T3+';margin-top:1px;">'+sub+'</div>':'')+
            '</div>'+
            '<div style="font-size:.85rem;font-weight:700;color:'+(cor||T1)+';white-space:nowrap;">'+
              _fmtMoeda(valor)+
            '</div>'+
          '</div>';
        }
        function lcSubt(label, valor) {
          return '<div style="display:flex;justify-content:space-between;align-items:center;'+
            'padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.04);">'+
            '<div style="font-size:.78rem;color:'+T2+';">'+label+'</div>'+
            '<div style="font-size:.85rem;font-weight:700;color:'+GREEN+';white-space:nowrap;">− '+_fmtMoeda(valor)+'</div>'+
          '</div>';
        }

        // Detalhe HE por faixa (só se houver HE100 ou HE200)
        var heDetalhe = '';
        if (saldo.valorExtra50  > 0) heDetalhe += '×2 dobrada: '+_fmtMoeda(saldo.valorExtra50);
        if (saldo.valorExtra100 > 0) heDetalhe += (heDetalhe?'  ·  ':'')+'×2 dobrada: '+_fmtMoeda(saldo.valorExtra100);
        if (saldo.valorExtra200 > 0) heDetalhe += (heDetalhe?'  ·  ':'')+'×3 triplicada: '+_fmtMoeda(saldo.valorExtra200);
        var heSub = heDetalhe || ('R$ '+(saldo.valorHoraBase||0).toFixed(2)+'/h base · ×2 = R$ '+((saldo.valorHoraBase||0)*2).toFixed(2)+'/h extra');

        // Banco de horas (linha separada, não financeiro)
        var bancoLinha = '';
        if (saldo.banco && saldo.banco.acumuladoMin > 0) {
          var bMin = saldo.banco.saldoMin;
          var bStr = (bMin >= 0 ? '+' : '') + Math.floor(Math.abs(bMin)/60) + 'h' +
                     (bMin % 60 !== 0 ? String(Math.abs(bMin%60)).padStart(2,'0')+'m' : '');
          bancoLinha = '<div style="display:flex;justify-content:space-between;align-items:center;'+
            'padding:8px 12px;border-bottom:1px solid rgba(255,255,255,.04);">'+
            '<div>'+
              '<div style="font-size:.78rem;color:#8ec8f0;">🏦 Banco de horas</div>'+
              '<div style="font-size:.6rem;color:'+T3+';margin-top:1px;">Extras guardadas para folga — não entram no pagamento</div>'+
            '</div>'+
            '<div style="font-size:.85rem;font-weight:700;color:#8ec8f0;">' + bStr + '</div>'+
          '</div>';
        }

        // Últimos pagamentos — lista compacta
        var pags2 = getPagamentos();
        var ultPags2 = Object.values(pags2)
          .filter(function(p){ return p.funcionarioId === id; })
          .sort(function(a,b){ return b.data.localeCompare(a.data); })
          .slice(0, 3);

        var listaUltPags = ultPags2.length === 0
          ? '<div style="padding:10px 12px;font-size:.72rem;color:'+T3+';text-align:center;">Nenhum pagamento registrado ainda</div>'
          : ultPags2.map(function(p){
              var t = _TIPOS_PAG[p.tipo] || _TIPOS_PAG.outro;
              var icoF = {dinheiro:'💵',pix:'📱',ted:'🏦',cheque:'📋',outro:'💳'}[p.forma]||'💳';
              return '<div style="display:flex;justify-content:space-between;align-items:center;'+
                'padding:7px 12px;border-bottom:1px solid rgba(255,255,255,.03);">'+
                '<div>'+
                  '<div style="font-size:.75rem;color:'+t.cor+';font-weight:600;">'+t.icon+' '+t.label+'</div>'+
                  '<div style="font-size:.63rem;color:'+T3+';margin-top:1px;">'+_fmtData(p.data)+' '+icoF+(p.obs?' · '+_esc(p.obs):'')+'</div>'+
                '</div>'+
                '<div style="font-size:.82rem;font-weight:700;color:'+t.cor+';white-space:nowrap;margin-left:10px;">'+_fmtMoeda(p.valor)+'</div>'+
              '</div>';
            }).join('');

        return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;overflow:hidden;margin-bottom:14px;">'+
          // Cabeçalho da seção
          '<div style="display:flex;justify-content:space-between;align-items:center;padding:11px 14px;'+
            'background:rgba(201,168,76,.05);border-bottom:1px solid '+BD+';">'+
            '<div style="font-size:.63rem;color:'+GOLD+';letter-spacing:.1em;text-transform:uppercase;font-weight:700;">💰 '+_dpModal.label+' — '+_dpModal.di.slice(8)+' a '+_dpModal.df.slice(8)+'/'+_dpModal.di.slice(5,7)+'</div>'+
            '<button onclick="HR_FUNC.abrirExtratoPagamentos(\''+id+'\')" '+
              'style="background:none;border:none;color:'+T3+';font-size:.68rem;cursor:pointer;padding:0;font-family:Outfit,sans-serif;">'+
              'ver extrato →</button>'+
          '</div>'+
          // Linhas da conta
          lc(_dpModal.label+' (fixo)', sal2, GOLD,
             'mensal: '+_fmtMoeda(parseFloat(f.salario)||0)+' · parcela: '+_fmtMoeda(_decendioBase(f))) +
          (he2 > 0   ? lc('H. extras ('+_dpModal.di.slice(8)+' a '+_dpModal.df.slice(8)+')', he2, '#e0b870', heSub) : '') +
          (acr2 > 0.01? lc('Acréscimo HE 2× / 3×', acr2, '#8ec8c8', 'diferença sobre a hora normal') : '') +
          bancoLinha +
          (pago2 > 0 ? lcSubt('Já pago neste período', pago2) : '') +
          // Total
          '<div style="display:flex;justify-content:space-between;align-items:center;'+
            'padding:12px 14px;background:rgba(0,0,0,.25);">'+
            '<div>'+
              '<div style="font-size:.72rem;font-weight:700;color:'+saldoCo+';">'+saldoLb+'</div>'+
            '</div>'+
            '<div style="font-size:1.35rem;font-weight:800;color:'+saldoCo+';">'+_fmtMoeda(Math.abs(saldoV))+'</div>'+
          '</div>'+
          // Separador + histórico de pagamentos
          '<div style="padding:8px 14px 4px;'+
            'font-size:.58rem;color:'+T3+';text-transform:uppercase;letter-spacing:.08em;'+
            'border-top:1px solid '+BD+';">Últimos pagamentos</div>'+
          listaUltPags+
        '</div>';
      })()+

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
      // Atalho decendial — mostra o decêndio em aberto mais antigo, não o próximo a vencer
      (function(){
        var hoje   = _hoje();
        var dHoje  = parseInt(hoje.slice(8, 10));
        var mesRef = _mesAno(0);
        var pags   = getPagamentos();
        var meusP  = Object.values(pags).filter(function(p){
          return p.funcionarioId === f.id && p.data && p.data.slice(0,7) === mesRef;
        });
        var pagoPorDec = { d1: 0, d2: 0, d3: 0 };
        meusP.forEach(function(p){
          var dp = parseInt(p.data.slice(8,10));
          if (dp <= 10)      pagoPorDec.d1 += parseFloat(p.valor)||0;
          else if (dp <= 20) pagoPorDec.d2 += parseFloat(p.valor)||0;
          else               pagoPorDec.d3 += parseFloat(p.valor)||0;
        });
        var dec1 = parseFloat(f.dec1)||(parseFloat(f.salario)||0)/3;
        var dec2 = parseFloat(f.dec2)||(parseFloat(f.salario)||0)/3;
        var dec3 = parseFloat(f.dec3)||(parseFloat(f.salario)||0)/3;

        // Descobre qual decêndio já venceu e ainda não foi pago
        var emAberto = null;
        var numAberto = null;
        if (dHoje >= 10 && pagoPorDec.d1 < dec1 - 0.5) {
          emAberto = { label: '1º decêndio', valor: dec1, sub: 'Venceu dia 10' }; numAberto = 1;
        } else if (dHoje >= 20 && pagoPorDec.d2 < dec2 - 0.5) {
          emAberto = { label: '2º decêndio', valor: dec2, sub: 'Venceu dia 20' }; numAberto = 2;
        } else if (dHoje > 20 && pagoPorDec.d3 < dec3 - 0.5) {
          emAberto = { label: '3º decêndio', valor: dec3, sub: 'Vence fim do mês' }; numAberto = 3;
        }

        // Se nada em aberto, mostra o próximo a vencer
        if (!emAberto) {
          var nd = _proximoDecendio();
          var vDec = _decendioBase(f);
          var prazo = nd.diasRestantes === 0 ? 'HOJE' : nd.diasRestantes === 1 ? 'amanhã' : 'em '+nd.diasRestantes+'d';
          numAberto = dHoje <= 10 ? 1 : dHoje <= 20 ? 2 : 3;
          emAberto = { label: nd.label, valor: vDec, sub: 'Vence '+prazo };
        }

        var urgente = emAberto.sub.indexOf('Venceu') >= 0;
        var cor = urgente ? RED : GOLD;
        var bg  = urgente ? 'rgba(200,92,92,.08)' : 'rgba(201,168,76,.07)';
        var bd  = urgente ? 'rgba(200,92,92,.3)'  : 'rgba(201,168,76,.28)';
        return '<button onclick="HR_FUNC._pagarDecendioRapido(\''+id+'\','+numAberto+')" '+
          'style="width:100%;padding:12px 14px;background:'+bg+';border:1.5px solid '+bd+';'+
          'border-radius:11px;font-family:Outfit,sans-serif;cursor:pointer;margin-bottom:8px;'+
          'display:flex;justify-content:space-between;align-items:center;">'+
          '<div style="text-align:left;">'+
            '<div style="font-size:.82rem;font-weight:700;color:'+cor+';margin-bottom:2px;">'+
              '📆 Pagar '+emAberto.label+
            '</div>'+
            '<div style="font-size:.65rem;color:'+T3+';">'+emAberto.sub+'</div>'+
          '</div>'+
          '<div style="text-align:right;">'+
            '<div style="font-size:1rem;font-weight:800;color:'+cor+';">'+_fmtMoeda(emAberto.valor)+'</div>'+
            '<div style="font-size:.6rem;color:'+T3+';">valor sugerido</div>'+
          '</div>'+
        '</button>';
      })()+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">'+
        '<button onclick="HR_FUNC.abrirHistorico(\''+id+'\')" style="padding:11px;background:'+S3+';border:1px solid '+BD2+';color:'+T2+';border-radius:11px;font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">📋 Histórico</button>'+
        '<button onclick="HR_FUNC.abrirExtratoPagamentos(\''+id+'\')" style="padding:11px;background:'+S3+';border:1px solid '+BD2+';color:'+T2+';border-radius:11px;font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">📊 Extrato</button>'+
      '</div>'+
      '<button onclick="HR_FUNC.abrirAdvertencias(\''+id+'\')" '+
        'style="width:100%;padding:11px;background:rgba(200,92,92,.07);border:1px solid rgba(200,92,92,.25);'+
        'color:'+RED+';border-radius:11px;font-family:Outfit,sans-serif;font-size:.78rem;font-weight:600;'+
        'cursor:pointer;margin-bottom:8px;">⚠️ Faltas &amp; Advertências</button>'+
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
    // Remove o 55 se já começar com ele (evita duplicação)
    if(tel.startsWith('55') && tel.length > 11) tel = tel.slice(2);
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

    // Pega exceções globais do mês (feriado, acordo, declarado)
    var excMes={};
    Object.values(getExcecoes()).filter(function(e){return e.data.startsWith(mesStr);})
      .forEach(function(e){excMes[e.data]=e;});

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
      var exc=excMes[dStr];
      var isHoje=dStr===hoje;
      var dow=new Date(dStr+'T12:00:00').getDay();
      var isFDS=dow===0||dow===6;
      var bg='transparent', cor=T3, brd='transparent', title='';
      if(isHoje){bg='rgba(201,168,76,.2)';cor=GOLD;brd=GOLDB;}
      // Exceção global tem prioridade visual se não houver ponto
      if(exc&&!reg){
        if(exc.tipo==='feriado'){bg='rgba(92,150,220,.2)';cor='#8ec8f0';brd='rgba(92,150,220,.3)';title=exc.descricao||'Feriado';}
        else if(exc.tipo==='acordo'){bg='rgba(180,120,220,.2)';cor='#c88ef0';brd='rgba(180,120,220,.3)';title=exc.descricao||'Acordo/Folga';}
        else if(exc.tipo==='declarado'){bg='rgba(60,180,120,.18)';cor='#6fcca0';brd='rgba(60,180,120,.3)';title=exc.descricao||'Declarado';}
      }
      if(reg){
        if(reg.autoCompletado){bg='rgba(200,92,92,.18)';cor=RED;brd='rgba(200,92,92,.3)';}
        else if(parseFloat(reg.extra)>0){bg='rgba(201,168,76,.25)';cor=GOLD;brd='transparent';}
        else{bg='rgba(92,184,92,.2)';cor=GREEN;brd='transparent';}
        title=reg.horas+'h'+(parseFloat(reg.extra)>0?' +'+reg.extra+'h extra':'')+(reg.autoCompletado?' ⚠️ −'+reg.penalidade+'min':'');
      }
      if(isFDS&&!reg&&!exc){cor='rgba(122,114,104,.4)';}
      h+='<div style="text-align:center;padding:4px 2px;border-radius:6px;border:1px solid '+brd+';background:'+bg+';'+
        'font-size:.65rem;font-weight:'+(isHoje?'800':'600')+';color:'+cor+';cursor:'+(reg||exc?'pointer':'default')+';" '+
        (reg?'onclick="HR_FUNC.abrirDetalhesRegistro(\''+reg.id+'\')"':'')+(exc&&!reg?'onclick="HR_FUNC.abrirGestaoExcecoes()"':'')+
        (title?' title="'+title+'"':'')+'>'+
        d+'</div>';
    }
    h+='</div>';
    // Legenda
    h+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;justify-content:center;">' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(92,184,92,.25);"></div>Normal</div>' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(200,92,92,.2);border:1px solid rgba(200,92,92,.4);"></div>Auto-compl.</div>' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(201,168,76,.3);"></div>Extra</div>' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(92,150,220,.25);"></div>Feriado</div>' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(180,120,220,.25);"></div>Acordo</div>' +
      '<div style="display:flex;align-items:center;gap:4px;font-size:.62rem;color:'+T3+';">' +
        '<div style="width:10px;height:10px;border-radius:3px;background:rgba(60,180,120,.22);"></div>Declarado</div>' +
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
    var funcs       = getFuncionarios();
    var pags        = getPagamentos();
    var mesAtual    = _mesAno(0);
    var mesAnterior = _mesAno(-1);
    var periodoAtivo = window._folhaMes || mesAtual;

    var ativos = Object.values(funcs)
      .filter(function(f){ return f.ativo !== false; })
      .sort(function(a,b){ return a.nome.localeCompare(b.nome); });

    var di     = periodoAtivo + '-01';
    var ultimo = new Date(parseInt(periodoAtivo.slice(0,4)), parseInt(periodoAtivo.slice(5,7)), 0);
    var df     = periodoAtivo + '-' + String(ultimo.getDate()).padStart(2,'0');

    var fmtMes = function(m){
      var p = m.split('-');
      var ns = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return ns[parseInt(p[1])] + '/' + p[0];
    };

    // Agrega pagamentos do período por funcionário e tipo
    var pagsPeriodo = Object.values(pags).filter(function(p){
      return p.data >= di && p.data <= df;
    });

    var totalFolha=0, totalExtras=0, totalPago=0, totalVales=0, totalDec=0, totalSaldo=0;

    var linhas = ativos.map(function(f){
      var s = calcSaldoFuncionario(f.id, di, df);
      totalFolha  += s.totalSalario;
      totalExtras += s.valorExtra;
      totalPago   += s.totalPago;
      // Acumula saldo real (pode ser negativo = crédito): soma s.saldo positivos apenas
      if (s.saldo > 0.01) totalSaldo += s.saldo;

      // Vales e adiantamentos deste funcionário no período
      var meusPags = pagsPeriodo.filter(function(p){ return p.funcionarioId === f.id; });
      var vales    = meusPags
        .filter(function(p){ return p.tipo === 'vale' || p.tipo === 'adiantamento'; })
        .reduce(function(s,p){ return s + (parseFloat(p.valor)||0); }, 0);
      var decend   = meusPags
        .filter(function(p){ return p.tipo === 'decendio'; })
        .reduce(function(s,p){ return s + (parseFloat(p.valor)||0); }, 0);
      totalVales += vales;
      totalDec   += decend;

      return {f:f, s:s, vales:vales, decend:decend};
    });

    var html =
      '<div style="width:100%;max-width:620px;padding:0 16px;">'+
      _overlayHeader('Folha de Pagamento','📑 '+fmtMes(periodoAtivo),'HR_FUNC._closeFolha()')+

      // Seletor de mês + aba projeção
      '<div style="display:flex;gap:8px;margin-bottom:14px;">'+
        [mesAnterior, mesAtual].map(function(m){
          var on = m === periodoAtivo && !window._folhaProjecao;
          return '<button onclick="window._folhaMes=\''+m+'\';window._folhaProjecao=false;HR_FUNC.abrirFolhaPagamento();" '+
            'style="flex:1;padding:9px;border-radius:9px;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;'+
            (on
              ? 'background:'+GOLD2+';border:1.5px solid '+GOLDB+';color:'+GOLD+';'
              : 'background:'+S2+';border:1px solid '+BD+';color:'+T3+';"')+
            '>'+fmtMes(m)+'</button>';
        }).join('')+
        '<button onclick="window._folhaProjecao=true;HR_FUNC.abrirFolhaPagamento();" '+
          'style="flex:1;padding:9px;border-radius:9px;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;'+
          (window._folhaProjecao
            ? 'background:rgba(167,139,250,.15);border:1.5px solid rgba(167,139,250,.4);color:#a78bfa;'
            : 'background:'+S2+';border:1px solid '+BD+';color:'+T3+';"')+
          '>🔮 Projeção</button>'+
      '</div>'+

      // Se aba projeção ativa — mostra bloco de projeção e encerra cedo
      (window._folhaProjecao ? HR_FUNC._htmlProjecaoFolha(ativos, pags, fmtMes) + '<button onclick="HR_FUNC._closeFolha()" style="'+CSS_BTN_GHOST+'">Fechar</button></div>' : '') +
      (window._folhaProjecao ? '' :

      // KPIs resumo: Salário Devido | HE Devida | Total Devido | Já Pago
      '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:10px;">'+
        _miniKpi('💰 Sal. Devido',    _fmtMoeda(totalFolha),                  GOLD)+
        _miniKpi('⚡ HE Devida',      _fmtMoeda(totalExtras),  totalExtras>0?GOLD:T3)+
        _miniKpi('✅ Já Pago',        _fmtMoeda(totalPago),                   GREEN)+
        _miniKpi('📌 Saldo a Pagar',  _fmtMoeda(totalSaldo),   totalSaldo>0.01?RED:GREEN)+
      '</div>'+

      // Barra de resumo detalhada
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;'+
        'padding:12px 16px;margin-bottom:14px;">'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'+
          '<div style="font-size:.62rem;color:'+T3+';text-transform:uppercase;letter-spacing:.08em;">Total devido (salário + HE)</div>'+
          '<div style="font-size:.88rem;font-weight:700;color:'+GOLD+';">'+_fmtMoeda(totalFolha+totalExtras)+'</div>'+
        '</div>'+
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'+
          '<div style="font-size:.62rem;color:'+T3+';text-transform:uppercase;letter-spacing:.08em;">Já pago no período</div>'+
          '<div style="font-size:.88rem;font-weight:700;color:'+GREEN+';">− '+_fmtMoeda(totalPago)+'</div>'+
        '</div>'+
        '<div style="border-top:1px solid '+BD+';margin:6px 0;"></div>'+
        '<div style="display:flex;justify-content:space-between;align-items:center;">'+
          '<div style="font-size:.65rem;color:'+T3+';font-weight:700;text-transform:uppercase;letter-spacing:.08em;">Saldo a pagar</div>'+
          '<div style="font-size:1.1rem;font-weight:800;color:'+(totalSaldo>0.01?RED:GREEN)+';">'+_fmtMoeda(totalSaldo)+'</div>'+
        '</div>'+
      '</div>'+

      // Tabela por funcionário
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;overflow:hidden;margin-bottom:14px;">'+
        // Header
        '<div style="display:grid;grid-template-columns:1fr 72px 68px 72px 80px 36px;gap:0;'+
          'padding:8px 14px;background:rgba(201,168,76,.06);'+
          'font-size:.58rem;color:'+GOLD+';letter-spacing:.07em;text-transform:uppercase;">'+
          '<span>Funcionário</span>'+
          '<span style="text-align:right;">Salário</span>'+
          '<span style="text-align:right;">Extras</span>'+
          '<span style="text-align:right;">🎫 Vales</span>'+
          '<span style="text-align:right;">Saldo</span>'+
          '<span></span>'+
        '</div>'+
        linhas.map(function(l, idx){
          var sc   = l.s.temCredito ? GREEN : (l.s.saldo > 0.01 ? RED : T3);
          var slbl = l.s.temCredito ? '✓ crédito' : (l.s.saldo > 0.01 ? 'a pagar' : 'quitado');
          return '<div style="display:grid;grid-template-columns:1fr 72px 68px 72px 80px 36px;gap:0;'+
              'padding:10px 14px;border-top:1px solid '+BD+';'+
              (idx%2===1 ? 'background:rgba(255,255,255,.015);' : '')+'align-items:center;">'+
            '<div>'+
              '<div style="font-size:.82rem;font-weight:600;color:'+T1+';">'+_esc(l.f.nome.split(' ')[0])+'</div>'+
              '<div style="font-size:.62rem;color:'+T3+';">'+l.s.diasTrabalhados+'d · '+l.s.totalHoras.toFixed(0)+'h</div>'+
            '</div>'+
            '<div style="text-align:right;font-size:.75rem;color:'+T2+';">'+_fmtMoeda(l.s.totalSalario)+'</div>'+
            '<div style="text-align:right;font-size:.75rem;color:'+(l.s.valorExtra>0?GOLD:T3)+';font-weight:'+(l.s.valorExtra>0?'700':'400')+';">'+
              (l.s.valorExtra > 0 ? _fmtMoeda(l.s.valorExtra) : '—')+
            '</div>'+
            '<div style="text-align:right;font-size:.75rem;color:'+(l.vales>0?'#e0954a':T3)+';">'+
              (l.vales > 0 ? _fmtMoeda(l.vales) : '—')+
            '</div>'+
            '<div style="text-align:right;">'+
              '<div style="font-size:.8rem;font-weight:700;color:'+sc+';">'+_fmtMoeda(Math.abs(l.s.saldo))+'</div>'+
              '<div style="font-size:.58rem;color:'+T3+';">'+slbl+'</div>'+
            '</div>'+
            '<div style="text-align:center;">'+
              '<button onclick="HR_FUNC.abrirFormPagamento(\''+l.f.id+'\');HR_FUNC._closeFolha();" '+
                'style="background:none;border:none;color:'+GREEN+';cursor:pointer;font-size:.95rem;padding:2px;" '+
                'title="Registrar pagamento">💳</button>'+
            '</div>'+
          '</div>';
        }).join('')+
      '</div>'+

      // Dica decendial
      '<div style="background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.15);'+
        'border-radius:10px;padding:10px 14px;margin-bottom:12px;font-size:.7rem;color:'+T3+';line-height:1.7;">'+
        '📆 <strong style="color:'+GOLD+';">Pagamento de 10 em 10 dias:</strong> '+
        '1º decêndio — dia 10 · 2º decêndio — dia 20.'+
      '</div>'+

      '<button onclick="HR_FUNC._closeFolha()" style="'+CSS_BTN_GHOST+'">Fechar</button>'+
    '</div>');

    _overlay('hrFolha', html);
  }
  function _closeFolha(){ _closeOverlay('hrFolha'); }

  // ─────────────────────────────────────────────────────────────
  // PROJEÇÃO DE FOLHA
  // Estima o custo do mês atual com base na média dos 3 meses anteriores
  // ─────────────────────────────────────────────────────────────
  function _htmlProjecaoFolha(ativos, pags, fmtMes) {
    // Meses de referência: últimos 3 meses fechados
    var refMeses = [];
    for (var i = 3; i >= 1; i--) {
      var d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      refMeses.push(d.toISOString().slice(0, 7));
    }

    // Agrega pagamentos por funcionário por mês de referência
    var pagsArr = Object.values(pags);

    var linhas = ativos.map(function(f) {
      var mediasMes = refMeses.map(function(m) {
        var di = m + '-01';
        var ult = new Date(parseInt(m.slice(0,4)), parseInt(m.slice(5,7)), 0);
        var df  = m + '-' + String(ult.getDate()).padStart(2,'0');
        var total = pagsArr
          .filter(function(p){ return p.funcionarioId===f.id && p.data>=di && p.data<=df; })
          .reduce(function(s,p){ return s+(parseFloat(p.valor)||0); }, 0);
        return total;
      });

      // Quantos dos 3 meses têm dado real
      var comDado = mediasMes.filter(function(v){ return v > 0; });
      var media   = comDado.length > 0
        ? comDado.reduce(function(s,v){ return s+v; }, 0) / comDado.length
        : (parseFloat(f.salario)||0); // fallback: salário cadastrado

      // Vales frequentes: média dos vales nos 3 meses
      var mediaVales = (function() {
        var somaV = refMeses.reduce(function(s, m) {
          var di = m+'-01';
          var ult = new Date(parseInt(m.slice(0,4)), parseInt(m.slice(5,7)), 0);
          var df  = m+'-'+String(ult.getDate()).padStart(2,'0');
          return s + pagsArr
            .filter(function(p){ return p.funcionarioId===f.id && p.data>=di && p.data<=df && (p.tipo==='vale'||p.tipo==='adiantamento'); })
            .reduce(function(sv,p){ return sv+(parseFloat(p.valor)||0); }, 0);
        }, 0);
        return somaV / 3;
      })();

      return { f: f, media: media, mediaVales: mediaVales, meses: mediasMes, comDado: comDado.length };
    });

    var totalProj = linhas.reduce(function(s,l){ return s+l.media; }, 0);
    var totalValesProj = linhas.reduce(function(s,l){ return s+l.mediaVales; }, 0);

    var meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                 'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
    var mesAtualLabel = meses[new Date().getMonth()] + '/' + new Date().getFullYear();

    var h = '';

    // Header projeção
    h += '<div style="background:rgba(167,139,250,.08);border:1px solid rgba(167,139,250,.25);'+
      'border-radius:12px;padding:13px 16px;margin-bottom:14px;">'+
      '<div style="font-size:.6rem;color:rgba(167,139,250,.7);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">'+
        '🔮 Projeção — '+mesAtualLabel+
      '</div>'+
      '<div style="font-size:.7rem;color:'+T3+';line-height:1.5;">'+
        'Estimativa baseada na média dos pagamentos dos últimos 3 meses: '+
        refMeses.map(fmtMes).join(', ')+'.'+
      '</div>'+
    '</div>';

    // KPIs
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">'+
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:12px;text-align:center;">'+
        '<div style="font-size:.58rem;color:'+T3+';text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Folha projetada</div>'+
        '<div style="font-size:1.25rem;font-weight:800;color:#a78bfa;">'+_fmtMoeda(totalProj)+'</div>'+
      '</div>'+
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:12px;text-align:center;">'+
        '<div style="font-size:.58rem;color:'+T3+';text-transform:uppercase;letter-spacing:.08em;margin-bottom:3px;">Vales projetados</div>'+
        '<div style="font-size:1.25rem;font-weight:800;color:#e0954a;">'+_fmtMoeda(totalValesProj)+'</div>'+
      '</div>'+
    '</div>';

    // Tabela por funcionário
    h += '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;overflow:hidden;margin-bottom:14px;">';
    h += '<div style="display:grid;grid-template-columns:1fr repeat(3,60px) 80px;gap:0;'+
      'padding:8px 14px;background:rgba(167,139,250,.06);'+
      'font-size:.55rem;color:#a78bfa;letter-spacing:.07em;text-transform:uppercase;">'+
      '<span>Funcionário</span>'+
      refMeses.map(function(m){ return '<span style="text-align:right;">'+fmtMes(m)+'</span>'; }).join('')+
      '<span style="text-align:right;">Projeção</span>'+
    '</div>';

    linhas.forEach(function(l, idx) {
      var confianca = l.comDado === 3 ? '●●●' : l.comDado === 2 ? '●●○' : l.comDado === 1 ? '●○○' : '○○○';
      var confiancaCor = l.comDado === 3 ? GREEN : l.comDado >= 1 ? GOLD : RED;
      h += '<div style="display:grid;grid-template-columns:1fr repeat(3,60px) 80px;gap:0;'+
        'padding:10px 14px;border-top:1px solid '+BD+';'+
        (idx%2===1?'background:rgba(255,255,255,.015);':'')+'align-items:center;">';
      h += '<div>'+
        '<div style="font-size:.82rem;font-weight:600;color:'+T1+';">'+_esc(l.f.nome.split(' ')[0])+'</div>'+
        '<div style="font-size:.6rem;color:'+confiancaCor+';letter-spacing:.05em;">'+confianca+'</div>'+
      '</div>';
      l.meses.forEach(function(v) {
        h += '<div style="text-align:right;font-size:.72rem;color:'+(v>0?T2:T3)+';">'+
          (v>0?_fmtMoeda(v):'—')+
        '</div>';
      });
      h += '<div style="text-align:right;">'+
        '<div style="font-size:.82rem;font-weight:800;color:#a78bfa;">'+_fmtMoeda(l.media)+'</div>'+
      '</div>';
      h += '</div>';
    });

    h += '</div>';

    // Legenda confiança
    h += '<div style="background:rgba(255,255,255,.02);border:1px solid '+BD2+';border-radius:10px;'+
      'padding:10px 14px;margin-bottom:12px;font-size:.7rem;color:'+T3+';line-height:1.8;">'+
      '<strong style="color:'+T2+';">Confiança da projeção:</strong> '+
      '<span style="color:'+GREEN+';">●●●</span> 3 meses de dado real · '+
      '<span style="color:'+GOLD+';">●●○</span> 2 meses · '+
      '<span style="color:'+RED+';">●○○</span> 1 mês · '+
      '<span style="color:'+T3+';">○○○</span> sem histórico (usa salário cadastrado)'+
    '</div>';

    return h;
  }

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

    // ── Banner de penalidade — visível ao abrir um registro auto-completado ──
    var penBannerHtml = '';
    if (r.autoCompletado && r.penalidade) {
      var TIPO_TEXTO_BAN = { sem_entrada:'entrada não registrada', sem_saida:'saída não registrada', ambos:'entrada e saída não registradas' };
      var txtFalha = TIPO_TEXTO_BAN[r.tipoFalha] || r.tipoFalha || 'ponto incompleto';
      var hrInferido = r.penHoraInferida || (r.tipoFalha==='sem_entrada' ? r.entrada : r.saida) || '—';
      penBannerHtml =
        '<div style="background:rgba(200,92,92,.08);border:1.5px solid rgba(200,92,92,.35);'+
        'border-radius:12px;padding:13px 15px;margin-bottom:14px;">' +
          '<div style="font-size:.7rem;font-weight:800;color:'+RED+';margin-bottom:8px;display:flex;align-items:center;gap:7px;">'+
            '<span>⚠️</span><span>PENALIDADE AUTOMÁTICA APLICADA</span>'+
          '</div>'+
          // Horário inferido em destaque
          '<div style="background:rgba(200,92,92,.12);border-radius:8px;padding:9px 11px;margin-bottom:8px;'+
          'display:flex;justify-content:space-between;align-items:center;">' +
            '<div>' +
              '<div style="font-size:.65rem;color:'+T3+';margin-bottom:2px;">Horário assumido pelo sistema</div>'+
              '<div style="font-size:1rem;font-weight:800;color:'+RED+';">'+_esc(hrInferido)+'</div>'+
              '<div style="font-size:.63rem;color:'+T3+';margin-top:1px;">'+_esc(txtFalha)+'</div>'+
            '</div>'+
            '<div style="text-align:right;">' +
              '<div style="font-size:.65rem;color:'+T3+';margin-bottom:2px;">Desconto</div>'+
              '<div style="font-size:1rem;font-weight:800;color:'+RED+';">−'+r.penalidade+' min</div>'+
              '<div style="font-size:.6rem;color:'+T3+';margin-top:1px;">ocorrência #'+(r.penOcorrencia||'?')+'</div>'+
            '</div>'+
          '</div>'+
          // Contexto de batidas
          (r.penMotivo
            ? '<div style="font-size:.68rem;color:rgba(220,160,160,.9);line-height:1.6;margin-bottom:6px;">'+
                '📋 '+_esc(r.penMotivo)+
              '</div>'
            : ''
          )+
          '<div style="font-size:.63rem;color:'+T3+';border-top:1px solid rgba(200,92,92,.15);padding-top:6px;">'+
            'Para corrigir, ajuste o horário de <strong style="color:'+T1+';">'+_esc(r.tipoFalha==='sem_entrada'?'Entrada':'Saída')+'</strong> '+
            'acima com o horário real e salve. A penalidade será removida automaticamente.'+
          '</div>'+
        '</div>';
    }

    var html='<div style="width:100%;max-width:500px;padding:0 16px;">'+
      _overlayHeader((registroId?'Editar':'Novo Registro')+' · '+_esc(f.nome.split(' ')[0]),'📝 Ponto do Dia','HR_FUNC._closeRegistro()')+
      alertasHtml+
      penBannerHtml+

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
          {v:'normal',l:'Dobrada ×2 (dia útil / sáb manhã)'},{v:'feriado',l:'Triplicada ×3 (feriado)'},{v:'especial',l:'Triplicada ×3 (dom / sáb tarde / muito cedo ou tarde)'}
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
      (registroId
        ? (r.autoCompletado
            ? '<button onclick="HR_FUNC._removerPenalidade(\''+registroId+'\',\''+funcionarioId+'\')" style="'+CSS_BTN_GHOST+'color:#e08040;border-color:rgba(200,120,40,.3);">✏️ Remover penalidade (confirmar horário real)</button>'
            : ''
          )+
          '<button onclick="HR_FUNC._excluirRegistro(\''+registroId+'\',\''+funcionarioId+'\')" style="'+CSS_BTN_GHOST+'color:'+RED+';border-color:rgba(200,92,92,.25);">🗑 Excluir</button>'
        : '')+
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

  // Remove penalidade de auto-completamento quando o gerente confirma o horário real
  // Limpa os flags autoCompletado/penalidade do registro e remove a ocorrência associada
  function _removerPenalidade(registroId, funcionarioId) {
    var regs = getRegistros();
    var r = regs[registroId];
    if (!r) return;
    if (!confirm(
      'Confirmar que o horário registrado é o real?\n\n' +
      'Isso remove a penalidade de −' + r.penalidade + ' min deste dia.\n' +
      'Os campos de entrada/saída permanecem como estão agora.'
    )) return;

    // Recalcula horas SEM penalidade a partir dos horários atuais
    var entStr = r.entrada || '';
    var saiStr  = r.saida   || '';
    if (entStr && saiStr) {
      var ep = entStr.split(':').map(Number);
      var sp = saiStr.split(':').map(Number);
      var diff = (sp[0]*60+sp[1]) - (ep[0]*60+ep[1]);
      if (diff < 0) diff += 1440;
      var almocoMin = 0;
      if (r.saidaAlmoco && r.voltaAlmoco) {
        var sa = r.saidaAlmoco.split(':').map(Number);
        var va = r.voltaAlmoco.split(':').map(Number);
        almocoMin = (va[0]*60+va[1]) - (sa[0]*60+sa[1]);
        if (almocoMin < 0) almocoMin = 0;
      }
      r.horas = parseFloat(Math.max(0, (diff - almocoMin) / 60).toFixed(2));
    }

    // Limpa flags de penalidade
    delete r.autoCompletado;
    delete r.penalidade;
    delete r.tipoFalha;
    delete r.penMotivo;
    delete r.penHoraInferida;
    delete r.penOcorrencia;
    delete r.entradaOriginal;
    delete r.saidaOriginal;
    r.atualizadoEm = new Date().toISOString();
    regs[registroId] = r;
    saveRegistros(regs);

    // Remove ocorrência associada
    var ocors = getOcorrencias();
    Object.keys(ocors).forEach(function(k){
      if (ocors[k].registroId === registroId) delete ocors[k];
    });
    saveOcorrencias(ocors);

    _toast('✓ Penalidade removida. Horas recalculadas: ' + r.horas + 'h');
    _closeRegistro();
    if (document.getElementById('hrFuncDetalhes')) abrirDetalhesFuncionario(funcionarioId);
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
  // ─────────────────────────────────────────────────────────────
  // Mapa de tipos de pagamento — label, ícone, cor
  // ─────────────────────────────────────────────────────────────
  var _TIPOS_PAG = {
    decendio:         { label:'Pagamento Decendial', icon:'📆', cor:GOLD      },
    vale:             { label:'Vale',                icon:'🎫', cor:'#e0954a' },
    adiantamento:     { label:'Adiantamento',        icon:'💸', cor:'#8ec8f0' },
    salario:          { label:'Salário',             icon:'💰', cor:GREEN     },
    bonus:            { label:'Bônus / Comissão',    icon:'🏆', cor:GREEN     },
    he:               { label:'Horas Extras',        icon:'⚡', cor:GOLD      },
    bonificacao_he3x: { label:'Bonificação HE 3×',   icon:'🏆', cor:GREEN     },
    he_duplicada_2x:  { label:'H. Extras 2×',        icon:'⚡⚡', cor:BLUE    },
    outro:            { label:'Outro',               icon:'💳', cor:T2        }
  };
  var _FORMAS_PAG = [
    {v:'dinheiro',l:'💵 Dinheiro'},
    {v:'pix',     l:'📱 Pix'},
    {v:'ted',     l:'🏦 TED / DOC'},
    {v:'cheque',  l:'📋 Cheque'},
    {v:'outro',   l:'Outro'}
  ];

  function abrirFormPagamento(funcIdInicial){
    var funcs = getFuncionarios();
    var lista = Object.values(funcs)
      .filter(function(f){ return f.ativo !== false; })
      .sort(function(a,b){ return a.nome.localeCompare(b.nome); });
    var opsFuncs = [{v:'',l:'— Selecione —'}].concat(
      lista.map(function(f){ return {v:f.id, l:f.nome}; })
    );
    var hoje = _hoje();
    // Período do saldo: decêndio atual (1–10, 11–20, 21–fim)
    // Exibe apenas HE do período que está sendo pago agora.
    // Descobre qual decêndio pré-selecionar: o decêndio mais recente que passou
    // (ex: se hoje é dia 25, o 2º decêndio (11-20) já fechou e é o que deve ser pago)
    var _hoje2 = new Date();
    var _dHoje = _hoje2.getDate();
    var _decInicial = _dHoje <= 10 ? 1 : _dHoje <= 20 ? 2 : 2; // dia 21-30: último pago foi o 2º
    // Se hoje > 20, o 3º ainda não fechou — padrão é 2º. Mas se funcionar via atalho, pode ser sobrescrito.
    var _decSelecionado = _decInicial;
    var _decPer = _periodoDecendio(_decSelecionado);
    var _pagDi  = _decPer.di;
    var _pagDf  = _decPer.df;
    var _extraPagIncluir = true; // estado do toggle: true=pagar HE, false=acumular
    var saldo = funcIdInicial ? calcSaldoFuncionario(funcIdInicial, _pagDi, _pagDf) : null;

















    var f     = funcIdInicial ? (funcs[funcIdInicial] || {}) : {};

    // Sugestão de valor: usa dec1/dec2/dec3 configurado, fallback salário ÷ 3
    var _sugestaoNum = funcIdInicial ? _decendioBase(f) : 0;
    var sugestao = _sugestaoNum > 0 ? _sugestaoNum.toFixed(2) : '';

    var opsTipo = Object.keys(_TIPOS_PAG).map(function(k){
      var t = _TIPOS_PAG[k];
      return {v:k, l:t.icon+' '+t.label};
    });

    var html =
      '<div style="width:100%;max-width:500px;padding:0 16px;">'+
      _overlayHeader('Registrar Pagamento','💳 RH · Financeiro','HR_FUNC._closePagamento()')+

      // Seletor de decêndio
      '<div style="display:flex;gap:6px;margin-bottom:10px;">'+
        [1,2,3].map(function(n){
          var dp = _periodoDecendio(n);
          var ativo = n === _decSelecionado;
          return '<button onclick="HR_FUNC._selecionarDecendio('+n+')" id="btn_dec_'+n+'" '+
            'style="flex:1;padding:8px 4px;border-radius:9px;border:1.5px solid '+(ativo?GOLD:'rgba(255,255,255,.12)')+';'+
            'background:'+(ativo?'rgba(201,168,76,.15)':'rgba(255,255,255,.04)')+';'+
            'color:'+(ativo?GOLD:T3)+';font-family:Outfit,sans-serif;font-size:.7rem;font-weight:700;cursor:pointer;">'+
            '<div>'+n+'º dec</div>'+
            '<div style="font-size:.58rem;font-weight:400;">'+dp.di.slice(8)+' a '+dp.df.slice(8)+'</div>'+
          '</button>';
        }).join('')+
      '</div>'+
      // Bloco saldo (atualizado via JS)
      '<div id="pag_saldo_info">'+(funcIdInicial && saldo ? _blocoSaldo(saldo, f, _extraPagIncluir, _decSelecionado) : '')+'</div>'+

      _secao('Dados do Pagamento',
        _campo('Funcionário', _sel('pag_func', opsFuncs, funcIdInicial || ''))+
        _campo('Tipo', _sel('pag_tipo', opsTipo, 'decendio'))+
        _grid2(
          _campo('Data', _inp('pag_data','date','', hoje)),
          _campo('Valor (R$)', _inp('pag_valor','number','0,00', sugestao,'min="0.01" step="0.01"'))
        )+
        _campo('Forma de Pagamento', _sel('pag_forma', _FORMAS_PAG, 'pix'))+
        _campo('Observação (opcional)', _inp('pag_obs','text','Ex: 1º decendio junho, vale farmácia...',''))
      )+

      // Dica decendial — mais explicativa
      '<div id="pag_dica_dec" style="background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.2);'+
        'border-radius:11px;padding:12px 14px;margin-bottom:12px;">'+
        '<div style="font-size:.65rem;color:'+GOLD+';font-weight:700;letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px;">'+
          '📆 Como funciona o pagamento decendial'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px;">'+
          '<div style="background:rgba(0,0,0,.2);border-radius:8px;padding:7px 8px;text-align:center;">'+
            '<div style="font-size:.58rem;color:'+T3+';margin-bottom:2px;">1º pagamento</div>'+
            '<div style="font-size:.7rem;font-weight:700;color:'+T2+';">dia 10</div>'+
          '</div>'+
          '<div style="background:rgba(0,0,0,.2);border-radius:8px;padding:7px 8px;text-align:center;">'+
            '<div style="font-size:.58rem;color:'+T3+';margin-bottom:2px;">2º pagamento</div>'+
            '<div style="font-size:.7rem;font-weight:700;color:'+T2+';">dia 20</div>'+
          '</div>'+
          '<div style="background:rgba(0,0,0,.2);border-radius:8px;padding:7px 8px;text-align:center;">'+
            '<div style="font-size:.58rem;color:'+T3+';margin-bottom:2px;">3º pagamento</div>'+
            '<div style="font-size:.7rem;font-weight:700;color:'+T2+';">fim do mês</div>'+
          '</div>'+
        '</div>'+
        (sugestao
          ? '<div style="font-size:.72rem;color:'+T2+';line-height:1.5;">'+
              'Sugestão para o funcionário selecionado: '+
              '<strong style="color:'+GOLD+';">'+_fmtMoeda(parseFloat(sugestao))+'</strong>'+
              ' por parcela <span style="color:'+T3+';">( decêndio configurado )</span>'+
            '</div>'
          : '')+
      '</div>'+

      '<button onclick="HR_FUNC._salvarPagamento()" style="'+CSS_BTN_GREEN+'">✅ Confirmar Pagamento</button>'+
      '<button onclick="HR_FUNC._gerarRelatorioPonto()" style="'+CSS_BTN_GHOST+'margin-bottom:6px;">📄 Relatório de Ponto</button>'+
      '<button onclick="HR_FUNC._closePagamento()" style="'+CSS_BTN_GHOST+'">Cancelar</button>'+
    '</div>';

    _overlay('hrPagamento', html);

    setTimeout(function(){
      // Atualiza saldo e sugestão ao trocar funcionário
      var selFunc = document.getElementById('pag_func');
      var selTipo = document.getElementById('pag_tipo');
      if (!selFunc) return;

      function _atualizarPainel(){
        var fid   = selFunc.value;
        var tipo  = (selTipo && selTipo.value) || 'decendio';
        var info  = document.getElementById('pag_saldo_info');
        var dica  = document.getElementById('pag_dica_dec');
        var inpV  = document.getElementById('pag_valor');
        if (!info) return;
        if (!fid){ info.innerHTML=''; if(dica) dica.style.display='none'; return; }
        var f2   = getFuncionarios()[fid] || {};
        var _dp2 = _periodoDecendio(_decSelecionado);
        var s2   = calcSaldoFuncionario(fid, _dp2.di, _dp2.df);
        info.innerHTML = _blocoSaldo(s2, f2, _extraPagIncluir, _decSelecionado);
        if (inpV && tipo === 'decendio') {
          var valDec2 = _decendioValorNum(f2, _decSelecionado);
          if (valDec2 > 0) inpV.value = valDec2.toFixed(2);
        }
        if (dica) dica.style.display = tipo === 'decendio' ? '' : 'none';
      }

      // Chamada ao clicar num botão de decêndio
      function _selecionarDecendio(num) {
        _decSelecionado = num;
        // Atualiza visual dos botões
        [1,2,3].forEach(function(n){
          var btn = document.getElementById('btn_dec_'+n);
          if (!btn) return;
          var ativo = n === num;
          btn.style.borderColor  = ativo ? '#C9A84C' : 'rgba(255,255,255,.12)';
          btn.style.background   = ativo ? 'rgba(201,168,76,.15)' : 'rgba(255,255,255,.04)';
          btn.style.color        = ativo ? '#C9A84C' : '#888';
        });
        // Atualiza a data de vencimento conforme o decêndio selecionado
        var inpD = document.getElementById('pag_data');
        if (inpD) {
          var _h = new Date();
          var _a = _h.getFullYear(), _m = _h.getMonth();
          var _dt;
          if      (num === 1) _dt = new Date(_a, _m, 10);
          else if (num === 2) _dt = new Date(_a, _m, 20);
          else                _dt = new Date(_a, _m + 1, 0);
          inpD.value = _dt.toISOString().slice(0, 10);
        }
        _atualizarPainel();
      }

      // Função chamada pelos botões do toggle de HE
      function _atualizarToggle(incluir) {
        _extraPagIncluir = incluir;
        var fid  = selFunc.value;
        var info = document.getElementById('pag_saldo_info');
        var inpV = document.getElementById('pag_valor');
        if (!fid || !info) return;
        var f2  = getFuncionarios()[fid] || {};
        var dp2 = _periodoDecendio(_decSelecionado);
        var s2  = calcSaldoFuncionario(fid, dp2.di, dp2.df);
        info.innerHTML = _blocoSaldo(s2, f2, _extraPagIncluir, _decSelecionado);
        if (inpV) {
          var valDec = _decendioValorNum(f2, _decSelecionado);
          if (!_extraPagIncluir) {
            inpV.value = valDec > 0 ? valDec.toFixed(2) : (parseFloat(f2.salario)||0).toFixed(2);
          } else {
            var heV = s2.valorExtra || 0;
            inpV.value = (valDec > 0 ? valDec + heV : (parseFloat(f2.salario)||0) + heV).toFixed(2);
          }
        }
      }
      // Expor funções para botões inline do HTML
      HR_FUNC._toggleExtraPag    = _atualizarToggle;
      HR_FUNC._selecionarDecendio = _selecionarDecendio;

      selFunc.addEventListener('change', _atualizarPainel);
      if (selTipo) selTipo.addEventListener('change', _atualizarPainel);
    }, 80);
  }

  // ─── Bloco financeiro reutilizável: conta-corrente visual ─────────────────
  // Aparece no modal de pagamento e pode ser chamado de outros contextos.
  // Mostra as linhas de composição do valor a pagar de forma transparente.
  function _blocoSaldo(s, f, incluirExtra, decNum){
    if (!s) return '';
    // incluirExtra: undefined/true = incluir HE no total; false = acumular no banco
    if (incluirExtra === undefined) incluirExtra = true;
    var sal     = (s && s.totalSalario != null) ? s.totalSalario : (f && f.salario ? parseFloat(f.salario) : 0);
    var he      = s.valorExtra || 0;
    var heEfetivo = incluirExtra ? he : 0; // HE só entra no total se toggleado
    var acr     = (s.totalDevido - sal - he) || 0; // acréscimos 2×/3× pendentes
    var acrEfetivo = incluirExtra ? acr : 0;
    var pago    = s.totalPago   || 0;
    var saldo   = sal + heEfetivo + acrEfetivo - pago;

    // Linha de composição: só mostra itens com valor > 0
    function _linha(label, valor, cor, destaque) {
      if (valor <= 0.005 && !destaque) return '';
      return '<div style="display:flex;justify-content:space-between;align-items:center;'+
        'padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);">'+
        '<span style="font-size:.75rem;color:'+T2+';">'+label+'</span>'+
        '<span style="font-size:.82rem;font-weight:'+(destaque?'800':'600')+';color:'+(cor||T1)+';">'+
          _fmtMoeda(valor)+
        '</span>'+
      '</div>';
    }
    function _linhaSubt(label, valor, cor) {
      return '<div style="display:flex;justify-content:space-between;align-items:center;'+
        'padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);">'+
        '<span style="font-size:.75rem;color:'+T2+';">'+label+'</span>'+
        '<span style="font-size:.82rem;font-weight:600;color:'+(cor||RED)+';">− '+_fmtMoeda(valor)+'</span>'+
      '</div>';
    }

    var saldoCor   = saldo < -0.01 ? GREEN : (saldo > 0.01 ? GOLD : GREEN);
    var saldoLabel = saldo < -0.01 ? 'Crédito (overpago)' : (saldo > 0.01 ? 'A pagar hoje' : 'Quitado ✓');
    var saldoIco   = saldo < -0.01 ? '💳' : (saldo > 0.01 ? '💰' : '✅');

    // Decêndio e período legível
    var _dp = decNum ? _periodoDecendio(decNum) : _periodoDecendioAtual();
    var _meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
    var _mesLabel = _meses[new Date().getMonth()] + '/' + new Date().getFullYear();
    var periodoLabel = _dp.label + ' — ' + _dp.di.slice(8) + ' a ' + _dp.df.slice(8) + '/' + _mesLabel;

    // Toggle de horas extras — só aparece quando há HE
    var toggleHE = '';
    if (he > 0.005) {
      var btnPagar = 'background:'+(incluirExtra?GOLD:'rgba(255,255,255,.08)')+';color:'+(incluirExtra?'#1a1a1a':T3)+';';
      var btnAcum  = 'background:'+(!incluirExtra?'#3a6ea5':'rgba(255,255,255,.08)')+';color:'+(!incluirExtra?'#fff':T3)+';';
      toggleHE =
        '<div style="display:flex;gap:6px;align-items:center;padding:9px 0 4px;">'+
        '<span style="font-size:.68rem;color:'+T3+';flex:1;">Horas extras:</span>'+
        '<div style="display:flex;border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,.12);">'+
          '<button onclick="HR_FUNC._toggleExtraPag(true)" style="'+btnPagar+
            'border:none;padding:5px 10px;font-size:.68rem;font-weight:700;cursor:pointer;">💰 Pagar agora</button>'+
          '<button onclick="HR_FUNC._toggleExtraPag(false)" style="'+btnAcum+
            'border:none;padding:5px 10px;font-size:.68rem;font-weight:700;cursor:pointer;">🏦 Acumular</button>'+
        '</div>'+
        '</div>';
    }

    return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:12px;">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">'+
        '<div style="font-size:.62rem;color:'+GOLD+';letter-spacing:.1em;text-transform:uppercase;font-weight:700;">📋 '+periodoLabel+'</div>'+
        (f && f.salario ? '<div style="font-size:.6rem;color:'+T3+';">mensal: '+_fmtMoeda(parseFloat(f.salario))+'</div>' : '')+
      '</div>'+
      toggleHE +
      '<div style="margin-bottom:8px;margin-top:4px;">'+
        _linha(_dp.label+' (fixo)', sal, GOLD) +
        (he > 0 && incluirExtra  ? _linha('H. extras ('+_dp.di.slice(8)+' a '+_dp.df.slice(8)+') · '+(s.totalExtra||0).toFixed(1)+'h', he, '#e0b870') : '') +
        (he > 0 && !incluirExtra ? '<div style="display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);"><span style="font-size:.75rem;color:'+T3+';font-style:italic;">Extras ('+(s.totalExtra||0).toFixed(1)+'h) → banco 🏦</span><span style="font-size:.75rem;color:#8ec8f0;">'+_fmtMoeda(he)+'</span></div>' : '') +
        (acrEfetivo > 0.01 ? _linha('Acréscimo HE 2× / 3×', acrEfetivo, '#8ec8c8') : '') +
        (pago > 0  ? _linhaSubt('Já pago neste período', pago, RED) : '') +
      '</div>'+
      '<div style="background:rgba(0,0,0,.35);border-radius:10px;padding:11px 14px;'+
        'display:flex;justify-content:space-between;align-items:center;">'+
        '<div>'+
          '<div style="font-size:.62rem;color:'+T3+';margin-bottom:1px;">'+saldoIco+' '+saldoLabel+'</div>'+
          (saldo < -0.01 ? '<div style="font-size:.6rem;color:'+GREEN+';">Desconta no próximo pagamento</div>' : '')+
          (!incluirExtra && he > 0 ? '<div style="font-size:.6rem;color:#8ec8f0;">+'+_fmtMoeda(he)+' acumulado no banco</div>' : '')+
        '</div>'+
        '<div style="font-size:1.3rem;font-weight:800;color:'+saldoCor+';">'+
          _fmtMoeda(Math.abs(saldo))+
        '</div>'+
      '</div>'+
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // 13. SALVAR / FECHAR PAGAMENTO
  // ─────────────────────────────────────────────────────────────
  function _closePagamento(){ _closeOverlay('hrPagamento'); }

  // Gera o relatório de ponto PDF para o funcionário e período atual do modal
  function _gerarRelatorioPonto() {
    var selFunc = document.getElementById('pag_func');
    var funcId  = selFunc ? selFunc.value : null;
    if (!funcId) { _toast('⚠ Selecione um funcionário primeiro.'); return; }

    // Período: decêndio atual (1-10, 11-20, 21-fim)
    var hoje = new Date();
    var d = hoje.getDate(), ano = hoje.getFullYear(), mes = hoje.getMonth();
    var diDt, dfDt;
    if      (d <= 10) { diDt = new Date(ano, mes,  1); dfDt = new Date(ano, mes, 10); }
    else if (d <= 20) { diDt = new Date(ano, mes, 11); dfDt = new Date(ano, mes, 20); }
    else              { diDt = new Date(ano, mes, 21); dfDt = new Date(ano, mes + 1, 0); }

    var _fmt = function(dt) {
      return dt.getFullYear()+'-'+String(dt.getMonth()+1).padStart(2,'0')+'-'+String(dt.getDate()).padStart(2,'0');
    };
    var di = _fmt(diDt), df = _fmt(dfDt);

    if (typeof HR_RELATORIO_PONTO === 'undefined' || !HR_RELATORIO_PONTO.gerarPDF) {
      _toast('⚠ Módulo de relatório não carregado (app-relatorio-ponto.js).'); return;
    }
    HR_RELATORIO_PONTO.gerarPDF(funcId, di, df);
  }

  // ─────────────────────────────────────────────────────────────
  // Atalho: abre formulário de pagamento já com tipo=decendio,
  // data do próximo vencimento decendial e valor sugerido (sal÷3).
  // ─────────────────────────────────────────────────────────────
  function _pagarDecendioRapido(funcId, numDecHint){
    // numDecHint: se informado, força o decêndio selecionado (ex: vindo do card)
    // Se não informado, detecta o decêndio mais recente não pago do funcionário
    var hoje = new Date();
    var d = hoje.getDate(), ano = hoje.getFullYear(), mes = hoje.getMonth();

    // Descobre qual decêndio está em aberto (não pago) - verifica do mais recente
    var pags = getPagamentos();
    var funcs = getFuncionarios();
    var f = funcs[funcId] || {};
    var mesRef = _mesAno(0);
    var meusP = Object.values(pags).filter(function(p){
      return p.funcionarioId === funcId && p.data && p.data.slice(0,7) === mesRef;
    });
    var pagoPorDec = { 1:0, 2:0, 3:0 };
    meusP.forEach(function(p){
      var dp = parseInt(p.data.slice(8,10));
      if (dp <= 10)      pagoPorDec[1] += parseFloat(p.valor)||0;
      else if (dp <= 20) pagoPorDec[2] += parseFloat(p.valor)||0;
      else               pagoPorDec[3] += parseFloat(p.valor)||0;
    });
    var decValores = {
      1: parseFloat(f.dec1)||(parseFloat(f.salario)||0)/3,
      2: parseFloat(f.dec2)||(parseFloat(f.salario)||0)/3,
      3: parseFloat(f.dec3)||(parseFloat(f.salario)||0)/3
    };
    // Encontra decêndios vencidos e não pagos
    var decAberto = null;
    if (d >= 20 && pagoPorDec[2] < decValores[2] - 0.5) decAberto = 2;
    if (d >= 10 && pagoPorDec[1] < decValores[1] - 0.5) decAberto = decAberto || 1;
    // fallback: decêndio atual pelo dia
    var decNum = numDecHint || decAberto || (d <= 10 ? 1 : d <= 20 ? 2 : 3);

    // Data de vencimento do decêndio escolhido
    var dataAlvo;
    if      (decNum === 1) dataAlvo = new Date(ano, mes, 10);
    else if (decNum === 2) dataAlvo = new Date(ano, mes, 20);
    else                   dataAlvo = new Date(ano, mes + 1, 0);
    var isoAlvo = dataAlvo.toISOString().slice(0, 10);

    // Abre o formulário padrão (vai pré-selecionar _decInicial=2 se hoje>20)
    abrirFormPagamento(funcId);

    // Preenche e força o decêndio correto após renderizar
    setTimeout(function(){
      var selTipo  = document.getElementById('pag_tipo');
      var inpData  = document.getElementById('pag_data');
      var inpValor = document.getElementById('pag_valor');
      var dica     = document.getElementById('pag_dica_dec');

      if (selTipo) selTipo.value = 'decendio';
      if (inpData) inpData.value = isoAlvo;
      if (dica) dica.style.display = '';

      // Força seleção do decêndio correto
      if (HR_FUNC._selecionarDecendio) HR_FUNC._selecionarDecendio(decNum);
    }, 150);
  }

  function _salvarPagamento(){
    var funcId = (document.getElementById('pag_func')  || {}).value;
    var data   = (document.getElementById('pag_data')  || {}).value;
    var valor  = parseFloat((document.getElementById('pag_valor') || {}).value);
    var tipo   = (document.getElementById('pag_tipo')  || {}).value || 'decendio';
    var forma  = (document.getElementById('pag_forma') || {}).value || 'pix';
    var obs    = (document.getElementById('pag_obs')   || {}).value || '';

    if (!funcId) { _toast('Selecione um funcionário'); return; }
    if (!data)   { _toast('Informe a data');           return; }
    if (!valor || valor <= 0) { _toast('Valor inválido'); return; }

    var funcs = getFuncionarios();
    if (!funcs[funcId]) { _toast('Funcionário não encontrado'); return; }

    var t    = _TIPOS_PAG[tipo] || _TIPOS_PAG.outro;
    var pags = getPagamentos();
    var id   = genId();

    pags[id] = {
      id:            id,
      funcionarioId: funcId,
      data:          data,
      valor:         valor,
      tipo:          tipo,
      forma:         forma,
      obs:           obs,
      criadoEm:      new Date().toISOString()
    };
    savePagamentos(pags);

    // Ao registrar decêndio, quita os acréscimos HE pendentes do funcionário
    if (tipo === 'decendio') {
      var acrs = getAcrescimos();
      var quitados = 0;
      Object.keys(acrs).forEach(function(k){
        if (acrs[k].funcionarioId === funcId && acrs[k].status === 'pendente') {
          acrs[k].status = 'pago';
          acrs[k].pagoEm = data;
          quitados++;
        }
      });
      if (quitados > 0) saveAcrescimos(acrs);
    }

    _toast(t.icon + ' ' + t.label + ' de ' + _fmtMoeda(valor) + ' registrado!');
    _closePagamento();
    renderPaginaFuncionarios();

    // Oferecer notificação WhatsApp ao funcionário
    _ofereceNotificacaoPagamento(funcId, valor, tipo, data, obs);
  }

  // ─────────────────────────────────────────────────────────────
  // NOTIFICAÇÃO DE PAGAMENTO VIA WHATSAPP
  // ─────────────────────────────────────────────────────────────
  function _ofereceNotificacaoPagamento(funcId, valor, tipo, data, obs) {
    var funcs = getFuncionarios();
    var f = funcs[funcId];
    if (!f || !f.telefone) return; // Sem telefone, silencioso

    var tel = f.telefone.replace(/\D/g, '');
    if (tel.length < 10) return;

    var primeiroNome = f.nome.split(' ')[0];
    var t = _TIPOS_PAG[tipo] || _TIPOS_PAG.outro;

    // Calcula saldo após o pagamento — usa mês atual (já inclui pagamento recém salvo)
    var _nMesRef = _mesAno(0);
    var _nDi = _nMesRef + '-01';
    var _nUlt = new Date(parseInt(_nMesRef.slice(0,4)), parseInt(_nMesRef.slice(5,7)), 0);
    var _nDf = _nMesRef + '-' + String(_nUlt.getDate()).padStart(2,'0');
    var saldo = calcSaldoFuncionario(funcId, _nDi, _nDf);
    var saldoTexto;
    if (saldo.temCredito) {
      saldoTexto = '✅ Quitado (crédito de ' + _fmtMoeda(Math.abs(saldo.saldo)) + ' no próximo)';
    } else if (saldo.saldo < 0.50) {
      saldoTexto = '✅ Quitado';
    } else {
      saldoTexto = '⏳ Saldo restante: ' + _fmtMoeda(saldo.saldo);
    }

    // Período de referência legível
    var dataFmt = _fmtData(data);
    var hoje = new Date();
    var mesRef = data.slice(0, 7);
    var meses = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
    var periodoRef = meses[parseInt(mesRef.slice(5, 7)) - 1] + '/' + mesRef.slice(0, 4);

    // Monta mensagem
    var msg =
      'Olá ' + primeiroNome + '! 👋\n\n' +
      '💳 *Pagamento registrado — HR Mármores*\n\n' +
      '📌 Tipo: ' + t.label + '\n' +
      '💰 Valor: *' + _fmtMoeda(valor) + '*\n' +
      '📅 Data: ' + dataFmt + '\n' +
      '📆 Período: ' + periodoRef + '\n' +
      (obs ? '📝 Obs: ' + obs + '\n' : '') +
      '\n' + saldoTexto + '\n\n' +
      '_HR Mármores e Granitos — Pilão Arcado_';

    // Toast com botão de ação (aparece 400ms após o toast principal)
    setTimeout(function() {
      var elId = 'toast_wp_' + Date.now();
      var div = document.createElement('div');
      div.id = elId;
      div.style.cssText = [
        'position:fixed', 'bottom:80px', 'left:50%', 'transform:translateX(-50%)',
        'background:#0d1a0f', 'border:1.5px solid rgba(37,211,102,.4)',
        'color:#e8f5e9', 'border-radius:14px', 'padding:13px 16px',
        'font-family:Outfit,sans-serif', 'font-size:.83rem',
        'box-shadow:0 4px 24px rgba(0,0,0,.55)', 'z-index:99999',
        'display:flex', 'align-items:center', 'gap:12px',
        'max-width:calc(100vw - 32px)', 'animation:_fadeIn .25s ease'
      ].join(';');
      div.innerHTML =
        '<span style="flex:1;line-height:1.35;">📲 Notificar <b>' + primeiroNome + '</b> sobre o pagamento?</span>' +
        '<button onclick="(function(){' +
          'window.open(\'https://wa.me/55' + tel + '?text=\'+encodeURIComponent(' + JSON.stringify(msg) + '),\'_blank\');' +
          'document.getElementById(\'' + elId + '\').remove();' +
        '})()" style="padding:8px 14px;background:#25d366;border:none;border-radius:9px;' +
          'color:#fff;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap;">' +
          '💬 Enviar' +
        '</button>' +
        '<button onclick="document.getElementById(\'' + elId + '\').remove()" ' +
          'style="padding:8px 10px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);' +
          'border-radius:9px;color:rgba(255,255,255,.5);font-family:Outfit,sans-serif;font-size:.78rem;cursor:pointer;">' +
          '✕' +
        '</button>';
      document.body.appendChild(div);
      // Auto-remove após 12s
      setTimeout(function(){ if(div.parentNode) div.remove(); }, 12000);
    }, 400);
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
    var funcs    = getFuncionarios();
    var f        = funcs[funcId] || {nome:'?'};
    var pags     = getPagamentos();
    var meusPags = Object.values(pags)
      .filter(function(p){ return p.funcionarioId === funcId; })
      .sort(function(a,b){ return b.data.localeCompare(a.data); });
    var total = meusPags.reduce(function(s,p){ return s + (parseFloat(p.valor)||0); }, 0);

    // Acréscimos pendentes (HE 2× e 3× ainda não pagos)
    var acrsMap = getAcrescimos();
    var meusAcrs = Object.values(acrsMap)
      .filter(function(a){ return a.funcionarioId === funcId && a.status === 'pendente'; })
      .sort(function(a,b){ return b.data.localeCompare(a.data); });
    var totalPendente = meusAcrs.reduce(function(s,a){ return s+(parseFloat(a.valor)||0); },0);

    // Totais por tipo
    var porTipo = {};
    meusPags.forEach(function(p){
      var k = p.tipo || 'outro';
      porTipo[k] = (porTipo[k] || 0) + (parseFloat(p.valor) || 0);
    });

    var badgesTipo = Object.keys(porTipo).map(function(k){
      var t   = _TIPOS_PAG[k] || _TIPOS_PAG.outro;
      var val = porTipo[k];
      return '<div style="background:rgba(0,0,0,.3);border:1px solid rgba(255,255,255,.07);'+
        'border-radius:9px;padding:8px 12px;text-align:center;">'+
        '<div style="font-size:.88rem;margin-bottom:2px;">'+t.icon+'</div>'+
        '<div style="font-size:.7rem;font-weight:700;color:'+t.cor+';">'+_fmtMoeda(val)+'</div>'+
        '<div style="font-size:.58rem;color:'+T3+';margin-top:1px;">'+t.label+'</div>'+
      '</div>';
    }).join('');

    var listaHtml = meusPags.length === 0
      ? '<div style="text-align:center;color:'+T3+';padding:32px 0;font-size:.82rem;">Nenhum pagamento registrado</div>'
      : meusPags.map(function(p){
          var t    = _TIPOS_PAG[p.tipo] || _TIPOS_PAG.outro;
          var icoF = {dinheiro:'💵',pix:'📱',ted:'🏦',cheque:'📋',outro:'💳'}[p.forma] || '💳';
          return '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;'+
              'padding:12px 14px;margin-bottom:8px;">'+
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">'+
              '<div style="flex:1;min-width:0;">'+
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">'+
                  '<span style="font-size:.75rem;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.07);'+
                    'border-radius:5px;padding:1px 7px;color:'+t.cor+';font-weight:700;">'+
                    t.icon+' '+t.label+
                  '</span>'+
                  '<span style="font-size:.68rem;color:'+T3+';">'+icoF+' '+((p.forma||'').charAt(0).toUpperCase()+(p.forma||'').slice(1))+'</span>'+
                '</div>'+
                '<div style="font-size:.8rem;font-weight:600;color:'+T2+';">'+_fmtData(p.data)+'</div>'+
                (p.obs ? '<div style="font-size:.7rem;color:'+T3+';margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+
                  _esc(p.obs)+'</div>' : '')+
              '</div>'+
              '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">'+
                '<div style="font-size:.95rem;font-weight:800;color:'+t.cor+';white-space:nowrap;">'+
                  _fmtMoeda(p.valor)+
                '</div>'+
                '<button onclick="HR_FUNC._gerarComprovantePagamento(\''+p.id+'\')" '+
                  'style="padding:5px 10px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);'+
                  'border-radius:8px;color:'+GOLD+';font-family:Outfit,sans-serif;font-size:.68rem;'+
                  'font-weight:600;cursor:pointer;white-space:nowrap;">'+
                  '📄 PDF'+
                '</button>'+
              '</div>'+
            '</div>'+
          '</div>';
        }).join('');

    var html =
      '<div style="width:100%;max-width:500px;padding:0 16px;">'+
      _overlayHeader('Extrato de Pagamentos','📊 '+_esc(f.nome.split(' ')[0]),'HR_FUNC._closeExtrato()')+

      // KPI total
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;'+
        'padding:14px;margin-bottom:12px;text-align:center;">'+
        '<div style="font-size:.6rem;color:'+T3+';text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px;">Total pago</div>'+
        '<div style="font-size:1.5rem;font-weight:800;color:'+GREEN+';">'+_fmtMoeda(total)+'</div>'+
        '<div style="font-size:.68rem;color:'+T3+';margin-top:2px;">'+
          meusPags.length+' lançamento'+(meusPags.length !== 1 ? 's' : '')+
        '</div>'+
      '</div>'+

      // Breakdown por tipo
      (Object.keys(porTipo).length > 1
        ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px;margin-bottom:14px;">'+
            badgesTipo+
          '</div>'
        : '')+

      // Lista de lançamentos
      listaHtml+

      // Acréscimos pendentes — serão pagos no próximo decêndio
      (meusAcrs.length > 0
        ? '<div style="background:rgba(142,200,240,.06);border:1px solid rgba(142,200,240,.2);'+
            'border-radius:12px;padding:12px 14px;margin-bottom:12px;">'+
            '<div style="font-size:.6rem;color:#8ec8f0;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">'+
              '📌 Pendente — será pago no próximo decêndio'+
            '</div>'+
            meusAcrs.map(function(a){
              return '<div style="display:flex;justify-content:space-between;align-items:center;'+
                  'padding:7px 0;border-bottom:1px solid rgba(255,255,255,.04);">'+
                '<div>'+
                  '<div style="font-size:.78rem;font-weight:700;color:#8ec8f0;">'+_esc(a.label||a.tipo)+'</div>'+
                  '<div style="font-size:.68rem;color:'+T3+';">'+_fmtData(a.data)+' · '+_esc(a.periodo||'')+'</div>'+
                '</div>'+
                '<div style="font-size:.88rem;font-weight:800;color:#8ec8f0;">'+_fmtMoeda(a.valor)+'</div>'+
              '</div>';
            }).join('')+
            '<div style="display:flex;justify-content:space-between;align-items:center;padding-top:8px;">'+
              '<div style="font-size:.7rem;color:'+T3+';">Total pendente</div>'+
              '<div style="font-size:.88rem;font-weight:800;color:#8ec8f0;">'+_fmtMoeda(totalPendente)+'</div>'+
            '</div>'+
          '</div>'
        : '')+

      // Botão zerar
      '<button onclick="HR_FUNC._abrirZerarHistorico(\''+funcId+'\')" '+
        'style="width:100%;padding:11px;border-radius:10px;background:rgba(200,92,92,.07);'+
        'border:1px solid rgba(200,92,92,.25);color:'+RED+';font-family:Outfit,sans-serif;'+
        'font-size:.78rem;font-weight:600;cursor:pointer;margin-bottom:8px;">'+
        '🗑️ Zerar histórico financeiro'+
      '</button>'+
      '<button onclick="HR_FUNC._closeExtrato()" style="'+CSS_BTN_GHOST+'margin-top:4px;">Fechar</button>'+
    '</div>';

    _overlay('hrExtrato', html);
  }

  function _closeExtrato(){ _closeOverlay('hrExtrato'); }

  // ── Tela de limpeza seletiva ──────────────────────────────────
  function _abrirZerarHistorico(funcId) {
    var funcs = getFuncionarios();
    var f     = funcs[funcId] || {};
    var pags  = getPagamentos();
    var acrs  = getAcrescimos();
    var regs  = getRegistros();

    var mesAtual = _mesAno(0);

    // Contagens
    var nPags = Object.values(pags).filter(function(p){ return p.funcionarioId === funcId; }).length;
    var nAcrs = Object.values(acrs).filter(function(a){ return a.funcionarioId === funcId; }).length;
    var nRegsMeses = {};
    Object.values(regs).filter(function(r){ return r.funcionarioId === funcId; }).forEach(function(r){
      var m = r.data.slice(0,7);
      if (!nRegsMeses[m]) nRegsMeses[m] = 0;
      nRegsMeses[m]++;
    });
    var mesesAnteriores = Object.keys(nRegsMeses).filter(function(m){ return m < mesAtual; }).sort();

    var mesesOpts = mesesAnteriores.map(function(m){
      var p = m.split('-');
      var nomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      var label = nomes[parseInt(p[1])]+'/'+p[0]+' ('+nRegsMeses[m]+' registros)';
      return '<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;">'+
        '<input type="checkbox" id="zr_mes_'+m+'" checked style="width:16px;height:16px;accent-color:'+RED+';cursor:pointer;">'+
        '<span style="font-size:.8rem;color:'+T2+';">📅 Registros de ponto — '+label+'</span>'+
      '</label>';
    }).join('');

    var html = '<div style="width:100%;max-width:480px;padding:0 16px;">'+
      _overlayHeader('Zerar Histórico','🗑️ Limpeza — '+_esc(f.nome||''),'HR_FUNC._closeZerar()')+

      '<div style="background:rgba(200,92,92,.07);border:1px solid rgba(200,92,92,.25);border-radius:12px;'+
        'padding:12px 14px;margin-bottom:14px;font-size:.75rem;color:'+RED+';line-height:1.5;">'+
        '⚠️ Selecione o que deseja apagar. Esta ação <strong>não pode ser desfeita</strong>.'+
      '</div>'+

      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:12px 14px;margin-bottom:14px;">'+

        (nPags > 0
          ? '<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;">'+
              '<input type="checkbox" id="zr_pags" checked style="width:16px;height:16px;accent-color:'+RED+';cursor:pointer;">'+
              '<span style="font-size:.8rem;color:'+T2+';">💳 Pagamentos registrados ('+nPags+')</span>'+
            '</label>'
          : '<div style="font-size:.75rem;color:'+T3+';padding:6px 0;">Nenhum pagamento registrado.</div>')+

        (nAcrs > 0
          ? '<label style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;">'+
              '<input type="checkbox" id="zr_acrs" checked style="width:16px;height:16px;accent-color:'+RED+';cursor:pointer;">'+
              '<span style="font-size:.8rem;color:'+T2+';">⚡ Acréscimos HE ('+nAcrs+')</span>'+
            '</label>'
          : '')+

        (mesesOpts || '<div style="font-size:.75rem;color:'+T3+';padding:6px 0;">Sem registros de meses anteriores.</div>')+

      '</div>'+

      '<button onclick="HR_FUNC._confirmarZerar(\''+funcId+'\')" '+
        'style="width:100%;padding:14px;border-radius:11px;background:rgba(200,92,92,.12);'+
        'border:1.5px solid rgba(200,92,92,.5);color:'+RED+';font-family:Outfit,sans-serif;'+
        'font-size:.92rem;font-weight:700;cursor:pointer;margin-bottom:8px;">'+
        '🗑️ Apagar selecionados'+
      '</button>'+
      '<button onclick="HR_FUNC._closeZerar()" style="'+CSS_BTN_GHOST+'">Cancelar</button>'+
    '</div>';

    _overlay('hrZerarHistorico', html);
  }

  function _closeZerar(){ _closeOverlay('hrZerarHistorico'); }

  function _confirmarZerar(funcId) {
    var apagados = [];
    var mesAtual = _mesAno(0);

    // Pagamentos
    var elPags = document.getElementById('zr_pags');
    if (elPags && elPags.checked) {
      var pags = getPagamentos();
      var antes = Object.keys(pags).length;
      Object.keys(pags).forEach(function(k){
        if (pags[k].funcionarioId === funcId) delete pags[k];
      });
      savePagamentos(pags);
      apagados.push((antes - Object.keys(pags).length)+' pagamento(s)');
    }

    // Acréscimos HE
    var elAcrs = document.getElementById('zr_acrs');
    if (elAcrs && elAcrs.checked) {
      var acrs = getAcrescimos();
      var antes2 = Object.keys(acrs).length;
      Object.keys(acrs).forEach(function(k){
        if (acrs[k].funcionarioId === funcId) delete acrs[k];
      });
      saveAcrescimos(acrs);
      apagados.push((antes2 - Object.keys(acrs).length)+' acréscimo(s) HE');
    }

    // Registros de meses anteriores (checkboxes dinâmicos)
    var regs = getRegistros();
    var nRegsApagados = 0;
    Object.values(regs).filter(function(r){ return r.funcionarioId === funcId; }).forEach(function(r){
      var m = r.data.slice(0,7);
      if (m >= mesAtual) return; // pula mês atual
      var el = document.getElementById('zr_mes_'+m);
      if (el && el.checked) {
        delete regs[r.id];
        nRegsApagados++;
      }
    });
    if (nRegsApagados > 0) {
      saveRegistros(regs);
      apagados.push(nRegsApagados+' registro(s) de ponto');
    }

    _closeZerar();
    _closeOverlay('hrExtrato');

    if (apagados.length > 0) {
      _toast('✅ Apagado: '+apagados.join(', ')+'.');
    } else {
      _toast('Nada foi apagado.');
    }

    if (typeof renderPaginaFuncionarios === 'function') renderPaginaFuncionarios();
    setTimeout(function(){ HR_FUNC.abrirDetalhesFuncionario(funcId); }, 300);
  }

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

      // HE triplicada total (minutos) — dom/feriado/sáb tarde/ext (×3)
      var totalHE100Min=meusRegs.reduce(function(s,r){
        return s+(r.tipoExtra==='especial'||r.tipoExtra==='domingo'||r.tipoExtra==='feriado'?Math.round((parseFloat(r.extra)||0)*60):0);
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
        _statKpi('⚡','Com HE ×3',indicadores.filter(function(i){return i.totalHE100Min>0;}).length,'func.')+
        _statKpi('🏦','Banco ativo',indicadores.filter(function(i){return i.saldoBancoMin>0;}).length,'func.')+
      '</div>'+

      _rankCard('Mais Atrasos Acumulados',RED,topAtraso,'totalAtrasoMin',_fmtMin,'⏰')+
      _rankCard('Mais HE Triplicada (Dom/Fer/Sáb tarde)',BLUE,topHE100,'totalHE100Min',_fmtMin,'⚡')+
      _rankCard('Maior Saldo Banco de Horas',GOLD,topBanco,'saldoBancoMin',_fmtMin,'🏦')+
      _rankCard('Mais Inconsistências (Gaps)',RED,topInconsistencias,'alertas',function(v){return v+' alerta'+(v!==1?'s':'');},  '⚠️')+
      (topSuspeitas.length>0?_rankCard('Jornadas Suspeitas Recorrentes',RED,topSuspeitas,'jornadasSuspeitas',function(v){return v+'×';}, '🚨'):'<div style="text-align:center;color:'+T3+';font-size:.78rem;padding:12px;">✅ Nenhuma jornada suspeita recorrente</div>')+

      '<button onclick="window._hrFecharRisco()" style="'+CSS_BTN_GHOST+'margin-top:8px;">Fechar</button>'+
    '</div>';

    _overlay('hrRisco',html);
  }
  window._hrFecharRisco=function(){_closeOverlay('hrRisco');};

  // ══════════════════════════════════════════════════════════════
  // GESTÃO DE EXCEÇÕES — Feriados, Acordos e Dias Declarados
  // Exceções globais por data: afetam todos os funcionários.
  // Tipos:
  //   feriado  → dia não trabalhado, não conta como falta (saldo=0)
  //   acordo   → folga coletiva acordada (saldo=0)
  //   declarado → funcionário trabalhou sem bater ponto; usa horário padrão
  // ══════════════════════════════════════════════════════════════

  function abrirGestaoExcecoes(mesFiltro) {
    var mesAtual = _mesAno(0);
    var mesAnterior = _mesAno(-1);
    mesFiltro = mesFiltro || window._excMesFiltro || mesAtual;
    window._excMesFiltro = mesFiltro;

    var excs = getExcecoes();
    var lista = Object.values(excs)
      .filter(function(e){ return e.data.startsWith(mesFiltro); })
      .sort(function(a,b){ return a.data.localeCompare(b.data); });

    var TIPO_COR   = { feriado:'#8ec8f0', acordo:'#c88ef0', declarado:'#6fcca0' };
    var TIPO_BG    = { feriado:'rgba(92,150,220,.15)', acordo:'rgba(180,120,220,.15)', declarado:'rgba(60,180,120,.14)' };
    var TIPO_BD    = { feriado:'rgba(92,150,220,.3)', acordo:'rgba(180,120,220,.3)', declarado:'rgba(60,180,120,.3)' };
    var TIPO_LABEL = { feriado:'🔵 Feriado', acordo:'🟣 Acordo/Folga', declarado:'🟢 Declarado' };

    var fmtMes = function(m){
      var p=m.split('-'); var n=['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return n[parseInt(p[1])]+'/'+p[0];
    };

    var listaHtml = lista.length === 0
      ? '<div style="text-align:center;padding:28px 0;font-size:.82rem;color:'+T3+';">Nenhuma exceção em '+fmtMes(mesFiltro)+'</div>'
      : lista.map(function(e){
          var cor = TIPO_COR[e.tipo] || GOLD;
          var bg  = TIPO_BG[e.tipo]  || GOLD2;
          var bd  = TIPO_BD[e.tipo]  || GOLDB;
          return '<div style="background:'+bg+';border:1px solid '+bd+';border-radius:11px;'+
            'padding:11px 13px;margin-bottom:8px;display:flex;align-items:center;gap:10px;">'+
            '<div style="flex:1;min-width:0;">'+
              '<div style="font-size:.8rem;font-weight:700;color:'+T1+';">'+
                _fmtData(e.data)+' · '+['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'][new Date(e.data+'T12:00:00').getDay()]+
              '</div>'+
              '<div style="font-size:.7rem;color:'+cor+';margin-top:1px;">'+_esc(TIPO_LABEL[e.tipo]||e.tipo)+'</div>'+
              (e.descricao?'<div style="font-size:.68rem;color:'+T3+';margin-top:2px;">'+_esc(e.descricao)+'</div>':'')+
              (e.tipo==='declarado'&&e.horEntrada?'<div style="font-size:.65rem;color:'+T3+';margin-top:2px;">⏰ '+_esc(e.horEntrada)+' → '+_esc(e.horSaida||'—')+'</div>':'')+
            '</div>'+
            '<button onclick="HR_FUNC._excluirExcecao(\''+e.id+'\')" '+
              'style="background:rgba(200,92,92,.1);border:1px solid rgba(200,92,92,.3);color:'+RED+';'+
              'border-radius:7px;padding:6px 10px;font-size:.72rem;font-family:Outfit,sans-serif;cursor:pointer;flex-shrink:0;">'+
              '🗑</button>'+
          '</div>';
        }).join('');

    var html = '<div style="width:100%;max-width:520px;padding:0 16px;">'+
      _overlayHeader('Feriados & Exceções', '📅 Calendário de exceções — '+fmtMes(mesFiltro), 'HR_FUNC._closeExcecoes()')+

      // Seletor de mês
      '<div style="display:flex;gap:8px;margin-bottom:14px;">'+
        [mesAnterior, mesAtual].map(function(m){
          var on = m === mesFiltro;
          return '<button onclick="HR_FUNC.abrirGestaoExcecoes(\''+m+'\')" '+
            'style="flex:1;padding:9px;border-radius:9px;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;'+
            (on ? 'background:'+GOLD2+';border:1.5px solid '+GOLDB+';color:'+GOLD+';'
                : 'background:'+S2+';border:1px solid '+BD+';color:'+T3+';')+
            '">'+fmtMes(m)+'</button>';
        }).join('')+
      '</div>'+

      // Legenda de tipos
      '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:12px;padding:12px 14px;margin-bottom:14px;">'+
        '<div style="font-size:.6rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;">Tipos de Exceção</div>'+
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">'+
          '<div style="font-size:.72rem;color:#8ec8f0;text-align:center;padding:6px;background:rgba(92,150,220,.1);border-radius:8px;">🔵<br>Feriado<br><span style="font-size:.62rem;color:'+T3+';">Saldo = 0, não é falta</span></div>'+
          '<div style="font-size:.72rem;color:#c88ef0;text-align:center;padding:6px;background:rgba(180,120,220,.1);border-radius:8px;">🟣<br>Acordo<br><span style="font-size:.62rem;color:'+T3+';">Folga coletiva</span></div>'+
          '<div style="font-size:.72rem;color:#6fcca0;text-align:center;padding:6px;background:rgba(60,180,120,.1);border-radius:8px;">🟢<br>Declarado<br><span style="font-size:.62rem;color:'+T3+';">Trabalhou sem ponto</span></div>'+
        '</div>'+
      '</div>'+

      // Lista
      '<div style="font-size:.6rem;color:'+GOLD+';letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;">'+lista.length+' Exceção(ões) em '+fmtMes(mesFiltro)+'</div>'+
      listaHtml+

      // Botão adicionar
      '<button onclick="HR_FUNC._abrirFormExcecao()" '+
        'style="width:100%;margin-top:8px;padding:13px;border-radius:11px;'+
        'background:linear-gradient(135deg,#1c1600,#0d0b00);'+
        'border:1.5px solid '+GOLDB+';color:'+GOLD+';'+
        'font-family:Outfit,sans-serif;font-size:.9rem;font-weight:700;cursor:pointer;letter-spacing:.03em;">'+
        '+ Adicionar Exceção'+
      '</button>'+
      '<button onclick="HR_FUNC._closeExcecoes()" style="'+CSS_BTN_GHOST+'margin-top:6px;">Fechar</button>'+
    '</div>';

    _overlay('hrExcecoes', html);
  }

  window._hrFecharExcecoes = function(){ _closeOverlay('hrExcecoes'); };
  function _closeExcecoes(){ _closeOverlay('hrExcecoes'); }

  function _excluirExcecao(id){
    var excs = getExcecoes();
    var e = excs[id];
    if(!e) return;
    if(!confirm('Remover exceção de '+_fmtData(e.data)+'?')) return;
    delete excs[id];
    saveExcecoes(excs);
    abrirGestaoExcecoes(window._excMesFiltro);
    _toast('Exceção removida.');
  }

  function _abrirFormExcecao(data) {
    var hoje = _hoje();
    var html = '<div style="width:100%;max-width:480px;padding:0 16px;">'+
      _overlayHeader('Nova Exceção', '📅 Feriado, Folga ou Declarado', 'HR_FUNC._closeFormExcecao()')+

      _secao('Dia',
        _campo('Data', _inp('exc_data','date','',data||hoje))+
        _campo('Tipo',
          _sel('exc_tipo',[
            {v:'feriado',  l:'🔵 Feriado — não trabalhou, não é falta'},
            {v:'acordo',   l:'🟣 Acordo/Folga — folga coletiva combinada'},
            {v:'declarado',l:'🟢 Declarado — trabalhou sem bater ponto'}
          ],'feriado')
        )+
        _campo('Descrição (opcional)', _inp('exc_desc','text','Ex: Tiradentes, acordo verbal...',''))+
        '<div id="exc_horarios_wrap" style="display:none;">'+
          _grid2(
            _campo('Entrada', _inp('exc_hor_ent','time','07:00','07:00')),
            _campo('Saída',   _inp('exc_hor_sai','time','17:00','17:00'))
          )+
        '</div>'
      )+

      '<button onclick="HR_FUNC._salvarExcecao()" style="'+CSS_BTN_GOLD+'">💾 Salvar Exceção</button>'+
      '<button onclick="HR_FUNC._closeFormExcecao()" style="'+CSS_BTN_GHOST+'">Cancelar</button>'+
    '</div>';

    _overlay('hrFormExcecao', html);

    // Mostrar/ocultar campos de horário conforme tipo
    setTimeout(function(){
      var sel = document.getElementById('exc_tipo');
      var wrap = document.getElementById('exc_horarios_wrap');
      if(sel && wrap){
        sel.addEventListener('change', function(){
          wrap.style.display = (sel.value === 'declarado' || sel.value === 'acordo') ? '' : 'none';
        });
      }
    }, 80);
  }

  function _closeFormExcecao(){ _closeOverlay('hrFormExcecao'); }

  function _salvarExcecao(){
    var data  = (document.getElementById('exc_data')||{}).value||'';
    var tipo  = (document.getElementById('exc_tipo')||{}).value||'feriado';
    var desc  = (document.getElementById('exc_desc')||{}).value||'';
    var horEnt = (document.getElementById('exc_hor_ent')||{}).value||'07:00';
    var horSai = (document.getElementById('exc_hor_sai')||{}).value||'17:00';
    if(!data){ _toast('Informe a data'); return; }

    var excs = getExcecoes();

    // Verifica duplicata
    var dup = Object.values(excs).find(function(e){ return e.data===data && e.tipo===tipo; });
    if(dup && !confirm('Já existe uma exceção do tipo "'+tipo+'" em '+_fmtData(data)+'. Sobrescrever?')){ return; }
    if(dup) delete excs[dup.id];

    var id = genId();
    var exc = { id:id, data:data, tipo:tipo, descricao:desc, criadoEm:new Date().toISOString() };
    if(tipo === 'declarado' || tipo === 'acordo'){ exc.horEntrada = horEnt; exc.horSaida = horSai; }
    excs[id] = exc;
    saveExcecoes(excs);
    _closeFormExcecao();

    // Atualiza mês no filtro para o mês da exceção adicionada
    window._excMesFiltro = data.slice(0,7);
    abrirGestaoExcecoes(window._excMesFiltro);
    _toast('✓ Exceção registrada: '+TIPO_LABEL_MINI[tipo]+' em '+_fmtData(data));
  }

  var TIPO_LABEL_MINI = { feriado:'Feriado', acordo:'Acordo', declarado:'Declarado' };

  // ══════════════════════════════════════════════════════════════
  // Integrado ao HR_FUNC — não requer arquivo externo
  // ══════════════════════════════════════════════════════════════

  // ── Helpers de período ──
  function _mesAno(offset) {
    var d = new Date();
    d.setMonth(d.getMonth() + (offset || 0));
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function _hoje() {
    return new Date().toISOString().slice(0, 10);
  }

  // ── Cálculo genérico (multiplier = 2 ou 3) ──
  function _calcHEMulti(funcId, di, df, multiplier) {
    var funcs   = getFuncionarios();
    var regs    = getRegistros();
    var f       = funcs[funcId] || {};
    var salario = parseFloat(f.salario) || 0;

    // Fix: filtra apenas registros com HE a pagar (exclui banco e registros sem hora extra)
    var meusRegs = Object.values(regs).filter(function(r) {
      if (r.funcionarioId !== funcId) return false;
      if (di && r.data < di) return false;
      if (df && r.data > df) return false;
      if (r.destinoExtra === 'banco') return false;       // banco não entra no cálculo financeiro
      return parseFloat(r.extra) > 0;                    // só registros com HE real
    });

    var refMes = (di || (meusRegs.length > 0
      ? meusRegs.slice().sort(function(a,b){ return a.data.localeCompare(b.data); })[0].data
      : new Date().toISOString()
    )).slice(0, 7);

    var heResult;
    if (typeof HR_IMPORT !== 'undefined' && typeof HR_IMPORT.calcSaldoHE === 'function') {
      heResult = HR_IMPORT.calcSaldoHE(meusRegs, f, refMes);
    } else {
      var valorHoraFb  = salario / 220;
      var totalExtraFb = meusRegs.reduce(function(s, r) {
        return s + (parseFloat(r.extra) || 0); // banco já excluído no filtro acima
      }, 0);
      heResult = {
        valorHoraBase:    valorHoraFb,
        valorTotalExtras: totalExtraFb * valorHoraFb * _getMultNormal(),
        totalExtraHoras:  totalExtraFb
      };
    }

    // Fix: normaliza campos do heResult — compatível com contratos de retorno variados
    var totalHoras  = heResult.totalExtraHoras || heResult.totalHorasExtra || 0;
    var valorNormal = heResult.valorTotalExtras || heResult.valorTotalExtra || 0;
    var valorHora   = heResult.valorHoraBase    || (salario / 220);
    var valorMulti  = valorHora * multiplier * totalHoras;
    var acrescimo   = valorMulti - valorNormal;

    return {
      funcId: funcId, nome: f.nome || '',
      totalHorasExtra: totalHoras,
      valorHoraBase:   valorHora,
      valorNormal:     valorNormal,
      valorMulti:      valorMulti,
      acrescimo:       acrescimo,
      multiplier:      multiplier,
      di: di, df: df
    };
  }

  // ── Tela genérica (2× ou 3×) ──
  function _abrirTelaHEMulti(funcId, multiplier) {
    var funcs      = getFuncionarios();
    var mesAtual   = _mesAno(0);
    var mesAnterior = _mesAno(-1);
    var storeKey   = '_bonifMes' + multiplier;
    var periodoAtivo = window[storeKey] || mesAtual;

    var di = periodoAtivo + '-01';
    var ultimo = new Date(parseInt(periodoAtivo.slice(0,4)), parseInt(periodoAtivo.slice(5,7)), 0);
    var df = periodoAtivo + '-' + String(ultimo.getDate()).padStart(2,'0');

    var fmtMes = function(m) {
      var p = m.split('-');
      var nomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      return nomes[parseInt(p[1])] + '/' + p[0];
    };

    var isTriplo = multiplier === 3;
    var titulo   = isTriplo ? 'Bonificação HE 3×' : 'Horas Extras Duplicadas 2×';
    var emoji    = isTriplo ? '🏆' : '⚡⚡';
    var cor      = isTriplo ? GREEN : BLUE;
    var tipo     = isTriplo ? 'bonificacao_he3x' : 'he_duplicada_2x';
    var overlayId = isTriplo ? 'hrBonificacao3x' : 'hrDuplicada2x';
    var fecharFn  = isTriplo ? '_hrFecharBonif3x' : '_hrFecharDupl2x';

    var alvos;
    if (funcId) {
      var fAlvo = funcs[funcId];
      alvos = fAlvo ? [fAlvo] : [];
    } else {
      alvos = Object.values(funcs)
        .filter(function(f){ return f.ativo !== false; })
        .sort(function(a,b){ return a.nome.localeCompare(b.nome); });
    }

    var resultados = alvos.map(function(f){
      return _calcHEMulti(f.id, di, df, multiplier);
    }).filter(function(r){ return r.totalHorasExtra > 0; });

    var totalAcrescimo = resultados.reduce(function(s,r){ return s + r.acrescimo; }, 0);
    var totalValor     = resultados.reduce(function(s,r){ return s + r.valorMulti; }, 0);

    var seletorBtns = [mesAnterior, mesAtual].map(function(m){
      var on = m === periodoAtivo;
      return '<button onclick="window[\''+storeKey+'\']=\''+m+'\';HR_FUNC.'+(isTriplo?'abrirBonificacaoHE3x':'abrirHorasExtrasDuplicadas')+'('+(funcId?'\''+funcId+'\'':'null')+');" '+
        'style="flex:1;padding:9px;border-radius:9px;font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;'+
        (on
          ? 'background:rgba(92,150,220,.15);border:1.5px solid rgba(92,150,220,.5);color:'+cor+';'
          : 'background:'+S2+';border:1px solid '+BD+';color:'+T3+';')+
        '">'+fmtMes(m)+'</button>';
    }).join('');

    var tabelaLinhas = resultados.map(function(r, idx){
      return '<div style="display:grid;grid-template-columns:1fr 60px 80px 80px;gap:0;'+
        'padding:10px 14px;border-top:1px solid '+BD+';'+
        (idx%2===1?'background:rgba(255,255,255,.015);':'')+
        'align-items:center;">'+
        '<div>'+
          '<div style="font-size:.82rem;font-weight:600;color:'+T1+';">'+_esc(r.nome.split(' ').slice(0,2).join(' '))+'</div>'+
          '<div style="font-size:.63rem;color:'+T3+';">hora base: '+_fmtMoeda(r.valorHoraBase)+'</div>'+
        '</div>'+
        '<div style="text-align:right;font-size:.78rem;font-weight:700;color:'+GOLD+';">'+r.totalHorasExtra.toFixed(2)+'h</div>'+
        '<div style="text-align:right;font-size:.75rem;color:'+T2+';">'+_fmtMoeda(r.valorNormal)+'</div>'+
        '<div style="text-align:right;font-size:.82rem;font-weight:700;color:'+cor+';">'+_fmtMoeda(r.valorMulti)+'</div>'+
      '</div>';
    }).join('');

    var html = '<div style="width:100%;max-width:560px;padding:0 16px;">'+
      _overlayHeader(titulo, emoji+' '+titulo+' · '+fmtMes(periodoAtivo), 'window.'+fecharFn+'()')+
      '<div style="display:flex;gap:8px;margin-bottom:14px;">'+seletorBtns+'</div>'+
      '<div style="background:rgba(92,150,220,.06);border:1px solid rgba(92,150,220,.3);border-radius:12px;padding:12px 14px;margin-bottom:14px;">'+
        '<div style="font-size:.68rem;font-weight:700;color:'+cor+';margin-bottom:5px;">📋 REGRA</div>'+
        '<div style="font-size:.75rem;color:'+T2+';line-height:1.6;">'+
          'Todas as horas extras do período são pagas a <strong style="color:'+cor+';">'+multiplier+'× o valor da hora base</strong>.<br>'+
          'O acréscimo é a diferença entre o valor '+multiplier+'× e o valor normal já calculado.'+
        '</div>'+
      '</div>'+
      (resultados.length > 0
        ? '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;padding:14px;margin-bottom:14px;">'+
            '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">'+
              _miniKpi('Funcionários', resultados.length+' com HE', GOLD)+
              _miniKpi('Total Acréscimo', _fmtMoeda(totalAcrescimo), cor)+
            '</div>'+
            '<div style="background:rgba(0,0,0,.3);border-radius:9px;padding:10px;display:flex;justify-content:space-between;align-items:center;">'+
              '<span style="font-size:.75rem;color:'+T3+';">Total ('+multiplier+'×)</span>'+
              '<span style="font-size:1rem;font-weight:800;color:'+cor+';">'+_fmtMoeda(totalValor)+'</span>'+
            '</div>'+
          '</div>'
        : '<div style="text-align:center;padding:28px;color:'+T3+';font-size:.84rem;">😕 Nenhum funcionário com horas extras no período.</div>'
      )+
      (resultados.length > 0
        ? '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:13px;overflow:hidden;margin-bottom:14px;">'+
            '<div style="padding:8px 14px;background:rgba(92,150,220,.06);font-size:.6rem;color:'+cor+';letter-spacing:.08em;text-transform:uppercase;display:grid;grid-template-columns:1fr 60px 80px 80px;gap:0;">'+
              '<span>Funcionário</span><span style="text-align:right;">H. Extra</span><span style="text-align:right;">Normal</span><span style="text-align:right;">'+multiplier+'× Valor</span>'+
            '</div>'+tabelaLinhas+
          '</div>'+
          '<button onclick="HR_FUNC._confirmarHEMulti('+(funcId?'\''+funcId+'\'':'null')+',\''+periodoAtivo+'\','+multiplier+')" '+
            'style="'+CSS_BTN_GREEN+'">✅ Confirmar e Registrar '+titulo+'</button>'
        : ''
      )+
      '<button onclick="window.'+fecharFn+'()" style="'+CSS_BTN_GHOST+'">Cancelar</button>'+
    '</div>';

    _overlay(overlayId, html);
  }

  window._hrFecharBonif3x = function(){ _closeOverlay('hrBonificacao3x'); };
  window._hrFecharDupl2x  = function(){ _closeOverlay('hrDuplicada2x'); };

  function abrirBonificacaoHE3x(funcId)       { _abrirTelaHEMulti(funcId, 3); }
  function abrirHorasExtrasDuplicadas(funcId)  { _abrirTelaHEMulti(funcId, 2); }

  // ── Confirmar e gravar ──
  function _confirmarHEMulti(funcId, periodoAtivo, multiplier) {
    var di = periodoAtivo + '-01';
    var ultimo = new Date(parseInt(periodoAtivo.slice(0,4)), parseInt(periodoAtivo.slice(5,7)), 0);
    var df = periodoAtivo + '-' + String(ultimo.getDate()).padStart(2,'0');
    var isTriplo = multiplier === 3;
    var tipo     = isTriplo ? 'bonificacao_he3x' : 'he_duplicada_2x';
    var label    = isTriplo ? 'Bonificação 3×' : 'H. Extras 2×';

    var funcs = getFuncionarios();
    var acrs  = getAcrescimos();  // ← salva como acréscimo pendente, não como pagamento

    var alvos;
    if (funcId) {
      var fAlvo = funcs[funcId];
      alvos = fAlvo ? [fAlvo] : [];
    } else {
      alvos = Object.values(funcs).filter(function(f){ return f.ativo !== false; });
    }

    var gravados = 0;
    alvos.forEach(function(f){
      var r = _calcHEMulti(f.id, di, df, multiplier);
      if (r.totalHorasExtra <= 0) return;

      // Impede duplicata pendente no mesmo período
      var jaTem = Object.values(acrs).some(function(a){
        return a.funcionarioId === f.id && a.tipo === tipo &&
               a.periodo === periodoAtivo && a.status === 'pendente';
      });
      if (jaTem) {
        _toast('⚠️ '+f.nome.split(' ')[0]+' já tem '+label+' pendente para '+periodoAtivo);
        return;
      }

      var aid = genId();
      acrs[aid] = {
        id:            aid,
        funcionarioId: f.id,
        data:          _hoje(),
        // IMPORTANTE: valor = apenas o ACRÉSCIMO (diferença entre multiplier× e 1.5× normal).
        // O valorNormal (HE 1.5×) já está incluso em calcSaldoFuncionario via valorExtra.
        // Salvar valorMulti completo causaria dupla contagem na tela financeira.
        valor:         parseFloat(r.acrescimo.toFixed(2)),
        tipo:          tipo,
        periodo:       periodoAtivo,
        label:         label,
        descricao:     label+' — acréscimo de '+r.totalHorasExtra.toFixed(2)+'h extra · '+periodoAtivo,
        horasExtra:    r.totalHorasExtra,
        valorNormal:   parseFloat(r.valorNormal.toFixed(2)),
        valorMulti:    parseFloat(r.valorMulti.toFixed(2)),
        acrescimo:     parseFloat(r.acrescimo.toFixed(2)),
        status:        'pendente',   // vira 'pago' quando decêndio for registrado
        criadoEm:      new Date().toISOString()
      };
      gravados++;
    });

    saveAcrescimos(acrs);
    _closeOverlay(isTriplo ? 'hrBonificacao3x' : 'hrDuplicada2x');

    if (gravados > 0) {
      _toast((isTriplo?'🏆':'⚡⚡')+' '+label+' de '+gravados+' funcionário'+(gravados>1?'s':'')+' — será pago no próximo decêndio!');
      if (typeof renderPaginaFuncionarios === 'function') renderPaginaFuncionarios();
    } else {
      _toast('Nenhum registro gravado (verifique duplicidades ou HE zerada).');
    }
  }

  // ─────────────────────────────────────────────────────────────
  // COMPROVANTE DE PAGAMENTO — PDF
  // ─────────────────────────────────────────────────────────────
  function _carregarJsPDF(cb) {
    if (window.jspdf && window.jspdf.jsPDF) { cb(window.jspdf.jsPDF); return; }
    if (window.jsPDF) { cb(window.jsPDF); return; }
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = function() { cb((window.jspdf && window.jspdf.jsPDF) || window.jsPDF); };
    s.onerror = function() { _toast('❌ Erro ao carregar jsPDF. Verifique a internet.'); };
    document.head.appendChild(s);
  }

  function _gerarComprovantePagamento(pagId) {
    var pags  = getPagamentos();
    var p     = pags[pagId];
    if (!p) { _toast('Pagamento não encontrado.'); return; }

    var funcs = getFuncionarios();
    var f     = funcs[p.funcionarioId] || {};
    if (!f.nome) { _toast('Funcionário não encontrado.'); return; }

    _toast('⏳ Gerando comprovante...');
    _carregarJsPDF(function(JsPDF) {
      var doc   = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      var pW = 210, mL = 14, mR = 14, cW = pW - mL - mR;
      var y  = 18;

      // Dados da empresa
      var empNome  = (typeof CFG !== 'undefined' && CFG && CFG.emp && CFG.emp.nome)  || 'HR Mármores e Granitos';
      var empTel   = (typeof CFG !== 'undefined' && CFG && CFG.emp && CFG.emp.tel)   || '';
      var empCNPJ  = (typeof CFG !== 'undefined' && CFG && CFG.emp && CFG.emp.cnpj)  || '';
      var empCid   = (typeof CFG !== 'undefined' && CFG && CFG.emp && CFG.emp.cidade)|| 'Pilão Arcado — BA';

      // Tipo de pagamento
      var t    = _TIPOS_PAG[p.tipo] || _TIPOS_PAG.outro;
      var icoF = { dinheiro: 'Dinheiro', pix: 'PIX', ted: 'TED', cheque: 'Cheque', outro: 'Outro' }[p.forma] || 'Outro';

      // Mês de referência legível
      var mesRef   = (p.data || '').slice(0, 7);
      var meses    = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                      'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
      var periodoLabel = mesRef
        ? meses[(parseInt(mesRef.slice(5,7)) - 1)] + ' / ' + mesRef.slice(0,4)
        : '—';

      // Saldo atual do funcionário (geral)
      var saldo = calcSaldoFuncionario(p.funcionarioId, null, null);
      var saldoLabel, saldoCor;
      if (saldo.temCredito) {
        saldoLabel = 'Credito de ' + _fmtMoeda(Math.abs(saldo.saldo)) + ' (desconta no proximo)';
        saldoCor   = [92,184,92];
      } else if (saldo.saldo < 0.50) {
        saldoLabel = 'Quitado';
        saldoCor   = [92,184,92];
      } else {
        saldoLabel = 'Saldo restante: ' + _fmtMoeda(saldo.saldo);
        saldoCor   = [201,168,76];
      }

      // ── Cabeçalho ──────────────────────────────────────────────
      doc.setFillColor(12, 10, 3);
      doc.rect(0, 0, pW, 38, 'F');
      doc.setFillColor(201, 168, 76);
      doc.rect(0, 0, pW, 1.5, 'F');

      doc.setFont('helvetica', 'bold');   doc.setFontSize(14); doc.setTextColor(201, 168, 76);
      doc.text(empNome, mL, y);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(160, 150, 130);
      var infoEmp = [empCNPJ, empTel, empCid].filter(Boolean).join('  ·  ');
      if (infoEmp) doc.text(infoEmp, mL, y + 5);

      doc.setFont('helvetica', 'bold');   doc.setFontSize(11); doc.setTextColor(220, 210, 190);
      doc.text('COMPROVANTE DE PAGAMENTO', pW - mR, y, { align: 'right' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);  doc.setTextColor(140, 130, 110);
      doc.text('Emitido em: ' + _fmtData(new Date().toISOString().slice(0,10)), pW - mR, y + 5, { align: 'right' });
      doc.text('Ref.: ' + periodoLabel, pW - mR, y + 11, { align: 'right' });
      y = 46;

      // ── Card funcionário ───────────────────────────────────────
      doc.setFillColor(28, 24, 6);
      doc.roundedRect(mL, y, cW, 26, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');   doc.setFontSize(12); doc.setTextColor(201, 168, 76);
      doc.text(f.nome || '—', mL + 5, y + 9);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);  doc.setTextColor(170, 160, 140);
      doc.text((f.cargo || 'Funcionário'), mL + 5, y + 16);
      doc.setFont('helvetica', 'bold');   doc.setFontSize(8);  doc.setTextColor(150, 140, 120);
      doc.text('Salario base: ' + _fmtMoeda(f.salario || 0), mL + 5, y + 22);
      if (f.telefone) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(120, 110, 90);
        doc.text('Tel: ' + f.telefone, mL + cW / 2, y + 22);
      }
      y += 34;

      // ── Bloco principal — valor pago ───────────────────────────
      doc.setFillColor(16, 22, 8);
      doc.roundedRect(mL, y, cW, 34, 2, 2, 'F');
      doc.setDrawColor(92, 184, 92); doc.setLineWidth(0.4);
      doc.roundedRect(mL, y, cW, 34, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');   doc.setFontSize(8);  doc.setTextColor(120, 130, 120);
      doc.text('VALOR PAGO', mL + cW / 2, y + 8, { align: 'center' });
      doc.setFont('helvetica', 'bold');   doc.setFontSize(22); doc.setTextColor(92, 184, 92);
      doc.text(_fmtMoeda(p.valor), mL + cW / 2, y + 21, { align: 'center' });
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(100, 110, 100);
      doc.text('via ' + icoF + '  ·  ' + t.label, mL + cW / 2, y + 28, { align: 'center' });
      y += 42;

      // ── Tabela de discriminação ────────────────────────────────
      var linhas = [
        ['Tipo de pagamento', t.label],
        ['Data do pagamento', _fmtData(p.data)],
        ['Periodo de referencia', periodoLabel],
        ['Forma de pagamento', icoF],
        ['Salario base mensal', _fmtMoeda(f.salario || 0)],
        ['Total trabalhado (periodo)', _fmtMoeda(saldo.totalSalario)],
        ['Horas extras', _fmtMoeda(saldo.valorExtra)],
        ['Total bruto devido', _fmtMoeda(saldo.totalDevido)],
        ['Total ja pago (historico)', _fmtMoeda(saldo.totalPago)],
      ];
      if (p.obs) linhas.push(['Observacao', p.obs]);

      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(201, 168, 76);
      doc.text('DISCRIMINACAO DO PAGAMENTO', mL, y); y += 5;

      linhas.forEach(function(row, i) {
        if (i % 2 === 0) { doc.setFillColor(20, 17, 5); doc.rect(mL, y, cW, 7, 'F'); }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(130, 120, 100);
        doc.text(row[0], mL + 3, y + 5);
        doc.setFont('helvetica', 'bold'); doc.setTextColor(200, 190, 170);
        doc.text(String(row[1]), pW - mR - 3, y + 5, { align: 'right' });
        y += 7;
      });
      y += 6;

      // ── Status do saldo ────────────────────────────────────────
      doc.setFillColor(18, 18, 10);
      doc.roundedRect(mL, y, cW, 14, 2, 2, 'F');
      doc.setDrawColor(saldoCor[0], saldoCor[1], saldoCor[2]); doc.setLineWidth(0.35);
      doc.roundedRect(mL, y, cW, 14, 2, 2, 'S');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(saldoCor[0], saldoCor[1], saldoCor[2]);
      doc.text('STATUS: ' + saldoLabel, mL + cW / 2, y + 9, { align: 'center' });
      y += 22;

      // ── Rodapé ─────────────────────────────────────────────────
      doc.setDrawColor(201, 168, 76); doc.setLineWidth(0.3);
      doc.line(mL, y, pW - mR, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(100, 90, 70);
      doc.text('Documento gerado automaticamente pelo sistema HR Marmores e Granitos.', mL, y);
      doc.text('Este comprovante nao substitui recibo com assinatura quando exigido por lei.', mL, y + 4);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(130, 120, 90);
      doc.text(empNome + '  ·  ' + empCid, pW - mR, y, { align: 'right' });

      // ── Salva ──────────────────────────────────────────────────
      var nomeArq = 'comprovante_' + (f.nome || 'func').split(' ')[0].toLowerCase() +
                    '_' + (p.data || '').replace(/-/g,'') + '.pdf';
      doc.save(nomeArq);
      _toast('✅ Comprovante gerado!');
    });
  }

  // ─────────────────────────────────────────────────────────────
  // FALTAS E ADVERTÊNCIAS
  // ─────────────────────────────────────────────────────────────

  var _TIPOS_ADV = {
    falta_injust:  { label:'Falta injustificada',  icon:'🔴', cor:RED,    desconto:true  },
    falta_just:    { label:'Falta justificada',     icon:'🟡', cor:GOLD,   desconto:false },
    adv_verbal:    { label:'Advertência verbal',    icon:'🟠', cor:'#e07820', desconto:false },
    adv_escrita:   { label:'Advertência escrita',   icon:'📄', cor:'#e07820', desconto:false },
    suspensao:     { label:'Suspensão',             icon:'🚫', cor:RED,    desconto:true  },
    atraso:        { label:'Atraso',                icon:'⏱',  cor:GOLD,   desconto:false },
  };

  function abrirAdvertencias(funcId) {
    var funcs = getFuncionarios();
    var f     = funcs[funcId];
    if (!f) return;

    var advs  = getAdvertencias();
    var lista = Object.values(advs)
      .filter(function(a){ return a.funcionarioId === funcId; })
      .sort(function(a,b){ return b.data.localeCompare(a.data); });

    var totalDesconto = lista.reduce(function(s, a) {
      return s + (parseFloat(a.impacto) || 0);
    }, 0);

    var listaHtml = lista.length === 0
      ? '<div style="text-align:center;color:'+T3+';padding:28px 0;font-size:.82rem;">Nenhum registro ainda</div>'
      : lista.map(function(a) {
          var tp = _TIPOS_ADV[a.tipo] || { label:a.tipo, icon:'📌', cor:T2 };
          return '<div style="background:'+S2+';border:1px solid rgba(200,92,92,.15);border-radius:11px;padding:12px 14px;margin-bottom:8px;">'+
            '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">'+
              '<div style="flex:1;min-width:0;">'+
                '<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">'+
                  '<span style="font-size:.75rem;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.07);'+
                    'border-radius:5px;padding:1px 7px;color:'+tp.cor+';font-weight:700;">'+
                    tp.icon+' '+tp.label+
                  '</span>'+
                  '<span style="font-size:.7rem;color:'+T3+';">'+_fmtData(a.data)+'</span>'+
                '</div>'+
                '<div style="font-size:.8rem;color:'+T2+';margin-bottom:2px;">'+_esc(a.motivo||'—')+'</div>'+
                (a.testemunha ? '<div style="font-size:.7rem;color:'+T3+';">👤 Testemunha: '+_esc(a.testemunha)+'</div>' : '')+
                (parseFloat(a.impacto) > 0 ? '<div style="font-size:.7rem;color:'+RED+';margin-top:2px;">💸 Desconto: '+_fmtMoeda(a.impacto)+'</div>' : '')+
              '</div>'+
              '<button onclick="HR_FUNC._excluirAdvertencia(\''+a.id+'\',\''+funcId+'\')" '+
                'style="padding:6px 10px;background:rgba(200,92,92,.1);border:1px solid rgba(200,92,92,.25);'+
                'border-radius:8px;color:'+RED+';font-size:.7rem;cursor:pointer;flex-shrink:0;">🗑</button>'+
            '</div>'+
          '</div>';
        }).join('');

    var html =
      '<div style="width:100%;max-width:500px;padding:0 16px;">'+
      _overlayHeader('Faltas & Advertências','⚠️ '+_esc(f.nome.split(' ')[0]),'HR_FUNC._closeAdvertencias()')+

      // KPI
      (lista.length > 0
        ? '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px;">'+
            '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:12px;text-align:center;">'+
              '<div style="font-size:.6rem;color:'+T3+';text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;">Ocorrências</div>'+
              '<div style="font-size:1.4rem;font-weight:800;color:'+RED+';">'+lista.length+'</div>'+
            '</div>'+
            '<div style="background:'+S2+';border:1px solid '+BD+';border-radius:11px;padding:12px;text-align:center;">'+
              '<div style="font-size:.6rem;color:'+T3+';text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;">Desconto total</div>'+
              '<div style="font-size:1.1rem;font-weight:800;color:'+(totalDesconto>0?RED:GREEN)+';">'+_fmtMoeda(totalDesconto)+'</div>'+
            '</div>'+
          '</div>'
        : '')+

      // Botão novo registro
      '<button onclick="HR_FUNC.abrirFormAdvertencia(\''+funcId+'\')" style="'+CSS_BTN_GOLD+'margin-bottom:12px;">'+
        '+ Registrar Falta ou Advertência'+
      '</button>'+

      // Lista
      listaHtml+

      '<button onclick="HR_FUNC._closeAdvertencias()" style="'+CSS_BTN_GHOST+'margin-top:4px;">Fechar</button>'+
    '</div>';

    _overlay('hrAdvertencias', html);
  }

  function _closeAdvertencias() { _closeOverlay('hrAdvertencias'); }

  function abrirFormAdvertencia(funcId) {
    var funcs = getFuncionarios();
    var f     = funcs[funcId];
    if (!f) return;

    var hoje = _hoje();
    var salarioDia = (parseFloat(f.salario) || 0) / 30;

    var opsTipo = Object.keys(_TIPOS_ADV).map(function(k) {
      var t = _TIPOS_ADV[k];
      return '<option value="'+k+'">'+t.icon+' '+t.label+'</option>';
    }).join('');

    var html =
      '<div style="width:100%;max-width:460px;padding:0 16px;">'+
      _overlayHeader('Nova Ocorrência','⚠️ '+_esc(f.nome.split(' ')[0]),'HR_FUNC._closeFormAdvertencia()')+

      _campo('Tipo', '<select id="adv_tipo" onchange="HR_FUNC._advAtualizaImpacto()" style="'+CSS_INP+'">'+opsTipo+'</select>')+
      _campo('Data', '<input id="adv_data" type="date" value="'+hoje+'" style="'+CSS_INP+'">')+
      _campo('Motivo / Descrição', '<textarea id="adv_motivo" rows="3" placeholder="Descreva o ocorrido..." style="'+CSS_INP+'resize:vertical;"></textarea>')+
      _campo('Testemunha (opcional)', '<input id="adv_test" type="text" placeholder="Nome da testemunha" style="'+CSS_INP+'">')+
      '<div id="adv_bloco_impacto" style="margin-bottom:12px;">'+
        _campo('Impacto financeiro (R$)',
          '<input id="adv_impacto" type="number" step="0.01" min="0" placeholder="0,00" style="'+CSS_INP+'">'+
          '<div id="adv_dica_impacto" style="font-size:.7rem;color:'+T3+';margin-top:4px;">'+
            'Sugestão para 1 dia: '+_fmtMoeda(salarioDia)+
          '</div>')+
      '</div>'+

      '<button onclick="HR_FUNC._salvarAdvertencia(\''+funcId+'\')" style="'+CSS_BTN_GOLD+'">✅ Registrar</button>'+
      '<button onclick="HR_FUNC._closeFormAdvertencia()" style="'+CSS_BTN_GHOST+'">Cancelar</button>'+
    '</div>';

    _overlay('hrFormAdv', html);

    // Define impacto inicial conforme tipo padrão
    setTimeout(function(){ HR_FUNC._advAtualizaImpacto(); }, 100);
  }

  function _advAtualizaImpacto() {
    var selTipo   = document.getElementById('adv_tipo');
    var inpImpacto = document.getElementById('adv_impacto');
    var bloco     = document.getElementById('adv_bloco_impacto');
    if (!selTipo) return;
    var tipo = selTipo.value;
    var t    = _TIPOS_ADV[tipo] || {};
    if (bloco) bloco.style.display = t.desconto ? '' : 'none';
    // Se for falta injustificada, preenche com valor de 1 dia
    if (tipo === 'falta_injust' && inpImpacto && !parseFloat(inpImpacto.value)) {
      var funcs = getFuncionarios();
      // Tenta pegar funcId do form atual via overlay
      var overlayEl = document.getElementById('hrFormAdv');
      if (overlayEl) {
        var btn = overlayEl.querySelector('button[onclick*="_salvarAdvertencia"]');
        if (btn) {
          var m = btn.getAttribute('onclick').match(/'([^']+)'/);
          if (m) {
            var fId = m[1];
            var sal = parseFloat((funcs[fId]||{}).salario || 0);
            if (sal > 0) inpImpacto.value = (sal / 30).toFixed(2);
          }
        }
      }
    }
    if (tipo === 'suspensao' && inpImpacto && !parseFloat(inpImpacto.value)) {
      inpImpacto.value = '';
    }
  }

  function _salvarAdvertencia(funcId) {
    var tipo    = (document.getElementById('adv_tipo')    || {}).value;
    var data    = (document.getElementById('adv_data')    || {}).value;
    var motivo  = (document.getElementById('adv_motivo')  || {}).value || '';
    var test    = (document.getElementById('adv_test')    || {}).value || '';
    var impacto = parseFloat((document.getElementById('adv_impacto') || {}).value) || 0;

    if (!tipo)   { _toast('Selecione o tipo'); return; }
    if (!data)   { _toast('Informe a data');   return; }
    if (!motivo.trim()) { _toast('Descreva o motivo'); return; }

    var t    = _TIPOS_ADV[tipo] || _TIPOS_ADV.adv_verbal;
    var advs = getAdvertencias();
    var id   = genId();

    advs[id] = {
      id:            id,
      funcionarioId: funcId,
      tipo:          tipo,
      data:          data,
      motivo:        motivo.trim(),
      testemunha:    test.trim(),
      impacto:       t.desconto ? impacto : 0,
      criadoEm:      new Date().toISOString()
    };
    saveAdvertencias(advs);
    _toast(t.icon + ' ' + t.label + ' registrada!');
    _closeFormAdvertencia();
    abrirAdvertencias(funcId);
  }

  function _closeFormAdvertencia() { _closeOverlay('hrFormAdv'); }

  function _excluirAdvertencia(advId, funcId) {
    if (!confirm('Excluir este registro? A ação não pode ser desfeita.')) return;
    var advs = getAdvertencias();
    delete advs[advId];
    saveAdvertencias(advs);
    _toast('🗑 Registro removido.');
    abrirAdvertencias(funcId);
  }

  // ══════════════════════════════════════════════════════════════

  return{
    getFuncionarios:          getFuncionarios,
    getRegistros:             getRegistros,
    getPagamentos:            getPagamentos,
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
    _htmlProjecaoFolha:       _htmlProjecaoFolha,
    _closePagamento:          _closePagamento,
    _gerarRelatorioPonto:     _gerarRelatorioPonto,
    _pagarDecendioRapido:     _pagarDecendioRapido,
    _salvarPagamento:         _salvarPagamento,
    _ofereceNotificacaoPagamento: _ofereceNotificacaoPagamento,
    _gerarComprovantePagamento:   _gerarComprovantePagamento,
    // Faltas e Advertências
    abrirAdvertencias:            abrirAdvertencias,
    abrirFormAdvertencia:         abrirFormAdvertencia,
    _advAtualizaImpacto:          _advAtualizaImpacto,
    _salvarAdvertencia:           _salvarAdvertencia,
    _closeAdvertencias:           _closeAdvertencias,
    _closeFormAdvertencia:        _closeFormAdvertencia,
    _excluirAdvertencia:          _excluirAdvertencia,
    _closeHistorico:          _closeHistorico,
    _filtrarHistorico:        _filtrarHistorico,
    _histTab:                 _histTab,
    _apagarLote:              _apagarLote,
    _apagarTodosRegistros:    _apagarTodosRegistros,
    _closeExtrato:            _closeExtrato,
    _abrirZerarHistorico:     _abrirZerarHistorico,
    _closeZerar:              _closeZerar,
    _confirmarZerar:          _confirmarZerar,
    // Item 4 — Banco de horas
    calcSaldoBancoHoras:      calcSaldoBancoHoras,
    // Item 6 — Dashboard de risco
    abrirDashboardRisco:      abrirDashboardRisco,
    // Sistema de penalidades
    getOcorrenciasFuncionario: getOcorrenciasFuncionario,
    _verificarRegistrosIncompletos: _verificarRegistrosIncompletos,
    _removerPenalidade: _removerPenalidade,
    // Horas extras duplicadas (2×) e bonificação (3×)
    abrirHorasExtrasDuplicadas: abrirHorasExtrasDuplicadas,
    abrirBonificacaoHE3x:       abrirBonificacaoHE3x,
    _confirmarHEMulti:          _confirmarHEMulti,
    // Gestão de exceções (feriados, acordos, declarados)
    getExcecoes:           getExcecoes,
    abrirGestaoExcecoes:   abrirGestaoExcecoes,
    _closeExcecoes:        _closeExcecoes,
    _abrirFormExcecao:     _abrirFormExcecao,
    _closeFormExcecao:     _closeFormExcecao,
    _salvarExcecao:        _salvarExcecao,
    _excluirExcecao:       _excluirExcecao
  };
})();
