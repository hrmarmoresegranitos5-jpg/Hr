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
  try { localStorage.setItem('hr_chat', JSON.stringify(_chat.history.slice(-60))); } catch(e) {}
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
function renderChat() {
  var el = document.getElementById('chatBody');
  if (!el) return;
  _chatLoad();
  _injectChatStyles();

  var h = '';
  h += '<div class="chat-wrap">';

  // Header
  h += '<div class="chat-header">';
  h += '<div class="chat-avatar"><span>🤖</span><div class="chat-avatar-dot"></div></div>';
  h += '<div class="chat-header-info"><div class="chat-header-name">Secretária HR</div>';
  h += '<div class="chat-header-sub">Acesso total ao sistema · Monitorando erros</div></div>';
  h += '<button class="chat-clear-btn" onclick="chatClear()" title="Limpar conversa">🗑</button>';
  h += '</div>';

  // Mensagens
  h += '<div class="chat-messages" id="chatMessages">';
  if (!_chat.history.length) {
    h += _chatBubbleBot(
      '👋 Olá! Sou a secretária da HR Mármores. Tenho **acesso completo** ao sistema:\n\n' +
      '• 📋 Orçamentos, jobs e agenda\n' +
      '• 💰 Finanças, despesas e recebimentos\n' +
      '• 👷 Funcionários, horas extras e pagamentos\n' +
      '• 🔍 **Diagnóstico de erros do sistema** — monitoro tudo em tempo real\n' +
      '• 📊 Relatórios completos\n\n' +
      'Pode perguntar qualquer coisa ou usar o microfone 🎙',
      [{label:'🔍 Ver diagnóstico', fn:'go(6);setTimeout(function(){if(typeof cfgAba==="function")cfgAba(9);else{cfgTab=9;if(typeof buildCfg==="function")buildCfg();}},300)'}],
      null
    );
  } else {
    _chat.history.forEach(function(msg) {
      if (msg.role === 'user') {
        h += _chatBubbleUser(msg.content, msg.ts);
      } else {
        h += _chatBubbleBot(msg.content, msg.actions || null, msg.ts, msg.isAlerta);
      }
    });
  }
  if (_chat.thinking) {
    h += '<div class="chat-bubble chat-bubble-bot chat-thinking" id="chatThinking">';
    h += '<span></span><span></span><span></span>';
    h += '</div>';
  }
  h += '</div>';

  // Input
  h += '<div class="chat-input-area">';
  h += '<div class="chat-input-row">';
  h += '<textarea id="chatInput" class="chat-input" placeholder="Mensagem..." rows="1" ' +
       'onkeydown="chatInputKey(event)" oninput="chatInputResize(this)"></textarea>';
  h += '<button class="chat-mic-btn" id="chatMicBtn" ontouchstart="chatMicStart(event)" ontouchend="chatMicStop(event)" ' +
       'onmousedown="chatMicStart(event)" onmouseup="chatMicStop(event)">🎙</button>';
  h += '<button class="chat-send-btn" id="chatSendBtn" onclick="chatSend()">▶</button>';
  h += '</div>';
  h += '<div class="chat-mic-status" id="chatMicStatus"></div>';
  h += '</div>';

  h += '</div>';
  el.innerHTML = h;
  _chatScrollBottom();
}

function _chatBubbleUser(text, ts) {
  return '<div class="chat-bubble chat-bubble-user">' +
    '<div class="chat-bubble-text">' + escH(text) + '</div>' +
    (ts ? '<div class="chat-bubble-ts">' + ts + '</div>' : '') +
    '</div>';
}

