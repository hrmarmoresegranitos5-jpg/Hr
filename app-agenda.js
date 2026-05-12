function openJobModal(id){
  editJobId=id;
  document.getElementById('jobMdTitle').textContent=id?'Editar Serviço':'Novo Serviço';
  if(id){
    var j=DB.j.find(function(x){return x.id===id;});
    if(!j)return;
    document.getElementById('jCli').value=j.cli||'';
    document.getElementById('jDesc').value=j.desc||'';
    document.getElementById('jStart').value=j.start||td();
    document.getElementById('jDias').value='';
    document.getElementById('jVal').value=j.value||'';
    document.getElementById('jPago').value=j.pago||'';
    document.getElementById('jObs').value=j.obs||'';
  } else {
    ['jCli','jDesc','jVal','jPago','jObs'].forEach(function(i){document.getElementById(i).value='';});
    document.getElementById('jStart').value=td();
    document.getElementById('jDias').value='';
  }
  document.getElementById('jobDp').classList.remove('on');
  showMd('jobMd');
}
function prevJobDias(){var d=+document.getElementById('jDias').value,s=document.getElementById('jStart').value,p=document.getElementById('jobDp');if(!d||!s){p.classList.remove('on');return;}p.textContent='Entrega: '+fd(addD(s,d));p.classList.add('on');}
function saveJob(){
  var cli=document.getElementById('jCli').value.trim(),desc=document.getElementById('jDesc').value.trim();
  if(!cli||!desc){toast('Preencha cliente e descrição');return;}
  var s=document.getElementById('jStart').value,d=+document.getElementById('jDias').value||0;
  var end=d?addD(s,d):'',val=+document.getElementById('jVal').value||0,pago=+document.getElementById('jPago').value||0,obs=document.getElementById('jObs').value;
  if(editJobId){
    var j=DB.j.find(function(x){return x.id===editJobId;});
    if(j){j.cli=cli;j.desc=desc;j.start=s;j.end=end;j.value=val;j.pago=pago;j.obs=obs;DB.sv();}
  } else {
    DB.j.unshift({id:Date.now(),cli:cli,desc:desc,start:s,end:end,value:val,pago:pago,obs:obs,done:false});DB.sv();
    if(pago>0)setTimeout(function(){showCB('Registrar entrada de R$ '+fm(pago)+' do '+cli+'?',function(){addTr('in','Entrada — '+cli,pago);hideCB();},function(){hideCB();});},400);
  }
  renderAg();updUrgDot();closeAll();toast('✓ Salvo!');
}

function editJob(id){openJobModal(id);}
function togJob(id){var j=DB.j.find(function(x){return x.id===id;});if(!j)return;j.done=!j.done;DB.sv();renderAg();updUrgDot();if(j.done){toast('✓ Concluído!');var r=j.value-(j.pago||0);if(r>0)setTimeout(function(){showCB(j.cli+' concluído! Recebeu R$ '+fm(r)+' da entrega?',function(){addTr('in','Entrega — '+j.cli,r);j.pago=j.value;DB.sv();renderAg();hideCB();toast('✓ Registrado!');},function(){hideCB();});},400);}}
function pagRest(id){var j=DB.j.find(function(x){return x.id===id;});if(!j)return;var r=j.value-(j.pago||0);showCB('Registrar R$ '+fm(r)+' do '+j.cli+'?',function(){addTr('in','Pagamento — '+j.cli,r);j.pago=j.value;DB.sv();renderAg();hideCB();toast('✓ Registrado!');},function(){hideCB();});}
function delJob(id){if(!confirm('Remover serviço?'))return;DB.j=DB.j.filter(function(j){return j.id!==id;});DB.sv();renderAg();updUrgDot();}
function updUrgDot(){var u=DB.j.filter(function(j){return !j.done&&j.end&&dDiff(j.end)>=0&&dDiff(j.end)<=3;}).length;document.getElementById('urgDot').classList.toggle('on',u>0);}

function renderAg(){
  var ov=DB.j.filter(function(j){return !j.done&&j.end&&dDiff(j.end)<0;});
  var ur=DB.j.filter(function(j){return !j.done&&j.end&&dDiff(j.end)>=0&&dDiff(j.end)<=3;});
  var pe=DB.j.filter(function(j){return !j.done&&(!j.end||dDiff(j.end)>3);});
  var dn=DB.j.filter(function(j){return j.done;}).slice(0,5);
  var h='';
  function sec(lbl,col,items){if(!items.length)return;h+='<div style="font-size:.57rem;letter-spacing:2px;text-transform:uppercase;color:'+col+';font-weight:600;margin:14px 0 8px;">'+lbl+'</div>';items.forEach(function(j){h+=jCard(j);});}
  sec('Atrasados','var(--red)',ov);sec('Próximos 3 dias','var(--gold)',ur);sec('Em andamento ('+pe.length+')','var(--t3)',pe);sec('Concluídos','var(--t3)',dn);
  if(!DB.j.length)h='<div style="text-align:center;padding:40px 20px;color:var(--t3);font-size:.82rem;"><div style="font-size:2.2rem;margin-bottom:9px;">📅</div>Nenhum serviço ainda.</div>';
  document.getElementById('agList').innerHTML=h;
}
function jCard(j){
  var rest=j.value-(j.pago||0),d=j.end?dDiff(j.end):null,st=j.done?'done':(d!==null&&d<=3?'urg':'pend');
  var dTxt='';if(d!==null){if(d<0)dTxt='<span class="red">'+Math.abs(d)+'d atrasado</span>';else if(d===0)dTxt='<span class="red">Hoje!</span>';else dTxt='<span>'+d+'d restantes</span>';}
  var meta=(j.start?'<span>Início: '+fd(j.start)+'</span> ':'')+(j.end?'<span>Entrega: '+fd(j.end)+'</span> ':'')+dTxt;
  var valMeta=j.value?'<div class="jmeta"><span class="gold">Total: R$ '+fm(j.value)+'</span><span class="grn">Pago: R$ '+fm(j.pago||0)+'</span>'+(rest>0?'<span class="red">A receber: R$ '+fm(rest)+'</span>':'')+'</div>':'';
  var btnPag=(!j.done&&rest>0)?'<button class="btn btn-sm" style="background:var(--gdim);color:var(--gold2);border:1px solid var(--gold3);" data-pagrest="'+j.id+'">Receber</button>':'';
  return '<div class="jcard '+st+'"><div class="jnm">'+j.cli+'</div><div class="jdesc">'+j.desc+'</div><div class="jmeta">'+meta+'</div>'+valMeta+'<div class="jbtns"><button class="btn btn-sm '+(j.done?'btn-o':'btn-grn')+'" data-togjob="'+j.id+'">'+(j.done?'↩ Reabrir':'✓ Concluir')+'</button>'+btnPag+'<button class="btn btn-sm btn-o" data-editjob="'+j.id+'">✏️</button><button class="btn btn-sm btn-red" data-deljob="'+j.id+'">✕</button></div></div>';
}

