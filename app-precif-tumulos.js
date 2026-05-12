// ══════════════════════════════════════════════════════════════════════
// ETAPA 2 — PRECIFICAÇÃO AUTOMÁTICA DE TÚMULOS
// HR Mármores e Granitos
// Carregar APÓS app-tumulos.js e app-config.js no index.html
// ══════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────
// TABELA DE PREÇOS PADRÃO (valores editáveis em Config → ⚰️ Túmulos)
// ─────────────────────────────────────────────────────────────────────
var DEF_TUM_PRECOS = {

  // Preço por m² — usado quando nenhuma pedra está selecionada no catálogo
  pedras: {
    granito_simples: { label:'Granito Simples', preco:280, unid:'m²', icon:'⬛', desc:'Cores escuras padrão' },
    granito_padrao:  { label:'Granito Padrão',  preco:380, unid:'m²', icon:'🟫', desc:'Intermediário, boa variedade' },
    granito_premium: { label:'Granito Premium', preco:540, unid:'m²', icon:'💎', desc:'Nobre, alta resistência' },
    marmore:         { label:'Mármore',          preco:700, unid:'m²', icon:'🤍', desc:'Branco / Travertino' }
  },

  // Serviços de estrutura e concreto
  estrutura: {
    fundacao:      { label:'Fundação',              preco:350,  unid:'un',  desc:'Escavação + base de concreto' },
    concreto:      { label:'Concreto Armado',       preco:480,  unid:'un',  desc:'Estrutura em concreto c/ armação' },
    ferragem:      { label:'Ferragem / Tela',       preco:200,  unid:'un',  desc:'Materiais de armação' },
    gaveta_extra:  { label:'Gaveta Extra (cada)',   preco:650,  unid:'un',  desc:'Cada gaveta além da primeira' },
    alvenaria_dia: { label:'Alvenaria (diária)',    preco:350,  unid:'dia', desc:'Diária de pedreiro para alvenaria' }
  },

  // Acabamentos avulsos
  acabamentos: {
    lateral:    { label:'Lateral / Bisotada',  preco:85,  unid:'ml',  custoPerc:55, desc:'Acabamento lateral em metro linear' },
    moldura:    { label:'Moldura',             preco:120, unid:'ml',  custoPerc:55, desc:'Moldura decorativa em metro linear' },
    pingadeira: { label:'Pingadeira',          preco:80,  unid:'ml',  custoPerc:55, desc:'Pingadeira de proteção' },
    lapide:     { label:'Lápide Padrão',       preco:450, unid:'un',  custoPerc:60, desc:'Lápide gravada padrão' },
    lapide_esp: { label:'Lápide Especial',     preco:720, unid:'un',  custoPerc:55, desc:'Personalizada ou placa bronze' },
    cruz:       { label:'Cruz (granito)',       preco:320, unid:'un',  custoPerc:55, desc:'Cruz em granito ou mármore' },
    foto:       { label:'Foto Porcelana',       preco:160, unid:'un',  custoPerc:50, desc:'Foto em porcelana c/ moldura' },
    polimento:  { label:'Polimento Especial',  preco:150, unid:'m²',  custoPerc:53, desc:'Polimento brilhante extra' },
    resinagem:  { label:'Resinagem',           preco:60,  unid:'m²',  custoPerc:50, desc:'Resina impermeabilizante' }
  },

  // Mão de obra específica para túmulos
  mdo: {
    marmorista: { label:'Marmorista',  diaria:400, unid:'dia', desc:'Diária do marmorista especializado' },
    ajudante:   { label:'Ajudante',    diaria:220, unid:'dia', desc:'Diária do ajudante' },
    pedreiro:   { label:'Pedreiro',    diaria:350, unid:'dia', desc:'Diária do pedreiro (usada na Construção)' },
    instalacao: { label:'Instalação',  custo:200,  venda:350,  unid:'un', desc:'Serviço de instalação' },
    acabamento: { label:'Acabamento',  custo:120,  venda:200,  unid:'un', desc:'Serviço de acabamento final' },
    montagem:   { label:'Montagem',    custo:200,  venda:300,  unid:'un', desc:'Montagem de estrutura' },
    transporte: { label:'Transporte',  custo:100,  venda:150,  unid:'un', desc:'Transporte e deslocamento' }
  }
};

