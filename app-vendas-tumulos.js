// ══════════════════════════════════════════════════════════════════════
// ETAPA 3 — ESTRATÉGIA INTELIGENTE DE VENDA
// HR Mármores e Granitos — Comparador Visual de Modelos
// Carrega APÓS app-tumulos.js e app-precif-tumulos.js
// ══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// DEFINIÇÃO DOS PACOTES
// ─────────────────────────────────────────────────────────────────────
var VT_PACOTES = {

  essencial: {
    key:       'essencial',
    nome:      'Essencial',
    subtitulo: 'Proteção e dignidade',
    desc:      'Solução completa e acessível, com pedra de qualidade e acabamento sólido.',
    tag:       null,
    tagCor:    null,
    cor:       '#605848',
    corBorda:  '#483830',
    corFundo:  'rgba(96,88,72,.08)',
    icon:      '⬛',
    tipo:      'simples',
    pedraKey:  'granito_simples',
    altura:    0.60,
    gavetas:   1,
    extras: [],
    features: {
      pedra:     { ok: true,  txt: 'Granito Simples'    },
      gavetas:   { ok: true,  txt: '1 gaveta'            },
      moldura:   { ok: false, txt: 'Sem moldura'         },
      lapide:    { ok: false, txt: 'Sem lápide'          },
      cruz:      { ok: false, txt: 'Sem cruz'            },
      foto:      { ok: false, txt: 'Sem foto'            },
      polimento: { ok: false, txt: 'Acabamento básico'   },
      resinagem: { ok: false, txt: 'Sem resinagem'       }
    },
    apply: function(q) {
      q.lapide.on      = false;
      q.cruz.on        = false;
      q.foto.on        = false;
      q.pedras.moldura.on    = false;
      q.acab.polimento.on    = false;
      q.acab.resinagem.on    = false;
      q.acab.bisote.on       = false;
    }
  },

  padrao: {
    key:       'padrao',
    nome:      'Padrão',
    subtitulo: 'Homenagem com qualidade',
    desc:      'O modelo mais escolhido. Alia resistência, beleza e conforto para a família.',
    tag:       'MAIS ESCOLHIDO',
    tagCor:    '#4a80b5',
    cor:       '#4a80b5',
    corBorda:  '#3a6090',
    corFundo:  'rgba(74,128,181,.1)',
    icon:      '🟫',
    tipo:      'gaveta_dupla',
    pedraKey:  'granito_padrao',
    altura:    1.20,
    gavetas:   2,
    extras: ['Moldura decorativa', 'Lápide gravada padrão'],
    features: {
      pedra:     { ok: true,  txt: 'Granito Padrão'        },
      gavetas:   { ok: true,  txt: '2 gavetas'              },
      moldura:   { ok: true,  txt: 'Moldura decorativa'     },
      lapide:    { ok: true,  txt: 'Lápide gravada'         },
      cruz:      { ok: false, txt: 'Sem cruz'               },
      foto:      { ok: false, txt: 'Sem foto'               },
      polimento: { ok: false, txt: 'Acabamento padrão'      },
      resinagem: { ok: false, txt: 'Sem resinagem'          }
    },
    apply: function(q) {
      q.lapide.on           = true;
      q.lapide.tipo         = 'padrao';
      q.cruz.on             = false;
      q.foto.on             = false;
      q.pedras.moldura.on   = true;
      q.acab.polimento.on   = false;
      q.acab.resinagem.on   = false;
      q.acab.bisote.on      = false;
    }
  },

  nobre: {
    key:       'nobre',
    nome:      'Nobre',
    subtitulo: 'Homenagem completa e eterna',
    desc:      'O mais completo. Cada detalhe foi pensado para honrar com dignidade e beleza duradoura.',
    tag:       'MELHOR QUALIDADE',
    tagCor:    '#C9A84C',
    cor:       '#C9A84C',
    corBorda:  '#a08030',
    corFundo:  'rgba(201,168,76,.1)',
    icon:      '💎',
    tipo:      'gaveta_tripla',
    pedraKey:  'granito_premium',
    altura:    1.80,
    gavetas:   3,
    extras: ['Moldura + Pingadeira', 'Lápide especial gravada', 'Cruz em granito', 'Foto porcelana', 'Polimento especial + Resinagem'],
    features: {
      pedra:     { ok: true, txt: 'Granito Premium'             },
      gavetas:   { ok: true, txt: '3 gavetas'                   },
      moldura:   { ok: true, txt: 'Moldura + Pingadeira'        },
      lapide:    { ok: true, txt: 'Lápide especial gravada'     },
      cruz:      { ok: true, txt: 'Cruz em granito'             },
      foto:      { ok: true, txt: 'Foto porcelana c/ moldura'   },
      polimento: { ok: true, txt: 'Polimento especial'          },
      resinagem: { ok: true, txt: 'Resina impermeabilizante'    }
    },
    apply: function(q) {
      q.lapide.on             = true;
      q.lapide.tipo           = 'personalizada';
      q.cruz.on               = true;
      q.foto.on               = true;
      q.foto.moldura          = true;
      q.pedras.moldura.on     = true;
      q.pedras.pingadeira.on  = true;
      q.acab.polimento.on     = true;
      q.acab.polimento.qty    = 1;
      q.acab.resinagem.on     = true;
      q.acab.resinagem.qty    = 1;
      q.acab.bisote.on        = false;
    }
  }
};

