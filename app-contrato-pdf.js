// ══════════════════════════════════════════════════════════════
// CONTRATO PDF v5 — mesmo padrão do orçamento (html2canvas)
// html2canvas → jsPDF → viewer overlay com canvas preview
// ══════════════════════════════════════════════════════════════

function _loadContrPDFLibs(cb){
  if(typeof html2canvas!=='undefined'&&typeof window.jspdf!=='undefined'&&window.jspdf.jsPDF){cb();return;}
  var s1=document.createElement('script');
  s1.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  s1.onload=function(){
    if(typeof window.jspdf!=='undefined'&&window.jspdf.jsPDF){cb();return;}
    var s2=document.createElement('script');
    s2.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s2.onload=function(){cb();};
    s2.onerror=function(){if(typeof toast==='function')toast('Erro ao carregar biblioteca PDF');};
    document.head.appendChild(s2);
  };
  s1.onerror=function(){if(typeof toast==='function')toast('Erro ao carregar html2canvas');};
  document.head.appendChild(s1);
}

function gerarContratoPDFVetorial(q,pgConds,prazo,valid,parc,taxa){
  _loadContrPDFLibs(function(){
    try{_buildContratoPDF(q,pgConds,prazo,valid,parc,taxa);}
    catch(e){console.error('contratoPDF:',e);if(typeof toast==='function')toast('Erro PDF: '+e.message);}
  });
}

