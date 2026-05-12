// ══════════════════════════════════════════════════════════════════════
// MÓDULO BOLETOS — Gestão Financeira Empresarial Completa
// HR Mármores e Granitos ERP v5
// Controla: A Receber | A Pagar | Vencidos | Empresa | Fornecedores
// ══════════════════════════════════════════════════════════════════════

var _editBoletoId   = null;
var _bTipoAtual     = 'receber';
var _bFiltroAtual   = 'todos';
var _bBusca         = '';

// ── Categorias com ícones ─────────────────────────────────────────────
var B_CAT = {
  parcela:     { icon:'📋', label:'Parcela',        tipo:'receber' },
  saldo:       { icon:'💰', label:'Saldo Restante', tipo:'receber' },
  cobranca:    { icon:'📄', label:'Cobrança',       tipo:'receber' },
  entrada:     { icon:'📥', label:'Entrada',        tipo:'receber' },
  energia:     { icon:'⚡', label:'Energia',        tipo:'pagar'   },
  agua:        { icon:'💧', label:'Água',           tipo:'pagar'   },
  aluguel:     { icon:'🏠', label:'Aluguel',        tipo:'pagar'   },
  fornecedor:  { icon:'🏭', label:'Fornecedor',     tipo:'pagar'   },
  funcionario: { icon:'👷', label:'Funcionário',    tipo:'pagar'   },
  ferramentas: { icon:'🔧', label:'Ferramentas',    tipo:'pagar'   },
  material:    { icon:'🪨', label:'Material',       tipo:'pagar'   },
  imposto:     { icon:'🏛️',  label:'Imposto',       tipo:'pagar'   },
  servico:     { icon:'🤝', label:'Serviço',        tipo:'pagar'   },
  outros_pagar:{ icon:'📦', label:'Outros',         tipo:'pagar'   }
};

var B_STATUS = {
  pendente: { emoji:'🟡', label:'Pendente',  cls:'bs-pend' },
  pago:     { emoji:'🟢', label:'Pago',      cls:'bs-pago' },
  vencido:  { emoji:'🔴', label:'Vencido',   cls:'bs-venc' },
  cancelado:{ emoji:'⚫', label:'Cancelado', cls:'bs-canc' }
};

var B_FPAG = {
  pix:'PIX', boleto:'Boleto', dinheiro:'Dinheiro',
  transferencia:'Transferência', cartao:'Cartão', cheque:'Cheque'
};

// ══════════════════════════════════════════════════════════════════════
// AUTO-STATUS: atualiza boletos vencidos automaticamente
// ══════════════════════════════════════════════════════════════════════
function bAutoStatus() {
  var hoje = td();
  var changed = false;
  (DB.b || []).forEach(function(b) {
    if (b.status === 'pendente' && b.venc && b.venc < hoje) {
      b.status = 'vencido';
      changed = true;
    }
  });
  if (changed) DB.sv();
}

// ══════════════════════════════════════════════════════════════════════
// MÉTRICAS
// ══════════════════════════════════════════════════════════════════════
function bMetrics() {
  bAutoStatus();
  var hoje = td();
  var em3 = addD(hoje, 3);
  var b = DB.b || [];

  var aReceber   = b.filter(function(x){return x.tipo==='receber'&&x.status==='pendente';});
  var aPagar     = b.filter(function(x){return x.tipo==='pagar'  &&x.status==='pendente';});
  var vencRec    = b.filter(function(x){return x.tipo==='receber'&&x.status==='vencido';});
  var vencPag    = b.filter(function(x){return x.tipo==='pagar'  &&x.status==='vencido';});
  var pagos      = b.filter(function(x){return x.status==='pago';});
  var alertas    = b.filter(function(x){return (x.status==='pendente')&&x.venc&&x.venc<=em3&&x.venc>=hoje;});

  function soma(arr) { return arr.reduce(function(s,x){return s+(x.valor||0);},0); }

  return {
    totalAReceber: soma(aReceber),
    totalAPagar:   soma(aPagar),
    totalVencRec:  soma(vencRec),
    totalVencPag:  soma(vencPag),
    totalPagos:    soma(pagos),
    countAReceber: aReceber.length,
    countAPagar:   aPagar.length,
    countVencRec:  vencRec.length,
    countVencPag:  vencPag.length,
    countAlertas:  alertas.length,
    alertas:       alertas,
    saldoLiquido:  soma(aReceber) - soma(aPagar),
    inadimplencia: soma(vencRec)
  };
}

