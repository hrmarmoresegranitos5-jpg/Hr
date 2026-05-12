// ═══ GERAR CONTRATO ═══
var _contrId=null;
function gerarContrBtn(id,e){if(e)e.stopPropagation();gerarContrato(+id||id,e);}
function gerarContrId(el,e){if(e)e.stopPropagation();var id=+el.dataset.cid;gerarContrato(id,e);}
function gerarContrato(id, e){
  try{
    if(e)e.stopPropagation();
    var q=DB.q.find(function(x){return x.id==id;});
    if(!q){toast('Orçamento não encontrado');return;}
    _contrId=id;
    var obsEl=document.getElementById('contrObs');
    if(obsEl)obsEl.value=q.obs||'';
    try{
      var hoje=new Date();
      var startDt=new Date(hoje);
      if(DB.j&&DB.j.length){
        var jobs=DB.j.filter(function(j){return j.dt;});
        jobs.sort(function(a,b){return (b.dt||'').localeCompare(a.dt||'');});
        if(jobs.length&&jobs[0].dt){
          var ld=new Date(jobs[0].dt+'T12:00:00');
          if(ld>hoje)startDt=new Date(ld);
        }
      }
      startDt.setDate(startDt.getDate()+1);
      while(startDt.getDay()===0||startDt.getDay()===6)startDt.setDate(startDt.getDate()+1);
      var el=document.getElementById('contrDataInicio');
      if(el)el.value=startDt.toISOString().slice(0,10);
      var agInfo=document.getElementById('contrAgendaInfo');
      if(agInfo){agInfo.style.display='block';agInfo.textContent='📅 Início sugerido: '+startDt.toLocaleDateString('pt-BR');}
      setTimeout(contrCalcEntrega,100);
    }catch(dateErr){console.warn('date err:',dateErr);}
    showMd('contrMd');
  }catch(err){
    console.error('gerarContrato error:',err);
    toast('Erro ao abrir contrato: '+err.message);
  }
}

function selContrPg(tipo){
  document.querySelectorAll('.contr-pg-btn').forEach(function(b){b.classList.remove('on');});
  var btn=document.querySelector('[data-pg="'+tipo+'"]');if(btn)btn.classList.add('on');
  var custom=document.getElementById('contrPgCustom');
  custom.style.display=(tipo==='personalizado')?'flex':'none';
}

function contrCalcEntrega(){
  var ini=document.getElementById('contrDataInicio');
  var prazoEl=document.getElementById('contrPrazo');
  var entEl=document.getElementById('contrDataEntrega');
  if(!ini||!ini.value||!entEl)return;
  var dt=new Date(ini.value+'T12:00:00');
  var dias=0,prazo=+prazoEl.value||15;
  while(dias<prazo){dt.setDate(dt.getDate()+1);if(dt.getDay()!==0&&dt.getDay()!==6)dias++;}
  entEl.value=dt.toISOString().slice(0,10);
}

function confirmarContrato(){
  try{
  // Ler TODOS os valores ANTES de fechar o modal
  var id=_contrId;
  var q=DB.q.find(function(x){return x.id==id;});
  if(!q){toast('Orçamento não encontrado');return;}
  var pgBtn=document.querySelector('.contr-pg-btn.on');
  var pgTipo=pgBtn?pgBtn.dataset.pg:'50_50';
  var parc=+document.getElementById('contrParc').value||0;
  var taxa=+document.getElementById('contrTaxa').value||12;
  var prazo=+document.getElementById('contrPrazo').value||15;
  var valid=+document.getElementById('contrValid').value||7;
  var obsContr=document.getElementById('contrObs').value.trim();
  var dataInicio=document.getElementById('contrDataInicio').value||'';
  var dataEntrega=document.getElementById('contrDataEntrega').value||'';
  var entPct=50,entgPct=50;
  var pgMap={'50_50':[50,50],'vista':[100,0],'30_70':[30,70],'40_60':[40,60],'60_40':[60,40],'3x':[33,67]};
  if(pgMap[pgTipo]){entPct=pgMap[pgTipo][0];entgPct=pgMap[pgTipo][1];}
  else if(pgTipo==='personalizado'){
    entPct=+document.getElementById('contrEntPct').value||50;
    entgPct=+document.getElementById('contrEntgPct').value||50;
  }
  // Agora fecha o modal com segurança
  closeAll();

  var vista=q.vista||0;
  var pgConds=[];
  var entVal=vista*(entPct/100);
  var entgVal=vista*(entgPct/100);

  // Peitoril e Soleira: recebimento só na entrega (100% pend)
  var tipoLower=(q.tipo||'').toLowerCase();
  var ehEntregaTotal=tipoLower.indexOf('peitoril')>=0||tipoLower.indexOf('soleira')>=0;

  if(entPct>0)pgConds.push({icon:'💰',txt:'<strong>Entrada ('+entPct+'%):</strong> R$ '+fm(entVal)+' no ato da assinatura'});
  if(entgPct>0&&pgTipo!=='3x')pgConds.push({icon:'💰',txt:'<strong>Entrega ('+entgPct+'%):</strong> R$ '+fm(entgVal)+' na entrega e instalação'});
  if(pgTipo==='3x'){var v3=vista/3;pgConds.push({icon:'💰',txt:'<strong>1ª:</strong> R$ '+fm(v3)+' na assinatura'},{icon:'💰',txt:'<strong>2ª:</strong> R$ '+fm(v3)+' na metade'},{icon:'💰',txt:'<strong>3ª:</strong> R$ '+fm(v3)+' na entrega'});}
  if(parc>0){var pv=vista*(1+taxa/100)/parc;pgConds.push({icon:'💳',txt:'Parcelado em '+parc+'× de R$ '+fm(pv)+' (taxa '+taxa+'%)'});}
  pgConds.push({icon:'📅',txt:'Orçamento válido por '+valid+' dias'});
  if(dataInicio){var di=new Date(dataInicio+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});pgConds.push({icon:'🔨',txt:'<strong>Início:</strong> '+di});}
  if(dataEntrega){var de=new Date(dataEntrega+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});pgConds.push({icon:'🚚',txt:'<strong>Previsão de entrega:</strong> '+de+' ('+prazo+' dias úteis)'});}
  if(obsContr)pgConds.push({icon:'📝',txt:obsContr});

  if(!DB.j)DB.j=[];
  if(!DB.t)DB.t=[];
  var _td=(q.tipo||'Serviço')+(q.mat?' · '+q.mat:'');
  if(!DB.t.some(function(t){return t.qid==q.id;})){
    if(ehEntregaTotal){
      // Peitoril/Soleira: tudo a receber na entrega
      DB.t.unshift({id:Date.now(),type:'pend',desc:'A receber 100% na entrega — '+escH(q.cli||'Cliente')+' ('+_td+')',value:vista,date:dataEntrega||new Date().toISOString().slice(0,10),qid:q.id});
      toast('⏳ Peitoril/Soleira: R$ '+fm(vista)+' registrado como a receber na entrega');
    } else {
      if(entVal>0)DB.t.unshift({id:Date.now(),type:'in',desc:'Entrada '+entPct+'% — '+escH(q.cli||'Cliente')+' ('+_td+')',value:entVal,date:new Date().toISOString().slice(0,10),qid:q.id});
      if(entgVal>0)DB.t.unshift({id:Date.now()+1,type:'pend',desc:'A receber '+entgPct+'% — '+escH(q.cli||'Cliente')+' ('+_td+')',value:entgVal,date:dataEntrega||new Date().toISOString().slice(0,10),qid:q.id});
      if(entVal>0)toast('💰 Finanças atualizadas! Entrada R$ '+fm(entVal));
    }
  }
  if(!ehEntregaTotal&&entVal>0){
    DB.j.push({id:Date.now()+2,tipo:'r',desc:'Entrada — '+escH(q.cli||'Cliente')+' ('+q.tipo+')',val:entVal,dt:new Date().toISOString().slice(0,10),status:'pendente',qid:q.id});
    if(entgVal>0)DB.j.push({id:Date.now()+3,tipo:'r',desc:'Entrega — '+escH(q.cli||'Cliente')+' ('+q.tipo+')',val:entgVal,dt:dataEntrega||new Date().toISOString().slice(0,10),status:'pendente',qid:q.id});
  } else if(ehEntregaTotal){
    DB.j.push({id:Date.now()+4,tipo:'r',desc:'Entrega — '+escH(q.cli||'Cliente')+' ('+q.tipo+')',val:vista,dt:dataEntrega||new Date().toISOString().slice(0,10),status:'pendente',qid:q.id});
  }
  DB.sv(); renderFin();
  _gerarContratoHtml(q,pgConds,prazo,valid,parc,taxa);
  }catch(err){console.error('confirmarContrato:',err);toast('Erro: '+err.message);}
}

