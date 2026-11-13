// ═══════════════════════════════════════════════════════════════════
// LIXEIRA DE ORÇAMENTOS (v1)
// O botão 🗑 do Histórico chamava orcMostrarLixeira(), que só existia num
// arquivo antigo que o app não carrega → erro "orcMostrarLixeira is not defined".
// Agora: todo orçamento excluído (orcDel → _undoDelete) também vai para a
// lixeira (localStorage hr_q_lixo, últimos 80, por 90 dias) e pode ser
// restaurado a qualquer momento — não só nos 5 s do "Desfazer".
// ═══════════════════════════════════════════════════════════════════
(function () {
  var KEY = 'hr_q_lixo', MAX = 80, DIAS = 90;
  function ler() { try { return JSON.parse(localStorage.getItem(KEY) || '[]') || []; } catch (e) { return []; } }
  function gravar(l) {
    var lim = Date.now() - DIAS * 864e5;
    l = l.filter(function (x) { return (x._lixoEm || 0) > lim; }).slice(-MAX);
    try { localStorage.setItem(KEY, JSON.stringify(l)); } catch (e) {}
    return l;
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function brl(v) { v = +v || 0; return 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function rerender() {
    try { if (typeof renderHistorico === 'function') renderHistorico(); } catch (e) {}
    try { if (typeof renderOrc === 'function') renderOrc(); } catch (e) {}
  }

  // guarda na lixeira tudo o que _undoDelete tirar de DB.q
  if (typeof window._undoDelete === 'function' && !window._undoDelete.__lixo) {
    var orig = window._undoDelete;
    window._undoDelete = function (arr, idx, msg, onChange, collKey) {
      var item = arr && arr[idx];
      if (collKey === 'q' && item) {
        var l = ler().filter(function (x) { return x.id != item.id; });
        var c = JSON.parse(JSON.stringify(item)); c._lixoEm = Date.now();
        l.push(c); gravar(l);
      }
      return orig.apply(this, arguments);
    };
    window._undoDelete.__lixo = true;
  }

  window.orcRestore = function (id) {
    var l = ler(), q = l.filter(function (x) { return x.id == id; })[0];
    if (!q) return;
    delete q._lixoEm; delete q._deletedAt;
    if (!DB.q) DB.q = [];
    if (!DB.q.some(function (x) { return x.id == id; })) DB.q.unshift(q);
    if (DB.desmarcarExcluido) try { DB.desmarcarExcluido('q', q.id); } catch (e) {}
    gravar(l.filter(function (x) { return x.id != id; }));
    DB.sv(); rerender();
    if (typeof toast === 'function') toast('✓ Orçamento de ' + (q.cli || 'cliente') + ' restaurado');
  };

  window._fecharModalLixeira = function () { var m = document.getElementById('_modalLixeira'); if (m) m.remove(); };

  window.orcMostrarLixeira = function (e) {
    if (e && e.stopPropagation) e.stopPropagation();
    var ativos = {}; (DB.q || []).forEach(function (x) { ativos[x.id] = 1; });
    var l = gravar(ler().filter(function (x) { return !ativos[x.id]; })).slice().reverse();
    if (!l.length) { if (typeof toast === 'function') toast('🗑 Lixeira vazia'); return; }
    window._fecharModalLixeira();
    var h = '<div style="padding:16px 14px 6px;"><div style="font-weight:800;font-size:1rem;color:var(--gold,#c9a84c);">🗑 Lixeira (' + l.length + ')</div>' +
      '<div style="font-size:.7rem;color:#888;margin:4px 0 12px;">Orçamentos excluídos nos últimos ' + DIAS + ' dias. Toque em Restaurar para voltar ao histórico.</div>';
    l.forEach(function (q) {
      var quando = q._lixoEm ? new Date(q._lixoEm).toLocaleDateString('pt-BR') : '';
      h += '<div style="margin-bottom:8px;padding:10px;background:#1a1a1e;border:1px solid #2a2a30;border-radius:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;">' +
        '<div style="min-width:0;"><div style="font-size:.82rem;font-weight:700;color:#eee;">' + esc(q.cli || 'Sem nome') + '</div>' +
        '<div style="font-size:.66rem;color:#888;">' + (q.num ? 'ORC-' + esc(q.num) + ' · ' : '') + brl(q.vista || q.total || q.prazo) + (quando ? ' · excluído em ' + quando : '') + '</div></div>' +
        '<button class="btn btn-g" style="font-size:.7rem;padding:7px 12px;flex-shrink:0;" onclick="orcRestore(' + JSON.stringify(q.id).replace(/"/g, '&quot;') + ');_fecharModalLixeira();">Restaurar</button></div>';
    });
    h += '</div>';
    var m = document.createElement('div');
    m.id = '_modalLixeira';
    m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:99998;overflow-y:auto;';
    m.onclick = function (ev) { if (ev.target === m) window._fecharModalLixeira(); };
    m.innerHTML = '<div style="max-width:440px;margin:50px auto 30px;background:#111114;border-radius:16px;border:1px solid #333;">' + h +
      '<div style="padding:4px 14px 14px;"><button class="btn btn-red" style="width:100%;" onclick="_fecharModalLixeira()">Fechar</button></div></div>';
    document.body.appendChild(m);
  };
})();
