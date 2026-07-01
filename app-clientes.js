// ══════════════════════════════════════════════════════════════
// app-clientes.js — v1
// Funções exclusivas: Cuba, Sainhas Auto, Job Detail,
// Banco de Clientes, Consultor de Desconto, UI Premium
// ══════════════════════════════════════════════════════════════

// ── setCubaQtd ──────────────────────────────────────────────
function setCubaQtd(ambId, svKey, qtd){
  qtd=Math.max(1,+qtd||1);
  var amb=ambientes.find(function(a){return a.id==ambId;});
  if(!amb||!amb.selCuba)return;
  amb.selCuba.qtd=qtd;
  renderAmbientes();
}

// ── Cálculo automático de Sainhas ──────────────────────────
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

// ── Modal Detalhe do Serviço + Status ───────────────────────
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
    hdr.innerHTML='<div class="jd-cli">'+(typeof escH==='function'?escH(j.cli||''):j.cli||'')+'</div>'+
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

// ── Banco de Clientes + Consultor de Desconto + UI Premium ──
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
  thr=thr||38; if(!q||q.length<2) return [];
  var r=[];
  CLDB.get().forEach(function(c){ var s=_cliSim(q,c.nome); if(s>=thr) r.push({c:c,s:s}); });
  return r.sort(function(a,b){return b.s-a.s;}).slice(0,5);
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
    var ai; try { ai=JSON.parse(match[0]); } catch(e) { ai=null; }
    if(!ai) return null;
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
function _cliTelNorm(t){ return (t||'').replace(/\D/g,''); }
function _cliAutoSave(nome,tel,cidade,end){
  if(!nome) return;
  // Telefone é uma chave de identidade mais forte que nome — evita duplicar
  // o mesmo cliente quando o nome é digitado com pequenas variações.
  var telN=_cliTelNorm(tel);
  if(telN){
    var porTel=CLDB.get().find(function(c){return _cliTelNorm(c.tel)&&_cliTelNorm(c.tel)===telN;});
    if(porTel){
      var updT={};
      if(cidade&&!porTel.cidade) updT.cidade=cidade;
      if(end&&!porTel.end) updT.end=end;
      if(Object.keys(updT).length) CLDB.upd(porTel.id,updT);
      return;
    }
  }
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
    inp.addEventListener('blur',function(){ setTimeout(_cliACFechar,200); });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init);
  else init();
})();

function _cliACRender(q){
  var dd=document.getElementById('cliACDrop'); if(!dd) return;
  if(!q||q.length<2){dd.style.display='none';return;}
  var res=_cliBuscar(q,35); if(!res.length){dd.style.display='none';return;}
  // Reposiciona ANTES de mostrar — corrige o caso em que o teclado virtual
  // ou um scroll deslocou o campo desde a última vez que a posição foi calculada,
  // que causava clique acertando um cliente diferente do que aparecia na tela.
  if(typeof window._posicionarACDrop==='function')window._posicionarACDrop();
  var h='';
  res.forEach(function(r){
    var c=r.c, hist=_cliHist(c.nome);
    h+='<div class="cliaci" tabindex="0" onmousedown="event.preventDefault();cliACSelecionar('+c.id+')" onkeydown="if(event.key===\'Enter\')cliACSelecionar('+c.id+')" '
      +'style="padding:10px 13px;cursor:pointer;border-bottom:1px solid var(--bd);display:flex;align-items:center;gap:10px;">';
    h+='<div style="width:34px;height:34px;border-radius:50%;background:var(--s3);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:.92rem;font-weight:700;color:'+hist.cor+';">'+(c.nome?c.nome[0].toUpperCase():'?')+'</div>';
    h+='<div style="flex:1;min-width:0;">';
    h+='<div style="font-size:.82rem;font-weight:700;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">'+c.nome+'</div>';
    var sub=[]; if(c.tel) sub.push('📱 '+c.tel); if(c.cidade) sub.push('📍 '+c.cidade);
    if(sub.length) h+='<div style="font-size:.65rem;color:var(--t3);">'+sub.join(' · ')+'</div>';
    h+='<div style="font-size:.6rem;color:'+hist.cor+';">'+hist.icon+' '+hist.cat+(hist.orcs?' · '+hist.orcs+' orç.':'')+(hist.jobs?' · '+hist.jobs+' serv.':'')+'</div>';
    h+='</div></div>';
  });
  h+='<div onmousedown="event.preventDefault();cliAbrirNovo()" style="padding:9px 13px;cursor:pointer;font-size:.72rem;color:var(--gold2);display:flex;align-items:center;gap:7px;"><span>➕</span><span>Adicionar "'+q+'" como novo cliente</span></div>';
  dd.innerHTML=h; dd.style.display='block';
}
function cliACSelecionar(id){
  var c=CLDB.get().find(function(x){return x.id===id;}); if(!c) return;
  var map={oCliente:c.nome,oTel:c.tel||'',oCidade:c.cidade||'',oEnd:c.end||''};
  Object.keys(map).forEach(function(k){var el=document.getElementById(k);if(el)el.value=map[k];});
  _cliACFechar();
  var hist=_cliHist(c.nome);
  toast(hist.icon+' '+c.nome+' — '+hist.cat);
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
  setInterval(_orcUpdateHeader, 1500);
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
      if(!ambientes||!ambientes.length) { if(cb) cb(null); return; }
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
                     (ambientes&&ambientes[0]&&ambientes[0].pecas?ambientes[0].pecas.some(function(p){ return p.w > 0 && p.h > 0; }):false));

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
    var last = (DB.q&&DB.q.length) ? DB.q[DB.q.length - 1] : null;
    if (last) vista = last.vista || 0;
  }

  // Fallback confiável: ler o valor já calculado no painel interno (#piVista),
  // que é preenchido pela mesma função calcular() que gera o resDetail.
  if (!vista) {
    var piVistaEl = document.getElementById('piVista');
    if (piVistaEl) {
      var txtPi = piVistaEl.textContent || '';
      var mPi = txtPi.match(/R\$\s*([\d.,]+)/);
      if (mPi) vista = parseFloat(mPi[1].replace(/\./g, '').replace(',', '.'));
    }
  }

  // Último fallback: procurar no texto do resDetail (menos confiável — pode
  // capturar o primeiro valor de peça/serviço em vez do total; usar só se
  // as opções acima não estiverem disponíveis)
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
