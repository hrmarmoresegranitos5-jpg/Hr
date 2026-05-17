// ═══════════════════════════════════════════════════════════════════════════
// APP-TUM-INLINE.JS — Calculadora de Túmulos v14 embutida no orçamento
// HR Mármores e Granitos
// IMPORTANTE: todo o código do v14 fica isolado num IIFE para não conflitar
// com os globais do app principal (CFG, SEL, toast, fm, init, calcular etc.)
// ═══════════════════════════════════════════════════════════════════════════
(function() {
'use strict';
var NS = window._TUI = {};

// ═══════════════════════════════════════════════════════
// CÓDIGO V14 — PRIVADO (não polui globais do app)
// ═══════════════════════════════════════════════════════

// Helper null-safe: retorna um objeto fake se o elemento não existir no DOM
// Evita "Cannot set properties of null" quando elementos de UI foram removidos
function _gel(id) {
  var el = document.getElementById(id);
  if (el) return el;
  // Retorna proxy que ignora assignments silenciosamente
  return {
    textContent: '', innerHTML: '',
    style: { display: '' },
    querySelector: function() { return null; },
    querySelectorAll: function() { return []; },
    classList: { add: function(){}, remove: function(){}, toggle: function(){}, contains: function(){ return false; } },
    appendChild: function(){},
    setAttribute: function(){},
    removeAttribute: function(){}
  };
}

var CFG = NS.CFG = JSON.parse(localStorage.getItem('hr_tum_cfg') || 'null');
var HIST = NS.HIST = JSON.parse(localStorage.getItem('hr_tum_hist') || '[]');

var DEF_CFG = NS.DEF_CFG = {
  emp: { nome:'HR Mármores e Granitos', tel:'(74) 99148-4460', end:'Av. Dep. Rodolfo Queiroz, 653 — Centro', cidade:'Pilão Arcado — BA' },
  margem: 35,
  parcMax: 8,
  juros: 12,
  mob: { pedreiro:280, ajudante:160, instalacao:300, montagem:280, transporte:200 },
  civil: { cimento:52, areia:160, brita:190, argamassa:35, ferro38:68, ferro516:45, malha:65, blocos:5.8, canaleta:6.5, trelica:22, massa_plastica:35 },
  // ── Custos Indiretos — valores padrão editáveis em Configurações ──────────
  ind: {
    // 1. Consumíveis: discos, brocas, cola, silicone, EPIs
    consumivel_por_m2: 12,    // R$/m² de pedra cortada
    // 2. Operacional: energia, combustível, manutenção
    energia_pct:   1.5,       // % do custo direto total
    combustivel:   80,        // R$ fixo por obra
    manutencao_pct: 0.5,      // % do custo direto
    // 3. Perdas: quebra, sobra, desperdício
    perdas_pct: 2.5,          // % sobre custo da pedra
    // 4. Risco técnico: içamento, retrabalho, garantia
    risco_pct: 2.0            // % sobre custo direto total
  },
  groqKey: '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',
  pedras: [
    { id:'p_gabriel', nm:'Preto São Gabriel', cat:'Granito Preto', pr:500,  peso:2950, esp:3 },
    { id:'andorinha', nm:'Cinza Andorinha',   cat:'Granito Cinza', pr:320,  peso:2720, esp:3 },
    { id:'branco_si', nm:'Branco Siena',      cat:'Granito Branco',pr:580,  peso:2650, esp:3 },
    { id:'verde_ub',  nm:'Verde Ubatuba',     cat:'Granito Verde', pr:340,  peso:2820, esp:3 },
    { id:'via_lactea',nm:'Preto Via Láctea',  cat:'Granito Preto', pr:750,  peso:2950, esp:3 }
  ]
};

if (!CFG) CFG = JSON.parse(JSON.stringify(DEF_CFG));
if (!CFG.emp)   CFG.emp   = JSON.parse(JSON.stringify(DEF_CFG.emp));
if (!CFG.emp.nome) CFG.emp.nome = DEF_CFG.emp.nome;
if (!CFG.mob)   CFG.mob   = JSON.parse(JSON.stringify(DEF_CFG.mob));
if (!CFG.civil) CFG.civil = JSON.parse(JSON.stringify(DEF_CFG.civil));
if (!CFG.pedras)CFG.pedras= JSON.parse(JSON.stringify(DEF_CFG.pedras));
if (typeof CFG.groqKey === 'undefined') CFG.groqKey = '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';
// ── Garantir esp=3 em todas as pedras (túmulo usa 3cm como padrão) ──
CFG.pedras.forEach(function(p){ if (!p.esp || p.esp < 2) p.esp = 3; });
// Garantir campos escalares — podem estar ausentes se hr_tum_cfg foi gravado
// parcialmente por tumSincPedrasGlobais() antes da primeira carga completa
if (CFG.margem  === undefined || CFG.margem  === null) CFG.margem  = DEF_CFG.margem;
if (CFG.parcMax === undefined || CFG.parcMax === null) CFG.parcMax = DEF_CFG.parcMax;
if (CFG.juros   === undefined || CFG.juros   === null) CFG.juros   = DEF_CFG.juros;
if (!CFG.ind) CFG.ind = JSON.parse(JSON.stringify(DEF_CFG.ind));
// Garantir que todos os campos de ind existam
Object.keys(DEF_CFG.ind).forEach(function(k){ if(CFG.ind[k]===undefined)CFG.ind[k]=DEF_CFG.ind[k]; });
if (!CFG.civil.trelica)        CFG.civil.trelica        = DEF_CFG.civil.trelica;
if (!CFG.civil.massa_plastica) CFG.civil.massa_plastica = DEF_CFG.civil.massa_plastica;
if (!CFG.civil.canaleta)       CFG.civil.canaleta       = DEF_CFG.civil.canaleta;
// Migração: garantir campo esp em pedras antigas
CFG.pedras.forEach(function(p){ if (!p.esp) p.esp = 2; });

// ══════════════════════════════════════════════
// ESTADO DO ORÇAMENTO
// ══════════════════════════════════════════════

var SEL = NS.SEL = {
  preset: 'dupla',
  tipoServ: 'rev',
  matId: 'p_gabriel',
  matCat: 'Todos',
  acabamento: 'POL',
  pecas: { tampa:true, lat_esq:true, lat_dir:true, frente:true, fundo:false, lapide:false, rodape:false },
  opts: { cemiterio:false, polido_extra:false, gravacao:false, cruzGranito:false, foto_porc:false, jarro:false, lapide45:false,
          nCruz:1, nFotos:1, nJarros:1 },
  adv: { fatorCem:20 },
  // ── Custos Indiretos ─────────────────────────────────────────────────────
  ind: {
    consumivel: true,        // Discos, brocas, cola, silicone, EPIs
    operacional: true,       // Energia, combustível, manutenção
    perdas: true,            // Quebra de pedra, sobra, desperdício
    risco: true,             // Içamento, retrabalho, garantia
    // Overrides manuais — 0 = usar cálculo automático dos CFG
    consumivel_manual: 0,
    operacional_manual: 0,
    perdas_manual: 0,
    risco_manual: 0,
  },
  falecidos: [{ nome:'', nasc:'', obit:'', frase:'' }],
  // ── CONFIGURAÇÃO DE TAMPAS INDIVIDUAIS ──
  tampas: {
    // Moldura/rebaixo lateral (desconto das bordas da área superior)
    posicao: 'superior',
    moldura: 10,
    molduraCustom: 10,   // valor personalizado
    // Modo de divisão: linhas × colunas
    linhas: 1,           // divisão no eixo da LARGURA (L)
    colunas: 1,          // divisão no eixo do COMPRIMENTO (C)
    // Propriedades de cada tampa
    espTampa: 3,         // espessura (cm)
    overlapFrontalC: 5,  // cm lateral de sobreposição (tampas frontais)
    overlapFrontalH: 5,  // cm vertical de sobreposição (tampas frontais)
    acabTampa: 'POL',    // acabamento das tampas
    argolas: false,      // argolas de içamento
    folgaC: 1,           // folga entre tampas no eixo C (cm)
    folgaL: 1            // folga entre tampas no eixo L (cm)
  },
  // ── CONFIGURAÇÃO DE LÁPIDE ENGROSSADA ──
  lapide: {
    engrossar: 'nao', engCustom: 7, pecasEncontro: true
  },
  rebaixo: {
    avRodape:5, lajeVedante:false, lajeInteira:true, usinagem:false,
    custoUsin:80, vendaUsin:150, custoLaje:120, vendaLaje:200
  }
};
var _TI_SEL_DEF = JSON.parse(JSON.stringify(SEL));

var pendOrc = NS.pendOrc = null;
var delIdx = -1;

// ══════════════════════════════════════════════
// PRESETS
// ══════════════════════════════════════════════

var PRESETS = [
  { id:'simples',   nm:'Simples',          C:190, L:65, E:3, N:0, Ae:30, Hcomp:45, Hlaje:8,  disp:'vertical',   badge:'Sem compartimento' },
  { id:'1comp',     nm:'1 Compartimento',  C:200, L:70, E:3, N:1, Ae:30, Hcomp:45, Hlaje:8,  disp:'vertical',   badge:'1 caixão' },
  { id:'dupla',     nm:'2 Compartimentos', C:200, L:70, E:3, N:2, Ae:30, Hcomp:45, Hlaje:8,  disp:'vertical',   badge:'2 caixões' },
  { id:'premium',   nm:'Premium',          C:210, L:80, E:4, N:2, Ae:30, Hcomp:48, Hlaje:10, disp:'vertical',   badge:'Destaque' },
  { id:'capela',    nm:'Capela',           C:220, L:90, E:3, N:3, Ae:35, Hcomp:45, Hlaje:8,  disp:'vertical',   badge:'3 compartimentos' },
  { id:'moderno',   nm:'Moderno',          C:200, L:75, E:3, N:2, Ae:30, Hcomp:45, Hlaje:8,  disp:'vertical',   badge:'2 comp.' },
  { id:'parcial',   nm:'Rev. Parcial',     C:190, L:65, E:3, N:1, Ae:30, Hcomp:45, Hlaje:8,  disp:'vertical',   badge:'Econômico' },
  { id:'completo',  nm:'Rev. Completo',    C:210, L:80, E:3, N:2, Ae:30, Hcomp:45, Hlaje:8,  disp:'vertical',   badge:'Completo' }
];

var PRESET_PECAS = {
  simples:  { tampa:true,  lat_esq:false, lat_dir:false, frente:true,  fundo:false, lapide:false, rodape:false },
  '1comp':  { tampa:true,  lat_esq:true,  lat_dir:false, frente:true,  fundo:false, lapide:false, rodape:false },
  dupla:    { tampa:true,  lat_esq:true,  lat_dir:true,  frente:true,  fundo:false, lapide:false, rodape:false },
  premium:  { tampa:true,  lat_esq:true,  lat_dir:true,  frente:true,  fundo:true,  lapide:true,  rodape:false },
  capela:   { tampa:true,  lat_esq:true,  lat_dir:true,  frente:true,  fundo:true,  lapide:true,  rodape:true  },
  moderno:  { tampa:true,  lat_esq:true,  lat_dir:false, frente:true,  fundo:false, lapide:false, rodape:false },
  parcial:  { tampa:true,  lat_esq:false, lat_dir:false, frente:true,  fundo:false, lapide:false, rodape:false },
  completo: { tampa:true,  lat_esq:true,  lat_dir:true,  frente:true,  fundo:true,  lapide:false, rodape:true  }
};

// ══════════════════════════════════════════════
// ACABAMENTOS
// ══════════════════════════════════════════════

// ══════════════════════════════════════════════
// TIPOS DE SERVIÇO
// ══════════════════════════════════════════════

var TIPOS_SERV = [
  {
    id: 'rev',
    nm: 'Só Revestimento',
    badge: 'Cliente faz obra',
    desc: '<strong>Apenas pedra e instalação.</strong> O cliente já tem a estrutura pronta. Inclui: m² de granito, argamassa de assentamento, acabamento, instalação e transporte. <strong>Não inclui</strong> cimento estrutural, blocos, ferro ou brita.',
    perda: { SEM:8, '1L':8, '2L':8, '4L':10, '45G':15, BOL:14, ESC:10, POL:10, FLA:12 }
  },
  {
    id: 'estrutura',
    nm: 'Estrutura Completa',
    badge: 'HR faz tudo',
    desc: '<strong>Construção + revestimento.</strong> HR executa a estrutura de concreto/alvenaria e o revestimento em granito. Inclui todos os materiais civis, mão de obra de pedreiro e instalação.',
    perda: { SEM:8, '1L':8, '2L':8, '4L':10, '45G':15, BOL:14, ESC:10, POL:10, FLA:12 }
  },
  {
    id: 'reforma',
    nm: 'Reforma / Troca',
    badge: 'Substituição',
    desc: '<strong>Remoção da pedra antiga + reinstalação.</strong> Inclui desmonte cuidadoso, descarte do material antigo, argamassa, nova pedra e instalação. Prazo reduzido.',
    perda: { SEM:10, '1L':10, '2L':10, '4L':12, '45G':16, BOL:15, ESC:11, POL:11, FLA:13 }
  }
];

var ACABAMENTOS = [
  { id:'SEM', nm:'Sem acabamento', prML:0,   dif:1.00 },
  { id:'1L',  nm:'1 lateral',     prML:8,   dif:1.05 },
  { id:'2L',  nm:'2 laterais',    prML:14,  dif:1.08 },
  { id:'4L',  nm:'4 laterais',    prML:24,  dif:1.12 },
  { id:'45G', nm:'45°',           prML:18,  dif:1.15 },
  { id:'BOL', nm:'Boleado',       prML:22,  dif:1.20 },
  { id:'ESC', nm:'Escovado',      prML:12,  dif:1.10 },
  { id:'POL', nm:'Polido brilho', prML:20,  dif:1.18 },
  { id:'FLA', nm:'Flameado',      prML:16,  dif:1.12 }
];

// ══════════════════════════════════════════════
// ANÁLISE DE IMAGEM POR IA
// ══════════════════════════════════════════════

var iaImageBase64 = null;
var iaImageType   = 'image/jpeg';

function iaOnFileSelect(input) {
  var file = input.files[0];
  if (!file) return;
  // Sempre envia como JPEG (melhor compatibilidade e tamanho menor)
  iaImageType = 'image/jpeg';

  var reader = new FileReader();
  reader.onload = function(e) {
    var originalDataUrl = e.target.result;

    // Mostrar preview imediatamente
    var img = document.getElementById('iaPreviewImg');
    img.src = originalDataUrl;
    img.style.display = 'block';
    document.getElementById('iaUploadIcon').style.display = 'none';
    document.getElementById('iaUploadTxt').textContent = '⏳ Comprimindo imagem...';

    // Comprimir via canvas antes de enviar (máx 1024px, qualidade 0.75)
    var tempImg = new Image();
    tempImg.onload = function() {
      var maxSide = 1024;
      var w = tempImg.naturalWidth;
      var h = tempImg.naturalHeight;
      var ratio = Math.min(maxSide / w, maxSide / h, 1);
      var cw = Math.round(w * ratio);
      var ch = Math.round(h * ratio);

      var canvas = document.createElement('canvas');
      canvas.width  = cw;
      canvas.height = ch;
      var ctx = canvas.getContext('2d');
      ctx.drawImage(tempImg, 0, 0, cw, ch);

      var compressed = canvas.toDataURL('image/jpeg', 0.78);
      iaImageBase64 = compressed.split(',')[1];

      var kb = Math.round(iaImageBase64.length * 0.75 / 1024);
      document.getElementById('iaUploadTxt').textContent = file.name + ' · ' + kb + ' KB (comprimida)';
    };
    tempImg.src = originalDataUrl;
  };
  reader.readAsDataURL(file);
}

function iaAnalisar() {
  if (!iaImageBase64) { toast('⚠ Selecione uma imagem primeiro', true); return; }

  var btn = document.getElementById('iaBtnAnalisar');
  var status = document.getElementById('iaStatus');
  btn.disabled = true;
  btn.textContent = '⏳ Analisando...';
  status.style.display = 'block';
  status.textContent = 'Enviando imagem para análise...';

  var descricao = (document.getElementById('iaDesc').value || '').trim();

  // Monta lista de pedras disponíveis para o prompt
  var pedrasDisponiveis = CFG.pedras.map(function(p) {
    return '"' + p.nm + '" (id:' + p.id + ', R$' + p.pr + '/m², cat:' + p.cat + ')';
  }).join(', ');

  var promptIA = [
    'Você é um especialista em granitos, mármores e construção de túmulos cemiteriais. Analise esta foto e retorne APENAS um JSON válido, sem texto antes ou depois, sem markdown, sem backticks.',
    '',
    '=== PEDRAS DISPONÍVEIS NO ESTOQUE ===',
    pedrasDisponiveis,
    '',
    '=== ACABAMENTOS DISPONÍVEIS ===',
    '"SEM"=Sem acabamento, "1L"=1 lateral polida, "2L"=2 laterais, "4L"=4 laterais, "45G"=Chanfro 45°, "BOL"=Boleado, "ESC"=Escovado, "POL"=Polido brilho espelhado, "FLA"=Flameado',
    '',
    '=== CAMPOS OBRIGATÓRIOS DO JSON ===',
    '- preset: string — o mais próximo entre: "simples","1comp","dupla","premium","capela","moderno","parcial","completo"',
    '- C: number — comprimento estimado em cm (ex: 200). Se não visível, use 200.',
    '- L: number — largura estimada em cm (ex: 70). Se não visível, use 70.',
    '- N: number — número de compartimentos/gavetas visíveis (0,1,2,3,4)',
    '- disp: string — "vertical" se gavetas empilhadas uma sobre a outra, "horizontal" se dispostas lado a lado',
    '- acabamento: string — ID do acabamento mais próximo ao visível na foto',
    '- material: string — nome EXATO de uma das pedras disponíveis no estoque acima. Se o material não existir no estoque, informe o nome real identificado e indique no campo novoMaterial.',
    '- pecas: object com chaves boolean: tampa, lat_esq, lat_dir, frente, fundo, lapide, rodape',
    '- opts: object com chaves boolean: cruzGranito, foto_porc, jarro, lapide45, gravacao',
    '- obs: string — descrição técnica detalhada: tipo de pedra visível, acabamentos, acessórios, estilo, particularidades',
    '',
    '=== CAMPOS OPCIONAIS (use quando necessário) ===',
    '- novoMaterial: object — preencha SE o material identificado NÃO existe no estoque: { nm: string, cat: "Popular"|"Médio"|"Premium", prEstimado: number (R$/m²), peso: number (kg/m³, padrão 75), esp: number (cm, padrão 3) }',
    '- novoAcabamento: object — preencha SE o acabamento identificado NÃO existe na lista: { id: string (3-5 letras maiúsculas), nm: string, descricao: string }',
    '- ajustesPrecoBruto: object — se identificar elementos que impactam custo, informe: { extra_percentual: number, motivo: string }',
    '',
    '=== REGRAS DE IDENTIFICAÇÃO ===',
    '- lapide45: true se a lápide traseira tiver chanfro/corte diagonal ou borda engrossada em ângulo',
    '- jarro: true se houver vasos, jarros ou cachepôs em granito visíveis',
    '- foto_porc: true se houver fotos em porcelana aplicadas na lápide',
    '- cruzGranito: true se houver cruzeiros, cruzes ou símbolos religiosos em granito',
    '- gravacao: true se houver gravação, sandblast ou letreiros aplicados na pedra',
    '- acabamento "POL" = superfície espelhada/brilhante; "45G" = corte diagonal nas bordas; "BOL" = bordas arredondadas; "ESC" = superfície fosca escovada',
    '- Túmulos de granito PRETO são geralmente Preto São Gabriel ou Preto Absoluto',
    '- Túmulos com aparência CINZA/BRANCA geralmente são Cinza Andorinha, Branco Siena ou Mármore',
    '- Túmulos VERDES são geralmente Verde Ubatuba ou Verde Labrador',
    '- Se a foto mostrar um túmulo já construído sem pedra aparente, marque tipoServ como "rev" (só revestimento)',
    descricao ? ('- Descrição adicional do usuário: ' + descricao) : '',
    '',
    '=== FORMATO ESPERADO ===',
    'Retorne apenas o JSON. Exemplo parcial: {"preset":"dupla","C":200,"L":70,"N":2,"disp":"vertical","acabamento":"POL","material":"Preto São Gabriel","pecas":{"tampa":true,"lat_esq":true,"lat_dir":false,"frente":true,"fundo":false,"lapide":false,"rodape":false},"opts":{"cruzGranito":false,"foto_porc":false,"jarro":true,"lapide45":false,"gravacao":true},"obs":"Túmulo duplo vertical em granito preto polido, par de jarros, gravação jateada na frente"}'
  ].filter(Boolean).join('\n');

  var groqKey = CFG.groqKey || '';
  if (!groqKey) {
    status.textContent = '⚠ Chave do Groq não configurada. Vá em Configurações → IA.';
    status.style.background = 'rgba(192,90,74,.1)';
    status.style.color = 'var(--red)';
    btn.disabled = false;
    btn.textContent = '🔍 Analisar com IA';
    return;
  }

  fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + groqKey
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      max_tokens: 1500,
      temperature: 0.1,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: 'data:' + iaImageType + ';base64,' + iaImageBase64 } },
          { type: 'text', text: promptIA }
        ]
      }]
    })
  })
  .then(function(res) { return res.json(); })
  .then(function(data) {
    // Tratar erro de API Groq
    if (data.error) {
      var errMsg = data.error.message || 'Erro na API Groq';
      if (data.error.code === 'invalid_api_key') errMsg = 'Chave do Groq inválida. Verifique nas configurações.';
      else if (data.error.code === 'rate_limit_exceeded') errMsg = 'Limite atingido. Aguarde 30s e tente novamente.';
      status.textContent = '⚠ ' + errMsg;
      status.style.background = 'rgba(192,90,74,.1)';
      status.style.color = 'var(--red)';
      btn.disabled = false;
      btn.textContent = '🔍 Analisar com IA';
      return;
    }

    var txt = '';
    try { txt = data.choices[0].message.content || ''; } catch(e) { txt = ''; }
    txt = txt.replace(/```json|```/g, '').trim();

    var parsed;
    try { parsed = JSON.parse(txt); }
    catch(e) {
      status.textContent = '⚠ Resposta inesperada da IA. Tente novamente.';
      status.style.background = 'rgba(192,90,74,.1)';
      status.style.color = 'var(--red)';
      btn.disabled = false;
      btn.textContent = '🔍 Analisar com IA';
      return;
    }

    iaAplicarResultado(parsed);

    // Monta mensagem de feedback
    var feedbackMsg = '✓ Campos preenchidos!';
    if (parsed.novoMaterial && parsed.novoMaterial.nm) {
      feedbackMsg += ' Material "' + parsed.novoMaterial.nm + '" adicionado ao estoque.';
    }
    if (parsed.novoAcabamento && parsed.novoAcabamento.nm) {
      feedbackMsg += ' Acabamento "' + parsed.novoAcabamento.nm + '" criado.';
    }
    status.textContent = feedbackMsg + ' Revise e ajuste conforme necessário.';
    status.style.background = 'rgba(90,154,106,.1)';
    status.style.color = 'var(--grn)';
    btn.disabled = false;
    btn.textContent = '🔍 Analisar com IA';

    // Fechar modal após 1.5s
    setTimeout(function() {
      fecharModal('modalIA');
      var toastMsg = '✓ IA preencheu o formulário';
      if (parsed.novoMaterial && parsed.novoMaterial.nm) toastMsg += ' · ' + parsed.novoMaterial.nm + ' adicionado!';
      else toastMsg += ' — revise os campos!';
      toast(toastMsg);
    }, 1500);
  })
  .catch(function(err) {
    status.textContent = '⚠ Erro de conexão. Verifique sua internet.';
    status.style.background = 'rgba(192,90,74,.1)';
    status.style.color = 'var(--red)';
    btn.disabled = false;
    btn.textContent = '🔍 Analisar com IA';
  });
}

