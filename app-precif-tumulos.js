// ══════════════════════════════════════════════════════════════════════
// ETAPA 3 — FUNDAÇÃO REAL + PISO OPERACIONAL
// HR Mármores e Granitos
// Carregar APÓS app-tumulos.js e app-config.js no index.html
// ══════════════════════════════════════════════════════════════════════

// Fallback: _r pode não estar disponível se app-tumulos.js ainda não carregou
if (typeof _r === 'undefined') { var _r = function(v) { return Math.round(v * 100) / 100; }; }

// ─────────────────────────────────────────────────────────────────────
// TABELA DE PREÇOS PADRÃO
// ─────────────────────────────────────────────────────────────────────
var DEF_TUM_PRECOS = {

  pedras: {
    granito_simples: { label:'Granito Simples', preco:280, unid:'m²', icon:'⬛', desc:'Cores escuras padrão' },
    granito_padrao:  { label:'Granito Padrão',  preco:380, unid:'m²', icon:'🟫', desc:'Intermediário, boa variedade' },
    granito_premium: { label:'Granito Premium', preco:540, unid:'m²', icon:'💎', desc:'Nobre, alta resistência' },
    marmore:         { label:'Mármore',          preco:700, unid:'m²', icon:'🤍', desc:'Branco / Travertino' }
  },

  // ── INSUMOS — ESTRUTURA CIVIL ──────────────────────────────────────
  // Concreto, ferragem, alvenaria estrutural
  insumos: {
    cimento:         { label:'Cimento',           preco: 38,   unid:'sc 50kg', icon:'🏚️', grupo:'estrutura' },
    areia:           { label:'Areia média',        preco: 200,  unid:'m³',      icon:'🏖️', grupo:'estrutura' },
    brita:           { label:'Brita 1',            preco: 220,  unid:'m³',      icon:'🪨', grupo:'estrutura' },
    ferro_38:        { label:'Ferro 3/8"',         preco: 16,   unid:'barra 6m', icon:'🔩', grupo:'estrutura' },
    ferro_516:       { label:'Ferro 5/16"',        preco: 15,   unid:'barra 6m', icon:'🔩', grupo:'estrutura' },
    tela_sold:       { label:'Tela Soldada Q138',  preco: 52,   unid:'m²',      icon:'🕸️', grupo:'estrutura' },
    bloco:           { label:'Bloco 14×19×39',     preco: 4.50, unid:'un',      icon:'🧱', grupo:'estrutura' },
    impermeab:       { label:'Impermeabilizante',  preco: 1530, unid:'balde 18kg', icon:'💧', grupo:'estrutura' },
    trelica_h8:      { label:'Treliça H8',          preco: 18,   unid:'barra 6m',icon:'🔧', grupo:'estrutura' },
    canaleta:        { label:'Canaleta Drenagem',   preco: 22,   unid:'ml',      icon:'🌊', grupo:'estrutura' },
    // ── ASSENTAMENTO CIVIL (alvenaria) — NÃO confundir com AC-II ──────
    // Argamassa de assentamento de bloco (cimento + areia, traço simples)
    massa_assentamento: { label:'Massa Assentamento Bloco', preco: 22,  unid:'sc 20kg', icon:'🪣', grupo:'alvenaria' },
    // Cimento para chapisco + reboco interno/externo das paredes
    cimento_reboco:  { label:'Cimento Reboco/Chapisco',     preco: 38,   unid:'sc 50kg', icon:'🏚️', grupo:'alvenaria' },
    // ── PEDRAS E ACABAMENTO — AC-II somente aqui ──────────────────────
    // AC-II: exclusiva para assentamento de granito, mármore, tampas, laterais, lápides
    argamassa_acii:  { label:'Argamassa AC-II (pedra)',     preco: 32,   unid:'sc 20kg', icon:'🪣', grupo:'pedras' },
    cola_epox:       { label:'Cola Epóxi (pedra)',          preco: 48,   unid:'sc 5kg',  icon:'🧴', grupo:'pedras' },
    rejunte:         { label:'Rejunte',                     preco: 14,   unid:'kg',      icon:'🪣', grupo:'pedras' }
  },

  // ── EQUIPES DE EMPREITADA (substituem diária fixa) ─────────────────
  equipes: {
    leve: {
      label:'Equipe Leve',
      desc:'1 pedreiro + 1 ajudante · Reforma e simples (sem gaveta)',
      icon:'🔨',
      custo: 800,
      venda: 1400
    },
    media: {
      label:'Equipe Média',
      desc:'2 pedreiros + 1 ajudante · 1–2 gavetas',
      icon:'🔨🔨',
      custo: 1600,
      venda: 2600
    },
    pesada: {
      label:'Equipe Pesada',
      desc:'2 pedreiros + 2 ajudantes · 3 gavetas ou altura > 2m',
      icon:'🏗️',
      custo: 2800,
      venda: 4400
    },
    critica: {
      label:'Equipe Crítica',
      desc:'3 pedreiros + 2 ajudantes · Jazigo / 4+ gavetas / IEO alto',
      icon:'⚠️',
      custo: 4200,
      venda: 6500
    }
  },

  // ── ACABAMENTOS ───────────────────────────────────────────────────
  acabamentos: {
    lateral:    { label:'Lateral / Bisotada',  preco: 85,  unid:'ml',  custoPerc:55 },
    moldura:    { label:'Moldura',             preco: 120, unid:'ml',  custoPerc:55 },
    pingadeira: { label:'Pingadeira',          preco: 80,  unid:'ml',  custoPerc:55 },
    lapide:     { label:'Lápide Padrão',       preco: 450, unid:'un',  custoPerc:60 },
    lapide_esp: { label:'Lápide Especial',     preco: 720, unid:'un',  custoPerc:55 },
    cruz:       { label:'Cruz (granito)',       preco: 320, unid:'un',  custoPerc:55 },
    foto:       { label:'Foto Porcelana',       preco: 160, unid:'un',  custoPerc:50 },
    polimento:  { label:'Polimento Especial',  preco: 150, unid:'m²',  custoPerc:53 },
    resinagem:  { label:'Resinagem',           preco: 60,  unid:'m²',  custoPerc:50 }
  },

  // MO legado (marmorista + instalação — mantidos para compatibilidade)
  mdo: {
    marmorista: { label:'Marmorista',  diaria:400, unid:'dia', desc:'Assentamento e acabamento fino' },
    instalacao: { label:'Instalação',  custo:200,  venda:350,  unid:'un' },
    acabamento: { label:'Acabamento',  custo:120,  venda:200,  unid:'un' },
    montagem:   { label:'Montagem',    custo:200,  venda:300,  unid:'un' },
    transporte: { label:'Transporte',  custo:100,  venda:150,  unid:'un' }
  },

  markupObra: 35
};

// ─────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────
function tumInitPrecos() {
  if (typeof CFG === 'undefined') return;
  if (!CFG.tumPrecos) {
    CFG.tumPrecos = JSON.parse(JSON.stringify(DEF_TUM_PRECOS));
    if (typeof svCFG === 'function') svCFG();
    return;
  }
  var tp = CFG.tumPrecos;
  // Garante grupos existem
  ['pedras','insumos','equipes','acabamentos','mdo'].forEach(function(grp) {
    if (!tp[grp]) tp[grp] = JSON.parse(JSON.stringify(DEF_TUM_PRECOS[grp]));
    Object.keys(DEF_TUM_PRECOS[grp]).forEach(function(k) {
      if (!tp[grp][k]) tp[grp][k] = JSON.parse(JSON.stringify(DEF_TUM_PRECOS[grp][k]));
    });
  });
  // Retrocompatibilidade: instâncias antigas podem ter 'argamassa' (label AC-II errada)
  // ou 'tijolo' — migra para as novas chaves sem perder o preço configurado
  if (tp.insumos.argamassa && !tp.insumos.argamassa_acii) {
    tp.insumos.argamassa_acii = JSON.parse(JSON.stringify(DEF_TUM_PRECOS.insumos.argamassa_acii));
    tp.insumos.argamassa_acii.preco = tp.insumos.argamassa.preco; // preserva preço salvo
    delete tp.insumos.argamassa;
  }
  if (tp.insumos.tijolo) { delete tp.insumos.tijolo; } // removido do modelo
  if (!tp.insumos.massa_assentamento) {
    tp.insumos.massa_assentamento = JSON.parse(JSON.stringify(DEF_TUM_PRECOS.insumos.massa_assentamento));
  }
  if (!tp.insumos.cimento_reboco) {
    tp.insumos.cimento_reboco = JSON.parse(JSON.stringify(DEF_TUM_PRECOS.insumos.cimento_reboco));
  }
  if (!tp.insumos.trelica_h8) {
    tp.insumos.trelica_h8 = JSON.parse(JSON.stringify(DEF_TUM_PRECOS.insumos.trelica_h8));
  }
  if (!tp.insumos.canaleta) {
    tp.insumos.canaleta = JSON.parse(JSON.stringify(DEF_TUM_PRECOS.insumos.canaleta));
  }
  // Retrocompatibilidade: impermeabilizante migrado de unid:'kg' (preco~85) para 'balde 18kg' (preco~1530)
  // Se a instância salva ainda tem unid:'kg', converte o preço para balde
  if (tp.insumos.impermeab && tp.insumos.impermeab.unid === 'kg') {
    tp.insumos.impermeab.preco = Math.round(tp.insumos.impermeab.preco * 18);
    tp.insumos.impermeab.unid  = 'balde 18kg';
  }
  if (tp.markupObra == null) tp.markupObra = 35;
}

