// ══════════════════════════════════════════════════════════════
// DASHBOARD — Tela inicial com resumo executivo
// ══════════════════════════════════════════════════════════════

function renderDashboard() {
  var el = document.getElementById('pg12');
  if (!el) return;
  _injectDashStyles();

  var hoje = td();
  var mes  = hoje.slice(0, 7);
  var agora = new Date();
  var hh = agora.getHours();
  var saudacao = hh < 12 ? 'Bom dia' : hh < 18 ? 'Boa tarde' : 'Boa noite';
  var nomeEmp = (CFG && CFG.emp && CFG.emp.nome) ? CFG.emp.nome.split(' ')[0] : 'chefe';

  // ── Dados financeiros do mês ──
  var recMes = (DB.t||[]).filter(function(t){ return t.type==='in' && (t.date||'').slice(0,7)===mes; })
    .reduce(function(s,t){ return s+(t.value||0); }, 0);
  var despMes = (DB.t||[]).filter(function(t){ return t.type==='out' && (t.date||'').slice(0,7)===mes; })
    .reduce(function(s,t){ return s+(t.value||0); }, 0);
  var pendentes = (DB.t||[]).filter(function(t){ return t.type==='pend'; });
  var pendVenc  = pendentes.filter(function(t){ return t.date && t.date < hoje; });
  var totPend   = pendentes.reduce(function(s,t){ return s+(t.value||0); }, 0);
  var fixos     = (CFG.fixos||[]).reduce(function(s,f){ return s+(f.v||0); }, 0);
  var vars      = (CFG.variaveis||[]).reduce(function(s,f){ return s+(f.v||0); }, 0);
  var proLaboreMes = (DB.t||[]).filter(function(t){ return t.type==='out' && t.isProLabore && (t.date||'').slice(0,7)===mes; })
    .reduce(function(s,t){ return s+(t.value||0); }, 0);
  var totalCustos = fixos + vars + proLaboreMes;
  var lucro     = recMes - despMes;
  var saldoLiq  = recMes + totPend - totalCustos;

  // ── Dados de produção ──
  var jobs      = DB.j || [];
  var emProd    = jobs.filter(function(j){ return !j.done; });
  var atrasados = emProd.filter(function(j){ return j.end && dDiff(j.end) < 0; });
  var urgentes  = emProd.filter(function(j){ return j.urgente; });
  var entrega3d = emProd.filter(function(j){ return j.end && dDiff(j.end) >= 0 && dDiff(j.end) <= 3; });
  var concluidos = jobs.filter(function(j){
    return j.done && j.start && j.start.slice(0,7) === mes;
  });

  // ── Inadimplência ──
  // Jobs NÃO concluídos com saldo > 0 e entrega atrasada há mais de 7 dias
  var inadimpAtivos = emProd.filter(function(j){
    var resto = (j.value||0) - (j.pago||0);
    return resto > 0 && j.end && dDiff(j.end) < -7;
  });
  // Jobs concluídos mas com saldo restante (entregou, não recebeu)
  var inadimpConcluidos = jobs.filter(function(j){
    var resto = (j.value||0) - (j.pago||0);
    return j.done && resto > 0.01;
  });
  var totalInadimplentes = inadimpAtivos.concat(inadimpConcluidos);
  var totalInadimpValor  = totalInadimplentes.reduce(function(s,j){ return s + ((j.value||0)-(j.pago||0)); }, 0);

  // ── Visitas ──
  var visitas = (_getV && _getV()) || [];
  var visitasHoje   = visitas.filter(function(v){ return v.status==='agendada' && v.date===hoje; });
  var visitasSemana = visitas.filter(function(v){
    return v.status==='agendada' && v.date > hoje && dDiff(v.date) <= 7;
  });

  // ── Saúde financeira ──
  var pctMes = totalCustos > 0 ? Math.min(100, Math.round((recMes/totalCustos)*100)) : 100;
  var sfColor = pctMes >= 130 ? 'var(--grn)' : pctMes >= 100 ? '#d4a017' : pctMes >= 70 ? '#e07820' : 'var(--red)';
  var sfEmoji = pctMes >= 130 ? '🟢' : pctMes >= 100 ? '🟡' : pctMes >= 70 ? '🟠' : '🔴';

  // ── Próxima entrega ──
  var proxEntrega = emProd
    .filter(function(j){ return j.end; })
    .sort(function(a,b){ return a.end.localeCompare(b.end); })[0];

  var h = '';

  // ══ ALERTAS ══
  var alertas = [];

  // ── Alerta de vencimento de decêndio (pagamentos pendentes) ──
  (function() {
    try {
      var funcs, pags;
      try { funcs = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch(e) { funcs = {}; }
      try { pags  = JSON.parse(localStorage.getItem('hr_pagamentos')  || '{}'); } catch(e) { pags  = {}; }
      var ativos = Object.values(funcs).filter(function(f){ return f.ativo !== false && !(f.periodicidade === 'quinzenal' && !f.socio); });
      if (!ativos.length) return;

      // Próximo vencimento de decêndio
      var agD  = parseInt(hoje.slice(8, 10));
      var agAno = parseInt(hoje.slice(0, 4));
      var agMes = parseInt(hoje.slice(5, 7)) - 1; // 0-indexed para Date
      var proxVenc, diasAte, labelVenc;
      if (agD < 10) {
        proxVenc = new Date(agAno, agMes, 10);
        labelVenc = '1º decêndio (dia 10)';
      } else if (agD < 20) {
        proxVenc = new Date(agAno, agMes, 20);
        labelVenc = '2º decêndio (dia 20)';
      } else {
        proxVenc = new Date(agAno, agMes + 1, 0); // último dia do mês
        labelVenc = '3º decêndio (dia ' + proxVenc.getDate() + ')';
      }
      diasAte = Math.round((proxVenc - new Date()) / 86400000);

      // Período do decêndio atual (início até proxVenc)
      var periodoInicio;
      if (agD < 10)       periodoInicio = hoje.slice(0, 7) + '-01';
      else if (agD < 20)  periodoInicio = hoje.slice(0, 7) + '-11';
      else                periodoInicio = hoje.slice(0, 7) + '-21';
      var periodoFim = proxVenc.toISOString().slice(0, 10);

      // Funcionários com saldo > R$0,50 no período atual
      var funcsPendentes = ativos.filter(function(f) {
        var meusPags = Object.values(pags).filter(function(p) {
          return p.funcionarioId === f.id &&
                 p.data >= periodoInicio &&
                 p.data <= periodoFim;
        });
        var totalPagoDecendio = meusPags.reduce(function(s, p){ return s + (parseFloat(p.valor) || 0); }, 0);
        // Usa dec1/dec2/dec3 configurado; fallback: salário ÷ 3
        var dec1 = parseFloat(f.dec1) || 0;
        var dec2 = parseFloat(f.dec2) || 0;
        var dec3 = parseFloat(f.dec3) || 0;
        var temDec = dec1 > 0 || dec2 > 0 || dec3 > 0;
        var devido;
        if (temDec) {
          if (agD < 10)      devido = dec1;
          else if (agD < 20) devido = dec2;
          else               devido = dec3;
        } else {
          devido = (parseFloat(f.salario) || 0) / 3;
        }
        return devido > 0 && totalPagoDecendio < devido - 0.50;
      });

      if (funcsPendentes.length === 0) return;

      var totalPendente = funcsPendentes.reduce(function(s, f) {
        var dec1 = parseFloat(f.dec1) || 0;
        var dec2 = parseFloat(f.dec2) || 0;
        var dec3 = parseFloat(f.dec3) || 0;
        var temDec = dec1 > 0 || dec2 > 0 || dec3 > 0;
        var devido;
        if (temDec) {
          if (agD < 10)      devido = dec1;
          else if (agD < 20) devido = dec2;
          else               devido = dec3;
        } else {
          devido = (parseFloat(f.salario) || 0) / 3;
        }
        return s + devido;
      }, 0);
      var nomes = funcsPendentes.slice(0, 3).map(function(f){ return f.nome.split(' ')[0]; }).join(', ');
      if (funcsPendentes.length > 3) nomes += ' e mais ' + (funcsPendentes.length - 3);

      var cor, icon;
      if (diasAte <= 0) {
        cor = 'var(--red)'; icon = '🔴';
      } else if (diasAte <= 2) {
        cor = '#e07820'; icon = '🟠';
      } else {
        cor = '#d4a017'; icon = '🟡';
      }

      var msgDias = diasAte <= 0
        ? 'Hoje é dia de pagamento!'
        : diasAte === 1 ? 'Amanhã vence o ' + labelVenc
        : 'Faltam ' + diasAte + ' dias — ' + labelVenc;

      alertas.push({
        cor:  cor,
        icon: icon,
        msg:  msgDias + ' · ' + funcsPendentes.length + ' func. pendente' + (funcsPendentes.length > 1 ? 's' : '') +
              ': ' + nomes + ' · Total: R$\u00a0' + parseFloat(totalPendente).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}),
        fn:   'go(30)', dias: diasAte, folha: true
      });
    } catch(e) { /* silencioso */ }
  })();

  // ── Alerta de vencimento quinzenal (funcionários com periodicidade quinzenal) ──
  (function() {
    try {
      var funcs, pags;
      try { funcs = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch(e) { funcs = {}; }
      try { pags  = JSON.parse(localStorage.getItem('hr_pagamentos')  || '{}'); } catch(e) { pags  = {}; }
      var qs = Object.values(funcs).filter(function(f){ return f.ativo !== false && !f.socio && f.periodicidade === 'quinzenal'; });
      if (!qs.length) return;

      var agD   = parseInt(hoje.slice(8, 10));
      var agAno = parseInt(hoje.slice(0, 4));
      var agMes = parseInt(hoje.slice(5, 7)) - 1;
      var proxVenc, labelVenc, periodoInicio;
      if (agD <= 15) {
        proxVenc = new Date(agAno, agMes, 15);
        labelVenc = '1ª quinzena (dia 15)';
        periodoInicio = hoje.slice(0, 7) + '-01';
      } else {
        proxVenc = new Date(agAno, agMes + 1, 0);
        labelVenc = '2ª quinzena (dia ' + proxVenc.getDate() + ')';
        periodoInicio = hoje.slice(0, 7) + '-16';
      }
      var diasAte = Math.round((proxVenc - new Date()) / 86400000);
      var periodoFim = proxVenc.toISOString().slice(0, 10);

      function devidoQ(f) {
        var v = agD <= 15 ? (parseFloat(f.dec1) || 0) : (parseFloat(f.dec2) || 0);
        return v > 0 ? v : (parseFloat(f.salario) || 0) / 2;
      }
      var pend = qs.filter(function(f) {
        var pago = Object.values(pags).filter(function(p){
          return p.funcionarioId === f.id && p.data >= periodoInicio && p.data <= periodoFim;
        }).reduce(function(s, p){ return s + (parseFloat(p.valor) || 0); }, 0);
        var dv = devidoQ(f);
        return dv > 0 && pago < dv - 0.50;
      });
      if (!pend.length) return;

      var total = pend.reduce(function(s, f){ return s + devidoQ(f); }, 0);
      var nomes = pend.slice(0, 3).map(function(f){ return f.nome.split(' ')[0]; }).join(', ');
      if (pend.length > 3) nomes += ' e mais ' + (pend.length - 3);
      var cor, icon;
      if (diasAte <= 0)      { cor = 'var(--red)'; icon = '🔴'; }
      else if (diasAte <= 2) { cor = '#e07820';    icon = '🟠'; }
      else                   { cor = '#d4a017';    icon = '🟡'; }
      var msgDias = diasAte <= 0 ? 'Hoje é dia de pagamento!'
        : diasAte === 1 ? 'Amanhã vence a ' + labelVenc
        : 'Faltam ' + diasAte + ' dias — ' + labelVenc;
      alertas.push({
        cor: cor, icon: icon,
        msg: msgDias + ' · ' + pend.length + ' func. quinzenal pendente' + (pend.length > 1 ? 's' : '') +
             ': ' + nomes + ' · Total: R$\u00a0' + parseFloat(total).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2}),
        fn: 'go(30)', dias: diasAte, folha: true
      });
    } catch(e) { /* silencioso */ }
  })();

  // ══════════ NOVA HOME — MESA DE TRABALHO ══════════
  _injectHomeStyles();
  var emp = (CFG && CFG.emp) || {};
  var pctReal = totalCustos > 0 ? Math.round((recMes / totalCustos) * 100) : 0;
  var faltaCobrir = Math.max(0, totalCustos - recMes);

  var _diasDesde = function(dt){ return dt ? Math.max(0, -dDiff(dt)) : null; };
  var _quando = function(n){ return n === 0 ? 'hoje' : n === 1 ? 'ontem' : 'há ' + n + 'd'; };
  // ── Orçamentos aguardando resposta (últimos 45 dias) ──
  var orcPendAll = (DB.q || []).filter(function(q){
    var st = q.status === 'aprovado' ? 'aceito' : (q.status || 'pendente');
    return st === 'pendente';
  });
  var orcPend = orcPendAll.filter(function(q){ return q.date && -dDiff(q.date) <= 45; })
    ;
  var _priOrc = function(q){
    var id = _diasDesde(q.date), fu = _diasDesde(q._followUp);
    return (id >= 2 && (fu === null || fu >= 3)) ? 1 : 0;
  };
  orcPend.sort(function(a,b){ return (_priOrc(b) - _priOrc(a)) || (b.date||'').localeCompare(a.date||''); });
  var orcAcompanhar = orcPend.filter(_priOrc).length;
  var orcPendTotal = orcPend.reduce(function(s,q){ return s + (q.parc || q.vista || 0); }, 0);

  // ── Boletos a pagar ──
  var amanhaDt = (function(){ var d = new Date(); d.setDate(d.getDate()+1); return d.toISOString().slice(0,10); })();
  var bolVenc = (DB.b||[]).filter(function(b){ return b.tipo==='pagar' && (b.status==='vencido' || (b.status==='pendente' && b.venc && b.venc < hoje)); });
  var bolHoje = (DB.b||[]).filter(function(b){ return b.tipo==='pagar' && b.status==='pendente' && b.venc === hoje; });
  var bolAmanha = (DB.b||[]).filter(function(b){ return b.tipo==='pagar' && b.status==='pendente' && b.venc === amanhaDt; });
  var d7 = (function(){ var d = new Date(); d.setDate(d.getDate()+7); return d.toISOString().slice(0,10); })();
  var bol7 = (DB.b||[]).filter(function(b){ return b.tipo==='pagar' && b.status==='pendente' && b.venc > amanhaDt && b.venc <= d7; });
  var somaB = function(a){ return a.reduce(function(s,b){ return s + (b.valor||0); }, 0); };

  // ── Avisos do dia (só o que exige ação hoje) ──
  var avisos = [];
  if (bolVenc.length)   avisos.push({ cor:'var(--red)', icon:'🧾', msg: bolVenc.length + ' boleto(s) vencido(s) — R$ ' + _dashFmShort(somaB(bolVenc)), fn:"go(4);setTimeout(function(){finTab('boletos')},200)" });
  if (bolHoje.length)   avisos.push({ cor:'#e07820', icon:'🧾', msg: bolHoje.length + ' boleto(s) vence(m) HOJE — R$ ' + _dashFmShort(somaB(bolHoje)), fn:"go(4);setTimeout(function(){finTab('boletos')},200)" });
  if (bolAmanha.length) avisos.push({ cor:'#d4a017', icon:'🧾', msg: bolAmanha.length + ' boleto(s) vence(m) amanhã — R$ ' + _dashFmShort(somaB(bolAmanha)), fn:"go(4);setTimeout(function(){finTab('boletos')},200)" });
  if (bol7.length)      avisos.push({ cor:'var(--t3)', icon:'🗓️', msg: 'A pagar nos próximos 7 dias: ' + bol7.length + ' boleto(s) — R$ ' + _dashFmShort(somaB(bol7)), fn:"go(4);setTimeout(function(){finTab('boletos')},200)" });
  alertas.filter(function(a){ return a.folha && a.dias <= 5; }).forEach(function(a){ avisos.push(a); });
  if (pendVenc.length)  avisos.push({ cor:'#e07820', icon:'💸', msg: 'R$ ' + _dashFmShort(pendVenc.reduce(function(s,t){ return s+(t.value||0); },0)) + ' em lançamentos a receber vencidos', fn:"go(4);setTimeout(function(){finTab('areceber')},200)" });
  var semEntrada = emProd.filter(function(j){ return (j.value||0) > 0 && (j.pago||0) < (j.value||0) * 0.5 && !j.done; });
  if (semEntrada.length) {
    var nomesSE = semEntrada.slice(0,2).map(function(j){ return _dashPrimeiroNome(j.cli); }).join(', ');
    avisos.push({ cor:'#d4a017', icon:'💵', msg: semEntrada.length + ' job(s) em produção sem a entrada de 50% — ' + escH(nomesSE) + (semEntrada.length > 2 ? ' e +' + (semEntrada.length - 2) : ''), fn:'go(3)' });
  }
  if (visitasHoje.length) avisos.push({ cor:'#60a5fa', icon:'📐', msg: visitasHoje.length + ' visita(s) hoje — ' + visitasHoje.map(function(v){ return v.cli+(v.hora?' às '+v.hora:''); }).join(', '), fn:'go(11)' });

  var h = '';

  // ══ TOPO: saudação + mês em uma linha ══
  h += '<div class="hm-top">';
  h += '<div class="hm-top-row"><div><div class="hm-saud">' + saudacao + ', <span>' + escH(nomeEmp) + '</span></div>';
  h += '<div class="hm-data">' + agora.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'}) + '</div></div></div>';
  h += '<div class="hm-mes" onclick="go(4)">';
  h += '<div><small>Entrou</small><b style="color:var(--grn);">R$ ' + _dashFmShort(recMes) + '</b></div>';
  h += '<div><small>Saiu</small><b style="color:var(--red);">R$ ' + _dashFmShort(despMes) + '</b></div>';
  h += '<div><small>Resultado</small><b style="color:' + (lucro>=0?'var(--grn)':'var(--red)') + ';">' + (lucro>=0?'+':'') + 'R$ ' + _dashFmShort(lucro) + '</b></div>';
  h += '</div>';
  h += '<div class="hm-eq">' + (faltaCobrir > 0
        ? '⚠️ Faltam R$ ' + _dashFmShort(faltaCobrir) + ' pra cobrir os custos do mês (' + pctReal + '%)'
        : '✅ Custos do mês já cobertos (R$ ' + _dashFmShort(totalCustos) + ')') + '</div>';
  var recHoje = 0, despHoje = 0;
  (DB.t || []).forEach(function(t){
    if (t.date !== hoje) return;
    if (t.type === 'in') recHoje += (t.value || 0);
    else if (t.type === 'out') despHoje += (t.value || 0);
  });
  h += '<div class="hm-eq" style="margin-top:4px;">Hoje: ' + (recHoje || despHoje
        ? '<span style="color:var(--grn);">+R$ ' + _dashFmShort(recHoje) + '</span> · <span style="color:var(--red);">−R$ ' + _dashFmShort(despHoje) + '</span>'
        : 'nenhum lançamento ainda') + '</div>';
  h += '</div>';

  // ══ LANÇAR RÁPIDO ══
  h += '<div class="hm-quick">';
  h += '<button onclick="openFin(\'out\')"><span>➖</span>Despesa</button>';
  h += '<button onclick="openFin(\'in\')"><span>➕</span>Entrada</button>';
  h += '<button onclick="go(1)"><span>💰</span>Orçamento</button>';
  h += '<button onclick="go(11)"><span>🤖</span>Secretária</button>';
  h += '</div>';

  // ══ AVISOS ══
  if (avisos.length) {
    h += '<div class="dash-alertas" style="margin-top:12px;">';
    avisos.forEach(function(a) {
      h += '<div class="dash-alerta" style="border-left-color:' + a.cor + ';" onclick="' + a.fn.replace(/"/g,'&quot;') + '">';
      h += '<span style="font-size:1.1rem;">' + a.icon + '</span>';
      h += '<span class="dash-alerta-msg">' + a.msg + '</span>';
      h += '<span class="dash-alerta-arr" style="color:' + a.cor + ';">→</span></div>';
    });
    h += '</div>';
  }

  // ══ COBRAR ══
  var _priCob = function(j){ var c = _diasDesde(j._cobrancaEm); return (c === null || c >= 2) ? 1 : 0; };
  var cobrar = totalInadimplentes.slice().sort(function(a,b){
    return (_priCob(b) - _priCob(a)) || (((b.value||0)-(b.pago||0)) - ((a.value||0)-(a.pago||0)));
  });
  h += '<div class="hm-sec"><span>💰 Cobrar</span>' + (cobrar.length ? '<b style="color:var(--red);">R$ ' + _dashFmShort(totalInadimpValor) + ' · ' + cobrar.length + '</b>' : '') + '</div>';
  if (!cobrar.length) {
    h += '<div class="hm-empty">✅ Ninguém te devendo agora</div>';
  } else {
    h += '<div class="hm-card">';
    cobrar.slice(0, 4).forEach(function(j) {
      var resto = (j.value||0) - (j.pago||0);
      var atraso = j.end ? Math.abs(Math.min(0, dDiff(j.end))) : 0;
      var sit = j.done ? '<span style="color:#f0a500;">entregue</span>' : '<span style="color:var(--red);">' + (atraso ? atraso + 'd de atraso' : 'em aberto') + '</span>';
      h += '<div class="hm-row"><div class="hm-row-main"><div class="hm-cli">' + escH(j.cli||'') + '</div>';
      h += '<div class="hm-sub">' + escH(j.desc||'') + ' · ' + sit + (j._cobrancaEm ? ' · 📲 ' + _quando(_diasDesde(j._cobrancaEm)) : '') + '</div></div>';
      h += '<div class="hm-row-r"><div class="hm-val" style="color:var(--red);">R$ ' + _dashFmShort(resto) + '</div>';
      h += '<div class="hm-btns"><button class="hm-b hm-zap" onclick="event.stopPropagation();_dashZapCobrar(' + j.id + ')">WhatsApp</button>';
      h += '<button class="hm-b" onclick="event.stopPropagation();_inadimpReceberJob(' + j.id + ')">Recebi</button></div></div></div>';
    });
    if (cobrar.length > 4) h += '<div class="hm-more" onclick="_showInadimpModal()">+ ver todos os ' + cobrar.length + ' →</div>';
    h += '</div>';
  }

  // ══ ORÇAMENTOS AGUARDANDO ══
  h += '<div class="hm-sec"><span>📋 Orçamentos esperando resposta</span>' + (orcPend.length ? '<b style="color:var(--gold2);">' + (orcAcompanhar ? orcAcompanhar + ' pra acompanhar · ' : '') + 'R$ ' + _dashFmShort(orcPendTotal) + '</b>' : '') + '</div>';
  if (!orcPend.length) {
    h += '<div class="hm-empty">Nenhum orçamento pendente nos últimos 45 dias</div>';
  } else {
    h += '<div class="hm-card">';
    orcPend.slice(0, 5).forEach(function(q) {
      var idade = Math.max(0, -dDiff(q.date));
      var bcor = idade <= 2 ? 'var(--grn)' : idade <= 7 ? '#d4a017' : 'var(--red)';
      var blbl = idade === 0 ? 'hoje' : idade === 1 ? 'ontem' : 'há ' + idade + 'd';
      var extra = idade > 7 ? ' · esfriando' : '';
      var fuD = _diasDesde(q._followUp);
      var fuTxt = fuD !== null ? ' · 📲 ' + _quando(fuD) : '';
      h += '<div class="hm-row"><div class="hm-row-main"><div class="hm-cli">' + escH(q.cli||'Sem nome') + '</div>';
      h += '<div class="hm-sub">' + escH((q.tipo||'') + (q.mat ? ' · ' + q.mat : '')) + ' · <span style="color:' + bcor + ';font-weight:700;">' + blbl + extra + '</span>' + fuTxt + '</div></div>';
      h += '<div class="hm-row-r"><div class="hm-val" style="color:var(--gold2);">R$ ' + _dashFmShort(q.parc || q.vista || 0) + '</div>';
      h += '<div class="hm-btns"><button class="hm-b hm-zap" onclick="event.stopPropagation();_dashZapOrc(\'' + q.id + '\')">WhatsApp</button>';
      h += '<button class="hm-b hm-ok" onclick="event.stopPropagation();_dashOrcAceito(\'' + q.id + '\')">✅</button>';
      h += '<button class="hm-b" onclick="event.stopPropagation();_dashOrcPerdido(\'' + q.id + '\')">❌</button></div></div></div>';
    });
    h += '<div class="hm-more" onclick="_orcStatusFilter=\'pendente\';go(7)">' + (orcPendAll.length > 5 ? '+ ver todos (' + orcPendAll.length + ' pendentes) →' : 'abrir histórico →') + '</div>';
    h += '</div>';
  }

  // ══ SEMANA: produção + entregas + visitas ══
  var semana = [];
  emProd.forEach(function(j){
    if (!j.end) return;
    var df = dDiff(j.end);
    if (df <= 7) semana.push({ ord: df, tipo:'entrega', cli:j.cli, desc:j.desc, df:df });
  });
  visitasHoje.concat(visitasSemana).forEach(function(v){
    semana.push({ ord: dDiff(v.date), tipo:'visita', cli:v.cli, desc:'Visita' + (v.hora ? ' às ' + v.hora : ''), df:dDiff(v.date) });
  });
  semana.sort(function(a,b){ return a.ord - b.ord; });
  h += '<div class="hm-sec"><span>🔨 Semana</span><b style="color:var(--t3);">' + emProd.length + ' em produção' + (atrasados.length ? ' · <span style="color:var(--red);">' + atrasados.length + ' atrasado(s)</span>' : '') + '</b></div>';
  if (!semana.length) {
    h += '<div class="hm-empty">Nada marcado pros próximos 7 dias</div>';
  } else {
    h += '<div class="hm-card">';
    semana.slice(0, 6).forEach(function(it) {
      var df = it.df;
      var lbl = df < 0 ? Math.abs(df) + 'd atrasado' : df === 0 ? 'HOJE' : df === 1 ? 'AMANHÃ' : 'em ' + df + 'd';
      var cor = df < 0 ? 'var(--red)' : df <= 1 ? '#fb923c' : df <= 3 ? '#d4a017' : 'var(--grn)';
      h += '<div class="hm-row" onclick="go(' + (it.tipo === 'visita' ? 11 : 3) + ')"><div class="hm-row-main"><div class="hm-cli">' + (it.tipo === 'visita' ? '📐 ' : '🚚 ') + escH(it.cli||'') + '</div>';
      h += '<div class="hm-sub">' + escH(it.desc||'') + '</div></div>';
      h += '<div class="dash-entrega-badge" style="background:' + cor + '18;color:' + cor + ';">' + lbl + '</div></div>';
    });
    if (semana.length > 6) h += '<div class="hm-more" onclick="go(3)">+ ' + (semana.length - 6) + ' na agenda →</div>';
    h += '</div>';
  }

  // ══ NÚMEROS (recolhido) ══
  h += '<details class="hm-det"><summary>📈 Números dos últimos 6 meses</summary>';
  h += _dashGraficoReceita(hoje);
  h += _dashGraficoCustoEquipe(hoje);
  h += '</details>';

  h += '<div style="height:96px;"></div>';

  el.innerHTML = '<div class="dash-wrap">' + h + '</div>';
}

