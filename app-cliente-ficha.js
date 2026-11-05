// ══════════════════════════════════════════════════════════════
// app-cliente-ficha.js — v1.0
// Área "Clientes": lista com busca + ficha completa de cada cliente.
//  • Nome, WhatsApp (abrir conversa / ligar), cidade, endereço, observações
//  • Todos os orçamentos do cliente: nº (ORC-0000), status, valor, atalhos
//    (abrir no Histórico, PDF, WhatsApp, editar)
//  • Serviços (etapa), A Receber (com multa/juros), pagamentos, visitas
//  • Pós-instalação (resposta do cliente, vinda do bot)
//  • Cadastra no banco de clientes (CLDB) quem só existe nos orçamentos
// Carregar DEPOIS de app-clientes.js e app-cliente-perfil.js.
// Tocar no nome de um cliente em qualquer tela abre esta ficha.
// ══════════════════════════════════════════════════════════════
(function () {
'use strict';

var PG = 40;
var ST = { q: '', filtro: 'todos', aberto: null, lista: [], bot: { em: 0, pos: [], carregando: false } };
var STUB = { stopPropagation: function () {}, preventDefault: function () {} };

// ── utilidades ──────────────────────────────────────────────
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function digits(s) { return String(s || '').replace(/\D/g, ''); }
function norm(s) { return typeof _cliNorm === 'function' ? _cliNorm(s) : String(s || '').toLowerCase().trim(); }
function money(v) { return 'R$ ' + (typeof fm === 'function' ? fm(v || 0) : (+v || 0).toFixed(2).replace('.', ',')); }
function dt(d) { return d ? (typeof fd === 'function' ? fd(d) : d) : ''; }
function fmtTel(s) {
  var d = digits(s);
  if (d.indexOf('55') === 0 && d.length >= 12) d = d.slice(2);
  if (d.length === 11) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 7) + '-' + d.slice(7);
  if (d.length === 10) return '(' + d.slice(0, 2) + ') ' + d.slice(2, 6) + '-' + d.slice(6);
  return s || '';
}
function waLink(tel) {
  var d = digits(tel);
  if (d.length < 10) return '';
  if (d.indexOf('55') !== 0) d = '55' + d;
  return 'https://wa.me/' + d;
}
function toastS(m) { if (typeof toast === 'function') toast(m); }
function cor(nome) { var h = 0, s = norm(nome); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360; return 'hsl(' + h + ',48%,62%)'; }

// ── status do orçamento (usa o mesmo mapa da tela de Histórico) ──
function secao(q) { try { return typeof _orcSecaoDe === 'function' ? _orcSecaoDe(q) : (q.status || 'pendente'); } catch (e) { return 'pendente'; } }
function stCfg(q) {
  var s = secao(q);
  var m = (typeof _ORC_ST !== 'undefined' && _ORC_ST[s]) || null;
  return m || { ic: '•', cor: '#aaa', bg: 'rgba(255,255,255,.06)', lbl: s };
}
var FECHADOS = { aceito: 1, entregue: 1, concluido: 1 };

// ── cálculo do que cada cliente tem ─────────────────────────
function calcRec(j) { try { return (window.HRRec && HRRec.calc) ? HRRec.calc(j) : null; } catch (e) { return null; } }

function enriquecer(c) {
  c.orcs.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')) || (+b.id || 0) - (+a.id || 0); });
  if (!c.tel) { for (var i = 0; i < c.orcs.length; i++) { if (c.orcs[i].tel) { c.tel = c.orcs[i].tel; break; } } }
  c.nOrc = c.orcs.length; c.nFechados = 0; c.nAbertos = 0; c.valAbertos = 0;
  c.orcs.forEach(function (q) {
    var s = secao(q);
    if (FECHADOS[s]) c.nFechados++;
    if (s === 'pendente') { c.nAbertos++; c.valAbertos += (+q.vista || 0); }
  });
  c.fat = 0; c.falta = 0; c.atrasado = false;
  c.jobs.forEach(function (j) {
    c.fat += (+j.value || 0);
    var rest = Math.max(0, (+j.value || 0) - (+j.pago || 0));
    c.falta += rest;
    if (rest > 0.009 && j.fiado) { var k = calcRec(j); if (k && k.atrasado) c.atrasado = true; }
  });
  var datas = [];
  c.orcs.forEach(function (q) { if (q.date) datas.push(q.date); });
  c.jobs.forEach(function (j) { if (j.start) datas.push(j.start); });
  datas.sort();
  c.ultima = datas.length ? datas[datas.length - 1] : '';
}

function indexar() {
  var cadastro = (typeof CLDB !== 'undefined') ? CLDB.get() : [];
  var clientes = [], porNorm = {};
  function novo(nome, cad) {
    var k = norm(nome);
    var x = { key: k, nome: nome, cad: cad || null, tel: (cad && cad.tel) || '', cidade: (cad && cad.cidade) || '', end: (cad && cad.end) || '', obs: (cad && cad.obs) || '', orcs: [], jobs: [] };
    clientes.push(x); porNorm[k] = x; return x;
  }
  cadastro.forEach(function (c) { if (c && c.nome && !porNorm[norm(c.nome)]) novo(c.nome, c); });
  function achar(nome) {
    var k = norm(nome);
    if (!k) return null;
    if (porNorm[k]) return porNorm[k];
    var melhor = null, ms = 0;
    if (typeof _cliSim === 'function') clientes.forEach(function (c) { var s = _cliSim(nome, c.nome); if (s > ms) { ms = s; melhor = c; } });
    if (melhor && ms >= 70) { porNorm[k] = melhor; return melhor; }
    return novo(nome, null);
  }
  (DB.q || []).forEach(function (q) {
    var c = achar(q.cli); if (!c) return;
    c.orcs.push(q);
    if (!c.cidade && q.cidade) c.cidade = q.cidade;
    if (!c.end && q.end) c.end = q.end;
  });
  (DB.j || []).forEach(function (j) { var c = achar(j.cli); if (c) c.jobs.push(j); });
  clientes.forEach(enriquecer);
  clientes.sort(function (a, b) { return String(b.ultima || '').localeCompare(String(a.ultima || '')) || a.nome.localeCompare(b.nome); });
  return clientes;
}

function casa(c, termo) {
  if (!termo) return true;
  var t = norm(termo), d = digits(termo);
  if (norm(c.nome).indexOf(t) >= 0) return true;
  if (c.cidade && norm(c.cidade).indexOf(t) >= 0) return true;
  if (d.length >= 4 && digits(c.tel).indexOf(d) >= 0) return true;
  var lt = String(termo).toLowerCase().trim();
  for (var i = 0; i < c.orcs.length; i++) { if (String(c.orcs[i].orcNum || '').toLowerCase().indexOf(lt) >= 0) return true; }
  return false;
}
function passaFiltro(c) {
  if (ST.filtro === 'aberto') return c.nAbertos > 0;
  if (ST.filtro === 'devendo') return c.falta > 0.009;
  if (ST.filtro === 'semtel') return !waLink(c.tel);
  return true;
}
function achaCliente(key) { for (var i = 0; i < ST.lista.length; i++) { if (ST.lista[i].key === key) return ST.lista[i]; } return null; }

// ── HTML: lista ─────────────────────────────────────────────
function htmlLinha(c) {
  var tags = '';
  if (c.nAbertos > 0) tags += '<span class="hc-tag hc-t-amb">⏳ ' + c.nAbertos + ' aguardando</span>';
  if (c.atrasado) tags += '<span class="hc-tag hc-t-red">Pagamento atrasado</span>';
  else if (c.falta > 0.009) tags += '<span class="hc-tag hc-t-red">Falta receber ' + money(c.falta) + '</span>';
  if (!c.cad) tags += '<span class="hc-tag hc-t-mut">Fora do cadastro</span>';
  var wa = waLink(c.tel);
  return '<div class="hc-row" data-hc-key="' + esc(c.key) + '">' +
    '<div class="hc-av" style="color:' + cor(c.nome) + ';border-color:' + cor(c.nome) + '">' + esc((c.nome || '?').charAt(0).toUpperCase()) + '</div>' +
    '<div class="hc-mid"><div class="hc-nm">' + esc(c.nome) + '</div>' +
    '<div class="hc-sub">' + (wa ? '📱 ' + esc(fmtTel(c.tel)) : '<span class="hc-sem">Sem WhatsApp</span>') + ' · ' + c.nOrc + (c.nOrc === 1 ? ' orçamento' : ' orçamentos') + '</div>' +
    (tags ? '<div class="hc-tags">' + tags + '</div>' : '') + '</div>' +
    '<div class="hc-chev">›</div></div>';
}
function htmlResultados() {
  var vis = ST.lista.filter(function (c) { return casa(c, ST.q) && passaFiltro(c); });
  if (!vis.length) return '<div class="hc-vazio">' + (ST.q || ST.filtro !== 'todos' ? 'Nenhum cliente encontrado com esse filtro.' : 'Nenhum cliente ainda. Toque em + Novo para cadastrar.') + '</div>';
  return vis.slice(0, 200).map(htmlLinha).join('') + (vis.length > 200 ? '<div class="hc-vazio">Mostrando 200 de ' + vis.length + '. Use a busca para achar os outros.</div>' : '');
}
function htmlLista() {
  var fora = ST.lista.filter(function (c) { return !c.cad; }).length;
  var F = [['todos', 'Todos'], ['aberto', 'Orçamento aguardando'], ['devendo', 'Devendo'], ['semtel', 'Sem WhatsApp']];
  var chips = F.map(function (f) { return '<button class="hc-chip' + (ST.filtro === f[0] ? ' on' : '') + '" data-hc-filtro="' + f[0] + '">' + f[1] + '</button>'; }).join('');
  return '<div class="hc-wrap">' +
    '<div class="hc-top"><div><div class="hc-h1">Clientes</div><div class="hc-h1s" id="hcCont">' + ST.lista.length + ' no total</div></div>' +
    '<button class="hc-btn gold" data-hc-act="novo">+ Novo</button></div>' +
    '<input class="hc-busca" id="hcBusca" type="search" placeholder="Buscar por nome, WhatsApp, cidade ou ORC-0000" value="' + esc(ST.q) + '" autocomplete="off">' +
    '<div class="hc-chips">' + chips + '</div>' +
    (fora > 0 ? '<div class="hc-aviso"><div>' + fora + (fora === 1 ? ' cliente aparece nos orçamentos mas não está no cadastro.' : ' clientes aparecem nos orçamentos mas não estão no cadastro.') + '</div><button class="hc-btn" data-hc-act="sync">Cadastrar todos</button></div>' : '') +
    '<div id="hcLista">' + htmlResultados() + '</div></div>';
}

// ── HTML: ficha ─────────────────────────────────────────────
function bloco(titulo, corpo, n) {
  return '<div class="hc-sec"><div class="hc-sec-t">' + titulo + (n != null ? ' <span class="hc-n">' + n + '</span>' : '') + '</div>' + corpo + '</div>';
}
function linhaInfo(k, v) { return v ? '<div class="hc-info"><span>' + k + '</span><span>' + v + '</span></div>' : ''; }

function htmlOrc(q) {
  var s = stCfg(q);
  var num = q.orcNum ? esc(q.orcNum) : '<span class="hc-sem">Sem número</span>';
  var det = [q.tipo, q.mat, 'orçado em ' + dt(q.date)].filter(function (x) { return x && x !== 'orçado em '; }).map(esc).join(' · ');
  var sec = secao(q);
  var fechou = q._aceitoData || (sec === 'aceito' ? q._statusDate : '');
  var entregou = q._entregueEm || (sec === 'entregue' ? q._statusDate : '');
  var datas = (fechou ? '<span>Fechou em <b>' + dt(fechou) + '</b></span>' : '') + (entregou ? '<span>Entregue em <b>' + dt(entregou) + '</b></span>' : '') + (q._concluidoData ? '<span>Pago por inteiro em <b>' + dt(q._concluidoData) + '</b></span>' : '');
  return '<div class="hc-orc" data-orc="' + esc(q.id) + '">' +
    '<div class="hc-orc-top"><span class="hc-orc-num">' + num + '</span>' +
    '<span class="hc-st" style="color:' + s.cor + ';background:' + s.bg + ';border-color:' + s.cor + '55">' + s.ic + ' ' + esc(s.lbl) + '</span></div>' +
    '<div class="hc-orc-det">' + det + '</div>' +
    (datas ? '<div class="hc-orc-dt">' + datas + '</div>' : '') +
    '<div class="hc-orc-val">' + money(q.vista) + '</div>' +
    '<div class="hc-orc-btns">' +
    '<button class="hc-btn gold" data-hc-orc="abrir">Abrir</button>' +
    '<button class="hc-btn" data-hc-orc="pdf">PDF</button>' +
    '<button class="hc-btn wa" data-hc-orc="wa">WhatsApp</button>' +
    '<button class="hc-btn" data-hc-orc="edit">Editar</button></div></div>';
}
function htmlJob(j) {
  var etapa = (typeof JOB_STAGE_LABEL !== 'undefined' && JOB_STAGE_LABEL[j.stage]) || (j.done ? 'Concluído' : 'Em andamento');
  var rest = Math.max(0, (+j.value || 0) - (+j.pago || 0));
  var rec = (rest > 0.009 && j.fiado) ? calcRec(j) : null;
  var pg = rest > 0.009
    ? '<span class="hc-red">Falta ' + money(rest) + '</span>' + (rec && rec.atrasado ? ' · <span class="hc-red">' + rec.dias + ' dias de atraso, total ' + money(rec.total) + '</span>' : (j.fiado && j.fiado.venc ? ' · vence ' + dt(j.fiado.venc) : ''))
    : '<span class="hc-grn">Pago</span>';
  return '<div class="hc-lin"><div class="hc-lin-a"><b>' + esc(j.desc || 'Serviço') + '</b><span>' + etapa + (j.instala ? ' · com instalação' : '') + (j.end ? ' · previsto para ' + dt(j.end) : '') + '</span><span>' + pg + '</span></div>' +
    '<div class="hc-lin-v">' + money(j.value) + '</div></div>';
}
function pagamentosDe(c) {
  var n = norm(c.nome); if (n.length < 3) return [];
  return (DB.t || []).filter(function (t) { return t.type === 'in' && t.desc && norm(t.desc).indexOf(n) !== -1; })
    .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
}
function visitasDe(c) {
  var v = []; try { v = JSON.parse(localStorage.getItem('hr_v') || '[]'); } catch (e) {}
  return v.filter(function (x) { return typeof _cliSim === 'function' ? _cliSim(c.nome, x.cli) >= 70 : norm(x.cli) === c.key; })
    .sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
}
var POS_ROT = { positivo: ['😊 Gostou', 'hc-grn'], negativo: ['⚠️ Não gostou', 'hc-red'], enviado: ['Aguardando resposta', ''], agendado: ['Pesquisa agendada', ''], sem_resposta: ['Sem resposta', ''], sem_telefone: ['Sem WhatsApp para enviar', ''], sem_envio: ['Não enviada (fora das 24 h)', ''] };
function posDe(c) {
  return (ST.bot.pos || []).filter(function (r) { return typeof _cliSim === 'function' ? _cliSim(c.nome, r.cliente) >= 70 : norm(r.cliente) === c.key; });
}

function htmlFicha(c) {
  var wa = waLink(c.tel);
  var h = '<div class="hc-wrap"><button class="hc-voltar" data-hc-act="voltar">‹ Clientes</button>';
  h += '<div class="hc-cab"><div class="hc-av g" style="color:' + cor(c.nome) + ';border-color:' + cor(c.nome) + '">' + esc((c.nome || '?').charAt(0).toUpperCase()) + '</div>' +
    '<div class="hc-mid"><div class="hc-h1">' + esc(c.nome) + '</div>' +
    '<div class="hc-sub">' + (wa ? '📱 ' + esc(fmtTel(c.tel)) : '<span class="hc-sem">Sem WhatsApp cadastrado</span>') + (c.cidade ? ' · ' + esc(c.cidade) : '') + '</div></div></div>';

  // contato
  h += '<div class="hc-acoes">' +
    (wa ? '<a class="hc-btn wa big" href="' + esc(wa) + '" target="_blank" rel="noopener">Abrir WhatsApp</a><a class="hc-btn big" href="tel:+55' + esc(digits(c.tel).replace(/^55/, '')) + '">Ligar</a>' : '') +
    (c.cad ? '<button class="hc-btn big" data-hc-act="editar">Editar cadastro</button>' : '<button class="hc-btn gold big" data-hc-act="cadastrar">Cadastrar cliente</button>') + '</div>';
  if (!wa) h += '<div class="hc-tel"><input id="hcTel" type="tel" inputmode="tel" placeholder="WhatsApp com DDD, ex.: 74 99999-0000"><button class="hc-btn gold" data-hc-act="salvartel">Salvar</button></div>';

  // resumo
  h += '<div class="hc-tiles">' +
    '<div class="hc-tile"><b>' + c.nOrc + '</b><span>Orçamentos</span></div>' +
    '<div class="hc-tile"><b>' + c.nFechados + '</b><span>Fechados</span></div>' +
    '<div class="hc-tile"><b>' + (c.fat > 0 ? money(c.fat) : '—') + '</b><span>Em serviços</span></div>' +
    '<div class="hc-tile"><b class="' + (c.falta > 0.009 ? 'hc-red' : 'hc-grn') + '">' + (c.falta > 0.009 ? money(c.falta) : 'Em dia') + '</b><span>Falta receber</span></div></div>';

  // orçamentos
  h += bloco('Orçamentos', c.orcs.length ? c.orcs.map(htmlOrc).join('') : '<div class="hc-vazio">Nenhum orçamento ainda.</div>', c.orcs.length);

  // serviços
  if (c.jobs.length) {
    var temRec = c.jobs.some(function (j) { return (+j.value || 0) - (+j.pago || 0) > 0.009 && j.fiado; });
    h += bloco('Serviços', c.jobs.slice().sort(function (a, b) { return String(b.start || '').localeCompare(String(a.start || '')); }).map(htmlJob).join('') +
      (temRec ? '<button class="hc-btn" style="margin-top:8px" data-hc-act="areceber">Abrir A Receber</button>' : ''), c.jobs.length);
  }

  // pós-instalação
  var pos = posDe(c);
  if (pos.length) {
    h += bloco('Pós-instalação', pos.map(function (r) {
      var rot = POS_ROT[r.status] || [r.status, ''];
      var txt = r.relato || r.resposta || '';
      return '<div class="hc-lin"><div class="hc-lin-a"><b>' + esc(r.servico || 'Instalação') + '</b><span class="' + rot[1] + '">' + rot[0] + '</span>' +
        (txt ? '<span>“' + esc(String(txt).slice(0, 220)) + '”</span>' : '') + '</div><div class="hc-lin-v">' + dt(r.instaladoEm) + '</div></div>';
    }).join(''), pos.length);
  }

  // pagamentos
  var pags = pagamentosDe(c);
  if (pags.length) h += bloco('Pagamentos recebidos', pags.slice(0, 8).map(function (t) { return '<div class="hc-lin"><div class="hc-lin-a"><b>' + esc(t.desc) + '</b><span>' + dt(t.date) + '</span></div><div class="hc-lin-v hc-grn">' + money(t.value) + '</div></div>'; }).join(''), pags.length);

  // visitas
  var vis = visitasDe(c);
  if (vis.length) h += bloco('Visitas de medição', vis.slice(0, 6).map(function (v) { return '<div class="hc-lin"><div class="hc-lin-a"><b>' + dt(v.date) + (v.hora ? ' às ' + esc(v.hora) : '') + '</b><span>' + esc(v.status || 'agendada') + (v.end ? ' · ' + esc(v.end) : '') + '</span></div></div>'; }).join(''), vis.length);

  // cadastro + obs
  var cad = linhaInfo('Cidade', esc(c.cidade)) + linhaInfo('Endereço', esc(c.end)) + (c.cad && c.cad.email ? linhaInfo('E-mail', esc(c.cad.email)) : '') + linhaInfo('Última atividade', dt(c.ultima));
  h += bloco('Dados e observações', (cad || '') +
    '<textarea class="hc-obs" id="hcObs" rows="3" placeholder="Preferências de pedra, como prefere ser atendido, referências do endereço...">' + esc(c.obs) + '</textarea>' +
    '<button class="hc-btn" data-hc-act="salvarobs">Salvar observações</button>');

  return h + '</div>';
}

// ── cadastro (CLDB) ─────────────────────────────────────────
function upsert(c, campos) {
  if (typeof CLDB === 'undefined') return false;
  if (c.cad) { CLDB.upd(c.cad.id, campos); return true; }
  CLDB.add(Object.assign({ nome: c.nome, tel: c.tel || '', cidade: c.cidade || '', end: c.end || '', obs: c.obs || '' }, campos));
  return true;
}
function cadastrarTodos() {
  if (typeof CLDB === 'undefined') return 0;
  var lista = CLDB.get(), n = 0, base = Date.now();
  ST.lista.forEach(function (c) {
    if (c.cad) {
      var reg = lista.filter(function (x) { return x.id === c.cad.id; })[0];
      if (reg && !reg.tel && c.tel) { reg.tel = c.tel; n++; }
      return;
    }
    lista.unshift({ id: base + n, em: (typeof td === 'function' ? td() : ''), nome: c.nome, tel: c.tel || '', cidade: c.cidade || '', end: c.end || '', obs: '' });
    n++;
  });
  if (n) CLDB.sv(lista); // grava a lista inteira de uma vez (ids únicos)
  return n;
}

// ── navegação ───────────────────────────────────────────────
function pagina() { return document.getElementById('pg' + PG); }
function renderLista() {
  ST.aberto = null; ST.lista = indexar();
  var p = pagina(); if (!p) return;
  p.innerHTML = htmlLista();
  var b = document.getElementById('hcBusca');
  if (b) b.addEventListener('input', function () {
    ST.q = b.value;
    var r = document.getElementById('hcLista'); if (r) r.innerHTML = htmlResultados();
  });
}
function renderFicha(key) {
  var c = achaCliente(key); if (!c) { renderLista(); return; }
  ST.aberto = key;
  var p = pagina(); if (!p) return;
  p.innerHTML = htmlFicha(c); p.scrollTop = 0;
  carregarBot();
}
function recarregar() { var k = ST.aberto; ST.lista = indexar(); if (k && achaCliente(k)) { var y = pagina().scrollTop; renderFicha(k); pagina().scrollTop = y; } else renderLista(); }

function abrirCliente(nome) {
  if (!nome) return;
  if (typeof go === 'function') go(PG);
  ST.lista = indexar();
  var k = norm(nome), c = achaCliente(k);
  if (!c && typeof _cliSim === 'function') { var ms = 0; ST.lista.forEach(function (x) { var s = _cliSim(nome, x.nome); if (s > ms && s >= 70) { ms = s; c = x; } }); }
  if (c) renderFicha(c.key); else { ST.q = nome; renderLista(); }
}

// ── pós-instalação (bot) ────────────────────────────────────
function carregarBot() {
  var cfg; try { cfg = _getBotCfg(); } catch (e) { cfg = null; }
  if (!cfg || !cfg.url || !cfg.key || ST.bot.carregando || Date.now() - ST.bot.em < 60000) return;
  ST.bot.carregando = true;
  fetch(String(cfg.url).replace(/\/+$/, '') + '/bot/pos-instalacao', { headers: _botHeaders() })
    .then(function (r) { return r.json(); })
    .then(function (j) {
      ST.bot.carregando = false; ST.bot.em = Date.now();
      if (j && Array.isArray(j.registros)) {
        ST.bot.pos = j.registros;
        var c = ST.aberto ? achaCliente(ST.aberto) : null;
        if (c && posDe(c).length) { var y = pagina().scrollTop; pagina().innerHTML = htmlFicha(c); pagina().scrollTop = y; }
      }
    }).catch(function () { ST.bot.carregando = false; ST.bot.em = Date.now(); });
}

// ── atalho do orçamento: abre no Histórico, já expandido ────
function abrirOrc(id) {
  var q = (DB.q || []).filter(function (x) { return String(x.id) === String(id); })[0];
  if (!q) return;
  go(7);
  setTimeout(function () {
    try {
      var inp = document.getElementById('orcSearch'); if (inp) inp.value = q.cli || '';
      if (typeof _orcStatusFilter !== 'undefined') _orcStatusFilter = 'todos';
      if (typeof filterOrc === 'function') filterOrc();
      setTimeout(function () {
        var el = document.getElementById('qc-' + q.id) || document.querySelector('#orcList .qcard');
        if (el) { el.classList.add('open'); el.scrollIntoView({ block: 'start', behavior: 'smooth' }); }
      }, 80);
    } catch (e) { console.warn('[clientes] abrir orçamento:', e); }
  }, 60);
}
function acaoOrc(act, id) {
  try {
    if (act === 'abrir') abrirOrc(id);
    else if (act === 'pdf') orcPDF(id, STUB);
    else if (act === 'wa') orcWhatsApp(id, STUB);
    else if (act === 'edit') orcEditar(id, STUB);
  } catch (e) { console.warn('[clientes] ação do orçamento:', e); toastS('Não consegui abrir. Tente pelo Histórico.'); }
}

// ── cliques ─────────────────────────────────────────────────
function aoClicar(e) {
  var t = e.target;
  var b;
  if ((b = t.closest('[data-hc-orc]'))) { var o = b.closest('[data-orc]'); if (o) acaoOrc(b.getAttribute('data-hc-orc'), o.getAttribute('data-orc')); return; }
  if ((b = t.closest('[data-hc-filtro]'))) { ST.filtro = b.getAttribute('data-hc-filtro'); renderLista(); return; }
  if ((b = t.closest('[data-hc-act]'))) {
    var a = b.getAttribute('data-hc-act'), c = ST.aberto ? achaCliente(ST.aberto) : null;
    if (a === 'voltar') renderLista();
    else if (a === 'novo') { if (typeof cliAbrirNovo === 'function') cliAbrirNovo(); }
    else if (a === 'sync') {
      var n = cadastrarTodos();
      toastS(n ? '✓ ' + n + (n === 1 ? ' cliente cadastrado' : ' clientes cadastrados') : 'Tudo já está no cadastro');
      recarregar();
    }
    else if (a === 'editar' && c && c.cad && typeof cliAbrirEditar === 'function') cliAbrirEditar(c.cad.id);
    else if (a === 'cadastrar' && c) { upsert(c, {}); toastS('✓ Cliente cadastrado'); recarregar(); }
    else if (a === 'salvartel' && c) {
      var v = (document.getElementById('hcTel') || {}).value || '';
      if (digits(v).length < 10) { toastS('Digite o WhatsApp com DDD'); return; }
      upsert(c, { tel: v.trim() }); toastS('✓ WhatsApp salvo'); recarregar();
    }
    else if (a === 'salvarobs' && c) { upsert(c, { obs: ((document.getElementById('hcObs') || {}).value || '').trim() }); toastS('✓ Observações salvas'); ST.lista = indexar(); }
    else if (a === 'areceber' && typeof window.abrirAReceber === 'function') window.abrirAReceber();
    return;
  }
  if ((b = t.closest('[data-hc-key]'))) renderFicha(b.getAttribute('data-hc-key'));
}

// ── CSS ─────────────────────────────────────────────────────
function css() {
  if (document.getElementById('hcCss')) return;
  var s = document.createElement('style'); s.id = 'hcCss';
  s.textContent =
    '#pg' + PG + '{background:var(--bg);color:var(--tx);font-family:Outfit,sans-serif}' +
    '#pg' + PG + ' .hc-wrap{padding:14px 14px 90px;max-width:720px;margin:0 auto}' +
    '#pg' + PG + ' .hc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}' +
    '#pg' + PG + ' .hc-h1{font-size:1.15rem;font-weight:700;color:var(--gold2)}' +
    '#pg' + PG + ' .hc-h1s{font-size:.7rem;color:var(--t3)}' +
    '#pg' + PG + ' .hc-busca{width:100%;box-sizing:border-box;padding:11px 13px;background:var(--s2);border:1px solid var(--bd2);border-radius:11px;color:var(--tx);font-family:Outfit;font-size:.86rem;outline:none}' +
    '#pg' + PG + ' .hc-busca:focus{border-color:var(--gold)}' +
    '#pg' + PG + ' .hc-chips{display:flex;gap:6px;overflow-x:auto;padding:10px 0 4px;-webkit-overflow-scrolling:touch}' +
    '#pg' + PG + ' .hc-chip{flex-shrink:0;padding:7px 12px;border-radius:20px;border:1px solid var(--bd2);background:var(--s2);color:var(--t2);font-family:Outfit;font-size:.72rem;font-weight:600;cursor:pointer}' +
    '#pg' + PG + ' .hc-chip.on{background:var(--gdim);border-color:var(--gold);color:var(--gold2)}' +
    '#pg' + PG + ' .hc-aviso{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:8px 0;padding:10px 12px;border:1px solid rgba(245,158,11,.35);background:rgba(245,158,11,.07);border-radius:11px;font-size:.74rem;color:var(--t2)}' +
    '#pg' + PG + ' .hc-row{display:flex;align-items:center;gap:11px;padding:11px 4px;border-bottom:1px solid var(--bd);cursor:pointer;min-height:56px}' +
    '#pg' + PG + ' .hc-row:active{background:var(--s2)}' +
    '#pg' + PG + ' .hc-av{width:40px;height:40px;border-radius:50%;border:1.5px solid;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:1rem;flex-shrink:0;background:var(--s2)}' +
    '#pg' + PG + ' .hc-av.g{width:52px;height:52px;font-size:1.25rem}' +
    '#pg' + PG + ' .hc-mid{flex:1;min-width:0}' +
    '#pg' + PG + ' .hc-nm{font-weight:600;font-size:.9rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
    '#pg' + PG + ' .hc-sub{font-size:.72rem;color:var(--t3);margin-top:2px}' +
    '#pg' + PG + ' .hc-sem{color:#f59e0b}' +
    '#pg' + PG + ' .hc-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}' +
    '#pg' + PG + ' .hc-tag{font-size:.62rem;font-weight:700;padding:2px 8px;border-radius:10px}' +
    '#pg' + PG + ' .hc-t-amb{color:#f59e0b;background:rgba(245,158,11,.12)}' +
    '#pg' + PG + ' .hc-t-red{color:#f87171;background:rgba(248,113,113,.12)}' +
    '#pg' + PG + ' .hc-t-mut{color:var(--t3);background:var(--s3)}' +
    '#pg' + PG + ' .hc-chev{color:var(--t3);font-size:1.3rem}' +
    '#pg' + PG + ' .hc-vazio{padding:26px 10px;text-align:center;color:var(--t3);font-size:.78rem}' +
    '#pg' + PG + ' .hc-btn{display:inline-flex;align-items:center;justify-content:center;padding:9px 13px;min-height:38px;border-radius:10px;border:1px solid var(--bd2);background:var(--s3);color:var(--tx);font-family:Outfit;font-size:.74rem;font-weight:700;cursor:pointer;text-decoration:none;box-sizing:border-box}' +
    '#pg' + PG + ' .hc-btn.gold{background:var(--gold2);border-color:var(--gold2);color:#000}' +
    '#pg' + PG + ' .hc-btn.wa{background:#075e54;border-color:#128c7e;color:#fff}' +
    '#pg' + PG + ' .hc-btn.big{flex:1;min-height:44px}' +
    '#pg' + PG + ' .hc-voltar{background:none;border:none;color:var(--gold2);font-family:Outfit;font-size:.85rem;font-weight:600;padding:4px 0 10px;cursor:pointer}' +
    '#pg' + PG + ' .hc-cab{display:flex;align-items:center;gap:13px;margin-bottom:12px}' +
    '#pg' + PG + ' .hc-acoes{display:flex;gap:8px;margin-bottom:10px}' +
    '#pg' + PG + ' .hc-tel{display:flex;gap:8px;margin-bottom:10px}' +
    '#pg' + PG + ' .hc-tel input{flex:1;min-width:0;padding:10px 12px;background:var(--s2);border:1px solid var(--bd2);border-radius:10px;color:var(--tx);font-family:Outfit;font-size:.84rem}' +
    '#pg' + PG + ' .hc-tiles{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin:12px 0}' +
    '#pg' + PG + ' .hc-tile{background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:11px 12px}' +
    '#pg' + PG + ' .hc-tile b{display:block;font-size:1.02rem}' +
    '#pg' + PG + ' .hc-tile span{font-size:.66rem;color:var(--t3)}' +
    '#pg' + PG + ' .hc-sec{margin-top:18px}' +
    '#pg' + PG + ' .hc-sec-t{font-size:.82rem;font-weight:700;color:var(--gold2);margin-bottom:8px}' +
    '#pg' + PG + ' .hc-n{color:var(--t3);font-weight:600;margin-left:4px}' +
    '#pg' + PG + ' .hc-orc{background:var(--s2);border:1px solid var(--bd);border-radius:12px;padding:11px 12px;margin-bottom:8px}' +
    '#pg' + PG + ' .hc-orc-top{display:flex;align-items:center;justify-content:space-between;gap:8px}' +
    '#pg' + PG + ' .hc-orc-num{font-weight:700;font-size:.92rem}' +
    '#pg' + PG + ' .hc-st{font-size:.64rem;font-weight:800;padding:3px 9px;border-radius:20px;border:1px solid;white-space:nowrap}' +
    '#pg' + PG + ' .hc-orc-det{font-size:.72rem;color:var(--t3);margin-top:4px}' +
    '#pg' + PG + ' .hc-orc-dt{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:.72rem;color:var(--t2);margin-top:5px}#pg' + PG + ' .hc-orc-dt b{color:var(--gold2)}' +
    '#pg' + PG + ' .hc-orc-val{font-size:1rem;font-weight:700;margin:6px 0 9px}' +
    '#pg' + PG + ' .hc-orc-btns{display:flex;flex-wrap:wrap;gap:6px}' +
    '#pg' + PG + ' .hc-orc-btns .hc-btn{flex:1;min-width:70px}' +
    '#pg' + PG + ' .hc-lin{display:flex;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--bd)}' +
    '#pg' + PG + ' .hc-lin-a{display:flex;flex-direction:column;gap:2px;min-width:0;font-size:.74rem;color:var(--t3)}' +
    '#pg' + PG + ' .hc-lin-a b{color:var(--tx);font-size:.8rem}' +
    '#pg' + PG + ' .hc-lin-v{font-weight:700;font-size:.8rem;white-space:nowrap}' +
    '#pg' + PG + ' .hc-info{display:flex;justify-content:space-between;gap:12px;padding:7px 0;font-size:.76rem;border-bottom:1px solid var(--bd)}' +
    '#pg' + PG + ' .hc-info span:first-child{color:var(--t3)}' +
    '#pg' + PG + ' .hc-info span:last-child{text-align:right}' +
    '#pg' + PG + ' .hc-obs{width:100%;box-sizing:border-box;margin:10px 0 8px;padding:10px 12px;background:var(--s2);border:1px solid var(--bd2);border-radius:10px;color:var(--tx);font-family:Outfit;font-size:.8rem;resize:vertical}' +
    '#pg' + PG + ' .hc-red{color:#f87171}#pg' + PG + ' .hc-grn{color:#4ade80}';
  document.head.appendChild(s);
}

// ── montagem no app ─────────────────────────────────────────
function montar() {
  if (document.getElementById('pg' + PG)) return;
  var ref = document.getElementById('pg30') || document.getElementById('pg20') || document.getElementById('pg13');
  if (!ref || !ref.parentNode) return;
  css();
  var pg = document.createElement('div'); pg.className = 'pg'; pg.id = 'pg' + PG;
  ref.parentNode.insertBefore(pg, ref.nextSibling);
  pg.addEventListener('click', aoClicar);
  // item no menu, logo depois de "Orçamento"
  var nav = document.getElementById('nav');
  if (nav && !nav.querySelector('[data-pg="' + PG + '"]')) {
    var ni = document.createElement('div'); ni.className = 'ni'; ni.setAttribute('data-pg', PG);
    ni.innerHTML = '<span class="ni-i">👥</span><span class="ni-l">Clientes</span>';
    var orc = nav.querySelector('[data-pg="0"]');
    if (orc && orc.parentNode === nav) nav.insertBefore(ni, orc.nextSibling); else nav.appendChild(ni);
  }
  // ao entrar na página 40, desenha a lista
  if (typeof window.go === 'function' && !window._hcGoPatch) {
    window._hcGoPatch = true;
    var go0 = window.go;
    window.go = function (n) { var r = go0.apply(this, arguments); if (+n === PG) renderLista(); return r; };
  }
  // tocar no nome do cliente em qualquer tela abre esta ficha
  if (window.CP && !window._hcCpPatch) {
    window._hcCpPatch = true;
    var abrir0 = window.CP.abrir;
    window.CP.abrir = function (nome) { try { abrirCliente(nome); } catch (e) { console.warn('[clientes] ficha:', e); if (abrir0) abrir0.call(window.CP, nome); } };
  }
}

window.HRCli = { abrir: abrirCliente, lista: function () { go(PG); }, render: recarregar,
  _t: { indexar: indexar, htmlLista: htmlLista, htmlFicha: htmlFicha, htmlResultados: htmlResultados, fmtTel: fmtTel, waLink: waLink, casa: casa, cadastrarTodos: cadastrarTodos, st: ST } };

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
