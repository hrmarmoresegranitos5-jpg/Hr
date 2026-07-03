// ══════════════════════════════════════════════════════════════
// APP-RH-IA v1.0 — HR Mármores e Granitos
// Chat de IA dedicado SOMENTE ao módulo de RH (funcionários).
// Foco: consultar saldo/extrato e pagar decêndio/folha por texto.
//
// Reaproveita:
//  • CFG.emp.apiKey        — mesma chave/provedor da Secretária
//  • HR_FUNC.calcSaldoFuncionario — motor único de saldo (não reinventa)
//  • HR_FUNC.registrarPagamento   — motor único de pagamento (não reinventa)
//
// Abre como overlay independente (mesmo padrão dos modais de
// app-funcionarios.js), então não interfere na renderização da
// tela de RH existente.
// ══════════════════════════════════════════════════════════════
var HR_IA = (function () {

  var STORE_KEY = 'hr_ia_chat';
  var msgs = [];
  var enviando = false;

  // ── Persistência local do histórico (só desta aba de chat) ──
  function _load() {
    try { msgs = JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch (e) { msgs = []; }
  }
  function _save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(msgs.slice(-40))); } catch (e) {}
  }

  // ── Helpers ──
  function _esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  function _md(s) {
    // Negrito simples **texto** — sem markdown completo, só o essencial
    return _esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }
  function _fmtMoeda(v) { return 'R$ ' + (parseFloat(v) || 0).toFixed(2).replace('.', ','); }
  function _hoje() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // ── Contexto: saldo/extrato de todos os funcionários ativos ──
  // Usa exatamente o mesmo motor que a Folha e o Card usam (HR_FUNC.calcSaldoFuncionario),
  // então os números que a IA fala batem com os números que aparecem na tela.
  function _buildContext() {
    if (typeof HR_FUNC === 'undefined') return 'Módulo de RH indisponível no momento.';
    var funcs = HR_FUNC.getFuncionarios();
    var lista = Object.values(funcs).filter(function (f) { return f.ativo !== false; });
    if (!lista.length) return 'Nenhum funcionário ativo cadastrado.';

    var hoje = _hoje();
    var mesAtual = hoje.slice(0, 7);
    var ultimoDia = new Date(parseInt(mesAtual.slice(0, 4)), parseInt(mesAtual.slice(5, 7)), 0).getDate();
    var di = mesAtual + '-01';
    var df = mesAtual + '-' + String(ultimoDia).padStart(2, '0');

    var linhas = lista.map(function (f) {
      var s;
      try { s = HR_FUNC.calcSaldoFuncionario(f.id, di, df); } catch (e) { return '• ' + f.nome + ' — erro ao calcular saldo'; }
      var bancoH = ((s.banco && s.banco.saldoMin || 0) / 60).toFixed(1);
      return '• ' + f.nome + ' (id:' + f.id + ')' +
        ' | devido no mês: ' + _fmtMoeda(s.totalDevido) +
        ' | pago: ' + _fmtMoeda(s.totalPago) +
        ' | saldo: ' + _fmtMoeda(s.saldo) + (s.temCredito ? ' (crédito a favor do funcionário)' : '') +
        ' | banco de horas: ' + bancoH + 'h';
    });

    return 'SALDO/EXTRATO RH — referência ' + mesAtual + ' (' + lista.length + ' ativo(s)):\n' + linhas.join('\n');
  }

  function _systemPrompt() {
    return [
      'Você é a IA de RH da HR Mármores e Granitos (Pilão Arcado - BA).',
      'Seu escopo é SOMENTE funcionários: consultar saldo/extrato, banco de horas e pagar decêndio/folha.',
      'Não responda sobre orçamentos, clientes, finanças gerais ou outros módulos — diga que isso é assunto pra Secretária geral.',
      'Hoje: ' + _hoje(),
      '',
      _buildContext(),
      '',
      'Responda direto e curto, com **negrito** em valores e nomes. Use os números do contexto acima — nunca invente valores.',
      '',
      'Para registrar um pagamento de decêndio/folha, responda com um bloco ```json``` assim:',
      '{"action":"pagar_decendio","funcionario":"nome ou parte do nome","valor":500,"forma":"pix","obs":"opcional"}',
      '- forma pode ser: pix, dinheiro, transferencia, outro.',
      '- Só gere esse bloco quando o usuário já confirmou funcionário E valor claramente.',
      '- Se faltar o valor, pergunte antes de agir — não estime.',
      '- Pode escrever texto normal antes/depois do bloco json.'
    ].join('\n');
  }

  // ── Chamada de IA — mesmo padrão multi-provedor usado na Secretária ──
  function _callAI(userText, cb) {
    var key = (typeof CFG !== 'undefined' && CFG.emp && CFG.emp.apiKey) || '';
    if (!key) { cb('⚠️ Configure a chave de IA em Config → Empresa antes de usar o RH IA.'); return; }

    var system = _systemPrompt();
    var isGemini = key.indexOf('AIza') === 0;
    var isGroq = key.indexOf('gsk_') === 0;

    var url, headers, body;
    if (isGemini) {
      url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=' + key;
      headers = { 'Content-Type': 'application/json' };
      body = JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }]
      });
    } else if (isGroq) {
      url = 'https://api.groq.com/openai/v1/chat/completions';
      headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key };
      body = JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'system', content: system }, { role: 'user', content: userText }]
      });
    } else {
      url = 'https://api.anthropic.com/v1/messages';
      headers = {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      };
      body = JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: system,
        messages: [{ role: 'user', content: userText }]
      });
    }

    fetch(url, { method: 'POST', headers: headers, body: body })
      .then(function (r) { return r.json(); })
      .then(function (data) {
        var texto = '';
        try {
          if (isGemini) {
            var parts = (((data.candidates || [])[0] || {}).content || {}).parts || [];
            texto = parts.map(function (p) { return p.text || ''; }).join('');
          } else if (isGroq) {
            texto = (((data.choices || [])[0] || {}).message || {}).content || '';
          } else {
            texto = (data.content || []).map(function (c) { return c.text || ''; }).join('');
          }
        } catch (e) {}
        if (!texto) texto = '⚠️ Não consegui gerar resposta agora. Tente de novo em instantes.';
        cb(texto);
      })
      .catch(function (err) { cb('⚠️ Erro ao consultar IA: ' + err.message); });
  }

  // ── Prepara a ação de pagamento vinda da IA — NÃO executa ainda.
  // Pagamento é dinheiro de verdade, então exige confirmação explícita
  // do usuário (ver _bubble / confirmar / cancelar mais abaixo).
  function _prepararPagamento(data) {
    if (!data.funcionario || !(parseFloat(data.valor) > 0)) {
      return { erro: '⚠️ Faltou informar funcionário ou valor pro pagamento.' };
    }
    if (typeof HR_FUNC === 'undefined') return { erro: '⚠️ Módulo de RH indisponível.' };

    var funcs = HR_FUNC.getFuncionarios();
    var lista = Object.values(funcs);
    var nomeBusca = (data.funcionario || '').toLowerCase().trim();

    var f = lista.find(function (x) { return x.nome && x.nome.toLowerCase().indexOf(nomeBusca) !== -1; });
    if (!f && nomeBusca.length > 2) {
      var palavras = nomeBusca.split(' ');
      f = lista.find(function (x) {
        return x.nome && palavras.some(function (p) { return p.length > 2 && x.nome.toLowerCase().indexOf(p) !== -1; });
      });
    }
    if (!f) {
      var nomes = lista.map(function (x) { return x.nome; }).join(', ');
      return { erro: '⚠️ Funcionário **"' + data.funcionario + '"** não encontrado. Cadastrados: ' + (nomes || 'nenhum') + '.' };
    }

    return {
      pendente: {
        id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        status: 'pendente', // pendente | confirmado | cancelado | erro
        funcionarioId: f.id,
        funcionarioNome: f.nome,
        valor: +data.valor,
        forma: data.forma || 'pix',
        obs: data.obs || 'Lançado via RH IA'
      }
    };
  }

  // ── Executa de fato um pagamento pendente já confirmado pelo usuário ──
  function _efetivarPagamento(p) {
    if (typeof HR_FUNC === 'undefined' || typeof HR_FUNC.registrarPagamento !== 'function') {
      return '⚠️ Módulo de RH indisponível.';
    }
    var res = HR_FUNC.registrarPagamento({
      funcionarioId: p.funcionarioId,
      data: _hoje(),
      valor: p.valor,
      tipo: 'decendio',
      forma: p.forma,
      obs: p.obs
    });
    if (!res || !res.ok) return '⚠️ ' + ((res && res.erro) || 'Não foi possível registrar o pagamento.');

    try { if (typeof HR_FUNC.renderPaginaFuncionarios === 'function') HR_FUNC.renderPaginaFuncionarios(); } catch (e) {}

    var mesAtual = _hoje().slice(0, 7);
    var s = null;
    try { s = HR_FUNC.calcSaldoFuncionario(p.funcionarioId, mesAtual + '-01', _hoje()); } catch (e) {}
    var saldoTxt = '';
    if (s) {
      saldoTxt = s.saldo > 0.01
        ? ' Ainda deve **' + _fmtMoeda(s.saldo) + '**.'
        : (s.saldo < -0.01
          ? ' Crédito de **' + _fmtMoeda(Math.abs(s.saldo)) + '**.'
          : ' Conta **quitada**! ✅');
    }
    return '✅ Pagamento de **' + _fmtMoeda(p.valor) + '** para **' + p.funcionarioNome + '** registrado.' + saldoTxt;
  }

  function confirmar(id) {
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m.pending && m.pending.id === id && m.pending.status === 'pendente') {
        var texto = _efetivarPagamento(m.pending);
        m.pending.status = texto.indexOf('⚠️') === 0 ? 'erro' : 'confirmado';
        msgs.push({ role: 'bot', text: texto });
        render(); _save();
        return;
      }
    }
  }

  function cancelar(id) {
    for (var i = 0; i < msgs.length; i++) {
      var m = msgs[i];
      if (m.pending && m.pending.id === id && m.pending.status === 'pendente') {
        m.pending.status = 'cancelado';
        msgs.push({ role: 'bot', text: '❌ Pagamento cancelado.' });
        render(); _save();
        return;
      }
    }
  }

  function _processReply(texto) {
    var out = texto;
    var re = /```json\s*([\s\S]*?)```/g;
    var m, textoExtra = [], pendentes = [];
    while ((m = re.exec(texto))) {
      try {
        var d = JSON.parse(m[1]);
        if (d && d.action === 'pagar_decendio') {
          var prep = _prepararPagamento(d);
          if (prep.erro) textoExtra.push(prep.erro);
          else pendentes.push(prep.pendente);
        }
      } catch (e) {}
    }
    out = out.replace(re, '').trim();
    if (textoExtra.length) out += (out ? '\n\n' : '') + textoExtra.join('\n');
    return { texto: out || (pendentes.length ? '' : '✅ Feito.'), pendentes: pendentes };
  }

  // ── UI ──
  function _bubble(m) {
    if (m.pending) return _bubblePendente(m.pending);
    var isUser = m.role === 'user';
    return '<div style="display:flex;' + (isUser ? 'justify-content:flex-end;' : 'justify-content:flex-start;') + 'margin-bottom:10px;">' +
      '<div style="max-width:82%;padding:10px 13px;border-radius:14px;font-size:.82rem;line-height:1.5;white-space:pre-wrap;' +
      (isUser
        ? 'background:#C9A84C;color:#000;border-bottom-right-radius:4px;'
        : 'background:rgba(255,255,255,.06);color:#eee;border-bottom-left-radius:4px;') + '">' +
      _md(m.text) +
      '</div></div>';
  }

  function _bubblePendente(p) {
    var corBorda = p.status === 'pendente' ? 'rgba(201,168,76,.5)' : 'rgba(255,255,255,.08)';
    var statusTxt = {
      pendente: '⏳ Aguardando confirmação',
      confirmado: '✅ Confirmado',
      cancelado: '❌ Cancelado',
      erro: '⚠️ Erro ao registrar'
    }[p.status] || '';

    var botoes = p.status === 'pendente'
      ? '<div style="display:flex;gap:8px;margin-top:10px;">' +
        '<button onclick="HR_IA.confirmar(\'' + p.id + '\')" style="flex:1;background:#C9A84C;border:none;border-radius:8px;padding:9px;color:#000;font-weight:800;font-size:.78rem;cursor:pointer;">✓ Confirmar</button>' +
        '<button onclick="HR_IA.cancelar(\'' + p.id + '\')" style="flex:1;background:transparent;border:1px solid rgba(255,255,255,.2);border-radius:8px;padding:9px;color:#ccc;font-size:.78rem;cursor:pointer;">Cancelar</button>' +
        '</div>'
      : '';

    return '<div style="display:flex;justify-content:flex-start;margin-bottom:10px;">' +
      '<div style="max-width:88%;padding:12px 14px;border-radius:14px;border:1px solid ' + corBorda + ';background:rgba(255,255,255,.04);border-bottom-left-radius:4px;">' +
      '<div style="font-size:.68rem;color:#C9A84C;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px;">💳 Pagamento de decêndio</div>' +
      '<div style="font-size:.85rem;color:#fff;line-height:1.6;">' +
      'Funcionário: <strong>' + _esc(p.funcionarioNome) + '</strong><br>' +
      'Valor: <strong>' + _fmtMoeda(p.valor) + '</strong><br>' +
      'Forma: <strong>' + _esc(p.forma) + '</strong>' +
      '</div>' +
      '<div style="font-size:.68rem;color:#999;margin-top:8px;">' + statusTxt + '</div>' +
      botoes +
      '</div></div>';
  }

  var CHIPS = [
    { label: '💰 Saldo de todos', texto: 'Me dá o saldo/extrato de todos os funcionários' },
    { label: '⏱️ Banco de horas', texto: 'Como está o banco de horas de cada um?' },
    { label: '📆 Decêndio atual', texto: 'Qual decêndio está em aberto agora e quem falta pagar?' }
  ];

  function _chipsHtml() {
    return '<div id="rhIaChips" style="display:flex;gap:6px;padding:0 16px 10px;flex-wrap:wrap;flex-shrink:0;">' +
      CHIPS.map(function (c) {
        return '<button onclick="HR_IA.chip(' + JSON.stringify(c.texto).replace(/"/g, '&quot;') + ')" ' +
          'style="background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:7px 12px;color:#ccc;font-size:.72rem;cursor:pointer;white-space:nowrap;">' +
          c.label + '</button>';
      }).join('') +
      '</div>';
  }

  function chip(texto) {
    var inp = document.getElementById('rhIaInput');
    if (!inp) return;
    inp.value = texto;
    enviar();
  }

  function render() {
    var body = document.getElementById('rhIaMsgs');
    if (!body) return;
    body.innerHTML = msgs.length
      ? msgs.map(_bubble).join('')
      : '<div style="text-align:center;color:#888;font-size:.78rem;padding:30px 20px;line-height:1.6;">' +
        '👋 Pergunte sobre saldo, extrato ou banco de horas — ou peça pra pagar um decêndio.<br><br>' +
        '<span style="opacity:.7;">Ex: "qual o saldo do Hugo?" · "extrato do Fabrício" · "paga 500 de decêndio pro Gibson no pix"</span></div>';
    body.scrollTop = body.scrollHeight;
  }

  function abrir() {
    fechar();
    _load();
    var ov = document.createElement('div');
    ov.id = 'rhIaOverlay';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:#0b0906;display:flex;flex-direction:column;font-family:Outfit,sans-serif;';
    ov.innerHTML =
      '<div style="padding:16px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">' +
      '<div><div style="font-size:.55rem;color:#C9A84C;letter-spacing:.18em;text-transform:uppercase;">HR MÁRMORES</div>' +
      '<div style="font-size:1.1rem;font-weight:800;color:#fff;">🤖 RH IA</div>' +
      '<div style="font-size:.68rem;color:#999;margin-top:2px;">Saldo, extrato e pagamento de decêndio</div></div>' +
      '<button onclick="HR_IA.fechar()" style="background:none;border:none;color:#999;font-size:1.2rem;cursor:pointer;padding:4px 0 4px 8px;">✕</button>' +
      '</div>' +
      '<div id="rhIaMsgs" style="flex:1;overflow-y:auto;padding:16px;"></div>' +
      _chipsHtml() +
      '<div style="padding:12px;border-top:1px solid rgba(255,255,255,.08);display:flex;gap:8px;flex-shrink:0;">' +
      '<textarea id="rhIaInput" rows="1" placeholder="Pergunte sobre saldo ou pague um decêndio..." ' +
      'style="flex:1;resize:none;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:10px 12px;color:#fff;font-family:Outfit,sans-serif;font-size:.82rem;" ' +
      'onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();HR_IA.enviar();}"></textarea>' +
      '<button id="rhIaBtnEnviar" onclick="HR_IA.enviar()" style="background:#C9A84C;border:none;border-radius:10px;padding:0 16px;color:#000;font-weight:800;cursor:pointer;">➤</button>' +
      '</div>';
    document.body.appendChild(ov);
    render();
    setTimeout(function () {
      var inp = document.getElementById('rhIaInput');
      if (inp) inp.focus();
    }, 100);
  }

  function fechar() {
    var ov = document.getElementById('rhIaOverlay');
    if (ov) ov.remove();
  }

  function _setEnviando(on) {
    enviando = on;
    var btn = document.getElementById('rhIaBtnEnviar');
    var inp = document.getElementById('rhIaInput');
    if (btn) { btn.disabled = on; btn.style.opacity = on ? '.5' : '1'; }
    if (inp) inp.disabled = on;
  }

  function enviar() {
    if (enviando) return;
    var inp = document.getElementById('rhIaInput');
    if (!inp) return;
    var texto = (inp.value || '').trim();
    if (!texto) return;
    inp.value = '';

    msgs.push({ role: 'user', text: texto });
    render(); _save();

    _setEnviando(true);
    msgs.push({ role: 'bot', text: '⏳ Consultando...' });
    render();

    _callAI(texto, function (resposta) {
      msgs.pop(); // remove "Consultando..."
      var resultado = _processReply(resposta);
      if (resultado.texto) msgs.push({ role: 'bot', text: resultado.texto });
      resultado.pendentes.forEach(function (p) { msgs.push({ role: 'bot', pending: p }); });
      _setEnviando(false);
      render(); _save();
    });
  }

  return { abrir: abrir, fechar: fechar, enviar: enviar, render: render, confirmar: confirmar, cancelar: cancelar, chip: chip };
})();
