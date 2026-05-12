// ═══ FINANÇAS ═══
function openFin(t){fType=t;document.querySelectorAll('.ts').forEach(function(o){o.classList.toggle('on',o.dataset.ftp===t);});var fd=document.getElementById('fData');if(fd&&!fd.value)fd.value=td();showMd('finMd');}
function setFT(t){fType=t;document.querySelectorAll('[data-ftp]').forEach(function(o){o.classList.toggle('on',o.dataset.ftp===t);});}
function addTr(type,desc,value){DB.t.unshift({id:Date.now(),type:type,desc:desc,value:value,date:td()});DB.sv();renderFin();}
function saveFin(){var desc=document.getElementById('fDesc').value.trim(),val=+document.getElementById('fVal').value||0,date=document.getElementById('fData').value;if(!desc){toast('Preencha a descrição');return;}DB.t.unshift({id:Date.now(),type:fType,desc:desc,value:val,date:date});DB.sv();renderFin();closeAll();document.getElementById('fDesc').value='';document.getElementById('fVal').value='';toast('✓ Lançado!');}
function openEditTr(id){
  editTrId=+id;
  var t=DB.t.find(function(x){return x.id===editTrId;});if(!t)return;
  document.getElementById('teDesc').value=t.desc||'';
  document.getElementById('teVal').value=t.value||'';
  document.getElementById('teData').value=t.date||td();
  document.querySelectorAll('[data-tet]').forEach(function(o){o.classList.toggle('on',o.dataset.tet===t.type);});
  showMd('trEdMd');
}
function setTET(tp){document.querySelectorAll('[data-tet]').forEach(function(o){o.classList.toggle('on',o.dataset.tet===tp);});}
function saveTrEdit(){
  var t=DB.t.find(function(x){return x.id==editTrId;});if(!t)return;
  var tp=document.querySelector('[data-tet].on');
  t.type=tp?tp.dataset.tet:t.type;
  t.desc=document.getElementById('teDesc').value.trim()||t.desc;
  t.value=+document.getElementById('teVal').value||t.value;
  t.date=document.getElementById('teData').value||t.date;
  DB.sv();renderFin();closeAll();toast('✓ Atualizado!');
}
function delTr(){if(!confirm('Excluir lançamento?'))return;DB.t=DB.t.filter(function(x){return x.id!=editTrId;});DB.sv();renderFin();closeAll();toast('✓ Excluído!');}

function _mesAtual(){return new Date().toISOString().slice(0,7);}
function _mesLabel(ym){if(!ym)return'';var p=ym.split('-');var ms=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];return(ms[+p[1]-1]||p[1])+'/'+p[0].slice(2);}

