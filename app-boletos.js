// ══════════════════════════════════════════════════════════════════════
// MÓDULO BOLETOS — Gestão Financeira Empresarial Completa
// HR Mármores e Granitos ERP v5
// Controla: A Receber | A Pagar | Vencidos | Empresa | Fornecedores
// ══════════════════════════════════════════════════════════════════════

var _editBoletoId   = null;
var _bTipoAtual     = 'receber';
var _bFiltroAtual   = 'todos';
var _bBusca         = '';

// ── Anexo (PDF/foto do boleto) — guardado em IndexedDB (mesmo padrão já usado
// pra fotos de cuba em app-core.js, banco 'hr_fotos_db'/'fotos') + leitura
// automática dos dados via IA ──
var _bAnexoFile          = null;  // File escolhido, ainda não salvo
var _bAnexoIdSalvo       = '';    // id do anexo já salvo no IndexedDB (edição de boleto existente)
var _bAnexoNomeSalvo     = '';
var _bAnexoTipoSalvo     = '';
var _bAnexoPreviewObjUrl = null;  // object URL local, só pra preview de imagem
var _bAnexoExtraindo     = false;
var _bAnexoDadosExtra    = null;  // dados extras lidos do boleto (CNPJ, pagador, nosso número, juros/multa...) — vão junto quando salvar
var _bPdfJsPromise       = null;  // cache da promise de carregamento do pdf.js, pra não injetar o script mais de uma vez
var _bVencAutoPreenchido = false; // true enquanto o campo Vencimento ainda tiver só a sugestão padrão (hoje+30) de "Novo Boleto", sem o usuário ter mexido — usado pro guard da extração automática não travar (e pra extração poder sobrescrever esse valor)
var _bParcelasExtrasPdf  = [];    // demais parcelas do mesmo carnê/PDF, além da 1ª (que preenche o formulário principal) — viram cartões extras no modal

// pdf.js NUNCA foi incluído no index.html (só o jsPDF, que serve pra GERAR
// PDF, não pra LER) — por isso a leitura de linha digitável sempre falhava
// silenciosamente. Carrega sob demanda, na primeira vez que for preciso,
// no mesmo padrão já usado no projeto pro jsPDF (app-core.js, app-funcionarios.js
// etc): injeta o <script> e resolve quando terminar de carregar.
function _bCarregarPdfJs() {
  if (typeof pdfjsLib !== 'undefined') return Promise.resolve(pdfjsLib);
  if (_bPdfJsPromise) return _bPdfJsPromise;
  _bPdfJsPromise = new Promise(function(resolve, reject) {
    var s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = function() {
      if (typeof pdfjsLib === 'undefined') { reject(new Error('pdfjsLib não definiu após carregar')); return; }
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      resolve(pdfjsLib);
    };
    s.onerror = function() { _bPdfJsPromise = null; reject(new Error('Falha ao carregar pdf.js (sem internet?)')); };
    document.head.appendChild(s);
  });
  return _bPdfJsPromise;
}

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
  h += '<button class="btn btn-o" onclick="bAbrirSeletorPDF()" style="white-space:nowrap;font-size:.72rem;padding:9px 10px;">📥 PDF</button>';
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
    {k:'parcelamentos',l:'📋 Parcelas'},
    {k:'cargas',       l:'📦 Cargas'}
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
  if (_bFiltroAtual === 'cargas') return _bListaCargas();

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

  // ── Agrupa por urgência: assim fica claro de cara o que venceu,
  // o que está perto de vencer e o que ainda tem prazo tranquilo ──
  var g = { venc: [], hoje: [], em7: [], futuro: [], pago: [], canc: [] };
  filtrado.forEach(function(x) {
    if (x.status === 'vencido')        g.venc.push(x);
    else if (x.status === 'pago')      g.pago.push(x);
    else if (x.status === 'cancelado') g.canc.push(x);
    else {
      var diff = x.venc ? dDiff(x.venc) : 999;
      if (diff === 0)              g.hoje.push(x);
      else if (diff > 0 && diff<=7) g.em7.push(x);
      else                          g.futuro.push(x);
    }
  });
  function ordena(arr) { arr.sort(function(a,b){ return (a.venc||'').localeCompare(b.venc||''); }); return arr; }
  ordena(g.venc); ordena(g.hoje); ordena(g.em7); ordena(g.futuro);
  g.pago.sort(function(a,b){ return (b.dtPag||b.venc||'').localeCompare(a.dtPag||a.venc||''); });

  function soma(arr){ return arr.reduce(function(s,x){return s+(x.valor||0);},0); }
  function bloco(icon, label, cor, arr) {
    if (!arr.length) return '';
    var s = _bSecHeader(icon, label, arr.length, soma(arr), cor);
    arr.forEach(function(x){ s += _bRow(x, hoje); });
    return s;
  }

  var h = '';
  h += bloco('🔴', 'Venceram — priorize',            '#ff5555', g.venc);
  h += bloco('🟠', 'Vencem hoje',                     '#ff8a3d', g.hoje);
  h += bloco('🟡', 'Perto de vencer (7 dias)',        '#e8b847', g.em7);
  h += bloco('⚪', 'A vencer mais adiante',            'var(--t3)', g.futuro);
  h += bloco('🟢', 'Pagos / Recebidos',                'var(--grn)', g.pago);
  h += bloco('⚫', 'Cancelados',                       'var(--t4)', g.canc);
  return h;
}

// ── Visão por Carga ──────────────────────────────────────────────────
// Agrupa os boletos "a pagar" que têm cargaId (vieram de PDFs cujo número
// de documento segue o padrão BASE-PARCELA/TOTAL) e mostra, por carga:
// quantas parcelas no total, quantas já pagas, quantas faltam, quanto
// falta pagar, forma de pagamento e o nome do fornecedor.
function _bListaCargas() {
  var b = (DB.b || []).filter(function(x){ return x.tipo === 'pagar' && x.cargaId; });
  if (!b.length) {
    return '<div class="b-empty">Nenhuma carga identificada ainda.<br><span style="font-size:.65rem;color:var(--t4);">Cargas são detectadas automaticamente ao importar boletos em PDF cujo número do documento segue o padrão base-parcela/total (ex: 12345-1/3).</span></div>';
  }

  var grupos = {};
  b.forEach(function(x){
    if (!grupos[x.cargaId]) grupos[x.cargaId] = [];
    grupos[x.cargaId].push(x);
  });

  function maisFrequente(arr, campo) {
    var cont = {};
    arr.forEach(function(x){ var v = x[campo]; if (v) cont[v] = (cont[v]||0) + 1; });
    var chaves = Object.keys(cont).sort(function(a,c){ return cont[c]-cont[a]; });
    return chaves.length ? chaves[0] : '';
  }

  var cargas = Object.keys(grupos).map(function(id){
    var itens = grupos[id];
    itens.sort(function(a,c){ return (a.parcAtual||0) - (c.parcAtual||0); });
    var pagas = itens.filter(function(x){ return x.status === 'pago'; });
    var pendentes = itens.filter(function(x){ return x.status !== 'pago' && x.status !== 'cancelado'; });
    var vencidas = itens.filter(function(x){ return x.status === 'vencido'; });
    var total = itens[0].parcTotal || itens.length;
    var faltaPagar = pendentes.reduce(function(s,x){ return s+(x.valor||0); }, 0);
    var proxVenc = pendentes.reduce(function(m,x){ return (!m || (x.venc && x.venc < m)) ? x.venc : m; }, '');
    return {
      id: id,
      fornecedor: maisFrequente(itens, 'cli') || '(fornecedor a definir)',
      fpag: maisFrequente(itens, 'fpag'),
      itens: itens, total: total,
      qtdPagas: pagas.length, qtdPendentes: pendentes.length, qtdVencidas: vencidas.length,
      faltaPagar: faltaPagar, proxVenc: proxVenc
    };
  });

  cargas.sort(function(a,c){
    if (!!a.qtdVencidas !== !!c.qtdVencidas) return a.qtdVencidas ? -1 : 1;
    return (a.proxVenc||'9999').localeCompare(c.proxVenc||'9999');
  });

  var h = '';
  cargas.forEach(function(g){
    var cor = g.qtdVencidas ? '#ff5555' : (g.qtdPendentes ? 'var(--gold)' : 'var(--grn)');
    var statusTxt = g.qtdPendentes === 0 ? '✅ Carga quitada' :
      (g.qtdVencidas ? g.qtdVencidas + ' vencida(s) · ' : '') + g.qtdPendentes + ' de ' + g.total + ' parcela(s) restante(s)';
    h += '<div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:12px;margin-bottom:10px;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px;cursor:pointer;" onclick="bToggleCarga(\'' + id2(g.id) + '\')">';
    h += '<div><div style="font-size:.78rem;font-weight:700;color:var(--tx);">' + escH(g.fornecedor) + '</div>';
    h += '<div style="font-size:.66rem;color:' + cor + ';margin-top:2px;">' + statusTxt + '</div></div>';
    h += '<div style="text-align:right;"><div style="font-size:.62rem;color:var(--t4);">falta pagar</div>';
    h += '<div style="font-size:.8rem;font-weight:700;color:' + (g.faltaPagar>0?'#ff5555':'var(--grn)') + ';">R$ ' + fm(g.faltaPagar) + '</div></div>';
    h += '</div>';
    h += '<div style="font-size:.62rem;color:var(--t4);margin-top:6px;">Pago: ' + g.qtdPagas + '/' + g.total + ' · Forma: ' + (B_FPAG[g.fpag]||g.fpag||'—') + '</div>';
    h += '<div onclick="bToggleCarga(\'' + id2(g.id) + '\')" style="font-size:.62rem;color:var(--gold);font-weight:700;cursor:pointer;user-select:none;margin-top:8px;">▾ Ver parcelas</div>';
    h += '<div id="bCarga' + id2(g.id) + '" style="display:none;margin-top:8px;">';
    g.itens.forEach(function(x){ h += _bRow(x, td()); });
    h += '</div>';
    h += '</div>';
  });
  return h;
}
// cargaId vem direto do número do documento (só dígitos) — usado como id
// de elemento HTML, então precisa ser sanitizado (não deve ter chars
// especiais de qualquer forma, mas por segurança).
function id2(s) { return String(s).replace(/[^a-zA-Z0-9]/g, ''); }

