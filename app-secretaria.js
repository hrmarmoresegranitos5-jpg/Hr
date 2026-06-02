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
// RENDER PRINCIPAL — REDESIGN 3.0 PREMIUM
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
  var minAtual  = agora.getMinutes();
  var saudacao  = horaAtual < 12 ? 'Bom dia' : horaAtual < 18 ? 'Boa tarde' : 'Boa noite';
  var nomeEmp   = (CFG && CFG.emp && CFG.emp.nome) ? CFG.emp.nome.split(' ')[0] : 'chefe';

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

  // ── HERO PREMIUM ──
  var humorGeral = totalTarefas === 0 ? 'otimo' : totalTarefas <= 2 ? 'bom' : atrasados.length > 0 ? 'critico' : 'atencao';
  var humorColor = {otimo:'#4ade80',bom:'#60a5fa',atencao:'#f59e0b',critico:'#f87171'}[humorGeral];
  var humorLabel = {otimo:'Tudo sob controle',bom:'Dia tranquilo',atencao:'Atenção necessária',critico:'Situação crítica'}[humorGeral];

  h += '<div class="s3-hero">';
  h += '<div class="s3-hero-bg"></div>';
  h += '<div class="s3-hero-content">';
  h += '<div class="s3-hero-top">';
  h += '<div class="s3-hero-left">';
  h += '<div class="s3-greeting">' + saudacao + '</div>';
  h += '<div class="s3-name">' + escH(nomeEmp) + '</div>';
  h += '</div>';
  h += '<div class="s3-status-orb" style="--orb-color:' + humorColor + ';" title="' + humorLabel + '">';
  h += '<div class="s3-orb-ring"></div>';
  h += '<div class="s3-orb-pulse"></div>';
  h += '</div>';
  h += '</div>';
  // Status line
  if (totalTarefas > 0) {
    h += '<div class="s3-hero-status alert">';
    h += '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#f87171" stroke-width="1.5"/><path d="M7 4v3.5" stroke="#f87171" stroke-width="1.5" stroke-linecap="round"/><circle cx="7" cy="10" r=".75" fill="#f87171"/></svg>';
    h += '<span><strong>' + totalTarefas + '</strong> item' + (totalTarefas > 1 ? 's' : '') + ' precisam de atenção</span>';
    h += '</div>';
  } else {
    h += '<div class="s3-hero-status ok">';
    h += '<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="6" stroke="#4ade80" stroke-width="1.5"/><path d="M4.5 7l2 2 3-3" stroke="#4ade80" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    h += '<span>' + humorLabel + '</span>';
    h += '</div>';
  }
  h += '</div>';
  h += '</div>';

  // ── MÉTRICAS — GRID 2×2 PREMIUM ──
  h += '<div class="s3-metrics">';
  h += _s3Metric(emProd.length, 'Em Produção', 'hammer', '#f59e0b', emProd.length > 0 ? null : 'Livre');
  h += _s3Metric(visitasHoje.length, 'Visitas Hoje', 'ruler', '#60a5fa', visitasHoje.length > 0 ? _fmTime(visitasHoje) : 'Nenhuma');
  h += _s3Metric(totPend > 0 ? 'R$\u00a0' + _fmShort(totPend) : '—', 'A Receber', 'cash', '#4ade80', pendVenc.length > 0 ? pendVenc.length + ' vencido(s)' : 'Em dia');
  h += _s3Metric(atrasados.length, 'Atrasados', 'warn', atrasados.length > 0 ? '#f87171' : '#4ade80', atrasados.length > 0 ? 'Crítico' : 'Sem atraso');
  h += '</div>';

  // ── CONTAINER IA ──
  h += '<div class="s3-ai-wrap" id="secAIContainer">';
  h += '<div class="s3-ai-loading"><div class="s3-dots"><span></span><span></span><span></span></div></div>';
  h += '</div>';

  // ── CTA VISITA ──
  h += '<button class="s3-cta-visit" onclick="openVisitaMd(null)">';
  h += '<span class="s3-cta-icon">📐</span>';
  h += '<span class="s3-cta-text"><strong>Agendar Visita</strong><small>Nova visita de medição</small></span>';
  h += '<svg class="s3-cta-arrow" width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M7 10h6M10 7l3 3-3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  h += '</button>';

  // ── AÇÕES IMEDIATAS ──
  if (atrasados.length || urgentes.length || pendVenc.length || followUps.length) {
    h += _s3SectionHeader('Ação Imediata', 'critical', totalTarefas);
    h += '<div class="s3-cards">';
    atrasados.forEach(function(j) {
      var d = Math.abs(dDiff(j.end));
      h += _s3Card('⚠️', escH(j.cli), escH(j.desc), d + (d===1?' dia':' dias') + ' em atraso', '#f87171', 'Ver serviço', 'data-editjob="'+j.id+'"');
    });
    pendVenc.forEach(function(t) {
      h += _s3Card('💰', escH(t.desc), 'Venceu ' + fd(t.date), 'R$ ' + fm(t.value||0), '#fbbf24', 'Ir para Finanças', 'onclick="go(4);finTab(\'areceber\')"');
    });
    urgentes.filter(function(j){return !atrasados.find(function(a){return a.id===j.id;});}).forEach(function(j) {
      h += _s3Card('🚨', escH(j.cli), escH(j.desc), j.urgMotivo||'Urgente', '#fb923c', 'Ver serviço', 'data-editjob="'+j.id+'"');
    });
    followUps.forEach(function(q) {
      h += _s3Card('📞', 'Follow-up: ' + escH(q.cli), 'Orçamento ' + fd(q.date), 'R$ ' + fm(q.vista) + ' · sem retorno', '#a78bfa', 'Ver histórico', 'onclick="go(7)"');
    });
    h += '</div>';
  }

  // ── VISITAS HOJE ──
  if (visitasHoje.length) {
    h += _s3SectionHeader('Visitas de Hoje', 'today', visitasHoje.length);
    h += '<div class="s3-visits">';
    visitasHoje.sort(function(a,b){return (a.hora||'').localeCompare(b.hora||'');}).forEach(function(v) {
      h += _s3VisitCard(v, hoje);
    });
    h += '</div>';
  }

  // ── VISITAS AMANHÃ ──
  if (visitasAmanha.length) {
    h += _s3SectionHeader('Amanhã', 'tomorrow', visitasAmanha.length);
    h += '<div class="s3-visits">';
    visitasAmanha.forEach(function(v){ h += _s3VisitCard(v, hoje); });
    h += '</div>';
  }

  // ── PRÓXIMAS VISITAS ──
  var proxVisitas = (_getV())
    .filter(function(v){return v.status==='agendada'&&v.date>addD(hoje,1);})
    .sort(function(a,b){return a.date.localeCompare(b.date)||(a.hora||'').localeCompare(b.hora||'');})
    .slice(0, 5);
  if (proxVisitas.length) {
    h += _s3SectionHeader('Próximas Visitas', 'upcoming', proxVisitas.length);
    h += '<div class="s3-visits">';
    proxVisitas.forEach(function(v){ h += _s3VisitCard(v, hoje); });
    h += '</div>';
  }

  // ── REALIZADAS ──
  var realizadas = (_getV())
    .filter(function(v){return v.status==='realizada';})
    .sort(function(a,b){return b.date.localeCompare(a.date);})
    .slice(0, 3);
  if (realizadas.length) {
    h += _s3SectionHeader('Realizadas Recentemente', 'done', realizadas.length);
    h += '<div class="s3-visits">';
    realizadas.forEach(function(v){ h += _s3VisitCard(v, hoje); });
    h += '</div>';
  }

  if (!totalTarefas && !visitasHoje.length && !proxVisitas.length) {
    h += '<div class="s3-empty"><div class="s3-empty-icon">🤝</div><div>Nada urgente. Bom momento para novos orçamentos!</div></div>';
  }

  h += '<div style="height:32px;"></div>';
  el.innerHTML = h;
}