var VT_FEAT_LABELS = {
  pedra:     '🪨 Tipo de pedra',
  gavetas:   '⬜ Gavetas',
  moldura:   '▭ Moldura / Pingadeira',
  lapide:    '📜 Lápide',
  cruz:      '✝ Cruz',
  foto:      '📷 Foto porcelana',
  polimento: '✨ Polimento especial',
  resinagem: '💧 Resinagem'
};

// ─────────────────────────────────────────────────────────────────────
// SVG — ILUSTRAÇÃO VISUAL DO TÚMULO
// Cada pacote tem uma ilustração proporcional à altura real
// ─────────────────────────────────────────────────────────────────────
function _vtSvg(pacKey) {
  var pac = VT_PACOTES[pacKey];
  var gav = pac.gavetas;

  // Layout: viewBox fixo 100x230, túmulo ancorado na base
  // Alturas visuais: essencial=50, padrão=110, nobre=175
  var VBOX_H = 230;
  var BASE_Y = 210; // linha da base no SVG
  var bodyH  = pacKey === 'nobre' ? 175 : pacKey === 'padrao' ? 110 : 50;
  var bodyX  = 10, bodyW = 80;
  var topY   = BASE_Y - bodyH;

  // Cores por tipo de pedra
  var stoneGrad = pacKey === 'nobre'
    ? ['#7a6348','#5a4530','#6e5840']
    : pacKey === 'padrao'
    ? ['#606060','#484848','#565656']
    : ['#484848','#383838','#444444'];

  var accentColor = pac.cor;
  var borderW     = pacKey === 'nobre' ? 2.5 : pacKey === 'padrao' ? 1.8 : 1.2;
  var borderCol   = pacKey === 'nobre' ? '#C9A84C' : pacKey === 'padrao' ? '#5a7aaa' : '#504848';

  var s = '';
  s += '<svg viewBox="0 0 100 ' + VBOX_H + '" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-height:190px;display:block;">';

  // ── Sombra projetada na base ──
  s += '<ellipse cx="50" cy="' + (BASE_Y + 12) + '" rx="35" ry="5" fill="rgba(0,0,0,.35)"/>';

  // ── Base / Plinto ──
  s += '<rect x="8" y="' + BASE_Y + '" width="84" height="14" rx="2"';
  s += ' fill="#2a2018" stroke="#3a3020" stroke-width="1.5"/>';
  // detalhe de textura na base
  s += '<rect x="12" y="' + (BASE_Y + 3) + '" width="76" height="2" rx="1" fill="rgba(255,255,255,.06)"/>';

  // ── Corpo principal ──
  if (pacKey === 'nobre') {
    // Topo arqueado
    var archCtrlY = topY - 18;
    s += '<defs>'
      + '<linearGradient id="stG_n" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0%" stop-color="' + stoneGrad[0] + '"/>'
      + '<stop offset="50%" stop-color="' + stoneGrad[1] + '"/>'
      + '<stop offset="100%" stop-color="' + stoneGrad[2] + '"/>'
      + '</linearGradient></defs>';
    s += '<path d="M' + bodyX + ' ' + BASE_Y
       + ' L' + bodyX + ' ' + (topY + 14)
       + ' Q50 ' + archCtrlY + ' ' + (bodyX + bodyW) + ' ' + (topY + 14)
       + ' L' + (bodyX + bodyW) + ' ' + BASE_Y + ' Z"'
       + ' fill="url(#stG_n)" stroke="' + borderCol + '" stroke-width="' + borderW + '"/>';
    // Borda interna dourada (moldura)
    s += '<path d="M' + (bodyX+5) + ' ' + (BASE_Y - 6)
       + ' L' + (bodyX+5) + ' ' + (topY + 22)
       + ' Q50 ' + (archCtrlY + 8) + ' ' + (bodyX + bodyW - 5) + ' ' + (topY + 22)
       + ' L' + (bodyX + bodyW - 5) + ' ' + (BASE_Y - 6) + ' Z"'
       + ' fill="none" stroke="rgba(201,168,76,.35)" stroke-width="1.2"/>';
  } else {
    // Corpo retangular com coroa para padrão
    var crownH = pacKey === 'padrao' ? 10 : 0;
    s += '<defs>'
      + '<linearGradient id="stG_' + pacKey + '" x1="0" y1="0" x2="1" y2="1">'
      + '<stop offset="0%" stop-color="' + stoneGrad[0] + '"/>'
      + '<stop offset="60%" stop-color="' + stoneGrad[1] + '"/>'
      + '<stop offset="100%" stop-color="' + stoneGrad[2] + '"/>'
      + '</linearGradient></defs>';
    if (crownH > 0) {
      s += '<rect x="' + (bodyX - 4) + '" y="' + topY
         + '" width="' + (bodyW + 8) + '" height="' + crownH + '" rx="2"'
         + ' fill="#483828" stroke="' + borderCol + '" stroke-width="' + borderW + '"/>';
      topY += crownH;
    }
    s += '<rect x="' + bodyX + '" y="' + topY
       + '" width="' + bodyW + '" height="' + (BASE_Y - topY) + '" rx="1"'
       + ' fill="url(#stG_' + pacKey + ')" stroke="' + borderCol + '" stroke-width="' + borderW + '"/>';
  }

  // ── Textura de granito (pontos sutis) ──
  if (pacKey !== 'essencial') {
    for (var gi = 0; gi < 8; gi++) {
      var gx = bodyX + 6 + gi * 9 + (gi % 2) * 3;
      var gy = topY + 15 + (gi % 3) * 20;
      s += '<circle cx="' + gx + '" cy="' + gy + '" r="1.2" fill="rgba(255,255,255,.06)"/>';
    }
  }

  // ── Separadores de gavetas ──
  var segH = (BASE_Y - topY - (pacKey === 'nobre' ? 40 : 20)) / gav;
  for (var gi2 = 1; gi2 < gav; gi2++) {
    var sepY2 = topY + (pacKey === 'nobre' ? 40 : 20) + segH * gi2;
    s += '<line x1="' + (bodyX + 2) + '" y1="' + sepY2 + '" x2="' + (bodyX + bodyW - 2) + '" y2="' + sepY2 + '"'
       + ' stroke="rgba(0,0,0,.5)" stroke-width="2.5"/>';
    // Puxador metálico
    s += '<rect x="43" y="' + (sepY2 - 3.5) + '" width="14" height="7" rx="2"'
       + ' fill="rgba(0,0,0,.4)" stroke="rgba(255,255,255,.12)" stroke-width="1"/>';
    s += '<line x1="46" y1="' + sepY2 + '" x2="54" y2="' + sepY2 + '"'
       + ' stroke="rgba(255,255,255,.15)" stroke-width="1"/>';
  }

  // ── Lápide ──
  if (VT_PACOTES[pacKey].features.lapide.ok) {
    var lapY = topY + (pacKey === 'nobre' ? 46 : 24);
    s += '<rect x="20" y="' + lapY + '" width="60" height="30" rx="3"'
       + ' fill="rgba(255,255,255,.07)" stroke="rgba(255,255,255,.18)" stroke-width="1.2"/>';
    s += '<line x1="27" y1="' + (lapY + 9) + '" x2="73" y2="' + (lapY + 9) + '"'
       + ' stroke="rgba(255,255,255,.25)" stroke-width="1.5"/>';
    s += '<line x1="30" y1="' + (lapY + 16) + '" x2="70" y2="' + (lapY + 16) + '"'
       + ' stroke="rgba(255,255,255,.15)" stroke-width="1"/>';
    s += '<line x1="35" y1="' + (lapY + 22) + '" x2="65" y2="' + (lapY + 22) + '"'
       + ' stroke="rgba(255,255,255,.10)" stroke-width="1"/>';
  }

  // ── Foto porcelana (nobre) ──
  if (VT_PACOTES[pacKey].features.foto.ok) {
    var fotoY = BASE_Y - 45;
    s += '<rect x="62" y="' + fotoY + '" width="22" height="27" rx="2"'
       + ' fill="rgba(201,168,76,.15)" stroke="rgba(201,168,76,.5)" stroke-width="1.5"/>';
    s += '<circle cx="73" cy="' + (fotoY + 11) + '" r="7" fill="rgba(201,168,76,.2)" stroke="rgba(201,168,76,.4)" stroke-width="1"/>';
    s += '<circle cx="73" cy="' + (fotoY + 11) + '" r="4" fill="rgba(201,168,76,.3)"/>';
  }

  // ── Cruz (nobre) ──
  if (VT_PACOTES[pacKey].features.cruz.ok) {
    var crossBaseY = topY - 8;
    s += '<rect x="47" y="' + (crossBaseY - 26) + '" width="6" height="30" rx="2"'
       + ' fill="#C9A84C"/>';
    s += '<rect x="39" y="' + (crossBaseY - 20) + '" width="22" height="5" rx="2"'
       + ' fill="#C9A84C"/>';
    // Brilho
    s += '<rect x="48" y="' + (crossBaseY - 25) + '" width="2" height="8" rx="1"'
       + ' fill="rgba(255,255,255,.35)"/>';
  }

  // ── Moldura brilhante no topo (padrão e nobre) ──
  if (VT_PACOTES[pacKey].features.moldura.ok) {
    s += '<line x1="' + (bodyX + 4) + '" y1="' + (topY + 4) + '" x2="' + (bodyX + bodyW - 4) + '" y2="' + (topY + 4) + '"'
       + ' stroke="' + accentColor + '" stroke-width="1.5" opacity="0.6"/>';
    s += '<line x1="' + (bodyX + 4) + '" y1="' + (BASE_Y - 4) + '" x2="' + (bodyX + bodyW - 4) + '" y2="' + (BASE_Y - 4) + '"'
       + ' stroke="' + accentColor + '" stroke-width="1.5" opacity="0.6"/>';
    if (pacKey === 'nobre') {
      s += '<line x1="' + (bodyX + 4) + '" y1="' + (topY + 4) + '" x2="' + (bodyX + 4) + '" y2="' + (BASE_Y - 4) + '"'
         + ' stroke="' + accentColor + '" stroke-width="1.5" opacity="0.4"/>';
      s += '<line x1="' + (bodyX + bodyW - 4) + '" y1="' + (topY + 4) + '" x2="' + (bodyX + bodyW - 4) + '" y2="' + (BASE_Y - 4) + '"'
         + ' stroke="' + accentColor + '" stroke-width="1.5" opacity="0.4"/>';
    }
  }

  // ── Pingadeira (nobre) ──
  if (VT_PACOTES[pacKey].features.moldura.ok && pacKey === 'nobre') {
    s += '<rect x="' + (bodyX - 3) + '" y="' + (BASE_Y - 7) + '" width="' + (bodyW + 6) + '" height="4" rx="1"'
       + ' fill="' + accentColor + '" opacity="0.4"/>';
  }

  // ── Altura label ──
  var altStr = pac.altura.toFixed(2).replace('.', ',') + 'm';
  s += '<text x="97" y="' + (topY + (BASE_Y - topY) / 2) + '" font-size="6" fill="rgba(255,255,255,.25)"'
     + ' text-anchor="end" font-family="Outfit,sans-serif" writing-mode="tb">' + altStr + '</text>';

  s += '</svg>';
  return s;
}

