// ══════════════════════════════════════════════════════════════
// CONTRATOS — ÁREA DEDICADA v2
// Integração com Agenda + Edição + Separação de status
// ══════════════════════════════════════════════════════════════

(function(){
  var css = `
.ctr-hero{padding:20px 17px 14px;background:linear-gradient(160deg,#080d08,#0d150d,#070709);border-bottom:1px solid rgba(58,158,106,.15);}
.ctr-hero .htitle{color:#4db87a;}
.ctr-hero .hsub2{color:rgba(77,184,122,.45);}
.ctr-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:14px 14px 4px;}
.ctr-stat{background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:12px 8px 10px;text-align:center;}
.ctr-stat-icon{font-size:1.1rem;margin-bottom:4px;}
.ctr-stat-val{font-size:1rem;font-weight:700;color:var(--tx);line-height:1.1;}
.ctr-stat-lbl{font-size:.52rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-top:3px;}
.ctr-tabs{display:flex;gap:6px;padding:10px 14px 4px;overflow-x:auto;-webkit-overflow-scrolling:touch;}
.ctr-tabs::-webkit-scrollbar{display:none;}
.ctr-tab{background:var(--s2);border:1px solid var(--bd2);border-radius:20px;padding:6px 13px;font-size:.68rem;font-weight:600;color:var(--t2);white-space:nowrap;cursor:pointer;display:flex;align-items:center;gap:5px;flex-shrink:0;transition:all .15s;}
.ctr-tab.on{background:#0a1f12;border-color:#1a4030;color:#4db87a;}
.ctr-tab-cnt{background:var(--s4);border-radius:10px;padding:1px 7px;font-size:.6rem;}
.ctr-tab.on .ctr-tab-cnt{background:rgba(58,158,106,.2);color:#4db87a;}
.ctr-search-wrap{display:flex;align-items:center;gap:8px;margin:8px 14px 4px;background:var(--s2);border:1px solid var(--bd2);border-radius:11px;padding:9px 12px;}
.ctr-section-hdr{display:flex;align-items:center;gap:8px;padding:10px 14px 6px;margin-top:4px;}
.ctr-section-hdr-line{flex:1;height:1px;background:var(--bd);}
.ctr-section-hdr-lbl{font-size:.57rem;letter-spacing:2px;text-transform:uppercase;font-weight:700;white-space:nowrap;}
.ctr-list{padding:2px 14px 8px;}
.ctr-card{background:var(--s2);border:1px solid var(--bd);border-radius:13px;padding:13px 13px 11px;margin-bottom:8px;display:flex;gap:10px;align-items:flex-start;cursor:pointer;transition:border-color .15s,background .15s;}
.ctr-card:active{background:var(--s3);}
.ctr-card.from-agenda{border-left:3px solid rgba(201,168,76,.4);}
.ctr-card-left{flex:1;min-width:0;}
.ctr-card-cli{font-size:.88rem;font-weight:700;color:var(--tx);margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ctr-card-meta{font-size:.68rem;color:var(--t3);margin-bottom:3px;}
.ctr-card-dtg{font-size:.6rem;color:var(--t4);margin-top:2px;}
.ctr-card-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.ctr-card-val{font-size:.82rem;font-weight:700;color:var(--gold2);}
.ctr-card-actions{display:flex;gap:5px;align-items:center;flex-wrap:wrap;justify-content:flex-end;}
.ctr-badge{font-size:.56rem;font-weight:700;letter-spacing:.8px;text-transform:uppercase;padding:3px 9px;border-radius:8px;white-space:nowrap;}
.ctr-badge-pendente{background:#1a120a;color:#c9a84c;border:1px solid rgba(201,168,76,.25);}
.ctr-badge-agenda{background:#1a1200;color:#e8b84c;border:1px solid rgba(232,184,76,.3);}
.ctr-badge-gerado{background:#0a1520;color:#60a0e0;border:1px solid rgba(96,160,224,.25);}
.ctr-badge-assinado{background:#0a1f12;color:#4db87a;border:1px solid rgba(77,184,122,.25);}
.ctr-btn-sm{border:none;border-radius:8px;padding:6px 10px;font-size:.63rem;font-weight:600;cursor:pointer;font-family:Outfit,sans-serif;transition:opacity .15s;white-space:nowrap;}
.ctr-btn-sm:active{opacity:.75;}
.ctr-btn-pri{background:linear-gradient(135deg,#0a1520,#0d2035);color:#60a0e0;border:1px solid #1a4070;}
.ctr-btn-gold{background:#1e1000;color:var(--gold2);border:1px solid rgba(201,168,76,.3);}
.ctr-btn-sec{background:var(--s3);color:var(--t3);border:1px solid var(--bd2);}
.ctr-btn-grn{background:#0a1f12;color:#4db87a;border:1px solid rgba(77,184,122,.3);}
.ctr-btn-edit{background:#0d1a0d;color:#6dbf8a;border:1px solid rgba(77,184,122,.2);}
.ctr-empty{text-align:center;padding:48px 20px;color:var(--t3);}
.ctr-edit-overlay{position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9000;display:flex;align-items:flex-end;justify-content:center;}
.ctr-edit-sheet{background:var(--s1);border-radius:20px 20px 0 0;width:100%;max-width:520px;max-height:88vh;overflow-y:auto;padding:0 0 env(safe-area-inset-bottom,16px);}
.ctr-edit-hdr{padding:16px 18px 12px;border-bottom:1px solid var(--bd);position:sticky;top:0;background:var(--s1);z-index:1;}
.ctr-edit-title{font-size:1rem;font-weight:700;color:var(--tx);}
.ctr-edit-sub{font-size:.68rem;color:var(--t3);margin-top:2px;}
.ctr-edit-body{padding:16px 18px;}
.ctr-edit-field{margin-bottom:14px;}
.ctr-edit-label{font-size:.57rem;letter-spacing:1.5px;text-transform:uppercase;color:var(--t3);margin-bottom:5px;}
.ctr-edit-input{width:100%;background:var(--s2);border:1px solid var(--bd2);border-radius:9px;padding:10px 12px;color:var(--tx);font-family:Outfit,sans-serif;font-size:.85rem;outline:none;box-sizing:border-box;}
.ctr-edit-input:focus{border-color:#4db87a;}
.ctr-edit-textarea{resize:vertical;min-height:80px;}
.contr-cli-strip{background:rgba(96,160,224,.07);border:1px solid rgba(96,160,224,.15);border-radius:9px;padding:10px 13px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;}
.contr-cli-nm{font-size:.85rem;font-weight:700;color:#c8e6ff;}
.contr-cli-val{font-size:.75rem;color:#60a0e0;font-weight:600;}
.contr-cli-tipo{font-size:.65rem;color:rgba(96,160,224,.5);margin-top:1px;}
`;
  var s = document.createElement('style');
  s.id = 'ctr-styles';
  s.textContent = css;
  document.head.appendChild(s);
})();