function _renderGraficos(inT,outT,pendT,DB){
  var fg=document.getElementById('finGraficos');
  if(!fg)return;
  var total=inT+outT+pendT;
  if(total===0){fg.innerHTML='';return;}

  // — Gráfico de rosca SVG —
  function arcPath(cx,cy,r,startPct,endPct,color){
    if(endPct-startPct<=0)return'';
    if(endPct-startPct>=1)endPct=startPct+0.9999;
    var s=startPct*2*Math.PI-Math.PI/2;
    var e=endPct*2*Math.PI-Math.PI/2;
    var x1=cx+r*Math.cos(s),y1=cy+r*Math.sin(s);
    var x2=cx+r*Math.cos(e),y2=cy+r*Math.sin(e);
    var large=endPct-startPct>0.5?1:0;
    return'<path d="M '+x1+' '+y1+' A '+r+' '+r+' 0 '+large+' 1 '+x2+' '+y2+'" fill="none" stroke="'+color+'" stroke-width="18" stroke-linecap="round"/>';
  }
  var pIn=inT/total,pOut=outT/total,pPend=pendT/total;
  var svgD='<svg viewBox="0 0 100 100" style="width:120px;height:120px;">';
  svgD+='<circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="18"/>';
  var cur=0;
  if(inT>0){svgD+=arcPath(50,50,35,cur,cur+pIn,'#4cda80');cur+=pIn;}
  if(outT>0){svgD+=arcPath(50,50,35,cur,cur+pOut,'#e07070');cur+=pOut;}
  if(pendT>0){svgD+=arcPath(50,50,35,cur,cur+pPend,'#7ab0de');}
  svgD+='<text x="50" y="46" text-anchor="middle" font-size="7" fill="rgba(255,255,255,.5)" font-family="Outfit,sans-serif">Saldo</text>';
  var bal=inT-outT;
  svgD+='<text x="50" y="57" text-anchor="middle" font-size="8.5" fill="'+(bal>=0?'#4cda80':'#e07070')+'" font-family="Cormorant Garamond,serif" font-weight="900">R$'+fm(bal)+'</text>';
  svgD+='</svg>';

  // — Barras dos últimos 4 meses —
  var hoje=new Date();
  var meses=[];
  for(var i=3;i>=0;i--){var d=new Date(hoje.getFullYear(),hoje.getMonth()-i,1);meses.push(d.toISOString().slice(0,7));}
  var maxBar=0;
  var barData=meses.map(function(m){
    var ei=DB.t.filter(function(t){return t.type==='in'&&(t.date||'').slice(0,7)===m;}).reduce(function(s,t){return s+(t.value||0);},0);
    var eo=DB.t.filter(function(t){return t.type==='out'&&(t.date||'').slice(0,7)===m;}).reduce(function(s,t){return s+(t.value||0);},0);
    maxBar=Math.max(maxBar,ei,eo);
    return{m:m,ei:ei,eo:eo};
  });
  var barH=60;
  var barsHtml='<div style="display:flex;align-items:flex-end;gap:5px;height:'+barH+'px;margin-bottom:4px;">';
  barData.forEach(function(b){
    var hI=maxBar>0?Math.max(3,Math.round((b.ei/maxBar)*barH)):3;
    var hO=maxBar>0?Math.max(3,Math.round((b.eo/maxBar)*barH)):3;
    barsHtml+='<div style="flex:1;display:flex;align-items:flex-end;gap:2px;justify-content:center;">';
    barsHtml+='<div style="width:45%;background:linear-gradient(180deg,#4cda80,#2a8a50);border-radius:3px 3px 0 0;height:'+hI+'px;" title="Entrada R$ '+fm(b.ei)+'"></div>';
    barsHtml+='<div style="width:45%;background:linear-gradient(180deg,#e07070,#a04040);border-radius:3px 3px 0 0;height:'+hO+'px;" title="Saída R$ '+fm(b.eo)+'"></div>';
    barsHtml+='</div>';
  });
  barsHtml+='</div>';
  barsHtml+='<div style="display:flex;gap:5px;">';
  barData.forEach(function(b){barsHtml+='<div style="flex:1;text-align:center;font-size:.48rem;color:var(--t4);">'+_mesLabel(b.m)+'</div>';});
  barsHtml+='</div>';

  fg.innerHTML=
    '<div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px 15px;margin-bottom:10px;">'
    +'<div style="font-size:.5rem;letter-spacing:2px;text-transform:uppercase;color:var(--t4);font-weight:700;margin-bottom:12px;">Visão geral</div>'
    +'<div style="display:flex;align-items:center;gap:16px;">'
      +svgD
      +'<div style="flex:1;">'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;"><div style="width:10px;height:10px;border-radius:50%;background:#4cda80;flex-shrink:0;"></div><div><div style="font-size:.58rem;color:var(--t3);">Entradas</div><div style="font-size:.74rem;font-weight:800;color:#4cda80;">R$ '+fm(inT)+'</div></div></div>'
        +'<div style="display:flex;align-items:center;gap:6px;margin-bottom:7px;"><div style="width:10px;height:10px;border-radius:50%;background:#e07070;flex-shrink:0;"></div><div><div style="font-size:.58rem;color:var(--t3);">Saídas</div><div style="font-size:.74rem;font-weight:800;color:#e07070;">R$ '+fm(outT)+'</div></div></div>'
        +'<div style="display:flex;align-items:center;gap:6px;"><div style="width:10px;height:10px;border-radius:50%;background:#7ab0de;flex-shrink:0;"></div><div><div style="font-size:.58rem;color:var(--t3);">A Receber</div><div style="font-size:.74rem;font-weight:800;color:#7ab0de;">R$ '+fm(pendT)+'</div></div></div>'
      +'</div>'
    +'</div>'
    +'</div>'
    +'<div style="background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px 15px;">'
    +'<div style="font-size:.5rem;letter-spacing:2px;text-transform:uppercase;color:var(--t4);font-weight:700;margin-bottom:10px;">Últimos 4 meses</div>'
    +'<div style="display:flex;gap:12px;margin-bottom:10px;"><div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;border-radius:2px;background:#4cda80;"></div><span style="font-size:.55rem;color:var(--t3);">Entrada</span></div><div style="display:flex;align-items:center;gap:4px;"><div style="width:8px;height:8px;border-radius:2px;background:#e07070;"></div><span style="font-size:.55rem;color:var(--t3);">Gasto</span></div></div>'
    +barsHtml
    +'</div>';
}

