// ══════════════════════════════════════════════════════════════
// SECRETÁRIA IA — Chat com voz + texto + controle total do app
// ══════════════════════════════════════════════════════════════

var _chat = {
  history: [],       // {role, content, ts, actions}
  recording: false,
  mediaRecorder: null,
  audioChunks: [],
  thinking: false,
  recognition: null
};

// ── Salva/carrega histórico ──
function _chatLoad() {
  try { _chat.history = JSON.parse(localStorage.getItem('hr_chat') || '[]'); } catch(e) { _chat.history = []; }
}
function _chatSave() {
  try { localStorage.setItem('hr_chat', JSON.stringify(_chat.history.slice(-60))); } catch(e) {}
}

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

  // ── Header ──
  h += '<div class="chat-header">';
  h += '<div class="chat-avatar"><span>🤖</span><div class="chat-avatar-dot"></div></div>';
  h += '<div class="chat-header-info"><div class="chat-header-name">Secretária HR</div>';
  h += '<div class="chat-header-sub">IA com controle total do app</div></div>';
  h += '<button class="chat-clear-btn" onclick="chatClear()" title="Limpar conversa">🗑</button>';
  h += '</div>';

  // ── Mensagens ──
  h += '<div class="chat-messages" id="chatMessages">';
  if (!_chat.history.length) {
    h += _chatBubbleBot(
      '👋 Olá! Sou a secretária da HR Mármores. Posso te ajudar com:\n\n' +
      '• 📋 Fazer orçamentos\n' +
      '• 📅 Agendar na agenda\n' +
      '• 💰 Lançar despesas e entradas\n' +
      '• 🔍 Consultar jobs em andamento\n' +
      '• 👥 Ver histórico de clientes\n' +
      '• 📝 Qualquer outra coisa!\n\n' +
      'Pode escrever ou usar o microfone 🎙',
      null, null
    );
  } else {
    _chat.history.forEach(function(msg) {
      if (msg.role === 'user') {
        h += _chatBubbleUser(msg.content, msg.ts);
      } else {
        h += _chatBubbleBot(msg.content, msg.actions || null, msg.ts);
      }
    });
  }
  if (_chat.thinking) {
    h += '<div class="chat-bubble chat-bubble-bot chat-thinking" id="chatThinking">';
    h += '<span></span><span></span><span></span>';
    h += '</div>';
  }
  h += '</div>';

  // ── Input ──
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