// ── DB contratos ──
function _cDB(){if(!DB.c){try{DB.c=JSON.parse(localStorage.getItem('hr_c')||'[]');}catch(e){DB.c=[];}}return DB.c;}
function _cSv(){_cDB();localStorage.setItem('hr_c',JSON.stringify(DB.c));}
function _cGet(qid){return _cDB().find(function(c){return String(c.qid)===String(qid);});}
function _cStatus(qid){var c=_cGet(qid);return c?(c.status||'gerado'):'pendente';}
function _esc(s){return(s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function _fm(v){return(typeof fm==='function')?fm(v):(parseFloat(v||0)).toFixed(2);}

var _ctrSearch='', _ctrFilter='all';

// ── Unifica orcamentos + agenda ──
function _ctrAllEntries(){
  var entries=[];
  (DB.q||[]).forEach(function(q){
    if(!q.cli)return;
    entries.push({id:q.id,cli:q.cli,tipo:q.tipo||'Projeto',mat:q.mat||'',vista:q.vista||0,source:'orcamento',q:q});
  });
  (DB.j||[]).forEach(function(j){
    if(!j.cli)return;
    var jaTemOrc=(DB.q||[]).some(function(q){return q.cli&&q.cli.toLowerCase()===j.cli.toLowerCase();});
    var jaAdicionado=entries.some(function(e){return e.source==='agenda'&&String(e.id)===String(j.id);});
    if(!jaTemOrc&&!jaAdicionado){
      entries.push({id:j.id,cli:j.cli,tipo:j.desc||'Serviço',mat:'',vista:j.value||0,source:'agenda',agJob:j});
    }
  });
  return entries;
}

// ── Render ──
function renderContratos(){
  var wrap=document.getElementById('ctrWrap');
  if(!wrap)return;
  _cDB();
  var all=_ctrAllEntries();
  var cG=0,cA=0,cP=0,cAg=0;
  all.forEach(function(e){
    var st=_cStatus(e.id);
    if(st==='assinado')cA++;
    else if(st==='gerado')cG++;
    else if(e.source==='agenda')cAg++;
    else cP++;
  });
  var valContr=DB.c.reduce(function(s,c){var e=all.find(function(x){return String(x.id)===String(c.qid);});return s+(e?e.vista:0);},0);

  var filtered=all.slice();
  if(_ctrFilter==='pendente') filtered=filtered.filter(function(e){return _cStatus(e.id)==='pendente'&&e.source!=='agenda';});
  if(_ctrFilter==='agenda')   filtered=filtered.filter(function(e){return e.source==='agenda'&&_cStatus(e.id)==='pendente';});
  if(_ctrFilter==='gerado')   filtered=filtered.filter(function(e){return _cStatus(e.id)==='gerado';});
  if(_ctrFilter==='assinado') filtered=filtered.filter(function(e){return _cStatus(e.id)==='assinado';});
  if(_ctrSearch){var s=_ctrSearch.toLowerCase();filtered=filtered.filter(function(e){return(e.cli||'').toLowerCase().indexOf(s)>=0||(e.tipo||'').toLowerCase().indexOf(s)>=0;});}
  filtered.sort(function(a,b){return(b.id||0)-(a.id||0);});

  function fmShort(v){var n=parseFloat(v||0);if(n>=1000)return(n/1000).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'k';return n.toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0});}
  function statCard(ic,v,l){return'<div class="ctr-stat"><div class="ctr-stat-icon">'+ic+'</div><div class="ctr-stat-val">'+v+'</div><div class="ctr-stat-lbl">'+l+'</div></div>';}
  function tabEl(id,lbl,cnt){var on=_ctrFilter===id?' on':'';return'<div class="ctr-tab'+on+'" onclick="ctrSetFilter(\''+id+'\')">'+lbl+(cnt>0?' <span class="ctr-tab-cnt">'+cnt+'</span>':'')+' </div>';}

  var stats='<div class="ctr-stats">'+statCard('📋',all.length,'Total')+statCard('📜',cG,'Gerados')+statCard('✍️',cA,'Assinados')+statCard('💰','R$\u00a0'+fmShort(valContr),'Em contratos')+'</div>';
  var tabs='<div class="ctr-tabs">'+tabEl('all','Todos',all.length)+tabEl('agenda','📅 Agenda',cAg)+tabEl('pendente','Pendentes',cP)+tabEl('gerado','Gerados',cG)+tabEl('assinado','Assinados',cA)+'</div>';
  var search='<div class="ctr-search-wrap"><span style="font-size:.95rem;color:var(--t4);">🔍</span><input id="ctrSearchInp" type="text" placeholder="Buscar cliente ou tipo..." value="'+_esc(_ctrSearch)+'" oninput="ctrSearchChange(this.value)" style="flex:1;background:none;border:none;outline:none;color:var(--tx);font-family:Outfit,sans-serif;font-size:.82rem;">'+(_ctrSearch?'<button onclick="ctrSearchChange(\'\')" style="background:none;border:none;color:var(--t3);font-size:.75rem;cursor:pointer;padding:0 2px;">✕</button>':'')+'</div>';

  var listHtml='';
  if(!filtered.length){
    listHtml='<div class="ctr-empty"><div style="font-size:2.2rem;margin-bottom:10px;">📜</div><div style="font-size:.82rem;font-weight:600;color:var(--t2);margin-bottom:4px;">'+(_ctrSearch||_ctrFilter!=='all'?'Nenhum resultado':'Nenhum cliente ainda')+'</div><div style="font-size:.72rem;color:var(--t4);">'+(_ctrSearch||_ctrFilter!=='all'?'Tente outro filtro':'Adicione clientes na Agenda ou crie Orçamentos')+'</div></div>';
  } else if(_ctrFilter==='all'&&!_ctrSearch){
    var grupos=[
      {key:'agenda',  color:'#c9a84c', label:'📅 Da Agenda — prontos para gerar',       items:[]},
      {key:'pendente',color:'#c9a84c', label:'🕐 Pendentes — orçamentos sem contrato',   items:[]},
      {key:'gerado',  color:'#60a0e0', label:'📄 Gerados — aguardando assinatura',        items:[]},
      {key:'assinado',color:'#4db87a', label:'✅ Assinados — contratos fechados',         items:[]}
    ];
    filtered.forEach(function(e){
      var st=_cStatus(e.id);
      if(st==='assinado')grupos[3].items.push(e);
      else if(st==='gerado')grupos[2].items.push(e);
      else if(e.source==='agenda')grupos[0].items.push(e);
      else grupos[1].items.push(e);
    });
    grupos.forEach(function(g){
      if(!g.items.length)return;
      listHtml+='<div style="margin-top:4px;"><div class="ctr-section-hdr"><div class="ctr-section-hdr-line"></div><span class="ctr-section-hdr-lbl" style="color:'+g.color+';">'+g.label+'</span><div class="ctr-section-hdr-line"></div></div>';
      g.items.forEach(function(e){listHtml+=_ctrCardHtml(e);});
      listHtml+='</div>';
    });
  } else {
    filtered.forEach(function(e){listHtml+=_ctrCardHtml(e);});
  }

  wrap.innerHTML=stats+tabs+search+'<div class="ctr-list" id="ctrList">'+listHtml+'</div>';
}

