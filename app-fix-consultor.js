// ══════════════════════════════════════════════════════════
// 🧠 CONSULTOR DE FIXAÇÃO — HR Mármores e Granitos
//
// Substitui os checkboxes de Fixação/Instalação (Cozinha/Banheiro)
// por uma tela de perguntas, mostrada DENTRO do próprio card do
// ambiente, ANTES de clicar em "Calcular Orçamento" — exatamente
// onde os checkboxes ficavam.
//
//   1) Tipo de fixação: Tubo Metálico ou Perfil U chumbado? Quantos?
//      (aplica a mesma quantidade também na Instalação por tubo/conexão)
//   2) Tem balcão nesse ambiente? Se sim:
//        - Argamassa AC-3: R$ 50 (fixo)
//        - Quantas cantoneiras? (R$ 50 cada)
//
// Trabalha direto no objeto `amb` (array global `ambientes`), então
// funciona antes de calcular — não depende de nenhum snapshot.
//
// Carregar DEPOIS de app-core.js, app-clientes.js e app-inst-tubo-fix.js:
//   <script src="app-fix-consultor.js?v=2"></script>
// ══════════════════════════════════════════════════════════

(function() {
  'use strict';

  var PRECO_AC3_BALCAO = 50;
  var PRECO_CANT_BALCAO = 50;
  // v3: todos os ambientes de bancada usam o consultor (antes só Cozinha e Banheiro)
  var TIPOS_COM_FIXACAO = ['Cozinha', '🌴 Área Gourmet', 'Banheiro', 'Lavabo', 'Área de Serviço', 'Outro'];
  window._fixTipos = TIPOS_COM_FIXACAO;

  // ─── Garante os itens de Balcão (Argamassa AC-3 / Cantoneira) no grupo
  //     Fixação de Cozinha e Banheiro, e os preços em CFG.sv/CFG.svList ───
  function _prepararItensBalcao() {
    if (typeof SV_DEFS === 'undefined') return false;

    TIPOS_COM_FIXACAO.forEach(function(tipo) {
      var grupos = SV_DEFS[tipo];
      if (!grupos) return;
      var grpFix = grupos.find(function(g) { return g.g === 'Fixação'; });
      if (!grpFix) { // Lavabo não tinha grupo de fixação: entra antes de Instalação/Deslocamento
        grpFix = { g: 'Fixação', its: [{ k: 'tubo', l: 'Tubo Metálico', u: 'un', fx: 0 }, { k: 'cant', l: 'Cantoneira', u: 'un', fx: 0 }] };
        var pos = grupos.findIndex(function(g) { return g.g === 'Instalação' || g.g === 'Deslocamento'; });
        if (pos < 0) grupos.push(grpFix); else grupos.splice(pos, 0, grpFix);
      }
      var grpInst = grupos.find(function(g) { return g.g === 'Instalação'; });
      if (!grpInst) { grpInst = { g: 'Instalação', its: [] }; grupos.splice(grupos.indexOf(grpFix) + 1, 0, grpInst); }
      if (!grpInst.its.some(function(it) { return it.k === 'inst_tubo'; })) grpInst.its.push({ k: 'inst_tubo', l: 'Instalação (por tubo/conexão)', u: 'un', fx: 0 });
      if (!grpFix.its.some(function(it) { return it.k === 'balc_ac3'; })) {
        grpFix.its.push({ k: 'balc_ac3', l: 'Argamassa AC-3 (balcão)', u: 'un', fx: 1 });
      }
      if (!grpFix.its.some(function(it) { return it.k === 'cant_balc'; })) {
        grpFix.its.push({ k: 'cant_balc', l: 'Cantoneira (balcão)', u: 'un', fx: 0 });
      }
    });

    if (window.CFG) {
      if (!CFG.sv) CFG.sv = {};
      if (CFG.sv.balc_ac3 === undefined || CFG.sv.balc_ac3 === null) CFG.sv.balc_ac3 = PRECO_AC3_BALCAO;
      if (CFG.sv.cant_balc === undefined || CFG.sv.cant_balc === null) CFG.sv.cant_balc = PRECO_CANT_BALCAO;
      if (!CFG.svList) CFG.svList = [];
      if (!CFG.svList.find(function(x) { return x.k === 'balc_ac3'; })) {
        CFG.svList.push({ k: 'balc_ac3', l: 'Argamassa AC-3 (balcão)', preco: CFG.sv.balc_ac3, grp: 'Fixação', u: 'un' });
        if (typeof svCFG === 'function') svCFG();
      }
      if (!CFG.svList.find(function(x) { return x.k === 'cant_balc'; })) {
        CFG.svList.push({ k: 'cant_balc', l: 'Cantoneira (balcão)', preco: CFG.sv.cant_balc, grp: 'Fixação', u: 'un' });
        if (typeof svCFG === 'function') svCFG();
      }
    }
    return true;
  }

  function _achaAmb(ambId) {
    return (typeof ambientes !== 'undefined' ? ambientes : []).find(function(a) { return a.id == ambId; });
  }

  function _labelDe(k, fallback) {
    var item = (window.CFG && CFG.svList) ? CFG.svList.find(function(x) { return x.k === k; }) : null;
    return item ? item.l : fallback;
  }
  function _precoDe(k) {
    if (typeof getPr === 'function') return getPr(k) || 0;
    return (window.CFG && CFG.sv && CFG.sv[k]) || 0;
  }

  // ─── Estado pendente (ainda não aplicado) — guardado no próprio objeto
  //     amb, então sobrevive aos re-renders enquanto o ambiente existir ───
  function _pend(amb) {
    if (!amb._fixPend) {
      var tuboAtivo = amb.svState && amb.svState.tubo ? 'tubo' : (amb.svState && amb.svState.cant ? 'cant' : null);
      var qtdAtual = tuboAtivo ? (amb.svState[tuboAtivo].qty || 2) : 2;
      var temBalcaoAtual = (amb.svState && (amb.svState.balc_ac3 || amb.svState.cant_balc)) ? true : null;
      var qtdCantAtual = (amb.svState && amb.svState.cant_balc && amb.svState.cant_balc.qty) || 2;
      amb._fixPend = { tipoFix: tuboAtivo, qtdFix: qtdAtual, temBalcao: temBalcaoAtual, qtdCant: qtdCantAtual };
    }
    return amb._fixPend;
  }

  function _rerender() {
    if (typeof renderAmbientes === 'function') renderAmbientes();
  }

  // v3: um toque já aplica (sem botão "Aplicar"); "Sem fixação" limpa
  function _setTipoFix(ambId, tipo) {
    var amb = _achaAmb(ambId); if (!amb) return;
    var p = _pend(amb);
    p.tipoFix = tipo;
    if (tipo === 'nenhum') { if (amb.svState) { delete amb.svState.tubo; delete amb.svState.cant; delete amb.svState.inst_tubo; } _rerender(); return; }
    _fixAplicar(ambId, true);
  }
  function _setQtdFix(ambId, delta) {
    var amb = _achaAmb(ambId); if (!amb) return;
    var p = _pend(amb);
    p.qtdFix = Math.max(1, p.qtdFix + delta);
    if (p.tipoFix === 'tubo' || p.tipoFix === 'cant') _fixAplicar(ambId, true); else _rerender();
  }
  function _fixAplicar(ambId, silencioso) {
    var amb = _achaAmb(ambId); if (!amb) return;
    var p = _pend(amb);
    if (!p.tipoFix) return;
    if (!amb.svState) amb.svState = {};

    var outraK = p.tipoFix === 'tubo' ? 'cant' : 'tubo';
    delete amb.svState[outraK]; // garante que só um dos dois fica marcado
    amb.svState[p.tipoFix] = { qty: p.qtdFix };
    amb.svState.inst_tubo = { qty: p.qtdFix };

    if (!silencioso && typeof toast === 'function') toast('✓ Fixação aplicada');
    _rerender();
  }
  function _fixRemover(ambId) {
    var amb = _achaAmb(ambId); if (!amb) return;
    if (amb.svState) { delete amb.svState.tubo; delete amb.svState.cant; delete amb.svState.inst_tubo; }
    amb._fixPend = null;
    _rerender();
  }

  function _setTemBalcao(ambId, val) {
    var amb = _achaAmb(ambId); if (!amb) return;
    _pend(amb).temBalcao = val;
    if (!val) {
      if (amb.svState) { delete amb.svState.balc_ac3; delete amb.svState.cant_balc; }
    }
    if (val === true) { _balcaoAplicar(ambId, true); return; }
    _rerender();
  }
  function _setQtdCant(ambId, delta) {
    var amb = _achaAmb(ambId); if (!amb) return;
    var p = _pend(amb);
    p.qtdCant = Math.max(0, p.qtdCant + delta);
    if (p.temBalcao === true) _balcaoAplicar(ambId, true); else _rerender();
  }
  function _balcaoAplicar(ambId, silencioso) {
    var amb = _achaAmb(ambId); if (!amb) return;
    var p = _pend(amb);
    if (!amb.svState) amb.svState = {};
    amb.svState.balc_ac3 = { qty: 1 };
    if (p.qtdCant > 0) amb.svState.cant_balc = { qty: p.qtdCant }; else delete amb.svState.cant_balc;
    if (!silencioso && typeof toast === 'function') toast('✓ Balcão aplicado');
    _rerender();
  }
  function _balcaoRemover(ambId) {
    var amb = _achaAmb(ambId); if (!amb) return;
    if (amb.svState) { delete amb.svState.balc_ac3; delete amb.svState.cant_balc; }
    var p = _pend(amb);
    p.temBalcao = null;
    _rerender();
  }

  window._fixSetTipoFix = _setTipoFix;
  window._fixSetQtdFix = _setQtdFix;
  window._fixAplicar = _fixAplicar;
  window._fixRemover = _fixRemover;
  window._fixSetTemBalcao = _setTemBalcao;
  window._fixSetQtdCant = _setQtdCant;
  window._fixBalcaoAplicar = _balcaoAplicar;
  window._fixBalcaoRemover = _balcaoRemover;

  function _stepper(label, valor, cbMenos, cbMais) {
    return '<div style="display:flex;align-items:center;gap:10px;margin:8px 0;">' +
      '<span style="font-size:.72rem;color:var(--t3);flex:1;">' + label + '</span>' +
      '<button type="button" onclick="' + cbMenos + '" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--bd2);background:var(--s1);color:var(--t2);font-weight:700;">−</button>' +
      '<span style="min-width:24px;text-align:center;font-weight:700;color:var(--gold);">' + valor + '</span>' +
      '<button type="button" onclick="' + cbMais + '" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--bd2);background:var(--s1);color:var(--t2);font-weight:700;">+</button>' +
      '</div>';
  }

  // ─── HTML inline, chamado de dentro de buildSVHtml(amb) no lugar do
  //     grupo "Fixação" (o grupo "Instalação" é pulado, pois já está
  //     embutido aqui via inst_tubo) ───
  function _chip(ativo, onclick, titulo, sub) {
    return '<button type="button" onclick="' + onclick + '" style="flex:1;min-width:0;padding:9px 6px;border-radius:9px;border:1px solid ' + (ativo ? 'var(--gold)' : 'var(--bd2)') + ';background:' + (ativo ? 'rgba(201,168,76,.14)' : 'var(--s1)') + ';color:' + (ativo ? 'var(--gold)' : 'var(--t2)') + ';font-weight:700;font-size:.68rem;font-family:inherit;line-height:1.3;">' + (ativo ? '✓ ' : '') + titulo + (sub ? '<br><span style="font-weight:400;opacity:.7;">' + sub + '</span>' : '') + '</button>';
  }

  function _fixInlineHtml(amb) {
    if (TIPOS_COM_FIXACAO.indexOf(amb.tipo) === -1) return '';
    var p = _pend(amb);
    var sv = amb.svState || {};
    var lblTubo = _labelDe('tubo', 'Tubo Metálico'), lblCant = _labelDe('cant', 'Perfil U chumbado');
    var prTubo = _precoDe('tubo'), prCant = _precoDe('cant'), prInst = _precoDe('inst_tubo');
    var prAc3 = _precoDe('balc_ac3') || PRECO_AC3_BALCAO, prCantB = _precoDe('cant_balc') || PRECO_CANT_BALCAO;
    var tipoAtual = sv.tubo ? 'tubo' : (sv.cant ? 'cant' : (p.tipoFix === 'nenhum' ? 'nenhum' : null));
    if (tipoAtual === 'tubo' || tipoAtual === 'cant') p.qtdFix = sv[tipoAtual].qty || p.qtdFix;

    var h = '<div class="svblk"><div class="svhd">🧠 Fixação (IA)</div><div style="padding:10px 12px 12px;">';
    h += '<div style="font-size:.7rem;color:var(--t3);margin-bottom:6px;">Como a bancada vai ser fixada?</div>';
    h += '<div style="display:flex;gap:6px;">' +
      _chip(tipoAtual === 'tubo', '_fixSetTipoFix(' + amb.id + ',\'tubo\')', escH(lblTubo), 'R$ ' + fm(prTubo)) +
      _chip(tipoAtual === 'cant', '_fixSetTipoFix(' + amb.id + ',\'cant\')', escH(lblCant), 'R$ ' + fm(prCant)) +
      _chip(tipoAtual === 'nenhum', '_fixSetTipoFix(' + amb.id + ',\'nenhum\')', 'Sem fixação', 'apoiada') + '</div>';
    if (tipoAtual === 'tubo' || tipoAtual === 'cant') {
      var prAtual = tipoAtual === 'tubo' ? prTubo : prCant;
      h += _stepper('Quantidade', p.qtdFix, '_fixSetQtdFix(' + amb.id + ',-1)', '_fixSetQtdFix(' + amb.id + ',1)');
      h += '<div style="font-size:.66rem;color:#5dbf7a;">✓ Fixação R$ ' + fm(p.qtdFix * prAtual) + ' + Instalação R$ ' + fm(p.qtdFix * prInst) + ' = <b>R$ ' + fm(p.qtdFix * (prAtual + prInst)) + '</b> já no orçamento</div>';
    }

    h += '<div style="height:1px;background:var(--bd);margin:12px 0;"></div>';
    var temBalc = sv.balc_ac3 ? true : p.temBalcao;
    h += '<div style="font-size:.7rem;color:var(--t3);margin-bottom:6px;">Tem balcão nesse ambiente?</div>';
    h += '<div style="display:flex;gap:6px;">' +
      _chip(temBalc === true, '_fixSetTemBalcao(' + amb.id + ',true)', 'Sim', '') +
      _chip(temBalc === false, '_fixSetTemBalcao(' + amb.id + ',false)', 'Não', '') + '</div>';
    if (temBalc === true) {
      var qC = sv.cant_balc ? sv.cant_balc.qty : (sv.balc_ac3 ? 0 : p.qtdCant);
      p.qtdCant = qC;
      h += _stepper('Cantoneiras (R$ ' + fm(prCantB) + ' cada)', qC, '_fixSetQtdCant(' + amb.id + ',-1)', '_fixSetQtdCant(' + amb.id + ',1)');
      h += '<div style="font-size:.66rem;color:#5dbf7a;">✓ Argamassa AC-3 R$ ' + fm(prAc3) + (qC ? ' + ' + qC + ' cantoneira(s) R$ ' + fm(qC * prCantB) : '') + ' = <b>R$ ' + fm(prAc3 + qC * prCantB) + '</b> já no orçamento</div>';
    }
    h += '</div></div>';
    return h;
  }

  window._fixInlineHtml = _fixInlineHtml;

  function init() { _prepararItensBalcao(); }
  if (typeof SV_DEFS !== 'undefined') init();
  else document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 300);
})();
