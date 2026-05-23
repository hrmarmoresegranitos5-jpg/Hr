// ══════════════════════════════════════════════════════════════
// FINANÇAS — Módulo Completo com Abas
// Abas: Resumo | Recebidos | A Receber | Despesas | Caixa
// ══════════════════════════════════════════════════════════════

var _finTab = 'resumo';

// ═══ ABRIR MODAL DE LANÇAMENTO ═══
function openFin(t) {
  fType = t;
  document.querySelectorAll('.ts').forEach(function(o) {
    o.classList.toggle('on', o.dataset.ftp === t);
  });
  var fd = document.getElementById('fData');
  if (fd && !fd.value) fd.value = td();
  showMd('finMd');
}

function setFT(t) {
  fType = t;
  document.querySelectorAll('[data-ftp]').forEach(function(o) {
    o.classList.toggle('on', o.dataset.ftp === t);
  });
}

function saveFin() {
  var _fDesc=document.getElementById('fDesc');
  var _fVal=document.getElementById('fVal');
  var _fData=document.getElementById('fData');
  if(!_fDesc||!_fVal||!_fData){console.error('saveFin: campo do modal não encontrado');return;}
  var desc = _fDesc.value.trim();
  var val  = +_fVal.value || 0;
  var date = _fData.value;
  if (!desc) { toast('Preencha a descrição'); return; }
  DB.t.unshift({ id: Date.now(), type: fType, desc: desc, value: val, date: date });
  DB.sv(); renderFin(); closeAll();
  _fDesc.value = '';
  _fVal.value  = '';
  toast('✓ Lançado!');
}

function openEditTr(id) {
  editTrId = id;
  var t = DB.t.find(function(x) { return x.id === id; });
  if (!t) return;
  var _teDesc=document.getElementById('teDesc');
  var _teVal=document.getElementById('teVal');
  var _teData=document.getElementById('teData');
  if(!_teDesc||!_teVal||!_teData){console.error('openEditTr: campo do modal não encontrado');return;}
  _teDesc.value = t.desc  || '';
  _teVal.value  = t.value || '';
  _teData.value = t.date  || td();
  document.querySelectorAll('[data-tet]').forEach(function(o) {
    o.classList.toggle('on', o.dataset.tet === t.type);
  });
  showMd('trEdMd');
}

function setTET(tp) {
  document.querySelectorAll('[data-tet]').forEach(function(o) {
    o.classList.toggle('on', o.dataset.tet === tp);
  });
}

function saveTrEdit() {
  var t = DB.t.find(function(x) { return x.id === editTrId; });
  if (!t) return;
  var tp = document.querySelector('[data-tet].on');
  t.type  = tp ? tp.dataset.tet : t.type;
  t.desc  = document.getElementById('teDesc').value.trim() || t.desc;
  t.value = +document.getElementById('teVal').value || t.value;
  t.date  = document.getElementById('teData').value || t.date;
  DB.sv(); renderFin(); closeAll(); toast('✓ Atualizado!');
}

function delTr() {
  if (!confirm('Excluir lançamento?')) return;
  DB.t = DB.t.filter(function(x) { return x.id !== editTrId; });
  DB.sv(); renderFin(); closeAll(); toast('✓ Excluído!');
}

// ═══ MARCAR PENDENTE COMO RECEBIDO ═══
function receberPend(id) {
  var t = DB.t.find(function(x) { return x.id === id; });
  if (!t) return;
  t.type = 'in';
  t.date = td();
  DB.sv(); renderFin();
  toast('✅ Marcado como recebido!');
}

// ═══ TROCAR ABA ═══
function finTab(tab) {
  _finTab = tab;
  document.querySelectorAll('.fin-tab').forEach(function(el) {
    el.classList.toggle('on', el.dataset.ftab === tab);
  });
  renderFinBody();
}

