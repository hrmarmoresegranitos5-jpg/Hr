// ═══════════════════════════════════════════════════════
// HR Mármores — Pós-venda automático (30 dias após concluir)
// Aviso na home → toca → abre o WhatsApp com texto pronto e editável.
// O app NUNCA envia sozinho: só prepara a mensagem.
// ═══════════════════════════════════════════════════════
(function () {
  'use strict';

  var DIAS = 30;          // quando o aviso aparece
  var JANELA_MAX = 60;    // depois disso o aviso some sozinho (não vira lista eterna)
  var MIG_KEY = 'hr_pv_mig_v1';

  function esc(t) { return String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

  function diasDesde(iso) {
    try {
      var d = new Date(iso + 'T00:00:00'), n = new Date();
      n.setHours(0, 0, 0, 0);
      return Math.round((n - d) / 86400000);
    } catch (e) { return -1; }
  }

  // ── Carimbo da data de conclusão ─────────────────────────────────────
  // O app marca "concluído" em vários lugares. Em vez de mexer em cada um,
  // carimbamos no salvamento: todo serviço done sem doneAt ganha a data de hoje.
  function carimbar() {
    try {
      var hoje = td();
      (DB.j || []).forEach(function (j) {
        if (j.done && !j.doneAt) j.doneAt = hoje;
        if (!j.done && j.doneAt) { delete j.doneAt; delete j.posVendaFeito; delete j.posVendaDispensado; } // reaberto
      });
    } catch (e) {}
  }

  // Migração única: serviços que JÁ estavam concluídos antes desta atualização
  // usam a data de entrega prevista (end) como referência — não "hoje".
  function migrar() {
    try {
      if (localStorage.getItem(MIG_KEY)) return;
      var mudou = false;
      (DB.j || []).forEach(function (j) {
        if (j.done && !j.doneAt) {
          var ref = j.end || j.start;
          if (ref) { j.doneAt = ref; mudou = true; }
        }
      });
      localStorage.setItem(MIG_KEY, '1');
      if (mudou) DB.sv();
    } catch (e) {}
  }

  function telDe(j) {
    var q = (DB.q || []).find(function (x) { return String(x.id) === String(j.qId); });
    var tel = q && q.tel;
    if (!tel) {
      var mesmo = (DB.q || []).filter(function (x) { return x.cli === j.cli && x.tel; })
        .sort(function (a, b) { return (b.id || 0) - (a.id || 0); })[0];
      tel = mesmo && mesmo.tel;
    }
    return String(tel || '').replace(/\D/g, '');
  }

  function primeiroNome(cli) {
    var n = String(cli || '').trim().split(/\s+/)[0] || '';
    return n ? n.charAt(0).toUpperCase() + n.slice(1).toLowerCase() : '';
  }

  function itemDe(j) {
    var t = String(j.cat || j.desc || '').toLowerCase();
    var mapa = [
      ['soleira', 'da soleira'], ['peitoril', 'do peitoril'], ['túmulo', 'do túmulo'], ['tumulo', 'do túmulo'],
      ['capela', 'da capela'], ['nicho', 'do nicho'], ['escada', 'da escada'], ['cozinha', 'da bancada da cozinha'],
      ['banheiro', 'da bancada do banheiro'], ['lavabo', 'da bancada do lavabo'], ['gourmet', 'da área gourmet'],
      ['piscina', 'da borda da piscina'], ['fachada', 'da fachada'], ['plaquinha', 'da plaquinha']
    ];
    for (var i = 0; i < mapa.length; i++) if (t.indexOf(mapa[i][0]) >= 0) return mapa[i][1];
    return 'do serviço';
  }

  function textoPadrao(j) {
    var nome = primeiroNome(j.cli);
    var link = '';
    try { link = String((CFG && CFG.emp && CFG.emp.maps) || '').trim(); } catch (e) {}
    return 'Oi' + (nome ? ', ' + nome : '') + '! Faz um mês da ' + (j.instala ? 'instalação ' : 'entrega ') + itemDe(j)
      + '. Tudo certo com o serviço? Se estiver satisfeito, você poderia nos avaliar no Google Maps? Isso ajuda muito a nossa empresa.'
      + (link ? '\n' + link : '');
  }

  // ── Lista de pendentes ───────────────────────────────────────────────
  function pendentes() {
    return (DB.j || []).filter(function (j) {
      if (!j.done || !j.doneAt || j.posVendaFeito || j.posVendaDispensado) return false;
      var d = diasDesde(j.doneAt);
      return d >= DIAS && d <= JANELA_MAX;
    }).sort(function (a, b) { return String(a.doneAt).localeCompare(String(b.doneAt)); });
  }

  // ── Home ─────────────────────────────────────────────────────────────
  function render() {
    var el = document.getElementById('homePosVenda');
    if (!el) return;
    try {
      var lista = pendentes();
      if (!lista.length) { el.innerHTML = ''; return; }
      var linhas = lista.map(function (j) {
        var d = diasDesde(j.doneAt);
        var quando = d === DIAS ? 'há 30 dias' : 'há ' + d + ' dias';
        return '<button type="button" onclick="_pvAbrir(' + JSON.stringify(String(j.id)).replace(/"/g, '&quot;') + ')" '
          + 'style="display:block;width:100%;text-align:left;padding:10px 12px;margin-top:6px;border-radius:12px;'
          + 'border:1px solid rgba(61,220,132,.4);background:rgba(61,220,132,.1);color:inherit;font:inherit;font-size:.8rem;cursor:pointer;">'
          + '💬 <b>' + esc(primeiroNome(j.cli) || 'Cliente') + '</b>: entrega foi ' + quando + '. Mandar mensagem?</button>';
      }).join('');
      el.innerHTML = '<div style="margin:10px 12px 0;padding:10px;border-radius:16px;border:1px solid rgba(201,168,76,.35);background:rgba(20,20,30,.6);">'
        + '<div style="font-size:.58rem;letter-spacing:1.6px;font-weight:700;color:var(--gold2,#C9A84C);">PÓS-VENDA</div>'
        + linhas + '</div>';
    } catch (e) { el.innerHTML = ''; }
  }

  // ── Modal: texto editável + abrir WhatsApp ───────────────────────────
  window._pvAbrir = function (id) {
    var j = (DB.j || []).find(function (x) { return String(x.id) === String(id); });
    if (!j) return;
    var tel = telDe(j);
    var m = document.createElement('div');
    m.id = '_pvModal';
    m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.82);display:flex;align-items:flex-end;justify-content:center;';
    m.innerHTML = '<div style="width:100%;max-width:480px;background:var(--s1,#14110a);border-radius:20px 20px 0 0;padding:22px 20px 26px;border-top:2px solid var(--gold,#C9A84C);color:var(--tx,#eee);font-family:Outfit,sans-serif;max-height:90vh;overflow:auto;">'
      + '<div style="font-size:1.05rem;font-weight:800;margin-bottom:6px;">💬 Pós-venda — ' + esc(j.cli) + '</div>'
      + '<div style="font-size:.78rem;color:var(--t3,#999);margin-bottom:10px;">'
      + (tel ? 'Você pode editar o texto antes de enviar.' : '⚠️ Esse cliente está sem telefone salvo — o WhatsApp vai abrir sem contato, é só escolher o cliente.') + '</div>'
      + '<textarea id="_pvTxt" rows="7" style="width:100%;box-sizing:border-box;padding:12px;border-radius:12px;border:1px solid var(--bd2,#444);background:var(--s2,#1c1810);color:inherit;font:inherit;font-size:.9rem;line-height:1.5;resize:vertical;"></textarea>'
      + '<button type="button" id="_pvZap" style="width:100%;margin-top:14px;padding:14px;border-radius:12px;border:none;background:#25D366;color:#000;font-weight:800;font-size:.95rem;cursor:pointer;font-family:Outfit,sans-serif;">💬 Abrir WhatsApp</button>'
      + '<button type="button" id="_pvNao" style="width:100%;margin-top:8px;padding:12px;border-radius:12px;border:1px solid var(--bd2,#444);background:transparent;color:inherit;font-weight:700;font-size:.85rem;cursor:pointer;font-family:Outfit,sans-serif;">Não mandar para este cliente</button>'
      + '<button type="button" id="_pvFechar" style="width:100%;margin-top:6px;padding:10px;border:none;background:transparent;color:var(--t3,#999);font-size:.8rem;cursor:pointer;font-family:Outfit,sans-serif;">Voltar (decidir depois)</button>'
      + '</div>';
    document.body.appendChild(m);
    document.getElementById('_pvTxt').value = textoPadrao(j);
    var fechar = function () { var e = document.getElementById('_pvModal'); if (e) e.remove(); };

    document.getElementById('_pvZap').onclick = function () {
      var txt = document.getElementById('_pvTxt').value;
      var num = tel.length <= 11 ? '55' + tel : tel;   // DDD+número → põe o 55 do Brasil
      var url = tel ? 'https://wa.me/' + num + '?text=' + encodeURIComponent(txt)
                    : 'https://wa.me/?text=' + encodeURIComponent(txt);
      window.open(url, '_blank');
      j.posVendaFeito = td();          // marcado como feito; some da lista
      DB.sv();
      fechar(); render();
      if (typeof toast === 'function') toast('✓ Pós-venda de ' + primeiroNome(j.cli) + ' marcado como feito');
    };
    document.getElementById('_pvNao').onclick = function () {
      j.posVendaDispensado = td();
      DB.sv();
      fechar(); render();
    };
    document.getElementById('_pvFechar').onclick = fechar;
  };

  // ── Início ───────────────────────────────────────────────────────────
  function ini() {
    try {
      if (typeof DB === 'undefined' || !DB.sv) return setTimeout(ini, 500);
      var svOrig = DB.sv;
      DB.sv = function () { carimbar(); return svOrig.apply(this, arguments); };
      migrar();
      carimbar();
      render();
      setInterval(render, 5000);
    } catch (e) { console.error('posvenda:', e); }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(ini, 900); });
  else setTimeout(ini, 900);

  window._pvPendentes = pendentes; // para diagnóstico
})();
