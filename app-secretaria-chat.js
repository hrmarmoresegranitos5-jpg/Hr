// ══════════════════════════════════════════════════════════════
// SECRETÁRIA IA v3 — Acesso Total ao Sistema + Diagnóstico
// • Lê todos os módulos: finanças, agenda, RH, túmulos, diagnóstico
// • Notificação automática de erros JS em tempo real
// • Contexto completo: logs de erro, relatórios, horas extras
// ══════════════════════════════════════════════════════════════

var _chat = {
  history: [],
  recording: false,
  mediaRecorder: null,
  audioChunks: [],
  thinking: false,
  recognition: null
};

// ── Salva/carrega histórico ──────────────────────────────────
function _chatLoad() {
  try { _chat.history = JSON.parse(localStorage.getItem('hr_chat') || '[]'); } catch(e) { _chat.history = []; }
}
function _chatSave() {
  try { localStorage.setItem('hr_chat', JSON.stringify(_chat.history.slice(-100))); } catch(e) {}
}

// ══════════════════════════════════════════════════════════════
// MONITOR DE ERROS — notifica secretária em tempo real
// ══════════════════════════════════════════════════════════════
var _errMonitor = {
  lastNotifTs: 0,
  errosJaNotificados: {},
  COOLDOWN_MS: 60000  // no mínimo 1 min entre notificações
};

// Chamado pelo app-diagnostico.js via hook de erros
function _secretariaReceberErro(msg, src, linha) {
  var agora = Date.now();
  var chave = (msg || '').slice(0, 80) + '|' + (src || '');

  // Evita notificar o mesmo erro repetido
  if (_errMonitor.errosJaNotificados[chave]) return;
  if (agora - _errMonitor.lastNotifTs < _errMonitor.COOLDOWN_MS) return;

  _errMonitor.errosJaNotificados[chave] = true;
  _errMonitor.lastNotifTs = agora;

  // Notificação push do browser
  if (Notification && Notification.permission === 'granted') {
    try {
      new Notification('⚠️ Erro no Sistema HR', {
        body: (msg || 'Erro desconhecido').slice(0, 100) + (linha ? ' (linha ' + linha + ')' : ''),
        icon: 'icon-192.png',
        tag: 'hr-erro-js'
      });
    } catch(e) {}
  }

  // Injeta aviso no chat da secretária (aparece na próxima abertura)
  var ts = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  var srcCurto = (src || '').replace(/.*\//, '').replace(/\?.*/, '');
  var texto = '🚨 **Detectei um erro no sistema!**\n\n' +
    '**Erro:** ' + (msg || 'desconhecido') + '\n' +
    (srcCurto ? '**Arquivo:** ' + srcCurto + (linha ? ' · linha ' + linha : '') + '\n' : '') +
    '\nVá em **Configurações → 🔍 Diagnóstico** para ver detalhes e sugestões de correção. Posso te ajudar a entender o erro se quiser!';

  _chat.history.push({
    role: 'assistant',
    content: texto,
    actions: [{label:'🔍 Ver Diagnóstico', fn:'go(6);setTimeout(function(){if(typeof cfgAba==="function")cfgAba(9);else{cfgTab=9;buildCfg();}},300)'}],
    ts: ts,
    isAlerta: true
  });
  _chatSave();

  // Pulsa o ícone da secretária se existir
  var secDot = document.getElementById('secAlertDot');
  if (secDot) secDot.style.display = 'block';
}

// Hook: registra o receptor no diagnóstico quando ele estiver pronto
window.addEventListener('load', function() {
  // Expõe função para que app-diagnostico.js possa chamar
  window._secretariaReceberErro = _secretariaReceberErro;

  // Monkey-patch no addLog do diagnóstico para alertar secretária
  var _diagInterval = setInterval(function() {
    if (typeof window._buildDiagHTML !== 'function') return;
    clearInterval(_diagInterval);

    // Intercepta window.onerror para acionar a secretária também
    var _prevOnerror = window.onerror;
    window.onerror = function(msg, src, linha, col, errObj) {
      _secretariaReceberErro(msg, src, linha);
      if (typeof _prevOnerror === 'function') _prevOnerror(msg, src, linha, col, errObj);
      return true;
    };

    // Intercepta console.error
    var _prevConsoleError = console.error;
    console.error = function() {
      var args = Array.prototype.slice.call(arguments);
      var msg = args.map(function(a) {
        return (a instanceof Error) ? a.message : (typeof a === 'object' ? JSON.stringify(a) : String(a));
      }).join(' ');
      // Ignora erros triviais do sistema (rede, etc.)
      if (!/NetworkError|net::ERR|AbortError|Failed to fetch/i.test(msg)) {
        _secretariaReceberErro(msg, 'console.error', '');
      }
      _prevConsoleError.apply(console, arguments);
    };

  }, 500);
});

// ══════════════════════════════════════════════════════════════
// RENDER DO CHAT
// ══════════════════════════════════════════════════════════════
var _chatChips = [
  { label: '📊 Finanças do mês',       text: 'Como estão as finanças deste mês?' },
  { label: '⚠️ Jobs atrasados',         text: 'Quais jobs estão atrasados?' },
  { label: '💰 A receber',              text: 'Quanto tenho a receber?' },
  { label: '👷 Saldo funcionários',     text: 'Qual o saldo devedor de cada funcionário?' },
  { label: '📈 Análise completa',       text: 'Faça uma análise financeira detalhada deste mês com insights e sugestões.' },
  { label: '🔍 Erros no sistema',       text: 'Tem algum erro no sistema agora?' }
];


// ── Chips contextuais baseados no estado atual ──────────────
function _chatGetContextChips() {
  try {
    var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10);
    var chips = [];
    var jobsAtrasados = ((typeof DB !== 'undefined' && DB.j) ? DB.j : [])
      .filter(function(j){ return !j.done && j.end && j.end < hoje; }).length;
    var pendentes = ((typeof DB !== 'undefined' && DB.t) ? DB.t : [])
      .filter(function(t){ return t.type === 'pend'; }).length;
    var jobsHoje = ((typeof DB !== 'undefined' && DB.j) ? DB.j : [])
      .filter(function(j){ return !j.done && j.end === hoje; }).length;

    if (jobsAtrasados > 0) chips.push({ label: '⚠️ ' + jobsAtrasados + ' atraso(s)', text: 'Liste os jobs atrasados com dias de atraso e valor de cada um.' });
    if (pendentes > 0)     chips.push({ label: '💰 ' + pendentes + ' a receber', text: 'Liste tudo que tenho a receber com datas de vencimento.' });
    if (jobsHoje > 0)      chips.push({ label: '🔨 entregas hoje', text: 'Quais entregas são para hoje? Estão prontas?' });
    chips.push({ label: '📊 Finanças do mês', text: 'Como estão as finanças deste mês? Compare com o anterior.' });
    chips.push({ label: '📈 Análise completa', text: 'Faça uma análise financeira detalhada deste mês com tendência, inadimplência e sugestões práticas.' });
    chips.push({ label: '🔍 Erros no sistema', text: 'Tem algum erro no sistema agora?' });
    return chips.slice(0, 6);
  } catch(e) { return _chatChips; }
}

