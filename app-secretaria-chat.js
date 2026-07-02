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
  pendingImage: null,   // { base64, mediaType, previewUrl, name }
  thinking: false,
  recognition: null
};

// ── Salva/carrega histórico ──────────────────────────────────

// ── ID único anti-colisão ─────────────────────────────────────

// ── _dbSv() seguro — avisa se localStorage estiver cheio ──────
function _dbSv() {
  try {
    localStorage.setItem('hr_db', JSON.stringify(DB));
  } catch(e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      if (typeof toast === 'function') {
        toast('⚠️ Armazenamento cheio! Faça um backup agora.', 'error');
      } else {
        alert('⚠️ Armazenamento cheio! Vá em Configurações e exporte um backup.');
      }
      console.error('localStorage quota exceeded:', e);
    } else {
      console.error('_dbSv() error:', e);
    }
  }
}

function _genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function _chatLoad() {
  try { _chat.history = JSON.parse(localStorage.getItem('hr_chat') || '[]'); } catch(e) { _chat.history = []; }
  // Remove mensagens proativas órfãs (app fechou antes da resposta chegar)
  _chat.history = _chat.history.filter(function(m) { return !m._pending; });
}
function _chatSave() {
  try { localStorage.setItem('hr_chat', JSON.stringify(_chat.history.slice(-100))); } catch(e) {}
}

// ══════════════════════════════════════════════════════════════
// SECRETÁRIA PROATIVA — mensagem automática ao abrir
// ══════════════════════════════════════════════════════════════
var _secProativ = {
  COOLDOWN_MS: 4 * 60 * 60 * 1000  // 4 horas entre mensagens proativas
};

function _secProativCheck() {
  // Só dispara se tiver chave configurada
  var key = CFG && CFG.emp && CFG.emp.apiKey;
  if (!key) return;

  // Verifica cooldown — evita disparar toda vez que o usuário navega
  var ultimaTs = 0;
  try { ultimaTs = parseInt(localStorage.getItem('hr_sec_proativ_ts') || '0'); } catch(e) {}
  var agora = Date.now();
  if (agora - ultimaTs < _secProativ.COOLDOWN_MS) return;

  // Coleta dados reais do sistema
  var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0, 10);
  var jobsAtrasados = ((typeof DB !== 'undefined' && DB.j) ? DB.j : [])
    .filter(function(j) { return !j.done && j.end && j.end < hoje; });
  var entregasHoje = ((typeof DB !== 'undefined' && DB.j) ? DB.j : [])
    .filter(function(j) { return !j.done && j.end === hoje; });
  var pendVenc = ((typeof DB !== 'undefined' && DB.t) ? DB.t : [])
    .filter(function(t) { return t.type === 'pend' && t.date && t.date < hoje; });
  var pendTotal = ((typeof DB !== 'undefined' && DB.t) ? DB.t : [])
    .filter(function(t) { return t.type === 'pend'; });
  var visitasHoje = (typeof _getV === 'function' ? _getV() : [])
    .filter(function(v) { return v.status === 'agendada' && v.date === hoje; });
  var jobsUrgentes = ((typeof DB !== 'undefined' && DB.j) ? DB.j : [])
    .filter(function(j) { return !j.done && j.urgente; });

  // Só dispara se houver algo relevante a comunicar
  var temAlgo = jobsAtrasados.length || entregasHoje.length || pendVenc.length || visitasHoje.length || jobsUrgentes.length;
  if (!temAlgo) return;

  // Monta prompt focado e cirúrgico
  var hora = new Date().getHours();
  var saudacao = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite';

  var situacao = [];
  if (jobsAtrasados.length) {
    situacao.push(jobsAtrasados.length + ' job(s) em atraso: ' +
      jobsAtrasados.slice(0, 3).map(function(j) {
        var dias = Math.abs((typeof dDiff === 'function') ? dDiff(j.end) : 0);
        return j.cli + ' (' + dias + 'd)';
      }).join(', '));
  }
  if (entregasHoje.length) {
    situacao.push(entregasHoje.length + ' entrega(s) para hoje: ' +
      entregasHoje.map(function(j) { return j.cli; }).join(', '));
  }
  if (pendVenc.length) {
    var totVenc = pendVenc.reduce(function(s, t) { return s + (t.value || 0); }, 0);
    situacao.push(pendVenc.length + ' cobrança(s) vencida(s) — R$ ' +
      (typeof fm === 'function' ? fm(totVenc) : totVenc.toFixed(2)));
  }
  if (visitasHoje.length) {
    situacao.push(visitasHoje.length + ' visita(s) agendada(s) hoje');
  }
  if (jobsUrgentes.length) {
    situacao.push(jobsUrgentes.length + ' job(s) marcado(s) como urgente');
  }

  var totPend = pendTotal.reduce(function(s, t) { return s + (t.value || 0); }, 0);
  var ctxFinanceiro = 'Total a receber: R$ ' + (typeof fm === 'function' ? fm(totPend) : totPend.toFixed(2)) +
    ' (' + pendTotal.length + ' lançamentos pendentes)';

  var prompt = saudacao + '! Situação atual ao abrir o app:\n' +
    situacao.join('\n') + '\n' + ctxFinanceiro + '\n\n' +
    'Faça uma saudação de ' + saudacao.toLowerCase() + ' e um resumo executivo em até 6 linhas com os pontos mais críticos. ' +
    'Destaque o que exige ação imediata hoje. Seja direto e use emojis moderadamente.';

  // Marca timestamp ANTES de buscar (evita duplo disparo)
  try { localStorage.setItem('hr_sec_proativ_ts', agora.toString()); } catch(e) {}

  // Injeta "pensando..." no histórico
  var ts = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit', minute:'2-digit'});
  _chat.history.push({role: 'assistant', content: '...', ts: ts, isProativ: true, _pending: true});
  _chatSave();

  // Chama API com o prompt proativo — detecta Anthropic (sk-ant-) vs Groq (gsk_)
  var _isAnthropicProativ = key.indexOf('sk-ant-') === 0;
  var _fetchProativ = _isAnthropicProativ
    ? fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 600,
          system: _chatBuildSystem(),
          messages: [{role: 'user', content: prompt}]
        })
      })
    : fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + key
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 600,
          messages: [
            {role: 'system', content: _chatBuildSystem()},
            {role: 'user', content: prompt}
          ]
        })
      });

  _fetchProativ
  .then(function(r) { return r.json(); })
  .then(function(d) {
    var text = _isAnthropicProativ
      ? ((d.content && d.content[0] && d.content[0].text) || '')
      : ((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '');
    if (!text) return;

    // Substitui o placeholder pela resposta real
    var idx = _chat.history.length - 1;
    while (idx >= 0 && !_chat.history[idx]._pending) idx--;
    if (idx >= 0) {
      _chat.history[idx].content = text;
      delete _chat.history[idx]._pending;

      // Adiciona ações contextuais conforme o que foi detectado
      var actions = [];
      if (jobsAtrasados.length)  actions.push({label: '⚠️ Ver atrasados',  fn: 'go(3)'});
      if (pendVenc.length)       actions.push({label: '💰 Cobranças',       fn: 'go(4);finTab(\'areceber\')'});
      if (entregasHoje.length)   actions.push({label: '📦 Entregas hoje',   fn: 'go(3)'});
      if (visitasHoje.length)    actions.push({label: '📐 Visitas hoje',    fn: 'go(0)'});
      if (actions.length) _chat.history[idx].actions = actions;

      _chatSave();
      renderChat();
    }
  })
  .catch(function() {
    // Falha silenciosa — remove placeholder
    _chat.history = _chat.history.filter(function(m) { return !m._pending; });
    _chatSave();
  });
}

// ══════════════════════════════════════════════════════════════
// MONITOR DE ERROS — notifica secretária em tempo real
// ══════════════════════════════════════════════════════════════
var _errMonitor = {
  lastNotifTs: 0,
  errosJaNotificados: {},
  COOLDOWN_MS: 60000,       // no mínimo 1 min entre notificações
  bootTs: Date.now(),       // só notifica erros que ocorrem APÓS o boot
  BOOT_GRACE_MS: 8000       // ignora os primeiros 8s (erros do localStorage no load)
};

