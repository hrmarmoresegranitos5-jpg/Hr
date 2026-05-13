// ═══════════════════════════════════════════════════════════════════════
//  HR MÁRMORES — PAINEL DE DIAGNÓSTICO PROFISSIONAL  v1.0
//  Arquivo: app-diagnostico.js
//  Adicione <script src="app-diagnostico.js"></script> no index.html
//  após os outros scripts.
// ═══════════════════════════════════════════════════════════════════════

(function() {
  'use strict';

  // ── Repositório de logs ────────────────────────────────────────────
  var DIAG = {
    logs: [],       // array de { ts, tipo, msg, src, linha, col, stack }
    maxLogs: 100,
    sugestoes: {}   // cache de sugestões por "chave de erro"
  };

  // ── Sugestões automáticas por padrão de erro ──────────────────────
  var SUGESTOES_DB = [
    {
      padrao: /CFG/i,
      titulo: 'Problema nas Configurações (CFG)',
      onde: 'app-core.js → função initCFG() ou svCFG()',
      como: 'Verifique se o localStorage "hr_cfg" está corrompido. Acesse Configurações → 🏢 Empresa → botão "Restaurar Dados" para redefinir. Se persistir, abra o console (F12) e execute: localStorage.removeItem("hr_cfg"); location.reload();'
    },
    {
      padrao: /renderAmbientes|addAmbiente|rmAmbiente/i,
      titulo: 'Erro nos Ambientes do Orçamento',
      onde: 'app-core.js → funções addAmbiente() / rmAmbiente() / renderAmbientes()',
      como: 'Normalmente causado por dados de ambiente corrompidos. Tente criar um novo orçamento em branco. Se o erro ocorrer ao editar um orçamento salvo, verifique se o item possui "ambientes" definidos corretamente no objeto do orçamento.'
    },
    {
      padrao: /buildCatalog|buildMat|buildSV/i,
      titulo: 'Erro ao Montar Catálogo / Materiais / Serviços',
      onde: 'app-core.js → funções buildCatalog(), buildMat(), buildSV()',
      como: 'Geralmente ocorre quando CFG.stones ou CFG.svList estão vazios. Acesse Configurações → 🪨 Pedras e verifique se há ao menos uma pedra cadastrada. Em seguida, clique em "✓ Salvar Configurações".'
    },
    {
      padrao: /gerarContrato|confirmarContrato/i,
      titulo: 'Erro na Geração de Contrato',
      onde: 'app-contrato.js → funções gerarContrato() / confirmarContrato()',
      como: 'Verifique se o orçamento selecionado possui cliente, material e medidas preenchidos. O contrato exige pelo menos nome do cliente e valor total calculado.'
    },
    {
      padrao: /toast/i,
      titulo: 'Elemento #toast não encontrado',
      onde: 'app-core.js → função toast() / index.html → <div id="toast">',
      como: 'O elemento HTML com id="toast" está ausente ou foi removido. Verifique index.html e certifique-se de que a linha <div class="toast" id="toast"></div> está presente antes do fechamento do <body>.'
    },
    {
      padrao: /tumul|TUM\.|_tumRender|_tumRecalc/i,
      titulo: 'Erro no Módulo de Túmulos',
      onde: 'app-tum-integracao.js / app-tum-inline.js',
      como: 'Verifique se app-tum-integracao.js e app-tum-inline.js estão carregados (F12 → Network). Se os arquivos carregam, verifique se TUM.q está inicializado antes de chamar funções de recálculo.'
    },
    {
      padrao: /SYNC|Firebase|push|syncPush/i,
      titulo: 'Erro de Sincronização / Firebase',
      onde: 'app-core.js → objeto SYNC',
      como: 'Verifique se a API Key do Firebase está configurada em Configurações → 🏢 Empresa → campo "Chave Firebase". Se não usa sincronização, ignore este erro — ele não afeta o funcionamento local do app.'
    },
    {
      padrao: /Cannot read prop|undefined is not|null is not|TypeError/i,
      titulo: 'Erro de Propriedade Indefinida (TypeError)',
      onde: 'Ver "Arquivo" e "Linha" acima',
      como: 'Um objeto ou variável está sendo acessado antes de ser inicializado. Verifique a linha indicada e certifique-se de que todos os campos obrigatórios foram preenchidos no formulário antes de executar a ação.'
    },
    {
      padrao: /SyntaxError|JSON\.parse|JSON inválido/i,
      titulo: 'Erro de Sintaxe / JSON Corrompido',
      onde: 'Geralmente no localStorage ou em um arquivo de importação',
      como: 'Um dado salvo localmente pode estar corrompido. Tente: (1) Configurações → Empresa → Restaurar dados. (2) Se não funcionar, abra F12 → Console e execute: localStorage.clear(); location.reload(); ATENÇÃO: isso apaga todas as configurações locais.'
    },
    {
      padrao: /ReferenceError|is not defined/i,
      titulo: 'Função ou Variável Não Definida',
      onde: 'Ver "Arquivo" e "Linha" acima',
      como: 'Verifique se todos os arquivos JS estão carregados na ordem correta no index.html. A ordem correta é: app-core.js → app-tum-inline.js → app-tum-integracao.js → app-diagnostico.js. Recarregue a página com Ctrl+Shift+R (cache forçado).'
    }
  ];

  // ── Resolve sugestão para um erro ────────────────────────────────
  function resolverSugestao(msg, src) {
    var texto = (msg || '') + ' ' + (src || '');
    for (var i = 0; i < SUGESTOES_DB.length; i++) {
      if (SUGESTOES_DB[i].padrao.test(texto)) {
        return SUGESTOES_DB[i];
      }
    }
    return {
      titulo: 'Erro Genérico de JavaScript',
      onde: src || 'Desconhecido',
      como: 'Abra o DevTools (F12 → Console) para ver o stack trace completo. Recarregue a página (Ctrl+Shift+R). Se o erro persistir, verifique se todos os arquivos .js estão presentes na pasta do app.'
    };
  }

  // ── Formata timestamp ─────────────────────────────────────────────
  function fmtTs(ts) {
    var d = new Date(ts);
    var pad = function(n) { return (n < 10 ? '0' : '') + n; };
    return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }

  // ── Adiciona log ao repositório ───────────────────────────────────
  function addLog(tipo, msg, src, linha, col, stack) {
    var entry = {
      ts: Date.now(),
      tipo: tipo,      // 'error' | 'warn' | 'info' | 'modificacao'
      msg: msg || '',
      src: src || '',
      linha: linha || '',
      col: col || '',
      stack: stack || '',
      sug: resolverSugestao(msg, src)
    };
    DIAG.logs.unshift(entry);
    if (DIAG.logs.length > DIAG.maxLogs) DIAG.logs.pop();

    // Atualiza badge de erros na aba
    _diagAtualizarBadge();

    // Se o painel estiver aberto na aba 9 (diagnóstico), atualiza
    if (typeof cfgTab !== 'undefined' && cfgTab === 9) {
      var body = document.getElementById('cfgBody');
      if (body) body.innerHTML = _buildDiagHTML();
    }

    return entry;
  }

  // ── Atualiza badge de contagem na aba ────────────────────────────
  function _diagAtualizarBadge() {
    var tab = document.querySelector('[data-cftab="9"]');
    if (!tab) return;
    var erros = DIAG.logs.filter(function(l) { return l.tipo === 'error'; }).length;
    var txt = '🔍 Diagnóstico';
    if (erros > 0) txt += ' <span class="diag-badge">' + erros + '</span>';
    tab.innerHTML = txt;
  }

  // ── Intercepta window.onerror ─────────────────────────────────────
  var _origOnerror = window.onerror;
  window.onerror = function(msg, src, linha, col, errObj) {
    var stack = errObj && errObj.stack ? errObj.stack : '';
    addLog('error', msg, src, linha, col, stack);

    // Chama o handler original se existia
    if (typeof _origOnerror === 'function') {
      _origOnerror(msg, src, linha, col, errObj);
    }
    // Suprime o alert padrão que estava no app
    return true;
  };

  // ── Intercepta window.onunhandledrejection (Promises) ────────────
  window.addEventListener('unhandledrejection', function(e) {
    var msg = e.reason ? (e.reason.message || String(e.reason)) : 'Promise rejeitada';
    var stack = e.reason && e.reason.stack ? e.reason.stack : '';
    addLog('error', 'Promise não tratada: ' + msg, 'Promise', '', '', stack);
  });

  // ── Intercepta console.error ──────────────────────────────────────
  var _origConsoleError = console.error;
  console.error = function() {
    var args = Array.prototype.slice.call(arguments);
    var msg = args.map(function(a) {
      if (a instanceof Error) return a.message;
      return typeof a === 'object' ? JSON.stringify(a) : String(a);
    }).join(' ');
    addLog('error', msg, 'console.error', '', '', '');
    _origConsoleError.apply(console, arguments);
  };

  // ── Intercepta console.warn ───────────────────────────────────────
  var _origConsoleWarn = console.warn;
  console.warn = function() {
    var args = Array.prototype.slice.call(arguments);
    var msg = args.map(function(a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ');
    addLog('warn', msg, 'console.warn', '', '', '');
    _origConsoleWarn.apply(console, arguments);
  };

  // ── API pública: registrar modificação manual ─────────────────────
  window.diagLog = function(msg) {
    addLog('info', msg, 'manual', '', '', '');
  };

  // ── Gera HTML do painel principal ─────────────────────────────────
  function _buildDiagHTML() {
    var erros  = DIAG.logs.filter(function(l) { return l.tipo === 'error'; });
    var avisos = DIAG.logs.filter(function(l) { return l.tipo === 'warn'; });
    var infos  = DIAG.logs.filter(function(l) { return l.tipo === 'info'; });

    var h = '';
    h += '<div style="padding:16px 4px;">';

    // ── Cabeçalho / status ────────────────────────────────────────
    h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">';
    if (erros.length === 0) {
      h += '<div style="width:48px;height:48px;border-radius:50%;background:#22c55e22;border:2px solid #22c55e;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">✅</div>';
      h += '<div><div style="font-size:.95rem;font-weight:700;color:var(--t1,#1a1a1a);">Sistema operando normalmente</div><div style="font-size:.75rem;color:var(--t3,#888);margin-top:2px;">Nenhum erro detectado desde o último carregamento</div></div>';
    } else {
      h += '<div style="width:48px;height:48px;border-radius:50%;background:#ef444422;border:2px solid #ef4444;display:flex;align-items:center;justify-content:center;font-size:1.4rem;flex-shrink:0;">⚠️</div>';
      h += '<div><div style="font-size:.95rem;font-weight:700;color:#ef4444;">' + erros.length + ' erro' + (erros.length > 1 ? 's' : '') + ' detectado' + (erros.length > 1 ? 's' : '') + '</div><div style="font-size:.75rem;color:var(--t3,#888);margin-top:2px;">' + avisos.length + ' aviso(s) · ' + infos.length + ' informação(ões)</div></div>';
    }
    h += '<button onclick="window._diagLimpar()" style="margin-left:auto;padding:6px 14px;border-radius:8px;border:1px solid var(--bd2,#ddd);background:transparent;color:var(--t3,#888);font-family:Outfit,sans-serif;font-size:.72rem;cursor:pointer;">🗑 Limpar logs</button>';
    h += '</div>';

    // ── Botões de ação rápida ─────────────────────────────────────
    h += '<div style="background:var(--bg2,#f8f8f8);border-radius:12px;padding:14px 16px;margin-bottom:20px;">';
    h += '<div style="font-size:.72rem;font-weight:700;color:var(--t3,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Ações Rápidas</div>';
    h += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    h += '<button onclick="window._diagTestarApp()" style="flex:1;min-width:120px;padding:9px 12px;border-radius:9px;border:1px solid var(--bd2,#ddd);background:var(--gold,#c9a84c);color:#000;font-family:Outfit,sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;">▶ Testar App Agora</button>';
    h += '<button onclick="window._diagExportar()" style="flex:1;min-width:120px;padding:9px 12px;border-radius:9px;border:1px solid var(--bd2,#ddd);background:transparent;color:var(--t2,#444);font-family:Outfit,sans-serif;font-size:.75rem;cursor:pointer;">📋 Copiar Relatório</button>';
    h += '<button onclick="window._diagAbrirConsole()" style="flex:1;min-width:120px;padding:9px 12px;border-radius:9px;border:1px solid var(--bd2,#ddd);background:transparent;color:var(--t2,#444);font-family:Outfit,sans-serif;font-size:.75rem;cursor:pointer;">🔧 Ajuda Dev</button>';
    h += '</div>';
    h += '</div>';

    // ── Lista de erros / logs ─────────────────────────────────────
    if (DIAG.logs.length === 0) {
      h += '<div style="text-align:center;padding:40px 20px;color:var(--t4,#aaa);font-size:.82rem;">Nenhum evento registrado.<br>Os erros aparecerão aqui automaticamente.</div>';
    } else {
      h += '<div style="font-size:.72rem;font-weight:700;color:var(--t3,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">Histórico de Eventos</div>';
      DIAG.logs.forEach(function(entry, idx) {
        h += _buildLogCard(entry, idx);
      });
    }

    // ── Seção: Como adicionar novas funções ───────────────────────
    h += '<div style="margin-top:24px;background:var(--bg2,#f8f8f8);border-radius:12px;padding:14px 16px;">';
    h += '<div style="font-size:.72rem;font-weight:700;color:var(--t3,#888);text-transform:uppercase;letter-spacing:.05em;margin-bottom:10px;">💡 Como Adicionar ou Modificar Funcionalidades</div>';
    h += '<div style="font-size:.75rem;color:var(--t2,#555);line-height:1.7;">';
    h += '<b>Para ADICIONAR uma função nova:</b><br>';
    h += '1. Abra <code>app-core.js</code> no editor de código.<br>';
    h += '2. Localize o bloco <code>// ═══ MONKEY-PATCHES ═══</code> no final do arquivo.<br>';
    h += '3. Adicione sua função seguindo o padrão existente:<br>';
    h += '<pre style="background:#1a1a2e;color:#a8edea;padding:10px;border-radius:8px;font-size:.68rem;margin:8px 0;overflow:auto;">window.addEventListener(\'load\', function() {\n  // Sua nova função aqui\n  window.minhaFuncao = function(param) {\n    // lógica...\n    toast(\'✓ Ação executada!\');\n  };\n});</pre>';
    h += '<b>Para MODIFICAR uma função existente:</b><br>';
    h += '1. Encontre a função em <code>app-core.js</code> usando Ctrl+F com o nome da função.<br>';
    h += '2. Para sobrescrever sem editar o original, use o padrão de monkey-patch (como em <code>app-tum-integracao.js</code>).<br>';
    h += '3. Sempre teste após a modificação usando o botão <b>▶ Testar App Agora</b> acima.<br>';
    h += '</div>';
    h += '</div>';

    h += '</div>';
    return h;
  }

  // ── Gera card HTML para um log individual ─────────────────────────
  function _buildLogCard(entry, idx) {
    var cores = {
      error: { bg: '#ef444415', borda: '#ef4444', icone: '❌', label: 'ERRO' },
      warn:  { bg: '#f5930015', borda: '#f59300', icone: '⚠️', label: 'AVISO' },
      info:  { bg: '#3b82f615', borda: '#3b82f6', icone: 'ℹ️', label: 'INFO' }
    };
    var c = cores[entry.tipo] || cores.info;
    var id = 'diagCard_' + idx;

    var h = '<div id="' + id + '" style="border-left:3px solid ' + c.borda + ';background:' + c.bg + ';border-radius:0 10px 10px 0;padding:12px 14px;margin-bottom:10px;">';

    // Linha do cabeçalho
    h += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">';
    h += '<span style="font-size:.9rem;">' + c.icone + '</span>';
    h += '<span style="font-size:.65rem;font-weight:700;color:' + c.borda + ';text-transform:uppercase;letter-spacing:.08em;">' + c.label + '</span>';
    h += '<span style="font-size:.65rem;color:var(--t4,#aaa);margin-left:auto;">' + fmtTs(entry.ts) + '</span>';
    h += '</div>';

    // Mensagem
    h += '<div style="font-size:.78rem;color:var(--t1,#1a1a1a);font-weight:600;margin-bottom:4px;word-break:break-word;">' + _esc(entry.msg) + '</div>';

    // Localização
    if (entry.src || entry.linha) {
      var srcCurto = entry.src ? entry.src.replace(/.*\//, '') : '';
      h += '<div style="font-size:.68rem;color:var(--t3,#888);margin-bottom:8px;">';
      if (srcCurto) h += '📄 <b>' + _esc(srcCurto) + '</b>';
      if (entry.linha) h += ' · Linha <b>' + entry.linha + '</b>';
      if (entry.col) h += ', Coluna <b>' + entry.col + '</b>';
      h += '</div>';
    }

    // Sugestão de solução (para erros)
    if (entry.tipo === 'error' && entry.sug) {
      var sugId = 'diagSug_' + idx;
      h += '<div style="background:#fff5;border:1px solid ' + c.borda + '33;border-radius:8px;padding:10px 12px;margin-top:6px;">';
      h += '<div style="font-size:.7rem;font-weight:700;color:' + c.borda + ';margin-bottom:4px;">🩺 ' + _esc(entry.sug.titulo) + '</div>';
      h += '<div style="font-size:.7rem;color:var(--t2,#555);margin-bottom:4px;"><b>📍 Onde:</b> <code>' + _esc(entry.sug.onde) + '</code></div>';
      h += '<div style="font-size:.7rem;color:var(--t2,#555);line-height:1.6;"><b>🔧 Como resolver:</b><br>' + _esc(entry.sug.como) + '</div>';
      h += '</div>';
    }

    // Stack trace (collapsível)
    if (entry.stack && entry.stack.length > 10) {
      var stId = 'diagSt_' + idx;
      h += '<div style="margin-top:6px;">';
      h += '<button onclick="var el=document.getElementById(\'' + stId + '\');el.style.display=el.style.display===\'none\'?\'block\':\'none\';" style="font-size:.65rem;padding:3px 8px;border-radius:5px;border:1px solid var(--bd2,#ddd);background:transparent;color:var(--t3,#888);cursor:pointer;">Stack trace</button>';
      h += '<pre id="' + stId + '" style="display:none;margin-top:6px;padding:8px;background:#1a1a2e;color:#a8edea;border-radius:6px;font-size:.62rem;overflow:auto;max-height:120px;white-space:pre-wrap;">' + _esc(entry.stack.substring(0, 800)) + '</pre>';
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  // ── Utilitário: escapa HTML ───────────────────────────────────────
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Ação: limpar logs ─────────────────────────────────────────────
  window._diagLimpar = function() {
    DIAG.logs = [];
    _diagAtualizarBadge();
    if (typeof cfgTab !== 'undefined' && cfgTab === 9) {
      var body = document.getElementById('cfgBody');
      if (body) body.innerHTML = _buildDiagHTML();
    }
    if (typeof toast === 'function') toast('🗑 Logs limpos');
  };

  // ── Ação: testar app ─────────────────────────────────────────────
  window._diagTestarApp = function() {
    var testes = [];
    var ok = 0;
    var fail = 0;

    function testar(nome, fn) {
      try {
        var resultado = fn();
        if (resultado === false) throw new Error('retornou false');
        testes.push({ nome: nome, ok: true });
        ok++;
      } catch(e) {
        testes.push({ nome: nome, ok: false, err: e.message });
        fail++;
        addLog('error', 'Teste falhou: ' + nome + ' — ' + e.message, 'Diagnóstico/Testes', '', '', '');
      }
    }

    // Testes básicos do app
    testar('CFG existe e tem stones', function() {
      return typeof CFG !== 'undefined' && CFG.stones && CFG.stones.length > 0;
    });
    testar('CFG.emp tem nome', function() {
      return typeof CFG !== 'undefined' && CFG.emp && CFG.emp.nome;
    });
    testar('Função toast disponível', function() {
      return typeof toast === 'function';
    });
    testar('Função buildCfg disponível', function() {
      return typeof buildCfg === 'function';
    });
    testar('Função svCFG disponível', function() {
      return typeof svCFG === 'function';
    });
    testar('Elemento #toast no DOM', function() {
      return !!document.getElementById('toast');
    });
    testar('Elemento #cfgBody no DOM', function() {
      return !!document.getElementById('cfgBody');
    });
    testar('localStorage acessível', function() {
      localStorage.setItem('_diagTest', '1');
      var v = localStorage.getItem('_diagTest');
      localStorage.removeItem('_diagTest');
      return v === '1';
    });
    testar('DB (orçamentos) acessível', function() {
      return typeof DB !== 'undefined' && typeof DB.q !== 'undefined';
    });
    testar('Função buildCatalog disponível', function() {
      return typeof buildCatalog === 'function';
    });

    // Resultado
    var h = '<div style="padding:16px 4px;">';
    h += '<div style="font-size:.95rem;font-weight:700;color:var(--t1,#1a1a1a);margin-bottom:14px;">Resultados do Teste</div>';
    testes.forEach(function(t) {
      h += '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:8px;margin-bottom:6px;background:' + (t.ok ? '#22c55e15' : '#ef444415') + ';">';
      h += '<span>' + (t.ok ? '✅' : '❌') + '</span>';
      h += '<span style="font-size:.76rem;color:var(--t1,#1a1a1a);flex:1;">' + _esc(t.nome) + '</span>';
      if (!t.ok && t.err) h += '<span style="font-size:.68rem;color:#ef4444;">' + _esc(t.err) + '</span>';
      h += '</div>';
    });
    h += '<div style="margin-top:14px;padding:10px 14px;border-radius:9px;background:' + (fail === 0 ? '#22c55e22' : '#ef444422') + ';font-size:.78rem;font-weight:700;color:' + (fail === 0 ? '#22c55e' : '#ef4444') + ';">';
    h += fail === 0 ? '✅ Todos os ' + ok + ' testes passaram!' : '⚠️ ' + fail + ' teste(s) falharam de ' + testes.length + ' total';
    h += '</div>';
    h += '<button onclick="var b=document.getElementById(\'cfgBody\');if(b)b.innerHTML=window._buildDiagHTML();" style="margin-top:12px;width:100%;padding:10px;border-radius:9px;border:1px solid var(--bd2,#ddd);background:transparent;color:var(--t2,#444);font-family:Outfit,sans-serif;font-size:.76rem;cursor:pointer;">← Voltar aos Logs</button>';
    h += '</div>';

    var body = document.getElementById('cfgBody');
    if (body) body.innerHTML = h;

    addLog('info', 'Testes executados: ' + ok + ' ok, ' + fail + ' falha(s)', 'Diagnóstico/Testes', '', '', '');
  };

  // Expõe buildDiagHTML para uso interno
  window._buildDiagHTML = _buildDiagHTML;

  // ── Ação: exportar relatório ───────────────────────────────────────
  window._diagExportar = function() {
    var linhas = ['=== RELATÓRIO DE DIAGNÓSTICO HR MÁRMORES ===',
      'Data: ' + new Date().toLocaleString('pt-BR'), ''];
    DIAG.logs.forEach(function(e, i) {
      linhas.push('[' + e.tipo.toUpperCase() + '] ' + fmtTs(e.ts) + ' — ' + e.msg);
      if (e.src) linhas.push('  Arquivo: ' + e.src + (e.linha ? ' (linha ' + e.linha + ')' : ''));
      if (e.sug) {
        linhas.push('  Sugestão: ' + e.sug.titulo);
        linhas.push('  Onde: ' + e.sug.onde);
        linhas.push('  Como: ' + e.sug.como);
      }
      linhas.push('');
    });
    var txt = linhas.join('\n');
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(txt).then(function() {
        if (typeof toast === 'function') toast('✓ Relatório copiado!');
      });
    } else {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = txt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      if (typeof toast === 'function') toast('✓ Relatório copiado!');
    }
  };

  // ── Ação: ajuda dev ───────────────────────────────────────────────
  window._diagAbrirConsole = function() {
    var h = '<div style="padding:16px 4px;">';
    h += '<div style="font-size:.95rem;font-weight:700;color:var(--t1,#1a1a1a);margin-bottom:14px;">🔧 Guia do Desenvolvedor</div>';

    var items = [
      { titulo: 'Abrir DevTools (Console)', detalhe: 'Pressione F12 ou Ctrl+Shift+I no navegador. Vá na aba "Console" para ver todos os erros com stack trace completo.' },
      { titulo: 'Forçar recarga sem cache', detalhe: 'Ctrl+Shift+R (Windows/Linux) ou Cmd+Shift+R (Mac). Limpa o cache e recarrega todos os arquivos JS.' },
      { titulo: 'Limpar localStorage', detalhe: 'F12 → Console → cole: localStorage.removeItem("hr_cfg"); location.reload(); — isso limpa as configurações salvas localmente.' },
      { titulo: 'Inspecionar CFG', detalhe: 'F12 → Console → digite: JSON.stringify(CFG, null, 2) — exibe toda a configuração atual do app.' },
      { titulo: 'Inspecionar orçamentos', detalhe: 'F12 → Console → digite: JSON.stringify(DB.q, null, 2) — lista todos os orçamentos salvos.' },
      { titulo: 'Registrar log manual', detalhe: 'No Console ou em código: diagLog("minha mensagem") — adiciona uma entrada de info no painel.' },
      { titulo: 'Estrutura dos arquivos JS', detalhe: 'app-core.js → lógica principal\napp-config.js → aba configurações\napp-tum-integracao.js → módulo túmulos\napp-diagnostico.js → este painel' },
      { titulo: 'Padrão para novas funções', detalhe: 'Adicione no final de app-core.js dentro de window.addEventListener("load", function() { ... }); para garantir que o DOM e CFG já estão prontos.' }
    ];

    items.forEach(function(item) {
      h += '<div style="background:var(--bg2,#f8f8f8);border-radius:10px;padding:11px 13px;margin-bottom:8px;">';
      h += '<div style="font-size:.76rem;font-weight:700;color:var(--t1,#1a1a1a);margin-bottom:4px;">' + _esc(item.titulo) + '</div>';
      h += '<div style="font-size:.72rem;color:var(--t2,#555);white-space:pre-wrap;line-height:1.6;">' + _esc(item.detalhe) + '</div>';
      h += '</div>';
    });

    h += '<button onclick="var b=document.getElementById(\'cfgBody\');if(b)b.innerHTML=window._buildDiagHTML();" style="margin-top:4px;width:100%;padding:10px;border-radius:9px;border:1px solid var(--bd2,#ddd);background:transparent;color:var(--t2,#444);font-family:Outfit,sans-serif;font-size:.76rem;cursor:pointer;">← Voltar aos Logs</button>';
    h += '</div>';

    var body = document.getElementById('cfgBody');
    if (body) body.innerHTML = h;
  };

  // ── CSS do badge de erros ─────────────────────────────────────────
  var style = document.createElement('style');
  style.textContent = [
    '.diag-badge{display:inline-block;background:#ef4444;color:#fff;font-size:.58rem;',
    'font-weight:700;border-radius:10px;padding:1px 5px;margin-left:3px;',
    'vertical-align:middle;line-height:1.4;font-family:Outfit,sans-serif;}',
    'pre{tab-size:2;}'
  ].join('');
  document.head.appendChild(style);

  // ── Bootstrap: injeta aba após o DOM estar pronto ─────────────────
  window.addEventListener('load', function _diagBoot() {

    // 1. Injeta aba "🔍 Diagnóstico" (tab 9) na barra de config
    var cfgTabs = document.getElementById('cfgTabs');
    if (cfgTabs && !cfgTabs.querySelector('[data-cftab="9"]')) {
      var newTab = document.createElement('div');
      newTab.className = 'cfgtab';
      newTab.setAttribute('data-cftab', '9');
      newTab.textContent = '🔍 Diagnóstico';
      cfgTabs.appendChild(newTab);
    }

    // 2. Patch buildCfg → renderiza o painel quando tab 9 está ativa
    if (typeof buildCfg === 'function') {
      var _origBuildCfg = buildCfg;
      buildCfg = function() {
        if (typeof cfgTab !== 'undefined' && cfgTab === 9) {
          var body = document.getElementById('cfgBody');
          if (body) body.innerHTML = _buildDiagHTML();
        } else {
          _origBuildCfg();
        }
      };
    }

    // 3. Registra log de inicialização
    addLog('info',
      'App iniciado. Versão do navegador: ' + navigator.userAgent.split(')')[0].split('(')[1],
      'app-diagnostico.js', '', '', '');

    _diagAtualizarBadge();
  });

})();