function renderChat() {
  var el = document.getElementById('chatBody');
  if (!el) return;
  _chatLoad();
  _injectChatStyles();

  var h = '';
  h += '<div class="chat-wrap">';

  // Header
  h += '<div class="chat-header">';
  h += '<div class="chat-avatar"><span>✨</span><div class="chat-avatar-dot"></div></div>';
  h += '<div class="chat-header-info">';
  h += '<div class="chat-header-name">Secretária HR</div>';
  h += '<div class="chat-header-sub">IA · Acesso total ao sistema</div>';
  h += '</div>';
  h += '<button class="chat-clear-btn" onclick="chatClear()" title="Limpar conversa">🗑</button>';
  h += '</div>';

  // Mensagens
  h += '<div class="chat-messages" id="chatMessages">';
  if (!_chat.history.length) {
    h += _chatBubbleBot(
      '👋 Olá! Sou a Secretária IA da HR Mármores.\n\n' +
      'Tenho **acesso completo** ao sistema em tempo real — finanças, jobs, agenda, RH e diagnóstico.\n\n' +
      'Posso registrar lançamentos, analisar sua saúde financeira, alertar sobre atrasos e muito mais. Use os atalhos abaixo ou escreva o que precisar 👇',
      null, null, false, true
    );
  } else {
    _chat.history.forEach(function(msg) {
      if (msg.role === 'user') {
        h += _chatBubbleUser(msg.content, msg.ts);
      } else {
        h += _chatBubbleBot(msg.content, msg.actions || null, msg.ts, msg.isAlerta, false);
      }
    });
  }
  if (_chat.thinking) {
    h += '<div class="chat-bubble chat-bubble-bot chat-thinking" id="chatThinking">';
    h += '<div class="chat-thinking-inner"><span></span><span></span><span></span></div>';
    h += '<div class="chat-thinking-label">Analisando...</div>';
    h += '</div>';
  }
  h += '</div>';

  // Chips de atalho
  if (!_chat.thinking) {
    h += '<div class="chat-chips" id="chatChips">';
    _chatGetContextChips().forEach(function(c) {
      h += '<button class="chat-chip" onclick=\'chatChipSend(\'' + c.text.replace(/\'/g,"\\'") + '\')\' >' + c.label + '</button>';
    });
    h += '</div>';
  }

  // Input
  h += '<div class="chat-input-area">';
  h += '<div class="chat-input-row">';
  h += '<textarea id="chatInput" class="chat-input" placeholder="Pergunte algo ou dê um comando..." rows="1" ' +
       'onkeydown="chatInputKey(event)" oninput="chatInputResize(this)"></textarea>';
  h += '<button class="chat-mic-btn" id="chatMicBtn" ontouchstart="chatMicStart(event)" ontouchend="chatMicStop(event)" ' +
       'onmousedown="chatMicStart(event)" onmouseup="chatMicStop(event)">🎙</button>';
  h += '<button class="chat-send-btn" id="chatSendBtn" onclick="chatSend()">➤</button>';
  h += '</div>';
  h += '<div class="chat-mic-status" id="chatMicStatus"></div>';
  h += '</div>';

  h += '</div>';
  el.innerHTML = h;
  _chatScrollBottom();
}

function chatChipSend(text) {
  var chips = document.getElementById('chatChips');
  if (chips) chips.style.display = 'none';
  _chatUserMsg(text);
}

function _chatBubbleUser(text, ts) {
  return '<div class="chat-bubble chat-bubble-user">' +
    '<div class="chat-bubble-text">' + escH(text) + '</div>' +
    (ts ? '<div class="chat-bubble-ts">' + ts + '</div>' : '') +
    '</div>';
}

function _chatBubbleBot(text, actions, ts, isAlerta, showChips) {
  var formatted = _chatFormatMd(text);
  var alertaCss = isAlerta ? 'border-left:3px solid #ef4444;background:rgba(239,68,68,.05);' : '';
  var h = '<div class="chat-bubble chat-bubble-bot" style="' + alertaCss + '">';
  h += '<div class="chat-bubble-text">' + formatted + '</div>';
  if (actions && actions.length) {
    h += '<div class="chat-actions">';
    actions.forEach(function(a) {
      h += '<button class="chat-action-btn" onclick="' + escH(a.fn) + '">' + escH(a.label) + '</button>';
    });
    h += '</div>';
  }
  if (ts) h += '<div class="chat-bubble-ts">' + ts + '</div>';
  h += '</div>';
  return h;
}

function _chatFormatMd(text) {
  if (!text) return '';
  return escH(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // listas com bullet • ou -
    .replace(/(<br>|^)([•\-] )(.+?)(?=<br>|$)/g, '$1<span class="chat-li">$3</span>')
    // destaque numérico: R$ valor
    .replace(/(R\$\s?[\d.,]+)/g, '<span class="chat-val">$1</span>')
    // status emoji com cor
    .replace(/(✅|✔)/g, '<span style="color:#4ade80">$1</span>')
    .replace(/(⚠️|🔴)/g, '<span style="color:#f87171">$1</span>')
    .replace(/(🟡|🟠)/g, '<span style="color:#f59e0b">$1</span>');
}
// Alias retrocompat
function _chatFormatText(text) { return _chatFormatMd(text); }

function _chatScrollBottom() {
  setTimeout(function() {
    var el = document.getElementById('chatMessages');
    if (el) el.scrollTop = el.scrollHeight;
  }, 60);
}

// ══════════════════════════════════════════════════════════════
// ENVIAR MENSAGEM
// ══════════════════════════════════════════════════════════════
function chatInputKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); chatSend(); }
}
function chatInputResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function chatSend() {
  var inp = document.getElementById('chatInput');
  if (!inp) return;
  var text = inp.value.trim();
  if (!text || _chat.thinking) return;
  inp.value = '';
  inp.style.height = 'auto';
  _chatUserMsg(text);
}