// Chamado pelo app-diagnostico.js via hook de erros
function _secretariaReceberErro(msg, src, linha) {
  var agora = Date.now();
  var chave = (msg || '').slice(0, 80) + '|' + (src || '');

  // Ignora erros dos primeiros segundos do boot (localStorage corrompido, etc.)
  if (agora - _errMonitor.bootTs < _errMonitor.BOOT_GRACE_MS) return;

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
    // Ignora erros triviais do sistema (rede, etc.) e erros de boot do localStorage
      if (!/NetworkError|net::ERR|AbortError|Failed to fetch|Unexpected end of input|Unexpected token/i.test(msg)) {
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


function _chatGetContextChips() {
  try {
    var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10);
    var hh   = new Date().getHours();
    var chips = [];

    // Dados do sistema
    var jobs         = (typeof DB !== 'undefined' && DB.j) ? DB.j : [];
    var trans        = (typeof DB !== 'undefined' && DB.t) ? DB.t : [];
    var jobsAtrasados = jobs.filter(function(j){ return !j.done && j.end && j.end < hoje; }).length;
    var pendAtrasados = trans.filter(function(t){ return t.type==='pend' && t.date && t.date < hoje; }).length;
    var jobsHoje      = jobs.filter(function(j){ return !j.done && j.end === hoje; }).length;
    var jobsAtivos    = jobs.filter(function(j){ return !j.done; }).length;
    var pendentes     = trans.filter(function(t){ return t.type==='pend'; }).length;
    var visitasHoje   = (typeof _getV === 'function' ? _getV() : [])
                          .filter(function(v){ return v.status==='agendada' && v.date===hoje; }).length;

    // ── Alertas críticos — sempre aparecem primeiro ────────────
    if (jobsAtrasados > 0) chips.push({ label: '🔴 ' + jobsAtrasados + ' atrasado(s)', text: 'Liste os jobs atrasados com dias de atraso e valor pendente de cada um.' });
    if (pendAtrasados > 0) chips.push({ label: '🔴 ' + pendAtrasados + ' cobrança(s) vencida(s)', text: 'Liste os valores a receber que já venceram, com nome do cliente e valor.' });

    // ── Chips contextuais por período do dia ──────────────────
    if (hh >= 6 && hh < 12) {
      // Manhã — foco no dia que começa
      chips.push({ label: '☀️ Resumo do dia', text: 'Bom dia! Me dê um resumo executivo do dia: entregas previstas, visitas agendadas, cobranças vencidas e qualquer alerta importante.' });
      if (visitasHoje > 0) chips.push({ label: '📐 ' + visitasHoje + ' visita(s) hoje', text: 'Quais visitas tenho hoje? Me dê os detalhes de cada uma com endereço e observações.' });
      if (jobsHoje > 0)    chips.push({ label: '📦 ' + jobsHoje + ' entrega(s) hoje', text: 'Quais jobs precisam ser entregues hoje? Estão prontos?' });
      chips.push({ label: '📊 Finanças do mês', text: 'Como estão as finanças deste mês até agora? Compare com o mês anterior.' });

    } else if (hh >= 12 && hh < 17) {
      // Tarde — foco em produção e cobranças
      chips.push({ label: '🔨 ' + jobsAtivos + ' em produção', text: 'Mostre todos os jobs em produção com status, prazo e valor. Destaque os mais urgentes.' });
      if (pendentes > 0) chips.push({ label: '💰 ' + pendentes + ' a receber', text: 'Liste tudo que tenho a receber com datas de vencimento, do mais urgente ao mais recente.' });
      chips.push({ label: '📈 Análise da semana', text: 'Como estou esta semana? Receitas, despesas, jobs entregues e qualquer ponto de atenção.' });
      chips.push({ label: '👷 Saldo funcionários', text: 'Qual o saldo devedor de cada funcionário? Quem está com mais horas extras acumuladas?' });

    } else if (hh >= 17 && hh < 20) {
      // Final de tarde — fechamento do dia
      chips.push({ label: '🌅 Fechar o dia', text: 'Me ajude a fechar o dia: o que foi feito, o que ficou pendente e o que precisa de atenção amanhã.' });
      chips.push({ label: '💰 Caixa de hoje', text: 'Quanto entrou e saiu hoje? Qual o saldo do dia?' });
      if (jobsHoje > 0) chips.push({ label: '✅ Confirmar entregas', text: 'Os jobs previstos para hoje foram entregues? Me mostre o status de cada um.' });
      chips.push({ label: '📞 Follow-ups', text: 'Tem algum cliente com orçamento sem resposta há mais de 5 dias? Me dê a lista para eu ligar amanhã.' });

    } else {
      // Noite / madrugada — visão geral
      chips.push({ label: '🌙 Visão geral', text: 'Me dê uma visão geral do negócio: finanças do mês, jobs em andamento, cobranças pendentes e principais alertas.' });
      chips.push({ label: '📈 Análise completa', text: 'Faça uma análise financeira detalhada com tendência dos últimos 3 meses, inadimplência e 3 sugestões práticas.' });
      chips.push({ label: '💰 A receber', text: 'Liste tudo que tenho a receber com datas de vencimento.' });
    }

    // Diagnóstico — sempre disponível como último recurso
    chips.push({ label: '🔍 Erros no sistema', text: 'Tem algum erro ou problema no sistema agora?' });

    return chips.slice(0, 6);
  } catch(e) { return _chatChips; }
}

function renderChat() {
  var el = document.getElementById('chatBody');
  if (!el) return;
  _chatLoad();
  _chatVozLoad();
  _secProativCheck();
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
  h += '<button class="chat-voz-btn" id="chatVozBtn" onclick="chatVozToggle()" title="' + (_chatVoz.ativo ? 'Voz ativa — clique para desativar' : 'Ativar voz de saída') + '" style="' + (_chatVoz.ativo ? 'border-color:rgba(201,168,76,.5);color:#c9a84c;' : '') + '">' + (_chatVoz.ativo ? '🔊' : '🔇') + '</button>';
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
        h += _chatBubbleUser(msg.content, msg.ts, msg.imgData || null);
      } else if (msg._pending) {
        // Mensagem proativa carregando — mostra animação
        h += '<div class="chat-bubble chat-bubble-bot chat-thinking">'
          + '<div class="chat-thinking-inner"><span></span><span></span><span></span></div>'
          + '<div class="chat-thinking-label">Preparando resumo do dia...</div>'
          + '</div>';
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
  h += '<input type="file" id="chatImgInput" accept="image/*" style="display:none" onchange="chatImgSelected(event)">';
  h += '<div id="chatImgPreviewBar" style="display:none;padding:6px 4px 4px;">' +
       '<div style="display:inline-flex;align-items:center;gap:8px;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);border-radius:10px;padding:5px 10px;">' +
       '<img id="chatImgThumb" src="" style="height:36px;width:36px;object-fit:cover;border-radius:6px;border:1px solid rgba(201,168,76,.3);">' +
       '<span id="chatImgName" style="font-size:.7rem;color:var(--t3);max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"></span>' +
       '<button onclick="chatImgClear()" style="background:none;border:none;color:var(--t4);font-size:1rem;cursor:pointer;padding:0 2px;line-height:1;">✕</button>' +
       '</div></div>';
  h += '<div class="chat-input-row">';
  h += '<button class="chat-img-btn" onclick="document.getElementById(\'chatImgInput\').click()" title="Enviar imagem">📎</button>';
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

function _chatBubbleUser(text, ts, imgData) {
  var h = '<div class="chat-bubble chat-bubble-user">';
  if (imgData) {
    h += '<img src="' + imgData + '" style="max-width:180px;max-height:180px;border-radius:10px;display:block;margin-bottom:' + (text ? '6px' : '0') + ';border:1px solid rgba(201,168,76,.3);">';
  }
  if (text) h += '<div class="chat-bubble-text">' + escH(text) + '</div>';
  if (ts) h += '<div class="chat-bubble-ts">' + ts + '</div>';
  h += '</div>';
  return h;
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
  var hasImg = !!_chat.pendingImage;
  if ((!text && !hasImg) || _chat.thinking) return;
  inp.value = '';
  inp.style.height = 'auto';
  _chatUserMsg(text || (hasImg ? '📎 Imagem enviada' : ''), _chat.pendingImage);
  chatImgClear();
}

function chatImgSelected(evt) {
  var file = evt.target.files && evt.target.files[0];
  if (!file) return;
  var allowed = ['image/jpeg','image/png','image/gif','image/webp'];
  if (!allowed.includes(file.type)) { toast('Formato não suportado. Use JPG, PNG ou WEBP.'); return; }
  if (file.size > 5 * 1024 * 1024) { toast('Imagem muito grande (máx 5MB).'); return; }
  var reader = new FileReader();
  reader.onload = function(e) {
    var dataUrl = e.target.result;
    var base64 = dataUrl.split(',')[1];
    _chat.pendingImage = { base64: base64, mediaType: file.type, previewUrl: dataUrl, name: file.name };
    var bar = document.getElementById('chatImgPreviewBar');
    var thumb = document.getElementById('chatImgThumb');
    var nameEl = document.getElementById('chatImgName');
    if (bar) bar.style.display = 'block';
    if (thumb) thumb.src = dataUrl;
    if (nameEl) nameEl.textContent = file.name;
  };
  reader.readAsDataURL(file);
  evt.target.value = '';
}

function chatImgClear() {
  _chat.pendingImage = null;
  var bar = document.getElementById('chatImgPreviewBar');
  if (bar) bar.style.display = 'none';
}

function _chatUserMsg(text, imgObj) {
  var ts = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  var entry = { role: 'user', content: text, ts: ts };
  if (imgObj) entry.imgData = imgObj.previewUrl;
  _chat.history.push(entry);
  _chatSave();
  _chat.thinking = true;
  renderChat();
  _chatScrollBottom();
  _chatAsk(text, imgObj);
}

function chatClear() {
  if (!confirm('Limpar toda a conversa?')) return;
  _chat.history = [];
  _chatSave();
  renderChat();
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
      var extraMes = meusRegs
        .filter(function(r){ return (r.data||'').slice(0,7) === mes && r.destinoExtra !== 'banco'; })
        .reduce(function(s,r){ return s + (parseFloat(r.extra)||0); }, 0);
      var extraTotal = meusRegs
        .filter(function(r){ return r.destinoExtra !== 'banco'; })
        .reduce(function(s,r){ return s + (parseFloat(r.extra)||0); }, 0);

      var taxaExtra = parseFloat(f.taxaHoraExtra) || (parseFloat(f.salario)||0) / 220;
      var valorExtra = extraTotal * taxaExtra;
      var totalDevido = (parseFloat(f.salario)||0) + valorExtra;
      var totalPago = Object.values(pags)
        .filter(function(p){ return p.funcionarioId === f.id; })
        .reduce(function(s,p){ return s + (parseFloat(p.valor)||0); }, 0);
      var saldo = totalDevido - totalPago;

      return f.nome +
        ' | setor: ' + (f.setor||'?') +
        ' | salário: R$ ' + (parseFloat(f.salario)||0).toFixed(2) +
        ' | horas extras (mês): ' + extraMes.toFixed(1) + 'h' +
        ' | horas extras (total): ' + extraTotal.toFixed(1) + 'h' +
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
    return 'DIAGNÓSTICO: erro — ' + e.message;
  }
}

// ── Contexto de orçamentos recentes ───────────────────────
function _chatBuildOrcContext() {
  try {
    var todos = (typeof DB !== 'undefined' && DB.q) ? DB.q : [];
    var orcs = todos.slice(0, 10);
    if (!orcs.length) return 'ORÇAMENTOS RECENTES: Nenhum gerado.';
    var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10);
    var mes = hoje.slice(0,7);
    var totalMes = 0, aprovados = 0, perdidos = 0, pendentes = 0;
    todos.forEach(function(q) {
      var st = q.status || 'pendente';
      if (st === 'aprovado') aprovados++;
      else if (st === 'perdido') perdidos++;
      else pendentes++;
    });
    var totalOrc = todos.length;
    var taxaConv = totalOrc > 0 ? ((aprovados / totalOrc) * 100).toFixed(0) : '0';
    var statusLabel = {'aprovado':'✅ aprovado','perdido':'❌ perdido','pendente':'⏳ pendente'};
    var linhas = orcs.map(function(q) {
      if ((q.date||'').slice(0,7) === mes) totalMes += (q.vista || 0);
      var st = q.status || 'pendente';
      var diasValidade = q.validade || 7;
      var dataVenc = (typeof addD === 'function') ? addD(q.date || hoje, diasValidade) : '';
      var vencido = dataVenc && dataVenc < hoje && st === 'pendente' ? ' ⚠️VENCIDO' : '';
      return '• ' + (q.cli||'?') + ' — ' + (q.tipo||'?') +
        ' | R$ ' + (q.vista||0).toFixed(2) +
        ' | ' + (q.date||'?') +
        ' | ' + (statusLabel[st]||st) + vencido;
    }).join('\n');
    return 'ORÇAMENTOS RECENTES (' + orcs.length + ') | total gerado no mês: R$ ' + totalMes.toFixed(2) +
      '\nConversão geral: ' + aprovados + '/' + totalOrc + ' aprovados (' + taxaConv + '%) | perdidos: ' + perdidos + ' | aguardando: ' + pendentes +
      '\n' + linhas;
  } catch(e) { return 'ORÇAMENTOS: erro — ' + e.message; }
}

