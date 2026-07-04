// ══════════════════════════════════════════════════════════
// 🧠 CONSULTOR DE INSTALAÇÃO (IA) — HR Mármores e Granitos
// Sugere um valor JUSTO de mão de obra/instalação por serviço,
// escalando com tamanho (m²) e complexidade (acabamentos/recortes),
// usando o histórico real de orçamentos (DB.q) como base.
//
// Não altera nenhum arquivo existente. Basta incluir este script
// depois de app-orcamento.js no index.html:
//   <script src="app-instalacao-ia.js"></script>
// ══════════════════════════════════════════════════════════

// ─── Tabela base editável (fallback local, sem IA) ───
// Valores de referência por faixa de tamanho: [Pequeno, Médio, Grande, Gigante]
var INST_TIERS = [
  { max: 1.5, label: 'Pequeno' },
  { max: 3.5, label: 'Médio' },
  { max: 6.0, label: 'Grande' },
  { max: Infinity, label: 'Gigante' }
];
var INST_BASE = {
  'Cozinha':       [380, 620, 900, 1350],
  'Banheiro':      [180, 280, 420, 650],
  'Lavabo':        [180, 280, 420, 650],
  'Área Externa':  [300, 500, 750, 1100],
  'default':       [250, 420, 650, 950]
};
var INST_POR_DETALHE = 22; // R$ extra por acabamento/recorte além do padrão de 3

function _instTierIdx(m2) {
  for (var i = 0; i < INST_TIERS.length; i++) if (m2 <= INST_TIERS[i].max) return i;
  return INST_TIERS.length - 1;
}

// ─── Minerar histórico (DB.q) por tipo de ambiente ───
// Considera só orçamentos de ambiente único (tipo sem "+") pra não misturar dados.
function _instHistorico(tipo) {
  var qs = (window.DB && DB.q) ? DB.q : [];
  var mesmoTipo = qs.filter(function(q) {
    return q.tipo === tipo && q.m2 > 0 && q.vista > 0 && q.tipo.indexOf('+') === -1;
  });
  if (!mesmoTipo.length) return null;

  var pontos = mesmoTipo.map(function(q) {
    var margem = q.vista - (q._custoPainel || q.matCusto || 0);
    return { m2: q.m2, margem: margem, margemM2: margem / q.m2, vista: q.vista, date: q.date };
  }).filter(function(p) { return p.margemM2 > 0 && isFinite(p.margemM2); });

  if (!pontos.length) return null;

  var soma = 0, min = Infinity, max = -Infinity;
  pontos.forEach(function(p) {
    soma += p.margemM2;
    if (p.margemM2 < min) min = p.margemM2;
    if (p.margemM2 > max) max = p.margemM2;
  });
  var media = soma / pontos.length;

  // 3 exemplos mais próximos em m² do serviço atual (preenchido depois)
  return { n: pontos.length, mediaM2: media, min: min, max: max, pontos: pontos };
}

// ─── Cálculo local (fallback, sem chave de API) ───
function _instCalcLocal(tipo, m2, numDetalhes) {
  var idx = _instTierIdx(m2 || 0);
  var tabela = INST_BASE[tipo] || INST_BASE['default'];
  var base = tabela[idx];
  var extra = Math.max(0, (numDetalhes || 0) - 3) * INST_POR_DETALHE;
  var valor = base + extra;

  var hist = _instHistorico(tipo);
  var faixaMin = Math.round(valor * 0.85);
  var faixaMax = Math.round(valor * 1.25);
  var justificativa = 'Cálculo local por faixa de tamanho (' + INST_TIERS[idx].label + ', ' + (m2 || 0).toFixed(2) + 'm²)' +
    (numDetalhes > 3 ? ' + ' + (numDetalhes - 3) + ' detalhe(s) extra(s)' : '') + '.';

  if (hist && hist.n >= 3) {
    var histValor = hist.mediaM2 * (m2 || 0);
    valor = Math.round((valor * 0.5) + (histValor * 0.5));
    faixaMin = Math.round(hist.min * (m2 || 0));
    faixaMax = Math.round(hist.max * (m2 || 0));
    justificativa += ' Ajustado com base em ' + hist.n + ' orçamento(s) parecido(s) no histórico (margem média R$ ' +
      hist.mediaM2.toFixed(0) + '/m²).';
  }

  return {
    valorInstalacao: Math.max(0, Math.round(valor)),
    faixaMin: Math.max(0, faixaMin),
    faixaMax: Math.max(0, faixaMax),
    justificativa: justificativa,
    nivelConfianca: hist && hist.n >= 5 ? 'alto' : hist && hist.n >= 2 ? 'medio' : 'baixo',
    fonte: 'local'
  };
}

