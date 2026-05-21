// ══════════════════════════════════════════════════════════════
// SECRETÁRIA — Módulo completo
// • Briefing diário com prioridades inteligentes
// • Agendamento de visitas de medição
// • Notificações push via browser Notification API
// • Follow-up automático de orçamentos sem retorno
// ══════════════════════════════════════════════════════════════

// ── Inicialização lazy de DB.v (sem sobrescrever DB.sv) ──
function _getV() {
  if (!DB.v) {
    try { DB.v = JSON.parse(localStorage.getItem('hr_v')||'[]'); } catch(e){ DB.v=[]; }
  }
  return DB.v;
}
function _saveV() {
  try { localStorage.setItem('hr_v', JSON.stringify(_getV())); } catch(e){}
}

// ─────────────────────────────────────────────
// NOTIFICAÇÕES
// ─────────────────────────────────────────────
var _notifLastCheck = null;

function secInitNotif() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    Notification.requestPermission();
  }
  // Verifica a cada 60 segundos
  setInterval(secNotifCheck, 60000);
  // Primeira checagem ao abrir
  setTimeout(secNotifCheck, 3000);
}

function secNotifCheck() {
  if (Notification.permission !== 'granted') return;
  var hoje = td();
  var agora = new Date();
  var hh = agora.getHours();
  var mm = agora.getMinutes();
  var agoraMin = hh * 60 + mm;

  // ── Visitas próximas (30 min de antecedência) ──
  (_getV()).forEach(function(v){
    if(v.status !== 'agendada' || v.date !== hoje) return;
    if(!v.hora) return;
    var p = v.hora.split(':');
    var visitaMin = (+p[0])*60 + (+p[1]);
    var diff = visitaMin - agoraMin;
    if(diff >= 28 && diff <= 32){
      _sendNotif('📐 Visita em 30 minutos!',
        v.cli + ' — ' + (v.end||'') + ' às ' + v.hora,
        'visita_' + v.id);
    }
    // No horário exato
    if(diff >= -2 && diff <= 2){
      _sendNotif('📐 Hora da visita agora!',
        v.cli + ' — ' + (v.end||v.hora),
        'visita_now_' + v.id);
    }
  });

  // ── Lembretes diários (só às 8h da manhã) ──
  if(hh === 8 && mm < 5){
    var chaveHoje = 'notif_daily_' + hoje;
    if(localStorage.getItem(chaveHoje)) return;
    localStorage.setItem(chaveHoje, '1');

    var atrasados = (DB.j||[]).filter(function(j){return !j.done && j.end && dDiff(j.end)<0;});
    if(atrasados.length){
      _sendNotif('⚠️ ' + atrasados.length + ' entrega(s) atrasada(s)',
        atrasados.map(function(j){return j.cli;}).join(', '),
        'atrasados_' + hoje);
    }

    var visitasHoje = (_getV()).filter(function(v){return v.status==='agendada'&&v.date===hoje;});
    if(visitasHoje.length){
      _sendNotif('📅 Você tem ' + visitasHoje.length + ' visita(s) hoje',
        visitasHoje.map(function(v){return v.hora + ' — ' + v.cli;}).join(' | '),
        'visitas_' + hoje);
    }

    var pendentes = (DB.t||[]).filter(function(t){return t.type==='pend' && t.date && t.date < hoje;});
    if(pendentes.length){
      var totPend = pendentes.reduce(function(s,t){return s+(t.value||0);},0);
      _sendNotif('💰 R$ ' + fm(totPend) + ' a receber em atraso',
        pendentes.length + ' pagamento(s) pendente(s) vencido(s)',
        'pend_' + hoje);
    }
  }
}

var _notifSent = {};
function _sendNotif(title, body, key) {
  if (_notifSent[key]) return;
  _notifSent[key] = true;
  try {
    var n = new Notification(title, {
      body: body,
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      tag: key
    });
    n.onclick = function(){ window.focus(); n.close(); };
    setTimeout(function(){ n.close(); }, 8000);
  } catch(e){}
}