// ── Prompt do sistema completo ────────────────────────────
// ── Contexto de orçamentos de túmulos ───────────────────────
function _chatBuildTumContext() {
  try {
    var todos = (typeof DB !== 'undefined' && DB.q) ? DB.q : [];
    var tums = todos.filter(function(q) {
      return q.tipo && q.tipo.toLowerCase().indexOf('túmulo') !== -1;
    }).slice(0, 8);
    if (!tums.length) return 'TÚMULOS: Nenhum orçamento de túmulo gerado.';
    var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10);
    var mes = hoje.slice(0,7);
    var totalMes = 0;
    var linhas = tums.map(function(q) {
      if ((q.dt||q.date||'').slice(0,7) === mes) totalMes += (q.vista || 0);
      var gavetas = (q.tum && q.tum.dims && q.tum.dims.gavetas) ? q.tum.dims.gavetas + 'G' : '';
      var tipo = q.tipo || 'Túmulo';
      return '• ' + (q.cli||'?') + ' — ' + tipo +
        (gavetas ? ' ' + gavetas : '') +
        ' | R$ ' + (q.vista||0).toFixed(2) +
        ' | ' + (q.dt||q.date||'?') +
        (q.tumCalc ? ' | margem: ' + (q.tumCalc.margemReal||0).toFixed(1) + '%' : '');
    }).join(' | ');
    return 'TÚMULOS — ORÇAMENTOS RECENTES (' + tums.length + ') | gerado no mês: R$ ' + totalMes.toFixed(2) + ': ' + linhas;
  } catch(e) { return 'TÚMULOS: erro — ' + e.message; }
}


function _chatBuildSystem() {
  var hoje = (typeof td === 'function') ? td() : new Date().toISOString().slice(0,10);
  return [
    'Você é a Secretária IA da HR Mármores e Granitos — empresa de mármores, granitos e túmulos em Pilão Arcado-BA.',
    'Você tem ACESSO TOTAL e CONHECIMENTO COMPLETO do sistema em tempo real.',
    'Data de hoje: ' + hoje,
    '',
    '═══ PERSONALIDADE ═══',
    'Tom: profissional, direto, objetivo. Como uma secretária experiente que conhece o negócio de cabeça.',
    'Você NUNCA diz "não tenho acesso" ou "não posso verificar" — os dados estão no contexto.',
    'Responda sempre em português brasileiro. Seja conciso: máximo 8 linhas salvo análises completas.',
    'Se jobs atrasados ou inadimplência existirem, mencione ao final mesmo sem ser perguntado.',
    '',
    '═══ ANÁLISE FINANCEIRA ═══',
    'Para perguntas financeiras SEMPRE: número exato → compare mês anterior → ponto de equilíbrio → 1 sugestão prática.',
    'Se abaixo do ponto de equilíbrio (fixos+variáveis): alerte com ⚠️ e sugira ação concreta.',
    '',
    '═══ INTERPRETAÇÃO NATURAL ═══',
    '"trezentos"=300, "1.5k"=1500, "amanhã"=+1dia, "semana que vem"=+7dias.',
    'Nomes parciais são aceitos: "João"→"João Silva", "Romário"→"Romário Santana".',
    '',
    '═══ AÇÕES DISPONÍVEIS ═══',
    'Use blocos ```json``` para executar ações. Múltiplos blocos na mesma resposta são suportados.',
    '',
    '1.  Despesa:       {"action":"despesa",      "desc":"...","valor":100}',
    '2.  Entrada:       {"action":"entrada",       "desc":"...","valor":100}',
    '3.  A receber:     {"action":"areceber",      "desc":"...","valor":100,"data":"YYYY-MM-DD"}',
    '4.  Receber pend:  {"action":"receber_pend",  "desc":"parte do nome do lançamento"}',
    '5.  Novo job:      {"action":"job",           "cli":"...","desc":"...","dias":10,"valor":500}',
    '6.  Editar job:    {"action":"editar_job",    "cli":"...","prazo":"YYYY-MM-DD","valor":500}',
    '7.  Concluir job:  {"action":"concluir_job",  "cli":"..."}',
    '8.  Job pago:      {"action":"job_pago",      "cli":"...","valor":500}',
    '9.  Visita:        {"action":"visita",        "cli":"...","data":"YYYY-MM-DD","hora":"09:00"}',
    '10. Pagar func:    {"action":"pagar_func",    "funcionario":"nome","valor":500,"forma":"dinheiro"}',
    '11. Navegar:       {"action":"nav",           "tela":"financas|agenda|historico|contratos|orcamento|rh|diagnostico"}',
    '12. Orçamento:     {"action":"orcamento_rapido"}',
    '13. Orç. Túmulo:   {"action":"orcamento_tumulo","cli":"NOME","falecido":"NOME FALECIDO","cemiterio":"NOME","tipo":"simples"}',
    '14. Limpar diag:   {"action":"limpar_diag"}',
    '15. Ficha cliente:   {"action":"ver_cliente","cli":"NOME"} — agrega orçamentos, jobs, visitas, cobranças e histórico do cliente',
    '16. Histórico job:   {"action":"ver_historico_job","cli":"NOME"} — mostra linha do tempo de edições de um job',
    '17. Aprovar orç.:    {"action":"aprovar_orcamento","cli":"NOME"} — marca orçamento como aprovado (status→aprovado)',
    '18. Perder orç.:     {"action":"marcar_perdido","cli":"NOME","motivo":"opcional"} — marca orçamento como perdido/não fechado',
    '19. Atualizar pedra: {"action":"atualizar_pedra","id":"ID_PEDRA","custo":236.65,"pr":500} — atualiza custo e/ou preço de venda de uma pedra no catálogo. Use quando o usuário enviar NF ou etiqueta de pedra.',
    '20. Lançar boleto:   {"action":"lancar_boleto","fornecedor":"NOME","valor":4200,"vencimento":"YYYY-MM-DD"} — cria despesa e entrada a pagar a partir de boleto fotografado.',
    '21. Lembrete:        {"action":"lembrete","texto":"TEXTO DO LEMBRETE","data":"YYYY-MM-DD"} — salva um lembrete interno para a data informada.',
    '',
    '═══ FORMATO ═══',
    '- **negrito** para números e nomes importantes',
    '- • para listas',
    '- ✅ ao confirmar ação executada, ⚠️ para alertas, 🔴 para crítico',
    '- Para "como estou" / "resumo": 5 pontos-chave com dados reais do contexto',
  ].join('\n');
}

