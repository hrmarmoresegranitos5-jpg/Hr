// ══════════════════════════════════════════════════════════════════════
// WIZARD DE ORÇAMENTO DE TÚMULOS — HR Mármores e Granitos
// Transforma o layout de abas em um fluxo passo a passo profissional
// Carregar APÓS: app-tumulos.js e app-precif-tumulos.js no index.html
// ══════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ─── Definição das etapas ────────────────────────────────────────────
  var STEPS = [
    { k: 'estrutura',    icon: '🏗️',  title: 'Estrutura',    desc: 'Cliente, tipo e dimensões'  },
    { k: 'gavetas',      icon: '⚰️',  title: 'Gavetas',      desc: 'Compartimentos'             },
    { k: 'revestimento', icon: '🪨',  title: 'Revestimento', desc: 'Peças de pedra externa'     },
    { k: 'construcao',   icon: '🧱',  title: 'Construção',   desc: 'Obra e materiais'           },
    { k: 'acabamentos',  icon: '✨',  title: 'Acabamentos',  desc: 'Detalhes e extras'          },
    { k: 'resumo',       icon: '💰',  title: 'Resumo',       desc: 'Orçamento final'            }
  ];

  var _wStep = 0;

  // ─── Navegação pública (disponível imediatamente) ────────────────────
  window.wizGoTo = function (i) {
    _wStep = Math.max(0, Math.min(i, STEPS.length - 1));
    renderTum();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  window.wizNext = function () {
    if (_wStep < STEPS.length - 1) { _wStep++; renderTum(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };
  window.wizPrev = function () {
    if (_wStep > 0) { _wStep--; renderTum(); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  };

  // ──────────────────────────────────────────────────────────────────────
  // APLICA OVERRIDES APÓS O LOAD (garante rodar depois do precif-tumulos)
  // ──────────────────────────────────────────────────────────────────────
  function _aplicarWizard() {

    // OVERRIDE: renderTum()
    window.renderTum = function () {
      var pg = document.getElementById('pg9');
      if (!pg) return;
      tumAutoCalcDims();
      tumAutoMatQty();
      TUM.calc = tumCalc();

      pg.innerHTML =
        _wHero() +
        _wStepper() +
        '<div id="tumBody" class="wiz-body"></div>' +
        '<div style="height:90px;"></div>';

      _wRender();
    };

    // OVERRIDE: _tumRenderTab() — chamado por tumRecalc()
    window._tumRenderTab = function () {
      tumAutoCalcDims();
      tumAutoMatQty();
      TUM.calc = tumCalc();
      _wRender();
    };

    // Compatibilidade com chamadas de tumTab() existentes
    window.tumTab = function (t) {
      var map = { cliente: 0, pedras: 2, extras: 4, mdo: 4, obra: 3, mat: 3, resumo: 5 };
      if (map[t] !== undefined) { _wStep = map[t]; renderTum(); }
    };
  }

  // Aplica no load (depois que precif-tumulos.js termina seus patches)
  window.addEventListener('load', _aplicarWizard);

  // ──────────────────────────────────────────────────────────────────────
  // HERO — valor sempre visível no topo
  // ──────────────────────────────────────────────────────────────────────
  function _wHero() {
    var r   = TUM.calc;
    var vf  = r.venda || 0;
    var luc = r.lucroTotal || 0;
    var mg  = r.margemReal || 0;
    var s   = STEPS[_wStep];
    return '<div class="wiz-hero">' +
      '<div class="wiz-hero-L">' +
      '<div class="wiz-hero-icon">' + s.icon + '</div>' +
      '<div>' +
      '<div class="wiz-hero-title">⚰️ Orçamento de Túmulo</div>' +
      '<div class="wiz-hero-sub">' + s.title + ' · ' + s.desc + '</div>' +
      '</div>' +
      '</div>' +
      '<div class="wiz-hero-R">' +
      '<div class="tum-hero-val wiz-hero-val">' + (vf > 0 ? 'R$\u00a0' + fm(vf) : '—') + '</div>' +
      '<div class="tum-hero-lucro wiz-hero-lucro">' +
        (luc > 0 ? 'lucro R$ ' + fm(luc) + ' · ' + mg.toFixed(0) + '%' : '\u00a0') +
      '</div>' +
      '</div>' +
      '</div>';
  }

  // ──────────────────────────────────────────────────────────────────────
  // STEPPER — indicador visual das etapas
  // ──────────────────────────────────────────────────────────────────────
  function _wStepper() {
    // Barra de progresso
    var pct = ((_wStep + 1) / STEPS.length * 100).toFixed(0);
    var h = '<div class="wiz-prog"><div class="wiz-prog-bar" style="width:' + pct + '%"></div></div>';
    h += '<div class="wiz-stepper">';
    STEPS.forEach(function (s, i) {
      var cls = 'wiz-stp' + (i === _wStep ? ' wiz-on' : i < _wStep ? ' wiz-done' : '');
      h += '<div class="' + cls + '" onclick="wizGoTo(' + i + ')">' +
        '<div class="wiz-stp-num">' + (i < _wStep ? '✓' : (i + 1)) + '</div>' +
        '<div class="wiz-stp-icon">' + s.icon + '</div>' +
        '<div class="wiz-stp-lbl">' + s.title + '</div>' +
        '</div>';
      if (i < STEPS.length - 1) {
        h += '<div class="wiz-conn' + (i < _wStep ? ' wiz-conn-done' : '') + '"></div>';
      }
    });
    h += '</div>';
    return h;
  }

  // ─── Render da etapa atual ───────────────────────────────────────────
  function _wRender() {
    var body = document.getElementById('tumBody');
    if (!body) return;
    var fns = [_sEstrutura, _sGavetas, _sRevestimento, _sConstrucao, _sAcabamentos, _sResumo];
    body.innerHTML = (fns[_wStep] || _sResumo)();
  }

  // ─── Botões de navegação ─────────────────────────────────────────────
  function _wNav(hasPrev, hasNext, nextLbl, hasSave) {
    var h = '<div class="wiz-nav">';
    h += hasPrev
      ? '<button class="btn btn-o wiz-nbtn" onclick="wizPrev()">← Anterior</button>'
      : '<div></div>';
    h += '<div style="display:flex;gap:8px;">';
    if (hasSave) h += '<button class="btn btn-g wiz-nbtn" onclick="tumSalvar()">💾 Salvar Orçamento</button>';
    if (hasNext) h += '<button class="btn btn-g wiz-nbtn" onclick="wizNext()">' + (nextLbl || 'Próximo →') + '</button>';
    h += '</div></div>';
    return h;
  }

  // ─── Título de seção ─────────────────────────────────────────────────
  function _wTitle(txt, mt) {
    return '<div class="wiz-stitle"' + (mt ? ' style="margin-top:' + mt + 'px"' : '') + '>' + txt + '</div>';
  }

  // ──────────────────────────────────────────────────────────────────────
  // ETAPA 1 — ESTRUTURA
  // Cliente · Tipo de serviço · Dimensões · Pedra
  // ──────────────────────────────────────────────────────────────────────
  function _sEstrutura() {
    var q = TUM.q;
    var h = '<div class="tum-sec">';

    // Identificação
    h += _wTitle('👤 Identificação do Cliente');
    h += '<div class="tum-grid2">';
    h += _tumInput('text', 'Cliente / Contratante', q.cli,       "tumSet('cli',this.value)",       'Família Oliveira...');
    h += _tumInput('text', 'Falecido',              q.falecido,  "tumSet('falecido',this.value)",  'Nome do falecido');
    h += _tumInput('text', 'Cemitério',             q.cemiterio, "tumSet('cemiterio',this.value)", 'Cemitério Municipal...');
    h += _tumInput('text', 'Quadra / Lote',         q.quadra,    "tumSet('quadra',this.value)",    'Q04 L15');
    h += '</div>';

    // Tipo de serviço
    h += _wTitle('⚰️ Tipo de Serviço', 20);
    h += '<div class="tum-tipos-grid">';
    Object.keys(TUM.TIPOS).forEach(function (k) {
      var t = TUM.TIPOS[k];
      h += '<div class="tum-tipo-card' + (q.tipo === k ? ' on' : '') + '" onclick="tumSetTipo(\'' + k + '\')">' +
        '<div class="tum-tipo-icon">' + t.icon + '</div>' +
        '<div class="tum-tipo-label">' + t.label + '</div>' +
        '<div class="tum-tipo-desc">' + t.desc + '</div>' +
        '</div>';
    });
    h += '</div>';

    // Dimensões
    h += _wTitle('📐 Dimensões', 20);
    var c = q.dims.comp, l = q.dims.larg, a = q.dims.alt;
    var perda = q.pedras.perda || 15;
    var m2base = c * l * 2 + c * a * 2 + l * a * 2;
    var m2com  = m2base * (1 + perda / 100);
    h += '<div class="tum-grid3">';
    h += _tumDimInput('Comprimento (m)', 'comp',    q.dims.comp,    'Ex: 2.20');
    h += _tumDimInput('Largura (m)',     'larg',    q.dims.larg,    'Ex: 0.90');
    h += _tumDimInput('Altura (m)',      'alt',     q.dims.alt,     'Ex: 0.60');
    h += _tumDimInput('Espessura (cm)',  'esp',     q.dims.esp,     'Ex: 3');
    h += _tumDimInput('Gavetas',         'gavetas', q.dims.gavetas, 'Ex: 1');
    h += '</div>';
    h += '<div class="tum-dims-preview">';
    h += '<div class="tum-dp-title">📏 Área estimada das peças</div>';
    h += '<div class="tum-dp-grid">';
    h += _dpItem('Tampa + Base',  fm(c * l * 2)    + ' m²');
    h += _dpItem('Laterais (×2)', fm(c * a * 2)    + ' m²');
    h += _dpItem('Frontais (×2)', fm(l * a * 2)    + ' m²');
    h += _dpItem('TOTAL líquido', fm(m2base)        + ' m²');
    h += _dpItem('c/ ' + perda + '% perda', fm(m2com) + ' m²');
    h += '</div></div>';
    h += '<div style="margin-top:8px;"><label class="tum-lbl">Perda / Desperdício (%)</label>';
    h += '<input class="tum-in" type="number" value="' + perda + '" min="5" max="40" style="max-width:90px;" onchange="TUM.q.pedras.perda=+this.value;tumRecalc()"></div>';

    // Pedra
    h += _wTitle('🪨 Material / Pedra', 20);
    var sel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones
      ? CFG.stones.find(function (s) { return s.id === q.stoneId; })
      : null;

    if (sel) {
      h += '<div class="wiz-stone-sel">';
      h += '<div><div class="wiz-stone-nm">' + sel.nm + '</div>' +
        '<div class="wiz-stone-pr">R$ ' + fm(sel.pr) + '/m² · ' + (sel.fin || '') + '</div></div>';
      h += '<div style="display:flex;gap:6px;">';
      h += '<button class="btn btn-o" style="font-size:.68rem;padding:8px 12px;" onclick="tumOpenStonePick()">🔄 Trocar</button>';
      h += '<button class="btn" style="font-size:.65rem;background:var(--s3);color:var(--t3);padding:8px 10px;" onclick="TUM.q.stoneId=null;TUM.q.stonePrice=0;tumRecalc()">✕</button>';
      h += '</div></div>';
    } else {
      h += '<div style="padding:10px 16px;">';
      h += '<button class="btn btn-o" style="font-size:.72rem;width:100%;padding:12px;" onclick="tumOpenStonePick()">🪨 Selecionar Pedra do Catálogo</button>';

      if (typeof tumInitPrecos === 'function') tumInitPrecos();
      var tp = (typeof CFG !== 'undefined' && CFG.tumPrecos) ? CFG.tumPrecos
        : (typeof DEF_TUM_PRECOS !== 'undefined' ? DEF_TUM_PRECOS : null);

      if (tp && tp.pedras) {
        h += '<div class="wiz-sep">ou escolha por categoria</div>';
        h += '<div class="wiz-pedra-grid">';
        Object.keys(tp.pedras).forEach(function (pk) {
          var p = tp.pedras[pk];
          var isOn = q._tumPedraKey === pk || (!q._tumPedraKey && pk === 'granito_simples');
          h += '<div class="wiz-pedra-opt' + (isOn ? ' on' : '') + '" onclick="tumAplicarTabela({pedraKey:\'' + pk + '\'});tumRecalc()">' +
            '<div class="wiz-pedra-icon">' + (p.icon || '⬛') + '</div>' +
            '<div class="wiz-pedra-nm">' + p.label + '</div>' +
            '<div class="wiz-pedra-pr">R$ ' + p.preco + '/m²</div>' +
            '</div>';
        });
        h += '</div>';
      }
      h += '</div>';
    }

    h += '</div>';
    h += _wNav(false, true, 'Gavetas →');
    return h;
  }

  // ──────────────────────────────────────────────────────────────────────
  // ETAPA 2 — GAVETAS
  // Número de compartimentos · Tampa · Frentes · Detalhe
  // ──────────────────────────────────────────────────────────────────────
  function _sGavetas() {
    var q   = TUM.q;
    var gav = q.dims.gavetas || 1;
    var r   = TUM.calc;
    var sel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones
      ? CFG.stones.find(function (s) { return s.id === q.stoneId; }) : null;
    var stPr = sel ? sel.pr : (q.stonePrice || 0);
    var h = '<div class="tum-sec">';

    // Seletor de gavetas
    h += _wTitle('⚰️ Número de Gavetas');
    h += '<div class="wiz-info-box">Cada gaveta é um compartimento de sepultamento. A seleção ajusta automaticamente a estrutura de alvenaria, ferragem e mão de obra necessárias.</div>';
    h += '<div class="wiz-gav-grid">';
    [
      { n: 1, lbl: 'Simples',   sub: '1 compartimento' },
      { n: 2, lbl: 'Dupla',     sub: '2 compartimentos' },
      { n: 3, lbl: 'Tripla',    sub: '3 compartimentos' },
      { n: 4, lbl: 'Quádrupla', sub: '4 compartimentos' }
    ].forEach(function (opt) {
      h += '<div class="wiz-gav-card' + (gav === opt.n ? ' on' : '') + '" onclick="tumSetDim(\'gavetas\',' + opt.n + ')">' +
        '<div class="wiz-gav-n">' + opt.n + '</div>' +
        '<div class="wiz-gav-lbl">' + opt.lbl + '</div>' +
        '<div class="wiz-gav-sub">' + opt.sub + '</div>' +
        '</div>';
    });
    h += '</div>';

    // Tampa
    h += _wTitle('🪨 Tampa', 20);
    h += '<div class="tum-peca-list">';
    var tampaItem = q.pedras.tampa;
    h += _pecaRow('tampa', 'Tampa', tampaItem.on,
      fm(tampaItem.m2 || 0) + ' m²',
      stPr ? 'R$ ' + fm((tampaItem.m2 || 0) * stPr) : '',
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Área (m²)</label><input class="tum-in" type="number" step="0.01" value="' + (tampaItem.m2 || 0) + '" onchange="tumSetPeca(\'tampa\',\'m2\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Qtd peças</label><input class="tum-in" type="number" min="1" value="' + (tampaItem.qty || 1) + '" onchange="tumSetPeca(\'tampa\',\'qty\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Acréscimo R$</label><input class="tum-in" type="number" min="0" value="' + (tampaItem.extra || 0) + '" onchange="tumSetPeca(\'tampa\',\'extra\',+this.value)"></div>' +
      '</div>',
      'tumTogPeca'
    );
    h += '</div>';

    // Frentes de Gaveta
    h += _wTitle('🪨 Frentes de Gaveta', 16);
    h += '<div class="tum-peca-list">';
    var gavItem = q.pedras.gavetas;
    h += _pecaRow('gavetas', 'Frentes de Gaveta (' + gav + 'x)', gavItem.on,
      fm(gavItem.m2 || 0) + ' m²',
      stPr ? 'R$ ' + fm(((gavItem.m2 || 0) + (gavItem.extra || 0)) * stPr) : '',
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Área (m²)</label><input class="tum-in" type="number" step="0.01" value="' + (gavItem.m2 || 0) + '" onchange="tumSetPeca(\'gavetas\',\'m2\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Qtd peças</label><input class="tum-in" type="number" min="1" value="' + (gavItem.qty || 1) + '" onchange="tumSetPeca(\'gavetas\',\'qty\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Acréscimo R$</label><input class="tum-in" type="number" min="0" value="' + (gavItem.extra || 0) + '" onchange="tumSetPeca(\'gavetas\',\'extra\',+this.value)"></div>' +
      '</div>',
      'tumTogPeca'
    );
    h += '</div>';

    // Detalhe Superior (opcional)
    h += _wTitle('🏛️ Detalhe Superior', 16);
    h += '<div class="wiz-opt-tag">opcional</div>';
    h += '<div class="tum-peca-list">';
    var detItem = q.pedras.detalhe;
    h += _pecaRow('detalhe', 'Detalhe Superior', detItem.on,
      fm(detItem.m2 || 0) + ' m²',
      stPr ? 'R$ ' + fm((detItem.m2 || 0) * stPr) : '',
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Área (m²)</label><input class="tum-in" type="number" step="0.01" value="' + (detItem.m2 || 0) + '" onchange="tumSetPeca(\'detalhe\',\'m2\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Qtd peças</label><input class="tum-in" type="number" min="1" value="' + (detItem.qty || 1) + '" onchange="tumSetPeca(\'detalhe\',\'qty\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Acréscimo R$</label><input class="tum-in" type="number" min="0" value="' + (detItem.extra || 0) + '" onchange="tumSetPeca(\'detalhe\',\'extra\',+this.value)"></div>' +
      '</div>',
      'tumTogPeca'
    );
    h += '</div>';

    if (r.venda > 0) {
      h += '<div class="wiz-mini-tot"><span>Total parcial</span><span class="wiz-mini-val">R$ ' + fm(r.venda) + '</span></div>';
    }

    h += '</div>';
    h += _wNav(true, true, 'Revestimento →');
    return h;
  }

  // ──────────────────────────────────────────────────────────────────────
  // ETAPA 3 — REVESTIMENTO
  // Laterais · Frontais · Base · Sainha · Moldura · Pingadeira · Recortes
  // ──────────────────────────────────────────────────────────────────────
  function _sRevestimento() {
    var q    = TUM.q;
    var p    = q.pedras;
    var r    = TUM.calc;
    var sel  = q.stoneId && typeof CFG !== 'undefined' && CFG.stones
      ? CFG.stones.find(function (s) { return s.id === q.stoneId; }) : null;
    var stPr = sel ? sel.pr : (q.stonePrice || 0);
    var h    = '<div class="tum-sec">';

    if (!stPr) {
      h += '<div class="tum-warn">⚠️ Nenhuma pedra selecionada — os valores de pedra não serão calculados.</div>';
    }

    // Peças externas
    h += _wTitle('🪨 Peças Externas de Pedra');
    h += '<div class="tum-peca-list">';
    [
      ['laterais', 'Laterais (×2)'],
      ['frontais', 'Frontais (×2)'],
      ['base',     'Base'],
      ['sainha',   'Sainha Frontal']
    ].forEach(function (entry) {
      var k    = entry[0];
      var lbl  = entry[1];
      var item = p[k];
      if (!item) return;
      h += _pecaRow(k, lbl, item.on,
        fm(item.m2 || 0) + ' m²',
        stPr ? 'R$ ' + fm((item.m2 || 0) * stPr) : '',
        '<div class="tum-grid3">' +
        '<div class="tum-f"><label class="tum-lbl">Área (m²)</label><input class="tum-in" type="number" step="0.01" value="' + (item.m2 || 0) + '" onchange="tumSetPeca(\'' + k + '\',\'m2\',+this.value)"></div>' +
        '<div class="tum-f"><label class="tum-lbl">Qtd peças</label><input class="tum-in" type="number" min="1" value="' + (item.qty || 1) + '" onchange="tumSetPeca(\'' + k + '\',\'qty\',+this.value)"></div>' +
        '<div class="tum-f"><label class="tum-lbl">Acréscimo R$</label><input class="tum-in" type="number" min="0" value="' + (item.extra || 0) + '" onchange="tumSetPeca(\'' + k + '\',\'extra\',+this.value)"></div>' +
        '</div>',
        'tumTogPeca'
      );
    });
    h += '</div>';

    // Moldura e Pingadeira
    h += _wTitle('📏 Moldura e Pingadeira', 16);
    h += '<div class="tum-peca-list">';

    var mol     = p.moldura;
    var m2mol   = (mol.ml || 0) * 0.12;
    var custoMol = mol.on ? m2mol * stPr : 0;
    h += _pecaRow('moldura', 'Moldura (ml)', mol.on,
      fm(mol.ml || 0) + ' ml',
      stPr ? 'R$ ' + fm(custoMol) : '',
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Metros lineares</label><input class="tum-in" type="number" step="0.01" value="' + (mol.ml || 0) + '" onchange="tumSetPecaML(\'moldura\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Valor/ml R$</label><input class="tum-in" type="number" value="' + (mol.vlrMl || 120) + '" onchange="TUM.q.pedras.moldura.vlrMl=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogPeca'
    );

    var ping     = p.pingadeira;
    var m2ping   = (ping.ml || 0) * 0.08;
    var custoPing = ping.on ? m2ping * stPr : 0;
    h += _pecaRow('pingadeira', 'Pingadeira (ml)', ping.on,
      fm(ping.ml || 0) + ' ml',
      stPr ? 'R$ ' + fm(custoPing) : '',
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Metros lineares</label><input class="tum-in" type="number" step="0.01" value="' + (ping.ml || 0) + '" onchange="tumSetPecaML(\'pingadeira\',+this.value)"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Valor/ml R$</label><input class="tum-in" type="number" value="' + (ping.vlrMl || 80) + '" onchange="TUM.q.pedras.pingadeira.vlrMl=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogPeca'
    );
    h += '</div>';

    // Recortes / furos
    h += _wTitle('🔧 Recortes e Furos', 16);
    h += '<div class="tum-peca-list">';
    var rec = p.recortes;
    h += _pecaRow('recortes', 'Recortes / Furos', rec.on,
      (rec.qty || 0) + ' un',
      'R$ ' + fm((rec.qty || 0) * (rec.vlrUn || 80)),
      '<div class="tum-grid3">' +
      '<div class="tum-f"><label class="tum-lbl">Quantidade</label><input class="tum-in" type="number" min="0" value="' + (rec.qty || 0) + '" onchange="TUM.q.pedras.recortes.qty=+this.value;tumRecalc()"></div>' +
      '<div class="tum-f"><label class="tum-lbl">Valor un R$</label><input class="tum-in" type="number" value="' + (rec.vlrUn || 80) + '" onchange="TUM.q.pedras.recortes.vlrUn=+this.value;tumRecalc()"></div>' +
      '</div>',
      'tumTogPeca'
    );
    h += '</div>';

    // Revestimento adicional
    h += _wTitle('🪟 Revestimento Adicional', 16);
    h += '<div class="wiz-opt-tag">opcional</div>';
    var rv = q.revestimento;
    h += _extraSecHeader('Revestimento de Pedra / Porcelanato', 'revestimento', rv.on);
    if (rv.on) {
      h += '<div class="tum-extra-body">';
      h += '<div class="tum-grid2">';
      h += '<div class="tum-f"><label class="tum-lbl">Material</label>' +
        '<select class="tum-in" onchange="TUM.q.revestimento.tipo=this.value;tumRecalc()">' +
        [['granito','Granito'],['marmore','Mármore'],['porcelana','Porcelanato'],['ceramica','Cerâmica']].map(function (o) {
          return '<option value="' + o[0] + '"' + (rv.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>';
      h += '<div class="tum-f"><label class="tum-lbl">Área (m²)</label>' +
        '<input class="tum-in" type="number" step="0.01" value="' + (rv.m2 || 0) + '" onchange="TUM.q.revestimento.m2=+this.value;tumRecalc()"></div>';
      h += '</div>';
      h += '<div class="tum-grid2" style="margin-top:8px;">';
      h += _custoVendaInputs('revestimento', 'custo', 'venda', rv.custo, rv.venda, 'Custo/m² R$', 'Venda/m² R$');
      h += '</div>';
      h += '</div>';
    }

    // Resumo parcial de pedra
    if (r.custoPedra > 0) {
      h += '<div class="tum-total-box" style="margin-top:14px;">';
      h += _totalRow('Área líquida',             fm(r.m2liq   || 0) + ' m²', false);
      h += _totalRow('Com ' + (p.perda || 15) + '% perda', fm(r.m2total || 0) + ' m²', false);
      h += _totalRow('💎 Custo real pedra',       'R$ ' + fm(r.custoPedra || 0), true);
      h += _totalRow('💰 Valor venda pedra',       'R$ ' + fm(r.vendaPedra || 0), true, 'grn');
      h += '</div>';
    }

    if (r.venda > 0) {
      h += '<div class="wiz-mini-tot"><span>Total parcial</span><span class="wiz-mini-val">R$ ' + fm(r.venda) + '</span></div>';
    }

    h += '</div>';
    h += _wNav(true, true, 'Construção →');
    return h;
  }

  // ──────────────────────────────────────────────────────────────────────
  // ETAPA 4 — CONSTRUÇÃO
  // Serviços de obra · Materiais de construção
  // ──────────────────────────────────────────────────────────────────────
  function _sConstrucao() {
    var q = TUM.q;
    var h = '<div class="tum-sec">';

    // Serviços de obra
    h += _wTitle('🧱 Serviços de Obra');
    h += '<div class="wiz-info-box">Ative os serviços conforme o escopo da obra. Os dias e diárias podem ser ajustados individualmente.</div>';
    h += '<div class="tum-peca-list">';
    Object.keys(TUM.OBRA_LABELS).forEach(function (k) {
      var item  = q.obra[k]; if (!item) return;
      var label = TUM.OBRA_LABELS[k];
      var custo = item.dias * item.diaria * (item.equipe || 1);
      h += _pecaRow(k, label, item.on,
        item.dias + ' dia(s)',
        item.on ? 'R$ ' + fm(custo) : '',
        '<div class="tum-grid3">' +
        '<div class="tum-f"><label class="tum-lbl">Dias</label><input class="tum-in" type="number" min="1" value="' + item.dias + '" onchange="TUM.q.obra.' + k + '.dias=+this.value;tumRecalc()"></div>' +
        '<div class="tum-f"><label class="tum-lbl">Diária R$</label><input class="tum-in" type="number" min="0" value="' + item.diaria + '" onchange="TUM.q.obra.' + k + '.diaria=+this.value;tumRecalc()"></div>' +
        '<div class="tum-f"><label class="tum-lbl">Equipe</label><input class="tum-in" type="number" min="1" value="' + (item.equipe || 1) + '" onchange="TUM.q.obra.' + k + '.equipe=+this.value;tumRecalc()"></div>' +
        '</div>',
        'tumTogObra'
      );
    });
    h += '</div>';

    // Materiais de construção
    h += _wTitle('🪣 Materiais de Construção', 20);
    h += '<div class="tum-peca-list">';
    Object.keys(TUM.MAT_LABELS).forEach(function (k) {
      var item  = q.mat[k]; if (!item) return;
      var label = TUM.MAT_LABELS[k];
      var inp;
      if ('vlr' in item) {
        inp = '<div class="tum-f"><label class="tum-lbl">Valor R$</label>' +
          '<input class="tum-in" type="number" min="0" value="' + (item.vlr || 0) + '" onchange="TUM.q.mat.' + k + '.vlr=+this.value;tumRecalc()"></div>';
        h += _pecaRow(k, label, item.on, 'R$ ' + (item.vlr || 0), '', inp, 'tumTogMat');
      } else {
        var custo = (item.qty || 0) * item.preco;
        inp = '<div class="tum-grid3">' +
          '<div class="tum-f"><label class="tum-lbl">Qtd (' + item.unid + ')</label><input class="tum-in" type="number" min="0" step="0.5" value="' + (item.qty || 0) + '" onchange="TUM.q.mat.' + k + '.qty=+this.value;tumRecalc()"></div>' +
          '<div class="tum-f"><label class="tum-lbl">R$/' + item.unid + '</label><input class="tum-in" type="number" min="0" value="' + item.preco + '" onchange="TUM.q.mat.' + k + '.preco=+this.value;tumRecalc()"></div>' +
          '<div class="tum-f"><label class="tum-lbl">Total</label><div class="tum-in" style="background:var(--s3);color:var(--gold2);cursor:default;">R$ ' + fm(custo) + '</div></div>' +
          '</div>';
        h += _pecaRow(k, label + ' (' + item.unid + ')', item.on,
          (item.qty || 0) + ' ' + item.unid,
          item.on ? 'R$ ' + fm(custo) : '',
          inp, 'tumTogMat'
        );
      }
    });
    h += '</div>';

    h += '</div>';
    h += _wNav(true, true, 'Acabamentos →');
    return h;
  }

  // ──────────────────────────────────────────────────────────────────────
  // ETAPA 5 — ACABAMENTOS
  // Mão de obra · Acabamentos especiais · Lápide / Cruz / Foto
  // ──────────────────────────────────────────────────────────────────────
  function _sAcabamentos() {
    var q = TUM.q;
    var h = '<div class="tum-sec">';

    // Mão de obra
    h += _wTitle('🔨 Mão de Obra');
    h += '<div class="tum-peca-list">';
    Object.keys(TUM.MDO_LABELS).forEach(function (k) {
      var item  = q.mdo[k]; if (!item) return;
      var label = TUM.MDO_LABELS[k];
      var inp;
      if (k === 'riscoQuebra' || k === 'dificuldade') {
        inp = '<div class="tum-f"><label class="tum-lbl">Percentual %</label>' +
          '<input class="tum-in" type="number" min="0" max="20" value="' + (item.perc || 0) + '" onchange="TUM.q.mdo.' + k + '.perc=+this.value;tumRecalc()"></div>';
      } else if ('diaria' in item) {
        inp = '<div class="tum-grid2">' +
          '<div class="tum-f"><label class="tum-lbl">Horas</label><input class="tum-in" type="number" min="0" value="' + (item.horas || 8) + '" onchange="TUM.q.mdo.' + k + '.horas=+this.value;tumRecalc()"></div>' +
          '<div class="tum-f"><label class="tum-lbl">Diária R$</label><input class="tum-in" type="number" min="0" value="' + item.diaria + '" onchange="TUM.q.mdo.' + k + '.diaria=+this.value;tumRecalc()"></div>' +
          '</div>';
      } else {
        inp = '<div class="tum-grid2">' +
          _custoVendaInputs('mdo.' + k, 'custo', 'venda', item.custo || 0, item.venda || 0, 'Custo R$', 'Venda R$') +
          '</div>';
      }
      h += _pecaRow(k, label, item.on, '', '', inp, 'tumTogMdo');
    });
    h += '</div>';

    // Acabamentos especiais
    h += _wTitle('✨ Acabamentos Especiais', 20);
    h += '<div class="tum-peca-list">';
    Object.keys(TUM.ACAB_LABELS).forEach(function (k) {
      var item  = q.acab[k]; if (!item) return;
      var label = TUM.ACAB_LABELS[k];
      var custo = (item.qty || 0) * (item.custo || 0);
      var venda = (item.qty || 0) * (item.venda || 0);
      h += _pecaRow(k, label, item.on,
        (item.qty || 0) + ' ' + item.unid,
        item.on ? 'custo R$ ' + fm(custo) + ' · venda R$ ' + fm(venda) : '',
        '<div class="tum-grid3">' +
        '<div class="tum-f"><label class="tum-lbl">Qtd (' + item.unid + ')</label><input class="tum-in" type="number" step="0.01" min="0" value="' + (item.qty || 0) + '" onchange="TUM.q.acab.' + k + '.qty=+this.value;tumRecalc()"></div>' +
        '<div class="tum-f"><label class="tum-lbl">Custo R$/' + item.unid + '</label><input class="tum-in" type="number" min="0" value="' + (item.custo || 0) + '" onchange="TUM.q.acab.' + k + '.custo=+this.value;tumRecalc()"></div>' +
        '<div class="tum-f"><label class="tum-lbl">Venda R$/' + item.unid + '</label><input class="tum-in" type="number" min="0" value="' + (item.venda || 0) + '" onchange="TUM.q.acab.' + k + '.venda=+this.value;tumRecalc()"></div>' +
        '</div>',
        'tumTogAcab'
      );
    });
    h += '</div>';

    // ── Extras Memoriais ──────────────────────────────────────────────
    h += _wTitle('🏛️ Extras Memoriais', 20);

    // Lápide
    var lp = q.lapide;
    h += _extraSecHeader('📜 Lápide', 'lapide', lp.on);
    if (lp.on) {
      var custoLap = lp.custo + (lp.linhas * lp.custoPorLinha);
      var vendaLap  = lp.venda + (lp.linhas * lp.vendaPorLinha);
      h += '<div class="tum-extra-body">';
      h += '<div class="tum-grid2">';
      h += '<div class="tum-f"><label class="tum-lbl">Tipo de Lápide</label>' +
        '<select class="tum-in" onchange="TUM.q.lapide.tipo=this.value;tumRecalc()">' +
        [['padrao','Padrão'],['personalizada','Personalizada'],['bronze','Placa Bronze']].map(function (o) {
          return '<option value="' + o[0] + '"' + (lp.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>';
      h += '<div class="tum-f"><label class="tum-lbl">Linhas de Texto</label>' +
        '<input class="tum-in" type="number" min="1" max="12" value="' + lp.linhas + '" onchange="TUM.q.lapide.linhas=+this.value;tumRecalc()"></div>';
      h += '</div>';
      h += '<div class="tum-grid2" style="margin-top:8px;">';
      h += _custoVendaInputs('lapide', 'custo', 'venda', lp.custo, lp.venda, 'Custo placa R$', 'Venda placa R$');
      h += '</div>';
      h += _miniResumo('Lápide', custoLap, vendaLap);
      h += '<div class="tum-f" style="margin-top:8px;"><label class="tum-lbl">Texto</label>' +
        '<textarea class="tum-in" rows="2" style="resize:vertical;" placeholder="Aqui jaz..." onchange="TUM.q.lapide.texto=this.value">' + (lp.texto || '') + '</textarea></div>';
      h += '</div>';
    }

    // Cruz
    var cr = q.cruz;
    h += _extraSecHeader('✝️ Cruz', 'cruz', cr.on);
    if (cr.on) {
      h += '<div class="tum-extra-body">';
      h += '<div class="tum-grid2">';
      h += '<div class="tum-f"><label class="tum-lbl">Material</label>' +
        '<select class="tum-in" onchange="TUM.q.cruz.tipo=this.value;tumRecalc()">' +
        [['marmore','Mármore'],['granito','Granito'],['metal','Metal Pintado'],['inox','Inox']].map(function (o) {
          return '<option value="' + o[0] + '"' + (cr.tipo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>';
      h += '<div class="tum-f"><label class="tum-lbl">Modelo</label>' +
        '<select class="tum-in" onchange="TUM.q.cruz.modelo=this.value;tumRecalc()">' +
        [['simples','Simples'],['lavrada','Lavrada / Trabalhada'],['com_base','Com Base']].map(function (o) {
          return '<option value="' + o[0] + '"' + (cr.modelo === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>';
      h += '</div>';
      h += '<div class="tum-grid2" style="margin-top:8px;">';
      h += _custoVendaInputs('cruz', 'custo', 'venda', cr.custo, cr.venda, 'Custo R$', 'Venda R$');
      h += '</div>';
      h += _miniResumo('Cruz', cr.custo, cr.venda);
      h += '</div>';
    }

    // Foto Porcelana
    var ft = q.foto;
    h += _extraSecHeader('📷 Foto Porcelana', 'foto', ft.on);
    if (ft.on) {
      var custoFoto = ft.custo + (ft.moldura ? ft.custoMoldura : 0);
      var vendaFoto = ft.venda + (ft.moldura ? ft.vendaMoldura : 0);
      h += '<div class="tum-extra-body">';
      h += '<div class="tum-grid2">';
      h += '<div class="tum-f"><label class="tum-lbl">Tamanho</label>' +
        '<select class="tum-in" onchange="TUM.q.foto.tamanho=this.value;tumRecalc()">' +
        [['10x15','10×15 cm'],['15x20','15×20 cm'],['20x25','20×25 cm'],['oval','Oval']].map(function (o) {
          return '<option value="' + o[0] + '"' + (ft.tamanho === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
        }).join('') + '</select></div>';
      h += '<div class="tum-f"><label class="tum-lbl">Com Moldura?</label>' +
        '<label style="display:flex;align-items:center;gap:8px;margin-top:12px;cursor:pointer;">' +
        '<input type="checkbox"' + (ft.moldura ? ' checked' : '') + ' style="accent-color:var(--gold);" onchange="TUM.q.foto.moldura=this.checked;tumRecalc()">' +
        '<span style="font-size:.72rem;">Sim, com moldura</span></label></div>';
      h += '</div>';
      h += '<div class="tum-grid2" style="margin-top:8px;">';
      h += _custoVendaInputs('foto', 'custo', 'venda', ft.custo, ft.venda, 'Custo foto R$', 'Venda foto R$');
      h += '</div>';
      if (ft.moldura) {
        h += '<div class="tum-grid2" style="margin-top:4px;">';
        h += _custoVendaInputs('foto', 'custoMoldura', 'vendaMoldura', ft.custoMoldura, ft.vendaMoldura, 'Custo moldura R$', 'Venda moldura R$');
        h += '</div>';
      }
      h += _miniResumo('Foto Porcelana', custoFoto, vendaFoto);
      h += '</div>';
    }

    h += '</div>';
    h += _wNav(true, true, 'Ver Resumo →');
    return h;
  }

  // ──────────────────────────────────────────────────────────────────────
  // ETAPA 6 — RESUMO
  // Usa a função _tumResumo() existente do app-tumulos.js
  // ──────────────────────────────────────────────────────────────────────
  function _sResumo() {
    var h = '';
    if (typeof _tumResumo === 'function') {
      h += _tumResumo();
    } else {
      h += '<div class="tum-sec"><div style="color:var(--t3);padding:24px;text-align:center;">Resumo não disponível.<br>Verifique se app-tumulos.js está carregado.</div></div>';
    }
    h += _wNav(true, false, '', true);
    return h;
  }

  // ──────────────────────────────────────────────────────────────────────
  // CSS DO WIZARD
  // ──────────────────────────────────────────────────────────────────────
  (function _injectCSS() {
    var s = document.createElement('style');
    s.textContent = `
      /* ── HERO ─────────────────────────────────────────────────── */
      .wiz-hero {
        display:flex; justify-content:space-between; align-items:center;
        padding:13px 16px; background:var(--s2);
        border-bottom:1px solid var(--bd); position:sticky; top:0; z-index:12;
      }
      .wiz-hero-L { display:flex; align-items:center; gap:10px; }
      .wiz-hero-icon { font-size:1.55rem; line-height:1; }
      .wiz-hero-title {
        font-size:.56rem; letter-spacing:2px; text-transform:uppercase;
        color:var(--gold3); font-weight:700;
      }
      .wiz-hero-sub { font-size:.6rem; color:var(--t3); margin-top:2px; }
      .wiz-hero-R   { text-align:right; }
      .wiz-hero-val {
        font-family:Cormorant Garamond,serif; font-size:1.5rem;
        font-weight:700; color:var(--gold2); line-height:1.1;
      }
      .wiz-hero-lucro { font-size:.57rem; color:#4cda80; margin-top:2px; }

      /* ── PROGRESS BAR ─────────────────────────────────────────── */
      .wiz-prog { height:3px; background:var(--s3); }
      .wiz-prog-bar {
        height:100%;
        background:linear-gradient(90deg, var(--gold3), var(--gold));
        transition:width .35s ease; border-radius:0 2px 2px 0;
      }

      /* ── STEPPER ──────────────────────────────────────────────── */
      .wiz-stepper {
        display:flex; align-items:center; padding:10px 14px;
        background:var(--s1); border-bottom:1px solid var(--bd);
        overflow-x:auto; -webkit-overflow-scrolling:touch;
        scrollbar-width:none;
      }
      .wiz-stepper::-webkit-scrollbar { display:none; }

      .wiz-stp {
        display:flex; flex-direction:column; align-items:center;
        gap:3px; cursor:pointer; min-width:48px; flex-shrink:0;
        opacity:.35; transition:opacity .2s; padding:2px 0;
      }
      .wiz-stp.wiz-on   { opacity:1; }
      .wiz-stp.wiz-done { opacity:.65; }

      .wiz-stp-num {
        width:24px; height:24px; border-radius:50%;
        background:var(--s3); border:1.5px solid var(--bd2);
        display:flex; align-items:center; justify-content:center;
        font-size:.6rem; font-weight:700; color:var(--t4);
        transition:all .2s;
      }
      .wiz-stp.wiz-on .wiz-stp-num {
        background:var(--gold); border-color:var(--gold);
        color:#0e0e12; box-shadow:0 0 10px rgba(201,168,76,.45);
      }
      .wiz-stp.wiz-done .wiz-stp-num {
        background:rgba(76,218,128,.12);
        border-color:rgba(76,218,128,.45); color:#4cda80;
      }

      .wiz-stp-icon { font-size:.78rem; }
      .wiz-stp-lbl  {
        font-size:.42rem; text-transform:uppercase; letter-spacing:.5px;
        color:var(--t4); white-space:nowrap;
      }
      .wiz-stp.wiz-on   .wiz-stp-lbl { color:var(--gold3); }
      .wiz-stp.wiz-done .wiz-stp-lbl { color:rgba(76,218,128,.65); }

      .wiz-conn {
        flex:1; height:1.5px; background:var(--bd2);
        min-width:5px; max-width:18px; margin-bottom:20px;
      }
      .wiz-conn.wiz-conn-done { background:rgba(76,218,128,.22); }

      /* ── SECTION TITLES ───────────────────────────────────────── */
      .wiz-stitle {
        font-size:.57rem; letter-spacing:2px; text-transform:uppercase;
        color:var(--gold3); font-weight:700;
        padding:14px 16px 8px;
        border-bottom:1px solid rgba(201,168,76,.07);
      }

      /* ── OPTIONAL TAG ─────────────────────────────────────────── */
      .wiz-opt-tag {
        font-size:.52rem; color:var(--t4); padding:4px 16px 0;
        font-style:italic; letter-spacing:.5px;
      }

      /* ── INFO BOX ─────────────────────────────────────────────── */
      .wiz-info-box {
        margin:8px 16px; padding:9px 12px;
        background:rgba(201,168,76,.04); border:1px solid rgba(201,168,76,.11);
        border-radius:9px; font-size:.63rem; color:var(--t3); line-height:1.5;
      }

      /* ── SEPARATOR ────────────────────────────────────────────── */
      .wiz-sep {
        font-size:.55rem; color:var(--t4); text-align:center;
        padding:10px 16px 4px; letter-spacing:1.5px; text-transform:uppercase;
      }

      /* ── GAVETA CARDS ─────────────────────────────────────────── */
      .wiz-gav-grid {
        display:grid; grid-template-columns:repeat(4,1fr); gap:8px; padding:12px 16px;
      }
      .wiz-gav-card {
        background:var(--s3); border:2px solid var(--bd2);
        border-radius:12px; padding:14px 6px; text-align:center;
        cursor:pointer; transition:all .2s;
      }
      .wiz-gav-card.on {
        border-color:var(--gold); background:rgba(201,168,76,.09);
        box-shadow:0 0 12px rgba(201,168,76,.15);
      }
      .wiz-gav-n   { font-size:1.5rem; font-weight:800; color:var(--gold2); }
      .wiz-gav-lbl { font-size:.62rem; font-weight:700; color:var(--t2); margin-top:4px; }
      .wiz-gav-sub { font-size:.55rem; color:var(--t4); margin-top:2px; }
      .wiz-gav-card.on .wiz-gav-lbl { color:var(--gold); }

      /* ── PEDRA SELECTION ──────────────────────────────────────── */
      .wiz-stone-sel {
        display:flex; justify-content:space-between; align-items:center;
        margin:10px 16px; padding:12px 14px;
        background:rgba(201,168,76,.07); border:1px solid rgba(201,168,76,.2);
        border-radius:12px;
      }
      .wiz-stone-nm { font-size:.76rem; font-weight:700; color:var(--tx); }
      .wiz-stone-pr { font-size:.62rem; color:var(--gold3); margin-top:3px; }

      .wiz-pedra-grid {
        display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:6px 16px 12px;
      }
      .wiz-pedra-opt {
        background:var(--s3); border:2px solid var(--bd2);
        border-radius:10px; padding:10px 8px; text-align:center;
        cursor:pointer; transition:all .2s;
      }
      .wiz-pedra-opt.on { border-color:var(--gold); background:rgba(201,168,76,.09); }
      .wiz-pedra-icon   { font-size:1.1rem; margin-bottom:4px; }
      .wiz-pedra-nm     { font-size:.63rem; font-weight:700; color:var(--t2); }
      .wiz-pedra-pr     { font-size:.57rem; color:var(--gold3); margin-top:2px; }

      /* ── MINI TOTAL ───────────────────────────────────────────── */
      .wiz-mini-tot {
        display:flex; justify-content:space-between; align-items:center;
        margin:12px 16px; padding:11px 14px;
        background:rgba(201,168,76,.05); border:1px solid rgba(201,168,76,.16);
        border-radius:10px;
      }
      .wiz-mini-tot span:first-child {
        font-size:.63rem; color:var(--t3); font-weight:600;
        text-transform:uppercase; letter-spacing:1px;
      }
      .wiz-mini-val {
        font-family:Cormorant Garamond,serif;
        font-size:1.1rem; color:var(--gold2); font-weight:700;
      }

      /* ── NAVIGATION BAR ───────────────────────────────────────── */
      .wiz-nav {
        display:flex; justify-content:space-between; align-items:center;
        padding:12px 16px; border-top:1px solid var(--bd);
        background:var(--s1); position:sticky; bottom:0; z-index:10;
        margin-top:10px;
      }
      .wiz-nbtn {
        min-width:110px; padding:12px 16px;
        font-size:.72rem; font-weight:700;
      }
    `;
    document.head.appendChild(s);
  })();

})();