// ── Helpers da nova home ──
function _dashTelCli(nome) {
  var n = String(nome || '').trim().toLowerCase();
  if (!n) return '';
  var j = (DB.j || []).find(function(x){ return x.tel && String(x.cli||'').trim().toLowerCase() === n; });
  if (j) return String(j.tel).replace(/\D/g, '');
  var q = (DB.q || []).find(function(x){ return x.tel && String(x.cli||'').trim().toLowerCase() === n; });
  return q ? String(q.tel).replace(/\D/g, '') : '';
}
function _dashAbrirZap(tel, txt) {
  var num = String(tel || '').replace(/\D/g, '');
  if (num && num.length <= 11) num = '55' + num;
  window.open((num ? 'https://wa.me/' + num : 'https://wa.me/') + '?text=' + encodeURIComponent(txt), '_blank');
}
function _dashPrimeiroNome(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
function _dashZapOrc(id) {
  var q = (DB.q || []).find(function(x){ return String(x.id) === String(id); });
  if (!q) return;
  var emp = (CFG && CFG.emp && CFG.emp.nome) || 'HR Mármores e Granitos';
  var txt = 'Olá, ' + _dashPrimeiroNome(q.cli) + '! Tudo bem? Aqui é da ' + emp + '. '
    + 'Passando pra saber se você conseguiu ver o orçamento' + (q.tipo ? ' do(a) ' + String(q.tipo).replace(/\+/g, ' + ').toLowerCase() : '') + '. '
    + 'Ficou alguma dúvida? Posso ajustar o que precisar!';
  q._followUp = td();
  DB.sv();
  _dashAbrirZap(q.tel, txt);
  renderDashboard();
}
function _dashZapCobrar(jobId) {
  var j = (DB.j || []).find(function(x){ return x.id === jobId; });
  if (!j) return;
  var resto = (j.value || 0) - (j.pago || 0);
  var emp = (CFG && CFG.emp && CFG.emp.nome) || 'HR Mármores e Granitos';
  var txt = 'Olá, ' + _dashPrimeiroNome(j.cli) + '! Tudo bem? Aqui é da ' + emp + '. '
    + 'Passando pra lembrar do saldo de R$ ' + fm(resto) + (j.desc ? ' referente a ' + j.desc : '') + '. '
    + 'Consegue me confirmar quando fica bom pra você acertar? Se precisar, te mando a chave Pix.';
  j._cobrancaEm = td();
  DB.sv();
  _dashAbrirZap(j.tel || _dashTelCli(j.cli), txt);
  renderDashboard();
}
function _dashOrcAceito(id) {
  var q = (DB.q || []).find(function(x){ return String(x.id) === String(id); });
  if (!q) return;
  if (typeof _abrirModalStatusOrc === 'function') _abrirModalStatusOrc(q, 'aceito');
}
function _dashOrcPerdido(id) {
  var q = (DB.q || []).find(function(x){ return String(x.id) === String(id); });
  if (!q) return;
  showCB('Marcar orçamento de ' + q.cli + ' como perdido?', function() {
    q.status = 'perdido';
    q._statusDate = td();
    DB.sv();
    hideCB();
    toast('❌ Perdido — ' + q.cli);
    renderDashboard();
  }, function() { hideCB(); });
}
window._dashZapOrc = _dashZapOrc;
window._dashZapCobrar = _dashZapCobrar;
window._dashOrcAceito = _dashOrcAceito;
window._dashOrcPerdido = _dashOrcPerdido;

function _injectHomeStyles() {
  if (document.getElementById('homeStyle')) return;
  var st = document.createElement('style');
  st.id = 'homeStyle';
  st.textContent = `
    .hm-top{padding:16px 16px 4px;}
    .hm-saud{font-size:1.15rem;font-weight:700;color:var(--tx);}
    .hm-saud span{color:var(--gold2);}
    .hm-data{font-size:.7rem;color:var(--t3);text-transform:capitalize;margin-top:2px;}
    .hm-mes{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px;background:var(--s2);border:1px solid var(--bd);border-radius:14px;padding:12px 8px;text-align:center;cursor:pointer;}
    .hm-mes small{display:block;font-size:.6rem;color:var(--t3);text-transform:uppercase;letter-spacing:.6px;margin-bottom:3px;}
    .hm-mes b{font-size:.98rem;font-weight:800;}
    .hm-eq{font-size:.68rem;color:var(--t3);margin:8px 2px 0;}
    .hm-quick{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px 16px 0;}
    .hm-quick button{font-family:inherit;background:var(--s2);border:1px solid var(--bd);border-radius:12px;color:var(--tx);font-size:.68rem;font-weight:600;padding:10px 4px;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;}
    .hm-quick button span{font-size:1.25rem;}
    .hm-quick button:active{border-color:var(--gold2);}
    .hm-sec{display:flex;justify-content:space-between;align-items:baseline;padding:18px 16px 8px;font-size:.72rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--t2,var(--t3));}
    .hm-sec b{font-size:.74rem;text-transform:none;letter-spacing:0;}
    .hm-card{margin:0 16px;background:var(--s2);border:1px solid var(--bd);border-radius:14px;padding:4px 12px;}
    .hm-empty{margin:0 16px;font-size:.75rem;color:var(--t3);background:var(--s2);border:1px dashed var(--bd);border-radius:12px;padding:14px;text-align:center;}
    .hm-row{display:flex;justify-content:space-between;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--bd);}
    .hm-row:last-of-type{border-bottom:none;}
    .hm-row-main{min-width:0;flex:1;}
    .hm-cli{font-size:.84rem;font-weight:700;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .hm-sub{font-size:.65rem;color:var(--t3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
    .hm-row-r{text-align:right;flex-shrink:0;}
    .hm-val{font-size:.86rem;font-weight:800;}
    .hm-btns{display:flex;gap:5px;margin-top:5px;justify-content:flex-end;}
    .hm-b{font-family:inherit;font-size:.62rem;font-weight:700;padding:5px 9px;border-radius:8px;border:1px solid var(--bd2,var(--bd));background:var(--s3);color:var(--tx);cursor:pointer;}
    .hm-zap{color:#25d366;border-color:rgba(37,211,102,.4);background:rgba(37,211,102,.08);}
    .hm-ok{border-color:rgba(74,222,128,.4);}
    .hm-more{text-align:center;font-size:.66rem;color:var(--t4);padding:10px 0 8px;cursor:pointer;}
    .hm-det{margin:20px 0 0;}
    .hm-det summary{padding:12px 16px;font-size:.72rem;font-weight:700;letter-spacing:.5px;text-transform:uppercase;color:var(--t3);cursor:pointer;list-style:none;}
    .hm-det summary::-webkit-details-marker{display:none;}
  `;
  document.head.appendChild(st);
}

function _dashCard(icon, title, val, sub, cor, fn) {
  return '<div class="dash-card" onclick="' + fn + '" style="border-top:2px solid ' + cor + '20;">'
    + '<div class="dash-card-icon" style="color:' + cor + ';">' + icon + '</div>'
    + '<div class="dash-card-val" style="color:' + cor + ';">' + val + '</div>'
    + '<div class="dash-card-title">' + title + '</div>'
    + '<div class="dash-card-sub">' + sub + '</div>'
    + '</div>';
}

function _dashFmShort(v) {
  if (!v) return '0';
  if (v >= 1000000) return (v/1000000).toFixed(1).replace('.',',') + 'M';
  if (v >= 1000) return (v/1000).toFixed(1).replace('.',',') + 'k';
  return fm(v);
}

function _injectDashStyles() {
  if (document.getElementById('dashStyle')) return;
  var s = document.createElement('style');
  s.id = 'dashStyle';
  s.textContent = `
    @keyframes dashFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }

    .dash-wrap {
      padding: 0 0 20px;
      animation: dashFadeUp .35s ease;
    }

    /* ── HERO ── */
    .dash-hero {
      background: linear-gradient(160deg, #141418 0%, #0e0e12 60%, #0a0a0d 100%);
      border-bottom: 1px solid var(--bd);
      padding: 18px 16px 16px;
      position: relative;
      overflow: hidden;
    }
    .dash-hero::before {
      content: '';
      position: absolute;
      top: -40px; right: -40px;
      width: 160px; height: 160px;
      background: radial-gradient(circle, rgba(201,168,76,.08) 0%, transparent 70%);
      pointer-events: none;
    }
    .dash-hero-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
    }
    .dash-saud {
      font-size: .9rem;
      color: var(--t2);
      margin-bottom: 2px;
    }
    .dash-saud span { color: var(--gold2); font-weight: 700; }
    .dash-data {
      font-size: .65rem;
      color: var(--t4);
      text-transform: capitalize;
    }
    .dash-logo {
      width: 38px; height: 38px; border-radius: 10px;
      background: linear-gradient(135deg, var(--gold), var(--gold3));
      display: flex; align-items: center; justify-content: center;
      font-family: 'Cormorant Garamond', serif;
      font-size: .95rem; font-weight: 700; color: #000;
      cursor: pointer; flex-shrink: 0;
    }
    .dash-mes-label {
      display: flex; justify-content: space-between; align-items: center;
      font-size: .68rem; color: var(--t3); margin-bottom: 6px;
    }
    .dash-bar-bg {
      height: 5px; background: var(--s4); border-radius: 3px; overflow: hidden;
    }
    .dash-bar-fill {
      height: 100%; border-radius: 3px; transition: width .6s ease;
    }

    /* ── CARDS ── */
    .dash-cards {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px; padding: 12px 12px 0;
    }
    .dash-card {
      background: var(--s2); border: 1px solid var(--bd);
      border-radius: 14px; padding: 13px 13px 11px;
      cursor: pointer; transition: background .15s;
    }
    .dash-card:active { background: var(--s3); }
    .dash-card-icon { font-size: 1.3rem; margin-bottom: 6px; }
    .dash-card-val { font-size: 1.1rem; font-weight: 900; line-height: 1; margin-bottom: 3px; }
    .dash-card-title { font-size: .72rem; font-weight: 700; color: var(--t2); margin-bottom: 2px; }
    .dash-card-sub { font-size: .62rem; color: var(--t4); }

    /* ── SECTION LABELS ── */
    .dash-section-lbl {
      font-size: .65rem; font-weight: 700; letter-spacing: 1px;
      text-transform: uppercase; color: var(--t4);
      padding: 14px 16px 6px;
    }

    /* ── ALERTAS ── */
    .dash-alertas { padding: 0 12px; display: flex; flex-direction: column; gap: 7px; }
    .dash-alerta {
      display: flex; align-items: center; gap: 10px;
      background: var(--s2); border: 1px solid var(--bd);
      border-left: 3px solid; border-radius: 0 12px 12px 0;
      padding: 11px 12px; cursor: pointer;
      transition: background .15s;
    }
    .dash-alerta:active { background: var(--s3); }
    .dash-alerta-msg { flex: 1; font-size: .75rem; color: var(--t2); line-height: 1.4; }
    .dash-alerta-arr { font-size: 1rem; flex-shrink: 0; }

    /* ── RADAR ── */
    .dash-radar {
      margin: 0 12px;
      background: var(--s2); border: 1px solid var(--bd);
      border-radius: 14px; padding: 14px;
    }
    .dash-radar-row { margin-bottom: 10px; }
    .dash-radar-meta {
      display: flex; justify-content: space-between;
      margin-bottom: 4px;
    }
    .dash-radar-lbl { font-size: .7rem; color: var(--t3); }
    .dash-radar-bar-bg {
      height: 5px; background: var(--s4); border-radius: 3px; overflow: hidden;
    }
    .dash-radar-saldo {
      display: flex; justify-content: space-between; align-items: center;
      padding-top: 10px; border-top: 1px solid var(--bd); margin-top: 4px;
    }

    /* ── PRODUÇÃO ── */
    .dash-prod-row {
      display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 7px; padding: 0 12px;
    }
    .dash-prod-card {
      background: var(--s2); border: 1px solid var(--bd);
      border-radius: 12px; padding: 11px 8px;
      text-align: center; cursor: pointer;
      transition: background .15s;
    }
    .dash-prod-card:active { background: var(--s3); }
    .dash-prod-val { font-size: 1.4rem; font-weight: 900; line-height: 1; }
    .dash-prod-lbl { font-size: .58rem; color: var(--t4); margin-top: 3px; line-height: 1.3; }

    /* ── ENTREGAS ── */
    .dash-entregas {
      margin: 0 12px;
      background: var(--s2); border: 1px solid var(--bd);
      border-radius: 14px; overflow: hidden;
    }
    .dash-entrega-row {
      display: flex; justify-content: space-between; align-items: center;
      padding: 11px 14px; border-bottom: 1px solid var(--bd);
      cursor: pointer; transition: background .15s;
    }
    .dash-entrega-row:last-child { border-bottom: none; }
    .dash-entrega-row:active { background: var(--s3); }
    .dash-entrega-cli { font-size: .82rem; font-weight: 700; color: var(--t1); }
    .dash-entrega-desc { font-size: .65rem; color: var(--t4); margin-top: 2px; }
    .dash-entrega-badge {
      border-radius: 8px; padding: 4px 9px;
      font-size: .65rem; font-weight: 800; white-space: nowrap;
      flex-shrink: 0; margin-left: 8px;
    }

    /* ── ATALHOS ── */
    .dash-atalhos {
      display: grid; grid-template-columns: repeat(3, 1fr);
      gap: 8px; padding: 0 12px;
    }
    .dash-atalho {
      background: var(--s2); border: 1px solid var(--bd);
      border-radius: 14px; padding: 14px 8px 12px;
      display: flex; flex-direction: column; align-items: center;
      gap: 7px; cursor: pointer; transition: background .15s;
    }
    .dash-atalho:active { background: var(--s3); }
    .dash-atalho-icon {
      width: 40px; height: 40px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.2rem;
    }
    .dash-atalho-lbl {
      font-size: .68rem; font-weight: 600; color: var(--t2);
      text-align: center;
    }
  `;
  document.head.appendChild(s);
  _injectDashChartStyles();
}
// ══════════════════════════════════════════════════════════════
// MELHORIA #2 — GRÁFICO RECEITA MENSAL + TICKET MÉDIO no Dashboard
// Adiciona seção com gráfico de barras dos últimos 6 meses,
// ticket médio, total de orçamentos e taxa de conversão
//
// COMO INTEGRAR:
//   Em renderDashboard(), antes de "// ══ ATALHOS RÁPIDOS ══":
//
//     h += _dashGraficoReceita(hoje);
//
//   E em _injectDashStyles(), antes do fechamento do template literal,
//   adicione a chamada: (ou cole o CSS diretamente no _injectDashStyles)
//
//     _injectDashChartStyles();
// ══════════════════════════════════════════════════════════════

function _dashGraficoReceita(hoje) {
  // ── Calcular últimos 6 meses ──
  var meses = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    var key = d.toISOString().slice(0, 7); // "2025-06"
    var label = d.toLocaleDateString('pt-BR', { month: 'short' })
                 .replace('.', '')
                 .replace(/^\w/, function(c) { return c.toUpperCase(); });
    meses.push({ key: key, label: label, rec: 0, desp: 0, nOrc: 0, nContr: 0 });
  }

  // Receita e despesa por mês
  (DB.t || []).forEach(function(t) {
    var m = (t.date || '').slice(0, 7);
    var bucket = meses.find(function(x) { return x.key === m; });
    if (!bucket) return;
    if (t.type === 'in')  bucket.rec  += (t.value || 0);
    if (t.type === 'out') bucket.desp += (t.value || 0);
  });

  // Orçamentos e conversões por mês
  (DB.q || []).forEach(function(q) {
    var m = (q.date || '').slice(0, 7);
    var bucket = meses.find(function(x) { return x.key === m; });
    if (!bucket) return;
    bucket.nOrc++;
    if (q.contrato || q.status === 'aceito' || q.status === 'aprovado' || q.status === 'concluido') bucket.nContr++;
  });

  // ── Métricas globais (6 meses) ──
  var totalRec   = meses.reduce(function(s, m) { return s + m.rec; }, 0);
  var totalOrc   = meses.reduce(function(s, m) { return s + m.nOrc; }, 0);
  var totalContr = meses.reduce(function(s, m) { return s + m.nContr; }, 0);
  var ticketMed  = totalContr > 0 ? totalRec / totalContr : 0;
  var taxaConv   = totalOrc > 0 ? Math.round((totalContr / totalOrc) * 100) : 0;

  // ── Altura máxima das barras ──
  var maxVal = meses.reduce(function(max, m) { return Math.max(max, m.rec, m.desp); }, 1);
  var BAR_H  = 80; // px — altura máxima visual da barra

  // ── Mês atual ──
  var mesCurrent = hoje.slice(0, 7);

  var h = '';

  // ── Cards de métricas ──
  h += '<div class="dash-section-lbl">📈 Desempenho — 6 meses</div>';
  h += '<div class="dash-metrics-row">';
  h += _dashMetricCard('🎯', 'Ticket médio', 'R$ ' + _dashFmShort(ticketMed), '#a78bfa');
  h += _dashMetricCard('📊', 'Conversão', taxaConv + '%', taxaConv >= 50 ? 'var(--grn)' : taxaConv >= 30 ? '#d4a017' : 'var(--red)');
  h += _dashMetricCard('📋', 'Orçamentos', totalOrc + ' emitidos', 'var(--gold2)');
  h += _dashMetricCard('📜', 'Contratos', totalContr + ' fechados', '#60a5fa');
  h += '</div>';

  // ── Gráfico de barras ──
  h += '<div class="dash-chart-wrap">';

  // Legenda
  h += '<div class="dash-chart-legend">';
  h += '<div class="dash-chart-leg-item"><div class="dash-chart-leg-dot" style="background:var(--grn);"></div>Receita</div>';
  h += '<div class="dash-chart-leg-item"><div class="dash-chart-leg-dot" style="background:var(--red);opacity:.6;"></div>Despesa</div>';
  h += '</div>';

  // Barras
  h += '<div class="dash-chart-bars" style="--bar-max:' + BAR_H + 'px;">';
  meses.forEach(function(m) {
    var recH  = Math.round((m.rec  / maxVal) * BAR_H);
    var despH = Math.round((m.desp / maxVal) * BAR_H);
    var isAtual = m.key === mesCurrent;
    var lucro = m.rec - m.desp;
    var lucroStr = (lucro >= 0 ? '+' : '') + 'R$ ' + _dashFmShort(Math.abs(lucro));
    var lucroCol  = lucro >= 0 ? 'var(--grn)' : 'var(--red)';

    h += '<div class="dash-chart-col' + (isAtual ? ' atual' : '') + '">';

    // Tooltip no hover (CSS puro via title)
    h += '<div class="dash-chart-bars-group" title="' +
      m.label + ': ' +
      'Receita R$ ' + _dashFmShort(m.rec) + ' | ' +
      'Despesa R$ ' + _dashFmShort(m.desp) + ' | ' +
      'Resultado ' + lucroStr + '">';

    // Receita
    h += '<div class="dash-chart-bar rec" style="height:' + recH + 'px;"></div>';
    // Despesa
    h += '<div class="dash-chart-bar desp" style="height:' + despH + 'px;"></div>';
    h += '</div>';

    // Label do mês
    h += '<div class="dash-chart-label" style="' + (isAtual ? 'color:var(--gold2);font-weight:800;' : '') + '">' + m.label + '</div>';

    // Valor da receita (mês atual ou hover — sempre visível no mês atual)
    if (isAtual && m.rec > 0) {
      h += '<div class="dash-chart-val">' + _dashFmShort(m.rec) + '</div>';
    }

    h += '</div>';
  });

  h += '</div>'; // dash-chart-bars

  // Eixo Y (3 linhas de referência)
  var eixoY = [maxVal, maxVal * 0.5, 0];
  h += '<div class="dash-chart-yaxis">';
  eixoY.forEach(function(v, i) {
    h += '<span>' + (v > 0 ? _dashFmShort(v) : '0') + '</span>';
  });
  h += '</div>';

  h += '</div>'; // dash-chart-wrap

  return h;
}