// ── Classificador de intenção — decide qual contexto carregar ─
function _chatClassifyIntent(text) {
  var t = text.toLowerCase();
  var flags = {
    financas:    /financ|faturad|despesa|lucro|receita|saldo|dinheiro|caixa|meta|ticket|entrada|saída|saida|pagar|paguei|recebi|lançar|lancar|mês|mes|semana|hoje|tendência|tendencia|análise|analise|resumo|como estou|balanço|balanco/.test(t),
    jobs:        /job|obra|serviço|servico|producao|produção|atrasad|prazo|entrega|agenda|pedido|cliente|concluir|concluído|concluido/.test(t),
    rh:          /funcionário|funcionario|func|salário|salario|hora.?extra|pagamento|pagar func|banco de horas|rh|colaborador/.test(t),
    diagnostico: /erro|falha|bug|diagnóstico|diagnostico|problema|sistema|travou|log/.test(t),
    orcamentos:  /orçamento|orcamento|proposta|pedra|granito|mármore|marmore|m²|m2/.test(t),
    tumulos:     /túmulo|tumulo|jazigo|sepultura|gaveta|monumento|cemitério|cemiterio|falecido|obra funerária|funer/.test(t),
    visitas:     /visita|medição|medicao|medir|agendad|marcar|agendar|cliente/.test(t)
  };
  // Imagem sem texto → carrega contexto de pedras + finanças
  flags.temImagem = false; // será setado pelo chamador se necessário
  // Se nada específico, manda contexto geral (finanças + jobs)
  if (!flags.financas && !flags.jobs && !flags.rh && !flags.diagnostico && !flags.orcamentos && !flags.tumulos && !flags.visitas) {
    flags.financas = true; flags.jobs = true;
  }
  return flags;
}

function _chatBuildContextSurgical(userText, flags) {
  if (!flags) flags = _chatClassifyIntent(userText);
  var hoje = td();
  var mes  = hoje.slice(0,7);
  var trans = DB.t || [];
  var parts = ['DADOS HR MÁRMORES — hoje: ' + hoje];

  if (flags.financas) {
    var recMes  = trans.filter(function(t){ return t.type==='in'  && (t.date||'').slice(0,7)===mes; }).reduce(function(s,t){ return s+(t.value||0); },0);
    var despMes = trans.filter(function(t){ return t.type==='out' && (t.date||'').slice(0,7)===mes; }).reduce(function(s,t){ return s+(t.value||0); },0);
    var pendMes = trans.filter(function(t){ return t.type==='pend'; }).reduce(function(s,t){ return s+(t.value||0); },0);
    var fixos   = (CFG.fixos||[]).reduce(function(s,f){ return s+(f.v||0); },0);
    var atrasados = trans.filter(function(t){ return t.type==='pend' && t.date && t.date < hoje; });
    function mesAnt(m,n){ var d=new Date(m+'-01'); d.setMonth(d.getMonth()-n); return d.toISOString().slice(0,7); }
    var tend = [];
    for(var i=3;i>=1;i--){
      var m2=mesAnt(mes,i);
      var r2=trans.filter(function(t){ return t.type==='in'  && (t.date||'').slice(0,7)===m2; }).reduce(function(s,t){ return s+t.value; },0);
      var d2=trans.filter(function(t){ return t.type==='out' && (t.date||'').slice(0,7)===m2; }).reduce(function(s,t){ return s+t.value; },0);
      tend.push(m2+': R$ '+r2.toFixed(2)+' rec | R$ '+d2.toFixed(2)+' desp | saldo R$ '+(r2-d2).toFixed(2));
    }
    var meta = (CFG.saudeFinanceira && CFG.saudeFinanceira.metaFaturamento) || 0;
    var pctMeta = meta > 0 ? ' | Meta: R$ '+meta.toFixed(2)+' ('+Math.round((recMes/meta)*100)+'%)' : '';
    parts.push('══ FINANÇAS ══');
    parts.push('Faturado: R$ '+recMes.toFixed(2)+pctMeta);
    parts.push('Despesas: R$ '+despMes.toFixed(2)+' | Fixos: R$ '+fixos.toFixed(2));
    parts.push('Lucro estimado: R$ '+(recMes-despMes-fixos).toFixed(2));
    parts.push('A receber: R$ '+pendMes.toFixed(2)+(atrasados.length?' | '+atrasados.length+' ATRASADOS':''));
    parts.push('Tendência:\n'+tend.join('\n'));
    var pendLista = trans.filter(function(t){ return t.type==='pend'; }).slice(0,8).map(function(t){
      return t.desc+' | R$ '+fm(t.value||0)+' | vence: '+(t.date||'?')+(t.date&&t.date<hoje?' ⚠️ ATRASADO':'');
    });
    parts.push('A RECEBER:\n'+(pendLista.join('\n')||'Nenhum'));
  }

  if (flags.jobs) {
    var jobsAtivos = (DB.j||[]).filter(function(j){ return !j.done; });
    var jobsAtrasados = jobsAtivos.filter(function(j){ return j.end && j.end < hoje; });
    var jobsList = jobsAtivos.slice(0,12).map(function(j){
      var diff = dDiff(j.end); var st = diff<0?'🔴 ATRASADO '+Math.abs(diff)+'d':'🟢 em '+diff+'d';
      return j.cli+' | '+j.desc+' | '+( j.end||'?')+' ('+st+') | R$ '+fm(j.value||0)+(j.pago?' | pago R$ '+fm(j.pago):'');
    });
    parts.push('══ JOBS ('+jobsAtivos.length+' ativos, '+jobsAtrasados.length+' atrasados) ══');
    parts.push(jobsList.join('\n')||'Nenhum');
  }

  if (flags.visitas) {
    var visitas = (typeof _getV === 'function' ? _getV() : [])
      .filter(function(v){ return v.status==='agendada'; }).slice(0,5)
      .map(function(v){ return v.cli+' | '+(v.date||'?')+(v.hora?' às '+v.hora:'')+(v.end?' | '+v.end:''); });
    parts.push('══ VISITAS AGENDADAS ══');
    parts.push(visitas.join('\n')||'Nenhuma');
  }

  if (flags.rh)          parts.push(_chatBuildRHContext());
  if (flags.orcamentos)  parts.push(_chatBuildOrcContext());
  if (flags.tumulos)     parts.push(_chatBuildTumContext());
  if (flags.diagnostico) parts.push(_chatBuildDiagContext());

  // Contexto de pedras quando há imagem (NF, etiqueta de preço)
  if (flags.temImagem) {
    var stonesCtx = 'CATÁLOGO DE PEDRAS (para identificar NF/etiqueta):\n';
    var stones = (typeof CFG !== 'undefined' && CFG.stones) ? CFG.stones : [];
    if (!stones.length && typeof DEF_STONES !== 'undefined') stones = DEF_STONES;
    stones.slice(0, 20).forEach(function(s) {
      stonesCtx += s.nm + ' | venda: R$ ' + (s.pr||0) + '/m² | custo: R$ ' + (s.custo||0) + '/m²\n';
    });
    parts.push(stonesCtx);
  }

  // Clientes recentes sempre (são leves)
  var ultCli = {};
  (DB.q||[]).slice(0,20).forEach(function(q){ if(q.cli) ultCli[q.cli]=(q.date||''); });
  parts.push('CLIENTES RECENTES: '+Object.keys(ultCli).slice(0,12).join(', '));

  return parts.join('\n');
}