// ══════════════════════════════════════════════════════════════════════
// RENDER PRINCIPAL — TAB NO FINANCEIRO
// ══════════════════════════════════════════════════════════════════════
function renderBoletosTab() {
  bAutoStatus();
  var m = bMetrics();
  var h = '';

  // ── HERO CARDS ──
  h += '<div class="b-hero-grid">';
  h += _bCard('📥', 'A Receber',  m.totalAReceber, 'grn', m.countAReceber + ' boleto(s)');
  h += _bCard('📤', 'A Pagar',    m.totalAPagar,   'red', m.countAPagar + ' boleto(s)');
  h += _bCard('⚠️', 'Vencidos',   m.totalVencRec,  'red', m.countVencRec + ' em atraso');
  h += _bCard('💰', 'Saldo Prev.', m.saldoLiquido,  m.saldoLiquido>=0?'grn':'red', 'receber − pagar');
  h += '</div>';

  // ── ALERTAS ──
  if (m.alertas.length) {
    h += '<div class="b-alerta">';
    h += '<span class="b-alerta-icon">🔔</span>';
    h += '<div><div class="b-alerta-title">' + m.alertas.length + ' boleto(s) vencem em até 3 dias</div>';
    h += '<div class="b-alerta-nomes">' + m.alertas.slice(0,3).map(function(b){return (b.cli||b.desc);}).join(' · ') + '</div></div>';
    h += '</div>';
  }
  if (m.countVencRec > 0 || m.countVencPag > 0) {
    h += '<div class="b-alerta b-alerta-red">';
    h += '<span class="b-alerta-icon">🔴</span>';
    h += '<div><div class="b-alerta-title">Inadimplência: R$ ' + fm(m.inadimplencia) + '</div>';
    h += '<div class="b-alerta-nomes">' + m.countVencRec + ' recebimentos · ' + m.countVencPag + ' pagamentos vencidos</div></div>';
    h += '</div>';
  }

  // ── BUSCA + ADD ──
  h += '<div class="b-toolbar">';
  h += '<input class="b-search" id="bSearchIn" type="text" placeholder="🔍 Buscar cliente, descrição..." value="' + (_bBusca||'') + '" oninput="_bBusca=this.value;_bRerender()">';
  h += '<button class="btn btn-g" onclick="openNovoBoleto()" style="white-space:nowrap;font-size:.72rem;padding:9px 12px;">+ Boleto</button>';
  h += '</div>';

  // ── SUBTABS ──
  var subtabs = [
    {k:'todos',       l:'Todos'},
    {k:'areceber',    l:'📥 A Receber'},
    {k:'apagar',      l:'📤 A Pagar'},
    {k:'vencidos',    l:'🔴 Vencidos'},
    {k:'empresa',     l:'🏢 Empresa'},
    {k:'fornecedores',l:'🏭 Fornec.'},
    {k:'parcelamentos',l:'📋 Parcelas'}
  ];
  h += '<div class="b-subtabs">';
  subtabs.forEach(function(t){
    h += '<div class="b-stab' + (_bFiltroAtual===t.k?' on':'') + '" data-bfiltro="' + t.k + '">' + t.l + '</div>';
  });
  h += '</div>';

  // ── LISTA ──
  h += '<div class="b-list">' + _bLista() + '</div>';

  return h;
}

function _bRerender() {
  var body = document.getElementById('finBody');
  if (body && _finTab === 'boletos') body.innerHTML = renderBoletosTab();
}

function bSetFiltro(f) {
  _bFiltroAtual = f;
  _bRerender();
}