// ═══ RENDER PRINCIPAL ═══
function renderFin() {
  var hoje     = td();
  var mesAtual = hoje.slice(0, 7);

  var recebidos = DB.t.filter(function(t) { return t.type === 'in'; });
  var despesas  = DB.t.filter(function(t) { return t.type === 'out'; });
  var pendentes = DB.t.filter(function(t) { return t.type === 'pend'; });

  var totalRecebido = recebidos.reduce(function(s, t) { return s + (t.value || 0); }, 0);
  var totalDespesas = despesas.reduce(function(s, t)  { return s + (t.value || 0); }, 0);
  var totalPendente = pendentes.reduce(function(s, t) { return s + (t.value || 0); }, 0);
  var saldoReal     = totalRecebido - totalDespesas;

  var recebidoHoje = recebidos
    .filter(function(t) { return t.date === hoje; })
    .reduce(function(s, t) { return s + (t.value || 0); }, 0);

  var recebidoMes = recebidos
    .filter(function(t) { return (t.date || '').slice(0, 7) === mesAtual; })
    .reduce(function(s, t) { return s + (t.value || 0); }, 0);

  var atrasados     = pendentes.filter(function(t) { return t.date && t.date < hoje; });
  var totalAtrasado = atrasados.reduce(function(s, t) { return s + (t.value || 0); }, 0);

  // Hero
  var fs = document.getElementById('finSaldo');
  if (fs) {
    fs.textContent = 'R$ ' + fm(saldoReal);
    fs.className   = 'finval ' + (saldoReal >= 0 ? 'pos' : 'neg');
  }
  var fsub = document.getElementById('finSub');
  if (fsub) {
    fsub.textContent = totalPendente > 0
      ? 'R$ ' + fm(totalPendente) + ' a receber' + (atrasados.length ? ' · ⚠️ ' + atrasados.length + ' em atraso' : '')
      : 'R$ 0,00 a receber dos serviços';
  }
  // Mini-cards no hero (Entradas / Saídas / A Receber)
  var fmc = document.getElementById('finMiniCards');
  if (fmc) {
    fmc.innerHTML = ''
      + '<div class="fc"><div class="fcl">Entradas</div><div class="fcv g">R$ ' + fm(totalRecebido) + '</div></div>'
      + '<div class="fc"><div class="fcl">Saídas</div><div class="fcv r">R$ ' + fm(totalDespesas) + '</div></div>'
      + '<div class="fc" style="cursor:pointer;" onclick="finTab(\'areceber\')">'
        + '<div class="fcl">A Receber</div>'
        + '<div class="fcv b">R$ ' + fm(totalPendente) + '</div>'
      + '</div>';
  }

  window._finMetrics = {
    saldoReal, totalRecebido, totalDespesas, totalPendente,
    lucro: saldoReal, recebidoHoje, recebidoMes,
    totalAtrasado, recebidos, despesas, pendentes, atrasados, hoje, mesAtual
  };

  renderFinBody();
  renderFixos();
  renderSaudeFinanceira();
}

// ═══ CORPO DA ABA ATIVA ═══
function renderFinBody() {
  var body = document.getElementById('finBody');
  if (!body) return;
  var m = window._finMetrics || { recebidos:[], despesas:[], pendentes:[], atrasados:[], hoje:td(), mesAtual:td().slice(0,7), saldoReal:0, totalRecebido:0, totalDespesas:0, totalPendente:0, totalAtrasado:0, recebidoHoje:0, recebidoMes:0, lucro:0 };

  if (_finTab === 'resumo')    { body.innerHTML = _finResumo(m); return; }
  if (_finTab === 'boletos')   { body.innerHTML = renderBoletosTab(); return; }
  if (_finTab === 'recebidos') { body.innerHTML = _finRecebidos(m); return; }
  if (_finTab === 'areceber')  { body.innerHTML = _finAReceber(m); return; }
  if (_finTab === 'despesas')  { body.innerHTML = _finDespesas(m); return; }
  if (_finTab === 'caixa')     { body.innerHTML = _finCaixa(m); return; }
}

// ── RESUMO ──
function _finResumo(m) {
  var h = '';
  h += '<div class="fin-cards6">';
  h += _finCard('💰', 'Saldo Real',       fm(m.saldoReal),     m.saldoReal >= 0 ? 'grn' : 'red');
  h += _finCard('📅', 'Recebido Hoje',    fm(m.recebidoHoje),  'grn');
  h += _finCard('📆', 'Recebido no Mês',  fm(m.recebidoMes),   'grn');
  h += _finCard('📉', 'Despesas',         fm(m.totalDespesas), 'red');
  h += _finCard('📈', 'Lucro Líquido',    fm(m.lucro),         m.lucro >= 0 ? 'grn' : 'red');
  h += _finCard('⏳', 'Previsão a Rec.',  fm(m.totalPendente), 'yel');
  h += '</div>';

  if (m.totalAtrasado > 0) {
    h += '<div class="fin-alerta">';
    h += '<span>⚠️ R$ ' + fm(m.totalAtrasado) + ' em atraso</span>';
    h += '<span class="fin-alerta-qt">' + m.atrasados.length + ' pendência(s)</span>';
    h += '</div>';
  }

  h += '<div class="fin-qa-grid">';
  h += _finQA('in',   '📈', 'Entrada',   'Valor recebido');
  h += _finQA('out',  '📉', 'Despesa',   'Saída de caixa');
  h += _finQA('pend', '⏳', 'A Receber', 'Pendente');
  h += _finQA('note', '📝', 'Nota',      'Anotação');
  h += '</div>';

  var ultimos = (DB.t || []).slice(0, 10);
  if (ultimos.length) {
    h += '<div class="fin-sec-lbl" style="margin:14px 0 6px;">Últimas movimentações</div>';
    h += '<div class="fin-list">';
    ultimos.forEach(function(t) { h += _finRow(t, m.hoje); });
    h += '</div>';
  } else {
    h += _finEmpty('Nenhuma movimentação. Lance uma entrada para começar.');
  }
  return h;
}

