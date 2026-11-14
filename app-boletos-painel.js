// ══════════════════════════════════════════════════════════════════════
// BOLETOS — PAINEL SIMPLES (v1)
// Tela principal da aba Boletos, feita para entender de cara:
//   1) quanto EU DEVO e quanto ME DEVEM;
//   2) o que está atrasado;
//   3) o que vence em cada mês (calendário de pagamentos);
//   4) quanto devo para cada fornecedor.
// A tela antiga (filtros, compras, seleção em massa) continua em
// "Lista completa", dentro de "Mais ferramentas".
// ══════════════════════════════════════════════════════════════════════
var _bVisao = 'pagar';          // pagar | receber | pagos | avancado
var _bMaisAberto = false;
var _bFornAberto = {};
var _bSoPagar = (function () { try { return localStorage.getItem('b:soPagar') !== '0'; } catch (e) { return true; } })(); // padrão: só contas a pagar

(function () {
  var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  var MES3 = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  var _renderAntigo = window.renderBoletosTab;

  function R(v) { return 'R$ ' + (typeof fm === 'function' ? fm(v || 0) : (+v || 0).toFixed(2)); }
  function E(s) { return typeof escH === 'function' ? escH(s) : String(s == null ? '' : s); }
  function soma(a) { return a.reduce(function (s, x) { return s + (+x.valor || 0); }, 0); }
  function hojeISO() { return typeof td === 'function' ? td() : new Date().toISOString().slice(0, 10); }
  function aberto(b) { return b.status === 'pendente' || b.status === 'vencido'; }
  function nomeDe(b) { return String(b.cli || b.desc || 'Sem nome').trim(); }
  function parcDe(b) {
    if (b.parcAtual && b.parcTotal) {
      var n = /^[A-Za-z]$/.test(String(b.parcAtual)) ? String(b.parcAtual).toUpperCase().charCodeAt(0) - 64 : b.parcAtual;
      return 'parcela ' + n + ' de ' + b.parcTotal;
    }
    var m = String(b.parc || '').match(/^(\d+)\s*\/\s*(\d+)$/);
    return m ? 'parcela ' + m[1] + ' de ' + m[2] : '';
  }
  function diasAte(iso) { return typeof dDiff === 'function' ? dDiff(iso) : Math.round((new Date(iso) - new Date(hojeISO())) / 864e5); }

  function css() {
    if (document.getElementById('bpCSS')) return;
    var st = document.createElement('style'); st.id = 'bpCSS';
    st.textContent =
      '.bp-top{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px}' +
      '.bp-big{border-radius:16px;padding:14px;cursor:pointer;border:2px solid var(--bd);background:var(--s2)}' +
      '.bp-big.on{border-color:var(--gold)}' +
      '.bp-big .l{font-size:.68rem;font-weight:800;letter-spacing:.06em;color:var(--t3)}' +
      '.bp-big .v{font-size:1.25rem;font-weight:900;margin-top:4px}' +
      '.bp-big .s{font-size:.66rem;color:var(--t4);margin-top:2px}' +
      '.bp-red{color:#ff6b6b}.bp-grn{color:#4ade80}' +
      '.bp-alerta{display:flex;gap:10px;align-items:center;background:rgba(255,80,80,.1);border:1px solid rgba(255,80,80,.45);border-radius:14px;padding:12px;margin-bottom:12px}' +
      '.bp-alerta .t{font-weight:800;font-size:.85rem;color:#ff6b6b}.bp-alerta .d{font-size:.7rem;color:var(--t3);margin-top:2px}' +
      '.bp-seg{display:flex;gap:6px;margin:4px 0 14px}' +
      '.bp-seg div{flex:1;text-align:center;padding:10px 4px;border-radius:12px;border:1px solid var(--bd);font-size:.74rem;font-weight:800;color:var(--t3);cursor:pointer}' +
      '.bp-seg div.on{background:var(--gold);color:#111;border-color:var(--gold)}' +
      '.bp-tit{font-size:.7rem;font-weight:800;letter-spacing:.07em;color:var(--t3);margin:18px 2px 8px;text-transform:uppercase}' +
      '.bp-mes{background:var(--s2);border:1px solid var(--bd);border-radius:16px;margin-bottom:12px;overflow:hidden}' +
      '.bp-mes-h{display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-bottom:1px solid var(--bd)}' +
      '.bp-mes-h .m{font-weight:900;font-size:.95rem;color:var(--tx)}.bp-mes-h .q{font-size:.66rem;color:var(--t4)}' +
      '.bp-mes-h .tot{font-weight:900;font-size:1rem}' +
      '.bp-it{display:flex;align-items:center;gap:12px;padding:11px 14px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer}' +
      '.bp-it:last-child{border-bottom:0}' +
      '.bp-dia{width:44px;flex-shrink:0;text-align:center;border-radius:10px;padding:5px 0;background:var(--s1,#111);border:1px solid var(--bd)}' +
      '.bp-dia b{display:block;font-size:1.05rem;line-height:1;color:var(--tx)}.bp-dia span{font-size:.55rem;font-weight:800;color:var(--t4)}' +
      '.bp-dia.atr{border-color:#ff6b6b}.bp-dia.atr b{color:#ff6b6b}.bp-dia.prox{border-color:#e8b847}.bp-dia.prox b{color:#e8b847}' +
      '.bp-inf{flex:1;min-width:0}.bp-inf .n{font-size:.82rem;font-weight:800;color:var(--tx);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.bp-inf .x{font-size:.66rem;color:var(--t4);margin-top:2px}' +
      '.bp-val{font-weight:900;font-size:.88rem;white-space:nowrap;text-align:right}.bp-val small{display:block;font-size:.6rem;font-weight:700}' +
      '.bp-forn{background:var(--s2);border:1px solid var(--bd);border-radius:14px;margin-bottom:8px}' +
      '.bp-forn-h{display:flex;justify-content:space-between;gap:10px;padding:12px 14px;cursor:pointer}' +
      '.bp-forn-h .n{font-weight:800;font-size:.82rem;color:var(--tx)}.bp-forn-h .x{font-size:.66rem;color:var(--t4);margin-top:2px}' +
      '.bp-bar{height:6px;border-radius:4px;background:rgba(255,255,255,.08);margin:0 14px 12px;overflow:hidden}.bp-bar i{display:block;height:100%;background:#4ade80}' +
      '.bp-acoes{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:6px 0 4px}' +
      '.bp-acoes button{margin:0;font-size:.76rem;padding:12px 8px}' +
      '.bp-mais{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}.bp-mais button{margin:0;font-size:.72rem;padding:10px 6px}' +
      '.bp-vazio{text-align:center;color:var(--t4);font-size:.8rem;padding:26px 10px;background:var(--s2);border-radius:14px;border:1px dashed var(--bd)}';
    document.head.appendChild(st);
  }

  function item(b, hoje) {
    var d = b.venc ? diasAte(b.venc) : null, cls = '', aviso = '';
    var pago = b.status === 'pago';
    if (!pago && d !== null) {
      if (d < 0) { cls = 'atr'; aviso = '<small class="bp-red">' + Math.abs(d) + ' dia(s) atrasado</small>'; }
      else if (d === 0) { cls = 'atr'; aviso = '<small class="bp-red">vence hoje</small>'; }
      else if (d <= 7) { cls = 'prox'; aviso = '<small style="color:#e8b847">em ' + d + ' dia(s)</small>'; }
    }
    if (pago) aviso = '<small class="bp-grn">pago' + (b.dtPag ? ' ' + (typeof fd === 'function' ? fd(String(b.dtPag).slice(0, 10)) : b.dtPag) : '') + '</small>';
    var dt = pago ? String(b.dtPag || b.venc || '').slice(0, 10) : (b.venc || '');
    var dia = dt ? dt.slice(8, 10) : '--', mes = dt ? MES3[+dt.slice(5, 7) - 1] : '';
    var extra = [parcDe(b), b.desc && b.desc !== b.cli ? b.desc : ''].filter(Boolean).join(' · ');
    var cor = b.tipo === 'receber' ? 'bp-grn' : 'bp-red';
    return '<div class="bp-it" data-openboleto="' + b.id + '">' +
      '<div class="bp-dia ' + cls + '"><b>' + dia + '</b><span>' + mes + '</span></div>' +
      '<div class="bp-inf"><div class="n">' + E(nomeDe(b)) + '</div><div class="x">' + E(extra || ' ') + '</div></div>' +
      '<div class="bp-val ' + (pago ? '' : cor) + '">' + R(b.valor) + aviso + '</div></div>';
  }

  function blocoMes(titulo, sub, lista, corTot, hoje) {
    return '<div class="bp-mes"><div class="bp-mes-h"><div><div class="m">' + titulo + '</div><div class="q">' + sub + '</div></div>' +
      '<div class="tot ' + corTot + '">' + R(soma(lista)) + '</div></div>' + lista.map(function (b) { return item(b, hoje); }).join('') + '</div>';
  }

  function porMes(lista, campo) {
    var g = {}, ordem = [];
    lista.forEach(function (b) {
      var k = String(b[campo] || b.venc || '').slice(0, 7) || 'sem data';
      if (!g[k]) { g[k] = []; ordem.push(k); }
      g[k].push(b);
    });
    return ordem.map(function (k) { return { k: k, lista: g[k] }; });
  }
  function nomeMes(k) { if (!/^\d{4}-\d{2}$/.test(k)) return 'Sem data'; return MESES[+k.slice(5) - 1] + ' de ' + k.slice(0, 4); }

  function calendario(lista, tipo, hoje) {
    var cor = tipo === 'receber' ? 'bp-grn' : 'bp-red';
    lista = lista.slice().sort(function (a, b) { return String(a.venc || '9').localeCompare(String(b.venc || '9')); });
    var atr = lista.filter(function (b) { return b.venc && b.venc < hoje; });
    var resto = lista.filter(function (b) { return !(b.venc && b.venc < hoje); });
    var h = '';
    if (atr.length) h += blocoMes('🔴 Atrasados', atr.length + ' boleto(s) — ' + (tipo === 'receber' ? 'cobrar' : 'pagar primeiro'), atr, 'bp-red', hoje);
    porMes(resto, 'venc').forEach(function (g) {
      var k = g.k, atual = k === hoje.slice(0, 7);
      h += blocoMes((atual ? '📅 ' : '') + nomeMes(k) + (atual ? ' (este mês)' : ''), g.lista.length + ' boleto(s)', g.lista, cor, hoje);
    });
    return h;
  }

  function porPessoa(lista, todos, tipo) {
    var g = {};
    lista.forEach(function (b) { var n = nomeDe(b); (g[n] = g[n] || []).push(b); });
    var nomes = Object.keys(g).sort(function (a, b) { return soma(g[b]) - soma(g[a]); });
    return nomes.map(function (n) {
      var ls = g[n].slice().sort(function (a, b) { return String(a.venc).localeCompare(String(b.venc)); });
      var pagos = todos.filter(function (b) { return b.tipo === tipo && b.status === 'pago' && nomeDe(b) === n; });
      var totalGeral = soma(ls) + soma(pagos), pct = totalGeral ? Math.round(soma(pagos) / totalGeral * 100) : 0;
      var ult = ls[ls.length - 1], aberto_ = !!_bFornAberto[n];
      var atr = ls.filter(function (b) { return b.venc && b.venc < hojeISO(); }).length;
      return '<div class="bp-forn"><div class="bp-forn-h" onclick="bpToggleForn(' + JSON.stringify(n).replace(/"/g, '&quot;') + ')">' +
        '<div style="min-width:0"><div class="n">' + E(n) + '</div><div class="x">' + ls.length + ' boleto(s)' + (atr ? ' · <span class="bp-red">' + atr + ' atrasado(s)</span>' : '') +
        (ult && ult.venc ? ' · termina em ' + MES3[+ult.venc.slice(5, 7) - 1].toLowerCase() + '/' + ult.venc.slice(2, 4) : '') + '</div></div>' +
        '<div style="text-align:right"><div class="bp-val ' + (tipo === 'receber' ? 'bp-grn' : 'bp-red') + '">' + R(soma(ls)) + '</div><div style="font-size:.6rem;color:var(--t4)">' + (aberto_ ? 'fechar ▲' : 'ver ▼') + '</div></div></div>' +
        (pagos.length ? '<div style="font-size:.6rem;color:var(--t4);margin:-6px 14px 4px">' + (tipo === 'receber' ? 'recebido' : 'já pago') + ': ' + R(soma(pagos)) + ' (' + pct + '%)</div><div class="bp-bar"><i style="width:' + pct + '%"></i></div>' : '') +
        (aberto_ ? '<div style="border-top:1px solid var(--bd)">' + ls.map(function (b) { return item(b, hojeISO()); }).join('') + '</div>' : '') +
        '</div>';
    }).join('');
  }

  window.bpVisao = function (v) { _bVisao = v; if (v !== 'avancado' && typeof _bModoSelecao !== 'undefined' && _bModoSelecao) _bModoSelecao = false; _bRerender(); };
  window.bpToggleForn = function (n) { _bFornAberto[n] = !_bFornAberto[n]; _bRerender(); };
  window.bpSoPagar = function () { _bSoPagar = !_bSoPagar; try { localStorage.setItem('b:soPagar', _bSoPagar ? '1' : '0'); } catch (e) {} if (_bSoPagar && _bVisao === 'receber') _bVisao = 'pagar'; _bRerender(); };
  window.bpToggleMais = function () { _bMaisAberto = !_bMaisAberto; _bRerender(); };

  window.renderBoletosTab = function () {
    if (_bVisao === 'avancado' || (typeof _bModoSelecao !== 'undefined' && _bModoSelecao)) {
      return '<button class="btn btn-o" style="width:100%;margin:0 0 12px;" onclick="bpVisao(\'pagar\')">← Voltar ao painel simples</button>' + _renderAntigo();
    }
    css();
    if (typeof bAutoStatus === 'function') bAutoStatus();
    var hoje = hojeISO(), todos = (DB.b || []).filter(function (b) { return b && b.status !== 'cancelado'; });
    var busca = String(typeof _bBusca !== 'undefined' && _bBusca || '').toLowerCase().trim();
    var filtra = function (b) {
      if (!busca) return true;
      return [b.cli, b.desc, b.titular, b.nDoc, typeof fm === 'function' ? fm(b.valor || 0) : b.valor].join(' ').toLowerCase().indexOf(busca) >= 0;
    };
    var pagar = todos.filter(function (b) { return b.tipo === 'pagar' && aberto(b); });
    var receber = todos.filter(function (b) { return b.tipo === 'receber' && aberto(b); });
    var atrP = pagar.filter(function (b) { return b.venc && b.venc < hoje; });
    var atrR = receber.filter(function (b) { return b.venc && b.venc < hoje; });
    var mesAt = hoje.slice(0, 7), doMes = pagar.filter(function (b) { return String(b.venc || '').slice(0, 7) === mesAt && b.venc >= hoje; });

    if (_bSoPagar && _bVisao === 'receber') _bVisao = 'pagar';
    var pagoMes = todos.filter(function (b) { return b.tipo === 'pagar' && b.status === 'pago' && String(b.dtPag || '').slice(0, 7) === mesAt; });
    var h = _bSoPagar ? '<div class="bp-top">' +
      '<div class="bp-big' + (_bVisao === 'pagar' ? ' on' : '') + '" onclick="bpVisao(\'pagar\')"><div class="l">📤 DEVO AOS FORNECEDORES</div><div class="v bp-red">' + R(soma(pagar)) + '</div><div class="s">' + pagar.length + ' boleto(s) para pagar</div></div>' +
      '<div class="bp-big' + (_bVisao === 'pagos' ? ' on' : '') + '" onclick="bpVisao(\'pagos\')"><div class="l">✅ PAGUEI ESTE MÊS</div><div class="v bp-grn">' + R(soma(pagoMes)) + '</div><div class="s">' + pagoMes.length + ' boleto(s) pago(s)</div></div>' +
      '</div>' : '<div class="bp-top">' +
      '<div class="bp-big' + (_bVisao === 'pagar' ? ' on' : '') + '" onclick="bpVisao(\'pagar\')"><div class="l">📤 EU DEVO</div><div class="v bp-red">' + R(soma(pagar)) + '</div><div class="s">' + pagar.length + ' boleto(s) a pagar</div></div>' +
      '<div class="bp-big' + (_bVisao === 'receber' ? ' on' : '') + '" onclick="bpVisao(\'receber\')"><div class="l">📥 ME DEVEM</div><div class="v bp-grn">' + R(soma(receber)) + '</div><div class="s">' + receber.length + ' boleto(s) a receber</div></div>' +
      '</div>';

    if (atrP.length) h += '<div class="bp-alerta" onclick="bpVisao(\'pagar\')"><div style="font-size:1.4rem">🔴</div><div><div class="t">Atrasado: ' + R(soma(atrP)) + '</div><div class="d">' + atrP.length + ' boleto(s) a pagar já venceram. Se já pagou, abra o boleto e toque em "Marcar como pago".</div></div></div>';
    if (doMes.length) h += '<div class="bp-alerta" style="background:rgba(232,184,71,.08);border-color:rgba(232,184,71,.45)"><div style="font-size:1.4rem">📅</div><div><div class="t" style="color:#e8b847">Ainda vence este mês: ' + R(soma(doMes)) + '</div><div class="d">' + doMes.length + ' boleto(s) até o fim de ' + MESES[+mesAt.slice(5) - 1].toLowerCase() + '.</div></div></div>';
    if (atrR.length && !_bSoPagar) h += '<div class="bp-alerta" style="background:rgba(74,222,128,.06);border-color:rgba(74,222,128,.4)" onclick="bpVisao(\'receber\')"><div style="font-size:1.4rem">💬</div><div><div class="t" style="color:#4ade80">Clientes atrasados: ' + R(soma(atrR)) + '</div><div class="d">' + atrR.length + ' boleto(s) a receber já venceram — cobrar.</div></div></div>';

    h += '<div class="bp-acoes"><button class="btn btn-g" onclick="openNovoBoleto()">+ Lançar boleto</button><button class="btn btn-o" onclick="bfAbrir()">📑 Conferir fornecedor</button></div>';
    h += '<input class="b-search" id="bSearchIn" type="text" style="width:100%;box-sizing:border-box;margin:8px 0 0" placeholder="🔍 Buscar fornecedor, cliente, valor..." value="' + E(busca) + '" oninput="_bBusca=this.value;clearTimeout(window._bpT);window._bpT=setTimeout(function(){_bRerender();var i=document.getElementById(\'bSearchIn\');if(i){i.focus();i.setSelectionRange(i.value.length,i.value.length);}},350)">';

    h += '<div class="bp-seg" style="margin-top:12px">' +
      '<div class="' + (_bVisao === 'pagar' ? 'on' : '') + '" onclick="bpVisao(\'pagar\')">📤 A pagar</div>' +
      (_bSoPagar ? '' : '<div class="' + (_bVisao === 'receber' ? 'on' : '') + '" onclick="bpVisao(\'receber\')">📥 A receber</div>') +
      '<div class="' + (_bVisao === 'pagos' ? 'on' : '') + '" onclick="bpVisao(\'pagos\')">✅ Pagos</div></div>';

    if (_bVisao === 'pagos') {
      var pagos = todos.filter(function (b) { return b.status === 'pago' && (!_bSoPagar || b.tipo === 'pagar') && filtra(b); })
        .sort(function (a, b) { return String(b.dtPag || b.venc || '').localeCompare(String(a.dtPag || a.venc || '')); }).slice(0, 120);
      if (!pagos.length) h += '<div class="bp-vazio">Nenhum boleto pago ainda.</div>';
      porMes(pagos, 'dtPag').forEach(function (g) {
        var sai = g.lista.filter(function (b) { return b.tipo === 'pagar'; }), ent = g.lista.filter(function (b) { return b.tipo === 'receber'; });
        h += blocoMes(nomeMes(g.k), 'paguei ' + R(soma(sai)) + (ent.length ? ' · recebi ' + R(soma(ent)) : ''), g.lista, '', hoje);
      });
    } else {
      var tipo = _bVisao === 'receber' ? 'receber' : 'pagar';
      var lista = (tipo === 'receber' ? receber : pagar).filter(filtra);
      if (!lista.length) h += '<div class="bp-vazio">' + (busca ? 'Nada encontrado para "' + E(busca) + '".' : tipo === 'receber' ? 'Nenhum boleto a receber em aberto.' : 'Nenhuma conta a pagar em aberto. 🎉<br><br>Se tem boletos de fornecedor, lance com <b>+ Lançar boleto</b> ou use <b>Conferir fornecedor</b> com a listagem em PDF.') + '</div>';
      else {
        h += '<div class="bp-tit">' + (tipo === 'receber' ? '👥 Quem me deve' : '🏭 Quanto devo a cada fornecedor') + '</div>';
        h += porPessoa(lista, todos, tipo);
        h += '<div class="bp-tit">🗓️ ' + (tipo === 'receber' ? 'Quando vou receber' : 'Quando tenho que pagar') + ' — mês a mês</div>';
        h += calendario(lista, tipo, hoje);
      }
    }

    h += '<div style="margin:18px 0 6px"><button class="btn btn-o" style="width:100%;margin:0" onclick="bpToggleMais()">⚙️ Mais ferramentas ' + (_bMaisAberto ? '▲' : '▼') + '</button>';
    if (_bMaisAberto) h += '<div class="bp-mais">' +
      '<button class="btn btn-o" onclick="bAbrirSeletorPDF()">📥 Importar PDFs</button>' +
      '<button class="btn btn-o" onclick="bAbrirSeletorComprovante()">🧾 Comprovante</button>' +
      '<button class="btn btn-o" onclick="bcNovaCompra()">🛒 Nova compra</button>' +
      '<button class="btn btn-o" onclick="_bFiltroAtual=\'compras\';bpVisao(\'avancado\')">🛒 Compras</button>' +
      '<button class="btn btn-o" onclick="bAbrirEstrategiaMd()">🤖 Estratégia</button>' +
      '<button class="btn btn-o" onclick="estAbrirPainel()">📦 Estoque</button>' +
      '<button class="btn btn-o" onclick="_bFiltroAtual=\'todos\';bpVisao(\'avancado\')">📋 Lista completa</button>' +
      '<button class="btn btn-o" onclick="bExportarBackupJSON()">💾 Backup</button>' +
      '<button class="btn btn-o" style="grid-column:1/-1" onclick="bpSoPagar()">' + (_bSoPagar ? '📥 Mostrar também A receber' : '📤 Mostrar só contas a pagar') + '</button></div>';
    h += '</div>';
    return h;
  };
})();

// No modo "só contas a pagar", o formulário de boleto novo já abre em A PAGAR
(function () {
  var orig = window.openNovoBoleto;
  if (typeof orig !== 'function') return;
  window.openNovoBoleto = function () {
    var r = orig.apply(this, arguments);
    try { if (_bSoPagar && typeof bSetTipo === 'function') { bSetTipo('pagar'); var c = document.getElementById('bCat'); if (c && B_CAT && B_CAT.fornecedor) c.value = 'fornecedor'; } } catch (e) {}
    return r;
  };
})();