// ═════════════════════════════════════════════════════════════════════
// MOTOR ESTRUTURAL — _calcEstruturaFuneraria()
// Recebe as dimensões reais do TUM.q e devolve:
//   { insumos: {...}, equipe: 'media', custoInsumos, custoEquipe, custoTotal }
// Compatível como camada aditiva — não altera TUM.q.estrutura existente
// ═════════════════════════════════════════════════════════════════════
function _calcEstruturaFuneraria(opts) {
  tumInitPrecos();
  opts = opts || {};

  var tp = CFG.tumPrecos;
  var q  = (opts.q) ? opts.q
         : (typeof TUM !== 'undefined' && TUM.q) ? TUM.q
         : null;

  if (!q || !q.dims) return null;

  var d   = q.dims;
  var gav = q.gavetas != null ? q.gavetas : 0;

  // ── Dimensões reais ──────────────────────────────────────────────
  var avRod    = d.avRodape      || 0;
  var altRod   = d.altRodape     || 0.10;
  var espMolSup = d.espMolduraSup || 0.05;
  var espParede = d.espParede    || 0.15;
  var espLaje   = d.espLaje      || 0.10;
  var ag        = q.altPorGaveta || 0.70;

  var c = d.comp || 2.20;
  var l = d.larg || 0.90;

  var cUtil = Math.max(0.20, _r(c - 2 * avRod));
  var lUtil = Math.max(0.20, _r(l - 2 * avRod));

  // altCorpo: altura real do corpo estrutural.
  // Com 0 gavetas (laje simples/tampa): mínimo = espLaje + espMolSup.
  // Com gavetas:
  //   • cada gaveta contribui com ag (altura interna)
  //   • apenas (gav - 1) lajes divisórias internas — a laje de cobertura NÃO entra aqui
  //   • espMolSup: espessura da moldura superior
  // Exemplos (ag=0.70, espLaje=0.10, espMolSup=0.05):
  //   1 gav → 0.70 + 0×0.10 + 0.05 = 0.75m
  //   2 gav → 1.40 + 1×0.10 + 0.05 = 1.55m
  //   3 gav → 2.10 + 2×0.10 + 0.05 = 2.35m
  var altMinCorpo = espLaje + espMolSup;           // mínimo absoluto (~0.15m)
  var altCorpo = _r(Math.max(altMinCorpo,
    (gav * ag) + (Math.max(0, gav - 1) * espLaje) + espMolSup
  ));
  var altTotal = _r(altRod + altCorpo + (d.espTampa || 0.03));

  // ── VOLUMES ESTRUTURAIS REAIS ────────────────────────────────────

  // ── ETAPA 3: PARÂMETROS DE PISO E DRENAGEM ───────────────────────
  // faixaPiso: largura da faixa de piso perimetral ao redor do túmulo
  //   padrão 0.50m — representa contrapiso de serviço em cemitério
  var faixaPiso     = (d.faixaPiso != null ? d.faixaPiso : 0.50);
  // espPiso: espessura do contrapiso perimetral (concreto magro)
  //   padrão 0.08m (8cm)
  var espPiso       = (d.espPiso   != null ? d.espPiso   : 0.08);

  // 1. Fundação — 3 componentes (ETAPA 2 mantida, sem alteração)
  //
  //   a) Base estrutural (laje de lastro): área total × espessura configurável (padrão 15cm)
  //      Cobre toda a projeção horizontal do túmulo; espessura maior em jazigos.
  var espFundBase   = d.espFundacao || 0.15;
  var volFundLaje   = _r(c * l * espFundBase);
  //
  //   b) Vigas perimetrais: seção 20×20 cm ao longo do perímetro externo
  //      Enrijecem o anel de fundação; essenciais em solo úmido.
  var volFundVigas  = _r(2 * (c + l) * 0.20 * 0.20);
  //
  //   c) Reforço estrutural: acréscimo pontual por gaveta (sapatas/arranques verticais)
  //      ~12 litros por gaveta — modela colarinhos de reforço sem exagerar em engenharia.
  var volFundReforca = _r(gav * 0.012);
  //
  var volFund = _r(volFundLaje + volFundVigas + volFundReforca);

  // ── ETAPA 3: PISO PERIMETRAL ──────────────────────────────────────
  // Área do piso externo ao redor do túmulo (faixa perimetral).
  // Fórmula: área total da caixa externa menos área da projeção do túmulo.
  //   cExt = c + 2×faixaPiso; lExt = l + 2×faixaPiso
  var cExt = _r(c + 2 * faixaPiso);
  var lExt = _r(l + 2 * faixaPiso);
  var m2PisoPerimetral = _r(cExt * lExt - c * l);   // somente a faixa externa
  var volConcretoPiso  = _r(m2PisoPerimetral * espPiso);

  // ── ETAPA 3: CANALETAS DE DRENAGEM ───────────────────────────────
  // Canaleta lateral: perímetro parcial do piso externo (3 lados, excluindo frente de acesso).
  // Modelagem operacional funerária: previne acúmulo de água ao redor do túmulo.
  //   Usa 3/4 do perímetro externo como estimativa padrão.
  var perExt   = _r(2 * (cExt + lExt));
  var mlCanaleta = _r(perExt * 0.75);

  // ── ETAPA 3: TRELIÇA H8 ──────────────────────────────────────────
  // Treliça H8 usada em: fundação, vigas perimetrais, base.
  // Cálculo por perímetro estrutural × 2 linhas de treliça + comprimento longitudinal.
  //   Perímetro base: 2×(cUtil + lUtil) — borda interna da fundação
  //   2 linhas ao longo do comprimento: 2×c
  //   Total linear: perímetro + 2 linhas longitudinais
  //   Perda de ferragem aplicada; compra em barras de 6m (Math.ceil).
  var mlTrelicaLiq  = _r(2 * (cUtil + lUtil) + 2 * c);
  var mlTrelicaComPerda = _r(mlTrelicaLiq * (1 + (q.perdaFerragem != null ? q.perdaFerragem : 10) / 100));
  var nBarrasTrelica    = Math.max(1, Math.ceil(mlTrelicaComPerda / 6));

  // fundacaoDetalhada: campo adicional — não altera campos existentes
  // ETAPA 3: ampliado com piso, canaletas e treliça
  var fundacaoDetalhada = {
    laje:             volFundLaje,
    vigas:            volFundVigas,
    reforco:          volFundReforca,
    total:            volFund,
    espBase:          espFundBase,
    // ETAPA 3 — novos campos (sem remover os anteriores)
    piso: {
      m2:             m2PisoPerimetral,
      vol:            volConcretoPiso,
      faixa:          faixaPiso,
      esp:            espPiso
    },
    canaletas: {
      ml:             mlCanaleta,
      perExterno:     perExt
    },
    trelicas: {
      mlLiq:          mlTrelicaLiq,
      mlComPerda:     mlTrelicaComPerda,
      nBarras:        nBarrasTrelica
    }
  };

  // 2. Paredes de alvenaria (bloco 14cm) — m2Paredes é a base central
  //    bloco, reboco e impermeabilização dependem desta área
  var m2Paredes = _r((cUtil * 2 + lUtil * 2) * altCorpo);
  var volAlv    = _r(m2Paredes * espParede);

  // 3. Laje de cobertura (tampa/topo): cUtil × lUtil × espessura
  var volLaje   = _r(cUtil * lUtil * espLaje);

  // 4. Lajes divisórias internas (entre gavetas)
  //    Lógica real de obra funerária:
  //      1 gaveta → 0 divisórias (fundo = fundação, topo = cobertura)
  //      2 gavetas → 1 divisória
  //      3 gavetas → 2 divisórias
  //    Cada divisória: cUtil × lUtil × espLaje
  var nLajasInt  = Math.max(0, gav - 1);  // divisórias internas reais
  var volConcGav = _r(nLajasInt * cUtil * lUtil * espLaje);

  // Volume total de concreto = fundação + cobertura + divisórias internas
  var volConcreto = _r(volFund + volLaje + volConcGav);

  // ── ETAPA 3: CONCRETO SEPARADO POR CAMADA ────────────────────────
  // volConcretoEstrutural: fundação + divisórias + cobertura (concreto estrutural)
  // volConcretoPiso: contrapiso perimetral externo (concreto magro)
  // volConcretoTotal: soma auditável
  var volConcretoEstrutural = volConcreto;
  // volConcretoPiso calculado acima na seção PISO PERIMETRAL
  var volConcretoTotal = _r(volConcreto + volConcretoPiso);

  // concretoDetalhado: campo adicional — não altera campos existentes
  // ETAPA 3: ampliado com piso separado
  var concretoDetalhado = {
    fundacao:            volFund,
    cobertura:           volLaje,
    divisorias:          volConcGav,
    nDivisorias:         nLajasInt,
    total:               volConcreto,
    // ETAPA 3 — novos campos
    estrutural:          volConcretoEstrutural,
    piso:                volConcretoPiso,
    totalGeral:          volConcretoTotal
  };

  // estruturaDetalhada: referência geométrica — campo adicional
  var estruturaDetalhada = {
    altMinCorpo:   altMinCorpo,
    nLajasInt:     nLajasInt,
    espFundBase:   espFundBase,
    volFundLaje:   volFundLaje,
    volFundVigas:  volFundVigas,
    volFundReforca: volFundReforca,
    // ETAPA 3
    cExt:          cExt,
    lExt:          lExt,
    faixaPiso:     faixaPiso,
    espPiso:       espPiso,
    perExt:        perExt
  };

  // ── PERDAS POR CATEGORIA ─────────────────────────────────────────
  // Cada material possui desperdício real distinto.
  // Valores padrão baseados em obra cemiterial; calibráveis via CFG.tumCoeficientes no futuro.
  //   Concreto:  8% (perda de betonagem e forma)
  //   Alvenaria: 5% (quebra de bloco, rebarbas)
  //   Ferragem:  10% (corte e dobra)
  //   Pedra:     15% (corte, transporte, encaixe)
  var perdaConcreto  = (q.perdaConcreto  != null ? q.perdaConcreto  : 8)  / 100;
  var perdaAlvenaria = (q.perdaAlvenaria != null ? q.perdaAlvenaria : 5)  / 100;
  var perdaFerragem  = (q.perdaFerragem  != null ? q.perdaFerragem  : 10) / 100;
  var perdaPedra     = (q.perdaPedra != null ? q.perdaPedra
                     : q.perda      != null ? q.perda
                     : 15) / 100;

  // ── CONVERSÃO DE CONCRETO EM INSUMOS (traço 1:2:3, NBR 12655) ───
  // 1 m³ concreto = 7 sc cimento + 0.45 m³ areia + 0.65 m³ brita
  // ETAPA 3: usa volConcretoTotal (estrutural + piso perimetral)
  // Volumes já incluem fator de perda do concreto
  var volConcComPerda = _r(volConcretoTotal * (1 + perdaConcreto));
  var sc_cimento_conc = Math.ceil(volConcComPerda * 7);
  var m3_areia_conc   = _r(volConcComPerda * 0.45);          // areia exclusiva do concreto
  // Melhoria 10: brita tem compra mínima de 0.5 m³ (carga mínima de caminhão)
  var m3_brita_calc   = _r(volConcComPerda * 0.65);
  var m3_brita        = Math.max(0.5, m3_brita_calc);

  // ── CONVERSÃO DE ALVENARIA EM INSUMOS ───────────────────────────
  // Bloco 14×19×39: ~12.5 blocos/m² de parede + perda de alvenaria
  // Massa de assentamento de BLOCO (argamassa cimento+areia, NÃO AC-II):
  //   ~13 litros/m² = 0.013 m³/m² → 1 sc 20kg rende ~1.5 m²
  // Cimento para reboco + chapisco das paredes (interno + externo):
  //   ~0.8 sc 50kg/m² de parede
  // Areia de reboco/chapisco: ~0.02 m³/m² de parede (separada da areia do concreto)
  // Areia de assentamento de bloco: embutida na massa_assentamento (NÃO contabilizada em separado)
  var m2ParedesComPerda  = _r(m2Paredes * (1 + perdaAlvenaria));
  var nBlocos            = Math.ceil(m2ParedesComPerda * 12.5);
  var sc_massa_asset     = Math.ceil(m2ParedesComPerda / 1.5);  // sacos massa assentamento bloco
  var sc_cimento_reboco  = Math.ceil(m2ParedesComPerda * 0.8);  // sacos 50kg: chapisco + reboco
  var m3_areia_reboco    = _r(m2ParedesComPerda * 0.02);        // areia exclusiva de reboco/chapisco
  // NOTA: areia de assentamento está embutida nos sacos de massa_assentamento; não entra em m3_areia

  // Cimento total (referência apenas — custos usam sc_cimento_conc e sc_cimento_reboco separados)
  var sc_cimento_total = sc_cimento_conc + sc_cimento_reboco;
  // Areia total = concreto + reboco/chapisco (assentamento de bloco já embutido na massa)
  var m3_areia_total   = _r(m3_areia_conc + m3_areia_reboco);

  // ── FERRAGEM ─────────────────────────────────────────────────────
  // Ferro 3/8": vigas de cintura e pilares de fundação
  //   Base: área de fundação × 8 kg/m² + por gaveta × 12 kg (vigas de bordadura)
  //   Mínimo: 1 barra completa por obra = ~6.72 kg (12m × 0.56 kg/m)
  // Ferro 5/16": estribos + amarrações — 35% do peso do 3/8"
  // Tela soldada Q138: laje de cobertura — mínimo 1 m²
  // Perda de ferragem aplicada sobre os volumes calculados
  // Constantes ABNT NBR 7480 — declaradas antes dos pisos mínimos
  // para que os próprios pisos sejam expressos em unidade base real (barra 6m)
  var KG_BARRA_38  = 3.35;  // 9,5mm  ≈ 3,35 kg/barra 6m (ABNT NBR 7480)
  var KG_BARRA_516 = 2.37;  // 8,0mm  ≈ 2,37 kg/barra 6m (ABNT NBR 7480)
  var KG_M2_TELA_Q138 = 2.1; // Tela Q138 ≈ 2,1 kg/m² (equivalência para score operacional)

  var kg_ferro38_base = _r((cUtil * lUtil * 8 + gav * 12) * (1 + perdaFerragem));
  var kg_ferro38  = Math.max(KG_BARRA_38,  kg_ferro38_base);  // mínimo: 1 barra 3/8" 6m
  var kg_ferro516_base = _r(kg_ferro38 * 0.35);
  var kg_ferro516 = Math.max(KG_BARRA_516, kg_ferro516_base); // mínimo: 1 barra 5/16" 6m

  // ── CONVERSÃO KG → BARRAS (camada financeira/comercial) ─────────
  // Camada técnica (kg) preservada acima; camada comercial usa barras.
  var nBarras38  = Math.max(1, Math.ceil(kg_ferro38  / KG_BARRA_38));
  var nBarras516 = Math.max(1, Math.ceil(kg_ferro516 / KG_BARRA_516));
  // kg equivalente comprado (auditoria: pode ser maior que kg calculado por arredondamento de barra)
  var eqKg38  = _r(nBarras38  * KG_BARRA_38);
  var eqKg516 = _r(nBarras516 * KG_BARRA_516);

  // ETAPA 3: tela soldada agora cobre base + piso perimetral
  // m2_tela_liq_base:  laje de cobertura (cUtil × lUtil) — original
  // m2_tela_liq_piso:  piso externo perimetral (m2PisoPerimetral)
  // transpasse/perda de ferragem aplicado sobre o total
  var m2_tela_liq_base = _r(cUtil * lUtil);
  var m2_tela_liq_piso = m2PisoPerimetral;
  var m2_tela_liq      = _r(m2_tela_liq_base + m2_tela_liq_piso);
  var m2_tela          = Math.max(1, Math.ceil(_r(m2_tela_liq * (1 + perdaFerragem))));

  // Melhoria 2: perda operacional do impermeabilizante (sobra de mistura, reaplicação, absorção, perda de balde)
  var perdaImpermeab = (q.perdaImpermeab != null ? q.perdaImpermeab : 5) / 100;
  var m2_impermeab = _r((cUtil * 2 + lUtil * 2) * altCorpo + cUtil * lUtil);
  // Melhoria 10: arredondamento operacional — impermeabilizante comprado por balde (≈18kg)
  var BALDE_IMPERMEAB_KG = 18;
  var kg_impermeab_liq = m2_impermeab * 1.5 * (1 + perdaImpermeab);
  var kg_impermeab = Math.ceil(kg_impermeab_liq / BALDE_IMPERMEAB_KG) * BALDE_IMPERMEAB_KG; // arredonda p/ balde

  // ── AC-II / COLA / REJUNTE (pedra) ──────────────────────────────
  // AC-II é usada SOMENTE para assentamento de pedra natural:
  //   tampas, laterais, frente, fundo — NUNCA para alvenaria ou reboco
  // Se pedras já marcadas no orçamento: usa a área real de pedra
  // Melhoria 7 (TODO futuro): pedra interna (tampa horizontal) e externa (lateral/frente/lápide)
  //   possuem perdas, dificuldade de assentamento e consumo de cola/rejunte distintos.
  //   Para projetos premium, jazigos altos e túmulos verticais, considerar pesos individuais por posição.
  var p = q.pedras || {};
  var m2Pedra = ((p.tampa    && p.tampa.on)    ? (p.tampa.m2    || 0) : 0)
              + ((p.laterais && p.laterais.on)  ? (p.laterais.m2 || 0) : 0)
              + ((p.frente   && p.frente.on)    ? (p.frente.m2   || 0) : 0)
              + ((p.fundo    && p.fundo.on)     ? (p.fundo.m2    || 0) : 0);
  // Melhoria 5: fallback inclui tampa + frente mínima (cUtil × 0.25) para não subestimar espelho frontal
  if (m2Pedra <= 0) {
    m2Pedra = _r(cUtil * lUtil + cUtil * 0.25);
  }
  // Aplica perda de pedra sobre a área real
  var m2PedraComPerda = _r(m2Pedra * (1 + perdaPedra));
  // AC-II: 1 sc 20kg cobre ~3 m² de pedra
  var sc_acii     = Math.max(1, Math.ceil(m2PedraComPerda / 3));
  var sc_cola     = Math.max(1, Math.ceil(m2PedraComPerda / 4));   // 1 sc 5kg cobre ~4m²
  var kg_rejunte  = Math.max(0.5, _r(m2PedraComPerda * 0.5));     // mínimo 0.5 kg

  // ── SCORE DE COMPLEXIDADE OPERACIONAL (0–100) ────────────────────
  // Melhoria 3: score usa volumes reais com perda (reflete esforço e logística real)
  // Melhoria 4: tela soldada participa do scoreFerragem (armação + corte + transporte)
  var scoreGav    = Math.min(40, gav * 10);
  var scoreAlt    = Math.min(20, Math.max(0, (altTotal - 0.5) / 0.5) * 5);
  var scoreVol    = Math.min(20, volConcComPerda * 15);                        // M3: usa com perda
  var scoreFerro  = Math.min(10, (kg_ferro38 + m2_tela * KG_M2_TELA_Q138) / 15); // M4: tela (KG_M2_TELA_Q138 kg/m² eq.)
  var scoreArea   = Math.min(10, (c * l - 1.5) * 4);

  // IEO do orçamento atual (se disponível) amplifica o score
  var ieoFator = 1.0;
  if (typeof TUM !== 'undefined' && TUM.calc && TUM.calc.margemReal) {
    // Margem real baixa = obra complexa = maior score
    var mr = TUM.calc.margemReal;
    ieoFator = mr < 20 ? 1.25 : mr < 30 ? 1.10 : 1.0;
  }

  // Melhoria 8: scoreGeometria — coeficiente de complexidade geométrica
  // Pondera molduras, recortes, acabamentos especiais presentes no orçamento
  var scoreGeometria = 0;
  var ac = q.acabamentos || {};
  if (ac.moldura    && ac.moldura.on)    scoreGeometria += 4;
  if (ac.pingadeira && ac.pingadeira.on) scoreGeometria += 2;
  if (ac.lateral    && ac.lateral.on)   scoreGeometria += 2;
  if (ac.polimento  && ac.polimento.on) scoreGeometria += 3;
  if (ac.resinagem  && ac.resinagem.on) scoreGeometria += 2;
  // Acabamentos via q.pedras (alternativa de acesso)
  var pAcab = q.pedras || {};
  if (pAcab.moldura    && pAcab.moldura.on)    scoreGeometria += 4;
  if (pAcab.pingadeira && pAcab.pingadeira.on) scoreGeometria += 2;
  scoreGeometria = Math.min(15, scoreGeometria); // cap em 15 pontos

  var scoreRaw = (scoreGav + scoreAlt + scoreVol + scoreFerro + scoreArea + scoreGeometria) * ieoFator;
  var score    = Math.min(100, Math.round(scoreRaw));

  // ── CLASSIFICAÇÃO DE EQUIPE ───────────────────────────────────────
  var equipeKey;
  if      (score < 20)  equipeKey = 'leve';
  else if (score < 45)  equipeKey = 'media';
  else if (score < 70)  equipeKey = 'pesada';
  else                  equipeKey = 'critica';

  var equipe = tp.equipes[equipeKey];

  // ── CUSTOS DE INSUMOS ─────────────────────────────────────────────
  var ti = tp.insumos;
  function _pc(key, qty) {
    qty = Number(qty) || 0;
    return _r(qty * (ti[key] ? ti[key].preco : 0));
  }

  // Melhoria 9 + Fix 3: custos separados por setor — areia dividida por uso real
  // custoEstrutura: só areia do concreto (m3_areia_conc)
  // custoAlvenaria: areia de reboco/chapisco (m3_areia_reboco) + massa + cimento_reboco
  var custoEstrutura = _r(
    _pc('cimento',    sc_cimento_conc)     +
    _pc('areia',      m3_areia_conc)       +
    _pc('brita',      m3_brita)            +
    _pc('ferro_38',   nBarras38)            +
    _pc('ferro_516',  nBarras516)          +
    _pc('tela_sold',  m2_tela)            +
    _pc('bloco',      nBlocos)            +
    _pc('impermeab',  Math.ceil(kg_impermeab / BALDE_IMPERMEAB_KG)) +
    _pc('trelica_h8', nBarrasTrelica)     +
    _pc('canaleta',   mlCanaleta)
  );
  var custoAlvenaria = _r(
    _pc('areia',              m3_areia_reboco)   +
    _pc('massa_assentamento', sc_massa_asset)    +
    _pc('cimento_reboco',     sc_cimento_reboco)
  );
  var custoPedra = _r(
    _pc('argamassa_acii', sc_acii)       +
    _pc('cola_epox',      sc_cola)       +
    _pc('rejunte',        kg_rejunte)
  );
  var custoInsumos = _r(custoEstrutura + custoAlvenaria + custoPedra);

  var custoEquipe = equipe ? equipe.custo : 0;
  var vendaEquipe = equipe ? equipe.venda : 0;
  var markupObra  = tp.markupObra != null ? tp.markupObra : 35;
  var vendaInsumos = _r(custoInsumos * (1 + markupObra / 100));

  var custoTotal = _r(custoInsumos + custoEquipe);
  var vendaTotal = _r(vendaInsumos + vendaEquipe);

  return {
    // Dimensões calculadas
    cUtil, lUtil, altCorpo, altTotal, altRod,

    // Volumes estruturais — ETAPA 2 (mantidos para compatibilidade)
    volFund, volAlv, volLaje, volConcGav, volConcreto, volConcComPerda,
    m2Paredes, m2ParedesComPerda, m2Tela: m2_tela,

    // ── Etapa 3: piso, concreto separado, treliça, drenagem ──────────
    // Piso perimetral
    m2PisoPerimetral, volConcretoPiso,
    // Concreto separado por camada (auditável)
    volConcretoEstrutural, volConcretoTotal,
    // Treliça H8
    mlCanaleta, nBarrasTrelica,

    // ── Etapa 2: detalhamentos adicionais (não quebram contrato existente) ──
    fundacaoDetalhada,   // { laje, vigas, reforco, total, espBase, piso, canaletas, trelicas }
    concretoDetalhado,   // { fundacao, cobertura, divisorias, nDivisorias, total, estrutural, piso, totalGeral }
    estruturaDetalhada,  // { altMinCorpo, nLajasInt, espFundBase, ..., cExt, lExt, faixaPiso, espPiso, perExt }

    // Perdas aplicadas (%)
    perdas: { concreto: perdaConcreto*100, alvenaria: perdaAlvenaria*100, ferragem: perdaFerragem*100, pedra: perdaPedra*100, impermeab: perdaImpermeab*100 },

    // Área de pedra
    m2Pedra, m2PedraComPerda,

    // Quantitativos de insumos (separados por grupo semântico)
    insumos: {
      // Estrutura civil
      cimento:            { qty: sc_cimento_conc,    unid: 'sc 50kg',  preco: ti.cimento           ? ti.cimento.preco           : 38,   grupo:'estrutura' },
      areia:              { qty: m3_areia_total,     unid: 'm³',  preco: ti.areia             ? ti.areia.preco             : 200,  grupo:'estrutura',
                            detalhe: { concreto: m3_areia_conc, reboco: m3_areia_reboco } },
      brita:              { qty: m3_brita,           unid: 'm³',  preco: ti.brita             ? ti.brita.preco             : 220,  grupo:'estrutura' },
      ferro_38:           { qty: nBarras38,          unid: 'barra 6m', preco: ti.ferro_38          ? ti.ferro_38.preco          : 16,   grupo:'estrutura',
                            kg: kg_ferro38, barras: nBarras38, eqKg: eqKg38,
                            detalhe: { kgTecnico: kg_ferro38, kgComprado: eqKg38, barras: nBarras38, kgPorBarra: KG_BARRA_38 } },
      ferro_516:          { qty: nBarras516,         unid: 'barra 6m', preco: ti.ferro_516         ? ti.ferro_516.preco         : 15,   grupo:'estrutura',
                            kg: kg_ferro516, barras: nBarras516, eqKg: eqKg516,
                            detalhe: { kgTecnico: kg_ferro516, kgComprado: eqKg516, barras: nBarras516, kgPorBarra: KG_BARRA_516 } },
      tela_sold:          { qty: m2_tela,            unid: 'm²',  preco: ti.tela_sold         ? ti.tela_sold.preco         : 52,   grupo:'estrutura',
                            m2Liq: m2_tela_liq, detalhe: { base: m2_tela_liq_base, piso: m2_tela_liq_piso } },
      bloco:              { qty: nBlocos,            unid: 'un',  preco: ti.bloco             ? ti.bloco.preco             : 4.50, grupo:'estrutura' },
      impermeab:          { qty: Math.ceil(kg_impermeab / BALDE_IMPERMEAB_KG), unid: 'balde 18kg', preco: ti.impermeab         ? ti.impermeab.preco         : 1530, grupo:'estrutura', m2Area: m2_impermeab,
                            kgTecnico: _r(kg_impermeab_liq), kgComprado: kg_impermeab,
                            baldes: Math.ceil(kg_impermeab / BALDE_IMPERMEAB_KG) },
      // ETAPA 3 — novos insumos
      trelica_h8:         { qty: nBarrasTrelica,     unid: 'barra 6m', preco: ti.trelica_h8        ? ti.trelica_h8.preco        : 18,   grupo:'estrutura',
                            detalhe: { mlLiq: mlTrelicaLiq, mlComPerda: mlTrelicaComPerda } },
      canaleta:           { qty: mlCanaleta,         unid: 'ml',      preco: ti.canaleta          ? ti.canaleta.preco          : 22,   grupo:'estrutura' },
      // Assentamento civil (NÃO AC-II)
      massa_assentamento: { qty: sc_massa_asset,     unid: 'sc 20kg',  preco: ti.massa_assentamento? ti.massa_assentamento.preco: 22,   grupo:'alvenaria' },
      cimento_reboco:     { qty: sc_cimento_reboco,  unid: 'sc 50kg',  preco: ti.cimento_reboco    ? ti.cimento_reboco.preco    : 38,   grupo:'alvenaria' },
      // Pedras e acabamento (AC-II somente aqui, baseado em área real de pedra + perda)
      argamassa_acii:     { qty: sc_acii,            unid: 'sc 20kg',  preco: ti.argamassa_acii    ? ti.argamassa_acii.preco    : 32,   grupo:'pedras', m2Pedra, m2PedraComPerda },
      cola_epox:          { qty: sc_cola,            unid: 'sc 5kg',   preco: ti.cola_epox         ? ti.cola_epox.preco         : 48,   grupo:'pedras' },
      rejunte:            { qty: kg_rejunte,         unid: 'kg',  preco: ti.rejunte           ? ti.rejunte.preco           : 14,   grupo:'pedras' }
    },

    // Equipe
    score, scoreGav, scoreAlt, scoreVol, scoreFerro, scoreArea, scoreGeometria, equipeKey,
    equipeLabel: equipe ? equipe.label : '—',
    equipeDesc:  equipe ? equipe.desc  : '—',
    custoEquipe, vendaEquipe,

    // Melhoria 9: custos separados por setor
    custoEstrutura, custoAlvenaria, custoPedra,

    // Totais
    custoInsumos, vendaInsumos,
    custoTotal, vendaTotal,
    lucroTotal: _r(vendaTotal - custoTotal)
  };
}