// ── Config do Bot ──
function _getBotCfg() {
  try { return JSON.parse(localStorage.getItem('hr_bot_cfg') || '{}'); } catch(e) { return {}; }
}
function _saveBotCfg(obj) {
  localStorage.setItem('hr_bot_cfg', JSON.stringify(Object.assign(_getBotCfg(), obj)));
}

var _botPollTimer = null;
var _botPolling   = false;

function botStartPoll() {
  if (_botPolling) return;
  _botPolling = true;
  _botPollTimer = setInterval(botCheckStatus, 3000);
  botCheckStatus();
}
function botStopPoll() {
  _botPolling = false;
  clearInterval(_botPollTimer);
}

function botCheckStatus() {
  var cfg = _getBotCfg();
  if (!cfg.url) return;
  fetch(cfg.url + '/bot/status')
    .then(function(r){ return r.json(); })
    .then(function(d){
      _saveBotCfg({ status: d.status, code: d.code || null });
      _botUpdateUI(d);
    })
    .catch(function(){ _botUpdateUI({ status: 'offline' }); });
}

function _botUpdateUI(d) {
  var st = d.status;
  var ind = document.getElementById('botStatusInd');
  var lbl = document.getElementById('botStatusLbl');
  var codeArea = document.getElementById('botCodeArea');
  var connectedArea = document.getElementById('botConnectedArea');
  var setupArea = document.getElementById('botSetupArea');
  if (!ind) return;

  // Indicador
  var map = {
    connected: { col: '#4abf4a', txt: '● Conectado' },
    connecting: { col: '#f0a040', txt: '◌ Conectando...' },
    disconnected: { col: '#e04040', txt: '● Desconectado' },
    offline: { col: '#888', txt: '● Servidor offline' }
  };
  var s = map[st] || map.disconnected;
  ind.style.color = s.col;
  if (lbl) lbl.textContent = s.txt;
  if (lbl) lbl.style.color = s.col;

  // Áreas
  if (codeArea) codeArea.style.display = (st === 'connecting' && d.code) ? 'block' : 'none';
  if (connectedArea) connectedArea.style.display = st === 'connected' ? 'block' : 'none';
  if (setupArea) setupArea.style.display = st !== 'connected' ? 'block' : 'none';

  // Código de pareamento
  if (d.code && codeArea) {
    var codeEl = document.getElementById('botPairCode');
    if (codeEl) codeEl.textContent = d.code;
  }
}

function botConnect() {
  var url   = (document.getElementById('botServerUrl').value || '').trim().replace(/\/$/, '');
  var phone = (document.getElementById('botPhone').value || '').trim();
  if (!url)   { toast('Informe a URL do servidor'); return; }
  if (!phone) { toast('Informe o número do bot'); return; }
  var cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length < 12) { toast('Número inválido — use DDI+DDD+número'); return; }

  _saveBotCfg({ url, phone: cleanPhone, status: 'connecting' });
  _botUpdateUI({ status: 'connecting' });

  var btnEl = document.getElementById('botConnectBtn');
  if (btnEl) { btnEl.textContent = '⏳ Gerando código...'; btnEl.disabled = true; }

  fetch(url + '/bot/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: cleanPhone })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (btnEl) { btnEl.textContent = 'Gerar Código'; btnEl.disabled = false; }
    if (d.error) { toast('❌ ' + d.error); return; }
    _saveBotCfg({ code: d.code });
    _botUpdateUI({ status: d.status, code: d.code });
    botStartPoll();
  })
  .catch(function(e){
    if (btnEl) { btnEl.textContent = 'Gerar Código'; btnEl.disabled = false; }
    toast('❌ Servidor não acessível. Verifique a URL.');
  });
}

function botDisconnect() {
  var cfg = _getBotCfg();
  if (!cfg.url) return;
  if (!confirm('Desconectar o bot do WhatsApp?')) return;
  fetch(cfg.url + '/bot/disconnect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limparSessao: false })
  }).then(function(){
    _saveBotCfg({ status: 'disconnected', code: null });
    _botUpdateUI({ status: 'disconnected' });
    toast('Bot desconectado.');
  }).catch(function(){ toast('Erro ao desconectar.'); });
}