function iaAplicarResultado(p) {
  var novidades = [];

  // ── NOVO MATERIAL (IA identificou pedra fora do estoque) ──
  if (p.novoMaterial && p.novoMaterial.nm) {
    var nm = p.novoMaterial;
    var jaExiste = CFG.pedras.find(function(x) {
      return x.nm.toLowerCase() === nm.nm.toLowerCase();
    });
    if (!jaExiste) {
      var novaPedra = {
        id: 'p_ia_' + Date.now(),
        nm: nm.nm,
        cat: nm.cat || 'Personalizado',
        pr: nm.prEstimado || 280,
        peso: nm.peso || 75,
        esp: nm.esp || 3
      };
      CFG.pedras.push(novaPedra);
      localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
      buildPedrasCfg();
      buildMatCats();
      buildMatList();
      SEL.matId = novaPedra.id;
      novidades.push('✦ Material novo adicionado: ' + novaPedra.nm + ' (R$' + novaPedra.pr + '/m²)');
    }
  }

  // ── NOVO ACABAMENTO (IA identificou acabamento fora da lista) ──
  if (p.novoAcabamento && p.novoAcabamento.id && p.novoAcabamento.nm) {
    var na = p.novoAcabamento;
    var jaAcab = ACABAMENTOS.find(function(x) { return x.id === na.id; });
    if (!jaAcab) {
      ACABAMENTOS.push({ id: na.id, nm: na.nm, prML: 15, dif: 1.10 });
      novidades.push('✦ Acabamento novo: ' + na.nm);
    }
  }

  // Preset
  if (p.preset) {
    var preset = PRESETS.find(function(x){ return x.id === p.preset; });
    if (preset) aplicarPreset(preset, true);
  }

  // Dimensões
  if (p.C) document.getElementById('mC').value = p.C;
  if (p.L) document.getElementById('mL').value = p.L;
  if (typeof p.N !== 'undefined') document.getElementById('mGav').value = p.N;
  if (p.disp) {
    var dispEl = document.getElementById('mDisp');
    if (dispEl) dispEl.value = p.disp;
  }

  // Acabamento
  if (p.acabamento) {
    var acab = ACABAMENTOS.find(function(a){ return a.id === p.acabamento; });
    if (acab) { SEL.acabamento = acab.id; buildAcabamentos(); }
  }

  // Material — tenta casar pelo nome exato, parcial ou novo criado pela IA
  if (p.material) {
    var matNm = p.material.toLowerCase();
    var found = CFG.pedras.find(function(ped){
      return ped.nm.toLowerCase().indexOf(matNm) >= 0 ||
             matNm.indexOf(ped.nm.toLowerCase().split(' ')[0]) >= 0;
    });
    if (found) { SEL.matId = found.id; buildMatList(); atualizarEspessuraDaPedra(); }
  }

  // Peças
  if (p.pecas) {
    Object.keys(p.pecas).forEach(function(k) {
      if (typeof SEL.pecas[k] !== 'undefined') SEL.pecas[k] = !!p.pecas[k];
    });
    buildPecas();
  }

  // Opcionais — preserva qtd, só altera booleanos
  if (p.opts) {
    var boolKeys = ['cemiterio','polido_extra','gravacao','cruzGranito','foto_porc','jarro','lapide45'];
    boolKeys.forEach(function(k) {
      if (typeof p.opts[k] !== 'undefined') SEL.opts[k] = !!p.opts[k];
    });
    buildOpcionais();
  }

  // Observação IA → campo obs (inclui novidades criadas)
  var obsLines = [];
  if (p.obs) obsLines.push('[IA] ' + p.obs);
  if (novidades.length) obsLines.push('[IA] Criado automaticamente: ' + novidades.join(' | '));
  if (obsLines.length) {
    var obsEl = document.getElementById('iObs');
    if (obsEl) obsEl.value = (obsEl.value ? obsEl.value + '\n' : '') + obsLines.join('\n');
  }

  _TI_calcular();
}

// ══════════════════════════════════════════════
// TAMPAS INDIVIDUAIS — LÓGICA REAL DE MARMORARIA
// ══════════════════════════════════════════════

var ENG_OPCOES = [
  { id:'nao',    nm:'Sem engrossamento',   cm:0 },
  { id:'5cm',    nm:'Engrossado 5 cm',     cm:5 },
  { id:'10cm',   nm:'Engrossado 10 cm',    cm:10 },
  { id:'custom', nm:'Personalizado',       cm:null }
];

var MOLDURA_OPCOES = [
  { id:'5',      nm:'5 cm',     cm:5  },
  { id:'8',      nm:'8 cm',     cm:8  },
  { id:'10',     nm:'10 cm',    cm:10 },
  { id:'12',     nm:'12 cm',    cm:12 },
  { id:'custom', nm:'Personalizado', cm:null }
];

var GRADE_OPCOES = [
  { id:'1x1', nm:'1×1',  sub:'1 tampa',     cols:1, lins:1 },
  { id:'2x1', nm:'2×1',  sub:'2 no C',      cols:2, lins:1 },
  { id:'1x2', nm:'1×2',  sub:'2 no L',      cols:1, lins:2 },
  { id:'2x2', nm:'2×2',  sub:'4 tampas',    cols:2, lins:2 },
  { id:'3x1', nm:'3×1',  sub:'3 no C',      cols:3, lins:1 },
  { id:'2x3', nm:'2×3',  sub:'6 tampas',    cols:2, lins:3 },
  { id:'custom', nm:'Manual', sub:'livre', cols:null, lins:null }
];

/* ── Retorna a moldura ativa em cm ── */
function getMolduraCm() {
  var t = SEL.tampas;
  var op = MOLDURA_OPCOES.find(function(o){ return o.id === (t.molduraId || '10'); });
  if (!op || op.id === 'custom') return t.molduraCustom || 10;
  return op.cm;
}

/* ── Retorna dims internas das tampas ── */
function getTampasDims() {
  var d = getDims();
  var mol = getMolduraCm() / 100;     // metros
  var t   = SEL.tampas;
  var cols = t.colunas || 1;
  var lins = t.linhas  || 1;
  var fC   = (t.folgaC || 1) / 100;  // folga no eixo C
  var fL   = (t.folgaL || 1) / 100;  // folga no eixo L

  var CB=(d.AvRod>0)?d.CUtil:d.C,LB=(d.AvRod>0)?d.LUtil:d.L;
  var C_util=Math.max(CB-2*mol,0.05),L_util=Math.max(LB-2*mol,0.05);

  // Cada tampa = (área útil − folgas entre peças) ÷ número de divisões
  var C_cada = (C_util - (cols - 1) * fC) / cols;
  var L_cada = (L_util - (lins - 1) * fL) / lins;

  return {
    C_ext:CB,L_ext:LB,
    mol: mol,
    C_util: C_util, L_util: L_util,
    cols: cols, lins: lins,
    fC: fC, fL: fL,
    C_cada: Math.max(C_cada, 0.01),
    L_cada: Math.max(L_cada, 0.01),
    nTotal: cols * lins,
    espT: t.espTampa || 3
  };
}

function buildMolduraPresets() {
  var el = document.getElementById('molduraPresets');
  if (!el) return;
  var cur = SEL.tampas.molduraId || '10';
  var h = '';
  MOLDURA_OPCOES.forEach(function(op) {
    h += '<button class="preset'+(cur===op.id?' on':'')+'" onclick="selMoldura(\''+op.id+'\')">'
       + op.nm + '</button>';
  });
  el.innerHTML = h;
  var cbox = document.getElementById('molduraCustomBox');
  if (cbox) cbox.style.display = (cur === 'custom') ? 'block' : 'none';
}

function selMoldura(id) {
  SEL.tampas.molduraId = id;
  buildMolduraPresets();
  atualizarTampasUI();
  _TI_calcular();
}

function buildGradePresets() {
  var el = document.getElementById('gradePresets');
  if (!el) return;
  var cur = SEL.tampas.gradeId || '1x1';
  var h = '';
  GRADE_OPCOES.forEach(function(op) {
    h += '<button class="preset'+(cur===op.id?' on':'')+'" onclick="selGrade(\''+op.id+'\')">'
       + op.nm+' <span style="font-size:.58rem;opacity:.6">'+op.sub+'</span></button>';
  });
  el.innerHTML = h;
  var cbox = document.getElementById('gradeCustomBox');
  if (cbox) cbox.style.display = (cur === 'custom') ? 'block' : 'none';
}

function selGrade(id) {
  SEL.tampas.gradeId = id;
  var op = GRADE_OPCOES.find(function(o){ return o.id === id; });
  if (op && op.cols !== null) {
    SEL.tampas.colunas = op.cols;
    SEL.tampas.linhas  = op.lins;
    var ci = document.getElementById('tColunas');
    var li = document.getElementById('tLinhas');
    if (ci) ci.value = op.cols;
    if (li) li.value = op.lins;
  }
  buildGradePresets();
  atualizarTampasUI();
  _TI_calcular();
}

function adjGrade(campo, delta) {
  if (campo === 'colunas') SEL.tampas.colunas = Math.max(1, Math.min(4, (SEL.tampas.colunas||1) + delta));
  if (campo === 'linhas')  SEL.tampas.linhas  = Math.max(1, Math.min(4, (SEL.tampas.linhas ||1) + delta));
  var ci = document.getElementById('tColunas');
  var li = document.getElementById('tLinhas');
  if (ci) ci.value = SEL.tampas.colunas;
  if (li) li.value = SEL.tampas.linhas;
  atualizarTampasUI();
  _TI_calcular();
}

/* ── ajTampa mantido por compatibilidade ── */
function adjTampa(campo, delta) { adjGrade(campo, delta); }

function buildTampasAcab() {
  var el = document.getElementById('tampasAcabList');
  if (!el) return;
  var h = '';
  ACABAMENTOS.forEach(function(a) {
    var on = (SEL.tampas.acabTampa || 'POL') === a.id;
    h += '<button class="preset'+(on?' on':'')+'" style="font-size:.65rem;padding:5px 12px" '
       + 'onclick="_TI_selAcabTampa(\'' + a.id + '\')">' + a.nm + '</button>';
  });
  el.innerHTML = h;
}

function selAcabTampa(id) {
  SEL.tampas.acabTampa = id;
  buildTampasAcab();
  _TI_calcular();
}