// ─────────────────────────────────────────────────────────────────────
// APLICAR TABELA — preenche TUM.q com os preços configurados
// ─────────────────────────────────────────────────────────────────────
function tumAplicarTabela(opts) {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var q  = TUM.q;
  if (!q.dims || typeof q.dims !== 'object') {
    if (typeof tumPatchQ === 'function') tumPatchQ();
    if (!q.dims) return;
  }
  var d = q.dims;
  opts  = opts || {};

  // 1. Pedra
  if (!q.stoneId && !q.stonePrice) {
    var pk = opts.pedraKey || q._tumPedraKey || 'granito_simples';
    q._tumPedraKey = pk;
    if (tp.pedras[pk]) q.stonePrice = tp.pedras[pk].preco;
  } else if (opts.pedraKey && !q.stoneId) {
    q._tumPedraKey = opts.pedraKey;
    if (tp.pedras[opts.pedraKey]) q.stonePrice = tp.pedras[opts.pedraKey].preco;
  }

  // 2. MO legado (marmorista + serviços)
  var tm = tp.mdo;
  if (tm.marmorista && q.mdo && q.mdo.marmorista) q.mdo.marmorista.diaria = tm.marmorista.diaria;
  ['instalacao','acabamento','montagem','transporte'].forEach(function(k) {
    if (tm[k] && q.mdo && q.mdo[k]) {
      q.mdo[k].custo = tm[k].custo;
      q.mdo[k].venda = tm[k].venda;
    }
  });

  // 3. Estrutura legada (compatibilidade com app-tumulos.js)
  if (tp.estrutura) {
    if (tp.estrutura.alvenaria_dia && q.estrutura && q.estrutura.paredes)
      q.estrutura.paredes.preco = tp.estrutura.alvenaria_dia.preco || 350;
    if (tp.estrutura.fundacao && q.estrutura && q.estrutura.fundacao)
      q.estrutura.fundacao.preco = tp.estrutura.fundacao.preco || 350;
    if (tp.estrutura.concreto && q.estrutura && q.estrutura.concreto)
      q.estrutura.concreto.preco = tp.estrutura.concreto.preco || 420;
  }

  // 4. Gaveta extra
  var gavetas = d.gavetas || q.gavetas || 1;
  var precoGavExtra = (tp.estrutura && tp.estrutura.gaveta_extra)
    ? tp.estrutura.gaveta_extra.preco : 650;
  if (gavetas > 1 && q.pedras && q.pedras.frente)
    q.pedras.frente.extra = (gavetas - 1) * precoGavExtra;

  // 5. Moldura e pingadeira
  if (tp.acabamentos.moldura    && q.pedras && q.pedras.moldura)    q.pedras.moldura.vlrMl    = tp.acabamentos.moldura.preco;
  if (tp.acabamentos.pingadeira && q.pedras && q.pedras.pingadeira) q.pedras.pingadeira.vlrMl = tp.acabamentos.pingadeira.preco;

  // 6. Lápide, Cruz, Foto
  var ta = tp.acabamentos;
  if (q.lapide && q.lapide.on && ta.lapide) {
    q.lapide.venda = ta.lapide.preco;
    if (!q.lapide.custo || opts.forceAcab)
      q.lapide.custo = Math.round(ta.lapide.preco * (ta.lapide.custoPerc||60) / 100);
  }
  if (q.cruz && q.cruz.on && ta.cruz) {
    q.cruz.venda = ta.cruz.preco;
    if (!q.cruz.custo || opts.forceAcab)
      q.cruz.custo = Math.round(ta.cruz.preco * (ta.cruz.custoPerc||55) / 100);
  }
  if (q.foto && q.foto.on && ta.foto) {
    q.foto.venda = ta.foto.preco;
    if (!q.foto.custo || opts.forceAcab)
      q.foto.custo = Math.round(ta.foto.preco * (ta.foto.custoPerc||50) / 100);
  }
}