function _gerarContratoHtml(q,pgConds,prazo,valid,parc,taxa){
  if(!q){toast('Orçamento não encontrado');return;}
  var emp=CFG.emp;
  var hoje=new Date();
  var dataStr=hoje.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  var dataSimples=hoje.toLocaleDateString('pt-BR');
  var tipo=(q.tipo||'Outro');
  var garantiaMeses=12;

  // Montar lista de peças
  var pecasHtml='';
  (q.pds||[]).forEach(function(p,i){
    pecasHtml+='<tr><td>'+(i+1)+'</td><td>'+(p.desc||'Peça')+'</td><td>'+p.w+'×'+p.h+' cm</td><td>'+(p.q||1)+'</td><td>'+((p.w/100)*(p.h/100)*(p.q||1)).toFixed(3)+' m²</td></tr>';
  });
  (q.sfPcs||[]).forEach(function(p,i){
    pecasHtml+='<tr><td>+</td><td>'+(p.l||'Serviço')+'</td><td>'+p.w+'ml × '+p.h+' cm</td><td>'+(p.q||1)+'</td><td>'+p.m2.toFixed(3)+' m²</td></tr>';
  });

  // Serviços inclusos
  var svHtml=(q.acN&&q.acN.length)?q.acN.map(function(s){return '<li>'+s+'</li>';}).join(''):'<li>Acabamento e instalação profissional</li>';

  var html='<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8">'
  +'<meta name="viewport" content="width=device-width,initial-scale=1">'
  +'<title>Contrato — '+q.cli+'</title>'
  +'<style>'
  +'*{margin:0;padding:0;box-sizing:border-box;}'
  +'body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;padding:0;}'
  +'.page{max-width:780px;margin:0 auto;padding:0 0 40px;}'
  // Header
  +'.hdr{background:#0f0c00;padding:22px 36px;display:flex;justify-content:space-between;align-items:center;}'
  +'.hdr-logo{font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:-.3px;}'
  +'.hdr-tag{font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.5);margin-top:3px;}'
  +'.hdr-info{text-align:right;color:rgba(255,255,255,.7);font-size:10px;line-height:1.7;}'
  +'.hdr-info span{color:#C9A84C;font-weight:700;}'
  // Title strip
  +'.title-strip{background:#f7f2e8;border-bottom:3px solid #C9A84C;padding:14px 36px;display:flex;justify-content:space-between;align-items:center;}'
  +'.title-main{font-size:16px;font-weight:900;color:#3a2000;letter-spacing:-.2px;}'
  +'.title-num{font-size:10px;color:#999;}'
  // Body
  +'.body{padding:24px 36px;}'
  +'.section{margin-bottom:22px;}'
  +'.sec-title{font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #e8d89c;padding-bottom:5px;margin-bottom:12px;}'
  +'.row2{display:grid;grid-template-columns:1fr 1fr;gap:16px;}'
  +'.field{margin-bottom:8px;}'
  +'.field label{display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;}'
  +'.field span{font-size:12px;font-weight:700;color:#1a1a1a;}'
  // Table
  +'table{width:100%;border-collapse:collapse;font-size:11px;}'
  +'th{background:#0f0c00;color:#C9A84C;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;}'
  +'td{padding:7px 10px;border-bottom:1px solid #f0e8d8;}'
  +'tr:last-child td{border-bottom:none;}'
  +'tr:nth-child(even) td{background:#faf5ea;}'
  // Prices
  +'.price-box{background:#0f0c00;border-radius:10px;padding:16px 20px;margin-bottom:16px;}'
  +'.price-row{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;}'
  +'.price-label{font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;}'
  +'.price-val{font-size:14px;font-weight:900;color:#C9A84C;}'
  +'.price-val.main{font-size:22px;}'
  +'.price-val.gray{color:rgba(255,255,255,.4);font-size:12px;}'
  +'.price-divider{border:none;border-top:1px solid rgba(201,168,76,.2);margin:8px 0;}'
  // Conditions
  +'.cond-item{display:flex;gap:10px;align-items:flex-start;margin-bottom:9px;padding:9px 12px;background:#f9f5ef;border-left:3px solid #C9A84C;border-radius:0 6px 6px 0;}'
  +'.cond-num{font-size:11px;font-weight:900;color:#C9A84C;min-width:18px;}'
  +'.cond-text{font-size:11px;color:#333;line-height:1.5;}'
  // Guarantee
  +'.guarantee{background:#e8f4e8;border:1px solid #a8d4a8;border-radius:8px;padding:14px 16px;margin-bottom:16px;}'
  +'.guarantee-title{font-size:11px;font-weight:900;color:#2a6a2a;margin-bottom:6px;}'
  +'.guarantee-text{font-size:11px;color:#2a4a2a;line-height:1.6;}'
  // Signature
  +'.sig-area{display:grid;grid-template-columns:1fr 1fr;gap:30px;margin-top:40px;}'
  +'.sig-line{border-top:1px solid #333;padding-top:8px;}'
  +'.sig-name{font-size:11px;font-weight:700;}'
  +'.sig-role{font-size:9px;color:#666;margin-top:2px;}'
  +'.sig-date{font-size:9px;color:#999;margin-top:6px;}'
  // Footer
  +'.foot{background:#0f0c00;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;margin-top:24px;}'
  +'.foot span{font-size:9px;color:rgba(201,168,76,.4);}'
  +'ul{padding-left:16px;}'
  +'ul li{margin-bottom:4px;font-size:11px;color:#333;}'
  +'@media print{body{padding:0;}.page{max-width:100%;}}'
  +'</style></head><body>'
  +'<div class="page">'

  // HEADER
  +'<div class="hdr">'
    +'<div style="display:flex;align-items:center;gap:12px;">'
    +(emp.logoUrl?'<img src="'+emp.logoUrl+'" style="width:52px;height:52px;border-radius:50%;object-fit:cover;border:2px solid rgba(201,168,76,.4);">':'<div style="width:52px;height:52px;border-radius:50%;background:linear-gradient(145deg,#C9A84C,#8B6014);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1.2rem;color:#1a0e00;">HR</div>')
    +'<div><div class="hdr-logo">'+emp.nome+'</div><div class="hdr-tag">Mármores · Granitos · Quartzitos</div></div>'
    +'</div>'
    +'<div class="hdr-info">'
      +'<span>'+emp.tel+'</span><br>'
      +emp.end+'<br>'
      +emp.cidade+'<br>'
      +'CNPJ: '+emp.cnpj
    +'</div>'
  +'</div>'

  // TITLE
  +'<div class="title-strip">'
    +'<div class="title-main">📜 CONTRATO DE FORNECIMENTO E INSTALAÇÃO</div>'
    +'<div class="title-num">Nº '+String(q.id).slice(-6)+' · '+dataSimples+'</div>'
  +'</div>'

  +'<div class="body">'

  // PARTES
  +'<div class="section">'
  +'<div class="sec-title">Partes Contratantes</div>'
  +'<div class="row2">'
    +'<div>'
      +'<div class="field"><label>Contratada</label><span>'+emp.nome+'</span></div>'
      +'<div class="field"><label>CNPJ</label><span>'+emp.cnpj+'</span></div>'
      +'<div class="field"><label>Endereço</label><span>'+emp.end+'</span></div>'
      +'<div class="field"><label>Telefone</label><span>'+emp.tel+'</span></div>'
    +'</div>'
    +'<div>'
      +'<div class="field"><label>Contratante (Cliente)</label><span>'+escH(q.cli||'')+'</span></div>'
      +(q.tel?'<div class="field"><label>Telefone</label><span>'+escH(q.tel)+'</span></div>':'')
      +(q.end?'<div class="field"><label>Endereço de entrega</label><span>'+escH(q.end)+'</span></div>':'')
      +(q.cidade?'<div class="field"><label>Cidade</label><span>'+escH(q.cidade)+'</span></div>':'')
    +'</div>'
  +'</div>'
  +'</div>'

  // OBJETO
  +'<div class="section">'
  +'<div class="sec-title">Objeto do Contrato</div>'
  +'<div class="field" style="margin-bottom:12px;"><label>Tipo de Serviço</label><span>'+tipo+'</span></div>'
  +'<div class="field" style="margin-bottom:12px;"><label>Material</label><span>'+(q.mat||'Granito/Mármore')+' — R$ '+(q.matPr||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'/m²</span></div>'
  +(pecasHtml?'<table><thead><tr><th>Nº</th><th>Descrição</th><th>Medidas</th><th>Qtd</th><th>Área</th></tr></thead><tbody>'+pecasHtml+'</tbody></table>':'')
  +'<div style="margin-top:12px;"><div class="field"><label>Total de m²</label><span>'+fm(q.m2||0)+' m²</span></div></div>'
  +'</div>'

  // SERVIÇOS
  +'<div class="section">'
  +'<div class="sec-title">Serviços Inclusos</div>'
  +'<ul>'+svHtml+'<li>Fabricação e acabamento completo</li></ul>'
  +(q.obs?'<div style="margin-top:10px;" class="field"><label>Observações</label><span>'+escH(q.obs)+'</span></div>':'')
  +'</div>'

  // VALORES
  +'<div class="section">'
  +'<div class="sec-title">Valores e Pagamento</div>'
  +'<div class="price-box">'
    +'<div class="price-row"><span class="price-label">Valor à vista (melhor preço)</span><span class="price-val main">R$ '+fm(q.vista||0)+'</span></div>'
    +'<hr class="price-divider">'
    +'<div class="price-row"><span class="price-label">Parcelado em até 8×</span><span class="price-val gray">R$ '+fm(q.parc||0)+' — 8× de R$ '+fm(q.p8||0)+'</span></div>'
  +'</div>'
  +'<div class="cond-item"><div class="cond-num">💰</div><div class="cond-text"><strong>Entrada:</strong> 50% no ato da assinatura do contrato — R$ '+fm((q.vista||0)/2)+'</div></div>'
  +'<div class="cond-item"><div class="cond-num">💰</div><div class="cond-text"><strong>Entrega:</strong> 50% na entrega e instalação — R$ '+fm((q.vista||0)/2)+'</div></div>'
  +'<div class="cond-item"><div class="cond-num">📅</div><div class="cond-text">Parcelamento no cartão acarreta acréscimo de 12% sobre o valor total. Máximo 8 parcelas.</div></div>'
  +'<div class="cond-item"><div class="cond-num">💡</div><div class="cond-text">Orçamento com validade de 7 dias. Após este prazo, sujeito a reajuste de materiais.</div></div>'
  +'</div>'

  // CONDIÇÕES GERAIS
  +'<div class="section">'
  +'<div class="sec-title">Condições Gerais</div>'
  +'<div class="cond-item"><div class="cond-num">1</div><div class="cond-text">A <strong>'+emp.nome+'</strong> se compromete a fornecer o material e executar os serviços descritos neste contrato dentro do prazo acordado verbalmente entre as partes.</div></div>'
  +'<div class="cond-item"><div class="cond-num">2</div><div class="cond-text">O prazo de entrega começa a contar após o pagamento da entrada e confirmação das medidas definitivas pelo cliente.</div></div>'
  +'<div class="cond-item"><div class="cond-num">3</div><div class="cond-text">Variações naturais de cor, veios e textura são características próprias de pedras naturais (granito, mármore, quartzito) e não constituem defeito de fabricação.</div></div>'
  +'<div class="cond-item"><div class="cond-num">4</div><div class="cond-text">O cliente é responsável por garantir o acesso ao local, bem como que a estrutura de apoio (gabinetes, paredes) esteja pronta e nivelada no dia da instalação.</div></div>'
  +'<div class="cond-item"><div class="cond-num">5</div><div class="cond-text">Alterações no projeto após a aprovação das medidas poderão gerar custos adicionais, sujeitos a novo orçamento.</div></div>'
  +'<div class="cond-item"><div class="cond-num">6</div><div class="cond-text">A rescisão do contrato após o início da produção implicará cobrança mínima de 40% do valor total para cobrir materiais e mão de obra já executados.</div></div>'
  +'<div class="cond-item"><div class="cond-num">7</div><div class="cond-text"><strong>Prazo e brindes por atraso:</strong> Prazo de entrega: <strong>'+prazo+' dias úteis</strong> após pagamento da entrada. Em caso de atraso por responsabilidade da contratada, a cada <strong>5 dias</strong> de atraso será concedido um brinde ao cliente como compensação.</div></div>'
  +'</div>'

  // GARANTIA
  +'<div class="section">'
  +'<div class="sec-title">Garantia</div>'
  +'<div class="guarantee">'
    +'<div class="guarantee-title">✅ Garantia de '+garantiaMeses+' meses</div>'
    +'<div class="guarantee-text">'
      +'A <strong>'+emp.nome+'</strong> oferece garantia de <strong>'+garantiaMeses+' ('+_numPorExtenso(garantiaMeses)+') meses</strong> contra defeitos de fabricação e instalação, a contar da data de entrega.<br><br>'
      +'<strong>Coberto:</strong> Trincas por má execução, falhas no acabamento, problemas de instalação causados pela contratada.<br><br>'
      +'<strong>Não coberto:</strong> Danos por mau uso, impactos físicos, produtos químicos inadequados, infiltrações ou problemas estruturais do imóvel.'
    +'</div>'
  +'</div>'
  +'</div>'

  // ASSINATURAS
  +'<div class="section">'
  +'<div class="sec-title">Assinaturas</div>'
  +'<div style="text-align:center;font-size:11px;color:#666;margin-bottom:24px;">'+q.cidade+', '+dataStr+'</div>'
  +'<div class="sig-area">'
    +'<div><div class="sig-line"><div class="sig-name">'+emp.nome+'</div><div class="sig-role">Contratada · CNPJ: '+emp.cnpj+'</div></div></div>'
    +'<div><div class="sig-line"><div class="sig-name">'+escH(q.cli||'')+'</div><div class="sig-role">Contratante · CPF: ___________________</div></div></div>'
  +'</div>'
  +'</div>'

  +'</div>' // body

  +'<div class="foot">'
    +'<span>'+emp.nome+' · '+emp.cnpj+'</span>'
    +'<span>Contrato gerado em '+dataSimples+' · HR App</span>'
  +'</div>'
  +'</div>' // page

  +'<script>window.addEventListener("load",function(){setTimeout(function(){window.print();},500);});<\/script>'
  +'</body></html>';

  // ── Abrir overlay PDF igual ao orçamento ──
  function _abrirContratoOverlay(){
    var nomeCliente=(q.cli||'cliente').replace(/\s+/g,'_').toLowerCase();
    var fileName='Contrato_'+nomeCliente+'_HR.pdf';

    var ov=document.createElement('div');
    ov.id='contrPdfOv';
    ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:9999;display:flex;flex-direction:column;';

    var barEl=document.createElement('div');
    barEl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 13px;background:#0a1520;border-bottom:1px solid rgba(96,160,224,.4);flex-shrink:0;flex-wrap:wrap;';
    barEl.innerHTML=''
      +'<span style="flex:1;font-size:.75rem;color:#60a0e0;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">\u{1F4DC} Contrato \u2014 '+(q.cli||'')+'</span>'
      +'<button id="ctrBtnClose" style="background:transparent;border:1px solid rgba(96,160,224,.35);color:rgba(96,160,224,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">\u2715</button>'
      +'<button id="ctrBtnDown" disabled style="background:#0d2035;border:1px solid rgba(96,160,224,.2);color:rgba(96,160,224,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">\u23F3 Gerando...</button>'
      +(navigator.share?'<button id="ctrBtnShare" disabled style="background:#0d2035;border:1px solid rgba(96,160,224,.2);color:rgba(96,160,224,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">\u2197 Compartilhar</button>':'')
      +'<button id="ctrBtnPrint" style="background:#60a0e0;border:none;color:#000;padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">\u{1F5A8} Imprimir</button>';

    var preview=document.createElement('div');
    preview.style.cssText='flex:1;overflow-y:auto;background:#333;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
    preview.innerHTML='<div style="text-align:center;color:#60a0e0;padding:60px 20px;font-family:Outfit,sans-serif;font-size:.85rem;">\u23F3 Gerando PDF...</div>';

    ov.appendChild(barEl);
    ov.appendChild(preview);
    document.body.appendChild(ov);

    document.getElementById('ctrBtnClose').onclick=function(){ov.remove();};
    document.getElementById('ctrBtnPrint').onclick=function(){
      var w=window.open('','_blank');
      if(w){w.document.write(html);w.document.close();}
    };

    var _cIframe=document.createElement('iframe');
    _cIframe.style.cssText='position:fixed;left:-9999px;top:0;width:780px;height:2400px;border:none;background:#fff;';
    document.body.appendChild(_cIframe);
    _cIframe.contentDocument.open();
    _cIframe.contentDocument.write(html);
    _cIframe.contentDocument.close();

    setTimeout(function(){
      var target=_cIframe.contentDocument.querySelector('.page')||_cIframe.contentDocument.body;
      html2canvas(target,{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:780,windowWidth:780,foreignObjectRendering:false})
      .then(function(canvas){
        if(document.body.contains(_cIframe))document.body.removeChild(_cIframe);
        var jsPDF=window.jspdf.jsPDF;
        var pageW=595.28;
        var pageH=pageW*(canvas.height/canvas.width);
        var pdf=new jsPDF({orientation:'portrait',unit:'pt',format:[pageW,pageH]});
        pdf.addImage(canvas.toDataURL('image/jpeg',0.96),'JPEG',0,0,pageW,pageH);
        var pdfBlob=pdf.output('blob');

        var img=document.createElement('img');
        img.src=canvas.toDataURL('image/jpeg',0.88);
        img.style.cssText='width:100%;max-width:780px;display:block;box-shadow:0 4px 32px rgba(0,0,0,.6);';
        preview.innerHTML='';preview.appendChild(img);

        function enableBtn(id,label,cb){
          var b=document.getElementById(id);if(!b)return;
          b.innerHTML=label;b.disabled=false;
          b.style.color='#60a0e0';b.style.borderColor='rgba(96,160,224,.55)';b.style.background='#0d2035';
          b.onclick=cb;
        }

        enableBtn('ctrBtnDown','\u2B07 Salvar PDF',function(){
          var url=URL.createObjectURL(pdfBlob);
          var a=document.createElement('a');
          a.href=url;a.download=fileName;
          document.body.appendChild(a);a.click();document.body.removeChild(a);
          setTimeout(function(){URL.revokeObjectURL(url);},30000);
          toast('\u{1F4C4} Contrato salvo!');
        });

        if(navigator.share){
          enableBtn('ctrBtnShare','\u2197 Compartilhar',function(){
            var pdfFile=new File([pdfBlob],fileName,{type:'application/pdf'});
            var sd={title:'Contrato \u2014 '+(q.cli||''),text:(CFG.emp.nome||'HR M\u00e1rmores')};
            if(navigator.canShare&&navigator.canShare({files:[pdfFile]}))sd.files=[pdfFile];
            navigator.share(sd).catch(function(){});
          });
        }

        toast('\u2713 Contrato pronto!');

        // Perguntar sobre financeiro
        setTimeout(function(){
          if(typeof showCB==='function'){
            var entVal=(q.vista||0)*0.5;
            showCB('Lançar entrada de R$ '+fm(entVal)+' de '+(q.cli||'Cliente')+' nas Finanças?',
              function(){
                addTr('in','Entrada 50% \u2014 '+(q.cli||'Cliente')+' ('+(q.tipo||'')+')',entVal);
                addTr('pend','Restante 50% \u2014 '+(q.cli||'Cliente')+' ('+(q.tipo||'')+')' ,(q.vista||0)-entVal);
                hideCB();toast('\u2705 Lan\u00e7ado nas Finan\u00e7as!');
              },
              function(){hideCB();}
            );
          }
        },700);

      }).catch(function(){
        if(document.body.contains(_cIframe))document.body.removeChild(_cIframe);
        preview.innerHTML='<div style="text-align:center;color:#c94444;padding:40px 20px;font-family:Outfit,sans-serif;font-size:.82rem;">Erro ao gerar. Use Imprimir.</div>';
      });
    },300);
  }

  if(typeof html2canvas==='undefined'||typeof window.jspdf==='undefined'){
    toast('Carregando bibliotecas PDF...');
    var _s1=document.createElement('script');
    _s1.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    _s1.onload=function(){
      var _s2=document.createElement('script');
      _s2.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      _s2.onload=_abrirContratoOverlay;
      document.head.appendChild(_s2);
    };
    document.head.appendChild(_s1);
  } else {
    _abrirContratoOverlay();
  }
}

function _numPorExtenso(n){
  var m={6:'seis',12:'doze',3:'três',1:'um'};
  return m[n]||String(n);
}

// ═══ FECHAR SERVIÇO ═══
function fecharServico(id,e){
  if(e){e.stopPropagation();e.preventDefault();}
  var q=DB.q.find(function(x){return x.id==id;});
  if(!q){toast('Orçamento não encontrado');return;}
  if(q.status==='fechado'){toast('Serviço já fechado');return;}
  // confirm() quebra em PWA — usa toast duplo com timeout
  toast('✔ Fechando serviço de '+(q.cli||'cliente')+'...');
  setTimeout(function(){
    q.status='fechado';
    if(!DB.t)DB.t=[];
    if(!DB.t.some(function(t){return t.qid==id;})){
      var fe=Math.round((q.vista||0)*0.5),fr=(q.vista||0)-fe;
      var td=(q.tipo||'Serviço')+(q.mat?' · '+q.mat:'');
      DB.t.unshift({id:Date.now(),type:'in',desc:'Entrada 50% — '+(q.cli||'Cliente')+' ('+td+')',value:fe,date:new Date().toISOString().slice(0,10),qid:id});
      DB.t.unshift({id:Date.now()+1,type:'pend',desc:'A receber 50% — '+(q.cli||'Cliente')+' ('+td+')',value:fr,date:new Date().toISOString().slice(0,10),qid:id});
    }
    DB.sv(); renderOrc(); renderFin();
    toast('✅ Fechado! Finanças atualizadas!');
    setTimeout(function(){gerarContrato(id,null);},400);
  },200);
}

// ═══ LANÇAR FINANCEIRO HISTÓRICO ═══
function lancFinHist(id,e){
  if(e){e.stopPropagation();e.preventDefault();}
  var q=(DB.q||[]).find(function(x){return x.id==id;});
  if(!q){toast('Não encontrado');return;}
  if(!DB.t)DB.t=[];
  if(DB.t.some(function(t){return t.qid==id;})){toast('✅ Já lançado!');return;}
  var ent=Math.round((q.vista||0)*0.5),rest=(q.vista||0)-ent;
  var td=(q.tipo||'Serviço')+(q.mat?' · '+q.mat:'');
  DB.t.unshift({id:Date.now(),type:'in',desc:'Entrada 50% — '+(q.cli||'Cliente')+' ('+td+')',value:ent,date:new Date().toISOString().slice(0,10),qid:id});
  DB.t.unshift({id:Date.now()+1,type:'pend',desc:'A receber 50% — '+(q.cli||'Cliente')+' ('+td+')',value:rest,date:new Date().toISOString().slice(0,10),qid:id});
  DB.sv(); renderFin();
  toast('💰 Lançado! R$ '+fm(ent)+' entrada + R$ '+fm(rest)+' a receber');
}
function orcIrFinancas(id,e){
  if(e){e.stopPropagation();e.preventDefault();}
  go(4);
  setTimeout(function(){
    if(!(DB.t||[]).some(function(t){return t.qid==id;})) lancFinHist(id,null);
    else toast('✅ Já nas Finanças');
  },320);
}
// ═══ BACKUP ═══
function baixarBackup(){
  var dados={cfg:CFG,q:DB.q,j:DB.j,t:DB.t};
  var json=JSON.stringify(dados);
  var dt=new Date().toLocaleDateString('pt-BR').replace(/\//g,'-');
  var fname='HR_Backup_'+dt+'.json';
  var blob=new Blob([json],{type:'application/json'});
  if(navigator.share){
    var file=new File([blob],fname,{type:'application/json'});
    navigator.share({files:[file],title:'Backup HR Mármores'})
      .then(function(){toast('✓ Backup compartilhado!');})
      .catch(function(){_baixarViaLink(json,fname);});
    return;
  }
  _baixarViaLink(json,fname);
}
function _baixarViaLink(json,fname){
  var uri='data:application/json;charset=utf-8,'+encodeURIComponent(json);
  var a=document.createElement('a');
  a.href=uri;a.download=fname;a.target='_blank';
  document.body.appendChild(a);a.click();
  setTimeout(function(){document.body.removeChild(a);},1000);
  toast('📥 Backup salvo! Verifique seus Downloads.');
}

function carregarBackup(input){
  var file=input.files[0];if(!file)return;
  var reader=new FileReader();
  reader.onload=function(e){
    try{
      var d=JSON.parse(e.target.result);
      if(d.cfg){CFG=d.cfg;localStorage.setItem('hr_cfg',JSON.stringify(CFG));}
      if(d.q)DB.q=d.q;if(d.j)DB.j=d.j;if(d.t)DB.t=d.t;
      DB.sv();
      toast('✓ Backup restaurado! Recarregando...');
      setTimeout(function(){location.reload();},900);
    }catch(err){toast('❌ Arquivo inválido');}
  };
  reader.readAsText(file);
}



// ═══ IA — INTERPRETAR DESCRIÇÃO ═══
var _aiResultData = null;

function aiInterpretar(){
  var desc = document.getElementById('aiDesc').value.trim();
  if(!desc){toast('Descreva o projeto primeiro');return;}

  var st = document.getElementById('aiStatus');
  var btn = document.getElementById('btnAIEnviar');
  st.className='ai-status loading';
  st.textContent='⏳ Interpretando...';
  btn.disabled=true;btn.textContent='⏳ Aguarde...';
  document.getElementById('aiResultBox').style.display='none';
  document.getElementById('btnAIAplicar').style.display='none';

  var prompt = 'Você é um assistente especializado em orçamentos de mármore e granito.\n'
    +'O cliente descreveu o projeto:\n"'+desc+'"\n\n'
    +'Extraia os itens e retorne APENAS JSON válido, sem markdown:\n'
    +'{\n'
    +'  "pecas":[\n'
    +'    {"desc":"Bancada principal","w":350,"h":60,"q":1}\n'
    +'  ],\n'
    +'  "servicos":[\n'
    +'    {"k":"s_reta","label":"Sainha Reta","ml":4.2,"altCm":6},\n'
    +'    {"k":"forn","label":"Furo Torneira","un":1},\n'
    +'    {"k":"inst","label":"Instalação Padrão"},\n'
    +'    {"k":"ac_sifao","label":"Sifão","un":1}\n'
    +'  ]\n'
    +'}\n\n'
    +'Keys de serviços válidas:\n'
    +'Sainha: s_reta, s_45, s_boleada, s_slim\n'
    +'Frontão: frontao (inclua ml e altCm)\n'
    +'Soleira: sol1 (1 lado), sol2 (2 lados) — ml calculado automaticamente\n'
    +'Peitoril: peit_reto, peit_ping, peit_col, peit_portal (inclua ml) + peit_acb1/peit_acb2 para acabamento\n'
    +'Furos/recortes: forn, fralo, cook (inclua un)\n'
    +'Rebaixo: reb_n, reb_a\n'
    +'Fixação: tubo, cant (inclua un)\n'
    +'Instalação: inst, inst_c\n'
    +'Acessórios: ac_sifao, ac_flex, ac_veda, ac_sil, ac_paraf, ac_sup (inclua un)\n'
    +'Deslocamento: desl_for (inclua km como un)\n\n'
    +'Regras: w e h em cm; sainha/frontão sempre com ml e altCm (padrão 6cm); retorne SÓ o JSON.';

  fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization':'Bearer '+((CFG.emp&&CFG.emp.apiKey)||'')
    },
    body:JSON.stringify({
      model:'gpt-4o',
      max_tokens:1500,
      messages:[{role:'user',content:prompt}]
    })
  })
  .then(function(r){return r.json();})
  .then(function(data){
    btn.disabled=false;btn.textContent='✨ Interpretar com ChatGPT';
    if(data.error){
      // API key not configured — try local parse fallback
      st.className='ai-status err';
      st.textContent='❌ '+data.error.message+'\n\nDica: configure sua API Key em Config → Empresa.';
      return;
    }
    var txt=(data.choices&&data.choices[0]&&data.choices[0].message&&data.choices[0].message.content)||data.content&&data.content[0]?data.content[0].text:'';
    txt=txt.replace(/```json\s*/gi,'').replace(/```\s*/g,'').trim();
    var parsed;
    try{parsed=JSON.parse(txt);}
    catch(e){
      st.className='ai-status err';
      st.textContent='❌ Não consegui interpretar. Descreva com mais detalhes.';
      return;
    }
    _aiResultData=parsed;
    aiMostrarResultado(parsed);
    st.className='ai-status ok';
    st.textContent='✓ Projeto interpretado! Revise e aplique.';
  })
  .catch(function(){
    btn.disabled=false;btn.textContent='✨ Interpretar com ChatGPT';
    // Try local rule-based fallback
    aiFallbackLocal(desc,st);
  });
}

