// ══════════════════════════════════════════════════════════════
// CONTRATO PDF PROFISSIONAL v3
// jsPDF vetorial puro — sem html2canvas, sem imagem
// WhatsApp direto, visualização inline, texto selecionável
// ══════════════════════════════════════════════════════════════

// ── Carrega jsPDF + autotable on-demand ──
function _loadContrPDFLibs(cb){
  if(typeof window.jspdf!=='undefined'&&typeof window.jspdf.jsPDF!=='undefined'){cb();return;}
  var s1=document.createElement('script');
  s1.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s1.onload=function(){
    var s2=document.createElement('script');
    s2.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
    s2.onload=cb;
    s2.onerror=function(){console.warn('autotable nao carregou, continuando sem tabela vetorial');cb();};
    document.head.appendChild(s2);
  };
  s1.onerror=function(){if(typeof toast==='function')toast('Erro ao carregar biblioteca PDF');};
  document.head.appendChild(s1);
}

// ── Utilitários de texto ──
function _ctrPdfFm(v){return'R$ '+(parseFloat(v||0)).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function _ctrEsc(s){return(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function _ctrFmDate(iso){try{return new Date(iso+'T12:00:00').toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});}catch(e){return iso||'';}}
function _ctrFmDateShort(iso){try{return new Date(iso+'T12:00:00').toLocaleDateString('pt-BR');}catch(e){return iso||'';}}

// ── CORES ──
var C={
  gold:   [201,168,76],
  goldDk: [120,95,30],
  dark:   [15,12,0],
  darkHdr:[26,20,0],
  white:  [255,255,255],
  offWh:  [247,242,232],
  text:   [26,26,26],
  gray:   [102,102,102],
  lgray:  [180,180,180],
  green:  [42,106,42],
  greenLt:[232,245,232],
  red:    [138,42,42],
  blue:   [40,80,160],
  blueLt: [240,244,255],
  warn:   [255,248,225],
  warnBd: [201,168,76],
  rowAlt: [250,245,234],
  tblHdr: [26,20,0],
  condBg: [250,246,239],
  divider:[232,208,144],
};

// ── GERADOR PRINCIPAL ──
function gerarContratoPDFVetorial(q, pgConds, prazo, valid, parc, taxa){
  _loadContrPDFLibs(function(){
    try{
      _buildContratoPDF(q, pgConds, prazo, valid, parc, taxa);
    }catch(err){
      console.error('contratoPDF erro:',err);
      if(typeof toast==='function')toast('Erro ao gerar PDF: '+err.message);
    }
  });
}

function _buildContratoPDF(q, pgConds, prazo, valid, parc, taxa){
  var jsPDF=window.jspdf.jsPDF;
  var emp=CFG.emp;
  var hoje=new Date();
  var dataStr=hoje.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  var dataSimples=hoje.toLocaleDateString('pt-BR');
  var contrNum='CTR-'+String(q.id).slice(-6);
  var nomeCliente=(q.cli||'cliente').replace(/[^a-zA-Z0-9]/g,'_');
  var fileName='Contrato_'+contrNum+'_'+nomeCliente+'.pdf';
  var tipo=(q.tipo||'Projeto');
  var temInstalacao=(q.acN||[]).some(function(a){return a.toLowerCase().indexOf('instala')>=0;});
  var vista=q.vista||0;
  var valorCartao=parc>0?vista*(1+(taxa/100)):0;

  // ── jsPDF A4 ──
  var doc=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
  var PW=595.28, PH=841.89;
  var ML=36, MR=36, MW=PW-ML-MR; // margens

  // ── helpers de desenho ──
  function setFont(size,style,color){
    doc.setFontSize(size);
    doc.setFont('helvetica',style||'normal');
    doc.setTextColor.apply(doc,color||C.text);
  }
  function rect(x,y,w,h,color,radius){
    doc.setFillColor.apply(doc,color);
    if(radius){doc.roundedRect(x,y,w,h,radius,radius,'F');}
    else{doc.rect(x,y,w,h,'F');}
  }
  function rectStroke(x,y,w,h,fill,stroke,lw,radius){
    doc.setFillColor.apply(doc,fill);
    doc.setDrawColor.apply(doc,stroke);
    doc.setLineWidth(lw||0.5);
    if(radius){doc.roundedRect(x,y,w,h,radius,radius,'FD');}
    else{doc.rect(x,y,w,h,'FD');}
  }
  function line(x1,y1,x2,y2,color,lw){
    doc.setDrawColor.apply(doc,color||C.divider);
    doc.setLineWidth(lw||0.5);
    doc.line(x1,y1,x2,y2);
  }
  function txt(text,x,y,opts){
    opts=opts||{};
    doc.text(String(text),x,y,{align:opts.align||'left',maxWidth:opts.maxWidth});
  }
  function multiLine(text,x,y,maxW,lineH,maxH){
    var lines=doc.splitTextToSize(String(text||''),maxW);
    var used=0;
    lines.forEach(function(ln){
      if(maxH&&used+lineH>maxH)return;
      doc.text(ln,x,y+used);
      used+=lineH;
    });
    return used;
  }
  function secTitle(label,y){
    // linha dourada
    line(ML,y,PW-MR,y,C.gold,0.5);
    y+=7;
    setFont(7,'bold',C.gold);
    doc.setCharSpace(2);
    txt(label.toUpperCase(),ML,y);
    doc.setCharSpace(0);
    return y+10;
  }
  function labelValue(label,value,x,y,w){
    setFont(7,'normal',C.lgray);
    doc.setCharSpace(0.8);
    txt(label.toUpperCase(),x,y);
    doc.setCharSpace(0);
    setFont(11,'bold',C.text);
    var lines=doc.splitTextToSize(String(value||'—'),w||MW/2-8);
    lines.forEach(function(l,i){doc.text(l,x,y+12+(i*13));});
    return y+12+(lines.length*13)+4;
  }
  function condItem(num,text,x,y,maxW){
    // barra dourada esquerda
    rect(x,y,3,0,'F');// placeholder, calculamos altura depois
    var lines=doc.splitTextToSize(text,maxW-42);
    var h=Math.max(26, lines.length*13+14);
    rect(x,y,3,h,C.gold);
    rect(x+3,y,maxW-3,h,C.condBg);
    // número/ícone
    setFont(11,'bold',C.gold);
    txt(String(num),x+11,y+h/2+4);
    // texto
    setFont(10,'normal',C.text);
    var ty=y+(h/2)-(lines.length*13/2)+10;
    lines.forEach(function(l){doc.text(l,x+32,ty);ty+=13;});
    return y+h+4;
  }

  var Y=0; // cursor vertical

  // ════════════════════════════════════════
  // HEADER
  // ════════════════════════════════════════
  rect(0,0,PW,72,C.darkHdr);
  line(0,72,PW,72,C.gold,2);
  // logo/nome empresa
  setFont(16,'bold',C.gold);
  txt(emp.nome||'HR Mármores',ML,30);
  setFont(7,'normal',[201,168,76,0.5]);
  doc.setCharSpace(2.5);
  txt('MÁRMORES · GRANITOS · QUARTZITOS',ML,43);
  doc.setCharSpace(0);
  // info empresa (direita)
  setFont(9,'normal',[200,200,200]);
  var empLines=[emp.tel||'',emp.end||'',emp.cidade||'','CNPJ: '+(emp.cnpj||'')];
  var ey=20;
  empLines.forEach(function(l){
    if(!l)return;
    doc.text(l,PW-MR,ey,{align:'right'});
    ey+=13;
  });

  // ════════════════════════════════════════
  // FAIXA TÍTULO
  // ════════════════════════════════════════
  Y=72;
  rect(0,Y,PW,46,C.offWh);
  line(0,Y+46,PW,Y+46,C.divider,1);
  setFont(14,'bold',C.dark);
  txt('📜 CONTRATO DE FORNECIMENTO'+(temInstalacao?' E INSTALAÇÃO':''),ML,Y+20);
  setFont(8,'normal',C.gray);
  doc.setCharSpace(0.5);
  txt('Documento com validade jurídica entre as partes',ML,Y+35);
  doc.setCharSpace(0);
  // número + data
  setFont(9,'normal',C.gray);
  doc.text('Nº '+String(q.id).slice(-6),PW-MR,Y+20,{align:'right'});
  doc.text(dataSimples,PW-MR,Y+35,{align:'right'});

  Y=118; // abaixo do header+faixa

  // ════════════════════════════════════════
  // CORPO
  // ════════════════════════════════════════
  var body_x=ML, body_w=MW;
  Y+=16;

  // ── PARTES CONTRATANTES ──
  Y=secTitle('Partes Contratantes',Y);
  var col1x=body_x, col2x=body_x+MW/2+8, colW=MW/2-12;
  var yL=Y, yR=Y;
  yL=labelValue('Contratada',emp.nome||'',col1x,yL,colW);
  yL=labelValue('CNPJ',emp.cnpj||'',col1x,yL,colW);
  yL=labelValue('Endereço',emp.end||'',col1x,yL,colW);
  yL=labelValue('Telefone / WhatsApp',emp.tel||'',col1x,yL,colW);
  yR=labelValue('Contratante (Cliente)',_ctrEsc(q.cli||''),col2x,yR,colW);
  if(q.tel)yR=labelValue('Telefone',_ctrEsc(q.tel),col2x,yR,colW);
  if(q.end)yR=labelValue('Endereço de Entrega',_ctrEsc(q.end),col2x,yR,colW);
  if(q.cidade)yR=labelValue('Cidade',_ctrEsc(q.cidade),col2x,yR,colW);
  Y=Math.max(yL,yR)+10;

  // ── OBJETO DO CONTRATO ──
  Y=secTitle('Objeto do Contrato',Y);
  var yO=Y;
  yO=labelValue('Tipo de Serviço',tipo,col1x,yO,colW);
  yO=labelValue('Material',(q.mat||'Pedra Natural')+(q.matPr?' — R$ '+parseFloat(q.matPr||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'/m²':''),col2x,Y,colW);
  Y=Math.max(yO,Y+40)+8;

  // Tabela de peças (se houver)
  var pecasRows=[];
  (q.pds||[]).forEach(function(p,i){
    pecasRows.push([String(i+1),p.desc||'Peça',p.w+'×'+p.h+' cm',String(p.q||1),((p.w/100)*(p.h/100)*(p.q||1)).toFixed(3)+' m²']);
  });
  (q.sfPcs||[]).forEach(function(p){
    pecasRows.push(['+',p.l||'Serviço',p.w+'ml × '+p.h+' cm',String(p.q||1),p.m2.toFixed(3)+' m²']);
  });
  if(pecasRows.length>0&&typeof doc.autoTable==='function'){
    doc.autoTable({
      startY:Y,
      margin:{left:ML,right:MR},
      head:[['Nº','Descrição','Medidas','Qtd','Área (m²)']],
      body:pecasRows,
      styles:{fontSize:9,cellPadding:5,fontStyle:'normal'},
      headStyles:{fillColor:C.tblHdr,textColor:C.gold,fontStyle:'bold',fontSize:7.5,letterSpacing:1},
      alternateRowStyles:{fillColor:C.rowAlt},
      columnStyles:{0:{cellWidth:20,halign:'center'},2:{cellWidth:70},3:{cellWidth:25,halign:'center'},4:{cellWidth:55,halign:'right'}},
      theme:'plain',
      tableLineColor:C.divider,
      tableLineWidth:0.3,
    });
    Y=doc.lastAutoTable.finalY+8;
  } else if(pecasRows.length>0){
    // fallback sem autotable — lista simples
    pecasRows.forEach(function(r){
      setFont(10,'normal',C.text);
      txt(r[1]+' · '+r[2],body_x,Y);
      setFont(9,'normal',C.gray);
      txt(r[4],PW-MR,Y,{align:'right'});
      Y+=14;
    });
    Y+=6;
  }

  // Área total
  rect(body_x,Y,body_w,24,C.offWh,3);
  setFont(9,'normal',C.gray);
  txt('Área total fabricada',body_x+12,Y+15);
  setFont(13,'bold',C.text);
  doc.text((typeof fm==='function'?fm(q.m2||0):parseFloat(q.m2||0).toFixed(3))+' m²',PW-MR-12,Y+15,{align:'right'});
  Y+=32;

  // ── VERIFICAR QUEBRA DE PÁGINA ──
  function checkPage(neededH){
    if(Y+neededH>PH-60){
      doc.addPage();
      Y=36;
    }
  }

  // ── SERVIÇOS INCLUSOS ──
  checkPage(80);
  Y=secTitle('Serviços Inclusos',Y);
  var svcs=(q.acN&&q.acN.length?q.acN:[]).concat(['Fabricação e acabamento completo']);
  svcs.forEach(function(s){
    setFont(10,'normal',C.gold);
    txt('✓',body_x,Y);
    setFont(10,'normal',C.text);
    var lines=doc.splitTextToSize(_ctrEsc(s),body_w-20);
    lines.forEach(function(l,i){doc.text(l,body_x+16,Y+(i*13));});
    Y+=lines.length*13+4;
  });
  if(q.obs){
    Y+=4;
    var obsLines=doc.splitTextToSize(_ctrEsc(q.obs),body_w-28);
    var obsH=obsLines.length*13+16;
    rect(body_x,Y,body_w,obsH,C.blueLt,3);
    rect(body_x,Y,3,obsH,C.blue);
    setFont(7,'bold',C.blue);
    doc.setCharSpace(0.8);
    txt('OBSERVAÇÕES',body_x+10,Y+10);
    doc.setCharSpace(0);
    setFont(10,'normal',C.text);
    obsLines.forEach(function(l,i){doc.text(l,body_x+10,Y+22+(i*13));});
    Y+=obsH+8;
  }
  Y+=6;

  // ── VALORES E PAGAMENTO ──
  checkPage(120);
  Y=secTitle('Valores e Pagamento',Y);

  // Price box escura
  var pbH=parc>0?70:48;
  rect(body_x,Y,body_w,pbH,C.dark,6);
  rectStroke(body_x,Y,body_w,pbH,C.dark,C.gold,0.4,6);
  if(parc>0){
    setFont(8,'normal',[200,200,200]);
    doc.setCharSpace(0.8);
    txt('VALOR NO CARTÃO ('+parc+'×)',body_x+16,Y+18);
    doc.setCharSpace(0);
    setFont(18,'bold',C.gold);
    txt(parc+'× de '+_ctrPdfFm(valorCartao/parc),body_x+16,Y+37);
    line(body_x+16,Y+44,PW-MR-16,Y+44,[201,168,76,80],0.4);
    setFont(8,'normal',[100,200,120]);
    doc.setCharSpace(0.5);
    txt('↓ À VISTA ('+taxa+'% de desconto)',body_x+16,Y+56);
    doc.setCharSpace(0);
    setFont(13,'bold',[100,200,120]);
    txt(_ctrPdfFm(vista),PW-MR-16,Y+56,{align:'right'});
  } else {
    setFont(8,'normal',[160,160,160]);
    doc.setCharSpace(1);
    txt('VALOR À VISTA',body_x+16,Y+18);
    doc.setCharSpace(0);
    setFont(22,'bold',C.gold);
    txt(_ctrPdfFm(vista),body_x+16,Y+40);
  }
  Y+=pbH+8;

  // Condições de pagamento (pgConds)
  pgConds.forEach(function(c){
    checkPage(36);
    var textClean=c.txt.replace(/<strong>/g,'').replace(/<\/strong>/g,'').replace(/<[^>]+>/g,'');
    Y=condItem(c.icon||'•',textClean,body_x,Y,body_w);
  });
  Y+=8;

  // ── CONDIÇÕES GERAIS ──
  checkPage(160);
  Y=secTitle('Condições Gerais',Y);
  var conds=[
    [1,'A '+emp.nome+' se compromete a fornecer o material e executar os serviços descritos neste contrato dentro do prazo acordado entre as partes.'],
    [2,'O prazo de produção de '+prazo+' dias úteis começa a contar após o pagamento da entrada e confirmação das medidas definitivas pelo cliente.'],
    [3,'Variações naturais de cor, veios e textura são características próprias de pedras naturais e não constituem defeito de fabricação.'],
  ];
  if(temInstalacao){
    conds.push([4,'O cliente é responsável por garantir que o ambiente esteja completamente pronto e nivelado no dia da instalação (gabinetes, paredes, encanamentos). Caso o ambiente não esteja pronto, o cliente terá 2 (dois) dias úteis para regularizar; não regularizado, o agendamento será remarcado conforme o cronograma da contratada, sem custo adicional.']);
    conds.push([5,'Alterações no projeto após a aprovação das medidas poderão gerar custos adicionais, sujeitos a novo orçamento.']);
    conds.push([6,'A rescisão do contrato após o início da produção implicará cobrança mínima de 40% do valor total para cobrir materiais e mão de obra já executados.']);
  } else {
    conds.push([4,'Alterações no projeto após a aprovação das medidas poderão gerar custos adicionais, sujeitos a novo orçamento.']);
    conds.push([5,'A rescisão do contrato após o início da produção implicará cobrança mínima de 40% do valor total para cobrir materiais e mão de obra já executados.']);
  }
  conds.forEach(function(c){
    checkPage(44);
    Y=condItem(c[0],c[1],body_x,Y,body_w);
  });

  // Alerta instalação
  if(temInstalacao){
    checkPage(50);
    Y+=4;
    var warnLines=doc.splitTextToSize('⚠️ Atenção: No dia da instalação, o ambiente deve estar totalmente pronto. Caso contrário, o cliente terá 2 dias úteis para regularizar — não regularizado, o agendamento será remarcado conforme nosso cronograma.',body_w-20);
    var warnH=warnLines.length*13+16;
    rect(body_x,Y,body_w,warnH,C.warn,3);
    rect(body_x,Y,4,warnH,C.warnBd);
    setFont(10,'normal',C.goldDk);
    warnLines.forEach(function(l,i){doc.text(l,body_x+14,Y+13+(i*13));});
    Y+=warnH+8;
  }
  Y+=6;

  // ── GARANTIA ──
  checkPage(120);
  Y=secTitle('Garantia',Y);
  if(temInstalacao){
    var gLines1=doc.splitTextToSize('A '+emp.nome+' garante por 12 (doze) meses, a partir da data de instalação, todas as peças instaladas pela nossa equipe, contra defeitos de fabricação e instalação.',body_w-20);
    var gLines2=doc.splitTextToSize('Peças fornecidas mas não instaladas pela contratada possuem garantia somente até o ato da entrega — após a entrega ao cliente, a responsabilidade pela integridade é do contratante.',body_w-20);
    var gH=(gLines1.length+gLines2.length)*13+36;
    rectStroke(body_x,Y,body_w,gH,C.greenLt,[100,180,100],0.5,6);
    // badge
    rect(body_x+10,Y+10,110,16,C.green,8);
    setFont(7.5,'bold',C.white);
    doc.text('✅ GARANTIA OFICIAL',body_x+65,Y+20,{align:'center'});
    setFont(11,'bold',C.dark);
    txt('12 meses para peças instaladas pela nossa equipe',body_x+10,Y+36);
    setFont(10,'normal',[42,74,42]);
    var gy=Y+50;
    gLines1.forEach(function(l){doc.text(l,body_x+10,gy);gy+=13;});
    gy+=4;
    setFont(9,'italic',[80,100,80]);
    gLines2.forEach(function(l){doc.text(l,body_x+10,gy);gy+=12;});
    Y+=gH+10;

    // Grid cobre/não cobre
    checkPage(80);
    var gCols=body_w/2-4;
    // Cobre
    var cobLines=doc.splitTextToSize('Trincas por má execução · Falhas no acabamento · Problemas de fixação causados pela equipe · Desnivelamento causado na instalação',gCols-16);
    var cobH=cobLines.length*12+32;
    rectStroke(body_x,Y,gCols,cobH,C.greenLt,[100,180,100],0.4,4);
    setFont(7.5,'bold',C.green);
    doc.setCharSpace(0.5);
    txt('✅ PEÇAS INSTALADAS PELA HR (12 MESES)',body_x+8,Y+14);
    doc.setCharSpace(0);
    setFont(9,'normal',[42,74,42]);
    cobLines.forEach(function(l,i){doc.text(l,body_x+8,Y+26+(i*12));});
    // Não cobre
    var ncLines=doc.splitTextToSize('Danos por mau uso ou impactos · Produtos químicos inadequados · Problemas estruturais do imóvel · Desgaste natural · Peças não instaladas pela HR após entrega',gCols-16);
    var ncX=body_x+gCols+8;
    var ncH=Math.max(cobH,ncLines.length*12+32);
    rectStroke(ncX,Y,gCols,ncH,[255,245,245],[180,100,100],0.4,4);
    setFont(7.5,'bold',C.red);
    doc.setCharSpace(0.5);
    txt('❌ NÃO COBRE (QUALQUER PEÇA)',ncX+8,Y+14);
    doc.setCharSpace(0);
    setFont(9,'normal',[100,42,42]);
    ncLines.forEach(function(l,i){doc.text(l,ncX+8,Y+26+(i*12));});
    Y+=Math.max(cobH,ncH)+12;
  } else {
    var gSLns=doc.splitTextToSize('As peças fornecidas possuem garantia de qualidade de fabricação até o momento da entrega ao cliente. Após a entrega, a responsabilidade pela integridade, transporte e instalação é do contratante. A '+emp.nome+' se compromete a entregar as peças dentro das especificações acordadas, sem defeitos de fabricação, acabamento e dimensões.',body_w-24);
    var gSH=gSLns.length*13+36;
    rectStroke(body_x,Y,body_w,gSH,[254,249,231],[200,168,76],0.5,6);
    rect(body_x+10,Y+10,130,16,[125,102,8],8);
    setFont(7.5,'bold',C.white);
    doc.text('📦 GARANTIA DE FORNECIMENTO',body_x+75,Y+20,{align:'center'});
    setFont(11,'bold',[74,56,0]);
    txt('Garantia válida até a entrega',body_x+10,Y+36);
    setFont(10,'normal',[90,69,0]);
    var gsy=Y+50;
    gSLns.forEach(function(l){doc.text(l,body_x+10,gsy);gsy+=13;});
    Y+=gSH+12;
  }

  // ── ASSINATURAS ──
  checkPage(110);
  Y=secTitle('Assinaturas',Y);
  setFont(9,'normal',C.gray);
  doc.text(emp.cidade+', '+dataStr,PW/2,Y+10,{align:'center'});
  Y+=26;
  var sigW=body_w/2-30;
  // Linha contratada
  line(body_x,Y,body_x+sigW,Y,C.text,1);
  setFont(10,'bold',C.text);
  txt(emp.nome||'',body_x,Y+13);
  setFont(8,'normal',C.gray);
  txt('Contratada · CNPJ: '+(emp.cnpj||''),body_x,Y+25);
  // Linha contratante
  var sig2x=body_x+body_w/2+20;
  line(sig2x,Y,sig2x+sigW,Y,C.text,1);
  setFont(10,'bold',C.text);
  txt(_ctrEsc(q.cli||''),sig2x,Y+13);
  setFont(8,'normal',C.gray);
  txt('Contratante · CPF: ___________________',sig2x,Y+25);
  Y+=44;

  // ── RODAPÉ ──
  // Adicionar rodapé em todas as páginas
  var totalPages=doc.getNumberOfPages();
  for(var pg=1;pg<=totalPages;pg++){
    doc.setPage(pg);
    rect(0,PH-32,PW,32,C.darkHdr);
    setFont(8,'normal',[201,168,76,80]);
    doc.setTextColor(100,80,20);
    doc.setTextColor(150,120,40);
    doc.text(emp.nome+'  ·  '+emp.cnpj,ML,PH-14);
    doc.text('Contrato gerado em '+dataSimples+'  ·  Pg '+pg+'/'+totalPages,PW-MR,PH-14,{align:'right'});
  }

  // ════════════════════════════════════════
  // GERAR BLOB E MOSTRAR VIEWER
  // ════════════════════════════════════════
  var pdfBlob=doc.output('blob');
  var pdfUrl=URL.createObjectURL(pdfBlob);
  _mostrarViewerContrato(pdfBlob,pdfUrl,fileName,contrNum,q,emp);
}

// ── Viewer de tela cheia ──
function _mostrarViewerContrato(pdfBlob,pdfUrl,fileName,contrNum,q,emp){
  var old=document.getElementById('contrPdfOv');if(old)old.remove();

  var ov=document.createElement('div');
  ov.id='contrPdfOv';
  ov.style.cssText='position:fixed;inset:0;background:#111;z-index:9999;display:flex;flex-direction:column;font-family:Outfit,sans-serif;';

  // ── Barra superior ──
  var bar=document.createElement('div');
  bar.style.cssText='display:flex;align-items:center;gap:8px;padding:10px 12px;background:#0a1f12;border-bottom:1px solid rgba(77,184,122,.35);flex-shrink:0;flex-wrap:wrap;';
  bar.innerHTML=
    '<span style="flex:1;font-size:.78rem;font-weight:700;color:#4db87a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📄 '+contrNum+' — '+(q.cli||'')+'</span>'
    +'<button id="cPdfClose" style="background:transparent;border:1px solid rgba(77,184,122,.3);color:rgba(77,184,122,.8);padding:7px 12px;border-radius:8px;font-size:.73rem;cursor:pointer;">✕ Fechar</button>'
    +'<button id="cPdfDown" style="background:#0d2a18;border:1px solid rgba(77,184,122,.35);color:#4db87a;padding:7px 14px;border-radius:8px;font-size:.73rem;cursor:pointer;font-weight:600;">⬇ Salvar PDF</button>'
    +'<button id="cPdfWA"  style="background:#075e36;border:1px solid #25d366;color:#25d366;padding:7px 14px;border-radius:8px;font-size:.73rem;cursor:pointer;font-weight:700;">💬 WhatsApp</button>';
  ov.appendChild(bar);

  // ── Área de preview ──
  var preview=document.createElement('div');
  preview.style.cssText='flex:1;overflow:auto;background:#333;display:flex;justify-content:center;padding:16px 8px;';

  // Embed PDF no iframe (funciona em Android Chrome e iOS Safari)
  var iframe=document.createElement('iframe');
  iframe.src=pdfUrl;
  iframe.style.cssText='width:100%;max-width:820px;height:100%;min-height:500px;border:none;background:#fff;box-shadow:0 4px 32px rgba(0,0,0,.6);';
  iframe.title='Contrato PDF';
  preview.appendChild(iframe);
  ov.appendChild(preview);
  document.body.appendChild(ov);

  // ── Fechar ──
  document.getElementById('cPdfClose').onclick=function(){
    ov.remove();
    URL.revokeObjectURL(pdfUrl);
  };

  // ── Salvar PDF ──
  document.getElementById('cPdfDown').onclick=function(){
    var a=document.createElement('a');
    a.href=pdfUrl;
    a.download=fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    if(typeof toast==='function')toast('✓ PDF salvo: '+fileName);
  };

  // ── WhatsApp ──
  document.getElementById('cPdfWA').onclick=function(){
    var pdfFile=new File([pdfBlob],fileName,{type:'application/pdf'});
    var telEmp=(emp&&emp.tel)?emp.tel.replace(/\D/g,''):'';
    var telCliente=(q&&q.tel)?q.tel.replace(/\D/g,''):'';
    // Tenta Web Share API (Android nativo — envia arquivo direto para WhatsApp)
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[pdfFile]})){
      navigator.share({
        files:[pdfFile],
        title:'Contrato '+contrNum+' — '+(q.cli||''),
        text:(emp&&emp.nome?emp.nome:'HR Mármores')+'\nContrato de Fornecimento'+(q.tipo?' — '+q.tipo:''),
      }).then(function(){
        if(typeof toast==='function')toast('✓ Compartilhado!');
      }).catch(function(err){
        if(err.name!=='AbortError')_ctrFallbackWA(pdfUrl,fileName,telCliente,contrNum,q,emp);
      });
    } else {
      // Fallback: link wa.me com mensagem de texto + download separado
      _ctrFallbackWA(pdfUrl,fileName,telCliente,contrNum,q,emp);
    }
  };

  if(typeof toast==='function')toast('✓ Contrato PDF pronto — '+contrNum);
}