// ─────────────────────────────────────────────
// HELPERS DE RENDER 3.0
// ─────────────────────────────────────────────

var _s3Icons = {
  hammer: '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M11.5 3.5l5 5-8 8-5-5 8-8z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M2 18l3.5-3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M13 1l2 2-2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  ruler:  '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="9" width="16" height="4" rx="1" transform="rotate(-45 2 9)" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 10.5l1 1M8 8l1 1M10.5 5.5l1 1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  cash:   '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><rect x="2" y="5" width="16" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.4"/><path d="M6 5V4M14 5V4M6 16v-1M14 16v-1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>',
  warn:   '<svg width="18" height="18" viewBox="0 0 20 20" fill="none"><path d="M10 3l8 14H2L10 3z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M10 9v3.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="10" cy="14.5" r=".75" fill="currentColor"/></svg>'
};

function _s3Metric(val, label, iconKey, color, sub) {
  return '<div class="s3-metric" style="--mc:' + color + ';">'
    + '<div class="s3-metric-icon" style="color:' + color + ';">' + (_s3Icons[iconKey]||'') + '</div>'
    + '<div class="s3-metric-val" style="color:' + color + ';">' + val + '</div>'
    + '<div class="s3-metric-label">' + label + '</div>'
    + (sub ? '<div class="s3-metric-sub">' + sub + '</div>' : '')
    + '</div>';
}

function _s3SectionHeader(title, type, count) {
  var icons = {critical:'⚡',today:'📐',tomorrow:'📅',upcoming:'🗓',done:'✅'};
  var colors = {critical:'#f87171',today:'#60a5fa',tomorrow:'#a78bfa',upcoming:'#34d399',done:'#6b7280'};
  var c = colors[type] || '#fff';
  return '<div class="s3-section-hdr">'
    + '<div class="s3-section-line" style="background:' + c + ';"></div>'
    + '<span class="s3-section-icon">' + (icons[type]||'•') + '</span>'
    + '<span class="s3-section-title" style="color:' + c + ';">' + title + '</span>'
    + (count > 0 ? '<span class="s3-section-badge" style="background:' + c + '20;color:' + c + ';">' + count + '</span>' : '')
    + '</div>';
}

function _s3Card(icon, title, desc, meta, color, btnLabel, action) {
  return '<div class="s3-card" style="--cc:' + color + ';">'
    + '<div class="s3-card-accent"></div>'
    + '<div class="s3-card-icon">' + icon + '</div>'
    + '<div class="s3-card-body">'
    + '<div class="s3-card-title">' + title + '</div>'
    + '<div class="s3-card-desc">' + desc + '</div>'
    + '<div class="s3-card-meta" style="color:' + color + ';">' + meta + '</div>'
    + '</div>'
    + '<button class="s3-card-btn" style="color:' + color + ';border-color:' + color + '30;" ' + action + '>' + btnLabel + '<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 6h4M6 4l2 2-2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>'
    + '</div>';
}