function _chatUserMsg(text) {
  var ts = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  _chat.history.push({ role: 'user', content: text, ts: ts });
  _chatSave();
  _chat.thinking = true;
  renderChat();
  _chatScrollBottom();
  _chatAsk(text);
}

function chatClear() {
  if (!confirm('Limpar toda a conversa?')) return;
  _chat.history = [];
  _chatSave();
  renderChat();
}

// ══════════════════════════════════════════════════════════════
// CONTEXTO COMPLETO DO SISTEMA
// ══════════════════════════════════════════════════════════════
function _chatBuildContext() {
  var hoje = td();
  var mes  = hoje.slice(0,7);
  var anoAtual = hoje.slice(0,4);

  var transacoes = DB.t || [];

  // ── Finanças mês atual ──
  var recMes   = transacoes.filter(function(t){ return t.type==='in'   && (t.date||'').slice(0,7)===mes; }).reduce(function(s,t){ return s+(t.value||0); }, 0);
  var despMes  = transacoes.filter(function(t){ return t.type==='out'  && (t.date||'').slice(0,7)===mes; }).reduce(function(s,t){ return s+(t.value||0); }, 0);
  var pendMes  = transacoes.filter(function(t){ return t.type==='pend'; }).reduce(function(s,t){ return s+(t.value||0); }, 0);
  var fixos    = (CFG.fixos||[]).reduce(function(s,f){ return s+(f.v||0); }, 0);
  var vars     = (CFG.variaveis||[]).reduce(function(s,f){ return s+(f.v||0); }, 0);
  var atrasados = transacoes.filter(function(t){ return t.type==='pend' && t.date && t.date < hoje; });
  var lucroMes = recMes - despMes - fixos;

  // ── Tendência: 3 meses anteriores ──
  function mesAnterior(m, n) {
    var d = new Date(m + '-01');
    d.setMonth(d.getMonth() - n);
    return d.toISOString().slice(0,7);
  }
  var tendencia = [];
  for (var i = 3; i >= 1; i--) {
    var m2 = mesAnterior(mes, i);
    var r2 = transacoes.filter(function(t){ return t.type==='in'  && (t.date||'').slice(0,7)===m2; }).reduce(function(s,t){ return s+(t.value||0); }, 0);
    var d2 = transacoes.filter(function(t){ return t.type==='out' && (t.date||'').slice(0,7)===m2; }).reduce(function(s,t){ return s+(t.value||0); }, 0);
    tendencia.push(m2 + ': faturado R$ ' + r2.toFixed(2) + ' | despesas R$ ' + d2.toFixed(2) + ' | saldo R$ ' + (r2-d2).toFixed(2));
  }

  // ── Ticket médio e top clientes ──
  var entradas = transacoes.filter(function(t){ return t.type==='in' && t.value > 0; });
  var ticketMedio = entradas.length ? (entradas.reduce(function(s,t){ return s+t.value; }, 0) / entradas.length) : 0;
  var porCliente = {};
  (DB.q||[]).forEach(function(q){ if(q.cli && q.value) porCliente[q.cli] = (porCliente[q.cli]||0) + (q.value||0); });
  var topCli = Object.entries(porCliente).sort(function(a,b){ return b[1]-a[1]; }).slice(0,5)
    .map(function(e){ return e[0] + ' (R$ ' + e[1].toFixed(2) + ')'; });

  // ── Jobs ──
  var jobsAtivos = (DB.j||[]).filter(function(j){ return !j.done; });
  var jobsAtrasados = jobsAtivos.filter(function(j){ return j.end && j.end < hoje; });
  var valorJobsAbertos = jobsAtivos.reduce(function(s,j){ return s+(j.value||0); }, 0);
  var jobs = jobsAtivos.slice(0,15).map(function(j){
    var diff = dDiff(j.end);
    var status = diff < 0 ? '🔴 ATRASADO ' + Math.abs(diff) + 'd' : '🟢 em ' + diff + 'd';
    return j.cli + ' | ' + j.desc + ' | ' + (j.end||'?') + ' (' + status + ') | R$ ' + fm(j.value||0) + (j.pago ? ' | pago: R$ ' + fm(j.pago) : '');
  });

  // ── A receber ──
  var pendentes = transacoes.filter(function(t){ return t.type==='pend'; }).slice(0,10).map(function(t){
    var atrasado = t.date && t.date < hoje ? ' ⚠️ ATRASADO' : '';
    return t.desc + ' | R$ ' + fm(t.value||0) + ' | vence: ' + (t.date||'?') + atrasado;
  });

  // ── Visitas ──
  var visitas = (typeof _getV === 'function' ? _getV() : [])
    .filter(function(v){ return v.status==='agendada'; }).slice(0,5)
    .map(function(v){ return v.cli + ' | ' + v.date + (v.hora?' às '+v.hora:'') + (v.end?' | '+v.end:''); });

  // ── Clientes recentes ──
  var ultClientes = {};
  (DB.q||[]).slice(0,30).forEach(function(q){ if(q.cli) ultClientes[q.cli] = (q.date||''); });
  var cliList = Object.keys(ultClientes).slice(0,15).join(', ');

  // ── Meta ──
  var meta = (CFG.saudeFinanceira && CFG.saudeFinanceira.metaFaturamento) || 0;
  var pctMeta = meta > 0 ? Math.round((recMes/meta)*100) : null;

  return [
    'DADOS HR MÁRMORES — hoje: ' + hoje,
    '',
    '══ FINANÇAS ══',
    'Faturado (mês): R$ ' + recMes.toFixed(2) + (meta > 0 ? ' | Meta: R$ ' + meta.toFixed(2) + ' (' + pctMeta + '%)' : ''),
    'Despesas (mês): R$ ' + despMes.toFixed(2) + ' | Custos fixos: R$ ' + fixos.toFixed(2) + ' | Custos variáveis: R$ ' + vars.toFixed(2),
    'Lucro estimado: R$ ' + lucroMes.toFixed(2),
    'A receber total: R$ ' + pendMes.toFixed(2) + (atrasados.length ? ' | ' + atrasados.length + ' parcelas ATRASADAS' : ''),
    'Ticket médio (histórico): R$ ' + ticketMedio.toFixed(2),
    '',
    '══ TENDÊNCIA (3 MESES) ══',
    tendencia.join('
'),
    '',
    '══ TOP CLIENTES POR VOLUME ══',
    topCli.length ? topCli.join(' | ') : 'Sem dados',
    '',
    'JOBS EM PRODUÇÃO (' + jobsAtivos.length + ' ativos, ' + jobsAtrasados.length + ' atrasados | valor aberto: R$ ' + valorJobsAbertos.toFixed(2) + '):',
    jobs.join('
') || 'Nenhum',
    '',
    'A RECEBER (' + pendentes.length + '):',
    pendentes.join('
') || 'Nenhum',
    '',
    'VISITAS AGENDADAS:',
    visitas.join('
') || 'Nenhuma',
    '',
    'CLIENTES RECENTES: ' + (cliList || 'Nenhum'),
    '',
    _chatBuildRHContext(),
    '',
    _chatBuildOrcContext(),
    '',
    _chatBuildDiagContext()
  ].join('
');
}

// ── Contexto RH completo ────────────────────────────────────
function _chatBuildRHContext() {
  try {
    var funcs = {};
    try { funcs = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch(e) {}
    var regs  = {};
    try { regs  = JSON.parse(localStorage.getItem('hr_registros')   || '{}'); } catch(e) {}
    var pags  = {};
    try { pags  = JSON.parse(localStorage.getItem('hr_pagamentos')  || '{}'); } catch(e) {}

    var lista = Object.values(funcs).filter(function(f){ return f.ativo !== false; });
    if (!lista.length) return 'FUNCIONÁRIOS: Nenhum cadastrado.';

    var hoje = td();
    var mes  = hoje.slice(0,7);

    var linhas = lista.map(function(f) {
      var meusRegs = Object.values(regs).filter(function(r){ return r.funcionarioId === f.id; });
      var horasMes = meusRegs
        .filter(function(r){ return (r.data||'').slice(0,7) === mes; })
        .reduce(function(s,r){ return s + (parseFloat(r.horas)||0); }, 0);
      var horasTotal = meusRegs.reduce(function(s,r){ return s + (parseFloat(r.horas)||0); }, 0);

      var taxaExtra = parseFloat(f.taxaHoraExtra) || (parseFloat(f.salario)||0) / 220;
      var valorExtra = horasTotal * taxaExtra;
      var totalDevido = (parseFloat(f.salario)||0) + valorExtra;
      var totalPago = Object.values(pags)
        .filter(function(p){ return p.funcionarioId === f.id; })
        .reduce(function(s,p){ return s + (parseFloat(p.valor)||0); }, 0);
      var saldo = totalDevido - totalPago;

      return f.nome +
        ' | setor: ' + (f.setor||'?') +
        ' | salário: R$ ' + (parseFloat(f.salario)||0).toFixed(2) +
        ' | horas extras (mês): ' + horasMes.toFixed(1) + 'h' +
        ' | horas extras (total): ' + horasTotal.toFixed(1) + 'h' +
        ' | valor extras: R$ ' + valorExtra.toFixed(2) +
        ' | total pago: R$ ' + totalPago.toFixed(2) +
        ' | saldo devedor: R$ ' + saldo.toFixed(2) + (saldo < 0 ? ' (crédito)' : '') +
        ' | id: ' + f.id;
    });

    return 'FUNCIONÁRIOS RH (' + lista.length + '):\n' + linhas.join('\n');
  } catch(e) { return 'FUNCIONÁRIOS: erro ao carregar — ' + e.message; }
}

// ── Contexto de diagnóstico e erros do sistema ─────────────
function _chatBuildDiagContext() {
  try {
    // Tenta acessar o objeto DIAG via window (app-diagnostico.js é IIFE)
    // O diagnóstico expõe _buildDiagHTML e addLog, mas não DIAG diretamente.
    // Usamos a função exportada _diagGetLogs se disponível, ou lemos os logs via console interceptado.
    var logsRaw = [];
    if (typeof window._diagGetLogs === 'function') {
      logsRaw = window._diagGetLogs();
    }

    if (!logsRaw.length) {
      return 'DIAGNÓSTICO DO SISTEMA: Sem erros registrados nesta sessão. Sistema operando normalmente.';
    }

    var erros  = logsRaw.filter(function(l){ return l.tipo === 'error'; });
    var avisos = logsRaw.filter(function(l){ return l.tipo === 'warn';  });

    if (!erros.length) {
      return 'DIAGNÓSTICO DO SISTEMA: ' + avisos.length + ' aviso(s), sem erros críticos.';
    }

    var resumo = erros.slice(0,5).map(function(e){
      var src = (e.src||'').replace(/.*\//,'').replace(/\?.*/,'');
      return '• [ERRO] ' + e.msg.slice(0,120) + (src ? ' (' + src + (e.linha ? ':' + e.linha : '') + ')' : '');
    }).join('\n');

    return 'DIAGNÓSTICO DO SISTEMA (' + erros.length + ' erro(s), ' + avisos.length + ' aviso(s)):\n' + resumo;
  } catch(e) {
    return 'DIAGNÓSTICO: erro // ── Contexto de orçamentos recentes ───────────────────────
function _chatBuildOrcContext() {
  try {
    var orcs = (typeof DB !== 'undefined' && DB.q) ? DB.q.slice(0, 10) : [];
    if (!orcs.length) return 'ORÇAMENTOS RECENTES: Nenhum gerado.';
    var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10);
    var mes = hoje.slice(0,7);
    var totalMes = 0;
    var linhas = orcs.map(function(q) {
      if ((q.date||'').slice(0,7) === mes) totalMes += (q.vista || 0);
      return '• ' + (q.cli||'?') + ' — ' + (q.tipo||'?') +
        ' | R$ ' + (q.vista||0).toFixed(2) +
        ' | ' + (q.date||'?') +
        ' | ' + (q.m2||0).toFixed(2) + 'm²';
    }).join('\n');
    return 'ORÇAMENTOS RECENTES (' + orcs.length + ') | total gerado no mês: R$ ' + totalMes.toFixed(2) + ':\n' + linhas;
  } catch(e) { return 'ORÇAMENTOS: erro — ' + e.message; }
}

ao ler logs — ' + e.message;
  }
}

// ── Prompt do sistema completo ────────────────────────────
function _chatBuildSystem() {
  var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10);
  return [
    'Você é a Secretária IA da HR Mármores e Granitos — empresa de mármores, granitos e túmulos em Pilão Arcado-BA.',
    'Você tem ACESSO TOTAL e CONHECIMENTO COMPLETO do sistema em tempo real.',
    'Data de hoje: ' + hoje,
    '',
    '═══ PERSONALIDADE ═══',
    'Tom: profissional, direto. Como uma secretária experiente que conhece o negócio de cabeça.',
    'Você NUNCA diz "não tenho acesso" ou "não posso verificar" — os dados estão no contexto abaixo.',
    'Você proativamente aponta problemas críticos mesmo quando não perguntado.',
    '',
    '═══ ANÁLISE FINANCEIRA INTELIGENTE ═══',
    'Para qualquer pergunta financeira SEMPRE:',
    '1. Informe o número exato (faturado, despesas, lucro)',
    '2. Compare com o mês anterior (subiu X% / caiu X%)',
    '3. Calcule ponto de equilíbrio = fixos + variáveis',
    '4. Se abaixo do ponto de equilíbrio: alerte com ⚠️',
    '5. Dê 1 sugestão prática específica (nome de cliente ou ação)',
    '6. Mostre % da meta atingida se configurada',
    '',
    '═══ INTERPRETAÇÃO DE LINGUAGEM NATURAL ═══',
    'Valores: "trezentos" = 300, "1.5k" = 1500, "cinco mil" = 5000',
    'Datas: "semana que vem" = +7 dias, "amanhã" = +1 dia',
    'Nomes: aceite variações — "Robson" pode ser "Robson Santana"',
    '',
    '═══ AÇÕES DISPONÍVEIS ═══',
    'Retorne JSON no bloco ```json``` quando o usuário pedir ação:',
    '1. Despesa:    {"action":"despesa","desc":"...","valor":100}',
    '2. Entrada:    {"action":"entrada","desc":"...","valor":100}',
    '3. A receber:  {"action":"areceber","desc":"...","valor":100,"data":"YYYY-MM-DD"}',
    '4. Novo job:   {"action":"job","cli":"...","desc":"...","dias":10,"valor":500}',
    '5. Visita:     {"action":"visita","cli":"...","data":"YYYY-MM-DD","hora":"09:00","end":"..."}',
    '6. Pagar func: {"action":"pagar_func","funcionario":"nome","valor":500,"forma":"dinheiro"}',
    '7. Job pago:   {"action":"job_pago","cli":"...","valor":500}',
    '8. Navegar:    {"action":"nav","tela":"financas|agenda|historico|contratos|orcamento|rh|diagnostico"}',
    '9. Limpar:     {"action":"limpar_diag"}',
    '',
    'MÚLTIPLAS AÇÕES: use múltiplos blocos ```json``` separados na mesma resposta.',
    '',
    '═══ FORMATO ═══',
    '- Máximo 10 linhas (exceto análises completas solicitadas)',
    '- **negrito** para números críticos e nomes de clientes',
    '- • para listas',
    '- ✅ para confirmar ações executadas',
    '- Se jobs atrasados ou inadimplência: sempre mencione ao final',
    '- Para "como estou" ou "resumo": 5 pontos chave com dados reais',
  ].join(\'\n\');
}

function _chatAsk(userText) {
  var key = CFG && CFG.emp && CFG.emp.apiKey;
  if (!key) {
    _chatBotReply('🔑 Chave de API não configurada. Vá em Config → Empresa para adicionar sua chave.', [
      {label:'⚙️ Ir às Configurações', fn:'go(6)'}
    ]);
    return;
  }

  var ctx = _chatBuildContext();
  var systemPrompt = _chatBuildSystem() + '\n\nCONTEXTO ATUAL:\n' + ctx;

  // Histórico para a API (últimas 10 msgs, sem alertas automáticos repetidos)
  var apiMessages = [];
  _chat.history.slice(-20).forEach(function(m) {
    if (m.role === 'user' || m.role === 'assistant') {
      apiMessages.push({role: m.role, content: m.content});
    }
  });

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: apiMessages.length ? apiMessages : [{role:'user', content: userText}]
    })
  })
  .then(function(r){ return r.json(); })
  .then(function(d) {
    var text = '';
    if (d.content && d.content[0]) text = d.content[0].text || '';
    if (!text && d.error) throw new Error(d.error.message || 'Erro da API');
    _chatProcessReply(text);
  })
  .catch(function(err) {
    _chatBotReply('⚠️ Erro de conexão com a IA. Verifique sua chave Anthropic em Config → IA e tente novamente.', [
      {label:'⚙️ Configurações', fn:'go(6)'}
    ]);
    console.warn('chat API error:', err);
  });
}

// ══════════════════════════════════════════════════════════════
// PROCESSAR RESPOSTA + EXECUTAR AÇÕES
// ══════════════════════════════════════════════════════════════
function _chatProcessReply(text) {
  var actions = [];
  var cleanText = text;
  var extras = [];

  // Suporte a MÚLTIPLOS blocos ```json``` na mesma resposta
  var jsonMatches = [];
  var jsonRe = /```json\s*([\s\S]*?)\s*```/g;
  var m;
  while ((m = jsonRe.exec(text)) !== null) {
    jsonMatches.push(m[1]);
  }

  if (jsonMatches.length > 0) {
    cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();
    jsonMatches.forEach(function(jsonStr) {
      try {
        var actionData = JSON.parse(jsonStr);
        var result = _chatExecuteAction(actionData);
        if (result.actions) actions = actions.concat(result.actions);
        if (result.extra) extras.push(result.extra);
      } catch(e) {
        console.warn('chat action parse error:', e, jsonStr.slice(0,100));
      }
    });
    if (extras.length) cleanText = cleanText + (cleanText ? '\n' : '') + extras.join('\n');
  }

  _chatBotReply(cleanText || '✓ Feito!', actions.length ? actions : null);
}

function _chatExecuteAction(data) {
  var result = { actions: [], extra: '' };
  var hoje = td();

  switch(data.action) {

    case 'despesa':
      if (data.desc && data.valor > 0) {
        addTr('out', data.desc, +data.valor);
        result.extra = '✅ Despesa de **R$ ' + fm(data.valor) + '** lançada!';
        result.actions.push({label:'💰 Ver Finanças', fn:'go(4)'});
      }
      break;

    case 'entrada':
      if (data.desc && data.valor > 0) {
        addTr('in', data.desc, +data.valor);
        result.extra = '✅ Entrada de **R$ ' + fm(data.valor) + '** registrada!';
        result.actions.push({label:'💰 Ver Finanças', fn:'go(4)'});
      }
      break;

    case 'areceber':
      if (data.desc && data.valor > 0) {
        var dt = data.data || hoje;
        DB.t.unshift({id:Date.now(), type:'pend', desc:data.desc, value:+data.valor, date:dt});
        DB.sv(); renderFin();
        result.extra = '✅ A receber de **R$ ' + fm(data.valor) + '** para ' + fd(dt) + ' registrado!';
        result.actions.push({label:'💰 Ver A Receber', fn:"go(4);setTimeout(function(){finTab('areceber')},200)"});
      }
      break;

    case 'job':
      if (data.cli && data.desc) {
        var dias = +(data.dias) || 7;
        var end  = addD(hoje, dias);
        var val  = +(data.valor) || 0;
        DB.j.unshift({id:Date.now(), cli:data.cli, desc:data.desc, start:hoje, end:end, value:val, pago:0, obs:data.obs||'', done:false});
        DB.sv(); renderAg(); updUrgDot();
        result.extra = '✅ Job **' + data.cli + '** adicionado! Prazo: ' + fd(end);
        result.actions.push({label:'📅 Ver Agenda', fn:'go(0)'});
      }
      break;

    case 'visita':
      if (data.cli && data.data) {
        _getV().unshift({id:Date.now(), cli:data.cli, tel:data.tel||'', end:data.end||'', date:data.data, hora:data.hora||'', obs:data.obs||'', status:'agendada'});
        _saveV(); renderSecretaria(); secNotifDotUpdate();
        result.extra = '✅ Visita com **' + data.cli + '** em ' + fd(data.data) + (data.hora?' às '+data.hora:'') + '!';
        result.actions.push({label:'📐 Ver Secretária', fn:'go(11)'});
      }
      break;

    case 'pagar_func':
      if (data.funcionario && data.valor > 0) {
        var nomeBusca = (data.funcionario || '').toLowerCase().trim();
        var funcsRH = {};
        try { funcsRH = JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch(eRH) {}
        var listaRH = Object.values(funcsRH);

        var funcEncontrado = listaRH.find(function(f) {
          return f.nome && f.nome.toLowerCase().indexOf(nomeBusca) !== -1;
        });
        if (!funcEncontrado && nomeBusca.length > 2) {
          var palavras = nomeBusca.split(' ');
          funcEncontrado = listaRH.find(function(f) {
            return f.nome && palavras.some(function(p) {
              return p.length > 2 && f.nome.toLowerCase().indexOf(p) !== -1;
            });
          });
        }

        if (!funcEncontrado) {
          var nomes = listaRH.map(function(f){ return f.nome; }).join(', ');
          result.extra = '⚠️ Funcionário **"' + data.funcionario + '"** não encontrado. Cadastrados: ' + (nomes || 'nenhum') + '.';
        } else {
          var pagsRH = {};
          try { pagsRH = JSON.parse(localStorage.getItem('hr_pagamentos') || '{}'); } catch(ePag) {}
          var regsRH = {};
          try { regsRH = JSON.parse(localStorage.getItem('hr_registros') || '{}'); } catch(eR) {}

          var pagId = Date.now().toString(36) + Math.random().toString(36).slice(2,6);
          var pagForma = data.forma || 'dinheiro';
          var pagValor = +data.valor;

          var salarioBase = parseFloat(funcEncontrado.salario) || 0;
          var taxaExtraF = parseFloat(funcEncontrado.taxaHoraExtra) || salarioBase / 220;
          var horasExtra = Object.values(regsRH)
            .filter(function(r){ return r.funcionarioId === funcEncontrado.id; })
            .reduce(function(s,r){ return s + (parseFloat(r.horas)||0); }, 0);
          var totalDevido = salarioBase + (horasExtra * taxaExtraF);
          var totalPagoAntes = Object.values(pagsRH)
            .filter(function(p){ return p.funcionarioId === funcEncontrado.id; })
            .reduce(function(s,p){ return s + (parseFloat(p.valor)||0); }, 0);

          pagsRH[pagId] = {
            id:              pagId,
            funcionarioId:   funcEncontrado.id,
            funcionarioNome: funcEncontrado.nome,
            data:            hoje,
            valor:           pagValor,
            forma:           pagForma,
            obs:             data.obs || 'Lançado via Secretária IA',
            saldoAntes:      totalDevido - totalPagoAntes,
            criadoEm:        new Date().toISOString()
          };
          localStorage.setItem('hr_pagamentos', JSON.stringify(pagsRH));

          var descFin = 'Pagamento ' + funcEncontrado.nome + (pagForma !== 'dinheiro' ? ' (' + pagForma + ')' : '');
          if (typeof addTr === 'function') addTr('out', descFin, pagValor);

          if (typeof HR_FUNC !== 'undefined' && typeof HR_FUNC.renderPaginaFuncionarios === 'function') {
            HR_FUNC.renderPaginaFuncionarios();
          }

          var saldoDepois = totalDevido - totalPagoAntes - pagValor;
          var saldoTxt = saldoDepois > 0.01
            ? ' Ainda deve: **R$ ' + saldoDepois.toFixed(2).replace('.',',') + '**.'
            : saldoDepois < -0.01
              ? ' Crédito de **R$ ' + Math.abs(saldoDepois).toFixed(2).replace('.',',') + '** a favor.'
              : ' Conta **quitada**! ✅';

          result.extra = '✅ Pagamento de **R$ ' + pagValor.toFixed(2).replace('.',',') + '** para **' + funcEncontrado.nome + '** registrado.' + saldoTxt;
          result.actions.push({label:'👷 Ver RH', fn:'if(typeof go==="function")go(30)'});
          result.actions.push({label:'💰 Ver Finanças', fn:'go(4)'});
        }
      } else {
        result.extra = '⚠️ Informe o nome do funcionário e o valor do pagamento.';
      }
      break;

    case 'nav':
      var navMap = {financas:4, agenda:0, historico:7, contratos:3, orcamento:1, rh:30, diagnostico:6};
      var pg = navMap[data.tela];
      if (pg !== undefined) {
        var extraNav = data.tela === 'diagnostico'
          ? ";setTimeout(function(){if(typeof cfgAba===\"function\")cfgAba(9);else{cfgTab=9;if(typeof buildCfg===\"function\")buildCfg();}},300)"
          : '';
        result.actions.push({label:'→ Ir para ' + data.tela, fn:'go(' + pg + ')' + extraNav});
      }
      break;

    case 'job_pago':
      if (data.cli) {
        var busca = (data.cli || '').toLowerCase();
        var jobEncontrado = (DB.j || []).find(function(j) {
          return !j.done && j.cli && j.cli.toLowerCase().indexOf(busca) !== -1;
        });
        if (!jobEncontrado) {
          result.extra = '⚠️ Job de **' + data.cli + '** não encontrado em produção.';
        } else {
          var valPago = +(data.valor) || jobEncontrado.value || 0;
          jobEncontrado.pago = (jobEncontrado.pago || 0) + valPago;
          if (jobEncontrado.pago >= (jobEncontrado.value || 0)) {
            jobEncontrado.done = true;
            result.extra = '✅ Job de **' + jobEncontrado.cli + '** marcado como **concluído e pago**! R$ ' + fm(valPago) + ' registrado.';
          } else {
            result.extra = '✅ Pagamento parcial de **R$ ' + fm(valPago) + '** registrado no job de **' + jobEncontrado.cli + '**. Falta: R$ ' + fm((jobEncontrado.value||0) - jobEncontrado.pago);
          }
          addTr('in', 'Recebimento job — ' + jobEncontrado.cli + (jobEncontrado.desc ? ' | ' + jobEncontrado.desc.slice(0,30) : ''), valPago);
          DB.sv();
          if (typeof renderAg === 'function') renderAg();
          result.actions.push({label:'📅 Ver Agenda', fn:'go(0)'});
          result.actions.push({label:'💰 Ver Finanças', fn:'go(4)'});
        }
      }
      break;

    case 'limpar_diag':
      if (typeof window._diagLimpar === 'function') {
        window._diagLimpar();
        result.extra = '🗑 Logs de diagnóstico limpos!';
      }
      break;
  }

  return result;
}

function _chatBotReply(text, actions) {
  _chat.thinking = false;
  var ts = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  _chat.history.push({ role: 'assistant', content: text, actions: actions || [], ts: ts, _streaming: true });
  _chatSave();
  renderChat();
  _chatScrollBottom();
  // Remover flag de streaming após animação CSS (22ms × ~words delay)
  setTimeout(function() {
    var last = _chat.history[_chat.history.length - 1];
    if (last) delete last._streaming;
  }, 800);
}

// ══════════════════════════════════════════════════════════════
// ÁUDIO — Microfone (hold-to-talk)
// ══════════════════════════════════════════════════════════════
function chatMicStart(e) {
  e.preventDefault();
  if (_chat.recording || _chat.thinking) return;

  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    _chat.recognition = new SR();
    _chat.recognition.lang = 'pt-BR';
    _chat.recognition.continuous = false;
    _chat.recognition.interimResults = false;

    _chat.recognition.onstart  = function() { _chat.recording = true; _chatMicUI(true); };
    _chat.recognition.onresult = function(ev) {
      var transcript = ev.results[0][0].transcript;
      _chatMicUI(false);
      _chat.recording = false;
      if (transcript.trim()) _chatUserMsg(transcript.trim());
    };
    _chat.recognition.onerror = function() { _chatMicUI(false); _chat.recording = false; toast('Não consegui captar o áudio.'); };
    _chat.recognition.onend   = function() { _chat.recording = false; _chatMicUI(false); };
    _chat.recognition.start();
    return;
  }

  navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
    _chat.recording = true;
    _chat.audioChunks = [];
    _chatMicUI(true);
    _chat.mediaRecorder = new MediaRecorder(stream);
    _chat.mediaRecorder.ondataavailable = function(e) { if (e.data.size > 0) _chat.audioChunks.push(e.data); };
    _chat.mediaRecorder.onstop = function() { stream.getTracks().forEach(function(t){ t.stop(); }); _chatProcessAudio(); };
    _chat.mediaRecorder.start();
  }).catch(function() { toast('Permissão de microfone negada.'); _chatMicUI(false); });
}

