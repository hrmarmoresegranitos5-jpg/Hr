// ═══════════════════════════════════════════════════════════════════════════
// APP-TUM-INLINE.JS — Calculadora de Túmulos v14 embutida no orçamento
// HR Mármores e Granitos
// IMPORTANTE: todo o código do v14 fica isolado num IIFE para não conflitar
// com os globais do app principal (CFG, SEL, toast, fm, init, calcular etc.)
// ═══════════════════════════════════════════════════════════════════════════
(function() {
'use strict';

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

var CFG = JSON.parse(localStorage.getItem('hr_tum_cfg') || 'null');
var HIST = JSON.parse(localStorage.getItem('hr_tum_hist') || '[]');

var DEF_CFG = {
  emp: { nome:'HR Mármores e Granitos', tel:'(74) 99148-4460', end:'Av. Dep. Rodolfo Queiroz, 653 — Centro', cidade:'Pilão Arcado — BA' },
  margem: 35,
  parcMax: 8,
  juros: 12,
  mob: { pedreiro:280, ajudante:160, instalacao:300, montagem:280, transporte:200 },
  civil: { cimento:38, areia:120, brita:150, argamassa:28, ferro38:42, ferro516:28, malha:45, blocos:4.5 },
  groqKey: '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',
  pedras: [
    { id:'p_gabriel', nm:'Preto São Gabriel', cat:'Popular', pr:180, peso:2750, esp:2 },
    { id:'cinza_and', nm:'Cinza Andorinha',   cat:'Popular', pr:170, peso:2700, esp:2 },
    { id:'branco_si', nm:'Branco Siena',      cat:'Médio',   pr:220, peso:2680, esp:2 },
    { id:'verde_lab', nm:'Verde Labrador',    cat:'Médio',   pr:240, peso:2800, esp:2 },
    { id:'absoluto',  nm:'Absoluto Negro',    cat:'Premium', pr:380, peso:2820, esp:2 },
    { id:'carrara',   nm:'Mármore Carrara',   cat:'Premium', pr:420, peso:2600, esp:2 },
    { id:'quartzito', nm:'Quartzito Branco',  cat:'Premium', pr:460, peso:2650, esp:2 }
  ]
};

if (!CFG) CFG = JSON.parse(JSON.stringify(DEF_CFG));
if (!CFG.emp)   CFG.emp   = JSON.parse(JSON.stringify(DEF_CFG.emp));
if (!CFG.emp.nome) CFG.emp.nome = DEF_CFG.emp.nome;
if (!CFG.mob)   CFG.mob   = JSON.parse(JSON.stringify(DEF_CFG.mob));
if (!CFG.civil) CFG.civil = JSON.parse(JSON.stringify(DEF_CFG.civil));
if (!CFG.pedras)CFG.pedras= JSON.parse(JSON.stringify(DEF_CFG.pedras));
if (typeof CFG.groqKey === 'undefined') CFG.groqKey = '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';
// Migração: garantir campo esp em pedras antigas
CFG.pedras.forEach(function(p){ if (!p.esp) p.esp = 2; });

// ══════════════════════════════════════════════
// ESTADO DO ORÇAMENTO
// ══════════════════════════════════════════════

var SEL = {
  preset: 'dupla',
  tipoServ: 'rev',
  matId: 'p_gabriel',
  matCat: 'Todos',
  acabamento: 'POL',
  pecas: { tampa:true, lat_esq:true, lat_dir:true, frente:true, fundo:false, lapide:false, rodape:false },
  opts: { cemiterio:false, polido_extra:false, gravacao:false, cruzGranito:false, foto_porc:false, jarro:false, lapide45:false,
          nCruz:1, nFotos:1, nJarros:1 },
  adv: { fatorCem:20 },
  falecidos: [{ nome:'', nasc:'', obit:'', frase:'' }],
  // ── CONFIGURAÇÃO DE TAMPAS INDIVIDUAIS ──
  tampas: {
    // Moldura/rebaixo lateral (desconto das bordas da área superior)
    moldura: 10,         // cm descontados em cada lado (padrão 10 cm)
    molduraCustom: 10,   // valor personalizado
    // Modo de divisão: linhas × colunas
    linhas: 1,           // divisão no eixo da LARGURA (L)
    colunas: 1,          // divisão no eixo do COMPRIMENTO (C)
    // Propriedades de cada tampa
    espTampa: 3,         // espessura (cm)
    acabTampa: 'POL',    // acabamento das tampas
    argolas: false,      // argolas de içamento
    folgaC: 1,           // folga entre tampas no eixo C (cm)
    folgaL: 1            // folga entre tampas no eixo L (cm)
  },
  // ── CONFIGURAÇÃO DE LÁPIDE ENGROSSADA ──
  lapide: {
    engrossar: 'nao',    // 'nao' | '5cm' | '10cm' | 'custom'
    engCustom: 7,        // valor personalizado (cm)
    pecasEncontro: true  // gerar peças de encontro automaticamente
  }
};
var _TI_SEL_DEF = JSON.parse(JSON.stringify(SEL));

var pendOrc = null;
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

  // Área útil interna (descontando moldura em todos os lados)
  var C_util = Math.max(d.C - 2 * mol, 0.05);
  var L_util = Math.max(d.L - 2 * mol, 0.05);

  // Cada tampa = (área útil − folgas entre peças) ÷ número de divisões
  var C_cada = (C_util - (cols - 1) * fC) / cols;
  var L_cada = (L_util - (lins - 1) * fL) / lins;

  return {
    C_ext: d.C, L_ext: d.L,
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
    h += '<button class="preset'+(on?' on':'')+'" style="font-size:.65rem;padding:4px 10px" '
       + 'onclick="SEL.tampas.acabTampa=\''+a.id+'\';buildTampasAcab();_TI_calcular()">'+a.nm+'</button>';
  });
  el.innerHTML = h;
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
    h += '<button class="preset'+(SEL.matCat===c?' on':'')
       + '" onclick="selMatCat(\''+c+'\')" style="font-size:.65rem;padding:4px 10px">'+c+'</button>';
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
  var filtered = SEL.matCat === 'Todos'
    ? CFG.pedras
    : CFG.pedras.filter(function(p){ return p.cat === SEL.matCat; });

  var h = '';
  filtered.forEach(function(p) {
    var on = p.id === SEL.matId;
    h += '<button class="preset'+(on?' on':'')
       + '" onclick="selMat(\''+p.id+'\')">'
       + p.nm
       + ' <span style="font-size:.58rem;color:var(--gold2)">R$'+p.pr+'</span>'
       + '</button>';
  });
  el.innerHTML = h || '<span style="font-size:.75rem;color:var(--t4)">Nenhuma pedra nesta categoria</span>';

  var mat = CFG.pedras.find(function(x){return x.id===SEL.matId;});
  document.getElementById('matSel').textContent = mat ? (mat.nm + ' · R$ '+mat.pr+'/m²') : '';
  document.getElementById('matInfo').textContent = mat ? ('Categoria: '+mat.cat+' · Peso: '+mat.peso+' kg/m³') : '';
}

