(function() {
'use strict';
// ── Read shared state + functions from app-tum-inline.js ──────
var NS            = window._TUI || {};
var SEL           = NS.SEL           || {};
var CFG           = NS.CFG           || {};
var HIST          = NS.HIST          || [];
var DEF_CFG       = NS.DEF_CFG       || {};
var PRESETS       = NS.PRESETS       || [];
var TIPOS_SERV    = NS.TIPOS_SERV    || [];
var ACABAMENTOS   = NS.ACABAMENTOS   || [];
var MOLDURA_OPCOES= NS.MOLDURA_OPCOES|| [];
var GRADE_OPCOES  = NS.GRADE_OPCOES  || [];
var _TI_SEL_DEF   = NS._TI_SEL_DEF   || {};
// Functions defined in File 1, needed here
var _gel    = function(id){ return NS._gel ? NS._gel(id) : document.getElementById(id); };
var fv      = function(v){ return NS.fv ? NS.fv(v) : (typeof _TI_fm==='function'?_TI_fm(v):v); };
var init    = function(){ if(NS.init) NS.init(); };
var selMat  = function(id){ if(NS.selMat) NS.selMat(id); else if(window._TI_selMat) window._TI_selMat(id); };
var pendOrc = NS.pendOrc = null;

// ══════════════════════════════════════════════

function validarCli() {
  var v = (document.getElementById('iCli').value || '').trim();
  var f = document.getElementById('fCli');
  if (f) f.classList.toggle('has-err', v.length === 0);
  return v.length > 0;
}

function validarForm() {
  var ok = true;
  if (!validarCli()) ok = false;
  var C = +(document.getElementById('mC').value);
  var L = +(document.getElementById('mL').value);
  if (!C || C < 50)  { toast('⚠ Comprimento inválido (mín. 50 cm)', true); ok = false; }
  if (!L || L < 30)  { toast('⚠ Largura inválida (mín. 30 cm)', true); ok = false; }
  return ok;
}

// ══════════════════════════════════════════════
// GERAR ORÇAMENTO FINAL
// ══════════════════════════════════════════════

function calcularFinal() {
  if (!validarForm()) return;

  var cli = document.getElementById('iCli').value.trim();
  var r   = calcularFull();

  // Número sequencial
  var num = HIST.length + 1;
  var numStr = 'ORC-' + String(num).padStart(4,'0') + '-' + new Date().getFullYear();

  pendOrc = NS.pendOrc = {
    id:Date.now(),
    num: numStr,
    date:new Date().toLocaleDateString('pt-BR'),
    dateISO: new Date().toISOString(),
    cli:cli,
    tel:  document.getElementById('iTel').value.trim(),
    cemi: document.getElementById('iCemiterio').value.trim(),
    cid:  document.getElementById('iCidade').value.trim(),
    fal:  SEL.falecidos.filter(function(f){ return f.nome && f.nome.trim(); }),
    quad: document.getElementById('iQuadra').value.trim(),
    lote: document.getElementById('iLote').value.trim(),
    obs:  document.getElementById('iObs').value.trim(),
    preset:SEL.preset,tipoServNm:r.ts.nm,matNm:r.mat.nm,acabNm:r.acab.nm,
    _sel:{tipoServ:SEL.tipoServ,matId:SEL.matId,acabamento:SEL.acabamento,
      pecas:JSON.parse(JSON.stringify(SEL.pecas)),tampas:JSON.parse(JSON.stringify(SEL.tampas)),
      lapide:JSON.parse(JSON.stringify(SEL.lapide)),rebaixo:JSON.parse(JSON.stringify(SEL.rebaixo)),
      opts:JSON.parse(JSON.stringify(SEL.opts)),adv:JSON.parse(JSON.stringify(SEL.adv))},
    _dims:{C:r.d.C_cm,L:r.d.L_cm,E:r.d.E,N:r.d.N,disp:r.d.disp,
      Ae:r.d.Ae_cm,Ab:r.d.Ab_cm,Hc:r.d.Hc_cm,Hl:r.d.Hl_cm,
      LapW:r.d.LapW_cm,LapH:r.d.LapH_cm,AvRod:r.d.AvRod,
      altFinal:(document.getElementById('mAlturaFinal')||{}).value||''},
    r:r
  };

  // Expõe o resultado para app-tum-integracao.js ler via window
  window._tumLastPendOrc = pendOrc;

  _gel('hdNum').textContent = numStr;
  renderResultado(pendOrc);
  renderProducao();
  // Em modo embedded (_TI_ambId definido), não navega para a aba resultado —
  // o app principal (app-tum-integracao.js) exibe o resultado na sua própria seção.
  if (!_TI_ambId) {
    showTab('resultado', document.querySelectorAll('.tab')[1]);
  }
  toast('✓ Orçamento ' + numStr + ' gerado!');
}

// ══════════════════════════════════════════════
// RENDER RESULTADO
// ══════════════════════════════════════════════

function renderResultado(o) {
  var r = o.r;
  _gel('resEmpty').style.display    = 'none';
  _gel('resConteudo').style.display = 'block';

  _gel('rCli').textContent = o.cli;
  if (o.num) _gel('hdNum').textContent = o.num;

  var meta = [];
  if (o.num)  meta.push('🔖 '+o.num);
  // Falecidos: array ou string legada
  if (Array.isArray(o.fal) && o.fal.length > 0) {
    o.fal.forEach(function(f) {
      var s = '⚰️ ' + (f.nome||'Não informado');
      if (f.nasc || f.obit) s += ' (' + (f.nasc||'?') + '–' + (f.obit||'?') + ')';
      meta.push(s);
      if (f.frase && f.frase.trim()) meta.push('✦ ' + f.frase.trim());
    });
  } else if (o.fal && typeof o.fal === 'string') {
    meta.push('⚰️ '+o.fal);
  }
  if (o.cemi) meta.push('🏛 '+o.cemi);
  if (o.cid)  meta.push('📍 '+o.cid);
  if (o.quad) meta.push('Q '+o.quad);
  if (o.lote) meta.push('L '+o.lote);
  meta.push('📅 '+o.date);
  _gel('rMeta').innerHTML = meta.map(function(m){
    return '<span>'+m+'</span>';
  }).join('');

  // ── Grid de resumo REORGANIZADO ────────────────────────────
  // Agrupa por MATERIAL / SERVIÇO / FINANCEIRO para clareza
  var _fn = function(v){ return _TI_fm(v); };

  // Linha 1: dados técnicos
  var gridTec = [
    { lbl:'Material',        val: r.mat.nm,                         cl:'gold', sub: r.mat.pr.toLocaleString('pt-BR')+'/m² · '+r.d.E+'cm esp.' },
    { lbl:'Acabamento',      val: r.acab.nm,                        cl:'',     sub: r.ml_total.toFixed(1)+' ml de borda' },
    { lbl:'Área de pedra',   val: r.m2_total.toFixed(3)+' m²',     cl:'',     sub: r.m2_bruto.toFixed(3)+' bruto · +'+r.perdaFinal+'% perda' },
    { lbl:'Peso aprox.',     val: Math.round(r.peso_total)+' kg',   cl:'',     sub: r.d.E+'cm · '+r.mat.peso+' kg/m³' },
  ];

  // Linha 2: custos
  var gridCusto = [
    { lbl:'Custo Pedra',     val:'R$ '+_fn(r.custo_pedra),          cl:'gold', sub: r.mat.nm+' × '+r.m2_total.toFixed(2)+'m²' },
    { lbl:'Acabamento',      val:'R$ '+_fn(r.custo_acabamento),     cl:'',     sub: r.acab.prML > 0 ? 'R$ '+r.acab.prML+'/ml × '+r.ml_total.toFixed(1)+'ml' : 'Incluso' },
    { lbl:'Material Civil',  val:'R$ '+_fn(r.civil.custo),          cl:'',     sub: r.ts.nm },
    { lbl:'Mão de Obra',     val:'R$ '+_fn(r.custo_mob),            cl:'',     sub: r.prazo_total+' dias úteis' },
  ];
  if (r.custo_extras > 0) {
    gridCusto.push({ lbl:'Extras/Opcionais', val:'R$ '+_fn(r.custo_extras), cl:'', sub:'Cruz, foto, jarro...' });
  }
  gridCusto.push({ lbl:'Custo Total',    val:'R$ '+_fn(r.custo_total),    cl:'',     sub:'Sem lucro' });
  gridCusto.push({ lbl:'Margem '+CFG.margem+'%', val:'R$ '+_fn(r.margem_reais), cl:'grn', sub:'Lucro estimado' });

  var gh = '';
  // Seção técnica
  gh += '<div style="font-size:.55rem;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);font-weight:700;padding:4px 0 8px;grid-column:1/-1">📐 Técnico</div>';
  gridTec.forEach(function(g) {
    gh += '<div class="res-card"><div class="res-lbl">'+g.lbl+'</div>'
        + '<div class="res-val '+(g.cl||'')+'" style="font-size:.82rem;line-height:1.2">'+g.val+'</div>'
        + '<div class="res-sub">'+(g.sub||'')+'</div></div>';
  });
  // Seção custos
  gh += '<div style="font-size:.55rem;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);font-weight:700;padding:10px 0 8px;grid-column:1/-1">💰 Composição de Custos</div>';
  gridCusto.forEach(function(g) {
    gh += '<div class="res-card"><div class="res-lbl">'+g.lbl+'</div>'
        + '<div class="res-val '+(g.cl||'')+'" style="font-size:.82rem;line-height:1.2">'+g.val+'</div>'
        + '<div class="res-sub">'+(g.sub||'')+'</div></div>';
  });
  _gel('rGrid').innerHTML = '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">' + gh + '</div>';

  // Detalhamento
  var dh = '';

  // Badge do tipo de serviço
  dh += '<div class="callout" style="margin-bottom:12px">'
      + '<strong>Tipo de Serviço:</strong> '+r.ts.nm+' — '+r.ts.badge
      + '</div>';

  // Estrutura dimensional
  dh += '<div class="det-sec">📐 Dimensões do Túmulo</div>';
  dh += '<div class="det-line"><span class="det-k">Comprimento × Largura</span><span class="det-v">'+r.d.C_cm+' × '+r.d.L_cm+' cm</span></div>';
  dh += '<div class="det-line"><span class="det-k">Base estrutural</span><span class="det-v">'+r.d.Ae_cm+' cm</span></div>';
  if (r.d.N > 0) {
    dh += '<div class="det-line"><span class="det-k">Nº de compartimentos (caixões)</span><span class="det-v">'+r.d.N+' compartimento'+(r.d.N>1?'s':'')+'</span></div>';
    dh += '<div class="det-line"><span class="det-k">Disposição</span><span class="det-v">'+(r.d.disp==='horizontal'?'Horizontal (lado a lado)':'Vertical (um sobre o outro)')+'</span></div>';
    dh += '<div class="det-line"><span class="det-k">Altura livre por compartimento</span><span class="det-v">'+r.d.Hc_cm+' cm</span></div>';
    dh += '<div class="det-line"><span class="det-k">Espessura da laje (concreto + pedra)</span><span class="det-v">'+r.d.Hl_cm+' cm</span></div>';
    if (r.d.disp !== 'horizontal') {
      dh += '<div class="det-line"><span class="det-k">Lajes divisórias internas</span><span class="det-v">'+r.N_lajes_div+' laje'+(r.N_lajes_div!==1?'s':'')+' + 1 tampa</span></div>';
    } else {
      var N_div_h = r.d.N - 1;
      if (N_div_h > 0) dh += '<div class="det-line"><span class="det-k">Divisórias verticais de pedra</span><span class="det-v">'+N_div_h+' un.</span></div>';
    }
  }
  dh += '<div class="det-line"><span class="det-k"><strong>Altura total do túmulo</strong></span><span class="det-v" style="color:var(--gold2)"><strong>'+(r.A*100).toFixed(0)+' cm</strong></span></div>';
  dh += '<div class="det-line"><span class="det-k">Espessura da pedra</span><span class="det-v">'+r.d.E+' cm</span></div>';

  dh += '<div class="det-sec">🪨 Peças de Pedra</div>';
  r.pecasCalc.forEach(function(p) {
    var acabInfo = '';
    if (p.ml > 0) {
      var prMLDisp = (typeof p.prML === 'number') ? p.prML : r.acab.prML;
      acabInfo = ' <span style="color:var(--t4);font-size:.62rem">'+p.ml.toFixed(2)+'ml borda</span>';
    }
    dh += '<div class="det-line"><span class="det-k">'+p.nm+' <span style="color:var(--t4)">'+p.dim+'</span>'+acabInfo+'</span><span class="det-v">'+p.m2.toFixed(3)+' m²</span></div>';
  });
  dh += '<div class="det-line"><span class="det-k">Perda real ('+r.perdaFinal+'% — acabamento + recortes)</span><span class="det-v">'+r.m2_total.toFixed(3)+' m² final</span></div>';
  var espMult2 = {2:'1.00',3:'1.35',4:'1.70',5:'2.10'};
  dh += '<div class="det-line"><span class="det-k">'+r.mat.nm+' (esp. '+r.d.E+'cm × fator '+(espMult2[r.d.E]||1.35)+')</span><span class="det-v" style="color:var(--gold2)">R$ '+_TI_fm(r.custo_pedra)+'</span></div>';

  dh += '<div class="det-sec">📐 Acabamentos</div>';
  dh += '<div class="det-line"><span class="det-k">'+r.acab.nm+' — '+r.ml_total.toFixed(2)+' ml de borda</span><span class="det-v">R$ '+_TI_fm(r.custo_acabamento)+'</span></div>';

  // ── Material Civil — qtd × R$ unit = subtotal ───────────────────
  dh += '<div class="det-sec">🧱 Material Civil</div>';
  (function() {
    var cv = r.civil;
    var p  = CFG.civil;
    // helper: linha com quantidade, unidade, preço unitário e subtotal
    function civLn(label, qtd, unit, prUnit, sub) {
      if (!qtd || qtd <= 0) return;
      dh += '<div class="det-line">'
          + '<span class="det-k">' + label
          + ' <span style="color:var(--t4);font-size:.62rem">'
          + qtd + ' ' + unit + ' × R$ ' + _TI_fm(prUnit) + '/' + unit
          + '</span></span>'
          + '<span class="det-v">R$ ' + _TI_fm(sub) + '</span>'
          + '</div>';
    }
    if (r.ts.id === 'estrutura') {
      civLn('Cimento CP-II (sacos 50 kg)',              cv.sacos_cimento,'saco', p.cimento,  cv.sacos_cimento * p.cimento);
      civLn('Areia lavada (m³)',                      cv.m3_areia,     'm³',  p.areia,    cv.m3_areia * p.areia);
      civLn('Brita 3/4" (m³)',                         cv.m3_brita,     'm³',  p.brita,    cv.m3_brita * p.brita);
      civLn('Blocos 14×19×39 (preenchimento parede)',  cv.unid_blocos, 'un', p.blocos,   cv.unid_blocos * p.blocos);
      if(cv.unid_canaletas>0) civLn('Canaletas 14×19×39 (cintas de amarração)', cv.unid_canaletas, 'un', p.canaleta||p.blocos, cv.unid_canaletas*(p.canaleta||p.blocos));
      if(cv.m_trelica>0)    civLn('Treliça eletrossoldada (alicerce+lajes)', cv.m_trelica, 'm', p.trelica||20, cv.m_trelica*(p.trelica||20));
      if(cv.m2_reboco>0)    civLn('Reboco cimento+areia (paredes)', cv.m2_reboco, 'm²', 0, 0);
      if(cv.sacos_argam>0)  civLn('Argamassa AC3 (assentamento pedra)', cv.sacos_argam, 'sc', p.argamassa, cv.sacos_argam*p.argamassa);
      if(cv.kg_massa_plastica>0) civLn('Massa plástica resina+talco (juntas)', cv.kg_massa_plastica, 'kg', p.massa_plastica||35, cv.kg_massa_plastica*(p.massa_plastica||35));
            civLn('Areia lavada',                             cv.m3_areia,     'm³',  p.areia,    cv.m3_areia * p.areia);
      civLn('Brita 3/4"',                               cv.m3_brita,     'm³',  p.brita,    cv.m3_brita * p.brita);
      civLn('Treliça / Malha soldada Q-92',             cv.m2_malha,     'm²',  p.malha,    cv.m2_malha * p.malha);
      civLn('Ferro 3/8" — alicerce / alvenaria (12m)', cv.barras_f38,  'barra',p.ferro38,  cv.barras_f38 * p.ferro38);
      civLn('Ferro 5/16" — laje (12m)',                 cv.barras_f516, 'barra',p.ferro516, cv.barras_f516 * p.ferro516);
    }
    // Argamassa de assentamento: sempre presente
    civLn('Argamassa AC3 (sacos 20 kg) — assentamento', cv.sacos_argam, 'saco', p.argamassa, cv.sacos_argam * p.argamassa);

    if (r.ts.id !== 'estrutura') {
      dh += '<div class="det-line" style="font-size:.72rem;color:var(--t4)"><span class="det-k">Cimento, brita, blocos, ferro</span><span class="det-v">— não incluso</span></div>';
    }
    if (SEL.opts.cemiterio) dh += '<div class="det-line"><span class="det-k">Frete cemitério (+' + SEL.adv.fatorCem + '%)</span><span class="det-v" style="color:var(--amber)">aplicado</span></div>';
    dh += '<div class="det-line" style="font-weight:700"><span class="det-k"><strong>Total material civil</strong></span><span class="det-v" style="color:var(--gold2)">R$ ' + _TI_fm(r.civil.custo) + '</span></div>';
  })();

  dh += '<div class="det-sec">🔨 Mão de Obra</div>';
  if (r.ts.id === 'estrutura') {
    if (r.nDias_ped > 0) {
      dh += '<div class="det-line"><span class="det-k">1 Pedreiro × '+r.nDias_ped+' dia'+(r.nDias_ped>1?'s':'')+' <span style="color:var(--t4);font-size:.62rem">R$ '+_TI_fm(CFG.mob.pedreiro)+'/dia</span></span><span class="det-v">R$ '+_TI_fm(r.custo_ped)+'</span></div>';
    }
    if (r.nDias_ajud > 0) {
      dh += '<div class="det-line"><span class="det-k">1 Ajudante × '+r.nDias_ajud+' dia'+(r.nDias_ajud>1?'s':'')+' <span style="color:var(--t4);font-size:.62rem">R$ '+_TI_fm(CFG.mob.ajudante)+'/dia</span></span><span class="det-v">R$ '+_TI_fm(r.custo_ajud)+'</span></div>';
    }
  }
  if (r.ts.id === 'reforma' && r.custo_remocao > 0) {
    dh += '<div class="det-line"><span class="det-k">Remoção / desmonte</span><span class="det-v">R$ '+_TI_fm(r.custo_remocao)+'</span></div>';
  }
  if (r.custo_inst > 0) dh += '<div class="det-line"><span class="det-k">Instalação pedra — '+r.nDiasInst+' dia'+(r.nDiasInst>1?'s':'')+' <span style="color:var(--t4);font-size:.62rem">R$ '+_TI_fm(CFG.mob.instalacao)+'/dia</span></span><span class="det-v">R$ '+_TI_fm(r.custo_inst)+'</span></div>';
  if (r.custo_mont > 0) dh += '<div class="det-line"><span class="det-k">Montagem / acabamento — '+r.nDiasMont+' dia'+(r.nDiasMont>1?'s':'')+' <span style="color:var(--t4);font-size:.62rem">R$ '+_TI_fm(CFG.mob.montagem)+'/dia</span></span><span class="det-v">R$ '+_TI_fm(r.custo_mont)+'</span></div>';
  dh += '<div class="det-line"><span class="det-k">Transporte</span><span class="det-v">R$ '+_TI_fm(r.frete)+'</span></div>';
  dh += '<div class="det-line"><span class="det-k">Total M.O.</span><span class="det-v" style="color:var(--gold2)">R$ '+_TI_fm(r.custo_mob)+'</span></div>';

  if (r.custo_extras > 0) {
    dh += '<div class="det-sec">✨ Extras</div>';
    if (SEL.opts.cruzGranito) dh += '<div class="det-line"><span class="det-k">Cruz em granito ('+r.nCruz+'×)</span><span class="det-v">R$ '+_TI_fm(r.nCruz*350)+'</span></div>';
    if (SEL.opts.foto_porc)   dh += '<div class="det-line"><span class="det-k">Foto em porcelana ('+r.nFotos+'×)</span><span class="det-v">R$ '+_TI_fm(r.nFotos*200)+'</span></div>';
    if (SEL.opts.jarro)       dh += '<div class="det-line"><span class="det-k">Jarro em granito ('+r.nJarros+' par'+(r.nJarros>1?'es':'')+')</span><span class="det-v">R$ '+_TI_fm(r.nJarros*280)+'</span></div>';
    if (SEL.opts.lapide45)    dh += '<div class="det-line"><span class="det-k">Lápide 45° engrossada</span><span class="det-v">R$ 180,00</span></div>';
  }

  if (o.obs) {
    dh += '<div class="det-sec">📝 Observações</div>';
    dh += '<div style="font-size:.78rem;color:var(--t2);padding:8px 0;line-height:1.5">'+o.obs+'</div>';
  }

  dh += '<div style="border-top:1px solid var(--gold3);margin-top:8px;padding-top:8px">';
  dh += '<div class="det-line"><span class="det-k">Custo total (interno)</span><span class="det-v">R$ '+_TI_fm(r.custo_total)+'</span></div>';
  dh += '<div class="det-line"><span class="det-k">Margem '+CFG.margem+'%</span><span class="det-v" style="color:var(--grn)">R$ '+_TI_fm(r.margem_reais)+'</span></div>';
  dh += '</div>';
  _gel('rDetalhe').innerHTML = dh;

  _gel('rVista').textContent = 'R$ '+_TI_fm(r.valor_vista);
  _gel('rParc').textContent =
    'Parcelado: R$ '+_TI_fm(r.valor_parc)+' — até '+CFG.parcMax+'× de R$ '+_TI_fm(r.parc_mensal);
  // PRAZO REMOVIDO — não exibir dias no resultado
  // (linha prazo_total removida)

  // Texto WA
  gerarTextoWA(o, r);
  // Print area
  gerarPrintArea(o, r);
}

// ══════════════════════════════════════════════
// WHATSAPP TEXT
// ══════════════════════════════════════════════

function gerarTextoWA(o, r) {
  var wa = '━━━━━━━━━━━━━━━━━━━━━\n';
  wa += '🏛 *'+CFG.emp.nome+'*\n';
  wa += '📋 *ORÇAMENTO ' + (o.num||'') + '*\n';
  wa += '━━━━━━━━━━━━━━━━━━━━━\n\n';
  wa += '👤 *Cliente:* '+o.cli+'\n';
  if (o.tel)  wa += '📞 *Tel:* '+o.tel+'\n';
  if (Array.isArray(o.fal) && o.fal.length > 0) {
    o.fal.forEach(function(f, i) {
      var s = '⚰️ *Falecido'+(o.fal.length>1?' '+(i+1):'')+'*: '+(f.nome||'Não informado');
      if (f.nasc || f.obit) s += ' ('+( f.nasc||'?')+'–'+(f.obit||'?')+')';
      wa += s + '\n';
      if (f.frase && f.frase.trim()) wa += '   _"' + f.frase.trim() + '"_\n';
    });
  } else if (o.fal && typeof o.fal === 'string') {
    wa += '⚰️ *Falecido(a):* '+o.fal+'\n';
  }
  if (o.cemi) wa += '🏛 *Cemitério:* '+o.cemi+'\n';
  if (o.cid)  wa += '📍 *Cidade:* '+o.cid+'\n';
  if (o.quad||o.lote) wa += '📌 *Local:* Quadra '+o.quad+' · Lote '+o.lote+'\n';
  wa += '\n';
  wa += '🏗 *Serviço:* '+(o.tipoServNm||'Revestimento')+'\n';
  wa += '🪨 *Material:* '+o.matNm+' (R$ '+r.mat.pr.toLocaleString('pt-BR')+'/m²)\n';
  wa += '✨ *Acabamento:* '+o.acabNm+(r.acab.prML > 0 ? ' — R$ '+r.acab.prML+'/ml' : ' — incluso')+'\n';
  wa += '📐 *Dimensões:* '+r.d.C_cm+'cm × '+r.d.L_cm+'cm × '+(r.A*100).toFixed(0)+'cm alt.\n';
  wa += '🪣 *Compartimentos:* '+r.d.N+(r.d.N===0?' (simples)':(r.d.N===1?' (1 caixão)':' ('+r.d.N+' caixões)'))+'\n';
  if (r.d.N > 0) {
    var dispNm = r.d.disp === 'horizontal' ? 'Lado a lado' : 'Vertical (empilhado)';
    wa += '   └ Disposição: '+dispNm+' | Alt. livre: '+r.d.Hc_cm+'cm | Laje: '+r.d.Hl_cm+'cm\n';
  }
  wa += '📦 *Área:* '+r.m2_total.toFixed(2)+' m² · '+Math.round(r.peso_total)+' kg\n';
  wa += '\n━━━━━━━━━━━━━━━━━━━━━\n';
  wa += '💰 *À VISTA: R$ '+_TI_fm(r.valor_vista)+'*\n';
  wa += '💳 Parcelado: até '+CFG.parcMax+'× de R$ '+_TI_fm(r.parc_mensal)+'\n';
  // PRAZO REMOVIDO — não incluir dias no WhatsApp
  wa += '━━━━━━━━━━━━━━━━━━━━━\n';
  if (o.obs) wa += '📝 Obs: '+o.obs+'\n━━━━━━━━━━━━━━━━━━━━━\n';
  wa += CFG.emp.nome+'\n'+CFG.emp.tel+'\n'+CFG.emp.end;
  _gel('txtWA').value = wa;
}

// ══════════════════════════════════════════════
// PRINT AREA
// ══════════════════════════════════════════════

function gerarPrintArea(o,r){
  var emp=CFG.emp||{};
  var d=r.d, mat=r.mat||{}, acab=r.acab||{};
  var cnt=parseInt(localStorage.getItem('hr_pdf_cnt_t')||'0',10);
  var orcNum=o.num||('ORC-'+String(cnt).padStart(4,'0'));
  localStorage.setItem('hr_pdf_cnt_t',cnt+1);
  function fv(v){return 'R$\u00a0'+_TI_fm(v);}
  function esc(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
  function sh(t){return '<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#7a4e00;font-weight:900;margin:0 0 8px;padding:0 0 5px;border-bottom:2px solid #C9A84C;">'+t+'</div>';}
  var td=getTampasDims();
  var engCm=getEngCm();
  var CC=(d.AvRod>0)?d.CUtil:d.C, LC=(d.AvRod>0)?d.LUtil:d.L;
  // ── Extras ──────────────────────────────────────────────────────────────
  var ex=[];
  if(SEL.pecas.tampa){
    var pos=SEL.tampas.posicao||'superior';
    if(pos==='frontal'){ex.push({i:'🚪',l:'Tampas Frontais ('+td.nTotal+'×)',v:Math.round(CC*100/td.nTotal)+'×'+Math.round(d.Hcomp*100)+' cm, esp.'+td.espT+'cm'+(SEL.tampas.argolas?' · '+(td.nTotal*2)+' argolas':'')});}
    else{ex.push({i:'🪨',l:'Tampas Superiores ('+td.nTotal+'×)',v:Math.round(td.C_cada*100)+'×'+Math.round(td.L_cada*100)+' cm, esp.'+td.espT+'cm'+(SEL.tampas.argolas?' · '+(td.nTotal*2)+' argolas':'')});}
  }
  if(SEL.pecas.lapide){var ld=d.LapW_cm+'×'+d.LapH_cm+' cm';if(engCm>0)ld+=' (dupla '+engCm+'cm)';ex.push({i:'📜',l:'Lápide',v:ld});}
  if(SEL.opts.foto_porc&&r.nFotos>0)ex.push({i:'📷',l:'Foto em Porcelana',v:r.nFotos+' unid.'});
  if(SEL.opts.cruzGranito&&r.nCruz>0)ex.push({i:'✝',l:'Cruz em Granito',v:r.nCruz+' unid.'});
  if(SEL.opts.jarro&&r.nJarros>0)ex.push({i:'🏺',l:'Jarros',v:r.nJarros+' par(es)'});
  if(SEL.rebaixo&&SEL.rebaixo.lajeVedante&&r.m2_laje_ved>0)ex.push({i:'🧱',l:'Laje Vedante',v:(SEL.rebaixo.lajeInteira?'1 laje inteira':td.nTotal+' lajes')+' — '+r.m2_laje_ved.toFixed(3)+' m²'});
  if(SEL.rebaixo&&SEL.rebaixo.usinagem&&r.ml_rebaixo>0)ex.push({i:'🔧',l:'Usinagem Rebaixo',v:r.ml_rebaixo.toFixed(2)+' ml'});
  // ── PAGE 1 ──────────────────────────────────────────────────────────────
  var p1='';
  p1+='<div style="height:5px;background:linear-gradient(90deg,#3a2500,#C9A84C,#E8C96A,#C9A84C,#3a2500)"></div>';
  p1+='<div style="background:#0f0c00;padding:20px 28px;display:flex;justify-content:space-between;align-items:flex-start">';
  p1+='<div><div style="font-size:22px;font-weight:900;color:#C9A84C">'+esc(emp.nome||'HR Mármores e Granitos')+'</div>';
  p1+='<div style="font-size:7px;letter-spacing:3px;color:rgba(201,168,76,.4);margin-top:3px">MÁRMORE · GRANITO · QUARTZITO</div></div>';
  p1+='<div style="text-align:right">';
  if(emp.end)p1+='<div style="font-size:9.5px;color:rgba(201,168,76,.85);font-weight:700">'+esc(emp.end)+'</div>';
  if(emp.cidade)p1+='<div style="font-size:9px;color:rgba(255,255,255,.3)">'+esc(emp.cidade)+'</div>';
  if(emp.tel)p1+='<div style="font-size:10.5px;color:rgba(201,168,76,.9);font-weight:700;margin-top:3px">'+esc(emp.tel)+'</div>';
  if(emp.cnpj)p1+='<div style="font-size:7.5px;color:rgba(255,255,255,.15);margin-top:2px">CNPJ: '+esc(emp.cnpj)+'</div>';
  p1+='</div></div>';
  // Badge
  p1+='<div style="background:#f7f2e8;border-bottom:2.5px solid #C9A84C;padding:9px 28px;display:flex;justify-content:space-between;align-items:center">';
  p1+='<div style="display:flex;align-items:center;gap:10px"><div style="background:#0f0c00;color:#C9A84C;font-size:7px;font-weight:900;padding:5px 14px;border-radius:20px;letter-spacing:2px;border:1px solid rgba(201,168,76,.4)">⚱️ ORÇAMENTO</div>';
  p1+='<div style="background:#C9A84C;color:#000;font-size:8px;font-weight:900;padding:4px 10px;border-radius:5px">'+esc(orcNum)+'</div></div>';
  p1+='<div style="font-size:9.5px;color:#666"><strong style="color:#5a3800">EMISSÃO:</strong> '+esc(o.date||'')+'&nbsp;&nbsp;|&nbsp;&nbsp;Validade: 7 dias</div></div>';
  // Body
  p1+='<div style="padding:18px 28px 16px">';
  // Cliente + foto
  p1+=sh('Cliente');
  p1+='<div style="display:flex;gap:12px;margin-bottom:16px;align-items:stretch">';
  p1+='<div style="flex:1;background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:13px 16px">';
  p1+='<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:#b09050;font-weight:900;margin-bottom:4px">NOME DO CLIENTE</div>';
  p1+='<div style="font-size:19px;font-weight:900;color:#1a1a1a;margin-bottom:5px">'+esc(o.cli||'—')+'</div>';
  if(Array.isArray(o.fal))o.fal.forEach(function(f){if(!f.nome)return;p1+='<div style="font-size:10px;color:#777;margin-top:3px">⚰️ <strong>'+esc(f.nome)+'</strong>'+(f.nasc||f.obit?' ('+esc(f.nasc||'?')+' – '+esc(f.obit||'?')+')':'')+'</div>';if(f.frase)p1+='<div style="font-size:9px;color:#999;font-style:italic">&#8220;'+esc(f.frase)+'&#8221;</div>';});
  if(o.cemi)p1+='<div style="font-size:10px;color:#777;margin-top:3px">🏛 '+esc(o.cemi)+(o.cid?' — '+esc(o.cid):'')+'</div>';
  if(o.quad||o.lote)p1+='<div style="font-size:10px;color:#777;margin-top:2px">📌 Quadra: '+esc(o.quad||'—')+' · Lote: '+esc(o.lote||'—')+'</div>';
  p1+='</div>';
  if(_tumFotoOrc){p1+='<div style="width:200px;flex-shrink:0;border-radius:10px;overflow:hidden;border:2px solid #C9A84C"><img src="'+_tumFotoOrc+'" style="width:100%;height:100%;object-fit:cover;display:block"></div>';}
  else{p1+='<div style="background:#0f0c00;border:1px solid rgba(201,168,76,.4);border-radius:10px;padding:13px 16px;text-align:center;display:flex;flex-direction:column;justify-content:center;min-width:130px"><div style="font-size:28px;margin-bottom:6px">⚰️</div><div style="font-size:14px;font-weight:900;color:#C9A84C">Túmulo</div><div style="font-size:9px;color:rgba(255,255,255,.25);margin-top:5px">'+d.C_cm+' × '+d.L_cm+' × '+(r.A*100).toFixed(0)+' cm</div></div>';}
  p1+='</div>';
  // Specs
  p1+=sh('Especificações Técnicas');
  var specs=[{l:'DIMENSÃO EXTERNA',v:d.C_cm+' × '+d.L_cm+' cm'},{l:'ÁREA ÚTIL',v:d.CUtil_cm+' × '+d.LUtil_cm+' cm'},{l:'ALTURA TOTAL',v:(r.A*100).toFixed(0)+' cm'},{l:'COMPARTIMENTOS',v:d.N+(d.disp==='horizontal'?' (lado a lado)':d.N>0?' (empilhados)':'')},{l:'TIPO DE SERVIÇO',v:o.tipoServNm||'—'},{l:'ESPESSURA DA PEDRA',v:d.E+' cm'},{l:'ÁREA TOTAL PEDRA',v:r.m2_total.toFixed(3)+' m²'},{l:'PESO APROX.',v:Math.round(r.peso_total)+' kg'}];
  p1+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin-bottom:16px">';
  specs.forEach(function(sp){p1+='<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:8px;padding:9px 11px"><div style="font-size:6px;letter-spacing:1.5px;text-transform:uppercase;color:#9a7840;font-weight:900;margin-bottom:3px">'+sp.l+'</div><div style="font-size:12.5px;font-weight:700;color:#1a1a1a">'+sp.v+'</div></div>';});
  p1+='</div>';
  // Material
  p1+=sh('Material Selecionado');
  p1+='<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:10px;padding:13px 18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">';
  p1+='<div><div style="font-size:7px;letter-spacing:2px;color:rgba(201,168,76,.5);font-weight:900;margin-bottom:4px">MATERIAL</div><div style="font-size:17px;font-weight:900;color:#C9A84C">'+esc(mat.nm||o.matNm||'—')+'</div>';
  p1+='<div style="font-size:9px;color:rgba(255,255,255,.4);margin-top:2px">'+(mat.cat||'')+((mat.cat&&(mat.fin||mat.pr))?' · ':'')+(mat.fin||'')+((mat.fin&&mat.pr)?' · ':'')+(mat.pr?'R$ '+mat.pr+'/m²':'')+'</div></div>';
  p1+='<div style="text-align:right"><div style="font-size:7px;letter-spacing:1.5px;color:rgba(255,255,255,.3);font-weight:900;margin-bottom:3px">ACABAMENTO</div><div style="font-size:15px;font-weight:700;color:rgba(255,255,255,.8)">'+esc(acab.nm||o.acabNm||'—')+'</div></div></div>';
  // Extras
  if(ex.length>0){
    p1+=sh('Componentes e Acessórios');
    p1+='<div style="border:1px solid #e8dfc4;border-radius:10px;overflow:hidden;margin-bottom:16px">';
    ex.forEach(function(e2,i){var bg=i%2===0?'#fff':'#fdfaf3';p1+='<div style="background:'+bg+';padding:8px 13px;border-bottom:1px solid #ede8dc;display:flex;justify-content:space-between;align-items:center"><span style="font-size:11px;font-weight:700;color:#1a1a1a">'+e2.i+' '+esc(e2.l)+'</span><span style="font-size:11px;color:#555">'+esc(e2.v)+'</span></div>';});
    p1+='</div>';
  }
  // Pricing
  p1+=sh('Valores do Projeto');
  var vista=r.valor_vista,parc=vista*(1+(CFG.juros||12)/100),pMes=parc/(CFG.parcMax||8),eco=parc-vista,ent=vista*0.5;
  p1+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';
  p1+='<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:13px 15px"><div style="font-size:6.5px;letter-spacing:1.5px;color:#9a7840;font-weight:900;text-transform:uppercase;margin-bottom:5px">PARCELADO</div><div style="font-size:18px;font-weight:900;color:#5a3a00">'+fv(parc)+'</div><div style="font-size:9.5px;color:#888;margin-top:2px">até '+(CFG.parcMax||8)+'× de '+fv(pMes)+'</div></div>';
  p1+='<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:10px;padding:13px 15px;position:relative"><div style="position:absolute;top:8px;right:10px;background:#C9A84C;color:#000;font-size:6.5px;font-weight:900;padding:2px 8px;border-radius:3px">MELHOR OPÇÃO</div><div style="font-size:6.5px;letter-spacing:1.5px;color:rgba(201,168,76,.5);font-weight:900;text-transform:uppercase;margin-bottom:5px">A VISTA</div><div style="font-size:21px;font-weight:900;color:#C9A84C">'+fv(vista)+'</div><div style="font-size:9px;color:rgba(255,255,255,.3)">Valor final sem juros</div><div style="font-size:9px;color:#6aaa80;margin-top:2px">▼ Economia de '+fv(eco)+'</div></div>';
  p1+='</div>';
  p1+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">';
  p1+='<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:11px 15px"><div style="font-size:6px;letter-spacing:1.5px;color:#9a7840;font-weight:900;text-transform:uppercase;margin-bottom:3px">ENTRADA — 50%</div><div style="font-size:17px;font-weight:900;color:#5a3a00">'+fv(ent)+'</div><div style="font-size:9px;color:#888;margin-top:2px">Na assinatura / medição</div></div>';
  p1+='<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:11px 15px"><div style="font-size:6px;letter-spacing:1.5px;color:#9a7840;font-weight:900;text-transform:uppercase;margin-bottom:3px">NA ENTREGA — 50%</div><div style="font-size:17px;font-weight:900;color:#5a3a00">'+fv(ent)+'</div><div style="font-size:9px;color:#888;margin-top:2px">Na entrega / instalação</div></div>';
  p1+='</div>';
  // PRAZO REMOVIDO — não exibir dias no PDF
  if(o.obs)p1+='<div style="background:#fffbf0;border-left:3px solid #C9A84C;padding:9px 13px;margin-bottom:12px;font-size:11px;color:#555;border-radius:0 8px 8px 0"><strong style="color:#7a4e00">Obs:</strong> '+esc(o.obs)+'</div>';
  p1+='</div>';
  p1+='<div style="background:#0f0c00;padding:9px 28px;display:flex;justify-content:space-between;border-top:1px solid rgba(201,168,76,.15)"><div style="font-size:9px;color:rgba(201,168,76,.55)">'+esc(emp.nome||'')+' · '+esc(emp.tel||'')+'</div><div style="font-size:8px;color:rgba(255,255,255,.15)">CNPJ: '+esc(emp.cnpj||'—')+'</div></div>';

  // ── PAGE 2 ──────────────────────────────────────────────────────────────
  var p2='';
  p2+='<div style="height:4px;background:linear-gradient(90deg,#3a2500,#C9A84C,#3a2500)"></div>';
  p2+='<div style="background:#0f0c00;padding:11px 28px;display:flex;justify-content:space-between;align-items:center"><div style="font-size:14px;font-weight:900;color:#C9A84C">'+esc(emp.nome||'')+'</div><div style="display:flex;gap:8px;align-items:center"><div style="background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);color:#C9A84C;font-size:7px;font-weight:900;padding:4px 10px;border-radius:4px;letter-spacing:1.5px">DETALHAMENTO TÉCNICO</div><div style="background:#C9A84C;color:#000;font-size:8px;font-weight:900;padding:3px 8px;border-radius:4px">'+esc(orcNum)+'</div></div></div>';
  p2+='<div style="background:#faf6ee;border-bottom:2px solid rgba(201,168,76,.25);padding:7px 28px"><span style="font-size:9px;color:#888">Cliente: <strong style="color:#333">'+esc(o.cli||'—')+'</strong> &nbsp;·&nbsp; Material: <strong style="color:#333">'+esc(mat.nm||o.matNm||'—')+'</strong> &nbsp;·&nbsp; '+esc(o.date||'')+'</span></div>';
  p2+='<div style="padding:14px 28px">';
  // Piece table
  p2+=sh('🪨 Lista de Peças em Pedra — Medidas Exatas');
  var dens=2700*(d.E/100);
  p2+='<div style="border:1px solid #e8e0d0;border-radius:10px;overflow:hidden;margin-bottom:14px"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#0f0c00">';
  [['#','center'],['PEÇA','left'],['COMP × LARG (cm)','center'],['ESP.','center'],['ÁREA m²','right'],['PESO kg','right'],['OBS','left']].forEach(function(h){p2+='<th style="padding:7px 9px;text-align:'+h[1]+';font-size:6.5px;letter-spacing:1.5px;text-transform:uppercase;color:#C9A84C;font-weight:900">'+h[0]+'</th>';});
  p2+='</tr></thead><tbody>';
  r.pecasCalc.forEach(function(p3,i){
    var bg=i%2===0?'#fff':'#faf6ef';
    var peso=+(p3.m2*dens).toFixed(1);
    var obs='';var nm=(p3.nm||'').toLowerCase();
    if(nm.indexOf('tampa')>=0&&SEL.tampas.argolas)obs=(td.nTotal*2)+' argolas';
    if(nm.indexOf('divisória')>=0||nm.indexOf('divisoria')>=0)obs='Interna — sem acabamento';
    p2+='<tr><td style="padding:7px 8px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:9px;color:#888;text-align:center">'+(i+1)+'</td>';
    p2+='<td style="padding:7px 8px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:10.5px;font-weight:700;color:#1a1a1a">'+esc(p3.nm)+'</td>';
    p2+='<td style="padding:7px 8px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:10px;color:#555;text-align:center">'+esc(p3.dim||'—')+'</td>';
    p2+='<td style="padding:7px 8px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:10px;color:#777;text-align:center">'+d.E+' cm</td>';
    p2+='<td style="padding:7px 8px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:10px;text-align:right;font-weight:700;color:#5a3800">'+(p3.m2>0?p3.m2.toFixed(3)+' m²':'—')+'</td>';
    p2+='<td style="padding:7px 8px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:10px;text-align:right;color:#444">'+peso+'</td>';
    p2+='<td style="padding:7px 8px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:8.5px;color:#888">'+esc(obs)+'</td></tr>';
  });
  p2+='<tr style="background:#fdf5e0"><td colspan="4" style="padding:6px 9px;font-size:9px;color:#888;font-style:italic">+ Perda/Retalho ('+r.perdaFinal+'%)</td><td style="padding:6px 9px;text-align:right;font-size:10px;color:#888">+'+(r.m2_total-r.m2_bruto).toFixed(3)+' m²</td><td colspan="2"></td></tr>';
  p2+='<tr style="background:#0f0c00"><td colspan="4" style="padding:8px 9px;font-size:9px;font-weight:900;color:#C9A84C;letter-spacing:1px">TOTAL (COM PERDA)</td><td style="padding:8px 9px;text-align:right;font-size:12px;font-weight:900;color:#C9A84C">'+r.m2_total.toFixed(3)+' m²</td><td style="padding:8px 9px;text-align:right;font-size:11px;font-weight:700;color:rgba(201,168,76,.7)">'+Math.round(r.peso_total)+' kg</td><td></td></tr>';
  p2+='</tbody></table></div>';
  // Compartimentos
  if(d.N>0){
    p2+=sh('📐 Compartimentos');
    var posL=(SEL.tampas.posicao||'superior')==='frontal'?'Frontal (tampa de pé)':'Superior (tampa deitada)';
    var dispL=d.disp==='horizontal'?'Lado a lado':'Empilhados';
    var dimComp=d.disp==='horizontal'?Math.round(CC*100/d.N)+'×'+Math.round(LC*100)+'×'+d.Hc_cm+' cm':Math.round(CC*100)+'×'+Math.round(LC*100)+'×'+d.Hc_cm+' cm';
    var civRows=[{l:'Compartimentos',v:d.N+' und.'},{l:'Disposição',v:dispL},{l:'Tipo de abertura',v:posL},{l:'Dim. interna (C×L×H)',v:dimComp},{l:'Altura livre caixão',v:d.Hc_cm+' cm'},{l:'Espessura laje',v:d.Hl_cm+' cm'}];
    if(SEL.rebaixo&&SEL.rebaixo.lajeVedante)civRows.push({l:'Laje vedante',v:SEL.rebaixo.lajeInteira?'1 laje inteira '+Math.round(d.CUtil_cm)+'×'+Math.round(d.LUtil_cm)+' cm':td.nTotal+' lajes'});
    p2+='<div style="border:1px solid #e8dfc4;border-radius:10px;overflow:hidden;margin-bottom:14px">';
    civRows.forEach(function(it,i){var bg=i%2===0?'#fff':'#fdfaf3';p2+='<div style="background:'+bg+';padding:8px 13px;border-bottom:1px solid #ede8dc;display:flex;justify-content:space-between"><span style="font-size:10.5px;color:#555">'+it.l+'</span><span style="font-size:10.5px;font-weight:700;color:#1a1a1a">'+it.v+'</span></div>';});
    p2+='</div>';
  }
  // Civil — tabela completa: item | qtd × R$/unit | subtotal
  if(r.civil&&(r.civil.sacos_cimento>0||r.civil.unid_blocos>0||r.civil.sacos_argam>0)){
    p2+=sh('🏗️ Quantitativo Civil');
    var cv=r.civil, pp=CFG.civil;
    // Cabeçalho da tabela
    p2+='<div style="border:1px solid #e8dfc4;border-radius:10px;overflow:hidden;margin-bottom:14px">';
    p2+='<div style="background:#faf6ec;padding:6px 13px;display:grid;grid-template-columns:1fr auto auto;gap:8px;border-bottom:2px solid #e0d4a8">'
      + '<span style="font-size:9px;font-weight:700;color:#7a6030;text-transform:uppercase;letter-spacing:.06em">Material</span>'
      + '<span style="font-size:9px;font-weight:700;color:#7a6030;text-transform:uppercase;letter-spacing:.06em;text-align:right">Qtd × Unit.</span>'
      + '<span style="font-size:9px;font-weight:700;color:#7a6030;text-transform:uppercase;letter-spacing:.06em;text-align:right">Subtotal</span>'
      + '</div>';
    var civRows2=[];
    if(r.ts&&r.ts.id==='estrutura'){
      if(cv.unid_blocos>0)     civRows2.push({nm:'Blocos 14×19×39 (preenchimento)',            qtd:cv.unid_blocos,     unit:'un',  pr:pp.blocos,             sub:cv.unid_blocos*pp.blocos});
      if(cv.unid_canaletas>0) civRows2.push({nm:'Canaletas 14×19×39 (cintas de amarração)', qtd:cv.unid_canaletas, unit:'un', pr:pp.canaleta||pp.blocos, sub:cv.unid_canaletas*(pp.canaleta||pp.blocos)});
      if(cv.m_trelica>0)    civRows2.push({nm:'Treliça eletrossoldada (alicerce+lajes)',  qtd:cv.m_trelica,          unit:'m',   pr:pp.trelica||20,          sub:cv.m_trelica*(pp.trelica||20)});
      if(cv.m2_reboco>0)    civRows2.push({nm:'Reboco cimento+areia (m²)',                 qtd:cv.m2_reboco,          unit:'m²',  pr:0,                       sub:0});
      if(cv.sacos_argam>0)  civRows2.push({nm:'Argamassa AC3 (assentamento pedra)',       qtd:cv.sacos_argam,        unit:'sc',  pr:pp.argamassa,            sub:cv.sacos_argam*pp.argamassa});
      if(cv.kg_massa_plastica>0) civRows2.push({nm:'Massa plástica resina+talco (juntas)', qtd:cv.kg_massa_plastica, unit:'kg',  pr:pp.massa_plastica||35,   sub:cv.kg_massa_plastica*(pp.massa_plastica||35)});
      if(cv.sacos_cimento>0)civRows2.push({nm:'Cimento CP-II (sacos 50 kg)',           qtd:cv.sacos_cimento,          unit:'saco',  pr:pp.cimento,  sub:cv.sacos_cimento*pp.cimento});
      if(cv.m3_areia>0)     civRows2.push({nm:'Areia lavada',                          qtd:+cv.m3_areia.toFixed(2),   unit:'m³',    pr:pp.areia,    sub:cv.m3_areia*pp.areia});
      if(cv.m3_brita>0)     civRows2.push({nm:'Brita 3/4"',                            qtd:+cv.m3_brita.toFixed(2),   unit:'m³',    pr:pp.brita,    sub:cv.m3_brita*pp.brita});
      if(cv.m2_malha>0)     civRows2.push({nm:'Treliça / Malha soldada Q-92',          qtd:+cv.m2_malha.toFixed(2),   unit:'m²',    pr:pp.malha,    sub:cv.m2_malha*pp.malha});
      if(cv.barras_f38>0)   civRows2.push({nm:'Ferro 3/8" — alicerce / alvenaria',    qtd:cv.barras_f38,             unit:'barra', pr:pp.ferro38,  sub:cv.barras_f38*pp.ferro38});
      if(cv.barras_f516>0)  civRows2.push({nm:'Ferro 5/16" — laje',                   qtd:cv.barras_f516,            unit:'barra', pr:pp.ferro516, sub:cv.barras_f516*pp.ferro516});
    }
    if(cv.sacos_argam>0) civRows2.push({nm:'Argamassa AC3 — assentamento (sacos 20 kg)', qtd:cv.sacos_argam, unit:'saco', pr:pp.argamassa, sub:cv.sacos_argam*pp.argamassa});
    civRows2.forEach(function(it,i){
      var bg=i%2===0?'#fff':'#fdfaf3';
      p2+='<div style="background:'+bg+';padding:7px 13px;border-bottom:1px solid #ede8dc;display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center">'
        + '<span style="font-size:10px;color:#333">'+it.nm+'</span>'
        + '<span style="font-size:9.5px;color:#666;text-align:right;white-space:nowrap">'+it.qtd+' '+it.unit+' × R$&nbsp;'+_TI_fm(it.pr)+'</span>'
        + '<span style="font-size:10.5px;font-weight:700;color:#1a1a1a;text-align:right;white-space:nowrap">R$&nbsp;'+_TI_fm(it.sub)+'</span>'
        + '</div>';
    });
    // Linha de total
    p2+='<div style="background:#f5edcc;padding:8px 13px;display:grid;grid-template-columns:1fr auto;gap:8px;border-top:2px solid #e0d4a8">'
      + '<span style="font-size:10.5px;font-weight:700;color:#5a3800">TOTAL MATERIAL CIVIL</span>'
      + '<span style="font-size:11px;font-weight:700;color:#1a1a1a;text-align:right">R$&nbsp;'+_TI_fm(r.civil.custo)+'</span>'
      + '</div>';
    p2+='</div>';
  }
  // Params
  p2+=sh('⚙️ Parâmetros do Projeto');
  var params=[{l:'Tipo de serviço',v:o.tipoServNm||'—'},{l:'Material',v:esc(mat.nm||o.matNm||'—')+(mat.pr?' — R$ '+mat.pr+'/m²':'')},{l:'Acabamento',v:esc(acab.nm||o.acabNm||'—')},{l:'Espessura da pedra',v:d.E+' cm'}];
  if(ex.length)params.push({l:'Acessórios',v:ex.map(function(e2){return e2.i+' '+e2.l;}).join(', ')});
  p2+='<div style="border:1px solid #e8dfc4;border-radius:10px;overflow:hidden;margin-bottom:14px">';
  params.forEach(function(it,i){var bg=i%2===0?'#fff':'#fdfaf3';p2+='<div style="background:'+bg+';padding:7px 13px;border-bottom:1px solid #ede8dc;display:flex;justify-content:space-between"><span style="font-size:10px;color:#555">'+it.l+'</span><span style="font-size:10px;font-weight:600;color:#1a1a1a">'+it.v+'</span></div>';});
  p2+='</div></div>';
  p2+='<div style="background:#0f0c00;padding:8px 28px;display:flex;justify-content:space-between;border-top:1px solid rgba(201,168,76,.15)"><div style="font-size:8px;color:rgba(201,168,76,.45)">'+esc(emp.nome||'')+' · '+esc(emp.tel||'')+' · '+esc(emp.end||'')+'</div><div style="font-size:8px;color:rgba(255,255,255,.15)">Documento interno</div></div>';

  // ── Set print body ─────────────────────────────────────────────────────
  _gel('pTitle').textContent='';
  _gel('pMeta').textContent='';
  _gel('pBody').innerHTML='<div id="pdfPage1" style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;max-width:740px;margin:0 auto">'+p1+'</div>'
    +'<div id="pdfPage2" style="font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;max-width:740px;margin:0 auto">'+p2+'</div>';
  _gel('pFooter').textContent='';
}

function copiarWA() {
  var t = _gel('txtWA').value;
  if (!t) { toast('Gere um orçamento primeiro', true); return; }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(t).then(function(){ toast('✓ Copiado para área de transferência!'); });
  } else {
    var ta = document.createElement('textarea');
    ta.value = t;
    ta.style.cssText = 'position:fixed;top:-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    toast('✓ Copiado!');
  }
}

function imprimirPDF(){
  if(!pendOrc){toast('Gere um orçamento primeiro',true);return;}
  var pb=document.getElementById('pBody');
  if(!pb||!pb.innerHTML.trim()){toast('Recalcule antes de imprimir',true);return;}
  _abrirJanelaPDF(pb.innerHTML);
}

function baixarPDF(){
  if(!pendOrc){toast('Gere um orçamento primeiro',true);return;}
  var pb=document.getElementById('pBody');
  if(!pb||!pb.innerHTML.trim()){toast('Recalcule antes de baixar',true);return;}
  var emp=CFG&&CFG.emp?CFG.emp:{};
  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orçamento — '+(emp.nome||'HR Mármores')+'</title>'
    +'<style>@page{size:A4;margin:0}body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}#pdfPage1{page-break-after:always}#pdfPage2{page-break-after:auto}</style>'
    +'</head><body>'+pb.innerHTML+'</body></html>';
  var nome=(pendOrc.cli||'orcamento').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_');
  try{
    var blob=new Blob([html],{type:'text/html;charset=utf-8'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');
    a.href=url;a.download='Orcamento_'+nome+'.html';a.style.display='none';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);},3000);
    toast('📥 Baixando orçamento...');
  }catch(e){_abrirJanelaPDF(html);}
}

function compartilharPDF(){
  if(!pendOrc){toast('Gere um orçamento primeiro',true);return;}
  var pb=document.getElementById('pBody');
  if(!pb||!pb.innerHTML.trim()){toast('Recalcule antes de compartilhar',true);return;}
  var emp=CFG&&CFG.emp?CFG.emp:{};
  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Orçamento</title>'
    +'<style>@page{size:A4;margin:0}body{margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}#pdfPage1{page-break-after:always}</style>'
    +'</head><body>'+pb.innerHTML+'</body></html>';
  if(navigator.canShare&&navigator.share){
    var blob=new Blob([html],{type:'text/html'});
    var nome=(pendOrc.cli||'orcamento').replace(/[^a-zA-Z0-9\s]/g,'').replace(/\s+/g,'_');
    var file=new File([blob],'Orcamento_'+nome+'.html',{type:'text/html'});
    if(navigator.canShare({files:[file]})){
      navigator.share({files:[file],title:'Orçamento — '+(pendOrc.cli||''),text:'Orçamento HR Mármores e Granitos'})
        .catch(function(e){if(e.name!=='AbortError')_abrirJanelaPDF(pb.innerHTML);});
      return;
    }
  }
  _abrirJanelaPDF(pb.innerHTML);
}

function salvarHistorico() {
  if (!pendOrc) { toast('Gere um orçamento primeiro', true); return; }
  var idx = HIST.findIndex(function(h){ return h.id === pendOrc.id; });
  if (idx >= 0) {
    HIST[idx] = JSON.parse(JSON.stringify(pendOrc));
    toast('\u2713 Orçamento atualizado!');
  } else {
    HIST.unshift(JSON.parse(JSON.stringify(pendOrc)));
    if (HIST.length > 50) HIST.pop();
    toast('\u2713 Salvo no histórico!');
  }
  localStorage.setItem('hr_tum_hist', JSON.stringify(HIST));
  renderHistorico();
  // Salvar no orçamento ativo do ERP
  if (_TI_ambId) _tumInlineSaveAmb();
}

// ══════════════════════════════════════════════
// HISTÓRICO
// ══════════════════════════════════════════════

function renderHistorico() {
  var el = _gel('histList');
  var em = _gel('histEmpty');
  var cnt = _gel('histCount');

  var busca = (_gel('histBusca').value || '').toLowerCase();
  var lista = HIST.filter(function(o) {
    if (!busca) return true;
    var falStr = Array.isArray(o.fal) ? o.fal.map(function(f){return f.nome;}).join(' ') : (o.fal||'');
    var termos = [o.cli, o.cemi, o.matNm, falStr, o.cid, o.quad, o.lote, o.obs].join(' ').toLowerCase();
    return termos.indexOf(busca) >= 0;
  });

  cnt.textContent = HIST.length + ' orçamento' + (HIST.length!==1?'s':'') + ' salvo' + (HIST.length!==1?'s':'');

  if (!lista.length) {
    el.innerHTML = '';
    em.style.display = 'block';
    return;
  }
  em.style.display = 'none';

  var h = '';
  lista.forEach(function(o, i) {
    var r = o.r;
    var idx = HIST.indexOf(o);
    h += '<div class="hist-card">'
       + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">'
       + '<div class="hist-cli">'+o.cli+'</div>'
       + '<div class="hist-val">R$ '+_TI_fm(r.valor_vista)+'</div>'
       + '</div>'
       + '<div class="hist-meta">'
       + (o.num?'<span>🔖 '+o.num+'</span>':'')
       + (Array.isArray(o.fal) && o.fal.length > 0
           ? o.fal.map(function(f){ return '<span>⚰️ '+(f.nome||'Não informado')+'</span>'; }).join('')
           : (o.fal ? '<span>⚰️ '+o.fal+'</span>' : ''))
       + (o.cemi?'<span>🏛 '+o.cemi+'</span>':'')
       + '<span>'+o.matNm+'</span>'
       + '<span>'+r.d.N+' gav.</span>'
       + '<span>'+o.date+'</span>'
       + '</div>'
       + '<div style="margin-top:6px;display:flex;gap:8px">'
       + '<span class="badge badge-gold">'+r.m2_total.toFixed(2)+'m²</span>'
       + '<span class="badge badge-grn">'+r.prazo_total+' dias</span>'
       + '</div>'
       + '<div class="hist-actions">'
       + '<button class="btn btn-out btn-sm" onclick="verHistorico('+idx+')" style="flex:1;justify-content:center">👁 Ver</button>'
       + '<button class="btn btn-out btn-sm" onclick="recarregarOrcamento('+idx+')" style="flex:1;justify-content:center">✏️ Editar</button>'
       + '<button class="btn btn-out btn-sm" onclick="copiarWAHist('+idx+')" style="flex:1;justify-content:center">📲 WA</button>'
       + '<button class="btn btn-red btn-sm" onclick="confirmarDel('+idx+')">🗑</button>'
       + '</div>'
       + '</div>';
  });
  el.innerHTML = h;
}

function verHistorico(i) {
  var o = HIST[i];
  if (!o) return;
  pendOrc = NS.pendOrc = o;
  renderResultado(o);
  showTab('resultado', document.querySelectorAll('.tab')[1]);
}

function recarregarOrcamento(i) {
  var o = HIST[i];
  if (!o) { toast('Orçamento não encontrado', true); return; }

  // ── PASSO 1: Restaurar SEL completo ANTES de qualquer rebuild de UI ─────
  if (o._sel) {
    var s = o._sel;
    if (s.tipoServ)   SEL.tipoServ   = s.tipoServ;
    if (s.matId)      SEL.matId      = s.matId;
    if (s.acabamento) SEL.acabamento = s.acabamento;
    if (s.pecas)  Object.assign(SEL.pecas,  JSON.parse(JSON.stringify(s.pecas)));
    if (s.tampas) Object.assign(SEL.tampas, JSON.parse(JSON.stringify(s.tampas)));
    if (s.lapide) Object.assign(SEL.lapide, JSON.parse(JSON.stringify(s.lapide)));
    if (s.rebaixo)Object.assign(SEL.rebaixo,JSON.parse(JSON.stringify(s.rebaixo)));
    if (s.opts)   Object.assign(SEL.opts,   JSON.parse(JSON.stringify(s.opts)));
    if (s.adv)    Object.assign(SEL.adv,    JSON.parse(JSON.stringify(s.adv)));
    if (o.preset) SEL.preset = o.preset;
  } else {
    // Formato antigo (sem _sel): reconstruir do resultado
    if (o.r && o.r.mat)  SEL.matId      = o.r.mat.id;
    if (o.r && o.r.acab) SEL.acabamento = o.r.acab.id;
    if (o.r && o.r.ts)   SEL.tipoServ   = o.r.ts.id;
    if (o.preset)         SEL.preset     = o.preset;
    if (o.r) {
      SEL.opts.nCruz   = o.r.nCruz   || 0; SEL.opts.cruzGranito = (o.r.nCruz  || 0) > 0;
      SEL.opts.nFotos  = o.r.nFotos  || 0; SEL.opts.foto_porc   = (o.r.nFotos || 0) > 0;
      SEL.opts.nJarros = o.r.nJarros || 0; SEL.opts.jarro       = (o.r.nJarros|| 0) > 0;
    }
  }

  // Falecidos
  SEL.falecidos = (Array.isArray(o.fal) && o.fal.length > 0)
    ? JSON.parse(JSON.stringify(o.fal))
    : [{ nome:'', nasc:'', obit:'', frase:'' }];

  // ── PASSO 2: Rebuild da UI com o SEL correto ────────────────────────────
  buildPresets();
  buildTipoServ();
  buildAcabamentos();
  buildTampasAcab();
  buildMolduraPresets();
  buildGradePresets();
  buildPecas();
  buildOpcionais();
  buildAvancado();
  buildMatCats();
  buildMatList();
  // atualizarEspessuraDaPedra() é chamada ANTES de setar mE do _dims,
  // portanto ela pode sobrescrever o valor — os inputs de dims virão depois
  atualizarEspessuraDaPedra();
  buildFalecidos();

  // ── PASSO 3: Setar inputs de texto e dimensões APÓS os rebuilds ─────────
  // (garante que atualizarEspessuraDaPedra não sobrescreva o mE salvo)
  function sv(id, val) {
    var el = document.getElementById(id);
    if (el && val != null && val !== '') el.value = val;
  }
  sv('iCli',       o.cli  || '');
  sv('iTel',       o.tel  || '');
  sv('iCemiterio', o.cemi || '');
  sv('iCidade',    o.cid  || '');
  sv('iQuadra',    o.quad || '');
  sv('iLote',      o.lote || '');
  sv('iObs',       o.obs  || '');

  if (o._dims) {
    var dm = o._dims;
    sv('mC',          dm.C);
    sv('mL',          dm.L);
    sv('mE',          dm.E);          // Sobrescreve o default do material
    sv('mGav',        dm.N);
    sv('mDisp',       dm.disp);
    sv('mAe',         dm.Ae);
    sv('mAb',         dm.Ab);
    sv('mHcomp',      dm.Hc);
    sv('mHlaje',      dm.Hl);
    sv('mLapW',       dm.LapW);
    sv('mLapH',       dm.LapH);
    sv('mAlturaFinal',dm.altFinal);
    if (dm.AvRod != null) {
      sv('mAvRodape', dm.AvRod);
      if (SEL.rebaixo) SEL.rebaixo.avRodape = +dm.AvRod;
    }
  } else if (o.r && o.r.d) {
    var d = o.r.d;
    sv('mC',    d.C_cm    || '');
    sv('mL',    d.L_cm    || '');
    sv('mE',    d.E       || '');
    sv('mGav',  d.N       || '');
    sv('mDisp', d.disp    || '');
    sv('mAe',   d.Ae_cm   || '');
    sv('mAb',   d.Ab_cm   || '');
    sv('mHcomp',d.Hc_cm   || '');
    sv('mHlaje',d.Hl_cm   || '');
    sv('mLapW', d.LapW_cm || '');
    sv('mLapH', d.LapH_cm || '');
  }

  // ── PASSO 4: Atualizar UIs dependentes de dimensões + calcular ──────────
  atualizarTampasUI();
  mostrarCardLapide(!!SEL.pecas.lapide);
  _TI_calcular();
  showTab('orcamento', document.querySelectorAll('.tab')[0]);
  window.scrollTo(0, 0);
  toast('✓ Orçamento carregado — edite e gere novamente');
}
function copiarWAHist(i) {
  var o = HIST[i];
  if (!o) return;
  pendOrc = NS.pendOrc = o;
  gerarTextoWA(o, o.r);
  setTimeout(copiarWA, 50);
}

function confirmarDel(i) {
  delIdx = i;
  var btn = _gel('btnConfirmDel');
  btn.textContent = '🗑 Excluir';
  btn.onclick = function() {
    HIST.splice(delIdx, 1);
    localStorage.setItem('hr_tum_hist', JSON.stringify(HIST));
    renderHistorico();
    fecharModal('modalDel');
    toast('✓ Removido do histórico');
  };
  abrirModal('modalDel');
}

function confirmarLimpar() {
  var btn = _gel('btnConfirmDel');
  btn.textContent = '🗑 Limpar Tudo';
  btn.onclick = function() {
    HIST = NS.HIST = [];
    localStorage.setItem('hr_tum_hist', '[]');
    renderHistorico();
    fecharModal('modalDel');
    btn.textContent = '🗑 Excluir';
    toast('✓ Histórico limpo');
  };
  abrirModal('modalDel');
}

function exportarHistorico() {
  var blob = new Blob([JSON.stringify(HIST, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'hr-historico-'+new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')+'.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  toast('✓ Histórico exportado!');
}

function exportarCfg() {
  var blob = new Blob([JSON.stringify(CFG, null, 2)], {type:'application/json'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'hr-config-'+new Date().toLocaleDateString('pt-BR').replace(/\//g,'-')+'.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  toast('✓ Configurações exportadas!');
}

// ══════════════════════════════════════════════
// CONFIGURAÇÕES UI
// ══════════════════════════════════════════════

function testarGroq() {
  var key = (_gel('cGroqKey').value || '').trim();
  var res = _gel('groqTestResult');
  if (!key) { res.textContent = '⚠ Cole a chave primeiro'; res.style.color = 'var(--red)'; return; }
  res.textContent = '⏳ Testando...'; res.style.color = 'var(--gold2)';
  fetch('https://api.groq.com/openai/v1/models', {
    headers: { 'Authorization': 'Bearer ' + key }
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (d.error) {
      res.textContent = '✕ ' + (d.error.message || 'Chave inválida');
      res.style.color = 'var(--red)';
    } else {
      res.textContent = '✓ Groq conectado!';
      res.style.color = 'var(--grn)';
      CFG.groqKey = key;
      localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
      toast('✓ Chave Groq salva!');
    }
  })
  .catch(function(e){ res.textContent = '✕ Erro: ' + e.message; res.style.color = 'var(--red)'; });
}

function loadCfgUI() {
  _gel('cGroqKey').value = CFG.groqKey || '';
  _gel('cEmpNome').value = CFG.emp.nome;
  _gel('cEmpTel').value  = CFG.emp.tel;
  _gel('cEmpEnd').value  = CFG.emp.end;
  _gel('cEmpCid').value  = CFG.emp.cidade;
  _gel('cMargem').value  = CFG.margem;
  _gel('cParc').value    = CFG.parcMax;
  _gel('cJuros').value   = CFG.juros;
  _gel('cPedreiro').value   = CFG.mob.pedreiro;
  _gel('cAjudante').value   = CFG.mob.ajudante;
  _gel('cInstalacao').value = CFG.mob.instalacao;
  _gel('cMontagem').value   = CFG.mob.montagem;
  _gel('cTransporte').value = CFG.mob.transporte;
  _gel('cCimento').value    = CFG.civil.cimento;
  _gel('cAreia').value      = CFG.civil.areia;
  _gel('cBrita').value      = CFG.civil.brita;
  _gel('cArgamassa').value  = CFG.civil.argamassa;
  _gel('cFerro38').value    = CFG.civil.ferro38;
  _gel('cFerro516').value   = CFG.civil.ferro516;
  _gel('cMalha').value      = CFG.civil.malha;
  _gel('cBlocos').value     = CFG.civil.blocos;
  _gel('cCanaleta').value   = CFG.civil.canaleta || 6.5;
  // Inject canaleta field in CFG UI after blocos (if not yet present)
  _injectCanaletaCfgField();
  // Custos Indiretos
  _gel('cTrelica').value        = CFG.civil.trelica       || 22;
  _gel('cMassaPlastica').value  = CFG.civil.massa_plastica || 35;
  _gel('cIndConsumivel').value  = CFG.ind.consumivel_por_m2;
  _gel('cIndEnergia').value     = CFG.ind.energia_pct;
  _gel('cIndCombust').value     = CFG.ind.combustivel;
  _gel('cIndManut').value       = CFG.ind.manutencao_pct;
  _gel('cIndPerdas').value      = CFG.ind.perdas_pct;
  _gel('cIndRisco').value       = CFG.ind.risco_pct;
  // Injetar card de custos indiretos na config (se ainda não existe)
  _injectCfgIndCard();
}

function svCfg() {
  CFG.groqKey  = _gel('cGroqKey').value.trim();
  CFG.emp.nome   = _gel('cEmpNome').value;
  CFG.emp.tel    = _gel('cEmpTel').value;
  CFG.emp.end    = _gel('cEmpEnd').value;
  CFG.emp.cidade = _gel('cEmpCid').value;
  CFG.margem  = +(_gel('cMargem').value)  || 35;
  CFG.parcMax = +(_gel('cParc').value)    || 8;
  CFG.juros   = +(_gel('cJuros').value)   || 12;
  CFG.mob.pedreiro   = +(_gel('cPedreiro').value);
  CFG.mob.ajudante   = +(_gel('cAjudante').value);
  CFG.mob.instalacao = +(_gel('cInstalacao').value);
  CFG.mob.montagem   = +(_gel('cMontagem').value);
  CFG.mob.transporte = +(_gel('cTransporte').value);
  CFG.civil.cimento   = +(_gel('cCimento').value);
  CFG.civil.areia     = +(_gel('cAreia').value);
  CFG.civil.brita     = +(_gel('cBrita').value);
  CFG.civil.argamassa = +(_gel('cArgamassa').value);
  CFG.civil.ferro38   = +(_gel('cFerro38').value);
  CFG.civil.ferro516  = +(_gel('cFerro516').value);
  CFG.civil.malha     = +(_gel('cMalha').value);
  CFG.civil.blocos    = +(_gel('cBlocos').value);
  CFG.civil.canaleta       = +(_gel('cCanaleta').value)      || 6.5;
  CFG.civil.trelica        = +(_gel('cTrelica').value)       || 22;
  CFG.civil.massa_plastica = +(_gel('cMassaPlastica').value) || 35;
  // Custos Indiretos
  if (!CFG.ind) CFG.ind = JSON.parse(JSON.stringify(DEF_CFG.ind));
  CFG.ind.consumivel_por_m2 = +(_gel('cIndConsumivel').value) || 12;
  CFG.ind.energia_pct       = +(_gel('cIndEnergia').value)    || 1.5;
  CFG.ind.combustivel       = +(_gel('cIndCombust').value)    || 80;
  CFG.ind.manutencao_pct    = +(_gel('cIndManut').value)      || 0.5;
  CFG.ind.perdas_pct        = +(_gel('cIndPerdas').value)     || 2.5;
  CFG.ind.risco_pct         = +(_gel('cIndRisco').value)      || 2.0;
  localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
  buildMatList();
  _TI_calcular();
}

function _injectCanaletaCfgField() {
  if (document.getElementById('cCanaleta')) return;
  var blocosRow = document.querySelector('[for="cBlocos"]') ||
    Array.from(document.querySelectorAll('.cfg-k')).find(function(el){ return el.textContent.indexOf('Bloco')>=0; });
  if (!blocosRow) return;
  var parentRow = blocosRow.closest('.cfg-row') || blocosRow.parentElement;
  if (!parentRow) return;
  var newRow = document.createElement('div');
  newRow.className = 'cfg-row';
  newRow.innerHTML = '<div><div class="cfg-k">Canaleta 14×19×39 (un.)</div>'
    +'<div style="font-size:.6rem;color:var(--t4)">Cinta de amarração — diferente do bloco!</div></div>'
    +'<input class="cfg-inp" id="cCanaleta" type="number" min="0" step="0.1" oninput="svCfg()" value="'+(CFG.civil.canaleta||6.5)+'">';
  parentRow.after(newRow);
  // Treliça
  if (!document.getElementById('cTrelica')) {
    var rowTr = document.createElement('div');
    rowTr.className = 'cfg-row';
    rowTr.innerHTML = '<div><div class="cfg-k">Treliça eletrossoldada (R$/m)</div>'
      +'<div style="font-size:.6rem;color:var(--t4)">Alicerce + cintas + lajes</div></div>'
      +'<input class="cfg-inp" id="cTrelica" type="number" min="0" step="1" oninput="svCfg()" value="'+(CFG.civil.trelica||22)+'">';
    newRow.after(rowTr);
    // Massa plástica
    var rowMp = document.createElement('div');
    rowMp.className = 'cfg-row';
    rowMp.innerHTML = '<div><div class="cfg-k">Massa plástica resina+talco (R$/kg)</div>'
      +'<div style="font-size:.6rem;color:var(--t4)">Juntas entre peças de pedra</div></div>'
      +'<input class="cfg-inp" id="cMassaPlastica" type="number" min="0" step="1" oninput="svCfg()" value="'+(CFG.civil.massa_plastica||35)+'">';
    rowTr.after(rowMp);
  }
}

function _injectCfgIndCard() {
  if (document.getElementById('cfgIndCard')) return;
  // Find the import/export buttons div to insert before
  var pg = document.getElementById('pg-config');
  if (!pg) return;
  var btnDiv = pg.querySelector('div[style*="margin-bottom:30px"]');
  if (!btnDiv) return;
  var card = document.createElement('div');
  card.id = 'cfgIndCard';
  card.className = 'card';
  card.innerHTML = '<div class="card-head" style="background:rgba(212,148,58,.04);border-color:rgba(212,148,58,.2)">'
    +'<span class="card-title">📊 Custos Indiretos — Bases de Cálculo</span></div>'
    +'<div class="card-body">'
    +'<div class="callout warn" style="font-size:.72rem;margin-bottom:12px">Valores usados no cálculo automático de cada categoria. Para projetos específicos, use o override no card do orçamento.</div>'
    // Consumíveis
    +'<div style="font-size:.65rem;font-weight:700;color:#d4943a;text-transform:uppercase;letter-spacing:.06em;margin:8px 0 6px">🔧 Consumíveis</div>'
    +'<div class="cfg-row"><div class="cfg-k">Custo por m² de pedra (R$)<div style="font-size:.6rem;color:var(--t4)">Discos, brocas, cola, silicone, EPIs</div></div>'
    +'<input class="cfg-inp" id="cIndConsumivel" type="number" min="0" step="1" oninput="svCfg()"></div>'
    // Operacional
    +'<div style="font-size:.65rem;font-weight:700;color:#d4943a;text-transform:uppercase;letter-spacing:.06em;margin:12px 0 6px">⚡ Operacional</div>'
    +'<div class="cfg-row"><div class="cfg-k">Energia (% do custo direto)<div style="font-size:.6rem;color:var(--t4)">Energia elétrica + ferramental</div></div>'
    +'<input class="cfg-inp" id="cIndEnergia" type="number" min="0" step="0.1" oninput="svCfg()"></div>'
    +'<div class="cfg-row"><div class="cfg-k">Combustível / frete (R$ fixo)<div style="font-size:.6rem;color:var(--t4)">Por obra</div></div>'
    +'<input class="cfg-inp" id="cIndCombust" type="number" min="0" step="5" oninput="svCfg()"></div>'
    +'<div class="cfg-row"><div class="cfg-k">Manutenção (% do custo direto)<div style="font-size:.6rem;color:var(--t4)">Desgaste de equipamentos</div></div>'
    +'<input class="cfg-inp" id="cIndManut" type="number" min="0" step="0.1" oninput="svCfg()"></div>'
    // Perdas
    +'<div style="font-size:.65rem;font-weight:700;color:#d4943a;text-transform:uppercase;letter-spacing:.06em;margin:12px 0 6px">📉 Perdas</div>'
    +'<div class="cfg-row"><div class="cfg-k">Perdas (% sobre custo da pedra)<div style="font-size:.6rem;color:var(--t4)">Quebras, recortes, sobras</div></div>'
    +'<input class="cfg-inp" id="cIndPerdas" type="number" min="0" step="0.1" oninput="svCfg()"></div>'
    // Risco
    +'<div style="font-size:.65rem;font-weight:700;color:#d4943a;text-transform:uppercase;letter-spacing:.06em;margin:12px 0 6px">⚠️ Risco Técnico</div>'
    +'<div class="cfg-row"><div class="cfg-k">Risco (% do custo direto total)<div style="font-size:.6rem;color:var(--t4)">Içamento, retrabalho, garantia</div></div>'
    +'<input class="cfg-inp" id="cIndRisco" type="number" min="0" step="0.1" oninput="svCfg()"></div>'
    +'</div>';
  btnDiv.before(card);
  // Populate values
  _gel('cIndConsumivel').value = CFG.ind.consumivel_por_m2;
  _gel('cIndEnergia').value    = CFG.ind.energia_pct;
  _gel('cIndCombust').value    = CFG.ind.combustivel;
  _gel('cIndManut').value      = CFG.ind.manutencao_pct;
  _gel('cIndPerdas').value     = CFG.ind.perdas_pct;
  _gel('cIndRisco').value      = CFG.ind.risco_pct;
}

function buildPedrasCfg() {
  var el = _gel('cPedrasList');
  if (!el) return;
  var h = '';
  CFG.pedras.forEach(function(p, i) {
    h += '<div class="cfg-row">'
       + '<div>'
       +   '<div class="cfg-k">'+p.nm+'</div>'
       +   '<div style="font-size:.62rem;color:var(--t4)">'+p.cat+' · Peso: '+p.peso+' kg/m³</div>'
       + '</div>'
       + '<div style="display:flex;gap:6px;align-items:center">'
       + '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">'
       + '<div style="display:flex;gap:4px;align-items:center">'
       + '<span style="font-size:.58rem;color:var(--t4)">R$/m²</span>'
       + '<input class="cfg-inp" type="number" value="'+p.pr+'" style="width:72px" oninput="CFG.pedras['+i+'].pr=+this.value;svCfg2()">'
       + '</div>'
       + '<div style="display:flex;gap:4px;align-items:center">'
       + '<span style="font-size:.58rem;color:var(--t4)">Esp.(cm)</span>'
       + '<input class="cfg-inp" type="number" value="'+(p.esp||2)+'" min="1" max="5" style="width:52px" oninput="CFG.pedras['+i+'].esp=+this.value;svCfg2();atualizarEspessuraDaPedra()">'
       + '</div>'
       + '</div>'
       + '<button class="btn btn-sm btn-red" style="padding:5px 8px" onclick="remPedra('+i+')">✕</button>'
       + '</div>'
       + '</div>';
  });
  el.innerHTML = h;
}

function svCfg2() {
  localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
  buildMatList();
}

function abrirModalPedra() {
  document.getElementById('npNome').value = '';
  document.getElementById('npPr').value   = '';
  document.getElementById('npPeso').value = '75';
  document.getElementById('npEsp').value  = '2';
  abrirModal('modalPedra');
}

function confirmarAddPedra() {
  var nm = document.getElementById('npNome').value.trim();
  var pr = +(document.getElementById('npPr').value) || 0;
  var cat = document.getElementById('npCat').value;
  var peso = +(document.getElementById('npPeso').value) || 75;
  var esp  = +(document.getElementById('npEsp').value)  || 2;
  if (!nm) { toast('Nome obrigatório', true); return; }
  if (!pr || pr < 10) { toast('Preço inválido', true); return; }

  var novaPedra = { id:'p_'+Date.now(), nm:nm, cat:cat, pr:pr, peso:peso, esp:esp };
  CFG.pedras.push(novaPedra);
  localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));

  // Selecionar automaticamente a pedra recém-criada no SEL
  SEL.matId = novaPedra.id;
  // Expor o SEL atualizado globalmente para que código externo (app-tum-integracao)
  // acesse o objeto correto e não uma referência obsoleta
  window.SEL = SEL;

  buildPedrasCfg();
  buildMatCats();
  buildMatList();
  fecharModal('modalPedra');
  toast('✓ '+nm+' adicionada!');

  // Persistir o estado (amb.tumSEL) para que o próximo mount restaure
  // a pedra correta — sem isso, só _TI_calcular() salvaria o estado
  if (_TI_ambId) _tumInlineSaveAmb();
}

function remPedra(i) {
  if (CFG.pedras.length <= 1) { toast('Mínimo 1 pedra necessária', true); return; }
  var nm = CFG.pedras[i].nm;
  CFG.pedras.splice(i, 1);
  if (!CFG.pedras.find(function(p){return p.id===SEL.matId;})) SEL.matId = CFG.pedras[0].id;
  localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
  buildPedrasCfg();
  buildMatCats();
  buildMatList();
  toast('✓ '+nm+' removida');
}

function resetCfg() {
  if (!confirm('Restaurar todas as configurações padrão?')) return;
  CFG = JSON.parse(JSON.stringify(DEF_CFG));
  localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
  loadCfgUI();
  buildPedrasCfg();
  buildMatCats();
  buildMatList();
  toast('✓ Configurações restauradas');
}

function importarCfg() {
  var input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = function(e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
      try {
        var cfg = JSON.parse(ev.target.result);
        if (!cfg.emp || !cfg.pedras) throw new Error('Formato inválido');
        CFG = cfg;
        localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
        loadCfgUI();
        buildPedrasCfg();
        buildMatCats();
        buildMatList();
        toast('✓ Configurações importadas!');
      } catch(err) {
        toast('⚠ Arquivo inválido', true);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

// ══════════════════════════════════════════════
// MODAL
// ══════════════════════════════════════════════

function abrirModal(id) {
  document.getElementById(id).classList.add('on');
}
function fecharModal(id) {
  document.getElementById(id).classList.remove('on');
}
// Fechar ao clicar fora
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('on');
  }
});

// ══════════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════════

function _TI_fm(v) {
  return (+v||0).toLocaleString('pt-BR', { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function mascaraTel(el) {
  var v = el.value.replace(/\D/g,'').slice(0, 11);
  if (v.length === 0) { el.value = ''; return; }
  if (v.length <= 10) {
    v = v.replace(/^(\d{0,2})(\d{0,4})(\d{0,4})$/, function(_,a,b,c){
      return a ? ('('+a+(b?') '+b+(c?'-'+c:''):')')):a;
    });
  } else {
    v = v.replace(/^(\d{2})(\d{5})(\d{0,4})$/, '($1) $2-$3');
  }
  el.value = v;
}

function toast(msg, isErr) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('on','err');
  if (isErr) el.classList.add('err');
  void el.offsetWidth;
  el.classList.add('on');
  setTimeout(function(){ el.classList.remove('on','err'); }, 2800);
}

// ══════════════════════════════════════════════
// PLANTA TÉCNICA
// ══════════════════════════════════════════════

var PLT_ARG = 1; // cm argamassa por face

function pltFmt(v) { return parseFloat(v.toFixed(1)); }

function pltGetDims() {
  var d = getDims();
  // getDims() retorna em metros, convertemos para cm para a planta
  return {
    C:    d.C_cm,
    L:    d.L_cm,
    E:    d.E,          // já em cm
    N:    d.N,
    Ae:   d.Ae_cm,
    Hcomp: d.Hc_cm,
    Hlaje: d.Hl_cm,
    disp:  d.disp,
    LapW: d.LapW_cm,
    LapH: d.LapH_cm,
    Ab:   d.Ab_cm,
    pecas: SEL.pecas
  };
}

function pltCalcAlturaTotal(d) {
  if (d.N === 0) return d.Ae + d.E + 2;
  if (d.disp === 'horizontal') return d.Ae + d.Hcomp + d.Hlaje;
  return d.Ae + d.N * (d.Hcomp + d.Hlaje);
}

function pltCalcPedras(d, A) {
  var E = d.E, p = d.pecas, ARG = PLT_ARG;
  var pieces = [];

  // Tampa sempre
  pieces.push({
    nome:'Tampa Superior', qt:1,
    comp: pltFmt(d.C - 2*ARG), larg: pltFmt(d.L - 2*ARG), esp:E,
    obs:'Desc. '+ARG+'cm arg × 4 lados'
  });

  if (p.lat_esq) {
    pieces.push({
      nome:'Lateral Esquerda', qt:1,
      comp: pltFmt(A - ARG), larg: pltFmt(d.L - 2*ARG), esp:E,
      obs:'Alt. '+A+'−'+ARG+'='+pltFmt(A-ARG)+'cm · Larg. '+d.L+'−'+2*ARG+'='+pltFmt(d.L-2*ARG)+'cm'
    });
  }
  if (p.lat_dir) {
    pieces.push({
      nome:'Lateral Direita', qt:1,
      comp: pltFmt(A - ARG), larg: pltFmt(d.L - 2*ARG), esp:E,
      obs:'Idêntica à lateral esquerda'
    });
  }
  if (p.frente) {
    pieces.push({
      nome:'Frente / Frontal', qt:1,
      comp: pltFmt(A - ARG), larg: pltFmt(d.C - 2*ARG), esp:E,
      obs:'Alt. '+pltFmt(A-ARG)+'cm · Comp. '+pltFmt(d.C-2*ARG)+'cm'
    });
  }
  if (p.fundo) {
    pieces.push({
      nome:'Fundo / Tardoz', qt:1,
      comp: pltFmt(A - ARG), larg: pltFmt(d.C - 2*ARG), esp:E,
      obs:'Idêntica à frente'
    });
  }

  // Lajes divisórias (vertical)
  if (d.disp === 'vertical' && d.N > 1) {
    var nLaj = d.N - 1;
    var lajeC = Math.max(1, d.C - 2*(E+ARG));
    var lajeL = Math.max(1, d.L - 2*(E+ARG));
    pieces.push({
      nome:'Laje Divisória Horizontal', qt:nLaj,
      comp: pltFmt(lajeC), larg: pltFmt(lajeL), esp:E,
      obs:nLaj+' un. entre compartimentos'
    });
  }
  // Divisórias verticais (horizontal)
  if (d.disp === 'horizontal' && d.N > 1) {
    var nDiv = d.N - 1;
    var divL = Math.max(1, d.L - 2*(E+ARG));
    pieces.push({
      nome:'Divisória Vertical', qt:nDiv,
      comp: pltFmt(Math.max(1, d.Hcomp - ARG)), larg: pltFmt(divL), esp:E,
      obs:nDiv+' un. lado a lado'
    });
  }

  if (p.lapide) {
    pieces.push({
      nome:'Lápide', qt:1,
      comp: pltFmt(d.LapW - 2*ARG), larg: pltFmt(d.LapH - 2*ARG), esp:E,
      obs:'Bruto '+d.LapW+'×'+d.LapH+'cm → arg descontada'
    });
  }
  if (p.rodape && d.Ab > 0) {
    pieces.push({
      nome:'Rodapé — Frente e Fundo', qt:2,
      comp: pltFmt(d.Ab - ARG), larg: pltFmt(d.C - 2*ARG), esp:E,
      obs:'Alt. '+pltFmt(d.Ab-ARG)+'cm'
    });
    pieces.push({
      nome:'Rodapé — Laterais', qt:2,
      comp: pltFmt(d.Ab - ARG), larg: pltFmt(d.L - 2*ARG), esp:E,
      obs:'Alt. '+pltFmt(d.Ab-ARG)+'cm'
    });
  }
  return pieces;
}

function pltDesenharCorte(d, A) {
  var W=520, H=300, pad=55;
  var avW=W-pad*2, avH=H-pad*2;
  var scX=avW/d.C, scY=avH/A, sc=Math.min(scX,scY,2.8);
  var tw=d.C*sc, th=A*sc;
  var x0=(W-tw)/2, y0=(H-th)/2;
  var aeH=d.Ae*sc, hcH=d.Hcomp*sc, hlH=d.Hlaje*sc;
  var gold='#c9a84c',gold2='#e8c96a',gDim='rgba(201,168,76,.18)',gMid='rgba(201,168,76,.35)',gTop='rgba(201,168,76,.50)',bBase='#18160e',bBody='#12120f',compC='rgba(74,122,170,.18)',compB='#4a7aaa';
  var s='<defs>';
  s+='<pattern id="plt-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke="rgba(255,255,255,.03)" stroke-width=".5"/></pattern>';
  s+='<pattern id="plt-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(201,168,76,.3)" stroke-width="1.2"/></pattern>';
  s+='</defs>';
  s+='<rect width="'+W+'" height="'+H+'" fill="url(#plt-grid)"/>';

  // Base alvenaria
  s+='<rect x="'+x0+'" y="'+(y0+th-aeH)+'" width="'+tw+'" height="'+aeH+'" fill="'+bBase+'" stroke="'+gold+'" stroke-width="1.4" rx="2"/>';
  s+='<rect x="'+x0+'" y="'+(y0+th-aeH)+'" width="'+tw+'" height="'+aeH+'" fill="url(#plt-hatch)" opacity=".4"/>';
  s+='<text x="'+(x0+tw/2)+'" y="'+(y0+th-aeH/2+4)+'" fill="rgba(201,168,76,.7)" font-size="9" text-anchor="middle" font-family="DM Mono,monospace">BASE ALVENARIA '+d.Ae+'cm</text>';

  var bodyH=th-aeH;

  if (d.N===0) {
    s+='<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+bodyH+'" fill="'+bBody+'" stroke="'+gold+'" stroke-width="1.2" rx="2"/>';
    s+='<text x="'+(x0+tw/2)+'" y="'+(y0+bodyH/2+4)+'" fill="rgba(201,168,76,.4)" font-size="9" text-anchor="middle" font-family="DM Mono,monospace">SEM COMPARTIMENTO</text>';
  } else if (d.disp==='horizontal') {
    s+='<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+bodyH+'" fill="'+bBody+'" stroke="'+gold+'" stroke-width="1.2" rx="2"/>';
    s+='<rect x="'+(x0+1)+'" y="'+y0+'" width="'+(tw-2)+'" height="'+hlH+'" fill="'+gTop+'" stroke="'+gold+'" stroke-width=".8"/>';
    s+='<text x="'+(x0+tw/2)+'" y="'+(y0+hlH/2+3.5)+'" fill="rgba(201,168,76,.95)" font-size="7.5" text-anchor="middle" font-family="DM Mono,monospace">LAJE TAMPA '+d.Hlaje+'cm</text>';
    var compW=tw/d.N;
    for (var i=0;i<d.N;i++) {
      var cx=x0+i*compW;
      if (i>0) { s+='<rect x="'+(cx-2)+'" y="'+(y0+hlH)+'" width="4" height="'+(bodyH-hlH)+'" fill="rgba(201,168,76,.45)" stroke="'+gold+'" stroke-width=".7"/>'; }
      var iw=compW-12, ix2=cx+6;
      s+='<rect x="'+ix2+'" y="'+(y0+hlH+5)+'" width="'+iw+'" height="'+(bodyH-hlH-10)+'" fill="'+compC+'" stroke="'+compB+'" stroke-width=".6" rx="1"/>';
      s+='<text x="'+(ix2+iw/2)+'" y="'+(y0+hlH+(bodyH-hlH)/2+4)+'" fill="rgba(74,122,170,.7)" font-size="8" text-anchor="middle" font-family="DM Mono,monospace">C'+(i+1)+'</text>';
    }
  } else {
    s+='<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+bodyH+'" fill="'+bBody+'" stroke="'+gold+'" stroke-width="1.2" rx="2"/>';
    var curY2=y0+bodyH;
    for (var j=0;j<d.N;j++) {
      curY2-=(hlH+hcH);
      var isLast=(j===d.N-1);
      s+='<rect x="'+(x0+1)+'" y="'+curY2+'" width="'+(tw-2)+'" height="'+hlH+'" fill="'+(isLast?gTop:gMid)+'" stroke="'+gold+'" stroke-width=".8"/>';
      s+='<text x="'+(x0+tw/2)+'" y="'+(curY2+hlH/2+3.5)+'" fill="rgba(201,168,76,.95)" font-size="7.5" text-anchor="middle" font-family="DM Mono,monospace">'+(isLast?'LAJE TAMPA':'LAJE '+(j)+' — ')+d.Hlaje+'cm</text>';
      s+='<rect x="'+(x0+6)+'" y="'+(curY2+hlH+3)+'" width="'+(tw-12)+'" height="'+(hcH-6)+'" fill="'+compC+'" stroke="'+compB+'" stroke-width=".6" rx="1"/>';
      s+='<text x="'+(x0+tw/2)+'" y="'+(curY2+hlH+hcH/2+4)+'" fill="rgba(74,122,170,.7)" font-size="8" text-anchor="middle" font-family="DM Mono,monospace">COMP. '+(j+1)+' — '+d.Hcomp+'cm</text>';
    }
  }

  // Cota comprimento
  var cotaYb=y0+th+20;
  s+='<line x1="'+x0+'" y1="'+cotaYb+'" x2="'+(x0+tw)+'" y2="'+cotaYb+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<line x1="'+x0+'" y1="'+(cotaYb-6)+'" x2="'+x0+'" y2="'+(cotaYb+6)+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<line x1="'+(x0+tw)+'" y1="'+(cotaYb-6)+'" x2="'+(x0+tw)+'" y2="'+(cotaYb+6)+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<text x="'+(x0+tw/2)+'" y="'+(cotaYb+13)+'" fill="'+gold2+'" font-size="10" text-anchor="middle" font-family="DM Mono,monospace">'+d.C+' cm</text>';

  // Cota altura total
  var cotaXr=x0+tw+18;
  s+='<line x1="'+cotaXr+'" y1="'+y0+'" x2="'+cotaXr+'" y2="'+(y0+th)+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<line x1="'+(cotaXr-6)+'" y1="'+y0+'" x2="'+(cotaXr+6)+'" y2="'+y0+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<line x1="'+(cotaXr-6)+'" y1="'+(y0+th)+'" x2="'+(cotaXr+6)+'" y2="'+(y0+th)+'" stroke="'+gold+'" stroke-width=".9"/>';
  var midY=y0+th/2;
  s+='<text x="'+(cotaXr+15)+'" y="'+(midY+4)+'" fill="'+gold2+'" font-size="10" text-anchor="middle" font-family="DM Mono,monospace" transform="rotate(-90 '+(cotaXr+15)+' '+midY+')">'+A.toFixed(0)+' cm</text>';

  // Cota base
  var cotaXl=x0-18;
  s+='<line x1="'+cotaXl+'" y1="'+(y0+th-aeH)+'" x2="'+cotaXl+'" y2="'+(y0+th)+'" stroke="rgba(201,168,76,.5)" stroke-width=".7" stroke-dasharray="3,2"/>';
  s+='<line x1="'+(cotaXl-5)+'" y1="'+(y0+th-aeH)+'" x2="'+(cotaXl+5)+'" y2="'+(y0+th-aeH)+'" stroke="rgba(201,168,76,.5)" stroke-width=".7"/>';
  s+='<line x1="'+(cotaXl-5)+'" y1="'+(y0+th)+'" x2="'+(cotaXl+5)+'" y2="'+(y0+th)+'" stroke="rgba(201,168,76,.5)" stroke-width=".7"/>';
  var midBase=y0+th-aeH/2;
  s+='<text x="'+(cotaXl-14)+'" y="'+(midBase+4)+'" fill="rgba(201,168,76,.55)" font-size="8" text-anchor="middle" font-family="DM Mono,monospace" transform="rotate(-90 '+(cotaXl-14)+' '+midBase+')">'+d.Ae+'cm</text>';

  s+='<text x="8" y="16" fill="rgba(201,168,76,.35)" font-size="8" font-family="DM Mono,monospace">CORTE FRONTAL</text>';
  s+='<text x="8" y="26" fill="rgba(201,168,76,.2)" font-size="7" font-family="DM Mono,monospace">'+d.C+'×'+d.L+'×'+A.toFixed(0)+'cm</text>';

  var el=_gel('plt-svgCorte');
  if (el) el.innerHTML=s;
}

function pltDesenharPlanta(d) {
  var W=520, H=240, pad=58;
  var avW=W-pad*2, avH=H-pad*2;
  var scX=avW/d.C, scY=avH/d.L, sc=Math.min(scX,scY,4);
  var tw=d.C*sc, th=d.L*sc;
  var x0=(W-tw)/2, y0=(H-th)/2;
  var E=d.E, espPx=E*sc, argPx=PLT_ARG*sc;
  var gold='#c9a84c', gold2='#e8c96a';

  var s='<defs>';
  s+='<pattern id="plt-grid2" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0L0 0 0 20" fill="none" stroke="rgba(255,255,255,.03)" stroke-width=".5"/></pattern>';
  s+='<pattern id="plt-hatch2" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="rgba(201,168,76,.25)" stroke-width="1.2"/></pattern>';
  s+='</defs>';
  s+='<rect width="'+W+'" height="'+H+'" fill="url(#plt-grid2)"/>';

  s+='<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+th+'" fill="#18160e" stroke="'+gold+'" stroke-width="1.5"/>';

  // Paredes hachura
  s+='<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+(espPx+argPx)+'" fill="url(#plt-hatch2)" opacity=".65"/>';
  s+='<rect x="'+x0+'" y="'+(y0+th-espPx-argPx)+'" width="'+tw+'" height="'+(espPx+argPx)+'" fill="url(#plt-hatch2)" opacity=".65"/>';
  s+='<rect x="'+x0+'" y="'+y0+'" width="'+(espPx+argPx)+'" height="'+th+'" fill="url(#plt-hatch2)" opacity=".65"/>';
  s+='<rect x="'+(x0+tw-espPx-argPx)+'" y="'+y0+'" width="'+(espPx+argPx)+'" height="'+th+'" fill="url(#plt-hatch2)" opacity=".65"/>';

  // Interior
  var ix=x0+espPx+argPx, iy=y0+espPx+argPx;
  var iw=tw-2*(espPx+argPx), ih=th-2*(espPx+argPx);
  if (iw>0 && ih>0) {
    s+='<rect x="'+ix+'" y="'+iy+'" width="'+iw+'" height="'+ih+'" fill="rgba(74,122,170,.15)" stroke="#4a7aaa" stroke-width=".6" rx="1"/>';
    if (d.disp==='horizontal' && d.N>1) {
      var divW=iw/d.N;
      for (var k=1;k<d.N;k++) {
        var dx=ix+k*divW;
        s+='<line x1="'+dx+'" y1="'+iy+'" x2="'+dx+'" y2="'+(iy+ih)+'" stroke="#4a7aaa" stroke-width="1.5"/>';
      }
    }
  }

  // Argamassa destaque laranja
  s+='<rect x="'+(x0+espPx)+'" y="'+(y0+espPx)+'" width="'+argPx+'" height="'+(th-2*espPx)+'" fill="rgba(255,140,0,.15)" stroke="rgba(255,140,0,.3)" stroke-width=".5"/>';
  s+='<rect x="'+(x0+tw-espPx-argPx)+'" y="'+(y0+espPx)+'" width="'+argPx+'" height="'+(th-2*espPx)+'" fill="rgba(255,140,0,.15)" stroke="rgba(255,140,0,.3)" stroke-width=".5"/>';
  s+='<rect x="'+(x0+espPx)+'" y="'+(y0+espPx)+'" width="'+(tw-2*espPx)+'" height="'+argPx+'" fill="rgba(255,140,0,.15)" stroke="rgba(255,140,0,.3)" stroke-width=".5"/>';
  s+='<rect x="'+(x0+espPx)+'" y="'+(y0+th-espPx-argPx)+'" width="'+(tw-2*espPx)+'" height="'+argPx+'" fill="rgba(255,140,0,.15)" stroke="rgba(255,140,0,.3)" stroke-width=".5"/>';

  // Cota comprimento
  var cotaYb=y0+th+20;
  s+='<line x1="'+x0+'" y1="'+cotaYb+'" x2="'+(x0+tw)+'" y2="'+cotaYb+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<line x1="'+x0+'" y1="'+(cotaYb-6)+'" x2="'+x0+'" y2="'+(cotaYb+6)+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<line x1="'+(x0+tw)+'" y1="'+(cotaYb-6)+'" x2="'+(x0+tw)+'" y2="'+(cotaYb+6)+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<text x="'+(x0+tw/2)+'" y="'+(cotaYb+13)+'" fill="'+gold2+'" font-size="10" text-anchor="middle" font-family="DM Mono,monospace">'+d.C+' cm</text>';

  // Cota largura
  var cotaXr=x0+tw+18;
  s+='<line x1="'+cotaXr+'" y1="'+y0+'" x2="'+cotaXr+'" y2="'+(y0+th)+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<line x1="'+(cotaXr-6)+'" y1="'+y0+'" x2="'+(cotaXr+6)+'" y2="'+y0+'" stroke="'+gold+'" stroke-width=".9"/>';
  s+='<line x1="'+(cotaXr-6)+'" y1="'+(y0+th)+'" x2="'+(cotaXr+6)+'" y2="'+(y0+th)+'" stroke="'+gold+'" stroke-width=".9"/>';
  var midYL=y0+th/2;
  s+='<text x="'+(cotaXr+15)+'" y="'+(midYL+4)+'" fill="'+gold2+'" font-size="10" text-anchor="middle" font-family="DM Mono,monospace" transform="rotate(-90 '+(cotaXr+15)+' '+midYL+')">'+d.L+' cm</text>';

  // Medida interna
  if (iw>0 && ih>0) {
    var intC=pltFmt(d.C-2*(E+PLT_ARG)), intL=pltFmt(d.L-2*(E+PLT_ARG));
    s+='<line x1="'+ix+'" y1="'+(y0-13)+'" x2="'+(ix+iw)+'" y2="'+(y0-13)+'" stroke="rgba(74,122,170,.5)" stroke-width=".7" stroke-dasharray="3,2"/>';
    s+='<line x1="'+ix+'" y1="'+(y0-9)+'" x2="'+ix+'" y2="'+(y0-17)+'" stroke="rgba(74,122,170,.5)" stroke-width=".7"/>';
    s+='<line x1="'+(ix+iw)+'" y1="'+(y0-9)+'" x2="'+(ix+iw)+'" y2="'+(y0-17)+'" stroke="rgba(74,122,170,.5)" stroke-width=".7"/>';
    s+='<text x="'+(ix+iw/2)+'" y="'+(y0-19)+'" fill="rgba(74,122,170,.75)" font-size="8" text-anchor="middle" font-family="DM Mono,monospace">INT. '+intC+'×'+intL+' cm</text>';
  }

  s+='<rect x="8" y="'+(H-40)+'" width="10" height="10" fill="url(#plt-hatch2)" opacity=".7"/>';
  s+='<text x="22" y="'+(H-32)+'" fill="rgba(201,168,76,.55)" font-size="7" font-family="DM Mono,monospace">Pedra '+E+'cm + Arg. '+PLT_ARG+'cm</text>';
  s+='<rect x="8" y="'+(H-25)+'" width="10" height="10" fill="rgba(255,140,0,.2)" stroke="rgba(255,140,0,.4)" stroke-width=".7"/>';
  s+='<text x="22" y="'+(H-17)+'" fill="rgba(255,140,0,.55)" font-size="7" font-family="DM Mono,monospace">Argamassa '+PLT_ARG+' cm</text>';
  s+='<text x="8" y="'+(H-5)+'" fill="rgba(255,255,255,.2)" font-size="6.5" font-family="DM Mono,monospace">PLANTA BAIXA — VISTA SUPERIOR</text>';

  var el=_gel('plt-svgPlanta');
  if (el) el.innerHTML=s;
}

function pltRenderTabela(pieces) {
  var total=pieces.reduce(function(s,p){return s+p.qt;},0);
  var el=_gel('plt-totalPecas');
  if (el) el.textContent=total+' peças total';
  var rows='';
  pieces.forEach(function(p) {
    rows+='<tr style="border-bottom:1px solid var(--bd)">'
      +'<td style="padding:10px 10px;color:var(--tx);font-weight:600">'+p.nome+'</td>'
      +'<td style="padding:10px 10px;color:var(--gold2);font-family:\'DM Mono\',monospace;font-weight:700">'+p.qt+'×</td>'
      +'<td style="padding:10px 10px;color:var(--gold2);font-family:\'DM Mono\',monospace;font-weight:700">'+pltFmt(p.comp)+' cm</td>'
      +'<td style="padding:10px 10px;color:var(--gold2);font-family:\'DM Mono\',monospace;font-weight:700">'+pltFmt(p.larg)+' cm</td>'
      +'<td style="padding:10px 10px;color:var(--t2);font-family:\'DM Mono\',monospace">'+p.esp+' cm</td>'
      +'<td style="padding:10px 10px;color:var(--t3);font-size:.67rem">'+p.obs+'</td>'
      +'</tr>';
  });
  var tb=_gel('plt-tblBody');
  if (tb) tb.innerHTML=rows;
}

function pltRenderResumo(d, A) {
  var items=[
    ['Comprimento',d.C+' cm'],['Largura',d.L+' cm'],
    ['Altura total',A.toFixed(0)+' cm'],['Base alven.',d.Ae+' cm'],
    ['Pedra esp.',d.E+' cm'],['Argamassa',PLT_ARG+' cm/face'],
  ];
  var h='';
  items.forEach(function(it){
    h+='<div style="background:var(--bg2);border:1px solid var(--bd);border-radius:10px;padding:8px 14px">'
      +'<div style="font-size:.55rem;color:var(--t3);text-transform:uppercase;letter-spacing:.1em;font-family:\'DM Mono\',monospace">'+it[0]+'</div>'
      +'<div style="font-size:.95rem;font-weight:700;color:var(--gold2);font-family:\'DM Mono\',monospace">'+it[1]+'</div>'
      +'</div>';
  });
  var el=_gel('plt-resumo');
  if (el) el.innerHTML=h;
}

function renderPlanta() {
  var d=pltGetDims();
  var A=pltCalcAlturaTotal(d);
  pltRenderResumo(d,A);
  pltDesenharCorte(d,A);
  pltDesenharPlanta(d);
  var pieces=pltCalcPedras(d,A);
  pltRenderTabela(pieces);
}

function showTab(id, btn) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('on'); });
  document.querySelectorAll('.tab').forEach(function(t){ t.classList.remove('on'); });
  document.getElementById('pg-'+id).classList.add('on');
  if (btn) btn.classList.add('on');
  if (id === 'historico') renderHistorico();
  if (id === 'planta') renderPlanta();
  if (id === 'producao') renderProducao();
  if (id === 'chapas') renderChapas();
  // Limpar número do header ao abrir aba de novo orçamento sem pendente
  if (id === 'orcamento' && !pendOrc) {
    _gel('hdNum').textContent = '';
  }
}

// ══════════════════════════════════════════════
// PRODUÇÃO — LISTA TÉCNICA REAL DE PEÇAS
// ══════════════════════════════════════════════

function renderProducao() {
  var prodEmpty   = _gel('prodEmpty');
  var prodCont    = _gel('prodConteudo');
  if (!pendOrc || !pendOrc.r) {
    prodEmpty.style.display = 'block';
    prodCont.style.display  = 'none';
    return;
  }
  prodEmpty.style.display = 'none';
  prodCont.style.display  = 'block';

  var r  = pendOrc.r;
  var d  = r.d;
  var A  = r.A;
  var mat = r.mat;
  var Esp_m = r.Esp_m;
  var mob = CFG.mob;

  // ── Lista técnica de peças ──
  var totalQT   = 0;
  var totalM2   = 0;
  var totalPeso = 0;
  var totalCusto = 0;
  var espMult = { 2:1.00, 3:1.35, 4:1.70, 5:2.10 };
  var espM2 = espMult[d.E] || 1.35;

  var rows = '';
  var idx  = 1;
  r.pecasCalc.forEach(function(p) {
    var peso_peca = p.m2 * Esp_m * mat.peso;
    var custo_peca = p.m2 * mat.pr * espM2;
    var acabNm = p.prML > 0 ? (ACABAMENTOS.find(function(a){ return a.prML === p.prML; }) || {nm:'—'}).nm : '—';
    totalM2   += p.m2;
    totalPeso += peso_peca;
    totalCusto += custo_peca;

    var pesoClass = peso_peca >= 100 ? 'color:var(--red)' : peso_peca >= 60 ? 'color:var(--amber)' : 'color:var(--grn)';
    rows += '<tr style="border-bottom:1px solid var(--bd)">'
      +'<td style="padding:9px 10px;color:var(--t4);font-family:\'DM Mono\',monospace;font-size:.68rem">'+idx+'</td>'
      +'<td style="padding:9px 10px;color:var(--tx);font-weight:600;font-size:.8rem">'+p.nm+'</td>'
      +'<td style="padding:9px 10px;color:var(--gold2);font-family:\'DM Mono\',monospace;font-weight:700;font-size:.78rem">'+p.dim+'</td>'
      +'<td style="padding:9px 10px;color:var(--t2);font-family:\'DM Mono\',monospace;font-size:.75rem">'+d.E+' cm</td>'
      +'<td style="padding:9px 10px;color:var(--gold2);font-family:\'DM Mono\',monospace;font-weight:700;font-size:.78rem">'+p.m2.toFixed(3)+'</td>'
      +'<td style="padding:9px 10px;font-family:\'DM Mono\',monospace;font-size:.75rem;'+pesoClass+'">'+Math.round(peso_peca)+' kg</td>'
      +'<td style="padding:9px 10px;color:var(--t3);font-size:.72rem">'+acabNm+'</td>'
      +'<td style="padding:9px 10px;color:var(--grn);font-family:\'DM Mono\',monospace;font-size:.75rem">R$ '+_TI_fm(custo_peca)+'</td>'
      +'</tr>';
    idx++;
  });

  _gel('prodTblBody').innerHTML = rows;
  _gel('prodTotalPecas').textContent = (idx-1)+' peças · '+totalM2.toFixed(3)+' m² bruto · '+Math.round(totalPeso)+' kg';

  // Rodapé da tabela
  var foot = '<tr style="background:var(--bg3)">'
    +'<td colspan="4" style="padding:10px 10px;font-family:\'DM Mono\',monospace;font-size:.62rem;color:var(--gold);text-transform:uppercase;letter-spacing:.1em">TOTAIS</td>'
    +'<td style="padding:10px 10px;font-family:\'DM Mono\',monospace;font-weight:700;color:var(--gold2)">'+totalM2.toFixed(3)+' m²</td>'
    +'<td style="padding:10px 10px;font-family:\'DM Mono\',monospace;font-weight:700;color:var(--tx)">'+Math.round(totalPeso)+' kg</td>'
    +'<td></td>'
    +'<td style="padding:10px 10px;font-family:\'DM Mono\',monospace;font-weight:700;color:var(--grn)">R$ '+_TI_fm(totalCusto)+'</td>'
    +'</tr>';
  _gel('prodTblFoot').innerHTML = foot;

  // ── Estrutura civil ──
  var hCivil = '';
  if (r.ts.id === 'estrutura') {
    var Avis = A - d.Ae;
    var e_parede = 0.14;
    var Perim = 2*(d.C+d.L);
    var Vol_paredes = Perim * Avis * e_parede;
    var Vol_lajes   = d.C * d.L * Math.max(d.Hlaje - Esp_m, 0.06) * Math.max(d.N, 1);
    var Vol_base    = Perim * e_parede * d.Ae;
    var Vol_total   = Vol_paredes + Vol_lajes + Vol_base;

    hCivil += '<div class="det-sec" style="margin-top:0">🏗 Volumes Estruturais — Não Maciço</div>';
    hCivil += '<div class="det-line"><span class="det-k">Base perimetral de concreto ('+d.Ae_cm+' cm alt.)</span><span class="det-v">'+Vol_base.toFixed(3)+' m³</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Paredes laterais externas (parede 14 cm)</span><span class="det-v">'+Vol_paredes.toFixed(3)+' m³</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Lajes de concreto ('+Math.max(d.N,1)+' laje' +(Math.max(d.N,1)>1?'s':'')+')</span><span class="det-v">'+Vol_lajes.toFixed(3)+' m³</span></div>';
    hCivil += '<div class="det-line" style="font-weight:700"><span class="det-k"><strong>Volume total de concreto</strong></span><span class="det-v" style="color:var(--gold2)">'+Vol_total.toFixed(3)+' m³</span></div>';
    hCivil += '<div class="det-sec">📦 Insumos Civis</div>';
    hCivil += '<div class="det-line"><span class="det-k">Cimento CP-II (traço 1:2:3)</span><span class="det-v">'+r.civil.sacos_cimento+' sacos × 50kg</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Areia</span><span class="det-v">'+r.civil.m3_areia.toFixed(2)+' m³</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Brita 1</span><span class="det-v">'+r.civil.m3_brita.toFixed(2)+' m³</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Ferro 3/8"</span><span class="det-v">'+r.civil.barras_f38+' barras</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Ferro 5/16"</span><span class="det-v">'+r.civil.barras_f516+' barras</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Malha Q-92 (lajes)</span><span class="det-v">'+r.civil.m2_malha.toFixed(1)+' m²</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Blocos 14×19×39 (preenchimento)</span><span class="det-v">'+r.civil.unid_blocos+' un.</span></div>';
    if(r.civil.unid_canaletas>0) hCivil += '<div class="det-line"><span class="det-k">Canaletas 14×19×39 (cintas)</span><span class="det-v">'+r.civil.unid_canaletas+' un.</span></div>';
    if(r.civil.m_trelica>0)    hCivil += '<div class="det-line"><span class="det-k">Treliça eletrossoldada</span><span class="det-v">'+r.civil.m_trelica+' m</span></div>';
    if(r.civil.m2_reboco>0)    hCivil += '<div class="det-line"><span class="det-k">Reboco cimento+areia</span><span class="det-v">'+r.civil.m2_reboco+' m²</span></div>';
    if(r.civil.sacos_argam>0)  hCivil += '<div class="det-line"><span class="det-k">Argamassa AC3 (pedra)</span><span class="det-v">'+r.civil.sacos_argam+' sacos 20kg</span></div>';
    if(r.civil.kg_massa_plastica>0) hCivil += '<div class="det-line"><span class="det-k">Massa plástica resina+talco</span><span class="det-v">'+r.civil.kg_massa_plastica+' kg</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Argamassa de assentamento AC2/3</span><span class="det-v">'+r.civil.sacos_argam+' sacos × 20kg</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Custo civil total</span><span class="det-v" style="color:var(--gold2)">R$ '+_TI_fm(r.civil.custo)+'</span></div>';
  } else {
    hCivil += '<div class="callout" style="margin:0">Serviço <strong>'+r.ts.nm+'</strong> — estrutura civil não inclusa. Apenas argamassa de assentamento: <strong>'+r.civil.sacos_argam+' sacos AC3/III</strong>.</div>';
  }
  _gel('prodCivil').innerHTML = hCivil;

  // ── Mão de obra detalhada ──
  var hMob = '';
  if (r.ts.id === 'estrutura') {
    hMob += '<div class="det-sec" style="margin-top:0">🏗 Equipe de Obra Civil</div>';
    hMob += '<div class="det-line"><span class="det-k">Pedreiro — 1 profissional × '+r.nDias_ped+' dia'+(r.nDias_ped>1?'s':'')+'</span><span class="det-v">R$ '+_TI_fm(r.custo_ped)+'</span></div>';
    hMob += '<div class="det-line"><span class="det-k">Ajudante — 1 auxiliar × '+r.nDias_ajud+' dia'+(r.nDias_ajud>1?'s':'')+'</span><span class="det-v">R$ '+_TI_fm(r.custo_ajud)+'</span></div>';
    hMob += '<div class="det-sec">🪨 Equipe de Marmoraria</div>';
  } else if (r.ts.id === 'reforma') {
    hMob += '<div class="det-sec" style="margin-top:0">🔨 Remoção da Pedra Antiga</div>';
    var diasRem = r.custo_remocao > 0 ? Math.round(r.custo_remocao / mob.ajudante) : 0;
    hMob += '<div class="det-line"><span class="det-k">Desmonte e descarte — '+diasRem+' dia'+(diasRem>1?'s':'')+'</span><span class="det-v">R$ '+_TI_fm(r.custo_remocao)+'</span></div>';
    hMob += '<div class="det-sec">🪨 Reinstalação</div>';
  } else {
    hMob += '<div class="det-sec" style="margin-top:0">🪨 Equipe de Instalação</div>';
  }
  hMob += '<div class="det-line"><span class="det-k">Instalação pedra — '+r.nDiasInst+' dia'+(r.nDiasInst>1?'s'  :'')+ ' (≈'+totalM2.toFixed(1)+' m² ÷ 3 m²/dia)</span><span class="det-v">R$ '+_TI_fm(r.custo_inst)+'</span></div>';
  hMob += '<div class="det-line"><span class="det-k">Montagem e acabamento final — '+r.nDiasMont+' dia'+(r.nDiasMont>1?'s':'')+'</span><span class="det-v">R$ '+_TI_fm(r.custo_mont)+'</span></div>';
  hMob += '<div class="det-line"><span class="det-k">Transporte e deslocamento</span><span class="det-v">R$ '+_TI_fm(r.frete)+'</span></div>';
  hMob += '<div class="det-line" style="font-weight:700"><span class="det-k"><strong>Total mão de obra</strong></span><span class="det-v" style="color:var(--gold2)">R$ '+_TI_fm(r.custo_mob)+'</span></div>';
  _gel('prodMob').innerHTML = hMob;

  // ── Peso por grupo ──
  var grupoPeso = { tampas:0, laterais:0, frente:0, fundo:0, lapide:0, outros:0 };
  r.pecasCalc.forEach(function(p) {
    var pw = p.m2 * Esp_m * mat.peso;
    var nm = p.nm.toLowerCase();
    if (nm.indexOf('tampa') >= 0 || nm.indexOf('moldura') >= 0) grupoPeso.tampas += pw;
    else if (nm.indexOf('lateral') >= 0) grupoPeso.laterais += pw;
    else if (nm.indexOf('frente') >= 0 || nm.indexOf('frontal') >= 0) grupoPeso.frente += pw;
    else if (nm.indexOf('fundo') >= 0 || nm.indexOf('tardoz') >= 0) grupoPeso.fundo += pw;
    else if (nm.indexOf('lápide') >= 0 || nm.indexOf('lapide') >= 0) grupoPeso.lapide += pw;
    else grupoPeso.outros += pw;
  });
  var hPeso = '';
  var grupoNms = { tampas:'Tampas e moldura superior', laterais:'Painéis laterais', frente:'Frente / frontal', fundo:'Fundo / tardoz', lapide:'Lápide', outros:'Divisórias e outros' };
  var totalPesoGrupo = 0;
  Object.keys(grupoPeso).forEach(function(k) {
    if (grupoPeso[k] > 0.5) {
      var p = Math.round(grupoPeso[k]);
      totalPesoGrupo += p;
      var cls = p >= 150 ? 'color:var(--red)' : p >= 80 ? 'color:var(--amber)' : 'color:var(--grn)';
      hPeso += '<div class="det-line"><span class="det-k">'+grupoNms[k]+'</span><span class="det-v" style="'+cls+'">'+p+' kg</span></div>';
    }
  });
  hPeso += '<div class="det-line" style="font-weight:700"><span class="det-k"><strong>Peso total da pedra</strong></span><span class="det-v" style="color:var(--gold2)"><strong>'+Math.round(r.peso_total)+' kg</strong></span></div>';
  if (r.peso_total > 300) {
    hPeso += '<div class="callout warn" style="margin-top:12px;font-size:.73rem">⚠ <strong>Atenção:</strong> Peso total acima de 300 kg. Verificar capacidade de içamento e transporte.</div>';
  }
  _gel('prodPeso').innerHTML = hPeso;
}

// ══════════════════════════════════════════════
// OTIMIZADOR DE CHAPAS
// ══════════════════════════════════════════════

function renderChapas() {
  var el = _gel('chapasResultado');
  if (!pendOrc || !pendOrc.r) {
    el.innerHTML = '<div style="text-align:center;padding:40px 20px;color:var(--t4)"><div style="font-size:.85rem">Gere um orçamento para ver a distribuição nas chapas</div></div>';
    return;
  }

  var chapaC   = +(_gel('chapaC').value)   || 320;
  var chapaL   = +(_gel('chapaL').value)   || 190;
  var chapaE   = +(_gel('chapaE').value)   || 3;
  var sangria  = +(_gel('chapaSangria').value) || 0.8;
  var precoChapa = +(_gel('chapaPreco').value) || 0;

  var r  = pendOrc.r;
  var d  = r.d;

  // Montar lista de peças individuais para encaixe
  var pecasFlat = [];
  r.pecasCalc.forEach(function(p) {
    // Extrair dimensões da string 'dim' (ex: "118×80cm esp.3cm")
    var match = p.dim.match(/(\d+[\.,]?\d*)×(\d+[\.,]?\d*)/);
    if (!match) return;
    var comp = parseFloat(match[1].replace(',','.'));
    var larg = parseFloat(match[2].replace(',','.'));
    if (comp > 0 && larg > 0) {
      pecasFlat.push({ nm: p.nm, comp: comp, larg: larg, m2: p.m2 });
    }
  });

  if (pecasFlat.length === 0) {
    el.innerHTML = '<div class="callout warn">Não foi possível extrair as dimensões das peças. Verifique o orçamento.</div>';
    return;
  }

  // Algoritmo de empacotamento simples (Guillotine / First Fit Decreasing)
  // Ordenar peças da maior para menor
  pecasFlat.sort(function(a,b){ return (b.comp*b.larg) - (a.comp*a.larg); });

  var chapas = [];
  var pecasNaoEncaixadas = [];

  pecasFlat.forEach(function(peca) {
    var comp = peca.comp;
    var larg = peca.larg;

    // Verificar se a peça cabe na chapa (nas duas orientações)
    var cabe_normal   = comp <= chapaC - sangria && larg <= chapaL - sangria;
    var cabe_rotated  = larg <= chapaC - sangria && comp <= chapaL - sangria;

    if (!cabe_normal && !cabe_rotated) {
      pecasNaoEncaixadas.push(peca);
      return;
    }

    // Orientar a peça: preferir sem rotação, ou girar se necessário
    var pComp = cabe_normal ? comp : larg;
    var pLarg = cabe_normal ? larg : comp;
    var rotated = !cabe_normal;

    // Tentar encaixar em chapa existente usando shelf algorithm
    var encaixada = false;
    for (var ci = 0; ci < chapas.length; ci++) {
      var chapa = chapas[ci];
      // Tentar prateleiras existentes
      for (var si = 0; si < chapa.prateleiras.length; si++) {
        var prat = chapa.prateleiras[si];
        if (pComp <= prat.largDisp && pLarg <= prat.alt) {
          prat.pecas.push({ peca: peca, x: chapaC - prat.largDisp, y: prat.y, rotated: rotated, comp: pComp, larg: pLarg });
          prat.largDisp -= pComp + sangria;
          encaixada = true;
          break;
        }
        // Tentar rotação na prateleira
        if (!encaixada && pLarg <= prat.largDisp && pComp <= prat.alt) {
          var rotComp = pLarg, rotLarg = pComp;
          prat.pecas.push({ peca: peca, x: chapaC - prat.largDisp, y: prat.y, rotated: true, comp: rotComp, larg: rotLarg });
          prat.largDisp -= rotComp + sangria;
          encaixada = true;
          break;
        }
      }
      if (encaixada) break;

      // Nova prateleira nessa chapa
      var altDisp = chapaL - chapa.prateleiras.reduce(function(s,p){ return s + p.alt + sangria; }, 0);
      if (pLarg + sangria <= altDisp) {
        var yNova = chapa.prateleiras.reduce(function(s,p){ return s + p.alt + sangria; }, 0);
        var novaPrat = { alt: pLarg, y: yNova, largDisp: chapaC - pComp - sangria, pecas: [
          { peca: peca, x: 0, y: yNova, rotated: rotated, comp: pComp, larg: pLarg }
        ]};
        chapa.prateleiras.push(novaPrat);
        encaixada = true;
        break;
      }
    }

    if (!encaixada) {
      // Nova chapa
      var novaChapa = {
        prateleiras: [{
          alt: pLarg, y: 0, largDisp: chapaC - pComp - sangria,
          pecas: [{ peca: peca, x: 0, y: 0, rotated: rotated, comp: pComp, larg: pLarg }]
        }]
      };
      chapas.push(novaChapa);
    }
  });

  // Calcular aproveitamento por chapa
  var areaChapa = chapaC * chapaL;
  var html = '';

  // Resumo geral
  var totalUsado = pecasFlat.reduce(function(s,p){ return s + p.comp * p.larg; }, 0);
  var totalDisp  = chapas.length * areaChapa;
  var aproveitamento = totalDisp > 0 ? (totalUsado / totalDisp * 100) : 0;
  var sobra = totalDisp - totalUsado;

  html += '<div class="card" style="margin-bottom:14px">';
  html += '<div class="card-head"><span class="card-title">📊 Resumo do Corte</span></div>';
  html += '<div class="card-body">';
  html += '<div class="res-grid">';
  html += '<div class="res-card"><div class="res-lbl">Chapas necessárias</div><div class="res-val gold">'+chapas.length+' chapa'+(chapas.length>1?'s':'')+'</div><div class="res-sub">'+chapaC+'×'+chapaL+' cm</div></div>';
  html += '<div class="res-card"><div class="res-lbl">Aproveitamento médio</div><div class="res-val '+(aproveitamento>=80?'grn':aproveitamento>=60?'':'red')+'">'+aproveitamento.toFixed(1)+'%</div><div class="res-sub">'+totalUsado.toFixed(0)+' cm² utilizado</div></div>';
  html += '<div class="res-card"><div class="res-lbl">Sobra / perda real</div><div class="res-val">'+(sobra/10000).toFixed(3)+' m²</div><div class="res-sub">'+(100-aproveitamento).toFixed(1)+'% inutilizável</div></div>';
  if (precoChapa > 0) {
    html += '<div class="res-card"><div class="res-lbl">Custo em chapas</div><div class="res-val gold">R$ '+_TI_fm(chapas.length * precoChapa)+'</div><div class="res-sub">'+chapas.length+'× R$ '+_TI_fm(precoChapa)+'</div></div>';
  }
  if (pecasNaoEncaixadas.length > 0) {
    html += '<div class="res-card"><div class="res-lbl">Peças oversized</div><div class="res-val red">'+pecasNaoEncaixadas.length+'</div><div class="res-sub">Não cabem na chapa</div></div>';
  }
  html += '</div></div></div>';

  // Visualização de cada chapa
  chapas.forEach(function(chapa, ci) {
    var scaleX = 280 / chapaC;
    var scaleY = 160 / chapaL;
    var scale  = Math.min(scaleX, scaleY);
    var svgW   = chapaC * scale + 40;
    var svgH   = chapaL * scale + 30;

    var gold = '#c9a84c', gold2 = '#e8c96a';
    var colors = ['rgba(201,168,76,.35)','rgba(74,122,170,.35)','rgba(90,154,106,.35)','rgba(212,148,58,.35)','rgba(192,90,74,.35)','rgba(120,100,168,.35)'];
    var borders = ['rgba(201,168,76,.8)','rgba(74,122,170,.8)','rgba(90,154,106,.8)','rgba(212,148,58,.8)','rgba(192,90,74,.8)','rgba(120,100,168,.8)'];

    var areaUsada = chapa.prateleiras.reduce(function(s,prat){ return s + prat.pecas.reduce(function(ss,p){ return ss + p.comp * p.larg; }, 0); }, 0);
    var apr = (areaUsada / areaChapa * 100).toFixed(1);

    html += '<div class="card" style="margin-bottom:14px">';
    html += '<div class="card-head"><span class="card-title">Chapa '+(ci+1)+' — Aproveitamento '+apr+'%</span>'
           +'<span style="font-size:.65rem;color:var(--t3)">'+chapaC+'×'+chapaL+' cm</span></div>';
    html += '<div class="card-body" style="padding:8px">';
    html += '<svg width="'+svgW+'" height="'+svgH+'" style="display:block;max-width:100%" viewBox="0 0 '+svgW+' '+svgH+'" xmlns="http://www.w3.org/2000/svg">';

    // Fundo da chapa
    html += '<rect x="20" y="10" width="'+(chapaC*scale)+'" height="'+(chapaL*scale)+'" fill="#18160e" stroke="'+gold+'" stroke-width="1.5"/>';

    // Peças
    var pIdx = 0;
    chapa.prateleiras.forEach(function(prat) {
      prat.pecas.forEach(function(pp) {
        var x = 20 + pp.x * scale;
        var y = 10 + pp.y * scale;
        var w = pp.comp * scale - sangria * scale;
        var h = pp.larg * scale - sangria * scale;
        var ci2 = pIdx % colors.length;
        html += '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+colors[ci2]+'" stroke="'+borders[ci2]+'" stroke-width="1" rx="2"/>';
        if (w > 30 && h > 15) {
          var nm = pp.peca.nm.replace(/Lateral (Esquerda|Direita)/g,'Lat.').replace('Tampa Superior','Tampa').replace('Frente / Frontal','Frente');
          html += '<text x="'+(x+w/2)+'" y="'+(y+h/2-4)+'" fill="rgba(255,255,255,.8)" font-size="6" text-anchor="middle" font-family="DM Mono,monospace">'+nm.substring(0,14)+'</text>';
          html += '<text x="'+(x+w/2)+'" y="'+(y+h/2+5)+'" fill="rgba(255,255,255,.5)" font-size="5.5" text-anchor="middle" font-family="DM Mono,monospace">'+Math.round(pp.peca.comp)+'×'+Math.round(pp.peca.larg)+'</text>';
        }
        pIdx++;
      });
    });

    // Área de sobra (highlight)
    html += '<text x="22" y="'+(svgH-5)+'" fill="rgba(201,168,76,.4)" font-size="7" font-family="DM Mono,monospace">CHAPA '+(ci+1)+' — '+chapaC+'×'+chapaL+' cm · Uso: '+apr+'%</text>';
    html += '</svg>';
    html += '</div></div>';
  });

  if (pecasNaoEncaixadas.length > 0) {
    html += '<div class="callout warn" style="margin-bottom:14px">';
    html += '<strong>⚠ Peças que não cabem nesta chapa:</strong><br>';
    pecasNaoEncaixadas.forEach(function(p) {
      html += p.nm + ' ('+Math.round(p.comp)+'×'+Math.round(p.larg)+' cm)<br>';
    });
    html += 'Considere usar chapas maiores para essas peças.';
    html += '</div>';
  }

  el.innerHTML = html;
}

function _abrirJanelaPDF(bodyHtml){
  var emp=CFG&&CFG.emp?CFG.emp:{};
  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orçamento — '+(emp.nome||'HR Mármores')+'</title>'
    +'<style>@page{size:A4;margin:0}body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}#pdfPage1{page-break-after:always}#pdfPage2{page-break-after:auto}</style>'
    +'</head><body>'+bodyHtml+'<script>window.onload=function(){window.print();}<\/script></body></html>';
  var w=window.open('','_blank');
  if(w){w.document.write(html);w.document.close();}
  else{try{var blob=new Blob([html],{type:'text/html;charset=utf-8'});var url=URL.createObjectURL(blob);var a=document.createElement('a');a.href=url;a.target='_blank';a.click();setTimeout(function(){URL.revokeObjectURL(url);},10000);}catch(e){toast('Permita pop-ups para imprimir',true);}}
}

function imprimirProducao() {
  window.print();
}

// ══════════════════════════════════════════════
// HR — NAMESPACE GLOBAL
// ══════════════════════════════════════════════

window.HR              = window.HR              || {};
HR.modules             = HR.modules             || {};
HR.modules.tumulos     = HR.modules.tumulos     || {};

// ── Espaços reservados para a próxima etapa ──
// state: receberá SEL, CFG, HIST, pendOrc
// cache: receberá resultados de render já computados
HR.modules.tumulos.state = {};
HR.modules.tumulos.cache = {};

// ══════════════════════════════════════════════
// HR.modules.tumulos.init
// Ponto único de boot do módulo.
// Todas as chamadas de inicialização passam aqui.
// A init() global existente é preservada intacta
// e chamada de dentro deste método — zero risco.
// ══════════════════════════════════════════════

HR.modules.tumulos.init = function() {
  console.log('[HR] tumulos · boot');
  init();   // ← init() global existente — não alterada
};

// ══════════════════════════════════════════════
// HR.modules.tumulos.destroy
// Teardown para quando o ERP desmontar o módulo.
// Por enquanto no-op: nenhum listener externo ainda.
// ══════════════════════════════════════════════

HR.modules.tumulos.destroy = function() {
  // no-op — será populado ao migrar listeners
};

// ══════════════════════════════════════════════
// START — boot via DOMContentLoaded
// Garante que o DOM existe antes de inicializar.
// Substitui a chamada nua init() do v12/v13.
// ══════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  HR.modules.tumulos.init();
});


// ═══════════════════════════════════════════════════════════════════════════
// CSS e HTML templates
// ═══════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════
// _TI_scopeCSS — prefixa seletores com .tum-v14-root
// para não vazar estilos pro app principal
// ══════════════════════════════════════════════
function _TI_scopeCSS(css) {
  var SCOPE = '.tum-v14-root';
  var result = '';
  var remaining = css;
  while (remaining.length > 0) {
    remaining = remaining.replace(/^\s+/, '');
    if (!remaining) break;
    if (remaining[0] === '@') {
      var openIdx = remaining.indexOf('{');
      if (openIdx === -1) { result += remaining; break; }
      var depth = 0, closeIdx = -1;
      for (var k = openIdx; k < remaining.length; k++) {
        if (remaining[k] === '{') depth++;
        else if (remaining[k] === '}') { depth--; if (depth === 0) { closeIdx = k; break; } }
      }
      if (closeIdx === -1) { result += remaining; break; }
      var atRuleName = remaining.slice(0, openIdx);
      var innerContent = remaining.slice(openIdx + 1, closeIdx);
      if (atRuleName.trim().indexOf('@keyframes') === 0) {
        result += remaining.slice(0, closeIdx + 1);
      } else {
        var scopedInner = innerContent.replace(/([^{}]+)\{([^{}]+)\}/g, function(_, sel, decl) {
          var s = sel.trim().split(',').map(function(x) {
            x = x.trim();
            return (x && x.indexOf(SCOPE) !== 0) ? SCOPE + ' ' + x : x;
          }).join(', ');
          return s + '{' + decl + '}';
        });
        result += atRuleName + '{' + scopedInner + '}';
      }
      remaining = remaining.slice(closeIdx + 1);
    } else {
      var openIdx = remaining.indexOf('{');
      if (openIdx === -1) { result += remaining; break; }
      var selector = remaining.slice(0, openIdx).trim();
      var closeIdx = remaining.indexOf('}', openIdx);
      if (closeIdx === -1) { result += remaining; break; }
      if (selector) {
        var scoped = selector.split(',').map(function(sel) {
          sel = sel.trim();
          if (!sel) return '';
          if (sel.indexOf('*') === 0 || sel === 'html' || sel === 'body') return sel;
          if (sel.indexOf(SCOPE) === 0) return sel;
          return SCOPE + ' ' + sel;
        }).filter(Boolean).join(', ');
        result += scoped + remaining.slice(openIdx, closeIdx + 1);
      }
      remaining = remaining.slice(closeIdx + 1);
    }
  }
  return result;
}

function _TI_getCSS() {
  return "/* HR Mármores — Túmulo inline v14 redesigned */\n.tum-v14-root{font-family:'Outfit',sans-serif}\n.tum-v14-root :root{\n  --bg:#09090a;--bg2:#101012;--bg3:#161618;--bg4:#1d1d20;\n  --bd:rgba(255,255,255,.06);--bd2:rgba(255,255,255,.10);\n  --gold:#c9a84c;--gold2:#e8c96a;--gold3:rgba(201,168,76,.18);--gdim:rgba(201,168,76,.06);\n  --tx:#edeae2;--t2:#b0ab9e;--t3:#787068;--t4:#484440;\n  --grn:#5a9a6a;--red:#c05a4a;--blue:#4a7aaa;--amber:#d4943a;--brd:rgba(255,255,255,.10)\n}\n*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\n.tum-v14-root{background:var(--bg);color:var(--tx);font-size:14px;line-height:1.6;min-height:100vh}\n\n/* TOAST */\n#toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);\n  background:#1a1a1e;border:1px solid var(--gold);border-radius:12px;\n  padding:10px 20px;font-size:.8rem;color:var(--gold2);\n  transition:transform .3s,opacity .3s;opacity:0;z-index:9999;white-space:nowrap;pointer-events:none;\n  box-shadow:0 8px 32px rgba(201,168,76,.15)}\n#toast.on{transform:translateX(-50%) translateY(0);opacity:1}\n#toast.err{border-color:var(--red);color:#e88a7a}\n\n/* HEADER */\n.app-header{background:var(--bg2);border-bottom:1px solid var(--bd);padding:14px 20px;\n  display:flex;align-items:center;justify-content:space-between;position:sticky;top:0;z-index:50}\n.header-left{display:flex;align-items:center;gap:14px}\n.header-logo{font-family:'Cormorant Garamond',serif;font-size:1.25rem;font-weight:600;color:var(--gold);letter-spacing:.04em}\n.header-sub{font-family:'DM Mono',monospace;font-size:.6rem;color:var(--t3);letter-spacing:.15em;text-transform:uppercase;border-left:1px solid var(--bd2);padding-left:14px;margin-left:4px}\n.header-right{display:flex;align-items:center;gap:8px}\n.header-badge{font-family:'DM Mono',monospace;font-size:.58rem;color:var(--t4);letter-spacing:.1em}\n\n/* TABS */\n"
    + ".tabs{display:flex;border-bottom:2px solid var(--bd);background:var(--bg2);padding:0 16px;gap:2px;overflow-x:auto;scrollbar-width:none}\n.tabs::-webkit-scrollbar{display:none}\n.tab{padding:11px 16px;font-size:.75rem;font-weight:600;color:var(--t3);cursor:pointer;\n  border-bottom:2px solid transparent;transition:all .15s;white-space:nowrap;\n  background:none;border-top:none;border-left:none;border-right:none;letter-spacing:.03em;margin-bottom:-2px}\n.tab:hover{color:var(--t2)}\n.tab.on{color:var(--gold);border-bottom-color:var(--gold);background:rgba(201,168,76,.04)}\n\n/* PAGE */\n.page{display:none;padding:16px}\n.page.on{display:block}\n\n/* CARDS — core structure */\n.card{\n  background:var(--bg2);\n  border:1px solid var(--bd);\n  border-radius:14px;\n  margin-bottom:12px;\n  overflow:hidden;\n  transition:border-color .2s;\n}\n.card:focus-within{border-color:rgba(201,168,76,.25)}\n\n.card-head{\n  display:flex;align-items:center;justify-content:space-between;\n  padding:13px 16px 11px;\n  border-bottom:1px solid var(--bd);\n  background:var(--bg3);\n  cursor:default;\n}\n.card-title{\n  font-size:.82rem;font-weight:700;color:var(--gold2);\n  letter-spacing:.02em;display:flex;align-items:center;gap:8px\n}\n.card-badge{\n  font-size:.62rem;color:var(--gold);font-weight:600;\n  background:rgba(201,168,76,.12);padding:3px 9px;border-radius:20px;\n  border:1px solid rgba(201,168,76,.2);letter-spacing:.03em;white-space:nowrap\n}\n.card-body{padding:14px 16px;display:flex;flex-direction:column;gap:12px}\n\n/* FIELD GRID */\n.f-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}\n.f-grid.full{grid-template-columns:1fr}\n.f-grid.tri{grid-template-columns:1fr 1fr 1fr}\n.f{display:flex;flex-direction:column;gap:5px}\n.f label{\n  font-size:.62rem;font-weight:700;color:var(--t3);\n  letter-spacing:.08em;text-transform:uppercase\n}\n.f input,.f select,.f textarea{\n  background:var(--bg4);border:1.5px solid var(--bd2);\n  border-radius:9px;padding:9px 12px;\n"
    + "  font-size:.85rem;color:var(--tx);font-family:inherit;\n  transition:border-color .15s,background .15s;outline:none;width:100%\n}\n.f input:focus,.f select:focus,.f textarea:focus{\n  border-color:var(--gold);background:rgba(201,168,76,.04)\n}\n.f input[type=number]{font-variant-numeric:tabular-nums}\n.f-hint{font-size:.62rem;color:var(--t4);margin-top:2px;line-height:1.4}\n\n/* SEPARATOR */\n.sep{height:1px;background:var(--bd);margin:4px 0}\n\n/* PRESETS — pill buttons */\n.presets{display:flex;flex-wrap:wrap;gap:7px}\n.preset{\n  padding:7px 14px;border-radius:20px;font-size:.75rem;font-weight:600;\n  border:1.5px solid var(--bd2);color:var(--t3);background:transparent;\n  cursor:pointer;transition:all .15s;white-space:nowrap\n}\n.preset:hover{border-color:var(--gold);color:var(--gold2);background:var(--gdim)}\n.preset.on{border-color:var(--gold);color:#000;background:var(--gold)}\n\n/* TOGGLES */\n.tog-row{\n  display:flex;align-items:center;justify-content:space-between;\n  padding:10px 0;gap:14px\n}\n.tog-lbl{font-size:.82rem;font-weight:600;color:var(--tx)}\n.tog-sub{font-size:.68rem;color:var(--t3);margin-top:2px;line-height:1.3}\n.tog{\n  width:44px;height:24px;border-radius:12px;\n  background:var(--bg4);border:1.5px solid var(--bd2);\n  position:relative;cursor:pointer;flex-shrink:0;\n  transition:background .2s,border-color .2s\n}\n.tog::after{\n  content:'';position:absolute;top:3px;left:3px;\n  width:16px;height:16px;border-radius:50%;\n  background:var(--t3);transition:left .2s,background .2s\n}\n.tog.on{background:rgba(201,168,76,.2);border-color:var(--gold)}\n.tog.on::after{left:21px;background:var(--gold)}\n\n/* CALLOUT BOXES */\n.callout{\n  padding:10px 14px;border-radius:10px;font-size:.75rem;\n  line-height:1.5;border-left:3px solid\n}\n.callout.info{background:rgba(74,122,170,.08);border-color:#4a7aaa;color:#8ab4d8}\n.callout.warn{background:rgba(212,148,58,.08);border-color:#d4943a;color:#e8b870}\n"
    + ".callout.suc{background:rgba(90,154,106,.08);border-color:#5a9a6a;color:#8ac89a}\n\n/* PEÇAS TOGGLE LIST */\n.pec-list{display:flex;flex-direction:column;gap:4px}\n.pec-row{\n  display:flex;align-items:center;justify-content:space-between;\n  padding:9px 12px;background:var(--bg3);border-radius:9px;\n  border:1px solid var(--bd);transition:border-color .15s\n}\n.pec-row.on{border-color:rgba(201,168,76,.3)}\n.pec-lbl{font-size:.8rem;font-weight:500;color:var(--t2)}\n.pec-dim{font-size:.72rem;color:var(--gold);font-weight:600}\n\n/* RESULT AREA */\n.res-section{background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:16px;margin-bottom:12px}\n.res-title{font-size:.6rem;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);font-weight:700;margin-bottom:10px;padding-bottom:8px;border-bottom:1px solid var(--bd)}\n.res-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:12px}\n.res-card{background:var(--bg4);border:1px solid var(--bd);border-radius:10px;padding:12px}\n.res-card.gold{border-color:var(--gold);background:rgba(201,168,76,.06)}\n.res-k{font-size:.58rem;letter-spacing:.08em;text-transform:uppercase;color:var(--t3);font-weight:700;margin-bottom:4px}\n.res-v{font-size:1.1rem;font-weight:800;color:var(--gold2)}\n.res-sub{font-size:.68rem;color:var(--t4);margin-top:2px}\n.res-actions{display:flex;flex-direction:column;gap:8px}\n\n/* PIECE TABLE */\n.pec-table{width:100%;border-collapse:collapse;font-size:.75rem}\n.pec-table th{padding:7px 10px;text-align:left;color:var(--t3);font-size:.6rem;\n  letter-spacing:.08em;text-transform:uppercase;border-bottom:1px solid var(--bd)}\n.pec-table td{padding:8px 10px;border-bottom:1px solid var(--bd)}\n.pec-table tr:hover td{background:var(--bg4)}\n.pec-table .dim{color:var(--gold);font-weight:600;font-size:.72rem}\n.pec-table .m2{color:var(--gold2);font-weight:700}\n\n/* BUTTONS */\n.btn{\n  display:inline-flex;align-items:center;gap:8px;\n"
    + "  padding:11px 18px;border-radius:10px;font-size:.82rem;font-weight:600;\n  cursor:pointer;border:1.5px solid transparent;\n  transition:all .15s;letter-spacing:.02em;font-family:inherit\n}\n.btn-gold{background:var(--gold);color:#000;border-color:var(--gold)}\n.btn-gold:hover{background:var(--gold2);border-color:var(--gold2)}\n.btn-out{background:transparent;color:var(--t2);border-color:var(--bd2)}\n.btn-out:hover{border-color:var(--gold);color:var(--gold2);background:var(--gdim)}\n.btn-red{background:rgba(192,90,74,.15);color:#e88a7a;border-color:rgba(192,90,74,.3)}\n.btn-red:hover{background:rgba(192,90,74,.25)}\n.btn-g{background:rgba(90,154,106,.12);color:#8ac89a;border-color:rgba(90,154,106,.25)}\n.btn-g:hover{background:rgba(90,154,106,.2)}\n.btn-sm{padding:8px 13px;font-size:.75rem;border-radius:8px}\n.btn-full{width:100%;justify-content:center}\n\n/* MODAL */\n.modal-overlay{\n  display:none;position:fixed;inset:0;background:rgba(0,0,0,.75);\n  z-index:1000;align-items:flex-end;justify-content:center\n}\n.modal-overlay.on{display:flex}\n.modal{\n  background:var(--bg2);border:1px solid var(--bd);border-radius:18px 18px 0 0;\n  padding:24px 20px 34px;width:100%;max-width:480px;\n  max-height:85vh;overflow-y:auto;\n  animation:slideUp .25s ease\n}\n@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}\n.modal-title{font-size:1rem;font-weight:700;color:var(--gold2);margin-bottom:16px}\n.modal-close{position:absolute;top:16px;right:16px;background:none;border:none;\n  color:var(--t3);font-size:1.2rem;cursor:pointer;padding:4px}\n.modal-close:hover{color:var(--tx)}\n\n/* CFG ROWS */\n.cfg-row{display:flex;align-items:center;justify-content:space-between;\n  padding:10px 0;border-bottom:1px solid var(--bd)}\n.cfg-k{font-size:.8rem;font-weight:600;color:var(--t2)}\n.cfg-inp{background:var(--bg4);border:1px solid var(--bd2);border-radius:7px;\n  padding:5px 10px;font-size:.8rem;color:var(--tx);text-align:right;font-family:inherit}\n"
    + ".cfg-inp:focus{border-color:var(--gold);outline:none}\n\n/* TAMPA PREVIEW */\n.tampa-wrap{position:relative;background:var(--bg3);border:1px solid var(--bd);\n  border-radius:12px;aspect-ratio:4/3;overflow:hidden}\ncanvas{border-radius:12px}\n\n/* STEPS INDICATOR */\\n.steps{display:flex;gap:6px;padding:0 16px 12px;overflow-x:auto;scrollbar-width:none}\\n.steps-wrap{display:flex;align-items:flex-start;margin:0 0 16px;padding:12px 0 8px;overflow-x:auto;scrollbar-width:none}\\n.step{display:flex;flex-direction:column;align-items:center;flex:1;min-width:56px;position:relative}\\n.step-dot{width:26px;height:26px;border-radius:50%;background:var(--bg4);border:2px solid var(--bd2);display:flex;align-items:center;justify-content:center;font-size:.65rem;font-weight:800;color:var(--t4);transition:all .2s;position:relative;z-index:1}\\n.step.done .step-dot{background:var(--grn);border-color:var(--grn);color:#fff}\\n.step.cur .step-dot{background:var(--gold);border-color:var(--gold);color:#000;transform:scale(1.15)}\\n.step-nm{font-size:.58rem;color:var(--t4);margin-top:5px;text-align:center;font-weight:700;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap}\\n.step.done .step-nm{color:var(--grn)}\\n.step.cur .step-nm{color:var(--gold)}\\n.step-line{position:absolute;top:13px;left:50%;right:-50%;height:2px;background:var(--bd2);z-index:0;transition:background .3s}\\n.step.done .step-line{background:var(--grn)}\\n/* TOTAL BOX */\\n.total-box{background:linear-gradient(135deg,var(--bg2),rgba(201,168,76,.05));border:1.5px solid rgba(201,168,76,.3);border-radius:14px;padding:18px 20px;margin-top:16px}\\n.total-main{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}\\n.total-lbl{font-size:.68rem;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.08em}\\n.total-val{font-size:1.9rem;font-weight:900;color:var(--gold2)}\\n.total-parc{font-size:.72rem;color:var(--t4);margin-top:4px}\\n"
    + ".badge{font-size:.62rem;padding:3px 9px;border-radius:14px;font-weight:600;letter-spacing:.03em}\\n.badge-gold{background:rgba(201,168,76,.12);color:var(--gold);border:1px solid rgba(201,168,76,.2)}\\n.preview-3d{background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:12px;margin-bottom:8px}\\n.tum-svg{width:100%;display:block;max-height:180px}\\n.num-ctrl{display:flex;align-items:center;gap:6px}\\n.num-ctrl input{text-align:center;flex:1}\\n.num-btn{width:32px;height:32px;border-radius:8px;background:var(--bg4);border:1px solid var(--bd2);display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:1rem;color:var(--t2);font-weight:700;transition:all .15s;user-select:none;flex-shrink:0}\\n.num-btn:hover{border-color:var(--gold);color:var(--gold)}\\n.f-err{font-size:.65rem;color:var(--red);display:none;margin-top:2px}\\n.has-err input{border-color:var(--red)!important}\\n.has-err .f-err{display:block}\\n.cols3{grid-template-columns:1fr 1fr 1fr}\\n/* HISTRICO CARDS */\n.hist-item{background:var(--bg2);border:1px solid var(--bd);border-radius:12px;\n  padding:14px;margin-bottom:8px;cursor:pointer;transition:border-color .15s}\n.hist-item:hover{border-color:rgba(201,168,76,.3)}\n.hist-head{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px}\n.hist-nm{font-size:.9rem;font-weight:700;color:var(--tx)}\n.hist-val{font-size:.9rem;font-weight:800;color:var(--gold2)}\n.hist-sub{font-size:.68rem;color:var(--t3);margin-bottom:8px}\n.hist-tags{display:flex;gap:6px;flex-wrap:wrap}\n.hist-tag{font-size:.62rem;padding:3px 9px;border-radius:14px;background:var(--bg4);\n  border:1px solid var(--bd);color:var(--t3)}\n.hist-actions{display:flex;gap:6px;margin-top:10px}\n\n/* LIVE BAR */\n#liveBar{\n  position:sticky;bottom:0;left:0;right:0;\n  background:var(--bg2);border-top:1px solid rgba(201,168,76,.2);\n  padding:10px 16px;display:flex;align-items:center;justify-content:space-between;\n"
    + "  z-index:20;backdrop-filter:blur(12px);\n  font-size:.75rem;\n}\n#liveM2{color:var(--t3)}\n#liveVista{color:var(--gold2);font-weight:800;font-size:.9rem}\n\n/* PRINT */\n#printArea{display:none}\n@media print{\n  .tum-v14-root>*:not(#printArea){display:none!important}\n  #printArea{display:block!important;padding:0}\n}\n\n/* SCROLLBAR */\n.tum-v14-root ::-webkit-scrollbar{width:4px;height:4px}\n.tum-v14-root ::-webkit-scrollbar-track{background:transparent}\n.tum-v14-root ::-webkit-scrollbar-thumb{background:var(--bd2);border-radius:4px}\n\n/* IA BUTTON */\n.ia-btn{\n  background:linear-gradient(135deg,rgba(74,122,170,.15),rgba(201,168,76,.08));\n  border:1px solid rgba(74,122,170,.3);border-radius:12px;\n  padding:12px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;\n  transition:border-color .2s,background .2s;width:100%\n}\n.ia-btn:hover{border-color:rgba(201,168,76,.4);background:rgba(201,168,76,.06)}\n.ia-btn-icon{font-size:1.5rem;flex-shrink:0}\n.ia-btn-text strong{display:block;font-size:.85rem;font-weight:700;color:var(--gold2);margin-bottom:2px}\n.ia-btn-text span{font-size:.72rem;color:var(--t3)}\n.ia-btn-arrow{margin-left:auto;color:var(--t3);font-size:.75rem}\n\n/* FALECIDO CARD */\n.fal-card{background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px;position:relative}\n.fal-num{font-size:.6rem;letter-spacing:.1em;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:8px}\n.fal-del{position:absolute;top:10px;right:10px;background:none;border:none;color:var(--t4);cursor:pointer;font-size:.9rem;padding:4px}\n.fal-del:hover{color:var(--red)}";
}
function _TI_getHTML() {
  return '<!-- MODAL EXCLUIR -->\n<div class="modal-overlay" id="modalDel">\n  <div class="modal">\n    <div class="modal-title">Confirmar Exclusão</div>\n    <button class="modal-close" onclick="fecharModal(\'modalDel\')">✕</button>\n    <p style="font-size:.85rem;color:var(--t2);margin-bottom:20px">Tem certeza que deseja excluir este orçamento do histórico? Esta ação não pode ser desfeita.</p>\n    <div style="display:flex;gap:10px">\n      <button class="btn btn-out btn-sm" onclick="fecharModal(\'modalDel\')" style="flex:1;justify-content:center">Cancelar</button>\n      <button class="btn btn-red btn-sm" id="btnConfirmDel" style="flex:1;justify-content:center">🗑 Excluir</button>\n    </div>\n  </div>\n</div>\n\n<!-- MODAL NOVA PEDRA -->\n<div class="modal-overlay" id="modalPedra">\n  <div class="modal">\n    <div class="modal-title">Adicionar Pedra</div>\n    <button class="modal-close" onclick="fecharModal(\'modalPedra\')">✕</button>\n    <div class="f-grid full" style="margin-bottom:12px">\n      <div class="f"><label>Nome da Pedra</label><input id="npNome" type="text" placeholder="Ex: Verde Ubatuba"></div>\n    </div>\n    <div class="f-grid" style="margin-bottom:12px">\n      <div class="f"><label>Categoria</label>\n        <select id="npCat">\n          <option value="Popular">Popular</option>\n          <option value="Médio">Médio</option>\n          <option value="Premium">Premium</option>\n          <option value="Personalizado">Personalizado</option>\n        </select>\n      </div>\n      <div class="f"><label>Preço por m² (R$)</label><input id="npPr" type="number" min="50" max="2000" placeholder="250"></div>\n    </div>\n    <div class="f-grid" style="margin-bottom:20px">\n      <div class="f"><label>Peso (kg/m³)</label><input id="npPeso" type="number" min="1000" max="4000" value="2700" placeholder="2700"></div>\n      <div class="f"><label>Espessura padrão (cm)</label><input id="npEsp" type="number" min="1" max="6" value="2" placeholder="2"></div>\n'
    + '    </div>\n    <button class="btn btn-gold btn-full" onclick="confirmarAddPedra()">✓ Adicionar Pedra</button>\n  </div>\n</div>\n\n<!-- MODAL ANÁLISE IA -->\n<div class="modal-overlay" id="modalIA">\n  <div class="modal" style="max-width:480px">\n    <div class="modal-title">🤖 Analisar Foto do Túmulo</div>\n    <button class="modal-close" onclick="fecharModal(\'modalIA\')">✕</button>\n\n    <div class="callout info" style="margin-bottom:14px;font-size:.73rem">\n      Envie uma foto do modelo de túmulo. A IA identifica o tipo, disposição, acabamentos e preenche os campos automaticamente.<br>\n      <span style="color:var(--gold2)">✦ Se o material ou acabamento não existir, é criado automaticamente.</span><br>\n      <span style="color:var(--t4);font-size:.68rem">⚠ Se aparecer erro de chave, vá em Configurações → IA e verifique se a chave não tem restrição de domínio.</span>\n    </div>\n\n    <!-- Upload área -->\n    <div id="iaUploadArea" onclick="document.getElementById(\'iaFileInput\').click()"\n      style="border:2px dashed var(--bd2);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:12px;position:relative">\n      <input type="file" id="iaFileInput" accept="image/*" style="display:none" onchange="iaOnFileSelect(this)">\n      <div id="iaUploadIcon" style="font-size:2rem;margin-bottom:6px">📷</div>\n      <div id="iaUploadTxt" style="font-size:.78rem;color:var(--t3)">Toque para selecionar uma foto</div>\n      <img id="iaPreviewImg" style="display:none;max-width:100%;border-radius:8px;margin-top:10px" alt="preview">\n    </div>\n\n    <!-- Descrição opcional -->\n    <div class="f" style="margin-bottom:14px">\n      <label>Descrição adicional (opcional)</label>\n      <textarea id="iaDesc" style="min-height:60px" placeholder="Ex: 4 gavetas lado a lado, mármore branco, lápide com chanfro 45°, 2 jarros..."></textarea>\n    </div>\n\n    <!-- Status -->\n'
    + '    <div id="iaStatus" style="display:none;font-size:.75rem;color:var(--gold2);margin-bottom:10px;text-align:center;padding:8px;background:var(--gdim);border-radius:8px"></div>\n\n    <div style="display:flex;gap:10px">\n      <button class="btn btn-out btn-sm" onclick="fecharModal(\'modalIA\')" style="flex:1;justify-content:center">Cancelar</button>\n      <button class="btn btn-gold" id="iaBtnAnalisar" onclick="iaAnalisar()" style="flex:2;justify-content:center">\n        🔍 Analisar com IA\n      </button>\n    </div>\n  </div>\n</div>\n\n<!-- PRINT AREA -->\n<div id="printArea">\n  <div class="print-header">\n    <div class="print-title" id="pTitle">HR Mármores e Granitos</div>\n    <div class="print-meta" id="pMeta"></div>\n  </div>\n  <div id="pBody"></div>\n  <div class="print-footer" id="pFooter"></div>\n</div>\n\n<!-- IDs ocultos para compatibilidade com o motor interno -->\n<span id="hdNum" style="display:none"></span>\n\n<!-- ═══════════════════════════════ ORÇAMENTO ═══════════════════════════════ -->\n<div id="pg-orcamento" class="page on">\n\n  <!-- BOTÃO IA -->\n  <div style="margin-bottom:14px">\n    <button class="btn btn-out btn-full" style="border-color:rgba(201,168,76,.3);gap:10px;padding:12px 20px" onclick="abrirModal(\'modalIA\')">\n      <span style="font-size:1.1rem">🤖</span>\n      <span style="flex:1;text-align:left">\n        <span style="color:var(--gold2);font-weight:600;font-size:.82rem">Analisar foto do modelo</span><br>\n        <span style="font-size:.65rem;color:var(--t4);font-weight:400">Envie uma imagem e a IA preenche os campos automaticamente</span>\n      </span>\n      <span style="font-size:.65rem;color:var(--t4)">IA ›</span>\n    </button>\n  </div>\n\n  <!-- PROGRESSO -->\n  <div class="steps-wrap" id="stepsWrap">\n    <div class="step" id="sCliente"><div class="step-dot">1</div><div class="step-nm">Cliente</div><div class="step-line"></div></div>\n'
    + '    <div class="step" id="sTipo"><div class="step-dot">2</div><div class="step-nm">Tipo</div><div class="step-line"></div></div>\n    <div class="step" id="sMedidas"><div class="step-dot">3</div><div class="step-nm">Medidas</div><div class="step-line"></div></div>\n    <div class="step" id="sMaterial"><div class="step-dot">4</div><div class="step-nm">Material</div><div class="step-line"></div></div>\n    <div class="step" id="sItens"><div class="step-dot">5</div><div class="step-nm">Itens</div></div>\n  </div>\n\n  <!-- CLIENTE -->\n  <div class="card" id="cardCliente">\n    <div class="card-head">\n      <span class="card-title">① Cliente</span>\n      <span id="statusCliente" style="font-size:.65rem;color:var(--t4)"></span>\n    </div>\n    <div class="card-body">\n      <div class="f-grid">\n        <div class="f" id="fCli"><label>Nome do Cliente *</label><input id="iCli" type="text" placeholder="Ex: Maria Silva" oninput="validarCli();_TI_calcular()"><div class="f-err">Nome obrigatório</div></div>\n        <div class="f"><label>Telefone</label><input id="iTel" type="tel" placeholder="(74) 99999-9999" oninput="mascaraTel(this)"></div>\n      </div>\n      <div class="f-grid">\n        <div class="f"><label>Cemitério</label><input id="iCemiterio" type="text" placeholder="Nome do cemitério"></div>\n        <div class="f"><label>Cidade</label><input id="iCidade" type="text" placeholder="Pilão Arcado — BA"></div>\n      </div>\n      <div class="f-grid cols3">\n        <div class="f" style="grid-column:1/-1">\n          <label>Falecido(a) — <span id="falLabelQtd" style="color:var(--gold2);font-weight:600">1 pessoa</span></label>\n          <div id="falecidosLista" style="display:flex;flex-direction:column;gap:8px;margin-top:4px"></div>\n          <div style="display:flex;gap:8px;margin-top:6px">\n            <button class="btn btn-out" style="font-size:.7rem;padding:5px 12px" onclick="addFalecido()">+ Adicionar falecido</button>\n'
    + '            <span style="font-size:.67rem;color:var(--t4);align-self:center">Independente do nº de compartimentos</span>\n          </div>\n        </div>\n        <div class="f"><label>Quadra</label><input id="iQuadra" type="text" placeholder="Q-12"></div>\n        <div class="f"><label>Lote / Número</label><input id="iLote" type="text" placeholder="L-04"></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- PRESET / TIPO -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">② Tipo de Túmulo</span>\n      <span id="presetAtivo" class="badge badge-gold" style="display:none"></span>\n    </div>\n    <div class="card-body">\n      <div class="presets" id="presetList"></div>\n    </div>\n  </div>\n\n  <!-- TIPO DE SERVIÇO -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">③ Tipo de Serviço</span>\n      <span id="tipoServicoLabel" class="badge badge-gold"></span>\n    </div>\n    <div class="card-body">\n      <div class="presets" id="tipoServList"></div>\n      <div id="tipoServDesc" class="callout" style="margin-top:10px;margin-bottom:0"></div>\n    </div>\n  </div>\n\n  <!-- MEDIDAS -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">④ Medidas</span>\n      <span id="alturaCalc" style="font-size:.7rem;color:var(--gold2);font-weight:600"></span>\n    </div>\n    <div class="card-body">\n      \n\n      <!-- ALTURA TOTAL MANUAL -->\n      <div class="f-grid" style="margin-bottom:4px">\n        <div class="f">\n          <label>Altura Total (cm)</label>\n          <input id="mAlturaFinal" type="number" step="1" min="0" max="300" placeholder="Deixe vazio = calcular auto"\n            oninput="_TI_calcular()"\n            style="border-color:rgba(201,168,76,.35)">\n          <span class="f-hint">Deixe vazio = calcular automaticamente</span>\n        </div>\n        <div class="f" style="justify-content:flex-end;padding-bottom:4px">\n'
    + '          <button class="btn btn-out btn-sm" onclick="document.getElementById(\'mAlturaFinal\').value=\'\';_TI_calcular()" style="margin-top:auto">↺ Usar automático</button>\n        </div>\n      </div>\n      \n\n      <!-- PREVIEW SVG -->\n      <div class="preview-3d" id="prevDiv">\n        <svg id="prevSVG" class="tum-svg" viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"></svg>\n      </div>\n      <!-- Info técnica do preview -->\n      <div id="prevInfo" style="font-size:.62rem;color:var(--t4);text-align:center;margin-top:4px;margin-bottom:12px;font-family:\'DM Mono\',monospace;letter-spacing:.05em"></div>\n\n      <div class="f-grid cols3">\n        <div class="f">\n          <label>Comprimento (cm)</label>\n          <input id="mC" type="number" step="1" min="50" max="500" placeholder="200" oninput="_TI_calcular()">\n          <span class="f-hint">Tampa, frente, fundo, base</span>\n        </div>\n        <div class="f">\n          <label>Largura (cm)</label>\n          <input id="mL" type="number" step="1" min="30" max="300" placeholder="70" oninput="_TI_calcular()">\n          <span class="f-hint">Tampa, laterais, base</span>\n        </div>\n        <div class="f">\n          <label>Espessura pedra (cm)</label>\n          <select id="mE" onchange="_TI_calcular()">\n            <option value="2">2 cm</option>\n            <option value="3" selected>3 cm</option>\n            <option value="4">4 cm</option>\n            <option value="5">5 cm</option>\n          </select>\n          <span class="f-hint">2–3cm lateral / 3–4cm tampa</span>\n        </div>\n      </div>\n      <div class="f-grid">\n        <div class="f">\n          <label>Nº de Compartimentos</label>\n          <select id="mGav" onchange="_TI_calcular()">\n            <option value="0">0 — Simples (sem comp.)</option>\n            <option value="1">1 Compartimento</option>\n            <option value="2" selected>2 Compartimentos</option>\n'
    + '            <option value="3">3 Compartimentos</option>\n            <option value="4">4 Compartimentos</option>\n          </select>\n          <span class="f-hint">Cada compartimento = 1 caixão + laje</span>\n        </div>\n        <div class="f">\n          <label>Disposição dos compartimentos</label>\n          <select id="mDisp" onchange="_TI_calcular()">\n            <option value="vertical">Vertical (um sobre o outro)</option>\n            <option value="horizontal">Horizontal (lado a lado)</option>\n          </select>\n          <span class="f-hint">Vertical = empilhado · Horizontal = lado a lado</span>\n        </div>\n      </div>\n      <div class="f-grid">\n        <div class="f">\n          <label>Alt. livre por compartimento (cm)</label>\n          <input id="mHcomp" type="number" step="1" min="30" max="80" value="45" oninput="_TI_calcular()">\n          <span class="f-hint">Espaço interno p/ caixão (padrão 45cm)</span>\n        </div>\n        <div class="f">\n          <label>Espessura da laje (cm)</label>\n          <input id="mHlaje" type="number" step="1" min="6" max="20" value="8" oninput="_TI_calcular()">\n          <span class="f-hint">Laje concreto + revestimento pedra</span>\n        </div>\n      </div>\n      <div class="f-grid cols3">\n        <div class="f">\n          <label>Base estrutural (cm)</label>\n          <input id="mAe" type="number" step="1" min="10" max="100" value="30" oninput="_TI_calcular()">\n          <span class="f-hint">Altura da base de concreto</span>\n        </div>\n        <div class="f">\n          <label>Altura rodapé de pedra (cm)</label>\n          <input id="mAb" type="number" step="1" min="0" max="20" value="8" oninput="_TI_calcular()">\n          <span class="f-hint">0 = sem rodapé de pedra</span>\n        </div>\n        <div class="f">\n          <label>Largura da lápide (cm)</label>\n          <input id="mLapW" type="number" step="1" min="20" max="200" value="80" oninput="_TI_calcular()">\n'
    + '          <span class="f-hint">Largura — padrão 80 cm</span>\n        </div>\n        <div class="f">\n          <label>Altura da lápide (cm)</label>\n          <input id="mLapH" type="number" step="1" min="20" max="150" value="60" oninput="_TI_calcular()">\n          <span class="f-hint">Altura — padrão 60 cm</span>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- TAMPAS INDIVIDUAIS -->\n  <div class="card" id="cardTampas">\n    <div class="card-head">\n      <span class="card-title">④-B Tampas Superiores</span>\n      <span id="tampasSummary" style="font-size:.65rem;color:var(--gold2);font-family:\'DM Mono\',monospace"></span>\n    </div>\n    <div class="card-body">\n\n      <!-- MOLDURA / REBAIXO -->\n      \n      \n      <div class="presets" id="molduraPresets"></div>\n      <div id="molduraCustomBox" style="display:none;margin-bottom:12px">\n        <div class="f-grid cols3">\n          <div class="f">\n            <label>Moldura personalizada (cm)</label>\n            <input type="number" id="tMolduraCustom" min="0" max="30" value="10"\n              oninput="SEL.tampas.molduraCustom=+this.value;atualizarTampasUI();_TI_calcular()">\n            <span class="f-hint">Desconto em cada lado</span>\n          </div>\n        </div>\n      </div>\n\n      <!-- MODO DE DIVISÃO -->\n      <div class="sep"></div>\n      \n      <div class="presets" id="gradePresets"></div>\n\n      <!-- CONFIGURAÇÃO MANUAL DE GRADE -->\n      <div id="gradeCustomBox" style="display:none;margin-bottom:0">\n        <div class="f-grid">\n          <div class="f">\n            <label>Colunas (eixo comprimento)</label>\n            <div class="num-ctrl">\n              <div class="num-btn" onclick="adjGrade(\'colunas\',-1)">−</div>\n              <input type="number" id="tColunas" min="1" max="4" value="1"\n                oninput="SEL.tampas.colunas=Math.max(1,+this.value);atualizarTampasUI();_TI_calcular()">\n'
    + '              <div class="num-btn" onclick="adjGrade(\'colunas\',+1)">+</div>\n            </div>\n          </div>\n          <div class="f">\n            <label>Linhas (eixo largura)</label>\n            <div class="num-ctrl">\n              <div class="num-btn" onclick="adjGrade(\'linhas\',-1)">−</div>\n              <input type="number" id="tLinhas" min="1" max="4" value="1"\n                oninput="SEL.tampas.linhas=Math.max(1,+this.value);atualizarTampasUI();_TI_calcular()">\n              <div class="num-btn" onclick="adjGrade(\'linhas\',+1)">+</div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <!-- FOLGAS -->\n      <div class="sep"></div>\n      \n      <div class="f-grid cols3">\n        <div class="f">\n          <label>Folga entre tampas — C (cm)</label>\n          <input type="number" id="tFolgaC" min="0" max="5" step="0.5" value="1"\n            oninput="SEL.tampas.folgaC=+this.value;atualizarTampasUI();_TI_calcular()">\n          <span class="f-hint">Junta no comprimento</span>\n        </div>\n        <div class="f">\n          <label>Folga entre tampas — L (cm)</label>\n          <input type="number" id="tFolgaL" min="0" max="5" step="0.5" value="1"\n            oninput="SEL.tampas.folgaL=+this.value;atualizarTampasUI();_TI_calcular()">\n          <span class="f-hint">Junta na largura</span>\n        </div>\n        <div class="f">\n          <label>Espessura das tampas (cm)</label>\n          <select id="tEspTampa" onchange="SEL.tampas.espTampa=+this.value;atualizarTampasUI();_TI_calcular()">\n            <option value="2">2 cm</option>\n            <option value="3" selected>3 cm</option>\n            <option value="4">4 cm</option>\n            <option value="5">5 cm</option>\n          </select>\n        </div>\n      </div>\n\n      <!-- ACABAMENTO + ARGOLAS -->\n      <div class="f-grid" style="margin-top:4px">\n        <div class="f">\n          <label>Acabamento das tampas</label>\n'
    + '          <div id="tampasAcabList" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px"></div>\n        </div>\n        <div class="f">\n          <label>Argolas de içamento</label>\n          <div class="tog-row" style="border:none;padding:6px 0 0 0">\n            <div><div class="tog-lbl">Argolas de içamento — bronze</div><div class="tog-sub">R$100 cada · 2 por tampa · tampas pesadas (>60 kg)</div></div>\n            <div class="tog" id="togArgolas"\n              onclick="SEL.tampas.argolas=!SEL.tampas.argolas;this.classList.toggle(\'on\',SEL.tampas.argolas);_TI_calcular()"></div>\n          </div>\n        </div>\n      </div>\n\n      <!-- ④ PREVIEW ESQUEMÁTICO SVG -->\n      <div class="sep"></div>\n      \n      <div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px">\n        <svg id="tampasSVG" style="width:100%;display:block;max-height:200px" viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"></svg>\n      </div>\n\n      <!-- ⑤ TABELA DE PEÇAS -->\n      <div id="tampasPreviewBox" style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-top:10px">\n        \n        <div id="tampasPreviewRows"></div>\n        <div id="tampasTotais" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)"></div>\n      </div>\n\n    </div>\n  </div>\n\n  <!-- LÁPIDE ENGROSSADA -->\n  <div class="card" id="cardLapideEng" style="display:none">\n    <div class="card-head">\n      <span class="card-title">④-C Lápide Engrossada</span>\n      <span id="lapideEngBadge" class="badge badge-gold" style="display:none">Engrossada</span>\n    </div>\n    <div class="card-body">\n      \n      <div class="f-grid full" style="margin-bottom:12px">\n        <div class="f">\n          <label>Engrossamento da lápide</label>\n          <div class="presets" id="engList"></div>\n        </div>\n      </div>\n      <!-- Preview peças de encontro (aparece quando ativado) -->\n'
    + '      <div id="encontroBox" style="display:none">\n        <div class="sep"></div>\n        \n        \n        <div id="encontroRows"></div>\n        <div class="tog-row" style="margin-top:10px">\n          <div><div class="tog-lbl">Incluir peças de encontro no orçamento</div><div class="tog-sub">Superior + 2 laterais — calculadas automaticamente</div></div>\n          <div class="tog on" id="togEncontro" onclick="SEL.lapide.pecasEncontro=!SEL.lapide.pecasEncontro;this.classList.toggle(\'on\',SEL.lapide.pecasEncontro);renderEncontroBox();_TI_calcular()"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- MATERIAL -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑤ Material da Pedra</span>\n      <span id="matSel" style="font-size:.72rem;color:var(--gold2)"></span>\n    </div>\n    <div class="card-body">\n      <div id="matCats" style="display:flex;gap:6px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:0 0 10px;margin:0 -4px 2px;"></div>\n      <div id="matList" style="display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;padding:2px 0 10px;"></div>\n      <div style="font-size:.65rem;color:var(--t4);margin-top:6px" id="matInfo"></div>\n    </div>\n  </div>\n\n  <!-- PEÇAS INCLUÍDAS -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑥ Revestimento</span>\n      <span id="pecasCount" style="font-size:.65rem;color:var(--t3)"></span>\n    </div>\n    <div class="card-body">\n      <div id="pecasTogList"></div>\n    </div>\n  </div>\n\n  <!-- ACABAMENTO -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑦ Acabamento das Bordas</span>\n    </div>\n    <div class="card-body">\n      <div class="presets" id="acabList"></div>\n    </div>\n  </div>\n\n  <!-- OPCIONAIS -->\n  <div class="card">\n    <div class="card-head">\n'
    + '      <span class="card-title">⑧ Itens Opcionais</span>\n    </div>\n    <div class="card-body">\n      <div id="opcionaisList"></div>\n    </div>\n  </div>\n\n  <!-- AVANÇADO -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑨ Avançado</span>\n    </div>\n    <div class="card-body">\n      <div id="avancadoList"></div>\n    </div>\n  </div>\n\n  <!-- OBSERVAÇÕES -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">⑩ Observações</span></div>\n    <div class="card-body">\n      <div class="f full">\n        <textarea id="iObs" placeholder="Detalhes especiais, instruções de instalação, pedidos do cliente..."></textarea>\n      </div>\n    </div>\n  </div>\n\n  <!-- Botão oculto: acionado por _TI_tumCalcularAuto() do app-tum-integracao.js -->\n  <button id="btnTumCalcAuto" style="display:none" onclick="calcularFinal()"></button>\n\n</div>\n\n<!-- ═══════════════════════════════ RESULTADO ═══════════════════════════════ -->\n<div id="pg-resultado" class="page">\n\n  <div id="resEmpty" style="text-align:center;padding:60px 20px;color:var(--t4)">\n    <div style="font-size:2.5rem;margin-bottom:12px">⚰️</div>\n    <div style="font-size:.85rem">Preencha o orçamento e toque em <strong style="color:var(--gold)">Gerar Orçamento</strong></div>\n  </div>\n\n  <div id="resConteudo" style="display:none">\n\n    <!-- CABEÇALHO DO RESULTADO -->\n    <div class="card" style="background:linear-gradient(135deg,var(--bg2),rgba(201,168,76,.04))">\n      <div class="card-body">\n        <div style="font-size:.58rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold3);margin-bottom:5px;font-family:\'DM Mono\',monospace">Orçamento Gerado</div>\n        <div id="rCli" style="font-family:\'Cormorant Garamond\',serif;font-size:1.7rem;font-weight:700;color:var(--gold2);line-height:1.1;margin-bottom:4px"></div>\n        <div id="rMeta" style="font-size:.72rem;color:var(--t3);display:flex;gap:12px;flex-wrap:wrap"></div>\n'
    + '      </div>\n    </div>\n\n    <!-- RESUMO NÚMEROS -->\n    <div class="res-grid" id="rGrid"></div>\n\n    <!-- DETALHAMENTO -->\n    <div class="card">\n      <div class="card-head"><span class="card-title">Detalhamento Completo</span></div>\n      <div class="card-body" id="rDetalhe"></div>\n    </div>\n\n    <!-- VALOR FINAL -->\n    <div class="total-box">\n      <div class="total-main">\n        <span class="total-lbl">À Vista (sem juros)</span>\n        <span class="total-val" id="rVista">R$ 0</span>\n      </div>\n      <div id="rParc" class="total-parc"></div>\n      <div id="rPrazo" style="font-size:.7rem;color:var(--t3);margin-top:6px"></div>\n    </div>\n\n    <!-- AÇÕES -->\n    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;margin-bottom:30px">\n      <button class="btn btn-out btn-sm" onclick="copiarWA()">📲 Copiar WhatsApp</button>\n      <button class="btn btn-out btn-sm" onclick="imprimirPDF()">🖨 Imprimir / PDF</button>\n      <button class="btn btn-gold btn-sm" onclick="salvarHistorico()">💾 Salvar</button>\n    </div>\n\n    <textarea id="txtWA" style="position:absolute;left:-9999px" readonly></textarea>\n\n  </div>\n</div>\n\n<!-- ═══════════════════════════════ PLANTA TÉCNICA ═══════════════════════════════ -->\n<div id="pg-planta" class="page">\n\n  <!-- Resumo cards -->\n  <div id="plt-resumo" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"></div>\n\n  <!-- Corte Frontal -->\n  <div class="card" style="overflow:hidden;margin-bottom:12px">\n    <div class="card-head"><span class="card-title">Corte Frontal — Vista em Elevação</span></div>\n    <div class="card-body" style="padding:8px">\n      <svg id="plt-svgCorte" style="width:100%;display:block" viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg"></svg>\n    </div>\n  </div>\n\n  <!-- Planta Baixa -->\n  <div class="card" style="overflow:hidden;margin-bottom:12px">\n'
    + '    <div class="card-head"><span class="card-title">Planta Baixa — Vista Superior</span></div>\n    <div class="card-body" style="padding:8px">\n      <svg id="plt-svgPlanta" style="width:100%;display:block" viewBox="0 0 520 240" xmlns="http://www.w3.org/2000/svg"></svg>\n    </div>\n  </div>\n\n  <!-- Tabela de Pedras -->\n  <div class="card" style="overflow:hidden;margin-bottom:12px">\n    <div class="card-head">\n      <span class="card-title">Lista de Pedras — Medidas Exatas</span>\n      <span id="plt-totalPecas" style="font-size:.65rem;color:var(--t3);font-family:\'DM Mono\',monospace"></span>\n    </div>\n    <div style="overflow-x:auto">\n      <table style="width:100%;border-collapse:collapse;font-size:.78rem">\n        <thead>\n          <tr>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Peça</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Qt</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Comp.</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Larg.</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Esp.</th>\n'
    + '            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Observação</th>\n          </tr>\n        </thead>\n        <tbody id="plt-tblBody"></tbody>\n      </table>\n    </div>\n  </div>\n\n  <!-- Legenda -->\n  <div style="background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:12px 14px;font-size:.72rem;color:var(--t2);line-height:1.8;margin-bottom:20px">\n    <strong style="color:var(--gold2)">Legenda:</strong><br>\n    <span style="color:rgba(201,168,76,.75)">▪ Hachura dourada</span> = espessura da pedra + argamassa &nbsp;\n    <span style="color:rgba(255,140,0,.75)">▪ Laranja</span> = camada de argamassa (1 cm) &nbsp;\n    <span style="color:rgba(74,122,170,.75)">▪ Azul</span> = espaço interno dos compartimentos<br>\n    Todas as medidas já descontam <strong>1 cm de argamassa por face</strong> de assentamento.\n  </div>\n\n</div>\n\n<!-- ═══════════════════════════════ PRODUÇÃO ═══════════════════════════════ -->\n<div id="pg-producao" class="page">\n  <div id="prodEmpty" style="text-align:center;padding:60px 20px;color:var(--t4)">\n    <div style="font-size:2.5rem;margin-bottom:12px">🔩</div>\n    <div style="font-size:.85rem">Gere um orçamento primeiro para ver o detalhamento de produção</div>\n  </div>\n  <div id="prodConteudo" style="display:none">\n\n    <!-- RESUMO ESTRUTURAL -->\n    <div class="card" style="margin-bottom:14px">\n      <div class="card-head"><span class="card-title">📐 Estrutura Civil — Camadas Separadas</span></div>\n      <div class="card-body" id="prodCivil"></div>\n    </div>\n\n    <!-- LISTA REAL DE PEÇAS -->\n    <div class="card" style="margin-bottom:14px">\n      <div class="card-head">\n        <span class="card-title">🪨 Lista Técnica de Peças em Pedra</span>\n'
    + '        <span id="prodTotalPecas" style="font-size:.65rem;color:var(--gold2);font-family:\'DM Mono\',monospace"></span>\n      </div>\n      <div style="overflow-x:auto">\n        <table style="width:100%;border-collapse:collapse;font-size:.78rem">\n          <thead>\n            <tr style="background:var(--bg3)">\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">#</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Peça</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Comp. × Larg.</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Esp.</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Área m²</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Peso kg</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Acabamento</th>\n'
    + '              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">R$ Peça</th>\n            </tr>\n          </thead>\n          <tbody id="prodTblBody"></tbody>\n          <tfoot id="prodTblFoot"></tfoot>\n        </table>\n      </div>\n    </div>\n\n    <!-- MÃO DE OBRA DETALHADA -->\n    <div class="card" style="margin-bottom:14px">\n      <div class="card-head"><span class="card-title">🔨 Composição Real da Mão de Obra</span></div>\n      <div class="card-body" id="prodMob"></div>\n    </div>\n\n    <!-- PESO DETALHADO -->\n    <div class="card" style="margin-bottom:14px">\n      <div class="card-head"><span class="card-title">⚖️ Peso por Grupo de Peças</span></div>\n      <div class="card-body" id="prodPeso"></div>\n    </div>\n\n    <!-- BOTÃO IMPRIMIR LISTA -->\n    <button class="btn btn-out btn-full" style="margin-bottom:30px" onclick="imprimirProducao()">🖨 Imprimir Lista de Produção</button>\n  </div>\n</div>\n\n<!-- ═══════════════════════════════ CHAPAS ═══════════════════════════════ -->\n<div id="pg-chapas" class="page">\n  <div class="card" style="margin-bottom:14px">\n    <div class="card-head"><span class="card-title">🧩 Otimizador de Chapas — Corte Profissional</span></div>\n    <div class="card-body">\n      <div class="callout info" style="margin-bottom:14px;font-size:.73rem">\n        Informe a chapa disponível. O sistema distribui as peças automaticamente, calcula aproveitamento e mostra a sobra real.\n      </div>\n      <div class="f-grid cols3">\n        <div class="f">\n          <label>Comprimento da Chapa (cm)</label>\n          <input id="chapaC" type="number" value="320" min="100" max="600" oninput="renderChapas()">\n        </div>\n        <div class="f">\n          <label>Largura da Chapa (cm)</label>\n'
    + '          <input id="chapaL" type="number" value="190" min="60" max="400" oninput="renderChapas()">\n        </div>\n        <div class="f">\n          <label>Espessura da Chapa (cm)</label>\n          <select id="chapaE" onchange="renderChapas()">\n            <option value="2">2 cm</option>\n            <option value="3" selected>3 cm</option>\n            <option value="4">4 cm</option>\n            <option value="5">5 cm</option>\n          </select>\n        </div>\n      </div>\n      <div class="f-grid" style="margin-top:4px">\n        <div class="f">\n          <label>Espessura de corte / sangria (cm)</label>\n          <input id="chapaSangria" type="number" value="0.8" step="0.1" min="0" max="3" oninput="renderChapas()">\n          <span class="f-hint">Largura perdida no disco de corte (padrão 0,8 cm)</span>\n        </div>\n        <div class="f">\n          <label>Preço da Chapa (R$/chapa)</label>\n          <input id="chapaPreco" type="number" value="0" min="0" oninput="renderChapas()">\n          <span class="f-hint">Opcional — para calcular custo por chapa</span>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div id="chapasResultado">\n    <div style="text-align:center;padding:40px 20px;color:var(--t4)">\n      <div style="font-size:.85rem">Gere um orçamento para ver a distribuição nas chapas</div>\n    </div>\n  </div>\n</div>\n\n<!-- ═══════════════════════════════ HISTÓRICO ═══════════════════════════════ -->\n<div id="pg-historico" class="page">\n  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">\n    <div style="font-size:.75rem;color:var(--t3)" id="histCount">Orçamentos salvos</div>\n    <div style="display:flex;gap:8px">\n      <button class="btn btn-out btn-sm" onclick="exportarHistorico()">⬇ Exportar</button>\n      <button class="btn btn-red btn-sm" onclick="confirmarLimpar()">🗑 Limpar</button>\n    </div>\n  </div>\n  <!-- BUSCA -->\n  <div class="f" style="margin-bottom:14px">\n'
    + '    <input id="histBusca" type="text" placeholder="Buscar por cliente, cemitério, material..." oninput="renderHistorico()">\n  </div>\n  <div id="histList"></div>\n  <div id="histEmpty" style="text-align:center;padding:60px 20px;color:var(--t4);display:none">\n    <div style="font-size:2.5rem;margin-bottom:12px">📋</div>\n    <div style="font-size:.85rem">Nenhum orçamento salvo ainda</div>\n  </div>\n</div>\n\n<!-- ═══════════════════════════════ CONFIGURAÇÕES ═══════════════════════════ -->\n<div id="pg-config" class="page">\n\n  <!-- IA -->\n  <div class="card" style="border-color:rgba(201,168,76,.25)">\n    <div class="card-head" style="background:var(--gdim)">\n      <span class="card-title">🤖 Inteligência Artificial (Groq)</span>\n    </div>\n    <div class="card-body">\n      <div class="callout info" style="margin-bottom:12px;font-size:.73rem">\n        A IA analisa fotos de túmulos e preenche o orçamento automaticamente.<br><br>\n        <strong>Como obter a chave gratuita:</strong><br>\n        1. Acesse <strong>console.groq.com</strong><br>\n        2. Clique em <strong>API Keys → Create API Key</strong><br>\n        3. Copie e cole a chave aqui — sem restrições de domínio!\n      </div>\n      <div class="f-grid full">\n        <div class="f">\n          <label>Chave API Groq</label>\n          <input id="cGroqKey" type="password" placeholder="gsk_..." oninput="svCfg()" autocomplete="off">\n          <span class="f-hint">Gratuito · Sem restrição de domínio · console.groq.com</span>\n        </div>\n      </div>\n      <div style="display:flex;gap:8px;margin-top:10px;align-items:center">\n        <button class="btn btn-out btn-sm" onclick="testarGroq()">🔍 Testar conexão</button>\n        <span id="groqTestResult" style="font-size:.72rem;color:var(--t3)"></span>\n      </div>\n    </div>\n  </div>\n\n  <!-- EMPRESA -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">Empresa</span></div>\n    <div class="card-body">\n'
    + '      <div class="f-grid">\n        <div class="f"><label>Nome</label><input id="cEmpNome" type="text" oninput="svCfg()"></div>\n        <div class="f"><label>Telefone</label><input id="cEmpTel" type="tel" oninput="svCfg()"></div>\n      </div>\n      <div class="f-grid">\n        <div class="f"><label>Endereço</label><input id="cEmpEnd" type="text" oninput="svCfg()"></div>\n        <div class="f"><label>Cidade</label><input id="cEmpCid" type="text" oninput="svCfg()"></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- MARGEM E PARCELAMENTO -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">Preços e Margens</span></div>\n    <div class="card-body">\n      <div class="cfg-row">\n        <div><div class="cfg-k">Margem de lucro (%)</div><div style="font-size:.62rem;color:var(--t4)">Aplicada sobre custo total</div></div>\n        <input class="cfg-inp" id="cMargem" type="number" min="0" max="200" oninput="svCfg()">\n      </div>\n      <div class="cfg-row">\n        <div><div class="cfg-k">Parcelas máx. (cartão)</div></div>\n        <input class="cfg-inp" id="cParc" type="number" min="1" max="18" oninput="svCfg()">\n      </div>\n      <div class="cfg-row">\n        <div><div class="cfg-k">Acréscimo parcelado (%)</div></div>\n        <input class="cfg-inp" id="cJuros" type="number" min="0" max="50" step="0.5" oninput="svCfg()">\n      </div>\n    </div>\n  </div>\n\n  <!-- PEDRAS -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">Pedras — Preço por m²</span>\n      <button class="btn btn-out btn-sm" onclick="abrirModalPedra()">+ Adicionar</button>\n    </div>\n    <div class="card-body" id="cPedrasList"></div>\n  </div>\n\n  <!-- MÃO DE OBRA BASE -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">Mão de Obra — Valores/dia</span></div>\n    <div class="card-body">\n'
    + '      <div class="cfg-row"><div class="cfg-k">Pedreiro (R$/dia)</div><input class="cfg-inp" id="cPedreiro" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Ajudante (R$/dia)</div><input class="cfg-inp" id="cAjudante" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Instalação pedra (R$/dia)</div><input class="cfg-inp" id="cInstalacao" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Montagem (R$/dia)</div><input class="cfg-inp" id="cMontagem" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Transporte base (R$)</div><input class="cfg-inp" id="cTransporte" type="number" oninput="svCfg()"></div>\n    </div>\n  </div>\n\n  <!-- MATERIAIS CIVIS -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">Materiais Civis — Preços Ref.</span></div>\n    <div class="card-body">\n      <div class="cfg-row"><div class="cfg-k">Cimento CP-II (saco 50kg)</div><input class="cfg-inp" id="cCimento" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Areia (m³)</div><input class="cfg-inp" id="cAreia" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Brita (m³)</div><input class="cfg-inp" id="cBrita" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Argamassa AC3 (saco 20kg)</div><input class="cfg-inp" id="cArgamassa" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Ferro 3/8" (barra 12m)</div><input class="cfg-inp" id="cFerro38" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Ferro 5/16" (barra 12m)</div><input class="cfg-inp" id="cFerro516" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Malha Q-92 (m²)</div><input class="cfg-inp" id="cMalha" type="number" oninput="svCfg()"></div>\n'
    + '      <div class="cfg-row"><div class="cfg-k">Blocos 14×19×39 (unid.)</div><input class="cfg-inp" id="cBlocos" type="number" oninput="svCfg()"></div>\n    </div>\n  </div>\n\n  <div style="display:flex;gap:10px;margin-bottom:30px">\n    <button class="btn btn-out btn-sm" style="flex:1;justify-content:center" onclick="importarCfg()">⬆ Importar</button>\n    <button class="btn btn-out btn-sm" style="flex:1;justify-content:center" onclick="exportarCfg()">⬇ Exportar</button>\n    <button class="btn btn-red btn-sm" style="flex:1;justify-content:center" onclick="resetCfg()">↺ Restaurar</button>\n  </div>\n</div>';
}


// ═══════════════════════════════════════════════════════
// CAMADA DE INTEGRAÇÃO COM O ERP
// ═══════════════════════════════════════════════════════
var _TI_ambId = NS._TI_ambId = null;
var _TI_cssInjected = false;

// APP-TUM-INLINE.JS — Calculadora de Túmulos v14 embutida no orçamento
// HR Mármores e Granitos — auto-gerado
// ═══════════════════════════════════════════════════════════════════════════
// Carregar APÓS app-core.js no index.html


// ═══════════════════════════════════════════════════════
// T14 INLINE — Variáveis de controle do modo inline
// ═══════════════════════════════════════════════════════
var _TI_cssInjected = false; // CSS já injetado?

function _tumInlineSaveAmb() {
  if (!_TI_ambId) return;
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a){ return a.id == _TI_ambId; }) : null;
  if (!amb) return;
  // Salvar estado atual do SEL
  amb.tumSEL = JSON.parse(JSON.stringify(SEL));
  // Salvar campos do formulário
  var ids = ['iCli','iTel','iCemiterio','iCidade','iQuadra','iLote','iObs',
             'mC','mL','mE','mGav','mAe','mAb','mHcomp','mHlaje','mLapW','mLapH','mDisp','mAlturaFinal'];
  var flds = {};
  ids.forEach(function(id) {
    var el = document.getElementById(id);
    if (el) flds[id] = el.value;
  });
  amb.tumFlds = flds;
  // Salvar resultado do cálculo para integração com orçamento
  if (pendOrc && pendOrc.r) {
    amb.tumResult = {
      valor_vista: pendOrc.r.valor_vista || 0,
      valor_parc: pendOrc.r.valor_parc || 0,
      parc_mensal: pendOrc.r.parc_mensal || 0,
      m2_total: pendOrc.r.m2_total || 0,
      peso_total: pendOrc.r.peso_total || 0,
      prazo_total: pendOrc.r.prazo_total || 0,
      custo_total: pendOrc.r.custo_total || 0,
      mat_nm: pendOrc.matNm || '',
      preset: pendOrc.preset || SEL.preset,
      tipoServ: pendOrc.tipoServNm || '',
      cli: pendOrc.cli || '',
    };
  } else {
    // Calcular sem gerar pendOrc
    try {
      var rq = calcularFull();
      amb.tumResult = {
        valor_vista: rq.valor_vista || 0,
        valor_parc:  rq.valor_parc  || 0,
        parc_mensal: rq.parc_mensal || 0,
        m2_total:    rq.m2_total    || 0,
        peso_total:  rq.peso_total  || 0,
        prazo_total: rq.prazo_total || 0,
        custo_total: rq.custo_total || 0,
        mat_nm:      rq.mat ? rq.mat.nm : '',
        preset:      SEL.preset,
        tipoServ:    rq.ts ? rq.ts.nm : '',
        cli: (document.getElementById('iCli') || {value:''}).value.trim()
      };
    } catch(e) {}
  }
}

function tumInlineMount(ambId) {
  _TI_ambId = NS._TI_ambId = ambId;
  var container = document.getElementById('tumInline_' + ambId);
  if (!container) return;

  // Injetar CSS uma única vez — com escopo para evitar conflito com o app principal
  if (!_TI_cssInjected) {
    var styleEl = document.createElement('style');
    styleEl.id = 'tum-v14-style';
    styleEl.textContent = _TI_scopeCSS(_TI_getCSS());
    document.head.appendChild(styleEl);
    _TI_cssInjected = true;
  }

  // Se o container já tem conteúdo para este ambiente, não re-renderizar HTML
  // mas SEMPRE re-sincroniza pedras e re-inicializa a UI
  if (container.children.length > 0 && container.dataset.tumMounted === String(ambId)) {
    // Apenas sincroniza pedras e re-renderiza a lista de materiais
    if (typeof window.tumSincPedrasGlobais === 'function') window.tumSincPedrasGlobais();
    buildPedrasCfg();
    buildMatCats();
    buildMatList();
    return;
  }

  // Montar HTML
  container.dataset.tumMounted = String(ambId);
  container.innerHTML = '<div class="tum-v14-root">' + _TI_getHTML() + '</div>';

  // Restaurar estado salvo
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a){ return a.id == ambId; }) : null;
  if (amb && amb.tumSEL) {
    SEL = NS.SEL = JSON.parse(JSON.stringify(amb.tumSEL));
    // Validar matId restaurado — se não existe no catálogo atual, usar fallback inteligente
    if (!CFG.pedras.find(function(p){ return p.id === SEL.matId; })) {
      var gabriel = CFG.pedras.find(function(p){ return p.id === 'p_gabriel' || (p.nm && p.nm.toLowerCase().indexOf('gabriel') >= 0); });
      var preto   = CFG.pedras.find(function(p){ return (p.cat || '').toLowerCase().indexOf('preto') >= 0; });
      SEL.matId = (gabriel || preto || CFG.pedras[0]).id;
    }
  } else {
    // Reset para estado padrão
    SEL = NS.SEL = JSON.parse(JSON.stringify(_TI_SEL_DEF));
    // Garantir matId válido ao inicializar do zero
    if (!CFG.pedras.find(function(p){ return p.id === SEL.matId; })) {
      SEL.matId = CFG.pedras[0].id;
    }
  }
  if (amb && amb.tumFlds) {
    var flds = amb.tumFlds;
    Object.keys(flds).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = flds[id];
    });
  }

  // Inicializar
  pendOrc = NS.pendOrc = null;
  HIST = NS.HIST = JSON.parse(localStorage.getItem('hr_tum_hist') || '[]');
  init();

  // Sincronizar catálogo de pedras do app principal APÓS init()
  // (init() chama buildPedrasCfg com CFG.pedras interno — precisamos substituir)
  if (typeof window.tumSincPedrasGlobais === 'function') {
    window.tumSincPedrasGlobais();
    buildPedrasCfg(); // re-renderiza a lista já com as pedras corretas
    buildMatCats();   // atualiza filtros de categoria no seletor de material
    buildMatList();   // atualiza os botões de seleção de pedra
  }
}