function _renderBotPanel() {
  var cfg = _getBotCfg();
  var st  = cfg.status || 'disconnected';
  var statusMap = {
    connected:    { col: '#4abf4a', txt: '● Conectado' },
    connecting:   { col: '#f0a040', txt: '◌ Conectando...' },
    disconnected: { col: '#e04040', txt: '● Desconectado' },
    offline:      { col: '#888',    txt: '● Servidor offline' }
  };
  var sm = statusMap[st] || statusMap.disconnected;

  var h = '';
  h += '<div class="bot-panel">';

  // ── Header ──
  h += '<div class="bot-panel-head">';
  h += '<div style="display:flex;align-items:center;gap:10px;">';
  h += '<div class="bot-icon">📱</div>';
  h += '<div>';
  h += '<div class="bot-title">WhatsApp Bot</div>';
  h += '<div class="bot-subtitle">Assistente automático para clientes</div>';
  h += '</div>';
  h += '</div>';
  h += '<div id="botStatusLbl" class="bot-status-lbl" style="color:'+sm.col+';">'+sm.txt+'</div>';
  h += '</div>';

  // ── Área de configuração (quando desconectado) ──
  h += '<div id="botSetupArea" style="'+(st==='connected'?'display:none;':'')+'">';

  // URL do servidor
  h += '<div class="bot-field">';
  h += '<label class="bot-label">🌐 URL do Servidor Bot</label>';
  h += '<input id="botServerUrl" class="bot-input" type="url" placeholder="http://localhost:3001 ou https://seuservidor.com:3001" value="'+escH(cfg.url||'')+'"/>';
  h += '</div>';

  // Telefone
  h += '<div class="bot-field">';
  h += '<label class="bot-label">📱 Número do WhatsApp Bot</label>';
  h += '<input id="botPhone" class="bot-input" type="tel" placeholder="5574999990000 (DDI+DDD+número)" value="'+escH(cfg.phone||'')+'"/>';
  h += '<div class="bot-hint">Ex: 5574999990000 — sem espaços ou símbolos</div>';
  h += '</div>';

  h += '<button id="botConnectBtn" class="bot-connect-btn" onclick="botConnect()">📲 Gerar Código de Pareamento</button>';
  h += '</div>';

  // ── Código de pareamento ──
  h += '<div id="botCodeArea" style="'+(st==='connecting'&&cfg.code?'':'display:none;')+'">';
  h += '<div class="bot-code-section">';
  h += '<div class="bot-code-lbl">Código gerado — insira no WhatsApp</div>';
  h += '<div id="botPairCode" class="bot-code-display">'+(cfg.code||'——  ——')+'</div>';
  h += '<div class="bot-code-steps">';
  h += '<div class="bot-step"><span class="bot-step-n">1</span><span>Abra o WhatsApp no celular</span></div>';
  h += '<div class="bot-step"><span class="bot-step-n">2</span><span>Toque em <strong>⋮ Menu → Aparelhos conectados</strong></span></div>';
  h += '<div class="bot-step"><span class="bot-step-n">3</span><span>Toque em <strong>Conectar aparelho</strong></span></div>';
  h += '<div class="bot-step"><span class="bot-step-n">4</span><span>Escolha <strong>"Conectar com número de telefone"</strong></span></div>';
  h += '<div class="bot-step"><span class="bot-step-n">5</span><span>Digite o código acima</span></div>';
  h += '</div>';
  h += '<div class="bot-code-warn">⏳ O código expira em ~60 segundos. Se expirar, clique em Gerar Código novamente.</div>';
  h += '</div>';
  h += '</div>';

  // ── Conectado ──
  h += '<div id="botConnectedArea" style="'+(st==='connected'?'':'display:none;')+'">';
  h += '<div class="bot-connected-card">';
  h += '<div class="bot-connected-icon">✅</div>';
  h += '<div>';
  h += '<div class="bot-connected-title">Bot ativo e respondendo</div>';
  h += '<div class="bot-connected-sub">Número: +'+(cfg.phone||'—')+'</div>';
  h += '</div>';
  h += '<button class="bot-disconnect-btn" onclick="botDisconnect()">Desconectar</button>';
  h += '</div>';
  h += '</div>';

  // Indicador oculto para o poll atualizar
  h += '<span id="botStatusInd" style="display:none;" data-status="'+escH(st)+'"></span>';

  h += '</div>'; // bot-panel

  return h;
}

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────
function renderSecretaria() {
  var el = document.getElementById('secBody');
  if (!el) return;
  try {
    _renderSecretariaInner(el);
  } catch(err) {
    el.innerHTML = '<div style="padding:30px 18px;color:var(--t3);font-size:.78rem;">'
      + '⚠️ Erro ao carregar secretária.<br><small>'+escH(String(err))+'</small></div>';
    console.error('renderSecretaria:', err);
  }
}