// ── RECEBIDOS ──
function _finRecebidos(m) {
  var h = '';
  h += '<div class="fin-hd-blk grn-blk">';
  h += '<div><div class="fin-hd-lbl">Total Recebido</div><div class="fin-hd-val grn">R$ ' + fm(m.totalRecebido) + '</div></div>';
  h += '<div><div class="fin-hd-lbl">Este Mês</div><div class="fin-hd-val grn">R$ ' + fm(m.recebidoMes) + '</div></div>';
  h += '</div>';
  h += '<div class="fin-add-btn-wrap"><button class="fin-add-btn fin-add-grn" data-qa="in">+ Nova Entrada</button></div>';

  if (!m.recebidos.length) return h + _finEmpty('Nenhum valor recebido ainda');

  _finGrupoMes(m.recebidos).forEach(function(g) {
    h += '<div class="fin-mes-hd"><span>' + g.label + '</span><span class="grn">R$ ' + fm(g.total) + '</span></div>';
    h += '<div class="fin-list">';
    g.items.forEach(function(t) { h += _finRow(t, m.hoje); });
    h += '</div>';
  });
  return h;
}

// ── A RECEBER ──
function _finAReceber(m) {
  var h    = '';
  var hoje = m.hoje;
  var atras = m.pendentes.filter(function(t) { return t.date && t.date < hoje; });
  var futur = m.pendentes.filter(function(t) { return !t.date || t.date >= hoje; });

  h += '<div class="fin-hd-blk yel-blk">';
  h += '<div><div class="fin-hd-lbl">Total Pendente</div><div class="fin-hd-val yel">R$ ' + fm(m.totalPendente) + '</div></div>';
  h += '<div><div class="fin-hd-lbl">Em Atraso</div><div class="fin-hd-val red">R$ ' + fm(m.totalAtrasado) + '</div></div>';
  h += '</div>';
  h += '<div class="fin-add-btn-wrap"><button class="fin-add-btn fin-add-yel" data-qa="pend">+ Nova Pendência</button></div>';

  if (!m.pendentes.length) return h + _finEmpty('Nenhuma pendência — tudo recebido! ✅');

  if (atras.length) {
    h += '<div class="fin-mes-hd fin-mes-red"><span>⚠️ Atrasados</span><span class="red">R$ ' + fm(m.totalAtrasado) + '</span></div>';
    h += '<div class="fin-list">';
    atras.forEach(function(t) { h += _finRow(t, hoje, true); });
    h += '</div>';
  }
  if (futur.length) {
    _finGrupoMes(futur).forEach(function(g) {
      h += '<div class="fin-mes-hd fin-mes-yel"><span>📅 ' + g.label + '</span><span class="yel">R$ ' + fm(g.total) + '</span></div>';
      h += '<div class="fin-list">';
      g.items.forEach(function(t) { h += _finRow(t, hoje); });
      h += '</div>';
    });
  }
  return h;
}

// ── DESPESAS ──
function _finDespesas(m) {
  var h = '';
  h += '<div class="fin-hd-blk red-blk">';
  h += '<div><div class="fin-hd-lbl">Total Despesas</div><div class="fin-hd-val red">R$ ' + fm(m.totalDespesas) + '</div></div>';
  h += '</div>';
  h += '<div class="fin-add-btn-wrap"><button class="fin-add-btn fin-add-red" data-qa="out">+ Nova Despesa</button></div>';

  if (!m.despesas.length) return h + _finEmpty('Nenhuma despesa lançada');

  _finGrupoMes(m.despesas).forEach(function(g) {
    h += '<div class="fin-mes-hd fin-mes-red"><span>' + g.label + '</span><span class="red">R$ ' + fm(g.total) + '</span></div>';
    h += '<div class="fin-list">';
    g.items.forEach(function(t) { h += _finRow(t, m.hoje); });
    h += '</div>';
  });
  return h;
}