function selMat(id) {
  SEL.matId = id;
  buildMatList();
  atualizarEspessuraDaPedra();
  _TI_calcular();
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
  { id:'foto_porc',    nm:'Foto em porcelana',            sub:'Qtd configurável — R$200 cada', qtd:'nFotos' },
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
       + '<div style="font-size:.6rem;color:var(--t4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Falecido '+(i+1)+'</div>'
       + '<input type="text" placeholder="Nome completo" value="'+escHtml(f.nome||'')+'" '
       + 'oninput="SEL.falecidos['+i+'].nome=this.value;atualizarFalLabel()" '
       + 'style="width:100%;background:var(--bg2);border:1px solid var(--bd2);border-radius:6px;padding:7px 10px;color:var(--tx);font-size:.8rem">'
       + '</div>'
       + '<div style="width:72px">'
       + '<div style="font-size:.6rem;color:var(--t4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Nasc.</div>'
       + '<input type="number" placeholder="1940" value="'+(f.nasc||'')+'" min="1880" max="2030" '
       + 'oninput="SEL.falecidos['+i+'].nasc=this.value" '
       + 'style="width:100%;background:var(--bg2);border:1px solid var(--bd2);border-radius:6px;padding:7px 8px;color:var(--tx);font-size:.8rem">'
       + '</div>'
       + '<div style="width:72px">'
       + '<div style="font-size:.6rem;color:var(--t4);text-transform:uppercase;letter-spacing:.05em;margin-bottom:3px">Óbito</div>'
       + '<input type="number" placeholder="2020" value="'+(f.obit||'')+'" min="1900" max="2030" '
       + 'oninput="SEL.falecidos['+i+'].obit=this.value" '
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
       + 'oninput="SEL.falecidos['+i+'].frase=this.value" '
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
  var disp  = (document.getElementById('mDisp') ? document.getElementById('mDisp').value : 'vertical') || 'vertical';
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
    C_cm:C_cm, L_cm:L_cm, Ae_cm:Ae_cm, Ab_cm:Ab_cm, Hc_cm:Hc_cm, Hl_cm:Hl_cm, LapW_cm:LapW_cm, LapH_cm:LapH_cm
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
  if (_TI_ambId) _tumInlineSaveAmb();
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

  // ─── TAMPAS: lógica real de marmoraria ────────────────────────────
  // As tampas NÃO ocupam a área total. Ficam recuadas dentro da moldura.
  if (SEL.pecas.tampa) {
    var td    = getTampasDims();   // usa getDims() internamente
    var acTampa = ACABAMENTOS.find(function(x){ return x.id===(SEL.tampas.acabTampa||'POL'); }) || acab;
    var nTotal  = td.nTotal;
    var m2_cada = td.C_cada * td.L_cada;
    var ml_cada = 2 * (td.C_cada + td.L_cada);  // perímetro de cada tampa

    for (var it = 0; it < nTotal; it++) {
      var col = Math.floor(it / td.lins);
      var lin = it % td.lins;
      pecasCalc.push({
        nm: nTotal===1 ? 'Tampa Superior' : 'Tampa '+(it+1)+'/'+nTotal+' ('+td.cols+'×'+td.lins+')',
        dim: Math.round(td.C_cada*100)+'×'+Math.round(td.L_cada*100)+'cm esp.'+td.espT+'cm',
        m2:  m2_cada,
        ml:  ml_cada,
        prML: acTampa.prML
      });
      m2_bruto += m2_cada;
    }

    // Moldura superior (anel periférico) — a moldura em si também é pedra!
    // Calculada como área externa − área útil interna
    var m2_moldura = td.C_ext * td.L_ext - td.C_util * td.L_util;
    if (m2_moldura > 0.001) {
      pecasCalc.push({
        nm: 'Moldura/Borda Superior (rebaixo '+Math.round(td.mol*100)+'cm cada lado)',
        dim: Math.round(td.C_ext*100)+'×'+Math.round(td.L_ext*100)+' − área tampas',
        m2:  m2_moldura,
        ml:  2*(td.C_ext + td.L_ext),  // somente perímetro EXTERNO da moldura
        prML: acab.prML
      });
      m2_bruto += m2_moldura;
    }
  }
  // Altura visual das peças de pedra = altura total − base de concreto
  // A base de concreto é estrutura, não revestida por painéis de pedra laterais
  var Avis = A - d.Ae;  // altura visual aparente (sem base)

  // Lateral esquerda: altura visual × largura
  if (SEL.pecas.lat_esq) {
    var a = Avis * d.L;
    pecasCalc.push({ nm:'Lateral Esquerda', dim:(Avis*100).toFixed(0)+'×'+d.L_cm+'cm', m2:a, ml:Avis, prML:acab.prML });
    m2_bruto += a;
  }
  // Lateral direita: igual à esquerda
  if (SEL.pecas.lat_dir) {
    var a = Avis * d.L;
    pecasCalc.push({ nm:'Lateral Direita', dim:(Avis*100).toFixed(0)+'×'+d.L_cm+'cm', m2:a, ml:Avis, prML:acab.prML });
    m2_bruto += a;
  }
  // Frente: altura visual × comprimento — borda somente na frente (1 lado)
  if (SEL.pecas.frente) {
    var a = Avis * d.C;
    pecasCalc.push({ nm:'Frente / Frontal', dim:(Avis*100).toFixed(0)+'×'+d.C_cm+'cm', m2:a, ml:d.C, prML:acab.prML });
    m2_bruto += a;
  }
  // Fundo: altura visual × comprimento — sem borda (não visível)
  if (SEL.pecas.fundo) {
    var a = Avis * d.C;
    pecasCalc.push({ nm:'Fundo / Tardoz', dim:(Avis*100).toFixed(0)+'×'+d.C_cm+'cm', m2:a, ml:0, prML:0 });
    m2_bruto += a;
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
    var divLargura = d.L;              // largura da parede divisória = largura do túmulo
    var a_div = divAltura * divLargura * N_div_horiz;
    pecasCalc.push({
      nm: 'Divisória lateral entre compartimentos (×'+N_div_horiz+')',
      dim: (divAltura*100).toFixed(0)+'×'+d.L_cm+'cm × '+N_div_horiz+' un.',
      m2: a_div, ml: 0, prML: 0  // divisórias internas: sem acabamento de borda
    });
    m2_bruto += a_div;
  } else if (N_lajes_div > 0) {
    // Vertical: lajes divisórias horizontais entre compartimentos
    var L_liq = d.L - (SEL.pecas.lat_esq && SEL.pecas.lat_dir ? 2 * Esp_m : Esp_m);
    var C_liq = d.C - (SEL.pecas.frente && SEL.pecas.fundo ? 2 * Esp_m : Esp_m);
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

  // ─── 3. CONSTRUÇÃO CIVIL ──────────────────────────────────────────
  var civil = {
    sacos_cimento: 0, m3_areia: 0, m3_brita: 0,
    sacos_argam:   0, barras_f38: 0, barras_f516: 0,
    m2_malha: 0, unid_blocos: 0, custo: 0
  };

  // Argamassa de assentamento: sempre presente quando há revestimento
  civil.sacos_argam = Math.ceil((m2_bruto * 1.15) / 3.5);

  if (SEL.tipoServ === 'estrutura') {
    // Túmulo de marmoraria: estrutura com paredes finas + lajes
    // NÃO é bloco maciço — tem compartimentos ocos internos

    var e_parede   = 0.14;   // espessura parede de bloco 14cm
    var Perim_base = 2 * (d.C + d.L);

    // Base: apenas anel perimetral de concreto (fundação), não bloco maciço
    // Volume = perímetro × largura parede × espessura base
    var Vol_base_anel = Perim_base * e_parede * d.Ae;
    // Laje de fundo: C × L × 8cm (chão do compartimento)
    var esp_laje_fundo = 0.08;
    var Vol_laje_fundo = d.C * d.L * esp_laje_fundo;

    // Paredes laterais externas: volume real (não maciço, apenas paredes)
    // 2 laterais + frente + fundo, cada e_parede de espessura
    var Vol_paredes = Perim_base * Avis * e_parede;  // Avis = altura visual sem base

    // Lajes de concreto sobre compartimentos (tampa de concreto + divisórias internas)
    var esp_concreto_laje = Math.max(d.Hlaje - Esp_m, 0.06);
    var N_lajes_total = Math.max(d.N, 1);  // pelo menos 1 laje (tampa)
    var Vol_lajes_c   = d.C * d.L * esp_concreto_laje * N_lajes_total;

    // Total concreto/argamassa estrutural
    var Vol_total = Vol_base_anel + Vol_laje_fundo + Vol_lajes_c;

    // Área de alvenaria: paredes laterais para blocos
    var m2_alvenaria = Perim_base * Avis;

    // Traço 1:2:3 — 6 sacos cimento por m³ concreto
    civil.sacos_cimento = Math.ceil(Vol_total * 6);
    civil.m3_areia      = +(( Vol_total * 0.45 ).toFixed(2));
    civil.m3_brita      = +(( (Vol_base_anel + Vol_lajes_c) * 0.70 ).toFixed(2));
    // Blocos apenas nas paredes laterais — descontar aberturas
    civil.barras_f38    = Math.ceil(Perim_base / 3) + N_lajes_div * 2;
    civil.barras_f516   = Math.ceil(Avis * 2) + d.N;
    civil.m2_malha      = d.C * d.L * N_lajes_total;
    // Blocos: paredes externas × rendimento (~13 blocos/m²), descontando area das peças de pedra (que substituem blocos)
    var m2_blocos_real = m2_alvenaria * 0.6;  // 40% já será revestimento de pedra, não precisa de bloco por trás
    civil.unid_blocos   = Math.ceil(m2_blocos_real * 10);

    var cv = CFG.civil;
    civil.custo =
      civil.sacos_cimento * cv.cimento +
      civil.m3_areia      * cv.areia   +
      civil.m3_brita      * cv.brita   +
      civil.sacos_argam   * cv.argamassa +
      civil.barras_f38    * cv.ferro38  +
      civil.barras_f516   * cv.ferro516 +
      civil.m2_malha      * cv.malha    +
      civil.unid_blocos   * cv.blocos;

    if (SEL.opts.cemiterio) civil.custo *= (1 + SEL.adv.fatorCem / 100);

  } else {
    // Só revestimento ou reforma: apenas argamassa de assentamento
    civil.custo = civil.sacos_argam * CFG.civil.argamassa;
    if (SEL.opts.cemiterio) civil.custo *= (1 + SEL.adv.fatorCem / 100);
  }

  // ─── 4. MÃO DE OBRA ──────────────────────────────────────────────
  // Calculado por DIÁRIAS reais: N dias × N pessoas × valor da diária
  // Lógica real de marmoraria: complexidade por m², compartimentos e tipo de serviço
  var mob = CFG.mob;
  var custo_mob = 0;
  var nDias_ped = 0, nDias_ajud = 0;
  var custo_ped = 0, custo_ajud = 0;
  var custo_inst = 0, custo_mont = 0, frete = 0;
  var custo_remocao = 0;

  // Dias de instalação: base real por área e compartimentos
  // 1 marmoreiro instala ~3m² de pedra por dia em túmulo
  var nDiasInst  = Math.max(1, Math.ceil(m2_bruto / 3.0 + d.N * 0.25));
  // Montagem/acabamento: 0,5 dia base + 0,1 por compartimento
  var nDiasMont  = Math.max(1, Math.ceil(0.5 + d.N * 0.10 + m2_bruto * 0.05));

  if (SEL.tipoServ === 'rev') {
    // Só revestimento: 1 instalador + 1 ajudante
    custo_inst = nDiasInst  * mob.instalacao;
    custo_mont = nDiasMont  * mob.montagem;
    frete      = mob.transporte + (SEL.opts.cemiterio ? 80 : 0);
    custo_mob  = custo_inst + custo_mont + frete;

  } else if (SEL.tipoServ === 'estrutura') {
    // Estrutura completa: equipe de obra + equipe de instalação
    // Dias de obra civil: mínimo 2 dias, +1,5 por compartimento
    // Equipe: 1 pedreiro + 1 ajudante por turno
    nDias_ped  = Math.max(2, Math.ceil(2 + d.N * 1.5));
    nDias_ajud = nDias_ped;  // 1 ajudante por cada dia do pedreiro

    // Acréscimos por complexidade
    if (SEL.opts.cemiterio)    { nDias_ped += 1; nDias_ajud += 1; }
    if (d.N >= 3)              { nDias_ped += 1; nDias_ajud += 1; }
    if (SEL.pecas.fundo && SEL.pecas.lat_esq && SEL.pecas.lat_dir) { nDias_ped += 1; }

    custo_ped  = nDias_ped  * mob.pedreiro;
    custo_ajud = nDias_ajud * mob.ajudante;
    custo_inst = nDiasInst  * mob.instalacao;
    custo_mont = nDiasMont  * mob.montagem;
    frete      = mob.transporte + (SEL.opts.cemiterio ? 80 : 0) + (d.N >= 2 ? 60 : 0);
    custo_mob  = custo_ped + custo_ajud + custo_inst + custo_mont + frete;

  } else {
    // Reforma: equipe de remoção + equipe de instalação
    // Remoção: ~4m² removidos por dia
    var nDiasRemocao = Math.max(1, Math.ceil(m2_bruto / 4.0));
    custo_remocao = nDiasRemocao * mob.ajudante;
    custo_inst    = nDiasInst    * mob.instalacao;
    custo_mont    = nDiasMont    * mob.montagem;
    frete         = mob.transporte + (SEL.opts.cemiterio ? 80 : 0);
    custo_mob     = custo_remocao + custo_inst + custo_mont + frete;
  }

  if (SEL.opts.gravacao)     custo_mob += mob.instalacao * 0.3;
  if (SEL.opts.polido_extra && SEL.tipoServ !== 'estrutura') custo_mob += mob.instalacao * 0.2;

  // Alias para compatibilidade com render (armazena custo R$, não dias)
  var dias_ped  = custo_ped;
  var dias_ajud = custo_ajud;
  var dias_inst = custo_inst;
  var dias_mont = custo_mont;
  var dias_remocao = custo_remocao;

  // ─── 5. ITENS OPCIONAIS ───────────────────────────────────────────
  var custo_extras = 0;
  var nCruz   = SEL.opts.cruzGranito ? (SEL.opts.nCruz   || 1) : 0;
  var nFotos  = SEL.opts.foto_porc   ? (SEL.opts.nFotos  || 1) : 0;
  var nJarros = SEL.opts.jarro       ? (SEL.opts.nJarros || 1) : 0;
  if (nCruz   > 0) custo_extras += nCruz   * 350;
  if (nFotos  > 0) custo_extras += nFotos  * 200;
  if (nJarros > 0) custo_extras += nJarros * 280;  // par por unidade marcada
  if (SEL.opts.lapide45) custo_extras += 180;

  // ─── 6. PRAZO ─────────────────────────────────────────────────────
  var prazo_total = 0;
  var dias_fabr   = Math.ceil(m2_total / 6) + d.N;

  if (SEL.tipoServ === 'rev') {
    prazo_total = dias_fabr + Math.ceil(1 + d.N * 0.5);
    prazo_total = Math.max(prazo_total, 2);
    prazo_total = Math.min(prazo_total, 6);
  } else if (SEL.tipoServ === 'estrutura') {
    var dias_obra2  = 3 + d.N * 2;
    var dias_cura   = 7;
    var dias_inst2  = Math.ceil(1 + d.N * 0.5);
    prazo_total     = Math.max(dias_fabr, dias_obra2) + dias_cura + dias_inst2;
    prazo_total     = Math.max(prazo_total, 7);
    prazo_total     = Math.min(prazo_total, 21);
  } else {
    prazo_total = dias_fabr + Math.ceil(1.5 + d.N * 0.5);
    prazo_total = Math.max(prazo_total, 3);
    prazo_total = Math.min(prazo_total, 8);
  }
  if (SEL.opts.cemiterio) prazo_total += 1;

  // ─── 7. TOTAIS ───────────────────────────────────────────────────
  var custo_total  = custo_pedra + custo_acabamento + civil.custo + custo_mob + custo_extras;
  var valor_vista  = custo_total * (1 + CFG.margem / 100);
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
    custo_extras:custo_extras, custo_total:custo_total,
    valor_vista:valor_vista, valor_parc:valor_parc, parc_mensal:parc_mensal,
    margem_reais:margem_reais,
    prazo_total:prazo_total
  };
}

// ══════════════════════════════════════════════
// VALIDAÇÃO
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

  pendOrc = {
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
    preset: SEL.preset,
    tipoServNm: r.ts.nm,
    matNm: r.mat.nm,
    acabNm: r.acab.nm,
    r: r
  };

  // Expõe o resultado para app-tum-integracao.js ler via window
  window._tumLastPendOrc = pendOrc;

  _gel('hdNum').textContent = numStr;
  renderResultado(pendOrc);
  renderProducao();
  showTab('resultado', document.querySelectorAll('.tab')[1]);
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

  // Grid de resumo
  var espMult = {2:'1.00',3:'1.35',4:'1.70',5:'2.10'};
  var grid = [
    { lbl:'m² Revestimento', val:r.m2_total.toFixed(3)+' m²', cl:'', sub:r.m2_bruto.toFixed(3)+' bruto · perda '+r.perdaFinal+'%' },
    { lbl:'m lineares bordas', val:r.ml_total.toFixed(2)+' ml', cl:'', sub:r.acab.nm },
    { lbl:'Peso aprox.', val:Math.round(r.peso_total)+' kg', cl:'', sub:r.d.E+'cm esp. · '+r.mat.peso+' kg/m³' },
    { lbl:'Custo Pedra', val:'R$ '+_TI_fm(r.custo_pedra), cl:'gold', sub:r.mat.nm },
    { lbl:'Material Civil', val:'R$ '+_TI_fm(r.civil.custo), cl:'', sub:r.ts.nm },
    { lbl:'Mão de Obra', val:'R$ '+_TI_fm(r.custo_mob), cl:'', sub:r.ts.nm },
    { lbl:'Acabamentos', val:'R$ '+_TI_fm(r.custo_acabamento), cl:'', sub:r.acab.nm },
    { lbl:'Custo Total', val:'R$ '+_TI_fm(r.custo_total), cl:'', sub:'Sem lucro' },
    { lbl:'Margem '+CFG.margem+'%', val:'R$ '+_TI_fm(r.margem_reais), cl:'grn', sub:'Lucro estimado' }
  ];
  var gh = '';
  grid.forEach(function(g) {
    gh += '<div class="res-card"><div class="res-lbl">'+g.lbl+'</div>'
        + '<div class="res-val '+(g.cl||'')+'" style="font-size:.9rem">'+g.val+'</div>'
        + '<div class="res-sub">'+(g.sub||'')+'</div></div>';
  });
  _gel('rGrid').innerHTML = gh;

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

  dh += '<div class="det-sec">🧱 Material Civil</div>';
  dh += '<div class="det-line"><span class="det-k">Argamassa assentamento AC2/AC3 <span style="color:var(--t4);font-size:.65rem">('+r.m2_bruto.toFixed(2)+'m² ÷ 3,5 +15%)</span></span><span class="det-v">'+r.civil.sacos_argam+' sacos</span></div>';
  if (r.ts.id === 'estrutura') {
    if (r.d.N > 0) {
      dh += '<div class="det-line"><span class="det-k">Lajes de concreto <span style="color:var(--t4);font-size:.65rem">('+r.d.N+' lajes × '+r.d.Hl_cm+'cm — concreto armado)</span></span><span class="det-v">'+r.d.N+' un.</span></div>';
    }
    dh += '<div class="det-line"><span class="det-k">Cimento CP-II (traço 1:2:3)</span><span class="det-v">'+r.civil.sacos_cimento+' sacos</span></div>';
    dh += '<div class="det-line"><span class="det-k">Areia</span><span class="det-v">'+r.civil.m3_areia.toFixed(2)+' m³</span></div>';
    dh += '<div class="det-line"><span class="det-k">Brita 1</span><span class="det-v">'+r.civil.m3_brita.toFixed(2)+' m³</span></div>';
    dh += '<div class="det-line"><span class="det-k">Ferro 3/8"</span><span class="det-v">'+r.civil.barras_f38+' barras</span></div>';
    dh += '<div class="det-line"><span class="det-k">Ferro 5/16"</span><span class="det-v">'+r.civil.barras_f516+' barras</span></div>';
    if (r.civil.m2_malha > 0) dh += '<div class="det-line"><span class="det-k">Malha Q-92 (lajes)</span><span class="det-v">'+r.civil.m2_malha.toFixed(2)+' m²</span></div>';
    dh += '<div class="det-line"><span class="det-k">Blocos 14×19×39</span><span class="det-v">'+r.civil.unid_blocos+' un.</span></div>';
  } else {
    dh += '<div class="det-line" style="font-size:.72rem;color:var(--t4)"><span class="det-k">Cimento, brita, blocos, ferro, lajes</span><span class="det-v">— não incluso</span></div>';
  }
  if (SEL.opts.cemiterio) dh += '<div class="det-line"><span class="det-k">Frete cemitério (+'+SEL.adv.fatorCem+'%)</span><span class="det-v" style="color:var(--amber)">aplicado</span></div>';
  dh += '<div class="det-line"><span class="det-k">Total material civil</span><span class="det-v" style="color:var(--gold2)">R$ '+_TI_fm(r.civil.custo)+'</span></div>';

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
  _gel('rPrazo').textContent =
    'Prazo estimado: aprox. '+r.prazo_total+' dias úteis';

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
  wa += '🪨 *Material:* '+o.matNm+'\n';
  wa += '✨ *Acabamento:* '+o.acabNm+'\n';
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
  wa += '⏱ Prazo: aprox. '+r.prazo_total+' dias úteis\n';
  wa += '━━━━━━━━━━━━━━━━━━━━━\n';
  if (o.obs) wa += '📝 Obs: '+o.obs+'\n━━━━━━━━━━━━━━━━━━━━━\n';
  wa += CFG.emp.nome+'\n'+CFG.emp.tel+'\n'+CFG.emp.end;
  _gel('txtWA').value = wa;
}