function bToggleCarga(id) {
  var el = document.getElementById('bCarga' + id);
  if (!el) return;
  var abrindo = el.style.display === 'none';
  el.style.display = abrindo ? 'block' : 'none';
}

function _bSecHeader(icon, label, count, total, cor) {
  return '<div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:14px 2px 6px;">' +
    '<div style="font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;font-weight:800;color:' + cor + ';">' + icon + ' ' + label + ' (' + count + ')</div>' +
    '<div style="font-size:.68rem;font-weight:700;color:' + cor + ';">R$ ' + fm(total) + '</div>' +
    '</div>';
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
    (b.pix ? '<button type="button" class="btn btn-o" style="margin-top:4px;font-size:.6rem;padding:5px 8px;white-space:nowrap;" onclick="event.stopPropagation();bCopiarPix(' + b.id + ')">📋 Pix</button>' : '') +
    '</div>' +
    '</div>';
}

// Copia o código Pix Copia e Cola de um boleto já salvo (pelo id) pra área
// de transferência, pra colar direto no app do banco.
function bCopiarPix(id) {
  var b = (DB.b || []).find(function(x){ return x.id === id; });
  if (!b || !b.pix) { toast('Este boleto não tem código Pix salvo'); return; }
  _bCopiarTexto(b.pix, 'Código Pix copiado ✅');
}

function _bCopiarTexto(t, msgOk) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(t).then(function(){ toast(msgOk || '✓ Copiado!'); })
      .catch(function(){ if (typeof _copiarFallback === 'function') _copiarFallback(t); });
    return;
  }
  if (typeof _copiarFallback === 'function') _copiarFallback(t);
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
  _bGarantirAnexoUI();
  _bRemoverAnexo(); // limpa qualquer anexo deixado de uma abertura anterior
  // Reset form
  _bFormSet({ tipo:'receber', cat:'parcela', cli:'', desc:'', valor:'',
    venc: addD(td(), 30), parc:'', fpag:'pix', status:'pendente', obs:'' });
  bSetTipo('receber');
  // O Vencimento acima já vem preenchido com "hoje+30" só como sugestão —
  // marca como "ainda não mexido pelo usuário" pra não bloquear a extração
  // automática do anexo (guard em _bAnexoFileSelected) nem impedir que a
  // extração sobrescreva esse valor padrão (_bPreencherComExtracao).
  _bVencAutoPreenchido = true;
  var vencEl = document.getElementById('bVenc');
  if (vencEl) {
    var _bLimparFlagVenc = function() { _bVencAutoPreenchido = false; vencEl.removeEventListener('input', _bLimparFlagVenc); };
    vencEl.addEventListener('input', _bLimparFlagVenc);
  }
  showMd('boletoMd');
}

function editBoleto(id) {
  var b = (DB.b||[]).find(function(x){return x.id===id;});
  if (!b) return;
  _editBoletoId = id;
  _bVencAutoPreenchido = false; // vencimento é dado real do boleto, não a sugestão padrão
  var el = document.getElementById('boletoMdTitle');
  if (el) el.textContent = 'Editar Boleto';
  _bGarantirAnexoUI();
  _bAnexoFile = null;
  _bAnexoIdSalvo = b.anexoId || '';
  _bAnexoNomeSalvo = ''; _bAnexoTipoSalvo = '';
  if (_bAnexoPreviewObjUrl) { URL.revokeObjectURL(_bAnexoPreviewObjUrl); _bAnexoPreviewObjUrl = null; }
  // Se o boleto já tem dados extras salvos (CNPJ, pagador, nosso número...),
  // recarrega pra continuar aparecendo no box do anexo durante a edição.
  _bAnexoDadosExtra = _bExtrairCamposExtras(b);
  _bRenderAnexoPreview();
  if (_bAnexoIdSalvo) _bCarregarPreviewAnexoSalvo(_bAnexoIdSalvo);
  _bFormSet(b);
  bSetTipo(b.tipo || 'receber');
  showMd('boletoMd');
}

// Extrai do registro do boleto só os campos "extras" (não os campos normais
// do formulário) — usado tanto ao editar (carregar pra tela) quanto ao salvar.
function _bExtrairCamposExtras(o) {
  var campos = ['cnpjBenef','pagadorNome','pagadorDoc','pagadorLocal','dtEmissao',
    'vencOriginal','valorOriginal','encargosAtraso','valorAtualizado','instrucoes','nn','nDoc','linhaDig','pix',
    'cargaId','parcAtual','parcTotal'];
  var out = {};
  var achou = false;
  campos.forEach(function(k){ if (o && o[k]) { out[k] = o[k]; achou = true; } });
  return achou ? out : null;
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
// ANEXO DO BOLETO — injeta a área de upload no modal, lê o arquivo,
// extrai os dados via IA (mesma API Key de Config → Empresa, reaproveita
// a detecção de provedor usada em bGerarEstrategiaIA) e guarda o arquivo em
// IndexedDB (mesmo padrão de app-core.js pras fotos de cuba — sem depender
// de nenhum serviço externo). Vale tanto pra "A Receber" quanto "A Pagar".
// ══════════════════════════════════════════════════════════════════════
var _bAnexoDBP = null;
function _bAnexoDBOpen() {
  if (_bAnexoDBP) return _bAnexoDBP;
  _bAnexoDBP = new Promise(function(resolve, reject) {
    if (!window.indexedDB) { reject(new Error('IndexedDB indisponível')); return; }
    var req = indexedDB.open('hr_boletos_anexos_db', 1);
    req.onupgradeneeded = function() {
      var db = req.result;
      if (!db.objectStoreNames.contains('anexos')) db.createObjectStore('anexos', { keyPath: 'id' });
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror   = function() { reject(req.error); };
  });
  return _bAnexoDBP;
}
function _bAnexoDBSave(id, file) {
  return _bAnexoDBOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('anexos', 'readwrite');
      tx.objectStore('anexos').put({ id: id, blob: file, nome: file.name, tipo: file.type, criadoEm: Date.now() });
      tx.oncomplete = resolve;
      tx.onerror = function() { reject(tx.error); };
    });
  });
}
function _bAnexoDBGet(id) {
  return _bAnexoDBOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('anexos', 'readonly');
      var req = tx.objectStore('anexos').get(id);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { reject(req.error); };
    });
  });
}
function _bAnexoDBDelete(id) {
  return _bAnexoDBOpen().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction('anexos', 'readwrite');
      tx.objectStore('anexos').delete(id);
      tx.oncomplete = resolve;
      tx.onerror = function() { reject(tx.error); };
    });
  });
}