// Fallback local sem API — interpreta regras simples
function aiFallbackLocal(desc,st){
  var d=desc.toLowerCase();
  var parsed={pecas:[],servicos:[]};

  // Extract dimensions like 350x60, 350×60, 350 x 60
  var dimRe=/(\d+)\s*[x×]\s*(\d+)/g;
  var dims=[];var m;
  while((m=dimRe.exec(d))!==null)dims.push({w:+m[1],h:+m[2]});

  // Build peças
  if(dims.length===0){
    // Try to find single numbers as hints
    var nums=d.match(/\d+/g)||[];
    if(nums.length>=2)dims.push({w:+nums[0],h:+nums[1]});
  }
  var labels=['Bancada principal','Bancada lateral','Peça 3','Peça 4'];
  dims.forEach(function(dim,i){
    parsed.pecas.push({desc:labels[i]||('Peça '+(i+1)),w:dim.w,h:dim.h,q:1});
  });

  // Detect services by keywords
  var svMap=[
    {keys:['sainha reta','reta'],k:'s_reta',label:'Sainha Reta',ml:dims.length?dims[0].w/100:2,altCm:6},
    {keys:['sainha 45','45°','45 grau'],k:'s_45',label:'Sainha 45°',ml:2,altCm:6},
    {keys:['boleada','boleado'],k:'s_boleada',label:'Sainha Boleada',ml:2,altCm:6},
    {keys:['slim'],k:'s_slim',label:'Sainha Slim',ml:2,altCm:4},
    {keys:['frontão','frontao'],k:'frontao',label:'Frontão',ml:dims.length>1?dims[1].w/100:1.2,altCm:30},
    {keys:['furo torneira','torneira'],k:'forn',label:'Furo Torneira',un:1},
    {keys:['furo ralo','ralo'],k:'fralo',label:'Furo Ralo',un:1},
    {keys:['cooktop','cook top'],k:'cook',label:'Recorte Cooktop',un:1},
    {keys:['rebaixo americano','americano'],k:'reb_a',label:'Rebaixo Americano'},
    {keys:['rebaixo'],k:'reb_n',label:'Rebaixo Normal'},
    {keys:['cuba inox','cuba'],k:'cuba_coz',label:'Cuba Inox',u:'cuba'},
    {keys:['cantoneira'],k:'cant',label:'Cantoneira',un:2},
    {keys:['tubo metálico','tubo'],k:'tubo',label:'Tubo Metálico',un:2},
    {keys:['instalação complexa','instalacao complexa','complexa'],k:'inst_c',label:'Instalação Complexa'},
    {keys:['instalação','instalacao'],k:'inst',label:'Instalação Padrão'},
    {keys:['sifão','sifao'],k:'ac_sifao',label:'Sifão',un:1},
    {keys:['flexível','flexivel','flex'],k:'ac_flex',label:'Flexível',un:1},
    {keys:['silicone'],k:'ac_sil',label:'Silicone',un:1},
    {keys:['suporte','mão francesa','mao francesa'],k:'ac_sup',label:'Suporte',un:2},
    {keys:['soleira 2','dois lados','2 lados'],k:'sol2',label:'Soleira 2 lados',ml:1},
    {keys:['soleira'],k:'sol1',label:'Soleira 1 lado',ml:1},
    {keys:['peitoril'],k:'peit_reto',label:'Peitoril',ml:1.4}
  ];
  var added={};
  svMap.forEach(function(sv){
    if(added[sv.k])return;
    if(sv.keys.some(function(kw){return d.indexOf(kw)>=0;})){
      var item={k:sv.k,label:sv.label};
      if(sv.ml!==undefined){item.ml=sv.ml;item.altCm=sv.altCm||6;}
      if(sv.un!==undefined)item.un=sv.un;
      parsed.servicos.push(item);
      added[sv.k]=true;
    }
  });

  if(parsed.pecas.length===0&&parsed.servicos.length===0){
    st.className='ai-status err';
    st.textContent='❌ Sem internet e não consegui interpretar. Descreva com dimensões como "350×60cm".';
    return;
  }
  _aiResultData=parsed;
  aiMostrarResultado(parsed);
  st.className='ai-status ok';
  st.textContent='✓ Interpretado localmente (sem internet). Revise os itens!';
}

