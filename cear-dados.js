// ════════════════════════════════════════════════════════════
// DADOS / CONFIGURAÇÃO — com suporte a override via localStorage
// ════════════════════════════════════════════════════════════

// ── Defaults (tabela oficial) ─────────────────────────────────
const VIDROS_DEF = {
  temp_trans: { nome:'Transparente 8mm (Temp.)', preco:420,  temperado:true  },
  temp_fume:  { nome:'Fumê 8mm (Temp.)',         preco:455,  temperado:true  },
  temp_serig: { nome:'Serigrafado 8mm (Temp.)',  preco:650,  temperado:true  },
  temp_jat:   { nome:'Jateado 8mm (Temp.)',      preco:440,  temperado:true  },
  temp_esp:   { nome:'Espelhado 8mm (Temp.)',    preco:620,  temperado:true  },
  com_4:      { nome:'Incolor 4mm',              preco:220,  temperado:false },
  com_6:      { nome:'Incolor 6mm',              preco:240,  temperado:false },
  com_fume3:  { nome:'Fumê 3mm',                 preco:210,  temperado:false },
  com_fume4:  { nome:'Fumê 4mm',                 preco:245,  temperado:false },
  esp_3:      { nome:'Espelho 3mm',              preco:260,  temperado:false },
  esp_4:      { nome:'Espelho 4mm',              preco:280,  temperado:false },
};

const CORRER_PRECOS_DEF = {
  trilho_sup:   85,
  guia_inf:     45,
  kit_carrinho: 95,
  fechadura:   150,
  puxador:     100,
};

const COMERCIAL_DEF = {
  frete_gratis_km:      20,
  frete_por_km_extra:    3,
  desconto_avista:    0.10,
  botao_frances:      2.50,
  botoes_quant:          4,
  recorte_por_m2:       10,
  mola_hidraulica:     500,
  cantoneira_por_m:     10,
  pu_por_m:             70,
  // Kit engenharia (janelas, correr, box)
  kit_eng_branco:      120,  // R$/m² — alumínios + trilhos + perfis
  kit_eng_preto:       130,  // R$/m² — kit preto
  kit_eng_extra:        10,  // R$/m² a mais em 4 folhas
  roldana:              10,  // R$ cada roldana
};

// Materiais de túmulo (preço/m²)
const TUMULO_MATERIAIS_DEF = {
  granito_preto:   { nome:'Granito Preto',      preco:480 },
  granito_cinza:   { nome:'Granito Cinza',       preco:350 },
  granito_verde:   { nome:'Granito Verde Ubatuba',preco:420 },
  granito_rosa:    { nome:'Granito Rosa Iracema', preco:380 },
  granito_branco:  { nome:'Granito Branco Siena', preco:400 },
  marmore_branco:  { nome:'Mármore Branco',       preco:520 },
  marmore_bege:    { nome:'Mármore Bege',         preco:480 },
};

// Acessórios de túmulo
const TUMULO_ACSS_DEF = {
  placa_aluminio: { nome:'Placa Alumínio (nome/datas)',    preco: 80 },
  placa_inox:     { nome:'Placa Inox (nome/datas)',        preco:120 },
  placa_bronze:   { nome:'Placa Bronze (nome/datas)',      preco:200 },
  foto_porcelana: { nome:'Foto em Porcelana',              preco:150 },
  fotogravacao:   { nome:'Fotogravação no Granito',        preco:120 },
  cruz_inox:      { nome:'Cruz em Inox',                   preco: 90 },
  vaso_inox:      { nome:'Vaso Inox',                      preco: 60 },
  veleiro_inox:   { nome:'Veleiro Inox',                   preco: 70 },
  instalacao_m2:  { nome:'Instalação no cemitério',        preco: 80 },
};

const EMPRESA_DEF = {
  nome:      'Ceará Planejados',
  subtitulo: 'Vidraçaria · Marcenaria · Serralheria',
  whatsapp:  '5585999999999',
  horario:   'Seg–Sex 8h–18h · Sáb 8h–13h',
  pagamento: 'PIX · Dinheiro · Cartão · Parcelado',
  frete_txt: 'Grátis até 20 km · Acima sob consulta',
};

// ── Carregar CFG com overrides do localStorage ────────────────
let CFG = {};

function loadCFG() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('ceara_cfg') || '{}'); } catch(e) {}

  // Vidros: merge preços
  const vPrices = saved.vidros || {};
  CFG.vidros = {};
  for (const k in VIDROS_DEF) {
    CFG.vidros[k] = { ...VIDROS_DEF[k], preco: vPrices[k] ?? VIDROS_DEF[k].preco };
  }

  // Correr
  const cp = saved.correr || {};
  CFG.correr = {
    trilho_sup:   cp.trilho_sup   ?? CORRER_PRECOS_DEF.trilho_sup,
    guia_inf:     cp.guia_inf     ?? CORRER_PRECOS_DEF.guia_inf,
    kit_carrinho: cp.kit_carrinho ?? CORRER_PRECOS_DEF.kit_carrinho,
    fechadura:    cp.fechadura    ?? CORRER_PRECOS_DEF.fechadura,
    puxador:      cp.puxador      ?? CORRER_PRECOS_DEF.puxador,
  };

  // Comercial
  const co = saved.comercial || {};
  CFG.comercial = {};
  for (const k in COMERCIAL_DEF) {
    CFG.comercial[k] = co[k] ?? COMERCIAL_DEF[k];
  }

  // Empresa
  const em = saved.empresa || {};
  CFG.empresa = {};
  for (const k in EMPRESA_DEF) {
    CFG.empresa[k] = em[k] ?? EMPRESA_DEF[k];
  }

  // Re-exporta como globais para compatibilidade com código existente
  VIDROS        = CFG.vidros;
  CORRER_PRECOS = CFG.correr;
  FRETE_GRATIS_KM     = CFG.comercial.frete_gratis_km;
  FRETE_POR_KM_EXTRA  = CFG.comercial.frete_por_km_extra;
  DESCONTO_AVISTA     = CFG.comercial.desconto_avista;
}