function renderFin(){
  if(!DB.t)DB.t=[];if(!DB.j)DB.j=[];
  var mesAtual=_mesAtual();
  var inT=DB.t.filter(function(t){return t.type==='in';}).reduce(function(s,t){return s+(t.value||0);},0);
  var outT=DB.t.filter(function(t){return t.type==='out';}).reduce(function(s,t){return s+(t.value||0);},0);
  var pendT=DB.t.filter(function(t){return t.type==='pend';}).reduce(function(s,t){return s+(t.value||0);},0);
  var inMes=DB.t.filter(function(t){return t.type==='in'&&(t.date||'').slice(0,7)===mesAtual;}).reduce(function(s,t){return s+(t.value||0);},0);
  var outMes=DB.t.filter(function(t){return t.type==='out'&&(t.date||'').slice(0,7)===mesAtual;}).reduce(function(s,t){return s+(t.value||0);},0);
  var bal=inT-outT;
  var balMes=inMes-outMes;
  var totalContratos=(DB.q||[]).filter(function(q){return q.status==='fechado';}).length;
  var ticketMedio=totalContratos>0?inT/totalContratos:0;

  // — Hero saldo —
  var fs=document.getElementById('finSaldo');
  if(fs){fs.textContent='R$ '+fm(bal);fs.className='finval '+(bal>=0?'pos':'neg');}
  var fsub=document.getElementById('finSub');
  if(fsub)fsub.textContent=pendT>0?'R$ '+fm(pendT)+' ainda a receber':'Tudo em dia ✔';
  var fb=document.getElementById('finBadges');
  if(fb){
    var bh='';
    if(inT>0)bh+='<span style="background:rgba(58,158,106,.18);border:1px solid rgba(76,218,128,.35);border-radius:20px;padding:3px 10px;font-size:.6rem;color:#4cda80;font-weight:700;">+R$ '+fm(inT)+'</span>';
    if(outT>0)bh+='<span style="background:rgba(201,68,68,.12);border:1px solid rgba(224,112,112,.3);border-radius:20px;padding:3px 10px;font-size:.6rem;color:#e07070;font-weight:700;">-R$ '+fm(outT)+'</span>';
    if(pendT>0)bh+='<span style="background:rgba(74,128,181,.14);border:1px solid rgba(122,176,222,.32);border-radius:20px;padding:3px 10px;font-size:.6rem;color:#7ab0de;font-weight:700;">⏳ R$ '+fm(pendT)+'</span>';
    fb.innerHTML=bh;
  }

  // — Cards resumo 3 colunas —
  var fc=document.getElementById('finCards');
  if(fc){fc.innerHTML=
    '<div style="background:linear-gradient(135deg,rgba(58,158,106,.16),rgba(58,158,106,.04));border:1px solid rgba(76,218,128,.28);border-radius:13px;padding:11px 8px;text-align:center;">'
      +'<div style="font-size:.45rem;letter-spacing:1.8px;text-transform:uppercase;color:rgba(76,218,128,.55);margin-bottom:4px;">Entradas</div>'
      +'<div style="font-size:.88rem;font-weight:900;color:#4cda80;font-family:\'Cormorant Garamond\',serif;">R$ '+fm(inT)+'</div>'
    +'</div>'
    +'<div style="background:linear-gradient(135deg,rgba(201,68,68,.13),rgba(201,68,68,.03));border:1px solid rgba(224,112,112,.26);border-radius:13px;padding:11px 8px;text-align:center;">'
      +'<div style="font-size:.45rem;letter-spacing:1.8px;text-transform:uppercase;color:rgba(224,112,112,.55);margin-bottom:4px;">Saídas</div>'
      +'<div style="font-size:.88rem;font-weight:900;color:#e07070;font-family:\'Cormorant Garamond\',serif;">R$ '+fm(outT)+'</div>'
    +'</div>'
    +'<div style="background:linear-gradient(135deg,rgba(74,128,181,.13),rgba(74,128,181,.03));border:1px solid rgba(122,176,222,.26);border-radius:13px;padding:11px 8px;text-align:center;">'
      +'<div style="font-size:.45rem;letter-spacing:1.8px;text-transform:uppercase;color:rgba(122,176,222,.55);margin-bottom:4px;">A Receber</div>'
      +'<div style="font-size:.88rem;font-weight:900;color:#7ab0de;font-family:\'Cormorant Garamond\',serif;">R$ '+fm(pendT)+'</div>'
    +'</div>';
  }

  // — Gráficos —
  _renderGraficos(inT,outT,pendT,DB);

  // — Painel de métricas do mês —
  var fmet=document.getElementById('finMetricas');
  if(fmet){
    var metH='';
    // linha 1: este mês
    metH+='<div style="background:linear-gradient(135deg,rgba(201,168,76,.1),rgba(201,168,76,.02));border:1px solid rgba(201,168,76,.2);border-radius:14px;padding:13px 15px;margin-bottom:10px;">';
    metH+='<div style="font-size:.5rem;letter-spacing:2px;text-transform:uppercase;color:var(--gold2);font-weight:700;margin-bottom:10px;">📅 Este mês — '+_mesLabel(mesAtual)+'</div>';
    metH+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">';
    metH+='<div style="text-align:center;"><div style="font-size:.48rem;color:rgba(76,218,128,.6);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Receita</div><div style="font-size:.82rem;font-weight:800;color:#4cda80;">R$ '+fm(inMes)+'</div></div>';
    metH+='<div style="text-align:center;"><div style="font-size:.48rem;color:rgba(224,112,112,.6);letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Gastos</div><div style="font-size:.82rem;font-weight:800;color:#e07070;">R$ '+fm(outMes)+'</div></div>';
    metH+='<div style="text-align:center;"><div style="font-size:.48rem;color:'+(balMes>=0?'rgba(76,218,128,.6)':'rgba(224,112,112,.6)')+';letter-spacing:1px;text-transform:uppercase;margin-bottom:3px;">Líquido</div><div style="font-size:.82rem;font-weight:800;color:'+(balMes>=0?'#4cda80':'#e07070')+';">R$ '+fm(Math.abs(balMes))+'</div></div>';
    metH+='</div></div>';
    // linha 2: indicadores gerais
    metH+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-bottom:10px;">';
    metH+='<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px;text-align:center;">';
    metH+='<div style="font-size:1.4rem;font-weight:900;color:var(--gold2);font-family:\'Cormorant Garamond\',serif;">'+totalContratos+'</div>';
    metH+='<div style="font-size:.52rem;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-top:2px;">Contratos fechados</div>';
    metH+='</div>';
    metH+='<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:12px;padding:12px;text-align:center;">';
    metH+='<div style="font-size:1.4rem;font-weight:900;color:var(--gold2);font-family:\'Cormorant Garamond\',serif;">R$ '+fm(ticketMedio)+'</div>';
    metH+='<div style="font-size:.52rem;letter-spacing:1px;text-transform:uppercase;color:var(--t3);margin-top:2px;">Ticket médio</div>';
    metH+='</div>';
    metH+='</div>';
    fmet.innerHTML=metH;
  }

  // — Contratos vinculados (por cliente) —
  var fsrv=document.getElementById('finServicos');
  if(fsrv){
    var qs=DB.q||[];
    var grp={};
    DB.t.forEach(function(t){
      if(!t.qid)return;
      if(!grp[t.qid]){grp[t.qid]={recebido:0,pendente:0};}
      if(t.type==='in')grp[t.qid].recebido+=(t.value||0);
      if(t.type==='pend')grp[t.qid].pendente+=(t.value||0);
    });
    var qids=Object.keys(grp);
    if(!qids.length){
      fsrv.innerHTML='<div style="text-align:center;padding:18px 0 8px;"><div style="font-size:1.8rem;margin-bottom:8px;">📋</div><div style="font-size:.76rem;color:var(--t3);font-weight:600;">Nenhum contrato registrado</div><div style="font-size:.64rem;color:var(--t4);margin-top:4px;">Gere um contrato no Histórico para os valores aparecerem aqui.</div></div>';
    } else {
      // ordenar: em andamento primeiro, depois fechados
      qids.sort(function(a,b){
        var qa=qs.find(function(x){return String(x.id)===String(a);})||{};
        var qb=qs.find(function(x){return String(x.id)===String(b);})||{};
        var sa=qa.status==='fechado'?1:0;
        var sb=qb.status==='fechado'?1:0;
        return sa-sb;
      });
      var sh='';
      qids.forEach(function(qid){
        var q=qs.find(function(x){return String(x.id)===String(qid);})||{};
        var g=grp[qid];
        var total=(q.vista||0)||(g.recebido+g.pendente);
        var pct=total>0?Math.min(100,Math.round((g.recebido/total)*100)):0;
        var fechado=q.status==='fechado';
        var corStatus=fechado?'#4cda80':'#C9A84C';
        var bgStatus=fechado?'rgba(76,218,128,.1)':'rgba(201,168,76,.1)';
        var bdStatus=fechado?'rgba(76,218,128,.25)':'rgba(201,168,76,.25)';
        var lblStatus=fechado?'✔ Fechado':'🔧 Em andamento';
        var descSrv='';
        if(q.desc)descSrv=q.desc;
        else{
          var p=[];
          if(q.tipo)p.push(q.tipo);
          if(q.mat)p.push(q.mat);
          if(q.m2)p.push(fm(q.m2)+' m²');
          if(q.acN&&q.acN.length)p.push(q.acN.slice(0,2).join(', '));
          descSrv=p.join(' · ');
        }
        var dataStr=q.dt?'<span style="font-size:.58rem;color:var(--t4);">'+fd(q.dt)+'</span>':'';
        sh+='<div style="background:linear-gradient(135deg,rgba(28,28,38,1),rgba(18,18,26,1));border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:14px 15px;margin-bottom:10px;box-shadow:0 4px 20px rgba(0,0,0,.5);">';
        // topo
        sh+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">';
        sh+='<div style="display:flex;align-items:center;gap:8px;min-width:0;flex:1;">';
        sh+='<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(145deg,rgba(201,168,76,.3),rgba(201,168,76,.08));border:1px solid rgba(201,168,76,.3);display:flex;align-items:center;justify-content:center;font-size:.8rem;flex-shrink:0;">🏠</div>';
        sh+='<div style="min-width:0;">';
        sh+='<div style="font-size:.82rem;font-weight:800;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+(q.cli||'Cliente')+'</div>';
        sh+=dataStr;
        sh+='</div></div>';
        sh+='<span style="flex-shrink:0;margin-left:8px;font-size:.55rem;font-weight:700;color:'+corStatus+';background:'+bgStatus+';border:1px solid '+bdStatus+';border-radius:10px;padding:3px 9px;white-space:nowrap;">'+lblStatus+'</span>';
        sh+='</div>';
        // descrição
        if(descSrv)sh+='<div style="font-size:.67rem;color:var(--t3);margin-bottom:10px;line-height:1.55;padding-left:2px;">'+escH(descSrv)+'</div>';
        // valores totais
        sh+='<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-bottom:10px;">';
        sh+='<div style="background:rgba(76,218,128,.07);border:1px solid rgba(76,218,128,.15);border-radius:10px;padding:8px 6px;text-align:center;">';
        sh+='<div style="font-size:.44rem;letter-spacing:1px;text-transform:uppercase;color:rgba(76,218,128,.6);margin-bottom:3px;">Recebido</div>';
        sh+='<div style="font-size:.78rem;font-weight:800;color:#4cda80;">R$ '+fm(g.recebido)+'</div>';
        sh+='</div>';
        sh+='<div style="background:rgba(122,176,222,.07);border:1px solid rgba(122,176,222,.15);border-radius:10px;padding:8px 6px;text-align:center;">';
        sh+='<div style="font-size:.44rem;letter-spacing:1px;text-transform:uppercase;color:rgba(122,176,222,.6);margin-bottom:3px;">A Receber</div>';
        sh+='<div style="font-size:.78rem;font-weight:800;color:#7ab0de;">R$ '+fm(g.pendente)+'</div>';
        sh+='</div>';
        sh+='<div style="background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.15);border-radius:10px;padding:8px 6px;text-align:center;">';
        sh+='<div style="font-size:.44rem;letter-spacing:1px;text-transform:uppercase;color:rgba(201,168,76,.6);margin-bottom:3px;">Total</div>';
        sh+='<div style="font-size:.78rem;font-weight:800;color:var(--gold2);">R$ '+fm(total)+'</div>';
        sh+='</div>';
        sh+='</div>';
        // barra de progresso
        sh+='<div style="margin-bottom:5px;">';
        sh+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">';
        sh+='<span style="font-size:.58rem;color:var(--t4);">Progresso do recebimento</span>';
        sh+='<span style="font-size:.62rem;font-weight:700;color:'+(pct===100?'#4cda80':'var(--gold2)')+';">'+pct+'%</span>';
        sh+='</div>';
        sh+='<div style="background:rgba(255,255,255,.07);border-radius:6px;height:5px;overflow:hidden;">';
        sh+='<div style="height:100%;width:'+pct+'%;background:linear-gradient(90deg,#4cda80,#C9A84C);border-radius:6px;transition:width .6s ease;"></div>';
        sh+='</div></div>';
        sh+='</div>';
      });
      fsrv.innerHTML=sh;
    }
  }

  // — Movimentações —
  var items=DB.t.slice(0,60),h='';
  if(items.length){
    items.forEach(function(t){
      var ic=t.type==='in'?'📈':t.type==='out'?'📉':t.type==='note'?'📝':'⏳';
      var sign=t.type==='in'?'+':t.type==='out'?'-':'';
      var valStr=t.value?'R$ '+fm(t.value):'';
      var bg=t.type==='in'?'rgba(58,158,106,.06)':t.type==='out'?'rgba(201,68,68,.06)':t.type==='pend'?'rgba(74,128,181,.06)':'transparent';
      var bord=t.type==='in'?'rgba(76,218,128,.18)':t.type==='out'?'rgba(224,112,112,.18)':t.type==='pend'?'rgba(122,176,222,.18)':'rgba(255,255,255,.05)';
      var xDesc='';
      if(t.qid){
        var qr=(DB.q||[]).find(function(x){return String(x.id)===String(t.qid);});
        if(qr){
          var xp=[];
          if(qr.mat)xp.push(qr.mat);
          if(qr.m2)xp.push(fm(qr.m2)+' m²');
          if(qr.desc)xp=[qr.desc];
          if(xp.length)xDesc='<div style="font-size:.6rem;color:var(--t4);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+escH(xp.join(' · '))+'</div>';
        }
      }
      h+='<div class="trrow" style="background:'+bg+';border:1px solid '+bord+';border-radius:10px;margin-bottom:5px;">'
        +'<div class="trdot '+t.type+'">'+ic+'</div>'
        +'<div style="flex:1;min-width:0;">'
          +'<div class="trnm">'+escH(t.desc)+'</div>'
          +xDesc
          +'<div class="trdt">'+(t.date?fd(t.date):'')+'</div>'
        +'</div>'
        +'<div class="trv '+t.type+'">'+sign+valStr+'</div>'
        +'<button class="tredt" data-edittr="'+t.id+'" title="Editar">✏️</button>'
        +'<button onclick="if(confirm(\'Excluir este lançamento?\')){DB.t=DB.t.filter(function(x){return x.id!='+t.id+';});DB.sv();renderFin();toast(\'✓ Excluído!\');}" style="background:rgba(180,50,50,.15);border:1px solid rgba(224,112,112,.25);border-radius:8px;padding:5px 7px;cursor:pointer;font-size:.7rem;color:#e07070;margin-left:3px;" title="Excluir">🗑</button>'
      +'</div>';
    });
  } else {h='<div style="padding:18px;text-align:center;color:var(--t3);font-size:.8rem;">Nenhuma movimentação</div>';}
  var tl=document.getElementById('trList');
  if(tl)tl.innerHTML=h;
}

function renderFixos(){
  var tot=0,h='';
  CFG.fixos.forEach(function(f){tot+=f.v;h+='<div class="rrow2" style="padding:9px 0;border-bottom:1px solid #0c0c10;display:flex;justify-content:space-between;"><span style="font-size:.79rem;color:var(--t3);">'+f.n+'</span><span style="font-size:.8rem;font-weight:600;">R$ '+fm(f.v)+'</span></div>';});
  h+='<div style="display:flex;justify-content:space-between;align-items:baseline;padding:12px 0 0;margin-top:4px;border-top:1px solid var(--bd2);"><span style="font-size:.88rem;font-weight:700;">Total Mensal</span><span style="font-family:\'Cormorant Garamond\',serif;font-size:1.4rem;color:var(--gold2);font-weight:700;">R$ '+fm(tot)+'</span></div>';
  document.getElementById('fixosCard').innerHTML=h;
}