function _chatAsk(userText, imgObj) {
  var key = CFG && CFG.emp && CFG.emp.apiKey;
  if (!key) {
    _chatBotReply('🔑 Chave de API não configurada. Vá em Config → Empresa para adicionar sua chave.', [
      {label:'⚙️ Ir às Configurações', fn:'go(6)'}
    ]);
    return;
  }

  var _isAnthropicAsk = key.indexOf('sk-ant-') === 0;
  if (imgObj && !_isAnthropicAsk) {
    _chatBotReply('⚠️ Análise de **imagem** requer chave Anthropic (sk-ant-...). A Groq não suporta visão.\nEnvie sua pergunta por texto.', [
      {label:'⚙️ Ir às Configurações', fn:'go(6)'}
    ]);
    return;
  }

  var _intentFlags = _chatClassifyIntent(userText || '');
  if (imgObj) {
    _intentFlags.temImagem = true;
    // Imagem sem texto: força contexto de pedras + finanças
    if (!userText || userText === '📎 Imagem enviada') {
      _intentFlags.orcamentos = true;
      _intentFlags.financas = true;
    }
  }
  var ctx = _chatBuildContextSurgical(userText, _intentFlags);
  var systemPrompt = _chatBuildSystem() + '\n\nCONTEXTO ATUAL:\n' + ctx;

  // Se houver imagem, adiciona instrução ao system para analisar
  if (imgObj) {
    systemPrompt += '\n\nO usuário enviou uma imagem. Analise-a com atenção. ' +
      'Se for uma nota fiscal, boleto ou cupom: extraia fornecedor, valor total e vencimento (se houver). ' +
      'Se for etiqueta/tabela de preço de pedra: extraia nome da pedra, valor por m² e categoria. ' +
      'Se for medição ou croqui: extraia as dimensões visíveis. ' +
      'Ao final, ofereça ações práticas como lançar em Finanças ou atualizar catálogo. ' +
      'Responda em português, seja direto e use ```json``` para ações quando aplicável.';
  }

  // Histórico para a API — últimas 24 trocas, sem alertas automáticos
  // Exclui a última mensagem do usuário (será adicionada abaixo com imagem se houver)
  var apiMessages = [];
  var histSlice = _chat.history.slice(-25);
  // Remove a última entrada do usuário do slice (será re-adicionada com conteúdo correto)
  var lastUserIdx = -1;
  for (var _hi = histSlice.length - 1; _hi >= 0; _hi--) {
    if (histSlice[_hi].role === 'user') { lastUserIdx = _hi; break; }
  }
  var histForApi = lastUserIdx >= 0 ? histSlice.slice(0, lastUserIdx) : histSlice;
  histForApi.forEach(function(m) {
    if ((m.role === 'user' || m.role === 'assistant') && !m.isAlerta) {
      apiMessages.push({role: m.role, content: typeof m.content === 'string' ? m.content : (userText || '')});
    }
  });

  // Monta a mensagem atual do usuário — com ou sem imagem
  var currentUserContent;
  if (imgObj) {
    currentUserContent = [
      { type: 'image', source: { type: 'base64', media_type: imgObj.mediaType, data: imgObj.base64 } },
      { type: 'text', text: userText || 'Analise esta imagem e me diga o que encontrou.' }
    ];
  } else {
    currentUserContent = userText;
  }
  apiMessages.push({role: 'user', content: currentUserContent});

  // Usa Sonnet quando há imagem (visão), Haiku para texto puro (Anthropic)
  var model = imgObj ? 'claude-sonnet-4-6' : 'claude-haiku-4-5-20251001';

  function doFetch(retryCount) {
    var _fetchAsk = _isAnthropicAsk
      ? fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: model,
            max_tokens: 2500,
            system: systemPrompt,
            messages: apiMessages
          })
        })
      : fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + key
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            max_tokens: 2500,
            messages: [{role: 'system', content: systemPrompt}].concat(
              apiMessages.map(function(m) {
                return {
                  role: m.role,
                  content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
                };
              })
            )
          })
        });

    _fetchAsk
    .then(function(r){ return r.json(); })
    .then(function(d) {
      if (d.error) {
        // Rate limit — tenta novamente após 3s
        if (d.error.type === 'rate_limit_error' && retryCount < 2) {
          setTimeout(function(){ doFetch(retryCount + 1); }, 3000);
          return;
        }
        throw new Error(d.error.message || 'Erro da API');
      }
      var text = _isAnthropicAsk
        ? ((d.content && d.content[0] && d.content[0].text) || '')
        : ((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '');
      if (!text) throw new Error('Resposta vazia');
      _chatProcessReply(text);
    })
    .catch(function(err) {
      _chat.thinking = false;
      _chatBotReply('⚠️ Erro de conexão com a IA: ' + (err.message||'verifique sua chave em Config → Empresa.'), [
        {label:'⚙️ Configurações', fn:'go(6)'}
      ]);
      console.warn('chat API error:', err);
    });
  }
  doFetch(0);
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

    // ── Confirmação para ações financeiras acima de R$ 500 ──────
  var LIMITE_CONFIRM = 500;
  var acoesFinanceiras = ['despesa', 'entrada', 'areceber', 'pagar_func', 'job_pago'];
  if (acoesFinanceiras.indexOf(data.action) !== -1 && +data.valor > LIMITE_CONFIRM && !data._confirmado) {
    var vlFmt = 'R$ ' + parseFloat(data.valor).toFixed(2).replace('.', ',');
    var tipoLabel = {
      despesa:    '\ud83d\udcb8 despesa',
      entrada:    '\ud83d\udcb0 entrada',
      areceber:   '\ud83d\udccb a receber',
      pagar_func: '\ud83d\udc77 pagamento',
      job_pago:   '\u2705 recebimento de job'
    }[data.action] || data.action;
    result.extra = '\u26a0\ufe0f Confirmar ' + tipoLabel + ' de **' + vlFmt + '**' +
      (data.desc ? ' \u2014 *' + data.desc + '*' : '') + '?';
    var confirmData = JSON.stringify(Object.assign({}, data, {_confirmado: true}));
    result.actions.push({
      label: '\u2705 Confirmar ' + vlFmt,
      fn: '_chatExecuteActionDirect(' + confirmData + ')'
    });
    result.actions.push({label: '\u274c Cancelar', fn: 'void(0)'});
    return result;
  }