function _chatBubbleBot(text, actions, ts) {
  var formatted = _chatFormatText(text);
  var h = '<div class="chat-bubble chat-bubble-bot">';
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
// IA — CONTEXTO + CHAMADA À API
// ══════════════════════════════════════════════════════════════
function _chatBuildContext() {
  var hoje = td();
  var mes  = hoje.slice(0,7);

  var jobs = (DB.j || []).filter(function(j){ return !j.done; }).slice(0,15).map(function(j){
    var diff = dDiff(j.end);
    return j.cli + ' | ' + j.desc + ' | prazo: ' + (j.end||'?') + (diff < 0 ? ' (ATRASADO '+Math.abs(diff)+'d)' : ' (em '+diff+'d)') + ' | R$ ' + fm(j.value||0);
  });

  var pendentes = (DB.t||[]).filter(function(t){ return t.type==='pend'; }).slice(0,10).map(function(t){
    return t.desc + ' | R$ ' + fm(t.value||0) + ' | vence: ' + (t.date||'?');
  });

  var recMes = (DB.t||[]).filter(function(t){ return t.type==='in' && (t.date||'').slice(0,7)===mes; })
    .reduce(function(s,t){ return s+(t.value||0); }, 0);
  var despMes = (DB.t||[]).filter(function(t){ return t.type==='out' && (t.date||'').slice(0,7)===mes; })
    .reduce(function(s,t){ return s+(t.value||0); }, 0);
  var fixos = (CFG.fixos||[]).reduce(function(s,f){ return s+(f.v||0); },0);

  var ultClientes = {};
  (DB.q||[]).slice(0,20).forEach(function(q){ if(q.cli) ultClientes[q.cli] = (q.date||''); });
  var cliList = Object.keys(ultClientes).slice(0,15).join(', ');

  var visitas = (_getV()).filter(function(v){ return v.status==='agendada'; }).slice(0,5).map(function(v){
    return v.cli + ' | ' + v.date + (v.hora?' às '+v.hora:'') + (v.end?' | '+v.end:'');
  });

  return 'DADOS HR MÁRMORES — hoje: ' + hoje + '\n' +
    'Faturado este mês: R$ ' + fm(recMes) + ' | Despesas: R$ ' + fm(despMes) + ' | Custos fixos: R$ ' + fm(fixos) + '\n\n' +
    'JOBS EM PRODUÇÃO (' + jobs.length + '):\n' + (jobs.join('\n') || 'Nenhum') + '\n\n' +
    'A RECEBER (' + pendentes.length + '):\n' + (pendentes.join('\n') || 'Nenhum') + '\n\n' +
    'VISITAS AGENDADAS:\n' + (visitas.join('\n') || 'Nenhuma') + '\n\n' +
    'CLIENTES RECENTES: ' + (cliList || 'Nenhum');
}

function _chatBuildSystem() {
  return 'Você é a Secretária IA da HR Mármores e Granitos — empresa de mármores e granitos em Pilão Arcado-BA.\n' +
    'Você tem acesso e controle total do aplicativo de gestão.\n\n' +
    'AÇÕES DISPONÍVEIS — quando o usuário pedir, retorne JSON de ação junto com sua resposta:\n' +
    '1. Lançar despesa: {"action":"despesa","desc":"descrição","valor":100}\n' +
    '2. Lançar entrada: {"action":"entrada","desc":"descrição","valor":100}\n' +
    '3. Lançar a receber: {"action":"areceber","desc":"descrição","valor":100,"data":"YYYY-MM-DD"}\n' +
    '4. Adicionar job na agenda: {"action":"job","cli":"nome","desc":"serviço","dias":10,"valor":500}\n' +
    '5. Agendar visita: {"action":"visita","cli":"nome","data":"YYYY-MM-DD","hora":"09:00","end":"endereço"}\n' +
    '6. Navegar para seção: {"action":"nav","tela":"financas|agenda|historico|contratos|orcamento"}\n' +
    '7. Lembrete (apenas mensagem): sem action\n\n' +
    'REGRAS:\n' +
    '- Responda SEMPRE em português brasileiro, tom profissional mas amigável\n' +
    '- Seja direto e objetivo — máximo 4 linhas por resposta\n' +
    '- Quando executar uma ação, confirme o que foi feito com valores e nomes\n' +
    '- Se precisar de mais informações, pergunte apenas o essencial\n' +
    '- Para orçamentos, oriente o usuário a usar a tela de Orçamento com os detalhes específicos\n' +
    '- Extraia valores de texto natural: "trezentos reais" = 300, "1.500" = 1500\n' +
    '- Se detectar JSON de ação na sua resposta, envolva-o em ```json ... ``` separado do texto\n\n' +
    'FORMATO DE RESPOSTA quando executar ação:\n' +
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

  // Monta histórico para a API (últimas 10 msgs)
  var apiMessages = [{role:'system', content: systemPrompt}];
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
      max_tokens: 800,
      system: systemPrompt,
      messages: apiMessages.filter(function(m){ return m.role !== 'system'; })
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
    // Fallback para Groq se Anthropic falhar
    var groqKey = key;
    fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + groqKey },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 600,
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
      console.error('chat API error:', err);
    });
  });
}