/* ── Desenha o SVG de vista superior ── */
function desenharTampasSVG(td) {
  var el = document.getElementById('tampasSVG');
  if (!el) return;
  var W = 320, H = 200, pad = 28;
  var avW = W - pad*2, avH = H - pad*2;
  var scX = avW / td.C_ext, scY = avH / td.L_ext, sc = Math.min(scX, scY, 3.5);
  var tw = td.C_ext * sc, th = td.L_ext * sc;
  var x0 = (W - tw)/2, y0 = (H - th)/2;
  var molPx = td.mol * sc;
  var gold = '#c9a84c', gold2 = '#e8c96a';

  var s = '<defs>'
    + '<pattern id="t-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">'
    + '<line x1="0" y1="0" x2="0" y2="5" stroke="rgba(201,168,76,.35)" stroke-width="1.5"/></pattern></defs>';

  // Corpo externo (moldura)
  s += '<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+th+'" fill="url(#t-hatch)" stroke="'+gold+'" stroke-width="1.5" rx="2"/>';

  // Área útil interna (fundo limpo)
  var ix = x0 + molPx, iy = y0 + molPx;
  var iw = td.C_util * sc, ih = td.L_util * sc;
  s += '<rect x="'+ix+'" y="'+iy+'" width="'+iw+'" height="'+ih+'" fill="rgba(0,0,0,.25)" stroke="rgba(201,168,76,.3)" stroke-width=".7" rx="1"/>';

  // Cada tampa como retângulo
  var cW = td.C_cada * sc, cH = td.L_cada * sc;
  var fCpx = td.fC * sc, fLpx = td.fL * sc;
  var n = 0;
  for (var col = 0; col < td.cols; col++) {
    for (var lin = 0; lin < td.lins; lin++) {
      n++;
      var tx = ix + col * (cW + fCpx);
      var ty = iy + lin * (cH + fLpx);
      // Sombra tampa
      s += '<rect x="'+(tx+2)+'" y="'+(ty+2)+'" width="'+cW+'" height="'+cH+'" fill="rgba(0,0,0,.3)" rx="1"/>';
      // Tampa
      s += '<rect x="'+tx+'" y="'+ty+'" width="'+cW+'" height="'+cH+'"'
         + ' fill="rgba(201,168,76,.15)" stroke="'+gold2+'" stroke-width="1.2" rx="1"/>';
      // Argola (ponto central)
      var cx2 = tx + cW/2, cy2 = ty + cH/2;
      s += '<circle cx="'+cx2+'" cy="'+cy2+'" r="3" fill="none" stroke="rgba(201,168,76,.6)" stroke-width="1.2"/>';
      s += '<circle cx="'+cx2+'" cy="'+cy2+'" r="1" fill="rgba(201,168,76,.5)"/>';
      // Número da tampa
      s += '<text x="'+cx2+'" y="'+(ty+10)+'" fill="rgba(201,168,76,.7)" font-size="6.5" text-anchor="middle" font-family="DM Mono,monospace">T'+n+'</text>';
      // Dimensão
      s += '<text x="'+cx2+'" y="'+(ty+cH-4)+'" fill="rgba(201,168,76,.5)" font-size="5.5" text-anchor="middle" font-family="DM Mono,monospace">'
         + Math.round(td.C_cada*100)+'×'+Math.round(td.L_cada*100)+'</text>';
    }
  }

  // Cotas externas
  // Comprimento externo (abaixo)
  var cotaYb = y0 + th + 12;
  s += '<line x1="'+x0+'" y1="'+cotaYb+'" x2="'+(x0+tw)+'" y2="'+cotaYb+'" stroke="'+gold+'" stroke-width=".8"/>';
  s += '<text x="'+(x0+tw/2)+'" y="'+(cotaYb+10)+'" fill="'+gold+'" font-size="8" text-anchor="middle" font-family="DM Mono,monospace">'+Math.round(td.C_ext*100)+' cm</text>';
  // Largura externa (direita)
  var cotaXr = x0 + tw + 12;
  s += '<line x1="'+cotaXr+'" y1="'+y0+'" x2="'+cotaXr+'" y2="'+(y0+th)+'" stroke="'+gold+'" stroke-width=".8"/>';
  var midY = y0 + th/2;
  s += '<text x="'+(cotaXr+13)+'" y="'+(midY+3)+'" fill="'+gold+'" font-size="8" text-anchor="middle" font-family="DM Mono,monospace" transform="rotate(-90 '+(cotaXr+13)+' '+midY+')">'+Math.round(td.L_ext*100)+' cm</text>';

  // Cota moldura (pequena, no canto)
  s += '<line x1="'+x0+'" y1="'+y0+'" x2="'+ix+'" y2="'+y0+'" stroke="rgba(212,148,58,.5)" stroke-width=".8" stroke-dasharray="3,2"/>';
  s += '<text x="'+(x0+molPx/2)+'" y="'+(y0-4)+'" fill="rgba(212,148,58,.7)" font-size="6" text-anchor="middle" font-family="DM Mono,monospace">'+Math.round(td.mol*100)+'cm</text>';

  // Legenda
  s += '<rect x="4" y="'+(H-20)+'" width="8" height="8" fill="url(#t-hatch)" opacity=".8"/>';
  s += '<text x="15" y="'+(H-13)+'" fill="rgba(201,168,76,.5)" font-size="6" font-family="DM Mono,monospace">Moldura</text>';
  s += '<rect x="55" y="'+(H-20)+'" width="8" height="8" fill="rgba(201,168,76,.15)" stroke="'+gold2+'" stroke-width=".8"/>';
  s += '<text x="66" y="'+(H-13)+'" fill="rgba(201,168,76,.5)" font-size="6" font-family="DM Mono,monospace">Tampa</text>';

  el.innerHTML = s;
}

function atualizarTampasUI() {
  buildMolduraPresets();
  buildGradePresets();

  var td = getTampasDims();
  var mat = CFG.pedras.find(function(x){return x.id===SEL.matId;}) || CFG.pedras[0];
  var m2_cada = td.C_cada * td.L_cada;
  var peso_cada = m2_cada * (td.espT / 100) * mat.peso;

  // Badge resumo
  var sumEl = document.getElementById('tampasSummary');
  if (sumEl) sumEl.textContent = td.nTotal+'× '+Math.round(td.C_cada*100)+'×'+Math.round(td.L_cada*100)+'cm · mol.'+Math.round(td.mol*100)+'cm';

  // SVG
  desenharTampasSVG(td);

  // Tabela de peças
  var rows = document.getElementById('tampasPreviewRows');
  var totEl = document.getElementById('tampasTotais');
  if (!rows) return;

  var h = '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:7px;margin-bottom:8px">';
  for (var col = 0; col < td.cols; col++) {
    for (var lin = 0; lin < td.lins; lin++) {
      var n = col * td.lins + lin + 1;
      h += '<div style="background:var(--bg4);border:1px solid var(--bd2);border-radius:8px;padding:8px 10px">'
         + '<div style="font-size:.55rem;color:var(--gold);font-family:\'DM Mono\',monospace;margin-bottom:3px">TAMPA '+n+'</div>'
         + '<div style="font-size:.78rem;font-weight:700;color:var(--gold2)">'+Math.round(td.C_cada*100)+'×'+Math.round(td.L_cada*100)+' cm</div>'
         + '<div style="font-size:.62rem;color:var(--t3)">esp. '+td.espT+' cm</div>'
         + '<div style="font-size:.62rem;color:var(--t3)">'+m2_cada.toFixed(3)+' m² · ~'+Math.round(peso_cada)+' kg</div>'
         + '</div>';
    }
  }
  h += '</div>';
  rows.innerHTML = h;

  var m2_total_tampas = m2_cada * td.nTotal;
  var molduraCm = Math.round(td.mol * 100);
  if (totEl) {
    totEl.innerHTML = '<div style="display:flex;justify-content:space-between;align-items:center">'
      + '<div style="font-size:.72rem;color:var(--t2)">Área útil interna: <strong style="color:var(--gold2)">'+Math.round(td.C_util*100)+'×'+Math.round(td.L_util*100)+' cm</strong> (moldura '+molduraCm+'cm cada lado)</div>'
      + '<div style="font-family:\'DM Mono\',monospace;font-size:.82rem;font-weight:700;color:var(--gold2)">'+m2_total_tampas.toFixed(3)+' m²</div>'
      + '</div>'
      + '<div style="font-size:.65rem;color:var(--t4);margin-top:3px">Área ext. total: '+Math.round(td.C_ext*100)+'×'+Math.round(td.L_ext*100)+' cm — desconto moldura: '+(td.C_ext*td.L_ext - m2_total_tampas).toFixed(3)+' m²</div>';
  }
}

// ══════════════════════════════════════════════
// LÁPIDE ENGROSSADA
// ══════════════════════════════════════════════

function buildEngList() {
  var el = document.getElementById('engList');
  if (!el) return;
  var h = '';
  ENG_OPCOES.forEach(function(op) {
    var on = SEL.lapide.engrossar === op.id;
    h += '<button class="preset'+(on?' on':'')+'" onclick="selEngrossar(\''+op.id+'\')">'+op.nm+'</button>';
  });
  // Campo custom
  if (SEL.lapide.engrossar === 'custom') {
    h += '<div class="f" style="margin-top:8px"><label>Espessura de engrossamento (cm)</label>'
       + '<input type="number" id="engCustomVal" min="1" max="30" value="'+(SEL.lapide.engCustom||7)+'" '
       + 'oninput="SEL.lapide.engCustom=+this.value;renderEncontroBox();_TI_calcular()" style="max-width:120px"></div>';
  }
  el.innerHTML = h;
}

function selEngrossar(id) {
  SEL.lapide.engrossar = id;
  buildEngList();
  renderEncontroBox();
  _TI_calcular();
  var badge = document.getElementById('lapideEngBadge');
  if (badge) badge.style.display = (id !== 'nao') ? 'inline-block' : 'none';
}

function getEngCm() {
  var op = ENG_OPCOES.find(function(o){ return o.id === SEL.lapide.engrossar; });
  if (!op) return 0;
  if (op.id === 'custom') return SEL.lapide.engCustom || 7;
  return op.cm;
}

function renderEncontroBox() {
  var d = getDims();
  var engCm = getEngCm();
  var box = document.getElementById('encontroBox');
  if (!box) return;

  if (engCm <= 0 || !SEL.pecas.lapide) {
    box.style.display = 'none';
    return;
  }
  box.style.display = 'block';

  var lapW = d.LapW_cm; // cm
  var lapH = d.LapH_cm; // cm
  var espPedra = d.E;    // cm

  // Lápide frontal principal (2 peças coladas p/ engrossamento visual)
  var pFrontal    = { nm:'Lápide frontal (principal)',  qt:1, comp:lapW, larg:lapH, esp:espPedra, obs:'Peça frontal visível — polida' };
  var pTraseira   = { nm:'Lápide traseira (colagem)',   qt:1, comp:lapW, larg:lapH, esp:espPedra, obs:'Colada à frontal p/ corpo' };

  // Peças de encontro — criam efeito engrossado
  // Superior: largura total da lápide × profundidade de engrossamento
  var pSuperior   = { nm:'Encontro superior',           qt:1, comp:lapW, larg:engCm, esp:espPedra, obs:'Faz cabeçote da lápide' };
  // Laterais: altura da lápide (menos espessura da peça superior e inferior) × engrossamento
  var altLat = lapH - espPedra; // lateral não cobre o superior nem o inferior
  var pLateral    = { nm:'Encontro lateral',             qt:2, comp:altLat, larg:engCm, esp:espPedra, obs:'2 peças — esq + dir' };

  var pecas = [pFrontal, pTraseira, pSuperior, pLateral];

  var h = '';
  pecas.forEach(function(p) {
    var m2 = (p.comp / 100) * (p.larg / 100) * p.qt;
    h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid var(--bd)">'
       + '<div><div style="font-size:.78rem;font-weight:600;color:var(--tx)">'+(p.qt>1?p.qt+'×':'')+' '+p.nm+'</div>'
       + '<div style="font-size:.62rem;color:var(--t4)">'+p.comp.toFixed(1)+'×'+p.larg.toFixed(1)+'cm esp.'+p.esp+'cm — '+p.obs+'</div></div>'
       + '<div style="font-family:\'DM Mono\',monospace;font-size:.78rem;font-weight:700;color:var(--gold2)">'+m2.toFixed(3)+' m²</div>'
       + '</div>';
  });

  // Total
  var totalM2 = pecas.reduce(function(acc,p){ return acc + (p.comp/100)*(p.larg/100)*p.qt; }, 0);
  h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0 0 0">'
     + '<div style="font-size:.72rem;font-weight:700;color:var(--gold)">Total lápide engrossada ('+engCm+'cm)</div>'
     + '<div style="font-family:\'DM Mono\',monospace;font-size:.82rem;font-weight:700;color:var(--gold2)">'+totalM2.toFixed(3)+' m²</div>'
     + '</div>';

  document.getElementById('encontroRows').innerHTML = h;
}

function mostrarCardLapide(show) {
  var card = document.getElementById('cardLapideEng');
  if (card) card.style.display = show ? 'block' : 'none';
  if (show) {
    buildEngList();
    renderEncontroBox();
  }
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════

function init() {
  // Guard: DOM elements only exist after tumInlineMount injects the HTML.
  // If running at DOMContentLoaded before any ambiente is mounted, abort gracefully.
  if (!document.getElementById('presetList')) return;
  buildPresets();
  buildTipoServ();
  buildMatCats();
  buildMatList();
  buildPecas();
  buildAcabamentos();
  buildTampasAcab();
  buildMolduraPresets();
  buildGradePresets();
  buildOpcionais();
  buildAvancado();
  buildFalecidos();
  loadCfgUI();
  buildPedrasCfg();
  renderHistorico();

  var p = PRESETS.find(function(x){ return x.id === SEL.preset; });
  if (p) aplicarPreset(p, true);
  atualizarEspessuraDaPedra();
  atualizarTampasUI();
}

// ══════════════════════════════════════════════
// BUILD TIPO DE SERVIÇO
// ══════════════════════════════════════════════

function buildTipoServ() {
  var el = document.getElementById('tipoServList');
  if (!el) return;
  var h = '';
  TIPOS_SERV.forEach(function(t) {
    var on = SEL.tipoServ === t.id;
    h += '<button class="preset'+(on?' on':'')
       + '" onclick="selTipoServ(\'' + t.id + '\')">'
       + t.nm + ' <span style="font-size:.58rem;opacity:.6">'+t.badge+'</span></button>';
  });
  el.innerHTML = h;
  var ts = TIPOS_SERV.find(function(t){ return t.id === SEL.tipoServ; });
  if (ts) {
    document.getElementById('tipoServDesc').innerHTML = ts.desc;
    document.getElementById('tipoServicoLabel').textContent = ts.nm;
  }
}

function selTipoServ(id) {
  SEL.tipoServ = id;
  buildTipoServ();
  _TI_calcular();
  var ts = TIPOS_SERV.find(function(t){ return t.id === id; });
  if (ts) toast('✓ Serviço: '+ts.nm);
}

// ══════════════════════════════════════════════
// STEPS PROGRESS
// ══════════════════════════════════════════════

function atualizarSteps() {
  var cli = (document.getElementById('iCli').value || '').trim();
  var preset = SEL.preset;
  var C = +(document.getElementById('mC').value);
  var L = +(document.getElementById('mL').value);
  var mat = SEL.matId;

  var steps = [
    { id:'sCliente',  done: cli.length > 0 },
    { id:'sTipo',     done: !!preset && !!SEL.tipoServ },
    { id:'sMedidas',  done: C >= 50 && L >= 30 },
    { id:'sMaterial', done: !!mat },
    { id:'sItens',    done: Object.values(SEL.pecas).some(function(v){return v;}) }
  ];

  var prevDone = true;
  steps.forEach(function(s, i) {
    var el = document.getElementById(s.id);
    if (!el) return;
    el.classList.remove('done','active');
    if (s.done) {
      el.classList.add('done');
      el.querySelector('.step-dot').textContent = '✓';
    } else if (prevDone) {
      el.classList.add('active');
      el.querySelector('.step-dot').textContent = i+1;
    } else {
      el.querySelector('.step-dot').textContent = i+1;
    }
    prevDone = s.done;
  });
}

// ══════════════════════════════════════════════
// BUILD PRESETS
// ══════════════════════════════════════════════

function buildPresets() {
  var el = document.getElementById('presetList');
  if (!el) return;
  var h = '';
  PRESETS.forEach(function(p) {
    h += '<button class="preset'+(SEL.preset===p.id?' on':'')
       + '" onclick="aplicarPreset(PRESETS.find(function(x){return x.id===\''+p.id+'\'}))">'
       + p.nm + ' <span style="font-size:.58rem;opacity:.6">'+p.badge+'</span></button>';
  });
  el.innerHTML = h;
}

function aplicarPreset(p, silent) {
  if (!p) return;
  SEL.preset = p.id;
  document.getElementById('mC').value = p.C;
  document.getElementById('mL').value = p.L;
  document.getElementById('mE').value = p.E;
  document.getElementById('mGav').value = p.N;
  document.getElementById('mAe').value = p.Ae;
  if (document.getElementById('mHcomp')) document.getElementById('mHcomp').value = p.Hcomp || 45;
  if (document.getElementById('mHlaje')) document.getElementById('mHlaje').value = p.Hlaje || 8;
  if (document.getElementById('mDisp'))  document.getElementById('mDisp').value  = p.disp  || 'vertical';

  var pp = PRESET_PECAS[p.id];
  if (pp) SEL.pecas = JSON.parse(JSON.stringify(pp));

  buildPresets();
  buildPecas();
  _TI_calcular();
  document.getElementById('presetAtivo').style.display = 'inline-block';
  document.getElementById('presetAtivo').textContent = p.nm;
  if (!silent) toast('✓ Modelo: '+p.nm);
}

// ══════════════════════════════════════════════
// BUILD MATERIAIS (com filtro por categoria)
// ══════════════════════════════════════════════

function buildMatCats() {
  var cats = ['Todos'];
  CFG.pedras.forEach(function(p) {
    if (cats.indexOf(p.cat) < 0) cats.push(p.cat);
  });
  var el = document.getElementById('matCats');
  if (!el) return;
  var h = '';
  cats.forEach(function(c) {
    var on = SEL.matCat === c;
    h += '<button onclick="_TI_selMatCat(\''+c+'\')" style="'
      + 'flex:0 0 auto;padding:4px 12px;border-radius:20px;border:1px solid '+(on?'var(--gold)':'rgba(255,255,255,.12)')+';'
      + 'background:'+(on?'rgba(201,168,76,.12)':'transparent')+';'
      + 'color:'+(on?'var(--gold2)':'var(--t3)')+';'
      + 'font-size:.68rem;font-weight:'+(on?'600':'400')+';cursor:pointer;white-space:nowrap;'
      + 'transition:all .12s;font-family:Outfit,sans-serif;">'+c+'</button>';
  });
  el.innerHTML = h;
}

function selMatCat(cat) {
  SEL.matCat = cat;
  buildMatCats();
  buildMatList();
}

function buildMatList() {
  var el = document.getElementById('matList');
  if (!el) return;

  // Ordem preferida para túmulo (granitos escuros primeiro)
  var PREF = ['Granito Preto','Granito Cinza','Granito Verde','Granito Branco','Quartzito','Mármore','Travertino','Ultra Compacto'];
  var base = SEL.matCat === 'Todos'
    ? CFG.pedras.slice()
    : CFG.pedras.filter(function(p){ return p.cat === SEL.matCat; });

  var todas = base;
  if (SEL.matCat === 'Todos') {
    var ord = [];
    PREF.forEach(function(cat){ base.filter(function(p){ return p.cat===cat; }).forEach(function(p){ ord.push(p); }); });
    base.forEach(function(p){ if(ord.indexOf(p)===-1) ord.push(p); });
    todas = ord;
  }

  var h = '';
  todas.forEach(function(p) {
    var on = p.id === SEL.matId;
    h += '<div onclick="_TI_selMat(\''+p.id+'\')" style="'
      + 'flex:0 0 100px;cursor:pointer;border-radius:10px;overflow:hidden;position:relative;'
      + 'border:1.5px solid '+(on?'var(--gold)':'rgba(255,255,255,.07)')+';'
      + 'background:'+(on?'rgba(201,168,76,.08)':'var(--bg3)')+';'
      + 'box-shadow:'+(on?'0 0 0 1px rgba(201,168,76,.15),0 2px 12px rgba(201,168,76,.15)':'none')+';'
      + 'transition:border-color .12s,box-shadow .12s;">';
    h += '<div style="width:100%;height:64px;overflow:hidden;background:var(--bg4);">';
    if (p.photo) {
      h += '<img src="'+p.photo+'" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">';
    } else if (p.tx) {
      h += '<div class="msw '+p.tx+'" style="width:100%;height:100%;"><div class="mshine"></div></div>';
    } else {
      h += '<div style="width:100%;height:100%;background:linear-gradient(135deg,var(--bg4),var(--bg3));"></div>';
    }
    h += '</div>';
    if (on) {
      h += '<div style="position:absolute;top:5px;right:5px;width:15px;height:15px;border-radius:50%;'
        + 'background:var(--gold);color:#1a0800;display:flex;align-items:center;justify-content:center;'
        + 'font-size:.46rem;font-weight:800;">✓</div>';
    }
    h += '<div style="padding:5px 7px 7px;">';
    h += '<div style="font-size:.47rem;color:var(--t4);letter-spacing:.3px;margin-bottom:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+(p.cat||'')+'</div>';
    h += '<div style="font-size:.64rem;font-weight:700;color:var(--tx);line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+p.nm+'</div>';
    h += '<div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:3px;">';
    h += '<span style="font-size:.46rem;color:var(--t4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:54%;">'+(p.fin||'Polida')+'</span>';
    h += '<span style="font-size:.52rem;color:var(--gold2);font-weight:600;white-space:nowrap;">R$'+(p.pr||0).toLocaleString('pt-BR')+'/m²</span>';
    h += '</div></div></div>';
  });

  el.innerHTML = h || '<span style="font-size:.75rem;color:var(--t4)">Nenhuma pedra nesta categoria</span>';

  var mat = CFG.pedras.find(function(x){return x.id===SEL.matId;});
  var elSel = document.getElementById('matSel');
  var elInfo = document.getElementById('matInfo');
  if (elSel) elSel.textContent = mat ? (mat.nm + ' · R$ '+mat.pr+'/m²') : '';
  if (elInfo) elInfo.textContent = '';  // info redundante — dados já visíveis no card
}

function selMat(id){
  SEL.matId=id;buildMatList();atualizarEspessuraDaPedra();_TI_calcular();
  if(NS._TI_ambId&&typeof ambientes!=='undefined'){var _s=ambientes.find(function(a){return a.id==_TI_ambId;});if(_s)_s.selMat=id;}
  try{localStorage.setItem('hr_last_mat',id);}catch(e){}
}

function atualizarEspessuraDaPedra() {
  var mat = CFG.pedras.find(function(x){ return x.id === SEL.matId; });
  if (mat && mat.esp) {
    var sel = document.getElementById('mE');
    if (sel) {
      // Tenta setar o valor; se não existir a opção, adiciona
      var found = false;
      for (var i = 0; i < sel.options.length; i++) {
        if (+sel.options[i].value === mat.esp) { sel.selectedIndex = i; found = true; break; }
      }
      if (!found) {
        var opt = document.createElement('option');
        opt.value = mat.esp;
        opt.textContent = mat.esp + ' cm';
        sel.appendChild(opt);
        sel.value = mat.esp;
      }
    }
  }
}

// ══════════════════════════════════════════════
// BUILD PEÇAS
// ══════════════════════════════════════════════

var PECAS_DEF = [
  { id:'tampa',   nm:'Tampa Superior',    sub:'Todas as versões — peça principal' },
  { id:'lat_esq', nm:'Lateral Esquerda',  sub:'Rev. parcial e completo' },
  { id:'lat_dir', nm:'Lateral Direita',   sub:'Rev. completo' },
  { id:'frente',  nm:'Frente / Frontal',  sub:'Todas as versões' },
  { id:'fundo',   nm:'Fundo / Tardoz',    sub:'Rev. completo / opcional' },
  { id:'lapide',  nm:'Lápide',            sub:'Tamanho configurável (padrão 80×60 cm)' },
  { id:'rodape',  nm:'Rodapé de Pedra',   sub:'Perímetro × altura (cm)' }
];

function buildPecas() {
  var el = document.getElementById('pecasTogList');
  var h = '';
  PECAS_DEF.forEach(function(p) {
    var on = !!SEL.pecas[p.id];
    h += '<div class="tog-row">'
       + '<div><div class="tog-lbl">'+p.nm+'</div><div class="tog-sub">'+p.sub+'</div></div>'
       + '<div class="tog'+(on?' on':'')
       + '" id="tpec-'+p.id+'" onclick="togPeca(\''+p.id+'\')"></div>'
       + '</div>';
  });
  el.innerHTML = h;
  var count = Object.values(SEL.pecas).filter(Boolean).length;
  document.getElementById('pecasCount').textContent = count + ' peça' + (count!==1?'s':'') + ' selecionada'+(count!==1?'s':'');
  // Mostrar/esconder card lápide
  mostrarCardLapide(!!SEL.pecas.lapide);
}

function togPeca(id) {
  SEL.pecas[id] = !SEL.pecas[id];
  var el = document.getElementById('tpec-'+id);
  if (el) el.classList.toggle('on', !!SEL.pecas[id]);
  var count = Object.values(SEL.pecas).filter(Boolean).length;
  document.getElementById('pecasCount').textContent = count + ' peça' + (count!==1?'s':'') + ' selecionada'+(count!==1?'s':'');
  // Mostrar card de lápide engrossada quando lápide ativada
  if (id === 'lapide') mostrarCardLapide(!!SEL.pecas.lapide);
  _TI_calcular();
}

// ══════════════════════════════════════════════
// BUILD ACABAMENTOS
// ══════════════════════════════════════════════

function buildAcabamentos() {
  var el = document.getElementById('acabList');
  var h = '';
  ACABAMENTOS.forEach(function(a) {
    var on = SEL.acabamento === a.id;
    var pr = a.prML > 0 ? ' R$'+a.prML+'/ml' : ' Grátis';
    h += '<button class="preset'+(on?' on':'')
       + '" onclick="selAcab(\''+a.id+'\')">'
       + a.nm + ' <span style="font-size:.58rem;opacity:.6">'+pr+'</span></button>';
  });
  el.innerHTML = h;
}

function selAcab(id) {
  SEL.acabamento = id;
  buildAcabamentos();
  _TI_calcular();
  toast('✓ Acabamento: '+ACABAMENTOS.find(function(a){return a.id===id;}).nm);
}

// ══════════════════════════════════════════════
// BUILD OPCIONAIS
// ══════════════════════════════════════════════

var OPTS_DEF = [
  { id:'cemiterio',    nm:'Instalação em cemitério',      sub:'+10% dificuldade, +20% frete materiais' },
  { id:'polido_extra', nm:'Polimento extra completo',     sub:'+5% dificuldade' },
  { id:'gravacao',     nm:'Gravação / letras na lápide',  sub:'+5% dificuldade' },
  { id:'cruzGranito',  nm:'Cruz em granito',              sub:'Qtd configurável — R$350 cada', qtd:'nCruz' },
  { id:'foto_porc',    nm:'Foto em porcelana',            sub:'Qtd configurável — R$300 cada', qtd:'nFotos' },
  { id:'jarro',        nm:'Jarro em granito',             sub:'Par = 2 unid. — R$280 o par', qtd:'nJarros' },
  { id:'lapide45',     nm:'Lápide 45° engrossada',        sub:'Chanfro 45° com espessura extra — R$180' }
];

function buildOpcionais() {
  var el = document.getElementById('opcionaisList');
  var h = '';
  OPTS_DEF.forEach(function(o) {
    var on = !!SEL.opts[o.id];
    var qtdInput = '';
    if (o.qtd) {
      var val = SEL.opts[o.qtd] || 1;
      qtdInput = '<div style="display:flex;align-items:center;gap:6px;margin-left:8px">'
        + '<button class="num-btn" style="width:24px;height:24px;font-size:.9rem" onclick="adjOpt(\''+o.qtd+'\',-1)">−</button>'
        + '<span id="disp-'+o.qtd+'" style="font-size:.8rem;color:var(--gold2);min-width:18px;text-align:center">'+val+'</span>'
        + '<button class="num-btn" style="width:24px;height:24px;font-size:.9rem" onclick="adjOpt(\''+o.qtd+'\',+1)">+</button>'
        + '</div>';
    }
    h += '<div class="tog-row">'
       + '<div style="flex:1"><div class="tog-lbl">'+o.nm+'</div><div class="tog-sub">'+o.sub+'</div></div>'
       + (o.qtd && on ? qtdInput : (o.qtd ? '<div style="width:70px"></div>' : ''))
       + '<div class="tog'+(on?' on':'')
       + '" id="topt-'+o.id+'" onclick="togOpt(\''+o.id+'\')" style="margin-left:8px"></div>'
       + '</div>';
  });
  el.innerHTML = h;
}

function togOpt(id) {
  SEL.opts[id] = !SEL.opts[id];
  var el = document.getElementById('topt-'+id);
  if (el) el.classList.toggle('on', !!SEL.opts[id]);
  buildOpcionais();
  _TI_calcular();
}

function adjOpt(qtdKey, delta) {
  SEL.opts[qtdKey] = Math.max(1, Math.min(10, (SEL.opts[qtdKey] || 1) + delta));
  var el = document.getElementById('disp-'+qtdKey);
  if (el) el.textContent = SEL.opts[qtdKey];
  _TI_calcular();
}

// ══════════════════════════════════════════════
// GESTÃO DE FALECIDOS
// ══════════════════════════════════════════════

// ── CORREÇÃO: setter seguro para campos de falecidos ─────────────────────────
// Protege contra eventos oninput "fantasma" no Android que disparam depois que
// remFalecido() já encolheu o array, causando "Cannot set properties of undefined".
function _setFal(i, campo, val) {
  if (SEL.falecidos && SEL.falecidos[i] !== undefined) {
    SEL.falecidos[i][campo] = val;
    if (campo === 'nome') atualizarFalLabel();
  }
}

function buildFalecidos() {
  // Garante pelo menos 1 falecido
  if (!SEL.falecidos || SEL.falecidos.length === 0) SEL.falecidos = [{ nome:'', nasc:'', obit:'', frase:'' }];

  var el = document.getElementById('falecidosLista');
  if (!el) return;
  var h = '';
  SEL.falecidos.forEach(function(f, i) {
    h += '<div class="fal-row" id="falrow-'+i+'" style="display:flex;flex-direction:column;gap:6px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:8px;padding:10px">'

       // Linha 1: nome + datas + botão remover
       + '<div style="display:flex;gap:6px;align-items:flex-end">'
       + '<div style="flex:2;min-width:0">'
       + '<div style="font-size:.78rem;color:var(--gold2);font-weight:700;letter-spacing:.04em;margin-bottom:4px">Falecido '+(i+1)+'</div>'
       + '<input type="text" placeholder="Nome completo" value="'+escHtml(f.nome||'')+'" '
       + 'oninput="_setFal('+i+',\'nome\',this.value)" '
       + 'style="width:100%;background:var(--bg2);border:1px solid var(--bd2);border-radius:6px;padding:7px 10px;color:var(--tx);font-size:.8rem">'
       + '</div>'
       + '<div style="width:72px">'
       + '<div style="font-size:.6rem;color:var(--t4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Nasc.</div>'
       + '<input type="number" placeholder="1940" value="'+(f.nasc||'')+'" min="1880" max="2030" '
       + 'oninput="_setFal('+i+',\'nasc\',this.value)" '
       + 'style="width:100%;background:var(--bg2);border:1px solid var(--bd2);border-radius:6px;padding:7px 8px;color:var(--tx);font-size:.8rem">'
       + '</div>'
       + '<div style="width:72px">'
       + '<div style="font-size:.6rem;color:var(--t4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Óbito</div>'
       + '<input type="number" placeholder="2020" value="'+(f.obit||'')+'" min="1900" max="2030" '
       + 'oninput="_setFal('+i+',\'obit\',this.value)" '
       + 'style="width:100%;background:var(--bg2);border:1px solid var(--bd2);border-radius:6px;padding:7px 8px;color:var(--tx);font-size:.8rem">'
       + '</div>'
       + (SEL.falecidos.length > 1
         ? '<button onclick="remFalecido('+i+')" style="background:rgba(220,50,50,.15);border:1px solid rgba(220,50,50,.3);border-radius:6px;padding:6px 10px;color:#e06060;font-size:.8rem;cursor:pointer;align-self:flex-end;flex-shrink:0">✕</button>'
         : '')
       + '</div>'

       // Linha 2: frase / epitáfio (opcional)
       + '<div>'
       + '<div style="font-size:.6rem;color:var(--t4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">✦ Frase / Epitáfio <span style="text-transform:none;letter-spacing:0;font-style:italic;opacity:.7">(opcional)</span></div>'
       + '<input type="text" placeholder=\'Ex: "Saudade é amor que não acaba..."\' value="'+escHtml(f.frase||'')+'" '
       + 'oninput="_setFal('+i+',\'frase\',this.value)" '
       + 'style="width:100%;background:var(--bg2);border:1px solid rgba(201,168,76,.25);border-radius:6px;padding:7px 10px;color:var(--gold2);font-size:.78rem;font-style:italic">'
       + '</div>'

       + '</div>';
  });
  el.innerHTML = h;
  atualizarFalLabel();
}

function addFalecido() {
  SEL.falecidos.push({ nome:'', nasc:'', obit:'', frase:'' });
  buildFalecidos();
}

function remFalecido(i) {
  if (SEL.falecidos.length <= 1) return;
  SEL.falecidos.splice(i, 1);
  buildFalecidos();
}

function atualizarFalLabel() {
  var el = document.getElementById('falLabelQtd');
  if (!el) return;
  var n = SEL.falecidos.length;
  el.textContent = n + (n === 1 ? ' pessoa' : ' pessoas');
}

function escHtml(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════
// BUILD AVANÇADO
// ══════════════════════════════════════════════

function buildAvancado() {
  var el = document.getElementById('avancadoList');
  el.innerHTML = '<div class="callout info" style="margin-bottom:10px">'
    + '<strong>Perda automática:</strong> calculada por tipo de acabamento e complexidade das peças (8–16%). Não é necessário ajustar manualmente.</div>'
    + '<div class="f-grid">'
    + '<div class="f"><label>Frete cemitério adicional (%)</label>'
    + '<input type="number" id="iFatorCem" min="0" max="50" step="5" value="'+SEL.adv.fatorCem+'" oninput="SEL.adv.fatorCem=+this.value;_TI_calcular()">'
    + '<span class="f-hint">Aplicado sobre materiais civis e mão de obra se cemitério</span></div>'
    + '</div>';
}

// ══════════════════════════════════════════════
// PREVIEW ESQUEMÁTICO DO TÚMULO
// ══════════════════════════════════════════════

function atualizarPreview(C, L, A, N, Hcomp, Hlaje, Ae, disp) {
  var svg = document.getElementById('prevSVG');
  if (!svg) return;
  if (!Hcomp) Hcomp = 0.45;
  if (!Hlaje) Hlaje = 0.08;
  if (!Ae)    Ae    = 0.30;
  if (!disp)  disp  = 'vertical';

  var W = 320, H = 200;
  var margin = 24;
  var maxW = W - margin*2;
  var maxH = H - margin*2 - 20;

  var escala = Math.min(maxW / Math.max(C, 0.01), maxH / Math.max(A, 0.01));
  var tw = C * escala;
  var th = A * escala;

  var x0 = (W - tw) / 2;
  var y0 = margin + (maxH - th) / 2;

  var cor   = '#c9a84c';
  var corB  = 'rgba(201,168,76,.18)';
  var corL  = 'rgba(201,168,76,.38)';
  var corBa = 'rgba(201,168,76,.28)';

  var s = '';

  // Base estrutural
  var baseH = Ae * escala;
  var bodyH  = th - baseH;
  s += '<rect x="'+x0+'" y="'+(y0+bodyH)+'" width="'+tw+'" height="'+baseH+'" rx="2" fill="'+corBa+'" stroke="'+cor+'" stroke-width="1"/>';
  s += '<text x="'+(x0+4)+'" y="'+(y0+bodyH+baseH/2+3)+'" fill="rgba(201,168,76,.7)" font-size="6" font-family="DM Mono,monospace">BASE '+Math.round(Ae*100)+'cm</text>';

  if (N === 0) {
    s += '<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+bodyH+'" rx="2" fill="'+corB+'" stroke="'+cor+'" stroke-width="1"/>';
    s += '<rect x="'+(x0-3)+'" y="'+(y0-4)+'" width="'+(tw+6)+'" height="6" rx="1" fill="rgba(201,168,76,.5)" stroke="'+cor+'" stroke-width="1"/>';
    s += '<text x="'+(x0+tw+5)+'" y="'+(y0+bodyH/2+3)+'" fill="rgba(201,168,76,.5)" font-size="6" font-family="DM Mono,monospace">SEM COMP.</text>';

  } else if (disp === 'horizontal') {
    // HORIZONTAL: compartimentos lado a lado, largura total dividida entre N
    s += '<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+bodyH+'" rx="2" fill="'+corB+'" stroke="'+cor+'" stroke-width="1"/>';
    // Tampa superior (toda a largura)
    s += '<rect x="'+(x0-3)+'" y="'+(y0-4)+'" width="'+(tw+6)+'" height="6" rx="1" fill="rgba(201,168,76,.5)" stroke="'+cor+'" stroke-width="1"/>';
    s += '<text x="'+(x0+tw/2)+'" y="'+(y0-7)+'" fill="rgba(201,168,76,.7)" font-size="5.5" text-anchor="middle" font-family="DM Mono,monospace">TAMPA</text>';

    var compPxW  = tw / N;   // largura de cada compartimento em pixels
    var lajePxW  = Math.max(4, compPxW * 0.08); // divisória vertical em px
    var compInnW = compPxW - lajePxW;

    for (var i = 0; i < N; i++) {
      var cx = x0 + i * compPxW;
      // Divisória vertical (exceto antes do primeiro)
      if (i > 0) {
        s += '<rect x="'+(cx - lajePxW/2)+'" y="'+y0+'" width="'+lajePxW+'" height="'+bodyH+'" fill="rgba(201,168,76,.40)" stroke="rgba(201,168,76,.6)" stroke-width="0.8"/>';
        s += '<text x="'+(cx)+'" y="'+(y0+bodyH/2+2)+'" fill="rgba(201,168,76,.9)" font-size="5" text-anchor="middle" font-family="DM Mono,monospace" transform="rotate(-90,'+(cx)+','+(y0+bodyH/2)+')">DIV.</text>';
      }
      // Compartimento (espaço livre)
      var innerX = i === 0 ? cx + 4 : cx - lajePxW/2 + lajePxW + 2;
      var innerW = i === 0 ? compInnW - 4 : compInnW - 6;
      s += '<rect x="'+innerX+'" y="'+(y0+4)+'" width="'+innerW+'" height="'+(bodyH-8)+'" rx="1" fill="rgba(0,0,0,.22)" stroke="rgba(201,168,76,.2)" stroke-width="0.5"/>';
      var label = 'C'+(i+1);
      s += '<text x="'+(innerX+innerW/2)+'" y="'+(y0+bodyH/2+2)+'" fill="rgba(201,168,76,.55)" font-size="6" text-anchor="middle" font-family="DM Mono,monospace">'+label+'</text>';
    }

  } else {
    // VERTICAL: compartimentos empilhados (comportamento original)
    s += '<rect x="'+x0+'" y="'+y0+'" width="'+tw+'" height="'+bodyH+'" rx="2" fill="'+corB+'" stroke="'+cor+'" stroke-width="1"/>';
    var compPxH  = Hcomp * escala;
    var lajePxH  = Hlaje * escala;
    var curY     = y0 + bodyH;

    for (var i = 0; i < N; i++) {
      curY -= (compPxH + lajePxH);
      var compY = curY + lajePxH;
      var lajeY = curY;

      var isLajeTampa = (i === N - 1);
      s += '<rect x="'+(x0+1)+'" y="'+lajeY+'" width="'+(tw-2)+'" height="'+lajePxH+'" fill="'+(isLajeTampa ? 'rgba(201,168,76,.45)' : 'rgba(201,168,76,.30)')+'" stroke="rgba(201,168,76,.5)" stroke-width="0.8"/>';
      s += '<text x="'+(x0+tw/2)+'" y="'+(lajeY+lajePxH/2+2.5)+'" fill="rgba(201,168,76,.9)" font-size="5.5" text-anchor="middle" font-family="DM Mono,monospace">'+(isLajeTampa?'TAMPA':'LAJE '+(i)+' — '+Math.round(Hlaje*100)+'cm')+'</text>';

      s += '<rect x="'+(x0+4)+'" y="'+(compY+2)+'" width="'+(tw-8)+'" height="'+(compPxH-4)+'" rx="1" fill="rgba(0,0,0,.22)" stroke="rgba(201,168,76,.2)" stroke-width="0.5"/>';
      s += '<text x="'+(x0+tw/2)+'" y="'+(compY+compPxH/2+2)+'" fill="rgba(201,168,76,.55)" font-size="6" text-anchor="middle" font-family="DM Mono,monospace">COMP. '+(i+1)+' — '+Math.round(Hcomp*100)+'cm</text>';
    }
  }

  // Dimensões totais
  s += '<text x="'+(x0+tw/2)+'" y="'+(y0+th+16)+'" fill="rgba(201,168,76,.7)" font-size="7" text-anchor="middle" font-family="DM Mono,monospace">'+Math.round(C*100)+'cm × '+Math.round(L*100)+'cm × '+Math.round(A*100)+'cm alt.</text>';

  svg.innerHTML = s;
}

// ══════════════════════════════════════════════
// MOTOR DE CÁLCULO
// ══════════════════════════════════════════════

function getDims() {
  // Leitura em cm → conversão interna para metros
  var C_cm  = +(document.getElementById('mC').value)     || 200;
  var L_cm  = +(document.getElementById('mL').value)     || 70;
  var Ae_cm = +(document.getElementById('mAe').value)    || 30;
  var Ab_cm = +(document.getElementById('mAb').value)    || 8;
  var Hc_cm = +(document.getElementById('mHcomp') ? document.getElementById('mHcomp').value : 45) || 45;
  var Hl_cm = +(document.getElementById('mHlaje') ? document.getElementById('mHlaje').value : 8)  || 8;
  var LapW_cm = +(document.getElementById('mLapW') ? document.getElementById('mLapW').value : 80) || 80;
  var LapH_cm = +(document.getElementById('mLapH') ? document.getElementById('mLapH').value : 60) || 60;
  var disp=(document.getElementById('mDisp')?document.getElementById('mDisp').value:'vertical')||'vertical';
  var AR=SEL.rebaixo?(SEL.rebaixo.avRodape||0):0;
  var CU=Math.max(10,C_cm-2*AR),LU=Math.max(10,L_cm-2*AR);
  return {
    C:    C_cm  / 100,   // comprimento em m
    L:    L_cm  / 100,   // largura em m
    E:    +(document.getElementById('mE').value) || 2,  // espessura pedra em cm
    N:    +(document.getElementById('mGav').value) || 0,
    Ae:   Ae_cm / 100,   // base em m
    Ab:   Ab_cm,         // rodapé em cm (mantido para cálculo de área)
    Hcomp: Hc_cm / 100,  // altura livre por compartimento em m
    Hlaje: Hl_cm / 100,  // espessura da laje (concreto+pedra) em m
    LapW:  LapW_cm / 100,// largura lápide em m
    LapH:  LapH_cm / 100,// altura lápide em m
    disp:  disp,         // 'vertical' | 'horizontal'
    // valores originais em cm para exibição
    AvRod:AR,CUtil:CU/100,LUtil:LU/100,
    C_cm:C_cm,L_cm:L_cm,Ae_cm:Ae_cm,Ab_cm:Ab_cm,Hc_cm:Hc_cm,Hl_cm:Hl_cm,LapW_cm:LapW_cm,LapH_cm:LapH_cm,
    CUtil_cm:CU,LUtil_cm:LU
  };
}

function _TI_calcular() {
  var d = getDims();
  // Altura total = base + (N compartimentos × (altura livre + laje entre compart.)) + laje tampa
  // Se N=0: só base + espessura tampa de pedra
  // Se N>0: base + N×(Hcomp + Hlaje) - descontar última laje (a última laje É a tampa)
  // Na verdade: base + N×Hcomp + N×Hlaje (N lajes: N-1 entre compartimentos + 1 tampa)

  // ALTURA MANUAL: se o usuário definiu, usar esse valor como altura total final
  var alturaManualEl = document.getElementById('mAlturaFinal');
  var alturaManual = alturaManualEl ? +(alturaManualEl.value) : 0;

  var At;
  if (alturaManual > 0) {
    // Altura total definida manualmente pelo usuário
    At = alturaManual / 100 - d.Ae;  // desconta base para obter parte dos compartimentos
    At = Math.max(At, 0.05);
  } else if (d.N === 0) {
    // Túmulo simples sem compartimento: base + espessura da pedra de tampa + 2cm folga
    At = d.E / 100 + 0.02;
  } else {
    // N compartimentos: cada um tem altura livre + sua laje superior
    At = d.N * (d.Hcomp + d.Hlaje);
  }
  var A = alturaManual > 0 ? (alturaManual / 100) : (d.Ae + At);

  // Texto informativo
  var infoTexto = '';
  if (alturaManual > 0) {
    infoTexto = '⬛ Altura manual: '+alturaManual+'cm definida pelo usuário (base '+d.Ae_cm+'cm incl.)';
  } else if (d.N === 0) {
    infoTexto = 'Simples: base '+d.Ae_cm+'cm + tampa pedra '+d.E+'cm = '+A.toFixed(2)+'m total';
  } else if (d.disp === 'horizontal') {
    infoTexto = 'Horizontal: '+d.N+' compart. lado a lado · ('+d.Hc_cm+'cm livre + '+d.Hl_cm+'cm laje) + base '+d.Ae_cm+'cm = '+A.toFixed(2)+'m total';
  } else {
    infoTexto = d.N+'×('+d.Hc_cm+'cm livre + '+d.Hl_cm+'cm laje) + base '+d.Ae_cm+'cm = '+A.toFixed(2)+'m total';
  }
  document.getElementById('alturaCalc').textContent = 'Alt. total: ' + (A*100).toFixed(0) + ' cm';
  var pi = document.getElementById('prevInfo');
  if (pi) pi.textContent = infoTexto;

  // Atualizar preview
  atualizarPreview(d.C, d.L, A, d.N, d.Hcomp, d.Hlaje, d.Ae, d.disp);
  atualizarTampasUI();
  if (SEL.pecas.lapide) renderEncontroBox();

  // Calcular parcial para live bar
  try {
    var r = calcularFull();
    _gel('lbVista').textContent = 'R$ ' + _TI_fm(r.valor_vista);
    _gel('lbM2').textContent = r.m2_total.toFixed(2) + ' m²';
    _gel('lbAltura').textContent = (A*100).toFixed(0) + ' cm';
    _gel('lbPrazo').textContent = r.prazo_total + ' dias';
    _gel('lbPeso').textContent = Math.round(r.peso_total) + ' kg';
  } catch(e) {
    _gel('lbAltura').textContent = (A*100).toFixed(0) + ' cm';
  }

  atualizarSteps();
  atualizarAreaUtil();
  _TI_injectDynamicUI();
  buildPosicaoPresets();
  buildCustosIndiretos(r);
  // Atualizar badge do card indireto
  var indBadge = document.getElementById('indBadge');
  if (indBadge && r) {
    var total_ind = r.custo_ind_total || 0;
    indBadge.textContent = total_ind > 0 ? 'R$ ' + _TI_fm(total_ind) : '';
    indBadge.style.display = total_ind > 0 ? 'inline-block' : 'none';
  }
  if(NS._TI_ambId)_tumInlineSaveAmb();
}

function calcularFull() {
  var d = getDims();
  var Esp_m = d.E / 100;  // espessura pedra em metros

  // ─── ALTURA TOTAL ─────────────────────────────────────────────────
  // VERTICAL: compartimentos empilhados → altura cresce
  // HORIZONTAL: compartimentos lado a lado → altura = 1 compartimento + laje tampa
  // MANUAL: usuário define altura final diretamente

  var alturaManualEl = document.getElementById('mAlturaFinal');
  var alturaManual = alturaManualEl ? +(alturaManualEl.value) : 0;

  var At, A;
  if (alturaManual > 0) {
    A  = alturaManual / 100;
    At = A - d.Ae;
  } else if (d.N === 0) {
    At = Esp_m + 0.02;
    A  = d.Ae + At;
  } else if (d.disp === 'horizontal') {
    // Horizontal: apenas 1 nível de compartimento, a altura não multiplica
    At = d.Hcomp + d.Hlaje;   // 1 compartimento + 1 laje tampa
    A  = d.Ae + At;
  } else {
    At = d.N * (d.Hcomp + d.Hlaje);
    A  = d.Ae + At;
  }

  // Lajes divisórias entre compartimentos
  // Vertical: N-1 lajes internas + 1 tampa = N lajes no total
  // Horizontal: 0 lajes internas (as divisórias são verticais, paredes de pedra) + 1 tampa
  var N_lajes_div = d.disp === 'horizontal' ? 0 : Math.max(0, d.N - 1);

  var mat  = CFG.pedras.find(function(x){return x.id===SEL.matId;}) || CFG.pedras[0];
  var acab = ACABAMENTOS.find(function(x){return x.id===SEL.acabamento;}) || ACABAMENTOS[0];
  var ts   = TIPOS_SERV.find(function(x){return x.id===SEL.tipoServ;}) || TIPOS_SERV[0];

  // ─── 1. PEÇAS DE PEDRA — cálculo individual ───────────────────────
  var pecasCalc = [];
  var m2_bruto  = 0;

  var Avis=A-d.Ae,CC=(d.AvRod>0)?d.CUtil:d.C,LC=(d.AvRod>0)?d.LUtil:d.L;
  if(SEL.pecas.tampa){
    var acT=ACABAMENTOS.find(function(x){return x.id===(SEL.tampas.acabTampa||'POL');})||acab;
    var pos=SEL.tampas.posicao||'superior',td=getTampasDims();
    if(pos==='frontal'){
      var nC=SEL.tampas.colunas||1,nL=SEL.tampas.linhas||1,nT=nC*nL;
      // Abertura real = externo − 2×espessura da pedra
      var _E=d.E/100,_olC=(SEL.tampas.overlapFrontalC||5)/100,_olH=(SEL.tampas.overlapFrontalH||5)/100;
      var C_aber_front=Math.max(CC-2*_E,0.05),H_aber_front=Math.max(d.Hcomp,0.30);
      // Tampa = abertura + overlap de cada lado (passa _olC cm pra cada lado)
      var Wc=(C_aber_front+2*_olC)/nC,Hc=H_aber_front+2*_olH;
      for(var i=0;i<nT;i++){pecasCalc.push({nm:nT===1?'Tampa Frontal':'Tampa Frontal '+(i+1)+'/'+nT,dim:Math.round(Wc*100)+'×'+Math.round(Hc*100)+'cm esp.'+(SEL.tampas.espTampa||3)+'cm',m2:Wc*Hc,ml:2*(Wc+Hc),prML:acT.prML});m2_bruto+=Wc*Hc;}
      // REVESTIMENTO SUPERIOR — laje de topo do túmulo (peça separada das tampas)
      // Tampa frontal ≠ topo: o topo tem sua própria laje de pedra
      var _revC=CC,_revL=LC;
      var _a_rev=_revC*_revL;
      pecasCalc.push({nm:'Revestimento Superior (topo)',dim:Math.round(_revC*100)+'×'+Math.round(_revL*100)+'cm',m2:_a_rev,ml:2*(_revC+_revL),prML:acab.prML});
      m2_bruto+=_a_rev;

    }else{
      var nT=td.nTotal,mc=td.C_cada*td.L_cada,mlc=2*(td.C_cada+td.L_cada);
      for(var i=0;i<nT;i++){pecasCalc.push({nm:nT===1?'Tampa Superior':'Tampa '+(i+1)+'/'+nT+' ('+td.cols+'×'+td.lins+')',dim:Math.round(td.C_cada*100)+'×'+Math.round(td.L_cada*100)+'cm esp.'+td.espT+'cm',m2:mc,ml:mlc,prML:acT.prML});m2_bruto+=mc;}
      var mm=td.C_ext*td.L_ext-td.C_util*td.L_util;
      if(mm>0.001){pecasCalc.push({nm:'Moldura/Borda Superior (rebaixo '+Math.round(td.mol*100)+'cm cada lado)',dim:Math.round(td.C_ext*100)+'×'+Math.round(td.L_ext*100)+' − área tampas',m2:mm,ml:2*(td.C_ext+td.L_ext),prML:acab.prML});m2_bruto+=mm;}
    }
  }
  // Altura visual das peças de pedra = altura total − base de concreto
  // A base de concreto é estrutura, não revestida por painéis de pedra laterais
  var Avis = A - d.Ae;  // altura visual aparente (sem base)

  // Lateral esquerda: altura visual × largura
  if(SEL.pecas.lat_esq){var a=Avis*LC;pecasCalc.push({nm:'Lateral Esquerda',dim:(Avis*100).toFixed(0)+'×'+Math.round(LC*100)+'cm',m2:a,ml:Avis,prML:acab.prML});m2_bruto+=a;}
  // Lateral direita: igual à esquerda
  if(SEL.pecas.lat_dir){var a=Avis*LC;pecasCalc.push({nm:'Lateral Direita',dim:(Avis*100).toFixed(0)+'×'+Math.round(LC*100)+'cm',m2:a,ml:Avis,prML:acab.prML});m2_bruto+=a;}
  // Frente: altura visual × comprimento — borda somente na frente (1 lado)
  if(SEL.pecas.frente){var a=Avis*CC;pecasCalc.push({nm:'Frente / Frontal',dim:(Avis*100).toFixed(0)+'×'+Math.round(CC*100)+'cm',m2:a,ml:CC,prML:acab.prML});m2_bruto+=a;}
  // Fundo: altura visual × comprimento — sem borda (não visível)
  if(SEL.pecas.fundo){var a=Avis*CC;pecasCalc.push({nm:'Fundo / Tardoz',dim:(Avis*100).toFixed(0)+'×'+Math.round(CC*100)+'cm',m2:a,ml:0,prML:0});m2_bruto+=a;}

  // RODAPÉ — 4 peças ao redor da base do túmulo
  // H_rod = d.Ab (altura do rodapé configurada no formulário)
  if(SEL.pecas.rodape && d.Ab > 0) {
    var Hr=d.Ab; // metros
    var rodPcs=[
      {nm:'Rodapé Frente',   W:CC, H:Hr},
      {nm:'Rodapé Fundo',    W:CC, H:Hr},
      {nm:'Rodapé Lat. Esq.',W:LC, H:Hr},
      {nm:'Rodapé Lat. Dir.',W:LC, H:Hr}
    ];
    rodPcs.forEach(function(rp){
      var a=rp.W*rp.H;
      pecasCalc.push({nm:rp.nm,dim:Math.round(rp.W*100)+'×'+Math.round(rp.H*100)+'cm',m2:a,ml:rp.W,prML:acab.prML});
      m2_bruto+=a;
    });
  }
  // Lápide: calculada como peça REAL de marmoraria (frente + encontros se engrossada)
  if (SEL.pecas.lapide) {
    var lapW = d.LapW || 0.80;
    var lapH = d.LapH || 0.60;
    var engCm = getEngCm();

    if (engCm <= 0) {
      // Lápide simples — uma chapa
      var a = lapW * lapH;
      pecasCalc.push({
        nm:'Lápide (simples)',
        dim:Math.round(lapW*100)+'×'+Math.round(lapH*100)+'cm',
        m2:a,
        ml:2*(lapW+lapH),
        prML: acab.prML
      });
      m2_bruto += a;
    } else {
      // LÁPIDE ENGROSSADA — peça por peça
      var espM = Esp_m;  // espessura pedra em metros
      var engM = engCm / 100;

      // 1) Peça frontal (face visível)
      var aFrontal = lapW * lapH;
      pecasCalc.push({
        nm:'Lápide — Frente (face visível)',
        dim:Math.round(lapW*100)+'×'+Math.round(lapH*100)+'cm',
        m2: aFrontal,
        ml: 2*(lapW+lapH),
        prML: acab.prML
      });
      m2_bruto += aFrontal;

      // 2) Peça traseira (corpo/suporte — pode ser material mais simples mas usamos mesma pedra)
      var aTraseira = lapW * lapH;
      pecasCalc.push({
        nm:'Lápide — Traseira (corpo/suporte)',
        dim:Math.round(lapW*100)+'×'+Math.round(lapH*100)+'cm · colagem c/ frontal',
        m2: aTraseira,
        ml: 0,
        prML: 0
      });
      m2_bruto += aTraseira;

      if (SEL.lapide.pecasEncontro) {
        // 3) Encontro superior: lapW × engCm
        var aSup = lapW * engM;
        pecasCalc.push({
          nm:'Lápide — Encontro Superior',
          dim:Math.round(lapW*100)+'×'+engCm+'cm (engrossamento)',
          m2: aSup,
          ml: lapW,
          prML: acab.prML
        });
        m2_bruto += aSup;

        // 4) Encontros laterais (×2): (lapH − espPedra) × engCm
        var altLat = lapH - espM;  // lateral cobre do fundo até abaixo do superior
        var aLat = altLat * engM * 2;
        pecasCalc.push({
          nm:'Lápide — Encontros Laterais (×2)',
          dim:Math.round(altLat*100)+'×'+engCm+'cm cada · esq + dir',
          m2: aLat,
          ml: altLat * 2,
          prML: acab.prML
        });
        m2_bruto += aLat;
      }
    }
  }

  // Divisórias entre compartimentos
  if (d.disp === 'horizontal' && d.N > 1) {
    // Horizontal: divisórias verticais de pedra entre os compartimentos (N-1 divisórias)
    var N_div_horiz = d.N - 1;
    var divAltura = A - d.Ae;          // altura do compartimento (sem base) = Avis
    var divLargura=LC;
    var a_div = divAltura * divLargura * N_div_horiz;
    pecasCalc.push({
      nm:'Divisória lateral entre compartimentos (×'+N_div_horiz+')',
      dim:(divAltura*100).toFixed(0)+'×'+Math.round(divLargura*100)+'cm × '+N_div_horiz+' un.',
      m2: a_div, ml: 0, prML: 0  // divisórias internas: sem acabamento de borda
    });
    m2_bruto += a_div;
  } else if (N_lajes_div > 0) {
    // Vertical: lajes divisórias horizontais entre compartimentos
    var L_liq=CC-(SEL.pecas.lat_esq&&SEL.pecas.lat_dir?2*Esp_m:Esp_m);
    var C_liq=LC-(SEL.pecas.frente&&SEL.pecas.fundo?2*Esp_m:Esp_m);
    L_liq = Math.max(L_liq, 0.05);
    C_liq = Math.max(C_liq, 0.10);
    var a_laje = C_liq * L_liq * N_lajes_div;
    pecasCalc.push({
      nm:'Laje divisória — revestimento pedra (×'+N_lajes_div+')',
      dim:(C_liq*100).toFixed(0)+'×'+(L_liq*100).toFixed(0)+'cm × '+N_lajes_div+' un.',
      m2:a_laje, ml:0, prML:0
    });
    m2_bruto += a_laje;
  }
  // Rodapé: perímetro × altura em metros — borda somente na frente
  if (SEL.pecas.rodape && d.Ab > 0) {
    var perimetro = 2 * (d.C + d.L);
    var a = (d.Ab / 100) * perimetro;
    pecasCalc.push({ nm:'Rodapé', dim:d.Ab+'cm × '+perimetro.toFixed(2)+'m perímetro', m2:a, ml:d.C, prML:acab.prML });
    m2_bruto += a;
  }

  var cr=0,vr=0,clv=0,vlv=0,mlr=0,m2lv=0;
  if(SEL.rebaixo&&(SEL.rebaixo.usinagem||SEL.rebaixo.lajeVedante)){
    var tdR=getTampasDims();
    mlr=tdR.nTotal*2*(tdR.C_cada+tdR.L_cada);
    m2lv=SEL.rebaixo.lajeInteira?(d.CUtil*d.LUtil):(tdR.nTotal*tdR.C_cada*tdR.L_cada);
    if(SEL.rebaixo.usinagem){cr=+(mlr*(SEL.rebaixo.custoUsin||80)).toFixed(2);vr=+(mlr*(SEL.rebaixo.vendaUsin||150)).toFixed(2);}
    if(SEL.rebaixo.lajeVedante){clv=+(m2lv*(SEL.rebaixo.custoLaje||120)).toFixed(2);vlv=+(m2lv*(SEL.rebaixo.vendaLaje||200)).toFixed(2);}
  }
  // Fator de perda dinâmico por acabamento e tipo de serviço
  var perdaBase = ts.perda[acab.id] || 10;
  var perdaFinal = perdaBase;
  if (d.N >= 3)               perdaFinal += 2;
  if (N_lajes_div > 0)        perdaFinal += 1;  // recortes das divisórias
  if (SEL.pecas.fundo && SEL.pecas.lat_esq && SEL.pecas.lat_dir) perdaFinal += 1;
  var fatorPerda = 1 + (perdaFinal / 100);
  var m2_total   = m2_bruto * fatorPerda;

  // Custo da pedra: área × preço/m² × fator de espessura
  var espMult = { 2:1.00, 3:1.35, 4:1.70, 5:2.10 };
  var espM = espMult[d.E] || 1.35;
  var custo_pedra = m2_total * mat.pr * espM;

  // Peso real: m² × espessura (m) × densidade (kg/m³)
  // Fórmula correta: cada peça tem peso = area_m2 × espessura_m × densidade
  var peso_total = m2_total * Esp_m * mat.peso;

  // ─── 2. ACABAMENTOS — usa prML por peça (tampas podem ter acabamento diferente) ────
  var ml_total = 0;
  var custo_acabamento = 0;
  pecasCalc.forEach(function(p) {
    ml_total += p.ml;
    // Se a peça tem prML próprio, usa; caso contrário, usa o acabamento global
    var prMLPeca = (typeof p.prML === 'number') ? p.prML : acab.prML;
    custo_acabamento += p.ml * prMLPeca;
  });

  // ─── 3. CONSTRUÇÃO CIVIL — SEQUÊNCIA REAL DE OBRA ────────────────────
  //
  // 1-ALICERCE: canaleta + treliça eletrossoldada + concreto (cimento+areia+brita)
  // 2-PISO: contrapiso concreto (cimento+areia+brita)
  // 3-PAREDE: blocos colados com cimento+areia (traço 1:4)
  // 4-CINTAS: canaleta + treliça + concreto em cada nível de laje
  // 5-LAJE: treliça + malha soldada + concreto (cimento+areia+brita)
  // 6-REBOCO: cimento+areia traço 1:5 sobre a parede antes da pedra
  // 7-ASSENTAMENTO: argamassa AC3 em saco (só para pedra natural)
  // 8-JUNTAS: massa plástica (resina+talco) entre as peças de pedra
  //
  // REGRA: cimento é a base de TUDO estrutural. AC3 é exclusivo para aderir pedra.

  var civil = {
    sacos_cimento:     0,  // sacos 50kg — concreto + argamassa de bloco + reboco
    m3_areia:          0,  // m³ — concreto + argamassa de bloco + reboco
    m3_brita:          0,  // m³ — concreto: alicerce + piso + lajes
    unid_blocos:       0,  // blocos 14×19×39 — preenchimento de parede
    unid_canaletas:    0,  // canaletas 14×19×39 — alicerce + cintas de amarração
    m_trelica:         0,  // treliça eletrossoldada (m) — alicerce + cintas + lajes
    m2_malha:          0,  // malha soldada Q-92 — lajes
    barras_f38:        0,  // ferro 3/8" — reforço complementar lajes
    barras_f516:       0,  // ferro 5/16" — distribuição perpendicular
    m2_reboco:         0,  // m² de parede rebocada (informativo)
    sacos_argam:       0,  // sacos AC3 20kg — APENAS assentamento de pedra natural
    kg_massa_plastica: 0,  // massa plástica (resina+talco) — juntas entre pedras
    custo: 0
  };

  // AC3: APENAS para colar pedra natural (não usada em bloco ou reboco)
  // Consumo: 1 saco 20kg por ~2,5 m² de pedra a 5mm, fator desperdício 1,15
  civil.sacos_argam = Math.ceil((m2_bruto * 1.15) / 2.5);

  // Massa plástica (resina+talco): para todas as juntas entre peças de pedra
  // Consumo: ~0,12 kg por metro linear de junta (junta 3mm)
  civil.kg_massa_plastica = +((ml_total * 0.12).toFixed(2));

  var e_bl    = 0.14;
  var Perim   = 2 * (d.C + d.L);
  var N_lajes = Math.max(d.N, 1);
  var Vol_fund = 0, Vol_lajes = 0, m2_blocos_liq = 0, n_cintas = 0;
  var nDias_fund = 0, nDias_alv = 0, nDias_laje = 0;

  if (SEL.tipoServ === 'estrutura') {

    // ─ 1. ALICERCE (sapata corrida) ────────────────────────────────────
    var prof_fund = 0.50;
    var larg_fund = e_bl + 0.20;
    Vol_fund = Perim * larg_fund * prof_fund;

    // ─ 2. PISO (contrapiso 8cm sobre brita compactada) ─────────────────
    var Vol_piso = d.C * d.L * 0.08;

    // ─ 4. CINTAS DE AMARRAÇÃO (canaleta + treliça + concreto) ──────────
    // 1 baldrame (alicerce) + 1 cinta por compartimento/laje = N_lajes cintas
    n_cintas = 1 + N_lajes;
    var canaletas_por_cinta = Math.ceil(Perim / 0.40);
    civil.unid_canaletas = Math.ceil(n_cintas * canaletas_por_cinta * 1.10);

    // Treliça: cintas (n_cintas × Perim) + lajes (N_lajes × C)
    civil.m_trelica = +(((n_cintas * Perim) + (N_lajes * d.C)) * 1.10).toFixed(1);

    // Concreto para preencher canal da canaleta: seção ~14×10cm
    var Vol_cintas = n_cintas * Perim * e_bl * 0.10;

    // ─ 3. PAREDE (blocos colados com cimento+areia 1:4) ────────────────
    var h_cintas = n_cintas * 0.20;
    var h_blocos = Math.max(Avis - h_cintas, 0);
    m2_blocos_liq = Perim * h_blocos;
    civil.unid_blocos = Math.ceil(m2_blocos_liq * 12.5 * 1.10);
    // Volume de argamassa cimento+areia para juntas de bloco (~12L/m²)
    var Vol_arg_bloco = m2_blocos_liq * 0.012;

    // ─ 5. LAJE (treliça + malha + concreto) ────────────────────────────
    var esp_laje_conc = Math.max(d.Hlaje - Esp_m, 0.06);
    Vol_lajes = d.C * d.L * esp_laje_conc * N_lajes;
    civil.m2_malha    = +((d.C * d.L * (1 + N_lajes)).toFixed(2));
    var N_div_int = Math.max(d.N - 1, 0);
    civil.barras_f38  = Math.ceil(d.C / 0.25) * N_div_int + Math.ceil(Perim / 0.30);
    civil.barras_f516 = Math.ceil(d.C / 0.20) + Math.ceil(d.L / 0.20) +
                        (A >= 1.5 ? Math.ceil(Perim / 0.40) : 0) + (d.N >= 3 ? 4 : 0);

    // ─ 6. REBOCO (cimento+areia traço 1:5 sobre as paredes) ────────────
    civil.m2_reboco = +((Perim * Avis).toFixed(2));
    var Vol_reboco = civil.m2_reboco * 0.015; // 1,5cm de espessura

    // ─ CIMENTO TOTAL (todas as fases) ──────────────────────────────────
    // Concreto (traço 1:2:3): 7 sacos/m³
    var Vol_concreto = Vol_fund + Vol_piso + Vol_lajes + Vol_cintas;
    var sacos_concreto = Vol_concreto * 7;
    // Argamassa de bloco (traço 1:4): 5 sacos/m³
    var sacos_bloco = Vol_arg_bloco * 5;
    // Reboco (traço 1:5): 4 sacos/m³
    var sacos_reboco = Vol_reboco * 4;
    civil.sacos_cimento = Math.ceil((sacos_concreto + sacos_bloco + sacos_reboco) * 1.08);

    // ─ AREIA TOTAL ────────────────────────────────────────────────────
    civil.m3_areia = +(
      (Vol_concreto   * 0.55) +   // areia no concreto
      (Vol_arg_bloco  * 0.80) +   // argamassa de bloco 1:4
      (Vol_reboco     * 0.85)     // argamassa de reboco 1:5
    ).toFixed(2);

    // ─ BRITA (só para concreto) ────────────────────────────────────────
    civil.m3_brita = +((Vol_concreto * 0.65).toFixed(2));

    // ─ CUSTO TOTAL CIVIL ───────────────────────────────────────────────
    var cv = CFG.civil;
    civil.custo =
      civil.sacos_cimento    * cv.cimento   +
      civil.m3_areia         * cv.areia     +
      civil.m3_brita         * cv.brita     +
      civil.barras_f38       * cv.ferro38   +
      civil.barras_f516      * cv.ferro516  +
      civil.m2_malha         * cv.malha     +
      civil.unid_blocos      * cv.blocos    +
      civil.unid_canaletas   * (cv.canaleta      || cv.blocos) +
      civil.m_trelica        * (cv.trelica        || 20) +
      civil.sacos_argam      *  cv.argamassa +
      civil.kg_massa_plastica* (cv.massa_plastica || 35);

    if (SEL.opts.cemiterio) civil.custo *= (1 + SEL.adv.fatorCem / 100);

    nDias_fund = Math.max(1, Math.ceil(Vol_fund / 0.80));
    nDias_alv  = Math.max(1, Math.ceil((m2_blocos_liq + n_cintas * Perim * 0.20) / 8.0));
    nDias_laje = Math.max(1, Math.ceil(N_lajes * 1.5));
  } else {
    // Somente revestimento ou reforma: apenas argamassa de assentamento
    civil.custo = civil.sacos_argam * CFG.civil.argamassa;
    if (SEL.opts.cemiterio) civil.custo *= (1 + SEL.adv.fatorCem / 100);
  }

  // ─── 4. MÃO DE OBRA — FASES SEPARADAS ───────────────────────────
  // Rendimentos de referência (marmoraria, sertão BA):
  //   Fundação:    ~0,8 m³/dia (2 pessoas)
  //   Alvenaria:   ~8 m²/dia (1 pedreiro + 1 ajudante)
  //   Laje:        ~1 laje/dia (concretagem + forma simples)
  //   Revestimento:~3 m²/dia (1 marmoreiro + 1 ajudante)
  //   Acabamento:  ~0,5 dia base + complexidade
  var mob = CFG.mob;
  var custo_mob = 0;
  var nDias_ped = 0, nDias_ajud = 0;
  var custo_ped = 0, custo_ajud = 0;
  var custo_inst = 0, custo_mont = 0, frete = 0;
  var custo_remocao = 0;

  // Instalação do revestimento de pedra (todas as modalidades)
  // 3 m²/dia em túmulo (ajuste + nível + prumo + cola)
  // +0,5 dia por compartimento (cada gaveta exige encaixe individual)
  var nDiasInst = Math.max(1, Math.ceil(m2_bruto / 3.0 + d.N * 0.5));

  // Montagem final: rejunte, limpeza, silicone, acabamento de bordas
  // 0,5 dia base + 0,15/compartimento + 0,04/m²
  var nDiasMont = Math.max(1, Math.ceil(0.5 + d.N * 0.15 + m2_bruto * 0.04));

  if (SEL.tipoServ === 'rev') {
    // ── SOMENTE REVESTIMENTO ─────────────────────────────────────────
    custo_inst = nDiasInst * mob.instalacao;
    custo_mont = nDiasMont * mob.montagem;
    frete      = mob.transporte + (SEL.opts.cemiterio ? 80 : 0);
    custo_mob  = custo_inst + custo_mont + frete;

  } else if (SEL.tipoServ === 'estrutura') {
    // ── ESTRUTURA COMPLETA ───────────────────────────────────────────
    // Obra civil: pedreiro + ajudante em todas as fases (fund + alv + laje)
    nDias_ped  = nDias_fund + nDias_alv + nDias_laje;
    nDias_ajud = nDias_ped; // 1 ajudante acompanha todas as fases

    // Acréscimos por condicionantes
    if (SEL.opts.cemiterio) { nDias_ped += 1; nDias_ajud += 1; } // acesso difícil
    if (A >= 1.8)           { nDias_ped += 1; nDias_ajud += 1; } // andaime necessário

    custo_ped  = nDias_ped  * mob.pedreiro;
    custo_ajud = nDias_ajud * mob.ajudante;
    custo_inst = nDiasInst  * mob.instalacao;
    custo_mont = nDiasMont  * mob.montagem;
    frete      = mob.transporte + (SEL.opts.cemiterio ? 80 : 0) + (d.N >= 2 ? 60 : 0);
    custo_mob  = custo_ped + custo_ajud + custo_inst + custo_mont + frete;

  } else {
    // ── REFORMA ──────────────────────────────────────────────────────
    // Remoção: pedra colada = ~3 m²/dia (mais lento que demolição a seco)
    var nDiasRemocao = Math.max(1, Math.ceil(m2_bruto / 3.0));
    custo_remocao = nDiasRemocao * mob.ajudante;
    custo_inst    = nDiasInst    * mob.instalacao;
    custo_mont    = nDiasMont    * mob.montagem;
    frete         = mob.transporte + (SEL.opts.cemiterio ? 80 : 0);
    custo_mob     = custo_remocao + custo_inst + custo_mont + frete;
  }

  if (SEL.opts.gravacao)     custo_mob += mob.instalacao * 0.3;
  if (SEL.opts.polido_extra && SEL.tipoServ !== 'estrutura') custo_mob += mob.instalacao * 0.2;

  var dias_ped  = nDias_ped;
  var dias_ajud = nDias_ajud;
  var dias_inst = nDiasInst;
  var dias_mont = nDiasMont;
  var dias_remocao = custo_remocao > 0 ? Math.ceil(custo_remocao / mob.ajudante) : 0;

  // ─── 5. ITENS OPCIONAIS ───────────────────────────────────────────
  var custo_extras = 0;
  var nCruz   = SEL.opts.cruzGranito ? (SEL.opts.nCruz   || 1) : 0;
  var nFotos  = SEL.opts.foto_porc   ? (SEL.opts.nFotos  || 1) : 0;
  var nJarros = SEL.opts.jarro       ? (SEL.opts.nJarros || 1) : 0;
  // Argolas de içamento — bronze — 2 por tampa, R$100 cada
  var nArgolas = (SEL.tampas.argolas && SEL.pecas.tampa) ? getTampasDims().nTotal * 2 : 0;

  if (nCruz   > 0) custo_extras += nCruz   * 350;
  if (nFotos  > 0) custo_extras += nFotos  * 300;
  if (nJarros > 0) custo_extras += nJarros * 280;
  if (nArgolas> 0) custo_extras += nArgolas * 100;  // argola bronze R$100 cada
  if (SEL.opts.lapide45) custo_extras += 180;

  // ─── 6. PRAZO — baseado nas fases reais de obra ─────────────────
  // Fabricação na pedreira: ~6 m²/dia de corte + polimento + 1 dia por compartimento
  var dias_fabr = Math.ceil(m2_total / 6) + d.N;
  var prazo_total = 0;

  if (SEL.tipoServ === 'rev') {
    // Só revestimento: fabricação paralela à preparação do local
    // Prazo = max(fabricação, prep.) + instalação + montagem
    prazo_total = dias_fabr + nDiasInst + nDiasMont;
    prazo_total = Math.max(prazo_total, 3);
    prazo_total = Math.min(prazo_total, 10);

  } else if (SEL.tipoServ === 'estrutura') {
    // Estrutura completa: fases em série (obra ≠ fabricação)
    // Fundação + alvenaria + lajes (obra civil)
    var dias_obra_civil = nDias_fund + nDias_alv + nDias_laje;
    // Cura mínima do concreto antes de assentar pedra
    var dias_cura = 7;
    // Fabricação e obra civil podem ser parcialmente paralelas
    // mas a pedra só entra após a cura
    prazo_total = Math.max(dias_fabr, dias_obra_civil) + dias_cura + nDiasInst + nDiasMont;
    prazo_total = Math.max(prazo_total, 10);
    prazo_total = Math.min(prazo_total, 35);

  } else {
    // Reforma: desmonte + instalação nova
    var nDiasRemocao2 = Math.max(1, Math.ceil(m2_bruto / 3.0));
    prazo_total = dias_fabr + nDiasRemocao2 + nDiasInst + nDiasMont;
    prazo_total = Math.max(prazo_total, 4);
    prazo_total = Math.min(prazo_total, 12);
  }
  if (SEL.opts.cemiterio) prazo_total += 2; // logística de cemitério

  // ─── 7. TOTAIS ───────────────────────────────────────────────────
  // ── CUSTOS INDIRETOS ──────────────────────────────────────────────────────
  var ind = SEL.ind || {};
  var ci = CFG.ind || DEF_CFG.ind;
  var custo_direto_base = custo_pedra + custo_acabamento + civil.custo + custo_mob + custo_extras;

  // 1. Consumíveis: discos, brocas, cola, silicone, EPIs
  var custo_consumivel = 0;
  if (ind.consumivel) {
    custo_consumivel = ind.consumivel_manual > 0
      ? ind.consumivel_manual
      : +(m2_total * (ci.consumivel_por_m2 || 12)).toFixed(2);
  }

  // 2. Operacional: energia + combustível + manutenção
  var custo_operacional = 0;
  if (ind.operacional) {
    custo_operacional = ind.operacional_manual > 0
      ? ind.operacional_manual
      : +((custo_direto_base * (ci.energia_pct || 1.5) / 100)
         + (ci.combustivel || 80)
         + (custo_direto_base * (ci.manutencao_pct || 0.5) / 100)).toFixed(2);
  }

  // 3. Perdas: quebra de pedra, sobra concreto, recortes
  var custo_perdas = 0;
  if (ind.perdas) {
    custo_perdas = ind.perdas_manual > 0
      ? ind.perdas_manual
      : +(custo_pedra * (ci.perdas_pct || 2.5) / 100).toFixed(2);
  }

  // 4. Risco técnico: içamento, retrabalho, garantia
  var custo_risco = 0;
  if (ind.risco) {
    custo_risco = ind.risco_manual > 0
      ? ind.risco_manual
      : +(custo_direto_base * (ci.risco_pct || 2.0) / 100).toFixed(2);
  }

  var custo_ind_total = +(custo_consumivel + custo_operacional + custo_perdas + custo_risco).toFixed(2);

  var custo_total=(custo_pedra+custo_acabamento+civil.custo+custo_mob+custo_extras)+cr+clv+custo_ind_total;
  var valor_vista=(custo_pedra+custo_acabamento+civil.custo+custo_mob+custo_extras+custo_ind_total)*(1+CFG.margem/100)+vr+vlv;
  var valor_parc   = valor_vista * (1 + CFG.juros  / 100);
  var parc_mensal  = valor_parc  / CFG.parcMax;
  var margem_reais = valor_vista - custo_total;

  return {
    d:d, A:A, Esp_m:Esp_m, mat:mat, acab:acab, ts:ts,
    pecasCalc:pecasCalc, N_lajes_div:N_lajes_div,
    m2_bruto:m2_bruto, m2_total:m2_total, perdaFinal:perdaFinal,
    ml_total:ml_total, peso_total:peso_total,
    custo_pedra:custo_pedra, custo_acabamento:custo_acabamento,
    civil:civil,
    custo_mob:custo_mob,
    nDias_ped:nDias_ped, nDias_ajud:nDias_ajud,
    nDiasInst:nDiasInst, nDiasMont:nDiasMont,
    custo_ped:custo_ped, custo_ajud:custo_ajud,
    dias_ped:dias_ped, dias_ajud:dias_ajud,
    custo_inst:custo_inst, custo_mont:custo_mont,
    dias_inst:dias_inst, dias_mont:dias_mont,
    custo_remocao:custo_remocao, dias_remocao:dias_remocao, frete:frete,
    nCruz:nCruz, nFotos:nFotos, nJarros:nJarros,
    custo_extras:custo_extras,custo_total:custo_total,
    custo_consumivel:custo_consumivel,custo_operacional:custo_operacional,
    custo_perdas:custo_perdas,custo_risco:custo_risco,custo_ind_total:custo_ind_total,
    ml_rebaixo:mlr,m2_laje_ved:m2lv,custo_rebaixo:cr,venda_rebaixo:vr,custo_laje_ved:clv,venda_laje_ved:vlv,
    valor_vista:valor_vista, valor_parc:valor_parc, parc_mensal:parc_mensal,
    margem_reais:margem_reais,
    prazo_total:prazo_total
  };
}

// ── Custos Indiretos ────────────────────────────────────────────────────────
function buildCustosIndiretos(r) {
  var card = document.getElementById('cardCustosInd');
  if (!card) return;
  var ci = CFG.ind || DEF_CFG.ind;
  var ind = SEL.ind || {};
  var m2 = (r && r.m2_total) ? r.m2_total : 0;
  var direto = r ? (r.custo_pedra||0)+(r.custo_acabamento||0)+(r.civil?r.civil.custo:0)+(r.custo_mob||0)+(r.custo_extras||0) : 0;

  function fv(v){ return 'R$\u00a0' + _TI_fm(v); }
  function pct(v,base){ return base>0?((v/base)*100).toFixed(1)+'%':'—'; }

  var grupos = [
    {
      id:'consumivel', icon:'🔧', lbl:'Consumíveis',
      sub:'Discos de corte, brocas, cola, silicone, EPIs',
      auto: +(m2*(ci.consumivel_por_m2||12)).toFixed(2),
      manual: ind.consumivel_manual||0, on: ind.consumivel,
      desc:'R$ '+(ci.consumivel_por_m2||12).toFixed(0)+'/m²',
    },
    {
      id:'operacional', icon:'⚡', lbl:'Operacional',
      sub:'Energia elétrica, combustível, manutenção de equipamentos',
      auto: +(direto*(ci.energia_pct+ci.manutencao_pct||2)/100+(ci.combustivel||80)).toFixed(2),
      manual: ind.operacional_manual||0, on: ind.operacional,
      desc:'Energia '+(ci.energia_pct||1.5)+'% + R$'+(ci.combustivel||80)+' comb.',
    },
    {
      id:'perdas', icon:'📉', lbl:'Perdas',
      sub:'Quebra de pedra, sobra de concreto, recortes perdidos',
      auto: +(direto>0?(r?r.custo_pedra||0:0)*(ci.perdas_pct||2.5)/100:0).toFixed(2),
      manual: ind.perdas_manual||0, on: ind.perdas,
      desc:(ci.perdas_pct||2.5)+'% sobre custo da pedra',
    },
    {
      id:'risco', icon:'⚠️', lbl:'Risco Técnico',
      sub:'Içamento, retrabalho, peças pesadas, garantia de instalação',
      auto: +(direto*(ci.risco_pct||2.0)/100).toFixed(2),
      manual: ind.risco_manual||0, on: ind.risco,
      desc:(ci.risco_pct||2.0)+'% sobre custo direto',
    },
  ];

  var total = grupos.reduce(function(s,g){
    if(!g.on) return s;
    return s + (g.manual>0?g.manual:g.auto);
  }, 0);

  var html = '';
  grupos.forEach(function(g) {
    var val = g.on ? (g.manual>0?g.manual:g.auto) : 0;
    html += '<div style="border:1px solid var(--bd);border-radius:10px;padding:11px 13px;margin-bottom:8px;background:var(--bg3)">';
    html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">';
    html += '<div style="display:flex;align-items:center;gap:8px">';
    html += '<div class="tog'+(g.on?' on':'')+'" id="togInd_'+g.id+'" onclick="_togInd(\''+g.id+'\')" style="width:38px;height:22px;flex-shrink:0"></div>';
    html += '<div><div style="font-size:.8rem;font-weight:600;color:var(--tx)">'+g.icon+' '+g.lbl+'</div>';
    html += '<div style="font-size:.62rem;color:var(--t4)">'+g.sub+'</div></div>';
    html += '</div>';
    html += '<div style="text-align:right"><div style="font-size:.88rem;font-weight:700;color:'+(g.on?'var(--gold2)':'var(--t4)')+'">'+fv(val)+'</div>';
    html += '<div style="font-size:.6rem;color:var(--t4)">'+pct(val,direto)+'</div></div>';
    html += '</div>';
    if (g.on) {
      html += '<div style="display:flex;align-items:center;gap:8px;margin-top:6px">';
      html += '<span style="font-size:.65rem;color:var(--t4);flex:1">Auto: '+g.desc+' = '+fv(g.auto)+'</span>';
      html += '<div style="display:flex;align-items:center;gap:4px">';
      html += '<span style="font-size:.62rem;color:var(--t3)">Override R$</span>';
      html += '<input type="number" min="0" value="'+(g.manual||'')+'" placeholder="0"'
        +' oninput="SEL.ind.'+g.id+'_manual=+this.value||0;_TI_calcular()"'
        +' style="width:80px;padding:4px 8px;border-radius:7px;border:1px solid var(--bd2);background:var(--bg4);color:var(--tx);font-size:.78rem;font-family:inherit">';
      html += '</div></div>';
    }
    html += '</div>';
  });

  // Total
  html += '<div style="background:rgba(201,168,76,.06);border:1.5px solid rgba(201,168,76,.25);border-radius:10px;padding:10px 14px;display:flex;justify-content:space-between;align-items:center">';
  html += '<div><div style="font-size:.7rem;font-weight:700;color:var(--gold2);text-transform:uppercase;letter-spacing:.06em">Total Indireto</div>';
  html += '<div style="font-size:.62rem;color:var(--t4)">'+(direto>0?pct(total,direto)+' do custo direto':'')+'</div></div>';
  html += '<div style="font-size:1.1rem;font-weight:800;color:var(--gold2)">'+fv(total)+'</div></div>';

  card.querySelector('.card-body').innerHTML = html;
}

function _togInd(grupo) {
  SEL.ind[grupo] = !SEL.ind[grupo];
  _TI_calcular();
}

function atualizarAreaUtil(){
  var d=getDims(), box=document.getElementById('divAreaUtil');
  if(box){
    if(d.AvRod>0){
      box.style.display='block';
      box.innerHTML='<strong style="color:#4a80b5">📐 Externo × Corpo Útil</strong><br>'
        +'Externo: <b>'+d.C_cm+' × '+d.L_cm+' cm</b> &nbsp;|&nbsp; Avanço: <b>'+d.AvRod+'cm/lado</b><br>'
        +'Corpo útil: <b style="color:#4a80b5">'+d.CUtil_cm+' × '+d.LUtil_cm+' cm</b>'
        +' ('+((d.CUtil*d.LUtil).toFixed(3))+' m²)';
    }else{box.style.display='none';}
  }
  var badge=document.getElementById('lajeVedBadge');
  if(badge){
    var at=[];
    if(SEL.rebaixo&&SEL.rebaixo.lajeVedante)at.push('Laje');
    if(SEL.rebaixo&&SEL.rebaixo.usinagem)at.push('Usinagem');
    badge.textContent=at.join(' + ');
  }
}

function _tLajeToggle(){
  SEL.rebaixo.lajeVedante=!SEL.rebaixo.lajeVedante;
  var el=document.getElementById('togLajeVed');if(el)el.classList.toggle('on',SEL.rebaixo.lajeVedante);
  var pr=document.getElementById('lajeVedPrecos');if(pr)pr.style.display=SEL.rebaixo.lajeVedante?'block':'none';
  _TI_calcular();
}
function _tUsinToggle(){
  SEL.rebaixo.usinagem=!SEL.rebaixo.usinagem;
  var el=document.getElementById('togUsinagem');if(el)el.classList.toggle('on',SEL.rebaixo.usinagem);
  var pr=document.getElementById('usinagemPrecos');if(pr)pr.style.display=SEL.rebaixo.usinagem?'block':'none';
  _TI_calcular();
}

function buildPosicaoPresets(){
  var el=document.getElementById('posicaoPresets');if(!el)return;
  var cur=SEL.tampas.posicao||'superior';
  var opts=[{id:'superior',label:'🪨 Superior (em cima)',dica:'Tampas horizontais sobre os compartimentos'},
            {id:'frontal', label:'🚪 Frontal (na frente)',dica:'Tampas verticais na fachada — abertura frontal'}];
  el.innerHTML=opts.map(function(o){
    return '<button class="preset'+(o.id===cur?' on':'')+'" onclick="_setPosicao(\u0027'+o.id+'\u0027)" type="button">'+o.label+'</button>';
  }).join('');
  var dica=document.getElementById('tampaPosDica');
  if(dica){var f=opts.find(function(o){return o.id===cur;});if(f)dica.textContent=f.dica;}
}
function _setPosicao(id){SEL.tampas.posicao=id;buildPosicaoPresets();_TI_calcular();}

var _tumFotoOrc=null;
function carregarFotoOrc(input){
  if(!input.files||!input.files[0])return;
  var r=new FileReader();
  r.onload=function(e){
    _tumFotoOrc=e.target.result;
    var prev=document.getElementById('tumFotoPreview');
    if(prev)prev.innerHTML='<img src="'+_tumFotoOrc+'" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;display:block">';
    var area=document.getElementById('tumFotoArea');
    if(area)area.style.borderColor='var(--gold)';
    if(NS.pendOrc&&NS.pendOrc.r){try{gerarPrintArea(NS.pendOrc,NS.pendOrc.r);}catch(ex){}}
  };
  r.readAsDataURL(input.files[0]);
}

// Injeta novos elementos de UI via DOM após o mount (evita escaping no template)
function _TI_injectDynamicUI(){
  // 1. mAvRodape após mAb
  if(!document.getElementById('mAvRodape')){
    var mAbEl=document.getElementById('mAb');
    if(mAbEl){
      var mAbF=mAbEl.closest('.f');
      if(mAbF){
        var d2=document.createElement('div');d2.className='f';
        d2.innerHTML='<label>Avanço rodapé (cm)</label>'
          +'<input id="mAvRodape" type="number" step="1" min="0" max="20" value="'+(SEL.rebaixo.avRodape||5)+'">'
          +'<span class="f-hint">Projeção externa (0 = sem rodapé)</span>';
        d2.querySelector('#mAvRodape').addEventListener('input',function(){SEL.rebaixo.avRodape=+this.value;_TI_calcular();});
        mAbF.after(d2);
      }
    }
  }
  // 2. divAreaUtil antes de molduraPresets
  if(!document.getElementById('divAreaUtil')){
    var mp=document.getElementById('molduraPresets');
    if(mp){
      var au=document.createElement('div');
      au.id='divAreaUtil';
      au.style.cssText='display:none;margin-bottom:12px;padding:10px 14px;background:rgba(74,122,170,.07);border:1px solid rgba(74,122,170,.2);border-radius:10px;font-size:.72rem;color:#8ab4d8;line-height:1.7';
      mp.before(au);
    }
  }
  // 3. posicaoPresets no card de tampas
  if(!document.getElementById('posicaoPresets')){
    var allCards=document.querySelectorAll('.card'),tampasBody=null;
    allCards.forEach(function(card){
      var t=card.querySelector('.card-title');
      if(t&&t.textContent&&t.textContent.indexOf('Tampas')>=0)tampasBody=card.querySelector('.card-body');
    });
    if(tampasBody){
      var pw=document.createElement('div');
      pw.innerHTML='<div style="font-size:.6rem;color:var(--t3);letter-spacing:.08em;text-transform:uppercase;font-weight:700;margin-bottom:8px">Posição de abertura</div>'
        +'<div class="presets" id="posicaoPresets" style="margin-bottom:4px"></div>'
        +'<div id="tampaPosDica" style="font-size:.68rem;color:var(--t4);margin-top:5px"></div>';
      var firstSep=tampasBody.querySelector('.sep');
      if(firstSep){
        firstSep.before(pw);
        var s2=document.createElement('div');s2.className='sep';s2.style.margin='8px 0';
        pw.after(s2);
      } else {
        tampasBody.insertBefore(pw,tampasBody.firstChild);
      }
      buildPosicaoPresets();
    }
  }
  // 4. Foto upload no card do cliente (após lote)
  if(!document.getElementById('tumFotoArea')){
    var loteEl=document.getElementById('iLote');
    if(loteEl){
      var fd=document.createElement('div');fd.className='f';fd.style.gridColumn='1/-1';
      fd.innerHTML='<label>Foto do modelo (aparece no PDF)</label>'
        +'<div id="tumFotoArea" style="border:2px dashed var(--bd2);border-radius:10px;padding:12px;text-align:center;cursor:pointer;min-height:48px;display:flex;align-items:center;justify-content:center;gap:8px;transition:border-color .2s;background:var(--bg3)">'
        +'<input type="file" id="tumFotoInput" accept="image/*" style="display:none">'
        +'<div id="tumFotoPreview" style="font-size:.75rem;color:var(--t4)">📷 Toque para adicionar foto do modelo</div>'
        +'</div>';
      fd.querySelector('#tumFotoArea').addEventListener('click',function(){document.getElementById('tumFotoInput').click();});
      fd.querySelector('#tumFotoInput').addEventListener('change',function(){carregarFotoOrc(this);});
      loteEl.closest('.f').after(fd);
    }
  }
  // 5. Card Laje Vedante + Usinagem (IV-D) antes do card Material
  if(!document.getElementById('cardLajeVed')){
    var allCards2=document.querySelectorAll('.card'),matCard=null;
    allCards2.forEach(function(card){
      var t=card.querySelector('.card-title');
      if(t&&t.textContent&&(t.textContent.indexOf('Material')>=0||t.textContent.indexOf('⑤')>=0))matCard=card;
    });
    if(matCard){
      var lj=document.createElement('div');lj.className='card';lj.id='cardLajeVed';
      lj.innerHTML=(
        '<div class="card-head">'
          +'<span class="card-title">④-D · Laje Vedante + Usinagem</span>'
          +'<span class="card-badge" id="lajeVedBadge"></span>'
        +'</div>'
        +'<div class="card-body">'
          +'<div class="callout info">Adicione laje vedante (sela o compartimento abaixo da tampa) e/ou usinagem do rebaixo de encaixe nas tampas.</div>'
          +'<div class="tog-row">'
            +'<div><div class="tog-lbl">🧱 Laje vedante</div><div class="tog-sub">Laje de concreto abaixo de cada tampa</div></div>'
            +'<div class="tog" id="togLajeVed" onclick="_tLajeToggle()"></div>'
          +'</div>'
          +'<div id="lajeVedPrecos" style="display:none;margin-top:4px;padding:12px;background:var(--bg3);border-radius:10px;border:1px solid var(--bd)">'
            +'<div class="f-grid" style="margin-bottom:10px">'
              +'<div class="f"><label>Custo (R$/m²)</label><input type="number" value="120" min="0" oninput="SEL.rebaixo.custoLaje=+this.value;_TI_calcular()"></div>'
              +'<div class="f"><label>Venda (R$/m²)</label><input type="number" value="200" min="0" style="border-color:rgba(201,168,76,.3)" oninput="SEL.rebaixo.vendaLaje=+this.value;_TI_calcular()"></div>'
            +'</div>'
            +'<div style="display:flex;flex-direction:column;gap:7px;margin-bottom:8px">'
              +'<label style="font-size:.75rem;display:flex;align-items:center;gap:10px;cursor:pointer;color:var(--t2)"><input type="radio" name="lajeMode" value="i" checked onchange="SEL.rebaixo.lajeInteira=true;_TI_calcular()" style="accent-color:var(--gold)"><span><strong style="color:var(--tx)">Uma laje inteira</strong> — cobre toda a área útil</span></label>'
              +'<label style="font-size:.75rem;display:flex;align-items:center;gap:10px;cursor:pointer;color:var(--t2)"><input type="radio" name="lajeMode" value="c" onchange="SEL.rebaixo.lajeInteira=false;_TI_calcular()" style="accent-color:var(--gold)"><span><strong style="color:var(--tx)">Uma por compartimento</strong> — laje individual</span></label>'
            +'</div>'
            +'<div id="lajeVedInfo" style="font-size:.68rem;color:var(--gold);font-weight:600;padding:6px 10px;background:rgba(201,168,76,.06);border-radius:7px"></div>'
          +'</div>'
          +'<div class="sep"></div>'
          +'<div class="tog-row">'
            +'<div><div class="tog-lbl">🔧 Usinagem rebaixo</div><div class="tog-sub">Corte nas bordas para encaixe das tampas (R$/ml)</div></div>'
            +'<div class="tog" id="togUsinagem" onclick="_tUsinToggle()"></div>'
          +'</div>'
          +'<div id="usinagemPrecos" style="display:none;margin-top:4px;padding:12px;background:var(--bg3);border-radius:10px;border:1px solid var(--bd)">'
            +'<div class="f-grid" style="margin-bottom:8px">'
              +'<div class="f"><label>Custo (R$/ml)</label><input type="number" value="80" min="0" oninput="SEL.rebaixo.custoUsin=+this.value;_TI_calcular()"></div>'
              +'<div class="f"><label>Venda (R$/ml)</label><input type="number" value="150" min="0" style="border-color:rgba(201,168,76,.3)" oninput="SEL.rebaixo.vendaUsin=+this.value;_TI_calcular()"></div>'
            +'</div>'
            +'<div id="usinagemInfo" style="font-size:.68rem;color:var(--gold);font-weight:600;padding:6px 10px;background:rgba(201,168,76,.06);border-radius:7px"></div>'
          +'</div>'
        +'</div>'
      );
      matCard.before(lj);
    }
  }
  // 5b. Inputs de overlap para tampas frontais (injetados na seção de tampas)
  if (!document.getElementById('frontalOverlapBox')) {
    var _tbx = document.getElementById('tampasPosBox') ||
               document.querySelector('[id*="tampaPos"]') ||
               document.getElementById('tampasPosicao');
    if (_tbx) {
      var _fob = document.createElement('div');
      _fob.id = 'frontalOverlapBox';
      _fob.style.cssText = 'display:none;margin-top:10px;padding:10px 12px;background:var(--bg3);border-radius:10px;border:1px solid var(--bd)';
      _fob.innerHTML = '<div style="font-size:.65rem;font-weight:700;color:var(--gold2);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">📐 Sobreposição das tampas</div>'
        + '<div style="font-size:.68rem;color:var(--t4);margin-bottom:10px">Quantos cm a tampa passa além da abertura em cada lado</div>'
        + '<div class="cols3" style="gap:12px">'
        + '<div><label style="font-size:.62rem;color:var(--t3)">LATERAL (cada lado)</label>'
        + '<div style="display:flex;align-items:center;gap:6px"><input type="number" id="tOverlapC" min="0" max="20" step="1" value="'+(SEL.tampas.overlapFrontalC||5)+'" oninput="SEL.tampas.overlapFrontalC=+this.value||5;_TI_calcular()" style="width:70px;padding:5px 8px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg4);color:var(--tx);font-size:.85rem;font-family:inherit"><span style="font-size:.7rem;color:var(--t4)">cm</span></div></div>'
        + '<div><label style="font-size:.62rem;color:var(--t3)">VERTICAL (cima/baixo)</label>'
        + '<div style="display:flex;align-items:center;gap:6px"><input type="number" id="tOverlapH" min="0" max="20" step="1" value="'+(SEL.tampas.overlapFrontalH||5)+'" oninput="SEL.tampas.overlapFrontalH=+this.value||5;_TI_calcular()" style="width:70px;padding:5px 8px;border-radius:8px;border:1px solid var(--bd2);background:var(--bg4);color:var(--tx);font-size:.85rem;font-family:inherit"><span style="font-size:.7rem;color:var(--t4)">cm</span></div></div>'
        + '</div>'
        + '<div id="frontalOverlapPreview" style="margin-top:8px;font-size:.7rem;color:var(--gold2)"></div>';
      _tbx.after(_fob);
    }
  }
  // Show/hide frontal overlap box based on position
  var _fob2 = document.getElementById('frontalOverlapBox');
  if (_fob2) {
    var _isF = (SEL.tampas.posicao||'superior') === 'frontal';
    _fob2.style.display = _isF ? 'block' : 'none';
    if (_isF) {
      var _d=getDims(),_E2=_d.E/100;
      var _olC2=(SEL.tampas.overlapFrontalC||5)/100,_olH2=(SEL.tampas.overlapFrontalH||5)/100;
      var _wa=(_d.C||0)-2*_E2,_ha=(_d.Hcomp||0.45);
      var _wt=_wa+2*_olC2,_ht=_ha+2*_olH2;
      var _pr=document.getElementById('frontalOverlapPreview');
      if(_pr) _pr.textContent='Abertura: '+Math.round(_wa*100)+'×'+Math.round(_ha*100)+' cm  →  Tampa: '+Math.round(_wt*100)+'×'+Math.round(_ht*100)+' cm';
    }
  }

  // 6. Card Custos Indiretos antes do card Avançado
  if(!document.getElementById('cardCustosInd')){
    var allCards3=document.querySelectorAll('.card'), advCard=null;
    allCards3.forEach(function(card){
      var t=card.querySelector('.card-title');
      if(t&&t.textContent&&(t.textContent.indexOf('Avançado')>=0||t.textContent.indexOf('⑨')>=0))advCard=card;
    });
    if(advCard){
      var ciCard=document.createElement('div');ciCard.className='card';ciCard.id='cardCustosInd';
      ciCard.innerHTML='<div class="card-head">'
        +'<span class="card-title">⑩ Custos Indiretos</span>'
        +'<span id="indBadge" class="card-badge" style="background:rgba(212,148,58,.1);color:#d4943a;border-color:rgba(212,148,58,.25)"></span>'
        +'</div>'
        +'<div class="card-body">'
        +'<div class="callout warn" style="font-size:.72rem;margin-bottom:12px">'
        +'Custos reais que impactam a margem: consumíveis, operacional, perdas e risco técnico. '
        +'Configure os percentuais em <strong>Configurações → Custos Indiretos</strong>.'
        +'</div>'
        +'</div>';
      advCard.before(ciCard);
    }
  }
  if(!document.getElementById('_uiEnhanced')){
    var enhMark=document.createElement('div');
    enhMark.id='_uiEnhanced';enhMark.style.display='none';
    document.body.appendChild(enhMark);
    // Add descriptive subtitles under card titles
    var subtitles={
      '② Tipo de Serviço':'Estrutura completa (fundação + revestimento) ou só revestimento',
      '③ Dimensões':'Medidas externas do túmulo, compartimentos e altura',
      '④-A Laje Divisória':'Divisória horizontal entre compartimentos verticais',
      '④-B Tampas Superiores':'Tampas de pedra que fecham os compartimentos',
      '④-C Lápide':'Placa frontal com nome e datas',
      '⑥ Outros Itens':'Itens opcionais: fotos, cruzes, jarros',
      '⑦ Avançado':'Frete, remoção e configurações extras',
    };
    document.querySelectorAll('.card-title').forEach(function(el){
      var txt=el.textContent.trim();
      var sub=subtitles[txt];
      if(sub&&!el.nextElementSibling?.classList?.contains('card-desc')){
        var desc=document.createElement('div');
        desc.className='card-desc';
        desc.style.cssText='font-size:.65rem;color:var(--t4);margin-top:2px;font-weight:400;line-height:1.4';
        desc.textContent=sub;
        var head=el.closest('.card-head');
        if(head){
          var wrap=document.createElement('div');
          el.parentNode.insertBefore(wrap,el);
          wrap.appendChild(el);
          wrap.appendChild(desc);
        }
      }
    });
  }
}
// VALIDAÇÃO
NS.PRESETS=PRESETS;NS.TIPOS_SERV=TIPOS_SERV;NS.ACABAMENTOS=ACABAMENTOS;
NS.MOLDURA_OPCOES=MOLDURA_OPCOES;NS.GRADE_OPCOES=GRADE_OPCOES;NS._TI_SEL_DEF=_TI_SEL_DEF;

})();
