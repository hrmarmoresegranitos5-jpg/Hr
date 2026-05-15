// ═══════════════════════════════════════════════════════════════════════════
// APP-TUM-INTEGRACAO.JS — Integração Completa do Módulo de Túmulos v1.0
// HR Mármores e Granitos
//
// Este arquivo conecta o motor técnico (app-tum-inline.js) ao ecossistema
// completo da HR: catálogo global, acessórios, histórico, finanças e agenda.
//
// DEPENDÊNCIAS: Deve ser carregado APÓS app-tum-inline.js
// ═══════════════════════════════════════════════════════════════════════════

(function() {
'use strict';

// ══════════════════════════════════════════════════════
// 1. ACESSÓRIOS REAIS DE TÚMULO
// CFG global — acessórios padrão para orçamentos de túmulo
// ══════════════════════════════════════════════════════

var TUM_ACESSORIOS_DEF = [
  { id:'argola_inox',  nm:'Argola inox (par)',        pr:45,  un:'par',  icn:'🔗' },
  { id:'argola_latao', nm:'Argola latão (par)',        pr:65,  un:'par',  icn:'🔗' },
  { id:'foto_porc',    nm:'Foto porcelana',            pr:200, un:'un',   icn:'🖼️' },
  { id:'foto_porc_col',nm:'Foto porcelana colorida',  pr:280, un:'un',   icn:'🖼️' },
  { id:'cruz_granito', nm:'Cruz granito',              pr:350, un:'un',   icn:'✝️' },
  { id:'cruz_mrm',     nm:'Cruz mármore',              pr:420, un:'un',   icn:'✝️' },
  { id:'jarro',        nm:'Jarro granito',             pr:280, un:'un',   icn:'🏺' },
  { id:'jarro_mrm',    nm:'Jarro mármore',             pr:320, un:'un',   icn:'🏺' },
  { id:'gravacao',     nm:'Gravação lápide (por linha)',pr:180, un:'linha',icn:'✍️' },
  { id:'gravacao_logo',nm:'Gravação logotipo/brasão',  pr:350, un:'un',   icn:'✍️' },
  { id:'led',          nm:'Iluminação LED',            pr:180, un:'kit',  icn:'💡' },
  { id:'bronze_plq',   nm:'Plaqueta bronze',           pr:150, un:'un',   icn:'🏷️' },
];

// Estado de acessórios selecionados por ambiente Túmulo
// ambId → { id: { ativo: bool, qt: number } }
var _tumAcSel = {};

function _getTumAcSel(ambId) {
  if (!_tumAcSel[ambId]) {
    _tumAcSel[ambId] = {};
    TUM_ACESSORIOS_DEF.forEach(function(ac) {
      _tumAcSel[ambId][ac.id] = { ativo: false, qt: 1 };
    });
  }
  return _tumAcSel[ambId];
}

function tumTogAcesso(ambId, id) {
  var sel = _getTumAcSel(ambId);
  sel[id].ativo = !sel[id].ativo;
  _renderTumAcessorios(ambId);
  _tumSyncResult(ambId);
}

function tumAdjAcQty(ambId, id, delta) {
  var sel = _getTumAcSel(ambId);
  sel[id].qt = Math.max(1, (sel[id].qt || 1) + delta);
  _renderTumAcessorios(ambId);
  _tumSyncResult(ambId);
}

function tumGetAcTotal(ambId) {
  var sel = _getTumAcSel(ambId);
  var total = 0;
  TUM_ACESSORIOS_DEF.forEach(function(ac) {
    var s = sel[ac.id];
    if (s && s.ativo) total += ac.pr * (s.qt || 1);
  });
  return total;
}

function tumGetAcList(ambId) {
  var sel = _getTumAcSel(ambId);
  var list = [];
  TUM_ACESSORIOS_DEF.forEach(function(ac) {
    var s = sel[ac.id];
    if (s && s.ativo) {
      list.push({ nm: ac.nm, pr: ac.pr, qt: s.qt || 1, sub: ac.pr * (s.qt || 1) });
    }
  });
  return list;
}

function _renderTumAcessorios(ambId) {
  var el = document.getElementById('tumAc_' + ambId);
  if (!el) return;
  var sel = _getTumAcSel(ambId);
  var total = tumGetAcTotal(ambId);
  var h = '';
  TUM_ACESSORIOS_DEF.forEach(function(ac) {
    var s = sel[ac.id] || { ativo: false, qt: 1 };
    var on = s.ativo;
    h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid var(--bd);">';
    // Toggle
    h += '<div style="display:flex;align-items:center;gap:10px;flex:1;">';
    h += '<div onclick="tumTogAcesso(' + ambId + ',\'' + ac.id + '\')" style="width:38px;height:20px;border-radius:10px;background:' + (on ? 'rgba(201,168,76,.2)' : 'var(--s3)') + ';border:1px solid ' + (on ? 'var(--gold)' : 'var(--bd2)') + ';position:relative;cursor:pointer;flex-shrink:0;transition:all .2s;">';
    h += '<div style="width:14px;height:14px;border-radius:50%;background:' + (on ? 'var(--gold)' : 'var(--t3)') + ';position:absolute;top:2px;' + (on ? 'right:3px' : 'left:3px') + ';transition:all .2s;"></div></div>';
    h += '<div><div style="font-size:.8rem;color:' + (on ? 'var(--tx)' : 'var(--t3)') + ';">' + ac.icn + ' ' + ac.nm + '</div>';
    h += '<div style="font-size:.62rem;color:var(--t4);">R$ ' + ac.pr.toLocaleString('pt-BR') + '/' + ac.un + '</div></div>';
    h += '</div>';
    // Qty + subtotal (só se ativo)
    if (on) {
      h += '<div style="display:flex;align-items:center;gap:6px;">';
      h += '<div onclick="tumAdjAcQty(' + ambId + ',\'' + ac.id + '\',-1)" style="width:26px;height:26px;border:1px solid var(--bd2);border-radius:6px;background:var(--s3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.9rem;color:var(--t2);">−</div>';
      h += '<span style="font-size:.82rem;font-weight:600;color:var(--gold2);min-width:18px;text-align:center;">' + (s.qt || 1) + '</span>';
      h += '<div onclick="tumAdjAcQty(' + ambId + ',\'' + ac.id + '\',+1)" style="width:26px;height:26px;border:1px solid var(--bd2);border-radius:6px;background:var(--s3);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.9rem;color:var(--t2);">+</div>';
      h += '<div style="font-size:.75rem;font-weight:700;color:var(--gold2);min-width:60px;text-align:right;">R$ ' + (ac.pr * (s.qt || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '</div>';
      h += '</div>';
    }
    h += '</div>';
  });
  // Total
  if (total > 0) {
    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0;border-top:1px solid rgba(201,168,76,.2);margin-top:4px;">';
    h += '<span style="font-size:.72rem;color:var(--gold);font-weight:700;letter-spacing:.05em;">TOTAL ACESSÓRIOS</span>';
    h += '<span style="font-size:.88rem;font-weight:700;color:var(--gold2);">R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) + '</span>';
    h += '</div>';
  }
  el.innerHTML = h;
}

// ══════════════════════════════════════════════════════
// 2. PEDRAS GLOBAIS — mapear CFG.stones → formato do túmulo
// ══════════════════════════════════════════════════════

function _buildTumPedrasGlobal() {
  if (typeof CFG === 'undefined' || !CFG.stones) return [];

  // Mapa de peso real por categoria de pedra (kg/m3)
  var PESO_CAT = {
    'Granito Preto': 2950, 'Granito Cinza': 2720, 'Granito Verde': 2820,
    'Granito Branco': 2650, 'Granito Bege': 2680, 'Granito': 2750,
    'Quartzito': 2650, 'Marmore': 2600, 'Nano': 2400, 'Porcelanato': 2300
  };

  return CFG.stones.map(function(s) {
    var pesoBase = 2750;
    var cat = s.cat || '';
    Object.keys(PESO_CAT).forEach(function(k) {
      if (cat.indexOf(k) >= 0) pesoBase = PESO_CAT[k];
    });
    return {
      id:    s.id,
      nm:    s.nm,
      cat:   cat || 'Geral',
      pr:    s.pr,
      peso:  s.peso || pesoBase,
      esp:   s.esp || 3,
      photo: s.photo || '',
      tx:    s.tx    || '',
      fin:   s.fin   || 'Polida',
      desc:  s.desc  || ''
    };
  });
}

// ══════════════════════════════════════════════════════
// 3. PEÇAS AUTOMÁTICAS DO TÚMULO
// Gera amb.pecas[] a partir do resultado do motor técnico
// ══════════════════════════════════════════════════════

function tumGerarPecasAuto(ambId) {
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a) { return a.id == ambId; }) : null;
  if (!amb || !amb.tumResult) return [];

  var r = amb.tumResult;
  var pecasCalc = r.pecasCalc || [];
  var pecas = [];

  pecasCalc.forEach(function(pc, i) {
    // dim string: e.g. "180×50cm", "106×70cm esp.3cm", "200×70 − ..."
    // Tentar extrair w×h do campo dim primeiro
    var dim = pc.dim || '';
    var match = dim.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i);
    var w = match ? Math.round(parseFloat(match[1])) : Math.round(pc.comp || 0);
    var h = match ? Math.round(parseFloat(match[2])) : Math.round(pc.larg || 0);

    if (w > 0 && h > 0) {
      pecas.push({
        id:   Date.now() + i,
        desc: pc.nm || pc.desc || 'Peça ' + (i + 1),
        w:    w,
        h:    h,
        q:    pc.qt || pc.q || 1
      });
    }
  });

  // Se não houver pecasCalc, gerar peças mínimas a partir das dimensões
  if (pecas.length === 0 && r.m2_total) {
    pecas.push({
      id:   Date.now(),
      desc: 'Revestimento Túmulo',
      w:    200,
      h:    70,
      q:    1
    });
  }

  return pecas;
}

// ══════════════════════════════════════════════════════
// 4. SYNC DE RESULTADO — Atualiza amb.tumResult e propagações
// ══════════════════════════════════════════════════════

function _tumSyncResult(ambId) {
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a) { return a.id == ambId; }) : null;
  if (!amb) return;

  // Acrescenta total de acessórios ao resultado
  var acTotal = tumGetAcTotal(ambId);
  if (amb.tumResult) {
    amb.tumResult.ac_total = acTotal;
    amb.tumResult.ac_list  = tumGetAcList(ambId);
    // valor total com acessórios
    amb.tumResult.valor_com_ac = (amb.tumResult.valor_vista || 0) + acTotal;
  }

  // Salvar no objeto do ambiente para que o orçamento principal use
  if (typeof _tumInlineSaveAmb === 'function') {
    // _tumInlineSaveAmb não aceita parâmetro — opera via _TI_ambId
    // Apenas certificar que tumAcSel está no amb
  }
  amb.tumAcSel = JSON.parse(JSON.stringify(_getTumAcSel(ambId)));
}

