// ══════════════════════════════════════════════════════════════════════
// MÓDULO ESTOQUE DE CHAPAS
// HR Mármores e Granitos ERP
// Controla quanto material você tem disponível por chapa/acabamento,
// alimentado por importação de nota fiscal de compra (foto → IA) e
// consumido automaticamente quando um orçamento é fechado. Bloqueia o
// fechamento de orçamento se o estoque não cobrir o m² necessário, até
// você confirmar que está ciente do problema.
// ══════════════════════════════════════════════════════════════════════

var EST = { itens: [] };

function _estLoad() {
  try {
    EST.itens = JSON.parse(localStorage.getItem('hr_estoque') || '[]');
  } catch (e) {
    console.error('[estoque] Erro ao carregar hr_estoque:', e);
    EST.itens = [];
  }
}
_estLoad();

function _estSalvar() {
  try {
    localStorage.setItem('hr_estoque', JSON.stringify(EST.itens));
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22 || e.code === 1014)) {
      // Estoque não guarda fotos nem históricos longos — se estourar aqui é
      // porque o localStorage já está cheio de outra coisa. Avisa em vez de
      // perder o lançamento silenciosamente.
      toast('🔴 Armazenamento cheio — não deu pra salvar o estoque. Veja Config → Diagnóstico.');
      console.error('[estoque] QuotaExceededError ao salvar hr_estoque:', e);
    } else {
      console.error('[estoque] Erro ao salvar hr_estoque:', e);
    }
  }
}

