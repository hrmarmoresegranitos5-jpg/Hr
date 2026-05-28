// ══════════════════════════════════════════════════════════════════════
// ETAPA 2 — PRECIFICAÇÃO AUTOMÁTICA DE TÚMULOS
// HR Mármores e Granitos
// Carregar APÓS app-tumulos.js e app-config.js no index.html
// ══════════════════════════════════════════════════════════════════════

// Fallback: _r pode não estar disponível se app-tumulos.js ainda não carregou
if (typeof _r === 'undefined') { var _r = function(v) { return Math.round(v * 100) / 100; }; }

// ─────────────────────────────────────────────────────────────────────
// TABELA DE PREÇOS PADRÃO
// ─────────────────────────────────────────────────────────────────────
var DEF_TUM_PRECOS = {

  pedras: {
    granito_simples: { label:'Granito Simples', preco:280, unid:'m²', icon:'⬛', desc:'Cores escuras padrão' },
    granito_padrao:  { label:'Granito Padrão',  preco:380, unid:'m²', icon:'🟫', desc:'Intermediário, boa variedade' },
    granito_premium: { label:'Granito Premium', preco:540, unid:'m²', icon:'💎', desc:'Nobre, alta resistência' },
    marmore:         { label:'Mármore',          preco:700, unid:'m²', icon:'🤍', desc:'Branco / Travertino' }
  },

  // ── INSUMOS ESTRUTURAIS (preços unitários editáveis) ───────────────
  insumos: {
    cimento:    { label:'Cimento',          preco: 38,   unid:'sc 50kg', icon:'🏚️' },
    areia:      { label:'Areia média',      preco: 200,  unid:'m³',      icon:'🏖️' },
    brita:      { label:'Brita 1',          preco: 220,  unid:'m³',      icon:'🪨' },
    ferro_38:   { label:'Ferro 3/8"',       preco: 16,   unid:'kg',      icon:'🔩' },
    ferro_516:  { label:'Ferro 5/16"',      preco: 15,   unid:'kg',      icon:'🔩' },
    tela_sold:  { label:'Tela Soldada Q138',preco: 52,   unid:'m²',      icon:'🕸️' },
    bloco:      { label:'Bloco 14×19×39',   preco: 4.50, unid:'un',      icon:'🧱' },
    tijolo:     { label:'Tijolo 6 furos',   preco: 1.20, unid:'un',      icon:'🧱' },
    argamassa:  { label:'Argamassa AC-II',  preco: 32,   unid:'sc 20kg', icon:'🪣' },
    cola_epox:  { label:'Cola Epóxi (pedra)',preco: 48,  unid:'sc 5kg',  icon:'🧴' },
    rejunte:    { label:'Rejunte',          preco: 14,   unid:'kg',      icon:'🪣' },
    impermeab:  { label:'Impermeabilizante',preco: 85,   unid:'kg',      icon:'💧' }
  },

  // ── EQUIPES DE EMPREITADA (substituem diária fixa) ─────────────────
  equipes: {
    leve: {
      label:'Equipe Leve',
      desc:'1 pedreiro + 1 ajudante · Reforma e simples (sem gaveta)',
      icon:'🔨',
      custo: 800,
      venda: 1400
    },
    media: {
      label:'Equipe Média',
      desc:'2 pedreiros + 1 ajudante · 1–2 gavetas',
      icon:'🔨🔨',
      custo: 1600,
      venda: 2600
    },
    pesada: {
      label:'Equipe Pesada',
      desc:'2 pedreiros + 2 ajudantes · 3 gavetas ou altura > 2m',
      icon:'🏗️',
      custo: 2800,
      venda: 4400
    },
    critica: {
      label:'Equipe Crítica',
      desc:'3 pedreiros + 2 ajudantes · Jazigo / 4+ gavetas / IEO alto',
      icon:'⚠️',
      custo: 4200,
      venda: 6500
    }
  },

  // ── ACABAMENTOS ───────────────────────────────────────────────────
  acabamentos: {
    lateral:    { label:'Lateral / Bisotada',  preco: 85,  unid:'ml',  custoPerc:55 },
    moldura:    { label:'Moldura',             preco: 120, unid:'ml',  custoPerc:55 },
    pingadeira: { label:'Pingadeira',          preco: 80,  unid:'ml',  custoPerc:55 },
    lapide:     { label:'Lápide Padrão',       preco: 450, unid:'un',  custoPerc:60 },
    lapide_esp: { label:'Lápide Especial',     preco: 720, unid:'un',  custoPerc:55 },
    cruz:       { label:'Cruz (granito)',       preco: 320, unid:'un',  custoPerc:55 },
    foto:       { label:'Foto Porcelana',       preco: 160, unid:'un',  custoPerc:50 },
    polimento:  { label:'Polimento Especial',  preco: 150, unid:'m²',  custoPerc:53 },
    resinagem:  { label:'Resinagem',           preco: 60,  unid:'m²',  custoPerc:50 }
  },

  // MO legado (marmorista + instalação — mantidos para compatibilidade)
  mdo: {
    marmorista: { label:'Marmorista',  diaria:400, unid:'dia', desc:'Assentamento e acabamento fino' },
    instalacao: { label:'Instalação',  custo:200,  venda:350,  unid:'un' },
    acabamento: { label:'Acabamento',  custo:120,  venda:200,  unid:'un' },
    montagem:   { label:'Montagem',    custo:200,  venda:300,  unid:'un' },
    transporte: { label:'Transporte',  custo:100,  venda:150,  unid:'un' }
  },

  markupObra: 35
};

// ─────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────
function tumInitPrecos() {
  if (typeof CFG === 'undefined') return;
  if (!CFG.tumPrecos) {
    CFG.tumPrecos = JSON.parse(JSON.stringify(DEF_TUM_PRECOS));
    if (typeof svCFG === 'function') svCFG();
    return;
  }
  var tp = CFG.tumPrecos;
  // Garante grupos existem
  ['pedras','insumos','equipes','acabamentos','mdo'].forEach(function(grp) {
    if (!tp[grp]) tp[grp] = JSON.parse(JSON.stringify(DEF_TUM_PRECOS[grp]));
    Object.keys(DEF_TUM_PRECOS[grp]).forEach(function(k) {
      if (!tp[grp][k]) tp[grp][k] = JSON.parse(JSON.stringify(DEF_TUM_PRECOS[grp][k]));
    });
  });
  // Retrocompatibilidade: instâncias antigas têm 'estrutura' — preserva
  if (!tp.markupObra && tp.markupObra !== 0) tp.markupObra = 35;
}

