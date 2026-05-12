// ══════════════════════════════════════════════════════════════════════
// MÓDULO TÚMULOS — HR Mármores e Granitos
// Orçamento profissional e automático de túmulos/jazigos
// ══════════════════════════════════════════════════════════════════════

var TUM = {

  q: {
    // ── IDENTIFICAÇÃO ─────────────────────────────────────────────
    cli:        '',
    falecido:   '',
    cemiterio:  '',
    quadra:     '',
    lote:       '',
    obs:        '',

    // ── MODELO VISUAL ─────────────────────────────────────────────
    fotoModelo: '',        // base64 da foto de referência
    descModelo: '',        // descrição personalizada do cliente
    tipoBase:   'simples', // preset inicial

    // ── DIMENSÕES ESTRUTURAIS ─────────────────────────────────────
    dims: {
      comp:       2.20,  // comprimento externo (m)
      larg:       0.90,  // largura externa (m)
      altEst:     0.40,  // altura da estrutura (base elevada) (m)
      espParede:  0.15,  // espessura das paredes (m)
      espLaje:    0.10,  // espessura da laje (m)
      espTampa:   0.03,  // espessura da tampa de granito (m)
    },

    // ── GAVETAS (compartimentos de caixão) ────────────────────────
    // Cada gaveta é um nível interno. Altura por gaveta: ~0,70m
    gavetas: 1,
    altPorGaveta: 0.70, // altura por compartimento (m)

    // ── PEDRA ─────────────────────────────────────────────────────
    stoneId:    null,
    stonePrice: 0,
    perda:      15,    // % de perda no corte

    // Peças de pedra: on/off + m² calculado automaticamente + acréscimo manual
    pedras: {
      tampa:      { on: true,  m2: 0, extra: 0, desc: 'Tampa removível superior' },
      laterais:   { on: true,  m2: 0, extra: 0, desc: 'Laterais (×2)' },
      frente:     { on: true,  m2: 0, extra: 0, desc: 'Frente frontal' },
      fundo:      { on: false, m2: 0, extra: 0, desc: 'Parede de fundo' },
      lapide:     { on: false, m2: 0, extra: 0, desc: 'Lápide gravada' },
      revestExt:  { on: false, m2: 0, extra: 0, desc: 'Revestimento externo' },
      moldura:    { on: false, ml: 0, vlrMl: 120, extra: 0, desc: 'Moldura (ml)' },
      pingadeira: { on: false, ml: 0, vlrMl: 80,  extra: 0, desc: 'Pingadeira (ml)' },
    },

    // ── ESTRUTURA CIVIL ───────────────────────────────────────────
    estrutura: {
      fundacao:    { on: true,  m3: 0, preco: 350  }, // m³ de concreto na fundação
      paredes:     { on: true,  m2: 0, preco: 280  }, // m² de alvenaria
      laje:        { on: true,  m2: 0, preco: 320  }, // m² de laje armada
      reforco:     { on: true,  kg: 0, preco: 14   }, // kg de ferragem
      concreto:    { on: true,  m3: 0, preco: 420  }, // m³ concreto armado gavetas
    },

    // ── MATERIAIS DE CONSTRUÇÃO ───────────────────────────────────
    mat: {
      cimento:  { on: true,  qty: 0, preco: 38,  unid: 'sc'  },
      areia:    { on: true,  qty: 0, preco: 200, unid: 'm³'  },
      brita:    { on: true,  qty: 0, preco: 220, unid: 'm³'  },
      argamassa:{ on: true,  qty: 0, preco: 32,  unid: 'sc'  },
      cola:     { on: true,  qty: 0, preco: 48,  unid: 'sc'  },
      rejunte:  { on: true,  qty: 0, preco: 14,  unid: 'kg'  },
      ferro:    { on: true,  qty: 0, preco: 14,  unid: 'kg'  },
      tijolos:  { on: false, qty: 0, preco: 1.20,unid: 'un'  },
      frete:    { on: true,  vlr: 0 },
    },

    // ── MÃO DE OBRA ───────────────────────────────────────────────
    mdo: {
      pedreiro:   { on: true,  dias: 2, diaria: 350 },
      ajudante:   { on: true,  dias: 2, diaria: 220 },
      marmorista: { on: true,  dias: 2, diaria: 400 },
      acabamento: { on: true,  custo: 150, venda: 280 },
      instalacao: { on: true,  custo: 200, venda: 380 },
      transporte: { on: true,  custo: 120, venda: 180 },
      riscoQuebra:{ on: true,  perc: 3 },
    },

    // ── EXTRAS ────────────────────────────────────────────────────
    lapide: {
      on: false, tipo: 'padrao',
      custo: 280, venda: 480,
      linhas: 4, custoPorLinha: 35, vendaPorLinha: 60,
      texto: '',
    },
    cruz: {
      on: false, tipo: 'granito', modelo: 'simples',
      custo: 180, venda: 340,
    },
    foto: {
      on: false, tamanho: '10x15',
      custo: 85, venda: 160,
      moldura: false, custoMoldura: 40, vendaMoldura: 80,
    },

    // ── PRECIFICAÇÃO ──────────────────────────────────────────────
    margem:   40,
    desconto: 0,
  },

  calc: {},

  // ─────────────────────────────────────────────────────────────────
  // PRESETS DE TIPO
  // ─────────────────────────────────────────────────────────────────
  TIPOS: {
    simples: {
      label: 'Simples (sem gaveta)', icon: '⬜',
      desc:  'Base elevada + laterais + frente + tampa. Sem espaço interno para caixão.',
      gavetas: 0, altEst: 0.40,
      pedras:     ['tampa','laterais','frente'],
      estrutura:  ['fundacao','paredes'],
      diasPedreiro: 1, diasMarmorista: 1,
    },
    uma_gaveta: {
      label: '1 Gaveta', icon: '⬛',
      desc:  'Um compartimento interno para caixão adulto. Estrutura em bloco/tijolo.',
      gavetas: 1, altEst: 0.70,
      pedras:     ['tampa','laterais','frente'],
      estrutura:  ['fundacao','paredes','laje','reforco','concreto'],
      diasPedreiro: 2, diasMarmorista: 2,
    },
    duas_gavetas: {
      label: '2 Gavetas', icon: '📦',
      desc:  'Dois compartimentos sobrepostos. Estrutura reforçada.',
      gavetas: 2, altEst: 1.40,
      pedras:     ['tampa','laterais','frente','lapide'],
      estrutura:  ['fundacao','paredes','laje','reforco','concreto'],
      diasPedreiro: 4, diasMarmorista: 3,
    },
    tres_gavetas: {
      label: '3 Gavetas', icon: '🗃️',
      desc:  'Três compartimentos. Concreto armado obrigatório.',
      gavetas: 3, altEst: 2.10,
      pedras:     ['tampa','laterais','frente','lapide','moldura'],
      estrutura:  ['fundacao','paredes','laje','reforco','concreto'],
      diasPedreiro: 6, diasMarmorista: 4,
    },
    jazigo: {
      label: 'Jazigo Familiar', icon: '🏛️',
      desc:  'Estrutura monumental, 4+ gavetas, acabamento completo.',
      gavetas: 4, altEst: 2.80,
      pedras:     ['tampa','laterais','frente','fundo','lapide','revestExt','moldura','pingadeira'],
      estrutura:  ['fundacao','paredes','laje','reforco','concreto'],
      diasPedreiro: 10, diasMarmorista: 7,
    },
    reforma: {
      label: 'Reforma / Revestimento', icon: '🔧',
      desc:  'Somente revestimento em pedra de estrutura existente.',
      gavetas: 0, altEst: 0.80,
      pedras:     ['tampa','laterais','frente','revestExt'],
      estrutura:  ['paredes'],
      diasPedreiro: 1, diasMarmorista: 2,
    },
  },

  PEDRA_LABELS: {
    tampa:      'Tampa removível',
    laterais:   'Laterais (×2)',
    frente:     'Frente',
    fundo:      'Fundo',
    lapide:     'Lápide na pedra',
    revestExt:  'Revestimento externo',
    moldura:    'Moldura (ml)',
    pingadeira: 'Pingadeira (ml)',
  },

  EST_LABELS: {
    fundacao:  'Fundação (concreto)',
    paredes:   'Paredes / Alvenaria',
    laje:      'Laje armada',
    reforco:   'Ferragem / Armação',
    concreto:  'Concreto armado gavetas',
  },

  MAT_LABELS: {
    cimento:   'Cimento',
    areia:     'Areia',
    brita:     'Brita',
    argamassa: 'Argamassa / Massa',
    cola:      'Cola p/ Granito',
    rejunte:   'Rejunte',
    ferro:     'Ferro (vergalhão)',
    tijolos:   'Tijolos / Blocos',
    frete:     'Frete materiais',
  },

  MDO_LABELS: {
    pedreiro:    'Pedreiro',
    ajudante:    'Ajudante',
    marmorista:  'Marmorista',
    acabamento:  'Acabamento final',
    instalacao:  'Instalação da pedra',
    transporte:  'Transporte',
    riscoQuebra: 'Risco de quebra (%)',
  },
};

// ══════════════════════════════════════════════════════════════════════
// INIT / RENDER
// ══════════════════════════════════════════════════════════════════════
function tumInit() { renderTum(); }

function renderTum() {
  var pg = document.getElementById('pg9');
  if (!pg) return;
  _tumAutoCalc();
  TUM.calc = _tumCalc();
  pg.innerHTML =
    _tumHero() +
    _tumTabs() +
    '<div id="tumBody"></div>' +
    '<div style="height:90px;"></div>';
  _tumRenderTab();
}

// ══════════════════════════════════════════════════════════════════════
// HERO
// ══════════════════════════════════════════════════════════════════════
function _tumHero() {
  var r = TUM.calc;
  var vf = r.venda || 0;
  var lucro = r.lucroTotal || 0;
  var margemPct = r.margemReal || 0;
  var tipo = TUM.TIPOS[TUM.q.tipoBase] || {};
  return '<div class="tum-hero">' +
    '<div class="tum-hero-row">' +
    '<div>' +
    '<div class="tum-hero-title">⚰️ Orçamento de Túmulo</div>' +
    '<div class="tum-hero-sub">' + (tipo.label || '') + (TUM.q.gavetas > 0 ? ' · ' + TUM.q.gavetas + ' gaveta' + (TUM.q.gavetas > 1 ? 's' : '') : '') + '</div>' +
    '</div>' +
    '<div style="text-align:right;">' +
    '<div class="tum-hero-val">' + (vf > 0 ? 'R$ ' + fm(vf) : '—') + '</div>' +
    (lucro > 0 ? '<div style="font-size:.65rem;color:#4cda80;margin-top:2px;">lucro R$ ' + fm(lucro) + ' · ' + margemPct.toFixed(0) + '%</div>' : '') +
    '</div>' +
    '</div>' +
    '</div>';
}