// ── Log de edições em jobs ────────────────────────────────────
function _jobLog(job, campo, de, para) {
  if (!job) return;
  if (!job.log) job.log = [];
  var quem = (CFG && CFG.emp && CFG.emp.nome) ? CFG.emp.nome.split(' ')[0] : 'Secretária IA';
  var ts = new Date().toISOString().slice(0, 16).replace('T', ' ');
  job.log.push({ campo: campo, de: de, para: para, quem: quem, quando: ts });
  // Mantém no máximo 50 entradas por job
  if (job.log.length > 50) job.log = job.log.slice(-50);
}

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
        DB.t.unshift({id:_genId(), type:'pend', desc:data.desc, value:+data.valor, date:dt});
        _dbSv(); renderFin();
        result.extra = '✅ A receber de **R$ ' + fm(data.valor) + '** para ' + fd(dt) + ' registrado!';
        result.actions.push({label:'💰 Ver A Receber', fn:"go(4);setTimeout(function(){finTab('areceber')},200)"});
      }
      break;

    case 'job':
      if (data.cli && data.desc) {
        var dias = +(data.dias) || 7;
        var end  = addD(hoje, dias);
        var val  = +(data.valor) || 0;
        // D2: Verificar capacidade antes de criar
        var _jobsAtivos = (DB.j||[]).filter(function(j){ return !j.done; });
        var _cap = (typeof CFG !== 'undefined' && CFG.capacidade && CFG.capacidade.total) ? CFG.capacidade.total : 5;
        var _aviso = '';
        if (_jobsAtivos.length >= _cap) {
          _aviso = '\n⚠️ **Atenção:** equipe com ' + _jobsAtivos.length + ' job(s) ativo(s) — capacidade máxima (' + _cap + ') atingida. Job adicionado mesmo assim.';
        } else if (_jobsAtivos.length >= _cap - 1) {
          _aviso = '\n🟡 **Aviso:** equipe ficará na capacidade máxima (' + _cap + ' jobs) com este serviço.';
        }
        DB.j.unshift({id:_genId(), cli:data.cli, desc:data.desc, start:hoje, end:end, value:val, pago:0, obs:data.obs||'', done:false});
        _dbSv(); renderAg(); updUrgDot();
        result.extra = '✅ Job **' + data.cli + '** adicionado! Prazo: ' + fd(end) + _aviso;
        result.actions.push({label:'📅 Ver Agenda', fn:'go(0)'});
      }
      break;

    case 'visita':
      if (data.cli && data.data) {
        _getV().unshift({id:_genId(), cli:data.cli, tel:data.tel||'', end:data.end||'', date:data.data, hora:data.hora||'', obs:data.obs||'', status:'agendada'});
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
            .filter(function(r){ return r.funcionarioId === funcEncontrado.id && r.destinoExtra !== 'banco'; })
            .reduce(function(s,r){ return s + (parseFloat(r.extra)||0); }, 0);
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
          var pagoAntes = jobEncontrado.pago || 0;
          jobEncontrado.pago = pagoAntes + valPago;
          _jobLog(jobEncontrado, 'pago', 'R$ ' + fm(pagoAntes), 'R$ ' + fm(jobEncontrado.pago));
          if (jobEncontrado.pago >= (jobEncontrado.value || 0)) {
            _jobLog(jobEncontrado, 'status', 'em produção', 'concluído e pago');
            jobEncontrado.done = true;
            result.extra = '✅ Job de **' + jobEncontrado.cli + '** marcado como **concluído e pago**! R$ ' + fm(valPago) + ' registrado.';
          } else {
            result.extra = '✅ Pagamento parcial de **R$ ' + fm(valPago) + '** registrado no job de **' + jobEncontrado.cli + '**. Falta: R$ ' + fm((jobEncontrado.value||0) - jobEncontrado.pago);
          }
          addTr('in', 'Recebimento job — ' + jobEncontrado.cli + (jobEncontrado.desc ? ' | ' + jobEncontrado.desc.slice(0,30) : ''), valPago);
          _dbSv();
          if (typeof renderAg === 'function') renderAg();
          result.actions.push({label:'📅 Ver Agenda', fn:'go(0)'});
          result.actions.push({label:'💰 Ver Finanças', fn:'go(4)'});
        }
      }
      break;

    case 'receber_pend':
      // Marca um "a receber" como recebido, move para entrada
      if (data.desc || data.id) {
        var busca = (data.desc||'').toLowerCase();
        var idx = DB.t.findIndex(function(t){
          return t.type==='pend' && (
            (data.id && t.id == data.id) ||
            (busca && (t.desc||'').toLowerCase().indexOf(busca) !== -1)
          );
        });
        if (idx === -1) {
          result.extra = '⚠️ Lançamento a receber **"'+(data.desc||data.id)+'"** não encontrado.';
        } else {
          var pend = DB.t[idx];
          DB.t.splice(idx, 1);
          DB.t.unshift({id:_genId(), type:'in', desc:(pend.desc||'Recebimento'), value:pend.value, date:hoje});
          _dbSv(); renderFin();
          result.extra = '✅ **R$ '+fm(pend.value)+'** de **'+(pend.desc||'?')+'** marcado como **recebido**!';
          result.actions.push({label:'💰 Ver Finanças', fn:'go(4)'});
        }
      }
      break;

    case 'concluir_job':
      if (data.cli) {
        var busca2 = (data.cli||'').toLowerCase();
        var jobC = (DB.j||[]).find(function(j){
          return !j.done && j.cli && j.cli.toLowerCase().indexOf(busca2) !== -1;
        });
        if (!jobC) {
          result.extra = '⚠️ Job de **'+data.cli+'** não encontrado em produção.';
        } else {
          _jobLog(jobC, 'status', 'em produção', 'concluído');
          jobC.done = true;
          _dbSv(); if(typeof renderAg==='function') renderAg(); if(typeof updUrgDot==='function') updUrgDot();
          result.extra = '✅ Job de **'+jobC.cli+'** marcado como **concluído**!';
          result.actions.push({label:'📅 Ver Agenda', fn:'go(0)'});
        }
      }
      break;

    case 'editar_job':
      if (data.cli) {
        var busca3 = (data.cli||'').toLowerCase();
        var jobE = (DB.j||[]).find(function(j){
          return !j.done && j.cli && j.cli.toLowerCase().indexOf(busca3) !== -1;
        });
        if (!jobE) {
          result.extra = '⚠️ Job de **'+data.cli+'** não encontrado.';
        } else {
          if (data.prazo && data.prazo !== jobE.end)   { _jobLog(jobE, 'prazo', jobE.end, data.prazo);          jobE.end   = data.prazo; }
          if (data.valor && +data.valor !== jobE.value) { _jobLog(jobE, 'valor', 'R$ '+fm(jobE.value||0), 'R$ '+fm(+data.valor)); jobE.value = +data.valor; }
          if (data.desc  && data.desc  !== jobE.desc)   { _jobLog(jobE, 'desc',  jobE.desc||'',  data.desc);   jobE.desc  = data.desc; }
          if (data.obs   && data.obs   !== jobE.obs)    { _jobLog(jobE, 'obs',   jobE.obs||'',   data.obs);    jobE.obs   = data.obs; }
          _dbSv(); if(typeof renderAg==='function') renderAg();
          result.extra = '✅ Job de **'+jobE.cli+'** atualizado!';
          result.actions.push({label:'📅 Ver Agenda', fn:'go(0)'});
        }
      }
      break;

    case 'orcamento_rapido':
      // Navega para tela de orçamento com foco
      result.actions.push({label:'📐 Novo Orçamento', fn:'go(1)'});
      result.extra = '👉 Abrindo orçamento. Selecione o material e adicione as peças.';
      break;

    case 'orcamento_tumulo':
      // Navega para o módulo de túmulos, opcionalmente pré-preenchendo o cliente
      if (data.cli && typeof TUM !== 'undefined') {
        TUM.q.cli = data.cli;
        if (data.falecido) TUM.q.falecido = data.falecido;
        if (data.cemiterio) TUM.q.cemiterio = data.cemiterio;
        if (data.tipo && TUM.TIPOS && TUM.TIPOS[data.tipo]) TUM.q.tipoBase = data.tipo;
      }
      result.actions.push({label:'⚰️ Abrir Orçamento de Túmulo', fn:'if(typeof go==="function")go(5)'});
      result.extra = '🪦 Abrindo módulo de túmulos' +
        (data.cli ? ' para **' + data.cli + '**' : '') +
        '. Confira as dimensões e o tipo de estrutura.';
      break;

    case 'ver_cliente':
      if (data.cli) {
        var cliNome = data.cli;
        var cliBusca = cliNome.toLowerCase().trim();

        // Busca por match parcial em todas as coleções
        function _cliMatch(nome) {
          if (!nome) return false;
          var n = nome.toLowerCase();
          return n.indexOf(cliBusca) !== -1 || cliBusca.indexOf(n.split(' ')[0]) !== -1;
        }

        // ── Jobs ──────────────────────────────────────────────
        var cliJobs      = (DB.j||[]).filter(function(j){ return _cliMatch(j.cli); });
        var cliJobsAtiv  = cliJobs.filter(function(j){ return !j.done; });
        var cliJobsConc  = cliJobs.filter(function(j){ return j.done; });
        var totalJobs    = cliJobs.reduce(function(s,j){ return s+(j.value||0); }, 0);
        var totalPago    = cliJobs.reduce(function(s,j){ return s+(j.pago||0); }, 0);

        // ── Orçamentos ────────────────────────────────────────
        var cliOrcs = (DB.q||[]).filter(function(q){ return _cliMatch(q.cli); });
        var totalOrc = cliOrcs.reduce(function(s,q){ return s+(q.vista||q.total||0); }, 0);

        // ── Cobranças (a receber) ─────────────────────────────
        var cliPend = (DB.t||[]).filter(function(t){
          return t.type === 'pend' && _cliMatch(t.desc);
        });
        var totalPend = cliPend.reduce(function(s,t){ return s+(t.value||0); }, 0);

        // ── Recebimentos históricos ───────────────────────────
        var cliRec = (DB.t||[]).filter(function(t){
          return t.type === 'in' && _cliMatch(t.desc);
        });
        var totalRec = cliRec.reduce(function(s,t){ return s+(t.value||0); }, 0);

        // ── Visitas ───────────────────────────────────────────
        var cliVisitas = (typeof _getV === 'function' ? _getV() : [])
          .filter(function(v){ return _cliMatch(v.cli); });
        var cliVisAgend  = cliVisitas.filter(function(v){ return v.status === 'agendada'; });
        var cliVisReal   = cliVisitas.filter(function(v){ return v.status === 'realizada'; });

        // ── Túmulos ───────────────────────────────────────────
        var cliTum = [];
        try {
          var tumData = JSON.parse(localStorage.getItem('hr_tumulos') || '[]');
          cliTum = tumData.filter(function(t){ return _cliMatch(t.cli||t.cliente); });
        } catch(eTum) {}

        // ── Verificação — cliente existe? ─────────────────────
        var totalRegistros = cliJobs.length + cliOrcs.length + cliVisitas.length + cliTum.length + cliPend.length + cliRec.length;
        if (totalRegistros === 0) {
          result.extra = '🔍 Nenhum registro encontrado para **"' + cliNome + '"**. Verifique o nome ou use parte dele (ex: só o primeiro nome).';
          break;
        }

        // ── Detecta nome real (mais usado nos registros) ──────
        var nomesEncontrados = {};
        cliJobs.forEach(function(j){ if(j.cli) nomesEncontrados[j.cli] = (nomesEncontrados[j.cli]||0)+1; });
        cliOrcs.forEach(function(q){ if(q.cli) nomesEncontrados[q.cli] = (nomesEncontrados[q.cli]||0)+1; });
        var nomeReal = Object.keys(nomesEncontrados).sort(function(a,b){ return nomesEncontrados[b]-nomesEncontrados[a]; })[0] || cliNome;

        // ── Primeira/última interação ─────────────────────────
        var todasDatas = [];
        cliJobs.forEach(function(j){ if(j.start) todasDatas.push(j.start); });
        cliOrcs.forEach(function(q){ if(q.date) todasDatas.push(q.date); });
        cliVisitas.forEach(function(v){ if(v.date) todasDatas.push(v.date); });
        todasDatas.sort();
        var primeiraData = todasDatas[0];
        var ultimaData   = todasDatas[todasDatas.length-1];

        // ── Monta ficha ───────────────────────────────────────
        var linhas = [];
        linhas.push('👤 **Ficha — ' + nomeReal + '**');
        if (primeiraData) linhas.push('📅 Cliente desde **' + fd(primeiraData) + '**' + (ultimaData !== primeiraData ? ' · última interação: ' + fd(ultimaData) : ''));

        // Resumo financeiro
        var gasto = totalPago + totalRec;
        linhas.push('');
        linhas.push('💰 **Financeiro**');
        linhas.push('• Gasto histórico: **R$ ' + fm(gasto) + '**');
        if (totalPend > 0) linhas.push('• A receber: **R$ ' + fm(totalPend) + '**' + (cliPend.some(function(t){ return t.date && t.date < hoje; }) ? ' ⚠️ tem vencidos' : ''));
        if (cliOrcs.length) linhas.push('• Orçamentos: ' + cliOrcs.length + ' (R$ ' + fm(totalOrc) + ' total)');

        // Jobs
        if (cliJobs.length) {
          linhas.push('');
          linhas.push('🔨 **Jobs (' + cliJobs.length + ' total)**');
          if (cliJobsAtiv.length) {
            cliJobsAtiv.slice(0,3).forEach(function(j){
              var diff = typeof dDiff === 'function' ? dDiff(j.end) : 0;
              var st = diff < 0 ? '🔴 ' + Math.abs(diff) + 'd atrasado' : '🟢 prazo ' + fd(j.end);
              linhas.push('• ' + j.desc.slice(0,40) + ' — ' + st + ' — R$ ' + fm(j.value||0));
            });
          }
          if (cliJobsConc.length) linhas.push('• ' + cliJobsConc.length + ' concluído(s)');
        }

        // Visitas
        if (cliVisitas.length) {
          linhas.push('');
          linhas.push('📐 **Visitas (' + cliVisitas.length + ')**');
          if (cliVisAgend.length) {
            cliVisAgend.slice(0,2).forEach(function(v){
              linhas.push('• Agendada: ' + fd(v.date) + (v.hora ? ' às ' + v.hora : ''));
            });
          }
          if (cliVisReal.length) linhas.push('• ' + cliVisReal.length + ' realizada(s)');
        }

        // Túmulos
        if (cliTum.length) {
          linhas.push('');
          linhas.push('🪦 **Túmulos (' + cliTum.length + ')**');
          cliTum.slice(0,2).forEach(function(t){
            linhas.push('• ' + (t.falecido||t.desc||'—') + (t.cemiterio ? ' · ' + t.cemiterio : '') + (t.total ? ' · R$ ' + fm(t.total) : ''));
          });
        }

        // Cobranças pendentes detalhadas
        if (cliPend.length) {
          linhas.push('');
          linhas.push('🧾 **A receber**');
          cliPend.slice(0,3).forEach(function(t){
            var atrasado = t.date && t.date < hoje ? ' ⚠️' : '';
            linhas.push('• ' + (t.desc||'—').slice(0,35) + ' — R$ ' + fm(t.value||0) + ' · vence ' + fd(t.date) + atrasado);
          });
        }

        result.extra = linhas.join('\n');

        // Botões contextuais
        if (cliJobsAtiv.length)  result.actions.push({label:'📅 Ver Agenda',   fn:'go(0)'});
        if (cliPend.length)      result.actions.push({label:'💰 A receber',    fn:"go(4);setTimeout(function(){finTab('areceber')},200)"});
        if (cliVisAgend.length)  result.actions.push({label:'📐 Ver Visitas',  fn:'go(11)'});
      } else {
        result.extra = '⚠️ Informe o nome do cliente. Ex: "ver ficha do João"';
      }
      break;

    case 'ver_historico_job':
      if (data.cli) {
        var busca4 = (data.cli || '').toLowerCase();
        var jobH = (DB.j || []).find(function(j) {
          return j.cli && j.cli.toLowerCase().indexOf(busca4) !== -1;
        });
        if (!jobH) {
          result.extra = '🔍 Job de **"' + data.cli + '"** não encontrado.';
        } else if (!jobH.log || !jobH.log.length) {
          result.extra = '📋 Job de **' + jobH.cli + '** (' + (jobH.desc||'?').slice(0,30) + ') não tem edições registradas ainda.';
        } else {
          var linhasH = ['📋 **Histórico — ' + jobH.cli + '** (' + (jobH.desc||'?').slice(0,30) + ')'];
          linhasH.push('');
          jobH.log.slice().reverse().forEach(function(l) {
            var campo = { prazo:'📅 Prazo', valor:'💰 Valor', desc:'📝 Descrição', obs:'🗒 Obs', status:'🔄 Status', pago:'💵 Pago' }[l.campo] || l.campo;
            linhasH.push(campo + ': **' + (l.de||'—') + '** → **' + (l.para||'—') + '**');
            linhasH.push('  _' + (l.quando||'?') + ' · ' + (l.quem||'?') + '_');
          });
          result.extra = linhasH.join('\n');
        }
      } else {
        result.extra = '⚠️ Informe o nome do cliente. Ex: "histórico do job do João"';
      }
      break;

    case 'aprovar_orcamento':
      if (data.cli) {
        var buscaOrc = (data.cli || '').toLowerCase();
        var orcAprov = (DB.q || []).find(function(q) {
          return q.cli && q.cli.toLowerCase().indexOf(buscaOrc) !== -1 && q.status !== 'aprovado';
        });
        if (!orcAprov) {
          result.extra = '⚠️ Orçamento pendente de **' + data.cli + '** não encontrado.';
        } else {
          orcAprov.status = 'aprovado';
          orcAprov._statusDate = hoje;
          _dbSv();
          result.extra = '✅ Orçamento de **' + orcAprov.cli + '** (R$ ' + fm(orcAprov.vista||0) + ') marcado como **aprovado**!';
          result.actions.push({label:'📋 Ver Orçamentos', fn:'go(1)'});
        }
      }
      break;

    case 'marcar_perdido':
      if (data.cli) {
        var buscaPerd = (data.cli || '').toLowerCase();
        var orcPerd = (DB.q || []).find(function(q) {
          return q.cli && q.cli.toLowerCase().indexOf(buscaPerd) !== -1 && q.status !== 'perdido';
        });
        if (!orcPerd) {
          result.extra = '⚠️ Orçamento de **' + data.cli + '** não encontrado ou já encerrado.';
        } else {
          orcPerd.status = 'perdido';
          orcPerd._statusDate = hoje;
          if (data.motivo) orcPerd._statusMotivo = data.motivo;
          _dbSv();
          result.extra = '📋 Orçamento de **' + orcPerd.cli + '** (R$ ' + fm(orcPerd.vista||0) + ') marcado como **perdido**' + (data.motivo ? ' — motivo: ' + data.motivo : '') + '.';
          result.actions.push({label:'📋 Ver Orçamentos', fn:'go(1)'});
        }
      }
      break;

    case 'limpar_diag':
      if (typeof window._diagLimpar === 'function') {
        window._diagLimpar();
        result.extra = '🗑 Logs de diagnóstico limpos!';
      } else {
        result.extra = '⚠️ Função _diagLimpar não encontrada.';
      }
      break;

    case 'atualizar_pedra':
      if (data.id && (data.custo != null || data.pr != null)) {
        var stones = (typeof CFG !== 'undefined' && CFG.stones) ? CFG.stones : [];
        var pedra = stones.find(function(s) { return s.id === data.id; });
        // Fallback: busca por nome parcial
        if (!pedra && data.nm) {
          var nmBusca = (data.nm || '').toLowerCase();
          pedra = stones.find(function(s) { return s.nm && s.nm.toLowerCase().indexOf(nmBusca) !== -1; });
        }
        if (!pedra) {
          var lista = stones.map(function(s) { return s.id + ' (' + s.nm + ')'; }).join(', ');
          result.extra = '⚠️ Pedra com id **"' + data.id + '"** não encontrada no catálogo.\nDisponíveis: ' + lista;
        } else {
          var mudancas = [];
          if (data.custo != null) { mudancas.push('custo: R$ ' + fm(pedra.custo||0) + ' → R$ ' + fm(data.custo)); pedra.custo = +data.custo; }
          if (data.pr != null)    { mudancas.push('venda: R$ ' + fm(pedra.pr||0)    + ' → R$ ' + fm(data.pr));    pedra.pr    = +data.pr; }
          // Persiste CFG
          try { localStorage.setItem('hr_cfg', JSON.stringify(CFG)); } catch(eCfg) {}
          if (typeof renderConfig === 'function') renderConfig();
          result.extra = '✅ **' + pedra.nm + '** atualizada!\n• ' + mudancas.join('\n• ');
          result.actions.push({label:'⚙️ Ver Catálogo', fn:'go(6)'});
        }
      } else {
        result.extra = '⚠️ Informe o id da pedra e ao menos custo ou pr. Ex: {action:"atualizar_pedra",id:"p_gabriel",custo:250}';
      }
      break;

    case 'lancar_boleto':
      if (data.fornecedor && data.valor > 0) {
        var dtBoleto = data.vencimento || hoje;
        var descBoleto = 'Boleto — ' + data.fornecedor;
        // Cria despesa futura (a pagar) como lançamento pendente de saída
        DB.t.unshift({id:_genId(), type:'pend', desc:descBoleto, value:+data.valor, date:dtBoleto, _boleto:true});
        _dbSv(); if (typeof renderFin === 'function') renderFin();
        result.extra = '✅ Boleto de **R$ ' + fm(data.valor) + '** para **' + data.fornecedor + '** lançado!' +
          '\nVencimento: **' + fd(dtBoleto) + '**. Aparecerá em A Receber como despesa pendente.';
        result.actions.push({label:'💰 Ver Finanças', fn:'go(4)'});
      } else {
        result.extra = '⚠️ Informe o fornecedor e o valor do boleto.';
      }
      break;

    case 'lembrete':
      if (data.texto) {
        var lembretes = [];
        try { lembretes = JSON.parse(localStorage.getItem('hr_lembretes') || '[]'); } catch(eL) {}
        var novoLemb = {id:_genId(), texto:data.texto, data:data.data||hoje, criado:hoje, lido:false};
        lembretes.unshift(novoLemb);
        // Mantém últimos 50
        if (lembretes.length > 50) lembretes = lembretes.slice(0, 50);
        try { localStorage.setItem('hr_lembretes', JSON.stringify(lembretes)); } catch(eL2) {}
        result.extra = '📌 Lembrete salvo: **"' + data.texto + '"**' +
          (data.data && data.data !== hoje ? ' para **' + fd(data.data) + '**' : ' para **hoje**') + '.';
      } else {
        result.extra = '⚠️ Informe o texto do lembrete.';
      }
      break;
  }

  return result;
}