// ─────────────────────────────────────────────────────────────────────
// CALCULAR PREÇO DO PACOTE (usa tumSimular se disponível)
// ─────────────────────────────────────────────────────────────────────
function _vtPreco(pacKey) {
  var pac = VT_PACOTES[pacKey];
  if (typeof tumSimular === 'function') {
    return tumSimular(pac.pedraKey, pac.tipo);
  }
  // Fallback simples
  return { vendaTotal: 0, custoTotal: 0, lucro: 0, m2: 0 };
}

// ─────────────────────────────────────────────────────────────────────
// APLICAR PACOTE AO ORÇAMENTO
// ─────────────────────────────────────────────────────────────────────
function vendasTumAplicar(pacKey) {
  var pac = VT_PACOTES[pacKey];
  if (!pac) return;

  // 1. Aplica preset de tipo (dimensões, itens habilitados)
  if (typeof tumSetTipo === 'function') {
    tumSetTipo(pac.tipo);
  }

  // 2. Define categoria de pedra
  TUM.q._tumPedraKey = pac.pedraKey;
  if (!TUM.q.stoneId) {
    if (typeof tumInitPrecos === 'function') tumInitPrecos();
    var tp = (typeof CFG !== 'undefined' && CFG.tumPrecos) ? CFG.tumPrecos : null;
    if (tp && tp.pedras[pac.pedraKey]) TUM.q.stonePrice = tp.pedras[pac.pedraKey].preco;
  }

  // 3. Liga/desliga lápide, cruz, foto, moldura, acabamentos
  pac.apply(TUM.q);

  // 4. Aplica tabela de preços (Etapa 2) se disponível
  if (typeof tumAplicarTabela === 'function') {
    tumAplicarTabela({ pedraKey: pac.pedraKey, forceAcab: true });
  }

  // 5. Recalcula e renderiza
  if (typeof tumRecalc === 'function') tumRecalc();

  // 6. Fecha modal e vai para o orçamento
  if (typeof closeAll === 'function') closeAll();
  if (typeof go === 'function') go(9);

  if (typeof toast === 'function') {
    toast('✅ Modelo ' + pac.nome + ' aplicado ao orçamento!');
  }
}