// ══════════════════════════════════════════════════════
// 5. INTEGRAÇÃO COM HISTÓRICO GLOBAL DO ERP
// ══════════════════════════════════════════════════════

function tumSalvarNoHistoricoERP(pendOrc, ambId) {
  if (!pendOrc || typeof DB === 'undefined') return;

  var acList  = tumGetAcList(ambId);
  var acTotal = tumGetAcTotal(ambId);
  var r       = pendOrc.r || {};

  // Montar objeto compatível com DB.q (histórico do ERP)
  var q = {
    id:     Date.now(),
    num:    pendOrc.num || ('TUM-' + Date.now()),
    date:   new Date().toLocaleDateString('pt-BR'),
    dateISO: new Date().toISOString(),
    tipo:   'Túmulo',
    tum:    true,
    cli:    pendOrc.cli || '',
    tel:    pendOrc.tel || '',
    // dados específicos túmulo
    falecido:  Array.isArray(pendOrc.fal) ? pendOrc.fal.map(function(f) { return f.nome; }).join(', ') : '',
    cemiterio: pendOrc.cemi || '',
    quadra:    pendOrc.quad || '',
    lote:      pendOrc.lote || '',
    cidade:    pendOrc.cid  || '',
    obs:       pendOrc.obs  || '',
    // técnico
    preset:    pendOrc.preset || '',
    mat:       pendOrc.matNm  || '',
    tipoServ:  pendOrc.tipoServNm || '',
    m2_total:  r.m2_total  || 0,
    peso_total: r.peso_total || 0,
    prazo_total: r.prazo_total || 0,
    // financeiro
    custo:   r.custo_total || 0,
    vista:   (r.valor_vista || 0) + acTotal,
    ent:     ((r.valor_vista || 0) + acTotal) * 0.5,
    margem:  r.margem || 0,
    ac_total: acTotal,
    ac_list:  acList,
    // peças geradas automaticamente
    pecas:   tumGerarPecasAuto(ambId),
    // render/desenho SVG (se disponível)
    desenho: (r.svgData || ''),
    // referência ao orçamento interno do túmulo
    tumOrcId: pendOrc.id
  };

  // Inserir no histórico do ERP
  if (DB.q) {
    var existing = DB.q.findIndex(function(x) { return x.tumOrcId && x.tumOrcId === pendOrc.id; });
    if (existing >= 0) {
      DB.q[existing] = q;
    } else {
      DB.q.unshift(q);
      if (DB.q.length > 200) DB.q.pop();
    }
    DB.sv();
  }

  // Toast de confirmação
  if (typeof toast === 'function') {
    toast('✓ Túmulo salvo no histórico do ERP');
  }

  return q;
}