function _chatBubbleBot(text, actions, ts, isAlerta) {
  var formatted = _chatFormatText(text);
  var alertaCss = isAlerta ? 'border-left:3px solid #ef4444;' : '';
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

function _chatFormatText(text) {
  return escH(text)
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

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

  // ── Finanças ──
  var recMes  = (DB.t||[]).filter(function(t){ return t.type==='in'   && (t.date||'').slice(0,7)===mes; }).reduce(function(s,t){ return s+(t.value||0); }, 0);
  var despMes = (DB.t||[]).filter(function(t){ return t.type==='out'  && (t.date||'').slice(0,7)===mes; }).reduce(function(s,t){ return s+(t.value||0); }, 0);
  var fixos   = (CFG.fixos||[]).reduce(function(s,f){ return s+(f.v||0); }, 0);

  // ── Jobs ──
  var jobs = (DB.j||[]).filter(function(j){ return !j.done; }).slice(0,15).map(function(j){
    var diff = dDiff(j.end);
    return j.cli + ' | ' + j.desc + ' | prazo: ' + (j.end||'?') + (diff < 0 ? ' (ATRASADO '+Math.abs(diff)+'d)' : ' (em '+diff+'d)') + ' | R$ ' + fm(j.value||0);
  });

  // ── A receber ──
  var pendentes = (DB.t||[]).filter(function(t){ return t.type==='pend'; }).slice(0,10).map(function(t){
    return t.desc + ' | R$ ' + fm(t.value||0) + ' | vence: ' + (t.date||'?');
  });

  // ── Visitas ──
  var visitas = (_getV ? _getV() : []).filter(function(v){ return v.status==='agendada'; }).slice(0,5).map(function(v){
    return v.cli + ' | ' + v.date + (v.hora?' às '+v.hora:'') + (v.end?' | '+v.end:'');
  });

  // ── Motor de análise inteligente de clientes ──
  var cliPerfilMap = {};

  // Agrupa orçamentos por cliente
  (DB.q||[]).forEach(function(q){
    if(!q.cli) return;
    var c = cliPerfilMap[q.cli] = cliPerfilMap[q.cli] || {nome:q.cli, orcamentos:0, jobs:0, totalVendas:0, totalCusto:0, totalM2:0, mats:{}};
    c.orcamentos++;
    c.totalVendas += (q.vista||0);
    c.totalCusto  += (q._custoPainel||0);
    c.totalM2     += (q.m2||0);
    if(q.mat) c.mats[q.mat] = (c.mats[q.mat]||0) + 1;
  });

  // Agrupa jobs por cliente
  (DB.j||[]).forEach(function(j){
    if(!j.cli) return;
    var c = cliPerfilMap[j.cli] = cliPerfilMap[j.cli] || {nome:j.cli, orcamentos:0, jobs:0, totalVendas:0, totalCusto:0, totalM2:0, mats:{}};
    c.jobs++;
    c.totalVendas += (j.value||0);
  });

  // Calcula margem e desconto máximo seguro para cada cliente
  var cliPerfilList = Object.values(cliPerfilMap).sort(function(a,b){ return b.totalVendas - a.totalVendas; }).slice(0,20).map(function(c){
    var transacoes  = c.orcamentos + c.jobs;
    var margem      = c.totalCusto > 0 ? ((c.totalVendas - c.totalCusto) / c.totalVendas * 100) : null;
    var matTop      = Object.keys(c.mats).sort(function(a,b){ return c.mats[b]-c.mats[a]; })[0] || '';

    // Classificação de fidelidade
    var fidelidade = transacoes >= 8 ? 'VIP' : transacoes >= 5 ? 'Fiel' : transacoes >= 3 ? 'Recorrente' : 'Novo';

    // Desconto máximo seguro: margem precisa ficar acima de 25%
    var descMaxPct = 0;
    if(margem !== null && margem > 28) {
      descMaxPct = Math.min(Math.floor(margem - 25), fidelidade==='VIP'?15:fidelidade==='Fiel'?10:fidelidade==='Recorrente'?5:3);
    } else if(margem === null) {
      // Sem dados de custo: usar apenas fidelidade
      descMaxPct = fidelidade==='VIP'?8:fidelidade==='Fiel'?5:fidelidade==='Recorrente'?3:0;
    }

    var linha = c.nome + ' [' + fidelidade + ']';
    linha += ' | ' + transacoes + ' pedido(s) | total R$ ' + fm(c.totalVendas);
    if(c.totalM2 > 0) linha += ' | ' + c.totalM2.toFixed(1) + ' m²';
    if(matTop) linha += ' | mat. fav: ' + matTop;
    if(margem !== null) linha += ' | margem histórica: ' + margem.toFixed(1) + '%';
    if(descMaxPct > 0) linha += ' | DESCONTO MÁXIMO SEGURO: ' + descMaxPct + '%';
    else linha += ' | margem insuficiente p/ desconto';
    return linha;
  });

  return 'DADOS HR MÁRMORES — hoje: ' + hoje + '\n' +
    'Faturado este mês: R$ ' + fm(recMes) + ' | Despesas: R$ ' + fm(despMes) + ' | Custos fixos: R$ ' + fm(fixos) + '\n\n' +
    'JOBS EM PRODUÇÃO (' + jobs.length + '):\n' + (jobs.join('\n') || 'Nenhum') + '\n\n' +
    'A RECEBER (' + pendentes.length + '):\n' + (pendentes.join('\n') || 'Nenhum') + '\n\n' +
    'VISITAS AGENDADAS:\n' + (visitas.join('\n') || 'Nenhuma') + '\n\n' +
    'PERFIL DE CLIENTES (análise automática de margem e desconto):\n' + (cliPerfilList.join('\n') || 'Nenhum cliente com histórico') + '\n\n' +
    _chatBuildRHContext() + '\n\n' +
    _chatBuildDiagContext();
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
    return 'DIAGNÓSTICO: erro ao ler logs — ' + e.message;
  }
}