// ─────────────────────────────────────────────────────────────────────
// UPSELL COPY — mensagem de diferença entre pacotes
// ─────────────────────────────────────────────────────────────────────
function _vtUpsellMsg(fromKey, toKey) {
  var from = _vtPreco(fromKey);
  var to   = _vtPreco(toKey);
  var diff = to.vendaTotal - from.vendaTotal;
  if (diff <= 0 || !from.vendaTotal) return '';

  var toExtras = VT_PACOTES[toKey].extras;
  var extras = toExtras.length ? toExtras.join(' · ') : '';

  return '<div class="vt-upsell">'
    + '<div class="vt-upsell-plus">+ R$ ' + (typeof fm === 'function' ? fm(diff) : diff.toFixed(2)) + '</div>'
    + '<div class="vt-upsell-txt">e você adiciona: <strong>' + extras + '</strong></div>'
    + '</div>';
}

// ─────────────────────────────────────────────────────────────────────
// RENDER — CARD DE CADA PACOTE
// ─────────────────────────────────────────────────────────────────────
function _vtCard(pacKey, precos) {
  var pac = VT_PACOTES[pacKey];
  var preco = precos[pacKey];
  var isDestaque = !!pac.tag;

  var h = '<div class="vt-card' + (isDestaque ? ' vt-card-dest' : '') + '" style="--pac-cor:' + pac.cor + ';--pac-borda:' + pac.corBorda + ';">';

  // ── Tag ──
  if (pac.tag) {
    h += '<div class="vt-tag" style="background:' + pac.tagCor + ';">' + pac.tag + '</div>';
  }

  // ── Cabeçalho ──
  h += '<div class="vt-card-hd">';
  h += '<div class="vt-card-icon">' + pac.icon + '</div>';
  h += '<div class="vt-card-nm">' + pac.nome + '</div>';
  h += '<div class="vt-card-sub">' + pac.subtitulo + '</div>';
  h += '</div>';

  // ── Ilustração SVG ──
  h += '<div class="vt-svg-wrap">' + _vtSvg(pacKey) + '</div>';

  // ── Preço ──
  h += '<div class="vt-price-box">';
  if (preco.vendaTotal > 0) {
    h += '<div class="vt-price-lbl">a partir de</div>';
    h += '<div class="vt-price">R$ ' + (typeof fm === 'function' ? fm(preco.vendaTotal) : preco.vendaTotal.toFixed(0)) + '</div>';
    h += '<div class="vt-price-area">' + preco.m2 + ' m² · ' + pac.gavetas + (pac.gavetas > 1 ? ' gavetas' : ' gaveta') + '</div>';
  } else {
    h += '<div class="vt-price" style="font-size:.8rem;color:var(--t3);">Consulte preços</div>';
  }
  h += '</div>';

  // ── Lista de features ──
  h += '<div class="vt-feat-list">';
  Object.keys(pac.features).forEach(function(fk) {
    var feat = pac.features[fk];
    h += '<div class="vt-feat' + (feat.ok ? ' on' : '') + '">';
    h += '<span class="vt-feat-ico">' + (feat.ok ? '✓' : '—') + '</span>';
    h += '<span class="vt-feat-txt">' + feat.txt + '</span>';
    h += '</div>';
  });
  h += '</div>';

  // ── Descrição ──
  h += '<div class="vt-card-desc">' + pac.desc + '</div>';

  // ── CTA ──
  h += '<button class="vt-cta' + (isDestaque ? ' vt-cta-dest' : '') + '" onclick="vendasTumAplicar(\'' + pacKey + '\')">';
  h += 'Usar este modelo →';
  h += '</button>';

  h += '</div>';
  return h;
}