// ══════════════════════════════════════════════════════
// 6. INTEGRAÇÃO COM FINANCEIRO
// Gera lançamento financeiro a partir do orçamento
// ══════════════════════════════════════════════════════

function tumEnviarParaFinanceiro(pendOrc, ambId) {
  if (!pendOrc || typeof DB === 'undefined') return;

  var r       = pendOrc.r || {};
  var acTotal = tumGetAcTotal(ambId);
  var acList  = tumGetAcList(ambId);
  var valorTotal = (r.valor_vista || 0) + acTotal;
  var custo      = r.custo_total || 0;
  var lucro      = valorTotal - custo;

  // Lançar como "A Receber" no financeiro
  if (typeof addTr === 'function') {
    // Registrar como pendente/a receber
    DB.t.unshift({
      id:     Date.now(),
      type:   'pend',     // pendente = A Receber
      desc:   'Túmulo — ' + pendOrc.cli + (pendOrc.cemi ? ' · ' + pendOrc.cemi : ''),
      value:  valorTotal,
      date:   new Date().toISOString().split('T')[0],
      obs:    [
        'Pedra: ' + (pendOrc.matNm || ''),
        'Serviço: ' + (pendOrc.tipoServNm || ''),
        acList.length ? 'Acessórios: ' + acList.map(function(a) { return a.nm + ' x' + a.qt; }).join(', ') : '',
        'Custo total: R$ ' + (custo).toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        'Margem: R$ ' + lucro.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      ].filter(Boolean).join(' | '),
      tum: true,
      tumOrcId: pendOrc.id
    });
    DB.sv();
    if (typeof renderFin === 'function') renderFin();
    if (typeof toast === 'function') toast('✓ Lançado no Financeiro como A Receber');
  }
}

