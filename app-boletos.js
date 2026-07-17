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

  // Migração: remove registros órfãos do antigo sistema "Contas a Pagar"
  // (objetos sem os campos tipo/status do módulo de Boletos)
  if (DB.b && DB.b.length) {
    var antesLen = DB.b.length;
    DB.b = DB.b.filter(function(b){ return !!b.tipo; });
    if (DB.b.length !== antesLen) changed = true;
  }

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

  if (typeof Notification !== 'undefined' && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
    h += '<div class="b-alerta" style="cursor:pointer;" onclick="bPedirPermissaoNotif()">';
    h += '<span class="b-alerta-icon">🔔</span>';
    h += '<div><div class="b-alerta-title">Ativar avisos de vencimento</div>';
    h += '<div class="b-alerta-nomes">Toque aqui para ser avisado quando um boleto estiver perto de vencer, vencer ou vencido</div></div>';
    h += '</div>';
  }

  // ── BUSCA + ADD ──
  h += '<div class="b-toolbar">';
  h += '<input class="b-search" id="bSearchIn" type="text" placeholder="🔍 Buscar cliente, descrição..." value="' + (_bBusca||'') + '" oninput="_bBusca=this.value;_bRerender()">';
  h += '<button class="btn btn-o" onclick="document.getElementById(\'bImportFileInput\').click()" style="white-space:nowrap;font-size:.72rem;padding:9px 10px;">📥 PDF</button>';
  h += '<button class="btn btn-o" onclick="estAbrirPainel()" style="white-space:nowrap;font-size:.72rem;padding:9px 10px;">📦 Estoque</button>';
  h += '<button class="btn btn-o" onclick="bAbrirEstrategiaMd()" style="white-space:nowrap;font-size:.72rem;padding:9px 10px;">🤖 Estratégia</button>';
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
      if (diff < 0)      vencInfo = ' <span class="b-red-txt">(' + Math.abs(diff) + 'd vencido)</span>';
      else if (diff === 0) vencInfo = ' <span class="b-red-txt">(vence hoje)</span>';
      else if (diff <= 3)  vencInfo = ' <span class="b-yel-txt">(' + diff + 'd restantes)</span>';
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
// ESTRATÉGIA DE PAGAMENTO — IA (usa a mesma API Key de Config → Empresa)
// Prioriza vencidos, impostos/funcionários (risco legal), sugere negociar
// parcelamento quando o caixa projetado não cobre os pagamentos, e alerta
// sobre recebíveis vencidos que deveriam ser cobrados primeiro.
// ══════════════════════════════════════════════════════════════════════
function bAbrirEstrategiaMd() {
  showMd('estrategiaMd');
  var box = document.getElementById('estrategiaBody');
  if (box) box.innerHTML = '<div style="text-align:center;padding:30px 10px;color:var(--t3);font-size:.8rem;">⏳ Analisando seus boletos...</div>';
  bGerarEstrategiaIA();
}

