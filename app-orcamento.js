// ══════════════════════════════════
// MATERIAL, SERVIÇOS, AMBIENTES, CÁLCULO
// ══════════════════════════════════

// ═══ NOVO ORÇAMENTO ═══
function novoOrcamento(){
  // Confirmação para evitar perda acidental de dados
  if(ambientes.length > 0){
    var temDados = false;
    try {
      var cli = document.getElementById('oCliente')&&document.getElementById('oCliente').value.trim();
      if(cli) temDados = true;
      if(!temDados) ambientes.forEach(function(a){
        (a.pecas||[]).forEach(function(p){ if(p.w||p.h||p.desc) temDados=true; });
      });
    } catch(e){}
    if(temDados && !confirm('Deseja realmente iniciar um novo orçamento?\n\nO orçamento atual será apagado.\n\nSe quiser salvá-lo antes, cancele e clique em "Calcular Orçamento".')){
      return;
    }
  }

  // Limpa campos do cliente
  ['oCliente','oTel','oCidade','oEnd','oObs'].forEach(function(id){
    var el = document.getElementById(id);
    if(el) el.value = '';
  });

  // Reseta ambientes para um único ambiente limpo
  var savedMat = null;
  try { savedMat = localStorage.getItem('hr_last_mat'); } catch(e){}
  var defaultMat = savedMat || selMat || null;
  ambientes = [{
    id: Date.now(),
    tipo: 'Cozinha',
    pecas: [{id: Date.now()+1, desc:'', w:0, h:0, q:1}],
    selCuba: null,
    svState: {},
    acState: {},
    selMat: defaultMat
  }];

  // Esconde área de resultado se estiver visível
  var resArea = document.getElementById('resArea');
  if(resArea) resArea.style.display = 'none';

  renderAmbientes();

  // Volta ao topo da página
  var pg = document.getElementById('pg0');
  if(pg) pg.scrollTop = 0;

  toast('✦ Novo orçamento pronto!');
}

// ═══ PHOTO PICKER ═══
function pickPhoto(target,idx){fileTarget={t:target,i:idx};document.getElementById('fileInp').click();}
function onFile(e){
  var file=e.target.files[0];if(!file||!fileTarget)return;
  var r=new FileReader();
  r.onload=function(ev){
    // Resize image before saving to avoid localStorage overflow
    var img=new Image();
    img.onload=function(){
      var canvas=document.createElement('canvas');
      var maxW=500;
      var scale=Math.min(1,maxW/img.width);
      canvas.width=Math.round(img.width*scale);
      canvas.height=Math.round(img.height*scale);
      canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
      var d=canvas.toDataURL('image/jpeg',0.78);
      var t=fileTarget.t,i=fileTarget.i;
      if(t==='stone')CFG.stones[i].photo=d;
      else if(t==='coz')CFG.coz[i].photo=d;
      else if(t==='lav')CFG.lav[i].photo=d;
      else if(t==='ac')CFG.ac[i].photo=d;
      svCFG();
      buildMat();buildCatalog();buildCubaList();buildCfg();
      toast('✓ Foto atualizada!');
    };
    img.src=ev.target.result;
  };
  r.readAsDataURL(file);
  e.target.value='';
}

// ═══ MATERIAL ═══
function buildMat(){renderAmbientes();}

function pickMat(id){
  selMat = id;
  // Persiste escolha para não resetar no reload
  try { localStorage.setItem('hr_last_mat', id); } catch(e){}
  // Sincroniza TODOS os ambientes (garante calcular() usar a pedra correta)
  if (ambientes && ambientes.length) {
    ambientes.forEach(function(a) { a.selMat = id; });
  }
  // Atualiza visual do picker global se existir
  document.querySelectorAll('[data-mat]').forEach(function(c) {
    c.classList.toggle('on', c.dataset.mat === id);
  });
}

// ═══ SERVIÇOS ═══