function _ctrCardHtml(entry){
  var status=_cStatus(entry.id);
  var c=_cGet(entry.id);
  var dt='';try{dt=new Date(entry.id).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'2-digit'});}catch(e){}
  var stLabel={pendente:'Pendente',gerado:'Gerado',assinado:'Assinado'}[status]||status;
  if(entry.source==='agenda'&&status==='pendente')stLabel='Agenda';
  var isAg=entry.source==='agenda';
  var badgeCls=(isAg&&status==='pendente')?'ctr-badge-agenda':'ctr-badge-'+status;
  var actions='';
  if(entry.source==='orcamento'){
    actions+='<button class="ctr-btn-sm ctr-btn-pri" onclick="event.stopPropagation();ctrAbrirConfig('+entry.id+')">'+(status==='pendente'?'📜 Gerar':'🔄 Regerar')+'</button>';
  } else {
    actions+='<button class="ctr-btn-sm ctr-btn-gold" onclick="event.stopPropagation();ctrGerarAgenda('+entry.id+')">📜 Gerar</button>';
  }
  if(status==='gerado'||status==='assinado'){
    actions+='<button class="ctr-btn-sm ctr-btn-edit" onclick="event.stopPropagation();ctrEditarContrato(\''+entry.id+'\')" title="Editar">✏️</button>';
  }
  if(status==='gerado'){
    actions+='<button class="ctr-btn-sm ctr-btn-grn" onclick="event.stopPropagation();ctrMarcarStatus('+entry.id+',\'assinado\')" title="Marcar assinado">✍️</button>';
  }
  if(status!=='pendente'){
    actions+='<button class="ctr-btn-sm ctr-btn-sec" onclick="event.stopPropagation();ctrMarcarStatus('+entry.id+',\'pendente\')" title="Resetar">↩</button>';
  }
  var agTag=isAg?'<span style="font-size:.55rem;color:#c9a84c;margin-right:3px;">📅</span>':'';
  var obsLine=(c&&c.obs)?'<div class="ctr-card-dtg" style="color:var(--t2);margin-top:3px;">📝 '+_esc(c.obs)+'</div>':'';
  var dtgLine=(c&&c.dtGerado)?'<div class="ctr-card-dtg">📄 Gerado em '+c.dtGerado+(c.obsEdit?' · ✏️':'')+'</div>':'';
  return '<div class="ctr-card'+(isAg?' from-agenda':'')+'" onclick="'+(entry.source==='orcamento'?'ctrAbrirConfig('+entry.id+')':'ctrGerarAgenda('+entry.id+')')+'">'+
    '<div class="ctr-card-left">'+
      '<div class="ctr-card-cli">'+agTag+_esc(entry.cli||'Cliente')+'</div>'+
      '<div class="ctr-card-meta"><span>'+_esc(entry.tipo||'Projeto')+'</span>'+(entry.mat?'<span style="margin-left:4px;">'+_esc(entry.mat)+'</span>':'')+(dt?'<span style="margin-left:4px;">'+dt+'</span>':'')+'</div>'+
      dtgLine+obsLine+
    '</div>'+
    '<div class="ctr-card-right">'+
      '<div class="ctr-card-val">R$ '+_fm(entry.vista||0)+'</div>'+
      '<div class="ctr-badge '+badgeCls+'">'+stLabel+'</div>'+
      '<div class="ctr-card-actions">'+actions+'</div>'+
    '</div>'+
  '</div>';
}