function _buildContratoPDF(q,pgConds,prazo,valid,parc,taxa){
  var emp=CFG&&CFG.emp?CFG.emp:{nome:'HR',cnpj:'',end:'',cidade:'',tel:''};
  var hoje=new Date();
  var dataStr=hoje.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  var dataSimples=hoje.toLocaleDateString('pt-BR');

  var contrNum='CTR-'+String(q.id).slice(-6);
  var fileName='Contrato_'+contrNum+'_'+(q.cli||'cliente').replace(/[^a-zA-Z0-9]/g,'_')+'.pdf';

  var tipo=(q.tipo||'Outro');
  var tiposGrandes=['Cozinha','Banheiro','Lavabo','Escada','Fachada'];
  var isGrande=tiposGrandes.indexOf(tipo)>=0;
  var garantiaMeses=isGrande?12:6;
  var temInst=(q.acN||[]).some(function(a){return(a||'').toLowerCase().indexOf('instala')>=0;});

  function escH(s){return(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
  function fmV(v){return(parseFloat(v||0)).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
  function numExt(n){var m={6:'seis',12:'doze',3:'três',1:'um'};return m[n]||String(n);}

  // ── Montar lista de peças ──
  var pecasHtml='';
  (q.pds||[]).forEach(function(p,i){
    pecasHtml+='<tr><td>'+(i+1)+'</td><td>'+(p.desc||'Peça')+'</td><td>'+p.w+'×'+p.h+' cm</td><td>'+(p.q||1)+'</td><td>'+((p.w/100)*(p.h/100)*(p.q||1)).toFixed(3)+' m²</td></tr>';
  });
  (q.sfPcs||[]).forEach(function(p){
    pecasHtml+='<tr><td>+</td><td>'+(p.l||'Serviço')+'</td><td>'+p.w+'ml × '+p.h+' cm</td><td>'+(p.q||1)+'</td><td>'+(p.m2||0).toFixed(3)+' m²</td></tr>';
  });

  // ── Serviços inclusos ──
  var svHtml=(q.acN&&q.acN.length)?q.acN.map(function(s){return'<li>'+escH(s)+'</li>';}).join(''):'<li>Acabamento e instalação profissional</li>';

  // ── Condições de pagamento dinâmicas (de pgConds) ──
  var pgCondsHtml=pgConds.map(function(c){
    var icon=c.icon==='$'?'💰':c.icon==='i'?'💡':c.icon==='>'?'📅':c.icon==='*'?'📝':'•';
    return '<div class="cond-item"><div class="cond-num">'+icon+'</div><div class="cond-text">'+c.txt+'</div></div>';
  }).join('');

  // ── Condições gerais ──
  var condsGeraisHtml='';
  var conds=[
    [1,'A <strong>'+escH(emp.nome)+'</strong> se compromete a fornecer o material e executar os serviços descritos neste contrato dentro do prazo acordado entre as partes.'],
    [2,'O prazo de produção de <strong>'+prazo+' dias úteis</strong> começa a contar após o pagamento da entrada e confirmação das medidas definitivas pelo cliente.'],
    [3,'Variações naturais de cor, veios e textura são características próprias de pedras naturais e não constituem defeito de fabricação.'],
  ];
  if(temInst){
    conds.push([4,'O cliente é responsável por garantir que o ambiente esteja completamente pronto e nivelado no dia da instalação (gabinetes, paredes, encanamentos). Caso o ambiente não esteja pronto, o cliente terá 2 (dois) dias úteis para regularizar.']);
    conds.push([5,'Alterações no projeto após a aprovação das medidas poderão gerar custos adicionais, sujeitos a novo orçamento.']);
    conds.push([6,'A rescisão do contrato após o início da produção implicará cobrança mínima de 40% do valor total para cobrir materiais e mão de obra já executados.']);
  } else {
    conds.push([4,'O cliente é responsável por garantir o acesso ao local, bem como que a estrutura de apoio (gabinetes, paredes) esteja pronta e nivelada no dia da instalação.']);
    conds.push([5,'Alterações no projeto após a aprovação das medidas poderão gerar custos adicionais, sujeitos a novo orçamento.']);
    conds.push([6,'A rescisão do contrato após o início da produção implicará cobrança mínima de 40% do valor total para cobrir materiais e mão de obra já executados.']);
  }
  conds.forEach(function(c){
    condsGeraisHtml+='<div class="cond-item"><div class="cond-num">'+c[0]+'</div><div class="cond-text">'+c[1]+'</div></div>';
  });

  // ── Garantia ──
  var garantiaHtml='';
  if(temInst){
    garantiaHtml='<div class="guarantee">'
      +'<div class="guarantee-title">✅ Garantia de 12 meses (peças instaladas pela equipe)</div>'
      +'<div class="guarantee-text">'
        +'A <strong>'+escH(emp.nome)+'</strong> garante por 12 (doze) meses, a partir da data de instalação, todas as peças instaladas pela nossa equipe, contra defeitos de fabricação e instalação.<br><br>'
        +'<strong>Cobre:</strong> Trincas por má execução, falhas no acabamento, problemas de fixação pela equipe, desnivelamento na instalação.<br><br>'
        +'<strong>Não cobre:</strong> Danos por mau uso ou impactos, produtos químicos inadequados, problemas estruturais do imóvel, desgaste natural, peças não instaladas pela equipe após entrega.'
      +'</div>'
    +'</div>';
  } else {
    garantiaHtml='<div class="guarantee">'
      +'<div class="guarantee-title">✅ Garantia de '+garantiaMeses+' meses</div>'
      +'<div class="guarantee-text">'
        +'A <strong>'+escH(emp.nome)+'</strong> oferece garantia de <strong>'+garantiaMeses+' ('+numExt(garantiaMeses)+') meses</strong> contra defeitos de fabricação, a contar da data de entrega.<br><br>'
        +'<strong>Coberto:</strong> Trincas por má execução, falhas no acabamento.<br><br>'
        +'<strong>Não coberto:</strong> Danos por mau uso, impactos físicos, produtos químicos inadequados, infiltrações ou problemas estruturais do imóvel.'
      +'</div>'
    +'</div>';
  }

  // ── Alerta instalação ──
  var alertaInst=temInst
    ?'<div class="alerta-inst">⚠️ <strong>Atenção:</strong> No dia da instalação, o ambiente deve estar totalmente pronto. Caso contrário, o cliente terá 2 dias úteis para regularizar — não regularizado, o agendamento será remarcado conforme nosso cronograma.</div>'
    :'';

  // ── HTML do contrato ──
  var recHtml=''
  +'<div id="pdfContratoReceipt" style="width:700px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#1a1a1a;background:#fff;position:relative;">'

  // Linha topo dourada
  +'<div style="height:3px;background:linear-gradient(90deg,#3a2200 0%,#C9A84C 30%,#EDD06A 50%,#C9A84C 70%,#3a2200 100%);"></div>'

  // HEADER
  +'<div style="background:#0f0c00;padding:22px 36px;display:flex;justify-content:space-between;align-items:center;">'
    +'<div>'
      +'<div style="font-size:22px;font-weight:900;color:#C9A84C;letter-spacing:-.3px;">'+escH(emp.nome)+'</div>'
      +'<div style="font-size:8px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,.5);margin-top:3px;">Mármores · Granitos · Quartzitos</div>'
    +'</div>'
    +'<div style="text-align:right;color:rgba(255,255,255,.7);font-size:10px;line-height:1.7;">'
      +'<span style="color:#C9A84C;font-weight:700;">'+escH(emp.tel)+'</span><br>'
      +escH(emp.end)+'<br>'
      +escH(emp.cidade)+'<br>'
      +'CNPJ: '+escH(emp.cnpj)
    +'</div>'
  +'</div>'

  // FAIXA TÍTULO
  +'<div style="background:#f7f2e8;border-bottom:3px solid #C9A84C;padding:14px 36px;display:flex;justify-content:space-between;align-items:center;">'
    +'<div style="font-size:16px;font-weight:900;color:#3a2000;letter-spacing:-.2px;">📜 CONTRATO DE FORNECIMENTO'+(temInst?' E INSTALAÇÃO':'')+'</div>'
    +'<div style="font-size:10px;color:#999;">Nº '+contrNum+' · '+dataSimples+'</div>'
  +'</div>'

  +'<div style="padding:24px 36px;">'

  // PARTES
  +'<div style="margin-bottom:22px;">'
  +'<div style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #e8d89c;padding-bottom:5px;margin-bottom:12px;">Partes Contratantes</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">'
    +'<div>'
      +'<div style="margin-bottom:8px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Contratada</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(emp.nome)+'</span></div>'
      +'<div style="margin-bottom:8px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">CNPJ</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(emp.cnpj)+'</span></div>'
      +'<div style="margin-bottom:8px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Endereço</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(emp.end)+'</span></div>'
      +'<div style="margin-bottom:8px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Telefone</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(emp.tel)+'</span></div>'
    +'</div>'
    +'<div>'
      +'<div style="margin-bottom:8px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Contratante (Cliente)</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(q.cli||'')+'</span></div>'
      +(q.tel?'<div style="margin-bottom:8px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Telefone</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(q.tel)+'</span></div>':'')
      +(q.end?'<div style="margin-bottom:8px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Endereço de entrega</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(q.end)+'</span></div>':'')
      +(q.cidade?'<div style="margin-bottom:8px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Cidade</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(q.cidade)+'</span></div>':'')
    +'</div>'
  +'</div>'
  +'</div>'

  // OBJETO
  +'<div style="margin-bottom:22px;">'
  +'<div style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #e8d89c;padding-bottom:5px;margin-bottom:12px;">Objeto do Contrato</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:12px;">'
    +'<div><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Tipo de Serviço</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(tipo)+'</span></div>'
    +'<div><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Material</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+escH(q.mat||'Pedra Natural')+(q.matPr?' — R$ '+(parseFloat(q.matPr)).toLocaleString('pt-BR',{minimumFractionDigits:2})+'/m²':'')+'</span></div>'
  +'</div>'
  +(pecasHtml
    ?'<table style="width:100%;border-collapse:collapse;font-size:11px;">'
      +'<thead><tr>'
        +'<th style="background:#0f0c00;color:#C9A84C;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;">Nº</th>'
        +'<th style="background:#0f0c00;color:#C9A84C;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;">Descrição</th>'
        +'<th style="background:#0f0c00;color:#C9A84C;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;">Medidas</th>'
        +'<th style="background:#0f0c00;color:#C9A84C;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;">Qtd</th>'
        +'<th style="background:#0f0c00;color:#C9A84C;padding:7px 10px;text-align:left;font-size:9px;letter-spacing:1px;text-transform:uppercase;">Área</th>'
      +'</tr></thead>'
      +'<tbody style="font-size:11px;">'+pecasHtml+'</tbody>'
    +'</table>'
    :'')
  +'<div style="margin-top:12px;"><label style="display:block;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:#999;margin-bottom:2px;">Total de m²</label><span style="font-size:12px;font-weight:700;color:#1a1a1a;">'+fmV(q.m2||0)+' m²</span></div>'
  +'</div>'

  // SERVIÇOS INCLUSOS
  +'<div style="margin-bottom:22px;">'
  +'<div style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #e8d89c;padding-bottom:5px;margin-bottom:12px;">Serviços Inclusos</div>'
  +'<ul style="padding-left:16px;">'+svHtml+'<li>Fabricação e acabamento completo</li></ul>'
  +(q.obs?'<div style="margin-top:10px;background:#fffbf0;border-left:3px solid #C9A84C;padding:10px 16px;font-size:11px;color:#555;border-radius:0 8px 8px 0;"><strong style="color:#7a4e00;">Observações:</strong> '+escH(q.obs)+'</div>':'')
  +'</div>'

  // VALORES E PAGAMENTO
  +'<div style="margin-bottom:22px;">'
  +'<div style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #e8d89c;padding-bottom:5px;margin-bottom:12px;">Valores e Pagamento</div>'
  +'<div style="background:#0f0c00;border-radius:10px;padding:16px 20px;margin-bottom:16px;">'
    +'<div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">'
      +'<span style="font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;">Valor à vista</span>'
      +'<span style="font-size:22px;font-weight:900;color:#C9A84C;">R$ '+fmV(q.vista||0)+'</span>'
    +'</div>'
    +(parc>0
      ?'<hr style="border:none;border-top:1px solid rgba(201,168,76,.2);margin:8px 0;">'
       +'<div style="display:flex;justify-content:space-between;align-items:baseline;">'
         +'<span style="font-size:10px;color:rgba(255,255,255,.5);letter-spacing:1px;text-transform:uppercase;">Parcelado em '+parc+'×</span>'
         +'<span style="font-size:14px;font-weight:900;color:rgba(255,255,255,.4);">R$ '+fmV((q.vista||0)*(1+taxa/100))+'</span>'
       +'</div>'
      :'')
  +'</div>'
  +pgCondsHtml
  +'</div>'

  // CONDIÇÕES GERAIS
  +'<div style="margin-bottom:22px;">'
  +'<div style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #e8d89c;padding-bottom:5px;margin-bottom:12px;">Condições Gerais</div>'
  +condsGeraisHtml
  +alertaInst
  +'</div>'

  // GARANTIA
  +'<div style="margin-bottom:22px;">'
  +'<div style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #e8d89c;padding-bottom:5px;margin-bottom:12px;">Garantia</div>'
  +garantiaHtml
  +'</div>'

  // ASSINATURAS
  +'<div style="margin-bottom:22px;">'
  +'<div style="font-size:10px;font-weight:900;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;border-bottom:1px solid #e8d89c;padding-bottom:5px;margin-bottom:12px;">Assinaturas</div>'
  +'<div style="text-align:center;font-size:11px;color:#666;margin-bottom:24px;">'+escH(emp.cidade||q.cidade||'')+', '+dataStr+'</div>'
  +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:30px;">'
    +'<div><div style="border-top:1px solid #333;padding-top:8px;">'
      +'<div style="font-size:11px;font-weight:700;">'+escH(emp.nome)+'</div>'
      +'<div style="font-size:9px;color:#666;margin-top:2px;">Contratada · CNPJ: '+escH(emp.cnpj)+'</div>'
    +'</div></div>'
    +'<div><div style="border-top:1px solid #333;padding-top:8px;">'
      +'<div style="font-size:11px;font-weight:700;">'+escH(q.cli||'')+'</div>'
      +'<div style="font-size:9px;color:#666;margin-top:2px;">Contratante · CPF: ___________________</div>'
    +'</div></div>'
  +'</div>'
  +'</div>'

  +'</div>' // body padding

  // RODAPÉ
  +'<div style="background:#0f0c00;padding:12px 36px;display:flex;justify-content:space-between;align-items:center;">'
    +'<span style="font-size:9px;color:rgba(201,168,76,.4);">'+escH(emp.nome)+' · '+escH(emp.cnpj)+'</span>'
    +'<span style="font-size:9px;color:rgba(201,168,76,.4);">'+contrNum+' · Gerado em '+dataSimples+'</span>'
  +'</div>'

  // Linha base dourada
  +'<div style="height:3px;background:linear-gradient(90deg,#3a2200 0%,#C9A84C 30%,#EDD06A 50%,#C9A84C 70%,#3a2200 100%);"></div>'

  +'</div>'; // pdfContratoReceipt

  // ── Overlay (mesmo padrão do orçamento) ──
  var ov=document.createElement('div');
  ov.id='contrPdfOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:9999;display:flex;flex-direction:column;font-family:Outfit,sans-serif;';

  var barEl=document.createElement('div');
  barEl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 13px;background:#0f0c00;border-bottom:1px solid rgba(201,168,76,.55);flex-shrink:0;flex-wrap:wrap;';
  barEl.innerHTML=''
    +'<span style="flex:1;font-size:.75rem;color:#C9A84C;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📜 '+contrNum+' — '+(q.cli||'')+'</span>'
    +'<button id="cPdfClose" style="background:transparent;border:1px solid rgba(201,168,76,.35);color:rgba(201,168,76,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">✕</button>'
    +'<button id="cPdfDown" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">⏳ Gerando...</button>'
    +(navigator.share?'<button id="cPdfShare" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">↗ Compartilhar</button>':'')
    +'<button id="cPdfPrint" style="background:#C9A84C;border:none;color:#000;padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">🖨 Imprimir</button>';

  var preview=document.createElement('div');
  preview.style.cssText='flex:1;overflow-y:auto;background:#444;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
  preview.innerHTML='<div style="text-align:center;color:#C9A84C;padding:60px 20px;font-family:Outfit,sans-serif;font-size:.85rem;letter-spacing:.5px;">⏳ Gerando PDF, aguarde...</div>';

  ov.appendChild(barEl);
  ov.appendChild(preview);
  document.body.appendChild(ov);

  document.getElementById('cPdfClose').onclick=function(){ov.remove();};
  document.getElementById('cPdfPrint').onclick=function(){
    var w=window.open('','_blank');
    if(w){
      w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{background:#fff;}table td{border-bottom:1px solid #f0e8d8;}table tr:nth-child(even) td{background:#faf5ea;}.cond-item{display:flex;gap:10px;align-items:flex-start;margin-bottom:9px;padding:9px 12px;background:#f9f5ef;border-left:3px solid #C9A84C;border-radius:0 6px 6px 0;}.cond-num{font-size:11px;font-weight:900;color:#C9A84C;min-width:18px;}.cond-text{font-size:11px;color:#333;line-height:1.5;}.guarantee{background:#e8f4e8;border:1px solid #a8d4a8;border-radius:8px;padding:14px 16px;margin-bottom:16px;}.guarantee-title{font-size:11px;font-weight:900;color:#2a6a2a;margin-bottom:6px;}.guarantee-text{font-size:11px;color:#2a4a2a;line-height:1.6;}.alerta-inst{background:#fffbf0;border-left:4px solid #C9A84C;padding:10px 14px;margin-top:10px;font-size:11px;color:#5a3a00;border-radius:0 6px 6px 0;}ul li{margin-bottom:4px;font-size:11px;color:#333;}</style></head><body>'+recHtml+'<script>window.onload=function(){window.print();};<\/script></body></html>');
      w.document.close();
    }
  };

  // ── Off-screen render ──
  var offscreen=document.createElement('div');
  offscreen.style.cssText='position:fixed;left:-9999px;top:0;width:700px;background:#fff;z-index:-1;';
  offscreen.innerHTML=recHtml;
  // Injetar estilos de tabela/cond no offscreen
  var styleEl=document.createElement('style');
  styleEl.textContent='table td{border-bottom:1px solid #f0e8d8;}table tr:nth-child(even) td{background:#faf5ea;}.cond-item{display:flex;gap:10px;align-items:flex-start;margin-bottom:9px;padding:9px 12px;background:#f9f5ef;border-left:3px solid #C9A84C;border-radius:0 6px 6px 0;}.cond-num{font-size:11px;font-weight:900;color:#C9A84C;min-width:18px;}.cond-text{font-size:11px;color:#333;line-height:1.5;}.guarantee{background:#e8f4e8;border:1px solid #a8d4a8;border-radius:8px;padding:14px 16px;margin-bottom:16px;}.guarantee-title{font-size:11px;font-weight:900;color:#2a6a2a;margin-bottom:6px;}.guarantee-text{font-size:11px;color:#2a4a2a;line-height:1.6;}.alerta-inst{background:#fffbf0;border-left:4px solid #C9A84C;padding:10px 14px;margin-top:10px;font-size:11px;color:#5a3a00;border-radius:0 6px 6px 0;}ul li{margin-bottom:4px;font-size:11px;color:#333;}';
  offscreen.insertBefore(styleEl,offscreen.firstChild);
  document.body.appendChild(offscreen);

  setTimeout(function(){
    html2canvas(offscreen.querySelector('#pdfContratoReceipt'),{
      scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:700,windowWidth:700
    }).then(function(canvas){
      document.body.removeChild(offscreen);
      var jsPDF=window.jspdf.jsPDF;
      var pageW=595.28;
      var pageH=pageW*(canvas.height/canvas.width);
      var pdf=new jsPDF({orientation:'portrait',unit:'pt',format:[pageW,pageH]});
      pdf.addImage(canvas.toDataURL('image/jpeg',0.96),'JPEG',0,0,pageW,pageH);
      var pdfBlob=pdf.output('blob');

      // Preview como imagem (mesmo padrão do orçamento)
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

      enableBtn('cPdfDown','⬇ Salvar PDF',function(){
        var url=URL.createObjectURL(pdfBlob);
        var a=document.createElement('a');
        a.href=url;a.download=fileName;
        document.body.appendChild(a);a.click();document.body.removeChild(a);
        setTimeout(function(){URL.revokeObjectURL(url);},30000);
        if(typeof toast==='function')toast('PDF salvo: '+fileName);
      });

      if(navigator.share){
        enableBtn('cPdfShare','↗ Compartilhar',function(){
          var pdfFile=new File([pdfBlob],fileName,{type:'application/pdf'});
          var sd={title:'Contrato '+contrNum+' — '+(q.cli||''),text:(emp.nome||'HR')+'\nR$ '+fmV(q.vista||0)+' — Contrato de Fornecimento'};
          if(navigator.canShare&&navigator.canShare({files:[pdfFile]}))sd.files=[pdfFile];
          navigator.share(sd).catch(function(e){
            if(e&&e.name!=='AbortError'){
              // fallback: baixa + abre WhatsApp
              var url=URL.createObjectURL(pdfBlob);
              var a=document.createElement('a');a.href=url;a.download=fileName;
              document.body.appendChild(a);a.click();document.body.removeChild(a);
              var tel=(q.tel||'').replace(/\D/g,'');
              var msg='Olá'+(q.cli?' '+q.cli:'')+',\n\nSegue o contrato referente ao seu pedido de '+(q.tipo||'mármore/granito')+'.\n\nValor: R$ '+fmV(q.vista||0)+'\n\n'+(emp.nome||'HR');
              setTimeout(function(){
                window.open('https://wa.me/'+(tel?'55'+tel:'')+'?text='+encodeURIComponent(msg),'_blank');
              },700);
            }
          });
        });
      }

      if(typeof toast==='function')toast('✓ Contrato PDF pronto — '+contrNum);
    }).catch(function(){
      if(document.body.contains(offscreen))document.body.removeChild(offscreen);
      preview.innerHTML='<div style="text-align:center;color:#c94444;padding:40px 20px;font-family:Outfit,sans-serif;font-size:.82rem;">Erro ao gerar. Use 🖨 Imprimir.</div>';
    });
  },200);
}

// ════ PATCH — sobrepõe _gerarContratoHtml com versão PDF ════
(function(){
  var t=0,iv=setInterval(function(){
    t++;
    if(typeof _gerarContratoHtml==='function'&&!_gerarContratoHtml._v5){
      _gerarContratoHtml=function(q,pgConds,prazo,valid,parc,taxa){
        gerarContratoPDFVetorial(q,pgConds,prazo,valid,parc,taxa);
      };
      _gerarContratoHtml._v5=true;
      clearInterval(iv);
      console.log('[ContratoPDF v5] ✓ — mesmo padrão do orçamento');
    }
    if(t>100)clearInterval(iv);
  },100);
})();