// ── Prompt do sistema completo ────────────────────────────
function _chatBuildSystem() {
  return 'Você é a Secretária IA da HR Mármores e Granitos — empresa de mármores e granitos em Pilão Arcado-BA.\n' +
    'Você tem ACESSO TOTAL e CONHECIMENTO COMPLETO do aplicativo de gestão, incluindo código-fonte, logs de erro e todos os módulos.\n\n' +

    '═══ MÓDULOS QUE VOCÊ CONHECE ═══\n' +
    '• app-core.js (680KB) — lógica principal: CFG, DB, orçamentos, catálogos, pedras\n' +
    '• app-config.js — configurações da empresa, API Keys, equipe\n' +
    '• app-funcionarios.js — módulo HR_FUNC: cadastro, registros de ponto, horas extras, pagamentos\n' +
    '• app-horas-extras-pdf.js — relatório PDF de horas extras por funcionário\n' +
    '• app-secretaria.js — agendamento de visitas, notificações push\n' +
    '• app-autobackup.js — snapshots automáticos, sync Supabase\n' +
    '• app-diagnostico.js — captura erros JS em tempo real, painel de diagnóstico\n' +
    '• app-financas.js — finanças detalhadas\n' +
    '• app-dashboard.js — resumo executivo\n' +
    '• app-tumulos.js / app-tum-inline.js / app-tum-integracao.js — módulo túmulos\n' +
    '• app-agenda.js — agenda completa\n' +
    '• pwa.js + sw.js — service worker, funciona offline\n\n' +

    '═══ CHAVES DE DADOS (localStorage) ═══\n' +
    '• hr_cfg — configurações (CFG)\n' +
    '• hr_funcionarios — cadastro de funcionários\n' +
    '• hr_registros — registros de ponto e horas extras\n' +
    '• hr_pagamentos — histórico de pagamentos\n' +
    '• hr_v — visitas agendadas\n' +
    '• hr_chat — histórico do chat\n' +
    '• hr_ab_snaps — snapshots de backup\n\n' +

    '═══ AÇÕES DISPONÍVEIS ═══\n' +
    'Quando o usuário pedir, retorne JSON de ação dentro de ```json ... ```:\n' +
    '1. Despesa:    {"action":"despesa","desc":"...","valor":100}\n' +
    '2. Entrada:    {"action":"entrada","desc":"...","valor":100}\n' +
    '3. A receber:  {"action":"areceber","desc":"...","valor":100,"data":"YYYY-MM-DD"}\n' +
    '4. Job:        {"action":"job","cli":"...","desc":"...","dias":10,"valor":500}\n' +
    '5. Visita:     {"action":"visita","cli":"...","data":"YYYY-MM-DD","hora":"09:00","end":"..."}\n' +
    '6. Pagar func: {"action":"pagar_func","funcionario":"nome","valor":500,"forma":"dinheiro"}\n' +
    '7. Navegar:    {"action":"nav","tela":"financas|agenda|historico|contratos|orcamento|rh|diagnostico"}\n' +
    '8. Limpar logs:{"action":"limpar_diag"}\n' +
    '9. Desconto:   {"action":"desconto_analise","cli":"nome do cliente"}\n\n' +

    '═══ DIAGNÓSTICO — COMO INTERPRETAR ═══\n' +
    'Quando o contexto mostrar erros no DIAGNÓSTICO DO SISTEMA:\n' +
    '• Explique o erro em linguagem simples ao dono\n' +
    '• Diga em qual arquivo e linha aconteceu\n' +
    '• Sugira a solução prática\n' +
    '• "SyntaxError: Unexpected end of input" — geralmente localStorage corrompido ou JS truncado\n' +
    '• "TypeError: Cannot read prop..." — objeto acessado antes de carregar\n' +
    '• "ReferenceError: X is not defined" — arquivo JS não carregou na ordem certa\n' +
    '• Erros de rede/fetch — verificar conexão ou API key\n\n' +

    '═══ PERFIL DE CLIENTES — COMO USAR ═══\n' +
    'O contexto inclui PERFIL DE CLIENTES com análise automática calculada pelo sistema:\n' +
    '• [VIP] = 8+ pedidos | [Fiel] = 5-7 | [Recorrente] = 3-4 | [Novo] = 1-2\n' +
    '• "DESCONTO MÁXIMO SEGURO: X%" = calculado para manter margem ≥ 25%\n' +
    '• "margem insuficiente p/ desconto" = NÃO ofereça desconto nesse cliente\n' +
    'Quando alguém perguntar sobre desconto para um cliente nomeado:\n' +
    '  1. Localize o cliente no PERFIL DE CLIENTES (busca por nome parcial)\n' +
    '  2. Informe a classificação, histórico e o desconto máximo seguro calculado\n' +
    '  3. Sugira o desconto de forma proativa: "posso oferecer até X% com segurança"\n' +
    '  4. Se o cliente não estiver no perfil = cliente novo = desconto apenas se margem do projeto atual permitir\n\n' +

    '═══ REGRAS DE RESPOSTA ═══\n' +
    '- Responda SEMPRE em português brasileiro, tom profissional mas amigável\n' +
    '- Máximo 5 linhas por resposta (exceto diagnósticos técnicos)\n' +
    '- Quando executar ação, confirme com valores e nomes\n' +
    '- Se detectar erros no contexto de diagnóstico, mencione proativamente\n' +
    '- Extraia valores naturais: "trezentos reais" = 300, "1.500" = 1500\n' +
    '- Para orçamentos detalhados, oriente a usar a tela de Orçamento\n\n' +

    'FORMATO quando executar ação:\n' +
    'Texto da resposta amigável\n' +
    '```json\n{"action":"...","campo":"valor"}\n```';
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
  _chat.history.slice(-10).forEach(function(m) {
    if (m.role === 'user' || m.role === 'assistant') {
      apiMessages.push({role: m.role, content: m.content});
    }
  });

  fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
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
  .catch(function(e) {
    // Fallback Groq
    var groqKey = key;
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 800,
        messages: [{role:'system', content: systemPrompt}].concat(
          _chat.history.slice(-8).map(function(m){
            return {role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content};
          })
        )
      })
    })
    .then(function(r){ return r.json(); })
    .then(function(d) {
      var text = d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content;
      if (!text) throw new Error('Sem resposta');
      _chatProcessReply(text);
    })
    .catch(function(err) {
      _chatBotReply('⚠️ Erro de conexão. Verifique sua internet e tente novamente.', null);
      console.warn('chat API error:', err);
    });
  });
}

