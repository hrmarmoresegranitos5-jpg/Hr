// ═══════════════════════════════════════════════════════════════════════════
// BOLETOS › COMPRAS — cada compra parcelada vira UM cartão (2 de 4 pagas, falta
// R$ X, próximo vencimento), em vez de 4 boletos soltos misturados.
//
// Não muda o formato dos boletos: só acrescenta campos opcionais
//   compraId   — liga parcelas da mesma compra (gerado na importação de PDF,
//                na "Nova compra parcelada" ou em "Juntar em compra")
//   compraNome — nome dado pelo usuário (opcional)
// Boletos antigos continuam funcionando: são agrupados automaticamente por
//   1) compraId  2) fornecedor + nº-base do documento (cargaId)  3) fornecedor
//   + "i/N" digitado na parcela (separa compras repetidas do mesmo fornecedor).
// Carrega DEPOIS de app-boletos.js.
// ═══════════════════════════════════════════════════════════════════════════
var _bcAberta = {};          // { [key]: true } cartões abertos
var _bcQuitadasAberto = false;
var _bcUlt = [];             // grupos da última renderização (índice usado nos onclick)
var _bCompraIdPdf = '';      // compraId compartilhado entre a 1ª parcela do formulário e as "outras parcelas do PDF"

function _bcNorm(s) { return (typeof _bNormalizaNome === 'function') ? _bNormalizaNome(s) : String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, ''); }
function _bcSoDig(s) { return String(s || '').replace(/\D/g, ''); }
function _bcNovoId() { return 'cp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function _bcMaisFreq(arr, campo) {
  var c = {};
  arr.forEach(function (x) { var v = x[campo]; if (v) c[v] = (c[v] || 0) + 1; });
  var k = Object.keys(c).sort(function (a, b) { return c[b] - c[a]; });
  return k.length ? k[0] : '';
}

// Agrupa boletos "a pagar" em compras. Devolve { grupos:[], avulsos:[] }
function _bcGrupos(lista) {
  var mapa = {}, ordem = [], avulsos = [], legado = {};
  lista.forEach(function (b) {
    var key = null, auto = false;
    if (b.compraId) key = 'c:' + b.compraId;
    else if (b.cargaId) { key = 'g:' + (_bcSoDig(b.cnpjBenef) || _bcNorm(b.cli)) + '#' + b.cargaId; auto = true; }
    if (key) {
      if (!mapa[key]) { mapa[key] = { key: key, itens: [], auto: auto, explicito: !!b.compraId }; ordem.push(key); }
      mapa[key].itens.push(b);
      return;
    }
    // legado: "2/4" digitado na mão
    var m = String(b.parc || '').match(/^\s*(\d{1,2})\s*\/\s*(\d{1,2})\s*$/);
    if (m && +m[2] >= 2 && _bcNorm(b.cli)) {
      var base = _bcNorm(b.cli) + '/' + m[2];
      (legado[base] = legado[base] || []).push({ b: b, n: +m[1] });
    } else avulsos.push(b);
  });
  // separa compras repetidas do mesmo fornecedor: cada "balde" aceita 1 de cada nº de parcela
  Object.keys(legado).forEach(function (base) {
    var arr = legado[base].sort(function (a, c) { return (a.b.venc || '').localeCompare(c.b.venc || ''); });
    var baldes = [];
    arr.forEach(function (it) {
      var bd = baldes.find(function (x) { return !x.nums[it.n]; });
      if (!bd) { bd = { nums: {}, itens: [] }; baldes.push(bd); }
      bd.nums[it.n] = true; bd.itens.push(it.b);
    });
    baldes.forEach(function (bd, i) {
      if (bd.itens.length < 2) { avulsos.push(bd.itens[0]); return; } // 1 só parcela: não vale cartão
      var key = 'p:' + base + '#' + i;
      mapa[key] = { key: key, itens: bd.itens, auto: true, explicito: false };
      ordem.push(key);
    });
  });

  var hoje = td();
  var grupos = ordem.map(function (k) {
    var g = mapa[k], it = g.itens;
    it.sort(function (a, c) {
      var pa = parseInt(a.parcAtual, 10), pc = parseInt(c.parcAtual, 10);
      if (!isNaN(pa) && !isNaN(pc) && pa !== pc) return pa - pc;
      return (a.venc || '').localeCompare(c.venc || '');
    });
    var ativos = it.filter(function (x) { return x.status !== 'cancelado'; });
    g.pagas = ativos.filter(function (x) { return x.status === 'pago'; });
    g.pend = ativos.filter(function (x) { return x.status !== 'pago'; });
    g.venc = ativos.filter(function (x) { return x.status === 'vencido' || (x.status === 'pendente' && x.venc && x.venc < hoje); });
    g.faltaPagar = g.pend.reduce(function (s, x) { return s + (x.valor || 0); }, 0);
    g.valorTotal = ativos.reduce(function (s, x) { return s + (x.valor || 0); }, 0);
    var pt = 0; ativos.forEach(function (x) { pt = Math.max(pt, +x.parcTotal || 0, (String(x.parc || '').match(/\/(\d+)/) || [0, 0])[1] * 1); });
    g.total = Math.max(pt, ativos.length);
    g.proxItem = g.pend.slice().sort(function (a, c) { return (a.venc || '9999').localeCompare(c.venc || '9999'); })[0] || null;
    g.proxVenc = g.proxItem ? g.proxItem.venc : '';
    g.fornecedor = _bcMaisFreq(it, 'cli') || '(fornecedor a definir)';
    g.nome = _bcMaisFreq(it, 'compraNome') || '';
    g.titular = _bcMaisFreq(it, 'titular');
    g.desc = (it[0].desc || '').replace(/\s*[\(\-–—]?\s*\d{1,2}\s*\/\s*\d{1,2}\s*\)?\s*$/, '').trim();
    return g;
  }).filter(function (g) { return g.itens.some(function (x) { return x.status !== 'cancelado'; }); });
  return { grupos: grupos, avulsos: avulsos };
}