// ─────────────────────────────────────────────────────────────────────
// SIMULADOR
// ─────────────────────────────────────────────────────────────────────
function tumSimular(pedraKey, tipoKey) {
  tumInitPrecos();
  var tp     = CFG.tumPrecos;
  var preset = TUM.TIPOS[tipoKey] || TUM.TIPOS['simples'];
  var gav    = preset.gavetas != null ? preset.gavetas : 1;
  var qd     = (typeof TUM !== 'undefined' && TUM.q && TUM.q.dims) ? TUM.q.dims : {};
  var pedra  = tp.pedras[pedraKey] || tp.pedras['granito_simples'];
  var c = qd.comp || 2.20, l = qd.larg || 0.90, a = (preset.altEst || 0.70);

  var m2Liq   = _r(c * l + c * a * 2 + l * a);
  // Fix 1: simulador usa perdaPedra (não perdaFerragem — bug corrigido)
  // Leitura: q.perdaPedra → q.perda (legado) → 15 (padrão)
  var perdaPedraSim = (typeof TUM !== 'undefined' && TUM.q && TUM.q.perdaPedra != null)
    ? TUM.q.perdaPedra
    : (typeof TUM !== 'undefined' && TUM.q && TUM.q.perda != null)
      ? TUM.q.perda : 15;
  var m2Total = _r(m2Liq * (1 + perdaPedraSim / 100));
  var custoPedra = m2Total * pedra.preco;

  // Usa motor estrutural real se possível
  var est = null;
  if (typeof TUM !== 'undefined' && TUM.q && TUM.q.dims) {
    est = _calcEstruturaFuneraria({ q: TUM.q });
  }

  var custoEst = est ? est.custoInsumos : 0;
  var custoMo  = est ? est.custoEquipe  : 0;

  // Fallback se não há TUM.q disponível
  if (!est) {
    var scoreGavSim = gav * 10;
    var eqKey = scoreGavSim < 20 ? 'leve' : scoreGavSim < 45 ? 'media' : scoreGavSim < 70 ? 'pesada' : 'critica';
    var eq = tp.equipes[eqKey];
    custoMo = eq ? eq.custo : 800;
  }

  var mo = tp.mdo;
  var diasMarmorista = preset.diasMarmorista || 2;
  custoMo += diasMarmorista * (mo.marmorista ? mo.marmorista.diaria : 400)
           + (mo.instalacao ? mo.instalacao.custo : 200)
           + (mo.acabamento ? mo.acabamento.custo : 120)
           + (mo.transporte ? mo.transporte.custo : 100);

  var custoTotal = custoPedra + custoEst + custoMo;
  var margemSim  = (typeof TUM !== 'undefined' && TUM.q && TUM.q.margem != null)
    ? (1 + TUM.q.margem / 100) : 1.40;
  var vendaTotal = custoTotal * margemSim;

  return {
    tipo: preset.label, pedra: pedra.label,
    m2: m2Total,
    custoPedra, custoEst, custoMo,
    custoTotal, vendaTotal,
    lucro: vendaTotal - custoTotal,
    est: est
  };
}