// ══════════════════════════════════════════════════════════════════════
// TABS
// ══════════════════════════════════════════════════════════════════════
var _tumTab = 'projeto';

function _tumTabs() {
  var tabs = [
    { k: 'projeto',    i: '📐', l: 'Projeto'   },
    { k: 'pedras',     i: '🪨', l: 'Pedra'     },
    { k: 'estrutura',  i: '🏗️', l: 'Estrutura' },
    { k: 'materiais',  i: '🪣', l: 'Materiais' },
    { k: 'mdo',        i: '🔨', l: 'MO'        },
    { k: 'extras',     i: '✨', l: 'Extras'    },
    { k: 'resumo',     i: '💰', l: 'Resumo'    },
  ];
  var h = '<div class="tum-tabs">';
  tabs.forEach(function(t) {
    h += '<div class="tum-tab' + (_tumTab === t.k ? ' on' : '') + '" onclick="tumTab(\'' + t.k + '\')">' +
      '<span>' + t.i + '</span><span>' + t.l + '</span></div>';
  });
  h += '</div>';
  return h;
}

function tumTab(t) { _tumTab = t; renderTum(); }

function _tumRenderTab() {
  var body = document.getElementById('tumBody');
  if (!body) return;
  switch (_tumTab) {
    case 'projeto':   body.innerHTML = _tabProjeto();   break;
    case 'pedras':    body.innerHTML = _tabPedras();    break;
    case 'estrutura': body.innerHTML = _tabEstrutura(); break;
    case 'materiais': body.innerHTML = _tabMateriais(); break;
    case 'mdo':       body.innerHTML = _tabMdo();       break;
    case 'extras':    body.innerHTML = _tabExtras();    break;
    case 'resumo':    body.innerHTML = _tabResumo();    break;
  }
}