// ══════════════════════════════════════════════
// PRINT AREA
// ══════════════════════════════════════════════

function gerarPrintArea(o, r) {
  _gel('pTitle').textContent = CFG.emp.nome + ' — Orçamento de Túmulo';
  var espMult = {2:'1.00',3:'1.35',4:'1.70',5:'2.10'};

  var meta = 'Cliente: '+o.cli;
  if (o.num) meta += ' · '+o.num;
  meta += ' · Data: '+o.date;
  if (Array.isArray(o.fal) && o.fal.length > 0) {
    o.fal.forEach(function(f, i) {
      var s = '\n' + (o.fal.length > 1 ? 'Falecido '+(i+1)+': ' : 'Falecido(a): ') + (f.nome||'Não informado');
      if (f.nasc || f.obit) s += ' ('+( f.nasc||'?')+'–'+(f.obit||'?')+')';
      if (f.frase && f.frase.trim()) s += '\n  "' + f.frase.trim() + '"';
      meta += s;
    });
  } else if (o.fal && typeof o.fal === 'string') {
    meta += '\nFalecido(a): '+o.fal;
  }
  if (o.cemi) meta += ' · Cemitério: '+o.cemi;
  if (o.cid)  meta += ' · Cidade: '+o.cid;
  if (o.quad||o.lote) meta += ' · Quadra: '+o.quad+' · Lote: '+o.lote;
  _gel('pMeta').textContent = meta;

  var body = '';
  body += '<div class="print-section"><div class="print-section-title">Material e Peças</div>';
  body += '<div class="print-row"><span>Material</span><span>'+o.matNm+'</span></div>';
  body += '<div class="print-row"><span>Acabamento</span><span>'+o.acabNm+'</span></div>';
  body += '<div class="print-row"><span>Comprimento × Largura</span><span>'+r.d.C_cm+' × '+r.d.L_cm+' cm</span></div>';
  body += '<div class="print-row"><span>Altura total</span><span>'+(r.A*100).toFixed(0)+' cm</span></div>';
  body += '<div class="print-row"><span>Compartimentos (caixões)</span><span>'+r.d.N+(r.d.N===0?' — Simples':'')+'</span></div>';
  if (r.d.N > 0) {
    body += '<div class="print-row"><span>Alt. livre por compartimento</span><span>'+r.d.Hc_cm+' cm</span></div>';
    body += '<div class="print-row"><span>Espessura laje (concreto+pedra)</span><span>'+r.d.Hl_cm+' cm</span></div>';
    body += '<div class="print-row"><span>Lajes divisórias internas</span><span>'+r.N_lajes_div+' un. + 1 tampa</span></div>';
  }
  body += '<div class="print-row"><span>Base estrutural</span><span>'+r.d.Ae_cm+' cm</span></div>';
  body += '<div class="print-row"><span>Espessura da pedra</span><span>'+r.d.E+' cm</span></div>';
  body += '<div class="print-row"><span>Área total de pedra</span><span>'+r.m2_total.toFixed(3)+' m²</span></div>';
  body += '<div class="print-row"><span>Peso aprox.</span><span>'+Math.round(r.peso_total)+' kg</span></div>';
  body += '</div>';

  body += '<div class="print-section"><div class="print-section-title">Custos</div>';
  body += '<div class="print-row"><span>Pedra</span><span>R$ '+_TI_fm(r.custo_pedra)+'</span></div>';
  body += '<div class="print-row"><span>Acabamento</span><span>R$ '+_TI_fm(r.custo_acabamento)+'</span></div>';
  body += '<div class="print-row"><span>Material Civil ('+r.ts.nm+')</span><span>R$ '+_TI_fm(r.civil.custo)+'</span></div>';
  body += '<div class="print-row"><span>Mão de Obra</span><span>R$ '+_TI_fm(r.custo_mob)+'</span></div>';
  if (r.custo_extras > 0) body += '<div class="print-row"><span>Extras</span><span>R$ '+_TI_fm(r.custo_extras)+'</span></div>';
  body += '</div>';

  body += '<div class="print-total">';
  body += '<div style="font-size:.65rem;color:#8a6a1a;letter-spacing:.1em;text-transform:uppercase;margin-bottom:6px">Valor Final</div>';
  body += '<div class="print-total-val">À Vista: R$ '+_TI_fm(r.valor_vista)+'</div>';
  body += '<div style="font-size:.78rem;margin-top:4px;color:#666">Parcelado: até '+CFG.parcMax+'× de R$ '+_TI_fm(r.parc_mensal)+'</div>';
  body += '<div style="font-size:.75rem;color:#888;margin-top:2px">Prazo estimado: '+r.prazo_total+' dias úteis</div>';
  body += '</div>';

  if (o.obs) {
    body += '<div class="print-section" style="margin-top:12px"><div class="print-section-title">Observações</div>';
    body += '<p style="font-size:.78rem;color:#444;line-height:1.5">'+o.obs+'</p></div>';
  }

  _gel('pBody').innerHTML = body;
  _gel('pFooter').textContent = CFG.emp.nome + ' · ' + CFG.emp.tel + ' · ' + CFG.emp.end + ', ' + CFG.emp.cidade;
}

// ══════════════════════════════════════════════
// AÇÕES
// ══════════════════════════════════════════════

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

function imprimirPDF() {
  if (!pendOrc) { toast('Gere um orçamento primeiro', true); return; }
  window.print();
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
  pendOrc = o;
  renderResultado(o);
  showTab('resultado', document.querySelectorAll('.tab')[1]);
}

function recarregarOrcamento(i) {
  var o = HIST[i];
  if (!o) return;

  // Campos de cliente
  document.getElementById('iCli').value       = o.cli  || '';
  document.getElementById('iTel').value       = o.tel  || '';
  document.getElementById('iCemiterio').value = o.cemi || '';
  document.getElementById('iCidade').value    = o.cid  || '';
  document.getElementById('iQuadra').value    = o.quad || '';
  document.getElementById('iLote').value      = o.lote || '';
  document.getElementById('iObs').value       = o.obs  || '';

  // Restaurar falecidos
  if (Array.isArray(o.fal) && o.fal.length > 0) {
    SEL.falecidos = o.fal.map(function(f){
      return { nome:f.nome||'', nasc:f.nasc||'', obit:f.obit||'', frase:f.frase||'' };
    });
  } else if (o.fal && typeof o.fal === 'string') {
    SEL.falecidos = [{ nome:o.fal, nasc:'', obit:'', frase:'' }];
  } else {
    SEL.falecidos = [{ nome:'', nasc:'', obit:'', frase:'' }];
  }
  buildFalecidos();

  if (o.r && o.r.d) {
    var d = o.r.d;
    document.getElementById('mC').value   = d.C_cm   || Math.round(d.C   * 100);
    document.getElementById('mL').value   = d.L_cm   || Math.round(d.L   * 100);
    document.getElementById('mE').value   = d.E;
    document.getElementById('mGav').value = d.N;
    document.getElementById('mAe').value  = d.Ae_cm  || Math.round(d.Ae  * 100);
    document.getElementById('mAb').value  = d.Ab_cm  != null ? d.Ab_cm : d.Ab;
    if (document.getElementById('mHcomp'))
      document.getElementById('mHcomp').value = d.Hc_cm  || Math.round((d.Hcomp ||0.45)*100);
    if (document.getElementById('mHlaje'))
      document.getElementById('mHlaje').value = d.Hl_cm  || Math.round((d.Hlaje ||0.08)*100);
    if (document.getElementById('mLapW'))
      document.getElementById('mLapW').value  = d.LapW_cm || Math.round((d.LapW  ||0.80)*100);
    if (document.getElementById('mLapH'))
      document.getElementById('mLapH').value  = d.LapH_cm || Math.round((d.LapH  ||0.60)*100);
    if (document.getElementById('mDisp') && d.disp)
      document.getElementById('mDisp').value = d.disp;
  }

  // Restaurar seleções
  if (o.r && o.r.mat)  { SEL.matId      = o.r.mat.id;  }
  if (o.r && o.r.acab) { SEL.acabamento = o.r.acab.id; }
  if (o.r && o.r.ts)   { SEL.tipoServ   = o.r.ts.id;   }
  if (o.preset)         { SEL.preset     = o.preset;    }

  // Restaurar peças
  if (o.r && o.r.pecasCalc) {
    // melhor fonte: SEL.pecas do momento da gravação (não disponível diretamente)
    // reconstituir a partir do que foi salvo no resultado
  }
  // Restaurar opts (nCruz, nFotos, nJarros)
  if (o.r) {
    if (o.r.nCruz   != null) SEL.opts.nCruz   = o.r.nCruz;
    if (o.r.nFotos  != null) SEL.opts.nFotos  = o.r.nFotos;
    if (o.r.nJarros != null) SEL.opts.nJarros = o.r.nJarros;
    // Restaurar flags booleanas dos opts a partir do que foi gasto
    SEL.opts.cruzGranito  = o.r.nCruz   > 0;
    SEL.opts.foto_porc    = o.r.nFotos  > 0;
    SEL.opts.jarro        = o.r.nJarros > 0;
    SEL.opts.cemiterio    = !!(o.r.frete && o.r.frete > (CFG.mob.transporte || 200) + 60);
  }

  buildPresets();
  buildTipoServ();
  buildMatList();
  buildAcabamentos();
  buildPecas();
  buildOpcionais();
  atualizarEspessuraDaPedra();
  _TI_calcular();
  showTab('orcamento', document.querySelectorAll('.tab')[0]);
  toast('✓ Orçamento carregado para edição');
}

