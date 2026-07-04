// ══════════════════════════════════════════════════════════
// 🧠 CONSULTOR DE FIXAÇÃO — HR Mármores e Granitos
//
// Depois de "Calcular Orçamento", mostra um cartão por ambiente de
// Cozinha/Banheiro perguntando (em vez de adivinhar):
//   1) Tipo de fixação: Tubo Metálico ou Perfil U chumbado? Quantos?
//      (aplica a mesma quantidade também na Instalação por tubo/conexão)
//   2) Tem balcão nesse ambiente? Se sim:
//        - Argamassa AC-3: R$ 50 (fixo)
//        - Quantas cantoneiras? (R$ 50 cada)
//
// Não mexe nos checkboxes manuais do formulário — só oferece um
// atalho que já preenche tudo certo, igual ao Consultor de Quantidade.
//
// Carregar DEPOIS de app-core.js, app-clientes.js e app-inst-tubo-fix.js:
//   <script src="app-fix-consultor.js?v=1"></script>
// ══════════════════════════════════════════════════════════

(function() {
  'use strict';

  var PRECO_AC3_BALCAO = 50;
  var PRECO_CANT_BALCAO = 50;
  var TIPOS_COM_FIXACAO = ['Cozinha', 'Banheiro'];

  // ─── Garante os itens de Balcão (Argamassa AC-3 / Cantoneira) no grupo
  //     Fixação de Cozinha e Banheiro, e os preços em CFG.sv/CFG.svList ───
  function _prepararItensBalcao() {
    if (typeof SV_DEFS === 'undefined') return false;

    TIPOS_COM_FIXACAO.forEach(function(tipo) {
      var grupos = SV_DEFS[tipo];
      if (!grupos) return;
      var grpFix = grupos.find(function(g) { return g.g === 'Fixação'; });
      if (!grpFix) return;
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

  // ─── Estado do assistente por ambiente (não persiste com o orçamento,
  //     só existe enquanto a tela estiver aberta) ───
  var _st = {}; // { [ambId]: { tipoFix, qtdFix, aplicouFix, temBalcao, qtdCant, aplicouBalcao } }

  function _stFor(ambId) {
    if (!_st[ambId]) _st[ambId] = { tipoFix: null, qtdFix: 2, aplicouFix: false, temBalcao: null, qtdCant: 2, aplicouBalcao: false };
    return _st[ambId];
  }

  function _labelDe(k, fallback) {
    var item = (window.CFG && CFG.svList) ? CFG.svList.find(function(x) { return x.k === k; }) : null;
    return item ? item.l : fallback;
  }
  function _precoDe(k) {
    return (window.CFG && CFG.sv && CFG.sv[k]) || 0;
  }

  function _contextos() {
    if (typeof pendQ === 'undefined' || !pendQ || !pendQ.ambSnap) return [];
    return pendQ.ambSnap
      .filter(function(amb) { return TIPOS_COM_FIXACAO.indexOf(amb.tipo) !== -1; })
      .map(function(amb) { return { ambId: amb.id, tipo: amb.tipo }; });
  }

  // ─── Aplica a fixação escolhida (tubo ou perfil) + mesma qtd na Instalação ───
  function _fixAplicar(ambId) {
    var st = _stFor(ambId);
    if (!st.tipoFix) return;
    var amb = (typeof ambientes !== 'undefined' ? ambientes : []).find(function(a) { return a.id == ambId; });
    if (!amb) return;
    if (!amb.svState) amb.svState = {};

    var outraK = st.tipoFix === 'tubo' ? 'cant' : 'tubo';
    delete amb.svState[outraK]; // garante que só um dos dois fica marcado
    amb.svState[st.tipoFix] = { qty: st.qtdFix };
    if (amb.svState.inst_tubo) amb.svState.inst_tubo.qty = st.qtdFix;
    else amb.svState.inst_tubo = { qty: st.qtdFix };

    st.aplicouFix = true;
    if (typeof renderAmbientes === 'function') renderAmbientes();
    if (typeof toast === 'function') toast('✓ Fixação aplicada');
    setTimeout(_mostrarPainel, 80);
  }

  // ─── Aplica argamassa AC-3 + cantoneiras do balcão ───
  function _balcaoAplicar(ambId) {
    var st = _stFor(ambId);
    var amb = (typeof ambientes !== 'undefined' ? ambientes : []).find(function(a) { return a.id == ambId; });
    if (!amb) return;
    if (!amb.svState) amb.svState = {};

    amb.svState.balc_ac3 = { qty: 1 };
    amb.svState.cant_balc = { qty: st.qtdCant };

    st.aplicouBalcao = true;
    if (typeof renderAmbientes === 'function') renderAmbientes();
    if (typeof toast === 'function') toast('✓ Balcão aplicado');
    setTimeout(_mostrarPainel, 80);
  }

  function _setTipoFix(ambId, tipo) { _stFor(ambId).tipoFix = tipo; _mostrarPainel(); }
  function _setQtdFix(ambId, delta) { var st = _stFor(ambId); st.qtdFix = Math.max(1, st.qtdFix + delta); _mostrarPainel(); }
  function _setTemBalcao(ambId, val) { _stFor(ambId).temBalcao = val; _mostrarPainel(); }
  function _setQtdCant(ambId, delta) { var st = _stFor(ambId); st.qtdCant = Math.max(1, st.qtdCant + delta); _mostrarPainel(); }

  window._fixSetTipoFix = _setTipoFix;
  window._fixSetQtdFix = _setQtdFix;
  window._fixAplicar = _fixAplicar;
  window._fixSetTemBalcao = _setTemBalcao;
  window._fixSetQtdCant = _setQtdCant;
  window._fixBalcaoAplicar = _balcaoAplicar;

  function _stepper(label, valor, cbMenos, cbMais) {
    return '<div style="display:flex;align-items:center;gap:10px;margin:8px 0;">' +
      '<span style="font-size:.72rem;color:var(--t3);flex:1;">' + label + '</span>' +
      '<button onclick="' + cbMenos + '" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--bd2);background:var(--s1);color:var(--t2);font-weight:700;">−</button>' +
      '<span style="min-width:24px;text-align:center;font-weight:700;color:var(--gold);">' + valor + '</span>' +
      '<button onclick="' + cbMais + '" style="width:30px;height:30px;border-radius:8px;border:1px solid var(--bd2);background:var(--s1);color:var(--t2);font-weight:700;">+</button>' +
      '</div>';
  }

  function _cardHtml(ctx) {
    var st = _stFor(ctx.ambId);
    var lblTubo = _labelDe('tubo', 'Tubo Metálico');
    var lblCant = _labelDe('cant', 'Perfil U chumbado');
    var prTubo = _precoDe('tubo');
    var prCant = _precoDe('cant');

    var h = '<div style="background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:14px;margin-bottom:8px;">';
    h += '<div style="font-size:.72rem;font-weight:700;color:var(--t2);margin-bottom:8px;">' + escH(ctx.tipo) + '</div>';

    // ── Passo 1: Fixação ──
    if (st.aplicouFix) {
      h += '<div style="font-size:.72rem;color:#5dbf7a;margin-bottom:10px;">✓ ' + (st.tipoFix === 'tubo' ? escH(lblTubo) : escH(lblCant)) + ' × ' + st.qtdFix + ' aplicado(s), + Instalação (' + st.qtdFix + ')</div>';
    } else {
      h += '<div style="font-size:.7rem;color:var(--t3);margin-bottom:6px;">Quantos tubos ou perfis chumbados?</div>';
      h += '<div style="display:flex;gap:8px;margin-bottom:6px;">';
      ['tubo', 'cant'].forEach(function(k) {
        var lbl = k === 'tubo' ? lblTubo : lblCant;
        var pr = k === 'tubo' ? prTubo : prCant;
        var ativo = st.tipoFix === k;
        h += '<button onclick="_fixSetTipoFix(' + ctx.ambId + ',\'' + k + '\')" style="flex:1;padding:9px;border-radius:9px;border:1px solid ' + (ativo ? 'var(--gold)' : 'var(--bd2)') + ';background:' + (ativo ? 'rgba(201,168,76,.12)' : 'var(--s1)') + ';color:' + (ativo ? 'var(--gold)' : 'var(--t2)') + ';font-weight:700;font-size:.68rem;">' + escH(lbl) + '<br><span style="font-weight:400;opacity:.7;">R$ ' + fm(pr) + '</span></button>';
      });
      h += '</div>';
      if (st.tipoFix) {
        h += _stepper('Quantidade', st.qtdFix, '_fixSetQtdFix(' + ctx.ambId + ',-1)', '_fixSetQtdFix(' + ctx.ambId + ',1)');
        var prAtual = st.tipoFix === 'tubo' ? prTubo : prCant;
        var prInst = _precoDe('inst_tubo');
        var total = st.qtdFix * prAtual + st.qtdFix * prInst;
        h += '<div style="font-size:.66rem;color:var(--t4);margin-bottom:8px;">Fixação R$ ' + fm(st.qtdFix * prAtual) + ' + Instalação R$ ' + fm(st.qtdFix * prInst) + ' = <b style="color:var(--gold);">R$ ' + fm(total) + '</b></div>';
        h += '<button onclick="_fixAplicar(' + ctx.ambId + ')" style="width:100%;padding:9px;border-radius:9px;border:1px solid var(--gold);background:rgba(201,168,76,.1);color:var(--gold);font-weight:700;font-size:.74rem;">Aplicar Fixação</button>';
      }
    }

    // ── Passo 2: Balcão ──
    h += '<div style="height:1px;background:var(--bd);margin:12px 0;"></div>';
    if (st.aplicouBalcao) {
      h += '<div style="font-size:.72rem;color:#5dbf7a;">✓ Argamassa AC-3 + ' + st.qtdCant + ' cantoneira(s) aplicado(s)</div>';
    } else if (st.temBalcao === false) {
      h += '<div style="font-size:.68rem;color:var(--t4);">Sem balcão nesse ambiente.</div>';
    } else {
      h += '<div style="font-size:.7rem;color:var(--t3);margin-bottom:6px;">Tem balcão nesse ambiente?</div>';
      h += '<div style="display:flex;gap:8px;">';
      h += '<button onclick="_fixSetTemBalcao(' + ctx.ambId + ',true)" style="flex:1;padding:9px;border-radius:9px;border:1px solid ' + (st.temBalcao === true ? 'var(--gold)' : 'var(--bd2)') + ';background:' + (st.temBalcao === true ? 'rgba(201,168,76,.12)' : 'var(--s1)') + ';color:' + (st.temBalcao === true ? 'var(--gold)' : 'var(--t2)') + ';font-weight:700;font-size:.72rem;">Sim</button>';
      h += '<button onclick="_fixSetTemBalcao(' + ctx.ambId + ',false)" style="flex:1;padding:9px;border-radius:9px;border:1px solid var(--bd2);background:var(--s1);color:var(--t2);font-weight:700;font-size:.72rem;">Não</button>';
      h += '</div>';
      if (st.temBalcao === true) {
        h += '<div style="font-size:.66rem;color:var(--t4);margin-top:8px;">Argamassa AC-3: R$ ' + fm(PRECO_AC3_BALCAO) + ' (fixo)</div>';
        h += _stepper('Quantas cantoneiras (R$ ' + fm(PRECO_CANT_BALCAO) + ' cada)', st.qtdCant, '_fixSetQtdCant(' + ctx.ambId + ',-1)', '_fixSetQtdCant(' + ctx.ambId + ',1)');
        var totalBalc = PRECO_AC3_BALCAO + st.qtdCant * PRECO_CANT_BALCAO;
        h += '<div style="font-size:.66rem;color:var(--t4);margin-bottom:8px;">Total balcão: <b style="color:var(--gold);">R$ ' + fm(totalBalc) + '</b></div>';
        h += '<button onclick="_fixBalcaoAplicar(' + ctx.ambId + ')" style="width:100%;padding:9px;border-radius:9px;border:1px solid var(--gold);background:rgba(201,168,76,.1);color:var(--gold);font-weight:700;font-size:.74rem;">Aplicar Balcão</button>';
      }
    }

    h += '</div>';
    return h;
  }

  function _mostrarPainel() {
    var resArea = document.getElementById('resArea');
    if (!resArea) return;
    var ctxs = _contextos();
    if (!ctxs.length) return;

    var sec = document.getElementById('fixConsultorSec');
    if (!sec) {
      sec = document.createElement('div');
      sec.id = 'fixConsultorSec';
      sec.className = 'sec mt';
      sec.innerHTML = '<div class="sl">🧠 Consultor de Fixação</div><div id="fixPainel"></div>';
      resArea.appendChild(sec);
    }
    var el = document.getElementById('fixPainel');
    el.innerHTML = ctxs.map(_cardHtml).join('');
  }

  // ─── Hook não-invasivo, junto dos outros consultores ──
  (function() {
    var _origMostrarConsultor = window._cliMostrarConsultor;
    if (typeof _origMostrarConsultor === 'function') {
      window._cliMostrarConsultor = function(q) {
        _origMostrarConsultor(q);
        setTimeout(_mostrarPainel, 70);
      };
    }
  })();

  function init() { _prepararItensBalcao(); }
  if (typeof SV_DEFS !== 'undefined') init();
  else document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 300);
})();