function bGerarEstrategiaIA() {
  bAutoStatus();
  var hoje = td();
  var boletos  = DB.b || [];
  var aPagar   = boletos.filter(function(b){return b.tipo==='pagar'  && (b.status==='pendente'||b.status==='vencido');});
  var aReceber = boletos.filter(function(b){return b.tipo==='receber'&& (b.status==='pendente'||b.status==='vencido');});

  var inT  = DB.t.filter(function(t){return t.type==='in'; }).reduce(function(s,t){return s+t.value;},0);
  var outT = DB.t.filter(function(t){return t.type==='out';}).reduce(function(s,t){return s+t.value;},0);
  var saldoAtual = inT - outT;

  var _aiKey = (CFG.emp && CFG.emp.apiKey) || '';
  if (!_aiKey) { bEstrategiaFallbackLocal(aPagar, aReceber, saldoAtual); return; }

  var resumoDados = {
    hoje: hoje,
    saldoAtual: saldoAtual,
    aPagar: aPagar.map(function(b){return {item:(b.cli||b.desc), cat:b.cat, valor:b.valor, venc:b.venc, status:b.status, parc:b.parc};}),
    aReceber: aReceber.map(function(b){return {item:(b.cli||b.desc), valor:b.valor, venc:b.venc, status:b.status, parc:b.parc};})
  };

  var prompt =
    'Você é um consultor financeiro para uma marmoraria (HR Mármores e Granitos).\n'
   +'Dados atuais (JSON):\n' + JSON.stringify(resumoDados) + '\n\n'
   +'Gere uma estratégia de pagamento. Retorne APENAS JSON válido, sem markdown:\n'
   +'{\n'
   +'  "resumo": "1-2 frases sobre a situação geral do caixa",\n'
   +'  "prioridades": [\n'
   +'     {"item":"nome do boleto/cliente","motivo":"por que pagar isso primeiro","urgencia":"alta|media|baixa"}\n'
   +'  ],\n'
   +'  "acoes": ["ação recomendada 1", "ação recomendada 2"],\n'
   +'  "alerta": "algum risco importante, ou null"\n'
   +'}\n\n'
   +'Priorize: contas vencidas, depois impostos e funcionários (risco legal/trabalhista), depois fornecedores.\n'
   +'Sugira negociar parcelamento quando o caixa não cobrir os pagamentos a vencer.\n'
   +'Sugira cobrar recebíveis vencidos antes de comprometer o caixa com novos pagamentos.\n'
   +'Retorne SÓ o JSON.';

  var _aiIsAnthropic = _aiKey.indexOf('sk-ant-') === 0;
  var _aiIsGemini    = (_aiKey.indexOf('AIza') === 0 || _aiKey.indexOf('AQ.') === 0);
  var fetchPromise;

  if (_aiIsAnthropic) {
    fetchPromise = fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':_aiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:1200, system:'Responda SOMENTE com JSON válido, sem markdown, sem texto fora do JSON.', messages:[{role:'user',content:prompt}] })
    }).then(function(r){return r.json();}).then(function(data){
      if (data.error) throw new Error(data.error.message||'Erro Anthropic');
      return (data.content && data.content[0] && data.content[0].text) || '';
    });
  } else if (_aiIsGemini) {
    fetchPromise = fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + _aiKey, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ system_instruction:{parts:[{text:'Responda SOMENTE com JSON válido, sem markdown, sem texto fora do JSON.'}]}, contents:[{role:'user',parts:[{text:prompt}]}], generationConfig:{maxOutputTokens:1200} })
    }).then(function(r){return r.json();}).then(function(data){
      if (data.error) throw new Error(data.error.message||'Erro Gemini');
      return (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0] && data.candidates[0].content.parts[0].text) || '';
    });
  } else {
    fetchPromise = fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + _aiKey },
      body: JSON.stringify({ model:'llama-3.3-70b-versatile', max_tokens:1200, messages:[
        { role:'system', content:'Responda SOMENTE com JSON válido, sem markdown, sem texto fora do JSON.' },
        { role:'user', content: prompt }
      ]})
    }).then(function(r){return r.json();}).then(function(data){
      if (data.error) throw new Error(data.error.message||'Erro Groq');
      return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
    });
  }

  fetchPromise
    .then(function(txt){
      txt = txt.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
      var parsed;
      try { parsed = JSON.parse(txt); }
      catch(e) { bEstrategiaFallbackLocal(aPagar, aReceber, saldoAtual); return; }
      bRenderEstrategia(parsed, true);
    })
    .catch(function(e){
      bEstrategiaFallbackLocal(aPagar, aReceber, saldoAtual);
    });
}