function ctrSearchChange(v){_ctrSearch=v;renderContratos();var inp=document.getElementById('ctrSearchInp');if(inp){inp.focus();var l=inp.value.length;inp.setSelectionRange(l,l);}}
function ctrSetFilter(f){_ctrFilter=f;_ctrSearch='';renderContratos();}

function ctrMarcarStatus(qid,status){
  _cDB();var c=_cGet(qid);
  if(!c){if(status==='pendente')return;c={qid:String(qid),status:status,dtGerado:new Date().toLocaleDateString('pt-BR')};DB.c.push(c);}
  else{if(status==='pendente'){DB.c=DB.c.filter(function(x){return String(x.qid)!==String(qid);});}else{c.status=status;}}
  _cSv();renderContratos();
  var msgs={assinado:'✍️ Marcado como assinado!',pendente:'↩ Resetado para pendente',gerado:'📜 Marcado como gerado'};
  if(typeof toast==='function')toast(msgs[status]||'✓ Status atualizado');
}

function ctrAbrirConfig(id){
  var q=(DB.q||[]).find(function(x){return x.id==id;});
  if(!q){if(typeof toast==='function')toast('Orçamento não encontrado');return;}
  var cliEl=document.getElementById('contrCliNm'),valEl=document.getElementById('contrCliVal'),tipoEl=document.getElementById('contrCliTipo');
  if(cliEl)cliEl.textContent=q.cli||'Cliente';
  if(valEl)valEl.textContent='R$ '+_fm(q.vista||0);
  if(tipoEl)tipoEl.textContent=(q.tipo||'')+(q.mat?' · '+q.mat:'');
  if(typeof gerarContrato==='function'){gerarContrato(id);}else{if(typeof toast==='function')toast('Erro: módulo de contrato não carregado');}
  window._ctrQidAtivo=id;
}