function copiarWAHist(i) {
  var o = HIST[i];
  if (!o) return;
  pendOrc = o;
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
    HIST = [];
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
  localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
  buildMatList();
  _TI_calcular();
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
  CFG.pedras.push({ id:'p_'+Date.now(), nm:nm, cat:cat, pr:pr, peso:peso, esp:esp });
  localStorage.setItem('hr_tum_cfg', JSON.stringify(CFG));
  buildPedrasCfg();
  buildMatCats();
  buildMatList();
  fecharModal('modalPedra');
  toast('✓ '+nm+' adicionada!');
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
    hCivil += '<div class="det-line"><span class="det-k">Blocos 14×19×39</span><span class="det-v">'+r.civil.unid_blocos+' un.</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Argamassa de assentamento AC2/3</span><span class="det-v">'+r.civil.sacos_argam+' sacos × 20kg</span></div>';
    hCivil += '<div class="det-line"><span class="det-k">Custo civil total</span><span class="det-v" style="color:var(--gold2)">R$ '+_TI_fm(r.civil.custo)+'</span></div>';
  } else {
    hCivil += '<div class="callout" style="margin:0">Serviço <strong>'+r.ts.nm+'</strong> — estrutura civil não inclusa. Apenas argamassa de assentamento: <strong>'+r.civil.sacos_argam+' sacos AC-II/III</strong>.</div>';
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
  return "/* Wrapping all v14 styles inside .tum-v14-root to avoid collisions */\n.tum-v14-root { font-family: Outfit, sans-serif; }\n.tum-v14-root :root {\n  --bg:      #09090a;\n  --bg2:     #101012;\n  --bg3:     #161618;\n  --bg4:     #1d1d20;\n  --bd:      rgba(255,255,255,.06);\n  --bd2:     rgba(255,255,255,.10);\n  --gold:    #c9a84c;\n  --gold2:   #e8c96a;\n  --gold3:   rgba(201,168,76,.18);\n  --gdim:    rgba(201,168,76,.06);\n  --tx:      #edeae2;\n  --t2:      #b0ab9e;\n  --t3:      #787068;\n  --t4:      #484440;\n  --grn:     #5a9a6a;\n  --red:     #c05a4a;\n  --blue:    #4a7aaa;\n  --amber:   #d4943a;\n  --brd:     rgba(255,255,255,.10);  /* alias de --bd2 */\n}\n*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}\nhtml{scroll-behavior:smooth}\n.tum-v14-root {\n  background:var(--bg);\n  color:var(--tx);\n  font-family:'Outfit',sans-serif;\n  font-size:14px;\n  line-height:1.6;\n  min-height:100vh;\n}\n\n/* ── TOAST ── */\n#toast{\n  position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(80px);\n  background:#1a1a1e;border:1px solid var(--gold);border-radius:10px;\n  padding:10px 20px;font-size:.8rem;color:var(--gold2);\n  transition:transform .3s,opacity .3s;opacity:0;z-index:9999;\n  white-space:nowrap;pointer-events:none;\n  box-shadow: 0 8px 32px rgba(201,168,76,.15);\n}\n#toast.on{transform:translateX(-50%) translateY(0);opacity:1}\n#toast.err{border-color:var(--red);color:#e88a7a}\n\n/* ── HEADER ── */\n.app-header{\n  background:var(--bg2);\n  border-bottom:1px solid var(--bd);\n  padding:14px 20px;\n  display:flex;\n  align-items:center;\n  justify-content:space-between;\n  position:sticky;top:0;z-index:50;\n}\n.header-left{display:flex;align-items:center;gap:14px}\n.header-logo{\n  font-family:'Cormorant Garamond',serif;\n  font-size:1.25rem;font-weight:600;\n  color:var(--gold);letter-spacing:.04em;\n}\n.header-sub{\n  font-family:'DM Mono',monospace;\n  font-size:.6rem;color:var(--t3);\n  letter-spacing:.15em;text-transform:uppercase;\n  border-left:1px solid var(--bd2);\n  padding-left:14px;margin-left:4px;\n}\n.header-right{display:flex;align-items:center;gap:8px}\n.header-badge{\n  font-family:'DM Mono',monospace;\n  font-size:.58rem;color:var(--t4);\n  letter-spacing:.1em;\n}\n\n/* ── TABS ── */\n.tabs{\n  display:flex;\n  border-bottom:1px solid var(--bd);\n  background:var(--bg2);\n  padding:0 20px;\n  gap:2px;\n  overflow-x:auto;\n  scrollbar-width:none;\n}\n.tabs::-webkit-scrollbar{display:none}\n.tab{\n  padding:10px 16px;\n  font-size:.75rem;font-weight:500;\n  color:var(--t3);\n  cursor:pointer;\n  border-bottom:2px solid transparent;\n  transition:all .15s;\n  white-space:nowrap;\n  background:none;border-top:none;border-left:none;border-right:none;\n}\n.tab:hover{color:var(--t2)}\n.tab.on{color:var(--gold);border-bottom-color:var(--gold)}\n\n/* ── MAIN CONTENT ── */\n.page{display:none;padding:20px}\n.page.on{display:block}\n\n/* ── CARDS ── */\n.card{\n  background:var(--bg2);\n  border:1px solid var(--bd);\n  border-radius:14px;\n  overflow:hidden;\n  margin-bottom:14px;\n}\n.card-head{\n  padding:14px 16px;\n  border-bottom:1px solid var(--bd);\n  display:flex;align-items:center;justify-content:space-between;\n}\n.card-title{\n  font-family:'DM Mono',monospace;\n  font-size:.6rem;letter-spacing:.2em;\n  text-transform:uppercase;color:var(--gold);font-weight:500;\n}\n.card-.tum-v14-root {padding:16px}\n\n/* ── FORM ── */\n.f-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}\n.f-grid.cols3{grid-template-columns:1fr 1fr 1fr}\n.f-grid.full{grid-template-columns:1fr}\n.f{display:flex;flex-direction:column;gap:4px}\n.f label{font-size:.62rem;color:var(--t3);letter-spacing:.05em;text-transform:uppercase;font-weight:500}\n.f input,.f select,.f textarea{\n  background:var(--bg3);\n  border:1px solid var(--bd2);\n  border-radius:8px;\n  padding:9px 12px;\n  color:var(--tx);\n  font-family:'Outfit',sans-serif;\n  font-size:.85rem;\n  outline:none;\n  transition:border-color .15s,box-shadow .15s;\n  width:100%;\n}\n.f input:focus,.f select:focus,.f textarea:focus{\n  border-color:var(--gold);\n  box-shadow:0 0 0 3px rgba(201,168,76,.08);\n}\n.f input.invalid{border-color:var(--red)!important}\n.f select option{background:#1a1a1e}\n.f textarea{resize:vertical;min-height:60px}\n.f-hint{font-size:.6rem;color:var(--t4);margin-top:2px}\n.f-err{font-size:.6rem;color:var(--red);margin-top:2px;display:none}\n.f.has-err .f-err{display:block}\n.f.has-err input,.f.has-err select{border-color:var(--red)}\n\n/* ── PRESET PILLS ── */\n.presets{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:16px}\n.preset{\n  padding:6px 14px;\n  border-radius:20px;\n  border:1px solid var(--bd2);\n  background:var(--bg3);\n  font-size:.72rem;color:var(--t2);\n  cursor:pointer;transition:all .15s;\n  font-weight:500;\n}\n.preset:hover{border-color:var(--gold);color:var(--gold)}\n.preset.on{border-color:var(--gold);background:var(--gdim);color:var(--gold2);font-weight:600}\n\n/* ── CHECKBOXES / TOGGLES ── */\n.tog-row{\n  display:flex;align-items:center;justify-content:space-between;\n  padding:10px 0;border-bottom:1px solid var(--bd);\n}\n.tog-row:last-child{border-bottom:none}\n.tog-lbl{font-size:.8rem;color:var(--t2)}\n.tog-sub{font-size:.65rem;color:var(--t4);margin-top:1px}\n.tog{\n  width:40px;height:22px;\n  border-radius:11px;\n  background:var(--bg4);\n  border:1px solid var(--bd2);\n  position:relative;cursor:pointer;\n  transition:background .2s;flex-shrink:0;\n}\n.tog::after{\n  content:'';position:absolute;\n  left:3px;top:3px;\n  width:14px;height:14px;\n  border-radius:50%;\n  background:var(--t3);\n  transition:left .2s,background .2s;\n}\n.tog.on{background:rgba(201,168,76,.2);border-color:var(--gold)}\n.tog.on::after{left:21px;background:var(--gold)}\n\n/* ── BOTÕES ── */\n.btn{\n  padding:10px 20px;\n  border-radius:10px;\n  border:none;\n  font-family:'Outfit',sans-serif;\n  font-size:.82rem;font-weight:600;\n  cursor:pointer;transition:all .15s;\n  display:inline-flex;align-items:center;gap:7px;\n}\n.btn-gold{background:var(--gold);color:#0a0805}\n.btn-gold:hover{background:var(--gold2);transform:translateY(-1px);box-shadow:0 4px 16px rgba(201,168,76,.25)}\n.btn-gold:active{transform:translateY(0)}\n.btn-out{background:transparent;border:1px solid var(--bd2);color:var(--t2)}\n.btn-out:hover{border-color:var(--gold);color:var(--gold)}\n.btn-red{background:rgba(192,90,74,.12);border:1px solid rgba(192,90,74,.3);color:var(--red)}\n.btn-sm{padding:7px 14px;font-size:.73rem}\n.btn-full{width:100%;justify-content:center}\n\n/* ── LIVE PREVIEW BAR ── */\n#liveBar{\n  background:var(--bg2);\n  border-bottom:1px solid var(--bd);\n  padding:8px 20px;\n  display:flex;\n  align-items:center;\n  gap:20px;\n  overflow-x:auto;\n  scrollbar-width:none;\n  min-height:40px;\n}\n#liveBar::-webkit-scrollbar{display:none}\n.lb-item{display:flex;align-items:center;gap:6px;white-space:nowrap}\n.lb-lbl{font-size:.58rem;color:var(--t4);text-transform:uppercase;letter-spacing:.08em;font-family:'DM Mono',monospace}\n.lb-val{font-size:.78rem;font-weight:600;color:var(--gold2)}\n.lb-sep{width:1px;height:20px;background:var(--bd2);flex-shrink:0}\n\n/* ── RESULTADO ── */\n.res-grid{\n  display:grid;\n  grid-template-columns:repeat(3,1fr);\n  gap:10px;margin-bottom:16px;\n}\n.res-card{\n  background:var(--bg3);\n  border:1px solid var(--bd);\n  border-radius:12px;\n  padding:12px 14px;\n  transition:border-color .2s;\n}\n.res-card:hover{border-color:rgba(201,168,76,.2)}\n.res-lbl{font-size:.58rem;color:var(--t4);text-transform:uppercase;letter-spacing:.1em;margin-bottom:4px}\n.res-val{font-size:1.05rem;font-weight:700;color:var(--tx);line-height:1.2}\n.res-val.gold{color:var(--gold2)}\n.res-val.grn{color:var(--grn)}\n.res-val.red{color:var(--red)}\n.res-sub{font-size:.6rem;color:var(--t4);margin-top:2px}\n\n/* ── DETALHE LINHAS ── */\n.det-line{\n  display:flex;justify-content:space-between;\n  align-items:baseline;\n  padding:7px 0;\n  border-bottom:1px solid var(--bd);\n  font-size:.8rem;\n}\n.det-line:last-child{border-bottom:none}\n.det-k{color:var(--t2)}\n.det-v{font-weight:600;color:var(--tx)}\n.det-sec{\n  font-size:.58rem;letter-spacing:.15em;\n  text-transform:uppercase;\n  color:var(--gold);font-weight:700;\n  padding:12px 0 5px;\n}\n\n/* ── TOTAL BOX ── */\n.total-box{\n  background:var(--bg3);\n  border:1px solid rgba(201,168,76,.25);\n  border-radius:12px;\n  padding:16px;\n  margin-top:14px;\n  position:relative;\n  overflow:hidden;\n}\n.total-box::before{\n  content:'';\n  position:absolute;top:0;left:0;right:0;height:1px;\n  background:linear-gradient(90deg,transparent,rgba(201,168,76,.4),transparent);\n}\n.total-main{\n  display:flex;justify-content:space-between;align-items:baseline;\n  margin-bottom:6px;\n}\n.total-lbl{font-size:.72rem;color:var(--t3)}\n.total-val{\n  font-family:'Cormorant Garamond',serif;\n  font-size:2rem;font-weight:700;\n  color:var(--gold2);line-height:1;\n}\n.total-parc{font-size:.75rem;color:var(--t4);margin-top:4px}\n\n/* ── CONFIGURAÇÕES ── */\n.cfg-row{\n  display:flex;justify-content:space-between;align-items:center;\n  padding:10px 0;\n  border-bottom:1px solid var(--bd);\n}\n.cfg-row:last-child{border-bottom:none}\n.cfg-k{font-size:.8rem;color:var(--t2)}\n.cfg-inp{\n  background:var(--bg3);border:1px solid var(--bd2);\n  border-radius:7px;padding:6px 10px;\n  color:var(--tx);font-family:'Outfit',sans-serif;\n  font-size:.82rem;outline:none;width:110px;text-align:right;\n  transition:border-color .15s;\n}\n.cfg-inp:focus{border-color:var(--gold)}\n\n/* ── HISTÓRICO ── */\n.hist-card{\n  background:var(--bg2);border:1px solid var(--bd);\n  border-radius:12px;padding:14px 16px;\n  margin-bottom:10px;cursor:pointer;\n  transition:border-color .15s,transform .15s;\n}\n.hist-card:hover{border-color:rgba(201,168,76,.3);transform:translateY(-1px)}\n.hist-cli{font-size:.95rem;font-weight:600;color:var(--tx);margin-bottom:4px}\n.hist-meta{font-size:.7rem;color:var(--t3);display:flex;gap:12px;flex-wrap:wrap}\n.hist-val{font-size:.85rem;font-weight:700;color:var(--gold2)}\n.hist-actions{display:flex;gap:6px;margin-top:10px}\n\n/* ── BADGE ── */\n.badge{\n  display:inline-block;\n  padding:2px 9px;\n  border-radius:20px;\n  font-size:.58rem;font-weight:700;\n  letter-spacing:.08em;text-transform:uppercase;\n}\n.badge-gold{background:var(--gdim);border:1px solid rgba(201,168,76,.3);color:var(--gold)}\n.badge-grn{background:rgba(90,154,106,.1);border:1px solid rgba(90,154,106,.25);color:var(--grn)}\n.badge-red{background:rgba(192,90,74,.1);border:1px solid rgba(192,90,74,.25);color:var(--red)}\n.badge-blue{background:rgba(74,122,170,.1);border:1px solid rgba(74,122,170,.25);color:var(--blue)}\n\n/* ── SEPARATOR ── */\n.sep{height:1px;background:var(--bd);margin:14px 0}\n\n/* ── CALLOUT ── */\n.callout{\n  background:var(--gdim);\n  border:1px solid rgba(201,168,76,.2);\n  border-radius:10px;\n  padding:12px 14px;\n  font-size:.78rem;color:var(--t2);\n  line-height:1.6;margin-bottom:14px;\n}\n.callout strong{color:var(--gold2)}\n.callout.info{background:rgba(74,122,170,.06);border-color:rgba(74,122,170,.2)}\n.callout.info strong{color:#7aabda}\n.callout.warn{background:rgba(212,148,58,.06);border-color:rgba(212,148,58,.2)}\n.callout.warn strong{color:var(--amber)}\n\n/* ── MOBILE ── */\n@media(max-width:480px){\n  .f-grid.cols3{grid-template-columns:1fr 1fr}\n  .res-grid{grid-template-columns:1fr 1fr}\n}\n@media(max-width:360px){\n  .f-grid{grid-template-columns:1fr}\n  .f-grid.cols3{grid-template-columns:1fr}\n  .res-grid{grid-template-columns:1fr 1fr}\n}\n\n/* ── PRINT ── */\n#printArea{display:none}\n@media print{\n  .tum-v14-root {background:#fff;color:#111;font-size:12px}\n  .tabs,.app-header,.btn,#liveBar,.hist-actions,#printHide{display:none!important}\n  .page{display:none!important}\n  #printArea{display:block!important}\n  .print-header{border-bottom:2px solid #c9a84c;padding-bottom:12px;margin-bottom:16px}\n  .print-title{font-family:'Cormorant Garamond',serif;font-size:1.6rem;color:#8a6a1a}\n  .print-meta{font-size:.8rem;color:#555;margin-top:4px}\n  .print-section{margin-bottom:14px}\n  .print-section-title{font-size:.65rem;letter-spacing:.15em;text-transform:uppercase;color:#8a6a1a;border-bottom:1px solid #eee;padding-bottom:4px;margin-bottom:8px}\n  .print-row{display:flex;justify-content:space-between;font-size:.82rem;padding:3px 0;border-bottom:1px solid #f5f5f5}\n  .print-row:last-child{border-bottom:none}\n  .print-total{background:#fffdf5;border:2px solid #c9a84c;border-radius:8px;padding:12px;margin-top:16px}\n  .print-total-val{font-size:1.4rem;font-weight:700;color:#8a6a1a}\n  .print-footer{margin-top:20px;font-size:.72rem;color:#888;border-top:1px solid #eee;padding-top:8px}\n}\n\n/* ── AVANÇADO ── */\n.adv-toggle{\n  font-size:.7rem;color:var(--t3);cursor:pointer;\n  display:flex;align-items:center;gap:5px;\n  padding:6px 0;user-select:none;\n}\n.adv-toggle:hover{color:var(--gold)}\n.adv-.tum-v14-root {display:none}\n.adv-body.on{display:block}\n\n/* ── PROGRESSO ── */\n.progress-bar{\n  height:3px;\n  background:var(--bd);\n  border-radius:2px;\n  margin-bottom:16px;\n  overflow:hidden;\n}\n.progress-fill{\n  height:100%;\n  background:linear-gradient(90deg,var(--gold),var(--gold2));\n  border-radius:2px;\n  transition:width .4s ease;\n}\n\n/* ── MODAL ── */\n.modal-overlay{\n  display:none;\n  position:fixed;inset:0;\n  background:rgba(0,0,0,.7);\n  z-index:200;\n  align-items:center;justify-content:center;\n  padding:20px;\n}\n.modal-overlay.on{display:flex}\n.modal{\n  background:var(--bg2);\n  border:1px solid var(--bd2);\n  border-radius:16px;\n  padding:24px;\n  width:100%;max-width:420px;\n  max-height:90vh;overflow-y:auto;\n  position:relative;\n}\n.modal-title{\n  font-family:'DM Mono',monospace;\n  font-size:.65rem;letter-spacing:.2em;\n  text-transform:uppercase;color:var(--gold);\n  margin-bottom:16px;\n}\n.modal-close{\n  position:absolute;top:16px;right:16px;\n  background:none;border:none;color:var(--t3);\n  font-size:1.1rem;cursor:pointer;\n  padding:4px 8px;border-radius:6px;\n}\n.modal-close:hover{color:var(--tx);background:var(--bg3)}\n\n/* ── VISUALIZAÇÃO 3D SIMPLIFICADA ── */\n.preview-3d{\n  background:var(--bg3);\n  border:1px solid var(--bd);\n  border-radius:12px;\n  padding:16px;\n  margin-bottom:14px;\n  display:flex;\n  align-items:center;\n  justify-content:center;\n  min-height:120px;\n}\n.tum-svg{width:100%;max-width:300px}\n\n/* ── CAMPO NUMÉRICO COM SETAS ── */\n.num-ctrl{display:flex;align-items:center;gap:0}\n.num-ctrl input{\n  border-radius:0;\n  text-align:center;\n  flex:1;\n  border-left:none;border-right:none;\n}\n.num-btn{\n  background:var(--bg4);\n  border:1px solid var(--bd2);\n  color:var(--t2);\n  width:32px;height:36px;\n  display:flex;align-items:center;justify-content:center;\n  cursor:pointer;font-size:1rem;\n  flex-shrink:0;\n  transition:all .15s;\n}\n.num-btn:first-child{border-radius:8px 0 0 8px}\n.num-btn:last-child{border-radius:0 8px 8px 0}\n.num-btn:hover{background:var(--gdim);color:var(--gold);border-color:rgba(201,168,76,.3)}\n\n/* ── UPLOAD AREA IA ── */\n#iaUploadArea:hover{border-color:var(--gold);background:var(--gdim)}\n\n/* ── STATUS PROGRESS STEPS ── */\n.steps-wrap{display:flex;align-items:center;gap:0;margin-bottom:16px}\n.step{display:flex;align-items:center;gap:6px;flex:1}\n.step-dot{\n  width:20px;height:20px;border-radius:50%;\n  background:var(--bg4);border:1px solid var(--bd2);\n  display:flex;align-items:center;justify-content:center;\n  font-size:.6rem;color:var(--t4);font-weight:700;\n  flex-shrink:0;transition:all .3s;\n}\n.step.done .step-dot{background:rgba(90,154,106,.2);border-color:var(--grn);color:var(--grn)}\n.step.active .step-dot{background:var(--gdim);border-color:var(--gold);color:var(--gold)}\n.step-line{flex:1;height:1px;background:var(--bd);margin:0 4px}\n.step:last-child .step-line{display:none}\n.step-nm{font-size:.58rem;color:var(--t4);white-space:nowrap}\n.step.done .step-nm{color:var(--t3)}\n.step.active .step-nm{color:var(--gold)}";
}