// ─────────────────────────────────────────────────────────────────────
// RENDER — TABELA COMPARATIVA COMPLETA
// ─────────────────────────────────────────────────────────────────────
function _vtTabela(precos) {
  var keys = ['essencial', 'padrao', 'nobre'];
  var h = '<div class="vt-tbl-wrap">';
  h += '<div class="vt-tbl-title">📊 Comparação completa</div>';
  h += '<div class="vt-tbl">';

  // Header
  h += '<div class="vt-tbl-head">';
  h += '<div class="vt-th-nm">Recurso</div>';
  keys.forEach(function(k) {
    var p = VT_PACOTES[k];
    h += '<div class="vt-th" style="color:' + p.cor + ';">'
       + p.icon + '<br>' + p.nome + '</div>';
  });
  h += '</div>';

  // Rows
  Object.keys(VT_FEAT_LABELS).forEach(function(fk) {
    h += '<div class="vt-tbl-row">';
    h += '<div class="vt-td-nm">' + VT_FEAT_LABELS[fk] + '</div>';
    keys.forEach(function(k) {
      var feat = VT_PACOTES[k].features[fk];
      h += '<div class="vt-td' + (feat.ok ? ' ok' : ' no') + '">'
         + (feat.ok ? '<span class="vt-td-ck">✓</span>' : '<span class="vt-td-x">—</span>')
         + '</div>';
    });
    h += '</div>';
  });

  // Preço row
  h += '<div class="vt-tbl-row vt-tbl-price-row">';
  h += '<div class="vt-td-nm">💰 Preço estimado</div>';
  keys.forEach(function(k) {
    var pr = precos[k];
    h += '<div class="vt-td" style="text-align:center;">';
    if (pr.vendaTotal > 0) {
      h += '<span style="font-size:.72rem;font-weight:700;color:' + VT_PACOTES[k].cor + ';">'
         + 'R$ ' + (typeof fm === 'function' ? fm(pr.vendaTotal) : pr.vendaTotal.toFixed(0))
         + '</span>';
    } else {
      h += '<span style="font-size:.65rem;color:var(--t3);">—</span>';
    }
    h += '</div>';
  });
  h += '</div>';

  h += '</div></div>';
  return h;
}