function ctrGerarAgenda(jid){
  var j=(DB.j||[]).find(function(x){return x.id==jid;});
  if(!j){if(typeof toast==='function')toast('Serviço não encontrado');return;}
  var existeNaQ=(DB.q||[]).some(function(q){return q.id==jid;});
  if(!existeNaQ){
    if(!DB.q)DB.q=[];
    DB.q.push({id:j.id,cli:j.cli,tipo:j.desc||'Serviço',mat:'',vista:j.value||0,ent:(j.value||0)*0.5,obs:j.obs||'',pds:[],sfPcs:[],acN:[],cidade:(typeof CFG!=='undefined'&&CFG.emp&&CFG.emp.cidade)?CFG.emp.cidade:''});
    window._ctrTempQid=jid;
  }
  var cliEl=document.getElementById('contrCliNm'),valEl=document.getElementById('contrCliVal'),tipoEl=document.getElementById('contrCliTipo');
  if(cliEl)cliEl.textContent=j.cli||'Cliente';
  if(valEl)valEl.textContent='R$ '+_fm(j.value||0);
  if(tipoEl)tipoEl.textContent=j.desc||'Serviço da Agenda';
  if(typeof gerarContrato==='function'){gerarContrato(jid);}else{if(typeof toast==='function')toast('Erro: módulo de contrato não carregado');}
  window._ctrQidAtivo=jid;
}