// Normaliza nome de material pra comparação (sem acento, minúsculo, sem espaço duplo)
function _estNorm(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Busca um item de estoque pelo nome do material (+ acabamento opcional).
// Faz match por substring nos dois sentidos, igual ao matching de material
// já usado em aiInterpretarFoto, pra ficar consistente com o resto do app.
function estBuscar(materialNome, acabamento) {
  var mn = _estNorm(materialNome);
  var ac = acabamento ? _estNorm(acabamento) : null;
  if (!mn) return null;
  var candidatos = EST.itens.filter(function (it) {
    var itn = _estNorm(it.material);
    return itn.indexOf(mn) >= 0 || mn.indexOf(itn) >= 0;
  });
  if (ac && candidatos.length > 1) {
    var comAcab = candidatos.find(function (it) { return _estNorm(it.acabamento) === ac; });
    if (comAcab) return comAcab;
  }
  return candidatos[0] || null;
}

// Adiciona (ou soma em) estoque existente. Usado pela importação de nota e
// pelo lançamento manual.
function estAdicionar(dados) {
  // dados: {material, acabamento, m2, custoUnit, origem}
  if (!dados || !dados.material || !dados.m2) return null;
  var item = estBuscar(dados.material, dados.acabamento);
  if (item) {
    item.m2Total = +(item.m2Total || 0) + +dados.m2;
    item.m2Disponivel = +(item.m2Disponivel || 0) + +dados.m2;
    if (dados.custoUnit) item.custoUltimo = +dados.custoUnit;
    item.ultimaCompra = td();
    if (dados.origem) {
      item.historico = item.historico || [];
      item.historico.unshift({ data: td(), m2: +dados.m2, origem: dados.origem });
      if (item.historico.length > 20) item.historico.length = 20; // não deixa crescer sem limite
    }
  } else {
    item = {
      id: Date.now() + Math.random(),
      material: dados.material,
      acabamento: dados.acabamento || '',
      m2Total: +dados.m2,
      m2Disponivel: +dados.m2,
      custoUltimo: +(dados.custoUnit || 0),
      ultimaCompra: td(),
      historico: dados.origem ? [{ data: td(), m2: +dados.m2, origem: dados.origem }] : []
    };
    EST.itens.push(item);
  }
  _estSalvar();
  return item;
}

// Consome estoque (chamado quando um orçamento é fechado). Não bloqueia —
// quem bloqueia é estVerificar, chamado ANTES desta função no fluxo de
// fechamento. Permite ficar negativo (fica visível como alerta) em vez de
// travar silenciosamente o desconto.
function estConsumir(materialNome, m2) {
  var item = estBuscar(materialNome);
  if (!item) return;
  item.m2Disponivel = +(item.m2Disponivel || 0) - +m2;
  _estSalvar();
}

// Threshold de "estoque baixo" configurável em CFG.emp, com padrão de 5m².
function _estLimiteAviso() {
  return (CFG && CFG.emp && CFG.emp.estoqueAvisoM2) || 5;
}

// Verifica se há estoque suficiente para um m² necessário.
// Retorna {status: 'ok'|'baixo'|'insuficiente'|'zero', disponivel, item}
function estVerificar(materialNome, m2Necessario) {
  var item = estBuscar(materialNome);
  if (!item || !item.m2Disponivel || item.m2Disponivel <= 0) {
    return { status: 'zero', disponivel: item ? item.m2Disponivel : 0, item: item };
  }
  if (item.m2Disponivel < m2Necessario) {
    return { status: 'insuficiente', disponivel: item.m2Disponivel, item: item };
  }
  if (item.m2Disponivel - m2Necessario < _estLimiteAviso()) {
    return { status: 'baixo', disponivel: item.m2Disponivel, item: item };
  }
  return { status: 'ok', disponivel: item.m2Disponivel, item: item };
}

// Monta a mensagem do confirm() bloqueante usado em calcular() no momento
// de fechar o orçamento. Retorna true (OK) = "estou ciente, continuar";
// false (Cancelar) = volta pra revisar.
function estMsgBloqueio(check, materialNome, m2Necessario) {
  var disp = (check.disponivel || 0).toFixed(2);
  var precisa = m2Necessario.toFixed(2);
  if (check.status === 'zero') {
    return '🔴 ESTOQUE\n\nNão há registro de estoque para "' + materialNome + '".\n\nToque OK para continuar mesmo assim, ou Cancelar para revisar.';
  }
  if (check.status === 'insuficiente') {
    return '🔴 ESTOQUE INSUFICIENTE\n\n"' + materialNome + '": disponível ' + disp + ' m², este orçamento precisa de ' + precisa + ' m².\n\nToque OK para continuar mesmo assim, ou Cancelar para revisar.';
  }
  if (check.status === 'baixo') {
    return '🟡 ESTOQUE BAIXO\n\n"' + materialNome + '": disponível ' + disp + ' m². Depois deste orçamento restará ' + (check.disponivel - m2Necessario).toFixed(2) + ' m².\n\nToque OK para continuar, ou Cancelar para revisar.';
  }
  return 'Estoque insuficiente. Continuar mesmo assim?';
}


// Extrai fornecedor, itens (material/acabamento/m²/valor) e parcelas.
// Ao confirmar: cria boletos a pagar (DB.b) para as parcelas e soma no
// estoque cada item da nota.
// ══════════════════════════════════════════════════════════════════════
var _estImportPreview = null;
var _estImportBase64 = null;
var _estImportMime = 'image/jpeg';

function estAbrirImportar() {
  var inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = 'image/*';
  inp.onchange = function (e) {
    var file = e.target.files && e.target.files[0];
    if (file) estProcessarArquivo(file);
  };
  inp.click();
}

function estProcessarArquivo(file) {
  toast('⏳ Lendo nota fiscal...');
  var reader = new FileReader();
  reader.onload = function (evt) {
    var img = new Image();
    img.onload = function () {
      var canvas = document.createElement('canvas');
      var maxDim = 1600;
      var scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      var dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      _estImportBase64 = dataUrl.split(',')[1];
      _estImportMime = 'image/jpeg';
      estChamarIA();
    };
    img.src = evt.target.result;
  };
  reader.readAsDataURL(file);
}

function estChamarIA() {
  var key = (CFG.emp && CFG.emp.apiKey) || '';
  if (!key) {
    toast('⚠️ Configure sua API Key da Anthropic em Config → Empresa antes de importar.');
    return;
  }
  var prompt =
    'Esta imagem é uma nota fiscal de compra de chapas de mármore/granito de um fornecedor. ' +
    'Extraia os dados e responda APENAS com um JSON válido, sem texto fora dele, no formato:\n' +
    '{\n' +
    '  "fornecedor": "nome do fornecedor ou nome fantasia",\n' +
    '  "numeroNota": "número da nota",\n' +
    '  "itens": [\n' +
    '    {"material": "nome do material (ex: Preto Sao Gabriel)", "acabamento": "Polido/Escovado/outro", "m2": 0.0, "valorUnitario": 0.0, "valorTotal": 0.0}\n' +
    '  ],\n' +
    '  "parcelas": [\n' +
    '    {"valor": 0.0, "vencimento": "AAAA-MM-DD"}\n' +
    '  ],\n' +
    '  "valorTotalMercadorias": 0.0,\n' +
    '  "frete": 0.0,\n' +
    '  "icms": 0.0,\n' +
    '  "valorTotalGeral": 0.0\n' +
    '}\n' +
    'Se a nota tiver uma tabela "DESDOBRAMENTO DAS PARCELAS" com dias (ex: 30/60/90/120) e uma tabela de parcelas com número, valor e vencimento, use essa tabela de parcelas. ' +
    'Se houver frete e ICMS separados no rodapé (ex: "Frete: ... Total: ..."), inclua-os. ' +
    'Datas sempre em formato AAAA-MM-DD. Se não conseguir ler algum campo, deixe vazio ou 0, não invente valores.';

  var body = JSON.stringify({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: _estImportMime, data: _estImportBase64 } },
        { type: 'text', text: prompt }
      ]
    }]
  });

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: body
  })
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data.error) throw { _apiErr: data.error.message || 'Erro na API' };
      var txt = (data.content && data.content[0] && data.content[0].text) || '';
      txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      var parsed;
      try { parsed = JSON.parse(txt); }
      catch (e) {
        toast('❌ Não consegui ler a nota. Tente uma foto mais nítida, bem enquadrada.');
        return;
      }
      _estImportPreview = parsed;
      estMostrarPreview(parsed);
    })
    .catch(function (e) {
      toast('❌ ' + (e && e._apiErr ? e._apiErr : 'Erro ao ler a nota — sem conexão ou chave inválida.'));
      console.error('[estoque] estChamarIA:', e);
    });
}