// ── Tela principal (substitui a aba "Cargas") ────────────────────────────────
function _bListaCompras() {
  var hoje = td();
  var busca = (typeof _bBusca !== 'undefined' ? _bBusca : '').toLowerCase();
  var lista = (DB.b || []).filter(function (x) { return x.tipo === 'pagar'; });
  if (busca) {
    lista = lista.filter(function (x) {
      return [x.cli, x.titular, x.desc, x.cat, x.nDoc, x.compraNome, fm(x.valor || 0)].join(' ').toLowerCase().indexOf(busca) >= 0;
    });
  }
  var R = _bcGrupos(lista);
  var grupos = R.grupos, avulsos = R.avulsos;
  _bcUlt = grupos;

  if (!grupos.length && !avulsos.length) return '<div class="b-empty">Nenhuma compra ou boleto a pagar ainda.<br><span style="font-size:.65rem;color:var(--t4);">Use <b>🛒 Nova compra</b> ou importe o PDF do carnê.</span></div>';

  var andamento = grupos.filter(function (g) { return g.pend.length; });
  var quitadas = grupos.filter(function (g) { return !g.pend.length; });
  andamento.sort(function (a, c) {
    if (!!a.venc.length !== !!c.venc.length) return a.venc.length ? -1 : 1;
    return (a.proxVenc || '9999').localeCompare(c.proxVenc || '9999');
  });

  var h = '';

  // ── Resumo + fila "pagar primeiro" ──
  var pendTodos = (DB.b || []).filter(function (x) { return x.tipo === 'pagar' && (x.status === 'pendente' || x.status === 'vencido'); });
  var em30 = pendTodos.filter(function (x) { return x.venc && dDiff(x.venc) <= 30; });
  var soma = function (a) { return a.reduce(function (s, x) { return s + (x.valor || 0); }, 0); };
  h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">';
  h += '<div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;"><div style="font-size:.58rem;letter-spacing:1px;text-transform:uppercase;color:var(--t4);">Falta pagar (tudo)</div><div style="font-size:.95rem;font-weight:800;color:#ff5555;">R$ ' + fm(soma(pendTodos)) + '</div><div style="font-size:.6rem;color:var(--t4);">' + pendTodos.length + ' parcela(s) em ' + andamento.length + ' compra(s)</div></div>';
  h += '<div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;"><div style="font-size:.58rem;letter-spacing:1px;text-transform:uppercase;color:var(--t4);">Vence em 30 dias</div><div style="font-size:.95rem;font-weight:800;color:var(--gold2);">R$ ' + fm(soma(em30)) + '</div><div style="font-size:.6rem;color:var(--t4);">' + em30.length + ' parcela(s)</div></div>';
  h += '</div>';

  var fila = pendTodos.slice().sort(function (a, c) { return (a.venc || '9999').localeCompare(c.venc || '9999'); }).slice(0, 5);
  if (fila.length && !busca) {
    h += '<div style="background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:10px 12px;margin-bottom:12px;">';
    h += '<div style="font-size:.6rem;letter-spacing:1px;text-transform:uppercase;font-weight:800;color:var(--gold);margin-bottom:6px;">⏱ Pagar primeiro</div>';
    fila.forEach(function (x) {
      var d = x.venc ? dDiff(x.venc) : null;
      var cor = d !== null && d < 0 ? '#ff5555' : (d !== null && d <= 3 ? '#e8b847' : 'var(--t3)');
      var dtxt = d === null ? '' : (d < 0 ? Math.abs(d) + 'd atrasado' : d === 0 ? 'hoje' : d + 'd');
      h += '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:1px solid #0c0c10;">';
      h += '<div style="flex:1;min-width:0;"><div style="font-size:.74rem;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escH(x.cli || x.desc || '—') + (x.parc ? ' <span class="b-parc-tag">' + escH(x.parc) + '</span>' : '') + '</div>';
      h += '<div style="font-size:.62rem;color:' + cor + ';">' + (x.venc ? fd(x.venc) : '—') + (dtxt ? ' · ' + dtxt : '') + '</div></div>';
      h += '<div style="font-size:.76rem;font-weight:800;color:#ff5555;white-space:nowrap;">R$ ' + fm(x.valor || 0) + '</div>';
      h += '<button class="btn btn-o" style="width:auto;flex:0 0 auto;margin:0;font-size:.62rem;padding:7px 10px;white-space:nowrap;" onclick="_bcPagarId(' + JSON.stringify(x.id) + ')">✅ Pagar</button>';
      h += '</div>';
    });
    h += '</div>';
  }

  // ── Cartões ──
  function cartao(g) {
    var gi = grupos.indexOf(g);
    var aberto = !!_bcAberta[g.key] || (!!busca && g.itens.length);
    var nPag = g.pagas.length, pct = g.total ? Math.round(nPag / g.total * 100) : 0;
    var temVenc = g.venc.length > 0;
    var cor = temVenc ? '#ff5555' : (g.pend.length ? 'var(--gold)' : 'var(--grn)');
    var d = g.proxVenc ? dDiff(g.proxVenc) : null;
    var proxTxt = '';
    if (g.proxItem) {
      var cd = d !== null && d < 0 ? '#ff5555' : (d !== null && d <= 3 ? '#e8b847' : 'var(--t3)');
      proxTxt = '<span style="color:' + cd + ';">próx. ' + (g.proxVenc ? fd(g.proxVenc) : '—') + (d !== null ? (d < 0 ? ' · ' + Math.abs(d) + 'd atrasado' : d === 0 ? ' · hoje' : ' · em ' + d + 'd') : '') + ' · R$ ' + fm(g.proxItem.valor || 0) + '</span>';
    }
    var h2 = '<div style="background:var(--s2);border:1px solid ' + (temVenc ? 'rgba(255,85,85,.45)' : 'var(--bd)') + ';border-radius:12px;padding:12px;margin-bottom:10px;">';
    h2 += '<div style="display:flex;justify-content:space-between;gap:8px;cursor:pointer;" onclick="_bcToggle(' + gi + ')">';
    h2 += '<div style="min-width:0;flex:1;"><div style="font-size:.8rem;font-weight:800;color:var(--tx);">' + escH(g.nome || g.fornecedor) + '</div>';
    var sub = (g.nome ? g.fornecedor : '') + (g.desc ? (g.nome ? ' · ' : '') + g.desc : '');
    if (sub) h2 += '<div style="font-size:.64rem;color:var(--t3);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + escH(sub) + '</div>';
    if (g.titular) h2 += '<div style="font-size:.62rem;color:var(--gold);">👤 ' + escH(g.titular) + '</div>';
    h2 += '</div><div style="text-align:right;flex-shrink:0;"><div style="font-size:.58rem;color:var(--t4);">falta pagar</div><div style="font-size:.86rem;font-weight:800;color:' + (g.faltaPagar > 0 ? '#ff5555' : 'var(--grn)') + ';">R$ ' + fm(g.faltaPagar) + '</div></div></div>';
    h2 += '<div style="margin-top:9px;height:7px;background:var(--s3);border-radius:6px;overflow:hidden;"><div style="height:100%;width:' + pct + '%;background:' + (g.pend.length ? 'var(--gold)' : 'var(--grn)') + ';"></div></div>';
    h2 += '<div style="display:flex;justify-content:space-between;gap:8px;margin-top:6px;font-size:.64rem;color:var(--t3);flex-wrap:wrap;">';
    h2 += '<span><b style="color:' + cor + ';">' + nPag + ' de ' + g.total + ' pagas</b>' + (g.itens.length < g.total ? ' · ' + (g.total - g.itens.length) + ' não lançada(s)' : '') + (temVenc ? ' · <b style="color:#ff5555;">' + g.venc.length + ' vencida(s)</b>' : '') + '</span>' + proxTxt + '</div>';
    h2 += '<div style="display:flex;gap:6px;margin-top:9px;flex-wrap:wrap;">';
    h2 += '<button class="btn btn-o" style="width:auto;flex:1;margin:0;font-size:.66rem;padding:9px 10px;" onclick="_bcToggle(' + gi + ')">' + (aberto ? '▴ Ocultar parcelas' : '▾ Ver parcelas') + '</button>';
    if (g.proxItem) h2 += '<button class="btn btn-g" style="width:auto;flex:1;margin:0;font-size:.66rem;padding:9px 10px;" onclick="_bcPagarProxima(' + gi + ')">✅ Pagar próxima</button>';
    h2 += '</div>';
    if (aberto) {
      h2 += '<div style="margin-top:8px;">';
      g.itens.forEach(function (x) { h2 += _bRow(x, hoje); });
      h2 += '<div style="display:flex;gap:12px;margin-top:8px;">';
      h2 += '<a onclick="_bcRenomear(' + gi + ')" style="font-size:.64rem;color:var(--t4);text-decoration:underline;cursor:pointer;">✏️ Nomear compra</a>';
      if (g.explicito) h2 += '<a onclick="_bcDesfazer(' + gi + ')" style="font-size:.64rem;color:var(--t4);text-decoration:underline;cursor:pointer;">↩ Desfazer grupo</a>';
      h2 += '</div></div>';
    }
    return h2 + '</div>';
  }

  var comVenc = andamento.filter(function (g) { return g.venc.length; });
  var semVenc = andamento.filter(function (g) { return !g.venc.length; });
  if (comVenc.length) { h += _bSecHeader('🔴', 'Compras com parcela vencida', comVenc.length, comVenc.reduce(function (s, g) { return s + g.faltaPagar; }, 0), '#ff5555'); comVenc.forEach(function (g) { h += cartao(g); }); }
  if (semVenc.length) { h += _bSecHeader('🟡', 'Compras em andamento', semVenc.length, semVenc.reduce(function (s, g) { return s + g.faltaPagar; }, 0), 'var(--gold)'); semVenc.forEach(function (g) { h += cartao(g); }); }

  if (avulsos.length) {
    avulsos.sort(function (a, c) { return (a.venc || '').localeCompare(c.venc || ''); });
    var pendAv = avulsos.filter(function (x) { return x.status !== 'pago' && x.status !== 'cancelado'; });
    var pagAv = avulsos.filter(function (x) { return x.status === 'pago'; });
    if (pendAv.length) { h += _bSecHeader('📄', 'Boletos avulsos (sem compra)', pendAv.length, soma(pendAv), 'var(--t3)'); pendAv.forEach(function (x) { h += _bRow(x, hoje); }); h += '<div style="font-size:.62rem;color:var(--t4);padding:6px 2px;">Dica: ☑ Selecionar → marque as parcelas → <b>🧩 Juntar em compra</b>.</div>'; }
  }
  if (quitadas.length) {
    h += '<div onclick="_bcQuitadasAberto=!_bcQuitadasAberto;_bRerender();" style="padding:14px 2px 6px;font-size:.62rem;letter-spacing:.07em;text-transform:uppercase;font-weight:800;color:var(--grn);cursor:pointer;">🟢 Compras quitadas (' + quitadas.length + ') ' + (_bcQuitadasAberto ? '▴' : '▾') + '</div>';
    if (_bcQuitadasAberto) quitadas.forEach(function (g) { h += cartao(g); });
  }
  return h;
}