function tumInlineUnmount() {
  _TI_ambId = NS._TI_ambId = null;
}


// ══════════════════════════════════════════════
// CONFIG — ESTADO GLOBAL
// ══════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
// EXPOR API PÚBLICA
// Todas as funções usadas em onclick inline no HTML gerado
// precisam estar no escopo global (window) — o IIFE as isola
// ═══════════════════════════════════════════════════════
window.tumInlineMount   = tumInlineMount;

// UI globals
window._TI_selMat        = selMat;
window._TI_selMatCat     = selMatCat;
window._TI_calcular      = _TI_calcular;
window._TI_getHTML       = _TI_getHTML;
window._TI_getCSS        = _TI_getCSS;
window.selTipoServ       = selTipoServ;
window.selAcab           = selAcab;
window.selMoldura        = selMoldura;
window.selGrade          = selGrade;
window.selEngrossar      = selEngrossar;
window.aplicarPreset     = aplicarPreset;
window.togPeca           = togPeca;
window.togOpt            = togOpt;
window.adjOpt            = adjOpt;
window.adjGrade          = adjGrade;
window.adjTampa          = adjTampa;
window.addFalecido       = addFalecido;
window.remFalecido       = remFalecido;
window.validarCli        = validarCli;
window.calcularFinal     = calcularFinal;
window.recarregarOrcamento = recarregarOrcamento;
window.salvarHistorico   = salvarHistorico;
window.copiarWA          = copiarWA;
window.imprimirPDF       = imprimirPDF;
window.baixarPDF         = baixarPDF;
window.compartilharPDF   = compartilharPDF;
window.imprimirProducao  = imprimirProducao;