// Motor local (regras determinísticas) — usado sem API Key configurada ou se a IA falhar
function bEstrategiaFallbackLocal(aPagar, aReceber, saldoAtual) {
  var pesoCategoria = { imposto:3, funcionario:3, energia:2, agua:2, aluguel:2, fornecedor:1, ferramentas:1, material:1, servico:1, outros_pagar:1 };

  var itens = aPagar.map(function(b){
    var diff = b.venc ? dDiff(b.venc) : 0;
    var urgencia = diff<0 ? 100+Math.abs(diff) : (diff<=3 ? 50-diff*5 : Math.max(0,20-diff));
    var score = urgencia + (pesoCategoria[b.cat]||1)*5;
    return { b:b, score:score, diff:diff };
  }).sort(function(a,b){ return b.score - a.score; });

  var recebiveis = aReceber.slice().sort(function(a,b){ return (a.venc||'').localeCompare(b.venc||''); });
  var caixaSim = saldoAtual, recIdx = 0;

  var prioridades = [];
  itens.forEach(function(it){
    while (recIdx < recebiveis.length && (recebiveis[recIdx].venc||'') <= (it.b.venc||'9999-99-99')) {
      caixaSim += recebiveis[recIdx].valor || 0; recIdx++;
    }
    var podePagar = caixaSim >= (it.b.valor||0);
    var urgLabel = it.diff<0 ? 'alta' : (it.diff<=3 ? 'alta' : (it.score>=30 ? 'media' : 'baixa'));
    var catInfo = B_CAT[it.b.cat] || { label: it.b.cat || 'Outros' };
    var motivo = it.diff<0
      ? Math.abs(it.diff) + ' dia(s) vencido — risco de juros/multa'
      : (it.diff<=3 ? 'Vence em ' + it.diff + ' dia(s)' : 'Categoria prioritária (' + catInfo.label + ')');
    if (!podePagar) motivo += ' — caixa projetado insuficiente, considere negociar parcelamento';
    prioridades.push({ item: (it.b.cli||it.b.desc||'Boleto'), motivo: motivo, urgencia: urgLabel });
    if (podePagar) caixaSim -= (it.b.valor||0);
  });

  var vencidosReceber = aReceber.filter(function(b){ return b.status==='vencido'; });
  var acoes = [];
  if (vencidosReceber.length) acoes.push('Cobrar ' + vencidosReceber.length + ' recebimento(s) vencido(s) antes de comprometer o caixa com novos pagamentos.');
  var semCaixa = prioridades.filter(function(p){ return p.motivo.indexOf('parcelamento') >= 0; });
  if (semCaixa.length) acoes.push('Negociar parcelamento ou prazo extra para ' + semCaixa.length + ' conta(s) que o caixa atual não cobre.');
  if (!acoes.length) acoes.push('Caixa projetado é suficiente para cobrir os compromissos pendentes, seguindo a ordem sugerida.');

  var alerta = null;
  var totalVencido = aPagar.filter(function(b){ return b.status==='vencido'; }).reduce(function(s,b){ return s+(b.valor||0); }, 0);
  if (totalVencido > 0) alerta = 'Há R$ ' + fm(totalVencido) + ' em boletos já vencidos — priorize a quitação para evitar juros e multas.';

  var resumoTxt = 'Saldo atual: R$ ' + fm(saldoAtual) + '. ' + aPagar.length + ' conta(s) a pagar, ' + aReceber.length + ' a receber.';

  bRenderEstrategia({ resumo: resumoTxt, prioridades: prioridades, acoes: acoes, alerta: alerta }, false);
}

function bRenderEstrategia(data, viaIA) {
  var box = document.getElementById('estrategiaBody');
  if (!box) return;
  var h = '';
  h += '<div style="font-size:.62rem;color:var(--t4);text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:6px;">'
     + (viaIA ? '🤖 Estratégia gerada por IA' : '🧮 Estratégia (motor local — configure uma API Key em Config → Empresa para usar IA)') + '</div>';
  h += '<div style="font-size:.78rem;color:var(--t2);margin-bottom:14px;">' + escH(data.resumo||'') + '</div>';

  if (data.alerta) {
    h += '<div class="b-alerta b-alerta-red"><span class="b-alerta-icon">⚠️</span><div><div class="b-alerta-title">' + escH(data.alerta) + '</div></div></div>';
  }

  if (data.prioridades && data.prioridades.length) {
    h += '<div style="font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--t4);font-weight:700;margin:14px 0 8px;">📋 Ordem de Prioridade</div>';
    data.prioridades.forEach(function(p, i){
      var cor = p.urgencia==='alta' ? '#f87171' : (p.urgencia==='media' ? '#f59e0b' : '#4ade80');
      h += '<div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid rgba(255,255,255,.05);">'
         + '<div style="font-size:.85rem;font-weight:900;color:var(--gold);min-width:20px;">' + (i+1) + '</div>'
         + '<div style="flex:1;min-width:0;">'
         + '<div style="font-size:.78rem;font-weight:700;color:var(--tx);">' + escH(p.item) + '</div>'
         + '<div style="font-size:.68rem;color:var(--t3);margin-top:2px;">' + escH(p.motivo) + '</div>'
         + '</div>'
         + '<div style="font-size:.6rem;font-weight:800;color:' + cor + ';text-transform:uppercase;white-space:nowrap;">' + p.urgencia + '</div>'
         + '</div>';
    });
  } else {
    h += '<div style="padding:14px 0;text-align:center;color:var(--t3);font-size:.75rem;">Nenhuma conta pendente a priorizar. 🎉</div>';
  }

  if (data.acoes && data.acoes.length) {
    h += '<div style="font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--t4);font-weight:700;margin:14px 0 8px;">✅ Ações Recomendadas</div>';
    data.acoes.forEach(function(a){
      h += '<div style="font-size:.75rem;color:var(--t2);padding:4px 0;">• ' + escH(a) + '</div>';
    });
  }

  box.innerHTML = h;
}

