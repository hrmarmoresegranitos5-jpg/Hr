// ══════════════════════════════════════════════════════════════
// SECRETÁRIA — Módulo completo (REDESIGN 2.0)
// • Briefing diário com prioridades inteligentes
// • Agendamento de visitas de medição
// • Notificações push via browser Notification API
// • Follow-up automático de orçamentos sem retorno
// • Sugestões da IA clicáveis com navegação direta
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
  setInterval(secNotifCheck, 60000);
  setTimeout(secNotifCheck, 3000);
}

function secNotifCheck() {
  if (Notification.permission !== 'granted') return;
  var hoje = td();
  var agora = new Date();
  var hh = agora.getHours();
  var mm = agora.getMinutes();
  var agoraMin = hh * 60 + mm;

  (_getV()).forEach(function(v){
    if(v.status !== 'agendada' || v.date !== hoje) return;
    if(!v.hora) return;
    var p = v.hora.split(':');
    var visitaMin = (+p[0])*60 + (+p[1]);
    var diff = visitaMin - agoraMin;
    if(diff >= 28 && diff <= 32){
      _sendNotif('📐 Visita em 30 minutos!', v.cli + ' — ' + (v.end||'') + ' às ' + v.hora, 'visita_' + v.id);
    }
    if(diff >= -2 && diff <= 2){
      _sendNotif('📐 Hora da visita agora!', v.cli + ' — ' + (v.end||v.hora), 'visita_now_' + v.id);
    }
  });

  if(hh === 8 && mm < 5){
    var chaveHoje = 'notif_daily_' + hoje;
    if(localStorage.getItem(chaveHoje)) return;
    localStorage.setItem(chaveHoje, '1');
    var atrasados = (DB.j||[]).filter(function(j){return !j.done && j.end && dDiff(j.end)<0;});
    if(atrasados.length){
      _sendNotif('⚠️ ' + atrasados.length + ' entrega(s) atrasada(s)', atrasados.map(function(j){return j.cli;}).join(', '), 'atrasados_' + hoje);
    }
    var visitasHoje = (_getV()).filter(function(v){return v.status==='agendada'&&v.date===hoje;});
    if(visitasHoje.length){
      _sendNotif('📅 Você tem ' + visitasHoje.length + ' visita(s) hoje', visitasHoje.map(function(v){return v.hora + ' — ' + v.cli;}).join(' | '), 'visitas_' + hoje);
    }
    var pendentes = (DB.t||[]).filter(function(t){return t.type==='pend' && t.date && t.date < hoje;});
    if(pendentes.length){
      var totPend = pendentes.reduce(function(s,t){return s+(t.value||0);},0);
      _sendNotif('💰 R$ ' + fm(totPend) + ' a receber em atraso', pendentes.length + ' pagamento(s) pendente(s) vencido(s)', 'pend_' + hoje);
    }
  }
}

var _notifSent = {};
function _sendNotif(title, body, key) {
  if (_notifSent[key]) return;
  _notifSent[key] = true;
  try {
    var n = new Notification(title, { body: body, icon: 'icon-192.png', badge: 'icon-192.png', tag: key });
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
    .then(function(d){ _saveBotCfg({ status: d.status, code: d.code || null }); _botUpdateUI(d); })
    .catch(function(){ _botUpdateUI({ status: 'offline' }); });
}

function _botUpdateUI(d) {
  var st = d.status;
  var ind = document.getElementById('botStatusInd');
  var lbl = document.getElementById('botStatusLbl');
  var dot = document.getElementById('botStatusDot');
  var codeArea = document.getElementById('botCodeArea');
  var connectedArea = document.getElementById('botConnectedArea');
  var setupArea = document.getElementById('botSetupArea');
  if (!ind) return;

  var map = {
    connected:    { col: '#4ade80', txt: 'Conectado' },
    connecting:   { col: '#fb923c', txt: 'Conectando...' },
    disconnected: { col: '#f87171', txt: 'Desconectado' },
    offline:      { col: '#6b7280', txt: 'Servidor offline' }
  };
  var s = map[st] || map.disconnected;
  if (dot) { dot.style.background = s.col; dot.style.boxShadow = '0 0 6px ' + s.col; }
  if (lbl) { lbl.textContent = s.txt; lbl.style.color = s.col; }
  if (codeArea) codeArea.style.display = (st === 'connecting' && d.code) ? 'block' : 'none';
  if (connectedArea) connectedArea.style.display = st === 'connected' ? 'block' : 'none';
  if (setupArea) setupArea.style.display = st !== 'connected' ? 'block' : 'none';
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
  if (btnEl) { btnEl.textContent = '⏳ Gerando...'; btnEl.disabled = true; }
  fetch(url + '/bot/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone: cleanPhone }) })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if (btnEl) { btnEl.textContent = '📲 Gerar Código'; btnEl.disabled = false; }
    if (d.error) { toast('❌ ' + d.error); return; }
    _saveBotCfg({ code: d.code });
    _botUpdateUI({ status: d.status, code: d.code });
    botStartPoll();
  })
  .catch(function(e){
    if (btnEl) { btnEl.textContent = '📲 Gerar Código'; btnEl.disabled = false; }
    toast('❌ Servidor não acessível. Verifique a URL.');
  });
}