// ══════════════════════════════════════════════════════
// 7. INTEGRAÇÃO COM AGENDA
// Agendar instalação de túmulo diretamente na agenda do ERP
// ══════════════════════════════════════════════════════

function tumAgendarInstalacao(pendOrc, ambId) {
  if (!pendOrc || typeof DB === 'undefined') return;

  var r = pendOrc.r || {};
  var acTotal = tumGetAcTotal(ambId);

  // Estimar dias necessários baseado no peso e complexidade
  var peso = r.peso_total || 0;
  var diasEst = 1;
  if (peso > 500) diasEst = 2;
  if (peso > 1000) diasEst = 3;

  // Abrir modal de agenda do ERP com dados pré-preenchidos
  if (typeof pendQ !== 'undefined' && typeof showMd === 'function') {
    // Preencher pendQ com dados do túmulo
    window.pendQ = {
      id:   pendOrc.id,
      tum:  true,
      cli:  pendOrc.cli,
      tipo: 'Túmulo — ' + (pendOrc.preset || 'Padrão'),
      mat:  pendOrc.matNm || '',
      vista: (r.valor_vista || 0) + acTotal,
      ent:  ((r.valor_vista || 0) + acTotal) * 0.5,
      obs:  [
        pendOrc.cemi ? 'Cemitério: ' + pendOrc.cemi : '',
        pendOrc.cid  ? 'Cidade: '    + pendOrc.cid  : '',
        pendOrc.quad ? 'Quadra: '    + pendOrc.quad  : '',
        pendOrc.lote ? 'Lote: '      + pendOrc.lote  : '',
        peso         ? 'Peso aprox.: ' + peso.toLocaleString('pt-BR') + ' kg' : ''
      ].filter(Boolean).join(' · '),
      diasEst: diasEst,
      peso: peso
    };
    // Preencher o campo de dias com estimativa
    document.getElementById('diasIn').value = diasEst;
    var s = (typeof lastEnd === 'function' ? lastEnd() : null) || (typeof td === 'function' ? td() : new Date().toISOString().split('T')[0]);
    var prevEl = document.getElementById('diasPrev');
    if (prevEl) {
      var dataFim = typeof addD === 'function' ? addD(s, diasEst) : '';
      var fdFn = typeof fd === 'function' ? fd : function(d) { return d; };
      prevEl.textContent = 'Início: ' + fdFn(s) + '\nEntrega prevista: ' + fdFn(dataFim);
      prevEl.classList.add('on');
    }
    var diasMsgEl = document.getElementById('diasMsg');
    if (diasMsgEl) {
      var last = typeof lastEnd === 'function' ? lastEnd() : null;
      var fdFn2 = typeof fd === 'function' ? fd : function(d) { return d; };
      diasMsgEl.textContent = (last ? 'Agenda ocupada até ' + fdFn2(last) + '. ' : '') +
        'Dias estimados para instalação de túmulo ' + pendOrc.cli + ' — ' + (pendOrc.cemi || '') +
        ' (Peso: ' + (peso ? peso.toLocaleString('pt-BR') + ' kg' : 'N/D') + '):';
    }
    showMd('diasMd');
  } else {
    // Fallback: criar job direto
    var s2 = (typeof lastEnd === 'function' ? lastEnd() : null) || new Date().toISOString().split('T')[0];
    var end2 = typeof addD === 'function' ? addD(s2, diasEst) : s2;
    var job = {
      id:    Date.now(),
      cli:   pendOrc.cli,
      desc:  'Instalação Túmulo — ' + (pendOrc.cemi || pendOrc.cid || ''),
      start: s2,
      end:   end2,
      value: (r.valor_vista || 0) + acTotal,
      pago:  0,
      obs:   [
        pendOrc.cemi ? 'Cem.: ' + pendOrc.cemi : '',
        peso         ? 'Peso: ' + peso.toLocaleString('pt-BR') + ' kg' : ''
      ].filter(Boolean).join(' · '),
      done:  false,
      tum:   true
    };
    if (DB.j) { DB.j.unshift(job); DB.sv(); }
    if (typeof updUrgDot === 'function') updUrgDot();
    if (typeof renderAg === 'function') renderAg();
    if (typeof toast === 'function') toast('✓ Instalação agendada para ' + (typeof fd === 'function' ? fd(end2) : end2));
  }
}