// ─────────────────────────────────────────────────────────────────────
// INIT — garante CFG.tumPrecos com fallback para DEF_TUM_PRECOS
// ─────────────────────────────────────────────────────────────────────
function tumInitPrecos() {
  if (typeof CFG === 'undefined') return;
  if (!CFG.tumPrecos) {
    CFG.tumPrecos = JSON.parse(JSON.stringify(DEF_TUM_PRECOS));
    if (typeof svCFG === 'function') svCFG();
    return;
  }
  // Patch: garante que todas as chaves padrão existem (instalações antigas)
  ['pedras','estrutura','acabamentos','mdo'].forEach(function(grp) {
    if (!CFG.tumPrecos[grp]) CFG.tumPrecos[grp] = JSON.parse(JSON.stringify(DEF_TUM_PRECOS[grp]));
    Object.keys(DEF_TUM_PRECOS[grp]).forEach(function(k) {
      if (!CFG.tumPrecos[grp][k]) {
        CFG.tumPrecos[grp][k] = JSON.parse(JSON.stringify(DEF_TUM_PRECOS[grp][k]));
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────
// APLICAR TABELA — preenche TUM.q com os preços configurados
// opts.pedraKey : 'granito_simples' | 'granito_padrao' | 'granito_premium' | 'marmore'
// opts.forceAcab: true → recalcula custo de acabamentos mesmo se já preenchido
// ─────────────────────────────────────────────────────────────────────
function tumAplicarTabela(opts) {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var q  = TUM.q;
  var d  = q.dims;
  var gavetas = d.gavetas || 1;
  opts = opts || {};

  // ── 1. Pedra: se não há pedra selecionada, aplica preço da categoria
  if (!q.stoneId && !q.stonePrice) {
    var pk = opts.pedraKey || q._tumPedraKey || 'granito_simples';
    q._tumPedraKey = pk;
    if (tp.pedras[pk]) q.stonePrice = tp.pedras[pk].preco;
  } else if (opts.pedraKey && !q.stoneId) {
    // Categoria mudou explicitamente
    q._tumPedraKey = opts.pedraKey;
    if (tp.pedras[opts.pedraKey]) q.stonePrice = tp.pedras[opts.pedraKey].preco;
  }

  // ── 2. Mão de obra: diárias e valores de serviço
  var tm = tp.mdo;
  if (tm.marmorista && q.mdo.marmorista) q.mdo.marmorista.diaria = tm.marmorista.diaria;
  if (tm.ajudante   && q.mdo.ajudante)   q.mdo.ajudante.diaria   = tm.ajudante.diaria;
  ['instalacao','acabamento','montagem','transporte'].forEach(function(k) {
    if (tm[k] && q.mdo[k]) {
      q.mdo[k].custo = tm[k].custo;
      q.mdo[k].venda = tm[k].venda;
    }
  });

  // ── 3. Construção: diária do pedreiro em todas as atividades de obra
  var diariaObra = (tp.estrutura.alvenaria_dia ? tp.estrutura.alvenaria_dia.preco : 350);
  Object.keys(q.obra).forEach(function(k) {
    if (q.obra[k] && 'diaria' in q.obra[k]) q.obra[k].diaria = diariaObra;
  });

  // ── 4. Concreto + ferragem: se gaveta_dupla ou mais, garante estrutura ativa
  if (gavetas >= 2) {
    if (q.obra.concreto) {
      q.obra.concreto.on   = true;
      q.obra.concreto.dias = Math.max(1, gavetas - 1);
      if (tp.estrutura.concreto) q.obra.concreto.diaria = tp.estrutura.concreto.preco; // diária representa custo fixo nesse caso
    }
    if (q.obra.levantamento) q.obra.levantamento.on = true;
    if (q.obra.gavetas)      q.obra.gavetas.on      = true;
  }

  // ── 5. Gaveta extra: cobra diferença de cada gaveta além da primeira na peça
  var precoGavExtra = tp.estrutura.gaveta_extra ? tp.estrutura.gaveta_extra.preco : 650;
  if (gavetas > 1 && q.pedras.gavetas) {
    q.pedras.gavetas.on    = true;
    q.pedras.gavetas.extra = (gavetas - 1) * precoGavExtra;
  }

  // ── 6. Moldura e pingadeira: vlrMl vira preço da tabela
  if (tp.acabamentos.moldura    && q.pedras.moldura)    q.pedras.moldura.vlrMl    = tp.acabamentos.moldura.preco;
  if (tp.acabamentos.pingadeira && q.pedras.pingadeira) q.pedras.pingadeira.vlrMl = tp.acabamentos.pingadeira.preco;

  // ── 7. Acabamentos especiais: venda e custo
  function _apAcab(acabKey, tpKey) {
    if (!tp.acabamentos[tpKey] || !q.acab[acabKey]) return;
    var item = tp.acabamentos[tpKey];
    q.acab[acabKey].venda = item.preco;
    if (!q.acab[acabKey].custo || opts.forceAcab)
      q.acab[acabKey].custo = Math.round(item.preco * (item.custoPerc || 55) / 100);
  }
  _apAcab('bisote',    'lateral');
  _apAcab('polimento', 'polimento');
  _apAcab('resinagem', 'resinagem');
  _apAcab('chanfro',   'lateral');  // chanfro usa mesmo custo base que lateral

  // ── 8. Lápide, Cruz, Foto: atualiza se item está ativo
  var ta = tp.acabamentos;
  if (q.lapide.on && ta.lapide) {
    q.lapide.venda = ta.lapide.preco;
    if (!q.lapide.custo || opts.forceAcab)
      q.lapide.custo = Math.round(ta.lapide.preco * (ta.lapide.custoPerc||60) / 100);
  }
  if (q.cruz.on && ta.cruz) {
    q.cruz.venda = ta.cruz.preco;
    if (!q.cruz.custo || opts.forceAcab)
      q.cruz.custo = Math.round(ta.cruz.preco * (ta.cruz.custoPerc||55) / 100);
  }
  if (q.foto.on && ta.foto) {
    q.foto.venda = ta.foto.preco;
    if (!q.foto.custo || opts.forceAcab)
      q.foto.custo = Math.round(ta.foto.preco * (ta.foto.custoPerc||50) / 100);
  }
}

// ─────────────────────────────────────────────────────────────────────
// SIMULADOR — estimativa por tipo + categoria de pedra (não altera TUM.q)
// ─────────────────────────────────────────────────────────────────────
function tumSimular(pedraKey, tipoKey) {
  tumInitPrecos();
  var tp     = CFG.tumPrecos;
  var preset = TUM.TIPOS[tipoKey] || TUM.TIPOS['simples'];
  var d      = preset.dims;
  var gav    = d.gavetas || 1;
  var pedra  = tp.pedras[pedraKey] || tp.pedras['granito_simples'];
  var c = d.comp, l = d.larg, a = d.alt;

  // Área com 15% de perda
  var m2Liq   = c*l*2 + c*a*2 + l*a*2;
  var m2Total = Math.round(m2Liq * 1.15 * 100) / 100;

  // Custo pedra
  var custoPedra = m2Total * pedra.preco;

  // Estrutura baseada no preset
  var te = tp.estrutura;
  var custoEst = 0;
  if (preset.obra.indexOf('fundacao')     > -1) custoEst += te.fundacao     ? te.fundacao.preco     : 0;
  if (preset.obra.indexOf('levantamento') > -1) custoEst += te.alvenaria_dia ? te.alvenaria_dia.preco * 2 : 0;
  if (preset.obra.indexOf('concreto')     > -1) custoEst += te.concreto     ? te.concreto.preco     : 0;
  if (preset.obra.indexOf('gavetas')      > -1 && gav > 1)
    custoEst += (gav - 1) * (te.gaveta_extra ? te.gaveta_extra.preco : 650);

  // MO
  var mo = tp.mdo;
  var diasMdo = preset.diasMdo || 2;
  var custoMo = diasMdo * ((mo.marmorista ? mo.marmorista.diaria : 400) + (mo.ajudante ? mo.ajudante.diaria : 220));
  if (preset.mdo.indexOf('instalacao') > -1) custoMo += mo.instalacao ? mo.instalacao.custo : 200;
  if (preset.mdo.indexOf('acabamento') > -1) custoMo += mo.acabamento ? mo.acabamento.custo : 120;
  if (preset.mdo.indexOf('montagem')   > -1) custoMo += mo.montagem   ? mo.montagem.custo   : 200;
  if (preset.mdo.indexOf('transporte') > -1) custoMo += mo.transporte ? mo.transporte.custo : 100;

  var custoTotal = custoPedra + custoEst + custoMo;
  var vendaTotal = custoTotal * 1.40;

  return {
    tipo: preset.label, pedra: pedra.label,
    m2: m2Total,
    custoPedra: custoPedra, custoEst: custoEst, custoMo: custoMo,
    custoTotal: custoTotal, vendaTotal: vendaTotal,
    lucro: vendaTotal - custoTotal
  };
}

// ─────────────────────────────────────────────────────────────────────
// CONFIG UI — Tab 7 "⚰️ Túmulos"
// ─────────────────────────────────────────────────────────────────────
function buildCfgTumPrecos() {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var h  = '';

  // ── PEDRAS ────────────────────────────────────────────────────────
  h += '<div class="tp-sec-hd">🪨 PEDRAS <span class="tp-unit-badge">R$/m²</span></div>';
  h += '<div class="tp-sec-desc">Preço por m² de pedra para túmulo (independente do catálogo geral de pedras).</div>';
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

  // ── ESTRUTURA ─────────────────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">🏗️ ESTRUTURA</div>';
  h += '<div class="tp-sec-desc">Serviços de construção civil. "Gaveta Extra" é cobrada por cada gaveta além da primeira.</div>';
  h += _tpTable('estrutura', tp.estrutura, ['label','preco','unid']);

  // ── ACABAMENTOS ───────────────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">✨ ACABAMENTOS</div>';
  h += '<div class="tp-sec-desc">Preços de venda para lápides, cruzeiros e acabamentos por ml ou m².</div>';
  h += _tpTable('acabamentos', tp.acabamentos, ['label','preco','unid']);

  // ── MÃO DE OBRA ───────────────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">🔨 MÃO DE OBRA</div>';
  h += '<div class="tp-sec-desc">Diárias e serviços. Pedreiro alimenta a aba Construção. Serviços têm custo e venda separados.</div>';
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

  // ── SIMULADOR RÁPIDO ──────────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">⚡ SIMULADOR</div>';
  h += '<div class="tp-sec-desc">Estimativa instantânea com base nesta tabela. Não altera o orçamento em aberto.</div>';
  h += '<div id="tp-sim-wrap">'+ _tpSimBox('granito_simples', 'simples') +'</div>';

  // ── RESTAURAR PADRÃO ──────────────────────────────────────────────
  h += '<div style="padding:16px 0 10px;">';
  h += '<button class="cfgbtn" style="width:100%;padding:11px;border-radius:10px;font-size:.75rem;" ';
  h += 'onclick="if(confirm(\'Restaurar todos os preços padrão de túmulos?\')){'
     + 'CFG.tumPrecos=JSON.parse(JSON.stringify(DEF_TUM_PRECOS));svCFG();'
     + 'cfgTab=7;buildCfg();toast(\'✓ Preços restaurados!\');}">';
  h += '↺ Restaurar Preços Padrão</button>';
  h += '</div>';

  return h;
}

// Helper: linha de input inline para a tabela de config
function _tpInp(grp, key, field, val) {
  return '<div class="tp-t-inp-wrap">'
       + '<span class="tp-r-sm">R$</span>'
       + '<input class="cfginp tp-sm-num" type="number" min="0" value="'+ val +'" '
       + 'onchange="CFG.tumPrecos.'+ grp +'[\''+ key +'\'].'+ field +'=+this.value;svCFG();">'
       + '</div>';
}

// Helper: tabela genérica para estrutura e acabamentos
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

// Simulador: caixa interativa de estimativa
function _tpSimBox(pedraKey, tipoKey) {
  tumInitPrecos();
  var tp  = CFG.tumPrecos;
  var sim = tumSimular(pedraKey, tipoKey);

  var h = '<div class="tp-sim-box">';

  // Seletores tipo + pedra
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

  // Resultado
  h += '<div class="tp-sim-result">';
  h += _tpSimCard('Pedra',      sim.custoPedra, 'var(--t2)');
  h += _tpSimCard('Estrutura',  sim.custoEst,   'var(--t2)');
  h += _tpSimCard('Mão de Obra',sim.custoMo,    'var(--t2)');
  h += '</div>';
  h += '<div class="tp-sim-totals">';
  h += '<div class="tp-sim-t-row"><span>Custo total</span><span style="color:var(--t2);">R$ '+ fm(sim.custoTotal) +'</span></div>';
  h += '<div class="tp-sim-t-row"><span>Venda (40% margem)</span><span style="color:#4cda80;">R$ '+ fm(sim.vendaTotal) +'</span></div>';
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
// PAINEL DE PRECIFICAÇÃO RÁPIDA — injetado na aba "Cliente" do orçamento
// ─────────────────────────────────────────────────────────────────────
function _tumPrecPanel() {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var q  = TUM.q;
  var pk = q._tumPedraKey || 'granito_simples';
  var hasStoneSel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones &&
                    CFG.stones.find(function(s){ return s.id === q.stoneId; });

  var h = '<div class="tpp-wrap" id="tpp-panel">';
  h += '<div class="tpp-hd" onclick="var p=this.parentElement;p.classList.toggle(\'tpp-open\');">';
  h += '<div class="tpp-hd-left"><span class="tpp-icon">⚡</span>'
     + '<span class="tpp-title">Precificação Automática</span></div>';
  h += '<span class="tpp-chevron">›</span>';
  h += '</div>';
  h += '<div class="tpp-body">';

  if (!hasStoneSel) {
    // ── Seletor de categoria de pedra ────────────────────────────
    h += '<div class="tpp-info">Pedra não selecionada. Escolha uma categoria para estimar o custo:</div>';
    h += '<div class="tpp-pedra-grid">';
    Object.keys(tp.pedras).forEach(function(k) {
      var p = tp.pedras[k];
      h += '<div class="tpp-po'+ (pk===k?' on':'') +'" '
         + 'onclick="TUM.q._tumPedraKey=\''+ k +'\'';
      h += ';tumAplicarTabela({pedraKey:\''+ k +'\'});tumRecalc();">';
      h += '<div class="tpp-po-icon">'+ p.icon +'</div>';
      h += '<div class="tpp-po-nm">'+ p.label +'</div>';
      h += '<div class="tpp-po-pr">R$ '+ p.preco +'/m²</div>';
      h += '</div>';
    });
    h += '</div>';
  } else {
    h += '<div class="tpp-stone-ok">✓ Pedra: '+ hasStoneSel.nm +' — R$ '+ fm(hasStoneSel.pr) +'/m²</div>';
  }

  h += '<button class="btn btn-g tpp-btn" '
     + 'onclick="tumAplicarTabela({pedraKey:TUM.q._tumPedraKey||\'granito_simples\',forceAcab:true});'
     + 'tumRecalc();toast(\'⚡ Preços aplicados automaticamente!\');">';
  h += '⚡ Aplicar Tabela de Preços ao Orçamento</button>';

  // ── Mini-resumo se já há cálculo ────────────────────────────────
  var r = TUM.calc;
  if (r && r.vendaTotal > 0) {
    h += '<div class="tpp-mini-sum">';
    h += '<div class="tpp-ms-row"><span>💎 Pedra</span><span>R$ '+ fm(r.vendaPedra||0) +'</span></div>';
    h += '<div class="tpp-ms-row"><span>🔨 Mão de Obra</span><span>R$ '+ fm(r.vendaMdo||0) +'</span></div>';
    h += '<div class="tpp-ms-row"><span>🧱 Construção</span><span>R$ '+ fm(r.custoObra||0) +'</span></div>';
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
      transition:border-color .2s;
    }
    .tp-sc-top {
      display:flex; align-items:center; gap:8px; padding:9px 11px;
      background:rgba(255,255,255,.03); border-bottom:1px solid var(--bd2);
    }
    .tp-sc-icon { font-size:1.2rem; }
    .tp-sc-nm   { font-size:.66rem; font-weight:700; color:var(--t2); }
    .tp-sc-desc { font-size:.56rem; color:var(--t4); margin-top:1px; }
    .tp-sc-inp-row {
      display:flex; align-items:center; gap:4px; padding:9px 11px;
    }
    .tp-r-label { font-size:.6rem; color:var(--t3); }
    .tp-big-num {
      background:transparent; border:none; outline:none;
      color:var(--gold2); font-family:Outfit,sans-serif;
      font-size:.92rem; font-weight:800; width:100%; text-align:center;
    }
    .tp-un-label { font-size:.58rem; color:var(--t4); white-space:nowrap; }

    /* Tabelas de estrutura / acabamentos */
    .tp-table-wrap {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px;
      overflow:hidden; margin-bottom:6px;
    }
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
    .tp-t-nm { font-size:.65rem; color:var(--t2); line-height:1.4; }
    .tp-t-inp-wrap { display:flex; align-items:center; gap:3px; }
    .tp-r-sm  { font-size:.54rem; color:var(--t4); }
    .tp-t-un  { font-size:.6rem; color:var(--gold3); font-weight:600; }
    .tp-sm-num {
      background:var(--s2); border:1px solid var(--bd2); border-radius:6px;
      outline:none; color:var(--gold2); font-family:Outfit,sans-serif;
      font-size:.72rem; font-weight:700; width:68px; padding:4px 6px; text-align:right;
    }
    /* Tabela MO tem 4 colunas */
    .tp-t-head:has(span:nth-child(4)),
    .tp-t-row:has(.tp-t-nm:only-of-type) { grid-template-columns:2fr 1fr 1fr 0.6fr; }

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
    .tp-sim-totals { background:var(--s2); border-radius:8px; overflow:hidden; }
    .tp-sim-t-row {
      display:flex; justify-content:space-between; padding:7px 11px;
      border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tp-sim-t-row span:first-child  { font-size:.64rem; color:var(--t3); }
    .tp-sim-t-row span:last-child   { font-size:.68rem; color:var(--t2); font-weight:600; }
    .tp-sim-t-row:last-child { border-bottom:none; }
    .tp-sim-footer { font-size:.58rem; color:var(--t4); text-align:center; margin-top:8px; }

    /* ──── Painel no orçamento (aba Cliente) ──── */
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

    .tpp-info      { font-size:.62rem; color:var(--t3); margin-bottom:8px; line-height:1.5; }
    .tpp-stone-ok  { font-size:.66rem; color:#4cda80; background:rgba(76,218,128,.08);
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
// MONKEY-PATCHES — carregam após a página estar pronta
// ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', function _tumPrecBoot() {

  // 1. Init preços no CFG
  tumInitPrecos();

  // 2. Injeta aba "⚰️ Túmulos" na barra de config (tab 7)
  var cfgTabs = document.getElementById('cfgTabs');
  if (cfgTabs && !cfgTabs.querySelector('[data-cftab="7"]')) {
    var newTab = document.createElement('div');
    newTab.className = 'cfgtab';
    newTab.setAttribute('data-cftab', '7');
    newTab.textContent = '⚰️ Túmulos';
    cfgTabs.appendChild(newTab);
  }

  // 3. Patch buildCfg → renderiza tab 7 com tabela de preços
  if (typeof buildCfg === 'function') {
    var _origBuildCfg = buildCfg;
    buildCfg = function() {
      if (typeof cfgTab !== 'undefined' && cfgTab === 7) {
        tumInitPrecos();
        var body = document.getElementById('cfgBody');
        if (body) body.innerHTML = buildCfgTumPrecos();
      } else {
        _origBuildCfg();
      }
    };
  }

  // 4. Patch tumSetTipo → auto-aplica tabela ao trocar o preset
  if (typeof tumSetTipo === 'function') {
    var _origTumSetTipo = tumSetTipo;
    tumSetTipo = function(t) {
      _origTumSetTipo(t);
      tumAplicarTabela({ pedraKey: (TUM.q._tumPedraKey || 'granito_simples') });
      if (typeof tumRecalc === 'function') tumRecalc();
    };
  }

  // 5. Patch _tumRenderTab → injeta painel na aba "cliente"
  if (typeof _tumRenderTab === 'function') {
    var _origRenderTab = _tumRenderTab;
    _tumRenderTab = function() {
      _origRenderTab();
      if (typeof _tumTab !== 'undefined' && _tumTab === 'cliente') {
        var body = document.getElementById('tumBody');
        if (!body) return;
        var navRow = body.querySelector('.tum-nav-row');
        if (!navRow) return;
        // Preserva estado aberto/fechado
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