// ── Card de métrica compacto ──
function _dashMetricCard(icon, label, val, cor) {
  return '<div class="dash-metric-card" style="border-top: 2px solid ' + cor + '30;">' +
    '<div class="dash-metric-icon" style="color:' + cor + ';">' + icon + '</div>' +
    '<div class="dash-metric-val" style="color:' + cor + ';">' + val + '</div>' +
    '<div class="dash-metric-label">' + label + '</div>' +
    '</div>';
}

// ── CSS do gráfico ──
function _injectDashChartStyles() {
  if (document.getElementById('dashChartStyle')) return;
  var s = document.createElement('style');
  s.id = 'dashChartStyle';
  s.textContent = `
    @keyframes barGrow {
      from { transform: scaleY(0); transform-origin: bottom; }
      to   { transform: scaleY(1); transform-origin: bottom; }
    }

    /* Métricas */
    .dash-metrics-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 7px;
      padding: 0 12px;
      margin-bottom: 12px;
    }
    .dash-metric-card {
      background: var(--s2);
      border: 1px solid var(--bd);
      border-radius: 12px;
      padding: 11px 12px 10px;
      border-top: 2px solid;
    }
    .dash-metric-icon {
      font-size: 1.1rem;
      margin-bottom: 5px;
    }
    .dash-metric-val {
      font-size: .95rem;
      font-weight: 900;
      line-height: 1;
      margin-bottom: 3px;
    }
    .dash-metric-label {
      font-size: .6rem;
      color: var(--t4);
    }

    /* Gráfico */
    .dash-chart-wrap {
      margin: 0 12px;
      background: var(--s2);
      border: 1px solid var(--bd);
      border-radius: 16px;
      padding: 14px 14px 12px;
      position: relative;
      overflow: hidden;
    }

    .dash-chart-legend {
      display: flex;
      gap: 14px;
      margin-bottom: 12px;
      justify-content: flex-end;
    }
    .dash-chart-leg-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: var(--t3);
    }
    .dash-chart-leg-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
    }

    .dash-chart-bars {
      display: flex;
      align-items: flex-end;
      gap: 6px;
      height: calc(var(--bar-max, 80px) + 30px);
      padding-bottom: 30px;
      position: relative;
    }

    /* Linhas horizontais de referência */
    .dash-chart-bars::before,
    .dash-chart-bars::after {
      content: '';
      position: absolute;
      left: 0; right: 0;
      height: 1px;
      background: rgba(255,255,255,.04);
    }
    .dash-chart-bars::before { bottom: 30px; }
    .dash-chart-bars::after  { bottom: calc(30px + var(--bar-max, 80px) / 2); }

    .dash-chart-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 3px;
      position: relative;
    }

    .dash-chart-col.atual .dash-chart-bars-group {
      filter: drop-shadow(0 0 6px rgba(201,168,76,.2));
    }

    .dash-chart-bars-group {
      width: 100%;
      display: flex;
      gap: 2px;
      align-items: flex-end;
      justify-content: center;
    }

    .dash-chart-bar {
      flex: 1;
      border-radius: 4px 4px 0 0;
      animation: barGrow .5s ease backwards;
      min-height: 2px;
      transition: opacity .2s;
    }
    .dash-chart-bar:active { opacity: .7; }
    .dash-chart-bar.rec  {
      background: linear-gradient(to top, #16a34a, #4ade80);
      animation-delay: .1s;
    }
    .dash-chart-bar.desp {
      background: linear-gradient(to top, #991b1b80, #f8717160);
      animation-delay: .15s;
    }

    .dash-chart-label {
      position: absolute;
      bottom: 6px;
      font-size: 9px;
      color: var(--t4);
      font-weight: 600;
      white-space: nowrap;
    }

    .dash-chart-val {
      position: absolute;
      top: -18px;
      font-size: 9px;
      color: var(--grn);
      font-weight: 800;
      white-space: nowrap;
    }

    .dash-chart-yaxis {
      display: none; /* simplificado — valores via tooltip */
    }
  `;
  document.head.appendChild(s);
}

