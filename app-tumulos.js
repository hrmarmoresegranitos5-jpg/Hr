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
      comp:          2.20,  // comprimento EXTERNO total (m)
      larg:          0.90,  // largura EXTERNA total (m)
      altEst:        0.40,  // altura da estrutura base interna (m)
      espParede:     0.15,  // espessura das paredes internas (m)
      espLaje:       0.10,  // espessura da laje (m)
      espTampa:      0.03,  // espessura da tampa de granito (m)
      // ── Rodapé e moldura ─────────────────────────────────────
      altRodape:     0.10,  // altura do rodapé/base externo (m)
      avRodape:      0.05,  // avanço lateral do rodapé por lado (m)
      espMolduraSup: 0.05,  // espessura da moldura superior (m)
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
      tampa:      { on: true,  m2: 0, extra: 0, desc: 'Tampa superior — comp × larg externos' },
      laterais:   { on: true,  m2: 0, extra: 0, desc: 'Laterais ×2 — comp útil × alt corpo' },
      frente:     { on: true,  m2: 0, extra: 0, desc: 'Frente — larg útil × alt corpo' },
      fundo:      { on: false, m2: 0, extra: 0, desc: 'Fundo — larg útil × alt corpo' },
      lapide:     { on: false, m2: 0, extra: 0, desc: 'Lápide gravada' },
      revestExt:  { on: false, m2: 0, extra: 0, desc: 'Revestimento externo' },
      rodape:     { on: false, m2: 0, extra: 0, desc: 'Rodapé externo (base)' },
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

    // ── LÁPIDE DUPLA ENGROSSADA ───────────────────────────────────
    // Duas pedras face a face com ferragem + concreto interno
    lapideDupla: {
      on:          false,
      tipo:        'dupla',   // 'simples' | 'dupla'
      larg:        1.70,      // largura (m)
      alt:         1.00,      // altura (m)
      espPedra:    0.04,      // espessura de CADA pedra (m)
      espTotal:    0.10,      // espessura total da lápide (m)
      bisote:      true,      // acabamento 45° nas 3 arestas visíveis
      mlBisote:    0,         // calculado: larg + alt×2
      ferragem:    true,      // ferro vergalhão interno
      kgFerro:     8,         // kg de vergalhão
      precoFerro:  14,        // R$/kg
      nFotos:      2,         // fotos em porcelana embutidas
      custoFoto:   85,        // custo por foto
      vendaFoto:   160,       // venda por foto
      nCruzes:     2,         // cruzes gravadas (custo zero se já na pedra)
      gravacao:    true,      // texto gravado (custo via acréscimo)
      custoExtra:  0,         // acréscimo manual (gravação, transporte, etc.)
      vendaExtra:  0,
    },

    // ── SISTEMA REBAIXO + LAJE VEDANTE ───────────────────────────
    // Rebaixo de encaixe na tampa + laje de concreto para vedação 100%
    rebaixoTampa: {
      on:           false,
      espRebaixo:   0.05,    // profundidade do rebaixo de encaixe (m)
      mlTotal:      0,       // perímetro calculado automaticamente
      custoUsinagem: 80,     // R$/ml de usinagem
      vendaUsinagem: 150,    // R$/ml de venda
    },

    lajeInterna: {
      on:      false,
      nLajes:  4,            // calculado pelo nº de tampas
      m2Total: 0,            // área calculada automaticamente
      espLaje: 0.08,         // espessura da laje (m)
      armacao: true,         // tela de armação
      custoM2: 120,          // R$/m² (material + MO)
      vendaM2: 200,          // R$/m²
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
    tampa:      'Tampo superior (comp × larg ext.)',
    laterais:   'Laterais ×2 (comp × alt corpo)',
    frente:     'Frontão / Frente (larg × alt)',
    fundo:      'Parede de fundo (larg × alt)',
    lapide:     'Lápide na pedra',
    revestExt:  'Revestimento externo total',
    rodape:     'Rodapé externo (base)',
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
// LÁPIDE DUPLA — DIAGRAMA DE CORTE TRANSVERSAL (SVG)
// ══════════════════════════════════════════════════════════════════════
function _lapDupSvg(ld) {
  var W = 220, H = 82;
  var px = 16, py = 10;
  var espF = Math.max(14, (ld.espPedra || 0.04) / (ld.espTotal || 0.10) * (W - 2*px));
  var espB = espF;
  var espI = Math.max(12, (W - 2*px) - espF - espB);
  var y1 = py, y2 = H - py;
  var x0 = px, x1 = x0 + espF, x2 = x1 + espI, x3 = x2 + espB;

  var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:76px;display:block;border-radius:8px;overflow:hidden;">';

  // Background
  s += '<rect width="' + W + '" height="' + H + '" fill="var(--s3,#18181f)"/>';

  // FRENTE — pedra visível (com fotos e gravações)
  s += '<rect x="' + x0 + '" y="' + y1 + '" width="' + espF + '" height="' + (y2-y1) + '" fill="rgba(201,168,76,.18)" stroke="#C9A84C" stroke-width="1.5"/>';
  // bisote 45° corner indicator
  s += '<polygon points="' + x0+',' + y1 + ' ' + (x0+6)+',' + y1 + ' ' + x0+','+(y1+6) + '" fill="#C9A84C" opacity=".8"/>';
  s += '<polygon points="' + x0+',' + y2 + ' ' + (x0+6)+',' + y2 + ' ' + x0+','+(y2-6) + '" fill="#C9A84C" opacity=".8"/>';
  s += '<text x="' + (x0+espF/2) + '" y="' + (H/2-2) + '" font-size="6.5" fill="#C9A84C" text-anchor="middle" font-family="Outfit,sans-serif" font-weight="700">FRENTE</text>';
  s += '<text x="' + (x0+espF/2) + '" y="' + (H/2+8) + '" font-size="5" fill="rgba(201,168,76,.6)" text-anchor="middle" font-family="Outfit,sans-serif">' + ((ld.espPedra||0.04)*100).toFixed(0) + 'cm</text>';
  // Icon: fotos indicator
  if ((ld.nFotos||0) > 0) {
    s += '<rect x="' + (x0+4) + '" y="' + (y1+4) + '" width="8" height="8" fill="none" stroke="rgba(201,168,76,.5)" stroke-width=".8" rx="1"/>';
    s += '<text x="' + (x0+8) + '" y="' + (y1+11) + '" font-size="5" fill="rgba(201,168,76,.7)" text-anchor="middle" font-family="Outfit,sans-serif">📷</text>';
  }

  // INTERNO — ferro + concreto
  s += '<rect x="' + x1 + '" y="' + y1 + '" width="' + espI + '" height="' + (y2-y1) + '" fill="rgba(74,128,181,.15)" stroke="rgba(74,128,181,.35)" stroke-width="1"/>';
  // Rods verticais
  var nRods = Math.max(2, Math.round(espI / 10));
  for (var ri = 0; ri < nRods; ri++) {
    var rx = x1 + (espI / (nRods+1)) * (ri+1);
    s += '<line x1="' + rx + '" y1="' + (y1+5) + '" x2="' + rx + '" y2="' + (y2-5) + '" stroke="#4a80b5" stroke-width="1.8" opacity=".7"/>';
  }
  // Estribos horizontais
  for (var ei = 0; ei < 2; ei++) {
    var ey = y1 + (y2-y1) * (0.3 + ei * 0.35);
    s += '<line x1="' + (x1+2) + '" y1="' + ey + '" x2="' + (x2-2) + '" y2="' + ey + '" stroke="rgba(74,128,181,.5)" stroke-width="1"/>';
  }
  s += '<text x="' + (x1+espI/2) + '" y="' + (H/2-2) + '" font-size="6" fill="#4a80b5" text-anchor="middle" font-family="Outfit,sans-serif" font-weight="700">FERRO</text>';
  s += '<text x="' + (x1+espI/2) + '" y="' + (H/2+7) + '" font-size="4.8" fill="rgba(74,128,181,.7)" text-anchor="middle" font-family="Outfit,sans-serif">+ concreto</text>';

  // FUNDO — pedra traseira
  s += '<rect x="' + x2 + '" y="' + y1 + '" width="' + espB + '" height="' + (y2-y1) + '" fill="rgba(160,140,100,.15)" stroke="rgba(160,140,100,.45)" stroke-width="1.5"/>';
  s += '<text x="' + (x2+espB/2) + '" y="' + (H/2-2) + '" font-size="6.5" fill="rgba(180,155,100,.9)" text-anchor="middle" font-family="Outfit,sans-serif" font-weight="700">FUNDO</text>';
  s += '<text x="' + (x2+espB/2) + '" y="' + (H/2+8) + '" font-size="5" fill="rgba(160,140,100,.6)" text-anchor="middle" font-family="Outfit,sans-serif">' + ((ld.espPedra||0.04)*100).toFixed(0) + 'cm</text>';

  // Cota total
  var cotaY = y2 + 6;
  s += '<line x1="' + x0 + '" y1="' + cotaY + '" x2="' + x3 + '" y2="' + cotaY + '" stroke="rgba(255,255,255,.2)" stroke-width=".7"/>';
  s += '<text x="' + ((x0+x3)/2) + '" y="' + (cotaY+8) + '" font-size="5.5" fill="rgba(255,255,255,.4)" text-anchor="middle" font-family="Outfit,sans-serif">' + ((ld.espTotal||0.10)*100).toFixed(0) + 'cm total</text>';

  // Label VISÍVEL e 45°
  if (ld.bisote) {
    s += '<text x="' + (x0-6) + '" y="' + (H/2+3) + '" font-size="5" fill="rgba(201,168,76,.7)" text-anchor="middle" font-family="Outfit,sans-serif">45°</text>';
  }

  s += '</svg>';
  return s;
}

// KPI card no hero
function _heroMetric(label, val, cor) {
  return '<div class="tum-hm">' +
    '<div class="tum-hm-lbl">' + label + '</div>' +
    '<div class="tum-hm-val" style="color:' + cor + '">' + val + '</div>' +
    '</div>';
}

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
  var r    = TUM.calc;
  var vf   = r.venda || 0;
  var ct   = r.custoTotal || 0;
  var lucro = r.lucroTotal || 0;
  var mg   = r.margemReal || 0;
  var tipo = TUM.TIPOS[TUM.q.tipoBase] || {};
  var d    = TUM.q.dims;
  var avRod = d.avRodape || 0;
  var cUtil = Math.max(0, +(d.comp - 2*avRod).toFixed(2));
  var lUtil = Math.max(0, +(d.larg - 2*avRod).toFixed(2));
  var mgCor = mg >= 30 ? '#4cda80' : mg >= 20 ? '#C9A84C' : '#e07070';

  var extra1 = (r.vendaLapDupla || 0) + (r.vendaRebaixo || 0) + (r.vendaLajeInt || 0)
             + (r.vendaLapide  || 0) + (r.vendaCruz    || 0) + (r.vendaFoto    || 0);
  var obra   = (r.custoEstrutura || 0) + (r.custoMat || 0);

  var h = '<div class="tum-hero">';
  h += '<div class="tum-hero-row">';
  h += '<div>';
  h += '<div class="tum-hero-title">⚰️ ' + (tipo.label || 'Orçamento de Túmulo') + '</div>';
  if (TUM.q.gavetas > 0) {
    h += '<div class="tum-hero-sub">' + TUM.q.gavetas + ' compartimento' + (TUM.q.gavetas > 1 ? 's' : '') +
      ' · ' + d.comp + '×' + d.larg + 'm ext';
    if (avRod > 0) h += ' · ' + cUtil + '×' + lUtil + 'm útil';
    h += '</div>';
  }
  h += '</div>';
  h += '<div style="text-align:right;">';
  h += '<div class="tum-hero-val">' + (vf > 0 ? 'R$\u00a0' + fm(vf) : '—') + '</div>';
  if (lucro > 0) h += '<div style="font-size:.62rem;color:#4cda80;margin-top:2px;">lucro R$ ' + fm(lucro) + ' · ' + mg.toFixed(0) + '%</div>';
  h += '</div></div>';

  // KPI bar (só quando há valores)
  if (ct > 0) {
    h += '<div class="tum-hero-kpi">';
    h += _heroMetric('💎 Pedra', 'R$ ' + fm(r.custoPedra || 0), 'var(--t2)');
    h += _heroMetric('🔨 MO', 'R$ ' + fm(r.vendaMdo || 0), 'var(--t2)');
    h += _heroMetric('🏛️ Extras', 'R$ ' + fm(extra1), '#C9A84C');
    h += _heroMetric('🏗️ Obra', 'R$ ' + fm(obra), 'var(--t2)');
    h += _heroMetric('📈 Margem', mg.toFixed(0) + '%', mgCor);
    h += '</div>';
  }
  h += '</div>';
  return h;
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

  // ── Dimensões externas ────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">📐 Dimensões Externas (m)</div>';
  h += '<div style="background:var(--s3);border:1px solid rgba(100,180,255,.15);border-radius:10px;padding:10px 13px;margin-bottom:10px;font-size:.63rem;color:var(--t3);line-height:1.6;">';
  h += '📏 Dimensões <b>externas totais</b> da estrutura. A área útil do corpo é calculada automaticamente após descontar o rodapé.';
  h += '</div>';
  h += '<div class="tum-grid3">';
  h += _tDim('Comprimento ext. (m)', 'comp',    q.dims.comp,    '2.20');
  h += _tDim('Largura ext. (m)',     'larg',    q.dims.larg,    '0.90');
  h += _tDim('Parede interna (m)',   'espParede',q.dims.espParede,'0.15');
  h += _tDim('Esp. Laje (m)',        'espLaje', q.dims.espLaje, '0.10');
  h += _tDim('Esp. Tampa (m)',       'espTampa',q.dims.espTampa,'0.03');
  h += '</div>';

  // ── Rodapé e moldura ──────────────────────────────────────────
  h += '<div class="tum-sec-lbl" style="margin-top:16px;">🏗️ Rodapé e Moldura</div>';
  h += '<div style="background:rgba(106,80,48,.1);border:1px solid rgba(138,96,64,.3);border-radius:10px;padding:10px 13px;margin-bottom:10px;font-size:.63rem;color:var(--t3);line-height:1.6;">';
  h += '🧱 O <b>rodapé</b> é a base mais larga que o corpo, projetando-se para fora. A <b>moldura superior</b> é o arremate no topo do corpo antes da tampa.';
  h += '</div>';
  h += '<div class="tum-grid3">';
  h += _tDim('Altura rodapé (m)',   'altRodape',    q.dims.altRodape    || 0.10, '0.10');
  h += _tDim('Avanço/lado (m)',     'avRodape',     q.dims.avRodape     || 0.05, '0.05');
  h += _tDim('Moldura sup. (m)',    'espMolduraSup',q.dims.espMolduraSup|| 0.05, '0.05');
  h += '</div>';

  // ── Resultado: externo × útil ─────────────────────────────────
  (function() {
    var avRod   = q.dims.avRodape     || 0;
    var altRod  = q.dims.altRodape    || 0;
    var espMolSup = q.dims.espMolduraSup || 0;
    var cUtil   = Math.max(0, q.dims.comp - 2 * avRod);
    var lUtil   = Math.max(0, q.dims.larg - 2 * avRod);
    var altCorpo = (q.gavetas * q.altPorGaveta) + q.dims.espLaje + espMolSup;
    var areaExt  = q.dims.comp * q.dims.larg;
    var areaUtil = cUtil * lUtil;

    h += '<div style="background:var(--s3);border:1px solid var(--bd2);border-radius:12px;overflow:hidden;margin-bottom:8px;">';
    // Header
    h += '<div style="background:rgba(201,168,76,.05);padding:9px 13px;border-bottom:1px solid var(--bd2);font-size:.54rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold3);font-weight:700;">📐 Resumo dimensional</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0;padding:0;">';
    // Externo
    h += '<div style="padding:11px 13px;border-right:1px solid var(--bd2);">';
    h += '<div style="font-size:.48rem;letter-spacing:1.5px;text-transform:uppercase;color:#a07050;margin-bottom:4px;">EXTERNO TOTAL</div>';
    h += '<div style="font-size:.9rem;font-weight:800;color:var(--t2);">' + q.dims.comp.toFixed(2) + ' × ' + q.dims.larg.toFixed(2) + '</div>';
    h += '<div style="font-size:.6rem;color:var(--t4);margin-top:2px;">' + areaExt.toFixed(3) + ' m²</div>';
    h += '</div>';
    // Útil
    h += '<div style="padding:11px 13px;">';
    h += '<div style="font-size:.48rem;letter-spacing:1.5px;text-transform:uppercase;color:#4a80b5;margin-bottom:4px;">CORPO ÚTIL</div>';
    h += '<div style="font-size:.9rem;font-weight:800;color:#4a80b5;">' + cUtil.toFixed(2) + ' × ' + lUtil.toFixed(2) + '</div>';
    h += '<div style="font-size:.6rem;color:var(--t4);margin-top:2px;">' + areaUtil.toFixed(3) + ' m²</div>';
    h += '</div>';
    h += '</div>';
    // Barra de diferença
    var perc = areaExt > 0 ? (areaUtil / areaExt * 100).toFixed(0) : 100;
    h += '<div style="padding:8px 13px;border-top:1px solid var(--bd2);background:rgba(255,255,255,.02);">';
    h += '<div style="display:flex;justify-content:space-between;margin-bottom:5px;">';
    h += '<span style="font-size:.58rem;color:var(--t4);">Utilização da área externa</span>';
    h += '<span style="font-size:.62rem;font-weight:700;color:#4a80b5;">' + perc + '%</span>';
    h += '</div>';
    h += '<div style="height:5px;background:var(--s4);border-radius:3px;">';
    h += '<div style="height:100%;background:linear-gradient(90deg,#4a80b5,#6aaad5);border-radius:3px;width:' + perc + '%;"></div>';
    h += '</div>';
    if (avRod > 0) {
      h += '<div style="font-size:.58rem;color:var(--t4);margin-top:5px;">Rodapé: ' + (avRod*100).toFixed(0) + 'cm/lado · Área do rodapé: ' + (areaExt - areaUtil).toFixed(3) + ' m²</div>';
    }
    if (altRod > 0) {
      h += '<div style="font-size:.58rem;color:var(--t4);">Altura corpo: ' + altCorpo.toFixed(2) + 'm · Rodapé: ' + altRod.toFixed(2) + 'm</div>';
    }
    h += '</div></div>';
  })();

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
  var altRod2    = q.dims.altRodape    || 0;
  var espMolSup2 = q.dims.espMolduraSup || 0;
  var altTotal = altRod2 + (q.gavetas * q.altPorGaveta) + q.dims.espLaje + espMolSup2 + q.dims.espTampa;
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

// Planta baixa SVG: externo vs corpo útil
function _planViewSvg(comp, larg, avRod) {
  var cUtil = Math.max(0.01, comp - 2 * avRod);
  var lUtil = Math.max(0.01, larg - 2 * avRod);
  var SVG_W = 200, SVG_H = 108;
  var padX = 18, padY = 14;
  var sc = Math.min((SVG_W - 2*padX) / comp, (SVG_H - 2*padY) / larg);
  var extW = comp * sc, extH = larg * sc;
  var avPx = avRod * sc;
  var ox = (SVG_W - extW) / 2, oy = (SVG_H - extH) / 2;
  var bx = ox + avPx, by = oy + avPx;
  var bw = extW - 2*avPx,    bh = extH - 2*avPx;

  var s = '<svg viewBox="0 0 ' + SVG_W + ' ' + SVG_H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:100px;display:block;">';

  // ── Rodapé zone (hatched corners) ──
  s += '<defs><pattern id="hatch" width="5" height="5" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">'
     + '<line x1="0" y1="0" x2="0" y2="5" stroke="rgba(160,100,48,.25)" stroke-width="2"/></pattern></defs>';

  // External rectangle (rodapé zone = hatched)
  s += '<rect x="' + ox.toFixed(1) + '" y="' + oy.toFixed(1) + '" width="' + extW.toFixed(1) + '" height="' + extH.toFixed(1) + '" fill="url(#hatch)" stroke="#8a6040" stroke-width="1.5" rx="2"/>';

  // Body rectangle (sólido azul)
  if (bw > 2 && bh > 2) {
    s += '<rect x="' + bx.toFixed(1) + '" y="' + by.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + bh.toFixed(1) + '" fill="rgba(74,128,181,.18)" stroke="#4a80b5" stroke-width="1.5" rx="1"/>';
  }

  // Cota externa (seta de largura)
  var arrowY = oy - 6;
  s += '<line x1="' + ox + '" y1="' + arrowY + '" x2="' + (ox + extW) + '" y2="' + arrowY + '" stroke="rgba(201,168,76,.6)" stroke-width=".8"/>';
  s += '<text x="' + (SVG_W/2) + '" y="' + (arrowY - 2) + '" font-size="5.5" fill="rgba(201,168,76,.8)" text-anchor="middle" font-family="Outfit,sans-serif">' + comp.toFixed(2) + 'm ext</text>';

  // Seta de avRod (mostra os 5cm de cada lado)
  if (avPx > 3) {
    var arY2 = oy + extH + 6;
    s += '<line x1="' + ox + '" y1="' + arY2 + '" x2="' + bx + '" y2="' + arY2 + '" stroke="#8a6040" stroke-width="1" marker-end="url(#arr)"/>';
    s += '<text x="' + (ox + avPx/2) + '" y="' + (arY2 + 7) + '" font-size="4.5" fill="#8a6040" text-anchor="middle" font-family="Outfit,sans-serif">' + (avRod*100).toFixed(0) + 'cm</text>';
    s += '<text x="' + (bx + bw + avPx/2) + '" y="' + (arY2 + 7) + '" font-size="4.5" fill="#8a6040" text-anchor="middle" font-family="Outfit,sans-serif">' + (avRod*100).toFixed(0) + 'cm</text>';
  }

  // Label útil no centro
  if (bw > 20 && bh > 14) {
    s += '<text x="' + (SVG_W/2) + '" y="' + (SVG_H/2 + 2.5) + '" font-size="7" fill="#4a80b5" text-anchor="middle" font-family="Outfit,sans-serif" font-weight="700">' + cUtil.toFixed(2) + ' × ' + lUtil.toFixed(2) + 'm</text>';
    s += '<text x="' + (SVG_W/2) + '" y="' + (SVG_H/2 + 10) + '" font-size="5" fill="rgba(74,128,181,.7)" text-anchor="middle" font-family="Outfit,sans-serif">corpo útil</text>';
  }

  s += '</svg>';
  return s;
}

// Visual de altura em camadas
function _alturaVisual(q) {
  var d       = q.dims;
  var avRod   = d.avRodape      || 0;
  var altRod  = d.altRodape     || 0;
  var espMolSup = d.espMolduraSup || 0;
  var altGavs = q.gavetas * q.altPorGaveta;
  var altLaje = d.espLaje;
  var altTampa = d.espTampa;
  var altCorpo = altGavs + altLaje + espMolSup;
  var altTotal = altRod + altCorpo + altTampa;
  var cUtil   = Math.max(0.01, d.comp - 2 * avRod);
  var lUtil   = Math.max(0.01, d.larg - 2 * avRod);

  if (altTotal <= 0) return '';

  function pct(v) { return (v / altTotal * 100).toFixed(1); }

  var h = '<div style="margin-top:12px;">';

  // ── Diagrama de altura ────────────────────────────────────────
  h += '<div style="font-size:.58rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t4);margin-bottom:6px;">Composição da altura</div>';
  h += '<div style="border-radius:8px;overflow:hidden;border:1px solid var(--bd2);">';

  var camadas = [
    { label: 'Tampa granito',             val: altTampa,  cor: '#C9A84C', opacity: '.9',  wide: false },
    { label: 'Moldura superior',          val: espMolSup, cor: '#8a7a5a', opacity: '.85', wide: false },
    { label: 'Laje de cobertura',         val: altLaje,   cor: '#555',    opacity: '.8',  wide: false },
  ];
  for (var gi = 0; gi < q.gavetas; gi++) {
    camadas.push({
      label: 'Gaveta ' + (q.gavetas - gi) + ' · ' + q.altPorGaveta.toFixed(2) + 'm',
      val: q.altPorGaveta, cor: '#4a80b5', opacity: '.72', wide: false,
    });
  }
  if (altRod > 0) {
    camadas.push({
      label: 'Rodapé externo (+' + (avRod*100).toFixed(0) + 'cm/lado)',
      val: altRod, cor: '#6a4828', opacity: '1', wide: true,
    });
  }

  camadas.forEach(function(c) {
    if (!c.val) return;
    var minH = Math.max(22, +pct(c.val) * 1.6);
    var borderTop = c.wide ? 'border-top:2px solid rgba(201,168,76,.25);' : '';
    var indent     = c.wide ? '' : 'margin:0 0px;';  // corpo indented visually via border-left
    var bodyBorder = !c.wide && altRod > 0 ? 'border-left:3px solid rgba(74,128,181,.4);' : '';
    h += '<div style="background:' + c.cor + ';opacity:' + c.opacity + ';padding:5px 10px;min-height:' + minH + 'px;' +
      'display:flex;align-items:center;justify-content:space-between;' + borderTop + bodyBorder + '">' +
      '<span style="font-size:.6rem;color:#fff;font-weight:600;">' + c.label + '</span>' +
      '<span style="font-size:.6rem;color:rgba(255,255,255,.8);">' + c.val.toFixed(2) + 'm</span>' +
      '</div>';
  });

  h += '</div>';
  h += '<div style="display:flex;justify-content:space-between;margin-top:4px;">';
  h += '<span style="font-size:.58rem;color:var(--t4);">Total: <b style="color:var(--gold2);">' + altTotal.toFixed(2) + ' m</b></span>';
  h += '<span style="font-size:.58rem;color:var(--t4);">Corpo: <b style="color:#4a80b5;">' + altCorpo.toFixed(2) + ' m</b></span>';
  h += '</div>';

  // ── Planta baixa: externo × útil ─────────────────────────────
  if (avRod > 0) {
    h += '<div style="margin-top:12px;">';
    h += '<div style="font-size:.58rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t4);margin-bottom:5px;">Planta — externo × corpo útil</div>';
    h += _planViewSvg(d.comp, d.larg, avRod);
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:6px;">';
    // Card externo
    h += '<div style="background:rgba(106,80,48,.12);border:1px solid rgba(138,96,64,.35);border-radius:8px;padding:8px 10px;">';
    h += '<div style="font-size:.48rem;letter-spacing:1.5px;text-transform:uppercase;color:#a07050;margin-bottom:3px;">EXTERNO (total)</div>';
    h += '<div style="font-size:.78rem;font-weight:800;color:var(--t2);">' + d.comp.toFixed(2) + ' × ' + d.larg.toFixed(2) + 'm</div>';
    h += '<div style="font-size:.56rem;color:var(--t4);margin-top:2px;">inclui rodapé (' + (avRod*100).toFixed(0) + 'cm/lado)</div>';
    h += '</div>';
    // Card útil
    h += '<div style="background:rgba(74,128,181,.1);border:1px dashed rgba(74,128,181,.5);border-radius:8px;padding:8px 10px;">';
    h += '<div style="font-size:.48rem;letter-spacing:1.5px;text-transform:uppercase;color:#4a80b5;margin-bottom:3px;">ÚTIL (corpo)</div>';
    h += '<div style="font-size:.78rem;font-weight:800;color:#4a80b5;">' + cUtil.toFixed(2) + ' × ' + lUtil.toFixed(2) + 'm</div>';
    h += '<div style="font-size:.56rem;color:var(--t4);margin-top:2px;">gautas e painéis de pedra</div>';
    h += '</div>';
    h += '</div></div>';
  }

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

    // Mostrar dimensões calculadas junto com a área
    var dimHint = '';
    if (!isML) {
      var d2 = TUM.q.dims;
      var hints = {
        tampa:    d2.comp && d2.larg ? '(' + d2.comp.toFixed(2) + '×' + d2.larg.toFixed(2) + ' m)' : '',
        laterais: d2._compUtil && d2._altCorpo ? '(' + d2._compUtil.toFixed(2) + '×' + d2._altCorpo.toFixed(2) + ' m×2)' : '',
        frente:   d2._largUtil && d2._altCorpo ? '(' + d2._largUtil.toFixed(2) + '×' + d2._altCorpo.toFixed(2) + ' m)' : '',
        fundo:    d2._largUtil && d2._altCorpo ? '(' + d2._largUtil.toFixed(2) + '×' + d2._altCorpo.toFixed(2) + ' m)' : '',
        rodape:   d2.comp && d2.larg ? '(perímetro ext.)' : '',
        revestExt:'(perímetro ext.)' ,
      };
      dimHint = hints[k] ? ' <span style="font-size:.55rem;color:var(--t4);">' + hints[k] + '</span>' : '';
    }
    var subA = isML ? fm(peca.ml || 0) + ' ml' : fm(m2) + ' m²' + dimHint;
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
    var avRodE   = q.dims.avRodape  || 0;
    var cUtilE   = Math.max(0, q.dims.comp - 2 * avRodE);
    var lUtilE   = Math.max(0, q.dims.larg - 2 * avRodE);
    var espMolE  = q.dims.espMolduraSup || 0;
    var altCorpoE = (q.gavetas * q.altPorGaveta) + q.dims.espLaje + espMolE;
    var altRodE   = q.dims.altRodape || 0;
    var altTotE   = altRodE + altCorpoE + q.dims.espTampa;
    h += '<div style="background:rgba(74,128,181,.08);border:1px solid rgba(74,128,181,.2);border-radius:10px;padding:10px 13px;margin-top:10px;">';
    h += '<div style="font-size:.6rem;color:#4a80b5;font-weight:700;margin-bottom:6px;">⬛ Base de cálculo automático</div>';
    h += '<div style="font-size:.62rem;color:var(--t3);line-height:1.7;">';
    h += '• Corpo útil: <b>' + cUtilE.toFixed(2) + ' × ' + lUtilE.toFixed(2) + 'm</b> (ext. ' + q.dims.comp + ' × ' + q.dims.larg + 'm − rodapé)<br>';
    h += '• Ferragem: +' + fm(q.gavetas * 15) + ' kg por gaveta<br>';
    h += '• Concreto: +' + fm(q.gavetas * 0.12) + ' m³ por gaveta<br>';
    h += '• Altura corpo: ' + altCorpoE.toFixed(2) + 'm · Rodapé: ' + altRodE.toFixed(2) + 'm<br>';
    h += '• Altura total: ' + altTotE.toFixed(2) + ' m';
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

  // ── LÁPIDE DUPLA ENGROSSADA ──────────────────────────────────
  var ld = q.lapideDupla || {};
  h += _extraHd('🏛️ Lápide Dupla Engrossada', 'lapideDupla', ld.on);
  if (ld.on) {
    h += '<div class="tum-extra-body">';
    // Diagrama de corte
    h += '<div style="margin-bottom:10px;">' + _lapDupSvg(ld) + '</div>';
    // Tipo + dimensões
    h += '<div class="tum-grid3">';
    h += '<div class="tum-f"><label class="tum-lbl">Largura (m)</label><input class="tum-in" type="number" step="0.01" min="0.5" value="' + (ld.larg||1.70) + '" onchange="TUM.q.lapideDupla.larg=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Altura (m)</label><input class="tum-in" type="number" step="0.01" min="0.3" value="' + (ld.alt||1.00) + '" onchange="TUM.q.lapideDupla.alt=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Esp. total (m)</label><input class="tum-in" type="number" step="0.01" value="' + (ld.espTotal||0.10) + '" onchange="TUM.q.lapideDupla.espTotal=+this.value;tumRecalc()"></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += '<div class="tum-f"><label class="tum-lbl">Tipo</label><select class="tum-in" onchange="TUM.q.lapideDupla.tipo=this.value;tumRecalc()">';
    h += '<option value="dupla"' + (ld.tipo==='dupla'?' selected':'') + '>Dupla (2 pedras + ferro + concreto)</option>';
    h += '<option value="simples"' + (ld.tipo==='simples'?' selected':'') + '>Simples (1 pedra)</option>';
    h += '</select></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Fotos em porcelana (un)</label><input class="tum-in" type="number" min="0" max="8" value="' + (ld.nFotos||0) + '" onchange="TUM.q.lapideDupla.nFotos=+this.value;tumRecalc()"></div>';
    h += '</div>';
    // Esp pedra
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += '<div class="tum-f"><label class="tum-lbl">Esp. cada pedra (m)</label><input class="tum-in" type="number" step="0.01" value="' + (ld.espPedra||0.04) + '" onchange="TUM.q.lapideDupla.espPedra=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Bisote 45° (ml auto)</label><div class="tum-in" style="background:var(--s3);color:var(--gold2);">' + fm(ld.mlBisote||0) + ' ml</div></div>';
    h += '</div>';
    // Checkboxes: bisote + ferragem
    h += '<div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:10px;">';
    h += '<label class="tum-ck-item"><input type="checkbox"' + (ld.bisote!==false?' checked':'') + ' style="accent-color:var(--gold);" onchange="TUM.q.lapideDupla.bisote=this.checked;tumRecalc()"><span>Acabamento 45° (3 arestas)</span></label>';
    h += '<label class="tum-ck-item"><input type="checkbox"' + (ld.ferragem!==false?' checked':'') + ' style="accent-color:var(--gold);" onchange="TUM.q.lapideDupla.ferragem=this.checked;tumRecalc()"><span>Ferragem interna</span></label>';
    h += '</div>';
    // Ferragem detail
    if (ld.ferragem !== false && ld.tipo === 'dupla') {
      h += '<div class="tum-grid2" style="margin-top:8px;">';
      h += '<div class="tum-f"><label class="tum-lbl">Vergalhão (kg)</label><input class="tum-in" type="number" step="0.5" value="' + (ld.kgFerro||8) + '" onchange="TUM.q.lapideDupla.kgFerro=+this.value;tumRecalc()"></div>';
      h += '<div class="tum-f"><label class="tum-lbl">Preço R$/kg</label><input class="tum-in" type="number" value="' + (ld.precoFerro||14) + '" onchange="TUM.q.lapideDupla.precoFerro=+this.value;tumRecalc()"></div>';
      h += '</div>';
    }
    // Fotos custo/venda
    if ((ld.nFotos||0) > 0) {
      h += '<div class="tum-grid2" style="margin-top:8px;">';
      h += '<div class="tum-f"><label class="tum-lbl">Custo foto R$</label><input class="tum-in" type="number" value="' + (ld.custoFoto||85) + '" onchange="TUM.q.lapideDupla.custoFoto=+this.value;tumRecalc()"></div>';
      h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Venda foto R$</label><input class="tum-in" type="number" value="' + (ld.vendaFoto||160) + '" onchange="TUM.q.lapideDupla.vendaFoto=+this.value;tumRecalc()"></div>';
      h += '</div>';
    }
    // Acréscimos manuais
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += '<div class="tum-f"><label class="tum-lbl">Acréscimo custo R$ (gravação etc.)</label><input class="tum-in" type="number" min="0" value="' + (ld.custoExtra||0) + '" onchange="TUM.q.lapideDupla.custoExtra=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Acréscimo venda R$</label><input class="tum-in" type="number" min="0" value="' + (ld.vendaExtra||0) + '" onchange="TUM.q.lapideDupla.vendaExtra=+this.value;tumRecalc()"></div>';
    h += '</div>';
    // Resumo m² e custo
    var r2 = TUM.calc;
    var m2Ld = _r((ld.larg||1.70) * (ld.alt||1.00));
    h += '<div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:9px;padding:9px 12px;margin-top:10px;font-size:.65rem;color:var(--t3);line-height:1.7;">';
    h += '📐 <b>' + m2Ld + ' m²/pedra</b> × ' + (ld.tipo==='dupla'?'2 pedras':'1 pedra') + ' = <b>' + _r(m2Ld*(ld.tipo==='dupla'?2:1)) + ' m² total</b>';
    if (ld.bisote) h += ' · Bisote: <b>' + fm(ld.mlBisote||0) + ' ml</b>';
    if (ld.ferragem && ld.tipo==='dupla') h += ' · Ferro: <b>' + (ld.kgFerro||8) + ' kg</b>';
    h += '</div>';
    if (r2.custoLapDupla > 0) h += _miniRes('Lápide Dupla', r2.custoLapDupla, r2.vendaLapDupla);
    h += '</div>';
  }

  // ── SISTEMA REBAIXO + LAJE VEDANTE ───────────────────────────
  var rt = q.rebaixoTampa || {};
  h += _extraHd('🔧 Rebaixo de Encaixe + Laje Vedante', 'rebaixoTampa', rt.on);
  if (rt.on) {
    h += '<div class="tum-extra-body">';
    // Diagrama explicativo
    h += '<div class="tum-laje-diagram">';
    h += '<div class="tum-ld-row tum-ld-tampa">🪨 Tampa de granito</div>';
    h += '<div class="tum-ld-row tum-ld-laje">🧱 Laje vedante de concreto</div>';
    h += '<div class="tum-ld-row tum-ld-rebaixo">◻ Moldura de encaixe ' + ((rt.espRebaixo||0.05)*100).toFixed(0) + 'cm</div>';
    h += '<div class="tum-ld-row tum-ld-caixao">⬛ Compartimento (caixão)</div>';
    h += '</div>';
    // Rebaixo inputs
    h += '<div class="tum-sec-lbl" style="margin-top:12px;">🔲 Rebaixo de Encaixe (usinagem)</div>';
    h += '<div class="tum-grid2">';
    h += '<div class="tum-f"><label class="tum-lbl">Profundidade do rebaixo (m)</label><input class="tum-in" type="number" step="0.005" value="' + (rt.espRebaixo||0.05) + '" onchange="TUM.q.rebaixoTampa.espRebaixo=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl">Total usinagem (ml — auto)</label><div class="tum-in" style="background:var(--s3);color:var(--gold2);cursor:default;">' + fm(rt.mlTotal||0) + ' ml</div></div>';
    h += '</div>';
    h += '<div class="tum-grid2" style="margin-top:8px;">';
    h += '<div class="tum-f"><label class="tum-lbl">Custo usinagem R$/ml</label><input class="tum-in" type="number" value="' + (rt.custoUsinagem||80) + '" onchange="TUM.q.rebaixoTampa.custoUsinagem=+this.value;tumRecalc()"></div>';
    h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Venda R$/ml</label><input class="tum-in" type="number" value="' + (rt.vendaUsinagem||150) + '" onchange="TUM.q.rebaixoTampa.vendaUsinagem=+this.value;tumRecalc()"></div>';
    h += '</div>';
    var r3 = TUM.calc;
    if (r3.vendaRebaixo > 0) h += _miniRes('Usinagem rebaixo', r3.custoRebaixo, r3.vendaRebaixo);

    // Laje interna
    var li = q.lajeInterna || {};
    h += '<div class="tum-sec-lbl" style="margin-top:14px;">🪨 Laje Vedante Interna</div>';
    h += '<div class="tum-extra-hd" style="border-radius:10px;margin-bottom:8px;">';
    h += '<label class="tum-tog" onclick="event.stopPropagation()"><input type="checkbox"' + (li.on?' checked':'') + ' onchange="TUM.q.lajeInterna.on=this.checked;tumRecalc()"><span class="tum-tog-slider"></span></label>';
    h += '<span style="font-size:.72rem;color:' + (li.on?'var(--gold2)':'var(--t3)') + ';font-weight:600;">Incluir ' + (li.nLajes||4) + ' lajes vedantes de concreto</span>';
    h += '</div>';
    if (li.on) {
      h += '<div class="tum-grid3">';
      h += '<div class="tum-f"><label class="tum-lbl">Nº de lajes (auto)</label><div class="tum-in" style="background:var(--s3);color:var(--gold2);cursor:default;">' + (li.nLajes||4) + '</div></div>';
      h += '<div class="tum-f"><label class="tum-lbl">Área total (m² — auto)</label><div class="tum-in" style="background:var(--s3);color:var(--gold2);cursor:default;">' + fm(li.m2Total||0) + ' m²</div></div>';
      h += '<div class="tum-f"><label class="tum-lbl">Espessura (m)</label><input class="tum-in" type="number" step="0.01" value="' + (li.espLaje||0.08) + '" onchange="TUM.q.lajeInterna.espLaje=+this.value;tumRecalc()"></div>';
      h += '</div>';
      h += '<div class="tum-grid2" style="margin-top:8px;">';
      h += '<div class="tum-f"><label class="tum-lbl">Custo R$/m²</label><input class="tum-in" type="number" value="' + (li.custoM2||120) + '" onchange="TUM.q.lajeInterna.custoM2=+this.value;tumRecalc()"></div>';
      h += '<div class="tum-f"><label class="tum-lbl" style="color:var(--gold);">Venda R$/m²</label><input class="tum-in" type="number" value="' + (li.vendaM2||200) + '" onchange="TUM.q.lajeInterna.vendaM2=+this.value;tumRecalc()"></div>';
      h += '</div>';
      if (r3.vendaLajeInt > 0) h += _miniRes('Lajes vedantes', r3.custoLajeInt, r3.vendaLajeInt);
    }
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
    { icon: '💎', label: 'Pedra',            custo: r.custoPedra,    venda: r.vendaPedra    },
    { icon: '🏛️', label: 'Lápide Dupla',     custo: r.custoLapDupla, venda: r.vendaLapDupla },
    { icon: '📜', label: 'Lápide simples',   custo: r.custoLapide,   venda: r.vendaLapide   },
    { icon: '✝️', label: 'Cruz',              custo: r.custoCruz,     venda: r.vendaCruz     },
    { icon: '📷', label: 'Foto',             custo: r.custoFoto,     venda: r.vendaFoto     },
    { icon: '🔧', label: 'Rebaixo (usinagem)',custo: r.custoRebaixo,  venda: r.vendaRebaixo  },
    { icon: '🪨', label: 'Laje vedante',     custo: r.custoLajeInt,  venda: r.vendaLajeInt  },
    { icon: '🔨', label: 'Mão de Obra',      custo: r.custoMdo,      venda: r.vendaMdo      },
    { icon: '🏗️', label: 'Estrutura civil',  custo: r.custoEstrutura,venda: r.custoEstrutura},
    { icon: '🪣', label: 'Materiais',        custo: r.custoMat,      venda: r.custoMat      },
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
  var avRodFT   = q.dims.avRodape     || 0;
  var altRodFT  = q.dims.altRodape    || 0;
  var espMolFT  = q.dims.espMolduraSup || 0;
  var cUtilFT   = Math.max(0, q.dims.comp - 2 * avRodFT);
  var lUtilFT   = Math.max(0, q.dims.larg - 2 * avRodFT);
  var altTotalFT = altRodFT + (q.gavetas * q.altPorGaveta) + q.dims.espLaje + espMolFT + q.dims.espTampa;
  h += _techR('Tipo',             tipo.label || q.tipoBase);
  h += _techR('Cliente',          q.cli || '—');
  if (q.falecido)  h += _techR('Falecido',     q.falecido);
  if (q.cemiterio) h += _techR('Cemitério',    q.cemiterio);
  if (q.quadra)    h += _techR('Quadra/Lote',  q.quadra);
  h += _techR('Pedra',            sel ? sel.nm + ' (R$ ' + fm(sel.pr) + '/m²)' : 'Não selecionada');
  h += _techR('Medida externa',   q.dims.comp + ' × ' + q.dims.larg + ' m');
  if (avRodFT > 0) {
    h += _techR('Rodapé',         altRodFT.toFixed(2) + 'm alt · ' + (avRodFT*100).toFixed(0) + 'cm avanço/lado');
    h += _techR('Corpo útil',     cUtilFT.toFixed(2) + ' × ' + lUtilFT.toFixed(2) + ' m');
  }
  h += _techR('Altura total',     altTotalFT.toFixed(2) + ' m');
  h += _techR('Gavetas',          q.gavetas + (q.gavetas === 0 ? ' (sem compartimento)' : ' compartimento' + (q.gavetas > 1 ? 's' : '')));
  h += _techR('Área c/ perda',    fm(r.m2Total || 0) + ' m²');
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

  // ── Lápide Dupla Engrossada ──────────────────────────────────────
  var custoLapDupla = 0, vendaLapDupla = 0;
  if (q.lapideDupla && q.lapideDupla.on) {
    var ld = q.lapideDupla;
    var m2LdUnit = ld.larg * ld.alt;
    var nPecasLd = ld.tipo === 'dupla' ? 2 : 1;
    // Pedra (usa preço da pedra selecionada; vendaPedra = custoPedra para pedra)
    var custoP_Ld = _r(m2LdUnit * nPecasLd * stPr);
    custoLapDupla += custoP_Ld;
    vendaLapDupla += custoP_Ld;
    // Bisote 45° nas 3 arestas (custo de acabamento por ml)
    if (ld.bisote) {
      var ml_Bis = ld.mlBisote || _r(ld.larg + ld.alt * 2);
      custoLapDupla += _r(ml_Bis * 40);   // ~R$40/ml custo
      vendaLapDupla += _r(ml_Bis * 40);   // margem via markup geral
    }
    // Ferragem interna (só se dupla)
    if (ld.ferragem && ld.tipo === 'dupla') {
      var cFerroLd = _r((ld.kgFerro || 8) * (ld.precoFerro || 14));
      custoLapDupla += cFerroLd;
      vendaLapDupla += _r(cFerroLd * 1.5);
    }
    // Fotos em porcelana embutidas
    if ((ld.nFotos || 0) > 0) {
      custoLapDupla += _r(ld.nFotos * (ld.custoFoto || 85));
      vendaLapDupla += _r(ld.nFotos * (ld.vendaFoto || 160));
    }
    // Acréscimos manuais (gravação, transporte, etc.)
    custoLapDupla += ld.custoExtra || 0;
    vendaLapDupla += ld.vendaExtra || 0;
  }

  // ── Rebaixo de Encaixe (usinagem nas tampas) ─────────────────────
  var custoRebaixo = 0, vendaRebaixo = 0;
  if (q.rebaixoTampa && q.rebaixoTampa.on && (q.rebaixoTampa.mlTotal || 0) > 0) {
    custoRebaixo = _r(q.rebaixoTampa.mlTotal * q.rebaixoTampa.custoUsinagem);
    vendaRebaixo = _r(q.rebaixoTampa.mlTotal * q.rebaixoTampa.vendaUsinagem);
  }

  // ── Laje Vedante Interna ──────────────────────────────────────────
  var custoLajeInt = 0, vendaLajeInt = 0;
  if (q.lajeInterna && q.lajeInterna.on && (q.lajeInterna.m2Total || 0) > 0) {
    custoLajeInt = _r(q.lajeInterna.m2Total * q.lajeInterna.custoM2);
    vendaLajeInt = _r(q.lajeInterna.m2Total * q.lajeInterna.vendaM2);
  }

  // ── Totais ───────────────────────────────────────────────────────
  var custoTotal = custoPedra + custoLapide + custoCruz + custoFoto + custoMdo + custoEstrutura + custoMat
                 + custoLapDupla + custoRebaixo + custoLajeInt;
  var vendaTotal = vendaPedra + vendaLapide + vendaCruz + vendaFoto + vendaMdo + custoEstrutura + custoMat
                 + vendaLapDupla + vendaRebaixo + vendaLajeInt;
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
    custoLapDupla, vendaLapDupla,
    custoRebaixo, vendaRebaixo,
    custoLajeInt, vendaLajeInt,
    m2LapDupla: q.lapideDupla && q.lapideDupla.on
      ? _r(q.lapideDupla.larg * q.lapideDupla.alt) : 0,
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
  var c   = d.comp;           // comprimento EXTERNO total
  var l   = d.larg;           // largura EXTERNA total
  var el  = d.espLaje;
  var et  = d.espTampa;
  var ag  = q.altPorGaveta;

  // ── RODAPÉ E MOLDURA ─────────────────────────────────────────
  var avRod    = d.avRodape      || 0;   // avanço lateral por lado (m)
  var altRod   = d.altRodape     || 0;   // altura do rodapé externo (m)
  var espMolSup = d.espMolduraSup || 0;  // moldura superior (m)

  // Dimensões ÚTEIS do corpo (externo − 2 × avanço)
  var cUtil = Math.max(0.01, _r(c - 2 * avRod));
  var lUtil = Math.max(0.01, _r(l - 2 * avRod));

  // Expõe dimensões para render e outros módulos
  d._compUtil   = cUtil;
  d._largUtil   = lUtil;
  d._altCorpo   = 0;    // será preenchido abaixo
  d._altTotal   = 0;

  // Atualiza altEst para compatibilidade (rodapé é a nova base)
  d.altEst = altRod > 0 ? altRod : 0.40;

  // Altura do CORPO (gavetas + laje + moldura superior)
  var altCorpo = _r(gav * ag + el + espMolSup);
  // Altura TOTAL (rodapé + corpo + tampa)
  var altTotal = _r(altRod + altCorpo + et);
  d._altCorpo = altCorpo;
  d._altTotal = altTotal;

  // ── PEÇAS DE PEDRA ────────────────────────────────────────────
  var p = q.pedras;

  // Tampa: assenta por cima de toda a estrutura → dimensões EXTERNAS (c × l)
  // Profissional: a tampa tem pelo menos comp × larg externos
  // (avança levemente além do rodapé para dar vedação e estética)
  if (p.tampa && !p.tampa._manual)
    p.tampa.m2 = _r(c * l);

  // Laterais: CORPO × altura do corpo × 2 lados (dimensões úteis)
  if (p.laterais && !p.laterais._manual)
    p.laterais.m2 = _r(cUtil * altCorpo * 2);

  // Frente do CORPO (largura útil)
  if (p.frente && !p.frente._manual)
    p.frente.m2 = _r(lUtil * altCorpo);

  // Fundo do CORPO (largura útil)
  if (p.fundo && !p.fundo._manual)
    p.fundo.m2 = _r(lUtil * altCorpo);

  // Rodapé externo: perímetro EXTERNO × altRodape
  if (p.rodape && !p.rodape._manual)
    p.rodape.m2 = altRod > 0 ? _r((c * 2 + l * 2) * altRod) : 0;

  // Revestimento externo: dimensões externas × altura total
  if (p.revestExt && !p.revestExt._manual)
    p.revestExt.m2 = _r((c * 2 + l * 2) * altTotal);

  // Lápide: padrão 0.60 × 0.40
  if (p.lapide && !p.lapide._manual)
    p.lapide.m2 = _r(0.60 * 0.40);

  // Moldura e pingadeira: perímetro do CORPO (útil)
  if (p.moldura && !p.moldura._ml_manual)
    p.moldura.ml = _r((cUtil + lUtil) * 2);
  if (p.pingadeira && !p.pingadeira._ml_manual)
    p.pingadeira.ml = _r((cUtil + lUtil) * 2);

  // ── ESTRUTURA CIVIL ───────────────────────────────────────────
  var est = q.estrutura;

  // Fundação usa área EXTERNA (inclui o rodapé)
  if (est.fundacao && !est.fundacao._manual)  est.fundacao.m3 = _r(c * l * 0.20);
  // Paredes e laje usam dimensões ÚTEIS do corpo
  if (est.paredes  && !est.paredes._manual)   est.paredes.m2  = _r((cUtil * 2 + lUtil * 2) * altCorpo);
  if (est.laje     && !est.laje._manual)      est.laje.m2     = _r(cUtil * lUtil);

  // Ferragem: por área útil + reforço por gaveta
  var kgBase = cUtil * lUtil * 8;
  if (est.reforco && !est.reforco._manual)
    est.reforco.kg = _r(kgBase + gav * 15);

  // Concreto armado (laje útil + volume das gavetas)
  if (est.concreto && !est.concreto._manual)
    est.concreto.m3 = _r(cUtil * lUtil * el + gav * 0.12);

  // ── MATERIAIS ─────────────────────────────────────────────────
  var mat = q.mat;
  var vol = cUtil * lUtil * altCorpo;  // volume do CORPO

  if (mat.cimento   && !mat.cimento._manual)   mat.cimento.qty   = Math.ceil(vol * 6);
  if (mat.areia     && !mat.areia._manual)     mat.areia.qty     = _r(vol * 0.06);
  if (mat.brita     && !mat.brita._manual)     mat.brita.qty     = _r(vol * 0.04);
  if (mat.argamassa && !mat.argamassa._manual) mat.argamassa.qty = Math.ceil(
    (cUtil * lUtil * 2 + cUtil * altCorpo * 2 + lUtil * altCorpo * 2) / 8
  );
  var m2Cola = (p.tampa    && p.tampa.on    ? p.tampa.m2    : 0) +
               (p.laterais && p.laterais.on ? p.laterais.m2 : 0) +
               (p.frente   && p.frente.on   ? p.frente.m2   : 0);
  if (mat.cola    && !mat.cola._manual)    mat.cola.qty    = Math.ceil(m2Cola);
  if (mat.rejunte && !mat.rejunte._manual) mat.rejunte.qty = _r(
    ((p.tampa    && p.tampa.on    ? p.tampa.m2    : 0) +
     (p.laterais && p.laterais.on ? p.laterais.m2 : 0)) * 0.5
  );
  if (mat.ferro && !mat.ferro._manual) mat.ferro.qty = _r(kgBase + gav * 15);

  // ── DIAS DE MÃO DE OBRA ───────────────────────────────────────
  var preset = TUM.TIPOS[q.tipoBase];
  if (preset) {
    var diasPed = (preset.diasPedreiro || 1) + gav;
    var diasMar = preset.diasMarmorista || 1;
    if (!q.mdo.pedreiro._manual)   { q.mdo.pedreiro.dias   = diasPed; }
    if (!q.mdo.ajudante._manual)   { q.mdo.ajudante.dias   = diasPed; }
    if (!q.mdo.marmorista._manual) { q.mdo.marmorista.dias = diasMar; }
  }

  // ── REBAIXO TAMPAS + LAJE INTERNA (auto) ─────────────────────
  var nCols = gav <= 2 ? gav : 2;
  var nRows = Math.ceil(Math.max(1, gav) / nCols);
  var gap   = 0.08;  // parede entre compartimentos (m)
  var opW   = Math.max(0.10, (cUtil - gap * (nCols - 1)) / nCols);
  var opH   = Math.max(0.10, (lUtil - gap * (nRows - 1)) / nRows);
  if (q.rebaixoTampa && !q.rebaixoTampa._manual) {
    q.rebaixoTampa.mlTotal = _r(Math.max(1, gav) * 2 * (opW + opH));
  }
  if (q.lajeInterna && !q.lajeInterna._manual) {
    q.lajeInterna.nLajes  = Math.max(1, gav);
    q.lajeInterna.m2Total = _r(Math.max(1, gav) * opW * opH);
  }
  // Lápide dupla: calcular ml de bisote automaticamente
  if (q.lapideDupla) {
    q.lapideDupla.mlBisote = _r(q.lapideDupla.larg + q.lapideDupla.alt * 2);
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
  // Limpa dimensões computadas cacheadas
  delete TUM.q.dims._compUtil;
  delete TUM.q.dims._largUtil;
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
    .tum-dre-table{background:var(--s2);border:1px solid var(--bd2);border-radius:14px;overflow:hidden;margin-bottom:12px;}
    .tum-dre-head{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr;padding:8px 13px;background:rgba(201,168,76,.07);border-bottom:1px solid var(--bd2);}
    .tum-dre-head span{font-size:.5rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t4);font-weight:700;}
    .tum-dre-row{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr;padding:9px 13px;border-bottom:1px solid rgba(255,255,255,.04);transition:background .15s;}
    .tum-dre-row:hover{background:rgba(255,255,255,.02);}
    .tum-dre-row span{font-size:.68rem;color:var(--t2);}
    .tum-dre-total{display:grid;grid-template-columns:1.8fr 1fr 1fr 1fr;padding:11px 13px;background:rgba(201,168,76,.06);border-top:1px solid rgba(201,168,76,.18);}
    .tum-dre-total span{font-size:.74rem;font-weight:700;color:var(--tx);}

    /* ── HERO ── */
    .tum-hero{background:linear-gradient(135deg,#0e0e14,#12100b);border-bottom:1px solid var(--bd);}
    .tum-hero-row{display:flex;justify-content:space-between;align-items:flex-start;padding:14px 16px 10px;}
    .tum-hero-title{font-size:.74rem;font-weight:700;color:var(--t2);}
    .tum-hero-sub{font-size:.6rem;color:var(--t4);margin-top:3px;line-height:1.5;}
    .tum-hero-val{font-family:'Cormorant Garamond',serif;font-size:1.7rem;font-weight:700;color:var(--gold2);line-height:1;}
    /* KPI bar */
    .tum-hero-kpi{display:grid;grid-template-columns:repeat(5,1fr);gap:1px;background:rgba(255,255,255,.05);border-top:1px solid rgba(255,255,255,.05);}
    .tum-hm{padding:7px 10px;background:var(--s1);}
    .tum-hm-lbl{font-size:.44rem;letter-spacing:1px;text-transform:uppercase;color:var(--t4);margin-bottom:2px;}
    .tum-hm-val{font-size:.7rem;font-weight:700;}

    /* ── TABS ── */
    .tum-tabs{display:flex;gap:0;overflow-x:auto;background:var(--s2);border-bottom:1px solid var(--bd);scrollbar-width:none;}
    .tum-tabs::-webkit-scrollbar{display:none;}
    .tum-tab{display:flex;flex-direction:column;align-items:center;gap:3px;padding:9px 11px;cursor:pointer;white-space:nowrap;font-size:.5rem;color:var(--t4);border-bottom:2.5px solid transparent;transition:color .15s,border-color .15s;}
    .tum-tab.on{color:var(--gold);border-bottom-color:var(--gold);background:rgba(201,168,76,.04);}
    .tum-tab span:first-child{font-size:.9rem;}

    /* ── SECTION LABELS ── */
    .tum-sec-lbl{
      font-size:.54rem;letter-spacing:1.8px;text-transform:uppercase;
      color:var(--gold3);font-weight:700;margin-bottom:8px;
      padding:0 0 6px 10px;
      border-left:3px solid var(--gold);
      border-bottom:1px solid rgba(201,168,76,.08);
    }

    /* ── EXTRAS ── */
    .tum-extra-hd{display:flex;align-items:center;gap:10px;padding:11px 14px;background:var(--s2);border:1px solid var(--bd2);border-radius:12px;margin-bottom:6px;cursor:pointer;margin-top:10px;transition:border-color .15s;}
    .tum-extra-hd:hover{border-color:rgba(201,168,76,.25);}
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

    /* ── WARN / INFO ── */
    .tum-warn{background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.3);border-radius:10px;padding:10px 13px;font-size:.68rem;color:var(--gold3);margin-bottom:10px;}
    .tum-info-box{background:rgba(100,180,255,.06);border:1px solid rgba(100,180,255,.15);border-radius:10px;padding:10px 13px;font-size:.65rem;color:var(--t3);margin-bottom:10px;line-height:1.6;}

    /* ── STONE PICK ── */
    .tum-stone-pick{display:flex;flex-direction:column;gap:4px;}
    .tum-sp-row{display:flex;justify-content:space-between;align-items:center;padding:10px 13px;background:var(--s2);border:1px solid var(--bd2);border-radius:10px;cursor:pointer;}
    .tum-sp-row.on{border-color:var(--gold);background:rgba(201,168,76,.08);}
    .tum-sp-nm{font-size:.76rem;font-weight:600;color:var(--t2);}
    .tum-sp-pr{font-size:.68rem;color:var(--gold2);}

    /* ── TOTALS ── */
    .tum-total-box{background:var(--s2);border:1px solid var(--bd2);border-radius:12px;overflow:hidden;margin-top:10px;border-top:2px solid rgba(201,168,76,.25);}
    .tum-total-row{display:flex;justify-content:space-between;padding:8px 13px;border-bottom:1px solid rgba(255,255,255,.04);font-size:.7rem;color:var(--t2);}
    .tum-total-big{background:rgba(201,168,76,.05);font-weight:700;font-size:.76rem;color:var(--tx);}

    /* ── TECH BOX ── */
    .tum-tech-box{background:var(--s2);border:1px solid var(--bd2);border-radius:12px;overflow:hidden;}
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
    .tum-tipo-card{background:var(--s3);border:1.5px solid var(--bd2);border-radius:12px;padding:10px;cursor:pointer;transition:all .15s;}
    .tum-tipo-card:hover{border-color:rgba(201,168,76,.3);}
    .tum-tipo-card.on{border-color:var(--gold);background:rgba(201,168,76,.07);box-shadow:0 0 12px rgba(201,168,76,.1);}
    .tum-tipo-icon{font-size:1.2rem;margin-bottom:4px;}
    .tum-tipo-label{font-size:.68rem;font-weight:700;color:var(--t2);margin-bottom:2px;}
    .tum-tipo-desc{font-size:.56rem;color:var(--t4);line-height:1.4;}

    /* ── PECA LIST ── */
    .tum-peca-list{display:flex;flex-direction:column;gap:5px;margin-bottom:8px;}
    .tum-peca-row{background:var(--s2);border:1px solid var(--bd2);border-radius:10px;overflow:hidden;transition:border-color .15s;}
    .tum-peca-row:has(input[type=checkbox]:checked){border-color:rgba(201,168,76,.2);}
    .tum-peca-off{opacity:.5;}
    .tum-peca-header{display:flex;align-items:center;gap:10px;padding:10px 12px;}
    .tum-peca-label{flex:1;font-size:.72rem;font-weight:600;color:var(--t2);}
    .tum-peca-val{flex-shrink:0;}
    .tum-peca-detail{padding:10px 12px;background:rgba(255,255,255,.02);border-top:1px solid rgba(255,255,255,.05);}

    /* ── TOGGLE ── */
    .tum-tog{position:relative;display:inline-block;width:34px;height:20px;flex-shrink:0;}
    .tum-tog input{opacity:0;width:0;height:0;}
    .tum-tog-slider{position:absolute;inset:0;background:var(--s4);border-radius:20px;transition:.2s;}
    .tum-tog-slider:before{content:"";position:absolute;width:14px;height:14px;left:3px;bottom:3px;background:#fff;border-radius:50%;transition:.2s;box-shadow:0 1px 3px rgba(0,0,0,.3);}
    .tum-tog input:checked+.tum-tog-slider{background:var(--gold);}
    .tum-tog input:checked+.tum-tog-slider:before{transform:translateX(14px);}

    /* ── CHECKBOX INLINE ── */
    .tum-ck-item{display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.65rem;color:var(--t3);}
    .tum-ck-item input{flex-shrink:0;}

    /* ── LAJE DIAGRAM ── */
    .tum-laje-diagram{border-radius:10px;overflow:hidden;border:1px solid var(--bd2);margin-bottom:10px;}
    .tum-ld-row{padding:8px 13px;font-size:.65rem;font-weight:600;display:flex;align-items:center;gap:8px;}
    .tum-ld-tampa{background:rgba(201,168,76,.12);color:var(--gold2);border-bottom:1px solid rgba(255,255,255,.06);}
    .tum-ld-laje{background:rgba(74,128,181,.1);color:#4a80b5;border-bottom:1px solid rgba(255,255,255,.06);}
    .tum-ld-rebaixo{background:rgba(76,218,128,.07);color:#4cda80;font-size:.58rem;border-bottom:1px solid rgba(255,255,255,.06);}
    .tum-ld-caixao{background:var(--s3);color:var(--t3);}

    /* ── MISC ── */
    .tum-sec{padding:14px 15px;}
    .tum-grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
    .tum-grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;}
    .tum-f{display:flex;flex-direction:column;gap:4px;}
    .tum-lbl{font-size:.54rem;letter-spacing:.5px;text-transform:uppercase;color:var(--t4);}
    .tum-in{background:var(--s3);border:1px solid var(--bd2);border-radius:8px;padding:9px 10px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.82rem;outline:none;width:100%;box-sizing:border-box;transition:border-color .15s;}
    .tum-in:focus{border-color:rgba(201,168,76,.4);}
    .tum-obs{width:100%;background:var(--s3);border:1px solid var(--bd2);border-radius:10px;padding:10px 12px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.78rem;outline:none;resize:vertical;box-sizing:border-box;}
    .tum-nav-row{display:flex;gap:8px;margin-top:16px;}
    .tum-action-btns{display:flex;gap:8px;margin-top:16px;}
  `;
  document.head.appendChild(s);
})();
