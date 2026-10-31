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
        var wa = n.origem === 'whatsapp'
          ? '<span style="font-size:.58rem;color:#4ade80;border:1px solid rgba(74,222,128,.35);border-radius:8px;padding:1px 6px;margin-left:6px;">WhatsApp</span>' : '';
        return '<div class="card" style="margin-bottom:9px;">'
          + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;">'
          +   '<div style="font-weight:700;font-size:.86rem;min-width:0;overflow-wrap:anywhere;">' + t.ic + ' ' + (n.cliente ? esc(n.cliente) : '<span style="color:var(--t3);font-weight:500;">Sem cliente</span>') + wa + '</div>'
          +   '<div style="font-size:.62rem;color:var(--t3);white-space:nowrap;">' + esc(fmtData(n.id)) + '</div>'
          + '</div>'
          + '<div style="font-size:.82rem;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere;color:var(--t2);">' + esc(n.texto) + '</div>'
          + '<div style="display:flex;gap:6px;margin-top:10px;">'
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
})();
