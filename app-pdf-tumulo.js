// ═══════════════════════════════════════════════
// ── GERADOR DE PDF PARA TÚMULOS ──
function gerarPDFTumulo(q){
  if(typeof html2canvas==='undefined'||typeof window.jspdf==='undefined'){
    toast('Carregando bibliotecas PDF...');
    var s1=document.createElement('script');
    s1.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s1.onload=function(){
      var s2=document.createElement('script');
      s2.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s2.onload=function(){gerarPDFTumulo(q);};
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
    return;
  }

  var emp=CFG.emp;
  var tum=q.tum||{};
  var res=q.tumCalc||{};
  var pdfCount=parseInt(localStorage.getItem('hr_pdf_count')||'0',10);
  var orcNum='ORC-'+String(pdfCount).padStart(4,'0');
  localStorage.setItem('hr_pdf_count',pdfCount+1);
  var fileName='Orcamento_'+orcNum+'_Tumulo_'+q.cli.replace(/[^a-zA-Z0-9]/g,'_')+'.pdf';

  var TIPOS_LABEL={simples:'Túmulo Simples',gaveta_dupla:'Gaveta Dupla',gaveta_tripla:'Gaveta Tripla',
    capela:'Capela / Monumento',revestimento:'Revestimento / Reforma',reforma:'Reforma Completa',jazigo:'Jazigo Completo'};
  var tipoLabel=TIPOS_LABEL[tum.tipo]||tum.tipo||'Túmulo';
  var mat=CFG.stones.find(function(s){return s.id===tum.stoneId;})||{nm:q.mat||'',tx:'',photo:''};
  var vista=q.vista||res.venda||0;
  var parc=vista*1.12;
  var p8=parc/8;
  var ent=vista*0.5;
  var economia=parc-vista;

  function fd(d){if(!d)return new Date().toLocaleDateString('pt-BR');try{return new Date(d).toLocaleDateString('pt-BR');}catch(e){return d;}}
  function sh(t){return '<div style="display:flex;align-items:center;gap:10px;margin:0 0 12px;"><span style="font-size:7.5px;letter-spacing:3px;text-transform:uppercase;color:#C9A84C;font-weight:900;">'+t+'</span><div style="flex:1;height:1px;background:linear-gradient(90deg,rgba(201,168,76,0.4),transparent);"></div></div>';}

  // Linhas de custo
  var custoRows='';
  var custoItems=[
    {icon:'🪨',l:'Pedras',v:res.custoPedra||0,sub:mat.nm+(res.m2total?' — '+(+res.m2total).toFixed(3)+' m²':'')},
    {icon:'🔨',l:'Mão de Obra Marmoraria',v:res.custoMdo||0,sub:''},
    {icon:'🧱',l:'Pedreiro / Construção',v:res.custoObra||0,sub:''},
    {icon:'🪣',l:'Materiais',v:res.custoMat||0,sub:''}
  ];
  custoItems.forEach(function(it,i){
    if(!it.v&&it.v!==0)return;
    var bg=i%2===0?'#fff':'#faf6ef';
    custoRows+='<tr>'
      +'<td style="padding:10px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:12px;font-weight:600;color:#1a1a1a;">'+it.icon+' '+it.l+'</td>'
      +'<td style="padding:10px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:11px;color:#888;text-align:center;">'+it.sub+'</td>'
      +'<td style="padding:10px 14px;background:'+bg+';border-bottom:1px solid #ede8dc;font-size:12px;text-align:right;font-weight:700;color:#1a1a1a;">R$ '+fm(it.v)+'</td>'
      +'</tr>';
  });
  // Total row
  custoRows+='<tr style="background:#0f0c00;">'
    +'<td colspan="2" style="padding:11px 14px;font-size:10px;font-weight:900;color:#C9A84C;letter-spacing:1px;">CUSTO TOTAL DO PROJETO</td>'
    +'<td style="padding:11px 14px;text-align:right;font-size:12px;font-weight:900;color:#C9A84C;">R$ '+fm(res.custoTotal||0)+'</td>'
    +'</tr>';

  // Observações
  var obsBox=tum.obs?'<div style="background:#fffbf0;border-left:4px solid #C9A84C;padding:10px 14px;margin-bottom:18px;font-size:11.5px;color:#555;border-radius:0 8px 8px 0;line-height:1.65;"><strong style="color:#7a4e00;">Observações:</strong> '+escH(tum.obs)+'</div>':'';

  var recHtml=''
  +'<div id="pdfReceipt" style="width:700px;font-family:Arial,Helvetica,sans-serif;background:#fff;color:#1a1a1a;">'
  +'<div style="height:6px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);"></div>'
  // Header
  +'<div style="background:#0f0c00;padding:28px 38px 22px;display:flex;justify-content:space-between;align-items:flex-start;gap:20px;">'
    +'<div style="display:flex;flex-direction:column;gap:6px;">'
      +'<div style="font-size:26px;font-weight:900;color:#C9A84C;letter-spacing:-0.5px;line-height:1;">'+emp.nome+'</div>'
      +'<div style="font-size:8.5px;letter-spacing:3.5px;text-transform:uppercase;color:rgba(201,168,76,0.45);">M&Aacute;RMORE &middot; GRANITO &middot; QUARTZITO</div>'
      +'<div style="font-size:10px;color:rgba(255,255,255,0.22);font-style:italic;margin-top:2px;">Qualidade, Precisao e Acabamento Profissional</div>'
    +'</div>'
    +'<div style="text-align:right;display:flex;flex-direction:column;gap:3px;">'
      +'<div style="font-size:10.5px;color:rgba(201,168,76,0.9);font-weight:700;">'+emp.end+'</div>'
      +'<div style="font-size:10px;color:rgba(255,255,255,0.4);">'+emp.cidade+'</div>'
      +'<div style="font-size:11px;color:rgba(201,168,76,0.9);font-weight:700;margin-top:3px;">'+emp.tel+'</div>'
      +(emp.ig?'<div style="font-size:10px;color:rgba(255,255,255,0.4);">'+emp.ig+'</div>':'')
      +'<div style="font-size:8.5px;color:rgba(255,255,255,0.18);margin-top:3px;">CNPJ: '+emp.cnpj+'</div>'
    +'</div>'
  +'</div>'
  // Badge bar
  +'<div style="background:#f7f2e8;border-bottom:3px solid #C9A84C;padding:11px 38px;display:flex;justify-content:space-between;align-items:center;">'
    +'<div style="display:flex;align-items:center;gap:12px;">'
      +'<div style="background:#0f0c00;color:#C9A84C;font-size:8px;font-weight:900;padding:6px 16px;border-radius:30px;letter-spacing:3px;text-transform:uppercase;border:1px solid rgba(201,168,76,0.5);">⚱️ TÚMULO</div>'
      +'<div style="background:#C9A84C;color:#000;font-size:9px;font-weight:900;padding:4px 10px;border-radius:5px;letter-spacing:1px;">'+orcNum+'</div>'
    +'</div>'
    +'<div style="text-align:right;">'
      +'<div style="font-size:10px;color:#888;"><strong style="color:#5a3800;">EMISSÃO:</strong> '+fd(q.dt||q.date)+'</div>'
      +'<div style="font-size:9.5px;color:#aaa;">Validade: 7 dias</div>'
    +'</div>'
  +'</div>'
  // Body
  +'<div style="padding:24px 38px 20px;">'
    // Cliente
    +sh('Cliente')
    +'<div style="display:flex;gap:12px;margin-bottom:20px;align-items:stretch;">'
      +'<div style="flex:1;background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:15px 18px;">'
        +'<div style="font-size:7.5px;letter-spacing:2.5px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">NOME DO CLIENTE</div>'
        +'<div style="font-size:21px;font-weight:900;color:#1a1a1a;line-height:1;margin-bottom:8px;">'+escH(q.cli)+'</div>'
        +(tum.falecido?'<div style="font-size:11px;color:#888;margin-top:4px;">⚱️ Falecido: <strong>'+escH(tum.falecido)+'</strong></div>':'')
        +(tum.cemiterio?'<div style="font-size:11px;color:#888;margin-top:2px;">📍 Cemitério: '+escH(tum.cemiterio)+'</div>':'')
        +(tum.quadra?'<div style="font-size:11px;color:#888;margin-top:2px;">Quadra: '+escH(tum.quadra)+(tum.lote?' | Lote: '+escH(tum.lote):'')+'</div>':'')
      +'</div>'
      +'<div style="background:#0f0c00;border:1px solid rgba(201,168,76,0.45);border-radius:10px;padding:14px 18px;text-align:center;display:flex;flex-direction:column;justify-content:center;min-width:120px;">'
        +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(201,168,76,0.5);margin-bottom:6px;font-weight:900;">PROJETO</div>'
        +'<div style="font-size:16px;font-weight:900;color:#C9A84C;line-height:1.2;">'+tipoLabel+'</div>'
        +'<div style="font-size:9px;color:rgba(255,255,255,0.3);margin-top:6px;">'+tum.dims.comp+'m × '+tum.dims.larg+'m × '+tum.dims.alt+'m</div>'
      +'</div>'
    +'</div>'
    +obsBox
    // Material
    +sh('Material Selecionado')
    +'<div style="border:2px solid #C9A84C;border-radius:12px;overflow:hidden;margin-bottom:20px;box-shadow:0 4px 20px rgba(201,168,76,0.15);">'
      +'<div class="'+(mat.photo?'':mat.tx)+'" style="height:90px;width:100%;position:relative;overflow:hidden;'+(mat.photo?'background-image:url(\''+mat.photo+'\');background-size:cover;background-position:center;':'')+'">'
        +'<div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,0.78) 0%,rgba(0,0,0,0.45) 50%,rgba(0,0,0,0.12) 100%);">'
          +'<div style="position:absolute;left:20px;top:50%;transform:translateY(-50%);">'
            +'<div style="font-size:7px;letter-spacing:3px;text-transform:uppercase;color:rgba(201,168,76,0.8);font-weight:900;margin-bottom:5px;">MATERIAL</div>'
            +'<div style="font-size:22px;font-weight:900;color:#C9A84C;line-height:1;">'+(mat.nm||q.mat||'—')+'</div>'
            +(mat.cat?'<div style="font-size:9.5px;color:rgba(255,255,255,0.45);margin-top:4px;">'+mat.cat+(mat.fin?' · '+mat.fin:'')+'</div>':'')
          +'</div>'
          +'<div style="position:absolute;right:20px;top:50%;transform:translateY(-50%);text-align:right;">'
            +'<div style="font-size:7px;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,0.45);font-weight:900;margin-bottom:3px;">ÁREA TOTAL</div>'
            +'<div style="font-size:20px;font-weight:900;color:#fff;">'+( res.m2total?(+res.m2total).toFixed(3)+' m²':'—')+'</div>'
            +(tum.dims.esp?'<div style="font-size:9px;color:rgba(255,255,255,0.4);margin-top:3px;">Espessura: '+tum.dims.esp+' cm</div>':'')
          +'</div>'
        +'</div>'
      +'</div>'
    +'</div>'
    // Custos
    +sh('Composição do Projeto')
    +'<div style="border:1px solid #e8e0d0;border-radius:10px;overflow:hidden;margin-bottom:20px;">'
      +'<table style="width:100%;border-collapse:collapse;">'
        +'<thead><tr style="background:#0f0c00;">'
          +'<th style="padding:10px 14px;text-align:left;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">ITEM</th>'
          +'<th style="padding:10px 14px;text-align:center;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">DETALHE</th>'
          +'<th style="padding:10px 14px;text-align:right;font-size:8px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">VALOR</th>'
        +'</tr></thead>'
        +'<tbody>'+custoRows+'</tbody>'
      +'</table>'
    +'</div>'
    // Valor final
    +'<div style="background:#0f0c00;border:2px solid #C9A84C;border-radius:10px;overflow:hidden;margin-bottom:20px;box-shadow:0 3px 16px rgba(201,168,76,0.2);">'
      +'<div style="background:#0f0c00;padding:10px 16px;display:flex;align-items:center;justify-content:space-between;">'
        +'<span style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#C9A84C;font-weight:900;">A VISTA</span>'
        +'<span style="background:#C9A84C;color:#000;font-size:8px;font-weight:900;padding:2px 8px;border-radius:20px;">MELHOR OPÇÃO</span>'
      +'</div>'
      +'<div style="padding:14px 16px;background:#fff;">'
        +'<div style="font-size:28px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:4px;">R$ '+fm(vista)+'</div>'
        +'<div style="font-size:11px;color:#a06020;font-weight:700;margin-bottom:6px;">Valor final sem juros</div>'
        +'<div style="display:inline-flex;align-items:center;gap:5px;background:#edf7ed;border:1px solid #7ac47a;color:#1e6b1e;font-size:9px;font-weight:900;padding:3px 10px;border-radius:20px;">&#9660; Economia de R$ '+fm(economia)+' em relação ao parcelado</div>'
      +'</div>'
    +'</div>'
    // Condição de Pagamento
    +sh('Condição de Pagamento')
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:6px;">'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:15px 18px;">'
        +'<div style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">ENTRADA — 50%</div>'
        +'<div style="font-size:22px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:4px;">R$ '+fm(ent)+'</div>'
        +'<div style="font-size:11px;color:#999;">Na assinatura / medição</div>'
      +'</div>'
      +'<div style="background:#fdfaf3;border:1px solid #e8dfc4;border-radius:10px;padding:15px 18px;">'
        +'<div style="font-size:7.5px;letter-spacing:2px;text-transform:uppercase;color:#c0a860;margin-bottom:5px;font-weight:900;">NA ENTREGA — 50%</div>'
        +'<div style="font-size:22px;font-weight:900;color:#7a4400;line-height:1;margin-bottom:4px;">R$ '+fm(ent)+'</div>'
        +'<div style="font-size:11px;color:#999;">Na entrega e instalação</div>'
      +'</div>'
    +'</div>'
  +'</div>'
  // Footer
  +'<div style="background:#0f0c00;padding:18px 38px;display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:4px;">'
    +'<div>'
      +'<div style="font-size:14px;font-weight:900;color:#C9A84C;line-height:1;margin-bottom:4px;">'+emp.nome+'</div>'
      +'<div style="font-size:9.5px;color:rgba(201,168,76,0.4);">'+emp.end+' — '+emp.cidade+'</div>'
    +'</div>'
    +'<div style="text-align:right;line-height:1.9;">'
      +'<div style="font-size:10.5px;color:rgba(201,168,76,0.85);font-weight:700;">'+emp.tel+'</div>'
      +(emp.ig?'<div style="font-size:9.5px;color:rgba(201,168,76,0.4);">'+emp.ig+'</div>':'')
      +'<div style="font-size:9px;color:rgba(255,255,255,0.15);">CNPJ: '+emp.cnpj+'</div>'
    +'</div>'
  +'</div>'
  +'<div style="height:5px;background:linear-gradient(90deg,#5a3a06 0%,#C9A84C 35%,#E8C96A 50%,#C9A84C 65%,#5a3a06 100%);"></div>'
  +'</div>';

  // Overlay
  var ov=document.createElement('div');
  ov.id='pdfOv';
  ov.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.97);z-index:9999;display:flex;flex-direction:column;';
  var barEl=document.createElement('div');
  barEl.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 13px;background:#0f0c00;border-bottom:1px solid rgba(201,168,76,.55);flex-shrink:0;flex-wrap:wrap;';
  barEl.innerHTML=''
    +'<span style="flex:1;font-size:.75rem;color:#C9A84C;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">⚱️ '+orcNum+' — '+escH(q.cli)+'</span>'
    +'<button id="pdfBtnClose" style="background:transparent;border:1px solid rgba(201,168,76,.35);color:rgba(201,168,76,.7);padding:7px 11px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">✕</button>'
    +'<button id="pdfBtnDown" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">⏳ Gerando...</button>'
    +(navigator.share?'<button id="pdfBtnShare" disabled style="background:#1e1800;border:1px solid rgba(201,168,76,.2);color:rgba(201,168,76,.35);padding:7px 13px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">↗ Compartilhar</button>':'')
    +'<button id="pdfBtnPrint" style="background:#C9A84C;border:none;color:#000;padding:7px 13px;border-radius:8px;font-size:.72rem;font-weight:800;cursor:pointer;font-family:Outfit,sans-serif;white-space:nowrap;">🖨 Imprimir</button>';
  var preview=document.createElement('div');
  preview.style.cssText='flex:1;overflow-y:auto;background:#444;display:flex;justify-content:center;align-items:flex-start;padding:16px 8px;';
  preview.innerHTML='<div style="text-align:center;color:#C9A84C;padding:60px 20px;font-family:Outfit,sans-serif;font-size:.85rem;letter-spacing:.5px;">⏳ Gerando PDF, aguarde...</div>';
  ov.appendChild(barEl);ov.appendChild(preview);
  document.body.appendChild(ov);
  document.getElementById('pdfBtnClose').onclick=function(){ov.remove();};
  document.getElementById('pdfBtnPrint').onclick=function(){
    var w=window.open('','_blank');
    if(w){w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;}body{background:#fff;}</style></head><body>'+recHtml+'<script>window.onload=function(){window.print();};<\/script></body></html>');w.document.close();}
  };

  var offscreen=document.createElement('div');
  offscreen.style.cssText='position:fixed;left:-9999px;top:0;width:700px;background:#fff;z-index:-1;';
  offscreen.innerHTML=recHtml;
  document.body.appendChild(offscreen);

  setTimeout(function(){
    html2canvas(offscreen.querySelector('#pdfReceipt'),{scale:2,useCORS:true,backgroundColor:'#ffffff',logging:false,width:700,windowWidth:700}).then(function(canvas){
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
      function enableBtn(id,label,cb){var b=document.getElementById(id);if(!b)return;b.innerHTML=label;b.disabled=false;b.style.color='#C9A84C';b.style.borderColor='rgba(201,168,76,.55)';b.style.background='#1e1800';b.onclick=cb;}
      enableBtn('pdfBtnDown','⬇ Salvar PDF',function(){var url=URL.createObjectURL(pdfBlob);var a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(function(){URL.revokeObjectURL(url);},30000);toast('PDF salvo: '+fileName);});
      if(navigator.share){enableBtn('pdfBtnShare','↗ Compartilhar',function(){var pdfFile=new File([pdfBlob],fileName,{type:'application/pdf'});var sd={title:'Orcamento '+orcNum+' — '+q.cli,text:emp.nome+'\nR$ '+fm(vista)+' a vista'};if(navigator.canShare&&navigator.canShare({files:[pdfFile]}))sd.files=[pdfFile];navigator.share(sd).catch(function(){});});}
    });
  },400);
}

// ORÇAMENTOS HISTÓRICO
// ═══════════════════════════════════════════════