function _ctrFallbackWA(pdfUrl,fileName,tel,contrNum,q,emp){
  // Abre o PDF para download e logo em seguida o WhatsApp com a mensagem
  var a=document.createElement('a');
  a.href=pdfUrl;
  a.download=fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  var msg='Olá'+(q.cli?' '+_ctrEsc(q.cli):'')+',\n\nSegue o contrato referente ao seu pedido de '+(q.tipo||'mármore/granito')+'.\n\nValor: '+_ctrPdfFm(q.vista||0)+'\n\n'+((emp&&emp.nome)||'HR Mármores');
  var waNum=tel||'';
  var waUrl='https://wa.me/'+(waNum?'55'+waNum:'')+'?text='+encodeURIComponent(msg);
  setTimeout(function(){window.open(waUrl,'_blank');},800);
  if(typeof toast==='function')toast('📥 PDF baixado — abrindo WhatsApp...');
}

// ════════════════════════════════════════
// SUBSTITUIÇÃO DA FUNÇÃO ORIGINAL
// Intercepta _gerarContratoHtml e redireciona para a versão vetorial
// ════════════════════════════════════════
(function(){
  // Aguarda app-core.js carregar _gerarContratoHtml
  var t=0,iv=setInterval(function(){
    t++;
    if(typeof _gerarContratoHtml==='function'&&!_gerarContratoHtml._pdfPatched){
      var _orig=_gerarContratoHtml;
      _gerarContratoHtml=function(q,pgConds,prazo,valid,parc,taxa){
        // Redireciona para geração vetorial
        gerarContratoPDFVetorial(q,pgConds,prazo,valid,parc,taxa);
      };
      _gerarContratoHtml._pdfPatched=true;
      clearInterval(iv);
      console.log('[ContratoPDF] ✓ Modo vetorial ativado');
    }
    if(t>80)clearInterval(iv);
  },150);
})();
