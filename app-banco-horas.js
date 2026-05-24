// ════════════════════════════════════════════════════════════════
//  HR MÁRMORES — BANCO DE HORAS  v1.0
//  Arquivo : app-banco-horas.js
//  Depende : app-funcionarios.js  (deve ser carregado ANTES)
//
//  ARQUITETURA:
//  • Créditos derivados ao vivo dos registros com destinoExtra==='banco'
//    → sem armazenamento duplo, nunca fica dessincronizado
//  • Débitos (folgas usadas) salvos em hr_banco_horas (só tipo='debito')
//  • calcSaldoFuncionario em app-funcionarios.js precisa ser corrigido
//    (ver PATCH obrigatório no final deste arquivo)
//
//  EXPOSE GLOBAL:
//    window.abrirBancoHoras([funcId])   — abre painel
//    window.BH.getSaldo(funcId)         — retorna saldo e histórico
//    window.BH.getSaldoTodos()          — array com saldo de todos ativos
// ════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Design tokens (espelha app-funcionarios.js) ─────────────────
  var GOLD   = '#C9A84C';
  var GOLD2  = 'rgba(201,168,76,.15)';
  var GOLDB  = 'rgba(201,168,76,.35)';
  var S2     = 'var(--s2,#161410)';
  var BD     = 'rgba(201,168,76,.12)';
  var BD2    = 'rgba(255,255,255,.07)';
  var T1     = 'var(--t1,#f0ece4)';
  var T2     = 'var(--t2,#b8b0a0)';
  var T3     = 'var(--t3,#7a7268)';
  var GREEN  = '#5cb85c';
  var RED    = '#c85c5c';

  // ── Estilos reutilizáveis ────────────────────────────────────────
  var CSS_INP = [
    'width:100%;box-sizing:border-box;padding:11px 13px;border-radius:10px;',
    'border:1px solid rgba(201,168,76,.12);background:rgba(255,255,255,.03);',
    'color:var(--t1,#f0ece4);font-size:.88rem;font-family:Outfit,sans-serif;outline:none;'
  ].join('');

  var CSS_BTN_GREEN = [
    'width:100%;padding:13px;border-radius:11px;',
    'background:linear-gradient(135deg,#08100a,#040a05);',
    'border:1.5px solid rgba(92,184,92,.4);color:' + GREEN + ';',
    'font-family:Outfit,sans-serif;font-size:.88rem;font-weight:700;',
    'cursor:pointer;margin-bottom:8px;letter-spacing:.03em;'
  ].join('');

  var CSS_BTN_GHOST = [
    'width:100%;padding:12px;border-radius:11px;',
    'background:transparent;border:1px solid rgba(255,255,255,.07);',
    'color:var(--t2,#b8b0a0);font-family:Outfit,sans-serif;font-size:.85rem;cursor:pointer;'
  ].join('');

  // ── Storage ─────────────────────────────────────────────────────
  var KEY_DEBITOS = 'hr_banco_horas'; // somente débitos (folgas usadas)

  function _getDebitos() {
    try { return JSON.parse(localStorage.getItem(KEY_DEBITOS) || '{}'); } catch (e) { return {}; }
  }
  function _saveDebitos(d) {
    try { localStorage.setItem(KEY_DEBITOS, JSON.stringify(d)); } catch (e) { console.error('[BH]', e); }
  }
  function _getFuncionarios() {
    try { return JSON.parse(localStorage.getItem('hr_funcionarios') || '{}'); } catch (e) { return {}; }
  }
  function _getRegistros() {
    try { return JSON.parse(localStorage.getItem('hr_registros') || '{}'); } catch (e) { return {}; }
  }
  function _genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

  // ── Utilitários ──────────────────────────────────────────────────
  function _toast(m)  { if (typeof toast === 'function') toast(m); else console.log('[BH]', m); }
  function _esc(s)    { return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function _fmtData(iso) { if (!iso) return '—'; var p = iso.split('-'); return p[2]+'/'+p[1]+'/'+p[0]; }
  function _hoje()    { return new Date().toISOString().slice(0, 10); }
  function _closeOverlay(id) { var e = document.getElementById(id); if (e) e.remove(); }
  function _overlay(id, html) {
    _closeOverlay(id);
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(8,7,4,.97);' +
      'display:flex;flex-direction:column;align-items:center;overflow-y:auto;' +
      'font-family:Outfit,sans-serif;padding:24px 0 100px;';
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  }
  function _avatar(f, sz) {
    sz = sz || 44;
    if (f.foto) {
      return '<img src="' + f.foto + '" style="width:' + sz + 'px;height:' + sz + 'px;' +
        'border-radius:50%;object-fit:cover;border:2px solid ' + GOLDB + ';flex-shrink:0;">';
    }
    var ini = (f.nome || '?').charAt(0).toUpperCase();
    var CORES = ['#8B6914','#6B4E9A','#2E7D6B','#7D2E2E','#1A6B7D'];
    var bg = CORES[(f.nome || '').charCodeAt(0) % CORES.length];
    return '<div style="width:' + sz + 'px;height:' + sz + 'px;border-radius:50%;background:' + bg + ';' +
      'border:2px solid ' + GOLDB + ';display:flex;align-items:center;justify-content:center;' +
      'flex-shrink:0;font-size:' + (sz * 0.44) + 'px;font-weight:800;color:#fff;">' + ini + '</div>';
  }

  // ─────────────────────────────────────────────────────────────────
  // CÁLCULO PRINCIPAL
  // Créditos = registros com destinoExtra==='banco' (derivado ao vivo)
  // Débitos  = movimentos salvos em hr_banco_horas
  // ─────────────────────────────────────────────────────────────────
  function getSaldo(funcId) {
    var regs    = _getRegistros();
    var debitos = _getDebitos();

    // Créditos: horas extras enviadas ao banco
    var creditoItems = Object.values(regs)
      .filter(function (r) {
        return r.funcionarioId === funcId && r.destinoExtra === 'banco' && parseFloat(r.extra) > 0;
      })
      .sort(function (a, b) { return b.data.localeCompare(a.data); })
      .map(function (r) {
        return {
          id: 'reg_' + r.id,   // prefixo para diferenciar de débito
          tipo: 'credito',
          horas: parseFloat(r.extra),
          data: r.data,
          descricao: '⚡ H.E. → Banco (' + _fmtData(r.data) + ')',
          origem: 'registro',
          registroId: r.id
        };
      });

    // Débitos: folgas usadas
    var debitoItems = Object.values(debitos)
      .filter(function (m) { return m.funcionarioId === funcId; })
      .sort(function (a, b) { return b.data.localeCompare(a.data); })
      .map(function (m) {
        return {
          id: m.id,
          tipo: 'debito',
          horas: parseFloat(m.horas),
          data: m.data,
          descricao: m.descricao || 'Folga compensatória',
          origem: 'folga',
          registroId: null
        };
      });

    var totalCredito = creditoItems.reduce(function (s, m) { return s + m.horas; }, 0);
    var totalDebito  = debitoItems.reduce(function (s, m) { return s + m.horas; }, 0);

    // Historial unificado, mais recente primeiro
    var movimentos = creditoItems.concat(debitoItems)
      .sort(function (a, b) { return b.data.localeCompare(a.data); });

    return {
      totalCredito: totalCredito,
      totalDebito:  totalDebito,
      saldo:        totalCredito - totalDebito,
      movimentos:   movimentos
    };
  }

  function getSaldoTodos() {
    var funcs = _getFuncionarios();
    return Object.values(funcs)
      .filter(function (f) { return f.ativo !== false; })
      .map(function (f)    { return { f: f, s: getSaldo(f.id) }; })
      .filter(function (x) { return x.s.totalCredito > 0 || x.s.totalDebito > 0; })
      .sort(function (a, b) { return b.s.saldo - a.s.saldo; });
  }

  // ─────────────────────────────────────────────────────────────────
  // PAINEL PRINCIPAL — lista de funcionários com saldo
  // ─────────────────────────────────────────────────────────────────
  function abrirBancoHoras(funcIdFiltro) {
    var resumo = getSaldoTodos();
    var totalEquipe = resumo.reduce(function (s, x) { return s + Math.max(0, x.s.saldo); }, 0);
    var totalFuncs  = Object.values(_getFuncionarios()).filter(function (f) { return f.ativo !== false; }).length;

    var cardsHtml = '';
    if (resumo.length === 0) {
      cardsHtml =
        '<div style="text-align:center;padding:32px 16px;color:' + T3 + ';font-size:.84rem;">' +
          'Nenhum funcionário com horas no banco ainda.<br><br>' +
          '<div style="font-size:.75rem;line-height:1.7;color:rgba(122,114,104,.6);">' +
            'Para enviar horas ao banco, no registro de ponto<br>' +
            'escolha <strong style="color:' + GOLD + ';">Banco de horas (folga futura)</strong><br>' +
            'no campo <em>Destino das H. Extras</em>.' +
          '</div>' +
        '</div>';
    } else {
      cardsHtml = resumo.map(function (x) {
        var saldo    = x.s.saldo;
        var saldoCor = saldo > 0.01 ? GOLD : (saldo < -0.01 ? RED : T3);
        var barW     = x.s.totalCredito > 0
          ? Math.round(Math.min(100, (Math.max(0, saldo) / x.s.totalCredito) * 100))
          : 0;

        return '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:14px;' +
          'padding:14px 16px;margin-bottom:9px;cursor:pointer;active:opacity:.85;" ' +
          'onclick="window._bhAbrirFunc(\'' + x.f.id + '\')">' +

          '<div style="display:flex;align-items:center;gap:12px;">' +
            _avatar(x.f, 44) +
            '<div style="flex:1;min-width:0;">' +
              '<div style="font-size:.9rem;font-weight:700;color:' + T1 + ';">' + _esc(x.f.nome) + '</div>' +
              '<div style="font-size:.68rem;color:' + T3 + ';margin-top:1px;">' +
                '✅ ' + x.s.totalCredito.toFixed(2) + 'h acumuladas  ·  ' +
                '📅 ' + x.s.totalDebito.toFixed(2) + 'h usadas' +
              '</div>' +

              // Barra de progresso do saldo
              '<div style="height:4px;background:rgba(255,255,255,.05);border-radius:4px;margin-top:7px;overflow:hidden;">' +
                '<div style="height:100%;width:' + barW + '%;background:' + GOLD + ';border-radius:4px;' +
                  'transition:width .4s;"></div>' +
              '</div>' +

            '</div>' +
            '<div style="text-align:right;flex-shrink:0;margin-left:8px;">' +
              '<div style="font-size:1.15rem;font-weight:800;color:' + saldoCor + ';">' + saldo.toFixed(2) + 'h</div>' +
              '<div style="font-size:.6rem;color:' + T3 + ';margin-top:1px;">saldo</div>' +
            '</div>' +
          '</div>' +

        '</div>';
      }).join('');
    }

    var html =
      '<div style="width:100%;max-width:520px;padding:0 16px;">' +

      // ── Cabeçalho ──
      '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:18px;">' +
        '<div>' +
          '<div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.18em;text-transform:uppercase;margin-bottom:3px;">HR MÁRMORES</div>' +
          '<div style="font-size:1.35rem;font-weight:800;color:' + T1 + ';letter-spacing:-.02em;">🏦 Banco de Horas</div>' +
          '<div style="font-size:.72rem;color:' + T3 + ';margin-top:3px;">Horas extras convertidas em folgas futuras</div>' +
        '</div>' +
        '<button onclick="window._bhFechar()" ' +
          'style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px 0 4px 8px;">✕</button>' +
      '</div>' +

      // ── KPI total equipe ──
      '<div style="background:' + S2 + ';border:1.5px solid rgba(201,168,76,.25);border-radius:14px;' +
        'padding:16px 18px;margin-bottom:16px;">' +
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
          _kpi('⏱', 'No Banco', totalEquipe.toFixed(2) + 'h', 'equipe total') +
          _kpi('👷', 'Funcionários', totalFuncs, 'ativos') +
          _kpi('📅', 'Com saldo', resumo.filter(function (x) { return x.s.saldo > 0.01; }).length, 'com crédito') +
        '</div>' +
      '</div>' +

      // ── Lista ──
      '<div style="font-size:.58rem;color:' + GOLD + ';letter-spacing:.16em;text-transform:uppercase;margin-bottom:10px;">' +
        'Saldo por Funcionário' +
      '</div>' +
      cardsHtml +

      '<button onclick="window._bhFechar()" style="' + CSS_BTN_GHOST + 'margin-top:8px;">Fechar</button>' +
    '</div>';

    _overlay('hrBancoHoras', html);

    // Se veio de detalhes de um funcionário específico, abre direto
    if (funcIdFiltro) {
      setTimeout(function () { window._bhAbrirFunc(funcIdFiltro); }, 80);
    }
  }

  function _kpi(icone, label, valor, sub) {
    return '<div style="text-align:center;background:rgba(0,0,0,.25);border-radius:10px;padding:10px 6px;">' +
      '<div style="font-size:1.1rem;">' + icone + '</div>' +
      '<div style="font-size:.85rem;font-weight:800;color:' + GOLD + ';margin:3px 0;">' + valor + '</div>' +
      '<div style="font-size:.58rem;color:' + T3 + ';line-height:1.3;">' + label + '<br>' + sub + '</div>' +
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────────
  // DETALHE POR FUNCIONÁRIO
  // ─────────────────────────────────────────────────────────────────
  window._bhAbrirFunc = function (funcId) {
    var funcs = _getFuncionarios();
    var f = funcs[funcId];
    if (!f) return;

    var s        = getSaldo(funcId);
    var saldoCor = s.saldo > 0.01 ? GOLD : (s.saldo < -0.01 ? RED : T3);

    // ── Histórico de movimentações ──
    var histHtml = '';
    if (s.movimentos.length === 0) {
      histHtml = '<div style="text-align:center;padding:20px;color:' + T3 + ';font-size:.8rem;">Nenhuma movimentação.</div>';
    } else {
      histHtml = s.movimentos.map(function (m) {
        var isC   = m.tipo === 'credito';
        var cor   = isC ? GOLD : RED;
        var sinal = isC ? '+' : '−';
        var icone = isC ? '⏫' : '📅';
        var bgIco = isC ? GOLD2 : 'rgba(200,92,92,.12)';

        return '<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid ' + BD + ';">' +
          '<div style="width:34px;height:34px;border-radius:50%;background:' + bgIco + ';' +
            'display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0;">' + icone + '</div>' +
          '<div style="flex:1;min-width:0;">' +
            '<div style="font-size:.82rem;font-weight:600;color:' + T1 + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' +
              _esc(m.descricao) + '</div>' +
            '<div style="font-size:.67rem;color:' + T3 + ';margin-top:1px;">' + _fmtData(m.data) + '</div>' +
          '</div>' +
          '<div style="font-size:.95rem;font-weight:800;color:' + cor + ';flex-shrink:0;">' +
            sinal + parseFloat(m.horas).toFixed(2) + 'h' +
          '</div>' +
          // Só permite excluir folgas manuais (não créditos de registro)
          (m.origem === 'folga'
            ? '<button onclick="window._bhExcluirDebito(\'' + m.id + '\',\'' + funcId + '\')" ' +
              'style="background:none;border:none;color:rgba(200,92,92,.4);cursor:pointer;font-size:.85rem;' +
              'padding:3px 5px;flex-shrink:0;" title="Excluir">✕</button>'
            : '<div style="width:26px;"></div>') +
        '</div>';
      }).join('');
    }

    var html =
      '<div style="width:100%;max-width:500px;padding:0 16px;">' +

      // ── Header com nav ──
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">' +
        '<button onclick="abrirBancoHoras()" ' +
          'style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px;">←</button>' +
        '<div style="flex:1;">' +
          '<div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.15em;text-transform:uppercase;margin-bottom:1px;">Banco de Horas</div>' +
          '<div style="font-size:.95rem;font-weight:800;color:' + T1 + ';">' + _esc(f.nome) + '</div>' +
          '<div style="font-size:.7rem;color:' + T3 + ';">' + _esc(f.cargo || '—') + '</div>' +
        '</div>' +
        '<button onclick="window._bhFechar()" ' +
          'style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px;">✕</button>' +
      '</div>' +

      // ── Card de saldo ──
      '<div style="background:' + S2 + ';border:1.5px solid rgba(201,168,76,.3);border-radius:15px;' +
        'padding:18px;margin-bottom:16px;">' +

        '<div style="font-size:.6rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.1em;margin-bottom:6px;text-align:center;">Saldo disponível</div>' +
        '<div style="font-size:2.6rem;font-weight:800;color:' + saldoCor + ';text-align:center;line-height:1;margin-bottom:14px;">' +
          s.saldo.toFixed(2) + '<span style="font-size:1.2rem;">h</span>' +
        '</div>' +

        // Barra visual crédito × débito
        (s.totalCredito > 0
          ? '<div style="background:rgba(200,92,92,.3);border-radius:6px;height:7px;overflow:hidden;margin-bottom:10px;">' +
              '<div style="background:' + GOLD + ';height:100%;border-radius:6px;' +
                'width:' + Math.min(100, Math.round((Math.max(0, s.saldo) / s.totalCredito) * 100)) + '%;' +
                'transition:width .5s;"></div>' +
            '</div>'
          : '') +

        '<div style="display:grid;grid-template-columns:1fr auto 1fr;gap:0;text-align:center;">' +
          '<div><div style="font-size:.6rem;color:' + T3 + ';margin-bottom:3px;">Acumulado</div>' +
            '<div style="font-size:.88rem;font-weight:700;color:' + GOLD + ';">+' + s.totalCredito.toFixed(2) + 'h</div></div>' +
          '<div style="width:1px;background:' + BD + ';"></div>' +
          '<div><div style="font-size:.6rem;color:' + T3 + ';margin-bottom:3px;">Folgas usadas</div>' +
            '<div style="font-size:.88rem;font-weight:700;color:' + RED + ';">−' + s.totalDebito.toFixed(2) + 'h</div></div>' +
        '</div>' +

      '</div>' +

      // ── Ação: registrar folga ──
      (s.saldo > 0.01
        ? '<button onclick="window._bhRegistrarFolga(\'' + funcId + '\')" style="' + CSS_BTN_GREEN + '">' +
            '📅 Registrar Folga Compensatória' +
          '</button>'
        : '<div style="background:rgba(122,114,104,.07);border:1px solid rgba(122,114,104,.2);border-radius:10px;' +
            'padding:11px 14px;text-align:center;font-size:.78rem;color:' + T3 + ';margin-bottom:8px;">' +
            'Sem saldo para registrar folga' +
          '</div>') +

      // ── Histórico ──
      '<div style="font-size:.58rem;color:' + GOLD + ';letter-spacing:.16em;text-transform:uppercase;' +
        'margin-top:16px;margin-bottom:10px;">Histórico</div>' +
      '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:13px;' +
        'padding:0 14px;margin-bottom:14px;">' + histHtml + '</div>' +

      '<button onclick="abrirBancoHoras()" style="' + CSS_BTN_GHOST + '">← Voltar</button>' +
    '</div>';

    _closeOverlay('hrBancoHoras');
    _overlay('hrBancoHoras', html);
  };

  // ─────────────────────────────────────────────────────────────────
  // REGISTRAR FOLGA
  // ─────────────────────────────────────────────────────────────────
  window._bhRegistrarFolga = function (funcId) {
    var f = _getFuncionarios()[funcId];
    if (!f) return;
    var s     = getSaldo(funcId);
    var maxH  = Math.floor(s.saldo * 4) / 4; // arredonda p/ baixo em 0.25h
    var sugerida = Math.min(8, maxH);

    var html =
      '<div style="width:100%;max-width:480px;padding:0 16px;">' +

      // ── Header ──
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;">' +
        '<button onclick="window._bhAbrirFunc(\'' + funcId + '\')" ' +
          'style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px;">←</button>' +
        '<div style="flex:1;">' +
          '<div style="font-size:.55rem;color:' + GOLD + ';letter-spacing:.15em;text-transform:uppercase;margin-bottom:1px;">Banco de Horas</div>' +
          '<div style="font-size:1rem;font-weight:800;color:' + T1 + ';">📅 Registrar Folga</div>' +
        '</div>' +
        '<button onclick="window._bhFechar()" ' +
          'style="background:none;border:none;color:' + T3 + ';cursor:pointer;font-size:1.1rem;padding:4px;">✕</button>' +
      '</div>' +

      // ── Funcionário ──
      '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:12px 14px;margin-bottom:12px;' +
        'display:flex;align-items:center;gap:12px;">' +
        _avatar(f, 40) +
        '<div style="flex:1;">' +
          '<div style="font-size:.88rem;font-weight:700;color:' + T1 + ';">' + _esc(f.nome) + '</div>' +
          '<div style="font-size:.7rem;color:' + T3 + ';">' + _esc(f.cargo || '—') + '</div>' +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:.58rem;color:' + T3 + ';margin-bottom:2px;">Saldo</div>' +
          '<div style="font-size:.95rem;font-weight:800;color:' + GOLD + ';">' + s.saldo.toFixed(2) + 'h</div>' +
        '</div>' +
      '</div>' +

      // ── Campos ──
      '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:16px;margin-bottom:14px;">' +

        _campo('Data da folga', '<input type="date" id="bh_data" value="' + _hoje() + '" style="' + CSS_INP + '">') +

        _campo('Horas a usar',
          '<input type="number" id="bh_horas" min="0.25" max="' + maxH + '" step="0.25" ' +
            'value="' + sugerida.toFixed(2) + '" style="' + CSS_INP + '">' +
          '<div style="font-size:.62rem;color:' + T3 + ';margin-top:4px;">' +
            'Máximo disponível: ' + maxH.toFixed(2) + 'h — Use 8h para folga de 1 dia inteiro' +
          '</div>') +

        _campo('Descrição (opcional)',
          '<input type="text" id="bh_desc" placeholder="Ex: folga sexta-feira, compensação semana..." ' +
            'style="' + CSS_INP + '">') +

      '</div>' +

      '<button onclick="window._bhSalvarFolga(\'' + funcId + '\')" style="' + CSS_BTN_GREEN + '">' +
        '✓ Confirmar Folga Compensatória' +
      '</button>' +
      '<button onclick="window._bhAbrirFunc(\'' + funcId + '\')" style="' + CSS_BTN_GHOST + '">Cancelar</button>' +

    '</div>';

    _closeOverlay('hrBancoHoras');
    _overlay('hrBancoHoras', html);
  };

  window._bhSalvarFolga = function (funcId) {
    var data  = (document.getElementById('bh_data')  || {}).value || '';
    var horas = parseFloat((document.getElementById('bh_horas') || {}).value) || 0;
    var desc  = (document.getElementById('bh_desc')  || {}).value || '';

    if (!data)      { _toast('Informe a data da folga'); return; }
    if (horas <= 0) { _toast('Informe as horas a usar'); return; }

    var s = getSaldo(funcId);
    if (horas > s.saldo + 0.005) {
      _toast('⚠️ Horas excedem o saldo disponível (' + s.saldo.toFixed(2) + 'h)');
      return;
    }

    var f     = _getFuncionarios()[funcId] || {};
    var debitos = _getDebitos();
    var id    = _genId();
    debitos[id] = {
      id:          id,
      funcionarioId: funcId,
      tipo:        'debito',
      horas:       horas,
      data:        data,
      descricao:   desc || ('📅 Folga compensatória — ' + _fmtData(data)),
      criadoEm:    new Date().toISOString()
    };
    _saveDebitos(debitos);

    _toast('✓ Folga registrada: ' + horas.toFixed(2) + 'h para ' + f.nome.split(' ')[0]);
    window._bhAbrirFunc(funcId);
  };

  window._bhExcluirDebito = function (movId, funcId) {
    if (!confirm('Excluir este registro de folga?')) return;
    var debitos = _getDebitos();
    delete debitos[movId];
    _saveDebitos(debitos);
    _toast('Registro de folga excluído.');
    window._bhAbrirFunc(funcId);
  };

  window._bhFechar = function () { _closeOverlay('hrBancoHoras'); };

  // ── Helper de campo ──────────────────────────────────────────────
  function _campo(label, input) {
    return '<div style="margin-bottom:12px;">' +
      '<div style="font-size:.63rem;color:' + T3 + ';text-transform:uppercase;letter-spacing:.07em;margin-bottom:5px;">' + label + '</div>' +
      input +
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────────
  // BADGE PÚBLICO — saldo de banco de horas de um funcionário
  // Usado em app-funcionarios.js para exibir nos cards e detalhes
  // Exemplo: var badge = window.BH.badgeSaldo(funcId);
  // ─────────────────────────────────────────────────────────────────
  function badgeSaldo(funcId) {
    var s = getSaldo(funcId);
    if (s.saldo <= 0 && s.totalCredito === 0) return '';
    var cor = s.saldo > 0.01 ? GOLD : T3;
    return '<span style="font-size:.6rem;background:rgba(201,168,76,.1);border:1px solid rgba(201,168,76,.3);' +
      'color:' + cor + ';border-radius:20px;padding:2px 8px;cursor:pointer;" ' +
      'onclick="event.stopPropagation();abrirBancoHoras(\'' + funcId + '\')">🏦 ' + s.saldo.toFixed(1) + 'h</span>';
  }

  // ── Expose público ───────────────────────────────────────────────
  window.abrirBancoHoras = abrirBancoHoras;
  window.BH = {
    getSaldo:     getSaldo,
    getSaldoTodos: getSaldoTodos,
    badgeSaldo:   badgeSaldo
  };

  console.log('[app-banco-horas.js v1] ✓ Banco de Horas carregado');

})();


// ════════════════════════════════════════════════════════════════
//  PATCH OBRIGATÓRIO — app-funcionarios.js
//  Aplique as 4 mudanças abaixo. São cirúrgicas: nada se quebra.
// ════════════════════════════════════════════════════════════════
/*

─────────────────────────────────────────────────────────────────
MUDANÇA 1 — calcSaldoFuncionario (linha ~115)
Excluir do cálculo financeiro as HE destinadas ao banco de horas.

  ANTES:
    var totalExtra=meusRegs.reduce(function(s,r){return s+(parseFloat(r.extra)||0);},0);

  DEPOIS:
    var totalExtra=meusRegs.reduce(function(s,r){
      return s+(r.destinoExtra==='banco'?0:(parseFloat(r.extra)||0));
    },0);

─────────────────────────────────────────────────────────────────
MUDANÇA 2 — abrirFormRegistro (após o campo tipoExtra, ~linha 999)
Adicionar o seletor de destino das horas extras.

  APÓS a linha:
    _campo('Tipo de hora extra', _sel('fr_tipoExtra', [...], ...))

  INSERIR:
    +_campo('Destino das H. Extras',_sel('fr_destinoExtra',[
      {v:'pagar', l:'💵 Pagar em dinheiro'},
      {v:'banco', l:'🏦 Banco de horas (folga futura)'}
    ],r.destinoExtra||'pagar'))

─────────────────────────────────────────────────────────────────
MUDANÇA 3 — _salvarRegistro (dentro do objeto regs[regId], ~linha 1041)
Salvar o campo destinoExtra no registro.

  APÓS a linha com tipoExtra:
    tipoExtra:(document.getElementById('fr_tipoExtra')||{}).value||'normal',

  ADICIONAR:
    destinoExtra:(document.getElementById('fr_destinoExtra')||{}).value||'pagar',

─────────────────────────────────────────────────────────────────
MUDANÇA 4 — renderPaginaFuncionarios (na grade de botões, ~linha 279)
Adicionar botão de acesso rápido ao Banco de Horas.

  NA GRADE de 2 botões no final das ações rápidas, SUBSTITUIR:
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
      '<button onclick="...abrirRelatorioHorasExtras()...">📊 Horas Extras</button>' +
      '<button onclick="HR_FUNC.abrirFolhaPagamento()">📑 Folha de Pgto</button>' +
    '</div>'

  POR:
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">' +
      '<button onclick="if(typeof abrirRelatorioHorasExtras===\'function\')abrirRelatorioHorasExtras();" ...>📊 Horas Extras</button>' +
      '<button onclick="HR_FUNC.abrirFolhaPagamento()" ...>📑 Folha de Pgto</button>' +
      '<button onclick="if(typeof abrirBancoHoras===\'function\')abrirBancoHoras();" ' +
        'style="padding:11px;background:rgba(201,168,76,.05);border:1px solid [BD];' +
        'border-radius:11px;color:[GOLD];font-family:Outfit,sans-serif;font-size:.78rem;' +
        'font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;">' +
        '<span>🏦</span><span>Banco Horas</span></button>' +
    '</div>'

─────────────────────────────────────────────────────────────────
MUDANÇA 5 — abrirDetalhesFuncionario (opcional mas recomendado)
Mostrar badge do banco de horas no perfil do funcionário.

  NO BLOCO de badges (dentro do hero card do perfil, ~linha 614), após os badges existentes,
  ADICIONAR:
    +(typeof window.BH!=='undefined'?window.BH.badgeSaldo(id):'')

*/