function chatMicStop(e) {
  e.preventDefault();
  if (!_chat.recording) return;
  _chat.recording = false;
  _chatMicUI(false);
  if (_chat.recognition) { _chat.recognition.stop(); return; }
  if (_chat.mediaRecorder && _chat.mediaRecorder.state !== 'inactive') _chat.mediaRecorder.stop();
}

function _chatProcessAudio() {
  if (!_chat.audioChunks.length) return;
  var blob = new Blob(_chat.audioChunks, {type:'audio/webm'});
  var key = CFG && CFG.emp && CFG.emp.apiKey;
  if (!key) { toast('Configure a chave API para usar transcrição.'); return; }

  var statusEl = document.getElementById('chatMicStatus');
  if (statusEl) statusEl.textContent = '🎙 Transcrevendo...';

  var form = new FormData();
  form.append('file', blob, 'audio.webm');
  form.append('model', 'whisper-1');
  form.append('language', 'pt');

  fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + key },
    body: form
  })
  .then(function(r){ return r.json(); })
  .then(function(d) {
    if (statusEl) statusEl.textContent = '';
    var text = d.text || '';
    if (text.trim()) _chatUserMsg(text.trim());
    else toast('Não consegui entender. Tente novamente.');
  })
  .catch(function() {
    if (statusEl) statusEl.textContent = '';
    toast('Erro na transcrição. Tente digitar.');
  });
}