// ─────────────────────────────────────────────────────────────────────
// RENDER — SEÇÃO DE UPSELL
// ─────────────────────────────────────────────────────────────────────
function _vtUpsellSection(precos) {
  var pe = precos['essencial'].vendaTotal;
  var pp = precos['padrao'].vendaTotal;
  var pn = precos['nobre'].vendaTotal;
  if (!pe || !pp || !pn) return '';

  var h = '<div class="vt-upsell-section">';
  h += '<div class="vt-upsell-title">💡 Por quanto a mais você tem muito mais?</div>';

  // Essencial → Padrão
  h += '<div class="vt-upsell-item">';
  h += '<div class="vt-ui-from">⬛ Essencial → <strong style="color:#4a80b5;">🟫 Padrão</strong></div>';
  h += '<div class="vt-ui-diff">+'
     + (typeof fm === 'function' ? fm(pp - pe) : (pp - pe).toFixed(0))
     + '</div>';
  h += '</div>';
  h += '<div class="vt-ui-extras">';
  VT_PACOTES.padrao.extras.forEach(function(e) {
    h += '<span class="vt-ui-tag">+ ' + e + '</span>';
  });
  h += '</div>';

  // Padrão → Nobre
  h += '<div class="vt-upsell-item" style="margin-top:10px;">';
  h += '<div class="vt-ui-from">🟫 Padrão → <strong style="color:#C9A84C;">💎 Nobre</strong></div>';
  h += '<div class="vt-ui-diff" style="color:#C9A84C;">+'
     + (typeof fm === 'function' ? fm(pn - pp) : (pn - pp).toFixed(0))
     + '</div>';
  h += '</div>';
  h += '<div class="vt-ui-extras">';
  VT_PACOTES.nobre.extras.forEach(function(e) {
    h += '<span class="vt-ui-tag" style="border-color:rgba(201,168,76,.3);color:var(--gold3);">+ ' + e + '</span>';
  });
  h += '</div>';

  h += '</div>';
  return h;
}

// ─────────────────────────────────────────────────────────────────────
// RENDER — MODAL PRINCIPAL
// ─────────────────────────────────────────────────────────────────────
function vtRender() {
  var precos = {
    essencial: _vtPreco('essencial'),
    padrao:    _vtPreco('padrao'),
    nobre:     _vtPreco('nobre')
  };

  var h = '';

  // ── Hero ──
  h += '<div class="vt-hero">';
  h += '<div class="vt-hero-tag">ESTRATÉGIA DE VENDA</div>';
  h += '<div class="vt-hero-title">Escolha o modelo ideal</div>';
  h += '<div class="vt-hero-sub">Compare os modelos e mostre ao cliente a diferença de qualidade e preço. Toque em qualquer modelo para aplicar ao orçamento.</div>';
  h += '</div>';

  // ── Cards (scroll horizontal) ──
  h += '<div class="vt-cards-scroll">';
  h += '<div class="vt-cards-row">';
  h += _vtCard('essencial', precos);
  h += _vtCard('padrao', precos);
  h += _vtCard('nobre', precos);
  h += '</div></div>';

  // ── Upsell section ──
  h += _vtUpsellSection(precos);

  // ── Tabela comparativa ──
  h += _vtTabela(precos);

  // ── Rodapé ──
  h += '<div class="vt-footer">';
  h += '<div class="vt-footer-note">* Preços estimados com base na tabela de preços configurada. O valor final depende da pedra selecionada e das opções específicas do orçamento.</div>';
  h += '<button class="btn btn-o" style="width:100%;margin-top:12px;" data-close>Fechar</button>';
  h += '</div>';

  return h;
}

// ─────────────────────────────────────────────────────────────────────
// ABRE O COMPARADOR
// ─────────────────────────────────────────────────────────────────────
function vendasTumAbrir() {
  var md = document.getElementById('vtModal');
  if (md) {
    md.querySelector('.vt-body').innerHTML = vtRender();
    if (typeof showMd === 'function') showMd('vtModal');
    else md.classList.add('on');
  }
}

// ─────────────────────────────────────────────────────────────────────
// BOTÃO "⚖️ Comparar Modelos" — injetado no hero do túmulo
// ─────────────────────────────────────────────────────────────────────
function _vtInjectButton() {
  // Aguarda o hero do túmulo existir e injeta o botão
  var hero = document.querySelector('.tum-hero');
  if (!hero || document.querySelector('.vt-open-btn')) return;

  var btn = document.createElement('button');
  btn.className = 'vt-open-btn';
  btn.innerHTML = '⚖️ Comparar Modelos';
  btn.onclick = vendasTumAbrir;
  hero.appendChild(btn);
}