function _s3VisitCard(v, hoje) {
  var isHoje = v.date === hoje;
  var isAmanha = v.date === addD(hoje, 1);
  var dateLabel = isHoje ? 'Hoje' : isAmanha ? 'Amanhã' : fd(v.date);
  var statusColors = {agendada:'#60a5fa', realizada:'#4ade80', cancelada:'#6b7280'};
  var statusIcons  = {agendada:'📐', realizada:'✅', cancelada:'✕'};
  var sc = statusColors[v.status] || '#60a5fa';

  var h = '<div class="s3-visit" id="sv_' + v.id + '" style="--vc:' + sc + ';">';
  h += '<div class="s3-visit-bar"></div>';
  h += '<div class="s3-visit-content">';
  h += '<div class="s3-visit-head">';
  h += '<div class="s3-visit-left">';
  h += '<div class="s3-visit-cli">' + escH(v.cli) + '</div>';
  h += '<div class="s3-visit-meta">';
  if (v.hora) h += '<span class="s3-visit-tag time">🕐 ' + v.hora + '</span>';
  h += '<span class="s3-visit-tag date" style="color:' + sc + ';border-color:' + sc + '30;">' + dateLabel + '</span>';
  if (v.end) h += '<span class="s3-visit-tag loc">📍 ' + escH(v.end) + '</span>';
  h += '</div>';
  if (v.obs) h += '<div class="s3-visit-obs">' + escH(v.obs) + '</div>';
  h += '</div>';
  h += '</div>';
  h += '<div class="s3-visit-actions">';
  if (v.status === 'agendada') {
    h += '<button class="s3-vbtn ok" onclick="togVisitaStatus(' + v.id + ',\'realizada\')"><svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2.5 6.5l3 3 5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg> Realizada</button>';
    h += '<button class="s3-vbtn edit" onclick="openVisitaMd(' + v.id + ')">✏️</button>';
    h += '<button class="s3-vbtn del" onclick="togVisitaStatus(' + v.id + ',\'cancelada\')">✕</button>';
    if (v.tel) h += '<a href="https://wa.me/55' + v.tel.replace(/\D/g,'') + '" target="_blank" class="s3-vbtn wa">📱</a>';
  } else {
    h += '<button class="s3-vbtn re" onclick="togVisitaStatus(' + v.id + ',\'agendada\')">↩ Reagendar</button>';
    h += '<button class="s3-vbtn del" onclick="delVisita(' + v.id + ')">✕</button>';
  }
  h += '</div>';
  h += '</div>';
  h += '</div>';
  return h;
}

function _fmTime(visitas) {
  if (!visitas || !visitas.length) return '';
  var sorted = visitas.slice().sort(function(a,b){return (a.hora||'').localeCompare(b.hora||'');});
  return sorted[0].hora ? '1ª às ' + sorted[0].hora : visitas.length + ' agendada(s)';
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
  if (typeof target === 'function') target();
  else if (typeof target === 'number') go(target);
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
  return {otimo:'#4ade80', bom:'#60a5fa', atencao:'#f59e0b', critico:'#f87171'}[humor] || '#60a5fa';
}

function _secGaugeSVG(val) {
  var color = val < 60 ? '#4ade80' : val < 80 ? '#f59e0b' : '#f87171';
  var r = 32, circ = 2 * Math.PI * r;
  var dash = (val / 100) * circ;
  return '<svg width="80" height="80" viewBox="0 0 80 80">'
    + '<circle cx="40" cy="40" r="' + r + '" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="7"/>'
    + '<circle cx="40" cy="40" r="' + r + '" fill="none" stroke="' + color + '" stroke-width="7"'
    + ' stroke-dasharray="' + dash.toFixed(1) + ' ' + circ.toFixed(1) + '"'
    + ' stroke-linecap="round" transform="rotate(-90 40 40)"/>'
    + '<text x="40" y="45" text-anchor="middle" fill="' + color + '" style="font:bold 15px \'DM Mono\',\'Courier New\',monospace;">' + val + '%</text>'
    + '</svg>';
}