// ══════════════════════════════════════════════════════════════
// PROCESSAR RESPOSTA + EXECUTAR AÇÕES
// ══════════════════════════════════════════════════════════════
function _chatProcessReply(text) {
  var actions = [];
  var cleanText = text;

  // Extrai JSON de ação do texto
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
        result.actions.push({label:'💰 Ver A Receber', fn:'go(4);setTimeout(function(){finTab(\'areceber\')},200)'});
      }
      break;

    case 'job':
      if (data.cli && data.desc) {
        var dias = +(data.dias) || 7;
        var start = hoje;
        var end   = addD(hoje, dias);
        var val   = +(data.valor) || 0;
        DB.j.unshift({id:Date.now(), cli:data.cli, desc:data.desc, start:start, end:end, value:val, pago:0, obs:data.obs||'', done:false});
        DB.sv(); renderAg(); updUrgDot();
        result.extra = '✅ Job **' + data.cli + '** adicionado na agenda! Prazo: ' + fd(end);
        result.actions.push({label:'📅 Ver Agenda', fn:'go(0)'});
      }
      break;

    case 'visita':
      if (data.cli && data.data) {
        _getV().unshift({id:Date.now(), cli:data.cli, tel:data.tel||'', end:data.end||'', date:data.data, hora:data.hora||'', obs:data.obs||'', status:'agendada'});
        _saveV(); renderSecretaria(); secNotifDotUpdate();
        result.extra = '✅ Visita com **' + data.cli + '** agendada para ' + fd(data.data) + (data.hora?' às '+data.hora:'') + '!';
        result.actions.push({label:'📐 Ver na Secretária', fn:'go(11)'});
      }
      break;

    case 'nav':
      var navMap = {financas:4, agenda:0, historico:7, contratos:3, orcamento:1};
      var pg = navMap[data.tela];
      if (pg !== undefined) {
        result.actions.push({label:'→ Ir agora', fn:'go('+pg+')'});
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

  // Tenta Web Speech API primeiro (mais rápido, sem custo)
  if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    _chat.recognition = new SR();
    _chat.recognition.lang = 'pt-BR';
    _chat.recognition.continuous = false;
    _chat.recognition.interimResults = false;

    _chat.recognition.onstart = function() {
      _chat.recording = true;
      _chatMicUI(true);
    };
    _chat.recognition.onresult = function(ev) {
      var transcript = ev.results[0][0].transcript;
      _chatMicUI(false);
      _chat.recording = false;
      if (transcript.trim()) _chatUserMsg(transcript.trim());
    };
    _chat.recognition.onerror = function() {
      _chatMicUI(false);
      _chat.recording = false;
      toast('Não consegui captar o áudio. Tente novamente.');
    };
    _chat.recognition.onend = function() {
      _chat.recording = false;
      _chatMicUI(false);
    };
    _chat.recognition.start();
    return;
  }

  // Fallback: MediaRecorder (envia para Whisper / transcrição manual)
  navigator.mediaDevices.getUserMedia({audio: true}).then(function(stream) {
    _chat.recording = true;
    _chat.audioChunks = [];
    _chatMicUI(true);

    _chat.mediaRecorder = new MediaRecorder(stream);
    _chat.mediaRecorder.ondataavailable = function(e) {
      if (e.data.size > 0) _chat.audioChunks.push(e.data);
    };
    _chat.mediaRecorder.onstop = function() {
      stream.getTracks().forEach(function(t){ t.stop(); });
      _chatProcessAudio();
    };
    _chat.mediaRecorder.start();
  }).catch(function() {
    toast('Permissão de microfone negada.');
    _chatMicUI(false);
  });
}

function chatMicStop(e) {
  e.preventDefault();
  if (!_chat.recording) return;
  _chat.recording = false;
  _chatMicUI(false);
  if (_chat.recognition) { _chat.recognition.stop(); return; }
  if (_chat.mediaRecorder && _chat.mediaRecorder.state !== 'inactive') {
    _chat.mediaRecorder.stop();
  }
}

function _chatProcessAudio() {
  if (!_chat.audioChunks.length) return;
  var blob = new Blob(_chat.audioChunks, {type:'audio/webm'});
  var key = CFG && CFG.emp && CFG.emp.apiKey;
  if (!key) { toast('Configure a chave API para usar transcrição de áudio.'); return; }

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
    else toast('Não consegui entender o áudio. Tente novamente.');
  })
  .catch(function() {
    if (statusEl) statusEl.textContent = '';
    toast('Erro na transcrição. Tente digitar sua mensagem.');
  });
}

