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
      ? 'R$ ' + fm(totalPendente) + ' a receber · ' + (atrasados.length ? atrasados.length + ' em atraso' : 'sem atrasos')
      : 'Sem pendências';
  }

  window._finMetrics = {
    saldoReal, totalRecebido, totalDespesas, totalPendente,
    lucro: saldoReal, recebidoHoje, recebidoMes,
    totalAtrasado, recebidos, despesas, pendentes, atrasados, hoje, mesAtual
  };

  renderFinBody();
  renderFixos();
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

function _finRow(t, hoje, forceAtrasado) {
  var isAtras = (forceAtrasado || (t.type === 'pend' && t.date && t.date < hoje));
  var icons   = { in:'📈', out:'📉', note:'📝', pend:'⏳' };
  var sign    = t.type === 'in' ? '+' : t.type === 'out' ? '−' : '';
  var icon    = icons[t.type] || '·';

  var h = '<div class="fin-row' + (isAtras ? ' fin-row-atras' : '') + '">';
  h += '<div class="fin-dot fin-dot-' + (isAtras ? 'red' : t.type) + '">' + icon + '</div>';
  h += '<div class="fin-row-body">';
  h += '<div class="fin-row-desc">' + (t.desc || '') + '</div>';
  h += '<div class="fin-row-dt">' + (t.date ? fd(t.date) : '');
  if (isAtras) h += ' <span class="fin-tag-atras">ATRASADO</span>';
  h += '</div></div>';
  h += '<div class="fin-row-val fin-val-' + t.type + '">' + (t.value ? sign + 'R$ ' + fm(t.value) : '') + '</div>';
  if (t.type === 'pend' && t.value) {
    h += '<button class="fin-receber" onclick="receberPend(' + t.id + ')" title="Marcar como recebido">✓</button>';
  }
  h += '<button class="fin-edit" data-edittr="' + t.id + '">✏️</button>';
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