// Executa ação direto (chamado pelo botão Confirmar — já passou pela guarda de R$500)
function _chatExecuteActionDirect(data) {
  var result = _chatExecuteAction(data); // _confirmado=true pula a guarda
  var msg = result.extra || '\u2705 Feito!';
  _chatBotReply(msg, result.actions.length ? result.actions : null);
}


function _chatBotReply(text, actions) {
  _chat.thinking = false;
  var ts = new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'});
  _chat.history.push({ role: 'assistant', content: text, actions: actions || [], ts: ts, _streaming: true });
  _chatSave();
  renderChat();
  _chatScrollBottom();
  _chatVozFalar(text);
  // Remover flag de streaming após animação CSS
  setTimeout(function() {
    var last = _chat.history[_chat.history.length - 1];
    if (last) delete last._streaming;
  }, 800);
  // Refresh dos chips após ação (contagens podem ter mudado)
  setTimeout(function() {
    var chipsEl = document.getElementById('chatChips');
    if (!chipsEl) return;
    var chips = _chatGetContextChips();
    var h = '';
    chips.forEach(function(c) {
      h += '<button class="chat-chip" onclick="_chatUserMsg(' + JSON.stringify(c.text) + ')">' + c.label + '</button>';
    });
    chipsEl.innerHTML = h;
  }, 400);
}