// ─────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────
(function _vtCSS() {
  var s = document.createElement('style');
  s.id  = 'vt-styles';
  s.textContent = `
    /* ──── MODAL FULL-SCREEN ──── */
    #vtModal {
      align-items: flex-start !important;
      justify-content: center;
      padding-top: 0;
    }
    #vtModal .vt-modal-inner {
      width: 100%; max-width: 480px;
      height: 100vh; max-height: 100vh;
      background: var(--bg);
      display: flex; flex-direction: column;
      overflow: hidden;
    }
    .vt-modal-topbar {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px 10px;
      background: var(--s1);
      border-bottom: 1px solid var(--bd);
      flex-shrink: 0;
    }
    .vt-modal-topbar::after {
      content: '';
      position: absolute; left: 0; right: 0;
      height: 1px;
      background: linear-gradient(90deg, transparent, var(--gold3), transparent);
      bottom: 0; left: 0;
    }
    .vt-modal-topbar button {
      background: none; border: none;
      color: var(--t3); font-size: .8rem;
      cursor: pointer; font-family: Outfit, sans-serif;
      padding: 4px 8px; border-radius: 6px;
    }
    .vt-modal-topbar-title {
      flex: 1;
      font-family: 'Cormorant Garamond', serif;
      font-size: 1rem; font-weight: 700; color: var(--gold);
    }
    .vt-body {
      flex: 1; overflow-y: auto;
      padding: 0 0 32px;
      scrollbar-width: none;
    }
    .vt-body::-webkit-scrollbar { display: none; }

    /* ──── HERO ──── */
    .vt-hero {
      padding: 18px 17px 14px;
      background: linear-gradient(180deg, var(--s2), var(--bg));
      border-bottom: 1px solid var(--bd);
    }
    .vt-hero-tag {
      font-size: .5rem; letter-spacing: 3px; text-transform: uppercase;
      color: var(--gold3); font-weight: 700; margin-bottom: 5px;
    }
    .vt-hero-title {
      font-family: 'Cormorant Garamond', serif;
      font-size: 1.5rem; font-weight: 700; color: var(--gold2);
      line-height: 1.1; margin-bottom: 6px;
    }
    .vt-hero-sub {
      font-size: .68rem; color: var(--t3); line-height: 1.6;
    }

    /* ──── CARDS (scroll horizontal) ──── */
    .vt-cards-scroll {
      overflow-x: auto; scrollbar-width: none;
      padding: 16px 10px 6px;
    }
    .vt-cards-scroll::-webkit-scrollbar { display: none; }
    .vt-cards-row {
      display: flex; gap: 10px;
      padding: 0 7px 4px;
      min-width: max-content;
    }

    /* ──── CARD ──── */
    .vt-card {
      width: 190px; flex-shrink: 0;
      background: var(--s2);
      border: 1.5px solid var(--bd2);
      border-radius: 16px; overflow: hidden;
      display: flex; flex-direction: column;
      transition: border-color .2s, box-shadow .2s;
      position: relative;
    }
    .vt-card-dest {
      border-color: var(--pac-borda);
      box-shadow: 0 0 0 1px var(--pac-borda), 0 6px 24px rgba(0,0,0,.4);
    }

    .vt-tag {
      text-align: center; padding: 5px 0;
      font-size: .52rem; letter-spacing: 2px;
      text-transform: uppercase; font-weight: 800; color: #fff;
    }

    .vt-card-hd { padding: 10px 12px 4px; }
    .vt-card-icon { font-size: 1.2rem; margin-bottom: 3px; }
    .vt-card-nm {
      font-size: .9rem; font-weight: 800;
      color: var(--pac-cor, var(--tx)); line-height: 1.1;
    }
    .vt-card-sub { font-size: .6rem; color: var(--t3); margin-top: 2px; }

    /* SVG tomb */
    .vt-svg-wrap {
      padding: 6px 16px 4px;
      background: linear-gradient(180deg, var(--s3), var(--s2));
      border-top: 1px solid rgba(255,255,255,.04);
      border-bottom: 1px solid rgba(255,255,255,.04);
    }

    /* Price */
    .vt-price-box { padding: 10px 12px 6px; text-align: center; }
    .vt-price-lbl { font-size: .52rem; color: var(--t4); margin-bottom: 2px; }
    .vt-price {
      font-size: 1.1rem; font-weight: 900;
      color: var(--pac-cor, var(--gold2));
      line-height: 1.1;
    }
    .vt-price-area { font-size: .56rem; color: var(--t4); margin-top: 2px; }

    /* Features */
    .vt-feat-list {
      padding: 4px 12px 8px;
      border-top: 1px solid rgba(255,255,255,.05);
    }
    .vt-feat {
      display: flex; align-items: flex-start; gap: 6px;
      padding: 3px 0;
    }
    .vt-feat-ico {
      font-size: .62rem; font-weight: 800; width: 12px; flex-shrink: 0;
      color: var(--t4); margin-top: 1px;
    }
    .vt-feat.on .vt-feat-ico { color: #4cda80; }
    .vt-feat-txt { font-size: .6rem; color: var(--t4); line-height: 1.4; }
    .vt-feat.on .vt-feat-txt { color: var(--t2); }

    /* Description */
    .vt-card-desc {
      padding: 0 12px 8px;
      font-size: .6rem; color: var(--t4); line-height: 1.5;
      flex: 1;
    }

    /* CTA */
    .vt-cta {
      margin: 6px 10px 12px;
      padding: 10px 8px;
      background: var(--s3);
      border: 1px solid var(--pac-borda, var(--bd2));
      border-radius: 10px;
      color: var(--pac-cor, var(--t2));
      font-family: Outfit, sans-serif;
      font-size: .68rem; font-weight: 700;
      cursor: pointer; text-align: center;
      transition: background .15s;
    }
    .vt-cta:active { background: var(--s4); }
    .vt-cta-dest {
      background: linear-gradient(135deg, var(--pac-cor, var(--gold)), var(--pac-borda, var(--gold3)));
      color: #000; border-color: transparent;
    }

    /* ──── UPSELL SECTION ──── */
    .vt-upsell-section {
      margin: 6px 14px 4px;
      background: var(--s2); border: 1px solid var(--bd2);
      border-radius: 14px; padding: 14px;
    }
    .vt-upsell-title {
      font-size: .62rem; font-weight: 700; color: var(--t2);
      margin-bottom: 10px;
    }
    .vt-upsell-item {
      display: flex; justify-content: space-between; align-items: center;
    }
    .vt-ui-from { font-size: .65rem; color: var(--t3); }
    .vt-ui-diff {
      font-size: .8rem; font-weight: 800;
      color: #4cda80;
      background: rgba(76,218,128,.1);
      border-radius: 6px; padding: 2px 8px;
    }
    .vt-ui-extras {
      display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;
    }
    .vt-ui-tag {
      font-size: .56rem; color: #4a80b5;
      border: 1px solid rgba(74,128,181,.3);
      border-radius: 4px; padding: 2px 6px;
    }

    /* ──── TABELA ──── */
    .vt-tbl-wrap {
      margin: 12px 14px 4px;
    }
    .vt-tbl-title {
      font-size: .56rem; letter-spacing: 2px; text-transform: uppercase;
      color: var(--gold3); font-weight: 700; margin-bottom: 8px;
    }
    .vt-tbl {
      background: var(--s2); border: 1px solid var(--bd2);
      border-radius: 12px; overflow: hidden;
    }
    .vt-tbl-head {
      display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr;
      background: rgba(201,168,76,.06);
      border-bottom: 1px solid var(--bd2);
      padding: 8px 10px;
    }
    .vt-th-nm { font-size: .5rem; color: var(--t4); font-weight: 700; }
    .vt-th {
      font-size: .58rem; font-weight: 700; text-align: center;
      line-height: 1.3;
    }
    .vt-tbl-row {
      display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr;
      padding: 7px 10px;
      border-bottom: 1px solid rgba(255,255,255,.04);
      align-items: center;
    }
    .vt-tbl-row:last-child { border-bottom: none; }
    .vt-tbl-price-row { background: rgba(201,168,76,.04); }
    .vt-td-nm { font-size: .6rem; color: var(--t3); }
    .vt-td { text-align: center; }
    .vt-td-ck { font-size: .7rem; color: #4cda80; font-weight: 800; }
    .vt-td-x  { font-size: .7rem; color: var(--t4); }

    /* ──── FOOTER ──── */
    .vt-footer {
      padding: 12px 14px 20px;
    }
    .vt-footer-note {
      font-size: .58rem; color: var(--t4); line-height: 1.5;
      margin-bottom: 4px;
    }

    /* ──── BOTÃO NO HERO DO TÚMULO ──── */
    .vt-open-btn {
      display: flex; align-items: center; gap: 6px;
      margin-top: 10px; width: 100%;
      padding: 10px 14px;
      background: var(--s3);
      border: 1px solid rgba(201,168,76,.25);
      border-radius: 12px;
      color: var(--gold2);
      font-family: Outfit, sans-serif;
      font-size: .74rem; font-weight: 700;
      cursor: pointer;
      transition: background .15s, border-color .2s;
    }
    .vt-open-btn:active { background: var(--s4); border-color: var(--gold); }
  `;
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────────────
// INIT — injeta modal e botão quando o app carregar
// ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', function _vtBoot() {

  // 1. Cria o modal e adiciona ao DOM
  var modal = document.createElement('div');
  modal.className = 'ov';
  modal.id = 'vtModal';
  modal.innerHTML =
    '<div class="vt-modal-inner">'
    + '<div class="vt-modal-topbar">'
    + '<button data-close>← Voltar</button>'
    + '<div class="vt-modal-topbar-title">⚖️ Comparar Modelos</div>'
    + '</div>'
    + '<div class="vt-body"></div>'
    + '</div>';
  document.body.appendChild(modal);

  // 2. Patch _tumRenderTab → injeta botão "Comparar Modelos" no hero do túmulo
  if (typeof _tumRenderTab === 'function') {
    var _origVT = _tumRenderTab;
    _tumRenderTab = function() {
      _origVT();
      // Pequeno delay para o DOM existir
      setTimeout(_vtInjectButton, 30);
    };
  }

  // 3. Fechar ao clicar fora do conteúdo
  modal.addEventListener('click', function(e) {
    if (e.target === modal && typeof closeAll === 'function') closeAll();
  });
});