// ══════════════════════════════════════════════════════════════
// PROCESSAR RESPOSTA + EXECUTAR AÇÕES
// ══════════════════════════════════════════════════════════════
function _chatProcessReply(text) {
  var actions = [];
  var cleanText = text;

  var jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    cleanText = text.replace(/```json[\s\S]*?```/g, '').trim();
    try {
      var actionData = JSON.parse(jsonMatch[1]);
      var result = _chatExecuteAction(actionData);
      if (result.actions) actions = result.actions;
      if (result.extra) cleanText = cleanText + (cleanText ? '\n' : '') + result.extra;
    } catch(e) {
      console.warn('chat action parse error:', e);
    }
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

    case 'limpar_diag':
      if (typeof window._diagLimpar === 'function') {
        window._diagLimpar();
        result.extra = '🗑 Logs de diagnóstico limpos!';
      }
      break;

    case 'desconto_analise':
      if (data.cli) {
        var busca = (data.cli || '').toLowerCase().trim();
        var cliStatsDisc = {};
        (DB.q||[]).forEach(function(q){
          if(!q.cli) return;
          var c = cliStatsDisc[q.cli] = cliStatsDisc[q.cli] || {nome:q.cli,orcamentos:0,jobs:0,totalVendas:0,totalCusto:0,totalM2:0};
          c.orcamentos++; c.totalVendas+=(q.vista||0); c.totalCusto+=(q._custoPainel||0); c.totalM2+=(q.m2||0);
        });
        (DB.j||[]).forEach(function(j){
          if(!j.cli) return;
          var c = cliStatsDisc[j.cli] = cliStatsDisc[j.cli] || {nome:j.cli,orcamentos:0,jobs:0,totalVendas:0,totalCusto:0,totalM2:0};
          c.jobs++; c.totalVendas+=(j.value||0);
        });
        var cliEnc = Object.values(cliStatsDisc).find(function(c){ return c.nome.toLowerCase().indexOf(busca)!==-1; });
        if (!cliEnc) {
          result.extra = '📊 Cliente **"'+data.cli+'"** não tem histórico ainda. Para clientes novos, o desconto depende da margem do projeto atual (recomendo abrir o orçamento na tela de Orçamento).';
        } else {
          var tr = cliEnc.orcamentos + cliEnc.jobs;
          var fid = tr>=8?'VIP':tr>=5?'Fiel':tr>=3?'Recorrente':'Novo';
          var mgPct = cliEnc.totalCusto>0 ? ((cliEnc.totalVendas-cliEnc.totalCusto)/cliEnc.totalVendas*100) : null;
          var descMax = 0;
          if(mgPct!==null && mgPct>28){
            descMax=Math.min(Math.floor(mgPct-25),fid==='VIP'?15:fid==='Fiel'?10:fid==='Recorrente'?5:3);
          } else if(mgPct===null){
            descMax=fid==='VIP'?8:fid==='Fiel'?5:fid==='Recorrente'?3:0;
          }
          var txt = '📊 **Análise: '+cliEnc.nome+'** ['+fid+']\n';
          txt += '• '+tr+' pedido(s) | Total histórico: R$ '+fm(cliEnc.totalVendas);
          if(cliEnc.totalM2>0) txt += ' | '+cliEnc.totalM2.toFixed(1)+' m²';
          txt += '\n';
          if(mgPct!==null) txt += '• Margem histórica: '+mgPct.toFixed(1)+'%\n';
          if(descMax>0) txt += '✅ **Desconto máximo seguro: '+descMax+'%** (margem fica ≥25%)';
          else txt += '⚠️ Margem insuficiente para desconto neste cliente.';
          result.extra = txt;
          result.actions.push({label:'📋 Ver Orçamentos', fn:'go(7)'});
        }
      }
      break;
  }

  return result;
}