// ══════════════════════════════════════════════════════════════
// VOZ DE SAÍDA — speechSynthesis (modo mãos-livres)
// ══════════════════════════════════════════════════════════════
var _chatVoz = {
  ativo: false
};

function _chatVozLoad() {
  try { _chatVoz.ativo = localStorage.getItem('hr_chat_voz') === '1'; } catch(e) {}
}

function chatVozToggle() {
  _chatVoz.ativo = !_chatVoz.ativo;
  try { localStorage.setItem('hr_chat_voz', _chatVoz.ativo ? '1' : '0'); } catch(e) {}
  // Cancela fala em andamento se desativou
  if (!_chatVoz.ativo && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  // Atualiza apenas o botão sem re-renderizar tudo
  var btn = document.getElementById('chatVozBtn');
  if (btn) {
    btn.textContent = _chatVoz.ativo ? '🔊' : '🔇';
    btn.title = _chatVoz.ativo ? 'Voz ativa — clique para desativar' : 'Ativar voz de saída';
    btn.style.borderColor = _chatVoz.ativo ? 'rgba(201,168,76,.5)' : '';
    btn.style.color = _chatVoz.ativo ? '#c9a84c' : '';
  }
  if (_chatVoz.ativo) {
    _chatVozFalar('Modo de voz ativado.');
  }
}

function _chatVozFalar(texto) {
  if (!_chatVoz.ativo) return;
  if (!window.speechSynthesis) return;

  // Limpa markdown antes de falar
  var limpo = texto
    .replace(/```[\s\S]*?```/g, 'bloco de código omitido.')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,3}\s/g, '')
    .replace(/•\s/g, '')
    .replace(/══+[^═]*══+/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, '. ')
    .replace(/R\$\s*([\d.,]+)/g, function(_, v) { return 'R$ ' + v; })
    .replace(/\s{2,}/g, ' ')
    .trim();

  // Trunca respostas longas para não ficar interminável
  if (limpo.length > 400) {
    limpo = limpo.slice(0, 400) + '... mensagem longa, veja o texto completo.';
  }

  window.speechSynthesis.cancel();
  var utt = new SpeechSynthesisUtterance(limpo);
  utt.lang = 'pt-BR';
  utt.rate = 1.05;
  utt.pitch = 1.0;

  // Prefere voz feminina em pt-BR se disponível
  var vozes = window.speechSynthesis.getVoices();
  var vozPT = vozes.find(function(v) {
    return v.lang.indexOf('pt') !== -1 && v.name.toLowerCase().indexOf('female') !== -1;
  }) || vozes.find(function(v) {
    return v.lang.indexOf('pt-BR') !== -1;
  }) || vozes.find(function(v) {
    return v.lang.indexOf('pt') !== -1;
  });
  if (vozPT) utt.voice = vozPT;

  window.speechSynthesis.speak(utt);
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

  // Whisper exige chave OpenAI (sk-...) — NÃO usa a chave Anthropic (sk-ant-...)
  var openaiKey = (CFG && CFG.emp && CFG.emp.openaiKey) || '';
  var anthropicKey = (CFG && CFG.emp && CFG.emp.apiKey) || '';

  // Se tiver campo separado openaiKey usa ele; senão tenta apiKey apenas se for OpenAI
  var key = openaiKey || (anthropicKey.indexOf('sk-ant-') !== 0 ? anthropicKey : '');

  if (!key) {
    toast('⚠️ Transcrição requer chave OpenAI. Adicione em Config → Empresa → Chave OpenAI (Whisper).');
    var statusEl = document.getElementById('chatMicStatus');
    if (statusEl) statusEl.textContent = '';
    return;
  }

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
    .chat-wrap { display:flex;flex-direction:column;position:absolute;top:0;left:0;right:0;bottom:0;min-height:0;background:var(--s1); }

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
    .chat-voz-btn {
      background:none;border:1px solid var(--bd);border-radius:8px;
      padding:5px 8px;color:var(--t4);font-size:.8rem;cursor:pointer;
      transition:border-color .15s,color .15s;
    }
    .chat-voz-btn:hover { border-color:rgba(201,168,76,.4);color:#c9a84c; }

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
    .chat-img-btn {
      width:40px;height:40px;border-radius:50%;flex-shrink:0;
      background:var(--s3);border:1px solid var(--bd);
      color:var(--t2);font-size:1.1rem;cursor:pointer;
      display:flex;align-items:center;justify-content:center;
      transition:all .15s;
    }
    .chat-img-btn:hover { background:rgba(201,168,76,.12);border-color:rgba(201,168,76,.3);color:var(--gold2); }
    .chat-img-btn:active { transform:scale(.92); }
  `;
  document.head.appendChild(s);
}