function estMostrarPreview(parsed) {
  var overlay = document.createElement('div');
  overlay.id = 'estPreviewOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--s1,#161620);border:1px solid var(--bd2,#333);border-radius:14px;padding:18px;max-width:480px;width:100%;max-height:85vh;overflow:auto;';

  var h = '<div style="font-size:.85rem;font-weight:700;color:var(--gold2,#c9a84c);margin-bottom:12px;">📦 Nota importada — confira antes de salvar</div>';
  h += '<div style="font-size:.68rem;color:var(--t3,#999);margin-bottom:10px;">Fornecedor: <b>' + (parsed.fornecedor || '(não identificado)').replace(/</g, '&lt;') + '</b>' + (parsed.numeroNota ? ' · Nota ' + parsed.numeroNota.replace(/</g, '&lt;') : '') + '</div>';

  h += '<div style="font-size:.65rem;font-weight:700;color:var(--t3,#999);text-transform:uppercase;letter-spacing:1px;margin:10px 0 6px;">Itens (vão para o estoque)</div>';
  (parsed.itens || []).forEach(function (it, i) {
    h += '<div style="background:var(--s2,#1e1e2a);border-radius:8px;padding:8px 10px;margin-bottom:6px;font-size:.68rem;">';
    h += '<div><b>' + (it.material || '?').replace(/</g, '&lt;') + '</b>' + (it.acabamento ? ' — ' + it.acabamento.replace(/</g, '&lt;') : '') + '</div>';
    h += '<div style="color:var(--t3,#999);">' + (it.m2 || 0) + ' m² · R$ ' + (it.valorUnitario || 0).toFixed(2) + '/m² · Total R$ ' + (it.valorTotal || 0).toFixed(2) + '</div>';
    h += '</div>';
  });
  if (!(parsed.itens || []).length) h += '<div style="font-size:.65rem;color:var(--t4,#666);">Nenhum item reconhecido.</div>';

  h += '<div style="font-size:.65rem;font-weight:700;color:var(--t3,#999);text-transform:uppercase;letter-spacing:1px;margin:12px 0 6px;">Parcelas (viram boletos a pagar)</div>';
  (parsed.parcelas || []).forEach(function (p, i) {
    h += '<div style="display:flex;justify-content:space-between;font-size:.68rem;padding:5px 0;border-bottom:1px solid var(--bd,#2a2a35);">';
    h += '<span>Venc. ' + (p.vencimento || '?') + '</span><b>R$ ' + (p.valor || 0).toFixed(2) + '</b></div>';
  });
  if (!(parsed.parcelas || []).length) h += '<div style="font-size:.65rem;color:var(--t4,#666);">Nenhuma parcela reconhecida.</div>';

  h += '<div style="display:flex;gap:10px;margin-top:16px;">';
  h += '<button id="estPreviewCancelar" style="flex:1;padding:10px;border-radius:8px;border:1px solid var(--bd2,#333);background:transparent;color:var(--t2,#ccc);font-size:.72rem;">Cancelar</button>';
  h += '<button id="estPreviewConfirmar" style="flex:1;padding:10px;border-radius:8px;border:none;background:var(--gold2,#c9a84c);color:#1a1a1a;font-size:.72rem;font-weight:700;">Salvar no estoque + boletos</button>';
  h += '</div>';

  box.innerHTML = h;
  overlay.appendChild(box);
  document.body.appendChild(overlay);

  document.getElementById('estPreviewCancelar').onclick = function () {
    document.body.removeChild(overlay);
  };
  document.getElementById('estPreviewConfirmar').onclick = function () {
    estConfirmarImport(parsed);
    document.body.removeChild(overlay);
  };
}

