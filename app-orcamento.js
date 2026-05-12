// ══════════════════════════════════
// MATERIAL, SERVIÇOS, AMBIENTES, CÁLCULO
// ══════════════════════════════════

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
function pickMat(id){selMat=id;}

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
SV_DEFS.Soleira=[{g:'Acabamento',its:[{k:'sol_sem',l:'Sem acabamento',u:'acb_auto',lados:0},{k:'sol1',l:'Acabamento 1 lado',u:'acb_auto',lados:1},{k:'sol2',l:'Acabamento 2 lados',u:'acb_auto',lados:2}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Peitoril=[{g:'Tipo',its:[{k:'peit_reto',l:'Peitoril Reto',u:'ml'},{k:'peit_ping',l:'c/ Pingadeira',u:'ml'},{k:'peit_col',l:'c/ Pedra Colada + Pingadeira',u:'ml'},{k:'peit_portal',l:'p/ Portal Madeira',u:'ml'}]},{g:'Acabamento',its:[{k:'peit_sem',l:'Sem acabamento',u:'acb_auto',lados:0},{k:'peit_acb1',l:'Acabamento 1 lado',u:'acb_auto',lados:1},{k:'peit_acb2',l:'Acabamento 2 lados',u:'acb_auto',lados:2}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Escada=[{g:'Sainha',its:[{k:'s_reta',l:'Sainha Reta',u:'sf'},{k:'s_45',l:'Sainha 45°',u:'sf'},{k:'s_boleada',l:'Sainha Boleada',u:'sf'}]},{g:'Frontão',its:[{k:'frontao',l:'Frontão Reto',u:'sf'},{k:'frontao_chf',l:'Frontão Chanfrado',u:'sf'}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Fachada=[{g:'Fixação',its:[{k:'tubo',l:'Tubo Metálico',u:'un',fx:0},{k:'cant',l:'Cantoneira',u:'un',fx:0}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Outro=SV_DEFS.Cozinha;

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
  // ── Peças de pedra: medidas em ml × cm de altura, m² calculado automaticamente ──
  {g:'🪨 Peças de Pedra (m²)',its:[
    {k:'tum_tampa',  l:'Tampa Superior',           u:'sf'},
    {k:'tum_lat',    l:'Laterais (×2)',            u:'sf'},
    {k:'tum_front',  l:'Frente / Frontal',         u:'sf'},
    {k:'tum_base',   l:'Base / Plataforma',        u:'sf'},
    {k:'tum_det',    l:'Detalhe Superior',         u:'sf'},
    {k:'tum_sainha', l:'Sainha Frontal',           u:'sf'},
    {k:'tum_gav1',   l:'Frente de Gaveta — 1ª',   u:'sf'},
    {k:'tum_gav2',   l:'Frente de Gaveta — 2ª',   u:'sf'},
    {k:'tum_gav3',   l:'Frente de Gaveta — 3ª',   u:'sf'}
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

function getSVGrp(){return SV_DEFS[document.getElementById('oTipo').value]||SV_DEFS.Cozinha;}
function getIt(k){var g=getSVGrp();for(var i=0;i<g.length;i++){for(var j=0;j<g[i].its.length;j++){if(g[i].its[j].k===k)return g[i].its[j];}}return null;}
// Preços padrão de túmulo — usados como fallback quando CFG.sv não tem o valor
var DEF_TUM_SV = {
  tum_tampa: 85,   tum_lat: 85,    tum_front: 85,  tum_base: 85,
  tum_det:   85,   tum_sainha: 85, tum_gav1:  85,  tum_gav2:  85,
  tum_gav3:  85,   tum_mol:   110, tum_ping:  80,  tum_bisel: 90,
  tum_lapide:480,  tum_plaq:  220, tum_foto: 170,  tum_cruz:  340,
  tum_pol:   160,  tum_rec:    50, tum_mont:  380, tum_montc: 580,
  // bp_ (borda piscina)
  bp_boleada:110, bp_antiderap:120, bp_pingad:90, bp_mcana:100, bp_chanfro:95,
  bp_c_arred:180, bp_c_curva:220, bp_c_infinita:350
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
      grp.its.forEach(function(it){if(sv[it.k])selAcb=it.k;});
      if(!selAcb)selAcb=grp.its[0].k;
      h+='<div class="svblk"><div class="svhd">'+grp.g+'</div>';
      h+='<div style="display:flex;gap:6px;padding:8px 12px 10px;flex-wrap:wrap;">';
      grp.its.forEach(function(it){
        var active=selAcb===it.k;
        var autoMl=_calcAcbAutoMl(amb,it.lados||0);
        var pr=getPr(it.k);
        var custo=autoMl>0&&pr>0?(' · R$ '+fm(autoMl*pr)):'';
        var subtitle=it.lados>0&&autoMl>0?(autoMl.toFixed(2)+'ml'+custo):it.lados===0?'sem custo':'';
        h+='<div onclick="togAcbAuto('+amb.id+',\''+it.k+'\')" style="cursor:pointer;flex:1;min-width:90px;text-align:center;padding:9px 8px;border-radius:10px;border:1.5px solid '+(active?'var(--gold)':'var(--bd2)')+';background:'+(active?'rgba(201,168,76,.12)':'var(--s2)')+';transition:all .15s;">'
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
      var hint=it.u==='sf'?'R$ '+pr+'/ml + m² pedra':it.u==='ml'?'R$ '+pr+'/ml':it.u==='km'?'R$ '+pr+'/km':it.u==='cuba'?'Selecionar modelo':it.u==='livre'?'Valor livre':it.fx===1&&pr?'R$ '+pr:'R$ '+pr;
      h+='<div class="svrow" id="sr-'+it.k+'" data-sv="'+it.k+'"><div class="svchk">✓</div><div class="svlbl">'+it.l+'<span class="svph">'+hint+'</span></div></div>';
      if(it.u==='sf'){
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
  var mat=CFG.stones.find(function(s){return s.id===selMat;})||{pr:0,nm:''};
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

// ═══ AMBIENTES ═══
var TIPOS_AMBIENTE=['Cozinha','Banheiro','Lavabo','Soleira','Peitoril','Escada','Fachada','Túmulo','🏊 Borda Piscina','Outro'];

function pickMatAmb(ambId,stoneId){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  amb.selMat=stoneId;
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
    '🏊 Borda Piscina':['Granito Cinza','Granito Preto','Granito Verde','Granito Branco','Quartzito','Mármore','Travertino','Ultra Compacto'],
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
  var defaultMat=ambientes.length>0?ambientes[ambientes.length-1].selMat:(selMat||null);
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
}

// Legacy - kept for AI apply compatibility
function addPeca(){if(ambientes.length>0)addPecaAmb(ambientes[0].id);}
function updPc(id,prop,val){ambientes.forEach(function(a){var p=a.pecas.find(function(x){return x.id===id;});if(p)p[prop]=val;});}
function remPeca(id){ambientes.forEach(function(a){if(a.pecas.length>1){a.pecas=a.pecas.filter(function(p){return p.id!==id;});}});renderAmbientes();}

function renderAmbientes(){
  try{
  var container=document.getElementById('ambientesList');
  if(!container)return;
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
    // Pecas
    h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin:14px 0 7px;">Peças</div>';
    h+='<div class="amb-pecas">';
    amb.pecas.forEach(function(pc,pi){
      var rm=amb.pecas.length>1?'<button style="background:none;border:none;color:var(--red);font-size:.7rem;cursor:pointer;padding:2px 5px;font-family:Outfit,sans-serif;" onclick="rmPecaAmb('+amb.id+','+pc.id+')">&#10005;</button>':'';
      h+='<div class="peca">';
      h+='<div class="ptop"><span class="pnum">Peça '+(pi+1)+'</span>'+rm+'</div>';
      h+='<div class="f"><label>Descrição</label><input id="pd-'+pc.id+'" placeholder="Ex: Bancada" type="text" style="background:var(--s3);" value="'+escH(pc.desc||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'desc\',this.value)"></div>';
      h+='<div class="r2"><div class="f"><label>Comprimento (cm)</label><input id="pw-'+pc.id+'" placeholder="300" type="number" style="background:var(--s3);" value="'+(pc.w||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'w\',+this.value)"></div>';
      h+='<div class="f"><label>Largura (cm)</label><input id="ph-'+pc.id+'" placeholder="60" type="number" style="background:var(--s3);" value="'+(pc.h||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'h\',+this.value)"></div></div>';
      h+='<div style="max-width:130px;"><div class="f"><label>Quantidade</label><input id="pq-'+pc.id+'" type="number" style="background:var(--s3);" value="'+(pc.q||1)+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'q\',+this.value||1)"></div></div>';
      h+='</div>';
    });
    h+='</div>';
    h+='<div class="row" style="gap:7px;margin-bottom:10px;">';
    h+='<button class="btn btn-o" style="font-size:.73rem;padding:8px;flex:1;" data-add-peca="'+amb.id+'">+ Peça</button>';
    h+='<button class="btn-ai-sm" data-ai-amb="'+amb.id+'">✨ Descrever</button>';
    h+='</div>';
    h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:7px;">Serviços</div>';
    h+=buildSVHtml(amb);
    h+='</div></div>';
  });
  container.innerHTML=h;
  }catch(e2){console.error('renderAmbientes:',e2);toast('Erro: '+e2.message);}
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

// Radio-toggle for acb_auto groups: ensures only one key active per group
function togAcbAuto(ambId,k){
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb)return;
  if(!amb.svState)amb.svState={};
  var sv=amb.svState;
  var g=SV_DEFS[amb.tipo]||SV_DEFS.Cozinha;
  // Find which group this key belongs to
  g.forEach(function(grp){
    var match=grp.its.find(function(it){return it.k===k;});
    if(!match)return;
    if(match.u!=='acb_auto')return;
    // Deactivate all in this acb_auto group
    grp.its.forEach(function(it){delete sv[it.k];});
    // Activate selected (if not already the first/default = sem acabamento that means lados=0)
    sv[k]={lados:match.lados||0};
  });
  renderAmbientes();
}

function buildSVHtml(amb){
  var g=SV_DEFS[amb.tipo]||SV_DEFS.Cozinha;
  var sv=amb.svState||{};
  var h='';
  g.forEach(function(grp){
    h+='<div class="svblk"><div class="svhd">'+grp.g+'</div>';
    grp.its.forEach(function(it){
      var pr=getPr(it.k);
      var isOn=!!sv[it.k];
      var hint=it.u==='sf'?'R$ '+pr+'/ml + m² pedra':it.u==='ml'?'R$ '+pr+'/ml':it.u==='km'?'R$ '+pr+'/km':it.u==='cuba'?'Selecionar modelo':it.u==='livre'?'Valor livre':'R$ '+pr;
      h+='<div class="svrow'+(isOn?' on':'')+'" data-sv="'+it.k+'" data-amb="'+amb.id+'">';
      h+='<div class="svchk">✓</div><div class="svlbl">'+it.l+'<span class="svph">'+hint+'</span></div></div>';
      if(it.u==='sf'&&isOn){
        var sfv=sv[it.k]||{};
        h+='<div class="sfw on" id="sf-'+amb.id+'-'+it.k+'">';
        h+='<div class="sfl">'+it.l+'</div><div class="sfr">';
        h+='<div class="sf"><span>Comprimento (ml)</span><input type="number" id="sw-'+amb.id+'-'+it.k+'" placeholder="2.50" step="0.01" value="'+(sfv.ml||'')+'" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'ml\',+this.value);calcSFAmb('+amb.id+',\''+it.k+'\')" onclick="event.stopPropagation()"></div>';
        h+='<div class="sfx">×</div>';
        h+='<div class="sf"><span>Altura (cm)</span><input type="number" id="sh-'+amb.id+'-'+it.k+'" placeholder="6" step="0.5" value="'+(sfv.altCm||'')+'" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'altCm\',+this.value);calcSFAmb('+amb.id+',\''+it.k+'\')" onclick="event.stopPropagation()"></div>';
        h+='<div class="sf"><span>Qtd</span><input type="number" id="sq-'+amb.id+'-'+it.k+'" value="'+(sfv.q||1)+'" min="1" style="width:48px;" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'q\',+this.value||1);calcSFAmb('+amb.id+',\''+it.k+'\')" onclick="event.stopPropagation()"></div>';
        h+='</div><div class="sfres" id="sfr-'+amb.id+'-'+it.k+'"></div></div>';
      } else if(it.u==='cuba'&&isOn){
        var cubaInfo=amb.selCuba?('✓ '+amb.selCuba.nm.trim()+' — R$ '+fm(amb.selCuba.total)):'Toque para escolher';
        h+='<div class="svcuba on" id="sq-'+amb.id+'-'+it.k+'" onclick="openCubaPickAmb('+amb.id+',\''+it.ctp+'\')" style="cursor:pointer;">'+cubaInfo+'</div>';
      } else if((it.u==='ml'||it.u==='km'||it.u==='un')&&!it.fx&&isOn){
        var sv2=sv[it.k]||{};
        h+='<div class="svxtr on" id="sq-'+amb.id+'-'+it.k+'"><input type="number" id="si-'+amb.id+'-'+it.k+'" placeholder="'+(it.u==='ml'?'metros':'qtd')+'" step="0.1" value="'+(sv2.qty||'')+'" oninput="updSVAmb('+amb.id+',\''+it.k+'\',\'qty\',+this.value)" onclick="event.stopPropagation()"><span class="svunit">'+it.u+'</span></div>';
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

function calcSFAmb(ambId,k){
  var amb=ambientes.find(function(a){return a.id===ambId;});
  if(!amb||!amb.svState||!amb.svState[k])return;
  var sv=amb.svState[k];
  var el=document.getElementById('sfr-'+ambId+'-'+k);if(!el)return;
  var ml=sv.ml||0,altCm=sv.altCm||0,q=sv.q||1;
  if(ml&&altCm){
    var m2=ml*(altCm/100)*q;
    var mat=CFG.stones.find(function(s){return s.id===selMat;});
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

  var totalM2=0,totalAcT=0,totalPedT=0;
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
    amb.pecas.forEach(function(p){
      if(p.w&&p.h){
        var a=(p.w/100)*(p.h/100)*(p.q||1);
        m2+=a;
        pds.push({desc:p.desc||'Peça',w:p.w,h:p.h,q:p.q||1,m2:a});
        allPds.push({desc:(tipo+': '+(p.desc||'Peça')),w:p.w,h:p.h,q:p.q||1,m2:a});
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
          if(acbMl>0&&acbPr>0){acT+=acbMl*acbPr;} // add to cost, invisible in output
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
        if(amb.selCuba){acT+=amb.selCuba.total;acL.push({l:'Cuba: '+amb.selCuba.nm.trim(),v:amb.selCuba.total});acN.push('Cuba: '+amb.selCuba.nm.trim());}
        return;
      }
      if(it.u==='livre'){var v=svd.qty||0;if(v>0){acT+=v;acL.push({l:it.l,v:v});acN.push(it.l);}return;}
      if(it.fx===1){var p2=getPr(it.k);if(p2>0){acT+=p2;acL.push({l:it.l,v:p2});acN.push(it.l);}return;}
      var qty=svd.qty||1;
      var vv=getPr(it.k)*qty;acT+=vv;acL.push({l:it.l+(qty>1?' ('+qty+it.u+')':''),v:vv});acN.push(it.l);
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

    var pedTamb=m2*ambMat.pr;
    totalM2+=m2;totalAcT+=acT;totalPedT+=pedTamb;
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
      else if(itP.u==='cuba'){if(ambP.selCuba){vP=ambP.selCuba.total;dP+=': '+ambP.selCuba.nm.trim();}}
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
  pi+='<div style="display:flex;justify-content:space-between;margin-bottom:7px;"><span style="font-size:.72rem;color:var(--t3);">Custo Pedra</span><b style="color:var(--grn);">R$ '+fm(pedT)+'</b></div>';
  pi+='<div style="display:flex;justify-content:space-between;margin-bottom:7px;"><span style="font-size:.72rem;color:var(--t3);">Mão de Obra</span><b style="color:var(--gold2);">R$ '+fm(totalAcT)+'</b></div>';
  pi+='<div style="border-top:1px solid var(--bd);padding-top:8px;margin-bottom:7px;display:flex;justify-content:space-between;"><span style="font-size:.78rem;font-weight:700;">Total Custo</span><b style="font-family:Cormorant Garamond,serif;font-size:1.1rem;">R$ '+fm(pedT+totalAcT)+'</b></div>';
  pi+='<div style="border-top:2px solid rgba(201,168,76,.3);padding-top:10px;display:flex;justify-content:space-between;align-items:baseline;"><span style="font-size:.72rem;color:var(--gold3);">Valor à Vista (cliente)</span><b style="font-family:Cormorant Garamond,serif;font-size:1.4rem;color:var(--gold2);">R$ '+fm(vista)+'</b></div>';
  pi+='<div style="display:flex;justify-content:space-between;margin-top:6px;"><span style="font-size:.72rem;color:var(--t4);">Margem estimada</span><b style="color:var(--grn);">R$ '+fm(vista-(pedT+totalAcT))+'</b></div></div>';
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
  var q={id:Date.now(),date:td(),cli:cli,tel:tel,cidade:cidade,end:end,obs:obs,tipo:ambientes.map(function(a){return a.tipo;}).join('+'),mat:mat.nm,matPr:mat.pr,m2:totalM2,pedT:pedT,acT:totalAcT,acN:allAcN,pds:allPds,sfPcs:[],vista:vista,parc:parc,p8:p8,ent:ent,ambSnap:ambSnap};
  DB.q.unshift(q);DB.sv();pendQ=q;
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
      g.forEach(function(grp){grp.its.forEach(function(it){if(sv[it.k]&&it.u==='sf'){var d=sv[it.k];if(d.ml&&d.altCm)hasSf=true;}});});
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
      g.forEach(function(grp){grp.its.forEach(function(it){
        if(!sv[it.k]||it.u!=='sf')return;
        var svd=sv[it.k];var ml=svd.ml||0,alt=svd.altCm||0,qq=svd.q||1;
        if(!ml||!alt)return;
        pecasListHtml+='<div style="display:flex;justify-content:space-between;align-items:baseline;padding:11px 0;border-bottom:1px solid #EDE5CC;">'
          +'<span style="font-size:14px;font-weight:600;color:#1a1a1a;letter-spacing:0.1px;">'+it.l+'</span>'
          +'<span style="font-family:\'Helvetica Neue\',Arial,sans-serif;font-size:12px;color:#999;font-weight:400;letter-spacing:0.3px;">'+ml+' ml × '+alt+' cm'+(qq>1?' (×'+qq+')':'')+'</span>'
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
      +(emp.ig?'<div style="font-size:8.5px;color:rgba(201,168,76,0.25);margin-top:2px;">'+emp.ig+'</div>':'')
      +'<div style="font-size:7.5px;color:rgba(255,255,255,0.1);margin-top:3px;">CNPJ: '+emp.cnpj+'</div>'
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
function confirmarAgenda(){var d=+document.getElementById('diasIn').value;if(!d||!pendQ){toast('Informe os dias');return;}var s=lastEnd()||td(),end=addD(s,d),q=pendQ;var job={id:Date.now(),cli:q.cli,desc:q.tipo+' — '+q.mat,material:q.mat||'',tipo:q.tipo||'Serviço',start:s,end:end,value:q.vista,pago:0,obs:'',done:false,status:'agendado'};DB.j.unshift(job);DB.sv();closeAll();updUrgDot();toast('✓ '+q.cli+' agendado para '+fd(end));}

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