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
  var totalCustos = fixos + vars + ((CFG.saudeFinanceira&&CFG.saudeFinanceira.proLabore)||0);
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

  // ══ HERO ══
  h += '<div class="dash-hero">';
  h += '<div class="dash-hero-top">';
  h += '<div>';
  h += '<div class="dash-saud">' + saudacao + ', <span>' + escH(nomeEmp) + '</span> 👋</div>';
  var dataHoje = agora.toLocaleDateString('pt-BR', {weekday:'long', day:'numeric', month:'long'});
  h += '<div class="dash-data">' + dataHoje + '</div>';
  h += '</div>';
  h += '<div class="dash-logo" onclick="go(5)">HR</div>';
  h += '</div>';

  // Barra de progresso do mês
  h += '<div class="dash-mes-label">';
  h += '<span>' + sfEmoji + ' ' + mes.replace('-','/') + ' · ' + pctMes + '% do ponto de equilíbrio</span>';
  h += '<span style="color:' + sfColor + ';font-weight:700;">R$ ' + _dashFmShort(recMes) + '</span>';
  h += '</div>';
  h += '<div class="dash-bar-bg"><div class="dash-bar-fill" style="width:' + pctMes + '%;background:' + sfColor + ';"></div></div>';
  h += '</div>';

  // ══ CARDS RÁPIDOS (2×2) ══
  h += '<div class="dash-cards">';
  h += _dashCard('💰', 'Faturado', 'R$ ' + _dashFmShort(recMes), 'este mês', 'var(--grn)', 'go(4)');
  h += _dashCard('⏳', 'A receber', 'R$ ' + _dashFmShort(totPend), pendVenc.length ? pendVenc.length + ' vencido(s)' : 'em dia', pendVenc.length ? 'var(--red)' : '#d4a017', 'go(4);setTimeout(function(){finTab(\'areceber\')},200)');
  h += _dashCard('🔨', 'Em produção', emProd.length + ' jobs', concluidos.length + ' concluído(s) no mês', 'var(--gold2)', 'go(3)');
  h += _dashCard('📐', 'Visitas', visitasHoje.length + ' hoje', visitasSemana.length + ' esta semana', '#60a5fa', 'go(11)');
  h += '</div>';

  // ══ ALERTAS ══
  var alertas = [];
  if (atrasados.length) alertas.push({ cor:'var(--red)', icon:'⚠️', msg: atrasados.length + ' entrega(s) atrasada(s): ' + atrasados.slice(0,2).map(function(j){ return j.cli; }).join(', '), fn:'go(3)' });
  if (pendVenc.length)  alertas.push({ cor:'#e07820', icon:'💸', msg: 'R$ ' + _dashFmShort(pendVenc.reduce(function(s,t){ return s+(t.value||0); },0)) + ' vencidos a receber', fn:'go(4)' });
  if (urgentes.length)  alertas.push({ cor:'#fb923c', icon:'🚨', msg: urgentes.length + ' job(s) urgente(s): ' + urgentes.slice(0,2).map(function(j){ return j.cli; }).join(', '), fn:'go(3)' });
  if (visitasHoje.length) alertas.push({ cor:'#60a5fa', icon:'📐', msg: visitasHoje.length + ' visita(s) hoje — ' + visitasHoje.map(function(v){ return v.cli+(v.hora?' às '+v.hora:''); }).join(', '), fn:'go(11)' });

  if (alertas.length) {
    h += '<div class="dash-section-lbl">⚡ Ação imediata</div>';
    h += '<div class="dash-alertas">';
    alertas.forEach(function(a) {
      h += '<div class="dash-alerta" style="border-left-color:' + a.cor + ';" onclick="' + a.fn + '">';
      h += '<span style="font-size:1.1rem;">' + a.icon + '</span>';
      h += '<span class="dash-alerta-msg">' + a.msg + '</span>';
      h += '<span class="dash-alerta-arr" style="color:' + a.cor + ';">→</span>';
      h += '</div>';
    });
    h += '</div>';
  }

  // ══ RADAR FINANCEIRO ══
  h += '<div class="dash-section-lbl">💵 Radar financeiro</div>';
  h += '<div class="dash-radar card">';
  var radarItems = [
    { label:'Faturado', val:recMes, color:'var(--grn)', max:Math.max(recMes,totalCustos,1) },
    { label:'Despesas', val:despMes, color:'var(--red)', max:Math.max(recMes,totalCustos,1) },
    { label:'Custos fixos', val:totalCustos, color:'#d4a017', max:Math.max(recMes,totalCustos,1) },
    { label:'A receber', val:totPend, color:'#60a5fa', max:Math.max(recMes,totalCustos,totPend,1) },
  ];
  radarItems.forEach(function(item) {
    var pct = Math.min(100, Math.round((item.val/item.max)*100));
    h += '<div class="dash-radar-row">';
    h += '<div class="dash-radar-meta"><span class="dash-radar-lbl">' + item.label + '</span>';
    h += '<span style="color:' + item.color + ';font-weight:700;font-size:.8rem;">R$ ' + _dashFmShort(item.val) + '</span></div>';
    h += '<div class="dash-radar-bar-bg"><div style="height:100%;width:' + pct + '%;background:' + item.color + ';border-radius:3px;transition:width .5s;"></div></div>';
    h += '</div>';
  });
  // Lucro líquido
  var lucroColor = lucro >= 0 ? 'var(--grn)' : 'var(--red)';
  h += '<div class="dash-radar-saldo">';
  h += '<span style="font-size:.72rem;color:var(--t3);">Resultado do mês</span>';
  h += '<span style="font-size:1.1rem;font-weight:900;color:' + lucroColor + ';">' + (lucro>=0?'+':'') + 'R$ ' + _dashFmShort(lucro) + '</span>';
  h += '</div>';
  h += '</div>';

  // ══ PRODUÇÃO ══
  h += '<div class="dash-section-lbl">🔨 Produção</div>';
  h += '<div class="dash-prod-row">';
  [
    { val:emProd.length, lbl:'Em produção', col:'var(--gold2)', fn:'go(3)' },
    { val:atrasados.length, lbl:'Atrasados', col:'var(--red)', fn:'go(3)' },
    { val:entrega3d.length, lbl:'Entrega 3 dias', col:'#fb923c', fn:'go(3)' },
    { val:concluidos.length, lbl:'Concluídos/mês', col:'var(--grn)', fn:'go(3)' },
  ].forEach(function(item) {
    h += '<div class="dash-prod-card" onclick="' + item.fn + '">';
    h += '<div class="dash-prod-val" style="color:' + item.col + ';">' + item.val + '</div>';
    h += '<div class="dash-prod-lbl">' + item.lbl + '</div>';
    h += '</div>';
  });
  h += '</div>';

  // ══ PRÓXIMAS ENTREGAS ══
  var prox = emProd.filter(function(j){ return j.end; })
    .sort(function(a,b){ return a.end.localeCompare(b.end); })
    .slice(0, 4);
  if (prox.length) {
    h += '<div class="dash-section-lbl">📅 Próximas entregas</div>';
    h += '<div class="dash-entregas card">';
    prox.forEach(function(j) {
      var diff = dDiff(j.end);
      var dlbl = diff < 0 ? Math.abs(diff)+'d atrasado' : diff === 0 ? 'HOJE' : diff === 1 ? 'AMANHÃ' : 'em '+diff+'d';
      var dcor = diff < 0 ? 'var(--red)' : diff <= 1 ? '#fb923c' : diff <= 3 ? '#d4a017' : 'var(--grn)';
      h += '<div class="dash-entrega-row" onclick="go(3)">';
      h += '<div>';
      h += '<div class="dash-entrega-cli">' + escH(j.cli) + '</div>';
      h += '<div class="dash-entrega-desc">' + escH(j.desc||'') + '</div>';
      h += '</div>';
      h += '<div class="dash-entrega-badge" style="background:' + dcor + '18;color:' + dcor + ';">' + dlbl + '</div>';
      h += '</div>';
    });
    h += '</div>';
  }

  // ── GRÁFICO DE RECEITA MENSAL ──
  h += _dashGraficoReceita(hoje);

  // ══ ATALHOS RÁPIDOS ══
  h += '<div class="dash-section-lbl">⚡ Atalhos</div>';
  h += '<div class="dash-atalhos">';
  var atalhos = [
    { icon:'💰', lbl:'Orçamento', fn:'go(1)', cor:'var(--gold2)' },
    { icon:'📅', lbl:'Agenda', fn:'go(3)', cor:'#fb923c' },
    { icon:'💵', lbl:'Finanças', fn:'go(4)', cor:'var(--grn)' },
    { icon:'🤖', lbl:'Secretária', fn:'go(11)', cor:'#a78bfa' },
    { icon:'📜', lbl:'Contratos', fn:'go(10)', cor:'#60a5fa' },
    { icon:'📋', lbl:'Histórico', fn:'go(7)', cor:'var(--t3)' },
  ];
  atalhos.forEach(function(a) {
    h += '<div class="dash-atalho" onclick="' + a.fn + '">';
    h += '<div class="dash-atalho-icon" style="color:' + a.cor + ';background:' + a.cor + '15;">' + a.icon + '</div>';
    h += '<div class="dash-atalho-lbl">' + a.lbl + '</div>';
    h += '</div>';
  });
  h += '</div>';

  h += '<div style="height:24px;"></div>';

  el.innerHTML = '<div class="dash-wrap">' + h + '</div>';
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
    if (q.contrato) bucket.nContr++;
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
