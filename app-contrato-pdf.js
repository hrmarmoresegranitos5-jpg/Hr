// ══════════════════════════════════════════════════════════════
// CONTRATO PDF PROFISSIONAL v4
// jsPDF vetorial — 2 páginas, texto real, WhatsApp direto
// ══════════════════════════════════════════════════════════════

function _loadContrPDFLibs(cb){
  if(typeof window.jspdf!=='undefined'&&window.jspdf.jsPDF){
    if(document._ctrAutoTableLoaded){cb();return;}
  }
  var s1=document.createElement('script');
  s1.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
  s1.onload=function(){
    var s2=document.createElement('script');
    s2.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
    s2.onload=function(){document._ctrAutoTableLoaded=true;cb();};
    s2.onerror=function(){cb();};
    document.head.appendChild(s2);
  };
  s1.onerror=function(){if(typeof toast==='function')toast('Erro ao carregar biblioteca PDF');};
  document.head.appendChild(s1);
}

function _pfm(v){return'R$ '+(parseFloat(v||0)).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function _pesc(s){return(s||'').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');}
function _pstrip(s){return(s||'').replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ');}

var PC={
  gold:[201,168,76],goldDk:[120,90,20],dark:[15,12,0],darkHdr:[20,16,0],
  white:[255,255,255],offWh:[247,242,232],text:[26,26,26],gray:[100,100,100],
  lgray:[160,160,160],divider:[220,200,140],
  green:[42,106,42],greenLt:[232,245,232],
  warn:[255,248,225],warnBd:[201,168,76],condBg:[250,246,239],
  rowAlt:[250,245,234],blueLt:[240,244,255],blue:[40,80,160],
};

// Estado do doc durante geração
var _pd={doc:null,PW:595.28,PH:841.89,ML:36,MR:36,Y:0};
function _MW(){return _pd.PW-_pd.ML-_pd.MR;}

function _pRect(x,y,w,h,c,r){
  _pd.doc.setFillColor(c[0],c[1],c[2]);
  r?_pd.doc.roundedRect(x,y,w,h,r,r,'F'):_pd.doc.rect(x,y,w,h,'F');
}
function _pRectS(x,y,w,h,f,s,lw,r){
  _pd.doc.setFillColor(f[0],f[1],f[2]);
  _pd.doc.setDrawColor(s[0],s[1],s[2]);
  _pd.doc.setLineWidth(lw||0.5);
  r?_pd.doc.roundedRect(x,y,w,h,r,r,'FD'):_pd.doc.rect(x,y,w,h,'FD');
}
function _pLine(x1,y1,x2,y2,c,lw){
  _pd.doc.setDrawColor(c[0],c[1],c[2]);
  _pd.doc.setLineWidth(lw||0.5);
  _pd.doc.line(x1,y1,x2,y2);
}
function _pFont(sz,st,c){
  _pd.doc.setFontSize(sz);
  _pd.doc.setFont('helvetica',st||'normal');
  if(c)_pd.doc.setTextColor(c[0],c[1],c[2]);
}
function _pT(txt,x,y,opts){_pd.doc.text(String(txt||''),x,y,opts||{});}
function _pSpl(txt,w){return _pd.doc.splitTextToSize(String(txt||''),w);}

function _pChk(need){
  if(_pd.Y+need>_pd.PH-44){
    _pd.doc.addPage();
    _pd.Y=36;
  }
}

function _pSecTitle(label){
  _pChk(22);
  _pLine(_pd.ML,_pd.Y,_pd.PW-_pd.MR,_pd.Y,PC.gold,0.5);
  _pd.Y+=7;
  _pFont(6.5,'bold',PC.gold);
  _pd.doc.setCharSpace(2);
  _pT(label.toUpperCase(),_pd.ML,_pd.Y);
  _pd.doc.setCharSpace(0);
  _pd.Y+=11;
}

function _pCondItem(num,text){
  var lines=_pSpl(_pstrip(text),_MW()-36);
  var h=Math.max(22,lines.length*12+12);
  _pChk(h+4);
  var x=_pd.ML,y=_pd.Y;
  _pRect(x,y,3,h,PC.gold);
  _pRect(x+3,y,_MW()-3,h,PC.condBg);
  _pFont(10,'bold',PC.gold);_pT(String(num),x+10,y+h/2+4);
  _pFont(9.5,'normal',PC.text);
  var ty=y+(h/2)-(lines.length*12/2)+8;
  lines.forEach(function(l){_pT(l,x+30,ty);ty+=12;});
  _pd.Y=y+h+4;
}

function gerarContratoPDFVetorial(q,pgConds,prazo,valid,parc,taxa){
  _loadContrPDFLibs(function(){
    try{_buildPDF(q,pgConds,prazo,valid,parc,taxa);}
    catch(e){console.error('contratoPDF:',e);if(typeof toast==='function')toast('Erro PDF: '+e.message);}
  });
}

function _buildPDF(q,pgConds,prazo,valid,parc,taxa){
  var jsPDF=window.jspdf.jsPDF;
  var emp=CFG&&CFG.emp?CFG.emp:{nome:'HR',cnpj:'',end:'',cidade:'',tel:''};
  var hoje=new Date();
  var dataStr=hoje.toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'});
  var dataSimples=hoje.toLocaleDateString('pt-BR');
  var contrNum='CTR-'+String(q.id).slice(-6);
  var nomeArq='Contrato_'+contrNum+'_'+(q.cli||'cliente').replace(/[^a-zA-Z0-9]/g,'_')+'.pdf';
  var tipo=q.tipo||'Projeto';
  var temInst=(q.acN||[]).some(function(a){return(a||'').toLowerCase().indexOf('instala')>=0;});
  var vista=q.vista||0;
  var vCartao=parc>0?vista*(1+taxa/100):0;

  _pd.doc=new jsPDF({orientation:'portrait',unit:'pt',format:'a4'});
  _pd.PW=595.28;_pd.PH=841.89;_pd.ML=36;_pd.MR=36;_pd.Y=0;

  var PW=_pd.PW,PH=_pd.PH,ML=_pd.ML,MR=_pd.MR;

  // ════ HEADER ════
  _pRect(0,0,PW,70,PC.darkHdr);
  _pLine(0,70,PW,70,PC.gold,2);
  _pFont(15,'bold',PC.gold);_pT(emp.nome||'HR Mármores',ML,29);
  _pFont(7,'normal',[150,120,40]);_pd.doc.setCharSpace(2.2);
  _pT('MÁRMORES · GRANITOS · QUARTZITOS',ML,41);_pd.doc.setCharSpace(0);
  _pFont(8.5,'normal',[200,195,185]);
  var ey=18;
  [emp.tel,emp.end,emp.cidade,'CNPJ: '+emp.cnpj].forEach(function(l){
    if(l&&l.trim()){_pd.doc.text(l,PW-MR,ey,{align:'right'});ey+=12;}
  });

  // ════ FAIXA TÍTULO ════
  _pRect(0,70,PW,44,PC.offWh);
  _pLine(0,114,PW,114,PC.divider,1);
  _pFont(13,'bold',PC.dark);_pT('CONTRATO DE FORNECIMENTO'+(temInst?' E INSTALAÇÃO':''),ML,91);
  _pFont(7.5,'normal',PC.gray);_pd.doc.setCharSpace(0.3);
  _pT('Documento com validade jurídica entre as partes',ML,104);_pd.doc.setCharSpace(0);
  _pFont(8.5,'normal',PC.gray);
  _pd.doc.text('Nº '+String(q.id).slice(-6),PW-MR,88,{align:'right'});
  _pd.doc.text(dataSimples,PW-MR,101,{align:'right'});
  _pd.Y=128;

  // ════ PARTES CONTRATANTES ════
  _pSecTitle('Partes Contratantes');
  var col1=ML,col2=ML+_MW()/2+8,cW=_MW()/2-12;
  var yBase=_pd.Y;

  // col esquerda
  _pd.Y=yBase;
  var campos1=[
    ['CONTRATADA',emp.nome||''],
    ['CNPJ',emp.cnpj||''],
    ['ENDEREÇO',emp.end||''],
    ['TELEFONE / WHATSAPP',emp.tel||'']
  ];
  campos1.forEach(function(c){
    _pFont(6.5,'normal',PC.lgray);_pd.doc.setCharSpace(0.7);_pT(c[0],col1,_pd.Y);_pd.doc.setCharSpace(0);_pd.Y+=10;
    _pFont(10.5,'bold',PC.text);
    var ls=_pSpl(c[1]||'—',cW);
    ls.forEach(function(l){_pT(l,col1,_pd.Y);_pd.Y+=12;});
    _pd.Y+=3;
  });
  var yL=_pd.Y;

  // col direita
  _pd.Y=yBase;
  var campos2=[['CONTRATANTE (CLIENTE)',_pesc(q.cli||'')]];
  if(q.tel)campos2.push(['TELEFONE',_pesc(q.tel)]);
  if(q.end)campos2.push(['ENDEREÇO DE ENTREGA',_pesc(q.end)]);
  if(q.cidade)campos2.push(['CIDADE',_pesc(q.cidade)]);
  campos2.forEach(function(c){
    _pFont(6.5,'normal',PC.lgray);_pd.doc.setCharSpace(0.7);_pT(c[0],col2,_pd.Y);_pd.doc.setCharSpace(0);_pd.Y+=10;
    _pFont(10.5,'bold',PC.text);
    var ls=_pSpl(c[1]||'—',cW);
    ls.forEach(function(l){_pT(l,col2,_pd.Y);_pd.Y+=12;});
    _pd.Y+=3;
  });
  _pd.Y=Math.max(yL,_pd.Y)+10;

  // ════ OBJETO DO CONTRATO ════
  _pSecTitle('Objeto do Contrato');
  var yObj=_pd.Y;
  // tipo
  _pFont(6.5,'normal',PC.lgray);_pd.doc.setCharSpace(0.7);_pT('TIPO DE SERVIÇO',col1,_pd.Y);_pd.doc.setCharSpace(0);_pd.Y+=10;
  _pFont(11,'bold',PC.text);_pT(tipo,col1,_pd.Y);
  var yTipo=_pd.Y+13;
  // material
  _pd.Y=yObj;
  _pFont(6.5,'normal',PC.lgray);_pd.doc.setCharSpace(0.7);_pT('MATERIAL',col2,_pd.Y);_pd.doc.setCharSpace(0);_pd.Y+=10;
  _pFont(10,'bold',PC.text);
  var matStr=(q.mat||'Pedra Natural')+(q.matPr?' — R$ '+parseFloat(q.matPr).toLocaleString('pt-BR',{minimumFractionDigits:2})+'/m²':'');
  var matLs=_pSpl(matStr,cW);
  matLs.forEach(function(l){_pT(l,col2,_pd.Y);_pd.Y+=12;});
  _pd.Y=Math.max(yTipo,_pd.Y)+10;

  // Tabela de peças
  var pRows=[];
  (q.pds||[]).forEach(function(p,i){
    if(!p.w||!p.h)return;
    pRows.push([String(i+1),_pesc(p.desc||'Peça'),p.w+'×'+p.h+' cm',String(p.q||1),((p.w/100)*(p.h/100)*(p.q||1)).toFixed(3)+' m²']);
  });
  (q.sfPcs||[]).forEach(function(p){
    pRows.push(['+',_pesc(p.l||'Serviço'),p.w+'ml × '+p.h+' cm',String(p.q||1),(p.m2||0).toFixed(3)+' m²']);
  });

  if(pRows.length>0&&typeof _pd.doc.autoTable==='function'){
    _pd.doc.autoTable({
      startY:_pd.Y,
      margin:{left:ML,right:MR},
      head:[['Nº','Descrição','Medidas','Qtd','Área (m²)']],
      body:pRows,
      styles:{fontSize:9,cellPadding:{top:6,bottom:6,left:7,right:7}},
      headStyles:{fillColor:[20,16,0],textColor:[201,168,76],fontStyle:'bold',fontSize:7.5},
      alternateRowStyles:{fillColor:[250,245,234]},
      columnStyles:{0:{cellWidth:22,halign:'center'},2:{cellWidth:72},3:{cellWidth:28,halign:'center'},4:{cellWidth:58,halign:'right'}},
      theme:'plain',
      tableLineColor:[220,200,140],
      tableLineWidth:0.3,
    });
    _pd.Y=_pd.doc.lastAutoTable.finalY+6;
  } else if(pRows.length>0){
    pRows.forEach(function(r,i){
      _pChk(17);
      if(i%2===0)_pRect(ML,_pd.Y-10,_MW(),16,PC.rowAlt);
      _pFont(9,'normal',PC.text);_pT(r[1],ML+6,_pd.Y);
      _pFont(9,'normal',PC.gray);_pd.doc.text(r[2],PW-MR,_pd.Y,{align:'right'});
      _pd.Y+=17;
    });
    _pd.Y+=4;
  }

  // Área total
  _pChk(26);
  _pRect(ML,_pd.Y,_MW(),24,PC.offWh,3);
  _pFont(9,'normal',PC.gray);_pT('Área total fabricada',ML+12,_pd.Y+15);
  _pFont(13,'bold',PC.text);
  var m2s=(typeof fm==='function'?fm(q.m2||0):(q.m2||0).toFixed(3))+' m²';
  _pd.doc.text(m2s,PW-MR-12,_pd.Y+15,{align:'right'});
  _pd.Y+=32;

  // ════ SERVIÇOS INCLUSOS ════
  _pSecTitle('Serviços Inclusos');
  var svcs=(q.acN&&q.acN.length?q.acN:[]).concat(['Fabricação e acabamento completo']);
  svcs.forEach(function(s){
    _pChk(16);
    _pFont(10,'bold',PC.gold);_pT('✓',ML,_pd.Y);
    _pFont(9.5,'normal',PC.text);
    var sl=_pSpl(_pesc(s),_MW()-16);
    sl.forEach(function(l,i){_pT(l,ML+13,_pd.Y+(i*12));});
    _pd.Y+=sl.length*12+3;
  });
  if(q.obs){
    _pChk(38);
    _pd.Y+=4;
    var obl=_pSpl(_pesc(q.obs),_MW()-20);
    var obh=obl.length*12+18;
    _pRect(ML,_pd.Y,_MW(),obh,PC.blueLt,3);
    _pRect(ML,_pd.Y,3,obh,PC.blue);
    _pFont(6.5,'bold',PC.blue);_pd.doc.setCharSpace(0.7);_pT('OBSERVAÇÕES',ML+9,_pd.Y+11);_pd.doc.setCharSpace(0);
    _pFont(9.5,'normal',PC.text);
    obl.forEach(function(l,i){_pT(l,ML+9,_pd.Y+22+(i*12));});
    _pd.Y+=obh+8;
  }
  _pd.Y+=6;

  // ════ VALORES E PAGAMENTO ════
  _pSecTitle('Valores e Pagamento');
  var pbH=parc>0?66:46;
  _pChk(pbH+8);
  _pRectS(ML,_pd.Y,_MW(),pbH,PC.dark,PC.gold,0.4,5);
  if(parc>0){
    _pFont(7.5,'normal',[170,165,155]);_pd.doc.setCharSpace(0.7);
    _pT('VALOR NO CARTÃO ('+parc+'×)',ML+14,_pd.Y+16);_pd.doc.setCharSpace(0);
    _pFont(17,'bold',PC.gold);_pT(parc+'× de '+_pfm(vCartao/parc),ML+14,_pd.Y+34);
    _pLine(ML+14,_pd.Y+40,PW-MR-14,_pd.Y+40,[150,120,40],0.4);
    _pFont(7.5,'normal',[100,195,130]);_pd.doc.setCharSpace(0.5);
    _pT('↓ À VISTA ('+taxa+'% de desconto)',ML+14,_pd.Y+52);_pd.doc.setCharSpace(0);
    _pFont(12,'bold',[100,195,130]);_pd.doc.text(_pfm(vista),PW-MR-14,_pd.Y+52,{align:'right'});
  } else {
    _pFont(7.5,'normal',[160,155,145]);_pd.doc.setCharSpace(0.9);
    _pT('VALOR À VISTA',ML+14,_pd.Y+16);_pd.doc.setCharSpace(0);
    _pFont(21,'bold',PC.gold);_pT(_pfm(vista),ML+14,_pd.Y+37);
  }
  _pd.Y+=pbH+8;

  pgConds.forEach(function(c){_pCondItem(c.icon||'•',c.txt||'');});
  _pd.Y+=8;

  // ════ FORÇA PG 2 — Condições + Garantia + Assinaturas ════
  // Sempre garante que estas seções ficam juntas na pg 2
  _pChk(600);

  // ════ CONDIÇÕES GERAIS ════
  _pSecTitle('Condições Gerais');
  var conds=[
    [1,'A '+emp.nome+' se compromete a fornecer o material e executar os serviços descritos neste contrato dentro do prazo acordado entre as partes.'],
    [2,'O prazo de produção de '+prazo+' dias úteis começa a contar após o pagamento da entrada e confirmação das medidas definitivas pelo cliente.'],
    [3,'Variações naturais de cor, veios e textura são características próprias de pedras naturais e não constituem defeito de fabricação.'],
  ];
  if(temInst){
    conds.push([4,'O cliente é responsável por garantir que o ambiente esteja completamente pronto e nivelado no dia da instalação (gabinetes, paredes, encanamentos). Caso o ambiente não esteja pronto, o cliente terá 2 (dois) dias úteis para regularizar; não regularizado, o agendamento será remarcado conforme o cronograma da contratada, sem custo adicional.']);
    conds.push([5,'Alterações no projeto após a aprovação das medidas poderão gerar custos adicionais, sujeitos a novo orçamento.']);
    conds.push([6,'A rescisão do contrato após o início da produção implicará cobrança mínima de 40% do valor total para cobrir materiais e mão de obra já executados.']);
  } else {
    conds.push([4,'Alterações no projeto após a aprovação das medidas poderão gerar custos adicionais, sujeitos a novo orçamento.']);
    conds.push([5,'A rescisão do contrato após o início da produção implicará cobrança mínima de 40% do valor total para cobrir materiais e mão de obra já executados.']);
  }
  conds.forEach(function(c){_pCondItem(c[0],c[1]);});

  if(temInst){
    _pChk(48);
    _pd.Y+=4;
    var wl=_pSpl('Atenção: No dia da instalação, o ambiente deve estar totalmente pronto. Caso contrário, o cliente terá 2 dias úteis para regularizar — não regularizado, o agendamento será remarcado conforme nosso cronograma.',_MW()-20);
    var wh=wl.length*12+16;
    _pRect(ML,_pd.Y,_MW(),wh,PC.warn,3);
    _pRect(ML,_pd.Y,4,wh,PC.warnBd);
    _pFont(9.5,'bold',PC.goldDk);
    wl.forEach(function(l,i){_pT(l,ML+12,_pd.Y+12+(i*12));});
    _pd.Y+=wh+8;
  }
  _pd.Y+=6;

  // ════ GARANTIA ════
  _pSecTitle('Garantia');
  if(temInst){
    var gl1=_pSpl('A '+emp.nome+' garante por 12 (doze) meses, a partir da data de instalação, todas as peças instaladas pela nossa equipe, contra defeitos de fabricação e instalação.',_MW()-20);
    var gl2=_pSpl('Peças fornecidas mas não instaladas pela contratada possuem garantia somente até o ato da entrega — após a entrega, a responsabilidade pela integridade é do contratante.',_MW()-20);
    var gh=(gl1.length+gl2.length)*12+48;
    _pChk(gh+8);
    _pRectS(ML,_pd.Y,_MW(),gh,PC.greenLt,[100,180,100],0.5,5);
    _pRect(ML+10,_pd.Y+10,106,16,PC.green,8);
    _pFont(7,'bold',PC.white);_pd.doc.text('✅ GARANTIA OFICIAL',ML+63,_pd.Y+20,{align:'center'});
    _pFont(11,'bold',PC.dark);_pT('12 meses para peças instaladas pela nossa equipe',ML+10,_pd.Y+36);
    _pFont(9.5,'normal',[42,74,42]);
    var gy=_pd.Y+50;
    gl1.forEach(function(l){_pT(l,ML+10,gy);gy+=12;});
    gy+=4;
    _pFont(8.5,'italic',[70,100,70]);
    gl2.forEach(function(l){_pT(l,ML+10,gy);gy+=11;});
    _pd.Y+=gh+10;

    _pChk(76);
    var gcW=_MW()/2-4;
    var cbl=_pSpl('Trincas por má execução · Falhas no acabamento · Problemas de fixação pela equipe · Desnivelamento na instalação',gcW-16);
    var ncl=_pSpl('Danos por mau uso ou impactos · Produtos químicos inadequados · Problemas estruturais do imóvel · Desgaste natural · Peças não instaladas pela HR após entrega',gcW-16);
    var ch=Math.max(cbl.length,ncl.length)*12+32;
    _pRectS(ML,_pd.Y,gcW,ch,PC.greenLt,[100,180,100],0.4,4);
    _pFont(6.5,'bold',[42,106,42]);_pd.doc.setCharSpace(0.4);_pT('✅ COBRE (12 MESES)',ML+8,_pd.Y+13);_pd.doc.setCharSpace(0);
    _pFont(8.5,'normal',[42,74,42]);
    cbl.forEach(function(l,i){_pT(l,ML+8,_pd.Y+24+(i*12));});
    var ncX=ML+gcW+8;
    _pRectS(ncX,_pd.Y,gcW,ch,[255,245,245],[180,100,100],0.4,4);
    _pFont(6.5,'bold',[138,42,42]);_pd.doc.setCharSpace(0.4);_pT('❌ NÃO COBRE',ncX+8,_pd.Y+13);_pd.doc.setCharSpace(0);
    _pFont(8.5,'normal',[100,42,42]);
    ncl.forEach(function(l,i){_pT(l,ncX+8,_pd.Y+24+(i*12));});
    _pd.Y+=ch+12;
  } else {
    var gsl=_pSpl('As peças fornecidas possuem garantia de qualidade até o momento da entrega ao cliente. Após a entrega, a responsabilidade pela integridade, transporte e instalação é do contratante. A '+emp.nome+' se compromete a entregar as peças dentro das especificações acordadas, sem defeitos de fabricação e dimensões.',_MW()-20);
    var gsh=gsl.length*12+44;
    _pChk(gsh+8);
    _pRectS(ML,_pd.Y,_MW(),gsh,[254,249,231],[200,168,76],0.5,5);
    _pRect(ML+10,_pd.Y+10,126,16,[125,102,8],8);
    _pFont(7,'bold',PC.white);_pd.doc.text('📦 GARANTIA DE FORNECIMENTO',ML+73,_pd.Y+20,{align:'center'});
    _pFont(11,'bold',[74,56,0]);_pT('Garantia válida até a entrega',ML+10,_pd.Y+36);
    _pFont(9.5,'normal',[90,70,0]);
    var ggy=_pd.Y+50;
    gsl.forEach(function(l){_pT(l,ML+10,ggy);ggy+=12;});
    _pd.Y+=gsh+12;
  }
  _pd.Y+=8;

  // ════ ASSINATURAS ════
  _pSecTitle('Assinaturas');
  _pChk(90);
  _pFont(8.5,'normal',PC.gray);
  _pd.doc.text(emp.cidade+', '+dataStr,PW/2,_pd.Y+10,{align:'center'});
  _pd.Y+=28;
  var sigW=_MW()/2-28;
  _pLine(ML,_pd.Y,ML+sigW,_pd.Y,PC.text,1);
  _pFont(10,'bold',PC.text);_pT(emp.nome||'',ML,_pd.Y+13);
  _pFont(7.5,'normal',PC.gray);_pT('Contratada · CNPJ: '+(emp.cnpj||''),ML,_pd.Y+24);
  var s2x=ML+_MW()/2+20;
  _pLine(s2x,_pd.Y,s2x+sigW,_pd.Y,PC.text,1);
  _pFont(10,'bold',PC.text);_pT(_pesc(q.cli||''),s2x,_pd.Y+13);
  _pFont(7.5,'normal',PC.gray);_pT('Contratante · CPF: ___________________',s2x,_pd.Y+24);
  _pd.Y+=50;

  // ════ RODAPÉ EM TODAS AS PÁGINAS ════
  var tot=_pd.doc.getNumberOfPages();
  for(var pg=1;pg<=tot;pg++){
    _pd.doc.setPage(pg);
    _pRect(0,PH-28,PW,28,PC.darkHdr);
    _pFont(7.5,'normal',[130,105,35]);
    _pd.doc.text((emp.nome||'')+'  ·  '+(emp.cnpj||''),ML,PH-10);
    _pd.doc.text('Gerado em '+dataSimples+'  ·  Pág '+pg+'/'+tot,PW-MR,PH-10,{align:'right'});
  }

  var pdfBlob=_pd.doc.output('blob');
  var pdfUrl=URL.createObjectURL(pdfBlob);
  _mostrarViewerContrato(pdfBlob,pdfUrl,nomeArq,contrNum,q,emp);
}

function _loadPdfJs(cb){
  if(window.pdfjsLib){cb();return;}
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  s.onload=function(){
    window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    cb();
  };
  s.onerror=function(){cb(true);};
  document.head.appendChild(s);
}

function _renderPdfPages(pdfDoc,container,scale){
  container.innerHTML='';
  var total=pdfDoc.numPages;
  for(var i=1;i<=total;i++){
    (function(pageNum){
      pdfDoc.getPage(pageNum).then(function(page){
        var vp=page.getViewport({scale:scale});
        var canvas=document.createElement('canvas');
        canvas.width=vp.width;
        canvas.height=vp.height;
        canvas.style.cssText='display:block;margin:0 auto 8px;width:100%;max-width:'+vp.width+'px;box-shadow:0 4px 24px rgba(0,0,0,.6);border-radius:3px;background:#fff;';
        container.appendChild(canvas);
        page.render({canvasContext:canvas.getContext('2d'),viewport:vp});
      });
    })(i);
  }
}

function _mostrarViewerContrato(blob,url,nomeArq,contrNum,q,emp){
  var old=document.getElementById('contrPdfOv');if(old){old.remove();}
  var ov=document.createElement('div');
  ov.id='contrPdfOv';
  ov.style.cssText='position:fixed;inset:0;background:#111;z-index:9999;display:flex;flex-direction:column;font-family:Outfit,sans-serif;';

  var bar=document.createElement('div');
  bar.style.cssText='display:flex;align-items:center;gap:7px;padding:9px 12px;background:#0a1f12;border-bottom:1px solid rgba(77,184,122,.35);flex-shrink:0;flex-wrap:wrap;';
  bar.innerHTML=
    '<span style="flex:1;font-size:.76rem;font-weight:700;color:#4db87a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📄 '+contrNum+' — '+(q.cli||'')+'</span>'
    +'<button id="cPdfClose" style="background:transparent;border:1px solid rgba(77,184,122,.3);color:rgba(77,184,122,.8);padding:7px 12px;border-radius:8px;font-size:.72rem;cursor:pointer;font-family:Outfit,sans-serif;">✕ Fechar</button>'
    +'<button id="cPdfDown" style="background:#0d2a18;border:1px solid rgba(77,184,122,.4);color:#4db87a;padding:7px 14px;border-radius:8px;font-size:.72rem;cursor:pointer;font-weight:600;font-family:Outfit,sans-serif;">⬇ Salvar PDF</button>'
    +'<button id="cPdfWA"  style="background:#075e36;border:1px solid #25d366;color:#25d366;padding:7px 15px;border-radius:8px;font-size:.72rem;cursor:pointer;font-weight:700;font-family:Outfit,sans-serif;">💬 WhatsApp</button>';
  ov.appendChild(bar);

  var preview=document.createElement('div');
  preview.style.cssText='flex:1;overflow:auto;background:#555;padding:12px 8px;';

  // Placeholder de loading
  var loading=document.createElement('div');
  loading.style.cssText='display:flex;align-items:center;justify-content:center;height:200px;color:#aaa;font-size:.9rem;';
  loading.textContent='Carregando visualização...';
  preview.appendChild(loading);
  ov.appendChild(preview);
  document.body.appendChild(ov);

  // Renderizar com pdf.js (funciona em mobile iOS/Android)
  _loadPdfJs(function(err){
    if(err){
      preview.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:100%;"><p style="color:#ccc;font-size:.9rem;text-align:center;">Visualização indisponível neste dispositivo.<br>Use ⬇ Salvar PDF para abrir o arquivo.</p></div>';
      return;
    }
    var getAb=blob.arrayBuffer?blob.arrayBuffer():new Promise(function(res){var fr=new FileReader();fr.onload=function(){res(fr.result);};fr.readAsArrayBuffer(blob);});
    Promise.resolve(getAb).then(function(ab){
      return window.pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;
    }).then(function(pdfDoc){
      preview.removeChild(loading);
      var scale=Math.min(2.0,(preview.clientWidth-24)/595);
      _renderPdfPages(pdfDoc,preview,scale);
    }).catch(function(e){loading.textContent='Erro ao renderizar: '+e.message;});
  });

  document.getElementById('cPdfClose').onclick=function(){ov.remove();URL.revokeObjectURL(url);};

  document.getElementById('cPdfDown').onclick=function(){
    var a=document.createElement('a');a.href=url;a.download=nomeArq;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    if(typeof toast==='function')toast('✓ PDF salvo!');
  };

  document.getElementById('cPdfWA').onclick=function(){
    var pdfFile=new File([blob],nomeArq,{type:'application/pdf'});
    if(navigator.share&&navigator.canShare&&navigator.canShare({files:[pdfFile]})){
      navigator.share({
        files:[pdfFile],
        title:'Contrato '+contrNum+' — '+(q.cli||''),
        text:(emp.nome||'HR')+'\nContrato de Fornecimento'+(q.tipo?' — '+q.tipo:''),
      }).then(function(){if(typeof toast==='function')toast('✓ Enviado!');})
       .catch(function(e){if(e&&e.name!=='AbortError')_ctrWaFb(url,nomeArq,q,emp,contrNum);});
    } else {
      _ctrWaFb(url,nomeArq,q,emp,contrNum);
    }
  };

  if(typeof toast==='function')toast('✓ Contrato PDF pronto — '+contrNum);
}

function _ctrWaFb(url,nomeArq,q,emp,contrNum){
  var a=document.createElement('a');a.href=url;a.download=nomeArq;
  document.body.appendChild(a);a.click();document.body.removeChild(a);
  var tel=(q.tel||'').replace(/\D/g,'');
  var msg='Olá'+(q.cli?' '+q.cli:'')+',\n\nSegue o contrato referente ao seu pedido de '+(q.tipo||'mármore/granito')+'.\n\nValor: '+_pfm(q.vista||0)+'\n\n'+(emp.nome||'HR');
  setTimeout(function(){
    window.open('https://wa.me/'+(tel?'55'+tel:'')+'?text='+encodeURIComponent(msg),'_blank');
  },700);
  if(typeof toast==='function')toast('📥 PDF baixado — abrindo WhatsApp...');
}

// ════ PATCH ════
(function(){
  var t=0,iv=setInterval(function(){
    t++;
    if(typeof _gerarContratoHtml==='function'&&!_gerarContratoHtml._v4){
      _gerarContratoHtml=function(q,pgConds,prazo,valid,parc,taxa){
        gerarContratoPDFVetorial(q,pgConds,prazo,valid,parc,taxa);
      };
      _gerarContratoHtml._v4=true;
      clearInterval(iv);
      console.log('[ContratoPDF v4] ✓');
    }
    if(t>100)clearInterval(iv);
  },100);
})();