// ══════════════════════════════════════════════════════════════════════
// LINHA DIGITÁVEL: decodifica valor e vencimento direto do código de barras
// (não depende de OCR/rótulos — é o dado oficial do boleto, sempre exato)
// ══════════════════════════════════════════════════════════════════════
function bDecodeLinhaDigitavel(linha) {
  var digits = (linha || '').replace(/\D/g, '');
  if (digits.length !== 47) return null;

  var campo5 = digits.slice(33); // últimos 14 dígitos: fator(4) + valor(10)
  var fator  = parseInt(campo5.slice(0, 4), 10);
  var valor  = parseInt(campo5.slice(4), 10) / 100;

  if (!fator) return { valor: valor, venc: null, fator: 0 };

  // Bancos brasileiros trocaram a data-base em 2025 (a antiga, 07/10/1997,
  // estourava o campo de 4 dígitos). Calculamos pelas duas e escolhemos
  // a mais plausível (mais perto de hoje).
  function fatorParaData(baseUTC, f) {
    var d = new Date(baseUTC + f * 86400000);
    return d.toISOString().slice(0, 10);
  }
  var baseNova   = Date.UTC(2022, 4, 29);   // nova base (pós-2025)
  var baseAntiga = Date.UTC(1997, 9, 7);    // base tradicional
  var dataNova   = fatorParaData(baseNova, fator);
  var dataAntiga = fatorParaData(baseAntiga, fator);

  var hoje = Date.now();
  var difNova   = Math.abs(new Date(dataNova).getTime()   - hoje);
  var difAntiga = Math.abs(new Date(dataAntiga).getTime() - hoje);
  var venc = difNova <= difAntiga ? dataNova : dataAntiga;

  return { valor: valor, venc: venc, fator: fator };
}

// ══════════════════════════════════════════════════════════════════════
// IMPORTAR BOLETOS DE PDF (pdf.js) — lê o PDF, encontra a(s) linha(s)
// digitável(is), decodifica valor/vencimento com certeza (via código de
// barras) e tenta extrair fornecedor/nº documento por proximidade de
// texto. Sempre mostra uma prévia editável antes de gravar qualquer coisa.
// ══════════════════════════════════════════════════════════════════════
var _bImportPreview = [];

async function bProcessarPDFs(fileList) {
  if (!fileList || !fileList.length) return;
  if (typeof pdfjsLib === 'undefined') { toast('Biblioteca de PDF não carregou — verifique sua conexão'); return; }
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

  _bImportPreview = [];
  showMd('bImportMd');
  document.getElementById('bImportBody').innerHTML = '<div style="text-align:center;padding:24px;color:var(--t3);font-size:.8rem;">⏳ Lendo PDF(s)...</div>';

  for (var i = 0; i < fileList.length; i++) {
    var file = fileList[i];
    try {
      var buf = await file.arrayBuffer();
      var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      var fullText = '';
      for (var p = 1; p <= pdf.numPages; p++) {
        var page = await pdf.getPage(p);
        var content = await page.getTextContent();
        fullText += content.items.map(function(it){ return it.str; }).join(' ') + '\n';
      }
      var achados = bExtrairBoletosDoTexto(fullText, file.name);
      _bImportPreview = _bImportPreview.concat(achados);
    } catch (e) {
      toast('Erro ao ler ' + file.name);
    }
  }
  bRenderImportPreview();
  document.getElementById('bImportFileInput').value = '';
}