// ── Edição ──
var _ctrEditId=null;

function ctrEditarContrato(qid){
  _ctrEditId=String(qid);
  _cDB();
  var c=_cGet(qid);
  var all=_ctrAllEntries();
  var entry=all.find(function(e){return String(e.id)===String(qid);});
  var nome=entry?entry.cli:'Cliente';
  var old=document.getElementById('ctrEditOv');if(old)old.remove();
  var obs=c&&c.obs?c.obs:'', dtI=c&&c.dtInicio?c.dtInicio:'', dtE=c&&c.dtEntrega?c.dtEntrega:'', pg=c&&c.pgTipo?c.pgTipo:'', notas=c&&c.notas?c.notas:'';
  var ov=document.createElement('div');
  ov.id='ctrEditOv';ov.className='ctr-edit-overlay';
  ov.onclick=function(ev){if(ev.target===ov)ctrFecharEdicao();};
  ov.innerHTML='<div class="ctr-edit-sheet">'+
    '<div class="ctr-edit-hdr"><div style="display:flex;justify-content:space-between;align-items:center;">'+
      '<div><div class="ctr-edit-title">✏️ Editar Contrato</div><div class="ctr-edit-sub">'+_esc(nome)+'</div></div>'+
      '<button onclick="ctrFecharEdicao()" style="background:none;border:none;color:var(--t3);font-size:1.4rem;cursor:pointer;line-height:1;">×</button>'+
    '</div></div>'+
    '<div class="ctr-edit-body">'+
      '<div class="ctr-edit-field"><div class="ctr-edit-label">Observações do Contrato</div><textarea id="ctrEditObs" class="ctr-edit-input ctr-edit-textarea" placeholder="Ex: Instalação inclusa, retirada do antigo...">'+_esc(obs)+'</textarea></div>'+
      '<div class="ctr-edit-field"><div class="ctr-edit-label">Data de Início</div><input type="date" id="ctrEditInicio" class="ctr-edit-input" value="'+_esc(dtI)+'"></div>'+
      '<div class="ctr-edit-field"><div class="ctr-edit-label">Data de Entrega Prevista</div><input type="date" id="ctrEditEntrega" class="ctr-edit-input" value="'+_esc(dtE)+'"></div>'+
      '<div class="ctr-edit-field"><div class="ctr-edit-label">Forma de Pagamento (resumo)</div><input type="text" id="ctrEditPg" class="ctr-edit-input" placeholder="Ex: 50% entrada + 50% entrega" value="'+_esc(pg)+'"></div>'+
      '<div class="ctr-edit-field"><div class="ctr-edit-label">Notas internas (não aparece no contrato)</div><textarea id="ctrEditNotas" class="ctr-edit-input ctr-edit-textarea" style="min-height:60px;" placeholder="Anotações só para você...">'+_esc(notas)+'</textarea></div>'+
      '<div style="display:flex;gap:8px;margin-top:4px;">'+
        '<button onclick="ctrFecharEdicao()" style="flex:1;background:var(--s3);border:1px solid var(--bd2);border-radius:10px;padding:13px;color:var(--t2);font-family:Outfit,sans-serif;font-size:.82rem;cursor:pointer;">Cancelar</button>'+
        '<button onclick="ctrSalvarEdicao()" style="flex:2;background:linear-gradient(135deg,#0a1f12,#0d2818);border:1px solid #1a4030;border-radius:10px;padding:13px;color:#4db87a;font-family:Outfit,sans-serif;font-size:.82rem;font-weight:700;cursor:pointer;">✓ Salvar</button>'+
      '</div>'+
      '<div style="height:env(safe-area-inset-bottom,12px);"></div>'+
    '</div>'+
  '</div>';
  document.body.appendChild(ov);
  setTimeout(function(){var el=document.getElementById('ctrEditObs');if(el)el.focus();},200);
}