// Abre um anexo salvo (por id) numa nova aba, gerando a URL temporária na hora.
async function _bAbrirAnexoPorId(id) {
  if (!id) return;
  try {
    var rec = await _bAnexoDBGet(id);
    if (!rec || !rec.blob) { toast('Anexo não encontrado'); return; }
    var url = URL.createObjectURL(rec.blob);
    window.open(url, '_blank');
    setTimeout(function(){ URL.revokeObjectURL(url); }, 60000);
  } catch (e) { toast('Erro ao abrir anexo'); }
}
function _bAbrirAnexoSalvo() { _bAbrirAnexoPorId(_bAnexoIdSalvo); }

function _bGarantirAnexoUI() {
  if (document.getElementById('bAnexoWrap')) return;
  var title = document.getElementById('boletoMdTitle');
  if (!title) return;
  title.insertAdjacentHTML('afterend',
    '<div id="bAnexoWrap" style="margin:10px 0 16px;">' +
      '<label style="font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;font-weight:800;color:var(--t4);display:block;margin-bottom:6px;">📎 Anexar Boleto/Comprovante (opcional)</label>' +
      '<div id="bAnexoDrop" style="border:1.5px dashed var(--bd);border-radius:10px;padding:14px;text-align:center;cursor:pointer;" onclick="document.getElementById(\'bAnexoInput\').click()">' +
        '<div id="bAnexoDropTxt" style="font-size:.72rem;color:var(--t3);">📥 Toque para escolher o PDF ou foto do boleto</div>' +
        '<div style="font-size:.6rem;color:var(--t4);margin-top:2px;">Os campos abaixo são preenchidos automaticamente quando possível</div>' +
      '</div>' +
      '<input type="file" id="bAnexoInput" accept="application/pdf,image/*" style="display:none;" onchange="_bAnexoFileSelected(this)">' +
      '<div id="bAnexoPreviewBox" style="display:none;margin-top:8px;"></div>' +
      '<div id="bParcelasExtrasWrap" style="display:none;margin-top:10px;"></div>' +
    '</div>'
  );
}

function _bRenderAnexoPreview() {
  var box = document.getElementById('bAnexoPreviewBox');
  var dropTxt = document.getElementById('bAnexoDropTxt');
  if (!box) return;
  if (!_bAnexoFile && !_bAnexoIdSalvo) {
    box.style.display = 'none'; box.innerHTML = '';
    if (dropTxt) dropTxt.textContent = '📥 Toque para escolher o PDF ou foto do boleto';
    return;
  }
  box.style.display = 'block';
  if (dropTxt) dropTxt.textContent = '✅ Anexo selecionado — toque para trocar';

  var nome = _bAnexoFile ? _bAnexoFile.name : (_bAnexoNomeSalvo || 'anexo');
  var tipo = _bAnexoFile ? _bAnexoFile.type : _bAnexoTipoSalvo;
  var isImg = /^image\//.test(tipo || '');
  var thumb = (isImg && _bAnexoPreviewObjUrl)
    ? '<img src="' + _bAnexoPreviewObjUrl + '" style="width:52px;height:52px;object-fit:cover;border-radius:8px;">'
    : '<div style="width:52px;height:52px;border-radius:8px;background:var(--s2);display:flex;align-items:center;justify-content:center;font-size:1.4rem;">' + (isImg?'🖼️':'📄') + '</div>';

  var status = _bAnexoExtraindo
    ? '🤖 Lendo dados automaticamente...'
    : (_bAnexoIdSalvo && !_bAnexoFile ? 'Anexo salvo' : 'Pronto para salvar junto com o boleto');

  box.innerHTML =
    '<div style="display:flex;align-items:center;gap:10px;background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:8px;">' +
    thumb +
    '<div style="flex:1;min-width:0;">' +
    '<div style="font-size:.68rem;color:var(--tx);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escH(nome) + '</div>' +
    '<div style="font-size:.62rem;color:var(--t4);margin-top:2px;">' + status + '</div>' +
    '</div>' +
    (_bAnexoIdSalvo && !_bAnexoFile ? '<button type="button" class="btn btn-o" style="font-size:.6rem;padding:6px 8px;white-space:nowrap;" onclick="_bAbrirAnexoSalvo()">Abrir</button>' : '') +
    '<button type="button" class="btn btn-o" style="font-size:.6rem;padding:6px 8px;" onclick="_bRemoverAnexo()">✕</button>' +
    '</div>' +
    (_bAnexoDadosExtra ? _bResumoCarneHTML(_bAnexoDadosExtra) : '') +
    (_bAnexoDadosExtra ? _bCaixaDetalhesToggle(_bLinhasDetalhesBoleto(_bAnexoDadosExtra), '_bToggleAnexoDet()', 'bAnexoDet') : '');
}

function _bToggleAnexoDet() {
  var el = document.getElementById('bAnexoDet');
  if (!el) return;
  var abrindo = el.style.display === 'none';
  el.style.display = abrindo ? 'block' : 'none';
  var lbl = el.previousElementSibling;
  if (lbl) lbl.textContent = (abrindo ? '▴ Ocultar dados do boleto' : '▾ Ver todos os dados do boleto');
}

function _bRemoverAnexo() {
  var idParaExcluir = _bAnexoIdSalvo;
  _bAnexoFile = null;
  _bAnexoIdSalvo = '';
  _bAnexoNomeSalvo = '';
  _bAnexoTipoSalvo = '';
  _bAnexoExtraindo = false;
  _bAnexoDadosExtra = null;
  _bParcelasExtrasPdf = [];
  if (_bAnexoPreviewObjUrl) { URL.revokeObjectURL(_bAnexoPreviewObjUrl); _bAnexoPreviewObjUrl = null; }
  var input = document.getElementById('bAnexoInput');
  if (input) input.value = '';
  _bRenderAnexoPreview();
  _bRenderParcelasExtras();
  if (idParaExcluir) _bAnexoDBDelete(idParaExcluir).catch(function(){});
}

// Cartões das demais parcelas do mesmo carnê/PDF (a 1ª já preencheu o
// formulário principal) — cada uma pode ser lançada direto como um novo
// boleto, sem precisar escolher o mesmo PDF de novo.
function _bRenderParcelasExtras() {
  var wrap = document.getElementById('bParcelasExtrasWrap');
  if (!wrap) return;
  if (!_bParcelasExtrasPdf || !_bParcelasExtrasPdf.length) { wrap.style.display = 'none'; wrap.innerHTML = ''; return; }
  wrap.style.display = 'block';
  var cards = _bParcelasExtrasPdf.map(function(p, i) {
    var jaExiste = p._jaExiste || (DB.b || []).some(function(b){ return b.linhaDig && p.linhaDig && b.linhaDig === p.linhaDig; });
    return '<div style="display:flex;align-items:center;gap:8px;background:var(--s2);border:1px solid var(--bd);border-radius:8px;padding:8px 10px;margin-top:6px;">' +
      '<div style="flex:1;min-width:0;">' +
      '<div style="font-size:.68rem;color:var(--tx);font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
        escH(p.cli || p.desc || 'Boleto') + (p.parcAtual && p.parcTotal ? ' · ' + p.parcAtual + '/' + p.parcTotal : '') + '</div>' +
      '<div style="font-size:.62rem;color:var(--t4);">R$ ' + fm(p.valor||0) + ' · vence ' + (p.venc ? fd(p.venc) : '—') + '</div>' +
      '</div>' +
      (jaExiste
        ? '<span style="font-size:.6rem;color:var(--t4);white-space:nowrap;">já lançado</span>'
        : '<button type="button" class="btn btn-g" style="font-size:.6rem;padding:6px 8px;white-space:nowrap;" onclick="_bAdicionarParcelaExtra(' + i + ')">+ Adicionar</button>') +
      '</div>';
  }).join('');
  wrap.innerHTML =
    '<label style="font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;font-weight:800;color:var(--t4);display:block;margin-bottom:2px;">📑 Outras parcelas encontradas neste PDF</label>' +
    cards;
}

// Lança direto uma das parcelas extras (cartão) como um novo boleto —
// carrega junto todos os dados extras já extraídos daquela parcela.
function _bAdicionarParcelaExtra(i) {
  var p = _bParcelasExtrasPdf && _bParcelasExtrasPdf[i];
  if (!p) return;
  var obj = {
    id: Date.now() + Math.random(),
    tipo: _bTipoAtual,
    cat: p.cat || (typeof bGuessCategoria === 'function' ? bGuessCategoria(p.cli) : 'parcela'),
    cli: p.cli || '', desc: p.desc || '', valor: p.valor || 0, venc: p.venc || '',
    parc: (p.parcAtual && p.parcTotal) ? (p.parcAtual + '/' + p.parcTotal) : '',
    fpag: 'pix', status: 'pendente', obs: '', dtCriado: td()
  };
  ['linhaDig','nn','nDoc','pix','cnpjBenef','pagadorNome','pagadorDoc','pagadorLocal','dtEmissao',
   'vencOriginal','valorOriginal','encargosAtraso','valorAtualizado','instrucoes','cargaId','parcAtual','parcTotal']
    .forEach(function(k){ if (p[k]) obj[k] = p[k]; });
  if (!DB.b) DB.b = [];
  DB.b.unshift(obj);
  DB.sv();
  p._jaExiste = true;
  toast('✅ Parcela adicionada');
  _bRenderParcelasExtras();
  _bRerender();
  bUpdDot();
}