// ══════════════════════════════════════════════════════
// 8. BLOCO DE INTEGRAÇÃO — HTML injetado após o botão Salvar
// Exibe ações de ERP dentro do módulo de túmulo
// ══════════════════════════════════════════════════════

function buildTumERPActionsHtml(ambId) {
  return [
    '<div id="tumERPActions_' + ambId + '" style="margin-top:14px;padding:14px;background:var(--bg2,#101012);border:1px solid rgba(201,168,76,.2);border-radius:12px;">',
    '<div style="font-size:.58rem;letter-spacing:.18em;text-transform:uppercase;color:var(--gold,#c9a84c);font-weight:700;margin-bottom:10px;">⚙ Integração ERP — HR Mármores</div>',

    // Acessórios
    '<div style="font-size:.62rem;letter-spacing:.12em;text-transform:uppercase;color:var(--t3,#787068);font-weight:600;margin-bottom:8px;">🔩 Acessórios do Túmulo</div>',
    '<div id="tumAc_' + ambId + '" style="margin-bottom:12px;"></div>',

    // Botões de ação ERP
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:4px;">',
    '  <button onclick="tumSalvarNoHistoricoERP(window._tumPendOrc_' + ambId + ',' + ambId + ')"',
    '    style="flex:1;min-width:140px;padding:9px 12px;border-radius:10px;border:1px solid var(--bd2,rgba(255,255,255,.1));background:var(--bg3,#161618);',
    '    color:var(--t2,#b0ab9e);font-family:Outfit,sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;">',
    '    📋 Salvar no ERP',
    '  </button>',
    '  <button onclick="tumEnviarParaFinanceiro(window._tumPendOrc_' + ambId + ',' + ambId + ')"',
    '    style="flex:1;min-width:140px;padding:9px 12px;border-radius:10px;border:1px solid var(--bd2,rgba(255,255,255,.1));background:var(--bg3,#161618);',
    '    color:var(--t2,#b0ab9e);font-family:Outfit,sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;">',
    '    💰 Enviar Financeiro',
    '  </button>',
    '  <button onclick="tumAgendarInstalacao(window._tumPendOrc_' + ambId + ',' + ambId + ')"',
    '    style="flex:1;min-width:140px;padding:9px 12px;border-radius:10px;border:1px solid rgba(201,168,76,.3);background:rgba(201,168,76,.06);',
    '    color:var(--gold,#c9a84c);font-family:Outfit,sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;">',
    '    📅 Agendar Instalação',
    '  </button>',
    '</div>',

    // Resumo financeiro do túmulo (preenchido dinamicamente)
    '<div id="tumFinResumo_' + ambId + '" style="margin-top:10px;"></div>',
    '</div>'
  ].join('');
}