// Foto + UI injetados via DOM
window.carregarFotoOrc   = carregarFotoOrc;
window._tLajeToggle      = _tLajeToggle;
window._tUsinToggle      = _tUsinToggle;
window._setPosicao       = _setPosicao;
window.buildPosicaoPresets = buildPosicaoPresets;

// PDF routes para app-core.js
window._TI_imprimirPDF = function(){
  if(!pendOrc){toast('Gere um orçamento no túmulo primeiro',true);return;}
  var pb=document.getElementById('pBody');
  if(pb&&pb.innerHTML.trim())_abrirJanelaPDF(pb.innerHTML);
  else toast('Recalcule o orçamento antes de imprimir',true);
};
window._TI_loadAndPrint = function(savedPendOrc){
  if(!savedPendOrc||!savedPendOrc.r){toast('Dados incompletos',true);return;}
  pendOrc = NS.pendOrc = savedPendOrc;
  try{gerarPrintArea(savedPendOrc,savedPendOrc.r);var pb=document.getElementById('pBody');if(pb&&pb.innerHTML.trim())_abrirJanelaPDF(pb.innerHTML);}
  catch(e){console.error(e);toast('Erro ao gerar PDF',true);}
};

// Restaurar orçamento do histórico
window._TI_preencherCliente = function(pend){
  if(!pend)return;

  // 1. Campos de texto
  var flds={iCli:pend.cli||'',iTel:pend.tel||'',iCemiterio:pend.cemi||'',
    iCidade:pend.cid||'',iQuadra:pend.quad||'',iLote:pend.lote||'',iObs:pend.obs||''};
  Object.keys(flds).forEach(function(id){var el=document.getElementById(id);if(el)el.value=flds[id];});

  // 2. Falecidos
  if(Array.isArray(pend.fal)&&pend.fal.length){
    SEL.falecidos=JSON.parse(JSON.stringify(pend.fal));
    buildFalecidos();
  }

  // 3. Restaurar SEL completo SEM chamar selMat (evita cálculo com SEL incompleto)
  if(pend._sel){
    var s=pend._sel;
    if(s.tipoServ)   SEL.tipoServ   =s.tipoServ;
    if(s.matId)      SEL.matId      =s.matId;   // ← só atribuição, não selMat()
    if(s.acabamento) SEL.acabamento =s.acabamento;
    if(s.pecas)  Object.assign(SEL.pecas,  JSON.parse(JSON.stringify(s.pecas)));
    if(s.tampas) Object.assign(SEL.tampas, JSON.parse(JSON.stringify(s.tampas)));
    if(s.lapide) Object.assign(SEL.lapide, JSON.parse(JSON.stringify(s.lapide)));
    if(s.rebaixo)Object.assign(SEL.rebaixo,JSON.parse(JSON.stringify(s.rebaixo)));
    if(s.opts)   Object.assign(SEL.opts,   JSON.parse(JSON.stringify(s.opts)));
    if(s.adv)    Object.assign(SEL.adv,    JSON.parse(JSON.stringify(s.adv)));
  }

  // 4. Rebuild UI com SEL correto
  buildPresets();
  buildTipoServ();
  buildAcabamentos();
  buildTampasAcab();
  buildMolduraPresets();
  buildGradePresets();
  buildPecas();
  buildOpcionais();
  buildAvancado();
  buildMatCats();
  buildMatList();
  atualizarEspessuraDaPedra(); // Seta mE ao padrão do material
  buildFalecidos();

  // 5. Restaurar dimensões APÓS atualizarEspessuraDaPedra (sobrescreve o padrão)
  function sv2(id,v){var el=document.getElementById(id);if(el&&v!=null&&v!=='')el.value=v;}
  if(pend._dims){
    var dm=pend._dims;
    sv2('mC',dm.C);sv2('mL',dm.L);sv2('mE',dm.E);sv2('mGav',dm.N);sv2('mDisp',dm.disp);
    sv2('mAe',dm.Ae);sv2('mAb',dm.Ab);sv2('mHcomp',dm.Hc);sv2('mHlaje',dm.Hl);
    sv2('mLapW',dm.LapW);sv2('mLapH',dm.LapH);sv2('mAlturaFinal',dm.altFinal);
    if(dm.AvRod!=null){sv2('mAvRodape',dm.AvRod);if(SEL.rebaixo)SEL.rebaixo.avRodape=+dm.AvRod;}
  }else if(pend.r&&pend.r.d){
    var d2=pend.r.d;
    sv2('mC',d2.C_cm);sv2('mL',d2.L_cm);sv2('mE',d2.E);sv2('mGav',d2.N);sv2('mDisp',d2.disp);
    sv2('mAe',d2.Ae_cm);sv2('mAb',d2.Ab_cm);sv2('mHcomp',d2.Hc_cm);sv2('mHlaje',d2.Hl_cm);
    sv2('mLapW',d2.LapW_cm);sv2('mLapH',d2.LapH_cm);
    if(d2.AvRod!=null){sv2('mAvRodape',d2.AvRod);if(SEL.rebaixo)SEL.rebaixo.avRodape=d2.AvRod;}
  }

  // 6. UI final + cálculo
  atualizarTampasUI();
  mostrarCardLapide(!!SEL.pecas.lapide);
  _TI_calcular();
};