function _renderSecretariaInner(el) {
  var hoje = td(); // data de hoje no formato YYYY-MM-DD
  var agora = new Date();
  var horaAtual = agora.getHours();
  var saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';
  var nomeEmp = (CFG && CFG.emp && CFG.emp.nome) ? CFG.emp.nome.split(' ')[0] : 'chefe';

  // ── Métricas ──
  var atrasados   = (DB.j||[]).filter(function(j){return !j.done&&j.end&&dDiff(j.end)<0;});
  var urgentes    = (DB.j||[]).filter(function(j){return !j.done&&j.urgente;});
  var emProd      = (DB.j||[]).filter(function(j){return !j.done;});
  var visitasHoje = (_getV()).filter(function(v){return v.status==='agendada'&&v.date===hoje;});
  var visitasAmanha = (_getV()).filter(function(v){return v.status==='agendada'&&v.date===addD(hoje,1);});
  var pendentes   = (DB.t||[]).filter(function(t){return t.type==='pend';});
  var pendVenc    = pendentes.filter(function(t){return t.date && t.date < hoje;});
  var totPend     = pendentes.reduce(function(s,t){return s+(t.value||0);},0);
  var totPendVenc = pendVenc.reduce(function(s,t){return s+(t.value||0);},0);

  // Follow-up: orçamentos >5 dias sem contrato
  var followUps = _secFollowUps(hoje);

  // Contagem total de itens para fazer
  var totalTarefas = atrasados.length + urgentes.length + pendVenc.length + followUps.length + visitasHoje.length;

  var h = '';

  // ── HERO ──
  h += '<div class="sec-hero">';
  h += '<div class="sec-saud">' + saudacao + '! 👋</div>';
  h += '<div class="sec-nome">' + escH(nomeEmp) + '</div>';
  if (totalTarefas > 0) {
    h += '<div class="sec-brief-count">';
    h += '<span class="sec-count-num">' + totalTarefas + '</span>';
    h += '<span class="sec-count-lbl">item' + (totalTarefas > 1 ? 's' : '') + ' precisam de atenção</span>';
    h += '</div>';
  } else {
    h += '<div class="sec-ok">✅ Tudo em ordem por enquanto!</div>';
  }
  h += '</div>';

  // ── CHIPS RESUMO ──
  h += '<div class="sec-chips">';
  h += _secChip(emProd.length,    '🔨', 'em produção',  'var(--gold2)',  'rgba(201,168,76,.12)');
  h += _secChip(visitasHoje.length,'📐', 'visita'+(visitasHoje.length!==1?'s':'')+ ' hoje', '#60c8ff', 'rgba(96,200,255,.1)');
  h += _secChip(totPend > 0 ? 'R$ '+_fmShort(totPend) : '0','💰', 'a receber', '#6abf6a', 'rgba(100,200,100,.1)');
  h += _secChip(atrasados.length, '⚠️', 'atrasado'+(atrasados.length!==1?'s':''), 'var(--red)', 'rgba(201,68,68,.12)');
  h += '</div>';

  // ── BOTÃO NOVA VISITA ──
  h += '<button class="sec-nova-visita" onclick="openVisitaMd(null)">';
  h += '📐 Agendar Visita de Medição</button>';

  // ── TAREFAS URGENTES ──
  if (atrasados.length || urgentes.length || pendVenc.length || followUps.length) {
    h += '<div class="sec-section-lbl">🔴 Ação imediata</div>';
    h += '<div class="sec-task-list">';
    atrasados.forEach(function(j){
      var d = Math.abs(dDiff(j.end));
      h += _secTask('⚠️', escH(j.cli) + ' — ' + escH(j.desc),
        d + (d===1?' dia':' dias') + ' atrasado',
        'red', 'data-editjob="'+j.id+'"', 'Ver serviço');
    });
    pendVenc.forEach(function(t){
      h += _secTask('💰', escH(t.desc), 'R$ '+fm(t.value||0)+' · venceu '+fd(t.date), 'yel', 'onclick="go(4);finTab(\'areceber\')"', 'Ir para Finanças');
    });
    urgentes.filter(function(j){return !atrasados.find(function(a){return a.id===j.id;});}).forEach(function(j){
      h += _secTask('🚨', escH(j.cli) + ' — ' + escH(j.desc),
        (j.urgMotivo||'Urgente'), 'org', 'data-editjob="'+j.id+'"', 'Ver serviço');
    });
    followUps.forEach(function(q){
      h += _secTask('📞', 'Follow-up: ' + escH(q.cli),
        'Orçamento '+fd(q.date)+' — R$ '+fm(q.vista)+' — sem retorno',
        'blu', 'onclick="go(7)"', 'Ver histórico');
    });
    h += '</div>';
  }

  // ── VISITAS HOJE ──
  if (visitasHoje.length) {
    h += '<div class="sec-section-lbl">📐 Visitas de hoje</div>';
    h += '<div class="sec-task-list">';
    visitasHoje.sort(function(a,b){return (a.hora||'').localeCompare(b.hora||'');}).forEach(function(v){
      h += _secVisitaCard(v, hoje);
    });
    h += '</div>';
  }

  // ── VISITAS AMANHÃ ──
  if (visitasAmanha.length) {
    h += '<div class="sec-section-lbl">📅 Amanhã</div>';
    h += '<div class="sec-task-list">';
    visitasAmanha.forEach(function(v){ h += _secVisitaCard(v, hoje); });
    h += '</div>';
  }

  // ── PRÓXIMAS VISITAS ──
  var proxVisitas = (_getV())
    .filter(function(v){return v.status==='agendada'&&v.date>addD(hoje,1);})
    .sort(function(a,b){return a.date.localeCompare(b.date)||(a.hora||'').localeCompare(b.hora||'');})
    .slice(0, 5);
  if (proxVisitas.length) {
    h += '<div class="sec-section-lbl">🗓 Próximas visitas</div>';
    h += '<div class="sec-task-list">';
    proxVisitas.forEach(function(v){ h += _secVisitaCard(v, hoje); });
    h += '</div>';
  }

  // ── VISITAS REALIZADAS RECENTES ──
  var realizadas = (_getV())
    .filter(function(v){return v.status==='realizada';})
    .sort(function(a,b){return b.date.localeCompare(a.date);})
    .slice(0, 3);
  if (realizadas.length) {
    h += '<div class="sec-section-lbl">✅ Realizadas recentemente</div>';
    h += '<div class="sec-task-list">';
    realizadas.forEach(function(v){ h += _secVisitaCard(v, hoje); });
    h += '</div>';
  }

  if (!totalTarefas && !visitasHoje.length && !proxVisitas.length) {
    h += '<div class="sec-empty"><div style="font-size:2.5rem;margin-bottom:10px;">🤝</div>';
    h += '<div>Nada urgente. Aproveite para fazer novos orçamentos!</div></div>';
  }

  h += '<div style="height:20px;"></div>';
  el.innerHTML = h;
} // end _renderSecretariaInner