// ── CAIXA ──
function _finCaixa(m) {
  var h = '';
  var todos = (DB.t || []).filter(function(t) { return t.date && t.value && (t.type === 'in' || t.type === 'out'); });

  if (!todos.length) return _finEmpty('Nenhuma movimentação no caixa ainda');

  // Agrupar por data
  var porDia = {}, ordemDia = [];
  todos.forEach(function(t) {
    if (!porDia[t.date]) { porDia[t.date] = []; ordemDia.push(t.date); }
    porDia[t.date].push(t);
  });
  var datasUnicas = ordemDia.filter(function(v, i) { return ordemDia.indexOf(v) === i; })
                             .sort(function(a, b) { return b.localeCompare(a); });

  // Saldo total
  var saldoCaixa = todos.reduce(function(s, t) {
    return s + (t.type === 'in' ? t.value : -t.value);
  }, 0);

  h += '<div class="fin-hd-blk">';
  h += '<div><div class="fin-hd-lbl">Saldo do Caixa</div><div class="fin-hd-val ' + (saldoCaixa >= 0 ? 'grn' : 'red') + '">R$ ' + fm(saldoCaixa) + '</div></div>';
  h += '<div><div class="fin-hd-lbl">Dias com mov.</div><div class="fin-hd-val">' + datasUnicas.length + '</div></div>';
  h += '</div>';

  datasUnicas.forEach(function(data) {
    var items = porDia[data];
    var ent   = items.filter(function(t) { return t.type === 'in'; }).reduce(function(s, t) { return s + t.value; }, 0);
    var sai   = items.filter(function(t) { return t.type === 'out'; }).reduce(function(s, t) { return s + t.value; }, 0);
    var saldoD = ent - sai;
    var isHoje = data === m.hoje;

    h += '<div class="fin-dia-hd' + (isHoje ? ' fin-dia-hoje' : '') + '">';
    h += '<div class="fin-dia-dt">' + fd(data) + (isHoje ? '<span class="fin-hoje-tag">HOJE</span>' : '') + '</div>';
    h += '<div class="fin-dia-saldo">';
    if (ent) h += '<span class="grn-sm">+' + fm(ent) + '</span>';
    if (sai) h += '<span class="red-sm"> −' + fm(sai) + '</span>';
    h += '<span class="' + (saldoD >= 0 ? 'grn' : 'red') + '-sm"> = ' + fm(saldoD) + '</span>';
    h += '</div></div>';
    h += '<div class="fin-list">';
    items.forEach(function(t) { h += _finRow(t, m.hoje); });
    h += '</div>';
  });
  return h;
}

// ═══ HELPERS ═══

function _finCard(icon, label, val, color) {
  return '<div class="fin-card6">'
    + '<div class="fin-card6-i">' + icon + '</div>'
    + '<div class="fin-card6-lbl">' + label + '</div>'
    + '<div class="fin-card6-val ' + (color||'') + '">R$ ' + val + '</div>'
    + '</div>';
}

function _finQA(type, icon, name, sub) {
  return '<div class="fin-qa-item" data-qa="' + type + '">'
    + '<div class="fin-qa-i fin-qa-' + type + '">' + icon + '</div>'
    + '<div><div class="fin-qa-nm">' + name + '</div><div class="fin-qa-sub">' + sub + '</div></div>'
    + '</div>';
}

function _finRowParseDesc(desc) {
  var result = { op: desc || '', client: '', service: '', raw: desc || '' };
  if (!desc) return result;
  var m = desc.match(/^(.+?)\s+—\s+(.+?)(?:\s+\((.+?)\))?$/);
  if (m) {
    result.op      = m[1].trim();
    result.client  = m[2].trim();
    result.service = m[3] ? m[3].trim() : '';
  }
  return result;
}