window.buildCustosIndiretos = buildCustosIndiretos;
window._togInd              = _togInd;
window._injectCfgIndCard    = _injectCfgIndCard;

// renderFalecidos = buildFalecidos (alias para compatibilidade)
window.renderFalecidos = buildFalecidos;

window.SEL               = SEL;
// ── Exports completos da API pública ─────────────────────────────────────
window.tumInlineUnmount = tumInlineUnmount;
window.mascaraTel        = mascaraTel;
window.abrirModal        = abrirModal;
window.fecharModal       = fecharModal;
window.abrirModalPedra   = abrirModalPedra;
window.confirmarAddPedra = confirmarAddPedra;
window.remPedra          = remPedra;
window.showTab           = showTab;
window.renderPlanta      = renderPlanta;
window.renderChapas      = renderChapas;
window.renderHistorico   = renderHistorico;
window.verHistorico      = verHistorico;
window.copiarWAHist      = copiarWAHist;
window.confirmarDel      = confirmarDel;
window.confirmarLimpar   = confirmarLimpar;
window.exportarHistorico = exportarHistorico;
window.exportarCfg       = exportarCfg;
window.importarCfg       = importarCfg;
window.resetCfg          = resetCfg;
window.svCfg             = svCfg;
window.svCfg2            = svCfg2;
window.testarGroq        = testarGroq;
window.iaOnFileSelect    = iaOnFileSelect;
window.iaAnalisar        = iaAnalisar;
window.renderEncontroBox = renderEncontroBox;
window.PRESETS           = PRESETS;
window.atualizarEspessuraDaPedra            = atualizarEspessuraDaPedra;
window.atualizarFalLabel                    = atualizarFalLabel;
window.atualizarPreview                     = atualizarPreview;
window.atualizarSteps                       = atualizarSteps;
window.atualizarTampasUI                    = atualizarTampasUI;
window.buildAcabamentos                     = buildAcabamentos;
window.buildAvancado                        = buildAvancado;
window.buildEngList                         = buildEngList;
window.buildFalecidos                       = buildFalecidos;
window._setFal                              = _setFal;
window.buildGradePresets                    = buildGradePresets;
window.buildMatCats                         = buildMatCats;
window.buildMatList                         = buildMatList;
window.buildMolduraPresets                  = buildMolduraPresets;
window.buildOpcionais                       = buildOpcionais;
window.buildPecas                           = buildPecas;
window.buildPedrasCfg                       = buildPedrasCfg;
window.buildPresets                         = buildPresets;
window._TI_selAcabTampa = selAcabTampa;
window.buildTampasAcab                      = buildTampasAcab;
window.buildTipoServ                        = buildTipoServ;
window.calcularFull                         = calcularFull;
window.desenharTampasSVG                    = desenharTampasSVG;
window.escHtml                              = escHtml;
window.gerarPrintArea                       = gerarPrintArea;
window.gerarTextoWA                         = gerarTextoWA;
window.getDims                              = getDims;
window.getEngCm                             = getEngCm;
window.getMolduraCm                         = getMolduraCm;
window.getTampasDims                        = getTampasDims;
window.iaAplicarResultado                   = iaAplicarResultado;
window.loadCfgUI                            = loadCfgUI;
window.mostrarCardLapide                    = mostrarCardLapide;
window.pltCalcAlturaTotal                   = pltCalcAlturaTotal;
window.pltCalcPedras                        = pltCalcPedras;
window.pltDesenharCorte                     = pltDesenharCorte;
window.pltDesenharPlanta                    = pltDesenharPlanta;
window.pltFmt                               = pltFmt;
window.pltGetDims                           = pltGetDims;
window.pltRenderResumo                      = pltRenderResumo;
window.pltRenderTabela                      = pltRenderTabela;
window.renderProducao                       = renderProducao;
window.renderResultado                      = renderResultado;
window.validarForm                          = validarForm;