function _bLista() {
  var hoje = td();
  var b = DB.b || [];
  var busca = (_bBusca || '').toLowerCase();

  // Filter by subtab
  var filtrado = b.filter(function(x) {
    if (_bFiltroAtual === 'areceber')    return x.tipo === 'receber' && x.status === 'pendente';
    if (_bFiltroAtual === 'apagar')      return x.tipo === 'pagar'   && x.status === 'pendente';
    if (_bFiltroAtual === 'vencidos')    return x.status === 'vencido';
    if (_bFiltroAtual === 'empresa')     return x.tipo === 'pagar';
    if (_bFiltroAtual === 'fornecedores')return x.cat === 'fornecedor';
    if (_bFiltroAtual === 'parcelamentos')return x.cat === 'parcela' || x.cat === 'saldo';
    return true;
  });

  // Filter by search
  if (busca) {
    filtrado = filtrado.filter(function(x) {
      return (x.cli||'').toLowerCase().indexOf(busca) >= 0 ||
             (x.desc||'').toLowerCase().indexOf(busca) >= 0 ||
             (x.cat||'').toLowerCase().indexOf(busca) >= 0;
    });
  }

  // Sort: vencidos first, then by date
  filtrado.sort(function(a, b) {
    var pa = a.status==='vencido'?0:a.status==='pendente'?1:2;
    var pb = b.status==='vencido'?0:b.status==='pendente'?1:2;
    if (pa !== pb) return pa - pb;
    return (a.venc||'').localeCompare(b.venc||'');
  });

  if (!filtrado.length) return '<div class="b-empty">Nenhum boleto encontrado</div>';

  var h = '';
  filtrado.forEach(function(bol) {
    h += _bRow(bol, hoje);
  });
  return h;
}

function _bRow(b, hoje) {
  var st = B_STATUS[b.status] || B_STATUS.pendente;
  var cat = B_CAT[b.cat] || { icon:'📄', label: b.cat || '' };
  var diff = b.venc ? dDiff(b.venc) : null;
  var diasTxt = '';
  if (diff !== null && b.status === 'pendente') {
    if (diff < 0)      diasTxt = '<span class="b-dias red">' + Math.abs(diff) + 'd atrasado</span>';
    else if (diff === 0) diasTxt = '<span class="b-dias red">Vence hoje!</span>';
    else if (diff <= 3)  diasTxt = '<span class="b-dias yel">' + diff + 'd</span>';
    else                 diasTxt = '<span class="b-dias muted">' + diff + 'd</span>';
  }

  return '<div class="b-row ' + st.cls + '" data-openboleto="' + b.id + '">' +
    '<div class="b-row-left">' +
    '<span class="b-row-icon">' + cat.icon + '</span>' +
    '<div class="b-row-info">' +
    '<div class="b-row-cli">' + escH(b.cli || b.desc || '—') + (b.parc ? ' <span class="b-parc-tag">' + escH(b.parc) + '</span>' : '') + '</div>' +
    '<div class="b-row-desc">' + escH(b.desc || '') + '</div>' +
    '<div class="b-row-meta">' +
    '<span class="b-status-badge ' + st.cls + '">' + st.emoji + ' ' + st.label + '</span>' +
    (b.venc ? '<span class="b-venc">' + fd(b.venc) + '</span>' : '') +
    diasTxt +
    '</div>' +
    '</div></div>' +
    '<div class="b-row-right">' +
    '<div class="b-row-val ' + (b.tipo==='receber'?'grn':'red') + '">' +
    (b.tipo==='receber'?'+':'−') + ' R$ ' + fm(b.valor || 0) +
    '</div>' +
    '<div class="b-row-fpag">' + (B_FPAG[b.fpag] || b.fpag || '') + '</div>' +
    '</div>' +
    '</div>';
}

function _bCard(icon, label, val, color, sub) {
  return '<div class="b-hero-card">' +
    '<div class="b-hero-icon">' + icon + '</div>' +
    '<div class="b-hero-lbl">' + label + '</div>' +
    '<div class="b-hero-val ' + (color||'') + '">R$ ' + fm(val||0) + '</div>' +
    '<div class="b-hero-sub">' + sub + '</div>' +
    '</div>';
}

// ══════════════════════════════════════════════════════════════════════
// ABRIR / FECHAR MODAL
// ══════════════════════════════════════════════════════════════════════
function openNovoBoleto() {
  _editBoletoId = null;
  var el = document.getElementById('boletoMdTitle');
  if (el) el.textContent = 'Novo Boleto';
  // Reset form
  _bFormSet({ tipo:'receber', cat:'parcela', cli:'', desc:'', valor:'',
    venc: addD(td(), 30), parc:'', fpag:'pix', status:'pendente', obs:'' });
  bSetTipo('receber');
  showMd('boletoMd');
}

function editBoleto(id) {
  var b = (DB.b||[]).find(function(x){return x.id===id;});
  if (!b) return;
  _editBoletoId = id;
  var el = document.getElementById('boletoMdTitle');
  if (el) el.textContent = 'Editar Boleto';
  _bFormSet(b);
  bSetTipo(b.tipo || 'receber');
  showMd('boletoMd');
}

