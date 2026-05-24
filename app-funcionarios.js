// ══════════════════════════════════════════════════════════════
// APP-FUNCIONARIOS v1 — HR Mármores e Granitos
// Fase 1: Cadastro · Registros Operacionais · Histórico
// Compatível com a arquitetura existente do index.html
// Persiste via localStorage (chave: 'hr_funcionarios', 'hr_registros')
// ══════════════════════════════════════════════════════════════

// ── NAMESPACE ISOLADO ─────────────────────────────────────────
var HR_FUNC = (function () {

  // ─────────────────────────────────────────────────────────────
  // 1. PERSISTÊNCIA (localStorage)
  // ─────────────────────────────────────────────────────────────
  var KEYS = { func: 'hr_funcionarios', reg: 'hr_registros' };

  function _load(key) {
    try { return JSON.parse(localStorage.getItem(key) || '{}'); }
    catch (e) { return {}; }
  }
  function _save(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); }
    catch (e) { console.error('[HR_FUNC] save error', e); }
  }

  function getFuncionarios() { return _load(KEYS.func); }
  function getRegistros()    { return _load(KEYS.reg);  }

  function saveFuncionarios(data) { _save(KEYS.func, data); }
  function saveRegistros(data)    { _save(KEYS.reg,  data); }

  function genId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. UTILITÁRIOS DE UI
  // ─────────────────────────────────────────────────────────────
  var GOLD = '#C9A84C';
  var BG   = 'var(--bg,#111)';
  var S2   = 'var(--s2,#1a1a1a)';
  var BD   = 'var(--bd,#2a2a2a)';
  var T1   = 'var(--t1,#eee)';
  var T2   = 'var(--t2,#bbb)';
  var T3   = 'var(--t3,#888)';

  function _toast(msg) {
    if (typeof toast === 'function') toast(msg);
    else console.log('[HR_FUNC]', msg);
  }

  function _fmtData(iso) {
    if (!iso) return '—';
    var p = iso.split('-');
    return p[2] + '/' + p[1] + '/' + p[0];
  }

  function _fmtMoeda(v) {
    return 'R$ ' + parseFloat(v || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    });
  }

  function _closeOverlay(id) {
    var el = document.getElementById(id);
    if (el) el.remove();
  }

  function _overlay(id, html) {
    _closeOverlay(id);
    var ov = document.createElement('div');
    ov.id = id;
    ov.style.cssText = [
      'position:fixed;inset:0;z-index:99999;',
      'background:rgba(10,8,0,.95);',
      'display:flex;flex-direction:column;align-items:center;',
      'overflow-y:auto;font-family:Outfit,sans-serif;',
      'padding:20px 0 60px;'
    ].join('');
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  }

  // Estilo base para inputs dentro dos overlays
  var INP_CSS = [
    'width:100%;box-sizing:border-box;padding:10px 12px;',
    'border-radius:9px;border:1px solid rgba(201,168,76,.25);',
    'background:rgba(255,255,255,.04);color:var(--t1,#eee);',
    'font-size:.88rem;font-family:Outfit,sans-serif;outline:none;',
    'transition:border-color .2s;'
  ].join('');

  var BTN_GOLD = [
    'width:100%;padding:13px;border-radius:10px;',
    'background:linear-gradient(135deg,#1e1800,#0f0c00);',
    'border:1.5px solid rgba(201,168,76,.6);color:#C9A84C;',
    'font-family:Outfit,sans-serif;font-size:.92rem;font-weight:700;',
    'cursor:pointer;margin-bottom:8px;letter-spacing:.03em;'
  ].join('');

  var BTN_CANCEL = [
    'width:100%;padding:12px;border-radius:10px;',
    'background:transparent;border:1px solid rgba(255,255,255,.1);',
    'color:var(--t3,#888);font-family:Outfit,sans-serif;',
    'font-size:.85rem;cursor:pointer;'
  ].join('');

  function _fieldBlock(label, inputHtml) {
    return '<div style="margin-bottom:12px;">' +
      '<label style="display:block;font-size:.7rem;color:' + GOLD + ';' +
        'letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px;">' + label + '</label>' +
      inputHtml +
    '</div>';
  }

  function _inp(id, type, placeholder, value, extra) {
    return '<input id="' + id + '" type="' + (type||'text') + '" ' +
      'placeholder="' + (placeholder||'') + '" ' +
      'value="' + (value||'') + '" ' +
      (extra||'') +
      ' style="' + INP_CSS + '">';
  }

  function _sel(id, options, selected) {
    var opts = options.map(function(o) {
      return '<option value="' + o.v + '"' + (o.v === selected ? ' selected' : '') + '>' + o.l + '</option>';
    }).join('');
    return '<select id="' + id + '" style="' + INP_CSS + '">' + opts + '</select>';
  }

  function _ta(id, placeholder, value, rows) {
    return '<textarea id="' + id + '" rows="' + (rows||2) + '" ' +
      'placeholder="' + (placeholder||'') + '" ' +
      'style="' + INP_CSS + 'resize:vertical;">' + (value||'') + '</textarea>';
  }

  // ─────────────────────────────────────────────────────────────
  // 3. PÁGINA PRINCIPAL — RH (pg30)
  // ─────────────────────────────────────────────────────────────
  function renderPaginaFuncionarios() {
    var pg = document.getElementById('pg30');
    if (!pg) return;

    var funcs  = getFuncionarios();
    var regs   = getRegistros();
    var lista  = Object.values(funcs).sort(function(a, b) { return a.nome.localeCompare(b.nome); });
    var ativos = lista.filter(function(f) { return f.ativo !== false; });

    // Totais gerais
    var allRegs    = Object.values(regs);
    var totHoras   = allRegs.reduce(function(s,r){ return s + (parseFloat(r.horas)||0); }, 0);
    var totExtras  = allRegs.reduce(function(s,r){ return s + (parseFloat(r.extra)||0); }, 0);
    var totalFolha = ativos.reduce(function(s,f){ return s + (parseFloat(f.salario)||0); }, 0);

    // Cards dos funcionários
    var cardsHtml = lista.length === 0
      ? '<div style="text-align:center;padding:36px 20px;color:' + T3 + ';font-size:.85rem;">' +
          'Nenhum funcionário cadastrado.<br>' +
          'Toque em <strong style="color:' + GOLD + '">+ Cadastrar</strong> para começar.' +
        '</div>'
      : lista.map(function(f) { return _cardFuncionario(f); }).join('');

    pg.innerHTML =

      // ── Cabeçalho RH ──
      '<div style="padding:16px 14px 10px;display:flex;justify-content:space-between;align-items:center;">' +
        '<div>' +
          '<div style="font-size:.62rem;color:' + GOLD + ';letter-spacing:.14em;text-transform:uppercase;">HR Mármores</div>' +
          '<div style="font-size:1.25rem;font-weight:800;color:' + T1 + ';line-height:1.1;">Recursos Humanos</div>' +
        '</div>' +
        '<button onclick="HR_FUNC.abrirFormFuncionario(null)" ' +
          'style="background:rgba(201,168,76,.12);border:1.5px solid rgba(201,168,76,.45);' +
          'border-radius:12px;padding:9px 15px;color:' + GOLD + ';' +
          'font-family:Outfit,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;">+ Cadastrar</button>' +
      '</div>' +

      // ── Cards de resumo ──
      '<div style="padding:0 14px;display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">' +
        _statCard('👷 Equipe', ativos.length + ' ativo' + (ativos.length !== 1 ? 's' : '') + ' de ' + lista.length) +
        _statCard('💵 Folha', 'R$ ' + totalFolha.toLocaleString('pt-BR', {minimumFractionDigits:2,maximumFractionDigits:2})) +
        _statCard('⏱️ H. Trabalhadas', totHoras.toFixed(1) + ' h registradas') +
        _statCard('⚡ H. Extras', totExtras.toFixed(2) + ' h acumuladas') +
      '</div>' +

      // ── Ações rápidas ──
      '<div style="padding:0 14px;margin-bottom:14px;">' +
        '<div style="font-size:.62rem;color:' + GOLD + ';letter-spacing:.12em;text-transform:uppercase;margin-bottom:8px;">Ações Rápidas</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">' +
          _acaoBtn('📋 Histórico', 'Registros e ponto', 'HR_FUNC.abrirHistorico(null)') +
          _acaoBtn('📊 Horas Extras', 'Gerar PDF/relatório', 'abrirRelatorioHorasExtras()') +
        '</div>' +
      '</div>' +

      // ── Divisor ──
      '<div style="margin:0 14px 10px;height:1px;background:rgba(201,168,76,.12);"></div>' +

      // ── Lista de funcionários ──
      '<div style="padding:0 14px 4px;display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-size:.62rem;color:' + GOLD + ';letter-spacing:.12em;text-transform:uppercase;">Equipe</div>' +
        '<div style="font-size:.7rem;color:' + T3 + ';">' + lista.length + ' funcionário' + (lista.length !== 1 ? 's' : '') + '</div>' +
      '</div>' +
      '<div style="padding:8px 14px 80px;">' + cardsHtml + '</div>';
  }

  function _statCard(label, valor) {
    return '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:12px 14px;">' +
      '<div style="font-size:.7rem;color:' + T3 + ';margin-bottom:3px;">' + label + '</div>' +
      '<div style="font-size:.88rem;font-weight:700;color:' + GOLD + ';line-height:1.2;">' + valor + '</div>' +
    '</div>';
  }

  function _acaoBtn(titulo, sub, onclick) {
    return '<button onclick="' + onclick + '" style="' +
      'background:rgba(201,168,76,.06);border:1px solid rgba(201,168,76,.2);' +
      'border-radius:11px;padding:11px 12px;text-align:left;cursor:pointer;' +
      'font-family:Outfit,sans-serif;width:100%;">' +
      '<div style="font-size:.82rem;font-weight:700;color:' + GOLD + ';">' + titulo + '</div>' +
      '<div style="font-size:.68rem;color:' + T3 + ';margin-top:2px;">' + sub + '</div>' +
    '</button>';
  }

  function _statusBadge(ativo) {
    return ativo !== false
      ? '<span style="background:#1a3a1a;border:1px solid #4a8a4a;color:#6dc86d;border-radius:4px;padding:2px 8px;font-size:.68rem;">● Ativo</span>'
      : '<span style="background:#3a1a1a;border:1px solid #8a4a4a;color:#c86d6d;border-radius:4px;padding:2px 8px;font-size:.68rem;">○ Inativo</span>';
  }

  function _cardFuncionario(f) {
    return '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:13px;' +
      'padding:14px 16px;margin-bottom:10px;cursor:pointer;" ' +
      'onclick="HR_FUNC.abrirDetalhesFuncionario(\'' + f.id + '\')">' +
      '<div style="display:flex;align-items:center;gap:12px;">' +
        _avatarCircle(f) +
        '<div style="flex:1;min-width:0;">' +
          '<div style="font-weight:700;color:' + T1 + ';font-size:.95rem;">' + _esc(f.nome) + '</div>' +
          '<div style="font-size:.76rem;color:' + T3 + ';margin-top:1px;">' +
            _esc(f.cargo || '—') + (f.equipe ? ' · ' + _esc(f.equipe) : '') +
          '</div>' +
        '</div>' +
        '<div style="text-align:right;flex-shrink:0;">' +
          _statusBadge(f.ativo) +
          '<div style="font-size:.72rem;color:' + GOLD + ';margin-top:5px;font-weight:600;">' +
            _fmtMoeda(f.salario) +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function _avatarCircle(f) {
    if (f.foto) {
      return '<img src="' + f.foto + '" style="width:42px;height:42px;border-radius:50%;object-fit:cover;' +
        'border:2px solid rgba(201,168,76,.4);flex-shrink:0;">';
    }
    var ini = (f.nome || '?').charAt(0).toUpperCase();
    return '<div style="width:42px;height:42px;border-radius:50%;' +
      'background:rgba(201,168,76,.15);border:2px solid rgba(201,168,76,.35);' +
      'display:flex;align-items:center;justify-content:center;flex-shrink:0;' +
      'font-size:1.1rem;font-weight:700;color:' + GOLD + ';">' + ini + '</div>';
  }

  function _esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // ─────────────────────────────────────────────────────────────
  // 4. FORMULÁRIO CADASTRO / EDIÇÃO
  // ─────────────────────────────────────────────────────────────
  function abrirFormFuncionario(id) {
    var funcs = getFuncionarios();
    var f = id ? (funcs[id] || {}) : {};
    var titulo = id ? 'Editar Funcionário' : 'Novo Funcionário';

    var html =
      '<div style="width:100%;max-width:500px;padding:0 16px;">' +
        // Cabeçalho
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
          '<div>' +
            '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.12em;text-transform:uppercase;">RH · Equipe</div>' +
            '<div style="font-size:1.1rem;font-weight:700;color:' + T1 + ';margin-top:2px;">' + titulo + '</div>' +
          '</div>' +
          '<button onclick="HR_FUNC._closeForm()" style="background:none;border:1px solid rgba(201,168,76,.3);color:' + GOLD + ';border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;">✕ Fechar</button>' +
        '</div>' +

        // Campos
        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:16px;margin-bottom:12px;">' +
          '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;">Dados Pessoais</div>' +
          _fieldBlock('Nome completo', _inp('ff_nome', 'text', 'Ex: João da Silva', f.nome)) +
          _fieldBlock('Telefone / WhatsApp', _inp('ff_tel', 'tel', '(74) 9xxxx-xxxx', f.telefone)) +
          _fieldBlock('Foto (URL ou deixe em branco)', _inp('ff_foto', 'url', 'https://...', f.foto)) +
        '</div>' +

        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:16px;margin-bottom:12px;">' +
          '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;">Dados Profissionais</div>' +
          _fieldBlock('Cargo', _inp('ff_cargo', 'text', 'Ex: Marmorista, Ajudante...', f.cargo)) +
          _fieldBlock('Equipe', _sel('ff_equipe', [
            {v:'producao', l:'Produção'},
            {v:'instalacao', l:'Instalação'},
            {v:'escritorio', l:'Escritório'},
            {v:'geral', l:'Geral'}
          ], f.equipe || 'producao')) +
          _fieldBlock('Salário (R$)', _inp('ff_salario', 'number', '0,00', f.salario, 'min="0" step="0.01"')) +
          _fieldBlock('Data de Admissão', _inp('ff_admissao', 'date', '', f.admissao)) +
          _fieldBlock('Status', _sel('ff_ativo', [
            {v:'true', l:'✓ Ativo'},
            {v:'false', l:'✗ Inativo'}
          ], f.ativo === false ? 'false' : 'true')) +
        '</div>' +

        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:16px;margin-bottom:16px;">' +
          '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;">Observações</div>' +
          _fieldBlock('Obs. (opcional)', _ta('ff_obs', 'Informações adicionais...', f.obs, 3)) +
        '</div>' +

        '<button onclick="HR_FUNC._salvarFuncionario(\'' + (id||'') + '\')" style="' + BTN_GOLD + '">💾 Salvar Funcionário</button>' +

        (id
          ? '<button onclick="HR_FUNC._excluirFuncionario(\'' + id + '\')" ' +
              'style="' + BTN_CANCEL + 'color:#c86d6d;border-color:rgba(200,109,109,.25);margin-top:4px;">🗑 Excluir Funcionário</button>'
          : '') +

        '<button onclick="HR_FUNC._closeForm()" style="' + BTN_CANCEL + 'margin-top:4px;">Cancelar</button>' +
      '</div>';

    _overlay('hrFuncForm', html);
  }

  function _closeForm() { _closeOverlay('hrFuncForm'); }

  function _salvarFuncionario(id) {
    var nome = (document.getElementById('ff_nome') || {}).value || '';
    if (!nome.trim()) { _toast('Informe o nome do funcionário'); return; }

    var funcs = getFuncionarios();
    var funcId = id || genId();
    var isNew = !id;

    funcs[funcId] = {
      id:        funcId,
      nome:      nome.trim(),
      telefone:  (document.getElementById('ff_tel')      || {}).value || '',
      foto:      (document.getElementById('ff_foto')     || {}).value || '',
      cargo:     (document.getElementById('ff_cargo')    || {}).value || '',
      equipe:    (document.getElementById('ff_equipe')   || {}).value || 'producao',
      salario:   parseFloat((document.getElementById('ff_salario')  || {}).value) || 0,
      admissao:  (document.getElementById('ff_admissao') || {}).value || '',
      ativo:     (document.getElementById('ff_ativo')    || {}).value !== 'false',
      obs:       (document.getElementById('ff_obs')      || {}).value || '',
      criadoEm:  (funcs[funcId] && funcs[funcId].criadoEm) || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    saveFuncionarios(funcs);
    _closeForm();
    renderPaginaFuncionarios();
    _toast(isNew ? '✓ Funcionário cadastrado!' : '✓ Funcionário atualizado!');
  }

  function _excluirFuncionario(id) {
    var funcs = getFuncionarios();
    var nome = (funcs[id] || {}).nome || 'este funcionário';
    if (!confirm('Excluir ' + nome + '? Os registros associados também serão apagados.')) return;

    delete funcs[id];
    saveFuncionarios(funcs);

    // Remove registros do funcionário
    var regs = getRegistros();
    Object.keys(regs).forEach(function(rid) {
      if (regs[rid].funcionarioId === id) delete regs[rid];
    });
    saveRegistros(regs);

    _closeForm();
    renderPaginaFuncionarios();
    _toast('Funcionário excluído.');
  }

  // ─────────────────────────────────────────────────────────────
  // 5. DETALHES DO FUNCIONÁRIO (hub de ações)
  // ─────────────────────────────────────────────────────────────
  function abrirDetalhesFuncionario(id) {
    var funcs = getFuncionarios();
    var f = funcs[id];
    if (!f) return;

    var regs = getRegistros();
    var meusRegs = Object.values(regs).filter(function(r) {
      return r.funcionarioId === id;
    }).sort(function(a, b) { return b.data.localeCompare(a.data); });

    var totalHoras = meusRegs.reduce(function(s, r) { return s + (parseFloat(r.horas) || 0); }, 0);
    var totalExtra = meusRegs.reduce(function(s, r) { return s + (parseFloat(r.extra) || 0); }, 0);

    var regsHtml = meusRegs.length === 0
      ? '<div style="text-align:center;padding:24px;color:' + T3 + ';font-size:.82rem;">Nenhum registro ainda.</div>'
      : meusRegs.slice(0, 10).map(function(r) { return _miniCardRegistro(r); }).join('') +
        (meusRegs.length > 10
          ? '<div style="text-align:center;padding:8px;font-size:.75rem;color:' + T3 + ';">' +
              '+ ' + (meusRegs.length - 10) + ' registros — veja o Histórico completo' +
            '</div>'
          : '');

    var html =
      '<div style="width:100%;max-width:500px;padding:0 16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
          '<div style="display:flex;align-items:center;gap:12px;">' +
            _avatarCircle(f) +
            '<div>' +
              '<div style="font-size:1.05rem;font-weight:700;color:' + T1 + ';">' + _esc(f.nome) + '</div>' +
              '<div style="font-size:.72rem;color:' + T3 + ';margin-top:2px;">' + _esc(f.cargo || '—') + '</div>' +
              _statusBadge(f.ativo) +
            '</div>' +
          '</div>' +
          '<button onclick="HR_FUNC._closeDetalhes()" style="background:none;border:1px solid rgba(201,168,76,.3);color:' + GOLD + ';border-radius:6px;padding:6px 12px;cursor:pointer;font-size:.8rem;">✕</button>' +
        '</div>' +

        // Resumo rápido
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px;">' +
          _miniStat('Salário', _fmtMoeda(f.salario)) +
          _miniStat('H. Trabalhadas', totalHoras.toFixed(1) + 'h') +
          _miniStat('H. Extras', totalExtra.toFixed(2) + 'h') +
        '</div>' +

        // Info rápida
        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:14px 16px;margin-bottom:12px;">' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:.78rem;">' +
            _infoRow('Equipe', f.equipe || '—') +
            _infoRow('Telefone', f.telefone || '—') +
            _infoRow('Admissão', _fmtData(f.admissao)) +
            _infoRow('Registros', meusRegs.length + '') +
          '</div>' +
          (f.obs ? '<div style="margin-top:10px;font-size:.75rem;color:' + T3 + ';border-top:1px solid rgba(201,168,76,.1);padding-top:10px;">' + _esc(f.obs) + '</div>' : '') +
        '</div>' +

        // Botões de ação
        '<button onclick="HR_FUNC.abrirFormRegistro(\'' + id + '\')" style="' + BTN_GOLD + '">📝 Novo Registro do Dia</button>' +
        '<button onclick="HR_FUNC.abrirHistorico(\'' + id + '\')" style="' + BTN_CANCEL + 'margin-bottom:8px;color:' + GOLD + ';border-color:rgba(201,168,76,.3);">📋 Histórico Completo</button>' +
        '<button onclick="HR_FUNC.abrirFormFuncionario(\'' + id + '\');HR_FUNC._closeDetalhes();" style="' + BTN_CANCEL + 'margin-bottom:8px;">✏️ Editar Cadastro</button>' +

        // Últimos registros
        (meusRegs.length > 0
          ? '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Últimos Registros</div>' +
            regsHtml
          : '') +

        '<button onclick="HR_FUNC._closeDetalhes()" style="' + BTN_CANCEL + 'margin-top:8px;">Fechar</button>' +
      '</div>';

    _overlay('hrFuncDetalhes', html);
  }

  function _closeDetalhes() { _closeOverlay('hrFuncDetalhes'); }

  function _miniStat(label, valor) {
    return '<div style="background:rgba(201,168,76,.07);border:1px solid rgba(201,168,76,.2);border-radius:10px;padding:10px 8px;text-align:center;">' +
      '<div style="font-size:.65rem;color:' + T3 + ';margin-bottom:4px;">' + label + '</div>' +
      '<div style="font-size:.9rem;font-weight:700;color:' + GOLD + ';">' + valor + '</div>' +
    '</div>';
  }

  function _infoRow(label, valor) {
    return '<div>' +
      '<div style="font-size:.65rem;color:' + T3 + ';margin-bottom:2px;">' + label + '</div>' +
      '<div style="font-weight:600;color:' + T1 + ';">' + _esc(valor) + '</div>' +
    '</div>';
  }

  function _miniCardRegistro(r) {
    return '<div style="background:rgba(201,168,76,.04);border:1px solid rgba(201,168,76,.12);' +
      'border-radius:10px;padding:10px 12px;margin-bottom:8px;' +
      'cursor:pointer;" onclick="HR_FUNC.abrirDetalhesRegistro(\'' + r.id + '\')">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;">' +
        '<div style="font-size:.82rem;font-weight:600;color:' + T1 + ';">' + _fmtData(r.data) + '</div>' +
        '<div style="display:flex;gap:8px;">' +
          (parseFloat(r.extra) > 0
            ? '<span style="font-size:.72rem;background:rgba(201,168,76,.12);color:' + GOLD + ';border-radius:4px;padding:2px 7px;">+' + parseFloat(r.extra).toFixed(2) + 'h extra</span>'
            : '') +
          '<span style="font-size:.72rem;color:' + T3 + ';">' + (parseFloat(r.horas)||0).toFixed(1) + 'h</span>' +
        '</div>' +
      '</div>' +
      (r.observacao
        ? '<div style="font-size:.73rem;color:' + T3 + ';margin-top:3px;">' + _esc(r.observacao) + '</div>'
        : '') +
    '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // 6. FORMULÁRIO DE REGISTRO OPERACIONAL
  // ─────────────────────────────────────────────────────────────
  function abrirFormRegistro(funcionarioId, registroId) {
    var funcs = getFuncionarios();
    var f = funcs[funcionarioId];
    if (!f) { _toast('Funcionário não encontrado'); return; }

    var regs = getRegistros();
    var r = registroId ? (regs[registroId] || {}) : {};

    var hoje = new Date().toISOString().slice(0, 10);
    var titulo = registroId ? 'Editar Registro' : 'Novo Registro';

    var html =
      '<div style="width:100%;max-width:500px;padding:0 16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;">' +
          '<div>' +
            '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.12em;text-transform:uppercase;">Registro · ' + _esc(f.nome) + '</div>' +
            '<div style="font-size:1.1rem;font-weight:700;color:' + T1 + ';margin-top:2px;">' + titulo + '</div>' +
          '</div>' +
          '<button onclick="HR_FUNC._closeRegistro()" style="background:none;border:1px solid rgba(201,168,76,.3);color:' + GOLD + ';border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;">✕</button>' +
        '</div>' +

        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:16px;margin-bottom:12px;">' +
          '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;">Ponto do Dia</div>' +
          _fieldBlock('Data', _inp('fr_data', 'date', '', r.data || hoje)) +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
            _fieldBlock('Entrada', _inp('fr_entrada', 'time', '', r.entrada)) +
            _fieldBlock('Saída', _inp('fr_saida', 'time', '', r.saida)) +
          '</div>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
            _fieldBlock('Horas trabalhadas', _inp('fr_horas', 'number', '8', r.horas, 'min="0" step="0.25"')) +
            _fieldBlock('Horas extras', _inp('fr_extra', 'number', '0', r.extra, 'min="0" step="0.25"')) +
          '</div>' +
        '</div>' +

        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:16px;margin-bottom:12px;">' +
          '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:12px;">Atividades</div>' +
          _fieldBlock('Produção executada', _ta('fr_producao', 'Ex: 3 peças de cuba, bancada cozinha...', r.producao, 2)) +
          _fieldBlock('Instalação executada', _ta('fr_instalacao', 'Ex: Banheiro cliente João, entrega...', r.instalacao, 2)) +
          _fieldBlock('IEO (Incidente / Evento / Obs.)', _ta('fr_ieo', 'Ex: atraso por chuva, acidente menor...', r.ieo, 2)) +
          _fieldBlock('Observações gerais', _ta('fr_obs', '', r.observacao, 2)) +
        '</div>' +

        '<button onclick="HR_FUNC._salvarRegistro(\'' + funcionarioId + '\',\'' + (registroId||'') + '\')" style="' + BTN_GOLD + '">💾 Salvar Registro</button>' +

        (registroId
          ? '<button onclick="HR_FUNC._excluirRegistro(\'' + registroId + '\',\'' + funcionarioId + '\')" ' +
              'style="' + BTN_CANCEL + 'color:#c86d6d;border-color:rgba(200,109,109,.25);margin-top:4px;">🗑 Excluir</button>'
          : '') +

        '<button onclick="HR_FUNC._closeRegistro()" style="' + BTN_CANCEL + 'margin-top:4px;">Cancelar</button>' +
      '</div>';

    _overlay('hrFuncRegistro', html);

    // Auto-calcula horas ao preencher entrada/saída
    setTimeout(function() {
      var ent = document.getElementById('fr_entrada');
      var sai = document.getElementById('fr_saida');
      if (ent && sai) {
        function calcHoras() {
          if (!ent.value || !sai.value) return;
          var e = ent.value.split(':').map(Number);
          var s = sai.value.split(':').map(Number);
          var diff = (s[0]*60 + s[1]) - (e[0]*60 + e[1]);
          if (diff < 0) diff += 24*60;
          var h = (diff / 60).toFixed(2);
          var hr = document.getElementById('fr_horas');
          if (hr && !hr._userEdited) hr.value = h;
        }
        ent.addEventListener('change', calcHoras);
        sai.addEventListener('change', calcHoras);
        var hr = document.getElementById('fr_horas');
        if (hr) hr.addEventListener('input', function() { hr._userEdited = true; });
      }
    }, 100);
  }

  function _closeRegistro() { _closeOverlay('hrFuncRegistro'); }

  function _salvarRegistro(funcionarioId, registroId) {
    var data = (document.getElementById('fr_data') || {}).value || '';
    if (!data) { _toast('Informe a data'); return; }

    var regs = getRegistros();
    var regId = registroId || genId();
    var isNew = !registroId;

    regs[regId] = {
      id:           regId,
      funcionarioId: funcionarioId,
      data:         data,
      entrada:      (document.getElementById('fr_entrada')    || {}).value || '',
      saida:        (document.getElementById('fr_saida')      || {}).value || '',
      horas:        parseFloat((document.getElementById('fr_horas')     || {}).value) || 0,
      extra:        parseFloat((document.getElementById('fr_extra')     || {}).value) || 0,
      producao:     (document.getElementById('fr_producao')   || {}).value || '',
      instalacao:   (document.getElementById('fr_instalacao') || {}).value || '',
      ieo:          (document.getElementById('fr_ieo')        || {}).value || '',
      observacao:   (document.getElementById('fr_obs')        || {}).value || '',
      criadoEm:     (regs[regId] && regs[regId].criadoEm) || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };

    saveRegistros(regs);
    _closeRegistro();

    // Recarrega detalhes do funcionário se estiver aberto
    if (document.getElementById('hrFuncDetalhes')) {
      abrirDetalhesFuncionario(funcionarioId);
    }

    _toast(isNew ? '✓ Registro salvo!' : '✓ Registro atualizado!');
  }

  function _excluirRegistro(registroId, funcionarioId) {
    if (!confirm('Excluir este registro?')) return;
    var regs = getRegistros();
    delete regs[registroId];
    saveRegistros(regs);
    _closeRegistro();
    if (document.getElementById('hrFuncDetalhes')) {
      abrirDetalhesFuncionario(funcionarioId);
    }
    _toast('Registro excluído.');
  }

  // Detalhes individuais de um registro (para edição a partir do histórico)
  function abrirDetalhesRegistro(registroId) {
    var regs = getRegistros();
    var r = regs[registroId];
    if (!r) return;
    abrirFormRegistro(r.funcionarioId, registroId);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. HISTÓRICO
  // ─────────────────────────────────────────────────────────────
  var _histState = { funcId: null, de: '', ate: '', busca: '' };

  function abrirHistorico(funcIdInicial) {
    _histState.funcId = funcIdInicial || null;
    _histState.de = '';
    _histState.ate = '';
    _histState.busca = '';
    _renderHistorico();
  }

  function _renderHistorico() {
    var funcs = getFuncionarios();
    var regs  = getRegistros();

    var opsFuncs = [{v:'', l:'Todos os funcionários'}].concat(
      Object.values(funcs).sort(function(a,b){ return a.nome.localeCompare(b.nome); }).map(function(f){
        return {v: f.id, l: f.nome};
      })
    );

    // Filtrar
    var lista = Object.values(regs).filter(function(r) {
      if (_histState.funcId && r.funcionarioId !== _histState.funcId) return false;
      if (_histState.de  && r.data < _histState.de)  return false;
      if (_histState.ate && r.data > _histState.ate)  return false;
      if (_histState.busca) {
        var bq = _histState.busca.toLowerCase();
        var fNome = ((funcs[r.funcionarioId] || {}).nome || '').toLowerCase();
        var campos = [fNome, r.producao, r.instalacao, r.observacao, r.ieo].join(' ').toLowerCase();
        if (campos.indexOf(bq) < 0) return false;
      }
      return true;
    }).sort(function(a,b){ return b.data.localeCompare(a.data); });

    // Totais
    var totHoras = lista.reduce(function(s,r){ return s + (parseFloat(r.horas)||0); }, 0);
    var totExtra = lista.reduce(function(s,r){ return s + (parseFloat(r.extra)||0); }, 0);

    // Agrupamento por funcionário (para resumo)
    var porFunc = {};
    lista.forEach(function(r) {
      if (!porFunc[r.funcionarioId]) porFunc[r.funcionarioId] = {horas:0, extra:0, dias:0};
      porFunc[r.funcionarioId].horas += parseFloat(r.horas) || 0;
      porFunc[r.funcionarioId].extra += parseFloat(r.extra) || 0;
      porFunc[r.funcionarioId].dias++;
    });

    var resumoFuncHtml = '';
    if (!_histState.funcId && Object.keys(porFunc).length > 0) {
      resumoFuncHtml = '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:14px;margin-bottom:12px;">' +
        '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Resumo por Funcionário</div>' +
        Object.keys(porFunc).map(function(fid) {
          var nm = (funcs[fid] || {}).nome || 'Desconhecido';
          var pf = porFunc[fid];
          return '<div style="display:flex;justify-content:space-between;align-items:center;' +
            'padding:7px 0;border-bottom:1px solid rgba(201,168,76,.08);">' +
            '<div style="font-size:.82rem;font-weight:600;color:' + T1 + ';">' + _esc(nm) + '</div>' +
            '<div style="font-size:.75rem;color:' + T3 + ';">' +
              pf.dias + 'd · ' + pf.horas.toFixed(1) + 'h' +
              (pf.extra > 0 ? ' · <span style="color:' + GOLD + ';">+' + pf.extra.toFixed(2) + 'h extra</span>' : '') +
            '</div>' +
          '</div>';
        }).join('') +
      '</div>';
    }

    // Cards de registros
    var regCards = lista.length === 0
      ? '<div style="text-align:center;padding:40px 0;color:' + T3 + ';font-size:.85rem;">Nenhum registro encontrado.</div>'
      : lista.map(function(r) {
          var fNome = (funcs[r.funcionarioId] || {}).nome || '?';
          return _cardRegistroHistorico(r, fNome, !_histState.funcId);
        }).join('');

    var html =
      '<div style="width:100%;max-width:540px;padding:0 16px;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
          '<div>' +
            '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.12em;text-transform:uppercase;">RH · Equipe</div>' +
            '<div style="font-size:1.1rem;font-weight:700;color:' + T1 + ';margin-top:2px;">Histórico</div>' +
          '</div>' +
          '<button onclick="HR_FUNC._closeHistorico()" style="background:none;border:1px solid rgba(201,168,76,.3);color:' + GOLD + ';border-radius:6px;padding:6px 14px;cursor:pointer;font-size:.8rem;">✕ Fechar</button>' +
        '</div>' +

        // Filtros
        '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:12px;padding:14px;margin-bottom:12px;">' +
          '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:10px;">Filtros</div>' +
          _fieldBlock('Funcionário',
            _sel('hf_func', opsFuncs, _histState.funcId || '')) +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">' +
            _fieldBlock('De', _inp('hf_de', 'date', '', _histState.de)) +
            _fieldBlock('Até', _inp('hf_ate', 'date', '', _histState.ate)) +
          '</div>' +
          _fieldBlock('Busca livre', _inp('hf_busca', 'text', 'Produção, observação...', _histState.busca)) +
          '<button onclick="HR_FUNC._aplicarFiltroHistorico()" style="' + BTN_GOLD + 'margin-top:4px;">🔍 Filtrar</button>' +
        '</div>' +

        // Totalizadores
        '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:12px;">' +
          _miniStat('Registros', lista.length + '') +
          _miniStat('H. Trabalhadas', totHoras.toFixed(1) + 'h') +
          _miniStat('H. Extras', totExtra.toFixed(2) + 'h') +
        '</div>' +

        resumoFuncHtml +

        '<div style="font-size:.68rem;color:' + GOLD + ';letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">Registros</div>' +
        regCards +

        '<button onclick="HR_FUNC._closeHistorico()" style="' + BTN_CANCEL + 'margin-top:12px;">Fechar</button>' +
      '</div>';

    _overlay('hrHistorico', html);
  }

  function _aplicarFiltroHistorico() {
    _histState.funcId = (document.getElementById('hf_func')  || {}).value || null;
    _histState.de     = (document.getElementById('hf_de')    || {}).value || '';
    _histState.ate    = (document.getElementById('hf_ate')   || {}).value || '';
    _histState.busca  = (document.getElementById('hf_busca') || {}).value || '';
    _closeOverlay('hrHistorico');
    _renderHistorico();
  }

  function _closeHistorico() { _closeOverlay('hrHistorico'); }

  function _cardRegistroHistorico(r, fNome, mostrarNome) {
    return '<div style="background:' + S2 + ';border:1px solid ' + BD + ';border-radius:11px;' +
      'padding:12px 14px;margin-bottom:9px;cursor:pointer;" ' +
      'onclick="HR_FUNC.abrirDetalhesRegistro(\'' + r.id + '\')">' +

      '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px;">' +
        '<div>' +
          (mostrarNome ? '<div style="font-size:.72rem;color:' + GOLD + ';font-weight:600;margin-bottom:1px;">' + _esc(fNome) + '</div>' : '') +
          '<div style="font-size:.88rem;font-weight:700;color:' + T1 + ';">' + _fmtData(r.data) + '</div>' +
          (r.entrada && r.saida ? '<div style="font-size:.72rem;color:' + T3 + ';">' + r.entrada + ' → ' + r.saida + '</div>' : '') +
        '</div>' +
        '<div style="text-align:right;">' +
          '<div style="font-size:.85rem;font-weight:700;color:' + T1 + ';">' + (parseFloat(r.horas)||0).toFixed(1) + 'h</div>' +
          (parseFloat(r.extra) > 0
            ? '<div style="font-size:.72rem;color:' + GOLD + ';">+' + parseFloat(r.extra).toFixed(2) + 'h extra</div>'
            : '') +
        '</div>' +
      '</div>' +

      (r.producao
        ? '<div style="font-size:.73rem;color:' + T2 + ';margin-bottom:3px;">📦 ' + _esc(r.producao) + '</div>'
        : '') +
      (r.instalacao
        ? '<div style="font-size:.73rem;color:' + T2 + ';margin-bottom:3px;">🔧 ' + _esc(r.instalacao) + '</div>'
        : '') +
      (r.ieo
        ? '<div style="font-size:.72rem;color:#c8a060;margin-bottom:3px;">⚠️ ' + _esc(r.ieo) + '</div>'
        : '') +
      (r.observacao
        ? '<div style="font-size:.72rem;color:' + T3 + ';">💬 ' + _esc(r.observacao) + '</div>'
        : '') +

    '</div>';
  }

  // ─────────────────────────────────────────────────────────────
  // 8. INICIALIZAÇÃO E HOOK NA NAVEGAÇÃO EXISTENTE
  // ─────────────────────────────────────────────────────────────
  function init() {
    // Injeta a página pg30 no DOM se não existir
    if (!document.getElementById('pg30')) {
      var pages = document.getElementById('pages');
      if (pages) {
        var div = document.createElement('div');
        div.className = 'pg';
        div.id = 'pg30';
        div.style.display = 'none';
        pages.appendChild(div);
      }
    }

    // Injeta item na nav bar se não existir
    if (!document.getElementById('navFunc')) {
      var nav = document.querySelector('.nav, #nav, [class*="nav"]');
      // tenta encontrar o container .ni items
      var niContainer = document.querySelector('.ni')
        ? document.querySelector('.ni').parentNode
        : null;

      if (niContainer) {
        var ni = document.createElement('div');
        ni.className = 'ni';
        ni.id = 'navFunc';
        ni.setAttribute('data-pg', '30');
        ni.innerHTML = '<span class="ni-i">🏢</span><span class="ni-l">RH</span>';
        niContainer.appendChild(ni);

        // Reaplica listener via go() se existir
        ni.addEventListener('click', function() {
          if (typeof go === 'function') go(30);
          else _showPage30();
        });
      }
    }

    // Listener para quando go(30) for chamado — hook no evento de mudança de página
    // O sistema existente usa data-pg e a função go() em app-core.js.
    // Vamos monitorar com um MutationObserver na página pg30.
    _watchPg30();

    console.log('[HR_FUNC v2] ✓ Módulo RH carregado');
  }

  function _showPage30() {
    // Fallback manual se go() não estiver disponível
    document.querySelectorAll('.pg').forEach(function(p) { p.style.display = 'none'; });
    document.querySelectorAll('.ni').forEach(function(n) { n.classList.remove('on'); });
    var pg30 = document.getElementById('pg30');
    if (pg30) { pg30.style.display = 'flex'; pg30.style.flexDirection = 'column'; }
    var navFunc = document.getElementById('navFunc');
    if (navFunc) navFunc.classList.add('on');
    renderPaginaFuncionarios();
  }

  function _watchPg30() {
    // Observa quando pg30 fica visível (go() altera display)
    var pg30 = document.getElementById('pg30');
    if (!pg30) return;

    var obs = new MutationObserver(function(mutations) {
      mutations.forEach(function(m) {
        if (m.type === 'attributes' && m.attributeName === 'style') {
          var el = m.target;
          if (el.style.display !== 'none' && el.id === 'pg30') {
            renderPaginaFuncionarios();
          }
        }
        if (m.type === 'attributes' && m.attributeName === 'class') {
          var el = m.target;
          if (el.classList.contains('on') && el.id === 'pg30') {
            renderPaginaFuncionarios();
          }
        }
      });
    });

    obs.observe(pg30, { attributes: true });
  }

  // Expõe API pública
  return {
    init:                    init,
    renderPaginaFuncionarios: renderPaginaFuncionarios,
    abrirFormFuncionario:    abrirFormFuncionario,
    abrirDetalhesFuncionario: abrirDetalhesFuncionario,
    abrirFormRegistro:       abrirFormRegistro,
    abrirDetalhesRegistro:   abrirDetalhesRegistro,
    abrirHistorico:          abrirHistorico,

    // Internos expostos para callbacks inline
    _closeForm:              _closeForm,
    _salvarFuncionario:      _salvarFuncionario,
    _excluirFuncionario:     _excluirFuncionario,
    _closeDetalhes:          _closeDetalhes,
    _closeRegistro:          _closeRegistro,
    _salvarRegistro:         _salvarRegistro,
    _excluirRegistro:        _excluirRegistro,
    _closeHistorico:         _closeHistorico,
    _aplicarFiltroHistorico: _aplicarFiltroHistorico,
  };

})();

// ── Auto-inicializa após o DOM estar pronto ──
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { HR_FUNC.init(); });
} else {
  HR_FUNC.init();
}

console.log('[app-funcionarios.js v2] ✓ RH carregado');