function aiMostrarResultado(parsed){
  var h='';
  // Peças
  if(parsed.pecas&&parsed.pecas.length){
    h+='<div style="font-size:.6rem;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">📐 Peças</div>';
    parsed.pecas.forEach(function(p,i){
      var mat=CFG.stones.find(function(s){return s.id===selMat;});
      var m2=p.w&&p.h?(p.w/100)*(p.h/100)*(p.q||1):0;
      var prev=mat&&m2?'≈ R$ '+fm(m2*mat.pr):'';
      h+='<div class="ai-piece">'
       +'<div class="ai-piece-chk on" data-aipc="'+i+'">✓</div>'
       +'<div class="ai-piece-info">'
       +'<div class="ai-piece-name">'+(p.desc||'Peça')+'</div>'
       +'<div class="ai-piece-dim">'+p.w+'×'+p.h+'cm'+(p.q>1?' × '+p.q:'')+(prev?' · <span style="color:var(--grn)">'+prev+'</span>':'')+'</div>'
       +'</div></div>';
    });
  }
  // Serviços e Acessórios separados
  var svs=(parsed.servicos||[]).filter(function(s){return !s.k.startsWith('ac_');});
  var acs=(parsed.servicos||[]).filter(function(s){return s.k.startsWith('ac_');});
  if(svs.length){
    h+='<div style="font-size:.6rem;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin:10px 0 6px;">🔧 Serviços</div>';
    svs.forEach(function(s,i){
      var idx=(parsed.pecas||[]).length+i;
      var detalhe='';
      if(s.ml)detalhe=' — '+s.ml+'ml'+(s.altCm?' × '+s.altCm+'cm':'');
      else if(s.un&&s.un>1)detalhe=' — '+s.un+'×';
      var pr=getPr(s.k);
      h+='<div class="ai-piece">'
       +'<div class="ai-piece-chk on" data-aisv="'+(parsed.servicos.indexOf(s))+'">✓</div>'
       +'<div class="ai-piece-info">'
       +'<div class="ai-piece-name">'+(s.label||s.k)+'</div>'
       +'<div class="ai-piece-dim">'+(pr?'R$ '+pr:'')+''+detalhe+'</div>'
       +'</div></div>';
    });
  }
  if(acs.length){
    h+='<div style="font-size:.6rem;color:var(--t3);letter-spacing:1.5px;text-transform:uppercase;margin:10px 0 6px;">🔩 Acessórios</div>';
    acs.forEach(function(s){
      var detalhe=s.un?(' — '+s.un+'×'):'';
      var pr=getPr(s.k);
      h+='<div class="ai-piece">'
       +'<div class="ai-piece-chk on" data-aisv="'+(parsed.servicos.indexOf(s))+'">✓</div>'
       +'<div class="ai-piece-info">'
       +'<div class="ai-piece-name">'+(s.label||s.k)+'</div>'
       +'<div class="ai-piece-dim">'+(pr?'R$ '+pr:'')+''+detalhe+'</div>'
       +'</div></div>';
    });
  }
  if(!parsed.pecas.length&&!parsed.servicos.length){
    h='<div style="color:var(--t3);font-size:.8rem;text-align:center;padding:16px;">Nenhum item identificado. Tente descrever com mais detalhes.</div>';
  }
  document.getElementById('aiResultList').innerHTML=h;
  document.getElementById('aiResultBox').style.display='block';
  document.getElementById('btnAIAplicar').style.display='block';
  // Toggle checkmarks
  document.getElementById('aiResultList').addEventListener('click',function(e){
    var chk=e.target.closest('[data-aipc],[data-aisv]');
    if(chk)chk.classList.toggle('on');
  });
}