// ── Ações ────────────────────────────────────────────────────────────────────
function _bcToggle(i) {
  var g = _bcUlt[i]; if (!g) return;
  _bcAberta[g.key] = !_bcAberta[g.key];
  _bRerender();
}
function _bcPagarId(id) {
  var b = (DB.b || []).find(function (x) { return x.id === id; }); if (!b) return;
  if (!confirm('Marcar como pago?\n\n' + (b.cli || b.desc || '') + (b.parc ? ' (' + b.parc + ')' : '') + '\nR$ ' + fm(b.valor || 0))) return;
  bMarcarPago(id);
}
function _bcPagarProxima(i) {
  var g = _bcUlt[i]; if (!g || !g.proxItem) return;
  _bcPagarId(g.proxItem.id);
}
function _bcRenomear(i) {
  var g = _bcUlt[i]; if (!g) return;
  var n = prompt('Nome da compra (ex.: Chapas Itaúnas — outubro):', g.nome || g.fornecedor);
  if (n === null) return;
  n = n.trim();
  var id = g.itens[0].compraId || _bcNovoId();
  g.itens.forEach(function (x) { x.compraId = id; x.compraNome = n; });
  DB.sv(); toast('✅ Compra nomeada'); _bRerender();
}
function _bcDesfazer(i) {
  var g = _bcUlt[i]; if (!g || !g.explicito) return;
  if (!confirm('Desfazer o grupo? As ' + g.itens.length + ' parcelas voltam a ser boletos avulsos.')) return;
  g.itens.forEach(function (x) { delete x.compraId; delete x.compraNome; });
  DB.sv(); toast('↩ Grupo desfeito'); _bRerender();
}
function bcJuntarSelecionados() {
  var ids = Object.keys(_bSelecionados);
  var sel = (DB.b || []).filter(function (x) { return _bSelecionados[x.id]; });
  if (sel.length < 2) { toast('Selecione pelo menos 2 parcelas'); return; }
  if (sel.some(function (x) { return x.tipo !== 'pagar'; })) { toast('Só boletos "a pagar" podem formar uma compra'); return; }
  var padrao = _bcMaisFreq(sel, 'cli') || '';
  var n = prompt('Nome da compra (' + sel.length + ' parcelas):', padrao);
  if (n === null) return;
  var id = _bcNovoId();
  sel.sort(function (a, c) { return (a.venc || '').localeCompare(c.venc || ''); });
  sel.forEach(function (x, i) {
    x.compraId = id; x.compraNome = n.trim();
    if (!x.parc) { x.parc = (i + 1) + '/' + sel.length; }
  });
  DB.sv(); _bSelecionados = {}; _bModoSelecao = false;
  toast('🧩 ' + sel.length + ' parcelas juntadas em uma compra'); _bFiltroAtual = 'compras'; _bRerender();
}