function _bFormSet(b) {
  var s = function(id, v) { var el=document.getElementById(id); if(el)el.value=v||''; };
  s('bCat', b.cat || 'parcela');
  s('bCli', b.cli || '');
  s('bDesc', b.desc || '');
  s('bValor', b.valor || '');
  s('bVenc', b.venc || '');
  s('bParc', b.parc || '');
  s('bFpag', b.fpag || 'pix');
  s('bStatus', b.status || 'pendente');
  s('bObs', b.obs || '');
}

function bSetTipo(tipo) {
  _bTipoAtual = tipo;
  document.querySelectorAll('[data-btipo]').forEach(function(el) {
    el.classList.toggle('on', el.dataset.btipo === tipo);
  });
  // Adjust category options visibility
  var cat = document.getElementById('bCat');
  if (!cat) return;
  var opts = cat.querySelectorAll('optgroup');
  opts.forEach(function(og) {
    var isRec = og.label.indexOf('Clientes') >= 0;
    var isPag = og.label.indexOf('Empresa') >= 0;
    og.style.display = (tipo === 'receber' ? (isRec?'':'none') : (isPag?'':'none'));
  });
  // Reset cat if wrong type
  var cur = cat.value;
  var curCat = B_CAT[cur];
  if (curCat && curCat.tipo !== tipo) {
    cat.value = tipo === 'receber' ? 'parcela' : 'energia';
  }
}

// ══════════════════════════════════════════════════════════════════════
// SALVAR BOLETO
// ══════════════════════════════════════════════════════════════════════
function saveBoleto() {
  var g = function(id){return (document.getElementById(id)||{}).value||'';};
  var cli   = g('bCli').trim();
  var desc  = g('bDesc').trim();
  var valor = parseFloat(g('bValor')) || 0;
  var venc  = g('bVenc');

  if (!cli && !desc) { toast('Preencha cliente ou descrição'); return; }
  if (!valor)        { toast('Preencha o valor'); return; }
  if (!venc)         { toast('Preencha o vencimento'); return; }

  var obj = {
    tipo:   _bTipoAtual,
    cat:    g('bCat'),
    cli:    cli,
    desc:   desc,
    valor:  valor,
    venc:   venc,
    parc:   g('bParc'),
    fpag:   g('bFpag'),
    status: g('bStatus'),
    obs:    g('bObs').trim(),
    dtCriado: td()
  };

  if (_editBoletoId) {
    var idx = (DB.b||[]).findIndex(function(x){return x.id===_editBoletoId;});
    if (idx >= 0) { obj.id = _editBoletoId; obj.dtCriado = DB.b[idx].dtCriado; DB.b[idx] = obj; }
  } else {
    obj.id = Date.now();
    if (!DB.b) DB.b = [];
    DB.b.unshift(obj);
  }

  DB.sv();
  closeAll();
  bAutoStatus();
  toast('✅ Boleto salvo!');
  _bRerender();
  bUpdDot();
}