// ─────────────────────────────────────────────────────────────────────
// CONFIG UI — Tab ⚰️ Túmulos
// ─────────────────────────────────────────────────────────────────────
function buildCfgTumPrecos() {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var h  = '';

  // ── PEDRAS ────────────────────────────────────────────────────────
  h += '<div class="tp-sec-hd">🪨 PEDRAS <span class="tp-unit-badge">R$/m²</span></div>';
  h += '<div class="tp-sec-desc">Preço por m² de pedra para túmulo (independente do catálogo geral).</div>';
  h += '<div class="tp-card-grid">';
  Object.keys(tp.pedras).forEach(function(k) {
    var it = tp.pedras[k];
    h += '<div class="tp-stone-card">';
    h += '<div class="tp-sc-top"><span class="tp-sc-icon">'+ (it.icon||'🪨') +'</span>'
       + '<div><div class="tp-sc-nm">'+ it.label +'</div>'
       + '<div class="tp-sc-desc">'+ it.desc +'</div></div></div>';
    h += '<div class="tp-sc-inp-row">'
       + '<span class="tp-r-label">R$</span>'
       + '<input class="cfginp tp-big-num" type="number" min="0" value="'+ it.preco +'" '
       + 'onchange="CFG.tumPrecos.pedras[\''+ k +'\'].preco=+this.value;svCFG();">'
       + '<span class="tp-un-label">/m²</span>'
       + '</div></div>';
  });
  h += '</div>';

  // ── INSUMOS: 3 GRUPOS SEPARADOS ──────────────────────────────────
  var gruposInsumos = [
    {
      key: 'estrutura',
      icon: '🏗️',
      titulo: 'ESTRUTURA CIVIL',
      desc: 'Concreto, ferragem e alvenaria estrutural. Calculados a partir do volume e dimensões reais do túmulo.',
      keys: ['cimento','areia','brita','ferro_38','ferro_516','tela_sold','trelica_h8','canaleta','bloco','impermeab']
    },
    {
      key: 'alvenaria',
      icon: '🧱',
      titulo: 'ASSENTAMENTO CIVIL',
      desc: 'Massa para assentamento de bloco e cimento para chapisco/reboco das paredes. Não entra AC-II aqui.',
      keys: ['massa_assentamento','cimento_reboco']
    },
    {
      key: 'pedras',
      icon: '💎',
      titulo: 'PEDRAS E ACABAMENTO',
      desc: 'AC-II usada exclusivamente para assentamento de granito, mármore, tampas, laterais e lápides. Calculada pela área de pedra — nunca pela área de parede.',
      keys: ['argamassa_acii','cola_epox','rejunte']
    }
  ];

  gruposInsumos.forEach(function(grp) {
    h += '<div class="tp-sec-hd" style="margin-top:20px;">'+ grp.icon +' '+ grp.titulo +'</div>';
    h += '<div class="tp-sec-desc">'+ grp.desc +'</div>';
    h += '<div class="tp-table-wrap">';
    h += '<div class="tp-t-head-ins"><span>Insumo</span><span>Unidade</span><span>R$ Unitário</span></div>';
    grp.keys.forEach(function(k) {
      var it = tp.insumos[k];
      if (!it) return;
      h += '<div class="tp-t-row-ins">';
      h += '<span class="tp-t-nm"><span class="tp-ins-icon">'+ (it.icon||'📦') +'</span>'+ it.label +'</span>';
      h += '<span class="tp-t-un">'+ it.unid +'</span>';
      h += '<div class="tp-t-inp-wrap"><span class="tp-r-sm">R$</span>'
         + '<input class="cfginp tp-sm-num" type="number" min="0" step="0.01" value="'+ it.preco +'" '
         + 'onchange="CFG.tumPrecos.insumos[\''+ k +'\'].preco=+this.value;svCFG();">'
         + '</div>';
      h += '</div>';
    });
    h += '</div>';
  });

  // ── EQUIPES DE EMPREITADA ─────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">👷 EQUIPES DE EMPREITADA</div>';
  h += '<div class="tp-sec-desc">O sistema classifica automaticamente a equipe necessária pelo volume e complexidade estrutural do projeto. Defina o custo e o valor de venda de cada nível.</div>';
  Object.keys(tp.equipes).forEach(function(k) {
    var eq = tp.equipes[k];
    var badgeColor = {leve:'#4cda80', media:'#C9A84C', pesada:'#e08f3a', critica:'#e05a5a'}[k] || 'var(--t2)';
    h += '<div class="tp-equipe-card">';
    h += '<div class="tp-eq-top">'
       + '<span class="tp-eq-icon">'+ eq.icon +'</span>'
       + '<div class="tp-eq-info">'
       + '<div class="tp-eq-nm" style="color:'+ badgeColor +';">'+ eq.label +'</div>'
       + '<div class="tp-eq-desc">'+ eq.desc +'</div>'
       + '</div></div>';
    h += '<div class="tp-eq-inputs">'
       + '<div class="tp-eq-f"><div class="tp-eq-lbl">Custo R$</div>'
       + '<input class="cfginp tp-eq-num" type="number" min="0" value="'+ eq.custo +'" '
       + 'onchange="CFG.tumPrecos.equipes[\''+ k +'\'].custo=+this.value;svCFG();">'
       + '</div>'
       + '<div class="tp-eq-f"><div class="tp-eq-lbl">Venda R$</div>'
       + '<input class="cfginp tp-eq-num" type="number" min="0" value="'+ eq.venda +'" '
       + 'onchange="CFG.tumPrecos.equipes[\''+ k +'\'].venda=+this.value;svCFG();">'
       + '</div>'
       + '</div>';
    h += '</div>';
  });

  // ── ACABAMENTOS ───────────────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">✨ ACABAMENTOS</div>';
  h += '<div class="tp-sec-desc">Preços de venda para lápides, cruzeiros e acabamentos por ml ou m².</div>';
  h += _tpTable('acabamentos', tp.acabamentos, ['label','preco','unid']);

  // ── MÃO DE OBRA MARMORISTA ─────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">🔨 MARMORISTA E SERVIÇOS</div>';
  h += '<div class="tp-sec-desc">Marmorista especializado em assentamento. Serviços têm custo e venda separados.</div>';
  h += '<div class="tp-table-wrap">';
  h += '<div class="tp-t-head"><span>Serviço</span><span>Custo / Diária</span><span>Venda</span><span>Un</span></div>';
  Object.keys(tp.mdo).forEach(function(k) {
    var it = tp.mdo[k];
    var isDiaria = 'diaria' in it;
    h += '<div class="tp-t-row">';
    h += '<span class="tp-t-nm">'+ it.label +'</span>';
    if (isDiaria) {
      h += _tpInp('mdo', k, 'diaria', it.diaria);
      h += '<span style="font-size:.6rem;color:var(--t4);">—</span>';
    } else {
      h += _tpInp('mdo', k, 'custo', it.custo);
      h += _tpInp('mdo', k, 'venda', it.venda);
    }
    h += '<span class="tp-t-un">'+ it.unid +'</span>';
    h += '</div>';
  });
  h += '</div>';

  // ── MARKUP DE OBRA ────────────────────────────────────────────────
  var markupAtual = (tp.markupObra != null ? tp.markupObra : 35);
  h += '<div class="tp-sec-hd" style="margin-top:20px;">📐 MARKUP DE OBRA</div>';
  h += '<div class="tp-sec-desc">Margem aplicada sobre insumos e materiais. Não afeta as equipes (que já têm custo/venda separados).</div>';
  h += '<div class="tp-stone-card" style="margin-bottom:6px;">';
  h += '<div class="tp-sc-inp-row" style="padding:12px;gap:8px;">';
  h += '<span class="tp-t-nm" style="flex:1;">Markup sobre Insumos e Materiais</span>';
  h += '<input class="cfginp tp-sm-num" type="number" min="0" max="200" step="1" value="'+ markupAtual +'" ';
  h += 'onchange="CFG.tumPrecos.markupObra=+this.value;svCFG();toast(\'✓ Markup atualizado!\');" ';
  h += 'style="width:68px;text-align:right;">';
  h += '<span class="tp-un-label">%</span>';
  h += '</div></div>';

  // ── SIMULADOR RÁPIDO ──────────────────────────────────────────────
  h += '<div class="tp-sec-hd" style="margin-top:20px;">⚡ SIMULADOR</div>';
  h += '<div class="tp-sec-desc">Estimativa com motor estrutural real. Não altera o orçamento aberto.</div>';
  h += '<div id="tp-sim-wrap">'+ _tpSimBox('granito_simples', 'simples') +'</div>';

  // ── RESTAURAR PADRÃO ──────────────────────────────────────────────
  h += '<div style="padding:16px 0 10px;">';
  h += '<button class="cfgbtn" style="width:100%;padding:11px;border-radius:10px;font-size:.75rem;" ';
  h += 'onclick="if(confirm(\'Restaurar todos os preços padrão de túmulos?\')){'
     + 'CFG.tumPrecos=JSON.parse(JSON.stringify(DEF_TUM_PRECOS));svCFG();'
     + 'cfgTab=10;buildCfg();toast(\'✓ Preços restaurados!\');}">';
  h += '↺ Restaurar Preços Padrão</button>';
  h += '</div>';

  return h;
}