// ── Nova compra parcelada: cria as N parcelas de uma vez ────────────────────
function _bcAddMes(iso, n) {
  var p = String(iso).split('-'); var y = +p[0], m = +p[1] - 1, d = +p[2];
  var t = new Date(y, m + n, 1); var ult = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(d, ult));
  return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
}
function _bcAddDias(iso, n) {
  var t = new Date(iso + 'T12:00:00'); t.setDate(t.getDate() + n);
  return t.getFullYear() + '-' + ('0' + (t.getMonth() + 1)).slice(-2) + '-' + ('0' + t.getDate()).slice(-2);
}
function _bcPlano() {
  var v = function (id) { return (document.getElementById(id) || {}).value || ''; };
  var n = Math.max(1, Math.min(36, parseInt(v('bcN'), 10) || 1));
  var total = parseFloat(v('bcTotal')) || 0;
  var venc1 = v('bcVenc1') || td();
  var inter = v('bcInter');
  var base = Math.floor(total / n * 100) / 100, plano = [];
  for (var i = 0; i < n; i++) {
    plano.push({
      i: i + 1,
      valor: i === n - 1 ? Math.round((total - base * (n - 1)) * 100) / 100 : base,
      venc: inter === 'mes' ? _bcAddMes(venc1, i) : _bcAddDias(venc1, i * (parseInt(inter, 10) || 30))
    });
  }
  return { n: n, total: total, plano: plano };
}
function _bcAtualizaPreview(origem) {
  var el = function (id) { return document.getElementById(id); };
  var n = Math.max(1, parseInt(el('bcN').value, 10) || 1);
  if (origem === 'parc') { var p = parseFloat(el('bcParc').value) || 0; el('bcTotal').value = p ? (Math.round(p * n * 100) / 100) : ''; }
  else { var t = parseFloat(el('bcTotal').value) || 0; if (origem !== 'parc') el('bcParc').value = t ? (Math.round(t / n * 100) / 100) : ''; }
  var P = _bcPlano();
  el('bcPrev').innerHTML = P.total ? P.plano.map(function (x) { return '<div style="display:flex;justify-content:space-between;font-size:.7rem;padding:3px 0;border-top:1px solid #0c0c10;"><span>' + x.i + '/' + P.n + ' · ' + fd(x.venc) + '</span><b style="color:var(--gold2);">R$ ' + fm(x.valor) + '</b></div>'; }).join('') : '<div style="font-size:.68rem;color:var(--t4);">Informe o valor para ver as parcelas.</div>';
}
function bcNovaCompra() {
  if (!document.getElementById('bcMd')) {
    var o = document.createElement('div'); o.className = 'ov'; o.id = 'bcMd';
    o.innerHTML = '<div class="modal"><div class="mtitle">🛒 Nova compra parcelada</div>' +
      '<div style="font-size:.72rem;color:var(--t3);margin-bottom:10px;">Cria todas as parcelas de uma vez, já ligadas à mesma compra.</div>' +
      '<div class="f"><label>Fornecedor</label><input id="bcCli" type="text" list="bcForn" placeholder="Nome do fornecedor"><datalist id="bcForn"></datalist></div>' +
      '<div class="f"><label>O que comprou (opcional)</label><input id="bcDesc" type="text" placeholder="Ex.: 12 chapas Itaúnas"></div>' +
      '<div class="f"><label>Titular / quem paga (opcional)</label><input id="bcTit" type="text" placeholder="Ex.: HR Mármores"></div>' +
      '<div class="r2"><div class="f"><label>Nº de parcelas</label><input id="bcN" type="number" min="1" max="36" value="4" oninput="_bcAtualizaPreview()"></div>' +
      '<div class="f"><label>1º vencimento</label><input id="bcVenc1" type="date" oninput="_bcAtualizaPreview()"></div></div>' +
      '<div class="r2"><div class="f"><label>Valor de cada parcela</label><input id="bcParc" type="number" step="0.01" inputmode="decimal" oninput="_bcAtualizaPreview(\'parc\')"></div>' +
      '<div class="f"><label>Valor total</label><input id="bcTotal" type="number" step="0.01" inputmode="decimal" oninput="_bcAtualizaPreview(\'total\')"></div></div>' +
      '<div class="r2"><div class="f"><label>Intervalo</label><select id="bcInter" class="cfginp" style="width:100%;text-align:left;" onchange="_bcAtualizaPreview()"><option value="mes">Todo mês (mesmo dia)</option><option value="30">A cada 30 dias</option><option value="15">A cada 15 dias</option><option value="7">A cada 7 dias</option></select></div>' +
      '<div class="f"><label>Forma</label><select id="bcFpag" class="cfginp" style="width:100%;text-align:left;"><option value="boleto">Boleto</option><option value="pix">PIX</option><option value="transferencia">Transferência</option></select></div></div>' +
      '<div style="background:var(--s2);border:1px solid var(--bd);border-radius:10px;padding:8px 12px;margin:8px 0;"><div style="font-size:.58rem;letter-spacing:1px;text-transform:uppercase;color:var(--t4);margin-bottom:4px;">Parcelas que serão criadas</div><div id="bcPrev"></div></div>' +
      '<button class="btn btn-g" onclick="bcNovaCompraSalvar()">Criar parcelas</button>' +
      '<button class="btn btn-o mt" data-close>Cancelar</button></div>';
    document.body.appendChild(o);
  }
  var forn = {}; (DB.b || []).forEach(function (x) { if (x.tipo === 'pagar' && x.cli) forn[x.cli] = 1; });
  document.getElementById('bcForn').innerHTML = Object.keys(forn).sort().map(function (n) { return '<option value="' + escH(n) + '">'; }).join('');
  ['bcCli', 'bcDesc', 'bcTit', 'bcParc', 'bcTotal'].forEach(function (id) { document.getElementById(id).value = ''; });
  document.getElementById('bcN').value = 4;
  document.getElementById('bcVenc1').value = _bcAddDias(td(), 30);
  showMd('bcMd');
  _bcAtualizaPreview();
}
function bcNovaCompraSalvar() {
  var v = function (id) { return ((document.getElementById(id) || {}).value || '').trim(); };
  var cli = v('bcCli');
  var P = _bcPlano();
  if (!cli) { toast('Informe o fornecedor'); return; }
  if (!P.total) { toast('Informe o valor da parcela ou o total'); return; }
  var id = _bcNovoId(), hoje = td(), base = Date.now();
  if (!DB.b) DB.b = [];
  for (var i = P.plano.length - 1; i >= 0; i--) {
    var x = P.plano[i];
    DB.b.unshift({
      id: base + i, tipo: 'pagar', cat: (typeof bGuessCategoria === 'function' ? bGuessCategoria(cli) : 'fornecedor') || 'fornecedor',
      cli: cli, titular: v('bcTit'), desc: v('bcDesc'), valor: x.valor, venc: x.venc,
      parc: x.i + '/' + P.n, fpag: v('bcFpag') || 'boleto',
      status: x.venc < hoje ? 'vencido' : 'pendente', obs: '', dtCriado: hoje,
      compraId: id, parcAtual: x.i, parcTotal: P.n
    });
  }
  DB.sv(); closeAll();
  if (typeof bAutoStatus === 'function') bAutoStatus();
  _bcAberta['c:' + id] = true; _bFiltroAtual = 'compras';
  toast('✅ Compra criada com ' + P.n + ' parcela(s)');
  _bRerender(); if (typeof bUpdDot === 'function') bUpdDot();
}

window._bListaCompras = _bListaCompras; window._bcToggle = _bcToggle; window._bcPagarId = _bcPagarId;
window._bcPagarProxima = _bcPagarProxima; window._bcRenomear = _bcRenomear; window._bcDesfazer = _bcDesfazer;
window.bcJuntarSelecionados = bcJuntarSelecionados; window.bcNovaCompra = bcNovaCompra;
window.bcNovaCompraSalvar = bcNovaCompraSalvar; window._bcAtualizaPreview = _bcAtualizaPreview;