function _renderTumFinResumo(ambId, pendOrc) {
  var el = document.getElementById('tumFinResumo_' + ambId);
  if (!el || !pendOrc) return;
  var r       = pendOrc.r || {};
  var acTotal = tumGetAcTotal(ambId);
  var acList  = tumGetAcList(ambId);
  var valTotal = (r.valor_vista || 0) + acTotal;
  var custo    = r.custo_total || 0;
  var lucro    = valTotal - custo;
  var margem   = valTotal > 0 ? ((lucro / valTotal) * 100).toFixed(1) : '0.0';

  var fmt = function(v) { return v.toLocaleString('pt-BR', { minimumFractionDigits: 2 }); };

  var h = '<div style="background:var(--s2,#0d0d0f);border:1px solid var(--bd,rgba(255,255,255,.06));border-radius:10px;padding:11px 13px;margin-top:6px;">';
  h += '<div style="font-size:.56rem;letter-spacing:.15em;text-transform:uppercase;color:var(--gold,#c9a84c);font-weight:700;margin-bottom:8px;">📊 Resumo Financeiro</div>';
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;">';
  var items = [
    ['Pedras + Serviço', 'R$ ' + fmt(r.valor_vista || 0), 'var(--tx,#edeae2)'],
    ['Acessórios',       'R$ ' + fmt(acTotal),             'var(--gold2,#e8c96a)'],
    ['Total Venda',      'R$ ' + fmt(valTotal),             'var(--gold2,#e8c96a)'],
    ['Custo Total',      'R$ ' + fmt(custo),               'var(--t3,#787068)'],
    ['Lucro Bruto',      'R$ ' + fmt(lucro),               lucro >= 0 ? '#5a9a6a' : '#c05a4a'],
    ['Margem',           margem + '%',                      lucro >= 0 ? '#5a9a6a' : '#c05a4a'],
  ];
  if (r.m2_total) items.push(['Área Total', r.m2_total.toFixed(2) + ' m²', 'var(--t2)']);
  if (r.peso_total) items.push(['Peso Total', r.peso_total.toLocaleString('pt-BR') + ' kg', 'var(--t2)']);

  items.forEach(function(item) {
    h += '<div style="background:var(--s3,#161618);border-radius:7px;padding:7px 9px;">';
    h += '<div style="font-size:.55rem;color:var(--t4,#484440);text-transform:uppercase;letter-spacing:.05em;">' + item[0] + '</div>';
    h += '<div style="font-size:.8rem;font-weight:700;color:' + item[2] + ';margin-top:1px;">' + item[1] + '</div>';
    h += '</div>';
  });
  h += '</div>';

  // Lista de acessórios ativos
  if (acList.length > 0) {
    h += '<div style="margin-top:8px;font-size:.65rem;color:var(--t3);">';
    h += '<span style="color:var(--gold);font-weight:600;">Acessórios: </span>';
    h += acList.map(function(a) { return a.nm + ' ×' + a.qt; }).join(' · ');
    h += '</div>';
  }
  h += '</div>';
  el.innerHTML = h;
}

// ══════════════════════════════════════════════════════
// 9. HOOK NO CALCULADORA FINAL — interceptar calcularFinal
// para injetar o bloco ERP e sincronizar dados
// ══════════════════════════════════════════════════════

// Armazenar pendOrc por ambId para acesso global nos botões
window._tumPendOrcMap = window._tumPendOrcMap || {};