// Carrega o preview (nome/thumbnail) de um anexo já salvo, ao abrir edição de um boleto.
async function _bCarregarPreviewAnexoSalvo(id) {
  try {
    var rec = await _bAnexoDBGet(id);
    if (!rec || _bAnexoIdSalvo !== id) return; // modal pode ter mudado nesse meio tempo
    _bAnexoNomeSalvo = rec.nome || 'anexo';
    _bAnexoTipoSalvo = rec.tipo || '';
    if (/^image\//.test(rec.tipo || '') && rec.blob) _bAnexoPreviewObjUrl = URL.createObjectURL(rec.blob);
    _bRenderAnexoPreview();
  } catch (e) { /* silencioso — preview é só um bônus visual */ }
}

async function _bAnexoFileSelected(input) {
  var file = input.files && input.files[0];
  if (!file) return;
  var okType = file.type === 'application/pdf' || /^image\//.test(file.type);
  if (!okType) { toast('Envie um PDF ou uma foto/imagem do boleto'); input.value = ''; return; }
  if (file.size > 15 * 1024 * 1024) { toast('Arquivo muito grande (máx. 15MB)'); input.value = ''; return; }

  _bAnexoFile = file;
  _bAnexoIdSalvo = ''; // um novo anexo substitui o anterior (o antigo fica no IndexedDB até salvar)
  _bAnexoNomeSalvo = ''; _bAnexoTipoSalvo = '';
  _bAnexoDadosExtra = null;
  if (_bAnexoPreviewObjUrl) { URL.revokeObjectURL(_bAnexoPreviewObjUrl); _bAnexoPreviewObjUrl = null; }
  if (/^image\//.test(file.type)) _bAnexoPreviewObjUrl = URL.createObjectURL(file);
  _bRenderAnexoPreview();

  // Só tenta preencher automaticamente se os campos principais ainda
  // estiverem vazios — nunca sobrescreve o que o usuário já digitou.
  // Vencimento é um caso especial: em "Novo Boleto" ele já vem preenchido
  // com uma sugestão padrão (hoje+30), então só conta como "preenchido pelo
  // usuário" (e bloqueia a extração) se _bVencAutoPreenchido não estiver ativo.
  var cli = (document.getElementById('bCli') || {}).value || '';
  var valor = (document.getElementById('bValor') || {}).value || '';
  var venc = (document.getElementById('bVenc') || {}).value || '';
  var vencPreenchidoPeloUsuario = venc && !_bVencAutoPreenchido;
  if (cli || valor || vencPreenchidoPeloUsuario) return;

  _bAnexoExtraindo = true;
  _bRenderAnexoPreview();
  var dados = null;
  try {
    // 1) PDF com linha digitável (boleto bancário) → dado exato, sem precisar de IA
    if (file.type === 'application/pdf') {
      dados = await _bExtrairDadosAnexoPorCodigoBarras(file);
    }
    // 2) Sem código de barras (foto, nota, boleto sem linha digitável) → tenta IA
    if (!dados) dados = await _bExtrairDadosAnexoIA(file);
  } catch (e) {
    // Extração é um bônus — se falhar, o preenchimento manual continua disponível
  }
  _bAnexoExtraindo = false;
  // Carnê em PDF pode trazer mais de uma parcela — a 1ª preenche o formulário
  // principal, as demais viram cartões extras (_bRenderParcelasExtras) pra
  // o usuário lançar de uma vez, sem precisar reabrir o mesmo PDF várias vezes.
  _bParcelasExtrasPdf = (dados && dados.parcelasExtras) ? dados.parcelasExtras : [];
  if (dados) {
    _bPreencherComExtracao(dados);
  } else if (!(CFG.emp && CFG.emp.apiKey)) {
    toast('📎 Anexo salvo — não achei código de barras nem tenho IA configurada (Config → Empresa) pra ler automaticamente. Preencha manualmente.');
  } else {
    toast('📎 Anexo salvo — não consegui ler os dados automaticamente. Preencha manualmente.');
  }
  _bRenderAnexoPreview();
  _bRenderParcelasExtras();
}

// PDF de boleto bancário quase sempre tem a linha digitável em texto — lê ela
// com o mesmo motor do importador em lote (bExtrairBoletosDoTexto), que decodifica
// valor/vencimento direto do código de barras (sempre exato, sem IA).
async function _bExtrairDadosAnexoPorCodigoBarras(file) {
  var pdfjsLib;
  try { pdfjsLib = await _bCarregarPdfJs(); } catch (e) { return null; }
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var fullText = '';
  for (var p = 1; p <= pdf.numPages; p++) {
    var page = await pdf.getPage(p);
    var content = await page.getTextContent();
    fullText += content.items.map(function(it){ return it.str; }).join(' ') + '\n';
  }
  var achados = bExtrairBoletosDoTexto(fullText, file.name);
  if (!achados.length) return null;
  var a = achados[0];
  return {
    cliente: a.cli, descricao: a.desc, valor: a.valor, vencimento: a.venc, categoria: a.cat,
    linhaDig: a.linhaDig, nn: a.nn, nDoc: a.nDoc, pix: a.pix,
    cnpjBenef: a.cnpjBenef, pagadorNome: a.pagadorNome, pagadorDoc: a.pagadorDoc, pagadorLocal: a.pagadorLocal,
    dtEmissao: a.dtEmissao, vencOriginal: a.vencOriginal, valorOriginal: a.valorOriginal,
    encargosAtraso: a.encargosAtraso, valorAtualizado: a.valorAtualizado, instrucoes: a.instrucoes,
    cargaId: a.cargaId, parcAtual: a.parcAtual, parcTotal: a.parcTotal,
    parc: (a.parcAtual && a.parcTotal) ? (a.parcAtual + '/' + a.parcTotal) : '',
    obs: a.instrucoes || '',
    // Demais parcelas do mesmo carnê/PDF (além da 1ª, já usada acima) —
    // antes eram descartadas; agora viram cartões extras no formulário.
    parcelasExtras: achados.slice(1)
  };
}

function _bPreencherComExtracao(d) {
  var s = function(id, v) { var el = document.getElementById(id); if (el && !el.value && v) el.value = v; };
  s('bCli', d.cliente);
  s('bDesc', d.descricao);
  if (d.valor) s('bValor', d.valor);

  // Vencimento: em "Novo Boleto" o campo já vem preenchido com uma sugestão
  // padrão (hoje+30) — nesse caso a extração pode (e deve) sobrescrever;
  // se o usuário já tiver mexido nele manualmente, respeita o que está lá.
  if (d.vencimento) {
    var vEl = document.getElementById('bVenc');
    if (vEl && (!vEl.value || _bVencAutoPreenchido)) vEl.value = d.vencimento;
  }
  _bVencAutoPreenchido = false;

  if (d.categoria && B_CAT[d.categoria]) { var c = document.getElementById('bCat'); if (c) c.value = d.categoria; }
  s('bParc', d.parc);
  if (d.fpag && B_FPAG[d.fpag]) { var fEl = document.getElementById('bFpag'); if (fEl) fEl.value = d.fpag; }
  s('bObs', d.obs);

  _bAnexoDadosExtra = _bExtrairCamposExtras(d);
  toast('🤖 Dados preenchidos automaticamente — confira antes de salvar');
}

function _bArquivoParaBase64(file) {
  return new Promise(function(res, rej) {
    var r = new FileReader();
    r.onload = function() { res(r.result.split(',')[1]); };
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// Boleto em PDF não tem foto — renderiza a 1ª página num canvas (via
// pdf.js, já usado pelo importador de boletos) e manda como imagem pra IA.
async function _bPdfParaImagemBase64(file) {
  var pdfjsLib;
  try { pdfjsLib = await _bCarregarPdfJs(); } catch (e) { return null; }
  var buf = await file.arrayBuffer();
  var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
  var page = await pdf.getPage(1);
  var viewport = page.getViewport({ scale: 2 });
  var canvas = document.createElement('canvas');
  canvas.width = viewport.width; canvas.height = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise;
  return canvas.toDataURL('image/png').split(',')[1];
}

async function _bExtrairDadosAnexoIA(file) {
  var _aiKey = (CFG.emp && CFG.emp.apiKey) || '';
  if (!_aiKey) return null;

  var mediaType, base64;
  if (file.type === 'application/pdf') {
    base64 = await _bPdfParaImagemBase64(file);
    mediaType = 'image/png';
    if (!base64) return null;
  } else {
    base64 = await _bArquivoParaBase64(file);
    mediaType = file.type;
  }

  var prompt =
    'Extraia os dados deste boleto/comprovante/nota. Retorne APENAS JSON válido, sem markdown:\n' +
    '{"cliente":"nome do cliente ou fornecedor/beneficiário","descricao":"descrição curta (ex: Fatura energia, Parcela 2/3)",' +
    '"valor":0.00,"vencimento":"AAAA-MM-DD",' +
    '"categoria":"uma destas: parcela|saldo|cobranca|entrada|energia|agua|aluguel|fornecedor|funcionario|ferramentas|material|imposto|servico|outros_pagar",' +
    '"cnpjBenef":"CNPJ do beneficiário, se aparecer","pagadorNome":"nome do pagador, se aparecer","pagadorDoc":"CPF/CNPJ do pagador, se aparecer",' +
    '"nn":"nosso número, se aparecer","instrucoes":"texto de juros/multa/desconto, se aparecer"}\n' +
    'Se algum dado não aparecer na imagem, deixe "" ou 0. Datas sempre em AAAA-MM-DD. Retorne SÓ o JSON.';

  var _aiIsAnthropic = _aiKey.indexOf('sk-ant-') === 0;
  var _aiIsGemini    = (_aiKey.indexOf('AIza') === 0 || _aiKey.indexOf('AQ.') === 0);
  var txt;

  if (_aiIsAnthropic) {
    var r1 = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'x-api-key':_aiKey, 'anthropic-version':'2023-06-01', 'anthropic-dangerous-direct-browser-access':'true' },
      body: JSON.stringify({ model:'claude-haiku-4-5-20251001', max_tokens:500, messages:[{
        role:'user', content:[
          { type:'image', source:{ type:'base64', media_type: mediaType, data: base64 } },
          { type:'text', text: prompt }
        ]
      }]})
    });
    var d1 = await r1.json();
    if (d1.error) throw new Error(d1.error.message || 'Erro Anthropic');
    txt = (d1.content && d1.content[0] && d1.content[0].text) || '';
  } else if (_aiIsGemini) {
    var r2 = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + _aiKey, {
      method: 'POST', headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ contents:[{ role:'user', parts:[
        { inline_data:{ mime_type: mediaType, data: base64 } },
        { text: prompt }
      ]}], generationConfig:{ maxOutputTokens:500 } })
    });
    var d2 = await r2.json();
    if (d2.error) throw new Error(d2.error.message || 'Erro Gemini');
    txt = (d2.candidates && d2.candidates[0] && d2.candidates[0].content && d2.candidates[0].content.parts && d2.candidates[0].content.parts[0] && d2.candidates[0].content.parts[0].text) || '';
  } else {
    var r3 = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST', headers: { 'Content-Type':'application/json', 'Authorization':'Bearer ' + _aiKey },
      body: JSON.stringify({ model:'meta-llama/llama-4-scout-17b-16e-instruct', max_tokens:500, messages:[{
        role:'user', content:[
          { type:'text', text: prompt },
          { type:'image_url', image_url:{ url: 'data:' + mediaType + ';base64,' + base64 } }
        ]
      }]})
    });
    var d3 = await r3.json();
    if (d3.error) throw new Error(d3.error.message || 'Erro Groq');
    txt = (d3.choices && d3.choices[0] && d3.choices[0].message && d3.choices[0].message.content) || '';
  }

  txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(txt); } catch (e) { return null; }
}

