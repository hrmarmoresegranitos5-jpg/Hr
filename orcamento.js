// ═══ MATERIAL ═══
function buildMat(){
  var GRUPOS=[
    {cat:'Granito Cinza',icon:'🩶'},
    {cat:'Granito Preto',icon:'🖤'},
    {cat:'Granito Branco',icon:'🤍'},
    {cat:'Granito Verde',icon:'💚'},
    {cat:'Mármore',icon:'🌿'},
    {cat:'Travertino',icon:'🟤'},
    {cat:'Quartzito',icon:'💎'},
    {cat:'Ultra Compacto',icon:'⚡'}
  ];
  var h='';
  GRUPOS.forEach(function(grp){
    var ss=CFG.stones.filter(function(s){return s.cat===grp.cat;});
    if(!ss.length)return;
    h+='<div class="mcat">'+grp.icon+' '+grp.cat+'</div>';
    h+='<div class="mscroll">';
    ss.forEach(function(s){
      var on=s.id===selMat?'on':'';
      h+='<div class="mc '+on+'" data-mat="'+s.id+'">';
      h+='<div class="msw '+(s.photo?'':s.tx)+'">';
      if(s.photo)h+='<img src="'+s.photo+'" alt="">';
      h+='<div class="mshine"></div>';
      h+='</div>';
      h+='<div class="mbody">';
      h+='<div class="mnm">'+s.nm+'</div>';
      h+='<div class="mfin">'+s.fin+' · R$ '+s.pr.toLocaleString('pt-BR')+'</div>';
      h+='</div></div>';
    });
    h+='</div>';
  });
  document.getElementById('matArea').innerHTML=h;
}
function pickMat(id){selMat=id;document.querySelectorAll('.mc').forEach(function(c){c.classList.toggle('on',c.dataset.mat===id);});}

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
SV_DEFS.Soleira=[{g:'Acabamento',its:[{k:'sol1',l:'1 lado',u:'ml'},{k:'sol2',l:'2 lados',u:'ml'}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Peitoril=[{g:'Tipo',its:[{k:'peit_reto',l:'Peitoril Reto',u:'ml'},{k:'peit_ping',l:'c/ Pingadeira',u:'ml'},{k:'peit_col',l:'c/ Pedra Colada + Pingadeira',u:'ml'},{k:'peit_portal',l:'p/ Portal Madeira',u:'ml'}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Escada=[{g:'Sainha',its:[{k:'s_reta',l:'Sainha Reta',u:'sf'},{k:'s_45',l:'Sainha 45°',u:'sf'},{k:'s_boleada',l:'Sainha Boleada',u:'sf'}]},{g:'Frontão',its:[{k:'frontao',l:'Frontão Reto',u:'sf'},{k:'frontao_chf',l:'Frontão Chanfrado',u:'sf'}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Fachada=[{g:'Fixação',its:[{k:'tubo',l:'Tubo Metálico',u:'un',fx:0},{k:'cant',l:'Cantoneira',u:'un',fx:0}]},{g:'Instalação',its:[{k:'inst',l:'Instalação Padrão',u:'un',fx:1},{k:'inst_c',l:'Instalação Complexa',u:'un',fx:1}]},{g:'Deslocamento',its:[{k:'desl_cid',l:'Na cidade',u:'livre'},{k:'desl_for',l:'Fora da cidade',u:'km',fx:0}]}];
SV_DEFS.Outro=SV_DEFS.Cozinha;

// Acessórios — adicionado em todos os tipos
// Acessórios ficam no catálogo próprio, não nos serviços do orçamento

function getSVGrp(){return SV_DEFS[document.getElementById('oTipo').value]||SV_DEFS.Cozinha;}
function getIt(k){var g=getSVGrp();for(var i=0;i<g.length;i++){for(var j=0;j<g[i].its.length;j++){if(g[i].its[j].k===k)return g[i].its[j];}}return null;}
function getPr(k){return CFG.sv[k]||0;}

function buildSV(){
  selCuba=null;
  var g=getSVGrp(),h='';
  g.forEach(function(grp){
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
    var mat=CFG.stones.find(function(s){return s.id===selMat;});
    var pv=mat?m2*mat.pr:0;
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
var TIPOS_AMBIENTE=['Cozinha','Banheiro','Lavabo','Soleira','Peitoril','Escada','Fachada','Outro'];

function addAmbiente(){
  var id=Date.now();
  ambientes.push({id:id,tipo:'Cozinha',pecas:[],selCuba:null,svState:{},acState:{}});
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
    h+='<div class="ambiente">';
    // Header
    h+='<div class="amb-header">';
    h+='<span class="amb-title">'+num+'º Ambiente — '+amb.tipo+'</span>';
    h+='<button class="amb-rm" data-rm-amb="'+amb.id+'">✕ Remover</button>';
    h+='</div>';
    h+='<div class="amb-body">';
    // Tipo selector
    h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:7px;">Tipo de Ambiente</div>';
    h+='<div class="amb-tipo">';
    TIPOS_AMBIENTE.forEach(function(t){
      h+='<button class="amb-tip'+(amb.tipo===t?' on':'')+'" data-amb-tipo="'+t+'" data-amb-id="'+amb.id+'">'+t+'</button>';
    });
    h+='</div>';
    // Peças
    h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin:10px 0 7px;">Peças</div>';
    h+='<div class="amb-pecas">';
    amb.pecas.forEach(function(pc,pi){
      var rm=amb.pecas.length>1?'<button style="background:none;border:none;color:var(--red);font-size:.7rem;cursor:pointer;padding:2px 5px;font-family:Outfit,sans-serif;" onclick="rmPecaAmb('+amb.id+','+pc.id+')">✕</button>':'';
      h+='<div class="peca">';
      h+='<div class="ptop"><span class="pnum">Peça '+(pi+1)+'</span>'+rm+'</div>';
      h+='<div class="f"><label>Descrição</label><input id="pd-'+pc.id+'" placeholder="Ex: Bancada" type="text" style="background:var(--s3);" value="'+escH(pc.desc||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'desc\',this.value)"></div>';
      h+='<div class="r2"><div class="f"><label>Comprimento (cm)</label><input id="pw-'+pc.id+'" placeholder="300" type="number" style="background:var(--s3);" value="'+(pc.w||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'w\',+this.value)"></div>';
      h+='<div class="f"><label>Largura (cm)</label><input id="ph-'+pc.id+'" placeholder="60" type="number" style="background:var(--s3);" value="'+(pc.h||'')+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'h\',+this.value)"></div></div>';
      h+='<div style="max-width:130px;"><div class="f"><label>Quantidade</label><input id="pq-'+pc.id+'" type="number" style="background:var(--s3);" value="'+(pc.q||1)+'" oninput="updPcAmb('+amb.id+','+pc.id+',\'q\',+this.value||1)"></div></div>';
      h+='</div>';
    });
    h+='</div>';
    // Botões de peça + IA
    h+='<div class="row" style="gap:7px;margin-bottom:10px;">';
    h+='<button class="btn btn-o" style="font-size:.73rem;padding:8px;flex:1;" data-add-peca="'+amb.id+'">+ Peça</button>';
    h+='<button class="btn-ai-sm" data-ai-amb="'+amb.id+'">✨ Descrever</button>';
    h+='</div>';
    // Serviços
    h+='<div style="font-size:.58rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold);font-weight:600;margin-bottom:7px;">Serviços</div>';
    h+=buildSVHtml(amb);
    h+='</div></div>';
  });
  container.innerHTML=h;
  }catch(e2){console.error('renderAmbientes:',e2);toast('Erro: '+e2.message);}
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
  document.getElementById('aiDesc').value='';
  document.getElementById('aiStatus').textContent='Ambiente: '+(amb?amb.tipo:'');
  document.getElementById('aiStatus').className='ai-status';
  document.getElementById('aiResultBox').style.display='none';
  document.getElementById('btnAIAplicar').style.display='none';
  showMd('aiMd');
}

// ═══ CALCULAR ═══
function calcular(){
  var cli=document.getElementById('oCliente').value.trim()||'Cliente';
  var tel=document.getElementById('oTel').value.trim()||'';
  var cidade=document.getElementById('oCidade').value.trim()||'';
  var end=document.getElementById('oEnd').value.trim()||'';
  var obs=document.getElementById('oObs').value.trim()||'';
  var mat=CFG.stones.find(function(s){return s.id===selMat;});
  if(!mat){toast('Selecione o material');return;}
  if(!ambientes.length){toast('Adicione pelo menos um ambiente');return;}

  var totalM2=0,totalAcT=0;
  var detHtml='';
  var txtAmbientes='';
  var allAcN=[];
  var allPds=[];

  ambientes.forEach(function(amb,idx){
    var tipo=amb.tipo;
    var sv=amb.svState||{};
    var g=SV_DEFS[tipo]||SV_DEFS.Cozinha;
    var m2=0,acT=0,acL=[],acN=[],sfPcs=[],pds=[];

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

    totalM2+=m2;totalAcT+=acT;
    allAcN=allAcN.concat(acN);

    var pedTamb=m2*mat.pr;
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
    detHtml+='<div class="rrow"><span class="rk">'+mat.nm+' — '+m2.toFixed(3)+'m²</span><span class="rv" style="color:var(--gold2)">R$ '+fm(pedTamb)+'</span></div>';
    acL.forEach(function(a){detHtml+='<div class="rrow"><span class="rk">'+a.l+'</span><span class="rv">R$ '+fm(a.v)+'</span></div>';});
    if(acL.length===0&&m2===0)detHtml+='<div style="font-size:.72rem;color:var(--t4);padding:2px 0;">Nenhuma peça ou serviço neste ambiente</div>';

    // Texto WA por ambiente
    var pTxt=pds.map(function(p){return '• '+(p.desc||'Peça')+' — '+p.w+'×'+p.h+'cm'+(p.q>1?' ×'+p.q:'');}).join('\n');
    if(sfPcs.length)pTxt+=(pTxt?'\n':'')+sfPcs.map(function(p){return '• '+p.l+' — '+p.w+'ml×'+p.h+'cm'+(p.q>1?' ×'+p.q:'');}).join('\n');
    var aTxt=acN.length?acN.map(function(a){return '• '+a;}).join('\n'):'';
    txtAmbientes+='\n─── '+ambLabel+' ───\n'+(pTxt||'(sem peças)')+(aTxt?'\nInclusos:\n'+aTxt:'');
  });

  var pedT=totalM2*mat.pr;
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
    return {tipo:a.tipo,pecas:JSON.parse(JSON.stringify(a.pecas)),selCuba:a.selCuba,svState:JSON.parse(JSON.stringify(a.svState||{})),acState:JSON.parse(JSON.stringify(a.acState||{}))};
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