function saveCFG(data) {
  localStorage.setItem('ceara_cfg', JSON.stringify(data));
  loadCFG();
}

function resetCFG() {
  localStorage.removeItem('ceara_cfg');
  loadCFG();
}

// ── Estruturas estáticas (não configuráveis) ──────────────────
const CORRER_MOVEIS = { 1:1, 2:2, 3:2, 4:2 }; // 3 folhas = 1 fixa + 2 móveis

const ACESSORIOS_CONFIG = {
  pivotante:  [{ id:'kit',      nome:'Kit Pivotante',        preco:150, obrig:true  },
               { id:'puxador',  nome:'Puxador',              preco:100, obrig:false },
               { id:'fixador',  nome:'Fixador',              preco:60,  obrig:false }],
  correr:     [],
  janela:     [{ id:'kit',      nome:'Kit Janela',           preco:null,obrig:true  },
               { id:'bate',     nome:'Bate-fecha VP',        preco:50,  obrig:true  }],
  basculante: [{ id:'kit',      nome:'Kit Basculante',       preco:150, obrig:true  }],
  box:        [{ id:'kit',      nome:'Kit Box',              preco:null, obrig:true  }],
  espelho:    [{ id:'botoes',   nome:'Botões (≥60cm larg.)', preco:null, obrig:false },
               { id:'colado',   nome:'Fixação Colada',       preco:0,   obrig:false }],
  comum:      [{ id:'recorte',  nome:'Recorte (+R$10/m²)',   preco:null, obrig:false }],
  guarda:     [],
};

const VIDROS_POR_TIPO = {
  pivotante:  ['temp_trans','temp_fume','temp_serig','temp_jat','temp_esp'],
  correr:     ['temp_trans','temp_fume','temp_serig','temp_jat','temp_esp'],
  janela:     ['temp_trans','temp_fume','com_4','com_6'],
  box:        ['temp_trans','temp_fume','temp_serig','temp_jat'],
  espelho:    ['esp_3','esp_4'],
  basculante: ['com_4','com_6','temp_trans'],
  guarda:     ['temp_trans','temp_fume','temp_serig'],
  comum:      ['com_4','com_6','com_fume3','com_fume4','esp_3','esp_4'],
  tumulo:     [],
};

const DEFAULTS = {
  pivotante:  { larg:90,  alt:210 },
  correr:     { larg:150, alt:210 },
  janela:     { larg:100, alt:120 },
  box:        { larg:80,  alt:195 },
  espelho:    { larg:60,  alt:80  },
  basculante: { larg:60,  alt:40  },
  guarda:     { larg:120, alt:110 },
  comum:      { larg:60,  alt:60  },
  tumulo:     { larg:90,  alt:60  },
};

const TIPOS = [
  { id:'pivotante',  label:'Porta Pivotante', icon:'🚪' },
  { id:'correr',     label:'Porta de Correr', icon:'🔲' },
  { id:'janela',     label:'Janela',          icon:'🪟' },
  { id:'box',        label:'Box de Banheiro', icon:'🛁' },
  { id:'espelho',    label:'Espelho',         icon:'🪞' },
  { id:'basculante', label:'Basculante',      icon:'⬆️' },
  { id:'guarda',     label:'Guarda Corpo',    icon:'🏗️' },
  { id:'comum',      label:'Vidro Comum',     icon:'🔷' },
  { id:'tumulo',     label:'Túmulo/Jazigo',   icon:'⛪' },
];

const TIPO_LABEL = { tumulo:'Túmulo/Jazigo', pivotante:'Porta Pivotante',correr:'Porta de Correr',janela:'Janela',box:'Box de Banheiro',espelho:'Espelho',guarda:'Guarda Corpo',basculante:'Basculante',comum:'Vidro Comum' };
const TIPO_ICON  = { tumulo:'⛪', pivotante:'🚪',correr:'🔲',janela:'🪟',box:'🛁',espelho:'🪞',guarda:'🏗️',basculante:'⬆️',comum:'🔷' };

// ── Estado do orçamento ───────────────────────────────────────
let orcState = {
  tipo:'pivotante', larg:90, alt:210,
  vidroKey:'temp_trans', accs:{}, km:0,
  cliente:'', fone:'',
  resultado:null, folhasCorrer:2, janelaFolhas:2, puxadorCorrer:false, puxadoresQtd:1,
  kitPivotante:'comum', molaQtd:0, kitCor:'branco',
  boxTipo:'conv', largB:80, altB:80, puxadoresCorrerQtd:1,
};

// Declara os globais que loadCFG vai preencher
let VIDROS = {}, CORRER_PRECOS = {};
let FRETE_GRATIS_KM = 20, FRETE_POR_KM_EXTRA = 3, DESCONTO_AVISTA = 0.10;