// ═════════════════════════════════════════════════════════════════════
// MOTOR ESTRUTURAL — _calcEstruturaFuneraria()
// Recebe as dimensões reais do TUM.q e devolve:
//   { insumos: {...}, equipe: 'media', custoInsumos, custoEquipe, custoTotal }
// Compatível como camada aditiva — não altera TUM.q.estrutura existente
// ═════════════════════════════════════════════════════════════════════
function _calcEstruturaFuneraria(opts) {
  tumInitPrecos();
  opts = opts || {};

  var tp = CFG.tumPrecos;
  var q  = (opts.q) ? opts.q
         : (typeof TUM !== 'undefined' && TUM.q) ? TUM.q
         : null;

  if (!q || !q.dims) return null;

  var d   = q.dims;
  var gav = q.gavetas != null ? q.gavetas : 0;

  // ── Dimensões reais ──────────────────────────────────────────────
  var avRod    = d.avRodape      || 0;
  var altRod   = d.altRodape     || 0.10;
  var espMolSup = d.espMolduraSup || 0.05;
  var espParede = d.espParede    || 0.15;
  var espLaje   = d.espLaje      || 0.10;
  var ag        = q.altPorGaveta || 0.70;

  var c = d.comp || 2.20;
  var l = d.larg || 0.90;

  var cUtil = Math.max(0.20, _r(c - 2 * avRod));
  var lUtil = Math.max(0.20, _r(l - 2 * avRod));

  var altCorpo = _r(gav * ag + espLaje + espMolSup);
  var altTotal = _r(altRod + altCorpo + (d.espTampa || 0.03));

  // ── VOLUMES ESTRUTURAIS REAIS ────────────────────────────────────

  // 1. Fundação: laje de lastro externo, 15cm de espessura
  var volFund   = _r(c * l * 0.15);

  // 2. Paredes de alvenaria (bloco 14cm)
  //    Perímetro útil × altura do corpo × espessura
  var m2Paredes = _r((cUtil * 2 + lUtil * 2) * altCorpo);
  var volAlv    = _r(m2Paredes * espParede);

  // 3. Laje de cobertura: cUtil × lUtil × espessura
  var volLaje   = _r(cUtil * lUtil * espLaje);

  // 4. Concreto das gavetas: cada divisória interna
  //    Volume = perímetro interno × espessura × altura por gaveta
  var volConcGav = gav > 0 ? _r(gav * 0.12) : 0;

  // Volume total de concreto = fundação + laje + gavetas
  var volConcreto = _r(volFund + volLaje + volConcGav);

  // ── CONVERSÃO DE CONCRETO EM INSUMOS (traço 1:2:3, NBR 12655) ───
  // 1 m³ concreto = 7 sc cimento + 0.45 m³ areia + 0.65 m³ brita
  var sc_cimento_conc = Math.ceil(volConcreto * 7);
  var m3_areia_conc   = _r(volConcreto * 0.45);
  var m3_brita        = _r(volConcreto * 0.65);

  // ── CONVERSÃO DE ALVENARIA EM INSUMOS ───────────────────────────
  // 1 m³ alvenaria c/ bloco 14×19×39: ~12 blocos/m², ~4 sc argamassa/m³
  var nBlocos       = Math.ceil(m2Paredes * 12.5);
  var sc_arg_alv    = Math.ceil(volAlv * 4);
  var sc_cimento_alv = Math.ceil(volAlv * 2.5);  // argamassa de assentamento

  // Cimento total
  var sc_cimento_total = sc_cimento_conc + sc_cimento_alv;
  var m3_areia_total   = _r(m3_areia_conc + volAlv * 0.55);

  // ── FERRAGEM ─────────────────────────────────────────────────────
  // Ferro 3/8": vigas e pilares — base = área fundação × 8 kg/m²
  // Ferro 5/16": estribos + amarrações — 35% do peso do 3/8"
  // Tela soldada Q138: laje de cobertura
  var kg_ferro38  = _r(cUtil * lUtil * 8 + gav * 15);
  var kg_ferro516 = _r(kg_ferro38 * 0.35);
  var m2_tela     = _r(cUtil * lUtil);

  // ── IMPERMEABILIZAÇÃO ────────────────────────────────────────────
  // Área externa das paredes + laje = proteção contra umidade cemitério
  var m2_impermeab = _r((cUtil * 2 + lUtil * 2) * altCorpo + cUtil * lUtil);

  // ── COLA / REJUNTE (pedra) ───────────────────────────────────────
  var p = q.pedras || {};
  var m2Cola = ((p.tampa    && p.tampa.on)    ? (p.tampa.m2    || 0) : 0)
             + ((p.laterais && p.laterais.on)  ? (p.laterais.m2 || 0) : 0)
             + ((p.frente   && p.frente.on)    ? (p.frente.m2   || 0) : 0)
             + ((p.fundo    && p.fundo.on)     ? (p.fundo.m2    || 0) : 0);
  var sc_cola  = Math.max(1, Math.ceil(m2Cola / 4));  // 1 sc 5kg cobre ~4m²
  var kg_rejunte = _r(m2Cola * 0.5);

  // ── SCORE DE COMPLEXIDADE OPERACIONAL (0–100) ────────────────────
  // Base: dimensões e gavetas
  var scoreGav    = Math.min(40, gav * 10);
  var scoreAlt    = Math.min(20, Math.max(0, (altTotal - 0.5) / 0.5) * 5);
  var scoreVol    = Math.min(20, volConcreto * 15);
  var scoreFerro  = Math.min(10, kg_ferro38 / 15);
  var scoreArea   = Math.min(10, (c * l - 1.5) * 4);

  // IEO do orçamento atual (se disponível) amplifica o score
  var ieoFator = 1.0;
  if (typeof TUM !== 'undefined' && TUM.calc && TUM.calc.margemReal) {
    // Margem real baixa = obra complexa = maior score
    var mr = TUM.calc.margemReal;
    ieoFator = mr < 20 ? 1.25 : mr < 30 ? 1.10 : 1.0;
  }

  var scoreRaw = (scoreGav + scoreAlt + scoreVol + scoreFerro + scoreArea) * ieoFator;
  var score    = Math.min(100, Math.round(scoreRaw));

  // ── CLASSIFICAÇÃO DE EQUIPE ───────────────────────────────────────
  var equipeKey;
  if      (score < 20)  equipeKey = 'leve';
  else if (score < 45)  equipeKey = 'media';
  else if (score < 70)  equipeKey = 'pesada';
  else                  equipeKey = 'critica';

  var equipe = tp.equipes[equipeKey];

  // ── CUSTOS DE INSUMOS ─────────────────────────────────────────────
  var ti = tp.insumos;
  function _pc(key, qty) {
    return _r(qty * (ti[key] ? ti[key].preco : 0));
  }

  var custoInsumos = _r(
    _pc('cimento',   sc_cimento_total) +
    _pc('areia',     m3_areia_total)   +
    _pc('brita',     m3_brita)         +
    _pc('ferro_38',  kg_ferro38)       +
    _pc('ferro_516', kg_ferro516)      +
    _pc('tela_sold', m2_tela)          +
    _pc('bloco',     nBlocos)          +
    _pc('argamassa', sc_arg_alv)       +
    _pc('cola_epox', sc_cola)          +
    _pc('rejunte',   kg_rejunte)       +
    _pc('impermeab', m2_impermeab)
  );

  var custoEquipe = equipe ? equipe.custo : 0;
  var vendaEquipe = equipe ? equipe.venda : 0;
  var markupObra  = tp.markupObra != null ? tp.markupObra : 35;
  var vendaInsumos = _r(custoInsumos * (1 + markupObra / 100));

  var custoTotal = _r(custoInsumos + custoEquipe);
  var vendaTotal = _r(vendaInsumos + vendaEquipe);

  return {
    // Dimensões calculadas
    cUtil, lUtil, altCorpo, altTotal, altRod,

    // Volumes estruturais
    volFund, volAlv, volLaje, volConcGav, volConcreto,
    m2Paredes, m2Tela: m2_tela,

    // Quantitativos de insumos
    insumos: {
      cimento:   { qty: sc_cimento_total, unid: 'sc',  preco: ti.cimento  ? ti.cimento.preco  : 38   },
      areia:     { qty: m3_areia_total,   unid: 'm³',  preco: ti.areia    ? ti.areia.preco    : 200  },
      brita:     { qty: m3_brita,         unid: 'm³',  preco: ti.brita    ? ti.brita.preco    : 220  },
      ferro_38:  { qty: kg_ferro38,       unid: 'kg',  preco: ti.ferro_38 ? ti.ferro_38.preco : 16   },
      ferro_516: { qty: kg_ferro516,      unid: 'kg',  preco: ti.ferro_516? ti.ferro_516.preco: 15   },
      tela_sold: { qty: m2_tela,          unid: 'm²',  preco: ti.tela_sold? ti.tela_sold.preco: 52   },
      bloco:     { qty: nBlocos,          unid: 'un',  preco: ti.bloco    ? ti.bloco.preco    : 4.50 },
      argamassa: { qty: sc_arg_alv,       unid: 'sc',  preco: ti.argamassa? ti.argamassa.preco: 32   },
      cola_epox: { qty: sc_cola,          unid: 'sc',  preco: ti.cola_epox? ti.cola_epox.preco: 48   },
      rejunte:   { qty: kg_rejunte,       unid: 'kg',  preco: ti.rejunte  ? ti.rejunte.preco  : 14   },
      impermeab: { qty: m2_impermeab,     unid: 'kg',  preco: ti.impermeab? ti.impermeab.preco: 85   }
    },

    // Equipe
    score, equipeKey,
    equipeLabel: equipe ? equipe.label : '—',
    equipeDesc:  equipe ? equipe.desc  : '—',
    custoEquipe, vendaEquipe,

    // Totais
    custoInsumos, vendaInsumos,
    custoTotal, vendaTotal,
    lucroTotal: _r(vendaTotal - custoTotal)
  };
}