// ─────────────────────────────────────────────
// HELPERS DE RENDER
// ─────────────────────────────────────────────
function _secChip(val, icon, label, color, bg) {
  return '<div class="sec-chip" style="color:'+color+';background:'+bg+';">'
    + '<span class="sec-chip-i">'+icon+'</span>'
    + '<span class="sec-chip-v">'+val+'</span>'
    + '<span class="sec-chip-l">'+label+'</span>'
    + '</div>';
}

function _secTask(icon, title, sub, color, action, btnLbl) {
  var colorMap = {red:'var(--red)',yel:'#d4a017',org:'#ff9060',blu:'#60a0e0',grn:'var(--grn)'};
  var c = colorMap[color] || 'var(--t3)';
  return '<div class="sec-task" style="border-left-color:'+c+';">'
    + '<div class="sec-task-icon" style="color:'+c+';">'+icon+'</div>'
    + '<div class="sec-task-body">'
      + '<div class="sec-task-title">'+title+'</div>'
      + '<div class="sec-task-sub" style="color:'+c+';">'+sub+'</div>'
    + '</div>'
    + '<button class="sec-task-btn" '+action+'>'+btnLbl+'</button>'
    + '</div>';
}

function _secVisitaCard(v, hoje) {
  var statusMap = {agendada:'📐',realizada:'✅',cancelada:'❌'};
  var icon = statusMap[v.status] || '📐';
  var isHoje = v.date === hoje;
  var dateLabel = isHoje ? 'Hoje' : (v.date === addD(hoje,1) ? 'Amanhã' : fd(v.date));
  var hora = v.hora || '';
  var statusLabel = v.status === 'agendada' ? (isHoje?'<span style="color:#60c8ff;font-weight:700;">HOJE</span>':dateLabel) : v.status.toUpperCase();

  return '<div class="sec-visita" id="sv_'+v.id+'">'
    + '<div class="sec-vis-head">'
      + '<div class="sec-vis-icon">'+icon+'</div>'
      + '<div class="sec-vis-info">'
        + '<div class="sec-vis-cli">'+escH(v.cli)+'</div>'
        + '<div class="sec-vis-meta">'
          + (hora?'🕐 '+hora+' · ':'')
          + '📅 '+statusLabel
          + (v.end?' · 📍 '+escH(v.end):'')
        + '</div>'
        + (v.obs?'<div class="sec-vis-obs">'+escH(v.obs)+'</div>':'')
      + '</div>'
    + '</div>'
    + (v.status === 'agendada' ? '<div class="sec-vis-btns">'
        + '<button class="sec-vis-btn grn" onclick="togVisitaStatus('+v.id+',\'realizada\')">✓ Realizada</button>'
        + '<button class="sec-vis-btn org" onclick="openVisitaMd('+v.id+')">✏️</button>'
        + '<button class="sec-vis-btn red" onclick="togVisitaStatus('+v.id+',\'cancelada\')">✕</button>'
        + (v.tel?'<button class="sec-vis-btn blu" onclick="window.open(\'https://wa.me/55\'+\''+v.tel.replace(/\D/g,'')+'\')">📱</button>':'')
      + '</div>' : '<div class="sec-vis-btns">'
        + '<button class="sec-vis-btn" onclick="togVisitaStatus('+v.id+',\'agendada\')">↩ Reagendar</button>'
        + '<button class="sec-vis-btn red" onclick="delVisita('+v.id+')">✕</button>'
      + '</div>')
    + '</div>';
}