function _TI_getHTML() {
  return '<!-- MODAL EXCLUIR -->\n<div class="modal-overlay" id="modalDel">\n  <div class="modal">\n    <div class="modal-title">Confirmar Exclusão</div>\n    <button class="modal-close" onclick="fecharModal(\'modalDel\')">✕</button>\n    <p style="font-size:.85rem;color:var(--t2);margin-bottom:20px">Tem certeza que deseja excluir este orçamento do histórico? Esta ação não pode ser desfeita.</p>\n    <div style="display:flex;gap:10px">\n      <button class="btn btn-out btn-sm" onclick="fecharModal(\'modalDel\')" style="flex:1;justify-content:center">Cancelar</button>\n      <button class="btn btn-red btn-sm" id="btnConfirmDel" style="flex:1;justify-content:center">🗑 Excluir</button>\n    </div>\n  </div>\n</div>\n\n<!-- MODAL NOVA PEDRA -->\n<div class="modal-overlay" id="modalPedra">\n  <div class="modal">\n    <div class="modal-title">Adicionar Pedra</div>\n    <button class="modal-close" onclick="fecharModal(\'modalPedra\')">✕</button>\n    <div class="f-grid full" style="margin-bottom:12px">\n      <div class="f"><label>Nome da Pedra</label><input id="npNome" type="text" placeholder="Ex: Verde Ubatuba"></div>\n    </div>\n    <div class="f-grid" style="margin-bottom:12px">\n      <div class="f"><label>Categoria</label>\n        <select id="npCat">\n          <option value="Popular">Popular</option>\n          <option value="Médio">Médio</option>\n          <option value="Premium">Premium</option>\n          <option value="Personalizado">Personalizado</option>\n        </select>\n      </div>\n      <div class="f"><label>Preço por m² (R$)</label><input id="npPr" type="number" min="50" max="2000" placeholder="250"></div>\n    </div>\n    <div class="f-grid" style="margin-bottom:20px">\n      <div class="f"><label>Peso (kg/m³)</label><input id="npPeso" type="number" min="1000" max="4000" value="2700" placeholder="2700"></div>\n      <div class="f"><label>Espessura padrão (cm)</label><input id="npEsp" type="number" min="1" max="6" value="2" placeholder="2"></div>\n    </div>\n    <button class="btn btn-gold btn-full" onclick="confirmarAddPedra()">✓ Adicionar Pedra</button>\n  </div>\n</div>\n\n<!-- MODAL ANÁLISE IA -->\n<div class="modal-overlay" id="modalIA">\n  <div class="modal" style="max-width:480px">\n    <div class="modal-title">🤖 Analisar Foto do Túmulo</div>\n    <button class="modal-close" onclick="fecharModal(\'modalIA\')">✕</button>\n\n    <div class="callout info" style="margin-bottom:14px;font-size:.73rem">\n      Envie uma foto do modelo de túmulo. A IA identifica o tipo, disposição, acabamentos e preenche os campos automaticamente.<br>\n      <span style="color:var(--gold2)">✦ Se o material ou acabamento não existir, é criado automaticamente.</span><br>\n      <span style="color:var(--t4);font-size:.68rem">⚠ Se aparecer erro de chave, vá em Configurações → IA e verifique se a chave não tem restrição de domínio.</span>\n    </div>\n\n    <!-- Upload área -->\n    <div id="iaUploadArea" onclick="document.getElementById(\'iaFileInput\').click()"\n      style="border:2px dashed var(--bd2);border-radius:12px;padding:24px;text-align:center;cursor:pointer;transition:border-color .2s;margin-bottom:12px;position:relative">\n      <input type="file" id="iaFileInput" accept="image/*" style="display:none" onchange="iaOnFileSelect(this)">\n      <div id="iaUploadIcon" style="font-size:2rem;margin-bottom:6px">📷</div>\n      <div id="iaUploadTxt" style="font-size:.78rem;color:var(--t3)">Toque para selecionar uma foto</div>\n      <img id="iaPreviewImg" style="display:none;max-width:100%;border-radius:8px;margin-top:10px" alt="preview">\n    </div>\n\n    <!-- Descrição opcional -->\n    <div class="f" style="margin-bottom:14px">\n      <label>Descrição adicional (opcional)</label>\n      <textarea id="iaDesc" style="min-height:60px" placeholder="Ex: 4 gavetas lado a lado, mármore branco, lápide com chanfro 45°, 2 jarros..."></textarea>\n    </div>\n\n    <!-- Status -->\n    <div id="iaStatus" style="display:none;font-size:.75rem;color:var(--gold2);margin-bottom:10px;text-align:center;padding:8px;background:var(--gdim);border-radius:8px"></div>\n\n    <div style="display:flex;gap:10px">\n      <button class="btn btn-out btn-sm" onclick="fecharModal(\'modalIA\')" style="flex:1;justify-content:center">Cancelar</button>\n      <button class="btn btn-gold" id="iaBtnAnalisar" onclick="iaAnalisar()" style="flex:2;justify-content:center">\n        🔍 Analisar com IA\n      </button>\n    </div>\n  </div>\n</div>\n\n<!-- PRINT AREA -->\n<div id="printArea">\n  <div class="print-header">\n    <div class="print-title" id="pTitle">HR Mármores e Granitos</div>\n    <div class="print-meta" id="pMeta"></div>\n  </div>\n  <div id="pBody"></div>\n  <div class="print-footer" id="pFooter"></div>\n</div>\n\n<!-- IDs ocultos para compatibilidade com o motor interno -->\n<span id="hdNum" style="display:none"></span>\n\n<!-- ═══════════════════════════════ ORÇAMENTO ═══════════════════════════════ -->\n<div id="pg-orcamento" class="page on">\n\n  <!-- BOTÃO IA -->\n  <div style="margin-bottom:14px">\n    <button class="btn btn-out btn-full" style="border-color:rgba(201,168,76,.3);gap:10px;padding:12px 20px" onclick="abrirModal(\'modalIA\')">\n      <span style="font-size:1.1rem">🤖</span>\n      <span style="flex:1;text-align:left">\n        <span style="color:var(--gold2);font-weight:600;font-size:.82rem">Analisar foto do modelo</span><br>\n        <span style="font-size:.65rem;color:var(--t4);font-weight:400">Envie uma imagem e a IA preenche os campos automaticamente</span>\n      </span>\n      <span style="font-size:.65rem;color:var(--t4)">IA ›</span>\n    </button>\n  </div>\n\n  <!-- PROGRESSO -->\n  <div class="steps-wrap" id="stepsWrap">\n    <div class="step" id="sCliente"><div class="step-dot">1</div><div class="step-nm">Cliente</div><div class="step-line"></div></div>\n    <div class="step" id="sTipo"><div class="step-dot">2</div><div class="step-nm">Tipo</div><div class="step-line"></div></div>\n    <div class="step" id="sMedidas"><div class="step-dot">3</div><div class="step-nm">Medidas</div><div class="step-line"></div></div>\n    <div class="step" id="sMaterial"><div class="step-dot">4</div><div class="step-nm">Material</div><div class="step-line"></div></div>\n    <div class="step" id="sItens"><div class="step-dot">5</div><div class="step-nm">Itens</div></div>\n  </div>\n\n  <!-- CLIENTE -->\n  <div class="card" id="cardCliente">\n    <div class="card-head">\n      <span class="card-title">① Cliente</span>\n      <span id="statusCliente" style="font-size:.65rem;color:var(--t4)"></span>\n    </div>\n    <div class="card-body">\n      <div class="f-grid">\n        <div class="f" id="fCli"><label>Nome do Cliente *</label><input id="iCli" type="text" placeholder="Ex: Maria Silva" oninput="validarCli();_TI_calcular()"><div class="f-err">Nome obrigatório</div></div>\n        <div class="f"><label>Telefone</label><input id="iTel" type="tel" placeholder="(74) 99999-9999" oninput="mascaraTel(this)"></div>\n      </div>\n      <div class="f-grid">\n        <div class="f"><label>Cemitério</label><input id="iCemiterio" type="text" placeholder="Nome do cemitério"></div>\n        <div class="f"><label>Cidade</label><input id="iCidade" type="text" placeholder="Pilão Arcado — BA"></div>\n      </div>\n      <div class="f-grid cols3">\n        <div class="f" style="grid-column:1/-1">\n          <label>Falecido(a) — <span id="falLabelQtd" style="color:var(--gold2);font-weight:600">1 pessoa</span></label>\n          <div id="falecidosLista" style="display:flex;flex-direction:column;gap:8px;margin-top:4px"></div>\n          <div style="display:flex;gap:8px;margin-top:6px">\n            <button class="btn btn-out" style="font-size:.7rem;padding:5px 12px" onclick="addFalecido()">+ Adicionar falecido</button>\n            <span style="font-size:.67rem;color:var(--t4);align-self:center">Independente do nº de compartimentos</span>\n          </div>\n        </div>\n        <div class="f"><label>Quadra</label><input id="iQuadra" type="text" placeholder="Q-12"></div>\n        <div class="f"><label>Lote / Número</label><input id="iLote" type="text" placeholder="L-04"></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- PRESET / TIPO -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">② Tipo de Túmulo</span>\n      <span id="presetAtivo" class="badge badge-gold" style="display:none"></span>\n    </div>\n    <div class="card-body">\n      <div class="presets" id="presetList"></div>\n    </div>\n  </div>\n\n  <!-- TIPO DE SERVIÇO -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">③ Tipo de Serviço</span>\n      <span id="tipoServicoLabel" class="badge badge-gold"></span>\n    </div>\n    <div class="card-body">\n      <div class="presets" id="tipoServList"></div>\n      <div id="tipoServDesc" class="callout" style="margin-top:10px;margin-bottom:0"></div>\n    </div>\n  </div>\n\n  <!-- MEDIDAS -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">④ Medidas</span>\n      <span id="alturaCalc" style="font-size:.7rem;color:var(--gold2);font-weight:600"></span>\n    </div>\n    <div class="card-body">\n      <div class="callout" style="margin-bottom:10px;">\n        <strong>Todas as medidas em centímetros (cm).</strong> Defina a altura total final manualmente <em>ou</em> deixe o sistema calcular automaticamente:<br>\n        <span style="font-size:.72rem;color:var(--t3)">A = Base + (N° compartimentos × altura do compartimento) + laje de tampa</span>\n      </div>\n\n      <!-- ALTURA TOTAL MANUAL -->\n      <div class="f-grid" style="margin-bottom:4px">\n        <div class="f">\n          <label>⬛ Altura Total Final do Túmulo (cm) — <span style="color:var(--gold2)">manual</span></label>\n          <input id="mAlturaFinal" type="number" step="1" min="0" max="300" placeholder="Deixe vazio = calcular auto"\n            oninput="_TI_calcular()"\n            style="border-color:rgba(201,168,76,.35)">\n          <span class="f-hint">Ex: 45, 60, 80, 100 cm. Quando preenchido, substitui o cálculo automático de altura.</span>\n        </div>\n        <div class="f" style="justify-content:flex-end;padding-bottom:4px">\n          <button class="btn btn-out btn-sm" onclick="document.getElementById(\'mAlturaFinal\').value=\'\';_TI_calcular()" style="margin-top:auto">↺ Usar automático</button>\n        </div>\n      </div>\n      <div class="callout info" style="margin-bottom:14px;font-size:.73rem;">\n        <strong>⚠ Sobre os compartimentos (gavetas):</strong> Cada "gaveta" acomoda um caixão.<br>\n        — <strong>Vertical (um sobre o outro):</strong> Entre dois compartimentos existe uma <strong>laje de concreto + pedra</strong> que é a tampa do inferior e o piso do superior. A última laje é a tampa final.<br>\n        — <strong>Horizontal (lado a lado):</strong> Os compartimentos ficam enfileirados na mesma altura, separados por <strong>divisórias verticais de pedra</strong>. A altura total é a de 1 compartimento + laje de tampa.\n      </div>\n\n      <!-- PREVIEW SVG -->\n      <div class="preview-3d" id="prevDiv">\n        <svg id="prevSVG" class="tum-svg" viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"></svg>\n      </div>\n      <!-- Info técnica do preview -->\n      <div id="prevInfo" style="font-size:.62rem;color:var(--t4);text-align:center;margin-top:4px;margin-bottom:12px;font-family:\'DM Mono\',monospace;letter-spacing:.05em"></div>\n\n      <div class="f-grid cols3">\n        <div class="f">\n          <label>Comprimento (cm)</label>\n          <input id="mC" type="number" step="1" min="50" max="500" placeholder="200" oninput="_TI_calcular()">\n          <span class="f-hint">Tampa, frente, fundo, base</span>\n        </div>\n        <div class="f">\n          <label>Largura (cm)</label>\n          <input id="mL" type="number" step="1" min="30" max="300" placeholder="70" oninput="_TI_calcular()">\n          <span class="f-hint">Tampa, laterais, base</span>\n        </div>\n        <div class="f">\n          <label>Espessura pedra (cm)</label>\n          <select id="mE" onchange="_TI_calcular()">\n            <option value="2">2 cm</option>\n            <option value="3" selected>3 cm</option>\n            <option value="4">4 cm</option>\n            <option value="5">5 cm</option>\n          </select>\n          <span class="f-hint">2–3cm lateral / 3–4cm tampa</span>\n        </div>\n      </div>\n      <div class="f-grid">\n        <div class="f">\n          <label>Nº de Compartimentos</label>\n          <select id="mGav" onchange="_TI_calcular()">\n            <option value="0">0 — Simples (sem comp.)</option>\n            <option value="1">1 Compartimento</option>\n            <option value="2" selected>2 Compartimentos</option>\n            <option value="3">3 Compartimentos</option>\n            <option value="4">4 Compartimentos</option>\n          </select>\n          <span class="f-hint">Cada compartimento = 1 caixão + laje</span>\n        </div>\n        <div class="f">\n          <label>Disposição dos compartimentos</label>\n          <select id="mDisp" onchange="_TI_calcular()">\n            <option value="vertical">Vertical (um sobre o outro)</option>\n            <option value="horizontal">Horizontal (lado a lado)</option>\n          </select>\n          <span class="f-hint">Vertical = empilhado · Horizontal = lado a lado</span>\n        </div>\n      </div>\n      <div class="f-grid">\n        <div class="f">\n          <label>Alt. livre por compartimento (cm)</label>\n          <input id="mHcomp" type="number" step="1" min="30" max="80" value="45" oninput="_TI_calcular()">\n          <span class="f-hint">Espaço interno p/ caixão (padrão 45cm)</span>\n        </div>\n        <div class="f">\n          <label>Espessura da laje (cm)</label>\n          <input id="mHlaje" type="number" step="1" min="6" max="20" value="8" oninput="_TI_calcular()">\n          <span class="f-hint">Laje concreto + revestimento pedra</span>\n        </div>\n      </div>\n      <div class="f-grid cols3">\n        <div class="f">\n          <label>Base estrutural (cm)</label>\n          <input id="mAe" type="number" step="1" min="10" max="100" value="30" oninput="_TI_calcular()">\n          <span class="f-hint">Altura da base de concreto</span>\n        </div>\n        <div class="f">\n          <label>Altura rodapé de pedra (cm)</label>\n          <input id="mAb" type="number" step="1" min="0" max="20" value="8" oninput="_TI_calcular()">\n          <span class="f-hint">0 = sem rodapé de pedra</span>\n        </div>\n        <div class="f">\n          <label>Largura da lápide (cm)</label>\n          <input id="mLapW" type="number" step="1" min="20" max="200" value="80" oninput="_TI_calcular()">\n          <span class="f-hint">Largura — padrão 80 cm</span>\n        </div>\n        <div class="f">\n          <label>Altura da lápide (cm)</label>\n          <input id="mLapH" type="number" step="1" min="20" max="150" value="60" oninput="_TI_calcular()">\n          <span class="f-hint">Altura — padrão 60 cm</span>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- TAMPAS INDIVIDUAIS -->\n  <div class="card" id="cardTampas">\n    <div class="card-head">\n      <span class="card-title">④-B Tampas Superiores</span>\n      <span id="tampasSummary" style="font-size:.65rem;color:var(--gold2);font-family:\'DM Mono\',monospace"></span>\n    </div>\n    <div class="card-body">\n\n      <!-- MOLDURA / REBAIXO -->\n      <div style="font-size:.58rem;color:var(--gold);font-family:\'DM Mono\',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px">① Moldura / Rebaixo Lateral</div>\n      <div class="callout info" style="margin-bottom:12px;font-size:.73rem">\n        As tampas ficam <strong>recuadas dentro da moldura</strong> do túmulo — não ocupam a área total superior. Defina o desconto de borda em cada lado.\n      </div>\n      <div class="presets" id="molduraPresets"></div>\n      <div id="molduraCustomBox" style="display:none;margin-bottom:12px">\n        <div class="f-grid cols3">\n          <div class="f">\n            <label>Moldura personalizada (cm)</label>\n            <input type="number" id="tMolduraCustom" min="0" max="30" value="10"\n              oninput="SEL.tampas.molduraCustom=+this.value;atualizarTampasUI();_TI_calcular()">\n            <span class="f-hint">Desconto em cada lado</span>\n          </div>\n        </div>\n      </div>\n\n      <!-- MODO DE DIVISÃO -->\n      <div class="sep"></div>\n      <div style="font-size:.58rem;color:var(--gold);font-family:\'DM Mono\',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px">② Modo de Divisão das Tampas</div>\n      <div class="presets" id="gradePresets"></div>\n\n      <!-- CONFIGURAÇÃO MANUAL DE GRADE -->\n      <div id="gradeCustomBox" style="display:none;margin-bottom:0">\n        <div class="f-grid">\n          <div class="f">\n            <label>Colunas (eixo comprimento)</label>\n            <div class="num-ctrl">\n              <div class="num-btn" onclick="adjGrade(\'colunas\',-1)">−</div>\n              <input type="number" id="tColunas" min="1" max="4" value="1"\n                oninput="SEL.tampas.colunas=Math.max(1,+this.value);atualizarTampasUI();_TI_calcular()">\n              <div class="num-btn" onclick="adjGrade(\'colunas\',+1)">+</div>\n            </div>\n          </div>\n          <div class="f">\n            <label>Linhas (eixo largura)</label>\n            <div class="num-ctrl">\n              <div class="num-btn" onclick="adjGrade(\'linhas\',-1)">−</div>\n              <input type="number" id="tLinhas" min="1" max="4" value="1"\n                oninput="SEL.tampas.linhas=Math.max(1,+this.value);atualizarTampasUI();_TI_calcular()">\n              <div class="num-btn" onclick="adjGrade(\'linhas\',+1)">+</div>\n            </div>\n          </div>\n        </div>\n      </div>\n\n      <!-- FOLGAS -->\n      <div class="sep"></div>\n      <div style="font-size:.58rem;color:var(--gold);font-family:\'DM Mono\',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px">③ Folgas e Espessura</div>\n      <div class="f-grid cols3">\n        <div class="f">\n          <label>Folga entre tampas — C (cm)</label>\n          <input type="number" id="tFolgaC" min="0" max="5" step="0.5" value="1"\n            oninput="SEL.tampas.folgaC=+this.value;atualizarTampasUI();_TI_calcular()">\n          <span class="f-hint">Junta no comprimento</span>\n        </div>\n        <div class="f">\n          <label>Folga entre tampas — L (cm)</label>\n          <input type="number" id="tFolgaL" min="0" max="5" step="0.5" value="1"\n            oninput="SEL.tampas.folgaL=+this.value;atualizarTampasUI();_TI_calcular()">\n          <span class="f-hint">Junta na largura</span>\n        </div>\n        <div class="f">\n          <label>Espessura das tampas (cm)</label>\n          <select id="tEspTampa" onchange="SEL.tampas.espTampa=+this.value;atualizarTampasUI();_TI_calcular()">\n            <option value="2">2 cm</option>\n            <option value="3" selected>3 cm</option>\n            <option value="4">4 cm</option>\n            <option value="5">5 cm</option>\n          </select>\n        </div>\n      </div>\n\n      <!-- ACABAMENTO + ARGOLAS -->\n      <div class="f-grid" style="margin-top:4px">\n        <div class="f">\n          <label>Acabamento das tampas</label>\n          <div id="tampasAcabList" style="display:flex;flex-wrap:wrap;gap:6px;margin-top:4px"></div>\n        </div>\n        <div class="f">\n          <label>Argolas de içamento</label>\n          <div class="tog-row" style="border:none;padding:6px 0 0 0">\n            <div><div class="tog-lbl">Argolas metálicas</div><div class="tog-sub">Tampas pesadas (&gt;60 kg)</div></div>\n            <div class="tog" id="togArgolas"\n              onclick="SEL.tampas.argolas=!SEL.tampas.argolas;this.classList.toggle(\'on\',SEL.tampas.argolas);_TI_calcular()"></div>\n          </div>\n        </div>\n      </div>\n\n      <!-- ④ PREVIEW ESQUEMÁTICO SVG -->\n      <div class="sep"></div>\n      <div style="font-size:.58rem;color:var(--gold);font-family:\'DM Mono\',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px">④ Vista Superior — Esquema das Tampas</div>\n      <div style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px">\n        <svg id="tampasSVG" style="width:100%;display:block;max-height:200px" viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg"></svg>\n      </div>\n\n      <!-- ⑤ TABELA DE PEÇAS -->\n      <div id="tampasPreviewBox" style="background:var(--bg3);border:1px solid var(--bd);border-radius:10px;padding:12px;margin-top:10px">\n        <div style="font-size:.58rem;color:var(--gold);font-family:\'DM Mono\',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:8px">⑤ Detalhamento por Tampa</div>\n        <div id="tampasPreviewRows"></div>\n        <div id="tampasTotais" style="margin-top:8px;padding-top:8px;border-top:1px solid var(--bd)"></div>\n      </div>\n\n    </div>\n  </div>\n\n  <!-- LÁPIDE ENGROSSADA -->\n  <div class="card" id="cardLapideEng" style="display:none">\n    <div class="card-head">\n      <span class="card-title">④-C Lápide Engrossada</span>\n      <span id="lapideEngBadge" class="badge badge-gold" style="display:none">Engrossada</span>\n    </div>\n    <div class="card-body">\n      <div class="callout" style="margin-bottom:12px;font-size:.73rem">\n        <strong>Lápide de marmoraria real:</strong> não é uma chapa simples. O sistema calcula frente, traseira e peças de encontro (superior + laterais) para criar espessura visual premium.\n      </div>\n      <div class="f-grid full" style="margin-bottom:12px">\n        <div class="f">\n          <label>Engrossamento da lápide</label>\n          <div class="presets" id="engList"></div>\n        </div>\n      </div>\n      <!-- Preview peças de encontro (aparece quando ativado) -->\n      <div id="encontroBox" style="display:none">\n        <div class="sep"></div>\n        <div style="font-size:.58rem;color:var(--gold);font-family:\'DM Mono\',monospace;letter-spacing:.15em;text-transform:uppercase;margin-bottom:10px">Peças de Encontro Geradas Automaticamente</div>\n        <div class="callout info" style="font-size:.72rem;margin-bottom:10px">\n          Estas peças criam o efeito de espessura premium na lápide. São coladas nas bordas da peça principal, formando uma moldura estrutural.\n        </div>\n        <div id="encontroRows"></div>\n        <div class="tog-row" style="margin-top:10px">\n          <div><div class="tog-lbl">Incluir peças de encontro no orçamento</div><div class="tog-sub">Superior + 2 laterais — calculadas automaticamente</div></div>\n          <div class="tog on" id="togEncontro" onclick="SEL.lapide.pecasEncontro=!SEL.lapide.pecasEncontro;this.classList.toggle(\'on\',SEL.lapide.pecasEncontro);renderEncontroBox();_TI_calcular()"></div>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- MATERIAL -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑤ Material da Pedra</span>\n      <span id="matSel" style="font-size:.72rem;color:var(--gold2)"></span>\n    </div>\n    <div class="card-body">\n      <div id="matCats" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px"></div>\n      <div id="matList" style="display:flex;flex-wrap:wrap;gap:7px;margin-bottom:4px"></div>\n      <div style="font-size:.65rem;color:var(--t4);margin-top:6px" id="matInfo"></div>\n    </div>\n  </div>\n\n  <!-- PEÇAS INCLUÍDAS -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑥ Revestimento</span>\n      <span id="pecasCount" style="font-size:.65rem;color:var(--t3)"></span>\n    </div>\n    <div class="card-body">\n      <div id="pecasTogList"></div>\n    </div>\n  </div>\n\n  <!-- ACABAMENTO -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑦ Acabamento das Bordas</span>\n    </div>\n    <div class="card-body">\n      <div class="presets" id="acabList"></div>\n    </div>\n  </div>\n\n  <!-- OPCIONAIS -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑧ Itens Opcionais</span>\n    </div>\n    <div class="card-body">\n      <div id="opcionaisList"></div>\n    </div>\n  </div>\n\n  <!-- AVANÇADO -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">⑨ Avançado</span>\n    </div>\n    <div class="card-body">\n      <div id="avancadoList"></div>\n    </div>\n  </div>\n\n  <!-- OBSERVAÇÕES -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">⑩ Observações</span></div>\n    <div class="card-body">\n      <div class="f full">\n        <textarea id="iObs" placeholder="Detalhes especiais, instruções de instalação, pedidos do cliente..."></textarea>\n      </div>\n    </div>\n  </div>\n\n  <!-- Botão oculto: acionado por _TI_tumCalcularAuto() do app-tum-integracao.js -->\n  <button id="btnTumCalcAuto" style="display:none" onclick="calcularFinal()"></button>\n\n</div>\n\n<!-- ═══════════════════════════════ RESULTADO ═══════════════════════════════ -->\n<div id="pg-resultado" class="page">\n\n  <div id="resEmpty" style="text-align:center;padding:60px 20px;color:var(--t4)">\n    <div style="font-size:2.5rem;margin-bottom:12px">⚰️</div>\n    <div style="font-size:.85rem">Preencha o orçamento e toque em <strong style="color:var(--gold)">Gerar Orçamento</strong></div>\n  </div>\n\n  <div id="resConteudo" style="display:none">\n\n    <!-- CABEÇALHO DO RESULTADO -->\n    <div class="card" style="background:linear-gradient(135deg,var(--bg2),rgba(201,168,76,.04))">\n      <div class="card-body">\n        <div style="font-size:.58rem;letter-spacing:.2em;text-transform:uppercase;color:var(--gold3);margin-bottom:5px;font-family:\'DM Mono\',monospace">Orçamento Gerado</div>\n        <div id="rCli" style="font-family:\'Cormorant Garamond\',serif;font-size:1.7rem;font-weight:700;color:var(--gold2);line-height:1.1;margin-bottom:4px"></div>\n        <div id="rMeta" style="font-size:.72rem;color:var(--t3);display:flex;gap:12px;flex-wrap:wrap"></div>\n      </div>\n    </div>\n\n    <!-- RESUMO NÚMEROS -->\n    <div class="res-grid" id="rGrid"></div>\n\n    <!-- DETALHAMENTO -->\n    <div class="card">\n      <div class="card-head"><span class="card-title">Detalhamento Completo</span></div>\n      <div class="card-body" id="rDetalhe"></div>\n    </div>\n\n    <!-- VALOR FINAL -->\n    <div class="total-box">\n      <div class="total-main">\n        <span class="total-lbl">À Vista (sem juros)</span>\n        <span class="total-val" id="rVista">R$ 0</span>\n      </div>\n      <div id="rParc" class="total-parc"></div>\n      <div id="rPrazo" style="font-size:.7rem;color:var(--t3);margin-top:6px"></div>\n    </div>\n\n    <!-- AÇÕES -->\n    <div style="display:flex;gap:10px;margin-top:14px;flex-wrap:wrap;margin-bottom:30px">\n      <button class="btn btn-out btn-sm" onclick="copiarWA()">📲 Copiar WhatsApp</button>\n      <button class="btn btn-out btn-sm" onclick="imprimirPDF()">🖨 Imprimir / PDF</button>\n      <button class="btn btn-gold btn-sm" onclick="salvarHistorico()">💾 Salvar</button>\n    </div>\n\n    <textarea id="txtWA" style="position:absolute;left:-9999px" readonly></textarea>\n\n  </div>\n</div>\n\n<!-- ═══════════════════════════════ PLANTA TÉCNICA ═══════════════════════════════ -->\n<div id="pg-planta" class="page">\n\n  <!-- Resumo cards -->\n  <div id="plt-resumo" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px"></div>\n\n  <!-- Corte Frontal -->\n  <div class="card" style="overflow:hidden;margin-bottom:12px">\n    <div class="card-head"><span class="card-title">Corte Frontal — Vista em Elevação</span></div>\n    <div class="card-body" style="padding:8px">\n      <svg id="plt-svgCorte" style="width:100%;display:block" viewBox="0 0 520 300" xmlns="http://www.w3.org/2000/svg"></svg>\n    </div>\n  </div>\n\n  <!-- Planta Baixa -->\n  <div class="card" style="overflow:hidden;margin-bottom:12px">\n    <div class="card-head"><span class="card-title">Planta Baixa — Vista Superior</span></div>\n    <div class="card-body" style="padding:8px">\n      <svg id="plt-svgPlanta" style="width:100%;display:block" viewBox="0 0 520 240" xmlns="http://www.w3.org/2000/svg"></svg>\n    </div>\n  </div>\n\n  <!-- Tabela de Pedras -->\n  <div class="card" style="overflow:hidden;margin-bottom:12px">\n    <div class="card-head">\n      <span class="card-title">Lista de Pedras — Medidas Exatas</span>\n      <span id="plt-totalPecas" style="font-size:.65rem;color:var(--t3);font-family:\'DM Mono\',monospace"></span>\n    </div>\n    <div style="overflow-x:auto">\n      <table style="width:100%;border-collapse:collapse;font-size:.78rem">\n        <thead>\n          <tr>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Peça</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Qt</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Comp.</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Larg.</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Esp.</th>\n            <th style="padding:8px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.57rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd)">Observação</th>\n          </tr>\n        </thead>\n        <tbody id="plt-tblBody"></tbody>\n      </table>\n    </div>\n  </div>\n\n  <!-- Legenda -->\n  <div style="background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:12px 14px;font-size:.72rem;color:var(--t2);line-height:1.8;margin-bottom:20px">\n    <strong style="color:var(--gold2)">Legenda:</strong><br>\n    <span style="color:rgba(201,168,76,.75)">▪ Hachura dourada</span> = espessura da pedra + argamassa &nbsp;\n    <span style="color:rgba(255,140,0,.75)">▪ Laranja</span> = camada de argamassa (1 cm) &nbsp;\n    <span style="color:rgba(74,122,170,.75)">▪ Azul</span> = espaço interno dos compartimentos<br>\n    Todas as medidas já descontam <strong>1 cm de argamassa por face</strong> de assentamento.\n  </div>\n\n</div>\n\n<!-- ═══════════════════════════════ PRODUÇÃO ═══════════════════════════════ -->\n<div id="pg-producao" class="page">\n  <div id="prodEmpty" style="text-align:center;padding:60px 20px;color:var(--t4)">\n    <div style="font-size:2.5rem;margin-bottom:12px">🔩</div>\n    <div style="font-size:.85rem">Gere um orçamento primeiro para ver o detalhamento de produção</div>\n  </div>\n  <div id="prodConteudo" style="display:none">\n\n    <!-- RESUMO ESTRUTURAL -->\n    <div class="card" style="margin-bottom:14px">\n      <div class="card-head"><span class="card-title">📐 Estrutura Civil — Camadas Separadas</span></div>\n      <div class="card-body" id="prodCivil"></div>\n    </div>\n\n    <!-- LISTA REAL DE PEÇAS -->\n    <div class="card" style="margin-bottom:14px">\n      <div class="card-head">\n        <span class="card-title">🪨 Lista Técnica de Peças em Pedra</span>\n        <span id="prodTotalPecas" style="font-size:.65rem;color:var(--gold2);font-family:\'DM Mono\',monospace"></span>\n      </div>\n      <div style="overflow-x:auto">\n        <table style="width:100%;border-collapse:collapse;font-size:.78rem">\n          <thead>\n            <tr style="background:var(--bg3)">\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">#</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Peça</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Comp. × Larg.</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Esp.</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Área m²</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Peso kg</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">Acabamento</th>\n              <th style="padding:9px 10px;text-align:left;color:var(--t3);font-family:\'DM Mono\',monospace;font-size:.55rem;letter-spacing:.1em;text-transform:uppercase;font-weight:500;border-bottom:1px solid var(--bd2)">R$ Peça</th>\n            </tr>\n          </thead>\n          <tbody id="prodTblBody"></tbody>\n          <tfoot id="prodTblFoot"></tfoot>\n        </table>\n      </div>\n    </div>\n\n    <!-- MÃO DE OBRA DETALHADA -->\n    <div class="card" style="margin-bottom:14px">\n      <div class="card-head"><span class="card-title">🔨 Composição Real da Mão de Obra</span></div>\n      <div class="card-body" id="prodMob"></div>\n    </div>\n\n    <!-- PESO DETALHADO -->\n    <div class="card" style="margin-bottom:14px">\n      <div class="card-head"><span class="card-title">⚖️ Peso por Grupo de Peças</span></div>\n      <div class="card-body" id="prodPeso"></div>\n    </div>\n\n    <!-- BOTÃO IMPRIMIR LISTA -->\n    <button class="btn btn-out btn-full" style="margin-bottom:30px" onclick="imprimirProducao()">🖨 Imprimir Lista de Produção</button>\n  </div>\n</div>\n\n<!-- ═══════════════════════════════ CHAPAS ═══════════════════════════════ -->\n<div id="pg-chapas" class="page">\n  <div class="card" style="margin-bottom:14px">\n    <div class="card-head"><span class="card-title">🧩 Otimizador de Chapas — Corte Profissional</span></div>\n    <div class="card-body">\n      <div class="callout info" style="margin-bottom:14px;font-size:.73rem">\n        Informe a chapa disponível. O sistema distribui as peças automaticamente, calcula aproveitamento e mostra a sobra real.\n      </div>\n      <div class="f-grid cols3">\n        <div class="f">\n          <label>Comprimento da Chapa (cm)</label>\n          <input id="chapaC" type="number" value="320" min="100" max="600" oninput="renderChapas()">\n        </div>\n        <div class="f">\n          <label>Largura da Chapa (cm)</label>\n          <input id="chapaL" type="number" value="190" min="60" max="400" oninput="renderChapas()">\n        </div>\n        <div class="f">\n          <label>Espessura da Chapa (cm)</label>\n          <select id="chapaE" onchange="renderChapas()">\n            <option value="2">2 cm</option>\n            <option value="3" selected>3 cm</option>\n            <option value="4">4 cm</option>\n            <option value="5">5 cm</option>\n          </select>\n        </div>\n      </div>\n      <div class="f-grid" style="margin-top:4px">\n        <div class="f">\n          <label>Espessura de corte / sangria (cm)</label>\n          <input id="chapaSangria" type="number" value="0.8" step="0.1" min="0" max="3" oninput="renderChapas()">\n          <span class="f-hint">Largura perdida no disco de corte (padrão 0,8 cm)</span>\n        </div>\n        <div class="f">\n          <label>Preço da Chapa (R$/chapa)</label>\n          <input id="chapaPreco" type="number" value="0" min="0" oninput="renderChapas()">\n          <span class="f-hint">Opcional — para calcular custo por chapa</span>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <div id="chapasResultado">\n    <div style="text-align:center;padding:40px 20px;color:var(--t4)">\n      <div style="font-size:.85rem">Gere um orçamento para ver a distribuição nas chapas</div>\n    </div>\n  </div>\n</div>\n\n<!-- ═══════════════════════════════ HISTÓRICO ═══════════════════════════════ -->\n<div id="pg-historico" class="page">\n  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">\n    <div style="font-size:.75rem;color:var(--t3)" id="histCount">Orçamentos salvos</div>\n    <div style="display:flex;gap:8px">\n      <button class="btn btn-out btn-sm" onclick="exportarHistorico()">⬇ Exportar</button>\n      <button class="btn btn-red btn-sm" onclick="confirmarLimpar()">🗑 Limpar</button>\n    </div>\n  </div>\n  <!-- BUSCA -->\n  <div class="f" style="margin-bottom:14px">\n    <input id="histBusca" type="text" placeholder="Buscar por cliente, cemitério, material..." oninput="renderHistorico()">\n  </div>\n  <div id="histList"></div>\n  <div id="histEmpty" style="text-align:center;padding:60px 20px;color:var(--t4);display:none">\n    <div style="font-size:2.5rem;margin-bottom:12px">📋</div>\n    <div style="font-size:.85rem">Nenhum orçamento salvo ainda</div>\n  </div>\n</div>\n\n<!-- ═══════════════════════════════ CONFIGURAÇÕES ═══════════════════════════ -->\n<div id="pg-config" class="page">\n\n  <!-- IA -->\n  <div class="card" style="border-color:rgba(201,168,76,.25)">\n    <div class="card-head" style="background:var(--gdim)">\n      <span class="card-title">🤖 Inteligência Artificial (Groq)</span>\n    </div>\n    <div class="card-body">\n      <div class="callout info" style="margin-bottom:12px;font-size:.73rem">\n        A IA analisa fotos de túmulos e preenche o orçamento automaticamente.<br><br>\n        <strong>Como obter a chave gratuita:</strong><br>\n        1. Acesse <strong>console.groq.com</strong><br>\n        2. Clique em <strong>API Keys → Create API Key</strong><br>\n        3. Copie e cole a chave aqui — sem restrições de domínio!\n      </div>\n      <div class="f-grid full">\n        <div class="f">\n          <label>Chave API Groq</label>\n          <input id="cGroqKey" type="password" placeholder="gsk_..." oninput="svCfg()" autocomplete="off">\n          <span class="f-hint">Gratuito · Sem restrição de domínio · console.groq.com</span>\n        </div>\n      </div>\n      <div style="display:flex;gap:8px;margin-top:10px;align-items:center">\n        <button class="btn btn-out btn-sm" onclick="testarGroq()">🔍 Testar conexão</button>\n        <span id="groqTestResult" style="font-size:.72rem;color:var(--t3)"></span>\n      </div>\n    </div>\n  </div>\n\n  <!-- EMPRESA -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">Empresa</span></div>\n    <div class="card-body">\n      <div class="f-grid">\n        <div class="f"><label>Nome</label><input id="cEmpNome" type="text" oninput="svCfg()"></div>\n        <div class="f"><label>Telefone</label><input id="cEmpTel" type="tel" oninput="svCfg()"></div>\n      </div>\n      <div class="f-grid">\n        <div class="f"><label>Endereço</label><input id="cEmpEnd" type="text" oninput="svCfg()"></div>\n        <div class="f"><label>Cidade</label><input id="cEmpCid" type="text" oninput="svCfg()"></div>\n      </div>\n    </div>\n  </div>\n\n  <!-- MARGEM E PARCELAMENTO -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">Preços e Margens</span></div>\n    <div class="card-body">\n      <div class="cfg-row">\n        <div><div class="cfg-k">Margem de lucro (%)</div><div style="font-size:.62rem;color:var(--t4)">Aplicada sobre custo total</div></div>\n        <input class="cfg-inp" id="cMargem" type="number" min="0" max="200" oninput="svCfg()">\n      </div>\n      <div class="cfg-row">\n        <div><div class="cfg-k">Parcelas máx. (cartão)</div></div>\n        <input class="cfg-inp" id="cParc" type="number" min="1" max="18" oninput="svCfg()">\n      </div>\n      <div class="cfg-row">\n        <div><div class="cfg-k">Acréscimo parcelado (%)</div></div>\n        <input class="cfg-inp" id="cJuros" type="number" min="0" max="50" step="0.5" oninput="svCfg()">\n      </div>\n    </div>\n  </div>\n\n  <!-- PEDRAS -->\n  <div class="card">\n    <div class="card-head">\n      <span class="card-title">Pedras — Preço por m²</span>\n      <button class="btn btn-out btn-sm" onclick="abrirModalPedra()">+ Adicionar</button>\n    </div>\n    <div class="card-body" id="cPedrasList"></div>\n  </div>\n\n  <!-- MÃO DE OBRA BASE -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">Mão de Obra — Valores/dia</span></div>\n    <div class="card-body">\n      <div class="cfg-row"><div class="cfg-k">Pedreiro (R$/dia)</div><input class="cfg-inp" id="cPedreiro" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Ajudante (R$/dia)</div><input class="cfg-inp" id="cAjudante" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Instalação pedra (R$/dia)</div><input class="cfg-inp" id="cInstalacao" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Montagem (R$/dia)</div><input class="cfg-inp" id="cMontagem" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Transporte base (R$)</div><input class="cfg-inp" id="cTransporte" type="number" oninput="svCfg()"></div>\n    </div>\n  </div>\n\n  <!-- MATERIAIS CIVIS -->\n  <div class="card">\n    <div class="card-head"><span class="card-title">Materiais Civis — Preços Ref.</span></div>\n    <div class="card-body">\n      <div class="cfg-row"><div class="cfg-k">Cimento CP-II (saco 50kg)</div><input class="cfg-inp" id="cCimento" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Areia (m³)</div><input class="cfg-inp" id="cAreia" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Brita (m³)</div><input class="cfg-inp" id="cBrita" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Argamassa AC-II (saco 20kg)</div><input class="cfg-inp" id="cArgamassa" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Ferro 3/8" (barra 12m)</div><input class="cfg-inp" id="cFerro38" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Ferro 5/16" (barra 12m)</div><input class="cfg-inp" id="cFerro516" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Malha Q-92 (m²)</div><input class="cfg-inp" id="cMalha" type="number" oninput="svCfg()"></div>\n      <div class="cfg-row"><div class="cfg-k">Blocos 14×19×39 (unid.)</div><input class="cfg-inp" id="cBlocos" type="number" oninput="svCfg()"></div>\n    </div>\n  </div>\n\n  <div style="display:flex;gap:10px;margin-bottom:30px">\n    <button class="btn btn-out btn-sm" style="flex:1;justify-content:center" onclick="importarCfg()">⬆ Importar</button>\n    <button class="btn btn-out btn-sm" style="flex:1;justify-content:center" onclick="exportarCfg()">⬇ Exportar</button>\n    <button class="btn btn-red btn-sm" style="flex:1;justify-content:center" onclick="resetCfg()">↺ Restaurar</button>\n  </div>\n</div>';
}


