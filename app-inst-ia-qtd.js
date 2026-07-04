// ══════════════════════════════════════════════════════════
// 🧠 CONSULTOR DE QUANTIDADE (IA) — Tubos & Cantoneiras
// HR Mármores e Granitos
//
// Depois de "Calcular Orçamento", mostra um cartão por ambiente que
// SUGERE a quantidade de tubos (Cozinha/Banheiro/Lavabo/Túmulo/Capela)
// ou de cantoneiras (Balcão), calculada a partir do tamanho da peça —
// e um botão "Usar sugestão" que já preenche o campo de quantidade.
//
// Não obriga nada: é só uma sugestão. O vendedor pode ajustar o
// número manualmente depois, normalmente.
//
// Preços:
//   - Tubos (Cozinha/Banheiro/Lavabo/Outro): CFG.sv.inst_tubo
//   - Tubos (Túmulo): CFG.sv.tum_tubo   |  Tubos (Capela): CFG.sv.cap_tubo
//   - Cantoneiras (Balcão): CFG.sv.cant_balc — R$ 50/un (novo, separado
//     do 'cant' usado em Fachada, pra não mudar preço de outro ambiente)
//   Todos editáveis em Configurações → Serviços.
//
// Argamassa AC-3 (Balcão): continua sendo o item fixo "Instalação c/
// Argamassa AC-3" (checkbox), este painel só mostra como lembrete —
// não mexe no valor dela.
//
// Requer que app-inst-tubo-fix.js já tenha rodado (pra existirem os
// campos 'inst_tubo' / 'tum_tubo' / 'cap_tubo'). Carregar DEPOIS de
// app-core.js e de app-inst-tubo-fix.js:
//   <script src="app-inst-ia-qtd.js?v=1"></script>
// ══════════════════════════════════════════════════════════

