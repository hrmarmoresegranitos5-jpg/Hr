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
    // Renderiza painel IA após DOM pronto
    setTimeout(function() { _secRenderAI(); }, 0);
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

  // ── PAINEL WHATSAPP BOT ──
  h += _renderBotPanel();

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

  // ── SECRETÁRIA IA ──
  h += '<div style="background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:14px 16px;margin-bottom:14px;" id="secAIContainer">';
  h += '<div style="color:rgba(255,255,255,.35);font-size:12px;text-align:center;padding:10px 0;">⟳ Carregando IA...</div>';
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
  // Inicia poll de status APÓS o DOM estar pronto
  botStartPoll();
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

// ══════════════════════════════════════════════════════════════
// SECRETÁRIA INTELIGENTE — FASE 1 + 2
// Cérebro de Contexto + IA Conselheira (Anthropic Claude API)
// ══════════════════════════════════════════════════════════════

// ── Estado global da IA ──
var _secAI = {
  data: null,
  loading: false,
  lastUpdate: null,
  error: null
};

// ── Cérebro de Contexto: compila dados reais do DB ──
function _secBuildCtx() {
  var hoje = td();
  var agora = new Date();
  var hh = agora.getHours();
  var equipe = (CFG && CFG.emp && CFG.emp.equipe) ? +CFG.emp.equipe : 3;
  var capacidade = equipe * 3;

  var atrasados   = (DB.j||[]).filter(function(j){return !j.done && j.end && dDiff(j.end) < 0;});
  var urgentes    = (DB.j||[]).filter(function(j){return !j.done && j.urgente;});
  var emProd      = (DB.j||[]).filter(function(j){return !j.done;});
  var entrega3d   = (DB.j||[]).filter(function(j){return !j.done && j.end && dDiff(j.end) >= 0 && dDiff(j.end) <= 3;});

  var pendentes   = (DB.t||[]).filter(function(t){return t.type === 'pend';});
  var pendVenc    = pendentes.filter(function(t){return t.date && t.date < hoje;});
  var pendSem     = pendentes.filter(function(t){return t.date && dDiff(t.date) >= 0 && dDiff(t.date) <= 7;});
  var saidas30    = (DB.t||[]).filter(function(t){return t.type === 'out' && t.date && dDiff(t.date) >= 0 && dDiff(t.date) <= 30;});

  var totPend     = pendentes.reduce(function(s,t){return s + (t.value||0);}, 0);
  var totPendVenc = pendVenc.reduce(function(s,t){return s + (t.value||0);}, 0);
  var totSemana   = pendSem.reduce(function(s,t){return s + (t.value||0);}, 0);
  var totSaidas   = saidas30.reduce(function(s,t){return s + (t.value||0);}, 0);

  var pressura    = Math.min(100, Math.round((emProd.length / capacidade) * 100));
  var podeAceit   = Math.max(0, capacidade - emProd.length);

  var cutoff      = addD(hoje, -5);
  var cutoff2     = addD(hoje, -30);
  var followUps   = (DB.q||[]).filter(function(q){
    if (!q.date || q.date > cutoff || q.date < cutoff2) return false;
    return !(DB.t||[]).some(function(t){
      return t.desc && t.desc.indexOf(q.cli||'') >= 0 && t.type === 'in' && t.date >= q.date;
    });
  });

  var visitasHoje = (_getV()).filter(function(v){return v.status === 'agendada' && v.date === hoje;});
  var nome = (CFG && CFG.emp && CFG.emp.nome) ? CFG.emp.nome.split(' ')[0] : 'chefe';
  var saudacao = hh < 12 ? 'Bom dia' : hh < 18 ? 'Boa tarde' : 'Boa noite';

  return {
    hoje: hoje, hh: hh, nome: nome, saudacao: saudacao,
    equipe: equipe, capacidade: capacidade, pressura: pressura, podeAceit: podeAceit,
    atrasados: atrasados, urgentes: urgentes, emProd: emProd, entrega3d: entrega3d,
    pendentes: pendentes, pendVenc: pendVenc, pendSem: pendSem,
    totPend: totPend, totPendVenc: totPendVenc, totSemana: totSemana, totSaidas: totSaidas,
    saldo: totPend - totSaidas,
    followUps: followUps, visitasHoje: visitasHoje
  };
}