// ── tumInlineMount override: inject dynamic UI after rendering ─────────────
(function(){
  var orig=window.tumInlineMount;
  window.tumInlineMount=function(ambId){
    orig(ambId);
    // Add PDF block to resultado actions (injected after first render)
    setTimeout(function(){
      // Find copiarWA button - its parent is the actions container
      if(!document.querySelector('[data-pdfbtn]')){
        var waBtn=document.querySelector('button[onclick*="copiarWA"]');
        if(waBtn){
          var btnContainer=waBtn.parentElement;
          if(btnContainer){
            // Rebuild the actions area with PDF block at top
            var pdfBlock=document.createElement('div');
            pdfBlock.setAttribute('data-pdfbtn','1');
            pdfBlock.style.cssText='background:var(--bg3);border:1px solid var(--bd);border-radius:12px;padding:12px 14px;margin-bottom:8px';
            pdfBlock.innerHTML=
              '<div style="font-size:.6rem;letter-spacing:.08em;text-transform:uppercase;color:var(--t4);margin-bottom:10px;font-weight:700">PDF do Orçamento</div>'
              +'<button class="btn btn-gold btn-full" onclick="baixarPDF()" style="font-size:.88rem;padding:13px;justify-content:center;gap:10px;margin-bottom:8px">📥 Baixar PDF</button>'
              +'<div style="display:flex;gap:8px">'
              +'<button class="btn btn-out btn-sm" onclick="compartilharPDF()" style="flex:1;justify-content:center;border-color:rgba(201,168,76,.3);color:var(--gold)">📱 Compartilhar</button>'
              +'<button class="btn btn-out btn-sm" onclick="imprimirPDF()" style="flex:1;justify-content:center">🖨 Imprimir</button>'
              +'</div>';
            // Restyle the button container
            btnContainer.style.cssText='display:flex;flex-direction:column;gap:8px;margin-top:14px;margin-bottom:30px';
            // Insert PDF block at top
            btnContainer.insertBefore(pdfBlock,btnContainer.firstChild);
            // Style existing buttons as a row at the bottom
            var rowDiv=document.createElement('div');
            rowDiv.style.cssText='display:flex;gap:8px';
            var btns=Array.from(btnContainer.querySelectorAll('button:not([data-pdfbtn] button)'));
            btns.forEach(function(b){
              b.style.flex='1';b.style.justifyContent='center';
              rowDiv.appendChild(b);
            });
            btnContainer.appendChild(rowDiv);
          }
        }
      }
    }, 300);
  };
})();

})();