function bExtrairBoletosDoTexto(texto, nomeArquivo) {
  var regexLinha = /(\d{5}\.\d{5})\s*(\d{5}\.\d{6})\s*(\d{5}\.\d{6})\s*(\d)\s*(\d{14})/g;
  var results = [], vistos = {}, match;
  var prevEnd = 0;
  var matches = [];
  while ((match = regexLinha.exec(texto)) !== null) matches.push(match);

  matches.forEach(function(match, idx){
    var linhaDigits = match[0].replace(/\D/g, '');
    if (linhaDigits.length !== 47 || vistos[linhaDigits]) { prevEnd = match.index + match[0].length; return; }
    vistos[linhaDigits] = true;

    var dec = bDecodeLinhaDigitavel(linhaDigits);
    if (!dec || !dec.venc) { prevEnd = match.index + match[0].length; return; }

    // Janela escopada: só o texto entre o boleto anterior e este (evita
    // "vazar" dados de um boleto vizinho quando o PDF tem vários juntos)
    var inicioJanela = Math.max(prevEnd, match.index - 1200);
    var janela = texto.slice(inicioJanela, match.index + 200);
    prevEnd = match.index + match[0].length;

    var cli = '';
    var fornecMatches = janela.match(/([A-ZÀ-ÜÇ0-9.&\s]{5,60}(?:LTDA|EIRELI|S\/A|S\.A\.|ME))\s+\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g);
    if (fornecMatches && fornecMatches.length) {
      var ultimo = fornecMatches[fornecMatches.length - 1];
      var mF = ultimo.match(/([A-ZÀ-ÜÇ0-9.&\s]{5,60}(?:LTDA|EIRELI|S\/A|S\.A\.|ME))/);
      if (mF) cli = mF[1].trim().replace(/\s+/g, ' ');
    }

    var nDoc = '';
    var docMatches = janela.match(/\b\d{4,7}-[A-Z]\/\d\b/g) || janela.match(/\b\d{4,7}-\d{2}\b/g);
    if (docMatches && docMatches.length) nDoc = docMatches[docMatches.length - 1];

    var nn = '';
    var nnMatches = [].concat(janela.match(/Nosso\s*[Nn][úu]mero\D{0,15}?\d{4,8}/g) || []);
    if (nnMatches.length) {
      var mNN = nnMatches[nnMatches.length - 1].match(/(\d{4,8})$/);
      if (mNN) nn = mNN[1];
    }

    results.push({
      linhaDig: linhaDigits,
      cli: cli || '',
      desc: nDoc ? ('Doc. ' + nDoc) : (nn ? ('Boleto ' + nn) : 'Boleto importado'),
      nDoc: nDoc,
      nn: nn,
      valor: dec.valor,
      venc: dec.venc,
      arquivo: nomeArquivo,
      _jaExiste: (DB.b || []).some(function(b){ return b.linhaDig === linhaDigits; })
    });
  });
  return results;
}

function bRenderImportPreview() {
  var box = document.getElementById('bImportBody');
  if (!box) return;
  if (!_bImportPreview.length) {
    box.innerHTML = '<div class="b-empty">Nenhuma linha digitável reconhecida nos PDF(s) selecionados.<br><span style="font-size:.65rem;color:var(--t4);">Verifique se são boletos bancários (não notas fiscais) e tente novamente.</span></div>';
    return;
  }
  var h = '<div style="font-size:.68rem;color:var(--t3);margin-bottom:10px;">Confira os dados antes de importar — valor e vencimento vêm direto do código de barras (sempre exatos). Corrija fornecedor/descrição se necessário.</div>';
  _bImportPreview.forEach(function(item, i) {
    var dis = item._jaExiste ? 'disabled' : '';
    var chk = item._jaExiste ? '' : 'checked';
    h += '<div style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:10px;margin-bottom:8px;' + (item._jaExiste?'opacity:.5;':'') + '">';
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
    h += '<input type="checkbox" id="bImpChk' + i + '" ' + chk + ' ' + dis + ' style="width:16px;height:16px;">';
    h += '<span style="font-size:.68rem;font-weight:700;color:var(--tx);flex:1;">' + escH(item.arquivo) + '</span>';
    if (item._jaExiste) h += '<span class="b-status-badge bs-canc">já importado</span>';
    h += '</div>';
    h += '<div class="r2"><div class="f" style="margin-bottom:5px;"><label style="font-size:.6rem;">Fornecedor</label><input id="bImpCli' + i + '" type="text" value="' + escH(item.cli) + '" placeholder="Nome do fornecedor" ' + dis + '></div>';
    h += '<div class="f" style="margin-bottom:5px;"><label style="font-size:.6rem;">Descrição</label><input id="bImpDesc' + i + '" type="text" value="' + escH(item.desc) + '" ' + dis + '></div></div>';
    h += '<div class="r2"><div class="f" style="margin-bottom:0;"><label style="font-size:.6rem;">Valor R$</label><input id="bImpValor' + i + '" type="number" step="0.01" value="' + item.valor.toFixed(2) + '" ' + dis + '></div>';
    h += '<div class="f" style="margin-bottom:0;"><label style="font-size:.6rem;">Vencimento</label><input id="bImpVenc' + i + '" type="date" value="' + item.venc + '" ' + dis + '></div></div>';
    h += '</div>';
  });
  box.innerHTML = h;
}