function ctrFecharEdicao(){var ov=document.getElementById('ctrEditOv');if(ov)ov.remove();_ctrEditId=null;}

function ctrSalvarEdicao(){
  if(!_ctrEditId)return;
  _cDB();
  var obs=(document.getElementById('ctrEditObs')||{}).value||'';obs=obs.trim();
  var inicio=(document.getElementById('ctrEditInicio')||{}).value||'';
  var entrega=(document.getElementById('ctrEditEntrega')||{}).value||'';
  var pg=((document.getElementById('ctrEditPg')||{}).value||'').trim();
  var notas=((document.getElementById('ctrEditNotas')||{}).value||'').trim();
  var c=_cGet(_ctrEditId);
  if(!c){c={qid:_ctrEditId,status:'gerado',dtGerado:new Date().toLocaleDateString('pt-BR')};DB.c.push(c);}
  c.obs=obs;c.dtInicio=inicio;c.dtEntrega=entrega;c.pgTipo=pg;c.notas=notas;c.obsEdit=true;c.dtEditado=new Date().toLocaleDateString('pt-BR');
  _cSv();ctrFecharEdicao();renderContratos();
  if(typeof toast==='function')toast('✓ Contrato atualizado!');
}

// ── Hook confirmarContrato ──
(function(){
  var t=0,iv=setInterval(function(){
    t++;
    if(typeof confirmarContrato==='function'&&!confirmarContrato._ctrPatched){
      var orig=confirmarContrato;
      confirmarContrato=function(){
        orig.apply(this,arguments);
        var qid=window._ctrQidAtivo||window._contrId;
        if(qid){
          _cDB();var ex=_cGet(qid);
          if(!ex){DB.c.push({qid:String(qid),status:'gerado',dtGerado:new Date().toLocaleDateString('pt-BR')});}
          else{ex.status='gerado';ex.dtGerado=new Date().toLocaleDateString('pt-BR');}
          _cSv();
          if(window._ctrTempQid){DB.q=(DB.q||[]).filter(function(q){return q.id!=window._ctrTempQid;});window._ctrTempQid=null;}
          setTimeout(function(){var pg=document.getElementById('pg10');if(pg&&pg.classList.contains('on'))renderContratos();},400);
        }
      };
      confirmarContrato._ctrPatched=true;
      clearInterval(iv);
    }
    if(t>60)clearInterval(iv);
  },150);
})();

// ── Auto-init: renderiza quando pg10 fica visível ──
(function(){
  // Tenta renderizar imediatamente se pg10 já está ativo
  function tryRender(){
    var pg=document.getElementById('pg10');
    if(pg&&pg.classList.contains('on')){renderContratos();return;}
  }
  // MutationObserver como fallback robusto
  var obs=new MutationObserver(function(muts){
    muts.forEach(function(m){
      if(m.target&&m.target.id==='pg10'&&m.target.classList.contains('on')){
        renderContratos();
      }
    });
  });
  function startObs(){
    var pg=document.getElementById('pg10');
    if(pg){
      obs.observe(pg,{attributes:true,attributeFilter:['class']});
      tryRender();
    } else {
      setTimeout(startObs,300);
    }
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',startObs);
  } else {
    startObs();
  }
})();