function _hookTumCalcFinal(ambId) {
  // Após o calcularFinal do motor, este hook:
  // 1. Lê pendOrc exposto via window._tumLastPendOrc (não mais pelo DOM)
  // 2. Grava no map global e no amb
  // 3. Renderiza acessórios e resumo financeiro
  var root = document.getElementById('tumInline_' + ambId);
  if (!root) return;

  // Injetar bloco ERP se ainda não existir
  if (!document.getElementById('tumERPActions_' + ambId)) {
    var resPage = root.querySelector('#pg-resultado');
    if (resPage) {
      var div = document.createElement('div');
      div.innerHTML = buildTumERPActionsHtml(ambId);
      resPage.appendChild(div.firstChild);
    }
  }

  // Inicializar acessórios
  _renderTumAcessorios(ambId);

  // Ler pendOrc exposto pelo motor
  var pendOrc = window._tumLastPendOrc;
  if (!pendOrc || !pendOrc.r || !pendOrc.r.valor_vista) return;

  window['_tumPendOrc_' + ambId] = pendOrc;
  window._tumPendOrcMap[ambId]   = pendOrc;

  // Salvar resultado no objeto ambiente do app principal
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a) { return a.id == ambId; }) : null;
  if (amb) {
    amb.tumResult = pendOrc.r;
    amb.tumPendOrc = pendOrc;
    // ── SYNC: pedra do motor túmulo → amb.selMat do orçamento principal ──
    if (pendOrc.r && pendOrc.r.mat && pendOrc.r.mat.id) {
      amb.selMat = pendOrc.r.mat.id;
      if (typeof selMat !== 'undefined') { selMat = pendOrc.r.mat.id; }
      try { localStorage.setItem('hr_last_mat', pendOrc.r.mat.id); } catch(e){}
    }
    // Popular amb.pecas com as peças do túmulo para que o PDF principal as liste
    var pecasAuto = tumGerarPecasAuto(ambId);
    if (pecasAuto.length > 0) {
      amb.pecas = pecasAuto;
    }
  }

  _renderTumFinResumo(ambId, pendOrc);
}


// ══════════════════════════════════════════════════════
// 10. CATÁLOGO GLOBAL — sincronizar pedras do ERP no motor
// Chamado quando tumInlineMount é executado
// ══════════════════════════════════════════════════════

function tumSincPedrasGlobais() {
  var stones = _buildTumPedrasGlobal();
  if (!stones.length) return;

  // Buscar pedras locais via API do IIFE (evita ler localStorage,
  // que pode estar desatualizado em relação ao CFG.pedras em memória)
  var pedrasLocais = (typeof window.tumGetPedrasLocais === 'function')
    ? window.tumGetPedrasLocais()
    : [];

  // Ids das pedras vindas do ERP (para não duplicar)
  var idsERP = {};
  stones.forEach(function(s) { idsERP[s.id] = true; });

  // Mesclar: pedras do ERP primeiro; depois pedras locais (criadas pelo usuário)
  // que NÃO existam no ERP — identificadas pelo prefixo "p_" + timestamp
  var merged = stones.slice();
  pedrasLocais.forEach(function(p) {
    if (!idsERP[p.id]) {
      merged.push(p);
    }
  });

  // Sync DIRETO na memória do IIFE com o catálogo mesclado
  if (typeof window.tumSetPedrasCatalogo === 'function') {
    window.tumSetPedrasCatalogo(merged);
  }

  // Persiste no localStorage SEM sobrescrever margem/mob/civil/etc
  try {
    var cfg = JSON.parse(localStorage.getItem('hr_tum_cfg') || 'null') || {};
    cfg.pedras = merged;
    // Preservar campos escalares se já existirem
    if (!cfg.margem)  cfg.margem  = 35;
    if (!cfg.parcMax) cfg.parcMax = 8;
    if (!cfg.juros)   cfg.juros   = 12;
    localStorage.setItem('hr_tum_cfg', JSON.stringify(cfg));
  } catch(e) {}
}

// ══════════════════════════════════════════════════════
// 11. EXTENSÃO DO tumInlineMount ORIGINAL
// Adiciona hook pós-montagem sem quebrar o original
// ══════════════════════════════════════════════════════

var _originalTumInlineMount = null;