function _secFollowUps(hoje) {
  var cutoff = addD(hoje, -5); // orçamentos com mais de 5 dias
  var cutoff2 = addD(hoje, -30); // mas menos de 30 dias (não muito antigos)
  return (DB.q||[]).filter(function(q){
    if (!q.date || q.date > cutoff || q.date < cutoff2) return false;
    // Verifica se tem contrato
    var temContrato = (DB.t||[]).some(function(t){
      return t.desc && t.desc.indexOf(q.cli||'???') >= 0 && t.type === 'in' && t.date >= q.date;
    });
    return !temContrato;
  }).slice(0, 3);
}

function _fmShort(v) {
  if (v >= 1000) return (v/1000).toFixed(1).replace('.',',') + 'k';
  return fm(v);
}

// ─────────────────────────────────────────────
// VISITAS — CRUD
// ─────────────────────────────────────────────
var _visitaEditId = null;

function openVisitaMd(id) {
  _visitaEditId = id;
  var md = document.getElementById('visitaMd');
  if (!md) return;
  document.getElementById('vMdTitle').textContent = id ? 'Editar Visita' : '📐 Nova Visita de Medição';

  if (id) {
    var v = (_getV()).find(function(x){return x.id===id;});
    if (!v) return;
    document.getElementById('vCli').value   = v.cli   || '';
    document.getElementById('vTel').value   = v.tel   || '';
    document.getElementById('vEnd').value   = v.end   || '';
    document.getElementById('vData').value  = v.date  || td();
    document.getElementById('vHora').value  = v.hora  || '';
    document.getElementById('vObs').value   = v.obs   || '';
  } else {
    document.getElementById('vCli').value   = '';
    document.getElementById('vTel').value   = '';
    document.getElementById('vEnd').value   = '';
    document.getElementById('vData').value  = td();
    document.getElementById('vHora').value  = '';
    document.getElementById('vObs').value   = '';
    // Pré-preenche com cliente do orçamento atual se houver
    if (pendQ && pendQ.cli) {
      document.getElementById('vCli').value = pendQ.cli;
      if (pendQ.tel) document.getElementById('vTel').value = pendQ.tel;
      if (pendQ.end) document.getElementById('vEnd').value = pendQ.end;
    }
  }
  showMd('visitaMd');
}