// ═══════════════════════════════════════════════════════
// CAMADA DE INTEGRAÇÃO COM O ERP
// ═══════════════════════════════════════════════════════
var _TI_ambId = null;
var _TI_cssInjected = false;

// APP-TUM-INLINE.JS — Calculadora de Túmulos v14 embutida no orçamento
// HR Mármores e Granitos — auto-gerado
// ═══════════════════════════════════════════════════════════════════════════
// Carregar APÓS app-core.js no index.html


// ═══════════════════════════════════════════════════════
// T14 INLINE — Variáveis de controle do modo inline
// ═══════════════════════════════════════════════════════
var _TI_ambId = null;        // ID do ambiente atualmente montado
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
  _TI_ambId = ambId;
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

  // Se o container já tem conteúdo para este ambiente, não re-renderizar
  // (evita perda de estado a cada renderAmbientes do app principal)
  if (container.children.length > 0 && container.dataset.tumMounted === String(ambId)) {
    return;
  }

  // Montar HTML
  container.dataset.tumMounted = String(ambId);
  container.innerHTML = '<div class="tum-v14-root">' + _TI_getHTML() + '</div>';

  // Restaurar estado salvo
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a){ return a.id == ambId; }) : null;
  if (amb && amb.tumSEL) {
    SEL = JSON.parse(JSON.stringify(amb.tumSEL));
  } else {
    // Reset para estado padrão
    SEL = JSON.parse(JSON.stringify(_TI_SEL_DEF));
  }
  if (amb && amb.tumFlds) {
    var flds = amb.tumFlds;
    Object.keys(flds).forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = flds[id];
    });
  }

  // Inicializar
  pendOrc = null;
  HIST = JSON.parse(localStorage.getItem('hr_tum_hist') || '[]');
  init();
}