// ── GRÁFICO DE CUSTO TOTAL DA EQUIPE POR MÊS ──────────────────
function _dashGraficoCustoEquipe(hoje) {
  var funcs, pags, regs;
  try {
    try { funcs = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch(e) { funcs = {}; }
    try { pags  = JSON.parse(localStorage.getItem('hr_pagamentos')  || '{}'); } catch(e) { pags  = {}; }
    try { regs  = JSON.parse(localStorage.getItem('hr_registros')   || '{}'); } catch(e) { regs  = {}; }
  } catch(e) { return ''; }

  var ativos = Object.values(funcs).filter(function(f){ return f.ativo !== false; });
  if (!ativos.length) return '';

  // ── Últimos 6 meses ──
  var meses = [];
  for (var i = 5; i >= 0; i--) {
    var d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    var key = d.toISOString().slice(0, 7);
    var label = d.toLocaleDateString('pt-BR', { month: 'short' })
                  .replace('.', '')
                  .replace(/^\w/, function(c){ return c.toUpperCase(); });
    meses.push({ key: key, label: label, total: 0, porFunc: {} });
  }

  // ── Agrupa pagamentos por mês e por funcionário ──
  Object.values(pags).forEach(function(p) {
    var m = (p.data || '').slice(0, 7);
    var bucket = meses.find(function(x){ return x.key === m; });
    if (!bucket) return;
    var fid = p.funcionarioId;
    if (!bucket.porFunc[fid]) bucket.porFunc[fid] = 0;
    bucket.porFunc[fid] += parseFloat(p.valor) || 0;
    bucket.total        += parseFloat(p.valor) || 0;
  });

  var maxVal = meses.reduce(function(mx, m){ return Math.max(mx, m.total); }, 1);
  var BAR_H  = 80;
  var mesCurrent = hoje.slice(0, 7);

  // Cores para empilhamento por funcionário (até 6 cores)
  var COR_FUNC = ['#C9A84C','#5cb85c','#5c8ec8','#e0954a','#a78bfa','#60a5fa'];
  var funcIds  = ativos.slice(0, 6).map(function(f){ return f.id; });

  var h = '';
  h += '<div class="dash-section-lbl">👷 Custo da Equipe — 6 meses</div>';

  // Legenda por funcionário
  h += '<div class="dash-chart-legend" style="flex-wrap:wrap;gap:6px 12px;">';
  funcIds.forEach(function(fid, i) {
    var nome = (funcs[fid] || {}).nome || '?';
    h += '<div class="dash-chart-leg-item">' +
           '<div class="dash-chart-leg-dot" style="background:' + COR_FUNC[i] + ';"></div>' +
           nome.split(' ')[0] +
         '</div>';
  });
  h += '</div>';

  // Barras empilhadas
  h += '<div class="dash-chart-wrap">';
  h += '<div class="dash-chart-bars" style="--bar-max:' + BAR_H + 'px;">';

  meses.forEach(function(m) {
    var totalH  = Math.round((m.total / maxVal) * BAR_H);
    var isAtual = m.key === mesCurrent;

    // Tooltip
    var tipLines = [m.label + ' — Total: R$' + parseFloat(m.total).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})];
    funcIds.forEach(function(fid) {
      var v = m.porFunc[fid] || 0;
      if (v > 0) tipLines.push((funcs[fid]||{}).nome.split(' ')[0] + ': R$' + v.toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}));
    });

    h += '<div class="dash-chart-col' + (isAtual ? ' atual' : '') + '">';
    h += '<div class="dash-chart-bars-group" title="' + tipLines.join(' | ') + '" style="position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:' + BAR_H + 'px;gap:1px;">';

    // Fatias empilhadas de baixo para cima
    var somado = 0;
    funcIds.forEach(function(fid, i) {
      var v = m.porFunc[fid] || 0;
      if (!v) return;
      var fH = Math.max(1, Math.round((v / maxVal) * BAR_H));
      somado += fH;
      h += '<div style="width:100%;height:' + fH + 'px;background:' + COR_FUNC[i] + ';border-radius:' + (i===0?'3px 3px 0 0':'0') + ';opacity:.85;"></div>';
    });

    h += '</div>';
    h += '<div class="dash-chart-label"' + (isAtual ? ' style="color:var(--gold2);font-weight:800;"' : '') + '>' + m.label + '</div>';
    if (isAtual && m.total > 0) {
      h += '<div class="dash-chart-val">R$' + (m.total >= 1000 ? (m.total/1000).toFixed(1)+'k' : m.total.toFixed(0)) + '</div>';
    }
    h += '</div>';
  });

  h += '</div>'; // dash-chart-bars
  h += '</div>'; // dash-chart-wrap

  // Total acumulado dos 6 meses
  var totalGeral = meses.reduce(function(s, m){ return s + m.total; }, 0);
  var mediaMes   = totalGeral / 6;
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:4px;">';
  h += '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px;text-align:center;">' +
         '<div style="font-size:.58rem;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;">Total 6 meses</div>' +
         '<div style="font-size:.95rem;font-weight:800;color:var(--red);">R$ ' + (totalGeral/1000).toFixed(1) + 'k</div>' +
       '</div>';
  h += '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:10px;text-align:center;">' +
         '<div style="font-size:.58rem;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;margin-bottom:3px;">Média/mês</div>' +
         '<div style="font-size:.95rem;font-weight:800;color:var(--gold2);">R$ ' + parseFloat(mediaMes).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0}) + '</div>' +
       '</div>';
  h += '</div>';

  return h;
}