// ── Monta o briefing para a IA ──
function _secBuildBriefing(ctx) {
  var linhasServicos = (ctx.emProd||[]).map(function(j) {
    var diff = dDiff(j.end);
    var status = diff < 0 ? 'ATRASADO ' + Math.abs(diff) + 'd' : 'em ' + diff + 'd';
    return '• ' + j.cli + ' — ' + j.desc + ' | Prazo: ' + j.end + ' (' + status + ') | R$ ' + fm(j.value||0) + (j.urgente ? ' | ⚠️ URGENTE: ' + (j.urgMotivo||'urgente') : '');
  }).join('\n') || 'Nenhum serviço em produção';

  var linhasFollowUp = (ctx.followUps||[]).map(function(q) {
    return '• ' + q.cli + ' — R$ ' + fm(q.vista||0) + ' | orçado em ' + fd(q.date) + (q.tel ? ' | Tel: ' + q.tel : '');
  }).join('\n') || 'Nenhum';

  var linhasVisitas = (ctx.visitasHoje||[]).map(function(v) {
    return '• ' + v.cli + ' às ' + (v.hora||'?') + ' — ' + (v.end||'');
  }).join('\n') || 'Nenhuma';

  return 'Você é a Secretária Inteligente da HR Mármores, uma marmoraria.\n'
    + 'Analise os dados e gere um briefing DIRETO e PRÁTICO. Use nomes e valores reais.\n\n'
    + 'DADOS DE HOJE (' + ctx.hoje + '):\n'
    + '- Equipe: ' + ctx.equipe + ' pessoas | Capacidade: ' + ctx.capacidade + ' serviços\n'
    + '- Pressão de produção: ' + ctx.pressura + '% (' + ctx.emProd.length + ' ativos de ' + ctx.capacidade + ')\n'
    + '- Pode aceitar: ' + ctx.podeAceit + ' serviços novos\n\n'
    + 'SERVIÇOS EM PRODUÇÃO (' + ctx.emProd.length + '):\n' + linhasServicos + '\n\n'
    + 'FINANÇAS:\n'
    + '- Total a receber: R$ ' + fm(ctx.totPend) + '\n'
    + '- Vencido/atrasado: R$ ' + fm(ctx.totPendVenc) + '\n'
    + '- A receber em 7 dias: R$ ' + fm(ctx.totSemana) + '\n'
    + '- Compromissos 30 dias: R$ ' + fm(ctx.totSaidas) + '\n'
    + '- Saldo projetado: R$ ' + fm(ctx.saldo) + ' ' + (ctx.saldo >= 0 ? '(positivo)' : '(NEGATIVO)') + '\n\n'
    + 'ORÇAMENTOS SEM RETORNO (' + ctx.followUps.length + '):\n' + linhasFollowUp + '\n\n'
    + 'VISITAS HOJE: ' + ctx.visitasHoje.length + '\n' + linhasVisitas + '\n\n'
    + 'Responda APENAS em JSON válido, sem markdown:\n'
    + '{"fazerAgora":{"titulo":"string","detalhe":"1-2 frases diretas"},'
    + '"ondeApertar":{"titulo":"string","detalhe":"1-2 frases diretas"},'
    + '"oportunidade":{"titulo":"string","detalhe":"1-2 frases diretas"},'
    + '"alertaRitmo":{"titulo":"string","detalhe":"1-2 frases diretas"},'
    + '"conselhoFinanceiro":{"titulo":"string","detalhe":"1-2 frases diretas"},'
    + '"humorGeral":"otimo|bom|atencao|critico"}';
}