function _patchTumInlineMount() {
  if (typeof window.tumInlineMount !== 'function') return;
  if (_originalTumInlineMount) return; // já patchado

  _originalTumInlineMount = window.tumInlineMount;

  window.tumInlineMount = function(ambId) {
    // Sincronizar pedras globais antes de montar
    tumSincPedrasGlobais();

    // Chamar original
    _originalTumInlineMount(ambId);

    // Pós-montagem: injetar bloco ERP, inicializar acessórios
    var root = document.getElementById('tumInline_' + ambId);
    if (!root) return;

    // Restaurar estado de acessórios se existir
    var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a) { return a.id == ambId; }) : null;
    if (amb && amb.tumAcSel) {
      _tumAcSel[ambId] = JSON.parse(JSON.stringify(amb.tumAcSel));
    } else {
      _getTumAcSel(ambId); // inicializa com defaults
    }

    // Injetar bloco ERP no final da aba resultado (após o botão Salvar)
    if (!document.getElementById('tumERPActions_' + ambId)) {
      var resPage = root.querySelector('#pg-resultado');
      if (resPage) {
        var div = document.createElement('div');
        div.innerHTML = buildTumERPActionsHtml(ambId);
        resPage.appendChild(div.firstChild);
        _renderTumAcessorios(ambId);
      }
    }

    // Observar clique em "Calcular Orçamento" (app principal) → aciona o motor do túmulo
    // O botão original "Gerar Orçamento Completo" foi removido da UI; o motor é
    // acionado via _TI_tumCalcularAuto(ambId) chamado pelo app-core antes de calcular().
    var btnCalc = root.querySelector('#btnTumCalcAuto') || root.querySelector('[onclick="calcularFinal()"]');
    if (btnCalc && !btnCalc._tumErpHooked) {
      btnCalc._tumErpHooked = true;
      btnCalc.addEventListener('click', function() {
        // Aguardar o motor calcular (próximo tick)
        setTimeout(function() { _hookTumCalcFinal(ambId); }, 100);
      });
    }

    // Observar clique em "Salvar" do túmulo para integração automática
    var btnSalvar = root.querySelector('[onclick="salvarHistorico()"]');
    if (btnSalvar && !btnSalvar._tumErpHooked) {
      btnSalvar._tumErpHooked = true;
      btnSalvar.addEventListener('click', function() {
        setTimeout(function() {
          var o = window['_tumPendOrc_' + ambId];
          if (o) tumSalvarNoHistoricoERP(o, ambId);
        }, 200);
      });
    }
  };
}

// ══════════════════════════════════════════════════════
// 12. RESUMO DO TÚMULO NO AMB-HEADER DO ERP
// Mostra valor, m² e peso no cabeçalho do ambiente
// ══════════════════════════════════════════════════════

function tumGetAmbSummary(amb) {
  if (!amb || !amb.tumResult) return '';
  var r = amb.tumResult;
  var acTotal = tumGetAcTotal(amb.id);
  var total = (r.valor_vista || 0) + acTotal;
  var parts = [];
  if (total > 0) parts.push('R$ ' + total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
  if (r.m2_total > 0) parts.push(r.m2_total.toFixed(2) + ' m²');
  if (r.peso_total > 0) parts.push(r.peso_total.toLocaleString('pt-BR') + ' kg');
  if (r.mat_nm) parts.push(r.mat_nm);
  return parts.join(' · ');
}

// ══════════════════════════════════════════════════════
// 13. EXPORTAÇÃO DO ORÇAMENTO DE TÚMULO PARA O CÁLCULO
// PRINCIPAL DO ERP (usado em calcularOrc do app-core)
// ══════════════════════════════════════════════════════

function tumGetValorParaOrc(ambId) {
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a) { return a.id == ambId; }) : null;
  if (!amb || !amb.tumResult) return 0;
  var acTotal = tumGetAcTotal(ambId);
  return (amb.tumResult.valor_vista || 0) + acTotal;
}

function tumGetPesoParaOrc(ambId) {
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a) { return a.id == ambId; }) : null;
  if (!amb || !amb.tumResult) return 0;
  return amb.tumResult.peso_total || 0;
}

// ══════════════════════════════════════════════════════
// 14. INICIALIZAÇÃO — executar após DOM pronto
// ══════════════════════════════════════════════════════

function _init() {
  // Aguardar o tumInlineMount estar disponível (pode carregar depois)
  var attempts = 0;
  var waitAndPatch = function() {
    if (typeof window.tumInlineMount === 'function') {
      _patchTumInlineMount();
    } else if (attempts < 30) {
      attempts++;
      setTimeout(waitAndPatch, 200);
    }
  };
  waitAndPatch();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _init);
} else {
  _init();
}

// ══════════════════════════════════════════════════════
// EXPOR API PÚBLICA
// ══════════════════════════════════════════════════════

window.tumTogAcesso            = tumTogAcesso;
window.tumAdjAcQty             = tumAdjAcQty;
window.tumGetAcTotal           = tumGetAcTotal;
window.tumGetAcList            = tumGetAcList;
window.tumSalvarNoHistoricoERP = tumSalvarNoHistoricoERP;
window.tumEnviarParaFinanceiro = tumEnviarParaFinanceiro;
window.tumAgendarInstalacao    = tumAgendarInstalacao;
window.tumGetAmbSummary        = tumGetAmbSummary;
window.tumGetValorParaOrc      = tumGetValorParaOrc;
window.tumGetPesoParaOrc       = tumGetPesoParaOrc;
window.tumSincPedrasGlobais    = tumSincPedrasGlobais;
window.tumGerarPecasAuto       = tumGerarPecasAuto;

})();