// ─────────────────────────────────────────────────────────────────────
// APLICAR TABELA — preenche TUM.q com os preços configurados
// ─────────────────────────────────────────────────────────────────────
function tumAplicarTabela(opts) {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var q  = TUM.q;
  if (!q.dims || typeof q.dims !== 'object') {
    if (typeof tumPatchQ === 'function') tumPatchQ();
    if (!q.dims) return;
  }
  var d = q.dims;
  opts  = opts || {};

  // 1. Pedra
  if (!q.stoneId && !q.stonePrice) {
    var pk = opts.pedraKey || q._tumPedraKey || 'granito_simples';
    q._tumPedraKey = pk;
    if (tp.pedras[pk]) q.stonePrice = tp.pedras[pk].preco;
  } else if (opts.pedraKey && !q.stoneId) {
    q._tumPedraKey = opts.pedraKey;
    if (tp.pedras[opts.pedraKey]) q.stonePrice = tp.pedras[opts.pedraKey].preco;
  }

  // 2. MO legado (marmorista + serviços)
  var tm = tp.mdo;
  if (tm.marmorista && q.mdo && q.mdo.marmorista) q.mdo.marmorista.diaria = tm.marmorista.diaria;
  ['instalacao','acabamento','montagem','transporte'].forEach(function(k) {
    if (tm[k] && q.mdo && q.mdo[k]) {
      q.mdo[k].custo = tm[k].custo;
      q.mdo[k].venda = tm[k].venda;
    }
  });

  // 3. Estrutura legada (compatibilidade com app-tumulos.js)
  if (tp.estrutura) {
    if (tp.estrutura.alvenaria_dia && q.estrutura && q.estrutura.paredes)
      q.estrutura.paredes.preco = tp.estrutura.alvenaria_dia.preco || 350;
    if (tp.estrutura.fundacao && q.estrutura && q.estrutura.fundacao)
      q.estrutura.fundacao.preco = tp.estrutura.fundacao.preco || 350;
    if (tp.estrutura.concreto && q.estrutura && q.estrutura.concreto)
      q.estrutura.concreto.preco = tp.estrutura.concreto.preco || 420;
  }

  // 4. Gaveta extra
  var gavetas = d.gavetas || q.gavetas || 1;
  var precoGavExtra = (tp.estrutura && tp.estrutura.gaveta_extra)
    ? tp.estrutura.gaveta_extra.preco : 650;
  if (gavetas > 1 && q.pedras && q.pedras.frente)
    q.pedras.frente.extra = (gavetas - 1) * precoGavExtra;

  // 5. Moldura e pingadeira
  if (tp.acabamentos.moldura    && q.pedras && q.pedras.moldura)    q.pedras.moldura.vlrMl    = tp.acabamentos.moldura.preco;
  if (tp.acabamentos.pingadeira && q.pedras && q.pedras.pingadeira) q.pedras.pingadeira.vlrMl = tp.acabamentos.pingadeira.preco;

  // 6. Lápide, Cruz, Foto
  var ta = tp.acabamentos;
  if (q.lapide && q.lapide.on && ta.lapide) {
    q.lapide.venda = ta.lapide.preco;
    if (!q.lapide.custo || opts.forceAcab)
      q.lapide.custo = Math.round(ta.lapide.preco * (ta.lapide.custoPerc||60) / 100);
  }
  if (q.cruz && q.cruz.on && ta.cruz) {
    q.cruz.venda = ta.cruz.preco;
    if (!q.cruz.custo || opts.forceAcab)
      q.cruz.custo = Math.round(ta.cruz.preco * (ta.cruz.custoPerc||55) / 100);
  }
  if (q.foto && q.foto.on && ta.foto) {
    q.foto.venda = ta.foto.preco;
    if (!q.foto.custo || opts.forceAcab)
      q.foto.custo = Math.round(ta.foto.preco * (ta.foto.custoPerc||50) / 100);
  }
}

