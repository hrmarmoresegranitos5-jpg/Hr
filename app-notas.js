// ══════════════════════════════════════════════════════════════════════
// app-notas.js — Área "Anotações" (página 13)
// Anotações de visita: medidas de soleiras, peitoris, observações do cliente…
// Dados em DB.n (localStorage 'hr_n'), sincronizados pelo mesmo caminho dos
// orçamentos (merge por id + tombstones). Também recebe anotações enviadas
// pelo bot do WhatsApp (ver botSyncNotas em app-secretaria.js).
//
// Registro: { id, cliente, texto, tipo, origem, waId?, atualizado? }
//   tipo:   'medidas' | 'visita' | 'geral'
//   origem: 'app' | 'whatsapp'
// ══════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var TIPOS = {
    medidas: { ic: '📏', nome: 'Medidas' },
    visita:  { ic: '🏠', nome: 'Visita' },
    geral:   { ic: '📝', nome: 'Geral' }
  };
  var ATALHOS = ['Soleira', 'Peitoril', 'Bancada', 'Pia/Cuba', 'Escada'];

  var _filtro = 'todos';   // 'todos' | tipo
  var _busca = '';
  var _editId = null;      // id em edição (null = nova)
  var _tipoForm = 'medidas';

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
  function lista() {
    if (typeof DB === 'undefined') return [];
    if (!Array.isArray(DB.n)) DB.n = [];
    return DB.n;
  }
  function fmtData(id) {
    var d = new Date(+id);
    if (isNaN(d)) return '';
    var hoje = new Date();
    var mesmoDia = d.toDateString() === hoje.toDateString();
    var hh = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    if (mesmoDia) return 'Hoje · ' + hh;
    var ont = new Date(); ont.setDate(ont.getDate() - 1);
    if (d.toDateString() === ont.toDateString()) return 'Ontem · ' + hh;
    return ('0' + d.getDate()).slice(-2) + '/' + ('0' + (d.getMonth() + 1)).slice(-2) + '/' + d.getFullYear() + ' · ' + hh;
  }
  function salvar() {
    if (typeof DB !== 'undefined' && DB.sv) DB.sv();
  }

  // ── Página ──────────────────────────────────────────────────────────
  function renderNotas() {
    var box = document.getElementById('notasWrap');
    if (!box) return;

    var todas = lista();
    var q = norm(_busca).trim();
    var vis = todas.filter(function (n) {
      if (_filtro !== 'todos' && (n.tipo || 'geral') !== _filtro) return false;
      if (!q) return true;
      return norm(n.cliente).indexOf(q) >= 0 || norm(n.texto).indexOf(q) >= 0;
    }).sort(function (a, b) { return (+b.id || 0) - (+a.id || 0); });

    var chips = [['todos', '📚 Todas']].concat(Object.keys(TIPOS).map(function (k) {
      return [k, TIPOS[k].ic + ' ' + TIPOS[k].nome];
    }));
    var h = '';
    h += '<div style="display:flex;gap:8px;margin-bottom:10px;">'
      + '<input id="notasBusca" type="text" placeholder="🔍 Buscar por cliente ou texto…" value="' + esc(_busca) + '" oninput="notasBuscar(this.value)" style="flex:1;">'
      + '</div>';
    h += '<div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:10px;padding-bottom:2px;">'
      + chips.map(function (c) {
        var on = _filtro === c[0];
        return '<button onclick="notasFiltrar(\'' + c[0] + '\')" style="flex-shrink:0;padding:7px 12px;border-radius:20px;font-family:Outfit,sans-serif;font-size:.7rem;font-weight:600;cursor:pointer;'
          + 'border:1px solid ' + (on ? 'var(--gold)' : 'var(--bd2)') + ';background:' + (on ? 'rgba(201,168,76,.14)' : 'transparent') + ';color:' + (on ? 'var(--gold)' : 'var(--t3)') + ';">' + c[1] + '</button>';
      }).join('')
      + '</div>';

    if (!vis.length) {
      h += '<div style="text-align:center;padding:34px 10px;color:var(--t3);font-size:.8rem;line-height:1.6;">'
        + (todas.length ? 'Nenhuma anotação encontrada.' : '📝 Nenhuma anotação ainda.<br>Toque em <b>+ Nova anotação</b> — ou mande pelo WhatsApp: <i>anotar Maria: soleira 0,90 x 0,15</i>')
        + '</div>';
    } else {
      h += vis.map(function (n) {
        var t = TIPOS[n.tipo] || TIPOS.geral;
        var orc = n.orcadoEm ? '<span style="font-size:.58rem;color:var(--gold);border:1px solid rgba(201,168,76,.4);border-radius:8px;padding:1px 6px;margin-left:6px;">✓ Orçado</span>' : '';
        var wa = n.origem === 'whatsapp'
          ? '<span style="font-size:.58rem;color:#4ade80;border:1px solid rgba(74,222,128,.35);border-radius:8px;padding:1px 6px;margin-left:6px;">WhatsApp</span>' : '';
        return '<div class="card" style="margin-bottom:9px;">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">'
          +   '<div style="font-weight:700;font-size:.86rem;min-width:0;overflow-wrap:anywhere;">' + t.ic + ' ' + (n.cliente ? esc(n.cliente) : '<span style="color:var(--t3);font-weight:500;">Sem cliente</span>') + wa + orc + '</div>'
          +   '<div style="font-size:.62rem;color:var(--t3);white-space:nowrap;">' + esc(fmtData(n.id)) + '</div>'
          + '</div>'
          + '<div style="font-size:.82rem;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--t2);">' + esc(n.texto) + '</div>'
          + (temMedidas(n) ? '<button class="btn btn-g" style="margin-top:10px;padding:9px;font-size:.74rem;" onclick="notasOrcar(' + n.id + ')">🧾 ' + (n.orcadoEm ? 'Orçar de novo' : 'Orçar essas medidas') + '</button>' : '')
          + '<div style="display:flex;gap:6px;margin-top:8px;">'
          +   '<button class="btn btn-o" style="padding:8px;font-size:.7rem;" onclick="notasAbrir(' + n.id + ')">✏️ Editar</button>'
          +   '<button class="btn btn-o" style="padding:8px;font-size:.7rem;" onclick="notasCopiar(' + n.id + ')">📋 Copiar</button>'
          +   '<button class="btn btn-o" style="padding:8px;font-size:.7rem;" onclick="notasEnviar(' + n.id + ')">💬 Enviar</button>'
          +   '<button class="btn btn-red" style="padding:8px;font-size:.7rem;flex:0 0 44px;" onclick="notasExcluir(' + n.id + ')">🗑</button>'
          + '</div>'
          + '</div>';
      }).join('');
    }
    box.innerHTML = h;
    // mantém o foco/cursor na busca ao digitar
    var inp = document.getElementById('notasBusca');
    if (inp && document.activeElement && document.activeElement.id === 'notasBusca') {
      var p = inp.value.length; inp.focus(); try { inp.setSelectionRange(p, p); } catch (e) {}
    }
  }

  function notasBuscar(v) {
    _busca = v || '';
    var el = document.getElementById('notasBusca');
    var tinhaFoco = el && document.activeElement === el;
    renderNotas();
    if (tinhaFoco) {
      var e2 = document.getElementById('notasBusca');
      if (e2) { e2.focus(); try { e2.setSelectionRange(e2.value.length, e2.value.length); } catch (e) {} }
    }
  }
  function notasFiltrar(f) { _filtro = f; renderNotas(); }

  // ── Formulário (modal) ──────────────────────────────────────────────
  function garantirModal() {
    if (document.getElementById('notaMd')) return;
    var d = document.createElement('div');
    d.className = 'ov';
    d.id = 'notaMd';
    d.innerHTML =
      '<div class="modal">'
      + '<div class="mtitle" id="notaMdTitulo">Nova anotação</div>'
      + '<div class="f"><input id="notaCliente" type="text" list="notaClientesDl" placeholder="Cliente (opcional)" autocomplete="off"></div>'
      + '<datalist id="notaClientesDl"></datalist>'
      + '<div id="notaTipoRow" style="display:flex;gap:6px;margin-bottom:8px;"></div>'
      + '<div class="f"><textarea id="notaTexto" rows="8" placeholder="Ex.: Soleira porta da frente 0,90 x 0,15&#10;Soleira varanda 1,20 x 0,20" style="width:100%;min-height:150px;resize:vertical;"></textarea></div>'
      + '<div id="notaAtalhos" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;"></div>'
      + '<button class="btn btn-g" onclick="notasSalvar()">Salvar anotação</button>'
      + '<button class="btn btn-o mt6" data-close>Cancelar</button>'
      + '</div>';
    document.body.appendChild(d);
    // fecha ao tocar fora
    d.addEventListener('click', function (e) { if (e.target === d) d.classList.remove('on'); });
  }
  function pintarTipos() {
    var row = document.getElementById('notaTipoRow');
    if (!row) return;
    row.innerHTML = Object.keys(TIPOS).map(function (k) {
      var on = _tipoForm === k;
      return '<button type="button" onclick="notasTipo(\'' + k + '\')" style="flex:1;padding:8px 4px;border-radius:10px;font-family:Outfit,sans-serif;font-size:.7rem;font-weight:600;cursor:pointer;'
        + 'border:1px solid ' + (on ? 'var(--gold)' : 'var(--bd2)') + ';background:' + (on ? 'rgba(201,168,76,.14)' : 'transparent') + ';color:' + (on ? 'var(--gold)' : 'var(--t3)') + ';">'
        + TIPOS[k].ic + ' ' + TIPOS[k].nome + '</button>';
    }).join('');
  }
  function notasTipo(k) { _tipoForm = k; pintarTipos(); }

  function notasAtalho(rot) {
    var ta = document.getElementById('notaTexto');
    if (!ta) return;
    var v = ta.value;
    ta.value = v + (v && !/\n$/.test(v) ? '\n' : '') + rot + ': ';
    ta.focus();
    try { ta.setSelectionRange(ta.value.length, ta.value.length); } catch (e) {}
  }

  function notasAbrir(id) {
    garantirModal();
    _editId = id == null ? null : id;
    var n = null;
    if (_editId != null) {
      n = lista().filter(function (x) { return x.id === _editId; })[0] || null;
      if (!n) _editId = null;
    }
    document.getElementById('notaMdTitulo').textContent = n ? 'Editar anotação' : 'Nova anotação';
    document.getElementById('notaCliente').value = n ? (n.cliente || '') : '';
    document.getElementById('notaTexto').value = n ? (n.texto || '') : '';
    _tipoForm = n ? (n.tipo || 'geral') : 'medidas';
    pintarTipos();

    // sugestões de clientes (orçamentos + anotações anteriores)
    var vistos = {}, nomes = [];
    (typeof DB !== 'undefined' && DB.q ? DB.q : []).forEach(function (o) { if (o && o.cliente) vistos[o.cliente.trim()] = 1; });
    lista().forEach(function (x) { if (x && x.cliente) vistos[x.cliente.trim()] = 1; });
    nomes = Object.keys(vistos).sort();
    document.getElementById('notaClientesDl').innerHTML = nomes.slice(0, 400).map(function (c) {
      return '<option value="' + esc(c) + '"></option>';
    }).join('');

    document.getElementById('notaAtalhos').innerHTML = ATALHOS.map(function (a) {
      return '<button type="button" onclick="notasAtalho(\'' + a.replace(/'/g, "\\'") + '\')" style="padding:6px 11px;border-radius:16px;border:1px dashed var(--bd2);background:transparent;color:var(--t3);font-family:Outfit,sans-serif;font-size:.68rem;cursor:pointer;">+ ' + a + '</button>';
    }).join('');

    if (typeof closeAll === 'function') closeAll();
    document.getElementById('notaMd').classList.add('on');
    setTimeout(function () { var t = document.getElementById('notaTexto'); if (t) t.focus(); }, 120);
  }

  function notasSalvar() {
    var cliente = (document.getElementById('notaCliente').value || '').trim();
    var texto = (document.getElementById('notaTexto').value || '').trim();
    if (!texto) { if (typeof toast === 'function') toast('Escreva a anotação primeiro'); return; }
    var arr = lista();
    if (_editId != null) {
      var n = arr.filter(function (x) { return x.id === _editId; })[0];
      if (n) { n.cliente = cliente; n.texto = texto; n.tipo = _tipoForm; n.atualizado = Date.now(); }
    } else {
      arr.unshift({ id: Date.now(), cliente: cliente, texto: texto, tipo: _tipoForm, origem: 'app' });
    }
    salvar();
    if (typeof closeAll === 'function') closeAll();
    renderNotas();
    if (typeof toast === 'function') toast('✓ Anotação salva');
  }

  // ── Ações do cartão ─────────────────────────────────────────────────
  function achar(id) { return lista().filter(function (x) { return x.id === id; })[0] || null; }
  function textoCompleto(n) {
    return (n.cliente ? n.cliente + '\n' : '') + n.texto;
  }
  function notasCopiar(id) {
    var n = achar(id); if (!n) return;
    var t = textoCompleto(n);
    function ok() { if (typeof toast === 'function') toast('📋 Copiado'); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(t).then(ok, function () { fallback(); });
    } else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta);
      ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove();
    }
  }
  function notasEnviar(id) {
    var n = achar(id); if (!n) return;
    window.open('https://wa.me/?text=' + encodeURIComponent(textoCompleto(n)), '_blank');
  }
  function notasExcluir(id) {
    var arr = lista();
    var idx = -1;
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) { idx = i; break; }
    if (idx < 0) return;
    var onChange = function () { salvar(); renderNotas(); };
    if (typeof _undoDelete === 'function') _undoDelete(arr, idx, 'Anotação excluída', onChange, 'n');
    else { if (!confirm('Excluir esta anotação?')) return; arr.splice(idx, 1); if (DB.marcarExcluido) DB.marcarExcluido('n', id); onChange(); }
  }


  // ── Orçar a partir da anotação ──────────────────────────────────────
  // Lê linhas como "soleira porta 0,90 x 0,15 (2 un)" e monta os ambientes
  // do orçamento. Número < 10 é tratado como metros (0,90 → 90 cm); senão cm.
  var RE_MED = /(\d+(?:[.,]\d+)?)\s*(?:cm|m)?\s*(?:[x×*]|por)\s*(\d+(?:[.,]\d+)?)\s*(?:cm|m)?/i;
  var TIPOS_AMB = [
    [/soleiras?/, 'Soleira'], [/peitoril|peitoris/, 'Peitoril'], [/escadas?|degrau|degraus/, 'Escada'],
    [/banheiro|\bwc\b/, 'Banheiro'], [/lavabo/, 'Lavabo'], [/bancada|cozinha|\bpia\b/, 'Cozinha']
  ];
  function paraCm(v) {
    var n = parseFloat(String(v).replace(',', '.'));
    if (isNaN(n)) return 0;
    return Math.round((n < 10 ? n * 100 : n) * 10) / 10;
  }
  function tipoDaLinha(linhaNorm) {
    for (var i = 0; i < TIPOS_AMB.length; i++) if (TIPOS_AMB[i][0].test(linhaNorm)) return TIPOS_AMB[i][1];
    return null;
  }
  function parseMedidas(texto) {
    var linhas = String(texto || '').split(/\n|;/);
    var grupos = {}, ordem = [], ignoradas = 0, ultimoTipo = null;
    var padrao = tipoDaLinha(norm(texto)) ? null : 'Soleira'; // sem palavra-chave em lugar nenhum → soleira
    linhas.forEach(function (ln) {
      var m = ln.match(RE_MED);
      if (!m) { if (ln.trim()) ignoradas++; return; }
      var resto = (ln.slice(0, m.index) + ' ' + ln.slice(m.index + m[0].length));
      var rn = norm(resto);
      var tipo = tipoDaLinha(norm(ln)) || ultimoTipo || padrao || 'Soleira';
      ultimoTipo = tipo;
      var q = 1, qm = rn.match(/(?:qtd|quantidade)\.?\s*[:=]?\s*(\d+)|(\d+)\s*(?:un|und|unid|unidades|pecas|pcs)\b|\(\s*(\d+)\s*x\s*\)|\bx\s*(\d+)\b/);
      if (qm) q = parseInt(qm[1] || qm[2] || qm[3] || qm[4], 10) || 1;
      var desc = resto
        .replace(/(?:qtd|quantidade)\.?\s*[:=]?\s*\d+/ig, ' ')
        .replace(/\d+\s*(?:un|und|unid|unidades|pe[cç]as|p[cç]s)\b/ig, ' ')
        .replace(/\(\s*\d+\s*x\s*\)/ig, ' ')
        .replace(/\bx\s*\d+\b/ig, ' ')
        .replace(/soleiras?|peitoril|peitoris/ig, ' ')
        .replace(/^[\s•\-–*:,.()]+|[\s•\-–*:,.()]+$/g, '')
        .replace(/\s+/g, ' ');
      if (!grupos[tipo]) { grupos[tipo] = []; ordem.push(tipo); }
      grupos[tipo].push({ desc: desc, w: paraCm(m[1]), h: paraCm(m[2]), q: Math.min(q, 99) });
    });
    return { grupos: grupos, ordem: ordem, ignoradas: ignoradas };
  }
  function temMedidas(n) { return RE_MED.test(n.texto || ''); }

  function notasOrcar(id) {
    var n = achar(id); if (!n) return;
    var r = parseMedidas(n.texto);
    if (!r.ordem.length) { if (typeof toast === 'function') toast('Não achei medidas no formato 0,90 x 0,15'); return; }
    if (typeof novoOrcamento !== 'function' || typeof renderAmbientes !== 'function') { if (typeof toast === 'function') toast('Abra a área Orçamento uma vez e tente de novo'); return; }

    var resumo = r.ordem.map(function (t) {
      return t + ':\n' + r.grupos[t].map(function (p) {
        return '  • ' + (p.desc || '(sem nome)') + ' — ' + p.w + ' × ' + p.h + ' cm' + (p.q > 1 ? ' (' + p.q + ' un)' : '');
      }).join('\n');
    }).join('\n');
    if (!confirm('Levar para o orçamento' + (n.cliente ? ' de ' + n.cliente : '') + '?\n\n' + resumo
      + (r.ignoradas ? '\n\n(' + r.ignoradas + ' linha(s) sem medida ficam só na anotação)' : '')
      + '\n\nConfira se as medidas estão certas.')) return;

    var antes = window.ambientes;
    novoOrcamento();                         // pergunta antes de apagar um orçamento em andamento
    if (window.ambientes === antes && antes && antes.length) return; // o usuário cancelou

    var matPadrao = null;
    try {
      matPadrao = localStorage.getItem('hr_last_mat') || window.selMat || null;
      if (matPadrao && window.CFG && CFG.stones && !CFG.stones.some(function (s) { return s.id === matPadrao; })) matPadrao = null;
    } catch (e) {}
    var base = Date.now(), c = 0;
    window.ambientes = [];
    r.ordem.forEach(function (tipo, i) {
      var amb = { id: base + (++c) * 1000, tipo: 'Cozinha', pecas: [], selCuba: null, svState: {}, acState: {}, selMat: matPadrao };
      r.grupos[tipo].forEach(function (p, j) {
        amb.pecas.push({ id: base + c * 1000 + j + 1, desc: p.desc || (tipo + ' ' + (j + 1)), w: p.w, h: p.h, q: p.q });
      });
      window.ambientes.push(amb);
      if (typeof setAmbTipo === 'function') setAmbTipo(amb.id, tipo); // aplica os padrões de acabamento do tipo
      else amb.tipo = tipo;
    });

    // dados do cliente: nome da anotação + telefone/cidade/endereço do último orçamento dele
    var setV = function (idEl, v) { var el = document.getElementById(idEl); if (el && v) el.value = v; };
    setV('oCliente', n.cliente);
    var ant = null;
    if (n.cliente && typeof DB !== 'undefined' && DB.q) {
      var nc = norm(n.cliente).trim();
      ant = DB.q.filter(function (o) { return o && norm(o.cliente).trim() === nc; })
        .sort(function (a, b) { return (+b.id || 0) - (+a.id || 0); })[0] || null;
    }
    if (ant) { setV('oTel', ant.tel || ant.telefone); setV('oCidade', ant.cidade); setV('oEnd', ant.end || ant.endereco); }

    renderAmbientes();
    if (typeof _salvarRascunho === 'function') _salvarRascunho();
    n.orcadoEm = Date.now(); salvar(); renderNotas();
    if (typeof go === 'function') go(0);
    var total = r.ordem.reduce(function (a, t) { return a + r.grupos[t].length; }, 0);
    if (typeof toast === 'function') toast('🧾 ' + total + ' peça(s) no orçamento — escolha a pedra e calcule');
  }

  // Exposição global (onclick inline + chamadas de outros módulos)
  window.renderNotas = renderNotas;
  window.notasBuscar = notasBuscar;
  window.notasFiltrar = notasFiltrar;
  window.notasAbrir = notasAbrir;
  window.notasTipo = notasTipo;
  window.notasAtalho = notasAtalho;
  window.notasSalvar = notasSalvar;
  window.notasCopiar = notasCopiar;
  window.notasEnviar = notasEnviar;
  window.notasExcluir = notasExcluir;
  window.notasOrcar = notasOrcar;
  window._notasParseMedidas = parseMedidas; // usado nos testes
})();