// ══════════════════════════════════════════════════════════════════════
// DETALHE DO BOLETO
// ══════════════════════════════════════════════════════════════════════
function openBoletoDetail(id) {
  var b = (DB.b||[]).find(function(x){return x.id===id;});
  if (!b) return;
  _editBoletoId = id;

  var st  = B_STATUS[b.status] || B_STATUS.pendente;
  var cat = B_CAT[b.cat] || { icon:'📄', label: b.cat||'' };
  var diff = b.venc ? dDiff(b.venc) : null;

  var hdr = document.getElementById('bDetHdr');
  if (hdr) {
    hdr.innerHTML =
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">' +
      '<span style="font-size:1.5rem;">' + cat.icon + '</span>' +
      '<div><div style="font-family:\'Cormorant Garamond\',serif;font-size:1.1rem;font-weight:700;">' + escH(b.cli||b.desc||'—') + '</div>' +
      '<span class="b-status-badge ' + st.cls + '">' + st.emoji + ' ' + st.label + '</span>' +
      '</div></div>';
  }

  var body = document.getElementById('bDetBody');
  if (body) {
    var vencInfo = '';
    if (diff !== null) {
      if (diff < 0)      vencInfo = ' <span class="red">(' + Math.abs(diff) + 'd vencido)</span>';
      else if (diff === 0) vencInfo = ' <span class="red">(vence hoje)</span>';
      else if (diff <= 3)  vencInfo = ' <span class="yel">(' + diff + 'd restantes)</span>';
      else                 vencInfo = ' <span style="color:var(--t3);">(' + diff + 'd restantes)</span>';
    }
    body.innerHTML =
      _bDetRow('Valor',        (b.tipo==='receber'?'+ ':'− ') + 'R$ ' + fm(b.valor||0)) +
      _bDetRow('Vencimento',   b.venc ? fd(b.venc) + vencInfo : '—') +
      _bDetRow('Categoria',    cat.label) +
      _bDetRow('Forma Pgto',   B_FPAG[b.fpag] || b.fpag || '—') +
      (b.parc ? _bDetRow('Parcela', b.parc) : '') +
      _bDetRow('Descrição',    escH(b.desc||'—')) +
      (b.obs  ? _bDetRow('Obs.',   escH(b.obs)) : '') +
      _bDetRow('Criado em',    b.dtCriado ? fd(b.dtCriado) : '—') +
      (b.dtPag ? _bDetRow('Pago em', fd(b.dtPag)) : '');
  }

  // Show/hide pagar button
  var btnPagar = document.getElementById('btnBDetPagar');
  if (btnPagar) btnPagar.style.display = (b.status==='pendente'||b.status==='vencido') ? 'block' : 'none';

  showMd('boletoDetailMd');
}

function _bDetRow(l, v) {
  return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);gap:12px;">' +
    '<span style="font-size:.62rem;color:var(--t4);text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">' + l + '</span>' +
    '<span style="font-size:.78rem;color:var(--t2);text-align:right;">' + v + '</span></div>';
}

// ══════════════════════════════════════════════════════════════════════
// AÇÕES
// ══════════════════════════════════════════════════════════════════════
function bMarcarPago(id) {
  var b = (DB.b||[]).find(function(x){return x.id===id;});
  if (!b) return;
  b.status = 'pago';
  b.dtPag  = td();
  DB.sv();

  // Auto-lançar no financeiro se for receber
  if (b.tipo === 'receber' && b.valor > 0) {
    addTr('in', (b.cli||b.desc||'Boleto') + (b.parc?' ('+b.parc+')':''), b.valor);
  }
  if (b.tipo === 'pagar' && b.valor > 0) {
    addTr('out', (b.cli||b.desc||'Boleto') + ' — ' + (B_CAT[b.cat]||{label:''}).label, b.valor);
  }

  closeAll();
  toast('✅ Marcado como pago e lançado no financeiro!');
  _bRerender();
  bUpdDot();
}

function delBoleto(id) {
  if (!confirm('Remover este boleto?')) return;
  DB.b = (DB.b||[]).filter(function(x){return x.id!==id;});
  DB.sv();
  closeAll();
  toast('✓ Removido');
  _bRerender();
  bUpdDot();
}

// ══════════════════════════════════════════════════════════════════════
// NOTIFICAÇÃO — DOT NO NAV
// ══════════════════════════════════════════════════════════════════════
function bUpdDot() {
  bAutoStatus();
  var hoje = td();
  var em3  = addD(hoje, 3);
  var urgentes = (DB.b||[]).filter(function(x){
    return x.status==='vencido' || (x.status==='pendente'&&x.venc&&x.venc<=em3);
  }).length;
  var dot = document.getElementById('boletosDot');
  if (dot) dot.classList.toggle('on', urgentes > 0);
}

// ══════════════════════════════════════════════════════════════════════
// INTEGRAÇÃO: criar boleto a partir do fechamento de venda
// ══════════════════════════════════════════════════════════════════════
function bFromFechamento(cli, desc, valor, venc, parc, fpag, qid) {
  if (!DB.b) DB.b = [];
  DB.b.unshift({
    id: Date.now() + Math.random(),
    tipo:    'receber',
    cat:     parc && parc !== '1/1' ? 'parcela' : 'saldo',
    cli:     cli,
    desc:    desc,
    valor:   valor,
    venc:    venc,
    parc:    parc || '',
    fpag:    fpag || 'pix',
    status:  'pendente',
    obs:     '',
    dtCriado: td(),
    qid:     qid || null
  });
  DB.sv();
}