function bConfirmarImport() {
  var count = 0;
  _bImportPreview.forEach(function(item, i) {
    var chk = document.getElementById('bImpChk' + i);
    if (!chk || !chk.checked || chk.disabled) return;
    var cli   = (document.getElementById('bImpCli' + i)   || {}).value || '';
    var desc  = (document.getElementById('bImpDesc' + i)  || {}).value || '';
    var valor = parseFloat((document.getElementById('bImpValor' + i) || {}).value) || 0;
    var venc  = (document.getElementById('bImpVenc' + i)  || {}).value || '';
    if (!DB.b) DB.b = [];
    DB.b.unshift({
      id: Date.now() + Math.random(),
      tipo: 'pagar',
      cat: 'fornecedor',
      cli: cli || '(fornecedor a definir)',
      desc: desc,
      valor: valor,
      venc: venc,
      parc: item.nDoc || '',
      fpag: 'boleto',
      status: 'pendente',
      obs: 'Importado de ' + item.arquivo,
      dtCriado: td(),
      linhaDig: item.linhaDig,
      nn: item.nn
    });
    count++;
  });
  if (count) {
    DB.sv();
    bAutoStatus();
    toast(count + ' boleto(s) importado(s) ✅');
    _bRerender();
  } else {
    toast('Nenhum boleto selecionado');
  }
  closeAll();
}

// ══════════════════════════════════════════════════════════════════════
// NOTIFICAÇÕES: avisa quando um boleto está próximo de vencer, vence hoje
// ou está vencido. Funciona enquanto o app estiver aberto no navegador
// (não é push — não dispara com o app/aba totalmente fechados).
// ══════════════════════════════════════════════════════════════════════
function bPedirPermissaoNotif() {
  if (typeof Notification === 'undefined') { toast('Seu navegador não suporta notificações'); return; }
  Notification.requestPermission().then(function(perm) {
    if (perm === 'granted') {
      toast('Notificações ativadas ✅');
      bCheckNotificacoes(); _bRerender();
      if (typeof FCM !== 'undefined') FCM.init(); // registra push real (funciona com app fechado)
    }
    else toast('Permissão de notificação negada');
  });
}

function bCheckNotificacoes() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  var mudou = false;
  (DB.b || []).forEach(function(b) {
    if (b.tipo !== 'pagar' || (b.status !== 'pendente' && b.status !== 'vencido') || !b.venc) return;
    var diff = dDiff(b.venc);
    b._notif = b._notif || {};
    var nome = b.cli || b.desc || 'Boleto';
    if (diff < 0 && !b._notif.vencido) {
      new Notification('🔴 Boleto vencido', { body: nome + ' — R$ ' + fm(b.valor) + ' venceu há ' + Math.abs(diff) + ' dia(s)', tag: 'boleto-' + b.id });
      b._notif.vencido = true; mudou = true;
    } else if (diff === 0 && !b._notif.hoje) {
      new Notification('🟡 Boleto vence hoje', { body: nome + ' — R$ ' + fm(b.valor), tag: 'boleto-' + b.id });
      b._notif.hoje = true; mudou = true;
    } else if (diff > 0 && diff <= 3 && !b._notif.proximo) {
      new Notification('⏳ Boleto vence em breve', { body: nome + ' vence em ' + diff + ' dia(s) — R$ ' + fm(b.valor), tag: 'boleto-' + b.id });
      b._notif.proximo = true; mudou = true;
    }
  });
  if (mudou) DB.sv();
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
