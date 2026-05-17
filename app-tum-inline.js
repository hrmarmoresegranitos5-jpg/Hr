(function() {
'use strict';
var _TI_ambId = null; // ID do ambiente de túmulo montado atualmente

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

var CFG = (function(){ try{ return JSON.parse(localStorage.getItem('hr_tum_cfg')||'null'); }catch(e){ return null; } })();
var HIST = (function(){ try{ return JSON.parse(localStorage.getItem('hr_tum_hist')||'[]')||[]; }catch(e){ return []; } })();

var DEF_CFG = {
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
  if(_TI_ambId&&typeof ambientes!=='undefined'){var _s=ambientes.find(function(a){return a.id==_TI_ambId;});if(_s)_s.selMat=id;}
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
  if(_TI_ambId)_tumInlineSaveAmb();
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
    if(pendOrc&&pendOrc.r){try{gerarPrintArea(pendOrc,pendOrc.r);}catch(ex){}}
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
      civLn('Blocos de cimento / Canaletas 14×19×39cm', cv.unid_blocos, 'un',   p.blocos,   cv.unid_blocos * p.blocos);
      civLn('Cimento CP-II (sacos 50 kg)',              cv.sacos_cimento,'saco', p.cimento,  cv.sacos_cimento * p.cimento);
      civLn('Areia lavada',                             cv.m3_areia,     'm³',  p.areia,    cv.m3_areia * p.areia);
      civLn('Brita 3/4"',                               cv.m3_brita,     'm³',  p.brita,    cv.m3_brita * p.brita);
      civLn('Treliça / Malha soldada Q-92',             cv.m2_malha,     'm²',  p.malha,    cv.m2_malha * p.malha);
      civLn('Ferro 3/8" — alicerce / alvenaria (12m)', cv.barras_f38,  'barra',p.ferro38,  cv.barras_f38 * p.ferro38);
      civLn('Ferro 5/16" — laje (12m)',                 cv.barras_f516, 'barra',p.ferro516, cv.barras_f516 * p.ferro516);
    }
    // Argamassa de assentamento: sempre presente
    civLn('Argamassa AC-II (sacos 20 kg) — assentamento', cv.sacos_argam, 'saco', p.argamassa, cv.sacos_argam * p.argamassa);

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
      if(cv.unid_blocos>0)  civRows2.push({nm:'Blocos cimento / Canaletas 14×19×39cm', qtd:cv.unid_blocos,           unit:'un',    pr:pp.blocos,   sub:cv.unid_blocos*pp.blocos});
      if(cv.sacos_cimento>0)civRows2.push({nm:'Cimento CP-II (sacos 50 kg)',           qtd:cv.sacos_cimento,          unit:'saco',  pr:pp.cimento,  sub:cv.sacos_cimento*pp.cimento});
      if(cv.m3_areia>0)     civRows2.push({nm:'Areia lavada',                          qtd:+cv.m3_areia.toFixed(2),   unit:'m³',    pr:pp.areia,    sub:cv.m3_areia*pp.areia});
      if(cv.m3_brita>0)     civRows2.push({nm:'Brita 3/4"',                            qtd:+cv.m3_brita.toFixed(2),   unit:'m³',    pr:pp.brita,    sub:cv.m3_brita*pp.brita});
      if(cv.m2_malha>0)     civRows2.push({nm:'Treliça / Malha soldada Q-92',          qtd:+cv.m2_malha.toFixed(2),   unit:'m²',    pr:pp.malha,    sub:cv.m2_malha*pp.malha});
      if(cv.barras_f38>0)   civRows2.push({nm:'Ferro 3/8" — alicerce / alvenaria',    qtd:cv.barras_f38,             unit:'barra', pr:pp.ferro38,  sub:cv.barras_f38*pp.ferro38});
      if(cv.barras_f516>0)  civRows2.push({nm:'Ferro 5/16" — laje',                   qtd:cv.barras_f516,            unit:'barra', pr:pp.ferro516, sub:cv.barras_f516*pp.ferro516});
    }
    if(cv.sacos_argam>0) civRows2.push({nm:'Argamassa AC-II — assentamento (sacos 20 kg)', qtd:cv.sacos_argam, unit:'saco', pr:pp.argamassa, sub:cv.sacos_argam*pp.argamassa});
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
  pendOrc = o;
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

// ═══════════════════════════════════════════════════════
// CAMADA DE INTEGRAÇÃO COM O ERP
// ═══════════════════════════════════════════════════════
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
  _TI_ambId = ambId;
  var container = document.getElementById('tumInline_' + ambId);
  if (!container) return;

  // Injetar CSS uma única vez — com escopo para evitar conflito com o app principal
  if (!_TI_cssInjected) {
    var styleEl = document.createElement('style');
    styleEl.id = 'tum-v14-style';
    styleEl.textContent = _TI_scopeCSS((window._TI_getCSS ? window._TI_getCSS() : ''));
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
  container.innerHTML = '<div class="tum-v14-root">' + (window._TI_getHTML ? window._TI_getHTML() : '') + '</div>';

  // Restaurar estado salvo
  var amb = (typeof ambientes !== 'undefined') ? ambientes.find(function(a){ return a.id == ambId; }) : null;
  if (amb && amb.tumSEL) {
    SEL = JSON.parse(JSON.stringify(amb.tumSEL));
    // Validar matId restaurado — se não existe no catálogo atual, usar fallback inteligente
    if (!CFG.pedras.find(function(p){ return p.id === SEL.matId; })) {
      var gabriel = CFG.pedras.find(function(p){ return p.id === 'p_gabriel' || (p.nm && p.nm.toLowerCase().indexOf('gabriel') >= 0); });
      var preto   = CFG.pedras.find(function(p){ return (p.cat || '').toLowerCase().indexOf('preto') >= 0; });
      SEL.matId = (gabriel || preto || CFG.pedras[0]).id;
    }
  } else {
    // Reset para estado padrão
    SEL = JSON.parse(JSON.stringify(_TI_SEL_DEF));
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
  pendOrc = null;
  HIST = JSON.parse(localStorage.getItem('hr_tum_hist') || '[]');
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

// UI globals
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

// PDF routes para app-core.js
window._TI_imprimirPDF = function(){
  if(!pendOrc){toast('Gere um orçamento no túmulo primeiro',true);return;}
  var pb=document.getElementById('pBody');
  if(pb&&pb.innerHTML.trim())_abrirJanelaPDF(pb.innerHTML);
  else toast('Recalcule o orçamento antes de imprimir',true);
};
window._TI_loadAndPrint = function(savedPendOrc){
  if(!savedPendOrc||!savedPendOrc.r){toast('Dados incompletos',true);return;}
  pendOrc = savedPendOrc;
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

// renderFalecidos = buildFalecidos (alias para compatibilidade)

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
window.PRESETS           = PRESETS;
window.buildPedrasCfg                       = buildPedrasCfg;
window.gerarPrintArea                       = gerarPrintArea;
window.gerarTextoWA                         = gerarTextoWA;
window.loadCfgUI                            = loadCfgUI;
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

// ── Window exports for all File 1 functions ──────────────────
window._TI_selMat        = selMat;
window._TI_selMatCat     = selMatCat;
window._TI_calcular      = _TI_calcular;
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
window.carregarFotoOrc   = carregarFotoOrc;
window._tLajeToggle      = _tLajeToggle;
window._tUsinToggle      = _tUsinToggle;
window._setPosicao       = _setPosicao;
window.buildPosicaoPresets = buildPosicaoPresets;
window.renderFalecidos = buildFalecidos;
window.iaOnFileSelect    = iaOnFileSelect;
window.iaAnalisar        = iaAnalisar;
window.renderEncontroBox = renderEncontroBox;
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
window.buildPresets                         = buildPresets;
window._TI_selAcabTampa = selAcabTampa;
window.buildTampasAcab                      = buildTampasAcab;
window.buildTipoServ                        = buildTipoServ;
window.calcularFull                         = calcularFull;
window.desenharTampasSVG                    = desenharTampasSVG;
window.escHtml                              = escHtml;
window.getDims                              = getDims;
window.getEngCm                             = getEngCm;
window.getMolduraCm                         = getMolduraCm;
window.getTampasDims                        = getTampasDims;
window.iaAplicarResultado                   = iaAplicarResultado;
window.mostrarCardLapide                    = mostrarCardLapide;

// New session functions
window._togInd               = _togInd;
window.buildCustosIndiretos  = buildCustosIndiretos;
window.atualizarAreaUtil     = atualizarAreaUtil;
// window.SEL exposed for onclick handlers in HTML template
window.SEL = SEL;
window.CFG = CFG;

})();
