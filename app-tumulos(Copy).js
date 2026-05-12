// ══════════════════════════════════════════════════════════════════════
// MÓDULO TÚMULOS — Orçamento Profissional HR Mármores e Granitos
// Categorias: Pedra | Estrutura | Construção | Acabamentos | Lápide
//             Cruz | Foto Porcelana | Revestimento | MO | Instalação | Transporte
// Visão completa: Custo Real × Valor de Venda × Lucro Estimado
// ══════════════════════════════════════════════════════════════════════

var TUM = {

  q: {
    cli:'', falecido:'', cemiterio:'', quadra:'', lote:'',
    tipo:'simples',
    stoneId: null, stonePrice: 0,
    dims:{ comp:2.20, larg:0.90, alt:0.60, esp:3, gavetas:1 },

    // ── PEDRA ──────────────────────────────────────────────────────
    pedras:{
      tampa:     { on:true,  qty:1, m2:0, extra:0 },
      detalhe:   { on:false, qty:1, m2:0, extra:0 },
      laterais:  { on:true,  qty:2, m2:0, extra:0 },
      frontais:  { on:true,  qty:2, m2:0, extra:0 },
      base:      { on:true,  qty:1, m2:0, extra:0 },
      gavetas:   { on:false, qty:1, m2:0, extra:0 },
      moldura:   { on:false, ml:0, vlrMl:120, extra:0 },
      pingadeira:{ on:false, ml:0, vlrMl:80,  extra:0 },
      sainha:    { on:false, qty:1, m2:0, extra:0 },
      recortes:  { on:false, qty:0, vlrUn:80 },
      perda: 15
    },

    // ── MÃO DE OBRA ────────────────────────────────────────────────
    mdo:{
      marmorista: { on:true,  horas:8,  diaria:400 },
      ajudante:   { on:true,  horas:8,  diaria:220 },
      instalacao: { on:true,  custo:200, venda:350  },
      acabamento: { on:true,  custo:120, venda:200  },
      montagem:   { on:false, custo:200, venda:300  },
      transporte: { on:true,  custo:100, venda:150  },
      riscoQuebra:{ on:true,  perc:3 },
      dificuldade:{ on:false, perc:0 }
    },

    // ── CONSTRUÇÃO / PEDREIRO ───────────────────────────────────────
    obra:{
      fundacao:     { on:true,  dias:1, diaria:350, equipe:1 },
      levantamento: { on:false, dias:1, diaria:350, equipe:1 },
      reboco:       { on:false, dias:1, diaria:350, equipe:1 },
      contraPiso:   { on:false, dias:1, diaria:350, equipe:1 },
      gavetas:      { on:false, dias:1, diaria:350, equipe:1 },
      concreto:     { on:false, dias:1, diaria:350, equipe:1 },
      acabOb:       { on:false, dias:1, diaria:350, equipe:1 }
    },

    // ── MATERIAIS DE CONSTRUÇÃO ─────────────────────────────────────
    mat:{
      cimento: { on:true,  qty:0, preco:38,   unid:'sc'  },
      areia:   { on:true,  qty:0, preco:200,  unid:'m³'  },
      brita:   { on:false, qty:0, preco:220,  unid:'m³'  },
      ferro:   { on:false, qty:0, preco:14,   unid:'kg'  },
      tijolos: { on:false, qty:0, preco:1.20, unid:'un'  },
      blocos:  { on:false, qty:0, preco:5.50, unid:'un'  },
      massa:   { on:true,  qty:0, preco:32,   unid:'sc'  },
      cola:    { on:true,  qty:0, preco:48,   unid:'sc'  },
      rejunte: { on:true,  qty:0, preco:14,   unid:'kg'  },
      agua:    { on:false, vlr:0 },
      frete:   { on:true,  vlr:0 }
    },

    // ── ACABAMENTOS ────────────────────────────────────────────────
    acab:{
      polimento:  { on:false, custo:80,  venda:150, unid:'m²',  qty:0,  desc:'Polimento especial' },
      bisote:     { on:false, custo:40,  venda:80,  unid:'ml',  qty:0,  desc:'Borda bisotada' },
      jateamento: { on:false, custo:60,  venda:120, unid:'m²',  qty:0,  desc:'Jateamento superfície' },
      resinagem:  { on:false, custo:30,  venda:60,  unid:'m²',  qty:0,  desc:'Resina impermeabilizante' },
      furo:       { on:false, custo:25,  venda:60,  unid:'un',  qty:0,  desc:'Furo/recorte especial' },
      chanfro:    { on:false, custo:35,  venda:70,  unid:'ml',  qty:0,  desc:'Chanfro decorativo' }
    },

    // ── LÁPIDE ─────────────────────────────────────────────────────
    lapide:{
      on: false,
      tipo: 'padrao',  // padrao | personalizada | bronze
      custo: 280,
      venda: 450,
      texto: '',
      linhas: 4,
      custoPorLinha: 35,
      vendaPorLinha: 60
    },

    // ── CRUZ ───────────────────────────────────────────────────────
    cruz:{
      on: false,
      tipo: 'marmore',  // marmore | granito | metal | inox
      modelo: 'simples', // simples | lavrada | com_base
      custo: 180,
      venda: 320,
      altura: 0.60  // metros
    },

    // ── FOTO PORCELANA ─────────────────────────────────────────────
    foto:{
      on: false,
      tamanho: '10x15',  // 10x15 | 15x20 | 20x25 | oval
      custo: 85,
      venda: 160,
      moldura: false,
      custoMoldura: 40,
      vendaMoldura: 80
    },

    // ── REVESTIMENTO ───────────────────────────────────────────────
    revestimento:{
      on: false,
      tipo: 'granito',  // granito | porcelana | ceramica | marmore
      custo: 0,   // custo/m²
      venda: 0,   // venda/m²
      m2: 0,
      preparo: { on:false, custo:80, venda:150 }  // preparo de superfície
    },

    margem: 40,
    desconto: 0,
    obs: ''
  },

  calc: {},

  // ── PRESETS ─────────────────────────────────────────────────────────
  TIPOS: {
    simples: {
      label:'Túmulo Simples', icon:'⬛',
      desc:'Tampa + laterais + frontais + base básica',
      dims:{ comp:2.20, larg:0.90, alt:0.60, esp:3, gavetas:1 },
      pedras:['tampa','laterais','frontais','base'],
      mdo:['marmorista','ajudante','instalacao','acabamento','transporte','riscoQuebra'],
      obra:['fundacao'], mat:['cimento','areia','massa','cola','rejunte'],
      diasMdo:2, diasObra:2, tempoTotal:4
    },
    gaveta_dupla: {
      label:'Gaveta Dupla', icon:'📦',
      desc:'2 compartimentos, estrutura elevada',
      dims:{ comp:2.20, larg:0.90, alt:1.20, esp:3, gavetas:2 },
      pedras:['tampa','laterais','frontais','gavetas','base'],
      mdo:['marmorista','ajudante','instalacao','acabamento','montagem','transporte','riscoQuebra'],
      obra:['fundacao','levantamento','reboco','gavetas'],
      mat:['cimento','areia','brita','tijolos','massa','cola','rejunte'],
      diasMdo:4, diasObra:5, tempoTotal:9
    },
    gaveta_tripla: {
      label:'Gaveta Tripla', icon:'🗃️',
      desc:'3 compartimentos, estrutura reforçada',
      dims:{ comp:2.40, larg:0.90, alt:1.80, esp:3, gavetas:3 },
      pedras:['tampa','laterais','frontais','gavetas','base','moldura'],
      mdo:['marmorista','ajudante','instalacao','acabamento','montagem','transporte','riscoQuebra','dificuldade'],
      obra:['fundacao','levantamento','reboco','gavetas','concreto'],
      mat:['cimento','areia','brita','ferro','tijolos','blocos','massa','cola','rejunte'],
      diasMdo:6, diasObra:7, tempoTotal:13
    },
    capela: {
      label:'Capela / Monumento', icon:'⛪',
      desc:'Estrutura monumental com acabamento completo',
      dims:{ comp:2.60, larg:1.60, alt:2.20, esp:3, gavetas:2 },
      pedras:['tampa','detalhe','laterais','frontais','gavetas','base','moldura','pingadeira','sainha'],
      mdo:['marmorista','ajudante','instalacao','acabamento','montagem','transporte','riscoQuebra','dificuldade'],
      obra:['fundacao','levantamento','reboco','contraPiso','gavetas','concreto','acabOb'],
      mat:['cimento','areia','brita','ferro','tijolos','blocos','massa','cola','rejunte','agua','frete'],
      diasMdo:12, diasObra:15, tempoTotal:27
    },
    revestimento: {
      label:'Revestimento / Reforma Pedra', icon:'🪨',
      desc:'Somente pedra — reveste estrutura existente',
      dims:{ comp:2.20, larg:0.90, alt:0.80, esp:2, gavetas:1 },
      pedras:['tampa','laterais','frontais','moldura','recortes'],
      mdo:['marmorista','ajudante','acabamento','transporte','riscoQuebra'],
      obra:[], mat:['cola','rejunte'],
      diasMdo:2, diasObra:0, tempoTotal:2
    },
    reforma: {
      label:'Reforma Completa', icon:'🔧',
      desc:'Substituição de pedras + reparos estruturais',
      dims:{ comp:2.20, larg:0.90, alt:0.80, esp:3, gavetas:1 },
      pedras:['tampa','laterais','frontais','base'],
      mdo:['marmorista','ajudante','instalacao','acabamento','transporte','riscoQuebra'],
      obra:['fundacao','reboco'], mat:['cimento','areia','massa','cola','rejunte'],
      diasMdo:3, diasObra:2, tempoTotal:5
    },
    jazigo: {
      label:'Jazigo Completo', icon:'🏛️',
      desc:'Jazigo familiar, múltiplas gavetas',
      dims:{ comp:3.00, larg:2.00, alt:2.40, esp:4, gavetas:4 },
      pedras:['tampa','detalhe','laterais','frontais','gavetas','base','moldura','pingadeira','sainha'],
      mdo:['marmorista','ajudante','instalacao','acabamento','montagem','transporte','riscoQuebra','dificuldade'],
      obra:['fundacao','levantamento','reboco','contraPiso','gavetas','concreto','acabOb'],
      mat:['cimento','areia','brita','ferro','tijolos','blocos','massa','cola','rejunte','agua','frete'],
      diasMdo:16, diasObra:20, tempoTotal:36
    }
  },

  PEDRA_LABELS:{
    tampa:'Tampa', detalhe:'Detalhe Superior', laterais:'Laterais (×2)',
    frontais:'Frontais (×2)', base:'Base', gavetas:'Frentes de Gaveta',
    moldura:'Moldura (ml)', pingadeira:'Pingadeira (ml)',
    sainha:'Sainha', recortes:'Recortes / Furos'
  },
  MDO_LABELS:{
    marmorista:'Marmorista', ajudante:'Ajudante', instalacao:'Instalação',
    acabamento:'Acabamento', montagem:'Montagem', transporte:'Transporte',
    riscoQuebra:'Risco de Quebra (%)', dificuldade:'Dificuldade (%)'
  },
  OBRA_LABELS:{
    fundacao:'Fundação', levantamento:'Levantamento de Alvenaria',
    reboco:'Reboco / Chapisco', contraPiso:'Contra-piso',
    gavetas:'Gavetas (estrutura)', concreto:'Concreto Armado', acabOb:'Acabamento Final'
  },
  MAT_LABELS:{
    cimento:'Cimento', areia:'Areia', brita:'Brita', ferro:'Ferro / Tela',
    tijolos:'Tijolos', blocos:'Blocos de Concreto', massa:'Massa Pronta',
    cola:'Cola p/ Granito', rejunte:'Rejunte', agua:'Água (caminhão)', frete:'Frete'
  },
  ACAB_LABELS:{
    polimento:'Polimento Especial', bisote:'Borda Bisotada', jateamento:'Jateamento',
    resinagem:'Resina Impermeabilizante', furo:'Furo / Recorte', chanfro:'Chanfro Decorativo'
  }
};