function botDisconnect() {
  var cfg = _getBotCfg();
  if (!cfg.url) return;
  if (!confirm('Desconectar o bot do WhatsApp?')) return;
  fetch(cfg.url + '/bot/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limparSessao: false }) })
  .then(function(){
    _saveBotCfg({ status: 'disconnected', code: null });
    _botUpdateUI({ status: 'disconnected' });
    toast('Bot desconectado.');
  }).catch(function(){ toast('Erro ao desconectar.'); });
}

function _renderBotPanel() {
  var cfg = _getBotCfg();
  var st  = cfg.status || 'disconnected';
  var statusMap = {
    connected:    { col: '#4ade80', txt: 'Conectado' },
    connecting:   { col: '#fb923c', txt: 'Conectando...' },
    disconnected: { col: '#f87171', txt: 'Desconectado' },
    offline:      { col: '#6b7280', txt: 'Servidor offline' }
  };
  var sm = statusMap[st] || statusMap.disconnected;

  var h = '<div class="sec2-bot-panel">';

  // Header
  h += '<div class="sec2-bot-header">';
  h += '<div class="sec2-bot-icon-wrap"><span style="font-size:20px;">📱</span></div>';
  h += '<div class="sec2-bot-info"><div class="sec2-bot-title">WhatsApp Bot</div><div class="sec2-bot-sub">Assistente automático para clientes</div></div>';
  h += '<div class="sec2-bot-status-pill" style="background:' + sm.col + '18;border:1px solid ' + sm.col + '40;">';
  h += '<div id="botStatusDot" class="sec2-bot-dot" style="background:' + sm.col + ';box-shadow:0 0 6px ' + sm.col + ';"></div>';
  h += '<span id="botStatusLbl" style="color:' + sm.col + ';font-size:11px;font-weight:700;">' + sm.txt + '</span>';
  h += '</div>';
  h += '</div>';

  // Setup Area
  h += '<div id="botSetupArea" style="' + (st === 'connected' ? 'display:none;' : '') + '">';
  h += '<div class="sec2-bot-fields">';
  h += '<div class="sec2-bot-field"><label class="sec2-bot-label">🌐 URL do Servidor</label>';
  h += '<input id="botServerUrl" class="sec2-bot-input" type="url" placeholder="https://seuservidor.com" value="' + escH(cfg.url||'') + '"/></div>';
  h += '<div class="sec2-bot-field"><label class="sec2-bot-label">📱 Número do Bot</label>';
  h += '<input id="botPhone" class="sec2-bot-input" type="tel" placeholder="5574999990000" value="' + escH(cfg.phone||'') + '"/>';
  h += '<div class="sec2-bot-hint">Ex: 5574999990000 — sem espaços ou símbolos</div></div>';
  h += '</div>';
  h += '<button id="botConnectBtn" class="sec2-bot-connect-btn" onclick="botConnect()">📲 Gerar Código de Pareamento</button>';
  h += '</div>';

  // Code Area
  h += '<div id="botCodeArea" style="' + (st === 'connecting' && cfg.code ? '' : 'display:none;') + '">';
  h += '<div class="sec2-bot-code-wrap">';
  h += '<div class="sec2-bot-code-lbl">Código de pareamento — insira no WhatsApp</div>';
  h += '<div id="botPairCode" class="sec2-bot-code">' + (cfg.code||'— — — —') + '</div>';
  h += '<div class="sec2-bot-steps">';
  ['Abra o WhatsApp no celular','Menu → Aparelhos conectados','Conectar aparelho','Conectar com número de telefone','Digite o código acima'].forEach(function(s,i){
    h += '<div class="sec2-bot-step"><span class="sec2-bot-step-n">' + (i+1) + '</span><span>' + s + '</span></div>';
  });
  h += '</div>';
  h += '<div class="sec2-bot-code-warn">⏳ Código expira em ~60 segundos</div>';
  h += '</div></div>';

  // Connected Area
  h += '<div id="botConnectedArea" style="' + (st === 'connected' ? '' : 'display:none;') + '">';
  h += '<div class="sec2-bot-connected">';
  h += '<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:22px;">✅</span>';
  h += '<div><div style="color:#4ade80;font-weight:700;font-size:13px;">Bot ativo e respondendo</div>';
  h += '<div style="color:rgba(255,255,255,.4);font-size:11px;">+' + escH(cfg.phone||'—') + '</div></div></div>';
  h += '<button class="sec2-bot-disconnect" onclick="botDisconnect()">Desconectar</button>';
  h += '</div></div>';

  h += '<span id="botStatusInd" style="display:none;" data-status="' + escH(st) + '"></span>';
  h += '</div>';
  return h;
}

// ─────────────────────────────────────────────
// RENDER PRINCIPAL
// ─────────────────────────────────────────────
function renderSecretaria() {
  var el = document.getElementById('secBody');
  if (!el) return;
  try {
    _injectSec2Styles();
    _renderSecretariaInner(el);
    setTimeout(function() { _secRenderAI(); }, 0);
  } catch(err) {
    el.innerHTML = '<div style="padding:30px 18px;color:var(--t3);font-size:.78rem;">⚠️ Erro ao carregar secretária.<br><small>' + escH(String(err)) + '</small></div>';
    console.error('renderSecretaria:', err);
  }
}

function _renderSecretariaInner(el) {
  var hoje = td();
  var agora = new Date();
  var horaAtual = agora.getHours();
  var saudacao = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';
  var nomeEmp = (CFG && CFG.emp && CFG.emp.nome) ? CFG.emp.nome.split(' ')[0] : 'chefe';

  var atrasados   = (DB.j||[]).filter(function(j){return !j.done&&j.end&&dDiff(j.end)<0;});
  var urgentes    = (DB.j||[]).filter(function(j){return !j.done&&j.urgente;});
  var emProd      = (DB.j||[]).filter(function(j){return !j.done;});
  var visitasHoje = (_getV()).filter(function(v){return v.status==='agendada'&&v.date===hoje;});
  var visitasAmanha = (_getV()).filter(function(v){return v.status==='agendada'&&v.date===addD(hoje,1);});
  var pendentes   = (DB.t||[]).filter(function(t){return t.type==='pend';});
  var pendVenc    = pendentes.filter(function(t){return t.date && t.date < hoje;});
  var totPend     = pendentes.reduce(function(s,t){return s+(t.value||0);},0);
  var followUps   = _secFollowUps(hoje);
  var totalTarefas = atrasados.length + urgentes.length + pendVenc.length + followUps.length + visitasHoje.length;

  var h = '';

  // ── HERO ──
  h += '<div class="sec2-hero">';
  h += '<div class="sec2-hero-inner">';
  h += '<div class="sec2-saud">' + saudacao + '! 👋</div>';
  h += '<div class="sec2-nome">' + escH(nomeEmp) + '</div>';
  if (totalTarefas > 0) {
    h += '<div class="sec2-alert-badge"><span class="sec2-alert-num">' + totalTarefas + '</span> item' + (totalTarefas > 1 ? 's' : '') + ' precisam de atenção</div>';
  } else {
    h += '<div class="sec2-ok-badge">✅ Tudo em ordem!</div>';
  }
  h += '</div>';
  h += '</div>';

  // ── CHIPS ──
  h += '<div class="sec2-chips">';
  h += _sec2Chip(emProd.length, '🔨', 'em produção', '#fb923c');
  h += _sec2Chip(visitasHoje.length, '📐', 'visitas hoje', '#60a5fa');
  h += _sec2Chip(totPend > 0 ? 'R$&nbsp;' + _fmShort(totPend) : '0', '💰', 'a receber', '#4ade80');
  h += _sec2Chip(atrasados.length, '⚠️', 'atrasados', '#f87171');
  h += '</div>';

  // ── TIMELINE DO DIA ──
  h += _secTimeline(hoje, agora);

  // ── AI CONTAINER ──
  h += '<div class="sec2-ai-container" id="secAIContainer">';
  h += '<div style="color:rgba(255,255,255,.3);font-size:12px;text-align:center;padding:16px 0;">✨ Carregando análise IA...</div>';
  h += '</div>';

  // ── BOTÃO NOVA VISITA ──
  h += '<button class="sec2-nova-visita" onclick="openVisitaMd(null)">📐 Agendar Visita de Medição</button>';

  // ── TAREFAS URGENTES ──
  if (atrasados.length || urgentes.length || pendVenc.length || followUps.length) {
    h += '<div class="sec2-section-header"><span class="sec2-section-dot red"></span>Ação imediata</div>';
    h += '<div class="sec2-task-list">';
    atrasados.forEach(function(j){
      var d = Math.abs(dDiff(j.end));
      h += _sec2Task('⚠️', escH(j.cli) + ' — ' + escH(j.desc), d + (d===1?' dia':' dias') + ' atrasado', '#f87171', 'data-editjob="'+j.id+'"', 'Ver serviço');
    });
    pendVenc.forEach(function(t){
      h += _sec2Task('💰', escH(t.desc), 'R$ '+fm(t.value||0)+' · venceu '+fd(t.date), '#fbbf24', 'onclick="go(4);finTab(\'areceber\')"', 'Ir para Finanças');
    });
    urgentes.filter(function(j){return !atrasados.find(function(a){return a.id===j.id;});}).forEach(function(j){
      h += _sec2Task('🚨', escH(j.cli) + ' — ' + escH(j.desc), j.urgMotivo||'Urgente', '#fb923c', 'data-editjob="'+j.id+'"', 'Ver serviço');
    });
    followUps.forEach(function(q){
      h += _sec2Task('📞', 'Follow-up: ' + escH(q.cli), 'Orçamento '+fd(q.date)+' — R$ '+fm(q.vista)+' — sem retorno', '#a78bfa', 'onclick="go(7)"', 'Ver histórico');
    });
    h += '</div>';
  }

  // ── VISITAS HOJE ──
  if (visitasHoje.length) {
    h += '<div class="sec2-section-header"><span class="sec2-section-dot blue"></span>Visitas de hoje</div>';
    h += '<div class="sec2-task-list">';
    visitasHoje.sort(function(a,b){return (a.hora||'').localeCompare(b.hora||'');}).forEach(function(v){
      h += _sec2VisitaCard(v, hoje);
    });
    h += '</div>';
  }

  // ── VISITAS AMANHÃ ──
  if (visitasAmanha.length) {
    h += '<div class="sec2-section-header"><span class="sec2-section-dot purple"></span>Amanhã</div>';
    h += '<div class="sec2-task-list">';
    visitasAmanha.forEach(function(v){ h += _sec2VisitaCard(v, hoje); });
    h += '</div>';
  }

  // ── PRÓXIMAS VISITAS ──
  var proxVisitas = (_getV())
    .filter(function(v){return v.status==='agendada'&&v.date>addD(hoje,1);})
    .sort(function(a,b){return a.date.localeCompare(b.date)||(a.hora||'').localeCompare(b.hora||'');})
    .slice(0, 5);
  if (proxVisitas.length) {
    h += '<div class="sec2-section-header"><span class="sec2-section-dot green"></span>Próximas visitas</div>';
    h += '<div class="sec2-task-list">';
    proxVisitas.forEach(function(v){ h += _sec2VisitaCard(v, hoje); });
    h += '</div>';
  }

  // ── REALIZADAS RECENTES ──
  var realizadas = (_getV())
    .filter(function(v){return v.status==='realizada';})
    .sort(function(a,b){return b.date.localeCompare(a.date);})
    .slice(0, 3);
  if (realizadas.length) {
    h += '<div class="sec2-section-header"><span class="sec2-section-dot green"></span>Realizadas recentemente</div>';
    h += '<div class="sec2-task-list">';
    realizadas.forEach(function(v){ h += _sec2VisitaCard(v, hoje); });
    h += '</div>';
  }

  if (!totalTarefas && !visitasHoje.length && !proxVisitas.length) {
    h += '<div class="sec2-empty"><div style="font-size:2.5rem;margin-bottom:10px;">🤝</div><div>Nada urgente. Aproveite para novos orçamentos!</div></div>';
  }

  h += '<div style="height:24px;"></div>';
  el.innerHTML = h;
}

// ─────────────────────────────────────────────
// HELPERS DE RENDER 2.0
// ─────────────────────────────────────────────
function _sec2Chip(val, icon, label, color) {
  return '<div class="sec2-chip" style="border-color:' + color + '22;">'
    + '<div class="sec2-chip-icon" style="color:' + color + ';">' + icon + '</div>'
    + '<div class="sec2-chip-val" style="color:' + color + ';">' + val + '</div>'
    + '<div class="sec2-chip-lbl">' + label + '</div>'
    + '</div>';
}

function _sec2Task(icon, title, sub, color, action, btnLbl) {
  return '<div class="sec2-task" style="border-left-color:' + color + ';">'
    + '<div class="sec2-task-icon" style="color:' + color + ';">' + icon + '</div>'
    + '<div class="sec2-task-body">'
    + '<div class="sec2-task-title">' + title + '</div>'
    + '<div class="sec2-task-sub" style="color:' + color + ';">' + sub + '</div>'
    + '</div>'
    + '<button class="sec2-task-btn" style="color:' + color + ';border-color:' + color + '33;" ' + action + '>' + btnLbl + '</button>'
    + '</div>';
}

function _sec2VisitaCard(v, hoje) {
  var statusMap = {agendada:'📐',realizada:'✅',cancelada:'❌'};
  var icon = statusMap[v.status] || '📐';
  var isHoje = v.date === hoje;
  var dateLabel = isHoje ? 'Hoje' : (v.date === addD(hoje,1) ? 'Amanhã' : fd(v.date));
  var hora = v.hora || '';
  var statusLabel = v.status === 'agendada'
    ? (isHoje ? '<span style="color:#60a5fa;font-weight:700;">HOJE</span>' : dateLabel)
    : v.status.toUpperCase();

  return '<div class="sec2-visita" id="sv_' + v.id + '">'
    + '<div class="sec2-vis-head">'
    + '<div class="sec2-vis-icon">' + icon + '</div>'
    + '<div class="sec2-vis-info">'
    + '<div class="sec2-vis-cli">' + escH(v.cli) + '</div>'
    + '<div class="sec2-vis-meta">' + (hora ? '🕐 ' + hora + ' · ' : '') + '📅 ' + statusLabel + (v.end ? ' · 📍 ' + escH(v.end) : '') + '</div>'
    + (v.obs ? '<div class="sec2-vis-obs">' + escH(v.obs) + '</div>' : '')
    + '</div></div>'
    + (v.status === 'agendada'
      ? '<div class="sec2-vis-btns">'
        + '<button class="sec2-vis-btn grn" onclick="togVisitaStatus(' + v.id + ',\'realizada\')">✓ Realizada</button>'
        + '<button class="sec2-vis-btn org" onclick="openVisitaMd(' + v.id + ')">✏️</button>'
        + '<button class="sec2-vis-btn red" onclick="togVisitaStatus(' + v.id + ',\'cancelada\')">✕</button>'
        + (v.tel ? '<button class="sec2-vis-btn wha" onclick="window.open(\'https://wa.me/55\'+\'' + v.tel.replace(/\D/g,'') + '\')">📱</button>' : '')
        + '</div>'
      : '<div class="sec2-vis-btns">'
        + '<button class="sec2-vis-btn" onclick="togVisitaStatus(' + v.id + ',\'agendada\')">↩ Reagendar</button>'
        + '<button class="sec2-vis-btn red" onclick="delVisita(' + v.id + ')">✕</button>'
        + '</div>')
    + '</div>';
}

function _secFollowUps(hoje) {
  var cutoff = addD(hoje, -5);
  var cutoff2 = addD(hoje, -30);
  return (DB.q||[]).filter(function(q){
    if (!q.date || q.date > cutoff || q.date < cutoff2) return false;
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
    document.getElementById('vCli').value  = v.cli  || '';
    document.getElementById('vTel').value  = v.tel  || '';
    document.getElementById('vEnd').value  = v.end  || '';
    document.getElementById('vData').value = v.date || td();
    document.getElementById('vHora').value = v.hora || '';
    document.getElementById('vObs').value  = v.obs  || '';
  } else {
    document.getElementById('vCli').value  = '';
    document.getElementById('vTel').value  = '';
    document.getElementById('vEnd').value  = '';
    document.getElementById('vData').value = td();
    document.getElementById('vHora').value = '';
    document.getElementById('vObs').value  = '';
    // Usar _pendVisita (botão do resultado do orçamento) ou pendQ
    var src = (typeof window._pendVisita !== 'undefined' && window._pendVisita)
      ? window._pendVisita
      : (typeof pendQ !== 'undefined' && pendQ ? pendQ : null);
    if (src && src.cli) {
      document.getElementById('vCli').value = src.cli;
      if (src.tel) document.getElementById('vTel').value = src.tel;
      if (src.end) document.getElementById('vEnd').value = src.end;
      window._pendVisita = null; // limpar após uso
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
  toast('✓ Visita marcada como ' + status + '!');
}

function delVisita(id) {
  if (!confirm('Excluir esta visita?')) return;
  DB.v = (_getV()).filter(function(x){return x.id!==id;});
  _saveV();
  renderSecretaria();
  toast('Visita excluída.');
}

function secNotifDotUpdate() {
  var dot = document.getElementById('secNotifDot');
  if (!dot) return;
  var hoje = td();
  var atrasados = (DB.j||[]).filter(function(j){return !j.done&&j.end&&dDiff(j.end)<0;}).length;
  var visitasHoje = (_getV()).filter(function(v){return v.status==='agendada'&&v.date===hoje;}).length;
  var pendVenc = (DB.t||[]).filter(function(t){return t.type==='pend'&&t.date&&t.date<hoje;}).length;
  dot.classList.toggle('on', atrasados>0||visitasHoje>0||pendVenc>0);
}

// ══════════════════════════════════════════════════════════════
// SECRETÁRIA INTELIGENTE — IA + SUGESTÕES CLICÁVEIS
// ══════════════════════════════════════════════════════════════

var _secAI = { data: null, loading: false, lastUpdate: null, error: null };

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
    hoje, hh, nome, saudacao, equipe, capacidade, pressura, podeAceit,
    atrasados, urgentes, emProd, entrega3d, pendentes, pendVenc, pendSem,
    totPend, totPendVenc, totSemana, totSaidas, saldo: totPend - totSaidas,
    followUps, visitasHoje
  };
}

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

  return 'HR Mármores — dados de hoje (' + ctx.hoje + ').\n'
    + 'Equipe: ' + ctx.equipe + ' | Capacidade: ' + ctx.capacidade + ' | Pressão: ' + ctx.pressura + '% | Pode aceitar: ' + ctx.podeAceit + ' novos\n\n'
    + 'SERVIÇOS EM PRODUÇÃO (' + ctx.emProd.length + '):\n' + linhasServicos + '\n\n'
    + 'FINANÇAS:\n'
    + '- A receber: R$ ' + fm(ctx.totPend) + ' (vencido: R$ ' + fm(ctx.totPendVenc) + ')\n'
    + '- Semana: R$ ' + fm(ctx.totSemana) + ' | Compromissos 30d: R$ ' + fm(ctx.totSaidas) + '\n'
    + '- Saldo projetado: R$ ' + fm(ctx.saldo) + ' ' + (ctx.saldo >= 0 ? '(positivo)' : '(NEGATIVO)') + '\n\n'
    + 'FOLLOW-UPS (' + ctx.followUps.length + '):\n' + linhasFollowUp + '\n\n'
    + 'VISITAS HOJE (' + ctx.visitasHoje.length + '):\n' + linhasVisitas + '\n\n'
    + 'Responda SOMENTE JSON sem markdown:\n'
    + '{"fazerAgora":{"titulo":"string","detalhe":"1-2 frases diretas com nomes/valores reais","acao":"producao|financas|agenda|historico|orcamento|config|contratos"},'
    + '"ondeApertar":{"titulo":"string","detalhe":"1-2 frases diretas com nomes/valores reais","acao":"producao|financas|agenda|historico|orcamento|config|contratos"},'
    + '"oportunidade":{"titulo":"string","detalhe":"1-2 frases diretas com nomes/valores reais","acao":"producao|financas|agenda|historico|orcamento|config|contratos"},'
    + '"alertaRitmo":{"titulo":"string","detalhe":"1-2 frases diretas com nomes/valores reais","acao":"producao|financas|agenda|historico|orcamento|config|contratos"},'
    + '"conselhoFinanceiro":{"titulo":"string","detalhe":"1-2 frases diretas com nomes/valores reais","acao":"producao|financas|agenda|historico|orcamento|config|contratos"},'
    + '"humorGeral":"otimo|bom|atencao|critico"}';
}

// ── Navega para a seção correta baseado na ação da IA ──
function _secNavToAction(acao) {
  var map = {
    producao:   0,
    orcamento:  1,
    historico:  7,
    contratos:  3,
    agenda:     function(){ openVisitaMd(null); },
    financas:   4,
    config:     6
  };
  var target = map[acao];
  if (typeof target === 'function') {
    target();
  } else if (typeof target === 'number') {
    go(target);
  }
}

function secFetchAI() {
  var key = CFG && CFG.emp && CFG.emp.apiKey;
  if (!key) { _secAI.error = 'no_key'; _secRenderAI(); return; }
  _secAI.loading = true;
  _secAI.error = null;
  _secRenderAI();
  var ctx = _secBuildCtx();
  var briefing = _secBuildBriefing(ctx);
  var controller = window.AbortController ? new AbortController() : null;
  var timeoutId = controller ? setTimeout(function() { controller.abort(); }, 20000) : null;
  fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal: controller ? controller.signal : undefined,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 800,
      messages: [
        { role: 'system', content: 'Você é a Secretária Inteligente da HR Mármores. Responda SOMENTE em JSON válido, sem markdown, sem texto fora do JSON.' },
        { role: 'user', content: briefing }
      ]
    })
  })
  .then(function(r) {
    if (timeoutId) clearTimeout(timeoutId);
    if (!r.ok) {
      return r.json().then(function(errBody) {
        var msg = (errBody.error && errBody.error.message) || ('HTTP ' + r.status);
        if (r.status === 401) throw new Error('auth:' + msg);
        if (r.status === 429) throw new Error('rate:' + msg);
        throw new Error(msg);
      });
    }
    return r.json();
  })
  .then(function(d) {
    if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
    var text = (d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content)||'';
    var clean = text.replace(/```json[\s\S]*?```|```/g, '').trim();
    var match = clean.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('parse: resposta não contém JSON');
    _secAI.data = JSON.parse(match[0]);
    _secAI.loading = false;
    _secAI.lastUpdate = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
    _secAI.error = null;
    _secRenderAI();
    toast('✨ Briefing da IA atualizado!');
  })
  .catch(function(e) {
    if (timeoutId) clearTimeout(timeoutId);
    _secAI.loading = false;
    var msg = e.message || '';
    if (e.name === 'AbortError' || msg.indexOf('abort') >= 0) _secAI.error = 'timeout';
    else if (msg.indexOf('auth:') === 0) _secAI.error = 'auth';
    else if (msg.indexOf('rate:') === 0) _secAI.error = 'rate';
    else if (msg.indexOf('parse:') === 0) _secAI.error = 'parse';
    else _secAI.error = 'generic';
    _secRenderAI();
    console.error('secFetchAI:', e);
  });
}

function _secHumorColor(humor) {
  return {otimo:'#4ade80', bom:'#60a5fa', atencao:'#fb923c', critico:'#f87171'}[humor] || '#60a5fa';
}

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

// ── Cards da IA — CLICÁVEIS ──
function _secAICards(data) {
  if (!data) return '';
  var cards = [
    {icon:'🎯', key:'fazerAgora',        color:'#60a5fa', label:'Fazer agora'},
    {icon:'🔧', key:'ondeApertar',       color:'#fb923c', label:'Onde apertar'},
    {icon:'💡', key:'oportunidade',      color:'#a78bfa', label:'Oportunidade'},
    {icon:'📊', key:'alertaRitmo',       color:'#34d399', label:'Ritmo'},
    {icon:'💰', key:'conselhoFinanceiro',color:'#fbbf24', label:'Financeiro'},
  ];
  var actionLabels = {
    producao:'Ver Produção', financas:'Ir às Finanças', agenda:'Agendar Visita',
    historico:'Ver Histórico', orcamento:'Fazer Orçamento', config:'Configurações', contratos:'Ver Contratos'
  };
  var h = '<div class="sec2-ai-cards">';
  cards.forEach(function(c) {
    var d = data[c.key];
    if (!d) return;
    var acao = d.acao || null;
    var btnLabel = acao ? (actionLabels[acao] || 'Ver mais') : null;
    var onclickAttr = acao ? ' onclick="_secNavToAction(\'' + acao + '\')" role="button"' : '';
    var clickable = acao ? ' sec2-ai-card-clickable' : '';

    h += '<div class="sec2-ai-card' + clickable + '"' + onclickAttr + ' style="border-left-color:' + c.color + ';background:' + c.color + '0d;">';
    h += '<div class="sec2-ai-card-top">';
    h += '<div class="sec2-ai-card-label"><span style="font-size:15px;">' + c.icon + '</span><span style="color:' + c.color + ';">' + escH(d.titulo || c.label) + '</span></div>';
    if (btnLabel) {
      h += '<div class="sec2-ai-card-action" style="color:' + c.color + ';border-color:' + c.color + '33;">' + btnLabel + ' →</div>';
    }
    h += '</div>';
    h += '<div class="sec2-ai-card-detail">' + escH(d.detalhe || '') + '</div>';
    h += '</div>';
  });
  h += '</div>';
  return h;
}

var _secActiveTab = 'briefing';

function secTab(tab) {
  _secActiveTab = tab;
  var container = document.getElementById('secAIContainer');
  if (container) _secRenderTabs(container);
}

function _secRenderTabs(container) {
  var ctx = _secBuildCtx();
  var tabs = [
    {id:'briefing',  label:'✨ Briefing IA'},
    {id:'contexto',  label:'📊 Contexto'},
    {id:'followups', label:'📞 Follow-ups (' + ctx.followUps.length + ')'}
  ];

  var h = '';

  // Tab bar
  h += '<div class="sec2-tab-bar">';
  tabs.forEach(function(t) {
    var on = _secActiveTab === t.id;
    h += '<button onclick="secTab(\'' + t.id + '\')" class="sec2-tab-btn' + (on?' active':'') + '">' + t.label + '</button>';
  });
  h += '</div>';

  // ── TAB: BRIEFING ──
  if (_secActiveTab === 'briefing') {
    var btnTxt = _secAI.loading ? '⟳ Analisando...' : (_secAI.lastUpdate ? '↺ Atualizar · ' + _secAI.lastUpdate : '✨ Gerar briefing do dia');
    h += '<button onclick="secFetchAI()" ' + (_secAI.loading?'disabled':'') + ' class="sec2-briefing-btn">' + btnTxt + '</button>';

    if (_secAI.error) {
      var errMsgs = {
        'no_key': '🔑 Chave Groq não configurada. <a href="#" onclick="go(6);return false;" style="color:#60a5fa;">Configure nas Configurações</a>.',
        'auth': '🔑 Chave inválida ou expirada. <a href="#" onclick="go(6);return false;" style="color:#60a5fa;">Verifique nas Configurações</a>.',
        'rate': '⏳ Limite de requisições atingido. Aguarde e tente novamente.',
        'timeout': '⌛ A IA demorou demais. Tente novamente.',
        'parse': '⚠️ Formato inesperado. Tente novamente.',
        'generic': '⚠️ Erro de conexão. Verifique sua internet e a chave API.'
      };
      h += '<div class="sec2-error-box">' + (errMsgs[_secAI.error] || '⚠️ ' + escH(_secAI.error)) + '</div>';
    }

    if (_secAI.loading && !_secAI.data) {
      h += '<div class="sec2-skeletons">';
      [1,.7,.85,.6].forEach(function(w){
        h += '<div class="sec2-skeleton" style="width:' + Math.round(w*100) + '%;"></div>';
      });
      h += '</div>';
    } else if (_secAI.data) {
      var hum = _secAI.data.humorGeral;
      var humColor = _secHumorColor(hum);
      var humLabel = {otimo:'Ótimo dia!',bom:'Dia tranquilo',atencao:'Atenção necessária',critico:'Situação crítica'}[hum] || '';
      h += '<div class="sec2-humor-badge" style="background:' + humColor + '15;border-color:' + humColor + '30;">';
      h += '<div class="sec2-humor-dot" style="background:' + humColor + ';box-shadow:0 0 8px ' + humColor + ';"></div>';
      h += '<span style="color:' + humColor + ';font-size:12px;font-weight:700;">' + humLabel + '</span>';
      h += '</div>';
      h += _secAICards(_secAI.data);
    } else {
      h += '<div class="sec2-empty-briefing">Toque em "Gerar briefing" para receber o conselho do dia ✨</div>';
    }
  }

  // ── TAB: CONTEXTO ──
  if (_secActiveTab === 'contexto') {
    var pressura = ctx.pressura;
    h += '<div class="sec2-ctx-top">';
    h += '<div class="sec2-gauge-wrap">' + _secGaugeSVG(pressura) + '<div class="sec2-gauge-lbl">Pressão</div></div>';
    h += '<div class="sec2-ctx-grid">';
    [
      {icon:'🔨', val:ctx.emProd.length,     label:'Em produção', col:'#fb923c'},
      {icon:'✅', val:'+' + ctx.podeAceit,   label:'Pode aceitar', col:'#4ade80'},
      {icon:'⚠️', val:ctx.atrasados.length,  label:'Atrasados',   col:'#f87171'},
      {icon:'📐', val:ctx.visitasHoje.length, label:'Visitas hoje', col:'#60a5fa'},
    ].forEach(function(item){
      h += '<div class="sec2-ctx-card" style="border-color:' + item.col + '22;">';
      h += '<div style="font-size:18px;">' + item.icon + '</div>';
      h += '<div style="color:' + item.col + ';font-size:16px;font-weight:800;line-height:1;">' + item.val + '</div>';
      h += '<div class="sec2-ctx-card-lbl">' + item.label + '</div>';
      h += '</div>';
    });
    h += '</div></div>';

    // Radar Financeiro
    var maxF = Math.max(ctx.totPend, ctx.totSaidas, 1);
    h += '<div class="sec2-radar">';
    h += '<div class="sec2-radar-title">💵 Radar Financeiro</div>';
    [{label:'A receber', val:ctx.totPend, color:'#4ade80'},{label:'Compromissos', val:ctx.totSaidas, color:'#f87171'}].forEach(function(item){
      h += '<div class="sec2-radar-row">';
      h += '<div class="sec2-radar-meta"><span class="sec2-radar-lbl">' + item.label + '</span><span style="color:' + item.color + ';font-weight:700;font-family:\'Courier New\',monospace;font-size:12px;">R$ ' + fm(item.val) + '</span></div>';
      h += '<div class="sec2-radar-bar-bg"><div class="sec2-radar-bar-fill" style="background:' + item.color + ';width:' + Math.round((item.val/maxF)*100) + '%;"></div></div>';
      h += '</div>';
    });
    var saldoColor = ctx.saldo >= 0 ? '#4ade80' : '#f87171';
    h += '<div class="sec2-radar-saldo"><span style="color:rgba(255,255,255,.5);font-size:11px;">Saldo projetado</span><span style="color:' + saldoColor + ';font-size:14px;font-weight:800;font-family:\'Courier New\',monospace;">' + (ctx.saldo>=0?'+':'') + 'R$ ' + fm(ctx.saldo) + '</span></div>';
    h += '</div>';

    if (ctx.entrega3d.length) {
      h += '<div class="sec2-entregas">';
      h += '<div class="sec2-entregas-title">⚡ Entregas críticas (3 dias)</div>';
      ctx.entrega3d.forEach(function(j) {
        var diff = dDiff(j.end);
        var dlbl = diff === 0 ? 'HOJE' : diff === 1 ? 'AMANHÃ' : 'em ' + diff + 'd';
        var dc = diff === 0 ? '#f87171' : diff === 1 ? '#fb923c' : '#fbbf24';
        h += '<div class="sec2-entrega-row">';
        h += '<div><div class="sec2-entrega-cli">' + escH(j.cli) + '</div><div class="sec2-entrega-desc">' + escH(j.desc) + '</div></div>';
        h += '<div class="sec2-entrega-badge" style="background:' + dc + '18;color:' + dc + ';">' + dlbl + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }
  }

  // ── TAB: FOLLOW-UPS ──
  if (_secActiveTab === 'followups') {
    if (!ctx.followUps.length) {
      h += '<div class="sec2-empty-briefing">✅ Nenhum orçamento pendente de retorno!</div>';
    } else {
      h += '<div class="sec2-fu-count">' + ctx.followUps.length + ' orçamento(s) sem retorno há mais de 5 dias</div>';
      ctx.followUps.forEach(function(q) {
        var dias = Math.abs(dDiff(q.date));
        var waNum = q.tel ? q.tel.replace(/\D/g,'') : '';
        h += '<div class="sec2-fu-card">';
        h += '<div>';
        h += '<div class="sec2-fu-cli">' + escH(q.cli) + '</div>';
        h += '<div class="sec2-fu-meta">R$ ' + fm(q.vista||0) + ' · há ' + dias + ' dias sem retorno</div>';
        h += '</div>';
        h += '<div class="sec2-fu-actions">';
        h += '<button class="sec2-fu-btn hist" onclick="go(7)">Ver histórico</button>';
        if (waNum) h += '<a href="https://wa.me/55' + waNum + '" target="_blank" class="sec2-fu-btn wa">📱 WhatsApp</a>';
        h += '</div>';
        h += '</div>';
      });
      h += '<div class="sec2-fu-tip">💡 Melhor horário para follow-up: 9h–11h ou 15h–17h.</div>';
    }
  }

  container.innerHTML = h;
}

function _secRenderAI() {
  var container = document.getElementById('secAIContainer');
  if (!container) return;
  _secRenderTabs(container);
}

// ─────────────────────────────────────────────
// ESTILOS — Injetados uma única vez
// ─────────────────────────────────────────────
function _injectSec2Styles() {
  if (document.getElementById('sec2Style')) return;
  var s = document.createElement('style');
  s.id = 'sec2Style';
  s.textContent = `
    @keyframes sec2Pulse { 0%,100%{opacity:.25} 50%{opacity:.6} }
    @keyframes sec2FadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }

    /* ── BOT PANEL ── */
    .sec2-bot-panel {
      background: linear-gradient(135deg, rgba(30,30,40,.95) 0%, rgba(20,20,30,.98) 100%);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 18px;
      padding: 16px;
      margin-bottom: 14px;
      box-shadow: 0 4px 20px rgba(0,0,0,.3);
    }
    .sec2-bot-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 14px;
    }
    .sec2-bot-icon-wrap {
      width: 42px; height: 42px;
      background: rgba(255,255,255,.06);
      border-radius: 12px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .sec2-bot-info { flex: 1; min-width: 0; }
    .sec2-bot-title { font-size: 14px; font-weight: 700; color: rgba(255,255,255,.92); }
    .sec2-bot-sub { font-size: 11px; color: rgba(255,255,255,.4); margin-top: 1px; }
    .sec2-bot-status-pill {
      display: flex; align-items: center; gap: 6px;
      border-radius: 20px; padding: 5px 10px; flex-shrink: 0;
    }
    .sec2-bot-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .sec2-bot-fields { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
    .sec2-bot-field { display: flex; flex-direction: column; gap: 4px; }
    .sec2-bot-label { font-size: 10px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; color: rgba(255,255,255,.4); }
    .sec2-bot-input {
      background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
      border-radius: 10px; padding: 9px 12px; color: rgba(255,255,255,.85);
      font-size: 13px; font-family: inherit; outline: none; transition: border .2s;
    }
    .sec2-bot-input:focus { border-color: rgba(96,165,250,.5); background: rgba(96,165,250,.05); }
    .sec2-bot-hint { font-size: 10px; color: rgba(255,255,255,.3); }
    .sec2-bot-connect-btn {
      width: 100%; background: linear-gradient(135deg, #2563eb, #1d4ed8);
      border: none; border-radius: 12px; padding: 11px;
      color: #fff; font-size: 13px; font-weight: 700; font-family: inherit;
      cursor: pointer; transition: opacity .2s;
    }
    .sec2-bot-connect-btn:active { opacity: .8; }
    .sec2-bot-code-wrap { background: rgba(255,255,255,.04); border-radius: 12px; padding: 14px; }
    .sec2-bot-code-lbl { font-size: 11px; color: rgba(255,255,255,.4); margin-bottom: 8px; text-align: center; }
    .sec2-bot-code {
      font-family: 'Courier New', monospace; font-size: 28px; font-weight: 900;
      letter-spacing: 8px; color: #60a5fa; text-align: center;
      padding: 12px; background: rgba(96,165,250,.08); border-radius: 10px;
      border: 1px solid rgba(96,165,250,.2); margin-bottom: 12px;
    }
    .sec2-bot-steps { display: flex; flex-direction: column; gap: 6px; margin-bottom: 10px; }
    .sec2-bot-step { display: flex; align-items: center; gap: 8px; font-size: 12px; color: rgba(255,255,255,.6); }
    .sec2-bot-step-n {
      width: 20px; height: 20px; border-radius: 50%; background: rgba(96,165,250,.15);
      color: #60a5fa; font-size: 10px; font-weight: 700; display: flex;
      align-items: center; justify-content: center; flex-shrink: 0;
    }
    .sec2-bot-code-warn { font-size: 10px; color: rgba(251,191,36,.6); text-align: center; }
    .sec2-bot-connected {
      display: flex; align-items: center; justify-content: space-between;
      background: rgba(74,222,128,.06); border: 1px solid rgba(74,222,128,.15);
      border-radius: 12px; padding: 12px 14px;
    }
    .sec2-bot-disconnect {
      background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.2);
      border-radius: 8px; padding: 6px 12px; color: #f87171;
      font-size: 11px; font-weight: 700; cursor: pointer;
    }

    /* ── HERO ── */
    .sec2-hero {
      background: linear-gradient(135deg, rgba(201,168,76,.12) 0%, rgba(201,168,76,.04) 100%);
      border: 1px solid rgba(201,168,76,.15);
      border-radius: 18px; padding: 18px 16px; margin-bottom: 14px;
      animation: sec2FadeIn .4s ease;
    }
    .sec2-saud { font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(201,168,76,.7); margin-bottom: 2px; }
    .sec2-nome { font-size: 28px; font-weight: 900; color: #c9a84c; letter-spacing: -1px; line-height: 1; margin-bottom: 8px; }
    .sec2-alert-badge {
      display: inline-flex; align-items: center; gap: 6px;
      background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.2);
      border-radius: 20px; padding: 4px 10px; font-size: 12px; color: #f87171; font-weight: 600;
    }
    .sec2-alert-num { font-weight: 900; font-size: 14px; }
    .sec2-ok-badge {
      display: inline-flex; background: rgba(74,222,128,.1); border: 1px solid rgba(74,222,128,.2);
      border-radius: 20px; padding: 4px 10px; font-size: 12px; color: #4ade80; font-weight: 600;
    }

    /* ── CHIPS ── */
    .sec2-chips { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 14px; }
    .sec2-chip {
      background: rgba(255,255,255,.03); border: 1px solid;
      border-radius: 14px; padding: 12px 14px; display: flex; flex-direction: column; gap: 2px;
      animation: sec2FadeIn .4s ease;
    }
    .sec2-chip-icon { font-size: 18px; margin-bottom: 2px; }
    .sec2-chip-val { font-size: 20px; font-weight: 900; line-height: 1; }
    .sec2-chip-lbl { font-size: 10px; color: rgba(255,255,255,.4); text-transform: uppercase; letter-spacing: .5px; }

    /* ── AI CONTAINER ── */
    .sec2-ai-container {
      background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
      border-radius: 18px; padding: 14px 14px 16px; margin-bottom: 14px;
      animation: sec2FadeIn .4s ease;
    }
    .sec2-tab-bar {
      display: flex; gap: 4px; margin-bottom: 14px;
      background: rgba(255,255,255,.04); border-radius: 10px; padding: 3px;
    }
    .sec2-tab-btn {
      flex: 1; background: none; border: none; border-radius: 8px;
      padding: 7px 4px; font-size: 10px; font-weight: 600; color: rgba(255,255,255,.35);
      cursor: pointer; font-family: inherit; transition: all .2s;
    }
    .sec2-tab-btn.active { background: rgba(255,255,255,.1); color: #fff; }
    .sec2-briefing-btn {
      width: 100%; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.1);
      border-radius: 12px; padding: 10px; color: rgba(255,255,255,.7);
      font-size: 12px; font-family: inherit; cursor: pointer; margin-bottom: 12px;
      transition: background .2s;
    }
    .sec2-briefing-btn:hover { background: rgba(255,255,255,.08); }
    .sec2-briefing-btn:disabled { opacity: .5; cursor: not-allowed; }
    .sec2-error-box {
      background: rgba(248,113,113,.08); border: 1px solid rgba(248,113,113,.2);
      border-radius: 10px; padding: 12px 14px; color: #f87171;
      font-size: 12px; margin-bottom: 10px; line-height: 1.6;
    }
    .sec2-skeletons { display: flex; flex-direction: column; gap: 8px; }
    .sec2-skeleton { height: 50px; border-radius: 10px; background: rgba(255,255,255,.04); animation: sec2Pulse 1.5s ease-in-out infinite; }
    .sec2-humor-badge {
      display: inline-flex; align-items: center; gap: 7px;
      border: 1px solid; border-radius: 20px; padding: 5px 11px;
      margin-bottom: 12px;
    }
    .sec2-humor-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .sec2-empty-briefing { text-align: center; padding: 28px 20px; color: rgba(255,255,255,.3); font-size: 13px; }

    /* ── AI CARDS (clicáveis) ── */
    .sec2-ai-cards { display: flex; flex-direction: column; gap: 8px; }
    .sec2-ai-card {
      border-left: 3px solid; border-radius: 0 12px 12px 0;
      padding: 11px 13px; transition: background .2s;
    }
    .sec2-ai-card-clickable { cursor: pointer; }
    .sec2-ai-card-clickable:active { filter: brightness(1.1); }
    .sec2-ai-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 5px; }
    .sec2-ai-card-label { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; }
    .sec2-ai-card-action {
      font-size: 10px; font-weight: 700; letter-spacing: .5px;
      border: 1px solid; border-radius: 6px; padding: 3px 8px;
      white-space: nowrap; flex-shrink: 0;
    }
    .sec2-ai-card-detail { color: rgba(255,255,255,.72); font-size: 12px; line-height: 1.55; }

    /* ── NOVA VISITA ── */
    .sec2-nova-visita {
      width: 100%; background: linear-gradient(135deg, rgba(96,165,250,.15), rgba(96,165,250,.08));
      border: 1px solid rgba(96,165,250,.25); border-radius: 14px; padding: 13px;
      color: #60a5fa; font-size: 14px; font-weight: 700; font-family: inherit;
      cursor: pointer; margin-bottom: 14px; transition: background .2s;
    }
    .sec2-nova-visita:active { background: rgba(96,165,250,.2); }

    /* ── SECTIONS ── */
    .sec2-section-header {
      display: flex; align-items: center; gap: 8px; font-size: 11px;
      font-weight: 700; letter-spacing: 1px; text-transform: uppercase;
      color: rgba(255,255,255,.5); margin: 16px 0 8px;
    }
    .sec2-section-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .sec2-section-dot.red { background: #f87171; box-shadow: 0 0 6px #f87171; }
    .sec2-section-dot.blue { background: #60a5fa; box-shadow: 0 0 6px #60a5fa; }
    .sec2-section-dot.purple { background: #a78bfa; box-shadow: 0 0 6px #a78bfa; }
    .sec2-section-dot.green { background: #4ade80; box-shadow: 0 0 6px #4ade80; }

    /* ── TASK LIST ── */
    .sec2-task-list { display: flex; flex-direction: column; gap: 8px; }
    .sec2-task {
      display: flex; align-items: center; gap: 10px;
      background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.06);
      border-left: 3px solid; border-radius: 0 12px 12px 0; padding: 11px 12px;
    }
    .sec2-task-icon { font-size: 18px; flex-shrink: 0; }
    .sec2-task-body { flex: 1; min-width: 0; }
    .sec2-task-title { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.85); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .sec2-task-sub { font-size: 11px; margin-top: 2px; }
    .sec2-task-btn {
      background: none; border: 1px solid; border-radius: 8px;
      padding: 5px 10px; font-size: 11px; font-weight: 700; font-family: inherit;
      cursor: pointer; white-space: nowrap; flex-shrink: 0; transition: background .15s;
    }
    .sec2-task-btn:active { filter: brightness(1.2); }

    /* ── VISITA CARD ── */
    .sec2-visita {
      background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07);
      border-radius: 14px; padding: 12px 14px; animation: sec2FadeIn .3s ease;
    }
    .sec2-vis-head { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
    .sec2-vis-icon { font-size: 22px; flex-shrink: 0; }
    .sec2-vis-info { flex: 1; }
    .sec2-vis-cli { font-size: 14px; font-weight: 700; color: rgba(255,255,255,.9); }
    .sec2-vis-meta { font-size: 11px; color: rgba(255,255,255,.45); margin-top: 3px; }
    .sec2-vis-obs { font-size: 11px; color: rgba(255,255,255,.4); margin-top: 4px; font-style: italic; }
    .sec2-vis-btns { display: flex; gap: 6px; flex-wrap: wrap; }
    .sec2-vis-btn {
      border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.04);
      border-radius: 8px; padding: 5px 10px; font-size: 11px; font-weight: 600;
      color: rgba(255,255,255,.7); cursor: pointer; font-family: inherit;
    }
    .sec2-vis-btn.grn { background: rgba(74,222,128,.1); border-color: rgba(74,222,128,.2); color: #4ade80; }
    .sec2-vis-btn.org { background: rgba(251,146,60,.1); border-color: rgba(251,146,60,.2); color: #fb923c; }
    .sec2-vis-btn.red { background: rgba(248,113,113,.1); border-color: rgba(248,113,113,.2); color: #f87171; }
    .sec2-vis-btn.wha { background: rgba(37,211,102,.1); border-color: rgba(37,211,102,.2); color: #25D366; }

    /* ── EMPTY ── */
    .sec2-empty { text-align: center; padding: 32px 20px; color: rgba(255,255,255,.4); font-size: 13px; }

    /* ── CONTEXTO ── */
    .sec2-ctx-top { display: flex; gap: 12px; margin-bottom: 14px; }
    .sec2-gauge-wrap { display: flex; flex-direction: column; align-items: center; gap: 4px; }
    .sec2-gauge-lbl { font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase; color: rgba(255,255,255,.3); }
    .sec2-ctx-grid { flex: 1; display: grid; grid-template-columns: 1fr 1fr; gap: 7px; }
    .sec2-ctx-card {
      background: rgba(255,255,255,.04); border: 1px solid;
      border-radius: 10px; padding: 9px 10px; display: flex; flex-direction: column; gap: 2px;
    }
    .sec2-ctx-card-lbl { font-size: 9px; text-transform: uppercase; letter-spacing: .5px; color: rgba(255,255,255,.35); }
    .sec2-radar { background: rgba(255,255,255,.04); border-radius: 12px; padding: 13px 14px; margin-bottom: 12px; }
    .sec2-radar-title { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 12px; }
    .sec2-radar-row { margin-bottom: 8px; }
    .sec2-radar-meta { display: flex; justify-content: space-between; margin-bottom: 4px; }
    .sec2-radar-lbl { color: rgba(255,255,255,.45); font-size: 11px; }
    .sec2-radar-bar-bg { height: 4px; background: rgba(255,255,255,.06); border-radius: 2px; overflow: hidden; }
    .sec2-radar-bar-fill { height: 100%; border-radius: 2px; transition: width .5s ease; }
    .sec2-radar-saldo { display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid rgba(255,255,255,.06); margin-top: 4px; }
    .sec2-entregas { background: rgba(248,113,113,.04); border: 1px solid rgba(248,113,113,.12); border-radius: 12px; padding: 12px 14px; }
    .sec2-entregas-title { font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: rgba(255,255,255,.4); margin-bottom: 8px; }
    .sec2-entrega-row { display: flex; justify-content: space-between; align-items: center; padding: 5px 0; border-bottom: 1px solid rgba(255,255,255,.04); }
    .sec2-entrega-cli { font-size: 13px; font-weight: 600; color: rgba(255,255,255,.85); }
    .sec2-entrega-desc { font-size: 11px; color: rgba(255,255,255,.35); }
    .sec2-entrega-badge { border-radius: 6px; padding: 3px 8px; font-size: 11px; font-weight: 700; font-family: 'Courier New', monospace; }

    /* ── FOLLOW-UPS ── */
    .sec2-fu-count { font-size: 11px; color: rgba(255,255,255,.4); margin-bottom: 10px; }
    .sec2-fu-card {
      background: rgba(96,165,250,.05); border: 1px solid rgba(96,165,250,.15);
      border-radius: 12px; padding: 11px 13px; margin-bottom: 8px;
      display: flex; justify-content: space-between; align-items: center; gap: 10px;
    }
    .sec2-fu-cli { color: rgba(255,255,255,.85); font-size: 13px; font-weight: 700; }
    .sec2-fu-meta { color: rgba(255,255,255,.4); font-size: 11px; margin-top: 2px; }
    .sec2-fu-actions { display: flex; gap: 6px; flex-shrink: 0; }
    .sec2-fu-btn {
      border-radius: 8px; padding: 6px 10px; font-size: 11px; font-weight: 700;
      cursor: pointer; text-decoration: none; font-family: inherit;
    }
    .sec2-fu-btn.hist { background: rgba(255,255,255,.06); border: 1px solid rgba(255,255,255,.12); color: rgba(255,255,255,.6); }
    .sec2-fu-btn.wa { background: rgba(37,211,102,.12); border: 1px solid rgba(37,211,102,.25); color: #25D366; }
    .sec2-fu-tip { background: rgba(96,165,250,.06); border: 1px solid rgba(96,165,250,.12); border-radius: 10px; padding: 11px 13px; font-size: 12px; color: rgba(255,255,255,.5); line-height: 1.5; }
  `;
  document.head.appendChild(s);
  _injectTimelineStyles();
}

// Auto-inject on load
(function() {
  _injectSec2Styles();
})();

// ══════════════════════════════════════════════════════════════
// TABS — Secretária / Chat
// ══════════════════════════════════════════════════════════════
var _secCurrentTab = 'briefing';

function secSwitchTab(tab) {
  _secCurrentTab = tab;
  var briefingPanel = document.getElementById('secBody');
  var chatPanel     = document.getElementById('chatBody');
  var btnBriefing   = document.getElementById('secTabBriefing');
  var btnChat       = document.getElementById('secTabChat');
  var activeStyle   = 'border-bottom:2px solid var(--gold2);color:var(--gold2);';
  var inactiveStyle = 'border-bottom:2px solid transparent;color:var(--t3);';

  if (tab === 'chat') {
    if (briefingPanel) briefingPanel.style.display = 'none';
    if (chatPanel)     chatPanel.style.display = 'flex';
    if (btnBriefing)   btnBriefing.style.cssText += inactiveStyle;
    if (btnChat)       btnChat.style.cssText    += activeStyle;
    if (typeof renderChat === 'function') renderChat();
  } else {
    if (briefingPanel) briefingPanel.style.display = '';
    if (chatPanel)     chatPanel.style.display = 'none';
    if (btnBriefing)   btnBriefing.style.cssText += activeStyle;
    if (btnChat)       btnChat.style.cssText    += inactiveStyle;
    renderSecretaria();
  }
}
// ══════════════════════════════════════════════════════════════
// MELHORIA #1 — TIMELINE DO DIA na Secretária
// Adiciona widget de linha do tempo horizontal com visitas e
// entregas do dia, com horários, status e indicador de "agora"
//
// COMO INTEGRAR:
//   Em _renderSecretariaInner(), após o bloco dos chips (sec2-chips)
//   e antes do AI container, adicione:
//
//     h += _secTimeline(hoje, agora);
//
//   Depois adicione este arquivo ao index.html junto com app-secretaria.js
// ══════════════════════════════════════════════════════════════

function _secTimeline(hoje, agora) {
  // ── Coletar eventos do dia ──
  var eventos = [];

  // Visitas agendadas para hoje
  (_getV() || []).filter(function(v) {
    return v.status === 'agendada' && v.date === hoje && v.hora;
  }).forEach(function(v) {
    var p = v.hora.split(':');
    var min = (+p[0]) * 60 + (+p[1]);
    eventos.push({
      min: min,
      hora: v.hora,
      tipo: 'visita',
      label: v.cli,
      sub: v.end || 'Visita de medição',
      cor: '#60a5fa',
      icon: '📐',
      id: v.id
    });
  });

  // Entregas de hoje
  (DB.j || []).filter(function(j) {
    return !j.done && j.end === hoje;
  }).forEach(function(j) {
    // Entregas sem hora fixa: marcar às 17h por convenção
    eventos.push({
      min: 17 * 60,
      hora: '17:00',
      tipo: 'entrega',
      label: j.cli,
      sub: j.desc || 'Entrega',
      cor: '#fb923c',
      icon: '🔨',
      id: j.id
    });
  });

  // Pagamentos pendentes vencendo hoje
  (DB.t || []).filter(function(t) {
    return t.type === 'pend' && t.date === hoje;
  }).forEach(function(t) {
    eventos.push({
      min: 12 * 60,
      hora: '12:00',
      tipo: 'pagamento',
      label: t.desc || 'Pagamento',
      sub: 'R$ ' + fm(t.value || 0),
      cor: '#4ade80',
      icon: '💰',
      id: t.id
    });
  });

  if (!eventos.length) return '';

  // Ordenar por horário
  eventos.sort(function(a, b) { return a.min - b.min; });

  // Horário atual em minutos
  var agoraMin = agora.getHours() * 60 + agora.getMinutes();

  // ── Calcular range da timeline ──
  var minMin = Math.max(0,   Math.min(agoraMin - 60, eventos[0].min - 30));
  var maxMin = Math.max(24 * 60, eventos[eventos.length - 1].min + 60);
  // Simplificar: janela fixa das 7h às 20h
  minMin = 7 * 60;
  maxMin = 20 * 60;
  var span = maxMin - minMin;

  function pct(m) {
    return Math.max(0, Math.min(100, ((m - minMin) / span) * 100));
  }

  var agoraPct = pct(agoraMin);

  var h = '';
  h += '<div class="sec2-tl-wrap" id="secTimeline">';
  h += '<div class="sec2-tl-header">';
  h += '<span class="sec2-tl-title">⏱ Hoje</span>';

  // Labels de hora
  var horas = [8, 10, 12, 14, 16, 18];
  h += '<div class="sec2-tl-horas">';
  horas.forEach(function(hr) {
    h += '<span class="sec2-tl-hora" style="left:' + pct(hr * 60) + '%;">' + hr + 'h</span>';
  });
  h += '</div>';
  h += '</div>';

  // Track
  h += '<div class="sec2-tl-track">';

  // Faixa de "passado" (antes de agora)
  h += '<div class="sec2-tl-past" style="width:' + agoraPct + '%;"></div>';

  // Marcadores de hora
  horas.forEach(function(hr) {
    h += '<div class="sec2-tl-tick" style="left:' + pct(hr * 60) + '%;"></div>';
  });

  // Indicador de "agora"
  if (agoraPct > 0 && agoraPct < 100) {
    h += '<div class="sec2-tl-now" style="left:' + agoraPct + '%;">';
    h += '<div class="sec2-tl-now-line"></div>';
    h += '<div class="sec2-tl-now-dot"></div>';
    h += '</div>';
  }

  // Eventos
  eventos.forEach(function(ev, i) {
    var p = pct(ev.min);
    var passado = ev.min < agoraMin;
    var atrasado = passado && ev.tipo !== 'pagamento';
    h += '<div class="sec2-tl-ev" style="left:' + p + '%;" onclick="' +
      (ev.tipo === 'visita' ? 'openVisitaMd(' + ev.id + ')' :
       ev.tipo === 'entrega' ? 'go(3)' : 'go(4)') + '">';
    h += '<div class="sec2-tl-ev-dot" style="background:' + (atrasado ? 'var(--red)' : ev.cor) + ';' +
         'box-shadow:0 0 8px ' + (atrasado ? 'var(--red)' : ev.cor) + '60;"></div>';
    h += '<div class="sec2-tl-ev-label" style="color:' + (atrasado ? 'var(--red)' : ev.cor) + ';">' +
         ev.icon + ' ' + escH(ev.label) + '</div>';
    h += '<div class="sec2-tl-ev-hora">' + ev.hora + '</div>';
    h += '</div>';
  });

  h += '</div>';

  // Cards resumo abaixo da track
  h += '<div class="sec2-tl-cards">';
  eventos.forEach(function(ev) {
    var passado = ev.min < agoraMin;
    h += '<div class="sec2-tl-card" style="border-left-color:' + (passado ? 'var(--bd)' : ev.cor) + ';opacity:' + (passado ? '.5' : '1') + ';">';
    h += '<div class="sec2-tl-card-hora" style="color:' + (passado ? 'var(--t4)' : ev.cor) + ';">' + ev.hora + '</div>';
    h += '<div class="sec2-tl-card-body">';
    h += '<div class="sec2-tl-card-label">' + ev.icon + ' ' + escH(ev.label) + '</div>';
    h += '<div class="sec2-tl-card-sub">' + escH(ev.sub) + '</div>';
    h += '</div>';
    if (passado) h += '<div class="sec2-tl-card-done">✓</div>';
    h += '</div>';
  });
  h += '</div>';

  h += '</div>'; // sec2-tl-wrap

  return h;
}

// ── Injetar estilos da timeline ──
// Chamar uma vez, dentro de _injectSec2Styles() ou separado
function _injectTimelineStyles() {
  if (document.getElementById('secTLStyle')) return;
  var s = document.createElement('style');
  s.id = 'secTLStyle';
  s.textContent = `
    @keyframes tlNowPulse {
      0%, 100% { opacity: 1; transform: translateX(-50%) scale(1); }
      50%       { opacity: .7; transform: translateX(-50%) scale(1.3); }
    }
    @keyframes tlFadeIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: none; }
    }

    .sec2-tl-wrap {
      margin: 0 0 14px;
      background: linear-gradient(135deg, rgba(96,165,250,.07) 0%, rgba(96,165,250,.02) 100%);
      border: 1px solid rgba(96,165,250,.18);
      border-radius: 18px;
      padding: 14px 14px 12px;
      animation: tlFadeIn .4s ease;
      overflow: hidden;
    }

    .sec2-tl-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
      position: relative;
    }

    .sec2-tl-title {
      font-size: 11px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #60a5fa;
    }

    .sec2-tl-horas {
      position: relative;
      flex: 1;
      margin-left: 16px;
      height: 16px;
    }

    .sec2-tl-hora {
      position: absolute;
      transform: translateX(-50%);
      font-size: 9px;
      color: rgba(255,255,255,.25);
      font-weight: 600;
      white-space: nowrap;
      bottom: 0;
    }

    /* Track */
    .sec2-tl-track {
      position: relative;
      height: 4px;
      background: rgba(255,255,255,.06);
      border-radius: 4px;
      margin: 0 0 16px;
      overflow: visible;
    }

    .sec2-tl-past {
      position: absolute;
      left: 0; top: 0; bottom: 0;
      background: rgba(255,255,255,.08);
      border-radius: 4px;
      pointer-events: none;
    }

    .sec2-tl-tick {
      position: absolute;
      top: -3px;
      width: 1px;
      height: 10px;
      background: rgba(255,255,255,.1);
      transform: translateX(-50%);
    }

    /* Agora */
    .sec2-tl-now {
      position: absolute;
      top: 50%;
      transform: translateX(-50%) translateY(-50%);
      z-index: 10;
    }
    .sec2-tl-now-line {
      position: absolute;
      left: 50%;
      top: -24px;
      width: 1.5px;
      height: 48px;
      background: linear-gradient(to bottom, transparent, rgba(248,113,113,.8), transparent);
      transform: translateX(-50%);
    }
    .sec2-tl-now-dot {
      width: 10px; height: 10px;
      background: #f87171;
      border-radius: 50%;
      border: 2px solid rgba(248,113,113,.3);
      transform: translateX(-50%);
      animation: tlNowPulse 2s ease-in-out infinite;
    }

    /* Evento */
    .sec2-tl-ev {
      position: absolute;
      top: 50%;
      transform: translateX(-50%) translateY(-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
      z-index: 5;
    }
    .sec2-tl-ev-dot {
      width: 12px; height: 12px;
      border-radius: 50%;
      border: 2px solid rgba(0,0,0,.3);
      flex-shrink: 0;
      transition: transform .2s;
    }
    .sec2-tl-ev:active .sec2-tl-ev-dot { transform: scale(1.3); }
    .sec2-tl-ev-label {
      position: absolute;
      top: 16px;
      font-size: 9px;
      font-weight: 700;
      white-space: nowrap;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      text-align: center;
    }
    .sec2-tl-ev-hora {
      position: absolute;
      bottom: 16px;
      font-size: 8px;
      color: rgba(255,255,255,.3);
      white-space: nowrap;
    }

    /* Cards abaixo da track */
    .sec2-tl-cards {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: 24px;
    }
    .sec2-tl-card {
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.06);
      border-left: 3px solid;
      border-radius: 0 10px 10px 0;
      padding: 9px 12px;
      transition: background .15s;
      cursor: pointer;
    }
    .sec2-tl-card:active { background: rgba(255,255,255,.06); }
    .sec2-tl-card-hora {
      font-size: 13px;
      font-weight: 900;
      min-width: 40px;
      font-variant-numeric: tabular-nums;
    }
    .sec2-tl-card-body { flex: 1; min-width: 0; }
    .sec2-tl-card-label {
      font-size: 13px;
      font-weight: 700;
      color: var(--t1);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sec2-tl-card-sub {
      font-size: 11px;
      color: var(--t4);
      margin-top: 2px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .sec2-tl-card-done {
      font-size: 14px;
      color: var(--t4);
      flex-shrink: 0;
    }
  `;
  document.head.appendChild(s);
}

// Chamar _injectTimelineStyles() dentro de _injectSec2Styles() ou no init