(function() {
  'use strict';

  var PRECO_CANT_BALCAO = 50;
  var PRECO_AC3_BALCAO = 50;

  // ── Renomeia cantoneira e argamassa AC-3 do Balcão pra terem preço
  //     próprio, sem mexer no 'inst'/'cant' usados em outros ambientes ──
  function _prepararBalcao() {
    var grupos = SV_DEFS['🍽️ Balcão'];
    if (!grupos) return;
    grupos.forEach(function(grp) {
      grp.its.forEach(function(it) {
        if (it.k === 'cant') it.k = 'cant_balc';
        if (it.k === 'inst' && /AC-?3/i.test(it.l || '')) it.k = 'balc_ac3';
      });
    });
    if (window.CFG) {
      if (!CFG.sv) CFG.sv = {};
      if (CFG.sv.cant_balc === undefined || CFG.sv.cant_balc === null) CFG.sv.cant_balc = PRECO_CANT_BALCAO;
      CFG.sv.balc_ac3 = PRECO_AC3_BALCAO; // preço fixo pedido: R$ 50
      if (!CFG.svList) CFG.svList = [];
      if (!CFG.svList.find(function(x) { return x.k === 'cant_balc'; })) {
        CFG.svList.push({ k: 'cant_balc', l: 'Cantoneira p/ Balcão', preco: CFG.sv.cant_balc, grp: 'Balcão', u: 'un' });
        svCFG();
      }
      var _ac3Item = CFG.svList.find(function(x) { return x.k === 'balc_ac3'; });
      if (!_ac3Item) {
        CFG.svList.push({ k: 'balc_ac3', l: 'Instalação c/ Argamassa AC-3', preco: PRECO_AC3_BALCAO, grp: 'Balcão', u: 'un' });
        svCFG();
      } else if (_ac3Item.preco !== PRECO_AC3_BALCAO) {
        _ac3Item.preco = PRECO_AC3_BALCAO;
        svCFG();
      }
    }
  }

  // ── Mede m² e ml (comprimento) a partir das peças do ambiente ──
  function _medidas(pecas) {
    var m2 = 0, ml = 0, n = 0;
    (pecas || []).forEach(function(p) {
      var w = +p.w || 0, h = +p.h || 0, q = +p.q || 1;
      m2 += (w / 100) * (h / 100) * q;
      ml += (w / 100) * q;
      n += q;
    });
    return { m2: m2, ml: ml, n: n || 1 };
  }

  // ── Heurística local: quantos tubos (suporte de fixação) ──
  // Regra: mínimo 2 tubos por peça de bancada; +1 tubo a cada 0,8m²
  // adicional (peça maior = mais pontos de apoio necessários).
  function _sugerirTubos(m) {
    var base = 2;
    var extra = Math.max(0, Math.ceil((m.m2 - 0.8) / 0.8));
    var qtd = base + extra + Math.max(0, m.n - 1);
    return Math.max(2, qtd);
  }

  // ── Heurística local: quantas cantoneiras no Balcão ──
  // Regra: 1 cantoneira a cada 0,5m de comprimento, mínimo 2.
  function _sugerirCantoneiras(m) {
    var qtd = Math.ceil(m.ml / 0.5);
    return Math.max(2, qtd);
  }

  function _contextosPorAmbiente() {
    if (typeof pendQ === 'undefined' || !pendQ || !pendQ.ambSnap) return [];
    return pendQ.ambSnap.map(function(amb) {
      return { ambId: amb.id, tipo: amb.tipo, pecas: amb.pecas || [] };
    });
  }

  function _chaveTuboPorTipo(tipo) {
    if (tipo === 'Túmulo' || tipo === 'Tumulo') return { k: 'tum_tubo', label: 'tubos' };
    if (tipo === '⛪ Capela' || tipo === 'Capela') return { k: 'cap_tubo', label: 'tubos' };
    if (tipo === 'Cozinha' || tipo === 'Banheiro' || tipo === 'Lavabo' || tipo === 'Outro') return { k: 'inst_tubo', label: 'tubos' };
    if (tipo === '🍽️ Balcão') return { k: 'cant_balc', label: 'cantoneiras' };
    return null;
  }

  function _iaAplicarQtd(ambId, k, qtd) {
    var amb = (typeof ambientes !== 'undefined' ? ambientes : []).find(function(a) { return a.id == ambId; });
    if (!amb) return;
    if (!amb.svState) amb.svState = {};
    if (!amb.svState[k]) amb.svState[k] = { ml: 0, altCm: 6, q: 1, qty: qtd };
    else amb.svState[k].qty = qtd;
    if (typeof renderAmbientes === 'function') renderAmbientes();
    if (typeof toast === 'function') toast('✓ Quantidade aplicada');
    setTimeout(_qtdMostrarPainel, 80); // re-renderiza o painel com o novo estado
  }
  window._iaAplicarQtd = _iaAplicarQtd;

  function _qtdMostrarPainel() {
    var resArea = document.getElementById('resArea');
    if (!resArea) return;
    var ctxs = _contextosPorAmbiente();
    if (!ctxs.length) return;

    var linhas = [];
    ctxs.forEach(function(ctx) {
      var chave = _chaveTuboPorTipo(ctx.tipo);
      if (!chave) return;
      var m = _medidas(ctx.pecas);
      var qtd = chave.k === 'cant_balc' ? _sugerirCantoneiras(m) : _sugerirTubos(m);
      var pr = (window.CFG && CFG.sv && CFG.sv[chave.k]) || 0;
      var justificativa = chave.k === 'cant_balc'
        ? m.ml.toFixed(2) + 'ml de balcão → ~1 cantoneira a cada 0,5m'
        : m.m2.toFixed(2) + 'm² (' + m.n + ' peça(s)) → mínimo 2 + reforço por tamanho';
      linhas.push({ amb: ctx, chave: chave, qtd: qtd, pr: pr, justificativa: justificativa });
    });
    if (!linhas.length) return;

    var sec = document.getElementById('qtdConsultorSec');
    if (!sec) {
      sec = document.createElement('div');
      sec.id = 'qtdConsultorSec';
      sec.className = 'sec mt';
      sec.innerHTML = '<div class="sl">🧠 Consultor de Quantidade</div><div id="qtdPainel"></div>';
      resArea.appendChild(sec);
    }
    var el = document.getElementById('qtdPainel');
    el.innerHTML = linhas.map(function(L, i) {
      var total = L.qtd * L.pr;
      var argamassaNota = L.amb.tipo === '🍽️ Balcão'
        ? '<div style="font-size:.62rem;color:var(--t4);margin-top:4px;">ℹ️ Lembrete: Argamassa AC-3 é cobrada à parte, no checkbox de Instalação.</div>'
        : '';
      return '<div style="background:var(--s1);border:1px solid var(--bd);border-radius:14px;padding:14px;margin-bottom:8px;">'
        + '<div style="font-size:.72rem;font-weight:700;color:var(--t2);margin-bottom:4px;">' + escH(L.amb.tipo) + '</div>'
        + '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:4px;">'
        + '<span style="font-size:1.3rem;font-weight:800;color:var(--gold);">' + L.qtd + ' ' + escH(L.chave.label) + '</span>'
        + (L.pr > 0 ? '<span style="font-size:.68rem;color:var(--t4);">× R$ ' + fm(L.pr) + ' = R$ ' + fm(total) + '</span>' : '')
        + '</div>'
        + '<div style="font-size:.68rem;color:var(--t3);margin-bottom:10px;">' + escH(L.justificativa) + '</div>'
        + argamassaNota
        + '<button onclick="_iaAplicarQtd(' + L.amb.ambId + ',\'' + L.chave.k + '\',' + L.qtd + ')" style="width:100%;margin-top:8px;padding:9px;border-radius:9px;border:1px solid var(--gold);background:rgba(201,168,76,.1);color:var(--gold);font-weight:700;font-size:.74rem;">Usar sugestão (' + L.qtd + ')</button>'
        + '</div>';
    }).join('');
  }

  // ── Hook não-invasivo, junto do Consultor de Instalação ──
  (function() {
    var _origMostrarConsultor = window._cliMostrarConsultor;
    if (typeof _origMostrarConsultor === 'function') {
      window._cliMostrarConsultor = function(q) {
        _origMostrarConsultor(q);
        setTimeout(_qtdMostrarPainel, 60);
      };
    }
  })();

  function init() {
    _prepararBalcao();
  }
  if (typeof SV_DEFS !== 'undefined') init();
  else document.addEventListener('DOMContentLoaded', init);
  setTimeout(init, 300);
})();