// ── AI Cards premium 3.0 ──
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
    producao:'Ver Produção', financas:'Finanças', agenda:'Agendar',
    historico:'Histórico', orcamento:'Orçamento', config:'Config', contratos:'Contratos'
  };
  var h = '<div class="s3-ai-cards">';
  cards.forEach(function(c) {
    var d = data[c.key];
    if (!d) return;
    var acao = d.acao || null;
    var btnLabel = acao ? (actionLabels[acao] || 'Ver') : null;
    var onclickAttr = acao ? ' onclick="_secNavToAction(\'' + acao + '\')"' : '';
    h += '<div class="s3-ai-card' + (acao ? ' clickable' : '') + '"' + onclickAttr + ' style="--ac:' + c.color + ';">';
    h += '<div class="s3-ai-card-stripe"></div>';
    h += '<div class="s3-ai-card-inner">';
    h += '<div class="s3-ai-card-head">';
    h += '<span class="s3-ai-card-icon">' + c.icon + '</span>';
    h += '<span class="s3-ai-card-title" style="color:' + c.color + ';">' + escH(d.titulo || c.label) + '</span>';
    if (btnLabel) h += '<span class="s3-ai-card-cta" style="color:' + c.color + ';border-color:' + c.color + '25;">' + btnLabel + ' ›</span>';
    h += '</div>';
    h += '<p class="s3-ai-card-text">' + escH(d.detalhe || '') + '</p>';
    h += '</div>';
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

  var h = '<div class="s3-tabs">';
  tabs.forEach(function(t) {
    var on = _secActiveTab === t.id;
    h += '<button onclick="secTab(\'' + t.id + '\')" class="s3-tab' + (on?' active':'') + '">' + t.label + '</button>';
  });
  h += '</div>';

  // ── TAB BRIEFING ──
  if (_secActiveTab === 'briefing') {
    var btnTxt = _secAI.loading
      ? '<span class="s3-spinner"></span> Analisando...'
      : (_secAI.lastUpdate ? '↺ Atualizar  ·  ' + _secAI.lastUpdate : '✨ Gerar briefing do dia');
    h += '<button onclick="secFetchAI()" ' + (_secAI.loading?'disabled':'') + ' class="s3-briefing-btn">' + btnTxt + '</button>';

    if (_secAI.error) {
      var errMsgs = {
        'no_key': '🔑 Chave Groq não configurada. <a href="#" onclick="go(6);return false;" style="color:#60a5fa;">Configure nas Configurações</a>.',
        'auth': '🔑 Chave inválida ou expirada. <a href="#" onclick="go(6);return false;" style="color:#60a5fa;">Verifique nas Configurações</a>.',
        'rate': '⏳ Limite de requisições atingido. Aguarde e tente novamente.',
        'timeout': '⌛ A IA demorou demais. Tente novamente.',
        'parse': '⚠️ Formato inesperado. Tente novamente.',
        'generic': '⚠️ Erro de conexão. Verifique sua internet e a chave API.'
      };
      h += '<div class="s3-error">' + (errMsgs[_secAI.error] || '⚠️ ' + escH(_secAI.error)) + '</div>';
    }

    if (_secAI.loading && !_secAI.data) {
      h += '<div class="s3-skeletons">';
      [1,.75,.9,.6].forEach(function(w){
        h += '<div class="s3-skel" style="width:' + Math.round(w*100) + '%"></div>';
      });
      h += '</div>';
    } else if (_secAI.data) {
      var hum = _secAI.data.humorGeral;
      var humColor = _secHumorColor(hum);
      var humLabel = {otimo:'Ótimo dia!',bom:'Dia tranquilo',atencao:'Atenção necessária',critico:'Situação crítica'}[hum] || '';
      h += '<div class="s3-humor" style="--hc:' + humColor + ';">';
      h += '<div class="s3-humor-dot"></div>';
      h += '<span>' + humLabel + '</span>';
      h += '</div>';
      h += _secAICards(_secAI.data);
    } else {
      h += '<div class="s3-placeholder">';
      h += '<div class="s3-placeholder-icon">✨</div>';
      h += '<div class="s3-placeholder-text">Toque em "Gerar briefing" para receber a análise inteligente do dia</div>';
      h += '</div>';
    }
  }

  // ── TAB CONTEXTO ──
  if (_secActiveTab === 'contexto') {
    var pressura = ctx.pressura;
    h += '<div class="s3-ctx-top">';
    h += '<div class="s3-gauge">' + _secGaugeSVG(pressura) + '<div class="s3-gauge-lbl">Pressão</div></div>';
    h += '<div class="s3-ctx-grid">';
    [
      {icon:'🔨', val:ctx.emProd.length,      label:'Em produção', col:'#fb923c'},
      {icon:'✅', val:'+' + ctx.podeAceit,    label:'Capacidade',  col:'#4ade80'},
      {icon:'⚠️', val:ctx.atrasados.length,   label:'Atrasados',   col:'#f87171'},
      {icon:'📐', val:ctx.visitasHoje.length,  label:'Hoje',        col:'#60a5fa'},
    ].forEach(function(item){
      h += '<div class="s3-ctx-card" style="--ic:' + item.col + ';">';
      h += '<div style="font-size:17px;">' + item.icon + '</div>';
      h += '<div style="color:' + item.col + ';font-size:18px;font-weight:800;line-height:1;">' + item.val + '</div>';
      h += '<div class="s3-ctx-lbl">' + item.label + '</div>';
      h += '</div>';
    });
    h += '</div></div>';

    var maxF = Math.max(ctx.totPend, ctx.totSaidas, 1);
    h += '<div class="s3-fin-radar">';
    h += '<div class="s3-fin-title">💵 Radar Financeiro</div>';
    [{label:'A receber', val:ctx.totPend, color:'#4ade80'},{label:'Compromissos 30d', val:ctx.totSaidas, color:'#f87171'}].forEach(function(item){
      h += '<div class="s3-fin-row">';
      h += '<div class="s3-fin-meta"><span>' + item.label + '</span><span style="color:' + item.color + ';font-weight:700;">R$ ' + fm(item.val) + '</span></div>';
      h += '<div class="s3-fin-bar"><div style="background:' + item.color + ';width:' + Math.round((item.val/maxF)*100) + '%;"></div></div>';
      h += '</div>';
    });
    var sc = ctx.saldo >= 0 ? '#4ade80' : '#f87171';
    h += '<div class="s3-fin-saldo"><span>Saldo projetado</span><span style="color:' + sc + ';font-weight:800;">' + (ctx.saldo>=0?'+':'') + 'R$ ' + fm(ctx.saldo) + '</span></div>';
    h += '</div>';

    if (ctx.entrega3d.length) {
      h += '<div class="s3-critical-list">';
      h += '<div class="s3-critical-title">⚡ Entregas críticas</div>';
      ctx.entrega3d.forEach(function(j) {
        var diff = dDiff(j.end);
        var dlbl = diff === 0 ? 'HOJE' : diff === 1 ? 'AMANHÃ' : 'em ' + diff + 'd';
        var dc = diff === 0 ? '#f87171' : diff === 1 ? '#fb923c' : '#fbbf24';
        h += '<div class="s3-critical-row">';
        h += '<div><div class="s3-critical-cli">' + escH(j.cli) + '</div><div class="s3-critical-desc">' + escH(j.desc) + '</div></div>';
        h += '<div class="s3-critical-badge" style="background:' + dc + '18;color:' + dc + ';">' + dlbl + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }
  }

  // ── TAB FOLLOW-UPS ──
  if (_secActiveTab === 'followups') {
    if (!ctx.followUps.length) {
      h += '<div class="s3-placeholder"><div class="s3-placeholder-icon">✅</div><div class="s3-placeholder-text">Nenhum orçamento pendente de retorno!</div></div>';
    } else {
      h += '<div class="s3-fu-header">' + ctx.followUps.length + ' orçamento(s) sem retorno há mais de 5 dias</div>';
      ctx.followUps.forEach(function(q) {
        var dias = Math.abs(dDiff(q.date));
        var waNum = q.tel ? q.tel.replace(/\D/g,'') : '';
        h += '<div class="s3-fu-card">';
        h += '<div class="s3-fu-info"><div class="s3-fu-cli">' + escH(q.cli) + '</div><div class="s3-fu-meta">R$ ' + fm(q.vista||0) + ' · há ' + dias + ' dias</div></div>';
        h += '<div class="s3-fu-btns">';
        h += '<button class="s3-fu-btn" onclick="go(7)">Histórico</button>';
        if (waNum) h += '<a href="https://wa.me/55' + waNum + '" target="_blank" class="s3-fu-btn wa">📱 WA</a>';
        h += '</div>';
        h += '</div>';
      });
      h += '<div class="s3-fu-tip">💡 Melhor horário para follow-up: 9h–11h ou 15h–17h.</div>';
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
// ESTILOS PREMIUM 3.0
// ─────────────────────────────────────────────
function _injectSec2Styles() {
  if (document.getElementById('sec2Style')) return;
  var s = document.createElement('style');
  s.id = 'sec2Style';
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&family=DM+Mono:wght@400;500;600&display=swap');

    @keyframes s3FadeUp    { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
    @keyframes s3PulseRing { 0%,100%{transform:scale(1);opacity:.6} 50%{transform:scale(1.35);opacity:0} }
    @keyframes s3Shimmer   { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
    @keyframes s3Spin      { to{transform:rotate(360deg)} }
    @keyframes s3Blink     { 0%,100%{opacity:.3} 50%{opacity:1} }

    /* ── BOT PANEL (preservado) ── */
    .sec2-bot-panel {
      background: linear-gradient(135deg, rgba(22,22,34,.97) 0%, rgba(14,14,22,.99) 100%);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 20px; padding: 18px; margin-bottom: 16px;
      box-shadow: 0 8px 32px rgba(0,0,0,.4);
    }
    .sec2-bot-header { display:flex; align-items:center; gap:12px; margin-bottom:16px; }
    .sec2-bot-icon-wrap { width:44px; height:44px; background:rgba(255,255,255,.06); border-radius:14px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .sec2-bot-info { flex:1; min-width:0; }
    .sec2-bot-title { font-family:'DM Sans',sans-serif; font-size:14px; font-weight:700; color:rgba(255,255,255,.92); }
    .sec2-bot-sub { font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,.38); margin-top:2px; }
    .sec2-bot-status-pill { display:flex; align-items:center; gap:6px; border-radius:20px; padding:5px 11px; flex-shrink:0; }
    .sec2-bot-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
    .sec2-bot-fields { display:flex; flex-direction:column; gap:10px; margin-bottom:12px; }
    .sec2-bot-field { display:flex; flex-direction:column; gap:4px; }
    .sec2-bot-label { font-family:'DM Sans',sans-serif; font-size:10px; font-weight:700; letter-spacing:.8px; text-transform:uppercase; color:rgba(255,255,255,.35); }
    .sec2-bot-input { background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.1); border-radius:12px; padding:10px 14px; color:rgba(255,255,255,.85); font-size:13px; font-family:'DM Sans',sans-serif; outline:none; transition:border .2s; }
    .sec2-bot-input:focus { border-color:rgba(96,165,250,.5); background:rgba(96,165,250,.05); }
    .sec2-bot-hint { font-size:10px; color:rgba(255,255,255,.28); }
    .sec2-bot-connect-btn { width:100%; background:linear-gradient(135deg,#2563eb,#1d4ed8); border:none; border-radius:14px; padding:12px; color:#fff; font-size:13px; font-weight:700; font-family:'DM Sans',sans-serif; cursor:pointer; transition:opacity .2s; }
    .sec2-bot-connect-btn:active { opacity:.8; }
    .sec2-bot-code-wrap { background:rgba(255,255,255,.04); border-radius:14px; padding:16px; }
    .sec2-bot-code-lbl { font-size:11px; color:rgba(255,255,255,.38); margin-bottom:10px; text-align:center; }
    .sec2-bot-code { font-family:'DM Mono','Courier New',monospace; font-size:28px; font-weight:600; letter-spacing:8px; color:#60a5fa; text-align:center; padding:14px; background:rgba(96,165,250,.08); border-radius:12px; border:1px solid rgba(96,165,250,.2); margin-bottom:14px; }
    .sec2-bot-steps { display:flex; flex-direction:column; gap:7px; margin-bottom:10px; }
    .sec2-bot-step { display:flex; align-items:center; gap:9px; font-size:12px; color:rgba(255,255,255,.55); font-family:'DM Sans',sans-serif; }
    .sec2-bot-step-n { width:20px; height:20px; border-radius:50%; background:rgba(96,165,250,.15); color:#60a5fa; font-size:10px; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .sec2-bot-code-warn { font-size:10px; color:rgba(251,191,36,.5); text-align:center; }
    .sec2-bot-connected { display:flex; align-items:center; justify-content:space-between; background:rgba(74,222,128,.06); border:1px solid rgba(74,222,128,.15); border-radius:14px; padding:14px 16px; }
    .sec2-bot-disconnect { background:rgba(248,113,113,.1); border:1px solid rgba(248,113,113,.2); border-radius:9px; padding:6px 13px; color:#f87171; font-size:11px; font-weight:700; cursor:pointer; font-family:'DM Sans',sans-serif; }

    /* ════════════════════════════════
       HERO PREMIUM
    ════════════════════════════════ */
    .s3-hero {
      position: relative; overflow: hidden;
      background: linear-gradient(135deg, rgba(201,168,76,.1) 0%, rgba(201,168,76,.03) 60%, rgba(96,165,250,.04) 100%);
      border: 1px solid rgba(201,168,76,.18);
      border-radius: 22px; padding: 20px 18px 18px;
      margin-bottom: 14px;
      animation: s3FadeUp .45s cubic-bezier(.22,1,.36,1);
    }
    .s3-hero-bg {
      position: absolute; inset: 0; pointer-events: none;
      background: radial-gradient(ellipse 70% 60% at 80% 20%, rgba(201,168,76,.08) 0%, transparent 70%);
    }
    .s3-hero-content { position: relative; }
    .s3-hero-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; }
    .s3-hero-left { flex: 1; }
    .s3-greeting {
      font-family: 'DM Sans', sans-serif;
      font-size: 11px; font-weight: 600; letter-spacing: 2px;
      text-transform: uppercase; color: rgba(201,168,76,.65); margin-bottom: 3px;
    }
    .s3-name {
      font-family: 'DM Sans', sans-serif;
      font-size: 32px; font-weight: 900; letter-spacing: -1.5px;
      line-height: 1; color: #c9a84c;
    }
    .s3-status-orb {
      position: relative; width: 38px; height: 38px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; margin-left: 12px; margin-top: 4px;
    }
    .s3-orb-ring {
      position: absolute; inset: 0; border-radius: 50%;
      border: 2px solid var(--orb-color, #4ade80);
      opacity: .5;
    }
    .s3-orb-pulse {
      position: absolute; inset: -4px; border-radius: 50%;
      border: 1.5px solid var(--orb-color, #4ade80);
      opacity: 0;
      animation: s3PulseRing 2.5s ease-out infinite;
    }
    .s3-status-orb::after {
      content: '';
      width: 12px; height: 12px; border-radius: 50%;
      background: var(--orb-color, #4ade80);
      box-shadow: 0 0 10px var(--orb-color, #4ade80);
    }
    .s3-hero-status {
      display: inline-flex; align-items: center; gap: 7px;
      font-family: 'DM Sans', sans-serif;
      font-size: 12px; font-weight: 600;
      border-radius: 20px; padding: 5px 12px;
    }
    .s3-hero-status.alert { background: rgba(248,113,113,.1); border: 1px solid rgba(248,113,113,.2); color: #f87171; }
    .s3-hero-status.ok    { background: rgba(74,222,128,.1);  border: 1px solid rgba(74,222,128,.2);  color: #4ade80;  }

    /* ════════════════════════════════
       MÉTRICAS
    ════════════════════════════════ */
    .s3-metrics {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
      margin-bottom: 14px;
    }
    .s3-metric {
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 18px; padding: 14px 16px;
      display: flex; flex-direction: column; gap: 3px;
      animation: s3FadeUp .5s cubic-bezier(.22,1,.36,1) both;
      transition: transform .2s, border-color .2s;
    }
    .s3-metric:active { transform: scale(.97); }
    .s3-metric-icon { margin-bottom: 4px; }
    .s3-metric-val {
      font-family: 'DM Sans', sans-serif;
      font-size: 22px; font-weight: 900; line-height: 1;
      letter-spacing: -.5px;
    }
    .s3-metric-label {
      font-family: 'DM Sans', sans-serif;
      font-size: 10px; font-weight: 600;
      text-transform: uppercase; letter-spacing: .8px;
      color: rgba(255,255,255,.38);
    }
    .s3-metric-sub {
      font-family: 'DM Mono', monospace;
      font-size: 10px; color: rgba(255,255,255,.28); margin-top: 1px;
    }

    /* ════════════════════════════════
       AI WRAPPER
    ════════════════════════════════ */
    .s3-ai-wrap {
      background: rgba(12,12,20,.6);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 20px; padding: 14px 14px 16px;
      margin-bottom: 14px;
      backdrop-filter: blur(12px);
      animation: s3FadeUp .55s cubic-bezier(.22,1,.36,1) both;
    }
    .s3-ai-loading { display:flex; align-items:center; justify-content:center; padding:20px; }
    .s3-dots { display:flex; gap:5px; }
    .s3-dots span { width:6px; height:6px; border-radius:50%; background:rgba(201,168,76,.5); animation:s3Blink 1.2s ease-in-out infinite; }
    .s3-dots span:nth-child(2) { animation-delay:.2s; }
    .s3-dots span:nth-child(3) { animation-delay:.4s; }

    /* Tabs */
    .s3-tabs {
      display: flex; gap: 3px; margin-bottom: 14px;
      background: rgba(255,255,255,.04);
      border-radius: 12px; padding: 3px;
    }
    .s3-tab {
      flex: 1; background: none; border: none; border-radius: 10px;
      padding: 7px 4px; font-family: 'DM Sans',sans-serif;
      font-size: 10px; font-weight: 600;
      color: rgba(255,255,255,.3); cursor: pointer;
      transition: all .2s;
    }
    .s3-tab.active {
      background: rgba(201,168,76,.12);
      color: #c9a84c;
      border: 1px solid rgba(201,168,76,.2);
    }

    /* Briefing button */
    .s3-briefing-btn {
      width: 100%;
      background: linear-gradient(135deg, rgba(201,168,76,.1), rgba(201,168,76,.05));
      border: 1px solid rgba(201,168,76,.2);
      border-radius: 14px; padding: 11px;
      color: rgba(201,168,76,.8); font-family:'DM Sans',sans-serif;
      font-size: 12px; font-weight: 700; cursor: pointer;
      margin-bottom: 14px; display:flex; align-items:center; justify-content:center; gap:6px;
      transition: background .2s, border-color .2s;
    }
    .s3-briefing-btn:hover { background:rgba(201,168,76,.16); border-color:rgba(201,168,76,.3); }
    .s3-briefing-btn:disabled { opacity:.5; cursor:not-allowed; }
    .s3-spinner { width:13px; height:13px; border:2px solid rgba(201,168,76,.3); border-top-color:#c9a84c; border-radius:50%; animation:s3Spin .8s linear infinite; flex-shrink:0; }

    .s3-error { background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.18); border-radius:12px; padding:12px 14px; color:#f87171; font-family:'DM Sans',sans-serif; font-size:12px; margin-bottom:12px; line-height:1.6; }
    .s3-skeletons { display:flex; flex-direction:column; gap:8px; }
    .s3-skel { height:52px; border-radius:12px; background:linear-gradient(90deg,rgba(255,255,255,.04) 25%,rgba(255,255,255,.07) 50%,rgba(255,255,255,.04) 75%); background-size:200% 100%; animation:s3Shimmer 1.8s infinite; }

    /* Humor badge */
    .s3-humor {
      display: inline-flex; align-items: center; gap: 8px;
      background: color-mix(in srgb, var(--hc,#4ade80) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--hc,#4ade80) 25%, transparent);
      border-radius: 20px; padding: 5px 12px; margin-bottom: 14px;
      font-family:'DM Sans',sans-serif; font-size:12px; font-weight:700;
      color: var(--hc, #4ade80);
    }
    .s3-humor-dot { width:7px; height:7px; border-radius:50%; background:var(--hc,#4ade80); box-shadow:0 0 8px var(--hc,#4ade80); flex-shrink:0; }

    /* AI Cards */
    .s3-ai-cards { display:flex; flex-direction:column; gap:9px; }
    .s3-ai-card {
      position: relative; overflow: hidden;
      border-radius: 14px;
      background: color-mix(in srgb, var(--ac,#60a5fa) 6%, rgba(255,255,255,.02));
      border: 1px solid color-mix(in srgb, var(--ac,#60a5fa) 15%, transparent);
      animation: s3FadeUp .4s ease both;
      transition: transform .15s;
    }
    .s3-ai-card.clickable { cursor:pointer; }
    .s3-ai-card.clickable:active { transform:scale(.98); }
    .s3-ai-card-stripe {
      position: absolute; left:0; top:0; bottom:0; width:3px;
      background: var(--ac,#60a5fa);
      border-radius: 14px 0 0 14px;
    }
    .s3-ai-card-inner { padding:11px 13px 11px 16px; }
    .s3-ai-card-head { display:flex; align-items:center; gap:7px; margin-bottom:6px; }
    .s3-ai-card-icon { font-size:14px; flex-shrink:0; }
    .s3-ai-card-title { font-family:'DM Sans',sans-serif; font-size:11px; font-weight:800; letter-spacing:.7px; text-transform:uppercase; flex:1; min-width:0; }
    .s3-ai-card-cta { font-family:'DM Sans',sans-serif; font-size:10px; font-weight:700; letter-spacing:.3px; border:1px solid; border-radius:7px; padding:3px 8px; white-space:nowrap; flex-shrink:0; }
    .s3-ai-card-text { font-family:'DM Sans',sans-serif; font-size:12px; line-height:1.6; color:rgba(255,255,255,.68); margin:0; }

    /* Placeholder */
    .s3-placeholder { text-align:center; padding:28px 20px; }
    .s3-placeholder-icon { font-size:2.2rem; margin-bottom:10px; }
    .s3-placeholder-text { font-family:'DM Sans',sans-serif; font-size:13px; color:rgba(255,255,255,.3); line-height:1.6; }

    /* ════════════════════════════════
       CTA VISITA
    ════════════════════════════════ */
    .s3-cta-visit {
      width: 100%; display: flex; align-items: center; gap: 14px;
      background: linear-gradient(135deg, rgba(96,165,250,.12), rgba(96,165,250,.06));
      border: 1px solid rgba(96,165,250,.22);
      border-radius: 18px; padding: 14px 16px;
      color: #60a5fa; cursor: pointer;
      margin-bottom: 16px;
      font-family: inherit;
      transition: background .2s, border-color .2s, transform .15s;
      text-align: left;
    }
    .s3-cta-visit:active { transform:scale(.98); background:rgba(96,165,250,.18); }
    .s3-cta-icon { font-size:22px; flex-shrink:0; }
    .s3-cta-text { flex:1; display:flex; flex-direction:column; gap:1px; }
    .s3-cta-text strong { font-family:'DM Sans',sans-serif; font-size:14px; font-weight:800; }
    .s3-cta-text small { font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(96,165,250,.6); }
    .s3-cta-arrow { flex-shrink:0; }

    /* ════════════════════════════════
       SECTION HEADERS
    ════════════════════════════════ */
    .s3-section-hdr {
      display: flex; align-items: center; gap: 9px;
      margin: 18px 0 10px;
    }
    .s3-section-line { width:3px; height:16px; border-radius:2px; flex-shrink:0; }
    .s3-section-icon { font-size:14px; }
    .s3-section-title { font-family:'DM Sans',sans-serif; font-size:11px; font-weight:800; letter-spacing:1.2px; text-transform:uppercase; flex:1; }
    .s3-section-badge { font-family:'DM Mono',monospace; font-size:10px; font-weight:600; border-radius:20px; padding:2px 8px; }

    /* ════════════════════════════════
       CARDS DE TAREFA
    ════════════════════════════════ */
    .s3-cards { display:flex; flex-direction:column; gap:9px; }
    .s3-card {
      display: flex; align-items: flex-start; gap: 12px;
      background: color-mix(in srgb, var(--cc,#60a5fa) 5%, rgba(255,255,255,.02));
      border: 1px solid color-mix(in srgb, var(--cc,#60a5fa) 12%, rgba(255,255,255,.05));
      border-radius: 16px; padding: 13px 14px;
      animation: s3FadeUp .4s ease both;
      transition: transform .15s;
    }
    .s3-card:active { transform:scale(.98); }
    .s3-card-accent { display:none; }
    .s3-card-icon { font-size:22px; flex-shrink:0; margin-top:1px; }
    .s3-card-body { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
    .s3-card-title { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; color:rgba(255,255,255,.88); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
    .s3-card-desc { font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,.4); }
    .s3-card-meta { font-family:'DM Mono',monospace; font-size:11px; font-weight:600; }
    .s3-card-btn {
      align-self: flex-start; flex-shrink:0;
      display: flex; align-items: center; gap:4px;
      background: none; border: 1px solid; border-radius: 9px;
      padding: 6px 11px; font-family:'DM Sans',sans-serif;
      font-size: 11px; font-weight: 700; cursor: pointer;
      transition: background .15s;
    }
    .s3-card-btn:active { filter:brightness(1.2); }

    /* ════════════════════════════════
       VISIT CARDS
    ════════════════════════════════ */
    .s3-visits { display:flex; flex-direction:column; gap:9px; }
    .s3-visit {
      display: flex; overflow:hidden;
      background: rgba(255,255,255,.03);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 18px;
      animation: s3FadeUp .4s ease both;
    }
    .s3-visit-bar { width:4px; flex-shrink:0; background:var(--vc,#60a5fa); border-radius:18px 0 0 18px; }
    .s3-visit-content { flex:1; padding:13px 14px; min-width:0; }
    .s3-visit-head { margin-bottom:10px; }
    .s3-visit-left { flex:1; min-width:0; }
    .s3-visit-cli { font-family:'DM Sans',sans-serif; font-size:14px; font-weight:700; color:rgba(255,255,255,.9); margin-bottom:6px; }
    .s3-visit-meta { display:flex; flex-wrap:wrap; gap:5px; }
    .s3-visit-tag { font-family:'DM Sans',sans-serif; font-size:11px; font-weight:500; border-radius:7px; padding:3px 8px; }
    .s3-visit-tag.time { background:rgba(255,255,255,.07); color:rgba(255,255,255,.5); }
    .s3-visit-tag.date { border:1px solid; }
    .s3-visit-tag.loc { background:rgba(255,255,255,.05); color:rgba(255,255,255,.4); max-width:150px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
    .s3-visit-obs { font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,.35); font-style:italic; margin-top:6px; }
    .s3-visit-actions { display:flex; gap:6px; flex-wrap:wrap; }
    .s3-vbtn {
      border-radius:9px; padding:6px 11px;
      font-family:'DM Sans',sans-serif; font-size:11px; font-weight:700;
      cursor:pointer; text-decoration:none; display:inline-flex; align-items:center; gap:4px;
      transition:filter .15s; background:none; font-family:inherit;
    }
    .s3-vbtn:active { filter:brightness(1.2); }
    .s3-vbtn.ok  { background:rgba(74,222,128,.1); border:1px solid rgba(74,222,128,.2); color:#4ade80; }
    .s3-vbtn.edit { background:rgba(251,191,36,.1); border:1px solid rgba(251,191,36,.2); color:#fbbf24; }
    .s3-vbtn.del { background:rgba(248,113,113,.08); border:1px solid rgba(248,113,113,.18); color:#f87171; }
    .s3-vbtn.wa  { background:rgba(37,211,102,.1); border:1px solid rgba(37,211,102,.2); color:#25D366; }
    .s3-vbtn.re  { background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); color:rgba(255,255,255,.6); }

    /* ════════════════════════════════
       EMPTY STATE
    ════════════════════════════════ */
    .s3-empty { text-align:center; padding:40px 20px; }
    .s3-empty-icon { font-size:2.8rem; margin-bottom:12px; }
    .s3-empty div { font-family:'DM Sans',sans-serif; font-size:14px; color:rgba(255,255,255,.35); line-height:1.6; }

    /* ════════════════════════════════
       CONTEXTO
    ════════════════════════════════ */
    .s3-ctx-top { display:flex; gap:12px; margin-bottom:14px; align-items:center; }
    .s3-gauge { display:flex; flex-direction:column; align-items:center; gap:3px; }
    .s3-gauge-lbl { font-family:'DM Sans',sans-serif; font-size:9px; letter-spacing:1.5px; text-transform:uppercase; color:rgba(255,255,255,.28); }
    .s3-ctx-grid { flex:1; display:grid; grid-template-columns:1fr 1fr; gap:7px; }
    .s3-ctx-card {
      background:rgba(255,255,255,.04);
      border:1px solid color-mix(in srgb, var(--ic,#fff) 15%, transparent);
      border-radius:12px; padding:10px 11px;
      display:flex; flex-direction:column; gap:2px;
    }
    .s3-ctx-lbl { font-family:'DM Sans',sans-serif; font-size:9px; text-transform:uppercase; letter-spacing:.5px; color:rgba(255,255,255,.3); }
    .s3-fin-radar { background:rgba(255,255,255,.04); border-radius:14px; padding:14px; margin-bottom:12px; }
    .s3-fin-title { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:rgba(255,255,255,.38); margin-bottom:14px; }
    .s3-fin-row { margin-bottom:10px; }
    .s3-fin-meta { display:flex; justify-content:space-between; margin-bottom:5px; font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,.42); }
    .s3-fin-bar { height:5px; background:rgba(255,255,255,.06); border-radius:3px; overflow:hidden; }
    .s3-fin-bar div { height:100%; border-radius:3px; transition:width .6s cubic-bezier(.22,1,.36,1); }
    .s3-fin-saldo { display:flex; justify-content:space-between; align-items:center; padding-top:12px; border-top:1px solid rgba(255,255,255,.06); margin-top:4px; font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,.42); }
    .s3-critical-list { background:rgba(248,113,113,.04); border:1px solid rgba(248,113,113,.12); border-radius:14px; padding:14px; }
    .s3-critical-title { font-family:'DM Sans',sans-serif; font-size:10px; letter-spacing:1px; text-transform:uppercase; color:rgba(248,113,113,.6); margin-bottom:10px; }
    .s3-critical-row { display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,.04); }
    .s3-critical-row:last-child { border-bottom:none; }
    .s3-critical-cli { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:600; color:rgba(255,255,255,.85); }
    .s3-critical-desc { font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,.32); }
    .s3-critical-badge { border-radius:8px; padding:4px 10px; font-family:'DM Mono',monospace; font-size:11px; font-weight:700; }

    /* ════════════════════════════════
       FOLLOW-UPS
    ════════════════════════════════ */
    .s3-fu-header { font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,.38); margin-bottom:12px; }
    .s3-fu-card {
      background:rgba(96,165,250,.05); border:1px solid rgba(96,165,250,.14);
      border-radius:14px; padding:12px 14px; margin-bottom:8px;
      display:flex; justify-content:space-between; align-items:center; gap:10px;
    }
    .s3-fu-info { flex:1; min-width:0; }
    .s3-fu-cli { font-family:'DM Sans',sans-serif; font-size:13px; font-weight:700; color:rgba(255,255,255,.85); }
    .s3-fu-meta { font-family:'DM Sans',sans-serif; font-size:11px; color:rgba(255,255,255,.38); margin-top:2px; }
    .s3-fu-btns { display:flex; gap:6px; flex-shrink:0; }
    .s3-fu-btn { border-radius:9px; padding:6px 11px; font-family:'DM Sans',sans-serif; font-size:11px; font-weight:700; cursor:pointer; text-decoration:none; background:rgba(255,255,255,.07); border:1px solid rgba(255,255,255,.12); color:rgba(255,255,255,.55); }
    .s3-fu-btn.wa { background:rgba(37,211,102,.1); border-color:rgba(37,211,102,.2); color:#25D366; }
    .s3-fu-tip { background:rgba(201,168,76,.06); border:1px solid rgba(201,168,76,.15); border-radius:12px; padding:12px 14px; font-family:'DM Sans',sans-serif; font-size:12px; color:rgba(201,168,76,.6); line-height:1.6; }
  `;
  document.head.appendChild(s);
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