// ══════════════════════════════════════════════════════════════════════
// ABA PROJETO — identificação + modelo visual + dimensões + gavetas
// ══════════════════════════════════════════════════════════════════════
function _tabProjeto() {
  var q = TUM.q;
  var h = '<div class="tum-sec">';

  // ── Identificação ─────────────────────────────────────────────
  h += '<div class="tum-sec-lbl">👤 Identificação</div>';
  h += '<div class="tum-grid2">';
  h += _tIn('text', 'Cliente / Família', q.cli,       "TUM.q.cli=this.value",       'Família Silva...');
  h += _tIn('text', 'Falecido(a)',       q.falecido,  "TUM.q.falecido=this.value",  'Nome completo');
  h += _tIn('text', 'Cemitério',         q.cemiterio, "TUM.q.cemiterio=this.value", 'Cemitério Municipal');
  h += _tIn('text', 'Quadra / Lote',     q.quadra,    "TUM.q.quadra=this.value",    'Q-04 L-15');
  h += '</div>';

  // ── Tipo base ─────────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">⚰️ Tipo de Estrutura</div>';
  h += '<div class="tum-tipos-grid">';
  Object.keys(TUM.TIPOS).forEach(function(k) {
    var t = TUM.TIPOS[k];
    h += '<div class="tum-tipo-card' + (q.tipoBase === k ? ' on' : '') + '" onclick="tumSetTipo(\'' + k + '\')">' +
      '<div class="tum-tipo-icon">' + t.icon + '</div>' +
      '<div class="tum-tipo-label">' + t.label + '</div>' +
      '<div class="tum-tipo-desc">' + t.desc + '</div>' +
      '</div>';
  });
  h += '</div>';

  // ── Foto de modelo ────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📷 Foto de Referência</div>';
  h += '<div class="tum-foto-area">';
  if (q.fotoModelo) {
    h += '<img src="' + q.fotoModelo + '" style="width:100%;max-height:220px;object-fit:contain;border-radius:10px;border:1px solid var(--bd2);">';
    h += '<div style="display:flex;gap:8px;margin-top:8px;">';
    h += '<button class="btn btn-o" style="flex:1;font-size:.7rem;" onclick="tumFotoRemover()">✕ Remover foto</button>';
    h += '<button class="btn btn-g" style="flex:1;font-size:.7rem;" onclick="tumFotoUpload()">📷 Trocar</button>';
    h += '</div>';
  } else {
    h += '<div class="tum-foto-empty" onclick="tumFotoUpload()">';
    h += '<div style="font-size:2rem;margin-bottom:6px;">📷</div>';
    h += '<div style="font-size:.72rem;color:var(--t3);">Toque para adicionar foto de referência</div>';
    h += '<div style="font-size:.6rem;color:var(--t4);margin-top:4px;">Modelo, foto do túmulo existente, referência do cliente</div>';
    h += '</div>';
  }
  h += '<input type="file" id="tumFotoInp" accept="image/*" style="display:none;" onchange="tumFotoOnFile(this)">';
  h += '</div>';

  // ── Descrição personalizada ───────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:14px;">📝 Descrição do Projeto</div>';
  h += '<textarea class="tum-obs" rows="3" placeholder="Descreva o projeto: cor da pedra, estilo, desejos do cliente, referências..." onchange="TUM.q.descModelo=this.value">' + (q.descModelo || '') + '</textarea>';

  // ── Dimensões ─────────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📐 Dimensões (m)</div>';
  h += '<div style="background:var(--s3);border:1px solid rgba(100,180,255,.15);border-radius:10px;padding:10px 13px;margin-bottom:10px;font-size:.63rem;color:var(--t3);line-height:1.6;">';
  h += '💡 Dimensões <b>externas</b> da estrutura. A altura total é calculada automaticamente pelas gavetas.';
  h += '</div>';
  h += '<div class="tum-grid3">';
  h += _tDim('Comprimento (m)', 'comp',    q.dims.comp,    '2.20');
  h += _tDim('Largura (m)',     'larg',    q.dims.larg,    '0.90');
  h += _tDim('Parede (m)',      'espParede',q.dims.espParede,'0.15');
  h += _tDim('Esp. Laje (m)',   'espLaje', q.dims.espLaje, '0.10');
  h += _tDim('Esp. Tampa (m)',  'espTampa',q.dims.espTampa,'0.03');
  h += '</div>';

  // ── Gavetas ───────────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">⬛ Compartimentos (Gavetas)</div>';
  h += '<div style="background:var(--s3);border:1px solid rgba(201,168,76,.15);border-radius:12px;padding:12px 14px;">';
  h += '<div style="font-size:.62rem;color:var(--t3);margin-bottom:10px;line-height:1.6;">Cada compartimento (gaveta) comporta <b>1 caixão adulto</b>. A altura da estrutura é calculada automaticamente.</div>';

  // Contador de gavetas
  h += '<div style="display:flex;align-items:center;gap:16px;margin-bottom:12px;">';
  h += '<button class="tum-gav-btn" onclick="tumSetGavetas(Math.max(0,' + q.gavetas + '-1))">−</button>';
  h += '<div style="text-align:center;flex:1;">';
  h += '<div style="font-size:2rem;font-weight:900;color:var(--gold2);">' + q.gavetas + '</div>';
  h += '<div style="font-size:.62rem;color:var(--t3);">' + (q.gavetas === 0 ? 'sem gaveta' : 'compartimento' + (q.gavetas > 1 ? 's' : '')) + '</div>';
  h += '</div>';
  h += '<button class="tum-gav-btn" onclick="tumSetGavetas(' + (q.gavetas + 1) + ')">+</button>';
  h += '</div>';

  // Alt por gaveta
  h += '<div class="tum-grid2">';
  h += '<div class="tum-f"><label class="tum-lbl">Altura por gaveta (m)</label>';
  h += '<input class="tum-in" type="number" step="0.05" min="0.50" max="1.00" value="' + q.altPorGaveta + '" onchange="TUM.q.altPorGaveta=+this.value;tumRecalc()"></div>';
  h += '<div class="tum-f"><label class="tum-lbl">Altura total calculada</label>';
  var altTotal = q.dims.altEst + (q.gavetas * q.altPorGaveta) + q.dims.espLaje + q.dims.espTampa;
  h += '<div style="padding:10px;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.2);border-radius:8px;font-size:.82rem;font-weight:700;color:var(--gold2);">' + altTotal.toFixed(2) + ' m</div>';
  h += '</div></div>';

  // Resumo visual de altura
  h += _alturaVisual(q);
  h += '</div>';

  // ── Pedra ─────────────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">🪨 Pedra</div>';
  var sel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones ? CFG.stones.find(function(s) { return s.id === q.stoneId; }) : null;
  h += '<div class="tum-stone-row">';
  if (sel) {
    h += '<div class="tum-stone-sel"><div class="tum-stone-nm">' + sel.nm + '</div><div class="tum-stone-pr">R$ ' + fm(sel.pr) + '/m²</div></div>';
  } else {
    h += '<div class="tum-stone-empty">Nenhuma pedra selecionada</div>';
  }
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumOpenStonePick()">Escolher</button>';
  h += '</div>';

  h += '<div style="margin-top:8px;display:flex;align-items:center;gap:10px;">';
  h += '<label class="tum-lbl" style="margin:0;">Perda / Desperdício (%)</label>';
  h += '<input class="tum-in" type="number" value="' + (q.perda || 15) + '" min="5" max="40" style="max-width:80px;" onchange="TUM.q.perda=+this.value;tumRecalc()">';
  h += '</div>';

  // Navegação
  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-g" onclick="tumTab(\'pedras\')">Próximo: Pedra →</button>';
  h += '</div></div>';
  return h;
}

// Visual de altura em camadas
function _alturaVisual(q) {
  var altEst   = q.dims.altEst;
  var altGavs  = q.gavetas * q.altPorGaveta;
  var altLaje  = q.dims.espLaje;
  var altTampa = q.dims.espTampa;
  var altTotal = altEst + altGavs + altLaje + altTampa;
  if (altTotal <= 0) return '';

  function pct(v) { return (v / altTotal * 100).toFixed(1); }

  var h = '<div style="margin-top:12px;">';
  h += '<div style="font-size:.58rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t4);margin-bottom:6px;">Composição da altura</div>';
  h += '<div style="border-radius:8px;overflow:hidden;border:1px solid var(--bd2);">';

  var camadas = [
    { label: 'Tampa granito',   val: altTampa, cor: '#C9A84C', opacity: '.9'  },
    { label: 'Laje de cobertura', val: altLaje,  cor: '#666',    opacity: '.8'  },
  ];
  for (var i = 0; i < q.gavetas; i++) {
    camadas.push({ label: 'Gaveta ' + (i + 1) + ' (' + q.altPorGaveta.toFixed(2) + 'm)', val: q.altPorGaveta, cor: '#4a80b5', opacity: '.7' });
  }
  camadas.push({ label: 'Base estrutural', val: altEst, cor: '#483828', opacity: '1' });

  // Renderiza de cima pra baixo
  camadas.forEach(function(c) {
    if (!c.val) return;
    h += '<div style="background:' + c.cor + ';opacity:' + c.opacity + ';padding:5px 10px;' +
      'min-height:' + Math.max(24, pct(c.val) * 1.5) + 'px;display:flex;align-items:center;justify-content:space-between;">' +
      '<span style="font-size:.6rem;color:#fff;font-weight:600;">' + c.label + '</span>' +
      '<span style="font-size:.6rem;color:rgba(255,255,255,.8);">' + c.val.toFixed(2) + 'm</span>' +
      '</div>';
  });
  h += '</div>';
  h += '<div style="text-align:right;font-size:.65rem;color:var(--gold2);font-weight:700;margin-top:4px;">Total: ' + altTotal.toFixed(2) + ' m</div>';
  h += '</div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA PEDRAS
// ══════════════════════════════════════════════════════════════════════
function _tabPedras() {
  var q = TUM.q;
  var sel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones ? CFG.stones.find(function(s) { return s.id === q.stoneId; }) : null;
  var stPr = sel ? sel.pr : (q.stonePrice || 0);

  var h = '<div class="tum-sec">';
  if (!stPr) h += '<div class="tum-warn">⚠️ Selecione uma pedra na aba Projeto para ver os valores.</div>';

  h += '<div class="tum-sec-lbl">🪨 Peças de Granito</div>';
  h += '<div style="background:var(--s3);border-radius:10px;padding:9px 12px;margin-bottom:10px;font-size:.62rem;color:var(--t3);line-height:1.6;">';
  h += '📏 Áreas calculadas automaticamente pelas dimensões. Ajuste manualmente se necessário.';
  h += '</div>';

  h += '<div class="tum-peca-list">';
  Object.keys(TUM.PEDRA_LABELS).forEach(function(k) {
    var peca = q.pedras[k]; if (!peca) return;
    var isML = (k === 'moldura' || k === 'pingadeira');
    var m2   = isML ? (peca.ml || 0) : (peca.m2 || 0);
    var custo = isML
      ? (peca.ml || 0) * (peca.vlrMl || 0)
      : m2 * stPr + (peca.extra || 0);

    var subA = isML ? fm(peca.ml || 0) + ' ml' : fm(m2) + ' m²';
    var subB = stPr && !isML ? 'R$ ' + fm(custo) : (isML && peca.vlrMl ? 'R$ ' + fm(custo) : '');

    var det = isML
      ? '<div class="tum-grid2">' +
        '<div class="tum-f"><label class="tum-lbl">Metros lineares</label>' +
        '<input class="tum-in" type="number" step="0.01" value="' + (peca.ml || 0) + '" ' +
        'onchange="TUM.q.pedras.' + k + '.ml=+this.value;tumRecalc()"></div>' +
        '<div class="tum-f"><label class="tum-lbl">Valor/ml R$</label>' +
        '<input class="tum-in" type="number" value="' + (peca.vlrMl || 0) + '" ' +
        'onchange="TUM.q.pedras.' + k + '.vlrMl=+this.value;tumRecalc()"></div>' +
        '</div>'
      : '<div class="tum-grid2">' +
        '<div class="tum-f"><label class="tum-lbl">Área m² (auto)</label>' +
        '<input class="tum-in" type="number" step="0.01" value="' + m2 + '" ' +
        'onchange="TUM.q.pedras.' + k + '.m2=+this.value;TUM.q.pedras.' + k + '._manual=true;tumRecalc()"></div>' +
        '<div class="tum-f"><label class="tum-lbl">Acréscimo R$</label>' +
        '<input class="tum-in" type="number" min="0" value="' + (peca.extra || 0) + '" ' +
        'onchange="TUM.q.pedras.' + k + '.extra=+this.value;tumRecalc()"></div>' +
        '</div>';

    h += _pecaRow(k, TUM.PEDRA_LABELS[k], peca.on, subA, subB, det, 'tumTogPedra');
  });
  h += '</div>';

  // Totais pedra
  var r = TUM.calc;
  h += '<div class="tum-total-box">';
  h += _totRow('Área líquida',             fm(r.m2Liq || 0) + ' m²',  false);
  h += _totRow('Com ' + (q.perda || 15) + '% perda', fm(r.m2Total || 0) + ' m²', false);
  if (stPr) {
    h += _totRow('💎 Custo pedra',          'R$ ' + fm(r.custoPedra || 0),  true);
    h += _totRow('💰 Valor venda pedra',    'R$ ' + fm(r.vendaPedra || 0),  true,  'grn');
    h += _totRow('📈 Lucro pedra',          'R$ ' + fm((r.vendaPedra || 0) - (r.custoPedra || 0)), false, 'gold');
  }
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'projeto\')">← Projeto</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'estrutura\')">Estrutura →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA ESTRUTURA CIVIL
// ══════════════════════════════════════════════════════════════════════
function _tabEstrutura() {
  var q = TUM.q;
  var est = q.estrutura;
  var h = '<div class="tum-sec">';

  h += '<div style="background:var(--s3);border-radius:10px;padding:9px 12px;margin-bottom:10px;font-size:.62rem;color:var(--t3);line-height:1.6;">';
  h += '🏗️ Custos da construção civil. Quantidades calculadas automaticamente. Ajuste se necessário.';
  h += '</div>';

  h += '<div class="tum-sec-lbl">Fundação</div>';
  h += '<div class="tum-peca-list">';
  h += _estRow('fundacao', 'Fundação em concreto', est.fundacao, 'm³', 'Volume m³');
  h += '</div>';

  h += '<div class="tum-sec-lbl" style="margin-top:12px;">Paredes e Laje</div>';
  h += '<div class="tum-peca-list">';
  h += _estRow('paredes',  'Alvenaria / Paredes',   est.paredes,  'm²', 'Área m²');
  h += _estRow('laje',     'Laje de cobertura (armada)', est.laje, 'm²', 'Área m²');
  h += '</div>';

  h += '<div class="tum-sec-lbl" style="margin-top:12px;">Ferragem e Concreto (gavetas)</div>';
  h += '<div class="tum-peca-list">';
  h += _estRow('reforco',  'Ferragem / Armação',    est.reforco,  'kg', 'Peso kg');
  h += _estRow('concreto', 'Concreto armado',       est.concreto, 'm³', 'Volume m³');
  h += '</div>';

  // Influência automática das gavetas
  if (q.gavetas > 0) {
    h += '<div style="background:rgba(74,128,181,.08);border:1px solid rgba(74,128,181,.2);border-radius:10px;padding:10px 13px;margin-top:10px;">';
    h += '<div style="font-size:.6rem;color:#4a80b5;font-weight:700;margin-bottom:6px;">⬛ Influência das ' + q.gavetas + ' gaveta(s)</div>';
    h += '<div style="font-size:.62rem;color:var(--t3);line-height:1.7;">';
    h += '• Ferragem: +' + fm(q.gavetas * 15) + ' kg por gaveta<br>';
    h += '• Concreto: +' + fm(q.gavetas * 0.12) + ' m³ por gaveta<br>';
    h += '• Altura total: ' + (q.dims.altEst + q.gavetas * q.altPorGaveta + q.dims.espLaje + q.dims.espTampa).toFixed(2) + ' m<br>';
    h += '• Tampa: ' + fm(TUM.q.dims.comp * TUM.q.dims.larg) + ' m² (reforçada)';
    h += '</div></div>';
  }

  var r = TUM.calc;
  h += '<div class="tum-total-box" style="margin-top:12px;">';
  h += _totRow('🏗️ Total Estrutura', 'R$ ' + fm(r.custoEstrutura || 0), true);
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'pedras\')">← Pedra</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'materiais\')">Materiais →</button>';
  h += '</div></div>';
  return h;
}

function _estRow(k, label, item, unid, qLabel) {
  if (!item) return '';
  var qty = item.m2 || item.m3 || item.kg || item.qty || 0;
  var vlr = qty * (item.preco || 0);
  return _pecaRow(k, label, item.on,
    fm(qty) + ' ' + unid,
    'R$ ' + fm(vlr),
    '<div class="tum-grid2">' +
    '<div class="tum-f"><label class="tum-lbl">' + qLabel + '</label>' +
    '<input class="tum-in" type="number" step="0.01" min="0" value="' + qty + '" ' +
    'onchange="tumSetEst(\'' + k + '\',' + (item.m2 !== undefined ? '\'m2\'' : item.m3 !== undefined ? '\'m3\'' : '\'kg\'') + ',+this.value);tumRecalc()"></div>' +
    '<div class="tum-f"><label class="tum-lbl">Preço unit. R$</label>' +
    '<input class="tum-in" type="number" step="1" min="0" value="' + (item.preco || 0) + '" ' +
    'onchange="TUM.q.estrutura.' + k + '.preco=+this.value;tumRecalc()"></div>' +
    '</div>',
    'tumTogEst');
}

// ══════════════════════════════════════════════════════════════════════
// ABA MATERIAIS DE CONSTRUÇÃO
// ══════════════════════════════════════════════════════════════════════
function _tabMateriais() {
  var mat = TUM.q.mat;
  var h = '<div class="tum-sec">';
  h += '<div class="tum-info-box">💡 Quantidades estimadas automaticamente pelas dimensões e gavetas. Ajuste se necessário.</div>';

  h += '<div class="tum-sec-lbl">🪣 Materiais</div>';
  h += '<div class="tum-peca-list">';

  ['cimento','areia','brita','argamassa','cola','rejunte','ferro','tijolos'].forEach(function(k) {
    var it = mat[k]; if (!it) return;
    var vlr = (it.qty || 0) * (it.preco || 0);
    h += _pecaRow(k, TUM.MAT_LABELS[k], it.on,
      fm(it.qty) + ' ' + it.unid, 'R$ ' + fm(vlr),
      '<div class="tum-grid2">' +
      '<div class="tum-f"><label class="tum-lbl">Qtd (' + it.unid + ')</label>' +
      '<input class="tum-in" type="number" step="0.1" min="0" value="' + (it.qty || 0) + '" onchange="TUM.q.mat.' + k + '.qty=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Preço R$/' + it.unid + '</label>' +
      '<input class="tum-in" type="number" step="0.01" min="0" value="' + (it.preco || 0) + '" onchange="TUM.q.mat.' + k + '.preco=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogMat');
  });

  // Frete
  var fr = mat.frete;
  h += _pecaRow('frete', 'Frete / Entrega', fr.on, '', 'R$ ' + fm(fr.vlr || 0),
    '<div class="tum-f"><label class="tum-lbl">Valor R$</label>' +
    '<input class="tum-in" type="number" min="0" value="' + (fr.vlr || 0) + '" onchange="TUM.q.mat.frete.vlr=+this.value;tumRecalc()"></div>',
    'tumTogMat');

  h += '</div>';
  var r = TUM.calc;
  h += '<div class="tum-total-box">';
  h += _totRow('🪣 Total Materiais', 'R$ ' + fm(r.custoMat || 0), true);
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'estrutura\')">← Estrutura</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'mdo\')">Mão de Obra →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA MÃO DE OBRA
// ══════════════════════════════════════════════════════════════════════
function _tabMdo() {
  var mdo = TUM.q.mdo;
  var h = '<div class="tum-sec">';

  h += '<div class="tum-sec-lbl">👷 Equipe de Construção</div>';
  h += '<div class="tum-peca-list">';

  ['pedreiro','ajudante'].forEach(function(k) {
    var it = mdo[k];
    var custo = (it.dias || 0) * (it.diaria || 0);
    h += _pecaRow(k, TUM.MDO_LABELS[k], it.on,
      it.dias + ' dia' + (it.dias > 1 ? 's' : ''),
      'R$ ' + fm(custo),
      '<div class="tum-grid2">' +
      '<div class="tum-f"><label class="tum-lbl">Dias</label>' +
      '<input class="tum-in" type="number" step="0.5" min="0" value="' + (it.dias || 0) + '" onchange="TUM.q.mdo.' + k + '.dias=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Diária R$</label>' +
      '<input class="tum-in" type="number" min="0" value="' + (it.diaria || 0) + '" onchange="TUM.q.mdo.' + k + '.diaria=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogMdo');
  });

  h += '<div class="tum-sec-lbl" style="margin-top:12px;">🔨 Equipe Marmorista</div>';
  h += _pecaRow('marmorista', 'Marmorista', mdo.marmorista.on,
    mdo.marmorista.dias + ' dia' + (mdo.marmorista.dias > 1 ? 's' : ''),
    'R$ ' + fm(mdo.marmorista.dias * mdo.marmorista.diaria),
    '<div class="tum-grid2">' +
    '<div class="tum-f"><label class="tum-lbl">Dias</label>' +
    '<input class="tum-in" type="number" step="0.5" min="0" value="' + mdo.marmorista.dias + '" onchange="TUM.q.mdo.marmorista.dias=+this.value;tumRecalc()"></div>' +
    '<div class="tum-f"><label class="tum-lbl">Diária R$</label>' +
    '<input class="tum-in" type="number" min="0" value="' + mdo.marmorista.diaria + '" onchange="TUM.q.mdo.marmorista.diaria=+this.value;tumRecalc()"></div>' +
    '</div>',
    'tumTogMdo');

  h += '<div class="tum-sec-lbl" style="margin-top:12px;">Serviços (custo × venda)</div>';
  ['acabamento','instalacao','transporte'].forEach(function(k) {
    var it = mdo[k];
    h += _pecaRow(k, TUM.MDO_LABELS[k], it.on,
      'custo R$ ' + fm(it.custo || 0),
      'venda R$ ' + fm(it.venda || 0),
      '<div class="tum-grid2">' +
      '<div class="tum-f"><label class="tum-lbl">Custo real R$</label>' +
      '<input class="tum-in" type="number" min="0" value="' + (it.custo || 0) + '" onchange="TUM.q.mdo.' + k + '.custo=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Valor cobrado R$</label>' +
      '<input class="tum-in" type="number" min="0" value="' + (it.venda || 0) + '" onchange="TUM.q.mdo.' + k + '.venda=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogMdo');
  });

  // Risco de quebra
  var rq = mdo.riscoQuebra;
  h += _pecaRow('riscoQuebra', 'Risco de quebra (% sobre pedra)', rq.on,
    (rq.perc || 0) + '%', '',
    '<div class="tum-f"><label class="tum-lbl">% sobre custo da pedra</label>' +
    '<input class="tum-in" type="number" step="0.5" min="0" max="30" value="' + (rq.perc || 0) + '" onchange="TUM.q.mdo.riscoQuebra.perc=+this.value;tumRecalc()"></div>',
    'tumTogMdo');

  h += '</div>';

  // Influência gavetas na MO
  if (TUM.q.gavetas > 0) {
    h += '<div style="background:rgba(74,128,181,.08);border:1px solid rgba(74,128,181,.2);border-radius:10px;padding:10px 13px;margin-top:10px;">';
    h += '<div style="font-size:.6rem;color:#4a80b5;font-weight:700;margin-bottom:4px;">⬛ Acréscimo automático por gavetas</div>';
    h += '<div style="font-size:.62rem;color:var(--t3);">+' + TUM.q.gavetas + ' dia(s) na obra de construção foram adicionados automaticamente.</div>';
    h += '</div>';
  }

  var r = TUM.calc;
  h += '<div class="tum-total-box">';
  h += _totRow('Custo real MO',    'R$ ' + fm(r.custoMdo || 0),  false);
  h += _totRow('Valor venda MO',   'R$ ' + fm(r.vendaMdo || 0),  true, 'grn');
  h += _totRow('Lucro MO',         'R$ ' + fm((r.vendaMdo || 0) - (r.custoMdo || 0)), false, 'gold');
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'materiais\')">← Materiais</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'extras\')">Extras →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA EXTRAS — lápide, cruz, foto
// ══════════════════════════════════════════════════════════════════════
function _tabExtras() {
  var q = TUM.q;
  var h = '<div class="tum-sec">';

  // ── Lápide ──
  h += _extraHd('📜 Lápide', 'lapide', q.lapide.on);
  if (q.lapide.on) {
    var lp = q.lapide;
    var cLap = lp.custo + lp.linhas * lp.custoPorLinha;
    var vLap = lp.venda + lp.linhas * lp.vendaPorLinha;
    h += '<div class="tum-extra-body">';
    h += '<div class="tum-grid2">';
    h += '<div class="tum-f"><label class="tum-lbl">Tipo</label><select class="tum-in" onchange="TUM.q.lapide.tipo=this.value;tumRecalc()">';
    [['padrao','Padrão'],['personalizada','Personalizada'],['bronze','Placa Bronze']].forEach(function(o) {
      h += '<option value="' + o[0] + '"' + (lp.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    });
    h += '</select></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Linhas de texto</label>' +
         '<input class="tum-in" type="number" min="1" max="12" value="' + lp.linhas + '" onchange="TUM.q.lapide.linhas=+this.value;tumRecalc()"></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += '<div class="tum-f"><label class="tum-lbl">Custo placa R$</label><input class="tum-in" type="number" min="0" value="' + lp.custo + '" onchange="TUM.q.lapide.custo=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Venda placa R$</label><input class="tum-in" type="number" min="0" value="' + lp.venda + '" onchange="TUM.q.lapide.venda=+this.value;tumRecalc()"></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:6px;">';
    h += '<div class="tum-f"><label class="tum-lbl">Custo/linha R$</label><input class="tum-in" type="number" min="0" value="' + lp.custoPorLinha + '" onchange="TUM.q.lapide.custoPorLinha=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Venda/linha R$</label><input class="tum-in" type="number" min="0" value="' + lp.vendaPorLinha + '" onchange="TUM.q.lapide.vendaPorLinha=+this.value;tumRecalc()"></div>';
    h += '</div>';
    h += _miniRes('Lápide', cLap, vLap);
    h += '<div class="tum-f" style="margin-top:8px;"><label class="tum-lbl">Texto da lápide</label>' +
         '<textarea class="tum-in" rows="2" style="resize:vertical;" placeholder="Aqui jaz..." onchange="TUM.q.lapide.texto=this.value">' + (lp.texto || '') + '</textarea></div>';
    h += '</div>';
  }

  // ── Cruz ──
  h += _extraHd('✝️ Cruz', 'cruz', q.cruz.on);
  if (q.cruz.on) {
    var cr = q.cruz;
    h += '<div class="tum-extra-body">';
    h += '<div class="tum-grid2">';
    h += '<div class="tum-f"><label class="tum-lbl">Material</label><select class="tum-in" onchange="TUM.q.cruz.tipo=this.value;tumRecalc()">';
    [['granito','Granito'],['marmore','Mármore'],['metal','Metal Pintado'],['inox','Inox']].forEach(function(o) {
      h += '<option value="' + o[0] + '"' + (cr.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    });
    h += '</select></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Modelo</label><select class="tum-in" onchange="TUM.q.cruz.modelo=this.value;tumRecalc()">';
    [['simples','Simples'],['lavrada','Lavrada'],['com_base','Com Base']].forEach(function(o) {
      h += '<option value="' + o[0] + '"' + (cr.modelo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    });
    h += '</select></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += '<div class="tum-f"><label class="tum-lbl">Custo R$</label><input class="tum-in" type="number" min="0" value="' + cr.custo + '" onchange="TUM.q.cruz.custo=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Venda R$</label><input class="tum-in" type="number" min="0" value="' + cr.venda + '" onchange="TUM.q.cruz.venda=+this.value;tumRecalc()"></div>';
    h += '</div>';
    h += _miniRes('Cruz', cr.custo, cr.venda);
    h += '</div>';
  }

  // ── Foto porcelana ──
  h += _extraHd('📷 Foto Porcelana', 'foto', q.foto.on);
  if (q.foto.on) {
    var ft = q.foto;
    h += '<div class="tum-extra-body">';
    h += '<div class="tum-grid2">';
    h += '<div class="tum-f"><label class="tum-lbl">Tamanho</label><select class="tum-in" onchange="TUM.q.foto.tamanho=this.value;tumRecalc()">';
    [['10x15','10×15 cm'],['15x20','15×20 cm'],['20x25','20×25 cm'],['oval','Oval']].forEach(function(o) {
      h += '<option value="' + o[0] + '"' + (ft.tamanho === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    });
    h += '</select></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Moldura?</label>' +
         '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer;">' +
         '<input type="checkbox"' + (ft.moldura ? ' checked' : '') + ' style="accent-color:var(--gold);" onchange="TUM.q.foto.moldura=this.checked;tumRecalc()">' +
         '<span style="font-size:.72rem;color:var(--t2);">Com moldura</span></label></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += '<div class="tum-f"><label class="tum-lbl">Custo foto R$</label><input class="tum-in" type="number" min="0" value="' + ft.custo + '" onchange="TUM.q.foto.custo=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Venda foto R$</label><input class="tum-in" type="number" min="0" value="' + ft.venda + '" onchange="TUM.q.foto.venda=+this.value;tumRecalc()"></div>';
    h += '</div>';
    if (ft.moldura) {
      h += '<div class="tum-grid2" style="margin-top:6px;">';
      h += '<div class="tum-f"><label class="tum-lbl">Custo moldura R$</label><input class="tum-in" type="number" min="0" value="' + ft.custoMoldura + '" onchange="TUM.q.foto.custoMoldura=+this.value;tumRecalc()"></div>';
      h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Venda moldura R$</label><input class="tum-in" type="number" min="0" value="' + ft.vendaMoldura + '" onchange="TUM.q.foto.vendaMoldura=+this.value;tumRecalc()"></div>';
      h += '</div>';
    }
    var cFoto = ft.custo + (ft.moldura ? ft.custoMoldura : 0);
    var vFoto = ft.venda + (ft.moldura ? ft.vendaMoldura : 0);
    h += _miniRes('Foto Porcelana', cFoto, vFoto);
    h += '</div>';
  }

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'mdo\')">← MO</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'resumo\')">Ver Resumo →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA RESUMO
// ══════════════════════════════════════════════════════════════════════
function _tabResumo() {
  var q = TUM.q, r = TUM.calc;
  var tipo = TUM.TIPOS[q.tipoBase] || {};
  var h = '<div class="tum-sec">';

  // ── Tabela custo × venda × lucro ──────────────────────────────
  h += '<div class="tum-sec-lbl">📊 Custo × Venda × Lucro</div>';
  h += '<div class="tum-dre-table">';
  h += '<div class="tum-dre-head"><span>Categoria</span><span>Custo</span><span>Venda</span><span>Lucro</span></div>';

  var cats = [
    { icon: '💎', label: 'Pedra',      custo: r.custoPedra,    venda: r.vendaPedra    },
    { icon: '📜', label: 'Lápide',     custo: r.custoLapide,   venda: r.vendaLapide   },
    { icon: '✝️', label: 'Cruz',        custo: r.custoCruz,     venda: r.vendaCruz     },
    { icon: '📷', label: 'Foto',        custo: r.custoFoto,     venda: r.vendaFoto     },
    { icon: '🔨', label: 'Mão de Obra', custo: r.custoMdo,      venda: r.vendaMdo      },
    { icon: '🏗️', label: 'Estrutura',   custo: r.custoEstrutura,venda: r.custoEstrutura},
    { icon: '🪣', label: 'Materiais',   custo: r.custoMat,      venda: r.custoMat      },
  ];

  cats.forEach(function(cat) {
    if (!cat.custo && !cat.venda) return;
    var lucro = (cat.venda || 0) - (cat.custo || 0);
    h += '<div class="tum-dre-row">';
    h += '<span style="font-size:.7rem;">' + cat.icon + ' ' + cat.label + '</span>';
    h += '<span style="color:var(--t2);">R$ ' + fm(cat.custo || 0) + '</span>';
    h += '<span style="color:#4cda80;">R$ ' + fm(cat.venda || 0) + '</span>';
    h += '<span style="color:' + (lucro > 0 ? '#C9A84C' : lucro < 0 ? '#e07070' : 'var(--t3)') + ';">' + (lucro > 0 ? '+' : '') + 'R$ ' + fm(lucro) + '</span>';
    h += '</div>';
  });

  h += '<div class="tum-dre-total">';
  h += '<span>TOTAL</span>';
  h += '<span>R$ ' + fm(r.custoTotal || 0) + '</span>';
  h += '<span style="color:#4cda80;">R$ ' + fm(r.vendaTotal || 0) + '</span>';
  h += '<span style="color:#C9A84C;">R$ ' + fm(r.lucroTotal || 0) + '</span>';
  h += '</div></div>';

  // ── Margem visual ─────────────────────────────────────────────
  var margemPct = r.margemReal || 0;
  var margemCor = margemPct >= 30 ? '#4cda80' : margemPct >= 20 ? '#C9A84C' : '#e07070';
  var margemLabel = margemPct >= 30 ? 'Excelente ✅' : margemPct >= 20 ? 'Aceitável ⚠️' : 'Baixa 🔴';
  h += '<div style="background:var(--s3);border:1px solid var(--bd2);border-radius:14px;padding:14px;margin:12px 0;">';
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">';
  h += '<span style="font-size:.65rem;color:var(--t3);">Margem de lucro</span>';
  h += '<span style="font-size:.8rem;font-weight:700;color:' + margemCor + ';">' + margemPct.toFixed(1) + '% — ' + margemLabel + '</span>';
  h += '</div>';
  h += '<div style="background:rgba(255,255,255,.06);border-radius:6px;height:8px;">';
  h += '<div style="background:' + margemCor + ';border-radius:6px;height:8px;width:' + Math.min(margemPct, 100) + '%;transition:width .5s;"></div>';
  h += '</div></div>';

  // ── Precificação ──────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">💼 Ajuste de Preço</div>';
  h += '<div class="tum-prec-box">';
  h += '<div class="tum-grid2">';
  h += '<div class="tum-f"><label class="tum-lbl">Margem adicional (%)</label>' +
       '<input class="tum-in" type="number" min="0" max="200" value="' + (q.margem || 0) + '" onchange="TUM.q.margem=+this.value;tumRecalc()"></div>';
  h += '<div class="tum-f"><label class="tum-lbl">Desconto R$</label>' +
       '<input class="tum-in" type="number" min="0" value="' + (q.desconto || 0) + '" onchange="TUM.q.desconto=+this.value;tumRecalc()"></div>';
  h += '</div>';
  h += '<div class="tum-prec-breakdown">';
  h += '<div class="tum-prec-row"><span>Custo real total</span><span>R$ ' + fm(r.custoTotal || 0) + '</span></div>';
  h += '<div class="tum-prec-row"><span>Lucro embutido</span><span style="color:#4cda80;">+ R$ ' + fm(r.lucroTotal || 0) + '</span></div>';
  if (q.margem > 0) h += '<div class="tum-prec-row"><span>Margem adicional (' + q.margem + '%)</span><span style="color:#4cda80;">+ R$ ' + fm(r.margemExtra || 0) + '</span></div>';
  if (q.desconto > 0) h += '<div class="tum-prec-row"><span>Desconto</span><span style="color:#e07070;">− R$ ' + fm(q.desconto || 0) + '</span></div>';
  h += '<div class="tum-prec-final"><span>💰 VALOR FINAL</span><span>R$ ' + fm(r.venda || 0) + '</span></div>';
  h += '</div></div>';

  // ── Cronograma ────────────────────────────────────────────────
  var diasObra = (tipo.diasPedreiro || 0) + (q.gavetas || 0);
  var diasMar  = tipo.diasMarmorista || 0;
  var total    = diasObra + diasMar;
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📅 Cronograma estimado</div>';
  h += '<div class="tum-crono">';
  h += '<div class="tum-crono-row">';
  if (diasObra) h += '<div class="tum-crono-item" style="flex:' + diasObra + '"><div class="tum-crono-bar tum-crono-obra"></div><div class="tum-crono-lbl">Construção<br>' + diasObra + ' dias</div></div>';
  if (diasMar)  h += '<div class="tum-crono-item" style="flex:' + diasMar  + '"><div class="tum-crono-bar tum-crono-mdo"></div><div class="tum-crono-lbl">Marmoraria<br>' + diasMar + ' dias</div></div>';
  h += '</div>';
  h += '<div class="tum-crono-total">⏱ Prazo estimado: <strong>' + total + ' dias úteis</strong></div>';
  h += '</div>';

  // ── Ficha técnica ─────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📋 Ficha Técnica</div>';
  h += '<div class="tum-tech-box">';
  var sel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones ? CFG.stones.find(function(s) { return s.id === q.stoneId; }) : null;
  var altTotal = q.dims.altEst + (q.gavetas * q.altPorGaveta) + q.dims.espLaje + q.dims.espTampa;
  h += _techR('Tipo',        tipo.label || q.tipoBase);
  h += _techR('Cliente',     q.cli || '—');
  if (q.falecido)  h += _techR('Falecido',   q.falecido);
  if (q.cemiterio) h += _techR('Cemitério',  q.cemiterio);
  if (q.quadra)    h += _techR('Quadra/Lote',q.quadra);
  h += _techR('Pedra',       sel ? sel.nm + ' (R$ ' + fm(sel.pr) + '/m²)' : 'Não selecionada');
  h += _techR('Comprimento', q.dims.comp + ' m');
  h += _techR('Largura',     q.dims.larg + ' m');
  h += _techR('Altura total',altTotal.toFixed(2) + ' m');
  h += _techR('Gavetas',     q.gavetas + (q.gavetas === 0 ? ' (sem compartimento)' : ' compartimento' + (q.gavetas > 1 ? 's' : '')));
  h += _techR('Área c/ perda', fm(r.m2Total || 0) + ' m²');
  if (q.lapide.on) h += _techR('Lápide', q.lapide.tipo);
  if (q.cruz.on)   h += _techR('Cruz',   q.cruz.tipo + ' ' + q.cruz.modelo);
  if (q.foto.on)   h += _techR('Foto',   q.foto.tamanho + (q.foto.moldura ? ' c/ moldura' : ''));
  h += _techR('Data',  new Date().toLocaleDateString('pt-BR'));
  h += '</div>';

  // ── Foto de referência no resumo ──────────────────────────────
  if (q.fotoModelo) {
    h += '<div class="tum-sec-lbl" style="margin-top:14px;">📷 Referência Visual</div>';
    h += '<img src="' + q.fotoModelo + '" style="width:100%;max-height:180px;object-fit:contain;border-radius:10px;border:1px solid var(--bd2);">';
  }
  if (q.descModelo) {
    h += '<div style="background:var(--s3);border-left:3px solid var(--gold);border-radius:0 8px 8px 0;padding:10px 13px;margin-top:8px;font-size:.72rem;color:var(--t2);line-height:1.6;">' + q.descModelo + '</div>';
  }

  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📝 Observações</div>';
  h += '<textarea class="tum-obs" rows="3" placeholder="Observações técnicas, pedidos especiais..." onchange="TUM.q.obs=this.value">' + (q.obs || '') + '</textarea>';

  h += '<div class="tum-action-btns">';
  h += '<button class="btn btn-g" onclick="tumSalvar()">💾 Salvar Orçamento</button>';
  h += '<button class="btn btn-o" onclick="tumNovo()">🆕 Novo</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// CÁLCULO PRINCIPAL — automático e baseado em gavetas
// ══════════════════════════════════════════════════════════════════════
function _tumCalc() {
  var q   = TUM.q;
  var d   = q.dims;
  var gav = q.gavetas;
  var sel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones
    ? CFG.stones.find(function(s) { return s.id === q.stoneId; })
    : null;
  var stPr = sel ? sel.pr : (q.stonePrice || 0);

  // ── Pedras ──────────────────────────────────────────────────────
  var m2Liq = 0;
  var custoPedra = 0;

  Object.keys(q.pedras).forEach(function(k) {
    var peca = q.pedras[k];
    if (!peca || !peca.on) return;
    var isML = (k === 'moldura' || k === 'pingadeira');
    if (isML) {
      // Custo da moldura/pingadeira é pelo vlrMl, não pelo m²
      custoPedra += (peca.ml || 0) * (peca.vlrMl || 0);
    } else {
      m2Liq += (peca.m2 || 0);
      custoPedra += (peca.m2 || 0) * stPr + (peca.extra || 0);
    }
  });

  var m2Total    = m2Liq * (1 + (q.perda || 15) / 100);
  custoPedra     = m2Total * stPr; // recalcula com perda

  // Soma extras (moldura, pingadeira, acréscimos)
  Object.keys(q.pedras).forEach(function(k) {
    var peca = q.pedras[k];
    if (!peca || !peca.on) return;
    if (k === 'moldura')    custoPedra += (peca.ml || 0) * (peca.vlrMl || 120);
    if (k === 'pingadeira') custoPedra += (peca.ml || 0) * (peca.vlrMl || 80);
    if (peca.extra)         custoPedra += peca.extra;
  });

  var vendaPedra = custoPedra; // pedra: preço já é de venda

  // ── Extras ──────────────────────────────────────────────────────
  var custoLapide = 0, vendaLapide = 0;
  if (q.lapide.on) {
    custoLapide = q.lapide.custo + q.lapide.linhas * q.lapide.custoPorLinha;
    vendaLapide = q.lapide.venda + q.lapide.linhas * q.lapide.vendaPorLinha;
  }
  var custoCruz = 0, vendaCruz = 0;
  if (q.cruz.on) { custoCruz = q.cruz.custo; vendaCruz = q.cruz.venda; }

  var custoFoto = 0, vendaFoto = 0;
  if (q.foto.on) {
    custoFoto = q.foto.custo + (q.foto.moldura ? q.foto.custoMoldura : 0);
    vendaFoto = q.foto.venda + (q.foto.moldura ? q.foto.vendaMoldura : 0);
  }

  // ── Estrutura ───────────────────────────────────────────────────
  var custoEstrutura = 0;
  Object.keys(q.estrutura).forEach(function(k) {
    var it = q.estrutura[k];
    if (!it || !it.on) return;
    var qty = it.m2 || it.m3 || it.kg || 0;
    custoEstrutura += qty * (it.preco || 0);
  });

  // ── Materiais ────────────────────────────────────────────────────
  var custoMat = 0;
  Object.keys(q.mat).forEach(function(k) {
    var it = q.mat[k];
    if (!it || !it.on) return;
    if (k === 'frete') { custoMat += it.vlr || 0; }
    else               { custoMat += (it.qty || 0) * (it.preco || 0); }
  });

  // ── Mão de obra ──────────────────────────────────────────────────
  var custoMdo = 0, vendaMdo = 0;
  ['pedreiro','ajudante','marmorista'].forEach(function(k) {
    var it = q.mdo[k];
    if (it && it.on) {
      var v = (it.dias || 0) * (it.diaria || 0);
      custoMdo += v; vendaMdo += v;
    }
  });
  ['acabamento','instalacao','transporte'].forEach(function(k) {
    var it = q.mdo[k];
    if (it && it.on) { custoMdo += it.custo || 0; vendaMdo += it.venda || 0; }
  });
  if (q.mdo.riscoQuebra && q.mdo.riscoQuebra.on) {
    var rq = custoPedra * (q.mdo.riscoQuebra.perc || 0) / 100;
    custoMdo += rq; vendaMdo += rq;
  }

  // ── Totais ───────────────────────────────────────────────────────
  var custoTotal = custoPedra + custoLapide + custoCruz + custoFoto + custoMdo + custoEstrutura + custoMat;
  var vendaTotal = vendaPedra + vendaLapide + vendaCruz + vendaFoto + vendaMdo + custoEstrutura + custoMat;
  var lucroTotal = vendaTotal - custoTotal;

  var margemExtra = vendaTotal * (q.margem || 0) / 100;
  var venda       = vendaTotal + margemExtra - (q.desconto || 0);
  var margemReal  = venda > 0 ? ((venda - custoTotal) / venda * 100) : 0;

  return {
    m2Liq, m2Total,
    custoPedra, vendaPedra,
    custoLapide, vendaLapide,
    custoCruz, vendaCruz,
    custoFoto, vendaFoto,
    custoMdo, vendaMdo,
    custoEstrutura, custoMat,
    custoTotal, vendaTotal, lucroTotal,
    margemExtra, venda, margemReal,
  };
}

// ══════════════════════════════════════════════════════════════════════
// AUTO-CÁLCULO — preenche áreas e quantidades automaticamente
// ══════════════════════════════════════════════════════════════════════
function _tumAutoCalc() {
  var q   = TUM.q;
  var d   = q.dims;
  var gav = q.gavetas;
  var c   = d.comp;
  var l   = d.larg;
  var ep  = d.espParede;
  var el  = d.espLaje;
  var et  = d.espTampa;
  var ag  = q.altPorGaveta;

  // Altura da estrutura base
  d.altEst = 0.40;
  // Altura total
  var altTotal = d.altEst + gav * ag + el + et;

  // ── Peças de pedra ────────────────────────────────────────────
  var p = q.pedras;

  // Tampa: comprimento × largura
  if (p.tampa && !p.tampa._manual)
    p.tampa.m2 = _r(c * l);

  // Laterais: 2 × comprimento × altura total (ambos os lados)
  if (p.laterais && !p.laterais._manual)
    p.laterais.m2 = _r(c * altTotal * 2);

  // Frente: largura × altura total
  if (p.frente && !p.frente._manual)
    p.frente.m2 = _r(l * altTotal);

  // Fundo: igual à frente
  if (p.fundo && !p.fundo._manual)
    p.fundo.m2 = _r(l * altTotal);

  // Revestimento externo: área total das faces externas
  if (p.revestExt && !p.revestExt._manual)
    p.revestExt.m2 = _r((c * 2 + l * 2) * altTotal);

  // Lápide: 0.60 × 0.40 padrão
  if (p.lapide && !p.lapide._manual)
    p.lapide.m2 = _r(0.60 * 0.40);

  // Moldura e pingadeira: perímetro
  if (p.moldura && !p.moldura._ml_manual)
    p.moldura.ml = _r((c + l) * 2);
  if (p.pingadeira && !p.pingadeira._ml_manual)
    p.pingadeira.ml = _r((c + l) * 2);

  // ── Estrutura civil ───────────────────────────────────────────
  var est = q.estrutura;
  var volFund = _r(c * l * 0.20); // 20cm de base

  if (est.fundacao && !est.fundacao._manual)  est.fundacao.m3 = volFund;
  if (est.paredes  && !est.paredes._manual)   est.paredes.m2  = _r((c * 2 + l * 2) * altTotal);
  if (est.laje     && !est.laje._manual)      est.laje.m2     = _r(c * l);

  // Ferragem: aumenta com gavetas (15 kg/gaveta base + reforço)
  var kgBase = c * l * 8;
  if (est.reforco && !est.reforco._manual)
    est.reforco.kg = _r(kgBase + gav * 15);

  // Concreto armado para gavetas
  if (est.concreto && !est.concreto._manual)
    est.concreto.m3 = _r(c * l * el + gav * 0.12);

  // ── Materiais ─────────────────────────────────────────────────
  var mat = q.mat;
  var vol = c * l * altTotal;

  if (mat.cimento   && !mat.cimento._manual)   mat.cimento.qty   = Math.ceil(vol * 6);
  if (mat.areia     && !mat.areia._manual)     mat.areia.qty     = _r(vol * 0.06);
  if (mat.brita     && !mat.brita._manual)     mat.brita.qty     = _r(vol * 0.04);
  if (mat.argamassa && !mat.argamassa._manual) mat.argamassa.qty = Math.ceil((c * l * 2 + c * altTotal * 2 + l * altTotal * 2) / 8);
  if (mat.cola      && !mat.cola._manual)      mat.cola.qty      = Math.ceil((p.tampa && p.tampa.on ? p.tampa.m2 : 0) + (p.laterais && p.laterais.on ? p.laterais.m2 : 0) + (p.frente && p.frente.on ? p.frente.m2 : 0));
  if (mat.rejunte   && !mat.rejunte._manual)   mat.rejunte.qty   = _r(((p.tampa && p.tampa.on ? p.tampa.m2 : 0) + (p.laterais && p.laterais.on ? p.laterais.m2 : 0)) * 0.5);
  if (mat.ferro     && !mat.ferro._manual)     mat.ferro.qty     = _r(kgBase + gav * 15);

  // ── Dias de mão de obra (automático por gavetas) ──────────────
  var preset = TUM.TIPOS[q.tipoBase];
  if (preset) {
    var diasPed = (preset.diasPedreiro || 1) + gav;  // +1 dia por gaveta
    var diasMar = preset.diasMarmorista || 1;
    if (!q.mdo.pedreiro._manual)   { q.mdo.pedreiro.dias   = diasPed; }
    if (!q.mdo.ajudante._manual)   { q.mdo.ajudante.dias   = diasPed; }
    if (!q.mdo.marmorista._manual) { q.mdo.marmorista.dias = diasMar; }
  }
}

function _r(v) { return Math.round(v * 100) / 100; }

// ══════════════════════════════════════════════════════════════════════
// SETTERS / TOGGLES
// ══════════════════════════════════════════════════════════════════════
function tumSetGavetas(n) {
  TUM.q.gavetas = Math.max(0, Math.min(8, n));
  tumRecalc();
}

function tumSetDim(key, val) {
  TUM.q.dims[key] = +val;
  tumRecalc();
}

function tumTogPedra(k, on) {
  TUM.q.pedras[k].on = on;
  tumRecalc();
}

function tumTogEst(k, on) {
  TUM.q.estrutura[k].on = on;
  tumRecalc();
}

function tumTogMat(k, on) {
  TUM.q.mat[k].on = on;
  tumRecalc();
}

function tumTogMdo(k, on) {
  TUM.q.mdo[k].on = on;
  tumRecalc();
}

function tumSetEst(k, field, val) {
  if (TUM.q.estrutura[k]) {
    TUM.q.estrutura[k][field] = val;
    TUM.q.estrutura[k]._manual = true;
  }
  tumRecalc();
}

function tumSet(key, val) { TUM.q[key] = val; }

function tumRecalc() {
  _tumAutoCalc();
  TUM.calc = _tumCalc();
  _tumRenderTab();
  // Atualiza hero sem re-render completo
  var hv = document.querySelector('.tum-hero-val');
  if (hv) hv.textContent = TUM.calc.venda > 0 ? 'R$ ' + fm(TUM.calc.venda) : '—';
}

// ══════════════════════════════════════════════════════════════════════
// PRESET DE TIPO
// ══════════════════════════════════════════════════════════════════════
function tumSetTipo(t) {
  var preset = TUM.TIPOS[t];
  if (!preset) return;
  TUM.q.tipoBase = t;
  TUM.q.gavetas  = preset.gavetas;
  TUM.q.dims.altEst = preset.altEst;

  // Liga/desliga pedras conforme preset
  Object.keys(TUM.q.pedras).forEach(function(k) { TUM.q.pedras[k].on = false; });
  preset.pedras.forEach(function(k) { if (TUM.q.pedras[k]) TUM.q.pedras[k].on = true; });

  // Liga/desliga estrutura
  Object.keys(TUM.q.estrutura).forEach(function(k) { TUM.q.estrutura[k].on = false; });
  preset.estrutura.forEach(function(k) { if (TUM.q.estrutura[k]) TUM.q.estrutura[k].on = true; });

  // Liga materiais conforme necessidade do tipo
  var usaConcreto = preset.estrutura.indexOf('concreto') > -1;
  TUM.q.mat.brita.on    = usaConcreto;
  TUM.q.mat.ferro.on    = usaConcreto;
  TUM.q.mat.tijolos.on  = usaConcreto;

  // Reseta flags manuais para recalcular
  _tumResetManual();
  _tumAutoCalc();
  TUM.calc = _tumCalc();
  renderTum();
}

function _tumResetManual() {
  Object.keys(TUM.q.pedras).forEach(function(k) {
    delete TUM.q.pedras[k]._manual;
    delete TUM.q.pedras[k]._ml_manual;
  });
  Object.keys(TUM.q.estrutura).forEach(function(k) {
    delete TUM.q.estrutura[k]._manual;
  });
  Object.keys(TUM.q.mat).forEach(function(k) {
    delete TUM.q.mat[k]._manual;
  });
  delete TUM.q.mdo.pedreiro._manual;
  delete TUM.q.mdo.ajudante._manual;
  delete TUM.q.mdo.marmorista._manual;
}

// ══════════════════════════════════════════════════════════════════════
// FOTO DO MODELO
// ══════════════════════════════════════════════════════════════════════
function tumFotoUpload() {
  document.getElementById('tumFotoInp').click();
}

function tumFotoOnFile(inp) {
  var file = inp.files[0];
  if (!file) return;
  var r = new FileReader();
  r.onload = function(ev) {
    var img = new Image();
    img.onload = function() {
      var canvas = document.createElement('canvas');
      var maxW = 800;
      var scale = Math.min(1, maxW / img.width);
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      TUM.q.fotoModelo = canvas.toDataURL('image/jpeg', 0.82);
      tumRecalc();
      renderTum();
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(file);
  inp.value = '';
}

function tumFotoRemover() {
  TUM.q.fotoModelo = '';
  renderTum();
}

// ══════════════════════════════════════════════════════════════════════
// STONE PICKER
// ══════════════════════════════════════════════════════════════════════
function tumOpenStonePick() {
  if (!typeof CFG !== 'undefined' || !CFG || !CFG.stones) { toast('Nenhuma pedra cadastrada'); return; }
  var h = '<div class="tum-stone-pick">';
  CFG.stones.forEach(function(s) {
    h += '<div class="tum-sp-row' + (TUM.q.stoneId === s.id ? ' on' : '') + '" onclick="tumPickStone(\'' + s.id + '\')">' +
      '<div class="tum-sp-nm">' + s.nm + '</div>' +
      '<div class="tum-sp-pr">R$ ' + fm(s.pr) + '/m²</div>' +
      '</div>';
  });
  h += '</div>';
  var listEl = document.getElementById('tumStoneList');
  var mdEl   = document.getElementById('tumStoneMd');
  if (listEl) listEl.innerHTML = h;
  if (mdEl)   mdEl.classList.add('on');
}

function tumPickStone(id) {
  TUM.q.stoneId = id;
  var sel = typeof CFG !== 'undefined' && CFG.stones ? CFG.stones.find(function(s) { return s.id === id; }) : null;
  if (sel) TUM.q.stonePrice = sel.pr;
  var md = document.getElementById('tumStoneMd');
  if (md) md.classList.remove('on');
  tumRecalc();
  renderTum();
}

// ══════════════════════════════════════════════════════════════════════
// SALVAR / NOVO
// ══════════════════════════════════════════════════════════════════════
function tumSalvar() {
  var r = TUM.calc;
  if (!TUM.q.cli) { toast('Informe o cliente'); return; }
  var sel = TUM.q.stoneId && typeof CFG !== 'undefined' && CFG.stones
    ? CFG.stones.find(function(s) { return s.id === TUM.q.stoneId; })
    : null;
  var tipoLabel = TUM.TIPOS[TUM.q.tipoBase] ? TUM.TIPOS[TUM.q.tipoBase].label : TUM.q.tipoBase;
  DB.q.unshift({
    id: Date.now(),
    tipo: 'Túmulo — ' + tipoLabel,
    cli:  TUM.q.cli,
    mat:  sel ? sel.nm : 'Pedra',
    vista:    r.venda,
    prazo:    r.venda,
    ent:      r.venda * 0.5,
    custo:    r.custoTotal,
    lucro:    r.lucroTotal,
    margemReal: r.margemReal,
    obs:  TUM.q.obs,
    tum:  JSON.parse(JSON.stringify(TUM.q)),
    tumCalc: JSON.parse(JSON.stringify(r)),
    dt:   typeof td === 'function' ? td() : new Date().toISOString().split('T')[0],
    date: typeof td === 'function' ? td() : new Date().toISOString().split('T')[0],
  });
  if (typeof DB !== 'undefined') DB.sv();
  toast('✅ Orçamento de túmulo salvo!');
}

function tumNovo() {
  if (!confirm('Limpar orçamento atual?')) return;
  TUM.q.cli = ''; TUM.q.falecido = ''; TUM.q.cemiterio = '';
  TUM.q.quadra = ''; TUM.q.obs = ''; TUM.q.fotoModelo = '';
  TUM.q.descModelo = ''; TUM.q.stoneId = null; TUM.q.stonePrice = 0;
  TUM.q.lapide.on = false; TUM.q.cruz.on = false; TUM.q.foto.on = false;
  _tumResetManual();
  tumSetTipo('simples');
}

// ══════════════════════════════════════════════════════════════════════
// HELPERS DE RENDER
// ══════════════════════════════════════════════════════════════════════
function _pecaRow(k, label, on, sub1, sub2, detailHtml, toggleFn) {
  var h = '<div class="tum-peca-row' + (on ? '' : ' tum-peca-off') + '">';
  h += '<div class="tum-peca-header">';
  h += '<label class="tum-tog"><input type="checkbox"' + (on ? ' checked' : '') + ' onchange="' + (toggleFn || 'tumTogPedra') + '(\'' + k + '\',this.checked)"><span class="tum-tog-slider"></span></label>';
  h += '<div class="tum-peca-label">' + label + '</div>';
  if (on && (sub1 || sub2)) {
    h += '<div class="tum-peca-val" style="font-size:.6rem;text-align:right;">';
    if (sub1) h += '<span style="color:var(--t3);">' + sub1 + '</span>';
    if (sub1 && sub2) h += '<br>';
    if (sub2) h += '<span style="color:#4cda80;">' + sub2 + '</span>';
    h += '</div>';
  }
  h += '</div>';
  if (on && detailHtml) h += '<div class="tum-peca-detail">' + detailHtml + '</div>';
  h += '</div>';
  return h;
}

function _extraHd(label, key, on) {
  return '<div class="tum-extra-hd" onclick="TUM.q.' + key + '.on=!TUM.q.' + key + '.on;tumRecalc()">' +
    '<label class="tum-tog" onclick="event.stopPropagation()"><input type="checkbox"' + (on ? ' checked' : '') +
    ' onchange="TUM.q.' + key + '.on=this.checked;tumRecalc()"><span class="tum-tog-slider"></span></label>' +
    '<span style="font-size:.8rem;font-weight:600;color:' + (on ? 'var(--gold2)' : 'var(--t2)') + ';">' + label + '</span>' +
    '</div>';
}

function _miniRes(label, custo, venda) {
  var lucro   = venda - custo;
  var margem  = venda > 0 ? (lucro / venda * 100) : 0;
  return '<div style="display:flex;gap:8px;background:rgba(255,255,255,.03);border-radius:8px;padding:8px 10px;margin-top:8px;">' +
    '<div style="flex:1;text-align:center;"><div style="font-size:.52rem;color:var(--t4);">Custo</div><div style="font-size:.72rem;font-weight:700;color:var(--t2);">R$ ' + fm(custo) + '</div></div>' +
    '<div style="flex:1;text-align:center;"><div style="font-size:.52rem;color:var(--t4);">Venda</div><div style="font-size:.72rem;font-weight:700;color:#4cda80;">R$ ' + fm(venda) + '</div></div>' +
    '<div style="flex:1;text-align:center;"><div style="font-size:.52rem;color:var(--t4);">Lucro</div><div style="font-size:.72rem;font-weight:700;color:#C9A84C;">' + margem.toFixed(0) + '%</div></div>' +
    '</div>';
}

function _totRow(label, val, bold, cor) {
  return '<div class="tum-total-row' + (bold ? ' tum-total-big' : '') + '">' +
    '<span>' + label + '</span>' +
    '<span' + (cor ? ' style="color:' + (cor === 'grn' ? '#4cda80' : cor === 'gold' ? '#C9A84C' : 'inherit') + '"' : '') + '>' + val + '</span>' +
    '</div>';
}

function _techR(l, v) {
  return '<div class="tum-tech-row"><span class="tum-tech-l">' + l + '</span><span class="tum-tech-v">' + v + '</span></div>';
}

function _tIn(type, label, val, onchange, ph) {
  return '<div class="tum-f"><label class="tum-lbl">' + label + '</label>' +
    '<input class="tum-in" type="' + type + '" value="' + (val || '') + '" placeholder="' + (ph || '') + '" onchange="' + onchange + '"></div>';
}

function _tDim(label, key, val, ph) {
  return '<div class="tum-f"><label class="tum-lbl">' + label + '</label>' +
    '<input class="tum-in" type="number" step="0.01" value="' + val + '" placeholder="' + ph + '" ' +
    'onchange="TUM.q.dims.' + key + '=+this.value;tumRecalc()"></div>';
}

// ══════════════════════════════════════════════════════════════════════
// CSS ADICIONAL
// ══════════════════════════════════════════════════════════════════════
(function _injectTumCSS() {
  var s = document.createElement('style');
  s.textContent = `
    /* ── DRE TABLE ── */
    .tum-dre-table{background:var(--s3);border:1px solid var(--bd2);border-radius:14px;overflow:hidden;margin-bottom:12px;}
    .tum-dre-head{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;padding:8px 12px;background:rgba(201,168,76,.08);border-bottom:1px solid var(--bd2);}
    .tum-dre-head span{font-size:.52rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t4);font-weight:700;}
    .tum-dre-row{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.04);}
    .tum-dre-row span{font-size:.68rem;color:var(--t2);}
    .tum-dre-total{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;padding:10px 12px;background:rgba(201,168,76,.06);border-top:1px solid rgba(201,168,76,.2);}
    .tum-dre-total span{font-size:.72rem;font-weight:700;color:var(--tx);}

    /* ── EXTRAS ── */
    .tum-extra-hd{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--s3);border:1px solid var(--bd2);border-radius:12px;margin-bottom:6px;cursor:pointer;margin-top:10px;}
    .tum-extra-body{background:var(--s2);border:1px solid var(--bd2);border-radius:0 0 12px 12px;padding:14px;margin-top:-6px;margin-bottom:10px;}

    /* ── FOTO ÁREA ── */
    .tum-foto-area{margin-bottom:10px;}
    .tum-foto-empty{border:2px dashed var(--bd2);border-radius:12px;padding:24px 16px;text-align:center;cursor:pointer;transition:border-color .2s;}
    .tum-foto-empty:active{border-color:var(--gold);}

    /* ── GAVETA BOTÕES ── */
    .tum-gav-btn{width:48px;height:48px;border-radius:50%;background:var(--s3);border:1.5px solid var(--bd2);color:var(--gold2);font-size:1.4rem;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;font-family:Outfit,sans-serif;flex-shrink:0;}
    .tum-gav-btn:active{background:var(--s4);}

    /* ── CRONO ── */
    .tum-crono{background:var(--s3);border:1px solid var(--bd2);border-radius:12px;padding:12px 14px;margin-bottom:10px;}
    .tum-crono-row{display:flex;gap:4px;margin-bottom:8px;}
    .tum-crono-item{display:flex;flex-direction:column;gap:4px;min-width:40px;}
    .tum-crono-bar{height:12px;border-radius:4px;}
    .tum-crono-obra{background:#483828;}
    .tum-crono-mdo{background:#4a80b5;}
    .tum-crono-lbl{font-size:.52rem;color:var(--t3);line-height:1.4;}
    .tum-crono-total{font-size:.68rem;color:var(--t2);font-weight:600;border-top:1px solid var(--bd2);padding-top:8px;}

    /* ── PREC BOX ── */
    .tum-prec-box{background:var(--s3);border:1px solid var(--bd2);border-radius:14px;padding:14px;margin-bottom:12px;}
    .tum-prec-breakdown{margin-top:12px;border-top:1px solid var(--bd2);padding-top:10px;}
    .tum-prec-row{display:flex;justify-content:space-between;padding:5px 0;font-size:.68rem;color:var(--t3);border-bottom:1px solid rgba(255,255,255,.04);}
    .tum-prec-final{display:flex;justify-content:space-between;padding:10px 0 2px;font-size:.85rem;font-weight:800;color:var(--gold2);}

    /* ── WARN ── */
    .tum-warn{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.3);border-radius:10px;padding:10px 13px;font-size:.68rem;color:var(--gold3);margin-bottom:10px;}
    .tum-info-box{background:rgba(100,180,255,.06);border:1px solid rgba(100,180,255,.15);border-radius:10px;padding:10px 13px;font-size:.65rem;color:var(--t3);margin-bottom:10px;line-height:1.6;}

    /* ── STONE PICK ── */
    .tum-stone-pick{display:flex;flex-direction:column;gap:4px;}
    .tum-sp-row{display:flex;justify-content:space-between;align-items:center;padding:10px 13px;background:var(--s2);border:1px solid var(--bd2);border-radius:10px;cursor:pointer;}
    .tum-sp-row.on{border-color:var(--gold);background:rgba(201,168,76,.08);}
    .tum-sp-nm{font-size:.76rem;font-weight:600;color:var(--t2);}
    .tum-sp-pr{font-size:.68rem;color:var(--gold2);}

    /* ── TOTALS ── */
    .tum-total-box{background:var(--s3);border:1px solid var(--bd2);border-radius:12px;overflow:hidden;margin-top:10px;}
    .tum-total-row{display:flex;justify-content:space-between;padding:8px 13px;border-bottom:1px solid rgba(255,255,255,.04);font-size:.7rem;color:var(--t2);}
    .tum-total-big{background:rgba(201,168,76,.05);font-weight:700;font-size:.76rem;color:var(--tx);}

    /* ── TECH BOX ── */
    .tum-tech-box{background:var(--s3);border:1px solid var(--bd2);border-radius:12px;overflow:hidden;}
    .tum-tech-row{display:flex;justify-content:space-between;padding:8px 13px;border-bottom:1px solid rgba(255,255,255,.04);}
    .tum-tech-l{font-size:.62rem;color:var(--t4);}
    .tum-tech-v{font-size:.66rem;color:var(--t2);font-weight:600;text-align:right;max-width:60%;}

    /* ── STONE ROW ── */
    .tum-stone-row{display:flex;align-items:center;gap:10px;background:var(--s3);border:1px solid var(--bd2);border-radius:10px;padding:10px 12px;}
    .tum-stone-sel{flex:1;}
    .tum-stone-nm{font-size:.76rem;font-weight:700;color:var(--t2);}
    .tum-stone-pr{font-size:.66rem;color:var(--gold2);}
    .tum-stone-empty{flex:1;font-size:.68rem;color:var(--t4);}

    /* ── TIPOS GRID ── */
    .tum-tipos-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:4px;}
    .tum-tipo-card{background:var(--s3);border:1.5px solid var(--bd2);border-radius:12px;padding:10px;cursor:pointer;transition:border-color .15s;}
    .tum-tipo-card.on{border-color:var(--gold);background:rgba(201,168,76,.07);}
    .tum-tipo-icon{font-size:1.2rem;margin-bottom:4px;}
    .tum-tipo-label{font-size:.68rem;font-weight:700;color:var(--t2);margin-bottom:2px;}
    .tum-tipo-desc{font-size:.56rem;color:var(--t4);line-height:1.4;}

    /* ── PECA LIST ── */
    .tum-peca-list{display:flex;flex-direction:column;gap:4px;margin-bottom:8px;}
    .tum-peca-row{background:var(--s3);border:1px solid var(--bd2);border-radius:10px;overflow:hidden;}
    .tum-peca-off{opacity:.55;}
    .tum-peca-header{display:flex;align-items:center;gap:10px;padding:10px 12px;}
    .tum-peca-label{flex:1;font-size:.72rem;font-weight:600;color:var(--t2);}
    .tum-peca-val{flex-shrink:0;}
    .tum-peca-detail{padding:10px 12px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.05);}

    /* ── TOGGLE ── */
    .tum-tog{position:relative;display:inline-block;width:34px;height:20px;flex-shrink:0;}
    .tum-tog input{opacity:0;width:0;height:0;}
    .tum-tog-slider{position:absolute;inset:0;background:var(--s4);border-radius:20px;transition:.2s;}
    .tum-tog-slider:before{content:"";position:absolute;width:14px;height:14px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;}
    .tum-tog input:checked+.tum-tog-slider{background:var(--gold);}
    .tum-tog input:checked+.tum-tog-slider:before{transform:translateX(14px);}

    /* ── MISC ── */
    .tum-sec{padding:14px 15px;}
    .tum-sec-lbl{font-size:.56rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:8px;}
    .tum-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .tum-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;}
    .tum-f{display:flex;flex-direction:column;gap:4px;}
    .tum-lbl{font-size:.56rem;letter-spacing:.5px;text-transform:uppercase;color:var(--t4);}
    .tum-in{background:var(--s3);border:1px solid var(--bd2);border-radius:8px;padding:9px 10px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.82rem;outline:none;width:100%;box-sizing:border-box;}
    .tum-obs{width:100%;background:var(--s3);border:1px solid var(--bd2);border-radius:10px;padding:10px 12px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.78rem;outline:none;resize:vertical;box-sizing:border-box;}
    .tum-nav-row{display:flex;gap:8px;margin-top:16px;}
    .tum-action-btns{display:flex;gap:8px;margin-top:16px;}

    /* ── HERO ── */
    .tum-hero{background:linear-gradient(135deg,var(--s2),var(--s1));border-bottom:1px solid var(--bd);padding:14px 16px 12px;}
    .tum-hero-row{display:flex;justify-content:space-between;align-items:flex-start;}
    .tum-hero-title{font-size:.72rem;font-weight:700;color:var(--t2);}
    .tum-hero-sub{font-size:.62rem;color:var(--t3);margin-top:2px;}
    .tum-hero-val{font-family:'Cormorant Garamond',serif;font-size:1.6rem;font-weight:700;color:var(--gold2);}

    /* ── TABS ── */
    .tum-tabs{display:flex;gap:0;overflow-x:auto;background:var(--s1);border-bottom:1px solid var(--bd);scrollbar-width:none;}
    .tum-tabs::-webkit-scrollbar{display:none;}
    .tum-tab{display:flex;flex-direction:column;align-items:center;gap:2px;padding:9px 12px;cursor:pointer;white-space:nowrap;font-size:.52rem;color:var(--t4);border-bottom:2px solid transparent;transition:color .15s;}
    .tum-tab.on{color:var(--gold);border-bottom-color:var(--gold);}
    .tum-tab span:first-child{font-size:.9rem;}
  `;
  document.head.appendChild(s);
})();