function _chatMicUI(recording) {
  var btn = document.getElementById('chatMicBtn');
  var status = document.getElementById('chatMicStatus');
  if (btn) {
    btn.classList.toggle('recording', recording);
    btn.textContent = recording ? '⏹' : '🎙';
  }
  if (status) {
    status.textContent = recording ? '🔴 Gravando... solte para enviar' : '';
  }
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

    .chat-wrap {
      display: flex; flex-direction: column;
      height: calc(100vh - 120px);
      background: var(--s1);
    }

    /* Header */
    .chat-header {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px 10px;
      border-bottom: 1px solid var(--bd);
      background: var(--s2);
      flex-shrink: 0;
    }
    .chat-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: linear-gradient(135deg, #c9a84c, #a07830);
      display: flex; align-items: center; justify-content: center;
      font-size: 20px; position: relative; flex-shrink: 0;
    }
    .chat-avatar-dot {
      position: absolute; bottom: 1px; right: 1px;
      width: 10px; height: 10px; border-radius: 50%;
      background: #4ade80; border: 2px solid var(--s2);
    }
    .chat-header-info { flex: 1; }
    .chat-header-name { font-size: .9rem; font-weight: 700; color: var(--t1); }
    .chat-header-sub  { font-size: .65rem; color: var(--t3); margin-top: 1px; }
    .chat-clear-btn {
      background: none; border: 1px solid var(--bd); border-radius: 8px;
      padding: 5px 8px; color: var(--t4); font-size: .8rem; cursor: pointer;
    }

    /* Messages */
    .chat-messages {
      flex: 1; overflow-y: auto; padding: 14px 14px 6px;
      display: flex; flex-direction: column; gap: 10px;
    }
    .chat-bubble {
      max-width: 85%; border-radius: 16px; padding: 10px 13px;
      animation: chatFadeUp .25s ease;
      line-height: 1.55; font-size: .82rem;
    }
    .chat-bubble-user {
      align-self: flex-end;
      background: linear-gradient(135deg, #c9a84c22, #c9a84c18);
      border: 1px solid #c9a84c33;
      color: var(--t1);
      border-bottom-right-radius: 4px;
    }
    .chat-bubble-bot {
      align-self: flex-start;
      background: var(--s3);
      border: 1px solid var(--bd);
      color: var(--t1);
      border-bottom-left-radius: 4px;
    }
    .chat-bubble-text strong { color: var(--gold2); font-weight: 700; }
    .chat-bubble-text code {
      background: rgba(255,255,255,.08); border-radius: 4px;
      padding: 1px 5px; font-family: 'Courier New', monospace; font-size: .78rem;
    }
    .chat-bubble-ts {
      font-size: .58rem; color: var(--t4); margin-top: 5px; text-align: right;
    }

    /* Thinking dots */
    .chat-thinking {
      display: flex; align-items: center; gap: 4px; padding: 12px 16px;
    }
    .chat-thinking span {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--t3); display: inline-block;
    }
    .chat-thinking span:nth-child(1) { animation: chatDot 1.2s .0s infinite; }
    .chat-thinking span:nth-child(2) { animation: chatDot 1.2s .2s infinite; }
    .chat-thinking span:nth-child(3) { animation: chatDot 1.2s .4s infinite; }

    /* Action buttons */
    .chat-actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
    .chat-action-btn {
      background: rgba(201,168,76,.12); border: 1px solid rgba(201,168,76,.3);
      border-radius: 20px; padding: 5px 12px; color: var(--gold2);
      font-size: .72rem; font-weight: 700; cursor: pointer; font-family: inherit;
      transition: background .15s;
    }
    .chat-action-btn:active { background: rgba(201,168,76,.25); }

    /* Input area */
    .chat-input-area {
      padding: 10px 14px 16px;
      border-top: 1px solid var(--bd);
      background: var(--s2);
      flex-shrink: 0;
    }
    .chat-input-row { display: flex; align-items: flex-end; gap: 8px; }
    .chat-input {
      flex: 1; background: var(--s3); border: 1px solid var(--bd);
      border-radius: 22px; padding: 10px 16px; color: var(--t1);
      font-size: .83rem; font-family: inherit; resize: none; outline: none;
      line-height: 1.4; max-height: 120px; overflow-y: auto;
      transition: border .2s;
    }
    .chat-input:focus { border-color: rgba(201,168,76,.4); }
    .chat-input::placeholder { color: var(--t4); }
    .chat-send-btn {
      width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
      background: linear-gradient(135deg, #c9a84c, #a07830);
      border: none; color: #000; font-size: 1rem; font-weight: 900;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      transition: opacity .15s;
    }
    .chat-send-btn:active { opacity: .8; }
    .chat-mic-btn {
      width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0;
      background: var(--s3); border: 1px solid var(--bd);
      color: var(--t2); font-size: 1.1rem; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      transition: all .15s; user-select: none; -webkit-user-select: none;
    }
    .chat-mic-btn.recording {
      background: rgba(248,113,113,.2); border-color: rgba(248,113,113,.5);
      animation: chatPulse 1s infinite;
    }
    .chat-mic-status {
      font-size: .68rem; color: #f87171; text-align: center; min-height: 16px;
      margin-top: 4px;
    }
  `;
  document.head.appendChild(s);
}