function tumInlineUnmount() {
  _TI_ambId = null;
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
window.tumInlineUnmount = tumInlineUnmount;

// Funções de UI — onclick inline
window.selTipoServ       = selTipoServ;
window.selMat            = selMat;
window.selMatCat         = selMatCat;
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
window.mascaraTel        = mascaraTel;
window.abrirModal        = abrirModal;
window.fecharModal       = fecharModal;
window.abrirModalPedra   = abrirModalPedra;
window.confirmarAddPedra = confirmarAddPedra;
window.remPedra          = remPedra;
window.calcularFinal     = calcularFinal;
window.salvarHistorico   = salvarHistorico;
window.copiarWA          = copiarWA;
window.imprimirPDF       = imprimirPDF;
window.imprimirProducao  = imprimirProducao;
window.showTab           = showTab;
window.renderPlanta      = renderPlanta;
window.renderChapas      = renderChapas;
window.renderHistorico   = renderHistorico;
window.verHistorico      = verHistorico;
window.recarregarOrcamento = recarregarOrcamento;
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
window._TI_calcular      = _TI_calcular;

// Expor PRESETS e SEL para acesso externo (usado nos onclick inline)
window.PRESETS           = PRESETS;
window.SEL               = SEL;

// Exportações adicionais — funções usadas em oninput/onclick inline
window.atualizarEspessuraDaPedra            = atualizarEspessuraDaPedra;
window.atualizarFalLabel                    = atualizarFalLabel;
window.atualizarPreview                     = atualizarPreview;
window.atualizarSteps                       = atualizarSteps;
window.atualizarTampasUI                    = atualizarTampasUI;
window.buildAcabamentos                     = buildAcabamentos;
window.buildAvancado                        = buildAvancado;
window.buildEngList                         = buildEngList;
window.buildFalecidos                       = buildFalecidos;
window.buildGradePresets                    = buildGradePresets;
window.buildMatCats                         = buildMatCats;
window.buildMatList                         = buildMatList;
window.buildMolduraPresets                  = buildMolduraPresets;
window.buildOpcionais                       = buildOpcionais;
window.buildPecas                           = buildPecas;
window.buildPedrasCfg                       = buildPedrasCfg;
window.buildPresets                         = buildPresets;
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
window.init                                 = init;
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
window.toast                                = toast;
window.validarForm                          = validarForm;

// Expõe setter para sincronizar catálogo de pedras diretamente na memória do IIFE
// Chamado por app-tum-integracao.js a cada tumInlineMount
window.tumSetPedrasCatalogo = function(pedras) {
  if (!Array.isArray(pedras) || !pedras.length) return;
  CFG.pedras = pedras;
  // Garantir que matId selecionado ainda existe
  if (!CFG.pedras.find(function(p){ return p.id === SEL.matId; })) {
    SEL.matId = CFG.pedras[0].id;
  }
};

})(); // fim do IIFE