// ══════════════════════════════════════════════
// INADIMPLÊNCIA — Modal completo e recebimento
// ══════════════════════════════════════════════
function _showInadimpModal() {
  var jobs = DB.j || [];
  var emProd = jobs.filter(function(j){ return !j.done; });

  var inadimpAtivos = emProd.filter(function(j){
    var resto = (j.value||0) - (j.pago||0);
    return resto > 0 && j.end && dDiff(j.end) < -7;
  });
  var inadimpConcluidos = jobs.filter(function(j){
    var resto = (j.value||0) - (j.pago||0);
    return j.done && resto > 0.01;
  });
  var lista = inadimpAtivos.concat(inadimpConcluidos);
  var totalValor = lista.reduce(function(s,j){ return s+((j.value||0)-(j.pago||0)); }, 0);

  var h = '<div style="background:var(--s2);border-top:1px solid var(--bd);border-radius:20px 20px 0 0;width:100%;max-width:480px;padding:20px 16px 36px;max-height:88vh;overflow-y:auto;">';
  h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
  h += '<div style="font-size:1rem;font-weight:700;color:#e05151;">🚨 Inadimplência</div>';
  h += '<button onclick="document.getElementById(\'inadimpOv\').remove()" style="background:none;border:none;color:var(--t3);font-size:1.2rem;cursor:pointer;">✕</button>';
  h += '</div>';
  h += '<div style="font-size:.68rem;color:var(--t3);margin-bottom:14px;">' + lista.length + ' caso(s) · Total em aberto: <b style="color:#e05151;">R$ ' + fm(totalValor) + '</b></div>';

  if (!lista.length) {
    h += '<div style="text-align:center;padding:30px;color:var(--t3);font-size:.8rem;">✅ Nenhuma inadimplência no momento</div>';
  }

  lista.forEach(function(j) {
    var resto   = (j.value||0) - (j.pago||0);
    var diasAt  = j.end ? Math.abs(Math.min(0, dDiff(j.end))) : null;
    var situBadge = j.done
      ? '<span style="background:rgba(240,165,0,.12);color:#f0a500;border:1px solid rgba(240,165,0,.3);border-radius:5px;font-size:.58rem;font-weight:700;padding:2px 6px;">ENTREGUE</span>'
      : '<span style="background:rgba(224,81,81,.12);color:#e05151;border:1px solid rgba(224,81,81,.3);border-radius:5px;font-size:.58rem;font-weight:700;padding:2px 6px;">' + (diasAt ? diasAt+'d ATRASO' : 'EM ABERTO') + '</span>';

    h += '<div style="background:var(--s3);border:1px solid rgba(224,81,81,.2);border-radius:12px;padding:12px 14px;margin-bottom:10px;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">';
    h += '<div><div style="font-size:.85rem;font-weight:700;color:var(--tx);">' + escH(j.cli) + '</div>';
    h += '<div style="font-size:.65rem;color:var(--t3);margin-top:2px;">' + escH(j.desc||'') + '</div></div>';
    h += situBadge + '</div>';
    h += '<div style="display:flex;justify-content:space-between;font-size:.7rem;color:var(--t3);margin-bottom:8px;">';
    h += '<span>Total: R$ ' + fm(j.value||0) + '</span>';
    h += '<span>Pago: R$ ' + fm(j.pago||0) + '</span>';
    h += '<span style="color:#e05151;font-weight:700;">Falta: R$ ' + fm(resto) + '</span>';
    h += '</div>';
    if (j.end) {
      h += '<div style="font-size:.62rem;color:var(--t4);margin-bottom:8px;">Entrega prevista: ' + fd(j.end) + '</div>';
    }
    h += '<button onclick="_inadimpReceberJob(' + j.id + ')" style="width:100%;padding:9px;background:rgba(224,81,81,.15);border:1px solid rgba(224,81,81,.4);color:#e05151;border-radius:9px;font-size:.78rem;font-weight:700;cursor:pointer;">💰 Registrar recebimento de R$ ' + fm(resto) + '</button>';
    h += '</div>';
  });

  h += '</div>';

  var ov = document.createElement('div');
  ov.id  = 'inadimpOv';
  ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9000;display:flex;align-items:flex-end;justify-content:center;';
  ov.innerHTML = h;
  ov.addEventListener('click', function(e){ if(e.target===ov) ov.remove(); });
  document.body.appendChild(ov);
}