function aiAplicar(){
  if(!_aiResultData)return;
  var ambId=_aiAmbId;
  var amb=ambientes.find(function(a){return a.id===ambId;});
  if(!amb)amb=ambientes[0];
  if(!amb)return;
  var applied=0;

  // Apply peças
  (_aiResultData.pecas||[]).forEach(function(p,i){
    var chk=document.querySelector('[data-aipc="'+i+'"]');
    if(!chk||!chk.classList.contains('on'))return;
    var existing=amb.pecas[0];
    if(existing&&!existing.w&&!existing.h&&!existing.desc){
      // Fill the empty first peca
      existing.desc=p.desc||'Peça';
      existing.w=+p.w||0;
      existing.h=+p.h||0;
      existing.q=+p.q||1;
    } else {
      amb.pecas.push({id:Date.now()+i,desc:p.desc||'Peça',w:+p.w||0,h:+p.h||0,q:+p.q||1});
    }
    applied++;
  });

  // Apply serviços
  if(!amb.svState)amb.svState={};
  (_aiResultData.servicos||[]).forEach(function(s,i){
    var chk=document.querySelector('[data-aisv="'+i+'"]');
    if(!chk||!chk.classList.contains('on'))return;
    var sv={ml:s.ml||0,altCm:s.altCm||6,q:s.q||1,qty:s.un||1};
    amb.svState[s.k]=sv;
    applied++;
  });

  closeAll();
  _aiResultData=null;
  _aiAmbId=null;
  renderAmbientes();
  toast('✓ '+applied+' itens aplicados!');
}