// ─────────────────────────────────────────────────────────────────────
// SIMULADOR
// ─────────────────────────────────────────────────────────────────────
function tumSimular(pedraKey, tipoKey) {
  tumInitPrecos();
  var tp     = CFG.tumPrecos;
  var preset = TUM.TIPOS[tipoKey] || TUM.TIPOS['simples'];
  var gav    = preset.gavetas != null ? preset.gavetas : 1;
  var qd     = (typeof TUM !== 'undefined' && TUM.q && TUM.q.dims) ? TUM.q.dims : {};
  var pedra  = tp.pedras[pedraKey] || tp.pedras['granito_simples'];
  var c = qd.comp || 2.20, l = qd.larg || 0.90, a = (preset.altEst || 0.70);

  var m2Liq   = _r(c * l + c * a * 2 + l * a);
  var perdaSim = (typeof TUM !== 'undefined' && TUM.q && TUM.q.perda != null) ? TUM.q.perda : 15;
  var m2Total = _r(m2Liq * (1 + perdaSim / 100));
  var custoPedra = m2Total * pedra.preco;

  // Usa motor estrutural real se possível
  var est = null;
  if (typeof TUM !== 'undefined' && TUM.q && TUM.q.dims) {
    est = _calcEstruturaFuneraria({ q: TUM.q });
  }

  var custoEst = est ? est.custoInsumos : 0;
  var custoMo  = est ? est.custoEquipe  : 0;

  // Fallback se não há TUM.q disponível
  if (!est) {
    var scoreGavSim = gav * 10;
    var eqKey = scoreGavSim < 20 ? 'leve' : scoreGavSim < 45 ? 'media' : scoreGavSim < 70 ? 'pesada' : 'critica';
    var eq = tp.equipes[eqKey];
    custoMo = eq ? eq.custo : 800;
  }

  var mo = tp.mdo;
  var diasMarmorista = preset.diasMarmorista || 2;
  custoMo += diasMarmorista * (mo.marmorista ? mo.marmorista.diaria : 400)
           + (mo.instalacao ? mo.instalacao.custo : 200)
           + (mo.acabamento ? mo.acabamento.custo : 120)
           + (mo.transporte ? mo.transporte.custo : 100);

  var custoTotal = custoPedra + custoEst + custoMo;
  var margemSim  = (typeof TUM !== 'undefined' && TUM.q && TUM.q.margem != null)
    ? (1 + TUM.q.margem / 100) : 1.40;
  var vendaTotal = custoTotal * margemSim;

  return {
    tipo: preset.label, pedra: pedra.label,
    m2: m2Total,
    custoPedra, custoEst, custoMo,
    custoTotal, vendaTotal,
    lucro: vendaTotal - custoTotal,
    est: est
  };
}

// ─────────────────────────────────────────────────────────────────────
// CONFIG UI — Tab ⚰️ Túmulos
// ─────────────────────────────────────────────────────────────────────
function buildCfgTumPrecos() {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var h  = '';

  // ── PEDRAS ────────────────────────────────────────────────────────
  h += '<div class="tp-sec-hd">🪨 PEDRAS <span class="tp-unit-badge">R$/m²</span></div>';
  h += '<div class="tp-sec-desc">Preço por m² de pedra para túmulo (independente do catálogo geral).</div>';
  h += '<div class="tp-card-grid">';
  Object.keys(tp.pedras).forEach(function(k) {
    var it = tp.pedras[k];
    h += '<div class="tp-stone-card">';
    h += '<div class="tp-sc-top"><span class="tp-sc-icon">'+ (it.icon||'🪨') +'</span>'
       + '<div><div class="tp-sc-nm">'+ it.label +'</div>'
       + '<div class="tp-sc-desc">'+ it.desc +'</div></div></div>';
    h += '<div class="tp-sc-inp-row">'
       + '<span class="tp-r-label">R$</span>'
       + '<input class="cfginp tp-big-num" type="number" min="0" value="'+ it.preco +'" '
       + 'onchange="CFG.tumPrecos.pedras[\''+ k +'\'].preco=+this.value;svCFG();">'
       + '<span class="tp-un-label">/m²</span>'
       + '</div></div>';
  });
  h += '</div>';

  // ── INSUMOS ESTRUTURAIS ───────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">🏗️ INSUMOS ESTRUTURAIS <span class="tp-unit-badge">preço unitário</span></div>';
  h += '<div class="tp-sec-desc">O motor calcula as quantidades reais conforme as dimensões do túmulo. Aqui você define apenas o preço de cada insumo.</div>';
  h += '<div class="tp-table-wrap">';
  h += '<div class="tp-t-head-ins"><span>Insumo</span><span>Unidade</span><span>R$ Unitário</span></div>';
  Object.keys(tp.insumos).forEach(function(k) {
    var it = tp.insumos[k];
    h += '<div class="tp-t-row-ins">';
    h += '<span class="tp-t-nm"><span class="tp-ins-icon">'+ (it.icon||'📦') +'</span>'+ it.label +'</span>';
    h += '<span class="tp-t-un">'+ it.unid +'</span>';
    h += '<div class="tp-t-inp-wrap"><span class="tp-r-sm">R$</span>'
       + '<input class="cfginp tp-sm-num" type="number" min="0" step="0.01" value="'+ it.preco +'" '
       + 'onchange="CFG.tumPrecos.insumos[\''+ k +'\'].preco=+this.value;svCFG();">'
       + '</div>';
    h += '</div>';
  });
  h += '</div>';

  // ── EQUIPES DE EMPREITADA ─────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">👷 EQUIPES DE EMPREITADA</div>';
  h += '<div class="tp-sec-desc">O sistema classifica automaticamente a equipe necessária pelo volume e complexidade estrutural do projeto. Defina o custo e o valor de venda de cada nível.</div>';
  Object.keys(tp.equipes).forEach(function(k) {
    var eq = tp.equipes[k];
    var badgeColor = {leve:'#4cda80', media:'#C9A84C', pesada:'#e08f3a', critica:'#e05a5a'}[k] || 'var(--t2)';
    h += '<div class="tp-equipe-card">';
    h += '<div class="tp-eq-top">'
       + '<span class="tp-eq-icon">'+ eq.icon +'</span>'
       + '<div class="tp-eq-info">'
       + '<div class="tp-eq-nm" style="color:'+ badgeColor +';">'+ eq.label +'</div>'
       + '<div class="tp-eq-desc">'+ eq.desc +'</div>'
       + '</div></div>';
    h += '<div class="tp-eq-inputs">'
       + '<div class="tp-eq-f"><div class="tp-eq-lbl">Custo R$</div>'
       + '<input class="cfginp tp-eq-num" type="number" min="0" value="'+ eq.custo +'" '
       + 'onchange="CFG.tumPrecos.equipes[\''+ k +'\'].custo=+this.value;svCFG();">'
       + '</div>'
       + '<div class="tp-eq-f"><div class="tp-eq-lbl">Venda R$</div>'
       + '<input class="cfginp tp-eq-num" type="number" min="0" value="'+ eq.venda +'" '
       + 'onchange="CFG.tumPrecos.equipes[\''+ k +'\'].venda=+this.value;svCFG();">'
       + '</div>'
       + '</div>';
    h += '</div>';
  });

  // ── ACABAMENTOS ───────────────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">✨ ACABAMENTOS</div>';
  h += '<div class="tp-sec-desc">Preços de venda para lápides, cruzeiros e acabamentos por ml ou m².</div>';
  h += _tpTable('acabamentos', tp.acabamentos, ['label','preco','unid']);

  // ── MÃO DE OBRA MARMORISTA ─────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">🔨 MARMORISTA E SERVIÇOS</div>';
  h += '<div class="tp-sec-desc">Marmorista especializado em assentamento. Serviços têm custo e venda separados.</div>';
  h += '<div class="tp-table-wrap">';
  h += '<div class="tp-t-head"><span>Serviço</span><span>Custo / Diária</span><span>Venda</span><span>Un</span></div>';
  Object.keys(tp.mdo).forEach(function(k) {
    var it = tp.mdo[k];
    var isDiaria = 'diaria' in it;
    h += '<div class="tp-t-row">';
    h += '<span class="tp-t-nm">'+ it.label +'</span>';
    if (isDiaria) {
      h += _tpInp('mdo', k, 'diaria', it.diaria);
      h += '<span style="font-size:.6rem;color:var(--t4);">—</span>';
    } else {
      h += _tpInp('mdo', k, 'custo', it.custo);
      h += _tpInp('mdo', k, 'venda', it.venda);
    }
    h += '<span class="tp-t-un">'+ it.unid +'</span>';
    h += '</div>';
  });
  h += '</div>';

  // ── MARKUP DE OBRA ────────────────────────────────────────────────
  var markupAtual = (tp.markupObra != null ? tp.markupObra : 35);
  h += '<div class="tp-sec-hd" style="margin-top:20px;">📐 MARKUP DE OBRA</div>';
  h += '<div class="tp-sec-desc">Margem aplicada sobre insumos e materiais. Não afeta as equipes (que já têm custo/venda separados).</div>';
  h += '<div class="tp-stone-card" style="margin-bottom:6px;">';
  h += '<div class="tp-sc-inp-row" style="padding:12px;gap:8px;">';
  h += '<span class="tp-t-nm" style="flex:1;">Markup sobre Insumos e Materiais</span>';
  h += '<input class="cfginp tp-sm-num" type="number" min="0" max="200" step="1" value="'+ markupAtual +'" ';
  h += 'onchange="CFG.tumPrecos.markupObra=+this.value;svCFG();toast(\'✓ Markup atualizado!\');" ';
  h += 'style="width:68px;text-align:right;">';
  h += '<span class="tp-un-label">%</span>';
  h += '</div></div>';

  // ── SIMULADOR RÁPIDO ──────────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">⚡ SIMULADOR</div>';
  h += '<div class="tp-sec-desc">Estimativa com motor estrutural real. Não altera o orçamento aberto.</div>';
  h += '<div id="tp-sim-wrap">'+ _tpSimBox('granito_simples', 'simples') +'</div>';

  // ── RESTAURAR PADRÃO ──────────────────────────────────────────────
  h += '<div style="padding:16px 0 10px;">';
  h += '<button class="cfgbtn" style="width:100%;padding:11px;border-radius:10px;font-size:.75rem;" ';
  h += 'onclick="if(confirm(\'Restaurar todos os preços padrão de túmulos?\')){'
     + 'CFG.tumPrecos=JSON.parse(JSON.stringify(DEF_TUM_PRECOS));svCFG();'
     + 'cfgTab=10;buildCfg();toast(\'✓ Preços restaurados!\');}">';
  h += '↺ Restaurar Preços Padrão</button>';
  h += '</div>';

  return h;
}