function _chatMicUI(recording) {
  var btn = document.getElementById('chatMicBtn');
  var status = document.getElementById('chatMicStatus');
  if (btn) { btn.classList.toggle('recording', recording); btn.textContent = recording ? '⏹' : '🎙'; }
  if (status) { status.textContent = recording ? '🔴 Gravando... solte para enviar' : ''; }
}

// ══════════════════════════════════════════════════════════════
// ESTILOS
// ══════════════════════════════════════════════════════════════
function _injectChatStyles() {
  if (document.getElementById('chatStyle')) return;
  var s = document.createElement('style');
  s.id = 'chatStyle';
  s.textContent = `
    @keyframes chatFadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
    @keyframes chatDot     { 0%,80%,100%{transform:scale(0);opacity:.25} 40%{transform:scale(1);opacity:1} }
    @keyframes chatPulse   { 0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.6)} 70%{box-shadow:0 0 0 8px rgba(248,113,113,0)} }
    @keyframes chatSlideIn { from{opacity:0;transform:translateX(-6px)} to{opacity:1;transform:none} }
    @keyframes chatShimmer { 0%{background-position:200%} 100%{background-position:-200%} }

    /* ── Wrap ── */
    .chat-wrap { display:flex;flex-direction:column;height:100%;min-height:0;background:var(--s1); }

    /* ── Header ── */
    .chat-header {
      display:flex;align-items:center;gap:12px;padding:12px 16px 10px;
      border-bottom:1px solid var(--bd);background:var(--s2);flex-shrink:0;
    }
    .chat-avatar {
      width:42px;height:42px;border-radius:50%;
      background:linear-gradient(135deg,#c9a84c,#7a5c20);
      display:flex;align-items:center;justify-content:center;
      font-size:20px;position:relative;flex-shrink:0;
      box-shadow:0 2px 8px rgba(201,168,76,.3);
    }
    .chat-avatar-dot {
      position:absolute;bottom:1px;right:1px;width:11px;height:11px;
      border-radius:50%;background:#4ade80;border:2px solid var(--s2);
    }
    .chat-header-info { flex:1; }
    .chat-header-name { font-size:.9rem;font-weight:700;color:var(--t1); }
    .chat-header-sub  { font-size:.62rem;color:var(--t3);margin-top:1px; }
    .chat-clear-btn {
      background:none;border:1px solid var(--bd);border-radius:8px;
      padding:5px 8px;color:var(--t4);font-size:.8rem;cursor:pointer;
      transition:border-color .15s,color .15s;
    }
    .chat-clear-btn:hover { border-color:var(--bd2);color:var(--t2); }

    /* ── Mensagens ── */
    .chat-messages {
      flex:1;min-height:0;overflow-y:auto;padding:14px 14px 6px;
      display:flex;flex-direction:column;gap:10px;
    }
    .chat-bubble {
      max-width:88%;border-radius:18px;padding:11px 14px;
      animation:chatFadeUp .22s ease;line-height:1.6;font-size:.83rem;
    }
    .chat-bubble-user {
      align-self:flex-end;
      background:linear-gradient(135deg,rgba(201,168,76,.18),rgba(201,168,76,.10));
      border:1px solid rgba(201,168,76,.28);color:var(--t1);
      border-bottom-right-radius:4px;
    }
    .chat-bubble-bot {
      align-self:flex-start;background:var(--s3);
      border:1px solid var(--bd);color:var(--t1);border-bottom-left-radius:4px;
    }
    .chat-bubble-text strong { color:var(--gold2);font-weight:700; }
    .chat-bubble-text code {
      background:rgba(255,255,255,.08);border-radius:4px;
      padding:1px 5px;font-family:'Courier New',monospace;font-size:.78rem;
    }
    .chat-bubble-ts { font-size:.58rem;color:var(--t4);margin-top:5px;text-align:right; }

    /* Listas inline */
    .chat-li {
      display:block;padding-left:14px;position:relative;margin:2px 0;
    }
    .chat-li::before { content:'•';position:absolute;left:2px;color:var(--gold2); }

    /* Valores monetários */
    .chat-val { color:var(--gold2);font-weight:600; }

    /* ── Thinking ── */
    .chat-thinking {
      display:flex;align-items:center;gap:8px;
      padding:11px 14px;background:var(--s3);border:1px solid var(--bd);
      border-radius:18px;border-bottom-left-radius:4px;align-self:flex-start;
      max-width:88%;
    }
    .chat-thinking-inner { display:flex;gap:4px;align-items:center; }
    .chat-thinking-inner span {
      width:7px;height:7px;border-radius:50%;background:var(--gold2);display:inline-block;
    }
    .chat-thinking-inner span:nth-child(1){animation:chatDot 1.2s .0s infinite;}
    .chat-thinking-inner span:nth-child(2){animation:chatDot 1.2s .2s infinite;}
    .chat-thinking-inner span:nth-child(3){animation:chatDot 1.2s .4s infinite;}
    .chat-thinking-label { font-size:.72rem;color:var(--t3);font-style:italic; }

    /* ── Ações ── */
    .chat-actions { display:flex;flex-wrap:wrap;gap:6px;margin-top:9px; }
    .chat-action-btn {
      background:rgba(201,168,76,.10);border:1px solid rgba(201,168,76,.28);
      border-radius:20px;padding:5px 13px;color:var(--gold2);
      font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;
      transition:background .15s,border-color .15s;
    }
    .chat-action-btn:hover  { background:rgba(201,168,76,.2); }
    .chat-action-btn:active { background:rgba(201,168,76,.3); }

    /* ── Chips de atalho ── */
    .chat-chips {
      display:flex;gap:7px;overflow-x:auto;padding:8px 14px 6px;
      flex-shrink:0;scrollbar-width:none;
    }
    .chat-chips::-webkit-scrollbar { display:none; }
    .chat-chip {
      flex-shrink:0;white-space:nowrap;
      background:var(--s3);border:1px solid var(--bd);
      border-radius:20px;padding:5px 12px;
      color:var(--t2);font-size:.72rem;font-family:inherit;
      cursor:pointer;transition:background .15s,border-color .15s,color .15s;
      animation:chatSlideIn .2s ease;
    }
    .chat-chip:hover  { background:rgba(201,168,76,.12);border-color:rgba(201,168,76,.3);color:var(--gold2); }
    .chat-chip:active { background:rgba(201,168,76,.22); }

    /* ── Input ── */
    .chat-input-area {
      padding:10px 14px 16px;border-top:1px solid var(--bd);
      background:var(--s2);flex-shrink:0;
    }
    .chat-input-row { display:flex;align-items:flex-end;gap:8px; }
    .chat-input {
      flex:1;background:var(--s3);border:1px solid var(--bd);border-radius:22px;
      padding:10px 16px;color:var(--t1);font-size:.83rem;font-family:inherit;
      resize:none;outline:none;line-height:1.4;max-height:120px;overflow-y:auto;
      transition:border-color .2s,box-shadow .2s;
    }
    .chat-input:focus {
      border-color:rgba(201,168,76,.45);
      box-shadow:0 0 0 3px rgba(201,168,76,.08);
    }
    .chat-input::placeholder { color:var(--t4); }
    .chat-send-btn {
      width:40px;height:40px;border-radius:50%;flex-shrink:0;
      background:linear-gradient(135deg,#c9a84c,#7a5c20);
      border:none;color:#000;font-size:.9rem;font-weight:900;
      cursor:pointer;display:flex;align-items:center;justify-content:center;
      transition:opacity .15s,transform .1s;box-shadow:0 2px 8px rgba(201,168,76,.3);
    }
    .chat-send-btn:active { opacity:.85;transform:scale(.94); }
    .chat-mic-btn {
      width:40px;height:40px;border-radius:50%;flex-shrink:0;
      background:var(--s3);border:1px solid var(--bd);
      color:var(--t2);font-size:1.1rem;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all .15s;user-select:none;-webkit-user-select:none;
    }
    .chat-mic-btn.recording {
      background:rgba(248,113,113,.2);border-color:rgba(248,113,113,.5);
      animation:chatPulse 1s infinite;
    }
    .chat-mic-status { font-size:.68rem;color:#f87171;text-align:center;min-height:16px;margin-top:4px; }
  `;
  document.head.appendChild(s);
}