// ═══ TESTAR API KEY ═══
function testarAPIKey(){
  var key=CFG.emp&&CFG.emp.apiKey;
  var el=document.getElementById('apiTestResult');
  if(!key){if(el)el.textContent='⚠️ Nenhuma chave configurada';return;}
  if(el)el.textContent='⏳ Testando...';
  fetch('https://api.openai.com/v1/chat/completions',{
    method:'POST',
    headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
    body:JSON.stringify({model:'claude-haiku-4-5-20251001',max_tokens:10,messages:[{role:'user',content:'oi'}]})
  }).then(function(r){return r.json();}).then(function(d){
    if(el)el.textContent=d.error?'❌ '+d.error.message:'✅ Conectado!';
  }).catch(function(){if(el)el.textContent='❌ Sem conexão';});
}

function escH(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// Admin PIN
var _adB='';
var _adOn=localStorage.getItem('hr_adm')==='1';
function openAdminPin(){
  if(_adOn){
    _adOn=false;
    localStorage.setItem('hr_adm','0');
    _applyMode();
    toast('Modo funcionario ativado');
    return;
  }
  _adB='';
  _adDots();
  var m=document.getElementById('adMsg');
  if(m)m.textContent='';
  showMd('adminPinMd');
}
function adPin(d){
  if(_adB.length>=4)return;
  _adB+=d;
  _adDots();
  if(_adB.length===4)setTimeout(_adOk,120);
}
function adPinDel(){
  _adB=_adB.slice(0,-1);
  _adDots();
}
function _adDots(){
  for(var i=0;i<4;i++){
    var d=document.getElementById('ad'+i);
    if(!d)continue;
    d.style.background=i<_adB.length?'var(--gold2)':'transparent';
    d.style.borderColor=i<_adB.length?'var(--gold)':'var(--bd2)';
  }
}
function _adOk(){
  var p=(typeof CFG!=='undefined'&&CFG&&CFG.emp&&CFG.emp.adminPin)?CFG.emp.adminPin:'1818';
  if(_adB===p){
    _adOn=true;
    localStorage.setItem('hr_adm','1');
    closeAll();
    _applyMode();
    toast('Bem-vindo, proprietario!');
  } else {
    var m=document.getElementById('adMsg');
    if(m)m.textContent='Senha incorreta';
    _adB='';
    _adDots();
  }
}
function _spPart(){
  var h=document.querySelector('.sp-hero');
  var s=document.getElementById('sSplash');
  if(!h||!s||!s.classList.contains('on'))return;
  for(var i=0;i<7;i++){
    (function(){
      var p=document.createElement('div');
      var sz=2+Math.random()*7;
      var dur=(1.8+Math.random()*2.4).toFixed(1);
      var hue=Math.random()>.5?'rgba(201,168,76,':'rgba(255,230,120,';
      var op=(.15+Math.random()*.35).toFixed(2);
      p.style.cssText=(
        'position:absolute;border-radius:50%;'
        +'background:'+hue+op+');'
        +'width:'+sz+'px;height:'+sz+'px;'
        +'left:'+(5+Math.random()*90)+'%;'
        +'bottom:'+(5+Math.random()*20)+'%;'
        +'animation:spFloat '+dur+'s ease-out forwards;'
        +'pointer-events:none;'
      );
      h.appendChild(p);
      setTimeout(function(){try{h.removeChild(p);}catch(e){}},(+dur+.5)*1000);
    })();
  }
  setTimeout(_spPart,1800);
}
setTimeout(function(){
  _applyMode();
  _spPart();
},400);

function _applyMode(){
  if(_adOn){
    document.body.classList.remove('func-mode');
    var btn=document.getElementById('btnAdm');
    if(btn){btn.innerHTML='&#x1F451;';btn.style.color='var(--gold2)';btn.style.borderColor='rgba(201,168,76,.3)';}
    // Show Empresa and Config in nav
    document.querySelectorAll('[data-pg="5"],[data-pg="6"]').forEach(function(el){
      el.style.opacity='';el.style.pointerEvents='';
      var lk=el.querySelector('.nav-lock');if(lk)lk.remove();
    });
  } else {
    document.body.classList.add('func-mode');
    var btn=document.getElementById('btnAdm');
    if(btn){btn.innerHTML='&#x1F512;';btn.style.color='var(--t3)';btn.style.borderColor='var(--bd)';}
    // Dim Empresa and Config nav items
    document.querySelectorAll('[data-pg="5"],[data-pg="6"]').forEach(function(el){
      el.style.opacity='.4';el.style.pointerEvents='auto';
      if(!el.querySelector('.nav-lock')){
        var lk=document.createElement('span');
        lk.className='nav-lock';lk.textContent='🔒';
        el.appendChild(lk);
      }
    });
  }
}