function _tpInp(grp, key, field, val) {
  return '<div class="tp-t-inp-wrap">'
       + '<span class="tp-r-sm">R$</span>'
       + '<input class="cfginp tp-sm-num" type="number" min="0" value="'+ val +'" '
       + 'onchange="CFG.tumPrecos.'+ grp +'[\''+ key +'\'].'+ field +'=+this.value;svCFG();">'
       + '</div>';
}

function _tpTable(grp, obj, cols) {
  var h = '<div class="tp-table-wrap">';
  h += '<div class="tp-t-head"><span>Item</span><span>Preço</span><span>Un</span></div>';
  Object.keys(obj).forEach(function(k) {
    var it = obj[k];
    h += '<div class="tp-t-row">';
    h += '<span class="tp-t-nm">'+ it.label +'</span>';
    h += _tpInp(grp, k, 'preco', it.preco);
    h += '<span class="tp-t-un">'+ it.unid +'</span>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function _tpSimBox(pedraKey, tipoKey) {
  tumInitPrecos();
  var tp  = CFG.tumPrecos;
  var sim = tumSimular(pedraKey, tipoKey);

  var h = '<div class="tp-sim-box">';
  h += '<div class="tp-sim-sel">';
  h += '<div class="tp-sim-f"><div class="tp-sim-lbl">Tipo</div>'
     + '<select class="cfginp" style="width:100%;font-size:.72rem;" '
     + 'onchange="tpSimAtualiza(document.getElementById(\'_tp_pk\').value,this.value)">';
  Object.keys(TUM.TIPOS).forEach(function(k) {
    h += '<option value="'+ k +'"'+ (k===tipoKey?' selected':'') +'>'+ TUM.TIPOS[k].label +'</option>';
  });
  h += '</select></div>';

  h += '<div class="tp-sim-f"><div class="tp-sim-lbl">Pedra</div>'
     + '<select class="cfginp" id="_tp_pk" style="width:100%;font-size:.72rem;" '
     + 'onchange="tpSimAtualiza(this.value,document.querySelector(\'#tp-sim-wrap select\').value)">';
  Object.keys(tp.pedras).forEach(function(k) {
    h += '<option value="'+ k +'"'+ (k===pedraKey?' selected':'') +'>'+ tp.pedras[k].label +'</option>';
  });
  h += '</select></div>';
  h += '</div>';

  // Cards de resultado
  h += '<div class="tp-sim-result">';
  h += _tpSimCard('💎 Pedra',      sim.custoPedra, 'var(--t2)');
  h += _tpSimCard('🏗️ Insumos',    sim.custoEst,   'var(--t2)');
  h += _tpSimCard('👷 Equipe',      sim.est ? sim.est.custoEquipe : 0, 'var(--t2)');
  h += '</div>';

  // Painel de equipe classificada
  if (sim.est) {
    var e = sim.est;
    var badgeColor = {leve:'#4cda80',media:'#C9A84C',pesada:'#e08f3a',critica:'#e05a5a'}[e.equipeKey]||'var(--t2)';
    h += '<div class="tp-sim-equipe-badge" style="border-color:'+ badgeColor +';">';
    h += '<span style="font-size:.58rem;color:var(--t4);">Complexidade estrutural</span>';
    h += '<span class="tp-sim-score-bar"><span style="width:'+ e.score +'%;background:'+ badgeColor +';"></span></span>';
    h += '<span style="font-size:.72rem;font-weight:700;color:'+ badgeColor +';">'+ e.equipeLabel +'</span>';
    h += '<span style="font-size:.58rem;color:var(--t4);">'+ e.equipeDesc +'</span>';
    h += '</div>';
  }

  h += '<div class="tp-sim-totals">';
  h += '<div class="tp-sim-t-row"><span>Custo total</span><span style="color:var(--t2);">R$ '+ fm(sim.custoTotal) +'</span></div>';
  h += '<div class="tp-sim-t-row"><span>Venda ('+ Math.round((sim.vendaTotal / sim.custoTotal - 1) * 100) +'% margem)</span><span style="color:#4cda80;">R$ '+ fm(sim.vendaTotal) +'</span></div>';
  h += '<div class="tp-sim-t-row" style="font-weight:700;"><span>Lucro estimado</span><span style="color:#C9A84C;">R$ '+ fm(sim.lucro) +'</span></div>';
  h += '</div>';
  h += '<div class="tp-sim-footer">'+ sim.tipo +' · '+ sim.pedra +' · '+ sim.m2 +' m²</div>';
  h += '</div>';
  return h;
}

function _tpSimCard(label, val, color) {
  return '<div class="tp-sim-card">'
       + '<div class="tp-sim-card-lbl">'+ label +'</div>'
       + '<div class="tp-sim-card-val" style="color:'+ color +';">R$ '+ fm(val) +'</div>'
       + '</div>';
}

function tpSimAtualiza(pk, tk) {
  var wrap = document.getElementById('tp-sim-wrap');
  if (wrap) wrap.innerHTML = _tpSimBox(pk, tk);
}

// ─────────────────────────────────────────────────────────────────────
// PAINEL NO ORÇAMENTO — aba "Cliente"
// ─────────────────────────────────────────────────────────────────────
function _tumPrecPanel() {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var q  = TUM.q;
  var pk = q._tumPedraKey || 'granito_simples';
  var hasStoneSel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones &&
                    CFG.stones.find(function(s){ return s.id === q.stoneId; });

  var est = _calcEstruturaFuneraria();

  var h = '<div class="tpp-wrap" id="tpp-panel">';
  h += '<div class="tpp-hd" onclick="var p=this.parentElement;p.classList.toggle(\'tpp-open\');">';
  h += '<div class="tpp-hd-left"><span class="tpp-icon">⚡</span>'
     + '<span class="tpp-title">Precificação Automática</span></div>';
  h += '<span class="tpp-chevron">›</span>';
  h += '</div>';
  h += '<div class="tpp-body">';

  if (!hasStoneSel) {
    h += '<div class="tpp-info">Pedra não selecionada. Escolha uma categoria:</div>';
    h += '<div class="tpp-pedra-grid">';
    Object.keys(tp.pedras).forEach(function(k) {
      var p = tp.pedras[k];
      h += '<div class="tpp-po'+ (pk===k?' on':'') +'" '
         + 'onclick="TUM.q._tumPedraKey=\''+ k +'\''
         + ';tumAplicarTabela({pedraKey:\''+ k +'\'});tumRecalc();">';
      h += '<div class="tpp-po-icon">'+ p.icon +'</div>';
      h += '<div class="tpp-po-nm">'+ p.label +'</div>';
      h += '<div class="tpp-po-pr">R$ '+ p.preco +'/m²</div>';
      h += '</div>';
    });
    h += '</div>';
  } else {
    h += '<div class="tpp-stone-ok">✓ Pedra: '+ hasStoneSel.nm +' — R$ '+ fm(hasStoneSel.pr) +'/m²</div>';
  }

  // Painel estrutural inline
  if (est) {
    var badgeColor = {leve:'#4cda80',media:'#C9A84C',pesada:'#e08f3a',critica:'#e05a5a'}[est.equipeKey]||'var(--t2)';
    h += '<div class="tpp-est-wrap">';
    h += '<div class="tpp-est-hd">🏗️ Motor Estrutural</div>';

    // Score e equipe
    h += '<div class="tpp-est-equipe" style="border-color:'+ badgeColor +';">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
    h += '<span style="font-size:.64rem;font-weight:700;color:'+ badgeColor +';">'+ est.equipeLabel +'</span>';
    h += '<span style="font-size:.58rem;color:var(--t4);">Score: '+ est.score +'/100</span>';
    h += '</div>';
    h += '<div class="tpp-score-bar"><div style="width:'+ est.score +'%;background:'+ badgeColor +';height:100%;border-radius:3px;transition:width .4s;"></div></div>';
    h += '<div style="font-size:.58rem;color:var(--t4);margin-top:4px;">'+ est.equipeDesc +'</div>';
    h += '</div>';

    // Dimensões base
    h += '<div class="tpp-est-dims">';
    h += '<span>Corpo útil: '+ est.cUtil.toFixed(2) +'×'+ est.lUtil.toFixed(2) +'m</span>';
    h += '<span>Alt. total: '+ est.altTotal.toFixed(2) +'m</span>';
    h += '<span>Concreto: '+ est.volConcreto.toFixed(3) +' m³</span>';
    h += '<span>Alvenaria: '+ est.m2Paredes.toFixed(2) +' m²</span>';
    h += '</div>';

    // Resumo de insumos
    h += '<div class="tpp-ins-list">';
    var insLabels = {
      cimento:'Cimento', areia:'Areia', brita:'Brita',
      ferro_38:'Ferro 3/8"', ferro_516:'Ferro 5/16"', tela_sold:'Tela Q138',
      bloco:'Blocos', argamassa:'Argamassa', cola_epox:'Cola', rejunte:'Rejunte', impermeab:'Impermeab.'
    };
    Object.keys(est.insumos).forEach(function(k) {
      var ins = est.insumos[k];
      if (!ins.qty || ins.qty <= 0) return;
      var custo = _r(ins.qty * ins.preco);
      h += '<div class="tpp-ins-row">';
      h += '<span>'+ (insLabels[k]||k) +'</span>';
      h += '<span class="tpp-ins-qty">'+ ins.qty +' '+ ins.unid +'</span>';
      h += '<span class="tpp-ins-vlr">R$ '+ fm(custo) +'</span>';
      h += '</div>';
    });
    h += '</div>';

    h += '<div class="tpp-est-tot">';
    h += '<div class="tpp-est-tot-row"><span>Insumos</span><span>R$ '+ fm(est.custoInsumos) +'</span></div>';
    h += '<div class="tpp-est-tot-row"><span>Empreitada ('+ est.equipeLabel +')</span><span>R$ '+ fm(est.custoEquipe) +'</span></div>';
    h += '<div class="tpp-est-tot-row tpp-est-tot-bold"><span>Total Estrutura</span><span style="color:#C9A84C;">R$ '+ fm(est.custoTotal) +'</span></div>';
    h += '</div>';
    h += '</div>'; // tpp-est-wrap
  }

  h += '<button class="btn btn-g tpp-btn" '
     + 'onclick="tumAplicarTabela({pedraKey:TUM.q._tumPedraKey||\'granito_simples\',forceAcab:true});'
     + 'tumRecalc();toast(\'⚡ Preços aplicados automaticamente!\');">';
  h += '⚡ Aplicar Tabela de Preços ao Orçamento</button>';

  var r = TUM.calc;
  if (r && r.vendaTotal > 0) {
    h += '<div class="tpp-mini-sum">';
    h += '<div class="tpp-ms-row"><span>💎 Pedra</span><span>R$ '+ fm(r.vendaPedra||0) +'</span></div>';
    h += '<div class="tpp-ms-row"><span>🔨 Mão de Obra</span><span>R$ '+ fm(r.vendaMdo||0) +'</span></div>';
    h += '<div class="tpp-ms-row"><span>🧱 Estrutura</span><span>R$ '+ fm(r.custoObra||0) +'</span></div>';
    h += '<div class="tpp-ms-row"><span>✨ Extras</span><span>R$ '+ fm((r.vendaAcab||0)+(r.vendaLapide||0)+(r.vendaCruz||0)+(r.vendaFoto||0)) +'</span></div>';
    h += '<div class="tpp-ms-total"><span>💰 Valor Final</span><span>R$ '+ fm(r.venda||0) +'</span></div>';
    h += '</div>';
  }

  h += '</div></div>';
  return h;
}

// ─────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────
(function _injectCSS() {
  var s = document.createElement('style');
  s.id = 'tp-precif-styles';
  s.textContent = `
    /* ──── Config Tab Túmulos ──── */
    .tp-sec-hd {
      font-size:.56rem; letter-spacing:2px; text-transform:uppercase;
      color:var(--gold); font-weight:700;
      padding:4px 0 6px; border-bottom:1px solid rgba(201,168,76,.2); margin-bottom:8px;
      display:flex; align-items:center; gap:8px;
    }
    .tp-unit-badge {
      font-size:.5rem; background:rgba(201,168,76,.15);
      color:var(--gold3); padding:2px 6px; border-radius:4px;
      letter-spacing:.5px; font-weight:600; text-transform:none;
    }
    .tp-sec-desc { font-size:.62rem; color:var(--t3); margin-bottom:12px; line-height:1.5; }

    /* Cards de pedra */
    .tp-card-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:6px; }
    .tp-stone-card {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px; overflow:hidden;
    }
    .tp-sc-top {
      display:flex; align-items:center; gap:8px; padding:9px 11px;
      background:rgba(255,255,255,.03); border-bottom:1px solid var(--bd2);
    }
    .tp-sc-icon { font-size:1.2rem; }
    .tp-sc-nm   { font-size:.66rem; font-weight:700; color:var(--t2); }
    .tp-sc-desc { font-size:.56rem; color:var(--t4); margin-top:1px; }
    .tp-sc-inp-row { display:flex; align-items:center; gap:4px; padding:9px 11px; }
    .tp-r-label { font-size:.6rem; color:var(--t3); }
    .tp-big-num {
      background:transparent; border:none; outline:none;
      color:var(--gold2); font-family:Outfit,sans-serif;
      font-size:.92rem; font-weight:800; width:100%; text-align:center;
    }
    .tp-un-label { font-size:.58rem; color:var(--t4); white-space:nowrap; }

    /* Tabela de insumos */
    .tp-table-wrap {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px;
      overflow:hidden; margin-bottom:6px;
    }
    .tp-t-head-ins {
      display:grid; grid-template-columns:2fr 1fr 1fr; padding:7px 12px;
      background:rgba(201,168,76,.07); border-bottom:1px solid var(--bd2);
    }
    .tp-t-head-ins span { font-size:.5rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--t4); font-weight:700; }
    .tp-t-row-ins {
      display:grid; grid-template-columns:2fr 1fr 1fr; align-items:center;
      padding:6px 12px; border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tp-t-row-ins:last-child { border-bottom:none; }
    .tp-ins-icon { font-size:.8rem; margin-right:4px; }

    /* Tabela genérica (acabamentos, MO) */
    .tp-t-head {
      display:grid; grid-template-columns:2fr 1fr 1fr 0.6fr; padding:7px 12px;
      background:rgba(201,168,76,.07); border-bottom:1px solid var(--bd2);
    }
    .tp-t-head span { font-size:.5rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--t4); font-weight:700; }
    .tp-t-row {
      display:grid; grid-template-columns:2fr 1fr 1fr 0.6fr; align-items:center;
      padding:7px 12px; border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tp-t-row:last-child { border-bottom:none; }
    .tp-t-nm   { font-size:.65rem; color:var(--t2); line-height:1.4; }
    .tp-t-inp-wrap { display:flex; align-items:center; gap:3px; }
    .tp-r-sm   { font-size:.54rem; color:var(--t4); }
    .tp-t-un   { font-size:.6rem; color:var(--gold3); font-weight:600; }
    .tp-sm-num {
      background:var(--s2); border:1px solid var(--bd2); border-radius:6px;
      outline:none; color:var(--gold2); font-family:Outfit,sans-serif;
      font-size:.72rem; font-weight:700; width:68px; padding:4px 6px; text-align:right;
    }

    /* Cards de equipe */
    .tp-equipe-card {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px;
      overflow:hidden; margin-bottom:8px;
    }
    .tp-eq-top {
      display:flex; align-items:center; gap:10px;
      padding:10px 13px; border-bottom:1px solid var(--bd2);
      background:rgba(255,255,255,.02);
    }
    .tp-eq-icon { font-size:1.4rem; }
    .tp-eq-nm   { font-size:.72rem; font-weight:800; margin-bottom:2px; }
    .tp-eq-desc { font-size:.58rem; color:var(--t4); line-height:1.4; }
    .tp-eq-inputs {
      display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:10px 13px;
    }
    .tp-eq-f   { display:flex; flex-direction:column; gap:4px; }
    .tp-eq-lbl { font-size:.52rem; color:var(--t4); letter-spacing:1px; text-transform:uppercase; }
    .tp-eq-num {
      background:var(--s2); border:1px solid var(--bd2); border-radius:8px;
      outline:none; color:var(--gold2); font-family:Outfit,sans-serif;
      font-size:.82rem; font-weight:800; width:100%; padding:7px 10px; text-align:right;
    }

    /* Simulador */
    .tp-sim-box {
      background:var(--s3); border:1px solid var(--bd2); border-radius:14px;
      padding:13px; margin-bottom:6px;
    }
    .tp-sim-sel   { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
    .tp-sim-f     { display:flex; flex-direction:column; gap:4px; }
    .tp-sim-lbl   { font-size:.52rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--t4); }
    .tp-sim-result { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:10px; }
    .tp-sim-card  { background:var(--s2); border-radius:8px; padding:8px 6px; text-align:center; }
    .tp-sim-card-lbl { font-size:.52rem; color:var(--t4); margin-bottom:3px; }
    .tp-sim-card-val { font-size:.74rem; font-weight:700; }
    .tp-sim-equipe-badge {
      border:1px solid; border-radius:10px; padding:8px 10px;
      margin-bottom:8px; display:flex; flex-direction:column; gap:4px;
    }
    .tp-sim-score-bar {
      height:4px; background:rgba(255,255,255,.1); border-radius:3px; overflow:hidden;
    }
    .tp-sim-score-bar span { display:block; height:100%; border-radius:3px; }
    .tp-sim-totals { background:var(--s2); border-radius:8px; overflow:hidden; }
    .tp-sim-t-row {
      display:flex; justify-content:space-between; padding:7px 11px;
      border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tp-sim-t-row span:first-child { font-size:.64rem; color:var(--t3); }
    .tp-sim-t-row span:last-child  { font-size:.68rem; color:var(--t2); font-weight:600; }
    .tp-sim-t-row:last-child { border-bottom:none; }
    .tp-sim-footer { font-size:.58rem; color:var(--t4); text-align:center; margin-top:8px; }

    /* ──── Painel no orçamento ──── */
    .tpp-wrap {
      background:var(--s2); border:1px solid rgba(201,168,76,.3);
      border-radius:14px; overflow:hidden; margin:8px 0 12px;
    }
    .tpp-hd {
      display:flex; justify-content:space-between; align-items:center;
      padding:12px 14px; cursor:pointer; user-select:none;
    }
    .tpp-hd-left { display:flex; align-items:center; gap:8px; }
    .tpp-icon    { font-size:1.1rem; }
    .tpp-title   { font-size:.78rem; font-weight:700; color:var(--gold2); }
    .tpp-chevron {
      font-size:1.3rem; color:var(--gold3); transition:transform .3s; display:inline-block;
    }
    .tpp-wrap.tpp-open .tpp-chevron { transform:rotate(90deg); }
    .tpp-body    { display:none; padding:0 14px 14px; }
    .tpp-wrap.tpp-open .tpp-body { display:block; }

    .tpp-info     { font-size:.62rem; color:var(--t3); margin-bottom:8px; line-height:1.5; }
    .tpp-stone-ok { font-size:.66rem; color:#4cda80; background:rgba(76,218,128,.08);
                    border:1px solid rgba(76,218,128,.2); border-radius:8px;
                    padding:7px 10px; margin-bottom:10px; }
    .tpp-pedra-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px; }
    .tpp-po {
      background:var(--s3); border:1px solid var(--bd2); border-radius:10px;
      padding:8px 6px; cursor:pointer; text-align:center; transition:border-color .2s, background .2s;
    }
    .tpp-po.on { border-color:var(--gold); background:rgba(201,168,76,.1); }
    .tpp-po-icon { font-size:1.1rem; margin-bottom:3px; }
    .tpp-po-nm   { font-size:.62rem; font-weight:700; color:var(--t2); }
    .tpp-po-pr   { font-size:.58rem; color:var(--gold3); margin-top:2px; }

    /* Painel estrutural inline */
    .tpp-est-wrap {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px;
      padding:10px 12px; margin:10px 0;
    }
    .tpp-est-hd {
      font-size:.58rem; letter-spacing:1.5px; text-transform:uppercase;
      color:var(--gold3); font-weight:700; margin-bottom:8px;
    }
    .tpp-est-equipe {
      border:1px solid; border-radius:8px; padding:8px 10px; margin-bottom:8px;
    }
    .tpp-score-bar {
      height:4px; background:rgba(255,255,255,.1); border-radius:3px;
      overflow:hidden; margin:4px 0;
    }
    .tpp-est-dims {
      display:grid; grid-template-columns:1fr 1fr; gap:3px 10px;
      font-size:.6rem; color:var(--t4); margin-bottom:8px;
    }
    .tpp-ins-list {
      background:rgba(0,0,0,.2); border-radius:8px; overflow:hidden; margin-bottom:8px;
    }
    .tpp-ins-row {
      display:grid; grid-template-columns:2fr 1fr 1fr; align-items:center;
      padding:5px 10px; border-bottom:1px solid rgba(255,255,255,.03);
      font-size:.6rem;
    }
    .tpp-ins-row:last-child { border-bottom:none; }
    .tpp-ins-row span:first-child { color:var(--t3); }
    .tpp-ins-qty { color:var(--t4); font-size:.58rem; text-align:center; }
    .tpp-ins-vlr { color:var(--t2); font-weight:600; text-align:right; }
    .tpp-est-tot { background:rgba(201,168,76,.06); border-radius:8px; overflow:hidden; }
    .tpp-est-tot-row {
      display:flex; justify-content:space-between; align-items:center;
      padding:6px 10px; border-bottom:1px solid rgba(255,255,255,.04);
      font-size:.64rem; color:var(--t3);
    }
    .tpp-est-tot-row span:last-child { color:var(--t2); font-weight:600; }
    .tpp-est-tot-row:last-child { border-bottom:none; }
    .tpp-est-tot-bold { font-weight:700 !important; }
    .tpp-est-tot-bold span { font-size:.7rem !important; }

    .tpp-btn { width:100%; padding:12px; margin-top:2px; font-size:.76rem; }
    .tpp-mini-sum {
      background:var(--s3); border-radius:10px; overflow:hidden; margin-top:10px;
    }
    .tpp-ms-row {
      display:flex; justify-content:space-between; padding:7px 12px;
      border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tpp-ms-row span:first-child { font-size:.64rem; color:var(--t3); }
    .tpp-ms-row span:last-child  { font-size:.68rem; color:var(--t2); font-weight:600; }
    .tpp-ms-total {
      display:flex; justify-content:space-between; padding:9px 12px;
      background:rgba(201,168,76,.08);
    }
    .tpp-ms-total span:first-child { font-size:.7rem; color:var(--gold3); font-weight:700; }
    .tpp-ms-total span:last-child  { font-size:.82rem; color:#4cda80; font-weight:800; }
  `;
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────────────
// BOOT — após DOM pronto
// ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', function _tumPrecBoot() {

  tumInitPrecos();

  // Injeta aba ⚰️ Túmulos (tab 10)
  var cfgTabs = document.getElementById('cfgTabs');
  if (cfgTabs && !cfgTabs.querySelector('[data-cftab="10"]')) {
    var newTab = document.createElement('div');
    newTab.className = 'cfgtab';
    newTab.setAttribute('data-cftab', '10');
    newTab.textContent = '⚰️ Túmulos';
    cfgTabs.appendChild(newTab);
  }

  // Patch buildCfg → renderiza tab 10
  if (typeof buildCfg === 'function') {
    var _origBuildCfg = buildCfg;
    buildCfg = function() {
      if (typeof cfgTab !== 'undefined' && cfgTab === 10) {
        tumInitPrecos();
        var body = document.getElementById('cfgBody');
        if (body) body.innerHTML = buildCfgTumPrecos();
      } else {
        _origBuildCfg();
      }
    };
  }

  // Patch tumSetTipo → auto-aplica tabela ao trocar preset
  if (typeof tumSetTipo === 'function') {
    var _origTumSetTipo = tumSetTipo;
    tumSetTipo = function(t) {
      _origTumSetTipo(t);
      tumAplicarTabela({ pedraKey: (TUM.q._tumPedraKey || 'granito_simples') });
      if (typeof tumRecalc === 'function') tumRecalc();
    };
  }

  // Patch _tumRenderTab → injeta painel na aba "cliente"
  if (typeof _tumRenderTab === 'function') {
    var _origRenderTab = _tumRenderTab;
    _tumRenderTab = function() {
      _origRenderTab();
      if (typeof _tumTab !== 'undefined' && _tumTab === 'cliente') {
        var body = document.getElementById('tumBody');
        if (!body) return;
        var navRow = body.querySelector('.tum-nav-row');
        if (!navRow) return;
        var wasOpen = !!document.querySelector('.tpp-wrap.tpp-open');
        var wrapper = document.createElement('div');
        wrapper.innerHTML = _tumPrecPanel();
        var panel = wrapper.firstChild;
        navRow.parentNode.insertBefore(panel, navRow);
        if (wasOpen && panel) panel.classList.add('tpp-open');
      }
    };
  }

});