function _inadimpReceberJob(jobId) {
  var j = (DB.j||[]).find(function(x){ return x.id === jobId; });
  if (!j) return;
  var resto = (j.value||0) - (j.pago||0);
  if (resto <= 0) { toast('Job já está quitado'); return; }
  showCB(
    'Registrar R$ ' + fm(resto) + ' recebido de ' + j.cli + '?',
    function() {
      if (typeof addTr === 'function') addTr('in', 'Recebimento — ' + j.cli, resto, null, j.id);
      j.pago = j.value;
      DB.sv();
      hideCB();
      toast('✓ R$ ' + fm(resto) + ' registrado!');
      // Fecha modal se aberto
      var ov = document.getElementById('inadimpOv');
      if (ov) ov.remove();
      // Atualiza dashboard
      if (typeof renderDashboard === 'function') renderDashboard();
    },
    function() { hideCB(); }
  );
}

window._showInadimpModal   = _showInadimpModal;
window._inadimpReceberJob  = _inadimpReceberJob;


// ── Mantém a home em dia: re-renderiza (com debounce) quando Finanças/Histórico mudam ──
(function() {
  var _t = null;
  function agendar() {
    clearTimeout(_t);
    _t = setTimeout(function() {
      var el = document.getElementById('pg12');
      if (el && el.offsetParent !== null && typeof renderDashboard === 'function') {
        try { renderDashboard(); } catch (e) {}
      }
    }, 80);
  }
  function wrap(nome) {
    var o = window[nome];
    if (typeof o !== 'function' || o._hmWrapped) return;
    var w = function() { var r = o.apply(this, arguments); agendar(); return r; };
    w._hmWrapped = true;
    window[nome] = w;
  }
  // espera todos os scripts carregarem pra pegar as versões finais das funções
  window.addEventListener('load', function() { wrap('renderFin'); wrap('renderOrc'); });
})();