// ══════════════════════════════════════════════════════════════════════
// SALVAR BOLETO
// ══════════════════════════════════════════════════════════════════════
function _bMarcarCampoInvalido(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.borderColor = '#ff5555';
  el.style.boxShadow = '0 0 0 1px #ff5555';
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.focus();
  var limpar = function() { el.style.borderColor = ''; el.style.boxShadow = ''; el.removeEventListener('input', limpar); };
  el.addEventListener('input', limpar);
}

async function saveBoleto() {
  var g = function(id){return (document.getElementById(id)||{}).value||'';};
  var cli   = g('bCli').trim();
  var desc  = g('bDesc').trim();
  var valor = parseFloat(g('bValor')) || 0;
  var venc  = g('bVenc');

  if (!cli && !desc) { toast('Preencha cliente ou descrição'); _bMarcarCampoInvalido('bCli'); return; }
  if (!valor)        { toast('Preencha o valor');              _bMarcarCampoInvalido('bValor'); return; }
  if (!venc)         { toast('Preencha o vencimento');         _bMarcarCampoInvalido('bVenc'); return; }

  // Bloqueia lançar o mesmo boleto duas vezes por engano — só checa ao
  // criar um boleto novo (não ao editar um já existente).
  if (!_editBoletoId) {
    var dadosCheck = {
      linhaDig: (_bAnexoDadosExtra && _bAnexoDadosExtra.linhaDig) || '',
      cnpjBenef: (_bAnexoDadosExtra && _bAnexoDadosExtra.cnpjBenef) || '',
      valor: valor, venc: venc
    };
    var dup = _bAchaDuplicado(dadosCheck);
    if (dup) {
      toast('⚠️ Esse boleto já está lançado (' + (dup.cli||dup.desc||'') + ' — R$ ' + fm(dup.valor) + ')');
      return;
    }
  }

  var anexoId = _bAnexoIdSalvo || '';
  if (_bAnexoFile) {
    anexoId = 'anx_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
    try { await _bAnexoDBSave(anexoId, _bAnexoFile); }
    catch (e) { toast('⚠️ Boleto será salvo, mas o anexo falhou ao guardar'); anexoId = _bAnexoIdSalvo || ''; }
  }

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
    dtCriado: td(),
    anexoId: anexoId
  };
  if (_bAnexoDadosExtra) {
    Object.keys(_bAnexoDadosExtra).forEach(function(k){ obj[k] = _bAnexoDadosExtra[k]; });
  }
  var carga = _bParseCarga(obj.nDoc);
  if (carga) { obj.cargaId = carga.cargaId; obj.parcAtual = carga.parcAtual; obj.parcTotal = carga.parcTotal; }

  if (_editBoletoId) {
    var idx = (DB.b||[]).findIndex(function(x){return x.id===_editBoletoId;});
    // Não há campo no formulário pra editar o código Pix — preserva o que já
    // existia no boleto pra não perder na hora de salvar uma edição manual.
    if (idx >= 0 && DB.b[idx].pix) obj.pix = DB.b[idx].pix;
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
      (b.dtPag ? _bDetRow('Pago em', fd(b.dtPag)) : '') +
      (b.pix ? _bDetRow('Pix Copia e Cola', '<button type="button" class="btn btn-o" style="font-size:.62rem;padding:6px 10px;" onclick="bCopiarPix(' + b.id + ')">📋 Copiar código</button>') : '') +
      (b.anexoId ? _bDetRow('Anexo', '<button type="button" class="btn btn-o" style="font-size:.62rem;padding:6px 10px;" onclick="_bAbrirAnexoPorId(\'' + b.anexoId + '\')">📎 Abrir anexo</button>') : '') +
      _bResumoCarneHTML(b) +
      _bDetDadosBoletoHTML(b);
  }

  // Show/hide pagar button
  var btnPagar = document.getElementById('btnBDetPagar');
  if (btnPagar) btnPagar.style.display = (b.status==='pendente'||b.status==='vencido') ? 'block' : 'none';

  showMd('boletoDetailMd');
}