function _tpInp(grp, key, field, val) {
  return '<div class="tp-t-inp-wrap">'
       + '<span class="tp-r-sm">R$</span>'
       + '<input class="cfginp tp-sm-num" type="number" min="0" value="'+ val +'" '
       + 'onchange="CFG.tumPrecos.'+ grp +'[\''+ key +'\'].'+ field +'=+this.value;svCFG();">'
       + '</div>';
}

function _tpTable(grp, obj, cols) {
  var h = '<div class="tp-table-wrap">';
  h += '<div class="tp-t-head"><span>Item</span><span>Preço</span><span>Un</span></div>';
  Object.keys(obj).forEach(function(k) {
    var it = obj[k];
    h += '<div class="tp-t-row">';
    h += '<span class="tp-t-nm">'+ it.label +'</span>';
    h += _tpInp(grp, k, 'preco', it.preco);
    h += '<span class="tp-t-un">'+ it.unid +'</span>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

function _tpSimBox(pedraKey, tipoKey) {
  tumInitPrecos();
  var tp  = CFG.tumPrecos;
  var sim = tumSimular(pedraKey, tipoKey);

  var h = '<div class="tp-sim-box">';
  h += '<div class="tp-sim-sel">';
  h += '<div class="tp-sim-f"><div class="tp-sim-lbl">Tipo</div>'
     + '<select class="cfginp" style="width:100%;font-size:.72rem;" '
     + 'onchange="tpSimAtualiza(document.getElementById(\'_tp_pk\').value,this.value)">';
  Object.keys(TUM.TIPOS).forEach(function(k) {
    h += '<option value="'+ k +'"'+ (k===tipoKey?' selected':'') +'>'+ TUM.TIPOS[k].label +'</option>';
  });
  h += '</select></div>';

  h += '<div class="tp-sim-f"><div class="tp-sim-lbl">Pedra</div>'
     + '<select class="cfginp" id="_tp_pk" style="width:100%;font-size:.72rem;" '
     + 'onchange="tpSimAtualiza(this.value,document.querySelector(\'#tp-sim-wrap select\').value)">';
  Object.keys(tp.pedras).forEach(function(k) {
    h += '<option value="'+ k +'"'+ (k===pedraKey?' selected':'') +'>'+ tp.pedras[k].label +'</option>';
  });
  h += '</select></div>';
  h += '</div>';

  // Cards de resultado
  h += '<div class="tp-sim-result">';
  h += _tpSimCard('💎 Pedra',      sim.custoPedra, 'var(--t2)');
  h += _tpSimCard('🏗️ Insumos',    sim.custoEst,   'var(--t2)');
  h += _tpSimCard('👷 Equipe',      sim.est ? sim.est.custoEquipe : 0, 'var(--t2)');
  h += '</div>';

  // Painel de equipe classificada
  if (sim.est) {
    var e = sim.est;
    var badgeColor = {leve:'#4cda80',media:'#C9A84C',pesada:'#e08f3a',critica:'#e05a5a'}[e.equipeKey]||'var(--t2)';
    h += '<div class="tp-sim-equipe-badge" style="border-color:'+ badgeColor +';">';
    h += '<span style="font-size:.58rem;color:var(--t4);">Complexidade estrutural</span>';
    h += '<span class="tp-sim-score-bar"><span style="width:'+ e.score +'%;background:'+ badgeColor +';"></span></span>';
    h += '<span style="font-size:.72rem;font-weight:700;color:'+ badgeColor +';">'+ e.equipeLabel +'</span>';
    h += '<span style="font-size:.58rem;color:var(--t4);">'+ e.equipeDesc +'</span>';
    h += '</div>';
  }

  h += '<div class="tp-sim-totals">';
  h += '<div class="tp-sim-t-row"><span>Custo total</span><span style="color:var(--t2);">R$ '+ fm(sim.custoTotal) +'</span></div>';
  h += '<div class="tp-sim-t-row"><span>Venda ('+ Math.round((sim.vendaTotal / sim.custoTotal - 1) * 100) +'% margem)</span><span style="color:#4cda80;">R$ '+ fm(sim.vendaTotal) +'</span></div>';
  h += '<div class="tp-sim-t-row" style="font-weight:700;"><span>Lucro estimado</span><span style="color:#C9A84C;">R$ '+ fm(sim.lucro) +'</span></div>';
  h += '</div>';
  h += '<div class="tp-sim-footer">'+ sim.tipo +' · '+ sim.pedra +' · '+ sim.m2 +' m²</div>';
  h += '</div>';
  return h;
}

function _tpSimCard(label, val, color) {
  return '<div class="tp-sim-card">'
       + '<div class="tp-sim-card-lbl">'+ label +'</div>'
       + '<div class="tp-sim-card-val" style="color:'+ color +';">R$ '+ fm(val) +'</div>'
       + '</div>';
}

function tpSimAtualiza(pk, tk) {
  var wrap = document.getElementById('tp-sim-wrap');
  if (wrap) wrap.innerHTML = _tpSimBox(pk, tk);
}

// ─────────────────────────────────────────────────────────────────────
// PAINEL NO ORÇAMENTO — aba "Cliente"
// ─────────────────────────────────────────────────────────────────────
function _tumPrecPanel() {
  tumInitPrecos();
  var tp = CFG.tumPrecos;
  var q  = TUM.q;
  var pk = q._tumPedraKey || 'granito_simples';
  var hasStoneSel = q.stoneId && typeof CFG !== 'undefined' && CFG.stones &&
                    CFG.stones.find(function(s){ return s.id === q.stoneId; });

  var est = _calcEstruturaFuneraria();

  var h = '<div class="tpp-wrap" id="tpp-panel">';
  h += '<div class="tpp-hd" onclick="var p=this.parentElement;p.classList.toggle(\'tpp-open\');">';
  h += '<div class="tpp-hd-left"><span class="tpp-icon">⚡</span>'
     + '<span class="tpp-title">Precificação Automática</span></div>';
  h += '<span class="tpp-chevron">›</span>';
  h += '</div>';
  h += '<div class="tpp-body">';

  if (!hasStoneSel) {
    h += '<div class="tpp-info">Pedra não selecionada. Escolha uma categoria:</div>';
    h += '<div class="tpp-pedra-grid">';
    Object.keys(tp.pedras).forEach(function(k) {
      var p = tp.pedras[k];
      h += '<div class="tpp-po'+ (pk===k?' on':'') +'" '
         + 'onclick="TUM.q._tumPedraKey=\''+ k +'\''
         + ';tumAplicarTabela({pedraKey:\''+ k +'\'});tumRecalc();">';
      h += '<div class="tpp-po-icon">'+ p.icon +'</div>';
      h += '<div class="tpp-po-nm">'+ p.label +'</div>';
      h += '<div class="tpp-po-pr">R$ '+ p.preco +'/m²</div>';
      h += '</div>';
    });
    h += '</div>';
  } else {
    h += '<div class="tpp-stone-ok">✓ Pedra: '+ hasStoneSel.nm +' — R$ '+ fm(hasStoneSel.pr) +'/m²</div>';
  }

  // Painel estrutural inline
  if (est) {
    var badgeColor = {leve:'#4cda80',media:'#C9A84C',pesada:'#e08f3a',critica:'#e05a5a'}[est.equipeKey]||'var(--t2)';
    h += '<div class="tpp-est-wrap">';
    h += '<div class="tpp-est-hd">🏗️ Motor Estrutural</div>';

    // Score e equipe
    h += '<div class="tpp-est-equipe" style="border-color:'+ badgeColor +';">';
    h += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
    h += '<span style="font-size:.64rem;font-weight:700;color:'+ badgeColor +';">'+ est.equipeLabel +'</span>';
    h += '<span style="font-size:.58rem;color:var(--t4);">Score: '+ est.score +'/100</span>';
    h += '</div>';
    h += '<div class="tpp-score-bar"><div style="width:'+ est.score +'%;background:'+ badgeColor +';height:100%;border-radius:3px;transition:width .4s;"></div></div>';
    h += '<div style="font-size:.58rem;color:var(--t4);margin-top:4px;">'+ est.equipeDesc +'</div>';
    h += '</div>';

    // Dimensões base
    h += '<div class="tpp-est-dims">';
    h += '<span>Corpo útil: '+ est.cUtil.toFixed(2) +'×'+ est.lUtil.toFixed(2) +'m</span>';
    h += '<span>Alt. total: '+ est.altTotal.toFixed(2) +'m</span>';
    h += '<span>Concreto: '+ est.volConcreto.toFixed(3) +' m³</span>';
    h += '<span>Alvenaria: '+ est.m2Paredes.toFixed(2) +' m²</span>';
    h += '</div>';

    // Resumo de insumos
    h += '<div class="tpp-ins-list">';
    var insLabels = {
      // Estrutura civil
      cimento:'Cimento (estrutura)', areia:'Areia', brita:'Brita',
      ferro_38:'Ferro 3/8"', ferro_516:'Ferro 5/16"', tela_sold:'Tela Q138',
      bloco:'Blocos', impermeab:'Impermeab.',
      // Assentamento civil
      massa_assentamento:'Massa Assentamento', cimento_reboco:'Cimento Reboco',
      // Pedras e acabamento
      argamassa_acii:'AC-II (pedra)', cola_epox:'Cola Epóxi', rejunte:'Rejunte'
    };
    Object.keys(est.insumos).forEach(function(k) {
      var ins = est.insumos[k];
      if (!ins.qty || ins.qty <= 0) return;
      var custo = _r(ins.qty * ins.preco);
      // Pluralização: "1 barra 6m" vs "2 barras 6m", "1 sc" vs "3 sc", etc.
      var unidExib = ins.unid;
      if (ins.qty !== 1) {
        unidExib = unidExib
          .replace(/^barra\b/, 'barras')
          .replace(/^balde\b/, 'baldes');
      }
      h += '<div class="tpp-ins-row">';
      h += '<span>'+ (insLabels[k]||k) +'</span>';
      h += '<span class="tpp-ins-qty">'+ ins.qty +' '+ unidExib +'</span>';
      h += '<span class="tpp-ins-vlr">R$ '+ fm(custo) +'</span>';
      h += '</div>';
    });
    h += '</div>';

    h += '<div class="tpp-est-tot">';
    h += '<div class="tpp-est-tot-row"><span>Insumos</span><span>R$ '+ fm(est.custoInsumos) +'</span></div>';
    h += '<div class="tpp-est-tot-row"><span>Empreitada ('+ est.equipeLabel +')</span><span>R$ '+ fm(est.custoEquipe) +'</span></div>';
    h += '<div class="tpp-est-tot-row tpp-est-tot-bold"><span>Total Estrutura</span><span style="color:#C9A84C;">R$ '+ fm(est.custoTotal) +'</span></div>';
    h += '</div>';
    h += '</div>'; // tpp-est-wrap
  }

  h += '<button class="btn btn-g tpp-btn" '
     + 'onclick="tumAplicarTabela({pedraKey:TUM.q._tumPedraKey||\'granito_simples\',forceAcab:true});'
     + 'tumRecalc();toast(\'⚡ Preços aplicados automaticamente!\');">';
  h += '⚡ Aplicar Tabela de Preços ao Orçamento</button>';

  var r = TUM.calc;
  if (r && r.vendaTotal > 0) {
    h += '<div class="tpp-mini-sum">';
    h += '<div class="tpp-ms-row"><span>💎 Pedra</span><span>R$ '+ fm(r.vendaPedra||0) +'</span></div>';
    h += '<div class="tpp-ms-row"><span>🔨 Mão de Obra</span><span>R$ '+ fm(r.vendaMdo||0) +'</span></div>';
    h += '<div class="tpp-ms-row"><span>🧱 Estrutura</span><span>R$ '+ fm(r.custoObra||0) +'</span></div>';
    h += '<div class="tpp-ms-row"><span>✨ Extras</span><span>R$ '+ fm((r.vendaAcab||0)+(r.vendaLapide||0)+(r.vendaCruz||0)+(r.vendaFoto||0)) +'</span></div>';
    h += '<div class="tpp-ms-total"><span>💰 Valor Final</span><span>R$ '+ fm(r.venda||0) +'</span></div>';
    h += '</div>';
  }

  h += '</div></div>';
  return h;
}

// ─────────────────────────────────────────────────────────────────────
// CSS
// ─────────────────────────────────────────────────────────────────────
(function _injectCSS() {
  var s = document.createElement('style');
  s.id = 'tp-precif-styles';
  s.textContent = `
    /* ──── Config Tab Túmulos ──── */
    .tp-sec-hd {
      font-size:.56rem; letter-spacing:2px; text-transform:uppercase;
      color:var(--gold); font-weight:700;
      padding:4px 0 6px; border-bottom:1px solid rgba(201,168,76,.2); margin-bottom:8px;
      display:flex; align-items:center; gap:8px;
    }
    .tp-unit-badge {
      font-size:.5rem; background:rgba(201,168,76,.15);
      color:var(--gold3); padding:2px 6px; border-radius:4px;
      letter-spacing:.5px; font-weight:600; text-transform:none;
    }
    .tp-sec-desc { font-size:.62rem; color:var(--t3); margin-bottom:12px; line-height:1.5; }

    /* Cards de pedra */
    .tp-card-grid { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:6px; }
    .tp-stone-card {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px; overflow:hidden;
    }
    .tp-sc-top {
      display:flex; align-items:center; gap:8px; padding:9px 11px;
      background:rgba(255,255,255,.03); border-bottom:1px solid var(--bd2);
    }
    .tp-sc-icon { font-size:1.2rem; }
    .tp-sc-nm   { font-size:.66rem; font-weight:700; color:var(--t2); }
    .tp-sc-desc { font-size:.56rem; color:var(--t4); margin-top:1px; }
    .tp-sc-inp-row { display:flex; align-items:center; gap:4px; padding:9px 11px; }
    .tp-r-label { font-size:.6rem; color:var(--t3); }
    .tp-big-num {
      background:transparent; border:none; outline:none;
      color:var(--gold2); font-family:Outfit,sans-serif;
      font-size:.92rem; font-weight:800; width:100%; text-align:center;
    }
    .tp-un-label { font-size:.58rem; color:var(--t4); white-space:nowrap; }

    /* Tabela de insumos */
    .tp-table-wrap {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px;
      overflow:hidden; margin-bottom:6px;
    }
    .tp-t-head-ins {
      display:grid; grid-template-columns:2fr 1fr 1fr; padding:7px 12px;
      background:rgba(201,168,76,.07); border-bottom:1px solid var(--bd2);
    }
    .tp-t-head-ins span { font-size:.5rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--t4); font-weight:700; }
    .tp-t-row-ins {
      display:grid; grid-template-columns:2fr 1fr 1fr; align-items:center;
      padding:6px 12px; border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tp-t-row-ins:last-child { border-bottom:none; }
    .tp-ins-icon { font-size:.8rem; margin-right:4px; }

    /* Tabela genérica (acabamentos, MO) */
    .tp-t-head {
      display:grid; grid-template-columns:2fr 1fr 1fr 0.6fr; padding:7px 12px;
      background:rgba(201,168,76,.07); border-bottom:1px solid var(--bd2);
    }
    .tp-t-head span { font-size:.5rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--t4); font-weight:700; }
    .tp-t-row {
      display:grid; grid-template-columns:2fr 1fr 1fr 0.6fr; align-items:center;
      padding:7px 12px; border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tp-t-row:last-child { border-bottom:none; }
    .tp-t-nm   { font-size:.65rem; color:var(--t2); line-height:1.4; }
    .tp-t-inp-wrap { display:flex; align-items:center; gap:3px; }
    .tp-r-sm   { font-size:.54rem; color:var(--t4); }
    .tp-t-un   { font-size:.6rem; color:var(--gold3); font-weight:600; }
    .tp-sm-num {
      background:var(--s2); border:1px solid var(--bd2); border-radius:6px;
      outline:none; color:var(--gold2); font-family:Outfit,sans-serif;
      font-size:.72rem; font-weight:700; width:68px; padding:4px 6px; text-align:right;
    }

    /* Cards de equipe */
    .tp-equipe-card {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px;
      overflow:hidden; margin-bottom:8px;
    }
    .tp-eq-top {
      display:flex; align-items:center; gap:10px;
      padding:10px 13px; border-bottom:1px solid var(--bd2);
      background:rgba(255,255,255,.02);
    }
    .tp-eq-icon { font-size:1.4rem; }
    .tp-eq-nm   { font-size:.72rem; font-weight:800; margin-bottom:2px; }
    .tp-eq-desc { font-size:.58rem; color:var(--t4); line-height:1.4; }
    .tp-eq-inputs {
      display:grid; grid-template-columns:1fr 1fr; gap:8px; padding:10px 13px;
    }
    .tp-eq-f   { display:flex; flex-direction:column; gap:4px; }
    .tp-eq-lbl { font-size:.52rem; color:var(--t4); letter-spacing:1px; text-transform:uppercase; }
    .tp-eq-num {
      background:var(--s2); border:1px solid var(--bd2); border-radius:8px;
      outline:none; color:var(--gold2); font-family:Outfit,sans-serif;
      font-size:.82rem; font-weight:800; width:100%; padding:7px 10px; text-align:right;
    }

    /* Simulador */
    .tp-sim-box {
      background:var(--s3); border:1px solid var(--bd2); border-radius:14px;
      padding:13px; margin-bottom:6px;
    }
    .tp-sim-sel   { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-bottom:12px; }
    .tp-sim-f     { display:flex; flex-direction:column; gap:4px; }
    .tp-sim-lbl   { font-size:.52rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--t4); }
    .tp-sim-result { display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px; margin-bottom:10px; }
    .tp-sim-card  { background:var(--s2); border-radius:8px; padding:8px 6px; text-align:center; }
    .tp-sim-card-lbl { font-size:.52rem; color:var(--t4); margin-bottom:3px; }
    .tp-sim-card-val { font-size:.74rem; font-weight:700; }
    .tp-sim-equipe-badge {
      border:1px solid; border-radius:10px; padding:8px 10px;
      margin-bottom:8px; display:flex; flex-direction:column; gap:4px;
    }
    .tp-sim-score-bar {
      height:4px; background:rgba(255,255,255,.1); border-radius:3px; overflow:hidden;
    }
    .tp-sim-score-bar span { display:block; height:100%; border-radius:3px; }
    .tp-sim-totals { background:var(--s2); border-radius:8px; overflow:hidden; }
    .tp-sim-t-row {
      display:flex; justify-content:space-between; padding:7px 11px;
      border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tp-sim-t-row span:first-child { font-size:.64rem; color:var(--t3); }
    .tp-sim-t-row span:last-child  { font-size:.68rem; color:var(--t2); font-weight:600; }
    .tp-sim-t-row:last-child { border-bottom:none; }
    .tp-sim-footer { font-size:.58rem; color:var(--t4); text-align:center; margin-top:8px; }

    /* ──── Painel no orçamento ──── */
    .tpp-wrap {
      background:var(--s2); border:1px solid rgba(201,168,76,.3);
      border-radius:14px; overflow:hidden; margin:8px 0 12px;
    }
    .tpp-hd {
      display:flex; justify-content:space-between; align-items:center;
      padding:12px 14px; cursor:pointer; user-select:none;
    }
    .tpp-hd-left { display:flex; align-items:center; gap:8px; }
    .tpp-icon    { font-size:1.1rem; }
    .tpp-title   { font-size:.78rem; font-weight:700; color:var(--gold2); }
    .tpp-chevron {
      font-size:1.3rem; color:var(--gold3); transition:transform .3s; display:inline-block;
    }
    .tpp-wrap.tpp-open .tpp-chevron { transform:rotate(90deg); }
    .tpp-body    { display:none; padding:0 14px 14px; }
    .tpp-wrap.tpp-open .tpp-body { display:block; }

    .tpp-info     { font-size:.62rem; color:var(--t3); margin-bottom:8px; line-height:1.5; }
    .tpp-stone-ok { font-size:.66rem; color:#4cda80; background:rgba(76,218,128,.08);
                    border:1px solid rgba(76,218,128,.2); border-radius:8px;
                    padding:7px 10px; margin-bottom:10px; }
    .tpp-pedra-grid { display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:10px; }
    .tpp-po {
      background:var(--s3); border:1px solid var(--bd2); border-radius:10px;
      padding:8px 6px; cursor:pointer; text-align:center; transition:border-color .2s, background .2s;
    }
    .tpp-po.on { border-color:var(--gold); background:rgba(201,168,76,.1); }
    .tpp-po-icon { font-size:1.1rem; margin-bottom:3px; }
    .tpp-po-nm   { font-size:.62rem; font-weight:700; color:var(--t2); }
    .tpp-po-pr   { font-size:.58rem; color:var(--gold3); margin-top:2px; }

    /* Painel estrutural inline */
    .tpp-est-wrap {
      background:var(--s3); border:1px solid var(--bd2); border-radius:12px;
      padding:10px 12px; margin:10px 0;
    }
    .tpp-est-hd {
      font-size:.58rem; letter-spacing:1.5px; text-transform:uppercase;
      color:var(--gold3); font-weight:700; margin-bottom:8px;
    }
    .tpp-est-equipe {
      border:1px solid; border-radius:8px; padding:8px 10px; margin-bottom:8px;
    }
    .tpp-score-bar {
      height:4px; background:rgba(255,255,255,.1); border-radius:3px;
      overflow:hidden; margin:4px 0;
    }
    .tpp-est-dims {
      display:grid; grid-template-columns:1fr 1fr; gap:3px 10px;
      font-size:.6rem; color:var(--t4); margin-bottom:8px;
    }
    .tpp-ins-list {
      background:rgba(0,0,0,.2); border-radius:8px; overflow:hidden; margin-bottom:8px;
    }
    .tpp-ins-row {
      display:grid; grid-template-columns:2fr 1fr 1fr; align-items:center;
      padding:5px 10px; border-bottom:1px solid rgba(255,255,255,.03);
      font-size:.6rem;
    }
    .tpp-ins-row:last-child { border-bottom:none; }
    .tpp-ins-row span:first-child { color:var(--t3); }
    .tpp-ins-qty { color:var(--t4); font-size:.58rem; text-align:center; }
    .tpp-ins-vlr { color:var(--t2); font-weight:600; text-align:right; }
    .tpp-est-tot { background:rgba(201,168,76,.06); border-radius:8px; overflow:hidden; }
    .tpp-est-tot-row {
      display:flex; justify-content:space-between; align-items:center;
      padding:6px 10px; border-bottom:1px solid rgba(255,255,255,.04);
      font-size:.64rem; color:var(--t3);
    }
    .tpp-est-tot-row span:last-child { color:var(--t2); font-weight:600; }
    .tpp-est-tot-row:last-child { border-bottom:none; }
    .tpp-est-tot-bold { font-weight:700 !important; }
    .tpp-est-tot-bold span { font-size:.7rem !important; }

    .tpp-btn { width:100%; padding:12px; margin-top:2px; font-size:.76rem; }
    .tpp-mini-sum {
      background:var(--s3); border-radius:10px; overflow:hidden; margin-top:10px;
    }
    .tpp-ms-row {
      display:flex; justify-content:space-between; padding:7px 12px;
      border-bottom:1px solid rgba(255,255,255,.04);
    }
    .tpp-ms-row span:first-child { font-size:.64rem; color:var(--t3); }
    .tpp-ms-row span:last-child  { font-size:.68rem; color:var(--t2); font-weight:600; }
    .tpp-ms-total {
      display:flex; justify-content:space-between; padding:9px 12px;
      background:rgba(201,168,76,.08);
    }
    .tpp-ms-total span:first-child { font-size:.7rem; color:var(--gold3); font-weight:700; }
    .tpp-ms-total span:last-child  { font-size:.82rem; color:#4cda80; font-weight:800; }
  `;
  document.head.appendChild(s);
})();

// ─────────────────────────────────────────────────────────────────────
// BOOT — após DOM pronto
// ─────────────────────────────────────────────────────────────────────
window.addEventListener('load', function _tumPrecBoot() {

  tumInitPrecos();

  // Injeta aba ⚰️ Túmulos (tab 10)
  var cfgTabs = document.getElementById('cfgTabs');
  if (cfgTabs && !cfgTabs.querySelector('[data-cftab="10"]')) {
    var newTab = document.createElement('div');
    newTab.className = 'cfgtab';
    newTab.setAttribute('data-cftab', '10');
    newTab.textContent = '⚰️ Túmulos';
    cfgTabs.appendChild(newTab);
  }

  // Patch buildCfg → renderiza tab 10
  if (typeof buildCfg === 'function') {
    var _origBuildCfg = buildCfg;
    buildCfg = function() {
      if (typeof cfgTab !== 'undefined' && cfgTab === 10) {
        tumInitPrecos();
        var body = document.getElementById('cfgBody');
        if (body) body.innerHTML = buildCfgTumPrecos();
      } else {
        _origBuildCfg();
      }
    };
  }

  // Patch tumSetTipo → auto-aplica tabela ao trocar preset
  if (typeof tumSetTipo === 'function') {
    var _origTumSetTipo = tumSetTipo;
    tumSetTipo = function(t) {
      _origTumSetTipo(t);
      tumAplicarTabela({ pedraKey: (TUM.q._tumPedraKey || 'granito_simples') });
      if (typeof tumRecalc === 'function') tumRecalc();
    };
  }

  // Patch _tumRenderTab → injeta painel na aba "cliente"
  if (typeof _tumRenderTab === 'function') {
    var _origRenderTab = _tumRenderTab;
    _tumRenderTab = function() {
      _origRenderTab();
      if (typeof _tumTab !== 'undefined' && _tumTab === 'cliente') {
        var body = document.getElementById('tumBody');
        if (!body) return;
        var navRow = body.querySelector('.tum-nav-row');
        if (!navRow) return;
        var wasOpen = !!document.querySelector('.tpp-wrap.tpp-open');
        var wrapper = document.createElement('div');
        wrapper.innerHTML = _tumPrecPanel();
        var panel = wrapper.firstChild;
        navRow.parentNode.insertBefore(panel, navRow);
        if (wasOpen && panel) panel.classList.add('tpp-open');
      }
    };
  }

});