function _chatBotReply(text, actions) {
  _chat.thinking = false;
  var ts = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  _chat.history.push({ role: 'assistant', content: text, actions: actions || [], ts: ts });
  _chatSave();
  renderChat();
  _chatScrollBottom();
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
    @keyframes chatFadeUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
    @keyframes chatDot { 0%,80%,100%{transform:scale(0);opacity:.3} 40%{transform:scale(1);opacity:1} }
    @keyframes chatPulse { 0%,100%{box-shadow:0 0 0 0 rgba(248,113,113,.6)} 70%{box-shadow:0 0 0 8px rgba(248,113,113,0)} }

    .chat-wrap { display:flex;flex-direction:column;height:calc(100vh - 120px);background:var(--s1); }

    .chat-header { display:flex;align-items:center;gap:12px;padding:14px 16px 10px;border-bottom:1px solid var(--bd);background:var(--s2);flex-shrink:0; }
    .chat-avatar { width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#c9a84c,#a07830);display:flex;align-items:center;justify-content:center;font-size:20px;position:relative;flex-shrink:0; }
    .chat-avatar-dot { position:absolute;bottom:1px;right:1px;width:10px;height:10px;border-radius:50%;background:#4ade80;border:2px solid var(--s2); }
    .chat-header-info { flex:1; }
    .chat-header-name { font-size:.9rem;font-weight:700;color:var(--t1); }
    .chat-header-sub  { font-size:.62rem;color:var(--t3);margin-top:1px; }
    .chat-clear-btn { background:none;border:1px solid var(--bd);border-radius:8px;padding:5px 8px;color:var(--t4);font-size:.8rem;cursor:pointer; }

    .chat-messages { flex:1;overflow-y:auto;padding:14px 14px 6px;display:flex;flex-direction:column;gap:10px; }
    .chat-bubble { max-width:85%;border-radius:16px;padding:10px 13px;animation:chatFadeUp .25s ease;line-height:1.55;font-size:.82rem; }
    .chat-bubble-user { align-self:flex-end;background:linear-gradient(135deg,#c9a84c22,#c9a84c18);border:1px solid #c9a84c33;color:var(--t1);border-bottom-right-radius:4px; }
    .chat-bubble-bot  { align-self:flex-start;background:var(--s3);border:1px solid var(--bd);color:var(--t1);border-bottom-left-radius:4px; }
    .chat-bubble-text strong { color:var(--gold2);font-weight:700; }
    .chat-bubble-text code { background:rgba(255,255,255,.08);border-radius:4px;padding:1px 5px;font-family:'Courier New',monospace;font-size:.78rem; }
    .chat-bubble-ts { font-size:.58rem;color:var(--t4);margin-top:5px;text-align:right; }

    .chat-thinking { display:flex;align-items:center;gap:4px;padding:12px 16px; }
    .chat-thinking span { width:7px;height:7px;border-radius:50%;background:var(--t3);display:inline-block; }
    .chat-thinking span:nth-child(1){animation:chatDot 1.2s .0s infinite;}
    .chat-thinking span:nth-child(2){animation:chatDot 1.2s .2s infinite;}
    .chat-thinking span:nth-child(3){animation:chatDot 1.2s .4s infinite;}

    .chat-actions { display:flex;flex-wrap:wrap;gap:6px;margin-top:8px; }
    .chat-action-btn { background:rgba(201,168,76,.12);border:1px solid rgba(201,168,76,.3);border-radius:20px;padding:5px 12px;color:var(--gold2);font-size:.72rem;font-weight:700;cursor:pointer;font-family:inherit;transition:background .15s; }
    .chat-action-btn:active { background:rgba(201,168,76,.25); }

    .chat-input-area { padding:10px 14px 16px;border-top:1px solid var(--bd);background:var(--s2);flex-shrink:0; }
    .chat-input-row { display:flex;align-items:flex-end;gap:8px; }
    .chat-input { flex:1;background:var(--s3);border:1px solid var(--bd);border-radius:22px;padding:10px 16px;color:var(--t1);font-size:.83rem;font-family:inherit;resize:none;outline:none;line-height:1.4;max-height:120px;overflow-y:auto;transition:border .2s; }
    .chat-input:focus { border-color:rgba(201,168,76,.4); }
    .chat-input::placeholder { color:var(--t4); }
    .chat-send-btn { width:40px;height:40px;border-radius:50%;flex-shrink:0;background:linear-gradient(135deg,#c9a84c,#a07830);border:none;color:#000;font-size:1rem;font-weight:900;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .15s; }
    .chat-send-btn:active { opacity:.8; }
    .chat-mic-btn { width:40px;height:40px;border-radius:50%;flex-shrink:0;background:var(--s3);border:1px solid var(--bd);color:var(--t2);font-size:1.1rem;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;user-select:none;-webkit-user-select:none; }
    .chat-mic-btn.recording { background:rgba(248,113,113,.2);border-color:rgba(248,113,113,.5);animation:chatPulse 1s infinite; }
    .chat-mic-status { font-size:.68rem;color:#f87171;text-align:center;min-height:16px;margin-top:4px; }
  `;
  document.head.appendChild(s);
}