function saveVisita() {
  var cli  = document.getElementById('vCli').value.trim();
  var tel  = document.getElementById('vTel').value.trim();
  var end  = document.getElementById('vEnd').value.trim();
  var date = document.getElementById('vData').value;
  var hora = document.getElementById('vHora').value;
  var obs  = document.getElementById('vObs').value.trim();
  if (!cli) { toast('Informe o nome do cliente'); return; }
  if (!date){ toast('Informe a data'); return; }

  if (_visitaEditId) {
    var v = (_getV()).find(function(x){return x.id===_visitaEditId;});
    if (v) { v.cli=cli; v.tel=tel; v.end=end; v.date=date; v.hora=hora; v.obs=obs; _saveV(); }
  } else {
    _getV();
    _getV().unshift({id:Date.now(),cli:cli,tel:tel,end:end,date:date,hora:hora,obs:obs,status:'agendada'});
    _saveV();
  }
  closeAll();
  renderSecretaria();
  secNotifDotUpdate();
  toast('✓ Visita ' + (_visitaEditId ? 'atualizada' : 'agendada') + '!');
}

function togVisitaStatus(id, status) {
  var v = (_getV()).find(function(x){return x.id===id;});
  if (!v) return;
  v.status = status;
  _saveV();
  renderSecretaria();
  secNotifDotUpdate();
  var msgs = {realizada:'✅ Visita marcada como realizada!', cancelada:'Visita cancelada.', agendada:'Visita reagendada!'};
  toast(msgs[status]||'Atualizado!');
}

function delVisita(id) {
  if (!confirm('Remover visita?')) return;
  DB.v = _getV().filter(function(x){return x.id!==id;});
  _saveV();
  renderSecretaria();
  secNotifDotUpdate();
}

// ── Ponto (dot) de notificação no ícone da secretária ──
function secNotifDotUpdate() {
  var dot = document.getElementById('secDot');
  if (!dot) return;
  var hoje = td();
  var atrasados = (DB.j||[]).filter(function(j){return !j.done&&j.end&&dDiff(j.end)<0;}).length;
  var visitasHoje = (_getV()).filter(function(v){return v.status==='agendada'&&v.date===hoje;}).length;
  var pendVenc = (DB.t||[]).filter(function(t){return t.type==='pend'&&t.date&&t.date<hoje;}).length;
  dot.classList.toggle('on', atrasados>0||visitasHoje>0||pendVenc>0);
}