// ─── Sugestão via IA (Groq), com fallback local automático ───
function _instFetchIA(ctx, cb) {
  var key = CFG && CFG.emp && CFG.emp.apiKey;
  var local = _instCalcLocal(ctx.tipo, ctx.m2, ctx.numDetalhes);
  if (!key) { cb(local); return; }

  var hist = _instHistorico(ctx.tipo);
  var histTxt = hist
    ? hist.n + ' orçamento(s) de ' + ctx.tipo + ' no histórico — margem de mão de obra média R$ ' +
      hist.mediaM2.toFixed(0) + '/m² (faixa R$ ' + hist.min.toFixed(0) + ' a R$ ' + hist.max.toFixed(0) + '/m²).'
    : 'Sem histórico suficiente ainda para ' + ctx.tipo + '.';

  var prompt = 'Você é consultor de precificação de mão de obra de uma marmoraria brasileira (HR Mármores e Granitos).\n' +
    'O preço da pedra já é cobrado à parte — preciso SOMENTE do valor justo de instalação/mão de obra deste serviço.\n\n' +
    'Serviço atual: ' + ctx.tipo + '\n' +
    'Tamanho: ' + (ctx.m2 || 0).toFixed(2) + ' m² (' + (ctx.numPecas || 1) + ' peça(s))\n' +
    'Detalhes/acabamentos/recortes: ' + (ctx.numDetalhes || 0) + '\n' +
    'Histórico: ' + histTxt + '\n' +
    'Cálculo local de referência sugeriu R$ ' + local.valorInstalacao + '.\n\n' +
    'Regra: quanto maior o serviço e quanto mais detalhes, maior o valor de mão de obra — nunca cobre pouco por um serviço grande nem caro demais por um pequeno.\n' +
    'Responda SOMENTE JSON sem markdown:\n' +
    '{"valorInstalacao":number,"faixaMin":number,"faixaMax":number,"justificativa":"1-2 frases com números reais do contexto","nivelConfianca":"alto|medio|baixo"}';

  var controller = window.AbortController ? new AbortController() : null;
  var tid = controller ? setTimeout(function() { controller.abort(); }, 18000) : null;

  fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: controller ? controller.signal : undefined,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 300,
      messages: [
        { role: 'system', content: 'Você é consultor de precificação de mão de obra de marmoraria. Responda SOMENTE JSON válido, sem markdown, sem texto fora do JSON.' },
        { role: 'user', content: prompt }
      ]
    })
  })
  .then(function(r) { if (tid) clearTimeout(tid); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
  .then(function(d) {
    var text = (d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '';
    var clean = text.replace(/```json[\s\S]*?```|```/g, '').trim();
    var match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('no_json');
    var ai = JSON.parse(match[0]);
    ai.fonte = 'ia';
    cb(ai);
  })
  .catch(function(e) {
    if (tid) clearTimeout(tid);
    console.warn('_instFetchIA fallback local:', e.message);
    cb(local);
  });
}

// ─── Contexto do serviço atual, a partir do orçamento calculado (pendQ) ───
function _instContextoDePendQ() {
  if (typeof pendQ === 'undefined' || !pendQ) return null;
  var q = pendQ;
  var numDetalhes = (q.acN || []).length + (q.pds || []).length;
  return {
    tipo: q.tipo && q.tipo.indexOf('+') === -1 ? q.tipo : (q.ambSnap && q.ambSnap[0] ? q.ambSnap[0].tipo : 'Cozinha'),
    m2: q.m2 || 0,
    numPecas: (q.pds || []).length || 1,
    numDetalhes: numDetalhes
  };
}

// ─── UI: painel dentro de #resArea, ao lado do Consultor de Desconto ───
function _instMostrarPainel() {
  var resArea = document.getElementById('resArea');
  if (!resArea) return;
  var ctx = _instContextoDePendQ();
  if (!ctx) return;

  var sec = document.getElementById('instConsultorSec');
  if (!sec) {
    sec = document.createElement('div');
    sec.id = 'instConsultorSec';
    sec.className = 'sec mt';
    sec.innerHTML = '<div class="sl" style="display:flex;justify-content:space-between;align-items:center;">' +
      '<span>🧠 Consultor de Instalação</span>' +
      '<span style="font-size:.6rem;color:var(--t4);font-weight:400;">Mão de obra sugerida</span>' +
      '</div>' +
      '<div id="instPainel" style="background:var(--s1);border:1px solid var(--bd);border-radius:14px;overflow:hidden;"></div>';
    resArea.appendChild(sec);
  }

  var el = document.getElementById('instPainel');
  el.innerHTML = '<div style="padding:22px 18px;display:flex;align-items:center;gap:12px;">' +
    '<span style="font-size:1.4rem;">🧠</span>' +
    '<div><div style="font-size:.82rem;font-weight:700;color:var(--gold2);">Calculando valor de instalação...</div></div></div>';

  _instFetchIA(ctx, function(res) { _instDesenhar(ctx, res); });
}

function _instDesenhar(ctx, res) {
  var el = document.getElementById('instPainel');
  if (!el) return;
  var fonteTxt = res.fonte === 'ia' ? 'IA · Groq' : 'cálculo local';
  var corFonte = res.fonte === 'ia' ? '#5dbf7a' : 'var(--t4)';

  var h = '<div style="padding:14px 14px 12px;">';
  h += '<div style="text-align:right;margin-bottom:6px;">' +
    '<span style="font-size:.56rem;background:rgba(255,255,255,.05);border:1px solid var(--bd2);border-radius:6px;padding:2px 7px;color:' + corFonte + ';font-weight:600;">' + fonteTxt + '</span></div>';

  h += '<div style="display:flex;align-items:baseline;gap:8px;margin-bottom:6px;">' +
    '<span style="font-size:1.5rem;font-weight:800;color:var(--gold);">R$ ' + fm(res.valorInstalacao) + '</span>' +
    '<span style="font-size:.68rem;color:var(--t4);">faixa R$ ' + fm(res.faixaMin) + ' – R$ ' + fm(res.faixaMax) + '</span></div>';

  h += '<div style="font-size:.72rem;color:var(--t3);line-height:1.4;margin-bottom:12px;">' + escH(res.justificativa || '') + '</div>';

  h += '<div style="display:flex;gap:8px;">' +
    '<button onclick="_instAdicionarObs(' + res.valorInstalacao + ')" style="flex:1;padding:9px;border-radius:9px;border:1px solid var(--gold);background:rgba(201,168,76,.1);color:var(--gold);font-weight:700;font-size:.74rem;">+ Adicionar à observação</button>' +
    '<button onclick="_instMostrarPainel()" style="padding:9px 12px;border-radius:9px;border:1px solid var(--bd2);background:transparent;color:var(--t3);font-size:.74rem;">↻ Recalcular</button>' +
    '</div></div>';

  el.innerHTML = h;
}

function _instAdicionarObs(valor) {
  var obs = document.getElementById('oObs');
  if (!obs) { toast && toast('Campo de observação não encontrado'); return; }
  var linha = 'Mão de obra/instalação sugerida (IA): R$ ' + fm(valor);
  obs.value = obs.value ? (obs.value + '\n' + linha) : linha;
  toast && toast('✓ Adicionado às observações');
}

// ─── Hook não-invasivo: aparece automaticamente após "Calcular Orçamento" ───
// (a mesma tela onde já aparece o Consultor de Desconto)
(function() {
  var _origMostrarConsultor = window._cliMostrarConsultor;
  if (typeof _origMostrarConsultor === 'function') {
    window._cliMostrarConsultor = function(q) {
      _origMostrarConsultor(q);
      setTimeout(_instMostrarPainel, 50);
    };
  }
})();