// ── Chama API do Claude ──
function secFetchAI() {
  var key = CFG && CFG.emp && CFG.emp.apiKey;
  if (!key) {
    _secAI.error = 'Configure a chave API nas configurações da empresa.';
    _secRenderAI();
    return;
  }

  _secAI.loading = true;
  _secAI.error = null;
  _secRenderAI();

  var ctx = _secBuildCtx();
  var briefing = _secBuildBriefing(ctx);

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      system: 'Você é a Secretária Inteligente da HR Mármores. Responda APENAS em JSON válido, sem markdown, sem texto fora do JSON.',
      messages: [{ role: 'user', content: briefing }]
    })
  })
  .then(function(r) { return r.json(); })
  .then(function(d) {
    var text = (d.content||[]).map(function(i){return i.text||'';}).join('');
    var clean = text.replace(/```json|```/g, '').trim();
    _secAI.data = JSON.parse(clean);
    _secAI.loading = false;
    _secAI.lastUpdate = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    _secAI.error = null;
    _secRenderAI();
    toast('✨ Briefing da IA atualizado!');
  })
  .catch(function(e) {
    _secAI.loading = false;
    _secAI.error = 'Erro ao conectar à IA. Verifique a chave API.';
    _secRenderAI();
    console.error('secFetchAI:', e);
  });
}

// ── Humor → cor ──
function _secHumorColor(humor) {
  var map = {otimo:'#4ade80', bom:'#60a5fa', atencao:'#fb923c', critico:'#f87171'};
  return map[humor] || '#60a5fa';
}

// ── Gauge de pressão SVG ──
function _secGaugeSVG(val) {
  var color = val < 60 ? '#4ade80' : val < 80 ? '#fb923c' : '#f87171';
  var r = 32, circ = 2 * Math.PI * r;
  var dash = (val / 100) * circ;
  return '<svg width="80" height="80" viewBox="0 0 80 80">'
    + '<circle cx="40" cy="40" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7"/>'
    + '<circle cx="40" cy="40" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7"'
    + ' stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '"'
    + ' stroke-linecap="round" transform="rotate(-90 40 40)"/>'
    + '<text x="40" y="45" text-anchor="middle" fill="' + color + '" style="font:bold 15px \'Courier New\',monospace;">' + val + '%</text>'
    + '</svg>';
}

// ── Cards da IA ──
function _secAICards(data) {
  if (!data) return '';
  var cards = [
    {icon:'🎯', key:'fazerAgora',        color:'#60a5fa', label:'Fazer agora'},
    {icon:'🔧', key:'ondeApertar',        color:'#fb923c', label:'Onde apertar'},
    {icon:'💡', key:'oportunidade',       color:'#a78bfa', label:'Oportunidade'},
    {icon:'📊', key:'alertaRitmo',        color:'#34d399', label:'Ritmo'},
    {icon:'💰', key:'conselhoFinanceiro', color:'#fbbf24', label:'Financeiro'},
  ];
  var h = '';
  cards.forEach(function(c) {
    var d = data[c.key];
    if (!d) return;
    h += '<div style="border-left:3px solid ' + c.color + ';background:' + c.color + '0a;border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:8px;">'
      + '<div style="display:flex;align-items:center;gap:7px;margin-bottom:5px;">'
      + '<span style="font-size:16px;">' + c.icon + '</span>'
      + '<span style="color:' + c.color + ';font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">' + escH(d.titulo||c.label) + '</span>'
      + '</div>'
      + '<div style="color:rgba(255,255,255,.75);font-size:13px;line-height:1.5;">' + escH(d.detalhe||'') + '</div>'
      + '</div>';
  });
  return h;
}

// ── Tab segurada ──
var _secActiveTab = 'briefing';