function estConfirmarImport(parsed) {
  var origem = (parsed.fornecedor || 'nota importada') + (parsed.numeroNota ? ' #' + parsed.numeroNota : '');

  (parsed.itens || []).forEach(function (it) {
    if (!it.material || !it.m2) return;
    estAdicionar({
      material: it.material,
      acabamento: it.acabamento || '',
      m2: +it.m2,
      custoUnit: +(it.valorUnitario || 0),
      origem: origem
    });
  });

  var nParc = (parsed.parcelas || []).length;
  (parsed.parcelas || []).forEach(function (p, i) {
    if (!DB.b) DB.b = [];
    DB.b.unshift({
      id: Date.now() + Math.random() + i,
      tipo: 'pagar',
      cat: 'fornecedor',
      cli: parsed.fornecedor || '(fornecedor a definir)',
      desc: 'Compra de chapas' + (parsed.numeroNota ? ' — Nota ' + parsed.numeroNota : ''),
      valor: +(p.valor || 0),
      venc: p.vencimento || '',
      parc: (i + 1) + '/' + nParc,
      fpag: 'boleto',
      status: 'pendente',
      obs: 'Importado automaticamente da nota fiscal (IA)',
      dtCriado: td()
    });
  });
  DB.sv();
  if (typeof bAutoStatus === 'function') bAutoStatus();
  if (typeof _bRerender === 'function') _bRerender();

  toast('✅ Estoque atualizado e ' + nParc + ' boleto(s) lançado(s)');
}

// ══════════════════════════════════════════════════════════════════════
// PAINEL DE ESTOQUE — lista simples com status por cor
// ══════════════════════════════════════════════════════════════════════
function estAbrirPainel() {
  var overlay = document.createElement('div');
  overlay.id = 'estPainelOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99998;display:flex;align-items:center;justify-content:center;padding:16px;overflow:auto;';
  var box = document.createElement('div');
  box.style.cssText = 'background:var(--s1,#161620);border:1px solid var(--bd2,#333);border-radius:14px;padding:18px;max-width:480px;width:100%;max-height:85vh;overflow:auto;';
  box.innerHTML = estPainelHtml();
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  var fechar = document.getElementById('estPainelFechar');
  if (fechar) fechar.onclick = function () { document.body.removeChild(overlay); };
  var imp = document.getElementById('estPainelImportar');
  if (imp) imp.onclick = function () { document.body.removeChild(overlay); estAbrirImportar(); };
}

function estPainelHtml() {
  var limite = _estLimiteAviso();
  var h = '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">';
  h += '<span style="font-size:.85rem;font-weight:700;color:var(--gold2,#c9a84c);">📦 Estoque de Chapas</span>';
  h += '<span id="estPainelFechar" style="cursor:pointer;font-size:1rem;color:var(--t3,#999);">✕</span></div>';
  h += '<button id="estPainelImportar" style="width:100%;padding:10px;border-radius:8px;border:none;background:var(--gold2,#c9a84c);color:#1a1a1a;font-size:.72rem;font-weight:700;margin-bottom:14px;">📷 Importar nota fiscal (foto)</button>';

  var itens = EST.itens.slice().sort(function (a, b) { return (a.m2Disponivel || 0) - (b.m2Disponivel || 0); });
  if (!itens.length) {
    h += '<div style="font-size:.7rem;color:var(--t4,#666);text-align:center;padding:20px 0;">Nenhum material lançado ainda. Importe uma nota fiscal ou aguarde o primeiro orçamento consumir estoque.</div>';
    return h;
  }
  itens.forEach(function (it) {
    var disp = +(it.m2Disponivel || 0);
    var cor = disp <= 0 ? '#e05151' : disp < limite ? '#f39c12' : '#4ade80';
    var status = disp <= 0 ? '🔴 Zerado' : disp < limite ? '🟡 Baixo' : '🟢 OK';
    h += '<div style="background:var(--s2,#1e1e2a);border-radius:8px;padding:10px 12px;margin-bottom:8px;">';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;">';
    h += '<b style="font-size:.72rem;">' + it.material.replace(/</g, '&lt;') + (it.acabamento ? ' — ' + it.acabamento.replace(/</g, '&lt;') : '') + '</b>';
    h += '<span style="font-size:.62rem;color:' + cor + ';font-weight:700;">' + status + '</span></div>';
    h += '<div style="font-size:.68rem;color:var(--t3,#999);margin-top:3px;">' + disp.toFixed(2) + ' m² disponível' + (it.custoUltimo ? ' · último custo R$ ' + (+it.custoUltimo).toFixed(2) + '/m²' : '') + '</div>';
    h += '</div>';
  });
  return h;
}
