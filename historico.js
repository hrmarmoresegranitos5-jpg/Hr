// ═══ UTILS ═══
function fm(v){return parseFloat(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});}
function fd(s){try{var p=s.split('-');return p[2]+'/'+p[1]+'/'+p[0];}catch(e){return s||'';}}
function dDiff(s){try{var t=new Date(s+'T00:00:00');var n=new Date();n.setHours(0,0,0,0);return Math.ceil((t-n)/86400000);}catch(e){return 0;}}
function addD(s,n){try{var d=new Date(s+'T00:00:00');d.setDate(d.getDate()+n);return d.toISOString().split('T')[0];}catch(e){return s;}}
function td(){return new Date().toISOString().split('T')[0];}
function lastEnd(){var a=DB.j.filter(function(j){return !j.done&&j.end;}).sort(function(a,b){return new Date(b.end)-new Date(a.end);});return a.length?a[0].end:null;}
// ═══════════════════════════════════════════════
// ORÇAMENTOS HISTÓRICO
// ═══════════════════════════════════════════════

// ── Funil de status ──────────────────────────────────────────────────────────
var STATUS_COR = {
  aberto:         '#888888',
  em_negociacao:  '#f39c12',
  aprovado:       '#3498db',
  fechado:        '#27ae60',
  perdido:        '#e74c3c',
  expirado:       '#999999'
};
var STATUS_LABEL = {
  aberto:'Aberto', em_negociacao:'Em negociação', aprovado:'Aprovado',
  fechado:'Fechado', perdido:'Perdido', expirado:'Expirado'
};

var _orcFilter = '';
var _orcFiltMes = '';
var _orcFiltStatus = '';
var _orcFiltTipo = '';

// ── Verificar orçamentos expirados automaticamente ───────────────────────────
function _orcChecarExpirados() {
  var hoje = td();
  var alterou = false;
  (DB.q||[]).forEach(function(q) {
    if ((q.status === 'aberto' || q.status === 'em_negociacao') && q.validade && q.validade < hoje) {
      q.status = 'expirado';
      q.statusAt = hoje;
      alterou = true;
    }
  });
  if (alterou) DB.sv();
}