// Monta a lista [rótulo, valor] com todos os dados extras que o app conseguiu
// ler de um boleto (CNPJ, pagador, nosso número, datas, juros/multa, linha
// digitável) — usado tanto na prévia de importação em lote quanto no box de
// anexo do "Novo/Editar Boleto" e na tela de detalhe. Aceita qualquer objeto
// que tenha esses campos (item da importação, _bAnexoDadosExtra, ou o próprio
// registro salvo do boleto).
function _bLinhasDetalhesBoleto(o) {
  var linhas = [];
  if (o.nn)              linhas.push(['Nosso Número', o.nn]);
  if (o.cnpjBenef)        linhas.push(['CNPJ Beneficiário', o.cnpjBenef]);
  if (o.pagadorNome)      linhas.push(['Pagador', o.pagadorNome]);
  if (o.pagadorDoc)       linhas.push(['CPF/CNPJ Pagador', o.pagadorDoc]);
  if (o.pagadorLocal)     linhas.push(['Cidade/UF/CEP Pagador', o.pagadorLocal]);
  if (o.nDoc)             linhas.push(['Número do Documento', o.nDoc]);
  if (o.cargaId)          linhas.push(['Carga', o.cargaId + (o.parcAtual&&o.parcTotal ? (' — parcela ' + o.parcAtual + '/' + o.parcTotal) : '')]);
  if (o.dtEmissao)        linhas.push(['Data de Emissão', o.dtEmissao]);
  if (o.vencOriginal)     linhas.push(['Vencimento Original', o.vencOriginal]);
  if (o.valorOriginal)    linhas.push(['Valor Original', 'R$ ' + o.valorOriginal]);
  if (o.encargosAtraso)   linhas.push(['Encargos por Atraso', 'R$ ' + o.encargosAtraso]);
  if (o.valorAtualizado)  linhas.push(['Valor Atualizado', 'R$ ' + o.valorAtualizado]);
  if (o.instrucoes)       linhas.push(['Juros/Multa/Desconto', o.instrucoes]);
  if (o.linhaDig)         linhas.push(['Linha Digitável', o.linhaDig.replace(/(\d{5})(\d{5})(\d{5})(\d{6})(\d{5})(\d{6})(\d)(\d{14})/, '$1.$2 $3.$4 $5.$6 $7 $8')]);
  return linhas;
}

function _bDetRow(l, v) {
  return '<div style="display:flex;justify-content:space-between;align-items:baseline;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.04);gap:12px;">' +
    '<span style="font-size:.62rem;color:var(--t4);text-transform:uppercase;letter-spacing:.6px;white-space:nowrap;">' + l + '</span>' +
    '<span style="font-size:.78rem;color:var(--t2);text-align:right;">' + v + '</span></div>';
}