// ══════════════════════════════════════════════════════════════════════
// INIT / RENDER
// ══════════════════════════════════════════════════════════════════════
function tumInit() { renderTum(); }

function renderTum() {
  var pg = document.getElementById('pg9');
  if (!pg) return;
  tumAutoCalcDims();
  tumAutoMatQty();
  TUM.calc = tumCalc();

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
  var q = TUM.q, r = TUM.calc;
  var vf = r.venda || 0;
  var lucro = r.lucroTotal || 0;
  var margemPct = r.margemReal || 0;

  return '<div class="tum-hero">' +
    '<div class="tum-hero-row">' +
    '<div>' +
    '<div class="tum-hero-title">⚰️ Orçamento Funerário</div>' +
    '<div class="tum-hero-sub">' + (TUM.TIPOS[q.tipo] ? TUM.TIPOS[q.tipo].label : '') + '</div>' +
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
var _tumTab = 'cliente';
function _tumTabs() {
  var tabs = [
    { k:'cliente',     i:'👤', l:'Cliente'    },
    { k:'pedras',      i:'🪨', l:'Pedra'      },
    { k:'extras',      i:'✨', l:'Extras'     },
    { k:'mdo',         i:'🔨', l:'Mão Obra'   },
    { k:'obra',        i:'🧱', l:'Construção' },
    { k:'mat',         i:'🪣', l:'Materiais'  },
    { k:'resumo',      i:'💰', l:'Resumo'     }
  ];
  var h = '<div class="tum-tabs">';
  tabs.forEach(function(t) {
    h += '<div class="tum-tab' + (_tumTab===t.k?' on':'') + '" onclick="tumTab(\''+t.k+'\')">' +
      '<span>' + t.i + '</span><span>' + t.l + '</span>' +
      '</div>';
  });
  h += '</div>';
  return h;
}

function tumTab(t) { _tumTab = t; renderTum(); }

function _tumRenderTab() {
  var body = document.getElementById('tumBody');
  if (!body) return;
  if (_tumTab==='cliente') body.innerHTML = _tumCliente();
  else if (_tumTab==='pedras')  body.innerHTML = _tumPedras();
  else if (_tumTab==='extras')  body.innerHTML = _tumExtras();
  else if (_tumTab==='mdo')     body.innerHTML = _tumMdo();
  else if (_tumTab==='obra')    body.innerHTML = _tumObra();
  else if (_tumTab==='mat')     body.innerHTML = _tumMat();
  else if (_tumTab==='resumo')  body.innerHTML = _tumResumo();
}

// ══════════════════════════════════════════════════════════════════════
// ABA CLIENTE
// ══════════════════════════════════════════════════════════════════════
function _tumCliente() {
  var q = TUM.q;
  var h = '<div class="tum-sec">';
  h += '<div class="tum-sec-lbl">👤 Identificação</div>';
  h += '<div class="tum-grid2">';
  h += _tumInput('text','Cliente / Contratante', q.cli,       "tumSet('cli',this.value)",       'Família Oliveira...');
  h += _tumInput('text','Falecido',              q.falecido,  "tumSet('falecido',this.value)",  'Nome do falecido');
  h += _tumInput('text','Cemitério',             q.cemiterio, "tumSet('cemiterio',this.value)", 'Cemitério Municipal');
  h += _tumInput('text','Quadra / Lote',         q.quadra,    "tumSet('quadra',this.value)",    'Q04 L15');
  h += '</div>';

  h += '<div class="tum-sec-lbl" style="margin-top:16px;">⚰️ Tipo de Serviço</div>';
  h += '<div class="tum-tipos-grid">';
  Object.keys(TUM.TIPOS).forEach(function(k) {
    var t = TUM.TIPOS[k];
    h += '<div class="tum-tipo-card' + (q.tipo===k?' on':'') + '" onclick="tumSetTipo(\''+k+'\')">' +
      '<div class="tum-tipo-icon">' + t.icon + '</div>' +
      '<div class="tum-tipo-label">' + t.label + '</div>' +
      '<div class="tum-tipo-desc">' + t.desc + '</div>' +
      '</div>';
  });
  h += '</div>';

  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📐 Dimensionamento</div>';
  h += '<div class="tum-grid3">';
  h += _tumDimInput('Comprimento (m)', 'comp',    q.dims.comp,    'Ex: 2.20');
  h += _tumDimInput('Largura (m)',     'larg',    q.dims.larg,    'Ex: 0.90');
  h += _tumDimInput('Altura (m)',      'alt',     q.dims.alt,     'Ex: 0.60');
  h += _tumDimInput('Espessura (cm)',  'esp',     q.dims.esp,     'Ex: 3');
  h += _tumDimInput('Gavetas',         'gavetas', q.dims.gavetas, 'Ex: 1');
  h += '</div>';

  var c=q.dims.comp, l=q.dims.larg, a=q.dims.alt, perda=q.pedras.perda||15;
  var m2base = c*l*2 + c*a*2 + l*a*2;
  var m2com  = m2base * (1+perda/100);
  h += '<div class="tum-dims-preview">';
  h += '<div class="tum-dp-title">📏 Área estimada das peças</div>';
  h += '<div class="tum-dp-grid">';
  h += _dpItem('Tampa + Base', fm(c*l*2)+' m²');
  h += _dpItem('Laterais (×2)', fm(c*a*2)+' m²');
  h += _dpItem('Frontais (×2)', fm(l*a*2)+' m²');
  h += _dpItem('TOTAL líquido', fm(m2base)+' m²');
  h += _dpItem('c/ '+perda+'% perda', fm(m2com)+' m²');
  h += '</div></div>';

  h += '<div class="tum-sec-lbl" style="margin-top:16px;">🪨 Pedra</div>';
  h += '<div class="tum-stone-row">';
  var sel = q.stoneId && CFG && CFG.stones ? CFG.stones.find(function(s){return s.id===q.stoneId;}) : null;
  if (sel) {
    h += '<div class="tum-stone-sel"><div class="tum-stone-nm">' + sel.nm + '</div>' +
         '<div class="tum-stone-pr">R$ ' + fm(sel.pr) + '/m²</div></div>';
  } else {
    h += '<div class="tum-stone-empty">Nenhuma pedra selecionada</div>';
  }
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumOpenStonePick()">Escolher</button>';
  h += '</div>';

  h += '<div style="margin-top:10px;"><label class="tum-lbl">Perda / Desperdício (%)</label>';
  h += '<input class="tum-in" type="number" value="' + perda + '" min="5" max="40" style="max-width:90px;" ' +
       'onchange="TUM.q.pedras.perda=+this.value;tumRecalc()"></div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-g" onclick="tumTab(\'pedras\')">Próximo: Pedra →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA PEDRAS
// ══════════════════════════════════════════════════════════════════════
function _tumPedras() {
  var q = TUM.q, p = q.pedras;
  var sel = q.stoneId && CFG && CFG.stones ? CFG.stones.find(function(s){return s.id===q.stoneId;}) : null;
  var stPr = sel ? sel.pr : (q.stonePrice||0);

  var h = '<div class="tum-sec">';
  if (!stPr) h += '<div class="tum-warn">⚠️ Selecione uma pedra na aba Cliente para ver os valores.</div>';
  h += '<div class="tum-sec-lbl">🪨 Peças de Pedra</div>';
  h += '<div class="tum-peca-list">';

  ['tampa','detalhe','laterais','frontais','base','gavetas','sainha'].forEach(function(k) {
    var peca = p[k]; if (!peca) return;
    var m2 = peca.m2||0, custo = m2*stPr;
    h += _pecaRow(k, TUM.PEDRA_LABELS[k], peca.on, fm(m2)+' m²', stPr?'R$ '+fm(custo):'',
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Área (m²)</label><input class="tum-in" type="number" step="0.01" value="'+m2+'" onchange="tumSetPeca(\''+k+'\',\'m2\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Qtd peças</label><input class="tum-in" type="number" min="1" value="'+(peca.qty||1)+'" onchange="tumSetPeca(\''+k+'\',\'qty\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Acréscimo R$</label><input class="tum-in" type="number" min="0" value="'+(peca.extra||0)+'" onchange="tumSetPeca(\''+k+'\',\'extra\',+this.value)"></div>' +
      '</div>',
      'tumTogPeca');
  });

  // Moldura
  var mol=p.moldura, m2mol=(mol.ml||0)*0.12, custoMol=mol.on?m2mol*stPr:0;
  h += _pecaRow('moldura','Moldura (ml)',mol.on, fm(mol.ml||0)+' ml', stPr?'R$ '+fm(custoMol):'',
    '<div class="tum-grid3">' +
    '<div class="tum-f"><label class="tum-lbl">Metros lineares</label><input class="tum-in" type="number" step="0.01" value="'+(mol.ml||0)+'" onchange="tumSetPecaML(\'moldura\',+this.value)"></div>' +
    '<div class="tum-f"><label class="tum-lbl">Valor/ml R$</label><input class="tum-in" type="number" value="'+(mol.vlrMl||120)+'" onchange="TUM.q.pedras.moldura.vlrMl=+this.value;tumRecalc()"></div>' +
    '</div>', 'tumTogPeca');

  // Pingadeira
  var ping=p.pingadeira, m2ping=(ping.ml||0)*0.08, custoPing=ping.on?m2ping*stPr:0;
  h += _pecaRow('pingadeira','Pingadeira (ml)',ping.on, fm(ping.ml||0)+' ml', stPr?'R$ '+fm(custoPing):'',
    '<div class="tum-grid3">' +
    '<div class="tum-f"><label class="tum-lbl">Metros lineares</label><input class="tum-in" type="number" step="0.01" value="'+(ping.ml||0)+'" onchange="tumSetPecaML(\'pingadeira\',+this.value)"></div>' +
    '<div class="tum-f"><label class="tum-lbl">Valor/ml R$</label><input class="tum-in" type="number" value="'+(ping.vlrMl||80)+'" onchange="TUM.q.pedras.pingadeira.vlrMl=+this.value;tumRecalc()"></div>' +
    '</div>', 'tumTogPeca');

  // Recortes
  var rec=p.recortes;
  h += _pecaRow('recortes','Recortes / Furos',rec.on, (rec.qty||0)+' un', 'R$ '+fm((rec.qty||0)*(rec.vlrUn||80)),
    '<div class="tum-grid3">' +
    '<div class="tum-f"><label class="tum-lbl">Qtd</label><input class="tum-in" type="number" min="0" value="'+(rec.qty||0)+'" onchange="TUM.q.pedras.recortes.qty=+this.value;tumRecalc()"></div>' +
    '<div class="tum-f"><label class="tum-lbl">Valor un R$</label><input class="tum-in" type="number" value="'+(rec.vlrUn||80)+'" onchange="TUM.q.pedras.recortes.vlrUn=+this.value;tumRecalc()"></div>' +
    '</div>', 'tumTogPeca');

  h += '</div>';

  var r = TUM.calc;
  h += '<div class="tum-total-box">';
  h += _totalRow('Área líquida', fm(r.m2liq||0)+' m²', false);
  h += _totalRow('Com '+(p.perda||15)+'% perda', fm(r.m2total||0)+' m²', false);
  if (stPr) {
    h += _totalRow('💎 Custo real pedra', 'R$ '+fm(r.custoPedra||0), true);
    h += _totalRow('💰 Valor venda pedra', 'R$ '+fm(r.vendaPedra||0), true, 'grn');
    h += _totalRow('📈 Lucro pedra', 'R$ '+fm((r.vendaPedra||0)-(r.custoPedra||0)), false, 'gold');
  }
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'cliente\')">← Cliente</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'extras\')">Extras →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA EXTRAS — Lápide | Cruz | Foto | Revestimento | Acabamentos
// ══════════════════════════════════════════════════════════════════════
function _tumExtras() {
  var q = TUM.q;
  var h = '<div class="tum-sec">';

  // ── LÁPIDE ──────────────────────────────────────────────────────
  h += _extraSecHeader('📜 Lápide', 'lapide', q.lapide.on);
  if (q.lapide.on) {
    var lp = q.lapide;
    var custoLap = lp.custo + (lp.linhas * lp.custoPorLinha);
    var vendaLap = lp.venda + (lp.linhas * lp.vendaPorLinha);
    h += '<div class="tum-extra-body">';
    h += '<div class="tum-grid2">';
    h += '<div class="tum-f"><label class="tum-lbl">Tipo de Lápide</label>';
    h += '<select class="tum-in" onchange="TUM.q.lapide.tipo=this.value;tumRecalc()">';
    [['padrao','Padrão'],['personalizada','Personalizada'],['bronze','Placa Bronze']].forEach(function(o){
      h += '<option value="'+o[0]+'"'+(lp.tipo===o[0]?' selected':'')+'>'+o[1]+'</option>';
    });
    h += '</select></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Linhas de texto</label>' +
         '<input class="tum-in" type="number" min="1" max="12" value="'+lp.linhas+'" onchange="TUM.q.lapide.linhas=+this.value;tumRecalc()"></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += _custoVendaInputs('lapide','custo','venda', lp.custo, lp.venda, 'Custo placa R$','Venda placa R$');
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:4px;">';
    h += _custoVendaInputs('lapide','custoPorLinha','vendaPorLinha', lp.custoPorLinha, lp.vendaPorLinha, 'Custo/linha R$','Venda/linha R$');
    h += '</div>';
    h += _miniResumo('Lápide', custoLap, vendaLap);
    h += '<div class="tum-f" style="margin-top:8px;"><label class="tum-lbl">Texto da lápide</label>' +
         '<textarea class="tum-in" rows="2" style="resize:vertical;" placeholder="Aqui jaz..." onchange="TUM.q.lapide.texto=this.value">'+lp.texto+'</textarea></div>';
    h += '</div>';
  }

  // ── CRUZ ─────────────────────────────────────────────────────────
  h += _extraSecHeader('✝️ Cruz', 'cruz', q.cruz.on);
  if (q.cruz.on) {
    var cr = q.cruz;
    h += '<div class="tum-extra-body">';
    h += '<div class="tum-grid2">';
    h += '<div class="tum-f"><label class="tum-lbl">Material</label>';
    h += '<select class="tum-in" onchange="TUM.q.cruz.tipo=this.value;tumRecalc()">';
    [['marmore','Mármore'],['granito','Granito'],['metal','Metal Pintado'],['inox','Inox']].forEach(function(o){
      h += '<option value="'+o[0]+'"'+(cr.tipo===o[0]?' selected':'')+'>'+o[1]+'</option>';
    });
    h += '</select></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Modelo</label>';
    h += '<select class="tum-in" onchange="TUM.q.cruz.modelo=this.value;tumRecalc()">';
    [['simples','Simples'],['lavrada','Lavrada / Trabalhada'],['com_base','Com Base']].forEach(function(o){
      h += '<option value="'+o[0]+'"'+(cr.modelo===o[0]?' selected':'')+'>'+o[1]+'</option>';
    });
    h += '</select></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += _custoVendaInputs('cruz','custo','venda', cr.custo, cr.venda, 'Custo R$','Venda R$');
    h += '</div>';
    h += '<div class="tum-f" style="margin-top:4px;"><label class="tum-lbl">Altura (m)</label>' +
         '<input class="tum-in" type="number" step="0.05" value="'+cr.altura+'" style="max-width:100px;" onchange="TUM.q.cruz.altura=+this.value;tumRecalc()"></div>';
    h += _miniResumo('Cruz', cr.custo, cr.venda);
    h += '</div>';
  }

  // ── FOTO PORCELANA ───────────────────────────────────────────────
  h += _extraSecHeader('📷 Foto Porcelana', 'foto', q.foto.on);
  if (q.foto.on) {
    var ft = q.foto;
    h += '<div class="tum-extra-body">';
    h += '<div class="tum-grid2">';
    h += '<div class="tum-f"><label class="tum-lbl">Tamanho</label>';
    h += '<select class="tum-in" onchange="TUM.q.foto.tamanho=this.value;tumRecalc()">';
    [['10x15','10×15 cm'],['15x20','15×20 cm'],['20x25','20×25 cm'],['oval','Oval']].forEach(function(o){
      h += '<option value="'+o[0]+'"'+(ft.tamanho===o[0]?' selected':'')+'>'+o[1]+'</option>';
    });
    h += '</select></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Moldura?</label>';
    h += '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer;">';
    h += '<input type="checkbox"'+(ft.moldura?' checked':'')+' style="accent-color:var(--gold);" onchange="TUM.q.foto.moldura=this.checked;tumRecalc()">';
    h += '<span style="font-size:.72rem;color:var(--t2);">Com moldura</span></label></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += _custoVendaInputs('foto','custo','venda', ft.custo, ft.venda, 'Custo foto R$','Venda foto R$');
    h += '</div>';
    if (ft.moldura) {
      h += '<div class="tum-grid2" style="margin-top:4px;">';
      h += _custoVendaInputs('foto','custoMoldura','vendaMoldura', ft.custoMoldura, ft.vendaMoldura, 'Custo moldura R$','Venda moldura R$');
      h += '</div>';
    }
    var custoFoto = ft.custo + (ft.moldura?ft.custoMoldura:0);
    var vendaFoto = ft.venda + (ft.moldura?ft.vendaMoldura:0);
    h += _miniResumo('Foto Porcelana', custoFoto, vendaFoto);
    h += '</div>';
  }

  // ── REVESTIMENTO ─────────────────────────────────────────────────
  h += _extraSecHeader('🪟 Revestimento', 'revestimento', q.revestimento.on);
  if (q.revestimento.on) {
    var rv = q.revestimento;
    h += '<div class="tum-extra-body">';
    h += '<div class="tum-grid2">';
    h += '<div class="tum-f"><label class="tum-lbl">Material</label>';
    h += '<select class="tum-in" onchange="TUM.q.revestimento.tipo=this.value;tumRecalc()">';
    [['granito','Granito'],['marmore','Mármore'],['porcelana','Porcelanato'],['ceramica','Cerâmica']].forEach(function(o){
      h += '<option value="'+o[0]+'"'+(rv.tipo===o[0]?' selected':'')+'>'+o[1]+'</option>';
    });
    h += '</select></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Área (m²)</label>' +
         '<input class="tum-in" type="number" step="0.01" value="'+(rv.m2||0)+'" onchange="TUM.q.revestimento.m2=+this.value;tumRecalc()"></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += _custoVendaInputs('revestimento','custo','venda', rv.custo, rv.venda, 'Custo/m² R$','Venda/m² R$');
    h += '</div>';
    var custoRev = (rv.m2||0)*rv.custo + (rv.preparo.on?rv.preparo.custo:0);
    var vendaRev = (rv.m2||0)*rv.venda + (rv.preparo.on?rv.preparo.venda:0);
    h += '<div style="margin-top:10px;">';
    h += '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin-bottom:8px;">';
    h += '<input type="checkbox"'+(rv.preparo.on?' checked':'')+' style="accent-color:var(--gold);" onchange="TUM.q.revestimento.preparo.on=this.checked;tumRecalc()">';
    h += '<span style="font-size:.72rem;color:var(--t2);">Incluir preparo de superfície</span></label>';
    if (rv.preparo.on) {
      h += '<div class="tum-grid2">';
      h += _custoVendaInputs('revestimento.preparo','custo','venda', rv.preparo.custo, rv.preparo.venda, 'Custo preparo R$','Venda preparo R$');
      h += '</div>';
    }
    h += '</div>';
    h += _miniResumo('Revestimento', custoRev, vendaRev);
    h += '</div>';
  }

  // ── ACABAMENTOS ──────────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">✨ Acabamentos Especiais</div>';
  h += '<div class="tum-peca-list">';
  Object.keys(TUM.ACAB_LABELS).forEach(function(k) {
    var item = q.acab[k]; if (!item) return;
    var label = TUM.ACAB_LABELS[k];
    var custo = (item.qty||0)*(item.custo||0);
    var venda = (item.qty||0)*(item.venda||0);
    h += _pecaRow(k, label, item.on,
      (item.qty||0)+' '+item.unid,
      item.on ? ('custo R$ '+fm(custo)+' · venda R$ '+fm(venda)) : '',
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Qtd ('+item.unid+')</label><input class="tum-in" type="number" step="0.01" min="0" value="'+(item.qty||0)+'" onchange="TUM.q.acab.'+k+'.qty=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Custo R$/'+item.unid+'</label><input class="tum-in" type="number" min="0" value="'+(item.custo||0)+'" onchange="TUM.q.acab.'+k+'.custo=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Venda R$/'+item.unid+'</label><input class="tum-in" type="number" min="0" value="'+(item.venda||0)+'" onchange="TUM.q.acab.'+k+'.venda=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogAcab');
  });
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'pedras\')">← Pedra</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'mdo\')">Mão de Obra →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA MÃO DE OBRA
// ══════════════════════════════════════════════════════════════════════
function _tumMdo() {
  var mdo = TUM.q.mdo;
  var h = '<div class="tum-sec">';
  h += '<div class="tum-sec-lbl">🔨 Equipe Marmorista</div>';
  h += '<div class="tum-peca-list">';

  // Marmorista e Ajudante — custo diária × dias
  ['marmorista','ajudante'].forEach(function(k) {
    var item = mdo[k];
    var dias = Math.ceil((item.horas||0)/8);
    var custo = dias * (item.diaria||0);
    h += _pecaRow(k, TUM.MDO_LABELS[k], item.on,
      item.horas+'h = '+dias+'d',
      'R$ '+fm(custo),
      '<div class="tum-grid2">' +
      '<div class="tum-f"><label class="tum-lbl">Horas trabalhadas</label><input class="tum-in" type="number" min="0" value="'+(item.horas||0)+'" onchange="TUM.q.mdo.'+k+'.horas=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Diária R$</label><input class="tum-in" type="number" min="0" value="'+(item.diaria||0)+'" onchange="TUM.q.mdo.'+k+'.diaria=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogMdo');
  });

  h += '<div class="tum-sec-lbl" style="margin-top:14px;margin-bottom:6px;">Serviços com custo × venda</div>';

  // Instalação, Acabamento, Montagem, Transporte — custo e venda separados
  ['instalacao','acabamento','montagem','transporte'].forEach(function(k) {
    var item = mdo[k];
    var lucro = (item.venda||0) - (item.custo||0);
    h += _pecaRow(k, TUM.MDO_LABELS[k], item.on,
      'custo R$ '+fm(item.custo||0),
      'venda R$ '+fm(item.venda||0),
      '<div class="tum-grid2">' +
      '<div class="tum-f"><label class="tum-lbl">Custo real R$</label><input class="tum-in" type="number" min="0" value="'+(item.custo||0)+'" onchange="TUM.q.mdo.'+k+'.custo=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Valor cobrado R$</label><input class="tum-in" type="number" min="0" value="'+(item.venda||0)+'" onchange="TUM.q.mdo.'+k+'.venda=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogMdo');
  });

  // Percentuais
  ['riscoQuebra','dificuldade'].forEach(function(k) {
    var item = mdo[k];
    h += _pecaRow(k, TUM.MDO_LABELS[k], item.on,
      (item.perc||0)+'%', '',
      '<div class="tum-grid2">' +
      '<div class="tum-f"><label class="tum-lbl">% sobre custo pedra</label><input class="tum-in" type="number" min="0" max="50" step="0.5" value="'+(item.perc||0)+'" onchange="TUM.q.mdo.'+k+'.perc=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogMdo');
  });

  h += '</div>';
  var r = TUM.calc;
  h += '<div class="tum-total-box">';
  h += _totalRow('Custo real MO',  'R$ '+fm(r.custoMdo||0), false);
  h += _totalRow('Valor venda MO', 'R$ '+fm(r.vendaMdo||0), true, 'grn');
  h += _totalRow('Lucro MO',       'R$ '+fm((r.vendaMdo||0)-(r.custoMdo||0)), false, 'gold');
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'extras\')">← Extras</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'obra\')">Construção →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA CONSTRUÇÃO
// ══════════════════════════════════════════════════════════════════════
function _tumObra() {
  var obra = TUM.q.obra;
  var h = '<div class="tum-sec">';
  h += '<div class="tum-sec-lbl">🧱 Serviços de Pedreiro</div>';
  h += '<div class="tum-peca-list">';

  Object.keys(TUM.OBRA_LABELS).forEach(function(k) {
    var item = obra[k]; if (!item) return;
    var vlr = (item.dias||0)*(item.diaria||350)*(item.equipe||1);
    h += _pecaRow(k, TUM.OBRA_LABELS[k], item.on,
      item.dias+'d × '+item.equipe+' pess.',
      'R$ '+fm(vlr),
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Dias</label><input class="tum-in" type="number" min="0" step="0.5" value="'+(item.dias||0)+'" onchange="TUM.q.obra.'+k+'.dias=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Diária R$</label><input class="tum-in" type="number" min="0" value="'+(item.diaria||350)+'" onchange="TUM.q.obra.'+k+'.diaria=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Equipe</label><input class="tum-in" type="number" min="1" value="'+(item.equipe||1)+'" onchange="TUM.q.obra.'+k+'.equipe=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogObra');
  });

  h += '</div>';
  var r = TUM.calc;
  h += '<div class="tum-total-box">';
  h += _totalRow('🧱 Total Construção', 'R$ '+fm(r.custoObra||0), true);
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'mdo\')">← Mão Obra</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'mat\')">Materiais →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA MATERIAIS
// ══════════════════════════════════════════════════════════════════════
function _tumMat() {
  var mat = TUM.q.mat;
  var h = '<div class="tum-sec">';
  h += '<div class="tum-info-box">💡 Quantidades estimadas automaticamente. Ajuste se necessário.</div>';
  h += '<div class="tum-sec-lbl">🪣 Materiais de Construção</div>';
  h += '<div class="tum-peca-list">';

  ['cimento','areia','brita','ferro','tijolos','blocos','massa','cola','rejunte'].forEach(function(k) {
    var item = mat[k]; if (!item) return;
    var vlr = (item.qty||0)*(item.preco||0);
    h += _pecaRow(k, TUM.MAT_LABELS[k], item.on,
      fm(item.qty)+' '+item.unid,
      'R$ '+fm(vlr),
      '<div class="tum-grid2">' +
      '<div class="tum-f"><label class="tum-lbl">Qtd ('+item.unid+')</label><input class="tum-in" type="number" min="0" step="0.1" value="'+(item.qty||0)+'" onchange="TUM.q.mat.'+k+'.qty=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Preço/'+item.unid+'</label><input class="tum-in" type="number" min="0" step="0.01" value="'+(item.preco||0)+'" onchange="TUM.q.mat.'+k+'.preco=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogMat');
  });

  ['agua','frete'].forEach(function(k) {
    var item = mat[k]; if (!item) return;
    h += _pecaRow(k, TUM.MAT_LABELS[k], item.on,
      '', 'R$ '+fm(item.vlr||0),
      '<div class="tum-grid2">' +
      '<div class="tum-f"><label class="tum-lbl">Valor R$</label><input class="tum-in" type="number" min="0" value="'+(item.vlr||0)+'" onchange="TUM.q.mat.'+k+'.vlr=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogMat');
  });

  h += '</div>';
  var r = TUM.calc;
  h += '<div class="tum-total-box">';
  h += _totalRow('🪣 Total Materiais', 'R$ '+fm(r.custoMat||0), true);
  h += '</div>';

  h += '<div class="tum-nav-row">';
  h += '<button class="btn btn-o" style="font-size:.7rem;" onclick="tumTab(\'obra\')">← Construção</button>';
  h += '<button class="btn btn-g" style="font-size:.7rem;" onclick="tumTab(\'resumo\')">Ver Resumo →</button>';
  h += '</div></div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// ABA RESUMO PROFISSIONAL — Custo Real × Valor Venda × Lucro
// ══════════════════════════════════════════════════════════════════════
function _tumResumo() {
  var q = TUM.q, r = TUM.calc;
  var tipo = TUM.TIPOS[q.tipo] || {};

  var h = '<div class="tum-sec">';

  // ── TABELA CUSTO × VENDA × LUCRO ──────────────────────────────
  h += '<div class="tum-sec-lbl">📊 Custo × Venda × Lucro por Categoria</div>';
  h += '<div class="tum-dre-table">';
  h += '<div class="tum-dre-head">';
  h += '<span>Categoria</span><span>Custo Real</span><span>Valor Venda</span><span>Lucro</span>';
  h += '</div>';

  var cats = [
    { icon:'💎', label:'Pedra',        custo: r.custoPedra,  venda: r.vendaPedra  },
    { icon:'✨', label:'Acabamentos',  custo: r.custoAcab,   venda: r.vendaAcab   },
    { icon:'📜', label:'Lápide',       custo: r.custoLapide, venda: r.vendaLapide },
    { icon:'✝️', label:'Cruz',         custo: r.custoCruz,   venda: r.vendaCruz   },
    { icon:'📷', label:'Foto Porc.',   custo: r.custoFoto,   venda: r.vendaFoto   },
    { icon:'🪟', label:'Revestimento', custo: r.custoRev,    venda: r.vendaRev    },
    { icon:'🔨', label:'Mão de Obra',  custo: r.custoMdo,    venda: r.vendaMdo    },
    { icon:'🧱', label:'Construção',   custo: r.custoObra,   venda: r.custoObra   },
    { icon:'🪣', label:'Materiais',    custo: r.custoMat,    venda: r.custoMat    },
  ];

  cats.forEach(function(cat) {
    if (!cat.custo && !cat.venda) return;
    var lucro = (cat.venda||0) - (cat.custo||0);
    var cor = lucro > 0 ? 'grn' : lucro < 0 ? 'red' : '';
    h += '<div class="tum-dre-row">';
    h += '<span style="font-size:.7rem;">' + cat.icon + ' ' + cat.label + '</span>';
    h += '<span style="color:var(--t2);">R$ ' + fm(cat.custo||0) + '</span>';
    h += '<span style="color:#4cda80;">R$ ' + fm(cat.venda||0) + '</span>';
    h += '<span style="color:' + (lucro>0?'#C9A84C':lucro<0?'#e07070':'var(--t3)') + ';">' +
         (lucro>0?'+ ':'') + 'R$ ' + fm(lucro) + '</span>';
    h += '</div>';
  });

  // Totais
  h += '<div class="tum-dre-total">';
  h += '<span>TOTAL</span>';
  h += '<span>R$ ' + fm(r.custoTotal) + '</span>';
  h += '<span style="color:#4cda80;">R$ ' + fm(r.vendaTotal) + '</span>';
  h += '<span style="color:#C9A84C;">R$ ' + fm(r.lucroTotal) + '</span>';
  h += '</div></div>';

  // ── MARGEM VISUAL ───────────────────────────────────────────────
  var margem = r.margemReal || 0;
  var margemCor = margem >= 30 ? '#4cda80' : margem >= 20 ? '#C9A84C' : '#e07070';
  var margemLabel = margem >= 30 ? 'Excelente ✅' : margem >= 20 ? 'Aceitável ⚠️' : 'Baixa 🔴';
  h += '<div style="background:var(--s3);border:1px solid var(--bd2);border-radius:14px;padding:14px;margin:12px 0;">';
  h += '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">';
  h += '<span style="font-size:.65rem;color:var(--t3);">Margem de lucro</span>';
  h += '<span style="font-size:.8rem;font-weight:700;color:'+margemCor+';">'+margem.toFixed(1)+'% — '+margemLabel+'</span>';
  h += '</div>';
  h += '<div style="background:rgba(255,255,255,.06);border-radius:6px;height:8px;">';
  h += '<div style="background:'+margemCor+';border-radius:6px;height:8px;width:'+Math.min(margem,100)+'%;transition:width .5s;"></div>';
  h += '</div></div>';

  // ── PRECIFICAÇÃO ────────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">💼 Ajuste de Preço</div>';
  h += '<div class="tum-prec-box">';
  h += '<div class="tum-grid2">';
  h += '<div class="tum-f"><label class="tum-lbl">Margem adicional (%)</label>' +
       '<input class="tum-in" type="number" min="0" max="200" value="'+(q.margem||0)+'" ' +
       'onchange="TUM.q.margem=+this.value;tumRecalc()"></div>';
  h += '<div class="tum-f"><label class="tum-lbl">Desconto R$</label>' +
       '<input class="tum-in" type="number" min="0" value="'+(q.desconto||0)+'" ' +
       'onchange="TUM.q.desconto=+this.value;tumRecalc()"></div>';
  h += '</div>';

  h += '<div class="tum-prec-breakdown">';
  h += '<div class="tum-prec-row"><span>Custo real total</span><span>R$ '+fm(r.custoTotal)+'</span></div>';
  h += '<div class="tum-prec-row"><span>Lucro embutido</span><span class="grn">+ R$ '+fm(r.lucroTotal)+'</span></div>';
  if (q.margem > 0) h += '<div class="tum-prec-row"><span>Margem adicional ('+q.margem+'%)</span><span class="grn">+ R$ '+fm(r.margemExtra)+'</span></div>';
  if (q.desconto > 0) h += '<div class="tum-prec-row"><span>Desconto</span><span class="red">− R$ '+fm(q.desconto)+'</span></div>';
  h += '<div class="tum-prec-final"><span>💰 VALOR FINAL</span><span>R$ '+fm(r.venda)+'</span></div>';
  h += '</div></div>';

  // ── CRONOGRAMA ──────────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📅 Cronograma</div>';
  h += '<div class="tum-crono">';
  var diasMdo=tipo.diasMdo||0, diasObra=tipo.diasObra||0, total=tipo.tempoTotal||(diasMdo+diasObra);
  h += '<div class="tum-crono-row">';
  if (diasObra) h += '<div class="tum-crono-item" style="flex:'+diasObra+'"><div class="tum-crono-bar tum-crono-obra"></div><div class="tum-crono-lbl">Construção<br>'+diasObra+' dias</div></div>';
  if (diasMdo)  h += '<div class="tum-crono-item" style="flex:'+diasMdo+'"><div class="tum-crono-bar tum-crono-mdo"></div><div class="tum-crono-lbl">Marmoraria<br>'+diasMdo+' dias</div></div>';
  h += '</div>';
  h += '<div class="tum-crono-total">⏱ Prazo estimado: <strong>'+total+' dias úteis</strong></div>';
  h += '</div>';

  // ── RESUMO TÉCNICO ──────────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📋 Resumo Técnico</div>';
  h += '<div class="tum-tech-box">';
  var sel = q.stoneId && CFG && CFG.stones ? CFG.stones.find(function(s){return s.id===q.stoneId;}) : null;
  h += _techRow('Tipo',       tipo.label||q.tipo);
  h += _techRow('Cliente',    q.cli||'—');
  if (q.falecido)  h += _techRow('Falecido',   q.falecido);
  if (q.cemiterio) h += _techRow('Cemitério',  q.cemiterio);
  if (q.quadra)    h += _techRow('Quadra/Lote',q.quadra);
  h += _techRow('Pedra',      sel?sel.nm+' (R$ '+fm(sel.pr)+'/m²)':'Não selecionada');
  h += _techRow('Dimensões',  q.dims.comp+'m × '+q.dims.larg+'m × '+q.dims.alt+'m');
  if (q.dims.gavetas>0) h += _techRow('Gavetas', q.dims.gavetas+' compart.');
  h += _techRow('Área c/ perda', fm(r.m2total||0)+' m²');
  if (q.lapide.on) h += _techRow('Lápide', q.lapide.tipo);
  if (q.cruz.on)   h += _techRow('Cruz',   q.cruz.tipo+' '+q.cruz.modelo);
  if (q.foto.on)   h += _techRow('Foto',   q.foto.tamanho+(q.foto.moldura?' c/ moldura':''));
  h += _techRow('Data', new Date().toLocaleDateString('pt-BR'));
  h += '</div>';

  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📝 Observações</div>';
  h += '<textarea class="tum-obs" rows="3" placeholder="Observações técnicas..." onchange="TUM.q.obs=this.value">'+(q.obs||'')+'</textarea>';

  h += '<div class="tum-action-btns">';
  h += '<button class="btn btn-g" onclick="tumSalvar()">💾 Salvar Orçamento</button>';
  h += '<button class="btn btn-o" onclick="tumNovo()">🆕 Novo Orçamento</button>';
  h += '</div>';
  h += '</div>';
  return h;
}

// ══════════════════════════════════════════════════════════════════════
// CÁLCULO PRINCIPAL
// ══════════════════════════════════════════════════════════════════════
function tumCalc() {
  var q=TUM.q, p=q.pedras, mdo=q.mdo, obra=q.obra, mat=q.mat;
  var sel = q.stoneId && CFG && CFG.stones ? CFG.stones.find(function(s){return s.id===q.stoneId;}) : null;
  var stPr = sel ? sel.pr : (q.stonePrice||0);

  // ── Pedra ──
  var m2Liq=0;
  ['tampa','detalhe','laterais','frontais','base','gavetas','sainha'].forEach(function(k){
    if(p[k]&&p[k].on) m2Liq+=(p[k].m2||0);
  });
  if(p.moldura&&p.moldura.on) m2Liq+=(p.moldura.ml||0)*0.12;
  if(p.pingadeira&&p.pingadeira.on) m2Liq+=(p.pingadeira.ml||0)*0.08;
  var m2Total = m2Liq*(1+(p.perda||15)/100);
  var custoPedra = m2Total*stPr;
  ['tampa','detalhe','laterais','frontais','base','gavetas','sainha'].forEach(function(k){
    if(p[k]&&p[k].on) custoPedra+=(p[k].extra||0);
  });
  if(p.moldura&&p.moldura.on) custoPedra+=(p.moldura.ml||0)*(p.moldura.vlrMl||120)-(p.moldura.ml||0)*0.12*stPr;
  if(p.pingadeira&&p.pingadeira.on) custoPedra+=(p.pingadeira.ml||0)*(p.pingadeira.vlrMl||80)-(p.pingadeira.ml||0)*0.08*stPr;
  if(p.recortes&&p.recortes.on) custoPedra+=(p.recortes.qty||0)*(p.recortes.vlrUn||80);
  // Pedra: a margem de venda é baseada no preço de venda cadastrado
  // O preço da pedra (stPr) já é preço de venda, então vendaPedra = custoPedra (calculado sobre preço de venda)
  var vendaPedra = custoPedra; // pedra: preço já é de venda (margem embutida no pr)

  // ── Acabamentos ──
  var custoAcab=0, vendaAcab=0;
  Object.keys(q.acab).forEach(function(k){
    var it=q.acab[k];
    if(it&&it.on){ custoAcab+=(it.qty||0)*(it.custo||0); vendaAcab+=(it.qty||0)*(it.venda||0); }
  });

  // ── Lápide ──
  var custoLapide=0, vendaLapide=0;
  if(q.lapide.on){
    custoLapide = q.lapide.custo + (q.lapide.linhas*q.lapide.custoPorLinha);
    vendaLapide = q.lapide.venda + (q.lapide.linhas*q.lapide.vendaPorLinha);
  }

  // ── Cruz ──
  var custoCruz=0, vendaCruz=0;
  if(q.cruz.on){ custoCruz=q.cruz.custo; vendaCruz=q.cruz.venda; }

  // ── Foto ──
  var custoFoto=0, vendaFoto=0;
  if(q.foto.on){
    custoFoto = q.foto.custo + (q.foto.moldura?q.foto.custoMoldura:0);
    vendaFoto = q.foto.venda + (q.foto.moldura?q.foto.vendaMoldura:0);
  }

  // ── Revestimento ──
  var custoRev=0, vendaRev=0;
  if(q.revestimento.on){
    custoRev = (q.revestimento.m2||0)*q.revestimento.custo + (q.revestimento.preparo.on?q.revestimento.preparo.custo:0);
    vendaRev = (q.revestimento.m2||0)*q.revestimento.venda + (q.revestimento.preparo.on?q.revestimento.preparo.venda:0);
  }

  // ── Mão de obra ──
  var custoMdo=0, vendaMdo=0;
  if(mdo.marmorista&&mdo.marmorista.on){ var d=Math.ceil((mdo.marmorista.horas||0)/8); custoMdo+=d*(mdo.marmorista.diaria||400); vendaMdo+=d*(mdo.marmorista.diaria||400); }
  if(mdo.ajudante&&mdo.ajudante.on)    { var d=Math.ceil((mdo.ajudante.horas||0)/8);   custoMdo+=d*(mdo.ajudante.diaria||220);   vendaMdo+=d*(mdo.ajudante.diaria||220); }
  ['instalacao','acabamento','montagem','transporte'].forEach(function(k){
    var it=mdo[k];
    if(it&&it.on){ custoMdo+=(it.custo||0); vendaMdo+=(it.venda||0); }
  });
  if(mdo.riscoQuebra&&mdo.riscoQuebra.on){ custoMdo+=custoPedra*(mdo.riscoQuebra.perc||0)/100; vendaMdo+=custoPedra*(mdo.riscoQuebra.perc||0)/100; }
  if(mdo.dificuldade&&mdo.dificuldade.on){ custoMdo+=custoPedra*(mdo.dificuldade.perc||0)/100; vendaMdo+=custoPedra*(mdo.dificuldade.perc||0)/100*1.3; }

  // ── Construção ──
  var custoObra=0;
  Object.keys(obra).forEach(function(k){ var it=obra[k]; if(it&&it.on) custoObra+=(it.dias||0)*(it.diaria||350)*(it.equipe||1); });

  // ── Materiais ──
  var custoMat=0;
  ['cimento','areia','brita','ferro','tijolos','blocos','massa','cola','rejunte'].forEach(function(k){
    var it=mat[k]; if(it&&it.on) custoMat+=(it.qty||0)*(it.preco||0);
  });
  if(mat.agua&&mat.agua.on) custoMat+=(mat.agua.vlr||0);
  if(mat.frete&&mat.frete.on) custoMat+=(mat.frete.vlr||0);

  // ── Totais ──
  var custoTotal = custoPedra + custoAcab + custoLapide + custoCruz + custoFoto + custoRev + custoMdo + custoObra + custoMat;
  var vendaTotal = vendaPedra + vendaAcab + vendaLapide + vendaCruz + vendaFoto + vendaRev + vendaMdo + custoObra + custoMat;
  var lucroTotal = vendaTotal - custoTotal;

  // Margem adicional e desconto
  var margemExtra = vendaTotal * (q.margem||0) / 100;
  var venda = vendaTotal + margemExtra - (q.desconto||0);
  var margemReal = venda > 0 ? ((venda - custoTotal) / venda * 100) : 0;

  return {
    m2total:m2Total, m2liq:m2Liq,
    custoPedra, vendaPedra,
    custoAcab, vendaAcab,
    custoLapide, vendaLapide,
    custoCruz, vendaCruz,
    custoFoto, vendaFoto,
    custoRev, vendaRev,
    custoMdo, vendaMdo,
    custoObra, custoMat,
    custoTotal, vendaTotal, lucroTotal,
    margemExtra, venda,
    margemReal
  };
}

// ══════════════════════════════════════════════════════════════════════
// AUTO CÁLCULO DE DIMENSÕES
// ══════════════════════════════════════════════════════════════════════
function tumAutoCalcDims() {
  var q=TUM.q, d=q.dims, p=q.pedras;
  var c=d.comp, l=d.larg, a=d.alt, g=d.gavetas||1;
  if(p.tampa)     p.tampa.m2    = roundM(c*l);
  if(p.detalhe)   p.detalhe.m2  = roundM((c+l)*2*0.10);
  if(p.laterais)  p.laterais.m2 = roundM(c*a*2);
  if(p.frontais)  p.frontais.m2 = roundM(l*a*2);
  if(p.base)      p.base.m2     = roundM(c*l);
  if(p.gavetas)   p.gavetas.m2  = roundM(l*(a/g)*g);
  if(p.sainha)    p.sainha.m2   = roundM((c+l)*2*0.15);
  if(p.moldura)   p.moldura.ml  = p.moldura.ml || roundM((c+l)*2);
  if(p.pingadeira)p.pingadeira.ml = p.pingadeira.ml || roundM((c+l)*2);
}

function tumAutoMatQty() {
  var q=TUM.q, d=q.dims, mat=q.mat;
  var vol=d.comp*d.larg;
  var m2Total=(TUM.calc&&TUM.calc.m2total)||(d.comp*d.larg*3);
  if(mat.cimento) mat.cimento.qty=Math.ceil(vol*5);
  if(mat.areia)   mat.areia.qty=Math.round(vol*0.04*100)/100;
  if(mat.cola)    mat.cola.qty=Math.ceil(m2Total/4);
  if(mat.rejunte) mat.rejunte.qty=Math.ceil(m2Total*0.5);
  if(mat.massa)   mat.massa.qty=Math.ceil(m2Total/8);
  var m2Parede=d.comp*d.alt*2+d.larg*d.alt*2;
  if(mat.tijolos) mat.tijolos.qty=Math.ceil(m2Parede*70);
  if(mat.blocos)  mat.blocos.qty=Math.ceil(m2Parede*15);
  if(mat.brita)   mat.brita.qty=Math.round(vol*0.02*100)/100;
  if(mat.ferro)   mat.ferro.qty=Math.ceil(m2Parede*2);
}

function roundM(v){ return Math.round(v*100)/100; }

// ══════════════════════════════════════════════════════════════════════
// HELPERS DE RENDER
// ══════════════════════════════════════════════════════════════════════
function _pecaRow(k, label, on, sub1, sub2, detailHtml, toggleFn) {
  var h = '<div class="tum-peca-row'+(on?'':' tum-peca-off')+'">';
  h += '<div class="tum-peca-header">';
  h += '<label class="tum-tog"><input type="checkbox"'+(on?' checked':'')+' onchange="'+(toggleFn||'tumTogPeca')+'(\''+k+'\',this.checked)"><span class="tum-tog-slider"></span></label>';
  h += '<div class="tum-peca-label">'+label+'</div>';
  if (on && (sub1||sub2)) {
    h += '<div class="tum-peca-val" style="font-size:.6rem;text-align:right;">';
    if(sub1) h += '<span style="color:var(--t3);">'+sub1+'</span>';
    if(sub1&&sub2) h += '<br>';
    if(sub2) h += '<span style="color:#4cda80;">'+sub2+'</span>';
    h += '</div>';
  }
  h += '</div>';
  if (on && detailHtml) h += '<div class="tum-peca-detail">'+detailHtml+'</div>';
  h += '</div>';
  return h;
}

function _extraSecHeader(label, key, on) {
  return '<div class="tum-extra-hd" onclick="TUM.q.'+key+'.on=!TUM.q.'+key+'.on;tumRecalc()">' +
    '<label class="tum-tog" onclick="event.stopPropagation()"><input type="checkbox"'+(on?' checked':'')+
    ' onchange="TUM.q.'+key+'.on=this.checked;tumRecalc()"><span class="tum-tog-slider"></span></label>' +
    '<span style="font-size:.8rem;font-weight:600;color:'+(on?'var(--gold2)':'var(--t2)')+';">'+label+'</span>' +
    '</div>';
}

function _custoVendaInputs(obj, custoKey, vendaKey, custoVal, vendaVal, labelC, labelV) {
  // obj can be 'lapide', 'cruz', 'foto', 'revestimento', or 'revestimento.preparo'
  var setter = function(key, field) {
    return 'TUM.q.'+obj+'.'+field+'=+this.value;tumRecalc()';
  };
  return '<div class="tum-f"><label class="tum-lbl">'+labelC+'</label>' +
    '<input class="tum-in" type="number" min="0" value="'+custoVal+'" onchange="TUM.q.'+obj+'.'+custoKey+'=+this.value;tumRecalc()"></div>' +
    '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">'+labelV+'</label>' +
    '<input class="tum-in" type="number" min="0" value="'+vendaVal+'" style="border-color:rgba(201,168,76,.3);" onchange="TUM.q.'+obj+'.'+vendaKey+'=+this.value;tumRecalc()"></div>';
}

function _miniResumo(label, custo, venda) {
  var lucro = venda - custo;
  var margem = venda > 0 ? (lucro/venda*100) : 0;
  return '<div style="display:flex;gap:8px;background:rgba(255,255,255,.03);border-radius:8px;padding:8px 10px;margin-top:8px;">' +
    '<div style="flex:1;text-align:center;"><div style="font-size:.52rem;color:var(--t4);">Custo</div><div style="font-size:.72rem;font-weight:700;color:var(--t2);">R$ '+fm(custo)+'</div></div>' +
    '<div style="flex:1;text-align:center;"><div style="font-size:.52rem;color:var(--t4);">Venda</div><div style="font-size:.72rem;font-weight:700;color:#4cda80;">R$ '+fm(venda)+'</div></div>' +
    '<div style="flex:1;text-align:center;"><div style="font-size:.52rem;color:var(--t4);">Lucro</div><div style="font-size:.72rem;font-weight:700;color:#C9A84C;">R$ '+fm(lucro)+' ('+margem.toFixed(0)+'%)</div></div>' +
    '</div>';
}

function _totalRow(label, val, bold, cor) {
  return '<div class="tum-total-row'+(bold?' tum-total-big':'')+'">' +
    '<span>'+label+'</span>' +
    '<span'+(cor?' style="color:'+(cor==='grn'?'#4cda80':cor==='gold'?'#C9A84C':'inherit')+'"':'')+'>'+val+'</span>' +
    '</div>';
}

function _tumInput(type, label, val, onchange, ph) {
  return '<div class="tum-f"><label class="tum-lbl">'+label+'</label>' +
    '<input class="tum-in" type="'+type+'" value="'+(val||'')+'" placeholder="'+(ph||'')+'" onchange="'+onchange+'"></div>';
}
function _tumDimInput(label, key, val, ph) {
  return '<div class="tum-f"><label class="tum-lbl">'+label+'</label>' +
    '<input class="tum-in" type="number" step="0.01" value="'+val+'" placeholder="'+ph+'" ' +
    'onchange="tumSetDim(\''+key+'\',+this.value)"></div>';
}
function _dpItem(label, val) {
  return '<div class="tum-dp-item"><span class="tum-dp-l">'+label+'</span><span class="tum-dp-v">'+val+'</span></div>';
}
function _techRow(l, v) {
  return '<div class="tum-tech-row"><span class="tum-tech-l">'+l+'</span><span class="tum-tech-v">'+v+'</span></div>';
}
function _togHtml(fn, k, checked) {
  return '<label class="tum-tog"><input type="checkbox"'+(checked?' checked':'')+
    ' onchange="'+fn+'(\''+k+'\',this.checked)"><span class="tum-tog-slider"></span></label>';
}

// ══════════════════════════════════════════════════════════════════════
// SETTERS / TOGGLES
// ══════════════════════════════════════════════════════════════════════
function tumSet(key, val)             { TUM.q[key] = val; }
function tumSetDim(key, val)          { TUM.q.dims[key]=val; tumAutoCalcDims(); tumRecalc(); }
function tumSetPeca(k, prop, val)     { TUM.q.pedras[k][prop]=val; tumRecalc(); }
function tumSetPecaML(k, val)         { TUM.q.pedras[k].ml=val; tumRecalc(); }
function tumTogPeca(k, on)            { TUM.q.pedras[k].on=on; tumRecalc(); }
function tumTogMdo(k, on)             { TUM.q.mdo[k].on=on; tumRecalc(); }
function tumTogObra(k, on)            { TUM.q.obra[k].on=on; tumRecalc(); }
function tumTogMat(k, on)             { TUM.q.mat[k].on=on; tumRecalc(); }
function tumTogAcab(k, on)            { TUM.q.acab[k].on=on; tumRecalc(); }

function tumRecalc() {
  tumAutoCalcDims();
  tumAutoMatQty();
  TUM.calc = tumCalc();
  _tumRenderTab();
  var hero = document.querySelector('.tum-hero-val');
  if (hero) hero.textContent = TUM.calc.venda > 0 ? 'R$ ' + fm(TUM.calc.venda) : '—';
  var heroLucro = document.querySelector('.tum-hero-lucro');
  if (heroLucro) heroLucro.textContent = TUM.calc.lucroTotal > 0 ?
    'lucro R$ ' + fm(TUM.calc.lucroTotal) + ' · ' + (TUM.calc.margemReal||0).toFixed(0) + '%' : '';
}

// ══════════════════════════════════════════════════════════════════════
// PRESET DE TIPO
// ══════════════════════════════════════════════════════════════════════
function tumSetTipo(t) {
  TUM.q.tipo = t;
  var preset = TUM.TIPOS[t];
  if (!preset) { renderTum(); return; }
  TUM.q.dims = Object.assign({}, preset.dims);
  Object.keys(TUM.q.pedras).forEach(function(k){ if(TUM.q.pedras[k]&&'on' in TUM.q.pedras[k]) TUM.q.pedras[k].on=false; });
  Object.keys(TUM.q.mdo).forEach(function(k){ if(TUM.q.mdo[k]) TUM.q.mdo[k].on=false; });
  Object.keys(TUM.q.obra).forEach(function(k){ if(TUM.q.obra[k]) TUM.q.obra[k].on=false; });
  Object.keys(TUM.q.mat).forEach(function(k){ if(TUM.q.mat[k]&&'on' in TUM.q.mat[k]) TUM.q.mat[k].on=false; });
  preset.pedras.forEach(function(k){ if(TUM.q.pedras[k]) TUM.q.pedras[k].on=true; });
  preset.mdo.forEach(function(k){ if(TUM.q.mdo[k]) TUM.q.mdo[k].on=true; });
  preset.obra.forEach(function(k){ if(TUM.q.obra[k]) TUM.q.obra[k].on=true; });
  preset.mat.forEach(function(k){ if(TUM.q.mat[k]&&'on' in TUM.q.mat[k]) TUM.q.mat[k].on=true; });
  if(preset.diasMdo){ TUM.q.mdo.marmorista.horas=preset.diasMdo*8; TUM.q.mdo.ajudante.horas=preset.diasMdo*8; }
  if(preset.diasObra){
    ['fundacao','levantamento','reboco','contraPiso','gavetas','concreto','acabOb'].forEach(function(k){
      if(TUM.q.obra[k]&&TUM.q.obra[k].on) TUM.q.obra[k].dias=Math.max(1,Math.round(preset.diasObra/3));
    });
  }
  tumAutoCalcDims(); tumAutoMatQty(); TUM.calc=tumCalc(); renderTum();
}

// ══════════════════════════════════════════════════════════════════════
// STONE PICKER
// ══════════════════════════════════════════════════════════════════════
function tumOpenStonePick() {
  if(!CFG||!CFG.stones){ toast('Configuração de pedras não encontrada'); return; }
  var h='<div class="tum-stone-pick">';
  CFG.stones.forEach(function(s){
    h+='<div class="tum-sp-row'+(TUM.q.stoneId===s.id?' on':'')+'" onclick="tumPickStone(\''+s.id+'\')">' +
      '<div class="tum-sp-nm">'+s.nm+'</div>' +
      '<div class="tum-sp-pr">R$ '+fm(s.pr)+'/m²</div>' +
      '</div>';
  });
  h+='</div>';
  var md=document.getElementById('tumStoneMd');
  if(md){ document.getElementById('tumStoneList').innerHTML=h; md.classList.add('on'); }
}

function tumPickStone(id) {
  TUM.q.stoneId=id;
  var sel=CFG.stones.find(function(s){return s.id===id;});
  if(sel) TUM.q.stonePrice=sel.pr;
  var md=document.getElementById('tumStoneMd');
  if(md) md.classList.remove('on');
  tumRecalc(); renderTum();
}

// ══════════════════════════════════════════════════════════════════════
// SALVAR / NOVO
// ══════════════════════════════════════════════════════════════════════
function tumSalvar() {
  var r=TUM.calc;
  if(!TUM.q.cli){ toast('Informe o cliente'); return; }
  var sel=TUM.q.stoneId&&CFG&&CFG.stones?CFG.stones.find(function(s){return s.id===TUM.q.stoneId;}):null;
  DB.q.unshift({
    id:Date.now(),
    tipo:'Túmulo — '+(TUM.TIPOS[TUM.q.tipo]?TUM.TIPOS[TUM.q.tipo].label:TUM.q.tipo),
    cli:TUM.q.cli, mat:sel?sel.nm:'Pedra',
    vista:r.venda, prazo:r.venda, ent:r.venda*0.5,
    custo:r.custoTotal, lucro:r.lucroTotal, margemReal:r.margemReal,
    obs:TUM.q.obs, tum:JSON.parse(JSON.stringify(TUM.q)),
    tumCalc:JSON.parse(JSON.stringify(r)), dt:td()
  });
  DB.sv();
  toast('✅ Orçamento de túmulo salvo!');
}

function tumNovo() {
  if(!confirm('Limpar orçamento atual?')) return;
  TUM.q.cli=''; TUM.q.falecido=''; TUM.q.cemiterio=''; TUM.q.quadra=''; TUM.q.obs='';
  TUM.q.stoneId=null; TUM.q.stonePrice=0;
  TUM.q.lapide.on=false; TUM.q.cruz.on=false; TUM.q.foto.on=false;
  TUM.q.revestimento.on=false;
  Object.keys(TUM.q.acab).forEach(function(k){ TUM.q.acab[k].on=false; });
  tumSetTipo('simples');
}

// ══════════════════════════════════════════════════════════════════════
// CSS ADICIONAL — Tabela DRE e Extras
// (Injeta estilos novos sem substituir os existentes)
// ══════════════════════════════════════════════════════════════════════
(function _injectTumCSS(){
  var s=document.createElement('style');
  s.textContent=`
    .tum-dre-table{background:var(--s3);border:1px solid var(--bd2);border-radius:14px;overflow:hidden;margin-bottom:12px;}
    .tum-dre-head{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;padding:8px 12px;background:rgba(201,168,76,.08);border-bottom:1px solid var(--bd2);}
    .tum-dre-head span{font-size:.52rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t4);font-weight:700;}
    .tum-dre-row{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;padding:9px 12px;border-bottom:1px solid rgba(255,255,255,.04);}
    .tum-dre-row span{font-size:.68rem;color:var(--t2);}
    .tum-dre-total{display:grid;grid-template-columns:1.6fr 1fr 1fr 1fr;padding:10px 12px;background:rgba(201,168,76,.06);border-top:1px solid rgba(201,168,76,.2);}
    .tum-dre-total span{font-size:.72rem;font-weight:700;color:var(--tx);}
    .tum-extra-hd{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--s3);border:1px solid var(--bd2);border-radius:12px;margin-bottom:6px;cursor:pointer;margin-top:10px;}
    .tum-extra-body{background:var(--s2);border:1px solid var(--bd2);border-radius:0 0 12px 12px;padding:14px;margin-top:-6px;margin-bottom:10px;}
  `;
  document.head.appendChild(s);
})();