var SV_DEFS={
'Cozinha':[
  {g:'Sainha',its:[{k:'s_reta',l:'Sainha Reta',u:'sf'},{k:'s_45',l:'Sainha 45°',u:'sf'},{k:'s_boleada',l:'Sainha Boleada',u:'sf'},{k:'s_slim',l:'Sainha Slim',u:'sf'}]},
  {g:'Frontão',its:[{k:'frontao',l:'Frontão Reto',u:'sf'},{k:'frontao_chf',l:'Frontão Chanfrado',u:'sf'}]},
  {g:'Furos & Recortes',its:[{k:'forn',l:'Furo Torneira',u:'un',fx:0},{k:'fralo',l:'Furo Ralo',u:'un',fx:0},{k:'cook',l:'Recorte Cooktop',u:'un',fx:1}]},
  {g:'Rebaixo',its:[{k:'reb_n',l:'Rebaixo Normal',u:'un',fx:1},{k:'reb_a',l:'Rebaixo Americano',u:'un',fx:1}]},
  {g:'Cuba',its:[{k:'cuba_coz',l:'Escolher cuba inox ou esculpida',u:'cuba',ctp:'coz'}]},
  {g:'Área Molhada',its:[{k:'rodape',l:'Rodapé de Pedra',u:'sf'}]},
  {g:'Fixação',its:[{k:'tubo',l:'Tubo Metálico',u:'un',fx:0},{k:'cant',l:'Cantoneira',u:'un',fx:0}]},
  {g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},
  {g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}
]};
SV_DEFS.Banheiro=[
  {g:'Sainha',its:[{k:'s_reta',l:'Sainha Reta',u:'sf'},{k:'s_45',l:'Sainha 45°',u:'sf'},{k:'s_boleada',l:'Sainha Boleada',u:'sf'},{k:'s_slim',l:'Sainha Slim',u:'sf'}]},
  {g:'Frontão',its:[{k:'frontao',l:'Frontão Reto',u:'sf'},{k:'frontao_chf',l:'Frontão Chanfrado',u:'sf'}]},
  {g:'Furos',its:[{k:'forn',l:'Furo Torneira',u:'un',fx:0},{k:'fralo',l:'Furo Ralo',u:'un',fx:0}]},
  {g:'Área Molhada',its:[{k:'rodape',l:'Rodapé de Pedra',u:'sf'}]},
  {g:'Cuba / Lavatório',its:[{k:'cuba_lav',l:'Escolher cuba ou lavatório',u:'cuba',ctp:'lav'}]},
  {g:'Fixação',its:[{k:'tubo',l:'Tubo Metálico',u:'un',fx:0},{k:'cant',l:'Cantoneira',u:'un',fx:0}]},
  {g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},
  {g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}
];
SV_DEFS.Lavabo=[{g:'Sainha',its:[{k:'s_reta',l:'Sainha Reta',u:'sf'},{k:'s_45',l:'Sainha 45°',u:'sf'}]},{g:'Frontão',its:[{k:'frontao',l:'Frontão Reto',u:'sf'},{k:'frontao_chf',l:'Frontão Chanfrado',u:'sf'}]},{g:'Furos',its:[{k:'forn',l:'Furo Torneira',u:'un',fx:0}]},{g:'Área Molhada',its:[{k:'rodape',l:'Rodapé de Pedra',u:'sf'}]},{g:'Cuba / Lavatório',its:[{k:'cuba_lav',l:'Escolher cuba ou lavatório',u:'cuba',ctp:'lav'}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Soleira=[{g:'Acabamento',its:[{k:'sol_sem',l:'Sem acabamento',u:'acb_auto',lados:0},{k:'sol1',l:'Acabamento 1 lado',u:'acb_auto',lados:1},{k:'sol2',l:'Acabamento 2 lados',u:'acb_auto',lados:2},{k:'sol_45',l:'Soleira em 45°',u:'acb_auto',lados:1,is45:true}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Peitoril=[{g:'Tipo',its:[{k:'peit_reto',l:'Peitoril Reto',u:'ml_auto'},{k:'peit_ping',l:'c/ Pingadeira',u:'ml_auto'},{k:'peit_col',l:'c/ Pedra Colada + Pingadeira',u:'ml_auto'},{k:'peit_portal',l:'p/ Portal Madeira',u:'ml_auto'}]},{g:'Acabamento',its:[{k:'peit_sem',l:'Sem acabamento',u:'acb_auto',lados:0},{k:'peit_acb1',l:'Acabamento 1 lado',u:'acb_auto',lados:1},{k:'peit_acb2',l:'Acabamento 2 lados',u:'acb_auto',lados:2}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Escada=[{g:'Sainha',its:[{k:'s_reta',l:'Sainha Reta',u:'sf'},{k:'s_45',l:'Sainha 45°',u:'sf'},{k:'s_boleada',l:'Sainha Boleada',u:'sf'}]},{g:'Frontão',its:[{k:'frontao',l:'Frontão Reto',u:'sf'},{k:'frontao_chf',l:'Frontão Chanfrado',u:'sf'}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Fachada=[{g:'Fixação',its:[{k:'tubo',l:'Tubo Metálico',u:'un',fx:0},{k:'cant',l:'Cantoneira',u:'un',fx:0}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Outro=SV_DEFS.Cozinha;
SV_DEFS['🍽️ Balcão']=[
  {g:'Fixação',its:[{k:'tubo',l:'Tubo Metálico',u:'un',fx:0},{k:'cant',l:'Cantoneira p/ Balcão',u:'un',fx:0}]},
  {g:'Instalação',its:[{k:'inst',l:'Instalação c/ Argamassa AC-3',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},
  {g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}
];
SV_DEFS['Rodapé de Box']=[{g:'Acabamento',its:[{k:'rdbox_sem',l:'Sem acabamento',u:'acb_auto',lados:0},{k:'rdbox_sup',l:'Acabamento Superior (1 lado)',u:'acb_auto',lados:1}]},{g:'Colagem',its:[{k:'rdbox_cola',l:'Cola p/ Colagem (2 pedras)',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];

// ─── DIVISÓRIA WC ────────────────────────────────────────────────
SV_DEFS['🚽 Divisória WC']=[
  {g:'Recortes',its:[
    {k:'div_recorte', l:'Recorte de Abertura (embaixo)', u:'un', fx:0}
  ]},
  {g:'Instalação',its:[
    {k:'div_inst', l:'Instalação c/ Vergalhão Chumbado', u:'un', fx:0}
  ]},
  {g:'⚠️ Não incluso',its:[
    {k:'div_obs_nota', l:'Porta de Alumínio (fornecimento)', u:'info'},
    {k:'div_obs_inst', l:'Instalação da Porta', u:'info'}
  ]},
  {g:'Deslocamento',its:[
    {k:'desl_cid', l:'Na cidade', u:'livre'},
    {k:'desl_for', l:'Fora da cidade', u:'km', fx:0}
  ]}
];

// ─── BORDA DE PISCINA ────────────────────────────────────────────
SV_DEFS['🏊 Borda Piscina']=[
  {g:'Acabamento da Borda',its:[
    {k:'bp_boleada',    l:'Boleada',         u:'ml'},
    {k:'bp_antiderap',  l:'Antiderrapante',  u:'ml'},
    {k:'bp_pingad',     l:'Pingadeira',      u:'ml'},
    {k:'bp_mcana',      l:'Meia Cana',       u:'ml'},
    {k:'bp_chanfro',    l:'Chanfro',         u:'ml'}
  ]},
  {g:'Cantos / Curvas',its:[
    {k:'bp_c_arred',    l:'Cantos Arredondados', u:'un'},
    {k:'bp_c_curva',    l:'Curvas Especiais',    u:'un'},
    {k:'bp_c_infinita', l:'Borda Infinita',      u:'un'}
  ]},
  {g:'Instalação',its:[
    {k:'inst',  l:'Instalação Padrão',   u:'un',fx:1},
    {k:'inst_c',l:'Instalação Complexa', u:'un',fx:1}
  ]},
  {g:'Deslocamento',its:[
    {k:'desl_cid',l:'Na cidade',      u:'livre'},
    {k:'desl_for',l:'Fora da cidade', u:'km',fx:0}
  ]}
];

SV_DEFS.Tumulo=[
  // ── Peças de pedra: calculado automaticamente pelas peças preenchidas ──
  {g:'🪨 Peças de Pedra (m²)',its:[
    {k:'tum_tampa',  l:'Tampa Superior',           u:'sf_auto', match:'tampa'},
    {k:'tum_lat',    l:'Laterais (×2)',            u:'sf_auto', match:'lateral'},
    {k:'tum_front',  l:'Frente / Frontal',         u:'sf_auto', match:'front'},
    {k:'tum_base',   l:'Base / Plataforma',        u:'sf_auto', match:'base'},
    {k:'tum_det',    l:'Detalhe Superior',         u:'sf_auto', match:'detalhe'},
    {k:'tum_sainha', l:'Sainha Frontal',           u:'sf_auto', match:'sainha'},
    {k:'tum_gav1',   l:'Frente de Gaveta — 1ª',   u:'sf_auto', match:'gaveta 1'},
    {k:'tum_gav2',   l:'Frente de Gaveta — 2ª',   u:'sf_auto', match:'gaveta 2'},
    {k:'tum_gav3',   l:'Frente de Gaveta — 3ª',   u:'sf_auto', match:'gaveta 3'}
  ]},
  // ── Acabamentos em metro linear ──
  {g:'📐 Acabamentos (ml)',its:[
    {k:'tum_mol',    l:'Moldura decorativa',       u:'ml'},
    {k:'tum_ping',   l:'Pingadeira',               u:'ml'},
    {k:'tum_bisel',  l:'Borda Biselada',           u:'ml'}
  ]},
  // ── Itens por unidade com preço fixo ──
  {g:'🪦 Lápide / Foto / Cruz',its:[
    {k:'tum_lapide', l:'Lápide de Granito',        u:'un', fx:1},
    {k:'tum_plaq',   l:'Plaquinha Gravada',        u:'un', fx:1},
    {k:'tum_foto',   l:'Foto em Porcelana',        u:'un', fx:1},
    {k:'tum_cruz',   l:'Cruz em Granito',          u:'un', fx:1},
    {k:'tum_pol',    l:'Polimento Extra',           u:'un', fx:1},
    {k:'tum_rec',    l:'Recorte / Furo',           u:'un', fx:0}
  ]},
  // ── Mão de obra ──
  {g:'🔨 Mão de Obra',its:[
    {k:'tum_mont',   l:'Montagem / Instalação',    u:'un', fx:1},
    {k:'tum_montc',  l:'Instalação Complexa',      u:'un', fx:1}
  ]},
  // ── Construção e materiais: valores livres informados pelo vendedor ──
  {g:'🧱 Construção & Materiais',its:[
    {k:'tum_fund',   l:'Fundação',                 u:'livre'},
    {k:'tum_lev',    l:'Levantamento / Alvenaria', u:'livre'},
    {k:'tum_reb',    l:'Reboco / Chapisco',        u:'livre'},
    {k:'tum_conc',   l:'Concreto Armado',          u:'livre'},
    {k:'tum_cpiso',  l:'Contra-piso',              u:'livre'},
    {k:'tum_acob',   l:'Acabamento Final Obra',    u:'livre'},
    {k:'tum_cim',    l:'Cimento / Areia',          u:'livre'},
    {k:'tum_cola',   l:'Cola p/ Granito',          u:'livre'},
    {k:'tum_rej',    l:'Rejunte',                  u:'livre'},
    {k:'tum_ferro',  l:'Ferro / Tela',             u:'livre'},
    {k:'tum_tijolo', l:'Tijolos / Blocos',         u:'livre'},
    {k:'tum_frete',  l:'Frete / Entrega Material', u:'livre'}
  ]},
  {g:'Deslocamento',its:[
    {k:'desl_cid',   l:'Na cidade',                u:'livre'},
    {k:'desl_for',   l:'Fora da cidade',           u:'km', fx:0}
  ]}
];

// Túmulo usa APENAS seus serviços específicos (não mistura com Cozinha)
SV_DEFS['Túmulo'] = SV_DEFS.Tumulo;

// ── SERVIÇOS ESPECÍFICOS PARA CAPELAS ──────────────────────────────────
SV_DEFS.Capela = [
  // ── Peças de pedra estruturais (m²) — calculado automaticamente pelas peças ──
  {g:'⛪ Estrutura — Peças de Pedra (m²)',its:[
    {k:'cap_fundo',   l:'Fundo (painel traseiro)',       u:'sf_auto', match:'fundo'},
    {k:'cap_base',    l:'Base / Tampo inferior',         u:'sf_auto', match:'base'},
    {k:'cap_teto',    l:'Teto / Tampo superior',         u:'sf_auto', match:'teto'},
    {k:'cap_lat',     l:'Laterais (×2)',                 u:'sf_auto', match:'lateral'},
    {k:'cap_front',   l:'Frontão / Moldura frontal',     u:'sf_auto', match:'front'},
    {k:'cap_degrau',  l:'Degrau de acesso',              u:'sf_auto', match:'degrau'}
  ]},
  // ── Pilares ──
  {g:'🏛️ Pilares',its:[
    {k:'cap_pilar_ch',l:'Pilar em chapa (p/ unidade)',   u:'sf_auto', match:'pilar'},
    {k:'cap_pilar_tr',l:'Pilar torneado — pronto',       u:'un', fx:1}
  ]},
  // ── Acabamentos lineares ──
  {g:'📐 Acabamentos (ml)',its:[
    {k:'cap_mold',    l:'Moldura decorativa',            u:'ml'},
    {k:'cap_ping',    l:'Pingadeira',                    u:'ml'},
    {k:'cap_bisel',   l:'Borda Biselada',                u:'ml'},
    {k:'cap_roda',    l:'Rodapé interno',                u:'ml'}
  ]},
  // ── Lápide / Adornos ──
  {g:'🪦 Lápide / Adornos',its:[
    {k:'cap_lapide',      l:'Lápide gravada em granito', u:'un', fx:0},
    {k:'cap_plaq',        l:'Plaquinha gravada',         u:'un', fx:0},
    {k:'cap_lapide_foto', l:'Lápide com foto',           u:'un', fx:0},
    {k:'cap_foto',        l:'Foto em porcelana',         u:'un', fx:0},
    {k:'cap_cruz_gr', l:'Cruz em granito',               u:'un', fx:0},
    {k:'cap_cruz_mr', l:'Cruz em mármore',               u:'un', fx:0},
    {k:'cap_vaso',    l:'Vaso integrado em pedra',       u:'un', fx:0},
    {k:'cap_pol',     l:'Polimento extra',               u:'un', fx:1}
  ]},
  // ── Mão de obra ──
  {g:'🔨 Mão de Obra',its:[
    {k:'cap_mont',    l:'Montagem / Instalação',         u:'un', fx:1},
    {k:'cap_montc',   l:'Instalação complexa',           u:'un', fx:1},
    {k:'cap_recorte', l:'Recorte / Furo',               u:'un', fx:0}
  ]},
  // ── Construção e materiais ──
  {g:'🧱 Construção & Materiais',its:[
    {k:'cap_fund',    l:'Fundação / Contrapiso',         u:'livre'},
    {k:'cap_alv',     l:'Levantamento / Alvenaria',     u:'livre'},
    {k:'cap_reb',     l:'Reboco / Chapisco',             u:'livre'},
    {k:'cap_cola',    l:'Cola / Argamassa p/ granito',   u:'livre'},
    {k:'cap_rej',     l:'Rejunte',                      u:'livre'},
    {k:'cap_frete',   l:'Frete / Entrega material',     u:'livre'}
  ]},
  {g:'Deslocamento',its:[
    {k:'desl_cid',    l:'Na cidade',                    u:'livre'},
    {k:'desl_for',    l:'Fora da cidade',               u:'km', fx:0}
  ]}
];
SV_DEFS['⛪ Capela'] = SV_DEFS.Capela;

function getSVGrp(){return SV_DEFS[document.getElementById('oTipo').value]||SV_DEFS.Cozinha;}
function getIt(k){var g=getSVGrp();for(var i=0;i<g.length;i++){for(var j=0;j<g[i].its.length;j++){if(g[i].its[j].k===k)return g[i].its[j];}}return null;}
// Preços padrão de túmulo — usados como fallback quando CFG.sv não tem o valor
var DEF_TUM_SV = {
  tum_tampa: 85,   tum_lat: 85,    tum_front: 85,  tum_base: 85,
  tum_det:   85,   tum_sainha: 85, tum_gav1:  85,  tum_gav2:  85,
  tum_gav3:  85,   tum_mol:   110, tum_ping:  80,  tum_bisel: 90,
  tum_lapide:480,  tum_plaq:  220, tum_foto: 170,  tum_cruz:  340,
  tum_pol:   160,  tum_rec:    50, tum_mont:  380, tum_montc: 580,
  // cap_ (chapel)
  cap_fundo: 85, cap_base: 85, cap_teto: 85, cap_lat: 85, cap_front: 85, cap_degrau: 85,
  cap_pilar_ch: 85, cap_pilar_tr: 0,
  cap_lapide: 480, cap_plaq: 220, cap_lapide_foto: 500, cap_foto: 170,
  cap_cruz_gr: 340, cap_cruz_mr: 280, cap_vaso: 380, cap_pol: 160,
  cap_mont: 420, cap_montc: 620, cap_recorte: 50,
  cap_mold: 110, cap_ping: 80, cap_bisel: 90, cap_roda: 75,
  // bp_ (borda piscina)
  bp_boleada:110, bp_antiderap:120, bp_pingad:90, bp_mcana:100, bp_chanfro:95,
  bp_c_arred:180, bp_c_curva:220, bp_c_infinita:350,
  // div_ (divisória wc)
  div_recorte:80, div_inst:120,
  // pe_ (pé estrutural orgânico — taxa extra de m.o. de corte)
  pe_organico_mo: 60
};

function getPr(k){
  var v=CFG.sv[k];
  if(v!==undefined&&v!==null)return v;
  return DEF_TUM_SV[k]||0;
}

function buildSV(){
  selCuba=null;
  var g=getSVGrp(),h='';
  g.forEach(function(grp){
    // acb_auto: render as radio button group (Acabamento auto for Soleira/Peitoril)
    var isAcbGrp=grp.its.length>0&&grp.its[0].u==='acb_auto';
    if(isAcbGrp){
      var selAcb=null;
      grp.its.forEach(function(it){if(sv.hasOwnProperty(it.k))selAcb=it.k;});
      if(!selAcb)selAcb=grp.its[0].k;
      h+='<div class="svblk"><div class="svhd">'+grp.g+'</div>';
      h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:8px 12px 10px;">';
      grp.its.forEach(function(it){
        var active=selAcb===it.k;
        var autoMl=_calcAcbAutoMl(amb,it.lados||0);
        var pr=getPr(it.k);
        var custo=autoMl>0&&pr>0?(' · R$ '+fm(autoMl*pr)):'';
        var subtitle=it.lados>0&&autoMl>0?(autoMl.toFixed(2)+'ml'+custo):it.lados===0?'sem custo':'';
        h+='<div onclick="togAcbAuto('+amb.id+',\''+it.k+'\')" style="cursor:pointer;text-align:center;padding:9px 8px;border-radius:10px;border:1.5px solid '+(active?'var(--gold)':'var(--bd2)')+';background:'+(active?'rgba(201,168,76,.12)':'var(--s2)')+';transition:all .15s;">'
          +'<div style="font-size:.78rem;font-weight:'+(active?'700':'500')+';color:'+(active?'var(--gold)':'var(--t2)')+'">'+it.l+'</div>'
          +(subtitle?'<div style="font-size:.6rem;color:var(--t4);margin-top:2px;">'+subtitle+'</div>':'')
          +'</div>';
      });
      h+='</div></div>';
      return;
    }
    h+='<div class="svblk"><div class="svhd">'+grp.g+'</div>';
    grp.its.forEach(function(it){
      var pr=getPr(it.k);
      var hint=it.u==='sf'?'R$ '+pr+'/ml + m² pedra':it.u==='ml'?'R$ '+pr+'/ml':it.u==='ml_auto'?'R$ '+pr+'/ml · auto':it.u==='km'?'R$ '+pr+'/km':it.u==='cuba'?'Selecionar modelo':it.u==='livre'?'Valor livre':it.fx===1&&pr?'R$ '+pr:'R$ '+pr;
      h+='<div class="svrow" id="sr-'+it.k+'" data-sv="'+it.k+'"><div class="svchk">✓</div><div class="svlbl">'+it.l+'<span class="svph">'+hint+'</span></div></div>';
      if(it.u==='ml_auto'&&sv[it.k]){
        var _pA=getPr(it.k),_mlA=0;
        (amb?amb.pecas:pecas||[]).forEach(function(p){if(p.w)_mlA+=(p.w/100)*(p.q||1);});
        var _cA=_mlA>0&&_pA>0?' · R$ '+fm(_mlA*_pA):'';
        h+='<div class="svxtr" id="sq-'+it.k+'" style="pointer-events:none;background:transparent;">'
          +'<span style="font-size:.72rem;color:var(--gold2);font-weight:600;">'+_mlA.toFixed(2)+' ml'+_cA+'</span>'
          +'<span style="font-size:.58rem;color:var(--t4);margin-left:4px;">← das peças</span></div>';
      } else if(it.u==='sf'){
        h+='<div class="sfw" id="sf-'+it.k+'"><div class="sfl">'+it.l+'</div><div class="sfr"><div class="sf"><span>Comprimento (ml)</span><input type="number" id="sw-'+it.k+'" placeholder="2.50" step="0.01" min="0" oninput="calcSF(\''+it.k+'\')" onclick="event.stopPropagation()"></div><div class="sfx">×</div><div class="sf"><span>Altura (cm)</span><input type="number" id="sh-'+it.k+'" placeholder="6" step="0.5" min="0" oninput="calcSF(\''+it.k+'\')" onclick="event.stopPropagation()"></div><div class="sf"><span>Qtd</span><input type="number" id="sq-'+it.k+'" value="1" min="1" style="width:48px;" oninput="calcSF(\''+it.k+'\')" onclick="event.stopPropagation()"></div></div><div class="sfres" id="sfr-'+it.k+'"></div></div>';
      } else if(it.u==='cuba'){
        h+='<div class="svcuba" id="sq-'+it.k+'"><span id="cdisp-'+it.k+'"></span></div>';
      } else if(it.u==='livre'){
        h+='<div class="svxtr" id="sq-'+it.k+'"><input type="number" id="si-'+it.k+'" placeholder="valor" step="1" min="0" onclick="event.stopPropagation()"><span class="svunit">reais</span></div>';
      } else if(!it.fx){
        h+='<div class="svxtr" id="sq-'+it.k+'"><input type="number" id="si-'+it.k+'" placeholder="'+(it.u==='ml'?'metros':'qtd')+'" step="0.1" min="0" onclick="event.stopPropagation()"><span class="svunit">'+it.u+'</span></div>';
      } else {
        h+='<div id="sq-'+it.k+'" style="display:none;"></div>';
      }
    });
    h+='</div>';
  });
  document.getElementById('svArea').innerHTML=h;
}

function calcSF(k){
  var ml=+document.getElementById('sw-'+k).value||0;
  var altCm=+document.getElementById('sh-'+k).value||0;
  var q=+document.getElementById('sq-'+k).value||1;
  var el=document.getElementById('sfr-'+k);if(!el)return;
  if(ml&&altCm){
    var m2=ml*(altCm/100)*q;
    var ambMat2=CFG.stones.find(function(s){return s.id===(amb?amb.selMat:selMat);})||CFG.stones[0];
    var pv=ambMat2?m2*ambMat2.pr:0;
    var mo=ml*q*getPr(k);
    el.innerHTML='<span style="color:var(--grn)">Pedra: '+m2.toFixed(3)+'m² → R$ '+fm(pv)+'</span>  <span style="color:var(--gold2)">M.O.: R$ '+fm(mo)+'</span>';
  }else{el.textContent='';}
}

// ═══ CUBA PICKER ═══
function openCubaPick(tipo,svKey){
  _cubaPickKey=svKey;
  var lista=tipo==='coz'?CFG.coz:CFG.lav;
  document.getElementById('cpTitle').textContent=tipo==='coz'?'Cubas para Cozinha':'Cubas para Banheiro/Lavabo';
  document.getElementById('cpSub').textContent='Cubas HR (fornecemos) ou cliente traz (só mão de obra)';
  var h='';
  // Cliente option
  var instCli=tipo==='coz'?160:280;
  h+='<div class="cpcard" data-pcuba="__cli__" data-ctype="'+tipo+'"><div class="cpthumb" style="background:var(--s3);font-size:1.4rem;color:var(--t3);display:grid;place-items:center;">📦</div><div><div class="cpbrand">Cliente Fornece</div><div class="cpnm">Só Mão de Obra</div><div class="cpdim">Cliente compra, HR instala</div><div class="cppr">M.O.: <b>R$ '+instCli+'</b></div></div></div>';
  h+='<div style="font-size:.57rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin:13px 0 8px;">Cubas HR — fornecemos e instalamos</div>';
  lista.filter(function(c){return c.pr>0;}).forEach(function(c){
    var tot=c.pr+c.inst;
    var _prStr=c.pr>0?'Cuba <b>R$ '+c.pr+'</b> + M.O. R$ '+c.inst+' = <b>R$ '+tot+'</b>':'M.O. <b>R$ '+c.inst+'</b> (produto a consultar)';
    h+='<div class="cpcard" data-pcuba="'+c.id+'" data-ctype="'+tipo+'"><div class="cpthumb">'+(c.photo?'<img src="'+c.photo+'" alt="">':(c.tipo?'🚿':'🔧'))+'</div><div><div class="cpbrand">'+c.brand+'</div><div class="cpnm">'+c.nm+'</div><div class="cpdim">'+c.dim+'</div><div class="cppr">'+_prStr+'</div></div></div>';
  });
  // Esculpidas — disponível para cozinha e banheiro/lavabo
  // Para cozinha usa CFG.lav (esculpidas estão lá) pois lav tem tipo Esculpida
  var escLista=CFG.lav.filter(function(x){return x.tipo==='Esculpida';});
  if(escLista.length){
    h+='<div style="font-size:.57rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin:13px 0 8px;">🪨 Cuba Esculpida na Pedra</div>';
    h+='<div style="background:var(--s3);border:1px solid var(--bd2);border-radius:11px;padding:13px 14px;margin-bottom:6px;">';
    h+='<div style="font-size:.7rem;color:var(--t2);line-height:1.6;margin-bottom:10px;">Cuba escavada direto na pedra. Informe as dimensões para calcular pedra + mão de obra.</div>';
    h+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">';
    h+='<div><div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Comprimento (cm)</div><input type="number" id="escW" placeholder="50" min="20" onclick="event.stopPropagation()" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:8px 10px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;"></div>';
    h+='<div><div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Largura (cm)</div><input type="number" id="escH" placeholder="40" min="20" onclick="event.stopPropagation()" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:8px 10px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;"></div>';
    h+='<div><div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">Profundidade (cm)</div><input type="number" id="escD" placeholder="20" min="10" onclick="event.stopPropagation()" style="width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:8px;padding:8px 10px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;"></div>';
    h+='</div>';
    h+='<div id="escPreviewBox" style="font-size:.72rem;color:var(--t3);margin-bottom:10px;">Preencha as dimensões e selecione o tipo abaixo</div>';
    h+='<div style="font-size:.6rem;color:var(--t3);margin-bottom:8px;">Tipo de acabamento:</div>';
    escLista.forEach(function(esc){
      h+='<button onclick="pickEsculpida(\''+esc.id+'\',\''+tipo+'\')" style="width:100%;background:var(--gdim);border:1px solid var(--gold3);border-radius:10px;padding:12px 14px;cursor:pointer;display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;font-family:Outfit,sans-serif;">';
      h+='<div style="text-align:left;"><div style="font-size:.82rem;font-weight:700;color:var(--tx);">'+esc.nm+'</div><div style="font-size:.65rem;color:var(--t3);margin-top:2px;">M.O. base: R$ '+esc.inst+'</div></div>';
      h+='<div style="font-size:.72rem;color:var(--gold2);font-weight:700;">Selecionar →</div>';
      h+='</button>';
    });
    h+='</div>';
  }
  document.getElementById('cpList').innerHTML=h;
  showMd('cubaPickMd');
}
function pickEsculpida(escId, tipo){
  var escW=+(document.getElementById('escW')||{}).value||0;
  var escH=+(document.getElementById('escH')||{}).value||0;
  var escD=+(document.getElementById('escD')||{}).value||0;
  if(!escW||!escH||!escD){toast('Informe comprimento, largura e profundidade da cuba');return;}

  var esc=CFG.lav.find(function(x){return x.id===escId;});
  if(!esc)return;

  // Cálculo da pedra removida:
  // Fundo (comprimento × largura) + 4 paredes internas
  var aFundo=(escW*escH)/10000;
  var aParedes=(2*(escW*escD)+2*(escH*escD))/10000;
  var aExtra=+(aFundo+aParedes).toFixed(4);

  // Mão de obra: base + R$8 por litro removido
  var volumeLt=(escW*escH*escD)/1000;
  var moBase=esc.inst;
  var moExtra=Math.round(volumeLt*8);
  var moTotal=moBase+moExtra;

  // Pedra: área removida × preço/m²
  var _escAmbId = _cubaPickAmbId;
  var _escAmb = _escAmbId ? ambientes.find(function(a){return a.id==_escAmbId;}) : null;
  var _escMatId = (_escAmb && _escAmb.selMat) ? _escAmb.selMat : selMat;
  var mat=CFG.stones.find(function(s){return s.id===_escMatId;})||{pr:0,nm:''};
  var valorPedra=Math.round(aExtra*mat.pr);
  var totalCuba=moTotal+valorPedra;

  var tipoFinal=tipo||'lav';
  var svKey=tipoFinal==='coz'?'cuba_coz':'cuba_lav';
  var dim=escW+'×'+escH+'×'+escD+'cm';
  var nm=esc.nm+' '+dim;

  var cubaObj={
    id:esc.id,
    nm:nm,
    total:totalCuba,
    tipo:tipoFinal,
    escExtra:{aExtra:aExtra,moBase:moBase,moExtra:moExtra,valorPedra:valorPedra,
              dim:dim,w:escW,h:escH,d:escD,volumeLt:+volumeLt.toFixed(1)}
  };

  if(_cubaPickAmbId!==null){
    var amb=ambientes.find(function(a){return a.id==_cubaPickAmbId;});
    if(amb){
      amb.selCuba=cubaObj;
      if(!amb.svState)amb.svState={};
      amb.svState[svKey]={};
    }
    closeAll();
    renderAmbientes();
    toast('✓ '+nm+' — R$ '+fm(totalCuba)+' | M.O. R$ '+fm(moTotal)+' + Pedra R$ '+fm(valorPedra));
    _cubaPickAmbId=null;
  }
}

function pickCuba(id,tipo){
  var lista=tipo==='coz'?CFG.coz:CFG.lav;
  var instCli=tipo==='coz'?160:280;
  var cubaObj;
  if(id==='__cli__'){
    cubaObj={id:'__cli__',nm:'Cuba do cliente',total:instCli,tipo:tipo};
  } else {
    var c=lista.find(function(x){return x.id===id;});
    if(!c)return;
    var isEsc=c.tipo==='Esculpida';
    cubaObj={id:c.id,nm:(c.brand?' '+c.brand:'')+(c.nm?(' '+c.nm):''),total:isEsc?c.inst:(c.pr+c.inst),tipo:tipo};
  }
  // Apply to correct ambiente
  if(_cubaPickAmbId!==null){
    var amb=ambientes.find(function(a){return a.id==_cubaPickAmbId;});
    if(amb){
      amb.selCuba=cubaObj;
      // Ensure the sv key is marked on
      var k=tipo==='coz'?'cuba_coz':'cuba_lav';
      if(!amb.svState)amb.svState={};
      amb.svState[k]={};
    }
    closeAll();
    renderAmbientes();
    toast('✓ '+cubaObj.nm.trim());
    _cubaPickAmbId=null;
  } else {
    // Legacy fallback
    closeAll();
    toast('✓ '+cubaObj.nm.trim());
  }
}

// ═══ CUBA QUANTITY ═══
function setCubaQtd(ambId, svKey, qtd){
  qtd=Math.max(1,+qtd||1);
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb||!amb.selCuba)return;
  amb.selCuba.qtd=qtd;
  renderAmbientes();
}

// ═══ AMBIENTES ═══
var TIPOS_AMBIENTE=['Cozinha','Banheiro','Lavabo','Soleira','Peitoril','Escada','Fachada','Túmulo','⛪ Capela','🏊 Borda Piscina','Rodapé de Box','🚽 Divisória WC','🍽️ Balcão','Outro'];

function pickMatAmb(ambId,stoneId){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  amb.selMat=stoneId;
  // Sincroniza o selMat global também (calcular() usa ambos)
  selMat = stoneId;
  try { localStorage.setItem('hr_last_mat', stoneId); } catch(e){}
  // Atualiza só o carrossel e o indicador — sem re-render completo
  var car=document.getElementById('mcar-'+ambId);
  if(car)car.outerHTML=buildMatCarouselHtml(amb);
  var ind=document.getElementById('mind-'+ambId);
  if(ind){
    var s=CFG.stones.find(function(x){return x.id===amb.selMat;});
    ind.innerHTML=s?s.nm+' · <span style="color:var(--gold2);">R$ '+s.pr.toLocaleString('pt-BR')+'/m²</span>'
                   :'<span style="color:var(--t4);">selecione uma pedra</span>';
  }
}

// buildMatBarHtml e toggleMatPick mantidos por compatibilidade mas não usados no fluxo principal
function buildMatBarHtml(amb){return '';}
function toggleMatPick(ambId){}

function buildMatCarouselHtml(amb){
  var PREF={
    'Cozinha':  ['Granito Cinza','Granito Preto','Granito Branco','Granito Verde','Ultra Compacto','Quartzito','Mármore','Travertino'],
    'Banheiro': ['Mármore','Quartzito','Granito Branco','Granito Cinza','Travertino','Ultra Compacto','Granito Preto','Granito Verde'],
    'Lavabo':   ['Mármore','Quartzito','Travertino','Granito Branco','Granito Cinza','Ultra Compacto','Granito Preto','Granito Verde'],
    'Escada':   ['Granito Preto','Granito Cinza','Granito Verde','Granito Branco','Quartzito','Mármore','Travertino','Ultra Compacto'],
    'Soleira':  ['Granito Preto','Granito Cinza','Granito Branco','Granito Verde','Quartzito','Mármore','Travertino','Ultra Compacto'],
    'Peitoril': ['Granito Cinza','Granito Branco','Granito Preto','Granito Verde','Mármore','Quartzito','Travertino','Ultra Compacto'],
    'Fachada':  ['Granito Cinza','Granito Preto','Granito Verde','Granito Branco','Quartzito','Mármore','Travertino','Ultra Compacto'],
    'Túmulo':   ['Granito Preto','Granito Cinza','Granito Verde','Granito Branco','Quartzito','Mármore','Travertino','Ultra Compacto'],
    '⛪ Capela': ['Granito Preto','Granito Cinza','Granito Verde','Granito Branco','Mármore','Quartzito','Travertino','Ultra Compacto'],
    '🏊 Borda Piscina':['Granito Cinza','Granito Preto','Granito Verde','Granito Branco','Quartzito','Mármore','Travertino','Ultra Compacto'],
    'Rodapé de Box':['Granito Preto','Granito Cinza','Granito Branco','Granito Verde','Quartzito','Mármore','Travertino','Ultra Compacto'],
    '🚽 Divisória WC':['Granito Preto','Granito Cinza','Granito Branco','Granito Verde','Mármore','Quartzito','Travertino','Ultra Compacto'],
    'Outro':    ['Granito Cinza','Granito Preto','Granito Branco','Granito Verde','Mármore','Quartzito','Travertino','Ultra Compacto']
  };
  var ordem=PREF[amb.tipo]||PREF['Outro'];
  var todas=CFG.stones.filter(function(s){return s.pr>0;});
  if(!todas.length){
    return '<div id="mcar-'+amb.id+'" style="font-size:.62rem;color:var(--t4);padding:6px 0 2px;">Nenhuma pedra cadastrada — Config → Pedras</div>';
  }
  var ord=[];
  ordem.forEach(function(cat){todas.filter(function(s){return s.cat===cat;}).forEach(function(s){ord.push(s);});});
  todas.forEach(function(s){if(ord.indexOf(s)===-1)ord.push(s);});

  // Uma única faixa horizontal com scroll, sem agrupamentos verticais
  var h='<div id="mcar-'+amb.id+'" style="'
    +'display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;'
    +'-webkit-overflow-scrolling:touch;scrollbar-width:none;'
    +'padding:2px 2px 6px;margin:0 -2px;">';

  ord.forEach(function(s){
    var sel=s.id===amb.selMat;
    var tx=s.photo?'':s.tx;
    // Card 100px de largura (≈2.3 por tela de 360px), altura total ~130px
    h+='<div onclick="pickMatAmb('+amb.id+',\''+s.id+'\')" style="'
      +'flex:0 0 100px;cursor:pointer;border-radius:10px;overflow:hidden;'
      +'border:1.5px solid '+(sel?'var(--gold)':'rgba(255,255,255,.07)')+';'
      +'background:'+(sel?'rgba(201,168,76,.08)':'var(--s2)')+';'
      +'box-shadow:'+(sel?'0 0 0 1px rgba(201,168,76,.15),0 2px 12px rgba(201,168,76,.15)':'none')+';'
      +'transition:border-color .12s,box-shadow .12s;position:relative;">';

    // Imagem — proporção paisagem baixa
    h+='<div style="width:100%;height:64px;overflow:hidden;background:var(--s4);flex-shrink:0;">';
    if(s.photo){
      h+='<img src="'+s.photo+'" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">';
    } else {
      h+='<div class="msw '+tx+'" style="width:100%;height:100%;"><div class="mshine"></div></div>';
    }
    // Check — pequeno e discreto
    if(sel){
      h+='<div style="position:absolute;top:5px;right:5px;'
        +'width:15px;height:15px;border-radius:50%;'
        +'background:var(--gold);color:#1a0800;'
        +'display:flex;align-items:center;justify-content:center;'
        +'font-size:.46rem;font-weight:800;line-height:1;">✓</div>';
    }
    h+='</div>';

    // Rodapé do card
    h+='<div style="padding:5px 7px 6px;">';
    // Categoria em micro texto
    h+='<div style="font-size:.47rem;color:var(--t4);letter-spacing:.5px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+s.cat+'</div>';
    // Nome
    h+='<div style="font-size:.64rem;font-weight:700;color:var(--tx);line-height:1.2;'
      +'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+s.nm+'</div>';
    // Acabamento + preço numa linha
    h+='<div style="display:flex;align-items:baseline;justify-content:space-between;margin-top:3px;">';
    h+='<span style="font-size:.47rem;color:var(--t4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:50%;">'+s.fin+'</span>';
    h+='<span style="font-size:.55rem;color:var(--gold2);font-weight:600;white-space:nowrap;flex-shrink:0;">R$'+s.pr.toLocaleString('pt-BR')+'</span>';
    h+='</div>';
    h+='</div>';
    h+='</div>';
  });

  h+='</div>';
  return h;
}

function addAmbiente(){
  var id=Date.now();
  // Herda pedra do último ambiente OU do localStorage OU do primeiro do catálogo
  var savedMat = null;
  try { savedMat = localStorage.getItem('hr_last_mat'); } catch(e){}
  var defaultMat = ambientes.length > 0
    ? ambientes[ambientes.length-1].selMat
    : (savedMat || selMat || null);
  ambientes.push({id:id,tipo:'Cozinha',pecas:[],selCuba:null,svState:{},acState:{},selMat:defaultMat});
  addPecaAmb(id);
  renderAmbientes();
}

function rmAmbiente(id){
  if(ambientes.length<=1){toast('Precisa ter pelo menos 1 ambiente');return;}
  ambientes=ambientes.filter(function(a){return a.id!=id;});
  renderAmbientes();
}

function setAmbTipo(id,tipo){
  var amb=ambientes.find(function(a){return a.id==id;});
  if(!amb)return;
  amb.tipo=tipo;
  amb.selCuba=null;
  amb.svState={};
  amb.acState={};
  // Init default acb_auto selection (first option = sem acabamento)
  var gNew=SV_DEFS[tipo]||SV_DEFS.Cozinha;
  gNew.forEach(function(grp){
    if(grp.its.length>0&&grp.its[0].u==='acb_auto'){
      amb.svState[grp.its[0].k]={lados:grp.its[0].lados||0};
    }
  });
  renderAmbientes();
}

function addPecaAmb(ambId){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  amb.pecas.push({id:Date.now(),desc:'',w:0,h:0,q:1});
  renderAmbientes();
}

function rmPecaAmb(ambId,pcId){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(amb.pecas.length<=1){toast('Precisa ter pelo menos 1 peça');return;}
  amb.pecas=amb.pecas.filter(function(p){return p.id!=pcId;});
  renderAmbientes();
}

function updPcAmb(ambId,pcId,prop,val){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  var pc=amb.pecas.find(function(p){return p.id===pcId;});
  if(pc)pc[prop]=val;
  // Re-render serviços automáticos quando peças mudam (sf_auto, acb_auto, ml_auto)
  var g=SV_DEFS[amb.tipo]||[];
  var hasSvAuto=g.some(function(grp){return grp.its.some(function(it){
    return it.u==='sf_auto'||it.u==='acb_auto'||it.u==='ml_auto';
  });});
  if(hasSvAuto){
    var svEl=document.getElementById('svAuto-'+ambId);
    if(svEl) svEl.innerHTML=buildSVHtml(amb);
  }
}

// Legacy - kept for AI apply compatibility
function addPeca(){if(ambientes.length>0)addPecaAmb(ambientes[0].id);}
function updPc(id,prop,val){ambientes.forEach(function(a){var p=a.pecas.find(function(x){return x.id===id;});if(p)p[prop]=val;});}
function remPeca(id){ambientes.forEach(function(a){if(a.pecas.length>1){a.pecas=a.pecas.filter(function(p){return p.id!==id;});}});renderAmbientes();}

function renderAmbientes(){
  try{
  var container=document.getElementById('ambientesList');
  if(!container)return;
  // Preserva foco para o teclado não fechar ao redigitar
  var _focusId=null,_focusSel=0,_focusSelE=0;
  var _active=document.activeElement;
  if(_active&&(_active.tagName==='INPUT'||_active.tagName==='TEXTAREA')&&_active.id){
    _focusId=_active.id;
    try{_focusSel=_active.selectionStart;_focusSelE=_active.selectionEnd;}catch(e){}
  }
  var h='';
  ambientes.forEach(function(amb,idx){
    var num=idx+1;
    var ambMat=CFG.stones.find(function(s){return s.id===amb.selMat;});
    h+='<div class="ambiente">';
    h+='<div class="amb-header">';
    h+='<span class="amb-title">'+num+'º Ambiente — '+amb.tipo+'</span>';
    h+='<button class="amb-rm" data-rm-amb="'+amb.id+'">✕ Remover</button>';
    h+='</div>';
    h+='<div class="amb-body">';
    // STEP 1: Tipo de Ambiente
    h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px;">① Ambiente</div>';
    h+='<div class="amb-tipo">';
    TIPOS_AMBIENTE.forEach(function(t){
      h+='<button class="amb-tip'+(amb.tipo===t?' on':'')+'" data-amb-tipo="'+t+'" data-amb-id="'+amb.id+'">'+t+'</button>';
    });
    h+='</div>';
    if(amb.tipo==='Túmulo'){
      if(!amb.tumExtra)amb.tumExtra={};
      var te=amb.tumExtra;
      h+='<div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.18);border-radius:10px;padding:12px;margin:10px 0;">';
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:10px;">⚰️ Dados do Túmulo</div>';
      h+='<div class="f"><label>Falecido(a)</label><input placeholder="Nome do falecido" type="text" style="background:var(--s3);" value="'+escH(te.falecido||'')+'" oninput="updTumExtra('+amb.id+',\'falecido\',this.value)"></div>';
      h+='<div class="f"><label>Cemitério</label><input placeholder="Nome do cemitério" type="text" style="background:var(--s3);" value="'+escH(te.cemiterio||'')+'" oninput="updTumExtra('+amb.id+',\'cemiterio\',this.value)"></div>';
      h+='<div class="r2"><div class="f"><label>Quadra</label><input placeholder="Q-12" type="text" style="background:var(--s3);" value="'+escH(te.quadra||'')+'" oninput="updTumExtra('+amb.id+',\'quadra\',this.value)"></div>';
      h+='<div class="f"><label>Lote / Número</label><input placeholder="L-04" type="text" style="background:var(--s3);" value="'+escH(te.lote||'')+'" oninput="updTumExtra('+amb.id+',\'lote\',this.value)"></div></div>';
      h+='<div class="f"><label>Tipo de Túmulo</label><select style="background:var(--s3);color:var(--tx);border:1px solid var(--bd);border-radius:7px;padding:8px 10px;width:100%;font-size:.82rem;font-family:Outfit,sans-serif;" onchange="updTumExtra('+amb.id+',\'subtipo\',this.value)">';
      ['Simples','Gaveta Dupla','Gaveta Tripla','Jazigo Familiar','Reforma / Revestimento','Monumento / Capelinha'].forEach(function(st){
        h+='<option value="'+st+'"'+(te.subtipo===st?' selected':'')+'>'+st+'</option>';
      });
      h+='</select></div>';
      // Dica visual de preenchimento das peças
      h+='<div style="margin-top:10px;padding:8px 10px;background:rgba(201,168,76,.08);border-radius:8px;font-size:.62rem;color:var(--t3);line-height:1.6;">';
      h+='💡 <b>Como preencher as peças:</b> informe Comprimento × Largura de cada face.<br>';
      h+='Ex: Tampa → 220×90cm | Lateral → 220×70cm (qtd 2) | Frente → 90×70cm';
      h+='</div>';
      h+='</div>';
    }
    if(amb.tipo==='⛪ Capela'){
      if(!amb.capExtra)amb.capExtra={};
      var ce=amb.capExtra;
      h+='<div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.18);border-radius:10px;padding:14px;margin:10px 0;">';
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:12px;">⛪ Dados da Capela</div>';
      // Dados do falecido
      h+='<div class="f"><label>Falecido(a)</label><input placeholder="Nome do falecido" type="text" style="background:var(--s3);" value="'+escH(ce.falecido||'')+'" oninput="updCapExtra('+amb.id+',\'falecido\',this.value)"></div>';
      h+='<div class="f"><label>Cemitério</label><input placeholder="Nome do cemitério" type="text" style="background:var(--s3);" value="'+escH(ce.cemiterio||'')+'" oninput="updCapExtra('+amb.id+',\'cemiterio\',this.value)"></div>';
      h+='<div class="r2"><div class="f"><label>Quadra</label><input placeholder="Q-12" type="text" style="background:var(--s3);" value="'+escH(ce.quadra||'')+'" oninput="updCapExtra('+amb.id+',\'quadra\',this.value)"></div>';
      h+='<div class="f"><label>Nº / Lote</label><input placeholder="N-04" type="text" style="background:var(--s3);" value="'+escH(ce.lote||'')+'" oninput="updCapExtra('+amb.id+',\'lote\',this.value)"></div></div>';
      // Divisor
      h+='<div style="border-top:1px solid rgba(201,168,76,.2);margin:12px 0 12px;"></div>';
      // ── Seletor de modelo ──────────────────────────────────────────
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:9px;">🏗️ Modelo da Capelinha</div>';
      var _semLat=!ce.capTemLat;
      var _comLat=!!ce.capTemLat;
      h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px;">';
      // Botão: sem laterais (padrão)
      h+='<button onclick="updCapMed('+amb.id+',\'capTemLat\',false)" style="padding:10px 6px;border-radius:10px;border:1.5px solid '+(_semLat?'var(--gold)':'rgba(201,168,76,.22)')+';background:'+(_semLat?'rgba(201,168,76,.14)':'transparent')+';color:'+(_semLat?'var(--gold)':'var(--t3)')+';font-size:.71rem;font-weight:'+(_semLat?700:500)+';cursor:pointer;font-family:Outfit,sans-serif;text-align:center;line-height:1.5;">';
      h+='Base + Fundo + Teto<br><span style="font-size:.6rem;opacity:.85;">⛪ sem laterais</span><br><span style="font-size:.58rem;opacity:.6;">(mais comum)</span></button>';
      // Botão: com laterais
      h+='<button onclick="updCapMed('+amb.id+',\'capTemLat\',true)" style="padding:10px 6px;border-radius:10px;border:1.5px solid '+(_comLat?'var(--gold)':'rgba(201,168,76,.22)')+';background:'+(_comLat?'rgba(201,168,76,.14)':'transparent')+';color:'+(_comLat?'var(--gold)':'var(--t3)')+';font-size:.71rem;font-weight:'+(_comLat?700:500)+';cursor:pointer;font-family:Outfit,sans-serif;text-align:center;line-height:1.5;">';
      h+='Base + Fundo + Teto<br><span style="font-size:.6rem;opacity:.85;">🧱 + 2 laterais</span><br><span style="font-size:.58rem;opacity:.6;">(fechada)</span></button>';
      h+='</div>';
      // Resumo visual do modelo selecionado
      if(_semLat){
        h+='<div style="margin-bottom:10px;padding:8px 11px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:9px;font-size:.65rem;color:var(--t2);line-height:1.7;">';
        h+='<b style="color:var(--gold);">Peças que serão calculadas:</b><br>';
        h+='① Fundo (painel traseiro) — 1 un<br>';
        h+='② Base / Tampo inferior — 1 un<br>';
        h+='③ Teto / Tampo superior — 1 un<br>';
        h+='④ Pilares em chapa — conforme qtd informada<br>';
        h+='<span style="color:rgba(201,168,76,.5);">✗ Sem laterais neste modelo</span>';
        h+='</div>';
      } else {
        h+='<div style="margin-bottom:10px;padding:8px 11px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:9px;font-size:.65rem;color:var(--t2);line-height:1.7;">';
        h+='<b style="color:var(--gold);">Peças que serão calculadas:</b><br>';
        h+='① Fundo (painel traseiro) — 1 un<br>';
        h+='② Base / Tampo inferior — 1 un<br>';
        h+='③ Teto / Tampo superior — 1 un<br>';
        h+='④ Laterais — ×2 unidades<br>';
        h+='⑤ Pilares em chapa — conforme qtd informada';
        h+='</div>';
      }
      // ── Medidas ───────────────────────────────────────────────────
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:10px;">📐 Medidas da Capelinha</div>';
      h+='<div style="margin-bottom:9px;padding:7px 10px;background:rgba(201,168,76,.05);border-radius:8px;font-size:.6rem;color:var(--t3);line-height:1.65;">';
      h+='💡 Informe as medidas <b>externas</b> da peça (a face que aparece no orçamento).<br>';
      h+='Ex: Largura = medida total do fundo/teto/base (de fora a fora).';
      h+='</div>';
      // Medidas principais
      h+='<div class="r2">';
      h+='<div class="f"><label>Largura total (cm)</label><input type="number" placeholder="80" style="background:var(--s3);" value="'+(ce.capW||'')+'" oninput="updCapMed('+amb.id+',\'capW\',+this.value)"></div>';
      h+='<div class="f"><label>Profundidade (cm)</label><input type="number" placeholder="60" style="background:var(--s3);" value="'+(ce.capP||'')+'" oninput="updCapMed('+amb.id+',\'capP\',+this.value)"></div>';
      h+='</div>';
      h+='<div class="r2">';
      h+='<div class="f"><label>Altura (cm)</label><input type="number" placeholder="100" style="background:var(--s3);" value="'+(ce.capH||'')+'" oninput="updCapMed('+amb.id+',\'capH\',+this.value)"></div>';
      h+='<div class="f"><label>Espessura da chapa (cm)</label><input type="number" placeholder="3" step="0.5" style="background:var(--s3);" value="'+(ce.capE||'')+'" oninput="updCapMed('+amb.id+',\'capE\',+this.value)"></div>';
      h+='</div>';
      // Pilares
      h+='<div style="border-top:1px solid rgba(201,168,76,.15);margin:10px 0 10px;"></div>';
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px;">🏛️ Pilares</div>';
      h+='<div class="r2">';
      h+='<div class="f"><label>Qtd de pilares</label>';
      h+='<div style="display:flex;align-items:center;background:var(--s3);border:1px solid var(--bd);border-radius:8px;overflow:hidden;height:42px;">';
      h+='<button onclick="updCapMed('+amb.id+',\'capNPil\',Math.max(0,(+('+(ce.capNPil||2)+'))-1))" style="background:none;border:none;color:var(--t2);font-size:1.2rem;width:40px;height:100%;cursor:pointer;font-family:Outfit,sans-serif;">−</button>';
      h+='<span style="flex:1;text-align:center;font-size:.95rem;font-weight:700;color:var(--tx);">'+(ce.capNPil!==undefined?ce.capNPil:2)+'</span>';
      h+='<button onclick="updCapMed('+amb.id+',\'capNPil\',(+('+(ce.capNPil||2)+')+1))" style="background:none;border:none;color:var(--gold);font-size:1.2rem;width:40px;height:100%;cursor:pointer;font-family:Outfit,sans-serif;">+</button>';
      h+='</div></div>';
      h+='<div class="f"><label>Largura do pilar (cm)</label><input type="number" placeholder="10" step="1" style="background:var(--s3);" value="'+(ce.capPilW||'')+'" oninput="updCapMed('+amb.id+',\'capPilW\',+this.value)"></div>';
      h+='</div>';
      h+='<div class="f"><label>Altura do pilar (cm)</label><input type="number" placeholder="igual à altura total" step="1" style="background:var(--s3);" value="'+(ce.capPilH||'')+'" oninput="updCapMed('+amb.id+',\'capPilH\',+this.value)"></div>';
      // Escadinha do pilar
      h+='<div style="margin-top:8px;padding:10px 12px;background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.15);border-radius:9px;">';
      h+='<div style="font-size:.6rem;color:var(--gold);font-weight:700;margin-bottom:6px;">🪨 Base decorativa do pilar — Escadinha (automático)</div>';
      var pilW=+(ce.capPilW||0);
      if(pilW>0){
        var esc1=pilW+4; var esc2=pilW+8;
        h+='<div style="font-size:.67rem;color:var(--t2);line-height:1.9;">';
        h+='Cada pilar leva 4 pedrinhas (2 embaixo + 2 em cima):<br>';
        h+='• Pedrinha interna: <b>'+esc1+' × '+esc1+' cm</b> — '+(+(ce.capNPil!==undefined?ce.capNPil:2))*2+' unid<br>';
        h+='• Pedrinha externa: <b>'+esc2+' × '+esc2+' cm</b> — '+(+(ce.capNPil!==undefined?ce.capNPil:2))*2+' unid';
        h+='</div>';
      } else {
        h+='<div style="font-size:.67rem;color:var(--t4);">Informe a largura do pilar para calcular a escadinha</div>';
      }
      h+='</div>';
      // Preview das peças calculadas
      var capCalc=calcCapelaPecas(ce);
      if(capCalc && capCalc.length>0){
        var ambMatCap=CFG.stones.find(function(s){return s.id===amb.selMat;})||null;
        h+='<div style="border-top:1px solid rgba(201,168,76,.2);margin:12px 0 10px;"></div>';
        h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px;">📋 Peças calculadas automaticamente</div>';
        var totalM2cap=0;
        capCalc.forEach(function(p){
          var m2=p.m2;
          totalM2cap+=m2;
          var prPedra=ambMatCap?m2*ambMatCap.pr:0;
          var prMO=m2*85; // preço MO padrão
          h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(201,168,76,.08);">';
          h+='<div>';
          h+='<div style="font-size:.74rem;font-weight:600;color:var(--tx);">'+p.desc+(p.q>1?' <span style="color:var(--gold3);">×'+p.q+'</span>':'')+'</div>';
          h+='<div style="font-size:.6rem;color:var(--t4);">'+p.dim+'</div>';
          h+='</div>';
          h+='<div style="text-align:right;">';
          h+='<div style="font-size:.72rem;font-weight:700;color:var(--gold2);">'+m2.toFixed(3)+' m²</div>';
          if(ambMatCap&&prPedra>0) h+='<div style="font-size:.58rem;color:var(--t3);">R$ '+fm(prPedra+prMO)+'</div>';
          h+='</div>';
          h+='</div>';
        });
        h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0 2px;">';
        h+='<span style="font-size:.72rem;font-weight:700;color:var(--gold);">Total</span>';
        h+='<span style="font-size:.8rem;font-weight:800;color:var(--gold2);">'+totalM2cap.toFixed(3)+' m²</span>';
        h+='</div>';
        h+='<button onclick="aplicarPecasCapela('+amb.id+')" style="width:100%;margin-top:10px;padding:11px;background:linear-gradient(135deg,rgba(201,168,76,.18),rgba(201,168,76,.08));border:1.5px solid var(--gold);border-radius:10px;color:var(--gold);font-size:.8rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;letter-spacing:.5px;">✦ Aplicar peças ao orçamento</button>';
      }
      h+='</div>';
    }
    if(amb.tipo==='🏊 Borda Piscina'){
      h+='<div style="background:rgba(100,180,255,.06);border:1px solid rgba(100,180,255,.22);border-radius:10px;padding:12px;margin:10px 0;">';
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:#6ea4ff;font-weight:600;margin-bottom:8px;">🏊 Como preencher as peças</div>';
      h+='<div style="font-size:.65rem;color:var(--t3);line-height:1.6;">';
      h+='Adicione <b>uma peça por lado</b> da piscina:<br>';
      h+='• <b>Comprimento</b> = tamanho do lado em cm (ex: 800 para 8m)<br>';
      h+='• <b>Largura</b> = largura da borda em cm (ex: 25)<br>';
      h+='Em Serviços, informe o total de metros lineares nos acabamentos.';
      h+='</div>';
      h+='</div>';
    }
    if(amb.tipo==='🚽 Divisória WC'){
      h+='<div style="background:rgba(201,168,76,.05);border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:12px;margin:10px 0;">';
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px;">🚽 Como orçar divisórias</div>';
      h+='<div style="font-size:.65rem;color:var(--t3);line-height:1.8;">';
      h+='Adicione uma peça para cada tipo de pedra:<br>';
      h+='• <b>Divisória</b> = painel inteiro (ex: 150×180cm)<br>';
      h+='• <b>Testeira</b> = peça frontal onde a porta de alumínio é instalada<br>';
      h+='<br>';
      h+='Em <b>Serviços</b>, informe a qtd de <b>recortes</b> (abertura embaixo) e <b>instalações</b> com vergalhão.<br>';
      h+='<span style="color:#e05a5a;font-weight:600;">⚠️ Não incluso:</span> fornecimento de porta e instalação da porta.';
      h+='</div>';
      h+='</div>';
    }
    if(amb.tipo==='🍽️ Balcão'){
      if(!amb.balcExtra)amb.balcExtra={};
      var be=amb.balcExtra;
      var _bEng=!!be.engrossado;
      h+='<div style="background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.22);border-radius:10px;padding:14px;margin:10px 0;">';
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:12px;">🍽️ Configurador de Pés de Balcão</div>';
      // Medidas
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px;">📐 Medidas do Pé</div>';
      h+='<div class="r2">';
      h+='<div class="f"><label>Altura do pé (cm)</label><input type="number" placeholder="Ex: 90" style="background:var(--s3);" value="'+(be.peH||'')+'" oninput="updBalcMed('+amb.id+',\'peH\',+this.value)"></div>';
      h+='<div class="f"><label>Largura do pé (cm)</label><input type="number" placeholder="Ex: 50" style="background:var(--s3);" value="'+(be.peL||'')+'" oninput="updBalcMed('+amb.id+',\'peL\',+this.value)"></div>';
      h+='</div>';
      h+='<div class="r2">';
      h+='<div class="f"><label>Espessura da parede (cm)</label><input type="number" placeholder="Ex: 15" style="background:var(--s3);" value="'+(be.espPar||'')+'" oninput="updBalcMed('+amb.id+',\'espPar\',+this.value)"></div>';
      h+='<div class="f"><label>Altura da sainha lateral (cm)</label><input type="number" placeholder="Ex: 6" step="0.5" style="background:var(--s3);" value="'+(be.sainhaH||'')+'" oninput="updBalcMed('+amb.id+',\'sainhaH\',+this.value)"></div>';
      h+='</div>';
      // Toggle engrossado
      h+='<div style="border-top:1px solid rgba(201,168,76,.15);margin:12px 0 12px;"></div>';
      h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">';
      h+='<div>';
      h+='<div style="font-size:.78rem;font-weight:600;color:var(--tx);">Pé engrossado</div>';
      // Mostrar dimensão do engrossamento se dados disponíveis
      if(be.peL && be.espPar){
        var _engL=+(be.peL)-+(be.espPar)-2;
        h+='<div style="font-size:.6rem;color:var(--t4);">Engrossamento: '+(be.peH||'?')+'×'+(_engL>0?_engL:'?')+' cm (peça traseira)</div>';
      } else {
        h+='<div style="font-size:.6rem;color:var(--t4);">Peça traseira colada: largura = pé − parede − 2cm</div>';
      }
      h+='</div>';
      h+='<button onclick="updBalcMed('+amb.id+',\'engrossado\','+(_bEng?'false':'true')+')" style="min-width:54px;padding:7px 14px;border-radius:20px;border:1.5px solid '+(_bEng?'var(--gold)':'rgba(201,168,76,.3)')+';background:'+(_bEng?'rgba(201,168,76,.18)':'transparent')+';color:'+(_bEng?'var(--gold)':'var(--t3)')+';font-size:.78rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;">'+(_bEng?'SIM':'NÃO')+'</button>';
      h+='</div>';
      // Quantidades
      h+='<div style="border-top:1px solid rgba(201,168,76,.15);margin:12px 0 12px;"></div>';
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:10px;">🔢 Quantidades</div>';
      h+='<div class="r2">';
      // Nº de pés total
      h+='<div class="f"><label>Nº de pés</label>';
      h+='<div style="display:flex;align-items:center;background:var(--s3);border:1px solid var(--bd);border-radius:8px;overflow:hidden;height:42px;">';
      h+='<button onclick="updBalcMed('+amb.id+',\'nPes\',Math.max(1,(+('+(be.nPes||1)+')-1)))" style="background:none;border:none;color:var(--t2);font-size:1.2rem;width:40px;height:100%;cursor:pointer;font-family:Outfit,sans-serif;">−</button>';
      h+='<span style="flex:1;text-align:center;font-size:.95rem;font-weight:700;color:var(--tx);">'+(be.nPes||1)+'</span>';
      h+='<button onclick="updBalcMed('+amb.id+',\'nPes\',(+('+(be.nPes||1)+')+1))" style="background:none;border:none;color:var(--gold);font-size:1.2rem;width:40px;height:100%;cursor:pointer;font-family:Outfit,sans-serif;">+</button>';
      h+='</div></div>';
      // Nº de pés com fechamento
      h+='<div class="f"><label>Com fechamento lateral</label>';
      h+='<div style="display:flex;align-items:center;background:var(--s3);border:1px solid var(--bd);border-radius:8px;overflow:hidden;height:42px;">';
      h+='<button onclick="updBalcMed('+amb.id+',\'nFech\',Math.max(0,(+('+(be.nFech||0)+')-1)))" style="background:none;border:none;color:var(--t2);font-size:1.2rem;width:40px;height:100%;cursor:pointer;font-family:Outfit,sans-serif;">−</button>';
      h+='<span style="flex:1;text-align:center;font-size:.95rem;font-weight:700;color:var(--tx);">'+(be.nFech||0)+'</span>';
      h+='<button onclick="updBalcMed('+amb.id+',\'nFech\',Math.min(+('+(be.nPes||1)+'),+('+(be.nFech||0)+')+1))" style="background:none;border:none;color:var(--gold);font-size:1.2rem;width:40px;height:100%;cursor:pointer;font-family:Outfit,sans-serif;">+</button>';
      h+='</div></div>';
      h+='</div>';
      // Preview calculado
      var balcCalc=calcBalcaoPecas(be);
      if(balcCalc && balcCalc.length>0){
        var ambMatBalc=CFG.stones.find(function(s){return s.id===amb.selMat;})||null;
        h+='<div style="border-top:1px solid rgba(201,168,76,.2);margin:12px 0 10px;"></div>';
        h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:8px;">📋 Peças calculadas</div>';
        var totalM2balc=0;
        balcCalc.forEach(function(p){
          var m2=p.m2;
          totalM2balc+=m2;
          var prPedra=ambMatBalc?m2*ambMatBalc.pr:0;
          var prMO=m2*85;
          h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(201,168,76,.08);">';
          h+='<div>';
          h+='<div style="font-size:.74rem;font-weight:600;color:var(--tx);">'+p.desc+(p.q>1?' <span style="color:var(--gold3);">×'+p.q+'</span>':'')+'</div>';
          h+='<div style="font-size:.6rem;color:var(--t4);">'+p.dim+'</div>';
          h+='</div>';
          h+='<div style="text-align:right;">';
          h+='<div style="font-size:.72rem;font-weight:700;color:var(--gold2);">'+m2.toFixed(3)+' m²</div>';
          if(ambMatBalc&&prPedra>0) h+='<div style="font-size:.58rem;color:var(--t3);">R$ '+fm(prPedra+prMO)+'</div>';
          h+='</div>';
          h+='</div>';
        });
        h+='<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0 2px;">';
        h+='<span style="font-size:.72rem;font-weight:700;color:var(--gold);">Total</span>';
        h+='<span style="font-size:.8rem;font-weight:800;color:var(--gold2);">'+totalM2balc.toFixed(3)+' m²</span>';
        h+='</div>';
        h+='<button onclick="aplicarPecasBalcao('+amb.id+')" style="width:100%;margin-top:10px;padding:11px;background:linear-gradient(135deg,rgba(201,168,76,.18),rgba(201,168,76,.08));border:1.5px solid var(--gold);border-radius:10px;color:var(--gold);font-size:.8rem;font-weight:700;cursor:pointer;font-family:Outfit,sans-serif;letter-spacing:.5px;">✦ Aplicar peças ao orçamento</button>';
      } else {
        h+='<div style="margin-top:10px;padding:9px 11px;background:rgba(201,168,76,.04);border-radius:8px;font-size:.63rem;color:var(--t4);text-align:center;">Preencha altura e largura do pé para calcular</div>';
      }
      h+='</div>';
    }
    h+='<div style="margin:10px 0 12px;">';
    h+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
    h+='<span style="font-size:.52rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;">② Pedra</span>';
    h+='<span id="mind-'+amb.id+'" style="font-size:.6rem;color:var(--t3);">';
    if(ambMat){
      h+=ambMat.nm+' · <span style="color:var(--gold2);">R$ '+ambMat.pr.toLocaleString('pt-BR')+'/m²</span>';
    } else {
      h+='<span style="color:var(--t4);">selecione uma pedra</span>';
    }
    h+='</span>';
    h+='</div>';
    h+=buildMatCarouselHtml(amb);
    h+='</div>';
    // Pecas — para Capela, as peças são geradas pelo configurador (oculto aqui)
    if(amb.tipo !== '⛪ Capela' && amb.tipo !== '🍽️ Balcão'){
      h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin:14px 0 7px;">Peças</div>';
      h+='<div class="amb-pecas">';
      amb.pecas.forEach(function(pc,pi){
        var rm=amb.pecas.length>1?'<button style="background:none;border:none;color:var(--red);font-size:.7rem;cursor:pointer;padding:2px 5px;font-family:Outfit,sans-serif;" onclick="rmPecaAmb('+amb.id+','+pc.id+')">&#10005;</button>':'';
        h+='<div class="peca">';
        h+='<div class="ptop"><span class="pnum">Peça '+(pi+1)+'</span>'+rm+'</div>';
        var _phDesc=amb.tipo==='Soleira'?'Ex: Sala, Quarto 1':amb.tipo==='Peitoril'?'Ex: Janela sala, Janela quarto':'Ex: Bancada';
        h+='<div class="f"><label>Descrição</label><input id="pd-'+pc.id+'" placeholder="'+_phDesc+'" type="text" style="background:var(--s3);" value="'+escH(pc.desc||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'desc\',this.value)"></div>';
        var _phW=amb.tipo==='Soleira'?'Ex: 90 (vão)':amb.tipo==='Peitoril'?'Ex: 120 (janela)':'300';
        var _phH=amb.tipo==='Soleira'?'Ex: 15':amb.tipo==='Peitoril'?'Ex: 20':'60';
        h+='<div class="r2"><div class="f"><label>Comprimento (cm)</label><input id="pw-'+pc.id+'" placeholder="'+_phW+'" type="number" style="background:var(--s3);" value="'+(pc.w||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'w\',+this.value);if(typeof _updPcPreview===\'function\')_updPcPreview('+amb.id+','+pc.id+')"></div>';
        h+='<div class="f"><label>Largura (cm)</label><input id="ph-'+pc.id+'" placeholder="'+_phH+'" type="number" style="background:var(--s3);" value="'+(pc.h||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'h\',+this.value);if(typeof _updPcPreview===\'function\')_updPcPreview('+amb.id+','+pc.id+')"></div></div>';
        h+='<div style="max-width:130px;"><div class="f"><label>Quantidade</label><input id="pq-'+pc.id+'" type="number" style="background:var(--s3);" value="'+(pc.q||1)+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'q\',+this.value||1);if(typeof _updPcPreview===\'function\')_updPcPreview('+amb.id+','+pc.id+')"></div></div>';
        // Preview m²
        var _pvW=pc.w||0,_pvH=pc.h||0,_pvQ=pc.q||1;
        var _pvM2=_pvW&&_pvH?((_pvW/100)*(_pvH/100)*_pvQ):0;
        var _pvMat=CFG.stones.find(function(s){return s.id===amb.selMat;});
        var _pvPr=_pvMat&&_pvM2>0?_pvM2*_pvMat.pr:0;
        if(_pvM2>0){
          h+='<div id="pv-'+pc.id+'" style="background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.18);border-radius:8px;padding:6px 10px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center;">';
          h+='<span style="font-size:.65rem;color:var(--gold2);font-weight:700;">'+_pvM2.toFixed(3)+' m²'+(pc.q>1?' (×'+pc.q+')':'')+'</span>';
          if(_pvPr>0)h+='<span style="font-size:.65rem;color:var(--t2);">≈ R$ '+fm(_pvPr)+'</span>';
          h+='</div>';
        } else {
          h+='<div id="pv-'+pc.id+'"></div>';
        }
        // SVG técnico + acabamento por lado (mantém telhado mesmo ao digitar peExtra)
        if(amb.tipo!=='🏊 Borda Piscina'&&amb.tipo!=='Rodapé de Box'&&amb.tipo!=='Peitoril'&&amb.tipo!=='Soleira'){
          if(typeof buildPecaPreviewSVG==='function')h+=buildPecaPreviewSVG(amb,pc,pi);
          if(typeof buildPecaBordaHtml==='function')h+=buildPecaBordaHtml(amb,pc);
        }
        // ── Bloco de Pé Estrutural (aparece quando descrição contém "pé") ──
        if(_isPePc(pc.desc)){
          var pe=pc.peExtra||{};
          var _peOrg=!!pe.organico;
          var _peQuad=!_peOrg;
          h+='<div style="margin-top:10px;background:rgba(201,168,76,.05);border:1.5px solid rgba(201,168,76,.22);border-radius:10px;padding:11px 12px;">';
          h+='<div style="font-size:.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:700;margin-bottom:9px;">🦵 Pé Estrutural</div>';
          // Toggle Quadrado / Orgânico
          h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-bottom:9px;">';
          h+='<button onclick="updPeExtra('+amb.id+','+pc.id+',\'organico\',false)" style="padding:8px 6px;border-radius:9px;border:1.5px solid '+(_peQuad?'var(--gold)':'rgba(201,168,76,.25)')+';background:'+(_peQuad?'rgba(201,168,76,.15)':'transparent')+';color:'+(_peQuad?'var(--gold)':'var(--t3)')+';font-size:.75rem;font-weight:'+(_peQuad?700:500)+';cursor:pointer;font-family:Outfit,sans-serif;">⬛ Quadrado</button>';
          h+='<button onclick="updPeExtra('+amb.id+','+pc.id+',\'organico\',true)" style="padding:8px 6px;border-radius:9px;border:1.5px solid '+(_peOrg?'var(--gold)':'rgba(201,168,76,.25)')+';background:'+(_peOrg?'rgba(201,168,76,.15)':'transparent')+';color:'+(_peOrg?'var(--gold)':'var(--t3)')+';font-size:.75rem;font-weight:'+(_peOrg?700:500)+';cursor:pointer;font-family:Outfit,sans-serif;">🌊 Orgânico</button>';
          h+='</div>';
          if(_peOrg){
            h+='<div style="font-size:.6rem;color:rgba(201,168,76,.7);margin-bottom:8px;">+R$ '+(getPr('pe_organico_mo')||60)+'/m² taxa de corte orgânico</div>';
          }
          // Campos extras
          h+='<div class="r2">';
          h+='<div class="f"><label>Esp. parede (cm)</label><input type="number" placeholder="Ex: 15" style="background:var(--s3);" value="'+(pe.espPar||'')+'" oninput="updPeExtra('+amb.id+','+pc.id+',\'espPar\',+this.value)"></div>';
          h+='<div class="f"><label>Sainha lateral (cm)</label><input type="number" placeholder="Ex: 6" step="0.5" style="background:var(--s3);" value="'+(pe.sainhaH||'')+'" oninput="updPeExtra('+amb.id+','+pc.id+',\'sainhaH\',+this.value)"></div>';
          h+='</div>';
          // Subpeças calculadas
          var _ambMatPe=CFG.stones.find(function(s){return s.id===amb.selMat;})||null;
          var _subPes=_calcPeSubpecas(pc);
          if(_subPes.length){
            h+='<div style="margin-top:8px;border-top:1px solid rgba(201,168,76,.15);padding-top:8px;">';
            h+='<div style="font-size:.57rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:6px;">Peças derivadas (incluídas no total)</div>';
            _subPes.forEach(function(s){
              if(s.isMo){
                h+='<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);">';
                h+='<span style="font-size:.68rem;color:rgba(201,168,76,.8);">'+s.desc+'</span>';
                h+='<span style="font-size:.68rem;color:var(--gold);font-weight:600;">R$ '+fm(s.moVal)+'</span>';
                h+='</div>';
              } else {
                var _m2s=s.m2;
                var _prs=_ambMatPe?_m2s*_ambMatPe.pr:0;
                h+='<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);">';
                h+='<span style="font-size:.68rem;color:var(--t2);">'+s.desc+(s.q>1?' ×'+s.q:'')+'</span>';
                h+='<span style="font-size:.68rem;color:var(--gold2);font-weight:600;">'+_m2s.toFixed(3)+' m²'+(_prs>0?' · R$ '+fm(_prs):'')+'</span>';
                h+='</div>';
              }
            });
            h+='</div>';
          } else {
            h+='<div style="font-size:.6rem;color:var(--t4);margin-top:6px;">Informe espessura da parede para ver as peças derivadas</div>';
          }
          h+='</div>'; // fim bloco pé
        }
        h+='</div>';
      });
      h+='</div>';
      h+='<div class="row" style="gap:7px;margin-bottom:10px;">';
      h+='<button class="btn btn-o" style="font-size:.73rem;padding:8px;flex:1;" data-add-peca="'+amb.id+'">+ Peça</button>';
      h+='<button class="btn-ai-sm" data-ai-amb="'+amb.id+'">✨ Descrever</button>';
      h+='</div>';
    } else {
      // Chapel: show read-only piece list after configurator applies them
      if(amb.pecas && amb.pecas.some(function(p){return p.w&&p.h;})){
        h+='<div style="background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.12);border-radius:10px;padding:10px 12px;margin:8px 0 10px;">';
        h+='<div style="font-size:.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:6px;">✦ Peças aplicadas</div>';
        amb.pecas.forEach(function(pc){
          if(!pc.w||!pc.h)return;
          var m2=(pc.w/100)*(pc.h/100)*(pc.q||1);
          h+='<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid rgba(255,255,255,.04);">';
          h+='<span style="font-size:.7rem;color:var(--t2);">'+escH(pc.desc||'Peça')+(pc.q>1?' ×'+pc.q:'')+'</span>';
          h+='<span style="font-size:.68rem;color:var(--gold2);font-weight:600;">'+m2.toFixed(3)+' m²</span>';
          h+='</div>';
        });
        h+='</div>';
      }
    }
    h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:7px;">Serviços'+(amb.tipo==='⛪ Capela'||amb.tipo==='🍽️ Balcão'?' adicionais':'')+'</div>';
    h+='<div id="svAuto-'+amb.id+'">';
    h+=buildSVHtml(amb);
    h+='</div>';
    h+='</div></div>';
  });
  container.innerHTML=h;
  // Restaura foco no input ativo para o teclado não fechar
  if(_focusId){
    var _el=document.getElementById(_focusId);
    if(_el){_el.focus();try{_el.setSelectionRange(_focusSel,_focusSelE);}catch(e){}}
  }
  }catch(e2){console.error('renderAmbientes:',e2);toast('Erro: '+e2.message);}
}


// ─── SERVIÇO AUTO (Capela / Túmulo) ──────────────────────────────
// Retorna m² total das peças cujo 'desc' contém a palavra-chave 'match'
// Ignora case e acentos para máxima flexibilidade
function _norm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,''); }
function _calcSfAutoM2(amb, match){
  if(!match) return 0;
  var m = _norm(match);
  var total = 0;
  (amb.pecas||[]).forEach(function(p){
    if(!p.w || !p.h) return;
    var d = _norm(p.desc||'');
    if(d.indexOf(m) >= 0){
      total += (p.w/100)*(p.h/100)*(p.q||1);
    }
  });
  return total;
}

// ─── ACABAMENTO AUTO (Soleira / Peitoril) ───────────────────────
// Returns total linear meters = sum of piece comprimentos × lados
function _calcAcbAutoMl(amb,lados){
  if(!lados)return 0;
  var totalMl=0;
  (amb.pecas||[]).forEach(function(p){
    if(p.w){totalMl+=(p.w/100)*(p.q||1);}
  });
  return totalMl*lados;
}

// ─── PÉ ESTRUTURAL ───────────────────────────────────────────────
// Detecta "pé" na descrição da peça (normalizado, sem acento)
function _isPePc(desc){
  var d=_norm(desc||'');
  return /\bpe\b/.test(d)||d.indexOf('pe estrut')>=0||d.indexOf('pe de balc')>=0||d.indexOf('pe organ')>=0;
}

// Calcula as subpeças derivadas de um pé estrutural
// pc: {w, h, q, peExtra:{espPar, sainhaH, organico}}
// Retorna array de {desc, w, h, q, m2, isMo, moVal}
function _calcPeSubpecas(pc){
  var pe=pc.peExtra||{};
  var peW=+(pc.w||0);   // largura do pé (cm)
  var peH=+(pc.h||0);   // altura do pé (cm)
  var peQ=+(pc.q||1);
  var espPar=+(pe.espPar||0);
  var sainhaH=+(pe.sainhaH||0);
  var organico=!!pe.organico;
  var sub=[];
  if(!peW||!peH)return sub;
  var peE=2; // espessura chapa granito (cm)
  // 1. Fechamento lateral: (peH − espPar) × peW, quando há parede
  if(espPar>0){
    var fH=peH-espPar;
    if(fH>0){
      var m2F=(fH/100)*(peW/100)*peQ;
      sub.push({desc:'Fechamento Lateral ('+fH+'×'+peW+' cm)',w:peW,h:fH,q:peQ,m2:m2F});
    }
  }
  // 2. Sainha lateral 45°: sainhaH × peE (espessura), 2 por pé
  if(sainhaH>0){
    var m2S=(sainhaH/100)*(peE/100);
    sub.push({desc:'Sainha Lateral 45° ('+sainhaH+'×'+peE+' cm)',w:peE,h:sainhaH,q:peQ*2,m2:m2S*peQ*2});
  }
  // 3. Taxa de m.o. orgânico — cobra sobre o m² total do pé + fechamento + sainha
  if(organico){
    var m2Total=(peH/100)*(peW/100)*peQ;
    sub.forEach(function(s){m2Total+=s.m2;});
    var moRate=getPr('pe_organico_mo')||60;
    var moVal=+(m2Total*moRate).toFixed(2);
    if(moVal>0) sub.push({desc:'M.O. Orgânico (R$ '+moRate+'/m²)',w:0,h:0,q:1,m2:0,isMo:true,moVal:moVal});
  }
  return sub;
}

// Atualiza peExtra de uma peça
function updPeExtra(ambId,pcId,field,val){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  var pc=amb.pecas.find(function(p){return p.id==pcId;});
  if(!pc)return;
  if(!pc.peExtra)pc.peExtra={};
  pc.peExtra[field]=val;
  renderAmbientes();
}

// Radio-toggle for acb_auto groups: ensures only one key active per group
function togAcbAuto(ambId,k){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.svState)amb.svState={};
  var sv=amb.svState;
  var g=SV_DEFS[amb.tipo]||SV_DEFS.Cozinha;
  g.forEach(function(grp){
    var match=grp.its.find(function(it){return it.k===k;});
    if(!match)return;
    if(match.u!=='acb_auto')return;
    var prevSainhaH = (k === 'sol_45' && sv['sol_45']) ? sv['sol_45'].sainhaH : undefined;
    grp.its.forEach(function(it){delete sv[it.k];});
    sv[k]={lados:match.lados||0};
    if(k === 'sol_45' && prevSainhaH) sv[k].sainhaH = prevSainhaH;
  });
  renderAmbientes();
}

function setSainhaH(ambId, val){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb||!amb.svState)return;
  var h=parseFloat(val)||0;
  if(!amb.svState['sol_45'])amb.svState['sol_45']={lados:1};
  amb.svState['sol_45'].sainhaH=h;
  // Atualizar preview inline sem re-renderizar tudo (evita perder foco)
  var pr=getPr('sol_45');
  var autoMl=0;
  (amb.pecas||[]).forEach(function(p){if(p.w)autoMl+=(p.w/100)*(p.q||1);});
  var m2s=autoMl*(h/100);
  var matSel=CFG.stones.find(function(s){return s.id===amb.selMat;})||CFG.stones[0];
  var custoPedra=matSel?m2s*matSel.pr:0;
  var custoMO=autoMl*pr;
  var previewEl=document.getElementById('sainhaH_'+ambId);
  if(previewEl){
    var next=previewEl.nextElementSibling;
    if(h>0&&autoMl>0){
      var txt=autoMl.toFixed(2)+'ml × '+h+'cm = '+m2s.toFixed(3)+'m²'+(custoPedra>0?' · R$ '+fm(custoPedra+custoMO):'');
      if(next&&next.tagName==='DIV'){next.textContent=txt;next.style.display='';}
      else{var d=document.createElement('div');d.style.cssText='font-size:.68rem;color:var(--gold2);font-weight:600;';d.textContent=txt;previewEl.parentNode.appendChild(d);}
    } else if(next&&next.tagName==='DIV'){next.style.display='none';}
  }
}

function buildSVHtml(amb){
  var g=SV_DEFS[amb.tipo]||SV_DEFS.Cozinha;
  var sv=amb.svState||{};  var h='';
  g.forEach(function(grp){
    // acb_auto: render como radio buttons (igual Soleira/Peitoril)
    var isAcbGrp=grp.its.length>0&&grp.its[0].u==='acb_auto';
    if(isAcbGrp){
      var selAcb=null;
      grp.its.forEach(function(it){if(sv.hasOwnProperty(it.k))selAcb=it.k;});
      if(!selAcb)selAcb=grp.its[0].k;
      h+='<div class="svblk"><div class="svhd">'+grp.g+'</div>';
      h+='<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:6px;padding:8px 12px 10px;">';
      grp.its.forEach(function(it){
        var active=selAcb===it.k;
        var autoMl=_calcAcbAutoMl(amb,it.lados||0);
        var pr=getPr(it.k);
        var custo=autoMl>0&&pr>0?(' · R$ '+fm(autoMl*pr)):'';
        var subtitle=it.lados>0&&autoMl>0?(autoMl.toFixed(2)+'ml'+custo):it.lados===0?'sem custo':'';
        h+='<div onclick="togAcbAuto('+amb.id+',\''+it.k+'\')" style="cursor:pointer;text-align:center;padding:9px 8px;border-radius:10px;border:1.5px solid '+(active?'var(--gold)':'var(--bd2)')+';background:'+(active?'rgba(201,168,76,.12)':'var(--s2)')+';transition:all .15s;">'
          +'<div style="font-size:.78rem;font-weight:'+(active?'700':'500')+';color:'+(active?'var(--gold)':'var(--t2)')+'">'+it.l+'</div>'
          +(subtitle?'<div style="font-size:.6rem;color:var(--t4);margin-top:2px;">'+subtitle+'</div>':'')
          +'</div>';
      });
      h+='</div>';
      // ── Input de altura da sainha para Soleira em 45° ──
      var sel45 = grp.its.find(function(it){ return it.k === 'sol_45'; });
      if(sel45 && selAcb === 'sol_45'){
        var sainhaHVal = (sv['sol_45'] && sv['sol_45'].sainhaH) || '';
        var autoMl45 = _calcAcbAutoMl(amb, 1);
        var pr45 = getPr('sol_45');
        h += '<div style="padding:4px 12px 12px;">';
        h += '<div style="font-size:.62rem;color:var(--t4);letter-spacing:.5px;text-transform:uppercase;margin-bottom:6px;">Altura da sainha (cm)</div>';
        h += '<div style="display:flex;align-items:center;gap:8px;">';
        h += '<input type="number" id="sainhaH_'+amb.id+'" placeholder="Ex: 6" min="1" max="30" step="0.5" value="'+sainhaHVal+'"'
          + ' oninput="setSainhaH('+amb.id+',this.value)"'
          + ' onclick="event.stopPropagation()"'
          + ' style="width:90px;background:var(--s2);border:1.5px solid var(--gold3);border-radius:9px;padding:8px 10px;'
          + 'color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;text-align:center;">';
        if(sainhaHVal && autoMl45 > 0){
          var m2sainha = autoMl45 * (+sainhaHVal / 100);
          var matSel = CFG.stones.find(function(s){ return s.id === amb.selMat; }) || CFG.stones[0];
          var custoPedra = matSel ? m2sainha * matSel.pr : 0;
          var custoMO = autoMl45 * pr45;
          h += '<div style="font-size:.68rem;color:var(--gold2);font-weight:600;">';
          h += autoMl45.toFixed(2)+'ml × '+sainhaHVal+'cm = '+m2sainha.toFixed(3)+'m²';
          if(custoPedra > 0) h += ' · R$ '+fm(custoPedra+custoMO);
          h += '</div>';
        }
        h += '</div>';
        h += '</div>';
      }
      h+='</div>';
      return;
    }
    // sf_auto: serviço calculado automaticamente pelas peças (Chapel/Tomb)
    var isSfAutoGrp = grp.its.length>0 && grp.its[0].u==='sf_auto';
    if(isSfAutoGrp){
      // Para Capela: estrutura já é exibida no configurador acima — não duplica
      if(amb.tipo==='⛪ Capela') return;
      var hasPecas = (amb.pecas||[]).some(function(p){return p.w&&p.h;});
      h+='<div class="svblk"><div class="svhd">'+grp.g+'</div>';
      if(!hasPecas){
        h+='<div style="padding:10px 12px 12px;font-size:.68rem;color:var(--t4);font-style:italic;">Preencha as peças acima para calcular automaticamente</div>';
      } else {
        // Show each item that has a matching piece
        var anyMatch=false;
        grp.its.forEach(function(it){
          if(it.u!=='sf_auto')return;
          var m2=_calcSfAutoM2(amb,it.match);
          var pr=getPr(it.k);
          var ambMat=CFG.stones.find(function(s){return s.id===amb.selMat;})||null;
          var pedra=ambMat&&m2>0?m2*ambMat.pr:0;
          var mo=m2>0?m2*pr:0;
          var hasData=m2>0;
          if(hasData) anyMatch=true;
          var cardBg=hasData?'rgba(201,168,76,.07)':'var(--s2)';
          var cardBd=hasData?'var(--gold)':'var(--bd2)';
          var cardOp=hasData?'1':'0.45';
          h+='<div style="margin:4px 0;padding:9px 12px;border-radius:10px;border:1.5px solid '+cardBd+';background:'+cardBg+';opacity:'+cardOp+';transition:all .2s;">';
          h+='<div style="display:flex;justify-content:space-between;align-items:center;">';
          h+='<span style="font-size:.76rem;font-weight:'+(hasData?'700':'500')+';color:'+(hasData?'var(--tx)':'var(--t3)')+'">'+it.l+'</span>';
          if(hasData){
            h+='<span style="font-size:.7rem;font-weight:700;color:var(--gold2);">'+m2.toFixed(3)+' m²</span>';
          } else {
            h+='<span style="font-size:.65rem;color:var(--t4);">sem peça</span>';
          }
          h+='</div>';
          if(hasData){
            h+='<div style="display:flex;gap:10px;margin-top:4px;">';
            if(pedra>0) h+='<span style="font-size:.62rem;color:var(--grn);">Pedra: R$ '+fm(pedra)+'</span>';
            if(mo>0) h+='<span style="font-size:.62rem;color:var(--gold2);">M.O.: R$ '+fm(mo)+'</span>';
            h+='</div>';
          }
          h+='</div>';
        });
        if(!anyMatch){
          h+='<div style="padding:6px 12px 10px;font-size:.68rem;color:var(--t4);font-style:italic;">Nomeie as peças com os termos: fundo, base, teto, lateral, frente, degrau, pilar...</div>';
        }
      }
      h+='</div>';
      return;
    }
    h+='<div class="svblk"><div class="svhd">'+grp.g+'</div>';
    grp.its.forEach(function(it){
      var pr=getPr(it.k);
      var isOn=!!sv[it.k];
      // u:'info' = item informativo, não clicável, só exibe aviso
      if(it.u==='info'){
        h+='<div style="display:flex;align-items:center;gap:7px;padding:8px 12px;background:rgba(224,90,90,.07);border-left:3px solid #e05a5a;margin:2px 0;border-radius:0 7px 7px 0;">';
        h+='<span style="font-size:.8rem;">⚠️</span>';
        h+='<span style="font-size:.72rem;color:#e05a5a;font-weight:500;">'+it.l+' — NÃO incluso</span></div>';
        return;
      }
      var hint=it.u==='sf'?'R$ '+pr+'/ml + m² pedra':it.u==='ml'?'R$ '+pr+'/ml':it.u==='ml_auto'?'R$ '+pr+'/ml · auto':it.u==='km'?'R$ '+pr+'/km':it.u==='cuba'?'Selecionar modelo':it.u==='livre'?'Valor livre':'R$ '+pr;
      h+='<div class="svrow'+(isOn?' on':'')+'" data-sv="'+it.k+'" data-amb="'+amb.id+'">';
      h+='<div class="svchk">✓</div><div class="svlbl">'+it.l+'<span class="svph">'+hint+'</span></div></div>';
      if(it.u==='ml_auto'&&isOn){
        var _pA=getPr(it.k),_mlA=0;
        (amb.pecas||[]).forEach(function(p){if(p.w)_mlA+=(p.w/100)*(p.q||1);});
        var _cA=_mlA>0&&_pA>0?' · R$ '+fm(_mlA*_pA):'';
        h+='<div class="svxtr on" id="sq-'+amb.id+'-'+it.k+'" style="pointer-events:none;background:transparent;padding:6px 12px;">'
          +'<span style="font-size:.76rem;color:var(--gold2);font-weight:700;">'+_mlA.toFixed(2)+' ml'+_cA+'</span>'
          +'<span style="font-size:.6rem;color:var(--t4);margin-left:6px;">← calculado das peças</span></div>';
      } else if(it.u==='sf'&&isOn){
        var sfv=sv[it.k]||{};
        h+='<div class="sfw on" id="sf-'+amb.id+'-'+it.k+'">';
        h+='<div class="sfl">'+it.l+'</div><div class="sfr">';
        h+='<div class="sf"><span>Comprimento (ml)</span><input type="number" id="sw-'+amb.id+'-'+it.k+'" placeholder="2.50" step="0.01" value="'+(sfv.ml||'')+'" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'ml\',+this.value);calcSFAmb('+amb.id+',\''+it.k+'\')" onclick="event.stopPropagation()"></div>';
        h+='<div class="sfx">×</div>';
        h+='<div class="sf"><span>Altura (cm)</span><input type="number" id="sh-'+amb.id+'-'+it.k+'" placeholder="6" step="0.5" value="'+(sfv.altCm||'')+'" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'altCm\',+this.value);calcSFAmb('+amb.id+',\''+it.k+'\')" onclick="event.stopPropagation()"></div>';
        h+='<div class="sf"><span>Qtd</span><input type="number" id="sq-'+amb.id+'-'+it.k+'" value="'+(sfv.q||1)+'" min="1" style="width:48px;" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'q\',+this.value||1);calcSFAmb('+amb.id+',\''+it.k+'\')" onclick="event.stopPropagation()"></div>';
        h+='</div><div class="sfres" id="sfr-'+amb.id+'-'+it.k+'"></div></div>';
      } else if(it.u==='cuba'&&isOn){
        var cubaInfo=amb.selCuba?('✓ '+amb.selCuba.nm.trim()+((amb.selCuba.qtd||1)>1?' ×'+(amb.selCuba.qtd||1):'')+' — R$ '+fm(amb.selCuba.total)):'Toque para escolher';
        var cubaQtd=amb.selCuba?(amb.selCuba.qtd||1):1;
        var cubaTotalQtd=amb.selCuba?(amb.selCuba.total*(amb.selCuba.qtd||1)):0;
        h+='<div class="svcuba on" id="sq-'+amb.id+'-'+it.k+'" onclick="openCubaPickAmb('+amb.id+',\''+it.ctp+'\')" style="cursor:pointer;">'+cubaInfo+'</div>';
        if(amb.selCuba){
          h+='<div style="display:flex;align-items:center;gap:8px;margin-top:6px;" onclick="event.stopPropagation()">';
          h+='<span style="font-size:.7rem;color:var(--t3);">Quantidade:</span>';
          h+='<div style="display:flex;align-items:center;background:var(--s3);border:1px solid var(--bd2);border-radius:8px;overflow:hidden;">';
          h+='<button onclick="setCubaQtd('+amb.id+',\''+it.k+'\','+(cubaQtd-1)+')" style="background:none;border:none;color:var(--t2);font-size:1.1rem;width:34px;height:32px;cursor:pointer;font-family:Outfit,sans-serif;">−</button>';
          h+='<span style="min-width:26px;text-align:center;font-size:.88rem;font-weight:700;color:var(--tx);">'+cubaQtd+'</span>';
          h+='<button onclick="setCubaQtd('+amb.id+',\''+it.k+'\','+(cubaQtd+1)+')" style="background:none;border:none;color:var(--gold);font-size:1.1rem;width:34px;height:32px;cursor:pointer;font-family:Outfit,sans-serif;">+</button>';
          h+='</div>';
          if(cubaQtd>1) h+='<span style="font-size:.72rem;color:var(--gold2);font-weight:600;">= R$ '+fm(cubaTotalQtd)+'</span>';
          h+='</div>';
        }
      } else if((it.u==='ml'||it.u==='km'||it.u==='un')&&!it.fx&&isOn){
        var sv2=sv[it.k]||{};
        if(it.u==='un'){
          // Stepper ± para itens por unidade (lápide, foto, cruz, etc.)
          var _qty=+(sv2.qty||1); var _prUn=getPr(it.k);
          h+='<div style="display:flex;align-items:center;gap:9px;padding:5px 12px 9px;" onclick="event.stopPropagation()">';
          h+='<div style="display:flex;align-items:center;background:var(--s3);border:1px solid var(--bd2);border-radius:8px;overflow:hidden;">';
          h+='<button onclick="updSVAmbQty('+amb.id+',\''+it.k+'\','+(Math.max(1,_qty-1))+');event.stopPropagation()" style="background:none;border:none;color:var(--t2);font-size:1.1rem;width:36px;height:32px;cursor:pointer;font-family:Outfit,sans-serif;">−</button>';
          h+='<span style="min-width:30px;text-align:center;font-size:.92rem;font-weight:700;color:var(--tx);">'+_qty+'</span>';
          h+='<button onclick="updSVAmbQty('+amb.id+',\''+it.k+'\','+(_qty+1)+');event.stopPropagation()" style="background:none;border:none;color:var(--gold);font-size:1.1rem;width:36px;height:32px;cursor:pointer;font-family:Outfit,sans-serif;">+</button>';
          h+='</div>';
          if(_qty>1&&_prUn>0) h+='<span style="font-size:.74rem;color:var(--gold2);font-weight:700;">= R$ '+fm(_prUn*_qty)+'</span>';
          h+='</div>';
        } else {
          h+='<div class="svxtr on" id="sq-'+amb.id+'-'+it.k+'"><input type="number" id="si-'+amb.id+'-'+it.k+'" placeholder="'+(it.u==='ml'?'metros':'qtd')+'" step="0.1" value="'+(sv2.qty||'')+'" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'qty\',+this.value)" onclick="event.stopPropagation()"><span class="svunit">'+it.u+'</span></div>';
        }
      } else if(it.u==='livre'&&isOn){
        var sv3=sv[it.k]||{};
        h+='<div class="svxtr on" id="sq-'+amb.id+'-'+it.k+'"><input type="number" id="si-'+amb.id+'-'+it.k+'" placeholder="valor" value="'+(sv3.qty||'')+'" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'qty\',+this.value)" onclick="event.stopPropagation()"><span class="svunit">reais</span></div>';
      }
    });
    h+='</div>';
  });

  // ── ACESSÓRIOS DO CATÁLOGO ──
  var acList=CFG.ac||[];
  var tiposComAcess=['Cozinha','Banheiro','Lavabo','Outro'];
  if(acList.length&&tiposComAcess.indexOf(amb.tipo)>=0){
    if(!amb.acState)amb.acState={};
    h+='<div class="svblk"><div class="svhd">🔩 Acessórios</div>';
    acList.forEach(function(a,ai){
      var acKey='ac_cat_'+a.id;
      var isOn=!!amb.acState[acKey];
      var prStr=a.pr>0?'R$ '+a.pr.toLocaleString('pt-BR'):'Consultar';
      h+='<div class="svrow'+(isOn?' on':'')+'" data-tog-ac="'+acKey+'" data-amb-ac="'+amb.id+'">';
      h+='<div class="svchk">✓</div>';
      h+='<div class="svlbl">'+a.nm+'<span class="svph">'+prStr+'</span></div></div>';
      if(isOn){
        var qv=amb.acState[acKey]||1;
        h+='<div class="svxtr on"><input type="number" min="1" value="'+qv+'" style="width:60px;" data-upd-ac="'+acKey+'" data-amb-ac2="'+amb.id+'" oninput="updAcAmb('+amb.id+',\''+acKey+'\',+this.value||1)"><span class="svunit">un</span></div>';
      }
    });
    h+='</div>';
  }

  return h;
}

function togSV(k,ambId){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.svState)amb.svState={};
  var sv=amb.svState;
  var g=SV_DEFS[amb.tipo]||SV_DEFS.Cozinha;
  var it=null;
  g.forEach(function(grp){grp.its.forEach(function(i){if(i.k===k)it=i;});});
  if(!it)return;
  if(it.u==='info')return; // apenas informativo, não togável
  if(sv[k]){
    delete sv[k];
    if(it.u==='cuba')amb.selCuba=null;
  } else {
    sv[k]={ml:0,altCm:6,q:1,qty:1};
    if(it.u==='cuba'){openCubaPickAmb(ambId,it.ctp);return;}
  }
  renderAmbientes();
}

function updSVAmb(ambId,k,prop,val){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb||!amb.svState||!amb.svState[k])return;
  amb.svState[k][prop]=val;
}

function togAcAmb(ambId,acKey){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.acState)amb.acState={};
  if(amb.acState[acKey]){
    delete amb.acState[acKey];
  } else {
    amb.acState[acKey]=1;
  }
  renderAmbientes();
}

function updAcAmb(ambId,acKey,qty){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb||!amb.acState)return;
  amb.acState[acKey]=qty;
}

function updTumExtra(ambId,field,val){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.tumExtra)amb.tumExtra={};
  amb.tumExtra[field]=val;
}

function updCapExtra(ambId,field,val){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.capExtra)amb.capExtra={};
  amb.capExtra[field]=val;
}

// ─── CONFIGURADOR DE CAPELINHA ────────────────────────────────────
var _capMedTimer=null;
function updCapMed(ambId,field,val){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.capExtra)amb.capExtra={};
  amb.capExtra[field]=val;
  // Boolean (toggle de modelo): renderiza imediatamente
  // Number (digitação): debounce 650ms para o teclado não fechar
  if(typeof val==='boolean'){
    renderAmbientes();
  } else {
    clearTimeout(_capMedTimer);
    _capMedTimer=setTimeout(function(){renderAmbientes();},650);
  }
}

// Stepper de quantidade para itens u:'un', fx:0
function updSVAmbQty(ambId,k,qty){
  qty=Math.max(1,+qty||1);
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.svState)amb.svState={};
  if(!amb.svState[k])amb.svState[k]={};
  amb.svState[k].qty=qty;
  renderAmbientes();
}

// Calcula todas as peças da capelinha com base nas medidas
function calcCapelaPecas(ce){
  var W=+(ce.capW||0);   // largura interna cm
  var P=+(ce.capP||0);   // profundidade cm
  var H=+(ce.capH||0);   // altura interna cm
  var E=+(ce.capE||3);   // espessura chapa cm
  var nPil=+(ce.capNPil!==undefined?ce.capNPil:2); // número de pilares
  var pilW=+(ce.capPilW||0); // largura do pilar cm
  var pilH=+(ce.capPilH||H); // altura do pilar (padrão = altura interna)

  if(!W||!P||!H) return [];

  var pecas=[];
  function add(desc,w,h,q){
    var m2=(w/100)*(h/100)*(q||1);
    pecas.push({desc:desc,dim:w+'×'+h+' cm'+(q>1?' ×'+q:''),w:w,h:h,q:q||1,m2:m2});
  }

  // Peça de fundo: Largura × Altura interna
  add('Fundo (painel traseiro)', W, H, 1);

  // Base (tampo inferior): Largura × Profundidade
  add('Base / Tampo inferior', W, P, 1);

  // Teto (tampo superior): Largura × Profundidade
  add('Teto / Tampo superior', W, P, 1);

  // Laterais: Profundidade × Altura interna — 2 unidades (somente se o modelo tiver laterais)
  // Modelo padrão (base+fundo+teto+pilares) NÃO tem laterais
  if(ce.capTemLat) add('Laterais', P, H, 2);

  // Pilares (se configurados)
  if(nPil>0 && pilW>0){
    var pH=pilH||H;
    add('Pilar em chapa', pilW, pH, nPil);

    // Escadinha: 2 pedrinhas por extremidade de pilar (embaixo e cima)
    // Total por pilar: 4 pedrinhas (2 em cima + 2 embaixo)
    var esc1=pilW+4;  // pedrinha interna (+4cm)
    var esc2=pilW+8;  // pedrinha externa (+8cm)
    // Cada pedrinha é quadrada: esc×esc cm
    // Espessura = E (espessura da chapa padrão)
    var espEsc=E||3;
    // Quantidade: nPil pilares × 4 pedrinhas por pilar (2 em cima + 2 embaixo) = nPil×4
    // Mas dividimos em 2 tipos (esc1 e esc2), cada um com nPil×2 peças
    add('Escadinha pilar — interna ('+esc1+'cm)', esc1, espEsc, nPil*2);
    add('Escadinha pilar — externa ('+esc2+'cm)', esc2, espEsc, nPil*2);
  }

  return pecas;
}

// Aplica as peças calculadas ao ambiente (substitui as peças manuais)
function aplicarPecasCapela(ambId){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb||!amb.capExtra)return;
  var ce=amb.capExtra;
  var pecas=calcCapelaPecas(ce);
  if(!pecas.length){toast('Preencha largura, profundidade e altura');return;}

  // Substitui as peças do ambiente
  amb.pecas=pecas.map(function(p){
    return {id:Date.now()+Math.random(),desc:p.desc,w:p.w,h:p.h,q:p.q};
  });
  renderAmbientes();
  toast('✦ '+pecas.length+' peças aplicadas automaticamente!');
}

// ─── BALCÃO ──────────────────────────────────────────────────────
function updBalcMed(ambId,field,val){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.balcExtra)amb.balcExtra={};
  amb.balcExtra[field]=val;
  renderAmbientes();
}

function calcBalcaoPecas(be){
  var peH    = +(be.peH    || 0);  // altura do pé
  var peL    = +(be.peL    || 0);  // largura do pé
  var espPar = +(be.espPar || 0);  // espessura da parede
  var sainhaH= +(be.sainhaH|| 0);  // altura da sainha lateral
  var nPes   = +(be.nPes   || 1);
  var nFech  = +(be.nFech  || 0);
  var eng    = !!be.engrossado;
  var peE    = 2;                  // espessura fixa do granito = 2cm

  if(!peH || !peL) return [];
  var pecas = [];

  // 1. Peça frontal do pé: peH × peL
  var m2Pe = (peH/100) * (peL/100);
  pecas.push({desc:'Pé de Balcão', dim:peH+'×'+peL+' cm', w:peL, h:peH, q:nPes, m2:m2Pe*nPes});

  // 2. Sainha lateral 45°: 2 por pé — dimensão: sainhaH × peE (2cm)
  if(sainhaH > 0){
    var m2Sainha = (sainhaH/100) * (peE/100);
    pecas.push({desc:'Sainha Lateral 45°', dim:sainhaH+'×'+peE+' cm (×2 por pé)', w:peE, h:sainhaH, q:nPes*2, m2:m2Sainha*nPes*2});
  }

  // 3. Engrossamento (peça traseira colada): peH × (peL − espPar − 2)
  if(eng && espPar > 0){
    var engL = peL - espPar - 2;
    if(engL > 0){
      var m2Eng = (peH/100) * (engL/100);
      pecas.push({desc:'Engrossamento do Pé', dim:peH+'×'+engL+' cm', w:engL, h:peH, q:nPes, m2:m2Eng*nPes});
    }
  }

  // 4. Fechamento lateral até parede: (peH − 2) × (peL − espPar)
  if(nFech > 0 && espPar > 0){
    var fechH = peH - 2;
    var fechL = peL - espPar;
    if(fechH > 0 && fechL > 0){
      var m2Fech = (fechH/100) * (fechL/100);
      pecas.push({desc:'Fechamento Lateral (até parede)', dim:fechH+'×'+fechL+' cm', w:fechL, h:fechH, q:nFech, m2:m2Fech*nFech});
    }
  }

  return pecas;
}

function aplicarPecasBalcao(ambId){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb||!amb.balcExtra)return;
  var pecas=calcBalcaoPecas(amb.balcExtra);
  if(!pecas.length){toast('Preencha altura e largura do pé');return;}
  amb.pecas=pecas.map(function(p){
    return {id:Date.now()+Math.random(),desc:p.desc,w:p.w,h:p.h,q:p.q};
  });
  renderAmbientes();
  toast('✦ '+pecas.length+' peças aplicadas automaticamente!');
}

function calcSFAmb(ambId,k){
  var amb=ambientes.find(function(a){return a.id===ambId;});
  if(!amb||!amb.svState||!amb.svState[k])return;
  var sv=amb.svState[k];
  var el=document.getElementById('sfr-'+ambId+'-'+k);if(!el)return;
  var ml=sv.ml||0,altCm=sv.altCm||0,q=sv.q||1;
  if(ml&&altCm){
    var m2=ml*(altCm/100)*q;
    var mat=CFG.stones.find(function(s){return s.id===(amb.selMat||selMat);});
    var pv=mat?m2*mat.pr:0;
    var mo=ml*q*getPr(k);
    el.innerHTML='<span style="color:var(--grn)">Pedra: '+m2.toFixed(3)+'m² → R$ '+fm(pv)+'</span>  <span style="color:var(--gold2)">M.O.: R$ '+fm(mo)+'</span>';
  } else {el.textContent='';}
}

// Cuba picker per ambiente
var _cubaPickAmbId=null,_cubaPickSvKey2=null;
function openCubaPickAmb(ambId,tipo){
  _cubaPickAmbId=ambId;
  _cubaPickKey=tipo==='coz'?'cuba_coz':'cuba_lav';
  openCubaPick(tipo,tipo==='coz'?'cuba_coz':'cuba_lav');
}

// AI per ambiente
var _aiAmbId=null;
function abrirAIMd(ambId){
  _aiAmbId=ambId;
  var amb=ambientes.find(function(a){return a.id===ambId;});
  var _aiDesc=document.getElementById('aiDesc');
  var _aiStatus=document.getElementById('aiStatus');
  var _aiResultBox=document.getElementById('aiResultBox');
  var _btnAIAplicar=document.getElementById('btnAIAplicar');
  if(_aiDesc)_aiDesc.value='';
  if(_aiStatus){_aiStatus.textContent='Ambiente: '+(amb?amb.tipo:'');_aiStatus.className='ai-status';}
  if(_aiResultBox)_aiResultBox.style.display='none';
  if(_btnAIAplicar)_btnAIAplicar.style.display='none';
  showMd('aiMd');
}

// ═══ CALCULAR ═══
function calcular(){
  var cli=document.getElementById('oCliente').value.trim()||'Cliente';
  var tel=document.getElementById('oTel').value.trim()||'';
  var cidade=document.getElementById('oCidade').value.trim()||'';
  var end=document.getElementById('oEnd').value.trim()||'';
  var obs=document.getElementById('oObs').value.trim()||'';
  if(!ambientes.length){toast('Adicione pelo menos um ambiente');return;}
  var missingMat=ambientes.find(function(a){return !a.selMat;});
  if(missingMat){toast('Selecione a pedra de todos os ambientes');renderAmbientes();return;}
  // Global mat = first ambiente stone (for PDF header and backward compat)
  var mat=CFG.stones.find(function(s){return s.id===ambientes[0].selMat;})||CFG.stones[0];

  var totalM2=0,totalAcT=0,totalPedT=0,totalCustoPedra=0;
  var detHtml='';
  var txtAmbientes='';
  var allAcN=[];
  var allPds=[];

  ambientes.forEach(function(amb,idx){
    var tipo=amb.tipo;
    var sv=amb.svState||{};
    var g=SV_DEFS[tipo]||SV_DEFS.Cozinha;
    var m2=0,acT=0,acL=[],acN=[],sfPcs=[],pds=[];
    // Use per-ambiente stone
    var ambMat=CFG.stones.find(function(s){return s.id===amb.selMat;})||mat;

    // Peças
    // Rodapé de Box: 2 pedras coladas fundo com fundo → área × 2
    var _pecaMult = tipo==='Rodapé de Box' ? 2 : 1;
    amb.pecas.forEach(function(p){
      if(p.w&&p.h){
        var a=(p.w/100)*(p.h/100)*(p.q||1)*_pecaMult;
        m2+=a;
        pds.push({desc:p.desc||'Peça',w:p.w,h:p.h,q:p.q||1,m2:a});
        allPds.push({desc:(tipo+': '+(p.desc||'Peça')),w:p.w,h:p.h,q:p.q||1,m2:a});
        // Subpeças de pé estrutural (fechamento, sainha lateral, m.o. orgânico)
        if(_isPePc(p.desc)){
          var _peSubs=_calcPeSubpecas(p);
          _peSubs.forEach(function(s){
            if(s.isMo){
              acT+=s.moVal;
              acL.push({l:s.desc,v:s.moVal});
              acN.push(s.desc);
            } else if(s.m2>0){
              m2+=s.m2;
              pds.push({desc:s.desc,w:s.w,h:s.h,q:s.q||1,m2:s.m2});
              allPds.push({desc:(tipo+': '+s.desc),w:s.w,h:s.h,q:s.q||1,m2:s.m2});
            }
          });
        }
      }
    });

    // Serviços
    g.forEach(function(grp){grp.its.forEach(function(it){
      if(!sv[it.k])return;
      var svd=sv[it.k];
      // acb_auto: auto-calculated acabamento for Soleira/Peitoril
      // Cost is embedded in the total — NOT shown separately in PDF/WA
      if(it.u==='acb_auto'){
        var acbLados=it.lados||0;
        if(acbLados>0){
          var acbMl=_calcAcbAutoMl(amb,acbLados);
          var acbPr=getPr(it.k);
          if(acbMl>0&&acbPr>0){acT+=acbMl*acbPr;acL.push({l:it.l+' '+acbMl.toFixed(2)+'ml',v:acbMl*acbPr});acN.push(it.l+' ('+acbMl.toFixed(2)+'ml)');}
        }
        // Soleira 45°: soma área da sainha ao m² de pedra
        if(it.is45&&svd.sainhaH>0){var _s45Ml=_calcAcbAutoMl(amb,1);var _s45M2=_s45Ml*(svd.sainhaH/100);m2+=_s45M2;pds.push({desc:'Sainha Soleira 45°',w:_s45Ml*100,h:svd.sainhaH,q:1,m2:_s45M2});}
        return;
      }
      // ml_auto: Peitoril tipo com ml calculado automaticamente das peças
      if(it.u==='ml_auto'){
        var _autoMlP=0;(amb.pecas||[]).forEach(function(p){if(p.w)_autoMlP+=(p.w/100)*(p.q||1);});
        if(_autoMlP>0){var _pmlA=getPr(it.k);var _vmlA=_pmlA*_autoMlP;acT+=_vmlA;acL.push({l:it.l+' '+_autoMlP.toFixed(2)+'ml',v:_vmlA});acN.push(it.l+' ('+_autoMlP.toFixed(2)+'ml)');}
        return;
      }
      // sf_auto: serviço calculado automaticamente pelas peças (Chapel/Tomb)
      if(it.u==='sf_auto'){
        var sfaM2=_calcSfAutoM2(amb,it.match);
        if(sfaM2>0){
          var sfaPr=getPr(it.k);
          var sfaMo=sfaM2*sfaPr;
          // CORRECAO ERRO 1: acumula a area de pedra corretamente no total do ambiente
          m2+=sfaM2;
          if(sfaMo>0){
            acT+=sfaMo;
            acL.push({l:it.l+' ('+sfaM2.toFixed(3)+'m²)',v:sfaMo});
            acN.push(it.l);
          }
        }
        return;
      }
      if(it.u==='sf'){
        var ml=svd.ml||0,altCm=svd.altCm||0,q=svd.q||1;
        if(ml&&altCm){
          var sfM2=ml*(altCm/100)*q;
          var sfMo=ml*q*getPr(it.k);
          m2+=sfM2;acT+=sfMo;
          acL.push({l:it.l+' '+ml+'ml×'+altCm+'cm',v:sfMo});
          acN.push(it.l+' ('+ml+'ml, '+sfM2.toFixed(3)+'m²)');
          sfPcs.push({l:it.l,w:ml,h:altCm,q:q,m2:sfM2,mo:sfMo});
        }
        return;
      }
      if(it.u==='cuba'){
        if(amb.selCuba){var _cQtd=amb.selCuba.qtd||1;var _cTot=amb.selCuba.total*_cQtd;acT+=_cTot;acL.push({l:'Cuba: '+amb.selCuba.nm.trim()+(_cQtd>1?' ×'+_cQtd:''),v:_cTot});acN.push('Cuba: '+amb.selCuba.nm.trim()+(_cQtd>1?' ×'+_cQtd:''));}
        return;
      }
      if(it.u==='livre'){var v=svd.qty||0;if(v>0){acT+=v;acL.push({l:it.l,v:v});acN.push(it.l);}return;}
      if(it.fx===1){var p2=getPr(it.k);if(p2>0){acT+=p2;acL.push({l:it.l,v:p2});acN.push(it.l);}return;}
      var qty=svd.qty||1;
      var vv=getPr(it.k)*qty;acT+=vv;acL.push({l:it.l+(qty>1?' ×'+qty:''),v:vv});acN.push(it.l+(qty>1?' ×'+qty:''));
    });});

    // Acessórios do catálogo
    var acState=amb.acState||{};
    var acList=CFG.ac||[];
    Object.keys(acState).forEach(function(acKey){
      var qty=acState[acKey]||1;
      var acId=acKey.replace('ac_cat_','');
      var aItem=acList.find(function(x){return x.id===acId;});
      if(!aItem)return;
      var val=aItem.pr>0?aItem.pr*qty:0;
      var label=aItem.nm+(qty>1?' ×'+qty:'');
      if(val>0){acT+=val;acL.push({l:label,v:val});}
      acN.push(label);
    });

    // CORRECAO ERRO 6: aplica perda de corte para Túmulo e Capela (igual ao módulo avançado)
    if(tipo==='Túmulo'||tipo==='Tumulo'||tipo==='⛪ Capela'||tipo==='Capela'){
      var _perdaPerc=(amb.perdaCorte!=null?amb.perdaCorte:15)/100;
      m2=Math.round(m2*(1+_perdaPerc)*1000)/1000;
    }

    var pedTamb=m2*ambMat.pr;
    // Custo da pedra: tenta ambMat.custo, depois DEF_STONES, depois 0
    var _defStone=(typeof DEF_STONES!=='undefined')?DEF_STONES.find(function(s){return s.id===ambMat.id;}):null;
    var _custoUnit=ambMat.custo||(_defStone?_defStone.custo:0)||0;
    var custoAmbPedra=m2*_custoUnit;
    totalM2+=m2;totalAcT+=acT;totalPedT+=pedTamb;totalCustoPedra+=custoAmbPedra;
    allAcN=allAcN.concat(acN);
    var ambLabel=(idx+1)+'º Ambiente — '+tipo;
    detHtml+='<div style="font-size:.62rem;color:var(--gold);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin:8px 0 4px;">'+ambLabel+'</div>';
    if(pds.length){
      pds.forEach(function(p){
        detHtml+='<div class="rrow"><span class="rk">'+p.desc+' '+p.w+'×'+p.h+'cm'+(p.q>1?' ×'+p.q:'')+'</span><span class="rv">'+p.m2.toFixed(3)+'m²</span></div>';
      });
    }
    if(sfPcs.length){sfPcs.forEach(function(p){
      detHtml+='<div class="rrow"><span class="rk">'+p.l+' '+p.w+'ml×'+p.h+'cm'+(p.q>1?' ×'+p.q:'')+'</span><span class="rv">'+p.m2.toFixed(3)+'m²</span></div>';
    });}
    detHtml+='<div class="rrow"><span class="rk">'+ambMat.nm+' — '+m2.toFixed(3)+'m²</span><span class="rv" style="color:var(--gold2)">R$ '+fm(pedTamb)+'</span></div>';
    acL.forEach(function(a){detHtml+='<div class="rrow"><span class="rk">'+a.l+'</span><span class="rv">R$ '+fm(a.v)+'</span></div>';});
    if(acL.length===0&&m2===0)detHtml+='<div style="font-size:.72rem;color:var(--t4);padding:2px 0;">Nenhuma peça ou serviço neste ambiente</div>';
    // Dados do túmulo no bloco de detalhe
    if(amb.tipo==='Túmulo'&&amb.tumExtra){
      var teD=amb.tumExtra;var tumInfo=[];
      if(teD.falecido)tumInfo.push('Falecido(a): <b>'+escH(teD.falecido)+'</b>');
      if(teD.cemiterio)tumInfo.push('Cemitério: '+escH(teD.cemiterio));
      if(teD.quadra||teD.lote)tumInfo.push('Quadra '+(teD.quadra||'—')+' — Lote '+(teD.lote||'—'));
      if(teD.subtipo)tumInfo.push('Tipo: '+teD.subtipo);
      if(tumInfo.length)detHtml+='<div style="background:rgba(201,168,76,.07);border-radius:8px;padding:7px 10px;margin:4px 0;font-size:.62rem;color:var(--t3);line-height:1.8;">'+tumInfo.join(' · ')+'</div>';
    }
    if(amb.tipo==='⛪ Capela'&&amb.capExtra){
      var ceD=amb.capExtra;var capInfo=[];
      if(ceD.falecido)capInfo.push('Falecido(a): <b>'+escH(ceD.falecido)+'</b>');
      if(ceD.cemiterio)capInfo.push('Cemitério: '+escH(ceD.cemiterio));
      if(ceD.quadra||ceD.lote)capInfo.push('Quadra '+(ceD.quadra||'—')+' — Nº '+(ceD.lote||'—'));
      if(ceD.subtipo)capInfo.push('Tipo: '+ceD.subtipo);
      if(capInfo.length)detHtml+='<div style="background:rgba(201,168,76,.07);border-radius:8px;padding:7px 10px;margin:4px 0;font-size:.62rem;color:var(--t3);line-height:1.8;">'+capInfo.join(' · ')+'</div>';
    }

    // Texto WA por ambiente
    var pTxt=pds.map(function(p){return '• '+(p.desc||'Peça')+' — '+p.w+'×'+p.h+'cm'+(p.q>1?' ×'+p.q:'');}).join('\n');
    if(sfPcs.length)pTxt+=(pTxt?'\n':'')+sfPcs.map(function(p){return '• '+p.l+' — '+p.w+'ml×'+p.h+'cm'+(p.q>1?' ×'+p.q:'');}).join('\n');
    var aTxt=acN.length?acN.map(function(a){return '• '+a;}).join('\n'):'';
    var tumTxt='';
    if(amb.tipo==='Túmulo'&&amb.tumExtra){
      var te=amb.tumExtra;
      if(te.falecido)tumTxt+='Falecido(a): '+te.falecido+'\n';
      if(te.cemiterio)tumTxt+='Cemitério: '+te.cemiterio+'\n';
      if(te.quadra||te.lote)tumTxt+='Local: Quadra '+( te.quadra||'—')+' Lote '+(te.lote||'—')+'\n';
      if(te.subtipo)tumTxt+='Tipo: '+te.subtipo+'\n';
    }
    if(amb.tipo==='⛪ Capela'&&amb.capExtra){
      var cex=amb.capExtra;
      if(cex.falecido)tumTxt+='Falecido(a): '+cex.falecido+'\n';
      if(cex.cemiterio)tumTxt+='Cemitério: '+cex.cemiterio+'\n';
      if(cex.quadra||cex.lote)tumTxt+='Local: Quadra '+(cex.quadra||'—')+' Nº '+(cex.lote||'—')+'\n';
      if(cex.subtipo)tumTxt+='Tipo de Capitol: '+cex.subtipo+'\n';
    }
    txtAmbientes+='\n─── '+ambLabel+' ───\n'+(tumTxt||'')+(pTxt||'(sem peças)')+(aTxt?'\nInclusos:\n'+aTxt:'');
  });

  var pedT=totalPedT;
  var bruto=pedT+totalAcT;
  var vista=bruto;
  var parc=vista*1.12;
  var p8=parc/8,ent=vista/2;

  detHtml+='<div style="border-top:1px solid var(--bd);margin:10px 0 6px;"></div>';
  detHtml+='<div class="rrow"><span class="rk">Total m² de pedra</span><span class="rv">'+totalM2.toFixed(3)+'m²</span></div>';
  detHtml+='<div class="rrow"><span class="rk">Parcelado 8×</span><span class="rv" style="color:var(--t3)">R$ '+fm(parc)+' — 8× R$ '+fm(p8)+'</span></div>';
  detHtml+='<div class="rtot"><span class="k">À Vista</span><span class="v">R$ '+fm(vista)+'</span></div>';
  document.getElementById('resDetail').innerHTML=detHtml;

  // PAINEL INTERNO
  var pi='';
  var dtHP=new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long',year:'numeric'});
  pi+='<div style="background:linear-gradient(135deg,#0d0d18,#12100a);padding:14px 16px;border-bottom:1px solid var(--bd);">';
  pi+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold3);font-weight:700;">Resumo do Orçamento</div>';
  pi+='<div style="font-family:Cormorant Garamond,serif;font-size:1.4rem;color:var(--gold2);font-weight:700;margin-top:2px;">'+escH(cli)+'</div>';
  pi+='<div style="font-size:.72rem;color:var(--t3);margin-top:2px;">'+dtHP+'</div></div>';
  pi+='<div style="padding:12px 16px;border-bottom:1px solid var(--bd);">';
  pi+='<div style="font-size:.55rem;letter-spacing:2px;text-transform:uppercase;color:var(--t4);margin-bottom:6px;">Material</div>';
  pi+='<div style="display:flex;justify-content:space-between;">';
  pi+='<b style="font-size:.85rem;color:var(--tx);">'+mat.nm+' — '+mat.fin+'</b>';
  pi+='<b style="color:var(--gold2);">R$ '+fm(mat.pr)+'/m²</b></div>';
  pi+='<div style="font-size:.72rem;color:var(--t3);margin-top:3px;">Área: '+fm(totalM2)+' m² → Pedra: R$ '+fm(pedT)+'</div></div>';
  var acbNmP={borda_reta:'Borda Reta',borda_45:'Borda 45°',borda_boleada:'Borda Boleada',borda_chf:'Borda Chanfrada',cant:'Cantoneira',rodape:'Rodapé'};
  ambientes.forEach(function(ambP){
    var gP=SV_DEFS[ambP.tipo]||SV_DEFS.Cozinha;
    var svP=ambP.svState||{};
    var rowsP='';
    gP.forEach(function(grpP){grpP.its.forEach(function(itP){
      if(!svP[itP.k])return;
      if(itP.u==='acb_auto')return; // absorbed in total, don't show separately
      var sdP=svP[itP.k];
      var mlP=sdP.ml||sdP.w||0,hP=sdP.altCm||sdP.h||0,qP=sdP.q||1;
      var vP=0,dP=itP.l;
      if(itP.u==='sf'){vP=mlP*qP*getPr(itP.k);dP+=' '+mlP+'ml×'+hP+'cm'+(qP>1?' ×'+qP:'');}
      else if(itP.u==='sf_slim'||itP.u==='ml_only'){vP=mlP*qP*getPr(itP.k);dP+=' '+mlP+'ml (só MO)';}
      else if(itP.u==='cuba'){if(ambP.selCuba){var _pQtd=ambP.selCuba.qtd||1;vP=ambP.selCuba.total*_pQtd;dP+=': '+ambP.selCuba.nm.trim()+(_pQtd>1?' ×'+_pQtd:'');}}
      else if(!itP.fx){vP=(sdP.w||0)*getPr(itP.k);if(sdP.w)dP+=' '+sdP.w+(itP.u==='un'?'un':'ml');}
      else{vP=getPr(itP.k);}
      if(vP>0){rowsP+='<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #0d0d10;"><span style="font-size:.75rem;color:var(--t2);">'+dP+'</span><span style="font-size:.75rem;color:var(--gold2);font-weight:600;">R$ '+fm(vP)+'</span></div>';}
    });});
    ambP.pecas.forEach(function(pP){
      if(!pP.acb)return;
      Object.keys(pP.acb).forEach(function(akP){
        var mlA=pP.acb[akP].ml||0;if(!mlA)return;
        var vA=mlA*getPr(akP);
        rowsP+='<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #0d0d10;"><span style="font-size:.75rem;color:var(--t2);">'+(acbNmP[akP]||akP)+' '+mlA+'ml ('+escH(pP.desc||'')+')</span><span style="font-size:.75rem;color:var(--gold2);font-weight:600;">R$ '+fm(vA)+'</span></div>';
      });
    });
    if(rowsP){
      pi+='<div style="padding:10px 16px;border-bottom:1px solid var(--bd);">';
      pi+='<div style="font-size:.6rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--gold3);opacity:.7;margin-bottom:6px;">'+ambP.tipo+'</div>'+rowsP+'</div>';
    }
  });
  pi+='<div style="padding:14px 16px;background:var(--s2);">';
  var temCustoReal=totalCustoPedra>0;
  pi+='<div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span style="font-size:.72rem;color:var(--t3);">Pedra — Preço Venda</span><b style="color:var(--gold2);">R$ '+fm(pedT)+'</b></div>';
  if(temCustoReal){pi+='<div style="display:flex;justify-content:space-between;margin-bottom:7px;"><span style="font-size:.72rem;color:var(--t3);">Pedra — Custo Real</span><b style="color:var(--grn);">R$ '+fm(totalCustoPedra)+'</b></div>';}
  else{pi+='<div style="display:flex;justify-content:space-between;margin-bottom:7px;font-style:italic;"><span style="font-size:.68rem;color:var(--t4);">Custo real não cadastrado</span><span style="font-size:.68rem;color:var(--t4);">—</span></div>';}
  // ══ CÁLCULO INTELIGENTE DE CUSTO MO ══
  // Folha mensal configurável (salários + pró-labores HR)
  var folhaMensal = CFG&&CFG.sv&&CFG.sv.folhaMensal!=null ? CFG.sv.folhaMensal : 9900;

  // Calcula m² médio REALMENTE PRODUZIDO nos últimos 3 meses
  // Fonte: jobs concluídos (done:true) com m² registrado
  // Jobs antigos sem m² são ignorados (campo ausente/zero)
  // Se não houver histórico suficiente, retorna 0 → fallback 55%
  function calcM2MedioMensal() {
    if(!DB||!DB.j||!DB.j.length) return 0;
    var hoje = new Date();
    var m2PorMes = {};
    var jobsValidos = 0;
    DB.j.forEach(function(j) {
      if(!j.done||!j.m2||j.m2<=0) return;
      // Usar data de conclusão (end) ou início (start) como referência
      var ref = j.end || j.start;
      if(!ref) return;
      var partes = ref.split('-');
      if(partes.length<2) return;
      var chave = partes[0]+'-'+partes[1];
      var d = new Date(parseInt(partes[0]), parseInt(partes[1])-1, parseInt(partes[2])||1);
      var diffMeses = (hoje.getFullYear()-d.getFullYear())*12 + (hoje.getMonth()-d.getMonth());
      if(diffMeses >= 0 && diffMeses < 3) {
        m2PorMes[chave] = (m2PorMes[chave]||0) + j.m2;
        jobsValidos++;
      }
    });
    // Mínimo de 2 jobs concluídos para ativar cálculo inteligente
    if(jobsValidos < 2) return 0;
    var meses = Object.keys(m2PorMes);
    if(!meses.length) return 0;
    var totalM2Hist = meses.reduce(function(s,k){return s+m2PorMes[k];},0);
    return totalM2Hist / meses.length;
  }

  var m2MedioMes = calcM2MedioMensal();
  var custoMOm2 = m2MedioMes > 0 ? folhaMensal / m2MedioMes : 0;
  var custoRealMO = custoMOm2 > 0 ? custoMOm2 * totalM2 : totalAcT * (CFG&&CFG.sv&&CFG.sv.fatorCustoMO!=null?CFG.sv.fatorCustoMO:0.55);
  var moInteligente = custoMOm2 > 0;

  // MO cobrada vs custo real
  pi+='<div style="display:flex;justify-content:space-between;margin-bottom:3px;">';
  pi+='<span style="font-size:.72rem;color:var(--t3);">Mão de Obra (cobrado)</span>';
  pi+='<b style="color:var(--gold2);">R$ '+fm(totalAcT)+'</b></div>';

  if(moInteligente){
    pi+='<div style="display:flex;justify-content:space-between;margin-bottom:7px;">';
    pi+='<span style="font-size:.67rem;color:var(--t4);">Custo MO ('+m2MedioMes.toFixed(1)+'m²/mês · R$'+fm(custoMOm2.toFixed(0))+'/m²)</span>';
    pi+='<b style="color:#6ea4ff;">R$ '+fm(custoRealMO)+'</b></div>';
  } else {
    pi+='<div style="display:flex;justify-content:space-between;margin-bottom:7px;font-style:italic;">';
    pi+='<span style="font-size:.65rem;color:var(--t4);">Custo MO (histórico curto — 55% estimado)</span>';
    pi+='<b style="color:#6ea4ff;">R$ '+fm(custoRealMO)+'</b></div>';
  }

  var totalCustoReal=(temCustoReal?totalCustoPedra:pedT)+custoRealMO;

  pi+='<div style="border-top:1px solid var(--bd);padding-top:8px;margin-bottom:7px;display:flex;justify-content:space-between;">';
  pi+='<span style="font-size:.78rem;font-weight:700;">Total Custo Real</span>';
  pi+='<b style="font-family:Cormorant Garamond,serif;font-size:1.1rem;">R$ '+fm(totalCustoReal)+'</b></div>';

  pi+='<div style="border-top:2px solid rgba(201,168,76,.3);padding-top:10px;display:flex;justify-content:space-between;align-items:baseline;">';
  pi+='<span style="font-size:.72rem;color:var(--gold3);">Valor à Vista (cliente)</span>';
  pi+='<b style="font-family:Cormorant Garamond,serif;font-size:1.4rem;color:var(--gold2);">R$ '+fm(vista)+'</b></div>';

  var margemReal=vista-totalCustoReal;
  var margemPct=totalCustoReal>0?Math.round(margemReal/totalCustoReal*100):0;
  var margemSobreVenda=vista>0?Math.round(margemReal/vista*100):0;
  var margemColor=margemPct>=40?'var(--grn)':margemPct>=20?'#f0a500':'#e05a5a';

  pi+='<div style="margin-top:8px;padding:10px 12px;background:rgba(0,0,0,.2);border-radius:10px;">';
  pi+='<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">';
  pi+='<span style="font-size:.82rem;font-weight:700;">💰 Lucro Real</span>';
  pi+='<b style="color:'+margemColor+';font-size:1.05rem;">R$ '+fm(margemReal)+'</b></div>';
  pi+='<div style="display:flex;gap:8px;">';
  pi+='<div style="flex:1;text-align:center;padding:6px 4px;background:rgba(255,255,255,.04);border-radius:7px;">';
  pi+='<div style="font-size:.55rem;color:var(--t4);margin-bottom:2px;">sobre custo</div>';
  pi+='<div style="font-size:.92rem;font-weight:700;color:'+margemColor+';">'+margemPct+'%</div></div>';
  pi+='<div style="flex:1;text-align:center;padding:6px 4px;background:rgba(255,255,255,.04);border-radius:7px;">';
  pi+='<div style="font-size:.55rem;color:var(--t4);margin-bottom:2px;">sobre venda</div>';
  pi+='<div style="font-size:.92rem;font-weight:700;color:'+margemColor+';">'+margemSobreVenda+'%</div></div>';
  if(moInteligente){
    pi+='<div style="flex:1;text-align:center;padding:6px 4px;background:rgba(255,255,255,.04);border-radius:7px;">';
    pi+='<div style="font-size:.55rem;color:var(--t4);margin-bottom:2px;">folha mensal</div>';
    pi+='<div style="font-size:.72rem;font-weight:700;color:var(--gold3);">R$'+fm(Math.round(folhaMensal))+'</div></div>';
  }
  pi+='</div></div></div>';
  var piEl=document.getElementById('painelInterno');if(piEl)piEl.innerHTML=pi;

  var txt='HR MARMORES E GRANITOS\nORCAMENTO — '+cli+'\n\nMaterial: '+mat.nm+' ('+mat.fin+')\n'+txtAmbientes+'\n\n• Fabricacao e acabamento completo\n\n==================\nPARCELADO\nR$ '+fm(parc)+' — ate 8x de R$ '+fm(p8)+'\n\nA VISTA\nR$ '+fm(vista)+'\n\nEntrada 50%: R$ '+fm(ent)+'\nEntrega 50%: R$ '+fm(ent)+'\n==================\n'+CFG.emp.nome+'\n'+CFG.emp.tel;
  if(cidade)txt+='\n'+cidade;
  document.getElementById('quoteBox').textContent=txt;
  document.getElementById('resArea').style.display='block';
  document.getElementById('resArea').scrollIntoView({behavior:'smooth',block:'start'});

  // Salvar snapshot dos ambientes para poder recarregar depois
  var ambSnap=ambientes.map(function(a){
    return {tipo:a.tipo,pecas:JSON.parse(JSON.stringify(a.pecas)),selCuba:a.selCuba,svState:JSON.parse(JSON.stringify(a.svState||{})),acState:JSON.parse(JSON.stringify(a.acState||{})),tumExtra:a.tumExtra?JSON.parse(JSON.stringify(a.tumExtra)):null,selMat:a.selMat||null};
  });
  var q={id:Date.now(),date:td(),cli:cli,tel:tel,cidade:cidade,end:end,obs:obs,tipo:ambientes.map(function(a){return a.tipo;}).join('+'),mat:mat.nm,matPr:mat.pr,matCusto:mat.custo||0,m2:totalM2,custoPedra:totalCustoPedra,pedT:pedT,acT:totalAcT,acN:allAcN,pds:allPds,sfPcs:[],vista:vista,parc:parc,p8:p8,ent:ent,ambSnap:ambSnap};
  DB.q.unshift(q);DB.sv();pendQ=q;
  // ── Consultor de Desconto + Auto-save cliente ──
  setTimeout(function(){ _cliMostrarConsultor(q); _cliAutoSave(cli,tel,cidade,end); }, 500);
}
function selectQuote(){
  var el=document.getElementById('quoteBox');
  if(!el)return;
  var range=document.createRange();
  range.selectNodeContents(el);
  var sel=window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);
}
function copiar(){
  var t=document.getElementById('quoteBox').textContent;
  // Strategy 1: modern clipboard API
  if(navigator.clipboard&&window.isSecureContext){
    navigator.clipboard.writeText(t).then(function(){toast('✓ Copiado!');}).catch(function(){_copiarFallback(t);});
    return;
  }
  _copiarFallback(t);
}
function _copiarFallback(t){
  // Strategy 2: execCommand on hidden textarea
  var ta=document.createElement('textarea');
  ta.value=t;
  ta.setAttribute('readonly','');
  ta.style.cssText='position:fixed;top:-9999px;left:-9999px;font-size:12px;';
  document.body.appendChild(ta);
  var isIOS=/ipad|iphone/i.test(navigator.userAgent);
  var copied=false;
  if(isIOS){
    var range=document.createRange();
    range.selectNodeContents(ta);
    var sel=window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    ta.setSelectionRange(0,999999);
  } else {
    ta.focus();
    ta.select();
  }
  try{
    copied=document.execCommand('copy');
  }catch(e){}
  document.body.removeChild(ta);
  if(copied){toast('✓ Copiado!');return;}
  // Strategy 3: show modal with selectable text
  _copiarModal(t);
}
function _copiarModal(t){
  var ov=document.createElement('div');
  ov.id='copyOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.94);z-index:9999;display:flex;align-items:flex-end;justify-content:center;';
  ov.innerHTML='<div style="background:#141418;border-radius:18px 18px 0 0;width:100%;max-width:480px;padding:16px 16px 32px;border-top:1px solid #28282f;">'
    +'<div style="font-size:.85rem;font-weight:700;color:#C9A84C;margin-bottom:10px;">Selecione e copie o texto</div>'
    +'<textarea id="copyTa" rows="10" readonly style="width:100%;background:#0e0e12;border:1px solid #28282f;border-radius:10px;color:#F4EFE8;padding:11px 12px;font-size:.76rem;font-family:Outfit,sans-serif;resize:none;outline:none;-webkit-user-select:text;user-select:text;">'+t+'</textarea>'
    +'<div style="font-size:.68rem;color:#7a7570;margin:8px 0 12px;">Toque na caixa acima → Selecionar tudo → Copiar</div>'
    +'<button onclick="document.getElementById(\'copyOv\').remove();" style="width:100%;padding:12px;background:#22222a;border:1px solid #28282f;color:#bfb9b0;border-radius:11px;font-size:.84rem;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;">Fechar</button>'
    +'</div>';
  document.body.appendChild(ov);
  // Auto-select the textarea
  setTimeout(function(){
    var ta=document.getElementById('copyTa');
    if(ta){ta.focus();ta.select();ta.setSelectionRange(0,ta.value.length);}
  },150);
}


function gerarPDF(){
  if(!pendQ){toast('Calcule um orçamento primeiro');return;}
  // Load PDF libs on-demand if not already loaded
  if(typeof html2canvas==='undefined'||typeof window.jspdf==='undefined'){
    toast('Carregando bibliotecas PDF...');
    var s1=document.createElement('script');
    s1.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s1.onload=function(){
      var s2=document.createElement('script');
      s2.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s2.onload=function(){gerarPDF();};
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
    return;
  }
  if(!pendQ){toast('Calcule um orçamento primeiro');return;}
  var q=pendQ;
  var emp=CFG.emp;

  // ── Numeração sequencial a partir de 0 ──
  var pdfCount=parseInt(localStorage.getItem('hr_pdf_count')||'0',10);
  var orcNum='ORC-'+String(pdfCount).padStart(4,'0');
  localStorage.setItem('hr_pdf_count', pdfCount+1);

  var fileName='Orcamento_'+orcNum+'_'+q.cli.replace(/[^a-zA-Z0-9]/g,'_')+'.pdf';
  var economia=q.parc-q.vista;
  var mat=CFG.stones.find(function(s){return s.nm===q.mat;})||{pr:q.matPr||0,nm:q.mat||'',fin:''};

  // ── Linhas da tabela ──
  // Montar linhas da tabela por ambiente
  // ── Lista de peças simplificada (apenas nome + medidas, sem m² ou preço unitário) ──
  var pecasListHtml='';
  if(q.ambSnap&&q.ambSnap.length){
    q.ambSnap.forEach(function(snap,idx){
      var tipo=snap.tipo||'Ambiente';
      var hasPecas=(snap.pecas||[]).filter(function(p){return p.w&&p.h;}).length>0;
      var g=SV_DEFS[tipo]||SV_DEFS.Cozinha;
      var sv=snap.svState||{};
      var hasSf=false;
      g.forEach(function(grp){grp.its.forEach(function(it){
        if(sv[it.k]&&it.u==='sf'){var d=sv[it.k];if(d.ml&&d.altCm)hasSf=true;}
        if(sv[it.k]&&it.u==='ml_auto'&&(snap.pecas||[]).some(function(p){return p.w;}))hasSf=true;
      });});
      if(!hasPecas&&!hasSf)return;
      if(q.ambSnap.length>1){
        pecasListHtml+='<div style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;color:#C9A84C;font-weight:700;padding:12px 0 8px;margin-top:4px;border-top:1px solid #EDE5CC;">'+(idx+1)+'&ordm; Ambiente &mdash; '+tipo+'</div>';
      }
      (snap.pecas||[]).forEach(function(p){
        if(!p.w||!p.h)return;
        var dimStr=p.w+' × '+p.h+' cm'+(p.q>1?' (×'+p.q+')':'');
        pecasListHtml+='<div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0;border-bottom:1px solid #EDE5CC;">'
          +'<span style="font-size:14px;font-weight:600;color:#1a1a1a;letter-spacing:0.1px;">'+(p.desc||'Peça')+'</span>'
          +'<span style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:12px;color:#999;font-weight:400;letter-spacing:0.3px;">'+dimStr+'</span>'
          +'</div>';
      });
      // Montar segmentos detalhados por sub-tipo de borda a partir de pc.bordas
      var bordaSegs = {}; // { sub: [ {cm, alt, q, pcDesc} ] }
      (snap.pecas||[]).forEach(function(pc){
        if(!pc.bordas||!pc.w||!pc.h) return;
        var q = pc.q||1;
        var dims = {fr:pc.w||0,fd:pc.w||0,esq:pc.h||0,dir:pc.h||0};
        ['fr','fd','esq','dir'].forEach(function(lado){
          var bd=pc.bordas[lado];
          if(!bd||!bd.tipo||!bd.sub||!dims[lado]) return;
          var cm = bd.ml!=null ? bd.ml : dims[lado];
          var alt = bd.alt||6;
          if(!bordaSegs[bd.sub]) bordaSegs[bd.sub]=[];
          // Se quantidade > 1, repete o segmento q vezes para mostrar claramente
          for(var qi=0;qi<q;qi++) bordaSegs[bd.sub].push({cm:cm,alt:alt});
        });
      });
      g.forEach(function(grp){grp.its.forEach(function(it){
        if(!sv[it.k]||it.u!=='sf')return;
        var svd=sv[it.k];var alt=svd.altCm||0;
        if(!svd.ml||!alt)return;
        var segs = bordaSegs[it.k];
        var dimStr;
        if(segs&&segs.length>0){
          // Agrupa segmentos idênticos (mesmo cm e alt)
          var grouped={};
          segs.forEach(function(s){
            var k2=s.cm+'_'+s.alt;
            grouped[k2]=(grouped[k2]||{cm:s.cm,alt:s.alt,n:0});
            grouped[k2].n++;
          });
          var parts=Object.keys(grouped).map(function(k2){
            var g2=grouped[k2];
            var seg=g2.cm+'×'+g2.alt;
            return g2.n>1?seg+' (×'+g2.n+')':seg;
          });
          dimStr=parts.join(' + ')+' cm';
        } else {
          // Fallback: mostra total em metros como antes
          dimStr=svd.ml+' ml × '+alt+' cm';
        }
        pecasListHtml+='<div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0;border-bottom:1px solid #EDE5CC;">'
          +'<span style="font-size:14px;font-weight:600;color:#1a1a1a;letter-spacing:0.1px;">'+it.l+'</span>'
          +'<span style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:12px;color:#999;font-weight:400;letter-spacing:0.3px;">'+dimStr+'</span>'
          +'</div>';
      });});
      // ml_auto: Peitoril tipos com ml calculado das peças
      g.forEach(function(grp){grp.its.forEach(function(it){
        if(!sv[it.k]||it.u!=='ml_auto')return;
        var _mlPdf=0;(snap.pecas||[]).forEach(function(p){if(p.w)_mlPdf+=(p.w/100)*(p.q||1);});
        if(!_mlPdf)return;
        pecasListHtml+='<div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0;border-bottom:1px solid #EDE5CC;">'
          +'<span style="font-size:14px;font-weight:600;color:#1a1a1a;letter-spacing:0.1px;">'+it.l+'</span>'
          +'<span style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:12px;color:#999;font-weight:400;letter-spacing:0.3px;">'+_mlPdf.toFixed(2)+' ml</span>'
          +'</div>';
      });});
    });
  } else {
    (q.pds||[]).forEach(function(p){
      if(!p.w||!p.h)return;
      var dimStr=p.w+' × '+p.h+' cm'+(p.q>1?' (×'+p.q+')':'');
      pecasListHtml+='<div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0;border-bottom:1px solid #EDE5CC;">'
        +'<span style="font-size:14px;font-weight:600;color:#1a1a1a;letter-spacing:0.1px;">'+(p.desc||'Peça')+'</span>'
        +'<span style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:12px;color:#999;font-weight:400;letter-spacing:0.3px;">'+dimStr+'</span>'
        +'</div>';
    });
  }

  // ── Serviços inclusos ──
  var inclusosBase=['Corte e fabricação','Acabamento completo'];
  var inclusosExtra=(q.acN&&q.acN.length)?q.acN:[];
  var todosInclusos=inclusosBase.concat(inclusosExtra);
  var inclusosHtml=todosInclusos.map(function(a){
    return '<div style="display:inline-flex;align-items:center;gap:6px;margin:0 10px 6px 0;">'
      +'<span style="color:#C9A84C;font-size:10px;flex-shrink:0;">&#9670;</span>'
      +'<span style="font-size:12px;color:#444;font-weight:500;">'+a+'</span>'
      +'</div>';
  }).join('');

  var clienteInfo='';
  if(q.tel)clienteInfo+='<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#555;"><span style="color:#C9A84C;">&#128241;</span>'+q.tel+'</div>';
  if(q.cidade)clienteInfo+='<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#555;"><span style="color:#C9A84C;">&#128205;</span>'+q.cidade+'</div>';
  if(q.end)clienteInfo+='<div style="display:flex;align-items:center;gap:6px;font-size:11.5px;color:#555;"><span style="color:#C9A84C;">&#127968;</span>'+q.end+'</div>';
  var obsBox=q.obs?'<div style="background:#fffbf0;border-left:3px solid #C9A84C;padding:10px 16px;margin-bottom:20px;font-size:12px;color:#555;border-radius:0 8px 8px 0;line-height:1.65;"><strong style="color:#7a4e00;">Observações:</strong> '+q.obs+'</div>':'';

  // sec header helper — linha discreta
  function sh(t){return '<div style="display:flex;align-items:center;gap:10px;margin:0 0 14px;margin-top:4px;"><span style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:900;white-space:nowrap;">'+t+'</span><div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.35),transparent);"></div></div>';}

  // ── Faixa lateral dourada SVG (decoração vertical) ──
  var goldBar='<div style="position:absolute;left:0;top:0;bottom:0;width:4px;background:linear-gradient(180deg,#5a3a06 0%,#C9A84C 30%,#E8C96A 50%,#C9A84C 70%,#5a3a06 100%);"></div>';

  var recHtml=''
  +'<div id="pdfReceipt" style="width:700px;font-family:Georgia,\'Times New Roman\',serif;background:#FAFAF8;color:#1a1a1a;position:relative;">'

  // ══ TOPO DOURADO ══
  +'<div style="height:3px;background:linear-gradient(90deg,#3a2200 0%,#C9A84C 30%,#EDD06A 50%,#C9A84C 70%,#3a2200 100%);"></div>'

  // ══ CABEÇALHO ══
  +'<div style="background:#0C0900;padding:32px 44px 28px;display:flex;justify-content:space-between;align-items:flex-end;">'

    // Marca
    +'<div>'
      +'<div style="font-size:28px;font-weight:700;color:#C9A84C;letter-spacing:0.5px;line-height:1;margin-bottom:6px;">'+emp.nome+'</div>'
      +'<div style="font-size:7.5px;letter-spacing:4px;text-transform:uppercase;color:rgba(201,168,76,0.38);font-family:\'Helvetica Neue\',Arial,sans-serif;">M&Aacute;RMORE &nbsp;&bull;&nbsp; GRANITO &nbsp;&bull;&nbsp; QUARTZITO</div>'
    +'</div>'

    // Contato
    +'<div style="text-align:right;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      +'<div style="font-size:13px;color:#C9A84C;font-weight:600;letter-spacing:0.3px;margin-bottom:3px;">'+emp.tel+'</div>'
      +'<div style="font-size:9.5px;color:rgba(255,255,255,0.3);line-height:1.7;">'+emp.end+'</div>'
      +'<div style="font-size:9.5px;color:rgba(255,255,255,0.22);">'+emp.cidade+'</div>'
    +'</div>'

  +'</div>'

  // ══ FAIXA DO DOCUMENTO ══
  +'<div style="background:#1A1400;padding:10px 44px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(201,168,76,0.15);border-bottom:1px solid rgba(201,168,76,0.15);">'
    +'<div style="display:flex;align-items:center;gap:16px;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      +'<div style="font-size:7px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(201,168,76,0.5);font-weight:600;">Proposta Comercial</div>'
      +'<div style="width:1px;height:12px;background:rgba(201,168,76,0.2);"></div>'
      +'<div style="font-size:9px;font-weight:700;color:#C9A84C;letter-spacing:1px;">'+orcNum+'</div>'
    +'</div>'
    +'<div style="text-align:right;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      +'<span style="font-size:9px;color:rgba(255,255,255,0.3);">Emiss&atilde;o: </span>'
      +'<span style="font-size:9px;color:rgba(201,168,76,0.65);font-weight:600;">'+fd(q.date)+'</span>'
      +'<span style="font-size:9px;color:rgba(255,255,255,0.15);margin:0 6px;">&nbsp;&middot;&nbsp;</span>'
      +'<span style="font-size:9px;color:rgba(255,255,255,0.3);">V&aacute;lida: </span>'
      +'<span style="font-size:9px;color:rgba(201,168,76,0.65);font-weight:600;">7 dias</span>'
    +'</div>'
  +'</div>'

  // ══ CORPO ══
  +'<div style="padding:36px 44px 32px;background:#FAFAF8;">'

    // ── Destinatário ──
    +'<div style="margin-bottom:28px;">'
      +'<div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:600;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:8px;">Preparado para</div>'
      +'<div style="display:flex;align-items:baseline;gap:14px;flex-wrap:wrap;">'
        +'<div style="font-size:26px;font-weight:700;color:#0C0900;line-height:1;letter-spacing:-0.3px;">'+q.cli+'</div>'
        +'<div style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:9px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border:1px solid rgba(201,168,76,0.4);padding:3px 10px;border-radius:3px;">'+q.tipo+'</div>'
      +'</div>'
      +(clienteInfo?'<div style="display:flex;flex-wrap:wrap;gap:4px 20px;margin-top:8px;font-family:\'Helvetica Neue\',Arial,sans-serif;">'+clienteInfo+'</div>':'')
    +'</div>'

    +obsBox

    // ── Divisor ouro ──
    +'<div style="display:flex;align-items:center;gap:12px;margin-bottom:28px;">'
      +'<div style="height:1px;flex:1;background:linear-gradient(90deg,#C9A84C,rgba(201,168,76,0.08));"></div>'
      +'<div style="width:4px;height:4px;background:#C9A84C;transform:rotate(45deg);flex-shrink:0;"></div>'
    +'</div>'

    // ── ITENS ──
    +'<div style="margin-bottom:28px;">'
      +'<div style="font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:#888;font-weight:600;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:14px;">Peças / Especificações</div>'
      +pecasListHtml
    +'</div>'

    // ── ESPECIFICAÇÃO DO MATERIAL ──
    +'<div style="border:2px solid #C9A84C;border-radius:10px;overflow:hidden;margin-bottom:28px;box-shadow:0 4px 18px rgba(201,168,76,0.12);">'
      // Faixa com foto/textura da pedra
      +'<div class="'+(mat.photo?'':mat.tx)+'" style="height:110px;width:100%;position:relative;overflow:hidden;'+(mat.photo?'background-image:url(\''+mat.photo+'\');background-size:cover;background-position:center;':'')+'">'        +'<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,0.82) 0%,rgba(0,0,0,0.5) 50%,rgba(0,0,0,0.15) 100%);">'           +'<div style="position:absolute;left:22px;top:50%;transform:translateY(-50%);">'            +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.8);font-weight:700;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:6px;">MATERIAL SELECIONADO</div>'            +'<div style="font-size:24px;font-weight:700;color:#C9A84C;line-height:1;letter-spacing:-0.3px;">'+q.mat+'</div>'            +'<div style="font-size:9.5px;color:rgba(255,255,255,0.45);font-family:\'Helvetica Neue\',Arial,sans-serif;margin-top:5px;letter-spacing:0.8px;">'+(mat.cat||'')+(mat.cat&&mat.fin?' &middot; ':'')+(mat.fin||'')+'</div>'          +'</div>'          +(mat.desc?'<div style="position:absolute;right:22px;top:50%;transform:translateY(-50%);max-width:210px;text-align:right;">'            +'<div style="font-size:9px;color:rgba(255,255,255,0.45);font-family:\'Helvetica Neue\',Arial,sans-serif;line-height:1.5;font-style:italic;">'+mat.desc.substring(0,90)+(mat.desc.length>90?'…':'')+'</div>'          +'</div>':'')        +'</div>'      +'</div>'
      // Detalhes e inclusos
      +'<div style="background:#FAFAF8;padding:16px 22px;border-top:2px solid #C9A84C;">'        +(mat.fin?'<div style="display:flex;gap:0;margin-bottom:14px;">'          +'<div style="flex:1;padding-right:16px;border-right:1px solid #EDE5CC;">'            +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:4px;">Acabamento</div>'            +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;">'+mat.fin+'</div>'          +'</div>'          +'<div style="flex:1;padding-left:16px;">'            +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:4px;">Categoria</div>'            +'<div style="font-size:13px;font-weight:700;color:#1a1a1a;">'+(mat.cat||'Granito')+'</div>'          +'</div>'        +'</div>'+'<div style="height:1px;background:#EDE5CC;margin-bottom:14px;"></div>':'')        +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:10px;">Incluso nesta proposta</div>'        +'<div style="display:flex;flex-wrap:wrap;gap:6px 0;font-family:\'Helvetica Neue\',Arial,sans-serif;">'+inclusosHtml+'</div>'      +'</div>'
    +'</div>'
    // ── VALOR FINAL ──
    +'<div style="background:#0C0900;border-radius:10px;padding:26px 28px;margin-bottom:16px;position:relative;overflow:hidden;">'

      // Detalhe decorativo
      +'<div style="position:absolute;right:-30px;top:-30px;width:120px;height:120px;border-radius:50%;border:1px solid rgba(201,168,76,0.08);"></div>'
      +'<div style="position:absolute;right:-10px;top:-10px;width:80px;height:80px;border-radius:50%;border:1px solid rgba(201,168,76,0.06);"></div>'

      +'<div style="display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;">'

        // À vista
        +'<div>'
          +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.55);font-weight:700;font-family:\'Helvetica Neue\',Arial,sans-serif;margin-bottom:8px;">&Agrave; Vista &mdash; Sem Juros</div>'
          +'<div style="font-size:42px;font-weight:700;color:#C9A84C;line-height:1;letter-spacing:-1px;">R$ '+fm(q.vista)+'</div>'
          +'<div style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:10.5px;color:rgba(255,255,255,0.3);margin-top:6px;">Economia de <span style="color:rgba(201,168,76,0.6);font-weight:600;">R$ '+fm(economia)+'</span> em rela&ccedil;&atilde;o ao parcelado</div>'
        +'</div>'

        // Badge e parcelado
        +'<div style="text-align:right;">'
          +'<div style="background:#C9A84C;color:#0C0900;font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:8px;font-weight:900;padding:5px 14px;border-radius:4px;letter-spacing:2px;text-transform:uppercase;display:inline-block;margin-bottom:12px;">Melhor Opção</div>'
          +'<div style="font-family:\'Helvetica Neue\',Arial,sans-serif;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.2);font-weight:600;margin-bottom:3px;">Ou parcelado</div>'
            +'<div style="font-size:15px;font-weight:700;color:rgba(255,255,255,0.25);">R$ '+fm(q.parc)+'</div>'
            +'<div style="font-size:9.5px;color:rgba(255,255,255,0.15);">at&eacute; 8× de R$ '+fm(q.p8)+'</div>'
          +'</div>'
        +'</div>'

      +'</div>'
    +'</div>'

    // ── CONDIÇÃO DE PAGAMENTO ──
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">'

      +'<div style="background:#fff;border:1px solid #E8E0CC;border-radius:8px;padding:16px 20px;">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
          +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;font-family:\'Helvetica Neue\',Arial,sans-serif;">Entrada</div>'
          +'<div style="font-size:8.5px;color:#bbb;font-family:\'Helvetica Neue\',Arial,sans-serif;">50%</div>'
        +'</div>'
        +'<div style="font-size:22px;font-weight:700;color:#1a1a1a;line-height:1;margin-bottom:4px;">R$ '+fm(q.ent)+'</div>'
        +'<div style="font-size:10.5px;color:#aaa;font-family:\'Helvetica Neue\',Arial,sans-serif;">Na assinatura &mdash; ap&oacute;s medi&ccedil;&atilde;o</div>'
      +'</div>'

      +'<div style="background:#fff;border:1px solid #E8E0CC;border-radius:8px;padding:16px 20px;">'
        +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">'
          +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:700;font-family:\'Helvetica Neue\',Arial,sans-serif;">Na Entrega</div>'
          +'<div style="font-size:8.5px;color:#bbb;font-family:\'Helvetica Neue\',Arial,sans-serif;">50%</div>'
        +'</div>'
        +'<div style="font-size:22px;font-weight:700;color:#1a1a1a;line-height:1;margin-bottom:4px;">R$ '+fm(q.ent)+'</div>'
        +'<div style="font-size:10.5px;color:#aaa;font-family:\'Helvetica Neue\',Arial,sans-serif;">Na entrega e instala&ccedil;&atilde;o</div>'
      +'</div>'

    +'</div>'

  +'</div>'

  // ══ RODAPÉ ══
  +'<div style="background:#0C0900;padding:18px 44px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(201,168,76,0.12);">'
    +'<div>'
      +'<div style="font-size:12px;font-weight:700;color:#C9A84C;letter-spacing:0.3px;margin-bottom:3px;">'+emp.nome+'</div>'
      +'<div style="font-size:8.5px;color:rgba(201,168,76,0.25);font-family:\'Helvetica Neue\',Arial,sans-serif;">'+emp.end+' &mdash; '+emp.cidade+'</div>'
    +'</div>'
    +'<div style="text-align:right;font-family:\'Helvetica Neue\',Arial,sans-serif;">'
      +'<div style="font-size:10px;color:rgba(201,168,76,0.7);font-weight:600;letter-spacing:0.3px;">'+emp.tel+'</div>'
      +(emp.ig && emp.ig!=='undefined'?'<div style="font-size:8.5px;color:rgba(201,168,76,0.25);margin-top:2px;">'+emp.ig+'</div>':'')
      +(emp.cnpj && emp.cnpj!=='undefined'?'<div style="font-size:7.5px;color:rgba(255,255,255,0.1);margin-top:3px;">CNPJ: '+emp.cnpj+'</div>':'')
    +'</div>'
  +'</div>'

  // ══ BASE DOURADA ══
  +'<div style="height:3px;background:linear-gradient(90deg,#3a2200 0%,#C9A84C 30%,#EDD06A 50%,#C9A84C 70%,#3a2200 100%);"></div>'

  +'</div>';

  // ── Overlay ──
  var ov=document.createElement('div');
  ov.id='pdfOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:9999;display:flex;flex-direction:column;';

  var barEl=document.createElement('div');
  barEl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 13px;background:#0f0c00;border-bottom:1px solid rgba(201,168,76,.55);flex-shrink:0;flex-wrap:wrap;';
  barEl.innerHTML=''
    +'<span style="flex:1;font-size:.75rem;color:#C9A84C;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">&#128196; '+orcNum+' &mdash; '+q.cli+'</span>'
    +'<button id="pdfBtnClose" style="background:transparent;border:1px solid rgba(201,168,76,.35);color:rgba(201,168,76,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">&#x2715;</button>'
    +'<button id="pdfBtnDown" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">&#9203; Gerando...</button>'
    +(navigator.share?'<button id="pdfBtnShare" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">&#8599; Compartilhar</button>':'')
    +'<button id="pdfBtnPrint" style="background:#C9A84C;border:none;color:#000;padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">&#128424; Imprimir</button>';

  var preview=document.createElement('div');
  preview.style.cssText='flex:1;overflow-y:auto;background:#444;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
  preview.innerHTML='<div style="text-align:center;color:#C9A84C;padding:60px 20px;font-family:Outfit,sans-serif;font-size:.85rem;letter-spacing:.5px;">&#9203; Gerando PDF, aguarde...</div>';

  ov.appendChild(barEl);
  ov.appendChild(preview);
  document.body.appendChild(ov);

  document.getElementById('pdfBtnClose').onclick=function(){ov.remove();};
  document.getElementById('pdfBtnPrint').onclick=function(){
    var w=window.open('','_blank');
    if(w){
      w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{background:#fff;}</style></head><body>'+recHtml+'<script>window.onload=function(){window.print();};<\/script></body></html>');
      w.document.close();
    }
  };

  // ── Off-screen render ──
  var offscreen=document.createElement('div');
  offscreen.style.cssText='position:fixed;left:-9999px;top:0;width:700px;background:#fff;z-index:-1;';
  offscreen.innerHTML=recHtml;
  document.body.appendChild(offscreen);

  setTimeout(function(){
    html2canvas(offscreen.querySelector('#pdfReceipt'),{
      scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:700,windowWidth:700
    }).then(function(canvas){
      document.body.removeChild(offscreen);
      var jsPDF=window.jspdf.jsPDF;
      var pageW=595.28;
      var pageH=pageW*(canvas.height/canvas.width);
      var pdf=new jsPDF({orientation:'portrait',unit:'pt',format:[pageW,pageH]});
      pdf.addImage(canvas.toDataURL('image/jpeg',0.96),'JPEG',0,0,pageW,pageH);
      var pdfBlob=pdf.output('blob');

      var img=document.createElement('img');
      img.src=canvas.toDataURL('image/jpeg',0.88);
      img.style.cssText='width:100%;max-width:700px;display:block;box-shadow:0 4px 32px rgba(0,0,0,.6);';
      preview.innerHTML='';preview.appendChild(img);

      function enableBtn(id,label,cb){
        var b=document.getElementById(id);if(!b)return;
        b.innerHTML=label;b.disabled=false;
        b.style.color='#C9A84C';b.style.borderColor='rgba(201,168,76,.55)';b.style.background='#1e1800';
        b.onclick=cb;
      }

      enableBtn('pdfBtnDown','&#11015; Salvar PDF',function(){
        var url=URL.createObjectURL(pdfBlob);
        var a=document.createElement('a');
        a.href=url;a.download=fileName;
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(function(){URL.revokeObjectURL(url);},30000);
        toast('PDF salvo: '+fileName);
      });

      if(navigator.share){
        enableBtn('pdfBtnShare','&#8599; Compartilhar',function(){
          var pdfFile=new File([pdfBlob],fileName,{type:'application/pdf'});
          var sd={title:'Orcamento '+orcNum+' — '+q.cli,text:emp.nome+'\nR$ '+fm(q.vista)+' a vista'};
          if(navigator.canShare&&navigator.canShare({files:[pdfFile]}))sd.files=[pdfFile];
          navigator.share(sd).catch(function(){});
        });
      }

      toast('✓ PDF pronto — '+orcNum);
    }).catch(function(){
      if(document.body.contains(offscreen))document.body.removeChild(offscreen);
      preview.innerHTML='<div style="text-align:center;color:#c94444;padding:40px 20px;font-family:Outfit,sans-serif;font-size:.82rem;">Erro ao gerar. Use &#128424; Imprimir.</div>';
    });
  },200);
}
function salvarAgenda(){
  if(!pendQ)return;
  var last=lastEnd();
  var _dm=document.getElementById('diasMsg');
  var _di=document.getElementById('diasIn');
  var _dp=document.getElementById('diasPrev');
  if(_dm)_dm.textContent=(last?'Agenda ocupada até '+fd(last)+'. ':'')+'Quantos dias para entregar o serviço de '+pendQ.cli+'?';
  if(_di)_di.value='';
  if(_dp)_dp.classList.remove('on');
  showMd('diasMd');
}
function prevDias(){
  var d=+document.getElementById('diasIn').value;
  var p=document.getElementById('diasPrev');
  if(!p)return;
  if(!d){p.classList.remove('on');return;}
  var s=lastEnd()||td();
  p.textContent='Início: '+fd(s)+'\nEntrega prevista: '+fd(addD(s,d));
  p.classList.add('on');
}
function confirmarAgenda(){var d=+document.getElementById('diasIn').value;if(!d||!pendQ){toast('Informe os dias');return;}var s=lastEnd()||td(),end=addD(s,d),q=pendQ;var job={id:Date.now(),cli:q.cli,desc:q.tipo+' — '+q.mat,material:q.mat||'',tipo:q.tipo||'Serviço',start:s,end:end,value:q.vista,pago:0,obs:'',done:false,status:'agendado',qId:q.id,m2:q.m2||0,matPr:q.matPr||0,custoPedraEpoca:q.custoPedra||q.matCusto||0};DB.j.unshift(job);DB.sv();closeAll();updUrgDot();toast('✓ '+q.cli+' agendado para '+fd(end));}

// ══════════════════════════════════════════════════════════
// AGENDA — SISTEMA DE STATUS OPERACIONAL
// 🔵 agendado | 🟡 producao | 🟢 instalado | ⚫ finalizado | 🔴 atrasado
// ══════════════════════════════════════════════════════════

var JOB_STATUS = {
  agendado:  { emoji:'🔵', label:'Agendado',  cls:'js-agendado'  },
  producao:  { emoji:'🟡', label:'Produção',  cls:'js-producao'  },
  instalado: { emoji:'🟢', label:'Instalado', cls:'js-instalado' },
  finalizado:{ emoji:'⚫', label:'Finalizado', cls:'js-finalizado'},
  atrasado:  { emoji:'🔴', label:'Atrasado',  cls:'js-atrasado'  }
};

function jStatus(j) {
  if (j.status === 'finalizado') return 'finalizado';
  if (j.status === 'instalado')  return 'instalado';
  if (j.done) return 'finalizado';
  var d = j.end ? dDiff(j.end) : null;
  if (d !== null && d < 0) return 'atrasado';
  return j.status || 'agendado';
}

function openJobModal(id){
  editJobId=id;
  var el=document.getElementById('jobMdTitle');
  if(el) el.textContent=id?'Editar Serviço':'Novo Serviço';
  if(id){
    var j=DB.j.find(function(x){return x.id===id;});
    if(!j)return;
    document.getElementById('jCli').value=j.cli||'';
    document.getElementById('jMat').value=j.material||j.mat||'';
    document.getElementById('jTipo').value=j.tipo||j.desc||'';
    document.getElementById('jStart').value=j.start||td();
    document.getElementById('jDias').value='';
    document.getElementById('jObs').value=j.obs||'';
    var jSt=document.getElementById('jStatusSel');
    if(jSt)jSt.value=jStatus(j);
  } else {
    ['jCli','jMat','jTipo','jObs'].forEach(function(i){var el=document.getElementById(i);if(el)el.value='';});
    document.getElementById('jStart').value=td();
    document.getElementById('jDias').value='';
    var jSt=document.getElementById('jStatusSel');
    if(jSt)jSt.value='agendado';
  }
  var _jobDp=document.getElementById('jobDp');
  if(_jobDp)_jobDp.classList.remove('on');
  showMd('jobMd');
}
function prevJobDias(){
  var d=+document.getElementById('jDias').value;
  var s=document.getElementById('jStart').value;
  var p=document.getElementById('jobDp');
  if(!p)return;
  if(!d||!s){p.classList.remove('on');return;}
  p.textContent='Entrega: '+fd(addD(s,d));
  p.classList.add('on');
}
function saveJob(){
  var cli=(document.getElementById('jCli').value||'').trim();
  var mat=(document.getElementById('jMat').value||'').trim();
  var tipo=(document.getElementById('jTipo').value||'').trim();
  if(!cli){toast('Preencha o cliente');return;}
  var s=document.getElementById('jStart').value,d=+document.getElementById('jDias').value||0;
  var end=d?addD(s,d):'';
  var obs=(document.getElementById('jObs').value||'').trim();
  var statusEl=document.getElementById('jStatusSel');
  var status=statusEl?statusEl.value:'agendado';
  var desc=tipo+(mat?' — '+mat:'');
  if(editJobId){
    var j=DB.j.find(function(x){return x.id===editJobId;});
    if(j){j.cli=cli;j.material=mat;j.mat=mat;j.tipo=tipo;j.desc=desc;j.start=s;j.end=end;j.obs=obs;j.status=status;j.done=(status==='finalizado');DB.sv();}
  } else {
    DB.j.unshift({id:Date.now(),cli:cli,material:mat,mat:mat,tipo:tipo,desc:desc,start:s,end:end,value:0,pago:0,obs:obs,done:false,status:status});DB.sv();
  }
  renderAg();updUrgDot();closeAll();toast('✓ Salvo!');
}

function editJob(id){openJobModal(id);}

function togJob(id){
  var j=DB.j.find(function(x){return x.id===id;});
  if(!j)return;
  j.done=!j.done;
  j.status=j.done?'finalizado':'agendado';
  DB.sv();renderAg();updUrgDot();
  if(j.done){
    toast('✅ '+j.cli+' finalizado!');
    var r=j.value-(j.pago||0);
    if(r>0)setTimeout(function(){showCB(j.cli+' concluído! Recebeu R$ '+fm(r)+' da entrega?',function(){addTr('in','Entrega — '+j.cli,r);j.pago=j.value;DB.sv();renderAg();hideCB();toast('✓ Registrado!');},function(){hideCB();});},400);
  }
}

function pagRest(id){
  var j=DB.j.find(function(x){return x.id===id;});
  if(!j)return;
  var r=j.value-(j.pago||0);
  showCB('Registrar R$ '+fm(r)+' do '+j.cli+'?',function(){addTr('in','Pagamento — '+j.cli,r);j.pago=j.value;DB.sv();renderAg();hideCB();toast('✓ Registrado!');},function(){hideCB();});
}

function delJob(id){
  if(!confirm('Remover serviço?'))return;
  DB.j=DB.j.filter(function(j){return j.id!==id;});
  DB.sv();renderAg();updUrgDot();
}

function updUrgDot(){
  var u=DB.j.filter(function(j){var s=jStatus(j);return s==='atrasado';}).length;
  var _dot=document.getElementById('urgDot');
  if(_dot)_dot.classList.toggle('on',u>0);
}

// ══════════════════════════════════════════════════════════
// RENDER AGENDA — Cards limpos sem info financeira
// ══════════════════════════════════════════════════════════
function renderAg(){
  var groups = {atrasado:[],producao:[],agendado:[],instalado:[],finalizado:[]};
  DB.j.forEach(function(j){
    var s=jStatus(j);
    if(!groups[s])groups[s]=[];
    groups[s].push(j);
  });
  var order=['atrasado','producao','agendado','instalado','finalizado'];
  var labels={atrasado:'🔴 Atrasados',producao:'🟡 Em Produção',agendado:'🔵 Agendados',instalado:'🟢 Instalados',finalizado:'⚫ Finalizados'};
  var h='';
  order.forEach(function(s){
    var items=groups[s]||[];
    if(!items.length)return;
    var isFin=(s==='finalizado');
    h+='<div class="ag-sec-lbl ag-sec-'+s+'">'+labels[s]+'<span class="ag-sec-count">'+items.length+'</span></div>';
    var show=isFin?items.slice(0,5):items;
    show.forEach(function(j){h+=jCard(j);});
    if(isFin&&items.length>5)h+='<div class="ag-more">+mais '+(items.length-5)+' finalizados</div>';
  });
  if(!DB.j.length)h='<div class="ag-empty"><div style="font-size:2.2rem;margin-bottom:9px;">📅</div>Nenhum serviço ainda.<br><span style="font-size:.72rem;color:var(--t4);">Use o Fechamento de Venda ou + Novo Serviço</span></div>';
  var el=document.getElementById('agList');
  if(el)el.innerHTML=h;
}

function jCard(j){
  var s=jStatus(j);
  var si=JOB_STATUS[s]||JOB_STATUS.agendado;
  var d=j.end?dDiff(j.end):null;
  var prazoTxt='';
  if(d!==null){
    if(d<0) prazoTxt='<span class="jc-prazo atrasado">'+Math.abs(d)+'d em atraso</span>';
    else if(d===0) prazoTxt='<span class="jc-prazo atrasado">Entrega hoje!</span>';
    else prazoTxt='<span class="jc-prazo">'+d+'d para entrega</span>';
  }
  var mat=j.material||j.mat||'';
  var tipo=j.tipo||j.desc||'';
  return '<div class="jcard2 jcard2-'+s+'" data-openjob="'+j.id+'">'+
    '<div class="jc-status-bar">'+
    '<span class="jc-badge jc-badge-'+s+'">'+si.emoji+' '+si.label+'</span>'+
    (prazoTxt||'')+
    '</div>'+
    '<div class="jc-cli">'+j.cli+'</div>'+
    (mat?'<div class="jc-row"><span class="jc-lbl">Material</span><span class="jc-val">'+mat+'</span></div>':'')+
    (tipo?'<div class="jc-row"><span class="jc-lbl">Serviço</span><span class="jc-val">'+tipo+'</span></div>':'')+
    '<div class="jc-dates">'+
    (j.start?'<span>📅 '+fd(j.start)+'</span>':'')+
    (j.end?'<span>⏰ '+fd(j.end)+'</span>':'')+
    '</div>'+
    '</div>';
}

// ══════════════════════════════════════════════════════════
// MODAL DETALHE DO SERVIÇO
// ══════════════════════════════════════════════════════════
var _detailJobId = null;
var _detailTab   = 'financeiro';

function openJobDetail(id){
  _detailJobId=id;
  _detailTab='financeiro';
  renderJobDetail();
  showMd('jobDetailMd');
}

function closeJobDetail(){
  var el=document.getElementById('jobDetailMd');
  if(el)el.classList.remove('on');
}

function detailTab(tab){
  _detailTab=tab;
  renderJobDetail();
}

function renderJobDetail(){
  var j=DB.j.find(function(x){return x.id===_detailJobId;});
  if(!j)return;
  var s=jStatus(j);
  var si=JOB_STATUS[s]||JOB_STATUS.agendado;

  // Header
  var hdr=document.getElementById('jdHdr');
  if(hdr){
    hdr.innerHTML='<div class="jd-cli">'+j.cli+'</div>'+
      '<span class="jc-badge jc-badge-'+s+'">'+si.emoji+' '+si.label+'</span>';
  }

  // Tabs
  document.querySelectorAll('.jd-tab').forEach(function(el){
    el.classList.toggle('on',el.dataset.dtab===_detailTab);
  });

  // Body
  var body=document.getElementById('jdBody');
  if(!body)return;
  if(_detailTab==='financeiro') body.innerHTML=_jdFinanceiro(j);
  else if(_detailTab==='parcelas') body.innerHTML=_jdParcelas(j);
  else if(_detailTab==='status') body.innerHTML=_jdStatus(j);
  else if(_detailTab==='obs') body.innerHTML=_jdObs(j);
  else body.innerHTML='<div class="jd-placeholder">Em breve</div>';
}

function _jdFinanceiro(j){
  var rest=j.value-(j.pago||0);
  var h='<div class="jd-fin-grid">';
  h+='<div class="jd-fin-item"><div class="jd-fin-lbl">Valor Total</div><div class="jd-fin-val gold">R$ '+fm(j.value||0)+'</div></div>';
  h+='<div class="jd-fin-item"><div class="jd-fin-lbl">Entrada Paga</div><div class="jd-fin-val grn">R$ '+fm(j.pago||0)+'</div></div>';
  if(rest>0)h+='<div class="jd-fin-item"><div class="jd-fin-lbl">A Receber</div><div class="jd-fin-val red">R$ '+fm(rest)+'</div></div>';
  if(j.parc&&j.parc>1)h+='<div class="jd-fin-item"><div class="jd-fin-lbl">Parcelas</div><div class="jd-fin-val">'+j.parc+'x</div></div>';
  if(j.fpag)h+='<div class="jd-fin-item"><div class="jd-fin-lbl">Forma Pgto</div><div class="jd-fin-val">'+j.fpag+'</div></div>';
  h+='</div>';
  if(rest>0){
    h+='<button class="btn btn-g jd-receber-btn" data-pagrest="'+j.id+'">✅ Registrar recebimento</button>';
  }
  if(j.value&&j.value===j.pago){
    h+='<div class="jd-pago-ok">✅ Pagamento integral recebido</div>';
  }
  return h;
}

function _jdParcelas(j){
  var parcelas=DB.t.filter(function(t){return t.qid&&j.qid&&t.qid===j.qid;});
  if(!parcelas.length)return '<div class="jd-placeholder">Nenhuma parcela registrada</div>';
  var h='<div class="jd-parc-list">';
  parcelas.forEach(function(t){
    var isAtras=t.type==='pend'&&t.date&&t.date<td();
    h+='<div class="jd-parc-row'+(isAtras?' jd-parc-atras':'')+'">'+
      '<div class="jd-parc-desc">'+t.desc+'</div>'+
      '<div class="jd-parc-info">'+
      '<span class="jd-parc-dt">'+(t.date?fd(t.date):'')+'</span>'+
      '<span class="jd-parc-val '+(t.type==='in'?'grn':isAtras?'red':'yel')+'">R$ '+fm(t.value||0)+'</span>'+
      (isAtras?'<span class="fin-tag-atras">ATRASADO</span>':'')+
      (t.type==='pend'?'<button class="jd-rec-btn" data-recpend="'+t.id+'">✓</button>':'')+
      '</div></div>';
  });
  h+='</div>';
  return h;
}

function _jdStatus(j){
  var s=jStatus(j);
  var order=['agendado','producao','instalado','finalizado'];
  var h='<div class="jd-status-pick">';
  order.forEach(function(st){
    var si=JOB_STATUS[st];
    h+='<div class="jd-st-opt'+(s===st?' on':'')+'" data-setstatus="'+st+'">'+
      '<span class="jd-st-em">'+si.emoji+'</span>'+
      '<span class="jd-st-lbl">'+si.label+'</span>'+
      '</div>';
  });
  h+='</div>';
  h+='<div style="margin-top:14px;">';
  h+='<button class="btn btn-sm btn-o" data-editjob="'+j.id+'" style="width:100%;margin-bottom:8px;">✏️ Editar Serviço</button>';
  h+='<button class="btn btn-sm btn-red" data-deljob="'+j.id+'" style="width:100%;">🗑 Remover</button>';
  h+='</div>';
  return h;
}

function _jdObs(j){
  var h='<textarea class="jd-obs-area" id="jdObsTxt" rows="5" placeholder="Endereço, observações, detalhes do serviço...">'+escH(j.obs||'')+'</textarea>';
  h+='<button class="btn btn-g" id="btnSvObs" style="margin-top:8px;" onclick="saveJobObs()">Salvar Obs.</button>';
  return h;
}

function saveJobObs(){
  var j=DB.j.find(function(x){return x.id===_detailJobId;});
  if(!j)return;
  var el=document.getElementById('jdObsTxt');
  if(el){j.obs=el.value.trim();DB.sv();toast('✓ Observação salva!');}
}

function setJobStatus(id,status){
  var j=DB.j.find(function(x){return x.id===id;});
  if(!j)return;
  j.status=status;
  j.done=(status==='finalizado');
  DB.sv();renderAg();updUrgDot();renderJobDetail();toast('✓ Status: '+JOB_STATUS[status].label);
}
// ══════════════════════════════════════════════════════════════
// BANCO DE CLIENTES + CONSULTOR DE DESCONTO INTELIGENTE
// ══════════════════════════════════════════════════════════════

// ── Banco de dados (localStorage separado) ──
var CLDB = {
  _k: 'hr_clientes',
  get: function(){ try{ return JSON.parse(localStorage.getItem(this._k)||'[]'); }catch(e){ return []; } },
  sv: function(l){ localStorage.setItem(this._k, JSON.stringify(l)); },
  add: function(c){ var l=this.get(); c.id=Date.now(); c.em=td(); l.unshift(c); this.sv(l); return c; },
  upd: function(id,d){ var l=this.get(),i=l.findIndex(function(c){return c.id===id;}); if(i<0)return; Object.assign(l[i],d); l[i].em=td(); this.sv(l); },
  del: function(id){ this.sv(this.get().filter(function(c){return c.id!==id;})); }
};

// ── Normalização e busca fuzzy ──
function _cliNorm(s){
  return (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'').trim();
}
function _cliSim(a,b){
  a=_cliNorm(a); b=_cliNorm(b);
  if(!a||!b) return 0;
  if(a===b) return 100;
  if(b.indexOf(a)!==-1||a.indexOf(b)!==-1) return 90;
  var wa=a.split(' ').filter(function(w){return w.length>2;}),wb=b.split(' ').filter(Boolean),m=0;
  wa.forEach(function(w){ if(wb.some(function(x){return x.indexOf(w)!==-1||w.indexOf(x)!==-1;})) m++; });
  if(m) return Math.min(85, 50+m*15);
  return 0;
}
function _cliBuscar(q,thr){
  thr=thr||35; if(!q||q.length<2) return [];
  var r=[];
  // Contagem de orçamentos por cliente para boost de frequência
  var freqMap={};
  (DB.q||[]).forEach(function(oq){if(oq.cli) freqMap[oq.cli]=(freqMap[oq.cli]||0)+1;});
  CLDB.get().forEach(function(c){
    var s=_cliSim(q,c.nome);
    if(s>=thr){
      // Boost: até +15 pontos por frequência de uso (max 10 orçamentos)
      var freq=freqMap[c.nome]||0;
      var boost=Math.min(15,freq*2);
      r.push({c:c,s:Math.min(100,s+boost)});
    }
  });
  // Também buscar por telefone se q parece número
  if(/^\d{4,}/.test(q)){
    CLDB.get().forEach(function(c){
      if(c.tel&&c.tel.replace(/\D/g,'').indexOf(q.replace(/\D/g,''))!==-1){
        if(!r.find(function(x){return x.c.id===c.id;})) r.push({c:c,s:85});
      }
    });
  }
  return r.sort(function(a,b){return b.s-a.s;}).slice(0,6);
}

// ── Histórico do cliente ──
function _cliHist(nome){
  var orcs  = (DB.q||[]).filter(function(q){ return _cliSim(nome,q.cli)>=70; });
  var jobs  = (DB.j||[]).filter(function(j){ return _cliSim(nome,j.cli)>=70; });
  var rec   = (DB.t||[]).filter(function(t){ return t.type==='in'&&t.desc&&_cliNorm(t.desc).indexOf(_cliNorm(nome))!==-1; });
  var fat   = Math.max(
    rec.reduce(function(s,t){return s+(t.value||0);},0),
    jobs.reduce(function(s,j){return s+(j.value||0);},0)
  );
  var conv  = orcs.length>0?Math.round((jobs.length/orcs.length)*100):0;
  var cat,icon,cor,bonus;
  if(jobs.length>=5||fat>=20000){cat='VIP';icon='⭐';cor='#C9A84C';bonus=4;}
  else if(jobs.length>=2||fat>=5000){cat='Fiel';icon='🤝';cor='#5dbf7a';bonus=2;}
  else if(orcs.length>=3&&jobs.length===0){cat='Prospect';icon='👀';cor='#d4a017';bonus=-1;}
  else if(orcs.length===0){cat='Novo';icon='🆕';cor='#6ab0ff';bonus=0;}
  else{cat='Regular';icon='👤';cor='#a0a0b0';bonus=1;}
  return {orcs:orcs.length,jobs:jobs.length,fat:fat,conv:conv,cat:cat,icon:icon,cor:cor,bonus:bonus,ultOrc:orcs.length?orcs[0].date:null};
}

// ── Análise financeira ──
function _cliFin(){
  var m=window._finMetrics;
  var hoje=td(), mes=hoje.slice(0,7);
  var recMes=m?m.recebidoMes:((DB.t||[]).filter(function(t){return t.type==='in'&&(t.date||'').slice(0,7)===mes;}).reduce(function(s,t){return s+(t.value||0);},0));
  var pend  =m?m.totalPendente:((DB.t||[]).filter(function(t){return t.type==='pend';}).reduce(function(s,t){return s+(t.value||0);},0));
  var saldo =m?m.saldoReal:(recMes-((DB.t||[]).filter(function(t){return t.type==='out'&&(t.date||'').slice(0,7)===mes;}).reduce(function(s,t){return s+(t.value||0);},0)));
  var fixos =((CFG&&CFG.fixos)||[]).reduce(function(s,f){return s+(f.v||0);},0);
  var vars  =((CFG&&CFG.variaveis)||[]).reduce(function(s,f){return s+(f.v||0);},0);
  var custos=fixos+vars;
  var nivel,txt,cor,maxD;
  if(custos===0){
    if(saldo>5000){nivel=3;txt='Ótimo';cor='#5dbf7a';maxD=6;}
    else if(saldo>0){nivel=2;txt='Estável';cor='#5dbf7a';maxD=4;}
    else if(saldo>-2000){nivel=1;txt='Apertado';cor='#d4a017';maxD=1;}
    else{nivel=0;txt='Crítico';cor='#c94444';maxD=0;}
  } else {
    var cob=(recMes+pend)/custos;
    if(recMes>=custos*1.4){nivel=3;txt='Ótimo';cor='#5dbf7a';maxD=7;}
    else if(recMes>=custos*1.1){nivel=2;txt='Estável';cor='#5dbf7a';maxD=4;}
    else if(cob>=1){nivel=1;txt='Apertado';cor='#d4a017';maxD=2;}
    else{nivel=0;txt='Crítico';cor='#c94444';maxD=0;}
  }
  return {nivel:nivel,txt:txt,cor:cor,maxD:maxD,recMes:recMes,saldo:saldo,custos:custos};
}

// ── Injetar + renderizar painel do consultor ──
function _cliMostrarConsultor(q){
  // Criar seção se não existir
  if(!document.getElementById('cliDescontoPanel')){
    var resArea=document.getElementById('resArea');
    if(!resArea) return;
    var ref=document.getElementById('painelInterno');
    var secRef=ref?ref.closest('.sec'):null;
    var sec=document.createElement('div');
    sec.className='sec mt';
    sec.innerHTML='<div class="sl" style="display:flex;justify-content:space-between;align-items:center;">'
      +'<span>🧠 Consultor de Desconto</span>'
      +'<span style="font-size:.6rem;color:var(--t4);font-weight:400;">Análise inteligente</span>'
      +'</div>'
      +'<div id="cliDescontoPanel" style="background:var(--s1);border:1px solid var(--bd);border-radius:14px;overflow:hidden;"></div>';
    if(secRef&&secRef.nextSibling) resArea.insertBefore(sec,secRef.nextSibling);
    else resArea.appendChild(sec);
  }
  _cliRenderConsultor(q);
}

// ── Consultor de Desconto — despacha para IA (Groq) ou fallback local ──
function _cliRenderConsultor(q){
  var key=CFG&&CFG.emp&&CFG.emp.apiKey;
  if(key){
    _cliConsultorLoading();
    _cliFetchAIDesc(q);
  } else {
    _cliConsultorDraw(q,null);
  }
}

function _cliConsultorLoading(){
  var el=document.getElementById('cliDescontoPanel'); if(!el) return;
  el.innerHTML='<div style="padding:22px 18px;display:flex;align-items:center;gap:12px;">'
    +'<span style="font-size:1.4rem;animation:sec2Pulse 1.6s infinite;">🧠</span>'
    +'<div>'
    +'<div style="font-size:.82rem;font-weight:700;color:var(--gold2);">Consultando IA...</div>'
    +'<div style="font-size:.62rem;color:var(--t4);margin-top:2px;">Groq · llama-3.3-70b-versatile</div>'
    +'</div></div>';
}

function _cliFetchAIDesc(q){
  var key=CFG&&CFG.emp&&CFG.emp.apiKey; if(!key) return;
  var nome=q?q.cli:'';
  var valor=q?q.vista:0;
  var fin=_cliFin();
  var hist=nome?_cliHist(nome):null;
  var maxDlocal=Math.max(0,fin.maxD+(hist?hist.bonus:0));

  var clienteInfo=hist&&nome
    ?nome+' — '+hist.orcs+' orçamentos, '+hist.jobs+' serviços, R$ '+fm(hist.fat)+' faturados, conversão '+hist.conv+'%, perfil: '+hist.cat
    :'Novo cliente sem histórico anterior';

  var finInfo='Estado: '+fin.txt
    +' | Faturado no mês: R$ '+fm(fin.recMes)
    +(fin.custos>0?' | Custos fixos: R$ '+fm(fin.custos)+'/mês':'')
    +' | Saldo projetado: R$ '+fm(fin.saldo);

  var prompt='Você é consultor financeiro de uma marmoraria brasileira chamada HR Mármores.\n'
    +'Orçamento a vista: R$ '+fm(valor)+'\n'
    +'Cliente: '+clienteInfo+'\n'
    +'Finanças do mês: '+finInfo+'\n'
    +'Cálculo automático local sugeriu desconto máximo de '+maxDlocal+'%.\n\n'
    +'Com base nesses dados reais, defina a estratégia de desconto mais inteligente.\n'
    +'Responda SOMENTE JSON sem markdown:\n'
    +'{"maxDesconto":number_0_a_15,"veredicto":"frase imperativa curta","motivo":"1-2 frases com números reais do contexto","tacticaNegociacao":"1 frase de tática de fechamento","nivel":"otimo|bom|atencao|critico"}';

  var controller=window.AbortController?new AbortController():null;
  var tid=controller?setTimeout(function(){controller.abort();},18000):null;

  fetch('https://api.groq.com/openai/v1/chat/completions',{
    method:'POST',
    signal:controller?controller.signal:undefined,
    headers:{'Content-Type':'application/json','Authorization':'Bearer '+key},
    body:JSON.stringify({
      model:'llama-3.3-70b-versatile',
      max_tokens:350,
      messages:[
        {role:'system',content:'Você é consultor financeiro de marmoraria. Responda SOMENTE JSON válido, sem markdown, sem texto fora do JSON.'},
        {role:'user',content:prompt}
      ]
    })
  })
  .then(function(r){
    if(tid) clearTimeout(tid);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return r.json();
  })
  .then(function(d){
    var text=(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'';
    var clean=text.replace(/```json[\s\S]*?```|```/g,'').trim();
    var match=clean.match(/\{[\s\S]*\}/);
    if(!match) throw new Error('no_json');
    var ai=JSON.parse(match[0]);
    _cliConsultorDraw(q,ai);
  })
  .catch(function(e){
    if(tid) clearTimeout(tid);
    console.warn('_cliFetchAIDesc fallback local:',e.message);
    _cliConsultorDraw(q,null);
  });
}

function _cliConsultorDraw(q,ai){
  var el=document.getElementById('cliDescontoPanel'); if(!el) return;
  var nome=q?q.cli:(document.getElementById('oCliente')?document.getElementById('oCliente').value.trim():'');
  var fin=_cliFin();
  var hist=nome?_cliHist(nome):null;
  var maxDlocal=Math.max(0,fin.maxD+(hist?hist.bonus:0));
  var maxD=ai?Math.max(0,Math.round(+(ai.maxDesconto)||0)):maxDlocal;
  var valor=q?q.vista:0;
  var econ=valor>0?Math.round(valor*(maxD/100)):0;

  var NIVEL_COR ={otimo:'#5dbf7a',bom:'#5dbf7a',atencao:'#d4a017',critico:'#c94444'};
  var NIVEL_BG  ={otimo:'rgba(93,191,122,.10)',bom:'rgba(93,191,122,.07)',atencao:'rgba(212,160,23,.07)',critico:'rgba(201,68,68,.07)'};
  var NIVEL_ICON={otimo:'🎁',bom:'✅',atencao:'⚠️',critico:'🚫'};
  var nivel_key=ai&&ai.nivel&&NIVEL_COR[ai.nivel]?ai.nivel:(maxD===0?'critico':maxD<=2?'atencao':maxD<=5?'bom':'otimo');
  var vercor=NIVEL_COR[nivel_key];
  var verbg=NIVEL_BG[nivel_key];
  var vericon=NIVEL_ICON[nivel_key];
  var vertxt=ai?ai.veredicto:(maxD===0?'Não dê desconto agora':maxD<=2?'Desconto pequeno possível':maxD<=5?'Desconto moderado OK':'Pode oferecer bom desconto');
  var fonte=ai?'IA · Groq':'cálculo local';

  var h='<div style="padding:14px 14px 12px;">';

  // Badge fonte
  h+='<div style="text-align:right;margin-bottom:6px;">'
    +'<span style="font-size:.56rem;background:'+(ai?'rgba(93,191,122,.12)':'rgba(255,255,255,.05)')+';border:1px solid '+(ai?'rgba(93,191,122,.3)':'var(--bd2)')+';border-radius:6px;padding:2px 7px;color:'+(ai?'#5dbf7a':'var(--t4)')+';font-weight:600;">'+fonte+'</span>'
    +'</div>';

  // Veredicto
  h+='<div style="display:flex;align-items:center;gap:10px;margin-bottom:'+(ai&&ai.motivo?'6':'12')+'px;">';
  h+='<span style="font-size:1.4rem;">'+vericon+'</span>';
  h+='<div><div style="font-size:.85rem;font-weight:700;color:'+vercor+';">'+vertxt+'</div>';
  if(!ai) h+='<div style="font-size:.62rem;color:var(--t3);margin-top:2px;">Finanças do mês + histórico do cliente</div>';
  h+='</div></div>';

  // Motivo da IA
  if(ai&&ai.motivo){
    h+='<div style="font-size:.68rem;color:var(--t2);margin-bottom:12px;line-height:1.5;padding:8px 10px;background:rgba(255,255,255,.03);border-left:2px solid '+vercor+';border-radius:0 8px 8px 0;">'+ai.motivo+'</div>';
  }

  // Box desconto máximo
  h+='<div style="background:'+verbg+';border:1px solid '+vercor+'33;border-radius:12px;padding:12px 14px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">';
  h+='<div><div style="font-size:.6rem;color:var(--t3);margin-bottom:3px;">MÁXIMO RECOMENDADO</div>';
  h+='<div style="font-size:2rem;font-weight:800;color:'+vercor+';line-height:1;">'+maxD+'%</div>';
  if(valor>0&&maxD>0) h+='<div style="font-size:.64rem;color:var(--t3);margin-top:4px;">Cliente paga R$ '+fm(valor-econ)+' (−R$ '+fm(econ)+')</div>';
  else if(valor>0&&maxD===0) h+='<div style="font-size:.64rem;color:var(--t3);margin-top:4px;">Mantenha R$ '+fm(valor)+'</div>';
  h+='</div>';
  h+='<span style="font-size:2rem;">'+(nivel_key==='critico'?'🔴':nivel_key==='atencao'?'🟡':'🟢')+'</span></div>';

  // Grid finanças + cliente
  h+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">';
  h+='<div style="background:var(--s2);border-radius:10px;padding:10px 11px;">';
  h+='<div style="font-size:.58rem;color:var(--t3);font-weight:700;letter-spacing:.5px;margin-bottom:6px;">💰 FINANÇAS DO MÊS</div>';
  h+='<div style="font-size:.75rem;font-weight:700;color:'+fin.cor+';\">'+(fin.nivel===3?'🟢':fin.nivel===2?'🟢':fin.nivel===1?'🟡':'🔴')+' '+fin.txt+'</div>';
  if(fin.custos>0) h+='<div style="font-size:.62rem;color:var(--t3);margin-top:4px;">Faturado: R$ '+fm(fin.recMes)+'<br>Custos: R$ '+fm(fin.custos)+'/mês</div>';
  else h+='<div style="font-size:.62rem;color:var(--t3);margin-top:4px;">Saldo: R$ '+fm(fin.saldo)+'<br><span style="color:var(--t4);">Cadastre custos p/ análise precisa</span></div>';
  h+='<div style="font-size:.6rem;color:'+fin.cor+';margin-top:5px;font-weight:600;">Permite até '+fin.maxD+'%</div>';
  h+='</div>';
  h+='<div style="background:var(--s2);border-radius:10px;padding:10px 11px;">';
  h+='<div style="font-size:.58rem;color:var(--t3);font-weight:700;letter-spacing:.5px;margin-bottom:6px;">👤 HISTÓRICO CLIENTE</div>';
  if(hist&&nome){
    h+='<div style="font-size:.75rem;font-weight:700;color:'+hist.cor+';">'+hist.icon+' '+hist.cat+'</div>';
    h+='<div style="font-size:.62rem;color:var(--t3);margin-top:4px;">'+hist.orcs+' orç · '+hist.jobs+' serviços';
    if(hist.fat>0) h+=' · R$ '+fm(hist.fat);
    h+='</div>';
    if(hist.orcs>0) h+='<div style="font-size:.62rem;color:var(--t3);">Conversão: '+hist.conv+'%</div>';
    var btxt=hist.bonus>0?'+'+hist.bonus+'% bônus':hist.bonus<0?hist.bonus+'% risco':'neutro';
    h+='<div style="font-size:.6rem;color:'+(hist.bonus>0?'#5dbf7a':hist.bonus<0?'#c94444':'var(--t3)')+';margin-top:5px;font-weight:600;">'+btxt+'</div>';
  } else {
    h+='<div style="font-size:.75rem;font-weight:700;color:#6ab0ff;">🆕 Novo</div>';
    h+='<div style="font-size:.62rem;color:var(--t3);margin-top:4px;">Sem histórico</div>';
  }
  h+='</div></div>';

  // Botões de aplicação rápida
  if(maxD>0&&valor>0){
    var opts=[1,2,3,5,7,10].filter(function(p){return p<=maxD;});
    h+='<div style="font-size:.62rem;color:var(--t3);margin-bottom:5px;">Aplicar desconto:</div>';
    h+='<div style="display:flex;gap:6px;flex-wrap:wrap;">';
    opts.forEach(function(p){
      var e=Math.round(valor*(p/100));
      h+='<button onclick="cliAplicarDesc('+p+')" style="flex:1;min-width:52px;padding:8px 4px;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;cursor:pointer;font-family:Outfit;">';
      h+='<div style="font-size:.78rem;font-weight:700;color:#5dbf7a;">'+p+'%</div>';
      h+='<div style="font-size:.58rem;color:var(--t3);">−R$ '+fm(e)+'</div></button>';
    });
    h+='</div>';
    h+='<div style="font-size:.58rem;color:var(--t4);margin-top:5px;">Toque no % para aplicar no campo de desconto acima ↑</div>';
  }

  // Tática de negociação (exclusivo da IA)
  if(ai&&ai.tacticaNegociacao){
    h+='<div style="margin-top:10px;padding:9px 11px;background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.2);border-radius:10px;">';
    h+='<div style="font-size:.58rem;color:#60a5fa;font-weight:700;letter-spacing:.5px;margin-bottom:3px;">💬 TÁTICA DE FECHAMENTO</div>';
    h+='<div style="font-size:.69rem;color:var(--t2);line-height:1.4;">'+ai.tacticaNegociacao+'</div>';
    h+='</div>';
  }

  h+='</div>';
  el.innerHTML=h;
}


function cliAplicarDesc(pct){
  if(typeof setVistaMode==='function'){
    setVistaMode('pct');
    var el=document.getElementById('vistaDiscPct');
    if(el){ el.value=pct; if(typeof aplicarVistaAdj==='function') aplicarVistaAdj(); }
    var sec=document.getElementById('vistaAdjSec');
    if(sec) sec.scrollIntoView({behavior:'smooth',block:'start'});
  }
  toast('✓ '+pct+'% de desconto aplicado');
}

// ── Auto-save cliente após gerar orçamento ──
function _cliAutoSave(nome,tel,cidade,end){
  if(!nome) return;
  var existente=_cliBuscar(nome,80);
  if(existente.length>0){
    var c=existente[0].c, upd={};
    if(tel&&!c.tel) upd.tel=tel;
    if(cidade&&!c.cidade) upd.cidade=cidade;
    if(end&&!c.end) upd.end=end;
    if(Object.keys(upd).length) CLDB.upd(c.id,upd);
    return;
  }
  setTimeout(function(){
    showCB('Salvar "'+nome+'" no banco de clientes?',
      function(){ CLDB.add({nome:nome,tel:tel||'',cidade:cidade||'',end:end||'',obs:''}); hideCB(); toast('✓ '+nome+' salvo!'); },
      function(){ hideCB(); }
    );
  },1200);
}

// ── Autocomplete ──
(function _cliInitAC(){
  function init(){
    var inp=document.getElementById('oCliente'); if(!inp) return;
    var timer=null;
    inp.addEventListener('input',function(){
      clearTimeout(timer);
      timer=setTimeout(function(){ _cliACRender(inp.value.trim()); },180);
    });
    inp.addEventListener('keydown',function(e){
      if(e.key==='Escape') _cliACFechar();
      if(e.key==='ArrowDown'){ e.preventDefault(); var f=document.querySelector('#cliACDrop .cliaci'); if(f) f.focus(); }
    });
    inp.addEventListener('blur',function(){ setTimeout(_cliACFechar,300); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();

function _cliACRender(q){
  var dd=document.getElementById('cliACDrop'); if(!dd) return;
  if(!q||q.length<2){dd.style.display='none';return;}
  var res=_cliBuscar(q,35); if(!res.length){dd.style.display='none';return;}
  var h='';
  res.forEach(function(r){
    var c=r.c, hist=_cliHist(c.nome);
    // Último orçamento para pré-visualização de pedra
    var ultOrc=(DB.q||[]).find(function(oq){return oq.cli&&oq.cli.toLowerCase()===c.nome.toLowerCase();});
    var pedraThumb='';
    if(ultOrc&&ultOrc.mat){
      var pedra=(typeof CFG!=='undefined'&&CFG.stones)?CFG.stones.find(function(s){return s.nm===ultOrc.mat;}):null;
      if(pedra&&pedra.photo){
        pedraThumb='<img src="'+pedra.photo+'" style="width:34px;height:34px;border-radius:8px;object-fit:cover;flex-shrink:0;" onerror="this.style.display=\'none\'">';
      }
    }
    h+='<div class="cliaci" tabindex="0" onclick="cliACSelecionar('+c.id+')" onkeydown="if(event.key===\'Enter\')cliACSelecionar('+c.id+')" '
      +'style="padding:10px 13px;cursor:pointer;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;">';
    // Avatar com inicial colorida
    h+='<div style="width:34px;height:34px;border-radius:50%;background:'+hist.cor+'22;border:1.5px solid '+hist.cor+'44;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.9rem;font-weight:800;color:'+hist.cor+';">'+(c.nome?c.nome[0].toUpperCase():'?')+'</div>';
    h+='<div style="flex:1;min-width:0;">';
    h+='<div style="font-size:.83rem;font-weight:700;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+c.nome+'</div>';
    var sub=[]; if(c.tel) sub.push('📱 '+c.tel); if(c.cidade) sub.push('📍 '+c.cidade);
    if(sub.length) h+='<div style="font-size:.65rem;color:var(--t3);margin-top:1px;">'+sub.join(' · ')+'</div>';
    // Linha de status: categoria + histórico + última pedra
    var statLine=hist.icon+' <b style="color:'+hist.cor+'">'+hist.cat+'</b>';
    if(hist.orcs) statLine+=' · '+hist.orcs+' orç.';
    if(hist.jobs) statLine+=' · '+hist.jobs+' serv.';
    if(hist.fat>0) statLine+=' · R$ '+fm(hist.fat);
    if(ultOrc&&ultOrc.mat) statLine+=' · 🪨 '+ultOrc.mat;
    h+='<div style="font-size:.6rem;color:var(--t4);margin-top:2px;">'+statLine+'</div>';
    h+='</div>';
    if(pedraThumb) h+=pedraThumb;
    h+='</div>';
  });
  // Recentes do localStorage
  var _recentes=[];
  try{_recentes=JSON.parse(localStorage.getItem('hr_cli_recentes')||'[]');}catch(e){}
  if(_recentes.length&&!q){
    h+='<div style="padding:5px 13px 3px;font-size:.6rem;color:var(--t4);letter-spacing:1px;text-transform:uppercase;">Recentes</div>';
    _recentes.slice(0,3).forEach(function(nm){
      h+='<div onclick="document.getElementById(\'oCliente\').value=\''+escH(nm)+'\';_cliACFechar();document.getElementById(\'oCliente\').dispatchEvent(new Event(\'input\',{bubbles:true}));" style="padding:7px 13px;cursor:pointer;border-bottom:1px solid var(--bd2);font-size:.76rem;color:var(--t2);">⏱ '+escH(nm)+'</div>';
    });
  }
  h+='<div onclick="cliAbrirNovo()" style="padding:9px 13px;cursor:pointer;font-size:.72rem;color:var(--gold2);display:flex;align-items:center;gap:7px;"><span>➕</span><span>Adicionar "'+q+'" como novo cliente</span></div>';
  dd.innerHTML=h; dd.style.display='block';
}
function cliACSelecionar(id){
  var c=CLDB.get().find(function(x){return x.id===id;}); if(!c) return;
  var map={oCliente:c.nome,oTel:c.tel||'',oCidade:c.cidade||'',oEnd:c.end||''};
  Object.keys(map).forEach(function(k){var el=document.getElementById(k);if(el){el.value=map[k];el.dispatchEvent(new Event('input',{bubbles:true}));}});
  _cliACFechar();
  // Salvar em recentes
  try{
    var rec=JSON.parse(localStorage.getItem('hr_cli_recentes')||'[]');
    rec=rec.filter(function(n){return n!==c.nome;});
    rec.unshift(c.nome);
    localStorage.setItem('hr_cli_recentes',JSON.stringify(rec.slice(0,5)));
  }catch(e){}
  // Pré-selecionar a última pedra usada por este cliente
  var ultOrc=(DB.q||[]).find(function(q){return q.cli&&q.cli.toLowerCase()===c.nome.toLowerCase()&&q.ambSnap;});
  if(ultOrc&&ultOrc.ambSnap&&ultOrc.ambSnap[0]&&ultOrc.ambSnap[0].selMat){
    var matId=ultOrc.ambSnap[0].selMat;
    // Aplicar ao primeiro ambiente se o mat existir
    if(ambientes&&ambientes.length&&typeof renderAmbientes==='function'){
      ambientes[0].selMat=matId;
      setTimeout(renderAmbientes,50);
    }
  }
  var hist=_cliHist(c.nome);
  // Toast com histórico completo
  var toastMsg=hist.icon+' '+c.nome+' — '+hist.cat;
  if(hist.orcs>0) toastMsg+=' ('+hist.orcs+' orç.)';
  if(hist.fat>0) toastMsg+=' · R$ '+fm(hist.fat);
  toast(toastMsg);
}
function _cliACFechar(){var dd=document.getElementById('cliACDrop');if(dd)dd.style.display='none';}

// ── Modal: gestão de clientes ──
function abrirGestaoClientes(){
  renderListaClientes('');
  var inp=document.getElementById('cliBuscaInp'); if(inp) inp.value='';
  showMd('cliGestaoMd');
}
function renderListaClientes(q){
  var el=document.getElementById('cliLista'); if(!el) return;
  var list=CLDB.get();
  var fil=q?list.filter(function(c){return _cliSim(q,c.nome)>=30;}):list;
  if(!fil.length){
    el.innerHTML='<div style="text-align:center;padding:30px 20px;color:var(--t3);font-size:.78rem;">'+(q?'Nenhum cliente encontrado.':'Nenhum cliente cadastrado.<br>Clique em "+ Novo" para adicionar.')+'</div>';
    return;
  }
  var h='';
  fil.forEach(function(c){
    var hist=_cliHist(c.nome);
    h+='<div style="padding:11px 16px;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:12px;cursor:pointer;" onclick="cliAbrirEditar('+c.id+')">';
    h+='<div style="width:38px;height:38px;border-radius:50%;background:var(--s3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:1rem;font-weight:700;color:'+hist.cor+';">'+(c.nome?c.nome[0].toUpperCase():'?')+'</div>';
    h+='<div style="flex:1;min-width:0;">';
    h+='<div style="font-size:.83rem;font-weight:700;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+c.nome+'</div>';
    var sub=[]; if(c.tel) sub.push(c.tel); if(c.cidade) sub.push(c.cidade);
    if(sub.length) h+='<div style="font-size:.68rem;color:var(--t3);">'+sub.join(' · ')+'</div>';
    h+='</div>';
    h+='<div style="text-align:right;flex-shrink:0;">';
    h+='<div style="font-size:.7rem;font-weight:700;color:'+hist.cor+';">'+hist.icon+' '+hist.cat+'</div>';
    if(hist.fat>0) h+='<div style="font-size:.62rem;color:var(--t3);">R$ '+fm(hist.fat)+'</div>';
    else if(hist.orcs>0) h+='<div style="font-size:.62rem;color:var(--t3);">'+hist.orcs+' orç.</div>';
    h+='</div></div>';
  });
  el.innerHTML=h;
}
function cliAbrirNovo(){
  var nome=document.getElementById('oCliente')?document.getElementById('oCliente').value.trim():'';
  _cliAbrirForm(null,nome);
}
function cliAbrirEditar(id){
  var c=CLDB.get().find(function(x){return x.id===id;}); if(!c) return;
  _cliAbrirForm(c,'');
}
function _cliAbrirForm(cli,def){
  var md=document.getElementById('cliFormMd'); if(!md) return;
  var edit=!!cli, hist=edit?_cliHist(cli.nome):null;
  var h='<div style="background:var(--s1);border-top:1px solid var(--bd);border-radius:20px 20px 0 0;width:100%;max-width:460px;padding:22px 20px 40px;" onclick="event.stopPropagation()">';
  h+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">';
  h+='<div style="font-size:1rem;font-weight:700;color:var(--gold2);">'+(edit?'Editar Cliente':'Novo Cliente')+'</div>';
  h+='<button onclick="closeAll()" style="padding:6px 11px;background:var(--s3);color:var(--t2);border:none;border-radius:8px;font-family:Outfit;font-size:.74rem;cursor:pointer;">✕</button>';
  h+='</div>';
  if(edit&&hist){
    h+='<div style="background:var(--s2);border-radius:10px;padding:10px 13px;margin-bottom:14px;display:flex;align-items:center;gap:10px;">';
    h+='<div style="width:38px;height:38px;border-radius:50%;background:var(--s3);display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:'+hist.cor+';">'+(cli.nome?cli.nome[0].toUpperCase():'?')+'</div>';
    h+='<div><div style="font-size:.78rem;font-weight:700;color:'+hist.cor+';">'+hist.icon+' '+hist.cat+'</div>';
    h+='<div style="font-size:.65rem;color:var(--t3);">'+hist.orcs+' orçamentos · '+hist.jobs+' serviços'+(hist.fat>0?' · R$ '+fm(hist.fat)+' faturados':'')+'</div>';
    h+='</div></div>';
  }
  var campos=[
    {id:'cfNome',l:'Nome completo *',v:cli?cli.nome:def,t:'text'},
    {id:'cfTel', l:'WhatsApp / Telefone',v:cli?cli.tel:'',t:'tel'},
    {id:'cfCid', l:'Cidade',v:cli?cli.cidade:'',t:'text'},
    {id:'cfEnd', l:'Endereço / Bairro',v:cli?cli.end:'',t:'text'},
    {id:'cfObs', l:'Observações',v:cli?cli.obs:'',t:'text'}
  ];
  campos.forEach(function(c){
    h+='<div style="margin-bottom:10px;">';
    h+='<div style="font-size:.65rem;color:var(--t3);margin-bottom:4px;">'+c.l+'</div>';
    h+='<input id="'+c.id+'" type="'+c.t+'" value="'+(c.v||'').replace(/"/g,'&quot;')+'" style="width:100%;padding:10px 12px;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;color:var(--tx);font-family:Outfit;font-size:.84rem;box-sizing:border-box;outline:none;">';
    h+='</div>';
  });
  h+='<div style="display:flex;gap:8px;margin-top:18px;">';
  h+='<button onclick="cliSalvarForm('+(edit?cli.id:'null')+')" style="flex:1;padding:12px;background:var(--gold2);color:#000;border:none;border-radius:10px;font-family:Outfit;font-size:.84rem;font-weight:700;cursor:pointer;">'+(edit?'Salvar':'Adicionar')+'</button>';
  if(edit) h+='<button onclick="cliExcluir('+cli.id+')" style="padding:12px 14px;background:rgba(201,68,68,.15);color:#c94444;border:1px solid rgba(201,68,68,.3);border-radius:10px;font-family:Outfit;font-size:.84rem;cursor:pointer;">🗑️</button>';
  h+='</div>';
  h+='</div>';
  md.innerHTML=h;
  showMd('cliFormMd');
}
function cliSalvarForm(id){
  var nome=document.getElementById('cfNome')?document.getElementById('cfNome').value.trim():'';
  if(!nome){toast('Informe o nome do cliente');return;}
  var d={nome:nome,tel:document.getElementById('cfTel').value.trim(),cidade:document.getElementById('cfCid').value.trim(),end:document.getElementById('cfEnd').value.trim(),obs:document.getElementById('cfObs').value.trim()};
  if(id){CLDB.upd(id,d);toast('✓ Cliente atualizado!');}
  else{CLDB.add(d);toast('✓ '+nome+' adicionado!');}
  closeAll();
  renderListaClientes(document.getElementById('cliBuscaInp')?document.getElementById('cliBuscaInp').value:'');
}
function cliExcluir(id){
  var c=CLDB.get().find(function(x){return x.id===id;}); if(!c) return;
  if(!confirm('Excluir "'+c.nome+'" do banco de clientes?')) return;
  CLDB.del(id); closeAll(); toast('✓ Cliente excluído');
  renderListaClientes('');
}
// Expor globais
window.abrirGestaoClientes=abrirGestaoClientes;
window.renderListaClientes=renderListaClientes;
window.cliAbrirNovo=cliAbrirNovo;
window.cliAbrirEditar=cliAbrirEditar;
window.cliSalvarForm=cliSalvarForm;
window.cliExcluir=cliExcluir;
window.cliACSelecionar=cliACSelecionar;
window.cliAplicarDesc=cliAplicarDesc;
window.CLDB=CLDB;

// ── Migração: importar clientes do histórico para CLDB ──
// Roda uma vez automaticamente. Nunca pergunta — só importa silenciosamente.
(function _cliMigrarHistorico() {
  var FLAG = 'hr_cli_migrado_v1';
  if (localStorage.getItem(FLAG)) return; // já rodou

  function run() {
    var orcs = DB && DB.q ? DB.q : [];
    var jobs = DB && DB.j ? DB.j : [];
    var importados = 0;

    // Junta orçamentos e jobs, ordena por data (mais antigos primeiro)
    var entradas = [];
    orcs.forEach(function(q) {
      if (q.cli) entradas.push({ nome: q.cli, tel: q.tel||'', cidade: q.cidade||'', end: q.end||'', data: q.date||'' });
    });
    jobs.forEach(function(j) {
      if (j.cli) entradas.push({ nome: j.cli, tel: '', cidade: '', end: '', data: j.start||'' });
    });
    entradas.sort(function(a, b) { return a.data < b.data ? -1 : 1; });

    entradas.forEach(function(e) {
      if (!e.nome || e.nome.trim().length < 2) return;
      var nome = e.nome.trim();
      // Verificar se já existe (fuzzy ≥ 80%)
      var exist = _cliBuscar(nome, 80);
      if (exist.length > 0) {
        // Atualizar campos em branco se tiver info nova
        var c = exist[0].c, upd = {};
        if (e.tel    && !c.tel)    upd.tel    = e.tel;
        if (e.cidade && !c.cidade) upd.cidade = e.cidade;
        if (e.end    && !c.end)    upd.end    = e.end;
        if (Object.keys(upd).length) CLDB.upd(c.id, upd);
        return;
      }
      // Novo cliente
      CLDB.add({ nome: nome, tel: e.tel, cidade: e.cidade, end: e.end, obs: '' });
      importados++;
    });

    localStorage.setItem(FLAG, '1');
    if (importados > 0) {
      toast('✓ ' + importados + ' clientes importados do histórico!');
    }
  }

  // Aguardar DB estar disponível
  if (typeof DB !== 'undefined' && DB.q) {
    run();
  } else {
    var t = 0;
    var iv = setInterval(function() {
      if (typeof DB !== 'undefined' && DB.q) { clearInterval(iv); run(); }
      if (++t > 20) clearInterval(iv);
    }, 300);
  }
})();
// ══════════════════════════════════════════════════════════════
// MELHORIA #4 — REDESIGN VISUAL DO MÓDULO DE ORÇAMENTO
// Transforma a tela de orçamento em uma experiência premium:
// • Header dinâmico com nome do cliente em tempo real
// • Indicador visual do material selecionado (com cor/gradiente)
// • Status bar de progresso do orçamento (4 etapas)
// • Resultado com card de valor premium e animação
// • Botões de ação redesenhados
//
// COMO INTEGRAR:
//   1. Adicionar este arquivo ao index.html
//   2. Chamar _orcInitPremium() no app-init.js ou após renderAmbientes()
//   3. O redesign é não-destrutivo — envolve os elementos existentes
//      com wrappers premium sem alterar IDs ou lógica de cálculo
// ══════════════════════════════════════════════════════════════

// ── Estado local ──
var _orcPremiumInit = false;

function _orcInitPremium() {
  if (_orcPremiumInit) return;
  _orcPremiumInit = true;
  _injectOrcPremiumStyles();
  _orcBuildHeader();
  _orcWrapResult();
  _orcInitLiveListeners();
}

// ─────────────────────────────────────────────────────────────
// HEADER PREMIUM
// Injeta acima do #pg0 um header dinâmico que mostra:
// - Nome do cliente (atualizado em tempo real)
// - Material selecionado (cor/nome)
// - Barra de progresso (4 etapas)
// ─────────────────────────────────────────────────────────────
function _orcBuildHeader() {
  var pg = document.getElementById('pg0');
  if (!pg) return;

  // Não duplicar
  if (document.getElementById('orcPremHdr')) return;

  var hdr = document.createElement('div');
  hdr.id = 'orcPremHdr';
  hdr.className = 'orc-prem-hdr';
  hdr.innerHTML =
    '<div class="orc-prem-hdr-inner">' +
      '<div class="orc-prem-cli-wrap">' +
        '<div class="orc-prem-cli-label">CLIENTE</div>' +
        '<div class="orc-prem-cli-nome" id="orcPremCliNome">—</div>' +
      '</div>' +
      '<div class="orc-prem-mat-pill" id="orcPremMatPill">' +
        '<div class="orc-prem-mat-dot" id="orcPremMatDot"></div>' +
        '<div class="orc-prem-mat-nome" id="orcPremMatNome">Sem pedra</div>' +
      '</div>' +
    '</div>' +
    '<div class="orc-prem-steps" id="orcPremSteps">' +
      _orcStepsHtml(1) +
    '</div>';

  // Inserir como primeiro filho do pg0
  pg.insertBefore(hdr, pg.firstChild);
}

function _orcStepsHtml(step) {
  var steps = ['Cliente', 'Pedra', 'Medidas', 'Calcular'];
  var h = '';
  steps.forEach(function(lbl, i) {
    var n = i + 1;
    var done = n < step;
    var active = n === step;
    h += '<div class="orc-step' + (done ? ' done' : active ? ' active' : '') + '">';
    h += '<div class="orc-step-dot">' + (done ? '✓' : n) + '</div>';
    h += '<div class="orc-step-lbl">' + lbl + '</div>';
    h += '</div>';
    if (i < steps.length - 1) h += '<div class="orc-step-line' + (done ? ' done' : '') + '"></div>';
  });
  return h;
}

// ─────────────────────────────────────────────────────────────
// LISTENERS em tempo real
// ─────────────────────────────────────────────────────────────
function _orcInitLiveListeners() {
  // Atualizar nome do cliente em tempo real
  var cliEl = document.getElementById('oCliente');
  if (cliEl) {
    cliEl.addEventListener('input', _orcUpdateHeader);
    cliEl.addEventListener('change', _orcUpdateHeader);
  }

  // Observer para mudança de material (classe .on em [data-mat])
  var observer = new MutationObserver(function() {
    _orcUpdateHeader();
  });
  var ambList = document.getElementById('ambientesList');
  if (ambList) {
    observer.observe(ambList, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  }

  // Observar resArea para animar resultado
  var resArea = document.getElementById('resArea');
  if (resArea) {
    var resObs = new MutationObserver(function() {
      if (resArea.style.display !== 'none') {
        _orcAnimateResult();
        _orcUpdateHeader(); // step 4
      }
    });
    resObs.observe(resArea, { attributes: true, attributeFilter: ['style'] });
  }

  // Update inicial
  _orcUpdateHeader();

  // Update periódico para capturar mudanças de material (que não disparam eventos)
  // Update preciso: ao focar em inputs de dimensão
  ['ambientesList'].forEach(function(pid){
    var el=document.getElementById(pid);
    if(el) el.addEventListener('input',_orcUpdateHeader);
  });
  setInterval(_orcUpdateHeader, 2000);
}

function _orcUpdateHeader() {
  // Nome cliente
  var cliEl = document.getElementById('oCliente');
  var cli = cliEl ? cliEl.value.trim() : '';
  var nomeEl = document.getElementById('orcPremCliNome');
  if (nomeEl) nomeEl.textContent = cli || '—';

  // Material selecionado
  var matEl  = document.getElementById('orcPremMatNome');
  var dotEl  = document.getElementById('orcPremMatDot');
  var pillEl = document.getElementById('orcPremMatPill');
  if (matEl && dotEl && pillEl) {
    var stone = null;
    if (typeof selMat !== 'undefined' && selMat && typeof CFG !== 'undefined' && CFG.stones) {
      stone = CFG.stones.find(function(s) { return s.id === selMat; });
    }
    if (!stone && ambientes && ambientes[0]) {
      var amb0 = ambientes[0];
      if (amb0.selMat && typeof CFG !== 'undefined' && CFG.stones) {
        stone = CFG.stones.find(function(s) { return s.id === amb0.selMat; });
      }
    }
    if (stone) {
      matEl.textContent = stone.nm || stone.id;
      // Cor do dot (baseado no nome da pedra)
      var cor = _orcStoneColor(stone);
      dotEl.style.background = cor;
      dotEl.style.boxShadow  = '0 0 6px ' + cor + '80';
      pillEl.style.borderColor = cor + '40';
    } else {
      matEl.textContent = 'Sem pedra';
      dotEl.style.background = 'var(--t4)';
      dotEl.style.boxShadow = 'none';
      pillEl.style.borderColor = 'rgba(255,255,255,.08)';
    }
  }

  // Step da barra de progresso
  var stepsEl = document.getElementById('orcPremSteps');
  if (stepsEl) {
    var resArea = document.getElementById('resArea');
    var temResult = resArea && resArea.style.display !== 'none';
    var temCli  = cli.length > 0;
    var temMat  = !!(typeof selMat !== 'undefined' && selMat);
    var temMed  = !!(ambientes && ambientes[0] && ambientes[0].pecas &&
                     ambientes[0].pecas.some(function(p){ return p.w > 0 && p.h > 0; }));

    var step = 1;
    if (temCli) step = 2;
    if (temCli && temMat) step = 3;
    if (temCli && temMat && temMed) step = 4;
    if (temResult) step = 5; // todos completos
    stepsEl.innerHTML = _orcStepsHtml(step);
  }
}

// Mapeia nome da pedra para uma cor representativa
function _orcStoneColor(stone) {
  var nm = (stone.nm || stone.id || '').toLowerCase();
  if (nm.includes('preto') || nm.includes('black') || nm.includes('absolut')) return '#4a5568';
  if (nm.includes('branco') || nm.includes('white') || nm.includes('polar')) return '#cbd5e0';
  if (nm.includes('cinza') || nm.includes('gray') || nm.includes('grey')) return '#718096';
  if (nm.includes('marrom') || nm.includes('brown') || nm.includes('imperial')) return '#8B5E3C';
  if (nm.includes('verde') || nm.includes('green')) return '#276749';
  if (nm.includes('azul') || nm.includes('blue') || nm.includes('bahia')) return '#2b6cb0';
  if (nm.includes('amarelo') || nm.includes('yellow') || nm.includes('gold')) return '#b7791f';
  if (nm.includes('rosa') || nm.includes('pink') || nm.includes('salmon')) return '#d53f8c';
  if (nm.includes('bege') || nm.includes('beige') || nm.includes('cream')) return '#c8a97e';
  if (nm.includes('via láctea') || nm.includes('milky')) return '#553c9a';
  return stone.cor || '#C9A84C';
}

// ─────────────────────────────────────────────────────────────
// WRAPPER DO RESULTADO
// Envolve o #resArea com estilos premium e adiciona card
// de valor grande com animação ao aparecer
// ─────────────────────────────────────────────────────────────
function _orcWrapResult() {
  // Adicionar card de destaque ANTES do resDetail (será preenchido após calcular)
  var resArea = document.getElementById('resArea');
  if (!resArea) return;
  if (document.getElementById('orcValorCard')) return;

  // Card de valor — inserir antes da primeira .sec dentro do resArea
  var firstSec = resArea.querySelector('.sec');
  if (!firstSec) return;

  var card = document.createElement('div');
  card.id = 'orcValorCard';
  card.className = 'orc-valor-card';
  card.innerHTML =
    '<div class="orc-valor-label">VALOR DO ORÇAMENTO</div>' +
    '<div class="orc-valor-num" id="orcValorNum">R$ —</div>' +
    '<div class="orc-valor-sub" id="orcValorSub"></div>' +
    '<div class="orc-valor-sparkles" aria-hidden="true">' +
      '<span class="orc-sp orc-sp1">✦</span>' +
      '<span class="orc-sp orc-sp2">✦</span>' +
      '<span class="orc-sp orc-sp3">✦</span>' +
    '</div>';

  resArea.insertBefore(card, firstSec);

  // Observer para capturar o valor quando calcular() preencher resDetail
  var resDetail = document.getElementById('resDetail');
  if (resDetail) {
    var obs = new MutationObserver(function() {
      _orcSyncValorCard();
    });
    obs.observe(resDetail, { childList: true, subtree: true, characterData: true });
  }
}

function _orcSyncValorCard() {
  var numEl = document.getElementById('orcValorNum');
  var subEl = document.getElementById('orcValorSub');
  if (!numEl) return;

  // Extrair valor à vista do resDetail ou do estado global
  var vista = 0;
  if (typeof DB !== 'undefined' && DB.q && DB.q.length) {
    var last = DB.q[DB.q.length - 1];
    if (last) vista = last.vista || 0;
  }

  // Fallback: procurar no texto do resDetail
  if (!vista) {
    var resDetail = document.getElementById('resDetail');
    if (resDetail) {
      var txt = resDetail.textContent || '';
      var m = txt.match(/R\$\s*([\d.,]+)/);
      if (m) {
        vista = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
      }
    }
  }

  if (vista > 0) {
    numEl.textContent = 'R$ ' + fm(vista);
    numEl.style.color = 'var(--gold2)';
    if (subEl) {
      // Parcelado estimado (12x, 2%)
      var parcVal = vista * 1.02 / 12;
      subEl.textContent = 'ou 12× de R$ ' + fm(parcVal) + ' (est.)';
    }
  }
}

function _orcAnimateResult() {
  _orcSyncValorCard();
  var card = document.getElementById('orcValorCard');
  if (card) {
    card.classList.remove('orc-valor-pop');
    // Force reflow
    void card.offsetWidth;
    card.classList.add('orc-valor-pop');
  }
}

// ─────────────────────────────────────────────────────────────
// CSS PREMIUM
// ─────────────────────────────────────────────────────────────
function _injectOrcPremiumStyles() {
  if (document.getElementById('orcPremStyle')) return;
  var s = document.createElement('style');
  s.id = 'orcPremStyle';
  s.textContent = `
    @keyframes orcPremFadeIn {
      from { opacity: 0; transform: translateY(-8px); }
      to   { opacity: 1; transform: none; }
    }
    @keyframes orcValorPop {
      0%   { transform: scale(1); }
      30%  { transform: scale(1.03); }
      60%  { transform: scale(.98); }
      100% { transform: scale(1); }
    }
    @keyframes orcSpFloat {
      0%, 100% { opacity: .2; transform: translateY(0) scale(1); }
      50%       { opacity: .6; transform: translateY(-6px) scale(1.2); }
    }
    @keyframes orcStepDone {
      from { transform: scale(0); }
      to   { transform: scale(1); }
    }

    /* ── HEADER PREMIUM ── */
    .orc-prem-hdr {
      background: linear-gradient(160deg,
        rgba(201,168,76,.1) 0%,
        rgba(201,168,76,.04) 60%,
        transparent 100%);
      border-bottom: 1px solid rgba(201,168,76,.15);
      padding: 14px 16px 0;
      animation: orcPremFadeIn .4s ease;
    }

    .orc-prem-hdr-inner {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      gap: 10px;
    }

    .orc-prem-cli-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 2px;
      color: rgba(201,168,76,.5);
      margin-bottom: 2px;
    }
    .orc-prem-cli-nome {
      font-size: 16px;
      font-weight: 900;
      color: var(--t1);
      letter-spacing: -.3px;
      transition: color .2s;
      max-width: 180px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .orc-prem-cli-nome:not(:empty):not(:contains('—')) {
      color: var(--gold2);
    }

    /* Material pill */
    .orc-prem-mat-pill {
      display: flex;
      align-items: center;
      gap: 7px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 20px;
      padding: 6px 12px 6px 8px;
      flex-shrink: 0;
      transition: border-color .3s;
    }
    .orc-prem-mat-dot {
      width: 10px; height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
      transition: background .3s, box-shadow .3s;
    }
    .orc-prem-mat-nome {
      font-size: 11px;
      font-weight: 700;
      color: var(--t2);
      white-space: nowrap;
      max-width: 110px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Barra de steps */
    .orc-prem-steps {
      display: flex;
      align-items: center;
      padding: 0 0 12px;
      gap: 0;
    }

    .orc-step {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      flex-shrink: 0;
    }

    .orc-step-dot {
      width: 24px; height: 24px;
      border-radius: 50%;
      background: rgba(255,255,255,.06);
      border: 1.5px solid rgba(255,255,255,.1);
      display: flex; align-items: center; justify-content: center;
      font-size: 10px;
      font-weight: 800;
      color: var(--t4);
      transition: all .25s;
    }
    .orc-step.done .orc-step-dot {
      background: rgba(74,222,128,.15);
      border-color: rgba(74,222,128,.4);
      color: #4ade80;
      font-size: 11px;
    }
    .orc-step.active .orc-step-dot {
      background: rgba(201,168,76,.15);
      border-color: var(--gold);
      color: var(--gold2);
      box-shadow: 0 0 10px rgba(201,168,76,.25);
    }

    .orc-step-lbl {
      font-size: 8px;
      font-weight: 600;
      letter-spacing: .5px;
      color: var(--t4);
      text-align: center;
      white-space: nowrap;
    }
    .orc-step.done .orc-step-lbl { color: #4ade80; }
    .orc-step.active .orc-step-lbl { color: var(--gold2); }

    .orc-step-line {
      flex: 1;
      height: 1.5px;
      background: rgba(255,255,255,.08);
      margin: 0 4px;
      margin-bottom: 14px;
      transition: background .3s;
    }
    .orc-step-line.done { background: rgba(74,222,128,.3); }

    /* ── CARD DE VALOR ── */
    .orc-valor-card {
      margin: 16px 12px 0;
      background: linear-gradient(135deg,
        rgba(201,168,76,.12) 0%,
        rgba(201,168,76,.06) 50%,
        rgba(0,0,0,0) 100%);
      border: 1px solid rgba(201,168,76,.25);
      border-radius: 20px;
      padding: 20px 16px 18px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    .orc-valor-card.orc-valor-pop {
      animation: orcValorPop .5s ease;
    }

    /* Efeito de brilho no fundo */
    .orc-valor-card::before {
      content: '';
      position: absolute;
      top: -30px; left: 50%;
      width: 200px; height: 200px;
      background: radial-gradient(circle, rgba(201,168,76,.08) 0%, transparent 70%);
      transform: translateX(-50%);
      pointer-events: none;
    }

    .orc-valor-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 2.5px;
      color: rgba(201,168,76,.5);
      margin-bottom: 6px;
    }
    .orc-valor-num {
      font-size: 2.2rem;
      font-weight: 900;
      color: var(--gold2);
      letter-spacing: -1.5px;
      line-height: 1;
      margin-bottom: 6px;
      transition: color .3s;
    }
    .orc-valor-sub {
      font-size: 11px;
      color: var(--t3);
    }

    /* Sparkles flutuantes */
    .orc-valor-sparkles {
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .orc-sp {
      position: absolute;
      color: var(--gold);
      font-size: 10px;
      animation: orcSpFloat 3s ease-in-out infinite;
    }
    .orc-sp1 { top: 16px; left: 16px; animation-delay: 0s; opacity: .3; }
    .orc-sp2 { top: 20px; right: 20px; animation-delay: 1s; opacity: .25; font-size: 7px; }
    .orc-sp3 { bottom: 18px; left: 40%; animation-delay: 2s; opacity: .2; font-size: 8px; }

    /* ── MELHORIAS NOS INPUTS ── */
    #pg0 .sec .f input,
    #pg0 .sec .f textarea {
      transition: border-color .2s, box-shadow .2s;
    }
    #pg0 .sec .f input:focus {
      border-color: rgba(201,168,76,.4) !important;
      box-shadow: 0 0 0 3px rgba(201,168,76,.08);
    }

    /* ── BOTÃO CALCULAR ── */
    #btnCalc {
      position: relative;
      overflow: hidden;
    }
    #btnCalc::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg,
        transparent 0%,
        rgba(255,255,255,.08) 50%,
        transparent 100%);
      transform: translateX(-100%);
      transition: transform .4s ease;
    }
    #btnCalc:active::after {
      transform: translateX(100%);
    }

    /* ── BOTÕES DE AÇÃO DO RESULTADO ── */
    #btnCopy, #btnPDF {
      border-radius: 14px !important;
      font-weight: 700;
      letter-spacing: .3px;
      transition: transform .15s, box-shadow .15s !important;
    }
    #btnCopy:active, #btnPDF:active {
      transform: scale(.96);
    }
    #btnPDF {
      box-shadow: 0 0 16px rgba(201,168,76,.15);
    }
  `;
  document.head.appendChild(s);
}

// ─────────────────────────────────────────────────────────────
// AUTO-INIT quando pg0 fica visível
// ─────────────────────────────────────────────────────────────
(function() {
  // Tentar init imediato
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(_orcInitPremium, 500);
    });
  } else {
    setTimeout(_orcInitPremium, 500);
  }

  // Também reinit quando navegar para a tela de orçamento
  var _origGo = window.go;
  if (_origGo) {
    window.go = function(n) {
      _origGo(n);
      if (n === 0 || n === 1) {
        setTimeout(_orcInitPremium, 100);
        setTimeout(_orcUpdateHeader, 200);
      }
    };
  }
})();