function renderOrc() {
  _orcChecarExpirados();

  var total = DB.q.length;
  var totalVista = DB.q.reduce(function(s,q){return s+(q.vista||0);},0);
  var thisMonth = (new Date()).toISOString().slice(0,7);
  var mesCount = DB.q.filter(function(q){return (q.date||'').slice(0,7)===thisMonth;}).length;

  // Métricas de funil
  var aprovados = DB.q.filter(function(q){return q.status==='aprovado'||q.status==='fechado';}).length;
  var perdidos   = DB.q.filter(function(q){return q.status==='perdido';}).length;
  var txConv     = total > 0 ? Math.round(aprovados/total*100) : 0;

  var sumEl = document.getElementById('orcSummary');
  if(sumEl) sumEl.innerHTML =
    '<div class="orc-sum-card"><div class="orc-sum-v">'+total+'</div><div class="orc-sum-l">Total</div></div>' +
    '<div class="orc-sum-card"><div class="orc-sum-v">'+mesCount+'</div><div class="orc-sum-l">Este mês</div></div>' +
    '<div class="orc-sum-card"><div class="orc-sum-v">R$ '+(totalVista/1000).toFixed(0)+'k</div><div class="orc-sum-l">Em orçamentos</div></div>' +
    '<div class="orc-sum-card"><div class="orc-sum-v" style="color:#27ae60;">'+txConv+'%</div><div class="orc-sum-l">Conversão</div></div>';

  // Gerar opções de mês dinamicamente
  var meses = {};
  (DB.q||[]).forEach(function(q){ if(q.date) meses[q.date.slice(0,7)] = true; });
  var mesesArr = Object.keys(meses).sort().reverse();
  var filtMesEl = document.getElementById('orcFiltMes');
  if(filtMesEl && filtMesEl.options.length <= 1) {
    mesesArr.forEach(function(m) {
      var opt = document.createElement('option');
      opt.value = m;
      var p = m.split('-');
      var mNomes = ['','Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
      opt.textContent = mNomes[parseInt(p[1],10)] + '/' + p[0];
      filtMesEl.appendChild(opt);
    });
  }

  filterOrc();
}

function filterOrc() {
  _orcFilter    = (document.getElementById('orcSearch')   ||{value:''}).value.trim().toLowerCase();
  _orcFiltMes   = (document.getElementById('orcFiltMes')  ||{value:''}).value;
  _orcFiltStatus= (document.getElementById('orcFiltStatus')||{value:''}).value;
  _orcFiltTipo  = (document.getElementById('orcFiltTipo') ||{value:''}).value;

  var filtered = (DB.q||[]).filter(function(q) {
    if(_orcFilter    && (q.cli||'').toLowerCase().indexOf(_orcFilter) < 0) return false;
    if(_orcFiltMes   && (q.date||'').slice(0,7) !== _orcFiltMes) return false;
    if(_orcFiltStatus && (q.status||'aberto') !== _orcFiltStatus) return false;
    if(_orcFiltTipo  && (q.tipo||'').indexOf(_orcFiltTipo) < 0) return false;
    return true;
  });
  buildOrcList(filtered);
}

function _orcFiltrosHTML() {
  return '<div id="orcFiltros" style="display:flex;flex-wrap:wrap;gap:6px;padding:8px 0 4px;">' +
    '<select id="orcFiltMes" onchange="filterOrc()" style="flex:1;min-width:100px;padding:5px 7px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:#ccc;font-size:.72rem;">' +
      '<option value="">Todos os meses</option>' +
    '</select>' +
    '<select id="orcFiltStatus" onchange="filterOrc()" style="flex:1;min-width:100px;padding:5px 7px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:#ccc;font-size:.72rem;">' +
      '<option value="">Todos os status</option>' +
      '<option value="aberto">Aberto</option>' +
      '<option value="em_negociacao">Em negociação</option>' +
      '<option value="aprovado">Aprovado</option>' +
      '<option value="fechado">Fechado</option>' +
      '<option value="perdido">Perdido</option>' +
      '<option value="expirado">Expirado</option>' +
    '</select>' +
    '<select id="orcFiltTipo" onchange="filterOrc()" style="flex:1;min-width:100px;padding:5px 7px;border-radius:8px;border:1px solid #333;background:#1a1a1a;color:#ccc;font-size:.72rem;">' +
      '<option value="">Todos os tipos</option>' +
      '<option value="Cozinha">Cozinha</option>' +
      '<option value="Banheiro">Banheiro</option>' +
      '<option value="Lavabo">Lavabo</option>' +
      '<option value="Soleira">Soleira</option>' +
      '<option value="Peitoril">Peitoril</option>' +
      '<option value="Escada">Escada</option>' +
      '<option value="Fachada">Fachada</option>' +
      '<option value="Túmulo">Túmulo</option>' +
      '<option value="Outro">Outro</option>' +
    '</select>' +
  '</div>';
}

function buildOrcList(list) {
  var el = document.getElementById('orcList');
  if(!el) return;

  // Injetar barra de filtros se ainda não existe
  var filtBar = document.getElementById('orcFiltros');
  if(!filtBar) {
    var searchEl = document.getElementById('orcSearch');
    if(searchEl && searchEl.parentNode) {
      var div = document.createElement('div');
      div.innerHTML = _orcFiltrosHTML();
      searchEl.parentNode.insertBefore(div.firstChild, searchEl.nextSibling);
    }
  }

  if(!list || !list.length) {
    el.innerHTML = '<div class="orc-empty"><div class="orc-empty-icon">📋</div>' +
      (_orcFilter || _orcFiltMes || _orcFiltStatus || _orcFiltTipo
        ? 'Nenhum orçamento com esses filtros.'
        : 'Nenhum orçamento ainda.<br>Faça um orçamento para começar!') + '</div>';
    return;
  }

  var tipo_icons = {Cozinha:'🍳',Banheiro:'🚿',Lavabo:'🪴',Soleira:'🚪',Peitoril:'🏠',Escada:'📐',Fachada:'🏛️','Túmulo':'🪦',Outro:'📦'};
  var h = '';
  list.forEach(function(q) {
    var icon = tipo_icons[q.tipo] || '📦';
    var dateStr = q.date ? fd(q.date) : '';
    var pdsCount = (q.pds||[]).length + (q.sfPcs||[]).length;

    // Status atual
    var st = q.status || 'aberto';
    // Auto-badge expirado visual (pode já ter sido setado em _orcChecarExpirados)
    var stCor   = STATUS_COR[st]   || '#888';
    var stLabel = STATUS_LABEL[st] || st;

    h += '<div class="qcard" id="qc-'+q.id+'" onclick="togQCard(\''+q.id+'\')">'; 
    // Head
    h += '<div class="qcard-head">';
    h +=   '<div class="qcard-badge">'+icon+'</div>';
    h +=   '<div class="qcard-info">';
    h +=     '<div class="qcard-cli" onclick="orcIrFinancas('+q.id+',event)" style="cursor:pointer;" title="Ver nas Finanças">'+escH(q.cli)+'<span style="font-size:.52rem;color:var(--gold);opacity:.7;margin-left:5px;">💰</span></div>';
    h +=     '<div class="qcard-meta">'+dateStr+' · '+q.tipo+' · '+escH(q.mat||'')+'</div>';
    h +=   '</div>';
    h +=   '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">';
    h +=     '<div class="qcard-val">R$ '+fm(q.vista)+'</div>';
    // Badge de status
    h +=     '<span style="font-size:.56rem;padding:2px 8px;border-radius:20px;background:'+stCor+'22;color:'+stCor+';font-weight:700;border:1px solid '+stCor+'44;white-space:nowrap;">'+stLabel+'</span>';
    h +=   '</div>';
    h +=   '<span class="qcard-chev">▼</span>';
    h += '</div>';

    // Body
    h += '<div class="qcard-body">';

    // ── Botões de funil de status ────────────────────────────────────────────
    h += '<div style="margin:6px 0 8px;">';
    h += '<div style="font-size:.6rem;color:var(--t4);margin-bottom:4px;text-transform:uppercase;letter-spacing:.5px;">Atualizar status:</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
    ['em_negociacao','aprovado','fechado','perdido'].forEach(function(s) {
      var ativo = st === s;
      h += '<button onclick="orcSetStatus(\''+q.id+'\',\''+s+'\',event)" style="font-size:.58rem;padding:3px 9px;border-radius:14px;border:1px solid '+STATUS_COR[s]+(ativo?'':' 66')+';background:'+(ativo ? STATUS_COR[s]+'33' : 'transparent')+';color:'+STATUS_COR[s]+';cursor:pointer;font-weight:'+(ativo?'700':'400')+';">'+STATUS_LABEL[s]+'</button>';
    });
    h += '</div></div>';

    // Info de auditoria (se editado)
    if(q.editCount > 0) {
      h += '<div class="qdr"><span class="k">Editado</span><span class="v" style="font-size:.65rem;color:#aaa;">'+q.editCount+'x · última vez '+fd(q.updatedAt||q.date)+'</span></div>';
    }
    // Motivo da perda
    if(q.status==='perdido' && q.motivoPerda) {
      h += '<div class="qdr"><span class="k" style="color:#e74c3c;">Motivo perda</span><span class="v" style="font-size:.7rem;color:#e74c3c;">'+escH(q.motivoPerda)+'</span></div>';
    }

    // Pills
    h += '<div class="qcard-pills">';
    if(q.m2) h += '<div class="qpill gold">'+q.m2.toFixed(3)+' m²</div>';
    if(pdsCount) h += '<div class="qpill">'+pdsCount+' peça'+(pdsCount>1?'s':'')+'</div>';
    if(q.mat) h += '<div class="qpill">'+escH(q.mat)+'</div>';
    if(q.tel) h += '<div class="qpill">'+escH(q.tel)+'</div>';
    h += '</div>';

    // Detail table
    h += '<div class="qcard-detail">';
    if(q.pds&&q.pds.length) {
      q.pds.forEach(function(p){
        h += '<div class="qdr"><span class="k">'+escH(p.desc||'Peça')+'</span><span class="v">'+p.w+'×'+p.h+'cm'+(p.q>1?' ×'+p.q:'')+'</span></div>';
      });
    }
    if(q.sfPcs&&q.sfPcs.length) {
      q.sfPcs.forEach(function(p){
        h += '<div class="qdr"><span class="k">'+escH(p.l||'Sainha/Frontão')+'</span><span class="v">'+p.w+'ml×'+p.h+'cm'+(p.q>1?' ×'+p.q:'')+'</span></div>';
      });
    }
    if(q.acN&&q.acN.length) {
      h += '<div class="qdr"><span class="k">Serviços incluso</span><span class="v" style="font-size:.68rem;text-align:right;max-width:180px;">'+q.acN.join(', ')+'</span></div>';
    }
    if(q.cidade) h += '<div class="qdr"><span class="k">Cidade</span><span class="v">'+escH(q.cidade)+'</span></div>';
    if(q.end) h += '<div class="qdr"><span class="k">Endereço</span><span class="v" style="font-size:.72rem;text-align:right;max-width:180px;">'+escH(q.end)+'</span></div>';
    if(q.obs) h += '<div class="qdr"><span class="k">Obs.</span><span class="v grn" style="font-size:.72rem;max-width:180px;text-align:right;">'+escH(q.obs)+'</span></div>';
    h += '</div>';

    // Totals
    h += '<div class="qcard-total"><span class="k">À Vista (melhor)</span><span class="v">R$ '+fm(q.vista)+'</span></div>';

    // Buttons
    h += '<div class="qcard-btns">';
    h += '<button class="btn btn-g" onclick="orcEditar(\''+q.id+'\',event)">✏️ Editar</button>';
    h += '<button class="btn btn-o" onclick="orcCopiar(\''+q.id+'\',event)">📋 Copiar</button>';
    h += '<button class="btn btn-o" onclick="orcPDF(\''+q.id+'\',event)">📄 PDF</button>';
    h += '<button class="btn btn-contrato" data-cid="'+q.id+'" onclick="gerarContrId(this,event)">📜 Contrato</button>';
    h += '<button class="btn btn-red" onclick="orcDel(\''+q.id+'\',event)">🗑</button>';
    if (DB.qLixo && DB.qLixo.length) {
      h += '<button class="btn" style="font-size:.6rem;opacity:.6;" onclick="orcMostrarLixeira(event)">🗑 Lixeira ('+DB.qLixo.length+')</button>';
    }
    h += '</div>';

    h += '</div>'; // qcard-body
    h += '</div>'; // qcard
  });
  el.innerHTML = h;
}

// ── Alterar status do funil ──────────────────────────────────────────────────
function orcSetStatus(id, status, e) {
  if(e) e.stopPropagation();
  var q = (DB.q||[]).find(function(x){return x.id==id;});
  if(!q) return;
  if(status === 'perdido') {
    var motivo = prompt('Motivo da perda (opcional):') || '';
    q.motivoPerda = motivo;
  }
  q.status   = status;
  q.statusAt = td();
  DB.sv();
  renderOrc();
  toast('✓ Status: ' + (STATUS_LABEL[status]||status));
}

// ── Soft-delete com lixeira ──────────────────────────────────────────────────
function orcDel(id, e) {
  if(e){e.stopPropagation();e.preventDefault();}
  var q = (DB.q||[]).find(function(x){return x.id==id;});
  if(!q) return;
  if(!DB.qLixo) DB.qLixo = [];
  q._deletedAt = td();
  DB.qLixo.push(JSON.parse(JSON.stringify(q)));
  DB.q = DB.q.filter(function(x){return x.id!=id;});
  DB.sv(); renderOrc();
  toast('🗑 Excluído — <u onclick="orcRestore('+id+')" style="cursor:pointer;text-decoration:underline;">Desfazer</u>');
}

function orcRestore(id) {
  if(!DB.qLixo) return;
  var q = DB.qLixo.find(function(x){return x.id==id;});
  if(!q) return;
  delete q._deletedAt;
  if(!DB.q) DB.q = [];
  DB.q.unshift(q);
  DB.qLixo = DB.qLixo.filter(function(x){return x.id!=id;});
  DB.sv(); renderOrc();
  toast('✓ Orçamento restaurado!');
}

function orcMostrarLixeira(e) {
  if(e) e.stopPropagation();
  if(!DB.qLixo || !DB.qLixo.length) { toast('Lixeira vazia.'); return; }
  var h = '<div style="padding:12px;"><b>🗑 Lixeira ('+DB.qLixo.length+')</b><br><br>';
  DB.qLixo.forEach(function(q){
    h += '<div style="margin-bottom:8px;padding:8px;background:#1a1a1a;border-radius:8px;display:flex;justify-content:space-between;align-items:center;">';
    h += '<span style="font-size:.75rem;">'+escH(q.cli||'')+'<br><span style="font-size:.65rem;color:#888;">'+fd(q.date||'')+'</span></span>';
    h += '<button onclick="orcRestore('+q.id+');_fecharModalLixeira();" class="btn btn-g" style="font-size:.65rem;">Restaurar</button>';
    h += '</div>';
  });
  h += '</div>';
  // Modal simples
  var m = document.createElement('div');
  m.id = '_modalLixeira';
  m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:9999;overflow-y:auto;';
  m.innerHTML = '<div style="max-width:420px;margin:40px auto;background:#111;border-radius:14px;border:1px solid #333;">'+h+'<div style="padding:0 12px 12px;"><button class="btn btn-red" onclick="_fecharModalLixeira()">Fechar</button></div></div>';
  document.body.appendChild(m);
}
function _fecharModalLixeira(){var m=document.getElementById('_modalLixeira');if(m)m.remove();}

// ── Demais funções (sem alteração de comportamento) ──────────────────────────

function orcIrFinancas(id, e) {
  if(e) e.stopPropagation();
  var q = (DB.q||[]).find(function(x){return x.id==id;});
  if(!q) return;
  // Navegar para aba de Finanças e pré-filtrar pelo nome do cliente
  if(typeof go === 'function') go(6); // índice da aba Finanças
  setTimeout(function(){
    var srch = document.getElementById('finSearch') || document.getElementById('trSearch');
    if(srch){ srch.value = q.cli||''; srch.dispatchEvent(new Event('input',{bubbles:true})); }
  }, 250);
}

function togQCard(id) {
  var el = document.getElementById('qc-'+id);
  if(el) el.classList.toggle('open');
}

function orcEditar(id, e){
  e.stopPropagation();
  var q = DB.q.find(function(x){return x.id==id;});
  if(!q) return;

  var isTumulo = q.tum
    || (q.ambSnap && q.ambSnap.some(function(s){return s.tipo==='Túmulo';}));

  if(isTumulo){
    var pendOrcTum = q.tumPendOrc
      || (q.ambSnap && (function(){
           var s = q.ambSnap.find(function(s){return s.tipo==='Túmulo' && s.tumPendOrc;});
           return s ? s.tumPendOrc : null;
         })());

    if(pendOrcTum && typeof window._TI_preencherCliente === 'function'){
      orcRefazer(id, e);
      setTimeout(function(){
        window._TI_preencherCliente(pendOrcTum);
        toast('✓ Túmulo carregado — ajuste e recalcule!');
      }, 400);
      return;
    }

    orcRefazer(id, e);
    toast('⚠️ Orçamento antigo — configure as medidas e recalcule');
    return;
  }

  orcRefazer(id, e);
}

function orcRefazer(id, e) {
  e.stopPropagation();
  var q = DB.q.find(function(x){return x.id==id;});
  if(!q) return;

  // Marcar que este orçamento está sendo editado (para preservar auditoria ao salvar)
  window._orcEditandoId = q.id;

  var cliEl=document.getElementById('oCliente'); if(cliEl)cliEl.value=q.cli||'';
  var telEl=document.getElementById('oTel'); if(telEl)telEl.value=q.tel||'';
  var cidEl=document.getElementById('oCidade'); if(cidEl)cidEl.value=q.cidade||'';
  var endEl=document.getElementById('oEnd'); if(endEl)endEl.value=q.end||'';
  var obsEl=document.getElementById('oObs'); if(obsEl)obsEl.value=q.obs||'';

  var mat=CFG.stones.find(function(s){return s.nm===q.mat;});
  if(mat){selMat=mat.id;buildMat();}

  ambientes=[];

  if(q.ambSnap&&q.ambSnap.length){
    q.ambSnap.forEach(function(snap,idx){
      var ambId=Date.now()+idx;
      var snapMat = snap.selMat || (mat ? mat.id : null) || selMat || null;
      var amb = {
        id:ambId,
        tipo:snap.tipo||'Cozinha',
        pecas:snap.pecas.map(function(p){return {id:Date.now()+Math.random(),desc:p.desc||'',w:p.w||0,h:p.h||0,q:p.q||1,bordas:JSON.parse(JSON.stringify(p.bordas||{}))};}),
        selCuba:snap.selCuba||null,
        svState:JSON.parse(JSON.stringify(snap.svState||{})),
        acState:JSON.parse(JSON.stringify(snap.acState||{})),
        tumExtra:snap.tumExtra?JSON.parse(JSON.stringify(snap.tumExtra)):null,
        selMat:snapMat
      };
      if(snap.tipo==='Túmulo'){
        if(snap.tumResult)  amb.tumResult  = JSON.parse(JSON.stringify(snap.tumResult));
        if(snap.tumPendOrc) amb.tumPendOrc = JSON.parse(JSON.stringify(snap.tumPendOrc));
      }
      ambientes.push(amb);
    });
  } else {
    var tipos=(q.tipo||'Cozinha').split('+');
    tipos.forEach(function(tipo,idx){
      tipo=tipo.trim();
      var ambId=Date.now()+idx;
      var pecas=[];
      if(idx===0&&q.pds&&q.pds.length){
        q.pds.forEach(function(p){
          pecas.push({id:Date.now()+Math.random(),desc:p.desc||'',w:p.w||0,h:p.h||0,q:p.q||1});
        });
      } else {
        pecas.push({id:Date.now()+Math.random(),desc:'',w:0,h:0,q:1});
      }
      ambientes.push({id:ambId,tipo:tipo,pecas:pecas,selCuba:null,svState:{},acState:{}});
    });
  }

  if(!ambientes.length)addAmbiente();

  renderAmbientes();

  setTimeout(function(){
    ambientes.forEach(function(a){
      if(a.tipo==='Túmulo' && a.tumPendOrc && typeof window._TI_preencherCliente==='function'){
        window._TI_preencherCliente(a.tumPendOrc);
      }
    });
  }, 300);

  var urgRestored = q.urgPct || 0;
  window._urgPct = urgRestored;
  document.querySelectorAll('[data-upct]').forEach(function(b){
    b.classList.toggle('on', +b.dataset.upct === urgRestored);
  });
  var urgHintEl = document.getElementById('urgPctHint');
  var _urgHintsLocal = {0:'Prazo padrão',10:'Prioridade moderada — entra antes de 1 serviço',20:'Alta prioridade — reorganização da fila',30:'Máxima urgência — início imediato'};
  if(urgHintEl) urgHintEl.textContent = _urgHintsLocal[urgRestored] || '+' + urgRestored + '% sobre o valor';

  go(0);
  setTimeout(function(){document.getElementById('pg0').scrollTop=0;},100);
  toast('✓ Orçamento carregado! Edite e recalcule.');
}

function orcCopiar(id, e) {
  e.stopPropagation();
  var q = DB.q.find(function(x){return x.id==id;});
  if(!q) return;
  var pTxt = (q.pds||[]).map(function(p){return '• '+(p.desc||'Peça')+' — '+p.w+'×'+p.h+'cm'+(p.q>1?' ×'+p.q:'');}).join('\n');
  if(q.sfPcs&&q.sfPcs.length) pTxt += '\n'+(q.sfPcs||[]).map(function(p){return '• '+p.l+' — '+p.w+'ml×'+p.h+'cm'+(p.q>1?' ×'+p.q:'');}).join('\n');
  var aTxt = (q.acN&&q.acN.length) ? (q.acN||[]).map(function(a){return '• '+a;}).join('\n') : '• Acabamento profissional';
  var txt = 'HR MARMORES E GRANITOS\nORCAMENTO — '+(q.cli||'Cliente')+'\n\nMaterial: '+(q.mat||'')+'\n\n'+(q.tipo||'Projeto')+':\n'+pTxt+'\n\nIncluso:\n'+aTxt+'\n• Fabricacao e acabamento completo\n\n==================\nPARCELADO\nR$ '+fm(q.parc)+' — ate 8x de R$ '+fm(q.p8||0)+'\n\nA VISTA\nR$ '+fm(q.vista)+'\n==================\n'+CFG.emp.nome+'\n'+CFG.emp.tel;
  if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(txt).then(function(){toast('✓ Copiado!');}).catch(function(){_copiarFallback(txt);});return;}
  _copiarFallback(txt);
}

function orcPDF(id, e) {
  e.stopPropagation();
  var q = DB.q.find(function(x){return x.id==id;});
  if(!q) return;
  var isTumulo = q.tum
    || (q.ambSnap && q.ambSnap.some(function(s){return s.tipo==='Túmulo';}));
  if(isTumulo){
    if(typeof gerarPDFTumulo === 'function'){
      gerarPDFTumulo(q);
    } else {
      toast('⚠️ Função de PDF de túmulo não encontrada');
    }
    return;
  }
  pendQ = q;
  gerarPDF();
}