// Dados originais do boleto bancário (quando veio de importação/anexo com
// linha digitável) — CNPJ, pagador, nosso número, datas, juros/multa,
// linha digitável completa. Só aparece se o boleto tiver algum desses dados.
function _bDetDadosBoletoHTML(b) {
  var linhas = _bLinhasDetalhesBoleto(b);
  if (!linhas.length) return '';

  return '<div style="margin-top:14px;padding-top:10px;border-top:1px solid var(--bd);">' +
    '<div style="font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;font-weight:800;color:var(--t4);margin-bottom:4px;">📄 Dados do Boleto Original</div>' +
    linhas.map(function(l){ return _bDetRow(l[0], escH(String(l[1]))); }).join('') +
    '</div>';
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
  var b = (DB.b||[]).find(function(x){return x.id===id;});
  DB.b = (DB.b||[]).filter(function(x){return x.id!==id;});
  DB.sv();
  closeAll();
  toast('✓ Removido');
  _bRerender();
  bUpdDot();
  if (b && b.anexoId) _bAnexoDBDelete(b.anexoId).catch(function(){});
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
// Abre o seletor de arquivos direto — sem tela intermediária. O usuário
// escolhe 1 ou vários PDFs e o app lê e lança tudo sozinho (ver
// bProcessarPDFs mais abaixo).
function bAbrirSeletorPDF() {
  var input = document.getElementById('bImportFileInput');
  if (!input) {
    input = document.createElement('input');
    input.type = 'file';
    input.id = 'bImportFileInput';
    input.accept = 'application/pdf';
    input.multiple = true;
    input.style.display = 'none';
    input.onchange = function() { bProcessarPDFs(this.files); };
    document.body.appendChild(input);
  }
  input.value = '';
  input.click();
}

// Tenta adivinhar a categoria (e se é conta de casa/empresa) pelo nome do
// fornecedor extraído do PDF, pra chegar já quase pronto na prévia.
var B_CAT_KEYWORDS = [
  ['energia',    /energ|coelba|neoenergia|light\b/i],
  ['agua',       /\bagua\b|embasa|saneago|sabesp|caesb|cagece/i],
  ['imposto',    /prefeitura|receita federal|inss|fgts|darf|iptu|issqn|simples nacional/i],
  ['aluguel',    /aluguel|locacao|locação|imobiliaria|imobiliária/i],
  ['ferramentas',/ferramenta|ferragens/i],
  ['material',   /marmore|mármore|granito|quartzo|quartzito|pedras|rocha/i]
];
function bGuessCategoria(nomeFornecedor) {
  var n = nomeFornecedor || '';
  for (var i = 0; i < B_CAT_KEYWORDS.length; i++) {
    if (B_CAT_KEYWORDS[i][1].test(n)) return B_CAT_KEYWORDS[i][0];
  }
  return 'fornecedor';
}

// ── Carga (lote de compra) ─────────────────────────────────────────────
// O "número do documento" do boleto costuma vir no formato
// BASE-PARCELA/TOTAL (ex: "12345-1/3" = documento 12345, parcela 1 de 3).
// Boletos com a mesma BASE pertencem à mesma carga/compra — é assim que
// agrupamos pra saber quantas parcelas faltam pagar de cada carga.
function _bParseCarga(nDoc) {
  if (!nDoc) return null;
  var m = nDoc.match(/^(\d{4,7})-(\d{1,2})\/(\d{1,2})$/);
  if (m) return { cargaId: m[1], parcAtual: parseInt(m[2], 10), parcTotal: parseInt(m[3], 10) };
  var m2 = nDoc.match(/^(\d{4,7})-([A-Za-z])\/(\d{1,2})$/);
  if (m2) return { cargaId: m2[1], parcAtual: m2[2], parcTotal: parseInt(m2[3], 10) };
  return null;
}

// ── Resumo do Carnê ──────────────────────────────────────────────────
// Monta o resumo de uma carga a partir do cargaId de UM boleto/parcela:
// parcela atual/total, quantas já foram pagas, quantas faltam, quanto
// falta pagar e o próximo vencimento pendente. Diferente de _bListaCargas
// (que lista TODAS as cargas), esta é focada numa carga só — usada tanto
// no formulário Novo/Editar Boleto (ao detectar carnê num PDF anexado,
// antes mesmo de salvar) quanto na tela de detalhe do boleto já salvo.
// Aceita qualquer objeto com cargaId/parcAtual/parcTotal (item de
// importação, _bAnexoDadosExtra, ou o próprio boleto salvo).
function _bResumoCarne(o) {
  if (!o || !o.cargaId) return null;
  var todos = (DB.b || []).filter(function(x){ return x.cargaId === o.cargaId; });
  // Se o boleto ainda nem foi salvo (prévia no formulário, antes do
  // usuário confirmar), ele não está em DB.b ainda — usa o parcTotal do
  // próprio objeto lido do PDF como fallback pro total da carga.
  var total = (todos.length && todos[0].parcTotal) || o.parcTotal || todos.length || 1;
  var pagas = todos.filter(function(x){ return x.status === 'pago'; });
  var pendentes = todos.filter(function(x){ return x.status !== 'pago' && x.status !== 'cancelado'; });
  var valorRestante = pendentes.reduce(function(s,x){ return s + (x.valor||0); }, 0);
  var proxVenc = pendentes.reduce(function(m,x){ return (!m || (x.venc && x.venc < m)) ? x.venc : m; }, '');
  return {
    cargaId: o.cargaId,
    parcAtual: o.parcAtual || '',
    parcTotal: total,
    qtdPagas: pagas.length,
    qtdFaltam: pendentes.length,
    valorRestante: valorRestante,
    proxVenc: proxVenc
  };
}

// HTML do painel "Resumo do Carnê" — sempre visível (ao contrário do "Ver
// todos os dados", que fica escondido), pra quantas parcelas faltam e
// quanto ainda falta pagar aparecerem de cara. Retorna string vazia se o
// boleto/objeto não pertencer a uma carga.
function _bResumoCarneHTML(o) {
  var r = _bResumoCarne(o);
  if (!r) return '';
  return '<div style="margin-top:10px;padding:10px 12px;background:rgba(232,184,71,.08);border:1px solid rgba(232,184,71,.25);border-radius:10px;">' +
    '<div style="font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;font-weight:800;color:var(--gold);margin-bottom:6px;">📑 Resumo do Carnê' +
      (r.parcAtual ? ' — parcela ' + r.parcAtual + '/' + r.parcTotal : '') + '</div>' +
    '<div style="display:flex;flex-wrap:wrap;gap:10px 16px;font-size:.68rem;color:var(--t2);">' +
      '<span>✅ Pagas: <b style="color:var(--tx);">' + r.qtdPagas + '/' + r.parcTotal + '</b></span>' +
      '<span>⏳ Faltam: <b style="color:var(--tx);">' + r.qtdFaltam + '</b></span>' +
      '<span>💰 Restante: <b style="color:var(--tx);">R$ ' + fm(r.valorRestante) + '</b></span>' +
      (r.proxVenc ? '<span>📅 Próximo venc.: <b style="color:var(--tx);">' + fd(r.proxVenc) + '</b></span>' : '') +
    '</div></div>';
}

// ── Duplicidade ─────────────────────────────────────────────────────────
// Verifica se um boleto (recém lido de um PDF/foto) já existe salvo, pra
// nunca deixar lançar o mesmo boleto duas vezes por engano. Critério
// principal: linha digitável idêntica (é o identificador exato de um
// boleto bancário). Quando não há linha digitável (ex: extraído por IA de
// uma foto/nota sem código de barras), usa como critério de reserva o
// mesmo beneficiário + mesmo valor + mesmo vencimento — combinação que na
// prática só se repete quando é o mesmo boleto reenviado.
function _bAchaDuplicado(item) {
  var lista = DB.b || [];
  if (item.linhaDig) {
    var porLinha = lista.filter(function(b){ return b.linhaDig && b.linhaDig === item.linhaDig; });
    if (porLinha.length) return porLinha[0];
  }
  if (item.cnpjBenef && item.valor && item.venc) {
    var porCombo = lista.filter(function(b){
      return b.cnpjBenef === item.cnpjBenef && b.valor === item.valor && b.venc === item.venc;
    });
    if (porCombo.length) return porCombo[0];
  }
  return null;
}

async function bProcessarPDFs(fileList) {
  if (!fileList || !fileList.length) return;
  var pdfjsLib;
  try { pdfjsLib = await _bCarregarPdfJs(); }
  catch (e) { toast('Não consegui carregar a biblioteca de leitura de PDF — verifique sua conexão e tente de novo'); return; }

  toast('⏳ Lendo ' + fileList.length + ' PDF(s)...');

  var importados = 0, duplicados = 0, falhas = [];

  for (var i = 0; i < fileList.length; i++) {
    var file = fileList[i];
    var achados = [];
    try {
      var buf = await file.arrayBuffer();
      var pdf = await pdfjsLib.getDocument({ data: buf }).promise;
      var fullText = '';
      for (var p = 1; p <= pdf.numPages; p++) {
        var page = await pdf.getPage(p);
        var content = await page.getTextContent();
        fullText += content.items.map(function(it){ return it.str; }).join(' ') + '\n';
      }
      achados = bExtrairBoletosDoTexto(fullText, file.name);
    } catch (e) {
      achados = [];
    }

    // Sem linha digitável em texto (PDF escaneado como imagem, layout fora
    // do padrão bancário etc.) → último recurso: manda a 1ª página pra IA de
    // visão, igual já acontecia no anexo individual. Só entra se achar valor
    // E vencimento — não lança boleto incompleto sem o usuário perceber.
    if (!achados.length) {
      try {
        var viaIA = await _bExtrairDadosAnexoIA(file);
        if (viaIA && viaIA.valor && viaIA.vencimento) {
          achados = [{
            cli: viaIA.cliente || '', desc: viaIA.descricao || 'Boleto importado',
            cat: (viaIA.categoria && B_CAT[viaIA.categoria]) ? viaIA.categoria : bGuessCategoria(viaIA.cliente),
            valor: viaIA.valor, venc: viaIA.vencimento, arquivo: file.name,
            cnpjBenef: viaIA.cnpjBenef || '', pagadorNome: viaIA.pagadorNome || '', pagadorDoc: viaIA.pagadorDoc || '',
            nn: viaIA.nn || '', instrucoes: viaIA.instrucoes || '',
            nDoc: '', cargaId: '', parcAtual: '', parcTotal: null, linhaDig: '', pix: ''
          }];
        }
      } catch (e) { /* segue pra falha abaixo */ }
    }

    if (!achados.length) { falhas.push(file.name); continue; }

    achados.forEach(function(item) {
      if (_bAchaDuplicado(item)) { duplicados++; return; }
      _bImportarItem(item);
      importados++;
    });
  }

  if (importados) { DB.sv(); bAutoStatus(); }

  var msg = importados ? (importados + ' boleto(s) importado(s) automaticamente ✅') : 'Nenhum boleto novo importado';
  if (duplicados) msg += ' · ' + duplicados + ' já existia(m) (ignorado)';
  if (falhas.length) msg += ' · não reconheci: ' + falhas.join(', ');
  toast(msg);

  _bRerender();
  bUpdDot();
}

// Monta o registro final do boleto a partir de um item já lido (do PDF ou
// da IA de visão) e lança direto na base — sem nenhuma tela de conferência
// no meio do caminho.
function _bImportarItem(item) {
  if (!DB.b) DB.b = [];
  DB.b.unshift({
    id: Date.now() + Math.random(),
    tipo: 'pagar',
    cat: item.cat || 'fornecedor',
    cli: item.cli || '(fornecedor a definir)',
    desc: item.desc || 'Boleto importado',
    valor: item.valor,
    venc: item.venc,
    parc: (item.parcAtual && item.parcTotal) ? (item.parcAtual + '/' + item.parcTotal) : (item.nDoc || ''),
    fpag: 'boleto',
    pix: item.pix || '',
    status: (item.venc && item.venc < td()) ? 'vencido' : 'pendente',
    obs: 'Importado automaticamente de ' + item.arquivo,
    dtCriado: td(),
    linhaDig: item.linhaDig || '',
    nn: item.nn || '',
    nDoc: item.nDoc || '',
    cargaId: item.cargaId || '',
    parcAtual: item.parcAtual || '',
    parcTotal: item.parcTotal || null,
    cnpjBenef: item.cnpjBenef || '',
    pagadorNome: item.pagadorNome || '',
    pagadorDoc: item.pagadorDoc || '',
    pagadorLocal: item.pagadorLocal || '',
    dtEmissao: item.dtEmissao || '',
    vencOriginal: item.vencOriginal || '',
    valorOriginal: item.valorOriginal || '',
    encargosAtraso: item.encargosAtraso || '',
    valorAtualizado: item.valorAtualizado || '',
    instrucoes: item.instrucoes || ''
  });
}

// Tenta achar o código "Pix Copia e Cola" (BR Code / EMV) perto do boleto.
// Esse código é uma string única sem espaços que começa com "000201" e
// termina com o checksum "6304" + 4 caracteres. Quando o PDF tem esse
// código em texto selecionável perto do QR Code, a extração do pdf.js às
// vezes intercala espaços entre pedaços dele — por isso comparamos a janela
// com espaços removidos antes de procurar o padrão.
function _bExtrairPix(janela) {
  var semEspaco = janela.replace(/\s+/g, '');
  var m = semEspaco.match(/000201[0-9A-Za-z.\-\/@*]{60,600}?6304[0-9A-Fa-f]{4}/);
  return m ? m[0] : '';
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

    // O código Pix Copia e Cola e vários outros dados (CNPJ, datas, juros/multa)
    // costumam ficar mais longe do que o nome do beneficiário (perto do QR
    // Code, que pode vir depois da linha digitável), então usa uma janela mais
    // larga pra frente, limitada pelo próximo boleto do mesmo PDF.
    var fimJanelaPix = (idx + 1 < matches.length)
      ? Math.min(matches[idx + 1].index, match.index + match[0].length + 1000)
      : Math.min(texto.length, match.index + match[0].length + 1000);
    var janelaPix = texto.slice(inicioJanela, fimJanelaPix);
    var pix = _bExtrairPix(janelaPix);

    var cli = '', cnpjBenef = '';
    // Tier 1: nome com CNPJ colado logo em seguida (mais confiável quando existe)
    var fornecMatches = janela.match(/([A-ZÀ-ÜÇ0-9.&\s]{5,60}(?:LTDA|EIRELI|S\/A|S\.A\.|ME))\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/g);
    if (fornecMatches && fornecMatches.length) {
      var ultimo = fornecMatches[fornecMatches.length - 1];
      var mF = ultimo.match(/([A-ZÀ-ÜÇ0-9.&\s]{5,60}(?:LTDA|EIRELI|S\/A|S\.A\.|ME))\s+(\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2})/);
      if (mF) { cli = mF[1].trim().replace(/\s+/g, ' '); cnpjBenef = mF[2]; }
    }
    // Tier 2 (fallback): alguns layouts (ex. boletos SICOOB) colocam o CNPJ do
    // beneficiário bem longe do nome no texto extraído do PDF (a extração junta
    // tudo com espaço, sem respeitar as linhas da tabela). Nesses casos,
    // ancoramos no sufixo empresarial (LTDA/EIRELI/S/A/ME) e pegamos só as
    // palavras em maiúsculas imediatamente anteriores a ele, sem depender do CNPJ.
    if (!cli) {
      var sufixoRe = /\b(LTDA|EIRELI|S\/A|S\.A\.|ME)\b/g;
      var sm, melhor = null;
      while ((sm = sufixoRe.exec(janela)) !== null) {
        var antes = janela.slice(0, sm.index);
        var mPalavras = antes.match(/([A-ZÀ-ÜÇ0-9.&]+(?:\s+[A-ZÀ-ÜÇ0-9.&]+){0,5})\s*$/);
        if (mPalavras) melhor = (mPalavras[1] + ' ' + sm[1]).trim().replace(/\s+/g, ' ');
      }
      if (melhor) cli = melhor;
    }
    // Lista de todos os CNPJ/CPF que aparecem na janela ampla — usada tanto
    // pro fallback do CNPJ do beneficiário quanto pra achar o doc. do pagador.
    // Heurística: o CNPJ do beneficiário costuma se repetir (aparece no recibo
    // do pagador E na ficha de compensação/cabeçalho da cooperativa), enquanto
    // o doc. do pagador normalmente aparece uma vez só — por isso o mais
    // frequente vira o "candidato a beneficiário" quando não achamos por
    // adjacência ao nome (tier 1/2 acima).
    var todosDocs = (janelaPix.match(/\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}/g) || [])
      .concat(janelaPix.match(/\d{3}\.\d{3}\.\d{3}-\d{2}/g) || []);
    var contagemDocs = {};
    todosDocs.forEach(function(d){ contagemDocs[d] = (contagemDocs[d] || 0) + 1; });
    var docsPorFrequencia = Object.keys(contagemDocs).sort(function(a, b){ return contagemDocs[b] - contagemDocs[a]; });
    if (!cnpjBenef && docsPorFrequencia.length) cnpjBenef = docsPorFrequencia[0];

    var nDoc = '';
    // BUG CORRIGIDO: o padrão de fallback (\d{4,7}-\d{2}) batia tanto no
    // número real do documento (ex: "32009-04") quanto no filial-DV de um
    // CNPJ no formato .../0001-28 (o "0001-28" também é 4-7 dígitos, hífen,
    // 2 dígitos). O lookbehind (?<!\/) exclui esse segundo caso, já que o
    // trecho do CNPJ sempre vem logo depois de uma barra.
    var docMatches = janela.match(/\b\d{4,7}-\d{1,2}\/\d{1,2}\b/g) ||
                     janela.match(/\b\d{4,7}-[A-Z]\/\d\b/g) ||
                     janela.match(/(?<!\/)\b\d{4,7}-\d{2}\b/g);
    if (docMatches && docMatches.length) nDoc = docMatches[docMatches.length - 1];
    var carga = _bParseCarga(nDoc);

    var nn = '';
    var nnMatches = [].concat(janelaPix.match(/Nosso\s*[Nn][úu]mero\D{0,15}?\d{4,8}/g) || []);
    if (nnMatches.length) {
      var mNN = nnMatches[nnMatches.length - 1].match(/(\d{4,8})$/);
      if (mNN) nn = mNN[1];
    }

    // ── Dados extras (pagador, datas, instruções de juros/multa) — tudo
    // "best effort": se não achar, fica vazio e some da tela de detalhe. ──
    var cpfCnpjPagador = '';
    for (var di = 0; di < docsPorFrequencia.length; di++) {
      if (docsPorFrequencia[di] !== cnpjBenef) { cpfCnpjPagador = docsPorFrequencia[di]; break; }
    }

    var pagadorNome = '';
    if (nDoc) {
      var nDocEsc = nDoc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      var mPagNome = janela.match(new RegExp('([A-ZÀ-ÜÇ][A-ZÀ-ÜÇ\\s]{4,60})\\s+' + nDocEsc));
      if (mPagNome) pagadorNome = mPagNome[1].trim().replace(/\s+/g, ' ');
    }

    var localMatches = janelaPix.match(/[A-ZÀ-ÜÇ][A-ZÀ-ÜÇ\s]{2,35}\s*[-–]?\s*\b[A-Z]{2}\b\s+\d{5}-?\d{3}/g) || [];
    var pagadorLocal = localMatches.length ? localMatches[localMatches.length - 1].trim().replace(/\s+/g, ' ') : '';

    var dtEmissao = (janelaPix.match(/Data de Emiss[ãa]o\D{0,15}?(\d{2}\/\d{2}\/\d{4})/) || [])[1] || '';

    var vencOriginal    = (janelaPix.match(/Vencimento original:\s*(\d{2}\/\d{2}\/\d{4})/) || [])[1] || '';
    var valorOriginal   = (janelaPix.match(/Valor original:\s*R\$\s*([\d.,]+)/) || [])[1] || '';
    var encargosAtraso  = (janelaPix.match(/Encargos por atraso:\s*R\$\s*([\d.,]+)/) || [])[1] || '';
    var valorAtualizado = (janelaPix.match(/Valor atualizado:\s*R\$\s*([\d.,]+)/) || [])[1] || '';

    var instrPartes = [];
    var mJuros = janelaPix.match(/A partir \d{2}\/\d{2}\/\d{4}\s*Juros\s*[\d,]+%\s*\/?\s*dia\.?/i);
    if (mJuros) instrPartes.push(mJuros[0]);
    var mMulta = janelaPix.match(/A partir \d{2}\/\d{2}\/\d{4}\s*Multa\s*(?:de)?\s*[\d,]+%\.?/i) ||
                 janelaPix.match(/Multa\s*(?:de)?\s*[\d,]+%\.?/i);
    if (mMulta) instrPartes.push(mMulta[0]);
    if (/N[ãa]o conceder desconto/i.test(janelaPix)) instrPartes.push('Não conceder desconto.');
    var instrucoes = instrPartes.join(' ');

    results.push({
      linhaDig: linhaDigits,
      cli: cli || '',
      desc: nDoc ? ('Doc. ' + nDoc) : (nn ? ('Boleto ' + nn) : 'Boleto importado'),
      cat: bGuessCategoria(cli),
      nDoc: nDoc,
      nn: nn,
      pix: pix,
      valor: dec.valor,
      venc: dec.venc,
      arquivo: nomeArquivo,
      cnpjBenef: cnpjBenef,
      pagadorNome: pagadorNome,
      pagadorDoc: cpfCnpjPagador,
      pagadorLocal: pagadorLocal,
      dtEmissao: dtEmissao,
      vencOriginal: vencOriginal,
      valorOriginal: valorOriginal,
      encargosAtraso: encargosAtraso,
      valorAtualizado: valorAtualizado,
      instrucoes: instrucoes,
      cargaId: carga ? carga.cargaId : '',
      parcAtual: carga ? carga.parcAtual : '',
      parcTotal: carga ? carga.parcTotal : null,
      _jaExiste: (DB.b || []).some(function(b){ return b.linhaDig === linhaDigits; })
    });
  });
  return results;
}

// Bloco recolhível genérico de "ver todos os dados" — recebe a lista de
// linhas já montada e o onclick/id do container a expandir/recolher.
// Usado na caixa de anexo do formulário Novo/Editar Boleto.
function _bCaixaDetalhesToggle(linhas, onclickFn, containerId) {
  var corpo = linhas.map(function(l){
    return '<div style="display:flex;justify-content:space-between;gap:10px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.05);">' +
      '<span style="font-size:.6rem;color:var(--t4);text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;">' + l[0] + '</span>' +
      '<span style="font-size:.66rem;color:var(--t2);text-align:right;word-break:break-word;">' + escH(String(l[1])) + '</span>' +
      '</div>';
  }).join('');

  return '<div style="margin-top:8px;">' +
    '<div onclick="' + onclickFn + '" style="font-size:.62rem;color:var(--gold);font-weight:700;cursor:pointer;user-select:none;">▾ Ver todos os dados do boleto</div>' +
    '<div id="' + containerId + '" style="display:none;margin-top:6px;background:var(--s3,rgba(0,0,0,.15));border-radius:8px;padding:8px 10px;">' + corpo + '</div>' +
    '</div>';
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