function _finRow(t, hoje, forceAtrasado) {
  var isAtras = (forceAtrasado || (t.type === 'pend' && t.date && t.date < hoje));
  var icons   = { in:'📈', out:'📉', note:'📝', pend:'⏳' };
  var sign    = t.type === 'in' ? '+' : t.type === 'out' ? '−' : '';
  var icon    = icons[t.type] || '·';
  var p       = _finRowParseDesc(t.desc);

  var h = '<div class="fin-row' + (isAtras ? ' fin-row-atras' : '') + '">';
  h += '<div class="fin-dot fin-dot-' + (isAtras ? 'red' : t.type) + '">' + icon + '</div>';
  h += '<div class="fin-row-body">';

  if (p.client) {
    h += '<div class="fin-row-cli">' + p.client + '</div>';
    var sub = p.op;
    if (p.service) sub += ' <span class="fin-row-svc">· ' + p.service + '</span>';
    h += '<div class="fin-row-sub">' + sub + '</div>';
  } else {
    h += '<div class="fin-row-cli">' + (p.raw || '') + '</div>';
  }

  h += '<div class="fin-row-dt">' + (t.date ? fd(t.date) : '');
  if (isAtras) h += ' <span class="fin-tag-atras">ATRASADO</span>';
  h += '</div>';
  h += '</div>';
  h += '<div class="fin-row-right">';
  h += '<div class="fin-row-val fin-val-' + t.type + '">' + (t.value ? sign + 'R$ ' + fm(t.value) : '') + '</div>';
  if (t.type === 'pend' && t.value) {
    h += '<button class="fin-receber" onclick="receberPend(' + t.id + ')" title="Marcar como recebido">✓</button>';
  }
  h += '<button class="fin-edit" data-edittr="' + t.id + '">✏️</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

function _finGrupoMes(list) {
  var meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
  var grupos = {}, ordem = [];
  list.forEach(function(t) {
    var k = (t.date || '9999-12').slice(0, 7);
    if (!grupos[k]) { grupos[k] = { items:[], total:0, key:k }; ordem.push(k); }
    grupos[k].items.push(t);
    grupos[k].total += (t.value || 0);
  });
  var unico = ordem.filter(function(v, i) { return ordem.indexOf(v) === i; })
                   .sort(function(a, b) { return b.localeCompare(a); });
  return unico.map(function(k) {
    var g = grupos[k], p = k.split('-');
    g.label = meses[parseInt(p[1], 10) - 1] + ' ' + p[0];
    return g;
  });
}

function _finEmpty(msg) {
  return '<div class="fin-empty">' + msg + '</div>';
}

// ═══ CUSTOS FIXOS ═══
function renderFixos() {
  var el = document.getElementById('fixosCard');
  if (!el) return;
  var tot = 0, h = '';
  (CFG && CFG.fixos || []).forEach(function(f) {
    tot += f.v;
    h += '<div class="fin-fixo-row"><span class="fin-fixo-nm">' + f.n + '</span><span class="fin-fixo-vl">R$ ' + fm(f.v) + '</span></div>';
  });
  h += '<div class="fin-fixo-tot"><span>Total Mensal</span><span class="fin-fixo-tot-val">R$ ' + fm(tot) + '</span></div>';
  el.innerHTML = h;
}

// ══════════════════════════════════════════════════════════════
// PAINEL DE SAÚDE FINANCEIRA
// ══════════════════════════════════════════════════════════════

function _sfGetConfig() {
  if (!CFG.saudeFinanceira) {
    CFG.saudeFinanceira = {
      metaFaturamento: 0,
      reservaEmergencia: 3, // meses
      orcamentoVariavel: 0  // limite mensal p/ custos variáveis
    };
    svCFG();
  }
  return CFG.saudeFinanceira;
}

function renderSaudeFinanceira() {
  var el = document.getElementById('saudeFinCard');
  if (!el) return;

  var sf    = _sfGetConfig();
  var hoje  = td();
  var mes   = hoje.slice(0, 7);
  var fixos = (CFG.fixos || []).reduce(function(s, f) { return s + (f.v || 0); }, 0);
  var vars  = (CFG.variaveis || []).reduce(function(s, f) { return s + (f.v || 0); }, 0);
  var totalCustos = fixos + vars;

  // Dados do mês atual
  var recMes = (DB.t || [])
    .filter(function(t) { return t.type === 'in' && (t.date || '').slice(0,7) === mes; })
    .reduce(function(s, t) { return s + (t.value || 0); }, 0);

  var despMes = (DB.t || [])
    .filter(function(t) { return t.type === 'out' && (t.date || '').slice(0,7) === mes; })
    .reduce(function(s, t) { return s + (t.value || 0); }, 0);

  var pendMes = (DB.t || [])
    .filter(function(t) { return t.type === 'pend'; })
    .reduce(function(s, t) { return s + (t.value || 0); }, 0);

  var saldoMes      = recMes - despMes;
  var metaFat       = sf.metaFaturamento || 0;
  var pctMeta       = metaFat > 0 ? Math.min(100, Math.round((recMes / metaFat) * 100)) : 0;
  var faltaMeta     = Math.max(0, metaFat - recMes - pendMes);
  var pontoPequilibrio = totalCustos;
  var lucroMes      = recMes - despMes - fixos;
  var orcVar        = sf.orcamentoVariavel || 0;
  var gastoVar      = (DB.t || [])
    .filter(function(t) { return t.type === 'out' && (t.date || '').slice(0,7) === mes && t.isVariavel; })
    .reduce(function(s, t) { return s + (t.value || 0); }, 0);

  // ── Semáforo de saúde ──
  var saude, saudeCor, saudeMsg;
  if (recMes >= pontoPequilibrio * 1.3) {
    saude = '🟢'; saudeCor = 'var(--grn)';
    saudeMsg = 'Mês saudável — cobrindo custos com folga';
  } else if (recMes >= pontoPequilibrio) {
    saude = '🟡'; saudeCor = '#d4a017';
    saudeMsg = 'Mês equilibrado — custos cobertos';
  } else if (recMes + pendMes >= pontoPequilibrio) {
    saude = '🟠'; saudeCor = '#e07820';
    saudeMsg = 'Depende de recebimentos pendentes para fechar';
  } else {
    saude = '🔴'; saudeCor = 'var(--red)';
    saudeMsg = 'Atenção — faturamento abaixo do ponto de equilíbrio';
  }

  // ── Distribuição inteligente do saldo ──
  var saldoDisp   = Math.max(0, recMes);
  var reserva     = Math.round(saldoDisp * 0.10);
  var custosCobertos = Math.min(saldoDisp, fixos + vars);
  var sobra       = Math.max(0, saldoDisp - custosCobertos - reserva);

  var h = '';

  // Semáforo
  h += '<div style="display:flex;align-items:center;gap:10px;padding:14px 14px 0;">';
  h += '<span style="font-size:1.5rem;">' + saude + '</span>';
  h += '<div>';
  h += '<div style="font-size:.82rem;font-weight:700;color:' + saudeCor + ';">' + saudeMsg + '</div>';
  h += '<div style="font-size:.65rem;color:var(--t3);margin-top:2px;">Mês atual · ' + mes.replace('-','/') + '</div>';
  h += '</div></div>';

  // ── Ponto de equilíbrio ──
  h += '<div class="sf-section">';
  h += '<div class="sf-title">⚖️ Ponto de Equilíbrio</div>';
  h += '<div class="sf-eq-row">';
  h += '<div class="sf-eq-item"><div class="sf-eq-val" style="color:var(--red);">R$ ' + fm(totalCustos) + '</div><div class="sf-eq-lbl">Precisar faturar/mês</div></div>';
  h += '<div class="sf-eq-sep">→</div>';
  h += '<div class="sf-eq-item"><div class="sf-eq-val" style="color:' + (recMes >= totalCustos ? 'var(--grn)' : '#e07820') + ';">R$ ' + fm(recMes) + '</div><div class="sf-eq-lbl">Faturado este mês</div></div>';
  h += '</div>';
  if (pontoPequilibrio > 0) {
    var pctEq = Math.min(100, Math.round((recMes / pontoPequilibrio) * 100));
    h += '<div class="sf-bar-wrap"><div class="sf-bar-fill" style="width:' + pctEq + '%;background:' + (pctEq >= 100 ? 'var(--grn)' : pctEq >= 70 ? '#d4a017' : 'var(--red)') + ';"></div></div>';
    h += '<div style="font-size:.63rem;color:var(--t3);text-align:right;margin-top:3px;">' + pctEq + '% do ponto de equilíbrio</div>';
  }
  h += '</div>';

  // ── Meta de faturamento ──
  h += '<div class="sf-section">';
  h += '<div class="sf-title" style="display:flex;justify-content:space-between;align-items:center;">';
  h += '<span>🎯 Meta do Mês</span>';
  h += '<button class="sf-edit-btn" onclick="sfEditMeta()">editar</button>';
  h += '</div>';
  if (metaFat > 0) {
    h += '<div class="sf-eq-row">';
    h += '<div class="sf-eq-item"><div class="sf-eq-val" style="color:var(--gold2);">R$ ' + fm(metaFat) + '</div><div class="sf-eq-lbl">Meta</div></div>';
    h += '<div class="sf-eq-sep">·</div>';
    h += '<div class="sf-eq-item"><div class="sf-eq-val" style="color:var(--grn);">R$ ' + fm(recMes) + '</div><div class="sf-eq-lbl">Realizado</div></div>';
    h += '<div class="sf-eq-sep">·</div>';
    h += '<div class="sf-eq-item"><div class="sf-eq-val" style="color:#6ab0ff;">R$ ' + fm(pendMes) + '</div><div class="sf-eq-lbl">Pendente</div></div>';
    h += '</div>';
    h += '<div class="sf-bar-wrap"><div class="sf-bar-fill" style="width:' + pctMeta + '%;background:var(--gold2);"></div></div>';
    h += '<div style="font-size:.63rem;color:var(--t3);text-align:right;margin-top:3px;">' + pctMeta + '% da meta';
    if (faltaMeta > 0) h += ' · faltam R$ ' + fm(faltaMeta);
    else h += ' · ✅ Meta batida!';
    h += '</div>';
  } else {
    h += '<div class="sf-hint" onclick="sfEditMeta()">Toque para definir sua meta de faturamento mensal →</div>';
  }
  h += '</div>';

  // ── Distribuição do dinheiro ──
  h += '<div class="sf-section">';
  h += '<div class="sf-title">💡 Como distribuir o que entrou</div>';
  if (recMes > 0) {
    var pctCusto = Math.min(100, Math.round((custosCobertos / recMes) * 100));
    var pctRes   = Math.round((reserva / recMes) * 100);
    var pctSobra = Math.max(0, 100 - pctCusto - pctRes);
    h += '<div class="sf-dist-row">';
    h += _sfDistItem('🏗️', 'Cobrir custos', custosCobertos, pctCusto, '#c94444');
    h += _sfDistItem('🛡️', 'Reserva (10%)', reserva, pctRes, '#d4a017');
    h += _sfDistItem('💰', 'Lucro livre', sobra, pctSobra, 'var(--grn)');
    h += '</div>';
    h += '<div class="sf-dist-bar">';
    h += '<div style="flex:' + pctCusto + ';background:#c94444;border-radius:4px 0 0 4px;"></div>';
    h += '<div style="flex:' + pctRes + ';background:#d4a017;"></div>';
    h += '<div style="flex:' + Math.max(1, pctSobra) + ';background:var(--grn);border-radius:0 4px 4px 0;"></div>';
    h += '</div>';
  } else {
    h += '<div class="sf-hint">Nenhuma entrada neste mês ainda.</div>';
  }
  h += '</div>';

  // ── Custos variáveis ──
  h += '<div class="sf-section">';
  h += '<div class="sf-title" style="display:flex;justify-content:space-between;align-items:center;">';
  h += '<span>🚗 Custos Variáveis</span>';
  h += '<button class="sf-edit-btn" onclick="sfEditVars()">editar</button>';
  h += '</div>';
  var varList = CFG.variaveis || [];
  if (varList.length) {
    varList.forEach(function(v) {
      h += '<div class="fin-fixo-row"><span class="fin-fixo-nm">' + v.n + '</span><span class="fin-fixo-vl" style="color:#d4a017;">≈ R$ ' + fm(v.v) + '/mês</span></div>';
    });
    h += '<div class="fin-fixo-tot"><span>Estimativa Mensal</span><span class="fin-fixo-tot-val" style="color:#d4a017;">R$ ' + fm(vars) + '</span></div>';
  } else {
    h += '<div class="sf-hint" onclick="sfEditVars()">Cadastre combustível, materiais, frete etc →</div>';
  }
  h += '</div>';

  // ── Alertas ──
  var alertas = _sfAlertas(recMes, despMes, fixos, vars, orcVar, gastoVar, saldoMes, pendMes);
  if (alertas.length) {
    h += '<div class="sf-section">';
    h += '<div class="sf-title">⚠️ Alertas do Mês</div>';
    alertas.forEach(function(a) { h += '<div class="sf-alerta sf-alerta-' + a.tipo + '">' + a.msg + '</div>'; });
    h += '</div>';
  }

  el.innerHTML = h;
}

function _sfDistItem(icon, label, val, pct, cor) {
  return '<div class="sf-dist-item">'
    + '<div style="font-size:.95rem;">' + icon + '</div>'
    + '<div style="font-size:.68rem;color:var(--t3);">' + label + '</div>'
    + '<div style="font-size:.79rem;font-weight:700;color:' + cor + ';">R$ ' + fm(val) + '</div>'
    + '<div style="font-size:.6rem;color:var(--t4);">' + pct + '%</div>'
    + '</div>';
}

function _sfAlertas(recMes, despMes, fixos, vars, orcVar, gastoVar, saldoMes, pendMes) {
  var alertas = [];
  var totalCustos = fixos + vars;

  if (recMes < totalCustos && recMes + pendMes < totalCustos) {
    alertas.push({ tipo: 'red', msg: '🔴 Faturamento + pendentes abaixo dos custos totais este mês.' });
  } else if (recMes < totalCustos) {
    alertas.push({ tipo: 'yel', msg: '🟡 Faturamento ainda não cobre os custos — mas há pendentes a receber.' });
  }

  if (despMes > recMes * 0.4) {
    alertas.push({ tipo: 'yel', msg: '🟡 Despesas avulsas acima de 40% do faturamento (' + Math.round(despMes/recMes*100) + '%).' });
  }

  if (orcVar > 0 && gastoVar > orcVar) {
    alertas.push({ tipo: 'red', msg: '🔴 Custos variáveis ultrapassaram o orçamento (R$ ' + fm(gastoVar) + ' de R$ ' + fm(orcVar) + ').' });
  } else if (orcVar > 0 && gastoVar > orcVar * 0.8) {
    alertas.push({ tipo: 'yel', msg: '🟡 Custos variáveis em 80% do limite (R$ ' + fm(gastoVar) + ' de R$ ' + fm(orcVar) + ').' });
  }

  if (saldoMes < 0) {
    alertas.push({ tipo: 'red', msg: '🔴 Saldo do mês negativo — saídas maiores que entradas.' });
  }

  return alertas;
}

// ── Editar meta ──
function sfEditMeta() {
  var sf  = _sfGetConfig();
  var val = prompt('Meta de faturamento mensal (R$):', sf.metaFaturamento || '');
  if (val === null) return;
  sf.metaFaturamento = +val || 0;
  svCFG();
  renderSaudeFinanceira();
}

// ── Editar custos variáveis ──
function sfEditVars() {
  if (!CFG.variaveis) CFG.variaveis = [];
  var el = document.getElementById('sfVarMd');
  if (!el) {
    // Cria modal inline
    var md = document.createElement('div');
    md.id = 'sfVarMd';
    md.className = 'ov';
    md.style.cssText = 'align-items:flex-end;';
    md.innerHTML = '<div style="background:var(--s2);border-top:1px solid var(--bd);border-radius:20px 20px 0 0;width:100%;max-width:460px;padding:22px 22px 40px;">'
      + '<div style="font-size:1rem;font-weight:700;color:var(--gold2);margin-bottom:14px;">🚗 Custos Variáveis</div>'
      + '<div id="sfVarList"></div>'
      + '<button class="cfgadd" style="margin-top:10px;" onclick="sfAddVar()">+ Adicionar</button>'
      + '<div style="display:flex;gap:10px;margin-top:16px;">'
      + '<button class="fin-add-btn fin-add-grn" style="flex:1;" onclick="sfSaveVars()">Salvar</button>'
      + '<button class="fin-add-btn" style="flex:1;background:var(--s3);" onclick="closeAll()">Cancelar</button>'
      + '</div></div>';
    document.body.appendChild(md);
  }
  _sfRenderVarList();
  showMd('sfVarMd');
}

function _sfRenderVarList() {
  var el = document.getElementById('sfVarList');
  if (!el) return;
  var h = '';
  (CFG.variaveis || []).forEach(function(v, i) {
    h += '<div class="cfg-row">'
      + '<input class="cfginp" value="' + v.n + '" style="flex:1;text-align:left;" placeholder="Ex: Combustível" onchange="CFG.variaveis[' + i + '].n=this.value;">'
      + '<input class="cfginp cfginp-w" type="number" value="' + v.v + '" placeholder="R$" onchange="CFG.variaveis[' + i + '].v=+this.value;">'
      + '<button class="cfgdel" onclick="CFG.variaveis.splice(' + i + ',1);_sfRenderVarList();">✕</button>'
      + '</div>';
  });
  if (!CFG.variaveis || !CFG.variaveis.length) {
    h = '<div style="font-size:.75rem;color:var(--t3);padding:8px 0;">Nenhum custo variável cadastrado.</div>';
  }
  el.innerHTML = h;
}

function sfAddVar() {
  if (!CFG.variaveis) CFG.variaveis = [];
  CFG.variaveis.push({ n: '', v: 0 });
  _sfRenderVarList();
}

function sfSaveVars() {
  svCFG();
  closeAll();
  renderSaudeFinanceira();
  renderFixos();
  toast('✓ Custos variáveis salvos!');
}