function secTab(tab) {
  _secActiveTab = tab;
  var container = document.getElementById('secAIContainer');
  if (container) _secRenderTabs(container);
}

// ── Render das tabs ──
function _secRenderTabs(container) {
  var ctx = _secBuildCtx();
  var tabs = [
    {id:'briefing', label:'Briefing IA'},
    {id:'contexto', label:'Contexto'},
    {id:'followups', label:'Follow-ups (' + ctx.followUps.length + ')'}
  ];

  var h = '';

  // Tab buttons
  h += '<div style="display:flex;border-bottom:1px solid rgba(255,255,255,.07);margin-bottom:14px;">';
  tabs.forEach(function(t) {
    var on = _secActiveTab === t.id;
    h += '<button onclick="secTab(\'' + t.id + '\')" style="flex:1;background:none;border:none;border-bottom:2px solid ' + (on?'#60a5fa':'transparent') + ';padding:9px 4px;font-size:11px;font-weight:' + (on?'700':'500') + ';color:' + (on?'#fff':'rgba(255,255,255,.35)') + ';cursor:pointer;font-family:inherit;transition:all .2s;">' + t.label + '</button>';
  });
  h += '</div>';

  // ── TAB: BRIEFING ──
  if (_secActiveTab === 'briefing') {
    // Botão gerar / atualizar
    var btnTxt = _secAI.loading ? '⟳ Analisando...' : (_secAI.lastUpdate ? '↺ ' + _secAI.lastUpdate : '✨ Gerar briefing');
    h += '<button onclick="secFetchAI()" ' + (_secAI.loading?'disabled':'') + ' style="width:100%;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px;color:rgba(255,255,255,.7);font-size:12px;font-family:inherit;cursor:pointer;margin-bottom:12px;">' + btnTxt + '</button>';

    if (_secAI.error) {
      h += '<div style="background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.2);border-radius:10px;padding:12px 14px;color:#f87171;font-size:12px;margin-bottom:10px;">⚠️ ' + escH(_secAI.error) + '</div>';
    }

    if (_secAI.loading && !_secAI.data) {
      // Skeleton
      h += '<div style="display:flex;flex-direction:column;gap:10px;">';
      [1,.7,.85,.6,.9].forEach(function(w) {
        h += '<div style="height:50px;border-radius:8px;background:rgba(255,255,255,.04);width:' + Math.round(w*100) + '%;animation:secPulse 1.5s ease-in-out infinite;"></div>';
      });
      h += '</div>';
    } else if (_secAI.data) {
      var hum = _secAI.data.humorGeral;
      var humColor = _secHumorColor(hum);
      var humLabel = {otimo:'Ótimo dia!',bom:'Dia tranquilo',atencao:'Atenção necessária',critico:'Situação crítica'}[hum] || '';
      h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">'
        + '<div style="width:8px;height:8px;border-radius:50%;background:' + humColor + ';box-shadow:0 0 8px ' + humColor + ';"></div>'
        + '<span style="color:' + humColor + ';font-size:12px;font-weight:700;">' + humLabel + '</span>'
        + '</div>';
      h += _secAICards(_secAI.data);
    } else {
      h += '<div style="text-align:center;padding:30px 20px;color:rgba(255,255,255,.3);font-size:13px;">Toque em "Gerar briefing" para o conselho do dia ✨</div>';
    }
  }

  // ── TAB: CONTEXTO ──
  if (_secActiveTab === 'contexto') {
    var pressura = ctx.pressura;
    var pressColor = pressura < 60 ? '#4ade80' : pressura < 80 ? '#fb923c' : '#f87171';

    // Gauge + chips
    h += '<div style="display:flex;gap:12px;align-items:flex-start;margin-bottom:14px;">';
    h += '<div style="display:flex;flex-direction:column;align-items:center;gap:3px;">' + _secGaugeSVG(pressura) + '<div style="color:rgba(255,255,255,.4);font-size:10px;letter-spacing:1px;text-transform:uppercase;">pressão</div></div>';
    h += '<div style="flex:1;display:flex;flex-direction:column;gap:8px;">';
    h += '<div style="display:flex;gap:8px;">';
    h += '<div style="flex:1;background:rgba(251,146,60,.08);border:1px solid rgba(251,146,60,.15);border-radius:10px;padding:10px 12px;">';
    h += '<div style="font-size:18px;">🔨</div><div style="color:#fb923c;font-size:15px;font-weight:700;line-height:1;">' + ctx.emProd.length + '</div><div style="color:rgba(255,255,255,.4);font-size:10px;text-transform:uppercase;">em produção</div></div>';
    h += '<div style="flex:1;background:rgba(74,222,128,.08);border:1px solid rgba(74,222,128,.15);border-radius:10px;padding:10px 12px;">';
    h += '<div style="font-size:18px;">✅</div><div style="color:#4ade80;font-size:15px;font-weight:700;line-height:1;">+' + ctx.podeAceit + '</div><div style="color:rgba(255,255,255,.4);font-size:10px;text-transform:uppercase;">pode aceitar</div></div>';
    h += '</div>';
    h += '<div style="display:flex;gap:8px;">';
    h += '<div style="flex:1;background:rgba(248,113,113,.08);border:1px solid rgba(248,113,113,.15);border-radius:10px;padding:10px 12px;">';
    h += '<div style="font-size:18px;">⚠️</div><div style="color:#f87171;font-size:15px;font-weight:700;line-height:1;">' + ctx.atrasados.length + '</div><div style="color:rgba(255,255,255,.4);font-size:10px;text-transform:uppercase;">atrasados</div></div>';
    h += '<div style="flex:1;background:rgba(96,165,250,.08);border:1px solid rgba(96,165,250,.15);border-radius:10px;padding:10px 12px;">';
    h += '<div style="font-size:18px;">📐</div><div style="color:#60a5fa;font-size:15px;font-weight:700;line-height:1;">' + ctx.visitasHoje.length + '</div><div style="color:rgba(255,255,255,.4);font-size:10px;text-transform:uppercase;">visitas hoje</div></div>';
    h += '</div></div></div>';

    // Radar Financeiro
    var maxF = Math.max(ctx.totPend, ctx.totSaidas, 1);
    h += '<div style="background:rgba(255,255,255,.04);border-radius:10px;padding:14px 16px;margin-bottom:12px;">';
    h += '<div style="color:rgba(255,255,255,.4);font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-bottom:12px;">💵 Radar Financeiro</div>';
    [
      {label:'A receber', val:ctx.totPend, color:'#4ade80'},
      {label:'Compromissos', val:ctx.totSaidas, color:'#f87171'}
    ].forEach(function(item) {
      h += '<div style="margin-bottom:8px;">';
      h += '<div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="color:rgba(255,255,255,.5);font-size:11px;">' + item.label + '</span><span style="color:' + item.color + ';font-size:11px;font-weight:700;font-family:\'Courier New\',monospace;">R$ ' + fm(item.val) + '</span></div>';
      h += '<div style="height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;"><div style="height:100%;background:' + item.color + ';border-radius:2px;width:' + Math.round((item.val/maxF)*100) + '%;"></div></div>';
      h += '</div>';
    });
    var saldoColor = ctx.saldo >= 0 ? '#4ade80' : '#f87171';
    h += '<div style="display:flex;justify-content:space-between;margin-top:8px;padding-top:8px;border-top:1px solid rgba(255,255,255,.06);">';
    h += '<span style="color:rgba(255,255,255,.5);font-size:11px;">Saldo projetado</span>';
    h += '<span style="color:' + saldoColor + ';font-size:13px;font-weight:700;font-family:\'Courier New\',monospace;">' + (ctx.saldo>=0?'+':'') + 'R$ ' + fm(ctx.saldo) + '</span>';
    h += '</div></div>';

    // Entregas críticas
    if (ctx.entrega3d.length) {
      h += '<div style="background:rgba(248,113,113,.05);border:1px solid rgba(248,113,113,.15);border-radius:10px;padding:12px 14px;">';
      h += '<div style="color:rgba(255,255,255,.4);font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-bottom:8px;">⚡ Entregas em 3 dias</div>';
      ctx.entrega3d.forEach(function(j) {
        var diff = dDiff(j.end);
        var dlbl = diff === 0 ? 'HOJE' : diff === 1 ? 'AMANHÃ' : 'em ' + diff + 'd';
        var dc = diff === 0 ? '#f87171' : diff === 1 ? '#fb923c' : '#fbbf24';
        h += '<div style="display:flex;justify-content:space-between;align-items:center;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);">';
        h += '<div><div style="font-size:13px;font-weight:600;color:rgba(255,255,255,.85);">' + escH(j.cli) + '</div><div style="font-size:11px;color:rgba(255,255,255,.35);">' + escH(j.desc) + '</div></div>';
        h += '<div style="background:rgba(248,113,113,.1);color:' + dc + ';border-radius:6px;padding:3px 8px;font-size:11px;font-weight:700;font-family:\'Courier New\',monospace;">' + dlbl + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }
  }

  // ── TAB: FOLLOW-UPS ──
  if (_secActiveTab === 'followups') {
    if (!ctx.followUps.length) {
      h += '<div style="text-align:center;padding:30px 20px;color:rgba(255,255,255,.3);font-size:13px;">✅ Nenhum orçamento pendente de retorno!</div>';
    } else {
      h += '<div style="color:rgba(255,255,255,.4);font-size:12px;margin-bottom:10px;">' + ctx.followUps.length + ' orçamento(s) sem retorno há mais de 5 dias</div>';
      ctx.followUps.forEach(function(q) {
        var dias = Math.abs(dDiff(q.date));
        var waNum = q.tel ? q.tel.replace(/\D/g,'') : '';
        h += '<div style="background:rgba(96,165,250,.05);border:1px solid rgba(96,165,250,.15);border-radius:10px;padding:10px 14px;margin-bottom:8px;display:flex;justify-content:space-between;align-items:center;gap:10px;">';
        h += '<div><div style="color:rgba(255,255,255,.85);font-size:13px;font-weight:600;">' + escH(q.cli) + '</div>';
        h += '<div style="color:rgba(255,255,255,.4);font-size:11px;margin-top:2px;">R$ ' + fm(q.vista||0) + ' · há ' + dias + ' dias sem retorno</div></div>';
        if (waNum) {
          h += '<a href="https://wa.me/55' + waNum + '" target="_blank" style="background:#25D366;color:#fff;border-radius:8px;padding:6px 12px;font-size:11px;font-weight:700;text-decoration:none;white-space:nowrap;">📱 WhatsApp</a>';
        }
        h += '</div>';
      });
      h += '<div style="background:rgba(96,165,250,.06);border:1px solid rgba(96,165,250,.12);border-radius:10px;padding:12px 14px;margin-top:6px;">';
      h += '<div style="font-size:12px;color:rgba(255,255,255,.5);line-height:1.5;">💡 Melhor horário para follow-up: 9h–11h ou 15h–17h.</div>';
      h += '</div>';
    }
  }

  container.innerHTML = h;
}

// ── Render do painel IA na secretária ──
function _secRenderAI() {
  var container = document.getElementById('secAIContainer');
  if (!container) return;
  _secRenderTabs(container);
}

// ── CSS da animação pulse ──
(function() {
  if (document.getElementById('secAIStyle')) return;
  var s = document.createElement('style');
  s.id = 'secAIStyle';
  s.textContent = '@keyframes secPulse{0%,100%{opacity:.3}50%{opacity:.7}}';
  document.head.appendChild(s);
})();

